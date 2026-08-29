/* triad-voicings.mjs — THE TRIAD CANDIDATE GENERATOR, extracted from
 * Triadetudes (Multetudes child 4 — closes G5: "no triad generator in
 * engine/"; coreTetrad's own error message pointed at a study file).
 *
 * EXTRACTION PRINCIPLE: engine from the most demanding app. For triads that
 * is the shelved Triadetudes study, whose `voicingsFor` was READ, not
 * guessed, and whose behaviour is the specification: engine/tests/
 * triad-voicings.test.mjs pins this module DIFFERENTIALLY against the
 * shipped study through the read-only loader, candidate for candidate.
 *
 * THE DERIVATION (the study's, re-derived): a closed voicing is a ROTATION
 * of the chord's three tones walked up the set — each tone placed on the
 * next string at its first occurrence strictly above the previous pitch —
 * seeded at the bass tone's two lowest frets on the lowest string. Three
 * rotations × up to two octaves. One rule, one parameter (the rotation);
 * no shape tables (golden rule 1: a table is a violation even when its
 * output is identical).
 *
 * WHAT THE EXTRACTION IMPROVES, deliberately and visibly:
 *   - the INVERSION IS READ BACK FROM THE RESULT (the bass tone's index in
 *     the chord's own tone list) and ASSERTED equal to the rotation that
 *     built it — the study declared `inv: oi`; tetrad-voicings' standard is
 *     read-back, and the differential pin proves the two ways agree.
 *   - QUALITY COMES FROM chord.mjs and is never restated: the tones are the
 *     parsed chord's own intervals. The study's TRIAD_SHAPES table stays in
 *     the study; a grep in the tests asserts no quality interval set is
 *     spelled here.
 *   - MORE THAN THREE TONES REFUSES BY NAME — coreTetrad's `slice(0, ARITY)`
 *     silently voices C13 as C7 (one of the project's five named silent
 *     failures, unfixable there tonight: tetrad-voicings.mjs is carried and
 *     byte-pinned). This module is born loud instead.
 *
 * ARITY: three voices, one stream, the arity law's own shape — a triad
 * stream never mixes with a tetrad or shell stream. The Multetudes selection
 * path needs no mixing answer at all: it has no candidate streams — each
 * bar's selection derives independently from its object.
 *
 * Pure: no DOM, no globals, load-time structural assertions.
 */
import { parseChord } from "./chord.mjs";

const mod12 = (x) => ((x % 12) + 12) % 12;

/** the chord's triad, from chord.mjs's own parse — never a table here.
 * Exactly three tones or a loud refusal; the silent slice is the named
 * defect this module refuses to inherit. */
export function coreTriad(chord) {
  const ch = typeof chord === "string" ? parseChord(chord) : chord;
  const iv = ch.intervals;
  if (iv.length < 3)
    throw new Error(`${ch.symbol}: a triad voicing needs three tones, this chord has ${iv.length}`);
  if (iv.length > 3)
    throw new Error(`${ch.symbol}: has ${iv.length} tones (${iv.join(",")}) — a triad generator ` +
      "refuses a seventh chord by name rather than silently truncating it (the coreTetrad lesson)");
  return { chord: ch, pcs: iv.map((x) => mod12(ch.root.pc + x)) };
}

/**
 * triadCandidates(chord, { set, strings, nfrets }) → closed-voicing
 * candidates on a three-string set. `set` is open-string midis ascending
 * low → high with a parallel `strings` array (tetrad-voicings' own calling
 * shape; adjacency is never consulted). The study's reach past the last
 * fret (NFRETS + 2) is kept and parameterised as `reach`.
 *
 * Every candidate: { notes: [{string, fret, midi, slot}], inv } — ascending
 * in pitch, one note per string, inv READ BACK from the bass tone.
 */
export function triadCandidates(chord, { set, strings = null, nfrets = 15, reach = 2 } = {}) {
  const { chord: ch, pcs } = coreTriad(chord);
  if (!Array.isArray(set) || set.length !== 3)
    throw new Error("a triad set is three open-string midi values, ascending low → high");
  for (let i = 1; i < 3; i++)
    if (set[i] <= set[i - 1]) throw new Error("a string set is open-string midis ascending low → high");
  if (strings && strings.length !== 3) throw new Error("`strings` names one string per open value");
  const maxFret = nfrets + reach;

  const out = [];
  for (let oi = 0; oi < 3; oi++) {
    const ord = [0, 1, 2].map((i) => pcs[(i + oi) % 3]);
    const f0 = mod12(ord[0] - set[0]);
    for (const base of [f0, f0 + 12]) {
      let p = set[0] + base;
      const frets = [base];
      let ok = base <= maxFret;
      for (let i = 1; i < 3 && ok; i++) {
        let step = mod12(ord[i] - mod12(p));
        if (step === 0) step = 12;                 // strictly above the previous pitch
        p += step;
        const f = p - set[i];
        if (f < 0 || f > maxFret) { ok = false; break; }
        frets.push(f);
      }
      if (!ok) continue;
      const notes = frets.map((f, i) => ({
        string: strings ? strings[i] : i, fret: f, midi: set[i] + f, slot: i }));
      /* the inversion, READ BACK from the result and asserted against the
       * rotation that built it — derived twice, agreeing, never declared */
      const inv = pcs.indexOf(mod12(notes[0].midi));
      if (inv !== oi)
        throw new Error(`triadCandidates(${ch.symbol}): rotation ${oi} produced bass tone index ${inv} — ` +
          "the read-back inversion disagrees with the construction");
      for (let i = 1; i < 3; i++)
        if (notes[i].midi <= notes[i - 1].midi)
          throw new Error(`triadCandidates(${ch.symbol}): voices must strictly ascend`);
      for (const n of notes)
        if (!pcs.includes(mod12(n.midi)))
          throw new Error(`triadCandidates(${ch.symbol}): a placed note left the chord`);
      out.push({ notes, inv });
    }
  }
  return out;
}

/* ---------------- load-time structural assertions (golden rule 1) ---------------- */

{
  // the four family qualities on a standard-tuning top set: candidates exist,
  // ascend, cover all three inversions, and the read-back agreed throughout
  const SET = [55, 59, 64];                        // G–B–E, strings 3-2-1
  for (const sym of ["C", "Cm", "Cdim", "Caug"]) {
    const cands = triadCandidates(sym, { set: SET, strings: [3, 2, 1], nfrets: 15 });
    if (!cands.length) throw new Error(`triad-voicings: no candidates for ${sym}`);
    if (new Set(cands.map((v) => v.inv)).size !== 3)
      throw new Error(`triad-voicings: ${sym} must offer all three inversions on a 15-fret set`);
  }
  // the refusal is loud, by name — never the silent slice
  let threw = false;
  try { coreTriad("C7"); } catch (e) { threw = /refuses a seventh chord by name/.test(String(e)); }
  if (!threw) throw new Error("triad-voicings: a seventh chord must refuse by name");
}
