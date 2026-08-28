/* progression-card.mjs — v0.9's PROGRESSION card, VISIBLY INERT (Multetudes
 * surface, 2026-08-29).
 *
 * The progression engine is CHILD 7 (cycles · forms · typed changes) and has
 * not landed. The ruling's allow-list names this region: it renders v0.9's
 * layout — the source segment, the cycle and form selectors, Start on — with
 * every control disabled and the reason on the card's face, never blank and
 * never silently absent. Nothing here derives a bar; the one derived fact is
 * the option lists themselves, which come from the engine's own catalogues
 * (CYCLES from tetrad-sequence, STRUCTURES from structures.mjs) rather than
 * being retyped — a list typed here tonight would be the eleventh instance of
 * the hand-maintained-list defect, waiting to drift when child 7 arrives.
 */
import { CYCLES } from "../../engine/tetrad-sequence.mjs";
import { STRUCTURES } from "../../engine/structures.mjs";

const ORD = ["root", "2nd", "3rd", "4th", "5th", "6th", "7th"];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

export const progressionCard = {
  id: "progression-card",
  layer: "surface",
  requires: { surface: "multetudes" },
  mount_point: "cards",
  order: 11,
  controls: ["pgSrcSeg", "pgCycle", "pgForm", "pgCustom", "pgStart"],

  markup: `
  <h2>Progression</h2>
  <label>Source</label>
  <div class="seg" id="pgSrcSeg" data-control="pgSrcSeg">
    <button data-src="cycle" class="on" disabled>cycle</button>
    <button data-src="structure" disabled>form</button>
    <button data-src="custom" disabled>custom</button>
  </div>
  <label>Cycle</label>
  <select id="pgCycle" data-control="pgCycle" disabled></select>
  <label class="pg-hid">Form</label>
  <select id="pgForm" data-control="pgForm" class="pg-hid" disabled></select>
  <label class="pg-hid">Custom — romans or chord symbols</label>
  <input type="text" id="pgCustom" data-control="pgCustom" class="pg-hid" disabled>
  <label>Start on</label>
  <select id="pgStart" data-control="pgStart" disabled></select>
  <div class="hint" id="pgNote"></div>`,

  styles: `
.pg-hid{display:none}
#pgNote{margin-top:8px}
#pgCycle,#pgForm,#pgStart{width:100%}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const fill = (sel, items) => {
      sel.textContent = "";
      for (const [v, l] of items) {
        const o = d.createElement("option"); o.value = v; o.textContent = l; sel.appendChild(o);
      }
    };
    fill(byId("pgCycle"), Object.entries(CYCLES).map(([id, c]) => [id, c.name]));
    fill(byId("pgForm"), STRUCTURES.map((s) => [s.id, s.name]));
    fill(byId("pgStart"), ORD.map((o, i) => [String(i), `${o} — ${ROMAN[i]}`]));
    byId("pgNote").textContent =
      "Inert — the progression (cycles, forms and typed changes) arrives with child 7. " +
      "Until then the étude holds one bar: the object on the window's start degree.";
  },
};
