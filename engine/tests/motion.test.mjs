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

test("resolve: shape targets take the slot; a target's pc must be a chord tone (v0.7.6)", () => {
  const shape = resolve(parse("H - M - L", "shape"), CTX);
  assert.deepEqual(shape.map((e) => e.midi), [67, 64, 60]);
  // [2] on any triad is refused, and the refusal TEACHES the construct wanted
  const em = { ...CTX, chordPcs: [4, 7, 11], rootPc: 4, chordLabel: "Em",
    voicing: { notes: [
      { midi: 64, string: 3, fret: 9, slot: 0 },
      { midi: 67, string: 2, fret: 8, slot: 1 },
      { midi: 71, string: 1, fret: 7, slot: 2 }] } };
  assert.throws(() => resolve(parse("[2]", "tones"), em),
    (e) => e.teach === true &&
      /\[2\] is not a chord tone of Em — write \(2\)\[3\] and it becomes an approach to the third\./.test(e.message));
  // [9] reduces to the 2 and is refused the same way — no numeral special case
  assert.throws(() => resolve(parse("[9]", "tones"), em), (e) => e.teach === true);
  // and (2)[3] — the taught construct — resolves fine
  const taught = resolve(parse("(2)[3]", "tones"), em);
  assert.equal(taught[1].midi, 67, "[3] on Em is G, quality-aware");
  assert.equal(taught[0].midi % 12, 2, "(2) is the key degree, an approach");
});

test("resolve: [b3] and [3] take the same path on a minor chord — derivation, not coincidence", () => {
  const dm = { ...CTX, chordPcs: [2, 5, 9], rootPc: 2, chordLabel: "Dm",
    voicing: { notes: [
      { midi: 62, string: 3, fret: 7, slot: 0 },
      { midi: 65, string: 2, fret: 6, slot: 1 },
      { midi: 69, string: 1, fret: 5, slot: 2 }] } };
  const bare = resolve(parse("[3]", "tones"), dm);
  const flat = resolve(parse("[b3]", "tones"), dm);
  assert.deepEqual([flat[0].midi, flat[0].string, flat[0].fret],
    [bare[0].midi, bare[0].string, bare[0].fret], "identical, by the one legality rule");
  // [3] on Dm must NOT be F# (the old chromatic-interval fallthrough is gone)
  assert.equal(bare[0].midi, 65, "the chord's own third");
  // and no legal target is ever outside the voicing — the placement branch is deleted
  for (const src of ["[1]", "[3]", "[b3]", "[5]"]) {
    const evs = resolve(parse(src, "tones"), dm);
    assert.ok(dm.voicing.notes.some((n) => n.midi === evs[0].midi &&
      n.string === evs[0].string && n.fret === evs[0].fret),
      src + " placed inside the voicing");
  }
});

test("resolve: refuses by name over the ceiling and off the set", () => {
  const big = { ...CTX };
  assert.throws(() => resolve({ mode: "tones", n: 20,
    figures: Array(20).fill({ approaches: [], target: { kind: "degree", deg: 1, acc: 0 } }) },
    big), /ceiling/);
});

// ---- the sketchpad emitter: parse(emit(clicks)) round-trips on degrees + relationships ----

test("emit: chord tones become targets, near notes signed — invariant forms only", () => {
  const clicks = [
    { midi: 59, role: "approach" },            // B, half step below C
    { midi: 62, role: "approach" },            // D, whole step above C
    { midi: 60, role: "target", degText: "1" },
    { midi: 66, role: "approach" },            // F#, whole step above E... = +2
    { midi: 64, role: "target", degText: "3" },
  ];
  const r = emitFromClicks(clicks, { scalePcs: CTX.scalePcs, tonicPc: 0 });
  assert.ok(!r.error, r.error);
  // B and D are C's adjacent scale tones (-s/+s); F# is chromatic but within
  // two semitones of E, so the SIGNED semitone form carries it — relative
  // either way, never a bare degree
  assert.equal(r.src, "(-s,+s)[1] - (+2)[3]");
  assert.match(r.discarded, /octave and placement/);
  // the round-trip is on DEGREES AND RELATIONSHIPS, never pitches or frets
  const p = parse(r.src, "tones");
  assert.ok(!p.error);
  assert.deepEqual(p.figures.map((f) => f.target.deg), [1, 3]);
  assert.deepEqual(p.figures[0].approaches.map((a) => a.kind), ["scale", "scale"]);
  assert.deepEqual(p.figures[1].approaches, [{ kind: "semi", delta: 2 }]);
});

