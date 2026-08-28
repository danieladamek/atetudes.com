/* staff-board.mjs — v0.9's ÉTUDE STAFF for Multetudes (surface, 2026-08-29).
 *
 * "The étude — end to end": the grand staff, treble carrying the material
 * WRITTEN AN OCTAVE ABOVE WHERE IT SOUNDS with the 8 under the clef, the bass
 * clef reserved for the reference tone (CHILD 5 — empty until then, and the
 * face says so), the drawing FITTED TO ITS CONTENT because written guitar
 * reaches G6 five ledger lines up and a fixed area clips it. A CHORD STACKS;
 * A RUN DOES NOT — v0.9's own rule, kept.
 *
 * ONE BAR TONIGHT: the progression is child 7, so the étude holds the current
 * selection as its single bar, visibly labelled as such. This board is a
 * REGISTER ENTRY: the family's Étude Staff (score-board.mjs) derives from the
 * tetrad pass and cannot draw the field's selection without modification —
 * which the rules forbid — so Multetudes carries its own staff until the
 * progression lands and the reconciliation is decided.
 *
 * Every notehead is DERIVED: midi → written step through the field's own
 * spelling (the letter index arithmetic v0.9 uses), asserted before drawing —
 * never copied from the prototype's stored markup.
 */
import { field } from "../../engine/field.mjs";
import { positionOf, materialIn } from "../../engine/position.mjs";
import { makeRun } from "../../engine/string-run.mjs";
import { diatonicTones, oneOfEach, everyOccurrence, scaleTake } from "../../engine/selection.mjs";
import { CONFIG_CHANGED, CLOCK_STATE, NOTE, listen, announce } from "../bus.mjs";
import { mountMini } from "../mini.mjs";

const SVGNS = "http://www.w3.org/2000/svg";
const FAM = ["R", "2", "3", "4", "5", "6", "7"];
const FAM_COLOR = { R: "#B82929", "2": "#3C8B2F", "3": "#2959A6", "4": "#A9ABB4",
  "5": "#212126", "6": "#1CB8D1", "7": "#D99A08" };
const FAM_TEXT = { R: "#fff", "2": "#fff", "3": "#fff", "4": "#212126",
  "5": "#fff", "6": "#212126", "7": "#212126" };
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const mod = (n, m) => ((n % m) + m) % m;

