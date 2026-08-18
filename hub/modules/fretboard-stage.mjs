/* fretboard-stage.mjs — the neck, the dots, the armed rings, the transitions.
 *
 * The stage the frozen study calls its crown jewel, rebuilt as a door
 * contribution. It owns its markup and its styles; the music comes from
 * engine/tetrad-sequence.mjs and the gliding comes from engine/voice-identity.mjs.
 * Neither is restated here (§4.2.2).
 *
 * THE ANIMATION IS THREE CSS RULES, measured on the frozen study and quoted in
 * the item — `transform` on the group, `fill` on the mark, `opacity` on the
 * ring. There is no `requestAnimationFrame` and there is none here either.
 *
 * WHY IT GLIDES AT ALL: **a dot glides only if its DOM node survives the chord
 * change.** So the four groups are built ONCE per pass and are then only moved;
 * they are keyed by `engine/voice-identity.mjs`'s stable voice key, which is
 * what guarantees the node a voice gets is the node that voice had. Rebuilding
 * the dots per step would produce a correct-looking still frame that never
 * animates — which is precisely the failure child 2 exists to prevent, so the
 * key is used rather than re-derived here.
 *
 * The window AUTO-CROPS to the frets the pass actually uses, exactly as the
 * frozen study does: the neck is drawn to the music, not the music to the neck.
 */
import { tetradPass } from "../../engine/tetrad-sequence.mjs";
import { keysOf } from "../../engine/voice-identity.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, listen, announce } from "../bus.mjs";

const SVGNS = "http://www.w3.org/2000/svg";
const FW = 46, SS = 26, PADT = 8, PADB = 20;

/** the degree palette — musical function only, per the Spec and CLAUDE.md.
 * These are the same seven families the charts use; nothing here is chrome. */
const DEGREE_COLOR = {
  R: "#B82929", "9": "#3C8B2F", b9: "#3C8B2F", "3": "#2959A6", b3: "#2959A6",
  "11": "#A9ABB4", "5": "#212126", b5: "#A9ABB4", "#5": "#212126",
  "6": "#1CB8D1", "7": "#D99A08", b7: "#D99A08",
};
/** the light marks need dark text on them (Spec §7.2) */
const DARK_TEXT = new Set(["11", "b5", "6"]);

