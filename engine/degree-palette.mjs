/* degree-palette.mjs — THE DEGREE PALETTE, stated once, where every carrier can reach it
 * (night 43, 261007).
 *
 * Design Spec §2.1 is the law: colour encodes FUNCTION against the current root and
 * nothing else (golden rule 8 — never status, selection, error or emphasis). These are
 * its seven hexes, keyed by the degree family the legend names. Night 24 (260918) moved
 * the table out of five hub modules into hub/palette.mjs; night 43 moves the table one
 * step further, into the engine, because the family's chart line (chart-line.mjs) paints
 * the root-degree dot on every study that has a chart line — two of which are not doors
 * and cannot import a hub file. hub/palette.mjs binds to this table (FAM, FAM_COLOR) and
 * keeps the hub's own additions (the text rule, the annotation colours). Nothing
 * restates the map: a hand-authored page carries this module and binds to it.
 */
export const FAM = ["R", "2", "3", "4", "5", "6", "7"];
export const FAM_COLOR = { R: "#B82929", "2": "#3C8B2F", "3": "#2959A6", "4": "#A9ABB4",
  "5": "#212126", "6": "#1CB8D1", "7": "#D99A08" };
{
  // §2.1, asserted at load: seven families, seven distinct hexes, each a 6-digit colour
  if (FAM.length !== 7 || new Set(FAM).size !== 7) throw new Error("degree-palette: seven degree families");
  for (const f of FAM) if (!/^#[0-9A-F]{6}$/.test(FAM_COLOR[f])) throw new Error("degree-palette: " + f + " has no colour");
  if (new Set(Object.values(FAM_COLOR)).size !== 7) throw new Error("degree-palette: two families share a colour");
}
