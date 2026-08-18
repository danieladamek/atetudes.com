/* tetrad-sequence.test.mjs — the derived pass, against the frozen payload.
 *
 * Tetradetudes computes what the frozen study CARRIES. The 1.16 MB payload is
 * therefore an oracle for this module in a way it was not for child 1: child 1
 * asserted candidate MEMBERSHIP (every payload voicing is producible); this
 * asserts the CHOICE (which voicing the pass actually lands on).
 *
 * Two results, both stated rather than one hidden behind the other:
 *   - every step of every pass is a correct voicing of its chord, always;
 *   - the chosen voicings agree with the payload about 60% of the time, and
 *     the disagreement is the optimizer finding SMOOTHER voice-leading than the
 *     payload's named rules. That is a real difference in kind, pinned below,
 *     and it matters to the narrator (child 4).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  OPEN_MIDI, STRING_SETS, CYCLES, cycleDegrees, tetradOnDegree, romanOf,
  tetradPass, degreeLabel,
} from "../tetrad-sequence.mjs";
import { keysOf, transitions } from "../voice-identity.mjs";
import { loadOracle } from "./_load-tetrad-oracle.mjs";

const pc = (n) => ((n % 12) + 12) % 12;
const CYCLE_OF = { S: "scale", 4: "fourths", 5: "fifths", 6: "sixths", 3: "thirds" };
const SCALE_OF = ["major", "harm", "mel"];

/* ================= the derivation ================= */

test("standard tuning obeys its named rule — fourths, with the major third at G→B", () => {
  const order = [6, 5, 4, 3, 2, 1];
  for (let i = 1; i < order.length; i++)
    assert.equal(OPEN_MIDI[order[i]] - OPEN_MIDI[order[i - 1]], order[i - 1] === 3 ? 4 : 5);
  assert.equal(OPEN_MIDI[6], 40, "low E");
  assert.equal(OPEN_MIDI[1], 64, "high e");
});

test("the three string sets are a sliding window, and match the frozen study's", () => {
  const d = loadOracle();
  assert.equal(STRING_SETS.length, d.sets.length);
  for (const [i, s] of STRING_SETS.entries())
    assert.deepEqual(s.opens, d.sets[i].opens, `set ${i} does not match the frozen study`);
});

test("every cycle visits all seven degrees and returns home in eight chords", () => {
  for (const name of Object.keys(CYCLES)) {
    const d = cycleDegrees(name);
    assert.equal(d.length, 8, `${name} is not eight chords`);
    assert.equal(d[0], 0);
    assert.equal(d[7], 0, `${name} does not come home`);
    assert.equal(new Set(d.slice(0, 7)).size, 7, `${name} misses a degree`);
  }
  // the one the frozen study names in prose
  assert.deepEqual(cycleDegrees("fourths"), [0, 3, 6, 2, 5, 1, 4, 0], "I IV vii iii vi ii V I");
  assert.throws(() => cycleDegrees("nope"), /unknown cycle/);
});

test("diatonic tetrads are derived by stacking scale thirds, not tabulated", () => {
  const row = [0, 1, 2, 3, 4, 5, 6].map((d) => tetradOnDegree("C", "major", d).symbol);
  assert.deepEqual(row, ["Cmaj7", "Dm7", "Em7", "Fmaj7", "G7", "Am7", "Bm7b5"]);
  // harmonic minor's III is the augmented major seventh — the quality the
  // payload spells "+M7" and chord.mjs reads as maj7#5
  const III = tetradOnDegree("A", "harm", 2);
  assert.deepEqual(III.chord.intervals, [0, 4, 8, 11]);
  // and it holds in every key, which a table would not guarantee
  for (const k of ["C", "Db", "F#", "Bb", "E"]) {
    const I = tetradOnDegree(k, "major", 0);
    assert.equal(I.chord.seventh, "maj7", `${k} major's I is not a maj7`);
  }
});

test("roman numerals are derived from the parsed quality, not written down", () => {
  const r = (k, s, d) => romanOf({ ...tetradOnDegree(k, s, d), degree: d });
  assert.equal(r("C", "major", 0), "Imaj7");
  assert.equal(r("C", "major", 1), "ii-7");
  assert.equal(r("C", "major", 4), "V7");
  assert.equal(r("C", "major", 6), "viiø7");
});

