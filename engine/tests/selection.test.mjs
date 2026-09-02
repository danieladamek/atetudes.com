/* selection.test.mjs — the selection module, and THE CONFORMANCE CASE the
 * route was approved on.
 *
 * U1: identical behaviour is unassertable in general and assertable per named
 * behaviour. The named behaviour here is
 *
 *   THE §6.1.2 CHOICE — one occurrence per tone, minimising total fret span,
 *   then drift from the centre, then the lower strings —
 *
 * implemented twice: engine/isolation.mjs's lineVoicing (the carried path,
 * byte-shipped in the tetradetudes door and pinned by the triad study's line
 * mode) and engine/selection.mjs's oneOfEach (the multetudes-native path).
 * On the ratified ground — ONE NOTE PER STRING — they are asserted equal,
 * exactly, over a derived corpus, including agreement on UNPLACEABILITY
 * (where one refuses, the other must refuse). The pattern is field.mjs's
 * tuning pin: one fact, two derivations, asserted never assumed.
 *
 * TWO CLAUSES ARE DELIBERATELY OUTSIDE THE GROUND, each pinned BY NAME so the
 * boundary is a tested fact rather than prose:
 *   - zone capture ("a chord tone present in the zone is taken there") — the
 *     carried anchoring rule; multetudes' window is a frame, not an anchor.
 *   - n > 1: THE VOICING RULE. The carried key doubles a string where
 *     doubling is tighter; a voicing is what can sound together, so
 *     selection spreads before it tightens. The divergence pin below holds
 *     the exact counterexample that falsified the guide's "one-per-string is
 *     always the tighter span".
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { field } from "../field.mjs";
import { positionOf, materialIn } from "../position.mjs";
import { makeRun } from "../string-run.mjs";
import { diatonicTones, oneOfEach, everyOccurrence, scaleTake, objectOffsets, objectTones, gripFit, STACK_DEPTH } from "../selection.mjs";
import { parseChord } from "../chord.mjs";
import { lineVoicing, chooseVoicings, makeZone } from "../isolation.mjs";

const mod12 = (x) => ((x % 12) + 12) % 12;
const addr = (notes) => notes.map((n) => n.string + "/" + n.fret).join(" ");

/** the carried voicer posed the SAME question: no zone capture, pool-order
 * candidates, the run's strings — the shared ground's exact framing */
function carriedChoice(pcs, pool, pos, run, maxPerString) {
  const zone = makeZone({ string: pos.anchorString, frets: pos.frets });
  const positionsFor = (pc) => pool.filter((m) => mod12(m.midi) === mod12(pc));
  return lineVoicing(pcs, { zone, zoneNotes: [], positionsFor,
    setLowHigh: run.strings, maxPerString });
}

test("THE CONFORMANCE CASE — the §6.1.2 choice: oneOfEach IS the carried voicer's placement at one note per string", () => {
  let agreed = 0, refusedBoth = 0;
  for (const key of ["C", "Eb", "F#", "A"])
    for (const scale of ["major", "harm", "mel"])
      for (const strings of [[6, 5, 4, 3], [5, 4, 3, 2], [4, 3, 2, 1], [6, 4, 3, 1]])
        for (let deg = 0; deg < 7; deg += 2)
          for (const offsets of [[0, 2, 4], [0, 2, 4, 6]]) {
            const fld = field({ key, scale });
            const run = makeRun(strings);
            const anchor = Math.max(...strings);
            const pos = positionOf({ field: fld, anchorString: anchor, startDegree: deg, nearFret: 5 });
            const pool = materialIn(pos, strings, fld);
            const tones = diatonicTones(fld, deg, offsets);
            if (tones.some((t) => !pool.some((m) => mod12(m.midi) === mod12(t.pc))))
              continue;                              // a missing tone is not shared ground
            const mine = oneOfEach(tones, pool, { n: 1, centre: pos.centre });
            let theirs = null, refused = false;
            try {
              theirs = carriedChoice(tones.map((t) => t.pc), pool, pos, run, 1);
            } catch { refused = true; }
            if (mine.unplaceable || refused) {
              assert.ok(mine.unplaceable && refused,
                `${key} ${scale} deg ${deg} on ${run.label}: one path refused and the other placed — ` +
                `mine ${mine.unplaceable ? "refused" : addr(mine.notes)} vs carried ${refused ? "refused" : addr(theirs.notes)}`);
              refusedBoth++;
              continue;
            }
            assert.equal(addr(mine.notes), addr(theirs.notes),
              `${key} ${scale} deg ${deg} ${offsets.length} tones on ${run.label}: the two paths disagree on shared ground`);
            agreed++;
          }
  assert.ok(agreed >= 300, `the conformance corpus must actually run (${agreed} agreements, ${refusedBoth} joint refusals)`);
});

