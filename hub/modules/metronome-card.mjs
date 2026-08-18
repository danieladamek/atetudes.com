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
import { BEAT, CLOCK, CLOCK_STATE, announce, listen } from "../bus.mjs";

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
   * `.bpmrow` LOOKS like page grammar and sits in the shell's stylesheet in
   * the shipped study. It is here because exactly one module uses it: grammar
   * is promoted to the shell when it earns a second user, with the evidence,
   * rather than being declared grammar in advance.
   *
   * `.chk` and `.row2` WERE here on exactly those terms and have been
   * promoted — the transport card became `.chk`'s second user and the harmony
   * panel `.row2`'s (both 2026-08-17). The rule worked as written each time:
   * the resolver refused the build until they moved. */
  styles: `
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
    /* The card lights the lamp and ANNOUNCES the beat; it does not make a
     * sound and does not know what does. `core.pump` returns events in the
     * future, so the lead is real lookahead rather than "now" — a listener
     * with an AudioContext can schedule it accurately. If nothing is
     * listening, nothing happens, which is the point (§4.2.3). */
    const pump = () => {
      const t = now();
      for (const ev of core.pump(t, 0.02)) {
        light(ev.beat);
        announce(d, BEAT, {
          level: ev.beat === 0 ? 2 : 0,          // 2 = bar, 0 = beat
          lead: Math.max(0, ev.time - t),
          voice: byId("voiceSel").value,
          accents: byId("accChk").checked,
          vol: Number(byId("clickVolR").value) / 100,
          // the beat's PLACE on the grid, so a listener can walk a sequence
          // along the same beats this card is clicking (additive: a listener
          // that only wants a noise reads level/lead and ignores these)
          index: ev.index, beat: ev.beat, bar: ev.bar,
          meter: core.meter, bpm: core.bpm,
        });
      }
      if (core.running) raf = d.defaultView.requestAnimationFrame(pump);
    };

    /* THIS CARD OWNS THE GRID, and says so on the bus rather than being asked.
     * Anything else that shows tempo, meter or a run state renders from
     * CLOCK_STATE, so two views of one clock cannot drift apart — and a door
     * that prunes this card simply has no grid, which is smaller, not broken. */
    const publish = () => announce(d, CLOCK_STATE,
      { running: core.running, bpm: core.bpm, meter: core.meter });

    const setRunning = (want) => {
      if (want === core.running) return;
      if (!want) {
        core.stop();
        if (raf) { d.defaultView.cancelAnimationFrame(raf); raf = null; }
        byId("metroBtn").textContent = "Start";
        light(-1);
      } else {
        core.start(now());
        byId("metroBtn").textContent = "Stop";
        pump();
      }
      publish();
    };

    /* a REQUEST from elsewhere — the transport asking for the grid it walks on.
     * It is applied here, by the owner, and answered with the resulting state. */
    listen(d, CLOCK, (m) => {
      if (!m) return;
      if (typeof m.bpm === "number") {
        core.setBpm(m.bpm);
        byId("bpmRange").value = m.bpm; byId("bpmVal").textContent = m.bpm;
      }
      if (typeof m.meter === "number") {
        core.setMeter(m.meter);
        byId("meterSel").value = String(m.meter);
        if (!core.running) lamps();
      }
      if (typeof m.run === "boolean") setRunning(m.run);
      else publish();
    });

    byId("metroBtn").addEventListener("click", () => {
      setRunning(!core.running);
      ctx.changed();
    });
    byId("tapBtn").addEventListener("click", () => {
      const bpm = tap(now());
      if (bpm) { core.setBpm(bpm); byId("bpmRange").value = bpm; byId("bpmVal").textContent = bpm; publish(); }
    });
    byId("bpmRange").addEventListener("input", (e) => {
      core.setBpm(+e.target.value); byId("bpmVal").textContent = e.target.value; publish();
    });
    byId("meterSel").addEventListener("change", (e) => {
      core.setMeter(+e.target.value); if (!core.running) lamps(); publish();
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
    // say what the grid is at mount, so a card that mounts after this one still
    // starts from the truth rather than from its own defaults
    publish();
  },
};
