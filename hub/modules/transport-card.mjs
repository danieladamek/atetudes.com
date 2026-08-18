/* transport-card.mjs — play/pause, tempo, meter, bar-split, count-in, and where
 * you are in the pass.
 *
 * Shell child 1. The roadmap's complaint made concrete: *"the study's fixed
 * 1700 ms interval was fine for a demonstration; it isn't practice."* A chord
 * that changes on a BEAT can be practised against; one that changes on a
 * wall-clock timer cannot.
 *
 * ONE GRID, AND THIS CARD IS NOT ITS OWNER.
 * ----------------------------------------
 * `metronome-card` owns the clock — its own hint has said so since it was
 * written: *"a full metronome on its own clock… the étude subscribes to this
 * grid."* This card SUBSCRIBES to that grid rather than starting a second one:
 * it listens for `BEAT`, walks `engine/transport.mjs` along it, and announces
 * the step. So the click and the chord change are the SAME beat rather than two
 * timers that agree for a while — which is the difference between a transport
 * that looks right and one that stays right.
 *
 * It never touches the metronome's state (§4.2.3). To start the grid, change
 * its tempo or change its meter it announces a `CLOCK` REQUEST and renders
 * whatever `CLOCK_STATE` comes back, so the two cards are two views of one
 * clock and cannot drift apart. Prune the metronome and this card simply never
 * hears a beat; prune this and the metronome is untouched.
 *
 * NAMED BY ROLE. Nothing here says triad, tetrad or fret: a transport walks
 * STEPS of a pass. What a step means belongs to whoever announced the pass.
 */
import { createTransportCore, patternOf, SPLITS, LEVEL } from "../../engine/transport.mjs";
import { CLOCK, CLOCK_STATE, BEAT, STEP_CHANGED, listen, announce } from "../bus.mjs";

const METERS = Object.keys(SPLITS).map(Number).sort((a, b) => a - b);

