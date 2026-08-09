/* triadetudes-onsets.test.mjs — the onset seed (v0.6.5), tested headless.
 *
 * arpOnsets is the pure function lifted out of strum() so the audio path and
 * the pulse subscriber consume ONE derivation (item: Triadetudes v0.6.5).
 * Two duties here:
 *   1. structural invariants across the whole config space — every meter split,
 *      arp on and off, both harmony modes;
 *   2. the equivalence pin: the onsets strum() now consumes must match, number
 *      for number, what it previously computed inline (audio provably unmoved).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

/* the OLD inline strum() computation, verbatim as arithmetic — the pin's oracle */
function oldInline(voicing, setLowHigh, pattern, bassMidi, durBeats, bpm, OPEN) {
  const byStr = {};
  voicing.frets.forEach((f, k) => (byStr[setLowHigh[k]] = OPEN[setLowHigh[k]] + f));
  const order = pattern || setLowHigh;
  const notes = order.map((x) => byStr[x]);
  const out = [];
  if (bassMidi !== null) out.push({ midi: bassMidi, offset: 0, dur: 1.0 });
  if (!pattern) {
    notes.forEach((m, k) => out.push({ midi: m, offset: k * 0.028, dur: 0.85 }));
  } else {
    const spb = 60 / bpm, D = (durBeats || 2) * spb, L = notes.length, step = D / L;
    notes.forEach((m, k) =>
      out.push({ midi: m, offset: k * step, dur: Math.min(0.9, step * 1.6) }));
  }
  return out;
}

test("equivalence pin: arpOnsets reproduces strum()'s previous inline scheduling exactly", () => {
  const e = loadTriadetudesEngine();
  const seq = e.buildSequence();
  const voic = e.chooseVoicings(seq);
  const s = unwrap(e.st.setLowHigh);
  for (const bpm of [60, 72, 160])
    for (const durBeats of [1, 2, 3, 4, 6])
      for (const pattern of [null, unwrap(e.st.arpPattern) || [2, 3, 1], [2, 3, 3, 1], [1, 1, 2, 3, 2, 1]])
        voic.forEach((v, i) => {
          for (const bass of [null, 38]) {
            const now = unwrap(e.arpOnsets(v, s, pattern, bass, durBeats, bpm));
            const old = oldInline(unwrap(v), s, pattern, bass, durBeats, bpm, unwrap(e.OPEN));
            assert.equal(now.length, old.length, `chord ${i}: same event count`);
            now.forEach((ev, k) => {
              assert.equal(ev.midi, old[k].midi, `chord ${i} ev ${k}: midi`);
              assert.ok(close(ev.offset, old[k].offset), `chord ${i} ev ${k}: offset`);
              assert.ok(close(ev.dur, old[k].dur), `chord ${i} ev ${k}: dur`);
            });
          }
        });
});

test("roles: bass first when present, chord onsets carry (string,fret) from the voicing", () => {
  const e = loadTriadetudesEngine();
  const voic = e.chooseVoicings(e.buildSequence());
  const s = unwrap(e.st.setLowHigh);
  const evs = unwrap(e.arpOnsets(voic[0], s, [2, 3, 3, 1], 38, 2, 72));
  assert.equal(evs[0].role, "bass");
  assert.equal(evs[0].offset, 0);
  assert.equal(evs[0].string, null, "the bass is a pedal, not a fretted step");
  const chord = evs.filter((ev) => ev.role === "chord");
  assert.equal(chord.length, 4);
  for (const ev of chord) {
    assert.ok(s.includes(ev.string), "string inside the set");
    const k = s.indexOf(ev.string);
    assert.equal(ev.fret, unwrap(voic[0]).frets[k], "fret is the voicing's, not recomputed");
    assert.equal(ev.midi, unwrap(e.OPEN)[ev.string] + ev.fret, "midi from string+fret");
  }
});

test("invariants across every meter split × arp on/off × both harmony modes", () => {
  const e = loadTriadetudesEngine();
  const configs = [
    { mode: "build", setup: () => {} },
    { mode: "break", setup: () => { e.st.harmonyMode = "break";
        e.st.breakProg = [{ sym: "Dm7", us: null }, { sym: "G7", us: null },
          { sym: "Cmaj7", us: null }, { sym: "G7alt", us: null }]; } },
  ];
  for (const cfg of configs) {
    cfg.setup();
    const seq = e.buildSequence();
    assert.ok(seq.length, `${cfg.mode}: sequence non-empty`);
    const voic = e.chooseVoicings(seq);
    const s = unwrap(e.st.setLowHigh);
    for (const meter in e.SPLITS)
      for (const split of e.SPLITS[meter])
        for (const durBeats of split)
          for (const pattern of [null, [2, 3, 1], [2, 3, 3, 1]])
            voic.forEach((v, i) => {
              const evs = unwrap(e.arpOnsets(v, s, pattern, 40, durBeats, 72));
              const chord = evs.filter((ev) => ev.role === "chord");
              assert.equal(chord.length, (pattern || s).length,
                `${cfg.mode} chord ${i}: one onset per pattern note`);
              const span = durBeats * (60 / 72);
              chord.forEach((ev, k) => {
                if (k) assert.ok(ev.offset > chord[k - 1].offset, "strictly increasing");
                assert.ok(ev.offset >= 0 && ev.offset < span, "onset inside the chord span");
                assert.ok(ev.dur > 0, "positive duration");
              });
            });
  }
});

test("derivation errors throw loudly (assertions live in the pure function)", () => {
  const e = loadTriadetudesEngine();
  const voic = e.chooseVoicings(e.buildSequence());
  const s = unwrap(e.st.setLowHigh);
  assert.throws(() => e.arpOnsets(voic[0], s, [2, 5], null, 2, 72),
    /outside the set/, "pattern string outside the set is a derivation error");
});
