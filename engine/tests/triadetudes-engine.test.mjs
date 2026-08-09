/* triadetudes-engine.test.mjs — characterization of the SHIPPED Triadetudes engine.
 *
 * Purpose: pin current behaviour before Phase B extracts these functions into the
 * chart hub (family note §5). The extracted engine must reproduce every value here
 * exactly. These tests never modify the study file.
 *
 * Three layers:
 *   1. the study's own in-page self-tests, promoted from console.error to CI
 *   2. golden-master snapshots of chooseVoicings on three real configs
 *      (values GENERATED from the shipped engine on 2026-08-08, then frozen)
 *   3. invariants across the whole config space (every key × progression)
 *   4. cross-check: the shipped triad engine vs the new shared chord parser
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";
import { parseChord } from "../chord.mjs";

// fresh engine per test — st is module state in the study; isolation matters
const fresh = () => loadTriadetudesEngine();

// ---- layer 1: the in-page self-tests, now enforced ----

test("scales spell correctly (study self-test, promoted)", () => {
  const e = fresh();
  assert.equal(e.buildScale("C", "major").map((n) => n.name).join(" "), "C D E F G A B");
  assert.equal(e.buildScale("A", "harm").map((n) => n.name).join(" "), "A B C D E F G#");
  assert.equal(e.buildScale("A", "mel").map((n) => n.name).join(" "), "A B C D E F# G#");
  assert.deepEqual(unwrap(e.triadPcs(0, "aug")), [0, 4, 8]);
});

test("every meter split sums to its meter (study self-test, promoted)", () => {
  const e = fresh();
  for (const m in e.SPLITS)
    for (const p of e.SPLITS[m])
      assert.equal(p.reduce((a, b) => a + b, 0), +m, `split ${p} of ${m}`);
});

test("cyclic progressions return home in 8 (study self-test, promoted)", () => {
  const e = fresh();
  for (const prog of ["cycle4", "cycle6", "cycle3", "scaleUp", "scaleDown"]) {
    e.st.prog = prog;
    const seq = e.buildSequence();
    assert.equal(seq.length, 8, `${prog} length`);
    assert.equal(seq[0].rootPc, seq[7].rootPc, `${prog} returns home`);
  }
});

test("arp parsing (study self-test, promoted)", () => {
  const e = fresh();
  assert.deepEqual(unwrap(e.parseArp("2-3-3-1").pattern), [2, 3, 3, 1]);
  assert.deepEqual(unwrap(e.parseArp("2331").pattern), [2, 3, 3, 1]);
  assert.equal(e.parseArp("").pattern, null, "empty = block chord");
  assert.ok(e.parseArp("2-4").err, "string 4 rejected for set 1-2-3");
});

test("subdivision naming (study self-test, promoted)", () => {
  const e = fresh();
  assert.equal(e.subdivisionName(2, 4), "8ths");
  assert.equal(e.subdivisionName(4, 4), "quarters");
  assert.equal(e.subdivisionName(2, 3), "quarter-note triplet (3 over 2 beats)");
  assert.equal(e.subdivisionName(4, 3), "half-note triplet (3 over 4 beats)");
  assert.equal(e.subdivisionName(4, 5), "quarter-note 5-tuplet (5 over 4 beats)");
  assert.equal(e.subdivisionName(2, 8), "16ths");
  assert.equal(e.writtenValue(4 / 3), 2);
  assert.equal(e.writtenValue(2 / 3), 1);
});

// ---- layer 2: golden masters (generated from the shipped engine, frozen) ----

test("golden: default config — C major cycle4, set 1-2-3, pivots 1-3-5 on string 2", () => {
  const e = fresh();
  const voic = e.chooseVoicings(e.buildSequence());
  assert.deepEqual(
    unwrap(voic.map((v) => v.frets)),
    [[5,5,3],[5,6,5],[4,3,1],[4,5,3],[5,5,5],[7,6,5],[4,3,3],[5,5,3]]
  );
});

test("golden: Eb harmonic minor cycle6 on set 3-4-5", () => {
  const e = fresh();
  e.st.key = "Eb"; e.st.scaleType = "harm"; e.st.set = [3, 4, 5];
  e.defaultPivots();
  assert.equal(e.st.pivotString, 4);
  assert.deepEqual(unwrap(e.st.pivotFrets), [1, 3, 4]);
  e.st.prog = "cycle6";
  const seq = e.buildSequence();
  assert.deepEqual(unwrap(seq.map((c) => c.label)),
    ["Ebm","Cb","Abm","F°","D°","Bb","Gb+","Ebm"],
    "spelling: Cb not B, Gb+ not F#+ — flat-side discipline");
  assert.deepEqual(unwrap(e.chooseVoicings(seq).map((v) => v.frets)),
    [[6,4,3],[6,4,4],[2,1,1],[2,3,1],[5,3,1],[5,3,3],[5,4,3],[6,4,3]]);
});

test("golden: custom roman progression in A major", () => {
  const e = fresh();
  e.st.key = "A"; e.st.set = [2, 3, 4]; e.defaultPivots();
  e.st.prog = "custom"; e.st.custom = "ii V I vi";
  assert.deepEqual(unwrap(e.buildSequence().map((c) => [c.label, c.roman])),
    [["Bm","ii"],["E","V"],["A","I"],["F#m","vi"]]);
});

test("golden: third-below bass turns the C major cycle into the diatonic sevenths", () => {
  // the break-down thesis, running in the shipped engine already:
  // triad + bass a third below = the rootless-seventh identity
  const e = fresh();
  e.st.ext = "third";
  const names = e.buildSequence().map((ch) => e.tetradName(e.bassPcFor(ch), ch));
  assert.deepEqual(unwrap(names), ["Am7","Dm7","G7","Cmaj7","Fmaj7","Bm7b5","Em7","Am7"]);
});

// ---- layer 3: invariants across the config space ----

test("invariant: a voicing exists for every chord, every key × scale × progression", () => {
  const e = fresh();
  for (const key of e.KEYS)
    for (const scaleType of ["major", "harm", "mel"])
      for (const prog of ["cycle4", "cycle6", "cycle3", "scaleUp", "scaleDown"]) {
        e.st.key = key; e.st.scaleType = scaleType; e.st.prog = prog;
        e.defaultPivots();
        const voic = e.chooseVoicings(e.buildSequence());
        voic.forEach((v, i) =>
          assert.ok(v, `${key} ${scaleType} ${prog}: chord ${i} has no voicing`));
      }
});

test("invariant: every chosen voicing is ascending in pitch and inside the neck", () => {
  const e = fresh();
  for (const key of e.KEYS) {
    e.st.key = key; e.defaultPivots();
    const s = e.st.setLowHigh;
    for (const v of e.chooseVoicings(e.buildSequence())) {
      const midis = v.frets.map((f, i) => e.OPEN[s[i]] + f);
      assert.ok(midis[0] < midis[1] && midis[1] < midis[2], `${key}: ascending`);
      v.frets.forEach((f) =>
        assert.ok(f >= 0 && f <= e.NFRETS + 2, `${key}: fret ${f} in range`));
    }
  }
});

test("invariant: voicings realize their chord's pitch classes exactly", () => {
  const e = fresh();
  const s = e.st.setLowHigh;
  const seq = e.buildSequence();
  e.chooseVoicings(seq).forEach((v, i) => {
    const pcs = new Set(v.frets.map((f, k) => (e.OPEN[s[k]] + f) % 12));
    const want = new Set(e.triadPcs(seq[i].rootPc, seq[i].q));
    assert.deepEqual([...pcs].sort(), [...want].sort(), `chord ${i} pc set`);
  });
});

// ---- layer 4: shipped engine vs the new shared parser agree on triads ----

test("cross-check: triadPcs and parseChord derive identical triads, all 12 roots", () => {
  const e = fresh();
  const names = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
  const suffix = { maj: "", min: "m", dim: "dim", aug: "aug" };
  for (const root of names)
    for (const q of ["maj", "min", "dim", "aug"]) {
      const fromStudy = e.triadPcs(e.pcOf(root), q);
      const fromParser = parseChord(root + suffix[q]).pcs;
      assert.deepEqual([...fromParser].sort((a,b)=>a-b), [...fromStudy].sort((a,b)=>a-b),
        `${root} ${q}: two independent derivations agree`);
    }
});

test("cross-check: the study's diatonic sevenths match the parser's, per key", () => {
  const e = fresh();
  e.st.ext = "third";
  for (const key of e.KEYS) {
    e.st.key = key; e.defaultPivots();
    for (const ch of e.buildSequence()) {
      const bass = e.bassPcFor(ch);
      const name = e.tetradName(bass, ch);
      if (name.includes("/")) continue; // non-diatonic fallback names are not sevenths
      const parsed = parseChord(name);
      const studyPcs = new Set([bass % 12, ...e.triadPcs(ch.rootPc, ch.q)]);
      assert.deepEqual([...new Set(parsed.pcs)].sort((a,b)=>a-b), [...studyPcs].sort((a,b)=>a-b),
        `${key}: ${name} spells the same notes both ways`);
    }
  }
});
