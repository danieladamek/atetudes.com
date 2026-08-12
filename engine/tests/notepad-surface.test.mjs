/* notepad-surface.test.mjs — the shared notepad SURFACE (component v1).
 * The test that stops the divergence recurring: save-then-inspect leaves the
 * pad EMPTY in BOTH host configurations, asserted against the one shared
 * surface. Before the extraction this assertion needed two hand-built DOMs —
 * that awkwardness was the finding. No browser anywhere in this file.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createNotepadSurface } from "../notepad-surface.mjs";

// ---- a stub DOM rich enough to host the surface: elements carry value,
// style, listeners and a click() that dispatches them. No innerHTML exists.
function makeDoc() {
  const doc = {
    createElement(tag) {
      const el = {
        tagName: tag.toUpperCase(), ownerDocument: doc, childNodes: [],
        attributes: {}, style: {}, value: "", _ls: {},
        appendChild(n) { this.childNodes.push(n); return n; },
        removeChild(n) { this.childNodes = this.childNodes.filter((c) => c !== n); return n; },
        get firstChild() { return this.childNodes[0] ?? null; },
        setAttribute(k, v) { this.attributes[k] = String(v); },
        set className(v) { this.attributes.class = v; },
        get className() { return this.attributes.class || ""; },
        addEventListener(t, fn) { (this._ls[t] = this._ls[t] || []).push(fn); },
        dispatch(t, ev) { for (const fn of this._ls[t] || []) fn(ev || { target: this }); },
        click() { this.dispatch("click"); },
        set textContent(t) { this.childNodes = [doc.createTextNode(String(t))]; },
        get textContent() { return this.childNodes.map((c) => c.textContent).join(""); },
      };
      return el;
    },
    createTextNode(t) {
      return { nodeType: 3, data: String(t), ownerDocument: doc,
        get textContent() { return this.data; } };
    },
  };
  return doc;
}
function makeEls() {
  const d = makeDoc();
  const mk = () => d.createElement("div");
  return { pad: d.createElement("textarea"), saveBtn: mk(), clearBtn: mk(),
    confirmRoot: mk(), confirmSave: mk(), confirmDiscard: mk(), confirmCancel: mk(),
    msg: mk(), importMsg: mk(), list: mk(), count: mk(), storeNote: mk() };
}
function memStorage(denied) {
  let held = null;
  return {
    load() { if (denied) throw new Error("denied"); return held; },
    save(s) { if (denied) throw new Error("denied"); held = s; },
    peek: () => held,
  };
}

// the two REAL host configurations, side by side — one behaviour, no choice
const HOSTS = [
  { name: "metronome", adapter: { app: "metronome", version: 1,
      snapshot: () => ({ bpm: 72, meter: 4 }),
      apply: () => {}, summarize: (d) => "♩=" + d.bpm },
    file: { title: "Metronome notepad", name: () => "m.atchart.md" } },
  { name: "triadetudes", adapter: { app: "triadetudes", version: 1,
      snapshot: () => ({ v: 1, key: "C", bpm: 96 }),
      apply: () => {}, summarize: (d) => d.key + " · " + d.bpm + " bpm" },
    file: { title: "Triadetudes journal", name: () => "t.atchart.md" } },
];

for (const host of HOSTS) {
  test(`THE recurrence-stopper [${host.name}]: save-then-inspect leaves the pad empty`, () => {
    const els = makeEls();
    const st = memStorage(false);
    const s = createNotepadSurface({ adapter: host.adapter, storage: st,
      els, file: host.file });
    els.pad.value = "an idea worth keeping";
    els.pad.dispatch("input");
    els.saveBtn.click();
    assert.equal(els.pad.value, "", "the pad is EMPTY after save — no prompt");
    assert.equal(s.getDoc().pad, "", "and the model agrees");
    assert.equal(s.getDoc().entries.length, 1, "the note was FILED, not lost");
    assert.equal(s.getDoc().entries[0].text, "an idea worth keeping");
    assert.equal(s.getDoc().entries[0].payload.app, host.adapter.app);
    assert.equal(els.msg.textContent, "", "no toast — the empty pad is the confirmation");
    // a second save with new text: no duplication of the first
    els.pad.value = "second idea"; els.pad.dispatch("input");
    els.saveBtn.click();
    assert.deepEqual(s.getDoc().entries.map((e) => e.text),
      ["an idea worth keeping", "second idea"], "no duplicate-on-every-save");
    // empty-pad save still works: config capture is a real use
    els.saveBtn.click();
    assert.equal(s.getDoc().entries.length, 3);
    assert.equal(s.getDoc().entries[2].text, "");
    assert.equal(els.msg.textContent, "captured without a note");
  });

  test(`clear semantics [${host.name}]: confirm, Save-and-clear primary, Discard loses deliberately`, () => {
    const els = makeEls();
    const s = createNotepadSurface({ adapter: host.adapter, storage: memStorage(false),
      els, file: host.file });
    els.pad.value = "unfiled"; els.pad.dispatch("input");
    els.clearBtn.click();
    assert.equal(els.confirmRoot.style.display, "flex", "a non-empty pad asks");
    els.confirmCancel.click();
    assert.equal(els.pad.value, "unfiled", "keep writing keeps the text");
    els.clearBtn.click(); els.confirmSave.click();
    assert.equal(s.getDoc().entries.at(-1).text, "unfiled", "Save and clear FILES it");
    assert.equal(els.pad.value, "");
    els.pad.value = "doomed"; els.pad.dispatch("input");
    els.clearBtn.click(); els.confirmDiscard.click();
    assert.equal(els.pad.value, "");
    assert.ok(!s.getDoc().entries.some((e) => e.text === "doomed"), "Discard files nothing");
    els.clearBtn.click();
    assert.notEqual(els.confirmRoot.style.display, "flex", "an empty pad needs no ceremony");
  });

  test(`persistent uncommitted scratch [${host.name}]: the pad survives a reload, then clears on save`, async () => {
    const st = memStorage(false);
    const els1 = makeEls();
    const s1 = createNotepadSurface({ adapter: host.adapter, storage: st,
      els: els1, file: host.file });
    els1.pad.value = "typed then refreshed"; els1.pad.dispatch("input");
    await new Promise((r) => setTimeout(r, 350));   // the autosave debounce
    assert.ok(st.peek().includes("typed then refreshed"), "autosaved to storage");
    // "reload": a fresh surface over the same storage
    const els2 = makeEls();
    const s2 = createNotepadSurface({ adapter: host.adapter, storage: st,
      els: els2, file: host.file });
    assert.equal(els2.pad.value, "typed then refreshed", "the scratch survived");
    els2.saveBtn.click();
    assert.equal(els2.pad.value, "", "…and clears on save");
    assert.equal(s2.getDoc().entries.at(-1).text, "typed then refreshed");
  });

  test(`storage-denied [${host.name}]: still works, SAYS SO, still exports`, () => {
    const els = makeEls();
    const s = createNotepadSurface({ adapter: host.adapter, storage: memStorage(true),
      els, file: host.file });
    assert.equal(s.storageOK, false);
    assert.match(els.storeNote.textContent, /storage unavailable.*Export/);
    els.pad.value = "works without storage"; els.pad.dispatch("input");
    els.saveBtn.click();
    assert.equal(s.getDoc().entries.length, 1, "save still works in memory");
    assert.match(els.msg.textContent, /Export/);
    assert.ok(s.exportText().includes("works without storage"), "Export still produced");
  });
}

test("migration hook runs once when storage holds no v2 doc", () => {
  const st = memStorage(false);
  let calls = 0;
  const els = makeEls();
  const s = createNotepadSurface({ adapter: HOSTS[0].adapter, storage: st,
    els, file: HOSTS[0].file,
    migrate: () => { calls++; return { pad: "old scratch",
      entries: [{ id: "v1-1", savedAt: null, text: "old note",
        payload: { app: "metronome", v: 1, data: { bpm: 60 } } }] }; } });
  assert.equal(calls, 1);
  assert.equal(els.pad.value, "old scratch");
  assert.equal(s.getDoc().entries[0].id, "v1-1");
  assert.ok(st.peek().includes("old note"), "migrated doc written to the new key");
  // a second surface over the same storage does NOT re-migrate
  createNotepadSurface({ adapter: HOSTS[0].adapter, storage: st,
    els: makeEls(), file: HOSTS[0].file,
    migrate: () => { calls++; return null; } });
  assert.equal(calls, 1, "once means once");
});

test("rows: derived labels via the adapter; foreign payloads named, inert, apply-less", () => {
  const els = makeEls();
  const s = createNotepadSurface({ adapter: HOSTS[1].adapter, storage: memStorage(false),
    els, file: HOSTS[1].file, applyLabel: "Restore étude" });
  s.setDoc({ pad: "", entries: [
    { id: "a", savedAt: "2026-08-11T10:00:00.000Z", text: "*mine*",
      payload: { app: "triadetudes", v: 1, data: { v: 1, key: "Eb", bpm: 96 } } },
    { id: "b", savedAt: "2026-08-11T10:01:00.000Z", text: "not mine",
      payload: { app: "future-app", v: 9, data: { x: 1 } } } ] });
  const rows = els.list.childNodes;
  assert.equal(rows.length, 2);
  const texts = rows.map((r) => r.textContent);
  assert.ok(texts.some((t) => t.includes("Eb · 96 bpm")), "label DERIVES via summarize");
  assert.ok(texts.some((t) => t.includes("future-app · v9 (another app's settings")),
    "foreign named and carried");
  const foreign = rows.find((r) => r.textContent.includes("future-app"));
  const btns = [];
  (function walk(n) { if (n.tagName === "BUTTON") btns.push(n.textContent);
    (n.childNodes || []).forEach(walk); })(foreign);
  assert.deepEqual(btns, ["Delete"], "no apply control on a foreign row");
  // and the note markdown rendered as DOM (em node), never as markup text
  const mine = rows.find((r) => r.textContent.includes("Eb · 96 bpm"));
  let em = null;
  (function walk(n) { if (n.tagName === "EM") em = n; (n.childNodes || []).forEach(walk); })(mine);
  assert.ok(em && em.textContent === "mine", "renderTo built the reading view");
});
