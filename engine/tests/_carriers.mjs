/* _carriers.mjs — THE CARRIER CENSUS: which published studies carry which
 * engine modules, stated NOWHERE by hand.
 *
 * The tenth instance of the hand-maintained list this project keeps finding
 * (resolve.mjs's docstring names the pattern) was the carrier fact itself: it
 * was written out in five separate test arrays, a fifth study shipped, and not
 * one of them changed — so the study's eighteen carried modules had no pin and
 * a partial re-inline would have drifted them silently (item 260819.5).
 *
 * The census has two halves, because the apps are built two ways:
 *
 *   HUB DOORS      derived. resolve.mjs is "the one place the fact 'which
 *                  modules does this door reach' exists"; the census calls
 *                  resolveDoor(slug) and takes the engine files from the
 *                  reach-set. Nothing restated.
 *   PRE-HUB APPS   detected. There is no lock to derive from, and a hand list
 *                  here would be the same defect one layer down — so the
 *                  published file is SCANNED for each module's exported
 *                  definitions (and its header banner as corroboration).
 *
 * THE MATCHER, shared by detection and by the drift pin in
 * carrier-census.test.mjs: each exported definition, split at import lines
 * (every inline convention strips or blanks imports — the hand-inlined studies
 * remove the line, the door build blanks it — and notepad.mjs carries one
 * MID-FILE import that sits inside an export chunk), each segment trimmed.
 * Segments of 40+ chars must match verbatim for the PIN; presence (detection)
 * needs the module banner or any 120+ char segment, so a PARTIALLY drifted
 * carrier still reads as carried and the pin fires on the drifted definitions
 * rather than the module quietly leaving the census.
 *
 * Detection cross-validated EXACTLY against the union of the hand lists it
 * replaces (2026-08-19) — six of them, not the five the item counted: the
 * sixth (note-events × triadetudes, in triadetudes-events.test.mjs) turned up
 * only in the final sweep, which is the point. The census's coverage additions
 * are the ten door-carried modules that had no pin at all.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDoor, listDoors } from "../../hub/tools/resolve.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ENGINE = join(here, "..");
const STUDIES = join(here, "..", "..", "static", "studies");

export const ENGINE_MODULES = readdirSync(ENGINE)
  .filter((f) => f.endsWith(".mjs")).map((f) => f.slice(0, -4)).sort();

export const STUDY_SLUGS = readdirSync(STUDIES)
  .filter((d) => { try { return statSync(join(STUDIES, d)).isDirectory(); } catch { return false; } })
  .sort();

export const studyPath = (slug) => join(STUDIES, slug, "study.html");

/** each exported definition of a module, split at import lines and trimmed —
 * the pieces that survive every inline convention verbatim */
export function defSegmentsOf(mod) {
  const src = readFileSync(join(ENGINE, mod + ".mjs"), "utf8");
  const defs = src.split(/^export /m).slice(1).map((s) => s.trimEnd());
  return defs.map((def) =>
    def.split(/^import [^\n]*\n?/m).map((s) => s.trim()).filter((s) => s.length >= 40));
}

const detectCarried = (html, mod) => {
  if (html.includes(`/* ${mod}.mjs`) || html.includes(`${mod}.mjs —`)) return true;
  return defSegmentsOf(mod).flat().some((s) => s.length >= 120 && html.includes(s));
};

/** slug → { source: "derived" | "detected", modules: Set<name> } */
export const CENSUS = new Map();
{
  const doors = listDoors();
  for (const slug of STUDY_SLUGS) {
    if (!existsSync(studyPath(slug))) { CENSUS.set(slug, { source: "missing", modules: new Set() }); continue; }
    if (doors.includes(slug)) {
      const r = await resolveDoor(slug);
      const mods = new Set(r.filesIn
        .filter((f) => f.startsWith("engine/") && f.endsWith(".mjs"))
        .map((f) => f.slice("engine/".length, -".mjs".length)));
      CENSUS.set(slug, { source: "derived", modules: mods });
    } else {
      const html = readFileSync(studyPath(slug), "utf8");
      const mods = new Set(ENGINE_MODULES.filter((m) => detectCarried(html, m)));
      CENSUS.set(slug, { source: "detected", modules: mods });
    }
  }
}

/** every published study carrying `mod`, sorted — THE carrier list */
export const carriersOf = (mod) =>
  [...CENSUS.entries()].filter(([, v]) => v.modules.has(mod)).map(([k]) => k).sort();

/** the PRE-HUB carriers only — for the whole-module (contiguous) pins, which
 * fit hand-inlined studies but not door builds (import-blanking whitespace
 * breaks contiguity there; the per-export census pin covers doors instead) */
export const preHubCarriersOf = (mod) =>
  carriersOf(mod).filter((s) => CENSUS.get(s).source === "detected");
