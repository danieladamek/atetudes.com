---
type: spec
project: AtEtudes
version: 1
status: APPROVED by Daniel 2026-10-22 (all seven §9 decisions as recommended) — v1
description: The etude block, a fenced block of plain key-value lines that carries a Multetudes étude's settings (never its notes) into any Obsidian note, where RiffRaft renders and plays it. The keys are the practice log's own snapshot.
---

# The `etude` block — v1

**Draft, 2026-10-14, for Daniel's approval.** Item: *Multetudes — copy the étude as a note block*, step 1. The control
(step 2) and the reader (step 3) are built only after §9 is decided. Modelled on RiffRaft's
`docs/MIDI-LOOP-FORMAT.md`.

## 1. What it is

An étude, written into a note as one fenced block:

````markdown
```etude
app: multetudes
v: 2
split: chart
strings: [4, 3, 2, 1]
startDeg: 4
nearFret: 3
notesPer: 3
address: pattern
figure: 4,3,4,3,2,1
movement: arpeggiate
take: one
repeat: false
tuning: null
key: Bb
scale: major
ref: 0
bass: root
centreSrc: fixed
gamut: null
sounded: none
pad: false
tones: [1, 3, 5, 7]
source: cycle
cycle: fourths
form: ii-V-I
custom:
start: 0
bpm: 120
meter: 4
sub: 1
click: true
accents: true
clickLevel: 0.8
clickVoice: beep
mixer: {voice: tone, chord: 1, bass: 1, pad: 1}
```
````

(This is the corpus étude "a pattern figure", written by the rule in §3. The example is generated from the snapshot,
not typed.)

It is **plain text the user owns**. A person can read it, change a value by hand, and paste it anywhere. Multetudes
writes it (*copy the étude as a note block*) and reads it back (paste, and the bench returns); RiffRaft renders it and
plays it through the vendored engine (`etudeTimeline`, bundle 2.1.0).

**It holds the étude's SETTINGS, never its notes** (charter §7). It is configuration as data, with the same status
as an `.atchart` `apps:` entry (atchart §2.6). Every note is derived from it each time it plays, by
`engine/etude-timeline.mjs`, and is never stored. That's why it doesn't wait on the pending 260923 export ruling,
which governs turning an étude *into notes*.

## 2. The keys

**The keys are the practice log's own snapshot** (`etudeRecord(doc).snapshot()`), one per line, in the snapshot's
order. The block, the practice log and the Settings card therefore say the same list (rule 6). The writer iterates
the snapshot; nothing here is a second list. The table below is today's census, for reading. **The code is the
authority:** a setting added to the bench later appears in the block with no edit to this document.

The two lines that come first, `app` and `v`, are the practice log's own envelope words (`payload.app`,
`payload.v`), so a reader knows whose snapshot follows (decision 4).

