/* score-board.mjs — "The étude — end to end": the reference's grand-staff score
 * at four voices.
 *
 * `#score` in static/studies/triadetudes/study.html, ported: treble and bass
 * staves across a 1160-wide viewBox, chord symbol and roman above each bar,
 * every voicing note as a coloured notehead on the right line or space, the
 * pedal in the bass clef, barlines from the meter, a final double bar, and a
 * click-to-jump hit area per chord. The current chord is highlighted behind
 * everything. Geometry constants are the study's own.
 *
 * WHAT CHANGES AT FOUR VOICES: nothing structural — the reference's roadmap
 * said the v0.4 grand-staff renderer generalises with no structural change,
 * and it did: a chord is a stack of noteheads on one stem, and a stack of four
 * is drawn by the same loop as three. Block chords only in this child; the
 * arpeggiated form waits for the figure (Shape & Motion's disabled controls).
 *
 * Every notehead is DERIVED: pitch from the pass, spelling from the key's own
 * scale (chromatic notes fall back to the key's accidental side), staff
 * position from the letter and octave. Nothing here is hand-placed.
 */
import { tetradPass, degreeLabel } from "../../engine/tetrad-sequence.mjs";
import { OPEN_MIDI } from "../../engine/field.mjs";
import { scaleNotes, LETTER_PC, chromaticSpeller } from "../../engine/chord.mjs";
import { patternOf } from "../../engine/transport.mjs";
import { writtenValue } from "../../engine/drill.mjs";
import { parseFigure, figureEvents, playbackWord } from "../../engine/figure.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, CLOCK_STATE, listen, announce } from "../bus.mjs";
import { mountMini } from "../mini.mjs";
// the degree palette, stated once (260918, item 2a — was a hand-copied literal here)
import { FAM_COLOR, FAM_TEXT, VIOLET } from "../palette.mjs";

const SVGNS = "http://www.w3.org/2000/svg";
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];

