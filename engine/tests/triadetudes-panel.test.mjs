/* triadetudes-panel.test.mjs — v0.6.13: the panel says what it means.
 *
 * Set labels derive from the tuning (no typed table), the pattern speaks slot
 * vocabulary with the digit dialect still accepted, placement is a real
 * constraint (box ≠ linear for at least one config; box is the pinned
 * default), and box overflow WIDENS the drawn zone — never a silent fallback.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";

test("set labels derive from OPEN — recomputed here from the tuning, not retyped", () => {
  const e = loadTriadetudesEngine();
  const NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  for (const set of [[1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 6]]) {
    const want = set.map((sn) => NAMES[e.OPEN[sn] % 12]).join("-");
    assert.equal(e.setLabel(set), want, set.join("-"));
  }
  assert.equal(e.setLabel([1, 2, 3]), "E-B-G", "reads high → low, as the numbers did");
});

test("slot vocabulary: letters parse, digits parse, both normalise to H-M-L", () => {
  const e = loadTriadetudesEngine();
  const s = unwrap(e.st.setLowHigh); // [3,2,1] for the default set
  assert.deepEqual(unwrap(e.parseArp("H-M-L").pattern), [s[2], s[1], s[0]]);
  assert.deepEqual(unwrap(e.parseArp("hml").pattern), [s[2], s[1], s[0]], "case-insensitive");
  assert.deepEqual(unwrap(e.parseArp("2-3-3-1").pattern), [2, 3, 3, 1], "digit dialect lives");
  assert.deepEqual(unwrap(e.parseArp("M-3-H").pattern), [2, 3, 1], "dialects may mix");
  assert.equal(e.patText(e.parseArp("2-3-1").pattern), "M-L-H", "normalisation");
  assert.equal(e.patText(e.parseArp("M-L-H").pattern), "M-L-H", "idempotent");
  assert.equal(e.parseArp("").pattern, null, "empty means empty");
  assert.ok(e.parseArp("2-4").err, "digits outside the set still refused by name");
  assert.ok(e.parseArp("H".repeat(17)).err, "16-note ceiling holds for letters");
  // the same letters land on different strings per set — slots, not aliases
  e.st.set = [4, 5, 6];
  assert.deepEqual(unwrap(e.parseArp("H-M-L").pattern), [4, 5, 6]);
  assert.equal(e.patText([4, 5, 6]), "H-M-L", "display is set-independent");
});

test("placement is a real constraint: box and linear disagree somewhere, box is default", () => {
  const e = loadTriadetudesEngine();
  assert.equal(e.st.placement, "box", "named default");
  // seat the pivots high so the box constraint has something to pull against
  const sd = e.scaleData();
  const notes = unwrap(e.scaleFretsOnString(2)).map((f) => ({
    fret: f, degree: unwrap(sd.pcs).indexOf((e.OPEN[2] + f) % 12) }));
  let differs = false;
  for (const nearFret of [12, 15]) {
    e.st.pivotString = 2;
    e.st.pivotFrets = e.STRSETS ? e.STRSETS.pivotWindow(notes, 0, nearFret)
      : e.st.pivotFrets;
    const seq = e.buildSequence();
    e.st.placement = "box";
    const box = unwrap(e.chooseVoicings(seq).map((v) => v.frets));
    e.st.placement = "linear";
    const lin = unwrap(e.chooseVoicings(seq).map((v) => v.frets));
    e.st.placement = "box";
    if (JSON.stringify(box) !== JSON.stringify(lin)) differs = true;
  }
  assert.ok(differs, "high pivots: box holds position, linear releases it");
});

test("box overflow widens the drawn zone — placement never silently changes", () => {
  const e = loadTriadetudesEngine();
  // the widest union found in the survey: C harm scaleUp on 3-4-5
  e.st.key = "C"; e.st.scaleType = "harm"; e.st.prog = "scaleUp"; e.st.set = [3, 4, 5];
  e.defaultPivots();
  const voic = e.chooseVoicings(e.buildSequence());
  const piv = unwrap(e.st.pivotFrets);
  let lo = Math.min(...piv), hi = Math.max(...piv);
  for (const v of voic) { lo = Math.min(lo, ...unwrap(v.frets)); hi = Math.max(hi, ...unwrap(v.frets)); }
  assert.ok(hi - lo > Math.max(...piv) - Math.min(...piv),
    "the union outgrows the pivot window — the box must widen");
  for (const v of voic)
    for (const f of unwrap(v.frets))
      assert.ok(f >= lo && f <= hi, "every note stays inside the widened box");
  assert.equal(e.st.placement, "box", "no silent escape to linear");
});

test("displayPattern follows playback: block hides the line, arpeggiated shows it", () => {
  const e = loadTriadetudesEngine();
  e.st.arpPattern = [2, 3, 1];
  e.st.playback = "block";
  assert.equal(e.displayPattern(), null);
  e.st.playback = "arpeggiated";
  assert.deepEqual(unwrap(e.displayPattern()), [2, 3, 1]);
  e.st.playback = "both";
  assert.deepEqual(unwrap(e.displayPattern()), [2, 3, 1], "both draws the line");
});
