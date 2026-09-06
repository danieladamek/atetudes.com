/* metronome.test.mjs — the shared metronome core, tested headless.
 * Time is injected everywhere, so the grid math is exact, not approximate.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createMetroCore, createTapTempo, SUB_OFFSETS } from "../metronome.mjs";
import { preHubCarriersOf } from "./_carriers.mjs";

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
  // clamping — 15..300 since 2026-08-21 (Daniel: "expand the metronome range
  // from 15 - 300 bpm", the first modification under the foundational-
  // components ruling; was 30..200)
  tap = createTapTempo();
  tap(0); assert.equal(tap(0.1), 300, "fast taps clamp to 300");
  tap = createTapTempo();
  tap(0); assert.equal(tap(2.4), 25, "a 2.4s gap is 25 bpm — no longer clamped up to 30");
  /* THE FLOOR IS UNREACHABLE BY TAP, and that is recorded rather than hidden:
   * maxGap (2.5s) resets the window before any gap slow enough for <24 bpm
   * can land, so tap output bottoms out at ~25 — 15 bpm is reached by the
   * slider. Flagged to Daniel with the range item; raising maxGap is a
   * separate UX call, not smuggled in here. */
  tap = createTapTempo();
  tap(0); assert.equal(tap(2.6), null, "a 4s beat cannot be tapped — the window resets first (maxGap 2.5)");
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

test("setMeter mid-run defers to the next bar line; indices stay continuous", () => {
  const m = createMetroCore({ bpm: 60, meter: 4 }); // spb 1.0
  m.start(0);
  m.pump(0, 2.5); // beats 0,1,2 — mid-bar
  m.setMeter(7);
  assert.equal(m.meter, 4, "clock keeps the old meter until the bar line");
  assert.equal(m.pendingMeter, 7, "the change is queued, not dropped");
  const evs = m.pump(0, 12.5); // beats 3..12
  assert.equal(evs[0].index, 3, "index continuity");
  assert.equal(evs[0].beat, 3, "beat 3 still counted in 4");
  assert.equal(evs[1].index, 4);
  assert.equal(evs[1].beat, 0, "the bar line lands");
  assert.equal(m.meter, 7, "…and the new meter with it");
  assert.equal(m.pendingMeter, null);
  for (let k = 1; k <= 7 && k < evs.length; k++)
    assert.equal(evs[k].beat, (k - 1) % 7, `beat numbering rebased to 7 (ev ${k})`);
  assert.equal(evs[8].beat, 0, "next 7-bar starts seven beats later");
});

test("setMeter before the first beat, or while stopped, applies immediately", () => {
  const m = createMetroCore({ bpm: 120, meter: 4 });
  m.setMeter(5);
  assert.equal(m.meter, 5, "stopped: immediate");
  m.start(10);
  m.setMeter(3);
  assert.equal(m.meter, 3, "started but nothing emitted yet: immediate");
  const evs = m.pump(10, 1.6);
  assert.deepEqual(evs.map((e) => e.beat), [0, 1, 2, 0], "counting in 3 from the top");
});

test("setMeter back to the current meter cancels a pending change", () => {
  const m = createMetroCore({ bpm: 60, meter: 4 });
  m.start(0);
  m.pump(0, 1.5);
  m.setMeter(7);
  m.setMeter(4);
  assert.equal(m.pendingMeter, null, "round trip within a bar is a no-op");
  const evs = m.pump(0, 6.5);
  assert.ok(evs.every((e) => e.beat === e.index % 4), "grid never left 4");
});

test("nextBarStartIndex respects the rebased grid after a deferred change", () => {
  const m = createMetroCore({ bpm: 60, meter: 4 });
  m.start(0);
  m.pump(0, 2.5); // through beat 2
  m.setMeter(7);
  assert.equal(m.nextBarStartIndex(), 4, "join point is the old meter's boundary");
  m.pump(0, 6.5); // through index 6 — change landed at 4
  assert.equal(m.nextBarStartIndex(), 11, "4 + 7: the new meter's next bar");
});

