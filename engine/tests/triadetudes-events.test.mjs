/* triadetudes-events.test.mjs — v0.7 phase 2: the note-event refactor's pin.
 *
 * The GOLDEN lists below were generated from the PRE-refactor composition
 * (orderedNotes + arpOnsets, which is what every renderer consumed) on
 * Daniel's pivot configuration, then frozen. The refactor's single producer
 * must reproduce them number for number — [midi, string, fret, role, onset,
 * dur] — across placements and playbacks. The visual renderers now consume
 * this same list, so this pin covers their onset and subdivision arithmetic;
 * the byte-level DOM diff ran in the build session on top of it.
 */
// 260926 (night 32, rule 7): the golden configurations say "strum" — the 260913 word, reaching triadetudes
// thirteen days late; the compositions are unchanged, because a strum IS what block always sounded.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";
import { preHubCarriersOf } from "./_carriers.mjs";

const GOLDEN = [[[[40, null, null, "bass", 0, 1], [64, 2, 5, "chord", 0, 0.666667], [60, 3, 5, "chord", 0.416667, 0.666667], [60, 3, 5, "chord", 0.833333, 0.666667], [67, 1, 3, "chord", 1.25, 0.666667]], [[41, null, null, "bass", 0, 1], [65, 2, 6, "chord", 0, 0.666667], [60, 3, 5, "chord", 0.416667, 0.666667], [60, 3, 5, "chord", 0.833333, 0.666667], [69, 1, 5, "chord", 1.25, 0.666667]], [[42, null, null, "bass", 0, 1], [65, 2, 6, "chord", 0, 0.666667], [62, 3, 7, "chord", 0.416667, 0.666667], [62, 3, 7, "chord", 0.833333, 0.666667], [71, 1, 7, "chord", 1.25, 0.666667]]], [[[40, null, null, "bass", 0, 1], [60, 3, 5, "chord", 0, 0.85], [64, 2, 5, "chord", 0.028, 0.85], [67, 1, 3, "chord", 0.056, 0.85]], [[41, null, null, "bass", 0, 1], [60, 3, 5, "chord", 0, 0.85], [65, 2, 6, "chord", 0.028, 0.85], [69, 1, 5, "chord", 0.056, 0.85]], [[42, null, null, "bass", 0, 1], [62, 3, 7, "chord", 0, 0.85], [65, 2, 6, "chord", 0.028, 0.85], [71, 1, 7, "chord", 0.056, 0.85]]], [[[40, null, null, "bass", 0, 1], [64, 2, 5, "chord", 0, 0.9], [60, 3, 5, "chord", 0.833333, 0.9], [67, 1, 3, "chord", 1.666667, 0.9]], [[41, null, null, "bass", 0, 1], [65, 2, 6, "chord", 0, 0.9], [60, 3, 5, "chord", 0.833333, 0.9], [69, 1, 5, "chord", 1.666667, 0.9]], [[42, null, null, "bass", 0, 1], [65, 2, 6, "chord", 0, 0.9], [62, 3, 7, "chord", 0.833333, 0.9], [71, 1, 7, "chord", 1.666667, 0.9]]], [[[40, null, null, "bass", 0, 1], [60, 3, 5, "chord", 0, 0.888889], [64, 2, 5, "chord", 0.555556, 0.888889], [67, 2, 8, "chord", 1.111111, 0.888889]], [[41, null, null, "bass", 0, 1], [60, 3, 5, "chord", 0, 0.888889], [65, 2, 6, "chord", 0.555556, 0.888889], [69, 1, 5, "chord", 1.111111, 0.888889]], [[42, null, null, "bass", 0, 1], [62, 3, 7, "chord", 0, 0.888889], [65, 2, 6, "chord", 0.555556, 0.888889], [71, 1, 7, "chord", 1.111111, 0.888889]]], [[[40, null, null, "bass", 0, 1], [60, 3, 5, "chord", 0, 0.85], [64, 2, 5, "chord", 0.028, 0.85], [67, 2, 8, "chord", 0.056, 0.85]], [[41, null, null, "bass", 0, 1], [60, 3, 5, "chord", 0, 0.85], [65, 2, 6, "chord", 0.028, 0.85], [69, 1, 5, "chord", 0.056, 0.85]], [[42, null, null, "bass", 0, 1], [62, 3, 7, "chord", 0, 0.85], [65, 2, 6, "chord", 0.028, 0.85], [71, 1, 7, "chord", 0.056, 0.85]]], [[[40, null, null, "bass", 0, 1], [60, 3, 5, "chord", 0, 0.85], [64, 2, 5, "chord", 0.028, 0.85], [67, 1, 3, "chord", 0.056, 0.85]], [[41, null, null, "bass", 0, 1], [60, 3, 5, "chord", 0, 0.85], [65, 2, 6, "chord", 0.028, 0.85], [69, 1, 5, "chord", 0.056, 0.85]], [[42, null, null, "bass", 0, 1], [62, 3, 7, "chord", 0, 0.85], [65, 2, 6, "chord", 0.028, 0.85], [71, 1, 7, "chord", 0.056, 0.85]]]];

