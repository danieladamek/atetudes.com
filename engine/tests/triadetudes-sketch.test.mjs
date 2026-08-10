/* triadetudes-sketch.test.mjs — v0.7.4: the echo staff becomes the way into
 * the grammar. The item's central law: parse(emit(buffer)) round-trips the
 * buffer's DEGREES AND APPROACH RELATIONSHIPS — never its pitches or frets
 * (emission is lossy by design; a figure is a design, not a fingering).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";

const CMAJ_CTX = { scalePcs: [0, 2, 4, 5, 7, 9, 11], tonicPc: 0 };

test("classification derives by named rule: chord-tone pc → target with its degree", () => {
  const e = loadTriadetudesEngine();
  const ch = { rootPc: 0, q: "maj" };            // C major triad: pcs 0 4 7
  assert.deepEqual(unwrap(e.classifyClick(60, ch)), { role: "target", degText: "1" });
  assert.deepEqual(unwrap(e.classifyClick(76, ch)), { role: "target", degText: "3" });
  assert.deepEqual(unwrap(e.classifyClick(55, ch)), { role: "target", degText: "5" });
  assert.deepEqual(unwrap(e.classifyClick(59, ch)), { role: "approach", degText: null });
  const dm = { rootPc: 2, q: "min" };            // D minor: pcs 2 5 9
  assert.deepEqual(unwrap(e.classifyClick(65, dm)), { role: "target", degText: "3" });
  assert.deepEqual(unwrap(e.classifyClick(64, dm)), { role: "approach", degText: null });
  // no chord context: nothing is a target — the rule refuses to guess
  assert.equal(e.classifyClick(60, null).role, "approach");
});

test("the promoted-target rule names the degree against the click-time chord root", () => {
  const e = loadTriadetudesEngine();
  assert.equal(e.degTextFor(61, 0), "b2");       // Db over C
  assert.equal(e.degTextFor(70, 0), "b7");       // Bb over C
  assert.equal(e.degTextFor(60, 2), "b7");       // C over D — the OTHER root, not the key
  assert.equal(e.degTextFor(66, 2), "3");        // F# over D
});

test("parse(emit(buffer)) ≡ the buffer's degrees and approach relationships", () => {
  const e = loadTriadetudesEngine();
  // the spec's enclosure, clicked: enclosure of the root, the third plain,
  // the fifth approached from F below — 2 semitones, so the emitter's named
  // precedence (semitone form when |d| ≤ 2) writes (-2), never -s
  const buffer = [
    { midi: 59, role: "approach", degText: null },   // B, −1 under C
    { midi: 62, role: "approach", degText: null },   // D, +2 over C
    { midi: 60, role: "target", degText: "1" },
    { midi: 64, role: "target", degText: "3" },
    { midi: 65, role: "approach", degText: null },   // F, −2 under G
    { midi: 67, role: "target", degText: "5" },
  ];
  const r = unwrap(e.MOTION.emitFromClicks(buffer, CMAJ_CTX));
  assert.ok(!r.error, r.error);
  assert.equal(r.src, "(-1,+2)[1] - [3] - (-2)[5]");
  assert.match(r.discarded, /octave and placement dropped/);
  const p = e.MOTION.parse(r.src, "tones");
  assert.ok(!p.error);
  const figs = unwrap(p.figures);
  // degrees survive
  assert.deepEqual(figs.map((f) => [f.target.deg, f.target.acc]), [[1, 0], [3, 0], [5, 0]]);
  // relationships survive: signed semitone distances and the scale step
  assert.deepEqual(figs[0].approaches, [{ kind: "semi", delta: -1 }, { kind: "semi", delta: 2 }]);
  assert.deepEqual(figs[2].approaches, [{ kind: "semi", delta: -2 }]);
  // and pitches/octaves do NOT: the same buffer an octave up emits identically
  const up = buffer.map((c) => ({ ...c, midi: c.midi + 12 }));
  assert.equal(unwrap(e.MOTION.emitFromClicks(up, CMAJ_CTX)).src, r.src);
});

test("a hand-promoted chromatic target round-trips as its absolute chord degree", () => {
  const e = loadTriadetudesEngine();
  const buffer = [
    { midi: 60, role: "target", degText: "1" },
    { midi: 61, role: "target", degText: e.degTextFor(61, 0) },  // Db promoted by tap
  ];
  const r = unwrap(e.MOTION.emitFromClicks(buffer, CMAJ_CTX));
  assert.ok(!r.error, r.error);
  assert.equal(r.src, "[1] - [b2]");
  const p = e.MOTION.parse(r.src, "tones");
  assert.deepEqual(unwrap(p.figures).map((f) => [f.target.deg, f.target.acc]),
    [[1, 0], [2, -1]]);
});

test("a trailing approach is an error stated plainly, never silently dropped", () => {
  const e = loadTriadetudesEngine();
  const r = unwrap(e.MOTION.emitFromClicks([
    { midi: 60, role: "target", degText: "1" },
    { midi: 66, role: "approach", degText: null },
  ], CMAJ_CTX));
  assert.match(r.error, /trailing approach/);
  assert.match(r.error, /click a chord tone last/);
  // and the empty sketch refuses by name too
  assert.match(unwrap(e.MOTION.emitFromClicks([], CMAJ_CTX)).error, /sketch is empty/);
});

test("a sketch over the event ceiling refuses by name at emit, before the field", () => {
  const e = loadTriadetudesEngine();
  const clicks = [];
  for (let i = 0; i < 9; i++) {
    clicks.push({ midi: 59, role: "approach", degText: null });
    clicks.push({ midi: 60, role: "target", degText: "1" });
  }
  const r = unwrap(e.MOTION.emitFromClicks(clicks, CMAJ_CTX));
  assert.match(r.error, /ceiling/);
});

test("the emitted string is a real figure: it resolves to events against the étude", () => {
  const e = loadTriadetudesEngine();
  const buffer = [
    { midi: 59, role: "approach", degText: null },
    { midi: 62, role: "approach", degText: null },
    { midi: 60, role: "target", degText: "1" },
    { midi: 64, role: "target", degText: "3" },
    { midi: 67, role: "target", degText: "5" },
  ];
  const r = unwrap(e.MOTION.emitFromClicks(buffer, CMAJ_CTX));
  e.st.motionMode = "tones"; e.st.motionSrc = r.src;
  const seq = e.buildSequence();
  const voic = e.chooseVoicings(seq);
  const entries = unwrap(e.orderedEntries(voic[0], seq[0]));
  assert.equal(entries.length, 5);
  assert.deepEqual(entries.map((x) => x.role),
    ["approach", "approach", "chord", "chord", "chord"]);
  assert.equal(entries[0].midi, entries[2].midi - 1);
  assert.equal(entries[1].midi, entries[2].midi + 2);
  e.st.motionSrc = null; e.st.motionMode = "shape";
});
