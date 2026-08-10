/* triadetudes-meter.test.mjs — 7/4 and the meter-change split rule.
 *
 * The split rule is v0.6.6's doctrine on a non-total domain: keep the split
 * only if the IDENTICAL grouping exists in the new meter, else the whole-bar
 * default — a defined outcome, never pattern()'s old `|| [st.meter]` swallow.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";

test("SPLITS carries 7/4 in the established style, sums pinned by the existing invariant", () => {
  const e = loadTriadetudesEngine();
  assert.deepEqual(unwrap(e.SPLITS[7]),
    [[7], [4, 3], [3, 4], [2, 2, 3], [3, 2, 2], [2, 3, 2]]);
  // ([1,6]/[6,1] deliberately absent — flagged for Daniel against 5/4's [1,4]/[4,1])
  assert.ok(!unwrap(e.SPLITS[7]).some((p) => p.includes(6)), "no [1,6] family yet");
});

test("splitFor: identical grouping survives, everything else lands on the whole bar", () => {
  const e = loadTriadetudesEngine();
  for (const m in e.SPLITS)
    e.SPLITS[m].forEach((p, i) => {
      assert.equal(e.splitFor(+m, i, +m), i, `${m}: same meter keeps ${p}`);
      for (const n in e.SPLITS)
        if (n !== m) {
          const j = e.splitFor(+m, i, +n);
          // groupings sum to their meter, so cross-meter identity is impossible
          assert.equal(j, 0, `${m}→${n}: ${p} lands on the whole-bar default`);
          assert.ok(e.SPLITS[n][j], "and the index is always in range");
        }
    });
  assert.equal(e.splitFor(4, 99, 7), 0, "garbage index: defined outcome, not undefined");
});

test("pattern() can no longer silently swallow an out-of-range index", () => {
  // the || fallback is gone at the source: pattern() indexes SPLITS exactly,
  // and every meter-change path goes through splitFor. Pin the source form —
  // reintroducing the swallow must fail loudly here.
  const src = readFileSync(
    new URL("../../static/studies/triadetudes/study.html", import.meta.url), "utf8");
  const def = src.match(/function pattern\(\)\{[^\n]*\}/);
  assert.ok(def, "pattern() found");
  assert.ok(!def[0].includes("||"), `no fallback in: ${def[0]}`);
  // and the wiring: every transition lands on a valid index that sums correctly
  const e = loadTriadetudesEngine();
  for (const m in e.SPLITS)
    for (const n in e.SPLITS)
      e.SPLITS[m].forEach((_, i) => {
        const j = e.splitFor(+m, i, +n);
        const p = unwrap(e.SPLITS[+n][j]);
        assert.ok(Array.isArray(p), `${m}→${n}[${i}]: split defined`);
        assert.equal(p.reduce((a, b) => a + b, 0), +n, "and sums to the meter");
      });
});

test("subdivisionName names something sensible for every 7/4 split × arpeggio length", () => {
  const e = loadTriadetudesEngine();
  const beats = new Set(unwrap(e.SPLITS[7]).flat()); // 7,4,3,2
  for (const b of beats)
    for (let L = 1; L <= 16; L++) {
      const name = e.subdivisionName(b, L);
      assert.ok(typeof name === "string" && name.length > 0, `${b} beats / ${L} notes`);
      assert.ok(
        /whole|half|quarters|8ths|16ths|triplet|tuplet/.test(name),
        `${b}/${L}: "${name}" uses the standard vocabulary`);
      const wv = e.writtenValue(b / L);
      assert.ok([4, 2, 1, 0.5, 0.25].includes(wv), `${b}/${L}: written value standard`);
    }
  assert.equal(e.subdivisionName(7, 7), "quarters", "7 notes over 7 beats");
  assert.equal(e.subdivisionName(7, 14), "8ths", "14 over 7");
  assert.equal(e.subdivisionName(7, 3), "whole-note triplet (3 over 7 beats)",
    "the 2.33-beat case lands in the tuplet path, named by writtenValue's ≥ rule");
});

test("étude invariants hold in 7/4: voicings and onsets across every split", () => {
  const e = loadTriadetudesEngine();
  e.st.meter = 7;
  const seq = e.buildSequence();
  const voic = e.chooseVoicings(seq);
  const s = unwrap(e.st.setLowHigh);
  e.SPLITS[7].forEach((split) => {
    for (const durBeats of unwrap(split))
      voic.forEach((v) => {
        const order = [2, 3, 1].map((sn) => v.notes.find((n) => n.string === sn));
        const evs = unwrap(e.arpOnsets(v, order, 40, durBeats, 72));
        assert.equal(evs.filter((x) => x.role === "chord").length, 3);
      });
  });
});
