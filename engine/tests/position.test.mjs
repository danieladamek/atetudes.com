/* position.test.mjs — the ratified window as an engine value.
 *
 * The load-bearing pins:
 *   - the DIFFERENTIAL against pivotWindow: positionOf must be that function's
 *     answer, not a second implementation's (the item: "pivotWindow has one
 *     caller shape and no second implementation exists")
 *   - the IDENTITY pin: the same physical box reads "from the 6th" in B♭
 *     Ionian and "from the 5th" in C Dorian — the box did not move, the
 *     centre did
 *   - the e5ba874 pin: a window of three ADJACENT frets (the flattening that
 *     took a week to find) can never come out of this module
 *   - materialIn is UNCAPPED: the pool offers every note; ceilings constrain
 *     results, not pools
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { field, notesOn } from "../field.mjs";
import { positionOf, step, regionOf, materialIn } from "../position.mjs";
import { pivotWindow } from "../string-sets.mjs";

const here = dirname(fileURLToPath(import.meta.url));

test("the window IS pivotWindow's — differential over keys × scales × anchors × degrees", () => {
  let compared = 0;
  for (const key of ["C", "Eb", "F#", "A"])
    for (const scale of ["major", "harm", "mel"])
      for (let ref = 0; ref < 7; ref += 3)
        for (let s = 1; s <= 6; s++)
          for (let d = 0; d < 7; d++)
            for (const near of [0, 5, 12]) {
              const f = field({ key, scale, ref });
              const p = positionOf({ field: f, anchorString: s, startDegree: d, nearFret: near });
              const direct = pivotWindow(
                notesOn(s, f).map((n) => ({ fret: n.fret, degree: n.deg })), d, near);
              assert.deepEqual(p.frets, direct, `${key} ${scale} ref${ref} s${s} d${d} near${near}`);
              compared++;
            }
  assert.ok(compared >= 3000, `the differential must actually run (${compared} comparisons)`);
});

test("position.mjs derives through pivotWindow and declares no second window search", () => {
  const src = readFileSync(join(here, "..", "position.mjs"), "utf8");
  assert.match(src, /import \{ pivotWindow \} from "\.\/string-sets\.mjs"/,
    "the relative window already exists; positionOf must reach it by import");
  // comment-blind by design (engine/README.md): the module must not carry a
  // second nearest-occurrence search — pivotWindow's distinguishing tokens
  // stay out of this file in code AND prose
  assert.ok(!src.includes("Math.abs(notes["),
    "position.mjs contains pivotWindow's own search shape — a second implementation");
});

test("THE IDENTITY PIN: the same box is 'from the 6th' in B♭ Ionian and 'from the 5th' in C Dorian", () => {
  const ionian = field({ key: "Bb", scale: "major", ref: 0 });
  const dorian = field({ key: "Bb", scale: "major", ref: 1 });   // same collection, centre C
  // start on G (keyDeg 5): the 6th of B♭, the 5th of C
  const pA = positionOf({ field: ionian, anchorString: 6, startDegree: 5, nearFret: 3 });
  const pB = positionOf({ field: dorian, anchorString: 6, startDegree: 4, nearFret: 3 });
  assert.deepEqual(pA.frets, pB.frets, "the box moved — it must not");
  assert.deepEqual(pA.frets, [3, 5, 6], "G–A–B♭ on string 6, third position");
  assert.equal(pA.startDeg, 5, "read against B♭: from the 6th");
  assert.equal(pB.startDeg, 4, "read against C: from the 5th");
});

test("the e5ba874 pin: no window of three adjacent frets, ever", () => {
  for (const key of ["C", "Db", "E", "G", "Bb"])
    for (const scale of ["major", "harm", "mel"])
      for (let s = 1; s <= 6; s++)
        for (let d = 0; d < 7; d++) {
          const p = positionOf({ field: field({ key, scale }), anchorString: s,
            startDegree: d, nearFret: 7 });
          const span = p.fHi - p.fLo;
          assert.ok(span === 3 || span === 4,
            `${key} ${scale} s${s} d${d}: span ${span} — a scale triple is 4 or 5 positions, never 3`);
        }
});

test("a position has no number: identity is anchor + start degree, and step is box shift", () => {
  const f = field({ key: "C", scale: "major" });
  const p = positionOf({ field: f, anchorString: 5, startDegree: 2, nearFret: 5 });
  const up = step(p, 1, f);
  const aNotes = notesOn(5, f);
  const i = aNotes.findIndex((n) => n.fret === p.fLo);
  assert.equal(up.fLo, aNotes[i + 1].fret, "the anchor moved exactly one scale note");
  assert.deepEqual(step(up, -1, f).frets, p.frets, "stepping back returns the same window");
  // at the ends it stays put rather than inventing frets
  let low = positionOf({ field: f, anchorString: 5, startDegree: aNotes[0].deg, nearFret: 0 });
  assert.deepEqual(step(low, -1, f).frets, low.frets, "no window below the nut");
});

test("the region: a set is a SET — {6,4,3,1} is as legal as {4,3,2,1}, and the anchor must be in it", () => {
  const f = field({ key: "C", scale: "major" });
  const p = positionOf({ field: f, anchorString: 6, startDegree: 0, nearFret: 5 });
  const skipped = regionOf(p, [6, 4, 3, 1]);
  const contiguous = regionOf(p, [6, 5, 4, 3]);
  // same arithmetic, no special case: both derive by the same sort, same span
  assert.deepEqual(skipped.strings, [6, 4, 3, 1]);
  assert.deepEqual(contiguous.strings, [6, 5, 4, 3]);
  assert.equal(skipped.fLo, contiguous.fLo);
  assert.equal(skipped.fHi, contiguous.fHi);
  assert.equal(skipped.strLo, 6); assert.equal(skipped.strHi, 1);
  assert.throws(() => regionOf(p, [4, 3, 2, 1]), /anchor/,
    "a region that quietly dropped its anchor would be the silent-failure class");
  assert.throws(() => regionOf(p, [4, 4, 3]), /repeats/);
});

test("materialIn is UNCAPPED: the pool holds every field note the window offers", () => {
  const f = field({ key: "C", scale: "major" });
  const p = positionOf({ field: f, anchorString: 6, startDegree: 0, nearFret: 5 });
  for (const strings of [[6, 4, 3, 1], [6, 5, 4, 3, 2, 1], [6]]) {
    const m = materialIn(p, strings, f);
    // differential completeness: exactly the notesOn filter, per string
    const expect = strings.sort((a, b) => b - a)
      .flatMap((s) => notesOn(s, f).filter((n) => n.fret >= p.fLo && n.fret <= p.fHi));
    assert.deepEqual(m, expect, `strings ${strings.join(",")}`);
    // and every string offers AT LEAST two notes in a 4-5 position window —
    // the cap-the-pool defect would leave exactly one
    for (const s of strings)
      assert.ok(m.filter((n) => n.string === s).length >= 2,
        `string ${s} offers ${m.filter((n) => n.string === s).length} — a capped pool`);
  }
});
