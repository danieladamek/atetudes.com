/* gamut.mjs — THE PARTIAL COLLECTION (night 48, 261009): a GAMUT is a subset of the field's seven
 * degrees — a pentatonic, a triad pair, any set of stacks, any degrees — that narrows the MATERIAL
 * without touching the seven. Daniel, 261006: "you could look at your pentatonics and your paired
 * triads in the context against each degree of the scale". Ruled 261006 (the design note §7):
 * a gamut is a FILTER on the material, not an object you voice; a pentatonic is ANHEMITONIC — no
 * two members a semitone apart; the empty list refuses by name. The word GAMUT is Daniel's
 * (261008): the range of notes available in a system — a musical idea, in the model's own
 * sentence: field → gamut → position → object.
 *
 * THE FIELD STAYS SEVEN. Nothing here reaches field.mjs: a gamut is a predicate on keyDeg, applied
 * at position.mjs's materialIn and nowhere else (inGamut lives THERE; this module derives the
 * collections and never imports position.mjs — selection.mjs, which it reaches for STACK_DEPTH,
 * imports position, and a cycle there is a load-order trap). The omitted degrees stay on the neck at field
 * opacity — seeing which two a pentatonic leaves out is the teaching.
 *
 * NOTHING IS A LIST (golden rule 1, rule 6). Every collection is the output of its rule:
 *   - a STACK on degree d is {d, d+2, d+4, …} mod 7 to its depth (STACK_DEPTH's; triads and tetrads
 *     are seven each because there are seven degrees);
 *   - a TRIAD PAIR is two DISJOINT triads: the only triads disjoint from {d, d+2, d+4} sit on d+1
 *     and d+6, so each triad has two partners and there are 7·2/2 = 7 pairs — the stepwise
 *     neighbours; the pair on (d, d+1) covers six degrees and OMITS d−1 (IV+V omits the 3);
 *   - a PENTATONIC is a 5-subset with no two members a semitone apart, under the scale's own
 *     intervals: major and melodic minor hold four each, harmonic minor holds NONE (three disjoint
 *     semitone pairs, two omissions to spend) and the rule says so by name.
 *
 * THE STORED KEY is `gamut`: a sorted array of distinct degree numbers 1..7 (the field's degrees,
 * R = 1 — the same identity the tones pick stores), ABSENT (null) meaning the whole field. Never
 * an empty array, never a name, never a pitch or a fret: degrees survive a key change; a name
 * would not, and a pair stored as "F + G" would make the face's glyph load-bearing.
 *
 * THE FACE: the pair is written `F + G` — the slash already means "over a bass" (chord.mjs reads it,
 * chart-line draws it) and one glyph must not mean two things on one line.
 *
 * Pure; load-time assertions.
 */
import { SCALE_STEPS } from "./chord.mjs";
import { STACK_DEPTH } from "./selection.mjs";
import { SHARED } from "./shared-config.mjs";

const mod7 = (n) => ((n % 7) + 7) % 7;
const DEGREES = [0, 1, 2, 3, 4, 5, 6];   // keyDeg, 0-based — the field's index

/** the pitch-class offset of each keyDeg from the tonic, from the scale's own steps */
export function scalePcs(scale) {
  const steps = SCALE_STEPS[scale];
  if (!steps) throw new Error(`gamut: "${scale}" is not a scale this engine knows`);
  const pcs = [0];
  for (let i = 0; i < 6; i++) pcs.push(pcs[i] + steps[i]);
  return pcs;
}

/** the stack on keyDeg d to `depth` — thirds all the way up, mod 7 */
export function stack(d, depth) {
  if (!DEGREES.includes(d)) throw new Error(`gamut: keyDeg ${d} is not one of the seven`);
  return Array.from({ length: depth }, (_, i) => mod7(d + 2 * i));
}
export const triads = () => DEGREES.map((d) => ({ root: d, degrees: stack(d, STACK_DEPTH.triad) }));
export const tetrads = () => DEGREES.map((d) => ({ root: d, degrees: stack(d, STACK_DEPTH.tetrad) }));

/** the triad pairs: every unordered pair of DISJOINT triads — derived, not the arithmetic that
 * predicts it; the omitted degree is what neither covers */
export function triadPairs() {
  const t = triads(), out = [];
  for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) {
    if (t[i].degrees.some((x) => t[j].degrees.includes(x))) continue;
    const degrees = [...t[i].degrees, ...t[j].degrees].sort((a, b) => a - b);
    const omitted = DEGREES.filter((x) => !degrees.includes(x));
    out.push({ roots: [t[i].root, t[j].root], degrees, omitted });
  }
  return out;
}

/** the anhemitonic pentatonics of a scale: every 5-subset of the seven with no two members a
 * semitone apart (cyclically — the 7th and the 1 an octave up count). Harmonic minor: none. */
