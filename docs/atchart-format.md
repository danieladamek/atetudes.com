# The `.atchart.md` chart interchange format — v1 (DRAFT)

> Status: **draft, pending Daniel's ratification** (backlog: *Ratify the chart
> interchange format*). The parser and serializer in `engine/atchart.mjs` implement
> exactly this document; the round-trip test corpus in `engine/tests/atchart.test.mjs`
> is the executable form of it. Once ratified, this file is law like the rest of
> `docs/` — the format version only ever moves forward.

## 1. What it is

One artifact serving five roles (Substitute Teacher PRD §3): the app's save file, its
import path, the region-handoff payload, the notebook entry body, and the input to MIDI
export. A markdown file with YAML frontmatter and one fenced `chart` block — readable in
any editor, diffable in git, at home in Obsidian.

## 2. The grammar

````markdown
---
atchart: 1
title: "Blues for Somebody"
key: F
meter: 4/4
tempo: 132
sections: [A1, A2, B, A3]
---

# Blues for Somebody

```chart
@A1  |: Fmaj7 | Bb7 | Fmaj7 | Cm7 F7 :|
@B   | Bb7 | Bdim7 | Fmaj7/C | D7#9 |
```

## Substitutions

- A1.b4  Cm7 F7  ->  Cm7 Gb7  [tritone sub]

## Practice log

- 2026-08-09 · shells, bars 1-8, 96bpm
````

### 2.1 Frontmatter

- `atchart: 1` — **required**, the only required key. The format version; a parser that
  sees a higher major version than it knows must refuse, not guess.
- `title`, `composer`, `key`, `meter`, `tempo`, `form`, `sections` — optional, with
  defaults (`key: C`, `meter: 4/4`). A hand-typed chart with nothing but a key and eight
  bars loads.

### 2.2 The chart block

- One fenced block with info string `chart`. Lines beginning `@NAME` start a **section**;
  a file with no `@` lines gets one implicit section named `A`.
- **Bars** are separated by `|`. `|:` opens a repeat, `:|` closes it (recorded on the
  bar, preserved by round-trip).
- **Chords** within a bar are whitespace-separated symbols in the shared parser's
  vocabulary (`engine/chord.mjs`). Multiple chords split the bar's beats evenly — v1 has
  no per-chord beat syntax (reserved: `Chord@3` for beat placement, v2).
- `melody:` continuation lines are **preserved verbatim** in v1 — carried, round-tripped,
  not interpreted. Melody semantics arrive with the note-event model (ST-1), not before.
- A chart with changes and no melody is a complete, legitimate chart — the common case.

### 2.3 Substitutions — a layer, never an edit

Under a `## Substitutions` heading: `- <section>.b<bar>  <original>  ->  <replacement>
[name]`. The original chart is inviolable; substitutions are named alternates that
toggle. (`→` is accepted on input and serialized as `->` so charts survive ASCII-only
round trips.)

### 2.4 Practice log

Under `## Practice log`: list items preserved verbatim. The notebook method owns their
internal shape, not this format.

### 2.5 Everything else

Any other markdown in the file (prose, headings, links) is **preserved verbatim and
round-tripped untouched**. The file is the user's; the format only claims the
frontmatter, the chart block, and the two named sections.

## 3. Reserved for v2 (deliberately absent from v1)

Per-chord beat placement · first/second endings · pickup bars · multiple chart blocks ·
interpreted melody. Each waits on a real consumer; none may be improvised into v1.

## 4. Round-trip law

`parse → serialize → parse` must produce an identical structure, and
`serialize(parse(x))` must be a **fixed point** (serializing twice is byte-identical).
This is CI-enforced on a corpus of awkward hand-written charts. Voicings are never
stored in the file — they are recomputed from the changes every time (golden rule 1);
what may be stored is the *choice* of voicing config, in frontmatter, as data.
