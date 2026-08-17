/* metronome-card.mjs — the family constant as a door contribution.
 *
 * The metronome is the one card every At-Etudes app carries, first block, this
 * look (family spec §4.3, asserted by host-conformance). It therefore has NO
 * requirement: every lock reaches it, and it is what makes the artifact grep on
 * a notepad-less door SURGICAL rather than vacuous — that door still ships a
 * whole card's markup, styles and script.
 *
 * The behaviour comes from engine/metronome.mjs unchanged (that module is
 * byte-pinned into two shipped studies; nothing here may edit it). Audio stays
 * app-side: the core is pure timing math, and the clock is driven here from
 * requestAnimationFrame so the card is genuinely live without an AudioContext.
 *
 * MARKUP AND STYLES ARE THE MODULE'S. In the shipped study they are page-level
 * — the card's inverted look lives in the study's stylesheet — which is exactly
 * why a door could not prune it. Ownership moved with the module, and the
 * resolver now enforces that it stays moved.
 */
import { createMetroCore, createTapTempo, SUB_OFFSETS } from "../../engine/metronome.mjs";

export const metronomeCard = {
  id: "metronome-card",
  layer: "surface",
  requires: {},
  mount_point: "cards",
  wrap_class: "metro",
  controls: ["metroBtn", "tapBtn", "beatLamp", "bpmRange", "bpmVal", "meterSel",
    "subSel", "voiceSel", "clickTgl", "accChk", "clickVolR", "clickVolVal"],

  markup: `
  <h2>Metronome</h2>
  <div class="transport">
    <button id="metroBtn" data-control="metroBtn" class="primary">Start</button>
    <button id="tapBtn" data-control="tapBtn" title="tap a tempo">Tap</button>
    <span id="beatLamp" data-control="beatLamp"></span>
  </div>
  <div class="bpmrow">
    <span class="metrolabel">BPM</span>
    <input type="range" id="bpmRange" data-control="bpmRange" min="30" max="200" value="72">
    <span id="bpmVal" data-control="bpmVal" class="metroval">72</span>
  </div>
  <div class="row2">
    <div><label>Time</label>
      <select id="meterSel" data-control="meterSel"><option value="4" selected>4/4</option><option value="3">3/4</option>
        <option value="5">5/4</option><option value="6">6/4</option><option value="7">7/4</option></select></div>
    <div><label>Subdivision</label>
      <select id="subSel" data-control="subSel"><option value="1" selected>beats</option><option value="2">8ths</option>
        <option value="3">triplets</option><option value="4">16ths</option></select></div>
    <div><label>Voice</label>
      <select id="voiceSel" data-control="voiceSel"><option value="beep" selected>beep</option>
        <option value="wood">wood</option><option value="tick">tick</option></select></div>
  </div>
  <div class="transport metrosound">
    <button id="clickTgl" data-control="clickTgl" title="click sound on/off">Sound: on</button>
    <label class="chk"><input type="checkbox" id="accChk" data-control="accChk" checked> accents</label>
  </div>
  <div class="bpmrow">
    <span class="metrolabel">Vol</span>
    <input type="range" id="clickVolR" data-control="clickVolR" min="0" max="100" value="80">
    <span id="clickVolVal" data-control="clickVolVal" class="metroval">80</span>
  </div>
  <div class="hint">A full metronome on its own clock — use it with or without the étude.
  The étude subscribes to this grid. (Shared component: every At-Etudes app carries this
  metronome, first block, this look.)</div>`,

  /* Every rule names `metro`, `metrolabel`, `metroval`, `metrosound`, `row2`,
   * `chk`, `bpmrow` or a control id — tokens no other module ships today. The
   * inverted card cannot outlive the card.
   *
   * `.row2`, `.chk` and `.bpmrow` LOOK like page grammar and sit in the shell's
   * stylesheet in the shipped study. They are here because exactly one module
   * uses them: grammar is promoted to the shell when it earns a second user,
   * with the evidence, rather than being declared grammar in advance. */
  styles: `
.row2{display:flex;gap:10px;flex-wrap:wrap}
.row2>div{flex:1 1 90px}
.chk{display:flex;align-items:center;gap:7px;font-size:13px;margin:7px 0;cursor:pointer}
.chk input{width:auto}
.bpmrow{display:flex;align-items:center;gap:8px;margin-top:10px}
.bpmrow input[type=range]{flex:1;accent-color:var(--ink);width:auto}
.card.metro{background:var(--ink);border-color:var(--ink);color:#ECECEE}
.card.metro h2{color:#9C9CA4}
.card.metro label{color:#9C9CA4}
.card.metro .hint{color:#85858D}
.card.metro select{background:#2E2E34;color:#ECECEE;border-color:#44444C}
.card.metro .transport button{background:#2E2E34;color:#ECECEE;border-color:#44444C}
.card.metro .transport button.primary{background:#ECECEE;color:var(--ink);
  border-color:#ECECEE;font-weight:bold}
.card.metro .chk{color:#D8D8DC}
.card.metro input[type=range]{accent-color:#ECECEE}
.metrolabel{font-size:12px;color:#9C9CA4}
.metroval{font-size:13px;width:30px;text-align:right}
.metrosound{gap:9px;margin-top:8px}
.metrosound .chk{margin:0}
#beatLamp{display:flex;gap:5px;align-items:center;margin-left:4px}
#beatLamp span{width:9px;height:9px;border-radius:50%;background:#44444C;display:block}
#beatLamp span.on{background:#ECECEE}
#beatLamp span.acc{background:var(--red)}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const core = createMetroCore({ bpm: 72, meter: 4 });
    const tap = createTapTempo();
    const now = () => (d.defaultView ? d.defaultView.performance.now() : 0) / 1000;
    let raf = null, sound = true;

    const lamps = () => {
      const w = byId("beatLamp");
      w.textContent = "";
      for (let i = 0; i < core.meter; i++) w.appendChild(d.createElement("span"));
    };
    /* the downbeat wears `acc` for as long as accents are on — a state, not a
     * 40 ms flash. `on` marks the beat the clock is currently sounding. */
    const light = (beat) => {
      const dots = byId("beatLamp").children;
      const acc = byId("accChk").checked;
      for (let i = 0; i < dots.length; i++)
        dots[i].className = (i === 0 && acc ? "acc " : "") + (i === beat ? "on" : "");
    };
    const pump = () => {
      for (const ev of core.pump(now(), 0.02)) light(ev.beat);
      if (core.running) raf = d.defaultView.requestAnimationFrame(pump);
    };

    byId("metroBtn").addEventListener("click", () => {
      if (core.running) {
        core.stop();
        if (raf) d.defaultView.cancelAnimationFrame(raf);
        byId("metroBtn").textContent = "Start";
        light(-1);
      } else {
        core.start(now());
        byId("metroBtn").textContent = "Stop";
        pump();
      }
      ctx.changed();
    });
    byId("tapBtn").addEventListener("click", () => {
      const bpm = tap(now());
      if (bpm) { core.setBpm(bpm); byId("bpmRange").value = bpm; byId("bpmVal").textContent = bpm; }
    });
    byId("bpmRange").addEventListener("input", (e) => {
      core.setBpm(+e.target.value); byId("bpmVal").textContent = e.target.value;
    });
    byId("meterSel").addEventListener("change", (e) => {
      core.setMeter(+e.target.value); if (!core.running) lamps();
    });
    byId("subSel").addEventListener("change", (e) => {
      // the offsets the audio layer would schedule against; asserted live so a
      // meaningless subdivision cannot be selected silently
      if (!SUB_OFFSETS[+e.target.value]) throw new Error("unknown subdivision");
    });
    byId("clickTgl").addEventListener("click", () => {
      sound = !sound; byId("clickTgl").textContent = "Sound: " + (sound ? "on" : "off");
    });
    byId("clickVolR").addEventListener("input", (e) => {
      byId("clickVolVal").textContent = e.target.value;
    });
    byId("accChk").addEventListener("change", () => light(-1));
    lamps(); light(-1);
  },
};
