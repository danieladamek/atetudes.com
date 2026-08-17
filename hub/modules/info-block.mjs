/* info-block.mjs — the Key / Scale / bottom-tone header, and the cycle.
 *
 * The frozen study's cleverest control, and the item asks for it to be
 * preserved: **the configuration reads like a chord chart's heading, not a
 * settings form.** Big type, a bordered block, the values themselves clickable
 * — no labelled `<select>` row. That is a design decision worth keeping, so it
 * is kept.
 *
 * THIS MODULE OWNS THE CONFIGURATION and tells nobody where it lives. It
 * announces changes through `hub/bus.mjs` as a plain value (§4.2.3). Prune it
 * and the stage and timeline keep the defaults they mounted with — a smaller
 * door, not a broken one.
 *
 * Everything it offers is DERIVED from the engine: the twelve keys from
 * chord.mjs's own spelling, the scales from SCALE_STEPS, the cycles from
 * tetrad-sequence's CYCLES, the string sets from STRING_SETS. Nothing is typed
 * out here that the engine already knows.
 */
import { scaleNotes, SCALE_STEPS } from "../../engine/chord.mjs";
import { CYCLES, STRING_SETS } from "../../engine/tetrad-sequence.mjs";
import { CONFIG_CHANGED, announce } from "../bus.mjs";

/* the twelve keys, spelled the way the frozen study spells them, DERIVED by
 * asking chord.mjs to spell each one rather than typing a row of names */
const KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
  .filter((k) => { try { return scaleNotes(k, "major").length === 7; } catch { return false; } });

const SCALE_NAMES = { major: "Major", harm: "Harmonic Minor", mel: "Melodic Minor" };
const BOTTOMS = ["R", "3", "5", "7"];

