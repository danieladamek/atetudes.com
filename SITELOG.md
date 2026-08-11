# SITELOG — atetudes.com

Newest first. Every change to the site is recorded here: date, what changed, why, and for
ingests the source vault edition (per the Site Charter, `CLAUDE.md`).

---

## 2026-08-10 — Triadetudes: the chip row above the neck renders in both harmony modes (Daniel's dispatch)

- **The strip exposed it; the fix names it.** The chord chip row above the fretboard was
  treated as a Build-up artifact and vanished in Break down. It is not a Build-up
  feature — it is the **position indicator for the board** (which chord is sounding,
  where you are in the cycle), and that job is identical in both modes. v0.6.7's "one
  strip, two homes" moving element is superseded by **two elements with two roles over
  one dataset**: the read-only position row stays above the neck in both modes
  (`#chips` in `#chipsHome`), and the editor chips (`#bdChips` in the Harmony card's
  dock) exist only in Break down — the same split the app already makes between
  Transport BPM and Metronome BPM.
- **Labels are always the chords of the progression**, so the row means one thing
  everywhere: Build up → the triads (unchanged); Break down → the typed changes
  (`Dm7 G7 Cmaj7 D7#9 Dm6`), never the derived slash triads — the neck header already
  answers *what am I playing over it* ("F over D = Dm7 · 1st inv. …"); the row answers
  *which change am I on*.
- **Every editor affordance untouched**: tap opens the chip editor, `+` appends, `▾`
  marks multi-candidate chords, long-press deletes, drag reorders — all verified live,
  including the editor popover's re-anchoring after re-render (now against `#bdChips`).
  Editing the changes field updates the position row live; the row's chips still jump
  the position; the sounding chord highlights in both rows in time.
- **Quiet degradation**: an all-unparsed changes field hides the position row entirely
  (no empty chrome above the neck) while the editor chips keep showing the unreadable
  tokens with their ⚠ — that is their job, not the row's. An empty field falls back to
  the named default progression (existing behavior) and the row shows it.
- Verified per doctrine: engine suite 211/211 untouched; 20 interactive Playwright
  checks from `file://` offline across both modes, zero console/page errors; rendered
  and inspected at 1280/390 px with an eight-chord Break down progression — the row
  wraps to two lines on the phone and the fretboard stays in reach. Zero
  document-level key listeners, still. Update Log 260810.12.

## 2026-08-10 — Triadetudes: Shape & Motion becomes a strip above the neck (Daniel's dispatch; closes spec §7.4)

- **Layout only, reversible in one commit.** The Shape & Motion card leaves the config
  grid and becomes a full-width horizontal strip immediately above the fretboard region —
  the slot and shape the chord chip row already uses (a second instance of an existing
  element, not a new primitive). Order: config grid → strip → chord chips → fretboard;
  the chips stay against the neck, where their sounding-chord highlight works as the
  neck's position indicator. **No split** — the card stays one unit; §7.4's question is
  closed the way that makes the split unnecessary.
- **Inside the strip**, the controls read left → right as *what shape · what figure ·
  how it sounds*: string set + the "?" pivots disclosure · motion mode + figure picker +
  the figure field at real width (holds `(-1,+2)[1] - (+2,-1)[3] - (-s,+s)[5]` without
  truncation, asserted) · Placement + Playback + show-roots. The readout, the sketch
  line and the placement prose take full-width lines beneath the controls — they are
  prose, not controls.
- **390 px checked first**, per the item's stated risk: the strip reflows to stacked;
  full-page height 2887 px vs 2879 before (a wash), and Shape & Motion lands adjacent
  to the neck on the phone too — mobile is no worse, arguably better. Desktop height
  2045 vs 2008. Before/after screenshots at both widths are in the scrum note for the
  keep-or-revert call.
- **Nothing but DOM position and CSS moved.** No state change, `rawCfg()` untouched, no
  `v:` bump — round-trip and the pre-grammar/linear→free restore corpus re-asserted in
  the browser; engine suite 211/211 untouched; 12 interactive Playwright checks confirm
  every strip control still works after the move (mode switch, picker, placement, live
  neck sketch). Zero console/page errors; zero document-level key listeners, still.
  No neighbouring board touched. Update Log 260810.11.

## 2026-08-10 — Triadetudes v0.7.5–v0.7.8: the figure system completes, one pass (Daniel's dispatch, four interlocking items)

- **v0.7.6 — a target is a chord tone.** Target legality decides by PITCH CLASS against
  the sounding chord: bare `1`/`3`/`5` name the chord's own root/third/fifth
  (quality-aware, as before); any other spelling resolves to a pc and is legal only if
  the chord contains it — `[b3]` on a minor chord is now legal by derivation, provably
  the same path as `[3]`, and `[2]` on any triad is refused. **The refusal teaches**:
  "[2] is not a chord tone of Em — write (2)[3] and it becomes an approach to the
  third." — surfaced at input time by a trial-resolve so no chord ever silently plays
  nothing; the figure state is untouched on refusal. The non-voicing placement branch is
  **deleted**, not bypassed — every legal target is in the voicing, so no figure can
  escape the isolation zone. The sketch classifier and the grammar's rule are ONE
  predicate: `MOTION.classify`, called by clicking and typing alike.
- **v0.7.5 — the sketch emits the invariant.** The emitter's precedence reorders per
  spec §4.1: **scale-adjacency first**, semitone fallback, absolute degree last. A
  diatonic neighbour now emits `-s` (the invariant that follows a key or scale change —
  v0.6.6 at figure level, asserted: a figure sketched in C major re-resolved in C minor
  plays B♭, not B); a chromatic click still emits `-1`/`-2`; the harmonic-minor
  augmented second still emits `-s` (regression-pinned). The form is **tap-switchable**
  on the neck mark where both readings exist (`approachForms` names when), and the
  readout re-narrates — "the scale tone below" ↔ "a whole step below".
- **v0.7.7 — the figure gets a picker.** A named-preset `<select>` per mode plus
  Custom, following progSel: five tones presets (all bare chord-tone targets, asserted
  at load with parse checks — a preset typo cannot ship), four shape presets with
  **"Pivot first" derived from the current pivot**, never a stored literal (it follows
  when the pivot moves, verified). **Choosing a preset writes its grammar string into
  the visible field** — the picker is the on-ramp to the language. Switching mode
  selects that mode's first preset, so text can never reach the other parser — the
  mode-switch parse error is gone by construction. **The selection DERIVES from the
  figure source** after every writer — typing, the picker, restore, and every neck
  click — all four verified; typing a preset's own text derives that preset. `rawCfg()`
  stores the source, never a preset name; every existing entry restores identically.
- **v0.7.8 — sketch on the neck, and the staff goes.** The sketch panel, the echo
  staff, `renderStaff()` and the emit button are **removed** — one board fewer.
  Clicking a fretboard or keyboard note appends to the figure, draws in the Spec §2.6
  marks **through the étude's own rendering path** (the emitted part IS the rendered
  figure; only waiting approaches draw at their clicked position, same hollow 0.6
  mark), and **fills the field live** — clicking is typing, the readout narrates
  continuously, and the sketch line **names the chord the classification ran against**
  ("1 approach waiting, classified against C — click a chord tone of C (C, E, G)…").
  Tap cycles the mark's reading (target → approach → the other form → target;
  promotion only for chord tones — the same predicate); double-tap removes. The
  16-event ceiling refuses by name at the click. Playback still writes nothing to the
  buffer (asserted under a running transport); classifier, emitter and the
  parse(emit(buffer)) round-trip law pass unchanged.
- Verified per doctrine: engine suite 211/211 (motion contract updated to the two new
  laws + regression pins; new picker-derivation tests; every other pin untouched); 43
  interactive Playwright checks from `file://` offline plus real-click sanity, zero
  console/page errors; rendered and inspected at 1280/390 px at slow and fast tempo.
  Zero document-level key listeners, still; no bindings on digits or Space. `rawCfg()`
  round-trips with no `v:` bump. Update Log 260810.10.

## 2026-08-10 — Triadetudes v0.7.4: the echo staff becomes the way into the grammar (Daniel's dispatch)

