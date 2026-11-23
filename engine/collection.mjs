/* collection.mjs — THE COLLECTION ENGINE, mod N (Chromatetudes child 1, 261122).
 *
 * Brief: notes/specs/chromatetudes — the collection door, v0.1.md §1–§3.
 * Pure: no DOM, no audio, no state. Touches no other engine file.
 *
 * A COLLECTION IS A STEP LIST SUMMING TO 12, and only that. Its N notes are
 * degrees 0..N−1 from the reference; every piece of arithmetic here is mod N.
 * Seven-note keys are NOT this module's — they are Multetudes', and chord.mjs's
 * SCALE_STEPS (with its seven-step throw, which is correct) is not touched.
 *
 * THE STACK IS A CYCLE, NOT A DEPTH. From degree d take every k-th note until
 * the cycle closes: {d, d+k, d+2k, …} mod N, N / gcd(N, k) members. A stacking
 * interval k is OFFERED when that count is 3 or 4 (a triad or a tetrad the
 * family can voice) and k ≤ N/2 (k and N−k are one cycle). The offered
 * intervals and the chords are this rule's OUTPUT — nothing below lists them.
 *
 * THE QUALITY IS chord.mjs's. A cycle's pitch classes are matched against the
 * intervals chord.mjs derives for "6", "m6", "dim7" and "aug"; no interval is
 * restated here. Which member is CALLED the root of a symmetric chord is not
 * decided here (brief §6.2 — the door names the chord): chordOn returns the
 * stacked-from degree, the members, and every pitch class chord.mjs accepts as
 * a root.
 *
 * SPELLING — RULED, Daniel 261122 (brief §3). Every note is named by its
 * semitone offset from the reference (R ♭2 2 ♭3 3 4 ♯4 5 ♭6 6 ♭7 7) and spelled
 * on that degree's LETTER — chord.mjs's spellRole, the letter-stepping speller
 * the family already has (it agrees with scaleNotes on the seven plain degrees,
 * asserted below). An ALTERED degree that would read as a double accidental,
 * C♭, F♭, E♯ or B♯ is shown as the plain (natural) note; the plain degrees keep
 * the family's spelling untouched (F♯'s seventh stays E♯, as in Multetudes).
 *
 * chromaticSpeller (rule C) is NOT this rule and is not used: it names a pitch
 * class that has no degree (CR-1). A collection member always has a degree.
 * The two disagree by design — C major's pc 8 is G♯ under rule C and A♭ (the
 * ♭6) here — and that difference is recorded in the 261122 scrum note.
 *
 * COLOUR COMES FROM THE DEGREE NAME, never from the letter of the shown note:
 * in D♭ the ♭6 is shown as A, and A is the fifth's letter in D♭ — it is still
 * the ♭6, and `fam` (the §2.1 family) says "6".
 */
import { parseChord, spellRole, scaleNotes, pcOf, accOf, LETTER_PC } from "./chord.mjs";

const mod = (n, m) => ((n % m) + m) % m;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/** the app's twelve keys — the family's reference tones */
export const KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

/** THE SEVEN COLLECTIONS OF v0.1 — brief §1. Step lists and nothing else; every
 * other fact (N, degrees, offered stacks, chords) is derived from the steps. */
