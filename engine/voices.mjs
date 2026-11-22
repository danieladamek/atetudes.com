/* voices.mjs — THE FAMILY'S VOICES, as math rather than as nodes.
 *
 * The hub has never made a sound: `engine/` had no audio at all, and
 * `hub/modules/metronome-card.mjs` is live-but-silent by design. All the
 * working audio in this project lives inline inside the shipped studies. This
 * extracts Triadetudes' — the most developed (voice table, bass voice,
 * Karplus-Strong pluck, the mixer, v0.8.4–v0.8.7) — per §5's principle:
 * *shell from the simplest finished app, engine from the most demanding one.*
 *
 * SAFE TO EXTRACT, checked rather than assumed: `_load-triadetudes.mjs` slices
 * the study at `/* ==== audio ==== *\/` and evaluates only what is ABOVE it.
 * Measured: 4,270 pinned lines, zero `AudioContext`; 2,044 excluded lines below.
 * Everything realised here as nodes comes from the excluded half, so the
 * characterization suite pins none of it.
 *
 * THE SPLIT IS THE ONE `engine/metronome.mjs` ALREADY MODELS: pure, injected
 * time, no `AudioContext` and no `window` down here; the browser API and the
 * markup live in `hub/modules/audio-card.mjs` above.
 *
 * So a voice is described here as DATA — a source, a filter, a gain envelope as
 * an ordered breakpoint list — and the card is a dumb realiser that turns that
 * description into nodes. The consequences are worth naming:
 *
 *   - the envelopes are testable headlessly, which is most of what "does the
 *     audio work" means before you have ears on it;
 *   - the Karplus-Strong string is rendered by pure arithmetic into a
 *     Float32Array, so its decay and determinism are ASSERTED, not hoped;
 *   - a second host (Modus Operandi, a published study) can realise the same
 *     descriptions against its own graph without inheriting this one's.
 *
 * `voiceSchedule` and its two constants sit just ABOVE the study's cut, so they
 * ARE pinned — and this module's copy is asserted against the shipped one over
 * a derived corpus, the same discipline `isolation.mjs` and `drill.mjs` used.
 *
 * THE BUSES ARE NAMED BY ROLE, NOT BY ARITY. The shipped study called the
 * chord bus "triad" because that app plays triads; the four tetrad voices then
 * went to a bus named "triad", which is false one app over. `note-events.mjs`
 * already calls the role `"chord"`, so naming the bus after the role makes it
 * one fact instead of two, and it stays true at any arity.
 *
 * Pure: no DOM, no AudioContext, no globals.
 */
import { noteEvents } from "./note-events.mjs";

/** equal temperament, A440 — the one pitch fact every voice needs */
export const hzOf = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

/* ---------------- the schedule (pinned against the shipped study) ---------------- */

export const NOTE_VOICE_NAMES = ["tone", "pluck", "sustain"];

/** the (a)/(b) switch, one word, decided by ear in v0.8.5:
 *  "chord" = hold to the chord change, the triad accumulates;
 *  "slot"  = legato to the next onset, no accumulation. */
export const SUSTAIN_HOLD = "chord";

/** Only DUR is voice-dependent — voices CONSUME the event list, they never
 * re-derive it (the v0.6.5 seam). tone keeps every event's own dur, which is
 * the anti-drift baseline; pluck rings to the chord change, capped, because a
 * struck string decays on its own; sustain holds. Harmony-BED events (the
 * short strummed context under a line — `bed` since 260913, when the strum
 * word went to the movement) keep their short dur in every voice, and the
 * bass pedal holds with the sustain voice. */
export function voiceSchedule(evs, voice, durBeats, bpm) {
  const span = (durBeats || 2) * (60 / bpm);
  return evs.map((ev, i) => {
    let dur = ev.dur;
    if (!ev.bed) {
      if (voice === "pluck") dur = Math.min(1.1, Math.max(ev.dur, span - ev.onset));
      if (voice === "sustain") {
        if (SUSTAIN_HOLD === "slot" && ev.role !== "bass") {
          const next = evs.slice(i + 1).find((e) => !e.bed && e.role !== "bass" && e.onset > ev.onset);
          dur = (next ? next.onset : span) - ev.onset;
        } else dur = span - ev.onset;
      }
    }
    return { ...ev, dur };
  });
}

