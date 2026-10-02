/* etude-record.mjs — WHAT THE ÉTUDE IS, computed once (night 66, 261024).
 *
 * Daniel, 261014: the Settings card is "a complete view of the étude the user has just structured", and "all of
 * that content should echo what then gets saved in the practice log". They are THE SAME LIST (rule 6). This file
 * is the one place it is computed:
 *
 *   etudeRecord(doc).snapshot()   the configuration a practice-log entry saves — notepad-card's snapshot, moved
 *                                 here verbatim (the merged CONFIG_CHANGED, less the derived object and its legacy
 *                                 alias, plus the clock's bpm and meter)
 *   etudeRecord(doc).restore(d)   the way home — the inverse of the snapshot, beside it (night 83)
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
 * A SAVED ÉTUDE COMES BACK AS THE WHOLE BENCH (night 83 — Daniel, 2026-10-01, ruling 261050 §5; scoping 261052).
 * Until tonight this file named what it KEPT: two hand-written `typeof` checks took `bpm` and `meter` off the clock's
 * message and dropped the rest, and the mixer's message was never heard at all. FORGETTING TO INCLUDE IS INVISIBLE —
 * night 66's census, night 72's click and this item are one bug, the same hand-kept list three times. So the record
 * now ABSORBS WHOLE MESSAGES AND NAMES ONLY WHAT IT EXCLUDES (EXCLUDED, below, each with its reason at the site): a
 * setting added to a recorded message is saved by default, and forgetting to exclude a transient shows in the saved
 * file where anyone can see it. The door gate holds it (hub/tests/_bench_record.py): every key observed on a recorded
 * message is either in the saved entry or named here — a key that is neither fails.
 *
 *   CONFIG_CHANGED  flat, as it always was (generative since night 66)
 *   CLOCK_STATE     flat beside it — `bpm` and `meter` stay where every saved entry already has them; tonight adds
 *                   `sub`, `click`, and the metronome card's three orphans (`accents`, `clickLevel`, `clickVoice`)
 *   MIXER           under its own name, `mixer` — MEASURED, not chosen: two of its keys mean something else on the
 *                   config (`bass` is the reference tone there, `pad` the pad switch), so a flat merge would save a
 *                   level as the reference tone. A key on two flat messages fails the gate the same way.
 *
 * OLD ENTRIES ARE BENCH-BLIND (Daniel, 2026-10-02: "leave them where they are" — the click stays muted). An entry
 * saved before tonight carries none of the bench, and restore announces ONLY WHAT AN ENTRY HAS: silence in a file
 * means "not recorded", never "set it to the default". It is the `.atchart` v1.2 tuning precedent verbatim — "files
 * written before v1.2 carry no tuning… they are tuning-blind, not tuning-standard, and nothing may retro-interpret
 * them" (docs/atchart-format.md §2.1; ruling 261050). KNOWN AND ACCEPTED: loading an étude can change your volume —
 * that is what "the whole bench" means, and Daniel chose it over "the music, not the bench" knowing so.
 */
import { CONFIG_CHANGED, CLOCK, CLOCK_STATE, MIXER, announce, listen } from "./bus.mjs";

/** WHAT THE RECORD DOES NOT KEEP — the only list in this file, and every name carries its reason. A key on a recorded
 * message that is not named here is saved. Restore strips the bench's (the clock's and the mixer's) too, so a file
 * that carries one — hand-edited, or written by some other build — cannot make the page act on it. */
export const EXCLUDED = {
  [CONFIG_CHANGED]: {
    object: "derived — the name the tones make (selection.mjs objectOf); only the tones are stored (night 59)",
    dyad: "derived — the object's legacy alias (night 59)",
  },
  [CLOCK_STATE]: {
    running: "transient — LOADING AN ÉTUDE MAY NOT START PLAYBACK (ruling 261050 §5)",
    owner: "session-local — who started the clock in this tab means nothing in a saved file",
  },
  [MIXER]: {
    on: "transient — the audio armed by a Play gesture; loading an étude may not start playback, nor arm it",
  },
};