export const infoBlock = {
  id: "info-block",
  layer: "surface",
  requires: { material: "tetrad" },
  mount_point: "boards",
  order: 10,
  controls: ["ibKey", "ibScale", "ibTones", "ibCycle", "ibSet"],

  markup: `
  <div class="ib-board">
  <div class="ibRow">
    <div class="ibBlock">
      <div class="ibCell" id="ibKey" data-control="ibKey" title="Key center — click to change">
        <div class="ibLab">Key</div><div class="ibVal" id="ibKeyVal"></div>
      </div>
      <div class="ibCell" id="ibScale" data-control="ibScale" title="Scale — click to change">
        <div class="ibLab">Scale</div><div class="ibVal ibSmall" id="ibScaleVal"></div>
      </div>
      <div class="ibTones" id="ibTones" data-control="ibTones" title="Bottom tone of the starting tetrad"></div>
    </div>
  </div>
  <div class="ibPops">
    <div class="ibPop" id="ibKeyPop"></div>
    <div class="ibPop" id="ibScalePop"></div>
  </div>
  <div class="ibSegs">
    <div class="ibSeg" id="ibCycle" data-control="ibCycle"></div>
    <div class="ibSeg" id="ibSet" data-control="ibSet"></div>
  </div>
  <div class="ibRule" id="ibRule"></div>
  </div>`,

  /* Every rule names an `ib` token — markup only this module ships. The block's
   * whole look travels with it, so a door without it carries none of this. */
  styles: `
.ib-board{text-align:center}
.ibRow{display:flex;justify-content:center}
.ibBlock{display:inline-flex;align-items:stretch;background:#fff;border:2px solid var(--ink);
  border-radius:12px;overflow:hidden}
.ibCell{padding:8px 24px 10px;text-align:center;cursor:pointer}
.ibCell:hover{background:#F2F2F4}
.ibCell + .ibCell{border-left:2px solid var(--ink)}
.ibLab{font-size:11px;font-weight:bold;color:var(--gray)}
.ibVal{font-size:28px;font-weight:800;letter-spacing:-0.5px;line-height:1.15}
.ibVal.ibSmall{font-size:15px;line-height:1.25;padding-top:3px}
.ibTones{display:flex;flex-direction:column;border-left:2px solid var(--ink)}
.ibTones button{flex:1;border:0;background:#fff;width:40px;cursor:pointer;
  font:800 13px inherit;font-family:inherit;line-height:1;color:var(--ink)}
.ibTones button + button{border-top:1px solid var(--line)}
.ibTones button.ibOn{background:var(--ink);color:#fff}
.ibPops{position:relative}
.ibPop{display:none;position:absolute;left:50%;transform:translateX(-50%);top:4px;z-index:20;
  background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px;
  box-shadow:0 6px 22px rgba(33,33,38,0.14)}
.ibPop.ibOpen{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}
.ibPop button{border:1px solid var(--line);border-radius:7px;background:#fff;
  font:600 12.5px inherit;font-family:inherit;padding:7px 10px;cursor:pointer;color:var(--ink)}
.ibPop button.ibOn{background:var(--ink);color:#fff;border-color:var(--ink)}
.ibSegs{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;padding:14px 0 0}
.ibSeg{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:#fff}
.ibSeg button{border:0;background:#fff;color:var(--ink);font:600 12.5px inherit;
  font-family:inherit;padding:8px 13px;cursor:pointer}
.ibSeg button + button{border-left:1px solid var(--line)}
.ibSeg button.ibOn{background:var(--ink);color:#fff}
.ibRule{font-style:italic;font-size:12px;color:var(--gray);padding:10px 14px 0}
@media (max-width:760px){
  .ibVal{font-size:22px}
  .ibCell{padding:7px 14px 9px}
  .ibSeg button{padding:7px 9px;font-size:11.5px}
}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const lock = ctx.door.lock || {};

    /* PRIVATE. No other module can reach this object — they receive its value
     * on the bus and derive from that (§4.2.3). */
    const cfg = {
      key: "C", scale: "major",
      cycle: Object.keys(CYCLES).includes(lock.cycle) ? lock.cycle : "fourths",
      bottom: 0, setIndex: 0,
    };

    const button = (text, on, fn) => {
      const b = d.createElement("button");
      b.textContent = text;
      if (on) b.className = "ibOn";
      b.addEventListener("click", (e) => { e.stopPropagation(); fn(); });
      return b;
    };

    const fill = (host, items, current, pick) => {
      host.textContent = "";
      items.forEach((it, i) => host.appendChild(button(it, i === current, () => pick(i))));
    };

    const closePops = () => {
      byId("ibKeyPop").classList.remove("ibOpen");
      byId("ibScalePop").classList.remove("ibOpen");
    };

    const render = () => {
      byId("ibKeyVal").textContent = cfg.key;
      const sv = byId("ibScaleVal");
      sv.textContent = SCALE_NAMES[cfg.scale];
      fill(byId("ibKeyPop"), KEYS, KEYS.indexOf(cfg.key), (i) => { cfg.key = KEYS[i]; closePops(); push(); });
      const scales = Object.keys(SCALE_STEPS);
      fill(byId("ibScalePop"), scales.map((s) => SCALE_NAMES[s]), scales.indexOf(cfg.scale),
        (i) => { cfg.scale = scales[i]; closePops(); push(); });
      fill(byId("ibTones"), BOTTOMS, cfg.bottom, (i) => { cfg.bottom = i; push(); });
      const cycles = Object.keys(CYCLES);
      fill(byId("ibCycle"), cycles.map((c) => CYCLES[c].name), cycles.indexOf(cfg.cycle),
        (i) => { cfg.cycle = cycles[i]; push(); });
      fill(byId("ibSet"), STRING_SETS.map((s) => s.label), cfg.setIndex, (i) => { cfg.setIndex = i; push(); });
      byId("ibRule").textContent = CYCLES[cfg.cycle].rule;
    };

    /** render, then announce — listeners derive from the value, never from `cfg` */
    const push = () => { render(); announce(d, CONFIG_CHANGED, cfg); };

    byId("ibKey").addEventListener("click", (e) => {
      e.stopPropagation();
      byId("ibScalePop").classList.remove("ibOpen");
      byId("ibKeyPop").classList.toggle("ibOpen");
    });
    byId("ibScale").addEventListener("click", (e) => {
      e.stopPropagation();
      byId("ibKeyPop").classList.remove("ibOpen");
      byId("ibScalePop").classList.toggle("ibOpen");
    });
    d.addEventListener("click", closePops);

    push();
  },
};