test("the seam has a caller: chooseVoicings' line placement runs on selection's choice, end to end", () => {
  const fld = field({ key: "Bb", scale: "major" });
  const strings = [4, 3, 2, 1];
  const run = makeRun(strings);
  const pos = positionOf({ field: fld, anchorString: 4, startDegree: 0, nearFret: 5 });
  const pool = materialIn(pos, strings, fld);
  const seq = [0, 3, 4].map((deg) => diatonicTones(fld, deg, [0, 2, 4, 6]));
  // the injected seam (isolation.mjs:231, called at :236) — its caller is the
  // multetudes path now, not only the characterization harness
  const voiced = chooseVoicings(seq, {
    zone: makeZone({ string: pos.anchorString, frets: pos.frets }),
    placement: "line", setLowHigh: run.strings, nfrets: 15,
    lineVoicingFor: (tones) => oneOfEach(tones, pool, { n: 3, centre: pos.centre }),
  });
  assert.equal(voiced.length, 3);
  voiced.forEach((v, i) => {
    assert.ok(v.notes && v.notes.length >= 3, `chord ${i} did not voice through the seam`);
    assert.equal(addr(v.notes), addr(oneOfEach(seq[i], pool, { n: 3, centre: pos.centre }).notes),
      "the seam must deliver exactly what the rule chooses");
  });
});

test("THE DIVERGENCE PIN (§4.4, deliberate): at n > 1 the carried key doubles where selection spreads — the counterexample, held", () => {
  // C major, window frets 3–7 on string 5, tetrad over {5,4,3,2}: span alone
  // puts C@3/5 and B@3/4 on one string (span 1) — the combination that
  // falsified the guide's "one-per-string is always the tighter span".
  const fld = field({ key: "C", scale: "major" });
  const strings = [5, 4, 3, 2];
  const run = makeRun(strings);
  const pos = positionOf({ field: fld, anchorString: 5, startDegree: 0, nearFret: 5 });
  assert.deepEqual(pos.frets, [3, 5, 7], "the counterexample's window");
  const pool = materialIn(pos, strings, fld);
  const tones = diatonicTones(fld, 0, [0, 2, 4, 6]);
  const carried = carriedChoice(tones.map((t) => t.pc), pool, pos, run, 3);
  const perString = {};
  for (const n of carried.notes) perString[n.string] = (perString[n.string] || 0) + 1;
  assert.ok(Object.values(perString).some((c) => c > 1),
    "the carried voicer must double a string here — if it stopped, the ground has moved and the divergence needs re-deciding");
  const mine = oneOfEach(tones, pool, { n: 3, centre: pos.centre });
  assert.ok(mine.notes.every((n, i, a) => a.filter((x) => x.string === n.string).length === 1),
    "selection must spread — a voicing is what can sound together");
  assert.notEqual(addr(mine.notes), addr(carried.notes),
    "the divergence is real, named, and outside the conformance ground");
});

