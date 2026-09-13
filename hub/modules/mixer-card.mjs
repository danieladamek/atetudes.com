/* mixer-card.mjs — WHAT SOUNDS: the voice, and each bus's level (night 58, 261012).
 *
 * Daniel's 261009 mockup, finished: the Transport card had carried the clock AND a mixer
 * under one name since the grammar was set — rows 3–5 of five (sig+voice · chord · bass).
 * Ruled 261010 as a family-standard decision (it re-cuts ROW_COUNTS, asserted across the
 * six studies): A MIXER CARD IS WHAT SOUNDS — voice · chord · bass — three row groups,
 * beside the clock's three. Voice travels with the mixer because a voice is a TIMBRE,
 * what sounds, and it sits beside the levels of what sounds; the clock is when
 * (proposed by the night, Daniel's to reverse).
 *
 * A RE-HOUSING, NOT A REDESIGN: every control keeps its id, its bus message (MIXER
 * { chord, bass, voice }) and its state; the one-mute-icon-per-slider rule (260820.3)
 * moved verbatim from transport-card.mjs. The clock still arms audio on Play; this card
 * never starts anything. audio-card.mjs listens to MIXER and reaches nothing.
 */
import { NOTE_VOICE_NAMES } from "../../engine/voices.mjs";
import { MIXER, announce } from "../bus.mjs";

export const mixerCard = {
  id: "mixer-card",
  layer: "surface",
  requires: { transport: true },
  mount_point: "cards",
  order: 2,
  controls: ["noteVoiceSel", "chordMute", "chordVolR", "bassMute", "bassVolR"],

  markup: `
  <h2>Mixer</h2>
  <div class="row2 alignEnd mxVoice">
    <div class="rowEnd"><label class="chk" title="the note voice — tone, pluck (plucked string), sustain (notes hold to the change)">voice
      <select id="noteVoiceSel" data-control="noteVoiceSel"></select></label></div>
  </div>
  <div class="bpmrow" title="the mixer: the chord level — muted is this slider at zero">
    <button id="chordMute" data-control="chordMute" class="muteBtn">\u{1F50A}</button>
    <span class="mxLab mxMixLab">chord</span>
    <input type="range" id="chordVolR" data-control="chordVolR" min="0" max="100" value="100">
    <span class="mxVal" id="chordVolVal">100</span>
  </div>
  <div class="bpmrow" title="the mixer: the bass level — muted is this slider at zero">
    <button id="bassMute" data-control="bassMute" class="muteBtn">\u{1F50A}</button>
    <span class="mxLab mxMixLab">bass</span>
    <input type="range" id="bassVolR" data-control="bassVolR" min="0" max="100" value="100">
    <span class="mxVal" id="bassVolVal">100</span>
  </div>
  <div class="clpsum">What sounds — the voice, and each bus's level.</div>
  <div class="hint info">Each slider's speaker icon mutes that bus — the icon is the slider at zero.
  A muted chord with bass and click sounding is play-along: you supply the voicings. The click's own
  level lives in the Metronome card — the metronome owns its sound.</div>`,

  styles: `
.mxVoice select{width:auto;padding:3px 6px;margin-left:4px}
.mxLab{font-size:12px;color:var(--gray)}
.mxMixLab{width:36px}
.mxVal{font-size:13px;width:30px;text-align:right}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    let chordVol = 1, bassVol = 1;
    const vsel = byId("noteVoiceSel");
    for (const n of NOTE_VOICE_NAMES) {
      const o = d.createElement("option"); o.value = n; o.textContent = n; vsel.appendChild(o);
    }
    const mixer = () => announce(d, MIXER, { chord: chordVol, bass: bassVol, voice: vsel.value });
    vsel.addEventListener("change", mixer);
    /* ONE MUTE ICON PER SLIDER (260820.3) — v0.8.7's mute-is-the-slider-at-
     * zero rule made universal, and the "mute chords" checkbox retired into it.
     * The ICON IS A VIEW OF THE LEVEL, never separate state: level 0 renders
     * muted however it got there, dragging by hand included; the stash is a
     * memory, not an owner — unmute restores the last non-zero level, or the
     * slider's default when there is none. The dead Sound button and the
     * MIXER-vs-CLOCK_STATE trap were both a second owner; this has one. */
    const wireMute = (btnId, sliderId, valId, get, set, dflt) => {
      let stash = 0;
      const renderIcon = () => {
        const muted = get() === 0, b = byId(btnId);
        b.textContent = muted ? "\u{1F507}" : "\u{1F50A}";
        b.setAttribute("aria-pressed", String(muted));
        b.title = muted ? "unmute — restore the level" : "mute — the slider to zero";
      };
      const apply = (v) => { set(v);
        byId(sliderId).value = String(Math.round(v * 100));
        byId(valId).textContent = String(Math.round(v * 100));
        renderIcon(); mixer(); };
      byId(btnId).addEventListener("click", () => {
        if (get() > 0) { stash = get(); apply(0); }
        else apply(stash > 0 ? stash : dflt);
      });
      byId(sliderId).addEventListener("input", (e) => {
        const v = Number(e.target.value) / 100;
        if (v > 0) stash = v;
        set(v); byId(valId).textContent = e.target.value; renderIcon(); mixer();
      });
      renderIcon();
    };
    wireMute("chordMute", "chordVolR", "chordVolVal", () => chordVol, (v) => { chordVol = v; }, 1);
    wireMute("bassMute", "bassVolR", "bassVolVal", () => bassVol, (v) => { bassVol = v; }, 1);
    mixer();   // the boot announce: the audio card hears the levels and the voice before the first Play (moved here with the state)
  },
};
