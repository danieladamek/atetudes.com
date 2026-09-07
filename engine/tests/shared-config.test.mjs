/* shared-config.test.mjs — the family's shared config vocabulary (night 41, 261005) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHARED, CONCEPTS, isValid, readShared, checkShared, describeShared, offerOf, listOf, pcOfKey } from "../shared-config.mjs";

test("the vocabulary is the dispatch's seven concepts, in the summary's order", () => {
  assert.deepEqual(CONCEPTS, ["key", "scale", "progression", "startOn", "stringSet", "bpm", "meter"]);
  assert.deepEqual(Object.keys(SHARED.scale.values), ["major", "harm", "mel"], "the family's stored scale words");
  assert.deepEqual(Object.keys(SHARED.progression.values), ["scale", "thirds", "fourths", "fifths", "sixths"], "the door engine's cycle ids");
});

test("values are checked at the one definition: legal and illegal, per concept", () => {
  assert.ok(isValid("key", "F#") && isValid("key", "Bb") && !isValid("key", "H") && !isValid("key", "bb"));
  assert.ok(isValid("scale", "mel") && !isValid("scale", "Melodic Minor"));
  assert.ok(isValid("progression", "sixths") && !isValid("progression", "cycle4"), "a host's own word is mapped by the host, never accepted raw");
  assert.ok(isValid("startOn", 6) && !isValid("startOn", 7) && !isValid("startOn", "I"));
  assert.ok(isValid("stringSet", [2, 3, 4]) && isValid("stringSet", [6, 5, 4, 3]) && !isValid("stringSet", [7]) && !isValid("stringSet", [3, 3]) && !isValid("stringSet", []));
  assert.ok(isValid("bpm", 72) && !isValid("bpm", 10) && !isValid("bpm", "72"));
  assert.ok(isValid("meter", 7) && !isValid("meter", 0));
  assert.throws(() => checkShared({ key: "Bb", tempo: 72 }, "probe"), /probe mapped "tempo", which is not a shared concept/);
  assert.throws(() => checkShared({ bpm: "fast" }, "probe"), /probe mapped bpm to "fast", not a legal value/);
});

test("ADDITIVE: an entry from before the vocabulary reads as nothing shared; an illegal value is dropped, the rest read", () => {
  assert.deepEqual(readShared({ app: "triadetudes", v: 1, data: { key: "C", set: [1, 2, 3] } }), {});
  assert.deepEqual(readShared(null), {});
  assert.deepEqual(readShared({ shared: { key: "Eb", scale: "harm", tempo: 90, bpm: 5000 } }), { key: "Eb", scale: "harm" });
});

test("the summary sentence, and its parts when only some concepts are present", () => {
  assert.equal(describeShared({ key: "Bb", scale: "harm", progression: "fourths", startOn: 0, stringSet: [6, 5, 4, 3], bpm: 72, meter: 4 }),
    "Bb harmonic minor · Cycling 4ths · start on I · strings 6-5-4-3 · 72 bpm · 4/4");
  assert.equal(describeShared({ bpm: 120, meter: 3 }), "120 bpm · 3/4", "the metronome's entry");
  assert.equal(describeShared({ key: "G", bpm: 96 }), "G · 96 bpm", "the modes map's entry");
  assert.equal(describeShared({ stringSet: [3, 2, 1] }), "strings 3-2-1", "a set reads high → low as the family writes it");
  assert.equal(describeShared({}), "");
});

test("THE OFFER: full, partial (named, with reasons), and none — nothing is applied by building it", () => {
  const entry = { key: "Eb", scale: "harm", progression: "sixths", startOn: 2, stringSet: [2, 3, 4], bpm: 84, meter: 4 };
  const all = offerOf(entry, { canTake: () => true });
  assert.equal(all.wording, "apply the key, scale, progression, start-on, string set, bpm and meter from this note");
  assert.equal(all.withheldWording, "");
  assert.deepEqual(Object.keys(all.take), CONCEPTS);
  // the metronome: bpm and meter only
  const metro = offerOf(entry, { canTake: (c) => c === "bpm" || c === "meter" ? true : `the metronome has no ${SHARED[c].label}` });
  assert.equal(metro.wording, "apply the bpm and meter from this note");
  assert.equal(metro.withheldWording, "not offered: key — the metronome has no key; scale — the metronome has no scale; progression — the metronome has no progression; start-on — the metronome has no start-on; string set — the metronome has no string set");
  assert.deepEqual(metro.take, { bpm: 84, meter: 4 });
  // a door whose sets are four strings, offered a three-string set: the VALUE decides, and the reason names it
  const door = offerOf(entry, { canTake: (c, v) => c === "stringSet" ? (v.length === 4 ? true : `this door's sets are four strings; the entry's set has ${v.length}`) : true });
  assert.equal(door.wording, "apply the key, scale, progression, start-on, bpm and meter from this note");
  assert.equal(door.withheldWording, "not offered: string set — this door's sets are four strings; the entry's set has 3");
  // nothing applies: no wording, every reason
  const none = offerOf({ key: "C" }, { canTake: () => "this page has no settings" });
  assert.equal(none.wording, ""); assert.equal(none.withheldWording, "not offered: key — this page has no settings");
  // a host that declares nothing: every concept withheld with the standing reason
  assert.equal(offerOf({ bpm: 72 }, null).withheldWording, "not offered: bpm — this page carries no shared settings");
});

test("listOf and pcOfKey — the two small derivations the hosts lean on", () => {
  assert.equal(listOf(["key"]), "key"); assert.equal(listOf(["key", "scale"]), "key and scale"); assert.equal(listOf([]), "");
  assert.equal(pcOfKey("Gb"), 6); assert.equal(pcOfKey("F#"), 6); assert.equal(pcOfKey("Cb"), -1 + 0 === -1 ? -1 : pcOfKey("Cb"), "raw arithmetic — a host wraps mod 12");
});
