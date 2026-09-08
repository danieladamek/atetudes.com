/* field.mjs — THE FIELD: a key, a scale, and a reference tone that re-roots it
 * (Multetudes child 1; multetudes-prd.md §2.1).
 *
 * The model this encodes, Daniel's: choose a key and the whole neck shows
 * every note of it; everything else is a NARROWING of that constant field. The
 * reference tone re-roots the collection — the same seven notes read against a
 * different centre, WHICH IS WHAT A MODE IS. The collection never changes;
 * only the reading does.
 *
 * THE TWO DEGREES, AND WHY BOTH EXIST. Every note the field offers carries
 *
 *   deg      its degree AGAINST THE REFERENCE — what colours and labels read.
 *            Under C Dorian (the B♭ collection re-rooted on C), C wears R.
 *   keyDeg   its index IN THE KEY'S SCALE — what chords and the bass read.
 *            The diatonic stack of thirds on a note is the same three or four
 *            pitches whatever the reference is; a chord builder that read
 *            `deg` would re-spell every chord when the user changed the mode.
 *
 * Conflating them is the bug this pair exists to prevent (the item's words),
 * and the pair is asserted apart at load and in engine/tests/field.test.mjs.
 *
 * WHAT IS DELEGATED: the seven spelled degrees come from engine/chord.mjs's
 * scaleNotes() — the letters climb one per degree, accidentals derived — and
 * are NOT re-derived here. The tuning is derived below from its named rule
 * and this is ITS ONE DECLARATION SITE (260920, night 26 item 1): until
 * tonight the tetrad sequence module stated the same six numbers as a literal
 * and the tests pinned the two equal — a pin that two copies agree keeps both
 * alive and turns a divergence into a test failure rather than an
 * impossibility. Now tetrad-sequence and every hub consumer import from here;
 * the test pins that exactly one declaration exists, so the class of defect
 * cannot return. (An alternate tuning will move through this one value.)
 *
 * Pure: no DOM, no audio, no app state. Load-time structural assertions.
 */
import { scaleNotes, SCALE_STEPS } from "./chord.mjs";

/** Standard tuning, DERIVED from the named rule rather than typed: string 6 is
 * E2 (midi 40), and each higher string sits a perfect fourth above the one
 * below it except string 2, which sits a major third above string 3 (G→B).
 *
 * THE DEFAULT, NOT THE TUNING (night 44, 261008 — alternate tunings, item 1).
 * The tuning is state on the field object: `fld.opens`, derived by opensOf()
 * from an optional `tuning` and asserted WELL-FORMED. This constant is what
 * an absent tuning means, and the reference the ±6 window is measured
 * against; nothing may read it as THE tuning (tuning.test.mjs greps for it). */
export const OPEN_MIDI = (() => {
  const open = { 6: 40 };
  for (let s = 6; s > 1; s--) open[s - 1] = open[s] + (s === 3 ? 4 : 5);
  return open;
})();

export const STRINGS = [6, 5, 4, 3, 2, 1];   // low → high, the six strings there are (§9: six, only)
export const TUNING_RANGE = 6;                // ±6 semitones per string — Daniel's figure, three whole tones

/** WELL-FORMEDNESS, not identity (design note §6): six strings numbered 1..6
 * each present once; each open within ±6 semitones of its standard value;
 * strictly ascending in pitch 6 → 1 — no crossing, because slots are
 * pitch-ordered and a crossed tuning would change what every stored figure
 * means, silently (§4). DADGAD is legal; a swapped pair, a missing string
 * and a transposed digit are not — tuning.test.mjs proves all three. */
