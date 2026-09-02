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
export const FAM = ["R", "2", "3", "4", "5", "6", "7"];
export const FAM_COLOR = { R: "#B82929", "2": "#3C8B2F", "3": "#2959A6", "4": "#A9ABB4",
  "5": "#212126", "6": "#1CB8D1", "7": "#D99A08" };
export const FAM_TEXT = { R: "#fff", "2": "#fff", "3": "#fff", "4": "#212126",
  "5": "#fff", "6": "#212126", "7": "#212126" };
/** §2.6's chromatic-approach colour — an annotation channel, never a degree */
export const VIOLET = "#7847A8";
/** §2.2/§2.6's annotation gray (0.45, 0.45, 0.48) — the slur's colour */
export const ANNOTATION_GRAY = "#73737A";
{
  // §2.1's own text rule, asserted: light marks (4, 6, 7) take dark text
  for (const f of ["4", "6", "7"]) if (FAM_TEXT[f] !== "#212126") throw new Error("palette: light mark " + f + " must take dark text");
  for (const f of ["R", "2", "3", "5"]) if (FAM_TEXT[f] !== "#fff") throw new Error("palette: dark mark " + f + " must take white text");
  if (Object.values(FAM_COLOR).includes(VIOLET)) throw new Error("palette: violet must never enter the degree palette");
}
