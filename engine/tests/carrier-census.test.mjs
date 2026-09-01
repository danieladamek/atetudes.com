/* carrier-census.test.mjs — every carried module pinned in every published
 * study, from ONE derived census (engine/tests/_carriers.mjs).
 *
 * Successor to door-carrier-drift.test.mjs, which pinned the eight modules the
 * Tetradetudes publish newly carried and stated the gap for the other ten
 * honestly. The gap was real: WHICH studies carry a module was a fact stated
 * by hand in five separate arrays, none of which said "tetradetudes" — so a
 * partial re-inline (edit engine/chord.mjs, republish only Triadetudes) would
 * have drifted the door silently. Now the pairs come from the census: hub
 * doors DERIVED from resolve.mjs's reach-set, pre-hub studies DETECTED from
 * the published bytes. No slug is written here.
 *
 * COVERAGE, stated exactly: the matcher pins every EXPORTED definition
 * (import-split segments, see _carriers.mjs). Four modules carry top-level
 * helpers before their first export (markdown, motion, palette,
 * upper-structure); those preambles are additionally pinned WHOLE-MODULE for
 * the pre-hub carriers by notepad.test.mjs and upper-structure.test.mjs. In a
 * door build the import-blanking whitespace makes a whole-module match
 * brittle, so a door's preamble-only drift (an engine preamble edited without
 * touching any export, door not rebuilt) is the one residual this pin does
 * not see — named here rather than papered over.
 *
 * Proven to bite on the partial re-inline (2026-08-19): chord.mjs edited, the
 * SAME edit applied to the two pre-hub carriers' inlined copies (a simulated
 * re-inline), tetradetudes left alone — exactly one pair failed:
 * tetradetudes/chord. Reverted; all five studies byte-identical.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CENSUS, STUDY_SLUGS, ENGINE_MODULES, carriersOf, defSegmentsOf, studyPath,
  OWED_DRIFT } from "./_carriers.mjs";

test("the census is COMPLETE: every directory under static/studies/ is in it, with a real study file", () => {
  // the eleventh-instance stopper: a new study nobody wired in must fail the
  // suite, not pass quietly. The census scans the directory, so membership is
  // constructive — this asserts the scan saw what the filesystem holds and
  // that every entry is a real, non-empty published file.
  assert.ok(STUDY_SLUGS.length >= 5, `only ${STUDY_SLUGS.length} studies found — the scan is broken`);
  for (const slug of STUDY_SLUGS) {
    const entry = CENSUS.get(slug);
    assert.ok(entry, `${slug} is published but absent from the census`);
    assert.notEqual(entry.source, "missing",
      `${slug}/ exists with no study.html — a half-added study must not pass quietly`);
    assert.ok(readFileSync(studyPath(slug), "utf8").length > 1000, `${slug}/study.html is implausibly small`);
  }
  for (const slug of CENSUS.keys())
    assert.ok(STUDY_SLUGS.includes(slug), `census names ${slug}, which is not a published study`);
});

test("the census is not vacuous, and hub doors are DERIVED, never detected", () => {
  for (const [slug, v] of CENSUS) {
    if (v.source === "derived")
      assert.ok(v.modules.size >= 1, `door ${slug} derived an empty reach-set`);
  }
  // at least one study of each kind exists today; a future all-door site may
  // retire the detected half, and this line is where that shows up
  assert.ok([...CENSUS.values()].some((v) => v.source === "derived"), "no derived (door) study in the census");
  assert.ok([...CENSUS.values()].some((v) => v.source === "detected" && v.modules.size > 0),
    "no detected carrier study in the census");
});

/* THE PIN: for every (study, module) pair the census names, every exported
 * definition's segments must appear verbatim in the published file. */
for (const mod of ENGINE_MODULES) {
  const carriers = carriersOf(mod);
  if (!carriers.length) continue;
  test(`no drift: engine/${mod}.mjs is carried verbatim by ${carriers.join(", ")}`, () => {
    const segs = defSegmentsOf(mod);
    assert.ok(segs.length > 0, `${mod}.mjs exports nothing to pin against`);
    /* PIN REWRITTEN 260911 (item 2, rule 7 — the reason is in OWED_DRIFT):
     * an OWED module's drift is recorded, dated and bounded, never silent —
     * and the exemption SELF-EXPIRES: once the studies are re-inlined and
     * nothing is missing any more, this test goes red until the ledger
     * entry is removed. Every module outside the ledger pins verbatim,
     * exactly as before. */
    /* THE SHARP FORM, LANDED 260915 (drafted 260913, reverted the same
     * night because the published tetradetudes was itself a derived build
     * carrying the marker debt; the beta republish cleared it): an OWED
     * exemption excuses only HAND-AUTHORED carriers — a derived door's
     * publish is one command, so its drift is never owed, always red. */
    const owed = OWED_DRIFT.get(mod);
    let missing = 0;
    for (const slug of carriers) {
      const html = readFileSync(studyPath(slug), "utf8");
      const derived = CENSUS.get(slug).source === "derived";
      for (const def of segs)
        for (const seg of def) {
          if (html.includes(seg)) continue;
          missing++;
          if (!owed || derived)
            assert.fail(
              `${slug}/study.html has DRIFTED from engine/${mod}.mjs — ` +
              (derived
                ? "rebuild the door and re-publish. "
                : "re-inline the module into the hand-authored study. ") +
              (owed && derived ? "(OWED excuses only hand-authored carriers — the sharp form.) " : "") +
              `Missing:\n${seg.slice(0, 90)}…`);
        }
    }
    if (owed)
      assert.ok(missing > 0,
        `engine/${mod}.mjs is carried verbatim again — the owed drift is ` +
        `reconciled; REMOVE its OWED_DRIFT entry (${owed})`);
  });
}
