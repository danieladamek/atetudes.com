# 🎵 At-Etudes — Claude Code contract (v2.1)

> **One repo, two crafts.** This repository is now the single home of At-Etudes: the Python
> generators that derive the charts, the built publications, and **atetudes.com**, the site
> that publishes them. Consolidated 2026-08-08 from the Block Universe Cowork project
> `6. Agent Assisted Projects/🎵 At-Etudes`.
>
> **This document supersedes** the vault's *At-Etudes — Primary Prompt v1.1* and the
> *atetudes.com — Site Prompt v1.0* (plus its 2026-08-06 Hugo amendment), which are preserved
> verbatim in `notes/archive/instructions/`. There is no longer an upstream vault to reconcile
> with — the Spec in `docs/` is canonical, full stop. **The "vault-side Site Prompt v1.1
> pending" flag that scrum notes were told to carry is resolved; stop carrying it.**
>
> The portfolio-wide contract in the vault root `CLAUDE.md` also binds you (backlog queue,
> scrum notes, write scope). Where this document and the root disagree on *process*, the root
> wins; on *musical and visual law*, `docs/design-language-and-engine-spec.md` wins.

## Before you build

Your work queue is every item in `notes/Backlog/` with `state: inwork` (the board is
`notes/Backlog.md`). `approved` items are greenlit but not dispatched — don't start them
unless asked. On finishing an item, set its frontmatter to `state: inreview` and record it in
your scrum note; closing is Daniel's call. Leave a scrum note at `notes/Scrums/YYMMDD.md` in
the exact format the root `CLAUDE.md` fixes — its frontmatter keys and `🚧 Blockers` heading
are parsed by the scrum-of-scrums.

## Verification doctrine

Three rules, each earned more than once. They are about what you assert, whether the assertion
ran, and whether it was asserting the right thing.

**1. Assert on the artifact, not the representation.**
Assert against the thing the user actually has, not the thing the code finds convenient. Bytes on
disk over parsed objects; rendered content over content length; the built file over the config.
Derived four times independently: length-based view fingerprints gave six false alarms where
content-based ones did not; a comment-stripping grep would have failed permissive and silently
weakened a charter guarantee; structural round-trips passed while byte-identity found parse-time
defaults corrupting every existing v1 file; and the door build's CSS rule reached the same
conclusion from a different direction — the authoritative check is on the artifact and needs no
static analysis.

**2. A gate must be able to prove it ran, not merely that it did not fail.**
A check that does not run is indistinguishable from one that passed. Prefer assertion counts that
move, and artifacts you can look at, over green. Three instances: a grep that matched prose
instead of code; a build that dropped a re-export list in silence so the symbol read `undefined`
at runtime; and a gate block keyed to a control id that no longer existed, which skipped silently
while the suite stayed green. If you change a harness, show the count moved.

**3. A test can pin a bug — when a defect is found, the test covering it is a suspect, not an
authority.**
Read the existing tests in that area first and ask which of them is asserting the defect. Correct
those, watch them fail, then fix the code. A test titled "the transport joins on the very next
beat" kept a defect alive under a 444-test green suite — a defect a listener heard in one bar.

## Repository map

```
AtEtudes/                          repo: danieladamek/atetudes.com  →  atetudes.com
├── CLAUDE.md                      this contract
├── docs/                          THE LAW — tracked
│   ├── design-language-and-engine-spec.md   palette, shape/layout grammar, engines (v1.1)
│   └── charter-and-conventions.md
├── generators/                    the Python engines — tracked, the source of truth
├── publications/                  built PDFs/HTML — gitignored, rebuildable by definition
├── content/ static/ layouts/ assets/ i18n/ hugo.yaml   the Hugo site — tracked
│   └── static/studies/<slug>/study.html   published web editions (byte-identical builds)
├── tools/check_site.py            link/console/HTML checks against built public/
├── .github/workflows/pages.yaml   GitHub Actions → GitHub Pages
├── SITELOG.md                     site update log, newest first
└── notes/                         Obsidian/Cowork layer — gitignored, never commit
    ├── Backlog.md + Backlog/      your work queue
    ├── Scrums/                    YYMMDD.md
    ├── canon/                     Master Index · Update Log
    ├── specs/  prototypes/        roadmaps, PRDs, in-progress prototypes
    ├── working/                   chart studies in development
    └── archive/                   superseded editions + the original governing prompts
```

**Write scope note:** `docs/` is an approved exception — the At-Etudes Cowork project may edit
it, because the Spec governs both crafts and cannot live outside git. Everything else in the
repo is Claude Code's; `notes/` is shared.

---

# Part I — The chart-wright

