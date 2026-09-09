/* palette.mjs — THE DEGREE PALETTE, stated once (260918, night 24 item 2a).
 *
 * Design Spec §2.1 is the law: colour encodes FUNCTION against the current
 * root and nothing else (golden rule 8 — never status, selection, error or
 * emphasis). These are its seven hexes and the text rule that travels with
 * them: the LIGHT marks (4/11 silver, 6/13 cyan, 7 amber) take dark text;
 * the dark marks take white. Violet is OUTSIDE the palette — §2.1: "spent at
 * v1.3 on chromatic approach tones (§2.6); it is an annotation channel and
 * never denotes a degree."
 *
 * Until tonight this table was hand-copied, literal for literal, in FIVE hub
 * modules (field-board, fretboard-stage, keyboard-strip, score-board,
 * staff-board — the dispatch counted three) with the violet a sixth literal
 * in score-board: standing rule 6 five times over, made due by the chip
 * strips becoming the next consumers. One place now; the consumers import.
 * A helper module like bus.mjs or mini.mjs — it contributes no markup, no
 * styles, no control, so the resolver treats it as reached code only.
 */
/* NIGHT 43 (261007): the seven hexes and the family list moved ONE step further, into
 * engine/degree-palette.mjs, because the family's chart line paints the root-degree dot
 * on studies that are not doors and cannot import this file. The hub's consumers still
 * import FAM and FAM_COLOR from here — bound, not restated. */
import { FAM as DEGREE_FAM, FAM_COLOR as DEGREE_COLOR } from "../engine/degree-palette.mjs";
export const FAM = DEGREE_FAM;
export const FAM_COLOR = DEGREE_COLOR;
export const FAM_TEXT = { R: "#fff", "2": "#fff", "3": "#fff", "4": "#212126",
  "5": "#fff", "6": "#212126", "7": "#212126" };
/* The violet constant is gone FROM THE CODE (night 45, 261009 — Daniel: "remove the violet colour function
 * for good"). v1.4 struck the v1.3 clause that spent it (Update Log 260930.1); night 36 retired
 * every hub consumer but left the constant, and the hand-authored triadetudes page kept painting
 * by the raw hex for eight nights — a sweep by IDENTIFIER cannot see a literal. §2.1's
 * reservation of the hue is the Spec's to keep or release (docs/), not a constant's. The guard
 * that watched for violet entering the palette now watches the CLASS, below. */
/** §2.2/§2.6's annotation gray (0.45, 0.45, 0.48) — the slur's colour */
export const ANNOTATION_GRAY = "#73737A";
{
  // §2.1's own text rule, asserted: light marks (4, 6, 7) take dark text
  for (const f of ["4", "6", "7"]) if (FAM_TEXT[f] !== "#212126") throw new Error("palette: light mark " + f + " must take dark text");
  for (const f of ["R", "2", "3", "5"]) if (FAM_TEXT[f] !== "#fff") throw new Error("palette: dark mark " + f + " must take white text");
  /* THE DEGREE PALETTE HOLDS EXACTLY THE SEVEN §2.1 COLOURS AND NOTHING CREEPS IN (night 45,
   * generalising the violet-only check — the instance was never the subject, the class is):
   * seven families, seven distinct well-formed hexes, none of them an annotation colour. The
   * VALUES are asserted against the Spec's own table by engine/tests/degree-palette.test.mjs,
   * which parses docs/ — the one way to check by value without restating the seven (rule 6). */
  const hexes = Object.values(FAM_COLOR);
  if (Object.keys(FAM_COLOR).length !== 7 || FAM.length !== 7) throw new Error("palette: the degree palette is exactly seven families");
  if (new Set(hexes).size !== 7) throw new Error("palette: seven distinct degree colours — two families share one");
  for (const h of hexes) if (!/^#[0-9A-F]{6}$/.test(h)) throw new Error("palette: a degree colour is not a six-digit hex: " + h);
  if (hexes.includes(ANNOTATION_GRAY)) throw new Error("palette: the annotation gray is not a degree colour");
  for (const f of FAM) if (!(f in FAM_COLOR)) throw new Error("palette: family " + f + " has no colour");
}
