/* collection-walk.test.mjs — THE SCALE OF CHORDS WALKED ON A STRING SET (Chromatetudes child 2, 261122).
 * The walk law re-checked a second way on every walk the door can ask for: twelve keys × seven
 * collections × every offered stacking interval × every family that ships × every available set. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { walk, setsFor, familiesFor, WALK_FAMILIES, NFRETS, stepOf, assertWalk } from "../collection-walk.mjs";
import { KEYS, COLLECTIONS, collection, chordOn, stackIntervals } from "../collection.mjs";
import { STRING_SETS } from "../tetrad-sequence.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const mod12 = (x) => ((x % 12) + 12) % 12;

function* everyWalk() {
  for (const key of KEYS) for (const id of Object.keys(COLLECTIONS)) for (const k of stackIntervals(id)) {
    const arity = chordOn(collection({ key, id }), 0, k).members.length;
    for (const family of familiesFor(arity)) for (const set of setsFor(arity)) yield { key, id, k, family, set, arity };
  }
}

test("every walk: each voice one collection step on its own string; pcs = chordOn; n+N twelve frets up; on the neck", () => {
  let walks = 0, moves = 0;
  for (const cfg of everyWalk()) {
    const w = walk(cfg);
    const pcs = collection(cfg).notes.map((n) => n.pc);
    const N = pcs.length;
    // one collection step, from the pcs themselves: the next pc up in the collection, as a semitone count
    const upFrom = (pc) => { for (let s = 1; s <= 12; s++) if (pcs.includes(mod12(pc + s))) return s; };
    assert.ok(w.positions.length >= N, `${cfg.key} ${cfg.id} ${cfg.set.strings.join("")}: at least one octave of the walk`);
    w.positions.forEach((p, n) => {
      assert.equal(p.notes.length, cfg.arity);
      for (const x of p.notes) {
        assert.ok(cfg.set.strings.includes(x.string));
        assert.ok(x.fret >= 0 && x.fret <= NFRETS, `fret ${x.fret}`);
      }
      assert.deepEqual([...new Set(p.notes.map((x) => mod12(x.midi)))].sort((a, b) => a - b),
        [...chordOn(collection(cfg), p.degree, cfg.k).pcs].sort((a, b) => a - b));
      if (n) p.notes.forEach((x, i) => {
        const y = w.positions[n - 1].notes[i];
        assert.equal(x.string, y.string, "a voice stays on its string");
        assert.equal(x.midi - y.midi, upFrom(mod12(y.midi)), `${cfg.key} ${cfg.id} voice ${i} at ${n}: one collection step`);
        moves++;
      });
      if (n + N < w.positions.length)
        w.positions[n + N].notes.forEach((x, i) => assert.equal(x.fret, p.notes[i].fret + 12, "n+N is n twelve frets up"));
    });
    walks++;
  }
  // 12 keys × (five tetrad walks × 3 four-string sets + three triad walks × 4 three-string sets)
  assert.equal(walks, 12 * (5 * 3 + 3 * 4));
  assert.ok(moves > 10000, `${moves} voice moves checked`);
});

test("the walk reaches the bottom and the top: no further step stays on the neck", () => {
  for (const cfg of everyWalk()) {
    const w = walk(cfg);
    const first = w.positions[0].notes, last = w.positions[w.positions.length - 1].notes;
    const pcs = collection(cfg).notes.map((n) => n.pc);
    const dn = (pc) => { for (let s = 1; s <= 12; s++) if (pcs.includes(mod12(pc - s))) return s; };
    const up = (pc) => { for (let s = 1; s <= 12; s++) if (pcs.includes(mod12(pc + s))) return s; };
    assert.ok(first.some((x) => x.fret - dn(mod12(x.midi)) < 0), `${cfg.key} ${cfg.id}: the walk could go lower`);
    assert.ok(last.some((x) => x.fret + up(mod12(x.midi)) > NFRETS), `${cfg.key} ${cfg.id}: the walk could go higher`);
  }
});

test("C sixth-diminished, drop 2 on 6-5-4-3: C6 and D°7 alternate and the C6 passes all four inversions in an octave", () => {
  const w = walk({ key: "C", id: "sixth-dim-major", k: 2, family: "drop2", set: setsFor(4)[0] });
  const q = w.positions.map((p) => p.chord.quality);
  q.forEach((x, i) => i && assert.notEqual(x, q[i - 1], "sixth and diminished alternate"));
  const sixes = w.positions.filter((p) => p.chord.quality === "6").slice(0, 4).map((p) => mod12(p.notes[0].midi));
  assert.equal(new Set(sixes).size, 4, "four C6 positions, four different bass tones");
  assert.equal(w.positions.find((p) => p.chord.quality === "6").parsed.symbol, "C6");
  assert.equal(w.positions.find((p) => p.chord.quality === "dim7").parsed.root.name, "D");
});

test("a symmetric collection's shape recurs before the octave — expected, not refused (octatonic dim7: every three frets)", () => {
  const w = walk({ key: "C", id: "octatonic-wh", k: 2, family: "drop2", set: setsFor(4)[1] });
  const p0 = w.positions[0].notes, p2 = w.positions[2].notes;
  const shape = (ns) => ns.map((x) => x.fret - ns[0].fret).join();
  assert.equal(shape(p0), shape(p2));
  assert.equal(p2[0].fret - p0[0].fret, 3);
});

test("verify first — drop 3: the family's four-string sets are adjacent runs, so drop 3 is withheld by name", () => {
  for (const s of STRING_SETS) {
    const st = [...s.strings].sort((a, b) => a - b);
    assert.ok(st.every((x, i) => !i || x === st[i - 1] + 1),
      `STRING_SETS now offers a skipped set (${s.strings.join("-")}) — un-withhold drop 3 in collection-walk.mjs and ship it`);
  }
  assert.ok(WALK_FAMILIES.drop3.withheld);
  assert.deepEqual(familiesFor(4), ["drop2"]);
  assert.deepEqual(familiesFor(3), ["close"]);
  assert.throws(() => walk({ key: "C", id: "sixth-dim-major", k: 2, family: "drop3", set: setsFor(4)[0] }), /drop 3 wants a skipped string set/);
});

test("triads: triadCandidates offers one family (closed rotations) — the walk ships exactly that", () => {
  const src = readFileSync(join(here, "..", "triad-voicings.mjs"), "utf8");
  assert.ok(!/drop|spread|family/i.test(src.match(/export function triadCandidates[\s\S]*?\n}\n/)[0]),
    "triadCandidates grew a family parameter — offer it in collection-walk.mjs");
  const w = walk({ key: "C", id: "whole-tone", k: 2, family: "close", set: setsFor(3)[3] });
  for (const p of w.positions) assert.ok(p.notes[2].midi - p.notes[0].midi < 12, "a closed triad spans less than an octave");
});

test("the refusals, by name: an arity the family cannot voice; a set of the wrong size; an unknown family", () => {
  assert.throws(() => walk({ key: "C", id: "whole-tone", k: 2, family: "drop2", set: setsFor(4)[0] }), /stacks 3-note chords; drop 2 voices 4/);
  assert.throws(() => walk({ key: "C", id: "sixth-dim-major", k: 2, family: "drop2", set: setsFor(3)[0] }), /needs a 4-string set/);
  assert.throws(() => walk({ key: "C", id: "chromatic", k: 3, family: "spread", set: setsFor(4)[0] }), /unknown family "spread"/);
});

test("the transport's step is n → n±1, held at the ends", () => {
  const w = walk({ key: "C", id: "augmented", k: 2, family: "close", set: setsFor(3)[0] });
  assert.equal(stepOf(w, 0, -1), 0); assert.equal(stepOf(w, 0, 1), 1);
  assert.equal(stepOf(w, w.positions.length - 1, 1), w.positions.length - 1);
});

test("no second voicing generator: the walk imports its placements and states no shape", () => {
  const src = readFileSync(join(here, "..", "collection-walk.mjs"), "utf8");
  assert.match(src, /import \{ shapesOf, placeOnSet \} from "\.\/tetrad-voicings\.mjs";/);
  assert.match(src, /import \{ triadCandidates \} from "\.\/triad-voicings\.mjs";/);
  assert.ok(!/offsets\s*:\s*\[/.test(src), "collection-walk.mjs states a shape's offsets");
});

test("assertWalk bites on a tampered walk, clause by clause — the module's own law, not only this file's", () => {
  const fresh = () => walk({ key: "C", id: "sixth-dim-major", k: 2, family: "drop2", set: setsFor(4)[0] });
  const tamper = (fn) => { const w = structuredClone(fresh()); fn(w); return w; };
  const bump = (x, s) => { x.midi += s; x.fret += s; };
  // the right chord in the wrong place: position 1 replaced by its own octave (position 9) — the pcs hold, the step does not
  assert.throws(() => assertWalk(tamper((w) => { w.positions[1].notes = structuredClone(w.positions[9].notes); })), /moved 1[0-9] semitones/);
  assert.throws(() => assertWalk(tamper((w) => { bump(w.positions[3].notes[3], 1); })), /position 3 holds/);
  assert.throws(() => assertWalk(tamper((w) => { w.positions[4].notes[1].string = 6; })), /changed string|outside the set|is not midi/);
  assert.throws(() => assertWalk(tamper((w) => { bump(w.positions[0].notes[0], -w.positions[0].notes[0].fret - 1); })), /off the neck/);
  assert.throws(() => assertWalk(tamper((w) => { w.positions[2].degree = 5; })), /degree/);
  assert.throws(() => assertWalk(tamper((w) => { bump(w.positions[8].notes[0], 1); })), /position 8 is not position 0 twelve frets up/);
  // coverage: a placement of the chord that is not on the walk
  const w = fresh();
  const stray = [[{ midi: 1, string: 6 }, { midi: 2, string: 5 }, { midi: 3, string: 4 }, { midi: 4, string: 3 }]];
  assert.throws(() => assertWalk(w, [stray]), /is not on the walk/);
  assert.doesNotThrow(() => assertWalk(fresh()));
});