test("TAKE IS NOT PLACEMENT, as a theorem: raising the ceiling never changes a placeable voicing", () => {
  let held = 0;
  for (const key of ["C", "Db", "G"])
    for (const scale of ["major", "mel"])
      for (const strings of [[6, 5, 4, 3], [4, 3, 2, 1], [6, 4, 3, 1]])
        for (let deg = 0; deg < 7; deg++) {
          const fld = field({ key, scale });
          const anchor = Math.max(...strings);
          const pos = positionOf({ field: fld, anchorString: anchor, startDegree: deg, nearFret: 5 });
          const pool = materialIn(pos, strings, fld);
          const tones = diatonicTones(fld, deg, [0, 2, 4, 6]);
          const at1 = oneOfEach(tones, pool, { n: 1, centre: pos.centre });
          if (!at1.notes) continue;                    // unplaceable at 1 may legitimately fold at 3
          const at3 = oneOfEach(tones, pool, { n: 3, centre: pos.centre });
          assert.equal(addr(at3.notes), addr(at1.notes),
            `${key} ${scale} deg ${deg} on ${strings.join(",")}: the ceiling CAUSED a change`);
          held++;
        }
  assert.ok(held >= 80, `the theorem must be exercised (${held} cases)`);
});

test("two notes on one string are DISTINCT, ORDERED, ADDRESSABLE entries — the collision law at the data level", () => {
  const fld = field({ key: "C", scale: "major" });
  const pos = positionOf({ field: fld, anchorString: 5, startDegree: 0, nearFret: 5 });
  const pool = materialIn(pos, [5, 4, 3, 2], fld);
  const arp = everyOccurrence(diatonicTones(fld, 0), pool, { n: 3 });
  const doubled = Object.entries(arp.notes.reduce((a, n) => {
    (a[n.string] ||= []).push(n); return a;
  }, {})).filter(([, ns]) => ns.length >= 2);
  assert.ok(doubled.length >= 1, "the fixture must actually double a string");
  for (const [s, ns] of doubled) {
    const frets = ns.map((n) => n.fret);
    assert.equal(new Set(frets).size, frets.length, `string ${s}: two entries share a fret`);
    // the ordinal address: the k-th note on a string is well defined because
    // entries ascend by fret — "a repeat is the ordinal" has ground to stand on
    const sorted = [...frets].sort((a, b) => a - b);
    assert.deepEqual(frets, sorted, `string ${s}: entries must ascend so ordinals mean something`);
    ns.forEach((n, k) => assert.equal(n.fret, sorted[k], `string ${s} ordinal ${k}`));
  }
});

test("absence is a fact: a tone outside the window reports by role; a forced collision reports its string", () => {
  const fld = field({ key: "C", scale: "major" });
  // one string only: the tetrad cannot spread — at n=1, three of the tones
  // collide on the single string and the refusal must NAME it
  const pos = positionOf({ field: fld, anchorString: 6, startDegree: 0, nearFret: 5 });
  const pool1 = materialIn(pos, [6], fld);
  const tones = diatonicTones(fld, 0);
  const r = oneOfEach(tones, pool1, { n: 1, centre: pos.centre });
  assert.equal(r.notes, null);
  assert.ok(r.unplaceable, "one string cannot hold a tetrad at one per string");
  assert.ok(r.collide && r.collide.string === 6 && r.collide.roles.length > 1,
    `the refusal must name the string and the roles (${JSON.stringify(r.collide)})`);
  // and a genuinely absent tone is missing, not an error
  assert.ok(Array.isArray(r.missing));
});

test("the scale takes everything the box offers — placement off, reach the only cap; asserted against the pool itself", () => {
  const fld = field({ key: "E", scale: "harm" });
  const pos = positionOf({ field: fld, anchorString: 6, startDegree: 0, nearFret: 7 });
  const pool = materialIn(pos, [6, 5, 4, 3, 2, 1], fld);
  const take = scaleTake(pool);
  // differential: per string, exactly the first ≤3 pool notes, in pool order
  const expect = [...new Set(pool.map((m) => m.string))]
    .flatMap((s) => pool.filter((m) => m.string === s).slice(0, 3));
  assert.deepEqual(take.notes.map((n) => n.string + "/" + n.fret),
    expect.map((n) => n.string + "/" + n.fret));
  assert.ok(take.notes.length >= 12 && take.notes.length <= 18,
    `R15's twelve-to-eighteen notes (${take.notes.length})`);
  assert.ok(take.notes.every((n) => n.role === null), "a scale note wears no chord role");
});

