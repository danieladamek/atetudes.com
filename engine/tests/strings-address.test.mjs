/* strings-address.test.mjs — child 3b: a pattern names strings, a repeat is
 * the ordinal, and the bracket is derived from the order.
 *
 * The fixture is the item's own worked case: a tetrad taken as EVERY
 * OCCURRENCE over strings 4–1, so string 4 genuinely carries two notes and
 * the ordinal has something to mean. Everything asserts against the
 * selection the engine actually produced — never against typed positions.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { field } from "../field.mjs";
import { positionOf, materialIn } from "../position.mjs";
import { diatonicTones, oneOfEach, everyOccurrence, orderBy, bracketOf, offersOn } from "../selection.mjs";

const fixture = () => {
  const fld = field({ key: "Bb", scale: "major" });
  const pos = positionOf({ field: fld, anchorString: 4, startDegree: 5, nearFret: 5 });
  const pool = materialIn(pos, [4, 3, 2, 1], fld);
  const tones = diatonicTones(fld, (pos.startDeg + fld.ref) % 7, [0, 2, 4, 6]);
  return { fld, pos, pool, tones };
};

test("THE ITEM'S CASE: 4,3,4,3,2,1 at Line plays string 4's two notes in order", () => {
  const { pos, pool, tones } = fixture();
  const sel = everyOccurrence(tones, pool, { n: 3 }).notes;
  const on4 = sel.filter((n) => n.string === 4).sort((a, b) => a.fret - b.fret);
  assert.ok(on4.length >= 2, `the fixture must double string 4 (${on4.length})`);
  const { order, err } = orderBy("pattern", "4,3,4,3,2,1", sel);
  assert.equal(err, null);
  assert.equal(order.length, 6);
  assert.equal(order[0], on4[0], "step 1: string 4's LOWER note");
  assert.equal(order[2], on4[1], "step 3: string 4's SECOND note — the repeat is the ordinal");
  assert.ok(order[2].fret > order[0].fret, "the ordinal walks low → high");
});

test("the bracket reads {6} {5} {2,4} {1,3} for that figure on strings 4–1", () => {
  const { pool, tones } = fixture();
  const sel = everyOccurrence(tones, pool, { n: 3 }).notes;
  const { order } = orderBy("pattern", "4,3,4,3,2,1", sel);
  const br = bracketOf(order);
  assert.deepEqual(br[1], [6]);
  assert.deepEqual(br[2], [5]);
  assert.deepEqual(br[3], [2, 4]);
  assert.deepEqual(br[4], [1, 3]);
});

test("a six-string shape is addressable — the address derives, never enumerates", () => {
  const fld = field({ key: "C", scale: "major" });
  const pos = positionOf({ field: fld, anchorString: 6, startDegree: 0, nearFret: 5 });
  const pool = materialIn(pos, [6, 5, 4, 3, 2, 1], fld);
  const tones = diatonicTones(fld, 0, [0, 2, 4, 6]);
  const sel = everyOccurrence(tones, pool, { n: 3 }).notes;
  const { order, err } = orderBy("pattern", "6,5,4,3,2,1", sel);
  assert.equal(err, null);
  assert.deepEqual(order.map((n) => n.string), [6, 5, 4, 3, 2, 1]);
  // and the offers map covers every string the selection reaches
  const offers = offersOn(sel);
  for (const n of sel) assert.ok(offers[n.string] >= 1);
});

test("the ordinal WRAPS past the last note — v0.9's own rule, kept", () => {
  const { pool, tones } = fixture();
  const sel = everyOccurrence(tones, pool, { n: 3 }).notes;
  const on4 = sel.filter((n) => n.string === 4).sort((a, b) => a.fret - b.fret);
  const { order } = orderBy("pattern", "4,4,4", sel);
  assert.equal(order[0], on4[0]);
  assert.equal(order[1], on4[1 % on4.length]);
  assert.equal(order[2], on4[2 % on4.length], "the third 4 wraps to the ordinal the string offers");
});

test("tones addresses roles; absence is loud, never silent", () => {
  const { pos, pool, tones } = fixture();
  const sel = oneOfEach(tones, pool, { n: 1, centre: pos.centre }).notes;
  const { order, err } = orderBy("tones", "R-3-7-5", sel);
  assert.equal(err, null);
  assert.deepEqual(order.map((n) => n.role), ["R", "3", "7", "5"]);
  const dyadish = sel.filter((n) => n.role !== "5");
  const miss = orderBy("tones", "5", dyadish);
  assert.equal(miss.order, null);
  assert.match(miss.err, /carries no 5th/);
});

test("an empty string refuses by name; approaches and targets refuse with their reasons", () => {
  const { pos, pool, tones } = fixture();
  const sel = oneOfEach(tones, pool, { n: 1, centre: pos.centre }).notes;
  const gone = orderBy("pattern", "5", sel);              // string 5 not in the run
  assert.equal(gone.order, null);
  assert.match(gone.err, /string 5 carries nothing/);
  const appr = orderBy("pattern", "(-1,+2)4", sel);
  assert.equal(appr.order, null);
  assert.match(appr.err, /approaches[\s\S]*off the field/,
    "v0.9 silently dropped parentheses; this address must refuse them by name");
  const tgt = orderBy("pattern", "[4]", sel);
  assert.match(tgt.err, /TARGET in the ratified motion grammar/);
});

test("no tokens is a block, not an error", () => {
  const { pool, tones } = fixture();
  const sel = everyOccurrence(tones, pool, { n: 3 }).notes;
  assert.deepEqual(orderBy("pattern", "", sel), { order: null, err: null });
  assert.deepEqual(orderBy("tones", "  ", sel), { order: null, err: null });
});