/** the events a chord sounds, then scheduled for the chosen voice — the one
 * call a host needs, so no host re-derives onsets (note-events.mjs owns those) */
export function chordSchedule(voicing, { order = null, bassMidi = null, durBeats = 2, bpm = 72, voice = "tone" } = {}) {
  return voiceSchedule(noteEvents(voicing, order, bassMidi, durBeats, bpm), voice, durBeats, bpm);
}

/* ---------------- the bass register rule ---------------- */

/** Seat the pedal below the voicing's lowest note, never below `floor`.
 * Verbatim from the shipped orderedMidis, as arithmetic rather than as a
 * function of app state. */
export function bassSeat(lowMidi, bassPc, floor = 28) {
  if (!Number.isFinite(lowMidi) || !Number.isFinite(bassPc)) return null;
  let bass = lowMidi - ((((lowMidi - bassPc) % 12) + 12) % 12);
  if (bass >= lowMidi) bass -= 12;
  if (bass < floor) bass += 12;
  return bass;
}

/* ---------------- the Karplus-Strong string, as arithmetic ---------------- */

/** THE PLUCK'S STRING, as Daniel picked it by ear (261121, *Voices - tone, pluck, sustain and bass*): `loss` is
 * the factor in the feedback path (0.996 until then — a shorter ring now), `soften` the passes of a circular
 * two-tap average over the noise burst BEFORE it rings (none until then — a softer pick). */
export const PLUCK_STRING = Object.freeze({ kind: "pluck", loss: 0.994, soften: 3 });

/** The pluck, rendered SYNCHRONOUSLY into samples: deterministic, no worklet,
 * no async load — which is what keeps the `file://` zero-errors gate honest.
 *
 * The seed is a function of PITCH, so the same note is the same waveform in
 * every session and the test can assert it rather than eyeball it. `loss` is
 * the loss in the feedback path; the two-tap average is the lowpass; `soften`
 * passes of the same average smooth the burst first (the audition page's
 * pluckSamples, 261121, is the reference). The string is the voice's own
 * description unless a caller names another.
 */
export function pluckSamples(midi, sampleRate, seconds = 1.2, { loss, soften } = PLUCK_STRING) {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0)
    throw new Error("pluckSamples: a real sample rate is required");
  if (!(loss > 0 && loss < 1)) throw new Error(`pluckSamples: the loss must lie in (0, 1), not ${loss}`);
  if (!Number.isInteger(soften) || soften < 0) throw new Error(`pluckSamples: soften is a count of passes, not ${soften}`);
  const N = Math.max(2, Math.round(sampleRate / hzOf(midi)));
  const len = Math.floor(sampleRate * seconds);
  const out = new Float32Array(len);
  let ring = new Float32Array(N);
  let seed = (midi * 2654435761) >>> 0;          // deterministic per pitch — testable
  for (let i = 0; i < N; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; ring[i] = seed / 2147483648 - 1; }
  for (let p = 0; p < soften; p++) {             // the softer pick: the burst smoothed before it rings
    const nx = new Float32Array(N);
    for (let i = 0; i < N; i++) nx[i] = 0.5 * (ring[i] + ring[(i + 1) % N]);
    ring = nx;
  }
  let idx = 0;
  for (let i = 0; i < len; i++) {
    const cur = ring[idx], nxt = ring[(idx + 1) % N];
    out[i] = cur;
    ring[idx] = loss * 0.5 * (cur + nxt);         // the lowpass in the feedback path
    idx = (idx + 1) % N;
  }
  return out;
}

/** drawbar-ish partials for the sustain voice; index 0 is DC and stays 0. Softer drawbars since 261121 (Daniel's pick;
 * [0, 1, 0.45, 0.22, 0.10, 0.05] until then). */
export const SUSTAIN_PARTIALS = Object.freeze([0, 1, 0.25, 0.08, 0.02]);

/** the bass: a sine and its octave (261121, Daniel's pick; a triangle until then) */
export const BASS_PARTIALS = Object.freeze([0, 1, 0.4]);

/* ---------------- the voices, as descriptions ---------------- */

/* A gain envelope is an ordered list of breakpoints the host applies to a gain
 * node: `set` → setValueAtTime, `linear` → linearRampToValueAtTime, `exp` →
 * exponentialRampToValueAtTime. Describing it rather than building it is what
 * makes it assertable without an AudioContext. */
