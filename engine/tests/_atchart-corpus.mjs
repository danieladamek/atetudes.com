/* _atchart-corpus.mjs — the round-trip corpus of awkward hand-written charts, in ONE place (261011c).
 * Moved verbatim out of atchart.test.mjs so the vendored engine bundle's smoke test (hub/tests/vendor-bundle.test.mjs)
 * runs the same corpus against the bundle alone, rather than keeping a second copy.
 * Each entry is a legitimate chart a human might actually type, including the awkward ones the PRD demands.
 * Names describe the awkwardness. */
export const CORPUS = {
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
