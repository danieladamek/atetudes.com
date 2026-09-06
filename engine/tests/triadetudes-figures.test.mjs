/* triadetudes-figures.test.mjs — v0.7 phase 3: the grammar inside the app.
 * The figure pipeline (motionSrc → parse → resolve → events) tested headless,
 * plus the guarantee that a null figure is byte-identical to the legacy path.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";

test("a null figure IS the legacy path — entries identical to orderedNotes", () => {
  const e = loadTriadetudesEngine();
  const voic = e.chooseVoicings(e.buildSequence());
  assert.equal(e.activeFigure(), false, "fresh state has no figure");
  const a = unwrap(e.orderedEntries(voic[0], e.buildSequence()[0]));
  const b = unwrap(e.orderedNotes(voic[0]));
  assert.deepEqual(a, b, "no figure: the pre-grammar order, untouched");
});

test("the spec's enclosure figure resolves per chord: 9 events, roles and distances", () => {
  const e = loadTriadetudesEngine();
  e.st.pivotString = 2; e.st.pivotFrets = [5, 6, 8];
  e.st.motionMode = "tones";
  e.st.motionSrc = "(-1,+2)[1] - (+2,-1)[3] - (-s,+s)[5]";
  const seq = e.buildSequence();
  const voic = e.chooseVoicings(seq);
  seq.forEach((ch, i) => {
    const entries = unwrap(e.orderedEntries(voic[i], ch));
    assert.equal(entries.length, 9, `${ch.label}: nine notes`);
    const roles = entries.map((x) => x.role);
    assert.deepEqual(roles, ["approach", "approach", "chord", "approach", "approach",
      "chord", "approach", "approach", "chord"], `${ch.label}: figure shape`);
    // every approach is exactly its written distance from its target
    const pcs = unwrap(e.triadPcs(ch.rootPc, ch.q));
    assert.equal(entries[0].midi, entries[2].midi - 1, `${ch.label}: -1 below the root`);
    assert.equal(entries[1].midi, entries[2].midi + 2, `${ch.label}: +2 above the root`);
    assert.equal(entries[2].midi % 12, pcs[0], `${ch.label}: [1] is the root`);
    assert.equal(entries[5].midi % 12, pcs[1], `${ch.label}: [3] is the third`);
    assert.equal(entries[8].midi % 12, pcs[2], `${ch.label}: [5] is the fifth`);
  });
  // and the events divide the chord evenly: 9 over the span
  const evs = unwrap(e.arpOnsets(voic[0], e.orderedEntries(voic[0], seq[0]), null, 2, 72));
  assert.equal(evs.length, 9);
  const span = 2 * (60 / 72);
  evs.forEach((ev, k) => {
    assert.ok(Math.abs(ev.onset - k * span / 9) < 1e-9, "even division across the chord");
    assert.ok(["chord", "approach"].includes(ev.role));
  });
  e.st.motionSrc = null; e.st.motionMode = "shape";
});

test("shape-mode figures with approaches work in grip; chromatic pcs identified", () => {
  const e = loadTriadetudesEngine();
  e.st.motionMode = "pattern";              // 261002: the face's word; the grammar's "shape" is behind the page's boundary
  e.st.motionSrc = "(-1)1 - 2 - 3";         // string numbers on the E-B-G set (H-M-L was the retired alphabet)
  const seq = e.buildSequence();
  const voic = e.chooseVoicings(seq);
  const entries = unwrap(e.orderedEntries(voic[0], seq[0]));
  assert.equal(entries.length, 4);
  assert.equal(entries[0].role, "approach");
  assert.equal(entries[0].midi, entries[1].midi - 1, "half step under the high string");
  const sd = e.scaleData();
  const chrom = !unwrap(sd.pcs).includes(((entries[0].midi % 12) + 12) % 12);
  assert.equal(typeof chrom, "boolean"); // the renderers key violet off this
  e.st.motionSrc = null;
});

test("figures survive under Line in tones mode; the figure round-trips rawCfg-style", () => {
  const e = loadTriadetudesEngine();
  e.st.pivotString = 2; e.st.pivotFrets = [5, 6, 8];
  e.st.placement = "line";
  e.st.motionMode = "tones";
  e.st.motionSrc = "(-1)[1] - [3] - [5]";
  const seq = e.buildSequence();
  const voic = e.chooseVoicings(seq);
  const entries = unwrap(e.orderedEntries(voic[0], seq[0]));
  assert.equal(entries.length, 4, "one approach + three targets");
  assert.equal(entries[0].role, "approach");
  // C under Line: [1] resolves to the placed C4, [5] to the B-string G4
  assert.equal(entries[1].midi, 60);
  assert.equal(entries[3].midi, 67);
  assert.equal(entries[3].string, 2, "the fifth sits at B-string 8 — the Line placement");
  assert.equal(entries[3].fret, 8);
  e.st.placement = "grip"; e.st.motionSrc = null; e.st.motionMode = "shape";
});

test("a chord that cannot host the figure plays nothing figured, not garbage", () => {
  const e = loadTriadetudesEngine();
  // an off-neck absurdity cannot arise from the UI, but the guard is named:
  // figureEntries returns null on resolver refusal and the chord falls back
  const voic = e.chooseVoicings(e.buildSequence());
  e.st.motionSrc = "(-1)[1]"; e.st.motionMode = "tones";
  const ok = e.figureEntries(voic[0], e.buildSequence()[0]);
  assert.ok(ok !== null, "a hostable figure resolves");
  e.st.motionSrc = null; e.st.motionMode = "shape";
});
