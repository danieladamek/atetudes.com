/* selection.test.mjs — the selection module, and THE CONFORMANCE CASE the
 * route was approved on.
 *
 * U1: identical behaviour is unassertable in general and assertable per named
 * behaviour. The named behaviour here is
 *
 *   THE §6.1.2 CHOICE — one occurrence per tone, minimising total fret span,
 *   then drift from the centre, then the lower strings —
 *
 * implemented twice: engine/isolation.mjs's lineVoicing (the carried path,
 * byte-shipped in the tetradetudes door and pinned by the triad study's line
 * mode) and engine/selection.mjs's oneOfEach (the multetudes-native path).
 * On the ratified ground — ONE NOTE PER STRING — they are asserted equal,
 * exactly, over a derived corpus, including agreement on UNPLACEABILITY
 * (where one refuses, the other must refuse). The pattern is field.mjs's
 * tuning pin: one fact, two derivations, asserted never assumed.
 *
 * TWO CLAUSES ARE DELIBERATELY OUTSIDE THE GROUND, each pinned BY NAME so the
 * boundary is a tested fact rather than prose:
 *   - zone capture ("a chord tone present in the zone is taken there") — the
 *     carried anchoring rule; multetudes' window is a frame, not an anchor.
 *   - n > 1: THE VOICING RULE. The carried key doubles a string where
 *     doubling is tighter; a voicing is what can sound together, so
 *     selection spreads before it tightens. The divergence pin below holds
 *     the exact counterexample that falsified the guide's "one-per-string is
 *     always the tighter span".
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { field } from "../field.mjs";
import { positionOf, materialIn } from "../position.mjs";
import { makeRun } from "../string-run.mjs";
import { diatonicTones, oneOfEach, everyOccurrence, scaleTake } from "../selection.mjs";
import { lineVoicing, chooseVoicings, makeZone } from "../isolation.mjs";

const mod12 = (x) => ((x % 12) + 12) % 12;
const addr = (notes) => notes.map((n) => n.string + "/" + n.fret).join(" ");

/** the carried voicer posed the SAME question: no zone capture, pool-order
 * candidates, the run's strings — the shared ground's exact framing */
function carriedChoice(pcs, pool, pos, run, maxPerString) {
  const zone = makeZone({ string: pos.anchorString, frets: pos.frets });
  const positionsFor = (pc) => pool.filter((m) => mod12(m.midi) === mod12(pc));
  return lineVoicing(pcs, { zone, zoneNotes: [], positionsFor,
    setLowHigh: run.strings, maxPerString });
}

test("THE CONFORMANCE CASE — the §6.1.2 choice: oneOfEach IS the carried voicer's placement at one note per string", () => {
  let agreed = 0, refusedBoth = 0;
  for (const key of ["C", "Eb", "F#", "A"])
    for (const scale of ["major", "harm", "mel"])
      for (const strings of [[6, 5, 4, 3], [5, 4, 3, 2], [4, 3, 2, 1], [6, 4, 3, 1]])
        for (let deg = 0; deg < 7; deg += 2)
          for (const offsets of [[0, 2, 4], [0, 2, 4, 6]]) {
            const fld = field({ key, scale });
            const run = makeRun(strings);
            const anchor = Math.max(...strings);
            const pos = positionOf({ field: fld, anchorString: anchor, startDegree: deg, nearFret: 5 });
            const pool = materialIn(pos, strings, fld);
            const tones = diatonicTones(fld, deg, offsets);
            if (tones.some((t) => !pool.some((m) => mod12(m.midi) === mod12(t.pc))))
              continue;                              // a missing tone is not shared ground
            const mine = oneOfEach(tones, pool, { n: 1, centre: pos.centre });
            let theirs = null, refused = false;
            try {
              theirs = carriedChoice(tones.map((t) => t.pc), pool, pos, run, 1);
            } catch { refused = true; }
            if (mine.unplaceable || refused) {
              assert.ok(mine.unplaceable && refused,
                `${key} ${scale} deg ${deg} on ${run.label}: one path refused and the other placed — ` +
                `mine ${mine.unplaceable ? "refused" : addr(mine.notes)} vs carried ${refused ? "refused" : addr(theirs.notes)}`);
              refusedBoth++;
              continue;
            }
            assert.equal(addr(mine.notes), addr(theirs.notes),
              `${key} ${scale} deg ${deg} ${offsets.length} tones on ${run.label}: the two paths disagree on shared ground`);
            agreed++;
          }
  assert.ok(agreed >= 300, `the conformance corpus must actually run (${agreed} agreements, ${refusedBoth} joint refusals)`);
});

