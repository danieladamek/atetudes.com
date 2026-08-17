/* drill.mjs — THE SHARED DRILL LAYER (component v1, Phase B stage 2).
 *
 * Family spec §4.1 names this layer and says why it exists: "Substitute
 * Teacher wants a speed trainer, Modus Operandi wants a quiz, and left alone
 * those two ship as unrelated code. They are the same layer — TURN THE CURRENT
 * DOCUMENT INTO A REPEATABLE CHALLENGE — pointed at different documents."
 *
 * So this is deliberately NOT Triadetudes' arpeggiator relocated. The shipped
 * code speaks strings: `parseArp` accepts H/M/L or a digit and rejects it with
 * "string 2 isn't in the 1-2-3 set". Strings are Triadetudes' material, not the
 * drill's. What the drill layer actually knows is:
 *
 *     a PATTERN is an ordered walk over a material's SLOTS
 *     a SUBDIVISION divides a bar among that pattern's steps
 *     a SCHEDULE turns the two into onsets
 *
 * and none of those three sentences contains the word "string". A material is
 * declared by its consumer (`slotsOf`), the vocabulary and the error prose come
 * with it, and Triadetudes' behaviour — including the exact wording of its
 * errors — is reproduced by the material it passes in, not by a branch in here.
 *
 * WHAT IS HONESTLY STILL TRIADETUDES-SHAPED, recorded rather than hidden:
 * `MAX_STEPS = 16` is the family's figure ceiling (shared with motion.mjs), and
 * the L/M/H letter convention is a three-slot idiom that a five-slot material
 * would not use. Both are inputs here rather than constants, which is the most
 * a first extraction can honestly claim — the second consumer decides whether
 * the seam is in the right place, and it is cheap to move if not.
 *
 * Every function is pinned against the shipped study by
 * engine/tests/drill.test.mjs over a derived corpus.
 *
 * Pure: no DOM, no audio, no globals.
 */
import { noteEvents } from "./note-events.mjs";

/** the family's figure ceiling, shared with the motion grammar */
export const MAX_STEPS = 16;

/** A MATERIAL declares what a drill can walk over. Triadetudes passes its
 * string set; a map app passes its box degrees; a chart app its bars.
 *
 *   letters   { L: value, M: value, H: value }   the slot vocabulary
 *   values    [value, …]                         every legal slot value
 *   noun      "string"                           what one is called, for errors
 *   of        "the 1-2-3 set"                    what they belong to, for errors
 *
 * `letters` is ordered by the consumer, not by this module: L/M/H means
 * low/middle/high on a guitar set and would mean something else elsewhere. */
export function material({ letters, values, noun, of }) {
  const keys = Object.keys(letters);
  if (!keys.length) throw new Error("a drill material declares at least one slot letter");
  for (const k of keys)
    if (!values.includes(letters[k]))
      throw new Error(`slot "${k}" maps to ${letters[k]}, which is not one of this material's values`);
  return { letters, values: [...values], noun, of, keys };
}

/** Parse a pattern in slot vocabulary. Letters address slots; bare digits
 * address values directly, so old muscle memory and pasted configs are not
 * punished. Empty means empty — an empty field is a legitimate state, not an
 * error (the shipped field normalises to letters on sync).
 *
 * Returns { pattern } or { err } or { pattern: null } — never throws on user
 * text (charter §7: bad input is DATA). */
export function parsePattern(text, mat) {
  const letters = mat.keys.join("");
  const re = new RegExp("[" + letters + "]|\\d", "g");
  const toks = (String(text).toUpperCase().match(re) || []);
  if (!toks.length) return { pattern: null };
  if (toks.length > MAX_STEPS) return { err: "max " + MAX_STEPS + " notes" };
  const out = [];
  for (const t of toks) {
    if (t in mat.letters) out.push(mat.letters[t]);
    else {
      const d = +t;
      if (!mat.values.includes(d)) return { err: mat.noun + " " + d + " isn't in " + mat.of };
      out.push(d);
    }
  }
  return { pattern: out };
}

