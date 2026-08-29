/* timeline-strip.mjs — v0.9's CHART LINE, LIVE (child 7).
 *
 * Bars of chips, one per chord, widths from the chord's beats — so the split
 * is visible rather than prose (PRD §3). The current chip is red and its bar
 * shaded, exactly v0.9's classes. Every chip derives through the ONE
 * derivation (engine/progression.mjs's chordAt); nothing here spells a
 * chord.
 *
 * THE POSITION OWNER. The étude's place — which chord sounds — lives here:
 * chips and the boards ask with STEP_CHANGED {request:true, index}; this
 * strip clamps into the derived length, wraps ⏮/⏭ around the ends the way a
 * practice loop should, and echoes STEP_CHANGED {index}. Every board renders
 * the echo (§4.2.3). The mini's ▶ stays a PLAY request answered by the walk,
 * not by this strip — a strip summons the transport; it never owns a timer.
 *
 * THE BASS SUB-LINE: with a reference chosen, each chip carries what its
 * stack becomes over it — compositeOver's read-back name and the slash —
 * v0.9's upperStructureOf line, derived per bar through the same module
 * child 5 landed.
 */
import { mountMini } from "../mini.mjs";
import { field } from "../../engine/field.mjs";
import { progressionOf, chordAt, beatsOf } from "../../engine/progression.mjs";
import { placeReference, compositeOver, REF_OFFSET } from "../../engine/reference.mjs";
import { positionOf } from "../../engine/position.mjs";
import { diatonicTones, objectOffsets } from "../../engine/selection.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, CLOCK_STATE, listen, announce } from "../bus.mjs";

