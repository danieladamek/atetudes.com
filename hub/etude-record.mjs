/* etude-record.mjs — WHAT THE ÉTUDE IS, computed once (night 66, 261024).
 *
 * Daniel, 261014: the Settings card is "a complete view of the étude the user has just structured", and "all of
 * that content should echo what then gets saved in the practice log". They are THE SAME LIST (rule 6). This file
 * is the one place it is computed:
 *
 *   etudeRecord(doc).snapshot()   the configuration a practice-log entry saves — notepad-card's snapshot, moved
 *                                 here verbatim (the merged CONFIG_CHANGED, less the derived object and its legacy
 *                                 alias, plus the clock's bpm and meter)
 *   describe(snapshot)            that same object, in a musician's words — the Settings card's face; it lives in
 *                                 the card's own describer module so the engine modules it needs reach only the door that
 *                                 shows it (a first build here put them in every door that saves notes: scribe
 *                                 280 → 372 kB)
 *
 * ONE RECORD PER DOCUMENT: the notepad's save and the card's description read the same instance, so they cannot
 * disagree — not two readers that happen to agree today. A key the snapshot carries and this file has no words
 * for is still SAID (under "also"), so a setting added in a later night appears on the face the moment it reaches
 * the log, and never in one without the other.
 *
 * WHAT THE LOG DOES NOT CARRY is not listed here by hand (that would be the hand-kept list rule 6 forbids): it is
 * measured, per night, by driving every control the resolver renders and reading the saved entry
 * (notes/working/scripts/n66snap.py). Night 66's census: the metronome card's subdivision, accents, click voice,
 * click level and mute, the neck's metronome switch, and the whole mixer do not reach the log — they ride the
 * clock, the mixer, or no message at all. Whether they should is a question of who OWNS a setting: proposed to
 * the PO, not settled here.
 */
import { CONFIG_CHANGED, CLOCK_STATE, listen } from "./bus.mjs";

const RECORDS = new WeakMap();

/** the one record for this document — created on first ask, listening from then (both messages are replayed) */
export function etudeRecord(doc) {
  let r = RECORDS.get(doc);
  if (r) return r;
  let cfg = {};
  let bpm = null, meter = null;
  const subs = new Set();
  const changed = () => { for (const fn of subs) fn(); };
  listen(doc, CONFIG_CHANGED, (m) => { if (m && typeof m === "object") { cfg = { ...cfg, ...m }; changed(); } });
  listen(doc, CLOCK_STATE, (m) => {
    if (m && typeof m.bpm === "number") bpm = m.bpm;
    if (m && typeof m.meter === "number") meter = m.meter;
    changed();
  });
  r = {
    /* ONLY TONES IS STORED (night 59): the object is the name the tones make, so the snapshot drops it and the
     * legacy `dyad` alias with it */
    snapshot: () => { const { object: _object, dyad: _dyad, ...c } = cfg; return { ...c, ...(bpm !== null ? { bpm } : {}), ...(meter !== null ? { meter } : {}) }; },
    onChange: (fn) => { subs.add(fn); return () => subs.delete(fn); },
  };
  RECORDS.set(doc, r);
  return r;
}
