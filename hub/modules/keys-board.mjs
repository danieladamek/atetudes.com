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
import { oneOfEach, everyOccurrence, scaleTake, gripFit } from "../../engine/selection.mjs";
import { progressionOf, chordAt } from "../../engine/progression.mjs";
import { placeReference, centreDegreeOf, centreMaterialRef, reRead } from "../../engine/reference.mjs";
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
      source: "cycle", cycle: "fourths", form: "ii-V-I", custom: "", start: 0, centreSrc: "fixed" };
    let index = 0;
    let pulseTimers = [];       // the sounding-note pulse (260911, item 4 — field-board's idiom)
    /* livePulses EXTENDS the idiom under a measured defect of this board
     * (260911, the diagnostic is in the night's report): consecutive bars
     * SHARE pitches on the keys, so a ring born against the old bar's dot
     * died at the rebuild ~10ms later — the exact complement of the
     * pending case field-board solved. Every sounded note keeps { midi,
     * until }; render() re-rings every survivor for its REMAINING life, so
     * a rebuild can neither eat a young ring nor stretch one. A pulse with
     * no dot yet is just a survivor that finds its dot at the next render
     * — the pending case, subsumed. */
    let livePulses = [];        // { midi, until }

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

      /* the centre's SOURCE (260914): material on centreMaterialRef — the
       * window never jumps per bar; the reading shifts per bar */
      const fld = field({ key: cfg.key, scale: cfg.scale,
        ref: cfg.object === "scale" ? centreMaterialRef(cfg.centreSrc, cfg.ref) : cfg.ref });
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
      const kyRefDeg = cfg.object === "scale"
        ? centreDegreeOf(cfg.centreSrc, cfg.ref, cur.degree)
        : cur.degree;
      if (cfg.object === "scale") {
        sel = scaleTake(pool).notes;
        if (cfg.centreSrc === "follows" && kyRefDeg != null) sel = reRead(sel, kyRefDeg);
      }
      else {
        const r = cfg.take === "all"
          ? everyOccurrence(cur.tones, pool, { n: cfg.notesPer })
          : oneOfEach(gripFit(cur.tones, run.strings.length * cfg.notesPer).tones,
              pool, { n: cfg.notesPer, centre: pos.centre });
        sel = r.notes || [];
      }
      /* the reference mark, as v0.9's drawKeys carries it (the bass rides
       * the marks list) — hollow ring, the board's own idiom for "under" */
      /* 4a (260913b): the centre's reference rings here too */
      if (cfg.bass !== "none" && kyRefDeg != null
          && (cfg.object === "scale" || cur.degree >= 0)) {
        const rp = placeReference(cfg.bass, kyRefDeg, fld, cfg.strings, pos);
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
          "stroke-width": 1.6, "pointer-events": "none", "data-kysel": nt.midi }, svg);
        const t = el("text", { x: cx, y: cy + 3.4, "text-anchor": "middle", "font-size": "9",
          fill: FAM_TEXT[fam], class: "ky-lab" }, svg);
        t.textContent = nt.role || fam;
      }
      /* the pulse layer rides ABOVE the dots — field-board's own order */
      el("g", { class: "ky-pulselayer" }, svg);
      /* every living pulse re-rings on the fresh dots, for what is left of
       * its 320ms — survivors of the wipe and first-notes alike */
      const now = d.defaultView.performance.now();
      livePulses = livePulses.filter((p) => p.until > now);
      for (const p of livePulses) ringFor(p.midi, p.until - now);
    };

    /* what you see pulsing is what you hear (fretboard-stage's words;
     * field-board's idiom, copied — never a third invention): the ring drawn
     * AT THE DRAWN KEY DOT's own coordinates, never recomputed (260911,
     * item 4). sounded ⊆ drawn holds by derivation (the same selection
     * calls off the same merged config) plus the range gate — C2–C6 spans
     * every fretted note this door can sound — and the gate asserts it at
     * the artifact: every sounded note rings at its key. */
    const ringFor = (midi, ttl = 320) => {
      const svg = byId("kySvg");
      const layer = svg && svg.querySelector(".ky-pulselayer");
      if (!layer) return 0;
      const hits = [
        ...svg.querySelectorAll(`circle[data-kysel="${midi}"]`),
        ...svg.querySelectorAll(`circle[data-kyref="${midi}"]`),
      ];
      for (const c of hits) {
        const ring = el("circle", { class: "ky-pulse", cx: c.getAttribute("cx"),
          cy: c.getAttribute("cy"), r: 16, fill: "none", stroke: "#212126",
          "stroke-width": 2.4, opacity: 0.9, "pointer-events": "none" }, layer);
        pulseTimers.push(d.defaultView.setTimeout(() => ring.remove(), ttl));
      }
      return hits.length;
    };
    listen(d, NOTE, (m) => {
      if (!m || typeof m.midi !== "number") return;
      const now = d.defaultView.performance.now();
      livePulses = livePulses.filter((p) => p.until > now);
      livePulses.push({ midi: m.midi, until: now + 320 });
      ringFor(m.midi);
    });

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