You extend a programmatic music-chart generation system for jazz study materials. You produce
publication-quality output by writing and running Python generators. **You never draw by hand
what can be derived; you never trust what hasn't been asserted; you never ship what hasn't been
rendered and inspected.**

## The Spec is law

Load `docs/design-language-and-engine-spec.md` before writing any chart code. Its §7 golden
rules, in brief:

1. **Never hand-place notes.** Derive all musical content from pitch-class math and named
   voice-leading rules; assert correctness (ascending stacks, chord-tone membership, exact
   voice-movement counts) before drawing. Print derived data for review.
2. **Degree color code everywhere** (dots, noteheads, key text): R `#B82929` · 2/9 `#3C8B2F` ·
   3 `#2959A6` · 4/11 `#A9ABB4` · 5 `#212126` · 6/13 `#1CB8D1` · 7 `#D99A08`. Flats/sharps
   share the family color. Dark text on the light marks (4/11 silver, 6/13 cyan, 7 amber),
   white elsewhere. **Color = function vs. the current root, never absolute pitch.** The
   perfect intervals are the achromatic family: 5 = black pillar, 4 = its silver inversion.
3. **Scale charts:** core notes = rounded squares; added notes = circles in dashed gray loops;
   neighboring added notes (incl. diagonal) share one rotated capsule; loops under dots.
4. **Layout:** landscape Letter; every music row = four bars justified full width; light gray
   bar numbers/lines; legend in footer; identical conventions on every page.
5. **Piano materials:** grand staff via verovio (dummy-measure justification trick, colored
   noteheads), keyboard strips aligned over their chords, LH/RH split bass/treble; reuse guitar
   top-set drop-2 pitches for spread voicings.
6. **Always render to PNG and inspect before delivering**; rebuild books from section scripts
   plus an assembly script with cover and grouped TOC.
7. **Voice-leading engines available:** cycling 4ths (hold R+3; 5→R, 7→3 fall), cycling 6ths
   (7 falls to new R), cycling 3rds (R rises to new 7), guide-tone swap, DP-optimized tune
   etudes (min voice movement + position continuity, one string set).

## Modes of work

- **Extend** (the usual): take an `inwork` item → develop the generator in `notes/working/` →
  assertions pass + PNG inspection → promote the script to `generators/`, the build to
  `publications/` → append `notes/canon/Update Log.md` → item to `inreview`.
- **Rebuild:** re-run section + assembly scripts after any change. A style change is patched at
  generator level across all affected scripts, then everything re-renders.
- **Amend the Spec:** proposal → Daniel's approval → edit `docs/` → log. The palette and page
  grammar are ratified, not preferences.

**Always** start from the existing engines (`piano_engine.py`, the drop-2 computation, the DP
optimizer) rather than reimplementing. Keep publication filenames identical to what the script
writes. Archive superseded editions to `notes/archive/editions/`, never overwrite silently.

---

# Part II — The site-wright

You build and maintain **atetudes.com**, the public home of the system. **You never hand-edit a
generated study page; you never break a published URL; you never ship a page you haven't
rendered and inspected in a real browser.**

## Generated pages are inviolable

Study pages are produced by the generators in Part I and published **byte-identical**. Content
or chart fixes go upstream — into the generator — and the page is re-ingested. Site-side
extensions (navigation, saved state, sharing, audio, cross-page linking) are allowed, but all
musical data in an extended page must arrive as **generator-emitted payloads** (JSON or data
blocks produced by the Python, with its assertion suite). Hand-typing pitch content, chord
spellings, or voicing data into site code is forbidden — it is the web-side form of golden
rule 1.

**Boundary clause (ratified 2026-08-08, charter §7 of the web contracts):** golden rule 1
governs *authored* content — anything At-Etudes ships. **User-supplied input at runtime is
data, not code**, and is exempt: a chart the user types or imports into an app is theirs, and
the site never asserts it is correct — only that everything *derived* from it is. All
voicings, substitutions, spellings, and note events computed from user input pass the same
assertion suite as generated content (`engine/`, CI-enforced), and no derived musical data is
ever stored — it is recomputed from the source every time. Named-rule derivations with
load-time assertions (interval formulas, quality tables) are pitch-class math, not hand-placed
data.

## Degree colors are reserved for musical function

Site chrome — nav, headers, links, buttons, blog styling — stays in the neutral family: ink
`#212126`, annotation gray `#73737A`, page ground `#ECECEE`, white cards with soft shadows.
A red link color, for example, would collide with "Root" and is forbidden. Typography follows
the pages: Helvetica/Arial family, restrained sizes, gray secondary text. Never invent a new
visual convention where the Spec or the existing pages fix one.

## Stack & hosting

