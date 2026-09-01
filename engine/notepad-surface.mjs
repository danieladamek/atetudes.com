/* notepad-surface.mjs — the notepad's shared SURFACE (component v1).
 *
 * engine/notepad.mjs shares the model; this module shares the BEHAVIOUR —
 * save semantics, clear semantics, import/export/clipboard, autosave
 * debouncing, the storage-denied path, and saved-row rendering. It exists
 * because every behavioural fix was landing twice, and the second host was
 * always late (Metronome shipped decision 8 but not save-clears).
 *
 * TRIADETUDES' CORRECTED BEHAVIOUR IS CANONICAL (v0.8.1): every correction
 * came from real use there. Hosts consume this behaviour; none re-implements
 * it, and none gets a choice about:
 *   - Save files the note, CLEARS the pad, no prompt, no toast — the emptied
 *     pad is the confirmation. An empty pad still saves (config capture).
 *   - Clear confirms; "Save and clear" is the PRIMARY action, Discard second.
 *   - The pad is PERSISTENT UNCOMMITTED SCRATCH: autosaved on a debounce, it
 *     survives a reload and clears on save.
 *   - Storage-denied keeps working in memory AND SAYS SO, steering to Export.
 *   - Saved rows render their note markdown via renderTo (reading surface);
 *     labels DERIVE via adapter.summarize (never stored); a foreign app's
 *     payload is named, inert and carried untouched.
 *
 * THE SURFACE DECLARES THE CAPABILITY SET; THE HOST CHOOSES PLACEMENT,
 * NEVER EXISTENCE. "Share behaviour, not layout" collapsed two axes and let
 * Triadetudes silently lose Copy: a capability is WHAT exists (declared
 * here, identical in every host); layout is WHERE it sits (the host's). A
 * host mounts a declared capability explicitly (els.<cap>Btn), or provides
 * els.controls and the control is auto-appended — and a host that provides
 * neither FAILS LOUDLY by capability name. Never silent omission. Labels
 * come from the adapter's declared nouns ({item, apply}) — no save or apply
 * verb is hand-written in any page. The paragraph-level handoff guarantee
 * ("Your notes stay on this computer — nothing is uploaded. Export
 * writes a file; that file is the only way notes move.", web
 * contract sections 5/6) is emitted by the surface in every host: it is a
 * charter guarantee, not helper prose.
 *
 * The host still provides the elements (its page, its grammar, its
 * placement); this module wires them and builds row nodes inside the list. No document/window globals — everything reaches
 * the DOM through the provided elements' ownerDocument, so the whole surface
 * runs headless against a stub (the both-hosts save-clears test lives there).
 *
 * createNotepadSurface({
 *   adapter:  {app, version, snapshot(), apply(data), summarize(data)}
 *   storage:  {load():string|null, save(string):void}   // thin; MAY THROW —
 *             denial is handled (and messaged) here, not in the host
 *   migrate:  () => doc|null      // host's v1 shape → model, once, no v2 yet
 *   els: {
 *     pad, saveBtn, clearBtn, confirmRoot, confirmSave, confirmDiscard,
 *     confirmCancel, exportBtn?, copyBtn?, importBtn?, importFile?,
 *     msg, importMsg?, list, count?, storeNote?
 *   }
 *   file:     {title, name():string}                    // export identity
 *   adapter.nouns: {item: "entry"|"note"|…, apply: "Restore étude"|…} —
 *             the host's vocabulary; the surface composes every label
 *   importFallback?: (text) => entries[]|null           // legacy log formats
 *   jsonImport?: (parsedJson) => boolean                // bare-config files
 *   onChange?: ()=>{}   onApplied?: ()=>{}              // host hooks (fold
 *             lines, scroll) — presentation, never behaviour
 * }) → { getDoc, setDoc, save, clearConfirmShow, exportText, importText,
 *        renderRows, storageOK }
 */

import { emptyDoc, makeEntry, addEntry, deleteEntry, toAtchart, fromAtchart } from "./notepad.mjs";
import { parseMarkdown, renderTo } from "./markdown.mjs";
import { createPalette } from "./palette.mjs";

/** The declared capability set — identical in every host, by construction.
 * "palette" (child 3): the music palette is a capability of the SURFACE, so
 * both hosts carry it and the conformance suite asserts it like any other. */
export const CAPABILITIES = ["save", "clear", "export", "import", "copy", "palette"];

