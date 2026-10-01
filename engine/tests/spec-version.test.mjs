/* spec-version.test.mjs — A PAGE NEVER CLAIMS A SPEC VERSION THE SPEC DOES NOT CLAIM (night 79, dispatch item 2A).
 *
 * The second hand-kept version to drift: triadetudes' footer said "Colors per At-Etudes Design Spec v1.1" while the
 * Spec's own frontmatter said v1.4. The version is READ FROM THE SPEC (docs/design-language-and-engine-spec.md,
 * `doc_version:`), never typed here.
 *
 * SUBJECT: a CLAIM a visitor reads — "Design Spec vX.Y" / "Spec vX.Y" in a page's visible text.
 * SCOPE, stated (rule 16) —
 *   COVERED: the visible text of every maintained published study (driftScope — doors and hand pages alike, read as
 *     artifacts), and the site's own content/ and layouts/ sources.
 *   NOT COVERED, named: (1) scripts, styles and HTML comments — a code comment such as "Design Spec v1.4 §2.6" cites
 *     WHERE a clause came from (provenance), and stays true when the Spec moves on; (2) text a script writes at
 *     runtime; (3) tetrad-voice-leading — frozen (R3), printed EXMT; (4) generators' source comments ("palette, Spec
 *     v1.1" is provenance).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { STUDY_SLUGS, driftScope } from "./_carriers.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLAIM = /\bSpec,?\s+(v\d+\.\d+)\b/gi;

/** what a visitor reads: scripts, styles and comments removed, tags stripped */
export const visibleText = (html) => html
  .replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ")
  .replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ");

const walk = (dir, out = []) => {
  if (!existsSync(join(REPO, dir))) return out;
  for (const name of readdirSync(join(REPO, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(REPO, rel)).isDirectory()) walk(rel, out);
    else if (/\.(md|html)$/.test(name)) out.push(rel);
  }
  return out;
};

test("a page names only the Spec version the Spec itself claims — read from the Spec, never typed", () => {
  const spec = readFileSync(join(REPO, "docs", "design-language-and-engine-spec.md"), "utf8");
  const own = (spec.match(/^doc_version:\s*(v\d+\.\d+)\s*$/m) || [])[1];
  assert.ok(own, "the Spec's frontmatter states no doc_version — the check has nothing to compare against");
  const pages = driftScope(STUDY_SLUGS, "the Spec version a page claims").bound.map((s) => `static/studies/${s}/study.html`);
  const site = [...walk("content"), ...walk("layouts")];
  const wrong = [], claims = [];
  for (const rel of [...pages, ...site]) {
    const text = visibleText(readFileSync(join(REPO, rel), "utf8"));
    for (const m of text.matchAll(CLAIM)) {
      claims.push(`${rel}: ${m[1]}`);
      if (m[1].toLowerCase() !== own.toLowerCase()) wrong.push(`${rel}: claims Spec ${m[1]} — the Spec says ${own}`);
    }
  }
  assert.equal(wrong.length, 0, "a page claims a Spec version the Spec does not:\n" + wrong.join("\n"));
  assert.ok(pages.length >= 5, `not vacuous: ${pages.length} pages scanned`);
  console.log(`  the Spec claims ${own} · ${pages.length} pages + ${site.length} site sources read as visible text · ` +
    `${claims.length} version claim(s): ${claims.join(", ") || "none"}`);
});
