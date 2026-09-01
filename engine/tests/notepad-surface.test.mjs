/* notepad-surface.test.mjs — the shared notepad SURFACE (component v1).
 * The test that stops the divergence recurring: save-then-inspect leaves the
 * pad EMPTY in BOTH host configurations, asserted against the one shared
 * surface. Before the extraction this assertion needed two hand-built DOMs —
 * that awkwardness was the finding. No browser anywhere in this file.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createNotepadSurface, CAPABILITIES } from "../notepad-surface.mjs";
import { makeDoc, memStorage } from "./_dom-stub.mjs";

// the stub DOM and storage live in _dom-stub.mjs — one source per fact
// (§4.3): host-conformance.test.mjs mounts the same stub
function makeEls() {
  const d = makeDoc();
  const mk = () => d.createElement("div");
  // controls = the host's button row: capabilities without an explicit mount
  // auto-append here (the copy control in these fixtures arrives that way)
  return { pad: d.createElement("textarea"), title: d.createElement("input"),
    saveBtn: mk(), clearBtn: mk(),
    confirmRoot: mk(), confirmSave: mk(), confirmDiscard: mk(), confirmCancel: mk(),
    msg: mk(), importMsg: mk(), list: mk(), count: mk(), storeNote: mk(),
    controls: mk() };
}
function capsOf(els) {
  // enumerate what actually RENDERED — the artifact, not the intent
  const found = [];
  (function walk(n) {
    if (n.attributes && n.attributes["data-cap"]) found.push(n.attributes["data-cap"]);
    (n.childNodes || []).forEach(walk);
  })({ childNodes: [els.saveBtn, els.clearBtn, els.controls,
       els.exportBtn, els.copyBtn, els.importBtn].filter(Boolean) });
  return found.sort();
}

// the two REAL host configurations, side by side — one behaviour, no choice
const HOSTS = [
  { name: "metronome", adapter: { app: "metronome", version: 1,
      nouns: { item: "note", apply: "Apply settings" },
      snapshot: () => ({ bpm: 72, meter: 4 }),
      apply: () => {}, summarize: (d) => "♩=" + d.bpm },
    file: { title: "Metronome notepad", name: () => "m.atchart.md" } },
  { name: "triadetudes", adapter: { app: "triadetudes", version: 1,
      nouns: { item: "entry", apply: "Restore étude" },
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

  test(`260914 item 5 [${host.name}]: the TITLE rides the pad's own store — a note that survives keeps its name`, async () => {
    const st = memStorage(false);
    const els1 = makeEls();
    createNotepadSurface({ adapter: host.adapter, storage: st,
      els: els1, file: host.file });
    els1.pad.value = "dorian ideas"; els1.pad.dispatch("input");
    els1.title.value = "Dorian week 3"; els1.title.dispatch("input");
    await new Promise((r) => setTimeout(r, 350));
    const stored = JSON.parse(st.peek());
    assert.equal(stored.title, "Dorian week 3",
      "the title is IN the store, beside the pad");
    // "reload": a fresh surface over the same storage
    const els2 = makeEls();
    const s2 = createNotepadSurface({ adapter: host.adapter, storage: st,
      els: els2, file: host.file });
    assert.equal(els2.title.value, "Dorian week 3", "the name came back with the note");
    assert.equal(s2.getDoc().title, "Dorian week 3", "and the model agrees");
    // save clears the PAD, never the title — the document keeps its name
    els2.saveBtn.click();
    assert.equal(els2.title.value, "Dorian week 3", "save clears the pad, not the name");
    // a legacy store without the key loads as the empty title, not undefined
    const stOld = memStorage(false);
    stOld.save(JSON.stringify({ pad: "old", entries: [] }));
    const els3 = makeEls();
    const s3 = createNotepadSurface({ adapter: host.adapter, storage: stOld,
      els: els3, file: host.file });
    assert.equal(s3.getDoc().title, "", "a v1 store loads with the empty name");
    assert.equal(els3.title.value, "");
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
    els, file: HOSTS[1].file });
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

// ---- the capability law (this item): declared set, loud failure, composed labels ----

test("BOTH hosts render the SAME capability set — enumerated from the DOM, not the code", () => {
  const rendered = HOSTS.map((host) => {
    const els = makeEls();
    createNotepadSurface({ adapter: host.adapter, storage: memStorage(false),
      els, file: host.file });
    return { name: host.name, caps: capsOf(els).filter((c) => CAPABILITIES.includes(c)) };
  });
  assert.deepEqual(rendered[0].caps, [...CAPABILITIES].sort(),
    rendered[0].name + " renders the full declared set");
  assert.deepEqual(rendered[0].caps, rendered[1].caps,
    "the two hosts render IDENTICAL capability sets — the divergence-stopper");
});

test("a missing mount FAILS LOUDLY by capability name — never silent omission", () => {
  const els = makeEls();
  // give every OTHER capability an explicit mount, then remove copy's only
  // path (no copyBtn, no controls): the failure must name COPY exactly
  const d = els.pad.ownerDocument;
  els.exportBtn = d.createElement("button");
  els.importBtn = d.createElement("button");
  els.importFile = d.createElement("input");
  delete els.controls;
  assert.throws(() => createNotepadSurface({ adapter: HOSTS[0].adapter,
    storage: memStorage(false), els, file: HOSTS[0].file }),
    /declared capability "copy".*copyBtn or els\.controls/);
  // and the same for a missing confirm row
  const els2 = makeEls();
  delete els2.confirmRoot;
  assert.throws(() => createNotepadSurface({ adapter: HOSTS[0].adapter,
    storage: memStorage(false), els: els2, file: HOSTS[0].file }),
    /confirm/);
});

test("auto-append: a host with els.controls but no copy mount still gets a working Copy", () => {
  const els = makeEls();
  const s = createNotepadSurface({ adapter: HOSTS[1].adapter,
    storage: memStorage(false), els, file: HOSTS[1].file });
  const copyBtn = els.controls.childNodes.find(
    (n) => n.attributes && n.attributes["data-cap"] === "copy");
  assert.ok(copyBtn, "the control was appended, not omitted");
  assert.equal(copyBtn.textContent, "Copy");
  copyBtn.click();   // no clipboard in the stub: the honest message, no throw
  assert.match(els.msg.textContent, /clipboard unavailable.*Export/);
});

test("labels compose from the adapter's nouns — no hand-written verbs survive", () => {
  for (const host of HOSTS) {
    const els = makeEls();
    els.saveBtn.textContent = "HAND-WRITTEN RELIC";   // the surface overwrites
    createNotepadSurface({ adapter: host.adapter, storage: memStorage(false),
      els, file: host.file });
    assert.equal(els.saveBtn.textContent, "Save " + host.adapter.nouns.item);
    assert.equal(els.clearBtn.textContent, "Clear");
  }
});

test("the handoff guarantee is emitted by the surface in every host", () => {
  for (const host of HOSTS) {
    const els = makeEls();
    createNotepadSurface({ adapter: host.adapter, storage: memStorage(false),
      els, file: host.file });
    const h = els.controls.childNodes.find(
      (n) => n.attributes && n.attributes["data-cap"] === "handoff");
    assert.ok(h, host.name + " carries the sentence");
    assert.equal(h.textContent,
      "The file is the handoff channel: nothing leaves this machine.");
  }
});
