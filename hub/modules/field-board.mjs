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
import { diatonicTones, objectOffsets, oneOfEach, everyOccurrence, scaleTake, orderBy, bracketOf, offersOn, gripFit } from "../../engine/selection.mjs";
import { placeReference, referenceChoicesFor, centreDegreeOf, centreMaterialRef, reRead } from "../../engine/reference.mjs";
// 260917 item 5: the mode names, the one table
import { MODES } from "../../engine/field.mjs";
import { progressionOf, chordAt, movementWord } from "../../engine/progression.mjs";
import { STRING_SETS } from "../../engine/tetrad-sequence.mjs";
import { NOTE_VOICE_NAMES } from "../../engine/voices.mjs";
import { SPLITS } from "../../engine/drill.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, NOTE, MIXER, CLOCK, CLOCK_STATE, BEAT, listen, announce } from "../bus.mjs";
import { mountMini } from "../mini.mjs";
// 260917 item 1: the pick, and the ONE alias site for saved études' `dyad`
import { tonePick, pickOf } from "../../engine/selection.mjs";
// the degree palette, stated once (260918, item 2a — was a hand-copied literal here)
import { FAM_COLOR, FAM_TEXT, FAM, VIOLET, ANNOTATION_GRAY } from "../palette.mjs";

const SVGNS = "http://www.w3.org/2000/svg";
/* the reference's neck geometry, verbatim; the viewBox is 120 wider to seat
 * the set squares AND the pattern-bracket gutter, as v0.9 draws them */
const NFRETS = 15, FX0 = 46, FW = 71, SY0 = 34, SGAP = 34;
const STR_X = FX0 + NFRETS * FW + 42;
const BRK_X = FX0 + NFRETS * FW + 76;
const fx = (f) => (f === 0 ? FX0 - 22 : FX0 + (f - 0.5) * FW);
const fy = (str) => SY0 + (str - 1) * SGAP;


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
      throw new Error("field-board: a derived dot is off the field or off the neck — the field's " +
        "dots are members; an off-field dot is drawn only as a role-carrying approach from the " +
        "figure's order (CR-1 §3), and this one carries " + (d.role ? `the role "${d.role}"` : "no role"));
  return dots;
}

