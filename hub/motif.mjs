/* motif.mjs — WHAT THE MOTIF SOUNDS IN THIS BAR, as ordered steps and names: one derivation for two faces (261014).
 *
 * Daniel, 261014 (after "the readout says the figure once"): "expose in larger type font the note sequence over the
 * string sequence … instead of just saying strum … show the notes in order low to high such that the voicing is
 * apparent." The neck's motif line and the readout's clause say the same notes; they read them HERE, so they cannot
 * drift (rule 6). Each caller hands in its own resolved figure (`orderBy`'s result) and its own selection — both
 * derive those independently, by design — and this file only orders and names.
 *
 *   a figure that resolves   its steps, in the figure's order; a group (notes that sound together) low to high
 *   no figure, strum         one group, low to high by PITCH (midi, never string number: an open or high-fret
 *                            note can cross), so the voicing reads
 *   no figure, arpeggiate    single steps, low to high by pitch
 *   nothing selected         null
 *
 * Names: a chord-supplied tone as its chord spells it, everything else through chord.mjs's speller (the key's own
 * names for the seven, rule C for a chromatic approach) — the staff's two paths, so every view agrees.
 */
import { chromaticSpeller } from "../engine/chord.mjs";

const lowToHigh = (notes) => [...notes].sort((a, b) => a.midi - b.midi);

/** motifOf({ fig, sel, movement }) → { kind: "sequence" | "together" | "strum" | "arpeggio", steps: note[][] } | null */
export function motifOf({ fig, sel, movement }) {
  if (fig && fig.order && fig.order.length) {
    const steps = fig.steps.map((st) => (st.length > 1 ? lowToHigh(st) : st));
    return { kind: steps.length === 1 && steps[0].length > 1 ? "together" : "sequence", steps };
  }
  if (!sel || !sel.length) return null;
  const up = lowToHigh(sel);
  return /^arpeggi/.test(String(movement))   // a restored v0.1.0 étude says "arpeggio"
    ? { kind: "arpeggio", steps: up.map((n) => [n]) }
    : { kind: "strum", steps: [up] };
}

/** the one namer for a motif's notes, in this key and scale */
export function motifNamer(key, scale) {
  const spell = chromaticSpeller(key, scale);
  return (n) => (n.member && n.name ? n.name : spell(n.midi).name);
}
