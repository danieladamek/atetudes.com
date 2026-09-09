/* roman.test.mjs — ONE ROMAN SPELLING, ONE NAMED REDUCTION (the 261006 ruling, built 261008)
 *
 * "The roman names FUNCTION. Quality is the symbol's job wherever the symbol is present. Where
 * the roman stands alone, it carries the quality itself." Three spellers exist for one concept —
 * progression.mjs's (vii°: the triad's reading — case, and ° when diminished), tetrad-sequence's
 * romanOf (viiø7: the seventh named) and the cycles generator's ROMAN_SUFFIX in Python. The chart
 * line, where the symbol is always present, takes the function-only spelling on every study;
 * the "Start on" selector, where the roman stands alone, keeps its tags. NEVER A FOURTH TABLE:
 * the chip's roman is derived from the full one through ONE named function, engine/roman.mjs's
 * functionRoman, and this file asserts the reduction agrees with progression.mjs's spelling on
 * the part they share — every diatonic tetrad of every key and scale.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { functionRoman } from "../roman.mjs";
import { tetradOnDegree, romanOf } from "../tetrad-sequence.mjs";
import { progressionOf, chordAt } from "../progression.mjs";
import { field } from "../field.mjs";
import { SCALE_STEPS } from "../chord.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

test("the reduction: the seventh's tag goes, the triad's reading stays — case, and ° for the diminished", () => {
  assert.equal(functionRoman("viiø7"), "vii°"); assert.equal(functionRoman("vii°7"), "vii°"); assert.equal(functionRoman("viio7"), "vii°");
  assert.equal(functionRoman("Imaj7"), "I"); assert.equal(functionRoman("ii-7"), "ii"); assert.equal(functionRoman("V7"), "V");
  assert.equal(functionRoman("i-Δ7"), "i"); assert.equal(functionRoman("imΔ7"), "i");
  /* THE ROMAN NAMES THE TRIAD (ruling 261008c, sharpening 261006): case for the third, ° or + for
   * the fifth — the same fact, an altered fifth — and the seventh is the symbol's job. */
  assert.equal(functionRoman("III+7"), "III+", "the augmented fifth keeps its +"); assert.equal(functionRoman("III+Δ7"), "III+");
  assert.equal(functionRoman("vii°7"), "vii°"); assert.equal(functionRoman("V+"), "V+", "already function-only: unchanged");
  assert.equal(functionRoman("vii°"), "vii°", "already function-only: unchanged"); assert.equal(functionRoman("IV"), "IV"); assert.equal(functionRoman("—"), "—", "an off-key root's dash passes through");
  assert.throws(() => functionRoman("Bm7b5"), /roman/i, "a symbol is not a roman");
  assert.equal(functionRoman.length, 1);
});

test("AGREEMENT on the part they share: the reduced tetrad roman IS progression.mjs's spelling, every key, every scale, every degree", () => {
  let n = 0;
  for (const key of KEYS) for (const scale of Object.keys(SCALE_STEPS)) {
    const fld = field({ key, scale });
    const prog = progressionOf({ source: "cycle", cycle: "fourths", start: 0, object: "tetrad", tones: [1, 3, 5, 7], bass: "none", strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3, split: null }, key, scale);
    const byDegree = new Map();
    for (let i = 0; i < prog.chords.length; i++) { const c = chordAt(prog, i, fld, "tetrad", null); byDegree.set(c.degree, c.roman); }
    for (let deg = 0; deg < 7; deg++) {
      const t = tetradOnDegree(key, scale, deg);
      const full = romanOf({ ...t, degree: deg });
      assert.ok(byDegree.has(deg), `${key} ${scale}: the cycle of fourths visits degree ${deg}`);
      assert.equal(functionRoman(full), byDegree.get(deg), `${key} ${scale} degree ${deg + 1}: functionRoman(${JSON.stringify(full)}) must equal progression's ${JSON.stringify(byDegree.get(deg))}`);
      n++;
    }
  }
  assert.equal(n, 12 * Object.keys(SCALE_STEPS).length * 7, "not vacuous");
  // THE WIDER SHARED PART (261008c): the altered fifth in BOTH directions is inside it — the
  // diminished (major vii, harm ii and vii, mel vi and vii) and the augmented (harm and mel III)
  const romanIn = (key, scale, deg) => functionRoman(romanOf({ ...tetradOnDegree(key, scale, deg), degree: deg }));
  assert.equal(romanIn("C", "harm", 2), "III+", "C harmonic minor's third degree is Ebmaj7#5 — an augmented triad, spelled III+");
  assert.equal(romanIn("C", "mel", 2), "III+"); assert.equal(romanIn("C", "harm", 1), "ii°"); assert.equal(romanIn("C", "mel", 5), "vi°"); assert.equal(romanIn("C", "major", 6), "vii°");
  assert.equal(romanIn("C", "harm", 5), "VI", "a perfect fifth gains no mark");
});

test("the generator's spellings reduce through the same function — no fourth table: every ROMAN_SUFFIX value is one the reduction reads", () => {
  const py = readFileSync(join(here, "..", "..", "generators", "cycles_interactive.py"), "utf8");
  const m = py.match(/ROMAN_SUFFIX = \{([\s\S]*?)\}/);
  assert.ok(m, "cycles_interactive.py declares ROMAN_SUFFIX");
  const suffixes = [...m[1].matchAll(/"([^"]*)":\s*"([^"]*)"/g)].map((x) => x[2]);
  assert.ok(suffixes.length >= 7, `the Python table's ${suffixes.length} suffixes were read`);
  for (const s of suffixes) {
    const reduced = functionRoman("vii" + s);
    assert.ok(reduced === "vii" || reduced === "vii°" || reduced === "vii+", `"vii${s}" reduces to a function spelling, got ${JSON.stringify(reduced)}`);
  }
  assert.equal(functionRoman("viiø7"), "vii°"); assert.equal(functionRoman("viio7"), "vii°", "the Python's o7 is the diminished seventh");
  assert.ok(!/def function_roman|ROMAN_FUNCTION|FUNCTION_ROMAN/.test(py), "the generator holds no reduction of its own — the page reduces through the inlined engine function");
  assert.ok(/M_ROMAN\.functionRoman\(/.test(py), "…and the generated page's chip calls it");
  assert.ok(/engine_inline\(\[[^\]]*"roman"[^\]]*\]\)/.test(py), "…inlined through the bridge");
});

test("WHERE THE ROMAN STANDS ALONE it keeps its quality: the Start-on selector's source is untouched, and the chip's source reduces", () => {
  const hp = readFileSync(join(here, "..", "..", "hub", "modules", "harmony-panel.mjs"), "utf8");
  assert.ok(/label: romanOf\(\{ \.\.\.t, degree: deg \}\)/.test(hp), "harmony-panel's Start-on options are the full roman (romanOf), tags and all");
  assert.ok(!/functionRoman/.test(hp), "…and never reduced");
  const ct = readFileSync(join(here, "..", "..", "hub", "modules", "chord-timeline.mjs"), "utf8");
  assert.ok(/roman: functionRoman\(s\.roman\)/.test(ct), "the tetradetudes chip reduces through the one function");
  assert.ok(/Start on|stands alone/.test(ct), "…and the difference is stated beside the reduction");
});
