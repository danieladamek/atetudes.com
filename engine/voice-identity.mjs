/* voice-identity.mjs — A STABLE KEY PER VOICE, ACROSS A CHORD CHANGE.
 *
 * Tetradetudes child 2 (scoping note 2026-08-16, finding 2). Pure, DOM-free,
 * no state, no dependencies — family infrastructure, not a Tetradetudes
 * feature: everything here works at any arity.
 *
 * WHY THIS EXISTS
 * ---------------
 * The roadmap treats animated voice movement as a RENDERER to be extracted and
 * shared. Measured on the frozen study it is three CSS transitions and about
 * six lines suppressing them on instant jumps; there is no
 * `requestAnimationFrame` in the file at all.
 *
 * **The difficulty is identity, not animation.** A dot glides only if the SAME
 * DOM NODE survives the chord change. A voice that holds must keep its element
 * while a voice that moves transitions to a new position — and that is an
 * engine question. `voiceLeadCost` already matches voices BY INDEX, so the seam
 * exists implicitly. This module makes it explicit and asserted.
 *
 * WHAT A VOICE KEY IS, AND THE ONE THING IT MUST NOT BE
 * ----------------------------------------------------
 * A voice's identity is its CHANNEL — the thing that persists across a change —
 * and emphatically NOT its rank in pitch order. That distinction is the whole
 * module, because the two coincide often enough to look interchangeable:
 *
 *   - keyed by CHANNEL: two voices that cross keep their identities and the
 *     renderer glides them past each other, which is what actually happened
 *   - keyed by PITCH RANK: the same crossing SWAPS the two dots' identities,
 *     so each appears to jump to the other's position and the narrator reports
 *     two leaps where the music had none
 *
 * The divergence is real in this codebase rather than hypothetical:
 * `isolation.mjs`'s `lineVoicing` sorts its notes by midi and then takes
 * `slot` from the string's position in the set, so a low string fretted high
 * puts a note late in pitch order and early in channel order.
 *
 * Neither is the key a PITCH CLASS or a chord-tone ROLE. A holding voice keeps
 * its pitch while its role changes underneath it — the frozen study's own
 * footer says so ("held notes recolor as their function changes") — and a
 * moving voice changes pitch while remaining the same voice. Both would break
 * exactly the cases this module exists to get right.
 *
 * DERIVED, NEVER STORED
 * ---------------------
 * `voiceKey` is a pure function of one note. There is no counter, no registry,
 * no WeakMap and nothing to persist or invalidate — the same note yields the
 * same key forever, in any session, which is what makes it safe as a DOM key.
 * (Relative-state doctrine: store the minimum, derive the rest.)
 *
 * The channel accessor is INJECTED, defaulting to `slot`, so a consumer whose
 * material is not strings says so rather than being told what a voice is —
 * the same idiom `drill.mjs` uses for its material.
 */

/** the default channel: `slot` is the set-position every engine voicing carries */
export const DEFAULT_CHANNEL = (n) => n.slot;

const isChannel = (c) => (typeof c === "number" && Number.isFinite(c)) || typeof c === "string";

/** THE KEY. A pure function of one note — derived, never assigned. */
export function voiceKey(note, channelOf = DEFAULT_CHANNEL) {
  if (!note || typeof note !== "object") throw new Error("voiceKey: a note is an object");
  const c = channelOf(note);
  if (!isChannel(c))
    throw new Error(
      `voiceKey: this note has no channel (${JSON.stringify(c)}). A voice's identity is its ` +
      `channel — its slot in the set — so a note without one cannot be tracked across a change. ` +
      `Pass channelOf if this material does not use "slot".`);
  return "v" + c;
}

/** Keys for a whole voicing, asserted UNIQUE: two voices sharing an identity
 * would collapse to one DOM node and the renderer would drop a dot silently. */
export function keysOf(voicing, channelOf = DEFAULT_CHANNEL) {
  const notes = notesOf(voicing, "keysOf");
  const keys = notes.map((n) => voiceKey(n, channelOf));
  const seen = new Set();
  for (const k of keys) {
    if (seen.has(k))
      throw new Error(
        `keysOf: two voices share the channel "${k}" — voice identities must be distinct, or ` +
        `two voices collapse onto one element and a dot disappears without an error`);
    seen.add(k);
  }
  return keys;
}

function notesOf(voicing, where) {
  const notes = Array.isArray(voicing) ? voicing : voicing && voicing.notes;
  if (!Array.isArray(notes) || !notes.length)
    throw new Error(`${where}: expected a voicing (a {notes:[…]} or a note array)`);
  return notes;
}

/** THE CORRESPONDENCE across one change, by key rather than by position.
 *
 * Returns { paired, left, entered }. `left` and `entered` are reported rather
 * than thrown on, because a genuine change of string set really does end some
 * voices and begin others — a renderer fades those instead of gliding them. */
