/* tunings.test.mjs — ALTERNATE TUNINGS, ITEM 2: the string labels are the editor (night 47, 261009)
 *
 * engine/tunings.mjs is the vocabulary the editor reads: THE NAMED TABLE — drop D · DADGAD ·
 * open G · open D · open E · half-step down · whole-step down · drop C — stated ONCE as data
 * (a vocabulary, not a computable fact), read both ways: a name applies its offsets, and the
 * row NAMES ITSELF when the six steppers spell one, derived by comparing offsets against the
 * same table — never a second list. And THE STEP: a stepper that would carry a string past a
 * neighbour, or out of the ±6 window, is inert AT THE POINT OF THE MOVE and says why, there —
 * naming the neighbouring string by what it is and what it sounds (rule 14), never reaching
 * assertOpens's throw, which is the wrong layer for a user-facing "no".
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { NAMED_TUNINGS, nameOf, canStep, stepped, totalOffsets, STANDARD_NAME } from "../tunings.mjs";
import { opensOf, OPEN_MIDI, STRINGS, TUNING_RANGE } from "../field.mjs";
import { openStringName } from "../open-string.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DADGAD = { 6: -2, 2: -2, 1: -2 };

test("the named table: eight names, each a well-formed tuning, each name once — one statement", () => {
  assert.deepEqual(NAMED_TUNINGS.map((t) => t.name), ["drop D", "DADGAD", "open G", "open D", "open E", "half-step down", "whole-step down", "drop C"]);
  for (const t of NAMED_TUNINGS) assert.doesNotThrow(() => opensOf(t.offsets), `${t.name} is a legal tuning`);
  assert.equal(new Set(NAMED_TUNINGS.map((t) => JSON.stringify(totalOffsets(t.offsets)))).size, NAMED_TUNINGS.length, "no two names spell one tuning");
  // the letters the table spells, low to high, by the item-1 rule — drop D reads D, DADGAD reads D A D G A D
  const letters = (offsets) => { const o = opensOf(offsets); return STRINGS.map((s) => openStringName(o[s], OPEN_MIDI[s])).join(" "); };
  assert.equal(letters(NAMED_TUNINGS[0].offsets), "D A D G B E"); assert.equal(letters(NAMED_TUNINGS[1].offsets), "D A D G A D");
  assert.equal(letters(NAMED_TUNINGS[2].offsets), "D G D G B D"); assert.equal(letters(NAMED_TUNINGS[3].offsets), "D A D G♭ A D", "open D: the third string down one reads G♭ by the direction rule — players say F♯; a consequence of the 261008 ruling, reported not settled");
  assert.equal(letters(NAMED_TUNINGS[4].offsets), "E B E G♯ B E"); assert.equal(letters(NAMED_TUNINGS[5].offsets), "E♭ A♭ D♭ G♭ B♭ E♭");
  assert.equal(letters(NAMED_TUNINGS[6].offsets), "D G C F A D"); assert.equal(letters(NAMED_TUNINGS[7].offsets), "C G C F A D");
});

test("read both ways: a name applies its offsets, and the row names itself by comparing offsets — no second list", () => {
  for (const t of NAMED_TUNINGS) assert.equal(nameOf(t.offsets), t.name, `${t.name} names itself`);
  assert.equal(nameOf(totalOffsets(DADGAD)), "DADGAD", "a total map and a sparse one are the same tuning");
  assert.equal(nameOf({}), STANDARD_NAME); assert.equal(nameOf(null), STANDARD_NAME); assert.equal(nameOf({ 6: 0 }), STANDARD_NAME);
  assert.equal(nameOf({ 6: -2, 2: -2 }), null, "one string short of DADGAD is no name — the row ceases to name itself the moment one string moves");
  assert.equal(nameOf({ 6: -2, 2: -2, 1: -2, 3: 1 }), null);
  // ONE TABLE (rule 6): the names appear in tunings.mjs and in no other engine or hub source
  const src = readFileSync(join(here, "..", "tunings.mjs"), "utf8");
  assert.equal((src.match(/DADGAD/g) || []).length, 1, "DADGAD is typed once in the module — the name, in the table");
  const ENGINE = join(here, ".."), HUB = join(here, "..", "..", "hub", "modules");
  const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");   // comment-blind: a comment may cite the name, code may not list it
  for (const dir of [ENGINE, HUB]) for (const f of readdirSync(dir).filter((x) => x.endsWith(".mjs") && x !== "tunings.mjs"))
    assert.ok(!/DADGAD/.test(code(readFileSync(join(dir, f), "utf8"))), `${f} spells DADGAD in code — a second table`);
});

test("THE STEP, refused at the point of the move: a crossing is inert and says which neighbour it would pass and what that string sounds", () => {
  // string 5 (A, 45) up: +1 A♯ … +4 C♯ legal; +5 would sound D = string 4's open D — refused before the throw
  let t = {};
  for (let i = 0; i < 4; i++) { const r = canStep(t, 5, +1); assert.equal(r.ok, true, `step ${i + 1} up on string 5 is legal`); t = stepped(t, 5, +1); }
  assert.equal(opensOf(t)[5], 49, "C♯");
  const r = canStep(t, 5, +1);
  assert.equal(r.ok, false);
  assert.match(r.reason, /string 4/, "names the neighbour by its number");
  assert.match(r.reason, /\bD\b/, "…and by what it sounds");
  assert.ok(!/bind|checkbox|button|stepper/i.test(r.reason), "rule 14: no caption");
  assert.doesNotThrow(() => opensOf(t), "the refusal came before any throw");
  assert.throws(() => opensOf({ ...totalOffsets(t), 5: totalOffsets(t)[5] + 1 }), /cross|ascend/i, "…which assertOpens would have thrown, one layer down");
  // the window: string 6 down six is legal (A♭? no — B♭1, 34), down seven is not, and the reason names the window
  let s6 = {}; for (let i = 0; i < 6; i++) s6 = stepped(s6, 6, -1);
  assert.equal(canStep(s6, 6, -1).ok, false); assert.match(canStep(s6, 6, -1).reason, /six|±6|window/i);
  assert.equal(canStep(s6, 6, +1).ok, true);
  // the top string has no neighbour above, the bottom none below: only the window bounds them
  assert.equal(canStep({}, 1, +1).ok, true); assert.equal(canStep({}, 6, -1).ok, true);
  // a down-step that would fall onto the lower neighbour: string 4 (D, 50) down five = A = string 5's open — refused
  let s4 = {}; for (let i = 0; i < 4; i++) s4 = stepped(s4, 4, -1);
  const r4 = canStep(s4, 4, -1); assert.equal(r4.ok, false); assert.match(r4.reason, /string 5/); assert.match(r4.reason, /\bA\b/);
});

test("stepped() never produces what canStep refuses, and DADGAD is six semitone steps from standard", () => {
  let t = {};
  for (const [s, n] of [[6, 2], [2, 2], [1, 2]]) for (let i = 0; i < n; i++) { assert.ok(canStep(t, s, -1).ok); t = stepped(t, s, -1); }
  assert.equal(nameOf(t), "DADGAD");
  assert.deepEqual(totalOffsets(t), { 1: -2, 2: -2, 3: 0, 4: 0, 5: 0, 6: -2 });
  assert.throws(() => stepped(t, 5, +7), /refused|cross|window/i, "stepped refuses what canStep refuses");
  assert.equal(TUNING_RANGE, 6);
});