test("start() applies a pending meter and resets the grid", () => {
  const m = createMetroCore({ bpm: 60, meter: 4 });
  m.start(0);
  m.pump(0, 1.5);
  m.setMeter(7);
  m.stop();
  assert.equal(m.pendingMeter, null, "stop clears the queue");
  m.setMeter(7);
  m.start(100);
  assert.equal(m.meter, 7);
  assert.equal(m.pump(100, 0.5)[0].beat, 0);
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
  // ALL apps that inline the component — DERIVED from the carrier census
  // (engine/tests/_carriers.mjs), never listed by hand: the hand list missed
  // the fifth study the day it shipped (260819.5)
  const CARRIERS = preHubCarriersOf("metronome");
  assert.ok(CARRIERS.length >= 2, "the census lost the metronome's pre-hub carriers");
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

// ---- 260929 (night 35b): SUBDIVISION LIVES IN THE CORE ----
// Daniel, 260929: Subdivision did nothing on Multetudes and Tetradetudes. The
// card validated the value and discarded it; the core had setBpm and setMeter
// and no setSub; SUB_OFFSETS was read by that one check. Four implementations
// were the defect (two hand pages scheduling their own offsets, the door
// scheduling none) — one home is the fix: the core schedules the offsets
// SUB_OFFSETS already defines, and every surface consumes its events.
test("260929: the core has a subdivision — a setter beside setBpm and setMeter, refused by name when meaningless", () => {
  const m = createMetroCore({ bpm: 60, meter: 4 });
  assert.equal(m.sub, 1, "the default is beats — nothing between them");
  m.setSub(3); assert.equal(m.sub, 3);
  assert.throws(() => m.setSub(5), /unknown subdivision/, "a subdivision SUB_OFFSETS does not define is refused by name");
  assert.throws(() => m.setSub("2"), /unknown subdivision/, "the setter takes a number, not a select's string");
});

test("260929: pump emits the sub events between the beats, at SUB_OFFSETS' times, without moving the beat grid", () => {
  for (const [sub, offs] of Object.entries(SUB_OFFSETS)) {
    const m = createMetroCore({ bpm: 60, meter: 4 });   // one beat per second
    m.setSub(+sub); m.start(0);
    const evs = m.pump(0, 3.99);                         // one bar: beats 0..3 and their subs (4.0 is the next bar's downbeat)
    const beats = evs.filter((e) => !e.sub), subs = evs.filter((e) => e.sub);
    assert.deepEqual(beats.map((e) => e.time), [0, 1, 2, 3], `sub ${sub}: the four beats are where they were`);
    assert.deepEqual(beats.map((e) => e.beat), [0, 1, 2, 3]);
    assert.equal(subs.length, 4 * offs.length, `sub ${sub}: ${offs.length} sub events per beat, ${4 * offs.length} per bar`);
    for (const s of subs) {
      assert.ok(close(s.time - Math.floor(s.time), offs[s.sub - 1]), `sub ${sub}: event ${s.sub} sits at offset ${offs[s.sub - 1]} into its beat`);
      assert.equal(s.index, Math.floor(s.time), "a sub event carries its BEAT's index — it is not a beat");
      assert.equal(s.beat, Math.floor(s.time) % 4);
    }
    // the index grid is untouched: the next bar starts at 4 whatever the subdivision
    assert.equal(m.nextBarStartIndex(), 4, `sub ${sub}: nextBarStartIndex is still the beat grid's`);
    assert.equal(m.pump(0, 3.99).length, 0, "nothing emitted twice");
  }
});

test("260929: a subdivision change mid-run applies from the next beat; a tempo change moves the sub times with the beats", () => {
  const m = createMetroCore({ bpm: 60, meter: 4 });
  m.start(0);
  assert.equal(m.pump(0, 1.5).filter((e) => e.sub).length, 0, "beats: no sub events");
  m.setSub(2);
  const next = m.pump(0, 2.5);
  assert.deepEqual(next.map((e) => [e.time, e.sub || 0]), [[2, 0], [2.5, 1]], "from the next beat, its half sits at +0.5");
  m.setBpm(120);                                         // the grid bends: next beat one new spb after the last
  const bent = m.pump(0, 3.6);
  assert.deepEqual(bent.map((e) => [e.time, e.sub || 0]), [[2.5, 0], [2.75, 1], [3, 0], [3.25, 1], [3.5, 0], [3.75, 1]],
    "the sub events ride the NEW spb — half a beat is a quarter second now (a beat's sub is scheduled WITH the beat)");
});