const env = (kind, at, value) => ({ kind, at, value });

/* TWO FIELDS A HOST REALISES, both as data (261121, Daniel's picks by ear):
 *
 *   - `filter.track` — a low-pass that FOLLOWS THE NOTE: the cutoff is `track` × the note's frequency, capped at
 *     FILTER_CEILING (the audition page's cap). A filter has either `freq` (fixed) or `track`, never both — asserted
 *     at load. So a voice is as bright on the high strings as on the low ones.
 *   - `source.detune` — in cents: the note is realised as TWO oscillators at −detune and +detune, each at 1/√2 of the
 *     level, so the pair carries one oscillator's power. Only an oscillator source takes it (a pluck is a buffer).
 *
 * `cutoffOf` and `oscillatorsOf` are the one reading of each; the host realises what they return and decides nothing. */
export const FILTER_CEILING = 18000;

/** the low-pass cutoff for one note of a voice: its fixed `freq`, or `track` × the note's frequency, capped */
export function cutoffOf(filter, midi) {
  return filter.track ? Math.min(FILTER_CEILING, filter.track * hzOf(midi)) : filter.freq;
}

/** the oscillators one note sounds: `cents` per oscillator, and the `level` each carries (a multiplier on the envelope) */
export function oscillatorsOf(source) {
  const d = source.detune || 0;
  return d > 0 ? { cents: [-d, d], level: Math.SQRT1_2 } : { cents: [0], level: 1 };
}

/* THE NOTE VOICES AS DANIEL PICKED THEM BY EAR (261121, notes/working/Voices audition 261121.html — its `play`,
 * `envelope` and `pluckSamples` are the reference for every number). Each level is the role's velocity (the host's,
 * shared by role) times the voice's own multiplier, here. Until 261121: tone 2,200 Hz fixed, no detune, ×1; pluck
 * 3,400 Hz fixed, set at full level, an 80 ms release, ×1.5; sustain 2,600 Hz fixed, a 30 ms attack, a 90 ms release,
 * ×0.85; bass a triangle at 520 Hz fixed, a 12 ms attack. */
export const NOTE_VOICES = {
  tone: {
    bus: "chord", tail: 0.05,
    source: { kind: "osc", type: "triangle", detune: 3 },
    filter: { type: "lowpass", track: 8.5, q: 0.4 },
    envelope: (t, dur, vel) => [
      env("set", t, 0),
      env("linear", t + 0.008, vel * 1.225),
      env("exp", t + dur, 0.0008),
    ],
  },
  pluck: {
    bus: "chord", tail: 0.02,
    source: PLUCK_STRING,
    filter: { type: "lowpass", track: 9.5, q: 0.2 },
    envelope: (t, dur, vel) => {
      const a = Math.min(0.003, dur * 0.3);
      return [
        env("set", t, 0),
        env("linear", t + a, vel * 1.3),
        env("set", t + Math.max(a, 0.01, dur - 0.13), vel * 1.3),
        env("linear", t + dur, 0),
      ];
    },
  },
  sustain: {
    bus: "chord", tail: 0.05,
    source: { kind: "wave", partials: SUSTAIN_PARTIALS, detune: 2 },
    filter: { type: "lowpass", track: 12, q: 0.3 },
    envelope: (t, dur, vel) => {
      const a = Math.min(0.027, dur * 0.3), r = Math.min(0.37, dur * 0.4);
      return [
        env("set", t, 0),
        env("linear", t + a, vel * 0.7),
        env("set", t + Math.max(a, dur - r), vel * 0.7),
        env("linear", t + dur, 0),
      ];
    },
  },
};

/** A bass of its own (roadmap §2): mellower, darker filter, so the pedal no
 * longer smears into the triads' register. Since 261121 a sine and its octave
 * under a filter at four times the note. */
export const BASS_VOICE = {
  bus: "bass", tail: 0.05,
  source: { kind: "wave", partials: BASS_PARTIALS },
  filter: { type: "lowpass", track: 4, q: 0.5 },
  envelope: (t, dur, vel) => {
    const a = Math.min(0.02, dur * 0.3), r = Math.min(0.12, dur * 0.4);
    return [
      env("set", t, 0),
      env("linear", t + a, vel),
      env("set", t + Math.max(a, dur - r), vel),
      env("linear", t + dur, 0),
    ];
  },
};

