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
  PAD_VOICE, PAD_PARTIALS, PAD_LEVEL, PAD_REGISTER, BASS_PARTIALS, PLUCK_STRING, FILTER_CEILING,
  cutoffOf, oscillatorsOf, padSeat,
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

/* PIN REWRITTEN 260913 (item 2): the harmony-context flag is `bed` now —
 * the strum word went to the movement, per the PO's one-word-one-meaning
 * ruling. Same assertion, same numbers. */
test("voiceSchedule keeps a BED event's short dur in every voice", () => {
  const evs = [{ midi: 60, role: "chord", onset: 0, dur: 0.4, bed: true },
    { midi: 64, role: "chord", onset: 0.1, dur: 0.4 }];
  for (const voice of NOTE_VOICE_NAMES) {
    const out = voiceSchedule(evs, voice, 2, 72);
    assert.equal(out[0].dur, 0.4, `${voice} stretched a bed event`);
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

/* PIN REPLACED 261121 (*Voices - tone, pluck, sustain and bass, as picked by ear*). Until tonight this test read the
 * voice table's numbers against the shipped Triadetudes study as TEXT — the extraction's proof that the numbers arrived
 * intact, and it did that job. Tonight the numbers change ON PURPOSE to Daniel's picks, so the authority is no longer
 * the study the voices came from but the recipe he sent from the audition page, quoted here verbatim:
 *
 *   tone · custom · source triangle · low-pass ×8.5 pitch · attack 8 ms · level 0.245 · detune ±3 ¢
 *   pluck · custom · low-pass ×9.5 pitch · attack 3 ms · release 130 ms · level 0.260 · ring 0.9940 · pick softness 3
 *   sustain · custom · source softbar · low-pass ×12 pitch · attack 27 ms · release 370 ms · level 0.140 · detune ±2 ¢
 *   bass · custom · source octave · low-pass ×4 pitch · attack 20 ms · release 120 ms · level 0.300
 *
 * The page's levels are absolute at its base velocities (0.2 for a note voice, 0.3 for the bass), so the module's
 * multiplier is the level ÷ that base. Each number is asserted where it takes effect — the realised envelope, the
 * cutoff at a real note, the oscillator count — not by reading the description's field alone (rule 3). Triadetudes
 * keeps its own inline copy of the old voices; it is not asserted equal any more (that is Daniel's choice, below). */
test("the voice table is Daniel's 261121 picks — every number where it takes effect", () => {
  const close = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-9, `${what}: ${a}, expected ${b}`);
  const peak = (spec, vel, dur = 1) => Math.max(...envelopeOf(spec, 0, dur, vel).points.map((p) => p.value));
  const rise = (spec, dur = 1) => { const pts = envelopeOf(spec, 0, dur, 0.2).points; const top = Math.max(...pts.map((p) => p.value));
    return pts.find((p) => p.value === top).at - pts[0].at; };
  const release = (spec, dur = 1) => { const pts = envelopeOf(spec, 0, dur, 0.2).points; return pts.at(-1).at - pts.at(-2).at; };
  const T = NOTE_VOICES.tone, P = NOTE_VOICES.pluck, S = NOTE_VOICES.sustain, B = BASS_VOICE;
  // tone: triangle, ×8.5, 8 ms, 0.245 at the page's 0.2, ±3 ¢
  assert.equal(T.source.type, "triangle");
  close(cutoffOf(T.filter, 69), 8.5 * 440, "tone cutoff at A4"); assert.equal(T.filter.q, 0.4);
  close(rise(T), 0.008, "tone attack"); close(peak(T, 0.2), 0.245, "tone level at vel 0.2");
  assert.deepEqual(oscillatorsOf(T.source).cents, [-3, 3]);
  // pluck: ×9.5, 3 ms from zero, 130 ms release, 0.26 at 0.2, ring 0.994, softness 3
  close(cutoffOf(P.filter, 69), 9.5 * 440, "pluck cutoff at A4"); assert.equal(P.filter.q, 0.2);
  assert.equal(envelopeOf(P, 0, 1, 0.2).points[0].value, 0, "the pluck now starts from zero, not at full level");
  close(rise(P), 0.003, "pluck attack"); close(release(P), 0.13, "pluck release"); close(peak(P, 0.2), 0.26, "pluck level");
  assert.equal(P.source, PLUCK_STRING); assert.equal(PLUCK_STRING.loss, 0.994); assert.equal(PLUCK_STRING.soften, 3);
  assert.deepEqual(oscillatorsOf(P.source).cents, [0], "the pluck is never detuned");
  // sustain: soft drawbars, ×12, 27 ms, 370 ms, 0.14 at 0.2, ±2 ¢
  assert.deepEqual([...SUSTAIN_PARTIALS], [0, 1, 0.25, 0.08, 0.02]); assert.equal(S.source.partials, SUSTAIN_PARTIALS);
  close(cutoffOf(S.filter, 69), 12 * 440, "sustain cutoff at A4"); assert.equal(S.filter.q, 0.3);
  close(rise(S), 0.027, "sustain attack"); close(release(S), 0.37, "sustain release"); close(peak(S, 0.2), 0.14, "sustain level");
  assert.deepEqual(oscillatorsOf(S.source).cents, [-2, 2]);
  // bass: sine + octave, ×4, 20 ms, 120 ms, 0.3 at 0.3, no detune
  assert.deepEqual([...BASS_PARTIALS], [0, 1, 0.4]); assert.equal(B.source.partials, BASS_PARTIALS);
  close(cutoffOf(B.filter, 45), 4 * 110, "bass cutoff at A2"); assert.equal(B.filter.q, 0.5);
  close(rise(B), 0.02, "bass attack"); close(release(B), 0.12, "bass release"); close(peak(B, 0.3), 0.3, "bass level");
  assert.deepEqual(oscillatorsOf(B.source).cents, [0]);
  // the page's cap on a following filter, kept
  assert.equal(FILTER_CEILING, 18000);
  assert.equal(cutoffOf(T.filter, 127), 18000, "a following filter is capped at the page's 18,000 Hz");
  // the shipped study still holds the voices the module came FROM — the extraction's history, not its authority
  assert.ok(STUDY.includes("f.frequency.value=2200") && STUDY.includes("[0,1,0.45,0.22,0.10,0.05]"),
    "Triadetudes' own inline voices changed — this build does not touch them; find out who did");
});

test("261121: every filter is fixed OR follows the note; every detune is a pair at 1/√2 — read one way, by the host", () => {
  for (const [n, v] of Object.entries({ ...NOTE_VOICES, bass: BASS_VOICE, pad: PAD_VOICE })) {
    assert.ok(("freq" in v.filter) !== ("track" in v.filter), `${n}: exactly one of freq and track`);
    const o = oscillatorsOf(v.source);
    assert.ok(o.cents.length === 1 ? o.level === 1 : (o.cents.length === 2 && Math.abs(o.level - Math.SQRT1_2) < 1e-12),
      `${n}: a pair carries one oscillator's power (${JSON.stringify(o)})`);
    // the sum of the squares is unity: detune changes the colour, never the loudness
    assert.ok(Math.abs(o.cents.length * o.level ** 2 - 1) < 1e-12, `${n}: detune changed the power`);
  }
  const detuned = Object.entries({ ...NOTE_VOICES, bass: BASS_VOICE, pad: PAD_VOICE })
    .filter(([, v]) => oscillatorsOf(v.source).cents.length === 2).map(([n]) => n).sort();
  assert.deepEqual(detuned, ["pad", "sustain", "tone"], "tone, sustain and the pad take detune; pluck and bass do not");
  // the following filter falls with the note: the bass's lowest seat (midi 35, B1) is near 250 Hz
  assert.ok(Math.abs(cutoffOf(BASS_VOICE.filter, 35) - 4 * hzOf(35)) < 1e-9 && cutoffOf(BASS_VOICE.filter, 35) < 250);
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

/* 261121: the pluck's string is Daniel's pick (loss 0.994, three softening passes). Determinism is unchanged — the
 * seed is the shipped one — and is asserted on the string the voice now uses, its default. */
test("the pluck is DETERMINISTIC per pitch — the same note is the same waveform", () => {
  const a = pluckSamples(60, 8000, 0.2), b = pluckSamples(60, 8000, 0.2);
  assert.deepEqual([...a], [...pluckSamples(60, 8000, 0.2, PLUCK_STRING)], "the default string is the voice's own");
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

test("261121: the picked string rings SHORTER (loss 0.994) and picks SOFTER (three passes) than the shipped one", () => {
  const rms = (s, a, b) => { let t = 0; for (let i = a; i < b; i++) t += s[i] * s[i]; return Math.sqrt(t / (b - a)); };
  // softness where it takes effect: the burst's high-frequency energy, as the first difference's RMS over the first period
  const edge = (s, n) => { let t = 0; for (let i = 1; i < n; i++) t += (s[i] - s[i - 1]) ** 2; return Math.sqrt(t / (n - 1)); };
  /* each effect against the other held fixed — softening removes the highs that decay fastest, so a start-to-end
   * ratio against the old string would measure the burst, not the loss (the first run of this test did exactly that) */
  const { loss, soften } = PLUCK_STRING;
  for (const midi of [40, 52, 64, 76]) {
    const N = Math.round(22050 / hzOf(midi));
    const now = pluckSamples(midi, 22050, 1.0);
    const hard = pluckSamples(midi, 22050, 1.0, { loss, soften: 0 }), long = pluckSamples(midi, 22050, 1.0, { loss: 0.996, soften });
    assert.ok(edge(now, N) < edge(hard, N) * 0.6, `midi ${midi}: the pick is not softer (${edge(now, N)} vs ${edge(hard, N)})`);
    const tail = (s) => rms(s, s.length - 2000, s.length) / rms(s, 0, 2000);
    assert.ok(tail(now) < tail(long), `midi ${midi}: the ring is not shorter (${tail(now)} vs ${tail(long)})`);
  }
  assert.throws(() => pluckSamples(60, 8000, 0.2, { loss: 1, soften: 0 }), /loss/);
  assert.throws(() => pluckSamples(60, 8000, 0.2, { loss: 0.99, soften: 1.5 }), /soften/);
});

test("pluckSamples refuses a nonsense sample rate rather than returning silence", () => {
  assert.throws(() => pluckSamples(60, 0), /real sample rate/);
  assert.throws(() => pluckSamples(60, NaN), /real sample rate/);
});

/* ================= 4. the envelopes, headlessly ================================== */

/* 261121: the pad joins this test (it was left out), and the stop is asserted against the envelope's LAST breakpoint —
 * the pad's release runs past `dur` now, and a stop at `dur + tail` would cut it. */
test("every voice's envelope is ordered, peaks at its velocity, and ends quiet", () => {
  for (const [name, spec] of Object.entries({ ...NOTE_VOICES, bass: BASS_VOICE, pad: PAD_VOICE }))
    for (const dur of [0.05, 0.2, 0.7, 2.0, 6.0])
      for (const vel of [0.05, 0.2, 0.4]) {
        const { points, start, stop } = envelopeOf(spec, 10, dur, vel);
        for (let i = 1; i < points.length; i++)
          assert.ok(points[i].at >= points[i - 1].at, `${name}: breakpoints out of order`);
        assert.equal(start, 10);
        assert.ok(stop > 10 + dur, `${name}: the source stops before its release ends`);
        assert.ok(stop >= points.at(-1).at + spec.tail - 1e-12, `${name}: the source stops before the last breakpoint's tail`);
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
  // the bus is named by ROLE, not by arity — "triad" was false at four voices
  for (const n of NOTE_VOICE_NAMES) assert.equal(NOTE_VOICES[n].bus, "chord");
  assert.ok(!JSON.stringify(NOTE_VOICES).includes("triad"),
    "a bus is named after an arity again — name it after the role");
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


/* ---------------- night 57: the pad is a SEAT, not a subsystem ---------------- */
test("NIGHT 57 — the pad: a described voice on its own bus, and a seat rule chosen by measurement — above the guitar's voicings, clear of the bass", async () => {
  const V = await import("../voices.mjs");
  const { PAD_VOICE, PAD_REGISTER, padSeat, voiceFor, envelopeOf } = V;
  assert.equal(PAD_VOICE.bus, "pad", "its own bus — the mixer's third");
  assert.ok(PAD_VOICE.source && PAD_VOICE.filter && typeof PAD_VOICE.envelope === "function", "a description the card can realise blind, like every voice");
  assert.equal(voiceFor("pad", "tone"), PAD_VOICE, "the pad role takes the pad voice whatever note voice is chosen");
  assert.equal(voiceFor("bass", "tone"), V.BASS_VOICE); assert.equal(voiceFor("chord", "pluck"), V.NOTE_VOICES.pluck);
  const { points } = envelopeOf(PAD_VOICE, 0, 2, 0.2);
  assert.ok(points[1].at - points[0].at >= 0.12, "a pad swells in — no click at the attack");
  assert.ok(Math.abs(points[1].at - points[0].at - 0.5) < 1e-12, "261121: the swell is 0.5 s at a 2 s chord (min(0.5, dur × 0.35))");
  assert.ok(Math.max(...points.map((p) => p.value)) <= 0.2, "…and never above the velocity it was given");
  // THE SEAT, by measurement (261012): the guitar's voicings sit lowest ≈ 45–61 (p10–p90, median 52) and highest ≈ 60–73 (median 67);
  // the bass seat sits 35–53 (median 43). Below the guitar is the bass's octave; the one register neither occupies is above 73.
  assert.deepEqual(PAD_REGISTER, [74, 86], "the pad's window: D5 up to (not including) D6 — clear of 90 % of the guitar's highs and of every bass seat");
  /* REWRITTEN 261121 ON PURPOSE (*Pad - rootless and rounder*): "one note per chord tone" and "the chord's own pitch
   * classes, nothing added" were night 57's seat; Daniel picked the ROOTLESS seat by ear. Now: a chord of four tones or
   * more leaves its root out; a triad or smaller keeps every tone; nothing is ever added; the root is the chord's. */
  const pcs = [10, 2, 5, 9];   // Bbmaj7: Bb D F A
  const seat = padSeat(pcs, 10);
  assert.equal(seat.length, 3, "a tetrad: one note per chord tone but the root");
  assert.ok(seat.every((m) => m >= 74 && m < 86), `every note inside the window: ${seat}`);
  assert.deepEqual([...seat].sort((a, b) => a - b), seat, "sorted low → high");
  assert.deepEqual(seat.map((m) => ((m % 12) + 12) % 12).sort(), [2, 5, 9].sort(), "the chord's own pitch classes less the root, nothing added");
  assert.deepEqual(padSeat([10, 2, 5], 10).map((m) => m % 12).sort(), [10, 2, 5].sort(), "a triad keeps its root");
  assert.deepEqual(padSeat([2, 5, 9, 0], 10).length, 4, "a pick that holds no root has nothing to leave out");
  assert.deepEqual(padSeat([], null), [], "no chord, no pad");
  assert.throws(() => padSeat([12], 0), /pitch class/);
  assert.throws(() => padSeat([0, 4, 7, 11]), /root/, "the root is handed in, never guessed");
});

test("261121 — no diatonic tetrad's pad seat holds a second, in all 12 keys (and the old seat did, six of seven)", () => {
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const second = (seat) => seat.some((m, i) => i > 0 && m - seat[i - 1] <= 2);
  let checked = 0, oldRubs = 0;
  for (let key = 0; key < 12; key++)
    for (let deg = 0; deg < 7; deg++) {
      const tones = [0, 2, 4, 6].map((k) => (key + MAJOR[(deg + k) % 7]) % 12);
      const seat = padSeat(tones, tones[0]);
      assert.ok(!second(seat), `key ${key} degree ${deg + 1}: the seat ${seat} holds a second`);
      // the old rule (every tone in the register), for the measurement the item quotes
      if (second(tones.map((pc) => PAD_REGISTER[0] + (((pc - PAD_REGISTER[0]) % 12) + 12) % 12).sort((a, b) => a - b))) oldRubs++;
      checked++;
    }
  assert.equal(checked, 84);
  assert.equal(oldRubs, 72, "the old seat held a second on six of the seven degrees, in every key");
});

test("261121 — the pad holds the barline: full level to the chord's end, then a release under the next chord's swell", () => {
  /* At a chord change the outgoing note is at full level and the incoming one is rising — the summed level never
   * falls to zero. Asserted on the envelopes over 60–300 bpm (the clock's range) at one bar; the offline render in the
   * browser gate (hub/tests/voice_render.py) asserts it on the sound. */
  const at = (pts, x) => { if (x < pts[0].at || x > pts.at(-1).at) return 0;
    for (let i = 1; i < pts.length; i++) if (x <= pts[i].at) { const a = pts[i - 1], b = pts[i];
      return b.kind === "set" ? (x < b.at ? a.value : b.value) : a.value + (b.value - a.value) * ((x - a.at) / ((b.at - a.at) || 1)); } return 0; };
  for (const bpm of [15, 60, 120, 160, 300]) {
    const dur = 4 * 60 / bpm;
    const one = envelopeOf(PAD_VOICE, 0, dur, PAD_LEVEL), two = envelopeOf(PAD_VOICE, dur, dur, PAD_LEVEL);
    assert.equal(at(one.points, dur), PAD_LEVEL, `${bpm} bpm: the outgoing note is at full level at the barline`);
    let lo = Infinity;
    for (let x = dur * 0.5; x <= dur * 1.5; x += dur / 400) lo = Math.min(lo, at(one.points, x) + at(two.points, x));
    assert.ok(lo >= PAD_LEVEL * 0.5, `${bpm} bpm: the summed pad level fell to ${lo} across the change`);
    assert.ok(one.stop > dur + 0.1, `${bpm} bpm: the source runs past the barline (${one.stop})`);
  }
  assert.equal(PAD_LEVEL, 0.06); assert.deepEqual([...PAD_PARTIALS], [0, 1, 0.15, 0.03]);
  assert.equal(PAD_VOICE.filter.freq, 1100); assert.equal(PAD_VOICE.filter.q, 0.3);
  assert.deepEqual(oscillatorsOf(PAD_VOICE.source).cents, [-2, 2]);
  assert.deepEqual(PAD_REGISTER, [74, 86], "the register is not this build's");
});