export const COLLECTIONS = {
  "sixth-dim-major": { name: "sixth-diminished, major", steps: [2, 2, 1, 2, 1, 1, 2, 1] },
  "sixth-dim-minor": { name: "sixth-diminished, minor", steps: [2, 1, 2, 2, 1, 1, 2, 1] },
  "whole-tone":      { name: "whole-tone",              steps: [2, 2, 2, 2, 2, 2] },
  "octatonic-wh":    { name: "octatonic, whole-half",   steps: [2, 1, 2, 1, 2, 1, 2, 1] },
  "octatonic-hw":    { name: "octatonic, half-whole",   steps: [1, 2, 1, 2, 1, 2, 1, 2] },
  "augmented":       { name: "augmented",               steps: [3, 1, 3, 1, 3, 1] },
  "chromatic":       { name: "chromatic",               steps: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
};

/** a step list is a collection only when it is positive whole steps summing to an octave */
export function assertSteps(steps, what = "a collection") {
  if (!Array.isArray(steps) || steps.length < 2) throw new Error(`${what}: a collection is a list of steps`);
  if (!steps.every((s) => Number.isInteger(s) && s > 0)) throw new Error(`${what}: every step is a positive whole number of semitones`);
  const sum = steps.reduce((a, b) => a + b, 0);
  if (sum !== 12) throw new Error(`${what}: the steps sum to ${sum}, not 12 — a collection spans one octave`);
  return steps;
}
for (const [id, c] of Object.entries(COLLECTIONS)) assertSteps(c.steps, `collection ${id}`);

function stepsOf(id) {
  const c = COLLECTIONS[id];
  if (!c) throw new Error(`unknown collection "${id}" — the named ones are ${Object.keys(COLLECTIONS).join(", ")}`);
  return c.steps;
}

/** the offsets of a step list: 0 and every partial sum short of the octave */
export const offsetsOf = (steps) => steps.slice(0, -1).reduce((acc, s) => [...acc, acc[acc.length - 1] + s], [0]);

/* ---------------- the degree names, derived from the major scale ---------------- */

/* The plain degrees are the major scale's offsets (chord.mjs's own steps, through
 * scaleNotes). An offset between two plain degrees is the flat of the one above —
 * except the one below the fifth, which is the raised fourth: the perfect fifth is
 * never altered in this vocabulary (brief §3's list: … 4 ♯4 5 …). One rule, one
 * exception, both stated; the names are its output. */
const MAJOR_OFFSETS = scaleNotes("C", "major").map((n) => n.pc);   // [0,2,4,5,7,9,11]
const PLAIN = (i) => (i === 0 ? "R" : String(i + 1));
export const DEGREE_NAMES = Array.from({ length: 12 }, (_, o) => {
  const i = MAJOR_OFFSETS.indexOf(o);
  if (i >= 0) return { name: PLAIN(i), fam: PLAIN(i), plain: i, acc: 0 };
  if (o + 1 === MAJOR_OFFSETS[4]) return { name: "♯" + PLAIN(3), fam: PLAIN(3), plain: 3, acc: 1 };
  const up = MAJOR_OFFSETS.indexOf(o + 1);
  return { name: "♭" + PLAIN(up), fam: PLAIN(up), plain: up, acc: -1 };
});

/** the role spellRole steps by for a plain degree index (R 2 3 4 5 6 7 → R 9 3 11 5 13 7) */
const ROLE_OF = ["R", 9, 3, 11, 5, 13, 7];

/** the shown name is respelled only when the letter spelling of an ALTERED degree is one of these */
const awkward = (name) => Math.abs(accOf(name)) > 1 || ["Cb", "Fb", "E#", "B#"].includes(name);

/** the natural note of a pitch class, or null when the pitch class is a black key */
const naturalOf = (pc) => Object.keys(LETTER_PC).find((L) => LETTER_PC[L] === mod(pc, 12)) || null;

/** one note of a collection, spelled by the ruled rule */
export function spellDegree(key, offset) {
  const d = DEGREE_NAMES[mod(offset, 12)];
  const pc = mod(pcOf(key) + offset, 12);
  const letterName = spellRole(key, ROLE_OF[d.plain], pc);   // the degree's own letter — the family's speller
  let name = letterName;
  if (d.acc !== 0 && awkward(letterName)) {
    name = naturalOf(pc);
    if (!name) throw new Error(`collection: the ${d.name} of ${key} spells as ${letterName} and has no plain note to fall back on`);
  }
  return { name, spelled: letterName, pc, degName: d.name, fam: d.fam };
}

/**
 * collection({ key, id }) → { id, name, key, N, steps, notes }
 * notes: N spelled notes [{ name, pc, degree, offset, degName, fam, spelled }],
 * degree 0..N−1; `spelled` is the letter spelling before any respelling.
 */
export function collection({ key, id }) {
  if (!KEYS.includes(key)) throw new Error(`collection: "${key}" is not one of the twelve keys (${KEYS.join(" ")})`);
  const steps = stepsOf(id);
  const offs = offsetsOf(steps);
  const notes = offs.map((offset, degree) => ({ ...spellDegree(key, offset), degree, offset }));
  return { id, name: COLLECTIONS[id].name, key, N: steps.length, steps, notes };
}

/** the other reading of a note — derived from its pitch class, for the info note.
 * A respelled note's other reading is its letter spelling (A in D♭ ↔ B𝄫); any
 * other note's is the neighbouring letter with the fewest accidentals. */
export function enharmonicOf(note) {
  const name = typeof note === "string" ? note : note.name;
  const pc = typeof note === "string" ? pcOf(note) : note.pc;
  if (typeof note === "object" && note.spelled && note.spelled !== note.name) return note.spelled;
  const LET = ["C", "D", "E", "F", "G", "A", "B"];
  const at = LET.indexOf(name[0]);
  const read = (L) => { let a = mod(pc - LETTER_PC[L], 12); if (a > 6) a -= 12; return Math.abs(a) > 2 ? null : L + (a > 0 ? "#".repeat(a) : "b".repeat(-a)); };
  const cands = [read(LET[mod(at - 1, 7)]), read(LET[mod(at + 1, 7)])].filter(Boolean);
  cands.sort((x, y) => Math.abs(accOf(x)) - Math.abs(accOf(y)));
  const out = cands[0];
  if (!out || out === name || pcOf(out) !== pc) throw new Error(`enharmonicOf: ${name} has no other reading`);
  return out;
}

/* ---------------- the stack ---------------- */

/** the cycle size of interval k in an N-note collection */
export const cycleSize = (N, k) => N / gcd(N, mod(k, N) || N);

/** the offered stacking intervals: cycle of 3 or 4 members, k ≤ N/2 — derived, never listed */
export function stackIntervals(id) {
  const N = stepsOf(id).length;
  const out = [];
  for (let k = 1; k <= N / 2; k++) if ([3, 4].includes(cycleSize(N, k))) out.push(k);
  return out;
}

/** the four qualities a cycle may be — chord.mjs's names; the intervals are chord.mjs's */
export const QUALITIES = ["6", "m6", "dim7", "aug"];
const QUALITY_PCS = Object.fromEntries(QUALITIES.map((q) => [q, parseChord("C" + q).intervals.map((x) => mod(x, 12))]));
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

/** the chord.mjs quality of a pitch-class set, and every pitch class it accepts as a root */
export function qualityOf(pcs) {
  for (const q of QUALITIES) {
    const roots = pcs.filter((r) => sameSet(pcs.map((p) => mod(p - r, 12)), QUALITY_PCS[q]));
    if (roots.length) return { quality: q, roots };
  }
  return null;
}

/**
 * chordOn(coll, degree, k) → { degree, k, members, pcs, notes, quality, roots }
 * The cycle {d, d+k, d+2k, …} mod N to closure. `members` are degrees in cycle
 * order from d; `roots` are the pitch classes chord.mjs accepts as root (one for
 * a sixth chord, every member for a dim7 or an augmented triad).
 */
export function chordOn(coll, degree, k) {
  const N = coll.N;
  if (!Number.isInteger(degree)) throw new Error(`chordOn: degree ${degree} is not a whole number`);
  if (!Number.isInteger(k) || k < 1 || k >= N) throw new Error(`chordOn: a stacking interval is 1..${N - 1} in a ${N}-note collection, not ${k}`);
  const size = cycleSize(N, k);
  if (k > N / 2) throw new Error(`chordOn: k=${k} is the same cycle as k=${N - k} in ${coll.name} — ask for ${N - k}`);
  if (size === 2) throw new Error(`chordOn: k=${k} in ${coll.name} is a two-note cycle — it is a dyad, not offered`);
  const d0 = mod(degree, N);
  const members = Array.from({ length: size }, (_, i) => mod(d0 + i * k, N));
  const pcs = members.map((m) => coll.notes[m].pc);
  if (size > 4) {
    const steps = [...pcs].sort((a, b) => a - b).map((p, i, a) => mod((a[i + 1] ?? a[0] + 12) - p, 12) || 12);
    const sameAs = Object.entries(COLLECTIONS).find(([, c]) => c.steps.length === steps.length &&
      c.steps.some((_, r) => c.steps.every((s, i) => s === steps[(i + r) % steps.length])));
    throw new Error(`chordOn: k=${k} in ${coll.name} is ${size} notes — ` +
      (sameAs ? `it is the ${sameAs[1].name} scale, not a chord` : "a scale, not a chord"));
  }
  const q = qualityOf(pcs);
  if (!q) throw new Error(`chordOn: the cycle on degree ${d0} of ${coll.name} (k=${k}) matches none of chord.mjs's ${QUALITIES.join(", ")}`);
  return { degree: d0, k, members, pcs, notes: members.map((m) => coll.notes[m]), quality: q.quality, roots: q.roots };
}

/** the walk's chords, degree 0..N−1, and how many distinct chords they are */
export function walkChords(coll, k) {
  const chords = Array.from({ length: coll.N }, (_, d) => chordOn(coll, d, k));
  const distinct = new Set(chords.map((c) => [...c.pcs].sort((a, b) => a - b).join(","))).size;
  return { chords, distinct };
}

/* ---------------- load-time assertions (golden rule 1) ---------------- */
{
  // the degree vocabulary is the brief's, in order
  if (DEGREE_NAMES.map((d) => d.name).join(" ") !== "R ♭2 2 ♭3 3 4 ♯4 5 ♭6 6 ♭7 7")
    throw new Error("collection: the degree names drifted from R ♭2 2 ♭3 3 4 ♯4 5 ♭6 6 ♭7 7");
  for (const key of KEYS) {
    // the plain degrees keep the family's spelling (scaleNotes major)
    const major = scaleNotes(key, "major");
    MAJOR_OFFSETS.forEach((o, i) => {
      const s = spellDegree(key, o);
      if (s.name !== major[i].name) throw new Error(`collection: ${key}'s ${s.degName} is ${s.name}, the family spells it ${major[i].name}`);
    });
    for (let o = 0; o < 12; o++) {
      const s = spellDegree(key, o);
      if (pcOf(s.name) !== s.pc) throw new Error(`collection: ${key} offset ${o} spelled ${s.name}, the wrong pitch`);
      if (DEGREE_NAMES[o].acc !== 0 && awkward(s.name)) throw new Error(`collection: ${key}'s ${s.degName} is still ${s.name}`);
    }
  }
  // the brief's §2 table, as the rule's output (C; transposition is the speller's, asserted in the suite)
  const expect = { "sixth-dim-major": [[2], 2], "sixth-dim-minor": [[2], 2], "whole-tone": [[2], 2], "octatonic-wh": [[2], 2],
    "octatonic-hw": [[2], 2], "augmented": [[2], 2], "chromatic": [[3, 4], null] };
  for (const [id, [ks, n]] of Object.entries(expect)) {
    if (stackIntervals(id).join() !== ks.join()) throw new Error(`collection: ${id} offers k=${stackIntervals(id)}, the rule gives ${ks}`);
    if (n !== null && walkChords(collection({ key: "C", id }), ks[0]).distinct !== n)
      throw new Error(`collection: ${id} must hold ${n} distinct chords`);
  }
  const chrom = collection({ key: "C", id: "chromatic" });
  if (walkChords(chrom, 3).distinct !== 3 || walkChords(chrom, 4).distinct !== 4)
    throw new Error("collection: the chromatic holds three diminished sevenths and four augmented triads");
  // the sixth-diminished pair, unchanged from 261115
  const sd = collection({ key: "C", id: "sixth-dim-major" });
  if (chordOn(sd, 0, 2).pcs.join() !== "0,4,7,9" || chordOn(sd, 1, 2).pcs.join() !== "2,5,8,11")
    throw new Error("collection: C sixth-diminished must stack C6 {0,4,7,9} and the dim7 {2,5,8,11}");
}
