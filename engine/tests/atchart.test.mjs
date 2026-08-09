/* atchart.test.mjs — the round-trip law on a corpus of awkward hand-written charts.
 * Spec: docs/atchart-format.md §4. Run: node --test "engine/tests/*.test.mjs"
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAtchart, serializeAtchart } from "../atchart.mjs";

// ---------------- the corpus ----------------
// Each entry is a legitimate chart a human might actually type, including the
// awkward ones the PRD demands. Names describe the awkwardness.

const CORPUS = {
  "minimal — nothing but the version and eight bars": `---
atchart: 1
---

\`\`\`chart
| C | Am | F | G | C | Am | F | G |
\`\`\`
`,

  "the PRD's own example, sections + repeats + subs + log": `---
atchart: 1
title: "Blues for Somebody"
key: F
meter: 4/4
tempo: 132
form: AABA
sections: [A1, A2, B, A3]
---

# Blues for Somebody

\`\`\`chart
@A1  |: Fmaj7 | Bb7 | Fmaj7 | Cm7 F7 :|
@B   | Bb7 | Bdim7 | Fmaj7/C | D7#9 |
\`\`\`

## Substitutions

- A1.b4  Cm7 F7  ->  Cm7 Gb7  [tritone sub]
- B.b2  Bdim7  ->  G7b9  [dim as rootless dom]

## Practice log

- 2026-08-09 · shells, bars 1-8, 96bpm
`,

  "melody lines preserved verbatim": `---
atchart: 1
key: C
---

\`\`\`chart
@A  | Cmaj7 | Dm7 G7 |
    melody: E4/4 G4/8 C5/8 | D5/2
\`\`\`
`,

  "sloppy spacing and unicode arrow": `---
atchart: 1
key:    Bb
tempo: 100
---

\`\`\`chart
|Bbmaj7|G7#5|Cm7   F7|Bb6|
\`\`\`

## Substitutions

- A.b2  G7#5  →  Db9  [tritone sub]
`,

  "prose the format doesn't claim survives": `---
atchart: 1
key: G
---

# My tune

Some notes to self about the bridge.

\`\`\`chart
| Gmaj7 | Em7 | Am7 | D7 |
\`\`\`

## Ideas

Try it as a bossa. This heading is NOT a claimed section.
`,

  "alt dominants, slash bass, half-diminished": `---
atchart: 1
key: C
meter: 3/4
---

\`\`\`chart
@A  |: Dm7b5 | G7alt | Cm6/Eb :|
\`\`\`
`,
};

for (const [name, src] of Object.entries(CORPUS)) {
  test(`round-trip law: ${name}`, () => {
    const doc1 = parseAtchart(src);
    const ser1 = serializeAtchart(doc1);
    const doc2 = parseAtchart(ser1);
    const ser2 = serializeAtchart(doc2);
    // parse → serialize → parse: identical structure
    assert.deepEqual(strip(doc2), strip(doc1), "structure stable through round trip");
    // serialize is a fixed point
    assert.equal(ser2, ser1, "serialization is a fixed point");
  });
}

// parsed chord objects carry derived data; compare the durable structure
function strip(doc) {
  return {
    meta: doc.meta,
    sections: doc.sections.map((s) => ({
      name: s.name,
      melody: s.melody,
      bars: s.bars.map((b) => ({
        repeatStart: b.repeatStart,
        repeatEnd: b.repeatEnd,
        chords: b.chords.map((c) => c.parsed.symbol),
      })),
    })),
    substitutions: doc.substitutions.map((s) => ({
      section: s.section, bar: s.bar, name: s.name,
      original: s.original.map((c) => c.parsed.symbol),
      replacement: s.replacement.map((c) => c.parsed.symbol),
    })),
    practiceLog: doc.practiceLog,
  };
}

// ---------------- semantics ----------------

test("defaults: key C, meter 4/4, one implicit section A", () => {
  const doc = parseAtchart(CORPUS["minimal — nothing but the version and eight bars"]);
  assert.equal(doc.meta.key, "C");
  assert.equal(doc.meta.meter, "4/4");
  assert.equal(doc.sections.length, 1);
  assert.equal(doc.sections[0].name, "A");
  assert.equal(doc.sections[0].bars.length, 8);
});

test("chords inside bars go through the shared parser", () => {
  const doc = parseAtchart(CORPUS["the PRD's own example, sections + repeats + subs + log"]);
  const a1 = doc.sections.find((s) => s.name === "A1");
  assert.equal(a1.bars[0].repeatStart, true);
  assert.equal(a1.bars[3].repeatEnd, true);
  assert.deepEqual(a1.bars[3].chords.map((c) => c.parsed.symbol), ["Cm7", "F7"]);
  const b = doc.sections.find((s) => s.name === "B");
  assert.equal(b.bars[2].chords[0].parsed.bass.name, "C", "slash bass parsed");
  assert.deepEqual(b.bars[3].chords[0].parsed.alterations, ["#9"]);
});

test("substitutions are a layer: original chart untouched by them", () => {
  const doc = parseAtchart(CORPUS["the PRD's own example, sections + repeats + subs + log"]);
  assert.equal(doc.substitutions.length, 2);
  assert.equal(doc.substitutions[0].name, "tritone sub");
  const a1 = doc.sections.find((s) => s.name === "A1");
  assert.deepEqual(a1.bars[3].chords.map((c) => c.symbol), ["Cm7", "F7"], "original inviolable");
});

test("unicode arrow accepted on input, ASCII on output", () => {
  const doc = parseAtchart(CORPUS["sloppy spacing and unicode arrow"]);
  assert.equal(doc.substitutions[0].replacement[0].symbol, "Db9");
  const ser = serializeAtchart(doc);
  assert.ok(ser.includes("->"), "serializer emits ->");
  assert.ok(!ser.includes("→"), "no unicode arrow in canonical form");
});

test("refusals: version from the future, missing block, bad chord, bad sub line", () => {
  assert.throws(() => parseAtchart("---\natchart: 2\n---\n\n```chart\n| C |\n```\n"), /newer/);
  assert.throws(() => parseAtchart("---\natchart: 1\n---\n\nno chart here\n"), /no ```chart/);
  assert.throws(() => parseAtchart("---\nkey: C\n---\n\n```chart\n| C |\n```\n"), /must declare/);
  assert.throws(
    () => parseAtchart("---\natchart: 1\n---\n\n```chart\n| Hm7 |\n```\n"),
    /no root/,
    "bad chord names the token"
  );
  assert.throws(
    () =>
      parseAtchart(
        "---\natchart: 1\n---\n\n```chart\n| C |\n```\n\n## Substitutions\n\n- garbage line\n"
      ),
    /bad substitution/
  );
});

test("multiple chart blocks are refused (reserved for v2)", () => {
  const two = "---\natchart: 1\n---\n\n```chart\n| C |\n```\n\n```chart\n| F |\n```\n";
  assert.throws(() => parseAtchart(two), /reserved for v2/);
});
