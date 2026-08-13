/* triadetudes-voices.test.mjs — the voice table's timing law (v0.8.4).
 *
 * A voice changes TIMBRE, never TIMING: voiceSchedule consumes onsetsFor's
 * event list (the v0.6.5 arpOnsets seam) and may vary only dur. Note count,
 * onset times, midis and roles must be identical across every voice — that
 * is this suite. What no assertion can reach — whether a voice sounds good —
 * is Daniel's ear, and the item stays open until it has heard them.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";

const e = loadTriadetudesEngine();
const BPM = 160, DUR_BEATS = 4;
const span = DUR_BEATS * (60 / BPM);
const close = (a, b) => Math.abs(a - b) < 1e-9;

function lineEvents() {
  // a real étude line over a bass pedal, at the item's worst-case tempo
  const voic = e.chooseVoicings(e.buildSequence());
  const pat = [2, 3, 3, 1].map((sn) => voic[0].notes.find((n) => n.string === sn));
  return unwrap(e.arpOnsets(voic[0], pat, 38, DUR_BEATS, BPM));
}

test("the voice names are the table's contract, and tone is among them", () => {
  assert.deepEqual(unwrap(e.NOTE_VOICE_NAMES), ["tone", "pluck", "sustain"]);
});

test("timing law: count, onsets, midis and roles identical across every voice", () => {
  const evs = lineEvents();
  const base = evs.map((x) => [x.midi, x.onset, x.role].join("|")).join(";");
  for (const voice of unwrap(e.NOTE_VOICE_NAMES)) {
    const sched = unwrap(e.voiceSchedule(evs, voice, DUR_BEATS, BPM));
    assert.equal(sched.length, evs.length, voice + ": note count unchanged");
    assert.equal(sched.map((x) => [x.midi, x.onset, x.role].join("|")).join(";"),
      base, voice + ": onsets/midis/roles pass through untouched");
    for (const ev of sched)
      assert.ok(ev.dur > 0, voice + ": every dur positive");
  }
});

test("tone is the anti-drift baseline: the schedule is byte-equal to the event list", () => {
  const evs = lineEvents();
  assert.deepEqual(unwrap(e.voiceSchedule(evs, "tone", DUR_BEATS, BPM)), evs,
    "tone changes NOTHING — existing études sound identical");
});

test("sustain holds to the chord change (a): dur = span - onset, bass = full span", () => {
  assert.equal(unwrap(e.SUSTAIN_HOLD), "chord", "(a) ships; (b) is the one-line switch");
  const evs = lineEvents();
  const sched = unwrap(e.voiceSchedule(evs, "sustain", DUR_BEATS, BPM));
  for (let i = 0; i < evs.length; i++)
    assert.ok(close(sched[i].dur, span - evs[i].onset),
      `event ${i} (${evs[i].role}) holds to the chord change`);
  const bass = sched.find((x) => x.role === "bass");
  assert.ok(bass && close(bass.dur, span), "the bass pedal holds the whole chord");
});

test("pluck rings to the chord change, capped — never shorter than the event's own dur", () => {
  const evs = lineEvents();
  const sched = unwrap(e.voiceSchedule(evs, "pluck", DUR_BEATS, BPM));
  for (let i = 0; i < evs.length; i++) {
    assert.ok(sched[i].dur >= evs[i].dur - 1e-9 || close(sched[i].dur, 1.1),
      "no clipped strings");
    assert.ok(sched[i].dur <= 1.1 + 1e-9, "capped — a string does not ring forever");
  }
});

test("Both mode: strummed harmony-context events keep their short dur in every voice", () => {
  const voic = e.chooseVoicings(e.buildSequence());
  const pat = [2, 3, 3, 1].map((sn) => voic[0].notes.find((n) => n.string === sn));
  const line = unwrap(e.arpOnsets(voic[0], pat, 38, DUR_BEATS, BPM));
  const strums = unwrap(e.arpOnsets(voic[0], null, null, DUR_BEATS, BPM))
    .map((ev) => ({ ...ev, dur: Math.min(ev.dur, 0.5), strum: true }));
  const both = [...strums, ...line];
  for (const voice of unwrap(e.NOTE_VOICE_NAMES)) {
    const sched = unwrap(e.voiceSchedule(both, voice, DUR_BEATS, BPM));
    for (let i = 0; i < strums.length; i++)
      assert.equal(sched[i].dur, both[i].dur, voice + ": context strum untouched");
  }
});

test("serialization default: st carries noteVoice, and it defaults to tone", () => {
  assert.equal(unwrap(e.st).noteVoice, "tone");
});