export function assertOpens(opens) {
  if (!opens || typeof opens !== "object") throw new Error("field: a tuning is six open midis, one per string 1..6");
  const keys = Object.keys(opens).map(Number).sort((a, b) => a - b);
  if (keys.join() !== "1,2,3,4,5,6")
    throw new Error(`field: a tuning names six strings 1..6, each once — got ${keys.join(",") || "nothing"}`);
  for (const s of STRINGS) {
    if (!Number.isInteger(opens[s])) throw new Error(`field: string ${s}'s open midi is not an integer`);
    if (Math.abs(opens[s] - OPEN_MIDI[s]) > TUNING_RANGE)
      throw new Error(`field: string ${s} at midi ${opens[s]} is outside the ±${TUNING_RANGE} semitone window around standard (${OPEN_MIDI[s]})`);
  }
  for (let i = 1; i < STRINGS.length; i++)
    if (opens[STRINGS[i]] <= opens[STRINGS[i - 1]])
      throw new Error(`field: string ${STRINGS[i]} (midi ${opens[STRINGS[i]]}) does not ascend above string ${STRINGS[i - 1]} (midi ${opens[STRINGS[i - 1]]}) — a crossed tuning is refused`);
  return opens;
}

/** the opens a tuning names: `tuning` is a map from string number to a
 * semitone OFFSET from standard (§7's shape — `{6: -2}` reads "drop the
 * sixth"); absent strings are at standard; no tuning at all is standard. */
export function opensOf(tuning) {
  const opens = {};
  for (const s of STRINGS) {
    const off = tuning && s in tuning ? tuning[s] : 0;
    if (!Number.isInteger(off)) throw new Error(`field: string ${s}'s tuning offset must be an integer number of semitones`);
    opens[s] = OPEN_MIDI[s] + off;
  }
  if (tuning) for (const k of Object.keys(tuning))
    if (!STRINGS.includes(Number(k))) throw new Error(`field: string ${k} is not a real string — a tuning names strings 1..6`);
  return assertOpens(opens);
}

/** The mode names, one per degree per scale — the brief §2.1's table, verbatim.
 * One name each where several are current; aliases are a decision, not a build
 * problem (the brief's words). Names are vocabulary, not derived musical fact —
 * what IS derived is everything the name is attached to. */
