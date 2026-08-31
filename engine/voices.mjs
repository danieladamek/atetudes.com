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

/** The pluck, rendered SYNCHRONOUSLY into samples: deterministic, no worklet,
 * no async load — which is what keeps the `file://` zero-errors gate honest.
 *
 * The seed is a function of PITCH, so the same note is the same waveform in
 * every session and the test can assert it rather than eyeball it. The 0.996
 * factor is the loss in the feedback path; the two-tap average is the lowpass.
 */
export function pluckSamples(midi, sampleRate, seconds = 1.2) {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0)
    throw new Error("pluckSamples: a real sample rate is required");
  const N = Math.max(2, Math.round(sampleRate / hzOf(midi)));
  const len = Math.floor(sampleRate * seconds);
  const out = new Float32Array(len);
  const ring = new Float32Array(N);
  let seed = (midi * 2654435761) >>> 0;          // deterministic per pitch — testable
  for (let i = 0; i < N; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; ring[i] = seed / 2147483648 - 1; }
  let idx = 0;
  for (let i = 0; i < len; i++) {
    const cur = ring[idx], nxt = ring[(idx + 1) % N];
    out[i] = cur;
    ring[idx] = 0.996 * 0.5 * (cur + nxt);        // the lowpass in the feedback path
    idx = (idx + 1) % N;
  }
  return out;
}

/** drawbar-ish partials for the sustain voice; index 0 is DC and stays 0 */
export const SUSTAIN_PARTIALS = Object.freeze([0, 1, 0.45, 0.22, 0.10, 0.05]);

/* ---------------- the voices, as descriptions ---------------- */

/* A gain envelope is an ordered list of breakpoints the host applies to a gain
 * node: `set` → setValueAtTime, `linear` → linearRampToValueAtTime, `exp` →
 * exponentialRampToValueAtTime. Describing it rather than building it is what
 * makes it assertable without an AudioContext. */
const env = (kind, at, value) => ({ kind, at, value });

export const NOTE_VOICES = {
  tone: {
    bus: "chord", tail: 0.05,
    source: { kind: "osc", type: "triangle" },
    filter: { type: "lowpass", freq: 2200, q: 0.4 },
    envelope: (t, dur, vel) => [
      env("set", t, 0),
      env("linear", t + 0.008, vel),
      env("exp", t + dur, 0.0008),
    ],
  },
  pluck: {
    bus: "chord", tail: 0.02,
    source: { kind: "pluck" },
    filter: { type: "lowpass", freq: 3400, q: 0.2 },
    envelope: (t, dur, vel) => [
      env("set", t, vel * 1.5),
      env("set", t + Math.max(0.01, dur - 0.08), vel * 1.5),
      env("linear", t + dur, 0),
    ],
  },
  sustain: {
    bus: "chord", tail: 0.05,
    source: { kind: "wave", partials: SUSTAIN_PARTIALS },
    filter: { type: "lowpass", freq: 2600, q: 0.3 },
    envelope: (t, dur, vel) => {
      const a = Math.min(0.03, dur * 0.3), r = Math.min(0.09, dur * 0.4);
      return [
        env("set", t, 0),
        env("linear", t + a, vel * 0.85),
        env("set", t + Math.max(a, dur - r), vel * 0.85),
        env("linear", t + dur, 0),
      ];
    },
  },
};

/** A bass of its own (roadmap §2): mellower, darker filter, so the pedal no
 * longer smears into the triads' register. */
export const BASS_VOICE = {
  bus: "bass", tail: 0.05,
  source: { kind: "osc", type: "triangle" },
  filter: { type: "lowpass", freq: 520, q: 0.5 },
  envelope: (t, dur, vel) => {
    const r = Math.min(0.12, dur * 0.4);
    return [
      env("set", t, 0),
      env("linear", t + 0.012, vel),
      env("set", t + Math.max(0.012, dur - r), vel),
      env("linear", t + dur, 0),
    ];
  },
};

/** the voice a note event should use: the bass pedal has its own */
export function voiceFor(role, name) {
  if (role === "bass") return BASS_VOICE;
  return NOTE_VOICES[name] || NOTE_VOICES.tone;
}

/** the envelope for one note, as data. `tail` is how long the source must run
 * past the envelope's end so the release is not cut off. */
export function envelopeOf(spec, t, dur, vel) {
  const points = spec.envelope(t, dur, vel);
  for (let i = 1; i < points.length; i++)
    if (points[i].at < points[i - 1].at)
      throw new Error(`envelopeOf: breakpoints out of order at ${i} (${points[i].at} < ${points[i - 1].at})`);
  return { points, start: t, stop: t + dur + spec.tail };
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
  for (const [n, v] of Object.entries({ ...NOTE_VOICES, bass: BASS_VOICE })) {
    if (!v.source || !v.filter || typeof v.envelope !== "function")
      throw new Error(`voices: ${n} is not a realisable description`);
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
