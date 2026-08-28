/* field-board.mjs — THE FIELD, and now THE WINDOW AND THE SET on it
 * (Multetudes children 0 and 2).
 *
 * Child 0: the brief's model (multetudes-prd.md §2.1) — choose a key and the
 * whole neck shows every note of it, subdued; everything else the app will do
 * is a NARROWING of that constant field. Child 2 adds the first two
 * narrowings the model names: THE POSITION (the ratified window — C5,
 * 260821 — three consecutive scale notes on the anchor string wide, by the
 * strings of the set tall) and THE SET (any run of strings, contiguous or
 * skipped — `{6,4,3,1}` as legal as `{4,3,2,1}`).
 *
 * WHAT COUNTS AS A PRE-RUN IDENTITY (the migration's trigger): a message that
 * carries `setIndex` and a `key` but no `strings` — the shape of a RESTORED
 * SNAPSHOT (the notepad announces the whole merged config) from before the
 * run existed, or an imported tetrad-family log. Shape & Motion's own live
 * announcements carry setIndex WITHOUT a key (it owns the shape half only),
 * and deliberately do not migrate: in this skeleton its segment governs the
 * tetrad boards and this selector governs the field — two set controls,
 * coexisting, and reconciling them is the app-surface child's decision, not
 * this one's (§4.4: stated, not silent). A first draft keyed the migration on
 * a mount-time flag instead and was seen wrong: modules mount in import
 * order, not page order, so Shape & Motion's mount default arrived after the
 * flag flipped and hijacked the six-string field on a cold load.
 *
 * WHAT IS DERIVED, AND FROM WHERE (golden rule 1):
 *   the field                engine/field.mjs      field() / notesOn()
 *   the window               engine/position.mjs   positionOf/step/reanchor/regionOf
 *   the run and its label    engine/string-run.mjs makeRun / fromSetIndex
 * Nothing musical is restated here; the board asserts the derivation before
 * drawing (deriveField's closed-form count — different arithmetic than the
 * walk it checks) and draws only what the assertions passed.
 *
 * THE SET IS CONFIG AND THE RUN IS THE IDENTITY: this board owns `strings`
 * (the array itself, stored as such) plus the window's design (`startDeg`
 * against the reference, `nearFret` its resolved seat). `setIndex` is
 * accepted as a LOAD-TIME MIGRATION ALIAS only — a message carrying setIndex
 * and no strings (a restored pre-run étude, or Shape & Motion's own segment
 * in this skeleton) translates through engine/string-run.mjs's fromSetIndex
 * against the same enumeration the old identity indexed. Nothing ever writes
 * setIndex back (no dual-write). The mount-time replay is NOT adopted: the
 * bus replays Shape & Motion's default to every late subscriber, and a
 * default is not a user's act — only messages after mount migrate.
 *
 * CHANGING THE SET TRANSLATES THE DESIGN INSTEAD OF RESETTING IT (the
 * relative-state doctrine, G16): the start degree survives, the anchor moves
 * to the new run's lowest-pitch string, and the box slides near its old
 * centre — engine/position.mjs's reanchor, unrepeated.
 *
 * A SKIPPED SET DRAWS HONESTLY: the frame spans the run's min..max strings;
 * a string excluded inside the span keeps its selector square hollow AND its
 * ghost dots inside the frame dim to less than half the field's own subdue —
 * excluded reads as excluded, at the neck, not only in the gutter.
 *
 * THE DOTS SOUND (floor F3): every dot carries data-midi, one delegated
 * click announces NOTE. On the anchor string a click ALSO seats the window
 * there (the prototype's gesture), and with the neck focused ← → step the
 * window one scale note — box shift, the model's only travel.
 */
import { field, notesOn } from "../../engine/field.mjs";
import { positionOf, step, reanchor, regionOf } from "../../engine/position.mjs";
import { makeRun, fromSetIndex } from "../../engine/string-run.mjs";
import { STRING_SETS } from "../../engine/tetrad-sequence.mjs";
import { CONFIG_CHANGED, NOTE, listen, announce } from "../bus.mjs";

