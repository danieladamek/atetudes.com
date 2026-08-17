/* voices.test.mjs — the extracted audio layer, pinned against the shipped study.
 *
 * The extraction is a REFACTOR, and a refactor is asserted, not reviewed. Two
 * halves, and they are pinned differently on purpose:
 *
 *   - `voiceSchedule` and its constants sit ABOVE the study's audio cut, so the
 *     characterization loader harvests them and they can be pinned EXACTLY,
 *     over a derived corpus of voices × meters × tempos;
 *   - everything below the cut (the voice table, the pluck, the click, the bass
 *     seat) is pinned STRUCTURALLY, because it was node-building code that no
 *     loader can evaluate headlessly — its numbers are compared against the
 *     source of the shipped file, read as text.
 *
 * The second half is the honest limit of what a test can say about audio, and
 * it is stated rather than papered over: these assertions prove the numbers and
 * the shapes reached the new module intact. They cannot prove it sounds right.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  hzOf, NOTE_VOICE_NAMES, SUSTAIN_HOLD, voiceSchedule, chordSchedule, bassSeat,
  pluckSamples, SUSTAIN_PARTIALS, NOTE_VOICES, BASS_VOICE, voiceFor, envelopeOf,
  CLICK_VOICES, CLICK_VOICE_NAMES, clickSpec,
} from "../voices.mjs";
import { noteEvents } from "../note-events.mjs";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";

const eng = loadTriadetudesEngine();
const STUDY = readFileSync(
  new URL("../../static/studies/triadetudes/study.html", import.meta.url), "utf8");

/* ================= 1. the pinned half — exact, against the shipped engine ============ */

test("the study's audio really is OUTSIDE the pinned slice — the premise of this item", () => {
  const script = STUDY.match(/<script>([\s\S]*?)<\/script>/)[1];
  const cut = script.indexOf("/* ============ audio ============ */");
  assert.ok(cut > 0, "the audio marker moved — re-derive the extraction's safety");
  assert.ok(!/AudioContext/.test(script.slice(0, cut)),
    "the pinned slice now contains audio — the characterization suite would pin it");
  assert.ok(/AudioContext/.test(script.slice(cut)), "the audio half lost its AudioContext");
});

test("the schedule's two constants match the shipped study exactly", () => {
  assert.deepEqual(NOTE_VOICE_NAMES, unwrap(eng.NOTE_VOICE_NAMES));
  assert.equal(SUSTAIN_HOLD, eng.SUSTAIN_HOLD);
});

test("voiceSchedule reproduces the shipped one over a derived corpus", () => {
  /* Every voice × meter × tempo, over real event lists from note-events.mjs —
   * not a handful of hand-picked cases. This is the same discipline
   * isolation.mjs used: the shipped behaviour IS the specification. */
  const voicing = { notes: [
    { midi: 48, string: 6, fret: 8, slot: 0 },
    { midi: 55, string: 5, fret: 10, slot: 1 },
    { midi: 59, string: 4, fret: 9, slot: 2 },
    { midi: 64, string: 3, fret: 9, slot: 3 },
  ] };
  let cases = 0;
  for (const durBeats of [1, 2, 3, 4, 6])
    for (const bpm of [50, 72, 96, 132, 200])
      for (const bass of [null, 36])
        // an order is the voicing's OWN note objects (identity, not lookup)
        for (const order of [null, voicing.notes, [voicing.notes[3], voicing.notes[1], voicing.notes[0]],
          [voicing.notes[2], voicing.notes[2], voicing.notes[1], voicing.notes[0]]]) {
          const evs = unwrap(noteEvents(voicing, order, bass, durBeats, bpm));
          for (const voice of NOTE_VOICE_NAMES) {
            const mine = voiceSchedule(evs, voice, durBeats, bpm);
            const theirs = unwrap(eng.voiceSchedule(evs, voice, durBeats, bpm));
            assert.deepEqual(mine, theirs,
              `drift: ${voice} ${durBeats}bt @${bpm} order=${JSON.stringify(order)}`);
            cases++;
          }
        }
  assert.ok(cases >= 600, `corpus too small to mean anything (${cases})`);
});

test("voiceSchedule keeps a strummed event's short dur in every voice", () => {
  const evs = [{ midi: 60, role: "chord", onset: 0, dur: 0.4, strum: true },
    { midi: 64, role: "chord", onset: 0.1, dur: 0.4 }];
  for (const voice of NOTE_VOICE_NAMES) {
    const out = voiceSchedule(evs, voice, 2, 72);
    assert.equal(out[0].dur, 0.4, `${voice} stretched a strummed event`);
  }
});

