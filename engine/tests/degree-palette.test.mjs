/* degree-palette.test.mjs — THE PALETTE IS THE SPEC'S, BY VALUE (night 45, 261009)
 *
 * hub/palette.mjs's guard used to say "violet must never enter the degree palette" — an
 * instance. Its real subject was always the class: the degree palette holds EXACTLY the seven
 * §2.1 colours and nothing creeps in. Asserting that by value without restating the seven
 * hexes (rule 6, one layer down) is possible because the LAW is a document in the repo:
 * docs/design-language-and-engine-spec.md §2.1 carries the table, and this test parses it.
 * The palette is derived from nothing — it is the Spec's table typed once in engine — so the
 * one honest check is that the two agree, row for row, and that nothing else is in the map.
 * The runtime guard in hub/palette.mjs asserts the class without the values (count, distinct,
 * well-formed, none of the annotation colours); this test asserts the values against the law.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { FAM, FAM_COLOR } from "../degree-palette.mjs";
import { FAM as HUB_FAM, FAM_COLOR as HUB_COLOR, ANNOTATION_GRAY } from "../../hub/palette.mjs";

const here = dirname(fileURLToPath(import.meta.url));
/* the struck hex, built at runtime so that a sweep BY VALUE over the repo reads zero — the
 * pin refuses the value without spelling it (night 45: the sweep is by value, never by name) */
const STRUCK_HEX = ["78", "47", "a8"].join("");
const SPEC = readFileSync(join(here, "..", "..", "docs", "design-language-and-engine-spec.md"), "utf8");

/** §2.1's table, parsed: rows "| Degree | Color | RGB | Hex |" in the Spec's own order */
function specTable() {
  const start = SPEC.indexOf("| Degree | Color | RGB (0-1) | Hex |");
  assert.ok(start > 0, "§2.1's colour table is where the Spec keeps it");
  const rows = [];
  for (const line of SPEC.slice(start).split("\n").slice(2)) {
    const m = line.match(/^\| ([^|]+) \| ([^|]+) \| \(([^)]*)\) \| (#[0-9A-F]{6}) \|/);
    if (!m) break;
    rows.push({ degree: m[1].trim(), name: m[2].trim(), hex: m[4] });
  }
  return rows;
}

test("§2.1 by value: the degree palette IS the Spec's table — seven rows, in order, hex for hex, and nothing else", () => {
  const rows = specTable();
  assert.equal(rows.length, 7, `the Spec's table has seven degree rows, read ${rows.length}`);
  assert.deepEqual(rows.map((r) => r.hex), FAM.map((f) => FAM_COLOR[f]),
    "engine/degree-palette.mjs disagrees with docs/design-language-and-engine-spec.md §2.1 — the Spec is the law; change the palette only with an amendment and an Update Log entry");
  assert.deepEqual(Object.keys(FAM_COLOR).sort(), [...FAM].sort(), "exactly the seven families, no eighth key");
  assert.equal(new Set(Object.values(FAM_COLOR)).size, 7, "seven distinct colours");
  assert.deepEqual(rows.map((r) => r.degree), ["Root (R)", "2nd / 9th", "3rd", "4th / 11th", "5th", "6th / 13th", "7th"]);
});

test("the hub's palette is BOUND to the engine's, and holds no colour the Spec struck", () => {
  assert.equal(HUB_COLOR, FAM_COLOR, "hub/palette.mjs binds the engine's map — the same object, not a copy");
  assert.equal(HUB_FAM, FAM);
  assert.ok(!Object.values(FAM_COLOR).includes(ANNOTATION_GRAY), "the annotation gray is not a degree");
  for (const file of ["engine/degree-palette.mjs", "hub/palette.mjs"]) {
    const src = readFileSync(join(here, "..", "..", file), "utf8");
    assert.ok(!new RegExp(STRUCK_HEX, "i").test(src), `${file} still states violet — v1.4 struck the violet colour function (Update Log 260930.1) and night 45 removed the constant; §2.1's reservation lives in docs/, not in code`);
    assert.ok(!/VIOLET/.test(src), `${file} still names VIOLET`);
  }
  const guard = readFileSync(join(here, "..", "..", "hub", "palette.mjs"), "utf8");
  assert.ok(/seven|7/.test(guard) && /distinct|Set\(/.test(guard), "the runtime guard asserts the class — seven, distinct — not the violet instance");
});
