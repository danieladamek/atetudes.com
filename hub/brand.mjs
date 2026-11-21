/* brand.mjs — THE @ MARK, stated once for the apps (261120; *Player - the @ mark replaces the card title*).
 *
 * The shipped logo (static/assets/logo.svg) sets its @ in Georgia, falling back to a serif, filled root red — the
 * Spec's R token (§2.1), the wordmark's own reading of the degree sequence R 2 3 4 5 6 7. The player's card title is
 * that @ (Daniel, 2026-11-20: "a small red @ … in the type font of the logo of course"). The glyph and its typeface are
 * stated HERE and the colour is the palette's R, never retyped; hub/tests/brand.test.mjs reads the logo file and fails
 * if the two ever part. If the logo is outlined to paths one day, the mark here takes the same path.
 */
import { FAM_COLOR } from "./palette.mjs";

export const BRAND_AT = Object.freeze({
  glyph: "@",
  font: "Georgia, 'Times New Roman', serif",
  colour: FAM_COLOR.R,
  label: "At-Etudes — opens atetudes.com",
});