/** the pattern back in slot vocabulary — the display form of the same fact */
export function patternText(pattern, mat) {
  if (!pattern) return "";
  const back = new Map(Object.entries(mat.letters).map(([k, v]) => [v, k]));
  return pattern.map((v) => back.get(v) ?? String(v)).join("-");
}

/** the default walk: the anchored slot first, then the rest in the material's
 * own order — never a typed table */
export function defaultPattern(mat, lead) {
  const vals = mat.values;
  if (lead === undefined) return [...vals];
  if (!vals.includes(lead)) throw new Error("the lead slot is not in this material");
  return [lead, ...vals.filter((v) => v !== lead)];
}

/* ---------------- subdivision: dividing a bar among the steps ------------- */

/** the bar splits offered per meter. 7/4 carries the halves-of-seven and the
 * three-group rotations; [1,6]/[6,1] are deliberately absent pending the 5/4
 * asymmetry call. */
export const SPLITS = {
  4: [[4], [2, 2], [1, 1, 1, 1], [2, 1, 1], [1, 1, 2], [1, 2, 1]],
  3: [[3], [1, 2], [2, 1], [1, 1, 1]],
  5: [[5], [2, 3], [3, 2], [1, 4], [4, 1]],
  6: [[6], [3, 3], [2, 2, 2], [4, 2], [2, 4]],
  7: [[7], [4, 3], [3, 4], [2, 2, 3], [3, 2, 2], [2, 3, 2]],
};

/** keep the SHAPE of a bar split across a meter change where the same shape
 * exists; otherwise fall back to the whole bar */
export function splitFor(oldMeter, oldIdx, newMeter) {
  const old = SPLITS[oldMeter] && SPLITS[oldMeter][oldIdx];
  if (!old) return 0;
  const j = SPLITS[newMeter].findIndex((p) => p.join("+") === old.join("+"));
  return j >= 0 ? j : 0;
}

/** the notated value for one tuplet note sounding `d` beats: the smallest
 * standard value that is not shorter than it */
export function writtenValue(d) {
  return d > 2 ? 4 : d > 1 ? 2 : d > 0.5 ? 1 : d > 0.25 ? 0.5 : 0.25;
}

/** what `count` notes across `beats` beats are CALLED — the plain name when
 * the division is standard, otherwise the tuplet spelled out */
export function subdivisionName(beats, count) {
  const d = beats / count;
  if (d >= 4) return "whole";
  if (d === 2) return "half notes";
  if (d === 1) return "quarters";
  if (d === 0.5) return "8ths";
  if (d === 0.25) return "16ths";
  const w = writtenValue(d);
  const nm = { 4: "whole-note", 2: "half-note", 1: "quarter-note",
    0.5: "8th-note", 0.25: "16th-note" }[w];
  return nm + " " + (count === 3 ? "triplet" : count + "-tuplet") +
    " (" + count + " over " + beats + " beats)";
}

/* ---------------- the schedule: the challenge, sounded ------------------- */

/** One drill step's events. The onsets themselves belong to note-events.mjs —
 * the drill layer decides WHAT sounds in what order, never how a renderer and
 * the audio might each compute the timing (roadmap §1.4). */
export function scheduleStep({ voicing, order, bassMidi, durBeats, bpm }) {
  return noteEvents(voicing, order, bassMidi, durBeats, bpm);
}

/** the sounding order of a voicing's notes under a pattern: the pattern's
 * slots, resolved through the voicing. Returns null when the pattern is null
 * (a block attack has no order). */
export function orderFor(voicing, pattern, keyOf = (n) => n.string) {
  if (!pattern) return null;
  const by = {};
  for (const n of voicing.notes) by[keyOf(n)] = n;
  return pattern.map((v) => by[v]);
}
