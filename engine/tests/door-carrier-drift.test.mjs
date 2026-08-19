/* door-carrier-drift.test.mjs — the anti-drift pins for Tetradetudes' door.
 *
 * Publishing static/studies/tetradetudes/study.html byte-pins EIGHTEEN engine
 * modules into it (§4.2.4). EIGHT had never been carried by any study before, so
 * they had NO anti-drift pin at all: a change to engine/ would drift the
 * published copy silently, and a carrier with no pin is worse than an unpublished
 * door — the module looks protected and is not. These are those eight, following
 * metronome.test.mjs's shape.
 *
 * PER-EXPORT, not whole-module. The door build blanks import lines with irregular
 * whitespace, so a contiguous whole-module match is brittle at that seam; each
 * EXPORTED definition, by contrast, is a clean contiguous body that inlines
 * verbatim (the resolver strips only the leading `export ` keyword). And all
 * eight modules declare ZERO top-level helpers before their first export
 * (asserted below), so nothing but the docstring and the import block sits
 * outside an export chunk — the exported definitions cover every line of logic,
 * inter-export helpers included (they fall inside the preceding chunk).
 *
 * THE TEN Tetradetudes ALSO carries — atchart, chord, markdown, metronome,
 * motion, note-events, notepad-surface, notepad, palette, structures — already
 * have pins against their existing carriers, so a change to any of them cannot go
 * FULLY silent: the other carrier's pin fires and forces a rebuild. Adding
 * Tetradetudes to those pins would sharpen attribution but is not the gap this
 * item closes; it is flagged in the item report rather than folded in here.
 *
 * To PROVE a pin bites: edit any exported definition in one of these modules
 * WITHOUT rebuilding + republishing the door, and its test fails — the study
 * still holds the old body. (Demonstrated once during 260818.23, then reverted.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const NEWLY_CARRIED = ["drill", "figure", "isolation", "tetrad-sequence",
  "tetrad-voicings", "transport", "voice-identity", "voices"];

const STUDY = readFileSync(
  new URL("../../static/studies/tetradetudes/study.html", import.meta.url), "utf8");

for (const mod of NEWLY_CARRIED) {
  test(`no drift: the published Tetradetudes carries engine/${mod}.mjs verbatim`, () => {
    const src = readFileSync(new URL(`../${mod}.mjs`, import.meta.url), "utf8");

    // the per-export shape is only complete because nothing of substance sits
    // before the first export — assert that precondition rather than assume it
    const firstExport = src.search(/^export /m);
    const preamble = src.slice(0, firstExport);
    assert.equal(preamble.search(/^(function|const|let|class) /m), -1,
      `${mod}.mjs declares a top-level helper before its first export — the ` +
      `per-export pin would miss it; extend the pin or move the helper`);

    const defs = src.split(/^export /m).slice(1).map((s) => s.trimEnd());
    assert.ok(defs.length > 0, `${mod}.mjs exports nothing to pin against`);
    for (const def of defs)
      assert.ok(STUDY.includes(def),
        `static/studies/tetradetudes/study.html has DRIFTED from engine/${mod}.mjs — ` +
        `rebuild the door and re-publish. Missing definition:\n${def.slice(0, 90)}…`);
  });
}
