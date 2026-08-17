/* tetrad-sequence.mjs — THE DERIVED PASS: a scale, a cycle, and the voiced
 * chords that walk it.
 *
 * Tetradetudes child 3's engine half. Pure, DOM-free (§4.2.2). This is the one
 * home of the musical derivation the door's modules need: the fretboard stage
 * and the chord timeline both consume it, and neither restates any part of it.
 * Without this module each would have to derive the pass for itself, which is
 * the duplicated-fact defect §4.3 exists to prevent.
 *
 * WHAT IT DERIVES, AND WHAT IT DELEGATES
 * --------------------------------------
 *   scale degrees        engine/chord.mjs        scaleNotes()
 *   chord vocabulary     engine/chord.mjs        parseChord() — never restated
 *   voicing shapes       engine/tetrad-voicings  tetradCandidates()
 *   which voicing        engine/isolation.mjs    chooseVoicings()
 *   voice identity       engine/voice-identity   keysOf() / voiceLines()
 *
 * Nothing here re-implements any of those. What IS derived here is the pass:
 * which chords, in which order, and the tetrad built on each scale degree.
 *
 * THE FROZEN STUDY IS THE REFERENCE, NOT THE SOURCE. Tetrad Voice Leading
 * ships 1.16 MB of PRECOMPUTED voicings; this computes the same music instead
 * of carrying it, which is what "small from birth" (§5.2.1) actually means.
 */
import { parseChord, scaleNotes, SCALE_STEPS } from "./chord.mjs";
import { tetradCandidates } from "./tetrad-voicings.mjs";
import { chooseVoicings, makeZone } from "./isolation.mjs";
import { keysOf } from "./voice-identity.mjs";

/* ---------------- the instrument ---------------- */

/** Standard tuning, in the family's string numbering (string-sets.mjs: 1 is the
 * HIGHEST pitch). Asserted at load against the named rule rather than trusted:
 * every neighbouring pair is a perfect fourth except G→B, which is a major
 * third. A typo'd number would otherwise silently retune the app. */
export const OPEN_MIDI = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };

/** the three four-string groups the frozen study offers, derived by sliding a
 * window of four down the six strings rather than listed */
export const STRING_SETS = [0, 1, 2].map((offset) => {
  const strings = [6, 5, 4, 3].map((s) => s - offset);
  return {
    offset, strings,
    opens: strings.map((s) => OPEN_MIDI[s]),
    label: strings.map((s) => ["", "e", "B", "G", "D", "A", "E"][s]).join("–"),
  };
});

/* ---------------- the cycles ---------------- */

/** Each cycle is ONE number: how many scale degrees the root moves each step.
 * Every value is coprime with 7, so each cycle visits all seven degrees and
 * returns home in eight chords — derived, not enumerated per cycle. */
export const CYCLES = {
  scale: { step: 1, name: "Scaler",
    rule: "every voice climbs one scale step — the whole tetrad walks the scale" },
  thirds: { step: 2, name: "Cycling 3rds", rule: "roots move in 3rds — the root rises to the new 7th" },
  fourths: { step: 3, name: "Cycling 4ths",
    rule: "R and 3 hold (becoming the new 5 and 7); the 5 falls to the new root, the 7 falls to the new 3rd" },
  fifths: { step: 4, name: "Cycling 5ths",
    rule: "the mirror of the 4ths: 5 and 7 hold, becoming the new root and 3rd" },
  sixths: { step: 5, name: "Cycling 6ths", rule: "roots move in 6ths — the 7th falls to the new root" },
};

/** the degrees a cycle visits, home included at both ends */
export function cycleDegrees(cycle, startDegree = 0) {
  const c = CYCLES[cycle];
  if (!c) throw new Error(`unknown cycle "${cycle}" — the named ones are ${Object.keys(CYCLES).join(", ")}`);
  const out = [];
  for (let i = 0; i <= 7; i++) out.push((startDegree + i * c.step) % 7);
  return out;
}

/* ---------------- the diatonic tetrads ---------------- */

/* Structure → symbol. chord.mjs parses symbol → structure and owns every
 * quality; to go the other way this SEARCHES its spellings rather than keeping
 * a second interval table. The list below is a search space, not a fact: every
 * answer comes from parseChord, so a quality can never be spelled two ways. */
const QUALITY_SEARCH = ["maj7", "m7", "7", "m7b5", "dim7", "mMaj7", "maj7#5", "6", "m6"];

/** the tetrad on one scale degree: stack thirds WITHIN the scale */
export function tetradOnDegree(key, scaleType, degree) {
  const notes = scaleNotes(key, scaleType);
  const tones = [0, 2, 4, 6].map((k) => notes[(degree + k) % 7]);
  const rootName = tones[0].name;
  const want = tones.map((t) => ((t.pc - tones[0].pc) % 12 + 12) % 12).sort((a, b) => a - b);

  for (const q of QUALITY_SEARCH) {
    const ch = parseChord(rootName + q);
    const have = ch.intervals.map((i) => ((i % 12) + 12) % 12).sort((a, b) => a - b);
    if (have.length === want.length && have.every((x, i) => x === want[i]))
      return { chord: ch, degree, rootName, symbol: ch.symbol };
  }
  throw new Error(`no chord.mjs spelling for the tetrad on degree ${degree + 1} of ${key} ${scaleType} ` +
    `(intervals ${want.join(",")}) — extend the search, never a second interval table`);
}

