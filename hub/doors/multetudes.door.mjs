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
    /* v0.5.0 (260918, night 24 — the approach note): the (…) refusal is
     * lifted — CR-1 ruled the rule for chromatic notes and Design Spec §2.6
     * specifies the mark (0.6 of the host radius, hollow; violet when
     * chromatic, the degree colour when diatonic; no ring, no label, the
     * slur under the dots; drawn while the figure is live, the ordinary
     * pulse on play), engraved on the staff as cue-size heads; the guards
     * name the missing role (item 1). The degree DOT beside the chord name
     * in the readout and on every chip; --red means the key and nothing
     * else (item 2, register 35); the palette stated once (2a). The
     * reference picks the NEAREST note across the free strings (item 3). */
    /* v0.4.3 (260918, night 23 — the light night): the Key selector in bold
     * red, the degree palette's own R (item 1); the harmonic readout moved
     * up beside Repeat, boxed, larger, bold, reading the chord AND its mode
     * for every object (item 2 — register 33 records the one un-gating).
     * Two UI items, no engine change, no carried module. */
    /* v0.4.2 (260917, night 22 — the tones and the neck; Daniel's v0.4.0
     * review completed): the title describes what is in the pad (item 0);
     * tone selection for every stacked object in the figure's notation
     * (item 1), Shell its preset (2); the bass root by default, chosen from
     * the object's tones (3); the Centricity bass window closed (4,
     * register 31); each passing chord names its mode beside voice (5);
     * row collapse, the chevron naming its row (6a — the shell's third
     * move); the centre reversal recorded (register 32). */
    /* v0.4.1 (260916, night 21 — the notepad, from Daniel's v0.4.0 review):
     * Restore never silently overwrites unsaved pad text (the same confirm
     * row as Clear, worded for restoring — item 1, live); the title field
     * is REAL — pre-populated with the standing default and the single
     * source of the name for the export file and each entry (item 2); every
     * practice-log entry exports on its own, named from that title, through
     * the one download path (item 3). The row-collapse (item 4) is PROPOSED,
     * not built — the shell did not move. */
    /* v0.4.0 (260915, THE STABLE PASS — the reconciled family baseline):
     * every door wears this version at the freeze. OWED_DRIFT emptied (the
     * four owed modules re-inlined/republished), the 260830 marker drift
     * cleared, the house skin is v0.9's (register entry 3, landed), the
     * privacy sentence in plain words, the page title in the visitor's
     * words. Declared only because the debt is actually gone. */
    /* v0.3.0 (260914, centricity): the centre gets a SOURCE — fixed (a
     * pedal under the moving chords) or follows (each bar re-centres),
     * completing the 260831 deferral (register 26); the Harmony card
     * renamed CENTRICITY (register 27); 9th/11th/13th chords with depth
     * as data and the grip's NAMED drop said on the face (register 28);
     * the notepad title persists with the pad (ruled, overruling v0.9).
     * v0.2.1 (260913b, the centre): scale mode's centre made to work —
     * the bass against it, figures addressing degrees from it (the 9/11/13
     * compounds), movement back once a figure resolves, Placement's
     * boundary kept loud (register 25); the notepad's title in the header
     * band via the shell's first slot; the sliders paired; the neck ring
     * riding livePulses.
     * v0.2.0 (260913, the interface pass): the wireframe lands — Take on
     * the rail as the all-tones checkbox (D8), Harmony one row, the
     * under-neck block (bpm and the bass as second views, the transport
     * mini, the repeat toggle), the chips carrying roman AND slash, and
     * the ruled vocabulary all the way down: strum / arpeggiate on the
     * movement, the engine's old strum flag renamed bed (register 24).
     * v0.1.0 (260911, the publish): the first public edition — served at
     * atetudes.com/studies/multetudes/. The footer's "Not a published study"
     * went with it: it was true until this build and false the moment the
     * file landed in static/studies/, which is §4.4's silent divergence
     * pointed at the reader. Version scheme follows tetradetudes, whose
     * v0.1.x line likewise began at its publish.
     * v0.0.5 (260901, child 7): the progression — cycle · form · custom,
     * the bar count derived, the chart line and the étude staff live end to
     * end, typed changes through parseChord, the chart round trip closed,
     * and the walk (Play walks the bars through the family's own bus
     * contract). */
    /* v0.5.1 (260919, night 25 — the layout pass and the prose trim): the readout
     * into the neck's header, the clock closes ranks, the hint keeps reason and
     * affordance while the readout says what is; the approach sentence names its
     * centre. No engine change. */
    /* v0.5.2 (260920, night 26 — one rule applied twice): one OPEN_MIDI (field.mjs),
     * one chromatic speller (chord.mjs), two more palette copies retired, and the
     * harmonic readout on every étude representation as ONE component (hub/readout.mjs)
     * with the minis in flow beside it. */
    /* v0.5.3 (260922, night 28 — the Key field wears its weight): the Centricity
     * card's Key select at 18px bold red, ~1.75× its neighbours, bottom-aligned,
     * its caption dropped and the select named. A light night. */
    /* v0.5.4 (260923, night 29 — axe joins the locks; the set squares become
     * controls): role, name, pressed state, hit target, hover/focus in ink,
     * Enter/Space; the accessibility floor gated per door at both widths. */
    blurb: "one tool that holds many études · v0.5.4",
    footer: "A hub door built from hub/doors/multetudes.door.mjs · At-Etudes. " +
      "Colour is function against the key — or the reference, when one re-roots the field. " +
      "The bracket right of the string numbers is the figure's order (child 3b).",
  },
};
