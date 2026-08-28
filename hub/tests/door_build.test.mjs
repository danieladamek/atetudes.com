/* door_build.test.mjs — the CI-runnable half of the door gate.
 *
 * node:test, zero dependencies, same as the engine suite. It runs the whole
 * derivation and the artifact greps, which need no browser:
 *
 *   - every door resolves, so the style-ownership rule and the §4.2.1 bans
 *     (dynamic import, lookup-by-string) are enforced on every push
 *   - every door builds
 *   - the built file contains no pruned script, markup or style token, and
 *     DOES contain every reached one
 *
 * The half that genuinely needs a browser — the rendered control partition,
 * the file:// offline check, and the orphan-selector check — lives in
 * tests/door_locks.py and stays a local gate: Playwright in CI would be a new
 * dependency, which is Daniel's call under the charter's no-frameworks rule.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { listDoors, resolveDoor, REPO, HUB } from "../tools/resolve.mjs";

const DECL = /^(?:export\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;
const IMPORT_LINE = /^\s*import\s[\s\S]*?from\s+"[^"]+"\s*;?\s*$/gm;

const codeLines = (rel) => new Set(
  readFileSync(join(REPO, rel), "utf8").replace(IMPORT_LINE, "")
    .replace(/^export\s+/gm, "").split("\n").map((l) => l.trim())
    .filter((l) => l.length >= 16 && !/^[*/]/.test(l)));

/** identifiers the file declares, plus the code lines no reached file shares.
 *
 * A MARKER MUST BE DISTINCTIVE AGAINST THE RETAINED CORPUS, and distinctive the
 * same way it is tested against the artifact — as a substring, since that is how
 * the grep asks. Filtering lines by exact-line equality is not enough: a bare
 * `throw new Error(` continuation line is a line no other file HAS and a
 * substring almost every file CONTAINS. Identifiers were not filtered at all,
 * which broke the moment two modules shared a name (engine/motion.mjs declares
 * a local `placeOnSet`; engine/tetrad-voicings.mjs exports one).
 *
 * A non-distinctive marker fails on a door that is correct, and a gate that
 * cries wolf is a gate people learn to skip. Dropping it costs nothing — the
 * module's other markers still carry the check, and the assertion below fails
 * loudly if a module is left with none. Mirrors hub/tests/door_locks.py. */
function markers(rel, retained) {
  const src = readFileSync(join(REPO, rel), "utf8");
  const corpus = retained.map((f) => readFileSync(join(REPO, f), "utf8")).join("\n");
  const names = [...new Set([...src.matchAll(DECL)].map((m) => m[1]))]
    .filter((n) => !new RegExp("\\b" + n.replace(/[$]/g, "\\$&") + "\\b").test(corpus));
  const shared = new Set(retained.flatMap((f) => [...codeLines(f)]));
  const lines = [...codeLines(rel)].filter((l) => !shared.has(l) && !corpus.includes(l));
  return { names, lines };
}

const escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (html, m) => new RegExp("\\b" + m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(html);

test("hub: every door resolves — ownership rule and the static-derivation bans hold", async () => {
  const doors = listDoors();
  assert.ok(doors.length >= 2, "the gate needs a door that keeps the module and one that prunes it");
  for (const d of doors) await resolveDoor(d);   // throws with the violation named
});

test("hub: every door builds, and the artifact carries exactly its reach-set", async () => {
  execFileSync("node", ["hub/tools/build.mjs"], { cwd: REPO });
  for (const d of listDoors()) {
    const r = await resolveDoor(d);
    const file = join(HUB, "build", d + ".html");
    assert.ok(existsSync(file), `${d}: nothing was built`);
    const html = readFileSync(file, "utf8");

    for (const rel of r.filesOut) {
      const { names, lines } = markers(rel, r.filesIn);
      assert.ok(names.length, `[${d}] PRUNED ${rel} yielded no markers — the grep would be vacuous`);
      for (const n of names)
        assert.ok(!has(html, n), `[${d}] built file contains "${n}" from PRUNED ${rel}`);
      for (const l of lines)
        assert.ok(!html.includes(l), `[${d}] built file contains a line of PRUNED ${rel}`);
    }
    for (const rel of r.filesIn) {
      const { names } = markers(rel, []);
      assert.ok(names.some((n) => has(html, n)),
        `[${d}] built file carries no marker of REACHED ${rel}`);
    }
    // markup and styles: a pruned module's tokens in any form they could survive
    for (const tok of r.tokensAbsent) {
      for (const form of [`id="${tok}"`, `class="${tok}"`])
        assert.ok(!html.includes(form),
          `[${d}] built file contains ${form} — its module is pruned, so neither its ` +
          `markup nor its styles may ship`);
      // boundary-matched: ".cur" must not hit ".currentTime" — the marker
      // lesson in the markup grep (mirrors door_locks.py, 260829)
      for (const pre of ["#", "."])
        assert.ok(!new RegExp(escapeRe(pre + tok) + "(?![\\w-])").test(html),
          `[${d}] built file contains ${pre}${tok} — its module is pruned, so neither its ` +
          `markup nor its styles may ship`);
    }
    assert.ok(r.tokensAbsent.length || !r.modulesOut.length,
      `[${d}] modules were pruned but own no markup tokens — the markup grep is vacuous`);
    for (const c of r.controlsAbsent)
      assert.ok(!html.includes(`id="${c}"`), `[${d}] LOCKED control #${c} is in the built file`);
    for (const c of r.controlsPresent)
      assert.ok(html.includes(`data-control="${c}"`), `[${d}] control #${c} never reached the file`);
    assert.ok(!/<script\s+src|<link\s+rel="stylesheet"/.test(html),
      `[${d}] the file is not self-contained`);
  }
});

test("hub: the doors differ — a gate where both doors ship the same thing proves nothing", async () => {
  const sizes = [];
  for (const d of listDoors()) {
    const r = await resolveDoor(d);
    sizes.push({ d, files: r.filesIn.length, out: r.filesOut.length,
      bytes: readFileSync(join(HUB, "build", d + ".html"), "utf8").length });
  }
  const most = Math.max(...sizes.map((s) => s.bytes));
  const least = Math.min(...sizes.map((s) => s.bytes));
  assert.ok(most > least * 2,
    `the doors are within 2× of each other (${sizes.map((s) => s.d + " " + s.bytes).join(", ")}) — ` +
    `the single-file promise is only preserved if a lock actually removes weight`);
  assert.ok(sizes.some((s) => s.out > 0), "no door prunes anything");
});
