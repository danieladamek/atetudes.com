/* field-board.mjs — ON THE NECK: Multetudes' neck, v0.9's card (children 0,
 * 2, 3a; the surface rework of 2026-08-29 under the identical-to-v0.9
 * ruling).
 *
 * THIS BOARD IS MULTETUDES' ON THE NECK. The two-necks question was resolved
 * by the 2026-08-28 afternoon ruling: v0.9 has one neck, the kill-condition
 * measurement is finished, so the door stops mounting the tetrad board and
 * this board carries the component's name. fretboard-stage.mjs is untouched —
 * the family component was not modified to fit; a different neck for a
 * different app is the register's business, and the entry exists.
 *
 * WHAT IT RENDERS (v0.9's card, structurally verbatim): the neck with the
 * field ghosted; the window (the ratified rigid rectangle) with its MOVE GRIP
 * and two EDGE HANDLES; the string-set squares and the pattern-bracket gutter
 * right of fret 15 (the bracket itself is 3b's and stays empty until then);
 * the right rail — Placement, the figure address and input (inert, 3b), and
 * the box-gesture prose behind the ⓘ; the transport rail (metronome check,
 * bar split, voice) and the mixer (harmony · bass) beneath; the legend.
 *
 * WHAT IT OWNS vs HEARS (§4.2.3): owns the run (`strings`), the window's
 * design (`startDeg`, `nearFret`) and the ceiling (`notesPer`); hears key,
 * scale, object, take and the reference from the Harmony card and derives
 * everything it draws. The mixer and voice announce MIXER; the metronome
 * check is a second view of CLOCK_STATE.click (one state, two views — the
 * family's own rule); the pulse dot renders BEAT.
 *
 * WHAT IS DERIVED, AND FROM WHERE (golden rule 1):
 *   the field                engine/field.mjs      field() / notesOn()
 *   the window               engine/position.mjs   positionOf/step/reanchor/regionOf
 *   the run and its label    engine/string-run.mjs makeRun / fromSetIndex
 *   the selection            engine/selection.mjs  oneOfEach/everyOccurrence/scaleTake
 * Nothing musical is restated here; deriveField asserts the walk against a
 * closed-form count before anything draws.
 *
 * The setIndex migration, the coexistence rule for live shape-half messages,
 * and the design-translating set change are unchanged from children 2–3a and
 * keep their mutation proofs (bite 10–15).
 */
import { field, notesOn } from "../../engine/field.mjs";
import { positionOf, step, reanchor, regionOf, materialIn } from "../../engine/position.mjs";
import { makeRun, fromSetIndex } from "../../engine/string-run.mjs";
import { diatonicTones, objectOffsets, oneOfEach, everyOccurrence, scaleTake, orderBy, bracketOf, offersOn } from "../../engine/selection.mjs";
import { placeReference } from "../../engine/reference.mjs";
import { progressionOf, chordAt } from "../../engine/progression.mjs";
import { STRING_SETS } from "../../engine/tetrad-sequence.mjs";
import { NOTE_VOICE_NAMES } from "../../engine/voices.mjs";
import { SPLITS } from "../../engine/drill.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, NOTE, MIXER, CLOCK, CLOCK_STATE, BEAT, listen, announce } from "../bus.mjs";

const SVGNS = "http://www.w3.org/2000/svg";
/* the reference's neck geometry, verbatim; the viewBox is 120 wider to seat
 * the set squares AND the pattern-bracket gutter, as v0.9 draws them */
