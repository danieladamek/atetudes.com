/* MULTETUDES — the skeleton door, and the kill condition (child 0).
 *
 * ONE TOOL THAT HOLDS MANY ÉTUDES (multetudes-prd.md). The brief's one hard
 * instruction: Multetudes is built as a hub door from birth, never
 * hand-authored — a one-scope application cannot become a door by extraction,
 * only by rewrite (family spec §4.2.3), and Multetudes is a bigger surface
 * than the app that proved it.
 *
 * THIS DOOR IS DELIBERATELY EMPTY OF MUSICAL ENGINE. It exists to answer one
 * question with evidence, before the engine work is spent: can a door at THIS
 * width load and run offline from file:// with the network disabled and zero
 * console errors? Charter §5 outranks the consolidation; if this cannot, the
 * consolidation stops and becomes doors instead (the item names that as a
 * legitimate outcome).
 *
 * THE LOCK IS THE SUPERSET — every key any module requires today:
 *
 *   material: "tetrad"   the only material value the module universe knows.
 *                        It reaches the six foundational components' current
 *                        implementations — On The Neck (fretboard-stage), The
 *                        Étude Staff (score-board), On the Keys
 *                        (keyboard-strip) — plus Harmony, Shape & Motion and
 *                        the timeline, all UNMODIFIED (the ruling: presence is
 *                        optional, identity is mandatory; this door chooses to
 *                        be present for all six).
 *   notepad: true        The Practice Log (the ruling: the log and the notepad
 *                        are one item) and the six engine modules behind it.
 *   audio: true          the hub's ears.
 *   transport: true      the Transport card.
 *   field: true          THE ONE NEW KEY, required by hub/modules/field-board.mjs
 *                        (new tonight): the field — key/scale ghosted across
 *                        all six strings — which is Multetudes' first surface
 *                        and the only thing this door adds to the width the
 *                        build had already resolved. The key joins the lock on
 *                        the day a module requires it (§4.2.1's fail-closed
 *                        law), which is today.
 *
 * The reach-set is therefore the widest the build has resolved: everything
 * tetradetudes ships, plus the field board. That is what makes the built file
 * representative for the kill-condition measurement (bytes · parse time from
 * file:// · module count — the three numbers the Update Log entry must carry).
 *
 * §4.4 note, written rather than silent: this skeleton shows TWO necks — the
 * tetrad "On the neck" board (the foundational component, unmodified) above
 * nothing it configures for Multetudes yet, and "The field" board. That is a
 * deliberate property of a measurement skeleton, not a design: the final
 * surface (child 8) decides what Multetudes' On The Neck is, and modifying
 * fretboard-stage to fit tonight is exactly what the item forbids.
 */
export default {
  id: "multetudes",
  lock: {
    material: "tetrad",
    notepad: true,
    audio: true,
    transport: true,
    field: true,
  },
  present: {
    title: "Multetudes",
    /* versioned like every sibling; v0.0.x while the door is a skeleton —
     * the engine children (1+) will carry it toward a first release.
     * v0.0.2 (2026-08-27, child 2): the field board gains the free string
     * set — selector, ratified window over the run, box shift, the setIndex
     * migration alias — over engine/{field,position,string-run}.mjs. */
    blurb: "one tool that holds many études — the skeleton door · v0.0.2",
    footer: "A hub door built from hub/doors/multetudes.door.mjs. Not a published study.",
  },
};
