/* open-string.mjs — THE OPEN STRING'S NAME (night 44, 261008 — Daniel's ruling, 261008).
 *
 * An open string is spelled BY THE DIRECTION OF THE MOVE from standard: down is flat, up is
 * sharp, unmoved is natural. Drop D reads D; a string down one reads E♭; up one reads F♯.
 * Derived; the only table permitted is the twelve names.
 *
 * THE STRING LABEL NAMES THE INSTRUMENT, NOT THE FIELD. This is a deliberate divergence from
 * chromaticSpeller's jurisdiction (engine/chord.mjs — the codebase's law for spelling a
 * chromatic pitch class against a key), and §4.4 requires the reason written down, never a
 * silent departure: under the speller the six labels would re-spell on every key change —
 * the nut flickering between E♭ and D♯ while nothing about the guitar has moved — which is
 * a worse answer to "what am I in?" and breaks the one-thing-moves rule. The key is not an
 * input here. Recorded in notes/specs/multetudes-divergence-register.md.
 *
 * A leaf module — it imports nothing — so a card that needs a set's label can take the
 * label without the tetrad engine's tree (rule 6 for notepad-card's SETS, the absorbed chore).
 * Pure; load-time assertions.
 */

/** the twelve names, each pitch class spelled both ways — [sharp, flat]; a natural is both */
const NAMES = [["C", "C"], ["C♯", "D♭"], ["D", "D"], ["D♯", "E♭"], ["E", "E"], ["F", "F"],
  ["F♯", "G♭"], ["G", "G"], ["G♯", "A♭"], ["A", "A"], ["A♯", "B♭"], ["B", "B"]];

const mod12 = (n) => ((n % 12) + 12) % 12;

/** the open string's name from its sounding midi and its STANDARD midi: the direction of the
 * move chooses the accidental; a natural is a natural whichever way it was reached */
export function openStringName(midi, standardMidi) {
  if (!Number.isInteger(midi) || !Number.isInteger(standardMidi))
    throw new Error("open-string: a name needs the string's midi and its standard midi, both integers");
  const [sharp, flat] = NAMES[mod12(midi)];
  return midi < standardMidi ? flat : sharp;   // unmoved (midi === standard) is a natural, spelled either way the same
}

/** a set's label, HIGH → LOW (Shell 4's reading, N4's uppercase from the names themselves),
 * en-dashed — string-run's label rule and the notepad card's, one derivation */
export function setLabel(strings, opens, standard) {
  return [...strings].sort((a, b) => a - b).map((s) => openStringName(opens[s], standard[s])).join("–");
}

{
  if (NAMES.length !== 12) throw new Error("open-string: twelve names");
  for (const [s, f] of NAMES) if (typeof s !== "string" || typeof f !== "string") throw new Error("open-string: every pitch class has two spellings");
  if (openStringName(38, 40) !== "D" || openStringName(39, 40) !== "E♭" || openStringName(42, 40) !== "F♯")
    throw new Error("open-string: the direction rule does not hold — drop D reads D, down one E♭, up two F♯");
}
