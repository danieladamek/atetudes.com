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
    blurb: "four voices, moving as little as they have to — hub door #1",
    /* the mixer's chord-bus label. The card defaults to the arity-neutral
     * "Chord"; this door plays four voices and says so. */
    chordLabel: "Tetrads",
    footer: "A hub door built from hub/doors/tetradetudes.door.mjs. Not a published study.",
  },
};
