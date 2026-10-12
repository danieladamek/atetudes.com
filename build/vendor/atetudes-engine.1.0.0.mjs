/* atetudes-engine 1.0.0 — the At-Etudes engine subset RiffRaft vendors. BUILT FILE: never edit it.
 * Built by hub/tools/vendor.mjs with the door build's inliner (build.mjs moduleChunk).
 * Contains: engine/chord.mjs, engine/field.mjs, engine/atchart.mjs, engine/structures.mjs, engine/markdown.mjs, engine/numeral.mjs
 * Rebuild under a NEW version; a version's bytes never change. The manifest beside it pins this file's sha256. */

/* ===== engine/chord.mjs ===== */
const __m_engine_chord_mjs = (() => {
/* chord.mjs — the shared chord-symbol parser.
 *
 * Pure function: chord symbol string → structured chord. No DOM, no state.
 * Built once for Triadetudes' break-down mode (roadmap §3.1) and the .atchart.md
 * format (Substitute Teacher PRD §3) — the single largest piece of shared code
 * in the family, per the family note.
 *
 * Doctrine: every quality is a NAMED RULE deriving an interval set from pitch-class
 * math; the module asserts structural sanity of every rule at load (root present,
 * ascending, unique). Nothing is hand-placed per chord.
 */

// ---------- pitch-class primitives (mirrors the shipped Triadetudes core) ----------

const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function accOf(name) {
  let a = 0;
  for (const ch of name.slice(1)) a += ch === "#" ? 1 : ch === "b" ? -1 : 0;
  return a;
}

function pcOf(name) {
  return (((LETTER_PC[name[0]] + accOf(name)) % 12) + 12) % 12;
}

const mod12 = (n) => ((n % 12) + 12) % 12;

// ---------- named quality rules ----------
// Base triads + seventh/sixth structures as interval sets from the root.
// deg maps chord-degree → interval so alterations are transforms, not new tables.

const DEG = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 9: 14, 11: 17, 13: 21 };

const TRIADS = {
  maj: [DEG[1], DEG[3], DEG[5]],
  min: [DEG[1], DEG[3] - 1, DEG[5]],
  dim: [DEG[1], DEG[3] - 1, DEG[5] - 1],
  aug: [DEG[1], DEG[3], DEG[5] + 1],
  sus4: [DEG[1], DEG[4], DEG[5]],
  sus2: [DEG[1], DEG[2], DEG[5]],
};

// seventh-family rules: triad + the named seventh/sixth
const SEVENTHS = {
  maj7: { triad: "maj", add: DEG[7] },
  7: { triad: "maj", add: DEG[7] - 1 },
  m7: { triad: "min", add: DEG[7] - 1 },
  m7b5: { triad: "dim", add: DEG[7] - 1 },
  dim7: { triad: "dim", add: DEG[7] - 2 },
  mMaj7: { triad: "min", add: DEG[7] },
  6: { triad: "maj", add: DEG[6] },
  m6: { triad: "min", add: DEG[6] },
  "7sus4": { triad: "sus4", add: DEG[7] - 1 },
};

// extension degrees stack on top of a seventh structure
const EXT_DEGREES = { 9: DEG[9], 11: DEG[11], 13: DEG[13] };

// ---------- load-time structural assertions (golden rule 1, site form) ----------

function assertRule(name, ivs) {
  if (ivs[0] !== 0) throw new Error(`rule ${name}: no root`);
  for (let i = 1; i < ivs.length; i++)
    if (ivs[i] <= ivs[i - 1]) throw new Error(`rule ${name}: not ascending`);
  if (new Set(ivs.map(mod12)).size !== ivs.length)
    throw new Error(`rule ${name}: duplicate pitch class`);
}
for (const [n, ivs] of Object.entries(TRIADS)) assertRule(n, ivs);
for (const [n, r] of Object.entries(SEVENTHS))
  assertRule(n, [...TRIADS[r.triad], r.add]);

// ---------- tokenizer ----------

const ROOT_RE = /^([A-G])(#{1,2}|b{1,2})?/;

const QUALITY_TOKENS = [
  // order matters: longest / most specific first
  ["maj13", { seventh: "maj7", exts: [9, 13] }],
  ["maj11", { seventh: "maj7", exts: [9, 11] }],
  ["maj9", { seventh: "maj7", exts: [9] }],
  ["maj7", { seventh: "maj7" }],
  ["Δ7", { seventh: "maj7" }],
  ["Δ", { seventh: "maj7" }],
  ["mMaj7", { seventh: "mMaj7" }],
  ["mM7", { seventh: "mMaj7" }],
  ["minMaj7", { seventh: "mMaj7" }],
  ["m13", { seventh: "m7", exts: [9, 13] }],
  ["m11", { seventh: "m7", exts: [9, 11] }],
  ["m9", { seventh: "m7", exts: [9] }],
  ["m7b5", { seventh: "m7b5" }],
  ["ø7", { seventh: "m7b5" }],
  ["ø", { seventh: "m7b5" }],
  ["m7", { seventh: "m7" }],
  ["m6", { seventh: "m6" }],
  ["min7", { seventh: "m7" }],
  ["min", { triad: "min" }],
  ["m", { triad: "min" }],
  ["-7", { seventh: "m7" }],
  ["-", { triad: "min" }],
  ["dim7", { seventh: "dim7" }],
  ["°7", { seventh: "dim7" }],
  ["o7", { seventh: "dim7" }],
  ["dim", { triad: "dim" }],
  ["°", { triad: "dim" }],
  ["aug", { triad: "aug" }],
  ["+", { triad: "aug" }],
  ["13sus4", { seventh: "7sus4", exts: [9, 13] }],
  ["9sus4", { seventh: "7sus4", exts: [9] }],
  ["7sus4", { seventh: "7sus4" }],
  ["7sus", { seventh: "7sus4" }],
  ["sus4", { triad: "sus4" }],
  ["sus2", { triad: "sus2" }],
  ["sus", { triad: "sus4" }],
  ["13", { seventh: "7", exts: [9, 13] }],
  ["11", { seventh: "7", exts: [9, 11] }],
  ["9", { seventh: "7", exts: [9] }],
  ["7", { seventh: "7" }],
  ["6", { seventh: "6" }],
];

const ALTER_RE = /^(b5|#5|b9|#9|#11|b13|alt|add9|add11|add13|no3|no5)/;

// the named rule for "alt": b9 #9 #5 over a dominant — the tritone-sub hearing
const ALT_SET = ["b9", "#9", "#5"];

const ALTER_APPLY = {
  b5: (ivs) => replaceDeg(ivs, DEG[5], DEG[5] - 1),
  "#5": (ivs) => replaceDeg(ivs, DEG[5], DEG[5] + 1),
  b9: (ivs) => addIv(ivs, DEG[9] - 1),
  "#9": (ivs) => addIv(ivs, DEG[9] + 1),
  "#11": (ivs) => addIv(ivs, DEG[11] + 1),
  b13: (ivs) => addIv(ivs, DEG[13] - 1),
  add9: (ivs) => addIv(ivs, DEG[9]),
  add11: (ivs) => addIv(ivs, DEG[11]),
  add13: (ivs) => addIv(ivs, DEG[13]),
  no3: (ivs) => ivs.filter((iv) => mod12(iv) !== 4 && mod12(iv) !== 3),
  no5: (ivs) => ivs.filter((iv) => mod12(iv) !== 7),
};

function replaceDeg(ivs, from, to) {
  return ivs.map((iv) => (iv === from ? to : iv));
}
function addIv(ivs, iv) {
  return ivs.includes(iv) ? ivs : [...ivs, iv];
}

// ---------- the parser ----------

/**
 * parseChord("Dm7") →
 * { input, root:{name,pc}, bass:{name,pc}|null, triad:"min", seventh:"m7"|null,
 *   extensions:[9,...], alterations:["b9",...], intervals:[0,3,7,10], pcs:[2,5,9,0],
 *   symbol: canonical re-spelling }
 * Throws on unparseable input (callers present the message; bad user text is data,
 * not a crash — see ST PRD §8.2).
 */
function parseChord(input) {
  if (typeof input !== "string") throw new Error("chord symbol must be a string");
  const src = input.trim();
  if (!src) throw new Error("empty chord symbol");

  // slash bass: split on the LAST slash whose right side parses as a note
  let head = src,
    bassName = null;
  const slash = src.lastIndexOf("/");
  if (slash > 0) {
    const right = src.slice(slash + 1).trim();
    if (ROOT_RE.test(right) && right.replace(ROOT_RE, "") === "") {
      head = src.slice(0, slash).trim();
      bassName = right;
    }
  }

  const rm = head.match(ROOT_RE);
  if (!rm) throw new Error(`no root in "${input}"`);
  const rootName = rm[1] + (rm[2] || "");
  let rest = head.slice(rm[0].length);

  /* "+M7" — the tetrad payload's spelling of the augmented-major seventh
   * (harmonic and melodic minor's III). A SPELLING ALIAS, not a chord rule:
   * the structure [0,4,8,11] already lives in the maj7 rule + the #5 transform,
   * and this rewrite routes the spelling through both. No new interval data —
   * a second home for that fact is the defect this project keeps finding
   * (260819.6; the gap was pinned in tetrad-voicings.test.mjs from 260817.1). */
  if (rest.startsWith("+M7")) rest = "maj7#5" + rest.slice(3);

  // quality token (longest match wins by table order)
  let triad = "maj",
    seventh = null,
    exts = [];
  for (const [tok, spec] of QUALITY_TOKENS) {
    if (rest.startsWith(tok)) {
      // "m" must not swallow the m of "maj" (table order already guards; belt+braces)
      rest = rest.slice(tok.length);
      if (spec.seventh) {
        seventh = spec.seventh;
        triad = SEVENTHS[seventh].triad;
      } else triad = spec.triad;
      exts = [...(spec.exts || [])];
      break;
    }
  }

  // alterations, in written order; parens transparent
  const alterations = [];
  let guard = 0;
  while (rest.length) {
    if (++guard > 12) throw new Error(`unparseable tail "${rest}" in "${input}"`);
    if (rest[0] === "(" || rest[0] === ")" || rest[0] === " ") {
      rest = rest.slice(1);
      continue;
    }
    const am = rest.match(ALTER_RE);
    if (!am) throw new Error(`unrecognized "${rest}" in "${input}"`);
    alterations.push(am[1]);
    rest = rest.slice(am[1].length);
  }

  // "alt" expands to the named rule, and implies a plain dominant if none given
  let alts = alterations.flatMap((a) => (a === "alt" ? ALT_SET : [a]));
  if (alterations.includes("alt") && !seventh) {
    seventh = "7";
    triad = "maj";
  }

  // derive intervals: triad → seventh add → extensions → alteration transforms
  let intervals = [...TRIADS[triad]];
  if (seventh) intervals = [...TRIADS[SEVENTHS[seventh].triad], SEVENTHS[seventh].add];
  for (const e of exts) intervals = addIv(intervals, EXT_DEGREES[e]);
  for (const a of alts) {
    const fn = ALTER_APPLY[a];
    if (!fn) throw new Error(`no rule for alteration "${a}"`);
    intervals = fn(intervals);
  }
  intervals = [...intervals].sort((a, b) => a - b);

  // structural assertions on the derived result — never ship an unasserted chord
  if (intervals[0] !== 0 && !alterations.includes("no3"))
    if (!intervals.includes(0)) throw new Error(`derived chord lost its root: "${input}"`);
  const pcs = intervals.map((iv) => mod12(pcOf(rootName) + iv));
  if (new Set(pcs).size !== pcs.length)
    throw new Error(`derived duplicate pitch class in "${input}"`);

  return {
    input: src,
    root: { name: rootName, pc: pcOf(rootName) },
    bass: bassName ? { name: bassName, pc: pcOf(bassName) } : null,
    triad,
    seventh,
    extensions: exts,
    alterations,
    intervals,
    pcs,
    symbol: canonicalSymbol(rootName, triad, seventh, exts, alterations, bassName),
  };
}

// ---------- canonical re-spelling (the serializer's half of round-trip) ----------

function canonicalSymbol(root, triad, seventh, exts, alterations, bass) {
  let q;
  const top = exts.length ? Math.max(...exts) : null;
  if (seventh === "maj7") q = top ? `maj${top}` : "maj7";
  else if (seventh === "7") q = top ? String(top) : "7";
  else if (seventh === "m7") q = top ? `m${top}` : "m7";
  else if (seventh === "m7b5") q = "m7b5";
  else if (seventh === "dim7") q = "dim7";
  else if (seventh === "mMaj7") q = "mMaj7";
  else if (seventh === "6") q = "6";
  else if (seventh === "m6") q = "m6";
  else if (seventh === "7sus4") q = top ? `${top}sus4` : "7sus4";
  else
    q = { maj: "", min: "m", dim: "dim", aug: "aug", sus4: "sus4", sus2: "sus2" }[triad];
  const alt = alterations.filter((a) => a !== "alt").join("");
  const altTag = alterations.includes("alt") ? "alt" : alt;
  return root + q + altTag + (bass ? "/" + bass : "");
}

// ---------- roman-numeral tokens (parsed, not resolved — resolution needs a key) ----------

const ROMAN_RE = /^(b|#)?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(°|o|ø|\+)?(maj7|m7b5|7|maj9|9|6)?$/;
const ROMAN_DEG = { i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6 };

/** parseRoman("iim7") → {degree:1, lowered:false, caseQuality:"min", seventh:"m7"} or null */
function parseRoman(tok) {
  const m = tok.trim().match(ROMAN_RE);
  if (!m) return null;
  const numeral = m[2];
  const lower = numeral === numeral.toLowerCase();
  let caseQuality = lower ? "min" : "maj";
  if (m[3] === "°" || m[3] === "o") caseQuality = "dim";
  if (m[3] === "ø") caseQuality = "dim";
  if (m[3] === "+") caseQuality = "aug";
  return {
    degree: ROMAN_DEG[numeral.toLowerCase()],
    accidental: m[1] === "b" ? -1 : m[1] === "#" ? 1 : 0,
    caseQuality,
    halfDim: m[3] === "ø",
    seventh: m[4] || null,
  };
}

// ---------- roman-numeral RESOLUTION (needs a key — the consumer's half) ----------
// Triadetudes v0.6 break-down mode resolves "ii7 V7 Imaj7" against the étude's
// selected key and scale. Scale steps are named rules asserted at load, exactly
// like the quality rules above; the resolved symbol is re-parsed by parseChord,
// so every resolution passes the parser's own structural assertions.

const SCALE_LETTERS = ["C", "D", "E", "F", "G", "A", "B"];

const SCALE_STEPS = {
  major: [2, 2, 1, 2, 2, 2, 1],
  harm: [2, 1, 2, 2, 1, 3, 1],
  mel: [2, 1, 2, 2, 2, 2, 1],
};
for (const [n, steps] of Object.entries(SCALE_STEPS)) {
  if (steps.length !== 7) throw new Error(`scale ${n}: needs 7 steps`);
  if (steps.reduce((a, b) => a + b, 0) !== 12)
    throw new Error(`scale ${n}: steps must sum to an octave`);
}

/** scaleNotes("Eb","major") → 7 spelled degrees [{name,pc},…] — one per letter */
function scaleNotes(tonic, scaleType = "major") {
  const steps = SCALE_STEPS[scaleType];
  if (!steps) throw new Error(`unknown scale type "${scaleType}"`);
  let idx = SCALE_LETTERS.indexOf(tonic[0]);
  if (idx < 0) throw new Error(`bad tonic "${tonic}"`);
  const notes = [{ name: tonic, pc: pcOf(tonic) }];
  for (let i = 0; i < 6; i++) {
    idx = (idx + 1) % 7;
    const L = SCALE_LETTERS[idx];
    const target = mod12(notes[notes.length - 1].pc + steps[i]);
    let alt = (target - LETTER_PC[L]) % 12;
    if (alt > 6) alt -= 12;
    if (alt < -6) alt += 12;
    notes.push({
      name: L + (alt === 1 ? "#" : alt === 2 ? "##" : alt === -1 ? "b" : alt === -2 ? "bb" : ""),
      pc: target,
    });
  }
  return notes;
}

// the numeral's case and figures name the quality — the user's numeral wins
// over the key's diatonic default ("iv" in major is a borrowed minor chord)
function romanQualitySuffix(r) {
  if (r.seventh === "maj7") return r.caseQuality === "min" ? "mMaj7" : "maj7";
  if (r.seventh === "maj9") return r.caseQuality === "min" ? "mMaj7" : "maj9";
  if (r.seventh === "7")
    return r.halfDim ? "m7b5"
      : r.caseQuality === "dim" ? "dim7"
      : r.caseQuality === "min" ? "m7"
      : r.caseQuality === "aug" ? "7#5"
      : "7";
  if (r.seventh === "9") return r.halfDim ? "m7b5" : r.caseQuality === "min" ? "m9" : "9";
  if (r.seventh === "6") return r.caseQuality === "min" ? "m6" : "6";
  if (r.halfDim) return "m7b5"; // ø with no figure still implies the seventh
  return { maj: "", min: "m", dim: "dim", aug: "aug" }[r.caseQuality];
}

/**
 * resolveRoman("ii7","C") → { symbol:"Dm7", parsed:<parseChord result> }.
 * Returns null when the token is not a roman numeral (callers then try
 * parseChord directly). The degree comes from the key's spelled scale; a
 * leading b/# bends the spelled note, not the pitch class table (bVII in
 * Eb major is Db, not C#).
 */
/**
 * THE CHROMATIC SPELLER — RULE C (260923, night 31; ruled, replacing the binary
 * this header posed on 260920 and 260921 — BOTH of its readings were wrong).
 *
 *   chromaticSpeller("F", "major") → (midi) => { name, oct }
 *
 * THE LAW. A chromatic pitch class is spelled as the alteration of whichever
 * DIATONIC NEIGHBOUR requires the FEWEST accidentals. Ties go to the NEARER
 * neighbour. Remaining ties go to the parent collection's direction — and the
 * parent collection is the RELATIVE MAJOR for `harm` and `mel` (the scale's own
 * degree index 2: scaleNotes(key, scaleType)[2] — C harm → E♭ → E♭ major) and
 * the tonic's own for `major`. Derived, never tabled; no fourth SCALE_STEPS
 * entry, which would put a fourth scale in the app's selector as a side effect.
 *
 * WHY THE OLD LAW WAS WRONG — read this before "restoring" it. The retired law
 * was "keep the letter, move the accidental". That is resolveRoman's law, and
 * it is correct THERE: a roman numeral names a DEGREE, and ♭II of D♭ is always
 * the letter above the tonic — it has a letter because it has a degree.
 * chromaticSpeller names a PITCH CLASS WITH NO DEGREE. CR-1, ratified: "a
 * chromatic note is never a member of the field." No membership, no degree,
 * no letter to keep. Importing resolveRoman's law into the speller was a
 * category error, and it cost double accidentals in every minor key: measured
 * 260923 over the app's 12 keys × 3 scales × 12 pitch classes (432 spellings),
 * the parallel-major reading spelled 55 doubles, the relative-major reading
 * 56, and rule C ONE (D♭ harmonic minor). resolveRoman itself is untouched.
 *
 * THIS IS NOT A RETURN TO THE RETIRED COPIES' BUG. Those drew a WRONG PITCH
 * (D♭ major's pc 2 as "Eb", a semitone off). Rule C preserves the pitch by
 * construction: every candidate is a neighbour plus or minus an exact semitone
 * count, and PITCH HONESTY is pinned over every key and scale.
 *
 * THE ±2 GUARD STAYS even though rule C makes it unreachable for the app's
 * twelve keys: a guard that never fires is cheap; removing it is how the next
 * wrong pitch ships.
 *
 * KNOWN LIMIT: C harmonic minor's pc 6 comes out G♭ where ♯4 would be commoner.
 * It is genuinely contextual — a raised fourth or a lowered fifth depends on the
 * harmony — and the speller has no harmony to consult. Said, not papered over.
 *
 * The written octave follows the LETTER (a Cb/Cbb sounds below its C; a B#/B##
 * above its B), which is why those two lines survive here verbatim.
 */
function chromaticSpeller(key, scaleType = "major") {
  const notes = scaleNotes(key, scaleType);
  const byPc = new Map(notes.map((n) => [n.pc, n.name]));
  // the parent collection: the relative major for harm and mel (degree index 2), the tonic's own for major
  const parentKey = scaleType === "major" ? key : notes[2].name;
  const parentFlat = scaleNotes(parentKey, "major").some((n) => n.name.includes("b"));
  const respell = (name, delta) => {
    const acc = accOf(name) + delta;
    if (Math.abs(acc) > 2)
      throw new Error(`spelling a chromatic note in ${key} ${scaleType} needs ${Math.abs(acc)} accidentals`);
    return name[0] + (acc > 0 ? "#".repeat(acc) : "b".repeat(-acc));
  };
  return (midi) => {
    const pc = mod12(midi);
    let name = byPc.get(pc);
    if (!name) {
      let dn = 1; while (!byPc.has(mod12(pc - dn))) dn++;   // the diatonic neighbour below, raised by dn
      let up = 1; while (!byPc.has(mod12(pc + up))) up++;   // the diatonic neighbour above, lowered by up
      const below = respell(byPc.get(mod12(pc - dn)), dn), above = respell(byPc.get(mod12(pc + up)), -up);
      const cost = (nm) => Math.abs(accOf(nm));
      if (cost(below) !== cost(above)) name = cost(below) < cost(above) ? below : above;   // fewest accidentals
      else if (dn !== up) name = dn < up ? below : above;                                     // then the nearer neighbour
      else name = parentFlat ? above : below;                                                 // then the parent's direction
    }
    let oct = Math.floor(midi / 12) - 1;
    if (name.startsWith("Cb")) oct += 1;
    if (name.startsWith("B#")) oct -= 1;
    return { name, oct };
  };
}

/** THE ALTERED DEGREE (Design Spec v1.4 §2.6, 260930): a non-diatonic note
 * wears the colour of the degree it ALTERS, and its interior is that degree
 * with its accidental — both read off the LETTER of the speller's answer.
 * Every chromatic pitch sits in a whole-tone gap and so neighbours TWO
 * degrees; rule C (night 31) already chose one, and the letter names it:
 * in C harmonic minor D♭ → D → the 2nd, G♭ → G → the 5th, B♭ → B → the 7th
 * (verified against the live speller, 260928). Derived, never tabled.
 * Returns { name, deg (0..6, the §2.1 family index), acc (the alteration
 * against the scale's OWN spelling of that degree), label ("b7", "#4", or
 * the plain degree when diatonic), chromatic }. */
/** THE CHORD SPELLS ITS OWN TONES (night 46, role A): the 7th of C7 is B♭ — the root's LETTER
 * stepped by the role (R 3 5 7 9 11 13 → 0 2 4 6 1 3 5 letters), the accidental read off the pitch
 * class against that letter's natural. Letters and pitch-class math, never a table; §2.6's "the
 * LETTER of its spelled name" for a chord-supplied tone is the chord's letter, not the key's. */
function spellRole(rootName, role, pc) {
  const STEPS = { R: 0, 3: 2, 5: 4, 7: 6, 9: 1, 11: 3, 13: 5 };
  const step = STEPS[String(role)];
  if (step === undefined) throw new Error(`spellRole: "${role}" is not a chord role`);
  const rootIdx = SCALE_LETTERS.indexOf(rootName[0]);
  if (rootIdx < 0) throw new Error(`spellRole: "${rootName}" has no letter`);
  const letter = SCALE_LETTERS[(rootIdx + step) % 7];
  const natural = [0, 2, 4, 5, 7, 9, 11][SCALE_LETTERS.indexOf(letter)];
  let acc = ((mod12(pc) - natural) % 12 + 12) % 12; if (acc > 6) acc -= 12;
  if (Math.abs(acc) > 2) throw new Error(`spellRole: the ${role} of ${rootName} would need ${Math.abs(acc)} accidentals`);
  return letter + (acc > 0 ? "#".repeat(acc) : "b".repeat(-acc));
}

function alteredDegree(key, scaleType = "major") {
  const spell = chromaticSpeller(key, scaleType);
  const notes = scaleNotes(key, scaleType);
  const major = scaleNotes(notes[0].name, "major");   // the accidental is read against the MAJOR degree — how a player names it (b7, #4, b2)
  const keyIdx = SCALE_LETTERS.indexOf(notes[0].name[0]);
  const scalePcs = new Set(notes.map((n) => n.pc));
  const DEG = ["R", "2", "3", "4", "5", "6", "7"];
  return (midi, spelled) => {   // `spelled` (night 46): a chord's own spelling of a member — the chord's letter outranks the key's speller
    const name = spelled || spell(midi).name;
    const deg = (SCALE_LETTERS.indexOf(name[0]) - keyIdx + 7) % 7;
    const acc = accOf(name) - accOf(major[deg].name);
    const chromatic = !scalePcs.has(mod12(midi));
    if (chromatic && accOf(name) === accOf(notes[deg].name))
      throw new Error(`alteredDegree: ${name} in ${key} ${scaleType} spells a scale degree yet is off the scale — the speller and the scale disagree`);
    // a diatonic interior is the family label the dots already wear; a chromatic one is the
    // altered degree with its accidental against major (E in C harmonic minor is "3": the major
    // third, a player's name for it; D♭ is "b2", G♭ "b5", B natural in F "#4")
    const label = chromatic ? (acc > 0 ? "#".repeat(acc) : "b".repeat(-acc)) + String(deg + 1) : DEG[deg];
    return { name, deg, acc, label, chromatic };
  };
}

function resolveRoman(tok, key, scaleType = "major") {
  const r = parseRoman(tok);
  if (!r) return null;
  const base = scaleNotes(key, scaleType)[r.degree];
  let name = base.name;
  if (r.accidental) {
    const acc = accOf(name) + r.accidental;
    if (Math.abs(acc) > 2)
      throw new Error(`"${tok}" in ${key}: spelling needs ${Math.abs(acc)} accidentals`);
    name = name[0] + (acc > 0 ? "#".repeat(acc) : "b".repeat(-acc));
  }
  const symbol = name + romanQualitySuffix(r);
  return { symbol, parsed: parseChord(symbol) };
}
return { LETTER_PC, accOf, pcOf, parseChord, parseRoman, SCALE_STEPS, scaleNotes, chromaticSpeller, spellRole, alteredDegree, resolveRoman };
})();

/* ===== engine/field.mjs ===== */
const __m_engine_field_mjs = (() => {
const { scaleNotes, SCALE_STEPS } = __m_engine_chord_mjs;
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

/** Standard tuning, DERIVED from the named rule rather than typed: string 6 is
 * E2 (midi 40), and each higher string sits a perfect fourth above the one
 * below it except string 2, which sits a major third above string 3 (G→B).
 *
 * THE DEFAULT, NOT THE TUNING (night 44, 261008 — alternate tunings, item 1).
 * The tuning is state on the field object: `fld.opens`, derived by opensOf()
 * from an optional `tuning` and asserted WELL-FORMED. This constant is what
 * an absent tuning means, and the reference the ±6 window is measured
 * against; nothing may read it as THE tuning (tuning.test.mjs greps for it). */
const OPEN_MIDI = (() => {
  const open = { 6: 40 };
  for (let s = 6; s > 1; s--) open[s - 1] = open[s] + (s === 3 ? 4 : 5);
  return open;
})();

const STRINGS = [6, 5, 4, 3, 2, 1];   // low → high, the six strings there are (§9: six, only)
const TUNING_RANGE = 6;                // ±6 semitones per string — Daniel's figure, three whole tones

/** WELL-FORMEDNESS, not identity (design note §6): six strings numbered 1..6
 * each present once; each open within ±6 semitones of its standard value;
 * strictly ascending in pitch 6 → 1 — no crossing, because slots are
 * pitch-ordered and a crossed tuning would change what every stored figure
 * means, silently (§4). DADGAD is legal; a swapped pair, a missing string
 * and a transposed digit are not — tuning.test.mjs proves all three. */
function assertOpens(opens) {
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
function opensOf(tuning) {
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
const MODES = {
  major: ["Ionian", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"],
  harm: ["Harmonic minor", "Locrian ♮6", "Ionian ♯5", "Dorian ♯4", "Phrygian dominant",
    "Lydian ♯2", "Altered ♭♭7"],
  mel: ["Melodic minor", "Dorian ♭2", "Lydian augmented", "Lydian dominant", "Mixolydian ♭6",
    "Locrian ♮2", "Altered"],
};

const mod7 = (n) => ((n % 7) + 7) % 7;
const mod12 = (n) => ((n % 12) + 12) % 12;

/** the degree a keyDeg wears against the reference — re-rooting as arithmetic */
const degAgainst = (keyDeg, ref) => mod7(keyDeg - ref);

/**
 * field({ key, scale, ref }) → the field value:
 *   notes     the seven spelled degrees, [{ name, pc }], indexed by keyDeg
 *   pcs       their pitch classes, same order
 *   ref       the reference degree (0..6; 0 = the key itself)
 *   refNote   the spelled note the field is read against
 *   modeName  what that reading is called (MODES[scale][ref])
 *   degOf(pc) the degree a pitch class wears against the reference, or -1
 */
function field({ key, scale = "major", ref = 0, tuning = null } = {}) {
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
function notesOn(string, fld, nfrets = 15) {
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
return { OPEN_MIDI, STRINGS, TUNING_RANGE, assertOpens, opensOf, MODES, degAgainst, field, notesOn };
})();

/* ===== engine/atchart.mjs ===== */
const __m_engine_atchart_mjs = (() => {
const { parseChord } = __m_engine_chord_mjs;
const { opensOf } = __m_engine_field_mjs;
/* atchart.mjs — parser + serializer for the .atchart.md format (v1 + v1.1).
 * Spec: docs/atchart-format.md (v1 ratified 2026-08-08; v1.1 ratified
 * 2026-08-10 — §2.6 app namespaces, §2.7 unknown frontmatter keys, §5 the
 * handoff channel; Update Log 260810.5). Pure, no DOM.
 *
 * Round-trip law (§4): parse→serialize→parse identical; serialize is a fixed
 * point; and — v1.1 — unknown frontmatter keys and apps: entries replay
 * VERBATIM, so a file can pass through several applications and come back
 * whole. A v1 file with no apps: round-trips byte-identically and never
 * acquires a version bump; `atchart: 1.1` becomes writable only when
 * something actually writes an apps: map (writeApp).
 *
 * §2.6 is deliberately schema-free: entries are opaque — carried,
 * round-tripped, never interpreted, never validated. A validator here would
 * be the bug: opacity is the mechanism that keeps unknown app ids and
 * higher-v entries intact across readers.
 */

// v1.2: the tuning key is well-formed by item 1's law (field.mjs), reached here, never restated

const ATCHART_VERSION = 1;
// the body-skeleton slot markers (§2.5 preservation): exported so consumers
// building documents THROUGH this engine (engine/notepad.mjs) can place the
// chart slot without copying the literal
const CHART_SLOT = "\x00CHART\x00";

const DEFAULTS = { key: "C", meter: "4/4" };
const FM_ORDER = ["atchart", "title", "composer", "key", "meter", "tempo", "form", "sections"];

// ---------- frontmatter ----------
// Deliberately tiny YAML subset: scalar lines + [a, b] lists + ONE nested
// block, apps: (§2.6). v1.1 §2.7: every line is kept as a raw segment in
// original order, and the serializer REPLAYS the raw text for anything the
// caller has not changed — unknown keys, comments, odd spacing and apps:
// entries all round-trip byte-identically instead of being re-normalized.

function parseScalar(val) {
  if (val.startsWith("[") && val.endsWith("]"))
    return val.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
  if ((val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'")))
    return val.slice(1, -1);
  return /^-?\d+(\.\d+)?$/.test(val) ? Number(val) : val;
}

function canonLine(k, v) {
  if (Array.isArray(v)) return `${k}: [${v.join(", ")}]`;
  if (v && typeof v === "object") {   // v1.2: the tuning map, flow form, LOW STRING FIRST — 6 → 1, as the strip reads and the format's examples write
    const ks = Object.keys(v).sort((a, b) => Number(b) - Number(a));
    return `${k}: {${ks.map((s) => `${s}: ${serializeFlow(v[s])}`).join(", ")}}`;
  }
  if (typeof v === "string" && /[:#\[\]]/.test(v)) return `${k}: "${v}"`;
  if (typeof v === "string" && v !== v.trim()) return `${k}: "${v}"`;
  return `${k}: ${v}`;
}

function parseFrontmatter(lines) {
  const meta = {};
  const fm = []; // ordered raw segments: {kind:"key"|"verbatim"|"apps", ...}
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line || line.startsWith("#")) { fm.push({ kind: "verbatim", raw }); i++; continue; }
    if (/^\s/.test(raw)) { // indentation outside an apps: block: not ours, keep it
      fm.push({ kind: "verbatim", raw }); i++; continue;
    }
    const ci = line.indexOf(":");
    if (ci < 1) throw new Error(`bad frontmatter line: "${raw}"`);
    const key = line.slice(0, ci).trim();
    const rest = line.slice(ci + 1).trim();
    if (key === "apps" && rest === "") {
      // §2.6: entries are RAW — carried, round-tripped, never interpreted
      const entries = [];
      i++;
      while (i < lines.length && /^\s+\S/.test(lines[i])) {
        const el = lines[i];
        const em = el.trim().match(/^([A-Za-z0-9_-]+):/);
        if (em) entries.push({ id: em[1], raw: el });
        else if (entries.length) entries[entries.length - 1].raw += "\n" + el;
        else entries.push({ id: null, raw: el });
        i++;
      }
      fm.push({ kind: "apps", entries });
      continue;
    }
    const value = key === "tuning" ? parseTuning(rest) : parseScalar(rest);   // v1.2: the one claimed map
    fm.push({ kind: "key", key, raw, value });
    meta[key] = value;
    i++;
  }
  return { meta, fm };
}

const valEq = (a, b) =>
  Array.isArray(a) && Array.isArray(b) ? a.join("\u0000") === b.join("\u0000")
    : a && b && typeof a === "object" && typeof b === "object" ? JSON.stringify(a) === JSON.stringify(b)   // v1.2: a tuning map
    : a === b;

/* ---------- v1.2: the `tuning` key (docs/atchart-format.md §2.1; ratified 261008, landed 261010) ----------
 * A map from string number (1–6, 1 = highest) to a semitone offset from standard, −6…+6; strings
 * absent from the map are at standard; the key absent altogether IS standard, so every v1 and
 * v1.1 file remains valid and unchanged and a file without the key is NEVER rewritten to carry
 * one. Well-formedness — real string numbers, the window, no crossing — is item 1's law in
 * field.mjs (opensOf → assertOpens), reached here so the refusal names the STRING; identity is not
 * checked (a tuning need not have a name). Top-level, not under apps: an instrument fact every
 * reader reads alike. Files written before v1.2 carry no tuning and describe their étude AS IF IN
 * STANDARD — tuning-blind, not tuning-standard; nothing may retro-interpret them. */
function parseTuning(rest) {
  let m;
  try { m = parseFlow(rest); } catch { throw new Error(`tuning: not a map of string number to semitone offset — ${rest}`); }
  if (!m || typeof m !== "object" || Array.isArray(m)) throw new Error(`tuning: not a map of string number to semitone offset — ${rest}`);
  for (const [k, v] of Object.entries(m))
    if (!Number.isInteger(v)) throw new Error(`tuning: string ${k}'s offset must be an integer number of semitones, not ${JSON.stringify(v)}`);
  try { opensOf(m); } catch (e) { throw new Error("tuning: " + String(e.message || e).replace(/^field: /, "")); }
  const out = {};
  for (const [k, v] of Object.entries(m)) out[Number(k)] = v;
  return out;
}

function serializeFrontmatter(meta, fm) {
  if (!fm) { // programmatically-built doc: canonical order, canonical lines
    const keys = [...FM_ORDER.filter((k) => k in meta),
      ...Object.keys(meta).filter((k) => !FM_ORDER.includes(k))]
      .filter((k) => !(k === "tuning" && meta[k] == null));   // v1.2: absent means standard
    return keys.map((k) => canonLine(k, meta[k])).join("\n");
  }
  const out = [];
  const seen = new Set();
  for (const seg of fm) {
    if (seg.kind === "verbatim") { out.push(seg.raw); continue; }
    if (seg.kind === "apps") {
      seen.add("apps");
      out.push("apps:");
      for (const e of seg.entries) out.push(e.raw);
      continue;
    }
    seen.add(seg.key);
    if (!(seg.key in meta)) continue;              // deleted by the caller
    if (valEq(meta[seg.key], seg.value)) out.push(seg.raw); // untouched: VERBATIM
    else out.push(canonLine(seg.key, meta[seg.key]));       // changed: canonical
  }
  for (const k of Object.keys(meta)) {
    if (seen.has(k) || k === "apps") continue;
    // defaults injected at parse are not the file's text — appending them
    // would break §4's byte-identity for files that never wrote them
    if (k in DEFAULTS && valEq(meta[k], DEFAULTS[k])) continue;
    if (k === "tuning" && meta[k] == null) continue;   // v1.2: absent means standard — never written as null, {} or zeros
    out.push(canonLine(k, meta[k]));
  }
  return out.join("\n");
}

// ---------- §2.6: the apps accessor ----------
// The format claims the key `apps` and NOTHING inside it. Entries are opaque
// at parse; readApp materializes ONE entry on demand for its own app;
// writeApp replaces ONE entry with a canonical serialization. Both return
// new documents / fresh objects and never mutate their input. There is no
// schema and no validator, on purpose — a helpful validator here would be
// the bug, because opacity is what lets one file pass through several apps
// (unknown ids, higher payload v) and come back whole.

function parseFlow(src) {
  let i = 0;
  const s = String(src);
  const fail = () => { throw new Error("flow"); };
  const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  function scalarEnd(stops) {
    let j = i;
    while (j < s.length && !stops.includes(s[j])) j++;
    return j;
  }
  function value() {
    ws();
    const c = s[i];
    if (c === "{") {
      i++; const o = {}; ws();
      if (s[i] === "}") { i++; return o; }
      for (;;) {
        ws();
        const m = s.slice(i).match(/^([A-Za-z0-9_.-]+)\s*:/) || fail();
        i += m[0].length;
        o[m[1]] = value();
        ws();
        if (s[i] === ",") { i++; continue; }
        if (s[i] === "}") { i++; return o; }
        fail();
      }
    }
    if (c === "[") {
      i++; const a = []; ws();
      if (s[i] === "]") { i++; return a; }
      for (;;) {
        a.push(value()); ws();
        if (s[i] === ",") { i++; continue; }
        if (s[i] === "]") { i++; return a; }
        fail();
      }
    }
    if (c === '"' || c === "'") {
      const q = c; let out = ""; i++;
      while (i < s.length && s[i] !== q) {
        if (s[i] === "\\" && i + 1 < s.length) { out += s[i + 1]; i += 2; }
        else { out += s[i]; i++; }
      }
      if (s[i] !== q) fail();
      i++; return out;
    }
    const j = scalarEnd([",", "}", "]"]);
    const tok = s.slice(i, j).trim();
    i = j;
    if (tok === "") fail();
    if (tok === "true") return true;
    if (tok === "false") return false;
    if (tok === "null") return null;
    if (/^-?\d+(\.\d+)?$/.test(tok)) return Number(tok);
    return tok; // bare word = string (the spec's own example: `scale: major`)
  }
  const v = value(); ws();
  if (i < s.length) fail();
  return v;
}

function serializeFlow(v) {
  if (v === null) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "string")
    return /^[A-Za-z0-9_.-]+$/.test(v) && !/^-?\d+(\.\d+)?$/.test(v) &&
      !["true", "false", "null"].includes(v)
      ? v : JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(serializeFlow).join(", ") + "]";
  if (typeof v === "object")
    return "{" + Object.entries(v)
      .map(([k, x]) => `${k}: ${serializeFlow(x)}`).join(", ") + "}";
  return JSON.stringify(String(v));
}

/** readApp(doc, id) → the app's own entry as a fresh object, or null.
 * Never mutates doc; never validates the entry (no schema — see above). */
function readApp(doc, id) {
  const seg = (doc && doc._fm || []).find((x) => x.kind === "apps");
  if (!seg) return null;
  const e = seg.entries.find((x) => x.id === id);
  if (!e) return null;
  const m = e.raw.trim().match(/^[A-Za-z0-9_-]+:\s*([\s\S]*)$/);
  try { return parseFlow(m ? m[1] : ""); }
  catch { return null; } // an unreadable entry is absent to its app, never a throw
}

/** writeApp(doc, id, cfg) → a NEW document with only this app's entry
 * replaced (canonical flow serialization). Every other entry's raw text —
 * unknown app ids, higher payload v — replays verbatim. Writing an apps:
 * map is the one thing that turns `atchart: 1` into `atchart: 1.1`. */
function writeApp(doc, id, cfg) {
  if (!/^[A-Za-z0-9_-]+$/.test(String(id)))
    throw new Error(`writeApp: app id "${id}" is not a slug`);
  const nd = JSON.parse(JSON.stringify(doc));
  if (!nd._fm) {
    nd._fm = [];
    const keys = [...FM_ORDER.filter((k) => k in nd.meta),
      ...Object.keys(nd.meta).filter((k) => !FM_ORDER.includes(k))];
    for (const k of keys) {
      if (k in DEFAULTS && valEq(nd.meta[k], DEFAULTS[k])) continue;
      if (k === "tuning" && nd.meta[k] == null) continue;   // v1.2
      nd._fm.push({ kind: "key", key: k, raw: canonLine(k, nd.meta[k]), value: nd.meta[k] });
    }
  }
  let seg = nd._fm.find((x) => x.kind === "apps");
  if (!seg) { seg = { kind: "apps", entries: [] }; nd._fm.push(seg); }
  const line = `  ${id}: ${serializeFlow(cfg)}`;
  const at = seg.entries.findIndex((x) => x.id === id);
  if (at >= 0) seg.entries[at] = { id, raw: line };
  else seg.entries.push({ id, raw: line });
  if (Number(nd.meta.atchart) === 1) nd.meta.atchart = 1.1;
  return nd;
}

// ---------- the chart block ----------

function parseChartBlock(lines) {
  const sections = [];
  let cur = null;
  const openSection = (name) => {
    cur = { name, bars: [], melody: [] };
    sections.push(cur);
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    let rest = line;
    const secM = rest.match(/^@(\S+)\s*/);
    if (secM) {
      openSection(secM[1]);
      rest = rest.slice(secM[0].length);
      if (!rest) continue;
    }
    if (/^melody:/.test(rest)) {
      if (!cur) openSection("A");
      cur.melody.push(rest.replace(/^melody:\s*/, ""));
      continue;
    }
    if (!cur) openSection("A");
    parseBarLine(rest, cur);
  }
  return sections;
}

function parseBarLine(text, section) {
  // tokenize on bar separators, tracking |: and :|
  let i = 0;
  let pendingRepeatStart = false;
  let bar = null;
  const flush = () => {
    if (bar && (bar.chords.length || bar.repeatStart || bar.repeatEnd)) section.bars.push(bar);
    bar = null;
  };
  // humans type "|Bbmaj7|G7#5|" — split on bar tokens directly, longest first,
  // so :|: never decomposes into :| + : or | + :
  const tokens = text
    .split(/(:\|:|\|:|:\|(?!:)|\|)/)
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((s) => (/^(:\|:|\|:|:\||\|)$/.test(s) ? [s] : s.split(/\s+/)));
  for (const tok of tokens) {
    if (tok === "|:") {
      flush();
      pendingRepeatStart = true;
    } else if (tok === ":|") {
      if (bar) bar.repeatEnd = true;
      flush();
    } else if (tok === "|") {
      flush();
    } else if (tok === ":|:") {
      if (bar) bar.repeatEnd = true;
      flush();
      pendingRepeatStart = true;
    } else {
      if (!bar) {
        bar = { chords: [], repeatStart: pendingRepeatStart, repeatEnd: false };
        pendingRepeatStart = false;
      }
      // chord symbols validate through the shared parser — bad text is an error
      // with a message naming the token, never a silently-wrong chart
      const parsed = parseChord(tok);
      bar.chords.push({ symbol: tok, parsed });
    }
    i++;
  }
  flush();
}

function serializeChartBlock(sections) {
  const lines = [];
  const multi = sections.length > 1 || sections[0]?.name !== "A";
  for (const sec of sections) {
    const parts = [];
    for (const bar of sec.bars) {
      parts.push(bar.repeatStart ? "|:" : "|");
      parts.push(bar.chords.map((c) => c.symbol).join(" "));
      if (bar.repeatEnd) {
        parts.push(":|");
      }
    }
    if (parts.length && parts[parts.length - 1] !== ":|") parts.push("|");
    const head = multi ? `@${sec.name}  ` : "";
    lines.push(head + parts.join(" "));
    for (const m of sec.melody) lines.push((multi ? "     " : "") + "melody: " + m);
  }
  return lines.join("\n");
}

// ---------- substitutions ----------

const SUB_RE = /^-\s+(\S+?)\.b(\d+)\s+(.+?)\s+(?:->|→)\s+(.+?)\s*(?:\[(.+?)\])?\s*$/;

function parseSubLine(line) {
  const m = line.match(SUB_RE);
  if (!m) return null;
  const parseSide = (s) => s.split(/\s+/).filter(Boolean).map((sym) => ({ symbol: sym, parsed: parseChord(sym) }));
  return {
    section: m[1],
    bar: Number(m[2]),
    original: parseSide(m[3]),
    replacement: parseSide(m[4]),
    name: m[5] || null,
  };
}

function serializeSub(sub) {
  const side = (cs) => cs.map((c) => c.symbol).join(" ");
  return `- ${sub.section}.b${sub.bar}  ${side(sub.original)}  ->  ${side(sub.replacement)}${sub.name ? `  [${sub.name}]` : ""}`;
}

// ---------- the whole document ----------

/**
 * parseAtchart(text) → { meta, sections, substitutions, practiceLog, body }
 * `body` is the document skeleton with placeholders, so serialization preserves
 * every line the format doesn't claim (spec §2.5).
 */
function parseAtchart(text) {
  if (typeof text !== "string") throw new Error("atchart source must be a string");
  const lines = text.split(/\r?\n/);

  // frontmatter
  if (lines[0] !== "---") throw new Error("missing frontmatter (--- on line 1)");
  const fmEnd = lines.indexOf("---", 1);
  if (fmEnd < 0) throw new Error("unterminated frontmatter");
  const { meta: fmMeta, fm } = parseFrontmatter(lines.slice(1, fmEnd));
  const meta = { ...DEFAULTS, ...fmMeta };
  if (meta.atchart === undefined) throw new Error("frontmatter must declare: atchart: 1");
  if (Math.floor(Number(meta.atchart)) > ATCHART_VERSION)
    throw new Error(`atchart version ${meta.atchart} is newer than this parser (v${ATCHART_VERSION})`);

  // walk the body: extract the chart block and the two claimed sections,
  // keep everything else verbatim
  const body = [];
  let chartLines = null;
  const sections = [];
  const substitutions = [];
  const practiceLog = [];
  let mode = "prose"; // prose | chart | subs | log
  let sawChart = false;

  for (let i = fmEnd + 1; i < lines.length; i++) {
    const line = lines[i];
    if (mode === "chart") {
      if (/^```\s*$/.test(line)) {
        sections.push(...parseChartBlock(chartLines));
        chartLines = null;
        mode = "prose";
      } else chartLines.push(line);
      continue;
    }
    if (/^```chart\s*$/.test(line)) {
      if (sawChart) throw new Error("multiple chart blocks are reserved for v2");
      sawChart = true;
      chartLines = [];
      mode = "chart";
      body.push(CHART_SLOT);
      continue;
    }
    if (/^##\s+Substitutions\s*$/i.test(line)) {
      mode = "subs";
      body.push("\x00SUBS\x00");
      continue;
    }
    if (/^##\s+Practice log\s*$/i.test(line)) {
      mode = "log";
      body.push("\x00LOG\x00");
      continue;
    }
    if (/^##?\s+/.test(line) && (mode === "subs" || mode === "log")) mode = "prose";

    if (mode === "subs") {
      const sub = line.trim() ? parseSubLine(line) : null;
      if (sub) substitutions.push(sub);
      else if (line.trim()) throw new Error(`bad substitution line: "${line}"`);
      continue;
    }
    if (mode === "log") {
      if (line.trim()) practiceLog.push(line.replace(/^-\s*/, ""));
      continue;
    }
    body.push(line);
  }
  if (mode === "chart") throw new Error("unterminated chart block");
  if (!sawChart) throw new Error("no ```chart block found");

  return { meta, sections, substitutions, practiceLog, body, _fm: fm };
}

function serializeAtchart(doc) {
  const out = [];
  out.push("---");
  out.push(serializeFrontmatter(doc.meta, doc._fm));
  out.push("---");
  for (const line of doc.body) {
    if (line === CHART_SLOT) {
      out.push("```chart");
      out.push(serializeChartBlock(doc.sections));
      out.push("```");
    } else if (line === "\x00SUBS\x00") {
      out.push("## Substitutions");
      out.push("");
      for (const s of doc.substitutions) out.push(serializeSub(s));
    } else if (line === "\x00LOG\x00") {
      out.push("## Practice log");
      out.push("");
      for (const l of doc.practiceLog) out.push("- " + l);
    } else out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\n+$/, "") + "\n";
}
return { ATCHART_VERSION, CHART_SLOT, readApp, writeApp, parseAtchart, serializeAtchart };
})();

/* ===== engine/structures.mjs ===== */
const __m_engine_structures_mjs = (() => {
const { parseChord, resolveRoman } = __m_engine_chord_mjs;
const { parseAtchart, serializeAtchart } = __m_engine_atchart_mjs;
/* structures.mjs — the palette's structure catalog (component v1).
 *
 * The notepad arc's child 3, tier 2/3/4 derivations — shared family code
 * (the v0.6 harmony panel and Substitute Teacher's substitution lab are its
 * later consumers). Pure: no DOM, no audio.
 *
 * THE LOAD-BEARING CONSTRAINT (golden rule 1): a structure is defined ONCE
 * as a degree pattern — roman numerals with qualities — and transposed into
 * the requested key by pitch-class math through engine/chord.mjs's
 * resolveRoman (consumer #2 of the v0.6 resolution path; no parallel one).
 * A table of twelve hand-typed ii–V–I progressions would be a spec violation
 * even with identical output — and the grep test asserts no quoted absolute
 * chord symbol exists anywhere in this module's source. Enharmonic spelling
 * per key is resolveRoman's named rule (Db in the flat keys, C# in the sharp
 * ones, double accidentals where the arithmetic demands them), re-parsed by
 * parseChord so every resolution passes the parser's structural assertions.
 *
 * Everything this module emits is VALID APP INPUT BY CONSTRUCTION:
 * chart bodies parse as .atchart.md chart blocks; changes lines parse
 * symbol-by-symbol through parseChord; the chord chooser's whole matrix is
 * load-asserted through the parser.
 */


// ---------- the catalog: degree patterns, bar groupings ----------

const STRUCTURES = [
  { id: "ii-V-I", name: "ii–V–I",
    bars: [["ii7", "V7"], ["Imaj7"]] },
  { id: "ii-V-i", name: "ii–V–i (minor)",
    bars: [["iiø7", "V7"], ["i7"]] },
  { id: "turnaround", name: "turnaround (I–vi–ii–V)",
    bars: [["Imaj7", "vi7"], ["ii7", "V7"]] },
  { id: "blues-12", name: "twelve-bar blues",
    bars: [["I7"], ["IV7"], ["I7"], ["I7"], ["IV7"], ["IV7"], ["I7"], ["I7"],
      ["V7"], ["IV7"], ["I7"], ["V7"]] },
  { id: "rhythm-a", name: "rhythm changes — A section",
    bars: [["Imaj7", "vi7"], ["ii7", "V7"], ["Imaj7", "vi7"], ["ii7", "V7"],
      ["I7"], ["IV7"], ["Imaj7", "V7"], ["Imaj7"]] },
  { id: "cycle-4ths", name: "cycle of fourths",
    bars: [["I"], ["IV"], ["bVII"], ["bIII"], ["bVI"], ["bII"], ["bV"],
      ["VII"], ["III"], ["VI"], ["II"], ["V"]] },
];

/** The chooser's twelve roots — flats preferred where ambiguous, every one
 * parseChord-valid (asserted at load). These are pitch NAMES, not chords:
 * the grep forbids quoted root+quality combinations, not bare roots. */
const CHORD_ROOTS =
  ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

/** The chooser's qualities — exactly what parseChord accepts (load-asserted;
 * suffix strings, no roots attached). */
const CHORD_QUALITIES =
  ["", "m", "7", "maj7", "m7", "m7b5", "dim7", "6", "m6", "9", "maj9", "m9",
   "sus4", "aug", "7#5", "7b9", "mMaj7"];

/** Tier 1 — the typographic glyph set (decision 5: no notation font; the
 * U+1D1xx block is not offered at all). Every glyph renders everywhere with
 * no font shipped. */
const GLYPHS =
  ["♭", "♯", "♮", "°", "ø", "△", "•",
   "|", "|:", ":|", "->"];

// ---------- derivation ----------

/** resolveStructure(id, key) → { id, name, key, bars:[[symbol,…],…] } —
 * every symbol derived through resolveRoman and re-parsed by parseChord. */
function resolveStructure(id, key) {
  const st = STRUCTURES.find((s) => s.id === id);
  if (!st) throw new Error('structures: unknown structure "' + id + '"');
  const bars = st.bars.map((bar) => bar.map((roman) => {
    const r = resolveRoman(roman, key);
    if (!r) throw new Error('structures: "' + roman + '" did not resolve in ' + key);
    parseChord(r.symbol); // the parser's own assertions gate every emission
    return r.symbol;
  }));
  return { id: st.id, name: st.name, key, bars };
}

/** chartBody(id, key) → the chart-block body in the format engine's
 * CANONICAL form: the derived bars are round-tripped through parseAtchart/
 * serializeAtchart, so what the palette inserts is byte-for-byte what the
 * format itself would write — fixed-point by construction, not imitation. */
function chartBody(id, key) {
  const { bars } = resolveStructure(id, key);
  const raw = "| " + bars.map((b) => b.join(" ")).join(" | ") + " |";
  const doc = "---\natchart: 1\n---\n```chart\n" + raw + "\n```\n";
  const out = serializeAtchart(parseAtchart(doc));
  return out.slice(out.indexOf("```chart\n") + 9, out.lastIndexOf("\n```"));
}

/** chartFence(id, key) → the fenced block the notepad inserts (tier 3);
 * engine/atchart.mjs reads it and sibling apps can act on it. */
function chartFence(id, key) {
  return "```chart\n" + chartBody(id, key) + "\n```";
}

/** changesLine(id, key) → the flat symbol sequence (tier 4): valid input for
 * Triadetudes' Break-down changes field by construction — every token is a
 * parseChord-valid symbol. */
function changesLine(id, key) {
  return resolveStructure(id, key).bars.flat().join(" ");
}

/** chordSymbol(root, quality) → the chooser's output, gated by the parser. */
function chordSymbol(root, quality) {
  const symbol = root + quality;
  parseChord(symbol);
  return symbol;
}

// ---------- load-time assertions (golden rule 1, site form) ----------

{
  // the whole chooser matrix parses — a chooser that can emit an unparseable
  // symbol is broken at build time, not at paste time
  for (const r of CHORD_ROOTS)
    for (const q of CHORD_QUALITIES) parseChord(r + q);
  // every structure resolves and re-parses in the probe key
  for (const st of STRUCTURES) resolveStructure(st.id, "C");
  // and the derived ii–V–I is what the degree pattern says it is
  const p = resolveStructure("ii-V-I", "C");
  if (p.bars.flat().join(" ") !== ["ii7", "V7", "Imaj7"]
    .map((t) => resolveRoman(t, "C").symbol).join(" "))
    throw new Error("structures: derivation must go through resolveRoman");
}
return { STRUCTURES, CHORD_ROOTS, CHORD_QUALITIES, GLYPHS, resolveStructure, chartBody, chartFence, changesLine, chordSymbol };
})();

/* ===== engine/markdown.mjs ===== */
const __m_engine_markdown_mjs = (() => {
/* markdown.mjs — the notepad's markdown engine (component v1).
 *
 * A CommonMark SUBSET that builds DOM nodes, written in-house because the two
 * guarantees below cannot be imported (notepad item, charter §7, web contract
 * §5 — every dependency must pass the inline test):
 *
 *   1. None of the four HTML-string sinks (the grep test in
 *      markdown.test.mjs names them) appears anywhere in this module. The
 *      renderer builds the tree with createElement / createTextNode /
 *      textContent only, so user input being data-not-code is STRUCTURAL,
 *      not a sanitizer's promise.
 *   2. NO HTML PASSTHROUGH. CommonMark permits raw inline and block HTML;
 *      this subset REFUSES it: a typed `<script>` is text and renders as the
 *      visible characters `<script>`. This is a documented, tested divergence
 *      from CommonMark — not an oversight to be "fixed" later.
 *
 * The subset (what a musician writing practice notes actually types):
 * ATX headings · paragraphs · *em* / **strong** · bullet + ordered lists (ONE
 * nesting level) · > blockquotes · `code spans` · fenced blocks with info
 * strings · --- rules · [text](url) · hard line breaks (two trailing spaces).
 * Deliberately out: tables, footnotes, task lists, wiki-links, autolinks,
 * setext headings, deeper nesting, syntax highlighting inside fences.
 *
 * Load-bearing choices:
 * - Fenced blocks are OPAQUE: the node carries {info, body} byte-identically
 *   and the renderer shows them as preformatted text, never interpreting
 *   them. This is the hook the payload convention and the `chart` block hang
 *   on — engine/atchart.mjs stays the only thing that reads a chart fence.
 * - An UNCLOSED fence is not a fence: the ``` line renders as the literal
 *   characters typed and parsing continues — good for live preview (typing a
 *   fence never swallows the rest of the note) and no content is ever lost.
 * - Links sanitize by scheme allow-list AT RENDER: http, https, mailto, and
 *   same-document # fragments. Anything else (javascript:, data:, vbscript:,
 *   file:) renders as the literal source text — inert AND nothing lost.
 * - Unknown/malformed syntax degrades to text, NEVER throws. There is no
 *   error path that loses content.
 * - ROUND-TRIP IS NOT CLAIMED. This is a renderer, not a formatter: the
 *   textarea source stays canonical, there is no serializer and no
 *   fixed-point law here (that law lives in engine/atchart.mjs).
 *
 * applyEdit(src, sel, op) is the toolbar's seam — a pure string+selection
 * transform (the palette inserts through the same seam via {type:"insert"}).
 * Wrapping ops toggle rather than nest; line ops apply across every line the
 * selection touches; the returned selection is the contract that the caret
 * survives every op.
 *
 * Pure module: no DOM globals at parse time; renderTo reaches the document
 * only through el.ownerDocument, so tests run against a stub.
 */

// ---------- parse ----------

const FENCE_OPEN = /^```(.*)$/;
const FENCE_CLOSE = /^```\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^-{3,}\s*$/;
const BULLET = /^(\s*)([-*+])\s+(.*)$/;
const ORDERED = /^(\s*)(\d{1,9})[.)]\s+(.*)$/;
const MAX_DEPTH = 8; // quotes-in-quotes beyond this degrade to text, never throw

function parseMarkdown(src) {
  const s = typeof src === "string" ? src : String(src ?? "");
  return { type: "doc", children: parseBlocks(s.split("\n"), 0) };
}

function matchListLine(line) {
  let m = line.match(BULLET);
  if (m) return { indent: m[1].length, ordered: false, num: null, text: m[3] };
  m = line.match(ORDERED);
  if (m) return { indent: m[1].length, ordered: true, num: +m[2], text: m[3] };
  return null;
}

function isBlockStart(line) {
  return HEADING.test(line) || RULE.test(line) || /^>/.test(line) ||
    FENCE_OPEN.test(line) || (matchListLine(line)?.indent === 0);
}

function parseBlocks(lines, depth) {
  if (depth > MAX_DEPTH)
    return [{ type: "para", children: [{ type: "text", text: lines.join("\n") }] }];
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }

    const f = line.match(FENCE_OPEN);
    if (f) {
      let close = -1;
      for (let j = i + 1; j < lines.length; j++)
        if (FENCE_CLOSE.test(lines[j])) { close = j; break; }
      if (close >= 0) {
        // opaque node; info string and body byte-identical through parse
        out.push({ type: "fence", info: f[1].trim(),
          body: lines.slice(i + 1, close).join("\n") });
        i = close + 1; continue;
      }
      // unclosed fence: the literal characters typed, parsing continues
      out.push({ type: "para", children: [{ type: "text", text: line }] });
      i++; continue;
    }

    const h = line.match(HEADING);
    if (h) {
      out.push({ type: "heading", level: h[1].length,
        children: parseInline(h[2].replace(/\s+#+\s*$/, "")) });
      i++; continue;
    }

    if (RULE.test(line)) { out.push({ type: "rule" }); i++; continue; }

    if (/^>/.test(line)) {
      const q = [];
      while (i < lines.length && /^>/.test(lines[i])) {
        q.push(lines[i].replace(/^> ?/, "")); i++;
      }
      out.push({ type: "quote", children: parseBlocks(q, depth + 1) });
      continue;
    }

    const li = matchListLine(line);
    if (li && li.indent === 0) {
      const [node, next] = parseList(lines, i);
      out.push(node); i = next; continue;
    }

    // paragraph: gather until a blank line or another block starts
    const para = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !isBlockStart(lines[i])) {
      para.push(lines[i]); i++;
    }
    if (!para.length) { // a block-start we cannot consume (defensive; unreachable)
      para.push(lines[i]); i++;
    }
    const children = [];
    para.forEach((ln, k) => {
      const hard = /\S {2,}$/.test(ln); // two+ trailing spaces = hard break
      children.push(...parseInline(ln.replace(/\s+$/, "")));
      if (k < para.length - 1)
        children.push(hard ? { type: "br" } : { type: "text", text: " " });
    });
    out.push({ type: "para", children });
  }
  return out;
}

function parseList(lines, i) {
  const first = matchListLine(lines[i]);
  const ordered = first.ordered;
  const items = [];
  while (i < lines.length) {
    const m = matchListLine(lines[i]);
    if (!m || m.indent !== 0 || m.ordered !== ordered) break;
    const item = { children: parseInline(m.text), sub: null };
    i++;
    // ONE nesting level: an immediately following indented run is the sub-list;
    // anything deeper is flattened into it (deeper nesting is out of the subset)
    const subItems = [];
    let subOrdered = null;
    while (i < lines.length) {
      const sm = matchListLine(lines[i]);
      if (!sm || sm.indent === 0) break;
      if (subOrdered === null) subOrdered = sm.ordered;
      subItems.push({ children: parseInline(sm.text), sub: null });
      i++;
    }
    if (subItems.length)
      item.sub = { type: "list", ordered: subOrdered, start: 1, items: subItems };
    items.push(item);
  }
  return [{ type: "list", ordered, start: first.num ?? 1, items }, i];
}

function parseInline(s, depth) {
  depth = depth || 0;
  const out = [];
  let buf = "", i = 0;
  const flush = () => { if (buf) { out.push({ type: "text", text: buf }); buf = ""; } };
  if (depth > MAX_DEPTH) return [{ type: "text", text: s }];
  while (i < s.length) {
    const c = s[i];
    if (c === "`") {
      const end = s.indexOf("`", i + 1);
      if (end > i + 1) { flush(); out.push({ type: "code", text: s.slice(i + 1, end) }); i = end + 1; continue; }
      buf += c; i++; continue;
    }
    if (s.startsWith("**", i)) {
      const end = s.indexOf("**", i + 2);
      if (end > i + 2) {
        flush();
        out.push({ type: "strong", children: parseInline(s.slice(i + 2, end), depth + 1) });
        i = end + 2; continue;
      }
      buf += "*"; i++; continue; // lone markers are the literal characters typed
    }
    if (c === "*") {
      const end = s.indexOf("*", i + 1);
      if (end > i + 1) {
        flush();
        out.push({ type: "em", children: parseInline(s.slice(i + 1, end), depth + 1) });
        i = end + 1; continue;
      }
      buf += c; i++; continue;
    }
    if (c === "[") {
      const close = s.indexOf("]", i + 1);
      if (close > i && s[close + 1] === "(") {
        const rp = s.indexOf(")", close + 2);
        if (rp >= 0) {
          flush();
          out.push({ type: "link", href: s.slice(close + 2, rp),
            children: parseInline(s.slice(i + 1, close), depth + 1) });
          i = rp + 1; continue;
        }
      }
      buf += c; i++; continue; // stray [ is the literal character typed
    }
    buf += c; i++;
  }
  flush();
  return out;
}

// ---------- render: DOM nodes only, no HTML-string sinks ----------

const SAFE_SCHEME = /^(https?:|mailto:)/i;

/** null = refuse: the construct renders as literal source text (inert AND
 * nothing lost). Allow-list, not deny-list: http, https, mailto, #fragment. */
function safeHref(href) {
  const t = String(href ?? "").trim();
  if (t.startsWith("#")) return t;
  if (SAFE_SCHEME.test(t)) return t;
  return null;
}

function plainText(children) {
  let t = "";
  for (const n of children || []) {
    if (n.type === "text") t += n.text;
    else if (n.type === "code") t += "`" + n.text + "`";
    else if (n.type === "br") t += "\n";
    else t += plainText(n.children);
  }
  return t;
}

function renderTo(el, ast) {
  const doc = el.ownerDocument;
  while (el.firstChild) el.removeChild(el.firstChild);
  for (const b of (ast && ast.children) || []) el.appendChild(blockNode(doc, b));
  return el;
}

function blockNode(doc, b) {
  switch (b.type) {
    case "heading": {
      const h = doc.createElement("h" + Math.min(6, Math.max(1, b.level)));
      appendInline(doc, h, b.children); return h;
    }
    case "para": {
      const p = doc.createElement("p");
      appendInline(doc, p, b.children); return p;
    }
    case "rule": return doc.createElement("hr");
    case "quote": {
      const q = doc.createElement("blockquote");
      for (const c of b.children) q.appendChild(blockNode(doc, c));
      return q;
    }
    case "fence": {
      // opaque: preformatted text; the info string rides as data-info for
      // consumers (the chart block's reader lives elsewhere, by design)
      const pre = doc.createElement("pre");
      const code = doc.createElement("code");
      if (b.info) code.setAttribute("data-info", b.info);
      code.textContent = b.body;
      pre.appendChild(code); return pre;
    }
    case "list": {
      const l = doc.createElement(b.ordered ? "ol" : "ul");
      if (b.ordered && b.start !== 1) l.setAttribute("start", String(b.start));
      for (const it of b.items) {
        const li = doc.createElement("li");
        appendInline(doc, li, it.children);
        if (it.sub) li.appendChild(blockNode(doc, it.sub));
        l.appendChild(li);
      }
      return l;
    }
    default: { // unknown node type: its text content, never a throw
      const p = doc.createElement("p");
      p.textContent = plainText(b.children);
      return p;
    }
  }
}

function appendInline(doc, el, children) {
  for (const n of children || []) {
    switch (n.type) {
      case "text": el.appendChild(doc.createTextNode(n.text)); break;
      case "br": el.appendChild(doc.createElement("br")); break;
      case "code": {
        const c = doc.createElement("code");
        c.textContent = n.text; el.appendChild(c); break;
      }
      case "em": case "strong": {
        const e = doc.createElement(n.type);
        appendInline(doc, e, n.children); el.appendChild(e); break;
      }
      case "link": {
        const href = safeHref(n.href);
        if (href === null) {
          // refused scheme: the literal source text, visible and inert
          el.appendChild(doc.createTextNode(
            "[" + plainText(n.children) + "](" + n.href + ")"));
        } else {
          const a = doc.createElement("a");
          a.setAttribute("href", href);
          a.setAttribute("rel", "noopener noreferrer");
          appendInline(doc, a, n.children);
          el.appendChild(a);
        }
        break;
      }
      default: el.appendChild(doc.createTextNode(plainText([n])));
    }
  }
}

// ---------- applyEdit: the toolbar's (and the palette's) seam ----------

/**
 * applyEdit(src, sel, op) → { src, selection:{start,end} }
 * sel: {start,end} string indices (clamped, ordered; never throws).
 * ops: {type:"insert",text} · {type:"strong"|"em"|"code"} ·
 *      {type:"link"} · {type:"heading",level} ·
 *      {type:"bullet"|"ordered"|"quote"}
 * Wrapping ops TOGGLE rather than nest (already-wrapped selection unwraps,
 * markers around the selection unwrap). Line ops apply across every line the
 * selection touches, and toggle off only when EVERY non-blank line already
 * carries the marker. The returned selection is exact — the caret's survival
 * is the contract.
 */
function applyEdit(src, sel, op) {
  const s = typeof src === "string" ? src : String(src ?? "");
  let start = Math.max(0, Math.min(s.length, (sel && sel.start) | 0));
  let end = Math.max(0, Math.min(s.length, (sel && sel.end) | 0));
  if (end < start) [start, end] = [end, start];
  if (!op || typeof op.type !== "string")
    return { src: s, selection: { start, end } };

  switch (op.type) {
    case "insert": {
      const t = String(op.text ?? "");
      const out = s.slice(0, start) + t + s.slice(end);
      const caret = start + t.length;
      return { src: out, selection: { start: caret, end: caret } };
    }
    case "strong": return wrapToggle(s, start, end, "**");
    case "em": return wrapToggle(s, start, end, "*");
    case "code": return wrapToggle(s, start, end, "`");
    case "link": {
      if (start === end) {
        const t = "[text](url)";
        return { src: s.slice(0, start) + t + s.slice(end),
          selection: { start: start + 1, end: start + 5 } }; // "text" selected
      }
      const inner = s.slice(start, end);
      const out = s.slice(0, start) + "[" + inner + "](url)" + s.slice(end);
      const u = start + 1 + inner.length + 2;
      return { src: out, selection: { start: u, end: u + 3 } }; // "url" selected
    }
    case "heading": {
      const level = Math.min(6, Math.max(1, op.level | 0 || 1));
      const marker = "#".repeat(level) + " ";
      return lineOp(s, start, end,
        (line) => {
          const cur = line.match(/^(#{1,6})\s+/);
          return !!(cur && cur[1].length === level);
        },
        (line) => { // apply
          const cur = line.match(/^(#{1,6})\s+/);
          return marker + (cur ? line.slice(cur[0].length) : line);
        },
        (line) => line.replace(/^(#{1,6})\s+/, "")); // remove
    }
    case "quote":
      return lineOp(s, start, end,
        (line) => /^> /.test(line),
        (line) => /^> /.test(line) ? line : "> " + line,
        (line) => line.replace(/^> ?/, ""));
    case "bullet":
      return lineOp(s, start, end,
        (line) => /^[-*+] /.test(line),
        (line) => /^[-*+] /.test(line) ? line
          : "- " + line.replace(/^(\d{1,9})[.)]\s+/, ""),
        (line) => line.replace(/^[-*+]\s+/, ""));
    case "ordered": {
      let n = 0;
      return lineOp(s, start, end,
        (line) => /^\d{1,9}[.)] /.test(line),
        (line) => (++n) + ". " +
          line.replace(/^[-*+]\s+/, "").replace(/^\d{1,9}[.)]\s+/, ""),
        (line) => line.replace(/^\d{1,9}[.)]\s+/, ""));
    }
    default: // unknown op: a no-op, never a throw — content is data
      return { src: s, selection: { start, end } };
  }
}

function wrapToggle(s, start, end, m) {
  const L = m.length;
  if (start === end) {
    // empty selection: open a pair, caret between the markers
    const out = s.slice(0, start) + m + m + s.slice(end);
    return { src: out, selection: { start: start + L, end: start + L } };
  }
  const inner = s.slice(start, end);
  if (inner.length >= 2 * L && inner.startsWith(m) && inner.endsWith(m)) {
    // selection includes the markers: unwrap, select the bare text
    const bare = inner.slice(L, inner.length - L);
    return { src: s.slice(0, start) + bare + s.slice(end),
      selection: { start, end: start + bare.length } };
  }
  if (s.slice(start - L, start) === m && s.slice(end, end + L) === m) {
    // markers surround the selection: unwrap, selection shifts left
    return { src: s.slice(0, start - L) + inner + s.slice(end + L),
      selection: { start: start - L, end: end - L } };
  }
  const out = s.slice(0, start) + m + inner + m + s.slice(end);
  return { src: out, selection: { start: start + L, end: end + L } };
}

function lineOp(s, start, end, has, add, remove) {
  const ls = s.lastIndexOf("\n", start - 1) + 1;
  let le = s.indexOf("\n", end);
  if (le < 0) le = s.length;
  const seg = s.slice(ls, le);
  const lines = seg.split("\n");
  const marked = lines.filter((l) => l.trim() !== "");
  const allHave = marked.length > 0 && marked.every(has);
  const outLines = lines.map((l) => l.trim() === "" ? l : (allHave ? remove(l) : add(l)));
  const newSeg = outLines.join("\n");
  const out = s.slice(0, ls) + newSeg + s.slice(le);
  if (start === end && lines.length === 1) {
    // single-line caret: it rides the line's prefix change, clamped to the line
    const delta = outLines[0].length - lines[0].length;
    const caret = Math.max(ls, Math.min(ls + outLines[0].length, start + delta));
    return { src: out, selection: { start: caret, end: caret } };
  }
  // multi-line (or ranged) selection: select the whole transformed range
  return { src: out, selection: { start: ls, end: ls + newSeg.length } };
}

// ---------- load-time assertions (golden rule 1, site form) ----------

{
  const probe = parseMarkdown("# h\n\n**b** *i* `c` [t](https://x)\n\n```chart\nX\n```\n");
  if (probe.children.length !== 3 || probe.children[2].info !== "chart" ||
      probe.children[2].body !== "X")
    throw new Error("markdown: the probe document must parse to its three blocks");
  if (safeHref("javascript:alert(1)") !== null || safeHref("data:text/html,x") !== null)
    throw new Error("markdown: unsafe schemes must refuse");
  if (safeHref("https://a.b") === null || safeHref("#top") === null)
    throw new Error("markdown: safe schemes must pass");
  const e1 = applyEdit("ab", { start: 0, end: 2 }, { type: "strong" });
  if (e1.src !== "**ab**" || e1.selection.start !== 2 || e1.selection.end !== 4)
    throw new Error("markdown: wrap must preserve the selection");
  const e2 = applyEdit(e1.src, e1.selection, { type: "strong" });
  if (e2.src !== "ab") throw new Error("markdown: wrap must toggle, not nest");
  if (JSON.stringify(parseMarkdown("<b>x</b>").children[0].children[0]) !==
      JSON.stringify({ type: "text", text: "<b>x</b>" }))
    throw new Error("markdown: raw HTML must be text, not markup");
}
return { parseMarkdown, safeHref, renderTo, applyEdit };
})();

/* ===== engine/numeral.mjs ===== */
const __m_engine_numeral_mjs = (() => {
const { parseRoman } = __m_engine_chord_mjs;
/* numeral.mjs — THE CHORD'S NUMERAL, spelled by the roman GRAMMAR (night 71, PO ruling 261029b).
 *
 * The grammar is engine/chord.mjs's ROMAN_RE — the parser this codebase reads romans with — and an emitted roman must
 * parse. It is smaller than a chord symbol because CASE carries the third and the SUFFIX carries the seventh:
 *   major triad + maj7 → IVmaj7    minor triad + b7 → ii7 (lower case already says minor)    dominant → V7
 *   half-diminished → viiø7        diminished seventh → vii°7      augmented → III+    triads → I, ii, vii°
 * Read off the chord's own tones (the readout's derivation: its roles and pitch classes) — case from the third, the
 * mark from the fifth, the suffix from the seventh. No table of chord names.
 *
 * WHY NOT AN EXISTING SPELLER (the roman estate, night 71's run note): tetrad-sequence.mjs's romanOf writes the minor
 * seventh "-7", which the grammar REJECTS (the same reason "∆7" was refused); progression.mjs's inner romanOf spells the
 * triad only. Neither is changed tonight — tetradetudes' published labels do not move. Consolidating the family's roman
 * spellers is filed, not done.
 */

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];
const mod12 = (x) => ((x % 12) + 12) % 12;

/** the numeral for a chord in the key: `degree` 0…6 (or < 0 for an off-key root), `rootPc`, and its `tones`
 * ({ role: "R" | "3" | "5" | "7" | …, pc }). Returns "—" for an off-key root. */
function grammarRoman({ degree, rootPc, tones }) {
  if (!(degree >= 0 && degree <= 6)) return "—";
  const at = (role) => {
    const t = (tones || []).find((x) => String(x.role) === role);
    return t ? mod12(t.pc - rootPc) : null;
  };
  const third = at("3"), fifth = at("5"), seventh = at("7");
  const minor = third === 3;
  let out = minor ? NUMERALS[degree].toLowerCase() : NUMERALS[degree];
  if (fifth === 6) out += seventh === 10 ? "ø" : "°";
  else if (fifth === 8) out += "+";
  if (seventh === 11) out += "maj7";
  else if (seventh === 10 || seventh === 9) out += "7";
  return out;
}

/* ---------------- load-time assertions (golden rule 1, site form) ---------------- */
{
  const cases = [
    [{ degree: 3, rootPc: 3, tones: [{ role: "R", pc: 3 }, { role: "3", pc: 7 }, { role: "5", pc: 10 }, { role: "7", pc: 2 }] }, "IVmaj7"],
    [{ degree: 1, rootPc: 0, tones: [{ role: "R", pc: 0 }, { role: "3", pc: 3 }, { role: "5", pc: 7 }, { role: "7", pc: 10 }] }, "ii7"],
    [{ degree: 4, rootPc: 5, tones: [{ role: "R", pc: 5 }, { role: "3", pc: 9 }, { role: "5", pc: 0 }, { role: "7", pc: 3 }] }, "V7"],
    [{ degree: 6, rootPc: 9, tones: [{ role: "R", pc: 9 }, { role: "3", pc: 0 }, { role: "5", pc: 3 }, { role: "7", pc: 7 }] }, "viiø7"],
    [{ degree: 6, rootPc: 11, tones: [{ role: "R", pc: 11 }, { role: "3", pc: 2 }, { role: "5", pc: 5 }, { role: "7", pc: 8 }] }, "vii°7"],
    [{ degree: 0, rootPc: 0, tones: [{ role: "R", pc: 0 }, { role: "3", pc: 4 }, { role: "5", pc: 7 }] }, "I"],
  ];
  for (const [c, want] of cases) {
    const got = grammarRoman(c);
    if (got !== want) throw new Error(`numeral: expected ${want}, spelled ${got}`);
    if (parseRoman(got) === null) throw new Error(`numeral: "${got}" does not parse against the roman grammar`);
  }
}
return { grammarRoman };
})();

export const { LETTER_PC, accOf, pcOf, parseChord, SCALE_STEPS, scaleNotes, chromaticSpeller, spellRole, alteredDegree, resolveRoman } = __m_engine_chord_mjs;
export const { ATCHART_VERSION, CHART_SLOT, readApp, writeApp, parseAtchart, serializeAtchart } = __m_engine_atchart_mjs;
export const { STRUCTURES, CHORD_ROOTS, CHORD_QUALITIES, GLYPHS, resolveStructure, chartBody, chartFence, changesLine, chordSymbol } = __m_engine_structures_mjs;
export const { applyEdit } = __m_engine_markdown_mjs;
export const { grammarRoman } = __m_engine_numeral_mjs;