test("degree labels relabel a HELD pitch when the chord under it changes", () => {
  // E is the 3rd of Cmaj7 and the 7th of Fmaj7 — the frozen study's
  // "held notes recolor as their function changes"
  const cmaj7 = tetradOnDegree("C", "major", 0).chord;
  const fmaj7 = tetradOnDegree("C", "major", 3).chord;
  assert.equal(degreeLabel(cmaj7, 64), "3");
  assert.equal(degreeLabel(fmaj7, 64), "7");
});

/* ================= the pass, against the oracle ================= */

const ORACLE = loadOracle();

test("THE ORACLE, exactly: C major fourths from the root reproduces the payload step for step", () => {
  const ei = ORACLE.engines.findIndex((e) => e.key === "4");
  const payload = ORACLE.passes[ei][0][0][0][0];          // major, set 0, key C, bottom R
  const mine = tetradPass({ key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0 });

  for (let i = 0; i < 8; i++) {
    assert.deepEqual(mine.steps[i].voicing.notes.map((n) => n.fret), payload[i][3],
      `step ${i} (${mine.steps[i].symbol}) diverges from the frozen study`);
    assert.equal(mine.steps[i].symbol, payload[i][0], `step ${i} names a different chord`);
  }
});

test("EVERY step of EVERY pass is a correct voicing of its own chord — 17,280 steps", () => {
  let steps = 0, wrong = 0;
  for (const [ei, eng] of ORACLE.passes.entries())
    for (const [si] of eng.entries())
      for (const [ti] of eng[si].entries())
        for (const [ki] of eng[si][ti].entries())
          for (const [bi] of eng[si][ti][ki].entries()) {
            const p = tetradPass({ key: ORACLE.keys[ki], scale: SCALE_OF[si],
              cycle: CYCLE_OF[ORACLE.engines[ei].key], bottom: bi, setIndex: ti });
            for (const s of p.steps) {
              steps++;
              const got = new Set(s.voicing.notes.map((n) => pc(n.midi)));
              const want = new Set(s.chord.pcs.map(pc));
              if (got.size !== want.size || [...want].some((x) => !got.has(x))) wrong++;
            }
          }
  assert.equal(steps, 17280, "the corpus changed size");
  assert.equal(wrong, 0, `${wrong} steps do not spell their own chord`);
});

test("FINDING: the pass is voice-leading-optimal where the payload is rule-faithful", () => {
  /* The two engines are different in KIND, and the difference is measured
   * rather than characterised. The payload's cycles are named pedagogical rules
   * ("R and 3 hold; the 5 falls to the new root"); `chooseVoicings` minimises a
   * cost. Where the two coincide they agree exactly; where they differ, this
   * one moves LESS.
   *
   * This is not a defect and it is not a licence either — it matters to the
   * narrator (child 4), which describes named moves. Recorded here so that
   * session finds it rather than discovering it in the prose. */
  const move = (frets, opens) => {
    let t = 0;
    for (let i = 1; i < frets.length; i++)
      for (let k = 0; k < 4; k++)
        t += Math.abs((opens[k] + frets[i][k]) - (opens[k] + frets[i - 1][k]));
    return t;
  };
  let agree = 0, total = 0, mineMove = 0, payMove = 0;
  for (const [ei, eng] of ORACLE.passes.entries())
    for (const [si] of eng.entries())
      for (const [ti] of eng[si].entries())
        for (const [ki] of eng[si][ti].entries())
          for (const [bi, bt] of eng[si][ti][ki].entries()) {
            const p = tetradPass({ key: ORACLE.keys[ki], scale: SCALE_OF[si],
              cycle: CYCLE_OF[ORACLE.engines[ei].key], bottom: bi, setIndex: ti });
            const opens = ORACLE.sets[ti].opens;
            const mf = p.steps.map((s) => s.voicing.notes.map((n) => n.fret));
            mineMove += move(mf, opens);
            payMove += move(bt.map((x) => x[3]), opens);
            for (let i = 0; i < 8; i++) {
              total++;
              if (JSON.stringify(mf[i]) === JSON.stringify(bt[i][3])) agree++;
            }
          }
  assert.equal(total, 17280);
  assert.ok(agree / total > 0.5,
    `agreement collapsed to ${(agree / total * 100).toFixed(1)}% — the derivation changed character`);
  assert.ok(mineMove < payMove,
    "the optimizer no longer moves less than the payload — re-derive this finding");
  assert.ok(mineMove / payMove > 0.6 && mineMove / payMove < 0.9,
    `movement ratio ${(mineMove / payMove).toFixed(3)} left its measured band (0.751)`);
});

/* ================= it is a pass a door can render ================= */

