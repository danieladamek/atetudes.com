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
├── reference.mjs        THE REFERENCE TONE (Multetudes child 5): a real
│                        fretted note on string 5 or 6, chosen against the
│                        window — v0.9's placeBass re-derived, refusal BY
│                        NAME when both strings are taken, a reach past the
│                        box flagged as a stretch. The composite is NAMED BY
│                        READ-BACK: a suffix assembled from degree rules must
│                        reproduce the pc set through parseChord — chord.mjs
│                        stays the one vocabulary owner — or the stack is
│                        honestly unnamed (pure)
├── triad-voicings.mjs   THE TRIAD CANDIDATE GENERATOR (Multetudes child 4),
│                        extracted from the shelved Triadetudes study and
│                        pinned DIFFERENTIALLY against it through the
│                        read-only loader, candidate for candidate. One rule
│                        (a rotation walked strictly up the set), no shape
│                        tables; quality from chord.mjs; the inversion READ
│                        BACK from the result; more than three tones refuses
│                        by name — the coreTetrad silent-slice lesson (pure)
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
├── field.mjs            THE FIELD (Multetudes): a key, a scale, and a
│                        reference tone that re-roots it — the same seven
│                        notes read against a different centre, which is what
│                        a mode is. Both degrees on every note: deg (vs the
│                        reference — colours/labels) and keyDeg (into the
│                        scale — chords/bass). Tuning derived from its named
│                        rule, pinned equal to tetrad-sequence's (pure)
├── position.mjs         THE POSITION (Multetudes): the ratified window (C5,
│                        260821) as a value — three consecutive scale notes on
│                        the anchor string, derived through string-sets.mjs's
│                        pivotWindow, never reimplemented; step() is box
│                        shift; regionOf() names the drawn rectangle apart
│                        from isolation.mjs's single-string zone (G9);
│                        materialIn() is the UNCAPPED pool (pure)
├── selection.mjs        THE SELECTION (Multetudes, Route B): the second
│                        placement path, native over field/position/string-run
│                        and the only module that knows a string can carry
│                        more than one note. oneOfEach (a voicing: THE VOICING
│                        RULE — spread before tightening — then the §6.1.2
│                        key; ceiling checked on the COMBINATION), every-
│                        Occurrence (the arpeggio, ≤n per string), scaleTake
│                        (placement off, the reach the only cap). Pinned to
│                        agree with isolation.mjs's lineVoicing at one note
│                        per string; divergence at n>1 deliberate and pinned
│                        by name (pure)
├── string-run.mjs       THE FREE STRING SET (Multetudes): any run of strings,
│                        contiguous or skipped, stored as the array itself;
│                        labels derived from the open strings' pitch classes
│                        (never enumerated — greped); fromSetIndex the
│                        load-time migration alias; translateFigure wires
│                        string-sets.mjs and rules the unequal-size case:
│                        exact growing, clamp-to-top-and-REPORT shrinking (pure)
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
    ├── field.test.mjs                the two degrees pinned apart; the chord/
    │                                 bass path pinned to keyDeg; the tuning
    │                                 pinned equal across its two modules
    ├── selection.test.mjs            THE CONFORMANCE CASE (the §6.1.2 choice,
    │                                 pinned against lineVoicing at n=1, joint
    │                                 refusals included); the divergence pin
    │                                 with its counterexample; Take-is-not-
    │                                 Placement as a corpus theorem; the
    │                                 collision law at the data level
    ├── position.test.mjs             the pivotWindow differential; the
    │                                 Ionian/Dorian same-box identity pin; the
    │                                 e5ba874 no-adjacent-frets pin; the
    │                                 uncapped pool
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
    ├── _carriers.mjs                 THE CARRIER CENSUS: which studies carry
    │                                 which modules — doors DERIVED from the
    │                                 resolver's reach-set, pre-hub studies
    │                                 DETECTED from the published bytes; the
    │                                 fact is stated nowhere by hand
    ├── _family.mjs                   THE FAMILY REGISTER: which pages are the
    │                                 family, app vs chart, and where each
    │                                 floor surface lives — the answer to
    │                                 "which APPS?" for a shared idiom
    ├── family-register.test.mjs      register completeness vs static/studies/
    │                                 and the census; registered handles exist
    │                                 in the published bytes (the browser floor
    │                                 itself runs in tools/family_floor.py)
    ├── carrier-census.test.mjs       every carried module pinned verbatim in
    │                                 every published study, pairs from the
    │                                 census; census completeness (a new study
    │                                 cannot slip in unpinned)
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

