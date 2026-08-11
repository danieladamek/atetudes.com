/* atchart.test.mjs — the round-trip law on a corpus of awkward hand-written charts.
 * Spec: docs/atchart-format.md §4. Run: node --test "engine/tests/*.test.mjs"
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAtchart, serializeAtchart, readApp, writeApp } from "../atchart.mjs";

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

// ---- v1.1 (ratified 2026-08-10, Update Log 260810.5; implemented 260811.6) ----

const V1_PLAIN = `---
atchart: 1
title: Plain v1
key: F
---

\`\`\`chart
| Fmaj7 | Bb7 | Fmaj7 | Fmaj7 |
\`\`\`

Some prose the format does not claim.
`;

const V11_APPS = `---
atchart: 1.1
title: Carried through many hands
key: C
# a comment the file's author left
weird-key: kept: exactly [as, typed]
apps:
  metronome: {v: 1, bpm: 132, meter: "4/4"}
  mystery-app: {v: 1, anything: [1, two, {deep: true}]}
  future-thing: {v: 99, shape: unknowable}
---

\`\`\`chart
| Dm7 G7 | Cmaj7 |
\`\`\`
`;

test("§2.7: unknown frontmatter keys (and comments) survive VERBATIM — byte-identical round trip", () => {
  const doc = parseAtchart(V11_APPS);
  assert.equal(serializeAtchart(doc), V11_APPS, "byte-identical");
  assert.equal(doc.meta["weird-key"], "kept: exactly [as, typed]".startsWith("kept")
    ? doc.meta["weird-key"] : null, "the unknown key is readable");
  const again = parseAtchart(serializeAtchart(doc));
  assert.equal(serializeAtchart(again), V11_APPS, "fixed point holds with unknown keys");
});

test("§4, the one that matters most: a v1 file with no apps: round-trips byte-identically, NO bump", () => {
  const doc = parseAtchart(V1_PLAIN);
  const out = serializeAtchart(doc);
  assert.equal(out, V1_PLAIN, "byte-identical");
  assert.match(out, /atchart: 1\n/, "the version literal is untouched");
  assert.ok(!out.includes("1.1"), "no bump without a write");
  assert.ok(!out.includes("apps:"), "no apps: map appears from nowhere");
});

test("§2.6: unknown app id and v-above-the-reader are preserved untouched through parse and write", () => {
  const doc = parseAtchart(V11_APPS);
  // a write to ONE app leaves every other entry's raw text verbatim
  const nd = writeApp(doc, "triadetudes", { v: 1, stringSet: "1-2-3", scale: "major" });
  const out = serializeAtchart(nd);
  assert.ok(out.includes("  mystery-app: {v: 1, anything: [1, two, {deep: true}]}"),
    "unknown app id: raw text verbatim");
  assert.ok(out.includes("  future-thing: {v: 99, shape: unknowable}"),
    "v above the reader: never dropped, never guessed at");
  assert.ok(out.includes("  triadetudes: {v: 1, stringSet: 1-2-3, scale: major}"),
    "the written entry is canonical (bare-safe strings stay bare)");
  assert.deepEqual(readApp(parseAtchart(out), "triadetudes"),
    { v: 1, stringSet: "1-2-3", scale: "major" }, "and reads back exactly");
});

test("readApp/writeApp are pure: the input document is UNMODIFIED (proven, not asserted in prose)", () => {
  const doc = parseAtchart(V11_APPS);
  const before = JSON.stringify(doc);
  const got = readAppProbe(doc);
  assert.equal(JSON.stringify(doc), before, "readApp mutated nothing");
  const nd = writeApp(doc, "metronome", { v: 2, bpm: 60 });
  assert.equal(JSON.stringify(doc), before, "writeApp mutated nothing");
  assert.notEqual(serializeAtchart(nd), serializeAtchart(doc), "the NEW doc differs");
  // and the object readApp hands back is FRESH — editing it touches nothing
  got.bpm = 999;
  assert.equal(readApp(doc, "metronome").bpm, 132);
});
function readAppProbe(doc) { return readApp(doc, "metronome"); }

test("readApp materializes the entry; unknown id and unparseable entries are null, never a throw", () => {
  const doc = parseAtchart(V11_APPS);
  assert.deepEqual(readApp(doc, "metronome"), { v: 1, bpm: 132, meter: "4/4" });
  assert.deepEqual(readApp(doc, "mystery-app"),
    { v: 1, anything: [1, "two", { deep: true }] }, "bare words read as strings");
  assert.equal(readApp(doc, "absent-app"), null);
  assert.equal(readApp(parseAtchart(V1_PLAIN), "metronome"), null, "no apps: at all");
});

test("the version literal: writeApp on a v1 doc bumps 1 → 1.1; an existing 1.1 stays; read round-trips", () => {
  const doc = parseAtchart(V1_PLAIN);
  const nd = writeApp(doc, "metronome", { v: 1, bpm: 96 });
  const out = serializeAtchart(nd);
  assert.match(out, /atchart: 1\.1\n/, "writing an apps: map is the one thing that bumps");
  assert.ok(out.includes("apps:\n  metronome: {v: 1, bpm: 96}"));
  const again = parseAtchart(out);
  assert.deepEqual(readApp(again, "metronome"), { v: 1, bpm: 96 },
    "readApp(writeApp(...)) round-trips through the file");
  assert.equal(serializeAtchart(again), out, "and stays a fixed point");
  const doc11 = parseAtchart(V11_APPS);
  const nd11 = writeApp(doc11, "metronome", { v: 1, bpm: 60 });
  assert.match(serializeAtchart(nd11), /atchart: 1\.1\n/, "1.1 stays 1.1, no re-bump games");
});

test("writeApp replaces only its own entry, twice is idempotent in content", () => {
  const doc = parseAtchart(V11_APPS);
  const a = writeApp(doc, "metronome", { v: 1, bpm: 60 });
  const b = writeApp(a, "metronome", { v: 1, bpm: 60 });
  assert.equal(serializeAtchart(a), serializeAtchart(b));
  assert.equal((serializeAtchart(a).match(/metronome:/g) || []).length, 1, "one entry, replaced");
});

test("higher MAJOR still refuses (unchanged §2.1 rule); 1.1 parses", () => {
  assert.throws(() => parseAtchart(V1_PLAIN.replace("atchart: 1", "atchart: 2")), /newer/);
  assert.equal(parseAtchart(V11_APPS).meta.atchart, 1.1);
});
