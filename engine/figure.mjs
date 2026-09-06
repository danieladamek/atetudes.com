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
 * tones, behind one toggle — mirroring the existing "Motion follows: the shape /
 * the tones". `drill.material()`'s letters are consumer-ordered by design, so the
 * second material is a handful of lines, not a second parser:
 *
 *   slots   1 2 3 4 (low → high)     a figure repeats a SHAPE
 *   tones   R 3 5 7 (by role)        a figure follows the HARMONY through the shape
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
import { parse as motionParse, resolve as motionResolve, describe as motionDescribe } from "./motion.mjs";
import { noteEvents } from "./note-events.mjs";

/** the two materials, built by the consumer as drill.mjs intends */
export const SLOT_MATERIAL = material({
  letters: { 1: 0, 2: 1, 3: 2, 4: 3 }, values: [0, 1, 2, 3],
  noun: "slot", of: "this four-string set (1 low … 4 high)",
});
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
export const ADDRESS = { slots: SLOT_MATERIAL, tones: TONE_MATERIAL };

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
export function parseFigure(text, address = "slots") {
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
  const mat = ADDRESS[address];
  if (!mat) return { pattern: null, err: `unknown address "${address}" — slots or tones`, source: "drill" };
  /* drill's parser harvests every digit and ignores what it does not know, so
   * "(-1,+2)3" in SLOT mode would silently read as 1-2-3 — the exact silent
   * misread audit A3 is about. Approaches are a tone-figure idea (a degree is
   * enclosed; a slot is not), so parens in slot mode are refused by name. */
  if (hasApproaches(t))
    return { pattern: null, err: "approaches in parens address a TONE (enclose the 3rd, land the 7th) — the address is set to slots; switch it to tones", source: "drill" };   // rule 14 (261001): the mode and the value, never the caption
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

export function orderFigure(parsed, step, address = "slots", ctx = null) {
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
export function figureEvents(step, { parsed = null, address = "slots", playback = "strum",
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

/** the figure back in its own words — drill's for slots/tones, motion's for enclosures */
export function describeFigure(parsed, address = "slots") {
  if (!parsed) return "";
  if (parsed.figures) return motionDescribe(parsed);
  const mat = ADDRESS[address];
  const back = new Map(Object.entries(mat.letters).map(([k, v]) => [v, k]));
  return parsed.map((v) => back.get(v) ?? String(v)).join("-");
}

/* ---------------- load-time assertions ---------------- */
{
  const s = parseFigure("1-2-3-4", "slots"); if (s.err || !s.pattern || s.pattern.join() !== "0,1,2,3") throw new Error("figure: slot parse broke");
  const t = parseFigure("R-3-7-5", "tones"); if (t.err || !t.pattern || t.pattern.join() !== "0,1,3,2") throw new Error("figure: tone parse broke");
  const bad = parseFigure("1-2-9", "slots"); if (!bad.err) throw new Error("figure: a bad slot must fail loudly");
  const enc = parseFigure("(-1,+2)3 7", "tones"); if (enc.err || enc.source !== "motion") throw new Error("figure: enclosure routing broke: " + enc.err);
}
