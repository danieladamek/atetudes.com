/* shared-config.test.mjs — the family's shared config vocabulary (night 41, 261005) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
import { describeTuning } from "../tunings.mjs";
import { TUNING_RANGE } from "../field.mjs";
import { SHARED, CONCEPTS, isValid, readShared, checkShared, describeShared, offerOf, listOf, pcOfKey } from "../shared-config.mjs";

test("the vocabulary is the dispatch's seven concepts plus TUNING (night 49, 261010), in the summary's order", () => {
  /* UPDATED 261010 (rule 7): the eighth concept is the tuning — an instrument fact, the .atchart
   * v1.2 key's own shape (offsets from standard by string number; standard travels as absence) */
  assert.deepEqual(CONCEPTS, ["key", "scale", "progression", "startOn", "stringSet", "tuning", "bpm", "meter"]);
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
  /* UPDATED 261010 (rule 7): the entry carries the eighth concept, a tuning (night 49) */
  const entry = { key: "Eb", scale: "harm", progression: "sixths", startOn: 2, stringSet: [2, 3, 4], tuning: { 6: -2 }, bpm: 84, meter: 4 };
  const all = offerOf(entry, { canTake: () => true });
  assert.equal(all.wording, "apply the key, scale, progression, start-on, string set, tuning, bpm and meter from this note");
  assert.equal(all.withheldWording, "");
  assert.deepEqual(Object.keys(all.take), CONCEPTS);
  // the metronome: bpm and meter only
  const metro = offerOf(entry, { canTake: (c) => c === "bpm" || c === "meter" ? true : `the metronome has no ${SHARED[c].label}` });
  assert.equal(metro.wording, "apply the bpm and meter from this note");
  assert.equal(metro.withheldWording, "not offered: key — the metronome has no key; scale — the metronome has no scale; progression — the metronome has no progression; start-on — the metronome has no start-on; string set — the metronome has no string set; tuning — the metronome has no tuning");
  assert.deepEqual(metro.take, { bpm: 84, meter: 4 });
  // a door whose sets are four strings, offered a three-string set: the VALUE decides, and the reason names it
  const door = offerOf(entry, { canTake: (c, v) => c === "stringSet" ? (v.length === 4 ? true : `this door's sets are four strings; the entry's set has ${v.length}`) : true });
  assert.equal(door.wording, "apply the key, scale, progression, start-on, tuning, bpm and meter from this note");
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

test("TUNING (night 49): legal is well-formed AND not standard; the vocabulary reads the moved strings, a host's namer reads the name", () => {
  assert.equal(isValid("tuning", { 6: -2 }), true, "drop D");
  assert.equal(isValid("tuning", { 6: -2, 2: -2, 1: -2 }), true, "DADGAD");
  assert.equal(isValid("tuning", {}), false, "standard travels as ABSENCE, never as an empty map");
  assert.equal(isValid("tuning", { 6: 0 }), false, "…nor as zeros");
  assert.equal(isValid("tuning", { 9: 1 }), false, "not a string"); assert.equal(isValid("tuning", { 6: -7 }), false, "outside the window");
  assert.equal(isValid("tuning", [6, -2]), false); assert.equal(isValid("tuning", "drop D"), false, "never a name");
  assert.equal(SHARED.tuning.describe({ 6: -2 }), "string 6 −2 from standard", "the vocabulary's own reading: the moved strings, no table");
  assert.equal(SHARED.tuning.describe({ 6: -1, 3: 1 }), "string 6 −1, string 3 +1 from standard");
  assert.equal(describeShared({ key: "D", scale: "major", tuning: { 6: -2, 2: -2, 1: -2 }, bpm: 80 }), "D major · string 6 −2, string 2 −2, string 1 −2 from standard · 80 bpm");
  // a host that carries the strip's namer hands it in — one table, one namer, reached
  const namer = { tuning: (v) => describeTuning(v) };
  assert.equal(describeShared({ key: "D", tuning: { 6: -2, 2: -2, 1: -2 } }, namer), "D · DADGAD");
  assert.equal(describeShared({ tuning: { 6: -4, 5: -2, 4: -2, 3: -2, 2: -2, 1: -2 } }, namer), "drop D, a whole step down");
  assert.equal(describeShared({ tuning: { 6: -1, 3: 1 } }, namer), "string 6 −1, string 3 +1 from standard", "an unnamed shape falls back to the vocabulary's reading");
  const o = offerOf({ key: "D", tuning: { 6: -2 } }, { canTake: (c) => c === "key" ? true : "this door keeps standard tuning — its tuning control is a later item" });
  assert.equal(o.wording, "apply the key from this note"); assert.equal(o.withheldWording, "not offered: tuning — this door keeps standard tuning — its tuning control is a later item");
  // A LEAF, and its one restated number pinned: the window equals field.mjs's TUNING_RANGE
  const src = readFileSync(join(here, "..", "shared-config.mjs"), "utf8");
  assert.ok(!/^import /m.test(src), "shared-config.mjs imports nothing — hand pages inline it, scribe reaches it");
  assert.ok(!/DADGAD|drop D|open G/.test(src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")), "…and spells no tuning name of its own");
  const m = src.match(/const TUNING_RANGE = (\d+);/);
  assert.ok(m && Number(m[1]) === TUNING_RANGE, `the window restated in the leaf (${m && m[1]}) must equal field.mjs's TUNING_RANGE (${TUNING_RANGE})`);
});
