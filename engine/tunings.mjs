/* tunings.mjs — THE NAMED TUNINGS, AND THE STEP (alternate tunings item 2, night 47, 261009).
 *
 * Item 1 made the tuning the field's fact (field.mjs: opensOf, assertOpens — well-formedness,
 * the ±6 window against the standard rule) and spelled an open string by the direction of its
 * move (open-string.mjs). This module is what an EDITOR reads:
 *
 *   THE NAMED TABLE — the names below. A vocabulary, not a computable fact, so it is DATA, stated ONCE
 *   (Daniel's ruling 3, 261008: "presets are a named table, read both ways"). Applying a name
 *   is reading the table forward; the row NAMING ITSELF when the six steppers spell one is
 *   reading it backward — nameOf compares total offsets against the same table, never a
 *   second list (rule 6). Offsets are semitones from standard per string number, §7's shape.
 *   The one entry that IS a computable fact — all fourths, a stack of perfect fourths from
 *   the sixth string — is derived, not typed.
 *
 *   WHAT THE TABLE HOLDS, AND WHY (the 261009 injection, Daniel's rulings):
 *   - a name that is another name plus a UNIFORM shift is redundant once the global stepper
 *     exists (the stepper IS "half-step down", "whole-step down", and "drop C" = drop D −2 —
 *     "just a full string register shift of drop D"). Those three left. Computed over the
 *     table the rule catches one more pair — open E = open D +2 — and OPEN E STAYS BY RULING:
 *     slide players name it as its own tuning, and it sits at a materially higher tension
 *     and brightness than open D, a difference the offsets cannot represent. Idiom outranks
 *     the arithmetic here; a session re-deriving the rule will find this pair again, and
 *     this comment is why it is not removed (rule 7). tunings.test asserts the pair is the
 *     ONLY shape-duplicate in the table.
 *   - a NAMED tuning may carry its own SPELLING for a string (Daniel, 261009): open D is
 *     D A D F♯ A D — the F♯ is the third of the chord it is named for — where the direction
 *     rule (open-string.mjs, unchanged: the label names the instrument, not the field) says
 *     G♭. The override is an optional per-string entry in THIS table and nowhere else; the
 *     label site prefers it ONLY on an exact match (a shifted open D is not open D, and its
 *     third string has moved somewhere the spelling does not describe); and its count is
 *     pinned at one — a second is a new decision and must arrive as one.
 *
 *   THE READING — readTuning: an EXACT match first (the name, no register note), else a
 *   SHAPE match (two tunings have the same shape when their offsets differ by a constant;
 *   the name plus the register shift — old "drop C" reads "drop D, a whole step down"), else
 *   unnamed. Exact-first is not optional: open D and open E share a shape, and only the
 *   exact match tells them apart — open D shifted up a whole step IS open E, and says so.
 *
 *   THE STEP — canStep(tuning, string, dir) answers "may this string move one semitone this
 *   way?" BEFORE the move, with the reason when not: a move that would carry a string past a
 *   neighbour (§4: slots are pitch-ordered; a crossed tuning would change what every stored
 *   figure means, silently) or out of the ±6 window. This is the user-facing "no" — inert at
 *   the point of the move, said there; assertOpens's throw is the wrong layer for it and is
 *   never reached from an editor that asks first. The neighbour is named by what it is and
 *   what it sounds (rule 14): "string 4, which sounds D".
 *
 *   THE GLOBAL STEP — canStepAll(tuning, dir) moves all six together from where they are. A
 *   uniform move never crosses a neighbour (the order is invariant), so only the window can
 *   refuse it, and it is refused whole when ANY string cannot take it, naming that string —
 *   never a clamp that moves five and skips one. One window law, two callers (rule 6).
 *
 * Pure; load-time assertions.
 */
import { OPEN_MIDI, STRINGS, TUNING_RANGE, opensOf } from "./field.mjs";
import { openStringName } from "./open-string.mjs";

export const STANDARD_NAME = "standard";

