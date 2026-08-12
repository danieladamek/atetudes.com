/* palette.mjs — the notepad's music palette (component v1, child 3 of 3).
 *
 * Tier 1: the typographic glyph set (decision 5: no notation font — the
 * U+1D1xx block is not offered at all). Tier 2: the chord chooser, every
 * emission parseChord-gated. Tier 3: structures inserted in any key as
 * .atchart.md chart blocks, derived through engine/structures.mjs. Tier 4:
 * app-input syntaxes — changes lines, figure snippets, slot patterns —
 * VALID FIELD INPUT BY CONSTRUCTION: every figure source is canonicalized
 * through the motion grammar's own parse→serialize at load (a hand-maintained
 * snippet list that drifts from the parser is the same spec violation as a
 * hand-typed ii–V–I table), and slot patterns are DERIVED by permutation of
 * the slot alphabet, each gated through the shape parser.
 *
 * The palette writes TEXT through applyEdit — the markdown toolbar's pure
 * string+selection seam — never DOM, and has no privileged path into the
 * document. Cursor, selection and scroll survive every insert; focus returns
 * to the pad (the failure mode that makes palettes useless is tested, not
 * assumed). All DOM reached through the given elements' ownerDocument, so
 * the whole panel runs headless against the shared stub.
 */

import { GLYPHS, CHORD_ROOTS, CHORD_QUALITIES, STRUCTURES, chordSymbol, chartFence, changesLine } from "./structures.mjs";
import { applyEdit } from "./markdown.mjs";
import { parse as parseMotion, serialize as serializeMotion } from "./motion.mjs";

// ---------- tier 4: figure snippets, canonical through the grammar ----------

/* Sources are written in the figure grammar itself (degree-relative and
 * key-independent — the grammar IS the abstraction, as roman numerals are for
 * structures). Each is parsed by the field's own parser and re-serialized;
 * the canonical text is what the palette inserts, and load asserts the
 * round-trip is a fixed point. A source the parser refuses kills the build. */
const FIGURE_SOURCES = [
  { id: "enclosure-1", name: "enclosure of the root", src: "(-1,+2)[1]" },
  { id: "enclosure-3", name: "enclosure of the 3rd", src: "(+2,-1)[3]" },
  { id: "chromatic-3", name: "chromatic below the 3rd", src: "(-1)[3]" },
  { id: "scale-5", name: "scale step above the 5th", src: "(+s)[5]" },
  { id: "double-chrom-1", name: "double chromatic to the root", src: "(-2,-1)[1]" },
  { id: "line-135", name: "arpeggio line 1–3–5", src: "[1] - [3] - [5]" },
  { id: "enclose-cell", name: "two-figure cell (root, then 3rd)",
    src: "(-1,+2)[1] - (+2,-1)[3]" },
];

export const FIGURES = FIGURE_SOURCES.map((f) => {
  const p = parseMotion(f.src, "tones");
  if (p.error)
    throw new Error('palette: figure source "' + f.src + '" refused by the ' +
      "grammar at " + p.error.pos + ": " + p.error.message);
  const text = serializeMotion(p);
  const p2 = parseMotion(text, "tones");
  if (p2.error || serializeMotion(p2) !== text)
    throw new Error('palette: "' + f.src + '" is not a serialize fixed point');
  return { id: f.id, name: f.name, text };
});

/** Slot patterns: every permutation of the slot alphabet, derived — never
 * listed — and each gated through the shape parser. Valid for EVERY string
 * set by construction (that is what slots are for). */
export const SLOT_PATTERNS = (function permute(a) {
  if (a.length <= 1) return [a];
  return a.flatMap((x, i) =>
    permute([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r]));
})(["L", "M", "H"]).map((p) => {
  const text = p.join("-");
  const g = parseMotion(text, "shape");
  if (g.error) throw new Error('palette: slot pattern "' + text + '" refused');
  if (g.figures.map((f) => f.target.slot).join("-") !== text)
    throw new Error('palette: slot pattern "' + text + '" did not round-trip');
  return text;
});

