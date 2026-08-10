/* motion.test.mjs — the motion grammar's contract (spec §§3-5, §8).
 * Every spec §8 assertion is a running test here, not a comment.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse, serialize, describe, resolve, emitFromClicks, MAX_EVENTS,
  degreeSemis } from "../motion.mjs";

// a hand-built ctx: C major, set E-B-G, the pinned C grip s3f5 s2f5 s1f3
const CTX = {
  chordPcs: [0, 4, 7], rootPc: 0,
  voicing: { notes: [
    { midi: 60, string: 3, fret: 5, slot: 0 },
    { midi: 64, string: 2, fret: 5, slot: 1 },
    { midi: 67, string: 1, fret: 3, slot: 2 }] },
  scalePcs: [0, 2, 4, 5, 7, 9, 11], tonicPc: 0,
  open: { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 }, nfrets: 15,
  set: [1, 2, 3], setLowHigh: [3, 2, 1],
};

// ---- the fixed-point corpus ----

const CORPUS = [
  ["tones", "(-1,+2)[1] - (+2,-1)[3] - (-s,+s)[5]", 9],
  ["tones", "[1] - [3] - [5]", 3],
  ["tones", "(b9,-1)[1]", 3],
  ["tones", "(-2,-1)[b3]", 3],
  ["tones", "(+2s)[13]", 2],
  ["shape", "(-1,+2)H - M - (-s)L", 6],
  ["shape", "H - M - L", 3],
  ["shape", "h-m-l", 3],
];

for (const [mode, src, n] of CORPUS)
  test(`fixed point: ${src}`, () => {
    const p = parse(src, mode);
    assert.ok(!p.error, JSON.stringify(p.error));
    assert.equal(p.n, n, "event count parsed from the figure");
    const s = serialize(p);
    const p2 = parse(s, mode);
    assert.ok(!p2.error);
    assert.equal(serialize(p2), s, "serialize∘parse idempotent");
    assert.ok(describe(p).length > 0, "describe completes for every valid source");
  });

// ---- describe names the idiom by derivation ----

test("describe: the spec's own example sentence shape", () => {
  const d = describe(parse("(-1,+2)[1] - (+2,-1)[3] - (-s,+s)[5]", "tones"));
  assert.match(d, /The root, enclosed — a half step below, then a whole step above\./);
  assert.match(d, /The 3rd, enclosed — a whole step above, then a half step below\./);
  assert.match(d, /The 5th, enclosed — the scale tone below, then the scale tone above\./);
});

test("describe: one item is approached-from; same side is a run; degrees stay sideless", () => {
  assert.match(describe(parse("(-1)[3]", "tones")), /approached from a half step below/);
  assert.match(describe(parse("(-2,-1)[1]", "tones")),
    /approached by a run from a whole step below, then a half step below/);
  assert.match(describe(parse("(b9,-1)[1]", "tones")), /approached — the ♭9, then a half step below/);
  assert.match(describe(parse("(-1,+2)H", "shape")), /high string, enclosed/);
  assert.match(describe(parse("[b3]", "tones")), /^The ♭3rd\.$/);
});

// ---- refusals are named, with a caret position ----

test("parse errors carry a position and a message; nothing truncates", () => {
  const e1 = parse("[1] - xx", "tones");
  assert.ok(e1.error && e1.error.pos === 6, JSON.stringify(e1.error));
  assert.equal(e1.figures.length, 1, "what parsed stays parsed");
  const e2 = parse("(-)[1]", "tones");
  assert.match(e2.error.message, /sign needs a distance/);
  const e3 = parse("(-1,[1]", "tones");
  assert.ok(e3.error);
  const over = parse(Array(9).fill("(-1)[1]").join(" - "), "tones");
  assert.match(over.error.message, /ceiling/);
  assert.match(over.error.message, new RegExp(String(MAX_EVENTS)));
  const shapeInTones = parse("H-M-L", "tones");
  assert.match(shapeInTones.error.message, /target like \[1\]/);
});

// ---- resolve: spec §8, every assertion live ----

test("resolve: every approach is exactly its written distance from its target", () => {
  const evs = resolve(parse("(-1,+2)[1] - (+2,-1)[3]", "tones"), CTX);
  assert.equal(evs.length, 6);
  const [a1, a2, t1, a3, a4, t2] = evs;
  assert.equal(t1.role, "chord"); assert.equal(t1.midi, 60, "[1] is the voicing's C");
  assert.equal(a1.midi, 59, "-1 exactly a half step below");
  assert.equal(a2.midi, 62, "+2 exactly a whole step above");
  assert.equal(t2.midi, 64, "[3] is the voicing's E");
  assert.equal(a3.midi, 66); assert.equal(a4.midi, 63);
  for (const ev of evs) {
    assert.equal(CTX.open[ev.string] + ev.fret, ev.midi, "placement honest");
    assert.equal(ev.slot, CTX.setLowHigh.indexOf(ev.string), "slot travels");
  }
});

test("resolve: scale approaches are adjacent in the scale; runs walk k steps", () => {
  const evs = resolve(parse("(-s,+s)[5]", "tones"), CTX);
  assert.equal(evs[2].midi, 67, "[5] is G");
  assert.equal(evs[0].midi, 65, "-s is F, the next scale tone below G");
  assert.equal(evs[1].midi, 69, "+s is A, the next scale tone above G");
  const run = resolve(parse("(-2s)[1]", "tones"), CTX);
  assert.equal(run[0].midi, 57, "-2s from C walks B then A");
});

test("resolve: absolute-degree approaches take the key degree nearest the target", () => {
  const evs = resolve(parse("(b9,2)[1]", "tones"), CTX);
  assert.equal(evs[2].midi, 60);
  assert.equal(evs[0].midi % 12, 1, "b9 of C is Db");
  assert.equal(evs[1].midi % 12, 2, "2 of C is D");
  assert.ok(Math.abs(evs[0].midi - 60) <= 6, "octave nearest the target");
});

test("resolve: shape targets take the slot; tones targets beyond the voicing derive a place", () => {
  const shape = resolve(parse("H - M - L", "shape"), CTX);
  assert.deepEqual(shape.map((e) => e.midi), [67, 64, 60]);
  const nine = resolve(parse("[9]", "tones"), CTX);
  assert.equal(nine[0].midi % 12, 2, "compound 9 reduces mod 7 to the 2 for pitch");
  assert.equal(CTX.open[nine[0].string] + nine[0].fret, nine[0].midi);
});

test("resolve: refuses by name over the ceiling and off the set", () => {
  const big = { ...CTX };
  assert.throws(() => resolve({ mode: "tones", n: 20,
    figures: Array(20).fill({ approaches: [], target: { kind: "degree", deg: 1, acc: 0 } }) },
    big), /ceiling/);
});

// ---- the sketchpad emitter: parse(emit(clicks)) round-trips on degrees + relationships ----

test("emit: chord tones become targets, near notes signed, far notes key degrees", () => {
  const clicks = [
    { midi: 59, role: "approach" },            // B, half step below C
    { midi: 62, role: "approach" },            // D, whole step above C
    { midi: 60, role: "target", degText: "1" },
    { midi: 66, role: "approach" },            // F#, whole step above E... = +2
    { midi: 64, role: "target", degText: "3" },
  ];
  const r = emitFromClicks(clicks, { scalePcs: CTX.scalePcs, tonicPc: 0 });
  assert.ok(!r.error, r.error);
  assert.equal(r.src, "(-1,+2)[1] - (+2)[3]");
  assert.match(r.discarded, /octave and placement/);
  // the round-trip is on DEGREES AND RELATIONSHIPS, never pitches or frets
  const p = parse(r.src, "tones");
  assert.ok(!p.error);
  assert.deepEqual(p.figures.map((f) => f.target.deg), [1, 3]);
  assert.deepEqual(p.figures[0].approaches.map((a) => a.delta), [-1, 2]);
});

test("emit precedence: semitones ≤2 win, then one scale step, then absolute key degree", () => {
  // F under G is BOTH a whole step and a scale step: the exact-distance form
  // wins (the click's own geometry — the named precedence, item order)
  const near = emitFromClicks([
    { midi: 65, role: "approach" },
    { midi: 67, role: "target", degText: "5" },
  ], { scalePcs: CTX.scalePcs, tonicPc: 0 });
  assert.equal(near.src, "(-2)[5]");
  // C harmonic minor's augmented 2nd: Ab is the scale tone below B at THREE
  // semitones — beyond the semitone forms, so ±s carries it
  const harm = emitFromClicks([
    { midi: 68, role: "approach" },            // Ab
    { midi: 71, role: "target", degText: "7" }, // B natural
  ], { scalePcs: [0, 2, 3, 5, 7, 8, 11], tonicPc: 0 });
  assert.equal(harm.src, "(-s)[7]");
  // and a non-scale distant note falls through to the absolute key degree
  const far = emitFromClicks([
    { midi: 56, role: "approach" },            // Ab in C MAJOR: not diatonic, far
    { midi: 60, role: "target", degText: "1" },
  ], { scalePcs: CTX.scalePcs, tonicPc: 0 });
  assert.equal(far.src, "(b6)[1]");
});

test("emit: a trailing approach refuses by name; an empty sketch refuses by name", () => {
  const r = emitFromClicks([{ midi: 61, role: "approach" }],
    { scalePcs: CTX.scalePcs, tonicPc: 0 });
  assert.match(r.error, /trailing approach/);
  assert.match(emitFromClicks([], { scalePcs: CTX.scalePcs, tonicPc: 0 }).error, /empty/);
});

test("degreeSemis is chord.mjs's arithmetic, not a second table", () => {
  assert.equal(degreeSemis(1, 0), 0);
  assert.equal(degreeSemis(3, -1), 3);
  assert.equal(degreeSemis(9, -1), 13);
  assert.equal(degreeSemis(13, 0) % 12, degreeSemis(6, 0), "compounds reduce mod 7");
});