export const staffBoard = {
  id: "staff-board",
  layer: "surface",
  requires: { surface: "multetudes" },
  mount_point: "boards",
  order: 20,
  controls: ["stSvg", "stMini"],

  markup: `
  <span class="mini" id="stMini" data-control="stMini"></span>
  <div class="bh"><span>The étude — end to end</span></div>
  <div class="hint info">Treble carries the material, written an octave above where it sounds —
  the 8 under the clef. The bass clef carries the reference tone once child 5 frets it; the full
  progression of bars arrives with child 7. Until then the étude holds one bar: the selection on
  the window's start degree.</div>
  <svg id="stSvg" data-control="stSvg" viewBox="0 0 1290 240" aria-label="the étude"></svg>`,

  styles: `
#stSvg{width:100%;height:auto;display:block}
#stMini{position:absolute;top:8px;right:44px;display:flex;gap:4px;z-index:6}
#stMini button{font:inherit;font-size:11px;padding:2px 8px;border:1px solid var(--line);
  border-radius:6px;background:#fff;cursor:pointer;color:var(--ink);line-height:1.5}
#stMini button:hover{border-color:var(--ink)}
.st-lab{font-weight:bold;pointer-events:none;user-select:none}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    let cfg = { key: "C", scale: "major", ref: 0, strings: [6, 5, 4, 3, 2, 1],
      startDeg: 0, nearFret: 5, object: "scale", take: "one", notesPer: 1 };
    let meter = 4;

    const el = (t, a, p) => {
      const e = d.createElementNS(SVGNS, t);
      for (const k in a) e.setAttribute(k, a[k]);
      if (p) p.appendChild(e);
      return e;
    };

    const render = () => {
      const svgRoot = byId("stSvg");
      svgRoot.textContent = "";
      const svg = el("g", {}, svgRoot);

      const fld = field({ key: cfg.key, scale: cfg.scale, ref: cfg.ref });
      const run = makeRun(cfg.strings);
      const anchor = Math.max(...run.strings);
      const pos = positionOf({ field: fld, anchorString: anchor,
        startDegree: cfg.startDeg, nearFret: cfg.nearFret });
      const pool = materialIn(pos, run.strings, fld);
      let sel = [];
      if (cfg.object === "scale") sel = scaleTake(pool).notes;
      else {
        const tones = diatonicTones(fld, (pos.startDeg + fld.ref) % 7,
          cfg.object === "triad" ? [0, 2, 4] : [0, 2, 4, 6]);
        const r = cfg.take === "all"
          ? everyOccurrence(tones, pool, { n: cfg.notesPer })
          : oneOfEach(tones, pool, { n: cfg.notesPer, centre: pos.centre });
        sel = r.notes || [];
      }

      /* the staves — v0.9's geometry: five lines each, the 8 under the treble */
      const X0 = 58, W = 1290 - X0 - 14, BW = W;
      const TY = 58, BY = 168, GAP = 8;
      const line = (y, x1, x2, w) =>
        el("line", { x1, y1: y, x2, y2: y, stroke: "#B9B9BF", "stroke-width": w || 1 }, svg);
      for (let k = 0; k < 5; k++) { line(TY + k * GAP * 2, X0, X0 + W); line(BY + k * GAP * 2, X0, X0 + W); }
      const tc = el("text", { x: X0 - 42, y: TY + GAP * 6.4, "font-size": "42", fill: "#212126" }, svg);
      tc.textContent = "\u{1D11E}";
      const t8 = el("text", { x: X0 - 31, y: TY + GAP * 10.4, "text-anchor": "middle", "font-size": "11", fill: "#73737A" }, svg);
      t8.textContent = "8";
      const bc = el("text", { x: X0 - 40, y: BY + GAP * 4.4, "font-size": "32", fill: "#212126" }, svg);
      bc.textContent = "\u{1D122}";
      const ts = (y, t) => {
        const a = el("text", { x: X0 - 14, y: y + GAP * 2 + 2, "text-anchor": "middle",
          "font-size": "15", "font-weight": "bold", fill: "#212126" }, svg);
        a.textContent = t;
      };
      ts(TY, String(meter)); ts(TY + GAP * 4, "4"); ts(BY, String(meter)); ts(BY + GAP * 4, "4");

      /* WRITTEN AN OCTAVE ABOVE (v0.9's rule): everything below reads the
       * written pitch. The step comes from the FIELD'S OWN SPELLING — the
       * letter climbs one per degree — and is asserted a real spelled note
       * before it draws (golden rule 1: derived, never copied). */
      const WRITTEN = 12;
      const stepOf = (m0) => {
        const m2 = m0 + WRITTEN, pc = mod(m2, 12), oct = Math.floor(m2 / 12) - 1;
        const sp = fld.notes.find((n) => n.pc === pc);
        if (!sp) throw new Error("staff-board: a selected note is off the field — nothing off the field is drawable");
        return oct * 7 + LETTERS.indexOf(sp.name[0]);
      };
      const yTreble = (s) => TY + GAP * 8 - (s - (4 * 7 + 2)) * GAP;

      const stacked = cfg.object !== "scale" && cfg.take !== "all";
      const seq = sel;
      const allSteps = seq.map((n) => stepOf(n.midi));
      for (const s of allSteps)
        if (!Number.isInteger(s)) throw new Error("staff-board: a written step failed to derive");
      const topStep = allSteps.length ? Math.max(...allSteps) : (4 * 7 + 2) + 8;
      const labY = Math.min(TY - 30, yTreble(topStep) - 20);

      const lab = el("text", { x: X0 + 7, y: labY, "font-size": "12.5", "font-weight": "bold", fill: "#212126" }, svg);
      lab.textContent = cfg.object === "scale"
        ? (cfg.ref ? `${fld.refNote.name} ${fld.modeName}` : `${cfg.key} — the scale in the box`)
        : `the ${cfg.object} on the ${["root", "2nd", "3rd", "4th", "5th", "6th", "7th"][pos.startDeg]}`;
      const rl = el("text", { x: X0 + 7, y: labY + 11, "font-size": "9.5", fill: "#B9B9BF" }, svg);
      rl.textContent = "bar 1 of 1 — the progression arrives with child 7; chord names with child 4";

      seq.forEach((nt, k) => {
        const s = stepOf(nt.midi), y = yTreble(s);
        const x = stacked ? X0 + BW * 0.34
          : X0 + BW * 0.2 + (BW * 0.62) * (k / Math.max(1, seq.length - 1));
        for (let q = (4 * 7 + 2) - 2; s <= q; q -= 2)
          el("line", { x1: x - 9, y1: yTreble(q), x2: x + 9, y2: yTreble(q), stroke: "#B9B9BF", "stroke-width": 1 }, svg);
        for (let q = (4 * 7 + 2) + 10; s >= q; q += 2)
          el("line", { x1: x - 9, y1: yTreble(q), x2: x + 9, y2: yTreble(q), stroke: "#B9B9BF", "stroke-width": 1 }, svg);
        const fam = FAM[nt.deg];
        el("ellipse", { cx: x, cy: y, rx: 6.4, ry: 5, fill: FAM_COLOR[fam],
          transform: `rotate(-18 ${x} ${y})`, "data-stmidi": nt.midi }, svg);
        const t = el("text", { x, y: y + 3, "text-anchor": "middle", "font-size": "7.5",
          fill: FAM_TEXT[fam], "font-weight": "bold", class: "st-lab" }, svg);
        t.textContent = nt.role || fam;
      });

      el("line", { x1: X0 + W, y1: TY, x2: X0 + W, y2: TY + GAP * 8, stroke: "#212126", "stroke-width": 2.6 }, svg);
      el("line", { x1: X0 + W, y1: BY, x2: X0 + W, y2: BY + GAP * 8, stroke: "#212126", "stroke-width": 2.6 }, svg);

      /* fit to content — v0.9's own fix: nothing may leave the frame */
      try {
        const bb = svg.getBBox();
        if (bb.width > 0 && bb.height > 0)
          svgRoot.setAttribute("viewBox",
            `${bb.x - 10} ${bb.y - 10} ${bb.width + 20} ${bb.height + 20}`);
      } catch { /* an unrendered board has no box; the default stands */ }
    };

    byId("stSvg").addEventListener("click", (e) => {
      const hit = e.target.closest("[data-stmidi]");
      if (hit) announce(d, NOTE, { midi: +hit.dataset.stmidi });
    });

    listen(d, CONFIG_CHANGED, (m) => {
      if (!m || typeof m !== "object") return;
      for (const k of Object.keys(cfg))
        if (k in m) cfg = { ...cfg, [k]: Array.isArray(m[k]) ? [...m[k]] : m[k] };
      render();
    });
    listen(d, CLOCK_STATE, (m) => {
      if (m && typeof m.meter === "number" && m.meter !== meter) { meter = m.meter; render(); }
    });
    mountMini(ctx, byId("stMini"));
    render();
  },
};
