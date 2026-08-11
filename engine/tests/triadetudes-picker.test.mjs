/* triadetudes-picker.test.mjs — v0.7.7: the figure picker's derivation layer.
 * The picker's SELECTION derives from the figure source (canonFig matching),
 * never from which control last wrote; "Pivot first" derives from the pivot.
 * The DOM sync itself is exercised in the Playwright pass — here we pin the
 * pure derivations it is built from.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";

test("every preset parses in its own mode; tones presets are chord-tone-only", () => {
  // the load assertion already gates this (a broken preset kills the page and
  // the loader), but the rule is pinned here so a future edit can't soften it
  const e = loadTriadetudesEngine();
  const P = unwrap(e.FIG_PRESETS);
  for (const mode of ["tones", "shape"])
    P[mode].forEach((p, i) => {
      const src = e.presetSrc(mode, i);
      const q = e.MOTION.parse(src, mode);
      assert.ok(!q.error, `${p[0]} must parse: ${src}`);
      if (mode === "tones")
        for (const f of unwrap(q.figures))
          assert.ok(f.target.acc === 0 && [1, 3, 5].includes(f.target.deg),
            `${p[0]} carries only bare chord-tone targets (v0.7.6 alignment)`);
    });
  assert.equal(P.tones[0][1], "[1] - [3] - [5]", "the tones first preset — the mode-switch landing");
});

test("Pivot first DERIVES from the current pivot and follows it when it moves", () => {
  const e = loadTriadetudesEngine();
  assert.equal(unwrap(e.FIG_PRESETS).shape[0][1], null, "no stored literal");
  const before = e.pivotFirstSrc();
  assert.ok(!e.MOTION.parse(before, "shape").error, "the derivation parses");
  const slots = before.split("-");
  assert.equal(slots.length, 3);
  assert.equal(new Set(slots).size, 3, "each slot once — a permutation of L,M,H");
  assert.equal(slots[0], "LMH"[e.st.setLowHigh.indexOf(e.st.pivotString)],
    "the pivot's slot leads");
  // move the pivot: the preset follows without any stored string changing
  const other = e.st.setLowHigh.find((s) => s !== e.st.pivotString);
  const old = e.st.pivotString;
  e.st.pivotString = other;
  assert.equal(e.pivotFirstSrc().split("-")[0], "LMH"[e.st.setLowHigh.indexOf(other)]);
  assert.equal(e.presetSrc("shape", 0), e.pivotFirstSrc());
  e.st.pivotString = old;
});

test("canonFig is the matcher: whitespace-insensitive, mode-aware, refuses garbage", () => {
  const e = loadTriadetudesEngine();
  assert.equal(e.canonFig("[1]-[3]-[5]", "tones"), e.canonFig("[1] - [3] - [5]", "tones"),
    "one canonical form — the picker matches by derivation, not by string");
  assert.equal(e.canonFig("h-m-l", "shape"), e.canonFig("H - M - L", "shape"));
  assert.equal(e.canonFig("[1]", "shape"), null, "tones text never matches a shape preset");
  assert.equal(e.canonFig("", "tones"), null);
  assert.equal(e.canonFig(null, "tones"), null);
});