const CONFIGS = [
  { placement: "grip", playback: "arpeggiated", pattern: [2, 3, 3, 1], durBeats: 2 },
  { placement: "grip", playback: "strum", pattern: [2, 3, 3, 1], durBeats: 2 },
  { placement: "free", playback: "arpeggiated", pattern: [2, 3, 1], durBeats: 3 },
  { placement: "line", playback: "arpeggiated", pattern: null, durBeats: 2 },
  { placement: "line", playback: "strum", pattern: null, durBeats: 2 },
  { placement: "grip", playback: "arpeggiated", pattern: null, durBeats: 2 },
];

test("golden event lists: the producer reproduces the pre-refactor composition exactly", () => {
  const e = loadTriadetudesEngine();
  e.st.pivotString = 2; e.st.pivotFrets = [5, 6, 8];
  CONFIGS.forEach((c, ci) => {
    e.st.placement = c.placement; e.st.playback = c.playback; e.st.arpPattern = c.pattern;
    const voic = e.chooseVoicings(e.buildSequence());
    for (let i = 0; i < 3; i++) {
      const order = e.orderedNotes(voic[i]);
      const evs = unwrap(e.arpOnsets(voic[i], order, 40 + i, c.durBeats, 72));
      const got = evs.map((ev) => [ev.midi, ev.string, ev.fret, ev.role,
        +ev.onset.toFixed(6), +ev.dur.toFixed(6)]);
      assert.deepEqual(got, GOLDEN[ci][i],
        `config ${ci} (${c.placement}/${c.playback}) chord ${i}`);
    }
  });
  e.st.placement = "grip"; e.st.playback = "arpeggiated"; e.st.arpPattern = null;
});

test("every event carries the full shape: role, slot invariant, onset, dur", () => {
  const e = loadTriadetudesEngine();
  const voic = e.chooseVoicings(e.buildSequence());
  const order = e.orderedNotes(voic[0]);
  for (const ev of unwrap(e.arpOnsets(voic[0], order, 40, 2, 72))) {
    for (const f of ["midi", "string", "fret", "role", "slot", "onset", "dur"])
      assert.ok(f in ev, `event has ${f}`);
    if (ev.role === "chord") {
      assert.ok([0, 1, 2].includes(ev.slot), "slot is the set index");
      assert.equal(ev.string, unwrap(e.st.setLowHigh)[ev.slot],
        "slot is the invariant, string the derived coordinate");
    } else assert.equal(ev.slot, null, "the bass pedal has no slot");
  }
});

test("voicing notes are born with their slot (the invariant travels from creation)", () => {
  const e = loadTriadetudesEngine();
  for (const place of ["grip", "line"]) {
    e.st.placement = place;
    for (const v of e.chooseVoicings(e.buildSequence()))
      for (const n of unwrap(v.notes))
        assert.equal(n.string, unwrap(e.st.setLowHigh)[n.slot], `${place}: slot honest`);
  }
  e.st.placement = "grip";
});

// ---- anti-drift: the hand-inlined producer must match the module verbatim ----

test("every app carrying note-events matches the module verbatim (no drift)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const inlineForm = readFileSync(join(here, "..", "note-events.mjs"), "utf8")
    .split("\n").filter((l) => !/^import /.test(l)).join("\n")
    .replace(/^export /gm, "").replace(/^\n+/, "").replace(/\n+$/, "\n");
  // the census's fact, pre-hub half — this was the SIXTH hand list, found by
  // the 260819.5 sweep after the item had counted five
  const CARRIERS = preHubCarriersOf("note-events");
  assert.ok(CARRIERS.length >= 1, "the census lost note-events' pre-hub carriers");
  for (const slug of CARRIERS) {
    const src = readFileSync(
      join(here, "..", "..", "static", "studies", slug, "study.html"), "utf8");
    assert.ok(src.includes(inlineForm),
      `${slug}/study.html has drifted from engine/note-events.mjs — re-inline it`);
  }
});
