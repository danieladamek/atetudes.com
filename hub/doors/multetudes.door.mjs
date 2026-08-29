/* MULTETUDES — one tool that holds many études.
 *
 * Built as a hub door from birth (multetudes-prd.md §5, the one hard
 * instruction). Child 0 measured the kill condition on the widest lock the
 * build had (414.5 kB · 32 modules · 45 ms, zero errors — Update Log
 * 260827.1); it did not fire, and that measurement is FINISHED.
 *
 * THE SURFACE (v0.0.4, 2026-08-29 — the identical-to-v0.9 ruling, Daniel
 * 2026-08-28): the door now builds v0.9's page. Two declared rows (the row
 * primitive, hub/tools/build.mjs) — Metronome beside the journal at 1fr 3fr,
 * Harmony · Progression · Presets at 2fr 1fr 1fr — then the chart line, ONE
 * neck, the readout, the étude, the keys.
 *
 * WHAT THIS VERSION STOPS MOUNTING, stated because a door that quietly stops
 * mounting components is §4.4's silent divergence (also in Update Log
 * 260829.x): the SEVEN tetrad-pass modules are out — material:"tetrad" left
 * the lock (fretboard-stage, harmony-panel, shape-motion, chord-timeline,
 * score-board, keyboard-strip) and transport:true with it (transport-card).
 * The reasons, per component: v0.9 has ONE neck, and the two-necks keep-both
 * ruling was superseded 2026-08-28 by identical-to-v0.9 once the kill
 * measurement was done; the tetrad boards (timeline, staff, keys) and the
 * transport's walk all derive from tetradPass, which the field path does not
 * drive — mounted, they would render a disconnected C-major tetrad cycle,
 * which is not inert, it is WRONG. Multetudes' On The Neck is field-board;
 * its staff and keys are its own boards (register entries — the family
 * components were NOT modified to fit); the transport returns with child 7's
 * progression and walk.
 *
 * The lock:
 *   field: true            On The Neck (field-board) — children 0–3a.
 *   notepad: true          The Practice Log (the family's own notepad-card,
 *                          unmodified), placed by row into v0.9's notepad seat
 *                          — the pad/log split is a register entry (the CSS
 *                          ownership wall; see the divergence register).
 *   audio: true            the hub's ears — dots, keys and staff still sound.
 *   surface: "multetudes"  v0.9's cards and boards: harmony-card,
 *                          progression-card (LIVE — child 7), presets-card,
 *                          timeline-strip (the chart line, live; owns the
 *                          position), readout-strip, staff-board (end to
 *                          end), keys-board, and etude-walk — the transport
 *                          the header below promised back, returned with
 *                          child 7's progression and walk as stated.
 */
export default {
  id: "multetudes",
  lock: {
    field: true,
    notepad: true,
    audio: true,
    surface: "multetudes",
  },
  /* THE DECLARED ROWS (v0.9's grid): placement of what the lock reached —
   * the resolver refuses a row naming anything it does not reach. */
  /* THE JOURNAL SPLIT (register entry 4, ruled 2026-08-28): the PAD part
   * rides row 1 under v0.9's own "Notepad" heading; the module's remainder —
   * the Practice log header and the history — stays at the module's own
   * mount, which is the page foot (boards, order 90). One module, one
   * surface, one state; the split is PLACEMENT, and the family ruling that
   * the log and the notepad are one item is about identity, untouched. */
  rows: [
    { template: "1fr 3fr",
      cards: ["metronome-card", { part: "notepad-card#pad", heading: "Notepad" }] },
    { template: "2fr 1fr 1fr", cards: ["harmony-card", "progression-card", "presets-card"] },
  ],
  present: {
    title: "Multetudes",
    /* v0.0.1 (260827, child 0): the skeleton — the kill condition measured,
     * did not fire. v0.0.2 (260827, child 2): the free string set. v0.0.3
     * (260828, child 3a): the selection rail over engine/selection.mjs.
     * v0.0.4 (260829, the surface): v0.9's page — declared rows, one neck,
     * the harmony/progression/presets cards, the chart line, the readout,
     * the étude and the keys; the tetrad-pass modules unmounted (see above). */
    /* v0.0.5 (260901, child 7): the progression — cycle · form · custom,
     * the bar count derived, the chart line and the étude staff live end to
     * end, typed changes through parseChord, the chart round trip closed,
     * and the walk (Play walks the bars through the family's own bus
     * contract). */
    blurb: "one tool that holds many études · v0.0.5",
    footer: "A hub door built from hub/doors/multetudes.door.mjs. Not a published study. " +
      "Colour is function against the key — or the reference, when one re-roots the field. " +
      "The bracket right of the string numbers is the figure's order (child 3b).",
  },
};
