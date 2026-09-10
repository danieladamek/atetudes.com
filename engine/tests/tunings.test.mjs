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
import { NAMED_TUNINGS, nameOf, canStep, stepped, totalOffsets, STANDARD_NAME,
  readTuning, describeTuning, shiftWords, openLabel, canStepAll, steppedAll, SPELLING_OVERRIDES } from "../tunings.mjs";
import { opensOf, OPEN_MIDI, STRINGS, TUNING_RANGE } from "../field.mjs";
import { openStringName } from "../open-string.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DADGAD = { 6: -2, 2: -2, 1: -2 };

test("the named table: six names (the 261009 injection), each well-formed, each once; all fourths DERIVED", () => {
  assert.deepEqual(NAMED_TUNINGS.map((t) => t.name), ["drop D", "DADGAD", "open G", "open D", "open E", "all fourths"],
    "the row's final contents after standard — half-step down, whole-step down and drop C left (the global stepper is those); open E stays by ruling");
  for (const t of NAMED_TUNINGS) assert.doesNotThrow(() => opensOf(t.offsets), `${t.name} is a legal tuning`);
  assert.equal(new Set(NAMED_TUNINGS.map((t) => JSON.stringify(totalOffsets(t.offsets)))).size, NAMED_TUNINGS.length, "no two names spell one tuning");
  // the letters the table spells, low to high — by the LABEL rule (the name's own spelling on an exact match, else direction)
  const letters = (offsets) => STRINGS.map((s) => openLabel(offsets, s)).join(" ");
  const direction = (offsets) => { const o = opensOf(offsets); return STRINGS.map((s) => openStringName(o[s], OPEN_MIDI[s])).join(" "); };
  assert.equal(letters(NAMED_TUNINGS[0].offsets), "D A D G B E"); assert.equal(letters(NAMED_TUNINGS[1].offsets), "D A D G A D");
  assert.equal(letters(NAMED_TUNINGS[2].offsets), "D G D G B D"); assert.equal(letters(NAMED_TUNINGS[4].offsets), "E B E G♯ B E");
  assert.equal(letters(NAMED_TUNINGS[5].offsets), "E A D G C F", "all fourths");
  // THE ONE OVERRIDE (ruled 261009): open D reads F♯ at its own name where the direction rule says G♭
  assert.equal(direction(NAMED_TUNINGS[3].offsets), "D A D G♭ A D", "the direction rule alone, unchanged (open-string.mjs has no special case)");
  assert.equal(letters(NAMED_TUNINGS[3].offsets), "D A D F♯ A D", "the label prefers the name's own spelling");
  // all fourths, derived here independently of the module: a stack of perfect fourths from the sixth string's E
  const stack = {}; for (const s of STRINGS) stack[s] = OPEN_MIDI[6] + 5 * (6 - s);
  const derived = {}; for (const s of STRINGS) derived[s] = stack[s] - OPEN_MIDI[s];
  assert.deepEqual(derived, { 6: 0, 5: 0, 4: 0, 3: 0, 2: 1, 1: 1 }, "E A D G C F: strings 2 and 1 rise a semitone (the dispatch's {2:+1, 1:+1})");
  assert.deepEqual(totalOffsets(NAMED_TUNINGS[5].offsets), derived);
  // THE REDUNDANCY RULE, computed over the table: a name that is another plus a uniform shift.
  // Exactly one pair remains — open D / open E — and it stays BY RULING (the module's header
  // keeps the reason); a session that "tidies" it fails here with the ruling in its face
  const shape = (o) => { const t = totalOffsets(o); return STRINGS.map((s) => t[s] - t[6]).join(","); };
  const pairs = [];
  for (let i = 0; i < NAMED_TUNINGS.length; i++) for (let j = i + 1; j < NAMED_TUNINGS.length; j++)
    if (shape(NAMED_TUNINGS[i].offsets) === shape(NAMED_TUNINGS[j].offsets)) pairs.push([NAMED_TUNINGS[i].name, NAMED_TUNINGS[j].name]);
  assert.deepEqual(pairs, [["open D", "open E"]], "the only uniform-shift pair in the table is open D / open E, kept by Daniel's 261009 ruling (idiom outranks the arithmetic)");
  for (const n of NAMED_TUNINGS) assert.notEqual(shape(n.offsets), shape({}), `${n.name} is not standard shifted — that is the global stepper's job`);
});

