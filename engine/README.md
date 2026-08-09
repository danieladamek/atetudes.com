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
├── chord.mjs        chord-symbol parser: string → structured chord (pure)
├── atchart.mjs      .atchart.md v1 parser + serializer (pure)         [spec: docs/atchart-format.md]
└── tests/
    ├── chord.test.mjs
    ├── atchart.test.mjs
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
