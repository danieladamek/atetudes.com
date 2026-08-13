---
project: AtEtudes
title: At-Etudes — Charter & Conventions
aliases: ["At-Etudes Charter"]
author: Claude (🪜 CoWork Scaffolding)
date: 2026-08-05
type: charter
status: active
tags: [Etudes, charter]
---

# 3 · Charter & Conventions

## Purpose

Extend the programmatic music-chart framework: new volumes, voicing systems, keys, and chart types, all in the ratified house style. The project's promise is that **wrong notes cannot reach the page** — content is derived, asserted, and inspected, never hand-placed.

## Roles

- **Daniel** — musical direction: what to build next, pedagogical ordering, ratifies spec amendments, plays the results.
- **Claude (🎵 At-Etudes)** — builds generators and publications within the [[design-language-and-engine-spec|Design Language & Engine Spec]]; proposes extensions; maintains canon.

## Contracts

1. **Source of truth = scripts.** Publications are rebuilds (`section scripts → assembly script`), never hand edits. A style change is applied at generator level and re-rendered everywhere.
2. **Verification before rendering.** Every generator asserts: ascending stacks, chord-tone membership, exact voice-movement counts, scale-window pitch-class sets. Derived data printed for human review. PNG render + visual inspection before any delivery.
3. **The Spec governs the visual language.** Color = function vs. current root (never absolute pitch); the degree palette, shape grammar, and page grammar change only by approved amendment to doc 4 (logged in the Update Log). **The palette is reserved** (Spec golden rule 8, ratified 2026-08-09): degree colors never encode status, selection, error, or emphasis, in either craft. In the interactive studies, emphasis is weight and neutral ink; alarm states use a hue outside the palette. Adopted forward-looking — non-conforming material predating the rule is tracked as backlog items, not grandfathered.
4. **Advisory gate** on structure and canon: propose → approval → apply → log.

## Web application contracts (ratified 2026-08-08)

The site's interactive studies operate under the Contracts above, plus:

5. **The single-file promise.** Every interactive study ships as one self-contained HTML
   file that works offline from a double-click: no runtime network calls, no CDN imports,
   no external assets. Studies are developed as ES modules; CI inlines them into one
   published `study.html` per app, with shared code duplicated into each file by design.
   Every proposed dependency must pass the inline test; CI loads the built file from
   `file://` with network disabled and asserts zero failed requests, zero console errors.
   (Full text: `notes/specs/triadetudes-roadmap.md` §5; adopted 2026-08-08.)
6. **Copyright posture.** At-Etudes publishes no copyrighted musical works. Substitute
   Teacher ships with an empty library; example charts, if any, are original or public
   domain. Charts live in the user's browser storage and their own files; nothing is
   transmitted. **No server-side chart library, chart-sharing feature, account system, or
   community collection will be built** — the moment charts move between users through
   the site, the architectural answer to copyright stops being an answer. Ratified
   knowingly: this permanently forecloses those features.
7. **The authored/user-input boundary (golden rule 1, site form).** Golden rule 1 governs
   *authored* content — anything At-Etudes ships. **User-supplied input at runtime is
   data, not code**, and is exempt: a chart the user types or imports is theirs, and the
   site never asserts it is correct — only that everything *derived* from it is. All
   voicings, substitutions, spellings, and note events computed from user input pass the
   same assertion suite as generated content, and no derived musical data is ever
   stored — it is recomputed from the source every time.
8. **The chart interchange format is law.** `.atchart.md` is specified in
   `docs/atchart-format.md` (v1 ratified 2026-08-08; **v1.1 ratified 2026-08-10** — app
   namespaces, unknown-frontmatter preservation, and the handoff rule). The version field
   only moves forward; parse → serialize → parse identity is CI-enforced; the format governs
   both crafts — Python generators may emit it, the apps read and write it. **The file is
   the only supported handoff channel between applications** (format §5); browser storage is
   a per-app cache and never a transport.

## Project conventions

- First tag: `Etudes`. Standard vault frontmatter on every note (Standard §6).
- Publication filenames: `Title_In_Snake_Case.pdf`, matching exactly what the generator writes — filename drift between script and disk is a bug.
- Python: `reportlab`, `pypdf`, `verovio`, `cairosvg`, `pdf2image`, `Pillow` (pip; `--break-system-packages` on Debian-family).
- One string set per etude; register moves are musical choices, not optimization results (tested and settled — Spec §3.2).
