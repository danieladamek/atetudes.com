/* figure.test.mjs — the figure chain, driven headlessly end to end.
 *
 * Every stage is an existing seam; this asserts the COMPOSITION: figure text
 * → order → events, in both address modes, with and without enclosures, under
 * all three playback modes — and that mistakes fail loudly with a message
 * (audit A3), never silently or with a throw on user text.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  SLOT_MATERIAL, TONE_MATERIAL, TONE_ORDER, SLOT_ORDER, ADDRESS, toneIndexOf, parseFigure, orderFigure,
  figureEvents, describeFigure,
} from "../figure.mjs";
import { tetradPass } from "../tetrad-sequence.mjs";
import { OPEN_MIDI } from "../field.mjs";
import { scaleNotes } from "../chord.mjs";
import { noteEvents } from "../note-events.mjs";
import { parsePattern } from "../drill.mjs";

const pass = tetradPass({ key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0, placement: "grip" });
const step0 = pass.steps[0];                          // Cmaj7 drop-2, root pos.
const ctx = { scalePcs: scaleNotes("C", "major").map((n) => n.pc), tonicPc: 0,
  open: OPEN_MIDI, nfrets: 15, set: pass.set.strings };
const pc = (n) => ((n % 12) + 12) % 12;

/* ================= the two materials ================= */

test("the two materials go through drill.material() — the parser is not forked", () => {
  assert.deepEqual(new Set(SLOT_MATERIAL.keys), new Set(["1", "2", "3", "4"]));
  assert.deepEqual(new Set(TONE_MATERIAL.keys), new Set(["R", "3", "5", "7"]));
  // the runtime orders integer-like keys first, so the stated order is a
  // separate, asserted fact — what a picker lists and prose prints
  assert.deepEqual(TONE_ORDER, ["R", "3", "5", "7"]);
  assert.deepEqual(SLOT_ORDER, ["1", "2", "3", "4"]);
  // both address the same four values 0..3 — the toggle changes MEANING, not arity
  assert.deepEqual(SLOT_MATERIAL.values, TONE_MATERIAL.values);
  // and drill's own parsePattern is what parseFigure calls for bare figures
  assert.deepEqual(parseFigure("4-3-2-1", "slots").pattern, parsePattern("4-3-2-1", SLOT_MATERIAL).pattern);
});

test("toneIndexOf reads the ROLE from the chord's own intervals, never from note order", () => {
  // drop-2 root position is R-5-7-3 by pitch: the tone index must say so
  const roles = step0.voicing.notes.map((n) => toneIndexOf(n, step0.chord));
  assert.deepEqual(roles, [0, 2, 3, 1], "drop-2 root pos. is R 5 7 3 low→high");
  // and it holds on every step of the pass, whatever the inversion did
  for (const s of pass.steps) {
    const set = new Set(s.voicing.notes.map((n) => toneIndexOf(n, s.chord)));
    assert.deepEqual(set, new Set([0, 1, 2, 3]), `${s.symbol}: a tetrad voicing holds all four roles`);
  }
});

/* ================= slots repeat a SHAPE, tones follow the HARMONY ================= */

test("SLOTS: 1-2-3-4 is the voicing's own notes low→high, on every step", () => {
  const p = parseFigure("1-2-3-4", "slots").pattern;
  for (const s of pass.steps) {
    const order = orderFigure(p, s, "slots");
    assert.deepEqual(order.map((n) => n.midi), s.voicing.notes.map((n) => n.midi));
  }
});

test("TONES: R-3-7-5 picks by ROLE, so the same figure lands on different slots as the inversion changes", () => {
  const p = parseFigure("R-3-7-5", "tones").pattern;
  const slotPaths = pass.steps.map((s) => orderFigure(p, s, "tones").map((n) => n.slot).join(""));
  // the roles are always R 3 7 5 …
  for (const s of pass.steps) {
    const order = orderFigure(p, s, "tones");
    assert.deepEqual(order.map((n) => toneIndexOf(n, s.chord)), [0, 1, 3, 2], `${s.symbol}`);
  }
  // … but the SLOTS they occupy differ across the pass — that is "follows the harmony through the shape"
  assert.ok(new Set(slotPaths).size > 1, `a tone figure landed on the same slots every step: ${slotPaths}`);
});

