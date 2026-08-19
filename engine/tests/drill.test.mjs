/* drill.test.mjs — the shared drill layer, pinned against the shipped study.
 *
 * Two things are asserted here and they are different in kind:
 *
 *   1. EQUIVALENCE — for Triadetudes' material, every function reproduces the
 *      shipped one exactly, error prose included, over a derived corpus.
 *   2. THE SECOND CONSUMER — the same functions serve a material that is not
 *      strings at all. This is the claim the item asked to be tested rather
 *      than assumed: "is the drill layer genuinely shaped for a second
 *      consumer, or did it come out Triadetudes-specific?"
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";
import { material, parsePattern, patternText, defaultPattern, MAX_STEPS,
  SPLITS, splitFor, writtenValue, subdivisionName, orderFor } from "../drill.mjs";

const eng = loadTriadetudesEngine();
const st = eng.st;

/** Triadetudes' material, declared by the consumer — this mapping IS the whole
 * of what the drill layer needs to know about guitar string sets */
const stringSet = (set) => {
  const s = [...set].sort((a, b) => b - a);         // low → high, as the app does
  return material({ letters: { L: s[0], M: s[1], H: s[2] }, values: set,
    noun: "string", of: "the " + set.join("-") + " set" });
};

const SETS = [[1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 6]];
const TEXTS = ["H-M-L", "hml", "2-3-1", "231", "L-M-H-M", "", "   ", "H", "1",
  "H-M-L-H-M-L-H-M-L-H-M-L-H-M-L-H-M-L", "9", "6", "x", "H-9-L", "H,M,L", "LLL"];

test("stage 2 drill: parsePattern reproduces the shipped parseArp, corpus-wide", () => {
  let cases = 0;
  for (const set of SETS) {
    st.set = [...set];
    const mat = stringSet(set);
    for (const text of TEXTS) {
      assert.deepEqual(unwrap(parsePattern(text, mat)), unwrap(eng.parseArp(text)),
        `parse drift on ${JSON.stringify(text)} with set ${set.join("-")}`);
      cases++;
    }
  }
  assert.ok(cases >= 60, `corpus too small (${cases})`);
});

test("stage 2 drill: the rejection PROSE is the shipped prose, not a paraphrase", () => {
  st.set = [1, 2, 3];
  const mat = stringSet([1, 2, 3]);
  assert.deepEqual(parsePattern("9", mat), { err: "string 9 isn't in the 1-2-3 set" });
  assert.deepEqual(parsePattern("9", mat), unwrap(eng.parseArp("9")));
  const long = "H".repeat(MAX_STEPS + 1);
  assert.deepEqual(parsePattern(long, mat), unwrap(eng.parseArp(long)));
  assert.equal(MAX_STEPS, 16, "the family's figure ceiling, shared with motion.mjs");
});

test("stage 2 drill: patternText and defaultPattern match the shipped forms", () => {
  for (const set of SETS) {
    st.set = [...set];
    const mat = stringSet(set);
    const s = unwrap(st.setLowHigh);
    for (const pat of [null, [s[2], s[1], s[0]], [s[0], s[0], s[2]], [s[1]]])
      assert.equal(patternText(pat, mat), eng.patText(pat),
        `display drift on ${JSON.stringify(pat)} in set ${set.join("-")}`);
    // the shipped default: the pivot string first, then the rest low → high
    st.pivotString = s[1];
    eng.defaultArpPattern();
    assert.deepEqual(defaultPattern(material({ letters: mat.letters, values: s,
      noun: "string", of: mat.of }), s[1]), unwrap(st.arpPattern),
      `default pattern drift in set ${set.join("-")}`);
  }
});

test("stage 2 drill: subdivision arithmetic and names are the shipped ones", () => {
  let cases = 0;
  for (let beats = 1; beats <= 7; beats++)
    for (let count = 1; count <= 16; count++) {
      assert.equal(subdivisionName(beats, count), eng.subdivisionName(beats, count),
        `name drift at ${count} over ${beats}`);
      assert.equal(writtenValue(beats / count), eng.writtenValue(beats / count),
        `written-value drift at ${beats}/${count}`);
      cases++;
    }
  assert.ok(cases >= 100);
});

test("stage 2 drill: the bar splits and splitFor are the shipped table and rule", () => {
  assert.deepEqual(SPLITS, unwrap(eng.SPLITS), "the split table must not be retyped, only moved");
  for (const oldMeter of Object.keys(SPLITS).map(Number))
    for (let i = 0; i < SPLITS[oldMeter].length; i++)
      for (const newMeter of Object.keys(SPLITS).map(Number))
        assert.equal(splitFor(oldMeter, i, newMeter), eng.splitFor(oldMeter, i, newMeter),
          `splitFor drift ${oldMeter}[${i}] → ${newMeter}`);
});

