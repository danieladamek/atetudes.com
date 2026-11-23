/* collection.test.mjs — THE COLLECTION ENGINE, mod N (Chromatetudes child 1, 261122).
 * The corpus is the brief's two tables (notes/specs/chromatetudes — the collection door, v0.1.md §2, §3),
 * re-derived here a second way: pitch classes summed from the steps by hand, qualities read from
 * parseChord, never from the module's own derivation. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { KEYS, COLLECTIONS, collection, chordOn, stackIntervals, walkChords, enharmonicOf, assertSteps, DEGREE_NAMES } from "../collection.mjs";
import { parseChord, pcOf, accOf, scaleNotes } from "../chord.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const mod12 = (x) => ((x % 12) + 12) % 12;
const pcsFrom = (key, steps) => steps.slice(0, -1).reduce((a, s) => [...a, mod12(a[a.length - 1] + s)], [pcOf(key)]);
const qualityBy = (pcs) => ["6", "m6", "dim7", "aug"].find((q) => pcs.some((r) => {
  const iv = parseChord("C" + q).intervals; const rel = pcs.map((p) => mod12(p - r)).sort((a, b) => a - b);
  return rel.join() === [...iv].sort((a, b) => a - b).join();
}));

/* the brief's §2 table: [id, k, walk quality per degree (cycled), distinct chords] */
const TABLE = [
  ["sixth-dim-major", 2, ["6", "dim7"], 2],
  ["sixth-dim-minor", 2, ["m6", "dim7"], 2],
  ["whole-tone", 2, ["aug"], 2],
  ["octatonic-wh", 2, ["dim7"], 2],
  ["octatonic-hw", 2, ["dim7"], 2],
  ["augmented", 2, ["aug"], 2],
  ["chromatic", 3, ["dim7"], 3],
  ["chromatic", 4, ["aug"], 4],
];

test("the seven collections of v0.1 are the brief's §1 step lists, each summing to 12", () => {
  assert.deepEqual(Object.keys(COLLECTIONS).length, 7);
  const N = Object.fromEntries(Object.entries(COLLECTIONS).map(([id, c]) => [id, c.steps.length]));
  assert.deepEqual(N, { "sixth-dim-major": 8, "sixth-dim-minor": 8, "whole-tone": 6, "octatonic-wh": 8, "octatonic-hw": 8, augmented: 6, chromatic: 12 });
  for (const c of Object.values(COLLECTIONS)) assert.equal(c.steps.reduce((a, b) => a + b, 0), 12);
});

test("a step list that does not sum to 12 is refused by name", () => {
  assert.throws(() => assertSteps([2, 2, 1, 2, 2, 2, 2]), /sum to 13, not 12/);
  assert.throws(() => assertSteps([2, 0, 10]), /positive whole number/);
  assert.throws(() => collection({ key: "C", id: "dorian" }), /unknown collection "dorian"/);
  assert.throws(() => collection({ key: "H", id: "chromatic" }), /not one of the twelve keys/);
});

test("stackIntervals: derived by the cycle rule — 2 for the six, 3 and 4 for the chromatic", () => {
  for (const [id, c] of Object.entries(COLLECTIONS))
    assert.deepEqual(stackIntervals(id), id === "chromatic" ? [3, 4] : [2], id);
});

test("the §2 table, twelve keys: the walk's quality degree by degree, and the distinct chord count", () => {
  let checked = 0;
  for (const key of KEYS)
    for (const [id, k, quals, distinct] of TABLE) {
      const c = collection({ key, id });
      const pcs = pcsFrom(key, COLLECTIONS[id].steps);
      assert.deepEqual(c.notes.map((n) => n.pc), pcs, `${key} ${id} pitch classes`);
      const w = walkChords(c, k);
      w.chords.forEach((ch, d) => {
        const want = Array.from({ length: ch.members.length }, (_, i) => pcs[(d + i * k) % c.N]);
        assert.deepEqual(ch.pcs, want, `${key} ${id} k=${k} degree ${d}: the cycle`);
        assert.equal(ch.quality, quals[d % quals.length], `${key} ${id} k=${k} degree ${d}`);
        assert.equal(qualityBy(ch.pcs), ch.quality, `${key} ${id} degree ${d}: parseChord agrees`);
        checked++;
      });
      assert.equal(w.distinct, distinct, `${key} ${id} k=${k}: distinct chords`);
    }
  assert.equal(checked, 12 * (8 + 8 + 6 + 8 + 8 + 6 + 12 + 12));
});

test("the sixth-diminished pair, unchanged from 261115: R 3 5 6 → {0,4,7,9} (minor {0,3,7,9}); 2 4 ♭6 7 → {2,5,8,11}", () => {
  for (const key of KEYS) {
    const t = pcOf(key);
    const rel = (ch) => ch.pcs.map((p) => mod12(p - t)).sort((a, b) => a - b).join();
    for (const [id, home] of [["sixth-dim-major", "0,4,7,9"], ["sixth-dim-minor", "0,3,7,9"]]) {
      const c = collection({ key, id });
      for (const d of [0, 2, 4, 6]) assert.equal(rel(chordOn(c, d, 2)), home, `${key} ${id} degree ${d}`);
      for (const d of [1, 3, 5, 7]) assert.equal(rel(chordOn(c, d, 2)), "2,5,8,11", `${key} ${id} degree ${d}`);
    }
  }
});

