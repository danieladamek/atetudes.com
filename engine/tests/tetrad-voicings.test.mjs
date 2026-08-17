/* tetrad-voicings.test.mjs — the voicing families, against the frozen oracle.
 *
 * Tetradetudes child 1. Three things this suite exists to establish, in the
 * order they gate the item:
 *
 *   1. THE ARITY CLAIM. The scoping pass asserted that engine/isolation.mjs is
 *      already arity-agnostic and needs no "tetrad support". That claim is the
 *      whole item's scope, so it is PROVEN here at arity 4 end to end, not
 *      taken on trust.
 *   2. THE ORACLE. Every one of the frozen study's 17,280 precomputed voicings
 *      must be a member of what this generator produces, matched on frets. If
 *      the generator disagrees with the payload, the generator is wrong.
 *   3. THE SHELLS DECISION, on arity evidence rather than taste — including the
 *      demonstration that a mixed-arity stream corrupts silently, which is what
 *      makes the decision a law rather than a preference.
 *
 * The frozen study is read and never written (§5.2.1).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseChord } from "../chord.mjs";
import { chooseVoicings, makeZone, voiceLeadCost, movementTotal } from "../isolation.mjs";
import {
  ARITY, FAMILIES, SHELLS, coreTetrad, closeStack, dropVoice, shapesOf,
  placeOnSet, tetradCandidates, shellCandidates, rootlessTetrad, assertUniformArity,
} from "../tetrad-voicings.mjs";
import { loadOracle, oracleVoicings, midisOf } from "./_load-tetrad-oracle.mjs";

const pc = (n) => ((n % 12) + 12) % 12;

/* ================= 1. the arity claim, proven ================= */

test("THE GATE: isolation.mjs drives FOUR voices with no change — chooseVoicings via candidatesFor", () => {
  const set = [40, 45, 50, 55];                       // E–A–D–G
  const strings = [6, 5, 4, 3];                       // real string numbers, low → high
  const seq = ["Cmaj7", "Dm7", "G7", "Cmaj7"].map(parseChord);
  const zone = makeZone({ string: 6, frets: [7, 8, 9, 10] });

  const voiced = chooseVoicings(seq, {
    zone, placement: "grip", setLowHigh: strings, nfrets: 16,
    candidatesFor: (ch) => tetradCandidates(ch, { set, nfrets: 16, strings }),
  });

  assert.equal(voiced.length, 4, "one voicing per chord");
  for (const [i, v] of voiced.entries()) {
    assert.ok(v, `chord ${i} got no voicing`);
    assert.equal(v.notes.length, ARITY, `chord ${i} is not four voices`);
    // the voicing really is that chord: its pitch classes are the chord's
    assert.deepEqual(new Set(v.notes.map((n) => pc(n.midi))),
      new Set(seq[i].pcs.map(pc)), `chord ${i} does not hold ${seq[i].symbol}`);
  }
  // and the cost functions are meaningful at arity 4, not NaN
  const cost = voiceLeadCost(voiced[1], voiced[0]);
  assert.ok(Number.isFinite(cost) && cost >= 0, `voiceLeadCost is ${cost} at arity 4`);
  assert.ok(Number.isFinite(movementTotal(voiced)), "movementTotal is not finite at arity 4");
});

test("THE GATE, negative: nothing in the optimizer is pinned to three voices", () => {
  // the same call at arity 3 and arity 4 both work — that is what
  // "arity-agnostic" means, and it is the claim the item's scope rests on
  const seq = ["Cmaj7", "Fmaj7"].map(parseChord);
  const four = chooseVoicings(seq, {
    zone: makeZone({ string: 6, frets: [7, 8, 9] }), placement: "grip",
    setLowHigh: [6, 5, 4, 3], nfrets: 16,
    candidatesFor: (ch) =>
      tetradCandidates(ch, { set: [40, 45, 50, 55], nfrets: 16, strings: [6, 5, 4, 3] }),
  });
  const three = chooseVoicings(seq, {
    zone: makeZone({ string: 6, frets: [7, 8, 9] }), placement: "grip",
    setLowHigh: [6, 5, 4], nfrets: 16,
    candidatesFor: (ch) =>
      shellCandidates(ch, { set: [40, 45, 50], nfrets: 16, strings: [6, 5, 4] }),
  });
  assert.equal(four[0].notes.length, 4);
  assert.equal(three[0].notes.length, 3);
});

