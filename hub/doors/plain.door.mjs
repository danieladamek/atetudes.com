/* PLAIN — the same hub with the notebook locked out.
 *
 * This is the door the stage-2 gate is about: its built file must contain no
 * trace of the notepad — script, markup AND styles — while still shipping a
 * whole metronome card, so the artifact grep is surgical rather than vacuous
 * (§4.2.1). Denial is explicit rather than left to fail-closed omission,
 * because a door's thesis should be legible in its declaration.
 */
export default {
  id: "plain",
  lock: { notepad: false },
  present: {
    title: "Plain",
    /* v0.4.2 (260917, night 22): carried along — the shell moved (row collapse,
     * the chevron naming its row) and the notepad surface again (item 0). */
    blurb: "the clock alone — no notebook, and none of its engine · v0.4.2",
    footer: "A hub door built from hub/doors/plain.door.mjs. Not a published study.",
  },
};