test("spelling, 12 keys × 7 collections: no double accidental, no C♭ or F♭; no E♯ or B♯ on an altered degree; plain degrees are the family's", () => {
  for (const key of KEYS) {
    const major = scaleNotes(key, "major");
    for (const id of Object.keys(COLLECTIONS))
      for (const n of collection({ key, id }).notes) {
        assert.ok(Math.abs(accOf(n.name)) <= 1, `${key} ${id}: ${n.name} is a double accidental`);
        assert.ok(!["Cb", "Fb"].includes(n.name), `${key} ${id}: ${n.name}`);
        const altered = /[♭♯]/.test(n.degName);
        if (altered) assert.ok(!["E#", "B#"].includes(n.name), `${key} ${id}: the ${n.degName} is ${n.name}`);
        else assert.equal(n.name, major[Number(n.degName === "R" ? 1 : n.degName) - 1].name, `${key}: the plain ${n.degName}`);
        assert.equal(pcOf(n.name), n.pc, `${key} ${id}: ${n.name} is the wrong pitch`);
      }
  }
  // F♯'s seventh stays E♯, as in Multetudes
  assert.equal(collection({ key: "F#", id: "sixth-dim-major" }).notes[7].name, "E#");
});

test("the ♭6 of the sixth-diminished forms: A D B E in D♭ F♯ E♭ A♭, on the sixth's letter in the other eight keys", () => {
  const RESPELLED = { Db: "A", "F#": "D", Eb: "B", Ab: "E" };
  for (const key of KEYS)
    for (const id of ["sixth-dim-major", "sixth-dim-minor"]) {
      const b6 = collection({ key, id }).notes.find((n) => n.degName === "♭6");
      const sixthLetter = scaleNotes(key, "major")[5].name[0];
      if (key in RESPELLED) assert.equal(b6.name, RESPELLED[key], `${key} ${id}`);
      else assert.equal(b6.name[0], sixthLetter, `${key} ${id}: the ♭6 ${b6.name} is on the sixth's letter`);
      assert.equal(b6.fam, "6", `${key}: the ♭6 is the sixth's family (cyan), whatever its letter`);
    }
});

test("the colour trap: the family comes from the degree name, never the letter — D♭'s ♭6 is A, and A is D♭'s fifth's letter", () => {
  const b6 = collection({ key: "Db", id: "sixth-dim-major" }).notes[5];
  assert.equal(b6.name, "A");
  assert.equal(scaleNotes("Db", "major")[4].name[0], "A", "A is the letter of D♭'s fifth");
  assert.equal(b6.degName, "♭6");
  assert.equal(b6.fam, "6");
  for (const key of KEYS) for (const id of Object.keys(COLLECTIONS))
    for (const n of collection({ key, id }).notes) assert.equal(n.fam, n.degName.replace(/[♭♯]/, ""), `${key} ${id} ${n.degName}`);
});

test("enharmonicOf: a different name, the same pitch class — for every altered degree in every collection", () => {
  let n = 0;
  for (const key of KEYS) for (const id of Object.keys(COLLECTIONS))
    for (const note of collection({ key, id }).notes) {
      if (!/[♭♯]/.test(note.degName)) continue;
      const other = enharmonicOf(note);
      assert.notEqual(other, note.name); assert.equal(pcOf(other), note.pc, `${key} ${id} ${note.name} ↔ ${other}`);
      n++;
    }
  const altered = Object.values(COLLECTIONS).reduce((a, c) => a + c.steps.slice(0, -1)
    .reduce((o, s) => [...o, o[o.length - 1] + s], [0]).filter((o) => ![0, 2, 4, 5, 7, 9, 11].includes(o)).length, 0);
  assert.equal(n, 12 * altered, `${n} altered degrees read both ways`);
  assert.equal(enharmonicOf(collection({ key: "Db", id: "sixth-dim-major" }).notes[5]), "Bbb");
});

test("the refusals, each by name: a dyad; the chromatic's whole-tone; a k past N/2; k out of range", () => {
  const chrom = collection({ key: "C", id: "chromatic" });
  assert.throws(() => chordOn(chrom, 0, 6), /is a dyad, not offered/);
  assert.throws(() => chordOn(collection({ key: "C", id: "whole-tone" }), 0, 3), /is a dyad, not offered/);
  assert.throws(() => chordOn(collection({ key: "C", id: "octatonic-wh" }), 0, 4), /is a dyad, not offered/);
  assert.throws(() => chordOn(chrom, 0, 2), /is the whole-tone scale, not a chord/);
  assert.throws(() => chordOn(chrom, 0, 9), /same cycle as k=3/);
  assert.throws(() => chordOn(chrom, 0, 0), /stacking interval is 1\.\.11/);
});

test("the degree vocabulary is the ruled one, and the module touches no other engine file", () => {
  assert.equal(DEGREE_NAMES.map((d) => d.name).join(" "), "R ♭2 2 ♭3 3 4 ♯4 5 ♭6 6 ♭7 7");
  const src = readFileSync(join(here, "..", "collection.mjs"), "utf8");
  // no interval set restated: the qualities are chord.mjs's (the grep is on the CODE's quality literals)
  assert.ok(!/\[0,\s*4,\s*7,\s*9\]|\[0,\s*3,\s*6,\s*9\]|\[0,\s*4,\s*8\]/.test(src.replace(/\/\*[\s\S]*?\*\//g, "")),
    "collection.mjs restates a chord's intervals");
  const chord = readFileSync(join(here, "..", "chord.mjs"), "utf8");
  assert.match(chord, /if \(steps\.length !== 7\) throw new Error\(`scale \$\{n\}: needs 7 steps`\)/, "chord.mjs's seven-step throw is untouched");
});
