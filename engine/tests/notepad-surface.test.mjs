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
    /* PIN REWRITTEN 260917 (item 0c, rule 7): the title DESCRIBES WHAT IS
     * IN THE PAD — save empties the pad, so the title returns to the dated
     * default. The old line ("save clears the pad, not the name") was the
     * transition nobody had written down: a stale title silently misfiled
     * the next note under the last one's name. Persistence itself (night
     * 19) is untouched — the reload above proves it. */
    els2.saveBtn.click();
    assert.equal(els2.title.value, host.file.title, "save empties the pad, and the title returns to the default");
    // a legacy store without the key loads as the empty title, not undefined
    const stOld = memStorage(false);
    stOld.save(JSON.stringify({ pad: "old", entries: [] }));
    const els3 = makeEls();
    const s3 = createNotepadSurface({ adapter: host.adapter, storage: stOld,
      els: els3, file: host.file });
    assert.equal(s3.getDoc().title, "", "a v1 store loads with the empty name");
    /* PIN REWRITTEN 260916 (item 2a, rule 7): the FIELD is pre-populated
     * with the host's standing default while the MODEL's title stays empty
     * — an untouched field persists nothing, so the fallback (and its date)
     * is computed fresh on every paint, exactly as v0.4.0's export did. */
    assert.equal(els3.title.value, host.file.title,
      "the field shows the standing default; the model's name is still empty");
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
  /* PIN REWRITTEN 260916 (item 3, rule 7): a foreign row still has NO apply
   * control — but every row exports, a foreign one included: the file is
   * how another app's entry travels back to the app that can read it. */
  assert.deepEqual(btns, ["Export", "Delete"], "no apply control on a foreign row — Export and Delete only");
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
    /* PIN REWRITTEN 260915 (5d): same guarantee, plain words — see
     * host-conformance's twin pin for the ruling. */
    assert.equal(h.textContent,
      "Your notes stay on this computer — nothing is uploaded. "
        + "Moving notes anywhere happens only through the file Export writes.");
  }
});

// ---- 260916, the v0.4.0 review — items 1, 2 and 3 of the notepad night ----

