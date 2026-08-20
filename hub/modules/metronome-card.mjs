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
    "subSel", "voiceSel", "clickMute", "accChk", "clickVolR", "clickVolVal"],

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
    <div class="rowEnd"><label class="chk"><input type="checkbox" id="accChk" data-control="accChk" checked> accents</label></div>
  </div>
  <div class="bpmrow" title="the click level — muted is this slider at zero">
    <button id="clickMute" data-control="clickMute" class="muteBtn">🔊</button>
    <span class="metrolabel">Vol</span>
    <input type="range" id="clickVolR" data-control="clickVolR" min="0" max="100" value="80">
    <span id="clickVolVal" data-control="clickVolVal" class="metroval">80</span>
  </div>
  <div class="clpsum" id="metroSum">A metronome on its own clock — with or without the étude.</div>
  <div class="hint info">A full metronome on its own clock — use it with or without the étude.
  The étude subscribes to this grid. (Shared component: every At-Etudes app carries this
  metronome, first block, this look.)</div>`,

  /* Every rule names `metro`, `metrolabel`, `metroval`, `row2`,
   * `chk`, `bpmrow` or a control id — tokens no other module ships today. The
   * inverted card cannot outlive the card.
   *
   * `.chk`, `.row2` and `.bpmrow` all lived here while exactly one module used
   * them, and were each promoted to the shell the day a second user arrived
   * (2026-08-17: the transport card, the harmony panel, and the transport card
   * again for `.bpmrow`). Grammar is earned with evidence rather than declared
   * in advance, and the resolver refused the build until each moved. */
  styles: `