/* ---------------- the pad: a SEAT and a voice, not a subsystem (night 57) ---------------- */

/** THE PAD'S REGISTER, chosen by measurement (261012, 1,632 one-of-each voicings over 12 keys × 6 sets ×
 * 4 windows × 7 degrees): the guitar's voicings sit lowest 45–61 (p10–p90, median 52) and highest 60–73
 * (median 67); the bass seat sits 35–53 (median 43). Below the guitar is the bass's octave — a pad there
 * doubles the bass; the ONE register neither occupies is above 73. So the pad sits in [74, 86): D5 up to
 * (not including) D6 — clear of 90 % of the guitar's highs and of every bass seat — and its timbre does
 * the rest: fundamentals-heavy partials under a low-pass, a swell in, no attack. "Doesn't sit where the
 * guitar sits" is this number, not a taste. The pad's chord is the bar's harmony seated here — never a
 * voicing anyone plays, never drawn. Daniel's to move; the constant is the one place it lives. */
export const PAD_REGISTER = Object.freeze([74, 86]);

/** THE PAD'S NOTES — ONE RULE (261121, Daniel's pick by ear, *Pad - rootless and rounder*): the chord's pitch
 * classes WITHOUT ITS ROOT when the chord has four or more tones, each at its one midi inside PAD_REGISTER, low →
 * high; a triad or smaller keeps every tone. Until 261121 every tone sat here, and in that seat six of the seven
 * diatonic tetrads held two notes a second apart (Cmaj7: E5 G5 B5 C6). The ROOT is the chord's, handed in by the
 * caller (the chord knows it) — never guessed from the seat; a pick that holds no root has nothing to leave out. */
export function padSeat(pcs, rootPc) {
  const [lo, hi] = PAD_REGISTER;
  const isPc = (pc) => Number.isInteger(pc) && pc >= 0 && pc <= 11;
  for (const pc of pcs) if (!isPc(pc)) throw new Error(`padSeat: ${pc} is not a pitch class (0..11)`);
  if (pcs.length && !isPc(rootPc)) throw new Error(`padSeat: the chord's root ${rootPc} is not a pitch class (0..11)`);
  const kept = pcs.length >= 4 ? pcs.filter((pc) => pc !== rootPc) : pcs;
  const out = [];
  for (const pc of kept) {
    const m = lo + ((((pc - lo) % 12) + 12) % 12);
    if (m >= hi) throw new Error("padSeat: the register is narrower than an octave");
    out.push(m);
  }
  return out.sort((a, b) => a - b);
}

/** fundamentals-heavy, dark: the pad is heard under the material, not beside the guitar's lines. Rounder since
 * 261121 (Daniel's pick; [0, 1, 0.35, 0.12, 0.04] until then). */
export const PAD_PARTIALS = Object.freeze([0, 1, 0.15, 0.03]);

/** the pad's level per note — the pad's own, so it lives with the pad (261121: 0.06, half the 0.12 the host passed) */
export const PAD_LEVEL = 0.06;

/** THE PAD, as picked 261121 (notes/working/Pad audition 261121.html, `padNote` is the reference): rounder partials
 * under a lower filter, a slower swell, ±2 ¢, and the barline HELD — full level to the chord's end, then a linear
 * release past it, under the next chord's swell, so the pad never falls to silence at a change. Its envelope is the
 * one that runs past `dur`; envelopeOf's `stop` follows the last breakpoint, and the tail covers the source past it.
 * Until 261121: 1,400 Hz, a 0.18 s swell, no detune, a release that ENDED at the chord's end. */
export const PAD_VOICE = {
  bus: "pad", tail: 0.1,
  source: { kind: "wave", partials: PAD_PARTIALS, detune: 2 },
  filter: { type: "lowpass", freq: 1100, q: 0.3 },
  envelope: (t, dur, vel) => {
    const a = Math.min(0.5, dur * 0.35), r = Math.min(0.3, dur * 0.4);
    return [
      env("set", t, 0),
      env("linear", t + a, vel),
      env("set", t + dur, vel),
      env("linear", t + dur + Math.max(a, r), 0),
    ];
  },
};

/** the voice a note event should use: the bass pedal and the pad have their own */
export function voiceFor(role, name) {
  if (role === "bass") return BASS_VOICE;
  if (role === "pad") return PAD_VOICE;
  return NOTE_VOICES[name] || NOTE_VOICES.tone;
}

