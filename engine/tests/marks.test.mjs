/* marks.test.mjs — THE MARK IS THE SPEC'S, BY VALUE (night 46, item 4 — the checkable half of the
 * staleness pin). CR-1's mark table is prose in notes/ (untracked — a probe into it would lie green in
 * CI, the register's own rule), so it cannot be asserted; what CAN be is that the code's mark agrees
 * with docs/design-language-and-engine-spec.md §2.6 as it stands, parsed from the Spec's own words —
 * the palette's precedent (degree-palette.test parses §2.1). When the Spec moves and the code does not,
 * this fails BY NAME; the doctrine note is Daniel's to keep in step, and this is what tells him. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { STARBURST } from "../../hub/marks.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SPEC = readFileSync(join(here, "..", "..", "docs", "design-language-and-engine-spec.md"), "utf8");
const s26 = SPEC.slice(SPEC.indexOf("### 2.6"), SPEC.indexOf("### 2.6") + 6000);

test("§2.6 by value: the starburst's points and inner radius, the approach's weight ratio and its band, and the material clause — the code agrees with the Spec's own words", () => {
  const pts = s26.match(/starburst\*{0,2}\s*\((\w+) points, inner radius ([0-9.]+)/);
  assert.ok(pts, "§2.6 states the starburst's points and inner radius");
  const WORDS = { six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
  assert.equal(STARBURST.points, WORDS[pts[1]] || Number(pts[1]), `hub/marks.mjs's starburst has ${STARBURST.points} points; §2.6 says ${pts[1]}`);
  assert.equal(STARBURST.inner, Number(pts[2]), `hub/marks.mjs's inner radius is ${STARBURST.inner}; §2.6 says ${pts[2]}`);
  const ratio = s26.match(/Approach\s+tones draw at \*\*([0-9.]+) of the host marker's radius\*\*/);
  assert.ok(ratio, "§2.6 states the approach's ratio"); assert.equal(Number(ratio[1]), 0.6);
  const band = s26.match(/tuned within ([0-9.]+)–([0-9.]+) at render inspection/);
  assert.ok(band && Number(band[1]) <= 0.6 && 0.6 <= Number(band[2]), "the ratio sits in the Spec's own band");
  // the neck draws the approach at exactly that ratio of its r-13 host, and the member at the full 13
  const neck = readFileSync(join(here, "..", "..", "hub", "modules", "field-board.mjs"), "utf8");
  assert.ok(/starburst\(fx\(ap\.fret\), fy\(ap\.string\), 13 \* 0\.6\)/.test(neck), "the neck's approach starburst is 13 × 0.6");
  assert.ok(/starburst\(fx\(x\.fret\), fy\(x\.string\), 13\)/.test(neck), "the neck's chord-supplied member is the full 13, solid");
  // the material clause is the Spec's (the register's due predicate reads these words)
  assert.match(s26, /A chord-supplied chromatic tone is material/);
  assert.match(s26, /full radius and solid, as any chord tone does, wearing this section's\s+non-diatonic mark/);
});
