/* staff-board.mjs — v0.9's ÉTUDE STAFF for Multetudes (surface, 2026-08-29).
 *
 * "The étude — end to end": the grand staff, treble carrying the material
 * WRITTEN AN OCTAVE ABOVE WHERE IT SOUNDS with the 8 under the clef, the bass
 * clef reserved for the reference tone (CHILD 5 — empty until then, and the
 * face says so), the drawing FITTED TO ITS CONTENT because written guitar
 * reaches G6 five ledger lines up and a fixed area clips it. A CHORD STACKS;
 * A RUN DOES NOT — v0.9's own rule, kept.
 *
 * END TO END AT LAST (child 7): every bar of the derived progression, each
 * chord a column (v0.9's own geometry: BW = W / N), the current bar shaded,
 * click a bar to jump (a STEP_CHANGED request — the chart line owns the
 * position and echoes). The figure and the fret labels ride only the
 * current bar, exactly as v0.9 draws them. This board remains a REGISTER
 * ENTRY (the family's score-board derives from the tetrad pass); with the
 * progression landed the reconciliation is Daniel's release-work call.
 *
 * Every notehead is DERIVED: midi → written step through the field's own
 * spelling (the letter index arithmetic v0.9 uses), asserted before drawing —
 * never copied from the prototype's stored markup.
 */