export const transportCard = {
  id: "transport-card",
  layer: "surface",
  requires: { transport: true },
  mount_point: "cards",
  order: 1,                       // beside the metronome, before the harmony layer
  controls: ["trPlay", "trBpm", "trMeter", "trSplit", "trCountIn", "trHead"],

  markup: `
  <h2 class="trHead2">Transport</h2>
  <div class="transport">
    <button id="trPlay" data-control="trPlay" class="trToggle">Play</button>
    <span class="trCount" id="trLoop">loop 1</span>
  </div>
  <div class="trBpmRow">
    <span class="trLab">BPM</span>
    <input type="range" id="trBpm" data-control="trBpm" min="30" max="200" value="72">
    <span class="trVal" id="trBpmVal">72</span>
  </div>
  <div class="trRow">
    <div><label>Time</label>
      <select id="trMeter" data-control="trMeter"></select></div>
    <div><label>Bar split</label>
      <select id="trSplit" data-control="trSplit"></select></div>
  </div>
  <label class="chk"><input type="checkbox" id="trCountIn" data-control="trCountIn"> count-in</label>
  <div class="trPlayhead" id="trHead" data-control="trHead"></div>
  <div class="hint trHint" id="trHint">The chord changes on a beat, not on a timer — so the click
  and the change are the same event. Tempo and time signature are the metronome's grid; this is the
  same clock, seen from the étude's side.</div>`,

  styles: `
.trHead2{font-size:12px;letter-spacing:.06em;text-transform:uppercase;
  color:var(--gray);margin:0 0 10px;font-weight:bold}
.trToggle{font:600 14px inherit;font-family:inherit;padding:7px 15px;border:1px solid var(--line);
  border-radius:8px;background:#fff;cursor:pointer;color:var(--ink)}
.trToggle.trLit{background:var(--ink);color:#fff;border-color:var(--ink)}
.trCount{font-size:12px;color:var(--gray);margin-left:4px}
.trBpmRow{display:flex;align-items:center;gap:8px;margin-top:10px}
.trBpmRow input[type=range]{flex:1;accent-color:var(--ink);width:auto}
.trLab{font-size:12px;color:var(--gray)}
.trVal{font-size:13px;width:30px;text-align:right}
.trRow{display:flex;gap:10px;flex-wrap:wrap}
.trRow>div{flex:1 1 100px}
.trPlayhead{display:flex;gap:3px;flex-wrap:wrap;margin-top:10px}
.trPip{flex:1 1 8px;height:8px;border-radius:3px;background:var(--line);min-width:6px}
.trPip.trNow{background:var(--ink)}
.trPip.trDone{background:#B9B9BF}
.trHint{margin-top:10px}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;

    /* PRIVATE. Nothing reads this but this card. */
    let steps = 8, meter = 4, splitIdx = 0, bpm = 72, running = false;
    let core = createTransportCore({ meter, splitIdx, steps, countIn: false });
    let armed = false;                       // the user pressed Play

    const fillMeters = () => {
      const sel = byId("trMeter");
      sel.textContent = "";
      for (const m of METERS) {
        const o = d.createElement("option");
        o.value = String(m); o.textContent = m + "/4";
        if (m === meter) o.selected = true;
        sel.appendChild(o);
      }
    };
    const fillSplits = () => {
      const sel = byId("trSplit");
      sel.textContent = "";
      (SPLITS[meter] || []).forEach((p, i) => {
        const o = d.createElement("option");
        o.value = String(i);
        o.textContent = p.join("+");
        if (i === splitIdx) o.selected = true;
        sel.appendChild(o);
      });
    };

    /** the playhead: one pip per step of the pass, the current one filled.
     * Derived from the walk on every attack — this card keeps no count of its
     * own beyond the core's, and the stage keeps none at all. */
    const drawHead = (at) => {
      const host = byId("trHead");
      if (host.children.length !== steps) {
        host.textContent = "";
        for (let i = 0; i < steps; i++) {
          const p = d.createElement("span");
          p.className = "trPip";
          host.appendChild(p);
        }
      }
      for (let i = 0; i < host.children.length; i++)
        host.children[i].className = "trPip" +
          (i === at ? " trNow" : i < at ? " trDone" : "");
    };

    const showLoop = () => { byId("trLoop").textContent = "loop " + (core.loop + 1); };

    const setPlaying = (want) => {
      armed = want;
      byId("trPlay").textContent = want ? "Pause" : "Play";
      byId("trPlay").classList.toggle("trLit", want);
      if (want) {
        // the grid is the metronome's; ask for it rather than starting one here
        announce(d, CLOCK, { run: true });
        core.setCountIn(byId("trCountIn").checked);
        core.start(0);                      // re-armed on the first beat heard
        armed = "pending";
      } else {
        core.stop();
        showLoop();
      }
    };

    /* ---- controls ---- */
    fillMeters(); fillSplits(); drawHead(0); showLoop();

    byId("trPlay").addEventListener("click", () => setPlaying(!armed));
    byId("trBpm").addEventListener("input", (e) => {
      byId("trBpmVal").textContent = e.target.value;
      announce(d, CLOCK, { bpm: Number(e.target.value) });     // the owner applies it
    });
    byId("trMeter").addEventListener("change", (e) => {
      announce(d, CLOCK, { meter: Number(e.target.value) });
    });
    byId("trSplit").addEventListener("change", (e) => {
      splitIdx = Number(e.target.value);
      core.setSplit(splitIdx);
    });
    byId("trCountIn").addEventListener("change", (e) => core.setCountIn(e.target.checked));

    /* ---- what it listens to ---- */

    // the grid's own state: this card is a VIEW of it, never a second copy
    listen(d, CLOCK_STATE, (m) => {
      if (!m) return;
      running = !!m.running;
      if (typeof m.bpm === "number" && m.bpm !== bpm) {
        bpm = m.bpm;
        byId("trBpm").value = bpm; byId("trBpmVal").textContent = bpm;
      }
      if (typeof m.meter === "number" && m.meter !== meter) {
        core.setMeter(m.meter);
        meter = m.meter; splitIdx = core.splitIdx;
        fillMeters(); fillSplits();
      }
      if (!running && armed) setPlaying(false);   // the grid stopped under us
    });

    /* The pass length comes from the position owner's own answer, which has
     * always carried `total` — so the transport learns how long a pass is from
     * the thing that knows, without a new message or a second derivation. */
    listen(d, STEP_CHANGED, (m) => {
      if (!m || m.request === true) return;
      if (typeof m.total === "number" && m.total !== steps) {
        steps = m.total; core.setSteps(steps); drawHead(core.step);
      }
      if (!armed && typeof m.index === "number") drawHead(m.index);   // stepped by hand
    });

    /* THE WALK. One beat in, at most one step out — so the click and the chord
     * change are the same event by construction rather than by coincidence. */
    listen(d, BEAT, (ev) => {
      if (!ev || typeof ev.index !== "number") return;
      if (armed === "pending") { core.start(ev.index, { fromStep: core.step }); armed = true; }
      if (!armed) return;
      const w = core.beat(ev);
      if (w.countingIn) { byId("trLoop").textContent = "count-in " + w.beatsLeft; return; }
      if (!w.attack) return;
      drawHead(w.step);
      showLoop();
      // ask whoever owns the position to move; the stage answers with the
      // authoritative step and the audio card sounds it (§4.2.3)
      announce(d, STEP_CHANGED, { index: w.step, request: true, lead: ev.lead, level: w.level });
    });
  },
};
