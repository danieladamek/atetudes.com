/* approach-reach.test.mjs — THE APPROACH PLACEMENT LAW (260923, night 31 item 2;
 * closing CR-1's gap). An approach is placed relative to its TARGET, may sit
 * outside the window and is drawn there — it is not material — but it must be
 * REACHABLE: within k frets of the window, k the largest step the field's own
 * scale contains, DERIVED (never a literal here either). No reachable position
 * refuses BY NAME as an error VALUE. And every hub caller passes the window.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { field } from "../field.mjs";
import { positionOf, materialIn } from "../position.mjs";
import { diatonicTones, objectOffsets, oneOfEach, orderBy } from "../selection.mjs";
import { SCALE_STEPS } from "../chord.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const reachOf = (scale) => Math.max(...SCALE_STEPS[scale]);   // the law's k, from the scale's own steps — the test never writes 2 or 3

function scene(key, scale, strings, startDegree, nearFret, object = "tetrad") {
  const fld = field({ key, scale });
  const pos = positionOf({ field: fld, anchorString: strings[0], startDegree, nearFret });
  const pool = materialIn(pos, strings, fld);
  const sel = oneOfEach(diatonicTones(fld, 0, objectOffsets(object)), pool, { n: 1, centre: pos.centre }).notes;
  return { fld, strings, pos, sel };
}

test("the reach HOLDS: an approach to a target at the window's low edge lands below the window, within k, and is drawn", () => {
  const sc = scene("Bb", "major", [4, 3, 2, 1], 4, 3);            // the boot: frets 3–7
  const r = orderBy("tones", "(b3)[3]", sc.sel, { fld: sc.fld, strings: sc.strings, pos: sc.pos });
  assert.equal(r.err, null, r.err);
  const ap = r.order.find((n) => n.role === "approach");
  assert.ok(ap, "an approach was placed");
  const k = reachOf("major");
  assert.ok(ap.fret >= sc.pos.fLo - k && ap.fret <= sc.pos.fHi + k, `within the reach: fret ${ap.fret}, window ${sc.pos.fLo}–${sc.pos.fHi}, k ${k}`);
});

test("the reach REFUSES, as an error value naming the target, the distance and the hand — never a throw", () => {
  // MEASURED 260924 on the boot scene (B♭ major, strings 4–1, window frets 3–7): before the law
  // (+9)[R] landed at s1f15, eight frets beyond the window, legally
  const sc = scene("Bb", "major", [4, 3, 2, 1], 4, 3);
  let out;
  assert.doesNotThrow(() => { out = orderBy("tones", "(+9)[R]", sc.sel, { fld: sc.fld, strings: sc.strings, pos: sc.pos }); });
  assert.equal(out.order, null);
  assert.match(out.err, /the approach \+9 to the root sits \d+ frets? beyond the hand/, out.err);
  assert.match(out.err, /the root is at fret \d+, at the window's edge \(frets 3–7\)/, out.err);
  assert.match(out.err, new RegExp(`the reach is ${reachOf("major")}$`), "the reach named is the field's own");
});

test("k IS DERIVED: harmonic minor admits a reach that major refuses — the numbers come from SCALE_STEPS, never from this file", () => {
  assert.ok(reachOf("harm") > reachOf("major"), "the harmonic minor's augmented second is the larger step");
  // the same strings, the same anchor, the same start degree (C major's window is 10–14, C harm's 10–13):
  // an approach that lands (reachOf(harm)) frets below the window's low edge is reachable only under harm
  const maj = scene("C", "major", [4, 3, 2, 1], 0, 5), hrm = scene("C", "harm", [4, 3, 2, 1], 0, 5);
  const fig = `(-${reachOf("harm")})[R]`;
  const askHrm = orderBy("tones", fig, hrm.sel, { fld: hrm.fld, strings: hrm.strings, pos: hrm.pos });
  const askMaj = orderBy("tones", fig, maj.sel, { fld: maj.fld, strings: maj.strings, pos: maj.pos });
  assert.equal(askHrm.err, null, askHrm.err);
  const ap = askHrm.order.find((n) => n.role === "approach");
  assert.ok(ap.fret < hrm.pos.fLo && ap.fret >= hrm.pos.fLo - reachOf("harm"), `below the window, within harm's reach: fret ${ap.fret}, window ${hrm.pos.fLo}–${hrm.pos.fHi}`);
  assert.match(askMaj.err, /beyond the hand/, "major's reach is the smaller step and refuses the same approach");
  assert.match(askMaj.err, new RegExp(`the reach is ${reachOf("major")}$`));
});

test("the window is REQUIRED: a caller that omits it is refused by name — never silently unconstrained", () => {
  const sc = scene("Bb", "major", [4, 3, 2, 1], 4, 3);
  assert.match(orderBy("tones", "(b3)[3]", sc.sel, { fld: sc.fld, strings: sc.strings }).err, /no window/);
});

test("THE FOUR CALLERS pass the window: every orderBy call in hub/modules carries pos (the fitness function that keeps a fifth caller honest)", () => {
  const HUB = join(here, "..", "..", "hub", "modules");
  let calls = 0;
  for (const f of readdirSync(HUB).filter((x) => x.endsWith(".mjs"))) {
    const src = readFileSync(join(HUB, f), "utf8");
    for (const m of src.matchAll(/orderBy\(([^;]*)\)/g)) {
      calls++;
      assert.match(m[1], /\bpos\b/, `${f}: orderBy call without the window — ${m[0].slice(0, 90)}`);
    }
  }
  assert.ok(calls >= 4, `the sweep must actually run: ${calls} call(s)`);
});
