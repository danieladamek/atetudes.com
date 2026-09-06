/* figure.mjs — the figure chain, COMPOSED from seams that already exist.
 *
 * Extensions note §1: "the arpeggio chain is not a build, it is a wiring job."
 * This module is that wiring, DOM-free, so a door can consume one call and a
 * test can drive it headlessly. It reimplements nothing:
 *
 *   figure text  →  drill.parsePattern(material)  →  drill.orderFor(voicing, …)
 *                                                  →  an ordered note list
 *   enclosures   →  motion.parse(src, "tones") + motion.resolve(parsed, ctx)
 *                                                  →  role-tagged entries
 *   note list    →  note-events.noteEvents(voicing, order, bass, beats, bpm)
 *                                                  →  the ONE event list per chord
 *
 * THE VOCABULARY DECISION (Daniel, 2026-08-18): figures address BOTH slots and
 * tones, behind one toggle. SUPERSEDED 260923 (Daniel: "Retire … it should be
 * 123, 234, 345, 456 and tones R-3-5 etc."), built night 38 (261002): ONE
 * ADDRESS FAMILY, multetudes' own —
 *
 *   pattern  real STRING NUMBERS, the instrument's own address (6-5-4-3 on
 *            the low set; a figure names the strings it plays, in order)
 *   tones    R 3 5 7 by ROLE          a figure follows the HARMONY through the shape
 *
 * SLOTS (1–4, low → high) are RETIRED as a typed address and kept only as a
 * legacy alias so a saved étude still loads: `parseFigure(text, "slots")`
 * keeps the old meaning, and `legacySlotsToPattern` resolves such a figure
 * against the set it was saved with (the night-32 alias precedent, one layer
 * up). THE COST, said here because it must not ship silently: a pattern
 * figure names absolute strings, so it does not survive a set change — "6-5-
 * 4-3" on the low set is refused on the middle one. Slots survived that; the
 * trade is Daniel's, made knowingly. The mitigation is the house idiom: the
 * refusal NAMES the mismatch and `shiftFigure` OFFERS the same figure on the
 * new set (slot for slot) — offered by the host as a click, never applied.
 * `drill.material()`'s letters are consumer-ordered by design, so the
 * pattern material is derived from the set at parse time — a handful of
 * lines, not a second parser.
 *
 * WHY TWO ENGINES FOR TONES: motion.mjs's shape mode is the reference's H/M/L
 * — three slots, hard-coded, and byte-pinned into two shipped studies — so it
 * cannot address a four-slot shape. drill.mjs is four-slot-native. motion.mjs's
 * TONES mode, however, works at any arity (a degree is a degree) and is the
 * only place enclosures live. So: drill for every bare figure, motion for a
 * tone-figure that carries approaches. Both are tested seams; neither is forked.
 *
 * Pure: no DOM, no audio, no globals.
 */
import { material, parsePattern, orderFor } from "./drill.mjs";
import { lowToHigh, stringsOf, translatePattern } from "./string-sets.mjs";
import { parse as motionParse, resolve as motionResolve, describe as motionDescribe } from "./motion.mjs";
import { noteEvents } from "./note-events.mjs";

/** the LEGACY slot material — a saved pre-261002 étude's alphabet, never typed now */
export const SLOT_MATERIAL = material({
  letters: { 1: 0, 2: 1, 3: 2, 4: 3 }, values: [0, 1, 2, 3],
  noun: "slot", of: "this four-string set (slots 1 low … 4 high)",
});
/** the PATTERN material: the set's own string numbers, low → high, each a slot —
 * derived from the set every time (a set is data, never a table here) */
export function patternMaterial(set) {
  if (!Array.isArray(set) || !set.length) throw new Error("figure: the pattern address needs the set — its strings, low to high");
  const order = lowToHigh(set);
  const letters = {}; order.forEach((s, k) => { letters[String(s)] = k; });
  return material({ letters, values: order.map((_, k) => k), noun: "string", of: `this set (strings ${order.join("-")})` });
}
/** a legacy slot figure (1–4, low → high) resolved against the set it was saved with:
 * "1-3-2-4" on strings 5-4-3-2 → "5-3-4-2". The night-32 alias precedent, one layer up. */
