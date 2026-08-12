/* structures.test.mjs — the palette's structure catalog (component v1).
 * The two laws: everything derives through resolveRoman/parseChord (the grep
 * forbids quoted absolute chord symbols in the module source — deliberately
 * comment-blind, per engine/README.md), and every emission is valid app
 * input by construction, asserted over the full 12-key × catalog matrix.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { STRUCTURES, CHORD_ROOTS, CHORD_QUALITIES, GLYPHS,
  resolveStructure, chartBody, chartFence, changesLine, chordSymbol }
  from "../structures.mjs";
import { parseChord } from "../chord.mjs";
import { parseAtchart, serializeAtchart } from "../atchart.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// ---- the grep: no quoted absolute chord symbol in the module source ----
// (bare roots like "Db" are the chooser's data and are allowed; a root
// followed by any quality character inside a string literal is not)

test("grep: no literal progression strings — every symbol is derived", () => {
  const src = readFileSync(join(here, "..", "structures.mjs"), "utf8");
  const banned = /["'`][A-G][#b]?(?:m(?![a-z])|maj|dim|aug|sus|7|6|9|11|13)/;
  const hit = src.match(banned);
  assert.equal(hit, null,
    hit && `found a hand-typed chord symbol in structures.mjs near "${hit[0]}"`);
});

// ---- the written corpus: spot keys pinned by hand, then the full matrix ----

test("written corpus: ii–V–I and friends in pinned keys, enharmonics correct per key", () => {
  assert.equal(changesLine("ii-V-I", "C"), "Dm7 G7 Cmaj7");
  assert.equal(changesLine("ii-V-I", "Eb"), "Fm7 Bb7 Ebmaj7", "flat key spells flat");
  assert.equal(changesLine("ii-V-I", "F#"), "G#m7 C#7 F#maj7", "sharp key spells sharp");
  assert.equal(changesLine("ii-V-i", "C"), "Dm7b5 G7 Cm7");
  assert.equal(changesLine("turnaround", "Bb"), "Bbmaj7 Gm7 Cm7 F7");
  assert.equal(chartBody("ii-V-I", "G"), "| Am7 D7 | Gmaj7 |");
  assert.equal(changesLine("cycle-4ths", "C"),
    "C F Bb Eb Ab Db Gb B E A D G", "the cycle, spelled by the accidental rule");
  assert.equal(changesLine("blues-12", "F").split(" ").length, 12);
});

test("the full matrix: every structure × all twelve keys resolves, re-parses, and stays a degree pattern", () => {
  for (const st of STRUCTURES)
    for (const key of CHORD_ROOTS) {
      const r = resolveStructure(st.id, key);
      const flat = r.bars.flat();
      assert.equal(flat.length, st.bars.flat().length,
        `${st.id} in ${key}: every degree resolved`);
      for (const sym of flat)
        assert.doesNotThrow(() => parseChord(sym),
          `${st.id} in ${key}: "${sym}" must be parser-valid`);
      // the tonic bar lands on the key's own pitch class
      const tonic = parseChord(resolveStructure("ii-V-I", key).bars[1][0]);
      const keyPc = parseChord(key).root.pc;
      assert.equal(tonic.root.pc, keyPc, `Imaj7 of ${key} sits on ${key}`);
    }
});

test("the chooser matrix: every root × quality emits a parser-valid symbol (round-trip)", () => {
  for (const r of CHORD_ROOTS)
    for (const q of CHORD_QUALITIES) {
      const sym = chordSymbol(r, q);
      assert.equal(sym, r + q);
      assert.doesNotThrow(() => parseChord(sym));
    }
});

test("tier 3: the chart fence parses as a valid .atchart.md chart block in every key", () => {
  for (const key of CHORD_ROOTS) {
    const fence = chartFence("rhythm-a", key);
    const doc = "---\natchart: 1\n---\n" + fence + "\n";
    const at = parseAtchart(doc);
    assert.equal(at.sections.length, 1);
    assert.equal(at.sections[0].bars.length, 8, "eight bars, A section");
    assert.equal(serializeAtchart(at), doc, "and byte fixed-points through the format engine");
  }
});

test("tier 1: the glyph set is the ratified typographic subset — no U+1D1xx anywhere", () => {
  for (const g of GLYPHS)
    for (const ch of g)
      assert.ok(ch.codePointAt(0) < 0x1d100,
        `"${g}" is outside the typographic set (decision 5: no notation block)`);
  assert.ok(GLYPHS.includes("♭") && GLYPHS.includes("♯") && GLYPHS.includes("ø"));
});
