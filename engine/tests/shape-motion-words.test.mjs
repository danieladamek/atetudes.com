/* shape-motion-words.test.mjs — night 42 (261006): the Shape & Motion panel says two true things
 *
 * Ruling 260907 ("the close-voicing span is not a regression; the box is the defect"): the
 * voicings stay exactly as they are; the panel stops implying they will fit. Two items, both
 * WORDS, both in hub/modules/shape-motion.mjs, nothing in engine/ moves.
 *
 *   1. THE FAMILY SAYS WHAT IT COSTS. Close and drop-3 cannot fit a hand position (measured
 *      at 148fda6: close spans > 4 frets in 349 of 576 bars, drop-3 in 462; drop-2 never).
 *      The clause is a PURE FUNCTION OF THE FAMILY KEY — it reads no pass, no voicing, no
 *      fret, no span, no zone. What 2026-08-21 retracted was measurement of the chosen
 *      pass; a sentence true before a chord is picked is not a reporter. The licence is
 *      thin, so it is pinned STRUCTURALLY: for a fixed family the clause is byte-identical
 *      over a corpus of keys, scales, sets, zones, both bind states, placements and
 *      figures; the function takes one argument; the module never imports a pass.
 *   2. GRIP AND FREE STOP LYING WHILE BOUND. Bound (the default), bindFilter has already
 *      pinned the anchor voice to a zone fret, so Grip's pivot term is zero on every
 *      candidate and Grip and Free reach the same grip (831 of 864 bars at 148fda6). The
 *      panel used to say the opposite. The three sites of the placement's words — the
 *      segment button's title, the narration, the dependency clause — are ONE source.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { narrate, familyCostClause, placementWords, placementDependency, PLACE_LABEL } from "../../hub/modules/shape-motion.mjs";
import { FAMILIES } from "../tetrad-voicings.mjs";
import { STRING_SETS } from "../tetrad-sequence.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(here, "..", "..", "hub", "modules", "shape-motion.mjs"), "utf8");

/* THE CORPUS: everything the panel could be told, including what it does not read (key,
 * scale, cycle ride the announcements and are carried into cfg as extras here) */
const KEYS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const ZONES = [null, { string: 6, frets: [5, 7, 8] }, { string: 4, frets: [6, 8, 9], bind: true },
  { string: 5, frets: [1, 3, 5], bind: false }, { string: 6, frets: [10, 12, 13], bind: false }];
function* corpus(family) {
  for (const key of KEYS) for (const scale of ["major", "harm", "mel"]) for (let setIndex = 0; setIndex < STRING_SETS.length; setIndex++)
    for (const zone of ZONES) for (const placement of ["grip", "free"]) for (const figure of ["", "6-5-4-3"])
      yield { key, scale, cycle: "fourths", setIndex, families: [family], placement, zone, roots: false,
              address: "pattern", figure, playback: figure ? "arpeggiated" : "strum", guide: false };
}

test("item 1: close and drop-3 say what they cost; drop-2 says nothing — stated only when true", () => {
  assert.equal(familyCostClause("drop2"), "", "drop-2 fits a position: no clause, so an inert fact does not announce itself");
  for (const f of ["close", "drop3"]) {
    const c = familyCostClause(f);
    assert.ok(c.length > 20, `${f} states its cost`);
    assert.ok(!/\d/.test(c.replace(/drop-3/gi, "")), `${f}'s clause carries no number — no fret, no span: ${c}`);
    assert.ok(!/reach(ed)?\s+\d|this bar|outside the box/i.test(c), `${f}'s clause is not a reporter: ${c}`);
  }
  assert.deepEqual(Object.keys(FAMILIES).sort(), ["close", "drop2", "drop3"].sort(), "the families the clause map must cover");
  for (const f of Object.keys(FAMILIES)) assert.equal(typeof familyCostClause(f), "string");
});

test("item 1, STRUCTURAL: for a fixed family the clause is byte-identical over the whole corpus — a pure function of the family key", () => {
  let n = 0;
  for (const family of Object.keys(FAMILIES)) {
    const want = familyCostClause(family);
    const seen = new Map();   // clause text -> the first cfg that produced it
    for (const cfg of corpus(family)) {
      const parts = narrate(cfg);
      const clauses = parts.filter((p) => p === want || /reach past|hand position|fit to find/i.test(p));
      if (want) {
        assert.equal(clauses.length, 1, `[${family}] exactly one family clause in ${JSON.stringify(parts)} for ${JSON.stringify(cfg)}`);
      } else {
        assert.equal(clauses.length, 0, `[${family}] drop-2 says nothing about a cost, yet: ${JSON.stringify(clauses)}`);
      }
      const key = clauses.join(" ");
      if (!seen.has(key)) seen.set(key, cfg);
      n++;
    }
    assert.equal(seen.size, 1, `[${family}] the family clause VARIED across the corpus — it read something that is not the family:\n` +
      [...seen.entries()].map(([k, c]) => `  ${JSON.stringify(k)}  <- ${JSON.stringify(c)}`).join("\n"));
  }
  assert.ok(n >= 3 * 12 * 3 * 3 * 5 * 2 * 2, `not vacuous: ${n} renders`);
});

