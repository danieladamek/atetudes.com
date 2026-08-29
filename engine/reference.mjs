/* reference.mjs — THE REFERENCE TONE, fretted and named (Multetudes child 5).
 *
 * v0.9's placeBass, re-derived (read at line 712, not guessed), with the
 * 08-23 ruling enforced structurally: THE REFERENCE IS A REAL FRETTED NOTE —
 * string, fret, midi — chosen against the frame, never a silent pedal. The
 * carried note-events.mjs still EXEMPTS its bass from the real-string
 * assertion (G11, priced with the release republish); this module is the
 * Route-B answer — its reference cannot exist unfretted.
 *
 * THE THREE RELATIVE OPTIONS ONLY (ruled for 260831): the root, a 3rd below,
 * a 5th below — offsets in SCALE STEPS from the chord degree (a 3rd below is
 * two degrees down, a 5th below four; degree arithmetic, not pitch tables).
 * A FIXED reference is deliberately unbuilt: with one bar, fixed and relative
 * are indistinguishable — the distinction only exists once the chords change,
 * which is child 7's progression.
 *
 * PLACEMENT: string 6 if free, else string 5, else REFUSED BY NAME — both
 * reference strings in the set is a fact the face must say, not an empty
 * board. The nearest occurrence of the target degree to the window's centre
 * wins; outside the window it is a STRETCH — a real reach past the box,
 * carried as a flag (full colour, unmarked, per the ruling — the flag is for
 * prose, not for a badge).
 *
 * THE COMPOSITE IS NAMED BY READ-BACK, never by a reverse lookup table
 * (v0.9's REV_QUAL stays in v0.9): the interval set over the reference is
 * ASSEMBLED into a symbol by named degree rules, then the symbol is parsed
 * back through chord.mjs — the one owner of the quality vocabulary — and the
 * parse must reproduce the pitch-class set exactly, or the name is refused
 * (null, honestly unnamed). A name this module returns has survived the
 * round trip through the parser.
 *
 * Pure: no DOM, no globals, load-time structural assertions.
 */
import { field, notesOn, OPEN_MIDI } from "./field.mjs";
import { parseChord } from "./chord.mjs";

const mod12 = (x) => ((x % 12) + 12) % 12;
const mod7 = (x) => ((x % 7) + 7) % 7;

/** scale-step offsets below the chord degree — degree arithmetic (§ above) */
export const REF_OFFSET = { root: 0, third: -2, fifth: -4 };

/**
 * placeReference(kind, chordDeg, fld, strings, pos) →
 *   { note: {string,fret,midi,deg,keyDeg} | null, stretch, reason }
 * kind "none" → note null, reason null (a block, not an error).
 * Both reference strings taken → note null, reason NAMES the refusal.
 */
export function placeReference(kind, chordDeg, fld, strings, pos) {
  if (kind === "none" || kind == null) return { note: null, stretch: false, reason: null };
  if (!(kind in REF_OFFSET))
    throw new Error(`placeReference: "${kind}" is not a reference this engine knows`);
  if (!Number.isInteger(chordDeg) || chordDeg < 0 || chordDeg > 6)
    throw new Error(`placeReference: chordDeg 0..6, not ${chordDeg}`);
  const free = [6, 5].filter((s) => !strings.includes(s));
  if (!free.length)
    return { note: null, stretch: false,
      reason: "strings 5 and 6 are both in the set — the reference is refused: it has nowhere to sit" };
  const bs = free[0];
  const keyDeg = mod7(chordDeg + REF_OFFSET[kind]);
  const cands = notesOn(bs, fld).filter((n) => n.keyDeg === keyDeg);
  if (!cands.length)
    return { note: null, stretch: false,
      reason: `that reference tone is not on string ${bs}` };
  cands.sort((a, b) => Math.abs(a.fret - pos.centre) - Math.abs(b.fret - pos.centre));
  const note = { ...cands[0] };
  // A REAL FRETTED NOTE, asserted — the exemption this module refuses to inherit
  if (note.string !== bs || !Number.isInteger(note.fret) || note.fret < 0
      || note.midi !== OPEN_MIDI[note.string] + note.fret)
    throw new Error("placeReference: the reference must be a real fretted note — string, fret, midi agreeing");
  if (note.keyDeg !== keyDeg)
    throw new Error("placeReference: the placed degree disagrees with the asked one");
  return { note, stretch: note.fret < pos.fLo || note.fret > pos.fHi, reason: null };
}

/* ---------------- the composite name, by assembly and read-back ---------------- */

/** assemble a quality suffix from the interval set over the bass (0 ∈ rel).
 * Named degree rules only — which THIRD, which FIFTH, which SEVENTH the set
 * carries — never a set-to-name table. Returns null when no rule speaks. */
