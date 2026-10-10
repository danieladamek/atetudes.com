/* figure-groups.test.mjs — the simultaneous group `< >` (ruled by Daniel 2026-10-09,
 * notes/specs/motion-grammar.md §11) and the doubled "figure: figure —" prefix.
 *
 * A group is ONE step of the even subdivision; its notes share one onset, have no
 * internal order and no roll — `<r357>` is the strum. Under Line a group need not be
 * grippable (sounded, not gripped). No approaches into a group yet: refused by name.
 * Every figure without `<` reads exactly as it did (the corpus red-run in the run note;
 * here the shape: `steps` is the order, one note per step).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { field } from "../field.mjs";
import { positionOf, materialIn } from "../position.mjs";
import { diatonicTones, objectOffsets, oneOfEach, everyOccurrence, scaleTake, orderBy, bracketOf, groupClause, gripFit } from "../selection.mjs";
import { walkSchedule } from "../progression.mjs";

function scene({ key = "Bb", strings = [4, 3, 2, 1], deg = 0, n = 1, take = "one", nearFret = 3, anchor = null, startDegree = 4 } = {}) {
  const fld = field({ key, scale: "major" });
  const pos = positionOf({ field: fld, anchorString: anchor ?? strings[0], startDegree, nearFret, strings });
  const pool = materialIn(pos, strings, fld);
  /* the tones fit to the slots first, as every board does (gripFit) — CORRECTED 261010: the one-string scene leaned on
   * an uncovered window (the 7th absent from frets 6–15) to place four tones in three slots; the window now reaches
   * down to it, and the scene must do what the app does */
  const tones = gripFit(diatonicTones(fld, deg, objectOffsets("tetrad")), strings.length * n).tones;
  const sel = take === "scale" ? scaleTake(pool).notes
    : take === "every" ? everyOccurrence(tones, pool, { n: 3 }).notes
    : oneOfEach(tones, pool, { n, centre: pos.centre }).notes;
  return { fld, pos, strings, sel, ctx: { fld, strings, pos } };
}
const onsets = (events) => events.map((e) => [e.midi, +e.at.toFixed(9)]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);

test("a group is ONE step: r357<53><53> is 6 steps, the group's notes share an onset, steps = ungrouped tokens + groups", () => {
  const { sel, ctx } = scene();
  const r = orderBy("tones", "r357<53><53>", sel, ctx);
  assert.equal(r.err, null, r.err);
  assert.equal(r.steps.length, 6, "4 ungrouped tokens + 2 groups");
  assert.deepEqual(r.steps.map((s) => s.length), [1, 1, 1, 1, 2, 2]);
  assert.equal(r.order.length, 8, "the flat order carries every sounded note");
  assert.deepEqual(r.steps[4].map((x) => x.role).sort(), ["3", "5"]);
  const { events, span } = walkSchedule(sel, r.steps, 4, 60);
  assert.equal(events.length, 8);
  const at = (k) => (k * span) / 6;
  for (const [k, st] of r.steps.entries())
    for (const nt of st) assert.ok(events.some((e) => e.midi === nt.midi && Math.abs(e.at - at(k)) < 1e-9), `step ${k + 1}'s ${nt.role} sounds at ${at(k)}`);
  const g5 = events.filter((e) => Math.abs(e.at - at(4)) < 1e-9);
  assert.equal(g5.length, 2, "both notes of the fifth step sound at the same onset");
});

test("no internal order: <53> and <35> produce identical events", () => {
  const { sel, ctx } = scene();
  const a = orderBy("tones", "r<53>", sel, ctx), b = orderBy("tones", "r<35>", sel, ctx);
  assert.equal(a.err, null); assert.equal(b.err, null);
  assert.deepEqual(onsets(walkSchedule(sel, a.steps, 4, 72).events), onsets(walkSchedule(sel, b.steps, 4, 72).events));
});

test("<r357> IS the strum — the same pitch set at the same onsets, under Grip and Line, and the clause says so", () => {
  for (const sc of [scene({ n: 1 }), scene({ n: 3, strings: [3, 2] , anchor: 3, startDegree: 0, nearFret: 5 }), scene({ n: 3, strings: [1], anchor: 1, startDegree: 0, nearFret: 5 })]) {
    const { sel, ctx } = sc;
    if (!sel || sel.length !== 4) continue;
    const r = orderBy("tones", "<r357>", sel, ctx);
    assert.equal(r.err, null, r.err);
    assert.equal(r.steps.length, 1);
    const strum = walkSchedule(sel, null, 4, 72).events;
    const grp = walkSchedule(sel, r.steps, 4, 72).events;
    assert.deepEqual(onsets(grp), onsets(strum), "the group sounds what strum sounds");
    assert.match(groupClause(r, sel), /all four at once — the strum/);
  }
  let ran = 0;
  for (const sc of [scene({ n: 1 }), scene({ n: 3, strings: [3, 2], anchor: 3, startDegree: 0, nearFret: 5 })]) if (sc.sel && sc.sel.length === 4) ran++;
  assert.equal(ran, 2, "the Grip and two-string Line scenes both placed all four (the loop above was not vacuous)");
});

