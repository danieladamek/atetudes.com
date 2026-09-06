/* string-sets.test.mjs — the translation law (Triadetudes v0.6.6).
 * Run: node --test "engine/tests/*.test.mjs"
 *
 * The pivot sweep uses the SHIPPED study's own scale machinery (via the
 * characterization loader) to build the {fret,degree} lists, so the pure
 * module is tested against the exact data the app will hand it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  lowToHigh, slotsOf, stringsOf, translatePattern, translateString,
  pivotWindow, MAX_PATTERN,
} from "../string-sets.mjs";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";
import { preHubCarriersOf } from "./_carriers.mjs";

const SETS = [[1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 6]];

// ---- the worked case from the item, verbatim ----

test("the item's worked case: 3-4-2-2 on set 2-3-4 → slots [1,0,2,2] → 4-5-3-3 on set 3-4-5", () => {
  assert.deepEqual(slotsOf([3, 4, 2, 2], [2, 3, 4]), [1, 0, 2, 2], "mid, low, high, high");
  assert.deepEqual(translatePattern([3, 4, 2, 2], [2, 3, 4], [3, 4, 5]), [4, 5, 3, 3]);
});

// ---- slot arithmetic ----

test("lowToHigh orders low pitch → high pitch (descending string numbers)", () => {
  assert.deepEqual(lowToHigh([2, 3, 4]), [4, 3, 2]);
  assert.deepEqual(lowToHigh([1, 2, 3]), [3, 2, 1]);
});

test("slot round-trip is the identity across every pair of sets and pattern shapes", () => {
  const shapes = [[0], [1], [2, 1], [1, 0, 2, 2], [0, 1, 2, 2, 1, 0],
    [2, 2, 2], [0, 0, 0, 1, 1, 1, 2, 2, 2, 0, 1, 2, 0, 1, 2, 0]]; // incl. 16 notes
  for (const A of SETS)
    for (const B of SETS)
      for (const slots of shapes) {
        const p = stringsOf(slots, A);
        assert.deepEqual(translatePattern(translatePattern(p, A, B), B, A), p,
          `${p} via ${A.join("-")}→${B.join("-")}`);
        assert.deepEqual(slotsOf(translatePattern(p, A, B), B), slots,
          "the slot list is the invariant");
      }
});

test("repeats, single notes, and block chords survive translation", () => {
  assert.deepEqual(translatePattern([2, 2, 2, 2], [1, 2, 3], [4, 5, 6]), [5, 5, 5, 5]);
  assert.deepEqual(translatePattern([3], [1, 2, 3], [2, 3, 4]), [4]);
  assert.equal(translatePattern(null, [1, 2, 3], [2, 3, 4]), null, "block chord passes through");
  assert.equal(translateString(2, [1, 2, 3], [3, 4, 5]), 4, "the pivot string travels by slot");
});

test("the 16-note ceiling holds; oversize patterns are a derivation error", () => {
  const sixteen = Array.from({ length: MAX_PATTERN }, (_, k) => [1, 2, 3][k % 3]);
  assert.equal(translatePattern(sixteen, [1, 2, 3], [2, 3, 4]).length, 16);
  assert.throws(() => translatePattern([...sixteen, 1], [1, 2, 3], [2, 3, 4]), /ceiling/);
});

test("strings outside the set and bad slots throw with names, not wrong output", () => {
  assert.throws(() => slotsOf([5], [1, 2, 3]), /not in set/);
  assert.throws(() => stringsOf([3], [1, 2, 3]), /outside/);
  assert.throws(() => translatePattern([1, 2], [1, 2, 3], [1, 2]), /not total/);
});

// ---- pivot windows: degree preserved, octave nearest ----

const scaleNotesOn = (e, str) => {
  const sd = e.scaleData();
  return unwrap(e.scaleFretsOnString(str)).map((f) => ({
    fret: f,
    degree: unwrap(sd.pcs).indexOf((e.OPEN[str] + f) % 12),
  }));
};

test("pivot sweep: every key × scale × set preserves the degree and picks the nearest octave", () => {
  const e = loadTriadetudesEngine();
  for (const key of e.KEYS)
    for (const scaleType of ["major", "harm", "mel"]) {
      e.st.key = key; e.st.scaleType = scaleType;
      for (const set of SETS) {
        const str = lowToHigh(set)[1]; // the middle string, the default pivot home
        const notes = scaleNotesOn(e, str);
        for (let degree = 0; degree < 7; degree++)
          for (const nearFret of [0, 5, 9, 15]) {
            const w = pivotWindow(notes, degree, nearFret);
            const at = notes.find((n) => n.fret === w[0]);
            assert.equal(at.degree, degree,
              `${key} ${scaleType} str${str} deg${degree}: degree preserved`);
            // (b) nearest: no other window-fitting occurrence is closer
            for (let i = 0; i <= notes.length - 3; i++)
              if (notes[i].degree === degree)
                assert.ok(Math.abs(w[0] - nearFret) <= Math.abs(notes[i].fret - nearFret),
                  `${key} ${scaleType} str${str} deg${degree} near${nearFret}: ` +
                  `picked ${w[0]}, but ${notes[i].fret} is closer`);
            assert.ok(w[0] < w[1] && w[1] < w[2], "three ascending scale frets");
            w.forEach((f) => assert.ok(notes.some((n) => n.fret === f), "every fret a scale note"));
          }
      }
    }
});

test("pivot window slides, not jumps: nearest occurrence wins at both ends of the neck", () => {
  const e = loadTriadetudesEngine(); // C major defaults
  // string 5: degree 5 (A) occurs at frets 0 and 12, BOTH with room for a full
  // window — the two ends of the neck must seat in different octaves
  const notes = scaleNotesOn(e, 5);
  const low = pivotWindow(notes, 5, 0);
  const high = pivotWindow(notes, 5, 15);
  assert.equal(low[0], 0, "near the nut: the open-position octave");
  assert.equal(high[0], 12, "near the 15th: the 12th-fret octave");
  assert.equal(notes.find((n) => n.fret === low[0]).degree, 5);
  assert.equal(notes.find((n) => n.fret === high[0]).degree, 5);
  // and an occurrence too high to fit a window is rightly NOT a candidate:
  // degree 0 (C) on string 2 exists at fret 13, but 13-15 can't hold three
  // scale notes, so both ends seat at fret 1 — a designed clamp, not a bug
  const n2 = scaleNotesOn(e, 2);
  assert.equal(pivotWindow(n2, 0, 15)[0], pivotWindow(n2, 0, 1)[0]);
});

// ---- no-reset behaviour, headless, through the study's own transition functions ----

test("no-reset: set, key and scale changes translate the design instead of destroying it", () => {
  const e = loadTriadetudesEngine();
  // a custom figure and custom pivots, exactly the reported scenario
  e.st.set = [2, 3, 4]; e.defaultPivots();
  e.st.arpPattern = [3, 4, 2, 2]; e.st.arpCustom = true;
  const cap0 = unwrap(e.pivotContext());
  e.changeSet([3, 4, 5]);
  /* PIN REWRITTEN 261002 (night 38, ONE ADDRESS FAMILY — Daniel 260923): a pattern names
   * ABSOLUTE strings and does not survive a set change. The figure is KEPT verbatim (the user's
   * sentence), refused by name on the face, and the same figure slot for slot is OFFERED — the
   * item's worked case lands by a click, never by the set change itself. The PIVOT still
   * translates: the design is relative, the figure is the instrument's. */
  assert.deepEqual(unwrap(e.st.arpPattern), [3, 4, 2, 2], "the figure is kept verbatim across the set change");
  assert.equal(e.patternStale(), true, "…and is stale on the new set, said on the face");
  assert.match(e.staleMsg(), /string 2 carries nothing in this set \(strings 5-4-3\)/);
  assert.deepEqual(unwrap(e.st.shiftOffer.to), [4, 5, 3, 3], "the item's worked case, OFFERED");
  assert.equal(e.takeShiftOffer(), true);
  assert.deepEqual(unwrap(e.st.arpPattern), [4, 5, 3, 3], "the item's worked case, taken by a click");
  assert.equal(e.st.arpCustom, true, "custom flag survives");
  let cap = unwrap(e.pivotContext());
  assert.equal(cap.slot, cap0.slot, "pivot slot survives the set change");
  assert.equal(cap.degree, cap0.degree, "pivot degree survives the set change");
  e.changeKey("E");
  cap = unwrap(e.pivotContext());
  assert.equal(cap.degree, cap0.degree, "pivot degree survives the key change");
  assert.deepEqual(unwrap(e.st.arpPattern), [4, 5, 3, 3], "pattern untouched by key change");
  e.changeScale("mel");
  cap = unwrap(e.pivotContext());
  assert.equal(cap.degree, cap0.degree, "pivot degree survives the scale change");
  assert.equal(e.st.arpCustom, true, "custom flag still true after all three changes");
  // and every re-derived pivot fret is a scale note of the current context
  const sd = e.scaleData();
  for (const f of unwrap(e.st.pivotFrets))
    assert.ok(unwrap(sd.pcs).includes((e.OPEN[e.st.pivotString] + f) % 12),
      "pivot frets re-derived into the new scale");
});

