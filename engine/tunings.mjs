/* tunings.mjs — THE NAMED TUNINGS, AND THE STEP (alternate tunings item 2, night 47, 261009).
 *
 * Item 1 made the tuning the field's fact (field.mjs: opensOf, assertOpens — well-formedness,
 * the ±6 window against the standard rule) and spelled an open string by the direction of its
 * move (open-string.mjs). This module is what an EDITOR reads:
 *
 *   THE NAMED TABLE — the eight names below. A vocabulary, not a computable fact, so it is DATA, stated ONCE
 *   (Daniel's ruling 3, 261008: "presets are a named table, read both ways"). Applying a name
 *   is reading the table forward; the row NAMING ITSELF when the six steppers spell one is
 *   reading it backward — nameOf compares total offsets against the same table, never a
 *   second list (rule 6). Offsets are semitones from standard per string number, §7's shape.
 *
 *   THE STEP — canStep(tuning, string, dir) answers "may this string move one semitone this
 *   way?" BEFORE the move, with the reason when not: a move that would carry a string past a
 *   neighbour (§4: slots are pitch-ordered; a crossed tuning would change what every stored
 *   figure means, silently) or out of the ±6 window. This is the user-facing "no" — inert at
 *   the point of the move, said there; assertOpens's throw is the wrong layer for it and is
 *   never reached from an editor that asks first. The neighbour is named by what it is and
 *   what it sounds (rule 14): "string 4, which sounds D".
 *
 * Pure; load-time assertions.
 */
import { OPEN_MIDI, STRINGS, TUNING_RANGE, opensOf } from "./field.mjs";
import { openStringName } from "./open-string.mjs";

export const STANDARD_NAME = "standard";

/** THE ONE TABLE. Offsets from standard by string number; absent strings unmoved. */
export const NAMED_TUNINGS = Object.freeze([
  { name: "drop D",          offsets: { 6: -2 } },
  { name: "DADGAD",          offsets: { 6: -2, 2: -2, 1: -2 } },
  { name: "open G",          offsets: { 6: -2, 5: -2, 1: -2 } },
  { name: "open D",          offsets: { 6: -2, 3: -1, 2: -2, 1: -2 } },
  { name: "open E",          offsets: { 5: 2, 4: 2, 3: 1 } },
  { name: "half-step down",  offsets: { 6: -1, 5: -1, 4: -1, 3: -1, 2: -1, 1: -1 } },
  { name: "whole-step down", offsets: { 6: -2, 5: -2, 4: -2, 3: -2, 2: -2, 1: -2 } },
  { name: "drop C",          offsets: { 6: -4, 5: -2, 4: -2, 3: -2, 2: -2, 1: -2 } },
].map((t) => Object.freeze({ name: t.name, offsets: Object.freeze({ ...t.offsets }) })));

/** every string's offset, zeros included — the one shape two tunings are compared in */
export function totalOffsets(tuning) {
  const out = {};
  for (const s of STRINGS) out[s] = tuning && Number.isInteger(tuning[s]) ? tuning[s] : 0;
  return out;
}

const sameTuning = (a, b) => STRINGS.every((s) => totalOffsets(a)[s] === totalOffsets(b)[s]);

/** the table read backward: the name the six offsets spell, "standard" for none moved, null
 * for a tuning no name spells — the row ceases to name itself the moment one string moves */
export function nameOf(tuning) {
  const t = totalOffsets(tuning);
  if (STRINGS.every((s) => t[s] === 0)) return STANDARD_NAME;
  const hit = NAMED_TUNINGS.find((n) => sameTuning(n.offsets, t));
  return hit ? hit.name : null;
}

/** may `string` move one semitone in `dir` (+1 up, −1 down)? { ok } or { ok:false, reason } */
export function canStep(tuning, string, dir) {
  if (!STRINGS.includes(string)) throw new Error(`tunings: string ${string} is not a real string`);
  if (dir !== 1 && dir !== -1) throw new Error("tunings: a step is one semitone, up or down");
  const t = totalOffsets(tuning);
  const next = t[string] + dir;
  if (Math.abs(next) > TUNING_RANGE)
    return { ok: false, reason: `six semitones is the window — this string is at its ${dir > 0 ? "highest" : "lowest"}` };
  const opens = opensOf(t);
  const midi = opens[string] + dir;
  const neighbour = dir > 0 ? string - 1 : string + 1;   // string 1 is the highest: up meets the next-lower number
  if (STRINGS.includes(neighbour)) {
    const nm = opens[neighbour];
    if (dir > 0 ? midi >= nm : midi <= nm)
      return { ok: false, reason: `would pass string ${neighbour}, which sounds ${openStringName(nm, OPEN_MIDI[neighbour])}` };   // the default is the spelling's reference
  }
  return { ok: true };
}

/** the tuning after one legal step — a refused step throws, so nothing silently clamps */
export function stepped(tuning, string, dir) {
  if (Math.abs(dir) !== 1) {
    // a multi-semitone move is walked one step at a time, so every refusal is the step's own
    let t = totalOffsets(tuning);
    for (let i = 0; i < Math.abs(dir); i++) t = stepped(t, string, Math.sign(dir));
    return t;
  }
  const r = canStep(tuning, string, dir);
  if (!r.ok) throw new Error(`tunings: refused — ${r.reason}`);
  const t = totalOffsets(tuning); t[string] += dir;
  return t;
}

{
  // the table is well-formed and its names are its own
  for (const n of NAMED_TUNINGS) { opensOf(n.offsets); if (nameOf(n.offsets) !== n.name) throw new Error(`tunings: ${n.name} does not name itself`); }
  if (new Set(NAMED_TUNINGS.map((n) => n.name)).size !== NAMED_TUNINGS.length) throw new Error("tunings: a name is stated twice");
  if (nameOf({}) !== STANDARD_NAME) throw new Error("tunings: no move is standard");
  if (canStep({}, 5, 1).ok !== true || canStep(stepped({}, 5, 4), 5, 1).ok !== false) throw new Error("tunings: the crossing refusal does not hold — A up five meets D");
}
