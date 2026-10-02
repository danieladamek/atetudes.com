// neck-readout.test.mjs — THE READOUT'S SELF-CHECK STATES TODAY'S LAW, AND CAN STILL FAIL (night 85).
// A published study showed visitors "assertion failed" on every bar whose chord holds a tone the key lacks: the v0.9
// check (2026-08-28) demanded a FIELD note, and night 46 (2026-09-12, role A) made the chord's own off-key tone material
// without updating it. The engine was right; the check's subject was stale (doctrine rule 3 — the check was the suspect).
// Three things are pinned here: (1) the real blues-12 bar the old law failed is lawful under today's; (2) today's law
// still FAILS on a real violation — a corrected check that cannot fail is a check gone quiet; (3) across every key,
// scale, source and object the readout derives (states the door gate never drives), no bar breaks it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { unlawfulNotes } from "../modules/neck-readout.mjs";
import { field } from "../../engine/field.mjs";
import { positionOf, materialIn, regionOf } from "../../engine/position.mjs";
import { makeRun } from "../../engine/string-run.mjs";
import { oneOfEach, everyOccurrence, gripFit, materialFor, capOf, pickOf } from "../../engine/selection.mjs";
import { progressionOf, chordAt } from "../../engine/progression.mjs";
import { STRUCTURES } from "../../engine/structures.mjs";

/** the readout's own derivation of a bar's selection (hub/modules/neck-readout.mjs render), headless */
function bar(cfg, i) {
  const fld = field({ key: cfg.key, scale: cfg.scale });
  const run = makeRun(cfg.strings, fld.opens);
  const pos = positionOf({ field: fld, anchorString: Math.max(...run.strings), startDegree: 4, nearFret: 3, strings: run.strings });
  regionOf(pos, run.strings);
  const pool = materialIn(pos, run.strings, fld, null);
  const prog = progressionOf(cfg, cfg.key, cfg.scale);
  const cur = chordAt(prog, i, fld, cfg.object, pickOf(cfg));
  const fit = cfg.take === "all" ? { tones: cur.tones } : gripFit(cur.tones, run.strings.length * capOf(cfg.notesPer));
  const mat = materialFor(cur.tones, pool, fld, run.strings, pos);
  const r = cfg.take === "all" ? everyOccurrence(cur.tones, mat, { n: capOf(cfg.notesPer) })
    : oneOfEach(fit.tones, mat, { n: capOf(cfg.notesPer), centre: pos.centre });
  return { fld, pos, cur, sel: r.notes || r.partial || [], bars: prog.chords.length };
}
const BLUES = { key: "C", scale: "major", source: "form", form: "blues-12", start: 0, object: "tetrad", tones: [1, 3, 5, 7],
  strings: [4, 3, 2, 1], notesPer: 3, take: "one" };

test("NIGHT 85: blues-12 in C, bar 1 — the old law failed it on the chord's own b7; today's law finds it lawful", () => {
  const { fld, pos, cur, sel } = bar(BLUES, 0);
  const oldLaw = sel.every((x) => fld.degOf(x.midi) >= 0 && x.fret >= pos.fLo && x.fret <= pos.fHi);
  assert.equal(cur.symbol, "C7");
  assert.equal(oldLaw, false, "the v0.9 law fails this bar — the reproduction of what the visitor saw");
  const b7 = sel.find((x) => fld.degOf(x.midi) < 0);
  assert.ok(b7 && b7.member && b7.chromatic, `the note it failed on is the chord's own off-key tone: ${JSON.stringify(b7)}`);
  assert.deepEqual(unlawfulNotes(sel, fld, pos, cur), [], "today's law: lawful");
});

test("NIGHT 85: today's law still FAILS on a real violation — never a check gone quiet", () => {
  const { fld, pos, cur, sel } = bar(BLUES, 0);
  const field1 = sel.find((x) => fld.degOf(x.midi) >= 0), own = sel.find((x) => x.chromatic);
  // a field note outside the frame
  const out = { ...field1, fret: pos.fHi + 3, midi: field1.midi + 3 };
  assert.equal(unlawfulNotes([out], fld, pos, cur).length, 1, "a note outside the frame is unlawful");
  // an off-field note that is NOT the chord's own (a chromatic stranger: F# over C7 in C major)
  const stranger = { ...own, midi: own.midi - 4, fret: own.fret - 4 >= pos.fLo ? own.fret - 4 : own.fret };
  assert.ok(fld.degOf(stranger.midi) < 0);
  assert.equal(unlawfulNotes([{ ...stranger, fret: own.fret }], fld, pos, cur).length, 1, "an off-field note the chord does not own is unlawful");
  // the chord's own pitch class, but not marked as the chord's supply
  assert.equal(unlawfulNotes([{ ...own, member: false, chromatic: false }], fld, pos, cur).length, 1, "an off-field note not supplied by the chord is unlawful");
  // under a scale there is no chord to own anything
  assert.equal(unlawfulNotes([own], fld, pos, null).length, 1, "with no chord, an off-field note is unlawful");
});

test("NIGHT 85: every bar the readout can derive — key, scale, source, object, set, placement, take — is lawful", () => {
  const SOURCES = [...["fourths", "fifths", "thirds", "sixths", "scale"].map((c) => ({ source: "cycle", cycle: c, start: 0 })),
    ...STRUCTURES.map((s) => ({ source: "form", form: s.id, start: 0 }))];
  let bars = 0, chordOwn = 0;
  for (const key of ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"])
    for (const scale of ["major", "harm", "mel"]) for (const src of SOURCES) for (const object of ["tetrad", "triad"])
      for (const strings of [[4, 3, 2, 1], [6, 5, 4, 3, 2, 1]]) for (const notesPer of [1, 3]) for (const take of ["one", "all"]) {
        const cfg = { key, scale, ...src, object, tones: null, strings, notesPer, take };
        const n = progressionOf(cfg, key, scale).chords.length;
        for (let i = 0; i < n; i++) {
          const b = bar(cfg, i); bars++;
          chordOwn += b.sel.filter((x) => x.chromatic).length;
          const bad = unlawfulNotes(b.sel, b.fld, b.pos, b.cur);
          assert.deepEqual(bad, [], `${key} ${scale} ${src.form || src.cycle} ${object} ${strings.join("")} n${notesPer} ${take} bar ${i + 1} ${b.cur.symbol}`);
        }
      }
  assert.ok(bars > 30000 && chordOwn > 1000, `the sweep ran on real bars, including the chord's own tones: ${bars} bars, ${chordOwn} chord-supplied notes`);
});