test("THE COVERAGE RULE (260906): a tone not yet represented beats a duplicate — Daniel's F, exactly", () => {
  // C major, chord F (IV), strings {1,2,3}, the 2-5 window: F is nowhere,
  // A sits on strings 1 AND 3, C only on string 3. The old cap voiced the
  // chord as two A's and lost the C that was sitting in the box.
  const fld = field({ key: "C", scale: "major" });
  const pos = positionOf({ field: fld, anchorString: 3, startDegree: 5, nearFret: 2 });
  assert.deepEqual([pos.fLo, pos.fHi], [2, 5], "the case's own window must construct");
  const pool = materialIn(pos, [1, 2, 3], fld);
  const tones = diatonicTones(fld, 3, objectOffsets("triad"));
  const r = everyOccurrence(tones, pool, { n: 1 });
  const got = r.notes.map((x) => `${x.role}@${x.string}/${x.fret}`).sort();
  assert.deepEqual(got, ["3@1/5", "5@3/5"],
    "the 5th on string 3 beats the duplicate 3rd there");
  assert.deepEqual(r.missing, ["R"], "the absent F is said BY ROLE");
});

test("THE COVERAGE SWEEP: no configuration duplicates a tone while an available one goes unplaced", () => {
  const KEYS = ["C", "D", "E", "F", "G", "A", "B", "Bb"];
  const SETS = [[1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 6]];
  let cases = 0, offenders = [];
  for (const key of KEYS) for (const set of SETS) for (let w = 0; w < 7; w++) {
    const fld = field({ key, scale: "major" });
    let pos;
    try { pos = positionOf({ field: fld, anchorString: Math.max(...set), startDegree: w, nearFret: 5 }); }
    catch { continue; }
    const pool = materialIn(pos, set, fld);
    for (let deg = 0; deg < 7; deg++) {
      const tones = diatonicTones(fld, deg, objectOffsets("triad"));
      const sel = everyOccurrence(tones, pool, { n: 1 }).notes || [];
      cases++;
      const counts = {};
      for (const x of sel) counts[x.role] = (counts[x.role] || 0) + 1;
      const present = new Set(sel.map((x) => x.role));
      // the precise offence: a DUPLICATED note on a string that also
      // carries an occurrence of an unrepresented tone (the Am case — two
      // tones fighting one one-slot string — is an honest loss, not this)
      const uncovered = tones.filter((t) => !present.has(t.role)).map((t) => t.pc);
      const offends = sel.some((x) => counts[x.role] > 1
        && uncovered.some((pc) => pool.some((m) => m.string === x.string
          && ((m.midi % 12) + 12) % 12 === pc)));
      if (offends)
        offenders.push(`${key} deg${deg} set${set.join("")} w${w}: ${sel.map((x) => x.role + "@" + x.string + "/" + x.fret).join(" ")}`);
    }
  }
  assert.ok(cases >= 1500, `the corpus must actually run (${cases})`);
  assert.deepEqual(offenders.slice(0, 5), [],
    `${offenders.length}/${cases} configurations voice a duplicate while an available tone goes unplaced`);
});

test("the EVERY promise where the cap does not bind: no pool hit is dropped at n=3", () => {
  const fld = field({ key: "Bb", scale: "major" });
  const pos = positionOf({ field: fld, anchorString: 4, startDegree: 4, nearFret: 3 });
  const pool = materialIn(pos, [4, 3, 2, 1], fld);
  const tones = diatonicTones(fld, 0, objectOffsets("tetrad"));
  const sel = everyOccurrence(tones, pool, { n: 3 }).notes;
  const hits = pool.filter((m) => tones.some((t) => t.pc === ((m.midi % 12) + 12) % 12));
  assert.equal(sel.length, hits.length, "uncapped, every occurrence really is every occurrence");
});