- **The orphan gets the job the grammar created.** The echo staff — the app's only
  notation in v0.3, a click log ever since the score arrived in v0.4 — is now the figure
  sketchpad: click a figure on the fretboard or keyboard, press **use as note sequence**,
  and the app derives the grammar string and loads it into the field, where the readout
  narrates it back. The panel is renamed to advertise the job ("Sketch a figure — click
  notes, then load them as a note sequence") and stays collapsed by default.
- **Which clicked notes are targets? Derived, never asked** (golden rule 1): a clicked
  pitch class in the current chord's own triad is a **target** carrying its triad degree;
  anything else is an **approach** attaching to the next target — classified at click
  time against the then-current chord, whose root rides along in the buffer entry so a
  later hand-promotion names its degree against the same root. The override exists:
  tapping a note in the staff switches it target ↔ approach (a promoted non-chord tone
  takes its chord-root-relative degree by the same flat-spelling table the emitter uses).
  The buffer renders roles in §2.6's channels — targets solid with labels, approaches
  hollow at 0.6 radius, degree color diatonic, violet chromatic, no label — with a
  caption teaching the tap.
- **Emission is lossy and says so, once**: `MOTION.emitFromClicks` (shipped with the
  grammar, now consumed) writes signed-distance approaches when the click sits within
  two semitones or one scale step of its target, absolute degree tokens otherwise; the
  emitted string enters the SAME pipeline as typed input, the field switches to tones
  mode **out loud** ("loaded as a note sequence — the field is now in tones mode; octave
  and placement dropped — a figure is a design, not a fingering"). The round-trip law is
  a test: `parse(emit(buffer))` ≡ the buffer's degrees and approach relationships —
  never its pitches (the same sketch an octave up emits identically, asserted).
- **Every refusal is named**: a trailing approach with no target ("click a chord tone
  last" — the field untouched), the empty sketch, a sketch over the 16-event ceiling
  (refused at emit, before the field), and buffer overflow past 14 notes now *says*
  "sketch full — oldest note dropped" instead of silently shifting.
- **Deliberately not done, verified**: playback writes nothing to the buffer — asserted
  under a running transport; no correctness-checking, no MIDI. Zero document-level key
  listeners, still. The buffer is never stored (charter §7: the clicks are the user's
  data; everything derived passes the suite; `rawCfg()` untouched).
- Verified per doctrine: engine suite 206/206 (7 new sketch tests: classification rule,
  promoted-target rule, round-trip corpus incl. the trailing-approach error and the
  ceiling, emitted-figure resolution); 24 interactive Playwright checks from `file://`
  offline (real fretboard + keyboard clicks, tap-override both directions, all named
  refusals, playback isolation), zero console/page errors; the phase-2/3 legacy DOM
  matrix (42 hashes, 14 configs) STILL byte-identical; rendered and inspected at
  1280/390 px. Update Log 260810.9.

## 2026-08-10 — Triadetudes v0.7.3: the motion grammar and enclosures (v0.7 arc phase 3, Daniel's dispatch)

- **The grammar is engine code first** — `engine/motion.mjs` (family module, hand-inlined
  with a verbatim-checked namespace): `parse` / `serialize` / `describe` / `resolve` plus
  the sketchpad's `emitFromClicks`, with the fixed-point property (`serialize∘parse`
  idempotent) asserted at module load over a probe corpus, and every spec §8 assertion a
  running test — approaches exactly their written distance, scale approaches adjacent in
  the étude's scale, absolute degrees landing on the key's pitch class in the octave
  nearest the target, nothing hand-placed, the 16-event ceiling refusing by name.
- **The grammar as specified**: `(-1,+2)[1] - (+2,-1)[3] - (-s,+s)[5]` in tones mode,
  `(-1,+2)H - M - (-s)L` in shape mode; a leading sign is distance, an unsigned token is
  an absolute key degree; `s` is the étude's selected scale (chord-scales stay a v0.8+
  question, not improvised). **Motion follows: the shape · the tones** is a named mode
  control; the typed text re-parses under a mode switch, never silently converted; the
  legacy digit dialect still parses and normalises.
- **describe() is the deliverable**: the live sentence under the field names the idiom by
  derivation — enclosed / approached from / a run from — and the spec's own example
  renders verbatim ("The root, enclosed — a half step below, then a whole step above.").
  Parse failures are the sentence refusing to finish plus a caret at the offending
  character in a monospace line — no red box, no color. Rhythm generalises: n parses from
  the figure ("9 over 2 beats → …"), divides evenly, names awkward tuplets plainly, and
  refuses by name above the ceiling.
- **Approach markers per Spec v1.3 §2.6, now law**: 0.6 of the host radius, hollow, the
  color as stroke — degree color when diatonic, violet #7847A8 when chromatic — no new
  ring, no interval label; the slur to the target in annotation gray 1.2, drawn UNDER the
  dots; keyboard hosts the same treatment at its own radii; the score draws cue-size
  approach heads under the same color rules. The sounding-note pulse treats approaches as
  steps (they ring); the bass pedal and harmony strums still do not.
- **Line re-checked as the item demanded**: approaches put more notes per string, so the
  v0.7.0 rule holds and hardens — entering Line moves the figure to tones mode (stated),
  shape mode disables with its reason, and tones figures fully resolve against Line
  placements (the C figure's [5] lands at B-string 8). Legacy paths are provably
  untouched: the phase-2 byte-level DOM matrix (42 hashes, 14 configs) is STILL identical
  with the grammar in the file, and a null figure short-circuits to the pre-grammar order.
- **Forward-compat constraints honored** (Daniel, mid-build): `echoAdd()` widened to
  `{midi, string, fret}` at all three call sites (string/fret absent for keyboard clicks,
  nothing consuming them yet); zero document-level key listeners added — the count across
  all four published studies remains zero; no global digit/Space bindings.
- Verified per doctrine: engine suite 199/199 (20 grammar tests incl. the fixed-point
  corpus and emit precedence; 5 in-app figure-pipeline tests; every prior pin untouched);
  23 interactive Playwright checks from `file://` offline, zero console/page errors;
  figure rendered and inspected at 1280/390 px at slow and fast tempo. `rawCfg()` gains
  `motionMode`/`motionSrc` additively; pre-grammar entries restore figureless and
  identical. Update Log 260810.8.

## 2026-08-10 — Triadetudes v0.7.2: the note-event refactor completes (v0.7 arc phase 2, Daniel's dispatch)

- **One list per chord, every consumer reading it.** The producer is
  **`engine/note-events.mjs`** (new family module, hand-inlined with a verbatim
  anti-drift pin): `{midi, string, fret, role, slot, onset, dur}` — grown from
  v0.6.5's `arpOnsets`, which lives on as the alias. `role` makes an approach tone
  expressible (phase 3's consumer); `slot` is the relative-state invariant carried
  from the voicing note's birth (`string`/`fret` the derived coordinate — asserted);
  `onset`/`dur` are the single source of the subdivision arithmetic the audio path
  and the score used to compute independently.
- **All four renderers consume the list; none re-derives a note.** Audio (`strum`),
  the sounding-note pulse, the fretboard's order badges, the score (noteheads, beams
  and the bass-clef pedal), and the keyboard's active markers all read `onsetsFor()`'s
  one composition — `orderedMidis` retired, its bass register rule extracted verbatim
  into `bassMidiFor()`. The score's slot layout stays even-division by design; the
  onset-proportional layout arrives with the grammar's uneven figures.
- **Behaviour-preserving, proven twice as the item demanded, pin-first**: (1) the
  event lists a renderer consumes were frozen from the pre-refactor composition
  across six placement/playback configs × three chords and now live as a golden test
  the producer must reproduce number for number; (2) a byte-level DOM diff of all
  three visual renderers — 42 hashes across 14 config permutations spanning every
  placement, every playback, four meters and break-down mode — came back identical
  before vs after. Nothing a user can see moved.
- Verified per doctrine: engine suite 174/174 (golden event lists, full-shape and
  slot-honesty assertions, note-events anti-drift pin; every prior pin untouched);
  zero console/page errors across the capture matrix and the interactive pass;
  `rawCfg()` untouched — events are derived musical data and are never stored
  (charter §7); rendered and inspected at 1280/390 px at fast and slow tempo — and
  looking identical is, this time, the success criterion. Update Log 260810.7.

## 2026-08-10 — Triadetudes v0.7.1: the two costs, and Free gets a logic (v0.7 arc phase 1, Daniel's dispatch)

- **Free's opening chord is no longer decided by array emission order.** Per Daniel's
  call in the item: Free keeps the seed anchor and drops only the pivot term, so the
  étude begins in the isolation zone and is then *seen to leave it*. In Daniel's
  configuration Free's first chord is identical to Grip's, for the stated reason (the
  anchor), reached through the named tie rule.
- **Tie rules are named per mode, and the pin was the arbiter.** Free ties resolve to
  the lower neck position (smaller mean fret). Grip's ties — which turn out to include
  the *default étude's own opening chord* — are pinned to the historical resolution:
  earliest inversion (root position first), then the lower octave, which is the
  candidate generation order, now stated and asserted rather than accidental. The
  first cut applied the lower-position rule to both modes and the golden master
  moved — per the dispatch the pin is the authority, so the rule was scoped to Free
  and Grip's rule was named as what it always was. The default config's genuine tie
  ([5,5,3] vs [0,1,0], both anchor 1.0) is now a running assertion in both modes.
- **One cost became two named quantities** (spec §6.1.4): `voiceLeadCost` in PITCH
  (midi, voices matched by sorted order) and `placementCost` in FRETS (pivot window,
  seed anchor). Behaviour-preserving today — the arithmetic-identity test proves
  pitch-led equals fret-led while the set is fixed, and every characterization pin
  passed untouched — and it is the precondition for six strings, where one pitch has
  three fingerings.
- **The ladder is named and bounded.** Free walks the neck (roadmap §1.1's Ladder,
  previously arriving by accident); within three frets of the neck's end it wraps —
  re-seeking in the lowest position against the previous voicing transposed down an
  octave, the box jumping visibly to the nut. The item's verified two-cycle walk
  passes verbatim: 5 6 7 9 10 10 12 → 1, then 1 2 4 5 5 7 8 9, one wrap, nothing past
  the drawn board. Grip provably never wraps.
- **The readout says what each mode is doing and what it costs**, derived per render:
  Grip "30 semitones of movement across the cycle (Free would take 24)"; Free "24
  against 30 for Grip — wraps to the nut at bar 8"; Line gets its sentence too.
  Movement totals are derived musical data, never stored; `rawCfg()` unchanged, no
  new keys, round-trip no-op, restore corpus (box→grip, linear→free, line) re-proved.
- Verified per doctrine: engine suite 170/170 (new costs suite: arithmetic identity,
  seed rule, both tie rules firing on the real default-config tie, the verbatim
  ladder walk, movement totals 30/24, grip-never-wraps); 15 Playwright checks from
  `file://` offline, zero console/page errors; rendered and inspected at 1280/390 px
  at fast and slow tempo. Update Log 260810.6.

## 2026-08-10 — Triadetudes v0.7.0: a voicing becomes a note list, and Line goes live (backlog item, Daniel's dispatch)

- **The first slice of the note-event refactor**: a voicing is no longer three frets
  positionally bound to the string set but a list of `{string, fret, midi}` — still
  exactly three chord tones, ascending in pitch, midi carried rather than recomputed.
  All nine call sites converted (cost function, box extent, `arpOnsets`, fretboard,
  score, keyboard, and the characterization pin's accessors); nothing indexes a note by
  string position anymore. Roles, onsets and durations stayed where they were — this is
  the refactor's first slice, not a second representation beside it.
- **Line is selectable.** `lineVoicing()` implements spec §6.1.2 verbatim: window tones
  taken in the window, remaining tones minimising total fret span, at most three notes
  per string, ties → tighter span → nearer the pivot centre → the lower string.
  Stateless per chord — a line has no grip continuity. **The item's eight-chord table
  passes as the assertion corpus, both columns**: Grip pinned unmoved through the
  representation change, and the Line column reaches Daniel's stated placement — the C
  chord's fifth at B-string 8 beside the third at fret 5, two notes on one string, with
  the isolation box tightening from 3–8 to 5–8 exactly as the item predicted.
- **One nuance in the item's prose, pinned precisely rather than papered over**: "in
  every differing row the pitches are unchanged" holds exactly for the mid-progression
  moves (C, Em — same sounding pitches, new location); the *last* C differs in octave
  because Grip had drifted to E4-G4-C5 by positional continuity while the stateless
  Line returns to C4-E4-G4 — identical to the first C, per the table's own rows. Pitch
  classes are identical in every row; the test states the property exactly.
- **The H-M-L question resolved by a named rule, said out loud**: under Line the shape
  field is disabled and the hint states that Line plays its notes in placement order,
  low to high (a slot stops being a bijection when two notes share a string); tones-mode
  patterns arrive with the motion grammar. Block under Line still sounds all three and
  the hint says *sounded*, not gripped. The pulse rings the shared-string notes
  individually; `line` round-trips through `rawCfg()`; stored `linear` still resolves
  to `free`, provably never `line`.
- **Caught by the doctrine, worth recording**: the in-page v0.6.5 self-test still called
  the old `arpOnsets` signature and threw at page load — killing every statement after
  it — while the headless suite stayed green (the engine slice cuts above the self-test
  block). The zero-console-errors Playwright gate caught what the unit suite could not;
  fixed, all green.
- Verified per doctrine: engine suite 164/164 (new line corpus file; every prior pin
  through the representation change — golden masters byte-identical in value, accessors
  updated; the onsets equivalence oracle re-proved against the note list); 19 Playwright
  checks from `file://` offline, zero console/page errors; Daniel's configuration
  rendered and inspected at 1280/390 px. Update Log 260810.3.

## 2026-08-10 — Triadetudes v0.6.14: grip, line and free (backlog item, Daniel's dispatch)

- **Placement's states renamed to what they mean**, correcting v0.6.13's axis (the PO's
  wireframe misread, per the item — the build was faithful to the item it had): **Grip**
  (one note per string, playable as a chord, anchored to the pivots — was `box`),
  **Free** (the grip chosen by smoothest voice-leading, anchor released — was `linear`),
  and **Line** (free placement along the set, up to three notes per string — roadmap
  §1.4's grip-vs-line axis), which is **present but disabled** with its one-line reason
  ("needs the note-event refactor (v0.7)") — a named missing state, not a silent
  absence, per the v0.6.8 doctrine. v0.7a gains a load-bearing consumer.
- **The storage trap, asserted from the real restore path**: stored `box` → `grip`,
  stored `linear` → **`free`** — never `line`, which is new and has no history; unknown
  and absent values land on `grip`. All six branches pinned in Playwright plus in-page
  asserts; the restore corpus grew by the v0.6.13 era; additive, no `v:` bump,
  round-trip no-op with the new values.
- **The box stops being a mode**: the "?" disclosure now gives one sentence per
  placement and says the dashed box simply draws where the figure ended up living — a
  consequence of the placement, not a setting. Button titles carry the same sentences.
- Verified per doctrine: engine suite 158/158 (panel suite re-voiced to grip/free; all
  pins green — Grip reproduces the pinned `box` cost weights exactly); 18 Playwright
  checks from `file://` offline, zero console errors, incl. disabled-Line inertness;
  panel inspected at 1280/390 px. The motion-grammar §6.1 correction was already made
  by the PO session in the same pass. Update Log 260810.2.

## 2026-08-10 — Triadetudes v0.6.13: the panel says what it means (backlog item, Daniel's dispatch)

- **The ⚠ answered empirically before building** (Daniel's ask): across all 5,760
  voicings in the full config space, no single figure exceeds 9 semitones of pitch span
  or 4 frets of grip — today's engine cannot produce the Linear picture per-chord. What
  does widen is the union box across a progression (to 8 frets in 4 of 720 configs,
  worst: C harm scaleUp on 3-4-5) because the pivot cost is soft. The item's reading
  confirmed: effectively Box, nothing guaranteeing it, no separate bug to file.
- **The set selector names pitches** — `E-B-G · B-G-D · G-D-A · D-A-E`, derived from
  `OPEN` by `setLabel()` (no typed table; string numbers remain as tooltips), read
  high → low exactly as the numbers were.
- **The pattern speaks slots**: `H-M-L` (H = the set's highest-pitched string, one
  convention) in the field, the hint, `cfgObj()`'s `motion.pattern`, and the summary
  string; order badges unchanged (they were always order positions). Digits still parse
  and normalise on sync — old muscle memory and pasted configs unpunished. A pleasant
  consequence of slot display: the field text no longer changes on a set change at all.
- **Placement `Box · Linear`** — two named options, not a checkbox. Box (default)
  weights the isolation zone in `chooseVoicings` exactly as today — the golden masters
  pin it byte-identical; Linear releases the pivot constraint to pure voice-leading
  (the ratified roadmap-§4 constraint, exposed; asserted to actually differ with
  high-seated pivots). **Overflow widens the drawn box** — asserted on the worst
  surveyed case, `st.placement` untouched; never a silent fallback.
- **Playback `Arpeggiated · Block · Both`** retires "empty = block chord": emptiness
  means emptiness, playback is named. Old entries derive it from the retired encoding
  (`arpPattern:null` → Block) and restore identically — asserted key-by-key across a
  four-era corpus, plus the new-shape round-trip no-op. `Both` strums the harmony under
  the line's downbeat: composed in `onsetsFor()` over an untouched `arpOnsets` (the
  equivalence pin stands), strum events flagged so the v0.6.5 pulse skips them (harmony
  context, not steps — the bass-pedal doctrine extended), and mute-chords still mutes.
- **Two robustness holes found by the tests and fixed**: a foreign/imported config
  whose pattern names strings outside its set made `applyRaw` throw (v0.6.6's slot
  comparison; reachable since v0.6.9's import) — now stale-data-not-a-crash; and one
  whose pivot string sits outside its set produced a garbage default pattern — now
  re-seats through `defaultPivots()` first.
- The pivots/box/badges prose moves into a "?" disclosure (the item's recommendation) —
  the concept keeps its home, the denser panel keeps its calm.
- `rawCfg()`: pattern storage unchanged (absolute strings beside `set`, slots derive on
  load); `placement`/`playback` join as additive keys with derivation defaults, the
  same ratified mechanism as v0.6's `harmonyMode`. No `v:` bump.
- Verified per doctrine: engine suite 158/158 (new panel suite: derived labels, slot
  dialects, placement-differs, box-widening, displayPattern; all pins green); 28
  Playwright checks from `file://` offline, zero console errors; panel inspected at
  1280/390 px. Update Log 260810.1.

## 2026-08-09 — Triadetudes v0.6.12: BPM and click sound join the Transport (Daniel's review additions to the 7/4 item)

- **BPM slider** between the transport buttons and the Time sig/Bar split row — a mirror
  of the Metronome card's, per the item's one-state-two-views discipline: bounds cloned
  at init (no drift), both sliders drive one `changeBpm()`, `syncBpmUI()` resyncs both
  on every move and restore. **No tap tempo in the mirror**, per Daniel. Mid-run tempo
  bending unchanged (the core's grid-bend rule, already pinned).
- **A "metronome" checkbox** leads the checkbox row (`metronome · count-in · mute
  chords`) — Daniel's second-round call, replacing the first-pass Sound button: a
  selection box reads naturally beside count-in. Same one-state discipline: checkbox
  and the Metronome card's Sound button drive the same `st.clickOn` through
  `syncClickUI()`, restores sync both. Play-along setup (metronome off · mute chords)
  now lives entirely in the Transport. Also per review: the Bar split label breaks
  after the name, "(beats per chord)" entirely below it, selects still sharing their
  baseline.
- Range sliders on light cards take the neutral ink accent (Spec v1.2 rule 8 — the
  default browser blue sat too close to degree-3's family); the dark Metronome card
  keeps its light accent.
- Verified: both mirrors tested in both directions plus restore; suite 153/153; zero
  console errors; card inspected at 1280/390 px. Update Log 260809.10.

## 2026-08-09 — Triadetudes v0.6.11 + Metronome v1.0.1: 7/4, and a time signature in the Transport (backlog item, Daniel's dispatch)

- **7/4 is a family change, shipped as one**: the meter joins the shared metronome block
  in BOTH carriers (Triadetudes and the Metronome study), `SPLITS[7]` lands in the
  established style (`[7] · 4+3 · 3+4 · 2+2+3 · 3+2+2 · 2+3+2`), and
  `engine/metronome.mjs` + its verbatim anti-drift pin moved together — the Metronome
  study re-verified in the same pass (v1.0.1: loads clean, runs in 7/4, seven lamp
  dots). `subdivisionName()` asserted across every 7/4 split × arpeggio lengths 1–16
  (the 2.33-beat case names itself "whole-note triplet (3 over 7 beats)" by
  `writtenValue`'s existing ≥ rule); seven lamp dots confirmed at 390 px.
- **The Transport gains a Time sig selector, left of Bar split** — a mirror, not a
  second control: options cloned from the shared block at init (one list, no drift),
  both selectors drive one `changeMeter()`, and `syncMeterUI()` resyncs both on every
  change and restore. Sync tested in both directions, including a change made with the
  Transport card scrolled out of view.
- **The v0.6.6-disease bug the placement exposes, fixed by named rule**: `pattern()`'s
  `|| [st.meter]` silent swallow is REMOVED (a source-form test pins its absence);
  every meter change routes through `splitFor()` — keep the split only if the identical
  grouping exists in the new meter, else the new meter's whole-bar default, visible in
  the selector. Not total, honestly so: groupings sum to their meter, so a real meter
  change lands on the whole bar and says so on screen.
- **Mid-playback meter changes defer to the next bar line** — the card's own
  Play-joins-at-the-next-bar doctrine, now in the clock itself: `setMeter()` queues
  while running, the pump applies the change exactly on a bar boundary with beat
  indices continuous (étude join points survive) and bar/beat numbering rebased; the
  lamp follows the CLOCK's meter, redrawing at the bar line where the change lands, so
  lamp and clock can never disagree (asserted live: state 7 / clock 4 / queue full
  right after the change; clock 7 / queue empty / seven dots one bar later). Setting
  the meter back before the bar line cancels the queue. The selector is never disabled.
- **Deliberate omission for Daniel's call, raised not resolved**: no `[1,6]`/`[6,1]`
  in `SPLITS[7]`, though 5/4 carries `[1,4]`/`[4,1]` — a one-beat chord against a
  six-beat chord is not a grouping anyone practises, but the asymmetry should be a
  decision: add them to 7, or drop 5/4's pair.
- **Review fix, same day (Daniel):** the wrapped "Bar split" label pushed its select
  below the Time sig's — the row now bottom-aligns (`.row2.alignEnd`), selects sharing
  a baseline at both widths (0 px delta, asserted and inspected).
- Verified per doctrine: engine suite 153/153 (five new metronome-core deferral tests;
  split-rule walk over every meter transition; the existing split-sum invariant covers
  7 automatically; 3/4–6/4 golden masters byte-identical); 24 Playwright checks across
  both studies from `file://` offline, zero console errors; `rawCfg()` shape unchanged
  and legacy meter/split restores identity-checked for all four old meters; the two-up
  Transport row and the seven-dot lamp inspected at 1280/390 px. Update Log 260809.9.

## 2026-08-09 — Triadetudes v0.6.10: all twelve keys (backlog item, Daniel's dispatch)

- **The key selector reaches every pitch class.** Db/C#, Gb/F# and B join the nine —
  print-era residue removed; break-down romans, the chip wheel and `resolveRoman()` all
  supported twelve already, and the selector was the only gate.
- **The spelling is a derivation, not a table** (the item's rule, golden rule 1): of the
  enharmonic spellings of a tonic, the one whose scale carries the fewest accidentals
  wins, ties toward flats. That yields **Db major but C# harmonic minor, Gb major but
  F# minor, Ab minor over G# minor** — and a load-time assertion proves **no offered
  scale needs a double accidental, across all 12 tonics × 3 scale types** (melodic
  minor confirmed: F#/C# clear the raised-sixth pressure). `FLAT_KEYS` now derives from
  the same arithmetic (flat naming for keys whose major scale is flatward), reproducing
  the old set exactly for the old keys — the two lists can no longer drift. `KEYS` is
  the major-scale snapshot; the selector re-derives per scale.
- **One true tie found in the whole 12×3 space and pinned**: pc 1 melodic minor — Db
  (with Fb) and C# (with B#) both spell clean at six accidentals, so the ratified
  flats-tie-break yields **Db melodic minor**. If C# melodic minor is preferred, the
  tie-break becomes "flats in major, sharps in minor" — flagged for Daniel, one line
  either way.
- **Restores are pitch-class-true**: saved keys normalize through `pcOf()` to the
  canonical spelling for the entry's scale. All nine legacy keys × three scales restore
  as themselves (asserted, all 27); a foreign `C#`+major normalizes to Db at the same
  pitch class. No format change, no `v:` bump.
- Verified per doctrine: engine suite 143/143 — the KEYS-looping invariants (voicings,
  sevenths, pivot sweep) now cover twelve keys automatically, the fixed-key golden
  masters pin the nine byte-identical, and the roman path is asserted **on screen**, not
  just in the engine (`ii7 V7 Imaj7` in Gb renders Abm7 · Db7 · Gbmaj7). 55 Playwright
  checks from `file://` offline, zero console errors, readout/chips/score/fretboard
  regex-swept for stray double accidentals in B, Db/C# and Gb/F# across all three
  scales; inspected at 1280/390 px. Update Log 260809.7.
- **Report-back (the item's open question):** the selector's label does change under
  the cursor on a scale change (Db major → C# harmonic minor) — rendered and judged:
  it reads as instructive, because the entire page respells in the same instant (chips,
  readout, staff), the selection stays at the same list position, and the sounding key
  is audibly unchanged. Recommend keeping the single mutating label over a `Db / C#`
  dual label; screenshots captured for Daniel's own call.

## 2026-08-09 — Triadetudes v0.6.9: the notebook round-trips (backlog item, Daniel's dispatch)

- **Import lands, and the export learns to deserve it** (roadmap §2's Import line, S as
  rated). The fenced JSON block in each exported entry now carries the **full entry**
  (id, savedAt, minutes, title, summary, notes, cfg) instead of only the config — same
  visual document, lossless round-trip. New **Import (.md/.json)** button beside Export:
  an exported log **merges** back in (dedup by id, append unknowns, sort by date —
  import never deletes, re-import is a no-op), and a bare `.json` config applies as the
  current étude with restore semantics (nothing saved until the user saves) — the
  "étude import" half of Daniel's ask, one branch.
- **Pre-v0.6.9 exports import degraded but intact**, by pinned policy rather than
  improvisation: configs arrive whole (the point of migration), ids are content-hashed
  from the entry text (so re-importing an old file is idempotent too), dates
  reconstructed from the entry's human line plus the export header's year — V8 parses
  the year-less form into 2001, so the header-year injection is load-bearing — falling
  back to import time, prose intention/accomplished recovered. The import message says
  "from an older export (dates approximate)".
- **Pure and seeded for the notepad arc**: `logToMarkdown` / `parseLogExport` /
  `mergeLog` are DOM-free functions above the engine-slice cut, harvested by the
  characterization loader, written against the fenced-JSON-under-headings convention
  the notepad decisions ratified and `.atchart.md` §2.5 preserves — marked for
  absorption into `engine/notepad.mjs` (the `arpOnsets` precedent). Builder's check
  from the item ran: the notepad module has not landed, so the seed lives in-study.
- Bad files are data (charter §7 boundary clause): broken JSON, foreign JSON, truncated
  fences and headerless files all produce a named message beside the button — mixed
  files import the intact entries and count the broken ones. `rawCfg()` untouched, no
  `v:` bump.
- Verified per doctrine: engine suite 137/137 (new headless notebook suite: lossless
  round-trip field-identical, degraded policy pinned exactly incl. the 2026 date
  reconstruction, garbage/mixed files, merge idempotence; all prior pins green); 18
  Playwright checks from `file://` offline driving the **real file input** — export,
  wipe, import, history byte-identical; old-format import restores a break-down étude
  exactly; bare-config apply; two failure modes named — zero console errors; notebook
  inspected at 1280/390 px. Update Log 260809.6.

## 2026-08-09 — Triadetudes v0.6.8: the readout says only true things (backlog item, Daniel's dispatch)

- **No partial read is false anymore.** The break-down readout reorders to
  **`F+ over D = DmMaj7 · 2nd inv. · …`** — "F+" true, "F+ over D" true, the whole line
  true; the bass sits between the triad and the equality it makes hold. Chips take
  **slash notation**: big `F+/D`, small `= DmMaj7` — and `F+/D` is the app's own input
  syntax, so the chip reads back in the language the user types. The small line is
  suppressed when it would only repeat the big one (`F/G` chips no longer echo
  themselves). The deliberate register difference stands for Daniel's inspection: the
  readout says "over" (prose has room), the chip says "/" (it doesn't).
- **The root's red comes off the source symbol** in both readout branches (the build-up
  arrow variant included) — a test asserts the readout emits no inline color at all.
  And the concrete bug on the element Daniel was looking at is fixed: **current and
  unreadable chips no longer share a costume** — current is ink weight with a solid
  heavier border, error keeps red dashed (the honest use of an alarm color); a computed-
  style check pins that they differ by border style, not color alone.
- **The symmetry is now visible**: `classifyTriad` returns three readings for an
  augmented subset, and the engine now registers each — `DmMaj7` grows its ▾ offering
  **F+ / A+ / C#+** (b3 first, consistent with the rootless-seventh stack), one guitar
  shape with three names, moved in major thirds. Two engine changes in
  `engine/upper-structure.mjs` (register every off-root aug reading; aug roots keep
  their degree spelling — C#+ no longer respelled Db+ by the stacked-third double-
  accidental check, since a symmetric triad's members take the chord's own degree
  names). Module re-inlined, anti-drift pin re-verified.
- **Recorded, not fixed here, per the item's scope**: the wider `--red` leak into
  interface furniture (Play button, danger/delete, build-up selection states) — and one
  more sighting for that list: the score's small triad reading under each break-down
  symbol is also red. Re-deciding the accent color is its own item with Spec
  consequences.
- Verified per doctrine: engine suite 131/131 (new aug-rotation test; characterization +
  anti-drift pins green; degree colors on the boards spot-asserted unmoved); 28
  Playwright checks from `file://` offline, zero console errors — the DmMaj7 strings
  pinned verbatim, a nine-symbol corpus asserting no `triad = symbol` substring without
  the bass between, no inline color in the readout, cur/err computed-style separation,
  the ▾ rotation list; rendered and inspected at 1280/390 px in both modes.
  Update Log 260809.5.

## 2026-08-09 — Triadetudes v0.6.7: the chip editor comes to the changes (backlog item, Daniel's dispatch)

- **Placement fix, per the item: nothing new built.** In break-down mode the chip row and
  its `+` now dock inside the Harmony card, directly under the changes field — the input
  lives beside the field that writes the same data. In build-up mode the row stays at its
  stage position above the fretboard (a read-only where-am-I display). **One element, one
  render path**: `renderChips()` moves the single `#chips` node between two new anchor
  containers (`#chipsDock` in the card, `#chipsHome` at the stage) chosen by mode; a
  count assertion in the checks pins exactly one row through mode round-trips and
  notebook restores. Element IDs unchanged (new IDs added, none renamed, per v0.6.6's
  constraint).
- **Popup geometry**: the editor now clamps to the viewport vertically as well —
  flipping above its anchor chip when there is no room below — and scrolls itself into
  view. Pre-move finding, recorded as the item asked: the popup was NOT already broken
  at 390 px (horizontal clamp held on first and last chips), so the vertical flip is
  new capability for the docked position, not an inherited-bug fix.
- Both entry paths verified in the new home: `+` appends (seeded from the last symbol,
  `G7` on empty — reachable even with an empty progression) and opens the editor on the
  new chip; the text field round-trip is pinned — a ▾ choice on `G9` survives a text
  edit that leaves that token untouched.
- One bug of this build's own making, caught by the doctrine before it shipped: a
  variable collision in the editor's new positioning code (`h` shadowed the heading
  helper) broke the page script entirely; the zero-console-errors gate caught it on the
  first verification run.
- Verified per doctrine: engine suite 130/130, characterization + all anti-drift pins
  unmoved; 23 Playwright checks from `file://` offline, zero console errors — mount per
  mode, single-row assertion across two mode round-trips, editor fully within viewport
  on first and last chips at 1280 px and 390 px, restore-driven mounts both ways;
  rendered and inspected at both widths in both modes. Update Log 260809.4.

## 2026-08-09 — Triadetudes v0.6.6: the design survives a context change (backlog item, Daniel's dispatch)

- **The reset is gone, by representation rather than patching.** A string-set click used
  to run three resets (pivots re-defaulted, arpeggio pattern wiped, position zeroed), and
  key/scale changes re-defaulted the pivots too. Root cause per the item: the design was
  stored absolute (string/fret numbers) when its meaning is relative (slot of the set,
  scale degree). New shared module **`engine/string-sets.mjs`** encodes the law: patterns
  translate through slot lists (`3-4-2-2` on 2-3-4 = mid-low-high-high = `4-5-3-3` on
  3-4-5 — the item's worked case, pinned by name in module load-asserts, engine tests,
  and the in-page self-tests), pivots re-seat by scale degree with the octave nearest the
  prior fret so the box slides rather than jumps. All derived by named rule and asserted;
  translation is silent — the field just redisplays, because nothing went wrong.
- The three handlers now call `changeSet`/`changeKey`/`changeScale` (translate + re-seat)
  and reset nothing. **Build call, per the item's invitation: `st.cur=0` dropped on all
  three** — the progression's shape is unchanged by a context change, so the position
  survives too. Serialization untouched: `rawCfg()` still stores absolute strings beside
  the set, no `v:` bump, and a pre-item notebook entry restores byte-identically (tested).
- **The two-card regroup**: Design and Context & Motion dissolve into **Harmony** (key ·
  scale · build-up/break-down · progression · start-on · bass) and **Shape & Motion**
  (string set + pivots hint · arpeggio pattern + subdivision readout · root notes + badge
  hint). DOM-only: every element ID unchanged, and the notebook restore path drives the
  new layout untouched. At 1280 px the four cards (with Metronome and Transport) now fill
  one row evenly — tighter than the five-card wrap it replaces; inspected at 390 px too.
- One cosmetic fix exposed by the new freedom: a translated box seated high could run its
  dashed border off the SVG edge (pre-existing v0.5 rendering; voicings may legally sit at
  NFRETS+2). The border now clamps to the drawn board.
- Verified per doctrine: engine suite 130/130 — `engine/tests/string-sets.test.mjs` covers
  the worked case by name, slot round-trips across all four sets and pattern shapes incl.
  the 16-note ceiling, the pivot sweep across all keys × scales × sets asserting degree
  preserved *and* octave nearest, plus headless no-reset behaviour through the study's own
  transition functions and a cycle-all-sets-return-home identity. Characterization +
  anti-drift pins unmoved, new verbatim pin on the string-sets inline. 48 Playwright
  checks from `file://` offline with zero console errors, including the click-through of
  the reported bug (custom pattern + custom pivots, all four sets cycled: figure and box
  translated, `arpCustom` true, position held). Screenshots inspected at both widths.
  Update Log 260809.3.
- **Report-backs from the item:** (1) watched before/after, the nearest-octave rule reads
  as a true translation — the box slides diagonally because the *same pivot pitches* live
  higher on the lower string; the grip visibly travels rather than teleporting. (2) The
  sibling check: **Tetrad Voice-Leading carries no equivalent reset today** — its set
  change swaps precomputed passes and preserves position, with no user-authored pattern
  or pivots to destroy; it becomes a string-sets.mjs consumer the moment its roadmap adds
  them. **Modes-from-Pentatonic-Boxes has no string-set concept at all.** No fix items
  needed; finding on record here.

## 2026-08-09 — Triadetudes v0.6.5: the sounding-note pulse (backlog item, Daniel's dispatch)

- **The missing half of the order badges: which note is sounding right now.** One moving
  element, per Daniel's design decision in the item: a neutral ring (charcoal on light,
  white on black keys), concentric with the sounding dot, expanding from the dot's own
  radius and fading in ~180 ms. Dot fill, size, label, order badge, isolation box: all
  untouched. Fretboard and keyboard pulse from **one** subscriber and one event; ring
  geometry is a ratio of the host dot (fret r 14, keys r 6–7.5), so one tuning serves both.
- **The pulse is the transport's, not the audio's**: onset derivation was lifted out of
  `strum()` into a pure `arpOnsets()` — the note-event seed, carrying v0.7 §1.4's field
  names (`{midi,string,fret,role,offset,dur}`, minus `slot`) so the note-event refactor
  absorbs it rather than migrating it. Both the audio path and the pulse consume that one
  list, which is why play-along (chords muted) still shows where in the figure you are.
  **The bass never pulses** — settled by Daniel: it's a pedal, filtered by `role`, and on
  the keyboard the bass marker visibly holds still while its neighbours pulse.
- Block chords spawn their three rings 28 ms apart, overlapping into **one gesture**
  (rendered both ways per the item; the overlap reads correctly — choice recorded here).
  Arpeggio mode keeps one ring alive at a time. `prefers-reduced-motion: reduce` degrades
  to a fixed-radius fade. Pulses live in their own SVG layers (the keyboard grew layer
  structure for this) so chord changes never kill a mid-flight ring; nothing was added to
  `rawCfg()` — the cue exists only while the transport runs.
- Verified per doctrine: engine suite 119/119, including the new headless onset tests
  (invariants across every meter split × arp on/off × both harmony modes) and the
  **equivalence pin** — `arpOnsets` reproduces `strum()`'s previous inline scheduling
  number-for-number, so the audio is provably unmoved. 14 Playwright checks from `file://`
  offline (ring on a derived (string,fret); both views on the same midi; no bass pulse
  with a bass sounding; play-along pulse; break-down pulse; reduced-motion fade;
  stop-clears-all), zero console errors; screenshots inspected at 1280/390 px at 60 and
  160 bpm plus pulse-timed close-ups of both boards. `hugo` + `check_site.py` clean.
  One deviation from the item's acceptance wording, surfaced for review: the literal
  "last onset + duration within the chord's span" assertion contradicts the shipped legato
  behaviour the same item pins as unchanged (note tails ring past the span by design), so
  the structural assertions bound the **onsets** to the span and durations to positive —
  the tails stay faithful to the audio. Update Log 260809.2.

## 2026-08-09 — Triadetudes v0.6.0: the harmony panel — break-down mode + chip editor (backlog item, Daniel's dispatch)

- **Break-down mode is the new front door** (roadmap §3.1): one **Harmony** card with two
  modes. *Build up* is the previous behavior relabeled, and the "Hear the triads over a
  bass" menu now lives inside it — extension-selection and progression-selection are one
  musical decision. *Break down* takes the changes as you'd face them on a gig —
  `Dm7 G7 Cmaj7`, `ii7 V7 Imaj7`, `Fmaj7#11`, `G7alt`, `F/G` — and derives per chord the
  upper-structure triad on the selected string set plus the chord root as the bass, on the
  lower staff and in the audio.
- **Nothing is looked up; everything is derived** (golden rule 1 / charter §7): the new
  shared module `engine/upper-structure.mjs` derives candidates from `parseChord()` output
  by four named rules (chord-tone triads · tension triad on the b7 · tritone-sub triad ·
  triad identity) with a named per-family ranking; roadmap §3.1's decomposition table is
  enforced as the assertion corpus in `engine/tests/upper-structure.test.mjs`. Roman
  numerals resolve against the étude's key via the new `resolveRoman()` in
  `engine/chord.mjs`, tested across all twelve keys and all three scales. Both modules are
  hand-inlined into the study (the metronome precedent) with a verbatim anti-drift pin.
- **Chip editor** (§3.2): chips are now writable — tap to edit (root wheel + quality
  menu), "+" to append, drag to reorder, long-press to delete, "×2" to repeat. Chips show
  both identities (big `B°`, small `= G7`); where one symbol holds several honest triads
  the chip grows a ▾ (`G9` → B°, F, or Dm; per Daniel's call the menu offers *every*
  derived candidate) and the choice is remembered per chord in the config. `°7` rotates
  its stacked-m3 reading on each repeat. Unparseable tokens are data, not a crash: the
  chip carries the parser's message and the rest of the progression still renders.
- Everything round-trips through `rawCfg()`/`applyRaw()` — including per-chord ▾ choices —
  so the practice notebook restores break-down études exactly; pre-v0.6 entries restore
  as build-up études unchanged.
- Verified per doctrine: engine suite 115/115 (characterization golden-masters ran against
  the edited study — build-up's musical output is pinned unmoved); 40 Playwright checks
  from `file://` with network disabled (mode switch, mixed roman/alt/slash/garbage input,
  ▾ choice + round-trip, old-config restore, ×2/append/delete/drag, °7 rotation, score
  symbols, bass audio), zero console errors; screenshots inspected at 1280 px and 390 px;
  `hugo` + `tools/check_site.py` clean. Update Log 260809.1.

## 2026-08-09 — Triadetudes v0.5.5: mini transports on every board (Daniel's request, Cowork)

- Each of the three stage boards — fretboard, score, keyboard — now carries a small
  ⏮ ▶ ⏹ ⏭ cluster top-right: step back/forward (with strum), play the étude, stop.
  Same semantics as the Transport card (⏹ also quick-stops a standalone metronome);
  no more scrolling to the cards mid-practice. First installment of the roadmap's
  §3.3 practice-posture work.
- Verified per doctrine: 8 Playwright checks from `file://` (minis on all three boards,
  step/play/stop wired across different boards' clusters), zero console errors;
  suite 85/85.

## 2026-08-08 — NEW APP: Metronome v1.0 — the first At-Etudes appliance (Daniel's direction, Cowork)

- **`/studies/metronome/`** — the shared metronome component, standing alone as its own
  published page: the dark appliance block (family look), three click voices, tap tempo,
  accents, subdivisions to 16ths, beat lamp. Settings persist locally; single
  self-contained file, offline from a double-click. Wrapper page + landing card added.
- **The notepad, with the pattern built in**: a free-text pad (autosaved) plus saved
  notes, where **every saved note is stamped with the metronome's settings at that
  moment** — an idea remembers the tempo it arrived at. *Apply* on any note restores
  the metronome to that moment; *Export (.md)* writes pad + notes with each note's
  settings as a fenced JSON data block. That text-plus-machine-readable-payload shape is
  deliberate: it is the seed of the idea-development notepad Daniel wants to grow and
  spread to the other apps (backlog: *The notepad pattern*).
- The **anti-drift CI test now covers both carriers** (triadetudes + metronome): every
  app inlining the component must match `engine/metronome.mjs` verbatim or deploy blocks.
- Verified per doctrine: 14 Playwright checks from `file://`, network disabled, zero
  console errors — ticking, tap tempo, note save/apply/export with settings payload,
  full persistence across reload. One real bug caught and fixed in verification: the
  in-page self-test ran before config load and clobbered stored settings on every visit.
  Engine suite 85/85.

## 2026-08-08 — Triadetudes v0.5.4: the metronome block stands alone (Daniel's design, Cowork)

- **First card, top-left, inverted** — the family convention, stated in the block itself:
  every At-Etudes app carries this metronome, first block, this look. Ink ground,
  light-on-dark controls, inverted primary Start button; the beat lamp now lights
  white-on-charcoal (downbeat full white + scale bump) instead of fighting a white card.
  It reads as an appliance among the étude's paper-white controls, which is the point.
- **Three click voices** — one small Voice select, no UI sprawl: **beep** (square, the
  original), **wood** (short triangle "tock"), **tick** (high-passed noise, hi-hat-ish).
  All synthesized inline, zero assets, per-voice accent character; changing voice
  auditions it. Voice rides in the config; pre-v0.5.4 entries default to beep.
- Verified per doctrine: 13 Playwright checks from `file://` (card order, computed dark
  background, all three voices scheduling, lamp palette, join/stop/play-along semantics
  intact, config round-trip), zero console errors; engine suite 85/85, anti-drift and
  characterization pins intact.

## 2026-08-08 — Triadetudes v0.5.3: the metronome becomes a standalone shared component (Daniel's direction, Cowork)

- **Inverted the clock ownership** per Daniel's design: the metronome is now its own
  machine — own card above the Transport, own Start button, BPM + **tap tempo**, time
  signature, accents, subdivision (beats/8ths/**triplets/16ths**), sound toggle, volume,
  and a visual **beat lamp**. The étude transport is a *subscriber*: **Play joins a
  running metronome at the next bar boundary** (grid-locked — verified to <5ms), so the
  click you already hear is the count-in. If the metronome isn't running, Play starts it
  (optional count-in bar). Stopping the étude leaves a self-started metronome running;
  the metronome's Stop stops everything — it owns the clock.
- **The component is shared-by-design:** canonical source is `engine/metronome.mjs`
  (pure timing core, injected time, 9 CI tests — grid math, tempo-bend continuity, tap
  averaging, bar-join indices). The study carries a hand-inlined copy until Phase B's
  build step; an **anti-drift CI test asserts the copy matches the module verbatim**.
  Every future app instantiates this same metronome; the map-side studies can adopt it
  at their next touch.
- Verified per doctrine: 20 Playwright checks from `file://`, network disabled, zero
  console errors — standalone ticking, bar-boundary join, stop-semantics both ways,
  tap tempo, triplet subdivision, config round-trip incl. legacy entries. Engine suite
  **85/85**; music core untouched, characterization pin intact.

## 2026-08-08 — Triadetudes v0.5.2: mute-chords keeps the animation (Daniel's request, Cowork)

- The v0.5.1 channel split left the cursor advance inside the chord player's branch, so
  muting the chords also froze the display. Corrected: **the cursor advance belongs to the
  transport, not the audio** — the chips, fretboard and score now track the count whether
  or not the chords sound. "Mute chords" is thereby a true **play-along mode**: the changes
  animate in time, the player supplies the triads (with or without the click).
- Verified per doctrine (Playwright, `file://`, network disabled, 17 behavioral checks
  incl. muted-playback advancing the cursor with zero notes scheduled; zero console
  errors); engine suite 76/76, characterization pin intact.

## 2026-08-08 — Triadetudes v0.5.1: the metronome becomes its own channel (Daniel's request, Cowork)

- **Click on/off** — the ask: chords can now play without the click. Previously the click
  was welded into the playback scheduler; `schedule()` now offers each beat to two
  independent consumers — the metronome channel and the chord player — on one shared clock.
- **Full metronome:** volume slider · accents toggle (bar>chord>beat, or flat) · beat/8th
  subdivision · **count-in** (one clicked bar before the étude enters; always audible —
  that is its job — even with the click otherwise off). "Metronome only" is now "mute
  chords": with it, the channel pairs give all four play modes.
- All metronome state rides in `rawCfg()`/`applyRaw()` — notebook restore rebuilds it;
  entries saved before v0.5.1 restore with defaults (verified).
- Page version strings corrected to **v0.5.1** per the same-day arbitration (the shipped
  study is the roadmap's v0.5 line; v1.0 remains the site-integration milestone).
- Verified per doctrine: Playwright/Chromium from `file://` with network disabled — zero
  requests, zero console errors; changed behavior exercised (click-off scheduling, count-in
  bar isolation, 8th subdivision rate, config round-trip incl. legacy entries); screenshots
  at 1280 and 390 px; engine suite 76/76 (music core untouched — characterization pin intact).

## 2026-08-08 — Ratifications: web contracts, .atchart.md v1, version arbitration (Cowork)

- **Charter gains a "Web application contracts" section** (`docs/charter-and-conventions.md`):
  the single-file promise (§5, adopted earlier today), the **copyright posture** (§6 — no
  server-side chart library, sharing, accounts, or community collection, ever; ratified
  knowingly), the **authored/user-input boundary** for golden rule 1 (§7 — user charts are
  data, not code; everything derived from them passes the assertion suite; nothing derived
  is stored), and the **chart interchange format as law** (§8). CLAUDE.md Part II carries
  the boundary clause verbatim. These were the two blockers gating Phase B — now clear.
- **`.atchart.md` v1 ratified** — `docs/atchart-format.md` status flips from draft to law.
- **Version arbitration:** the Triadetudes study shipped in `efcc44f` labeled "v1.0" is
  the roadmap's **v0.5**; the roadmap's numbering line wins (v1.0 remains the site
  integration / hub extraction milestone). The commit message stands as history.

## 2026-08-08 — Engine test infrastructure: `engine/`, CI-enforced (Cowork)

- **New tracked directory `engine/`** — the shared JS music engine, site-side counterpart
  of `generators/`: the chord-symbol parser (`chord.mjs`), the `.atchart.md` v1
  parser/serializer (`atchart.mjs`, spec drafted at `docs/atchart-format.md`, pending
  ratification), and a test suite (76 tests) on Node's built-in runner — zero
  dependencies, per the no-frameworks guardrail.
- **`pages.yaml` gains an "Engine tests" step before the Hugo build** — the first CI
  enforcement of the assertion doctrine on the site side. Includes a characterization
  suite that loads `static/studies/triadetudes/study.html` verbatim and pins its engine
  (self-tests promoted from console.error, golden-master voicings, whole-config-space
  invariants, parser cross-checks). The study file itself is untouched; a future
  extraction must reproduce these values or CI blocks the deploy.
- Why now: Phase A of the family plan (`notes/specs/at-etudes-app-family.md` §5) — the
  parser serves both Triadetudes v0.6 break-down mode and Substitute Teacher ST-0, and
  the pin protects the Phase B hub extraction.

## 2026-08-08 — NEW STUDY: Triadetudes v1.0 (Daniel's direction, built in Cowork)

- **`/studies/triadetudes/`** — the triad étude designer, the site's first **site-side
  application**: its music engine (scales with correct spelling across major/harmonic/
  melodic minor, triad voicing enumeration, pivot-constrained minimal-movement voice
  leading, five progression engines + custom, upper-structure reinterpretation over a
  chosen bass) is computed live in JavaScript with in-page self-tests, not
  vault-generated. **This supersedes the vault-payload requirement for this page and
  must be recorded as a charter amendment in the vault's Site Prompt / Update Log**
  (flagged; see `notes/specs/etudor-prd... → triadetudes-prd.md` §2 and the single-file
  offline requirement in `notes/specs/triadetudes-roadmap.md` §5).
- Features at v1.0: key/scale/string-set/pivot selection with isolation box · cycling
  4ths/6ths/3rds, scalar, chromatic, custom progressions · typed arpeggio patterns with
  derived subdivisions (and correct tuplet notation — quarter/half-note tuplets
  bracketed, never beamed) · meter + bar-split transport with 3-level accents · full
  étude rendered end-to-end on a grand staff with click-to-jump · playable synced
  keyboard + echo staff · root/3rd-below/5th-below bass options with function
  relabeling · practice notebook (intention/accomplished, localStorage history,
  restore-exact-étude, markdown export). Colors per Design Spec v1.1.
- Development lineage preserved in `notes/prototypes/` (etudor v0.1–0.2, triadetudes
  v0.3–0.5); spec + roadmaps in `notes/specs/`.
- Verified per the charter (web edition): in-page assertions green; Playwright/Chromium
  from `file://` **with network disabled — zero requests, zero console errors**; core
  flows exercised (scale/extension/arp/meter changes, transport stepping, notebook
  save+restore round-trip); desktop + 390 px screenshots reviewed across v0.3–v0.5.
- Landing page: Triadetudes card added to the Studies grid. Wrapper page
  `content/studies/triadetudes.md` (standard `layout: study` iframe + "Open
  standalone").

## 2026-08-08 — Modes study: the listening release (Daniel's direction, built in Cowork)

- `studies/modes-from-pentatonic-boxes/study.html` gains four features, per P1 of
  `notes/specs/modes-pentatonic-roadmap.md` (UI layer only — the vault payload is
  untouched, and the page remains a self-contained single file):
  - **Drone** — a sustained tonal-center pad (root + octave + fifth, low register).
    Two grains, one drone at a time: the control-row button drones the caption's
    global hearing, and **each box's panel has its own drone button** droning *that
    box's* hearing — flip the box major ↔ minor and its drone follows (A → F♯ for
    box 5 of A major, verified). Turning a drone on anywhere moves it there;
    "sound: off" silences it.
  - **Tempo control** — box playback was hardwired at 210 ms/note; now an eighth-note
    BPM slider (60–200, default 140 ≈ the old feel).
  - **Play all** — plays the five boxes in order down the neck, auto-scrolling, with
    the sounding box's title highlighted; click again to stop.
  - **Clickable legend** — the footer's degree-color legend now pins a family across
    every box (the hover highlight, made sticky and touch-friendly).
- Verified headless (Chromium, `file://`): zero console errors; drone follows key
  change (A→C) and hearing flip (C major → A minor); legend pin highlights 12 / dims
  75 dots and releases clean; tour starts, highlights, stops; sound-off tears down
  drone and tour. Desktop screenshot reviewed.
- **For the vault's Update Log**: the site copy of this study now leads the vault
  edition (260806.13) — these four features should be folded back into the vault
  master or the divergence noted there.

## 2026-08-06 — Landing copy rewritten learner-first (Daniel's direction)

- Daniel found the hero copy off-putting — it led with the engineering story
  ("generated, not drawn", derivation/assertions) rather than what a visiting musician
  gets. Rewritten around the learner: what the studies teach, how they respond (pick a
  key, flip hearings, tap to hear), and what the colors do for the reader. Tagline is
  now "Interactive jazz études — see it, flip it, hear it." Site meta description
  updated to match. The generated-and-verified story remains told on the blog
  (welcome post), where it fits.
- Verified: landing at 1280/390 px, zero console errors, links clean (fixed missing
  paragraph spacing in the hero on inspection).

## 2026-08-06 — Brand: @etudes wordmark adopted site-wide (Daniel's direction)

- Daniel supplied the logo: a red **@** followed by **etudes** with each letter in a
  degree color — the mark spells the degree sequence **R·2·3·4·5·6·7** in Spec v1.1
  colors (a musical-function use of the palette). Recreated as a vector wordmark at
  `assets/logo.svg` (house fonts: Georgia @, Helvetica letters; exact Spec hexes).
- Now used as: **navbar logo** (title text off — the wordmark carries the name),
  **landing hero** (replacing the text headline), **favicon** (the red @ alone,
  replacing the ink Æ), and a new **OG image** `assets/og.png` (1200×630 @2x, rendered
  from the SVG in Chromium) wired site-wide via a config cascade — closes the missing
  OG-image item from the initial build.
- **For the vault Spec:** the brand mark's use of the degree palette (degree-sequence
  wordmark) should be recorded as a ratified convention in doc 4 / Site Prompt v1.1.
- Verified: landing, study wrapper, blog in Chromium at 1280/390 px, zero console
  errors, link checker clean, og:image meta confirmed on all page types.

## 2026-08-06 — Study pages: iframe wrappers replace nav injection (Daniel's direction)

- **Vault files are now published byte-identical** (verified with `cmp` against
  `02 Publications/`): each lives at `/studies/<slug>/study.html`, and the permanent
  `/studies/<slug>/` URL is now a Hugo wrapper page (`layout: study`) — real Hextra
  navbar (search included) + slim title bar with an **"Open standalone ↗"** link + a
  full-viewport iframe loading the raw file. Downloading via the standalone link yields
  exactly the vault edition.
- `tools/ingest_study.py` retired (same-day; injection approach superseded before any
  vault re-ingest needed it). **Ingest is now a plain file copy** to
  `static/studies/<slug>/study.html` — no transformation of generated pages, ever.
- New `/studies/` section index (docs-style list of all studies); navbar "Studies" menu
  now points there instead of the landing anchor.
- Layout note: `layouts/study.html` includes Hextra's sidebar partial (collapsed) —
  without it the theme's mobile hamburger JS throws on a missing container (caught as
  console errors in verification, fixed).
- Verified: wrappers + raw files + landing + studies index in Chromium at 1280/390 px,
  zero console errors, controls exercised *inside* the iframes, link checker clean.

## 2026-08-06 — Study pages: site nav bar injected at ingest (Daniel's direction)

- Both study pages now carry the site navigation bar (Æ mark + At-Etudes → home,
  Studies, Blog) at the top. Injection is done by the new **`tools/ingest_study.py`** —
  a deterministic, idempotent transform run at every ingest (marker comments delimit the
  block; a fresh vault edition is dropped in place and the script re-run). The generated
  pages are never hand-edited; the injected bar is inline-styled, neutral-chrome only,
  and links with absolute URLs so downloaded pages stay self-contained and still point
  home. Ingest workflow note added to the CLAUDE.md amendment.
- Verified: both studies in Chromium at 1280/390 px, zero console errors, controls
  exercised, link checker clean; double-run of the injector confirmed idempotent.

## 2026-08-06 — Redesign: site rebuilt on Hugo + Hextra (Daniel's direction)

- **Stack change, approved by Daniel in-session** (supersedes the charter's plain-static
  clause; amendment noted at the top of `CLAUDE.md`, vault-side Site Prompt v1.1 pending):
  the site is now a **Hugo** site using the **Hextra** theme (hugo module, v0.12.3),
  built and deployed by **GitHub Actions** (`.github/workflows/pages.yaml`; Pages build
  type switched from branch to workflow).
- **Look neutralized to house style** per Daniel's choice: light mode only, dark-mode
  toggle off, Hextra's blue accent overridden to near-neutral ink via HSL variables in
  `assets/css/custom.css` — degree colors stay reserved for musical function (legend on
  the landing page, as before).
- **URLs preserved**: studies unchanged at `/studies/<slug>/` (now served from
  `static/studies/`, files untouched); `/blog/` unchanged; the welcome post's canonical
  URL is now `/blog/welcome/` with a redirect alias at the old `/blog/welcome.html`.
  Retired (unpublished, no inbound links): `/assets/site.css`.
- **Retired tooling**: `tools/build_blog.py` (blog is Hugo content in `content/blog/`);
  old hand-built `index.html`, `blog/*.html`, `assets/site.css` removed — git history is
  the archive. `tools/check_site.py` now checks the built `public/`.
- **Verified** (doctrine): all five key pages in Chromium at 1280 px and 390 px, zero
  console errors, screenshots inspected (caught and fixed: footer said "Hextra Project",
  hero headline gradient washed out), study controls exercised and responding, link
  checker clean on the built output.

## 2026-08-06 — Live: DNS resolved, HTTPS enforced, site public at https://atetudes.com

- Daniel set the GoDaddy records (4 apex A → GitHub Pages IPs, `www` CNAME →
  `danieladamek.github.io`); both hostnames resolve to all four IPs.
- Original certificate request had stalled (domain was attached before DNS existed);
  re-saved the custom domain to trigger a fresh request — Let's Encrypt cert issued
  (expires 2026-11-05), **Enforce HTTPS enabled** via API.
- **Live spot-check over real DNS/TLS**: `/`, both studies, `/blog/`, `/blog/welcome.html`,
  `/assets/site.css` all HTTP 200 on https; study pages byte-identical to ingested
  editions; `http://` → 301 → `https://atetudes.com/`; `https://www.` → 301 → apex.
  (One transient 503 on the stylesheet during edge propagation; clean on retry.)

## 2026-08-06 — Published: repo + GitHub Pages live (initial deploy)

- With Daniel's go-ahead: created public repo **github.com/danieladamek/atetudes.com** and
  pushed `main` (root commit `fa5731a`, the initial build below).
- Enabled GitHub Pages from `main` branch root; custom domain **atetudes.com** picked up
  from `CNAME`; build completed.
- **Deploy spot-check** (verification step 5, via the Pages edge IP with Host header, since
  DNS is not yet configured): `/`, both `/studies/…/` pages, `/blog/`, `/blog/welcome.html`,
  `/assets/site.css` all serve HTTP 200; study pages byte-identical sizes to the ingested
  editions; landing title correct.
- **HTTPS enforcement pending**: cert cannot issue until Daniel sets the DNS records
  (apex A → 185.199.108.153/109/110/111, `www` CNAME → `danieladamek.github.io`). Flip
  "Enforce HTTPS" (or ask a session to) once DNS propagates.

## 2026-08-06 — Initial build (v1)

- **Scaffold**: repo initialized (`main`), `CNAME` (atetudes.com), `.nojekyll`, Site Charter
  v1.0 committed as `CLAUDE.md`, this SITELOG. Palette checked against vault Spec **v1.1** —
  matches the charter's degree color code exactly.
- **Landing page** `index.html`: intro to the system, degree-color legend (musical-function
  use of the palette), cards for both studies and the blog. Chrome in the neutral family
  (`assets/site.css`: ink #212126 / gray #73737A / ground #ECECEE / white cards).
- **Ingested studies** (self-contained single files, unmodified from the vault's
  `02 Publications/`):
  - `studies/modes-from-pentatonic-boxes/` ← `Modes_From_Pentatonics_Interactive.html`
    ("Modes from Pentatonic Boxes — Interactive Guitar Fretboard Map"), vault edition of
    2026-08-06 — current through Update Log **260806.13** (fretboard realism pass; box
    numbering convention settled in 260806.12).
  - `studies/tetrad-voice-leading/` ← `Voicing_Cycles_Interactive.html`
    ("Tetrad Voice Leading — Cycling Through a Scale"), vault edition of 2026-08-06 —
    Update Log **260807.1** (cycles interactive v3: five engines, three scales, 12 keys,
    2,160 asserted passes).
- **Blog scaffold**: `tools/build_blog.py` (stdlib-only Markdown→HTML), built `blog/index.html`,
  and welcome post `blog/src/2026-08-06-welcome.md` → `blog/welcome.html`.
- **Tooling**: `tools/check_site.py` (link integrity, HTML parse, CNAME/.nojekyll presence).
- **For the vault's Update Log**: both ingests above should be flagged there (site now
  serves these editions publicly at `/studies/modes-from-pentatonic-boxes/` and
  `/studies/tetrad-voice-leading/`).
- **Not yet done**: OG image (assets/ has favicon only); GitHub remote + Pages
  configuration and DNS await Daniel.
