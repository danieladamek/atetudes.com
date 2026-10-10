/* window-reach.test.mjs — Daniel, 261010: I–vi–ii–V in B♭, string 2 only, Line. Cm7 said "this selection carries no
 * 3rd" and F7 "no 7th": the window from F (fret 6) widened only upward and stopped at 15, so E♭ never entered it.
 * Ruled: the window reaches down when the neck runs out (position.test.mjs pins the window); and when the window IS why
 * a role is absent, the figure names the cause and the way through, as droppedRoleSentence does for placement drops. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { field } from "../field.mjs";
import { positionOf, materialIn } from "../position.mjs";
import { oneOfEach, orderBy, gripFit, materialFor, capOf } from "../selection.mjs";
import { progressionOf, chordAt } from "../progression.mjs";

const fld = field({ key: "Bb", scale: "major" });
const strings = [2];

function bar(prog, i, pos) {
  const cur = chordAt(prog, i, fld, "tetrad", [1, 3, 5, 7]);
  const pool = materialIn(pos, strings, fld);
  const fit = gripFit(cur.tones, strings.length * capOf(3));
  const r = oneOfEach(fit.tones, materialFor(cur.tones, pool, fld, strings, pos), { n: capOf(3), centre: pos.centre });
  return { cur, sel: r.notes || r.partial || [], absent: { dropped: [...fit.dropped, ...(r.dropped || []), ...(r.capped || [])], kept: (r.notes || r.partial || []).map((x) => x.role), strings: 1, notesPer: capOf(3), resolvesAt: r.resolvesAt } };
}

test("Daniel's setup: I–vi–ii–V in B♭, string 2 only, Line — `357` and `<357>` order on every chord", () => {
  const prog = progressionOf({ source: "form", form: "turnaround" }, "Bb", "major");
  const pos = positionOf({ field: fld, anchorString: 2, startDegree: 4, nearFret: 6, strings });
  assert.equal(prog.chords.length, 4);
  for (let i = 0; i < 4; i++) {
    const { cur, sel, absent } = bar(prog, i, pos);
    for (const f of ["357", "<357>"]) {
      const r = orderBy("tones", f, sel, { fld, strings, pos, absent, tones: cur.tones });
      assert.equal(r.err, null, `${cur.symbol} ${f}: ${r.err}`);
      assert.equal(r.order.length, 3);
    }
  }
});

test("a forced uncovered window (a hand-built narrow window): the figure names the cause and the way through, never the bare 'carries no Nth'", () => {
  const prog = progressionOf({ source: "form", form: "turnaround" }, "Bb", "major");
  const narrow = { anchorString: 2, startDeg: 4, frets: [6, 8, 10], fLo: 6, fHi: 10, reachLo: 6, centre: 8, covered: false, uncovered: [3] };
  const { cur, sel, absent } = bar(prog, 2, narrow);           // Cm7: its 3rd is E♭, outside frets 6–10
  assert.equal(cur.symbol, "Cm7");
  const r = orderBy("tones", "357", sel, { fld, strings, pos: narrow, absent, tones: cur.tones });
  assert.equal(r.order, null);
  assert.doesNotMatch(r.err, /^this selection carries no/, `the consequence is not the cause: ${r.err}`);
  assert.match(r.err, /the 3rd \(E[b♭]\) is outside the window/);
  assert.match(r.err, /fret 4/); assert.match(r.err, /string 2/);
  assert.match(r.err, /step the window or add a string/);
  // the same words under a group, and through the approach grammar
  assert.match(orderBy("tones", "<357>", sel, { fld, strings, pos: narrow, absent, tones: cur.tones }).err, /the 3rd \(E[b♭]\) is outside the window/);
  assert.match(orderBy("tones", "(-1)[3]", sel, { fld, strings, pos: narrow, absent, tones: cur.tones }).err, /the 3rd \(E[b♭]\) is outside the window/);
  // a caller that does not hand the chord's tones keeps the old sentence (nothing invented)
  assert.match(orderBy("tones", "357", sel, { fld, strings, pos: narrow, absent }).err, /carries no 3rd/);
});
