/* position.mjs — THE POSITION: the ratified window, generalised from one
 * anchor string to a set of them (Multetudes child 1; multetudes-prd.md §2.2).
 *
 * THE LAW THIS ENCODES (C5, ratified 2026-08-21 — "the window is a position"):
 * the isolation window is a rectangle — the span of THREE CONSECUTIVE SCALE
 * NOTES on the anchor string wide, by the strings of the set tall. It is
 * RIGID: never stretches, never reports, never explains itself. A setting,
 * not a consequence. Notes outside it are stretches, shown unremarked — that
 * is the teaching. The ruling's own generalisation clause is this module's
 * reason to exist: "three strings of triads · four of tetrads · six for a
 * full scale box — the same rectangle, the same meaning, a different height."
 *
 * A POSITION HAS NO NUMBER (Daniel, 2026-08-23). Its identity is WHERE IT
 * STARTS — anchor string plus start degree — and the start degree is read
 * AGAINST THE REFERENCE: the same physical box starts "from the 6th" in
 * B♭ Ionian and "from the 5th" in C Dorian, because the box did not move,
 * the centre did (pinned in engine/tests/position.test.mjs).
 *
 * THE WINDOW IS DERIVED THROUGH string-sets.mjs's pivotWindow — the relative
 * window that already exists — NOT reimplemented. e5ba874 flattened "three
 * chosen scale notes" into "three adjacent frets" once and it took a week to
 * find; the differential pin in the tests keeps this module honest against
 * pivotWindow itself.
 *
 * TWO WORDS, KEPT APART (G9 was one word doing both jobs):
 *   the ZONE     isolation.mjs's single-string value the optimiser binds
 *                against — untouched, correct, and NOT this module's.
 *   the REGION   the rectangle the neck draws and the isolation READS: the
 *                window's fret span by the strings of the set. regionOf()
 *                names it.
 *
 * Pure: no DOM, no globals, load-time structural assertions.
 */
import { pivotWindow } from "./string-sets.mjs";
import { field, notesOn } from "./field.mjs";

const span3 = (frets) => frets[2] - frets[0];

/**
 * positionOf({ field, anchorString, startDegree, nearFret }) → the window:
 *   { anchorString, startDeg, frets: [f0,f1,f2], fLo, fHi, centre }
 * startDegree is AGAINST THE REFERENCE (the position's identity); the window
 * starts on the occurrence of that degree nearest nearFret and takes the next
 * two scale notes up the same string — pivotWindow's own rule, unrepeated.
 */
export function positionOf({ field: fld, anchorString, startDegree, nearFret = 5 } = {}) {
  if (!fld || !Array.isArray(fld.pcs)) throw new Error("positionOf: no field");
  if (!Number.isInteger(startDegree) || startDegree < 0 || startDegree > 6)
    throw new Error(`positionOf: startDegree is a degree 0..6, not ${startDegree}`);
  const aNotes = notesOn(anchorString, fld);
  const frets = pivotWindow(
    aNotes.map((n) => ({ fret: n.fret, degree: n.deg })), startDegree, nearFret);
  // derived, then asserted: three consecutive scale notes span 3 or 4 frets
  // (four or five positions — measured 2,466 times in the 260820 spike, never
  // anything else); a 2-fret span would mean adjacent frets, the e5ba874 shape
  if (span3(frets) !== 3 && span3(frets) !== 4)
    throw new Error(`positionOf: window ${frets.join(",")} spans ${span3(frets)} frets — ` +
      "a scale triple spans 3 or 4; adjacent frets are the flattening the ruling retired");
  return {
    anchorString, startDeg: startDegree, frets,
    fLo: frets[0], fHi: frets[2],
    centre: (frets[0] + frets[1] + frets[2]) / 3,
  };
}

/** step(position, ±1, field) → the next window: the anchor moving one scale
 * note along the anchor string. This is BOX SHIFT, the only travel the model
 * has (the stretch pivot is parked). At the string's ends it stays put. */