test("stage 2 drill: orderFor reproduces the shipped sounding order", () => {
  st.key = "C"; st.scaleType = "major"; st.set = [1, 2, 3]; st.prog = "cycle4";
  st.harmonyMode = "build"; st.placement = "grip"; st.playback = "arpeggiated";
  eng.defaultPivots(); eng.defaultArpPattern();
  const seq = eng.buildSequence();
  const voic = eng.chooseVoicings(seq);
  for (const v of unwrap(voic))
    assert.deepEqual(orderFor(v, unwrap(st.arpPattern)), unwrap(eng.orderedNotes(v)),
      "sounding order drift");
});

/* ---- the claim that matters for Phase E: a material that is not strings ---- */

test("stage 2 drill: a NON-STRING material drills identically — the second consumer", () => {
  // Modus Operandi's shape: a pentatonic box's five degrees, addressed by
  // letters that mean nothing to a guitar set. No branch in drill.mjs knows
  // about either material; both are declared by their consumer.
  const box = material({
    letters: { R: 0, T: 2, F: 4 },              // root, third, fifth of the box
    values: [0, 2, 4, 7, 9],
    noun: "degree", of: "this box",
  });
  assert.deepEqual(parsePattern("R-T-F", box), { pattern: [0, 2, 4] });
  assert.deepEqual(parsePattern("R-T-9-R", box), { pattern: [0, 2, 9, 0] });
  assert.deepEqual(parsePattern("5", box), { err: "degree 5 isn't in this box" });
  assert.equal(patternText([0, 2, 9], box), "R-T-9");
  assert.deepEqual(defaultPattern(box, 4), [4, 0, 2, 7, 9]);
  // the subdivision half is material-blind already: five degrees over 4 beats
  assert.equal(subdivisionName(4, 5), "quarter-note 5-tuplet (5 over 4 beats)");
  // and a schedule over a material with no strings at all
  const voicing = { notes: [{ midi: 60, string: 3, fret: 5, slot: 0 },
    { midi: 64, string: 2, fret: 5, slot: 1 }, { midi: 67, string: 1, fret: 3, slot: 2 }] };
  const order = orderFor(voicing, [2, 0, 1], (n) => n.slot);
  assert.deepEqual(order.map((n) => n.midi), [67, 60, 64],
    "the slot key is the consumer's — the drill layer never assumes `string`");
});

test("stage 2 drill: a material that lies about itself fails at declaration", () => {
  assert.throws(() => material({ letters: { H: 9 }, values: [1, 2, 3],
    noun: "string", of: "the set" }),
    /slot "H" maps to 9, which is not one of this material's values/);
  assert.throws(() => material({ letters: {}, values: [1], noun: "x", of: "y" }),
    /at least one slot letter/);
});

/* ---- the §4.2.4 audit: the silent-failure family isolation.mjs carried twice,
 * hunted through drill.mjs before the module freezes. Each fix is loud at source
 * and fires only on the edge case the drift corpora above never reach, so the
 * shipped study's behaviour is untouched (characterization stays 88/88). ---- */

test("AUDIT: orderFor is loud when a pattern slot is not in the voicing — the isolation analogue", () => {
  const v = { notes: [{ midi: 60, slot: 0 }, { midi: 64, slot: 1 }] };
  // a pattern the voicing holds still orders exactly — the reporting path is unchanged
  assert.deepEqual(orderFor(v, [1, 0], (n) => n.slot).map((n) => n.midi), [64, 60]);
  // a slot the voicing does NOT hold was a silent `undefined` hole a consumer
  // without a guard drops into note-events; it must throw at source now
  assert.throws(() => orderFor(v, [0, 2, 1], (n) => n.slot),
    /names a note this voicing does not hold/,
    "a pattern slot absent from the voicing must not become a silent undefined");
  assert.equal(orderFor(v, null), null, "a null pattern is still a block attack, not an error");
});

test("AUDIT: a material's slot letters must address DISTINCT values", () => {
  // the SUBSET case stays legal — a named vocabulary over a larger legal set (the
  // box is three letters over five degrees), proven by the second-consumer test
  assert.doesNotThrow(() => material({ letters: { R: 0, T: 2, F: 4 },
    values: [0, 2, 4, 7, 9], noun: "degree", of: "box" }));
  // two letters on ONE value is ambiguous — patternText's reverse map would lose
  // one silently — so it is refused at declaration, loudly
  assert.throws(() => material({ letters: { L: 2, M: 2, H: 5 }, values: [2, 5],
    noun: "string", of: "set" }),
    /distinct values/,
    "two letters mapping to one value must be refused, not silently collapsed");
});

test("AUDIT: every bar split divides its meter — the load-time invariant", () => {
  // the table is frozen, so the guard's real job is a FUTURE typo: it runs at
  // module load, throwing on import rather than surfacing as a drifting bar.
  for (const [meter, splits] of Object.entries(SPLITS))
    for (const split of splits)
      assert.equal(split.reduce((a, b) => a + b, 0), Number(meter),
        `split [${split}] filed under meter ${meter} does not sum to it`);
});
