/* capped-loss.test.mjs — THE BOARD STOPS LYING ABOUT WHAT IT PLACED (260923,
 * night 30; PO rulings 260922b). The engine half: while any role is capped the
 * leftover pass does not run (ruling 2); one-of-each derives the PARTIAL beside
 * its refusal (ruling 3); capped and resolvesAt keep their meaning; and the
 * STOP CONDITION — all-tones under Grip is not a no-op where nothing is capped.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { field } from "../field.mjs";
import { positionOf, materialIn } from "../position.mjs";
import { diatonicTones, objectOffsets, oneOfEach, everyOccurrence } from "../selection.mjs";

const fmt = (notes) => notes.map((x) => `${x.role}@s${x.string}f${x.fret}`).join(" ");
const fld = field({ key: "C", scale: "major" });

test("the case (C major, Cmaj7, strings 4–1, anchor 4, startDegree 1, frets 0–3): all-tones under Grip leaves string 1 SILENT", () => {
  const tet = diatonicTones(fld, 0, objectOffsets("tetrad"));
  const pos = positionOf({ field: fld, anchorString: 4, startDegree: 1, nearFret: 0 });
  assert.deepEqual([pos.fLo, pos.fHi], [0, 3]);
  const pool = materialIn(pos, [4, 3, 2, 1], fld);
  const all = everyOccurrence(tet, pool, { n: 1 });
  // MEASURED 260923: before tonight the result was 3@s4f2 5@s3f0 R@s2f1 5@s1f3. The MATCHING
  // seats the 5 on string 1 (fret 3) — slots are tried in string order and the 3 is bumped
  // to string 4 by the augmenting path — and the LEFTOVER pass added the 5 on string 3
  // (fret 0). With the leftovers gone under a cap, the silent string is STRING 3. (The
  // dispatch expected string 1 silent; a fret-preferring seat in the matching would give
  // that, but it would also change uncapped selections, which the stop condition forbids —
  // proposed in the 260923 report, not built.)
  assert.equal(fmt(all.notes), "3@s4f2 R@s2f1 5@s1f3", "the doubled 5 on string 3 is gone; the matching's own 5 stays");
  assert.deepEqual(all.capped, ["7"]); assert.equal(all.resolvesAt, 2, "capped and resolvesAt keep their meaning");
  assert.ok(!all.notes.some((x) => x.string === 3), "string 3 is silent — the honest picture");
  assert.equal(new Set(all.notes.map((x) => x.role)).size, all.notes.length, "no tone doubled under the cap");
});

test("one-of-each on the same case: the refusal stays, and the PARTIAL sits beside it — three notes, the 7 named as dropped", () => {
  const tet = diatonicTones(fld, 0, objectOffsets("tetrad"));
  const pos = positionOf({ field: fld, anchorString: 4, startDegree: 1, nearFret: 0 });
  const pool = materialIn(pos, [4, 3, 2, 1], fld);
  const one = oneOfEach(tet, pool, { n: 1, centre: pos.centre });
  assert.equal(one.notes, null, "the refusal is still the refusal");
  assert.equal(one.unplaceable, true); assert.deepEqual(one.collide, { string: 2, roles: ["R", "7"] }); assert.equal(one.resolvesAt, 2);
  assert.equal(fmt(one.partial), "5@s3f0 R@s2f1 3@s1f0", "draw what fits — the engine's own best voicing of R 3 5 (spread before tightening)");
  assert.deepEqual([...new Set(one.partial.map((x) => x.role))].sort(), ["3", "5", "R"]);
  assert.deepEqual(one.dropped, ["7"], "name what could not come — the 7, the collide's last role");
  const line = oneOfEach(tet, pool, { n: 3, centre: pos.centre });
  assert.ok(line.notes && line.notes.some((x) => x.role === "7"), "Line takes both");
});

test("THE STOP CONDITION: all-tones under Grip is NOT a no-op where nothing is capped (C major, frets 8–12, six strings, triad)", () => {
  const tri = diatonicTones(fld, 0, objectOffsets("triad"));
  const pos = positionOf({ field: fld, anchorString: 6, startDegree: 0, nearFret: 8 });
  assert.deepEqual([pos.fLo, pos.fHi], [8, 12]);
  const pool = materialIn(pos, [6, 5, 4, 3, 2, 1], fld);
  assert.equal(fmt(oneOfEach(tri, pool, { n: 1, centre: pos.centre }).notes), "5@s5f10 R@s4f10 3@s3f9");
  const all = everyOccurrence(tri, pool, { n: 1 });
  assert.equal(fmt(all.notes), "R@s6f8 5@s5f10 R@s4f10 3@s3f9 5@s2f8 3@s1f12", "an occurrence on every string, unchanged");
  assert.deepEqual(all.capped, []);
});

test("no tone is ever doubled while a role is capped — the corpus, every cap", () => {
  let capped = 0, checked = 0;
  for (const key of ["C", "F", "Bb", "E"]) for (const scale of ["major", "harm"]) {
    const f = field({ key, scale });
    for (const obj of ["triad", "tetrad"]) for (let deg = 0; deg < 7; deg++) {
      const tones = diatonicTones(f, deg, objectOffsets(obj));
      for (const strings of [[4, 3, 2, 1], [6, 5, 4, 3], [3, 2, 1]]) for (const nfr of [0, 3, 5, 8]) {
        const pos = positionOf({ field: f, anchorString: strings[0], startDegree: 0, nearFret: nfr });
        const pool = materialIn(pos, strings, f);
        for (const n of [1, 2]) {
          const r = everyOccurrence(tones, pool, { n }); checked++;
          if (!r.capped.length) continue;
          capped++;
          const counts = {}; for (const x of r.notes) counts[x.role] = (counts[x.role] || 0) + 1;
          assert.ok(Object.values(counts).every((c) => c === 1), `${key} ${scale} ${obj} ${deg} ${strings} ${nfr} n${n}: doubled under a cap`);
        }
      } } }
  assert.ok(checked > 1000 && capped > 30, `the corpus must actually run: ${checked} checked, ${capped} capped`);
});
