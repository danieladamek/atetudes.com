/* string-run.mjs — THE FREE STRING SET: any set of strings, contiguous or
 * skipped, with a stored identity and a derived label (Multetudes child 2;
 * multetudes-prd.md §2.3 — closes G6 and G16 at one note per string).
 *
 * THE LOAD-BEARING IDEA (the item's): a string skip is how you ask for a
 * spread voicing. On a skipped set the interval between adjacent chosen
 * strings widens, so close-position stacks fail the fret filter and the drops
 * survive. There is no "spread voicing" shape type, and there must not be one.
 * What was missing was never the generator (placeOnSet consults adjacency
 * nowhere) — it was CHOOSING the set, STORING it, and LABELLING it.
 *
 *   the identity   the run itself: an ARRAY OF STRINGS, stored as such.
 *                  `fromSetIndex` is the LOAD-TIME MIGRATION ALIAS the 260820
 *                  measurements prescribe — old configs restore through it;
 *                  nothing ever writes setIndex again (no dual-write).
 *   the label      DERIVED from the run's strings in the family's dialect —
 *                  high → low, en-dashes, uppercase E (N4) — from the open
 *                  strings' own pitch classes. Never enumerated; the test
 *                  greps this file to prove no label literal exists.
 *   the wiring     translation goes THROUGH string-sets.mjs (slotsOf /
 *                  stringsOf / translatePattern) — the relative-state
 *                  doctrine's mechanism, which nothing imported until
 *                  tonight. Nothing is reimplemented here.
 *
 * THE UNEQUAL-SIZE RULE, decided and written down (the item demands an
 * answer; translatePattern refuses by design and keeps refusing):
 *
 *   Translation is EXACT into an equal-or-larger run — every slot exists, and
 *   the equal case round-trips as the identity (string-sets.mjs's own law).
 *   Into a SMALLER run, a slot past the top CLAMPS TO THE TOP SLOT — the
 *   figure keeps its contour and its low notes, and its ceiling flattens onto
 *   the run's highest string — and the translation REPORTS which steps it
 *   clamped. A four-slot figure on a three-string run means: play the same
 *   walk, and the note that lived on the missing fourth string lives on the
 *   highest string you kept. Loud, lossy, and stated — never silent (§4.4;
 *   drill.orderFor's silent overwrite is the named defect class).
 *
 * Pure: no DOM, no globals, load-time structural assertions.
 */
import { lowToHigh, slotsOf, stringsOf, translatePattern } from "./string-sets.mjs";
import { OPEN_MIDI } from "./field.mjs";

/* an open string's letter, derived from its pitch class — every open string
 * of the derived tuning is a natural, which the load assertions prove */
const NATURAL = { 0: "C", 2: "D", 4: "E", 5: "F", 7: "G", 9: "A", 11: "B" };
const letterOf = (s) => {
  const name = NATURAL[((OPEN_MIDI[s] % 12) + 12) % 12];
  if (!name) throw new Error(`string-run: open string ${s} is not a natural — the label rule needs a decision`);
  return name;
};

/** makeRun([6,4,3,1]) → { strings, label, contiguous, opens }
 * `strings` stored low pitch → high pitch (descending numbers — the family's
 * storage order); `opens` parallel open-string midis (placeOnSet's `set`);
 * `label` high → low (Shell 4's reading), derived. */
export function makeRun(strings) {
  if (!Array.isArray(strings) || !strings.length)
    throw new Error("string-run: a run is a non-empty array of strings");
  const set = [...new Set(strings)];
  if (set.length !== strings.length) throw new Error("string-run: a run repeats a string");
  for (const s of set)
    if (!Number.isInteger(s) || s < 1 || s > 6)
      throw new Error(`string-run: string ${s} is not a real string`);
  const lh = lowToHigh(set);                       // descending numbers = ascending pitch
  const highToLow = [...set].sort((a, b) => a - b); // ascending numbers = descending pitch
  const run = {
    strings: lh,
    opens: lh.map((s) => OPEN_MIDI[s]),
    label: highToLow.map(letterOf).join("–"),
    contiguous: lh.every((s, i) => i === 0 || s === lh[i - 1] - 1),
  };
  for (let i = 1; i < run.opens.length; i++)
    if (run.opens[i] <= run.opens[i - 1])
      throw new Error("string-run: opens must ascend low → high with the strings");
  return run;
}

/** THE MIGRATION ALIAS: an old config's `setIndex`, read against the
 * enumeration it indexed (the caller passes it — engine/tetrad-sequence.mjs's
 * STRING_SETS). Load-time only; nothing writes setIndex back. */
export function fromSetIndex(i, sets) {
  if (!Array.isArray(sets) || !sets[i])
    throw new Error(`string-run: setIndex ${i} does not name a set in the given enumeration`);
  return makeRun(sets[i].strings);
}

/** translateFigure(pattern, fromRun, toRun) → { pattern, clamped }
 * pattern: absolute string numbers (the player's reading). Equal sizes
 * delegate to string-sets.mjs's translatePattern, exactness asserted there.
 * Unequal sizes apply THE RULE above; `clamped` lists the 0-based steps whose
 * slot was flattened onto the top slot — [] means the translation was exact. */
export function translateFigure(pattern, fromRun, toRun) {
  if (pattern === null || pattern === undefined) return { pattern: null, clamped: [] };
  if (fromRun.strings.length === toRun.strings.length)
    return { pattern: translatePattern(pattern, fromRun.strings, toRun.strings), clamped: [] };
  const slots = slotsOf(pattern, fromRun.strings);
  const top = toRun.strings.length - 1;
  const clamped = [];
  const mapped = slots.map((k, i) => {
    if (k <= top) return k;
    clamped.push(i);
    return top;
  });
  const out = stringsOf(mapped, toRun.strings);
  if (slots.some((k) => k <= top)) {
    // derived, then asserted: every unclamped step still reads the same slot
    const back = slotsOf(out, toRun.strings);
    for (let i = 0; i < slots.length; i++)
      if (!clamped.includes(i) && back[i] !== slots[i])
        throw new Error("string-run: an unclamped step changed slot in translation");
  }
  return { pattern: out, clamped };
}

/* ---------------- load-time structural assertions (golden rule 1) ---------------- */

{
  // every open string is a natural, so the label rule is total for this tuning
  for (let s = 1; s <= 6; s++) letterOf(s);
  // the label reads high → low: four contiguous runs, spot arithmetic
  const r = makeRun([6, 5, 4, 3]);
  if (r.label.split("–").length !== 4 || !r.contiguous)
    throw new Error("string-run: the contiguous four-string run mislabels");
  const sk = makeRun([6, 4, 3, 1]);
  if (sk.contiguous) throw new Error("string-run: {6,4,3,1} is not contiguous");
  if (sk.strings.join() !== "6,4,3,1")
    throw new Error("string-run: storage order is low pitch → high pitch");
  // growing is exact; the clamp reports; nothing is silent
  const from = makeRun([4, 3, 2, 1]), to3 = makeRun([3, 2, 1]);
  const t = translateFigure([4, 3, 4, 3, 2, 1], from, to3);
  if (!t.clamped.length)
    throw new Error("string-run: a 4-slot figure on a 3-string run must report its clamp");
  const grow = translateFigure([3, 2, 1], to3, from);
  if (grow.clamped.length || grow.pattern.join() !== "4,3,2")
    throw new Error("string-run: growing a run must translate exactly, by slot");
}