/** all fourths, derived: a perfect fourth (five semitones) from each string to the next,
 * from the sixth string's standard E — E A D G C F; strings 2 and 1 each rise a semitone */
const allFourths = () => {
  const out = {};
  for (const s of STRINGS) { const o = OPEN_MIDI[6] + 5 * (6 - s) - OPEN_MIDI[s]; if (o) out[s] = o; }   // offsets are from the default, by definition
  return out;
};

/** THE ONE TABLE. Offsets from standard by string number; absent strings unmoved. `spell`,
 * when present, is the name's own spelling for a string (see the header — one today). */
export const NAMED_TUNINGS = Object.freeze([
  { name: "drop D",      offsets: { 6: -2 } },
  { name: "DADGAD",      offsets: { 6: -2, 2: -2, 1: -2 } },
  { name: "open G",      offsets: { 6: -2, 5: -2, 1: -2 } },
  { name: "open D",      offsets: { 6: -2, 3: -1, 2: -2, 1: -2 }, spell: { 3: "F♯" } },
  { name: "open E",      offsets: { 5: 2, 4: 2, 3: 1 } },        // = open D +2; stays by ruling (header)
  { name: "all fourths", offsets: allFourths() },
].map((t) => Object.freeze({ name: t.name, offsets: Object.freeze({ ...t.offsets }), spell: Object.freeze({ ...(t.spell || {}) }) })));

/** every spelling override the table carries — [name, string, letter]; pinned at ONE */
export const SPELLING_OVERRIDES = Object.freeze(NAMED_TUNINGS.flatMap((n) =>
  Object.keys(n.spell).map((s) => Object.freeze([n.name, +s, n.spell[s]]))));

/** every string's offset, zeros included — the one shape two tunings are compared in */
export function totalOffsets(tuning) {
  const out = {};
  for (const s of STRINGS) out[s] = tuning && Number.isInteger(tuning[s]) ? tuning[s] : 0;
  return out;
}

const sameTuning = (a, b) => STRINGS.every((s) => totalOffsets(a)[s] === totalOffsets(b)[s]);

/** the table read backward, EXACTLY: the name the six offsets spell, "standard" for none
 * moved, null for a tuning no name spells exactly — the lit name is this reading */
export function nameOf(tuning) {
  const t = totalOffsets(tuning);
  if (STRINGS.every((s) => t[s] === 0)) return STANDARD_NAME;
  const hit = NAMED_TUNINGS.find((n) => sameTuning(n.offsets, t));
  return hit ? hit.name : null;
}

/** the offsets with string 6's subtracted — two tunings of one SHAPE canonicalise alike */
const shapeOf = (tuning) => { const t = totalOffsets(tuning); const o = {}; for (const s of STRINGS) o[s] = t[s] - t[6]; return o; };

/** the table read backward, EXACT FIRST then by SHAPE: { name, shift } — shift 0 on an exact
 * match, the register shift in semitones on a shape match, null when nothing matches */
export function readTuning(tuning) {
  const exact = nameOf(tuning);
  if (exact !== null) return { name: exact, shift: 0 };
  const t = totalOffsets(tuning), shape = shapeOf(t);
  const rows = [{ name: STANDARD_NAME, offsets: {} }, ...NAMED_TUNINGS];
  const hit = rows.find((n) => sameTuning(shapeOf(n.offsets), shape));
  return hit ? { name: hit.name, shift: t[6] - totalOffsets(hit.offsets)[6] } : null;
}

/** the house's words for a distance (motion.mjs says the same three): a half step, a whole
 * step, n semitones */
export const shiftWords = (n) => (Math.abs(n) === 1 ? "a half step" : Math.abs(n) === 2 ? "a whole step" : `${Math.abs(n)} semitones`) + (n < 0 ? " down" : " up");

/** what the name field says — the one wording, every site: "open D" · "drop D, a whole step
 * down" · "" for an unnamed shape */
export function describeTuning(tuning) {
  const r = readTuning(tuning);
  return r === null ? "" : r.shift === 0 ? r.name : `${r.name}, ${shiftWords(r.shift)}`;
}

