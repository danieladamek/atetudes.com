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
  STRING_SETS, CYCLES, cycleDegrees, tetradOnDegree, romanOf,
  tetradPass, degreeLabel,
} from "../tetrad-sequence.mjs";
import { OPEN_MIDI } from "../field.mjs";   // 260920: the one declaration — the tuning pin below reads it from its owner
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

test("setIndex is the STORED IDENTITY: array order and opens are the fact, label is derived presentation (Shell 4)", () => {
  /* Shell 4 turns the set label high→low to match the reference. The trap the
   * item names: the practice log persists the set by its position in this
   * array, so reordering the array silently remaps every saved entry. This pins
   * the invariant that keeps that safe — the array is NOT reordered; setIndex i
   * still addresses the same physical set (offset i, its opens), and only the
   * label string changes. A saved entry from before the relabel restores the
   * same set BY CONSTRUCTION, because its setIndex still means what it meant. */
  for (const [i, s] of STRING_SETS.entries()) {
    assert.equal(s.offset, i, `set ${i} is no longer at its offset — a reorder would remap saved entries`);
    // opens are already pinned to the frozen study above; restate the identity here
    assert.equal(s.strings.length, 4);
  }
  // the label now reads highest pitch first (the reference's dialect), derived
  // from the strings, not hand-listed
  assert.deepEqual(STRING_SETS.map((s) => s.label), ["G–D–A–E", "B–G–D–A", "E–B–G–D"]);
  for (const s of STRING_SETS) {
    // both Es are spelled "E" now (N4: uppercase everywhere, Daniel 2026-08-19);
    // position disambiguates — high -> low, so a leading E is the high one
    const pitchOf = { B: 59, G: 55, D: 50, A: 45, E: 40 };
    const seq = s.label.split("–").map((l, i) => (l === "E" && i === 0 && s.offset === 2) ? 64 : pitchOf[l]);
    for (let j = 1; j < seq.length; j++)
      assert.ok(seq[j] < seq[j - 1], `label ${s.label} is not high→low at ${j}`);
  }
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

const LEGACY_ZONE = () => ({ frets: [5, 6, 7], bind: false });

test("THE ORACLE, exactly: C major fourths from the root reproduces the payload step for step", () => {
  /* REWRITTEN 2026-08-21, deliberately, under "the window is a position"
   * (ratified family law): binding is the DEFAULT now and the default zone is
   * scale-derived, so the DEFAULT pass no longer reproduces the frozen study —
   * that change is the ruling's point, not drift. The comparison against the
   * payload keeps its meaning through the LEGACY PATH (explicit [5,6,7],
   * bind:false), which is byte-for-byte the pre-ruling optimizer and the path
   * pre-ruling saved études restore through. */
  const ei = ORACLE.engines.findIndex((e) => e.key === "4");
  const payload = ORACLE.passes[ei][0][0][0][0];          // major, set 0, key C, bottom R
  const mine = tetradPass({ key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0,
    zone: LEGACY_ZONE() });

  for (let i = 0; i < 8; i++) {
    assert.deepEqual(mine.steps[i].voicing.notes.map((n) => n.fret), payload[i][3],
      `step ${i} (${mine.steps[i].symbol}) diverges from the frozen study`);
    assert.equal(mine.steps[i].symbol, payload[i][0], `step ${i} names a different chord`);
  }
});

test("EVERY step of EVERY pass is a correct voicing of its own chord — 17,280 steps", () => {
  // runs the BOUND DEFAULT (post-ruling): correctness is invariant to binding
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
   * session finds it rather than discovering it in the prose.
   *
   * REWRITTEN 2026-08-21: measured through the LEGACY path (bind:false,
   * [5,6,7]) — the band characterises the pre-ruling optimizer against the
   * payload, and the bound default deliberately moves differently. */
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
              cycle: CYCLE_OF[ORACLE.engines[ei].key], bottom: bi, setIndex: ti, zone: LEGACY_ZONE() });
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

import { defaultZoneFrets } from "../tetrad-sequence.mjs";
import { makeZone, chooseVoicings } from "../isolation.mjs";
import { tetradCandidates } from "../tetrad-voicings.mjs";
import { STRING_SETS as SETS2 } from "../tetrad-sequence.mjs";

test("THE PIN, rewritten 2026-08-21: the default zone is the DERIVED scale triple, bound, across the corpus", () => {
  /* The pre-ruling pin asserted the default was the literal [5,6,7] and that
   * a caller who passed no zone got the pre-argument pass. "The window is a
   * position" retracts both ON PURPOSE: the default zone is three consecutive
   * SCALE notes at 5th position (the e5ba874 flattening undone at the source),
   * and binding is the default. This pin holds the NEW law the same way the
   * old one held the old: derived, never a literal — and the width is never
   * anything but the span of a scale triple. */
  let checked = 0;
  for (const [ei, eng] of ORACLE.passes.entries())
    for (const [si] of eng.entries())
      for (const [ti] of eng[si].entries())
        for (const [ki] of eng[si][ti].entries()) {
          const args = { key: ORACLE.keys[ki], scale: SCALE_OF[si],
            cycle: CYCLE_OF[ORACLE.engines[ei].key], bottom: 0, setIndex: ti };
          const p = tetradPass(args);
          const want = defaultZoneFrets(args.key, args.scale, SETS2[ti].strings[0]);
          assert.deepEqual(p.zone, { string: SETS2[ti].strings[0], frets: want },
            `the default zone is not the derived scale triple for ${JSON.stringify(args)}`);
          const w = p.box.fHi - p.box.fLo + 1;
          assert.ok(w === 4 || w === 5,
            `window width ${w} for ${args.key} ${args.scale} — the span of a scale triple is 4 or 5, never anything else`);
          checked++;
        }
  assert.ok(checked >= 500, `only ${checked} corpus points checked`);
});

test("the LEGACY path is the historical pass, re-derived independently against isolation.mjs", () => {
  // REWRITTEN 2026-08-21: the pre-ruling behaviour stays reachable as
  // { frets:[5,6,7], bind:false } — what pre-ruling saved études restore
  // through — and is pinned here BY HAND through the same engines, so the
  // oracle comparisons above are not "the function agrees with itself"
  const set = SETS2[0];
  const p = tetradPass({ key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0,
    zone: LEGACY_ZONE() });
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
  // REWRITTEN 2026-08-21: the pivotW:0 fact belongs to the UNBOUND path, so
  // it is pinned there (bind:false); the bound default DOES follow the zone —
  // that is binding working, asserted alongside so the pair states the law.
  const base = { key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0, placement: "free" };
  const frets = (p) => JSON.stringify(p.steps.map((s) => s.voicing.notes.map((n) => n.fret)));
  assert.equal(frets(tetradPass({ ...base, zone: { frets: [1, 2, 3], bind: false } })),
               frets(tetradPass({ ...base, zone: { frets: [10, 11, 12], bind: false } })),
    "unbound Free now follows the zone — isolation.mjs's Free changed; revisit the door's Box mode prose");
  assert.notEqual(frets(tetradPass({ ...base, zone: { frets: [1, 3, 5] } })),
                  frets(tetradPass({ ...base, zone: { frets: [8, 10, 12] } })),
    "BOUND Free ignored the zone — binding must constrain the anchor voice under every placement");
});

test("the box IS the window — derived from the zone, NEVER from the voicings (ratified 2026-08-21)", () => {
  /* The pre-ruling test pinned the opposite: a box grown to cover every
   * chosen voicing. "The window is a position" retracts that — a rectangle
   * that stretches is a residue, not a position — so the pin flips: the box
   * equals the zone's span exactly, even when voicings roam far outside it.
   * Legacy-unbound free with a low zone is the roaming case. */
  for (const zone of [{ frets: [5, 7, 8] }, { frets: [1, 3, 5], bind: false }, { frets: [8, 10, 12] }]) {
    const p = tetradPass({ key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0,
      placement: "free", zone });
    assert.equal(p.box.fLo, Math.min(...zone.frets), "the window's left edge is the zone's, full stop");
    assert.equal(p.box.fHi, Math.max(...zone.frets), "the window's right edge is the zone's, full stop");
    assert.deepEqual(p.box.strings, SETS2[0].strings);
    assert.equal("brokeLeft" in p.box, false, "brokeLeft is retracted — there is no wall");
    assert.equal("reached" in p.box, false, "the reach counter is retracted — a stretch is not reported");
    const outside = p.steps.flatMap((s) => s.voicing.notes.map((n) => n.fret))
      .filter((f) => f !== 0 && (f < p.box.fLo || f > p.box.fHi));
    if (zone.bind === false && zone.frets[0] === 1) 
      assert.ok(outside.length > 0, "precondition: the roaming case must actually roam outside the window");
  }
});

/* The soft-wall block (260820: the wall breaks/holds, free-never) is DELETED,
 * not updated — "the window is a position" (ratified 2026-08-21) retracts the
 * soft wall, brokeLeft and the overhang outright; pins of retracted behaviour
 * go with their mechanism. The window pins above replace them. */

test("BOUND BY DEFAULT (ratified 2026-08-21): a position you do not stay in is not a position", () => {
  // no bind field at all ⇒ bound; bind:false is the explicit legacy escape
  const args = { key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0,
    placement: "grip", zone: { frets: [5, 7, 8] } };
  const dflt = tetradPass(args);
  const on = tetradPass({ ...args, zone: { ...args.zone, bind: true } });
  assert.deepEqual(
    dflt.steps.map((s) => s.voicing.notes.map((n) => n.fret)),
    on.steps.map((s) => s.voicing.notes.map((n) => n.fret)),
    "the default must BE the bound path");
  assert.equal(dflt.zone.bind, undefined, "bound-by-default carries no flag — only the exception is stored");
  const off = tetradPass({ ...args, zone: { ...args.zone, bind: false } });
  assert.equal(off.zone.bind, false, "the legacy escape is stated in the returned zone");
});

test("bound: the anchor voice lands ON a zone note (or an open string) except where it stretches", () => {
  for (const [key, scale, frets] of [
    ["C", "major", [5, 7, 8]],       // A B C on string 6 — a real scale triple
    ["A", "mel", [7, 8, 10]],        // B C D on string 6
    ["G", "major", [3, 5, 7]],
  ]) {
    const p = tetradPass({ key, scale, cycle: "fourths", bottom: 0, setIndex: 0,
      placement: "grip", zone: { frets } });
    const zi = p.set.strings.indexOf(p.zone.string);
    const onZone = p.steps.filter((st) => {
      const pf = st.voicing.notes[zi].fret;
      return frets.includes(pf) || pf === 0;
    }).length;
    assert.ok(onZone >= 7, `[${key} ${scale}] only ${onZone}/8 bars anchored at a good triple — binding is barely binding`);
  }
});

test("bound NEVER throws: a bar with no anchored candidate stretches — voiced, unmarked", () => {
  // hunt a (config, triple) where some chord has zero anchor-bound candidates —
  // the measurements put these at ~12% of pairs, so a short scan finds one; the
  // precondition (a real stretch of the anchor voice) is asserted so the test
  // cannot rot into vacuity. Nothing counts it: a stretch is not an error.
  let found = null;
  outer: for (const key of ["G", "Db", "B", "Gb"]) for (const fLo of [1, 2, 3, 4]) {
    const frets = [fLo, fLo + 2, fLo + 3];
    const probe = tetradPass({ key, scale: "harm", cycle: "sixths", bottom: 0, setIndex: 1,
      placement: "grip", zone: { frets } });
    const zi = probe.set.strings.indexOf(probe.zone.string);
    const off = probe.steps.filter((st) => {
      const pf = st.voicing.notes[zi].fret;
      return pf !== 0 && !frets.includes(pf);
    }).length;
    if (off > 0) { found = probe; break outer; }
  }
  assert.ok(found, "precondition: no stretching configuration found in the scan — re-derive from the measurements");
  for (const st of found.steps) assert.ok(st.voicing, "a stretching bar is still VOICED — the throw must never fire");
});

test("bound respects the seed: bar 1 keeps the requested bottom, stretching if it must", () => {
  const p = tetradPass({ key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0,
    placement: "grip", zone: { frets: [10, 12, 13] } });
  assert.equal(p.steps[0].voicing.bass, 0, "bar 1 still has the requested bottom tone in the bass");
});

test("the derived default's width is the span of a scale triple — 4 or 5, never anything else", () => {
  for (const key of ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"])
    for (const scaleType of ["major", "harm", "mel"])
      for (let str = 1; str <= 6; str++) {
        const f = defaultZoneFrets(key, scaleType, str);
        const w = Math.max(...f) - Math.min(...f) + 1;
        assert.ok(w === 4 || w === 5,
          `${key} ${scaleType} string ${str}: width ${w} — three consecutive scale notes span 4 or 5, always`);
      }
});

test("a zone string outside the set falls back to the set's lowest, and a bad frets list to the derived default", () => {
  const p = tetradPass({ key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0, zone: { string: 1, frets: [] } });
  assert.equal(p.zone.string, SETS2[0].strings[0]);
  assert.deepEqual(p.zone.frets, defaultZoneFrets("C", "major", SETS2[0].strings[0]));
});
