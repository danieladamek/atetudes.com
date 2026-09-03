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

test("the law is resolveRoman's — keep the letter, move the accidental — where the copies were wrong", () => {
  assert.equal(chromaticSpeller("Db", "major")(62).name, "Ebb", "Db major, pc 2: E♭ lowered — the copies said \"Eb\", a different pitch");
  assert.equal(chromaticSpeller("Db", "major")(67).name, "Abb");
  assert.equal(chromaticSpeller("E", "major")(62).name, "C##", "E major, pc 2: C♯ raised — the copies said \"C#\"");
  // the augmented second, both ways: F harmonic minor (a flat key) lowers E twice for pc 2;
  // C harmonic minor (a sharp-side key: C major carries no flat) RAISES A♭ for pc 9 — A natural
  assert.equal(chromaticSpeller("F", "harm")(62).name, "Ebb", "F harm, pc 2: E lowered twice across the augmented second");
  assert.equal(chromaticSpeller("C", "harm")(69).name, "A", "C harm, pc 9: A♭ raised — the natural, by the same law");
  assert.equal(chromaticSpeller("Gb", "major")(71).oct, 5, "Cb sounds below its C: the written octave follows the letter");
  assert.equal(chromaticSpeller("C#", "major")(60).name, "B#"); assert.equal(chromaticSpeller("C#", "major")(60).oct, 3);
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

test("past ±2 the law REFUSES BY NAME rather than spelling a wrong pitch (resolveRoman's own line)", () => {
  // C♭ harmonic minor (not a key the app offers): pc 8 sits in the augmented second between
  // F♭ and A♭♭... and B♭ lowered three times is the only letter-keeping spelling — refused
  assert.throws(() => chromaticSpeller("Cb", "harm")(56), /needs 3 accidentals/);
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
