/* triadetudes-keys.test.mjs — all twelve keys, spelled by derivation.
 *
 * The rule (the item's, verbatim): of the enharmonic spellings of a tonic,
 * take the one whose scale carries the fewest accidentals; ties break toward
 * flats. These tests pin the rule's outputs and its consequences — coverage,
 * no double accidentals anywhere in the offered set, FLAT_KEYS agreement,
 * restore normalization, and a UI-reachable roman resolution in the three
 * newly added keys.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";
import { pcOf } from "../chord.mjs";

test("twelve keys, all pitch classes, every scale type — and no double accidental anywhere", () => {
  const e = loadTriadetudesEngine();
  for (const type of ["major", "harm", "mel"]) {
    const ks = unwrap(e.keysFor(type));
    assert.equal(ks.length, 12, `${type}: twelve keys`);
    assert.equal(new Set(ks.map((k) => e.pcOf(k))).size, 12, `${type}: all pitch classes`);
    for (const k of ks)
      for (const n of e.buildScale(k, type))
        assert.ok(!/##|bb/.test(n.name), `${type} ${k}: ${n.name} needs a double accidental`);
  }
});

test("the canonical picks the item names, pinned", () => {
  const e = loadTriadetudesEngine();
  assert.equal(e.keyFor(1, "major"), "Db", "Db major");
  assert.equal(e.keyFor(1, "harm"), "C#", "…but C# harmonic minor");
  assert.equal(e.keyFor(6, "major"), "Gb", "Gb major");
  assert.equal(e.keyFor(6, "harm"), "F#", "…but F# harmonic minor");
  assert.equal(e.keyFor(6, "mel"), "F#", "F# melodic minor (Gb mel needs Bbb)");
  assert.equal(e.keyFor(8, "harm"), "Ab", "Ab minor over G# minor");
  assert.equal(e.keyFor(3, "harm"), "Eb", "Eb minor over D# minor");
  assert.equal(e.keyFor(11, "major"), "B");
  // the one true tie in the whole 12×3 space: pc 1 melodic (Db and C# both
  // spell clean at six accidentals) — the ratified tie-break says flats.
  // Flagged in the build report; if Daniel prefers C# melodic minor, the
  // tie-break becomes "toward flats in major, toward sharps in minor".
  assert.equal(e.keyFor(1, "mel"), "Db", "tie → flats, per the item's rule");
});

test("the nine legacy keys are their own canonical spellings — restores are identity", () => {
  const e = loadTriadetudesEngine();
  for (const k of ["C", "G", "D", "A", "E", "F", "Bb", "Eb", "Ab"])
    for (const type of ["major", "harm", "mel"])
      assert.equal(e.keyFor(e.pcOf(k), type), k, `${k} ${type}`);
});

test("FLAT_KEYS derives to exactly the naming behavior the nine keys always had", () => {
  const e = loadTriadetudesEngine();
  // pcName's fallback: flat-side keys name chromatic notes from FLAT_NAMES.
  // The derived set must reproduce the old hand-kept behavior…
  for (const k of ["F", "Bb", "Eb", "Ab"])
    assert.equal(e.pcName(6, k), "Gb", `${k}: flat side`);
  for (const k of ["C", "G", "D", "A", "E"])
    assert.equal(e.pcName(6, k), "F#", `${k}: sharp side`);
  // …and place the new keys correctly
  assert.equal(e.pcName(1, "Gb"), "Db", "Gb is flat side");
  assert.equal(e.pcName(1, "B"), "C#", "B is sharp side");
  assert.equal(e.pcName(6, "C#"), "F#", "C# is sharp side");
});

test("roman resolution is UI-reachable in the three new keys (the path, not just the engine)", () => {
  const e = loadTriadetudesEngine();
  const want = {
    Gb: { two: "Abm7", five: "Db7", one: "Gbmaj7" },
    Db: { two: "Ebm7", five: "Ab7", one: "Dbmaj7" },
    B: { two: "C#m7", five: "F#7", one: "Bmaj7" },
  };
  for (const [key, w] of Object.entries(want)) {
    e.st.key = key; e.st.scaleType = "major"; e.st.harmonyMode = "break";
    e.st.breakProg = [{ sym: "ii7", us: null }, { sym: "V7", us: null }, { sym: "Imaj7", us: null }];
    const seq = unwrap(e.buildSequence());
    assert.equal(seq.length, 3, `${key}: all three romans resolve`);
    assert.deepEqual(seq.map((c) => c.srcSymbol), [w.two, w.five, w.one], `${key}: spelled symbols`);
    assert.equal(seq[2].bassPc, e.pcOf(key), `${key}: Imaj7 grounds on the tonic`);
    for (const c of seq)
      assert.ok(!/##|bb/.test(c.label + c.srcSymbol), `${key}: no double accidentals surface`);
  }
});

test("voicings, sevenths and pivots hold across the full twelve (existing invariants, wider net)", () => {
  const e = loadTriadetudesEngine();
  // KEYS is now twelve — the characterization invariants that loop it already
  // ran; this adds the three new keys through the build-up seventh cross-check
  e.st.harmonyMode = "build"; e.st.ext = "third";
  for (const key of ["Db", "Gb", "B"]) {
    e.st.key = key; e.st.scaleType = "major"; e.defaultPivots();
    const seq = e.buildSequence();
    const voic = e.chooseVoicings(seq);
    voic.forEach((v, i) => assert.ok(v, `${key}: chord ${i} voiced`));
    for (const ch of seq) {
      const name = e.tetradName(e.bassPcFor(ch), ch);
      assert.ok(!/##|bb/.test(name), `${key}: ${name} clean`);
    }
  }
});