test("no-reset: cycling all four sets and returning home restores the original design", () => {
  const e = loadTriadetudesEngine();
  e.st.set = [2, 3, 4]; e.defaultPivots();
  e.st.arpPattern = [3, 4, 2, 2]; e.st.arpCustom = true;
  const before = { pat: unwrap(e.st.arpPattern), piv: unwrap(e.st.pivotFrets),
    str: e.st.pivotString };
  // 261002: each set change OFFERS the shift; taking it at every step is the old silent path, made a click
  for (const set of [[3, 4, 5], [4, 5, 6], [1, 2, 3], [2, 3, 4]]) { e.changeSet(set); assert.equal(e.takeShiftOffer(), true, `an offer stands on ${set.join("-")}`); }
  assert.deepEqual(unwrap(e.st.arpPattern), before.pat, "pattern returns home exactly");
  assert.equal(e.st.pivotString, before.str, "pivot string returns home");
  assert.deepEqual(unwrap(e.st.pivotFrets), before.piv, "pivot frets return home");
});

// ---- anti-drift: the hand-inlined copy in the study must match the module ----

test("every app carrying string-sets matches the module verbatim (no drift)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const inlineForm = readFileSync(join(here, "..", "string-sets.mjs"), "utf8")
    .split("\n").filter((l) => !/^import /.test(l)).join("\n")
    .replace(/^export /gm, "").replace(/^\n+/, "").replace(/\n+$/, "\n");
  // ALL apps that inline the translation law — the census's fact, pre-hub
  // half (whole-module contiguity fits only hand-inlined studies)
  const CARRIERS = preHubCarriersOf("string-sets");
  assert.ok(CARRIERS.length >= 1, "the census lost string-sets' carriers");
  for (const slug of CARRIERS) {
    const src = readFileSync(
      join(here, "..", "..", "static", "studies", slug, "study.html"), "utf8");
    assert.ok(src.includes(inlineForm),
      `${slug}/study.html has drifted from engine/string-sets.mjs — re-inline it`);
  }
});
