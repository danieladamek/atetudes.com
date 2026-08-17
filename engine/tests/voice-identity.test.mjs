/* voice-identity.test.mjs — the stable voice key, at arity 3 and 4.
 *
 * The four cases below are the item's specification, and they are where a naive
 * key breaks. Two of them are asserted DIFFERENTIALLY — the test also shows what
 * the naive key would have done — because "the keys are correct" is a weak
 * claim next to "the obvious alternative is provably wrong here".
 *
 * Everything is arity-generic: each case runs at 3 and 4 voices, since this is
 * family infrastructure and not a Tetradetudes feature.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  voiceKey, keysOf, matchVoices, transitions, octaveLeap, holding, voiceLines,
  DEFAULT_CHANNEL,
} from "../voice-identity.mjs";
import { parseChord } from "../chord.mjs";
import { tetradCandidates } from "../tetrad-voicings.mjs";

/** a note on channel `slot` — the shape every engine voicing carries */
const note = (slot, midi) => ({ slot, midi, fret: midi - 40, string: 6 - slot });
const voicing = (...pairs) => pairs.map(([s, m]) => note(s, m));

/** THE NAIVE KEY the module exists to avoid: identity by rank in pitch order */
const naiveKeys = (notes) =>
  [...notes].sort((a, b) => a.midi - b.midi).map((_, i) => "v" + i);

const ARITIES = [3, 4];
const grip = (arity, base) => voicing(...Array.from({ length: arity }, (_, i) => [i, base + i * 4]));

/* ================= the key itself ================= */

test("the key is DERIVED — a pure function of one note, with no state anywhere", () => {
  const n = note(2, 60);
  assert.equal(voiceKey(n), "v2");
  assert.equal(voiceKey(n), voiceKey(n), "the same note must yield the same key, always");
  // a structurally identical note made independently gets the same key: there
  // is no registry, no counter, and nothing to persist
  assert.equal(voiceKey({ ...n }), "v2");
  assert.equal(voiceKey(note(2, 99)), "v2", "the key is the channel, not the pitch");
});

test("a note with no channel is refused by name rather than keyed as undefined", () => {
  assert.throws(() => voiceKey({ midi: 60 }), /has no channel/);
  assert.throws(() => voiceKey({ midi: 60, slot: null }), /has no channel/);
  // and a consumer whose material is not strings says so
  assert.equal(voiceKey({ midi: 60, degree: "b3" }, (n) => n.degree), "vb3");
});

test("identities within a voicing must be distinct — a collision would drop a dot silently", () => {
  assert.throws(() => keysOf(voicing([1, 60], [1, 64])), /share the channel/);
});

/* ================= case 1: a holding voice keeps its key ================= */

for (const arity of ARITIES)
  test(`case 1 — a HOLDING voice keeps its key across the change (arity ${arity})`, () => {
    const before = grip(arity, 52);
    // one voice holds, the rest move
    const after = before.map((n, i) => ({ ...n, midi: i === 1 ? n.midi : n.midi + 3 }));

    const ts = transitions(before, after);
    assert.equal(ts.length, arity, "every voice accounted for");
    const held = ts.find((t) => t.kind === "hold");
    assert.ok(held, "the holding voice was not classified as holding");
    assert.equal(held.key, "v1");
    assert.equal(held.semitones, 0);
    assert.equal(held.from.midi, held.to.midi, "a hold is the same pitch, not merely a small move");

    // the whole point: the same key before and after, so the DOM node survives
    assert.ok(keysOf(before).includes(held.key));
    assert.ok(keysOf(after).includes(held.key));
    assert.deepEqual(holding(before, after).map((t) => t.key), ["v1"]);
  });

/* ================= case 2: a moving voice keeps its key ================= */

for (const arity of ARITIES)
  test(`case 2 — a MOVING voice keeps its key while its position changes (arity ${arity})`, () => {
    const before = grip(arity, 52);
    const after = before.map((n) => ({ ...n, midi: n.midi + 2, fret: n.fret + 2 }));

    const ts = transitions(before, after);
    assert.deepEqual(ts.map((t) => t.key), keysOf(before), "keys survived the move, in order");
    for (const t of ts) {
      assert.equal(t.kind, "move");
      assert.equal(t.semitones, 2);
      assert.notEqual(t.from.fret, t.to.fret, "the position changed");
    }
  });

/* ================= case 3: voice crossing ================= */

