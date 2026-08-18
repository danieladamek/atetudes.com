# engine/ — the shared JS music engine

The site-side counterpart of `generators/`: pure functions, no DOM, no audio, ES modules.
Phase A groundwork per `notes/specs/at-etudes-app-family.md` §5 — the chord-symbol parser
and the `.atchart.md` format are built here once, for Triadetudes' break-down mode and
Substitute Teacher ST-0 both.

**Doctrine** (CLAUDE.md Part I, applied site-side): all musical content is derived from
pitch-class math and named rules, asserted before use. Nothing in this directory touches
the DOM; everything is testable headless.

**Grep assertions are comment-blind by design — state the contract in the test, not in
module prose.** Several suites grep raw module source for banned tokens (markdown.mjs's
four HTML-string sinks; the music palette's "no literal progression strings"; v0.6's
decomposition-table rule against hand-written lookup tables). These scans deliberately do
NOT strip comments: a comment-stripper is a small parser that fails permissive, and a
permissive failure silently weakens a charter §7 guarantee while the assertion still
passes. The accepted cost is that such a module cannot name its own banned tokens in
prose — a guarantee comment that names them will fail the grep, which is the assertion
working, not breaking. Document the contract beside the grep in the test file.

## Layout

```
engine/
├── chord.mjs            chord-symbol parser: string → structured chord; roman-numeral
│                        parsing + key resolution (resolveRoman, scaleNotes) (pure)
├── upper-structure.mjs  parsed chord → ranked upper-structure triads + auto bass,
│                        by named rule (pure) — Triadetudes break-down mode / ST-2
├── metronome.mjs        metronome core: beat grid, tempo bends, tap tempo (pure)
├── isolation.mjs        THE ISOLATION BOX as a first-class voicing constraint:
│                        the zone as a VALUE, the two cost terms, the named
│                        placements and their tie rules, the ladder wrap, line
│                        placement — candidate geometry injected (pure)
├── drill.mjs            the SHARED DRILL LAYER (family spec §4.1): a pattern
│                        over a material's slots, the subdivision arithmetic
│                        and bar splits, the sounding order. The material is
│                        declared by the consumer — nothing here says "string"
├── note-events.mjs      the note-event producer: one {midi,string,fret,role,slot,
│                        onset,dur} list per chord, every renderer a consumer (pure)
├── tetrad-voicings.mjs  THE CANDIDATE GENERATOR for four-voice shapes: close,
│                        drop-2, drop-3, the shells (arity 3, a separate stream)
│                        and rootless 3-5-7-9. Voicing only — chord VOCABULARY
│                        stays in chord.mjs. Feeds isolation.mjs's candidatesFor
├── tetrad-sequence.mjs  THE DERIVED PASS: a scale, a cycle, and the voiced
│                        chords that walk it. Diatonic tetrads by stacking
│                        scale thirds; cycles as one integer each; the bottom
│                        tone seeds the first chord. What Tetrad Voice Leading
│                        CARRIES as 1.16 MB, computed
├── voice-identity.mjs   THE STABLE VOICE KEY: a derived, never-stored identity
│                        per voice across a chord change, so a holding voice
│                        keeps its DOM node and glides. Keyed by CHANNEL, never
│                        by pitch rank — the crossing case. Any arity, no deps
├── voices.mjs           THE FAMILY'S VOICES, as math rather than as nodes: the
│                        voice table, the Karplus-Strong string rendered to
│                        samples, the click, the bass seat, and gain envelopes
│                        as breakpoint DATA a host realises. No AudioContext
├── figure.mjs           THE FIGURE CHAIN, composed from seams that exist: two
│                        drill.material()s (slots 1-2-3-4 · tones R-3-5-7),
│                        drill.parsePattern/orderFor, motion.mjs for enclosures
│                        (tones mode, any arity), noteEvents for the one event
│                        list. Nothing forked; slot-mode parens refused loudly
├── transport.mjs        THE ÉTUDE'S WALK along a beat grid: bar splits (drill's
│                        own table, consumed), the beat→step attack, count-in
│                        and the loop counter. Owns NO clock — beats are
│                        injected, so the walk is testable without one
├── string-sets.mjs      slot/degree translation across string sets (pure)
├── motion.mjs           the motion grammar: figures, approaches, resolution against
│                        a chord context; the sketchpad's emitter (pure)
├── atchart.mjs          .atchart.md v1.1 parser + serializer + the apps accessor
│                        (pure)                                        [spec: docs/atchart-format.md]
├── markdown.mjs         the notepad's markdown engine: CommonMark subset that
│                        builds DOM nodes (no HTML-string sinks — greped), refuses
│                        raw HTML, sanitizes links by allow-list; parseMarkdown /
│                        renderTo / applyEdit (the toolbar + palette seam) (pure)
├── notepad.mjs          the notepad model: pad + opaque-payload entries, host
│                        migrations, to/from .atchart.md through atchart.mjs (pure)
├── notepad-surface.mjs  the notepad's shared SURFACE: declared capabilities,
│                        canonical save/clear semantics, import/export/clipboard,
│                        storage-denied, row rendering — hosts place, never choose
├── structures.mjs       the palette's structure catalog: degree patterns resolved
│                        per key through resolveRoman, chart bodies canonicalized
│                        through atchart.mjs — greped for literal progressions (pure)
├── palette.mjs          the music palette: glyphs, the chord chooser, structure
│                        inserts, figure/slot-pattern snippets canonical through the
│                        motion grammar; padInsert = the caret-preserving seam
└── tests/
    ├── chord.test.mjs
    ├── upper-structure.test.mjs      roadmap §3.1's decomposition table as corpus
    ├── metronome.test.mjs            includes the study-inline anti-drift pin
    ├── atchart.test.mjs
    ├── markdown.test.mjs             the grep, the refusal corpus, the caret contract
    ├── notepad.test.mjs              byte round-trips, migrations, the inline pins
    ├── notepad-surface.test.mjs      the capability law + both-hosts save-clears
    ├── structures.test.mjs           the 12-key × catalog matrix + the grep
    ├── palette.test.mjs              valid-input-by-construction + the caret's survival
    ├── host-conformance.test.mjs     family spec §4.3: one host list, same assertions
    ├── isolation.test.mjs            the Phase B safety net: 500+ shipped étude
    │                                 configs reproduced exactly, uneven windows
    ├── drill.test.mjs                the same, plus a non-string material
    ├── figure.test.mjs               the chain end to end, headless: both
    │                                 materials, enclosures role-tagged, three
    │                                 playback modes, and mistakes failing with
    │                                 a message rather than a throw or silence
    ├── transport.test.mjs            the walk driven by injected beat lists —
    │                                 splits, count-in, loop wrap, meter change
    │                                 mid-pass, and the role-naming grep
    ├── voices.test.mjs               voiceSchedule pinned EXACTLY against the
    │                                 shipped study (it sits above the audio
    │                                 cut); the extracted half pinned
    │                                 structurally against the source text
    ├── tetrad-sequence.test.mjs      the frozen payload as an oracle for the
    │                                 CHOICE, not just membership: every step
    │                                 spells its chord, and where the rules
    │                                 coincide the voicings match exactly
    ├── voice-identity.test.mjs       the four cases a naive key breaks on —
    │                                 hold, move, crossing, octave leap — each
    │                                 at arity 3 and 4; crossing asserted
    │                                 DIFFERENTIALLY against the pitch-rank key
    ├── tetrad-voicings.test.mjs      the arity-4 gate proven end to end, the
    │                                 shells' arity evidence, and the frozen
    │                                 study's payload as a 15,840-voicing oracle
    ├── _load-tetrad-oracle.mjs       reads the frozen study's 1.1 MB payload,
    │                                 READ-ONLY (§5.2.1 — never modified)
    ├── triadetudes-engine.test.mjs   characterization of the shipped study's engine
    └── _load-triadetudes.mjs         extracts the study's <script> for headless testing
```