test("under Line a group need not be grippable — two notes of one group on one string sound, and the clause says they cannot be fingered together", () => {
  const { sel, ctx } = scene({ strings: [1], anchor: 1, startDegree: 0, nearFret: 5, n: 3 });
  const roles = sel.map((x) => x.role);
  const [a, b] = roles.slice(0, 2);
  const r = orderBy("tones", `<${a}${b}>`, sel, ctx);
  assert.equal(r.err, null, r.err);
  assert.equal(r.steps[0][0].string, r.steps[0][1].string, "both on string 1");
  assert.match(groupClause(r, sel), /string 1 holds two notes of one group — sounded, not fingered together/);
  // Grip never produces it (one note per string): the clause stays silent about strings there
  const g = scene();
  assert.doesNotMatch(groupClause(orderBy("tones", "<35>", g.sel, g.ctx), g.sel), /fingered/);
});

test("both alphabets: pattern 6<43>2 is a double-stop by string; the scale box addresses degrees with the ordinal law (<55> = two occurrences)", () => {
  const six = scene({ strings: [6, 5, 4, 3, 2, 1], anchor: 6, startDegree: 0, nearFret: 5 });
  const p = orderBy("pattern", "6<43>2", six.sel, six.ctx);
  assert.equal(p.err, null, p.err);
  assert.deepEqual(p.steps.map((s) => s.map((x) => x.string)), [[6], [4, 3], [2]]);
  const box = scene({ strings: [6, 5, 4, 3, 2, 1], anchor: 6, startDegree: 0, nearFret: 5, take: "scale" });
  const s = orderBy("tones", "<55>", box.sel, box.ctx);
  assert.equal(s.err, null, s.err);
  assert.equal(s.steps[0].length, 2);
  assert.notEqual(s.steps[0][0], s.steps[0][1], "two different occurrences of the 5th");
  assert.ok(s.steps[0][0].midi < s.steps[0][1].midi, "low, then the next");
});

test("refusals by name — empty, nested, a stray close, the same note twice, a group with an approach; an open group is incomplete, not invalid", () => {
  const { sel, ctx } = scene();
  assert.match(orderBy("tones", "r<>", sel, ctx).err, /empty group/);
  assert.match(orderBy("tones", "<<53>>", sel, ctx).err, /a group cannot hold a group/);
  assert.match(orderBy("tones", "r35>", sel, ctx).err, /closes no group/);
  assert.match(orderBy("tones", "<33>", sel, ctx).err, /the same note twice/);
  assert.match(orderBy("pattern", "<44>", sel, ctx).err, /the same note twice/, "string 4 holds one note under Grip — the ordinal wraps onto itself");
  for (const f of ["(-1)<35>", "<35>(-1)[3]", "[3]<35>"]) {
    const e = orderBy("tones", f, sel, ctx).err;
    assert.match(e, /approach/, f); assert.match(e, /group/, f);
  }
  const open = orderBy("tones", "r357<5", sel, ctx);
  assert.equal(open.err, null, "mid-typing never goes red");
  assert.equal(open.order, null);
  assert.match(open.open, /the group is open/);
  assert.match(orderBy("tones", "r3Q<5", sel, ctx).err, /"Q"/, "junk before an open group is still junk");
  // the address mismatch still reads first
  assert.match(orderBy("pattern", "<r3>", sel, ctx).err, /reads as a TONES figure/);
});

test("THE DOUBLED PREFIX: no orderBy error starts with 'figure' — the page adds 'figure: ' once", () => {
  const { sel, ctx } = scene();
  const cases = ["(-1)[", "[3", "(-1", "()[3]", "(x)[3]", "[3]]", "(-1)[3", "(b3)[b3]", "(-1)[9]", "R,Q", "1,2", "<<3>>", "r<>", "(-1)<35>"];
  let errs = 0;
  for (const f of cases) {
    const e = orderBy("tones", f, sel, ctx).err;
    if (!e) continue;
    errs++;
    assert.doesNotMatch(e, /^figure/i, `${f} → ${e}`);
  }
  assert.ok(errs >= 10, `the probe reached the error paths (${errs} errors)`);
});

test("every figure without < keeps its shape: steps is the order, one note per step; the bracket is unchanged", () => {
  const { sel, ctx } = scene();
  for (const f of ["R-3-5-7", "7,5,3,R", "(b3)[3]", "(-s)[3]-[7]"]) {
    const r = orderBy("tones", f, sel, ctx);
    assert.equal(r.err, null, `${f}: ${r.err}`);
    assert.deepEqual(r.steps, r.order.map((x) => [x]));
    assert.deepEqual(bracketOf(r.steps), bracketOf(r.order));
  }
  // a group's step is written <k> on every string it touches (Daniel, 261009: {1,<2>,3})
  const g = orderBy("tones", "r<53>", sel, ctx);
  const br = bracketOf(g.steps);
  const s5 = g.steps[1].map((x) => x.string);
  for (const s of s5) assert.deepEqual(br[s], ["<2>"]);
  // two notes of one group on ONE string: the group appears once, not twice
  const one = scene({ strings: [1], anchor: 1, startDegree: 0, nearFret: 5, n: 3 });
  const [a, b] = one.sel.map((x) => x.role);
  const o = orderBy("tones", `r<${a}${b}>r`, one.sel, one.ctx);
  assert.equal(o.err, null, o.err);
  assert.equal("{" + bracketOf(o.steps)[1].join(",") + "}", "{1,<2>,3}");
});
