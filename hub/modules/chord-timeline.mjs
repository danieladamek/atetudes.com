/* chord-timeline.mjs — the roman-numeral timeline, sequence-as-navigation.
 *
 * The frozen study's timeline is not a progress bar: every chord in the pass is
 * a button, so the sequence IS the navigation. That is the behaviour preserved
 * here — click any chord to jump there.
 *
 * It derives the pass itself from the configuration rather than being handed
 * one, so pruning the stage leaves a timeline that still renders the music
 * (§4.2.3: a door that prunes a module builds a smaller file, not a broken
 * one). The derivation lives once, in engine/tetrad-sequence.mjs; this module
 * restates none of it.
 *
 * It asks the stage to move by ANNOUNCING a request. It does not reach for the
 * stage, and if there is no stage the click simply moves the highlight.
 */
import { tetradPass } from "../../engine/tetrad-sequence.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, listen, announce } from "../bus.mjs";

export const chordTimeline = {
  id: "chord-timeline",
  layer: "surface",
  requires: { material: "tetrad" },
  mount_point: "boards",
  order: 30,
  controls: ["tlList"],

  markup: `
  <div class="tl-board">
    <h2 class="tlHead">The pass</h2>
    <div class="tlList" id="tlList" data-control="tlList"></div>
  </div>`,

  styles: `
.tl-board{text-align:center}
.tlHead{font-size:12px;letter-spacing:.06em;text-transform:uppercase;
  color:var(--gray);margin:0 0 10px;font-weight:bold}
.tlList{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
.tlList button{border:1px solid var(--line);border-radius:7px;background:#fff;cursor:pointer;
  font:600 11px inherit;font-family:inherit;color:var(--ink);padding:5px 9px;text-align:center}
.tlRn{display:block;font-style:italic;font-size:9px;font-weight:normal;color:var(--gray)}
.tlList button.tlCur{background:var(--ink);color:#fff}
.tlList button.tlCur .tlRn{color:#CCCCCE}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const lock = ctx.door.lock || {};
    const families = Array.isArray(lock.families) && lock.families.length ? lock.families : ["drop2"];

    let cfg = { key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0 };
    let step = 0;

    const render = () => {
      const pass = tetradPass({ ...cfg, families });
      const host = byId("tlList");
      host.textContent = "";
      pass.steps.forEach((s, i) => {
        const b = d.createElement("button");
        b.textContent = s.symbol;
        const rn = d.createElement("span");
        rn.className = "tlRn";
        rn.textContent = s.roman;
        b.appendChild(rn);
        if (i === step) b.className = "tlCur";
        // ask, do not reach: the stage owns the position
        b.addEventListener("click", () => {
          step = i;
          mark();
          announce(d, STEP_CHANGED, { index: i, request: true });
        });
        host.appendChild(b);
      });
    };

    const mark = () => {
      const kids = byId("tlList").children;
      for (let i = 0; i < kids.length; i++) kids[i].className = i === step ? "tlCur" : "";
    };

    listen(d, CONFIG_CHANGED, (next) => { cfg = { ...cfg, ...next }; step = 0; render(); });
    listen(d, STEP_CHANGED, (m) => {
      if (m && m.request !== true && typeof m.index === "number") { step = m.index; mark(); }
    });

    render();
  },
};
