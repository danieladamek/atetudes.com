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
3. **The Spec governs the visual language.** Color = function vs. current root (never absolute pitch); the degree palette, shape grammar, and page grammar change only by approved amendment to doc 4 (logged in the Update Log).
4. **Advisory gate** on structure and canon: propose → approval → apply → log.

## Project conventions

- First tag: `Etudes`. Standard vault frontmatter on every note (Standard §6).
- Publication filenames: `Title_In_Snake_Case.pdf`, matching exactly what the generator writes — filename drift between script and disk is a bug.
- Python: `reportlab`, `pypdf`, `verovio`, `cairosvg`, `pdf2image`, `Pillow` (pip; `--break-system-packages` on Debian-family).
- One string set per etude; register moves are musical choices, not optimization results (tested and settled — Spec §3.2).
