/* bus.mjs — the door's message contract, in one place.
 *
 * §4.2.3's second law: NO MODULE MAY DEPEND ON ANOTHER MODULE'S MUTABLE STATE.
 * That law killed Phase B stage 3, and it is the reason this file exists rather
 * than a shared config object.
 *
 * Modules here communicate by MESSAGE, never by reference:
 *
 *   - a module owns its own state privately and tells nobody where it lives;
 *   - it announces a change by dispatching an event carrying a PLAIN VALUE;
 *   - a listener derives everything it renders from that value plus its own
 *     defaults. It never reaches for the sender.
 *
 * The consequence is the one §4.2.1 requires: **a door that prunes a sender
 * builds a SMALLER file, not a broken one.** The listener simply never hears
 * that message and keeps the defaults it mounted with. Nothing throws, nothing
 * is undefined, and no module names another module.
 *
 * The event NAMES live here because three modules use them, and a name written
 * in three files is the duplicated fact §4.3 is about. This file owns markup
 * and styles for nothing, so it is not a contribution and does not belong in
 * `modules/` — the resolver reaches it through the imports of the modules that
 * use it, exactly as it reaches an engine module.
 */

/** the configuration changed — key, scale, cycle, bottom tone, string set */
export const CONFIG_CHANGED = "atetudes:config";

/** the position within the pass changed */
export const STEP_CHANGED = "atetudes:step";

/** A REQUEST to whoever owns the beat grid: run/stop it, or change its tempo
 * or meter. A request, not a command — the owner applies it and answers with
 * CLOCK_STATE, so nobody reaches into anybody's clock (§4.2.3) and a door with
 * no clock simply has nothing listening. */
export const CLOCK = "atetudes:clock";

/** the grid owner's answer: what the clock IS now. Every card that shows tempo,
 * meter or a run state renders from this rather than from its own copy, so two
 * views of one clock cannot drift apart. */
export const CLOCK_STATE = "atetudes:clock-state";

/** a metronome beat is DUE. `lead` is seconds from now until it sounds, so a
 * listener schedules against its OWN clock and never needs the sender's time
 * base — which is what lets the clock stay pure and the audio stay accurate.
 *
 * It also carries the beat's PLACE on the grid (`index`, `beat`, `bar`) and the
 * grid's `meter`/`bpm`, so a listener can walk a sequence along the same beats
 * the click sounds. Additive: a listener that only wants to make a noise reads
 * `level`/`lead` and ignores the rest. */
export const BEAT = "atetudes:beat";

/** Dispatch a message. The detail is passed by value on purpose: a listener
 * that mutated a shared object would recreate exactly the coupling this
 * module exists to prevent. */
export function announce(doc, name, detail) {
  const view = doc.defaultView;
  const Ev = view && view.CustomEvent;
  if (!Ev) return;                       // no view (a headless parse): nothing to hear it
  doc.dispatchEvent(new Ev(name, { detail: JSON.parse(JSON.stringify(detail)) }));
}

/** Listen for a message. Returns an unsubscribe, so a module can be mounted
 * more than once without leaking listeners. */
export function listen(doc, name, fn) {
  const h = (e) => fn(e.detail);
  doc.addEventListener(name, h);
  return () => doc.removeEventListener(name, h);
}
