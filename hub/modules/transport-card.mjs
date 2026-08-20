/* transport-card.mjs — the reference page's Transport card, ported.
 *
 * `static/studies/triadetudes/study.html` is the layout specification, and this
 * is its second card, in its form and order: ◀ Play ▶, the BPM row, Time sig
 * and Bar split, the checkbox row (metronome · count-in · mute chords · voice),
 * the two mixer sliders, and the hint. THE MIXER LIVES HERE, as it does in the
 * reference — there is no separate Sound card. Every control id is the
 * reference's own where a twin exists.
 *
 * ONE GRID, AND THIS CARD IS NOT ITS OWNER. `metronome-card` owns the clock;
 * this card subscribes to `BEAT`, walks `engine/transport.mjs` along it, and
 * announces the step. To change tempo or meter it announces a `CLOCK` request
 * and renders whatever `CLOCK_STATE` comes back — two views of one clock that
 * cannot drift apart. The mixer is announced the same way (`MIXER`), so the
 * card that realises audio needs to know nothing about this one (§4.2.3).
 *
 * NO PLAYHEAD STRIP. Shell 1 added a pip-per-step row the reference never had;
 * Shell 4 cut it (Daniel, playing the build: "not sure what the value is of the
 * chord tracking lines"). It was a fourth indicator of one fact the timeline
 * (with roman numerals), the score bar highlight and the neck's "4 of 8"
 * already carry — and the "position at a glance" it offered is exactly what
 * this shell's strip mini-transports provide properly.
 */
import { createTransportCore, patternOf, SPLITS } from "../../engine/transport.mjs";
import { NOTE_VOICE_NAMES } from "../../engine/voices.mjs";
import { CLOCK, CLOCK_STATE, BEAT, STEP_CHANGED, MIXER, PLAY, ATTACK, listen, announce } from "../bus.mjs";

const METERS = Object.keys(SPLITS).map(Number).sort((a, b) => a - b);