export function matchVoices(prev, next, channelOf = DEFAULT_CHANNEL) {
  const a = notesOf(prev, "matchVoices"), b = notesOf(next, "matchVoices");
  const byKey = (notes) => {
    const m = new Map();
    keysOf(notes, channelOf).forEach((k, i) => m.set(k, notes[i]));
    return m;
  };
  const A = byKey(a), B = byKey(b);
  const paired = [], left = [], entered = [];
  for (const [k, from] of A) {
    if (B.has(k)) paired.push({ key: k, from, to: B.get(k) });
    else left.push({ key: k, from });
  }
  for (const [k, to] of B) if (!A.has(k)) entered.push({ key: k, to });
  return { paired, left, entered };
}

/** PER-VOICE TRANSITIONS, classified. Every voice must be paired: a transition
 * list with holes would under-report movement exactly the way a shorter
 * voicing under-reported its cost (Update Log 260817.3), so an unpaired voice
 * is named rather than skipped. */
export function transitions(prev, next, channelOf = DEFAULT_CHANNEL) {
  const { paired, left, entered } = matchVoices(prev, next, channelOf);
  if (left.length || entered.length)
    throw new Error(
      `transitions: ${left.length} voice(s) left (${left.map((v) => v.key).join(", ") || "—"}) and ` +
      `${entered.length} entered (${entered.map((v) => v.key).join(", ") || "—"}). These voicings do ` +
      `not share a channel set, so there is no voice-to-voice correspondence to describe. Use ` +
      `matchVoices if a set change is expected.`);
  return paired.map(({ key, from, to }) => {
    const semitones = to.midi - from.midi;
    return { key, from, to, semitones, kind: semitones === 0 ? "hold" : "move" };
  });
}

/** THE OCTAVE LEAP — "runs out of neck, the whole grip jumps".
 *
 * True only when EVERY voice moves by the SAME non-zero whole number of
 * octaves. That is what lets a narrator describe it as ONE event rather than
 * as four independent leaps, and it is why the test for it is a property of
 * the whole voicing rather than of any voice.
 *
 * Derived from the transitions, so it cannot disagree with them. */
export function octaveLeap(prev, next, channelOf = DEFAULT_CHANNEL) {
  const ts = transitions(prev, next, channelOf);
  const first = ts[0].semitones;
  const leapt = first !== 0 && first % 12 === 0 &&
    ts.every((t) => t.semitones === first);
  return { leapt, octaves: leapt ? first / 12 : 0, semitones: leapt ? first : 0 };
}

/** the voices that did not move — what a renderer leaves alone and a narrator
 * calls "held" */
export function holding(prev, next, channelOf = DEFAULT_CHANNEL) {
  return transitions(prev, next, channelOf).filter((t) => t.kind === "hold");
}

/** Keys across a whole SEQUENCE, one row per voice: the shape a renderer wants,
 * because a row is one DOM node's life. Voicings may be null (a chord the
 * optimizer could not voice); the row carries null there rather than closing
 * the gap, so a hole stays visible instead of shortening the line. */
export function voiceLines(voicings, channelOf = DEFAULT_CHANNEL) {
  const real = voicings.filter(Boolean);
  if (!real.length) throw new Error("voiceLines: no voicings");
  const keys = keysOf(real[0], channelOf);
  for (const v of real) {
    const k = keysOf(v, channelOf);
    if (k.length !== keys.length || k.some((x, i) => x !== keys[i]))
      throw new Error(
        `voiceLines: the channel set changes mid-sequence (${keys.join(",")} → ${k.join(",")}). ` +
        `A voice's identity would not survive it, so the renderer cannot glide across this point.`);
  }
  return keys.map((key, i) => ({
    key,
    notes: voicings.map((v) => (v ? notesOf(v, "voiceLines")[i] : null)),
  }));
}

/* ---------------- load-time assertions (golden rule 1, site form) ---------------- */

/* The crossing case is checked at load, because it is the one a naive key gets
 * wrong and the one whose breakage is invisible: both keys still exist, both
 * dots still render, and only the identities are swapped. */
{
  const note = (slot, midi) => ({ slot, midi, fret: midi - 40, string: 6 - slot });
  // two voices whose PITCH ORDER inverts while their channels do not
  const before = [note(0, 60), note(1, 64)];
  const after = [note(0, 66), note(1, 62)];
  const ts = transitions(before, after);
  if (ts.length !== 2) throw new Error("voice-identity: crossing lost a voice");
  if (ts[0].key !== "v0" || ts[1].key !== "v1")
    throw new Error("voice-identity: a crossing swapped voice identities");
  if (ts[0].semitones !== 6 || ts[1].semitones !== -2)
    throw new Error("voice-identity: a crossing mismeasured its own movement");
  // the whole-grip leap is one event
  const leapt = octaveLeap(before, before.map((n) => ({ ...n, midi: n.midi + 12 })));
  if (!leapt.leapt || leapt.octaves !== 1)
    throw new Error("voice-identity: a uniform octave jump is not being read as one event");
}