/** where each recorded message's keys live in a saved entry: flat (null), or under one name */
export const PLACE = { [CONFIG_CHANGED]: null, [CLOCK_STATE]: null, [MIXER]: "mixer" };

const keep = (name, m) => {
  const out = {};
  for (const k of Object.keys(m)) if (!(k in EXCLUDED[name])) out[k] = m[k];
  return out;
};

const RECORDS = new WeakMap();

/** the one record for this document — created on first ask, listening from then (all three messages are replayed) */
export function etudeRecord(doc) {
  let r = RECORDS.get(doc);
  if (r) return r;
  // the last of each message, merged, exactly as the bus keeps it — whole, exclusions applied only when saved
  const heard = { [CONFIG_CHANGED]: {}, [CLOCK_STATE]: {}, [MIXER]: {} };
  const subs = new Set();
  const changed = () => { for (const fn of subs) fn(); };
  for (const name of Object.keys(heard))
    listen(doc, name, (m) => { if (m && typeof m === "object") { heard[name] = { ...heard[name], ...m }; changed(); } });
  r = {
    snapshot: () => {
      const out = {};
      for (const name of Object.keys(heard)) {
        const kept = keep(name, heard[name]);
        if (PLACE[name] === null) Object.assign(out, kept);
        else if (Object.keys(kept).length) out[PLACE[name]] = kept;
      }
      return out;
    },
    /* RESTORE = ANNOUNCE (moved here night 83 from notepad-card's apply, so the way home sits beside the way out —
     * completeness is a round-trip property, not a save property). Each part goes to its owner: the config on the
     * config bus, the clock's keys to the clock owner AS A REQUEST, the mixer on the mixer bus. A clock key is one
     * the clock has said on this page; any other top-level key rides the config bus, as every key did before tonight,
     * so a key from a later build is carried, never dropped. Only what the entry HAS is announced. */
    /* WHOSE IS EACH KEY (night 84 — shared by restore and by a file that opens): the clock's (a key the clock has said
     * on this page, less the clock's exclusions), the mix's (under `mixer`, less its exclusions), or the config's */
    parts: (data) => {
      const clockKeys = new Set(Object.keys(heard[CLOCK_STATE]));
      const config = {}, clock = {};
      for (const [k, v] of Object.entries(data || {})) {
        if (k === PLACE[MIXER]) continue;
        if (clockKeys.has(k)) clock[k] = v; else config[k] = v;
      }
      const req = keep(CLOCK_STATE, clock);
      const mx = data && data[PLACE[MIXER]];
      return { config, clock: req, mixer: mx && typeof mx === "object" && !Array.isArray(mx) ? keep(MIXER, mx) : {} };
    },
    restore: (data) => {
      if (!data || typeof data !== "object") return;
      const { config, clock: req, mixer: lv } = r.parts(data);
      /* THE CONFIG PART GOES AS IT ALWAYS DID — exclusions are not stripped here: a v1 entry's `object` and `dyad`
       * are READ, as labels the owners compare (night 59: "tones win, and the face says so once"); they are only
       * never WRITTEN. THE GAMUT (night 48): absent means the WHOLE FIELD, totally — an étude saved before that night
       * carries no key and restores to today's behaviour, never acquiring one. THE ONE PLACE A RESTORE READS SILENCE
       * AS A VALUE: it was ruled for the gamut by name, and is kept as ruled — not a precedent for the bench. */
      announce(doc, CONFIG_CHANGED, { ...config, gamut: "gamut" in config ? config.gamut : null });
      if (Object.keys(req).length) announce(doc, CLOCK, req);
      if (Object.keys(lv).length) announce(doc, MIXER, lv);
    },
    onChange: (fn) => { subs.add(fn); return () => subs.delete(fn); },
  };
  RECORDS.set(doc, r);
  return r;
}
