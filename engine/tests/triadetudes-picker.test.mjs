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
      // 261002: the face speaks string numbers; motion's shape grammar speaks H/M/L — the page's boundary translates
      const q = e.MOTION.parse(mode === "shape" ? e.toShapeLetters(src) : src, mode);
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
  assert.ok(!e.MOTION.parse(e.toShapeLetters(before), "shape").error, "the derivation parses (through the page's boundary)");
  const slots = before.split("-");
  assert.equal(slots.length, 3);
  assert.equal(new Set(slots).size, 3, "each string once — a permutation of the set's strings");
  assert.equal(slots[0], String(e.st.pivotString), "the pivot's STRING leads (261002: string numbers, not slot letters)");
  // move the pivot: the preset follows without any stored string changing
  const other = e.st.setLowHigh.find((s) => s !== e.st.pivotString);
  const old = e.st.pivotString;
  e.st.pivotString = other;
  assert.equal(e.pivotFirstSrc().split("-")[0], String(other), "the moved pivot leads, as its string number (261002)");
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