/** the envelope for one note, as data. `tail` is how long the source must run
 * past the envelope's end so the release is not cut off. The END is the last
 * breakpoint (261121) — `t + dur` for every voice but the pad, whose release
 * runs past the barline. */
export function envelopeOf(spec, t, dur, vel) {
  const points = spec.envelope(t, dur, vel);
  for (let i = 1; i < points.length; i++)
    if (points[i].at < points[i - 1].at)
      throw new Error(`envelopeOf: breakpoints out of order at ${i} (${points[i].at} < ${points[i - 1].at})`);
  return { points, start: t, stop: Math.max(t + dur, points[points.length - 1].at) + spec.tail };
}

/* ---------------- the click ---------------- */

/** three synthesized clicks, zero assets. Accent character is per-voice;
 * level 2 = bar, 1 = chord, 0 = beat, -1 = subdivision. */
export const CLICK_VOICES = {
  beep: { type: "square", freq: { 2: 1800, 1: 1500, 0: 1150, "-1": 950 },
    gain: { 2: 0.17, 1: 0.12, 0: 0.08, "-1": 0.045 }, dur: 0.05 },
  wood: { type: "triangle", freq: { 2: 1660, 1: 1250, 0: 1000, "-1": 820 },
    gain: { 2: 0.50, 1: 0.38, 0: 0.28, "-1": 0.16 }, dur: 0.022 },
  tick: { noise: true, hp: { 2: 5200, 1: 6000, 0: 6800, "-1": 7600 },
    gain: { 2: 0.50, 1: 0.35, 0: 0.25, "-1": 0.14 }, dur: 0.04 },
};

export const CLICK_VOICE_NAMES = Object.keys(CLICK_VOICES);

/** One click, described. **Accents off means every beat is a beat** — the level
 * is clamped rather than the gain flattened, which is the shipped rule and the
 * reason a downbeat with accents off sounds identical to any other beat. */
export function clickSpec(name, level, { accents = true, vol = 1 } = {}) {
  const v = CLICK_VOICES[name] || CLICK_VOICES.beep;
  const lv = accents ? level : Math.min(level, 0);
  const gain = (v.gain[lv] ?? v.gain[0]) * vol;
  return v.noise
    ? { noise: true, hp: v.hp[lv] ?? v.hp[0], gain, dur: v.dur }
    : { noise: false, type: v.type, freq: v.freq[lv] ?? v.freq[0], gain, dur: v.dur };
}

/* ---------------- load-time assertions (golden rule 1, site form) ---------------- */

{
  // every named voice is complete enough for a host to realise blind
  for (const [n, v] of Object.entries({ ...NOTE_VOICES, bass: BASS_VOICE, pad: PAD_VOICE })) {
    if (!v.source || !v.filter || typeof v.envelope !== "function")
      throw new Error(`voices: ${n} is not a realisable description`);
    // a filter is fixed OR follows the note, never both, never neither (261121)
    if (("freq" in v.filter) === ("track" in v.filter))
      throw new Error(`voices: ${n}'s filter must have exactly one of freq and track`);
    if (v.source.detune && v.source.kind === "pluck")
      throw new Error(`voices: ${n} detunes a pluck — a buffer has no second oscillator`);
    const { points } = envelopeOf(v, 0, 0.5, 0.2);
    if (points.length < 2) throw new Error(`voices: ${n} has no envelope`);
    if (Math.max(...points.map((p) => p.value)) > 1)
      throw new Error(`voices: ${n} peaks above unity at vel 0.2`);
  }
  // the pluck rings and then decays — the whole point of the feedback loop
  const s = pluckSamples(69, 8000, 0.5);
  const rms = (a, b) => {
    let t = 0; for (let i = a; i < b; i++) t += s[i] * s[i];
    return Math.sqrt(t / (b - a));
  };
  if (!(rms(0, 400) > rms(s.length - 400, s.length) * 2))
    throw new Error("voices: the Karplus-Strong string does not decay");
  // accents off flattens the bar down to a beat, by CLAMP not by gain
  if (clickSpec("beep", 2, { accents: false }).gain !== clickSpec("beep", 0, { accents: true }).gain)
    throw new Error("voices: accents off must make a downbeat sound exactly like a beat");
}