// ---------- the insert seam: applyEdit, with the caret's survival ----------

/** padInsert(pad, text, {block}) — insert at the pad's cursor through
 * applyEdit. block:true guarantees the text sits on its own lines (a chart
 * fence next to prose must still pair). Selection lands after the insert,
 * scroll is preserved, focus returns to the pad. */
export function padInsert(pad, text, opts) {
  const src = String(pad.value ?? "");
  let start = pad.selectionStart | 0, end = pad.selectionEnd | 0;
  if (start > src.length) start = src.length;
  if (end > src.length) end = src.length;
  let t = String(text);
  if (opts && opts.block) {
    if (start > 0 && src[start - 1] !== "\n") t = "\n" + t;
    if (end < src.length && src[end] !== "\n") t = t + "\n";
  }
  const scroll = pad.scrollTop;
  const r = applyEdit(src, { start, end }, { type: "insert", text: t });
  pad.value = r.src;
  pad.selectionStart = r.selection.start;
  pad.selectionEnd = r.selection.end;
  pad.scrollTop = scroll;
  if (typeof pad.focus === "function") pad.focus();
  return r.selection;
}

// ---------- the panel ----------

/** createPalette({root, pad, onInsert}) — build the palette into root.
 * The host styles it; this module only structures it. Every control is a
 * native button or select (keyboard-reachable for free). onInsert fires
 * after every insert so the surface can persist the pad. */
export function createPalette(opts) {
  const { root, pad } = opts;
  const onInsert = opts.onInsert || (() => {});
  const docm = root.ownerDocument;
  const el = (tag, cls, text) => {
    const n = docm.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const insert = (text, block) => { padInsert(pad, text, { block }); onInsert(); };
  const row = (label) => {
    const r = el("div", "prow");
    r.appendChild(el("span", "plab", label));
    root.appendChild(r);
    return r;
  };
  const select = (parent, items, label) => {
    const s = el("select");
    s.setAttribute("aria-label", label);
    for (const it of items) {
      const o = el("option", null, it.name);
      o.value = it.value;
      s.appendChild(o);
    }
    parent.appendChild(s);
    return s;
  };
  const btn = (parent, label, fn) => {
    const b = el("button", "pbtn", label);
    b.setAttribute("type", "button");
    b.addEventListener("click", fn);
    parent.appendChild(b);
    return b;
  };

  // tier 1 — glyphs, plain inline text
  {
    const r = row("Symbols");
    for (const g of GLYPHS) btn(r, g, () => insert(g, false));
  }
  // tier 2 — the chord chooser (root × quality, parseChord-gated)
  {
    const r = row("Chord");
    const root$ = select(r, CHORD_ROOTS.map((x) => ({ name: x, value: x })), "chord root");
    const qual$ = select(r, CHORD_QUALITIES.map((q) =>
      ({ name: q === "" ? "major (bare)" : q, value: q })), "chord quality");
    btn(r, "Insert chord", () => insert(chordSymbol(root$.value, qual$.value), false));
  }
  // tier 3 — structures in any key, as chart blocks; tier 4 — as changes lines
  {
    const r = row("Structure");
    const st$ = select(r, STRUCTURES.map((s) => ({ name: s.name, value: s.id })), "structure");
    const key$ = select(r, CHORD_ROOTS.map((k) => ({ name: "in " + k, value: k })), "key");
    btn(r, "Chart block", () => insert(chartFence(st$.value, key$.value), true));
    btn(r, "Changes line", () => insert(changesLine(st$.value, key$.value), false));
  }
  // tier 4 — figure snippets and slot patterns (the arp/figure field's grammars)
  {
    const r = row("Figure");
    const fig$ = select(r, FIGURES.map((f) => ({ name: f.name, value: f.text })), "figure");
    btn(r, "Insert figure", () => insert(fig$.value, false));
    const pat$ = select(r, SLOT_PATTERNS.map((p) => ({ name: p, value: p })), "slot pattern");
    btn(r, "Insert pattern", () => insert(pat$.value, false));
  }
  return { insert: (text, block) => insert(text, block) };
}
