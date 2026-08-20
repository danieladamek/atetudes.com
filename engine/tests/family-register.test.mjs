/* The family register's own gate: the register is complete, well-formed, and
 * agrees with the carrier census about who the family is. The register exists
 * to answer "which APPS?" for a shared UI idiom (the question three
 * propagations in two days answered by hand — see _family.mjs's header); this
 * suite makes sure the answer cannot rot.
 *
 * The FLOOR itself (Ruling 2's four surfaces, asserted at the artifact level
 * in a real browser) lives in tools/family_floor.py — a node test cannot
 * click a fretboard. This file asserts only what is checkable statically:
 * completeness, shape, and that registered handles exist in the published
 * bytes, so a renamed control fails HERE, in CI, before the browser suite
 * ever runs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FAMILY, appsOf, SURFACE_NAMES } from "./_family.mjs";
import { CENSUS } from "./_carriers.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const studiesDir = join(here, "..", "..", "static", "studies");

test("§4.3 family: every published study has exactly one register entry", () => {
  const dirs = readdirSync(studiesDir)
    .filter((d) => statSync(join(studiesDir, d)).isDirectory())
    .sort();
  assert.deepEqual([...FAMILY.keys()].sort(), dirs,
    "the register and static/studies/ disagree — a study cannot ship " +
    "unregistered, and a register entry cannot outlive its study");
});

test("§4.3 family: the register and the carrier census name the same family", () => {
  assert.deepEqual([...FAMILY.keys()].sort(), [...CENSUS.keys()].sort(),
    "two censuses, two families — the register must cover exactly the " +
    "studies the carrier census covers");
});

test("§4.3 family: entries are well-formed and appsOf() answers the idiom question", () => {
  for (const [slug, entry] of FAMILY) {
    assert.ok(["app", "chart"].includes(entry.kind),
      `[${slug}] kind must be "app" or "chart", got ${entry.kind}`);
    for (const [name, handles] of Object.entries(entry.surfaces)) {
      assert.ok(SURFACE_NAMES.includes(name),
        `[${slug}] unknown surface "${name}" — the floor names four`);
      assert.ok(Object.keys(handles).length > 0,
        `[${slug}] surface "${name}" declares no handles`);
    }
    assert.equal(Object.keys(entry.surfaces).length === 0, entry.kind === "chart",
      `[${slug}] a chart study declares no surfaces; an app declares at least one`);
  }
  const apps = appsOf();
  assert.ok(apps.length >= 4, `only ${apps.length} apps registered — the family has at least four`);
  assert.ok(!apps.includes("modes-from-pentatonic-boxes"), "a chart study is not an idiom target");
});

test("§4.3 family: every registered id handle exists in the published bytes", () => {
  // the browser suite asserts behaviour; this asserts the HANDLE, statically,
  // so a renamed control fails in CI with the study and surface named
  for (const [slug, entry] of FAMILY) {
    const page = readFileSync(join(studiesDir, slug, "study.html"), "utf8");
    for (const [surface, handles] of Object.entries(entry.surfaces))
      for (const [role, sel] of Object.entries(handles)) {
        const m = sel.match(/^#([A-Za-z][\w-]*)/);
        assert.ok(m, `[${slug}] ${surface}.${role} handle "${sel}" must anchor on an id`);
        assert.ok(page.includes(`id="${m[1]}"`),
          `[${slug}] ${surface}.${role} names #${m[1]} and the published study has no such id — ` +
          `the register is wrong or the control was renamed without updating it`);
      }
  }
});
