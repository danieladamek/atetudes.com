/* figure-extensions.test.mjs — a tones figure may name 9, 11, 13 BEYOND the chord (Daniel, 261119; supersedes the
 * 260927 "refuse when Tones lacks it" clause). Item: notes/Backlog/Multetudes - a tones figure can only name R 3 5 7.md.
 *
 *   1. bare 9/11/13 the chord does not hold SOUND, from the field, inside the window, in the figure's order; the Tones
 *      field still decides what the chord is (a 9 Tones holds is a chord tone, lit, no message)
 *   2. a plain-ink line says the figure goes beyond the chord — its list DERIVED from the order, spelled by stackRole
 *   3. (the neck's half — greyed, ringed at the placed spot — is the door gate's: hub/tests/door_locks.py)
 *   A. Line only: under Grip a figure reaching past the chord is refused, with Line named as the way through
 *   4. extensions are legal inside < > groups — r,3,5,7,<9,11,13> strums the upper structure; <3,7,13> is rootless
 *
 * Each test is written so a named mutation bites it: restoring the "R357" literal; loosening assertOrder in general (an
 * off-window field note must still throw); the message listing a tone the figure does not name. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { field } from "../field.mjs";
import { positionOf, materialIn, windowLo } from "../position.mjs";
import { oneOfEach, orderBy, gripFit, materialFor, capOf, extensionsOf, extensionSentence, assertOrder, objectOf } from "../selection.mjs";
import { progressionOf, chordAt } from "../progression.mjs";

/* one bar as field-board places it (the chord object's branch, take "one") */
function scene({ key, scale, chart, src, index, strings, startDegree, nearFret, notesPer = 3, tones = [1, 3, 5, 7], gamut = null }) {
  const fld = field({ key, scale });
  const prog = progressionOf(src || { source: "custom", custom: chart }, key, scale);
  if (index === "V") index = prog.chords.findIndex((_, i) => chordAt(prog, i, fld, "triad").degree === 4);   // the diatonic V bar
  const cur = chordAt(prog, index, fld, objectOf(tones), tones);
  const pos = positionOf({ field: fld, anchorString: Math.max(...strings), startDegree, nearFret, strings });
  const pool = materialIn(pos, strings, fld, gamut);
  const fit = gripFit(cur.tones, strings.length * capOf(notesPer));
  const r = oneOfEach(fit.tones, materialFor(cur.tones, pool, fld, strings, pos), { n: capOf(notesPer), centre: pos.centre });
  const sel = r.notes || r.partial || [];
  const absent = { dropped: [...fit.dropped, ...(r.dropped || []), ...(r.capped || [])], kept: sel.map((x) => x.role),
    strings: strings.length, notesPer: capOf(notesPer), resolvesAt: r.resolvesAt };
  const ctx = { fld, strings, pos, absent, tones: cur.tones, chord: cur, gamut };
  return { fld, cur, pos, sel, ctx, fig: (f) => orderBy("tones", f, sel, ctx) };
}

/* REPRO 2 (Daniel, live, 261119): C melodic minor, the chart line, G7 (V, G Mixolydian b6), strings 1–3, frets 2–6 */
const CHART = "CmMaj7 F7 Bm7b5 Ebmaj7#5 Am7b5 Dm7 G7 CmMaj7";
const g7 = (o = {}) => scene({ key: "C", scale: "mel", chart: CHART, index: 6, strings: [3, 2, 1], startDegree: 5, nearFret: 2, ...o });
const at = (n) => `${n.string}/${n.fret}`;

test("repro 2: r,3,5,9,11,13 on G7 — A, C and E♭ sound in the figure's order, each at its one placed spot in the window", () => {
  const s = g7();
  assert.equal(s.cur.symbol, "G7");
  assert.equal(`${windowLo(s.pos)}–${s.pos.fHi}`, "2–6", "the ruling's window, frets 2–6");
  const r = s.fig("r,3,5,9,11,13");
  assert.equal(r.err, null, r.err);
  assert.deepEqual(r.order.map(at), ["1/3", "3/4", "2/3", "3/2", "3/5", "2/4"], "R G s1f3 · 3 B s3f4 · 5 D s2f3 · 9 A s3f2 · 11 C s3f5 · b13 E♭ s2f4");
  assert.deepEqual(r.order.map((n) => n.role), ["R", "3", "5", "extension", "extension", "extension"]);
  assert.deepEqual(r.order.slice(3).map((n) => n.label), ["9", "11", "b13"], "the field supplies the alteration; stackRole spells it");
  for (const n of r.order.slice(3)) assert.ok(!s.sel.includes(n), "an extension is never promoted into the chord's selection");
  assert.equal(extensionSentence(r, s.cur.symbol), "G7 · the figure adds 9, 11, b13 — beyond the chord, taken from the field");
});

