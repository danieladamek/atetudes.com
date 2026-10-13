/* tuning-strip.mjs — THE TUNING CARD: the strings' tuning, as a board of its own under the neck (261012b).
 *
 * Daniel, 261012, from a screenshot of the live neck: "How hard would it be to peel off the guitar tuning
 * into its own collapsable item?" — then "let's default the tuning to its collapsed form." Night 58's move
 * for the mixer rows (mixer-strip.mjs), made again: the two tuning rows left the neck board with their ids,
 * their messages and their state (rule 10 — all three sites together). The neck board still WIRES them by
 * id — field-board.mjs paints the steppers and the names and owns the tuning in its configuration, because
 * the tuning is the field's fact (night 44); this board owns only the markup, the look and its summary.
 *
 * THE CARD LOADS SHUT (`collapsed: true`, the shell's declared start-collapsed — used by this board only).
 * A shut card must never hide an altered neck (CC-1): its one-line summary names the LIVE tuning —
 * "Tuning · standard", "Tuning · drop D", "Tuning · custom" — in the words #fdTuneName shows (tunings.mjs
 * describeTuning, the one wording), rewritten on every announced tuning: a restored entry, a preset, an
 * imported file, a stepper. Ruled (Daniel, 261012, "correct"): a non-standard tuning does NOT open the card.
 * 261012d (Daniel): the card says "Tuning" ONCE — the header names it, so the summary is the name alone ("standard",
 * "drop D", "custom") and the steppers row lost its "tuning" label; the "named" label stays (it says something the
 * header does not).
 */
import { describeTuning } from "../../engine/tunings.mjs";
import { CONFIG_CHANGED, listen } from "../bus.mjs";

/** the summary's word for a tuning that matches no name, exactly or by shape — exported so the gate reads it (rule 6) */
export const UNNAMED_TUNING = "custom";

export const tuningStrip = {
  id: "tuning-strip",
  layer: "surface",
  requires: { surface: "multetudes" },
  mount_point: "boards",
  order: 18.2,
  collapsed: true,
  controls: ["fdTuning", "fdTuneNames", "fdTuneName", "fdTuneAll"],

  markup: `
  <div class="bh"><span>Tuning</span></div>
  <span class="clpsum" id="tnSum"></span>
  <!-- THE STRING LABELS ARE THE EDITOR (night 47, alternate tunings item 2 — Daniel's
       wireframe). ITS OWN SURFACE, layout (a): measured first (rule 4), at 390 px the whole
       neck SVG renders 150 px wide and a set square 2.8 × 2.6 px — nothing drawn inside that
       SVG is a touch control there, so the six steppers live in this HTML row, which keeps
       full-size targets at every width; the set squares stay exactly as they are (their
       390 px defect is filed, not made worse). Each label reads the open string by the
       direction of its move (open-string.mjs); a move that would cross a neighbour is inert
       at the point of the move and says why, there (tunings.mjs canStep) — never a toast,
       never a silent clamp, never the throw. (261012b: the rows moved here from the neck
       board, ids unchanged.) -->
  <div class="fd-railrow fd-tunerow">
    <div class="fd-tuning" id="fdTuning" data-control="fdTuning"></div>
    <span class="fd-tunename" id="fdTuneName" data-control="fdTuneName"></span>
    <span class="fd-tune fd-tuneall" id="fdTuneAll" data-control="fdTuneAll"></span>
  </div>
  <div class="fd-railrow fd-tunerow">
    <span class="fd-lab2">named</span>
    <div id="fdTuneNames" data-control="fdTuneNames"></div>
  </div>`,

  styles: `
.fd-tunerow{display:flex;gap:9px;align-items:center;padding:8px 2px 2px;font-size:12px;color:var(--gray);flex-wrap:wrap}
.fd-tunerow+.fd-tunerow{border-top:1px solid var(--line);margin-top:7px}
.fd-lab2{font-size:12px;color:var(--gray)}
/* the cells (item 5, 261009): the between-cell gap was 10px against a 2px within-cell gap
 * and still failed — a cell is ~98px and 10px is a third of one button, so the eye read an
 * even run of boxes and bound each − to the nearest letter. Proximity has to beat rhythm at
 * this scale: the between-cell gap is now most of a button; no ink (a divider would fight the
 * wrap at 390 and add an object the strip does not need) — measured both ways, see the run note */
.fd-tuning{display:flex;flex-wrap:wrap;gap:8px 26px;align-items:flex-start}
.fd-tune{display:inline-flex;flex-direction:column;align-items:center;gap:2px}
.fd-tune .fd-tunectl{display:inline-flex;align-items:center;gap:2px}
.fd-tune button{font:inherit;font-size:14px;line-height:1;min-width:30px;min-height:30px;padding:0;border:1px solid var(--line);
  border-radius:6px;background:#fff;color:var(--ink);cursor:pointer}
.fd-tune button:hover{border-color:var(--ink)}
.fd-tune button[aria-disabled="true"]{color:var(--gray);border-color:var(--edge);cursor:not-allowed}
.fd-tune .fd-open{min-width:34px;text-align:center;font-size:14px;font-weight:600;color:var(--ink)}
.fd-tune .fd-open[data-moved="true"]{text-decoration:underline;text-underline-offset:3px}
.fd-tune .fd-tunestr{font-size:10.5px;color:var(--gray)}
.fd-tune .fd-tunewhy{font-size:11px;color:var(--gray);max-width:150px;text-align:center;min-height:0}
.fd-tunename{font-size:12.5px;font-weight:600;color:var(--ink)}
.fd-tunename[data-shift]:not([data-shift="0"]):not([data-shift=""]){font-weight:500}
.fd-tuneall{margin-left:14px}
.fd-tuneall .fd-open{font-size:11.5px;font-weight:500;color:var(--gray)}
#fdTuneNames{display:flex;flex-wrap:wrap;gap:6px}
#fdTuneNames button{font:inherit;font-size:12.5px;padding:5px 9px;
  border:1px solid var(--line);border-radius:6px;background:#fff;cursor:pointer;color:var(--ink)}
#fdTuneNames button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
#fdTuneNames button[data-shifted="true"]{border-style:dashed}`,

  mount(ctx) {
    const d = ctx.doc, sum = ctx.byId("tnSum");
    /* the summary is a VIEW of the announced tuning (rule 10) — the same reading #fdTuneName shows; a
     * hand-stepped tuning that matches no name, exactly or by shape, is "custom" */
    const say = (t) => { sum.textContent = describeTuning(t) || UNNAMED_TUNING; };
    say(null);
    listen(d, CONFIG_CHANGED, (m) => { if (m && typeof m === "object" && "tuning" in m) say(m.tuning); });
  },
};