test("chordSchedule is the one call a host needs — it does not re-derive onsets", () => {
  const voicing = { notes: [{ midi: 48, string: 6, fret: 8, slot: 0 },
    { midi: 55, string: 5, fret: 10, slot: 1 }] };
  const direct = voiceSchedule(unwrap(noteEvents(voicing, null, null, 2, 72)), "pluck", 2, 72);
  assert.deepEqual(chordSchedule(voicing, { durBeats: 2, bpm: 72, voice: "pluck" }), direct);
});

test("the bass register rule matches the shipped seating, across the neck", () => {
  /* The shipped rule is `low-((low-b)%12+12)%12; if(bass>=low)bass-=12;
   * if(bass<28)bass+=12` — and the ORDER matters: the floor is applied LAST,
   * so on a very low voicing it can push the pedal back ABOVE the lowest note.
   * That is the shipped behaviour, so it is what is asserted; a first version
   * of this test demanded `bass < low` unconditionally and the rule refused it.
   * The floor wins, deliberately: a pedal below midi 28 is inaudible mud. */
  const FLOOR = 28;
  for (let low = 30; low <= 84; low++)
    for (let pc = 0; pc < 12; pc++) {
      const b = bassSeat(low, pc);
      assert.equal(((b % 12) + 12) % 12, pc, "the seat changed pitch class");
      assert.ok(b >= FLOOR, `bass ${b} fell below the floor`);
      if (low - 12 >= FLOOR)
        assert.ok(b < low, `bass ${b} is not below ${low}, and there was room above the floor`);
      assert.ok(low - b <= 24, `bass ${b} is more than two octaves below ${low}`);
    }
  assert.equal(bassSeat(NaN, 0), null);
});

/* ================= 2. the extracted half — structural, against the source ========== */

test("the voice table's numbers survived the extraction verbatim", () => {
  /* Read from the shipped source as TEXT, because this half is node-building
   * code no loader can evaluate. It proves the numbers arrived intact; it
   * cannot prove they sound right. */
  const has = (s) => assert.ok(STUDY.includes(s), `the shipped study no longer contains ${s}`);

  assert.equal(NOTE_VOICES.tone.source.type, "triangle"); has('o.type="triangle"');
  assert.equal(NOTE_VOICES.tone.filter.freq, 2200); has("f.frequency.value=2200");
  assert.equal(NOTE_VOICES.pluck.filter.freq, 3400); has("f.frequency.value=3400");
  assert.equal(NOTE_VOICES.sustain.filter.freq, 2600); has("f.frequency.value=2600");
  assert.equal(BASS_VOICE.filter.freq, 520); has("f.frequency.value=520");
  assert.deepEqual([...SUSTAIN_PARTIALS], [0, 1, 0.45, 0.22, 0.10, 0.05]);
  has("[0,1,0.45,0.22,0.10,0.05]");
});

test("the click table's numbers survived too, for all three voices and all four levels", () => {
  assert.deepEqual(CLICK_VOICE_NAMES, ["beep", "wood", "tick"]);
  for (const name of CLICK_VOICE_NAMES) {
    const v = CLICK_VOICES[name];
    for (const lv of [2, 1, 0, -1]) {
      const spec = clickSpec(name, lv);
      assert.ok(spec.gain > 0, `${name} level ${lv} is silent`);
      assert.equal(spec.dur, v.dur);
    }
    // louder and brighter as the level rises — the accent character
    assert.ok(clickSpec(name, 2).gain > clickSpec(name, 0).gain, `${name}: a bar is not louder than a beat`);
    assert.ok(clickSpec(name, 0).gain > clickSpec(name, -1).gain, `${name}: a beat is not louder than a sub`);
  }
  assert.ok(STUDY.includes('beep:{type:"square"'), "the shipped beep changed shape");
  assert.equal(clickSpec("tick", 0).noise, true, "tick is the noise voice");
  assert.equal(clickSpec("beep", 0).noise, false);
});

test("ACCENTS OFF clamps the level rather than flattening the gain", () => {
  // the shipped rule: `st.clickAccent?level:Math.min(level,0)` — so a downbeat
  // with accents off is indistinguishable from any other beat, and a
  // subdivision stays quieter than both
  for (const name of CLICK_VOICE_NAMES) {
    assert.deepEqual(clickSpec(name, 2, { accents: false }), clickSpec(name, 0, { accents: true }));
    assert.deepEqual(clickSpec(name, 1, { accents: false }), clickSpec(name, 0, { accents: true }));
    assert.deepEqual(clickSpec(name, -1, { accents: false }), clickSpec(name, -1, { accents: true }),
      "a subdivision must stay a subdivision with accents off");
  }
  assert.ok(STUDY.includes("st.clickAccent?level:Math.min(level,0)"), "the shipped accent rule changed");
});

