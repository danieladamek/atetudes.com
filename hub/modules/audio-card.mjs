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
 * The mixer is two gain buses on existing paths (v0.8.7): triads and bass,
 * each one multiply, ramped rather than stepped so a level move mid-note does
 * not click. The metronome's own level stays in the metronome card, because
 * the shared component owns its own sound.
 */
import {
  NOTE_VOICE_NAMES, NOTE_VOICES, BASS_VOICE, voiceFor, envelopeOf, hzOf,
  pluckSamples, SUSTAIN_PARTIALS, chordSchedule, bassSeat, clickSpec, CLICK_VOICE_NAMES,
} from "../../engine/voices.mjs";
import { tetradPass } from "../../engine/tetrad-sequence.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, BEAT, listen } from "../bus.mjs";

export const audioCard = {
  id: "audio-card",
  layer: "surface",
  requires: { audio: true },
  mount_point: "cards",
  order: 5,
  controls: ["auOn", "auVoice", "auChordVol", "auBassVol"],

  markup: `
  <h2 class="auHead">Sound</h2>
  <div class="transport">
    <button id="auOn" data-control="auOn" class="auToggle">Sound: off</button>
  </div>
  <div class="auRow">
    <div><label>Voice</label>
      <select id="auVoice" data-control="auVoice"></select></div>
  </div>
  <div class="auLevel">
    <span class="auLab" id="auChordLab"></span>
    <input type="range" id="auChordVol" data-control="auChordVol" min="0" max="100" value="100">
  </div>
  <div class="auLevel">
    <span class="auLab">Bass</span>
    <input type="range" id="auBassVol" data-control="auBassVol" min="0" max="100" value="100">
  </div>
  <div class="hint auHint" id="auHint">Sound starts on your first click — browsers require a
  gesture before any audio. Then the pass, the pedal and the click all sound.</div>`,

  /* The toggle is deliberately NOT the shell's "primary" class. That one paints
   * with --red, #B82929, which is the degree palette's ROOT — and CLAUDE.md
   * reserves the degree colours for musical function, forbidding them as
   * interface furniture. The shell's red primary is already on the backlog
   * ("Retire the degree-palette red from the interface furniture"); this card
   * declines to add a second instance and uses the house neutral instead, the
   * same on-state the info block's segmented controls wear. */
  styles: `
.auToggle.auLit{background:var(--ink);color:#fff;border-color:var(--ink);font-weight:bold}
.auHead{font-size:12px;letter-spacing:.06em;text-transform:uppercase;
  color:var(--gray);margin:0 0 10px;font-weight:bold}
.auRow{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px}
.auRow>div{flex:1 1 120px}
.auLevel{display:flex;align-items:center;gap:8px;margin-top:8px}
.auLevel input[type=range]{flex:1;accent-color:var(--ink);width:auto}
.auLab{font-size:12px;color:var(--gray);width:44px}
.auHint{margin-top:10px}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const lock = ctx.door.lock || {};
    const families = Array.isArray(lock.families) && lock.families.length ? lock.families : ["drop2"];

    /* PRIVATE. Nothing else reads any of this. */
    let ac = null, chordBus = null, bassBus = null, wave = null;
    const buffers = new Map();
    let on = false, voice = NOTE_VOICE_NAMES[0];
    let chordVol = 1, bassVol = 1;
    let cfg = null, pass = null, live = 0;

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
      const bass = bassSeat(low, step.chord.root.pc);
      for (const ev of chordSchedule(step.voicing, { bassMidi: bass, durBeats: 2, bpm: 72, voice }))
        sound(voiceFor(ev.role, voice), ev.midi, t0 + ev.onset, ev.dur, ev.role === "bass" ? 0.3 : 0.2);
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

    /* ---- controls ---- */
    /* THE LABEL IS THE DOOR'S, AND THE DEFAULT IS ARITY-NEUTRAL.
     *
     * The shipped mixer said "Triads" because Triadetudes plays triads; on a
     * four-voice app that is simply false, which is the same defect class as
     * v0.6.8's "the readout says only true things". But "Tetrads" hardcoded
     * here would be exactly the same landmine one door further on.
     *
     * So: the control id and the bus are named by ROLE — `auChordVol`,
     * `bus: "chord"` — because that is true at every arity and matches what
     * note-events.mjs already calls it. The visible LABEL defaults to "Chord",
     * which is also true everywhere, and a door may override it with a word
     * that fits its own material:
     *
     *     present: { chordLabel: "Tetrads" }
     *
     * Tetradetudes sets it, so the slider says what Daniel asked for on the
     * door he was playing, and the next door inherits a true default rather
     * than this one's vocabulary. */
    byId("auChordLab").textContent = (ctx.door.present || {}).chordLabel || "Chord";

    const vsel = byId("auVoice");
    for (const n of NOTE_VOICE_NAMES) {
      const o = d.createElement("option");
      o.value = n; o.textContent = n;
      vsel.appendChild(o);
    }
    vsel.addEventListener("change", () => { voice = vsel.value; });

    byId("auOn").addEventListener("click", () => {
      on = !on;
      // THE GESTURE. This is the only place a context is ever created.
      if (on) audio();
      const b = byId("auOn");
      b.textContent = "Sound: " + (on ? "on" : "off");
      b.classList.toggle("auLit", on);
    });
    byId("auChordVol").addEventListener("input", (e) => {
      chordVol = Number(e.target.value) / 100; syncBuses();
    });
    byId("auBassVol").addEventListener("input", (e) => {
      bassVol = Number(e.target.value) / 100; syncBuses();
    });

    /* ---- what it listens to; it asks nobody for anything ---- */
    listen(d, CONFIG_CHANGED, (next) => {
      cfg = { ...(cfg || {}), ...next };
      try { pass = tetradPass({ ...cfg, families }); } catch { pass = null; }
    });
    listen(d, STEP_CHANGED, (m) => {
      if (m && m.request !== true && typeof m.index === "number") soundStep(m.index);
    });
    listen(d, BEAT, soundClick);
  },
};