test("read both ways: a name applies its offsets, and the row names itself by comparing offsets — no second list", () => {
  for (const t of NAMED_TUNINGS) assert.equal(nameOf(t.offsets), t.name, `${t.name} names itself`);
  assert.equal(nameOf(totalOffsets(DADGAD)), "DADGAD", "a total map and a sparse one are the same tuning");
  assert.equal(nameOf({}), STANDARD_NAME); assert.equal(nameOf(null), STANDARD_NAME); assert.equal(nameOf({ 6: 0 }), STANDARD_NAME);
  assert.equal(nameOf({ 6: -2, 2: -2 }), null, "one string short of DADGAD is no exact name — the lit name ceases the moment one string moves");
  assert.equal(nameOf({ 6: -2, 2: -2, 1: -2, 3: 1 }), null);
  // ONE TABLE (rule 6): the names appear in tunings.mjs and in no other engine or hub source
  const src = readFileSync(join(here, "..", "tunings.mjs"), "utf8");
  assert.equal((src.match(/DADGAD/g) || []).length, 1, "DADGAD is typed once in the module — the name, in the table");
  const ENGINE = join(here, ".."), HUB = join(here, "..", "..", "hub", "modules");
  const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");   // comment-blind: a comment may cite the name, code may not list it
  for (const dir of [ENGINE, HUB]) for (const f of readdirSync(dir).filter((x) => x.endsWith(".mjs") && x !== "tunings.mjs"))
    assert.ok(!/DADGAD|all fourths/.test(code(readFileSync(join(dir, f), "utf8"))), `${f} spells a tuning's name in code — a second table`);
});

test("THE READING, exact first then by shape (item 4): the retired names come back as a name plus its register shift", () => {
  const dropC = { 6: -4, 5: -2, 4: -2, 3: -2, 2: -2, 1: -2 }, half = { 6: -1, 5: -1, 4: -1, 3: -1, 2: -1, 1: -1 };
  assert.deepEqual(readTuning(dropC), { name: "drop D", shift: -2 }, "old drop C is drop D, down a whole step");
  assert.deepEqual(readTuning(half), { name: STANDARD_NAME, shift: -1 }, "old half-step down is standard, down a half step");
  assert.deepEqual(readTuning(steppedAll(half, -1)), { name: STANDARD_NAME, shift: -2 }, "old whole-step down");
  assert.deepEqual(readTuning(steppedAll(DADGAD, -1)), { name: "DADGAD", shift: -1 });
  assert.equal(readTuning({ 6: -2, 2: -2 }), null, "an unknown shape is unnamed, as before");
  assert.deepEqual(readTuning({}), { name: STANDARD_NAME, shift: 0 });
  for (const t of NAMED_TUNINGS) assert.deepEqual(readTuning(t.offsets), { name: t.name, shift: 0 }, `${t.name}: exact, no register note`);
  // THE COLLISION the open E ruling creates, resolved by the order: open D and open E share a shape
  const openD = NAMED_TUNINGS.find((t) => t.name === "open D").offsets, openE = NAMED_TUNINGS.find((t) => t.name === "open E").offsets;
  assert.deepEqual(readTuning(steppedAll(steppedAll(openD, 1), 1)), { name: "open E", shift: 0 }, "open D up a whole step IS open E — exact, and says so");
  assert.deepEqual(readTuning(steppedAll(steppedAll(openE, -1), -1)), { name: "open D", shift: 0 }, "…and open E down a whole step is open D");
  assert.deepEqual(readTuning(steppedAll(openD, 1)), { name: "open D", shift: 1 }, "half-way between, the nearer-by-string-6 shape match is open D");
  assert.deepEqual(readTuning(steppedAll(steppedAll(NAMED_TUNINGS[0].offsets, -1), -1)), { name: "drop D", shift: -2 });
  // the words — one function, the house's three (motion.mjs says "a half step" / "a whole step" too)
  assert.equal(describeTuning(dropC), "drop D, a whole step down"); assert.equal(describeTuning(half), "standard, a half step down");
  assert.equal(describeTuning(steppedAll(openD, 1)), "open D, a half step up"); assert.equal(describeTuning(openE), "open E"); assert.equal(describeTuning({ 6: -2, 2: -2 }), "");
  assert.equal(shiftWords(-3), "3 semitones down"); assert.equal(shiftWords(2), "a whole step up");
  const motion = readFileSync(join(here, "..", "motion.mjs"), "utf8");
  assert.ok(/"a half step"/.test(motion) && /"a whole step"/.test(motion), "the register note's words are the house's (motion.mjs's distance words), not a second vocabulary");
});

