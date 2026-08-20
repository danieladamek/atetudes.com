/* audio-card.mjs — the hub's ears: an AudioContext, a mixer, and nothing else.
 *
 * `engine/voices.mjs` describes the voices as data; this realises them as
 * nodes. The split is `engine/metronome.mjs` + `metronome-card.mjs`'s, applied
 * to sound: no musical decision is taken here, and no number is invented here.
 *
 * IT REACHES NOTHING (§4.2.3). It subscribes to `hub/bus.mjs` and sounds what
 * it hears — the configuration, the step, the beat — and derives the pass for
 * itself exactly as `chord-timeline.mjs` does. So:
 *
 *   - prune the stage and the audio still plays the pass;
 *   - prune the metronome and the click simply never arrives;
 *   - prune THIS and every other module is unchanged and silent.
 *
 * Each of those is a smaller door, never a broken one.
 *
 * AUTOPLAY, which will bite otherwise. Browsers refuse an AudioContext before
 * a user gesture, and that refusal is exactly what produces the frozen tetrad
 * study's four console warnings. So the context is created and resumed on the
 * FIRST REAL GESTURE and never on load — the `file://` gate demands zero
 * console errors, and there is no reason to manufacture warnings either.
 *
 * The mixer is two gain buses on existing paths (v0.8.7): chord and bass,
 * each one multiply, ramped rather than stepped so a level move mid-note does
 * not click. ITS CONTROLS ARE NOT HERE: as in the reference page, the sliders
 * and the voice select live in the Transport card, which announces `MIXER`.
 * This module has no surface at all — it is mounted `hidden` — so it can never
 * be the empty box the reference has none of. The click's own level stays in
 * the metronome card, because the shared component owns its own sound.
 */
import {
  NOTE_VOICE_NAMES, NOTE_VOICES, BASS_VOICE, voiceFor, envelopeOf, hzOf,
  pluckSamples, SUSTAIN_PARTIALS, voiceSchedule, bassSeat, clickSpec, CLICK_VOICE_NAMES,
} from "../../engine/voices.mjs";
import { tetradPass, OPEN_MIDI } from "../../engine/tetrad-sequence.mjs";
import { scaleNotes } from "../../engine/chord.mjs";
import { parseFigure, figureEvents } from "../../engine/figure.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, BEAT, MIXER, CLOCK_STATE, ATTACK, NOTE, listen } from "../bus.mjs";

