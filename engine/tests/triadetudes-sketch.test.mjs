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

test("promotion to target is the same predicate as typing: chord tones only (v0.7.6)", () => {
  const e = loadTriadetudesEngine();
  // the one predicate, callable with a midi (mod12 inside)
  assert.equal(e.MOTION.classify(61, [0, 4, 7]).role, "approach",
    "Db can never be a target on C — no hand-promotion escape hatch");
  assert.deepEqual(unwrap(e.MOTION.classify(64, [0, 4, 7])),
    { role: "target", degText: "3" });
  // and the grammar's own resolve refuses the non-chord-tone target, teaching
  const fig = e.MOTION.parse("[b2]", "tones");
  assert.throws(() => e.MOTION.resolve(fig, {
    chordPcs: [0, 4, 7], rootPc: 0, chordLabel: "C",
    voicing: { notes: [{ midi: 60, string: 3, fret: 5, slot: 0 },
      { midi: 64, string: 2, fret: 5, slot: 1 }, { midi: 67, string: 1, fret: 3, slot: 2 }] },
    scalePcs: [0, 2, 4, 5, 7, 9, 11], tonicPc: 0,
    open: { 1: 64, 2: 59, 3: 55 }, nfrets: 15, set: [1, 2, 3], setLowHigh: [3, 2, 1] }),
    (er) => er.teach === true && /not a chord tone of C/.test(er.message));
});

test("parse(emit(buffer)) ≡ the buffer's degrees and approach relationships", () => {
  const e = loadTriadetudesEngine();
  // the spec's enclosure, clicked: enclosure of the root, the third plain,
  // the fifth approached from F below. B, D and F are all adjacent scale
  // tones, so the v0.7.5 precedence (scale-adjacency FIRST) writes the
  // invariant forms — the figure follows a key or scale change
  const buffer = [
    { midi: 59, role: "approach", degText: null },   // B, the scale tone under C
    { midi: 62, role: "approach", degText: null },   // D, the scale tone over C
    { midi: 60, role: "target", degText: "1" },
    { midi: 64, role: "target", degText: "3" },
    { midi: 65, role: "approach", degText: null },   // F, the scale tone under G
    { midi: 67, role: "target", degText: "5" },
  ];
  const r = unwrap(e.MOTION.emitFromClicks(buffer, CMAJ_CTX));
  assert.ok(!r.error, r.error);
  assert.equal(r.src, "(-s,+s)[1] - [3] - (-s)[5]");
  assert.match(r.discarded, /octave and placement dropped/);
  const p = e.MOTION.parse(r.src, "tones");
  assert.ok(!p.error);
  const figs = unwrap(p.figures);
  // degrees survive
  assert.deepEqual(figs.map((f) => [f.target.deg, f.target.acc]), [[1, 0], [3, 0], [5, 0]]);
  // relationships survive, in the invariant form (v0.7.5)
  assert.deepEqual(figs[0].approaches, [{ kind: "scale", delta: -1 }, { kind: "scale", delta: 1 }]);
  assert.deepEqual(figs[2].approaches, [{ kind: "scale", delta: -1 }]);
  // and pitches/octaves do NOT: the same buffer an octave up emits identically
  const up = buffer.map((c) => ({ ...c, midi: c.midi + 12 }));
  assert.equal(unwrap(e.MOTION.emitFromClicks(up, CMAJ_CTX)).src, r.src);
});

