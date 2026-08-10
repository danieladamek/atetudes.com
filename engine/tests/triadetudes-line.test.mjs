/* triadetudes-line.test.mjs — v0.7 first slice: Line placement goes live.
 *
 * The item's eight-chord table is the ASSERTION CORPUS, not documentation:
 * Daniel's exact configuration — C major, set E-B-G, pivots B-string 5/6/8
 * (E4 F4 G4), cycling 4ths from I — with both columns pinned: Grip (must not
 * move a note through the representation change) and Line (the §6.1.2 rule's
 * output, including Daniel's stated expectation on the C chord).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";

// [chord, grip as s/f pairs, line as s/f pairs] — the item's table verbatim
const TABLE = [
  ["C",  [[3,5],[2,5],[1,3]], [[3,5],[2,5],[2,8]]],   // moves — Daniel's expectation
  ["F",  [[3,5],[2,6],[1,5]], [[3,5],[2,6],[1,5]]],
  ["B°", [[3,7],[2,6],[1,7]], [[3,7],[2,6],[1,7]]],
  ["Em", [[3,9],[2,8],[1,7]], [[2,5],[2,8],[1,7]]],   // moves
  ["Am", [[3,5],[2,5],[1,5]], [[3,5],[2,5],[1,5]]],
  ["Dm", [[3,7],[2,6],[1,5]], [[3,7],[2,6],[1,5]]],
  ["G",  [[3,7],[2,8],[1,7]], [[3,7],[2,8],[1,7]]],
  ["C",  [[3,9],[2,8],[1,8]], [[3,5],[2,5],[2,8]]],   // moves — line is stateless
];

function danielConfig(e) {
  e.st.key = "C"; e.st.scaleType = "major"; e.st.set = [1, 2, 3];
  e.st.prog = "cycle4"; e.st.startDeg = 0; e.st.harmonyMode = "build";
  e.st.pivotString = 2; e.st.pivotFrets = [5, 6, 8]; // E4 F4 G4
}
const pairs = (v) =>
  unwrap(v.notes).map((n) => [n.string, n.fret])
    .sort((a, b) => b[0] - a[0] || a[1] - b[1]); // low string first, as the table reads

test("the eight-chord table: Grip column pinned — the note list moved nothing", () => {
  const e = loadTriadetudesEngine();
  danielConfig(e);
  e.st.placement = "grip";
  const voic = e.chooseVoicings(e.buildSequence());
  TABLE.forEach(([name, grip], i) => {
    assert.deepEqual(pairs(voic[i]), grip, `${name}: grip placement`);
  });
});

test("the eight-chord table: Line column — the §6.1.2 rule reaches Daniel's placement", () => {
  const e = loadTriadetudesEngine();
  danielConfig(e);
  e.st.placement = "line";
  const seq = e.buildSequence();
  const voic = e.chooseVoicings(seq);
  TABLE.forEach(([name, grip, line], i) => {
    assert.deepEqual(pairs(voic[i]), line, `${name}: line placement`);
  });
  // Daniel's stated expectation, called out: the C chord's fifth sits at B-string 8
  assert.ok(pairs(voic[0]).some(([s, f]) => s === 2 && f === 8),
    "C: the G sits at B-string fret 8, beside the E at fret 5");
});

test("differing rows: same pitches where the progression stands, same pcs always", () => {
  // The item's "pitches unchanged" holds exactly for the mid-progression moves
  // (rows 1 and 4): C keeps C4-E4-G4, Em keeps E4-G4-B4 — only the location
  // moves. Row 8 is the stateless return: grip had drifted to E4-G4-C5 by
  // positional continuity; line, having no continuity, re-places the same
  // CHORD at C4-E4-G4 — identical to row 1, per the table. Pitch classes are
  // identical in every row; exact pitches in every row but the drifted one.
  const e = loadTriadetudesEngine();
  danielConfig(e);
  e.st.placement = "grip";
  const grip = e.chooseVoicings(e.buildSequence()).map((v) =>
    unwrap(v.notes).map((n) => n.midi).sort((a, b) => a - b));
  e.st.placement = "line";
  const line = e.chooseVoicings(e.buildSequence()).map((v) =>
    unwrap(v.notes).map((n) => n.midi).sort((a, b) => a - b));
  e.st.placement = "grip";
  grip.forEach((g, i) => {
    assert.deepEqual(line[i].map((m) => m % 12).sort(), g.map((m) => m % 12).sort(),
      `chord ${i}: same pitch classes`);
    if (i < 7) assert.deepEqual(line[i], g, `chord ${i}: same sounding pitches`);
  });
  assert.deepEqual(line[7], line[0], "the stateless line lands the last C exactly on the first");
});

test("line invariants: window tones taken in the window, at most three per string", () => {
  const e = loadTriadetudesEngine();
  for (const key of ["C", "Gb", "B", "Eb"])
    for (const set of [[1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 6]])
      for (const prog of ["cycle4", "cycle6", "scaleUp"]) {
        e.st.key = key; e.st.scaleType = "major"; e.st.set = set; e.st.prog = prog;
        e.defaultPivots();
        e.st.placement = "line";
        const seq = e.buildSequence();
        const voic = e.chooseVoicings(seq);
        const windowMidis = unwrap(e.st.pivotFrets).map((f) => e.OPEN[e.st.pivotString] + f);
        voic.forEach((v, i) => {
          const notes = unwrap(v.notes);
          assert.equal(notes.length, 3, `${key} ${set} ${prog} chord ${i}: three tones`);
          const perString = {};
          for (const n of notes) {
            perString[n.string] = (perString[n.string] || 0) + 1;
            assert.ok(set.includes(n.string), "note on the set");
            assert.equal(n.midi, e.OPEN[n.string] + n.fret, "midi honest");
          }
          assert.ok(Object.values(perString).every((c) => c <= 3), "at most three per string");
          // every chord tone whose pc lives in the window is taken THERE
          const pcs = unwrap(e.triadPcs(seq[i].rootPc, seq[i].q));
          for (const pc of pcs) {
            const w = windowMidis.find((m) => m % 12 === pc);
            if (w) assert.ok(notes.some((n) => n.midi === w &&
              n.string === e.st.pivotString),
              `${key} ${set} ${prog} chord ${i}: window tone pc ${pc} taken in the window`);
          }
        });
        e.st.placement = "grip";
      }
});

test("line voicings realize their chord's pitch classes exactly", () => {
  const e = loadTriadetudesEngine();
  danielConfig(e);
  e.st.placement = "line";
  const seq = e.buildSequence();
  e.chooseVoicings(seq).forEach((v, i) => {
    const got = new Set(unwrap(v.notes).map((n) => n.midi % 12));
    const want = new Set(unwrap(e.triadPcs(seq[i].rootPc, seq[i].q)));
    assert.deepEqual([...got].sort(), [...want].sort(), `chord ${i}`);
  });
  e.st.placement = "grip";
});

test("the box tightens on the first C: 5–8, not 3–8", () => {
  const e = loadTriadetudesEngine();
  danielConfig(e);
  e.st.placement = "line";
  const v = e.chooseVoicings(e.buildSequence())[0];
  const frets = unwrap(v.notes).map((n) => n.fret);
  assert.equal(Math.min(...frets), 5);
  assert.equal(Math.max(...frets), 8);
  e.st.placement = "grip";
});
