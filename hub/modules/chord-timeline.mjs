/* chord-timeline.mjs — the reference's chord timeline strip.
 *
 * `#timeline` in static/studies/triadetudes/study.html: a scrollable row of
 * BARS, each a group of chord chips whose width grows with the chord's beats —
 * so the bar split is visible rather than prose — with the step controls on
 * the strip's right (they step through changes, and the changes are here).
 * The current chord wears the red `.cur` ring; its bar is shaded.
 *
 * Roman numerals sit UNDER each chip — the door's chips carry them because a
 * tetrad app's vocabulary is the roman, and it costs nothing.
 *
 * It derives the pass itself from the announced configuration and asks the
 * position owner to move by announcing a request (§4.2.3). Bar length follows
 * the transport's meter and split, which it learns from CLOCK_STATE and the
 * transport's own announcements — never by reaching for the transport.
 */
import { tetradPass } from "../../engine/tetrad-sequence.mjs";
import { patternOf } from "../../engine/transport.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, CLOCK_STATE, listen, announce } from "../bus.mjs";
import { mountMini } from "../mini.mjs";

export const chordTimeline = {
  id: "chord-timeline",
  layer: "surface",
  requires: { material: "tetrad" },
  mount_point: "strips",
  order: 14,
  controls: ["tlBars", "tlMini"],

  markup: `
  <h2>Timeline</h2>
  <div class="tlrow">
    <div class="tlscroll" id="tlBars" data-control="tlBars"></div>
    <span id="tlMini" data-control="tlMini"></span>
  </div>`,

  /* the reference's timeline rules, verbatim values; the strip's own padding
   * replaces the card's so the row sits tight, as the study's `#timeline` does */
  styles: `
.tl-strip{padding:8px 12px}
.tlrow{display:flex;align-items:center;gap:12px}
.tlscroll{display:flex;flex:1 1 auto;overflow-x:auto;align-items:stretch;
          scrollbar-width:thin;padding:2px 0}
.tlbar{display:flex;flex:1 0 auto;align-items:center;gap:4px;
       border-left:2px solid #B9B9BF;padding:3px 8px;min-width:88px;border-radius:2px}
.tlbar:last-child{border-right:2px solid #B9B9BF}
.tlbar.curbar{background:#E9E9EC}
.tlbar button{font:inherit;font-size:12.5px;padding:2px 6px;border:1.4px solid transparent;
       border-radius:999px;background:transparent;cursor:pointer;color:var(--ink);
       min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
       display:inline-flex;flex-direction:column;align-items:center;line-height:1.15}
.tlbar button:hover{border-color:var(--line);background:#fff}
.tlbar button.cur{border-color:var(--red);color:var(--red);font-weight:bold;background:#fff}
.tlbar button .tlrn{font-size:9px;font-weight:normal;color:var(--gray);font-style:italic}
.tlbar button.cur .tlrn{color:var(--red)}
#tlMini{display:flex;gap:4px;flex:0 0 auto}
#tlMini button{font:inherit;font-size:11px;padding:2px 8px;border:1px solid var(--line);
  border-radius:6px;background:#fff;cursor:pointer;color:var(--ink);line-height:1.5}
#tlMini button:hover{border-color:var(--ink)}`,
  wrap_class: "tl-strip",

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const lock = ctx.door.lock || {};
    const families = Array.isArray(lock.families) && lock.families.length ? lock.families : ["drop2"];

    let cfg = { key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0 };
    let step = 0, meter = 4, splitIdx = 0, total = 8;

    const render = () => {
      const pass = tetradPass({ families, ...cfg });
      total = pass.steps.length;
      const host = byId("tlBars");
      host.textContent = "";
      const pat = patternOf(meter, splitIdx);
      const L = pat.length;
      let curBar = null;
      for (let i0 = 0; i0 < pass.steps.length; i0 += L) {
        const bd = d.createElement("div");
        bd.className = "tlbar";
        for (let k = 0; k < L && i0 + k < pass.steps.length; k++) {
          const i = i0 + k, s = pass.steps[i];
          const b = d.createElement("button");
          b.textContent = s.symbol;
          const rn = d.createElement("span"); rn.className = "tlrn"; rn.textContent = s.roman;
          b.appendChild(rn);
          b.style.flexGrow = String(pat[k]);
          b.title = pat[k] + (pat[k] === 1 ? " beat" : " beats");
          if (i === step) { b.className = "cur"; bd.classList.add("curbar"); curBar = bd; }
          b.addEventListener("click", () => announce(d, STEP_CHANGED, { index: i, request: true }));
          bd.appendChild(b);
        }
        host.appendChild(bd);
      }
      if (curBar) {   // keep the sounding bar in view — scroll the strip, never the page
        const dr = host.getBoundingClientRect(), cr = curBar.getBoundingClientRect();
        const r = cr.left - dr.left + host.scrollLeft, w = cr.width;
        if (r < host.scrollLeft) host.scrollLeft = r - 8;
        else if (r + w > host.scrollLeft + host.clientWidth) host.scrollLeft = r + w - host.clientWidth + 8;
      }
    };

    mountMini(ctx, byId("tlMini"));   // ⏮ ▶ ⏹ ⏭, driving the one clock via the bus

    listen(d, CONFIG_CHANGED, (next) => { cfg = { ...cfg, ...next }; step = 0; render(); });
    listen(d, STEP_CHANGED, (m) => {
      if (!m) return;
      // a transport request carries the split it walks — the bars follow it
      if (m.request === true && typeof m.splitIdx === "number") {
        if (typeof m.meter === "number") meter = m.meter;
        if (m.splitIdx !== splitIdx) { splitIdx = m.splitIdx; render(); }
        return;
      }
      if (m.request !== true && typeof m.index === "number") { step = m.index; render(); }
    });
    listen(d, CLOCK_STATE, (m) => {
      if (m && typeof m.meter === "number" && m.meter !== meter) { meter = m.meter; splitIdx = 0; render(); }
    });
    render();
  },
};
