/* collection-board.test.mjs — CHROMATETUDES' NAMING AND COLOUR RULES (child 3, 261122; rulings §6.2, §6.3).
 * The board's pure halves, checked over twelve keys without a browser; the door gate (door_locks.py) checks the
 * same facts on the built page. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chordName, glyph } from "../modules/collection-board.mjs";
import { KEYS, COLLECTIONS, collection, stackIntervals, walkChords, chordOn } from "../../engine/collection.mjs";
import { walk, setsFor } from "../../engine/collection-walk.mjs";
import { FAM_COLOR } from "../palette.mjs";
import { scaleNotes } from "../../engine/chord.mjs";

test("§6.2: each collection's walk shows exactly as many distinct names as the engine reports distinct chords (2,2,2,2,2,3,4) — twelve keys", () => {
  const want = { "sixth-dim-major": [2], "sixth-dim-minor": [2], "whole-tone": [2], "octatonic-wh": [2], "octatonic-hw": [2], augmented: [2], chromatic: [3, 4] };
  for (const key of KEYS)
    for (const id of Object.keys(COLLECTIONS))
      stackIntervals(id).forEach((k, i) => {
        const c = collection({ key, id });
        const { chords, distinct } = walkChords(c, k);
        const names = new Set(chords.map((ch) => chordName(c, ch).symbol));
        assert.equal(names.size, distinct, `${key} ${id} k=${k}: ${[...names].join(" ")}`);
        assert.equal(names.size, want[id][i], `${key} ${id} k=${k}`);
      });
});

test("§6.2 worked: C6 in every inversion and D°7 in C sixth-diminished; C°7 · D°7 whole-half; C+ · D+ whole-tone; the chromatic's three and four", () => {
  const names = (key, id, k) => [...new Set(walkChords(collection({ key, id }), k).chords.map((ch) => chordName(collection({ key, id }), ch).symbol))];
  assert.deepEqual(names("C", "sixth-dim-major", 2), ["C6", "D°7"]);
  assert.deepEqual(names("C", "sixth-dim-minor", 2), ["Cm6", "D°7"]);
  assert.deepEqual(names("C", "octatonic-wh", 2), ["C°7", "D°7"]);
  assert.deepEqual(names("C", "whole-tone", 2), ["C+", "D+"]);
  assert.deepEqual(names("C", "chromatic", 3).sort(), ["C°7", "D°7", "D♭°7"].sort());
  assert.deepEqual(names("C", "chromatic", 4).sort(), ["C+", "D+", "D♭+", "E♭+"].sort());
  // never Am7: the sixth chord's lowest member degree is the R, in every inversion on the neck
  const w = walk({ key: "C", id: "sixth-dim-major", k: 2, family: "drop2", set: setsFor(4)[0] });
  for (const p of w.positions) assert.ok(["C6", "D°7"].includes(chordName(w.coll, p.chord).symbol));
});

test("§6.3 THE TRAP: the dot's colour comes from the degree name, never the letter — D♭'s ♭6 is shown as A and is cyan", () => {
  for (const key of KEYS) {
    const c = collection({ key, id: "sixth-dim-major" });
    const w = walk({ key, id: "sixth-dim-major", k: 2, family: "drop2", set: setsFor(4)[1] });
    for (const p of w.positions) for (const n of p.notes) {
      assert.equal(n.fam, n.degName.replace(/[♭♯]/, ""), `${key}: ${n.name} is the ${n.degName}`);
      assert.ok(FAM_COLOR[n.fam], `${key}: ${n.degName} has a colour`);
    }
  }
  const b6 = collection({ key: "Db", id: "sixth-dim-major" }).notes[5];
  const letterFam = ["R", "2", "3", "4", "5", "6", "7"][(["C", "D", "E", "F", "G", "A", "B"].indexOf(b6.name[0]) - ["C", "D", "E", "F", "G", "A", "B"].indexOf("D") + 7) % 7];
  assert.equal(letterFam, "5", "A is the letter of D♭'s fifth");
  assert.equal(scaleNotes("Db", "major")[4].name, "Ab");
  assert.equal(b6.fam, "6");
  assert.equal(FAM_COLOR[b6.fam], FAM_COLOR["6"]);
  assert.notEqual(FAM_COLOR[b6.fam], FAM_COLOR[letterFam]);
});

test("a symmetric chord says every member is a root; a sixth chord does not", () => {
  const c = collection({ key: "C", id: "sixth-dim-major" });
  assert.equal(chordName(c, chordOn(c, 0, 2)).symmetric, false);
  assert.equal(chordName(c, chordOn(c, 1, 2)).symmetric, true);
  const a = collection({ key: "C", id: "augmented" });
  assert.equal(chordName(a, chordOn(a, 0, 2)).symmetric, true);
});

test("glyphs: ♭ ♯ 𝄫 in the shown name, never in the stored one", () => {
  assert.equal(glyph("Db"), "D♭"); assert.equal(glyph("F#"), "F♯"); assert.equal(glyph("Bbb"), "B𝄫"); assert.equal(glyph("B"), "B");
});
