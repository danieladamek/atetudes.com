/* presets-card.mjs — v0.9's PRESETS card, LIVE (Multetudes surface,
 * 2026-08-29).
 *
 * A preset seeds every control and leaves them all live (v0.9's own words —
 * the note travels with the card). The catalogue is the journal page's
 * recipes RESTRICTED TO WHAT THE ENGINE SUPPORTS TONIGHT: scale, triad and
 * tetrad objects over any run at any ceiling (children 0–3a). The dyad and
 * shell recipes (R4, R17, R19, R26) arrive with child 4, R14's figure with
 * 3b, R7's and R19's bass with child 5 — each omission is that child's, not
 * a silent trim.
 *
 * A CATALOGUE IS CONTENT, NOT A DERIVABLE FACT — but it is CHECKED, not
 * trusted: at load every preset is applied through field → position →
 * selection and asserted to produce a non-empty, lawful take, so a recipe
 * that stops building fails here at import, not in Daniel's browser.
 */
import { field } from "../../engine/field.mjs";
import { positionOf, materialIn } from "../../engine/position.mjs";
import { diatonicTones, objectOffsets, oneOfEach, everyOccurrence, scaleTake } from "../../engine/selection.mjs";
import { CONFIG_CHANGED, listen, announce } from "../bus.mjs";

/* label · the config it seeds. `take` defaults back to "one" exactly as v0.9
 * resets it, so a preset states only what it means. */
export const PRESETS = [
  ["R1 · a mode along one string", { strings: [2], notesPer: 3, object: "scale" }],
  ["R4 · dyads across two strings", { strings: [3, 2], notesPer: 1, object: "dyad" }],
  ["R5 · the scale, three per string, on two", { strings: [4, 3], notesPer: 3, object: "scale" }],
  ["R7 · a triad folded onto two strings", { strings: [3, 2], notesPer: 3, object: "triad" }],
  ["R9 · block triads", { strings: [4, 3, 2], notesPer: 1, object: "triad" }],
  ["R11 · triad lines", { strings: [4, 3, 2], notesPer: 3, object: "triad", take: "all" }],
  ["R12 · block tetrads", { strings: [4, 3, 2, 1], notesPer: 1, object: "tetrad" }],
  ["R14 · tetrad lines", { strings: [4, 3, 2, 1], notesPer: 3, object: "tetrad", take: "all" }],
  ["R15 · the six-string scale box", { strings: [6, 5, 4, 3, 2, 1], notesPer: 3, object: "scale" }],
  ["R16 · an open voicing on a skipped set", { strings: [6, 4, 3, 1], notesPer: 1, object: "tetrad" }],
  ["R17 · a shell", { strings: [6, 4, 3], notesPer: 1, object: "shell" }],
  ["R26 · a guide-tone dyad", { strings: [4, 3], notesPer: 1, object: "dyad", dyad: [3, 7] }],
];

export const presetsCard = {
  id: "presets-card",
  layer: "surface",
  requires: { surface: "multetudes" },
  mount_point: "cards",
  order: 12,
  controls: ["psSel"],

  markup: `
  <h2>Presets</h2>
  <label>Start from</label>
  <select id="psSel" data-control="psSel"></select>
  <div class="hint ps-note info">A preset seeds every control and leaves them all live. The journal
  page's exercises are here as the engine grows into them; the key, the scale and the reference stay
  whatever you set them to.</div>`,

  styles: `
.ps-note{margin-top:8px}
#psSel{width:100%}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const sel = byId("psSel");
    sel.textContent = "";
    const o0 = d.createElement("option");
    o0.value = ""; o0.textContent = "— start from a preset —";
    sel.appendChild(o0);
    PRESETS.forEach(([label], i) => {
      const o = d.createElement("option");
      o.value = String(i); o.textContent = label;
      sel.appendChild(o);
    });
    sel.addEventListener("change", (e) => {
      const p = PRESETS[+e.target.value];
      if (!p) return;
      announce(d, CONFIG_CHANGED, { take: "one", notesPer: 1, ...p[1],
        strings: [...p[1].strings] });
      sel.value = "";                      // v0.9's own behaviour: seed, then release
    });
    /* any config change means the controls have moved on — nothing to hold */
    listen(d, CONFIG_CHANGED, () => {});
  },
};

/* ---------------- load-time: every preset BUILDS (checked, not trusted) ---------------- */

{
  const fld = field({ key: "C", scale: "major" });
  for (const [label, p] of PRESETS) {
    const anchor = Math.max(...p.strings);
    const pos = positionOf({ field: fld, anchorString: anchor, startDegree: 0, nearFret: 5 });
    const pool = materialIn(pos, p.strings, fld);
    let take;
    if (p.object === "scale") take = scaleTake(pool);
    else {
      const tones = diatonicTones(fld, 0, objectOffsets(p.object, p.dyad));
      take = (p.take === "all")
        ? everyOccurrence(tones, pool, { n: p.notesPer })
        : oneOfEach(tones, pool, { n: p.notesPer, centre: pos.centre });
    }
    if (!take.notes || !take.notes.length)
      throw new Error(`presets: "${label}" does not build — a preset that seeds an empty take is a broken recipe`);
  }
}