/* ================= 2. the oracle ================= */

const data = loadOracle();
const ORACLE = oracleVoicings(data);

/* THE COVERAGE GAP, pinned rather than skipped.
 *
 * The payload spells the augmented-major seventh "+M7" (harmonic and melodic
 * minor's III chord), and engine/chord.mjs's tokenizer does not read that
 * spelling — "+" is the augmented triad and "M7" is then an unrecognized tail.
 * The STRUCTURE is not missing: [0,4,8,11] is already reachable as maj7 + #5.
 * Only the spelling is.
 *
 * This item cannot close it. chord.mjs is inlined VERBATIM into two shipped
 * studies and pinned byte-for-byte by notepad.test.mjs's anti-drift assertion,
 * so extending it means re-inlining and re-verifying both carriers — work under
 * static/, which this item may not touch. It is a separate item.
 *
 * So the gap is measured, named and asserted here. The day chord.mjs learns the
 * spelling, THIS TEST FAILS — which is the prompt to widen the oracle assertion
 * to the full 17,280 rather than leaving 8.3% quietly uncovered forever. */
const readable = (v) => { try { parseChord(v.symbol); return true; } catch { return false; } };
const READABLE = ORACLE.filter(readable);
const UNREADABLE = ORACLE.filter((v) => !readable(v));

test("the oracle loads at the shape this suite expects", () => {
  assert.equal(ORACLE.length, 17280, "5 engines x 3 scales x 3 sets x 12 keys x 4 bottoms x 8 steps");
  assert.equal(data.sets.length, 3);
  for (const s of data.sets) assert.equal(s.opens.length, ARITY, "a set is four strings");
});