export const fretboardStage = {
  id: "fretboard-stage",
  layer: "surface",
  requires: { material: "tetrad" },
  mount_point: "boards",
  order: 20,
  controls: ["fsBack", "fsFwd", "fsNeck"],

  markup: `
  <div class="fs-board">
  <div class="fsStage">
    <svg id="fsNeck" data-control="fsNeck" class="fsNeck" aria-label="fretboard"></svg>
    <div class="fsHint" id="fsHint"></div>
  </div>
  <div class="fsTransport">
    <button id="fsBack" data-control="fsBack" class="fsBtn">&#8592; step</button>
    <button id="fsFwd" data-control="fsFwd" class="fsBtn">step &#8594;</button>
  </div>
  </div>`,

  /* Every rule names an `fs` token. The three transitions below are the whole
   * animation; they travel with the stage and cannot outlive it. */
  styles: `
.fs-board{text-align:center}
.fsStage{display:flex;flex-direction:column;align-items:center}
.fsNeck{max-width:100%;height:auto}
.fsHint{font-size:10.5px;color:var(--gray);padding:4px 0 2px}
.fsTransport{display:flex;gap:8px;justify-content:center;padding:10px 0 2px;flex-wrap:wrap}
.fsBtn{font:600 12.5px inherit;font-family:inherit;padding:8px 15px;border:1px solid var(--line);
  border-radius:8px;background:#fff;cursor:pointer;color:var(--ink)}
.fs-dot{transition:transform .55s cubic-bezier(.4,0,.2,1);cursor:pointer}
.fs-dot .fs-mk{transition:fill .55s}
.fs-dot .fs-ring{fill:none;stroke:#212126;stroke-width:2;opacity:0;transition:opacity .2s}
.fs-dot.fs-armed .fs-ring{opacity:1}
.fs-lab{font-family:inherit;font-weight:bold}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const lock = ctx.door.lock || {};
    const families = Array.isArray(lock.families) && lock.families.length ? lock.families : ["drop2"];

    /* PRIVATE state. Nothing else reads it; the step is announced, not shared. */
    let cfg = { key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0 };
    let pass = null, dots = [], geom = null, step = 0;

    const el = (t, a, p) => {
      const e = d.createElementNS(SVGNS, t);
      for (const k in a) e.setAttribute(k, a[k]);
      if (p) p.appendChild(e);
      return e;
    };

    const build = () => {
      pass = tetradPass({ ...cfg, families });
      const frets = pass.steps.flatMap((s) => s.voicing.notes.map((n) => n.fret));
      const fmin = Math.max(0, Math.min(...frets) - 1);          // AUTO-CROP
      const fmax = Math.max(...frets) + 1;
      const cols = fmax - fmin + 1, W = cols * FW, H = PADT + 5 * SS + PADB + 14;
      geom = { fmin, X: (f) => (f - fmin) * FW + FW / 2, Y: (i) => PADT + 7 + i * SS };

      const neck = byId("fsNeck");
      neck.textContent = "";
      neck.setAttribute("width", W + 40);
      neck.setAttribute("height", H);
      neck.setAttribute("viewBox", "-36 0 " + (W + 40) + " " + H);

      const strings = pass.set.strings;                          // low → high
      /* row 0 is the TOP line and carries the HIGHEST string, so row i is
       * string i+1. Getting this backwards puts the low-E voice at row -1,
       * off the top of the SVG — a dot that is simply not there, which no
       * assertion in the suite can see and a screenshot shows instantly. */
      for (let i = 0; i < 6; i++) {
        const num = i + 1;
        const active = strings.includes(num);
        el("line", { x1: 0, y1: geom.Y(i), x2: W, y2: geom.Y(i),
          stroke: active ? "#CCCCCE" : "#EBEBED", "stroke-width": active ? 1.4 : 1.1 }, neck);
        el("circle", { cx: -19, cy: geom.Y(i), r: 9.6,
          fill: active ? "#212126" : "#fff",
          stroke: active ? "#212126" : "#CCCCCE", "stroke-width": 1.4 }, neck);
        const t = el("text", { x: -19, y: geom.Y(i) + 3.4, "text-anchor": "middle",
          fill: active ? "#fff" : "#73737A", "font-size": 10, "font-weight": "bold",
          "font-family": "inherit" }, neck);
        t.textContent = ["e", "B", "G", "D", "A", "E"][i];
      }
      for (let i = 0; i <= cols; i++) {
        el("line", { x1: i * FW, y1: geom.Y(0), x2: i * FW, y2: geom.Y(5),
          stroke: "#CCCCCE", "stroke-width": 1.8 }, neck);
        if (i < cols) {
          const t = el("text", { x: i * FW + FW / 2, y: H - 4, "text-anchor": "middle",
            fill: "#73737A", "font-size": 9, "font-family": "inherit" }, neck);
          t.textContent = fmin + i;
        }
      }
      for (let i = 0; i < cols; i++) {                            // inlays track the window
        const f = fmin + i, cx = i * FW + FW / 2;
        if ([3, 5, 7, 9, 15, 17, 19, 21].includes(f))
          el("circle", { cx, cy: geom.Y(0) + 2.5 * SS, r: 4.6, fill: "#DDDDE1" }, neck);
        if (f === 12 || f === 24) {
          el("circle", { cx, cy: geom.Y(0) + 1.5 * SS, r: 4.6, fill: "#DDDDE1" }, neck);
          el("circle", { cx, cy: geom.Y(0) + 3.5 * SS, r: 4.6, fill: "#DDDDE1" }, neck);
        }
      }

      /* THE NODES THAT MUST SURVIVE. One group per VOICE KEY, built once for the
       * whole pass — never per step, or nothing would ever glide. */
      dots = keysOf(pass.steps[0].voicing).map((key) => {
        const g = el("g", { class: "fs-dot", "data-voice": key }, neck);
        el("circle", { class: "fs-mk", cx: 0, cy: 0, r: 10.5, fill: "#212126" }, g);
        el("circle", { class: "fs-ring", cx: 0, cy: 0, r: 13.6 }, g);
        el("text", { class: "fs-lab", x: 0, y: 3.6, "text-anchor": "middle" }, g);
        return { key, g };
      });

      byId("fsHint").textContent =
        pass.set.label + " · " + pass.steps.length + " chords · window " + fmin + "–" + fmax;
      show(0, true);
    };

    const show = (i, instant) => {
      const n = pass.steps.length;
      step = ((i % n) + n) % n;
      const cur = pass.steps[step], next = pass.steps[step + 1] || null;
      const strings = pass.set.strings;

      dots.forEach(({ key, g }, k) => {
        const note = cur.voicing.notes[k];
        const lab = cur.labels[k];
        const row = strings[k] - 1;                       // string 1 is the top line
        if (instant) g.style.transition = "none";
        g.style.transform = "translate(" + geom.X(note.fret) + "px," + geom.Y(row) + "px)";
        g.querySelector(".fs-mk").setAttribute("fill", DEGREE_COLOR[lab] || "#212126");
        const t = g.querySelector(".fs-lab");
        const swap = () => {
          t.textContent = lab;
          t.setAttribute("fill", DARK_TEXT.has(lab) ? "#212126" : "#fff");
          t.setAttribute("font-size", lab.length > 1 ? 8.2 : 9.4);
        };
        instant ? swap() : setTimeout(swap, 260);
        if (instant) { void g.getBoundingClientRect(); g.style.transition = ""; }
        // ARMED = this voice is about to move
        g.classList.toggle("fs-armed", !!next && next.voicing.notes[k].fret !== note.fret);
      });

      announce(d, STEP_CHANGED, { index: step, total: n, symbol: cur.symbol });
    };

    /* PLAYING BELONGS TO THE TRANSPORT, NOT THE STAGE.
     *
     * This card used to run `setInterval(…, 1700)` — the fixed interval the
     * roadmap names: *"fine for a demonstration; it isn't practice."* A chord
     * that changes on a wall-clock timer cannot be played along with, and a
     * second timer beside the metronome's grid would drift against the click.
     *
     * So the stage no longer keeps time. It still steps on request, and the
     * transport card walks the beat grid and asks. The stage remains the
     * authority on WHERE the pass is — it answers every move with the
     * step it actually rendered — it simply no longer decides WHEN.
     *
     * A door with no transport keeps the step buttons and loses only autoplay,
     * which is smaller rather than broken. */

    byId("fsFwd").addEventListener("click", () => show(step + 1, false));
    byId("fsBack").addEventListener("click", () => show(step - 1, false));

    /* derived from the message, never from the sender (§4.2.3) */
    listen(d, CONFIG_CHANGED, (next) => { cfg = { ...cfg, ...next }; build(); });
    /* another module asking to move — the stage owns the position */
    listen(d, STEP_CHANGED, (m) => {
      if (m && m.request === true && pass && m.index !== step) show(m.index, false);
    });

    build();
  },
};