## Running the tests

Zero dependencies — the runner is Node's built-in `node:test` (Node ≥ 20):

```
node --test engine/tests/*.test.mjs
```

**Leave the glob unquoted** — the shell expands it. Node only resolves a glob itself from
Node 21, so the quoted form fails with *"Could not find …"* on the Node 20 this repo
targets.

CI runs that exact command in `.github/workflows/pages.yaml` before the Hugo build,
followed by `node --test hub/tests/*.test.mjs` for the door build gate (family spec
§4.2.2); a red test in either blocks deploy.

## Rules

- **No hand-placed musical data.** Interval formulas are named rules (`maj7 = R 3 5 7`),
  asserted structurally (root present, intervals ascending, pcs unique) at module load.
- **The characterization tests are read-only.** They load the shipped
  `static/studies/triadetudes/study.html` verbatim and pin its current behaviour; they
  never modify it. When Phase B extracts the hub, these tests are the safety net — the
  extracted engine must produce identical output before the study file is regenerated.
  **Used exactly that way on 2026-08-16** (Update Log 260816.2): `isolation.mjs` and
  `drill.mjs` were extracted against them, and no shipped file was touched. An extraction
  is a refactor, and a refactor is asserted, not reviewed.
- **A door-facing module belongs in `hub/`, not here.** This directory stays DOM-free;
  `hub/modules/*.mjs` own markup and styles and wrap these modules. The split is what
  makes CSS prunable from a door's lock (family spec §4.2.2).
- **No frameworks, no installs** (CLAUDE.md guardrail + the single-file charter promise).
  If a test needs a library, the design is wrong.
- **Consistency is asserted, not remembered** (family spec §4.3,
  `notes/specs/at-etudes-app-family.md`): a module with more than one host carries a
  conformance suite (`host-conformance.test.mjs`) that runs the same assertions against
  every host from one list — capability set, guarantee statements, behavioural contract —
  reading what RENDERS, not what the code registers. Adding a host is one list entry;
  an unwired host fails naming what is missing. This README's own module inventory is
  CI-asserted against `engine/*.mjs` by that suite — derived or asserted, never retyped.