.card.metro{background:var(--ink);border-color:var(--ink);color:#ECECEE}
.card.metro h2{color:#9C9CA4}
/* the collapse chevron is shell grammar, but its dark-card variant belongs here
 * with the inverted card it dresses — metro is this module's own token, so the
 * rule cannot outlive the card (Shell 4) */
.card.metro .clpsBtn{background:#2E2E34;color:#9C9CA4;border-color:#44444C}
.card.metro label{color:#9C9CA4}
/* the info button's dark-card variant lives here with the inverted card it
 * dresses — metro is this module's own token, so the rule cannot outlive the
 * card (same reason as the collapse chevron above). The static prose it reveals
 * now lives in a white popout, so it needs no dark-card colour of its own. */
.card.metro .infoBtn{background:#2E2E34;color:#9C9CA4;border-color:#44444C}
.card.metro .muteBtn{background:transparent}
.card.metro select{background:#2E2E34;color:#ECECEE;border-color:#44444C}
.card.metro .transport button{background:#2E2E34;color:#ECECEE;border-color:#44444C}
.card.metro .transport button.primary{background:#ECECEE;color:var(--ink);
  border-color:#ECECEE;font-weight:bold}
.card.metro .chk{color:#D8D8DC}
.card.metro input[type=range]{accent-color:#ECECEE}
.metrolabel{font-size:12px;color:#9C9CA4}
.metroval{font-size:13px;width:30px;text-align:right}
#beatLamp{display:flex;gap:5px;align-items:center;margin-left:4px}
#beatLamp span{width:9px;height:9px;border-radius:50%;background:#44444C;display:block}
#beatLamp span.on{background:#ECECEE}
#beatLamp span.acc{background:var(--red)}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const core = createMetroCore({ bpm: 72, meter: 4 });
    const tap = createTapTempo();
    const now = () => (d.defaultView ? d.defaultView.performance.now() : 0) / 1000;
    /* THE CLICK'S ON/OFF — the clock owner's state, riding CLOCK_STATE.click
     * (260820.2), and since 260820.3 it IS the Vol level at zero: v0.8.7's
     * mute-is-the-slider-at-zero rule, made universal. The mute icon replaced
     * the Sound button (Daniel's design) and is a VIEW of the level — level 0
     * renders muted however it got there, dragging included. The stash is a
     * memory, not an owner: unmute restores the last non-zero level, or this
     * slider's default (80). Views of the one fact: the icon, the Vol slider,
     * and the transport's metronome checkbox (via CLOCK requests). */
    let raf = null, sound = true, clickStash = 0.8;

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
    /* metroOwner — the reference's rule (triadetudes study.html:5209-5230),
     * carried into the hub BY NAME after the side-by-side triage of 2026-08-19.
     * WHO started the clock: "transport" (the étude's Play) or "metro" (this
     * card's own Start), null when stopped. The rule it encodes:
     *   - the transport stops the clock ONLY IF the transport started it — a
     *     metronome the user started by hand survives a transport Pause;
     *   - this card's own Stop stops EVERYTHING (the reference's stopAll): the
     *     transport disarms on the CLOCK_STATE it hears back.
     * Ownership is STATE, so it rides CLOCK_STATE (replayed to late subscribers
     * like the rest) rather than an ad-hoc stop bolted onto the pause path. */
    let owner = null;
    /* the icon is a VIEW: it renders the level (muted at 0), announces itself
     * (aria-pressed — an icon does not, a checkbox did), and its title states
     * the ACTION. The card's collapse summary is LIVE, as the reference's is. */
    const clickVol = () => Number(byId("clickVolR").value) / 100;
    const syncSound = () => {
      sound = clickVol() > 0;
      const b = byId("clickMute");
      b.textContent = sound ? "🔊" : "🔇";
      b.title = sound ? "mute the click — the slider to zero" : "unmute — restore the click level";
      b.setAttribute("aria-pressed", String(!sound));
      const sum = byId("metroSum");
      if (sum) sum.textContent = `A metronome on its own clock — ${core.running ? "running" : "stopped"} · ` +
        `${core.bpm} bpm · ${core.meter}/4 · click ${sound ? "on" : "off"}.`;
    };
    const setClickVol = (v) => {
      byId("clickVolR").value = String(Math.round(v * 100));
      byId("clickVolVal").textContent = String(Math.round(v * 100));
      publish();
    };
    const publish = () => { syncSound(); announce(d, CLOCK_STATE,
      { running: core.running, bpm: core.bpm, meter: core.meter, owner, click: sound }); };

    const setRunning = (want, who) => {
      if (want === core.running) return;
      if (!want) {
        core.stop();
        if (raf) { d.defaultView.cancelAnimationFrame(raf); raf = null; }
        byId("metroBtn").textContent = "Start";
        light(-1);
        owner = null;
      } else {
        core.start(now());
        byId("metroBtn").textContent = "Stop";
        owner = who || "metro";
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
      if (typeof m.run === "boolean") {
        // a stop that NAMES an owner is honoured only if that owner started the
        // clock — the transport may not stop a metronome the user started by
        // hand. An unnamed stop, or a start, is applied as asked.
        if (m.run === false && m.owner && owner !== m.owner) return;
        setRunning(m.run, m.owner);
      }
      // the other view asking: the transport's metronome checkbox — mapped to
      // the ONE state, the level: off stashes and zeroes, on restores
      if (typeof m.click === "boolean" && m.click !== (clickVol() > 0)) {
        if (!m.click) { clickStash = clickVol() || clickStash; setClickVol(0); }
        else setClickVol(clickStash > 0 ? clickStash : 0.8);
      }
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
    byId("clickMute").addEventListener("click", () => {
      if (clickVol() > 0) { clickStash = clickVol(); setClickVol(0); }
      else setClickVol(clickStash > 0 ? clickStash : 0.8);
    });
    byId("clickVolR").addEventListener("input", (e) => {
      byId("clickVolVal").textContent = e.target.value;
      const v = Number(e.target.value) / 100;
      if (v > 0) clickStash = v;
      // rule 1: level 0 IS muted, however it got there — dragging included.
      // publish() re-derives `sound` from the level and re-renders the icon.
      publish();
    });
    byId("accChk").addEventListener("change", () => light(-1));
    lamps(); light(-1);
    // say what the grid is at mount, so a card that mounts after this one still
    // starts from the truth rather than from its own defaults
    publish();
  },
};
