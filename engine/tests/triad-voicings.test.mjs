/* triad-voicings.test.mjs — the extraction, asserted, not reviewed.
 *
 * THE DIFFERENTIAL PIN: the shipped Triadetudes study is the specification.
 * Its voicingsFor is loaded read-only (the characterization loader, §5's own
 * safety net) and this module must reproduce it candidate for candidate over
 * the whole corpus — every key's twelve roots × the four family qualities ×
 * the study's own three string sets. The extraction is a refactor, and a
 * refactor is asserted.
 *
 * Also here, because this item owns them:
 *   - THE GREP: no quality interval set is spelled outside chord.mjs — the
 *     duplicated-fact defect, asserted comment-blind (engine/README.md's
 *     standing rule: state the contract here, not in module prose).
 *   - THE SHELLS GET AN OWNER: shellCandidates and rootlessTetrad, exported
 *     with zero callers since birth, are consumed here as the conformance
 *     references for the Multetudes shell and rootless objects — their
 *     content pinned against chord.mjs derivations. A product consumer
 *     arrives with the tetrad-side objects (child 7+); until then THIS suite
 *     is the named owner, which is the closure the item demands.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { triadCandidates, coreTriad } from "../triad-voicings.mjs";
import { shellCandidates, rootlessTetrad, SHELLS } from "../tetrad-voicings.mjs";
import { parseChord } from "../chord.mjs";
import { field } from "../field.mjs";
import { diatonicTones } from "../selection.mjs";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const eng = loadTriadetudesEngine();
const SUFFIX = { maj: "", min: "m", dim: "dim", aug: "aug" };

test("THE DIFFERENTIAL: the extracted generator reproduces the shipped study, candidate for candidate", () => {
  const OPEN = unwrap(eng.OPEN);
  // the study's four contiguous 3-string sets, in voicingsFor's own calling
  // order (setLowHigh: low pitch first = descending string numbers)
  const sets = [0, 1, 2, 3].map((o) => [3 + o, 2 + o, 1 + o]);
  let compared = 0;
  for (let rootPc = 0; rootPc < 12; rootPc++)
    for (const q of ["maj", "min", "dim", "aug"])
      for (const s of sets) {
        const shipped = unwrap(eng.voicingsFor({ rootPc, q }, s));
        const names = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
        const mine = triadCandidates(parseChord(names[rootPc] + SUFFIX[q]), {
          set: s.map((sn) => OPEN[sn]), strings: [...s], nfrets: eng.NFRETS });
        assert.equal(mine.length, shipped.length,
          `${names[rootPc]}${SUFFIX[q]} on ${s.join("-")}: candidate count`);
        for (let i = 0; i < mine.length; i++) {
          assert.deepEqual(
            mine[i].notes.map((n) => [n.string, n.fret, n.midi, n.slot]),
            shipped[i].notes.map((n) => [n.string, n.fret, n.midi, n.slot]),
            `${names[rootPc]}${SUFFIX[q]} on ${s.join("-")} candidate ${i}`);
          assert.equal(mine[i].inv, shipped[i].inv,
            `${names[rootPc]}${SUFFIX[q]} candidate ${i}: the read-back inversion must equal the study's declared one`);
        }
        compared++;
      }
  assert.ok(compared === 12 * 4 * 4, `the corpus must actually run (${compared})`);
});

test("the refusal is loud: a seventh chord names its tones and the lesson", () => {
  assert.throws(() => coreTriad("C7"), /refuses a seventh chord by name/);
  assert.throws(() => triadCandidates("Cmaj7", { set: [55, 59, 64] }), /refuses a seventh chord/);
  assert.throws(() => coreTriad({ symbol: "X", root: { pc: 0 }, intervals: [0, 7] }), /needs three tones/);
});

test("THE GREP: no quality interval set is spelled outside chord.mjs (comment-blind, both new modules)", () => {
  // the tell-tale spellings: a literal triad/tetrad interval list. chord.mjs
  // may hold them; the voicing modules and the selection may not.
  const BANNED = [/\[0,\s*4,\s*7\]/, /\[0,\s*3,\s*7\]/, /\[0,\s*3,\s*6\]/, /\[0,\s*4,\s*8\]/,
    /\[0,\s*4,\s*7,\s*10\]/, /\[0,\s*4,\s*7,\s*11\]/];
  for (const mod of ["triad-voicings.mjs", "selection.mjs"]) {
    const src = readFileSync(join(here, "..", mod), "utf8");
    for (const re of BANNED)
      assert.ok(!re.test(src),
        `${mod} spells a quality interval set (${re}) — quality vocabulary lives in chord.mjs only`);
  }
});

test("THE SHELLS GET AN OWNER: shellCandidates' content pinned against chord.mjs, and against the Multetudes shell object", () => {
  const ch = parseChord("Cmaj7");
  for (const order of Object.keys(SHELLS)) {
    const cands = shellCandidates(ch, { set: [40, 50, 55], strings: [6, 4, 3], nfrets: 15, orders: [order] });
    assert.ok(cands.length > 0, `${order}: no shell candidates`);
    for (const v of cands) {
      assert.equal(v.notes.length, 3, "a shell is three voices — the arity law's own boundary");
      const pcs = new Set(v.notes.map((n) => ((n.midi % 12) + 12) % 12));
      // R, 3, 7 — the guide-tone pair over the root, from the chord's own parse
      const want = new Set([0, 1, 3].map((i) => ((ch.root.pc + ch.intervals[i]) % 12 + 12) % 12));
      assert.deepEqual([...pcs].sort(), [...want].sort(), `${order}: a shell is R+3+7`);
    }
  }
  // and the Multetudes shell object speaks the same tones, diatonically
  const fld = field({ key: "C", scale: "major" });
  const shellTones = diatonicTones(fld, 0, [0, 2, 6]);
  assert.deepEqual(shellTones.map((t) => t.role), ["R", "3", "7"],
    "the shell object is the guide-tone pair over the root");
});

test("rootlessTetrad gets its owner: 3-5-7-9, read from the chord's own parse", () => {
  const ch = parseChord("Cm9");
  const r = rootlessTetrad(ch);
  const pcs = (Array.isArray(r) ? r : r.pcs ?? r.offsets?.map((o) => (ch.root.pc + o) % 12)) || [];
  const got = new Set(unwrap(pcs).map((x) => ((x % 12) + 12) % 12));
  for (const iv of [3, 7, 10, 14])
    assert.ok(got.has(((ch.root.pc + iv) % 12 + 12) % 12),
      `rootless m9: missing the tone at interval ${iv}`);
  assert.ok(!got.has(ch.root.pc), "rootless means the root is not in it");
});
