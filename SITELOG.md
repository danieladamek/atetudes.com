# SITELOG — atetudes.com

Newest first. Every change to the site is recorded here: date, what changed, why, and for
ingests the source vault edition (per the Site Charter, `CLAUDE.md`).

---

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