/** the open string's LABEL: the name's own spelling on an exact match, else the direction
 * rule — one speller (open-string.mjs) and one optional table entry, not two spellers */
export function openLabel(tuning, string) {
  const exact = nameOf(tuning);
  const row = exact === null ? null : NAMED_TUNINGS.find((n) => n.name === exact);
  if (row && row.spell[string]) return row.spell[string];
  return openStringName(opensOf(totalOffsets(tuning))[string], OPEN_MIDI[string]);   // the default is the spelling's reference
}

/** the window clause, once: the reason a string cannot take one more semitone this way */
const windowRefusal = (t, string, dir, subject) =>
  Math.abs(t[string] + dir) > TUNING_RANGE
    ? `six semitones is the window — ${subject} is at its ${dir > 0 ? "highest" : "lowest"}` : null;

/** may `string` move one semitone in `dir` (+1 up, −1 down)? { ok } or { ok:false, reason } */
export function canStep(tuning, string, dir) {
  if (!STRINGS.includes(string)) throw new Error(`tunings: string ${string} is not a real string`);
  if (dir !== 1 && dir !== -1) throw new Error("tunings: a step is one semitone, up or down");
  const t = totalOffsets(tuning);
  const win = windowRefusal(t, string, dir, "this string");
  if (win) return { ok: false, reason: win };
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

/** may ALL SIX move one semitone in `dir` together? Refused whole when any one string
 * cannot, naming it: { ok } or { ok:false, reason, string } */
export function canStepAll(tuning, dir) {
  if (dir !== 1 && dir !== -1) throw new Error("tunings: a step is one semitone, up or down");
  const t = totalOffsets(tuning);
  for (const s of STRINGS) {
    const win = windowRefusal(t, s, dir, `string ${s}`);
    if (win) return { ok: false, reason: win, string: s };
  }
  return { ok: true };
}

/** the tuning after one legal global step — refused whole or made whole, never clamped */
export function steppedAll(tuning, dir) {
  const r = canStepAll(tuning, dir);
  if (!r.ok) throw new Error(`tunings: refused — ${r.reason}`);
  const t = totalOffsets(tuning);
  for (const s of STRINGS) t[s] += dir;
  opensOf(t);   // a uniform move keeps the order; this is the proof, not a check that can fail
  return t;
}

{
  // the table is well-formed and its names are its own
  for (const n of NAMED_TUNINGS) { opensOf(n.offsets); if (nameOf(n.offsets) !== n.name) throw new Error(`tunings: ${n.name} does not name itself`); }
  if (new Set(NAMED_TUNINGS.map((n) => n.name)).size !== NAMED_TUNINGS.length) throw new Error("tunings: a name is stated twice");
  if (nameOf({}) !== STANDARD_NAME) throw new Error("tunings: no move is standard");
  if (canStep({}, 5, 1).ok !== true || canStep(stepped({}, 5, 4), 5, 1).ok !== false) throw new Error("tunings: the crossing refusal does not hold — A up five meets D");
  if (SPELLING_OVERRIDES.length !== 1)
    throw new Error(`tunings: the table carries ${SPELLING_OVERRIDES.length} spelling overrides (${SPELLING_OVERRIDES.map((o) => `${o[0]} string ${o[1]}`).join(", ")}) — one is the ruling (open D, string 3, F♯); a second is a new decision and must arrive as one`);
  const openE = NAMED_TUNINGS.find((n) => n.name === "open E"), openD = NAMED_TUNINGS.find((n) => n.name === "open D");
  if (readTuning(openE.offsets).name !== "open E" || readTuning(openD.offsets).name !== "open D" || readTuning({ 6: -4, 5: -2, 4: -2, 3: -2, 2: -2, 1: -2 }).name !== "drop D")
    throw new Error("tunings: the reading is not exact-first — open D and open E share a shape and only an exact match tells them apart; old drop C is drop D down a whole step");
}