for (const arity of ARITIES)
  test(`case 3 — CROSSING: two voices that swap order must NOT swap identity (arity ${arity})`, () => {
    // v0 climbs above v1; their pitch ORDER inverts, their channels do not
    const before = grip(arity, 52);
    const after = before.map((n, i) =>
      i === 0 ? { ...n, midi: n.midi + 9 } : i === 1 ? { ...n, midi: n.midi - 3 } : { ...n });

    assert.ok(before[0].midi < before[1].midi, "setup: v0 starts below v1");
    assert.ok(after[0].midi > after[1].midi, "setup: v0 ends above v1 — they crossed");

    const ts = transitions(before, after);
    const v0 = ts.find((t) => t.key === "v0");
    const v1 = ts.find((t) => t.key === "v1");

    // identity followed the CHANNEL: each voice's own movement, not the other's
    assert.equal(v0.semitones, 9, "v0 must own its own movement");
    assert.equal(v1.semitones, -3, "v1 must own its own movement");
    assert.equal(v0.from.midi, before[0].midi);
    assert.equal(v0.to.midi, after[0].midi);

    // the crossing is real: v0's rank in pitch order genuinely changed
    const rankOf = (notes, n) => [...notes].sort((a, b) => a.midi - b.midi).indexOf(n);
    assert.notEqual(rankOf(before, before[0]), rankOf(after, after[0]),
      "if pitch rank did not change, this test is not exercising a crossing at all");

    // DIFFERENTIAL, and this is the harm: a pitch-rank key pairs rank i to
    // rank i, so it does not merely relabel the dots — it MISREPORTS THE MUSIC.
    // Here it reports every voice shuffling a little, when what happened is one
    // voice leaping up 9 semitones and another falling 3.
    const sorted = (notes) => [...notes].sort((a, b) => a.midi - b.midi);
    const naiveMoves = sorted(after).map((n, i) => n.midi - sorted(before)[i].midi);
    const trueMoves = ts.map((t) => t.semitones);
    assert.notDeepEqual(naiveMoves, trueMoves,
      "the naive key agrees here, so this fixture does not demonstrate the defect");
    assert.ok(!naiveMoves.includes(9),
      "the naive key should have lost the 9-semitone leap entirely — that is the point");
    assert.ok(trueMoves.includes(9) && trueMoves.includes(-3),
      "the channel key must report both real movements");

    // and the breakage is INVISIBLE: both key sets are identical either way,
    // so nothing errors and every dot still renders
    assert.deepEqual(naiveKeys(before), naiveKeys(after),
      "both key sets exist either way — that is why this fails silently");
  });

test("crossing is real in this codebase, not hypothetical: channel order ≠ pitch order", () => {
  // isolation.mjs's lineVoicing sorts notes by midi and takes slot from the
  // string's set-position, so a low string fretted high diverges the two
  const notes = [
    { slot: 2, midi: 60, string: 4, fret: 10 },   // low string, high fret
    { slot: 0, midi: 64, string: 6, fret: 12 },
    { slot: 1, midi: 67, string: 5, fret: 13 },
  ];
  const byPitch = [...notes].sort((a, b) => a.midi - b.midi).map((n) => voiceKey(n));
  assert.notDeepEqual(byPitch, ["v0", "v1", "v2"],
    "pitch order and channel order coincide here — pick a harder fixture");
  assert.deepEqual(new Set(byPitch), new Set(["v0", "v1", "v2"]), "same voices, different order");
});

/* ================= case 4: the octave leap ================= */

for (const arity of ARITIES)
  test(`case 4 — the OCTAVE LEAP is ONE event, and every voice keeps its key (arity ${arity})`, () => {
    const before = grip(arity, 52);
    const after = before.map((n) => ({ ...n, midi: n.midi + 12, fret: n.fret + 12 }));

    const ts = transitions(before, after);
    assert.equal(ts.length, arity, "every voice survived the leap");
    assert.deepEqual(ts.map((t) => t.key), keysOf(before), "every key survived the leap");
    for (const t of ts) assert.equal(t.semitones, 12);

    // ONE event, which is what lets the narrator say one thing instead of four
    const leap = octaveLeap(before, after);
    assert.equal(leap.leapt, true);
    assert.equal(leap.octaves, 1);
    assert.equal(leap.semitones, 12);

    // downward too
    const down = octaveLeap(before, before.map((n) => ({ ...n, midi: n.midi - 12 })));
    assert.equal(down.leapt, true);
    assert.equal(down.octaves, -1);
  });