test("THE GLOBAL STEP (item 1): all six move together from where they are; refused WHOLE when any one string cannot, naming it; never clamped", () => {
  // a uniform move never crosses: for every named tuning, every shift inside the window keeps the order
  for (const t of [{ offsets: {} , name: "standard" }, ...NAMED_TUNINGS]) {
    let up = totalOffsets(t.offsets), down = totalOffsets(t.offsets);
    while (canStepAll(up, 1).ok) { up = steppedAll(up, 1); assert.doesNotThrow(() => opensOf(up), `${t.name} shifted up keeps its order`); }
    while (canStepAll(down, -1).ok) { down = steppedAll(down, -1); assert.doesNotThrow(() => opensOf(down), `${t.name} shifted down keeps its order`); }
    assert.match(canStepAll(up, 1).reason, /window/); assert.match(canStepAll(down, -1).reason, /window/);
  }
  // the dispatch's case: string 6 at −4, the rest at 0 — two global down-steps are legal, the third names string 6
  let t = { 6: -4 };
  assert.equal(canStepAll(t, -1).ok, true); t = steppedAll(t, -1);
  assert.equal(canStepAll(t, -1).ok, true); t = steppedAll(t, -1);
  assert.deepEqual(totalOffsets(t), { 6: -6, 5: -2, 4: -2, 3: -2, 2: -2, 1: -2 }, "a partial tuning transposes as a unit");
  const r = canStepAll(t, -1);
  assert.equal(r.ok, false); assert.equal(r.string, 6); assert.match(r.reason, /string 6/, "names the string that ran out"); assert.match(r.reason, /window|six/);
  assert.ok(!/bind|button|stepper|checkbox/i.test(r.reason), "rule 14");
  assert.throws(() => steppedAll(t, -1), /refused/, "refused whole — nothing moves five strings and skips the sixth");
  assert.equal(canStepAll(t, 1).ok, true, "…and the other way is open");
  assert.deepEqual(totalOffsets(steppedAll(steppedAll(NAMED_TUNINGS[0].offsets, -1), -1)), { 6: -4, 5: -2, 4: -2, 3: -2, 2: -2, 1: -2 }, "drop D down two global steps is old drop C's offsets");
  assert.throws(() => canStepAll({}, 2), /one semitone/);
});

test("THE SPELLING OVERRIDE (item 6): exactly one, open D's third string, exact match only; the direction rule owns everything else", () => {
  assert.deepEqual([...SPELLING_OVERRIDES].map((o) => [...o]), [["open D", 3, "F♯"]],
    `the table carries ${SPELLING_OVERRIDES.length} spelling override(s) — one is the ruling (open D, string 3, F♯); a second is a NEW DECISION and must arrive as one: ${SPELLING_OVERRIDES.map((o) => o[0] + "/" + o[1]).join(", ")}`);
  const extra = SPELLING_OVERRIDES.filter((o) => !(o[0] === "open D" && o[1] === 3));
  assert.equal(extra.length, 0, `a spelling override was added to ${extra.map((o) => o[0]).join(", ")} — not ruled`);
  const openD = NAMED_TUNINGS.find((t) => t.name === "open D").offsets;
  assert.equal(openLabel(openD, 3), "F♯");
  assert.equal(openLabel(steppedAll(openD, 1), 3), "G", "one global step away it is not open D: the direction rule (unmoved = natural)");
  assert.equal(openLabel(steppedAll(openD, -1), 3), "F", "…down: F natural by direction");
  const twoDown = steppedAll(steppedAll(openD, -1), -1);
  assert.equal(openLabel(twoDown, 3), openStringName(opensOf(twoDown)[3], OPEN_MIDI[3]), "two down: by direction (E)");
  // the override lives in the table, never in the speller: open-string.mjs stays one law
  const speller = readFileSync(join(here, "..", "open-string.mjs"), "utf8");
  assert.ok(!/open D|NAMED_TUNINGS|tunings\.mjs|override/.test(speller) && !/F♯[^\n]*(open D|named)/.test(speller), "open-string.mjs carries no tuning name, no table, no override — one law");
  for (const t of NAMED_TUNINGS) for (const s of STRINGS) if (!(t.name === "open D" && s === 3))
    assert.equal(openLabel(t.offsets, s), openStringName(opensOf(t.offsets)[s], OPEN_MIDI[s]), `${t.name} string ${s} reads by direction`);
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