test("the guide-tone figure 3-7-3-7 is the guide tones whatever the inversion did", () => {
  const p = parseFigure("3-7-3-7", "tones").pattern;
  for (const s of pass.steps) {
    const midis = orderFigure(p, s, "tones").map((n) => pc(n.midi));
    const third = pc(s.chord.root.pc + s.chord.intervals[1]);
    const seventh = pc(s.chord.root.pc + s.chord.intervals[3]);
    assert.deepEqual(midis, [third, seventh, third, seventh], `${s.symbol}`);
  }
});

/* ================= enclosures, through motion.mjs ================= */

test("ENCLOSURES route through motion.mjs and come back role-tagged: (-1,+2)3 lands the 3rd", () => {
  const r = parseFigure("(-1,+2)3 7", "tones");
  assert.equal(r.err, null); assert.equal(r.source, "motion");
  const order = orderFigure(r.pattern, step0, "tones", ctx);
  const roles = order.map((e) => e.role);
  assert.deepEqual(roles, ["approach", "approach", "chord", "chord"]);
  const target = order[2];
  assert.equal(pc(target.midi), pc(step0.chord.root.pc + 4), "the target is the 3rd");
  assert.equal(order[0].midi, target.midi - 1, "the first approach is a semitone below");
  assert.equal(order[1].midi, target.midi + 2, "the second is a whole tone above");
  // and every approach is a playable position on the set
  for (const e of order) assert.ok(pass.set.strings.includes(e.string) && e.fret >= 0);
});

test("a bare tone figure never touches motion; an enclosure never touches drill — the router is asserted", () => {
  assert.equal(parseFigure("3-7", "tones").source, "drill");
  assert.equal(parseFigure("(-1,+2)3", "tones").source, "motion");
  assert.equal(parseFigure("1-2", "slots").source, "drill");
  // slots + parens is not a thing: motion's shape mode is three-slot and pinned;
  // the figure is treated as drill text and drill refuses the parens loudly
  const r = parseFigure("(-1,+2)1-2", "slots");
  assert.ok(r.err || r.pattern, "slots with parens must resolve to SOMETHING definite");
});

/* ================= events: the figure IS the rhythm ================= */

/* PIN REWRITTEN 260913 (item 2, the vocabulary ruling): playback "block"
 * is "strum" now, and the both-mode harmony context is the BED (ev.bed —
 * the strum word went to the movement). Same assertions, same numbers;
 * only the ruled words moved. */
test("figureEvents composes noteEvents: strum ignores the figure, arpeggiated is the line, both is line over the bed", () => {
  const p = parseFigure("1-2-3-4", "slots").pattern;
  const block = figureEvents(step0, { parsed: p, address: "slots", playback: "strum", durBeats: 2, bpm: 72 });
  assert.deepEqual(block, noteEvents(step0.voicing, null, null, 2, 72), "strum must be the plain whole-harmony attack");
  const arp = figureEvents(step0, { parsed: p, address: "slots", playback: "arpeggiated", durBeats: 2, bpm: 72 });
  assert.equal(arp.length, 4);
  const onsets = arp.map((e) => e.onset);
  assert.ok(onsets.every((o, i) => i === 0 || o > onsets[i - 1]), "a line's onsets ascend");
  assert.ok(Math.abs(onsets[1] - onsets[0] - (2 * 60 / 72) / 4) < 1e-9, "four steps divide two beats evenly");
  const both = figureEvents(step0, { parsed: p, address: "slots", playback: "both", durBeats: 2, bpm: 72 });
  assert.equal(both.filter((e) => e.bed).length, 4, "both carries the harmony bed…");
  assert.equal(both.filter((e) => !e.bed).length, 4, "…and the line");
  assert.ok(both.filter((e) => e.bed).every((e) => e.dur <= 0.5), "the bed is short");
});

test("no figure = block, whatever playback says — an empty field is a legitimate state, not an error", () => {
  const r = parseFigure("", "slots");
  assert.equal(r.err, null); assert.equal(r.pattern, null);
  const ev = figureEvents(step0, { parsed: null, playback: "arpeggiated" });
  assert.deepEqual(ev, noteEvents(step0.voicing, null, null, 2, 72));
});

