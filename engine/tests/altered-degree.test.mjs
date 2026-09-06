/* altered-degree.test.mjs — Design Spec v1.4 §2.6: a non-diatonic note wears the
 * colour of the degree it ALTERS, and its interior is that degree with its
 * accidental. Both derive from the spelling's LETTER — night 31's speller
 * (rule C) already chose which of the two neighbouring degrees a chromatic
 * pitch belongs to; this test pins the ruling's own verified examples
 * (Daniel, 260928, against the live speller) and the arithmetic around them.
 * A table of pitch → degree would be a golden-rule-1 violation; the function
 * under test takes the speller's answer and reads its letter.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { alteredDegree, chromaticSpeller, scaleNotes } from "../chord.mjs";

test("260930: the ruling's five, C harmonic minor — the spelled letter names the altered degree", () => {
  const alt = alteredDegree("C", "harm");
  const want = { 61: ["Db", 1, "b2"], 64: ["E", 2, "3"], 66: ["Gb", 4, "b5"], 69: ["A", 5, "6"], 70: ["Bb", 6, "b7"] };   // the accidental against MAJOR: E is the major 3rd, A the major 6th
  for (const [midi, [name, deg, label]] of Object.entries(want)) {
    const a = alt(+midi);
    assert.equal(a.name, name, `${midi} spells ${name}`);
    assert.equal(a.deg, deg, `${name} alters degree index ${deg} (${["R","2","3","4","5","6","7"][deg]})`);
    assert.equal(a.label, label, `${name}'s interior is ${label}`);
    assert.equal(a.chromatic, true);
  }
});

test("260930: the accidental is read against the MAJOR degree — a player's name: E in C harm is the major 3rd (\"3\"), B in F major is ♯4, F in G major is ♭7", () => {
  assert.equal(alteredDegree("C", "harm")(64).label, "3");
  assert.equal(alteredDegree("C", "harm")(64).acc, 0, "no accidental against major — the shape says non-diatonic, the interior says which degree");
  assert.equal(alteredDegree("C", "harm")(63).label, "3", "E♭ IS the scale's 3rd — diatonic, the family label");
  assert.equal(alteredDegree("C", "harm")(63).acc, -1, "…and its accidental against major is ♭, available to a caller that wants ♭3");
  const f = alteredDegree("F", "major")(71);
  assert.deepEqual([f.name, f.deg, f.label], ["B", 3, "#4"]);
  const g = alteredDegree("G", "major")(65);   // F natural in G major: the scale has F♯
  assert.deepEqual([g.name, g.deg, g.label], ["F", 6, "b7"]);
});

test("260930: a diatonic note is not altered — its own degree, no accidental in the label, chromatic false", () => {
  const alt = alteredDegree("Bb", "major");
  for (const [i, n] of scaleNotes("Bb", "major").entries()) {
    const a = alt(60 + n.pc);
    assert.equal(a.deg, i, `${n.name} is degree ${i}`);
    assert.equal(a.chromatic, false);
    assert.equal(a.label, ["R", "2", "3", "4", "5", "6", "7"][i], "a diatonic interior is the plain degree");
  }
});

test("260930: the derivation is the speller's, not a second opinion — every chromatic pitch in every key agrees with chromaticSpeller's letter", () => {
  let checked = 0;
  for (const key of ["C", "F", "Bb", "Eb", "Ab", "G", "D", "A", "E"])
    for (const scale of ["major", "harm", "mel"]) {
      const sp = chromaticSpeller(key, scale), alt = alteredDegree(key, scale);
      const letters = "CDEFGAB", keyLetter = scaleNotes(key, scale)[0].name[0];
      for (let midi = 60; midi < 72; midi++) {
        const a = alt(midi), s = sp(midi);
        assert.equal(a.name, s.name);
        assert.equal(a.deg, (letters.indexOf(s.name[0]) - letters.indexOf(keyLetter) + 7) % 7, `${key} ${scale} ${s.name}: the letter's distance from the key letter IS the degree`);
        checked++;
      }
    }
  assert.equal(checked, 9 * 3 * 12, "the sweep must actually run");
});
