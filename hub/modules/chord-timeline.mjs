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
 *
 * THE DRAWING IS THE FAMILY'S (night 43, 261007): engine/chart-line.mjs draws
 * the strip Multetudes' timeline strip drew — the root-degree dot from the
 * pass step's degree, the roman as data (this app's own spelling, viiø7 — the
 * spelling gate was built for KEEP), beats from the transport's pattern. No
 * sub-line: this host has no bass reference, so it supplies none and asks for
 * no sub-line rules. The near-miss twins (.tlbar/.tlrn/.cur) are gone with it.
 * This strip is NOT the position owner: a chip click is announced as a request
 * and the strip adopts the transport's echo, exactly as before.
 */
import { tetradPass } from "../../engine/tetrad-sequence.mjs";
import { patternOf } from "../../engine/transport.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, CLOCK_STATE, listen, announce } from "../bus.mjs";
import { mountMini } from "../mini.mjs";
import { renderChartLine, chartLineStyles } from "../../engine/chart-line.mjs";

export const chordTimeline = {
  id: "chord-timeline",
  layer: "surface",
  requires: { material: "tetrad" },
  mount_point: "strips",
  order: 14,
  controls: ["tlBars", "tlMini"],

  markup: `
  <h2>Timeline</h2>
  <div class="clpsum">The chords in order — click a bar to jump, or step with the transport.</div>
  <div class="tlrow">
    <div id="tlBars" data-control="tlBars"></div>
    <span id="tlMini" data-control="tlMini"></span>
  </div>`,

  /* the reference's timeline rules, verbatim values; the strip's own padding
   * replaces the card's so the row sits tight, as the study's `#timeline` does */
  /* the strip's rules are the family's, scoped under this strip (no sub-line rules:
   * no reference here); the row, the wrap and the mini are this module's own */
  styles: `
.tl-strip{padding:8px 12px}
.tlrow{display:flex;align-items:center;gap:12px}
` + chartLineStyles("#tlBars") + `
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
      const pat = patternOf(meter, splitIdx);
      const L = pat.length;
      const bars = [];
      for (let i0 = 0; i0 < pass.steps.length; i0 += L)
        bars.push(pass.steps.slice(i0, i0 + L).map((s, k) =>
          ({ symbol: s.symbol, degree: s.degree, roman: s.roman, beats: pat[k] })));
      renderChartLine(byId("tlBars"), { doc: d, bars, index: step,
        onPick: (i) => announce(d, STEP_CHANGED, { index: i, request: true }) });
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
