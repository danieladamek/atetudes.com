/* progression.test.mjs — child 7's laws, asserted on the values themselves.
 *
 * THE CASE RULE is asserted ABSOLUTELY — "Cm7 F7 Bbmaj7", the strings — not
 * through resolveRoman (a circle: the code checking itself). THE BAR COUNT
 * is witnessed as the OUTPUT of the walk across every cycle and every start.
 * THE CHART ROUND TRIP is byte equality across the whole structure catalog
 * and all twelve keys — nearly-clean is the silent-failure class in a bow
 * tie, so the assertion is ===, never a normalised comparison.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { progressionOf, cycleDegreesWalk, beatsOf, chartBodyOf, chordAt } from "../progression.mjs";
import { CYCLES } from "../tetrad-sequence.mjs";
import { STRUCTURES, chartBody } from "../structures.mjs";
import { objectTones, fieldPartition, objectOffsets, diatonicTones } from "../selection.mjs";
import { parseChord } from "../chord.mjs";
import { field } from "../field.mjs";

test("THE CASE RULE, absolutely: ii–V–I in B♭ is Cm7 F7 B♭maj7 — the minor seventh, never the dominant", () => {
  const p = progressionOf({ source: "form", form: "ii-V-I" }, "Bb");
  assert.equal(p.chords.map((c) => c.symbol).join(" "), "Cm7 F7 Bbmaj7");
  assert.notEqual(p.chords[0].symbol, "C7", "ii7 read as a dominant is the project's signature defect");
  // and the parsed qualities agree with the symbols (the parser is the law)
  assert.equal(p.chords[0].parsed.seventh, "m7");
  assert.equal(p.chords[2].parsed.seventh, "maj7");
  // the form keeps its own bars: | Cm7 F7 | Bbmaj7 |
  assert.deepEqual(p.bars, [[0, 1], [2]]);
});

test("THE DERIVED COUNT: every cycle from every start walks home in eight bars, each degree visited once", () => {
  let walked = 0;
  for (const cy of Object.keys(CYCLES))
    for (let start = 0; start < 7; start++) {
      const seq = cycleDegreesWalk(cy, start);
      assert.equal(seq.length, 8, `${cy} from ${start}: seven moves plus the bar that lands home`);
      assert.equal(seq[0], start); assert.equal(seq[7], start);
      assert.equal(new Set(seq).size, 7, `${cy} from ${start}: every degree exactly once`);
      walked++;
    }
  assert.equal(walked, 35, "the corpus must actually run");
});

test("THE CHART ROUND TRIP IS BYTE-CLEAN: every structure, all twelve keys, through the file's own parser", () => {
  const KEYS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  let looped = 0;
  for (const st of STRUCTURES)
    for (const key of KEYS) {
      const body = chartBody(st.id, key);            // what the palette inserts
      const p = progressionOf({ source: "custom", custom: body }, key);
      assert.equal(p.err, null, `${st.id} in ${key}: the palette's own chart must read back clean`);
      const back = chartBodyOf(p.chords, p.bars);    // what the progression writes
      assert.equal(back, body, `${st.id} in ${key}: the round trip must be byte-identical`);
      looped++;
    }
  assert.equal(looped, STRUCTURES.length * 12, "the corpus must actually run");
});

test("typed changes: romans resolve by the case rule, symbols parse, and a bad token refuses BY NAME", () => {
  const r = progressionOf({ source: "custom", custom: "ii7 V7 Imaj7" }, "Bb");
  assert.equal(r.chords.map((c) => c.symbol).join(" "), "Cm7 F7 Bbmaj7");
  const mixed = progressionOf({ source: "custom", custom: "Cm7 F7 Imaj7" }, "Bb");
  assert.equal(mixed.err, null);
  assert.equal(mixed.chords[2].symbol, "Bbmaj7");
  const bad = progressionOf({ source: "custom", custom: "Cm7 Qx7 F7" }, "Bb");
  assert.ok(bad.err && bad.err.includes('"Qx7"'),
    "the refusal must carry the token — v0.9 dropped it silently");
  assert.equal(bad.chords.length, 1, "the fallback keeps a board alive on the tonic bar");
  const empty = progressionOf({ source: "custom", custom: "  " }, "Bb");
  assert.equal(empty.err, null, "empty is a block, not an error");
  assert.equal(empty.bars.length, 1);
});

test("beatsOf: a matching split's slots ARE the beats; otherwise the meter partitions, front-loaded, summing exactly", () => {
  const p = progressionOf({ source: "form", form: "ii-V-I" }, "Bb");
  assert.deepEqual(beatsOf(p.bars, 4), [[2, 2], [4]]);
  assert.deepEqual(beatsOf(p.bars, 4, [3, 1]), [[3, 1], [4]],
    "a two-slot split serves the two-chord bar and leaves the one-chord bar whole");
  assert.deepEqual(beatsOf([[0, 1, 2]], 4), [[2, 1, 1]], "4 into 3, remainder to the front");
});

test("NOT IN THE KEY is a different absence from NOT IN THIS FRAME — B♭7's own 7th is off its key's field", () => {
  const fld = field({ key: "Bb", scale: "major" });
  const p = progressionOf({ source: "form", form: "blues-12" }, "Bb");
  const bb7 = p.chords[0];
  assert.equal(bb7.symbol, "Bb7");
  const { tones, absent } = objectTones(bb7.parsed, "tetrad");
  assert.equal(absent.length, 0);
  const { inKey, offKey } = fieldPartition(tones, fld);
  assert.deepEqual(offKey.map((t) => t.role), ["7"],
    "the b7 (Ab) is not in the B♭ major collection — the field cannot carry it");
  assert.equal(inKey.length, 3);
  // and the diatonic path is untouched: the key's own tetrad has no off-key tone
  const dia = diatonicTones(fld, 0, objectOffsets("tetrad"));
  assert.equal(fieldPartition(dia, fld).offKey.length, 0);
});

test("a slot the chord cannot fill is ABSENT BY NAME — the coreTetrad lesson holds on the typed path", () => {
  const c = parseChord("C");
  const tet = objectTones(c, "tetrad");
  assert.deepEqual(tet.absent, ["7"], "a tetrad on a plain triad is missing its 7, and says so");
  const dy = objectTones(c, "dyad", [3, 7]);
  assert.deepEqual(dy.absent, ["7"]);
  assert.deepEqual(dy.tones.map((t) => t.role), ["3"]);
  assert.throws(() => objectTones(c, "scale"), /scale is not a chord object/);
});

test("THE CHIP LINE, identified not counted: cycling 4ths in B\u266d, every symbol and its roman", () => {
  const fld = field({ key: "Bb", scale: "major" });
  const p = progressionOf({ source: "cycle", cycle: "fourths", start: 0 }, "Bb");
  const line = p.chords.map((_, i) => { const c = chordAt(p, i, fld, "tetrad");
    return c.symbol + ":" + c.roman; }).join(" ");
  assert.equal(line,
    "Bbmaj7:I Ebmaj7:IV Am7b5:vii\u00b0 Dm7:iii Gm7:vi Cm7:ii F7:V Bbmaj7:I",
    "eight bars, each named and analysed — a count-only pin let a wrong chord boot for two nights");
  // an off-key-rooted typed chord analyses as em-dash, never a wrong numeral
  const e7 = progressionOf({ source: "custom", custom: "E7" }, "Bb");
  assert.equal(chordAt(e7, 0, fld, "tetrad").roman, "\u2014");
});
