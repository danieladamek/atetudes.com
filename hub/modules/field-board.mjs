/* field-board.mjs — THE FIELD: Multetudes' one new surface, and deliberately
 * nothing more (child 0 — the skeleton door, and the kill condition).
 *
 * The brief's model (multetudes-prd.md §2.1): choose a key and the whole neck
 * shows every note of it, subdued. Everything else the app will ever do is a
 * NARROWING of this constant field — nothing creates a note; each control
 * selects from what is already lit. This board renders that field — key/scale
 * ghosted across all six strings — and renders NOTHING else: no window, no
 * objects, no placement. Those are children 1+, and building any of them here
 * would spend the engine work the kill condition exists to be checked BEFORE.
 *
 * WHAT IS DERIVED, AND FROM WHERE (golden rule 1 — no hand-placed note):
 *   the seven degrees      engine/chord.mjs        scaleNotes() — never restated
 *   the tuning             engine/tetrad-sequence  OPEN_MIDI — asserted at its
 *                          own load against the named rule (fourths, G→B third)
 * Every dot is (string, fret) whose pitch class is in the field, coloured by
 * its scale degree — the degree palette, function against the key. The board
 * asserts the derivation before drawing (see deriveField), and the count it
 * asserts against is computed by DIFFERENT arithmetic than the walk that
 * produced the dots, so the assertion cannot be the derivation grading itself.
 *
 * The geometry is the reference's, verbatim (fretboard-stage carries the same
 * numbers): a 15-fret neck across a 1160-wide viewBox. Not tuned here.
 *
 * THE DOTS SOUND (floor F3, the family's every-dot-sounds idiom): each dot
 * carries data-midi and one delegated click announces NOTE — the audio card
 * realises it. No audio is owned here (§4.2.3).
 */
import { scaleNotes } from "../../engine/chord.mjs";
import { OPEN_MIDI } from "../../engine/tetrad-sequence.mjs";
import { CONFIG_CHANGED, NOTE, listen, announce } from "../bus.mjs";

const SVGNS = "http://www.w3.org/2000/svg";
/* the reference's geometry — the layout specification, not a preference */
const NFRETS = 15, FX0 = 46, FW = 71, SY0 = 34, SGAP = 34;
const fx = (f) => (f === 0 ? FX0 - 22 : FX0 + (f - 0.5) * FW);
const fy = (str) => SY0 + (str - 1) * SGAP;
/* the scale-degree family palette and its text colours — the Spec's §7.2:
 * light marks (4, 6, 7) take dark text */
const FAM = ["R", "2", "3", "4", "5", "6", "7"];
const FAM_COLOR = { R: "#B82929", "2": "#3C8B2F", "3": "#2959A6", "4": "#A9ABB4",
  "5": "#212126", "6": "#1CB8D1", "7": "#D99A08" };
const FAM_TEXT = { R: "#fff", "2": "#fff", "3": "#fff", "4": "#212126",
  "5": "#fff", "6": "#212126", "7": "#212126" };

const SCALE_WORD = { major: "major", harm: "harmonic minor", mel: "melodic minor" };

/** the field's dots, derived then asserted — never drawn before both.
 *
 * Derivation: walk every (string, fret) and keep the ones whose pitch class
 * is in the scale. Assertion: the count per string must equal the number
 * predicted by INDEPENDENT arithmetic — for each scale pc, its first fret on
 * that string is (pc − open) mod 12, and a 16-position neck (0..15) holds a
 * second occurrence exactly when that first fret is ≤ 3. A walk that skipped
 * or double-counted a fret cannot agree with that closed form. */