const SVGNS = "http://www.w3.org/2000/svg";
/* the reference's neck geometry, verbatim; the viewBox is 80 wider to seat
 * the selector column right of fret 15, as the prototype draws it */
const NFRETS = 15, FX0 = 46, FW = 71, SY0 = 34, SGAP = 34;
const STR_X = FX0 + NFRETS * FW + 42;
const fx = (f) => (f === 0 ? FX0 - 22 : FX0 + (f - 0.5) * FW);
const fy = (str) => SY0 + (str - 1) * SGAP;
const FAM = ["R", "2", "3", "4", "5", "6", "7"];
const FAM_COLOR = { R: "#B82929", "2": "#3C8B2F", "3": "#2959A6", "4": "#A9ABB4",
  "5": "#212126", "6": "#1CB8D1", "7": "#D99A08" };
const FAM_TEXT = { R: "#fff", "2": "#fff", "3": "#fff", "4": "#212126",
  "5": "#fff", "6": "#212126", "7": "#212126" };

const SCALE_WORD = { major: "major", harm: "harmonic minor", mel: "melodic minor" };
const ORD = ["root", "2nd", "3rd", "4th", "5th", "6th", "7th"];

/** the field's dots, derived then asserted — never drawn before both. The
 * walk is engine/field.mjs's notesOn; the assertion is a CLOSED FORM computed
 * with different arithmetic (a pc's first fret on the string, plus its +12
 * recurrence when that first fret is ≤ 3), so the check cannot be the
 * derivation grading itself. */
export function deriveField(fld) {
  const dots = [];
  for (let s = 1; s <= 6; s++) {
    const ns = notesOn(s, fld, NFRETS);
    const open = ns.length && ns[0].fret === 0 ? ns[0].midi : null;
    const predicted = fld.pcs.reduce((a, pc) => {
      const base = (open !== null ? open : ns[0].midi - ns[0].fret);
      const f0 = (((pc - base) % 12) + 12) % 12;
      return a + (f0 <= NFRETS - 12 ? 2 : 1);
    }, 0);
    if (ns.length !== predicted)
      throw new Error(`field-board: string ${s} carries ${ns.length} field notes, arithmetic says ${predicted}`);
    dots.push(...ns);
  }
  for (const d of dots)
    if (fld.degOf(d.midi) < 0 || d.fret < 0 || d.fret > NFRETS)
      throw new Error("field-board: a derived dot is off the field or off the neck");
  return dots;
}