const famOf = (lab) => lab === "R" ? "R" : lab.replace(/[#b]/g, "")
  .replace("9", "2").replace("11", "4").replace("13", "6");

/* THE SPELLER IS chord.mjs's (260920, night 26 item 2): this module carried
 * its own copy of the chromatic-spelling rule — letter + one accidental, a
 * hand-kept `|| key === "F"`, and a silent "C" when no letter fit — beside the
 * LETTER_PC it imported from the rule's owner. One speller now, the law
 * resolveRoman's (keep the letter, move the accidental). */

export const scoreBoard = {
  id: "score-board",
  layer: "surface",
  requires: { material: "tetrad" },
  mount_point: "boards",
  order: 22,
  controls: ["score", "scMini"],

  markup: `
  <span id="scMini" data-control="scMini"></span>
  <div class="bh"><span>The étude — end to end (click a bar to jump there)</span></div>
  <svg id="score" data-control="score" viewBox="0 0 1160 214" aria-label="etude notation"></svg>`,

  styles: `
#score{width:100%;height:auto;display:block}
#score .sc-hit{cursor:pointer}
#scMini{position:absolute;top:7px;right:44px;display:flex;gap:4px;z-index:6}
#scMini button{font:inherit;font-size:11px;padding:2px 8px;border:1px solid var(--line);
  border-radius:6px;background:#fff;cursor:pointer;color:var(--ink);line-height:1.5}
#scMini button:hover{border-color:var(--ink)}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const lock = ctx.door.lock || {};
    const families = Array.isArray(lock.families) && lock.families.length ? lock.families : ["drop2"];
    let cfg = { key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0, bass: "root" };
    let step = 0, meter = 4, splitIdx = 0, hi = null, xs = [];

    const el = (t, a, p) => { const e = d.createElementNS(SVGNS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };

    const render = () => {
      const svg = byId("score"); svg.textContent = ""; xs = [];
      const pass = tetradPass({ families, ...cfg });
      const spell = chromaticSpeller(cfg.key, cfg.scale);
      const HS = 5.5, yF5 = 44;
      const stepOf = (name, oct) => oct * 7 + LETTERS.indexOf(name[0]);
      const yOf = (name, oct) => yF5 + (stepOf("F", 5) - stepOf(name, oct)) * HS;
      const yA3 = yOf("A", 3), yBot = yA3 + 8 * HS;
      const X0 = 104, X1 = 1146;
      hi = el("rect", { x: 0, y: yF5 - 26, width: 0, height: yBot - yF5 + 40, rx: 8, fill: "rgba(184,41,41,0.06)" }, svg);
      for (let i = 0; i < 5; i++) {
        el("line", { x1: 34, y1: yF5 + i * 2 * HS, x2: X1, y2: yF5 + i * 2 * HS, stroke: "#B9B9BF", "stroke-width": 1 }, svg);
        el("line", { x1: 34, y1: yA3 + i * 2 * HS, x2: X1, y2: yA3 + i * 2 * HS, stroke: "#B9B9BF", "stroke-width": 1 }, svg);
      }
      el("line", { x1: 34, y1: yF5, x2: 34, y2: yBot, stroke: "#73737A", "stroke-width": 1.4 }, svg);
      const tc = el("text", { x: 40, y: yOf("G", 4) + HS * 2.1, "font-size": String(HS * 8), fill: "#212126", "font-family": "serif" }, svg);
      tc.textContent = "\u{1D11E}";
      const bc = el("text", { x: 42, y: yOf("F", 3) + HS * 2.4, "font-size": String(HS * 5), fill: "#212126", "font-family": "serif" }, svg);
      bc.textContent = "\u{1D122}";
      for (const yTop of [yF5, yA3]) {
        const t1 = el("text", { x: 88, y: yTop + 2 * HS + 5, "text-anchor": "middle", "font-size": "17", "font-weight": "bold", fill: "#212126" }, svg);
        t1.textContent = String(meter);
        const t2 = el("text", { x: 88, y: yTop + 6 * HS + 5, "text-anchor": "middle", "font-size": "17", "font-weight": "bold", fill: "#212126" }, svg);
        t2.textContent = "4";
      }
      const pat = patternOf(meter, splitIdx);
      const beatsOf = (i) => pat[i % pat.length];
      const total = pass.steps.reduce((a, _, i) => a + beatsOf(i), 0);
      const unit = (X1 - X0 - 8) / total;

      const ledger = (x, name, oct) => {
        const st = stepOf(name, oct), topT = stepOf("F", 5), botB = stepOf("G", 2);
        const led = [];
        for (let q = st; q > topT; q--) if (q % 2 === topT % 2) led.push(q);
        for (let q = st; q < botB; q++) if (q % 2 === botB % 2) led.push(q);
        const c4 = stepOf("C", 4);
        if (st < stepOf("A", 3) && st > stepOf("E", 4) && st % 2 === c4 % 2) led.push(st);
        else if (st === c4 - 1 || st === c4 + 1) led.push(c4);
        for (const L of new Set(led)) {
          const ly = yF5 + (topT - L) * HS;
          if (ly > yF5 + 8 * HS && ly < yA3 - 0.1 || ly < yF5 || ly > yBot)
            el("line", { x1: x - 10, y1: ly, x2: x + 10, y2: ly, stroke: "#73737A", "stroke-width": 1 }, svg);
        }
      };
      const head = (x, name, oct, fam, lab, open) => {
        ledger(x, name, oct);
        const y = yOf(name, oct), acc = name.slice(1);
        if (acc) {
          const a = el("text", { x: x - 13, y: y + 3.8, "text-anchor": "middle", "font-size": "12", fill: "#212126" }, svg);
          a.textContent = acc.replace(/#/g, "♯").replace(/b/g, "♭");
        }
        el("ellipse", { cx: x, cy: y, rx: 6.4, ry: 4.9, fill: open ? "#fff" : FAM_COLOR[fam],
          stroke: FAM_COLOR[fam], "stroke-width": open ? 2 : 0, transform: `rotate(-14 ${x} ${y})` }, svg);
        if (!open) {
          const t = el("text", { x, y: y + 2.3, "text-anchor": "middle", "font-size": "6", fill: FAM_TEXT[fam],
            "font-weight": "bold", "pointer-events": "none" }, svg);
          t.textContent = lab;
        }
        return y;
      };

      let acc = 0;
      pass.steps.forEach((s, i) => {
        const beats = beatsOf(i), x = X0 + acc * unit, w = beats * unit;
        xs[i] = { x, w };
        const lb = el("text", { x: x + 3, y: 16, "font-size": "12.5", "font-weight": "bold", fill: "#212126" }, svg);
        lb.textContent = s.symbol;
        const r = el("text", { x: x + 3, y: 28, "font-size": "9.5", fill: "#73737A" }, svg);
        r.textContent = s.roman;
        /* THE FIGURE IS THE RHYTHM (the reference's renderScore, ported): the
         * same event list the audio plays and the stage pulses. Block: the four
         * voices stacked at the slot start, one stem. A line: each event at its
         * onset, written at the value the subdivision implies — beamed for 8ths
         * and 16ths, bracketed with a number when not dyadic. Approaches are
         * cue-size, hollow, degree-coloured when diatonic and violet when not. */
        const parsedFig = parseFigure(cfg.figure, cfg.address || "slots");
        let events;
        /* THE REASON IS CARRIED (260911, item 3; register 22): the engine
         * fails loudly and BY NAME ("naming it at source protects every
         * caller"), and this catch used to discard the name and draw
         * something else — a §4.4 silent divergence in a shipped module.
         * The catch still keeps the board alive; the bar now says it could
         * not honour the figure, and why, where the player is looking. */
        let figErr = null;
        try {
          events = figureEvents(s, { parsed: parsedFig.err ? null : parsedFig.pattern,
            address: cfg.address || "slots", playback: playbackWord(cfg.playback) || "strum", durBeats: beats, bpm: 72,
            ctx: { scalePcs: scaleNotes(cfg.key, cfg.scale).map((n) => n.pc), tonicPc: scaleNotes(cfg.key, cfg.scale)[0].pc,
              open: OPEN_MIDI, nfrets: 15, set: pass.set.strings } });
        } catch (e) { events = null; figErr = e && e.message ? e.message : String(e); }
        if (figErr && parsedFig.pattern && (playbackWord(cfg.playback) || "strum") !== "strum") {
          const fe = el("text", { x: x + 3, y: 40, "font-size": "8", fill: "#B82929",
            "data-scfigerr": "" }, svg);
          const feWords = ("the figure cannot sound here — " + figErr).split(" ");
          let feLine = "", feFirst = true;
          for (const wd of feWords) {
            if ((feLine + " " + wd).length > Math.max(18, w / 5) && feLine) {
              const ts = el("tspan", { x: x + 3, dy: feFirst ? 0 : 9 }, fe);
              ts.textContent = feLine; feFirst = false; feLine = wd;
            } else feLine = feLine ? feLine + " " + wd : wd;
          }
          const ts = el("tspan", { x: x + 3, dy: feFirst ? 0 : 9 }, fe);
          ts.textContent = feLine;
        }
        const seqEvents = events && (playbackWord(cfg.playback) || "strum") !== "strum" && parsedFig.pattern
          ? events.filter((ev) => ev.role !== "bass" && !ev.bed) : null;
        const labOf = (midi) => degreeLabel(s.chord, midi);
        if (!seqEvents) {
          const open = beats >= 2, xh = x + 16;
          let yTop = 1e9, yLow = -1e9;
          s.voicing.notes.forEach((n, k) => {
            const sp = spell(n.midi), lab = s.labels[k];
            const y = head(xh, sp.name, sp.oct, famOf(lab), lab, open);
            yTop = Math.min(yTop, y); yLow = Math.max(yLow, y);
          });
          if (beats < 4) el("line", { x1: xh + 6, y1: yLow, x2: xh + 6, y2: yTop - 26, stroke: "#212126", "stroke-width": 1.2 }, svg);
        } else {
          const L = seqEvents.length, dv = beats / L;
          const dyadic = [4, 2, 1, 0.5, 0.25].includes(dv);
          const wv = dyadic ? dv : writtenValue(dv);
          const open = wv >= 2;
          const xsL = [], ysL = [];
          const scalePcs = scaleNotes(cfg.key, cfg.scale).map((n) => n.pc);
          seqEvents.forEach((ev, k) => {
            const sp = spell(ev.midi), xk = x + (k + 0.5) * (w / L);
            let y;
            if (ev.role === "approach") {
              y = yOf(sp.name, sp.oct); ledger(xk, sp.name, sp.oct);
              const acc = sp.name.slice(1);
              if (acc) { const a = el("text", { x: xk - 11, y: y + 3.4, "text-anchor": "middle", "font-size": "10", fill: "#212126" }, svg);
                a.textContent = acc.replace(/#/g, "♯").replace(/b/g, "♭"); }
              const chrom = !scalePcs.includes(((ev.midi % 12) + 12) % 12);
              const fam = famOf(labOf(ev.midi));
              el("ellipse", { cx: xk, cy: y, rx: 4.5, ry: 3.4, fill: open ? "#fff" : (chrom ? VIOLET : FAM_COLOR[fam]),
                stroke: chrom ? VIOLET : FAM_COLOR[fam], "stroke-width": open ? 1.6 : 0, transform: `rotate(-14 ${xk} ${y})`,
                "data-scname": sp.name, "data-scapproach": chrom ? "chromatic" : "diatonic" }, svg);   // the one speller's answer, on the artifact (260920)
            } else {
              const lab = labOf(ev.midi);
              y = head(xk, sp.name, sp.oct, famOf(lab), lab, open);
            }
            xsL.push(xk); ysL.push(y);
          });
          if (wv < 4) {
            const yBeam = Math.min(...ysL) - 24;
            xsL.forEach((xk, k) => el("line", { x1: xk + 5.6, y1: ysL[k] - 1.5, x2: xk + 5.6, y2: yBeam, stroke: "#212126", "stroke-width": 1.1 }, svg));
            if (wv < 1) {
              el("line", { x1: xsL[0] + 5.6, y1: yBeam, x2: xsL[xsL.length - 1] + 5.6, y2: yBeam, stroke: "#212126", "stroke-width": 2.6 }, svg);
              if (wv <= 0.25) el("line", { x1: xsL[0] + 5.6, y1: yBeam + 4.4, x2: xsL[xsL.length - 1] + 5.6, y2: yBeam + 4.4, stroke: "#212126", "stroke-width": 2.2 }, svg);
              if (!dyadic) { const t = el("text", { x: (xsL[0] + xsL[xsL.length - 1]) / 2 + 5.6, y: yBeam - 4, "text-anchor": "middle", "font-size": "9", "font-style": "italic", fill: "#212126" }, svg); t.textContent = String(L); }
            } else if (!dyadic) {
              const yB = yBeam - 1, xa = xsL[0] + 5.6, xb = xsL[xsL.length - 1] + 5.6, xm = (xa + xb) / 2;
              for (const [x1, x2] of [[xa, xm - 7], [xm + 7, xb]]) el("line", { x1, y1: yB, x2, y2: yB, stroke: "#212126", "stroke-width": 1.1 }, svg);
              for (const xx of [xa, xb]) el("line", { x1: xx, y1: yB, x2: xx, y2: yB + 5, stroke: "#212126", "stroke-width": 1.1 }, svg);
              const t = el("text", { x: xm, y: yB + 3.4, "text-anchor": "middle", "font-size": "9.5", "font-style": "italic", fill: "#212126" }, svg); t.textContent = String(L);
            }
          }
        }
        // the pedal in the bass clef, when the Harmony panel asks for one
        if (cfg.bass !== "none") {
          const low = Math.min(...s.voicing.notes.map((n) => n.midi));
          let bm = low - ((((low - s.chord.root.pc) % 12) + 12) % 12);
          if (bm >= low) bm -= 12; if (bm < 28) bm += 12;
          const sp = spell(bm), y = head(x + 16, sp.name, sp.oct, "R", "R", beats >= 2);
          if (beats < 4) el("line", { x1: x + 16 - 6, y1: y, x2: x + 16 - 6, y2: y + 24, stroke: "#212126", "stroke-width": 1.2 }, svg);
        }
        acc += beats;
        const xe = X0 + acc * unit;
        if (acc % meter === 0 && i < pass.steps.length - 1)
          el("line", { x1: xe, y1: yF5, x2: xe, y2: yBot, stroke: "#73737A", "stroke-width": 1.1 }, svg);
        const hit = el("rect", { class: "sc-hit", x, y: yF5 - 26, width: w, height: yBot - yF5 + 40, fill: "transparent" }, svg);
        hit.addEventListener("click", () => announce(d, STEP_CHANGED, { index: i, request: true }));
      });
      el("line", { x1: X1 - 5, y1: yF5, x2: X1 - 5, y2: yBot, stroke: "#212126", "stroke-width": 1 }, svg);
      el("line", { x1: X1 - 1, y1: yF5, x2: X1 - 1, y2: yBot, stroke: "#212126", "stroke-width": 2.6 }, svg);
      highlight();
    };
    const highlight = () => {
      if (!hi || !xs[step]) return;
      hi.setAttribute("x", xs[step].x); hi.setAttribute("width", xs[step].w);
    };

    listen(d, CONFIG_CHANGED, (m) => { cfg = { ...cfg, ...m }; step = 0; render(); });
    listen(d, STEP_CHANGED, (m) => {
      if (!m) return;
      if (m.request === true && typeof m.splitIdx === "number") {
        if (typeof m.meter === "number") meter = m.meter;
        if (m.splitIdx !== splitIdx) { splitIdx = m.splitIdx; render(); }
        return;
      }
      if (m.request !== true && typeof m.index === "number") { step = m.index; highlight(); }
    });
    listen(d, CLOCK_STATE, (m) => {
      if (m && typeof m.meter === "number" && m.meter !== meter) { meter = m.meter; splitIdx = 0; render(); }
    });
    mountMini(ctx, byId("scMini"));   // ⏮ ▶ ⏹ ⏭ over the score, driving the one clock
    render();
  },
};