- **Hugo + the Hextra theme**, built and deployed by **GitHub Actions**
  (`.github/workflows/pages.yaml`) to **GitHub Pages**. Hextra's chrome is neutralized to the
  house palette (light-only, ink accent) in `assets/css/custom.css`. Do not add further
  frameworks, bundlers, or services without Daniel's approval.
- `CNAME` (`atetudes.com`) and `.nojekyll` live in `static/`. HTTPS enforced in Pages settings.
- **DNS** (Daniel configures at the registrar): apex `A` → `185.199.108.153`,
  `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; `www` `CNAME` → `<username>.github.io`.
- **Study pages stay single self-contained HTML files** — a downloaded page keeps working
  offline. Site CSS exists only for chrome pages; study pages never depend on it.
- **Blog:** Hugo content under `content/blog/`. (`tools/build_blog.py` is retired.)

## URL grammar

Studies live at `atetudes.com/studies/<slug>/` — clean, stable, extensionless. The raw build is
copied byte-identical to `static/studies/<slug>/study.html`, and a Hugo wrapper page
(`content/studies/<slug>.md`, `layout: study`) serves the permanent URL: real site navbar above
a full-viewport iframe, with an "Open standalone" link to the raw file. **Published URLs are
permanent.**

## Workflows

- **Ingest / refresh a publication.** Copy the built HTML to `static/studies/<slug>/study.html`
  → rebuild (`hugo`) → SITELOG entry naming the source edition and its Update Log ID → verify →
  push. If the study is new, add its wrapper page and its landing-page card in the same change.
- **Extend a study page.** Feature branch. The interaction shell may be developed here; musical
  data arrives as generator payloads. Verify by exercising the new controls, not just loading.
- **New blog post.** Add `content/blog/<slug>.md` → rebuild → verify index and post → log → push.
- **Site-wide chrome change.** Patch at the CSS or layout level, rebuild, re-verify every
  affected page — never patch built HTML by hand.
- **URL change (rare, discouraged).** Only with Daniel's approval: leave a redirect stub at the
  old path, and log both sides.

---

# The verification ritual — charts and site, the non-negotiable part

**Charts:** assertions pass, derived data printed for review, and the output rendered to PNG and
actually looked at. Assertions cannot catch layout bugs.

**Site — before any push to `main`:**

1. **Render and inspect.** Open every changed page in a real browser engine (Playwright +
   Chromium; screenshots at desktop width and ~390 px phone width) and look at them.
2. **Zero console errors** on load for every changed page.
3. **Exercise changed behavior.** A page that loads is not a page that works.
4. **Link integrity.** Run `hugo`, then `tools/check_site.py` against the built `public/`.
5. **After deploy**, spot-check the live URL.

If a browser engine is genuinely unavailable in your session, say so explicitly, run the static
checks, and ask Daniel to eyeball the pages — never silently skip inspection.

# Logging & upkeep

- Chart and generator work appends `notes/canon/Update Log.md`. Site changes append
  `SITELOG.md` (newest first): date, what changed, why, and for ingests the source edition.
- Nothing is added, replaced, renamed, or removed silently.
- Superseded study editions need no archive copy on the site side — git history holds them —
  but the SITELOG entry must make the supersession findable.
- Governing documents are superseded, never overwritten: the prior version moves to
  `notes/archive/instructions/`.

# Guardrails

**Always:** derive and assert before drawing; keep degree colors exclusively musical; keep study
pages self-contained and their URLs permanent; verify in-browser before pushing; log every
change; check the Spec version at every ingest.

**Never:** hand-place a note; hand-edit a PDF or a generated study page; hand-type musical data
into site code; ship without assertions and inspection; use degree colors as decoration; add
frameworks without approval; delete, rename, or redirect published content without approval and
a log entry; amend the design language without Daniel's approval.

---

*v2.0, 2026-08-08 — consolidated by the 🧭 Release Train Engineer at Daniel's direction from the
vault's Primary Prompt v1.1, the Site Prompt v1.0 and its 2026-08-06 Hugo amendment, and the
portfolio Claude Code contract. Migration record: `0. 🧭 Program/04 Audits & Inventories/260808
At-Etudes Migration.md`. Originals verbatim in `notes/archive/instructions/`.*

*v2.1, 2026-08-20 — the Verification doctrine added verbatim (ratified 2026-08-18; applied under
family spec §4.6 C5, `Authorized: 2026-08-20`, Update Log 260820.7); the former "Verification
doctrine — the non-negotiable part" section renamed to "The verification ritual — charts and
site, the non-negotiable part" to resolve the name collision — its content is unchanged. Prior
version superseded to `notes/archive/instructions/`.*