export function deriveField(key, scale) {
  const notes = scaleNotes(key, scale);
  const pcs = notes.map((n) => n.pc);
  if (pcs.length !== 7 || new Set(pcs).size !== 7)
    throw new Error("field-board: the field must be seven distinct pitch classes");
  const dots = [];
  for (let s = 1; s <= 6; s++)
    for (let f = 0; f <= NFRETS; f++) {
      const midi = OPEN_MIDI[s] + f, di = pcs.indexOf(((midi % 12) + 12) % 12);
      if (di >= 0) dots.push({ string: s, fret: f, midi, keyDeg: di });
    }
  for (let s = 1; s <= 6; s++) {
    const walked = dots.filter((d) => d.string === s).length;
    const predicted = pcs.reduce((a, pc) => {
      const f0 = (((pc - OPEN_MIDI[s]) % 12) + 12) % 12;
      return a + (f0 <= NFRETS - 12 ? 2 : 1);
    }, 0);
    if (walked !== predicted)
      throw new Error(`field-board: string ${s} carries ${walked} field notes, arithmetic says ${predicted}`);
  }
  for (const d of dots)
    if (!pcs.includes(((d.midi % 12) + 12) % 12) || d.fret < 0 || d.fret > NFRETS)
      throw new Error("field-board: a derived dot is off the field or off the neck");
  return { key, scale, notes, pcs, dots };
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
  <svg id="fieldSvg" data-control="fieldSvg" viewBox="0 0 1160 260" aria-label="the field — every note of the key, across the neck"></svg>`,

  /* every rule names a token only this board ships */
  styles: `
#fieldSvg{width:100%;height:auto;display:block}
#fdHint{margin:2px 2px 8px}
.fd-dot{cursor:pointer}
.fd-lab{font-weight:bold;pointer-events:none;user-select:none}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    let cfg = { key: "C", scale: "major" };

    const el = (t, a, p) => {
      const e = d.createElementNS(SVGNS, t);
      for (const k in a) e.setAttribute(k, a[k]);
      if (p) p.appendChild(e);
      return e;
    };

    const build = () => {
      const field = deriveField(cfg.key, cfg.scale);   // derive + assert, then draw
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
      for (let s = 1; s <= 6; s++) {
        el("line", { x1: FX0 - 30, y1: fy(s), x2: FX0 + NFRETS * FW, y2: fy(s),
          stroke: "#B9B9BF", "stroke-width": s >= 4 ? 1.8 : 1.1 }, svg);
        const t = el("text", { x: FX0 + NFRETS * FW + 8, y: fy(s) + 4, "font-size": "11", fill: "#73737A" }, svg);
        t.textContent = s;
      }

      /* the field itself, subdued — the study's own 0.28 */
      for (const dot of field.dots) {
        const fam = FAM[dot.keyDeg];
        const g = el("g", { class: "fd-dot", opacity: 0.28, "data-midi": dot.midi }, svg);
        el("circle", { cx: fx(dot.fret), cy: fy(dot.string), r: 10.5, fill: FAM_COLOR[fam] }, g);
        const t = el("text", { x: fx(dot.fret), y: fy(dot.string) + 3.4, "text-anchor": "middle",
          "font-size": "9.5", fill: FAM_TEXT[fam], class: "fd-lab" }, g);
        t.textContent = fam;
      }

      byId("fdHint").textContent =
        `${cfg.key} ${SCALE_WORD[cfg.scale] || cfg.scale} — the whole field, ` +
        `${field.dots.length} notes across six strings. Everything the app will do narrows this.`;
    };

    /* every dot sounds — one delegated click, the audio card realises it */
    byId("fieldSvg").addEventListener("click", (e) => {
      const hit = e.target.closest("[data-midi]");
      if (hit) announce(d, NOTE, { midi: +hit.dataset.midi });
    });

    listen(d, CONFIG_CHANGED, (m) => {
      if (!m || typeof m !== "object") return;
      let changed = false;
      for (const k of ["key", "scale"]) if (k in m && m[k] !== cfg[k]) { cfg = { ...cfg, [k]: m[k] }; changed = true; }
      if (changed) build();
    });

    build();
  },
};
