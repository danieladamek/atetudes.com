/* _deferrals.mjs — THE DEFERRAL REGISTER (260914, item 4).
 *
 * A ruling that defers work "until X" is a debt with no due date unless
 * something WATCHES for X. The proof is the fixed reference: reference.mjs's
 * own 260831 sentence deferred the fixed half "until the chords change,
 * which is child 7's progression" — child 7 landed 260901, and the
 * precondition sat MET and unwatched for thirteen days until Daniel hit the
 * contradiction on a live page (260914, item 1 built the missing half).
 * The divergence register records divergences; it did not record deferrals.
 * This ledger does, on OWED_DRIFT's own pattern: dated, bounded, loud when
 * forgotten, and SELF-EXPIRING IN BOTH DIRECTIONS —
 *
 *   - precondition MET while the work is unbuilt  → the walk goes RED:
 *     the debt is due; build it or re-defer against a NEW precondition.
 *   - work BUILT                                  → the walk goes RED:
 *     the entry has expired; remove it (a ledger that keeps settled debts
 *     stops being read — OWED_DRIFT's own rule).
 *   - precondition unmet                          → quiet.
 *
 * It covers DEFERRALS ("until X") and RULINGS-NOT-YET-BUILT alike: a ruling
 * is a deferral whose precondition is the ruling itself having landed.
 *
 * Preconditions and built-probes read TRACKED artifacts only (the v0.9
 * oracle lesson: CI cannot see the vault, so a probe into notes/ would make
 * the walk lie green in CI). Each probe asserts on the artifact, never on
 * an intention. */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { OWED_DRIFT } from "./_carriers.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

/* RECONCILED 260915 (the stable pass): three entries left the register the
 * night the beta reconciliation landed —
 *   register-3-page-skin    EXPIRED (built: the shell wears v0.9's skin)
 *   sharp-census-pin        EXPIRED (built: the sharp form landed in
 *                           carrier-census.test.mjs)
 *   non-diatonic-collections FIRED DUE exactly as designed (its precondition,
 *                           the reconciliation, was met by the same night;
 *                           no later observable precondition exists, so per
 *                           its own `then` it moved to the backlog as a
 *                           version of its own — the ruling's caution:
 *                           "someday" does not get an entry)
 * The firing is the mechanism proven on real entries, end to end. */
export const DEFERRALS = [
  {
    /* 260918 (night 24) — CR-1 §6's deferred half. THE DISPATCH'S PROBES WERE
     * WRONG ON THE ARTIFACT, corrected here: (1) its `until` said the harmony
     * "cannot yet select a chord whose tones leave the key" — it can, today:
     * a custom change of Db7 in B♭ major partitions R, 5 and 7 off the key
     * and the face says so; (2) its `due` watched selection.mjs no longer
     * refusing (…), which the approach half lifted the SAME night, so the
     * entry would have fired DUE the moment it was written. The precondition
     * that is genuinely unmet is DANIEL'S: the v1.4 Spec amendment extending
     * §2.6's colour rule to chromatic CHORD tones, observable as the Spec's
     * own frontmatter version.
     * PROBE RE-KEYED 260930 (night 36, rule 7): v1.4 LANDED — but as the
     * non-diatonic MARK (shape carries chromaticity, colour tracks the
     * altered degree, the interior; Update Log 260930.1), which governs
     * every derived note event's DRAWING. Role A's own sentence — a
     * chord-supplied chromatic tone is MATERIAL, a member of the harmony
     * rather than of the field (CR-1 §4's fieldPartition) — is a doctrine
     * the Spec still does not state, and the pass lands whole with it.
     * The version number was the wrong observable (it fired on a night
     * that ruled the mark, not the material); the clause is the right one. */
    name: "chromatic-chord-alterations",
    deferred: "CR-1 role A — a chord-supplied chromatic tone is MATERIAL (a "
      + "member of the harmony) rather than a member of the field; drawn "
      + "full-size, solid (§2.6's role channel). Ruled 260918; its COLOUR is "
      + "unratified: Spec §2.6 governs approach tones only, and extending "
      + "violet to chromatic CHORD tones needs a v1.4 amendment with an Update "
      + "Log entry — Daniel's, not a build session's. Multetudes CAN already "
      + "select such a chord (custom changes), so nothing but the ruling waits",
    until: "the Spec states role A's MATERIAL clause — a chord-supplied "
      + "chromatic tone is a member of the harmony, drawn full-size and solid "
      + "with v1.4's non-diatonic mark (Update Log 260930.1 ruled the mark; "
      + "the material doctrine is Daniel's next amendment, with the pass). "
      + "Observable: §2.6 carries the words 'chord-supplied' and 'material'",
    due: () => /chord-supplied[\s\S]{0,200}material/i.test(read("docs/design-language-and-engine-spec.md")),
    built: () => /fieldPartition[\s\S]{0,400}material/.test(read("engine/tests/selection.test.mjs")),
    then: "build role A WITH the CR-1 §4 fieldPartition amendment in the same "
      + "pass — the doctrine sentence and the behaviour must not land apart — "
      + "then remove this entry",
  },
  {
    name: "extended-symbol-naming",
    deferred: "read-back naming past the 9th — assembleSuffix's vocabulary "
      + "stops before 11/13, so chordAt's diatonic 11ths/13ths fall back to "
      + "the bare root with the honest-unnamed sentence (interim, ruled "
      + "260915). Half-done naming produces confidently WRONG names, so the "
      + "pass lands whole: alterations, omissions, slash forms, the round "
      + "trip through chord.mjs",
    until: "the naming pass — MEASURED 260915: assembleSuffix already "
      + "speaks 13/m13 (dominant and minor); what is missing is the MAJOR "
      + "branch (no maj11/maj13) and round-trips the law refuses. The "
      + "pass's first observable trace is maj13 entering the vocabulary",
    due: () => /maj13/.test(read("engine/reference.mjs")),
    built: () => /thirteenth[\s\S]{0,200}(names|named)/.test(
      read("engine/tests/reference.test.mjs")),
    then: "finish the pass WITH its pins (a diatonic 13th names, asserted), "
      + "retire the interim unnamed sentence where read-back now answers, "
      + "and remove this entry — a taught vocabulary without its pins is "
      + "the loud middle state this entry exists to catch",
  },
];

/** verdictOf(entry) → "expired" | "due" | "quiet" — the one rule, so the
 * walk and the mechanism proof cannot disagree about what the ledger means */
export const verdictOf = (e) =>
  e.built() ? "expired" : e.due() ? "due" : "quiet";
