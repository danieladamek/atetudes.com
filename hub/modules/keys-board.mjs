/* keys-board.mjs — v0.9's ON THE KEYS for Multetudes (surface, 2026-08-29).
 *
 * C2–C6, whites then blacks, C labels, and the current SELECTION as coloured
 * dots on their keys — every dot derived from the same bus configuration the
 * neck rendered, never read from another module. Clicking a key sounds it
 * (floor F3 — the family's every-key-sounds idiom, through NOTE; the audio
 * card realises it).
 *
 * A REGISTER ENTRY, like the staff: the family's On the Keys
 * (keyboard-strip.mjs) derives its dots from the tetrad pass and cannot show
 * the field's selection without modification, which the rules forbid — so
 * Multetudes carries its own keys board until the progression lands and the
 * reconciliation is decided. The geometry is v0.9's (C2–C6 across the
 * board's width).
 */
import { field } from "../../engine/field.mjs";
import { positionOf, materialIn } from "../../engine/position.mjs";
import { makeRun } from "../../engine/string-run.mjs";
import { oneOfEach, everyOccurrence, scaleTake } from "../../engine/selection.mjs";
import { progressionOf, chordAt } from "../../engine/progression.mjs";
import { placeReference } from "../../engine/reference.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, NOTE, listen, announce } from "../bus.mjs";
import { mountMini } from "../mini.mjs";

const SVGNS = "http://www.w3.org/2000/svg";
const FAM = ["R", "2", "3", "4", "5", "6", "7"];
const FAM_COLOR = { R: "#B82929", "2": "#3C8B2F", "3": "#2959A6", "4": "#A9ABB4",
  "5": "#212126", "6": "#1CB8D1", "7": "#D99A08" };
const FAM_TEXT = { R: "#fff", "2": "#fff", "3": "#fff", "4": "#212126",
  "5": "#fff", "6": "#212126", "7": "#212126" };
const mod = (n, m) => ((n % m) + m) % m;
const BLACK = [1, 3, 6, 8, 10];

