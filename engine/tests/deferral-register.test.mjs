/* deferral-register.test.mjs — the walk over _deferrals.mjs (260914, item 4).
 *
 * Two halves, deliberately separate: the MECHANISM is proven on planted
 * entries (all three verdicts, both loud directions), so the live walk's
 * quiet is distinguishable from a walk that never ran — rule 2: a gate must
 * be able to prove it ran, not merely that it did not fail. */

import test from "node:test";
import assert from "node:assert/strict";
import { DEFERRALS, verdictOf } from "./_deferrals.mjs";

// ---- the mechanism, proven on planted entries ------------------------------

test("the register's verdicts: met+unbuilt is DUE, built is EXPIRED, unmet is quiet", () => {
  const plant = (due, built) =>
    ({ name: "planted", due: () => due, built: () => built });
  assert.equal(verdictOf(plant(true, false)), "due",
    "a met precondition over unbuilt work is a debt come due — LOUD");
  assert.equal(verdictOf(plant(false, true)), "expired",
    "built work expires its entry — LOUD until the entry is removed");
  assert.equal(verdictOf(plant(true, true)), "expired",
    "built wins over due: settled is settled, remove the entry");
  assert.equal(verdictOf(plant(false, false)), "quiet",
    "an unmet precondition holds in silence");
});

// ---- the live ledger -------------------------------------------------------

test("the ledger is real and every probe RUNS — no vacuous quiet", () => {
  assert.ok(DEFERRALS.length >= 2,
    "the register opens with its two known deferrals (register-3's skin, "
    + "the sharp census pin)");
  for (const e of DEFERRALS) {
    assert.ok(e.name && e.deferred && e.until && e.then,
      `${e.name || "?"}: an entry states what, until-when and then-what`);
    assert.equal(typeof e.due(), "boolean", `${e.name}: due() answers`);
    assert.equal(typeof e.built(), "boolean", `${e.name}: built() answers`);
  }
});

for (const e of DEFERRALS) {
  test(`deferral watched: ${e.name}`, () => {
    const v = verdictOf(e);
    if (v === "expired")
      assert.fail(`${e.name} is BUILT — the deferral is settled; remove its `
        + `entry from _deferrals.mjs (deferred: ${e.deferred.slice(0, 80)}…)`);
    if (v === "due")
      assert.fail(`${e.name} is DUE — its precondition is met and the work `
        + `is unbuilt. Until: ${e.until} Then: ${e.then}`);
    assert.equal(v, "quiet");
  });
}
