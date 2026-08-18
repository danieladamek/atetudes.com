/* transport.test.mjs — the étude's walk, driven by injected beats.
 *
 * The whole point of the module is that it owns no clock, so the whole suite
 * hands it beat lists and reads back what it does. No timers, no fakes, no
 * waiting: a transport is testable exactly to the degree it does not keep time
 * itself, which is why it does not.
 */
import { test } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

import {
  createTransportCore, patternOf, beatsPerPass, LEVEL, SPLITS, splitFor,
} from "../transport.mjs";
import { SPLITS as DRILL_SPLITS } from "../drill.mjs";

/** feed n beats of a meter and collect what the transport says on each */
const run = (t, n, meter, from = 0) => {
  const out = [];
  for (let i = from; i < from + n; i++) out.push({ i, ...t.beat({ index: i, beat: i % meter }) });
  return out;
};
const attacksOf = (rows) => rows.filter((r) => r.attack).map((r) => r.i);

/* ================= the split table is drill.mjs's, not a copy ================= */

test("the bar splits are engine/drill.mjs's own table, consumed not restated", () => {
  assert.equal(SPLITS, DRILL_SPLITS, "the split table was copied instead of imported");
  assert.equal(splitFor(4, 1, 3), 0);
  assert.deepEqual(patternOf(4, 1), [2, 2]);
  assert.deepEqual(patternOf(7, 1), [4, 3]);
  // a stale index from a meter change falls back rather than selecting nonsense
  assert.deepEqual(patternOf(3, 99), SPLITS[3][0]);
  assert.throws(() => patternOf(11, 0), /no bar splits for meter 11/);
});

test("beatsPerPass counts the whole pass, uneven splits included", () => {
  assert.equal(beatsPerPass(4, 0, 8), 32);          // 8 chords x one bar
  assert.equal(beatsPerPass(4, 1, 8), 16);          // 8 chords x half a bar
  // [2,1,1] over FOUR steps wraps the pattern: 2+1+1+2 = 6, not two whole bars
  assert.equal(beatsPerPass(4, 3, 4), 2 + 1 + 1 + 2);
  assert.equal(beatsPerPass(4, 3, 3), 2 + 1 + 1);
});

/* ================= the walk ================= */

test("one chord per bar attacks on every bar line, at every meter", () => {
  for (const meter of [3, 4, 5, 6, 7]) {
    const t = createTransportCore({ meter, splitIdx: 0, steps: 4 });
    t.start(0);
    const rows = run(t, meter * 4, meter);
    assert.deepEqual(attacksOf(rows), [0, meter, meter * 2, meter * 3],
      `meter ${meter} does not attack once a bar`);
  }
});

test("a divided bar attacks inside it — the split is what makes a chord change mid-bar", () => {
  const t = createTransportCore({ meter: 4, splitIdx: 2, steps: 8 });   // [1,1,1,1]
  t.start(0);
  assert.deepEqual(attacksOf(run(t, 8, 4)), [0, 1, 2, 3, 4, 5, 6, 7], "four chords a bar");

  const u = createTransportCore({ meter: 4, splitIdx: 3, steps: 8 });   // [2,1,1]
  u.start(0);
  assert.deepEqual(attacksOf(run(u, 8, 4)), [0, 2, 3, 4, 6, 7], "an uneven split walks 2+1+1");
});

test("the step and the loop counter advance together and wrap", () => {
  const t = createTransportCore({ meter: 4, splitIdx: 0, steps: 4 });
  t.start(0);
  const rows = run(t, 32, 4).filter((r) => r.attack);
  assert.deepEqual(rows.map((r) => r.step), [0, 1, 2, 3, 0, 1, 2, 3]);
  assert.deepEqual(rows.map((r) => r.loop), [0, 0, 0, 0, 1, 1, 1, 1]);
});

test("THE COUNT-IN holds for exactly one bar and clicks through it", () => {
  const t = createTransportCore({ meter: 4, splitIdx: 0, steps: 4, countIn: true });
  t.start(0);
  const rows = run(t, 8, 4);
  // the count-in bar: counting, no attack, and beatsLeft ticks down to the join
  assert.deepEqual(rows.slice(0, 4).map((r) => r.countingIn), [true, true, true, true]);
  assert.deepEqual(rows.slice(0, 4).map((r) => r.attack), [false, false, false, false]);
  assert.deepEqual(rows.slice(0, 4).map((r) => r.beatsLeft), [4, 3, 2, 1]);
  // then it joins on the next bar line, on step 0
  assert.equal(rows[4].attack, true);
  assert.equal(rows[4].countingIn, false);
  assert.equal(rows[4].step, 0);
  assert.deepEqual(attacksOf(rows), [4]);
});