export const fieldBoard = {
  id: "field-board",
  layer: "surface",
  requires: { field: true },
  mount_point: "boards",
  order: 18,
  controls: ["fieldSvg", "fdNSeg", "fdMoveSeg", "fdAddrSeg", "fdFigIn", "fdMetChk", "fdSplit",
    "fdVoice", "fdHarmVol", "fdHarmMute", "fdBassVol", "fdBassMute", "fdRailBtn",
    "fdAllTones", "fdBpm", "fdBass2", "fdMini", "fdRepeat", "fdMode"],

  markup: `
  <div class="bh"><span>On the neck</span></div>
  <div class="fd-wrap">
    <svg id="fieldSvg" data-control="fieldSvg" viewBox="0 0 1280 260" tabindex="0"
      aria-label="the neck — the field, the window, the string set, and the selection"></svg>
    <div class="fd-rail" id="fdRail">
      <div class="fd-railtop"><button id="fdRailBtn" data-control="fdRailBtn"
        title="collapse this rail">›</button></div>
      <div class="fd-cap">Placement</div>
      <!-- TAKE LIVES HERE NOW (260913, item 1 — D8): "every occurrence in
           the box" is unstatable without the neck, so the control sits
           beside the box's other two deciders. Unchecked = take "one",
           checked = take "all"; the VALUE is unchanged, only the seat and
           the label moved. -->
      <div class="fd-placerow">
        <div class="seg" id="fdNSeg" data-control="fdNSeg">
          <button data-nps="1" class="on" title="one note per string — only what can sound together">Grip</button>
          <button data-nps="3" title="up to three on a string — thirds on one string, lines through the chord">Line</button>
        </div>
        <label class="chk fd-alltones" id="fdAllTonesLab"
          title="every occurrence in the box — off, one of each tone"><input
          type="checkbox" id="fdAllTones" data-control="fdAllTones"> all tones</label>
      </div>
      <div class="fd-cap">Movement</div>
      <div class="seg" id="fdMoveSeg" data-control="fdMoveSeg">
        <!-- strum / arpeggiate (260913, the PO's ruling): a block IS a
             strum (note-events has always staggered it), so the movement
             wears the truer word; the old engine strum flag (the harmony
             bed) was renamed bed in the same pass -->
        <button data-move="strum" class="on"
          title="the notes sound together — a chord">strum</button>
        <button data-move="arpeggiate"
          title="the notes sound in sequence, low to high across the bar">arpeggiate</button>
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
  <!-- THE CONTROLS UNDER THE NECK (260913, item 3 — the wireframe's block):
       rows left, mixer right. bpm is the clock's SECOND VIEW (the metronome
       checkbox's own idiom — the Metronome card stays the owner); the bass /
       reference select is Harmony's second view, seated by the mixer it
       drives. The ⏮ ▶ ⏹ ⏭ cluster is the family mini — a view that asks,
       never a timer. -->
  <!-- EACH SLIDER BESIDE THE THING IT GOVERNS (260913 finding — the
       dispatch had drawn a floating right column; the PO's words were an
       ASSOCIATION: harmony tracks voice/tone, bass tracks the reference.
       Row 2 pairs voice with the harmony slider; row 3 pairs the
       reference with the bass slider. Layout only — the tracking
       semantics are the 260906 pins', untouched. -->
  <div class="fd-underneck">
    <div class="fd-railrow">
      <label class="chk" title="the click — one state, two views; the Metronome card's Sound is the other"><input type="checkbox" id="fdMetChk" data-control="fdMetChk"> metronome</label>
      <span class="fd-pulse" id="fdPulse"></span>
      <span class="fd-lab2">bar split</span>
      <select id="fdSplit" data-control="fdSplit"
        title="the bar split — a bar's chords take these slots in order"></select>
      <span class="fd-lab2">bpm</span>
      <input type="number" id="fdBpm" data-control="fdBpm" min="15" max="300" step="1"
        title="the tempo — one state, two views; the Metronome card owns the clock">
      <span class="mini fd-undermini" id="fdMini" data-control="fdMini"></span>
      <button id="fdRepeat" data-control="fdRepeat" aria-pressed="false"
        title="repeat the current bar until this is turned off — clicking another chip follows, and the loop repeats the new bar">&#128257; repeat</button>
      <!-- THE HARMONIC READOUT (260918, item 2 — Daniel's mockup): the one
           line that says what you are looking at — THE CHORD AND ITS MODE,
           "Bbmaj7 — Bb Ionian" — boxed, larger, bold, right of Repeat and
           above the sliders it shares a column with. It speaks for EVERY
           object now: the chord name is the strip's own (chordAt.symbol),
           the mode the one table's (MODES); nothing new is computed —
           night 22's item 5 withheld the mode outside Scale-or-mode, and
           un-gating it is the behaviour change register 33 records. -->
      <div class="fd-readbox" id="fdMode" data-control="fdMode"
        title="this bar's chord, and the mode it is in the context of the chosen scale"></div>
    </div>
    <div class="fd-railrow fd-pairrow">
      <span class="fd-lab2">voice</span>
      <select id="fdVoice" data-control="fdVoice"></select>
      <div class="bpmrow fd-mixrow" title="the mixer: the harmony level — muted is this slider at zero">
        <button class="muteBtn" id="fdHarmMute" data-control="fdHarmMute" aria-pressed="false">&#128266;</button>
        <span class="fd-lab2 fd-mixlab">harmony</span>
        <input type="range" id="fdHarmVol" data-control="fdHarmVol" min="0" max="100" value="100">
        <span class="fd-val" id="fdHarmVal">100</span>
      </div>
    </div>
    <div class="fd-railrow fd-pairrow">
      <span class="fd-lab2">Bass / reference tone</span>
      <select id="fdBass2" data-control="fdBass2"
        title="the reference under the harmony — one state, two views; Harmony's select is the other"></select>
      <div class="bpmrow fd-mixrow" title="the mixer: the bass level — muted is this slider at zero">
        <button class="muteBtn" id="fdBassMute" data-control="fdBassMute" aria-pressed="false">&#128266;</button>
        <span class="fd-lab2 fd-mixlab">bass</span>
        <input type="range" id="fdBassVol" data-control="fdBassVol" min="0" max="100" value="100">
        <span class="fd-val" id="fdBassVal">100</span>
      </div>
    </div>
  </div>
  <div class="hint info">The metronome checkbox is the click's second view — the Metronome card
  owns the clock. The mixer labels say <b>harmony</b> rather than the tetrad card's <b>chord</b>,
  deliberately: a line, an arpeggio and a block chord are all harmonic relationships, and "chord"
  is too narrow for what this app puts on the neck. <b>Bass tone:</b> the root by default; any
  tone the object holds may sit in the bass instead; <b>a 3rd below</b> or <b>a 5th below</b> place a
  scale tone beneath the chord — a triad over a 3rd below is a seventh chord, and the readout
  names what the stack becomes over it. <b>Mode:</b> under Scale or mode, the line beside
  <b>voice</b> names the mode each passing chord is, in the context of the chosen scale.</div>
  <div class="hint" id="fdHint"></div>
  <div class="fd-legend" id="fdLegend"></div>`,

  styles: `
#fieldSvg{width:100%;height:auto;display:block;outline:none;min-width:0}
.fd-wrap{display:flex;gap:12px;align-items:flex-start}
.fd-rail{flex:0 0 170px}
.fd-rail.fd-shut{flex:0 0 30px;overflow:hidden}
.fd-rail.fd-shut>*{display:none}
.fd-rail.fd-shut>.fd-railtop{display:flex}
/* the segs are scoped by id (the shell's .seg chrome is unreachable), and an id
   out-ranks the class-only shut rule — the fold must out-rank the ids in turn,
   or the buttons paint on, clipped mid-glyph in the 30px strip (260909, item 1) */
#fdRail.fd-shut>.fd-cap,#fdRail.fd-shut>.seg,#fdRail.fd-shut>.hint,
#fdRail.fd-shut>#fdFigIn{display:none}
.fd-railtop{display:flex;justify-content:flex-end;margin-bottom:2px}
#fdRailBtn{font:inherit;font-size:11px;line-height:1;padding:3px 7px;border:1px solid var(--line);
  background:#fff;border-radius:5px;cursor:pointer;color:var(--gray)}
.fd-placerow{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.fd-alltones{font-size:12.5px;color:var(--ink);white-space:nowrap;cursor:pointer}
.fd-alltones input{vertical-align:-1px}
.fd-cap{font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:#B9B9BF;
  font-weight:bold;margin:9px 0 5px}
.fd-fignote{margin-top:6px}
#fdFigIn{width:100%;font:inherit;font-size:13px;padding:5px 7px;border:1px solid var(--line);
  border-radius:6px;color:var(--ink)}
.fd-underneck{display:block}
.fd-pairrow{justify-content:flex-start}
.fd-pairrow .fd-mixrow{margin-left:auto;flex:0 1 380px}
#fdBpm{font:inherit;font-size:12.5px;width:58px;padding:3px 5px;border:1px solid var(--line);
  border-radius:6px;color:var(--ink)}
.fd-undermini{display:inline-flex;gap:4px;margin-left:6px}
.fd-undermini button{font:inherit;font-size:11px;padding:2px 8px;border:1px solid var(--line);
  border-radius:6px;background:#fff;cursor:pointer;color:var(--ink);line-height:1.5}
.fd-undermini button:hover{border-color:var(--ink)}
#fdRepeat{font:inherit;font-size:11px;padding:2px 9px;border:1px solid var(--line);
  border-radius:6px;background:#fff;cursor:pointer;color:var(--ink);line-height:1.5;margin-left:2px}
#fdRepeat:hover{border-color:var(--ink)}
#fdBass2{font:inherit;font-size:12px;padding:3px 6px;max-width:260px}
.fd-railrow{display:flex;gap:9px;align-items:center;padding:8px 2px 2px;
  border-top:1px solid var(--line);margin-top:7px;font-size:12px;color:var(--gray);flex-wrap:wrap}
.fd-railrow select{width:auto;font:inherit;font-size:12px;padding:3px 6px;
  border:1px solid var(--line);border-radius:6px;color:var(--ink)}
.fd-lab2{font-size:12px;color:var(--gray)}
/* THE HARMONIC READOUT (260918, item 2): boxed, larger, bold — right of
 * Repeat, sharing the mixer's column (margin-left:auto, the same 380px
 * basis) so it sits ABOVE the harmony and bass sliders. Card edge, not
 * control edge (--edge for boxes, v0.9's own distinction). */
.fd-readbox{margin-left:auto;flex:0 1 380px;max-width:376px;min-width:0;
  border:1px solid var(--edge);border-radius:8px;background:#fff;padding:5px 12px;
  font-size:15px;font-weight:bold;color:var(--ink);white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis;text-align:center}
/* VARIANT (b), 260918 (night 24, item 2 — correcting night 23's (a), which
 * coloured EVERY chord name in R's red, a function most chords do not have):
 * the chord's ROOT DEGREE is a filled dot beside the name — the legend's own
 * mark — and the name stays ink. Golden rule 8: the palette encodes function
 * and nothing else; four of its seven colours cannot carry text, which is
 * why the dot exists. Text red now means exactly one thing: the key. */
.fd-readbox .fd-readchord{color:var(--ink)}
.fd-readbox .fd-readdot{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:7px;vertical-align:-1px}
.fd-readbox .fd-readmode{font-weight:600}
.fd-pulse{display:inline-block;width:11px;height:11px;border-radius:50%;background:var(--line)}
.fd-mixrow{max-width:376px;margin-top:8px}
.fd-mixlab{width:52px}
.fd-val{font-size:13px;width:30px;text-align:right}
.fd-legend{margin-top:7px;font-size:11.5px;color:var(--gray)}
.fd-legend i{display:inline-block;width:9px;height:9px;border-radius:50%;vertical-align:-1px;
  margin-right:3px}
.fd-legend span{display:inline-block;margin-right:11px}
#fdHint{margin:8px 2px 0}
/* the seg's visual grammar, scoped to this module's own markup (260905):
 * the shell defines these rules in its STRIPS chrome block, which this
 * door's lock never mounts — so the .on state was applied and invisible.
 * Same facts, this module's own selectors (the minis' idiom); the shell
 * stays untouched. */
#fdNSeg,#fdMoveSeg,#fdAddrSeg{display:flex;flex-wrap:wrap;gap:6px}
#fdNSeg button,#fdMoveSeg button,#fdAddrSeg button{font:inherit;font-size:12.5px;padding:5px 9px;
  border:1px solid var(--line);border-radius:6px;background:#fff;cursor:pointer;color:var(--ink)}
#fdNSeg button.on,#fdMoveSeg button.on,#fdAddrSeg button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
#fdNSeg button:disabled,#fdMoveSeg button:disabled,#fdAddrSeg button:disabled{opacity:.45;cursor:not-allowed}
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
       * 4-3-2-1. The WINDOW moved 260904: the 5th (F) at the third
       * position, frets 3-7 — the only window family on this string set that
       * keeps the ruled B-flat block (register 11 — the same four notes) AND
       * places every bar of the boot cycle; the old 6th-at-the-fifth window
       * refused E-flat maj7 at bar 2, teaching refusal first. Chosen by the
       * boot-placement pin's search, not by taste. */
      strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,
      object: "tetrad", take: "one", notesPer: 1, tones: [1, 3, 5, 7], bass: "root",
      /* THE MOVEMENT (260905, Daniel's model correction: "The Take field in
       * Harmony is doing movement (partial) duty here which it shouldn't
       * be."). Take is MATERIAL — which notes exist (one of each · every
       * occurrence) — and lives in Harmony. Movement — together or in
       * sequence — lives HERE with Placement and The Figure, where the
       * motion lives: block · arpeggio, his two words. A typed figure still
       * sequences regardless (the night-7 ruling, now in its proper home). */
      movement: "strum", repeat: false, centreSrc: "fixed",
      /* the figure (child 3b): the address vocabulary and the user's text,
       * verbatim — every consumer parses through selection.mjs's orderBy,
       * nothing pre-digested */
      address: "pattern", figure: "",
      source: "cycle", cycle: "fourths", form: "ii-V-I", custom: "", start: 0 };
    let index = 0;                 // the étude's place — the chart line owns it
    let curB = null;            // { fld, run, pos, region, aNotes } of the last build
    let dragging = null;
    let pulseTimers = [];       // the sounding-note pulse (260905, item 5)
    /* livePulses — the keys' 260911 idiom, copied here 260913b (the ruled
     * latent twin): a ring's LIFETIME BELONGS TO THE NOTE, not to the DOM
     * that displays it. Every sounded note keeps { midi, until }; build()
     * re-rings survivors on the fresh dots for their REMAINING life. This
     * subsumes the 260909 pending case (a pulse with no dot yet is a
     * survivor that finds one at the next build) and closes the wipe race
     * (a ring born just before a shared-pitch rebuild died young). */
    let livePulses = [];        // { midi, until }

    const el = (t, a, p) => {
      const e = d.createElementNS(SVGNS, t);
      for (const k in a) e.setAttribute(k, a[k]);
      if (p) p.appendChild(e);
      return e;
    };

    const build = () => {
      /* the centre's SOURCE (260914): material on centreMaterialRef — the
       * window never jumps per bar; the reading shifts per bar */
      const fld = field({ key: cfg.key, scale: cfg.scale,
        ref: cfg.object === "scale" ? centreMaterialRef(cfg.centreSrc, cfg.ref) : cfg.ref });
      const dots = deriveField(fld);
      const run = makeRun(cfg.strings);
      const anchor = Math.max(...run.strings);
      const pos = positionOf({ field: fld, anchorString: anchor,
        startDegree: cfg.startDeg, nearFret: cfg.nearFret, strings: run.strings });
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
      const cur = chordAt(prog, index, fld, cfg.object, pickOf(cfg));
      let sel = [], selMsg = "";
      if (prog.err) selMsg = prog.err;
      const fdRefDeg = cfg.object === "scale"
        ? centreDegreeOf(cfg.centreSrc, cfg.ref, cur.degree)
        : cur.degree;
      if (cfg.object === "scale") {
        sel = scaleTake(pool).notes;
        if (cfg.centreSrc === "follows") {
          if (fdRefDeg != null) sel = reRead(sel, fdRefDeg);
          else selMsg = `the centre cannot follow ${cur.symbol} — its root is not in the key`;
        }
      } else {
        /* the named drop (260914, item 3): the kept stack sounds and draws;
         * the dropped roles are SAID two lines below */
        const fdFit = cfg.take === "all" ? { tones: cur.tones, dropped: [] }
          : gripFit(cur.tones, run.strings.length * cfg.notesPer);
        const r = cfg.take === "all"
          ? everyOccurrence(cur.tones, pool, { n: cfg.notesPer })
          : oneOfEach(fdFit.tones, pool, { n: cfg.notesPer, centre: pos.centre });
        sel = r.notes || [];
        const parts = [];
        if (fdFit.dropped.length)
          parts.push(`the ${fdFit.dropped.join(", ")} dropped by the grip rule — `
            + `${run.strings.length * cfg.notesPer} slots carry `
            + fdFit.tones.map((t) => t.role).join(" "));
        if (fdFit.refuse) parts.push(fdFit.refuse);
        if (cur.unnamed) parts.push(cur.unnamed);
        if (cur.absent.length) parts.push(`${cur.symbol} has no ${cur.absent.join(" or ")}`);
        if (r.capped && r.capped.length) {
          const lineWord = byId("fdNSeg").querySelector('button[data-nps="3"]').textContent.trim();
          parts.push(`the ${r.capped.join(" and ")} is in the box but the grip cannot carry it`
            + (r.resolvesAt != null && r.resolvesAt <= 3 ? ` — ${lineWord} shows it` : ""));
        }
        if (cur.offKey.length)
          parts.push(`the ${cur.offKey.join(" and ")} of ${cur.symbol} is not in the key — the field cannot carry it`);
        if (r.missing && r.missing.length) parts.push(`no ${r.missing.join(" or ")} in this frame`);
        if (r.unplaceable) {
          /* THE ESCAPE (260908): derived by the engine (resolvesAt — the
           * smallest cap that places), worded by this module's own control:
           * the label on the raised-cap button IS the app's word for it. */
          const lineWord = byId("fdNSeg").querySelector('button[data-nps="3"]').textContent.trim();
          const esc = r.resolvesAt != null && r.resolvesAt <= 3
            ? ` — ${lineWord} takes ${r.collide ? "both" : "them"}`
            : " — and no per-string ceiling resolves it";
          parts.push((r.collide
            ? `no placement fits — the ${r.collide.roles.join(" and ")} occur only on string ${r.collide.string}`
            : "no placement fits") + esc);
        }
        if (parts.length) selMsg = (selMsg ? selMsg + " " : "") + parts.join(". ");
      }
      /* THE REFUSAL ON THE NECK (260908, 2b — Daniel's finding about his own
       * finding: the reason printed in the readout and he still reported
       * "no chords displayed", because he was looking at the NECK. An
       * absence about the neck belongs on the neck, where the dots would
       * have been.) Drawn inside the window's own box, split at the em-dash
       * so the collide and the escape read as two lines. */
      if (cfg.object !== "scale" && !sel.length && selMsg) {
        const ry = (fy(Math.min(...run.strings)) + fy(Math.max(...run.strings))) / 2;
        const rx = (fx(pos.fLo) + fx(pos.fHi)) / 2;
        const linesTxt = selMsg.split(" — ");
        const rt = el("text", { class: "fd-refusal", x: rx, y: ry - (linesTxt.length - 1) * 8,
          "text-anchor": "middle", "font-size": "12.5", "font-weight": "bold",
          fill: "#B82929" }, svg);
        linesTxt.forEach((ln, li) => {
          const ts = el("tspan", { x: rx, dy: li === 0 ? 0 : 16 }, rt);
          ts.textContent = li === 0 ? ln : "— " + ln;
        });
      }

      /* THE REFERENCE (child 5): a real fretted note on string 5 or 6,
       * outside the isolation — v0.9's hollow dashed circle (line 919). A
       * stretch keeps full colour, unmarked (the ruling); the flag feeds the
       * hint's prose. A refusal is a reason, said in the hint BY NAME. */
      let refP = { note: null, stretch: false, reason: null };
      /* the centre's reference draws exactly as the chord's does (4a) */
      if (cfg.object !== "scale" && cfg.bass !== "none" && cur.degree < 0) {
        refP = { note: null, stretch: false,
          reason: `the reference is relative to the chord's degree, and ${cur.symbol}'s root is not in the key` };
      } else if (cfg.bass !== "none" && fdRefDeg != null) {
        refP = placeReference(cfg.bass, fdRefDeg, fld, run.strings, pos, pickOf(cfg));
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
      /* THE FIGURE, resolved here — before the selection dots — because §2.6's
       * slur is drawn UNDER the dots (the under-draw convention) */
      const fig = orderBy(cfg.address, cfg.figure, sel, { fld, strings: run.strings });
      const approaches = (fig.order || []).filter((n) => n.role === "approach");
      /* §2.6 "Connection. An approach figure joins its target with a slur in
       * annotation gray (0.45, 0.45, 0.48), line 1.2, drawn UNDER the dots" */
      for (const ap of approaches) {
        const x1 = fx(ap.fret), y1 = fy(ap.string), x2 = fx(ap.target.fret), y2 = fy(ap.target.string);
        const bulge = Math.max(10, Math.abs(x2 - x1) * 0.25);
        el("path", { class: "fd-slur", "data-role": "slur",
          d: `M${x1},${y1} Q${(x1 + x2) / 2},${Math.min(y1, y2) - bulge} ${x2},${y2}`,
          fill: "none", stroke: ANNOTATION_GRAY, "stroke-width": 1.2, "pointer-events": "none" }, svg);
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

      /* THE APPROACH MARK (260918, night 24 — CR-1 ruled it; Design Spec §2.6
       * specifies it, every clause quoted here so the mark is the Spec's and
       * not a design):
       *   "Role is weight, never color. … Approach tones draw at 0.6 of the
       *    host marker's radius, hollow — the color becomes the stroke on an
       *    unfilled mark, with stroke weight scaling from the marker."
       *      → r 13 × 0.6 = 7.8, fill none, the colour as the stroke; the host
       *        dot's stroke is 2, scaled 0.6 → 1.2 … tuned to 1.6 at render
       *        inspection ("the ratio is law; the exact value may be tuned").
       *   "Function is still color. A diatonic approach tone is a scale
       *    degree and keeps its §2.1 color. A chromatic approach tone — pitch
       *    class outside the current scale — takes violet #7847A8."
       *      → chromatic ? VIOLET : FAM_COLOR[its degree], from the one palette.
       *   "No new ring." → none; the sounding pulse is not a role mark.
       *   "No interval label." → no text on the mark.
       *   "Role marks derive from the note event's role" → from the order's
       *    entries, which carry role/target/chromatic — never assigned here.
       * WHEN (CR-1 §2): persistently while the figure is live; data-selmidi
       * lets the ordinary sounding pulse ring it when it sounds. */
      for (const ap of approaches) {
        const stroke = ap.chromatic ? VIOLET : FAM_COLOR[FAM[ap.deg]];
        const g = el("g", { class: "fd-sel fd-appr", "data-selmidi": ap.midi, "data-role": "approach",
          "data-selstr": ap.string, "data-selfret": ap.fret,
          "data-chromatic": String(ap.chromatic), "data-deg": ap.chromatic ? "" : FAM[ap.deg] }, svg);
        el("circle", { cx: fx(ap.fret), cy: fy(ap.string), r: 13 * 0.6, fill: "none",
          stroke, "stroke-width": 1.6 }, g);
      }
      /* THE FIGURE'S ORDER (child 3b): parsed against the selection itself,
       * drawn as v0.9 draws it — a dashed line through the ordered notes —
       * and exposed on the artifact as data-figorder for the gate */
      if (fig.order && fig.order.length > 1)
        el("polyline", { points: fig.order.map((n) => fx(n.fret) + "," + fy(n.string)).join(" "),
          fill: "none", stroke: "#212126", "stroke-width": 1.3,
          "stroke-dasharray": "4 3", opacity: 0.45, "pointer-events": "none" }, svg);
      /* THE SOUNDING-NOTE PULSE LAYER (260905, item 5 — the family idiom
       * from fretboard-stage: "what you see pulsing is what you hear").
       * Inherited by listening to NOTE — the walk times its announcements,
       * so arrival IS sounding time; the stage schedules its own because it
       * hears ATTACK instead. Same ring: r 19, ink, 2.4, gone in 320ms. */
      el("g", { class: "fd-pulselayer" }, svg);
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
      /* the all-tones checkbox: the same scale coupling as Placement, the
       * same precedent — disabled with the reason ON ITS OWN LABEL */
      {
        const at = byId("fdAllTones"), atLab = byId("fdAllTonesLab");
        at.checked = cfg.take === "all";
        at.disabled = cfg.object === "scale";
        /* state styling inline (the fignote idiom) — a state class here
         * would orphan the lock's CSS check in the states it never visits */
        atLab.style.opacity = cfg.object === "scale" ? "0.45" : "";
        atLab.style.cursor = cfg.object === "scale" ? "not-allowed" : "";
        atLab.lastChild.textContent = cfg.object === "scale"
          ? " all tones — a scale takes the whole box" : " all tones";
      }
      /* the repeat toggle paints from the same build — pressed state
       * styled inline (the orphan-check dodge, tonight's established one) */
      {
        const rb = byId("fdRepeat");
        rb.setAttribute("aria-pressed", cfg.repeat ? "true" : "false");
        rb.style.background = cfg.repeat ? "var(--ink)" : "";
        rb.style.color = cfg.repeat ? "#fff" : "";
        rb.style.borderColor = cfg.repeat ? "var(--ink)" : "";
      }
      /* THE MODE LINE (260917, item 5): under a scale, this bar's chord
       * degree names its mode from the one table; a root off the key says so;
       * a chord object leaves the line empty (the display is the scale's) */
      {
        /* ALWAYS (260918, item 2 — register 33): the chord and its mode, for
         * every object. VARIANT (b), night 24: the root's DEGREE DOT beside
         * the name, from the one palette, keyed to the chord's actual degree
         * — derived from chordAt.degree, never assigned. Ink text. */
        const ml = byId("fdMode");
        ml.textContent = "";
        if (cur.degree >= 0) {
          const dot = d.createElement("i"); dot.className = "fd-readdot";
          dot.setAttribute("data-role", "degree-dot"); dot.setAttribute("data-deg", FAM[cur.degree]);
          dot.style.background = FAM_COLOR[FAM[cur.degree]]; ml.appendChild(dot);
        }
        const ch = d.createElement("b"); ch.className = "fd-readchord"; ch.textContent = cur.symbol;
        const md = d.createElement("span"); md.className = "fd-readmode";
        md.textContent = cur.degree >= 0
          ? ` — ${fld.notes[cur.degree].name} ${MODES[cfg.scale][cur.degree]}`
          : " — not in the key";
        ml.appendChild(ch); ml.appendChild(md);
      }
      /* the bass view paints from the same build — Harmony's state, echoed.
       * ITS OPTIONS DERIVE FROM THE PICK (260917, item 3): the root, then
       * the tones the object actually holds, then the two relative options
       * (kept, explained in the popout); refilled only when the offered set
       * changes. A standing bass the pick no longer holds is kept VISIBLE as
       * a disabled option (CC-1: never switched under the player) and the
       * neck says why it is silent (placeReference's own refusal). */
      {
        const b2 = byId("fdBass2");
        const offered = referenceChoicesFor(pickOf(cfg));
        const have = [...b2.options].map((o) => o.value);
        const want = offered.map(([v]) => v);
        if (want.join() !== have.join() || (!want.includes(cfg.bass) && ![...b2.options].some((o) => o.value === cfg.bass && o.disabled))) {
          b2.textContent = "";
          for (const [v, l] of offered) {
            const o = d.createElement("option"); o.value = v; o.textContent = l;
            b2.appendChild(o);
          }
          if (!want.includes(cfg.bass) && cfg.bass) {
            const o = d.createElement("option"); o.value = cfg.bass; o.disabled = true;
            o.textContent = `${cfg.bass.replace(/^tone:/, "the ") + (cfg.bass.startsWith("tone:") ? " in the bass" : "")} — not among the chosen tones`;
            b2.appendChild(o);
          }
        }
        if (b2.value !== cfg.bass) b2.value = cfg.bass;
        b2.disabled = false;   // 4a: live in scale mode too — the centre works
        b2.title = cfg.object === "scale"
          ? "the reference under the mode — placed against the CENTRE chosen in Harmony"
          : "the reference under the harmony — one state, two views; Harmony's select is the other";
      }
      /* THE OVERRIDE IS LOUD (260909, item 3; register 20): "a typed figure
       * sequences, whatever the Take" (260901) stands — but it must not stand
       * SILENTLY over a raised `block`. While a figure rules, block is
       * disabled with the reason on its label; clearing the figure restores
       * it. Movement is never auto-switched — the player's setting waits.
       * The scale-disables-Placement precedent, applied to the third
       * coupling class Daniel caught. */
      /* 4b (260913b): a figure rules under a SCALE too — the tones now
       * address degrees from the centre, so the override law applies
       * unchanged wherever an order resolves */
      const figRules = !fig.err && !!(fig.order && fig.order.length);
      for (const b of byId("fdMoveSeg").querySelectorAll("button")) {
        b.classList.toggle("on", b.dataset.move === cfg.movement);
        if (!b.dataset.title0) b.dataset.title0 = b.title;
        const overridden = figRules && b.dataset.move === "strum";
        /* 4c: movement comes back once a figure resolves — a scale with no
         * figure is a run (nothing to move); with one, the override law
         * governs exactly as under a chord */
        b.disabled = (cfg.object === "scale" && !figRules) || overridden;
        b.title = overridden
          ? "the typed figure sequences — clear the Figure to sound the chord as one"
          : b.dataset.title0;
      }
      const moveCap = byId("fdMoveSeg").previousElementSibling;
      if (moveCap) moveCap.textContent = figRules
        ? "Movement — the figure sequences"
        : (cfg.object === "scale" ? "Movement — a scale is a run until a figure says otherwise"
                                  : "Movement");
      /* 4e: Placement's reason moves ON TO ITS OWN CAP — the all-tones
       * precedent; it was only in the hint's prose before */
      const placeCap = byId("fdNSeg").parentElement.previousElementSibling;
      if (placeCap) placeCap.textContent = cfg.object === "scale"
        ? "Placement — a scale is not a chord" : "Placement";
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
        noteEl.textContent = fig.describe
          ? fig.describe + (approaches.some((a2) => a2.chromatic) ? " Chromatic approaches wear violet — outside the key; diatonic ones keep their degree colour." : "")
          : cfg.address === "pattern"
          ? "A pattern is a sequence of string numbers: 4,3,4,3,2,1. Repeats walk that string's notes low → high; the bracket shows where each step lands."
          : "Tones name roles — R, 3, 5, 7; under a scale they are degrees from the CENTRE, and 9, 11, 13 reach the extensions. The bracket still shows the order, greyed, because it is derived rather than typed.";
      }

      const per = {};
      for (const x of sel) per[x.string] = (per[x.string] || 0) + 1;
      const shape = run.strings.map((s) => per[s] || 0).join("+");
      const isScale = cfg.object === "scale";
      const takeWord = isScale ? "the scale take"
        : `the ${cfg.object}, ${cfg.take === "all"
            ? (cfg.notesPer === 1 ? "every occurrence the grip allows" : "every occurrence")
            : "one of each"}` +
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
        (followMsg && followMsg.sd === cfg.startDeg && followMsg.nf === cfg.nearFret
          ? ` ${followMsg.text}.` : "") +
        (refP.note
          ? ` Reference: string ${refP.note.string}, fret ${refP.note.fret}${refP.stretch ? " — a stretch past the box" : ""}.`
            + (!isScale && !sel.length
              ? " The reference is drawn but stays silent — nothing sits on top of it."
              : "")
          : (refP.reason ? ` Reference refused: ${refP.reason}.` : "")) +
        ` Click the numbers to choose strings; ← → step the window.`;
      byId("fdLegend").innerHTML = FAM.map((f2) =>
        `<span><i style="background:${FAM_COLOR[f2]}"></i>${f2}</span>`).join("")
        + `<span style="margin-left:8px">colour = function against ${cfg.ref ? "the reference tone" : "the key"}</span>`;
      /* every living pulse re-rings on the fresh dots, for what is left
       * of its 320ms — survivors of the wipe and first-notes alike */
      const now = d.defaultView.performance.now();
      livePulses = livePulses.filter((p2) => p2.until > now);
      for (const p2 of livePulses) ringFor(p2.midi, p2.until - now);
    };

    const push = () => {
      build();
      announce(d, CONFIG_CHANGED, { strings: [...cfg.strings],
        startDeg: cfg.startDeg, nearFret: cfg.nearFret, notesPer: cfg.notesPer,
        address: cfg.address, figure: cfg.figure, movement: cfg.movement,
        take: cfg.take, repeat: cfg.repeat });
    };

    let followMsg = null;   // the named forced follow (260911, item 6) — one build's worth
    const setStrings = (next) => {
      const fld = curB.fld;
      const before = curB.pos;
      const moved = reanchor(before, next, fld);
      /* A FORCED RE-DERIVATION IS NAMED (260911, item 6): the translation
       * law keeps the DEGREE (ratified 260828 #4) — and when that degree's
       * nearest home on the new anchor is far from where the box sat, the
       * window follows it. Lawful, but it reads as a wormhole unless the
       * face says what happened. Named when the window moves further than
       * its own span. */
      /* keyed to the state it produced — the sentence stands exactly as
       * long as the followed window does, and clears itself with it */
      followMsg = Math.abs(moved.fLo - before.fLo) > (before.fHi - before.fLo)
        ? { text: `the window followed the ${ORD[moved.startDeg]} to fret ${moved.frets[1]} on string ${Math.max(...next)}`,
            sd: moved.startDeg, nf: moved.fLo }
        : null;
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
        /* the clamp keeps the anchor triple on the string — ITS OWN length,
         * never a hand-held 3 (260911, item 6; the twelfth-plus instance) */
        const ni = Math.max(0, Math.min(aN.length - curB.pos.frets.length, dragging.i0 + di));
        let next = { ...cfg };
        if (aN[ni].fret !== curB.pos.fLo)
          next = { ...next, startDeg: aN[ni].deg, nearFret: aN[ni].fret };
        const cand = dragging.strings0.map((s) => s + ds);
        const okStrings = ds !== 0 && !cand.some((s) => s < 1 || s > 6);
        if (next.startDeg !== cfg.startDeg || next.nearFret !== cfg.nearFret || okStrings) {
          dragging.moved = true;
          cfg = next;
          if (okStrings) {
            setStrings(cand);
            /* RE-BASE THE WHOLE DRAG (260911, item 6 — measured: the stale
             * index landed a repeated gesture in a THIRD place): a commit
             * rebuilt the box, so i0, p0 AND strings0 all restart against
             * the rebuilt state — the old asymmetry (strings0 frozen, i0
             * live against a moved basis) is resolved the deliberate way:
             * everything re-bases together, and each later move is measured
             * from the last committed box. */
            dragging.i0 = curB.aNotes.findIndex((n) => n.fret === curB.pos.fLo);
            dragging.p0 = p;
            dragging.strings0 = [...cfg.strings];
            return;
          }
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

    /* what you see pulsing is what you hear (fretboard-stage's own words) —
     * the ring drawn AT THE DRAWN DOT's own coordinates, never recomputed */
    const ringFor = (midi, ttl = 320) => {
      const svg = byId("fieldSvg");
      const layer = svg && svg.querySelector(".fd-pulselayer");
      if (!layer) return 0;
      const hits = [
        ...svg.querySelectorAll(`.fd-sel[data-selmidi="${midi}"] circle`),
        ...[...svg.querySelectorAll(`.fd-ref[data-refmidi="${midi}"] circle`)],
      ];
      for (const c of hits) {
        const ring = el("circle", { class: "fd-pulse", cx: c.getAttribute("cx"),
          cy: c.getAttribute("cy"), r: 19, fill: "none", stroke: "#212126",
          "stroke-width": 2.4, opacity: 0.9, "pointer-events": "none" }, layer);
        pulseTimers.push(d.defaultView.setTimeout(() => ring.remove(), ttl));
      }
      return hits.length;
    };
    /* THE FIRST NOTE'S RING (260909, item 2, measured): on an advance the
     * walk's STEP listener runs before this board's — the new chord's first
     * NOTE arrives while the OLD bar's dots are still drawn (no matching
     * data-selmidi, no ring), and the rebuild lands ~10ms later. The walk's
     * ordering is load-bearing (260902) and stays; the pulse is THIS board's,
     * so a miss is held briefly and flushed against the fresh dots when
     * build() finishes. A miss that never finds a dot simply expires. */
    listen(d, NOTE, (m) => {
      if (!m || typeof m.midi !== "number") return;
      const now = d.defaultView.performance.now();
      livePulses = livePulses.filter((p2) => p2.until > now);
      livePulses.push({ midi: m.midi, until: now + 320 });
      ringFor(m.midi);
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

    byId("fdMoveSeg").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-move]");
      if (!b || b.disabled) return;
      cfg = { ...cfg, movement: b.dataset.move };
      push();
    });

    byId("fieldSvg").addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const next = step(curB.pos, e.key === "ArrowRight" ? 1 : -1, curB.fld, cfg.strings);
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
    byId("fdAllTones").addEventListener("change", (e) => {
      cfg = { ...cfg, take: e.target.checked ? "all" : "one" }; push();
    });
    byId("fdRepeat").addEventListener("click", () => {
      cfg = { ...cfg, repeat: !cfg.repeat }; push();
    });

    byId("fdRailBtn").addEventListener("click", () => {
      const r = byId("fdRail");
      r.classList.toggle("fd-shut");
      byId("fdRailBtn").textContent = r.classList.contains("fd-shut") ? "‹" : "›";
    });

    /* ---- the transport rail and the mixer: bus views, never owners ---- */
    byId("fdMetChk").addEventListener("change", (e) =>
      announce(d, CLOCK, { click: e.target.checked }));
    /* bpm — the metronome checkbox's OWN idiom, copied exactly (260913,
     * item 3a): the view ASKS through CLOCK and paints only what the owner
     * echoes back through CLOCK_STATE, so it can never hold a value the
     * clock does not — a typed 999 comes back as the owner's clamp. */
    byId("fdBpm").addEventListener("change", (e) => {
      const v = +e.target.value;
      if (Number.isFinite(v)) announce(d, CLOCK, { bpm: v });
    });
    listen(d, CLOCK_STATE, (m) => {
      if (m && typeof m.click === "boolean") byId("fdMetChk").checked = m.click;
      if (m && typeof m.bpm === "number") byId("fdBpm").value = m.bpm;
    });
    /* the bass / reference — Harmony's second view (260913, item 3b), the
     * same shape: announce the change, paint from the announced state. The
     * choices fill from the engine's own list, stated once. */
    {
      /* the options are filled at PAINT time from the current pick (item 3)
       * — see the build; here only the announce is wired */
      const b2 = byId("fdBass2");
      b2.addEventListener("change", (e) =>
        announce(d, CONFIG_CHANGED, { bass: e.target.value }));
    }
    mountMini(ctx, byId("fdMini"));
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
      for (const k of ["key", "scale", "ref", "startDeg", "nearFret", "object", "take", "notesPer", "address", "figure", "movement", "bass", "source", "cycle", "form", "custom", "start", "repeat", "centreSrc"])
        if (k in m && m[k] !== cfg[k]) {
          /* a restored v0.1.0 étude says movement "block"/"arpeggio" — the
           * alias map is the one place the old words are known (260913) */
          const v = k === "movement" ? movementWord(m[k]) : m[k];
          if (v !== cfg[k]) { cfg = { ...cfg, [k]: v }; changed = true; }
        }
      /* the pick (260917, item 1): `tones` is the word; a saved étude's
       * `dyad` is read through tonePick — the one alias site */
      {
        const pk = tonePick(m);
        if (pk && pk.join() !== (cfg.tones || []).join()) { cfg = { ...cfg, tones: [...pk] }; changed = true; }
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
