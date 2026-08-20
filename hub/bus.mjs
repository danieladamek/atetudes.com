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
 * no clock simply has nothing listening.
 *
 * `{ run: true, owner }` names WHO is starting the clock — "transport" (the
 * étude's Play) or "metro" (the metronome's own Start). `{ run: false, owner }`
 * asks to stop it ONLY IF that owner started it: the reference's `metroOwner`
 * rule (triadetudes study.html:5209-5230), carried into the hub by name. The
 * transport stops the clock it started; a metronome the user started by hand
 * survives a transport Pause; and the metronome's own Stop (no owner named)
 * stops everything, as the reference's `stopAll` does. `{ click: boolean }`
 * asks the owner to sound or silence its click — the click is the clock's own
 * voice, so its on/off lives with the clock owner and every view of it
 * (the metronome's Sound button, the transport's metronome checkbox) is a view
 * of CLOCK_STATE.click: one state, two views, either can move it (260820.2).
 * (Before the owner rule, the play path was asymmetric — Play started the
 * clock, Pause never stopped it — and three symptoms followed from that one
 * defect; side-by-side triage 260819.) */
export const CLOCK = "atetudes:clock";

/** the grid owner's answer: what the clock IS now — `{ running, bpm, meter,
 * owner, click }`. `owner` is the metroOwner ("transport" | "metro" | null): ownership
 * is STATE, so it rides the state-shaped message and is replayed to a late
 * subscriber like the rest. Every card that shows tempo, meter or a run state
 * renders from this rather than from its own copy, so two views of one clock
 * cannot drift apart. */
export const CLOCK_STATE = "atetudes:clock-state";

/** A REQUEST to the transport (the pass-walker): arm or disarm the étude walk —
 * `{ run: true|false }`. The strip mini-transports summon Play without owning
 * the walk; the transport card answers exactly as its own Play button does,
 * then drives the clock through CLOCK. A strip that presses Stop announces CLOCK
 * `{run:false}` instead — the metronome halts and the transport disarms on the
 * CLOCK_STATE it hears back, so one stop cascades without any module reaching
 * another. Event-shaped, NOT replayed: a late listener must not re-arm from a
 * stale request. */
export const PLAY = "atetudes:play";

/** the mixer moved: { chord?, bass?, voice?, on? } — levels 0..1, the note
 * voice by name, and whether sound is on at all. The controls live in the
 * Transport card (the reference's form); whoever realises audio listens. */
export const MIXER = "atetudes:mixer";

/** THE TRANSPORT'S ATTACK: sound step `index` NOW — `{ index, lead, level,
 * beats }`. Event-shaped and NOT replayed, like BEAT: "make a sound" is an
 * instant, not a state a late listener should replay. This is deliberately NOT
 * the STEP_CHANGED request: a request means "please go to step N" and its owner
 * rightly skips it when the position is already N — but an attack means "sound
 * step N now", which is true even when N is where we already are. The first
 * chord of a cold Play was silent for exactly this confusion (260819.2): the
 * attack rode the request, the step owner swallowed 0→0 as a non-change, and
 * the echo that triggers audio never fired. Sound now travels transport → audio
 * directly, so a door that prunes the fretboard stage still SOUNDS — the render
 * echo is for boards, not for the speaker. */
export const ATTACK = "atetudes:attack";

/** SOUND ONE NOTE NOW — `{ midi }`. Event-shaped, like ATTACK and BEAT: a key
 * pressed on a board is an instant, not state. The keyboard strip announces it
 * and whoever realises audio plays the note with the current note voice — the
 * triad app's playNote behaviour (shell parity N5, 260819.4), carried through
 * the bus so the board never touches an AudioContext (§4.2.3). */
export const NOTE = "atetudes:note";

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
/* THE BUS REMEMBERS WHAT WAS SAID. Modules mount in `order`, so a listener that
 * mounts late (the notepad, order 90) never heard the harmony panel's mount-time
 * announcement (order 10) — and would snapshot a half-empty configuration until
 * someone happened to touch a control. Found by the persistence item: a fresh
 * page's first saved entry said "set · drop-2" and nothing else.
 *
 * So for the STATE-shaped messages, the last detail per name is kept — merged
 * per name, because CONFIG_CHANGED has two owners whose halves compose — and
 * REPLAYED to a listener the moment it subscribes. This is not shared mutable
 * state (§4.2.3): nothing can reach it, nothing can mutate it, and a listener
 * gets a copy of a message it merely missed. Event-shaped messages (BEAT, a
 * STEP request) are not replayed — a late listener has no business hearing an
 * old beat. */
const REPLAYED = new Set([CONFIG_CHANGED, CLOCK_STATE, MIXER]);
const lastOf = (doc) => (doc.__atetudesLast ||= new Map());

export function announce(doc, name, detail) {
  const view = doc.defaultView;
  const Ev = view && view.CustomEvent;
  if (!Ev) return;                       // no view (a headless parse): nothing to hear it
  const copy = JSON.parse(JSON.stringify(detail));
  if (REPLAYED.has(name)) {
    const prev = lastOf(doc).get(name);
    lastOf(doc).set(name, prev && typeof prev === "object" && copy && typeof copy === "object"
      ? { ...prev, ...copy } : copy);
  }
  doc.dispatchEvent(new Ev(name, { detail: copy }));
}

/** Listen for a message. Returns an unsubscribe, so a module can be mounted
 * more than once without leaking listeners. */
export function listen(doc, name, fn) {
  const h = (e) => fn(e.detail);
  doc.addEventListener(name, h);
  // a late subscriber to a state-shaped message hears its current value at once
  if (REPLAYED.has(name) && lastOf(doc).has(name))
    fn(JSON.parse(JSON.stringify(lastOf(doc).get(name))));
  return () => doc.removeEventListener(name, h);
}
