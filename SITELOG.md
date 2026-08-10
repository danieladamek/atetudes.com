# SITELOG — atetudes.com

Newest first. Every change to the site is recorded here: date, what changed, why, and for
ingests the source vault edition (per the Site Charter, `CLAUDE.md`).

---

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