test("the bass pedal rides along in every playback mode", () => {
  const p = parseFigure("R-3-7-5", "tones").pattern;
  for (const playback of ["block", "arpeggiated", "both"]) {
    const ev = figureEvents(step0, { parsed: p, address: "tones", playback, bassMidi: 36 });
    assert.equal(ev.filter((e) => e.role === "bass").length, 1, playback);
  }
});

/* ================= failing LOUDLY (audit A3) ================= */

test("mistakes fail with a MESSAGE, never a throw and never silence", () => {
  const cases = [
    ["1-2-9", "slots", /slot 9 isn't in/],
    ["R-3-6", "tones", /tone 6 isn't in/],
    ["1-2-3-4-1-2-3-4-1-2-3-4-1-2-3-4-1", "slots", /max 16 notes/],
    ["(-1,+2)", "tones", /./],                       // an enclosure with no target
    ["(-1,+2)3", "slots", /./],                      // parens in slot mode
  ];
  for (const [text, address, re] of cases) {
    const r = parseFigure(text, address);
    assert.ok(r.err && re.test(r.err), `${text} (${address}) → ${JSON.stringify(r)}`);
    assert.equal(r.pattern, null);
  }
});

test("describeFigure round-trips the words the user typed", () => {
  assert.equal(describeFigure(parseFigure("4-3-2-1", "slots").pattern, "slots"), "4-3-2-1");
  assert.equal(describeFigure(parseFigure("R 3 7 5", "tones").pattern, "tones"), "R-3-7-5");
  assert.ok(describeFigure(parseFigure("(-1,+2)3 7", "tones").pattern, "tones").length > 0);
});

/* ================= named by role ================= */

test("nothing in figure.mjs is named after the app it came from", () => {
  const src = readFileSync(new URL("../figure.mjs", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  for (const w of ["Triadetudes", "Tetradetudes", "triad", "tetrad-", "fretboard"])
    assert.ok(!src.includes(w), `"${w}" in figure.mjs code`);
});

/* ================= role vocabulary vs motion's interval grammar ================= */

test("a tone ENCLOSURE resolves on EVERY chord quality — role 7 is the chord's own seventh", () => {
  /* Regression: "(-1,+2)3 7" reads on Cmaj7 but motion.mjs's `[7]` is the MAJOR
   * seventh and it refuses a minor-seventh chord — so on m7/7 chords the resolve
   * threw, and a swallowed throw rendered them as block chords. "Looks right,
   * sounds wrong." figure.mjs now respells the role to the chord's actual
   * interval per step, derived from the chord's own intervals. */
  const r = parseFigure("(-1,+2)3 7", "tones");
  assert.equal(r.err, null);
  for (const s of pass.steps) {
    const order = orderFigure(r.pattern, s, "tones", ctx);
    assert.equal(order.length, 4, `${s.symbol}: the enclosure did not resolve`);
    const chordTones = order.filter((e) => e.role === "chord");
    const third = pc(s.chord.root.pc + s.chord.intervals[1]);
    const seventh = pc(s.chord.root.pc + s.chord.intervals[3]);
    assert.equal(pc(chordTones[0].midi), third, `${s.symbol}: target is not the 3rd`);
    assert.equal(pc(chordTones[1].midi), seventh, `${s.symbol}: target is not the 7th (whatever quality)`);
  }
});

test("figureEvents NEVER silently falls back to block when a figure was asked for", () => {
  // a tone figure that resolves must return the LINE, not the strum, on every
  // step — the block fallback is only for "no figure", never for "figure that
  // threw", which is what hid the bug above
  const r = parseFigure("R-3-7-5", "tones");
  for (const s of pass.steps) {
    const ev = figureEvents(s, { parsed: r.pattern, address: "tones", playback: "arpeggiated", ctx });
    const onsets = ev.filter((e) => e.role !== "bass").map((e) => e.onset);
    assert.ok(new Set(onsets).size === 4, `${s.symbol}: not four distinct onsets — fell back to a block`);
  }
});