test("emit precedence (v0.7.5, amended 260812.6): scale-adjacency FIRST, semitone fallback, NO third form", () => {
  // F under G is both a whole step and the adjacent scale tone: -s wins — it
  // stores the invariant, and the figure follows a key or scale change
  const near = emitFromClicks([
    { midi: 65, role: "approach" },
    { midi: 67, role: "target", degText: "5" },
  ], { scalePcs: CTX.scalePcs, tonicPc: 0 });
  assert.equal(near.src, "(-s)[5]");
  // a chromatic approach is NOT scale-adjacent: the semitone form still carries it
  const chrom = emitFromClicks([
    { midi: 61, role: "approach" },            // Db under... above C
    { midi: 60, role: "target", degText: "1" },
  ], { scalePcs: CTX.scalePcs, tonicPc: 0 });
  assert.equal(chrom.src, "(+1)[1]");
  // C harmonic minor's augmented 2nd: Ab under B — must NOT regress
  const harm = emitFromClicks([
    { midi: 68, role: "approach" },            // Ab
    { midi: 71, role: "target", degText: "7" }, // B natural
  ], { scalePcs: [0, 2, 3, 5, 7, 8, 11], tonicPc: 0 });
  assert.equal(harm.src, "(-s)[7]");
  // a non-scale distant note has NO relative reading: the emitter REFUSES,
  // naming the click — a bare degree here would be a coordinate stored where
  // the app stores invariants (the palette's ratified rule, asserted 260812.6)
  const far = emitFromClicks([
    { midi: 56, role: "approach" },            // Ab in C MAJOR: not diatonic, far
    { midi: 60, role: "target", degText: "1" },
  ], { scalePcs: CTX.scalePcs, tonicPc: 0 });
  assert.ok(far.error && /no relative reading/.test(far.error), "refusal, not fallback");
  assert.equal(far.at, 0, "the refusal names WHICH click by index");
  // the tap override picks the other reading where it exists, and only there
  const forced = emitFromClicks([
    { midi: 65, role: "approach", form: "semi" },
    { midi: 67, role: "target", degText: "5" },
  ], { scalePcs: CTX.scalePcs, tonicPc: 0 });
  assert.equal(forced.src, "(-2)[5]");
  const impossible = emitFromClicks([
    { midi: 61, role: "approach", form: "scale" },  // Db is no scale tone: ignored
    { midi: 60, role: "target", degText: "1" },
  ], { scalePcs: CTX.scalePcs, tonicPc: 0 });
  assert.equal(impossible.src, "(+1)[1]");
});

test("a figure sketched in one scale keeps its scale-relative approaches in another (v0.6.6 at figure level)", () => {
  // sketched in C major: B approaches C from below → -s (the invariant)
  const r = emitFromClicks([
    { midi: 59, role: "approach" },
    { midi: 60, role: "target", degText: "1" },
  ], { scalePcs: CTX.scalePcs, tonicPc: 0 });
  assert.equal(r.src, "(-s)[1]");
  // resolved in C natural minor: the same figure now plays Bb, not B
  const minorCtx = { ...CTX, scalePcs: [0, 2, 3, 5, 7, 8, 10] };
  const evs = resolve(parse(r.src, "tones"), minorCtx);
  assert.equal(evs[0].midi, 58, "the approach followed the scale change to Bb");
  // had it emitted -1 (the coordinate), it would still play B — outside the key
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
