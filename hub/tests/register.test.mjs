/* register.test.mjs — the divergence register's CENSUS is derived, never
 * hand-maintained (the surface item, 2026-08-29).
 *
 * The register's prose rows are judgement; its census is fact, and the fact
 * comes from the door's own build: which hub modules the multetudes lock
 * reaches, and which of those no other door shares (the local variants). Both
 * lists in the register must equal the derivation — a fork nobody wrote down
 * fails CI by name, and a register row that outlives its module fails too.
 *
 * The register lives in notes/specs/ (the item names the path), and notes/ is
 * untracked — so in a checkout without it this suite SKIPS VISIBLY, naming
 * why, rather than passing vacuously or failing on an absent file. A skip is
 * printed by the runner; silence is not.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { listDoors, resolveDoor, REPO } from "../tools/resolve.mjs";

const REGISTER = join(REPO, "notes", "specs", "multetudes-divergence-register.md");

const hubModules = (r) =>
  r.modulesIn.filter((m) => m.rel.startsWith("hub/modules/")).map((m) => m.id);

test("the register's census equals the door's own build — family-shared and local variants", async (t) => {
  if (!existsSync(REGISTER)) {
    t.skip("notes/specs/multetudes-divergence-register.md is not in this checkout (notes/ is untracked) — the census is asserted only where the register exists");
    return;
  }
  const mine = new Set(hubModules(await resolveDoor("multetudes")));
  const elsewhere = new Set();
  for (const d of listDoors())
    if (d !== "multetudes")
      for (const id of hubModules(await resolveDoor(d))) elsewhere.add(id);
  const shared = [...mine].filter((id) => elsewhere.has(id)).sort();
  const local = [...mine].filter((id) => !elsewhere.has(id)).sort();

  const doc = readFileSync(REGISTER, "utf8");
  const censusAt = doc.indexOf("## The census");
  assert.ok(censusAt >= 0, "the register has no census section");
  const census = doc.slice(censusAt);
  const listed = (label) => {
    const m = census.match(new RegExp(label + "[^:]*:\\*\\*([^*]+?)(\\n\\n|$)", ""));
    assert.ok(m, `the census does not list ${label}`);
    return [...m[1].matchAll(/`([\w-]+)`/g)].map((x) => x[1]).sort();
  };
  assert.deepEqual(listed("Family components"), shared,
    "the register's family-shared list is not the build's — regenerate it from resolveDoor");
  assert.deepEqual(listed("Multetudes-only modules"), local,
    "the register's local-variant list is not the build's — a fork is missing its entry, or an entry outlived its module");
  // and every local variant has a covering entry somewhere in the prose
  for (const id of local)
    assert.ok(doc.includes(id),
      `local module "${id}" appears in no register entry — an unwritten divergence is a defect even under the ruling`);
});