test("a count-in aligns to the next bar FIRST, then counts a whole bar — a count-in is a bar you can come in on", () => {
  const t = createTransportCore({ meter: 4, splitIdx: 0, steps: 4, countIn: true });
  t.start(2, { beatInBar: 2 });                      // Play pressed mid-bar, armed on beat 2
  const rows = run(t, 12, 4, 2);
  // the current bar finishes (indices 2,3), then index 4 is the count-in bar, and
  // the join is the bar line after it — index 8, on the downbeat, on step 0
  assert.equal(attacksOf(rows)[0], 8, "count-in must align to the next bar (4) then count one whole bar → join at 8");
  assert.equal(rows.find((r) => r.i === 8).step, 0);
});

test("Play joins at the NEXT BAR, not the arming beat — the beat-2 defect", () => {
  // Arm mid-bar on beat 3 (absolute index 7). The join must be the next bar line
  // (index 8, beat 0), NOT index 7 — otherwise beatInStep cycles from the offset
  // and EVERY chord lands off the downbeat for the rest of the pass, which is the
  // symptom Daniel heard. The old code joined on the arming beat.
  const t = createTransportCore({ meter: 4, splitIdx: 0, steps: 4 });
  t.start(7, { beatInBar: 3 });
  const rows = run(t, 12, 4, 7);
  const at = attacksOf(rows);
  assert.equal(at[0], 8, "the first attack must be the next bar line (8), not the arming beat (7)");
  for (const r of rows.filter((x) => x.attack))
    assert.equal(r.i % 4, 0, `a chord attacked on beat ${r.i % 4}, not the downbeat — the defect repeats every bar`);
});

test("armed ON a downbeat, Play joins immediately — the next bar is this one", () => {
  const t = createTransportCore({ meter: 4, splitIdx: 0, steps: 4 });
  t.start(8, { beatInBar: 0 });                      // the arming beat IS a bar line
  assert.equal(run(t, 4, 4, 8)[0].attack, true, "on a downbeat there is nothing to wait for");
});

/* ================= the accent level ================= */

test("LEVEL says bar > step > beat, so the click and the chord change are ONE event", () => {
  const t = createTransportCore({ meter: 4, splitIdx: 1, steps: 4 });   // [2,2]
  t.start(0);
  const rows = run(t, 4, 4);
  assert.equal(rows[0].level, LEVEL.BAR, "a bar line that is also a step is still the bar");
  assert.equal(rows[1].level, LEVEL.BEAT);
  assert.equal(rows[2].level, LEVEL.STEP, "a step beginning mid-bar is louder than a plain beat");
  assert.equal(rows[3].level, LEVEL.BEAT);
  assert.ok(LEVEL.BAR > LEVEL.STEP && LEVEL.STEP > LEVEL.BEAT);
});

test("a stopped transport reports beats without walking", () => {
  const t = createTransportCore({ meter: 4, splitIdx: 0, steps: 4 });
  const rows = run(t, 8, 4);
  assert.ok(rows.every((r) => !r.playing && !r.attack), "a stopped transport attacked");
  assert.equal(t.step, 0, "a stopped transport moved its step");
  // and stop() mid-pass freezes the step rather than resetting it
  t.start(0); run(t, 6, 4); const where = t.step;
  t.stop();
  run(t, 8, 4);
  assert.equal(t.step, where, "stopping moved the step");
});

/* ================= changes under the walk ================= */

test("a meter change keeps the walk inside the new pattern instead of running off it", () => {
  const t = createTransportCore({ meter: 7, splitIdx: 3, steps: 8 });   // [2,2,3]
  t.start(0);
  run(t, 4, 7);
  t.setMeter(3);                                     // fewer beats, shorter pattern
  assert.ok(t.splitIdx < SPLITS[3].length, "the split index is out of range for the new meter");
  const rows = run(t, 12, 3, 4);
  assert.ok(rows.every((r) => Number.isInteger(r.step) && r.step >= 0 && r.step < 8),
    "the step left its range after a meter change");
});

test("a split change mid-pass does not strand the walk", () => {
  const t = createTransportCore({ meter: 4, splitIdx: 0, steps: 8 });
  t.start(0);
  run(t, 3, 4);
  t.setSplit(2);                                     // [1,1,1,1]
  const rows = run(t, 8, 4, 3);
  assert.ok(rows.some((r) => r.attack), "the walk stalled after a split change");
});

test("a shorter pass re-wraps the step rather than pointing past the end", () => {
  const t = createTransportCore({ meter: 4, splitIdx: 2, steps: 8 });
  t.start(0);
  run(t, 8, 4);
  t.setSteps(4);
  assert.ok(t.step < 4, `step ${t.step} is outside a four-step pass`);
});

test("it refuses a pass with no steps rather than dividing by it", () => {
  assert.throws(() => createTransportCore({ steps: 0 }), /at least one step/);
  assert.throws(() => createTransportCore({ steps: 2.5 }), /at least one step/);
});

/* ================= it is named by role ================= */

test("nothing here is named after a chord type or an app", () => {
  const src = readFileSync(new URL("../transport.mjs", import.meta.url), "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  for (const word of ["triad", "tetrad", "Triadetudes", "Tetradetudes", "fret", "voicing"])
    assert.ok(!new RegExp(word, "i").test(code),
      `"${word}" appears in the transport's code — a transport walks STEPS, whatever a step is`);
});
