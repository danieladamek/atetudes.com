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
 * The playhead the reference does not have — a pip per step — is kept: the
 * roman timeline shows position too, but this one shows loop progress at a
 * glance and it costs one line of the card.
 */
import { createTransportCore, patternOf, SPLITS } from "../../engine/transport.mjs";
import { NOTE_VOICE_NAMES } from "../../engine/voices.mjs";
import { CLOCK, CLOCK_STATE, BEAT, STEP_CHANGED, MIXER, listen, announce } from "../bus.mjs";

const METERS = Object.keys(SPLITS).map(Number).sort((a, b) => a - b);

export const transportCard = {
  id: "transport-card",
  layer: "surface",
  requires: { transport: true },
  mount_point: "cards",
  order: 1,
  controls: ["prevBtn", "playBtn", "nextBtn", "bpmRange2", "meterSel2", "splitSel",
    "clickChk2", "countChk", "metroChk", "noteVoiceSel", "chordVolR", "bassVolR", "trHead"],

  markup: `
  <h2>Transport</h2>
  <div class="transport">
    <button id="prevBtn" data-control="prevBtn" title="previous chord">&#9664;</button>
    <button id="playBtn" data-control="playBtn" class="trPlay">Play</button>
    <button id="nextBtn" data-control="nextBtn" title="next chord">&#9654;</button>
    <span class="trLoop" id="trLoop"></span>
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
  </div>
  <div class="transport trChecks">
    <label class="chk" title="metronome click sound on/off">
      <input type="checkbox" id="clickChk2" data-control="clickChk2" checked> metronome</label>
    <label class="chk"><input type="checkbox" id="countChk" data-control="countChk"> count-in</label>
    <label class="chk" title="the chord level at zero — bass and click keep sounding">
      <input type="checkbox" id="metroChk" data-control="metroChk"> mute chords</label>
    <label class="chk" title="the note voice — tone, pluck (plucked string), sustain (notes hold to the change)">voice
      <select id="noteVoiceSel" data-control="noteVoiceSel"></select></label>
  </div>
  <div class="bpmrow" title="the mixer: the chord level — mute chords is this slider at zero">
    <span class="trLab trMixLab" id="chordVolLab"></span>
    <input type="range" id="chordVolR" data-control="chordVolR" min="0" max="100" value="100">
    <span class="trVal" id="chordVolVal">100</span>
  </div>
  <div class="bpmrow" title="the mixer: the bass level">
    <span class="trLab trMixLab">bass</span>
    <input type="range" id="bassVolR" data-control="bassVolR" min="0" max="100" value="100">
    <span class="trVal" id="bassVolVal">100</span>
  </div>
  <div class="trPlayhead" id="trHead" data-control="trHead"></div>
  <div class="hint">Chords take the bar's slots in order — e.g. 5/4 split 2+3: first chord 2
  beats, next chord 3, new bar. <b>If the metronome is running, Play joins it</b> — the click you
  already hear is your count-in. If it isn't, Play starts it (count-in adds one clicked bar first).
  Mute chords is the chord level at zero — bass and click keep sounding and the changes still
  animate in time: play-along, you supply the voicings. Sound starts on your first click. The
  click's own level lives in the Metronome card — the metronome owns its sound.</div>`,

  /* Play is deliberately NOT the shell's red `.primary` — that is the degree
   * palette's Root and CLAUDE.md forbids degree colours as furniture; the
   * reference's red Play is on the backlog to retire and this card does not
   * add a second instance. The rest is the reference's grammar. */
  styles: `
.trSig{align-items:flex-end}
.trPlay{font-weight:bold}
.trPlay.trLit{background:var(--ink);color:#fff;border-color:var(--ink)}
.trLoop{font-size:12px;color:var(--gray);margin-left:4px}
.trLab{font-size:12px;color:var(--gray)}
.trMixLab{width:36px}
.trVal{font-size:13px;width:30px;text-align:right}
.trChecks{gap:9px;margin-top:8px}
.trChecks .chk{margin:0}
.trChecks select{width:auto;padding:3px 6px;margin-left:4px}
.trPlayhead{display:flex;gap:3px;margin-top:10px}
.trPip{flex:1 1 8px;height:6px;border-radius:3px;background:var(--line);min-width:6px}
.trPip.trNow{background:var(--ink)}
.trPip.trDone{background:#B9B9BF}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const present = ctx.door.present || {};

    let steps = 8, meter = 4, splitIdx = 0, bpm = 72, running = false;
    let core = createTransportCore({ meter, splitIdx, steps, countIn: false });
    let armed = false, position = 0;
    let chordVol = 1, bassVol = 1, mutedStash = 1;

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
    byId("chordVolLab").textContent = (present.chordLabel || "chord").toLowerCase();

    const drawHead = (at) => {
      const host = byId("trHead");
      if (host.children.length !== steps) {
        host.textContent = "";
        for (let i = 0; i < steps; i++) { const p = d.createElement("span"); p.className = "trPip"; host.appendChild(p); }
      }
      for (let i = 0; i < host.children.length; i++)
        host.children[i].className = "trPip" + (i === at ? " trNow" : i < at ? " trDone" : "");
    };
    const showLoop = () => { byId("trLoop").textContent = armed ? "loop " + (core.loop + 1) : ""; };

    const mixer = () => announce(d, MIXER, {
      chord: chordVol, bass: bassVol, voice: vsel.value, click: byId("clickChk2").checked });

    const setPlaying = (want) => {
      byId("playBtn").textContent = want ? "Pause" : "Play";
      byId("playBtn").classList.toggle("trLit", want);
      if (want) {
        announce(d, CLOCK, { run: true });
        core.setCountIn(byId("countChk").checked);
        core.start(0, { fromStep: position });
        armed = "pending";
        // sound on, arm audio through the same message the mixer uses
        announce(d, MIXER, { on: true });
      } else { armed = false; core.stop(); }
      showLoop();
    };

    fillMeters(); fillSplits(); drawHead(0); showLoop();

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
    byId("clickChk2").addEventListener("change", mixer);
    vsel.addEventListener("change", mixer);
    /* mute chords IS the chord slider at zero — one state, two views, the
     * reference's rule (v0.8.7). The checkbox renders chordVol===0. */
    byId("chordVolR").addEventListener("input", (e) => {
      chordVol = Number(e.target.value) / 100; byId("chordVolVal").textContent = e.target.value;
      byId("metroChk").checked = chordVol === 0; mixer();
    });
    byId("metroChk").addEventListener("change", (e) => {
      if (e.target.checked) { mutedStash = chordVol || mutedStash; chordVol = 0; }
      else chordVol = mutedStash || 1;
      byId("chordVolR").value = String(Math.round(chordVol * 100));
      byId("chordVolVal").textContent = String(Math.round(chordVol * 100));
      mixer();
    });
    byId("bassVolR").addEventListener("input", (e) => {
      bassVol = Number(e.target.value) / 100; byId("bassVolVal").textContent = e.target.value; mixer();
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
      if (!running && armed) setPlaying(false);
    });

    listen(d, STEP_CHANGED, (m) => {
      if (!m || m.request === true) return;
      if (typeof m.total === "number" && m.total !== steps) { steps = m.total; core.setSteps(steps); }
      if (typeof m.index === "number") { position = m.index; drawHead(position); }
    });

    listen(d, BEAT, (ev) => {
      if (!ev || typeof ev.index !== "number") return;
      if (armed === "pending") { core.start(ev.index, { fromStep: position }); armed = true; }
      if (!armed) return;
      const w = core.beat(ev);
      if (w.countingIn) { byId("trLoop").textContent = "count-in " + w.beatsLeft; return; }
      if (!w.attack) return;
      showLoop();
      announce(d, STEP_CHANGED, { index: w.step, request: true, lead: ev.lead, level: w.level, meter, splitIdx,
        beats: patternOf(meter, splitIdx)[w.step % patternOf(meter, splitIdx).length] });
    });

    mixer();
  },
};