export function legacySlotsToPattern(text, set) {
  const t = String(text ?? "").trim();
  if (!t || /[()\[\]]/.test(t)) return t;                     // empty, or motion's grammar — not a slot figure
  const order = lowToHigh(set);
  const out = [];
  for (const ch of t.toUpperCase()) {
    if (/[,\-\s.·]/.test(ch)) continue;
    const k = "1234".indexOf(ch);
    if (k < 0 || k >= order.length) return t;                  // not a slot figure after all — keep it verbatim
    out.push(order[k]);
  }
  return out.join("-");
}
/** THE SHIFT OFFER: the same figure, slot for slot, on another set — "6-5-4-3" on
 * the low set is "5-4-3-2" on the middle one. Null when the figure does not name
 * this set's strings (nothing honest to offer). Offered, never applied. */
export function shiftFigure(text, fromSet, toSet) {
  const t = String(text ?? "").trim();
  if (!t || /[()\[\]]/.test(t) || /R|7|9/i.test(t)) return null;
  const digits = [...t].filter((c) => "123456".includes(c)).map(Number);
  if (!digits.length || !digits.every((d) => fromSet.includes(d))) return null;
  try { return translatePattern(digits, fromSet, toSet).join("-"); } catch { return null; }
}
/* JS orders integer-like keys before others, so `{R,3,5,7}` would iterate as
 * 3,5,7,R. The letters are a lookup for the parser, but their ORDER is what a
 * picker lists and describeFigure prints — so it is stated, not left to the
 * runtime. drill.material() preserves insertion order for non-integer keys;
 * the R is spelled first and the digits are strings the way the parser sees them. */
export const TONE_MATERIAL = material({
  letters: { R: 0, "3": 1, "5": 2, "7": 3 }, values: [0, 1, 2, 3],
  noun: "tone", of: "the tetrad (R, 3, 5, 7)",
});
export const TONE_ORDER = ["R", "3", "5", "7"];        // the stated order, for pickers and prose
export const SLOT_ORDER = ["1", "2", "3", "4"];
export const ADDRESS = { slots: SLOT_MATERIAL, tones: TONE_MATERIAL };   // "pattern" is derived per set: patternMaterial(set)
/** the material for an address — pattern needs the set; slots is the legacy alias */
const materialFor = (address, set) => address === "pattern" ? patternMaterial(set) : ADDRESS[address];

/** a voicing note's TONE index (0 R · 1 third · 2 fifth · 3 seventh) against
 * its chord — derived from the chord's own intervals, never assumed from order */
export function toneIndexOf(note, chord) {
  const iv = (((note.midi - chord.root.pc) % 12) + 12) % 12;
  const core = chord.intervals.slice(0, 4).map((x) => ((x % 12) + 12) % 12);
  return core.indexOf(iv);
}

