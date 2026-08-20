/* upper-structure.test.mjs — roadmap §3.1's decomposition table as the corpus.
 *
 * The table is the ASSERTION CORPUS, not the implementation (backlog item,
 * golden rule 1): every expected triad root is DERIVED here as chord-root +
 * named degree interval, every expected pc set as triad-root + shape — the
 * test encodes the rule, then checks the module's independent derivation
 * agrees. Run: node --test "engine/tests/*.test.mjs"
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseChord, pcOf, resolveRoman } from "../chord.mjs";
import { upperStructures, candidateKey, findCandidate } from "../upper-structure.mjs";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";
import { preHubCarriersOf } from "./_carriers.mjs";

const mod12 = (n) => ((n % 12) + 12) % 12;
const SHAPES = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8] };
const triadPcsFrom = (rootPc, q) => SHAPES[q].map((iv) => mod12(rootPc + iv));

// ---- the §3.1 table: [symbol, degree-interval of the triad root, quality,
//      expected label, expected degrees (stacked from the triad root), why] ----

const TABLE = [
  ["Cmaj7", 4, "min", "Em", ["3", "5", "7"], "rootless maj7"],
  ["Cmaj9", 7, "maj", "G", ["5", "7", "9"], "maj9 color"],
  ["C6", 9, "min", "Am", ["6", "R", "3"], "6th chord = relative minor"],
  ["Dm7", 3, "maj", "F", ["b3", "5", "b7"], "rootless m7"],
  ["Dm9", 7, "min", "Am", ["5", "b7", "9"], "m9 color"],
  ["G7", 4, "dim", "B°", ["3", "5", "b7"], "rootless dominant"],
  ["G9", 4, "dim", "B°", ["3", "5", "b7"], "dominant default keeps the guide tones"],
  ["G7b9", 1, "dim", "Ab°", ["b9", "3", "5"], "classic b9 sound"],
  ["G7alt", 6, "maj", "Db", ["b5", "b7", "b9"], "tritone sub upper"],
  ["Cm7b5", 3, "min", "Ebm", ["b3", "b5", "b7"], "rootless ø"],
  ["C°7", 3, "dim", "Eb°", ["b3", "b5", "bb7"], "stacked m3 — rotate per repeat"],
];

for (const [sym, rootIv, quality, label, degrees, why] of TABLE) {
  test(`§3.1 ${sym} → ${label} (${why})`, () => {
    const parsed = parseChord(sym);
    const { candidates, bass } = upperStructures(parsed);
    assert.ok(candidates.length, `${sym} has candidates`);
    const c = candidates[0];
    const wantRoot = mod12(parsed.root.pc + rootIv);
    assert.equal(c.root.pc, wantRoot, "triad root derived from chord root + degree");
    assert.equal(c.quality, quality, "quality");
    assert.deepEqual(c.pcs, triadPcsFrom(wantRoot, quality), "pcs = root + shape");
    assert.deepEqual(c.degrees, degrees, "degrees stacked from the triad root");
    assert.equal(c.label, label, "spelled label");
    assert.equal(bass.pc, parsed.root.pc, "auto bass = the chord root");
  });
}

// ---- structural soundness of every candidate the module ever returns ----

test("every candidate is a well-formed triad whose members are chord tones or declared tensions", () => {
  const probe = ["Cmaj7","Cmaj9","C6","Cm6","Dm7","Dm9","Dm11","G7","G9","G13",
    "G7b9","G7#9","G7alt","G7#5","G7sus4","G9sus4","Cm7b5","C°7","CmMaj7",
    "Fmaj7#11","C","Am","F#dim","Bbaug","F/G","Fmaj7/C","Cadd9","Bbm7","Ebmaj9"];
  for (const sym of probe) {
    const parsed = parseChord(sym);
    const { candidates } = upperStructures(parsed);
    for (const c of candidates) {
      const rel = c.pcs.map((p) => mod12(p - c.root.pc)).sort((a, b) => a - b);
      assert.deepEqual(rel, SHAPES[c.quality], `${sym} ${c.label}: shape`);
      for (let k = 0; k < 3; k++) {
        const inChord = parsed.pcs.includes(c.pcs[k]);
        const declared = c.added.includes(c.degrees[k]);
        assert.ok(inChord || declared,
          `${sym} ${c.label}: member ${c.pcs[k]} (${c.degrees[k]}) accounted for`);
      }
      assert.equal(new Set(c.pcs).size, 3, `${sym} ${c.label}: pcs unique`);
    }
  }
});

// ---- the multi-structure cases: the chip's "▾" menu ----

test("G9 offers B° and F — the user picks per chord (§3.1)", () => {
  const { candidates } = upperStructures(parseChord("G9"));
  const labels = candidates.map((c) => c.label);
  assert.equal(labels[0], "B°", "default keeps the guide tones");
  assert.ok(labels.includes("F"), "the b7 tension triad is offered");
  const f = candidates.find((c) => c.label === "F");
  assert.deepEqual(f.degrees, ["b7", "9", "11"]);
  assert.deepEqual(f.added, ["11"], "the 11 is an added tension, declared");
  assert.equal(f.rule, "tension-b7");
});

test("Cmaj9 offers G (default) and Em; Dm9 offers Am (default) and F", () => {
  const maj9 = upperStructures(parseChord("Cmaj9")).candidates.map((c) => c.label);
  assert.equal(maj9[0], "G");
  assert.ok(maj9.includes("Em"));
  const m9 = upperStructures(parseChord("Dm9")).candidates.map((c) => c.label);
  assert.equal(m9[0], "Am");
  assert.ok(m9.includes("F"));
});

test("G7 and Cmaj7 are single-structure — no ▾", () => {
  assert.equal(upperStructures(parseChord("G7")).candidates.length, 1);
  assert.equal(upperStructures(parseChord("Cmaj7")).candidates.length, 1);
});

// ---- °7's rotation: symmetry as a property, not a list ----

test("C°7: every candidate is dim, roots stack in minor 3rds, symmetric flag set", () => {
  const res = upperStructures(parseChord("C°7"));
  assert.equal(res.symmetric, true, "rotate per repeat");
  assert.equal(res.candidates.length, 3, "three upper rotations (the fourth is the chord itself)");
  const roots = res.candidates.map((c) => c.root.pc);
  for (let i = 0; i < roots.length; i++) {
    assert.equal(res.candidates[i].quality, "dim");
    assert.equal(mod12(roots[i] - pcOf("C")), 3 * (i + 1), "m3 stack above the root");
    for (const pc of res.candidates[i].pcs)
      assert.ok(parseChord("C°7").pcs.includes(pc), "rotation stays inside the °7");
  }
  assert.equal(res.candidates[2].label, "A°", "Bbb° respelled to A° — no double flats shipped");
});

test("mMaj7: the augmented upper structure offers all three rotations, b3 first (v0.6.8)", () => {
  // one shape, three honest names — the aug subset's symmetry made visible
  const { candidates } = upperStructures(parseChord("DmMaj7"));
  assert.deepEqual(candidates.map((c) => c.label), ["F+", "A+", "C#+"]);
  const rels = candidates.map((c) => (c.root.pc - pcOf("D") + 12) % 12);
  assert.deepEqual(rels, [3, 7, 11], "rooted on b3, 5, 7 — lowest degree first");
  for (const c of candidates)
    assert.deepEqual([...c.pcs].sort((a, b) => a - b),
      [...candidates[0].pcs].sort((a, b) => a - b), "all three are the same pitch-class set");
  assert.deepEqual(candidates[0].degrees, ["b3", "5", "7"]);
  assert.deepEqual(candidates[2].degrees, ["7", "b3", "5"], "each rotation reads from its own root");
  // and the aug identity chord still leads with its own root among its rotations
  const aug = upperStructures(parseChord("C+")).candidates;
  assert.equal(aug[0].label, "C+");
  assert.equal(aug.length, 3, "identity plus the two other rotations");
});

test("only °7 is symmetric", () => {
  for (const sym of ["G7", "G9", "Cmaj7", "Cm7b5", "C"])
    assert.equal(upperStructures(parseChord(sym)).symmetric, false, sym);
});

// ---- plain triads and slash basses ----

test("a plain triad is its own material; a slash bass wins the bass", () => {
  const fOverG = upperStructures(parseChord("F/G"));
  assert.equal(fOverG.candidates[0].rule, "triad-identity");
  assert.equal(fOverG.candidates[0].label, "F");
  assert.deepEqual(fOverG.candidates[0].degrees, ["R", "3", "5"]);
  assert.equal(fOverG.bass.pc, pcOf("G"), "the written bass, not the root");
  assert.equal(fOverG.bass.name, "G");
  const slash7 = upperStructures(parseChord("Fmaj7/C"));
  assert.equal(slash7.candidates[0].label, "Am", "rootless maj7 still applies");
  assert.equal(slash7.bass.pc, pcOf("C"));
  const aug = upperStructures(parseChord("C+"));
  assert.equal(aug.candidates[0].root.pc, pcOf("C"), "aug identity keeps its own root");
  assert.equal(aug.candidates[0].label, "C+");
});

test("a chord with no honest triad inside returns empty candidates, not a throw", () => {
  assert.deepEqual(upperStructures(parseChord("Gsus4")).candidates, []);
  assert.deepEqual(upperStructures(parseChord("Dsus2")).candidates, []);
});

test("7sus4 family: the b7 tension triad carries the sus sound", () => {
  const sus = upperStructures(parseChord("G7sus4"));
  assert.equal(sus.candidates[0].label, "F");
  assert.deepEqual(sus.candidates[0].added, ["9"], "the 9 is added over a plain 7sus4");
  const sus9 = upperStructures(parseChord("G9sus4"));
  const f = sus9.candidates.find((c) => c.label === "F");
  assert.ok(f, "F present");
  assert.deepEqual(f.added, [], "over 9sus4 every member is a chord tone");
});

// ---- spelling discipline ----

test("candidates spell by degree, flat-side keys stay flat-side", () => {
  assert.equal(upperStructures(parseChord("Bbm7")).candidates[0].label, "Db");
  assert.equal(upperStructures(parseChord("Ebmaj9")).candidates[0].label, "Bb");
  assert.equal(upperStructures(parseChord("Cbmaj7")).candidates[0].label, "Ebm");
  assert.equal(upperStructures(parseChord("F#7")).candidates[0].label, "A#°");
});

// ---- config round-trip identity ----

test("candidateKey/findCandidate: a stored per-chord choice survives re-derivation", () => {
  const g9 = upperStructures(parseChord("G9"));
  const f = g9.candidates.find((c) => c.label === "F");
  const key = candidateKey(f);
  const again = upperStructures(parseChord("G9"));
  assert.deepEqual(findCandidate(again.candidates, key), f, "same choice after re-derivation");
  assert.equal(findCandidate(again.candidates, "0:maj"), null, "stale key falls back to null");
});

// ---- cross-checks against the SHIPPED study (the break-down thesis) ----

test("cross-check: break-down inverts the study's build-up sevenths exactly", () => {
  // the shipped engine builds Am7 as C/A (triad + third-below bass); the new
  // module must decompose Am7 back to that same C triad — the two directions
  // are independent derivations of one identity
  const e = loadTriadetudesEngine();
  e.st.ext = "third";
  for (const key of e.KEYS) {
    e.st.key = key;
    e.defaultPivots();
    for (const ch of e.buildSequence()) {
      const bass = e.bassPcFor(ch);
      const name = e.tetradName(bass, ch);
      if (name.includes("/")) continue; // non-diatonic fallback names are not sevenths
      const res = upperStructures(parseChord(name));
      const def = res.candidates[0];
      assert.equal(def.root.pc, ch.rootPc, `${key} ${name}: recovers the triad root`);
      assert.equal(def.quality, ch.q, `${key} ${name}: recovers the triad quality`);
      assert.equal(res.bass.pc, bass % 12, `${key} ${name}: bass is the seventh's root`);
    }
  }
});

// ---- anti-drift: the hand-inlined copies in the study must match the modules ----

test("every app carrying the harmony engine matches the modules verbatim (no drift)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  // same transform the inline uses: drop import lines, strip the export keyword
  const inlineForm = (file) =>
    readFileSync(join(here, "..", file), "utf8")
      .split("\n").filter((l) => !/^import /.test(l)).join("\n")
      .replace(/^export /gm, "").replace(/^\n+/, "").replace(/\n+$/, "\n");
  // ALL apps that inline the harmony engine — the census's fact, pre-hub half
  const CARRIERS = preHubCarriersOf("upper-structure");
  assert.ok(CARRIERS.length >= 1, "the census lost the harmony engine's carriers");
  for (const slug of CARRIERS) {
    const src = readFileSync(
      join(here, "..", "..", "static", "studies", slug, "study.html"), "utf8");
    for (const file of ["chord.mjs", "upper-structure.mjs"])
      assert.ok(src.includes(inlineForm(file)),
        `${slug}/study.html has drifted from engine/${file} — re-inline it`);
  }
});

test("cross-check: resolveRoman agrees with the study's own roman handling", () => {
  // the shipped build-up custom parser resolves bare romans to diatonic triads;
  // resolveRoman must land on the same root pc and triad quality in every
  // key × scale the study offers
  const e = loadTriadetudesEngine();
  for (const key of e.KEYS)
    for (const scaleType of ["major", "harm", "mel"]) {
      e.st.key = key;
      e.st.scaleType = scaleType;
      e.st.prog = "custom";
      const toks = unwrap(e.SCALES[scaleType].roman); // the key's own diatonic-case numerals
      e.st.custom = toks.join(" ");
      const seq = e.buildSequence();
      assert.equal(seq.length, 7, `${key} ${scaleType}: study parsed all seven`);
      seq.forEach((ch, d) => {
        const r = resolveRoman(toks[d], key, scaleType);
        assert.ok(r, `${key} ${scaleType} ${toks[d]} resolves`);
        assert.equal(r.parsed.root.pc, ch.rootPc, `${key} ${scaleType} ${toks[d]}: root`);
        assert.equal(r.parsed.triad, ch.q, `${key} ${scaleType} ${toks[d]}: quality`);
      });
    }
});