test("the tap override survives emission: -s ↔ -n round-trips through the buffer (v0.7.5)", () => {
  const e = loadTriadetudesEngine();
  // F under G reads both ways; the form flag picks the coordinate reading
  const buffer = [
    { midi: 65, role: "approach", degText: null, form: "semi" },
    { midi: 67, role: "target", degText: "5" },
  ];
  assert.equal(unwrap(e.MOTION.emitFromClicks(buffer, CMAJ_CTX)).src, "(-2)[5]");
  buffer[0].form = null;   // the default is the invariant
  assert.equal(unwrap(e.MOTION.emitFromClicks(buffer, CMAJ_CTX)).src, "(-s)[5]");
  // approachForms names when the tap is offered: both readings must exist
  assert.deepEqual(unwrap(e.MOTION.approachForms(65, 67, CMAJ_CTX.scalePcs)),
    { scale: true, semi: true });
  assert.deepEqual(unwrap(e.MOTION.approachForms(61, 60, CMAJ_CTX.scalePcs)),
    { scale: false, semi: true }, "a chromatic click has one reading — no tap");
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

// ---- 260812.6: the sketch emits invariants, never coordinates ----
// (the bug item: mode coercion, orphan conscription, the degree fallback)

test("corpus grep: no emitted figure carries an unsigned degree in an approach position", () => {
  const e = loadTriadetudesEngine();
  const scales = [
    [0, 2, 4, 5, 7, 9, 11],        // C major
    [0, 2, 3, 5, 7, 8, 11],        // C harmonic minor (the augmented 2nd)
    [2, 4, 6, 7, 9, 11, 1],        // D major
  ];
  const signed = /^[+-]\d*s?$/;
  let emits = 0, refusals = 0;
  for (const scalePcs of scales)
    for (const targetMidi of [60, 64, 67, 62])
      for (const apMidi of [55, 56, 58, 59, 61, 62, 63, 65, 66, 69, 72]) {
        const r = unwrap(e.MOTION.emitFromClicks([
          { midi: apMidi, role: "approach", degText: null },
          { midi: targetMidi, role: "target", degText: "1" },
        ], { scalePcs, tonicPc: scalePcs[0] }));
        if (r.error) {
          refusals++;
          assert.equal(r.at, 0, "a refusal names which click");
          continue;
        }
        emits++;
        for (const m of r.src.matchAll(/\(([^)]*)\)/g))
          for (const item of m[1].split(","))
            assert.match(item.trim(), signed,
              `"${item}" in "${r.src}" is not a signed relative form — ` +
              "a coordinate leaked into an approach slot");
        const p = unwrap(e.MOTION.parse(r.src, "tones"));
        for (const f of p.figures)
          for (const a of f.approaches)
            assert.notEqual(a.kind, "degree", "structurally: no degree approaches");
      }
  assert.ok(emits > 20 && refusals > 5,
    `the corpus must exercise both outcomes (emits ${emits}, refusals ${refusals})`);
});

test("a key or scale change TRANSLATES every sketch-emitted figure (v0.7.5's property, on sketch output)", () => {
  const e = loadTriadetudesEngine();
  const buffers = [
    [{ midi: 59, role: "approach", degText: null },
     { midi: 62, role: "approach", degText: null },
     { midi: 60, role: "target", degText: "1" }],
    [{ midi: 66, role: "approach", degText: null },
     { midi: 64, role: "target", degText: "3" },
     { midi: 67, role: "target", degText: "5" }],
  ];
  const homes = { scalePcs: [0, 2, 4, 5, 7, 9, 11], tonicPc: 0 };
  for (const buffer of buffers) {
    const r = unwrap(e.MOTION.emitFromClicks(buffer, homes));
    assert.ok(!r.error, r.error);
    const p = e.MOTION.parse(r.src, "tones");
    // the figure must RESOLVE, approaches intact, in foreign keys and scales —
    // a coordinate would refuse or land on the same absolute pitch class
    for (const [rootPc, scalePcs] of [
      [3, [3, 5, 7, 8, 10, 0, 2]],           // Eb major
      [9, [9, 11, 0, 2, 4, 5, 8]],           // A harmonic minor
    ]) {
      const chordPcs = [rootPc, (rootPc + 4) % 12, (rootPc + 7) % 12];
      const open = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 };
      const voicing = { notes: chordPcs.map((pc, i) => {
        const string = 3 - i, base = open[string];
        const fret = ((pc - base) % 12 + 12) % 12;
        return { midi: base + fret, string, fret, slot: i };
      }) };
      const out = unwrap(e.MOTION.resolve(p, { rootPc, chordPcs, scalePcs,
        tonicPc: scalePcs[0], voicing, open, nfrets: 15,
        set: [1, 2, 3], setLowHigh: [3, 2, 1] }));
      assert.ok(!out.error, "translates without refusal: " + JSON.stringify(out.error || ""));
      const approaches = out.filter((x) => x.role === "approach");
      assert.equal(approaches.length,
        p.figures.reduce((a, f) => a + f.approaches.length, 0),
        "every approach survives the move — nothing pinned to the old key");
    }
  }
});