/** does this figure text carry approaches (parens)? then it is motion's job */
const hasApproaches = (text) => /\(/.test(String(text));

/**
 * PARSE a figure in one address mode. Never throws on user text (charter §7:
 * bad input is data). Returns { pattern, err, source } where `source` names
 * which engine parsed it — a fact the UI states rather than hides.
 */
export function parseFigure(text, address = "pattern", { set = null } = {}) {
  const t = String(text ?? "").trim();
  if (!t) return { pattern: null, err: null, source: "none" };
  if (address === "tones" && hasApproaches(t)) {
    // motion's grammar wants bracketed degrees; accept the bare form the
    // Figure field speaks by bracketing degree tokens OUTSIDE parentheses only
    // (inside them "-1,+2" are distances, not degrees), and separating figures
    // with the "-" motion expects between them
    const bracketed = t.split(/(\([^)]*\))/g).map((chunk, i) => i % 2 === 1 ? chunk
      : chunk.replace(/\bR\b/gi, "[1]").replace(/(?<![\[\d])\b([1357])\b(?![\]\d])/g, "[$1]"))
      .join("").replace(/\]\s+(?=[\[(])/g, "]-");
    const p = motionParse(bracketed, "tones");
    if (p.error) return { pattern: null, err: p.error.message + " (at " + p.error.pos + ")", source: "motion" };
    return { pattern: p, err: null, source: "motion" };
  }
  if (address !== "pattern" && address !== "tones" && address !== "slots")
    return { pattern: null, err: `unknown address "${address}" — pattern or tones`, source: "drill" };
  /* THE MODE MISMATCH, noticed by the alphabet — multetudes' own manners
   * (selection.mjs orderBy, 260902): R, 7 and the extensions are roles, not
   * strings; the figure is named as the OTHER address's and the switch offered */
  if (address === "pattern" && /R|7|9/.test(t.toUpperCase()))
    return { pattern: null, err: "this reads as a TONES figure (R, 7 and the extensions are roles, not strings) — " +
      "the address is set to pattern; switch it to tones", source: "drill" };
  const mat = materialFor(address, set);
  /* drill's parser harvests every digit and ignores what it does not know, so
   * "(-1,+2)3" in SLOT mode would silently read as 1-2-3 — the exact silent
   * misread audit A3 is about. Approaches are a tone-figure idea (a degree is
   * enclosed; a slot is not), so parens in slot mode are refused by name. */
  if (hasApproaches(t))
    return { pattern: null, err: "approaches in parens address a TONE (enclose the 3rd, land the 7th) — the address is set to pattern; switch it to tones", source: "drill" };   // rule 14 (261001): the mode and the value, never the caption
  /* THE PATTERN ALPHABET, every character read (multetudes' manners): drill's parser
   * harvests digits and reads an unknown one as a slot index — "1" on the low set would
   * silently mean slot 1 — so under pattern each character is a separator, a string of
   * this set, or refused BY NAME before drill ever sees the text */
  if (address === "pattern") {
    const order = lowToHigh(set);
    for (const ch of t) {
      if (/[,\-\s.·]/.test(ch)) continue;
      if (!"123456".includes(ch)) return { pattern: null, err: `"${ch}" is not a string — strings are 1–6`, source: "drill" };
      if (!order.includes(+ch)) return { pattern: null, err: `string ${ch} carries nothing in this set (strings ${order.join("-")})`, source: "drill" };
    }
  }
  const r = parsePattern(t, mat);
  if (r.err) return { pattern: null, err: r.err, source: "drill" };
  return { pattern: r.pattern, err: null, source: "drill" };
}

/**
 * ORDER a parsed figure over one step's voicing → the note list noteEvents
 * takes. `step` is a tetradPass step ({voicing, chord}); `ctx` is motion's
 * placement context (open, nfrets, set, scalePcs, tonicPc), needed only for
 * approaches.
 */
/** THE ROLE → INTERVAL TRANSLATION, and why it exists.
 *
 * The door's tone vocabulary is by ROLE: "7" is *the chord's seventh, whatever
 * quality it is*. motion.mjs's degree grammar is by INTERVAL: `[7]` is the
 * MAJOR seventh (11 semitones) and `[b7]` the minor, and it refuses `[7]` on a
 * chord whose seventh is minor — correctly, in its own terms. So a tone-figure
 * "(-1,+2)3 7" that reads perfectly on Cmaj7 threw on every m7 and 7 chord in
 * the pass, and a swallowed throw rendered those steps as block chords: a
 * silent fallback, the exact "looks right, sounds wrong" failure.
 *
 * The translation is DERIVED from the chord's own core intervals, per step: the
 * role's actual interval, spelled the way motion spells it. Nothing hand-mapped;
 * a maj7#5's #5 and an m7b5's b5 come out right the same way. */
const INTERVAL_TEXT = { 0: "1", 1: "b2", 2: "2", 3: "b3", 4: "3", 5: "4", 6: "b5", 7: "5", 8: "#5",
  9: "6", 10: "b7", 11: "7" };
function roleSpelledForChord(parsed, chord) {
  const core = chord.intervals.slice(0, 4).map((x) => ((x % 12) + 12) % 12);
  const ROLE_TO_IDX = { 1: 0, 3: 1, 5: 2, 7: 3 };
  const respell = (t) => {
    if (!t || t.kind !== "degree" || t.acc) return t;
    const idx = ROLE_TO_IDX[t.deg];
    if (idx === undefined) return t;
    const iv = core[idx];
    const text = INTERVAL_TEXT[iv];
    // motion's own item shape: {kind:"degree", deg, acc, text}
    const acc = text.startsWith("b") ? -1 : text.startsWith("#") ? 1 : 0;
    const deg = Number(text.replace(/[b#]/g, ""));
    return { ...t, deg, acc, text };
  };
  return { ...parsed, figures: parsed.figures.map((f) => ({
    ...f, target: respell(f.target), approaches: f.approaches.map(respell) })) };
}

export function orderFigure(parsed, step, address = "pattern", ctx = null) {
  if (!parsed) return null;
  if (parsed.figures) {                                    // motion's parse — tones + approaches
    if (!ctx) throw new Error("figure: approaches need a placement context");
    return motionResolve(roleSpelledForChord(parsed, step.chord), {
      chordPcs: step.chord.pcs, rootPc: step.chord.root.pc, voicing: step.voicing,
      scalePcs: ctx.scalePcs, tonicPc: ctx.tonicPc, open: ctx.open, nfrets: ctx.nfrets,
      set: ctx.set, setLowHigh: ctx.set, chordLabel: step.symbol,
    });
  }
  const keyOf = address === "tones"
    ? (n) => toneIndexOf(n, step.chord)
    : (n) => n.slot;
  const order = orderFor(step.voicing, parsed, keyOf);
  // a tone the voicing does not carry (it always carries all four of a tetrad,
  // but a shell would not) is a hole — say so rather than emit undefined
  if (order.some((n) => !n)) throw new Error("figure: a step in the figure names a tone this voicing does not hold");
  return order;
}

/** THE ONE CALL: events for a step, figure applied. `playback` is the door's
 * segment — strum (the whole harmony at once; the value was "block" until
 * 260913, when the PO ruled the truer word: a block IS a strum, and
 * note-events has always staggered it), arpeggiated (the line), both (the
 * line over a short harmony BED, the reference's onsetsFor — the bed was
 * called `strum` before the movement took that word; renamed with the
 * ruling so one word means one thing). */
export function figureEvents(step, { parsed = null, address = "pattern", playback = "strum",
  bassMidi = null, durBeats = 2, bpm = 72, ctx = null } = {}) {
  const order = playback === "strum" ? null : orderFigure(parsed, step, address, ctx);
  if (!order) return noteEvents(step.voicing, null, bassMidi, durBeats, bpm);
  const line = noteEvents(step.voicing, order, bassMidi, durBeats, bpm);
  if (playback !== "both") return line;
  const bed = noteEvents(step.voicing, null, null, durBeats, bpm)
    .map((ev) => ({ ...ev, dur: Math.min(ev.dur, 0.5), bed: true }));   // harmony context, not steps
  return [...bed, ...line];
}

/** LEGACY WORD (260913 rename): saved études from before the ruling carry
 * playback "block"; the map is the one place the old word is known. */
export const playbackWord = (w) => (w === "block" ? "strum" : w);

/** the figure back in its own words — drill's for pattern/tones, motion's for enclosures */
export function describeFigure(parsed, address = "pattern", { set = null } = {}) {
  if (!parsed) return "";
  if (parsed.figures) return motionDescribe(parsed);
  const mat = materialFor(address, set);
  const back = new Map(Object.entries(mat.letters).map(([k, v]) => [v, k]));
  return parsed.map((v) => back.get(v) ?? String(v)).join("-");
}

/* ---------------- load-time assertions ---------------- */
{
  const s = parseFigure("1-2-3-4", "slots"); if (s.err || !s.pattern || s.pattern.join() !== "0,1,2,3") throw new Error("figure: the legacy slot parse broke");
  const pt = parseFigure("6-5-4-3", "pattern", { set: [6, 5, 4, 3] }); if (pt.err || !pt.pattern || pt.pattern.join() !== "0,1,2,3") throw new Error("figure: pattern parse broke: " + pt.err);
  const off = parseFigure("1-2", "pattern", { set: [6, 5, 4, 3] }); if (!/string 1 carries nothing in this set \(strings 6-5-4-3\)/.test(off.err || "")) throw new Error("figure: a string off the set must refuse in the house words: " + off.err);
  if (legacySlotsToPattern("1-3-2-4", [5, 4, 3, 2]) !== "5-3-4-2") throw new Error("figure: the legacy slot migration broke");
  if (shiftFigure("6-5-4-3", [6, 5, 4, 3], [5, 4, 3, 2]) !== "5-4-3-2" || shiftFigure("1-2", [6, 5, 4, 3], [5, 4, 3, 2]) !== null) throw new Error("figure: the shift offer broke");
  const t = parseFigure("R-3-7-5", "tones"); if (t.err || !t.pattern || t.pattern.join() !== "0,1,3,2") throw new Error("figure: tone parse broke");
  const bad = parseFigure("1-2-9", "slots"); if (!bad.err) throw new Error("figure: a bad slot must fail loudly");
  const enc = parseFigure("(-1,+2)3 7", "tones"); if (enc.err || enc.source !== "motion") throw new Error("figure: enclosure routing broke: " + enc.err);
}