const NFRETS = 15, FX0 = 46, FW = 71, SY0 = 34, SGAP = 34;
const STR_X = FX0 + NFRETS * FW + 42;
const BRK_X = FX0 + NFRETS * FW + 76;
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
  order: 18,
  controls: ["fieldSvg", "fdNSeg", "fdAddrSeg", "fdFigIn", "fdMetChk", "fdSplit",
    "fdVoice", "fdHarmVol", "fdHarmMute", "fdBassVol", "fdBassMute", "fdRailBtn"],

  markup: `
  <div class="bh"><span>On the neck</span></div>
  <div class="fd-wrap">
    <svg id="fieldSvg" data-control="fieldSvg" viewBox="0 0 1280 260" tabindex="0"
      aria-label="the neck — the field, the window, the string set, and the selection"></svg>
    <div class="fd-rail" id="fdRail">
      <div class="fd-railtop"><button id="fdRailBtn" data-control="fdRailBtn"
        title="collapse this rail">›</button></div>
      <div class="fd-cap">Placement</div>
      <div class="seg" id="fdNSeg" data-control="fdNSeg">
        <button data-nps="1" class="on" title="one note per string — only what can sound together">Grip</button>
        <button data-nps="3" title="up to three on a string — thirds on one string, lines through the chord">Line</button>
      </div>
      <div class="fd-cap">The figure is</div>
      <div class="seg" id="fdAddrSeg" data-control="fdAddrSeg">
        <button data-addr="pattern" class="on"
          title="a sequence of STRING numbers — 4,3,4,3,2,1; a repeat is the ordinal">pattern</button>
        <button data-addr="tones" title="roles — R, 3, 5, 7">tones</button>
      </div>
      <div class="fd-cap">Figure</div>
      <input type="text" id="fdFigIn" data-control="fdFigIn" placeholder="4,3,4,3,2,1"
        autocomplete="off">
      <div class="hint fd-fignote" id="fdFigNote"></div>
      <div class="hint info"><b>Moving the box.</b> Drag the ■ grip to move it — across frets,
      and across strings with it. Drag the ● handles on its top and bottom edges to choose which
      strings it spans. With the neck focused, ← → step the frame one scale note and
      ↑ ↓ slide the whole set across the strings. Clicking any note on the anchor string
      seats the frame there. The numbered squares choose the strings one by one — skips are
      how you ask for a spread.</div>
    </div>
  </div>
  <div class="fd-railrow">
    <label class="chk" title="the click — one state, two views; the Metronome card's Sound is the other"><input type="checkbox" id="fdMetChk" data-control="fdMetChk"> metronome</label>
    <span class="fd-pulse" id="fdPulse"></span>
    <span class="fd-lab2">bar split</span>
    <select id="fdSplit" data-control="fdSplit"
      title="the bar split — a bar's chords take these slots in order"></select>
    <span class="fd-lab2">voice</span>
    <select id="fdVoice" data-control="fdVoice"></select>
  </div>
  <div class="bpmrow fd-mixrow" title="the mixer: the harmony level — muted is this slider at zero">
    <button class="muteBtn" id="fdHarmMute" data-control="fdHarmMute" aria-pressed="false">&#128266;</button>
    <span class="fd-lab2 fd-mixlab">harmony</span>
    <input type="range" id="fdHarmVol" data-control="fdHarmVol" min="0" max="100" value="100">
    <span class="fd-val" id="fdHarmVal">100</span>
  </div>
  <div class="bpmrow fd-mixrow" title="the mixer: the bass level — muted is this slider at zero">
    <button class="muteBtn" id="fdBassMute" data-control="fdBassMute" aria-pressed="false">&#128266;</button>
    <span class="fd-lab2 fd-mixlab">bass</span>
    <input type="range" id="fdBassVol" data-control="fdBassVol" min="0" max="100" value="100">
    <span class="fd-val" id="fdBassVal">100</span>
  </div>
  <div class="hint info">The metronome checkbox is the click's second view — the Metronome card
  owns the clock. The mixer labels say <b>harmony</b> rather than the tetrad card's <b>chord</b>,
  deliberately: a line, an arpeggio and a block chord are all harmonic relationships, and "chord"
  is too narrow for what this app puts on the neck. The bass channel waits on child 5's fretted
  reference.</div>
  <div class="hint" id="fdHint"></div>
  <div class="fd-legend" id="fdLegend"></div>`,

  styles: `
#fieldSvg{width:100%;height:auto;display:block;outline:none;min-width:0}
.fd-wrap{display:flex;gap:12px;align-items:flex-start}
.fd-rail{flex:0 0 170px}
.fd-rail.fd-shut{flex:0 0 30px;overflow:hidden}
.fd-rail.fd-shut>*{display:none}
.fd-rail.fd-shut>.fd-railtop{display:flex}
.fd-railtop{display:flex;justify-content:flex-end;margin-bottom:2px}
#fdRailBtn{font:inherit;font-size:11px;line-height:1;padding:3px 7px;border:1px solid var(--line);
  background:#fff;border-radius:5px;cursor:pointer;color:var(--gray)}
.fd-cap{font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:#B9B9BF;
  font-weight:bold;margin:9px 0 5px}
.fd-fignote{margin-top:6px}
#fdFigIn{width:100%;font:inherit;font-size:13px;padding:5px 7px;border:1px solid var(--line);
  border-radius:6px;color:var(--ink)}
.fd-railrow{display:flex;gap:9px;align-items:center;padding:8px 2px 2px;
  border-top:1px solid var(--line);margin-top:7px;font-size:12px;color:var(--gray);flex-wrap:wrap}
.fd-railrow select{width:auto;font:inherit;font-size:12px;padding:3px 6px;
  border:1px solid var(--line);border-radius:6px;color:var(--ink)}
.fd-lab2{font-size:12px;color:var(--gray)}
.fd-pulse{display:inline-block;width:11px;height:11px;border-radius:50%;background:var(--line)}
.fd-mixrow{max-width:376px;margin-top:8px}
.fd-mixlab{width:52px}
.fd-val{font-size:13px;width:30px;text-align:right}
.fd-legend{margin-top:7px;font-size:11.5px;color:var(--gray)}
.fd-legend i{display:inline-block;width:9px;height:9px;border-radius:50%;vertical-align:-1px;
  margin-right:3px}
.fd-legend span{display:inline-block;margin-right:11px}
#fdHint{margin:8px 2px 0}
.fd-dot{cursor:pointer}
.fd-sel{cursor:pointer}
.fd-lab{font-weight:bold;pointer-events:none;user-select:none}
.fd-frame{fill:none;stroke:#73737A;stroke-width:1.6;stroke-dasharray:6 4;pointer-events:none}
.fd-brk{pointer-events:none;user-select:none}
.fd-grip{fill:var(--ink);cursor:move}
.fd-gripv{fill:#fff;stroke:var(--ink);stroke-width:1.6;cursor:ns-resize}
.fd-hit{fill:transparent}
.fd-str{cursor:pointer}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    let cfg = { key: "Bb", scale: "major", ref: 0,
      /* the boot state is v0.9's (register 11): the B♭ tetrad block on
       * 4-3-2-1, the window from the 6th (G) at the fifth position */
      strings: [4, 3, 2, 1], startDeg: 5, nearFret: 5,
      object: "tetrad", take: "one", notesPer: 1, dyad: [3, 7], bass: "none",
      /* the figure (child 3b): the address vocabulary and the user's text,
       * verbatim — every consumer parses through selection.mjs's orderBy,
       * nothing pre-digested */
      address: "pattern", figure: "",
      source: "cycle", cycle: "fourths", form: "ii-V-I", custom: "", start: 0 };
    let index = 0;                 // the étude's place — the chart line owns it
    let curB = null;            // { fld, run, pos, region, aNotes } of the last build
    let dragging = null;

    const el = (t, a, p) => {
      const e = d.createElementNS(SVGNS, t);
      for (const k in a) e.setAttribute(k, a[k]);
      if (p) p.appendChild(e);
      return e;
    };

    const build = () => {
      const fld = field({ key: cfg.key, scale: cfg.scale, ref: cfg.ref });
      const dots = deriveField(fld);
      const run = makeRun(cfg.strings);
      const anchor = Math.max(...run.strings);
      const pos = positionOf({ field: fld, anchorString: anchor,
        startDegree: cfg.startDeg, nearFret: cfg.nearFret });
      const region = regionOf(pos, run.strings);
      const aNotes = notesOn(anchor, fld);
      curB = { fld, run, pos, region, aNotes };

      const svg = byId("fieldSvg");
      svg.textContent = "";

      /* the neck — the reference's rendering */
      for (let f = 0; f <= NFRETS; f++)
        el("line", { x1: FX0 + f * FW, y1: fy(1) - 14, x2: FX0 + f * FW, y2: fy(6) + 14,
          stroke: f === 0 ? "#212126" : "#D8D8DC", "stroke-width": f === 0 ? 4 : 1.2 }, svg);
      for (const mf of [3, 5, 7, 9, 12]) {
        el("circle", { cx: FX0 + (mf - 0.5) * FW, cy: fy(6) + 26, r: 3.4, fill: "#D8D8DC" }, svg);
        if (mf === 12) el("circle", { cx: FX0 + (mf - 0.5) * FW + 10, cy: fy(6) + 26, r: 3.4, fill: "#D8D8DC" }, svg);
      }
      for (let f = 1; f <= NFRETS; f++) {           // v0.9 numbers every fret
        const tx = el("text", { x: fx(f), y: fy(1) - 22, "text-anchor": "middle",
          "font-size": "9.5", fill: "#B9B9BF" }, svg);
        tx.textContent = f;
      }
      for (let s = 1; s <= 6; s++)
        el("line", { x1: FX0 - 30, y1: fy(s), x2: FX0 + NFRETS * FW, y2: fy(s),
          stroke: "#B9B9BF", "stroke-width": s >= 4 ? 1.8 : 1.1 }, svg);

      /* the field, subdued — and honesty for a skip: an excluded string's
       * dots dim further inside the frame */
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

      /* THE SELECTION — what the controls narrowed the field to */
      const pool = materialIn(pos, run.strings, fld);
      /* THE CURRENT BAR'S CHORD (child 7): the timeline owns the place, the
       * progression owns the bars, chordAt is the ONE derivation — the
       * night-6 successor to the night-5 tonic rule, which the timeline now
       * owns as promised. THREE ABSENCES, each by name: the chord's own
       * missing slot, the key's missing tone, and the frame's. */
      const prog = progressionOf(cfg, cfg.key, cfg.scale);
      if (index >= prog.chords.length) index = 0;
      const cur = chordAt(prog, index, fld, cfg.object, cfg.dyad);
      let sel = [], selMsg = "";
      if (prog.err) selMsg = prog.err;
      if (cfg.object === "scale") {
        sel = scaleTake(pool).notes;
      } else {
        const r = cfg.take === "all"
          ? everyOccurrence(cur.tones, pool, { n: cfg.notesPer })
          : oneOfEach(cur.tones, pool, { n: cfg.notesPer, centre: pos.centre });
        sel = r.notes || [];
        const parts = [];
        if (cur.absent.length) parts.push(`${cur.symbol} has no ${cur.absent.join(" or ")}`);
        if (cur.offKey.length)
          parts.push(`the ${cur.offKey.join(" and ")} of ${cur.symbol} is not in the key — the field cannot carry it`);
        if (r.missing && r.missing.length) parts.push(`no ${r.missing.join(" or ")} in this frame`);
        if (r.unplaceable)
          parts.push(r.collide
            ? `no placement fits — the ${r.collide.roles.join(" and ")} occur only on string ${r.collide.string}`
            : "no placement fits");
        if (parts.length) selMsg = (selMsg ? selMsg + " " : "") + parts.join(". ");
      }
      /* THE REFERENCE (child 5): a real fretted note on string 5 or 6,
       * outside the isolation — v0.9's hollow dashed circle (line 919). A
       * stretch keeps full colour, unmarked (the ruling); the flag feeds the
       * hint's prose. A refusal is a reason, said in the hint BY NAME. */
      let refP = { note: null, stretch: false, reason: null };
      if (cfg.object !== "scale" && cfg.bass !== "none" && cur.degree < 0) {
        refP = { note: null, stretch: false,
          reason: `the reference is relative to the chord's degree, and ${cur.symbol}'s root is not in the key` };
      } else if (cfg.object !== "scale" && cfg.bass !== "none") {
        refP = placeReference(cfg.bass, cur.degree, fld, run.strings, pos);
        if (refP.note) {
          const rf = FAM[refP.note.deg];
          const g = el("g", { class: "fd-ref", "data-refstr": refP.note.string,
            "data-reffret": refP.note.fret, "data-refmidi": refP.note.midi,
            "data-refstretch": String(refP.stretch) }, svg);
          el("circle", { cx: fx(refP.note.fret), cy: fy(refP.note.string), r: 12, fill: "none",
            stroke: FAM_COLOR[rf], "stroke-width": 2.4, "stroke-dasharray": "3 2.5" }, g);
          const t = el("text", { x: fx(refP.note.fret), y: fy(refP.note.string) + 3.4,
            "text-anchor": "middle", "font-size": "9", fill: "#73737A", class: "fd-lab" }, g);
          t.textContent = rf;
        }
      }
      for (const x of sel) {
        const fam = FAM[x.deg];
        const g = el("g", { class: "fd-sel", "data-selmidi": x.midi,
          "data-selstr": x.string, "data-selfret": x.fret }, svg);
        el("circle", { cx: fx(x.fret), cy: fy(x.string), r: 13, fill: FAM_COLOR[fam],
          stroke: "#fff", "stroke-width": 2 }, g);
        const t = el("text", { x: fx(x.fret), y: fy(x.string) + 3.6, "text-anchor": "middle",
          "font-size": "10", fill: FAM_TEXT[fam], class: "fd-lab" }, g);
        t.textContent = x.role || fam;
      }

      /* THE FIGURE'S ORDER (child 3b): parsed against the selection itself,
       * drawn as v0.9 draws it — a dashed line through the ordered notes —
       * and exposed on the artifact as data-figorder for the gate */
      const fig = orderBy(cfg.address, cfg.figure, sel);
      if (fig.order && fig.order.length > 1)
        el("polyline", { points: fig.order.map((n) => fx(n.fret) + "," + fy(n.string)).join(" "),
          fill: "none", stroke: "#212126", "stroke-width": 1.3,
          "stroke-dasharray": "4 3", opacity: 0.45, "pointer-events": "none" }, svg);
      svg.setAttribute("data-figorder",
        fig.order ? fig.order.map((n) => n.string + "/" + n.fret).join(",") : "");

      /* THE WINDOW — one rigid dashed rectangle, with v0.9's gesture surfaces:
       * the ■ move grip at bottom-left, and the two ● edge handles */
      const ys = [fy(region.strHi) - 17, fy(region.strLo) + 17];
      const xLo = pos.fLo === 0 ? FX0 - 34 : FX0 + (pos.fLo - 1) * FW + FW * 0.28;
      const xHi = Math.min(FX0 + pos.fHi * FW - FW * 0.22, FX0 + NFRETS * FW + 9);
      el("rect", { class: "fd-frame", x: xLo, y: ys[0], width: xHi - xLo,
        height: ys[1] - ys[0], rx: 12 }, svg);
      const grip = el("rect", { class: "fd-grip", x: xLo - 7, y: ys[1] - 7, width: 14, height: 14, rx: 3 }, svg);
      const gt = el("title", {}, grip); gt.textContent = "drag: move the box, across frets and strings";
      const gripHit = el("rect", { class: "fd-hit", x: xLo - 20, y: ys[1] - 20, width: 40, height: 40 }, svg);
      const edge = (y, which) => {
        const cx = (xLo + xHi) / 2;
        const h = el("circle", { class: "fd-gripv", cx, cy: y, r: 5.5 }, svg);
        const tt = el("title", {}, h); tt.textContent = "drag: how many strings tall, from this edge";
        const hit = el("circle", { class: "fd-hit", cx, cy: y, r: 16 }, svg);
        for (const n of [h, hit]) n.addEventListener("pointerdown", (e) => startDrag(e, which));
      };
      edge(ys[0], "size-top"); edge(ys[1], "size-bottom");
      for (const n of [grip, gripHit]) n.addEventListener("pointerdown", (e) => startDrag(e, "move"));

      /* the gutter: the set squares, then the pattern-bracket column (3b's) */
      const capT = el("text", { x: STR_X, y: fy(1) - 22, "text-anchor": "middle",
        "font-size": "8.5", fill: "#B9B9BF" }, svg);
      capT.textContent = "set";
      const capB = el("text", { x: BRK_X + 10, y: fy(1) - 22, "text-anchor": "middle",
        "font-size": "8.5", fill: "#B9B9BF" }, svg);
      capB.textContent = "pattern";
      const brSteps = bracketOf(fig.order);
      const offers = offersOn(sel);
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
        /* THE ORDER BRACKET — always on. Faint before anything is typed,
         * showing the ordinals the string offers; full ink under a typed
         * pattern; greyed under tones, because there it is derived. { }
         * deliberately: [ ] is a target and ( ) an approach in the ratified
         * motion grammar. */
        if (!on) continue;
        let text2 = null, fill2 = "#D8D8DC";
        if (fig.order && brSteps[s]) {
          text2 = "{" + brSteps[s].join(",") + "}";
          fill2 = cfg.address === "pattern" ? "#212126" : "#B9B9BF";
        } else if (!fig.order && offers[s]) {
          text2 = "{" + Array.from({ length: offers[s] }, (x, i) => i + 1).join(",") + "}";
        }
        if (text2) {
          const bt = el("text", { x: BRK_X, y: fy(s) + 4, "font-size": "11.5",
            fill: fill2, "font-weight": cfg.address === "pattern" && fig.order ? "600" : "400",
            "font-family": "ui-monospace,SFMono-Regular,Menlo,monospace",
            class: "fd-brk", "data-fdbrk": s }, svg);
          bt.textContent = text2;
        }
      }

      /* the rail paints from the same build */
      for (const b of byId("fdNSeg").querySelectorAll("button")) {
        b.classList.toggle("on", +b.dataset.nps === cfg.notesPer);
        b.disabled = cfg.object === "scale";
      }
      for (const b of byId("fdAddrSeg").querySelectorAll("button"))
        b.classList.toggle("on", b.dataset.addr === cfg.address);
      byId("fdFigIn").placeholder = cfg.address === "pattern" ? "4,3,4,3,2,1" : "R-3-7-5";
      if (byId("fdFigIn").value !== cfg.figure) byId("fdFigIn").value = cfg.figure;
      const noteEl = byId("fdFigNote");
      if (fig.err) {
        noteEl.textContent = "figure: " + fig.err;
        noteEl.style.color = "#B82929"; noteEl.style.fontStyle = "normal";
      } else {
        noteEl.style.color = ""; noteEl.style.fontStyle = "";
        noteEl.textContent = cfg.address === "pattern"
          ? "A pattern is a sequence of string numbers: 4,3,4,3,2,1. Repeats walk that string's notes low → high; the bracket shows where each step lands."
          : "Tones name roles — R, 3, 5, 7. The bracket still shows the order, greyed, because it is derived rather than typed.";
      }

      const per = {};
      for (const x of sel) per[x.string] = (per[x.string] || 0) + 1;
      const shape = run.strings.map((s) => per[s] || 0).join("+");
      const isScale = cfg.object === "scale";
      const takeWord = isScale ? "the scale take"
        : `the ${cfg.object}, ${cfg.take === "all" ? "every occurrence" : "one of each"}` +
          ` (${cfg.notesPer === 1 ? "grip" : "line"})`;
      const reading = cfg.ref
        ? `${fld.refNote.name} ${fld.modeName} (the ${cfg.key} ${SCALE_WORD[cfg.scale]} collection)`
        : `${cfg.key} ${SCALE_WORD[cfg.scale] || cfg.scale}`;
      byId("fdHint").textContent =
        `${reading} — the whole field, ${dots.length} notes. ` +
        `Strings ${run.label}${run.contiguous ? "" : " (skipped)"} · ` +
        `the window from the ${ORD[pos.startDeg]} on string ${anchor}, frets ${pos.fLo}–${pos.fHi} · ` +
        `${takeWord}: ${sel.length} notes, ${shape} across the set.` +
        (fig.err ? "" : (fig.order ? ` Figure: ${fig.order.length} steps as ${cfg.address === "pattern" ? "a pattern" : "tones"}.` : "")) +
        (isScale ? " Placement is off — a scale is not a chord; the box offers every note, three per string at most (the hand's reach)."
          : (selMsg ? ` ${selMsg}.` : "")) +
        (refP.note
          ? ` Reference: string ${refP.note.string}, fret ${refP.note.fret}${refP.stretch ? " — a stretch past the box" : ""}.`
            + (!isScale && !sel.length ? " Only the reference sounds in this bar." : "")
          : (refP.reason ? ` Reference refused: ${refP.reason}.` : "")) +
        ` Click the numbers to choose strings; ← → step the window.`;
      byId("fdLegend").innerHTML = FAM.map((f2) =>
        `<span><i style="background:${FAM_COLOR[f2]}"></i>${f2}</span>`).join("")
        + `<span style="margin-left:8px">colour = function against ${cfg.ref ? "the reference tone" : "the key"}</span>`;
    };

    const push = () => {
      build();
      announce(d, CONFIG_CHANGED, { strings: [...cfg.strings],
        startDeg: cfg.startDeg, nearFret: cfg.nearFret, notesPer: cfg.notesPer,
        address: cfg.address, figure: cfg.figure });
    };

    const setStrings = (next) => {
      const fld = curB.fld;
      const moved = reanchor(curB.pos, next, fld);
      cfg = { ...cfg, strings: next, startDeg: moved.startDeg, nearFret: moved.fLo };
      push();
    };

    /* ---- v0.9's box gestures: move (frets AND strings) and edge-resize ---- */
    const svgPt = (e) => {
      const svg = byId("fieldSvg");
      const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
      return { x: vb.x + (e.clientX - r.left) / r.width * vb.width,
        y: vb.y + (e.clientY - r.top) / r.height * vb.height };
    };
    const stringAt = (y) => Math.max(1, Math.min(6, Math.round((y - SY0) / SGAP) + 1));
    const startDrag = (e, kind) => {
      e.preventDefault(); e.stopPropagation();
      const p0 = svgPt(e);
      dragging = { kind, p0, strings0: [...cfg.strings],
        i0: curB.aNotes.findIndex((n) => n.fret === curB.pos.fLo), moved: false };
    };
    d.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const p = svgPt(e);
      if (dragging.kind === "move") {
        const di = Math.round((p.x - dragging.p0.x) / FW);
        const ds = stringAt(p.y) - stringAt(dragging.p0.y);
        const aN = curB.aNotes;
        const ni = Math.max(0, Math.min(aN.length - 3, dragging.i0 + di));
        let next = { ...cfg };
        if (aN[ni].fret !== curB.pos.fLo)
          next = { ...next, startDeg: aN[ni].deg, nearFret: aN[ni].fret };
        const cand = dragging.strings0.map((s) => s + ds);
        const okStrings = ds !== 0 && !cand.some((s) => s < 1 || s > 6);
        if (next.startDeg !== cfg.startDeg || next.nearFret !== cfg.nearFret || okStrings) {
          dragging.moved = true;
          cfg = next;
          if (okStrings) { setStrings(cand); return; }
          push();
        }
      } else {
        const at = stringAt(p.y);
        const lo = Math.min(...dragging.strings0), hi = Math.max(...dragging.strings0);
        let a = lo, b = hi;
        if (dragging.kind === "size-top") a = Math.min(at, hi); else b = Math.max(at, lo);
        const run = [];
        for (let s = a; s <= b; s++) run.push(s);
        if (run.join() !== [...cfg.strings].sort((x, y) => x - y).join()) {
          dragging.moved = true;
          setStrings(run);
        }
      }
    });
    d.addEventListener("pointerup", () => { dragging = null; });

    listen(d, STEP_CHANGED, (m) => {
      if (!m || m.request === true || typeof m.index !== "number") return;
      if (m.index !== index) { index = m.index; build(); }
    });

    byId("fieldSvg").addEventListener("click", (e) => {
      const sq = e.target.closest("[data-fdstr]");
      if (sq) {
        const s = +sq.dataset.fdstr;
        const has = cfg.strings.includes(s);
        if (has && cfg.strings.length === 1) return;   // a run is never empty
        setStrings(has ? cfg.strings.filter((x) => x !== s) : [...cfg.strings, s]);
        return;
      }
      const selHit = e.target.closest("[data-selmidi]");
      const hit = selHit || e.target.closest("[data-midi]");
      if (!hit) return;
      const midi = +(selHit ? hit.dataset.selmidi : hit.dataset.midi);
      const str = +(selHit ? hit.dataset.selstr : hit.dataset.str);
      const fret = +(selHit ? hit.dataset.selfret : hit.dataset.fret);
      announce(d, NOTE, { midi });
      if (curB && str === Math.max(...curB.run.strings)) {
        cfg = { ...cfg, startDeg: curB.fld.degOf(midi), nearFret: fret };
        push();
      }
    });

    byId("fieldSvg").addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const next = step(curB.pos, e.key === "ArrowRight" ? 1 : -1, curB.fld);
        cfg = { ...cfg, startDeg: next.startDeg, nearFret: next.fLo };
        push();
        e.preventDefault();
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const dstr = e.key === "ArrowUp" ? -1 : 1;
        const cand = cfg.strings.map((s) => s + dstr);
        if (!cand.some((s) => s < 1 || s > 6)) setStrings(cand);
        e.preventDefault();
      }
    });

    for (const b of byId("fdNSeg").querySelectorAll("button"))
      b.addEventListener("click", () => { cfg = { ...cfg, notesPer: +b.dataset.nps }; push(); });
    for (const b of byId("fdAddrSeg").querySelectorAll("button"))
      b.addEventListener("click", () => { cfg = { ...cfg, address: b.dataset.addr }; push(); });
    byId("fdFigIn").addEventListener("input", (e) => { cfg = { ...cfg, figure: e.target.value }; push(); });

    byId("fdRailBtn").addEventListener("click", () => {
      const r = byId("fdRail");
      r.classList.toggle("fd-shut");
      byId("fdRailBtn").textContent = r.classList.contains("fd-shut") ? "‹" : "›";
    });

    /* ---- the transport rail and the mixer: bus views, never owners ---- */
    byId("fdMetChk").addEventListener("change", (e) =>
      announce(d, CLOCK, { click: e.target.checked }));
    listen(d, CLOCK_STATE, (m) => {
      if (m && typeof m.click === "boolean") byId("fdMetChk").checked = m.click;
    });
    let pulseT = null;
    listen(d, BEAT, () => {
      const p = byId("fdPulse");
      p.style.background = "#B82929";
      if (pulseT) d.defaultView.clearTimeout(pulseT);
      pulseT = d.defaultView.setTimeout(() => { p.style.background = ""; }, 70);
    });
    {
      const sp = byId("fdSplit");
      const fillSplits = (meter) => {
        const cur = sp.value;
        sp.textContent = "";
        for (const opt of (SPLITS[meter] || SPLITS[4] || []).map((x) => (Array.isArray(x) ? x.join("+") : String(x)))) {
          const o = d.createElement("option"); o.value = opt; o.textContent = opt;
          sp.appendChild(o);
        }
        if ([...sp.options].some((o) => o.value === cur)) sp.value = cur;
      };
      fillSplits(4);
      /* LIVE (child 7): the split is how a bar's chords take their beats —
       * announced as the parsed slots; the walk and the chart line adopt */
      sp.addEventListener("change", (e) =>
        announce(d, CONFIG_CHANGED, { split: e.target.value.split("+").map(Number) }));
      listen(d, CLOCK_STATE, (m) => {
        if (m && typeof m.meter === "number") fillSplits(m.meter);
      });
    }
    {
      const v = byId("fdVoice");
      for (const name of NOTE_VOICE_NAMES) {
        const o = d.createElement("option"); o.value = name; o.textContent = name;
        v.appendChild(o);
      }
      v.addEventListener("change", (e) => announce(d, MIXER, { voice: e.target.value }));
    }
    for (const [slId, muteId, valId, chan] of
      [["fdHarmVol", "fdHarmMute", "fdHarmVal", "chord"], ["fdBassVol", "fdBassMute", "fdBassVal", "bass"]]) {
      const sl = byId(slId), mute = byId(muteId), val = byId(valId);
      let last = 100;
      const paint = () => {
        const lvl = +sl.value;
        val.textContent = lvl;
        mute.setAttribute("aria-pressed", lvl === 0 ? "true" : "false");
        mute.textContent = lvl === 0 ? "\u{1F507}" : "\u{1F50A}";
      };
      const pushLvl = () => { paint(); announce(d, MIXER, { [chan]: +sl.value / 100 }); };
      sl.addEventListener("input", pushLvl);
      mute.addEventListener("click", () => {
        const curLvl = +sl.value;
        if (curLvl > 0) { last = curLvl; sl.value = 0; } else sl.value = last || 100;
        pushLvl();
      });
      paint();
    }

    listen(d, CONFIG_CHANGED, (m) => {
      if (!m || typeof m !== "object") return;
      let changed = false;
      for (const k of ["key", "scale", "ref", "startDeg", "nearFret", "object", "take", "notesPer", "address", "figure", "bass", "source", "cycle", "form", "custom", "start"])
        if (k in m && m[k] !== cfg[k]) { cfg = { ...cfg, [k]: m[k] }; changed = true; }
      if ("dyad" in m && Array.isArray(m.dyad) && m.dyad.join() !== cfg.dyad.join()) {
        cfg = { ...cfg, dyad: [...m.dyad] }; changed = true;
      }
      if ("strings" in m && Array.isArray(m.strings)
          && m.strings.join() !== cfg.strings.join()) {
        cfg = { ...cfg, strings: [...m.strings] };
        /* a run arriving WITHOUT its own window (a preset) RESEEDS the
         * window to v0.9's default — the first anchor-string note at or
         * above the fifth fret (v0.9 line 840's rule, re-derived) — because
         * carrying the old anchor's degree to a new anchor is a different
         * window than v0.9 frames. A run WITH startDeg (a restored étude)
         * keeps the window it was saved with. Corrected 260831 (child 4):
         * R17 kept the 6th's window on the new anchor and starved the
         * shell's 3rd where v0.9 re-frames to hold all three tones. */
        if (!("startDeg" in m) && curB) {
          const an = notesOn(Math.max(...cfg.strings), curB.fld);
          const seed = an.find((n) => n.fret >= 5) || an[an.length - 1];
          cfg = { ...cfg, startDeg: seed.deg, nearFret: seed.fret };
          push();                    // adopt-and-announce: the mirrors need the window too
          return;
        }
        changed = true;
      } else if ("setIndex" in m && !("strings" in m) && "key" in m
          && Number.isInteger(m.setIndex) && curB) {
        /* THE ALIAS: a restored pre-run identity (setIndex + key, no run),
         * translated against the enumeration it indexed. Adopt-and-announce;
         * never write setIndex back. A live shape-half message (setIndex
         * without key) deliberately does not migrate — the guard's history
         * is bite mutation 13. */
        const run = fromSetIndex(m.setIndex, STRING_SETS);
        if (run.strings.join() !== cfg.strings.join()) {
          const moved = reanchor(curB.pos, run.strings, curB.fld);
          cfg = { ...cfg, strings: run.strings, startDeg: moved.startDeg, nearFret: moved.fLo };
          push();
          return;
        }
      }
      if (changed) build();
    });

    push();
  },
};