test("item 1, the guard: the clause function takes the family and nothing else, and the module can see no pass", () => {
  assert.equal(familyCostClause.length, 1, "familyCostClause(family) — one argument");
  assert.match(String(familyCostClause), /^\(?family\)?\s*=>\s*FAMILY_COST\[family\]/,
    "familyCostClause reads the map by the family key and nothing else: " + String(familyCostClause));
  const imports = [...SRC.matchAll(/^import \{([^}]*)\} from "([^"]+)";/gm)].map((m) => [m[2], m[1].trim()]);
  assert.ok(imports.length >= 5, "the module's imports were read");
  for (const [from, names] of imports) {
    assert.ok(!/tetradPass|chooseVoicings|placementCost|makeZone|tetradCandidates/.test(names),
      `hub/modules/shape-motion.mjs imports a pass or a cost from ${from} (${names}) — the panel must not be able to look at a voicing`);
  }
  assert.ok(/familyCostClause\(cfg\.families\[0\]\)/.test(SRC), "the narration reaches the clause through familyCostClause(cfg.families[0])");
  assert.equal((SRC.match(/familyCostClause\(/g) || []).length, 1, "the clause is CALLED once, from the narration — no second path into the hint");
  assert.ok(/const FAMILY_LABEL = [\s\S]{0,3000}const FAMILY_COST = /.test(SRC), "FAMILY_COST sits next to FAMILY_LABEL — one place to read");
});

test("item 2: bound (the default, zone null) says Grip and Free reach the same grip; unbound keeps the old true sentence", () => {
  const base = { setIndex: 2, families: ["close"], roots: false, address: "pattern", figure: "", playback: "strum", guide: false };
  for (const zone of [null, { string: 4, frets: [6, 8, 9] }, { string: 4, frets: [6, 8, 9], bind: true }]) {
    for (const placement of ["grip", "free"]) {
      const parts = narrate({ ...base, placement, zone });
      const dep = parts.filter((p) => /same grip/.test(p));
      assert.equal(dep.length, 1, `bound ${placement} zone ${JSON.stringify(zone)}: the dependency is stated: ${JSON.stringify(parts)}`);
      assert.equal(dep[0], placementDependency(true));
      assert.ok(!parts.some((p) => /won't pull/.test(p)), `bound: the false sentence is gone: ${JSON.stringify(parts)}`);
      assert.ok(/releas/.test(dep[0]) && /neck/.test(dep[0]), "…and says that releasing the anchor on the neck is what makes them differ");
      assert.ok(!/\bbind\b/i.test(dep[0]), "rule 14: the bind control is named by what it does, never by its caption");
    }
  }
  const unboundFree = narrate({ ...base, placement: "free", zone: { string: 4, frets: [6, 8, 9], bind: false } });
  assert.ok(unboundFree.includes("Free releases the zone, so the Box on the neck won't pull — choose Grip to practise inside it"),
    "unbound Free keeps the existing sentence verbatim (rule 7): " + JSON.stringify(unboundFree));
  assert.ok(!unboundFree.some((p) => /same grip/.test(p)), "unbound: the bound sentence is not stated");
  const unboundGrip = narrate({ ...base, placement: "grip", zone: { string: 4, frets: [6, 8, 9], bind: false } });
  assert.ok(!unboundGrip.some((p) => /same grip|won't pull/.test(p)), "unbound Grip: neither dependency sentence — nothing is true to say");
});

test("item 2, rule 10 / rule 6: the placement's three sites are ONE source", () => {
  for (const bound of [true, false]) {
    for (const p of Object.keys(PLACE_LABEL)) {
      const w = placementWords(p, bound);
      assert.ok(typeof w === "string" && w.length > 10, `${p} ${bound ? "bound" : "unbound"} has words`);
    }
    const parts = narrate({ setIndex: 0, families: ["drop2"], placement: "free", roots: false, address: "pattern", figure: "", playback: "strum", guide: false,
      zone: bound ? null : { string: 6, frets: [5, 7, 8], bind: false } });
    assert.ok(parts.includes(`${PLACE_LABEL.free}: ${placementWords("free", bound)}`), `the narration's placement words are placementWords(): ${JSON.stringify(parts)}`);
  }
  assert.notEqual(placementWords("free", true), placementWords("free", false), "Free's words differ by bind — bound, the release has nothing left to release");
  assert.equal(placementWords("grip", true), placementWords("grip", false));
  // the segment button's title is built from the same function — no second literal anywhere in the module
  assert.ok(/title: placementWords\(p, bound\)/.test(SRC), "#placeSeg's button title reads placementWords(p, bound)");
  for (const lit of ["anchor released", "one note per string, anchored to the zone", "needs the line voicer, not wired yet"])
    assert.equal((SRC.match(new RegExp(lit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1,
      `"${lit}" is written ONCE in shape-motion.mjs — the single source`);
  assert.ok(/const PLACE_LABEL = [\s\S]{0,3000}placementWords = /.test(SRC), "placementWords sits by PLACE_LABEL");
});
