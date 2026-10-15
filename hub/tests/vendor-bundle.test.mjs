/* vendor-bundle.test.mjs — the engine bundle RiffRaft vendors (ruling 261011c), tested as the ARTIFACT.
 *
 * Every musical assertion below imports the committed bundle file and nothing else from the engine: the bundle has
 * no imports, so what passes here is what RiffRaft gets. The corpus fixture is data, not engine code.
 * The lock is checked on the bundle's bytes, PER VERSION (261014), and is shown to BITE by the closure and by the byte
 * check separately: 1.0.0 carries neither motion.mjs nor palette.mjs; 2.0.0 carries motion (the lock lifted for the
 * étude chain, Daniel 2026-10-14) and still never palette.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { VERSION, OUT_DIR, ENTRIES, ENTRIES_OF, FORBIDDEN_OF, bundleName, manifestName, buildBundle, lockProblems, checkCommitted, closureOf } from "../tools/vendor.mjs";
import { inlineForm } from "../tools/build.mjs";
import { CORPUS, MUST_THROW } from "../../engine/tests/_atchart-corpus.mjs";
import { etudeTimeline as sourceTimeline } from "../../engine/etude-timeline.mjs";
import { FAM as SOURCE_FAM, FAM_COLOR as SOURCE_FAM_COLOR } from "../../engine/degree-palette.mjs";
import { describe as sourceDescribe } from "../../engine/etude-describe.mjs";

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

/* THE LOCK, PER VERSION (261014): each committed version's bytes against its OWN forbidden list and closure, and the
 * lock shown to bite for each — the closure refuses an entry reaching a forbidden module, and the byte check sees a
 * forbidden module's code appended, even one line of it */
const textOf = (v) => readFileSync(join(OUT_DIR, bundleName(v)), "utf8");
const manifestOf = (v) => JSON.parse(readFileSync(join(OUT_DIR, manifestName(v)), "utf8"));
for (const v of Object.keys(FORBIDDEN_OF)) {
  test(`THE LOCK ${v}: none of ${FORBIDDEN_OF[v].join(", ")} in the bundle — and the lock bites`, () => {
    const t = textOf(v), m = manifestOf(v), forbidden = FORBIDDEN_OF[v], carried = closureOf(ENTRIES_OF[v]);
    assert.deepEqual(lockProblems(t, undefined, carried, forbidden), []);
    for (const mod of forbidden) {
      assert.ok(!m.sources.some((s) => s.path === `engine/${mod}.mjs`), `${mod}.mjs is not a recorded source of ${v}`);
      // bite 1 — the closure refuses an entry that reaches it
      assert.throws(() => buildBundle({ version: v, entries: [...ENTRIES_OF[v], { mod }], sourceCommit: "x", blobs: new Map() }),
        /forbidden/, `${v}: an entry reaching ${mod}.mjs is refused`);
      // bite 2 — the byte check, independent of the closure: its code appended to the real bundle is seen, one line is enough
      const code = inlineForm(readFileSync(join(REPO, "engine", `${mod}.mjs`), "utf8"), `engine/${mod}.mjs`);
      assert.ok(lockProblems(t + "\n" + code, undefined, carried, forbidden).some((x) => x.startsWith(`${mod}.mjs:`)), `${v}: ${mod}'s code in the bytes opens the lock`);
      const one = code.split("\n").map((l) => l.trim()).find((l) => l.length >= 40 && !t.includes(l));
      assert.ok(lockProblems(t + "\n" + one, undefined, carried, forbidden).some((x) => x.startsWith(`${mod}.mjs:`)), `${v}: one line of ${mod} is seen`);
    }
  });
}

test("2.0.0 carries motion.mjs (the lock lifted for the étude chain) and 1.0.0 still does not", () => {
  assert.ok(manifest.sources.some((s) => s.path === "engine/motion.mjs"), "2.0.0 records motion.mjs as a source");
  assert.ok(!manifestOf("1.0.0").sources.some((s) => s.path === "engine/motion.mjs"), "1.0.0's sources are untouched");
  assert.deepEqual(FORBIDDEN_OF["2.0.0"], ["palette"], "palette stays forbidden");
});