test("GAP: exactly the augmented-major sevenths are unreadable, and nothing else", () => {
  assert.equal(UNREADABLE.length, 1440, "the unreadable slice changed size");
  assert.equal(READABLE.length, 15840, "oracle coverage changed");
  assert.deepEqual([...new Set(UNREADABLE.map((v) => v.symbol.replace(/^[A-G][#b]?/, "")))], ["+M7"],
    "something other than +M7 became unreadable — investigate before widening the filter");

  // the structure is reachable, only the spelling is not — so this is a
  // tokenizer gap, not a missing chord rule
  assert.deepEqual(parseChord("Cmaj7#5").intervals, [0, 4, 8, 11]);
  assert.throws(() => parseChord("C+M7"), /unrecognized "M7"/,
    "chord.mjs now reads +M7 — close this gap: widen the oracle assertion to all 17,280 " +
    "and delete the READABLE/UNREADABLE split");
});

test("every payload voicing is internally consistent: four ascending notes of its own chord", () => {
  for (const v of READABLE) {
    const midis = midisOf(v);
    assert.equal(midis.length, ARITY);
    for (let i = 1; i < midis.length; i++)
      assert.ok(midis[i] > midis[i - 1], `${v.symbol} is not ascending: ${v.frets}`);
    const ch = parseChord(v.symbol);
    assert.deepEqual(new Set(midis.map(pc)), new Set(ch.pcs.map(pc)),
      `${v.symbol} frets ${v.frets} do not spell the chord`);
  }
});

test("FINDING: the payload is entirely drop-2 — its tone orderings are exactly the four drop-2 inversions", () => {
  // read the orderings out of the payload as chord-tone INDEX patterns, so
  // alteration spelling (b5/#5/b7) cannot fragment them
  const seen = new Set();
  for (const v of READABLE) {
    const ch = parseChord(v.symbol);
    const core = coreTetrad(ch);
    const pattern = midisOf(v).map((m) => core.findIndex((iv) => pc(ch.root.pc + iv) === pc(m)));
    assert.ok(!pattern.includes(-1), `${v.symbol}: a note outside the core tetrad`);
    seen.add(pattern.join(","));
  }
  const drop2 = new Set(shapesOf(parseChord("Cmaj7"), "drop2").map((s) => s.tones.join(",")));
  assert.deepEqual(seen, drop2,
    "the payload's orderings are not exactly the drop-2 family — the oracle's scope changed");
});

test("THE ORACLE: all 15,840 readable known-good voicings are produced by the generator", () => {
  // candidates are per (chord symbol, set) — cache, or this is 17,280 rebuilds
  const cache = new Map();
  const candidatesFor = (symbol, setIndex, opens) => {
    const k = symbol + "@" + setIndex;
    if (!cache.has(k))
      cache.set(k, new Set(
        tetradCandidates(parseChord(symbol), { set: opens, nfrets: 24, families: ["drop2"] })
          .map((c) => c.notes.map((n) => n.fret).join(","))));
    return cache.get(k);
  };

  const misses = [];
  for (const v of READABLE) {
    const have = candidatesFor(v.symbol, v.setIndex, v.opens);
    if (!have.has(v.frets.join(",")))
      misses.push(`${v.symbol} on set ${v.setIndex} bottom ${v.bottom}: frets ${v.frets}`);
  }
  assert.deepEqual(misses.slice(0, 10), [],
    `${misses.length} of ${READABLE.length} readable payload voicings are not generated`);
});

test("the oracle grep is surgical, not vacuous: a wrong fret is NOT accepted", () => {
  const v = READABLE[0];
  const have = new Set(
    tetradCandidates(parseChord(v.symbol), { set: v.opens, nfrets: 24, families: ["drop2"] })
      .map((c) => c.notes.map((n) => n.fret).join(",")));
  assert.ok(have.has(v.frets.join(",")), "sanity: the real voicing is accepted");
  const bent = [...v.frets]; bent[0] += 1;
  assert.ok(!have.has(bent.join(",")), "a voicing one fret out was accepted — the check proves nothing");
});

/* The `bottoms` axis is the STARTING bottom tone, not an invariant of the pass.
 * Established by inspection when a first version of this test assumed the
 * stronger claim and the payload refused it: Scaler holds its inversion for all
 * eight steps, but Cycling 4ths/5ths rotate through two inversions and Cycling
 * 6ths/3rds through all four — because their rules hold some voices and move
 * others, which is exactly what changes the bass. The payload was right and the
 * assumption was wrong; both true statements are pinned separately below. */

const bassToneOf = (v) => {
  const ch = parseChord(v.symbol);
  const core = coreTetrad(ch);
  return core.findIndex((iv) => pc(ch.root.pc + iv) === pc(midisOf(v)[0]));
};

test("the payload's bottom-tone axis is the bass of STEP 0 of every pass", () => {
  const BOTTOM_TONE = { R: 0, 3: 1, 5: 2, 7: 3 };     // the axis, as chord-tone index
  let checked = 0;
  for (const v of READABLE) {
    if (v.step !== 0) continue;
    assert.equal(bassToneOf(v), BOTTOM_TONE[v.bottom],
      `${v.symbol} starts the ${v.bottom} pass but its bass is core tone ${bassToneOf(v)}`);
    checked++;
  }
  // 2,160 passes = 17,280 / 8, and EVERY one of them is checked: the
  // augmented-major seventh is a III chord and never seeds a pass, so the
  // coverage gap costs this assertion nothing at all
  assert.equal(checked, 17280 / 8, "a pass lost its seed — coverage is no longer complete here");
});

test("every leaf's own inversion label agrees with its read-back bass, at every step", () => {
  const INV_TONE = { root: 0, "1st": 1, "2nd": 2, "3rd": 3 };   // ordinal naming, not vocabulary
  for (const v of READABLE)
    assert.equal(bassToneOf(v), INV_TONE[v.inversion],
      `${v.symbol} is labelled "${v.inversion}" but its bass is core tone ${bassToneOf(v)}`);
});

test("and the inversion genuinely rotates mid-pass for the cycling engines — the reason the axis is only a seed", () => {
  const perEngine = new Map();
  for (const v of ORACLE) {
    if (!perEngine.has(v.engine)) perEngine.set(v.engine, new Set());
    perEngine.get(v.engine).add(v.inversion);
  }
  assert.equal(perEngine.get("S").size, 4, "Scaler: four passes, each holding one inversion");
  for (const eng of ["4", "5", "6", "3"])
    assert.ok(perEngine.get(eng).size > 1,
      `engine ${eng} never changes inversion — the seed reading would then be the whole story`);
});

/* ================= 3. the families, structurally ================= */

test("close position is the chord's own tones, in order, from each inversion", () => {
  const ch = parseChord("Cmaj7");
  const core = coreTetrad(ch);
  assert.deepEqual(core, [0, 4, 7, 11]);
  assert.deepEqual(closeStack(core, 0).map((p) => p.offset), [0, 4, 7, 11]);
  assert.deepEqual(closeStack(core, 1).map((p) => p.offset), [0, 3, 7, 8]);   // E G B C
  assert.deepEqual(closeStack(core, 2).map((p) => p.offset), [0, 4, 5, 9]);   // G B C E
  assert.deepEqual(closeStack(core, 3).map((p) => p.offset), [0, 1, 5, 8]);   // B C E G
});

test("drop-2 and drop-3 are one rule with a parameter, and each moves the named voice", () => {
  const core = coreTetrad(parseChord("Cmaj7"));
  const close = closeStack(core, 0);                       // C E G B
  // drop-2: the 2nd from the top is G — it lands below C
  assert.deepEqual(dropVoice(close, 2).map((p) => p.tone), [2, 0, 1, 3]);
  // drop-3: the 3rd from the top is E
  assert.deepEqual(dropVoice(close, 3).map((p) => p.tone), [1, 0, 2, 3]);
  // drop-0 is the identity
  assert.deepEqual(dropVoice(close, 0).map((p) => p.offset), close.map((p) => p.offset));
});

test("root-position shapes are the textbook ones, for every family", () => {
  const ch = parseChord("Cmaj7");
  const rootPos = (f) => shapesOf(ch, f).find((s) => s.bass === 0);
  assert.deepEqual(rootPos("close").offsets, [0, 4, 7, 11], "close root: R-3-5-7");
  assert.deepEqual(rootPos("drop2").offsets, [0, 7, 11, 16], "drop-2 root: R-5-7-3");
  assert.deepEqual(rootPos("drop3").offsets, [0, 11, 16, 19], "drop-3 root: R-7-3-5");
});

test("every family, every inversion, every quality: four distinct tones of that chord", () => {
  // "maj7#5" is the augmented-major seventh in the spelling chord.mjs reads —
  // the same structure the payload writes "+M7" (see the GAP pin above)
  const qualities = ["maj7", "m7", "7", "m7b5", "dim7", "mMaj7", "6", "m6", "maj7#5"];
  for (const q of qualities)
    for (const family of Object.keys(FAMILIES))
      for (const s of shapesOf(parseChord("C" + q), family)) {
        assert.equal(s.offsets.length, ARITY, `C${q} ${family}: not four voices`);
        assert.equal(new Set(s.tones).size, ARITY, `C${q} ${family}: a tone is doubled`);
        for (let i = 1; i < s.offsets.length; i++)
          assert.ok(s.offsets[i] > s.offsets[i - 1], `C${q} ${family}: not ascending`);
      }
});

test("each family yields all four bass tones — the inversions are complete, not a subset", () => {
  for (const family of Object.keys(FAMILIES)) {
    const basses = shapesOf(parseChord("G7"), family).map((s) => s.bass).sort();
    assert.deepEqual(basses, [0, 1, 2, 3], `${family} does not cover all four bass tones`);
  }
});

test("drop-3 on the Joe Pass sets — the texture the frozen study cannot show", () => {
  // 6-4-3-2 and 5-3-2-1 are non-adjacent string groups: the skipped string is
  // exactly what makes room for the dropped voice
  for (const set of [[40, 50, 55, 59], [45, 55, 59, 64]]) {
    const cands = tetradCandidates(parseChord("Cmaj7"), { set, nfrets: 16, families: ["drop3"] });
    assert.ok(cands.length > 0, `no drop-3 voicings on set ${set}`);
    for (const v of cands)
      assert.deepEqual(new Set(v.notes.map((n) => pc(n.midi))), new Set([0, 4, 7, 11]));
  }
});

test("placeOnSet refuses an arity mismatch between shape and set", () => {
  const shape = shapesOf(parseChord("Cmaj7"), "drop2")[0];
  assert.throws(() => placeOnSet(shape, parseChord("Cmaj7"), { set: [40, 45, 50] }),
    /arity must match/);
});

test("a triad is refused by name — triads are Triadetudes' generator, not this one", () => {
  assert.throws(() => coreTetrad(parseChord("C")), /needs four tones/);
});

/* ================= 4. rootless, and the cross-link ================= */

test("THE IDENTITY: a rootless Cmaj9 IS an Em7 tetrad", () => {
  const rootless = rootlessTetrad("Cmaj9");
  const em7 = parseChord("Em7");

  // same root, same intervals, same pitch classes — three ways, all derived
  assert.equal(rootless.rootPc, em7.root.pc, "the rootless voicing's root is not E");
  assert.deepEqual(rootless.intervals, em7.intervals, "3-5-7-9 of Cmaj9 is not an m7 structure");
  assert.deepEqual(rootless.pcs.map(pc), em7.pcs.map(pc), "the pitch classes differ");

  // and it is a real tetrad: it voices through the ordinary generator
  const asTetrad = tetradCandidates(em7, { set: [40, 45, 50, 55], nfrets: 16 });
  assert.ok(asTetrad.length > 0, "the rootless chord does not voice as a tetrad");
});

test("the identity is not a coincidence of C: it holds for every maj9", () => {
  for (const root of ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]) {
    const rootless = rootlessTetrad(root + "maj9");
    // the third of the maj9 is the root of the m7 it becomes
    const third = pc(parseChord(root + "maj9").root.pc + 4);
    assert.equal(rootless.rootPc, third, `${root}maj9 rootless is not rooted on its third`);
    assert.deepEqual(rootless.intervals, [0, 3, 7, 10], `${root}maj9 rootless is not an m7`);
  }
});

test("the dominant case too: a rootless C9 is a Gm6 structure (3-5-7-9 of C9)", () => {
  const r = rootlessTetrad("C9");
  // E G Bb D — the same four pitch classes as Gm6 (G Bb D E)
  assert.deepEqual(new Set(r.pcs.map(pc)), new Set(parseChord("Gm6").pcs.map(pc)));
});

test("rootless refuses a chord with no ninth, by name", () => {
  assert.throws(() => rootlessTetrad("Cmaj7"), /needs a ninth/);
});

/* ================= 5. the shells, and the arity law ================= */

test("THE EVIDENCE for the shells decision: a mixed-arity stream is refused in both directions", () => {
  const four = tetradCandidates(parseChord("Cmaj7"), { set: [40, 45, 50, 55], nfrets: 16 })[0];
  const three = shellCandidates(parseChord("Cmaj7"), { set: [40, 45, 50], nfrets: 16 })[0];

  // Direction 1 — this one always threw, but only by accident: it read
  // prev.notes[3].midi off undefined. It is a NAMED refusal now, not a
  // TypeError, which is why this asserts the message rather than the type.
  assert.throws(() => voiceLeadCost(four, three), /arity mismatch — 4 voices compared against 3/,
    "the loud direction stopped naming both arities — re-derive the shells decision");

  // Direction 2 — this WAS the silent one, and it is the reason the shells
  // decision exists: iterating three voices against a four-voice previous
  // returned an ordinary number, so the shell was measured over fewer voices,
  // looked cheap, won on cost, and nothing reported anything.
  //
  // FIXED AT SOURCE 2026-08-17 (Update Log 260817.2). isolation.mjs now refuses
  // both directions by name, so this asserts the fix rather than the defect.
  // The decision it justified is unchanged — a shell still may not share a
  // stream with a tetrad — but it is now enforced by the module that does the
  // comparing, which is what every LATER consumer inherits.
  assert.throws(() => voiceLeadCost(three, four), /arity mismatch/,
    "the once-silent direction is silent again — the source fix regressed");

  // and the caller-side guard stays: it fires EARLIER, where a stream is built,
  // with a message about shells rather than about voices
  assert.throws(() => assertUniformArity([four, three]), /mixed arity/);
  assert.throws(() => assertUniformArity([three, four]), /mixed arity/);
});

test("shells are three voices, are R-3-7 / R-7-3, and hold the guide tones over the root", () => {
  const ch = parseChord("Cmaj7");
  for (const order of Object.keys(SHELLS)) {
    const cands = shellCandidates(ch, { set: [40, 45, 50], nfrets: 16, orders: [order] });
    assert.ok(cands.length > 0, `no ${order} shells`);
    for (const v of cands) {
      assert.equal(v.notes.length, 3, `${order} is not three voices`);
      // R, 3 and 7 — and crucially NOT the 5th
      assert.deepEqual(new Set(v.notes.map((n) => pc(n.midi))), new Set([0, 4, 11]),
        `${order} does not hold exactly R, 3 and 7`);
      assert.ok(!v.notes.some((n) => pc(n.midi) === 7), `${order} kept the fifth`);
    }
  }
});

test("R-3-7 and R-7-3 differ in the order of the guide tones, which is the point", () => {
  const ch = parseChord("Cmaj7");
  const set = [40, 45, 50];
  const a = shellCandidates(ch, { set, nfrets: 16, orders: ["R-3-7"] })[0];
  const b = shellCandidates(ch, { set, nfrets: 16, orders: ["R-7-3"] })[0];
  assert.deepEqual(a.notes.map((n) => pc(n.midi)), [0, 4, 11], "R-3-7 order");
  assert.deepEqual(b.notes.map((n) => pc(n.midi)), [0, 11, 4], "R-7-3 order");
});

test("tetradCandidates NEVER emits a shell — the streams are separate by construction", () => {
  const cands = tetradCandidates(parseChord("Cmaj7"), { set: [40, 45, 50, 55], nfrets: 16 });
  assert.ok(cands.length > 0);
  for (const v of cands) assert.equal(v.notes.length, ARITY);
  assert.ok(!cands.some((v) => v.family === "shell"), "a shell reached the tetrad stream");
});

/* ================= 6. the frozen study is untouched ================= */

test("this suite only READS the frozen study (§5.2.1)", async () => {
  const { readFileSync } = await import("node:fs");
  const { STUDY } = await import("./_load-tetrad-oracle.mjs");
  const before = readFileSync(STUDY).length;
  loadOracle();
  oracleVoicings();
  assert.equal(readFileSync(STUDY).length, before, "the frozen study changed size");
  const src = readFileSync(new URL("./_load-tetrad-oracle.mjs", import.meta.url), "utf8");
  assert.ok(!/writeFileSync|appendFile|createWriteStream|rmSync|unlink/.test(src),
    "the oracle loader must contain no write path at all");
});
