/* object-of-tones.mjs — THE OBJECT IS THE NAME THE TONES MAKE, whatever cards a door mounts (261121; *Player - the
 * object comes from the tones, so a 9th chord plays as a 9th*).
 *
 * Daniel, 2026-11-21: "the 9th didn't get captured in the embedding code." The link carried tones R 3 5 7 9; the player
 * played Fmaj7. `object` is never stored (night 59: only the tones are, etude-record.mjs EXCLUDED), and until tonight
 * only the Progression card said the object a restore's tones make. A door without that card (the player) left every
 * reader's mirror on its default tetrad, so a 9th étude played as a 7th chord and a scale étude as a chord.
 *
 * So every module that READS the object calls objectFollowsTones(doc) when it mounts. Once per document, whoever
 * calls first, it listens to CONFIG_CHANGED: a message that carries tones is named through the engine's one function
 * (selection.mjs objectOf), and if the object on the bus is not that name, it is said. It never says one the bus
 * already holds.
 *
 * IT LANDS LAST, so it never takes the floor from an owner. A correction from inside a listener is announced in a
 * microtask (bus.mjs announceAfter), so this one waits two. Where the Progression card is mounted (Multetudes), its own
 * correction lands first and this one finds the object already said, and stays silent. Where the card is not mounted,
 * this is the correction.
 *
 * Not in etude-record.mjs: the record is in every door that saves notes, and selection.mjs would follow it into Scribe
 * and Tetradetudes, which read no object (engine/tests/carrier-census.test.mjs caught that first draft). The readers
 * already carry selection.mjs.
 */
import { CONFIG_CHANGED, announce, listen } from "./bus.mjs";
import { objectOf, tonePick } from "../engine/selection.mjs";

const FOLLOWING = new WeakSet();

export function objectFollowsTones(doc) {
  if (!doc || FOLLOWING.has(doc)) return;
  FOLLOWING.add(doc);
  /* the bus's own state, as far as the object goes: what it last said the object is, and the tones it last carried
   * (a late listener hears the merged state first). The correction is judged WHEN IT LANDS, against these — never
   * against the message that queued it, which may be stale by then (the first draft's: a check queued by the boot
   * state's tetrad landed after a restore's 9th and said "tetrad" over it, and Multetudes never stopped answering). */
  const bus = {};
  listen(doc, CONFIG_CHANGED, (m) => {
    if (!m || typeof m !== "object") return;
    for (const k of ["object", "tones", "dyad"]) if (k in m) bus[k] = m[k];
    if (!("tones" in m) && !("dyad" in m)) return;
    const win = doc.defaultView;
    if (!win) return;
    win.queueMicrotask(() => win.queueMicrotask(() => {
      let derived;
      try { derived = objectOf(tonePick(bus)); } catch (_) { return; }   // an unreadable pick: its owner says why; nothing to name
      if (bus.object !== derived) announce(doc, CONFIG_CHANGED, { object: derived });
    }));
  });
}
