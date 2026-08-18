/* keyboard-strip.mjs — the reference's keyboard strip.
 *
 * `#kbd` in static/studies/triadetudes/study.html, ported: C2–C6 across a
 * 660-wide viewBox (drawn at the board's full width, as the study draws it),
 * whites then blacks, C labels, and the current chord's notes as coloured dots
 * on their keys — degree-coloured, labelled, the black-key dots outlined in
 * white. The study's KBD geometry constants are used verbatim.
 *
 * WHAT CHANGES AT FOUR VOICES: nothing — a dot per sounding note is the same
 * loop at four. The pedal is drawn too, as the reference draws its bass, when
 * the Harmony panel asks for one.
 */
import { tetradPass } from "../../engine/tetrad-sequence.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, listen } from "../bus.mjs";
import { mountMini } from "../mini.mjs";

const SVGNS = "http://www.w3.org/2000/svg";
const KBD = { LO: 36, HI: 84, WK: 22, WH: 92, BH: 56, BW: 13 };
const isWhite = (m) => [0, 2, 4, 5, 7, 9, 11].includes(m % 12);
const FAM_COLOR = { R: "#B82929", "2": "#3C8B2F", "3": "#2959A6", "4": "#A9ABB4",
  "5": "#212126", "6": "#1CB8D1", "7": "#D99A08" };
const FAM_TEXT = { R: "#fff", "2": "#fff", "3": "#fff", "4": "#212126",
  "5": "#fff", "6": "#212126", "7": "#212126" };
const famOf = (lab) => lab === "R" ? "R" : lab.replace(/[#b]/g, "")
  .replace("9", "2").replace("11", "4").replace("13", "6");

function geom(midi) {
  if (midi < KBD.LO || midi > KBD.HI) return null;
  let wi = 0; for (let m = KBD.LO; m < midi; m++) if (isWhite(m)) wi++;
  return isWhite(midi)
    ? { x: wi * KBD.WK + KBD.WK / 2, y: KBD.WH - 20, r: 7.5, black: false }
    : { x: wi * KBD.WK, y: KBD.BH - 12, r: 6, black: true };
}

export const keyboardStrip = {
  id: "keyboard-strip",
  layer: "surface",
  requires: { material: "tetrad" },
  mount_point: "boards",
  order: 24,
  controls: ["kbd", "kbMini"],

  markup: `
  <span id="kbMini" data-control="kbMini"></span>
  <div class="bh"><span>On the keys</span></div>
  <svg id="kbd" data-control="kbd" viewBox="0 0 660 96" aria-label="keyboard"></svg>`,
  styles: `#kbd rect{cursor:default}
#kbMini{position:absolute;top:7px;right:44px;display:flex;gap:4px;z-index:6}
#kbMini button{font:inherit;font-size:11px;padding:2px 8px;border:1px solid var(--line);
  border-radius:6px;background:#fff;cursor:pointer;color:var(--ink);line-height:1.5}
#kbMini button:hover{border-color:var(--ink)}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const lock = ctx.door.lock || {};
    const families = Array.isArray(lock.families) && lock.families.length ? lock.families : ["drop2"];
    let cfg = { key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0, bass: "root" };
    let step = 0, pass = null;
    const el = (t, a, p) => { const e = d.createElementNS(SVGNS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };

    const render = () => {
      const svg = byId("kbd"); svg.textContent = "";
      const { LO, HI, WK, WH, BH, BW } = KBD;
      const whites = []; for (let m = LO; m <= HI; m++) if (isWhite(m)) whites.push(m);
      const xOf = {}; whites.forEach((m, i) => xOf[m] = i * WK);
      const act = new Map();
      const s = pass && pass.steps[step];
      if (s) {
        s.voicing.notes.forEach((n, k) => act.set(n.midi, { fam: famOf(s.labels[k]), lab: s.labels[k] }));
        if (cfg.bass !== "none") {
          const low = Math.min(...s.voicing.notes.map((n) => n.midi));
          let bm = low - ((((low - s.chord.root.pc) % 12) + 12) % 12);
          if (bm >= low) bm -= 12; if (bm < 28) bm += 12;
          if (!act.has(bm)) act.set(bm, { fam: "R", lab: "R" });
        }
      }
      for (const m of whites) {
        el("rect", { x: xOf[m], y: 0, width: WK, height: WH, fill: "#fff", stroke: "#D8D8DC", "stroke-width": 0.8 }, svg);
        if (m % 12 === 0) {
          const t = el("text", { x: xOf[m] + WK / 2, y: WH - 4, "text-anchor": "middle", "font-size": "7.5", fill: "#B9B9BF" }, svg);
          t.textContent = "C" + (Math.floor(m / 12) - 1);
        }
        if (act.has(m)) {
          const a = act.get(m), g = geom(m);
          el("circle", { cx: g.x, cy: g.y, r: g.r, fill: FAM_COLOR[a.fam] }, svg);
          const t = el("text", { x: g.x, y: g.y + 3, "text-anchor": "middle", "font-size": "7", fill: FAM_TEXT[a.fam], class: "dot-label" }, svg);
          t.textContent = a.lab;
        }
      }
      for (const m of whites) {
        const nb = m + 1;
        if (nb <= HI && !isWhite(nb)) {
          el("rect", { x: xOf[m] + WK - BW / 2, y: 0, width: BW, height: BH, fill: "#212126" }, svg);
          if (act.has(nb)) {
            const a = act.get(nb), g = geom(nb);
            el("circle", { cx: g.x, cy: g.y, r: g.r, fill: FAM_COLOR[a.fam], stroke: "#fff", "stroke-width": 1.2 }, svg);
            const t = el("text", { x: g.x, y: g.y + 2.8, "text-anchor": "middle", "font-size": "6", fill: FAM_TEXT[a.fam], class: "dot-label" }, svg);
            t.textContent = a.lab;
          }
        }
      }
    };

    listen(d, CONFIG_CHANGED, (m) => { cfg = { ...cfg, ...m }; step = 0; pass = tetradPass({ families, ...cfg }); render(); });
    listen(d, STEP_CHANGED, (m) => { if (m && m.request !== true && typeof m.index === "number") { step = m.index; render(); } });
    mountMini(ctx, byId("kbMini"));   // ⏮ ▶ ⏹ ⏭ over the keyboard, driving the one clock
    pass = tetradPass({ families, ...cfg }); render();
  },
};