test("1.0.0 is untouched: it still exports exactly its own API, and none of the étude chain", async () => {
  const E1 = await import(pathToFileURL(join(OUT_DIR, bundleName("1.0.0"))).href), m1 = manifestOf("1.0.0");
  assert.deepEqual(Object.keys(E1).sort(), [...m1.api].sort());
  for (const n of ["etudeTimeline", "barAt", "FAM_COLOR"]) assert.equal(E1[n], undefined, `1.0.0 has no ${n}`);
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

// ---- 2.0.0: the étude chain ----

test("2.0.0 manifest lists the new API by name", () => {
  for (const n of ["etudeTimeline", "etudeOf", "barAt", "beatsAt", "chordCount", "ETUDE_DEFAULTS", "DEFAULT_METER", "FAM", "FAM_COLOR"])
    assert.ok(manifest.api.includes(n) && typeof E[n] !== "undefined", `${n} is in the manifest and exported`);
});

test("smoke: the parser fix rides in 2.0.0 — a RiffRaft lane ending in |: throws through the bundle, and every must-throw case does", () => {
  assert.throws(() => E.parseAtchart("---\natchart: 1\n---\n```chart\n| Dm7 G7 | Cmaj7 ||:\n```\n"), /"\|:" at the end of a line/);
  let n = 0;
  for (const [name, [src, words]] of Object.entries(MUST_THROW)) { assert.throws(() => E.parseAtchart(src), words, name); n++; }
  assert.ok(n >= 6, `the must-throw cases ran (${n})`);
});

test("smoke: every corpus étude gives the SAME timeline through the bundle as through the source modules", () => {
  const corpus = JSON.parse(readFileSync(join(REPO, "hub", "tests", "fixtures", "etude-corpus.json"), "utf8"));
  let chords = 0;
  for (const { name, saved } of corpus) {
    const viaBundle = E.etudeTimeline(saved), viaSource = sourceTimeline(saved);
    assert.deepEqual(viaBundle, viaSource, `${name}: the bundle's timeline equals the source's`);
    assert.ok(viaBundle.bars.length > 0 && viaBundle.bars.every((b) => b.events.length > 0), `${name}: a real timeline, every chord sounding`);
    chords += viaBundle.bars.length;
  }
  assert.ok(corpus.length >= 12 && chords > 50, `the corpus ran (${corpus.length} études, ${chords} chords)`);
  console.log(`  ${corpus.length} études, ${chords} chords: bundle timeline = source timeline`);
});

test("smoke: the degree palette is read from the bundle, equal to the engine's (never retyped)", () => {
  assert.deepEqual(E.FAM, SOURCE_FAM);
  assert.deepEqual(E.FAM_COLOR, SOURCE_FAM_COLOR);
  assert.equal(E.FAM_COLOR.R, SOURCE_FAM_COLOR.R);
});

// ---- 2.1.0: the étude in words ----

test("2.1.0 manifest lists describe by name, and 2.0.0 is untouched (no describe)", async () => {
  assert.ok(manifest.api.includes("describe") && typeof E.describe === "function", "describe is in 2.1.0's manifest and exported");
  const E2 = await import(pathToFileURL(join(OUT_DIR, bundleName("2.0.0"))).href);
  assert.deepEqual(Object.keys(E2).sort(), [...manifestOf("2.0.0").api].sort(), "2.0.0 still exports exactly its own API");
  assert.equal(E2.describe, undefined, "2.0.0 has no describe");
});

test("smoke: every corpus étude is described in the SAME words through the bundle as through the source", () => {
  const corpus = JSON.parse(readFileSync(join(REPO, "hub", "tests", "fixtures", "etude-corpus.json"), "utf8"));
  let lines = 0;
  for (const { name, saved } of corpus) {
    const viaBundle = E.describe(saved), viaSource = sourceDescribe(saved);
    assert.deepEqual(viaBundle, viaSource, `${name}: the bundle's words equal the source's`);
    assert.ok(viaBundle.length >= 6, `${name}: a real description`);
    lines += viaBundle.length;
  }
  assert.ok(corpus.length >= 12, `the corpus ran (${corpus.length} études)`);
  console.log(`  ${corpus.length} études, ${lines} lines: bundle words = source words`);
});