export const keysBoard = {
  id: "keys-board",
  layer: "surface",
  requires: { surface: "multetudes" },
  mount_point: "boards",
  order: 22,
  controls: ["kySvg", "kyMini"],

  markup: `
  <span class="mini" id="kyMini" data-control="kyMini"></span>
  <div class="bh"><span>On the keys</span></div>
  <svg id="kySvg" data-control="kySvg" viewBox="0 0 1290 150" aria-label="keyboard"></svg>`,

  styles: `
#kySvg{width:100%;height:auto;display:block}
#kySvg rect{cursor:pointer}
#kyMini{position:absolute;top:8px;right:44px;display:flex;gap:4px;z-index:6}
#kyMini button{font:inherit;font-size:11px;padding:2px 8px;border:1px solid var(--line);
  border-radius:6px;background:#fff;cursor:pointer;color:var(--ink);line-height:1.5}
#kyMini button:hover{border-color:var(--ink)}
.ky-lab{font-weight:bold;pointer-events:none;user-select:none}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    let cfg = { key: "Bb", scale: "major", ref: 0, strings: [4, 3, 2, 1],
      startDeg: 4, nearFret: 3, object: "tetrad", take: "one", notesPer: 1, dyad: [3, 7] , bass: "none",
      source: "cycle", cycle: "fourths", form: "ii-V-I", custom: "", start: 0 };
    let index = 0;

    const el = (t, a, p) => {
      const e = d.createElementNS(SVGNS, t);
      for (const k in a) e.setAttribute(k, a[k]);
      if (p) p.appendChild(e);
      return e;
    };

    const render = () => {
      const svg = byId("kySvg");
      svg.textContent = "";
      const LO = 36, HI = 84, W = 1290 - 40, X0 = 20, H = 112;
      const whites = [];
      for (let m = LO; m <= HI; m++) if (!BLACK.includes(mod(m, 12))) whites.push(m);
      const ww = W / whites.length;
      const xOf = (m) => {
        const i = whites.indexOf(m);
        if (i >= 0) return X0 + i * ww;
        return X0 + whites.filter((w) => w < m).length * ww - ww * 0.3;
      };
      for (const m of whites) {
        el("rect", { x: xOf(m), y: 14, width: ww - 1.5, height: H, fill: "#fff",
          stroke: "#B9B9BF", "stroke-width": 1, rx: 2, "data-kymidi": m }, svg);
        if (mod(m, 12) === 0) {
          const t = el("text", { x: xOf(m) + ww / 2, y: 14 + H - 6, "text-anchor": "middle",
            "font-size": "9", fill: "#B9B9BF" }, svg);
          t.textContent = "C" + (Math.floor(m / 12) - 1);
        }
      }
      for (let m = LO; m <= HI; m++)
        if (BLACK.includes(mod(m, 12)))
          el("rect", { x: xOf(m), y: 14, width: ww * 0.6, height: H * 0.62, fill: "#212126",
            rx: 2, "data-kymidi": m }, svg);

      const fld = field({ key: cfg.key, scale: cfg.scale, ref: cfg.ref });
      const run = makeRun(cfg.strings);
      const anchor = Math.max(...run.strings);
      const pos = positionOf({ field: fld, anchorString: anchor,
        startDegree: cfg.startDeg, nearFret: cfg.nearFret, strings: run.strings });
      const pool = materialIn(pos, run.strings, fld);
      /* THE CURRENT BAR'S CHORD through the one derivation (child 7): the
       * progression owns which chord; chordAt owns what its tones are */
      const prog = progressionOf(cfg, cfg.key, cfg.scale);
      if (index >= prog.chords.length) index = 0;
      const cur = chordAt(prog, index, fld, cfg.object, cfg.dyad);
      let sel = [];
      if (cfg.object === "scale") sel = scaleTake(pool).notes;
      else {
        const r = cfg.take === "all"
          ? everyOccurrence(cur.tones, pool, { n: cfg.notesPer })
          : oneOfEach(cur.tones, pool, { n: cfg.notesPer, centre: pos.centre });
        sel = r.notes || [];
      }
      /* the reference mark, as v0.9's drawKeys carries it (the bass rides
       * the marks list) — hollow ring, the board's own idiom for "under" */
      if (cfg.object !== "scale" && cfg.bass !== "none" && cur.degree >= 0) {
        const rp = placeReference(cfg.bass, cur.degree, fld, cfg.strings, pos);
        if (rp.note && rp.note.midi >= LO && rp.note.midi <= HI) {
          const black = BLACK.includes(mod(rp.note.midi, 12));
          const cx = xOf(rp.note.midi) + (black ? ww * 0.3 : ww / 2);
          const cy = black ? 14 + H * 0.48 : 14 + H - 24;
          el("circle", { cx, cy, r: 9, fill: "none", stroke: FAM_COLOR[FAM[rp.note.deg]],
            "stroke-width": 2, "stroke-dasharray": "3 2.5", "pointer-events": "none",
            "data-kyref": rp.note.midi }, svg);
        }
      }
      for (const nt of sel) {
        if (nt.midi < LO || nt.midi > HI) continue;
        const black = BLACK.includes(mod(nt.midi, 12));
        const cx = xOf(nt.midi) + (black ? ww * 0.3 : ww / 2);
        const cy = black ? 14 + H * 0.48 : 14 + H - 24;
        const fam = FAM[nt.deg];
        el("circle", { cx, cy, r: 10, fill: FAM_COLOR[fam], stroke: "#fff",
          "stroke-width": 1.6, "pointer-events": "none" }, svg);
        const t = el("text", { x: cx, y: cy + 3.4, "text-anchor": "middle", "font-size": "9",
          fill: FAM_TEXT[fam], class: "ky-lab" }, svg);
        t.textContent = nt.role || fam;
      }
    };

    byId("kySvg").addEventListener("click", (e) => {
      const hit = e.target.closest("[data-kymidi]");
      if (hit) announce(d, NOTE, { midi: +hit.dataset.kymidi });
    });

    listen(d, CONFIG_CHANGED, (m) => {
      if (!m || typeof m !== "object") return;
      for (const k of Object.keys(cfg))
        if (k in m) cfg = { ...cfg, [k]: Array.isArray(m[k]) ? [...m[k]] : m[k] };
      render();
    });
    listen(d, STEP_CHANGED, (m) => {
      if (!m || m.request === true || typeof m.index !== "number") return;
      if (m.index !== index) { index = m.index; render(); }
    });
    mountMini(ctx, byId("kyMini"));
    render();
  },
};