| key | value | today's default | meaning |
|---|---|---|---|
| `app` | word | `multetudes` | whose étude (the log envelope's `app`) |
| `v` | integer | `2` | the snapshot schema (the log envelope's `v`) |
| `split` | `chart` or a list | `chart` | the bar split: `chart` = as charted, or slots such as `[2, 1]` |
| `strings` | list of 1–6 | `[4, 3, 2, 1]` | the string set |
| `startDeg` · `nearFret` | integers | `4` · `3` | the window: framed from this degree, near this fret |
| `notesPer` | integer | `3` | placement: `1` grip, `3` line |
| `address` | word | `pattern` | what the figure names: `pattern` (strings) or `tones` (roles) |
| `figure` | text | *(empty)* | the figure as typed: `4,3,4,3,2,1`, `r537`, `<r357>`, `(-1,+1)[3]` |
| `movement` | word | `arpeggiate` | `strum` or `arpeggiate` when there's no figure |
| `take` | word | `one` | one of each tone, or `all` |
| `repeat` | `true`/`false` | `false` | repeat the current bar |
| `tuning` | `null` or a map | `null` | `null` = standard; `{6: -2}` = drop D (the `.atchart` v1.2 form, low string first) |
| `key` · `scale` · `ref` | word · word · integer | `Bb` · `major` · `0` | the key, its scale, the reference degree |
| `bass` | word | `root` | the reference tone: `none`, `root`, a chosen tone in the bass (`tone:3`, `tone:5`, `tone:7` …), `third` or `fifth` (a scale tone below) — the engine's own list (`referenceChoicesFor`) |
| `centreSrc` | word | `fixed` | the centre under a scale: `fixed` or `follows` |
| `gamut` | `null` or a list | `null` | `null` = the whole field; `[1, 2, 3, 5, 6]` = those degrees |
| `sounded` · `pad` | word · `true`/`false` | `none` · `false` | the sounded bass; the pad |
| `tones` | `null` or a list | `[1, 3, 5, 7]` | the material by role; `null` = a scale (the object is derived from the tones, never stored) |
| `source` · `cycle` · `form` · `custom` · `start` | words, text, integer | `cycle` · `fourths` · `ii-V-I` · *(empty)* · `0` | the progression |
| `bpm` · `meter` · `sub` | integers | `120` · `4` · `1` | the clock |
| `click` · `accents` · `clickLevel` · `clickVoice` | the metronome's bench | `true` · `true` · `0.8` · `beep` | the metronome |
| `mixer` | a map | `{voice: tone, chord: 1, bass: 1, pad: 1}` | the mix (decision 3) |

**Not in the block: `chart`** (decision 5). The snapshot carries the notepad's own chart-block body as `chart`. It's a
mirror of the note's text, not a bench setting, and the note it's pasted into has its own.

## 3. Values

**One value per line, after the first `: `.** The value grammar is the family's existing flow grammar: the one
`engine/atchart.mjs` reads for an `.atchart` `apps:` entry (`parseFlow` / `serializeFlow`). It's reused, not
restated, so there is one grammar, not two (decision 2).

- **Numbers** bare (`120`, `0.8`, `-2`). **`true` / `false` / `null`** bare.
- **Lists** `[4, 3, 2, 1]`; **maps** `{voice: tone, chord: 1}`, both in flow form.
- **Text at the top level is written bare whenever reading it back bare gives the same text.** That covers almost
  everything a person types: `figure: 4,3,4,3,2,1`, `figure: <r357>`, `bass: tone:3`,
  `custom: | Cm7 F7 | Bbmaj7 |`. Text is **quoted** (`"…"`, JSON escapes) only when bare would read back as something
  else: a number (`figure: "432121"`), `true` / `false` / `null`, text starting with `[`, `{` or a quote, or text with
  leading or trailing space.
- **Empty text** is the key with nothing after the colon (`custom:`), written with no trailing space.
- **`null` means what its key says** (the table): standard tuning, the whole field, a scale.

## 4. Absent keys

A key that is **absent** means *not recorded* — restore's rule, unchanged (2026-10-02: silence is never "set it to the
default"). Pasted into Multetudes, an absent setting leaves the bench as it is; the one exception is `gamut`, where
absent = the whole field (night 48, as ruled). RiffRaft's `etudeTimeline` fills an absent key from `ETUDE_DEFAULTS`.
A block the control writes carries **every** key, so the two readings differ only for a hand-trimmed block
(decision 6).

## 5. Preservation

Carried over from `midi-loop` §2:

- **An unrecognised line in `key: value` form is kept verbatim, in its place,** and written back unchanged by any
  surface that edits the block. Nothing drops a line it doesn't understand.
- Blank lines are ignored. A line starting `#` is a comment, kept verbatim like an unknown key.

## 6. Bad values

**A bad value is flagged, never guessed or corrected.** Examples: a value the flow grammar can't read (`strings: [4, 3,`),
or one the bench refuses (`key: H`; `tuning: {6: -9}`, which the field's own `opensOf` refuses). The block still loads
(decision 7): every other key restores, and the flagged key is left out of the restore and named on the face, the
way the chord lane names a symbol its parser rejects.

## 7. Round trip

- **bench → block → bench is identity:** `read(write(snapshot))` deep-equals the snapshot. This is the round-trip
  gate, held on the timeline corpus (`hub/tests/fixtures/etude-corpus.json`), with every corpus étude's timeline
  unchanged through it.
- **write is a fixed point** on a block it wrote: `write(read(block)) == block`, byte for byte. A hand-edited block
  with unknown lines keeps them (§5).

## 8. What it is not

- **No notes, ever** (§1). RiffRaft and Multetudes both derive the notes from these settings each time they play.
- **Not the practice log's JSON envelope** (decided, Daniel 2026-10-14): no `id`, `savedAt`, `heading`, note text or
  `shared` form. The note around the block *is* the text.
- **Not a chart.** A chord lane lives in an `.atchart` chart block or a riff's `changes:`; an étude's own progression
  is `source` / `cycle` / `form` / `custom`.

## 9. Decisions for Daniel

1. **The fence's info string.** The working name is `etude`. *Recommended:* `etude` (short, and what a person calls
   it). The alternatives are `atetudes-etude` or `multetudes`, which are more specific but longer, and still need
   RiffRaft to know the word.
2. **The value grammar, §3.** *Recommended:* the family's flow grammar, with top-level text bare whenever it reads
   back unchanged. Priced alternatives:
   - **(a) Pure flow everywhere.** Any text that isn't a simple word is quoted: `figure: "4,3,4,3,2,1"`,
     `custom: "| Cm7 F7 | Bbmaj7 |"`. That's simplest to state, but quotes land on exactly the lines people edit most.
   - **(b) Types per key.** Never a quote, because the reader knows `figure` is text. The cost is a key → type table
     beside the snapshot: a second list (rule 6), and a new setting needs an entry before it round-trips.
   - The recommendation quotes only text that would otherwise read back as something else. The one common case is
     an all-digit pattern figure (`"432121"`).
3. **The mix, `mixer`.** *Recommended:* one flow map, `mixer: {voice: tone, chord: 1, bass: 1, pad: 1}`. It's the
   same grammar as `tuning`, so there is no second rule. *Alternative:* dotted keys, one per line (`mixer.bass: 0.6`).
   Each level is easier to edit by hand, but dotted keys are a second structural rule, and the reader must rebuild
   the map and decide what an unknown `mixer.x` line means.
4. **The `app` / `v` header lines.** *Recommended:* yes, first, in the practice log's own words. A block from another
   app (a Tetradetudes étude, later) is then recognisable, and a later snapshot schema can be read by its version.
   *Alternative:* none, with RiffRaft assuming Multetudes.
5. **Leave `chart` out** (§2). *Recommended:* out, because it mirrors the note's own chart block. *Alternative:* in,
   for completeness, so the block carries a copy of the pad's chart text.
6. **Absent keys, §4.** *Recommended:* keep restore's rule (not recorded) in Multetudes and `ETUDE_DEFAULTS` in
   RiffRaft. A control-written block is complete, so this only matters for hand-trimmed blocks. *Alternative:* make
   both read defaults. That would change restore's 2026-10-02 ruling for blocks only.
7. **A flagged value, §6.** *Recommended:* the block loads, and the flagged key is skipped and named. *Alternative:*
   refuse the whole block until it's fixed.

Approving 1–7 unblocks step 2 (the control, offered wherever the notepad offers its other copies) and step 3 (the
reader: block → snapshot → `etudeRecord.restore`, plus the round-trip gate).

## Ruled — Daniel, 2026-10-22 11:25

All seven decisions taken as recommended: (1) the fence is `etude`; (2) the family's flow grammar, with
top-level text bare whenever it reads back unchanged; (3) `mixer` as one flow map; (4) `app:` and `v:`
first; (5) `chart` left out; (6) absent keys follow each side's rule (restore's in Multetudes,
`ETUDE_DEFAULTS` in RiffRaft); (7) a flagged value is skipped and named, and the block still loads.
This draft is v1. Steps 2 (the control) and 3 (the reader and the round-trip gate) are unblocked.

