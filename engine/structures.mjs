/* structures.mjs — the palette's structure catalog (component v1).
 *
 * The notepad arc's child 3, tier 2/3/4 derivations — shared family code
 * (the v0.6 harmony panel and Substitute Teacher's substitution lab are its
 * later consumers). Pure: no DOM, no audio.
 *
 * THE LOAD-BEARING CONSTRAINT (golden rule 1): a structure is defined ONCE
 * as a degree pattern — roman numerals with qualities — and transposed into
 * the requested key by pitch-class math through engine/chord.mjs's
 * resolveRoman (consumer #2 of the v0.6 resolution path; no parallel one).
 * A table of twelve hand-typed ii–V–I progressions would be a spec violation
 * even with identical output — and the grep test asserts no quoted absolute
 * chord symbol exists anywhere in this module's source. Enharmonic spelling
 * per key is resolveRoman's named rule (Db in the flat keys, C# in the sharp
 * ones, double accidentals where the arithmetic demands them), re-parsed by
 * parseChord so every resolution passes the parser's structural assertions.
 *
 * Everything this module emits is VALID APP INPUT BY CONSTRUCTION:
 * chart bodies parse as .atchart.md chart blocks; changes lines parse
 * symbol-by-symbol through parseChord; the chord chooser's whole matrix is
 * load-asserted through the parser.
 */

import { parseChord, resolveRoman } from "./chord.mjs";
import { parseAtchart, serializeAtchart } from "./atchart.mjs";

// ---------- the catalog: degree patterns, bar groupings ----------

export const STRUCTURES = [
  { id: "ii-V-I", name: "ii–V–I",
    bars: [["ii7", "V7"], ["Imaj7"]] },
  { id: "ii-V-i", name: "ii–V–i (minor)",
    bars: [["iiø7", "V7"], ["i7"]] },
  { id: "turnaround", name: "turnaround (I–vi–ii–V)",
    bars: [["Imaj7", "vi7"], ["ii7", "V7"]] },
  { id: "blues-12", name: "twelve-bar blues",
    bars: [["I7"], ["IV7"], ["I7"], ["I7"], ["IV7"], ["IV7"], ["I7"], ["I7"],
      ["V7"], ["IV7"], ["I7"], ["V7"]] },
  { id: "rhythm-a", name: "rhythm changes — A section",
    bars: [["Imaj7", "vi7"], ["ii7", "V7"], ["Imaj7", "vi7"], ["ii7", "V7"],
      ["I7"], ["IV7"], ["Imaj7", "V7"], ["Imaj7"]] },
  { id: "cycle-4ths", name: "cycle of fourths",
    bars: [["I"], ["IV"], ["bVII"], ["bIII"], ["bVI"], ["bII"], ["bV"],
      ["VII"], ["III"], ["VI"], ["II"], ["V"]] },
];

/** The chooser's twelve roots — flats preferred where ambiguous, every one
 * parseChord-valid (asserted at load). These are pitch NAMES, not chords:
 * the grep forbids quoted root+quality combinations, not bare roots. */
export const CHORD_ROOTS =
  ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

/** The chooser's qualities — exactly what parseChord accepts (load-asserted;
 * suffix strings, no roots attached). */
export const CHORD_QUALITIES =
  ["", "m", "7", "maj7", "m7", "m7b5", "dim7", "6", "m6", "9", "maj9", "m9",
   "sus4", "aug", "7#5", "7b9", "mMaj7"];

/** Tier 1 — the typographic glyph set (decision 5: no notation font; the
 * U+1D1xx block is not offered at all). Every glyph renders everywhere with
 * no font shipped. */
export const GLYPHS =
  ["♭", "♯", "♮", "°", "ø", "△", "•",
   "|", "|:", ":|", "->"];

// ---------- derivation ----------

/** resolveStructure(id, key) → { id, name, key, bars:[[symbol,…],…] } —
 * every symbol derived through resolveRoman and re-parsed by parseChord. */
export function resolveStructure(id, key) {
  const st = STRUCTURES.find((s) => s.id === id);
  if (!st) throw new Error('structures: unknown structure "' + id + '"');
  const bars = st.bars.map((bar) => bar.map((roman) => {
    const r = resolveRoman(roman, key);
    if (!r) throw new Error('structures: "' + roman + '" did not resolve in ' + key);
    parseChord(r.symbol); // the parser's own assertions gate every emission
    return r.symbol;
  }));
  return { id: st.id, name: st.name, key, bars };
}

/** chartBody(id, key) → the chart-block body in the format engine's
 * CANONICAL form: the derived bars are round-tripped through parseAtchart/
 * serializeAtchart, so what the palette inserts is byte-for-byte what the
 * format itself would write — fixed-point by construction, not imitation. */
export function chartBody(id, key) {
  const { bars } = resolveStructure(id, key);
  const raw = "| " + bars.map((b) => b.join(" ")).join(" | ") + " |";
  const doc = "---\natchart: 1\n---\n```chart\n" + raw + "\n```\n";
  const out = serializeAtchart(parseAtchart(doc));
  return out.slice(out.indexOf("```chart\n") + 9, out.lastIndexOf("\n```"));
}

/** chartFence(id, key) → the fenced block the notepad inserts (tier 3);
 * engine/atchart.mjs reads it and sibling apps can act on it. */
export function chartFence(id, key) {
  return "```chart\n" + chartBody(id, key) + "\n```";
}

/** changesLine(id, key) → the flat symbol sequence (tier 4): valid input for
 * Triadetudes' Break-down changes field by construction — every token is a
 * parseChord-valid symbol. */
export function changesLine(id, key) {
  return resolveStructure(id, key).bars.flat().join(" ");
}

/** chordSymbol(root, quality) → the chooser's output, gated by the parser. */
export function chordSymbol(root, quality) {
  const symbol = root + quality;
  parseChord(symbol);
  return symbol;
}

// ---------- load-time assertions (golden rule 1, site form) ----------

{
  // the whole chooser matrix parses — a chooser that can emit an unparseable
  // symbol is broken at build time, not at paste time
  for (const r of CHORD_ROOTS)
    for (const q of CHORD_QUALITIES) parseChord(r + q);
  // every structure resolves and re-parses in the probe key
  for (const st of STRUCTURES) resolveStructure(st.id, "C");
  // and the derived ii–V–I is what the degree pattern says it is
  const p = resolveStructure("ii-V-I", "C");
  if (p.bars.flat().join(" ") !== ["ii7", "V7", "Imaj7"]
    .map((t) => resolveRoman(t, "C").symbol).join(" "))
    throw new Error("structures: derivation must go through resolveRoman");
}
