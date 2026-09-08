/* tuning.test.mjs — ALTERNATE TUNINGS, ITEM 1: the tuning becomes the field's fact (night 44, 261008)
 *
 * Design note: notes/specs/multetudes — the tuning, the open string, and what a tuning belongs
 * to.md (§3, §5, §6). OPEN_MIDI stops being read as THE tuning and becomes the DEFAULT; the
 * field carries `opens`, derived from an optional `tuning` (offsets from standard, per string,
 * §7's shape) and asserted WELL-FORMED — six strings 1..6 each once, each open within ±6
 * semitones of its standard value, strictly ascending in pitch 6 → 1 (§4: no crossing, because
 * slots are pitch-ordered and a crossed tuning would change what every stored figure means).
 *
 * THE GATE FOR THE WHOLE FEATURE: the neck and the ear must agree. The failure this feature can
 * produce is not a crash, it is a plausible wrong answer — a page drawing DADGAD while the audio
 * sounds standard. Tonight nothing exposes a tuning, so the pin is a unit one: a drop-D field
 * has string 6 SOUND a D everywhere a midi is derived.
 *
 * THE OPEN STRING'S NAME (Daniel, 261008): spelled BY THE DIRECTION OF THE MOVE — down is flat,
 * up is sharp, unmoved is natural. A deliberate divergence from chromaticSpeller's jurisdiction
 * (chord.mjs), with the reason in the register: the label names the INSTRUMENT, not the field.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { field, notesOn, OPEN_MIDI, opensOf, assertOpens } from "../field.mjs";
import { openStringName, setLabel } from "../open-string.mjs";
import { makeRun } from "../string-run.mjs";
import { tetradPass, STRING_SETS, defaultZoneFrets } from "../tetrad-sequence.mjs";
import { placeReference } from "../reference.mjs";
import { positionOf } from "../position.mjs";
import { figureEvents } from "../figure.mjs";
import { SET_LABELS } from "../../hub/modules/notepad-card.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const STANDARD = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };
const DADGAD = { 6: -2, 2: -2, 1: -2 };

test("the default: field({key,scale}) and an explicit-standard field produce identical opens — every existing caller unchanged", () => {
  const a = field({ key: "C", scale: "major" }), b = field({ key: "C", scale: "major", tuning: {} });
  const c = field({ key: "C", scale: "major", tuning: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } });
  assert.deepEqual(a.opens, STANDARD); assert.deepEqual(b.opens, a.opens); assert.deepEqual(c.opens, a.opens);
  assert.deepEqual(a.opens, OPEN_MIDI, "the default IS the derived standard");
  assert.notEqual(a.opens, OPEN_MIDI, "…as a copy on the field, never the module constant itself");
  assert.deepEqual(a.tuning, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }, "the field states its offsets, total");
});

test("a DADGAD field builds; a crossed one throws — well-formedness, not identity", () => {
  const f = field({ key: "D", scale: "major", tuning: DADGAD });
  assert.deepEqual(f.opens, { 6: 38, 5: 45, 4: 50, 3: 55, 2: 57, 1: 62 });
  assert.throws(() => field({ key: "C", scale: "major", tuning: { 5: 6 } }), /cross|ascend/i, "A up a tritone sits above D: crossed");
  assert.throws(() => field({ key: "C", scale: "major", tuning: { 4: -6 } }), /cross|ascend/i, "D down a tritune lands under A: crossed");
  assert.throws(() => field({ key: "C", scale: "major", tuning: { 6: -7 } }), /±6|range|within/i, "beyond the window");
  assert.throws(() => field({ key: "C", scale: "major", tuning: { 7: -1 } }), /string 7|not a real string|1\.\.6/i, "a string that does not exist");
  assert.throws(() => field({ key: "C", scale: "major", tuning: { 6: 1.5 } }), /integer|semitone/i, "a non-integer offset");
});

test("THE OLD ASSERTION'S THREE CASES are still caught by the well-formedness checks: a swapped pair, a missing string, a transposed digit", () => {
  const swapped = { ...STANDARD, 5: 50, 4: 45 };
  assert.throws(() => assertOpens(swapped), /ascend|cross/i, "a swapped pair breaks the ascent");
  const missing = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59 };
  assert.throws(() => assertOpens(missing), /six|1\.\.6|string 1/i, "a missing string");
  const transposed = { ...STANDARD, 5: 54 };
  assert.throws(() => assertOpens(transposed), /±6|range|within|ascend/i, "a transposed digit (45 → 54) leaves the window");
  const transposed6 = { ...STANDARD, 6: 4 };
  assert.throws(() => assertOpens(transposed6), /±6|range|within/i, "a transposed digit on the sixth (40 → 04)");
  assert.doesNotThrow(() => assertOpens(STANDARD));
  assert.doesNotThrow(() => assertOpens(opensOf(DADGAD)));
});

test("THE SOUND PIN: in drop D, string 6 sounds a D everywhere a midi is derived", () => {
  const dropD = { 6: -2 };
  const fld = field({ key: "D", scale: "major", tuning: dropD });
  // the field's own notes
  const open6 = notesOn(6, fld).find((n) => n.fret === 0);
  assert.equal(open6.midi, 38, "notesOn: the open sixth is D2 (38)");
  for (const n of notesOn(6, fld)) assert.equal(n.midi, 38 + n.fret);
  // the run
  const run = makeRun([6, 5, 4, 3], fld.opens);
  assert.equal(run.opens[0], 38); assert.equal(run.label, "G–D–A–D");
  // the pass: every voicing note on string 6 sounds 38 + fret
  const pass = tetradPass({ key: "D", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0, tuning: dropD });
  assert.equal(pass.opens[6], 38); assert.equal(pass.set.opens[0], 38);
  let seen = 0;
  for (const s of pass.steps) for (const n of s.voicing.notes) if (n.string === 6) { seen++; assert.equal(n.midi, 38 + n.fret, `${s.symbol}: string 6 fret ${n.fret}`); }
  assert.ok(seen >= 8, `not vacuous: ${seen} notes on the sixth`);
  assert.equal(pass.set.label, "G–D–A–D", "the set's label follows the tuning");
  // the zone: the default anchor-string triple is derived from the tuned open string
  const eMajor = field({ key: "E", scale: "major", tuning: dropD });
  const triple = defaultZoneFrets("E", "major", 6, eMajor.opens);
  assert.notDeepEqual(triple, defaultZoneFrets("E", "major", 6), "drop D moves the sixth's scale frets (E major: [6,7,9], not [5,7,9])");
  for (const f of triple) assert.ok(eMajor.pcs.includes((38 + f) % 12), `zone fret ${f} on the tuned sixth sounds a scale note`);
  for (const f of defaultZoneFrets("D", "major", 6, fld.opens)) assert.ok(fld.pcs.includes((38 + f) % 12));
  // the reference
  const pos = positionOf({ field: fld, anchorString: 6, startDegree: 0, nearFret: 3, strings: [6, 5, 4, 3] });
  const rp = placeReference("root", 0, fld, [6, 5, 4, 3], pos, {});
  if (rp.note && rp.note.string === 6) assert.equal(rp.note.midi, 38 + rp.note.fret, "the reference's placement is honest under the tuning");
  // the figure's events
  const ev = figureEvents({ voicing: pass.steps[0].voicing, chord: pass.steps[0].chord, symbol: pass.steps[0].symbol },
    { parsed: null, address: "pattern", playback: "strum", durBeats: 4, bpm: 72,
      ctx: { scalePcs: fld.pcs, tonicPc: fld.pcs[0], open: fld.opens, nfrets: 15, set: [6, 5, 4, 3] } });
  for (const e of ev) if (e.string === 6 && Number.isInteger(e.fret)) assert.equal(e.midi, 38 + e.fret, "figureEvents: the sixth sounds D");
  // and standard is untouched by all of it
  assert.deepEqual(tetradPass({ key: "D", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0 }).opens, STANDARD);
});

test("THE OPEN STRING'S NAME: by the direction of the move — down flat, up sharp, unmoved natural; the only table is the twelve names", () => {
  assert.equal(openStringName(40, 40), "E");
  assert.equal(openStringName(38, 40), "D", "drop D reads D");
  assert.equal(openStringName(39, 40), "E♭", "down one reads flat");
  assert.equal(openStringName(41, 40), "F", "up one from E is a natural");
  assert.equal(openStringName(42, 40), "F♯", "up two reads sharp");
  assert.equal(openStringName(37, 40), "D♭", "down three reads flat");
  assert.equal(openStringName(60, 59), "C", "B up one: natural");
  assert.equal(openStringName(58, 59), "B♭"); assert.equal(openStringName(56, 55), "G♯");
  assert.equal(setLabel([6, 5, 4, 3], opensOf(DADGAD), OPEN_MIDI), "G–D–A–D");
  assert.equal(setLabel([4, 3, 2, 1], opensOf(DADGAD), OPEN_MIDI), "D–A–G–D", "N4's uppercase dialect holds when string 1 is not an E");
  assert.equal(setLabel([4, 3, 2, 1], opensOf({ 1: -1 }), OPEN_MIDI), "E♭–B–G–D");
  assert.equal(setLabel([6, 5, 4, 3], OPEN_MIDI, OPEN_MIDI), "G–D–A–E");
  // the rule is stable under a key change: no key is an input
  assert.equal(openStringName.length, 2, "openStringName(midi, standardMidi) — the key is not an argument");
  const src = readFileSync(join(here, "..", "open-string.mjs"), "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  assert.ok(!/chromaticSpeller|scaleNotes|^import /m.test(code), "the spelling imports nothing — the twelve names and the direction");
  assert.ok(/THE STRING LABEL NAMES THE INSTRUMENT, NOT THE FIELD/.test(src), "the §4.4 reason is written in the code");
});

test("rule 6: the notepad card's set labels are DERIVED from the standard opens, the same way string-run labels a run — the chore closed", () => {
  assert.deepEqual(SET_LABELS, STRING_SETS.map((s) => s.label), "the card's labels are the engine's, index for index");
  assert.deepEqual(SET_LABELS, ["G–D–A–E", "B–G–D–A", "E–B–G–D"]);
  const card = readFileSync(join(here, "..", "..", "hub", "modules", "notepad-card.mjs"), "utf8");
  assert.ok(!/"G–D–A–E"|"E–B–G–D"/.test(card), "no literal label survives in the card");
  assert.ok(!/tetrad-sequence\.mjs/.test(card.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")), "…and the card imports no tetrad engine (take the labels, not the tree)");
  assert.ok(!/const letter = \(s\) => \["", "E", "B", "G", "D", "A", "E"\]/.test(readFileSync(join(here, "..", "tetrad-sequence.mjs"), "utf8")),
    "tetrad-sequence's hand letter table is gone — the label is derived");
});

test("NOTHING READS OPEN_MIDI AS THE TUNING: the module constant is the default, read only where a default is stated", () => {
  const ENGINE = join(here, "..");
  const offenders = [];
  for (const f of readdirSync(ENGINE).filter((x) => x.endsWith(".mjs"))) {
    // block comments blanked (their prose may name the constant); LINE comments kept, because a
    // default read declares itself in the line comment beside it
    const src = readFileSync(join(ENGINE, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
    for (const m of src.matchAll(/OPEN_MIDI\[/g)) {
      const line = src.slice(src.lastIndexOf("\n", m.index) + 1, src.indexOf("\n", m.index));
      if (/^\s*\/\//.test(line)) continue;   // a comment line, not a read
      // a read is a DEFAULT when its own line says so — the enumeration's standard opens,
      // a default argument; anything else reads the constant as THE tuning
      if (f !== "field.mjs" && !/default/i.test(line)) offenders.push(`${f}: ${line.trim()}`);
    }
  }
  assert.deepEqual(offenders, [], "an indexed read of OPEN_MIDI outside field.mjs, on a line that does not name it the default, reads the constant as THE tuning");
  assert.ok(readFileSync(join(ENGINE, "tetrad-sequence.mjs"), "utf8").includes("opens: strings.map((s) => OPEN_MIDI[s]),   // the DEFAULT's"), "the one allowed read names itself");
  for (const f of ["selection.mjs", "reference.mjs"]) {
    const src = readFileSync(join(ENGINE, f), "utf8");
    assert.ok(!/import \{[^}]*OPEN_MIDI[^}]*\} from "\.\/field\.mjs"/.test(src), `${f} takes the opens from the field it is handed`);
  }
});
