/* palette.test.mjs — the music palette (component v1, child 3 of 3).
 * The laws: every emission is valid app input by construction (figures
 * through the motion grammar's own parse→serialize, slot patterns derived by
 * permutation and gated by the shape parser), and the caret SURVIVES every
 * insert — cursor, selection and scroll preserved, focus returned to the pad.
 * That last one is the failure mode that makes palettes useless.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { FIGURES, SLOT_PATTERNS, padInsert, createPalette } from "../palette.mjs";
import { parse as parseMotion, serialize as serializeMotion } from "../motion.mjs";
import { parseChord } from "../chord.mjs";
import { makeDoc } from "./_dom-stub.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// ---- the grep: no hand-typed chord symbols in the palette either ----

test("grep: no literal chord symbol in palette.mjs — sources are grammar, not tables", () => {
  const src = readFileSync(join(here, "..", "palette.mjs"), "utf8");
  const banned = /["'`][A-G][#b]?(?:m(?![a-z])|maj|dim|aug|sus|7|6|9|11|13)/;
  const hit = src.match(banned);
  assert.equal(hit, null,
    hit && `found a hand-typed chord symbol in palette.mjs near "${hit[0]}"`);
});

// ---- tier 4: figures are the grammar's own canonical form ----

test("tier 4: every figure snippet is a parse→serialize fixed point of the field's parser", () => {
  assert.ok(FIGURES.length >= 5, "the catalog is real");
  for (const f of FIGURES) {
    const p = parseMotion(f.text, "tones");
    assert.equal(p.error, undefined, `"${f.text}" must parse (${f.name})`);
    assert.equal(serializeMotion(p), f.text,
      `"${f.text}" must be the grammar's canonical spelling — a paste that ` +
      "the field re-spells is drift waiting to happen");
  }
});

test("tier 4: slot patterns are ALL permutations, each shape-parser valid", () => {
  assert.equal(SLOT_PATTERNS.length, 6, "3! permutations, derived not listed");
  assert.equal(new Set(SLOT_PATTERNS).size, 6, "all distinct");
  for (const t of SLOT_PATTERNS) {
    const p = parseMotion(t, "shape");
    assert.equal(p.error, undefined, `"${t}" must parse in shape mode`);
    assert.equal(p.figures.map((f) => f.target.slot).join("-"), t);
  }
});

// ---- the caret's survival: padInsert through applyEdit ----

function stubPad(value, start, end) {
  let focused = false;
  return { value, selectionStart: start, selectionEnd: end, scrollTop: 42,
    focus() { focused = true; }, wasFocused: () => focused,
    ownerDocument: makeDoc() };
}

test("padInsert: inline insert lands at the cursor, caret after it, scroll and focus kept", () => {
  const pad = stubPad("Dm7 later", 4, 4);
  padInsert(pad, "G7 ", { block: false });
  assert.equal(pad.value, "Dm7 G7 later");
  assert.equal(pad.selectionStart, 7, "caret sits after the insert");
  assert.equal(pad.selectionEnd, 7);
  assert.equal(pad.scrollTop, 42, "scroll preserved");
  assert.ok(pad.wasFocused(), "focus returns to the pad");
});

test("padInsert: a selection is REPLACED, not flanked", () => {
  const pad = stubPad("try [this] out", 4, 10);
  padInsert(pad, "♭", { block: false });
  assert.equal(pad.value, "try ♭ out");
  assert.equal(pad.selectionStart, 5);
});

test("padInsert: block inserts sit on their own lines wherever the cursor was", () => {
  const pad = stubPad("prose before and after", 12, 12);
  padInsert(pad, "```chart\n| Dm7 G7 | Cmaj7 |\n```", { block: true });
  assert.equal(pad.value,
    "prose before\n```chart\n| Dm7 G7 | Cmaj7 |\n```\n and after",
    "newlines added exactly where needed — the fence must pair");
  const pad2 = stubPad("line one\n", 9, 9);
  padInsert(pad2, "```chart\n| C |\n```", { block: true });
  assert.equal(pad2.value, "line one\n```chart\n| C |\n```",
    "no spurious padding at a line start / end of text");
});

test("padInsert: out-of-range selection indices are clamped, never thrown", () => {
  const pad = stubPad("ab", 99, 99);
  padInsert(pad, "!", { block: false });
  assert.equal(pad.value, "ab!");
});

// ---- the panel, headless: every control renders and inserts ----

function mountPanel() {
  const d = makeDoc();
  const root = d.createElement("div");
  const pad = d.createElement("textarea");
  pad.selectionStart = 0; pad.selectionEnd = 0; pad.scrollTop = 0;
  pad.focus = () => {};
  let inserts = 0;
  createPalette({ root, pad, onInsert: () => { inserts++; } });
  const buttons = [], selects = [];
  (function walk(n) {
    if (n.tagName === "BUTTON") buttons.push(n);
    if (n.tagName === "SELECT") selects.push(n);
    (n.childNodes || []).forEach(walk);
  })(root);
  return { root, pad, buttons, selects, inserts: () => inserts };
}

test("the panel: glyph buttons insert their glyph and report the insert", () => {
  const { pad, buttons, inserts } = mountPanel();
  const flat = buttons.find((b) => b.textContent === "♭");
  assert.ok(flat, "the flat glyph renders as a button");
  flat.click();
  assert.equal(pad.value, "♭");
  assert.equal(inserts(), 1, "the surface hook fired — the pad will persist");
});

test("the panel: the chord chooser emits a parseChord-valid symbol from its selects", () => {
  const { pad, buttons, selects } = mountPanel();
  const [rootSel, qualSel] = selects;
  rootSel.value = "Eb"; qualSel.value = "m7b5";
  buttons.find((b) => b.textContent === "Insert chord").click();
  assert.equal(pad.value, "Ebm7b5");
  assert.doesNotThrow(() => parseChord(pad.value));
});

test("the panel: a structure inserts as a chart fence in the chosen key, on its own lines", () => {
  const { pad, buttons, selects } = mountPanel();
  pad.value = "warmup"; pad.selectionStart = 6; pad.selectionEnd = 6;
  const st = selects.find((s) => s.attributes["aria-label"] === "structure");
  const key = selects.find((s) => s.attributes["aria-label"] === "key");
  st.value = "ii-V-I"; key.value = "G";
  buttons.find((b) => b.textContent === "Chart block").click();
  assert.equal(pad.value, "warmup\n```chart\n| Am7 D7 | Gmaj7 |\n```");
  buttons.find((b) => b.textContent === "Changes line").click();
  assert.ok(pad.value.endsWith("Am7 D7 Gmaj7"), "the changes line follows the caret");
});

test("the panel: every control is a native button or select (keyboard-reachable), buttons typed", () => {
  const { buttons, selects } = mountPanel();
  assert.ok(buttons.length >= GLYPH_MIN + 5, "glyphs plus the five insert actions");
  for (const b of buttons)
    assert.equal(b.attributes.type ?? "button", "button",
      "no accidental submit buttons");
  for (const s of selects)
    assert.ok(s.attributes["aria-label"], "selects are labelled for the keyboard");
});
const GLYPH_MIN = 10;