function assembleSuffix(rel) {
  const has = (iv) => rel.includes(iv);
  const third = has(4) ? "maj" : has(3) ? "min" : null;
  // 6 is the b5 only when no perfect fifth claims the slot; over one it is #11
  const fifth = has(7) ? "P" : has(6) ? "b5" : has(8) ? "#5" : null;
  const seventh = has(11) ? "maj7" : has(10) ? "b7" : null;
  const nine = has(2), eleven = has(5), thirteen = has(9);

  let base;
  if (seventh === "maj7") {
    base = third === "min" ? (nine ? "mMaj7add9" : "mMaj7")
      : nine ? "maj9" : "maj7";
  } else if (seventh === "b7") {
    if (third === "min") base = thirteen ? "m13" : eleven ? "m11" : nine ? "m9" : "m7";
    else if (third === null && eleven) base = nine ? "9sus4" : "7sus4";
    else base = thirteen ? "13" : eleven ? "11" : nine ? "9" : "7";
  } else if (third === null && !thirteen) {
    // no third, no seventh: the suspensions own these shapes
    if (nine && fifth === "P" && !eleven) base = "sus2";
    else if (eleven && fifth === "P" && !nine) base = "sus4";
    else return null;
  } else if (third !== null) {
    if (thirteen && fifth === "P") base = third === "min" ? "m6" : "6";
    else if (thirteen && fifth === "b5" && third === "min") base = "dim7";
    else base = third === "min" ? (fifth === "b5" ? "dim" : "m")
      : fifth === "#5" ? "aug" : "";
    if (nine && !seventh && base !== "dim7") base += "add9";
  } else return null;

  // the altered/absent slots, said out loud in the symbol
  if (fifth === "b5" && !["dim", "dim7"].includes(base.replace("add9", ""))) base += "b5";
  if (fifth === "#5" && base !== "aug") base += "#5";
  if (fifth === "P" && has(6)) base += "#11";
  if (third === null && !base.includes("sus")) base += "no3";
  if (fifth === null && !base.includes("no3")) base += "no5";
  else if (fifth === null && base.includes("no3")) base += "no5";
  return base;
}

/**
 * compositeOver(fld, refKeyDeg, tonePcs) → { bassName, name | null }
 * The name is the reference's spelled note plus an assembled suffix that
 * SURVIVED the round trip: parseChord(name) reproduces exactly the composite
 * pitch-class set. No survivor → name null (honestly unnamed).
 */
export function compositeOver(fld, refKeyDeg, tonePcs) {
  const bassPc = fld.pcs[refKeyDeg];
  const bassName = fld.notes[refKeyDeg].name;
  const want = [...new Set([bassPc, ...tonePcs].map(mod12))].sort((a, b) => a - b);
  const rel = [...new Set(want.map((pc) => mod12(pc - bassPc)))].sort((a, b) => a - b);
  const suffix = assembleSuffix(rel);
  if (suffix == null) return { bassName, name: null };
  let parsed;
  try { parsed = parseChord(bassName + suffix); } catch { return { bassName, name: null }; }
  const got = [...new Set(parsed.pcs.map(mod12))].sort((a, b) => a - b);
  if (got.join(",") !== want.join(","))
    return { bassName, name: null };           // the read-back is the law: no round trip, no name
  return { bassName, name: bassName + suffix };
}

/* ---------------- load-time structural assertions (golden rule 1) ---------------- */

{
  const fld = field({ key: "Bb", scale: "major" });
  const pos = { fLo: 5, fHi: 8, centre: 20 / 3 };

  // R19's own sentence: the B♭ tetrad over a 3rd below IS Gm9 — assembled,
  // parsed back, and the read-back agreed
  const tet = [0, 2, 4, 6].map((o) => fld.pcs[o % 7]);
  const third = placeReference("third", 0, fld, [4, 3, 2, 1], pos);
  if (!third.note || third.note.string !== 6)
    throw new Error("reference: a 3rd below the B♭ chord must fret on string 6");
  if (fld.pcs[third.note.keyDeg] !== 7)
    throw new Error("reference: a 3rd below B♭ is G");
  const gm9 = compositeOver(fld, third.note.keyDeg, tet);
  if (gm9.name !== "Gm9")
    throw new Error(`reference: B♭maj7 over G must read back as Gm9, not ${gm9.name}`);

  // the root option is the chord's own root, and the composite is the chord
  const root = placeReference("root", 0, fld, [4, 3, 2, 1], pos);
  if (!root.note || fld.pcs[root.note.keyDeg] !== 10)
    throw new Error("reference: the root option under B♭ must fret a B♭");
  if (compositeOver(fld, root.note.keyDeg, tet).name !== "Bbmaj7")
    throw new Error("reference: B♭maj7 over its own root must name itself");

  // both reference strings taken → refused by name, never an empty silence
  const refusal = placeReference("root", 0, fld, [6, 5, 4, 3], pos);
  if (refusal.note !== null || !/strings 5 and 6 are both in the set/.test(refusal.reason || ""))
    throw new Error("reference: a full set must refuse by name");

  // a placement outside the window is a stretch, said as a flag
  const far = placeReference("root", 0, fld, [4, 3, 2, 1], { fLo: 0, fHi: 3, centre: 1.5 });
  if (!far.note || far.stretch !== true || far.note.fret >= 0 && far.note.fret <= 3)
    throw new Error("reference: a reach past the box must carry the stretch flag");
}
