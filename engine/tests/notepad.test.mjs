/* notepad.test.mjs — the shared notepad model (component v1).
 * The two laws under test: round-trip asserted on BYTES (260811.6's lesson —
 * structural comparison hid injected defaults), and the payload slot's
 * opacity (unknown app, future v, carried whole). Plus: the v1.0 Metronome
 * migration pin, the nastiest fence cases, and the file-parses-in-the-
 * format-engine proof. No DOM, no storage, no browser anywhere here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyDoc, makeEntry, addEntry, editEntry, deleteEntry, reorderEntry,
  fromMetronomeV1, fromTriadetudesV1, toAtchart, fromAtchart } from "../notepad.mjs";
import { parseAtchart, serializeAtchart, readApp } from "../atchart.mjs";
import { readFileSync } from "node:fs";

const strip = (doc) => ({ pad: doc.pad,
  entries: doc.entries.map(({ id, savedAt, heading, text, payload }) =>
    // a payloadless entry has no envelope to carry its id, so the id is
    // content-derived on parse — normalize it out of structural comparison
    ({ id: payload ? id : "(derived)", savedAt, heading, text, payload })) });

function assertRoundTrip(doc, label) {
  const src = toAtchart(doc, { title: "corpus" });
  const back = fromAtchart(src);
  assert.deepEqual(strip(back), strip({ ...doc,
    entries: doc.entries.map((e) => makeEntry(e)) }), label + ": structurally identical");
  // BYTES, not deep-equal: the fixed-point law (260811.6)
  assert.equal(toAtchart(back), src, label + ": toAtchart is a byte-level fixed point");
  return src;
}

// ---- the migration FIRST: Metronome's shipped v1.0 shape is the pin ----

test("v1.0 migration: pad string + [{id,savedAt,text,metro}] load with NO loss", () => {
  const pad = "half-formed idea about displaced accents";
  const log = [
    { id: "173-abc", savedAt: "2026-08-08T09:00:00.000Z", text: "swing it at 92",
      metro: { bpm: 92, meter: 4, clickSub: 2, clickVoice: "wood", clickAccent: true, clickVol: 0.8 } },
    { id: "174-def", savedAt: "2026-08-09T10:30:00.000Z", text: "5/4 tick idea\ntwo lines",
      metro: { bpm: 140, meter: 5, clickSub: 1, clickVoice: "tick", clickAccent: false, clickVol: 0.5 } },
  ];
  const doc = fromMetronomeV1(pad, log);
  assert.equal(doc.pad, pad);
  assert.equal(doc.entries.length, 2);
  log.forEach((en, i) => {
    assert.equal(doc.entries[i].id, en.id, "id survives (merge identity)");
    assert.equal(doc.entries[i].savedAt, en.savedAt);
    assert.equal(doc.entries[i].text, en.text);
    assert.deepEqual(doc.entries[i].payload, { app: "metronome", v: 1, data: en.metro },
      "the config is the opaque payload data — every field carried");
  });
  // and the migrated doc survives the file round trip
  assertRoundTrip(doc, "migrated v1.0 doc");
  // degenerate v1.0 states: empty pad, null log, entry missing fields
  assert.equal(fromMetronomeV1(null, null).entries.length, 0);
  const odd = fromMetronomeV1("", [{ id: "x" }]).entries[0];
  assert.equal(odd.text, "");
  assert.deepEqual(odd.payload, { app: "metronome", v: 1, data: null });
});

// ---- pure ops: new documents, never mutation ----

test("add/edit/delete/reorder are pure and total", () => {
  const d0 = emptyDoc();
  const before = JSON.stringify(d0);
  const d1 = addEntry(d0, { id: "a", text: "one" });
  const d2 = addEntry(d1, { id: "b", text: "two" });
  const d3 = editEntry(d2, "a", { text: "ONE" });
  const d4 = reorderEntry(d3, "b", 0);
  const d5 = deleteEntry(d4, "a");
  assert.equal(JSON.stringify(d0), before, "no input document was mutated");
  assert.equal(d2.entries.length, 2);
  assert.equal(d3.entries[0].text, "ONE");
  assert.equal(d3.entries[0].id, "a", "edit cannot change identity");
  assert.deepEqual(d4.entries.map((e) => e.id), ["b", "a"]);
  assert.deepEqual(d5.entries.map((e) => e.id), ["b"]);
  assert.equal(deleteEntry(d5, "nope").entries.length, 1, "unknown id: no-op, no throw");
  assert.equal(reorderEntry(d5, "nope", 3).entries.length, 1);
});

// ---- the round-trip corpus ----

test("corpus: unknown app id and a payload v above the reader's — carried whole", () => {
  const doc = addEntry(addEntry(emptyDoc(), {
    id: "m1", savedAt: "2026-08-11T09:00:00.000Z", text: "mine",
    payload: { app: "metronome", v: 1, data: { bpm: 72 } } }), {
    id: "f1", savedAt: "2026-08-11T09:05:00.000Z", text: "not mine",
    payload: { app: "some-future-app", v: 99,
      data: { shape: "unknowable", nested: [1, { deep: true }] } } });
  const src = assertRoundTrip(doc, "foreign payloads");
  const back = fromAtchart(src);
  assert.deepEqual(back.entries[1].payload,
    { app: "some-future-app", v: 99, data: { shape: "unknowable", nested: [1, { deep: true }] } },
    "never dropped, never guessed at");
});

test("corpus: awkward prose in the pad — headings, lists, a #-Notes lookalike inside a fence", () => {
  const doc = { ...emptyDoc(),
    pad: "# My big idea\n\nsome *prose* with `code`\n\n```\n## Notes\nthis heading is INSIDE a fence and is prose\n```\n\n- a list\n- of things",
    entries: [makeEntry({ id: "e1", savedAt: "2026-08-11T10:00:00.000Z", text: "note",
      payload: { app: "metronome", v: 1, data: { bpm: 60 } } })] };
  const src = assertRoundTrip(doc, "awkward prose");
  const back = fromAtchart(src);
  assert.ok(back.pad.includes("## Notes\nthis heading is INSIDE a fence"),
    "the fenced lookalike stayed in the pad — the split is fence-aware");
});

test("corpus, the nastiest: an entry whose text contains fenced blocks of its own", () => {
  const doc = addEntry(emptyDoc(), {
    id: "n1", savedAt: "2026-08-11T11:00:00.000Z",
    text: 'try this lick\n\n```js\nlet x = "| Dm7 G7 | Cmaj7 |";\n```\n\nand this json that is NOT an envelope\n\n```json\n{"bpm": 999}\n```\n\ndone',
    payload: { app: "metronome", v: 1, data: { bpm: 132 } } });
  const src = assertRoundTrip(doc, "entry with own fences");
  const back = fromAtchart(src);
  assert.ok(back.entries[0].text.includes('```js\nlet x = "| Dm7 G7 | Cmaj7 |";\n```'),
    "the user's fence stays in the text, byte-intact");
  assert.ok(back.entries[0].text.includes('{"bpm": 999}'),
    "a json fence without the envelope shape is prose, not a payload");
  assert.equal(back.entries[0].payload.data.bpm, 132,
    "the real envelope (end-anchored) still found");
});

test("a ```chart fence in a NOTE is refused by name — the format holds one chart per file", () => {
  // emitting it would produce a file the format itself refuses ("multiple
  // chart blocks are reserved for v2") — the write refuses instead, content
  // stays in the model, and the message steers to the chart block
  const doc = addEntry(emptyDoc(), { id: "c1", savedAt: "2026-08-11T11:30:00.000Z",
    text: "a chart in prose\n```chart\n| Dm7 |\n```", payload: null });
  assert.throws(() => toAtchart(doc), /one chart per file/);
});

// ---- the chart LIFT (child 3, tier 3): the pad's single fence IS the chart ----

test("the lift: a chart fence in the pad becomes the FILE's chart block, positioned where typed", () => {
  const doc = { ...emptyDoc(),
    pad: "warming up\n\n```chart\n| Dm7 G7 | Cmaj7 |\n```\n\nfour choruses" };
  const src = toAtchart(doc);
  const at = parseAtchart(src);
  assert.equal(at.sections.length, 1, "the fence was lifted into sections");
  assert.equal(at.sections[0].bars.length, 2);
  assert.equal((src.match(/```chart/g) || []).length, 1, "exactly one chart in the file");
  const back = fromAtchart(src);
  assert.ok(back.pad.startsWith("warming up"), "prose above the fence stays above");
  assert.ok(back.pad.includes("```chart\n| Dm7 G7 | Cmaj7 |\n```"),
    "the fence renders back into the pad, engine-canonical");
  assert.ok(back.pad.endsWith("four choruses"), "prose below stays below");
  assert.equal(toAtchart(back), src, "and the write is a byte fixed-point");
});

test("the lift, gated: two fences, an unclosed opener, or a file already carrying a chart refuse by name", () => {
  assert.throws(() => toAtchart({ ...emptyDoc(),
    pad: "```chart\n| C |\n```\n\n```chart\n| F |\n```" }), /one chart per file/);
  assert.throws(() => toAtchart({ ...emptyDoc(),
    pad: "```chart\n| C |\nstill typing" }), /cannot be written/);
  const carrying = fromAtchart(
    "---\natchart: 1\n---\n```chart\n| Fmaj7 |\n```\n\nexisting file\n");
  carrying.pad += "\n\n```chart\n| C |\n```";
  assert.throws(() => toAtchart(carrying), /already carries a chart/);
});

test("the lift, back-compat: a file whose chart sits at the top (the classic layout) is untouched by the rule", () => {
  const src = "---\natchart: 1\n---\n```chart\n| Gm7 C7 | Fmaj7 |\n```\n\nnotes here\n";
  const back = fromAtchart(src);
  assert.ok(!back.pad.includes("```chart"),
    "a top-of-file chart is file-level, not pad content");
  assert.equal(back.pad, "notes here");
  assert.equal(toAtchart(back), src, "byte fixed-point preserved");
});

test("corpus: an UNCLOSED fence in entry text cannot swallow the payload (the markdown rule, here)", () => {
  const doc = addEntry(emptyDoc(), {
    id: "u1", savedAt: "2026-08-11T12:00:00.000Z",
    text: "I started a fence and never closed it:\n```\nstill typing",
    payload: { app: "metronome", v: 1, data: { bpm: 100 } } });
  const src = toAtchart(doc);
  const back = fromAtchart(src);
  assert.equal(back.entries[0].payload.data.bpm, 100,
    "the payload survived the stray opener");
  assert.ok(back.entries[0].text.includes("```\nstill typing") ||
            back.entries[0].text.includes("```"),
    "the stray fence characters stay in the text");
  assert.equal(toAtchart(back), src, "and the file is still a fixed point");
});

test("payloadless entries (foreign ### spans) are carried, never dropped", () => {
  const doc = addEntry(emptyDoc(), { id: "p1", heading: "a bare thought",
    savedAt: null, text: "no settings attached", payload: null });
  assertRoundTrip(doc, "payloadless entry");
});

// ---- the format-engine proof: bytes through engine/atchart.mjs ----

test("a Metronome-written file parses in engine/atchart.mjs: chart support intact, payloads preserved", () => {
  const doc = addEntry({ ...emptyDoc(), pad: "prose" }, {
    id: "m1", savedAt: "2026-08-11T13:00:00.000Z", text: "idea",
    payload: { app: "metronome", v: 1, data: { bpm: 72 } } });
  const src = toAtchart(doc, { title: "Metronome notepad" });
  const at = parseAtchart(src);                       // the FORMAT engine reads it
  assert.equal(serializeAtchart(at), src, "and re-serializes byte-identically");
  assert.equal(at.meta.title, "Metronome notepad");
  assert.ok(Array.isArray(at.sections), "chart-block support intact (empty chart)");
  // hand-add a REAL chart into the file's chart block: the notepad carries it
  const withChart = src.replace("```chart\n\n```", "```chart\n| Dm7 G7 | Cmaj7 |\n```");
  const doc2 = fromAtchart(withChart);
  assert.equal(doc2._at.sections[0].bars.length, 2, "the chart parsed through the engine");
  assert.equal(toAtchart(doc2), withChart, "and replays byte-identically through toAtchart");
  // an apps: frontmatter map written by the v1.1 engine also rides through
  const withApps = withChart.replace("---\n", "---\napps:\n  mystery: {v: 9, x: 1}\n", 1);
  const doc3 = fromAtchart(withApps);
  assert.equal(toAtchart(doc3), withApps, "§2.6/§2.7 content replays verbatim");
  assert.deepEqual(readApp(doc3._at, "mystery"), { v: 9, x: 1 });
});

test("no derived musical data: the module stores exactly what it was handed, nothing computed", () => {
  // structural, not semantic: toAtchart's fence is the payload verbatim —
  // no field the host didn't supply, nothing derived from the payload
  const payload = { app: "metronome", v: 1, data: { bpm: 72, meter: 4 } };
  const doc = addEntry(emptyDoc(), { id: "s1", savedAt: "2026-08-11T14:00:00.000Z",
    text: "t", payload });
  const src = toAtchart(doc);
  const fence = src.match(/```json\n(.*)\n```/);
  assert.deepEqual(JSON.parse(fence[1]),
    { app: "metronome", v: 1, id: "s1", savedAt: "2026-08-11T14:00:00.000Z",
      data: { bpm: 72, meter: 4 } },
    "envelope = app + v + identity + the host's data — no summary, nothing derived");
  assert.ok(!("summary" in JSON.parse(fence[1])), "no stored summary field, ever (260811.3)");
});

// ---- anti-drift: the Metronome host's inlined copies match the modules ----

test("metronome and triadetudes carry atchart, markdown and notepad verbatim (no drift)", () => {
  const here2 = new URL(".", import.meta.url).pathname;
  const inlineForm = (file) =>
    readFileSync(here2 + "../" + file, "utf8")
      .split("\n").filter((l) => !l.startsWith("import ")).join("\n")
      .replace(/^export /gm, "").replace(/^\n+/, "").replace(/\n+$/, "\n");
  const CARRIERS = { metronome: ["chord.mjs", "atchart.mjs", "markdown.mjs",
      "motion.mjs", "notepad.mjs", "structures.mjs", "palette.mjs", "notepad-surface.mjs"],
    triadetudes: ["atchart.mjs", "markdown.mjs", "motion.mjs", "notepad.mjs",
      "structures.mjs", "palette.mjs", "notepad-surface.mjs"] };
  for (const [slug, files] of Object.entries(CARRIERS)) {
    const src = readFileSync(here2 + "../../static/studies/" + slug + "/study.html", "utf8");
    for (const file of files)
      assert.ok(src.includes(inlineForm(file)),
        slug + "/study.html has drifted from engine/" + file + " — re-inline it");
  }
});

// ---- the Triadetudes migration: real entries, the second proving host ----

test("Triadetudes v1 migration: cfg byte-identical, prose intact, duration kept, derived fields dropped", () => {
  const cfg = { v: 1, key: "Eb", scaleType: "harm", set: [1, 2, 3], pivotString: 2,
    pivotFrets: [5, 6, 8], prog: "cycle4", startDeg: 0, chromLen: 6, custom: "",
    arpPattern: null, roots: false, ext: "none", placement: "grip",
    playback: "arpeggiated", motionMode: "tones",
    motionSrc: "(-1,+2)[1] - (+2,-1)[3] - (-s,+s)[5]", harmonyMode: "build",
    breakProg: [{ sym: "Dm7", us: null }], bpm: 96, meter: 4, splitIdx: 0,
    clickOn: true, clickVol: 0.8, clickAccent: true, clickSub: 1,
    clickVoice: "beep", countIn: false };
  const log = [{ id: "e-1", savedAt: "2026-08-11T07:02:00.000Z", minutes: 12,
    title: "Ebm · Cycling 4ths · Eb harmonic minor",   // derived — must drop
    summary: "Eb harm · arp M-L-H · STALE",            // the 260811.3 cache — must drop
    intention: "Some notes", accomplished: "it went fine", cfg }];
  const doc = fromTriadetudesV1(log);
  const e = doc.entries[0];
  assert.equal(e.id, "e-1");
  assert.equal(e.savedAt, "2026-08-11T07:02:00.000Z");
  assert.equal(JSON.stringify(e.payload.data), JSON.stringify(cfg),
    "the rawCfg snapshot is byte-identical — restore rebuilds the same étude");
  assert.equal(e.payload.app, "triadetudes");
  assert.equal(e.text, "→ Some notes\n\n✓ it went fine\n\n~12 min",
    "both prose fields and the duration survive, marked");
  assert.ok(!JSON.stringify(e).includes("STALE"), "the stored summary is DROPPED");
  assert.ok(!JSON.stringify(e).includes("title"), "no derived title field");
  // the migrated doc survives the file round trip like any other
  assertRoundTrip(doc, "migrated triadetudes log");
  // degenerate entries: no prose, no minutes, missing cfg
  const bare = fromTriadetudesV1([{ id: "x", savedAt: null }]).entries[0];
  assert.equal(bare.text, "");
  assert.deepEqual(bare.payload, { app: "triadetudes", v: 1, data: null });
});
