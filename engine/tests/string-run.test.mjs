/* string-run.test.mjs — the free string set: identity, label, translation.
 *
 * The pins that matter:
 *   - LABELS ARE DERIVED and no enumeration exists — the grep on this module's
 *     own source. Comment-blind by design (engine/README.md): the module
 *     cannot name a label literal even in prose, and that is the assertion
 *     working, not breaking. The contract lives HERE: labels come from the
 *     open strings' pitch classes, never from a list.
 *   - {6,4,3,1} PLACES BY THE SAME ARITHMETIC as {4,3,2,1} — the 260820
 *     spike's claim, verified against the untouched generator. If this test
 *     had needed a generator change, the item's gate says stop: it did not.
 *   - the unequal-size rule: exact growing, clamped-and-reported shrinking,
 *     nothing silent.
 *   - fromSetIndex is a LOAD-TIME ALIAS against the real enumeration, pinned
 *     label-for-label and string-for-string.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { makeRun, fromSetIndex, translateFigure } from "../string-run.mjs";
import { translatePattern } from "../string-sets.mjs";
import { STRING_SETS } from "../tetrad-sequence.mjs";
import { tetradCandidates } from "../tetrad-voicings.mjs";
import { parseChord } from "../chord.mjs";
import { tetradOnDegree } from "../tetrad-sequence.mjs";
import { OPEN_MIDI } from "../field.mjs";

const here = dirname(fileURLToPath(import.meta.url));

test("labels are derived, and the alias reproduces the enumeration it retires — string for string, label for label", () => {
  for (let i = 0; i < STRING_SETS.length; i++) {
    const run = fromSetIndex(i, STRING_SETS);
    assert.deepEqual(run.strings, STRING_SETS[i].strings, `set ${i}: the identity is the run itself`);
    assert.deepEqual(run.opens, STRING_SETS[i].opens, `set ${i}: opens travel with the strings`);
    assert.equal(run.label, STRING_SETS[i].label,
      `set ${i}: two derivations of one label must agree`);
    assert.ok(run.contiguous, "the enumerated sets were all contiguous");
  }
  assert.throws(() => fromSetIndex(9, STRING_SETS), /does not name a set/);
});

test("no enumeration exists: the module's source carries no label literal (comment-blind grep)", () => {
  const src = readFileSync(join(here, "..", "string-run.mjs"), "utf8");
  for (const s of STRING_SETS)
    assert.ok(!src.includes(s.label), `string-run.mjs contains the literal "${s.label}" — labels must be derived`);
  // and no en-dash-joined letter run of any length hides in a string literal
  assert.ok(!/"[A-G](–[A-G])+"/.test(src) && !/'[A-G](–[A-G])+'/.test(src),
    "a label-shaped literal is in the source — the derived rule has been shadowed");
});

test("a skipped run is legal and labelled: {6,4,3,1} and friends", () => {
  const sk = makeRun([6, 4, 3, 1]);
  assert.deepEqual(sk.strings, [6, 4, 3, 1], "stored low pitch → high pitch");
  assert.deepEqual(sk.opens, [40, 50, 55, 64]);
  assert.equal(sk.contiguous, false);
  assert.equal(sk.label.split("–").length, 4);
  // the label reads high → low: first letter is string 1's open (E), last is string 6's (E)
  assert.equal(sk.label[0], "E");
  assert.ok(sk.label.endsWith("E"));
  assert.throws(() => makeRun([4, 4, 3]), /repeats/);
  assert.throws(() => makeRun([0, 3]), /not a real string/);
  assert.throws(() => makeRun([]), /non-empty/);
});

test("{6,4,3,1} places by the same arithmetic as {4,3,2,1} — the untouched generator, both sets", () => {
  // every diatonic tetrad of C major, both runs, same call, same laws — the
  // 260820 spike's claim that freeing the set at one note per string is NOT a
  // generator project. A generator change needed here is the item's stop gate.
  const runs = [makeRun([4, 3, 2, 1]), makeRun([6, 4, 3, 1])];
  for (let d = 0; d < 7; d++) {
    const { chord } = tetradOnDegree("C", "major", d);
    for (const run of runs) {
      const cands = tetradCandidates(chord, { set: run.opens, strings: run.strings, nfrets: 15 });
      assert.ok(cands.length > 0, `${chord.symbol} on ${run.label}: no candidates`);
      for (const v of cands) {
        assert.equal(v.notes.length, 4, "arity 4 on both runs");
        for (let i = 0; i < 4; i++) {
          assert.ok(i === 0 || v.notes[i].midi > v.notes[i - 1].midi, "ascending");
          assert.equal(v.notes[i].string, run.strings[i], "one note per set string, in order");
          assert.equal(v.notes[i].midi, OPEN_MIDI[v.notes[i].string] + v.notes[i].fret,
            "the fret is the midi's, on that string");
          assert.ok(chord.intervals.map((x) => (chord.root.pc + x) % 12)
            .includes(v.notes[i].midi % 12), "every note is a chord tone");
        }
      }
    }
  }
});

test("a skip asks for a spread: close stacks thin out on {6,4,3,1} while drops survive", () => {
  const chord = parseChord("Cmaj7");
  const closeOn = (run) => tetradCandidates(chord,
    { set: run.opens, strings: run.strings, nfrets: 15, families: ["close"] }).length;
  const drop2On = (run) => tetradCandidates(chord,
    { set: run.opens, strings: run.strings, nfrets: 15, families: ["drop2"] }).length;
  const tight = makeRun([4, 3, 2, 1]), spread = makeRun([6, 4, 3, 1]);
  assert.ok(drop2On(spread) > 0, "drop-2 lives on the skipped run");
  assert.ok(closeOn(spread) < closeOn(tight),
    "close position must get scarcer as the set spreads — that is what a skip is FOR");
});

test("equal-size translation IS string-sets.mjs's — differential, and the identity round-trip", () => {
  const A = makeRun([4, 3, 2, 1]), B = makeRun([6, 4, 3, 1]);
  for (const pat of [[4], [4, 3, 2, 1], [1, 2, 3, 4], [4, 3, 4, 3, 2, 1]]) {
    const t = translateFigure(pat, A, B);
    assert.deepEqual(t.pattern, translatePattern(pat, A.strings, B.strings), pat.join(","));
    assert.deepEqual(t.clamped, [], "equal sizes are exact");
    const back = translateFigure(t.pattern, B, A);
    assert.deepEqual(back.pattern, pat, "round-trip identity");
  }
});

test("THE UNEQUAL-SIZE RULE: growing is exact; shrinking clamps to the top slot and SAYS SO", () => {
  const four = makeRun([4, 3, 2, 1]), three = makeRun([3, 2, 1]);
  // shrinking: the slot that lived on the missing top string flattens onto the
  // run's highest string, and the step is reported
  const t = translateFigure([4, 3, 4, 3, 2, 1], four, three);
  assert.deepEqual(t.pattern, [3, 2, 3, 2, 1, 1],
    "slots 0,1,0,1,2,3 on {3,2,1} — the 3 clamps to the top slot (string 1)");
  assert.deepEqual(t.clamped, [5], "exactly the clamped step, by index");
  // growing: every slot exists, translation exact, nothing reported
  const g = translateFigure([3, 2, 1], three, four);
  assert.deepEqual(g.pattern, [4, 3, 2]);
  assert.deepEqual(g.clamped, []);
  // grow then shrink back is the identity (no slot was ever out of range)
  const back = translateFigure(g.pattern, four, three);
  assert.deepEqual(back.pattern, [3, 2, 1]);
  assert.deepEqual(back.clamped, []);
  // null passes through (a block chord has nothing to translate)
  assert.deepEqual(translateFigure(null, four, three), { pattern: null, clamped: [] });
});