test("THE LITERAL IS GONE: no tones figure under a chord is refused for naming 9, 11 or 13 (the 260927 'SCALE box' sentence)", () => {
  const s = g7();
  for (const f of ["9", "11", "13", "r,9", "3,11,7", "13,5"]) {
    const r = s.fig(f);
    assert.equal(r.err, null, `${f}: ${r.err}`);
    assert.doesNotMatch(String(r.err), /SCALE box/);
  }
});

test("repro 1: Amaj9 with Tones R,3,5,7,9 plays r,3,5,7,9,7 — the 9 is a chord tone, lit, and there is NO extension message", () => {
  const s = scene({ key: "A", scale: "major", src: { source: "cycle", cycle: "fourths" }, index: 0, strings: [4, 3, 2, 1], startDegree: 4, nearFret: 3, tones: [1, 3, 5, 7, 9] });
  const r = s.fig("r,3,5,7,9,7");
  assert.equal(r.err, null, r.err);
  assert.deepEqual(r.order.map((n) => n.role), ["R", "3", "5", "7", "9", "7"]);
  assert.ok(r.order.every((n) => s.sel.includes(n)), "every note is the selection's own — the 9 is lit");
  assert.deepEqual(extensionsOf(r), []);
  assert.equal(extensionSentence(r, s.cur.symbol), "");
});

test("per extension (9, 11, 13): Tones holds it → a chord tone, no message; Tones lacks it → an extension, the message names exactly it", () => {
  for (const [tok, deg, label] of [["9", 9, "9"], ["11", 11, "11"], ["13", 13, "b13"]]) {
    /* HELD: the diatonic V of C melodic minor from a cycle — its tones come from Tones (a typed "G7" names its own
     * tones, and a G7 symbol holds no 9: there the 9 is absent by name, so it can only be an extension) */
    const hs = g7({ src: { source: "cycle", cycle: "fourths" }, index: "V", tones: [1, 3, 5, 7, deg] });
    assert.ok(hs.cur.tones.some((t) => String(t.role) === tok), `${tok} held: the chord holds it (${hs.cur.symbol})`);
    const held = hs.fig(`r,3,${tok}`);
    assert.equal(held.err, null, `${tok} held: ${held.err}`);
    assert.equal(held.order[2].role, tok, `${tok} held: a chord tone wears its own role`);
    assert.ok(hs.sel.includes(held.order[2]), `${tok} held: lit — the selection's own note`);
    assert.equal(extensionSentence(held, hs.cur.symbol), "", `${tok} held: no message`);
    const lacked = g7().fig(`r,3,${tok}`);
    assert.equal(lacked.err, null, `${tok} lacked: ${lacked.err}`);
    assert.equal(lacked.order[2].role, "extension");
    assert.deepEqual(extensionsOf(lacked), [label], `${tok} lacked: the message names exactly the extension`);
    assert.equal(extensionSentence(lacked, "G7"), `G7 · the figure adds ${label} — beyond the chord, taken from the field`);
  }
  // the message lists only what the figure names, each once, in first-named order
  assert.deepEqual(extensionsOf(g7().fig("13,r,9,13")), ["b13", "9"]);
});

test("the ordinal law: a repeated 9 takes the next 9 up in the window and wraps; with one 9 in the window it repeats that one", () => {
  const wide = scene({ key: "C", scale: "mel", chart: CHART, index: 6, strings: [4, 3, 2, 1], startDegree: 5, nearFret: 2 });
  const nines = wide.fig("9,9,9").order;
  const ms = materialIn(wide.pos, [4, 3, 2, 1], wide.fld).filter((n) => n.keyDeg === 5).map((n) => n.midi).sort((a, b) => a - b);
  assert.ok(ms.length >= 2, `the probe needs two 9s in the window: ${ms}`);
  assert.deepEqual(nines.map((n) => n.midi), [ms[0], ms[1], ms[2 % ms.length]]);
  // strings 1–3, frets 2–6 hold two 9s (A3 s3f2, A4 s1f5): 9,9,9 walks them low → high and wraps to the first
  const three = g7().fig("9,9,9").order;
  assert.deepEqual(three.map(at), ["3/2", "1/5", "3/2"]);
  assert.equal(three[0], three[2], "the wrapped 9 is the same placed entry, the same object");
  // one string, one 9 in the window: it repeats that one, and a group naming it twice is refused by name
  const one = scene({ key: "C", scale: "mel", chart: CHART, index: 6, strings: [3], startDegree: 5, nearFret: 2 });
  const oo = one.fig("9,9").order;
  assert.equal(oo[0], oo[1]);
  assert.match(one.fig("<9,9>").err, /names the same note twice/);
});

