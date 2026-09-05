## 2026-09-05 — the shelf reads ragged: four things the assertions could not catch (follow-up to the AptÉtudes/SolÉtudes shelf item)

- **§1 The orphaned fourth card.** Both sections now lay out at `cols: 2` — 4 becomes a clean 2×2,
  2 becomes one full row. The column count is a fact about the section, stated in
  `data/study_sections.yaml` beside its name and standfirst; the `study-section` shortcode reads
  it (default 3 if absent). Side effect checked: at 1280 **no** card subtitle clamps any more
  (three of six did at `cols=3`); at 390, in the single column, five of six still clamp at
  Hextra's three lines — Daniel's copy untouched, reported in the scrum.
- **§2 The ragged thumbnails — a re-capture, not CSS.** `tools/capture_cards.py` gained two
  ASSERTED rules and four of the frames were re-cut under them: **crop close** (the subject is
  the content's own box with a 6 px hairline pad, and the 16:10 cover may add at most 1.25× the
  subject's area, else the capture is refused) and a **1400 px long-edge floor** (the frame is
  chosen in CSS px; the device scale factor is raised per capture — 3×, 4×, 5× — until the clip
  clears it). Both are also asserted over every PNG on disk at the end of any run, so a card a
  subset run did not touch cannot sit under the floor. Re-cut: **triadetudes** (660×412 →
  1570×980; the readout and the neck under the window, to 16:10), **tetradetudes** (1046×654 →
  1404×876; the neck region widened along the neck, shifted off the neck's edge), **modes**
  (1340×838 → 1974×1233), **tetrad-voice-leading** (1408×880 → 2088×1305), each the same
  Daniel-named subject with the page margin cut away. **multetudes** re-captured from the
  v0.5.6 canon (2284×1426 → 2320×1450): its pinned readout was the v0.1.0 wording, updated to
  the night-34 words for the same ratified boot, and its subject is now named honestly as the
  strip's board and the ON THE NECK board. Six cards 345 kB total (was 274). Screenshots are
  now `full_page`, since Playwright clamps a clip to the viewport otherwise.
- **§2, not done — metronome.** The script REFUSES the metronome frame on this working tree:
  the study here is the night-35 **v1.5.0** (another session's uncommitted work) and the frame
  Daniel picked asserts v1.4.4. `metronome.png` is unchanged (1688×1054, fills its frame, clears
  the floor); its frame is to be re-derived against v1.5.0 by whoever ships that study.
- **§3 The cramped Blog heading — root cause.** Hextra's compiled Tailwind ships `hx:mt-8` but
  **not** `hx:mt-10`, so the Blog `<h2>`'s top margin was silently a no-op. All three shelf
  headings now carry one house class, `.shelf-heading`, whose margins are stated once in
  `assets/css/custom.css` (2.5rem above; a heading with a standfirst under it takes a small
  bottom margin, a plain one the standard gap). Measured after: SolÉtudes and Blog both sit
  40 px below what precedes them.
- **§4 The index standfirst measure — Daniel's call, not made here.** Shipped unchanged (option
  B, `max-width: 46rem`, wraps mid-clause on the index). Option A (the standfirst at the row
  width, index only) rendered by injecting one rule and screenshotted beside B; both handed to
  Daniel. A is a two-line change (a class on the index's `<main>`, one CSS rule).
- **Verified:** `hugo` clean; `check_site.py` 21 pages clean; the shelf item's §8 re-run
  (Playwright + Chromium, served build, `/` and `/studies/` at 1280 and 390, zero console
  errors, twelve study addresses 200, nav At-Etudes, Open and thumbnail links exercised) — and
  the four pages rendered and looked at, which is the instrument that found these.
- Out of scope, both filed: the Hextra sidebar; the "At-Etudes – At-Etudes" browser title.

## 2026-09-05 — AptÉtudes and SolÉtudes: the landing page gets two sections, /studies/ becomes one study at a time, the nav says At-Etudes (URL unmoved)

- **What:** the landing page's single *Studies* heading and its three cards become two named
  sections with a one-line gray standfirst each — **AptÉtudes** (Metronome · Multetudes ·
  Triadetudes · Tetradetudes) and **SolÉtudes** (Tetrad Voice Leading · Modes from Pentatonic
  Boxes). Triadetudes and Tetradetudes are relisted (delisted 2026-09-01; the premise withdrawn by
  Daniel's 260923 ruling) and Tetrad Voice Leading is on the front page for the first time — every
  card that has ever been on this page is on it. `/studies/` is a real index now: one study per
  row, thumbnail left, title + long blurb + Open right, grouped under the same two headings;
  stacks to one column below 700px. The `main` menu label *Studies* → **At-Etudes**; `pageRef`
  and weight unchanged. `content/studies/_index.md` title → At-Etudes; **the path, and so the
  URL, does not move** — all six `/studies/<slug>/` and `/studies/<slug>/study.html` unchanged.
- **Why:** Daniel, 260929 (item *AptEtudes and SolEtudes — the landing page gets two sections,
  and the index becomes one study at a time*). His cut: AptÉtudes are highly flexible and
  shapeable; SolÉtudes are more predefined. Site chrome only — not the Spec, not the app-family
  taxonomy; `hub/` and `engine/` do not learn the words.
- **How it is derived, not listed:** each study's front matter gained `section`, `order`,
  `blurb` (the six §4 blurbs verbatim) and `subtitle` (the landing card's copy — the three
  existing subtitles verbatim, the three new ones from §5). Section names and standfirsts live
  once in `data/study_sections.yaml`. The landing page's two blocks are
  `{{< study-section key="apt" >}}` / `key="sol"` — a thin shortcode that renders Hextra's own
  card partials over the front matter, so the markup is what a hand-listed `{{< cards >}}` block
  produces. `layouts/studies/list.html` reads the same three sources. Hextra's `cards`/`card`
  shortcodes cannot iterate, which is why the shortcode wraps their partials rather than them.
- **The sixth thumbnail:** `static/assets/cards/tetrad-voice-leading.png` (1408×880, 37 kB),
  captured by `tools/capture_cards.py` — the study at Cycling 4ths, C major, step 2 of 8: Fmaj7
  (IVmaj7, 2nd inversion) sounding on the neck and the keyboard together, the 5 and the 7 ringed
  as the voices about to fall; asserted by the timeline readout, the narration line, the four
  sounding labels on both staves, and the ringed pair. Frame is the build session's pick under
  Daniel's 260929 ruling. The script takes slugs now (`capture_cards.py tetrad-voice-leading`)
  so the five existing captures were not re-rasterised; the total-budget assertion is over the
  directory. Cards on disk: 6, 274 kB total (was 5, 243 kB).
- **Chrome:** new rules under a commented heading at the end of `assets/css/custom.css`; house
  neutrals only (`#ECECEE` / `#FFFFFF` / `#212126` / `#73737A` / `#D8D8DC`, 10px radius); the
  13 `--primary-*` lines untouched. The landing page's legend remains the one degree-color use.
  Hextra's sidebar on `/studies/` still lists the content tree — out of scope, per the item.
- **Verified:** `hugo` clean (one deprecation fixed: `hugo.Data`); `check_site.py` 21 pages, all
  links resolve; Playwright + Chromium on a served build at 1280 and 390 for `/` and `/studies/`
  — zero console errors, no horizontal overflow, all six thumbnails loaded, rows two-column at
  1280 and one-column at 390, standfirst computed `rgb(115,115,122)`, navbar *At-Etudes* →
  `/studies/`, both É headings in the built HTML; the twelve study addresses plus `/studies/`
  all 200; Open and thumbnail links exercised → `/studies/metronome/` with its iframe. The
  exercise step caught one defect before ship (thumbnails linked to `/studies/` — `$` vs the
  study inside a `with`), fixed and re-verified.
- **Death date:** `layouts/studies/list.html` and its CSS go with *Site shell — study overview
  pages*; the front matter and `data/study_sections.yaml` survive it.
- **Not committed by this session** — the working tree also carries the night-35 changes
  (`engine/`, `hub/`, the metronome and triadetudes studies, the SITELOG entry below), which are
  another session's; the two sets should land in separate commits.

## 2026-09-05 — DEPLOYED: night 34 live — tetradetudes and triadetudes moved (the canon's words), the other four unmoved; all six checked; written from the run

- record: run 33982707799 · success · commit 5602ae9 · fetched 2026-09-05T18:08Z · 6/6 studies byte-identical · digest 6c8476647bda
- Actions run 33982707799 green on `5602ae9` — https://github.com/danieladamek/atetudes.com/actions/runs/33982707799 (created 2026-09-05T18:00:38Z, finished 2026-09-05T18:07:21Z).
- metronome: repo 47cd79f8adb2 · live 47cd79f8adb2 — matches.
- modes-from-pentatonic-boxes: repo 59f73b76f87b · live 59f73b76f87b — matches.
- multetudes: repo 6dc7eba5a198 · live 6dc7eba5a198 — matches.
- tetrad-voice-leading: repo ce9df25cd930 · live ce9df25cd930 — matches.
- tetradetudes: repo 82dcfbadceac · live 82dcfbadceac — matches.
- triadetudes: repo df4404bee0a4 · live df4404bee0a4 — matches.

## 2026-09-06 — night 34: the vocabulary sweep — tetradetudes and triadetudes take multetudes' words

- **Canon is Multetudes for every word** (Daniel, 260923; "Centricity for sure across all"). The
  report in `notes/working/Multetudes build run 260928.md`. Multetudes itself is unchanged.
- **Renamed on tetradetudes and triadetudes (labels only, no stored value):** the key/scale card
  Harmony → **Centricity**; the caption Playback → **Movement** and its words Strum / Arpeggiated /
  Both → **strum / arpeggiate / both** (the values `strum`, `arpeggiated`, `both` untouched); the
  figure's alphabet caption Figure addresses / Motion follows → **The figure is**; the bass label
  "Hear the tetrads over a bass" / "Hear the triads over a bass (extension)" → **Bass / reference
  tone**; triadetudes' derived set label takes the family's en dash (E–B–G); the direction trap in
  one card reworded so each statement names what it orders (the set's label reads highest first;
  the slots count up from the low string) — no slot renumbered, no set reordered.
- **Kept, deliberately:** Both, Free, Build up / Break down (feature differences); Grip / Line
  (already the canon's case); the figure input alphabets (night 37); "Key" as a label on the two
  (the unnamed-selects ruling).
- **The lexicon** (`hub/lexicon.mjs`) gained the canon words and compares EXACTLY now — case is
  the canon's too; host-conformance green over all four shipped studies. notepad-card's CYCLE
  literal guarded like SETS (update the literal, do not import).
- **Studies moved:** tetradetudes (rebuilt, cmp-identical) and triadetudes (the hand-authored page).
- **Gates from their logs:** engine green · doors 18,756/0 (`hub/tests/out/doors-0905-0828.log`) · bite
  53/53 (`bite-0905-0834.log`) · hugo 0 · check_site with the record verify · served ritual on both
  renamed surfaces, both widths.

## 2026-09-05 — DEPLOYED: night 32 live — triadetudes moved (Strum), the other five unmoved; all six checked; written from the run

- record: run 33964864646 · success · commit 405048a · fetched 2026-09-05T12:09Z · 6/6 studies byte-identical · digest fe892ef293a2
- Actions run 33964864646 green on `405048a` — https://github.com/danieladamek/atetudes.com/actions/runs/33964864646 (created 2026-09-05T12:01:11Z, finished 2026-09-05T12:08:08Z).
- metronome: repo 47cd79f8adb2 · live 47cd79f8adb2 — matches.
- modes-from-pentatonic-boxes: repo 59f73b76f87b · live 59f73b76f87b — matches.
- multetudes: repo 6dc7eba5a198 · live 6dc7eba5a198 — matches.
- tetrad-voice-leading: repo ce9df25cd930 · live ce9df25cd930 — matches.
- tetradetudes: repo 39a85617acc0 · live 39a85617acc0 — matches.
- triadetudes: repo da4c0468c257 · live da4c0468c257 — matches.

## 2026-09-05 — night 32: the floor, declared and asserted — the family's words as a fourth host list; Block → Strum reaches triadetudes

- **No door moved** (multetudes and tetradetudes builds byte-identical to the served copies);
  **triadetudes moves** (hand-authored). The report in `notes/working/Multetudes build run
  260926.md`.
- **The lexicon (item 1):** `hub/lexicon.mjs` states the family's control vocabulary once — meter,
  subdivision, voice, BPM, Vol, scale, placement (Grip/Line), playback (Strum) — Multetudes the
  reference (Daniel, 260923); a helper with no engine import, so scribe can reach it.
  `engine/tests/host-conformance.test.mjs` gains its fourth host list, asserting every word on the
  four shipped studies' own `<option>`s and segment buttons (and, where a door fills a control at
  mount, the literal the page ships). An unwired host fails naming the surface, the control, the
  expected word and the found word. Excluded, each with its reason and each a ruling for Daniel:
  arpeggiate/Arpeggiated, Both, the Playback/Movement caption, Key, Free, Build/Break, slots, the
  extension select, the notepad nouns (already a host list).
- **Block → Strum in triadetudes (item 2):** the segment's value and label, every branch on the
  stored value, the two hints, the notebook summary, and the restore — which now applies
  engine/figure.mjs's `playbackWord` alias (tetradetudes' own migration shape), inlined as one
  guarded line, so a saved étude carrying "block" still loads. Two engine tests that pinned the old
  word rewritten.
- **The SETS literal's guard (item 3):** host-conformance imports STRING_SETS and reads
  notepad-card's literal from source; unequal fails with "UPDATE THE LITERAL … do NOT import";
  proven biting through redrun (a lowercase e); shape-motion's docstring asserted too, with the
  reason. Reported, not fixed: notepad-card's CYCLE (the same pattern), FAMILY and SCALE (a
  lowercase register).
- **Gates from their logs:** engine 615/615 · doors 18,757/0 (`hub/tests/out/doors-0905-0655.log`; no
  door moved, bite not re-run) · hugo 0 · check_site with the record verify (5 checked) · served ritual
  on triadetudes, both widths.

## 2026-09-05 — DEPLOYED: v0.5.6 live — multetudes, tetradetudes, metronome and triadetudes moved; all six checked; written from the run

- record: run 33955281681 · success · commit d04029e · fetched 2026-09-05T08:35Z · 6/6 studies byte-identical · digest 0025a6f524b6
- Actions run 33955281681 green on `d04029e` — https://github.com/danieladamek/atetudes.com/actions/runs/33955281681 (created 2026-09-05T08:26:52Z, finished 2026-09-05T08:33:52Z).
- metronome: repo 47cd79f8adb2 · live 47cd79f8adb2 — matches.
- modes-from-pentatonic-boxes: repo 59f73b76f87b · live 59f73b76f87b — matches.
- multetudes: repo 6dc7eba5a198 · live 6dc7eba5a198 — matches.
- tetrad-voice-leading: repo ce9df25cd930 · live ce9df25cd930 — matches.
- tetradetudes: repo 39a85617acc0 · live 39a85617acc0 — matches.
- triadetudes: repo 419c23b9b6f9 · live 419c23b9b6f9 — matches.

## 2026-09-05 — Multetudes v0.5.6: night 31, the speller and the reach

- **Source edition v0.5.6** (night 31; the report in `notes/working/Multetudes build run
  260925.md`; two engine laws ruled 260923).
- **The chromatic speller, rule C (item 1):** a chromatic note is spelled as the alteration of
  whichever diatonic neighbour needs the fewest accidentals, ties to the nearer, remaining ties to
  the parent collection's side — the relative major for harmonic and melodic minor (derived from
  the scale's own ♭3), the tonic's for major. The retired "keep the letter" law was resolveRoman's,
  correct for a degree and a category error for a pitch class with no degree; it spelled 55 double
  accidentals across the app's 432 spellings. Now one (D♭ harmonic minor). C harmonic minor reads
  `C Db D Eb E F Gb G Ab A Bb B`; D♭ replaces C♯ on the staff, D♭ G♭ E B♭ replace C♯ F♯ A♯ on the
  score. PITCH HONESTY verbatim and passing; the ±2 guard kept; resolveRoman untouched.
- **The approach reach (item 2):** an approach is placed relative to its target, may sit outside
  the window and is drawn there, but must lie within k frets of it — k the field's largest scale
  step, derived (harmonic minor's augmented second gives 3; major 2). No reachable position refuses
  by name on the face: "the approach +9 to the root sits 6 frets beyond the hand — the root is at
  fret 6, at the window's edge (frets 3–7), and the reach is 2". The window is required of every
  caller (four, each passing its own pos; a fitness test keeps a fifth honest); placeNear's tie
  rule reused, motion.mjs untouched.
- **Studies moved:** multetudes and tetradetudes (rebuilt); metronome and triadetudes
  (hand-authored, chord.mjs re-inlined, +1,541 bytes each). Shell 18,040 unchanged.
- **Gates from their logs:** engine green with the census · doors 18,757/0 (`hub/tests/out/doors-0904-2243.log`)
  · bite 52/53 (`bite-0904-2248.log`; m51, m52 bite) + m46 re-sited and biting alone (`bite-m46-0905-0315.log`) · hugo 0 ·
  check_site with the record verify · served ritual on all six studies, both widths.

## 2026-09-05 — DEPLOYED: v0.5.5 live — multetudes moved, the other five unmoved; written from the run

- record: run 33941582417 · success · commit b3f14b3 · fetched 2026-09-05T03:29Z · 6/6 studies byte-identical · digest ac72b6817dda
- Actions run 33941582417 green on `b3f14b3` — https://github.com/danieladamek/atetudes.com/actions/runs/33941582417 (created 2026-09-05T03:20:31Z, finished 2026-09-05T03:27:31Z).
- metronome: repo 3ec34d6a2d92 · live 3ec34d6a2d92 — matches.
- modes-from-pentatonic-boxes: repo 59f73b76f87b · live 59f73b76f87b — matches.
- multetudes: repo dfeb5070db1a · live dfeb5070db1a — matches.
- tetrad-voice-leading: repo ce9df25cd930 · live ce9df25cd930 — matches.
- tetradetudes: repo e5649851a1bb · live e5649851a1bb — matches.
- triadetudes: repo f2eecb6ce637 · live f2eecb6ce637 — matches.

## 2026-09-04 — Multetudes v0.5.5: night 30, the board stops lying about what it placed

- **Source edition v0.5.5** (night 30; the report in `notes/working/Multetudes build run
  260924.md`; PO rulings 260922b, three of four rulings as one item; closes the 260909 complaint).
- **The engine (ruling 2):** while any role is capped, every-occurrence's leftover pass does not
  run — a doubled tone disguised the loss as a full grip; a silent string is the honest picture.
  On the Cmaj7 case (C major, strings 4–1, frets 0–3, R and 7 both only on string 2) the
  selection goes from `3@s4f2 5@s3f0 R@s2f1 5@s1f3` to `3@s4f2 R@s2f1 5@s1f3`, string 3 silent
  (the dispatch expected string 1: the matching's own 5 sits on string 1, the leftover was string
  3's). Proven on a corpus of 90,720 configurations: 87,024 uncapped byte-identical, 960 capped
  shed only leftovers. All-tones under Grip keeps its meaning (the stop condition pinned).
- **The board (rulings 1 and 3):** a capped loss goes on the window in Daniel's words — "missing
  7th — both R and 7 on string 2 — Line takes both" — with the collide derived and the escape
  resolvesAt; one-of-each draws its PARTIAL beside the verbatim refusal, the partial derived once
  in the engine so the neck, the staff, the keys, the readout and the walk agree. The message sits
  clear of the drawn notes and inside the neck at any window.
- **The captions (item 3):** `.fd-cap` from #B9B9BF (1.87:1) to the ramp's annotation gray
  (4.51:1 on the card ground by axe's measurement); the night-29 contrast exemption retired, so
  axe gates the captions at AA. No other text under 4.5:1 on any door.
- **Studies moved:** multetudes only. Shell 18,040 unchanged.
- **Gates from their logs:** engine 605/605 (a corpus of 90,720 selections: 87,024 uncapped
  byte-identical, 960 capped shed only leftovers) · doors 18,715/0 (`hub/tests/out/doors-0904-1737.log`)
  · bite 50/51 (`bite-0904-1743.log`; m49, m50 bite) + m27 re-aimed and biting alone
  (`bite-m27-0904-2208.log`) · hugo 0 · check_site 21 with the record verify (3 checked) · served ritual
  both widths, console clean.

## 2026-09-04 — DEPLOYED: v0.5.4 live — multetudes moved, the other five unmoved; written from the run

- record: run 33843923257 · success · commit f0f2c3d · fetched 2026-09-04T06:28Z · 6/6 studies byte-identical · digest 4aa05d877669
- Actions run 33843923257 green on `f0f2c3d` — https://github.com/danieladamek/atetudes.com/actions/runs/33843923257 (created 2026-09-04T06:20:00Z, finished 2026-09-04T06:27:01Z).
- metronome: repo 3ec34d6a2d92 · live 3ec34d6a2d92 — matches.
- modes-from-pentatonic-boxes: repo 59f73b76f87b · live 59f73b76f87b — matches.
- multetudes: repo 5469123ca1e6 · live 5469123ca1e6 — matches.
- tetrad-voice-leading: repo ce9df25cd930 · live ce9df25cd930 — matches.
- tetradetudes: repo e5649851a1bb · live e5649851a1bb — matches.
- triadetudes: repo f2eecb6ce637 · live f2eecb6ce637 — matches.

## 2026-09-04 — Multetudes v0.5.4: night 29, axe-core joins the door locks; the set squares become controls

- **Source edition v0.5.4** (night 29; the report in `notes/working/Multetudes build run
  260923.md`; the item in `notes/Backlog/The set squares are not controls - a cursor is the whole
  affordance.md`).
- **The accessibility check (item 1):** axe-core 4.10.3 (MPL-2.0, vendored under
  `hub/tests/vendor/`, a local test dependency shipped in nothing) runs in the door locks on
  every door at 1280 and 390. The floor is WCAG 2 A and AA; the 260923 findings Daniel has not
  ruled on are exempt by rule and control id, named and counted per door in the gate line, and
  loud both ways (an unexempted violation fails; an exemption that matches nothing fails). The
  whole list before any change is in the report: multetudes 3 rules / 17 nodes under A/AA (four
  captions failing contrast, four unlabelled sliders, nine unnamed selects), tetradetudes 2 / 17,
  scribe and plain 2 / 5. Reported, not fixed — Daniel rules.
- **The set squares are controls (item 2):** each string-set square on the neck is a named
  button with a pressed state, a title, an enlarged hit target in the neck's own idiom, hover
  and focus in neutral ink (never a degree colour), and Enter/Space toggling; the bracket gutter
  beside them stays prose. The `set` caption is left as is, alternatives proposed.
- **The pairing, measured:** axe catches a square that loses its role (`aria-pressed` on a bare
  `g`); it cannot catch a lost name, because the numeral inside names a button from content —
  the door's own pin watches the name. bite m47 and m48 prove each.
- **Studies moved:** multetudes only (one module's markup and CSS). Shell 18,040 unchanged.
- **Gates from their logs:** doors 18,629/0 (`hub/tests/out/doors-0903-2114.log`, axe 0 failed on
  all eight door-width pairs, exemptions named) · bite 49/49 (`bite-0903-2120.log`) · engine 601/601 ·
  hugo 0 · check_site 21 with the record verify.

## 2026-09-04 — DEPLOYED: v0.5.3 live — multetudes moved, the other five unmoved; written from the run

- record: run 33826549185 · success · commit bf8318c · fetched 2026-09-04T01:46Z · 6/6 studies byte-identical · digest f5fa91230879
- Actions run 33826549185 green on `bf8318c` — https://github.com/danieladamek/atetudes.com/actions/runs/33826549185 (created 2026-09-04T01:38:41Z, finished 2026-09-04T01:45:22Z).
- metronome: repo 3ec34d6a2d92 · live 3ec34d6a2d92 — matches.
- modes-from-pentatonic-boxes: repo 59f73b76f87b · live 59f73b76f87b — matches.
- multetudes: repo 2f55ffdd86e0 · live 2f55ffdd86e0 — matches.
- tetrad-voice-leading: repo ce9df25cd930 · live ce9df25cd930 — matches.
- tetradetudes: repo e5649851a1bb · live e5649851a1bb — matches.
- triadetudes: repo f2eecb6ce637 · live f2eecb6ce637 — matches.

## 2026-09-04 — Multetudes v0.5.3: night 28, the Key field wears its weight

- **Source edition v0.5.3** (night 28, a light night; the report in
  `notes/working/Multetudes build run 260922.md`; the item in `notes/Backlog/The Key field
  wears its weight - the Centricity card's touch-up.md`; Daniel's rulings 260921: bottom-aligned,
  the caption dropped).
- **The Centricity card's Key select** grows to 18px bold in the palette's red (the hue
  unchanged: colour is function, size and weight are the emphasis channel) and to about
  1.75× the height of Scale and Object, which do not move; the three fields share a bottom
  edge and the Key rises above it. The "Key" caption is gone — it named an appearance, and
  will not hold under a chromatic collection — and the select carries the card's own word as
  its accessible name (it had none before). The card stays 562×283 and 250×283.
- **The pin reversed, not dropped:** the 260918 "size untouched" claim now pins a RATIO band
  of 1.6–1.9 against the neighbours (never a pixel: CI renders a select 29px where this
  machine renders 30), the neighbours as an unmoved baseline, the shared bottom edge and the
  accessible name; the bold-red claim stands. Red-run through redrun: the ratio out of its band
  reddens the size pin alone.
- **Studies moved:** multetudes only. Noticed, not fixed: the card's three columns clip Object
  at 390px, before and after.
- **Gates from their logs:** doors 18,558/0 (`hub/tests/out/doors-0903-2032.log`; the red-run
  `doors-0903-1632-red-keyratio.log`, the size pin alone red) · bite 47/47 (`bite-0903-1643.log`) ·
  engine 601/601 · hugo 0 · check_site 21 with the record verify (1 checked) · served ritual both
  widths console clean · shell 18,040 unchanged.

## 2026-09-03 — DEPLOYED: night 27 live — no study moved; the first record written from the run

- record: run 33803981536 · success · commit 2025ba4 · fetched 2026-09-03T20:52Z · 6/6 studies byte-identical · digest e457c9b9ca6c
- Actions run 33803981536 green on `2025ba4` — https://github.com/danieladamek/atetudes.com/actions/runs/33803981536 (created 2026-09-03T20:44:09Z, finished 2026-09-03T20:51:21Z).
- metronome: repo 3ec34d6a2d92 · live 3ec34d6a2d92 — matches.
- modes-from-pentatonic-boxes: repo 59f73b76f87b · live 59f73b76f87b — matches.
- multetudes: repo 3ff21bf2b072 · live 3ff21bf2b072 — matches.
- tetrad-voice-leading: repo ce9df25cd930 · live ce9df25cd930 — matches.
- tetradetudes: repo e5649851a1bb · live e5649851a1bb — matches.
- triadetudes: repo f2eecb6ce637 · live f2eecb6ce637 — matches.

<!-- deploy records below this line predate tools/deploy_record.py (260921); records above it are written from the run -->

## 2026-09-03 — night 27: protection in the path — the build refuses an unbindable import, the pin-independence sweep, the deploy record written from the run

- **No study moved.** All four doors rebuild byte-identical to the bytes live as v0.5.2
  (the report in `notes/working/Multetudes build run 260921.md`).
- **The build refuses an import it cannot bind (item 1).** One import parser in
  hub/tools/resolve.mjs reads every import statement for the resolver's graph and the
  build's binds and blanks; any spelling other than `import { a, b } from "./x.mjs";` —
  a trailing comment, a comment inside the braces, a default, namespace or side-effect
  import — is refused by name with the file and the line. Until tonight a trailing comment
  built "successfully" and broke in the browser (twice). Unit tests in the door build gate
  prove the eight spellings refused and the tree's 170 reached imports accepted.
- **The pin-independence sweep (item 2).** Twenty-six pins around the four unifications
  examined by mutation: one vacuous (the readout's emptied-then-stepped pin could not catch
  a copier) rewritten to detach each box in turn; one gap (no pin read the palette's hexes
  off the artifact) filled with Design Spec §2.1's table on the neck's dots; four bite
  mutations added (m43 a copying readout, m44 the palette drifting by one hex digit, m45 a
  second tuning declared, m46 a flat key spelling sharp).
- **The deploy record is written from the run (item 3).** `tools/deploy_record.py emit
  <sha>` fetches the Actions run and the six live studies' bytes and prints the record's
  factual half with a digest; `verify` re-fetches every recorded run above the mechanism
  marker at the top of this file and is run by tools/check_site.py locally and in CI
  (GH_TOKEN added to the workflow's check step). A hand-typed record cannot pass the path.
- **Gates from their logs:** engine 601/601 · door build gate 7/7 · doors 18,537/0
  (`hub/tests/out/doors-0903-0935.log`) · bite 47/47 (`hub/tests/out/bite-0903-0940.log`) ·
  hugo 0 · check_site 21 with the record verify in its path · door bytes unmoved.

## 2026-09-03 — DEPLOYED: v0.5.2 live, all four moved studies spot-checked byte-identical

- Actions run 33729408189 green (full gates in CI, commit `5c54b54` on main; items 1+2 in
  `88be55b` before it). Every moved study's live shasum matches the repo byte-for-byte:
  multetudes 3ff21bf2b072 · tetradetudes e5649851a1bb · metronome 3ec34d6a2d92 · triadetudes
  f2eecb6ce637; all four wrappers answer 200; the multetudes blurb serves v0.5.2. Read from
  the run and the live bytes.

## 2026-09-02 — Multetudes v0.5.2: night 26, one rule applied twice — one tuning, one speller, and the readout on every étude representation

- **Source edition v0.5.2** (night 26; the report in `notes/working/Multetudes build run
  260920.md`; the item in `notes/Backlog/The tuning is stated twice - one OPEN_MIDI, derived,
  exported once.md`). Standing rule 6 — never hand-maintain a list the code can compute —
  applied twice in the tetrad path, then the harmonic readout shared as one component.
- **One OPEN_MIDI (item 1):** the tuning is declared once, derived from its named rule in
  `engine/field.mjs`; `engine/tetrad-sequence.mjs` no longer states the six numbers and
  imports the one; every consumer (audio-card, score-board, fretboard-stage and three tests)
  repoints. The test that pinned the two copies EQUAL now pins that ONE declaration exists,
  and the door gate reads the same off every built page's bytes. Nothing visible changed:
  every board's SVG byte-identical and every door pixel-identical at 1280 and 390.
- **One chromatic speller (item 2):** `chromaticSpeller(key, scale)` lives in
  `engine/chord.mjs` beside LETTER_PC and resolveRoman's law (keep the letter, move the
  accidental, refuse past ±2); score-board's and staff-board's copies are gone. Flatness is
  read from the key signature, so the hand-kept `|| key === "F"` falls out unsaid. The two
  copies shared a defect (letter + one accidental drew a wrong pitch beside an altered
  degree); fixed at the owner and pinned as pitch honesty over every key and scale. Reading
  the scale's own collection was measured to change three minor keys and was NOT shipped —
  Daniel's ruling.
- **Two more palette copies retired on the way:** fretboard-stage's violet literal (a real
  copy, mounted in tetradetudes) and keys-board's whole degree table (a sixth copy night 24's
  sweep missed).
- **The readout on every étude representation (item 3):** the étude end to end and the keys
  now carry the harmonic readout in their headers, as the neck does — ONE component
  (`hub/readout.mjs`, mini.mjs's shape), three instances, each deriving the bar's chord and
  mode from the bus itself; pinned by emptying all three boxes and stepping the bar. The two
  boards' mini transports move into the header row (they were absolutely positioned over the
  new box at phone width); at phone width the box shares the mini's row and the neck keeps
  its single row. The grammar is the page's (three boards render it) and ships from the build half of
  the shell for exactly the doors that reach the helper; shell.mjs stays at 18,040 bytes.
- **Studies moved:** multetudes and tetradetudes (rebuilt, cmp-identical); metronome and
  triadetudes (hand-authored; chord.mjs re-inlined verbatim, +2,666 bytes each).
- **Gates from their logs:** engine 601/601 · doors 18,533/0 (`hub/tests/out/doors-0903-0227.log`)
  · red-run: the inverted flatness reds exactly the two F-major pins (`doors-0902-2226-red-speller.log`)
  · bite 42/43 (`bite-0902-2258.log`) + m10 re-sited to the neck's dots and biting alone
  (`bite-m10-0903-0233.log`) · hugo 0 · check_site 21 · served ritual over http, five pages, two
  widths, console clean · shell.mjs 18,040 unchanged.

## 2026-09-02 — DEPLOYED: v0.5.1 live, multetudes spot-checked byte-identical, the other three unmoved

- Actions run 33709899718 green (full gates in CI, commit `e24b3fc` on main, the work in
  `b4d9087`). The live multetudes shasum matches the repo byte-for-byte: ce4fa5191acf (was
  bb670646c099); tetradetudes 55ff32a66a09 · metronome bb1d4196dd35 · triadetudes 9682210722a3
  unchanged and still matching; all four wrappers answer 200; the multetudes blurb serves
  v0.5.1. Read from the run and the live bytes, not from the push's word — the first push
  from the night branch moved nothing (the run note has it).

## 2026-09-02 — Multetudes v0.5.1: night 25, the layout pass and the prose trim — the readout into the neck's header; the readout says what is, the hint says why not

- **Source edition v0.5.1** (night 25; the report in `notes/working/Multetudes build run
  260919.md`; the rulings in `notes/working/Multetudes PO rulings 260919 — the neck card's
  layout pass.md`). No engine change, no new derivation, no new module.
- **The readout into the header (item 1):** the harmonic readout box (`● Bbmaj7 — Bb Ionian`)
  leaves the clock row for the neck card's own header, immediately after ON THE NECK, before
  a spacer; ⓘ and ▾ keep the right edge. One line at every width; under a long name at phone
  width the ellipsis eats the mode and the chord survives whole (pinned at 360px, where it
  actually clips). The shell is untouched (18,040 bytes). The old geometry pins (level with
  Repeat, above the sliders) are rewritten to the new claims, not deleted.
- **The clock closes ranks (item 2):** transport · repeat · bar split · bpm · metronome,
  contiguous, in that order.
- **The prose split (item 3):** THE READOUT SAYS WHAT IS; THE HINT SAYS WHY NOT, AND WHAT YOU
  CAN DO. The under-neck hint drops every state clause the readout already narrated (the key
  and field, the strings, the window, the take and shape, the reference's seat) and the
  Placement reason its own cap has carried since night 23; it keeps the refusals, the forced
  follow, the silent reference and the affordance. Three facts the readout never carried
  MOVED there in its voice rather than vanishing: the figure ("figure 2 steps (tones, with
  approaches)"), the field's own count ("the whole field, 57 notes") and the take word
  ("grip, one of each" / "every occurrence the grip allows"). The neck's whole narration goes
  from 123 words to 93 with no fact lost; the ordinary hint is one sentence. 22 door pins
  re-sited from the hint to the readout with dated reasons.
- **The centre named (item 4):** the figure's approach sentence reads "approached from the
  key's ♭3" (or "the centre's ♭3" when the field is re-rooted) — motion's grammar untouched;
  the readout re-addresses the degree item. Alternatives proposed in the report.
- **Studies moved:** multetudes only (638,604 bytes, cmp-identical build → static → public);
  tetradetudes, metronome, triadetudes unmoved (cmp).
- **Gates from their logs:** engine 596/596 · doors 18,645/0 (`hub/tests/out/doors-0902-2134.log`,
  up 65 from 18,580) · hugo 0 · check_site 21 · served ritual over http, both widths,
  console clean · bite 41/43 in the full run (`bite-0902-1733.log`) and the two re-run alone
  both bite (`bite-m10m27-0902-2139.log`) — m10 had exposed a pin re-sited to the wrong face,
  corrected (the run note has it).
- **Noticed, not fixed:** `fretboard-stage.mjs:420` carries a raw violet literal — the module
  is not mounted in Multetudes (a tetradetudes-door matter, registered); the neck SVG renders
  at 150×30 at 390px in v0.5.0 and v0.5.1 alike (pre-existing).

## 2026-09-02 — DEPLOYED: v0.5.0 live, all four moved studies spot-checked byte-identical

- Actions run 33678678808 green (full gates in CI, commit `f6df323`, with the palette export `636e4d7`
  before it). Every moved study's live shasum matches the repo byte-for-byte: multetudes
  bb670646c099 · tetradetudes 55ff32a66a09 · metronome bb1d4196dd35 · triadetudes 9682210722a3;
  all four wrappers answer 200; the multetudes blurb serves v0.5.0. The approach note is live.

## 2026-09-02 — Multetudes v0.5.0: night 24, the approach note — Design Spec §2.6 on the neck; the degree dot; the nearest reference

- **Source edition v0.5.0** (night 24; the report in `notes/working/Multetudes build run
  260918b.md`; the ruling in `notes/specs/multetudes-doctrine-CR1-chromatic-roles.md`; the
  marks in `docs/design-language-and-engine-spec.md` §2.6, ratified 2026-08-10).
- **The approach note (item 1):** a figure carrying `( … )[ … ]` under the tones address —
  `(b3)[3]`, `(-s)[3]`, `(-1,+2)[R]` — now parses through the motion grammar and draws per
  §2.6: 0.6 of the host radius, hollow; violet when chromatic, the degree colour when diatonic;
  no ring, no label; a slur to the target in the annotation gray, under the dots; engraved on
  the staff as cue-size heads. Drawn while the figure is live; the ordinary pulse on play.
  The refusal "the field's rendering law for off-field notes is undecided" is answered: an
  off-field note is legal only as a role-carrying approach, and the guards name the missing
  role (register 34).
- **The degree dot (item 2):** the chord's root degree as a filled dot beside its name in the
  readout box and on every chip; selection on outline + fill; `--red` means the key and
  nothing else (register 35). The palette is stated once in `hub/palette.mjs` (five hand
  copies retired; rendering proven identical).
- **The reference picks the nearest note (item 3):** across both free strings, string 6 the
  tiebreak only; the doctrine sentence rewritten; the stretch flag means what it says.
- **Deferred, watched:** chromatic chord tones (role A) until the v1.4 Spec amendment.
- **Studies moved:** multetudes (634,365 bytes, cmp-identical) · tetradetudes (449,042,
  cmp-identical — the palette, the strip's selection ink, motion's exported names) · metronome
  (165,289) and triadetudes (342,000), hand-authored, `motion.mjs` re-inlined verbatim.
  OWED_DRIFT stays EMPTY. The shell did not move (18,040).
- Verified: engine 596/596 · four-door gate 18,580/0 (`hub/tests/out/doors-0902-1155.log`) · hub tests 4/4 · family floor
  20 surfaces 13/7-exempt/0 · bite 42/42 (`hub/tests/out/bite-0902-1201.log`; m40 and m41, the two colour branches, both bit) · hugo exit 0 · check_site 21 pages · the ritual on all
  four moved studies at 1380px and 390px on the served build, zero console errors.

## 2026-09-02 — DEPLOYED: v0.4.3 live (second run), the one moved study spot-checked byte-identical

- Actions run 33652997145 green (full gates in CI, commit `467a157` — the night's commit `6e00fce`
  plus one pin rewritten). The live multetudes study's shasum matches the repo byte-for-byte
  (e3b47200207d) and its blurb serves v0.4.3; tetradetudes, metronome and triadetudes are
  byte-identical to the repo as before; all four wrappers answer 200. The first run's failure
  and its cause are recorded in the entry below, corrected in place.

## 2026-09-02 — DEPLOYED: v0.4.3 live, the one moved study spot-checked

- **CORRECTION (the record above was written before the run was read — wrong, and left here
  struck through in words rather than deleted):** Actions run 33651192864 FAILED at the door
  gate — one pin of mine asserted the key select's height as an absolute 30 px, and CI's Linux
  Chromium renders it 29 px (a platform pixel, not a size change); the deploy job was skipped
  and the site kept serving v0.4.2. The pin now makes the relative claim (the same font and
  height as the card's neighbour selects), proven locally before the re-push; the deploy that
  actually landed is recorded in the entry above this one.

## 2026-09-02 — Multetudes v0.4.3: night 23, the light night — the key in red, the harmonic readout up and always on

- **Source edition v0.4.3** (night 23; the report in `notes/working/Multetudes build run
  260918.md`; the rulings in `notes/working/Multetudes PO rulings 260918 — the v0.4.2 review,
  the harmonic readout.md`). Two UI items, one note; no engine change, no carried module.
- **The Key selector reads in bold red** — the degree palette's own R (the shell's `--red`),
  because the key IS the root and the legend's law ("colour = function against the key") now
  holds at its origin. The card's proportions are unchanged (measured 562×283 / 250×283).
- **The harmonic readout** moved up beside Repeat, boxed, larger, bold, above the sliders, and
  reads the chord AND its mode — `Bbmaj7 — Bb Ionian` — for EVERY object (register 33: night
  22's gate on the mode lifted; nothing new computed, something existing no longer withheld).
  Daniel's mockup as drawn (the chord name in red) is what ships; the degree-dot form (b) is
  prototyped and screenshotted beside it for his choice (`notes/working/shots-260918/`).
- **Captured, not built:** the non-diatonic-collections backlog item now carries its
  motivating case (blues and rhythm changes under a key/scale that cannot supply their chords).
- **One study moved:** multetudes, republished cmp-identical (614,386 bytes, was 610,575). The
  shell did not move (18,040); plain, scribe, tetradetudes byte-identical; the hand-authored
  studies untouched. OWED_DRIFT stays EMPTY.
- Verified: engine 589/589 · four-door gate 18,296/0 (`hub/tests/out/doors-0902-0740.log`) · hub tests 4/4 · family floor
  20 surfaces 13/7-exempt/0 · bite 40/40 (`hub/tests/out/bite-0902-0745.log`) · hugo exit 0 · check_site 21 pages · the ritual at 1380px
  and 390px on the served build, the readout and the key exercised, zero console errors.

## 2026-09-02 — DEPLOYED: v0.4.2 live, all four moved studies spot-checked; the landing page delisting live

- Actions run 33600470502 green (full gates in CI, commit `8740c3f`, which carries Daniel's delisting
  `cff477f` and night 22's item-0 commit `5e7c8e1`). Every moved study's live shasum matches the
  repo byte-for-byte: multetudes 40048453622d · tetradetudes 4f08c4642f8f · metronome
  4d0286872a93 · triadetudes 8961724a8894; all four wrappers answer 200; the multetudes blurb
  serves v0.4.2. The landing page's CARD GRID no longer carries Triadetudes or Tetradetudes (four cards remain); their URLs serve — and the theme's sidebar navigation still enumerates every study page, the two included, because Hextra builds that list from the content tree, not from the cards (measured at the built page; a sidebar delisting would be a theme/front-matter change, not made).
  Daniel's v0.4.0 review is complete on the site.

## 2026-09-01 — Multetudes v0.4.2: night 22, the tones and the neck — Daniel's v0.4.0 review completed; four studies move

- **Source edition v0.4.2** (night 22; the full report in `notes/working/Multetudes build run
  260917.md`; the rulings in `notes/working/Multetudes PO rulings 260917 — night 21's open
  points.md` and `… PO finding 260917 — the title describes the pad.md`).
- **The notepad, on every carrier (item 0, committed first):** THE TITLE DESCRIBES WHAT IS IN THE
  PAD — restore fills it with the entry's name, save empties the pad and resets it to the dated
  default, so a stale name can no longer misfile the next note; the restore confirm now appears
  in the row that was pressed (it was displaced, not silent); Clear and Restore ask only over
  DIRTY text — a just-restored note asks nothing (register 30: shipped behaviour changed).
- **Multetudes' Centricity and neck:**
  - **Tone selection for every stacked object** (item 1) — the Tones field, in the figure's own
    notation (R,3,5,7), parsed by the figure's own parser: Triad picks three, Tetrad four, the
    extensions their depth's worth, fewer is legitimate, a tone the object cannot hold refuses by
    name. The dyad's pair menu is gone into it. **Shell is a preset of it** (item 2): choosing
    Shell fills R,3,7 visibly.
  - **The bass defaults to the root** and is chosen from the tones the object actually holds,
    with a 3rd below and a 5th below kept and explained (item 3); at boot the neck now draws the
    root under the B♭ block and the readout names the stack over it.
  - **The Centricity bass window is closed** (item 4, register 31) — the control lives under the
    neck beside the mixer; the centre picker stays on the card in scale mode.
  - **Each passing chord names its mode** beside `voice` under the neck (item 5), derived from the
    scale's own mode table.
  - **Row collapse** (6a): a card's chevron collapses its row, and its title says so —
    "collapse this row: Metronome and Notepad". `hub/shell.mjs` moved for the third time
    (18,040 bytes); every door republished with it.
- **Recorded, not built:** the centre stays in Centricity and the object keeps the name "Scale
  or mode" (register 32 carries Daniel's reversal and its reason); the mechanism that makes an
  unsnapshotted red-run impossible or loud is PROPOSED in the report (item 7).
- **Four studies moved:** multetudes (610,575 bytes) and tetradetudes (445,614) republished
  cmp-identical; metronome (164,086) and triadetudes (340,797) re-inlined verbatim
  (`notepad-surface`). OWED_DRIFT stayed EMPTY.
- Verified: engine 589/589 · four-door gate 18,222/0 (`hub/tests/out/doors-0901-2229.log`) · hub tests 4/4 · family floor
  20 surfaces 13/7-exempt/0 · bite 39/40 (`hub/tests/out/bite-0901-2236.log`) + m38 re-aimed and proven alone (`hub/tests/out/bite-m38-0902-0136.log`) — all forty behaviours · hugo exit 0 · check_site 21 pages · the ritual on ALL FOUR
  moved studies at 1380px and 390px on the served build, exercised, zero console errors.
- The harness: 56 text-addressed seg clicks re-aimed by attribute BEFORE any edit (6b); the
  build and the gate print bytes beside the kB (6d).

## 2026-09-01 — Landing page: Triadetudes and Tetradetudes delisted (URLs stay live)

- Daniel removed the two cards from `content/_index.md` — a DELISTING only. The study pages
  and their wrappers are untouched and keep serving at `/studies/triadetudes/` and
  `/studies/tetradetudes/` (published URLs are permanent); the site's link check still walks
  them. Committed on its own, apart from night 22's work.

## 2026-09-01 — DEPLOYED: v0.4.1 live, all four moved studies spot-checked

- Actions run 33580933446 green (full gates in CI, commit `5164f4a`). Every moved study's live shasum
  matches the repo byte-for-byte: multetudes 8da4534b4a4f · tetradetudes 3376da62ef23 ·
  metronome b66e5e39b18d · triadetudes feb69187bda6; all four wrappers answer 200; the
  multetudes page's blurb serves v0.4.1. Night 21 is live; night 22 (the tones and the neck)
  is next.

## 2026-09-01 — Multetudes v0.4.1: night 21, the notepad — three of Daniel's v0.4.0 findings land; four studies move

- **Source edition v0.4.1** (night 21; the full report in `notes/working/Multetudes build run
  260916.md`; the rulings in `notes/working/Multetudes PO rulings 260916 — the v0.4.0 review,
  all ten.md`). The first of two nights: the notepad and the shell. The shell did NOT move
  (`hub/shell.mjs` 16,401 bytes, unchanged); item 4, row collapse, was measured and PROPOSED.
- **What changed on every notepad face** (the shared surface, so every carrier):
  - **Restore never silently overwrites the pad** (item 1, the live defect — Daniel lost work to
    it). Unsaved pad text now asks through Clear's own row, worded for restoring: *Save and
    restore · Discard and restore · keep writing*. An empty pad restores at once, as before.
  - **The title field is real** (item 2): pre-populated with `multetudes journal — <date>` (the
    export convention Daniel approved, in the placeholder's format), editable, and the single
    source of the name for the export file AND each entry filed while it stands. **An untouched
    field writes exactly v0.4.0's file name** — `multetudes-journal-<date>.atchart.md`, pinned
    as an exact equality. New entries lead with their name; the derived summary follows.
  - **Every practice-log entry exports on its own** (item 3), named from its title, through the
    one download path; success and refusal both speak in the row.
- **Four studies moved, and why:**
  - **multetudes** — republished cmp-identical (589,642 bytes, was 579,495): the three items
    above and the v0.4.1 note.
  - **tetradetudes** — republished cmp-identical (439,420 bytes, was 429,273): carries the same
    surface; wears v0.4.1 with a note saying nothing of its own changed.
  - **metronome** (159,804, was 151,984) and **triadetudes** (336,515, was 328,695) — the
    hand-authored studies: `notepad-surface` re-inlined verbatim. Both gain the restore guard
    and the row export; neither has a title field, so their entries file exactly as before.
    OWED_DRIFT stayed EMPTY — re-inlined the same hour, nothing recorded, nothing re-opened.
- **The harness re-aimed by role** (rule 12): five text/glyph lookups in the door gate
  re-aimed to `data-cap`/`data-intent`; 57 text-addressed seg-button clicks reported for
  night 22 with the attribute each already carries.
- Verified: engine 576/576 (570 at the open; six new pins, each shown red first through
  `redrun.py`) · four-door gate 17,818/0 (`hub/tests/out/doors-0901-1749.log`) · hub tests ·
  family floor 20 surfaces 13/7-exempt/0 · bite 38/38 (`hub/tests/out/bite-0901-1755.log`, m37 in) · hugo exit 0 · check_site 21 pages ·
  the ritual on ALL FOUR moved studies at 1380px and 390px on the served build, the new
  behaviour exercised, zero console errors on all eight loads.

## 2026-09-01 — DEPLOYED: v0.4.0 live, all four moved studies spot-checked

- Actions run 33552618431 green (full gates in CI). Every moved study's live shasum
  matches the repo byte-for-byte: multetudes 2170d2a034ce · tetradetudes f175cb409a31 ·
  metronome 2b2288fb69d7 · triadetudes d9664d89350d; all four wrappers answer 200; the
  multetudes page serves v0.4.0. The reviewed baseline is live.

## 2026-09-01 — v0.4.0, THE STABLE PASS: the beta reconciliation — four studies move

- **Source edition v0.4.0** (night 20; Update Log 260915.1; the full report in the night's
  working note). The reconciled family baseline: **OWED_DRIFT is EMPTY** — the debt this
  version's name depends on is actually gone.
- **Four studies moved, and why:**
  - **multetudes** — republished cmp-identical (579,495 bytes): the night's fixes (the CC-1
    audit's hcRef paint fix), the honest-unnamed symbol sentence, and the family changes below.
  - **tetradetudes** — republished cmp-identical (429,273 bytes) for the first time since
    260830: clears the standing 517-byte marker drift AND the accumulated owed drift
    (figure, voices, notepad, notepad-surface).
  - **metronome** and **triadetudes** — the hand-authored studies: `notepad` and
    `notepad-surface` re-inlined verbatim (the four OWED_DRIFT entries removed as each
    module landed); both exercised in-browser.
- **The house skin is v0.9's** (register entry 3, direction 2026-08-28, RESOLVED tonight):
  white ground, #FAFAFB cards with #E6E6EA edges, the system font stack, the 17px title —
  one shell change, every door republished with it.
- **A live sentence changed on every notepad face**: the privacy promise now reads
  "Your notes stay on this computer — nothing is uploaded…" (same guarantee, a player's
  words; was "the file is the handoff channel: nothing leaves this machine"). The notepad's
  chart refusal says "block" where it said "fence". The doors' page `<title>` reads
  "· At-Etudes" (was "— At-Etudes hub door" — our word, not a visitor's).
- Verified: engine 570/570 · four-door gate 17,747/0 · family floor 20 surfaces 13/7-exempt/0 ·
  bite 37/37 (hub/tests/out/bite-0901-1215.log) · hugo exit 0 · check_site 21 pages · the ritual on ALL FOUR moved studies at
  1380px and 390px, exercised, zero console errors.

## 2026-08-31 — DEPLOYED: Multetudes v0.3.0 live

- Actions run 33465344361 green (full gates in CI); the live study's shasum matches the
  repo byte-for-byte (57324cd6a079), serving v0.3.0; the wrapper answers 200.

## 2026-08-31 — Multetudes v0.3.0: centricity — the centre's source, and the stacks past four

- **Source edition v0.3.0** (night 19; Update Log 260914.1, the full report in the night's
  working note). `static/studies/multetudes/study.html` refreshed byte-identical to the door
  build (cmp-asserted, 576,214 bytes; v0.2.1 was 561,552 — +14,662).
- **A live page's visible vocabulary changed, twice.** The **Harmony card is now CENTRICITY**
  (register 27, ruled — the card defines the material and its organising centre; harmony is
  Progression's). And the centre control now names its **source**: *fixed* (a pedal under the
  moving chords) or *follows the changes* (each bar re-centres) — register 26, resolving the
  fixed-centre/moving-progression contradiction raised on the v0.2.0+centre build.
- The harmony menu gains **9th, 11th and 13th chords**; where the strings cannot carry the
  stack, the grip drops tones by a named rule and the face SAYS which ("the 5, 11, 9 dropped
  by the grip rule — 4 slots carry R 3 7 13"); register 28, omission order proposed.
- The notepad **title now persists** with the pad across reloads (ruled, overruling v0.9).
- Verified: engine 570/570 · four-door gate 17,722/0 · bite 37/37
  (hub/tests/out/bite-0831-1926.log) · hugo exit 0 · check_site 21 pages · the ritual at
  1380px and 390px with the night's changes exercised, zero console errors (wrapper verified
  over http).

## 2026-08-31 — DEPLOYED: Multetudes v0.2.1 live

- Pages run 33448510918 green; the live study.html shasum-identical to the committed copy
  (d00fc8988e39), serving v0.2.1.

## 2026-08-31 — Multetudes v0.2.1: the centre works; the notepad has its title back

- **Source edition v0.2.1** (night 18; Update Log 260913b.1, the full report in the night's
  note). On the page: scale mode's CENTRE now works — the bass places against it (neck,
  keys, staff, and the sound), figures address degrees from it (R-3-5-7 up to the 9/11/13
  compounds), movement returns once a figure resolves, and Placement alone stays off with
  its reason on its own cap. The mixer sliders sit level with what they govern. The
  notepad's title field is back in the card's top bar — type a title and the export is
  named by it — via the shell's first header slot in seventeen nights
  (**hub/shell.mjs 15,279 → 16,037**, reported, not absorbed). The neck's pulse ring now
  survives shared-pitch rebuilds (the keys' livePulses idiom, ported).
- Bite **37/37** from `hub/tests/out/bite-0831-1516.log` — the first night whose bite line
  has a durable log behind it (item 0: line-buffered --log, SIGTERM-proven clean restore).
- Verified per the ritual: hugo exit read properly · check_site 21 pages · both widths with
  the night's changes exercised, zero console errors · the study refreshed by plain copy,
  cmp-identical post-harness · live spot-check after deploy recorded below.

## 2026-08-31 — DEPLOYED: Multetudes v0.2.0 live, card restored

- `4b7d1ab` deployed (Pages run 33426572489 green, build 5m31s with the full gate in CI).
  Live spot-checks: `/`, the wrapper and the standalone all answer 200; the live study.html
  is **shasum-identical** to the committed copy (a6dd99fce99e) and serves v0.2.0; the
  landing card is back on `/`. Bite 37/37 from its log before the merge; the byte deltas in
  the night-17 report were measured from the post-harness builds (the mid-harness read was
  m3's artifact and went in the bin).

## 2026-08-31 — Multetudes v0.2.0: the interface pass (the wireframe lands), card restored

- **Source edition v0.2.0** (hub door, Update Log 260913.1; the night-17 report has the full
  story). The published study refreshed by plain copy, `cmp`-identical to the build. What
  changed on the page: Take is the neck rail's **all tones** checkbox beside Placement (D8 —
  the take value unchanged, pinned); Harmony reads Key | Scale | Object in one row; the
  movement buttons speak the ruled words **strum / arpeggiate** (and the engine renamed with
  them — one word, one meaning, register 24); the under-neck block carries bpm and the
  Bass/reference as second views beside the transport mini and the new **🔁 repeat** (loops
  the current bar); the chips show the roman AND the derived slash spelling when a reference
  changes it.
- **The landing card returns** — the 260911 ruling was live-unlisted *until the interface
  pass lands*; it landed tonight, so the card is back at `/`, same thumbnail asset.
- Verified per the ritual: hugo exit read properly (the lesson stands) · check_site 21
  pages · both widths rendered with zero console errors · the changed controls EXERCISED on
  the served page (repeat presses, bpm drives the metronome card, the checkbox switches the
  take) · live URL spot-checked after deploy, recorded below.

## 2026-08-31 — CORRECTION: the Multetudes landing card comes down (the URL stays live)

- The 260911 ruling was **live URL, unlisted, until the interface pass lands** — the publish
  added the card anyway: a ruling overwritten by the work rather than by a decision. The card
  is removed from `/`; the wrapper page and `static/studies/multetudes/study.html` are
  untouched (the URL is permanent and stays live), and the thumbnail stays on disk
  (`assets/cards/multetudes.png` — deleting published assets needs approval, and it will be
  wanted again). **The card goes back up when the interface pass ships — possibly the same
  night.** A correction, not a deletion.

## 2026-08-31 — DEPLOYED: Multetudes v0.1.0 live

- `9d5a468` deployed (Pages run 33387299249 green: build 5m10s with the full door-lock suite
  now running in CI, deploy 8s). Live spot-checks: `/studies/multetudes/`, the standalone
  `study.html`, the card PNG and `/` all answer 200; the live study.html is
  **shasum-identical** to the committed file (75677294230a); the landing page references the
  new card; the wrapper renders the door at v0.1.0 over the live URL, inspected in a real
  browser.
- The first deploy attempt (`d1e54dd`) FAILED in CI and the failure was a find: the door
  gate's v0.9 oracle lived in the gitignored vault, so the runner that decides deploys could
  not run the comparison — doctrine rule 2's silent skip, caught by the deploy gate itself.
  A byte-identical copy now ships at `hub/tests/oracles/multetudes-v0.9.html` and the gate
  points there; the vault file remains the working home.

## 2026-08-31 — Multetudes v0.1.0 published: atetudes.com/studies/multetudes/

- **The first public edition of the Multetudes door** — source edition v0.1.0
  (hub/doors/multetudes.door.mjs, built by hub/tools/build.mjs; Update Log 260911.1 and the
  sixteen build-night reports behind it). The built page is copied **byte-identical** to
  `static/studies/multetudes/study.html` (asserted by `cmp` at ingest); the wrapper page
  `content/studies/multetudes.md` (`layout: study`) serves the permanent URL with the site
  navbar over the full-viewport iframe and the "Open standalone" link. The door's footer
  line "Not a published study" retired with the publish — true until this build, false the
  moment the file landed.
- **The census took the study as a first-class carrier**: engine/tests/_family.mjs and
  host-conformance.test.mjs gained multetudes as an app (engine suite 552 → 558, the derived
  no-drift pin green against the byte-identical copy); tools/family_floor.py now walks 20
  surfaces, 13 passing. The host-conformance nouns entry corrected to `item: "note"` — the
  door's shipped word (D12), not the pre-260911 "entry".
- **The landing card** joined `/` between Tetradetudes and Modes, its thumbnail captured by
  `tools/capture_cards.py` — the tool extended with `cap_multetudes` at the RATIFIED BOOT
  (the note-for-note gate-pinned block: Bb, frets 3–7, bar 1 of 8), asserted by the door's
  own readout before capture; frame choice is the session's, pending Daniel's pick. All five
  cards recaptured through the tool (the four existing frames still reachable); 95 kB for
  the new card, 237 kB total, within budget.
- **One defect caught at the gate's own doctrine**: the wrapper's unquoted YAML summary
  broke the whole hugo build — and the first "green" was false (the exit code read off a
  pipeline's `head`, not hugo; `public/` was ten days stale and check_site had blessed the
  old site). Summary quoted, exit read properly, 21 pages checked, all links resolve.
- Also riding: Daniel's `.gitignore` tidy (.bevel/.vscode/scratch pad) and his welcome-post
  edit ("The Metro Journal"). Note: the welcome post still says "the three below" — with
  Multetudes published that sentence is due an edit, left for Daniel (his authored prose).
- Verified per the ritual: hugo exit 0 · tools/check_site.py 21 pages, all internal links
  resolve · wrapper, landing, blog and standalone rendered at 1380px and 390px with zero
  console errors · the standalone boots its pinned block offline-style over file:// and
  http alike. Live spot-check after deploy recorded below the push.

## 2026-08-21 — DEPLOYED: the four card thumbnails live

- `579a99e` deployed alone (the dispatch's four piggyback commits had already shipped earlier
  today); Pages run green, head `579a99e`. All four PNGs live and shasum-identical to the
  committed files; the landing page references them and answers 200.

## 2026-08-21 — The cards show the chart: four thumbnails captured from the shipped studies

- The four study cards on `/` gain images — CAPTURED headlessly from the published studies by
  `tools/capture_cards.py` (Playwright, file://, fresh context per study), never drawn, never
  hand-edited. Each frame's state is asserted by the study's own readout BEFORE capture; a study
  that drifts fails the script by name. One ratio (16:10, dsf=2), enforced on the saved artifact.
- The frames: Metronome at its defaults (v1.4.4 — the frame table said v1.4.3; the range item
  shipped v1.4.4 the same day); Triadetudes `D I · 2nd inv. · 1 of 8 · D major` (key D, pivots
  seeded at string 2 fret 0); Tetradetudes `Dm7 iii-7 · drop2 · 1st inv. · 4 of 8 · Bb major`
  (key Bb, zone at its lowest scale triple, stepped to 4 of 8 — Daniel's frame predates the
  window ruling, and this is the reachable state that produces his exact readout); Modes
  `Box 2 · frets 4–7 — A Ionian` with its full legend (captured at a 700px viewport, where the
  page's own layout stacks board and legend into a near-16:10 union).
- **Total added page weight: 142 kB** (73 + 14 + 21 + 34), all ≤120 kB each, quantized via
  Pillow (neither oxipng nor pngquant is installed here — recorded in the script). Zero external
  requests, zero console errors on `/`; `check_site.py` green; inspected at 1280 and 390.
- Stopgap per the item: these four PNGs and the script die in the same commit that lands
  `Site shell - live chart miniatures`.

## 2026-08-21 — DEPLOYED: the 15–300 range live in all three apps

- Daniel authorized mid-session; `b0b0c6f` deployed (Pages run green, head `b0b0c6f`). Doctrine
  spot-check: **all five study raw files shasum-identical** to the committed files; the widened
  range (`min="15" max="300"`) confirmed in the served bytes. URLs unchanged.

## 2026-08-21 — The metronome range is 15–300 bpm — three studies changed

- Metronome → **v1.4.4**, Triadetudes → **v0.8.13**, Tetradetudes → **v0.1.13** (door rebuilt,
  republished byte-identical). URLs unchanged. Update Log **260821.2**.
- Range 30–200 → 15–300 in all three (Daniel's call): slider markup, the transport mirrors, and
  the tap clamp in byte-pinned `metronome.mjs`, re-inlined per the census. Asserted BY SOUND at
  both extremes (red first on all three old builds). Tap tempo bottoms out at ~25 bpm (maxGap) —
  recorded and pinned, Daniel's UX call whether to widen. The two untouched studies byte-identical.

## 2026-08-21 — The window is a position — Tetradetudes v0.1.12

- `static/studies/tetradetudes/study.html` → **v0.1.12** (door rebuilt, republished byte-identical,
  2.3 kB SMALLER; URL unchanged). Update Log **260821.1**; ruling: *The window is a position*
  (`Authorized: 2026-08-21`, C5).
- The isolation box is one rigid rectangle — the zone's span by the set's strings, a setting never
  derived from the voicings — that dragging TRANSLATES (pinned; the old stretch demonstrated red
  against v0.1.11 first). Binding is the default; notes outside the window are stretches in full
  colour, unmarked. Deleted: the overhang tint, the anchor strip, brokeLeft, the reach counter,
  every reporting sentence.
- Gates: engine 485/485 (identity pins deliberately rewritten to the legacy path with reasons) ·
  door_locks 6994/0 · bite 10/10 · floor 9/7/0 · four other studies byte-identical. Committed,
  not pushed.

## 2026-08-20 — Binding, opt-in — Tetradetudes v0.1.11

- `static/studies/tetradetudes/study.html` → **v0.1.11** (door rebuilt, republished byte-identical;
  URL unchanged). Update Log **260820.11**.
- A bind toggle on the neck board: the anchor voice hard-lands on the three zone notes; bars that
  cannot reach outside and the hint counts them; the grip and arrows now write scale TRIPLES
  (e5ba874 un-flattened at the user's seam). **Off = the pinned v0.1.10 path** — the engine's three
  identity pins stayed green, untouched. Bind rides the zone in the stored config; a restored
  entry reproduces bound (gate-asserted).
- Gates: engine 487/487 (4 new pins, red first) · door_locks 7040/0 (+102, red first vs v0.1.10) ·
  bite 10/10 · floor 9/7/0 · four other studies byte-identical. Committed, not pushed.

## 2026-08-20 — The box looks draggable — Tetradetudes v0.1.10

- `static/studies/tetradetudes/study.html` → **v0.1.10** (door rebuilt from source, republished
  byte-identical; URL unchanged). Update Log **260820.9**.
- The isolation box: a corner grip at bottom-left sets the left edge (the box grows rightward);
  seed renders solid, consequence dashed; when a block chord must reach below the anchor the box
  extends left and SAYS SO — `brokeLeft` in the derivation, a tinted overhang plus a hint message
  on the page. Grip-only by derivation; free never breaks (no wall exists there), pinned.
- Gates: engine 483/483 (three soft-wall pins, red first) · door_locks 6938/0 (+49, corner-drag
  and overhang gates, red first vs v0.1.9) · floor 9/7/0 with F3 green · four other studies
  byte-identical. Committed, not pushed.

## 2026-08-20 — The neck sounds — Tetradetudes v0.1.9

- `static/studies/tetradetudes/study.html` → **v0.1.9** (door rebuilt from source, republished
  byte-identical; URL unchanged). Update Log **260820.8**.
- Clicking any neck dot now sounds it — the stage announces `NOTE`, the audio card's existing
  listener realises it (the keyboard's seam; no new audio). The zone drag is untouched: drag
  starts only on the zone's rects, a moved drag suppresses its click, and a still press over the
  zone's hit rect falls through to the dot beneath. The family floor is green for the first time
  (9 pass · 7 exempt · 0 failed).
- Gates: engine 480/480 · door_locks 6889/0 · floor F3 red→green (the existing gate, no new
  assertion) · four other studies byte-identical. Committed, not pushed.

## 2026-08-20 — DEPLOYED: the family standard's machinery — no study changed

- Daniel authorized the push; `37e09f5` + `d13c11c` deployed in one Pages run (green, head
  `d13c11c`). Governance-only: the family register + its CI gate, the floor suite, the corrected
  carrier procedure, the ratified kinds, spec §4.5–§4.6, and CLAUDE.md v2.1 (verification
  doctrine). **No user-visible change; no version bumps.**
- CI now runs the register gate (480 engine tests) — it passed in the deploy run.
- Doctrine spot-check live: **all five study raw files shasum-identical** to the committed files;
  landing 200. Nothing on the site moved, which is exactly what this deploy claims.

## 2026-08-20 — DEPLOYED: the card grammar + the info button back-ports live

- Daniel authorized the push; `1a7d763` + `a6b873a` deployed as one Pages run (green,
  head `a6b873a`). Three studies changed live in one deploy — Tetradetudes **v0.1.8**,
  Triadetudes **v0.8.12**, Metronome **v1.4.3** — every URL unchanged.
- Doctrine spot-check: ALL FIVE study raw files answer 200 and are **shasum-identical** to the
  committed files (the two untouched studies included); wrappers and landing 200. Rendered check
  on the three changed pages live: version in the tag, the info popouts open and Escape-dismiss,
  every Metronome card renders exactly 4 row groups, zero console errors.

## 2026-08-20 — The info button back-ports — two studies changed

- `static/studies/triadetudes/study.html` → **v0.8.12** (3 info buttons: Metronome, Transport,
  Harmony), `static/studies/metronome/study.html` → **v1.4.3** (1: the metronome card, standing
  alone — the appliance has no chevrons and none were invented). Update Log **260820.5**.
- The tetrad app's idiom, ported verbatim from `hub/shell.mjs` `initInfo` — same placement, popout,
  dismissal (click-outside + Escape), aria and keyboard behaviour. Static instructional prose moved
  into the popouts; live readouts and the P1P3 guarantee blocks stay on the faces. Tetradetudes
  unchanged.
- In-page self-tests now assert the popouts WORK and the faces are clean (shown red first against
  three sabotaged builds); both pages verified `file://` network-off, zero console errors;
  screenshots at 1280/390 with popouts open, inspected; `hugo` + `tools/check_site.py` green.
  URLs unchanged. Committed, not pushed.

## 2026-08-20 — The card grammar: four rows, no row wasted on a checkbox — three studies changed

- `static/studies/tetradetudes/study.html` → **v0.1.8** (door rebuilt from
  `hub/doors/tetradetudes.door.mjs`, republished byte-identical), `static/studies/triadetudes/study.html`
  → **v0.8.11**, `static/studies/metronome/study.html` → **v1.4.2**. Update Log **260820.4**.
- The move, identical in all three: accents → the selects row's end; metronome + count-in → the
  Play row's end; voice → the sig row's end; the two checkbox-only rows deleted. Every metronome
  card is four row groups, every transport card five — asserted statically across all three apps
  and on the door's live DOM, with the moved controls exercised (not counted) and the gates proven
  to bite.
- The appliance also traded its `Sound: on/off` button for the family's mute icon (the 260820.3
  divergence closed): icon = a view of the click level, stash restored on unmute, default 80,
  pre-icon localStorage reconciled on load.
- All three pages verified `file://` with the network disabled, zero console errors (the
  appliance's in-page self-tests ran clean); screenshots at 1280 and 390 inspected; `hugo` +
  `tools/check_site.py` green (19 pages, all links). URLs unchanged. The two untouched studies are
  byte-identical. Committed, not pushed.

## 2026-08-20 — Deployed: the welcome post says five studies in two groups, and "derived by code"

- **Deployed `317b3aa`** — Daniel's approved rewrite of the welcome post: five studies, "The études"
  (metronome · triadetudes · tetradetudes, voice-count order, the family logic in prose) separated
  by a rule from "The maps" (modes · tetrad voice leading, with why they sit outside the étude
  family). One factual correction rode the phrasing: "derived by a Python generator" → **"derived by
  code"** — Tetradetudes is composed by the JS hub from a door lock, so the Python claim was false
  for one of five.
- **Verified on the RENDERED page** (cache-busted): all five studies linked and resolving 200; the
  two sections render with exactly one visible `<hr>` between them (the bare `---` rendered as a
  rule — looked at, not assumed); no literal "---" or ">" in the visible text; **"Python" appears
  nowhere on the page**.

## 2026-08-20 — Deployed: the mute icons + Daniel's landing page — v0.1.7 and v0.8.10 live

- **Deployed `1c2449d`** (two commits: the mute icons f925fe9, and Daniel's landing-page/copy edits
  with two riding repairs — his paste artifact removed, the welcome summary matched to his
  jazz→music body edit). Pages workflow green.
- **Live spot-check:** all five study URLs answer 200; triadetudes and tetradetudes are
  shasum-identical to their committed files with **v0.8.10** and **v0.1.7** reading live; the
  landing page renders five cards — FOUR study cards (Metronome · Triadetudes · Tetradetudes ·
  Modes, his order) plus exactly ONE Blog card, no blockquote, no stray ">" anywhere in the
  rendered text. **Noted:** tetrad-voice-leading has no landing card in his layout — the URL stays
  live and permanent; presumed deliberate, flagged in the scrum for his confirmation.
- **Flagged, not fixed** (his prose, his voice): the welcome post still says "Two interactive
  studies are live today" — there are five.

## 2026-08-20 — One mute icon per slider: Tetradetudes v0.1.7, Triadetudes v0.8.10 (Update Log 260820.3)

- **Both apps** (Ruling 1): a speaker icon at the left of every level slider — chord, bass, and the
  metronome's Vol — muting to zero and restoring on a second press; the tetrads/triads slider is
  now called **chord**. v0.8.7's mute-is-the-slider-at-zero rule made universal; the `mute chords`
  checkbox and the metronome's `Sound` button retired into it. The icon is a view of the level
  (dragging to zero shows muted), unmute restores the stash or the default, aria-pressed + titles
  carried. A muted voice schedules no audio sources, so the gates count silence honestly.
- Tetradetudes rebuilt and republished byte-identical; Triadetudes hand-edited (it is the source),
  with old saved entries reconciled on restore. URLs unchanged; the metronome, modes and
  tetrad-voice-leading studies byte-identical. The metronome APPLIANCE keeps its Sound button —
  out of scope, recorded as a pending back-port.
- **Verified:** engine 474/474, door_locks 6859/0 (icon gates demonstrated failing against the
  pre-icon build first), bite 7/7, both apps file:// network-off zero console errors, side-by-side
  screenshots at 1280/390 inspected.
- **Committed, NOT pushed** — the deploy is Daniel's.

## 2026-08-20 — Deployed: v0.1.5 + v0.1.6 are live — the uppercase E and the working Sound button

- **Daniel's deploy of `be7ecb6`** (two commits: N4's uppercase E via the re-inline procedure's
  first customer run, and the Sound-button fix). Pages workflow green end to end.
- **Live spot-check, all five URLs:** every study answers 200 and is **shasum-identical** to its
  committed file. The live Tetradetudes tag reads **v0.1.6**; the string sets read E–B–G–D with zero
  lowercase occurrences; the other four studies unchanged.
- The Node.js-20 runner deprecation annotation, again — still filed for workflow maintenance.

## 2026-08-20 — Tetradetudes v0.1.6: the metronome's Sound button works (Update Log 260820.2)

- **What changed:** the Metronome card's Sound on/off button now silences and restores the click —
  it had flipped a variable nothing read (Daniel found it live). The click's on/off is now the clock
  owner's state (`CLOCK_STATE.click`); the transport's metronome checkbox is its second view — one
  state, two views, either moves both, asserted in both directions by counting real audio sources
  (demonstrated failing against the inert build first). The button's label states the state, its
  title states the action; the metronome's collapse summary is live (running/stopped · bpm · meter ·
  click on/off).
- **Republished byte-identical** from the door build; URL unchanged; the other four studies
  byte-identical. Engine 474/474, door_locks 6827/0, bite 7/7, file:// clean.
- **Filed, not fixed here:** the practice log does not round-trip the click state (the reference
  saves it); and the control-read sweep found one more declared control nothing reads
  (harmony-panel's modeSeg, benign today) — both as backlog items.
- **Committed, NOT pushed** — the deploy is Daniel's.

## 2026-08-20 — Tetradetudes v0.1.5: the high E is uppercase (Update Log 260820.1)

- **What changed:** the string-set labels read **E–B–G–D · B–G–D–A · G–D–A–E** — uppercase
  everywhere, as the triad app already is (Daniel: *"no likelihood a user who understands standard
  tuning mistakes which E that is"*). One character in `engine/tetrad-sequence.mjs`, plus the
  notepad summary's label list, carried through the carrier re-inline procedure's first run by a
  non-author. `carriersOf("tetrad-sequence")` = tetradetudes alone; door rebuilt and republished
  byte-identical (shasum `654bc3e…`); **the other four studies byte-identical**; URL unchanged.
- **Verified:** census pin red for exactly the one carrier, then green; engine 474/474; door_locks
  6817/0 (the saved-étude restore round-trip confirms setIndex identity unmoved); file://
  network-off zero console errors; screenshots at 1280/390 inspected.
- **The procedure's first customer filed three findings** (no app-side-consumer step — it ran green
  while the artifact still shipped the old label in the notepad's summary list; a redundant double
  door-rebuild; under-specified pinned-test handling) — recorded in Update Log 260820.1 for the
  family-standard item.
- **Committed, NOT pushed** — the deploy is Daniel's.

# SITELOG — atetudes.com

Newest first. Every change to the site is recorded here: date, what changed, why, and for
ingests the source vault edition (per the Site Charter, `CLAUDE.md`).

---

## 2026-08-20 — Deployed: the census-driven triple re-inline is live — Metronome v1.4.1, Triadetudes v0.8.9, Tetradetudes v0.1.4

- **Daniel's deploy of `2d11439`** (the carrier census + the +M7 re-inline). The Pages workflow ran
  green end to end.
- **Live spot-check, all five URLs per the doctrine:** the three changed studies answer 200 and are
  **shasum-identical** to their committed files — v1.4.1, v0.8.9 and v0.1.4 read live in their tags —
  and the two untouched studies (modes-from-pentatonic-boxes, tetrad-voice-leading) answer 200,
  byte-identical to the repo. First deploy in the site's history to change three published studies
  in one push; every URL unchanged.
- The Node.js-20 runner deprecation annotation appeared again — still a warning, still filed for a
  future workflow-maintenance item.

## 2026-08-19 — chord.mjs reads +M7: the first carrier re-inline touches three studies at once (Update Log 260819.6)

- **What changed, and why three studies:** `engine/chord.mjs` gained a SPELLING alias — `+M7` (the
  augmented-major seventh, harmonic and melodic minor's III) now routes through the existing `maj7`
  rule and `#5` transform; no new interval data. chord.mjs is byte-pinned into every study that
  carries it, and the census (`carriersOf("chord")`) names three: **Metronome, Triadetudes,
  Tetradetudes**. Each was re-inlined BY ITS OWN SHAPE — the two hand-authored studies had the
  identical block applied at the identical seam; the door was rebuilt from source and republished
  byte-identical. **All URLs unchanged.**
- **Versions:** Metronome **v1.4.1** · Triadetudes **v0.8.9** · Tetradetudes **v0.1.4** — a
  re-inline changes shipped behaviour in every carrier, so every carrier bumps.
- **The oracle opened up:** the tetrad payload's 1,440 previously-unreadable `+M7` voicings (8.3%)
  are now checked — the oracle assertion widened from 15,840 to the full **17,280**, and the
  self-dissolving GAP pin (asserting `C+M7` throws) was replaced by its designed successor
  (every payload symbol parses; a shrinking oracle names what shrank).
- **The procedure is now written down** in `engine/README.md` ("The carrier re-inline procedure") —
  census-driven, covering both carrier shapes, for the other eleven modules.
- **Verified:** census + module pins green (they went red for exactly the three carriers on the
  engine edit — the checklist working); engine **474/474**; `door_locks.py` 6817/0; `bite.py` 7/7;
  all three changed studies loaded `file://` network-off with zero console errors; the two untouched
  studies byte-identical.
- **Committed, NOT pushed** — the deploy is Daniel's.

## 2026-08-19 — Deployed: the four-commit day is live — Tetradetudes v0.1.3, Triadetudes v0.8.8

- **Daniel pushed `ca64c5c`** (four commits: metroOwner v0.1.1 · the ATTACK message v0.1.2 · the
  artifact-level gate conversions · shell parity v0.1.3 + v0.8.8). The Pages workflow ran green end
  to end.
- **Live spot-check:** both changed apps answer 200 and are **shasum-identical** to the committed
  files — the tags read v0.1.3 and v0.8.8 live; the three untouched studies still answer 200.
- The Node.js-20 runner deprecation annotation appeared again — still a warning, still filed for a
  future workflow-maintenance item.

## 2026-08-19 — Shell parity: Tetradetudes v0.1.3 and Triadetudes v0.8.8, one commit, both directions (Update Log 260819.4)

- **Tetradetudes v0.1.3** (rebuilt from the hub, republished byte-identical, shasum `a836a92…`):
  the metronome and transport cards share a row height (the triad app's stretch rule — the sizing
  rule fixed, not a card nudged); the Play button is the house red `.primary` (Daniel reversed the
  earlier retire-the-red call); the piano keys sound when pressed (a new event-shaped `NOTE` bus
  message; the audio card plays the note with the triad app's own duration and velocity).
- **Triadetudes v0.8.8** (hand-authored — the study file IS the source): the first beat of the bar
  flashes RED on the beat lamp (`LAMP.bar` → #B82929, the tetrad rule back-ported per Daniel's
  recap), runtime-verified; the keyboard board gains the "On the keys" header. **A contradiction
  reported on N6:** the key-name labels the finding names (C2–C6, dot labels) already existed
  identically in both apps — the header was the one visible labelling difference; if Daniel meant
  something else, it needs his eyes. **No anti-drift pin fired** — the edits stayed clear of every
  inlined engine module, and the 66 carrier-pin + 88 characterization assertions pass untouched.
- **NOT done: N4** (the lowercase `e` in the string-set labels) — one character inside byte-pinned
  `engine/tetrad-sequence.mjs`; it rides the first coordinated carrier re-inline rather than being
  hand-poked into a published file.
- **Verified:** both apps `file://` network-off, zero console errors; side-by-side screenshots at
  1280 and 390 inspected; the three untouched studies byte-identical; engine 457/457, tetrad pins
  8/8, door_locks 6816/0 (with new artifact assertions: card heights equal, a pressed key starts
  real audio sources), bite 7/7.
- **Committed, NOT pushed** — the deploy is Daniel's; v0.1.1 → v0.1.3 and v0.8.8 all ride it.

## 2026-08-19 — Tetradetudes v0.1.2: the first chord sounds — an attack is not a position request (Update Log 260819.2)

- **What changed:** on a cold Play (and Pause → Play) the FIRST chord now sounds. The transport's
  attack rode the position request, the step owner rightly swallowed "go to step 0" when already at
  step 0, and the audio card — which sounds on the owner's echo — was never reached. Sound now travels
  on its own event-shaped `ATTACK` message, transport → audio directly; position still flows on the
  request and the render guard is untouched. A silent extra: the sounding-note pulse fires for that
  first chord too. **v0.1.2.**
- **`static/studies/tetradetudes/study.html` rebuilt and republished byte-identical** (shasum
  `be3c81b…`). No engine module changed — the eight anti-drift pins pass unchanged.
- **The gate grew artifact-level ears:** a new block counts REAL audio sources at the first attack of
  a cold Play (≥4 sounded, ≤9 so the echo did not double it), demonstrated failing against v0.1.1 —
  where the step-0 attack was announced and 0 sources started. The prior pins had asserted the
  message and passed over the silence.
- **Verified:** published file from `file://`, network aborted — zero console errors; other four
  studies untouched; full suite green (engine 457/457, pins 8/8, door_locks 6796/0, bite 7/7);
  screenshots at 1280 and 390 inspected (tag reads v0.1.2).
- **Committed, NOT pushed** — the deploy is Daniel's.

## 2026-08-19 — Tetradetudes v0.1.1: the transport owns the clock it starts (Update Log 260819.1)

- **What changed, and why it is a version bump.** Shipped behaviour changed: Pause now stops a
  metronome the transport started; Play after Pause gives ONE count-in bar and sounds chord 1; a
  metronome the user started by hand survives a transport Pause; the metronome's own Stop stops a
  running étude. Three symptoms Daniel found in the side-by-side recording, one defect (the play path
  was asymmetric — Play started the clock, Pause never stopped it) plus one ordering defect it had
  hidden (the arm landed one beat late). Fixed in the hub's transport and metronome cards by carrying
  the reference's `metroOwner` rule by name — **v0.1.1**.
- **`static/studies/tetradetudes/study.html` rebuilt and republished byte-identical** from the build
  (shasum `0466ed8…`). **No engine module changed** — the eight anti-drift pins pass unchanged
  against the new file, so the §4.2.4 carrier state is exactly as it was: eighteen modules
  byte-pinned, none moved.
- **Verified:** published file from `file://`, network aborted — zero console errors, zero network
  attempts; the other four studies byte-identical and still loading; full suite green (engine
  457/457, pins 8/8, characterization 88/88, door_locks 6767/0 with three new pins that were
  watched to fail first, bite 7/7); screenshots at 1280 and 390 inspected.
- **Committed, NOT pushed** — the deploy is Daniel's.

## 2026-08-18 — Deployed: Tetradetudes is live at atetudes.com/studies/tetradetudes/ (Update Log 260818.24)

- **Daniel pushed `a7a6d2c`** (his call, per the entry below) and the Pages workflow ran green end to
  end — engine suite, door build gate, browser lock suite, site integrity, deploy.
- **Live spot-check, per the verification doctrine:** the wrapper answers 200 at the permanent URL and
  renders its iframe; the served `study.html` is **shasum-identical** to the committed file
  (`77e0806…`), so the byte-identity chain now runs build → `static/` → live, unbroken. All four
  sibling studies still answer 200.
- Worth a line: the workflow run carried a GitHub annotation that **Node.js 20 actions are deprecated
  on runners** (checkout@v4, setup-python@v5, etc. forced onto Node 24). A warning, not a failure —
  flagged for a future workflow-maintenance item rather than acted on here.

## 2026-08-18 — Tetradetudes goes live as door #1 — the first hub-built study on the site (Update Log 260818.24)

- **What shipped.** `static/studies/tetradetudes/study.html` — the Tetradetudes door, built by
  `hub/tools/build.mjs` and copied **byte-identical** (shasum `77e0806…` matches the build output;
  the published file is never hand-edited, charter §5). Its Hugo wrapper `content/studies/tetradetudes.md`
  (`layout: study`, summary in the siblings' register) serves the permanent URL. This fulfils the
  2026-08-16 decision that **Tetradetudes becomes door #1** after Triadetudes could not be
  regenerated without breaking its characterization suite.
- **The permanent URL: `atetudes.com/studies/tetradetudes/`.** Permanent from this commit (charter);
  a change would need Daniel and a redirect stub. The slug matches the door id and the sibling
  naming (`triadetudes`, `metronome`).
- **Version: v0.1.0**, riding the header tag as every sibling's does (Triadetudes v0.8.7, Metronome
  v1.4.0). A deliberate FIRST release: the family versions conservatively — Triadetudes is more
  mature and still pre-1.0 — and this door's own roadmap (child 4's narrator and guide-tones) is not
  built yet, so 1.0.0 would overclaim. Set at the door (`present.blurb`) and rebuilt, not hand-edited;
  the same rebuild dropped the build's "Not a published study" footer, now false.
- **§4.2.4 CONSEQUENCE, stated plainly: publishing byte-pins EIGHTEEN engine modules into this study.**
  Ten were already carried by other studies; **eight had never been carried by anything** — `drill`,
  `figure`, `isolation`, `tetrad-sequence`, `tetrad-voicings`, `transport`, `voice-identity`,
  `voices`. **From this commit, changing any of the eighteen is a coordinated carrier re-inline** —
  edit `engine/`, rebuild every door that carries the module, re-publish, re-verify in a browser.
  The free-module window (§4.2.4) is now closed on purpose; both free modules were audited first
  (`73bb9a2`, `a458dd6`).
- **The eight got anti-drift pins in the same commit** (`engine/tests/door-carrier-drift.test.mjs`),
  following `metronome.test.mjs`'s shape: every exported definition of each module must appear
  verbatim in the published study. **Each was proven to bite** — edit a definition without rebuilding
  and its pin fails — then reverted. A carrier with no pin is worse than an unpublished door.
- **Verified.** The published file loaded from `file://` with the network aborted: **zero console
  errors, zero network attempts.** The four existing studies re-verified **byte-identical** and still
  loading — Triadetudes, Metronome, Modes clean; `tetrad-voice-leading` emits its pre-existing
  AudioContext autoplay *warnings* (it creates its context at load; the door correctly waits for a
  gesture), unchanged by this publish. Full engine suite **457/457** (+8 pins), characterization
  **88/88 untouched**, `door_locks.py` green, `bite.py` 7/7. Screenshots at 1280 and 390 inspected.
- **Committed, NOT pushed** — the deploy is Daniel's; pushing triggers the Pages build.
- **One divergence flagged, not fixed:** the studies index says its studies are *"generated in the
  At-Etudes vault and published here."* Tetradetudes is generated by the **hub**, not the vault — a
  small copy inaccuracy left for Daniel rather than silently rewritten.

## 2026-08-16 — Playwright joins CI as a devDependency; Triadetudes is NOT republished (Update Log 260816.5)

- **No published study changed.** `static/studies/triadetudes/study.html` is byte-identical to
  `HEAD`. Stage 3 would have regenerated it as door #1 and **stopped at its own gate instead** — the
  door build cannot reproduce the study without breaking the characterization suite that protects it.
  `/studies/triadetudes/` is untouched and permanent, as it was before. Full findings in Update Log
  260816.5; the decision — accept the domain limit, Tetradetudes becomes door #1 — is 260816.6.
- **The dependency decision, recorded as the item required.** Playwright is now a **CI
  devDependency**, approved by Daniel 2026-08-16. It is a build-time tool and **ships in nothing**,
  so charter §5's single-file offline promise is untouched — no study page gains a byte. This is a
  deliberate exception to "no new frameworks, bundlers or services", scoped to the CI runner.
- **What it buys:** `.github/workflows/pages.yaml` gains a **Door lock suite (browser)** step —
  `node hub/tools/build.mjs` then `python3 hub/tests/door_locks.py` — so the authoritative half of
  the door gate now guards the branch that deploys. Until today it ran local-only: the rendered
  control partition, the orphan-selector check, and `file://` load with the network aborted and zero
  console errors. A door that grows a locked control, or a stylesheet that grows a rule matching
  nothing, now fails the deploy instead of failing on someone's laptop.
- **Pinned on purpose** (`playwright==1.55.0`, the version the gate was developed against) so a
  browser bump is a deliberate act with a log entry, not a silent change in what "green" means.
  `actions/setup-python@v5` added alongside so `pip install` is not fighting ubuntu's
  externally-managed system interpreter; `check_site.py` is stdlib-only and is indifferent to which
  interpreter it gets.
- Verified: the exact CI command sequence run locally — **1966 assertions, 0 failed, exit 0**;
  workflow YAML parsed and step order confirmed; engine **323/323**, door build gate **3/3**;
  `git status` clean under `static/`.

## 2026-08-16 — Stage 2 re-verified cold; the CI door gate's spec citation now resolves (Update Log 260816.3)

- **No site change, again.** All four published studies re-verified byte-identical to `HEAD` and
  loading from `file://` with every http(s) request aborted — zero console errors, zero network
  attempts. Triadetudes is still **not** republished; that is stage 3.
- **The door gate re-run from a cold session and green throughout**: engine 323/323, the CI door
  build gate 3/3, the local browser suite 1966 assertions / 0 failed, 7/7 bite mutations biting.
  Doors rebuilt to the same shape and their screenshots re-inspected at 1280 and 390.
- **Why this touches the site build:** `.github/workflows/pages.yaml`'s door-gate step cites *family
  spec §4.2.2* for the rule it enforces, and that section did not exist — stage 2's results were
  logged but never ratified into the spec the way stage 1's were. §4.2.2 is now written, so the
  build file's stated authority resolves. `engine/README.md` carried the same dangling citation.
- **`engine/README.md`'s test command was wrong where a human would copy it** (a quoted glob, which
  `node --test` cannot resolve before Node 21). CI used the working unquoted form and was never
  affected. Fixed, and the hub gate's command documented beside it.
- Noted for the record: the frozen `tetrad-voice-leading` study emits Chrome autoplay-policy
  *warnings* for its `AudioContext` on load — pre-existing, not errors, file byte-unchanged, and
  §5.2.1 freezes that study. Recorded so a future run's warnings are not read as new.

## 2026-08-16 — Door mechanism stage 2: CSS and markup prune from the lock; the hub's first two modules (Update Log 260816.2)

- **No published study changed.** All four are byte-identical to `HEAD` and were re-verified loading
  from `file://` with the network disabled, zero console errors. Triadetudes is **not** republished —
  that is stage 3.
- **The site-relevant result:** a door's single file can now be driven from its lock in all three
  materials — script, markup and styles. `hub/` builds two proving doors: `scribe` (metronome +
  notebook) at 148 kB and `plain` (metronome alone) at **21 kB**, the smaller one containing no trace
  of the notepad card or the six engine modules behind it. Greped on the artifact, not the config.
  **Charter §5's single-file offline promise holds for a door that prunes real UI**, which is the
  version of the promise the pentatonic door will actually need.
- **Why this is a site change even though no page moved:** every future study page will be built this
  way, and the rule that makes it work is a *stylesheet* rule. A study's CSS must be owned by the
  module whose markup it matches; page-level rules for one module's markup (`#journalIn`, `.jcol`,
  `.hist …` in Triadetudes today) cannot be pruned and are now refused by the build.
- **Dead CSS found in the shipped study** by the new orphan-selector check: `.hist .sum` matches
  nothing — `notepad-surface.mjs` builds no such element. Left in place (nothing shipped is touched
  in this item); it goes when Triadetudes is regenerated at stage 3.
- **CI gains a door gate** (`hub/tests/door_build.test.mjs`, zero dependencies, beside the engine
  suite): style ownership, the static-derivation bans, and the artifact greps run on every push. The
  browser half (rendered partition, `file://` offline, orphan selectors) stays a local gate —
  Playwright in CI would be a new dependency and is Daniel's call.
- Chrome and palette untouched; the hub's page grammar is the study's own, neutral, no degree color.
  Engine suite 323/323. Full findings in Update Log 260816.2.

## 2026-08-16 — Door mechanism stage 1: the gate passes, nothing on the site changed (Update Log 260816.1)

- **No site change.** No published study, wrapper page, layout, or CSS was touched; nothing was
  extracted from Triadetudes. Logged here because the result governs how every future study will be
  built and published, and because the charter §5 promise it tests is a *site* promise.
- **The question:** can a door's locked config drive which modules get inlined into its published
  single file (family spec §4.2)? **Answer: yes.** Three throwaway doors, module set derived from
  the lock end to end, each built to one self-contained HTML file that loads from `file://` with the
  network aborted and **zero console errors**, exercised rather than merely loaded, screenshots at
  1280 and 390 taken and inspected. **Charter §5's single-file offline promise survives the
  consolidation** — the kill condition did not fire.
- **What that means for published pages:** a door's page keeps the site's guarantees for free rather
  than by discipline. Beta's built file contains **none** of material-a's source (greped on the
  artifact, not the config), so a locked door's download is genuinely smaller — the promise the
  pentatonic door will need when it must not ship a chord parser.
- **Chrome untouched, palette untouched.** The toy doors are ink/gray/ground only; no degree color
  appears anywhere, since there is no musical function to color.
- Engine suite 309/309, unchanged. Prototype (throwaway, gitignored):
  `notes/prototypes/door-mechanism-stage1/`. Full findings in Update Log 260816.1.

## 2026-08-14 — Triadetudes v0.8.7: the mixer — triads and bass, one mute (Update Log 260814.2)

- **Two level sliders in the Transport card — triads and bass** — each a gain bus spliced
  into an existing voice path (`NOTE_VOICES` → `TRIAD_BUS`, `BASS_VOICE` → `BASS_BUS`).
  **No click level added**: `st.clickVol` keeps its one control in the Metronome card — the
  metronome is the shared family component and owns its own sound.
- **Why it is a feature, not polish:** bass + click with triads at zero is the true
  play-along mode — the app holds the harmonic floor and the beat, the player supplies the
  triads. Unreachable before v0.8.4 gave the bass its own timbre; confirmed live under
  Playwright (bass events into a unity bus, triad bus at 0, click running), final judgement
  by ear.
- **Mute chords unified with the triads level** — `st.metroOnly` deleted; the checkbox is a
  view of `st.triadVol === 0` in both directions, with the last non-zero level restored on
  uncheck. One piece of state, asserted in `engine/tests/triadetudes-mixer.test.mjs`.
- **Pre-mixer notebook entries restore and sound identical**: levels default `?? 1` in
  `applyRaw` (the `noteVoice` serialization pattern); unity gain is transparent. Asserted
  with a pre-item entry, not just a round-trip.
- **Report-back (the item asked):** the play-along balance is bass against click, and those
  two levels sit in different cards (Transport / Metronome). On screen this read fine — both
  cards share the clock row, side by side at 1280 and adjacent at 390 — but the real answer
  is Daniel's, playing. No duplicate control invented to pre-empt it.
- Suite 309/309 · Playwright offline 390-first + 1280, zero console errors · `hugo` +
  `tools/check_site.py` clean. Supersedes v0.8.6 (git history holds it).

## 2026-08-12 — Triadetudes v0.8.6: the sketch speaks shape (Update Log 260812.7)

- **Daniel on v0.8.5: "The bug is still there." He was right** — v0.8.5 fixed the manners
  and left the bug. `emitFromClicks` hardcoded `mode:"tones"`; there was no shape path, so
  the switch was never a judgement about approaches — it was unconditional, and the v0.8.5
  announcement made a limitation look like a decision.
- **The emitter now speaks both languages.** `ctx.mode:"shape"` emits a slot pattern (H/M/L)
  from chord-tone clicks — click three chord tones in Shape mode and you get exactly a slot
  pattern, and **the mode never changes**: no switch, no announcement, nothing to forgive.
  The slot is derived at click time (the string was being dropped at `sketchSync`): a
  fretboard click takes its string's place in the set, a keyboard click the grip note with
  the same midi.
- **A non-chord-tone in shape mode is the user's decision.** It is held out with the reason
  — "shape has no approaches — switch to the tones to use this note" — and if they switch,
  **the sketch survives the toggle and re-speaks in the new language** (the buffer re-emits;
  no text ever crosses the parsers, so v0.7.7's rule holds). Tones mode is byte-unchanged
  from v0.8.5 — characterization-pinned.
- **The readout split by lifetime**: status stays in `#sketchNote`; the always-true help
  line ("tap a mark…") moved to its own `#sketchHelp`; the event message class no longer
  exists because nothing switches automatically anymore. Both elements asserted wrapping,
  never clipping, at 1280 and 390 px.
- Verified: suite 304/304 (shape emission parse→serialize fixed points, refusals named by
  index, the absent-ctx.mode tones pin); Playwright regression at both widths — Daniel's
  chord-tones-only sequence stays in Shape start to finish, asserted on the mode itself;
  rawCfg round-trips with slot/heldOut never serialized; MOTION re-inlined in both carriers.

## 2026-08-12 — Triadetudes v0.8.5: the sketch bug — coercion speaks, orphans hold, invariants only (Update Log 260812.6)

- **Daniel's field report against v0.8.4** ("Shape mode… switches to tones and adds sometimes
  very odd approach notes") — three defects, fixed at their own layers:
- **The coercion now speaks.** Sketching still moves Motion to tones — shape has no
  vocabulary for approaches, the substance was right — but the readout announces it
  ("approaches need the tones — Motion switched from Shape"), and an orphan click alone no
  longer flips the toggle: the mode changes only when a figure actually reaches the field.
- **Orphan clicks are no longer conscripted.** At click time the readout says what a pending
  approach was taken to mean: held until you click its target — the reading locks then, not
  before. When the target arrives, a pending click with no relative reading against it is
  **held out by name** ("F# has no relative reading against the target — held out of the
  figure, not renamed"), drawn dashed at reduced opacity, still removable by double-tap.
  The tap/remove hit mapping now routes through the emitted list, so held-outs don't shift it.
- **The emitter refuses coordinates.** `emitFromClicks`'s absolute-degree fallback is gone:
  a bare degree in an approach slot is absolute against the key and silently stops following
  a key or scale change — v0.7.5's defect in another path. Where no relative form exists the
  emitter returns `{error, at}` naming the click. The grammar still parses hand-typed degree
  approaches — user input is the user's (charter §7 boundary clause).
- Asserted: a 132-case emit corpus greps clean of unsigned degrees in approach positions;
  key/scale changes translate every sketch-emitted figure (v0.7.5's property, on sketch
  output specifically); Daniel's exact sequence and its far-orphan variant pinned in
  Playwright; rawCfg byte-unchanged, `heldOut` never serialized. MOTION re-inlined in both
  carriers (metronome verified clean). Suite 300/300; offline `file://` at 1280/390 px,
  zero console errors.

## 2026-08-12 — Triadetudes v0.8.4: the voice table, and a bass of its own (Update Log 260812.5)

- **Roadmap §2 Sound, pulled forward — and it ships ready-to-play, not done: no assertion
  can tell you a voice sounds good, so the item stays open until Daniel has heard it.**
- `NOTE_VOICES`, the CLICK_VOICES pattern one level up: **tone** (today's triangle voice,
  verbatim, still the default — existing études sound identical), **pluck** (Karplus-Strong,
  noise burst into a lowpassed feedback delay, rendered synchronously into cached
  AudioBuffers from a deterministic seed — no worklet, no async load, charter §5 intact:
  zero assets), **sustain** (drawbar-ish additive partials; notes hold to the chord change,
  so the common tone audibly holds while one voice moves — the thing the app teaches, which
  the fast decay was hiding). The **bass has its own voice** regardless of the picker:
  triangle into a 520 Hz lowpass, a pedal that no longer smears into the triads.
- **The (a)/(b) decision**: shipped (a), hold-to-the-chord-change, bass pedal included. The
  switch is the one-word const `SUSTAIN_HOLD` in study.html (search for it; `"chord"` → (a),
  `"slot"` → (b) legato). Daniel decides by playing, not by reading.
- The timing law is asserted, not promised: `voiceSchedule` consumes the v0.6.5 onset seam
  and varies only duration — note count, onsets, midis and roles pinned identical across
  every voice; tone's schedule byte-equal to the raw event list (anti-drift). Selector in
  the Transport card beside *mute chords*; `noteVoice` serialized with `?? "tone"` so
  pre-item notebook entries restore unchanged (asserted byte-identical in-browser).
- Node hygiene: every source counted, whole chain disconnected on ended. Worst case
  (160 bpm, 16-note pattern, sustain voice, bass sounding) peaked at **34 live nodes**
  against an asserted ceiling of 64, and drained to 0 after stop.
- Verified: suite 298/298 (new triadetudes-voices.test.mjs; all characterization pins
  green); Playwright offline `file://` at 1280/390 px, zero console errors, voice-select ↔
  voice-table drift guard, rawCfg round-trips; Transport card inspected at both widths.

## 2026-08-12 — The music palette: Metronome v1.4.0 · Triadetudes v0.8.3 (Update Log 260812.4)

- **The notepad arc's child 3 — palette output that is valid app input by construction.**
  A `Palette` button now sits in both notepads' control rows (a declared surface
  capability, so the §4.3 conformance suite asserts it in every host). The panel offers:
  tier 1 glyphs (♭ ♯ ♮ ° ø △ • | |: :| ->, typographic only — **no notation font**, per
  the 2026-08-09 decision; the U+1D1xx block is not offered at all); tier 2 a chord
  chooser whose whole 12-root × 17-quality matrix is load-asserted through `parseChord`;
  tier 3 structures (ii–V–I, minor ii–V–i, turnaround, twelve-bar blues, rhythm changes A,
  cycle of fourths) inserted **in any key** as `.atchart.md` chart blocks; tier 4 changes
  lines, figure snippets and slot patterns — each canonical through the target field's own
  parser (`engine/motion.mjs` parse→serialize fixed points; slot patterns derived by
  permutation, never listed).
- **Nothing is hand-typed**: structures live once as roman degree patterns and transpose
  through `engine/chord.mjs`'s `resolveRoman` (enharmonics spelled per key — Fm7 B♭7 E♭maj7
  in E♭, G♯m7 C♯7 F♯maj7 in F♯); chart bodies are canonicalized through the format engine
  itself. Grep tests forbid literal progression strings in both new modules.
- **The chart lift**: a chart fence the palette (or the user) puts in the pad becomes the
  file's chart block on export — positioned where typed, rendered back on import, byte
  fixed-point pinned. One chart per file still refuses by name where it must.
- Inserts go through `applyEdit`; cursor, selection, scroll and focus survive every insert
  (tested headless and in Chromium — the failure mode that makes palettes useless).
- **Size delta, attributable entirely to code (no webfont)**: metronome/study.html
  101,423 → 140,256 bytes (+38.8 KB: gains the motion grammar, structures, palette);
  triadetudes/study.html 283,108 → 301,730 bytes (+18.6 KB: structures, palette).
- Verified: engine suite 291/291 (structures 12-key corpus, palette caret contract, lift
  byte fixed-points, conformance with the new capability); Playwright offline `file://`
  both hosts × 1280/390 px, zero console errors, palette exercised end-to-end (glyph,
  chord, chart block, figure, pattern, persistence, lift through export); visual
  inspection of the open panel at both widths; `hugo` + `tools/check_site.py` green.

## 2026-08-12 — The host conformance suite (Daniel's dispatch; family spec §4.3)

- **§4.3 implemented as one small suite, not a framework**:
  `engine/tests/host-conformance.test.mjs` declares a host list per shared module and
  runs the SAME assertions against every entry. Adding a host is one list entry; an
  unwired host fails with messages that ARE the wiring specification — "[triadetudes]
  mount \"saveBtn\" expects #saveEntry in the page — add the element, or update this
  host list if it moved" / "no mount for declared capability \"export\" — provide
  els.exportBtn or els.controls" — tested by mounting a bare third host and pinning the
  named failure.
- **Everything asserts on the artifact**: the ids present in the shipped pages, the
  adapter nouns declared in the page source, and the controls that actually RENDER when
  the shared surface mounts over exactly the elements each page provides (the stub is
  built from the host list's mounts, so Triadetudes' Copy arrives by auto-append there
  exactly as it does live). Per host: identical rendered capability set, the §5/§6
  handoff guarantee text, and the behavioural contract (save clears the pad, the note
  files, the label composes from the nouns).
- **The suite caught its first real divergence on its first run**: the two carriers
  stated the metronome's shared-component guarantee in DIFFERENT WORDS ("The same
  metronome every At-Etudes study carries…" vs "every At-Etudes app carries this
  metronome, first block, this look"). Unified on the family wording; the metronome
  widening asserts the control inventory (12 ids) and the guarantee line in both
  carriers from the same one-line-per-host list.
- **The README inventory is now asserted, never retyped**: engine/README.md was missing
  motion.mjs, notepad.mjs and notepad-surface.mjs — the exact defect §4.3 exists to
  prevent, in the document describing the engine. The layout now lists all ten modules,
  the suite CI-asserts every engine/*.mjs appears in the README (failure names the
  missing module), and the Rules section points at §4.3. The test stubs themselves were
  deduplicated into `_dom-stub.mjs` — one source per fact, applied to the suite's own
  scaffolding.
- Suite 271/271 (7 conformance tests); both studies re-verified rendering from
  `file://` offline with zero console errors (the guarantee-wording fix touched
  Metronome's page). Update Log 260812.3.

## 2026-08-12 — Notepad: the surface declares capabilities, the host places them (Daniel's dispatch)

- **The extraction's rule had a gap, fixed at the right level**: "share behaviour, not
  layout" collapsed two axes and let Triadetudes silently lose Copy — a capability the
  component spec named from the start. The corrected law: **the surface declares the
  capability set (save, clear, export, import, copy); the host chooses placement, never
  existence.** A host mounts a capability explicitly, or provides a controls container
  and the control is auto-appended — and a host that provides neither **fails loudly by
  capability name** ("no mount for declared capability \"copy\" — provide els.copyBtn
  or els.controls"), tested exactly as dispatched: remove the mount, assert the named
  failure. Triadetudes v0.8.2 gains Copy through the auto-append path, exercised live;
  Metronome v1.3.1 keeps its explicit mount — both mechanisms proven in production
  pages.
- **Labels compose from the adapter's declared nouns** — `nouns:{item, apply}` —
  "Save entry"/"Restore étude" vs "Save note"/"Apply settings" remain legitimate host
  vocabulary, but no save or apply verb is hand-written in any page: the HTML buttons
  are empty and the surface fills them (a planted "HAND-WRITTEN RELIC" is overwritten,
  tested). A new verb is one line in one adapter.
- **The handoff sentence is a charter guarantee, not helper prose**: "The file is the
  handoff channel: nothing leaves this machine." is now emitted by the surface in every
  host into a host-placed mount, stamped `data-cap="handoff"` — Triadetudes had been
  missing it entirely; Metronome's hand-typed copy is removed in favour of the emitted
  one.
- **The divergence-stopper asserts on the artifact**: both headless (the stub DOM walks
  `data-cap` stamps across both host configurations) and in the real pages (Playwright
  enumerates rendered `[data-cap]` controls in both studies and asserts the identical
  set: clear, clear-discard, clear-save, copy, export, handoff, import, save) — what
  actually renders, not what the code registers, the same discipline as the
  byte-identity and content-fingerprint rules.
- Suite 264/264 (5 new capability-law tests; the loud-failure fixture pins the message
  by name); 13 Playwright checks across both studies offline, zero console errors;
  save-clears re-verified through the reworked mounts. Update Log 260812.2.

## 2026-08-12 — Notepad: the surface is extracted, and Metronome v1.3.0 is brought up to canonical (Daniel's dispatch)

- **The root cause, fixed once**: `engine/notepad.mjs` shared only the MODEL, so every
  behavioural fix landed twice and the second was always late — Metronome still had the
  save-doesn't-clear duplicate bug fixed in Triadetudes at v0.8.1, and no Clear control.
  **`engine/notepad-surface.mjs`** now owns the behaviour — save-clears semantics, the
  Clear confirm (Save-and-clear primary), import/export/clipboard, autosave debouncing,
  the storage-denied path, and saved-row rendering via renderTo — while hosts keep their
  layout entirely: the surface mounts into elements the host provides and reaches the
  DOM only through their ownerDocument, so the whole layer runs headless against a stub.
- **Triadetudes' corrected v0.8.1 behaviour is canonical, verbatim.** Both hosts now
  consume it; neither re-implements a line of it. The pad question is settled the
  dispatched way for both: **persistent uncommitted scratch** — autosaved on a debounce,
  survives a reload (verified with a real browser reload), clears on save.
- **THE TEST THAT STOPS THIS RECURRING**: `notepad-surface.test.mjs` runs
  save-then-inspect-leaves-the-pad-empty against BOTH host configurations through the
  one surface — plus the clear branches, persistence-across-reload, storage-denied and
  the migrate-once hook, all headless. Before the extraction that assertion needed two
  hand-built DOMs; that awkwardness was the item's predicted finding, and it is gone.
- **Metronome v1.3.0** is brought UP: save now clears the pad, the Clear control exists
  and confirms with Save-and-clear primary, rows render through the surface with derived
  labels, and the storage-denied path did not regress (loads clean, says so, still saves
  in memory and exports). Alignment note: Apply on a saved row now also returns the
  note text to the pad as uncommitted scratch — the canonical Restore semantics.
  Triadetudes keeps v0.8.1 behaviour bit-for-bit through the swap (migration, derived
  labels, Restore, legacy import, fold lines, rawCfg round-trip — all re-verified) and
  keeps its version, since nothing user-visible moved there.
- **Two build findings worth recording**: (1) the extraction surgery initially swallowed
  eight bystander functions (rawCfg, applyRaw, summaryText, toggleClick…) — caught by
  the harvest suite's syntax gate and Playwright's zero-errors gate, restored verbatim
  from HEAD; (2) a multi-line `import` in the new module silently defeated the
  line-based inline transform — the family transform stays deliberately dumb, so
  imports are now single-line, and the anti-drift pin covers the surface module in both
  carriers. Also removed: Metronome's dead per-host row CSS, which was colliding with
  the surface's `note md` class and boxing note text.
- Suite 259/259 (10 new surface tests); 21 Playwright checks across both studies from
  `file://` offline, zero console errors; both widths inspected. `rawCfg()` unchanged.
  Update Log 260812.1.

## 2026-08-11 — Triadetudes v0.8.1: the pad is the entry note, and Save clears it (Daniel's dispatch)

- **The model collision, resolved host-side as dispatched**: engine/notepad.mjs models
  the pad as the document's running free markdown; the Triadetudes surface treats it as
  THE ENTRY'S NOTE and was stamping it onto every save without clearing — both
  defensible, both at once is what duplicated. Triadetudes now simply doesn't populate
  the document's free-prose slot: **Save entry files the note and CLEARS the pad, no
  prompt, no toast** — the text moved to the row beside the pad, and the emptied pad IS
  the confirmation. The engine's model is untouched (Metronome may still keep a pad).
- **Clear is the destructive one, so it confirms**: a new Clear control on a non-empty
  pad asks — "that note is filed nowhere —" with **Save and clear** as the primary
  action (usually what was meant), Discard second, keep-writing to cancel. Clear on an
  empty pad needs no ceremony. **Saving with an empty pad still works** — capturing a
  configuration with no comment is a real use — with one small honest message, since
  nothing else visibly changes.
- **Export keeps the safety net**: anything still in the pad rides on top of the
  .atchart.md as the document's leading prose, so an unsaved note never evaporates —
  and the helper text now says it plainly: the top section is uncommitted scratch, the
  entries are committed.
- **The screenshot's three checks**: the `---` divider — established from the code
  that **Save injects nothing**; the only divider writer is the import merge joining
  two non-empty scratch pads (reasonable, kept, documented) — so the screenshot's rule
  came from an import or was typed. The label `NOTE — THE SESSION IN YOUR WORDS`
  (decision 8's removed model) → **`NOTE — WHAT JUST HAPPENED`**. The three nested
  titles reduced to two: the board header IS now the Log's title (`PRACTICE LOG —
  N SAVED`), the log column's own heading is gone, the note column keeps its one.
- Verified: 19 Playwright checks offline — save-clears with no duplication and no
  injected divider across consecutive saves, all three Clear branches, empty-pad
  capture, export carrying the scratch, titles — zero console errors, both widths.
  Suite 249/249 untouched; `rawCfg()` byte-identical. Update Log 260811.10.

## 2026-08-11 — Triadetudes v0.8.0: the Journal becomes the Notepad (Daniel's dispatch; decision 7's second proving host)

- **Migration first, before any UI, on real data shapes.** `engine/notepad.mjs` gains
  `fromTriadetudesV1`: every stored Practice Log entry maps field-for-field — the
  `rawCfg()` snapshot rides as the opaque payload **byte-identical** (asserted), the
  Intention/Accomplished prose survives under its old row markers (→ / ✓), the
  duration joins the note text (~N min), and **`en.summary` is DROPPED** — the stale
  cache 260811.3 flagged never crosses; labels now derive at render. This supersedes
  the "Stop storing en.summary" item. In the app the migration runs once, writes
  `triadetudes.v2.journal`, and leaves the v1 key untouched as a fallback copy.
  Restore rebuilds the same étude it did before — verified with a seeded log whose
  restored `rawCfg()` equals the stored snapshot exactly.
- **The adapter is the dispatched rename**: `{app:"triadetudes", version:1,
  snapshot: rawCfg, apply: applyRaw, summarize: summarizeCfg}` — with one real piece
  of work the seam exposed: `summaryText()` reads live state, so **`summarizeCfg(c)`
  is new — a pure function of the payload**, never of `st` (tested: mutating the live
  key does not move a row's label; a history row describes ITS OWN config). Nothing in
  `engine/notepad.mjs` needed to know either host — the seam held, which was the point
  of the second host.
- **The surface (decision 8)**: Practice Log LEFT, one plain textarea RIGHT — no
  preview, no toolbar, no mode. Intention/Accomplished are gone; the note is the
  session. A **drag handle** resizes the columns (pointer capture — element-scoped, no
  document listeners); **both columns fold** with the collapse the notebook never got
  at 260810.14 — `Log · 5 saved · last Aug 11 07:02` and `Note · <first line>` /
  `Note · empty`, live while folded. At 390 px the columns stack **note first** and the
  handle disappears. Rows render note markdown where it is READ (em renders; a typed
  raw tag stays literal).
- **The file is the handoff channel**: Export writes one `.atchart.md` — free notes,
  then one `###` section per entry, **each with its own fenced payload** (two entries
  a minute apart are two independent configs); the export byte-fixed-points through the
  format engine in-page. Import merges by id, never deletes; a foreign app's entry is
  named, inert, Restore-less, and re-exports untouched; **old exported logs import
  too** (legacy parse → the migration); a bare cfg JSON still loads as the current
  étude. A ```chart fence in a note refuses export by name.
- **The two screenshot bugs, investigated as dispatched**: the doubled helper
  paragraph does NOT reproduce (five widths, empty and populated — and this rebuild
  replaces that markup wholesale); the `→ Som e notes` row survived a full
  save→restore→export→import round trip byte-identical, so the pipeline is exonerated
  — a display/screenshot artifact or a typo in the stored text, which migration
  rightly preserves as typed. The grey box is noted in the markup as the CURRENT
  étude — Save's header — and left in place this pass.
- Suite 249/249 (the migration pin, the pure-of-st summarize tests, the in-slice
  NOTEPAD corpus; the anti-drift pin now covers both carriers). 26 Playwright checks
  offline from `file://`, zero console errors, both widths inspected. `rawCfg()`
  byte-identical, no new keys. Also: `engine/atchart.mjs`'s slot sentinels converted
  from raw NUL bytes to escape sequences — inlining had turned two study files binary;
  runtime identical, both carriers re-inlined and re-verified. Update Log 260811.9.

## 2026-08-11 — Metronome v1.2.0: the notepad surface becomes capture-only (decision 8)

- **Decision 8 reverses decision 1's preview half**: the notepad's job is capture, not
  authoring, and a split pane costs attention at exactly the moment an idea is most
  likely to evaporate. Metronome v1.1.0 (260811.7) shipped hours earlier with the
  decision-1 surface; this revision **removes — not hides — the live preview pane, the
  wide-viewport split, the Edit/Preview tabs, and the formatting toolbar**. What
  remains is ONE plain textarea plus Save note · Export (.atchart.md) · Copy · Import.
  Verified structurally: one textarea in the document, no preview/toolbar/tab element
  exists.
- **Nothing under the surface moved, by design and by test.** engine/notepad.mjs,
  engine/markdown.mjs and the atchart wiring are byte-identical to 260811.7 (the
  anti-drift pin still passes): markdown stays the storage format — plain prose IS
  valid markdown and the typist never needs a marker; `renderTo` now renders only
  where a note is READ (the saved-notes rows show *em* as emphasis and a typed
  `<b>` as literal text, re-verified); `applyEdit` stays inlined as the palette's
  insert-at-cursor seam — no longer wired to any button, and now the only structured
  way anything will enter a note (child 3).
- **Everything the dispatch re-asserts re-verified on the new surface**: the v1.0
  migration (seeded keys arrive, old keys kept), derived summary lines, export
  parsing + byte fixed-pointing in the format engine IN THE PAGE, import merging by
  id with foreign payloads named + inert + Apply-less, the storage-denied path still
  working and saying so — all from `file://` with the network disabled, zero console
  errors, 15 checks, both widths. Suite 246/246 untouched. Update Log 260811.8.

## 2026-08-11 — Notepad child 2: the shared component, hosted in Metronome v1.1.0 (Daniel's dispatch)

- **Migration before UI, as dispatched.** `engine/notepad.mjs` opens with
  `fromMetronomeV1(pad, log)` — the shipped v1.0 localStorage shapes are the
  characterization pin, mapped field-for-field with a no-loss test (ids kept for merge
  identity, the metro config becoming the opaque payload data) BEFORE any surface work.
  In the app, migration runs once, writes the new `metronome.v2.notepad` key, and
  leaves the v1.0 keys untouched as a fallback copy — verified live with seeded v1.0
  data.
- **The model is pure and the seam is host-shaped**: Document = pad + entries
  `{id, savedAt, heading, text, payload}`; payload `{app, v, data}` with data OPAQUE.
  Pure add/edit/delete/reorder (input documents proven unmutated). The host adapter is
  exactly the dispatched shape — `{app, version, snapshot, apply, summarize}` — and
  Metronome's is its old `cfgSnapshot/applyCfg/cfgLine` renamed. **summarize() derives
  at render, never stored** (the 260811.3 bug class, fixed by construction: the fence
  envelope carries app, v, id, savedAt, data and provably no summary field).
- **Serialization goes THROUGH engine/atchart.mjs** — `toAtchart`/`fromAtchart` build
  and read the format engine's own document (the CHART_SLOT export added rather than
  copying a literal); no rival writer exists here. Round-trip asserted ON BYTES over
  the corpus: unknown app id + payload v:99 carried whole; awkward prose with a
  "## Notes" lookalike inside a fence (the split is fence-aware); **an entry whose text
  contains fenced blocks of its own** — the payload envelope is END-ANCHORED so a
  user's ```js and non-envelope ```json fences stay prose byte-intact, and an UNCLOSED
  fence in a note cannot swallow the payload (the markdown engine's stays-literal rule,
  applied at the file layer). Two findings the corpus forced: (1) a ```chart fence
  typed in a note would make the written file violate the format's one-chart law — so
  toAtchart REFUSES it by name (content stays in the model; export surfaces the
  message) rather than emitting a file the format itself cannot parse; (2) fence
  pairing must treat only a bare ``` as a closer, per the markdown engine.
- **Metronome v1.1.0 ships on the component with no user-visible regression**: same
  cards, same Save-note flow, Apply/Delete intact — plus the decision-1 surface
  (source textarea, live preview built by the markdown engine's DOM-only renderer,
  toolbar riding `applyEdit` with selection and scroll surviving, Edit/Preview tabs at
  390 px), and the handoff paths: Export downloads one `.atchart.md`, Copy puts the
  same file on the clipboard, Import merges entries by id (never deletes). A foreign
  app's entry renders named and inert — "future-app · v1 (another app's settings —
  carried untouched)" — with no Apply button, and re-exports byte-identical.
- **The §5/§6/§7 constraints verified live, offline**: everything from `file://` with
  the network disabled, zero console errors; export text re-parses byte-identically in
  the format engine IN THE PAGE; the storage-denied path (localStorage throwing) still
  loads, still saves in-memory, SAYS SO steering to Export, and still exports. No
  derived musical data stored anywhere; no upload, no share, no server.
- Suite 246/246 (11 new notepad tests incl. the verbatim anti-drift pin on Metronome's
  four inlined modules: chord, atchart, markdown, notepad). 24 Playwright checks.
  Decision 7 honored: nothing in engine/notepad.mjs knows Metronome — Triadetudes'
  adapter is a rename away. Update Log 260811.7.

## 2026-08-11 — The .atchart.md v1.1 rules land in the engine (Daniel's dispatch)

- **§2.7 first, and independently — the load-bearing half.** The frontmatter layer now
  keeps every line as a raw segment in original order, and the serializer REPLAYS the
  raw text for anything the caller has not changed: unknown top-level keys, comments,
  odd spacing all round-trip **byte-identically** instead of being re-normalized (the
  old serializer re-quoted and re-ordered — exactly the unspecified behaviour that
  forced the amendment). Landed even though nothing writes an `apps:` map yet.
- **§2.6 — the apps accessor.** `readApp(doc, id)` materializes one entry on demand
  (fresh object each call); `writeApp(doc, id, cfg)` returns a NEW document with only
  that app's entry replaced by a canonical flow serialization. **Purity is proven by
  test, not asserted in prose**: the input document's JSON is compared before/after
  both calls, and mutating readApp's returned object touches nothing. Entries are
  opaque — carried, round-tripped, never interpreted, never validated. **No schema, no
  validator, on purpose**: an unknown app id and an entry with `v: 99` both replay
  verbatim through a write to a different app.
- **The version literal.** `atchart: 1.1` parses and writes; `1` stays readable and is
  never rewritten on round trip; `writeApp` on a v1 doc is the one thing that bumps
  1 → 1.1 (an existing 1.1 stays put). Higher-major refusal unchanged.
- **§4 corpus extended**, including the test that matters most: a v1 file with no
  `apps:` round-trips **byte-identically and does not acquire a bump** — which required
  one real design move: parse-time defaults (key, meter) are no longer appended to the
  serialization of files that never wrote them.
- **Doctrine folded in** (from the grep-assertions note, both deliverables): the
  comment beside markdown.test.mjs's grep now states it is DELIBERATELY comment-blind
  (a comment-stripper fails permissive and would silently weaken a §7 guarantee), and
  engine/README.md carries the generalised rule — grep assertions are comment-blind by
  design; state the contract in the test, not module prose — naming the palette and
  decomposition-table greps as the other instances of the shape.
- Unblocks the notepad's shared component without letting it grow a format
  implementation inside itself. Suite 235/235 (8 new v1.1 tests; every existing v1
  fixture untouched and green). Update Log 260811.6.

## 2026-08-11 — Notepad child 1: the markdown engine (Daniel's dispatch)

- **`engine/markdown.mjs`** — the notepad arc's one piece of genuinely new engineering,
  written in-house because its two guarantees cannot be imported. (1) **No HTML-string
  sinks anywhere in the module** — the renderer builds the tree with createElement /
  createTextNode / textContent only, and the test suite greps the module source for all
  four banned sinks (the guarantee is so literal that the module's own comments may not
  name them). (2) **No HTML passthrough** — a typed `<script>` is text and renders as
  the visible characters, a documented and tested divergence from CommonMark, said so
  in the module header. Charter §7 made structural instead of defensive.
- **The subset and nothing more**: ATX headings · paragraphs · em/strong · bullet and
  ordered lists (one nesting level) · blockquotes · code spans · fenced blocks with
  info strings · --- rules · [text](url) · hard line breaks. Fences are OPAQUE nodes —
  info string and body byte-identical through parse, rendered as preformatted text,
  never interpreted: the hook the payload convention and the `chart` block hang on,
  with engine/atchart.mjs staying the only reader of a chart fence.
- **Links sanitize by scheme allow-list at render** (http, https, mailto, #fragment);
  `javascript:` and `data:` (and vbscript:, file:, case/space variants) have explicit
  refusal tests and render as the literal source text — inert AND nothing lost.
  **Unknown syntax degrades to text, never throws**: unclosed fence (stays literal —
  typing a fence in live preview never swallows the rest of the note), ragged table,
  stray brackets, 40-deep quotes, and a nasty-string corpus all pass with zero throws.
  **Round-trip is not claimed** — renderer, not formatter; the source stays canonical.
- **`applyEdit(src, sel, op)` is the toolbar's seam** (and the palette's, via
  `{type:"insert"}`): a pure string+selection transform. Wrapping ops toggle rather
  than nest; line ops apply across every selected line and toggle off only when all
  carry the marker; ordered renumbers 1..n and converts bullets. **The caret contract
  is tested per op** — empty selection, multi-line selection, toggle-off — with exact
  selection assertions and no DOM anywhere in the tests.
- Self-contained per the dispatch: no host wiring, no .atchart.md, no UI. Inline-
  readiness verified two ways — the family transform loads in a DOM-free vm, and a
  scratch page with the module inlined runs from `file://` with the network disabled,
  zero console errors, safe-anchor/refusal/fence probes green. engine/README.md
  updated. Suite 227/227 (15 new tests). Update Log 260811.5.

## 2026-08-11 — Triadetudes: the clock row — Harmony becomes a strip (Daniel's dispatch; family pattern)

- **The page sorts by category.** Harmony leaves the config row and becomes a
  collapsible full-width strip immediately above Shape & Motion; **Metronome and
  Transport sit side by side** — the two cards that both carry a BPM and a time
  signature, now adjacent so the "who owns the clock" paragraph has adjacency doing
  part of its work. Band order, deliberate, reads as a pipeline: **clock row →
  Harmony (what chords) → Shape & Motion (what shapes) → timeline (where am I) →
  boards.** This is the family clock-row pattern (notes/specs/at-etudes-app-family.md);
  no per-app deviation introduced.
- **Harmony gains from the width**: Build up groups key · scale · mode · progression ·
  start on · extension across one row; Break down gives the changes field REAL width —
  a seven-chord progression fits with all its editor chips and the `+` beside it,
  nothing wrapping into a cramped third-of-a-row column. The strip keeps the collapse
  control and the established summary line (`C major · Build up · Cycling 4ths ·
  from I`), still updating while folded (five panels total — Harmony's control moved
  with it).
- **Checked at 390 px first**: the clock row stacks Metronome then Transport (same
  heights as before, collapse available), Harmony stacks beneath — no taller than the
  old card column. At 1280 the two clock cards split the row fully; nothing looks
  empty.
- Layout only: DOM position + CSS reuse (the strip primitive, third instance). No
  state moved; `rawCfg()` round-trips byte-identical; no `v:` bump; one-commit revert.
  Suite 212/212; 16 interactive Playwright checks (band order, both harmony modes,
  chip editor affordances, folded summaries following); zero console/page errors;
  inspected at both widths. Update Log 260811.4.

## 2026-08-11 — Triadetudes: the Practice Log saves rawCfg() — the fact, one fix, one flag (Daniel's dispatch)

- **The fact, established before touching anything**: all four Log paths use the
  confirmed-correct serialiser. Save stores `rawCfg()` (`currentEntry().cfg`); Restore
  is `applyRaw(en.cfg)`; Export embeds the stored cfg verbatim in each entry's fenced
  JSON; Import's `looksLikeCfg` gate checks the rawCfg shape. **No entry saved since
  v0.7.3 lost the figure or mode; restore was always exact; exported .md files on disk
  are complete.** The item's worst case is disconfirmed.
- **One disagreement found, exactly as the dispatch predicted**: the **Copy
  configuration** button copied `cfgObj()` — the display JSON — which the app's own
  import gate refuses ("not a Triadetudes config"). Copy → import could never round-trip.
  Fixed: copy emits `rawCfg()`, the importable étude; the "Full configuration (JSON)"
  disclosure still shows the readable display form.
- **The corroborating tell was real but display-frozen**: `en.summary` is
  `summaryText()` at save time, so entries saved v0.7.3–260811.2 with a tones figure
  carry a stored row text whose arp clause misdescribes their own complete cfg. Detect,
  don't rewrite: the history row now derives a flag from the entry's own cfg — "⚠ saved
  before summaries named figures — this étude carries (-1,+2)[1]… (tones); Restore
  rebuilds it exactly." Pre-v0.7.3 entries (no motion keys) restore figureless via
  applyRaw's named defaults and are NOT flagged — flagging them would be a false alarm.
- **The round-trip that matters, asserted with the values that went missing from the
  display**: a tones figure + non-default mode through save→restore (byte-identical
  rawCfg, figure on the boards) and through export→import (cfg deep-equal through
  logToMarkdown→parseLogExport→merge, headless and in the DOM). A default-config test
  proves nothing here and was not the test.
- **Housekeeping folded in**: `render-dependencies.md` moved from `notes/specs/` to
  **`docs/`** (Daniel's call — it describes code; in docs/ it appears in diffs), gaining
  the per-path serialiser table above and the probe lesson (length-based fingerprints
  false-alarmed six times; content-based separated real gaps from honest no-ops — start
  content-based). Canonical verification doctrine lives in CLAUDE.md, which is
  governance-owned — the lesson is recorded beside the audit table it belongs to.
- Verified per doctrine: suite 212/212 (new export→import figure round-trip); 13
  Playwright checks incl. both round-trips, the copy/import agreement, the flag firing
  on the stale row and staying silent on the pre-grammar row; flag inspected at
  1280/390 px. `rawCfg()` unchanged, no `v:` bump. Update Log 260811.3.

## 2026-08-11 — Triadetudes: the render-dependency audit — the fixes (Daniel's dispatch)

- The three gaps the table found, closed — all one family (the config **display**
  predates a value it should show; `rawCfg()` storage was correct throughout):
  1. **`changeBpm` → `renderCfg()`** (was: sliders + collapsed lines only). A BPM drag
     now updates the cfg JSON and the notebook summary line as it moves.
  2. **`cfgObj().motion` gains `figure` (= `motionSource()`) and `mode`** — the "Full
     configuration (JSON)" had been silent about a tones figure since v0.7.3.
  3. **`summaryText()`'s arp clause shows `motionSource()`** — under a tones figure the
     notebook summary read a stale shape pattern; it now reads the figure itself
     (shape mode still shows the slot letters through the same clause).
- No behaviour beyond the missing refreshes: engine suite 211/211 untouched; `rawCfg()`
  round-trips byte-identical with no new keys and no `v:` bump (display config ≠
  storage, asserted); 9 Playwright checks confirm each gap closed, folded and unfolded;
  the changed surface (the notebook summary line) inspected at 1280/390 px. Zero
  console/page errors; zero document-level key listeners, still. Update Log 260811.2.

## 2026-08-11 — Triadetudes: the render-dependency audit — the table (Daniel's dispatch)

- **The deliverable is the table**: `notes/specs/render-dependencies.md` — one row per
  control across all five panels (Metronome, Harmony, Transport, Shape & Motion,
  timeline, plus notebook restore), one column per view (fretboard · score · keyboard ·
  timeline · collapsed summary line · describe() readout · cfg/rawCfg). Every cell
  verified live: each control changed **with all panels folded**, every dependent view
  fingerprinted before/after (content-based — innerHTML and per-chip classNames, after
  length-based fingerprints produced false alarms). The table records the render
  chains a ✓ rides on, and every deliberate non-dependency with its reason — a
  documented "no, this correctly does not refresh that" being as load-bearing as a fix.
  (The table lives in `notes/` per repo policy — the vault layer is untracked — so this
  entry is its record in git.)
- **Result: the collapsed summary lines shipped correct.** All of 260810.14's lines
  follow their controls while folded — BPM, meter, split, key, scale, mode, progression,
  set, figure, placement, playback, position — because they ride `renderCfg()`/
  `renderActive()`, which every mutating handler already reaches. The known instances
  from the dispatch (splitSel/changeMeter above the neck; changeBpm's collapsed line)
  are confirmed fixed.
- **Three gaps found, one family — the config DISPLAY predates a value it should show**
  (the storage, `rawCfg()`, was correct throughout): (1) `changeBpm` skips
  `renderCfg()`, so the cfg JSON + notebook summary sit stale after a BPM drag;
  (2) `cfgObj().motion` carries only the shape pattern — no figure, no mode — silent
  about a tones figure since v0.7.3; (3) `summaryText()`'s "arp" clause shows the stale
  shape pattern under a tones figure. Fixes follow as their own commit, per the
  dispatch.
- Deliberate non-dependencies worth naming: audio-only values (subdivision, voice,
  accents, vol, count-in, mute) touch no board; bar split re-renders score + timeline
  but not the fretboard/keyboard (marks encode order and role, not beats); progression
  edits leave the fretboard fingerprint identical when the current chord survives (the
  board draws `SEQ[st.cur]`, refreshed but honestly unchanged); a set change can leave
  score/keyboard identical (same pitches, different strings); refusal branches leave
  the figure state untouched by convention. Update Log 260811.1.

## 2026-08-10 — Triadetudes: expand and collapse on every panel (Daniel's dispatch)

- **Every card and strip folds** — Metronome, Harmony, Transport, Shape & Motion, and
  the timeline — via a chevron in the same top-right position on each. **Collapsed
  shows the header plus a one-line summary of current settings** (the item's law: a
  collapsed panel showing only its title is worse than no panel), and the line derives
  live from state — change BPM while the Metronome is folded and its line follows;
  step the étude and the folded timeline's "4 of 8" follows. Same discipline as
  describe(): the summary is the product.
    - Metronome — `72 BPM · 4/4 · beats · beep · on`
    - Harmony — `C major · Build up · Cycling 4ths · from I` (Break down: `· N changes`)
    - Transport — `72 BPM · 4/4 · 2+2 · metronome on`
    - Shape & Motion — `E-B-G · Pivot first · M-L-H · Grip · Arpeggiated`
    - Timeline — `Timeline · C · 1 of 8 · 2+2`
- **Session-only, on purpose**: state lives in a DOM class, is not persisted, and is
  not in `rawCfg()` — a shared étude opens the way the author's étude sounds, not with
  the recipient's panels folded. Round-trip asserted byte-identical, with no collapse
  key anywhere in the config.
- **390 px first, where collapse earns its keep**: folding all five panels drops the
  fretboard from ~1750 px down the page to ~420 px — the neck arrives almost at the
  top. At 1280 the collapsed grid stays clean (three summary cards in a row, two slim
  strip lines) with no reflow breakage.
- Verified per doctrine: engine suite 211/211 untouched; 16 interactive Playwright
  checks (fold/unfold all panels, live summaries, round-trip, grid integrity), zero
  console/page errors; inspected at 390 and 1280 px. Zero document-level key
  listeners, still. Update Log 260810.14.

## 2026-08-10 — Triadetudes: the chord timeline strip (Daniel's dispatch; spec §10)

- **Bars, not chords — the floating pills are gone.** The position row becomes the
  timeline: a strip in the same primitive as Shape & Motion, immediately above the
  fretboard, divided by real **bar lines** derived from time signature × bar split.
  At 4/4 `2+2` a bar holds two chords; each chord slot's width grows with its beats
  (5/4 `2+3`: the 3-beat slot is visibly wider). The Transport card's most abstract
  setting is now something you see — and the divisions **redraw live** when bar split
  or meter changes (`splitSel`/`changeMeter` now re-render the timeline; previously
  nothing above the neck answered to them).
- **The transport moved, not multiplied**: `⏮ ▶ ⏹ ⏭` left the fretboard header for
  the right end of the strip — they step through changes and the changes are here.
  The fretboard header keeps its identity line and carries no buttons; the score and
  keyboard minis are untouched. Transport card = the clock; timeline = position.
- **Both harmony modes**, chords of the progression in each (Break down: the typed
  changes, never the derived slash triads). Sounding chord AND its bar highlight, in
  time, verified under a running transport. Unparsed input hides the strip — no empty
  chrome above the neck.
- **Overflow: horizontal scroll, not a second row** (judged on screen; a second row
  pushes the neck down). Eight bars fit at 1280 px; a 16-bar progression scrolls with
  the sounding bar kept in view at both ends — the strip scrolls, never the page
  (rect-based arithmetic; `offsetLeft` answers to the wrong parent and was fixed).
- Verified per doctrine: engine suite 211/211 untouched; 27 interactive Playwright
  checks across both modes, meters and splits, zero console/page errors; inspected at
  1280/390 px — at 390 the strip stays one row tall and the fretboard stays in reach.
  Zero document-level key listeners, still. Update Log 260810.13.

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
