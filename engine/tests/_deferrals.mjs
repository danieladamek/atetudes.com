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
 * The firing is the mechanism proven on real entries, end to end.
 * SETTLED 261011 (night 46): chromatic-chord-alterations EXPIRED — its `due` fired the moment
 * §2.6's material clause landed (ratified 261010; the words the probe was keyed on), and `built`
 * fired on selection.test's role-A assertion the same pass, per its own `then`; the entry left
 * with the work. The re-keying history stays in git. */
export const DEFERRALS = [
  {
    /* 261001 (night 37, item 2): the unfretted reference is BUILT as a named
     * offer (reference.mjs `offer`, drawn on the neck in the gutter below
     * the strings) — and it does not yet SOUND. The stringless bass a
     * sounding offer would need is exactly G11's exemption in
     * note-events.mjs ("event carries no real string" is asserted for every
     * chord event and skipped for the bass). That exemption stays a DEBT:
     * blanket today, it should narrow to the one legitimate case. */
    name: "g11-bass-exemption",
    deferred: "note-events.mjs exempts its bass from the real-string "
      + "assertion (G11, priced with the release republish): a bass event "
      + "may carry no string at all, whatever it is. The unfretted "
      + "reference offer (261001) is the one case that legitimately has "
      + "no string; the exemption should narrow to it — a bass with no "
      + "string is the OFFER, asserted, and every other bass is a real "
      + "fretted note like every chord event",
    until: "the offer SOUNDS — a caller hands the walk the offer's pitch "
      + "as the reference (etude-walk reads `offer`), so a stringless bass "
      + "event exists on purpose. Observable: etude-walk.mjs reads the "
      + "offer for its refMidi",
    due: () => /refMidi[^\n]*offer|offer[^\n]*refMidi/.test(read("hub/modules/etude-walk.mjs")),
    built: () => /unfretted/.test(read("engine/note-events.mjs")),
    then: "narrow the exemption: a stringless bass event must carry the "
      + "offer's flag (unfretted: true) or throw naming the missing string; "
      + "pin it beside the chord-event assertion; then remove this entry",
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