test("ruling A: under Grip an extension is refused with a true sentence naming Line — plain and grouped alike", () => {
  const s = g7({ notesPer: 1 });
  for (const f of ["r,3,9", "<9,11,13>", "r,3,<9,11,13>"]) {
    const r = s.fig(f);
    assert.equal(r.order, null, f);
    assert.match(r.err, /beyond G7 — a grip holds only the chord's own tones; under Line the figure can reach past them/, f);
  }
});

test("ruling 4: r,3,5,7,<9,11,13> runs the chord, then strums the upper structure as ONE step", () => {
  const s = g7();
  const r = s.fig("r,3,5,7,<9,11,13>");
  assert.equal(r.err, null, r.err);
  assert.equal(r.steps.length, 5, "four steps, then one group");
  assert.deepEqual(r.steps[4].map(at), ["3/2", "3/5", "2/4"], "A, C and E♭ together, at their placed spots");
  assert.ok(r.steps[4].every((n) => n.role === "extension"));
  assert.deepEqual(extensionsOf(r), ["9", "11", "b13"], "the message lists the extensions wherever they appear");
});

test("ruling 4: <3,7,13> is a rootless group — B and F lit (the chord's), E♭ an extension", () => {
  const s = g7();
  const r = s.fig("<3,7,13>");
  assert.equal(r.err, null, r.err);
  assert.equal(r.steps.length, 1);
  const st = r.steps[0];
  assert.deepEqual(st.map((n) => [n.role, s.sel.includes(n)]), [["3", true], ["7", true], ["extension", false]]);
  assert.equal(st[2].label, "b13");
});

test("THE NARROW GUARD: assertOrder takes an extension only as a field note inside the window, wearing a role the chord does not hold", () => {
  const s = g7();
  const good = s.fig("9").order[0];
  assert.doesNotThrow(() => assertOrder([good], s.sel, s.ctx));
  // the same A3 at s4f7 — a real field note, honestly placed, OUTSIDE the window and the run: must throw
  const offWindow = { ...good, string: 4, fret: 7 };
  assert.equal(s.fld.opens[4] + 7, good.midi, "the probe is the same pitch, honestly fretted");
  assert.throws(() => assertOrder([offWindow], s.sel, s.ctx), /extension step/);
  // a field note on the run's strings but outside the window's frets
  const s2f10 = { ...good, string: 2, fret: 10, midi: s.fld.opens[2] + 10 };   // A4 on string 2 — in the run, past fret 6
  assert.ok(s.fld.degOf(s2f10.midi) >= 0, "the probe is a field note");
  assert.throws(() => assertOrder([s2f10], s.sel, s.ctx), /outside the window/);
  // a role the chord holds is not an extension
  assert.throws(() => assertOrder([{ ...good, ext: "9" }], s.sel, { ...s.ctx, tones: [...s.ctx.tones, { role: 9, pc: 9 }] }), /which the chord holds/);
  // an unlabelled off-selection note still throws as before (the old bug class stays caught)
  assert.throws(() => assertOrder([{ ...good, role: undefined }], s.sel, s.ctx), /carrying no role/);
});

test("an approach into an extension is refused with a true sentence; with no chord in the context the old sentence stands", () => {
  const s = g7();
  assert.match(s.fig("(-1)[9]").err, /the 9th is beyond G7 — an approach leads into a chord tone/);
  assert.match(orderBy("tones", "(-1)[9]", s.sel, { ...s.ctx, chord: undefined }).err, /carries no 9th|outside the window/);
});

test("the window is the cause when it holds no occurrence: the window's own sentence, naming where the note sits", () => {
  // string 2 alone holds A only at fret 10: a hand-built narrow window, frets 1–4 (window-reach.test's idiom — a lone
  // string's derived window widens to the whole scale, so only a forced window can lack the note)
  const s = g7();
  const narrow = { anchorString: 2, startDeg: 0, frets: [1, 3, 4], fLo: 1, fHi: 4, reachLo: 1, centre: 3, covered: false, uncovered: [] };
  const r = orderBy("tones", "9", [], { ...s.ctx, strings: [2], pos: narrow });
  assert.match(r.err, /the 9th \(A\) is outside the window — it sits at fret 10 on string 2; step the window or add a string/);
});

test("the gamut narrows the offer: an extension the gamut omits is refused by name, never silently dropped", () => {
  const s = g7({ gamut: [1, 2, 3, 4, 5, 7] });   // omits the 6th of the key: A, the 9 of G
  const r = s.fig("r,9");
  assert.equal(r.order, null);
  assert.match(r.err, /the 9 of G7 \(A\) is outside the gamut/);
});