test("a pass carries stable voice keys the renderer can glide", () => {
  const p = tetradPass({ key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0 });
  const first = p.steps[0].keys;
  assert.deepEqual(first, ["v0", "v1", "v2", "v3"]);
  for (const s of p.steps) assert.deepEqual(s.keys, first, "a voice key changed mid-pass");
  // and every change is describable voice by voice
  for (let i = 1; i < p.steps.length; i++) {
    const ts = transitions(p.steps[i - 1].voicing, p.steps[i].voicing);
    assert.equal(ts.length, 4);
    for (const t of ts) assert.ok(Number.isFinite(t.semitones));
  }
});

test("every step carries one degree label per voice, against its OWN chord", () => {
  const p = tetradPass({ key: "F", scale: "harm", cycle: "sixths", bottom: 2, setIndex: 1 });
  for (const s of p.steps) {
    assert.equal(s.labels.length, 4);
    for (const [k, lab] of s.labels.entries())
      assert.equal(lab, degreeLabel(s.chord, s.voicing.notes[k].midi));
  }
});

test("the configuration space is refused by name when it is wrong", () => {
  assert.throws(() => tetradPass({ scale: "lydian" }), /unknown scale/);
  assert.throws(() => tetradPass({ setIndex: 9 }), /unknown string set/);
  assert.throws(() => tetradPass({ bottom: 4 }), /not one of 0\.\.3/);
  assert.throws(() => tetradPass({ cycle: "spiral" }), /unknown cycle/);
});

test("all three scales and all four bottom tones produce a playable pass on every set", () => {
  for (const scale of SCALE_OF)
    for (const setIndex of [0, 1, 2])
      for (const bottom of [0, 1, 2, 3]) {
        const p = tetradPass({ key: "G", scale, cycle: "scale", bottom, setIndex });
        assert.equal(p.steps.length, 8);
        for (const s of p.steps) {
          assert.equal(s.voicing.notes.length, 4);
          for (const n of s.voicing.notes)
            assert.ok(n.fret >= 0 && n.fret <= 15, `fret ${n.fret} off the neck`);
        }
      }
});

/* ================= the zone as an argument (audit 260818 §A2) ================= */

import { DEFAULT_ZONE_FRETS } from "../tetrad-sequence.mjs";
import { makeZone, chooseVoicings } from "../isolation.mjs";
import { tetradCandidates } from "../tetrad-voicings.mjs";
import { STRING_SETS as SETS2 } from "../tetrad-sequence.mjs";

test("THE PIN: the default zone reproduces the pre-argument pass EXACTLY, across the corpus", () => {
  /* Before this item every pass was anchored to makeZone({string: set.strings[0],
   * frets:[5,6,7]}) with no way to say otherwise. That literal is now the
   * DEFAULT, and this asserts that a caller who passes no zone gets the same
   * derived output as before — every fret of every voice of every step —
   * across the same corpus the oracle test walks. No silent musical change. */
  assert.deepEqual([...DEFAULT_ZONE_FRETS], [5, 6, 7], "the default is no longer the historical literal");
  let steps = 0;
  for (const [ei, eng] of ORACLE.passes.entries())
    for (const [si] of eng.entries())
      for (const [ti] of eng[si].entries())
        for (const [ki] of eng[si][ti].entries())
          for (const [bi] of eng[si][ti][ki].entries()) {
            const args = { key: ORACLE.keys[ki], scale: SCALE_OF[si],
              cycle: CYCLE_OF[ORACLE.engines[ei].key], bottom: bi, setIndex: ti };
            const implicit = tetradPass(args);
            const explicit = tetradPass({ ...args, zone: { frets: [5, 6, 7] } });
            const frets = (p) => p.steps.map((s) => s.voicing.notes.map((n) => n.fret));
            assert.deepEqual(frets(implicit), frets(explicit),
              `default ≠ explicit [5,6,7] for ${JSON.stringify(args)}`);
            assert.deepEqual(implicit.zone, { string: SETS2[ti].strings[0], frets: [5, 6, 7] });
            steps += implicit.steps.length;
          }
  assert.equal(steps, 17280);
});