/** a roman numeral, DERIVED from the chord's own parsed quality */
export function romanOf({ chord, degree }) {
  const upper = ["I", "II", "III", "IV", "V", "VI", "VII"][degree];
  const minorish = chord.triad === "min" || chord.triad === "dim";
  const base = minorish ? upper.toLowerCase() : upper;
  const tag = chord.seventh === "m7b5" ? "ø7"
    : chord.seventh === "dim7" ? "°7"
    : chord.triad === "aug" || chord.intervals.includes(8) ? "+7"
    : chord.seventh === "maj7" ? "maj7"
    : chord.seventh === "mMaj7" ? "mΔ7"
    : chord.seventh === "m7" ? "-7"
    : chord.seventh === "7" ? "7" : "";
  return base + tag;
}

/* ---------------- the voiced pass ---------------- */

/** THE PASS. Everything the door renders, derived from the configuration alone.
 *
 * The bottom tone is a SEED, not an invariant — child 1 measured that on the
 * frozen payload: Scaler holds its inversion for all eight steps, but the
 * cycling engines rotate through two or four, because their rules hold some
 * voices and move others. So it constrains the FIRST chord's candidates and
 * the optimizer decides the rest, which is exactly what the payload does. */
export function tetradPass({
  key = "C", scale = "major", cycle = "fourths", bottom = 0, setIndex = 0,
  nfrets = 15, families = ["drop2"], startDegree = 0,
} = {}) {
  if (!SCALE_STEPS[scale]) throw new Error(`unknown scale "${scale}" — chord.mjs knows ${Object.keys(SCALE_STEPS).join(", ")}`);
  const set = STRING_SETS[setIndex];
  if (!set) throw new Error(`unknown string set ${setIndex} — there are ${STRING_SETS.length}`);
  if (!Number.isInteger(bottom) || bottom < 0 || bottom > 3)
    throw new Error(`bottom tone ${bottom} is not one of 0..3 (R, 3, 5, 7)`);

  const degrees = cycleDegrees(cycle, startDegree);
  const chords = degrees.map((d) => {
    const t = tetradOnDegree(key, scale, d);
    return { ...t, roman: romanOf(t) };
  });

  /* The seed: only the first chord is restricted to the requested bass tone.
   * `chooseVoicings` ties by candidate order, so the lowest position wins. */
  let first = true;
  const candidatesFor = (ch) => {
    const all = tetradCandidates(ch.chord, { set: set.opens, nfrets, strings: set.strings, families });
    if (!first) return all;
    first = false;
    const seeded = all.filter((v) => v.bass === bottom);
    return seeded.length ? seeded : all;
  };

  const zone = makeZone({ string: set.strings[0], frets: [5, 6, 7] });
  const voicings = chooseVoicings(chords, {
    zone, placement: "free", setLowHigh: set.strings, nfrets, candidatesFor,
  });

  for (const [i, v] of voicings.entries())
    if (!v) throw new Error(`no voicing for ${chords[i].symbol} on ${set.label} within ${nfrets} frets`);

  return {
    key, scale, cycle, bottom, setIndex, set,
    rule: CYCLES[cycle].rule,
    steps: chords.map((c, i) => ({
      ...c, voicing: voicings[i], keys: keysOf(voicings[i]),
      /** each voice's degree label against ITS OWN chord — the frozen study's
       * "held notes recolor as their function changes", derived per step */
      labels: voicings[i].notes.map((n) => degreeLabel(c.chord, n.midi)),
    })),
  };
}

/** the label a pitch wears inside a chord: its interval from that chord's root,
 * named. Derived from the chord's own root, so a held pitch relabels itself
 * when the chord under it changes — which is the whole point. */
export function degreeLabel(chord, midi) {
  const iv = (((midi - chord.root.pc) % 12) + 12) % 12;
  return { 0: "R", 1: "b9", 2: "9", 3: "b3", 4: "3", 5: "11", 6: "b5",
    7: "5", 8: "#5", 9: "6", 10: "b7", 11: "7" }[iv];
}

/* ---------------- load-time assertions (golden rule 1, site form) ---------------- */

{
  // standard tuning, checked against its named rule rather than trusted
  const order = [6, 5, 4, 3, 2, 1];
  for (let i = 1; i < order.length; i++) {
    const gap = OPEN_MIDI[order[i]] - OPEN_MIDI[order[i - 1]];
    const expect = order[i - 1] === 3 ? 4 : 5;         // G→B is a major third
    if (gap !== expect)
      throw new Error(`tetrad-sequence: string ${order[i]} is ${gap} semitones above ${order[i - 1]}, expected ${expect}`);
  }
  // every cycle visits all seven degrees and comes home
  for (const c of Object.keys(CYCLES)) {
    const d = cycleDegrees(c);
    if (d.length !== 8 || d[0] !== 0 || d[7] !== 0)
      throw new Error(`tetrad-sequence: cycle ${c} does not return home in eight chords`);
    if (new Set(d.slice(0, 7)).size !== 7)
      throw new Error(`tetrad-sequence: cycle ${c} does not visit all seven degrees`);
  }
  // the fourths cycle is the one the frozen study names in prose: I IV vii iii vi ii V I
  if (cycleDegrees("fourths").join(",") !== "0,3,6,2,5,1,4,0")
    throw new Error("tetrad-sequence: the fourths cycle is not I IV vii iii vi ii V I");
  // C major's diatonic sevenths, the textbook row
  const row = [0, 1, 2, 3, 4, 5, 6].map((d) => tetradOnDegree("C", "major", d).symbol).join(" ");
  if (row !== "Cmaj7 Dm7 Em7 Fmaj7 G7 Am7 Bm7b5")
    throw new Error("tetrad-sequence: C major's diatonic sevenths are wrong — got " + row);
}
