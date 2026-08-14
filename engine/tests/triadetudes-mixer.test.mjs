/* triadetudes-mixer.test.mjs — the mixer (v0.8.7): two levels, one mute.
 *
 * The item's contracts, stated in the test (grep assertions are comment-blind,
 * so every source pin below targets a code string, and the state assertions run
 * against the harvested engine):
 *   - two levels — triads · bass — each a gain node on an EXISTING path;
 *   - NO click level: st.clickVol keeps its single control in the Metronome card;
 *   - mute chords and the triads level are ONE piece of state (st.triadVol;
 *     the checkbox is a rendered view of triadVol===0, st.metroOnly is gone);
 *   - levels serialize in rawCfg with ?? unity defaults, the noteVoice pattern —
 *     a gain of 1 is transparent, so pre-mixer entries restore and sound
 *     identical (the functional restore is exercised in the Playwright pass).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadTriadetudesEngine } from "./_load-triadetudes.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(
  join(here, "..", "..", "static", "studies", "triadetudes", "study.html"), "utf8");
const e = loadTriadetudesEngine();

test("two levels with unity defaults — the buses are transparent until touched", () => {
  assert.equal(e.st.triadVol, 1, "triads level defaults to unity");
  assert.equal(e.st.bassVol, 1, "bass level defaults to unity");
});

test("mute chords IS the triads level at zero — one piece of state, not two", () => {
  assert.equal(e.st.metroOnly, undefined,
    "st.metroOnly is gone — the checkbox is a view of the level, not a second state");
  assert.ok(!SRC.includes("metroOnly"),
    "no metroOnly anywhere in the study — code or comment");
  assert.ok(SRC.includes("m.checked=st.triadVol===0"),
    "the checkbox renders triadVol===0 — it never stores its own truth");
  assert.ok(SRC.includes("st.triadVol=0;"),
    "checking the box writes the level, nothing else");
});

test("each level is a gain node on an existing path, not a new graph", () => {
  assert.equal((SRC.match(/\.connect\(triadBus\(ac\)\)/g) || []).length, 3,
    "every NOTE_VOICES chain (tone, pluck, sustain) terminates at the triad bus");
  assert.equal((SRC.match(/\.connect\(bassBus\(ac\)\)/g) || []).length, 1,
    "BASS_VOICE terminates at the bass bus");
  // the only direct destination connects left: the click, and the two buses
  assert.equal((SRC.match(/connect\(ac\.destination\)/g) || []).length, 3,
    "destination is reached exactly thrice: click, TRIAD_BUS, BASS_BUS");
});

test("no click level is added — clickVol keeps its one control, in the Metronome card", () => {
  assert.equal((SRC.match(/id="clickVolR"/g) || []).length, 1,
    "exactly one click volume control on the page");
  assert.equal((SRC.match(/id="triadVolR"/g) || []).length, 1);
  assert.equal((SRC.match(/id="bassVolR"/g) || []).length, 1);
  assert.ok(!SRC.includes("clickVol*st.triadVol") && !SRC.includes("clickVol*st.bassVol"),
    "the click never routes through a mixer level");
});

test("levels serialize with the noteVoice/clickVoice ?? pattern — unity for pre-mixer entries", () => {
  assert.ok(SRC.includes("triadVol:st.triadVol,bassVol:st.bassVol"),
    "rawCfg emits both levels");
  assert.ok(SRC.includes("triadVol:c.triadVol??1,bassVol:c.bassVol??1"),
    "applyRaw restores with ?? unity — pre-mixer entries sound identical");
});