test("the seam has a caller: chooseVoicings' line placement runs on selection's choice, end to end", () => {
  const fld = field({ key: "Bb", scale: "major" });
  const strings = [4, 3, 2, 1];
  const run = makeRun(strings);
  const pos = positionOf({ field: fld, anchorString: 4, startDegree: 0, nearFret: 5 });
  const pool = materialIn(pos, strings, fld);
  const seq = [0, 3, 4].map((deg) => diatonicTones(fld, deg, [0, 2, 4, 6]));
  // the injected seam (isolation.mjs:231, called at :236) — its caller is the
  // multetudes path now, not only the characterization harness
  const voiced = chooseVoicings(seq, {
    zone: makeZone({ string: pos.anchorString, frets: pos.frets }),
    placement: "line", setLowHigh: run.strings, nfrets: 15,
    lineVoicingFor: (tones) => oneOfEach(tones, pool, { n: 3, centre: pos.centre }),
  });
  assert.equal(voiced.length, 3);
  voiced.forEach((v, i) => {
    assert.ok(v.notes && v.notes.length >= 3, `chord ${i} did not voice through the seam`);
    assert.equal(addr(v.notes), addr(oneOfEach(seq[i], pool, { n: 3, centre: pos.centre }).notes),
      "the seam must deliver exactly what the rule chooses");
  });
});

test("THE DIVERGENCE PIN (§4.4, deliberate): at n > 1 the carried key doubles where selection spreads — the counterexample, held", () => {
  // C major, window frets 3–7 on string 5, tetrad over {5,4,3,2}: span alone
  // puts C@3/5 and B@3/4 on one string (span 1) — the combination that
  // falsified the guide's "one-per-string is always the tighter span".
  const fld = field({ key: "C", scale: "major" });
  const strings = [5, 4, 3, 2];
  const run = makeRun(strings);
  const pos = positionOf({ field: fld, anchorString: 5, startDegree: 0, nearFret: 5 });
  assert.deepEqual(pos.frets, [3, 5, 7], "the counterexample's window");
  const pool = materialIn(pos, strings, fld);
  const tones = diatonicTones(fld, 0, [0, 2, 4, 6]);
  const carried = carriedChoice(tones.map((t) => t.pc), pool, pos, run, 3);
  const perString = {};
  for (const n of carried.notes) perString[n.string] = (perString[n.string] || 0) + 1;
  assert.ok(Object.values(perString).some((c) => c > 1),
    "the carried voicer must double a string here — if it stopped, the ground has moved and the divergence needs re-deciding");
  const mine = oneOfEach(tones, pool, { n: 3, centre: pos.centre });
  assert.ok(mine.notes.every((n, i, a) => a.filter((x) => x.string === n.string).length === 1),
    "selection must spread — a voicing is what can sound together");
  assert.notEqual(addr(mine.notes), addr(carried.notes),
    "the divergence is real, named, and outside the conformance ground");
});

