/* reference.test.mjs — the reference tone, fretted and named (child 5).
 *
 * The composite names here are ASSERTED ROUND TRIPS: every name the module
 * returns has been parsed back through chord.mjs and matched pc-for-pc, so
 * these pins are pins on the assembly rules, with the parser as the law.
 * v0.9's placeBass is the read source (line 712); the placement corpus walks
 * every kind × every chord degree so the degree arithmetic is exercised, not
 * sampled.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { placeReference, compositeOver, REF_OFFSET } from "../reference.mjs";
import { field } from "../field.mjs";
import { diatonicTones, objectOffsets } from "../selection.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fld = field({ key: "Bb", scale: "major" });
const BOOT = { fLo: 5, fHi: 8, centre: 20 / 3 };

test("the placement corpus: every kind on every chord degree frets a real note of the right degree", () => {
  let placed = 0;
  for (const kind of Object.keys(REF_OFFSET))
    for (let cd = 0; cd < 7; cd++) {
      const r = placeReference(kind, cd, fld, [4, 3, 2, 1], BOOT);
      assert.ok(r.note, `${kind} on degree ${cd} must place`);
      assert.equal(r.note.string, 6, "string 6 is free and preferred");
      assert.equal(r.note.keyDeg, ((cd + REF_OFFSET[kind]) % 7 + 7) % 7,
        `${kind} lands ${REF_OFFSET[kind]} scale steps from degree ${cd}`);
      assert.equal(r.note.midi % 12, fld.pcs[r.note.keyDeg] % 12,
        "the fretted midi wears the degree's pitch class");
      placed++;
    }
  assert.equal(placed, 21, "the corpus must actually run");
});

test("string 5 serves when 6 is taken; both taken refuses BY NAME", () => {
  const on5 = placeReference("root", 0, fld, [6, 4, 3], BOOT);
  assert.ok(on5.note && on5.note.string === 5, "string 6 in the set pushes the reference to 5");
  const refused = placeReference("root", 0, fld, [6, 5, 4, 3], BOOT);
  assert.equal(refused.note, null);
  assert.match(refused.reason, /strings 5 and 6 are both in the set/,
    "the refusal must name itself — an empty board is not an answer");
});

test("a reach past the box is a stretch — flagged, still a real fretted note", () => {
  const far = placeReference("root", 0, fld, [4, 3, 2, 1], { fLo: 0, fHi: 3, centre: 1.5 });
  assert.ok(far.note && far.stretch === true);
  assert.ok(far.note.fret > 3, "the stretch really is outside the window");
  const near = placeReference("root", 0, fld, [4, 3, 2, 1], BOOT);
  assert.equal(near.stretch, false, "in the window is not a stretch");
});

test("THE COMPOSITES READ BACK: the journal's own sentences, through the parser", () => {
  const tet = diatonicTones(fld, 0, objectOffsets("tetrad")).map((t) => t.pc);
  const dyad = diatonicTones(fld, 0, objectOffsets("dyad", [3, 7])).map((t) => t.pc);
  // R19: the same four-note grip becomes a ninth chord because of one note underneath
  assert.equal(compositeOver(fld, 5, tet).name, "Gm9");
  // the root names the chord itself
  assert.equal(compositeOver(fld, 0, tet).name, "Bbmaj7");
  // a 5th below: the lydian stack, no third — every slot said out loud
  assert.equal(compositeOver(fld, 3, tet).name, "Ebmaj9#11no3");
  // the guide-tone dyad over the root: a seventh chord missing its fifth, says so
  assert.equal(compositeOver(fld, 0, dyad).name, "Bbmaj7no5");
  // the same dyad over G: D and A over G IS Gsus2 — the assembly finds it
  assert.equal(compositeOver(fld, 5, dyad).name, "Gsus2");
  // honesty: a stack no rule names returns null, never a wrong name
  assert.equal(compositeOver(fld, 0, [fld.pcs[5]]).name, null,
    "a bare 13 over a bass has no honest name here");
});

test("THE GREP extends: no quality interval set spelled in reference.mjs", () => {
  const BANNED = [/\[0,\s*4,\s*7\]/, /\[0,\s*3,\s*7\]/, /\[0,\s*3,\s*6\]/, /\[0,\s*4,\s*8\]/,
    /\[0,\s*4,\s*7,\s*10\]/, /\[0,\s*4,\s*7,\s*11\]/];
  const src = readFileSync(join(here, "..", "reference.mjs"), "utf8");
  for (const re of BANNED)
    assert.ok(!re.test(src), `reference.mjs spells a quality interval set (${re})`);
});

// ---- 260917 (night 22, item 3): the bass is chosen from the tones the object holds ----
import { referenceChoicesFor, refOffsetOf } from "../reference.mjs";

test("260917-3: the offered basses are the pick's own tones beside the root, plus the two relative options — kept", () => {
  assert.deepEqual(referenceChoicesFor([1, 3, 5, 7]).map(([v]) => v),
    ["none", "root", "tone:3", "tone:5", "tone:7", "third", "fifth"], "a tetrad offers its 3rd, 5th and 7th");
  assert.deepEqual(referenceChoicesFor([1, 3, 7]).map(([v]) => v),
    ["none", "root", "tone:3", "tone:7", "third", "fifth"], "a tone not selected is not offerable");
  assert.deepEqual(referenceChoicesFor([3, 7]).map(([v]) => v),
    ["none", "root", "tone:3", "tone:7", "third", "fifth"], "the root is always offered, picked or not");
  assert.deepEqual(referenceChoicesFor(null).map(([v]) => v),
    ["none", "root", "third", "fifth"], "a scale (no pick) offers the ruled trio — unchanged");
  assert.equal(referenceChoicesFor([1, 3, 5, 7, 9])[5][1], "the 9th in the bass");
});

test("260917-3: a tone in the bass is degree arithmetic — the 3rd is +2 steps, the 7th +6, the 9 wraps to +1", () => {
  assert.equal(refOffsetOf("root"), 0); assert.equal(refOffsetOf("third"), -2); assert.equal(refOffsetOf("fifth"), -4);
  assert.equal(refOffsetOf("tone:3"), 2); assert.equal(refOffsetOf("tone:7"), 6); assert.equal(refOffsetOf("tone:9"), 1);
  assert.equal(refOffsetOf("tone:13"), 5); assert.equal(refOffsetOf("pedal"), null, "an unknown kind is null, and placeReference refuses it by name");
  const fld = field({ key: "Bb", scale: "major" });
  const pos = { fLo: 3, fHi: 7, centre: 5 };
  const d3 = placeReference("tone:3", 0, fld, [4, 3, 2, 1], pos, [1, 3, 5, 7]);
  assert.ok(d3.note && fld.pcs[d3.note.keyDeg] === 2, "the 3rd of B♭ in the bass is D");
  // a triad with a 3rd BELOW is a seventh chord — the composite names it (measured before it was touched: already so)
  const tri = [0, 2, 4].map((o) => fld.pcs[o]);
  const below = placeReference("third", 0, fld, [4, 3, 2, 1], pos);
  assert.equal(compositeOver(fld, below.note.keyDeg, tri).name, "Gm7", "B♭ over G IS Gm7 — the readout names the full chord");
});

test("260917-3: a bass tone the pick no longer holds is refused BY NAME at the one derivation — sound = sight", () => {
  const fld = field({ key: "Bb", scale: "major" });
  const pos = { fLo: 3, fHi: 7, centre: 5 };
  const r = placeReference("tone:5", 0, fld, [4, 3, 2, 1], pos, [1, 3, 7]);
  assert.equal(r.note, null);
  assert.match(r.reason, /the bass names the 5th, which the chosen tones do not hold/);
  const ok = placeReference("tone:5", 0, fld, [4, 3, 2, 1], pos, [1, 3, 5, 7]);
  assert.ok(ok.note, "…and places when the pick holds it");
  const noPick = placeReference("tone:5", 0, fld, [4, 3, 2, 1], pos);
  assert.ok(noPick.note, "no pick (a scale) applies no guard");
});
