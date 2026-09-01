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

export const DEFERRALS = [
  {
    name: "register-3-page-skin",
    deferred: "the house page skin becomes v0.9's (white ground, system font "
      + "stack, the smaller title) — Daniel's direction 2026-08-28, register "
      + "entry 3: one family ruling, one shell.mjs edit, one republish of "
      + "every door",
    until: "the beta reconciliation — whose own tracked trace is the "
      + "OWED_DRIFT ledger emptying (the bundle re-inlines the owed modules)",
    due: () => OWED_DRIFT.size === 0,
    built: () => !read("hub/shell.mjs").includes("#ECECEE"),
    then: "raise the family skin ruling with the RTE; the diff gate's "
      + "allow-listed chrome class retires with it",
  },
  {
    name: "sharp-census-pin",
    deferred: "the sharper carrier-census form (owed drift excused only for "
      + "hand-authored carriers; DERIVED door builds pin verbatim always) — "
      + "drafted 260913 and REVERTED the same night: the published "
      + "tetradetudes study is itself a derived build still carrying the "
      + "known marker debt, so the sharp pin cannot land before the republish",
    until: "the beta republish — the same tracked trace: OWED_DRIFT empties",
    due: () => OWED_DRIFT.size === 0,
    built: () => !read("engine/tests/carrier-census.test.mjs")
      .includes("and REVERTED"),
    then: "re-apply the draft from the night-17 report and delete its "
      + "revert comment — the built() probe here reads that comment",
  },
];

/** verdictOf(entry) → "expired" | "due" | "quiet" — the one rule, so the
 * walk and the mechanism proof cannot disagree about what the ledger means */
export const verdictOf = (e) =>
  e.built() ? "expired" : e.due() ? "due" : "quiet";
