/* field.test.mjs — the field: a key, a scale, and a reference that re-roots it.
 *
 * The one bug this module exists to prevent is CONFLATION: `deg` (against the
 * reference — what colours read) and `keyDeg` (into the key's scale — what
 * chords and the bass read) drifting into one number. The tests below pin the
 * two apart, pin the chord/bass path to keyDeg, and pin this module's derived
 * tuning against engine/tetrad-sequence.mjs's stated one (§4.3 — the same fact
 * in two modules is asserted equal, never trusted equal).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { field, notesOn, degAgainst, OPEN_MIDI, MODES } from "../field.mjs";
import { OPEN_MIDI as SEQ_OPEN_MIDI } from "../tetrad-sequence.mjs";
import { SCALE_STEPS } from "../chord.mjs";

const KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

test("the derived tuning IS the family's stated one — two modules, one fact, asserted equal", () => {
  assert.deepEqual(OPEN_MIDI, SEQ_OPEN_MIDI,
    "field.mjs derives standard tuning from the named rule; tetrad-sequence.mjs states it — they must agree");
});

test("the field is seven distinct spelled degrees in every key and scale", () => {
  for (const key of KEYS)
    for (const scale of Object.keys(SCALE_STEPS)) {
      const f = field({ key, scale });
      assert.equal(f.pcs.length, 7);
      assert.equal(new Set(f.pcs).size, 7, `${key} ${scale}`);
      assert.equal(new Set(f.notes.map((n) => n.name[0])).size, 7,
        `${key} ${scale}: one letter per degree`);
    }
});

test("re-rooting is a rotation: the collection never changes, the reading does", () => {
  for (const key of ["C", "Bb", "F#"])
    for (const scale of Object.keys(SCALE_STEPS)) {
      const home = field({ key, scale });
      for (let ref = 0; ref < 7; ref++) {
        const f = field({ key, scale, ref });
        assert.deepEqual(f.pcs, home.pcs, `${key} ${scale} ref ${ref}: collection moved`);
        assert.equal(f.degOf(f.refNote.pc), 0, "the reference reads as its own root");
        assert.equal(f.modeName, MODES[scale][ref]);
      }
    }
});

test("the brief's mode table: B♭ major re-rooted on C is C Dorian; A melodic minor's 7th is Altered", () => {
  assert.equal(field({ key: "Bb", scale: "major", ref: 1 }).modeName, "Dorian");
  assert.equal(field({ key: "Bb", scale: "major", ref: 1 }).refNote.name, "C");
  assert.equal(field({ key: "A", scale: "mel", ref: 6 }).modeName, "Altered");
  assert.equal(field({ key: "C", scale: "harm", ref: 4 }).modeName, "Phrygian dominant");
});

test("deg and keyDeg DISAGREE under a non-zero reference — the conflation pin", () => {
  const f = field({ key: "Bb", scale: "major", ref: 1 });   // C Dorian
  const onString2 = notesOn(2, f);
  assert.ok(onString2.length >= 9);
  let disagreements = 0;
  for (const n of onString2) {
    assert.equal(n.deg, degAgainst(n.keyDeg, 1), "deg must be keyDeg rotated by the reference");
    if (n.deg !== n.keyDeg) disagreements++;
  }
  assert.ok(disagreements > 0, "under ref 1 the two degrees must differ somewhere");
  const cNote = onString2.find((n) => (n.midi % 12) === 0);   // a C
  assert.equal(cNote.keyDeg, 1, "C is the 2nd degree OF THE KEY");
  assert.equal(cNote.deg, 0, "and the root OF THE READING");
});

test("the chord builder and the bass read keyDeg: the same physical chord whatever the reference", () => {
  // the diatonic tetrad on a note is a stack of scale THIRDS BY keyDeg, and a
  // reference tone below is a keyDeg offset — neither may move when the user
  // re-roots the field. Derived here from the field alone, per the model.
  const stackOn = (f, keyDeg) => [0, 2, 4, 6].map((k) => f.pcs[(keyDeg + k) % 7]);
  const bassThirdBelow = (f, keyDeg) => f.pcs[(((keyDeg - 2) % 7) + 7) % 7];
  const home = field({ key: "Bb", scale: "major" });
  for (let ref = 0; ref < 7; ref++) {
    const f = field({ key: "Bb", scale: "major", ref });
    for (let kd = 0; kd < 7; kd++) {
      assert.deepEqual(stackOn(f, kd), stackOn(home, kd),
        `ref ${ref}: the tetrad on keyDeg ${kd} moved — the chord builder must read keyDeg`);
      assert.equal(bassThirdBelow(f, kd), bassThirdBelow(home, kd),
        `ref ${ref}: the bass below keyDeg ${kd} moved — the bass must read keyDeg`);
    }
    // while the LABELS (deg) legitimately rotate:
    if (ref !== 0)
      assert.notEqual(degAgainst(0, ref), 0, "the key's own root no longer reads R — that is the mode");
  }
});

test("notesOn carries every field note on the string and nothing else", () => {
  const f = field({ key: "E", scale: "harm" });
  for (let s = 1; s <= 6; s++) {
    const ns = notesOn(s, f);
    // ascending, in range, on the field
    for (let i = 0; i < ns.length; i++) {
      if (i) assert.ok(ns[i].fret > ns[i - 1].fret, "frets ascend");
      assert.ok(f.pcs.includes(((ns[i].midi % 12) + 12) % 12));
      assert.equal(ns[i].midi, OPEN_MIDI[s] + ns[i].fret);
    }
    // completeness by independent arithmetic: pc's first fret ≤ 3 recurs at +12
    const expected = f.pcs.reduce((a, pc) => {
      const f0 = (((pc - OPEN_MIDI[s]) % 12) + 12) % 12;
      return a + (f0 <= 3 ? 2 : 1);
    }, 0);
    assert.equal(ns.length, expected, `string ${s}: walked ${ns.length}, closed form ${expected}`);
  }
});

test("the field refuses what it cannot mean", () => {
  assert.throws(() => field({ key: "C", scale: "dorian" }), /unknown scale/);
  assert.throws(() => field({ key: "C", ref: 7 }), /degree 0\.\.6/);
  assert.throws(() => notesOn(0, field({ key: "C" })), /not a real string/);
});
