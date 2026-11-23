/* CHROMATETUDES — the collection door (261122). Brief: notes/specs/chromatetudes — the collection door, v0.1.md.
 *
 * Collections that are not a seven-note key — the sixth-diminished pair, whole-tone, the two octatonics,
 * augmented, chromatic — each walked as a scale of chords on a string set. Name and one door ruled by
 * Daniel 261122; the Barry Harris method lives inside it (brief §6.1).
 *
 *   surface: "chromatetudes"   reaches hub/modules/collection-board.mjs — the controls, the walk, the neck
 *   notepad · audio            the family's practice log and ears, unmodified
 *
 * NOT PUBLISHED (child 3's gate): the URL is permanent from the first publish, which is its own step.
 *
 * SHARED (brief §6.4): key, string set, bpm and meter. The collection is not a shared concept — a seven-note
 * scale from a sibling's note is withheld, named. The sets are three or four strings, by the collection.
 */
export default {
  id: "chromatetudes",
  shared: { carries: ["key", "stringSet", "bpm", "meter"], stringSet: { min: 3 } },
  lock: {
    surface: "chromatetudes",
    notepad: true,
    audio: true,
  },
  present: {
    title: "Chromatetudes",
    /* v0.1.0 (261122): the seven collections, their scales of chords on drop 2 (tetrads) and close (triads);
     * drop 3 withheld — it wants a skipped string set and the family's sets are adjacent runs */
    blurb: "collections that are not a key, walked as a scale of chords · drop 3 withheld (it needs skipped string sets) · v0.1.0",
    footer: "A hub door built from hub/doors/chromatetudes.door.mjs · At-Etudes. Not yet a published study.",
  },
};
