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
 * SHARE BEHAVIOUR, NOT LAYOUT: the host provides the elements (its page, its
 * grammar, its placement); this module only wires them and builds row nodes
 * inside the list element. No document/window globals — everything reaches
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
 *   applyLabel: "Restore étude" | "Apply settings" | …  // host wording
 *   importFallback?: (text) => entries[]|null           // legacy log formats
 *   jsonImport?: (parsedJson) => boolean                // bare-config files
 *   onChange?: ()=>{}   onApplied?: ()=>{}              // host hooks (fold
 *             lines, scroll) — presentation, never behaviour
 * }) → { getDoc, setDoc, save, clearConfirmShow, exportText, importText,
 *        renderRows, storageOK }
 */

import { emptyDoc, makeEntry, addEntry, deleteEntry, toAtchart, fromAtchart } from "./notepad.mjs";
import { parseMarkdown, renderTo } from "./markdown.mjs";

export function createNotepadSurface(opts) {
  const { adapter, storage, els, file } = opts;
  const migrate = opts.migrate || (() => null);
  const onChange = opts.onChange || (() => {});
  const onApplied = opts.onApplied || (() => {});
  const applyLabel = opts.applyLabel || "Apply settings";
  let doc = emptyDoc();
  let storageOK = true;
  let padTimer = null;

  // ---- storage (denial handled HERE, and said out loud) ----
  function loadDoc() {
    try {
      const raw = storage.load();
      if (raw) {
        const d = JSON.parse(raw);
        return { pad: String(d.pad ?? ""), entries: (d.entries || []).map(makeEntry) };
      }
      const migrated = migrate();
      if (migrated) { trySave(migrated); return migrated; }
      return emptyDoc();
    } catch (e) { storageOK = false; return emptyDoc(); }
  }
  function trySave(d) {
    if (!storageOK) return false;
    try { storage.save(JSON.stringify({ pad: d.pad, entries: d.entries })); return true; }
    catch (e) { storageOK = false; return false; }
  }
  function persist() { return trySave(doc); }

  function msgSet(t, sticky) {
    if (!els.msg) return;
    els.msg.textContent = t;
    if (t && !sticky) setTimeout(() => {
      if (els.msg.textContent === t) els.msg.textContent = "";
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
    if (!ok) msgSet("saved in this tab only — use Export to keep it", true);
    else if (!text) msgSet("captured without a note"); // something must confirm
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

  // ---- export / import / clipboard: the file is the handoff channel ----
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
    let text; try { text = exportText(); } catch (e) { msgSet(e.message, true); return; }
    const docm = els.pad.ownerDocument, win = docm.defaultView;
    const blob = new win.Blob([text], { type: "text/markdown" });
    const a = docm.createElement("a");
    a.href = win.URL.createObjectURL(blob);
    a.download = file.name();
    a.click();
    setTimeout(() => win.URL.revokeObjectURL(a.href), 2000);
  }
  async function copy() {
    let text; try { text = exportText(); } catch (e) { msgSet(e.message, true); return; }
    const win = els.pad.ownerDocument.defaultView;
    try {
      await win.navigator.clipboard.writeText(text);
      msgSet("copied — one .atchart.md, ready to paste");
    } catch (e) { msgSet("clipboard unavailable — use Export", true); }
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

  // ---- mount ----
  doc = loadDoc();
  els.pad.value = doc.pad;   // persistent uncommitted scratch: survives reload
  els.pad.addEventListener("input", () => {
    doc = { ...doc, pad: els.pad.value };
    if (padTimer) clearTimeout(padTimer);
    padTimer = setTimeout(() => { persist(); onChange(); }, 300);
  });
  els.pad.addEventListener("change", () => { persist(); onChange(); });
  els.saveBtn.addEventListener("click", save);
  if (els.clearBtn) els.clearBtn.addEventListener("click", () => {
    if (!String(els.pad.value ?? "").trim()) { discard(); return; }
    clearConfirmShow(true);
  });
  if (els.confirmSave) els.confirmSave.addEventListener("click", save);
  if (els.confirmDiscard) els.confirmDiscard.addEventListener("click", discard);
  if (els.confirmCancel) els.confirmCancel.addEventListener("click",
    () => clearConfirmShow(false));
  if (els.exportBtn) els.exportBtn.addEventListener("click", download);
  if (els.copyBtn) els.copyBtn.addEventListener("click", copy);
  if (els.importBtn && els.importFile) {
    els.importBtn.addEventListener("click", () => els.importFile.click());
    els.importFile.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importFile(f);
      e.target.value = "";
    });
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
