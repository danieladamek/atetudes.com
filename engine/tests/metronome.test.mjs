/* metronome.test.mjs — the shared metronome core, tested headless.
 * Time is injected everywhere, so the grid math is exact, not approximate.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createMetroCore, createTapTempo, SUB_OFFSETS } from "../metronome.mjs";

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test("pump emits beats on an exact grid with correct bar/beat numbering", () => {
  const m = createMetroCore({ bpm: 120, meter: 3 }); // spb = 0.5
  m.start(10);
  const evs = m.pump(10, 3.26); // beats at 10, 10.5, ..., 13.0 → 7 beats
  assert.equal(evs.length, 7);
  evs.forEach((ev, i) => {
    assert.ok(close(ev.time, 10 + i * 0.5), `beat ${i} time`);
    assert.equal(ev.index, i);
    assert.equal(ev.bar, Math.floor(i / 3));
    assert.equal(ev.beat, i % 3);
  });
  // pump is consuming: nothing re-emitted
  assert.equal(m.pump(10, 3.26).length, 0);
});

test("5/4 numbering: bar starts every fifth beat", () => {
  const m = createMetroCore({ bpm: 60, meter: 5 });
  m.start(0);
  const evs = m.pump(0, 10.5);
  const barStarts = evs.filter((e) => e.beat === 0).map((e) => e.index);
  assert.deepEqual(barStarts, [0, 5, 10]);
});

test("nextBarStartIndex: joining always lands on a bar boundary ahead", () => {
  const m = createMetroCore({ bpm: 120, meter: 4 });
  m.start(0);
  assert.equal(m.nextBarStartIndex(), 0, "before any pump: join at 0");
  m.pump(0, 1.3); // consumes indices 0,1,2 (t=0,.5,1.0)
  assert.equal(m.nextBarStartIndex(), 4, "mid-bar: join at next bar");
  m.pump(0, 2.1); // consumes 3,4 → nextIdx 5
  assert.equal(m.nextBarStartIndex(), 8);
  m.pump(0, 4.1); // through index 8 → nextIdx 9... consume to land exactly on bar
  m.pump(0, 6.1); // nextIdx 13
  assert.equal(m.nextBarStartIndex(), 16);
});

test("setBpm mid-run bends the grid: next beat = last beat + new spb", () => {
  const m = createMetroCore({ bpm: 60, meter: 4 }); // spb 1.0
  m.start(0);
  const before = m.pump(0, 2.5); // beats at 0,1,2
  assert.equal(before.length, 3);
  m.setBpm(120); // spb 0.5 — next beat must land at 2.0 + 0.5
  const after = m.pump(0, 4.01);
  assert.ok(close(after[0].time, 2.5), `next beat at 2.5, got ${after[0].time}`);
  assert.ok(close(after[1].time, 3.0));
  assert.equal(after[0].index, 3, "index continuity preserved");
});

test("setBpm before any beat just sets the tempo", () => {
  const m = createMetroCore({ bpm: 60, meter: 4 });
  m.start(5);
  m.setBpm(120);
  const evs = m.pump(5, 1.01);
  assert.ok(close(evs[0].time, 5), "anchor untouched");
  assert.ok(close(evs[1].time, 5.5), "new spb in force");
});

test("stop silences the pump; restart re-anchors from zero", () => {
  const m = createMetroCore({ bpm: 120, meter: 4 });
  m.start(0);
  m.pump(0, 1);
  m.stop();
  assert.equal(m.pump(0, 100).length, 0);
  m.start(50);
  const evs = m.pump(50, 0.6);
  assert.equal(evs[0].index, 0, "fresh grid");
  assert.ok(close(evs[0].time, 50));
});

test("tap tempo: steady taps average to the tempo, gaps reset, extremes clamp", () => {
  let tap = createTapTempo();
  assert.equal(tap(0), null, "one tap tells nothing");
  assert.equal(tap(0.5), 120);
  assert.equal(tap(1.0), 120);
  assert.equal(tap(1.5), 120);
  // gap > 2.5s resets the window
  assert.equal(tap(10), null);
  assert.equal(tap(11), 60);
  // clamping
  tap = createTapTempo();
  tap(0); assert.equal(tap(0.1), 200, "fast taps clamp to 200");
  tap = createTapTempo();
  tap(0); assert.equal(tap(2.4), 30, "slow taps clamp to 30");
});

test("subdivision offsets: correct counts, all inside the beat, evenly spaced", () => {
  assert.deepEqual(SUB_OFFSETS[1], []);
  assert.deepEqual(SUB_OFFSETS[2], [0.5]);
  assert.equal(SUB_OFFSETS[3].length, 2);
  assert.ok(close(SUB_OFFSETS[3][0], 1 / 3) && close(SUB_OFFSETS[3][1], 2 / 3));
  assert.deepEqual(SUB_OFFSETS[4], [0.25, 0.5, 0.75]);
  for (const k of [1, 2, 3, 4])
    SUB_OFFSETS[k].forEach((o) => assert.ok(o > 0 && o < 1, `offset ${o} inside beat`));
});

// ---- anti-drift: the hand-inlined copy in the study must match this module ----

test("every app carrying the metronome matches the module verbatim (no drift)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const moduleSrc = readFileSync(join(here, "..", "metronome.mjs"), "utf8");
  // every exported definition, minus the `export ` keyword, must appear verbatim
  const defs = moduleSrc
    .split(/^export /m)
    .slice(1)
    .map((s) => s.trimEnd());
  assert.equal(defs.length, 3, "module exports three definitions");
  // ALL apps that inline the component — add each new adopter here
  const CARRIERS = ["triadetudes", "metronome"];
  for (const slug of CARRIERS) {
    const src = readFileSync(
      join(here, "..", "..", "static", "studies", slug, "study.html"), "utf8");
    for (const def of defs) {
      assert.ok(
        src.includes(def),
        `${slug}/study.html is missing or has drifted from:\n${def.slice(0, 60)}…`
      );
    }
  }
});