test("THE CAPPED LOSS IS LOUD (260909, 4b): a tone in the box that the cap cannot carry is NAMED, with its escape", () => {
  // Daniel's case: Ebmaj7, window 5-8, every occurrence at Grip. R and 7
  // both live only on string 3 — one MUST lose at n=1 (an honest loss) —
  // but the loss was SILENT: missing:[] because the 7 IS in the pool.
  const fld = field({ key: "Bb", scale: "major" });
  const pos = positionOf({ field: fld, anchorString: 4, startDegree: 5, nearFret: 5, strings: [4, 3, 2, 1] });
  const pool = materialIn(pos, [4, 3, 2, 1], fld);
  const tones = diatonicTones(fld, 3, objectOffsets("tetrad"));
  const r = everyOccurrence(tones, pool, { n: 1 });
  assert.deepEqual(r.missing, [], "the 7 is IN the pool — missing stays the not-in-frame word");
  assert.deepEqual(r.capped, ["7"],
    "the tone the cap left behind is named — the third absence subtype");
  assert.equal(r.resolvesAt, 2, "and the smallest cap that shows it is derived, not assumed");
  const r3 = everyOccurrence(tones, pool, { n: 3 });
  assert.deepEqual(r3.capped, [], "an uncapped take leaves nothing behind");
});

// ---------------------------------------------------------------------------
// 260914 item 3 — DEPTH IS DATA, AND THE DROP HAS A NAME
// ---------------------------------------------------------------------------

test("260914-3: depth is DATA — every object's slot count derives from STACK_DEPTH, no ternary knows a number", () => {
  assert.deepEqual(STACK_DEPTH,
    { triad: 3, tetrad: 4, ninth: 5, eleventh: 6, thirteenth: 7 },
    "the five stacked objects, each a depth");
  for (const [obj, depth] of Object.entries(STACK_DEPTH)) {
    const offs = objectOffsets(obj);
    assert.equal(offs.length, depth, `${obj} offers ${depth} slots`);
    assert.deepEqual(offs, Array.from({ length: depth }, (_, i) => 2 * i),
      `${obj}'s offsets are thirds all the way up (2*i stays)`);
  }
});

test("260914-3: the extended stacks carry the compound roles — a 13th chord's tones read R 3 5 7 9 11 13", () => {
  const fld = field({ key: "Bb", scale: "major" });
  for (const [obj, want] of [
    ["ninth", ["R", "3", "5", "7", "9"]],
    ["eleventh", ["R", "3", "5", "7", "9", "11"]],
    ["thirteenth", ["R", "3", "5", "7", "9", "11", "13"]],
  ]) {
    const tones = diatonicTones(fld, 0, objectOffsets(obj));
    assert.deepEqual(tones.map((t) => t.role), want, `${obj} roles`);
    // an octave-displaced seven: the 9 is the 2's pitch class, and so on up
    assert.equal(tones[4].pc, fld.pcs[1],
      `${obj}: the 9 IS the 2's pitch class, an octave displaced`);
  }
});

