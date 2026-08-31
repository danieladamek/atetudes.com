/* movement-rename.test.mjs — THE RENAME EQUIVALENCE ORACLE (260913, item 2).
 *
 * The PO ruled the vocabulary: the whole-chord movement is a STRUM (the
 * code's own comment said so first — "block strums stagger"), so the
 * movement value "block" becomes "strum", "arpeggio" becomes "arpeggiate",
 * playback's "block" moves with them — and the OLD engine meaning of
 * `strum` (the short harmony bed under a line, playback "both") is renamed
 * to `bed`, the word figure.mjs's own prose already used ("short strummed
 * harmony"). One word, one meaning, UI and code together.
 *
 * THE PIN: behaviour unchanged, to the digit. The numbers below are the
 * PRE-RENAME engine's own output, captured on 260913 before any edit —
 * an equivalence oracle across the rename, not a hand-placed table. A
 * HALF-APPLIED rename fails here by construction: if figure.mjs stamps
 * `bed` but voices.mjs still branches on `strum`, the bed's durs stretch
 * under sustain ([0.5 ×4] becomes the line's [3.33…]) and the both-mode
 * row goes red naming it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFigure, figureEvents } from "../figure.mjs";
import { tetradPass, OPEN_MIDI } from "../tetrad-sequence.mjs";
import { voiceSchedule } from "../voices.mjs";

const CTX = () => {
  const pass = tetradPass({ key: "C", scaleType: "major", families: ["drop2"],
    setIndex: 0, prog: "cycle4", startDeg: 0, bottom: 0 });
  return { pass, step: pass.steps[0],
    ctx: { scalePcs: [0, 2, 4, 5, 7, 9, 11], tonicPc: 0, open: OPEN_MIDI,
      nfrets: 15, set: pass.set.strings } };
};
const round = (evs) => evs.map((e) => [e.midi, +e.onset.toFixed(4), +e.dur.toFixed(4), !!e.bed]);

test("the rename holds the sound still: strum / arpeggiated / both, same events same onsets", () => {
  const { step, ctx } = CTX();
  const p = parseFigure("1-2-3-4", "slots");
  const evs = (pb) => figureEvents(step, { parsed: p.pattern, address: "slots",
    playback: pb, durBeats: 4, bpm: 72, ctx });
  // pre-rename 260913 baselines, the engine's own output
  assert.deepEqual(round(evs("strum")),
    [[48, 0, 0.85, false], [55, 0.028, 0.85, false], [59, 0.056, 0.85, false], [64, 0.084, 0.85, false]]);
  assert.deepEqual(round(evs("arpeggiated")),
    [[48, 0, 0.9, false], [55, 0.8333, 0.9, false], [59, 1.6667, 0.9, false], [64, 2.5, 0.9, false]]);
  assert.deepEqual(round(evs("both")),
    [[48, 0, 0.5, true], [55, 0.028, 0.5, true], [59, 0.056, 0.5, true], [64, 0.084, 0.5, true],
     [48, 0, 0.9, false], [55, 0.8333, 0.9, false], [59, 1.6667, 0.9, false], [64, 2.5, 0.9, false]]);
  // the half-rename detector: sustain keeps the BED short and stretches the
  // line — a stamp/branch mismatch stretches all eight and dies here
  const sus = voiceSchedule(evs("both"), "sustain", 4, 72).map((e) => +e.dur.toFixed(4));
  assert.deepEqual(sus, [0.5, 0.5, 0.5, 0.5, 3.3333, 2.5, 1.6667, 0.8333]);
});

test("the old words are gone from the event stream: no ev.strum, and playback 'block' is not a mode", () => {
  const { step, ctx } = CTX();
  const p = parseFigure("1-2-3-4", "slots");
  const both = figureEvents(step, { parsed: p.pattern, address: "slots",
    playback: "both", durBeats: 4, bpm: 72, ctx });
  assert.ok(both.every((e) => !("strum" in e)),
    "an event still carries the OLD flag name — the rename is half-applied");
  assert.ok(both.some((e) => e.bed === true), "the bed flag must exist under its new name");
});