export const MODES = {
  major: ["Ionian", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"],
  harm: ["Harmonic minor", "Locrian ♮6", "Ionian ♯5", "Dorian ♯4", "Phrygian dominant",
    "Lydian ♯2", "Altered ♭♭7"],
  mel: ["Melodic minor", "Dorian ♭2", "Lydian augmented", "Lydian dominant", "Mixolydian ♭6",
    "Locrian ♮2", "Altered"],
};

const mod7 = (n) => ((n % 7) + 7) % 7;
const mod12 = (n) => ((n % 12) + 12) % 12;

/** the degree a keyDeg wears against the reference — re-rooting as arithmetic */
export const degAgainst = (keyDeg, ref) => mod7(keyDeg - ref);

/**
 * field({ key, scale, ref }) → the field value:
 *   notes     the seven spelled degrees, [{ name, pc }], indexed by keyDeg
 *   pcs       their pitch classes, same order
 *   ref       the reference degree (0..6; 0 = the key itself)
 *   refNote   the spelled note the field is read against
 *   modeName  what that reading is called (MODES[scale][ref])
 *   degOf(pc) the degree a pitch class wears against the reference, or -1
 */
export function field({ key, scale = "major", ref = 0, tuning = null } = {}) {
  if (!SCALE_STEPS[scale])
    throw new Error(`field: unknown scale "${scale}" — chord.mjs knows ${Object.keys(SCALE_STEPS).join(", ")}`);
  if (!Number.isInteger(ref) || ref < 0 || ref > 6)
    throw new Error(`field: the reference is a degree 0..6, not ${ref}`);
  const notes = scaleNotes(key, scale);
  const pcs = notes.map((n) => n.pc);
  /* THE TUNING IS THE FIELD'S FACT (night 44): the opens are derived from the
   * optional offsets and asserted well-formed here, once; `tuning` is restated
   * total (every string's offset, zeros included) so a reader never guesses. */
  const opens = opensOf(tuning);
  const tuningTotal = {};
  for (const s of STRINGS) tuningTotal[s] = opens[s] - OPEN_MIDI[s];
  return {
    key, scale, ref, notes, pcs, opens, tuning: tuningTotal,
    refNote: notes[ref],
    modeName: MODES[scale][ref],
    degOf: (pc) => {
      const i = pcs.indexOf(mod12(pc));
      return i < 0 ? -1 : degAgainst(i, ref);
    },
  };
}

/** every note of the field on one string, ascending by fret:
 * [{ string, fret, midi, deg, keyDeg }] — BOTH degrees, always. */
export function notesOn(string, fld, nfrets = 15) {
  if (!Number.isInteger(string) || string < 1 || string > 6)
    throw new Error(`notesOn: string ${string} is not a real string`);
  const out = [];
  for (let f = 0; f <= nfrets; f++) {
    const midi = fld.opens[string] + f;   // the FIELD's opens — the tuning is its fact
    const keyDeg = fld.pcs.indexOf(mod12(midi));
    if (keyDeg >= 0)
      out.push({ string, fret: f, midi, deg: degAgainst(keyDeg, fld.ref), keyDeg });
  }
  return out;
}

/* ---------------- load-time structural assertions (golden rule 1) ---------------- */

{
  /* IDENTITY BECAME WELL-FORMEDNESS (night 44, 261008 — design note §6, the
   * register's entry). The block that stood here asserted "string 6 is E2 and
   * the gaps are fourths except G→B" — an identity check wearing structural
   * clothes, true only of standard tuning. A tuning is now asserted WELL-FORMED
   * (assertOpens, above) wherever one is built. ONE identity check is kept, on
   * purpose and on the DEFAULT only: the constant is the reference the ±6
   * window is measured against, so its own named rule must hold or the window
   * is measured against a typo — the transposed-digit case the old block
   * caught (`{6: 40}` → `{6: 4}`) is caught HERE, not by well-formedness, which
   * would pass a shifted standard against itself. */
  if (OPEN_MIDI[6] !== 40) throw new Error("field: the default's rule — string 6 is E2 (midi 40)");
  for (let i = 1; i < STRINGS.length; i++)
    if (OPEN_MIDI[STRINGS[i]] - OPEN_MIDI[STRINGS[i - 1]] !== (STRINGS[i - 1] === 3 ? 4 : 5))
      throw new Error(`field: the default's rule — string ${STRINGS[i]} sits a fourth (a third over G) above string ${STRINGS[i - 1]}`);
  assertOpens(OPEN_MIDI);   // and the default is itself a well-formed tuning
  // the mode-name table is total and unambiguous per scale
  for (const [sc, names] of Object.entries(MODES)) {
    if (names.length !== 7 || new Set(names).size !== 7)
      throw new Error(`field: MODES.${sc} must carry seven distinct names`);
    if (!SCALE_STEPS[sc]) throw new Error(`field: MODES names a scale chord.mjs does not know: ${sc}`);
  }
  const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
  for (const key of ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"])
    for (const scale of Object.keys(SCALE_STEPS)) {
      const f0 = field({ key, scale });
      // seven distinct pitch classes
      if (f0.pcs.length !== 7 || new Set(f0.pcs).size !== 7)
        throw new Error(`field: ${key} ${scale} is not seven distinct pitch classes`);
      // the spelling's letters ascend one per degree
      const l0 = LETTERS.indexOf(f0.notes[0].name[0]);
      for (let i = 0; i < 7; i++)
        if (f0.notes[i].name[0] !== LETTERS[mod7(l0 + i)])
          throw new Error(`field: ${key} ${scale} degree ${i + 1} is spelled ${f0.notes[i].name} — letters must ascend one per degree`);
      // re-rooting is a rotation and never changes the collection
      for (let ref = 0; ref < 7; ref++) {
        const fr = field({ key, scale, ref });
        if (fr.pcs.join() !== f0.pcs.join())
          throw new Error(`field: re-rooting ${key} ${scale} on degree ${ref + 1} changed the collection`);
        if (fr.degOf(fr.refNote.pc) !== 0)
          throw new Error(`field: the reference of ${key} ${scale} ref ${ref} does not read as its own root`);
        for (let kd = 0; kd < 7; kd++)
          if (degAgainst(kd, ref) !== mod7(kd - ref))
            throw new Error("field: re-rooting is not a rotation");
      }
    }
}