export function createNotepadSurface(opts) {
  const { adapter, storage, els, file } = opts;
  const migrate = opts.migrate || (() => null);
  const onChange = opts.onChange || (() => {});
  const onApplied = opts.onApplied || (() => {});
  const nouns = (adapter && adapter.nouns) || {};
  const itemNoun = nouns.item || "note";
  const applyLabel = nouns.apply || "Apply settings";
  const LABELS = { save: "Save " + itemNoun, clear: "Clear",
    export: "Export (.atchart.md)", import: "Import", copy: "Copy",
    palette: "Palette" };
  let doc = emptyDoc();
  let storageOK = true;
  let padTimer = null;

  // ---- storage (denial handled HERE, and said out loud) ----
  function loadDoc() {
    try {
      const raw = storage.load();
      if (raw) {
        const d = JSON.parse(raw);
        return { pad: String(d.pad ?? ""), title: String(d.title ?? ""),
                 entries: (d.entries || []).map(makeEntry) };
      }
      const migrated = migrate();
      if (migrated) { trySave(migrated); return migrated; }
      return emptyDoc();
    } catch (e) { storageOK = false; return emptyDoc(); }
  }
  function trySave(d) {
    if (!storageOK) return false;
    try { storage.save(JSON.stringify({ pad: d.pad, title: d.title ?? "", entries: d.entries })); return true; }
    catch (e) { storageOK = false; return false; }
  }
  function persist() { return trySave(doc); }

  /* THE MESSAGE PRINTS WHERE THE PRESS HAPPENED (260911, item 2b): each
   * capability may have its own slot — els.<cap>Msg — and a host that
   * declares only the shared els.msg keeps exactly the old behaviour (the
   * same fallback shape as import's own slot, generalised). The slot is
   * addressed per call site, so a refusal lands beside the button that
   * refused, not six inches away beside Save. */
  function msgSet(cap, t, sticky) {
    const slot = els[cap + "Msg"] || els.msg;
    if (!slot) return;
    slot.textContent = t;
    if (t && !sticky) setTimeout(() => {
      if (slot.textContent === t) slot.textContent = "";
    }, 2200);
  }

  // ---- save: file the note, CLEAR the pad, no prompt, no toast ----
  function save() {
    clearConfirmShow(false);
    const text = String(els.pad.value ?? "").trim();
    doc = addEntry(doc, { savedAt: new Date().toISOString(), text,
      payload: { app: adapter.app, v: adapter.version, data: adapter.snapshot() } });
    doc = { ...doc, pad: "" };
    els.pad.value = "";
    const ok = persist();
    if (!ok) msgSet("save", "saved in this tab only — use Export to keep it", true);
    else if (!text) msgSet("save", "captured without a note"); // something must confirm
    renderRows(); onChange();
  }

  // ---- clear: destructive, so it CONFIRMS; Save-and-clear is primary ----
  function clearConfirmShow(on) {
    if (els.confirmRoot) els.confirmRoot.style.display = on ? "flex" : "none";
  }
  function discard() {
    clearConfirmShow(false);
    els.pad.value = "";
    doc = { ...doc, pad: "" };
    persist(); onChange();
  }

  // ---- export / import / clipboard: the FILE is the only way notes move ----
  function exportText() { return toAtchart(doc, { title: file.title }); }
  function importText(text) {
    let inc;
    try { inc = fromAtchart(text); }
    catch (e) {
      const legacy = opts.importFallback ? opts.importFallback(text) : null;
      if (!legacy || !legacy.length)
        throw new Error("not a notepad file (and no legacy entries found)");
      inc = { pad: "", entries: legacy.map(makeEntry) };
    }
    const have = new Set(doc.entries.map((x) => x.id));
    const added = inc.entries.filter((x) => !have.has(x.id));
    let pad = doc.pad;
    if (inc.pad.trim() && !pad.trim()) pad = inc.pad;
    else if (inc.pad.trim() && pad.trim() && !pad.includes(inc.pad))
      pad = pad + "\n\n---\n\n" + inc.pad;
    doc = { ...doc, pad, entries: [...doc.entries, ...added] };
    els.pad.value = doc.pad;
    persist();
    return added.length;
  }
  function importMsg(t) {
    const m = els.importMsg || els.msg;
    if (!m) return;
    m.textContent = t;
    if (t) setTimeout(() => { if (m.textContent === t) m.textContent = ""; }, 8000);
  }
  async function importFile(f) {
    try {
      const text = await f.text();
      if (/^\s*\{/.test(text) && opts.jsonImport) {
        let data; try { data = JSON.parse(text); }
        catch (e) { throw new Error("not valid JSON"); }
        if (opts.jsonImport(data)) return; // host consumed a bare config
        throw new Error("not a recognized config");
      }
      const n = importText(text);
      renderRows(); onChange();
      importMsg("imported " + n + " new entr" + (n === 1 ? "y" : "ies") +
        (n === 0 ? " — everything was already here" : ""));
    } catch (e) { importMsg("import failed: " + e.message); }
  }
  function download() {
    let text; try { text = exportText(); } catch (e) { msgSet("export", e.message, true); return; }
    const docm = els.pad.ownerDocument, win = docm.defaultView;
    const blob = new win.Blob([text], { type: "text/markdown" });
    const a = docm.createElement("a");
    a.href = win.URL.createObjectURL(blob);
    const name = file.name();
    a.download = name;
    a.click();
    setTimeout(() => win.URL.revokeObjectURL(a.href), 2000);
    /* SUCCESS SAYS SO (260911, item 2c): this was the surface's one silent
     * success — the browser's download chrome is not this page's answer, and
     * a successful Export looked exactly like a dead button. The message
     * names the file it wrote. */
    msgSet("export", "exported " + name + " — check your downloads");
  }
  async function copy() {
    let text; try { text = exportText(); } catch (e) { msgSet("copy", e.message, true); return; }
    try {
      const win = els.pad.ownerDocument.defaultView;
      await win.navigator.clipboard.writeText(text);
      msgSet("copy", "copied — one .atchart.md, ready to paste");
    } catch (e) { msgSet("copy", "clipboard unavailable — use Export", true); }
  }

  // ---- the rows: read-surface rendering, derived labels, inert foreigners ----
  function fmtWhen(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " +
      d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  function renderRows() {
    const wrap = els.list;
    if (!wrap) return;
    const docm = wrap.ownerDocument;
    if (els.count) els.count.textContent = String(doc.entries.length);
    if (!storageOK && els.storeNote)
      els.storeNote.textContent =
        "storage unavailable here — your notes live in this tab only; use Export";
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
    if (!doc.entries.length) {
      const p = docm.createElement("div"); p.className = "hint";
      p.textContent = opts.emptyHint ||
        "No entries yet. Jot the note, then save — it files with the settings.";
      wrap.appendChild(p); return;
    }
    [...doc.entries].reverse().forEach((en) => {
      const div = docm.createElement("div"); div.className = "hist";
      const hd = docm.createElement("div"); hd.className = "hd";
      const b = docm.createElement("b");
      const p = en.payload;
      b.textContent = !p ? "note" :
        p.app === adapter.app ? adapter.summarize(p.data)
        : p.app + " · v" + p.v + " (another app's settings — carried untouched)";
      hd.appendChild(b);
      const w = docm.createElement("span"); w.className = "when";
      w.textContent = fmtWhen(en.savedAt); hd.appendChild(w);
      div.appendChild(hd);
      if (en.text) {
        const tx = docm.createElement("div"); tx.className = "note md";
        renderTo(tx, parseMarkdown(en.text));
        div.appendChild(tx);
      }
      const acts = docm.createElement("div"); acts.className = "acts";
      if (p && p.app === adapter.app && p.data) {
        const rb = docm.createElement("button"); rb.textContent = applyLabel;
        rb.addEventListener("click", () => {
          adapter.apply(p.data);
          els.pad.value = en.text || "";           // canonical: the note returns
          doc = { ...doc, pad: els.pad.value };    // as uncommitted scratch
          persist(); onChange(); onApplied();
        });
        acts.appendChild(rb);
      }
      const db = docm.createElement("button");
      db.textContent = "Delete"; db.className = "danger";
      db.addEventListener("click", () => {
        doc = deleteEntry(doc, en.id); persist(); renderRows(); onChange();
      });
      acts.appendChild(db);
      div.appendChild(acts);
      wrap.appendChild(div);
    });
  }

  // ---- mount: every declared capability renders a control — an explicit
  // mount, an auto-append into els.controls, or a LOUD failure naming the
  // capability. Placement is the host's; existence is not. ----
  function mountCap(cap, wire) {
    let btn = els[cap + "Btn"];
    if (!btn) {
      if (!els.controls)
        throw new Error('notepad-surface: no mount for declared capability "' +
          cap + '" — provide els.' + cap + "Btn or els.controls");
      btn = els.controls.ownerDocument.createElement("button");
      els.controls.appendChild(btn);
    }
    btn.setAttribute("data-cap", cap);
    btn.textContent = LABELS[cap];   // the adapter's vocabulary, composed here
    wire(btn);
    return btn;
  }
  doc = loadDoc();
  els.pad.value = doc.pad;   // persistent uncommitted scratch: survives reload
  els.pad.addEventListener("input", () => {
    doc = { ...doc, pad: els.pad.value };
    if (padTimer) clearTimeout(padTimer);
    padTimer = setTimeout(() => { persist(); onChange(); }, 300);
  });
  els.pad.addEventListener("change", () => { persist(); onChange(); });
  /* the document's TITLE rides the same store as the pad (ruled 260914,
   * overruling v0.9's unpersisted field): the pad already survives a reload
   * — a note that comes back without its name teaches distrust. Same
   * lifetime, same debounce, same store; the DROPPED per-entry title ruling
   * is untouched (entry labels stay derived). An optional slot: a host
   * without els.title keeps exactly the old behaviour. */
  if (els.title) {
    els.title.value = doc.title || "";
    els.title.addEventListener("input", () => {
      doc = { ...doc, title: els.title.value };
      if (padTimer) clearTimeout(padTimer);
      padTimer = setTimeout(() => { persist(); onChange(); }, 300);
    });
    els.title.addEventListener("change", () => { persist(); onChange(); });
  }
  mountCap("save", (b) => b.addEventListener("click", save));
  mountCap("clear", (b) => b.addEventListener("click", () => {
    if (!String(els.pad.value ?? "").trim()) { discard(); return; }
    clearConfirmShow(true);
  }));
  if (!els.confirmRoot || !els.confirmSave || !els.confirmDiscard || !els.confirmCancel)
    throw new Error("notepad-surface: the clear capability needs its confirm " +
      "row — provide els.confirmRoot/confirmSave/confirmDiscard/confirmCancel");
  els.confirmSave.addEventListener("click", save);
  els.confirmDiscard.addEventListener("click", discard);
  els.confirmCancel.addEventListener("click", () => clearConfirmShow(false));
  els.confirmSave.setAttribute("data-cap", "clear-save");
  els.confirmDiscard.setAttribute("data-cap", "clear-discard");
  mountCap("export", (b) => b.addEventListener("click", download));
  mountCap("copy", (b) => b.addEventListener("click", copy));
  mountCap("import", (b) => {
    if (!els.importFile) {
      const inp = b.ownerDocument.createElement("input");
      inp.setAttribute("type", "file");
      inp.setAttribute("accept", ".md,.json,text/markdown,application/json");
      inp.style.display = "none";
      (els.controls || els.pad).appendChild(inp);
      els.importFile = inp;
    }
    b.addEventListener("click", () => els.importFile.click());
    els.importFile.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importFile(f);
      e.target.value = "";
    });
  });
  mountCap("palette", (b) => {
    // the panel: explicit placement (els.paletteRoot) or auto-appended after
    // the controls — placement is the host's, existence is not. Hidden until
    // toggled; the toggle never steals the pad's content or selection.
    let panel = els.paletteRoot;
    if (!panel) {
      panel = els.pad.ownerDocument.createElement("div");
      (els.controls || els.pad).appendChild(panel);
    }
    panel.className = (panel.className ? panel.className + " " : "") + "palette";
    panel.setAttribute("data-cap", "palette-panel");
    panel.style.display = "none";
    createPalette({ root: panel, pad: els.pad, onInsert: () => {
      doc = { ...doc, pad: els.pad.value };
      persist(); onChange();
    } });
    b.setAttribute("aria-expanded", "false");
    b.addEventListener("click", () => {
      const on = panel.style.display === "none";
      panel.style.display = on ? "" : "none";
      b.setAttribute("aria-expanded", on ? "true" : "false");
    });
  });
  // the handoff guarantee: emitted by the surface, in EVERY host
  {
    const docm = els.pad.ownerDocument;
    let h = els.handoff;
    if (!h) {
      h = docm.createElement("div");
      h.className = "hint";
      (els.controls || els.pad).appendChild(h);
    }
    h.setAttribute("data-cap", "handoff");
    /* REWORDED 260915 (5d, the plain-English pass — Daniel: "none of
     * that means anything to me"). The PRIVACY PROMISE IS KEPT — only the
     * words changed: the old sentence said it in engineer's English
     * ("the file is the handoff channel: nothing leaves this machine"). */
    h.textContent = "Your notes stay on this computer — nothing is uploaded. "
      + "Moving notes anywhere happens only through the file Export writes.";
  }
  if (!storageOK && els.storeNote)
    els.storeNote.textContent =
      "storage unavailable here — your notes live in this tab only; use Export";
  renderRows();

  return {
    getDoc: () => doc,
    setDoc: (d) => { doc = { pad: String(d.pad ?? ""), entries: (d.entries || []).map(makeEntry) };
      els.pad.value = doc.pad; persist(); renderRows(); onChange(); },
    save, clearConfirmShow, exportText, importText, renderRows,
    get storageOK() { return storageOK; },
  };
}
