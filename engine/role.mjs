/* role.mjs — THE ROLE A TONE WEARS IN A CHORD, spelled once (night 71, 261028 — PO ruling 261028).
 *
 * NAMED stackRole, NOT spellRole (the name the ruling approved): engine/chord.mjs already exports a spellRole — it
 * spells a tone's NOTE NAME (the 7th of C7 is Bb) from the root's letter — and chord.mjs is pinned byte for byte into
 * the hand-authored studies, so it cannot be renamed. Two exports of one name for two different things is a trap; the
 * name here says the doctrine instead: the STACK position names the role.
 *
 * *** AN INTERVAL DOES NOT NAME A CHORD ROLE. THE STACK POSITION DOES. ***
 *
 * Five semitones above a root is the 11 of a tetrad's stack or the 4 of a sus chord; six is the b5 of a diminished
 * fifth or the #11 over a perfect one. So semitones → role is not a function, and a table keyed by the interval alone
 * must pick one answer arbitrarily. stackRole takes BOTH facts — the stack degree the tone fills (1, 3, 5, 7, 9, 11,
 * 13, or 2, 4, 6 where a chord carries them) and its distance above the root — and COMPUTES the accidental: the
 * distance measured against the major scale's own distance for that degree (golden rule 1: computed, never chosen).
 *   stackRole(5, 6)  → "b5"    stackRole(11, 6) → "#11"    stackRole(7, 9) → "bb7"    stackRole(1, 0) → "R"
 *
 * THE SOURCE FOR ANYTHING NEW. Its consumers tonight: the chord symbol (reference.mjs's assembly) and the chip row's
 * role labels — both on one face, so they agree by construction.
 *
 * THE ONE NAMED SECOND VOCABULARY (outstanding, step B of ruling 261028): engine/upper-structure.mjs keeps its own
 * label tables (LABEL_SEMIS / LABEL_LETTER / IV_LABEL). It serves only triadetudes — a hand-authored published page
 * that the carrier census pins byte for byte — so it moves onto this function when triadetudes becomes a door, or by
 * a re-copy ruled separately. It is named HERE and in the step-B item only. A THIRD vocabulary must never appear.
 */
import { SCALE_STEPS } from "./chord.mjs";

/* the major scale's distance above its root for degrees 1…7 — DERIVED from the one scale table, not typed */
const MAJOR = SCALE_STEPS.major.slice(0, 6).reduce((acc, s) => acc.concat(acc[acc.length - 1] + s), [0]);

/** the role of a tone that fills stack `degree` (1…13) at `semitones` above the chord's root */
export function stackRole(degree, semitones) {
  if (!Number.isInteger(degree) || degree < 1 || degree > 13)
    throw new Error(`stackRole: a stack degree is 1…13, not ${degree}`);
  if (!Number.isInteger(semitones)) throw new Error(`stackRole: semitones must be an integer, not ${semitones}`);
  const ref = MAJOR[(degree - 1) % 7];
  let d = (((semitones - ref) % 12) + 12) % 12;
  if (d > 6) d -= 12;
  if (degree === 1) {
    if (d !== 0) throw new Error(`stackRole: the root is 0 semitones above itself, not ${semitones}`);
    return "R";
  }
  if (Math.abs(d) > 2) throw new Error(`stackRole: ${semitones} semitones cannot fill degree ${degree} (${d > 0 ? "+" : ""}${d} from its major distance)`);
  return (d < 0 ? "b".repeat(-d) : "#".repeat(d)) + degree;
}

/* ---------------- load-time assertions (golden rule 1, site form) ---------------- */
{
  if (MAJOR.join(",") !== "0,2,4,5,7,9,11") throw new Error(`role: the major reference did not derive to 0,2,4,5,7,9,11 — ${MAJOR}`);
  const cases = [[1, 0, "R"], [3, 4, "3"], [3, 3, "b3"], [5, 7, "5"], [5, 6, "b5"], [5, 8, "#5"], [7, 11, "7"], [7, 10, "b7"],
    [7, 9, "bb7"], [9, 2, "9"], [9, 1, "b9"], [9, 3, "#9"], [11, 5, "11"], [11, 6, "#11"], [13, 9, "13"], [13, 8, "b13"],
    [4, 5, "4"], [2, 2, "2"], [6, 9, "6"]];
  for (const [deg, st, want] of cases) {
    const got = stackRole(deg, st);
    if (got !== want) throw new Error(`role: stackRole(${deg}, ${st}) is "${got}", not "${want}"`);
  }
  // THE DOCTRINE, asserted: one interval, two stack positions, two roles
  if (stackRole(5, 6) === stackRole(11, 6) || stackRole(11, 5) === stackRole(4, 5))
    throw new Error("role: an interval named a role on its own — the stack position must decide it");
}
