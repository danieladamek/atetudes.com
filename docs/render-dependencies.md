# Triadetudes — render dependencies (control → views)

> Moved from `notes/specs/` 2026-08-11 (Daniel's call): notes/ is what we're building
> and why; docs/ is how the built thing works. This file describes code — outside the
> repo it rots invisibly; here a change adding a control visibly fails to update it.

# Triadetudes — which views each control feeds

Audited 2026-08-11 against the shipped v0.7.8 page (post-260810.14), by changing every
control **with all panels folded** and fingerprinting every dependent view before/after
(content-based fingerprints — element innerHTML, per-chip classNames — not lengths).
The probe script lives in the session scratchpad; the durable law is this table.

**Legend.** ✓ = the value feeds this view AND the handler refreshes it (confirmed live).
— = deliberate non-dependency (the view does not depend on this value; reason noted).
**✗ GAP** = the value feeds the view but the handler did not refresh it (fixed in the
follow-up commit, Update Log 260811.2).

**The render chains** (what a ✓ rides on):

- `rebuild()` → `renderAll()` → fretboard + score + `syncArpIn` (readout) + place hint,
  and via `renderActive()` → readout header, keyboard, timeline + editor chips,
  `renderCfg()` (cfg JSON + notebook summary + **collapsed lines**), score highlight.
- `renderActive()` alone: everything except a full score re-layout.
- `renderCfg()` alone: cfg JSON, notebook summary line, collapsed summary lines.
- `applyMotionInput()`: readout + score + `renderActive()`.

## Metronome card

| control | fretboard | score | keyboard | timeline | collapsed line | readout (describe) | cfg/rawCfg |
|---|---|---|---|---|---|---|---|
| BPM slider (`bpmRange`, input) | — ⁱ | — ⁱ | — ⁱ | — ⁱ | ✓ | — | **✗ GAP** — `changeBpm` skipped `renderCfg`; cfg JSON + notebook summary sat stale after a drag |
| Time (`meterSel` → `changeMeter`) | — ⁱ | ✓ | — ⁱ | ✓ (divisions redraw) | ✓ | ✓ (rhythm clause) | ✓ |
| Subdivision (`subSel`) | — ᵃ | — ᵃ | — ᵃ | — ᵃ | ✓ | — | ✓ |
| Voice (`voiceSel`) | — ᵃ | — ᵃ | — ᵃ | — ᵃ | ✓ | — | ✓ |
| Sound on/off (`clickTgl`) | — ᵃ | — ᵃ | — ᵃ | — ᵃ | ✓ (metro + transport lines) | — | ✓ |
| accents (`accChk`) | — ᵃ | — ᵃ | — ᵃ | — ᵃ | — (not in any summary) | — | ✓ |
| Vol (`clickVolR`) | — ᵃ | — ᵃ | — ᵃ | — ᵃ | — (not in any summary) | — | ✓ (on release only — per-tick stringify avoided, deliberate) |
| Start / Tap | — ᵇ | — ᵇ | — ᵇ | — ᵇ | — (running state not in the line) | — | Tap → ✓ via `changeBpm`+`renderCfg` |

ⁱ audible timing only until the next render; the boards draw marks, not tempo.
ᵃ audio-only value — no board draws it. ᵇ transport state, not config.

## Harmony card

| control | fretboard | score | keyboard | timeline | collapsed line | readout | cfg/rawCfg |
|---|---|---|---|---|---|---|---|
| Key (`keySel` → `changeKey`+`rebuild`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Scale (`scaleSel` → `rebuild`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Build up / Break down seg (`rebuild`) | ✓ | ✓ | ✓ | ✓ (typed changes vs triads) | ✓ | ✓ | ✓ |
| Progression (`progSel` → `rebuild`) | ✓ ᶜ | ✓ | ✓ ᶜ | ✓ | ✓ | — | ✓ |
| Start on (`startSel` → `rebuild`) | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Steps (`lenSel` → `rebuild`) | ✓ ᶜ | ✓ | ✓ ᶜ | ✓ | ✓ | — | ✓ |
| Custom (`customIn` → `rebuild`) | ✓ ᶜ | ✓ | ✓ ᶜ | ✓ | ✓ | — | ✓ |
| Extension (`extSel`) | ✓ (relabel vs bass) | ✓ | ✓ | — (labels are the progression, not the bass layer) | — (not in the line) | — | ✓ |
| The changes field (`breakIn` → `rebuild`) | ✓ ᶜ | ✓ | ✓ ᶜ | ✓ (live) | ✓ | — | ✓ |
| Editor chips (tap/+/▾/drag/long-press → `breakChanged`→`rebuild`) | ✓ ᶜ | ✓ | ✓ ᶜ | ✓ | ✓ | — | ✓ |

ᶜ the fretboard/keyboard draw `SEQ[st.cur]` only — the handler refreshes them, but the
content changes only when the *current* chord changes. Confirmed by identical
fingerprints when chord 1 survives the edit; not a gap.

## Transport card

| control | fretboard | score | keyboard | timeline | collapsed line | readout | cfg/rawCfg |
|---|---|---|---|---|---|---|---|
| BPM slider (`bpmRange2`) | — ⁱ | — ⁱ | — ⁱ | — ⁱ | ✓ | — | **✗ GAP** — same wire as the Metronome slider (one `changeBpm`) |
| Time sig (`meterSel2` → `changeMeter`) | — ⁱ | ✓ | — ⁱ | ✓ | ✓ | ✓ | ✓ |
| Bar split (`splitSel`) | — ᵈ | ✓ | — ᵈ | ✓ (divisions + slot widths) | ✓ (transport + timeline lines) | ✓ (rhythm clause) | ✓ |
| metronome (`clickChk2`) | — ᵃ | — ᵃ | — ᵃ | — ᵃ | ✓ | — | ✓ |
| count-in (`countChk`) | — ᵃ | — ᵃ | — ᵃ | — ᵃ | — | — | ✓ |
| mute chords (`metroChk`) | — ᵃ | — ᵃ | — ᵃ | — ᵃ | — | — | ✓ |

ᵈ the fretboard/keyboard marks and order badges encode order and role, not beats; the
score and timeline are the views that draw duration, and both refresh. Deliberate.

## Shape & Motion strip

| control | fretboard | score | keyboard | timeline | collapsed line | readout | cfg/rawCfg |
|---|---|---|---|---|---|---|---|
| String set (`setSeg` → `rebuild`) | ✓ | ✓ ᵉ | ✓ ᵉ | — | ✓ | ✓ | ✓ |
| Motion follows (`motionSeg` → preset + `applyMotionInput`) | ✓ | ✓ | ✓ | — | ✓ | ✓ | **✗ GAP** (display only) — `cfgObj().motion` predates the grammar: no `figure`, no mode; rawCfg() itself was correct |
| Figure picker (`figSel` → `applyMotionInput`) | ✓ | ✓ | ✓ | — | ✓ | ✓ | **✗ GAP** (same — the JSON display was silent on the figure) |
| Figure field (`arpIn` → `applyMotionInput`) | ✓ | ✓ | ✓ | — | ✓ | ✓ | **✗ GAP** (same; and the notebook summary's "arp" clause showed only the shape pattern) |
| — `arpIn` refusal branches (parse error / teach) | — | — | — | — | — | ✓ (the refusal IS the readout) | — (figure state untouched on refusal — deliberate, the failure convention) |
| Placement (`placeSeg` → `rebuild`) | ✓ | ✓ | ✓ | — | ✓ | ✓ (place hint) | ✓ |
| Playback (`playbackSeg`) | ✓ (badges) | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| Show roots (`rootsChk`) | ✓ | — (fretboard-only layer) | — | — | — (not in the line) | — | ✓ |
| Neck/keyboard sketch clicks (`sketchClick` → `applyMotionInput`) | ✓ | ✓ | ✓ | — | ✓ | ✓ (narrates + names the chord) | same GAP as the field (display) |

ᵉ `chooseVoicings` on the neighbouring set can produce the same pitches on different
strings — score/keyboard fingerprints were identical for E-B-G → B-G-D while the
fretboard moved. The handler refreshes both; identical content is honest, not stale.

## Timeline strip

| control | fretboard | score | keyboard | timeline | collapsed line | readout | cfg/rawCfg |
|---|---|---|---|---|---|---|---|
| `⏮ ⏭` step | ✓ | ✓ (highlight) | ✓ | ✓ (chip + bar) | ✓ (timeline line follows position) | — | — (position is not config) |
| `▶ ⏹` | ✓ (in time) | ✓ | ✓ | ✓ | ✓ | — | — |
| Chord/bar click (jump) | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |

## Notebook restore (`applyRaw` → `rebuild`)

Restore ends in a full `rebuild()`: every view above refreshes, including collapsed
lines and the picker's derived selection. Confirmed.

## The gaps, and their fix (Update Log 260811.2)

All three are one family — **the config display predates a value it should show**:

1. `changeBpm` refreshed sliders + collapsed lines but not `renderCfg()` — the cfg JSON
   and notebook summary went stale after any BPM drag. Fixed: `changeBpm` →
   `renderCfg()` (which includes the collapsed lines).
2. `cfgObj().motion` carried only the shape pattern — no `figure`, no `mode` — so the
   "Full configuration (JSON)" was silent about a tones figure. Fixed: `motion.figure`
   (= `motionSource()`) and `motion.mode` added. Display only; `rawCfg()` was always
   correct and is unchanged.
3. `summaryText()`'s "arp" clause showed `patText(st.arpPattern)` — under a tones
   figure it displayed a stale shape pattern. Fixed: it shows `motionSource()`.

**The finding that generalises** (from the item): a control that mutates state must
refresh every view its value feeds, and views added later (collapsed lines, the
timeline) inherit every control as a writer. When surfacing state somewhere new,
add the new view to this table and walk the column.

## The Practice Log's serialisers (established 260811.3)

The 260811 audit's cfgObj() finding raised the question; the answer, verified in the
running app: **the Log's data was never lossy.**

| path | serialiser | note |
|---|---|---|
| Save (`currentEntry`) | `rawCfg()` | complete since v0.7.3 — every saved entry carries `motionMode`/`motionSrc` |
| Restore (history row) | `applyRaw(en.cfg)` | consumes the rawCfg shape; ends in full `rebuild()` |
| Export (`logToMarkdown`) | embeds the stored `en.cfg` | the fenced JSON per entry IS rawCfg |
| Import (`parseLogExport` / bare JSON) | `looksLikeCfg` gate → `applyRaw` | the gate checks the rawCfg shape |
| **Copy configuration** | **was `cfgObj()` — the one disagreement** | the copied JSON failed the app's own import gate; fixed 260811.3 to copy `rawCfg()` |

Also stored per entry: `title` (`entryTitle()`) and `summary` (`summaryText()`) — display
strings frozen at save time. Entries saved v0.7.3–260811.2 with a tones figure carry a
summary whose arp clause predates the figure; the cfg is complete, so **restore is exact**,
and the history row now derives a visible flag from the entry's own cfg when its stored
summary misdescribes it. Pre-v0.7.3 entries have no motion keys and restore figureless via
`applyRaw`'s named defaults — correct, not flagged.

## The probe lesson (verification method)

Canonical verification doctrine lives in the repo `CLAUDE.md` (governance-owned); this
is the audit's method note beside its table. **When checking "did this view update?",
fingerprint content, not size**: the 260811 audit's first pass used innerHTML *lengths*
and produced six false alarms (a key change can move every label and keep the byte
count; a set change can land the same pitches on different strings). Content-based
fingerprints — full innerHTML, per-chip classNames — separated real gaps from honest
no-ops. Start content-based.