test("an octave leap is a property of the WHOLE grip — near misses are not one event", () => {
  const before = grip(4, 52);
  // one voice stays put: three leapt, so this is not a grip jump
  const partial = before.map((n, i) => (i === 0 ? { ...n } : { ...n, midi: n.midi + 12 }));
  assert.equal(octaveLeap(before, partial).leapt, false, "a partial jump is not one event");

  // voices move by different octaves
  const uneven = before.map((n, i) => ({ ...n, midi: n.midi + (i === 0 ? 24 : 12) }));
  assert.equal(octaveLeap(before, uneven).leapt, false, "different distances are not one event");

  // ordinary voice-leading that happens to average an octave is not a leap
  const noisy = before.map((n, i) => ({ ...n, midi: n.midi + (i % 2 ? 11 : 13) }));
  assert.equal(octaveLeap(before, noisy).leapt, false, "non-octave motion is not a leap");

  // and a voicing that does not move at all is not a leap either
  assert.equal(octaveLeap(before, before.map((n) => ({ ...n }))).leapt, false);
});

/* ================= correspondence, holes and sequences ================= */

test("a change of channel set is REPORTED, not silently paired by position", () => {
  const before = voicing([0, 52], [1, 56], [2, 59]);
  const after = voicing([0, 52], [1, 56], [3, 59]);      // v2 left, v3 entered

  const m = matchVoices(before, after);
  assert.deepEqual(m.paired.map((p) => p.key), ["v0", "v1"]);
  assert.deepEqual(m.left.map((p) => p.key), ["v2"]);
  assert.deepEqual(m.entered.map((p) => p.key), ["v3"]);

  // transitions refuses it by name rather than describing 2 of 3 voices —
  // a transition list with holes under-reports exactly the way a shorter
  // voicing under-reported its cost (Update Log 260817.3)
  assert.throws(() => transitions(before, after), /do not share a channel set/);
});

test("voiceLines gives one row per voice — a DOM node's whole life — and keeps holes visible", () => {
  const a = grip(4, 52), b = grip(4, 55), c = grip(4, 57);
  const lines = voiceLines([a, null, b, c]);
  assert.equal(lines.length, 4, "one row per voice");
  assert.deepEqual(lines.map((l) => l.key), ["v0", "v1", "v2", "v3"]);
  for (const l of lines) {
    assert.equal(l.notes.length, 4, "one entry per step, holes included");
    assert.equal(l.notes[1], null, "an unvoiced chord stays a hole rather than shortening the line");
  }
  assert.equal(lines[0].notes[0].midi, a[0].midi);
  assert.equal(lines[3].notes[3].midi, c[3].midi);
});

test("voiceLines refuses a mid-sequence channel change instead of gliding across it", () => {
  const a = voicing([0, 52], [1, 56]);
  const b = voicing([0, 52], [2, 56]);
  assert.throws(() => voiceLines([a, b]), /channel set changes mid-sequence/);
});

/* ================= it is family infrastructure ================= */

test("arity 3 and arity 4 are the same code path — nothing here counts voices", () => {
  for (const arity of [1, 2, 3, 4, 5, 6]) {
    const before = grip(arity, 52);
    const after = before.map((n) => ({ ...n, midi: n.midi + 12 }));
    assert.equal(transitions(before, after).length, arity);
    assert.equal(octaveLeap(before, after).leapt, true, `arity ${arity} lost the leap`);
    assert.equal(keysOf(before).length, arity);
  }
});

test("it keys REAL voicings from the tetrad generator, not only hand-built fixtures", () => {
  const set = [40, 45, 50, 55], strings = [6, 5, 4, 3];
  const cmaj7 = tetradCandidates(parseChord("Cmaj7"), { set, nfrets: 16, strings })[0];
  const fmaj7 = tetradCandidates(parseChord("Fmaj7"), { set, nfrets: 16, strings })[0];

  assert.deepEqual(keysOf(cmaj7), ["v0", "v1", "v2", "v3"]);
  const ts = transitions(cmaj7, fmaj7);
  assert.equal(ts.length, 4);
  for (const t of ts) {
    assert.ok(Number.isFinite(t.semitones));
    assert.ok(["hold", "move"].includes(t.kind));
  }
  // the accessor default matches what the generator actually emits
  assert.equal(DEFAULT_CHANNEL(cmaj7.notes[2]), 2);
});

test("no shared mutable state (§4.2.3): keying one voicing cannot affect another", () => {
  const a = grip(4, 52), b = grip(4, 52);
  const beforeJson = JSON.stringify(a);
  transitions(a, b);
  keysOf(a);
  voiceLines([a, b]);
  octaveLeap(a, b.map((n) => ({ ...n, midi: n.midi + 12 })));
  assert.equal(JSON.stringify(a), beforeJson, "an input voicing was mutated");

  // and the module holds nothing between calls: an independent realm-free check
  const first = transitions(a, b).map((t) => t.key);
  const second = transitions(a, b).map((t) => t.key);
  assert.deepEqual(first, second);
});