test("volume scales the click linearly and reaches silence", () => {
  const full = clickSpec("beep", 2, { vol: 1 }).gain;
  assert.ok(Math.abs(clickSpec("beep", 2, { vol: 0.5 }).gain - full / 2) < 1e-12);
  assert.equal(clickSpec("beep", 2, { vol: 0 }).gain, 0);
});

/* ================= 3. the Karplus-Strong string, as arithmetic ==================== */

test("the pluck is DETERMINISTIC per pitch — the same note is the same waveform", () => {
  const a = pluckSamples(60, 8000, 0.2), b = pluckSamples(60, 8000, 0.2);
  assert.deepEqual([...a.slice(0, 64)], [...b.slice(0, 64)]);
  const c = pluckSamples(72, 8000, 0.2);
  assert.notDeepEqual([...a.slice(0, 64)], [...c.slice(0, 64)], "two pitches share a waveform");
  assert.ok(STUDY.includes("(midi*2654435761)>>>0"), "the shipped seed changed");
});

test("the pluck decays, and its period follows the pitch", () => {
  const rms = (s, a, b) => {
    let t = 0; for (let i = a; i < b; i++) t += s[i] * s[i];
    return Math.sqrt(t / (b - a));
  };
  for (const midi of [40, 52, 64, 76]) {
    const s = pluckSamples(midi, 22050, 1.0);
    assert.ok(rms(s, 0, 2000) > rms(s, s.length - 2000, s.length) * 3,
      `midi ${midi} does not decay`);
    for (const x of s) assert.ok(x >= -1.001 && x <= 1.001, `midi ${midi} clipped at ${x}`);
  }
  // the ring buffer is one period long, so a higher pitch has a shorter one
  const lo = Math.round(22050 / hzOf(40)), hi = Math.round(22050 / hzOf(76));
  assert.ok(lo > hi, "the ring buffer does not shorten with pitch");
});

test("pluckSamples refuses a nonsense sample rate rather than returning silence", () => {
  assert.throws(() => pluckSamples(60, 0), /real sample rate/);
  assert.throws(() => pluckSamples(60, NaN), /real sample rate/);
});

/* ================= 4. the envelopes, headlessly ================================== */

test("every voice's envelope is ordered, peaks at its velocity, and ends quiet", () => {
  for (const [name, spec] of Object.entries({ ...NOTE_VOICES, bass: BASS_VOICE }))
    for (const dur of [0.05, 0.2, 0.7, 2.0, 6.0])
      for (const vel of [0.05, 0.2, 0.4]) {
        const { points, start, stop } = envelopeOf(spec, 10, dur, vel);
        for (let i = 1; i < points.length; i++)
          assert.ok(points[i].at >= points[i - 1].at, `${name}: breakpoints out of order`);
        assert.equal(start, 10);
        assert.ok(stop > 10 + dur, `${name}: the source stops before its release ends`);
        const peak = Math.max(...points.map((p) => p.value));
        assert.ok(peak > 0, `${name}: silent at vel ${vel}`);
        assert.ok(peak <= vel * 1.5 + 1e-9, `${name}: peaks at ${peak}, above what vel ${vel} allows`);
        const last = points[points.length - 1].value;
        assert.ok(last <= 0.001, `${name}: ends at ${last} rather than quiet`);
      }
});

test("an exponential ramp never targets zero — it would throw in Web Audio", () => {
  // the shipped tone voice ramps to 0.0008, not to 0, for exactly this reason
  for (const [name, spec] of Object.entries({ ...NOTE_VOICES, bass: BASS_VOICE }))
    for (const p of envelopeOf(spec, 0, 0.7, 0.2).points)
      if (p.kind === "exp")
        assert.ok(p.value > 0, `${name}: an exponential ramp to ${p.value} would throw`);
});

test("voiceFor routes the bass pedal to its own voice and its own bus", () => {
  assert.equal(voiceFor("bass", "pluck"), BASS_VOICE);
  assert.equal(voiceFor("chord", "pluck"), NOTE_VOICES.pluck);
  assert.equal(voiceFor("chord", "nonsense"), NOTE_VOICES.tone, "an unknown voice falls back to tone");
  assert.equal(BASS_VOICE.bus, "bass");
  for (const n of NOTE_VOICE_NAMES) assert.equal(NOTE_VOICES[n].bus, "triad");
});

test("envelopeOf refuses a description whose breakpoints run backwards", () => {
  assert.throws(() => envelopeOf({ tail: 0, envelope: () => [
    { kind: "set", at: 1, value: 0 }, { kind: "set", at: 0, value: 1 }] }, 0, 1, 1),
    /out of order/);
});

test("A440 is A440", () => {
  assert.equal(hzOf(69), 440);
  assert.ok(Math.abs(hzOf(81) - 880) < 1e-9);
  assert.ok(Math.abs(hzOf(57) - 220) < 1e-9);
});