export const fieldBoard = {
  id: "field-board",
  layer: "surface",
  requires: { field: true },
  mount_point: "boards",
  /* above the tetrad neck (order 20): the field is the constant everything
   * else narrows, so it reads first among the boards */
  order: 18,
  controls: ["fieldSvg"],

  markup: `
  <div class="bh"><span>The field</span></div>
  <div class="hint" id="fdHint"></div>
  <svg id="fieldSvg" data-control="fieldSvg" viewBox="0 0 1240 260" tabindex="0"
    aria-label="the field — every note of the key, the window, and the string set"></svg>`,

  /* every rule names a token only this board ships */
  styles: `
#fieldSvg{width:100%;height:auto;display:block;outline:none}
#fdHint{margin:2px 2px 8px}
.fd-dot{cursor:pointer}
.fd-lab{font-weight:bold;pointer-events:none;user-select:none}
.fd-frame{fill:none;stroke:#73737A;stroke-width:1.6;stroke-dasharray:6 4;pointer-events:none}
.fd-str{cursor:pointer}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    /* PRIVATE (§4.2.3): this board owns the set and the window's design.
     * `strings` defaults to the six-string scale box — the generalisation the
     * ruling names as the point. */
    let cfg = { key: "C", scale: "major",
      strings: [6, 5, 4, 3, 2, 1], startDeg: 0, nearFret: 5 };
    let cur = null;            // { fld, run, pos, region } of the last build

    const el = (t, a, p) => {
      const e = d.createElementNS(SVGNS, t);
      for (const k in a) e.setAttribute(k, a[k]);
      if (p) p.appendChild(e);
      return e;
    };

    const build = () => {
      // derive + assert, then draw — the field, the run, the window
      const fld = field({ key: cfg.key, scale: cfg.scale });
      const dots = deriveField(fld);
      const run = makeRun(cfg.strings);
      const anchor = Math.max(...run.strings);
      const pos = positionOf({ field: fld, anchorString: anchor,
        startDegree: cfg.startDeg, nearFret: cfg.nearFret });
      const region = regionOf(pos, run.strings);
      cur = { fld, run, pos, region };

      const svg = byId("fieldSvg");
      svg.textContent = "";

      /* the neck — the reference's rendering */
      for (let f = 0; f <= NFRETS; f++)
        el("line", { x1: FX0 + f * FW, y1: fy(1) - 14, x2: FX0 + f * FW, y2: fy(6) + 14,
          stroke: f === 0 ? "#212126" : "#D8D8DC", "stroke-width": f === 0 ? 4 : 1.2 }, svg);
      for (const mf of [3, 5, 7, 9, 12]) {
        el("circle", { cx: FX0 + (mf - 0.5) * FW, cy: fy(6) + 26, r: 3.4, fill: "#D8D8DC" }, svg);
        if (mf === 12) el("circle", { cx: FX0 + (mf - 0.5) * FW + 10, cy: fy(6) + 26, r: 3.4, fill: "#D8D8DC" }, svg);
        const tx = el("text", { x: FX0 + (mf - 0.5) * FW, y: fy(1) - 22, "text-anchor": "middle",
          "font-size": "10", fill: "#B9B9BF" }, svg);
        tx.textContent = mf;
      }
      for (let s = 1; s <= 6; s++)
        el("line", { x1: FX0 - 30, y1: fy(s), x2: FX0 + NFRETS * FW, y2: fy(s),
          stroke: "#B9B9BF", "stroke-width": s >= 4 ? 1.8 : 1.1 }, svg);

      /* the field, subdued at the study's own 0.28 — and HONESTY FOR A SKIP:
       * a string excluded from the run dims further inside the frame, so
       * "excluded" is visible at the neck itself */
      const inRun = new Set(run.strings);
      for (const dot of dots) {
        const fam = FAM[dot.deg];
        const excludedInFrame = !inRun.has(dot.string)
          && dot.string >= region.strHi && dot.string <= region.strLo
          && dot.fret >= pos.fLo && dot.fret <= pos.fHi;
        const g = el("g", { class: "fd-dot", opacity: excludedInFrame ? 0.1 : 0.28,
          "data-midi": dot.midi, "data-str": dot.string, "data-fret": dot.fret }, svg);
        el("circle", { cx: fx(dot.fret), cy: fy(dot.string), r: 10.5, fill: FAM_COLOR[fam] }, g);
        const t = el("text", { x: fx(dot.fret), y: fy(dot.string) + 3.4, "text-anchor": "middle",
          "font-size": "9.5", fill: FAM_TEXT[fam], class: "fd-lab" }, g);
        t.textContent = fam;
      }

      /* THE WINDOW — one rigid dashed rectangle (the ruling's), spanning the
       * run's min..max strings by the window's frets. It never stretches,
       * never reports, never explains itself. */
      const ys = [fy(region.strHi) - 17, fy(region.strLo) + 17];
      const xLo = pos.fLo === 0 ? FX0 - 34 : FX0 + (pos.fLo - 1) * FW + FW * 0.28;
      const xHi = Math.min(FX0 + pos.fHi * FW - FW * 0.22, FX0 + NFRETS * FW + 9);
      el("rect", { class: "fd-frame", x: xLo, y: ys[0], width: xHi - xLo,
        height: ys[1] - ys[0], rx: 12 }, svg);

      /* THE SELECTOR: the string numbers, as squares — filled in the run,
       * hollow out of it (the prototype's reading, kept). The number IS the
       * control. */
      const capT = el("text", { x: STR_X, y: fy(1) - 22, "text-anchor": "middle",
        "font-size": "8.5", fill: "#B9B9BF" }, svg);
      capT.textContent = "set";
      for (let s = 1; s <= 6; s++) {
        const on = inRun.has(s);
        const g = el("g", { class: "fd-str", "data-fdstr": s }, svg);
        el("rect", { x: STR_X - 12, y: fy(s) - 11, width: 24, height: 22, rx: 6,
          fill: on ? "#212126" : "#fff", stroke: on ? "#212126" : "#B9B9BF",
          "stroke-width": 1.3 }, g);
        const t = el("text", { x: STR_X, y: fy(s) + 4, "text-anchor": "middle",
          "font-size": "11.5", "font-weight": on ? "bold" : "normal",
          fill: on ? "#fff" : "#73737A", class: "fd-lab" }, g);
        t.textContent = s;
      }

      byId("fdHint").textContent =
        `${cfg.key} ${SCALE_WORD[cfg.scale] || cfg.scale} — the whole field, ${dots.length} notes. ` +
        `Strings ${run.label}${run.contiguous ? "" : " (skipped)"} · ` +
        `the window from the ${ORD[pos.startDeg]} on string ${anchor}, frets ${pos.fLo}–${pos.fHi}. ` +
        `Click the numbers to choose strings; ← → step the window.`;
    };

    /* the board announces ITS OWN facts — the run, and the window's design.
     * setIndex is never written back (no dual-write). */
    const push = () => {
      build();
      announce(d, CONFIG_CHANGED, { strings: [...cfg.strings],
        startDeg: cfg.startDeg, nearFret: cfg.nearFret });
    };

    /* a set change TRANSLATES the design: same start degree, the box sliding
     * near its old centre — then the resolved seat is stored, so a restore
     * reproduces the window byte for byte */
    const setStrings = (next) => {
      const fld = cur.fld;
      const moved = reanchor(cur.pos, next, fld);
      cfg = { ...cfg, strings: next, startDeg: moved.startDeg, nearFret: moved.fLo };
      push();
    };

    byId("fieldSvg").addEventListener("click", (e) => {
      const sq = e.target.closest("[data-fdstr]");
      if (sq) {
        const s = +sq.dataset.fdstr;
        const has = cfg.strings.includes(s);
        if (has && cfg.strings.length === 1) return;   // a run is never empty
        setStrings(has ? cfg.strings.filter((x) => x !== s) : [...cfg.strings, s]);
        return;
      }
      const hit = e.target.closest("[data-midi]");
      if (!hit) return;
      announce(d, NOTE, { midi: +hit.dataset.midi });
      // on the anchor string, a click also seats the window there
      if (cur && +hit.dataset.str === Math.max(...cur.run.strings)) {
        cfg = { ...cfg, startDeg: cur.fld.degOf(+hit.dataset.midi), nearFret: +hit.dataset.fret };
        push();
      }
    });

    byId("fieldSvg").addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const next = step(cur.pos, e.key === "ArrowRight" ? 1 : -1, cur.fld);
      cfg = { ...cfg, startDeg: next.startDeg, nearFret: next.fLo };
      push();
      e.preventDefault();
    });

    listen(d, CONFIG_CHANGED, (m) => {
      if (!m || typeof m !== "object") return;
      let changed = false;
      for (const k of ["key", "scale", "startDeg", "nearFret"])
        if (k in m && m[k] !== cfg[k]) { cfg = { ...cfg, [k]: m[k] }; changed = true; }
      if ("strings" in m && Array.isArray(m.strings)
          && m.strings.join() !== cfg.strings.join()) {
        cfg = { ...cfg, strings: [...m.strings] }; changed = true;
      } else if ("setIndex" in m && !("strings" in m) && "key" in m
          && Number.isInteger(m.setIndex) && cur) {
        /* THE ALIAS: a restored pre-run identity (setIndex + key, no run —
         * see the header), translated against the enumeration it indexed.
         * Adopt-and-announce: the translated run must reach the bus, or a
         * snapshot taken now would carry the stale strings. */
        const run = fromSetIndex(m.setIndex, STRING_SETS);
        if (run.strings.join() !== cfg.strings.join()) {
          const moved = reanchor(cur.pos, run.strings, cur.fld);
          cfg = { ...cfg, strings: run.strings, startDeg: moved.startDeg, nearFret: moved.fLo };
          push();                      // announces strings — never setIndex
          return;
        }
      }
      if (changed) build();
    });
    booted = true;                     // the replay above was mount-time state

    push();
  },
};
