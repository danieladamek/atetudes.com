/* gamut.test.mjs — THE PARTIAL COLLECTION (night 48, 261009): the counts derived here a second
 * time, independently of the module's own derivation; the refusals by name; the stored shape;
 * the predicate at materialIn and nowhere else; the slash keeping its one meaning. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { triads, tetrads, triadPairs, pentatonics, pentatonicRefusal, normalizeGamut, pentatonicBreak, majorPentatonicRoot, describeGamut } from "../gamut.mjs";
import { field } from "../field.mjs";
import { positionOf, materialIn, inGamut } from "../position.mjs";
import { SCALE_STEPS } from "../chord.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const src = (p) => readFileSync(join(here, "..", "..", p), "utf8");

test("THE COUNTS, derived a second way: 7 triads · 7 tetrads · 7 pairs (stepwise, omitting d−1) · pentatonics 4 / 4 / 0", () => {
  assert.equal(triads().length, 7); assert.equal(tetrads().length, 7);
  const T = triads(); let disjoint = 0;
  for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) {
    const dis = !T[i].degrees.some((x) => T[j].degrees.includes(x));
    const step = (j - i) % 7 === 1 || (j - i) % 7 === 6;
    assert.equal(dis, step, `triads on ${i + 1} and ${j + 1}: disjoint iff stepwise`);
    if (dis) disjoint++;
  }
  assert.equal(disjoint, 7); assert.equal(triadPairs().length, 7);
  for (const p of triadPairs()) {
    const [a, b] = p.roots; const lower = (b - a + 7) % 7 === 1 ? a : b;
    assert.deepEqual(p.omitted, [(lower + 6) % 7], `the pair on (${lower + 1}, ${lower + 2}) omits degree ${lower}`);
    assert.equal(p.degrees.length, 6);
  }
  assert.deepEqual(triadPairs().find((p) => p.roots.includes(3) && p.roots.includes(4)).omitted, [2], "IV + V omits the 3");
  const count = (scale) => {
    const pcs = [0]; for (let i = 0; i < 6; i++) pcs.push(pcs[i] + SCALE_STEPS[scale][i]);
    let n = 0;
    for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) {
      const set = [0, 1, 2, 3, 4, 5, 6].filter((x) => x !== a && x !== b);
      const bad = set.some((x, i) => set.slice(i + 1).some((y) => [1, 11].includes(((pcs[y] - pcs[x]) % 12 + 12) % 12)));
      if (!bad) n++;
    }
    return n;
  };
  assert.equal(count("major"), 4); assert.equal(count("mel"), 4); assert.equal(count("harm"), 0);
  assert.equal(pentatonics("major").length, 4); assert.equal(pentatonics("mel").length, 4); assert.equal(pentatonics("harm").length, 0);
  assert.deepEqual(pentatonics("major").map((p) => p.degrees.map((d) => d + 1).join("")).sort(), ["12356", "12456", "23567", "24567"], "the item's table, derived");
  assert.equal(pentatonicRefusal("harm"), "harmonic minor holds no semitone-free pentatonic", "the empty list refuses BY NAME");
  assert.equal(pentatonicRefusal("major"), null);
  assert.ok(!/bind|dropdown|select|menu/i.test(pentatonicRefusal("harm")), "rule 14");
});

test("THE STORED SHAPE: degrees 1..7, sorted, distinct; absent means the whole field — never an empty array, never a name", () => {
  assert.equal(normalizeGamut(null), null); assert.equal(normalizeGamut(undefined), null); assert.equal(normalizeGamut([]), null);
  assert.equal(normalizeGamut([1, 2, 3, 4, 5, 6, 7]), null, "everything is the whole field");
  assert.deepEqual(normalizeGamut([6, 2, 2, 1]), [1, 2, 6]);
  assert.throws(() => normalizeGamut([0]), /degree/); assert.throws(() => normalizeGamut([8]), /degree/); assert.throws(() => normalizeGamut("F + G"), /array/);
  assert.equal(inGamut(null, 3), true); assert.equal(inGamut([1, 3, 5], 2), true); assert.equal(inGamut([1, 3, 5], 1), false);
});

test("THE PREDICATE AT materialIn, AND NOWHERE ELSE: an empty gamut is today's pool exactly; a gamut narrows the offer; every board passes its gamut", () => {
  const fld = field({ key: "C", scale: "major" });
  const pos = positionOf({ field: fld, anchorString: 6, startDegree: 0, nearFret: 3, strings: [6, 5, 4, 3, 2, 1] });
  const whole = materialIn(pos, [6, 5, 4, 3, 2, 1], fld);
  assert.deepEqual(materialIn(pos, [6, 5, 4, 3, 2, 1], fld, null), whole, "null = the whole field, the same notes");
  const pent = materialIn(pos, [6, 5, 4, 3, 2, 1], fld, [1, 2, 3, 5, 6]);
  assert.ok(pent.length > 0 && pent.length < whole.length);
  assert.deepEqual(pent, whole.filter((n) => [0, 1, 2, 4, 5].includes(n.keyDeg)), "the same notes, filtered — nothing re-derived");
  // the one site: no other ENGINE module applies the predicate, and every hub CALL SITE of
  // materialIn passes its gamut (a consumer that forgot would offer the whole field to one board)
  const engine = join(here, ".."), hub = join(here, "..", "..", "hub", "modules");
  for (const f of readdirSync(engine).filter((x) => x.endsWith(".mjs") && x !== "position.mjs"))
    assert.ok(!/inGamut\(/.test(readFileSync(join(engine, f), "utf8")), `${f} applies the gamut itself — the predicate lives at materialIn only`);
  for (const f of readdirSync(hub).filter((x) => x.endsWith(".mjs"))) {
    const s = readFileSync(join(hub, f), "utf8");
    for (const m of s.matchAll(/materialIn\(([^)]*)\)/g))
      assert.ok(/gamut/.test(m[1]) || f === "presets-card.mjs", `${f}: materialIn(${m[1]}) passes no gamut — that board would offer the whole field`);
  }
  assert.ok(/inGamut\(/.test(src("engine/position.mjs")), "materialIn applies it");
});

test("AFTER A SCALE CHANGE the rule refuses by name, never drops: a major pentatonic in harmonic minor names the semitone pair", () => {
  assert.equal(pentatonicBreak([1, 2, 3, 5, 6], "major"), null);
  assert.deepEqual(pentatonicBreak([1, 2, 3, 5, 6], "harm"), [1, 2], "2 and ♭3 sit a semitone apart in harmonic minor");
  assert.equal(pentatonicBreak([1, 2, 4, 5, 6, 7], "harm"), null, "a pair is not a pentatonic — no rule to break");
});

test("THE FACE: the pair reads F + G, a rotation of 2-2-3-2-3 is named by its root, the slash keeps its one meaning", () => {
  const C = field({ key: "C", scale: "major" });
  assert.equal(describeGamut([1, 2, 4, 5, 6, 7], C), "F + G — 1 2 4 5 6 7 of C, omitting the 3");
  assert.equal(describeGamut([2, 3, 5, 6, 7], C), "G major pentatonic — 2 3 5 6 7 of C");
  assert.equal(describeGamut([1, 2, 3, 5, 6], C), "C major pentatonic — 1 2 3 5 6 of C");
  assert.equal(describeGamut([2, 4, 5, 6, 7], C), "a pentatonic — 2 4 5 6 7 of C", "semitone-free but not a rotation of the major pentatonic");
  assert.equal(describeGamut([1, 3, 5, 7], C), "1 3 5 7 of C");
  assert.equal(describeGamut(null, C), "");
  assert.ok(!/\//.test(describeGamut([1, 2, 4, 5, 6, 7], C)), "no slash in a pair");
  assert.equal(majorPentatonicRoot([2, 3, 5, 6, 7], "major"), 4);
  assert.ok(/lastIndexOf\("\/"\)/.test(src("engine/chord.mjs")), "chord.mjs reads the slash bass");
  assert.ok(/"tl-slash"/.test(src("engine/chart-line.mjs")), "chart-line draws it");
  assert.ok(!/"\/"|\+ "\/"|`\/`/.test(src("engine/gamut.mjs")), "gamut.mjs prints no slash");
});
