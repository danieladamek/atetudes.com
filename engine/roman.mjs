/* roman.mjs — ONE ROMAN SPELLING, ONE NAMED REDUCTION (Daniel's ruling 261006; built 261008).
 *
 *   The roman names FUNCTION. Quality is the symbol's job wherever the symbol is present.
 *   Where the roman stands alone, it carries the quality itself.
 *
 * Three spellers exist for one concept — progression.mjs's chordAt (vii°: the triad's reading,
 * lower case for a minor third, ° for a diminished fifth under it), tetrad-sequence.mjs's
 * romanOf (viiø7: the seventh named) and the cycles generator's ROMAN_SUFFIX in Python. Each
 * has readers that need the tags: the "Start on" selector shows the roman ALONE and keeps
 * them. The CHART LINE never shows a roman without its symbol, so on every study the chip
 * takes the function-only spelling — derived from the full roman through THIS function and
 * no other, so that a fourth table never appears (the generated page reaches it through the
 * bridge's inline; the generator emits its full roman as data and does not reduce).
 *
 * THE DIFFERENCE, STATED: in the tetrad apps a user sees `viiø7` in Start-on and `vii°` on
 * the chip of the same chord. That is the rule above, not a disagreement — the chip's symbol
 * (`Bm7b5`) already names the quality the tag would repeat; the selector has no symbol beside
 * it, so its roman carries the quality. roman.test.mjs asserts the reduction equals
 * progression.mjs's spelling on every diatonic tetrad of every key and scale.
 *
 * NOT A TABLE: the tags are read by their shape — a leading ø, ° or o means the triad under
 * the seventh is diminished and keeps the °; every other tag (maj7, -7, 7, +7, mΔ7, -Δ7, +Δ7)
 * is quality the symbol carries and goes, the augmented + included, because the triad's
 * reading in progression.mjs marks no augmented (the part they share, asserted).
 */
const NUMERAL = /^(?:VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(?![IViv])/;

/** the function-only spelling of a roman: the numeral in its case, ° kept for a diminished
 * triad, every seventh tag dropped; a dash (an off-key root) passes through */
export function functionRoman(roman) {
  if (typeof roman !== "string") throw new Error("roman: a roman is a string");
  if (roman === "—") return roman;
  const m = roman.match(NUMERAL);
  if (!m) throw new Error(`roman: "${roman}" does not begin with a roman numeral`);
  const tag = roman.slice(m[0].length);
  return m[0] + (/^[ø°o]/.test(tag) ? "°" : "");
}

{
  if (functionRoman("viiø7") !== "vii°" || functionRoman("Imaj7") !== "I" || functionRoman("III+7") !== "III" || functionRoman("viio7") !== "vii°")
    throw new Error("roman: the reduction does not hold — viiø7 → vii°, Imaj7 → I, III+7 → III");
}
