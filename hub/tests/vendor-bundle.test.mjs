/* vendor-bundle.test.mjs — the engine bundle RiffRaft vendors (ruling 261011c), tested as the ARTIFACT.
 *
 * Every musical assertion below imports the committed bundle file and nothing else from the engine: the bundle has
 * no imports, so what passes here is what RiffRaft gets. The corpus fixture is data, not engine code.
 * The lock (no motion.mjs, no palette.mjs) is checked on the bundle's bytes, and is shown to BITE: a bundle with
 * motion's code put back must be refused, by the closure and by the byte check separately.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { VERSION, OUT_DIR, ENTRIES, bundleName, manifestName, buildBundle, lockProblems, checkCommitted } from "../tools/vendor.mjs";
import { inlineForm } from "../tools/build.mjs";
import { CORPUS } from "../../engine/tests/_atchart-corpus.mjs";

const BUNDLE = join(OUT_DIR, bundleName(VERSION));
const text = readFileSync(BUNDLE, "utf8");
const manifest = JSON.parse(readFileSync(join(OUT_DIR, manifestName(VERSION)), "utf8"));
const E = await import(pathToFileURL(BUNDLE).href);
const REPO = join(OUT_DIR, "..", "..");

test("every committed version is its manifest's sha, reproduces from its recorded sources, and is locked", () => {
  const { problems, notes, versions } = checkCommitted();
  for (const n of notes) console.log("  " + n);
  assert.deepEqual(problems, []);
  assert.ok(versions.includes(VERSION), `the current VERSION ${VERSION} is committed`);
  console.log(`  ${versions.length} version(s) checked: ${versions.join(", ")}`);
});

test("the bundle stands alone: no import of any kind, and it exports exactly the manifest's API", () => {
  assert.equal(/^\s*import\b/m.test(text), false, "no import statement");
  assert.equal(/\bimport\s*\(/.test(text), false, "no dynamic import");
  assert.deepEqual(Object.keys(E).sort(), [...manifest.api].sort());
  assert.equal(E.parseRoman, undefined, "parseRoman stays out of the API (261011c)");
  console.log(`  ${manifest.api.length} names exported`);
});

test("THE LOCK: no motion.mjs or palette.mjs code in the bundle — and the lock bites", () => {
  assert.deepEqual(lockProblems(text), []);
  assert.ok(!manifest.sources.some((s) => /\/(motion|palette)\.mjs$/.test(s.path)), "neither is a recorded source");
  // bite 1 — the closure refuses an entry that reaches motion (palette reaches it too)
  for (const mod of ["motion", "palette"])
    assert.throws(() => buildBundle({ entries: [...ENTRIES, { mod }], sourceCommit: "x", blobs: new Map() }),
      /forbidden/, `an entry reaching ${mod}.mjs is refused`);
  // bite 2 — the byte check, independent of the closure: motion's code appended to the real bundle is seen
  const motion = inlineForm(readFileSync(join(REPO, "engine", "motion.mjs"), "utf8"), "engine/motion.mjs");
  const p = lockProblems(text + "\n" + motion);
  assert.ok(p.some((x) => x.startsWith("motion.mjs:")), "motion's code in the bytes opens the lock: " + p.join(" / "));
  // and a single signature line is enough (a partial copy cannot slip through)
  const one = motion.split("\n").map((l) => l.trim()).find((l) => l.length >= 40 && !text.includes(l));
  assert.ok(lockProblems(text + "\n" + one).some((x) => x.startsWith("motion.mjs:")), "one line of motion is seen");
});

test("smoke: the atchart corpus round-trips through the bundle's parser", () => {
  let n = 0;
  for (const [name, src] of Object.entries(CORPUS)) {
    const d1 = E.parseAtchart(src), s1 = E.serializeAtchart(d1);
    const d2 = E.parseAtchart(s1), s2 = E.serializeAtchart(d2);
    assert.equal(s2, s1, `${name}: serialization is a fixed point`);
    const sym = (d) => d.sections.map((s) => s.bars.map((b) => b.chords.map((c) => c.parsed.symbol)));
    assert.deepEqual(sym(d2), sym(d1), `${name}: the chords survive`);
    n++;
  }
  assert.ok(n >= 6, `the corpus ran (${n} charts)`);
  console.log(`  ${n} charts round-tripped`);
});

test("smoke: every structure resolves in all 12 keys, and its chart block and changes line parse", () => {
  let n = 0;
  for (const st of E.STRUCTURES)
    for (const key of E.CHORD_ROOTS) {
      const r = E.resolveStructure(st.id, key);
      const doc = E.parseAtchart("---\natchart: 1\n---\n" + E.chartFence(st.id, key) + "\n");
      assert.deepEqual(doc.sections.flatMap((s) => s.bars.map((b) => b.chords.map((c) => c.parsed.symbol))), r.bars,
        `${st.id} in ${key}: the chart block reads back as the structure`);
      for (const tok of E.changesLine(st.id, key).split(" ")) E.parseChord(tok);
      n++;
    }
  assert.equal(n, E.STRUCTURES.length * 12);
  assert.equal(E.CHORD_ROOTS.length, 12);
  console.log(`  ${E.STRUCTURES.length} structures × 12 keys = ${n} resolved`);
});

test("smoke: a RiffRaft lane | Dm7 G7 | Cmaj7 | is one section of two bars", () => {
  const lane = "| Dm7 G7 | Cmaj7 |";
  const doc = E.parseAtchart("---\natchart: 1\n---\n```chart\n" + lane + "\n```\n");
  assert.equal(doc.sections.length, 1, "one section");
  assert.deepEqual(doc.sections[0].bars.map((b) => b.chords.map((c) => c.parsed.symbol)), [["Dm7", "G7"], ["Cmaj7"]],
    "one bar per |, chords split on spaces");
});

test("smoke: a palette-style insert through applyEdit keeps the caret", () => {
  const src = "intro\nverse", at = 6;
  const r = E.applyEdit(src, { start: at, end: at }, { type: "insert", text: E.chartFence("ii-V-I", "Bb") + "\n" });
  const ins = E.chartFence("ii-V-I", "Bb") + "\n";
  assert.equal(r.src, "intro\n" + ins + "verse");
  assert.deepEqual(r.selection, { start: at + ins.length, end: at + ins.length }, "the caret lands after the insert");
  const doc = E.parseAtchart("---\natchart: 1\n---\n" + r.src.slice(at));
  assert.deepEqual(doc.sections[0].bars.map((b) => b.chords.map((c) => c.parsed.symbol)), [["Cm7", "F7"], ["Bbmaj7"]]);
});

test("smoke: grammarRoman spells every in-key structure chord as a numeral that resolves back to it", () => {
  const ROLES = ["R", "3", "5", "7"];
  let spelled = 0, offKey = 0;
  for (const key of E.CHORD_ROOTS) {
    const scale = E.scaleNotes(key, "major");
    const numeralOf = (sym) => {
      const p = E.parseChord(sym);
      return E.grammarRoman({
        degree: scale.findIndex((n) => n.pc === p.root.pc), rootPc: p.root.pc,
        tones: p.intervals.map((iv, i) => ({ role: ROLES[i], pc: (p.root.pc + iv) % 12 })),
      });
    };
    assert.equal(E.resolveStructure("ii-V-I", key).bars.flat().map(numeralOf).join(" "), "ii7 V7 Imaj7", `ii–V–I in ${key}`);
    for (const st of E.STRUCTURES)
      for (const sym of E.resolveStructure(st.id, key).bars.flat()) {
        const num = numeralOf(sym);
        if (num === "—") { offKey++; continue; }
        const back = E.resolveRoman(num, key);
        assert.ok(back, `${sym} in ${key}: "${num}" parses against the roman grammar`);
        assert.deepEqual([...back.parsed.pcs].sort(), [...E.parseChord(sym).pcs].sort(), `${sym} in ${key}: "${num}" is the same chord`);
        spelled++;
      }
  }
  assert.ok(spelled > 300, `numerals spelled (${spelled})`);
  console.log(`  ${spelled} numerals spelled and resolved back, ${offKey} off-key roots ("—")`);
});
