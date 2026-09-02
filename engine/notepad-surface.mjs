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
 *   - Restore NEVER silently overwrites unsaved pad text (260916, item 1):
 *     it asks through the same row, worded for restoring ("Save and
 *     restore" / "Discard and restore" / keep writing); an empty pad
 *     restores at once.
 *   - The document's title (els.title, optional) is PRE-POPULATED with the
 *     host's default name and is the single source of the name — for the
 *     export file and for each entry filed while it stands (260916, item 2).
 *   - Every entry exports on its own, through the one download path,
 *     named from its own name; both outcomes speak in the row (260916, 3).
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
 *   file:     {title, name(stem?):string}               // export identity —
 *             title is the document's name NOW (a host with a title field
 *             reads the field, falling back to its standing default); name()
 *             derives the filename from that same string, or from the stem
 *             it is handed (an entry's own name)
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
    palette: "Palette",
    /* THE CONFIRM ROW IS ONE IDIOM, WORDED FOR WHAT IT GUARDS (260916,
     * item 1 — Daniel lost work to a silent Restore during the v0.4.0
     * review: "a definite must have"). The row's verbs are composed here
     * per INTENT, never hand-written in a host: a host's static labels are
     * overwritten at mount, exactly as Save's are. */
    confirm: {
      clear:   { save: "Save and clear",   discard: "Discard",             cancel: "keep writing" },
      restore: { save: "Save and restore", discard: "Discard and restore", cancel: "keep writing" } },
    /* the row's own controls (260916, item 3): a saved note exports on its
     * own, named from the document's title — no second export path */
    entryExport: "Export", delete: "Delete" };
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
  /* …and a PRESS THAT HAPPENED IN A ROW speaks in that row (260916, item 3):
   * an explicit slot wins over the capability's, so an entry's export names
   * its file — or its refusal — beside the button that was pressed, not up
   * at the pad. Same message, same timing, one function. */
  function msgSet(cap, t, sticky, slotEl) {
    const slot = slotEl || els[cap + "Msg"] || els.msg;
    if (!slot) return;
    slot.textContent = t;
    if (t && !sticky) setTimeout(() => {
      if (slot.textContent === t) slot.textContent = "";
    }, 2200);
  }

  // ---- save: file the note, CLEAR the pad, no prompt, no toast ----
  /* THE DOCUMENT'S TITLE NAMES THE ENTRY TOO (260916, item 2b — ruled):
   * the field is the single source of the name for the export file AND the
   * practice-log entry. The name is taken at SAVE time into the entry's own
   * `heading` slot — the model already had one, the file format already
   * writes it (`### <heading>`) and reads it back; nothing new is tabled.
   * A host without a title field (the hand-authored studies) files entries
   * exactly as before: heading null, the row labelled by its derived
   * summary. The SUMMARY still derives on every render (260811.3) — the
   * name is the player's, the summary is the configuration's. */
  const nameNow = () =>
    els.title ? (String(els.title.value ?? "").trim() || file.title) : null;
  function save() {
    clearConfirmShow(false);
    const text = String(els.pad.value ?? "").trim();
    doc = addEntry(doc, { savedAt: new Date().toISOString(), text, heading: nameNow(),
      payload: { app: adapter.app, v: adapter.version, data: adapter.snapshot() } });
    doc = { ...doc, pad: "" };
    els.pad.value = "";
    const ok = persist();
    if (!ok) msgSet("save", "saved in this tab only — use Export to keep it", true);
    else if (!text) msgSet("save", "captured without a note"); // something must confirm
    renderRows(); onChange();
  }

  // ---- clear: destructive, so it CONFIRMS; Save-and-clear is primary ----
  /* THE ROW CARRIES AN INTENT (260916, item 1): `pending` is what the row is
   * guarding — a clear, or a restore that would overwrite unsaved pad text.
   * The three answers keep their seats and their data-cap; their VERBS
   * follow the intent (LABELS.confirm), and the root says which intent it
   * shows in `data-intent`, so a harness can address the state by role and
   * never by the words on the buttons (rule 12). `clearConfirmShow(true)`
   * with no intent is the clear — the public seam keeps its old meaning. */
  let pending = null;
  function clearConfirmShow(on, intent) {
    pending = on ? (intent || { kind: "clear" }) : null;
    const kind = on ? pending.kind : "none";
    if (els.confirmRoot) {
      els.confirmRoot.style.display = on ? "flex" : "none";
      els.confirmRoot.setAttribute("data-intent", kind);
    }
    const L = LABELS.confirm[on ? kind : "clear"];
    if (els.confirmSave) els.confirmSave.textContent = L.save;
    if (els.confirmDiscard) els.confirmDiscard.textContent = L.discard;
    if (els.confirmCancel) els.confirmCancel.textContent = L.cancel;
  }
  /* the pad holds UNSAVED text when it holds any text at all — the same
   * predicate Clear has always used, so the two guards can never disagree
   * about what needs asking (an empty pad asks nothing, either way) */
  const padUnsaved = () => Boolean(String(els.pad.value ?? "").trim());
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
  /* ONE DOWNLOAD PATH (260916, item 3): the document's Export and an
   * entry's Export both come through here — the text, the name and the
   * slot differ, the mechanism does not. Reused, not forked. */
  function download(text, name, slotEl) {
    const docm = els.pad.ownerDocument, win = docm.defaultView;
    const blob = new win.Blob([text], { type: "text/markdown" });
    const a = docm.createElement("a");
    a.href = win.URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => win.URL.revokeObjectURL(a.href), 2000);
    /* SUCCESS SAYS SO (260911, item 2c): this was the surface's one silent
     * success — the browser's download chrome is not this page's answer, and
     * a successful Export looked exactly like a dead button. The message
     * names the file it wrote. */
    msgSet("export", "exported " + name + " — check your downloads", false, slotEl);
  }
  function exportDoc() {
    let text; try { text = exportText(); } catch (e) { msgSet("export", e.message, true); return; }
    download(text, file.name());
  }
  /* an entry exports ALONE, as a pure notepad file holding that one note:
   * its title is the entry's own name (item 2's title, taken at save), and
   * the host's name() derives the filename from the same string — the one
   * naming rule, applied to the smaller document. An entry with no name
   * (filed before tonight, or in a host without the field) takes the
   * document's. Both outcomes speak in the ROW's slot: a refusal (a
   * ```chart block in the note) names its reason exactly as Export does. */
  function exportEntry(en, slotEl) {
    const title = en.heading || file.title;
    let text;
    try { text = toAtchart({ pad: "", entries: [en] }, { title }); }
    catch (e) { msgSet("export", e.message, true, slotEl); return; }
    download(text, file.name(en.heading || undefined), slotEl);
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
      const summary = !p ? "note" :
        p.app === adapter.app ? adapter.summarize(p.data)
        : p.app + " · v" + p.v + " (another app's settings — carried untouched)";
      /* v0.9's own row shape for a NAMED entry (260916, item 2b): the name
       * leads in bold, the derived summary follows on its own line — an
       * unnamed entry reads exactly as it always has */
      b.textContent = en.heading || summary;
      hd.appendChild(b);
      const w = docm.createElement("span"); w.className = "when";
      w.textContent = fmtWhen(en.savedAt); hd.appendChild(w);
      div.appendChild(hd);
      if (en.heading) {
        const sm = docm.createElement("div"); sm.className = "sum";
        sm.textContent = summary; div.appendChild(sm);
      }
      if (en.text) {
        const tx = docm.createElement("div"); tx.className = "note md";
        renderTo(tx, parseMarkdown(en.text));
        div.appendChild(tx);
      }
      const acts = docm.createElement("div"); acts.className = "acts";
      /* the row's controls carry data-cap ROLES (rule 12): a harness that
       * reads "Restore étude" or "Delete" off a button is reading a word
       * the adapter or a redesign may change tomorrow */
      if (p && p.app === adapter.app && p.data) {
        const applyEntry = () => {
          adapter.apply(p.data);
          els.pad.value = en.text || "";           // canonical: the note returns
          doc = { ...doc, pad: els.pad.value };    // as uncommitted scratch
          persist(); onChange(); onApplied();
        };
        const rb = docm.createElement("button"); rb.textContent = applyLabel;
        rb.setAttribute("data-cap", "apply");
        /* RESTORE NEVER SILENTLY OVERWRITES THE PAD (260916, item 1 —
         * measured at this line: `els.pad.value = en.text` ran
         * unconditionally, and Daniel lost a note to it). Unsaved text
         * asks, through Clear's own row worded for restoring; an empty pad
         * restores at once, as it always did — Clear's precedent for the
         * common case, no new friction. */
        rb.addEventListener("click", () => {
          if (padUnsaved()) clearConfirmShow(true, { kind: "restore", apply: applyEntry });
          else applyEntry();
        });
        acts.appendChild(rb);
      }
      const emsg = docm.createElement("span"); emsg.className = "emsg";
      const xb = docm.createElement("button"); xb.textContent = LABELS.entryExport;
      xb.setAttribute("data-cap", "entry-export");
      xb.addEventListener("click", () => exportEntry(en, emsg));
      acts.appendChild(xb);
      const db = docm.createElement("button");
      db.textContent = LABELS.delete; db.className = "danger";
      db.setAttribute("data-cap", "delete");
      db.addEventListener("click", () => {
        doc = deleteEntry(doc, en.id); persist(); renderRows(); onChange();
      });
      acts.appendChild(db);
      acts.appendChild(emsg);
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
    /* PRE-POPULATED, NOT A PLACEHOLDER (260916, item 2a — ruled): the
     * field holds a real value on first paint — the host's standing
     * default (file.title, which the host derives from the field-or-
     * fallback). The MODEL's title stays what the store holds: an
     * untouched field persists nothing, so tomorrow's first paint carries
     * tomorrow's date exactly as v0.4.0's fallback did, and an edit sticks
     * through the input listener below (night 19's persistence). */
    els.title.value = doc.title || file.title;
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
  /* the three answers, intent-aware (260916, item 1): under a restore, Save
   * files the pad and THEN restores; Discard drops it and then restores;
   * keep writing does nothing at all. Under a clear, the old three. The
   * intent is read before save()/discard() hide the row and clear it. */
  els.confirmSave.addEventListener("click", () => {
    const p = pending; save(); if (p && p.apply) p.apply();
  });
  els.confirmDiscard.addEventListener("click", () => {
    const p = pending; discard(); if (p && p.apply) p.apply();
  });
  els.confirmCancel.addEventListener("click", () => clearConfirmShow(false));
  els.confirmSave.setAttribute("data-cap", "clear-save");
  els.confirmDiscard.setAttribute("data-cap", "clear-discard");
  clearConfirmShow(false);   // the row's labels are the surface's from first paint
  mountCap("export", (b) => b.addEventListener("click", exportDoc));
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
    setDoc: (d) => { doc = { pad: String(d.pad ?? ""), title: String(d.title ?? ""),
        entries: (d.entries || []).map(makeEntry) };
      els.pad.value = doc.pad; persist(); renderRows(); onChange(); },
    save, clearConfirmShow, exportText, importText, renderRows,
    get storageOK() { return storageOK; },
  };
}
