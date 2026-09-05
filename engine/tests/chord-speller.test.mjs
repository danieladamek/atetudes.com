/* chord-speller.test.mjs — THE ONE CHROMATIC SPELLER (260920, night 26 item 2).
 *
 * Until tonight the rule lived twice, in score-board.mjs and staff-board.mjs,
 * each importing LETTER_PC from chord.mjs and restating the law beside it,
 * with a hand-kept `|| key === "F"` for the one flat key whose NAME carries no
 * flat. These pins are on the owner: the law (keep the letter, move the
 * accidental), the key-signature reading that makes F fall out unsaid, and
 * PITCH HONESTY — every spelled name names the pitch class it was asked for,
 * which the two copies failed whenever the neighbour already carried an
 * accidental (staff-board drew a semitone off; score-board fell back to "C").
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromaticSpeller, scaleNotes, pcOf, SCALE_STEPS } from "../chord.mjs";

const here = dirname(fileURLToPath(import.meta.url));
// THE APP'S OWN KEYS — read from harmony-card.mjs's list, never restated here (rule 6)
const KEYS = (() => {
  const src = readFileSync(join(here, "..", "..", "hub", "modules", "harmony-card.mjs"), "utf8");
  const m = /KEYS\s*=\s*\[([^\]]*)\]/.exec(src);
  return [...m[1].matchAll(/"([A-G][b#]?)"/g)].map((x) => x[1]);
})();
const pc = (n) => ((n % 12) + 12) % 12;

test("F major spells its chromatics with flats — the special case falls out of the key signature, nothing said", () => {
  const sp = chromaticSpeller("F", "major");
  assert.equal(sp(61).name, "Db"); assert.equal(sp(68).name, "Ab"); assert.equal(sp(63).name, "Eb");
  assert.equal(sp(70).name, "Bb", "the diatonic B♭ is the scale's own");
  // the reading that decides it: F major's collection carries a flat; C major's carries none
  assert.ok(scaleNotes("F", "major").some((n) => n.name.includes("b")));
  assert.ok(!scaleNotes("C", "major").some((n) => n.name.includes("b")));
  assert.equal(chromaticSpeller("C", "major")(61).name, "C#", "C major spells sharp");
});

test("RULE C (260923): the fewest-accidental neighbour, then the nearer, then the parent collection's side — where the old law spelled doubles", () => {
  assert.equal(chromaticSpeller("Db", "major")(62).name, "D", "Db major, pc 2: D♭ raised → D (was Ebb)");
  assert.equal(chromaticSpeller("Db", "major")(67).name, "G", "Db major, pc 7 (was Abb)");
  assert.equal(chromaticSpeller("E", "major")(62).name, "D", "E major, pc 2: D♯ lowered → D (was C##)");
  assert.equal(chromaticSpeller("F", "harm")(62).name, "D", "F harm, pc 2: D♭ raised → D (was Ebb)");
  assert.equal(chromaticSpeller("C", "harm")(69).name, "A", "C harm, pc 9: A♭ raised — unchanged");
  assert.equal(chromaticSpeller("C", "harm")(66).name, "Gb", "C harm, pc 6: the known limit — F♯/G♭ tie on accidentals and distance; the relative major (E♭) is flat-side");
  assert.equal(chromaticSpeller("Gb", "major")(71).oct, 5, "Cb sounds below its C: the written octave follows the letter — unchanged, diatonic");
  assert.equal(chromaticSpeller("C#", "major")(60).name, "B#"); assert.equal(chromaticSpeller("C#", "major")(60).oct, 3);
  // the C harmonic minor row, twelve spellings (ruled 260923)
  assert.deepEqual(Array.from({ length: 12 }, (_, pc) => chromaticSpeller("C", "harm")(60 + pc).name),
    ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]);
});

test("PITCH HONESTY: in every key and scale, every chromatic pitch class is spelled as itself", () => {
  let n = 0;
  for (const key of KEYS)
    for (const scale of Object.keys(SCALE_STEPS)) {
      const sp = chromaticSpeller(key, scale);
      const own = new Set(scaleNotes(key, scale).map((x) => x.pc));
      for (let midi = 48; midi < 72; midi++) {
        const { name } = sp(midi);
        assert.equal(pcOf(name), pc(midi), `${key} ${scale}: midi ${midi} spelled ${name}`);
        if (own.has(pc(midi))) assert.ok(scaleNotes(key, scale).some((x) => x.name === name), "a diatonic note takes the scale's own name");
        n++;
      }
    }
  assert.equal(n, KEYS.length * 3 * 24, "the corpus must actually run");
  assert.ok(KEYS.length >= 12, "the app offers at least the twelve keys");
});

test("the ±2 guard EXISTS, and no key the app offers reaches it under rule C (the guard stays anyway)", () => {
  const src = readFileSync(join(here, "..", "chord.mjs"), "utf8");
  assert.match(src, /needs \$\{Math\.abs\(acc\)\} accidentals/, "the guard is still written");
  for (const key of KEYS) for (const scale of Object.keys(SCALE_STEPS)) {
    const sp = chromaticSpeller(key, scale);
    for (let midi = 48; midi < 72; midi++) assert.doesNotThrow(() => sp(midi), `${key} ${scale} ${midi}`);
  }
});

test("THE CORPUS COUNT: across the app's 12 keys × 3 scales × 12 pitch classes, exactly ONE spelling carries a double accidental", () => {
  const doubles = [];
  for (const key of KEYS) for (const scale of Object.keys(SCALE_STEPS)) {
    const sp = chromaticSpeller(key, scale);
    for (let pc = 0; pc < 12; pc++) { const { name } = sp(60 + pc); if (/##|bb/.test(name)) doubles.push(`${key} ${scale} pc${pc} ${name}`); }
  }
  assert.equal(KEYS.length * 3 * 12, 432, "the corpus is the app's");
  assert.equal(doubles.length, 1, `exactly one double accidental (Db harmonic minor): ${doubles}`);
  assert.ok(doubles[0].startsWith("Db harm"), doubles[0]);
});

test("the rule has ONE home: no hub module derives a key's flatness or keeps the F special case", () => {
  const HUB = join(here, "..", "..", "hub", "modules");
  for (const f of ["score-board.mjs", "staff-board.mjs"]) {
    const src = readFileSync(join(HUB, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.ok(!/=== "F"/.test(src), `${f} keeps the F special case`);
    assert.ok(!/flatKey/.test(src), `${f} derives flatness on its own`);
    assert.match(src, /chromaticSpeller\(/, `${f} spells through the owner`);
  }
});
