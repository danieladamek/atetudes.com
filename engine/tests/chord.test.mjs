/* chord.test.mjs — the parser's contract, as a corpus.
 * Every expected pcs list is DERIVED in the test (root pc + named intervals),
 * not hand-typed as absolute pitches — the test encodes the rule, then checks
 * the parser agrees. Run: node --test "engine/tests/*.test.mjs"
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseChord, parseRoman, resolveRoman, scaleNotes, pcOf } from "../chord.mjs";

const mod12 = (n) => ((n % 12) + 12) % 12;
const pcsFrom = (root, ivs) => ivs.map((iv) => mod12(pcOf(root) + iv));

// [symbol, root, expected intervals from root, expected canonical symbol]
// Interval lists are the NAMED RULES from the Triadetudes §3.1 decomposition
// table and the ST PRD §4.3 catalog, written as chord-degree arithmetic.
const CORPUS = [
  // triads
  ["C", "C", [0, 4, 7], "C"],
  ["Am", "A", [0, 3, 7], "Am"],
  ["F#dim", "F#", [0, 3, 6], "F#dim"],
  ["Bbaug", "Bb", [0, 4, 8], "Bbaug"],
  ["C+", "C", [0, 4, 8], "Caug"],
  ["D-", "D", [0, 3, 7], "Dm"],
  ["Gsus4", "G", [0, 5, 7], "Gsus4"],
  ["Gsus", "G", [0, 5, 7], "Gsus4"],
  ["Dsus2", "D", [0, 2, 7], "Dsus2"],
  // sixths & sevenths — the decomposition-table rows
  ["Cmaj7", "C", [0, 4, 7, 11], "Cmaj7"],
  ["CΔ", "C", [0, 4, 7, 11], "Cmaj7"],
  ["C6", "C", [0, 4, 7, 9], "C6"],
  ["Cm6", "C", [0, 3, 7, 9], "Cm6"],
  ["Dm7", "D", [0, 3, 7, 10], "Dm7"],
  ["D-7", "D", [0, 3, 7, 10], "Dm7"],
  ["Dmin7", "D", [0, 3, 7, 10], "Dm7"],
  ["G7", "G", [0, 4, 7, 10], "G7"],
  ["Cm7b5", "C", [0, 3, 6, 10], "Cm7b5"],
  ["Cø", "C", [0, 3, 6, 10], "Cm7b5"],
  ["Cø7", "C", [0, 3, 6, 10], "Cm7b5"],
  ["C°7", "C", [0, 3, 6, 9], "Cdim7"],
  ["Bdim7", "B", [0, 3, 6, 9], "Bdim7"],
  ["CmMaj7", "C", [0, 3, 7, 11], "CmMaj7"],
  ["G7sus4", "G", [0, 5, 7, 10], "G7sus4"],
  // extensions
  ["Cmaj9", "C", [0, 4, 7, 11, 14], "Cmaj9"],
  ["Dm9", "D", [0, 3, 7, 10, 14], "Dm9"],
  ["G9", "G", [0, 4, 7, 10, 14], "G9"],
  ["G13", "G", [0, 4, 7, 10, 14, 21], "G13"],
  ["Dm11", "D", [0, 3, 7, 10, 14, 17], "Dm11"],
  // alterations
  ["G7b9", "G", [0, 4, 7, 10, 13], "G7b9"],
  ["G7#9", "G", [0, 4, 7, 10, 15], "G7#9"],
  ["Cmaj7#11", "C", [0, 4, 7, 11, 18], "Cmaj7#11"],
  ["Fmaj7#11", "F", [0, 4, 7, 11, 18], "Fmaj7#11"],
  ["G7#5", "G", [0, 4, 8, 10], "G7#5"],
  ["G7b13", "G", [0, 4, 7, 10, 20], "G7b13"],
  ["Cm7b5b9", "C", [0, 3, 6, 10, 13], "Cm7b5b9"],
  ["C7(#9)", "C", [0, 4, 7, 10, 15], "C7#9"],
  ["Cadd9", "C", [0, 4, 7, 14], "Cadd9"],
  // alt: the named rule b9 #9 #5 over a dominant (ST PRD §4.3, tritone-sub hearing)
  ["G7alt", "G", [0, 4, 8, 10, 13, 15], "G7alt"],
  ["Galt", "G", [0, 4, 8, 10, 13, 15], "G7alt"],
  // slash chords
  ["F/G", "F", [0, 4, 7], "F/G"],
  ["Fmaj7/C", "F", [0, 4, 7, 11], "Fmaj7/C"],
  ["D7#9/F#", "D", [0, 4, 7, 10, 15], "D7#9/F#"],
  // double accidentals and edge spellings
  ["Cbmaj7", "Cb", [0, 4, 7, 11], "Cbmaj7"],
  ["B#dim", "B#", [0, 3, 6], "B#dim"],
];

for (const [sym, root, ivs, canon] of CORPUS) {
  test(`parse ${sym}`, () => {
    const c = parseChord(sym);
    assert.equal(c.root.name, root, "root");
    assert.deepEqual(c.intervals, ivs, "intervals");
    assert.deepEqual(c.pcs, pcsFrom(root, ivs), "pcs derived from root+intervals");
    assert.equal(c.symbol, canon, "canonical symbol");
  });
}

test("slash bass is parsed, not merged into the chord", () => {
  const c = parseChord("F/G");
  assert.equal(c.bass.name, "G");
  assert.equal(c.bass.pc, 7);
  assert.ok(!c.pcs.includes(7) || c.intervals.includes(7), "bass not injected into pcs");
});

test("canonical symbols round-trip through the parser", () => {
  for (const [sym] of CORPUS) {
    const once = parseChord(sym);
    const twice = parseChord(once.symbol);
    assert.deepEqual(twice.pcs, once.pcs, `${sym} → ${once.symbol} pcs stable`);
    assert.equal(twice.symbol, once.symbol, `${sym} canonical form is a fixed point`);
  }
});

test("rejects garbage with a message, never a wrong chord", () => {
  for (const bad of ["", "  ", "H7", "Cmaj7xx", "7", "Cbb#"])
    assert.throws(() => parseChord(bad), Error, `should reject "${bad}"`);
});

test("every parse result carries its structural assertions", () => {
  for (const [sym] of CORPUS) {
    const c = parseChord(sym);
    assert.ok(c.intervals.includes(0), `${sym} has a root`);
    const sorted = [...c.intervals].sort((a, b) => a - b);
    assert.deepEqual(c.intervals, sorted, `${sym} intervals ascending`);
    assert.equal(new Set(c.pcs).size, c.pcs.length, `${sym} pcs unique`);
  }
});

// ---- roman numeral tokens ----

test("roman numerals parse to degree tokens", () => {
  assert.deepEqual(parseRoman("ii"), {
    degree: 1, accidental: 0, caseQuality: "min", halfDim: false, seventh: null,
  });
  assert.equal(parseRoman("V7").degree, 4);
  assert.equal(parseRoman("V7").seventh, "7");
  assert.equal(parseRoman("Imaj7").seventh, "maj7");
  assert.equal(parseRoman("vii°").caseQuality, "dim");
  assert.equal(parseRoman("viiø7") === null, false);
  assert.equal(parseRoman("bVII").accidental, -1);
  assert.equal(parseRoman("III+").caseQuality, "aug");
  assert.equal(parseRoman("Q7"), null);
  assert.equal(parseRoman("Dm7"), null, "absolute symbols are not romans");
});

// ---- roman-numeral RESOLUTION (Triadetudes v0.6 — the consumer with a key) ----

const TWELVE_KEYS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
// [roman, scale-degree index, semitone offset of the degree root in major,
//  suffix the symbol must end with, interval set the chord must carry]
const ROMAN_CASES_MAJOR = [
  ["ii7", 1, 2, "m7", [0, 3, 7, 10]],
  ["V7", 4, 7, "7", [0, 4, 7, 10]],
  ["Imaj7", 0, 0, "maj7", [0, 4, 7, 11]],
  ["I6", 0, 0, "6", [0, 4, 7, 9]],
  ["vi", 5, 9, "m", [0, 3, 7]],
  ["IV", 3, 5, "", [0, 4, 7]],
  ["viiø7", 6, 11, "m7b5", [0, 3, 6, 10]],
  ["vii°7", 6, 11, "dim7", [0, 3, 6, 9]],
  ["V9", 4, 7, "9", [0, 4, 7, 10, 14]],
  ["iv", 3, 5, "m", [0, 3, 7]], // borrowed: the numeral's case wins over the key
];

test("roman resolution: every case, all twelve major keys", () => {
  for (const key of TWELVE_KEYS)
    for (const [tok, deg, semis, suffix, ivs] of ROMAN_CASES_MAJOR) {
      const r = resolveRoman(tok, key, "major");
      assert.ok(r, `${tok} in ${key} resolves`);
      const wantPc = (pcOf(key) + semis) % 12;
      assert.equal(r.parsed.root.pc, wantPc, `${tok} in ${key}: root pc`);
      assert.equal(r.parsed.root.name, scaleNotes(key, "major")[deg].name,
        `${tok} in ${key}: root spelled from the scale`);
      assert.ok(r.symbol.endsWith(suffix) || suffix === "",
        `${tok} in ${key}: symbol ${r.symbol} carries ${suffix}`);
      assert.deepEqual(r.parsed.intervals, ivs, `${tok} in ${key}: intervals`);
    }
});

test("roman resolution: minor modes resolve against their own scales", () => {
  // harmonic minor: V7 is the raised-seventh dominant, i is minor
  for (const key of TWELVE_KEYS) {
    const five = resolveRoman("V7", key, "harm");
    assert.equal(five.parsed.root.pc, (pcOf(key) + 7) % 12, `V7 in ${key} harm`);
    assert.deepEqual(five.parsed.intervals, [0, 4, 7, 10]);
    const one = resolveRoman("i", key, "harm");
    assert.equal(one.parsed.root.pc, pcOf(key));
    assert.deepEqual(one.parsed.intervals, [0, 3, 7]);
    // melodic minor: degree 6 sits a major sixth up (the raised 6th)
    const six = resolveRoman("vi", key, "mel");
    assert.equal(six.parsed.root.pc, (pcOf(key) + 9) % 12, `vi in ${key} mel`);
  }
});

test("roman resolution: accidentals bend the spelled scale note", () => {
  assert.equal(resolveRoman("bVII", "C").symbol, "Bb");
  assert.equal(resolveRoman("bVII", "Eb").symbol, "Db", "flat key stays flat-side");
  assert.equal(resolveRoman("bVII7", "G").symbol, "F7");
  assert.equal(resolveRoman("#iv", "C").parsed.root.name, "F#");
  assert.equal(resolveRoman("bII", "A").parsed.root.name, "Bb");
});

test("roman resolution: imaj7 is minor-major; non-romans return null", () => {
  assert.equal(resolveRoman("imaj7", "C").symbol, "CmMaj7");
  assert.equal(resolveRoman("Dm7", "C"), null, "absolute symbols pass through");
  assert.equal(resolveRoman("nonsense", "C"), null);
});

test("scaleNotes spells each scale with one note per letter", () => {
  for (const key of TWELVE_KEYS)
    for (const scaleType of ["major", "harm", "mel"]) {
      const notes = scaleNotes(key, scaleType);
      assert.equal(notes.length, 7, `${key} ${scaleType}`);
      assert.equal(new Set(notes.map((n) => n.name[0])).size, 7, "seven letters");
      assert.equal(new Set(notes.map((n) => n.pc)).size, 7, "seven pitch classes");
    }
  assert.equal(scaleNotes("A", "harm").map((n) => n.name).join(" "), "A B C D E F G#");
  assert.equal(scaleNotes("A", "mel").map((n) => n.name).join(" "), "A B C D E F# G#");
});

test("+M7 is a SPELLING of maj7#5, and the two converge in every key (260819.6)", () => {
  // the augmented-major seventh (harmonic/melodic minor's III), as the tetrad
  // payload spells it. A tokenizer alias, not a chord rule: same structure,
  // same canonical symbol, no interval data of its own to drift.
  for (const key of ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]) {
    const alias = parseChord(key + "+M7"), canon = parseChord(key + "maj7#5");
    assert.deepEqual(alias.intervals, [0, 4, 8, 11], key + "+M7 is not the augmented-major seventh");
    assert.deepEqual(alias.intervals, canon.intervals, key + ": the two spellings diverge");
    assert.deepEqual(alias.pcs, canon.pcs, key + ": pitch classes diverge");
    assert.equal(alias.symbol, canon.symbol, key + ": canonical respelling diverges");
  }
  // the alias keeps its tail: alterations after +M7 still parse
  assert.deepEqual(parseChord("C+M7no5").intervals, parseChord("Cmaj7#5no5").intervals);
});