test("260914-3: gripFit — the NAMED drop: 5th first, then non-naming extensions 11-before-9; R, 3, 7 and the naming extension never", () => {
  const fld = field({ key: "Bb", scale: "major" });
  const stack = (obj) => diatonicTones(fld, 0, objectOffsets(obj));
  // a 13th on four slots: three drops, in the rule's order
  const t4 = gripFit(stack("thirteenth"), 4);
  assert.deepEqual(t4.tones.map((t) => t.role), ["R", "3", "7", "13"],
    "a 4-slot 13th carries R 3 7 13 — the naming extension survives");
  assert.deepEqual(t4.dropped, ["5", "11", "9"],
    "and says so, in the omission order: the 5th first, then 11 before 9");
  // an 11th on four slots: 11 is the NAMING extension and is untouchable
  const e4 = gripFit(stack("eleventh"), 4);
  assert.deepEqual(e4.tones.map((t) => t.role), ["R", "3", "7", "11"],
    "a 4-slot 11th keeps its 11");
  assert.deepEqual(e4.dropped, ["5", "9"], "dropping the 5th and the 9");
  // a 13th on six slots: exactly one drop, and it is the 5th
  const t6 = gripFit(stack("thirteenth"), 6);
  assert.deepEqual(t6.dropped, ["5"], "six slots cost only the 5th");
  // a stack that FITS is returned untouched — the rule never fires early
  const n5 = gripFit(stack("ninth"), 5);
  assert.deepEqual(n5.dropped, [], "a 5-slot ninth drops nothing");
  assert.deepEqual(n5.tones, stack("ninth"), "and the tones pass through verbatim");
  // past the rule's reach it REFUSES by name rather than inventing a drop
  const t3 = gripFit(stack("thirteenth"), 3);
  assert.ok(t3.refuse && t3.refuse.includes("no named rule"),
    `3 slots for the kept four: the refusal is named (${t3.refuse})`);
  assert.deepEqual(t3.tones.map((t) => t.role), ["R", "3", "7", "13"],
    "the kept stack still comes back — the face can show what it CAN show");
});

test("260914-3: the dyad guard derives from the tetrad's own depth — no literal [1,3,5,7] hides in a check", () => {
  // the guard's membership is exactly the tetrad's degree numbers
  const tetradDegrees = Array.from({ length: STACK_DEPTH.tetrad }, (_, i) => 2 * i + 1);
  assert.deepEqual(tetradDegrees, [1, 3, 5, 7]);
  assert.deepEqual(objectTones(parseChord("C7"), "dyad", [3, 7]).tones.map((t) => t.role),
    ["3", "7"], "a lawful dyad passes");
  assert.throws(() => objectTones(parseChord("C"), "dyad", [9, 3]),
    /dyad/, "a degree outside the tetrad's reach refuses");
});

// ---- 260917 (night 22, item 1): tone SELECTION extends to every stacked object ----
// Dyad already chose WHICH two; the ruling generalises it — Triad picks three,
// Tetrad four, the extensions their depth's worth, fewer is legitimate, a tone
// the object cannot hold refuses BY NAME — in the FIGURE FIELD'S OWN NOTATION
// (R,3,5,7): one parser, one refusal vocabulary, never a second.
import { parseTones, objectDegrees, defaultPick, tonePick, orderBy } from "../selection.mjs";

test("260917-1: parseTones IS the figure's tones parser — one vocabulary, asserted by identity of the refusal", () => {
  assert.deepEqual(parseTones("R,3,5,7").tones, ["R", "3", "5", "7"]);
  assert.deepEqual(parseTones("R-3-7 · 13").tones, ["R", "3", "7", "13"], "every separator the figure accepts");
  assert.deepEqual(parseTones("").tones, [], "no tokens is no pick, not an error");
  assert.equal(parseTones("").err, null);
  const junk = parseTones("R,Q");
  assert.match(junk.err, /"Q" is not a tone — tones are R, 3, 5, 7, 9, 11, 13/);
  // the SAME words the figure field speaks — the parser is shared, not copied
  assert.equal(junk.err, orderBy("tones", "R,Q", []).err, "the figure and the selection refuse in one voice");
  // a pattern digit: the parser refuses it plainly and FLAGS it; only the
  // figure (which has another mode) turns the flag into its switch notice
  assert.match(parseTones("1,2").err, /"1" is not a tone/);
  assert.equal(parseTones("1,2").patternDigit, true);
  assert.match(orderBy("tones", "1,2", []).err, /reads as a string PATTERN/);
});

