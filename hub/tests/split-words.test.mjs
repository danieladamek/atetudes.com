/* split-words.test.mjs — the Settings card says the split (261010): rule 10's third site. Before tonight it printed
 * the stored value raw and said "one chord to a bar" for a split it did not read ("split chart" at 7/4, found on
 * the 390 render). Words from the one law; absence is "not recorded" (2026-10-02). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { describe } from "../../engine/etude-describe.mjs";

const said = (split) => describe({ bpm: 120, meter: 4, split, key: "Bb", scale: "major" })[0].text;

test("the split, in words — as charted, a whole-bar slot, a cycle, and not recorded", () => {
  assert.equal(said("chart"), "120 bpm, 4/4 — chords as charted");
  assert.equal(said([4]), "120 bpm, 4/4 — each chord 4 beats");
  assert.equal(said([1, 1, 1, 1]), "120 bpm, 4/4 — each chord takes the next slot of 1+1+1+1");
  assert.equal(said(undefined), "120 bpm, 4/4 — the bar split not recorded");
  for (const v of ["chart", [2, 1, 1]]) assert.doesNotMatch(said(v), /split chart|\d,\d|one chord to a bar/);
});