for (const host of HOSTS) {
  test(`260916 item 1 [${host.name}]: Restore never silently overwrites unsaved pad text — the three answers`, () => {
    const els = makeEls();
    const applied = [];
    const adapter = { ...host.adapter, apply: (d) => applied.push(d) };
    const s = createNotepadSurface({ adapter, storage: memStorage(false), els, file: host.file });
    // an entry to restore, with a note of its own
    els.pad.value = "the filed note"; els.pad.dispatch("input");
    els.saveBtn.click();
    const row = els.list.childNodes[0];
    const btn = (cap) => { let b = null; (function walk(n) {
      if (n.attributes && n.attributes["data-cap"] === cap) b = n;
      (n.childNodes || []).forEach(walk); })(row); return b; };
    assert.ok(btn("apply") && btn("delete") && btn("entry-export"),
      "the row's controls carry roles, not just words");
    // MEASURED (engine/notepad-surface.mjs:259 before tonight): apply ran
    // unconditionally and the pad was overwritten. Now: unsaved text ASKS.
    /* PIN REWRITTEN 260917 (item 0b, rule 7): the confirm appears IN THE
     * ROW that was pressed — night 16's "the message prints nowhere near
     * the press" had recurred through the host's shared row (Restore in
     * the log column, the answer under the pad). The host's row stays
     * hidden; the three answers carry roles under a data-intent root. */
    const rowConfirm = () => btn("restore-confirm");
    els.pad.value = "unsaved words that must survive"; els.pad.dispatch("input");
    btn("apply").click();
    assert.ok(rowConfirm(), "dirty text asks before restoring — IN THE ROW");
    assert.equal(rowConfirm().attributes["data-intent"], "restore", "the row says what it guards");
    assert.equal(els.confirmRoot.style.display, "none", "the host's row (Clear's) stays hidden");
    assert.equal(els.pad.value, "unsaved words that must survive", "nothing was overwritten by the press");
    assert.deepEqual([btn("confirm-save").textContent, btn("confirm-discard").textContent, btn("confirm-cancel").textContent],
      ["Save and restore", "Discard and restore", "keep writing"], "the row is worded for restoring");
    assert.equal(applied.length, 0, "the restore has NOT happened yet");
    // answer 1 — keep writing: nothing moves
    btn("confirm-cancel").click();
    assert.equal(rowConfirm(), null, "the confirm leaves the row");
    assert.equal(els.pad.value, "unsaved words that must survive", "keep writing keeps the text");
    assert.equal(applied.length, 0, "…and restores nothing");
    assert.equal(s.getDoc().entries.length, 1, "…and files nothing");
    // answer 2 — Discard and restore: the draft is dropped, the entry returns
    btn("apply").click(); btn("confirm-discard").click();
    assert.equal(applied.length, 1, "Discard and restore RESTORES");
    assert.equal(els.pad.value, "the filed note", "the entry's note returns to the pad");
    assert.equal(s.getDoc().entries.length, 1, "the draft was filed nowhere");
    // answer 3 — Save and restore: the draft is filed first, then the entry returns
    els.pad.value = "a second draft worth keeping"; els.pad.dispatch("input");
    btn("apply").click(); btn("confirm-save").click();
    assert.equal(applied.length, 2, "Save and restore RESTORES");
    assert.equal(s.getDoc().entries.at(-1).text, "a second draft worth keeping", "…after FILING the draft");
    assert.equal(els.pad.value, "the filed note", "…and the entry's note is back in the pad");
    // the common case keeps no ceremony: an empty pad restores at once
    els.pad.value = ""; els.pad.dispatch("input");
    btn("apply").click();
    assert.equal(rowConfirm(), null, "an empty pad restores without asking");
    assert.equal(applied.length, 3);
    assert.equal(els.pad.value, "the filed note");
    // and Clear still wears its own words when it is Clear that asks —
    // over DIRTY text (260917, 6c: the restored note above is clean)
    els.pad.value = "the filed note, edited"; els.pad.dispatch("input");
    els.clearBtn.click();
    assert.equal(els.confirmRoot.attributes["data-intent"], "clear");
    assert.deepEqual([els.confirmSave.textContent, els.confirmDiscard.textContent],
      ["Save and clear", "Discard"], "Clear's row keeps Clear's verbs");
    els.confirmCancel.click();
  });

  test(`260916 item 2 [${host.name}]: the title is PRE-POPULATED and names the entry too`, async () => {
    const st = memStorage(false);
    const els = makeEls();
    const s = createNotepadSurface({ adapter: host.adapter, storage: st, els, file: host.file });
    // 2a: a real value on first paint — the host's standing default — while
    // the model's title stays empty (an untouched field persists nothing)
    assert.equal(els.title.value, host.file.title, "the field holds the default, not a placeholder");
    assert.equal(s.getDoc().title, "", "…and nothing was persisted for it");
    // 2b: an entry filed under the untouched field carries the default name
    els.pad.value = "filed under the default name"; els.pad.dispatch("input");
    els.saveBtn.click();
    assert.equal(s.getDoc().entries[0].heading, host.file.title, "the entry is named from the field");
    // a typed name sticks (night 19's persistence) and names the next entry
    els.title.value = "Dorian week 3"; els.title.dispatch("input");
    await new Promise((r) => setTimeout(r, 350));
    assert.equal(JSON.parse(st.peek()).title, "Dorian week 3", "the edit persisted");
    els.pad.value = "filed under the typed name"; els.pad.dispatch("input");
    els.saveBtn.click();
    assert.equal(s.getDoc().entries[1].heading, "Dorian week 3");
    // the row leads with the name in bold and carries the derived summary below
    const row = els.list.childNodes[0];                    // newest first
    let b = null, sum = null;
    (function walk(n) { if (n.tagName === "B") b = n; if (n.className === "sum") sum = n;
      (n.childNodes || []).forEach(walk); })(row);
    assert.equal(b && b.textContent, "Dorian week 3", "the name leads");
    assert.ok(sum && sum.textContent.length > 0 && sum.textContent !== "Dorian week 3",
      "the derived summary still shows — Restore is not blind");
    // the name reaches the FILE (### <name>) and comes back through import
    const text = s.exportText();
    assert.ok(text.includes("\n### Dorian week 3\n"), "the entry's heading is its name in the file");
    assert.ok(text.includes("\n### " + host.file.title + "\n"));
    const els2 = makeEls();
    const s2 = createNotepadSurface({ adapter: host.adapter, storage: memStorage(false),
      els: els2, file: host.file });
    s2.importText(text);
    assert.deepEqual(s2.getDoc().entries.map((e) => e.heading), [host.file.title, "Dorian week 3"],
      "the names survive the round trip");
    // an emptied field falls back to the default for the next entry
    els.title.value = ""; els.title.dispatch("input");
    els.pad.value = "filed after emptying the field"; els.pad.dispatch("input");
    els.saveBtn.click();
    assert.equal(s.getDoc().entries[2].heading, host.file.title, "empty falls back to the same default");
  });

  test(`260916 item 3 [${host.name}]: every entry exports on its own, named from its title, speaking in its row`, () => {
    const els = makeEls();
    const names = [];
    const file = { ...host.file, name: (stem) => { names.push(stem); return (stem || "doc") + ".atchart.md"; } };
    const s = createNotepadSurface({ adapter: host.adapter, storage: memStorage(false), els, file });
    els.title.value = "Dorian week 3"; els.title.dispatch("input");
    els.pad.value = "one note, exported alone"; els.pad.dispatch("input");
    els.saveBtn.click();
    const win = els.pad.ownerDocument.defaultView;
    const row = els.list.childNodes[0];
    let xb = null, emsg = null;
    (function walk(n) { if (n.attributes && n.attributes["data-cap"] === "entry-export") xb = n;
      if (n.className === "emsg") emsg = n; (n.childNodes || []).forEach(walk); })(row);
    assert.ok(xb && emsg, "the row carries an Export control and its own message slot");
    xb.click();
    assert.equal(names.at(-1), "Dorian week 3", "the filename derives from the ENTRY's name through the host's one rule");
    assert.equal(win.downloads.length, 1, "one file was written");
    assert.equal(win.downloads[0].download, "Dorian week 3.atchart.md");
    const written = win.downloads[0].text;
    assert.ok(written.includes("one note, exported alone") && written.includes("### Dorian week 3"),
      "the file holds that entry, under its name");
    assert.ok(!written.includes("## Notes\n\n### " + host.file.title), "…and no other");
    assert.equal(emsg.textContent, "exported Dorian week 3.atchart.md — check your downloads",
      "success speaks IN THE ROW and names the file");
    assert.equal(els.msg.textContent, "", "…not up at the pad");
    // the whole-document Export still names the document, not the entry
    els.exportBtn = null;
    // the refusal names its reason in the row too: a note holding a chart block
    s.setDoc({ pad: "", title: "t", entries: [{ id: "c", savedAt: "2026-09-01T10:00:00.000Z",
      heading: "chart note", text: "```chart\n| Dm7 G7 |\n```",
      payload: { app: host.adapter.app, v: 1, data: {} } }] });
    const row2 = els.list.childNodes[0];
    xb = null; emsg = null;
    (function walk(n) { if (n.attributes && n.attributes["data-cap"] === "entry-export") xb = n;
      if (n.className === "emsg") emsg = n; (n.childNodes || []).forEach(walk); })(row2);
    xb.click();
    assert.equal(win.downloads.length, 1, "a refused export writes nothing");
    assert.match(emsg.textContent, /a saved note holds a ```chart block/, "the refusal names its reason, in the row");
  });
}

// ---- 260917, item 0 — the title has a lifecycle; and 6c, dirty not merely non-empty ----

for (const host of HOSTS) {
  test(`260917 item 0 [${host.name}]: THE TITLE DESCRIBES WHAT IS IN THE PAD — the three transitions`, () => {
    const els = makeEls();
    const s = createNotepadSurface({ adapter: host.adapter, storage: memStorage(false), els, file: host.file });
    const btn = (row, cap) => { let b = null; (function walk(n) {
      if (n.attributes && n.attributes["data-cap"] === cap) b = n;
      (n.childNodes || []).forEach(walk); })(row); return b; };
    // file two entries: one named, one under the default
    els.title.value = "Dorian week 3"; els.title.dispatch("input");
    els.pad.value = "the dorian note"; els.pad.dispatch("input");
    els.saveBtn.click();
    // 0c: SAVE EMPTIES THE PAD AND RESETS THE TITLE — the next note cannot
    // inherit the last one's name (a stale title silently misfiles)
    assert.equal(els.pad.value, "");
    assert.equal(els.title.value, host.file.title, "on save the title returns to the dated default");
    assert.equal(s.getDoc().title, "", "…and the model's title is empty again");
    els.pad.value = "a second note, under the default"; els.pad.dispatch("input");
    els.saveBtn.click();
    assert.equal(s.getDoc().entries[1].heading, host.file.title, "the second note filed under the DEFAULT, not 'Dorian week 3'");
    // 0a: RESTORE FILLS THE TITLE with that entry's name — the other half of the round trip
    const rows = els.list.childNodes;                       // newest first: [default-named, Dorian]
    btn(rows[1], "apply").click();
    assert.equal(els.pad.value, "the dorian note");
    assert.equal(els.title.value, "Dorian week 3", "restore brings the entry's name into the title");
    assert.equal(s.getDoc().title, "Dorian week 3", "…and the model agrees (a reload keeps it)");
    // settled for free: restore → edit → save files under the restored name, THEN resets
    els.pad.value = "the dorian note, continued"; els.pad.dispatch("input");
    els.saveBtn.click();
    assert.equal(s.getDoc().entries.at(-1).heading, "Dorian week 3", "the edit files as a continuation of the note it came from");
    assert.equal(els.title.value, host.file.title, "…and then the title resets");
    // an entry filed before names existed: the DEFAULT, never an empty field
    s.setDoc({ pad: "", title: "", entries: [{ id: "old", savedAt: "2026-09-01T10:00:00.000Z",
      heading: null, text: "a pre-v0.4.1 note", payload: { app: host.adapter.app, v: 1, data: {} } }] });
    btn(els.list.childNodes[0], "apply").click();
    assert.equal(els.pad.value, "a pre-v0.4.1 note");
    assert.equal(els.title.value, host.file.title, "a heading-less entry paints the dated default");
    assert.equal(s.getDoc().title, "", "…and persists nothing for it");
  });

  test(`260917 6c [${host.name}]: DIRTY, not non-empty — a restored note is not unsaved work`, () => {
    const st = memStorage(false);
    const els = makeEls();
    const applied = [];
    const s = createNotepadSurface({ adapter: { ...host.adapter, apply: (d) => applied.push(d) },
      storage: st, els, file: host.file });
    const btn = (row, cap) => { let b = null; (function walk(n) {
      if (n.attributes && n.attributes["data-cap"] === cap) b = n;
      (n.childNodes || []).forEach(walk); })(row); return b; };
    els.pad.value = "first"; els.pad.dispatch("input"); els.saveBtn.click();
    els.pad.value = "second"; els.pad.dispatch("input"); els.saveBtn.click();
    const rows = () => els.list.childNodes;                 // newest first: [second, first]
    // a just-restored note is CLEAN: Restore of another entry does not ask…
    btn(rows()[0], "apply").click();
    assert.equal(els.pad.value, "second");
    btn(rows()[1], "apply").click();
    assert.equal(btn(rows()[1], "restore-confirm"), null, "restoring over a clean restored note asks nothing");
    assert.equal(els.pad.value, "first", "…it simply restores");
    assert.equal(applied.length, 2);
    // …and Clear does not ask either — the shipped behaviour that changed (register 30)
    els.clearBtn.click();
    assert.equal(els.confirmRoot.style.display, "none", "Clear over a clean restored note asks nothing");
    assert.equal(els.pad.value, "", "…it clears");
    // an EDIT makes it dirty again: both guards return
    btn(rows()[0], "apply").click();
    els.pad.value = "second, edited"; els.pad.dispatch("input");
    btn(rows()[1], "apply").click();
    assert.ok(btn(rows()[1], "restore-confirm"), "edited text asks");
    btn(rows()[1], "confirm-cancel").click();
    els.clearBtn.click();
    assert.equal(els.confirmRoot.style.display, "flex", "…and so does Clear");
    els.confirmCancel.click();
    // typing the restored text back makes it clean again: dirty is a comparison, not a flag set by keystrokes
    els.pad.value = "second"; els.pad.dispatch("input");
    els.clearBtn.click();
    assert.equal(els.confirmRoot.style.display, "none", "text equal to the base is clean, however it got there");
    // THE BASE IS STORED, so cleanliness survives a reload: a restored note
    // reloaded is still clean (Clear asks nothing), while typed text with no
    // base is still dirty (Clear asks). Both halves, or the store is not
    // carrying the base — this is the pin a base-less load fails.
    const raw = JSON.parse(st.peek());
    const clean = memStorage(false);
    clean.save(JSON.stringify({ ...raw, pad: "a restored note", base: "a restored note" }));
    const elsC = makeEls();
    createNotepadSurface({ adapter: host.adapter, storage: clean, els: elsC, file: host.file });
    assert.equal(elsC.pad.value, "a restored note");
    elsC.clearBtn.click();
    assert.equal(elsC.confirmRoot.style.display, "none", "a restored note is still CLEAN after a reload — the base came back with it");
    const dirtyStore = memStorage(false);
    dirtyStore.save(JSON.stringify({ ...raw, pad: "typed before a reload", base: "" }));
    const elsD = makeEls();
    createNotepadSurface({ adapter: host.adapter, storage: dirtyStore, els: elsD, file: host.file });
    elsD.clearBtn.click();
    assert.equal(elsD.confirmRoot.style.display, "flex", "typed-but-unsaved text is still dirty after a reload");
    void s;
  });
}