export function step(pos, dir, fld) {
  if (dir !== 1 && dir !== -1) throw new Error("step: dir is +1 or -1");
  const aNotes = notesOn(pos.anchorString, fld);
  const i = aNotes.findIndex((n) => n.fret === pos.fLo);
  if (i < 0)
    throw new Error("step: the position's start is not a scale note on its anchor string — wrong field?");
  const ni = Math.max(0, Math.min(aNotes.length - 3, i + dir));
  const next = positionOf({ field: fld, anchorString: pos.anchorString,
    startDegree: aNotes[ni].deg, nearFret: aNotes[ni].fret });
  if (next.fLo !== aNotes[ni].fret)
    throw new Error("step: the stepped window did not start on the next scale note");
  return next;
}

/** the REGION: the window's height made explicit — the rectangle the neck
 * draws and the isolation reads. The set is a SET (multetudes-prd §2.3):
 * `{6,4,3,1}` is as legal as `{4,3,2,1}`; the region spans min..max of it and
 * an excluded string inside the span is the SURFACE's fact to show, not this
 * value's to hide. */
export function regionOf(pos, strings) {
  if (!Array.isArray(strings) || !strings.length)
    throw new Error("regionOf: the set is a non-empty array of strings");
  const set = [...new Set(strings)];
  if (set.length !== strings.length) throw new Error("regionOf: the set repeats a string");
  for (const s of set)
    if (!Number.isInteger(s) || s < 1 || s > 6) throw new Error(`regionOf: string ${s} is not a real string`);
  if (!set.includes(pos.anchorString))
    throw new Error(`regionOf: the anchor (string ${pos.anchorString}) is not in the set ${set.join(",")}`);
  return {
    fLo: pos.fLo, fHi: pos.fHi,
    /* stored low pitch → high pitch (descending string numbers), the family's
     * storage order (string-sets.mjs law: 1 is the highest pitch) */
    strings: [...set].sort((a, b) => b - a),
    strLo: Math.max(...set), strHi: Math.min(...set),
  };
}

/** materialIn(position, strings, field) → every note the window offers on
 * those strings, low pitch first. UNCAPPED — the per-string ceiling
 * constrains the RESULT, not the pool: capping the material first makes
 * almost every chord unfindable, because the root is rarely the lowest scale
 * note on its string (lineVoicing already gets this right; this matches it). */
export function materialIn(pos, strings, fld) {
  const region = regionOf(pos, strings);
  const out = [];
  for (const s of region.strings)
    out.push(...notesOn(s, fld).filter((n) => n.fret >= pos.fLo && n.fret <= pos.fHi));
  for (const n of out)
    if (fld.degOf(n.midi) < 0)
      throw new Error("materialIn: a note outside the field leaked into the material");
  return out;
}

/* ---------------- load-time structural assertions (golden rule 1) ---------------- */

{
  // every anchor string × every start degree of C major yields a lawful window,
  // and stepping is reversible in the string's interior
  const fld = field({ key: "C", scale: "major" });
  for (let s = 1; s <= 6; s++)
    for (let d = 0; d < 7; d++) {
      const p = positionOf({ field: fld, anchorString: s, startDegree: d, nearFret: 5 });
      if (!(p.fLo < p.frets[1] && p.frets[1] < p.fHi))
        throw new Error("position: a derived window is not ascending");
      const up = step(p, 1, fld);
      if (up.fLo !== p.fLo) {                      // moved (not pinned at an end)
        const back = step(up, -1, fld);
        if (back.frets.join() !== p.frets.join())
          throw new Error("position: step up then down did not return the same window");
      }
    }
  // the region of a skipped set spans min..max and keeps the anchor honest
  const p6 = positionOf({ field: fld, anchorString: 6, startDegree: 0, nearFret: 5 });
  const r = regionOf(p6, [6, 4, 3, 1]);
  if (r.strings.join() !== "6,4,3,1" || r.strLo !== 6 || r.strHi !== 1)
    throw new Error("position: the region of {6,4,3,1} is wrong");
  // the material is uncapped: one string offers more than one note per window
  const m = materialIn(p6, [6], fld);
  if (m.length < 2)
    throw new Error("position: a 3-or-4-fret window on one string must offer at least two scale notes");
}