## The carrier re-inline procedure — for any change to a carried module

**Twelve of the fourteen original engine modules are byte-pinned into published studies (§4.2.4).
Changing one is never a one-file edit.** This procedure was established by the first re-inline
(chord.mjs learning `+M7`, Update Log 260819.6) and is the one every later change copies. It lives
here because everyone editing `engine/` is already bound to this README, and the census it depends
on lives beside it in `tests/`.

**Do not work out which studies carry the module. Ask the census:**

```
node --input-type=module -e 'import { carriersOf, CENSUS } from "./engine/tests/_carriers.mjs";
  const m = "chord";  // your module
  for (const c of carriersOf(m)) console.log(c, "→", CENSUS.get(c).source);'
```

Every carrier comes back tagged with its SHAPE, and the shape decides the work:

1. **Make the engine change**, with its tests. Run the suite and sort the reds — **there are two
   kinds and they mean opposite things** (N4 finding 3, 260820.1):
   - **A behaviour pin asserting the OLD value** (a module test, a characterization test): the old
     value was correct until this change. **Update the pin to the new truth — never delete it.**
     The updated pin is part of this change's tests.
   - **The census pin** (`carrier-census.test.mjs`) red for every carrier: that is the procedure's
     checklist, not a failure — it stays red until step 2 re-inlines each carrier. A census pin
     that stays GREEN for a carrier you know you changed means the census is wrong: stop.
2. **For each carrier, by its census tag** — version bump and re-inline in ONE pass per carrier
   (N4 finding 2: bumping after rebuilding forced a second rebuild; bump first):
   - **`derived` (a hub door):** bump the version in `present.blurb`, THEN rebuild once
     (`node hub/tools/build.mjs`) and copy the build output over
     `static/studies/<slug>/study.html`, byte-identical (`cmp` it). **Never hand-edit a door's
     published file** — the door source (`hub/doors/*.door.mjs`, `hub/modules/*`) is the only thing
     a hand touches.
   - **`detected` (a pre-hub, hand-authored study):** the published file IS the source. Apply the
     exact same bytes the module gained, at the same seam, to the inlined copy — the whole-module
     pins require byte fidelity, so copy the text, do not re-type it — and bump the study's header
     tag and footer in the same edit. Touch nothing outside those regions; if the fix seems to need
     more, stop and report (the inline boundary is not where it was thought to be).

   A re-inline changes shipped behaviour in every carrier, which is why every carrier bumps. If a
   carrier genuinely should not, say why in the report rather than skipping it quietly.
3. **Hunt the change's OTHER consumers — the census cannot see them** (N4 finding 1, the procedure's
   first failure: it ran GREEN while an artifact still shipped the old string through a documented
   app-side duplicate). **Grep every built artifact for the OLD form** — the string, spelling, or
   value the change retired — in `static/studies/*/study.html` and `hub/build/*.html`. A hit is an
   app-side consumer the module change did not reach; fix it at its own source (a door module, a
   hand-authored region) and say so in the report.
4. **Prove the drift is gone:** the census pin and every module pin green again. Then the full
   ritual for every changed study — `file://` with the network disabled, zero console errors — and
   the studies you did NOT change byte-identical (`git status static/`).
5. **Log it:** SITELOG names every changed study and states that the URLs are unchanged; the Update
   Log entry names the census as the carrier list used.

**The safety net, not the plan:** if a carrier is missed, `carrier-census.test.mjs` fails naming the
study and the fix ("rebuild the door and re-publish" / "re-inline the module"). It was proven to
bite on exactly this shape before the first re-inline ran (260819.5).

## Which APPS? — propagating a shared idiom (not a module)

The census above answers *which carriers* for a **module**. It cannot answer *which apps* for a
shared **UI idiom** — mute icons, the card grammar, info buttons — because an idiom is not a module,
and this week's three idiom propagations each answered the question by hand: "both apps" meant the
two on screen, in a family of five, and left the appliance behind twice.

**The family register answers it: `engine/tests/_family.mjs`.** For any idiom change, the checklist
is `appsOf()` — every registered `kind: "app"` entry — and the item records a **disposition per
app**: *carried* · *deliberately divergent, with the written reason §4.4 requires* · *not
applicable, with the reason*. An app not mentioned is not "out of scope"; it is a silent divergence,
which §4.4 defines as a defect. The register's completeness is CI-asserted
(`family-register.test.mjs`), so the checklist cannot rot; the floor itself (Ruling 2's four
surfaces) is asserted at the artifact level by `tools/family_floor.py`.

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