export const timelineStrip = {
  id: "timeline-strip",
  layer: "surface",
  requires: { surface: "multetudes" },
  mount_point: "boards",
  order: 16,
  controls: ["tlScroll", "tlStripMini"],

  markup: `
  <span class="mini" id="tlStripMini" data-control="tlStripMini"></span>
  <span class="clpsum">the chart line</span>
  <div class="tl-scroll" id="tlScroll" data-control="tlScroll"></div>`,

  styles: `
.tl-scroll{display:flex;flex:1 1 auto;overflow-x:auto;align-items:stretch;padding:2px 0;
  padding-right:130px}
.tl-bar{display:flex;flex:1 0 auto;align-items:stretch;gap:4px;border-left:2px solid #B9B9BF;
  padding:3px 8px;min-width:88px;border-radius:2px}
.tl-bar:last-child{border-right:2px solid #B9B9BF}
.tl-bar.tl-curbar{background:#E9E9EC}
.tl-bar button{font:inherit;font-size:12.5px;padding:2px 6px;border:1.4px solid transparent;
  border-radius:999px;background:transparent;cursor:pointer;color:var(--ink);min-width:0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-flex;
  flex-direction:column;align-items:center;justify-content:center;line-height:1.15}
.tl-bar button:hover{border-color:var(--line);background:#fff}
.tl-bar button.tl-cur{border-color:#B82929;color:#B82929;font-weight:bold;background:#fff}
.tl-bar button .tl-rn{font-size:9px;font-weight:normal;color:var(--gray);font-style:italic}
.tl-bar button.tl-cur .tl-rn{color:#B82929}
.tl-bar button .tl-us{font-size:10.5px;font-weight:600;color:var(--ink)}
.tl-bar button.tl-cur .tl-us{color:#B82929}
#tlStripMini{position:absolute;top:8px;right:12px;display:flex;gap:4px;z-index:5}
#tlStripMini button{font:inherit;font-size:11px;padding:2px 8px;border:1px solid var(--line);
  border-radius:6px;background:#fff;cursor:pointer;color:var(--ink);line-height:1.5}
#tlStripMini button:hover{border-color:var(--ink)}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    mountMini(ctx, byId("tlStripMini"));

    /* mirrors of the owners' halves; `index` is MINE (the position) */
    let cfg = { key: "Bb", scale: "major", ref: 0,
      source: "cycle", cycle: "fourths", form: "ii-V-I", custom: "", start: 0,
      object: "tetrad", dyad: [3, 7], bass: "none",
      strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3, split: null };
    let meter = 4;
    let index = 0;

    const render = () => {
      const host = byId("tlScroll");
      host.textContent = "";
      const fld = field({ key: cfg.key, scale: cfg.scale, ref: cfg.ref });
      const prog = progressionOf(cfg, cfg.key, cfg.scale);
      const beats = beatsOf(prog.bars, meter, cfg.split);
      if (index >= prog.chords.length) index = 0;
      host.setAttribute("data-tlline", prog.chords.map((_, i) =>
        chordAt(prog, i, fld, cfg.object, cfg.dyad).symbol).join(" "));
      host.setAttribute("data-tlbars", String(prog.bars.length));
      prog.bars.forEach((bar, bi) => {
        const el = d.createElement("div");
        el.className = "tl-bar" + (bar.includes(index) ? " tl-curbar" : "");
        bar.forEach((ci, k) => {
          const c = chordAt(prog, ci, fld, cfg.object, cfg.dyad);
          const b = d.createElement("button");
          b.className = ci === index ? "tl-cur" : "";
          b.style.flex = `${beats[bi][k]} 1 0`;
          b.title = `bar ${bi + 1}, ${beats[bi][k]} beat${beats[bi][k] > 1 ? "s" : ""}`;
          b.setAttribute("data-tlchip", c.symbol);
          const top = d.createElement("span"); top.textContent = c.symbol; b.appendChild(top);
          /* the sub-line: the stack over the reference when one is chosen
           * and this bar's degree can carry it; else the analysis roman */
          let sub = null;
          if (cfg.bass !== "none" && cfg.object !== "scale" && c.degree >= 0 && c.tones) {
            const pos = positionOf({ field: fld, anchorString: Math.max(...cfg.strings),
              startDegree: cfg.startDeg, nearFret: cfg.nearFret });
            const rp = placeReference(cfg.bass, c.degree, fld, cfg.strings, pos);
            if (rp.note) {
              const comp = compositeOver(fld, rp.note.keyDeg, c.tones.map((t) => t.pc));
              if (comp.name) {
                const us = d.createElement("span"); us.className = "tl-us";
                us.textContent = comp.name; b.appendChild(us);
                sub = `${c.symbol}/${comp.bassName}`;
              } else sub = `${c.symbol}/${comp.bassName}`;
            }
          }
          const rn = d.createElement("span"); rn.className = "tl-rn";
          rn.textContent = sub || c.roman; b.appendChild(rn);
          b.addEventListener("click", () => { setIndex(ci); });
          el.appendChild(b);
        });
        host.appendChild(el);
      });
    };

    /* the position: clamp-and-wrap into the DERIVED length, echo the truth */
    const lengthNow = () =>
      progressionOf(cfg, cfg.key, cfg.scale).chords.length;
    const setIndex = (i) => {
      const n = lengthNow();
      index = ((i % n) + n) % n;
      render();
      announce(d, STEP_CHANGED, { index });
    };

    listen(d, CONFIG_CHANGED, (m) => {
      if (!m || typeof m !== "object") return;
      let changed = false;
      for (const k of Object.keys(cfg))
        if (k in m && JSON.stringify(m[k]) !== JSON.stringify(cfg[k])) {
          cfg = { ...cfg, [k]: Array.isArray(m[k]) ? [...m[k]] : m[k] }; changed = true;
        }
      if (changed) {
        const n = lengthNow();
        if (index >= n) { index = 0; announce(d, STEP_CHANGED, { index }); }
        render();
      }
    });
    listen(d, STEP_CHANGED, (m) => {
      if (!m || typeof m.index !== "number") return;
      if (m.request === true) { setIndex(m.index); return; }   // the owner answers
      if (m.index !== index) { index = m.index; render(); }     // adopt an echo (the walk's)
    });
    listen(d, CLOCK_STATE, (m) => {
      if (m && typeof m.meter === "number" && m.meter !== meter) { meter = m.meter; render(); }
    });

    render();
    announce(d, STEP_CHANGED, { index });    // boot: the boards hear bar 1 exists
  },
};