export const transportCard = {
  id: "transport-card",
  layer: "surface",
  requires: { transport: true },
  mount_point: "cards",
  order: 1,
  controls: ["prevBtn", "playBtn", "nextBtn", "bpmRange2", "meterSel2", "splitSel",
    "clickChk2", "countChk", "chordMute", "bassMute", "noteVoiceSel", "chordVolR", "bassVolR"],

  markup: `
  <h2>Transport</h2>
  <div class="transport">
    <button id="prevBtn" data-control="prevBtn" title="previous chord">&#9664;</button>
    <button id="playBtn" data-control="playBtn" class="trPlay primary">Play</button>
    <button id="nextBtn" data-control="nextBtn" title="next chord">&#9654;</button>
    <span class="trLoop" id="trLoop"></span>
    <span class="trEnd">
      <label class="chk" title="metronome click sound on/off">
        <input type="checkbox" id="clickChk2" data-control="clickChk2" checked> metronome</label>
      <label class="chk"><input type="checkbox" id="countChk" data-control="countChk"> count-in</label>
    </span>
  </div>
  <div class="bpmrow">
    <span class="trLab">BPM</span>
    <input type="range" id="bpmRange2" data-control="bpmRange2" min="30" max="200" value="72">
    <span class="trVal" id="bpmVal2">72</span>
  </div>
  <div class="row2 alignEnd trSig">
    <div><label>Time sig</label>
      <select id="meterSel2" data-control="meterSel2"></select></div>
    <div><label>Bar split<br>(beats per chord)</label>
      <select id="splitSel" data-control="splitSel"></select></div>
    <div class="rowEnd"><label class="chk" title="the note voice — tone, pluck (plucked string), sustain (notes hold to the change)">voice
      <select id="noteVoiceSel" data-control="noteVoiceSel"></select></label></div>
  </div>
  <div class="bpmrow" title="the mixer: the chord level — muted is this slider at zero">
    <button id="chordMute" data-control="chordMute" class="muteBtn">\u{1F50A}</button>
    <span class="trLab trMixLab">chord</span>
    <input type="range" id="chordVolR" data-control="chordVolR" min="0" max="100" value="100">
    <span class="trVal" id="chordVolVal">100</span>
  </div>
  <div class="bpmrow" title="the mixer: the bass level — muted is this slider at zero">
    <button id="bassMute" data-control="bassMute" class="muteBtn">\u{1F50A}</button>
    <span class="trLab trMixLab">bass</span>
    <input type="range" id="bassVolR" data-control="bassVolR" min="0" max="100" value="100">
    <span class="trVal" id="bassVolVal">100</span>
  </div>
  <div class="clpsum">The étude's walk — Play joins the grid at the next bar.</div>
  <div class="hint info">Chords take the bar's slots in order — e.g. 5/4 split 2+3: first chord 2
  beats, next chord 3, new bar. <b>If the metronome is running, Play joins it at the next bar</b> — the
  click you already hear is your count-in. If it isn't, Play starts it (count-in adds one clicked bar first).
  Mute chords is the chord level at zero — bass and click keep sounding and the changes still
  animate in time: play-along, you supply the voicings. Sound starts on your first click. The
  click's own level lives in the Metronome card — the metronome owns its sound.</div>`,

  /* Play IS the shell's red `.primary`, as the reference's is — Daniel reversed
   * the earlier retire-the-red call in the 2026-08-19 side-by-side ("more
   * obvious that it is a play button", shell parity N2). The playing state
   * reads from the button text (Play/Pause), the triad app's own idiom; the
   * trLit class stays on the element as state the gate reads, with no look of
   * its own. */
  styles: `
.trSig{align-items:flex-end}
.trPlay{font-weight:bold}
.trLoop{font-size:12px;color:var(--gray);margin-left:4px}
.trLab{font-size:12px;color:var(--gray)}
.trMixLab{width:36px}
.trVal{font-size:13px;width:30px;text-align:right}
.trSig select{width:auto;padding:3px 6px;margin-left:4px}
/* only this module puts a row-end group inside a .transport row (the Play
 * row's metronome + count-in), so the anchor is its own: the .row2>.rowEnd
 * form is shell grammar — two modules use that one */
.trEnd{margin-left:auto;display:flex;gap:9px;align-items:center}
.trEnd .chk{margin:0}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const present = ctx.door.present || {};

    let steps = 8, meter = 4, splitIdx = 0, bpm = 72, running = false;
    let core = createTransportCore({ meter, splitIdx, steps, countIn: false });
    let armed = false, position = 0;
    let armFrom = null, armAt = 0;   // metroOwner: see setPlaying
    let chordVol = 1, bassVol = 1;

    const fillMeters = () => {
      const sel = byId("meterSel2"); sel.textContent = "";
      for (const m of METERS) {
        const o = d.createElement("option");
        o.value = String(m); o.textContent = m + "/4";
        if (m === meter) o.selected = true;
        sel.appendChild(o);
      }
    };
    const fillSplits = () => {
      const sel = byId("splitSel"); sel.textContent = "";
      (SPLITS[meter] || []).forEach((p, i) => {
        const o = d.createElement("option");
        o.value = String(i); o.textContent = p.join("+");
        if (i === splitIdx) o.selected = true;
        sel.appendChild(o);
      });
    };
    const vsel = byId("noteVoiceSel");
    for (const n of NOTE_VOICE_NAMES) {
      const o = d.createElement("option"); o.value = n; o.textContent = n; vsel.appendChild(o);
    }

    const showLoop = () => { byId("trLoop").textContent = armed ? "loop " + (core.loop + 1) : ""; };

    /* the click's on/off is NOT here any more (260820.2): it is the clock
     * owner's state (CLOCK_STATE.click) and this card's checkbox is a VIEW of
     * it — changes go out as a CLOCK request, renders come back from the
     * state, so the metronome's own Sound button and this checkbox can never
     * disagree. The mixer keeps the levels and the voice. */
    const mixer = () => announce(d, MIXER, {
      chord: chordVol, bass: bassVol, voice: vsel.value });

    /* metroOwner — the reference's rule, carried by name (side-by-side triage
     * 2026-08-19). Play STARTS the clock as "transport" if it is not already
     * running; Pause STOPS it only if the transport owns it (a metronome the
     * user started by hand survives), by naming itself in the stop request —
     * the clock owner honours or ignores that by ownership. The pre-fix path
     * was asymmetric (Play announced run:true, Pause announced nothing), so the
     * clock free-ran after Pause, the next Play armed mid-bar (a partial bar
     * plus a full count-in bar — "two measures"), and a stale `position` meant
     * the first chord never sounded. One defect, three symptoms.
     *
     * POSITION ON PLAY: the étude restarts from STEP 0 — the reference's own
     * rule (etudeToggle sets runStep=0 on every start), so Play after Pause
     * sounds chord 1, not wherever the last run happened to stop. The one case
     * the item flags: the user stepped with prev/next WHILE STOPPED to rehearse
     * from a chosen chord. That is a deliberate act, so it is honoured — a
     * manual step while disarmed sets the arm point; Play from a plain Pause
     * (no step in between) goes back to chord 1. `armFrom` records it. */
    const setPlaying = (want) => {
      byId("playBtn").textContent = want ? "Pause" : "Play";
      byId("playBtn").classList.toggle("trLit", want);
      if (want) {
        const from = armFrom === null ? 0 : armFrom;
        core.setCountIn(byId("countChk").checked);
        core.start(0, { fromStep: from });
        // ARM BEFORE STARTING THE CLOCK. The metronome's start pumps its first
        // BEAT synchronously, inside this announce — so if `armed` is still
        // false at that moment the downbeat (index 0, beat 0) is skipped and the
        // arm lands on beat 1, mid-bar: a 3-beat wait to the next bar line PLUS
        // the full count-in bar, seven beats of count-in for a one-bar request —
        // Daniel's "two measures", and it happened on a COLD first Play too. The
        // pre-fix order (announce first, arm after) hid that under the pause
        // asymmetry; once the clock stopped correctly it stood on its own.
        armed = "pending"; armAt = from;
        announce(d, CLOCK, { run: true, owner: "transport" });
        // sound on, arm audio through the same message the mixer uses
        announce(d, MIXER, { on: true });
      } else {
        armed = false; core.stop(); armFrom = null;
        // stop the clock ONLY IF the transport started it — the owner decides
        announce(d, CLOCK, { run: false, owner: "transport" });
      }
      showLoop();
    };

    fillMeters(); fillSplits(); showLoop();

    byId("playBtn").addEventListener("click", () => setPlaying(!armed));
    byId("prevBtn").addEventListener("click", () => announce(d, STEP_CHANGED, { index: position - 1, request: true }));
    byId("nextBtn").addEventListener("click", () => announce(d, STEP_CHANGED, { index: position + 1, request: true }));
    byId("bpmRange2").addEventListener("input", (e) => {
      byId("bpmVal2").textContent = e.target.value;
      announce(d, CLOCK, { bpm: Number(e.target.value) });
    });
    byId("meterSel2").addEventListener("change", (e) => announce(d, CLOCK, { meter: Number(e.target.value) }));
    byId("splitSel").addEventListener("change", (e) => {
      splitIdx = Number(e.target.value); core.setSplit(splitIdx);
      // the timeline draws bars from this split — announce it as a plain value
      announce(d, STEP_CHANGED, { index: position, request: true, meter, splitIdx });
    });
    byId("countChk").addEventListener("change", (e) => core.setCountIn(e.target.checked));
    byId("clickChk2").addEventListener("change", (e) => announce(d, CLOCK, { click: e.target.checked }));
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

    /* a strip mini summoned Play — arm (or disarm) the walk exactly as our own
     * Play button does; setPlaying takes it from there (grid + audio) */
    listen(d, PLAY, (m) => {
      if (!m || typeof m.run !== "boolean") return;
      if (m.run !== !!armed) setPlaying(m.run);
    });

    listen(d, CLOCK_STATE, (m) => {
      if (!m) return;
      running = !!m.running;
      if (typeof m.bpm === "number" && m.bpm !== bpm) {
        bpm = m.bpm; byId("bpmRange2").value = bpm; byId("bpmVal2").textContent = bpm;
      }
      if (typeof m.meter === "number" && m.meter !== meter) {
        core.setMeter(m.meter); meter = m.meter; splitIdx = core.splitIdx; fillMeters(); fillSplits();
      }
      if (typeof m.click === "boolean") byId("clickChk2").checked = m.click;
      if (!running && armed) setPlaying(false);
    });

    listen(d, STEP_CHANGED, (m) => {
      if (!m || m.request === true) return;
      if (typeof m.total === "number" && m.total !== steps) { steps = m.total; core.setSteps(steps); }
      if (typeof m.index === "number") {
        position = m.index;
        // a step taken WHILE STOPPED is the user choosing where to rehearse from —
        // Play honours it (see setPlaying); a step during play is just the walk
        if (!armed) armFrom = m.index;
      }
    });

    listen(d, BEAT, (ev) => {
      if (!ev || typeof ev.index !== "number") return;
      // JOIN AT THE NEXT BAR: hand start() the beat's place in its bar (ev.beat)
      // so it can find the next bar line rather than joining on this arming beat
      if (armed === "pending") { core.start(ev.index, { fromStep: armAt, beatInBar: ev.beat }); armed = true; }
      if (!armed) return;
      const w = core.beat(ev);
      if (w.countingIn) { byId("trLoop").textContent = "count-in " + w.beatsLeft; return; }
      if (!w.attack) return;
      showLoop();
      const beats = patternOf(meter, splitIdx)[w.step % patternOf(meter, splitIdx).length];
      // THE SOUND travels on its own event (ATTACK, straight to the audio card);
      // the POSITION travels on the request, which the step owner may rightly
      // swallow when nothing moved (0 -> 0 on a cold Play, a length-1 pass on a
      // loop wrap). `attack: true` on the request lets the owner's echo say it
      // was attack-borne, so audio does not sound that echo a second time.
      announce(d, ATTACK, { index: w.step, lead: ev.lead, level: w.level, beats });
      announce(d, STEP_CHANGED, { index: w.step, request: true, attack: true, lead: ev.lead, level: w.level, meter, splitIdx, beats });
    });

    mixer();
  },
};
