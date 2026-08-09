/* string-sets.mjs — slot- and degree-relative translation across string sets.
 *
 * Pure module: no DOM, no audio, structural assertions at load. Shared family
 * code (Triadetudes v0.6.6 is the first consumer; Tetrad Voice-Leading has
 * string sets too, and Phase B's drill layer inherits this either way).
 *
 * The law this module encodes: an étude's design is RELATIVE, not absolute.
 * An arpeggio pattern's meaning is which SLOT of the set — low, mid, high —
 * in what order; a pivot's meaning is which SCALE DEGREE, not which fret.
 * Store and display absolute string/fret numbers (they are what the player
 * reads), but translate through the relative form on any context change, so
 * the design survives instead of resetting.
 *
 * Golden rule 1: every translation is DERIVED by the named rule below and
 * asserted, never mapped per-set by hand. A set→pattern lookup table would
 * emit identical output today and is a Spec violation.
 */

// A string set is an array of distinct string numbers, 1 = highest pitch.
// lowToHigh orders it low-pitch → high-pitch (i.e. descending string numbers:
// [2,3,4] → [4,3,2]); a SLOT is an index into that order. 0 = lowest.
export function lowToHigh(set) {
  return [...set].sort((a, b) => b - a);
}

// parseArp's ceiling, shared so the module and the field agree
export const MAX_PATTERN = 16;

/** slotsOf([3,4,2,2], [2,3,4]) → [1,0,2,2] — mid, low, high, high */
export function slotsOf(pattern, set) {
  const order = lowToHigh(set);
  return pattern.map((sn) => {
    const k = order.indexOf(sn);
    if (k < 0) throw new Error(`slotsOf: string ${sn} not in set ${set.join("-")}`);
    return k;
  });
}

/** stringsOf([1,0,2,2], [3,4,5]) → [4,5,3,3] — the same figure on the new set */
export function stringsOf(slots, set) {
  const order = lowToHigh(set);
  return slots.map((k) => {
    if (!Number.isInteger(k) || k < 0 || k >= order.length)
      throw new Error(`stringsOf: slot ${k} outside a ${order.length}-string set`);
    return order[k];
  });
}

/** translatePattern: absolute strings → slots → absolute strings on the new
 * set. Total for equal-size sets (every set this family offers has three
 * strings), null passes through (a block chord has nothing to translate).
 * Derived, then asserted: the slot list must read back identical. */
export function translatePattern(pattern, fromSet, toSet) {
  if (pattern === null || pattern === undefined) return null;
  if (pattern.length > MAX_PATTERN)
    throw new Error(`translatePattern: ${pattern.length} notes exceeds the ${MAX_PATTERN}-note ceiling`);
  if (lowToHigh(fromSet).length !== lowToHigh(toSet).length)
    throw new Error("translatePattern: sets differ in size — translation is not total");
  const slots = slotsOf(pattern, fromSet);
  const out = stringsOf(slots, toSet);
  if (slotsOf(out, toSet).join() !== slots.join())
    throw new Error("translatePattern: slot list not preserved");
  return out;
}

/** the same slot on another set — how the pivot string travels */
export function translateString(sn, fromSet, toSet) {
  return stringsOf(slotsOf([sn], fromSet), toSet)[0];
}

/**
 * pivotWindow(notes, startDegree, nearFret) → [f0,f1,f2]
 *
 * notes: the scale positions on ONE string, ascending, as {fret, degree}
 * (degree 0-6; every scale in the family carries seven degrees, so a degree
 * survives any key or scale change). The window starts on the occurrence of
 * startDegree NEAREST nearFret — the box slides across the neck rather than
 * jumping (roadmap §1.2's rule, applied to manual context changes) — and
 * takes the next two scale notes up the same string.
 *
 * Occurrences too high on the neck to fit a full three-note window are not
 * candidates; if no candidate carries the degree at all (out-of-range
 * paranoia), the nearest-fitting window is taken clamped. Derived, then
 * asserted: three strictly ascending frets from the input list.
 */
export function pivotWindow(notes, startDegree, nearFret) {
  if (!Array.isArray(notes) || notes.length < 3)
    throw new Error("pivotWindow: need at least three scale positions");
  for (let i = 1; i < notes.length; i++)
    if (notes[i].fret <= notes[i - 1].fret)
      throw new Error("pivotWindow: positions must ascend");
  let best = -1;
  for (let i = 0; i <= notes.length - 3; i++)
    if (notes[i].degree === startDegree)
      if (best < 0 || Math.abs(notes[i].fret - nearFret) < Math.abs(notes[best].fret - nearFret))
        best = i;
  if (best < 0) {
    // no window-fitting occurrence (should not happen on a 15-fret neck:
    // any pitch class above fret 11 recurs 12 frets lower) — take the
    // nearest occurrence anywhere and clamp the window into range
    for (let i = 0; i < notes.length; i++)
      if (notes[i].degree === startDegree)
        if (best < 0 || Math.abs(notes[i].fret - nearFret) < Math.abs(notes[best].fret - nearFret))
          best = i;
    if (best < 0) throw new Error(`pivotWindow: degree ${startDegree} not on this string`);
    best = Math.min(best, notes.length - 3);
  }
  const w = [notes[best].fret, notes[best + 1].fret, notes[best + 2].fret];
  if (!(w[0] < w[1] && w[1] < w[2]))
    throw new Error("pivotWindow: derived window not ascending");
  return w;
}

// ---------- load-time structural assertions (golden rule 1, site form) ----------

{
  // translate(translate(p, A, B), B, A) === p — the round-trip invariant,
  // across every pair of the family's four sets and probe figures of every shape
  const SETS = [[1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 6]];
  const SLOT_PROBES = [[0], [1, 0, 2, 2], [2, 1, 0], [0, 0, 1, 2, 2, 1, 0, 0]];
  for (const A of SETS)
    for (const B of SETS)
      for (const slots of SLOT_PROBES) {
        const p = stringsOf(slots, A);
        const back = translatePattern(translatePattern(p, A, B), B, A);
        if (back.join() !== p.join())
          throw new Error("string-sets: translate round-trip is not the identity");
      }
  // the worked case from the item, as arithmetic
  if (slotsOf([3, 4, 2, 2], [2, 3, 4]).join() !== "1,0,2,2")
    throw new Error("string-sets: 3-4-2-2 on 2-3-4 must read mid,low,high,high");
  if (translatePattern([3, 4, 2, 2], [2, 3, 4], [3, 4, 5]).join("-") !== "4-5-3-3")
    throw new Error("string-sets: the worked case must translate to 4-5-3-3");
}
