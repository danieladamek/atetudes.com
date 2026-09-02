/* TETRADETUDES — door #1, built as a door from birth (family spec §5.4).
 *
 * THE LOCK IS SMALLER THAN THE SCOPING NOTE PROPOSED, and the resolver is the
 * reason. The proposal was
 *
 *   { material, families:["drop2","drop3","close"], narrator, notepad,
 *     metronome, guideTones }
 *
 * and four of those six keys are refused today, by name:
 *
 *   families    no module requires it — all three families live inside
 *               engine/tetrad-voicings.mjs, so the key cannot drive a reach-set
 *               at module granularity. It is runtime config, not a lock. Making
 *               it a real lock key needs the generator split one-module-per-
 *               family, which is child 5's problem (the `-lite` pruning proof)
 *               rather than something to fake here.
 *   narrator    child 4; the module does not exist yet
 *   guideTones  child 4; likewise
 *   metronome   metronome-card requires {} — EVERY door reaches it, so locking
 *               it would state a choice no door actually has
 *
 * `audio: true` joined the lock on 2026-08-17, the day `hub/modules/audio-card.mjs`
 * existed to require it — which is the rule working in the other direction, and
 * the reason `plain` and `scribe` stay silent and carry no audio code at all.
 *
 * This is §4.2.1's fail-closed law working, not an obstacle: *a lock key that
 * matches no module is an error naming the known ones, because a door that
 * ships smaller and quieter than intended is the one failure mode a door must
 * not have.* Each key joins the lock on the day a module requires it, and the
 * suite fails until it does.
 */
export default {
  id: "tetradetudes",
  lock: {
    material: "tetrad",
    notepad: true,
    audio: true,
    transport: true,
  },
  present: {
    title: "Tetradetudes",
    /* the version rides the tag, as every sibling's does (Triadetudes v0.8.7,
     * Metronome v1.4.0). v0.1.0 was the deliberate FIRST release: the family
     * versions conservatively — Triadetudes is more mature and still pre-1.0 —
     * and this door's own roadmap (child 4's narrator and guide-tones) is not
     * built yet, so 1.0.0 would overclaim. v0.1.1 (2026-08-19): metroOwner
     * carried — the transport owns the clock it starts. v0.1.2 (2026-08-19):
     * the ATTACK message — the first chord of a cold Play sounds; the walk's
     * sound no longer rides the step owner's render echo. v0.1.3 (2026-08-19):
     * shell parity N1/N2/N5 — cards share a row height, Play is red, the piano
     * keys sound when pressed. v0.1.4 (2026-08-19): chord.mjs reads +M7 (the
     * first carrier re-inline, census-driven — 260819.6). v0.1.5 (2026-08-20):
     * N4 — the high E is uppercase (E–B–G–D), the procedure's first customer.
     * v0.1.6 (2026-08-20): the metronome's Sound button works — the click's
     * on/off is the clock owner's state (CLOCK_STATE.click), the transport
     * checkbox its second view. v0.1.7 (2026-08-20): one mute icon per slider
     * (chord, bass, click Vol) — v0.8.7's mute-is-the-slider-at-zero rule made
     * universal; the mute-chords checkbox and the Sound button retired into
     * it; the chord slider is called chord (chordLabel retired — one value
     * across every door is a fact with no variation). v0.1.8 (2026-08-20): the
     * card grammar — four rows, no row spent on a checkbox: accents, metronome,
     * count-in and voice ride the right end of rows that already exist.
     * v0.1.9 (2026-08-20): the neck sounds — clicking any dot announces NOTE
     * (floor F3; the triad's every-dot-sounds idiom); the zone drag keeps its
     * pointerdown, a moved drag suppresses the click. v0.1.10 (2026-08-20):
     * the box looks draggable — a corner grip at bottom-left sets the LEFT
     * edge (the box grows rightward), seed renders solid and consequence
     * dashed, and the soft wall says so when a block chord reaches below the
     * anchor (box.brokeLeft, tinted overhang; grip-only by derivation).
     * v0.1.11 (2026-08-20): binding, opt-in — the bind toggle hard-anchors
     * the anchor voice to the three zone notes (the triad's pivot model,
     * measurements 260820); the grip and arrows write scale TRIPLES now
     * (e5ba874 un-flattened at the user's seam); a bar with no anchored
     * shape reaches outside and the hint counts it. Off = the pinned path.
     * v0.4.0 (260915, THE STABLE PASS — the reconciled family baseline):
     * every door wears this version at the freeze. OWED_DRIFT emptied (the
     * four owed modules re-inlined/republished), the 260830 marker drift
     * cleared, the house skin is v0.9's (register entry 3, landed), the
     * privacy sentence in plain words, the page title in the visitor's
     * words. Declared only because the debt is actually gone.
     * (tetradetudes' own line ended at v0.1.13; from the freeze the four
     * doors share the family baseline version.)
     * v0.1.12 (2026-08-21): THE WINDOW IS A POSITION (ratified family law) —
     * the box IS the zone's span, one rigid dashed rectangle that dragging
     * TRANSLATES; binding is the default; the overhang, anchor strip,
     * brokeLeft and every reporter deleted. A note outside is a stretch in
     * full colour, and that is the teaching. v0.1.13 (2026-08-21): the
     * metronome range is 15–300 bpm (Daniel's call, first modification under
     * the foundational-components ruling; the transport mirror moves with
     * it, the tap clamp widens in metronome.mjs, re-inlined per census). */
    /* v0.4.1 (260916, night 21): carried along — the notepad surface it
     * shares moved (Restore confirms over unsaved text; the title is
     * pre-populated and names each entry; entries export on their own).
     * Nothing of this door's own changed. */
    /* v0.5.0 (260918, night 24): carried along — the palette stated once, the
     * chip strip's selection on outline + fill, motion.mjs's exported names. */
    /* v0.4.2 (260917, night 22): carried along — the shell moved (row collapse,
     * the chevron naming its row) and the notepad surface again (item 0). */
    blurb: "four voices, moving as little as they have to — hub door #1 · v0.5.0",
    footer: "A hub door built from hub/doors/tetradetudes.door.mjs · At-Etudes.",
  },
};
