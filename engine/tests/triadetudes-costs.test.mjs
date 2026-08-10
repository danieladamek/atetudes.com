/* triadetudes-costs.test.mjs — v0.7 phase 1: the two costs, and Free gets a logic.
 *
 * Voice leading is measured in PITCH (midi, voices matched by sorted order);
 * placement in FRETS (spec §6.1.4). The split is behaviour-preserving today —
 * proven against the untouched characterization pins — and Free gains a seed
 * (anchor kept, pivot dropped), a named tie rule per mode, and the ladder wrap.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";

function danielConfig(e) {
  e.st.key = "C"; e.st.scaleType = "major"; e.st.set = [1, 2, 3];
  e.st.prog = "cycle4"; e.st.startDeg = 0; e.st.harmonyMode = "build";
  e.st.pivotString = 2; e.st.pivotFrets = [5, 6, 8];
}
const tops = (voic) => unwrap(voic).map((v) => Math.max(...v.notes.map((n) => n.fret)));

test("the split is arithmetic identity: pitch-led equals fret-led while the set is fixed", () => {
  const e = loadTriadetudesEngine();
  for (const key of ["C", "Gb", "B"])
    for (const set of [[1, 2, 3], [3, 4, 5]]) {
      e.st.key = key; e.st.set = set; e.defaultPivots();
      const voic = e.chooseVoicings(e.buildSequence());
      for (let i = 1; i < voic.length; i++) {
        const a = unwrap(voic[i].notes), b = unwrap(voic[i - 1].notes);
        const pitch = a.reduce((s2, n, k) => s2 + Math.abs(n.midi - b[k].midi), 0);
        const fret = a.reduce((s2, n, k) => s2 + Math.abs(n.fret - b[k].fret), 0);
        assert.equal(pitch, fret, `${key} ${set} chord ${i}: same quantity, two units`);
        assert.equal(e.voiceLeadCost(voic[i], voic[i - 1]), pitch, "the named term agrees");
      }
    }
});

test("Free seeds at the pivot window: first chord identical to Grip's, by the anchor", () => {
  const e = loadTriadetudesEngine();
  danielConfig(e);
  e.st.placement = "grip";
  const g0 = unwrap(e.chooseVoicings(e.buildSequence())[0].notes);
  e.st.placement = "free";
  const f0 = unwrap(e.chooseVoicings(e.buildSequence())[0].notes);
  e.st.placement = "grip";
  assert.deepEqual(f0, g0, "the anchor term seeds Free inside the isolation zone");
});

test("no mode is decided by emission order: the tie rules are named and fire", () => {
  const e = loadTriadetudesEngine();
  // DEFAULT config: pivots 1-3-5 on string 2, pmean 3 — the seed genuinely
  // ties between the root-position grip [5,5,3] and the low grip [0,1,0]
  // (both in-window, both anchor 1.0).
  const seq = e.buildSequence();
  const cands = e.voicingsFor(seq[0], e.st.setLowHigh);
  const seedCost = (v) => {
    const pf = unwrap(v.notes).find((n) => n.string === e.st.pivotString).fret;
    const inWin = unwrap(e.st.pivotFrets).includes(pf);
    return (inWin ? 0 : 1e9) + Math.abs(pf - 3) * 0.5;
  };
  const tied = [...cands].filter((v) => seedCost(v) === 1.0);
  assert.ok(tied.length >= 2, "the tie exists in the default config");
  // Grip: earliest inversion wins (the pinned behaviour, now stated)
  e.st.placement = "grip";
  const g = unwrap(e.chooseVoicings(seq)[0].notes).map((n) => n.fret);
  assert.deepEqual(g, [5, 5, 3], "grip tie → root position, per the pin");
  // Free: lower neck position wins
  e.st.placement = "free";
  const f = unwrap(e.chooseVoicings(seq)[0].notes).map((n) => n.fret);
  assert.deepEqual(f, [0, 1, 0], "free tie → the lower neck position, named");
  e.st.placement = "grip";
});

test("the ladder, named and bounded: two cycles walk 5→12, wrap to the nut, climb again", () => {
  const e = loadTriadetudesEngine();
  danielConfig(e);
  const twoCycles = [...e.buildSequence(), ...e.buildSequence()];
  e.st.placement = "free";
  const voic = e.chooseVoicings(twoCycles);
  assert.deepEqual(tops(voic), [5, 6, 7, 9, 10, 10, 12, 1, 1, 2, 4, 5, 5, 7, 8, 9],
    "the item's verified walk, verbatim");
  assert.ok(voic[7].wrapped, "the wrap is a named event, not a silent clamp");
  assert.ok(voic.filter((v) => v.wrapped).length === 1, "one wrap in two cycles");
  for (const v of voic)
    for (const n of unwrap(v.notes))
      assert.ok(n.fret <= e.NFRETS, "nothing sits past the drawn board under Free");
  e.st.placement = "grip";
});

test("movement totals: Grip pays 30 semitones across the cycle, Free 24", () => {
  const e = loadTriadetudesEngine();
  danielConfig(e);
  const seq = e.buildSequence();
  e.st.placement = "grip";
  const grip = e.movementTotal(e.chooseVoicings(seq));
  e.st.placement = "free";
  const free = e.movementTotal(e.chooseVoicings(seq));
  e.st.placement = "grip";
  assert.equal(grip, 30, "Grip pays six semitones to stay home");
  assert.equal(free, 24, "Free's honest one-line answer");
  assert.ok(free < grip, "the comparison the readout states");
});

test("grip and free wrap rules never touch grip: no grip voicing carries the flag", () => {
  const e = loadTriadetudesEngine();
  danielConfig(e);
  e.st.placement = "grip";
  const voic = e.chooseVoicings([...e.buildSequence(), ...e.buildSequence()]);
  assert.ok(voic.every((v) => !v.wrapped), "the ladder is Free's, by name");
});