test("TAKE IS NOT PLACEMENT, as a theorem: raising the ceiling never changes a placeable voicing", () => {
  let held = 0;
  for (const key of ["C", "Db", "G"])
    for (const scale of ["major", "mel"])
      for (const strings of [[6, 5, 4, 3], [4, 3, 2, 1], [6, 4, 3, 1]])
        for (let deg = 0; deg < 7; deg++) {
          const fld = field({ key, scale });
          const anchor = Math.max(...strings);
          const pos = positionOf({ field: fld, anchorString: anchor, startDegree: deg, nearFret: 5 });
          const pool = materialIn(pos, strings, fld);
          const tones = diatonicTones(fld, deg, [0, 2, 4, 6]);
          const at1 = oneOfEach(tones, pool, { n: 1, centre: pos.centre });
          if (!at1.notes) continue;                    // unplaceable at 1 may legitimately fold at 3
          const at3 = oneOfEach(tones, pool, { n: 3, centre: pos.centre });
          assert.equal(addr(at3.notes), addr(at1.notes),
            `${key} ${scale} deg ${deg} on ${strings.join(",")}: the ceiling CAUSED a change`);
          held++;
        }
  assert.ok(held >= 80, `the theorem must be exercised (${held} cases)`);
});

test("two notes on one string are DISTINCT, ORDERED, ADDRESSABLE entries — the collision law at the data level", () => {
  const fld = field({ key: "C", scale: "major" });
  const pos = positionOf({ field: fld, anchorString: 5, startDegree: 0, nearFret: 5 });
  const pool = materialIn(pos, [5, 4, 3, 2], fld);
  const arp = everyOccurrence(diatonicTones(fld, 0), pool, { n: 3 });
  const doubled = Object.entries(arp.notes.reduce((a, n) => {
    (a[n.string] ||= []).push(n); return a;
  }, {})).filter(([, ns]) => ns.length >= 2);
  assert.ok(doubled.length >= 1, "the fixture must actually double a string");
  for (const [s, ns] of doubled) {
    const frets = ns.map((n) => n.fret);
    assert.equal(new Set(frets).size, frets.length, `string ${s}: two entries share a fret`);
    // the ordinal address: the k-th note on a string is well defined because
    // entries ascend by fret — "a repeat is the ordinal" has ground to stand on
    const sorted = [...frets].sort((a, b) => a - b);
    assert.deepEqual(frets, sorted, `string ${s}: entries must ascend so ordinals mean something`);
    ns.forEach((n, k) => assert.equal(n.fret, sorted[k], `string ${s} ordinal ${k}`));
  }
});

test("absence is a fact: a tone outside the window reports by role; a forced collision reports its string", () => {
  const fld = field({ key: "C", scale: "major" });
  // one string only: the tetrad cannot spread — at n=1, three of the tones
  // collide on the single string and the refusal must NAME it
  const pos = positionOf({ field: fld, anchorString: 6, startDegree: 0, nearFret: 5 });
  const pool1 = materialIn(pos, [6], fld);
  const tones = diatonicTones(fld, 0);
  const r = oneOfEach(tones, pool1, { n: 1, centre: pos.centre });
  assert.equal(r.notes, null);
  assert.ok(r.unplaceable, "one string cannot hold a tetrad at one per string");
  assert.ok(r.collide && r.collide.string === 6 && r.collide.roles.length > 1,
    `the refusal must name the string and the roles (${JSON.stringify(r.collide)})`);
  // and a genuinely absent tone is missing, not an error
  assert.ok(Array.isArray(r.missing));
});

test("the scale takes everything the box offers — placement off, reach the only cap; asserted against the pool itself", () => {
  const fld = field({ key: "E", scale: "harm" });
  const pos = positionOf({ field: fld, anchorString: 6, startDegree: 0, nearFret: 7 });
  const pool = materialIn(pos, [6, 5, 4, 3, 2, 1], fld);
  const take = scaleTake(pool);
  // differential: per string, exactly the first ≤3 pool notes, in pool order
  const expect = [...new Set(pool.map((m) => m.string))]
    .flatMap((s) => pool.filter((m) => m.string === s).slice(0, 3));
  assert.deepEqual(take.notes.map((n) => n.string + "/" + n.fret),
    expect.map((n) => n.string + "/" + n.fret));
  assert.ok(take.notes.length >= 12 && take.notes.length <= 18,
    `R15's twelve-to-eighteen notes (${take.notes.length})`);
  assert.ok(take.notes.every((n) => n.role === null), "a scale note wears no chord role");
});