import { field } from "../../engine/field.mjs";
import { positionOf, materialIn } from "../../engine/position.mjs";
import { makeRun } from "../../engine/string-run.mjs";
import { diatonicTones, objectOffsets, oneOfEach, everyOccurrence, scaleTake, orderBy } from "../../engine/selection.mjs";
import { placeReference } from "../../engine/reference.mjs";
import { progressionOf, chordAt, beatsOf, walkSchedule } from "../../engine/progression.mjs";
import { writtenValue } from "../../engine/drill.mjs";
import { CONFIG_CHANGED, CLOCK_STATE, STEP_CHANGED, NOTE, listen, announce } from "../bus.mjs";
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
  the 8 under the clef. The bass clef carries the reference tone, at sounding pitch, when one is
  chosen; the full progression of bars arrives with child 7. Until then the étude holds one bar.</div>
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
    let cfg = { key: "Bb", scale: "major", ref: 0, strings: [4, 3, 2, 1],
      startDeg: 4, nearFret: 3, object: "tetrad", take: "one", notesPer: 1, dyad: [3, 7], bass: "none",
      movement: "block",
      address: "pattern", figure: "",
      source: "cycle", cycle: "fourths", form: "ii-V-I", custom: "", start: 0, split: null };
    let meter = 4;
    let index = 0;
    let barsX = [];                 // per-chord x ranges, for click-to-jump

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
        startDegree: cfg.startDeg, nearFret: cfg.nearFret, strings: run.strings });
      const pool = materialIn(pos, run.strings, fld);

      /* THE PROGRESSION (child 7): every bar derived through the ONE
       * derivation; the per-bar selection through the same take the single
       * bar always used. A scale object keeps one selection for every bar
       * (v0.9's rule: the box is the material, the bars move the analysis). */
      const prog = progressionOf(cfg, cfg.key, cfg.scale);
      if (index >= prog.chords.length) index = 0;
      const N = prog.chords.length;
      const scaleSel = cfg.object === "scale" ? scaleTake(pool).notes : null;
      /* the whole result rides (260911, item 5): a refused bar's collide and
       * its derived escape are the engine's own fields, and the staff prints
       * them IN THE BAR — the playthrough matrix's doctrine ("places or
       * refuses by name, visibly") applied to this board. */
      const selOf = (c) => {
        if (cfg.object === "scale") return { notes: scaleSel };
        const r = cfg.take === "all"
          ? everyOccurrence(c.tones, pool, { n: cfg.notesPer })
          : oneOfEach(c.tones, pool, { n: cfg.notesPer, centre: pos.centre });
        return r;
      };

      /* the staves — v0.9's geometry: five lines each, the 8 under the treble */
      const X0 = 58, W = 1290 - X0 - 14, BW = W / N;
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

      /* WRITTEN AN OCTAVE ABOVE (v0.9's rule) — the step from the FIELD'S OWN
       * SPELLING, asserted a real spelled note before it draws */
      const WRITTEN = 12;
      const stepOf = (m0) => {
        const m2 = m0 + WRITTEN, pc = mod(m2, 12), oct = Math.floor(m2 / 12) - 1;
        const sp = fld.notes.find((n) => n.pc === pc);
        if (!sp) throw new Error("staff-board: a selected note is off the field — nothing off the field is drawable");
        return oct * 7 + LETTERS.indexOf(sp.name[0]);
      };
      const yTreble = (s) => TY + GAP * 8 - (s - (4 * 7 + 2)) * GAP;
      const yBass = (q) => BY + GAP * 8 - (q - (2 * 7 + 4)) * GAP;

      /* the label band above the HIGHEST note in the whole étude (v0.9's
       * register fix), so no bar's run collides with the names */
      const chords = prog.chords.map((_, ci) => chordAt(prog, ci, fld, cfg.object, cfg.dyad));
      const rs = chords.map((c) => selOf(c));
      const sels = rs.map((r) => r.notes || []);
      /* EVERY BAR WEARS THE FIGURE (260911, item 5 — Daniel's ruling,
       * superseding v0.9's current-bar-only display kept on 260910): the
       * figure resolves against EACH bar's own selection, exactly as the
       * walk will sound it when the bar arrives. A bar whose selection
       * cannot honour it prints the refusal in the bar. */
      const figs = sels.map((sl) => orderBy(cfg.address, cfg.figure, sl));
      const fig = figs[index] || { order: null, err: null };
      const allSteps = [];
      for (const sl of sels) for (const nt of sl) allSteps.push(stepOf(nt.midi));
      for (const fg of figs) if (fg.order) for (const nt of fg.order) allSteps.push(stepOf(nt.midi));
      const topStep = allSteps.length ? Math.max(...allSteps) : (4 * 7 + 2) + 8;
      /* a sequenced bar's stems rise 24 above the top head and the tuplet
       * numeral 4 more (260910, item 3) — the label band clears the BEAM,
       * not just the heads, whenever any bar writes a run */
      const anyRun = (fig.order && fig.order.length) || cfg.object === "scale"
        || cfg.movement === "arpeggio";
      const labY = Math.min(TY - 30, yTreble(topStep) - 20 - (anyRun ? 34 : 0));

      barsX = [];
      chords.forEach((c, ci) => {
        const x0 = X0 + ci * BW;
        barsX.push([x0, x0 + BW]);
        if (ci) el("line", { x1: x0, y1: TY, x2: x0, y2: TY + GAP * 8, stroke: "#D8D8DC", "stroke-width": 1 }, svg);
        if (ci) el("line", { x1: x0, y1: BY, x2: x0, y2: BY + GAP * 8, stroke: "#D8D8DC", "stroke-width": 1 }, svg);
        if (ci === index)
          el("rect", { x: x0, y: labY - 14, width: BW, height: (BY + GAP * 8) - (labY - 14),
            fill: "#B82929", opacity: 0.055, "data-stcur": ci }, svg);
        const lab = el("text", { x: x0 + 7, y: labY, "font-size": "12.5", "font-weight": "bold",
          fill: "#212126", class: "st-sym" }, svg);
        lab.textContent = c.symbol;
        const rl = el("text", { x: x0 + 7, y: labY + 11, "font-size": "9.5", fill: "#B9B9BF" }, svg);
        rl.textContent = ci === index ? `${c.roman} \u00b7 bar ${ci + 1} of ${N}` : c.roman;

        const figHere = figs[ci] && figs[ci].order && figs[ci].order.length ? figs[ci].order : null;
        const seq = figHere || sels[ci];
        /* the bar's refusals, by name, in the bar — the neck's vocabulary */
        const refuseLines = [];
        if (cfg.object !== "scale" && !sels[ci].length && c.tones) {
          let rWhy = "no placement fits";
          if (rs[ci].collide && rs[ci].collide.roles)
            rWhy += " — the " + rs[ci].collide.roles.join(" and ")
              + " occur only on string " + rs[ci].collide.string;
          rWhy += rs[ci].resolvesAt != null && rs[ci].resolvesAt <= 3
            ? " — Line takes them" : " — and no per-string ceiling resolves it";
          refuseLines.push(rWhy);
        } else if (figs[ci] && figs[ci].err && String(cfg.figure || "").trim()) {
          refuseLines.push("the figure cannot sound here — " + figs[ci].err);
        }
        for (const rTxt of refuseLines) {
          const fe = el("text", { x: x0 + 5, y: labY + 22, "font-size": "8",
            fill: "#B82929", "data-strefuse": ci }, svg);
          const wds = rTxt.split(" ");
          let ln = "", first = true;
          for (const wd of wds) {
            if ((ln + " " + wd).length > Math.max(16, BW / 5.2) && ln) {
              const ts = el("tspan", { x: x0 + 5, dy: first ? 0 : 9 }, fe);
              ts.textContent = ln; first = false; ln = wd;
            } else ln = ln ? ln + " " + wd : wd;
          }
          const ts = el("tspan", { x: x0 + 5, dy: first ? 0 : 9 }, fe);
          ts.textContent = ln;
        }
        /* 260905: A CHORD STACKS; A RUN DOES NOT — and which one this bar is
         * became the MOVEMENT control's fact, not Take's (Take is material) */
        const stacked = !figHere && cfg.object !== "scale" && cfg.movement !== "arpeggio";

        /* THE STAFF WRITES WHAT THE SCHEDULE SCHEDULES (260910, item 3 —
         * register 6 resolved): the note VALUES derive from walkSchedule's
         * own events, never a second rhythm derivation. bpm=60 makes `at`
         * read directly in beats; the bar's beats come from beatsOf exactly
         * as the walk's own chordBeats reads them. The notation is
         * score-board's, reproduced: stems to a common beam line, one thick
         * beam under a beat, a second at sixteenths, the italic numeral for
         * a non-dyadic group, hollow heads from the half note up. */
        const perBeats = beatsOf(prog.bars, meter, cfg.split);
        const flatBeats = [];
        prog.bars.forEach((bar, bi) => bar.forEach((_, k2) => flatBeats.push(perBeats[bi][k2])));
        const beats = flatBeats[ci] ?? meter;
        const spread2 = cfg.object === "scale" || cfg.movement === "arpeggio";
        let events = [];
        if (seq.length) {
          const sched = walkSchedule(sels[ci], figHere, beats, 60, { spread: spread2 });
          events = sched.events;
          if (events.length !== seq.length)
            throw new Error("staff-board: the schedule and the drawn sequence disagree — the staff may only write what sounds");
        }
        const together = events.length > 0 && events.every((ev) => ev.at === 0);
        const dv = together ? beats
          : events.length > 1 ? events[1].at - events[0].at : beats;
        const dyadic = [4, 2, 1, 0.5, 0.25].includes(dv);
        const wv = dyadic ? dv : writtenValue(dv);
        const open = together ? beats >= 2 : wv >= 2;
        const xsL = [], ysL = [];
        seq.forEach((nt, k) => {
          const st = stepOf(nt.midi), y = yTreble(st);
          /* the x IS the onset: at/beats through the bar, centred in its own
           * written slot — identical to the family's (k+0.5)·(w/L) when the
           * schedule is uniform, but sourced from the event itself */
          const x = stacked ? x0 + BW * 0.34
            : x0 + ((events[k].at + dv / 2) / beats) * BW;
          for (let q = (4 * 7 + 2) - 2; st <= q; q -= 2)
            el("line", { x1: x - 9, y1: yTreble(q), x2: x + 9, y2: yTreble(q), stroke: "#B9B9BF", "stroke-width": 1 }, svg);
          for (let q = (4 * 7 + 2) + 10; st >= q; q += 2)
            el("line", { x1: x - 9, y1: yTreble(q), x2: x + 9, y2: yTreble(q), stroke: "#B9B9BF", "stroke-width": 1 }, svg);
          const fam = FAM[nt.deg];
          const head = open
            ? { cx: x, cy: y, rx: 6.4, ry: 5, fill: "#fff", stroke: FAM_COLOR[fam],
                "stroke-width": 1.6, transform: `rotate(-18 ${x} ${y})`, "data-stmidi": nt.midi,
                "data-stbar": ci }
            : { cx: x, cy: y, rx: 6.4, ry: 5, fill: FAM_COLOR[fam],
                transform: `rotate(-18 ${x} ${y})`, "data-stmidi": nt.midi, "data-stbar": ci };
          if (figHere) head["data-stfig"] = k;    // the figure's own steps, addressable
          el("ellipse", head, svg);
          const t = el("text", { x, y: y + 3, "text-anchor": "middle", "font-size": "7.5",
            fill: open ? FAM_COLOR[fam] : FAM_TEXT[fam], "font-weight": "bold", class: "st-lab" }, svg);
          t.textContent = nt.role || fam;
          if (!stacked) { xsL.push(x); ysL.push(y); }
          if (ci === index) {
            const fr = el("text", { x, y: TY + GAP * 8 + 15 + (stacked ? k * 10 : 0),
              "text-anchor": "middle", "font-size": "8.5", fill: "#B9B9BF" }, svg);
            fr.textContent = nt.string + "/" + nt.fret;
          }
        });
        /* the notation — score-board's, on this board's heads */
        if (stacked && seq.length && beats < 4) {
          let yTop = 1e9, yLow = -1e9;
          for (const nt of seq) { const y2 = yTreble(stepOf(nt.midi));
            yTop = Math.min(yTop, y2); yLow = Math.max(yLow, y2); }
          el("line", { x1: x0 + BW * 0.34 + 6, y1: yLow, x2: x0 + BW * 0.34 + 6,
            y2: yTop - 26, stroke: "#212126", "stroke-width": 1.2, "data-ststem": "block" }, svg);
        } else if (!stacked && xsL.length && wv < 4) {
          const L = xsL.length;
          const yBeam = Math.min(...ysL) - 24;
          xsL.forEach((xk, k) => el("line", { x1: xk + 5.6, y1: ysL[k] - 1.5, x2: xk + 5.6,
            y2: yBeam, stroke: "#212126", "stroke-width": 1.1, "data-ststem": k }, svg));
          if (wv < 1) {
            el("line", { x1: xsL[0] + 5.6, y1: yBeam, x2: xsL[L - 1] + 5.6, y2: yBeam,
              stroke: "#212126", "stroke-width": 2.6, "data-stbeam": "1" }, svg);
            if (wv <= 0.25)
              el("line", { x1: xsL[0] + 5.6, y1: yBeam + 4.4, x2: xsL[L - 1] + 5.6, y2: yBeam + 4.4,
                stroke: "#212126", "stroke-width": 2.2, "data-stbeam": "2" }, svg);
            if (!dyadic) {
              const t2 = el("text", { x: (xsL[0] + xsL[L - 1]) / 2 + 5.6, y: yBeam - 4,
                "text-anchor": "middle", "font-size": "9", "font-style": "italic",
                fill: "#212126", "data-sttuplet": "" }, svg);
              t2.textContent = String(L);
            }
          } else if (!dyadic) {
            const yB = yBeam - 1, xa = xsL[0] + 5.6, xb = xsL[L - 1] + 5.6, xm = (xa + xb) / 2;
            for (const [xx1, xx2] of [[xa, xm - 7], [xm + 7, xb]])
              el("line", { x1: xx1, y1: yB, x2: xx2, y2: yB, stroke: "#212126", "stroke-width": 1.1 }, svg);
            for (const xx of [xa, xb])
              el("line", { x1: xx, y1: yB, x2: xx, y2: yB + 5, stroke: "#212126", "stroke-width": 1.1 }, svg);
            const t2 = el("text", { x: xm, y: yB + 3.4, "text-anchor": "middle", "font-size": "9.5",
              "font-style": "italic", fill: "#212126", "data-sttuplet": "" }, svg);
            t2.textContent = String(L);
          }
        }

        /* THE REFERENCE on the bass clef, PER BAR (child 5 meets child 7):
         * sounding pitch, outlined as v0.9 draws it — the fill was this
         * door's own night-5 divergence, corrected to the prototype now the
         * bass line is a line. An off-key root has no degree to hang a
         * relative reference on; the readout says so, the staff skips. */
        if (cfg.object !== "scale" && cfg.bass !== "none" && c.degree >= 0) {
          const rp = placeReference(cfg.bass, c.degree, fld, cfg.strings, pos);
          if (rp.note) {
            const m0 = rp.note.midi, pc2 = mod(m0, 12), oct = Math.floor(m0 / 12) - 1;
            const sp = fld.notes.find((n) => n.pc === pc2);
            if (!sp) throw new Error("staff-board: the reference is off the field — nothing off the field is drawable");
            const bStep = oct * 7 + LETTERS.indexOf(sp.name[0]);
            const bx = x0 + BW * 0.34, by = yBass(bStep);
            for (let q = (2 * 7 + 4) - 2; bStep <= q; q -= 2)
              el("line", { x1: bx - 9, y1: yBass(q), x2: bx + 9, y2: yBass(q), stroke: "#B9B9BF", "stroke-width": 1 }, svg);
            for (let q = (2 * 7 + 4) + 10; bStep >= q; q += 2)
              el("line", { x1: bx - 9, y1: yBass(q), x2: bx + 9, y2: yBass(q), stroke: "#B9B9BF", "stroke-width": 1 }, svg);
            const rf = FAM[rp.note.deg];
            el("ellipse", { cx: bx, cy: by, rx: 5.4, ry: 4.2, fill: "none",
              stroke: FAM_COLOR[rf], "stroke-width": 1.8,
              transform: `rotate(-18 ${bx} ${by})`, "data-strefmidi": m0 }, svg);
          }
        }
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
      if (hit) { announce(d, NOTE, { midi: +hit.dataset.stmidi }); return; }
      /* click a bar to jump — a REQUEST; the chart line owns the position */
      const svgRoot = byId("stSvg");
      const r = svgRoot.getBoundingClientRect(), vb = svgRoot.viewBox.baseVal;
      const vx = vb.x + (e.clientX - r.left) / r.width * vb.width;
      const ci = barsX.findIndex(([a, b]) => vx >= a && vx < b);
      if (ci >= 0) announce(d, STEP_CHANGED, { index: ci, request: true });
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
    listen(d, STEP_CHANGED, (m) => {
      if (!m || m.request === true || typeof m.index !== "number") return;
      if (m.index !== index) { index = m.index; render(); }
    });
    mountMini(ctx, byId("stMini"));
    render();
  },
};
