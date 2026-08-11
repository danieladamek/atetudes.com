# engine/ — the shared JS music engine

The site-side counterpart of `generators/`: pure functions, no DOM, no audio, ES modules.
Phase A groundwork per `notes/specs/at-etudes-app-family.md` §5 — the chord-symbol parser
and the `.atchart.md` format are built here once, for Triadetudes' break-down mode and
Substitute Teacher ST-0 both.

**Doctrine** (CLAUDE.md Part I, applied site-side): all musical content is derived from
pitch-class math and named rules, asserted before use. Nothing in this directory touches
the DOM; everything is testable headless.

## Layout

```
engine/
├── chord.mjs            chord-symbol parser: string → structured chord; roman-numeral
│                        parsing + key resolution (resolveRoman, scaleNotes) (pure)
├── upper-structure.mjs  parsed chord → ranked upper-structure triads + auto bass,
│                        by named rule (pure) — Triadetudes break-down mode / ST-2
├── metronome.mjs        metronome core: beat grid, tempo bends, tap tempo (pure)
├── note-events.mjs      the note-event producer: one {midi,string,fret,role,slot,
│                        onset,dur} list per chord, every renderer a consumer (pure)
├── string-sets.mjs      slot/degree translation across string sets (pure)
├── atchart.mjs          .atchart.md v1 parser + serializer (pure)     [spec: docs/atchart-format.md]
├── markdown.mjs         the notepad's markdown engine: CommonMark subset that
│                        builds DOM nodes (no HTML-string sinks — greped), refuses
│                        raw HTML, sanitizes links by allow-list; parseMarkdown /
│                        renderTo / applyEdit (the toolbar + palette seam) (pure)
└── tests/
    ├── chord.test.mjs
    ├── upper-structure.test.mjs      roadmap §3.1's decomposition table as corpus
    ├── metronome.test.mjs            includes the study-inline anti-drift pin
    ├── atchart.test.mjs
    ├── markdown.test.mjs             the grep, the refusal corpus, the caret contract
    ├── triadetudes-engine.test.mjs   characterization of the shipped study's engine
    └── _load-triadetudes.mjs         extracts the study's <script> for headless testing
```

## Running the tests

Zero dependencies — the runner is Node's built-in `node:test` (Node ≥ 20):

```
node --test "engine/tests/*.test.mjs"
```

CI runs the same command in `.github/workflows/pages.yaml` before the Hugo build; a red
test blocks deploy.

## Rules

- **No hand-placed musical data.** Interval formulas are named rules (`maj7 = R 3 5 7`),
  asserted structurally (root present, intervals ascending, pcs unique) at module load.
- **The characterization tests are read-only.** They load the shipped
  `static/studies/triadetudes/study.html` verbatim and pin its current behaviour; they
  never modify it. When Phase B extracts the hub, these tests are the safety net — the
  extracted engine must produce identical output before the study file is regenerated.
- **No frameworks, no installs** (CLAUDE.md guardrail + the single-file charter promise).
  If a test needs a library, the design is wrong.
