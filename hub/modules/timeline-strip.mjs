/* timeline-strip.mjs — v0.9's CHART LINE, VISIBLY INERT (Multetudes surface,
 * 2026-08-29).
 *
 * The chart line is bars of chips whose width grows with the chord's beats —
 * and bars come from the progression, which is CHILD 7. Until it lands this
 * strip renders the line's frame with the reason on its face, plus the
 * family's own ⏮ ▶ ⏹ ⏭ mini (hub/mini.mjs — a strip summons the transport;
 * it never owns a timer). The mini's requests fall on the bus unanswered
 * tonight because no transport module is mounted — that silence is child 7's
 * to end, and the face says so rather than letting a dead Play read as a
 * broken one.
 */
import { mountMini } from "../mini.mjs";

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
  <div class="tl-scroll" id="tlScroll" data-control="tlScroll">
    <div class="tl-bar"><span class="tl-inert">The chart line — bars of chips, one per chord,
    widths from the bar split. Inert until the progression arrives (child 7); the étude holds
    one bar meanwhile.</span></div>
  </div>`,

  styles: `
.tl-scroll{display:flex;flex:1 1 auto;overflow-x:auto;align-items:stretch;padding:2px 0;
  padding-right:130px}
.tl-bar{display:flex;flex:1 0 auto;align-items:center;gap:4px;border-left:2px solid #B9B9BF;
  border-right:2px solid #B9B9BF;padding:3px 8px;min-width:88px;border-radius:2px}
.tl-inert{font-size:12px;color:var(--gray);font-style:italic}
#tlStripMini{position:absolute;top:8px;right:12px;display:flex;gap:4px;z-index:5}
#tlStripMini button{font:inherit;font-size:11px;padding:2px 8px;border:1px solid var(--line);
  border-radius:6px;background:#fff;cursor:pointer;color:var(--ink);line-height:1.5}
#tlStripMini button:hover{border-color:var(--ink)}`,

  mount(ctx) {
    mountMini(ctx, ctx.byId("tlStripMini"));
  },
};
