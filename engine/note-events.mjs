/* note-events.mjs — the note-event producer (component v1).
 *
 * Roadmap §1.4's keystone: one event list per chord, consumed identically by
 * the fretboard, score, keyboard and audio — the same figure must not be able
 * to sound one way and print another. Pure timing/pitch math, no DOM, no
 * audio, no globals; apps bind it themselves.
 *
 * Event shape (the family's shared drill-layer vocabulary — Tetradetudes and
 * Substitute Teacher inherit this):
 *
 *   { midi, string, fret, role: "chord" | "approach" | "bass", slot, onset, dur }
 *
 * - role is what makes an approach tone expressible (the grammar's consumer);
 * - slot is the STORED INVARIANT of the relative-state doctrine, carried from
 *   the voicing note (index into the set, 0 = lowest-pitched string); string
 *   and fret are the derived coordinate;
 * - onset/dur are seconds from the chord attack — the single source of the
 *   subdivision arithmetic the renderers used to compute independently.
 *
 * Grew out of Triadetudes' arpOnsets (v0.6.5, the sounding-note pulse), whose
 * scheduling numbers are pinned by an equivalence oracle: block strums stagger
 * 28 ms at 0.85 s; sequenced events divide the chord span evenly with a
 * legato tail of min(0.9, step × 1.6); the bass is a 1.0 s pedal at the
 * attack. Grown, not rewritten — the pin still passes.
 */

export function noteEvents(voicing, order, bassMidi, durBeats, bpm) {
  // voicing: {notes:[{string,fret,midi,slot}]} — order: the sounding sequence
  // as an array of the voicing's own notes (identity, not lookup), or null
  // for a block strum of the whole voicing.
  const out = [];
  if (bassMidi !== null && bassMidi !== undefined)
    out.push({ midi: bassMidi, string: null, fret: null, role: "bass",
      slot: null, onset: 0, dur: 1.0 });
  const seq = order || voicing.notes;
  for (const n of seq)
    if (!voicing.notes.includes(n))
      throw new Error("noteEvents: ordered note is not one of the voicing's notes");
  const span = (durBeats || 2) * (60 / bpm);
  if (!order) {
    seq.forEach((n, k) => out.push({ midi: n.midi, string: n.string, fret: n.fret,
      role: "chord", slot: n.slot ?? null, onset: k * 0.028, dur: 0.85 }));
  } else {
    const step = span / seq.length;
    seq.forEach((n, k) => out.push({ midi: n.midi, string: n.string, fret: n.fret,
      role: "chord", slot: n.slot ?? null, onset: k * step,
      dur: Math.min(0.9, step * 1.6) }));
  }
  // structural assertions — derived, then checked, before anyone consumes it
  const chord = out.filter((e) => e.role === "chord");
  if (chord.length !== seq.length)
    throw new Error("noteEvents: event count != sequence length");
  for (let k = 0; k < chord.length; k++) {
    if (k > 0 && chord[k].onset <= chord[k - 1].onset)
      throw new Error("noteEvents: onsets not strictly increasing");
    if (chord[k].onset < 0 || chord[k].onset >= span)
      throw new Error("noteEvents: onset outside the chord span");
    if (!(chord[k].dur > 0)) throw new Error("noteEvents: non-positive duration");
    if (!Number.isInteger(chord[k].string) || chord[k].string < 1 || chord[k].string > 6)
      throw new Error("noteEvents: event carries no real string");
  }
  return out;
}