export function pentatonics(scale) {
  const pcs = scalePcs(scale), out = [];
  const semitone = (a, b) => { const d = ((pcs[b] - pcs[a]) % 12 + 12) % 12; return d === 1 || d === 11; };
  for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) {   // choose the two OMITTED degrees
    const set = DEGREES.filter((x) => x !== a && x !== b);
    let ok = true;
    for (let i = 0; i < 5 && ok; i++) for (let j = i + 1; j < 5; j++) if (semitone(set[i], set[j])) { ok = false; break; }
    if (ok) out.push({ degrees: set, omitted: [a, b] });
  }
  return out;
}

/** the scale's word, night 41's shared vocabulary — one source */
const scaleWord = (scale) => SHARED.scale.values[scale] || scale;

/** why a scale offers no pentatonic — the empty list refuses BY NAME, never as an empty menu */
export function pentatonicRefusal(scale) {
  if (pentatonics(scale).length) return null;
  return `${scaleWord(scale)} holds no semitone-free pentatonic`;
}

/** the stored shape: sorted distinct degree numbers 1..7, or null for the whole field */
export function normalizeGamut(degrees) {
  if (degrees == null) return null;
  if (!Array.isArray(degrees)) throw new Error("gamut: a gamut is an array of degree numbers 1..7, or null for the whole field");
  const set = [...new Set(degrees.map((d) => +d))].sort((a, b) => a - b);
  for (const d of set) if (!Number.isInteger(d) || d < 1 || d > 7) throw new Error(`gamut: ${d} is not a degree of the seven`);
  return set.length === 0 || set.length === 7 ? null : set;
}

/** a 5-degree gamut that is not semitone-free under this scale — the pair that breaks it, by
 * keyDeg (0-based), or null; the rule's own refusal after a scale change, never a silent drop */
export function pentatonicBreak(gamut, scale) {
  if (!gamut || gamut.length !== 5) return null;
  const pcs = scalePcs(scale);
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {
    const d = ((pcs[gamut[j] - 1] - pcs[gamut[i] - 1]) % 12 + 12) % 12;
    if (d === 1 || d === 11) return [gamut[i] - 1, gamut[j] - 1];
  }
  return null;
}

/** is this 5-set a rotation of the major pentatonic's 2-2-3-2-3 (semitones) from one of its
 * members? → that member's keyDeg (the pentatonic's root) or -1 */
export function majorPentatonicRoot(gamut, scale) {
  if (!gamut || gamut.length !== 5) return -1;
  const pcs = scalePcs(scale);
  for (const d of gamut) {
    const r = pcs[d - 1];
    const rel = gamut.map((x) => ((pcs[x - 1] - r) % 12 + 12) % 12).sort((a, b) => a - b);
    if (rel.join(",") === "0,2,4,7,9") return d - 1;
  }
  return -1;
}

/** what the face says of a gamut, against a field: the pair as `F + G` with its omitted degree,
 * a major pentatonic by its root, any other set by its degrees — one sentence, every site */
export function describeGamut(gamut, fld) {
  if (gamut == null) return "";
  const letters = (ds) => ds.map((d) => fld.notes[d].name);
  const degs = gamut.join(" "), tonic = fld.notes[0].name;
  const pair = triadPairs().find((p) => p.degrees.join(",") === gamut.map((d) => d - 1).join(","));
  if (pair) return `${letters(pair.roots).join(" + ")} — ${degs} of ${tonic}, omitting the ${pair.omitted[0] + 1}`;
  const root = majorPentatonicRoot(gamut, fld.scale);
  if (root >= 0) return `${fld.notes[root].name} major pentatonic — ${degs} of ${tonic}`;
  if (gamut.length === 5 && !pentatonicBreak(gamut, fld.scale)) return `a pentatonic — ${degs} of ${tonic}`;
  return `${degs} of ${tonic}`;
}

{
  if (triads().length !== 7 || tetrads().length !== 7) throw new Error("gamut: seven stacks of each depth");
  const pairs = triadPairs();
  if (pairs.length !== 7) throw new Error(`gamut: ${pairs.length} triad pairs — the stepwise neighbours make seven`);
  for (const p of pairs) {
    if (mod7(p.roots[1] - p.roots[0]) !== 1 && mod7(p.roots[0] - p.roots[1]) !== 1) throw new Error("gamut: a disjoint pair is a stepwise pair");
    if (p.omitted.length !== 1) throw new Error("gamut: a pair omits exactly one degree");
  }
  const n = { major: pentatonics("major").length, mel: pentatonics("mel").length, harm: pentatonics("harm").length };
  if (n.major !== 4 || n.mel !== 4 || n.harm !== 0) throw new Error(`gamut: the anhemitonic rule yields major ${n.major}, melodic ${n.mel}, harmonic ${n.harm} — expected 4 / 4 / 0`);
  if (!pentatonicRefusal("harm")) throw new Error("gamut: harmonic minor's empty list must refuse by name");
  if (normalizeGamut([]) !== null || normalizeGamut([1, 2, 3, 4, 5, 6, 7]) !== null) throw new Error("gamut: nothing chosen, or everything, is the whole field — absent");
}
