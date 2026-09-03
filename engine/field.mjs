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
 * tonight engine/tetrad-sequence.mjs stated the same six numbers as a literal
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
 * below it except string 2, which sits a major third above string 3 (G→B). */
export const OPEN_MIDI = (() => {
  const open = { 6: 40 };
  for (let s = 6; s > 1; s--) open[s - 1] = open[s] + (s === 3 ? 4 : 5);
  return open;
})();

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
export function field({ key, scale = "major", ref = 0 } = {}) {
  if (!SCALE_STEPS[scale])
    throw new Error(`field: unknown scale "${scale}" — chord.mjs knows ${Object.keys(SCALE_STEPS).join(", ")}`);
  if (!Number.isInteger(ref) || ref < 0 || ref > 6)
    throw new Error(`field: the reference is a degree 0..6, not ${ref}`);
  const notes = scaleNotes(key, scale);
  const pcs = notes.map((n) => n.pc);
  return {
    key, scale, ref, notes, pcs,
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
    const midi = OPEN_MIDI[string] + f;
    const keyDeg = fld.pcs.indexOf(mod12(midi));
    if (keyDeg >= 0)
      out.push({ string, fret: f, midi, deg: degAgainst(keyDeg, fld.ref), keyDeg });
  }
  return out;
}

/* ---------------- load-time structural assertions (golden rule 1) ---------------- */

{
  // the derived tuning obeys its own named rule, stated independently: six
  // strings, lowest E2, neighbouring gaps all fourths except G→B
  const order = [6, 5, 4, 3, 2, 1];
  if (OPEN_MIDI[6] !== 40) throw new Error("field: string 6 must be E2 (midi 40)");
  for (let i = 1; i < order.length; i++) {
    const gap = OPEN_MIDI[order[i]] - OPEN_MIDI[order[i - 1]];
    if (gap !== (order[i - 1] === 3 ? 4 : 5))
      throw new Error(`field: string ${order[i]} is ${gap} semitones above ${order[i - 1]}`);
  }
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