test("the default pass is the historical one, re-derived independently against isolation.mjs", () => {
  // the literal, applied by hand through the same engines — so the pin above is
  // not merely "the function agrees with itself"
  const set = SETS2[0];
  const p = tetradPass({ key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0 });
  const zone = makeZone({ string: set.strings[0], frets: [5, 6, 7] });
  let first = true;
  const byHand = chooseVoicings(p.steps.map((s) => s), {
    zone, placement: "free", setLowHigh: set.strings, nfrets: 15,
    candidatesFor: (st) => {
      const all = tetradCandidates(st.chord, { set: set.opens, nfrets: 15, strings: set.strings, families: ["drop2"] });
      if (!first) return all; first = false;
      const seeded = all.filter((v) => v.bass === 0); return seeded.length ? seeded : all;
    },
  });
  assert.deepEqual(p.steps.map((s) => s.voicing.notes.map((n) => n.fret)),
    byHand.map((v) => v.notes.map((n) => n.fret)));
});

test("THE WIRING: moving the zone changes the chosen voicings — the zone the caller sets is the zone chooseVoicings receives", () => {
  /* Under GRIP. This first ran under the door's default, Free, and the pass did
   * not move — and that was the RULE, not the plumbing: Free is defined in
   * isolation.mjs as "the grip chosen by smoothest voice-leading, ANCHOR
   * RELEASED" (pivotW: 0), so the zone contributes nothing to its cost by
   * construction; only the first-chord seed anchor remains, and a root-position
   * seed sits at the same fret whatever the window. Grip (pivotW: 4) is the
   * placement whose whole point is the zone, so it is where the wiring is
   * proven. Recorded, because "the box does nothing under Free" is a fact the
   * UI must say rather than let the user discover. */
  const base = { key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0, placement: "grip" };
  const low = tetradPass({ ...base, zone: { frets: [1, 2, 3] } });
  const mid = tetradPass({ ...base, zone: { frets: [5, 6, 7] } });
  const high = tetradPass({ ...base, zone: { frets: [10, 11, 12] } });
  const frets = (p) => JSON.stringify(p.steps.map((s) => s.voicing.notes.map((n) => n.fret)));
  assert.notEqual(frets(low), frets(high), "a zone at the nut and a zone at the 12th chose the same voicings — the argument is not reaching the optimizer");
  assert.notEqual(frets(mid), frets(high));
  // and it moves in the RIGHT direction: the mean fret follows the zone
  const mean = (p) => p.steps.flatMap((s) => s.voicing.notes.map((n) => n.fret)).reduce((a, b) => a + b, 0) / (p.steps.length * 4);
  assert.ok(mean(low) < mean(mid) && mean(mid) < mean(high),
    `mean fret does not follow the zone: ${mean(low).toFixed(1)} / ${mean(mid).toFixed(1)} / ${mean(high).toFixed(1)}`);
  // every voicing is still a correct one — the zone moves placement, never pitch class
  for (const p of [low, mid, high])
    for (const s of p.steps)
      assert.deepEqual(new Set(s.voicing.notes.map((n) => pc(n.midi))), new Set(s.chord.pcs.map(pc)));
});

test("FINDING, pinned: under FREE the zone does not move the pass — anchor released is the rule", () => {
  // this is isolation.mjs's shipped definition of Free (pivotW: 0), extracted
  // verbatim and pinned by its own suite; not something to "fix" here. It is
  // pinned so the day Free changes, this says so — and so the door's UI can
  // state it truthfully rather than offer a box that appears broken.
  const base = { key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0, placement: "free" };
  const frets = (p) => JSON.stringify(p.steps.map((s) => s.voicing.notes.map((n) => n.fret)));
  assert.equal(frets(tetradPass({ ...base, zone: { frets: [1, 2, 3] } })),
               frets(tetradPass({ ...base, zone: { frets: [10, 11, 12] } })),
    "Free now follows the zone — isolation.mjs's Free changed; revisit the door's Box mode prose");
});

test("the box is DERIVED — the zone grown to cover every chosen voicing, as Triadetudes derives it", () => {
  const p = tetradPass({ key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0, zone: { frets: [5, 6, 7] } });
  const all = p.steps.flatMap((s) => s.voicing.notes.map((n) => n.fret));
  assert.equal(p.box.fLo, Math.min(5, ...all));
  assert.equal(p.box.fHi, Math.max(7, ...all));
  assert.deepEqual(p.box.strings, SETS2[0].strings);
  assert.ok(p.box.fLo <= 5 && p.box.fHi >= 7, "the box must contain the zone");
});

test("a zone string outside the set falls back to the set's lowest, and a bad frets list to the default", () => {
  const p = tetradPass({ key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0, zone: { string: 1, frets: [] } });
  assert.equal(p.zone.string, SETS2[0].strings[0]);
  assert.deepEqual(p.zone.frets, [5, 6, 7]);
});