export const audioCard = {
  id: "audio-card",
  layer: "surface",
  requires: { audio: true },
  mount_point: "hidden",           // no surface of its own — the mixer lives in Transport
  order: 5,
  controls: [],
  markup: ``,
  styles: ``,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const lock = ctx.door.lock || {};
    // the lock's families is the door's DEFAULT; Shape & Motion announces the
    // one actually chosen and that wins when present
    const families = Array.isArray(lock.families) && lock.families.length ? lock.families : ["drop2"];

    /* PRIVATE. Nothing else reads any of this. */
    let ac = null, chordBus = null, bassBus = null, wave = null;
    const buffers = new Map();
    let on = false, voice = NOTE_VOICE_NAMES[0], clickOn = true;
    let chordVol = 1, bassVol = 1;
    let cfg = null, pass = null, live = 0;
    let bpm = 72, durBeats = 2;                       // the clock's, heard on the bus

    /* ---- the context, created on a GESTURE and never before ---- */
    const audio = () => {
      if (!ac) {
        const view = d.defaultView;
        const Ctor = view && (view.AudioContext || view.webkitAudioContext);
        if (!Ctor) return null;                       // no Web Audio: stay silent, never throw
        try { ac = new Ctor(); } catch { return null; }
        chordBus = ac.createGain(); chordBus.gain.value = chordVol; chordBus.connect(ac.destination);
        bassBus = ac.createGain(); bassBus.gain.value = bassVol; bassBus.connect(ac.destination);
      }
      if (ac.state === "suspended") ac.resume();
      return ac;
    };

    const busFor = (name) => (name === "bass" ? bassBus : chordBus);

    const syncBuses = () => {
      if (!ac) return;                                // ramp, not a step: no click mid-note
      chordBus.gain.setTargetAtTime(chordVol, ac.currentTime, 0.02);
      bassBus.gain.setTargetAtTime(bassVol, ac.currentTime, 0.02);
    };

    const pluckBuffer = (midi) => {
      let b = buffers.get(midi);
      if (b) return b;
      const s = pluckSamples(midi, ac.sampleRate);
      b = ac.createBuffer(1, s.length, ac.sampleRate);
      b.getChannelData(0).set(s);
      buffers.set(midi, b);
      return b;
    };

    const sustainWave = () => {
      if (!wave) {
        const amps = Float32Array.from(SUSTAIN_PARTIALS);
        wave = ac.createPeriodicWave(new Float32Array(amps.length), amps);
      }
      return wave;
    };

    /** realise ONE described voice as nodes. Every source is counted and its
     * whole chain disconnects on ended, so the node ceiling is bounded rather
     * than hoped — the shipped study's discipline, kept. */
    const sound = (spec, midi, at, dur, vel) => {
      if (!ac || live > 240) return;
      const { points, start, stop } = envelopeOf(spec, at, dur, vel);
      let src;
      if (spec.source.kind === "pluck") {
        src = ac.createBufferSource();
        src.buffer = pluckBuffer(midi);
      } else {
        src = ac.createOscillator();
        if (spec.source.kind === "wave") src.setPeriodicWave(sustainWave());
        else src.type = spec.source.type;
        src.frequency.value = hzOf(midi);
      }
      const f = ac.createBiquadFilter();
      f.type = spec.filter.type; f.frequency.value = spec.filter.freq; f.Q.value = spec.filter.q;
      const g = ac.createGain();
      for (const p of points) {
        if (p.kind === "set") g.gain.setValueAtTime(p.value, p.at);
        else if (p.kind === "linear") g.gain.linearRampToValueAtTime(p.value, p.at);
        else g.gain.exponentialRampToValueAtTime(Math.max(1e-5, p.value), p.at);
      }
      src.connect(f).connect(g).connect(busFor(spec.bus));
      src.start(start); src.stop(stop);
      live++;
      src.onended = () => { live--; src.disconnect(); f.disconnect(); g.disconnect(); };
    };

    /** the whole chord: the schedule comes from the engine, never from here */
    const soundStep = (index) => {
      if (!on || !pass) return;
      const step = pass.steps[index];
      if (!step) return;
      const a = audio();
      if (!a) return;
      const t0 = a.currentTime + 0.02;
      const low = Math.min(...step.voicing.notes.map((n) => n.midi));
      // the Harmony panel's bass select, honoured here: "none" mutes the PEDAL
      // only — the four voicing notes are on the chord bus and keep sounding
      const bass = cfg && cfg.bass === "none" ? null : bassSeat(low, step.chord.root.pc);
      /* THE FIGURE CHAIN: one event list per chord from engine/figure.mjs —
       * block strum, the figure as a line, or both — then voice-scheduled. The
       * same list the stage pulses and the score draws; nothing re-derived. */
      const parsed = parseFigure(cfg && cfg.figure, (cfg && cfg.address) || "slots");
      const events = figureEvents(step, {
        parsed: parsed.err ? null : parsed.pattern, address: (cfg && cfg.address) || "slots",
        playback: (cfg && cfg.playback) || "block", bassMidi: bass, durBeats, bpm,
        ctx: { scalePcs: scaleNotes(cfg.key || "C", cfg.scale || "major").map((n) => n.pc),
          tonicPc: scaleNotes(cfg.key || "C", cfg.scale || "major")[0].pc,
          open: OPEN_MIDI, nfrets: 15, set: pass.set.strings },
      });
      for (const ev of voiceSchedule(events, voice, durBeats, bpm))
        sound(voiceFor(ev.role, voice), ev.midi, t0 + ev.onset, ev.dur,
          ev.role === "bass" ? 0.3 : ev.role === "approach" ? 0.16 : ev.strum ? 0.14 : 0.2);
    };

    /** the click. `lead` is seconds until the beat, announced by whoever owns
     * the clock — so this never needs to know that module's time base. */
    const soundClick = (m) => {
      if (!on) return;
      const a = audio();
      if (!a) return;
      const spec = clickSpec(m.voice || CLICK_VOICE_NAMES[0], m.level ?? 0,
        { accents: m.accents !== false, vol: m.vol ?? 1 });
      const t = a.currentTime + Math.max(0, m.lead || 0);
      const g = a.createGain();
      g.gain.setValueAtTime(spec.gain, t);
      g.gain.exponentialRampToValueAtTime(0.0005, t + spec.dur);
      g.connect(a.destination);
      let src;
      if (spec.noise) {
        const len = Math.floor(a.sampleRate * 0.06);
        const buf = a.createBuffer(1, len, a.sampleRate);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
        src = a.createBufferSource(); src.buffer = buf;
        const f = a.createBiquadFilter();
        f.type = "highpass"; f.frequency.value = spec.hp;
        src.connect(f).connect(g);
        src.onended = () => { src.disconnect(); f.disconnect(); g.disconnect(); };
      } else {
        src = a.createOscillator();
        src.type = spec.type; src.frequency.value = spec.freq;
        src.connect(g);
        src.onended = () => { src.disconnect(); g.disconnect(); };
      }
      src.start(t); src.stop(t + spec.dur + 0.01);
    };

    /* ---- the gesture. Browsers refuse an AudioContext before a user gesture;
     * the FIRST click anywhere on the page is that gesture. Nothing is created
     * on load, so the frozen study's four autoplay warnings are not reproduced. */
    const arm = () => { on = true; audio(); d.removeEventListener("pointerdown", arm, true); };
    d.addEventListener("pointerdown", arm, true);

    /* ---- what it listens to; it asks nobody for anything ---- */
    listen(d, CONFIG_CHANGED, (next) => {
      cfg = { ...(cfg || {}), ...next };
      try { pass = tetradPass({ families, ...cfg }); } catch { pass = null; }
    });
    listen(d, CLOCK_STATE, (m) => {
      if (!m) return;
      if (typeof m.bpm === "number") bpm = m.bpm;
      // the click is the clock's own voice: its on/off is the clock owner's
      // state, not a mixer level (260820.2 — the dead Sound button)
      if (typeof m.click === "boolean") clickOn = m.click;
    });
    listen(d, STEP_CHANGED, (m) => {
      if (!m) return;
      // the transport's request carries the beats this chord holds — the figure
      // divides THAT span, so a 2+2 split and a 4 split sound different
      if (m.request === true && typeof m.beats === "number") durBeats = m.beats;
      // plain echoes sound (a clicked chord strums, a key change plays the new
      // chord 1) — EXCEPT attack-borne ones: that sound already travelled on
      // ATTACK, and sounding its echo too would double every walked chord
      if (m.request !== true && typeof m.index === "number" && m.attack !== true) soundStep(m.index);
    });
    /* THE WALK'S SOUND, direct from the transport (260819.2). Not the render
     * echo: the step owner rightly swallows a request for the step we are
     * already on (a cold Play attacking step 0, a length-1 pass wrapping), and
     * the first chord of the etude was silent because the sound depended on
     * that echo. An attack is "sound step N now", true even when N is where we
     * already are — and with this path a door that prunes the stage still
     * sounds. */
    /* a key pressed on a board (shell parity N5): one note, the current note
     * voice, the triad app's own numbers (0.7 s, vel 0.24). The pointerdown
     * arm above has already run by the time any key is clicked, so this sounds
     * before the first Play, exactly as the triad keyboard does. */
    listen(d, NOTE, (m) => {
      if (!m || typeof m.midi !== "number") return;
      const a = audio();
      if (!a) return;
      sound(voiceFor("chord", voice), m.midi, a.currentTime + 0.02, 0.7, 0.24);
    });
    listen(d, ATTACK, (m) => {
      if (!m || typeof m.index !== "number") return;
      if (typeof m.beats === "number") durBeats = m.beats;
      soundStep(m.index);
    });
    listen(d, BEAT, (m) => { if (clickOn) soundClick(m); });
    /* the mixer's controls live in the Transport card; this only listens */
    listen(d, MIXER, (m) => {
      if (!m) return;
      if (typeof m.chord === "number") chordVol = m.chord;
      if (typeof m.bass === "number") bassVol = m.bass;
      if (typeof m.voice === "string" && NOTE_VOICE_NAMES.includes(m.voice)) voice = m.voice;
      if (m.on === true) { on = true; audio(); }
      syncBuses();
    });
  },
};
