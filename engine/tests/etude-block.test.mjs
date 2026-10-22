/* etude-block.test.mjs — THE ÉTUDE BLOCK'S ROUND-TRIP GATE (261022; docs/etude-block-format.md v1 §7).
 *
 * bench → block → bench is identity, on the timeline corpus (hub/tests/fixtures/etude-corpus.json — the études the
 * door's equivalence gate plays): every corpus étude is written, read back and compared whole, and its TIMELINE through
 * the read-back is compared with its timeline from the saved étude, so the block brings back what the étude sounds like,
 * not merely the same object. Then write is a fixed point on a block it wrote, byte for byte.
 *
 * Beside the gate: the grammar's edges (format §3), the flags (§6), preservation (§5) and the bench's refusals.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { etudeBlock, etudeBlockBody, readEtudeBlock, findEtudeBlock, rewriteEtudeBlock, readValue, writeValue,
  checkEtude, BLOCK_OMITS, ETUDE_FENCE, ETUDE_V } from "../etude-block.mjs";
import { etudeTimeline } from "../etude-timeline.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORPUS = JSON.parse(readFileSync(join(REPO, "hub", "tests", "fixtures", "etude-corpus.json"), "utf8"));
const ENV = { app: "multetudes", v: 2 };
const without = (s) => { const o = { ...s }; for (const k of Object.keys(BLOCK_OMITS)) delete o[k]; return o; };

test("the round-trip gate: bench → block → bench is identity on the timeline corpus, timelines included", () => {
  let keys = 0, chords = 0;
  for (const { name, saved } of CORPUS) {
    const body = etudeBlockBody(saved, ENV);
    const r = readEtudeBlock(body);
    assert.deepEqual(r.flagged, [], `${name}: a block the writer wrote flags nothing`);
    assert.equal(r.app, ENV.app, `${name}: app`); assert.equal(r.v, ENV.v, `${name}: v`);
    assert.deepEqual(r.snapshot, without(saved), `${name}: read(write(snapshot)) is the snapshot, less what the block omits`);
    assert.deepEqual(Object.keys(r.snapshot), Object.keys(without(saved)), `${name}: in the snapshot's own order`);
    assert.equal(etudeBlockBody(r.snapshot, { app: r.app, v: r.v }), body, `${name}: write is a fixed point`);
    assert.equal(rewriteEtudeBlock(body, r.snapshot, ENV), body, `${name}: rewriting with the same values changes nothing`);
    const a = etudeTimeline(saved), b = etudeTimeline(r.snapshot);
    assert.deepEqual(b, a, `${name}: the read-back étude's timeline is the saved étude's`);
    keys += Object.keys(r.snapshot).length; chords += a.bars.length;
  }
  assert.ok(CORPUS.length >= 10, `not vacuous: ${CORPUS.length} études`);
  console.log(`  ${CORPUS.length} corpus études · ${keys} keys round-tripped · ${chords} chords' timelines identical`);
});

test("the block is the fence around the body, and the notepad's scan finds it", () => {
  const block = etudeBlock(CORPUS[0].saved, ENV);
  assert.ok(block.startsWith("```" + ETUDE_FENCE + "\napp: multetudes\nv: 2\n") && block.endsWith("\n```"));
  const note = "warm-up\n\n" + block + "\n\nthen the head";
  assert.equal(findEtudeBlock(note), etudeBlockBody(CORPUS[0].saved, ENV));
  assert.equal(findEtudeBlock("```etude\nkey: C"), null, "an unclosed fence is no block");
  assert.equal(findEtudeBlock("```chart\n| C |\n```"), null);
  assert.ok(!/^chart:/m.test(block), "chart is left out (decision 5)");
});

test("values: top-level text is bare when it reads back bare, quoted only when it would not (format §3)", () => {
  const cases = [
    ["4,3,4,3,2,1", "4,3,4,3,2,1"], ["<r357>", "<r357>"], ["tone:3", "tone:3"], ["| Cm7 F7 | Bbmaj7 |", "| Cm7 F7 | Bbmaj7 |"],
    ["(-1,+1)[3]", "(-1,+1)[3]"], ["", ""],
    ["432121", '"432121"'], ["true", '"true"'], ["null", '"null"'], ["[3]", '"[3]"'], ["{x}", '"{x}"'],
    [' x', '" x"'], ["x ", '"x "'], ['"q', '"\\"q"'], ["a\nb", '"a\\nb"'],
    [120, "120"], [0.8, "0.8"], [-2, "-2"], [false, "false"], [null, "null"],
    [[4, 3, 2, 1], "[4, 3, 2, 1]"], [{ 6: -2 }, "{6: -2}"], [{ voice: "tone", chord: 1 }, "{voice: tone, chord: 1}"],
  ];
  for (const [v, text] of cases) {
    assert.equal(writeValue(v), text, `write ${JSON.stringify(v)}`);
    assert.deepEqual(readValue(text).value, v, `read ${text}`);
  }
  assert.throws(() => writeValue(1e-7), /does not read back/, "a number the grammar cannot carry is refused at the write");
  assert.throws(() => writeValue(NaN), /does not read back/);
  assert.equal(etudeBlockBody({ custom: "" }, ENV).split("\n")[2], "custom:", "empty text: the key, no trailing space");
});

test("a bad value is flagged, never guessed; the rest still reads (format §6, decision 7)", () => {
  const r = readEtudeBlock(["app: multetudes", "v: 2", "strings: [4, 3,", "bpm: 90", "this is prose", "key: C", "key: D",
    'figure: "unfinished', "# a comment", "", "scale: major"].join("\n"));
  assert.deepEqual(r.flagged.map((f) => [f.n, f.key || null]), [[3, "strings"], [5, null], [7, "key"], [8, "figure"]]);
  assert.match(r.flagged[2].reason, /said twice \(lines 6 and 7\)/);
  assert.deepEqual(r.snapshot, { bpm: 90, scale: "major" }, "neither key line is taken; every other key restores");
  const bad = readEtudeBlock("app: 7\nv: two\nkey: C");
  assert.deepEqual(bad.flagged.map((f) => f.key), ["app", "v"]);
  assert.equal(bad.app, null); assert.equal(bad.v, null);
});

test("the bench's own refusals name the key and the bench's reason", () => {
  const bad = checkEtude({ key: "H", scale: "major", ref: 0, tuning: { 6: -9 }, bpm: 120 });
  assert.deepEqual(bad.map((b) => b.key), ["key", "tuning"]);
  assert.match(bad[0].reason, /bad tonic "H"/);
  assert.match(bad[1].reason, /outside the ±6 semitone window/);
  assert.deepEqual(checkEtude(without(CORPUS[0].saved)), [], "a corpus étude passes");
  assert.deepEqual(checkEtude({ tuning: null }), [], "null is standard tuning");
});

test("preservation: unknown lines, comments and blanks are written back in place (format §5)", () => {
  const body = ["app: multetudes", "v: 2", "# my favourite", "key: Bb", "", "laterSetting: {a: 1}", "bpm:   120", "odd line"].join("\n");
  const out = rewriteEtudeBlock(body, { key: "F", bpm: 120, meter: 3 }, ENV);
  assert.equal(out, ["app: multetudes", "v: 2", "# my favourite", "key: F", "", "laterSetting: {a: 1}", "bpm:   120", "odd line",
    "meter: 3"].join("\n"), "only the changed value is rewritten; an unchanged one keeps its own spacing; a new key is added last");
});

test("v: is the practice log's own payload version — read from the notepad card's source, never retyped here", () => {
  const src = readFileSync(join(REPO, "hub", "modules", "notepad-card.mjs"), "utf8");
  const m = src.match(/app: doorId, version: (\d+)/);
  assert.ok(m, "the notepad card's adapter states no version — the check has nothing to compare against");
  assert.equal(ETUDE_V, Number(m[1]), "the block's v and the practice log's payload v have drifted");
});
