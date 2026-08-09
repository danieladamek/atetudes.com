# SITELOG — atetudes.com

Newest first. Every change to the site is recorded here: date, what changed, why, and for
ingests the source vault edition (per the Site Charter, `CLAUDE.md`).

---

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