test("260917-1: each object's degrees derive from STACK_DEPTH; dyad and shell pick from the tetrad's", () => {
  assert.deepEqual(objectDegrees("triad"), [1, 3, 5]);
  assert.deepEqual(objectDegrees("thirteenth"), [1, 3, 5, 7, 9, 11, 13]);
  assert.deepEqual(objectDegrees("dyad"), [1, 3, 5, 7]);
  assert.deepEqual(objectDegrees("shell"), [1, 3, 5, 7]);
  assert.equal(objectDegrees("scale"), null, "a scale has no tones to pick");
  assert.deepEqual(defaultPick("triad"), [1, 3, 5], "a stack's default is the whole stack");
  assert.deepEqual(defaultPick("dyad"), [3, 7], "the guide tones");
  assert.deepEqual(defaultPick("shell"), [1, 3, 7], "R + the guide tones — Shell is a PRESET of the selector (item 2)");
});

test("260917-1: a hand-picked tone set narrows the stack; fewer than the depth is legitimate", () => {
  assert.deepEqual(objectOffsets("triad", [1, 3]), [0, 2]);
  assert.deepEqual(objectOffsets("tetrad", [1, 3, 7]), [0, 2, 6], "a tetrad picked R,3,7 IS a shell — the same offsets");
  assert.deepEqual(objectOffsets("ninth", [1, 3, 7, 9]), [0, 2, 6, 8]);
  assert.deepEqual(objectOffsets("thirteenth", [1, 13]), [0, 12]);
  assert.deepEqual(objectOffsets("shell", [1, 7]), [0, 6], "shell edited is a pick like any other");
  assert.deepEqual(objectOffsets("shell"), [0, 2, 6], "shell unedited is R,3,7 (unchanged)");
  const fld = field({ key: "Bb", scale: "major" });
  assert.deepEqual(diatonicTones(fld, 0, objectOffsets("tetrad", [1, 3, 7])).map((t) => t.role), ["R", "3", "7"]);
});

test("260917-1: a tone the object cannot hold refuses BY NAME — the object's own degrees in the sentence", () => {
  assert.throws(() => objectOffsets("triad", [1, 13]), /13 is not a tone of a triad — a triad holds R, 3, 5/);
  assert.throws(() => objectOffsets("tetrad", [1, 9]), /9 is not a tone of a tetrad — a tetrad holds R, 3, 5, 7/);
  assert.throws(() => objectOffsets("tetrad", [3, 3]), /distinct/, "a repeat is refused");
  assert.throws(() => objectOffsets("tetrad", []), /at least one/, "an empty pick is refused, never a silent full stack");
  assert.throws(() => objectOffsets("dyad", [1, 3, 5]), /two/, "a dyad is exactly two");
  assert.throws(() => objectOffsets("triad", [2]), /2 is not a tone/, "a scale step is not a chord tone");
});

test("260917-1: tonePick is the ONE place the legacy word is known — saved études carrying `dyad` still restore", () => {
  assert.deepEqual(tonePick({ tones: [1, 5] }), [1, 5]);
  assert.deepEqual(tonePick({ dyad: [3, 7] }), [3, 7], "a v0.4.x saved étude");
  assert.deepEqual(tonePick({ tones: [1, 3], dyad: [3, 7] }), [1, 3], "tones wins when both are present");
  assert.equal(tonePick({}), null, "no pick → the object's default");
});

test("260917-1 (BUILT, PROPOSED OTHERWISE): the grip's named drop still applies to a hand-picked set", () => {
  // The dispatch asked which outranks which — an explicit choice, or the
  // automatic drop rule. BUILT tonight: the rule applies unchanged (a pick
  // is a stack like any other). PROPOSED (rule 11): an explicit choice
  // outranks the rule and the refusal is named instead. If Daniel rules
  // for the proposal, this pin is rewritten with the reason.
  const fld = field({ key: "Bb", scale: "major" });
  const picked = diatonicTones(fld, 0, objectOffsets("ninth", [1, 5, 9]));
  const fit = gripFit(picked, 2);
  assert.deepEqual(fit.dropped, ["5"], "the 5th, though chosen by hand, is dropped by the rule (built)");
  assert.deepEqual(fit.tones.map((t) => t.role), ["R", "9"]);
});
