/* legend.mjs — THE COLOUR LEGEND, one line per diagram face (night 85 — PO ruling 261053 §2, item 2 option C; inside
 * Daniel's 260918 ruling "a sentence on each face saying which centre it speaks from, not a behaviour change").
 *
 * The neck carried the family's legend alone — the palette's swatches and "colour = function against the key" — and
 * under "follows" (Object = scale, each bar re-centred on its own chord) that sentence was FALSE: the bold selection is
 * re-read against the bar's centre while the faint field and the bass stay in key space. The keys and the staff
 * re-read the same way and said nothing at all. Three faces now render one line, in the grammar the legend always used
 * and night 60's chip caption adopted ("colour = function against …"), naming each mark's centre where a face mixes
 * them. Three renderers make it page grammar (rule 6, as .readbox became): the words live here, once; the styles in
 * the build's LEGEND_GRAMMAR, shipped only where a door reaches this file.
 */
import { FAM, FAM_COLOR } from "./palette.mjs";

/** the swatches and the sentence, as markup for a `.legend` element.
 *   follows     the face re-reads against the bar's centre now (Object = scale, centre following, a centre to follow)
 *   centreName  that centre's name, for a face showing one bar (the staff shows several, each its own: null)
 *   perBar      the staff's clause — each bar re-centres on its own chord
 *   keepsKey    the marks on this face that stay in KEY space under follows, named by role
 *   ref         a fixed centre re-rooted off the key: the reference tone, as the neck has always said */
export function legendHTML({ follows = false, centreName = null, perBar = false, keepsKey = "", ref = false } = {}) {
  const swatches = FAM.map((f) => `<span><i style="background:${FAM_COLOR[f]}"></i>${f}</span>`).join("");
  const words = follows
    ? `colour = function against the centre${centreName ? `, ${centreName}` : ""} — following the changes`
      + (perBar ? ", each bar re-centres on its own chord" : "")
      + (keepsKey ? `; ${keepsKey}: against the key` : "")
    : `colour = function against ${ref ? "the reference tone" : "the key"}`;
  return swatches + `<span class="legend-words">${words}</span>`;
}
