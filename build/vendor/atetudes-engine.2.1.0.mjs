/* atetudes-engine 2.1.0 — the At-Etudes engine subset RiffRaft vendors. BUILT FILE: never edit it.
 * Built by hub/tools/vendor.mjs with the door build's inliner (build.mjs moduleChunk).
 * Contains: engine/chord.mjs, engine/field.mjs, engine/atchart.mjs, engine/structures.mjs, engine/markdown.mjs, engine/numeral.mjs, engine/string-sets.mjs, engine/position.mjs, engine/open-string.mjs, engine/string-run.mjs, engine/motion.mjs, engine/selection.mjs, engine/tetrad-voicings.mjs, engine/isolation.mjs, engine/voice-identity.mjs, engine/tetrad-sequence.mjs, engine/role.mjs, engine/reference.mjs, engine/progression.mjs, engine/note-events.mjs, engine/voices.mjs, engine/etude-timeline.mjs, engine/degree-palette.mjs, engine/tunings.mjs, engine/etude-describe.mjs
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
      /* 261014 (the RiffRaft palette build's find): a closing sign with no bar before it used to vanish — the chart
       * read clean and had lost what was typed (child 9, §4.4). Refused by name, as a bad chord symbol is. */
      if (!bar) throw new Error(`chart: ":|" with no chord before it closes a repeat with no bar in it — "${text.trim()}"`);
      bar.repeatEnd = true;
      flush();
    } else if (tok === "|") {
      flush();
    } else if (tok === ":|:") {
      if (!bar) throw new Error(`chart: ":|:" with no chord before it ends a repeat with no bar in it — "${text.trim()}"`);
      bar.repeatEnd = true;
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
  /* …and an opening sign with nothing after it on its line starts a repeat that no bar carries (261014) */
  if (pendingRepeatStart) {
    const sign = /:\|:\s*$/.test(text) ? ":|:" : "|:";
    throw new Error(`chart: "${sign}" at the end of a line starts a repeat with no bar in it — "${text.trim()}"`);
  }
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

/* ===== engine/string-sets.mjs ===== */
const __m_engine_string_sets_mjs = (() => {
/* string-sets.mjs — slot- and degree-relative translation across string sets.
 *
 * Pure module: no DOM, no audio, structural assertions at load. Shared family
 * code (Triadetudes v0.6.6 is the first consumer; Tetrad Voice-Leading has
 * string sets too, and Phase B's drill layer inherits this either way).
 *
 * The law this module encodes: an étude's design is RELATIVE, not absolute.
 * An arpeggio pattern's meaning is which SLOT of the set — low, mid, high —
 * in what order; a pivot's meaning is which SCALE DEGREE, not which fret.
 * Store and display absolute string/fret numbers (they are what the player
 * reads), but translate through the relative form on any context change, so
 * the design survives instead of resetting.
 *
 * Golden rule 1: every translation is DERIVED by the named rule below and
 * asserted, never mapped per-set by hand. A set→pattern lookup table would
 * emit identical output today and is a Spec violation.
 */

// A string set is an array of distinct string numbers, 1 = highest pitch.
// lowToHigh orders it low-pitch → high-pitch (i.e. descending string numbers:
// [2,3,4] → [4,3,2]); a SLOT is an index into that order. 0 = lowest.
function lowToHigh(set) {
  return [...set].sort((a, b) => b - a);
}

// parseArp's ceiling, shared so the module and the field agree
const MAX_PATTERN = 16;

/** slotsOf([3,4,2,2], [2,3,4]) → [1,0,2,2] — mid, low, high, high */
function slotsOf(pattern, set) {
  const order = lowToHigh(set);
  return pattern.map((sn) => {
    const k = order.indexOf(sn);
    if (k < 0) throw new Error(`slotsOf: string ${sn} not in set ${set.join("-")}`);
    return k;
  });
}

/** stringsOf([1,0,2,2], [3,4,5]) → [4,5,3,3] — the same figure on the new set */
function stringsOf(slots, set) {
  const order = lowToHigh(set);
  return slots.map((k) => {
    if (!Number.isInteger(k) || k < 0 || k >= order.length)
      throw new Error(`stringsOf: slot ${k} outside a ${order.length}-string set`);
    return order[k];
  });
}

/** translatePattern: absolute strings → slots → absolute strings on the new
 * set. Total for equal-size sets (every set this family offers has three
 * strings), null passes through (a block chord has nothing to translate).
 * Derived, then asserted: the slot list must read back identical. */
function translatePattern(pattern, fromSet, toSet) {
  if (pattern === null || pattern === undefined) return null;
  if (pattern.length > MAX_PATTERN)
    throw new Error(`translatePattern: ${pattern.length} notes exceeds the ${MAX_PATTERN}-note ceiling`);
  if (lowToHigh(fromSet).length !== lowToHigh(toSet).length)
    throw new Error("translatePattern: sets differ in size — translation is not total");
  const slots = slotsOf(pattern, fromSet);
  const out = stringsOf(slots, toSet);
  if (slotsOf(out, toSet).join() !== slots.join())
    throw new Error("translatePattern: slot list not preserved");
  return out;
}

/** the same slot on another set — how the pivot string travels */
function translateString(sn, fromSet, toSet) {
  return stringsOf(slotsOf([sn], fromSet), toSet)[0];
}

/**
 * pivotWindow(notes, startDegree, nearFret) → [f0,f1,f2]
 *
 * notes: the scale positions on ONE string, ascending, as {fret, degree}
 * (degree 0-6; every scale in the family carries seven degrees, so a degree
 * survives any key or scale change). The window starts on the occurrence of
 * startDegree NEAREST nearFret — the box slides across the neck rather than
 * jumping (roadmap §1.2's rule, applied to manual context changes) — and
 * takes the next two scale notes up the same string.
 *
 * Occurrences too high on the neck to fit a full three-note window are not
 * candidates; if no candidate carries the degree at all (out-of-range
 * paranoia), the nearest-fitting window is taken clamped. Derived, then
 * asserted: three strictly ascending frets from the input list.
 */
function pivotWindow(notes, startDegree, nearFret) {
  if (!Array.isArray(notes) || notes.length < 3)
    throw new Error("pivotWindow: need at least three scale positions");
  for (let i = 1; i < notes.length; i++)
    if (notes[i].fret <= notes[i - 1].fret)
      throw new Error("pivotWindow: positions must ascend");
  let best = -1;
  for (let i = 0; i <= notes.length - 3; i++)
    if (notes[i].degree === startDegree)
      if (best < 0 || Math.abs(notes[i].fret - nearFret) < Math.abs(notes[best].fret - nearFret))
        best = i;
  if (best < 0) {
    // no window-fitting occurrence (should not happen on a 15-fret neck:
    // any pitch class above fret 11 recurs 12 frets lower) — take the
    // nearest occurrence anywhere and clamp the window into range
    for (let i = 0; i < notes.length; i++)
      if (notes[i].degree === startDegree)
        if (best < 0 || Math.abs(notes[i].fret - nearFret) < Math.abs(notes[best].fret - nearFret))
          best = i;
    if (best < 0) throw new Error(`pivotWindow: degree ${startDegree} not on this string`);
    best = Math.min(best, notes.length - 3);
  }
  const w = [notes[best].fret, notes[best + 1].fret, notes[best + 2].fret];
  if (!(w[0] < w[1] && w[1] < w[2]))
    throw new Error("pivotWindow: derived window not ascending");
  return w;
}

// ---------- load-time structural assertions (golden rule 1, site form) ----------

{
  // translate(translate(p, A, B), B, A) === p — the round-trip invariant,
  // across every pair of the family's four sets and probe figures of every shape
  const SETS = [[1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 6]];
  const SLOT_PROBES = [[0], [1, 0, 2, 2], [2, 1, 0], [0, 0, 1, 2, 2, 1, 0, 0]];
  for (const A of SETS)
    for (const B of SETS)
      for (const slots of SLOT_PROBES) {
        const p = stringsOf(slots, A);
        const back = translatePattern(translatePattern(p, A, B), B, A);
        if (back.join() !== p.join())
          throw new Error("string-sets: translate round-trip is not the identity");
      }
  // the worked case from the item, as arithmetic
  if (slotsOf([3, 4, 2, 2], [2, 3, 4]).join() !== "1,0,2,2")
    throw new Error("string-sets: 3-4-2-2 on 2-3-4 must read mid,low,high,high");
  if (translatePattern([3, 4, 2, 2], [2, 3, 4], [3, 4, 5]).join("-") !== "4-5-3-3")
    throw new Error("string-sets: the worked case must translate to 4-5-3-3");
}
return { lowToHigh, MAX_PATTERN, slotsOf, stringsOf, translatePattern, translateString, pivotWindow };
})();

/* ===== engine/position.mjs ===== */
const __m_engine_position_mjs = (() => {
const { pivotWindow } = __m_engine_string_sets_mjs;
const { field, notesOn } = __m_engine_field_mjs;
/* position.mjs — THE POSITION: the ratified window, generalised from one
 * anchor string to a set of them (Multetudes child 1; multetudes-prd.md §2.2).
 *
 * THE LAW THIS ENCODES (C5, ratified 2026-08-21; AMENDED 2026-09-07 by
 * Daniel's own correction): the isolation window is a rectangle — anchored
 * at the start degree's note on the anchor string, wide enough that THE SET
 * COVERS THE FIELD'S OCTAVE, by the strings of the set tall. The 08-21
 * wording ("three consecutive scale notes on the anchor string wide") was a
 * PROXY stated on the wrong quantity: it derived the width from the anchor
 * string alone, and on three-string sets a whole pitch class vanished
 * (Daniel: "a box should never form over a 3 string set where at least an
 * entire octave is covered ... That's the whole purpose of the 4 or 5 fret
 * width constraint"). The anchor triple REMAINS the window's identity and
 * its floor — where it already covers the octave (four strings and up, and
 * most three-string windows) nothing changes, byte for byte; where it does
 * not, fHi extends UPWARD by the minimum frets that complete the coverage,
 * derived from the set and the field, never tabled, never past the neck's
 * end (which is reported by name, not silently out-widened). The window
 * stays RIGID: a setting, not a consequence — it depends on the FIELD, the
 * SET and the anchor, never on the object, the take, or the current chord.
 * The ruling's generalisation clause generalised upward; nobody had checked
 * downward — the tenth assertion in this project found describing a hope,
 * and the first that was a whole ratified law.
 *
 * A POSITION HAS NO NUMBER (Daniel, 2026-08-23). Its identity is WHERE IT
 * STARTS — anchor string plus start degree — and the start degree is read
 * AGAINST THE REFERENCE: the same physical box starts "from the 6th" in
 * B♭ Ionian and "from the 5th" in C Dorian, because the box did not move,
 * the centre did (pinned in engine/tests/position.test.mjs).
 *
 * THE WINDOW IS DERIVED THROUGH string-sets.mjs's pivotWindow — the relative
 * window that already exists — NOT reimplemented. e5ba874 flattened "three
 * chosen scale notes" into "three adjacent frets" once and it took a week to
 * find; the differential pin in the tests keeps this module honest against
 * pivotWindow itself.
 *
 * TWO WORDS, KEPT APART (G9 was one word doing both jobs):
 *   the ZONE     isolation.mjs's single-string value the optimiser binds
 *                against — untouched, correct, and NOT this module's.
 *   the REGION   the rectangle the neck draws and the isolation READS: the
 *                window's fret span by the strings of the set. regionOf()
 *                names it.
 *
 * Pure: no DOM, no globals, load-time structural assertions.
 */


const span3 = (frets) => frets[2] - frets[0];

/**
 * positionOf({ field, anchorString, startDegree, nearFret, strings }) → the
 * window: { anchorString, startDeg, frets: [f0,f1,f2], fLo, fHi, centre,
 *           covered, uncovered }
 * startDegree is AGAINST THE REFERENCE (the position's identity); the window
 * starts on the occurrence of that degree nearest nearFret and takes the next
 * two scale notes up the same string — pivotWindow's own rule, unrepeated.
 * With `strings` (the set — a SETTING, like everything here), fHi extends by
 * the minimum needed for the set to cover every pitch class of the field
 * (the 2026-09-07 amendment); without it, the anchor-triple floor stands
 * (the pre-amendment callers, and the identity the triple still is).
 * `centre` stays the anchor triple's own mean — the hand's home; the
 * widened tail is reach, not centre.
 */
function positionOf({ field: fld, anchorString, startDegree, nearFret = 5, strings = null } = {}) {
  if (!fld || !Array.isArray(fld.pcs)) throw new Error("positionOf: no field");
  if (!Number.isInteger(startDegree) || startDegree < 0 || startDegree > 6)
    throw new Error(`positionOf: startDegree is a degree 0..6, not ${startDegree}`);
  const aNotes = notesOn(anchorString, fld);
  const frets = pivotWindow(
    aNotes.map((n) => ({ fret: n.fret, degree: n.deg })), startDegree, nearFret);
  // derived, then asserted: three consecutive scale notes span 3 or 4 frets
  // (four or five positions — measured 2,466 times in the 260820 spike, never
  // anything else); a 2-fret span would mean adjacent frets, the e5ba874 shape
  if (span3(frets) !== 3 && span3(frets) !== 4)
    throw new Error(`positionOf: window ${frets.join(",")} spans ${span3(frets)} frets — ` +
      "a scale triple spans 3 or 4; adjacent frets are the flattening the ruling retired");
  let fHi = frets[2], reachLo = frets[0];
  let covered = true, uncovered = [];
  if (strings) {
    /* THE OCTAVE EXTENSION (2026-09-07): widen upward, minimally, until the
     * SET holds every pitch class of the field — derived from notesOn, no
     * table anywhere. The neck's end (fret 15, notesOn's own bound) is the
     * honest stop: what is still missing there is NAMED, never out-widened. */
    const set = [...new Set(strings)];
    const covers = (lo, hi) => {
      const got = new Set();
      for (const st of set)
        for (const n of notesOn(st, fld))
          if (n.fret >= lo && n.fret <= hi) got.add(((n.midi % 12) + 12) % 12);
      return got;
    };
    let got = covers(reachLo, fHi);
    while (got.size < fld.pcs.length && fHi < 15) { fHi++; got = covers(reachLo, fHi); }
    /* THE REACH DOWN (Daniel, 261010 — string 2 from F at fret 6 held no E♭ and Cm7 lost its 3rd): only when the
     * top has run out, the window reaches BELOW the anchor triple, minimally, until the set holds the field or
     * fret 0 is reached. The reach is `reachLo`, never `fLo`: fLo is the anchor's start — the window's identity,
     * which step(), the neck's drag and every nearFret written back read — and the triple, `frets` and `centre`
     * do not move. The widened tail is reach, not centre, now in both directions. */
    while (got.size < fld.pcs.length && reachLo > 0) { reachLo--; got = covers(reachLo, fHi); }
    covered = got.size === fld.pcs.length;
    uncovered = covered ? [] : fld.pcs.filter((pc) => !got.has(pc));
  }
  return {
    anchorString, startDeg: startDegree, frets,
    fLo: frets[0], fHi, reachLo,
    centre: (frets[0] + frets[1] + frets[2]) / 3,
    covered, uncovered,
  };
}

/** step(position, ±1, field) → the next window: the anchor moving one scale
 * note along the anchor string. This is BOX SHIFT, the only travel the model
 * has (the stretch pivot is parked). At the string's ends it stays put. */
function step(pos, dir, fld, strings = null) {
  if (dir !== 1 && dir !== -1) throw new Error("step: dir is +1 or -1");
  const aNotes = notesOn(pos.anchorString, fld);
  const i = aNotes.findIndex((n) => n.fret === pos.fLo);
  if (i < 0)
    throw new Error("step: the position's start is not a scale note on its anchor string — wrong field?");
  const ni = Math.max(0, Math.min(aNotes.length - 3, i + dir));
  const next = positionOf({ field: fld, anchorString: pos.anchorString,
    startDegree: aNotes[ni].deg, nearFret: aNotes[ni].fret, strings });
  if (next.fLo !== aNotes[ni].fret)
    throw new Error("step: the stepped window did not start on the next scale note");
  return next;
}

/** the REGION: the window's height made explicit — the rectangle the neck
 * draws and the isolation reads. The set is a SET (multetudes-prd §2.3):
 * `{6,4,3,1}` is as legal as `{4,3,2,1}`; the region spans min..max of it and
 * an excluded string inside the span is the SURFACE's fact to show, not this
 * value's to hide. */
/** the window's LOW edge as drawn and isolated: the reach down when the top ran out (261010), else the anchor's
 * start. A position built by hand (a test's, a zone's box) has no reachLo and reads its fLo. */
const windowLo = (pos) => (Number.isInteger(pos.reachLo) ? pos.reachLo : pos.fLo);

function regionOf(pos, strings) {
  if (!Array.isArray(strings) || !strings.length)
    throw new Error("regionOf: the set is a non-empty array of strings");
  const set = [...new Set(strings)];
  if (set.length !== strings.length) throw new Error("regionOf: the set repeats a string");
  for (const s of set)
    if (!Number.isInteger(s) || s < 1 || s > 6) throw new Error(`regionOf: string ${s} is not a real string`);
  if (!set.includes(pos.anchorString))
    throw new Error(`regionOf: the anchor (string ${pos.anchorString}) is not in the set ${set.join(",")}`);
  return {
    fLo: windowLo(pos), fHi: pos.fHi,   // the region's low edge is the reach (261010); the anchor's start stays pos.fLo
    /* stored low pitch → high pitch (descending string numbers), the family's
     * storage order (string-sets.mjs law: 1 is the highest pitch) */
    strings: [...set].sort((a, b) => b - a),
    strLo: Math.max(...set), strHi: Math.min(...set),
  };
}

/** materialIn(position, strings, field) → every note the window offers on
 * those strings, low pitch first. UNCAPPED — the per-string ceiling
 * constrains the RESULT, not the pool: capping the material first makes
 * almost every chord unfindable, because the root is rarely the lowest scale
 * note on its string (lineVoicing already gets this right; this matches it). */
/** THE GAMUT'S PREDICATE (night 48): a gamut is degree numbers 1..7 (the stored key's shape) or
 * null for the whole field; a note is offered when its keyDeg is one of them. Defined HERE, the
 * one site that applies it — gamut.mjs derives the collections and imports nothing of this file. */
const inGamut = (gamut, keyDeg) => gamut == null || gamut.includes(keyDeg + 1);

function materialIn(pos, strings, fld, gamut = null) {
  const region = regionOf(pos, strings);
  const out = [];
  /* THE GAMUT (night 48, 261010 — Daniel's partial collection, ruled 261006): a subset of the
   * field's seven degrees narrows what the window OFFERS — a pentatonic, a triad pair, any
   * degrees — as a predicate on keyDeg applied HERE and nowhere else (the one site the material
   * is computed). null is the whole field, today's offer exactly. It narrows what is offered; it
   * never widens what is legal: the off-field throw below is untouched (CR-1 §3). */
  for (const s of region.strings)
    out.push(...notesOn(s, fld).filter((n) => n.fret >= region.fLo && n.fret <= region.fHi && inGamut(gamut, n.keyDeg)));
  for (const n of out)
    if (fld.degOf(n.midi) < 0)
      throw new Error("materialIn: a note outside the field leaked into the material — " +
        "the material is the field's own; an off-field note is legal only as a role-carrying " +
        "APPROACH in the figure's order (CR-1 §3), and this one carries " + (n.role ? `the role "${n.role}", which is not a member's` : "no role"));
  return out;
}

/** reanchor(position, strings, field) → the same DESIGN on a new set: the
 * relative-state doctrine's mechanism for the window (Multetudes child 2).
 * The design is anchor-relative — start degree against the reference — so a
 * set change keeps the start degree, moves the anchor to the new set's
 * lowest-pitch string, and re-derives NEAR THE OLD CENTRE so the box slides
 * rather than jumping (pivotWindow's own nearest rule, unrepeated). The
 * design survives; nothing resets. */
function reanchor(pos, strings, fld) {
  const anchorString = Math.max(...strings);       // lowest pitch in the set
  const next = positionOf({ field: fld, anchorString,
    startDegree: pos.startDeg, nearFret: Math.round(pos.centre), strings });
  if (next.startDeg !== pos.startDeg)
    throw new Error("reanchor: the design's start degree did not survive the set change");
  return next;
}

/* ---------------- load-time structural assertions (golden rule 1) ---------------- */

{
  // every anchor string × every start degree of C major yields a lawful window,
  // and stepping is reversible in the string's interior
  const fld = field({ key: "C", scale: "major" });
  for (let s = 1; s <= 6; s++)
    for (let d = 0; d < 7; d++) {
      const p = positionOf({ field: fld, anchorString: s, startDegree: d, nearFret: 5 });
      if (!(p.fLo < p.frets[1] && p.frets[1] < p.fHi))
        throw new Error("position: a derived window is not ascending");
      const up = step(p, 1, fld);
      if (up.fLo !== p.fLo) {                      // moved (not pinned at an end)
        const back = step(up, -1, fld);
        if (back.frets.join() !== p.frets.join())
          throw new Error("position: step up then down did not return the same window");
      }
    }
  // the region of a skipped set spans min..max and keeps the anchor honest
  const p6 = positionOf({ field: fld, anchorString: 6, startDegree: 0, nearFret: 5 });
  const r = regionOf(p6, [6, 4, 3, 1]);
  if (r.strings.join() !== "6,4,3,1" || r.strLo !== 6 || r.strHi !== 1)
    throw new Error("position: the region of {6,4,3,1} is wrong");
  // the material is uncapped: one string offers more than one note per window
  const m = materialIn(p6, [6], fld);
  if (m.length < 2)
    throw new Error("position: a 3-or-4-fret window on one string must offer at least two scale notes");
}
return { positionOf, step, windowLo, regionOf, inGamut, materialIn, reanchor };
})();

/* ===== engine/open-string.mjs ===== */
const __m_engine_open_string_mjs = (() => {
/* open-string.mjs — THE OPEN STRING'S NAME (night 44, 261008 — Daniel's ruling, 261008).
 *
 * An open string is spelled BY THE DIRECTION OF THE MOVE from standard: down is flat, up is
 * sharp, unmoved is natural. Drop D reads D; a string down one reads E♭; up one reads F♯.
 * Derived; the only table permitted is the twelve names.
 *
 * THE STRING LABEL NAMES THE INSTRUMENT, NOT THE FIELD. This is a deliberate divergence from
 * chromaticSpeller's jurisdiction (engine/chord.mjs — the codebase's law for spelling a
 * chromatic pitch class against a key), and §4.4 requires the reason written down, never a
 * silent departure: under the speller the six labels would re-spell on every key change —
 * the nut flickering between E♭ and D♯ while nothing about the guitar has moved — which is
 * a worse answer to "what am I in?" and breaks the one-thing-moves rule. The key is not an
 * input here. Recorded in notes/specs/multetudes-divergence-register.md.
 *
 * A leaf module — it imports nothing — so a card that needs a set's label can take the
 * label without the tetrad engine's tree (rule 6 for notepad-card's SETS, the absorbed chore).
 * Pure; load-time assertions.
 */

/** the twelve names, each pitch class spelled both ways — [sharp, flat]; a natural is both */
const NAMES = [["C", "C"], ["C♯", "D♭"], ["D", "D"], ["D♯", "E♭"], ["E", "E"], ["F", "F"],
  ["F♯", "G♭"], ["G", "G"], ["G♯", "A♭"], ["A", "A"], ["A♯", "B♭"], ["B", "B"]];

const mod12 = (n) => ((n % 12) + 12) % 12;

/** the open string's name from its sounding midi and its STANDARD midi: the direction of the
 * move chooses the accidental; a natural is a natural whichever way it was reached */
function openStringName(midi, standardMidi) {
  if (!Number.isInteger(midi) || !Number.isInteger(standardMidi))
    throw new Error("open-string: a name needs the string's midi and its standard midi, both integers");
  const [sharp, flat] = NAMES[mod12(midi)];
  return midi < standardMidi ? flat : sharp;   // unmoved (midi === standard) is a natural, spelled either way the same
}

/** a set's label, HIGH → LOW (Shell 4's reading, N4's uppercase from the names themselves),
 * en-dashed — string-run's label rule and the notepad card's, one derivation */
function setLabel(strings, opens, standard) {
  return [...strings].sort((a, b) => a - b).map((s) => openStringName(opens[s], standard[s])).join("–");
}

{
  if (NAMES.length !== 12) throw new Error("open-string: twelve names");
  for (const [s, f] of NAMES) if (typeof s !== "string" || typeof f !== "string") throw new Error("open-string: every pitch class has two spellings");
  if (openStringName(38, 40) !== "D" || openStringName(39, 40) !== "E♭" || openStringName(42, 40) !== "F♯")
    throw new Error("open-string: the direction rule does not hold — drop D reads D, down one E♭, up two F♯");
}
return { openStringName, setLabel };
})();

/* ===== engine/string-run.mjs ===== */
const __m_engine_string_run_mjs = (() => {
const { lowToHigh, slotsOf, stringsOf, translatePattern } = __m_engine_string_sets_mjs;
const { OPEN_MIDI, opensOf } = __m_engine_field_mjs;
const { setLabel } = __m_engine_open_string_mjs;
/* string-run.mjs — THE FREE STRING SET: any set of strings, contiguous or
 * skipped, with a stored identity and a derived label (Multetudes child 2;
 * multetudes-prd.md §2.3 — closes G6 and G16 at one note per string).
 *
 * THE LOAD-BEARING IDEA (the item's): a string skip is how you ask for a
 * spread voicing. On a skipped set the interval between adjacent chosen
 * strings widens, so close-position stacks fail the fret filter and the drops
 * survive. There is no "spread voicing" shape type, and there must not be one.
 * What was missing was never the generator (placeOnSet consults adjacency
 * nowhere) — it was CHOOSING the set, STORING it, and LABELLING it.
 *
 *   the identity   the run itself: an ARRAY OF STRINGS, stored as such.
 *                  `fromSetIndex` is the LOAD-TIME MIGRATION ALIAS the 260820
 *                  measurements prescribe — old configs restore through it;
 *                  nothing ever writes setIndex again (no dual-write).
 *   the label      DERIVED from the run's strings in the family's dialect —
 *                  high → low, en-dashes, uppercase E (N4) — from the open
 *                  strings' own pitch classes. Never enumerated; the test
 *                  greps this file to prove no label literal exists.
 *   the wiring     translation goes THROUGH string-sets.mjs (slotsOf /
 *                  stringsOf / translatePattern) — the relative-state
 *                  doctrine's mechanism, which nothing imported until
 *                  tonight. Nothing is reimplemented here.
 *
 * THE UNEQUAL-SIZE RULE, decided and written down (the item demands an
 * answer; translatePattern refuses by design and keeps refusing):
 *
 *   Translation is EXACT into an equal-or-larger run — every slot exists, and
 *   the equal case round-trips as the identity (string-sets.mjs's own law).
 *   Into a SMALLER run, a slot past the top CLAMPS TO THE TOP SLOT — the
 *   figure keeps its contour and its low notes, and its ceiling flattens onto
 *   the run's highest string — and the translation REPORTS which steps it
 *   clamped. A four-slot figure on a three-string run means: play the same
 *   walk, and the note that lived on the missing fourth string lives on the
 *   highest string you kept. Loud, lossy, and stated — never silent (§4.4;
 *   drill.orderFor's silent overwrite is the named defect class).
 *
 * Pure: no DOM, no globals, load-time structural assertions.
 */



/* THE LABEL RULE, DECIDED (night 44, 261008 — Daniel): an open string is
 * spelled by the direction of its move from standard — down flat, up sharp,
 * unmoved natural (open-string.mjs, one derivation, the reason beside it).
 * Until tonight this module threw on a non-natural open string by design:
 * "the label rule needs a decision". The opens are the FIELD's now, handed
 * in; OPEN_MIDI here is the default a caller without a field gets. */

/** makeRun([6,4,3,1]) → { strings, label, contiguous, opens }
 * `strings` stored low pitch → high pitch (descending numbers — the family's
 * storage order); `opens` parallel open-string midis (placeOnSet's `set`);
 * `label` high → low (Shell 4's reading), derived. */
function makeRun(strings, opens = OPEN_MIDI) {
  if (!Array.isArray(strings) || !strings.length)
    throw new Error("string-run: a run is a non-empty array of strings");
  if (!opens || typeof opens !== "object") throw new Error("string-run: a run needs the field's opens (fld.opens)");
  const set = [...new Set(strings)];
  if (set.length !== strings.length) throw new Error("string-run: a run repeats a string");
  for (const s of set)
    if (!Number.isInteger(s) || s < 1 || s > 6)
      throw new Error(`string-run: string ${s} is not a real string`);
  const lh = lowToHigh(set);                       // descending numbers = ascending pitch
  const run = {
    strings: lh,
    opens: lh.map((s) => opens[s]),
    label: setLabel(set, opens, OPEN_MIDI),
    contiguous: lh.every((s, i) => i === 0 || s === lh[i - 1] - 1),
  };
  for (let i = 1; i < run.opens.length; i++)
    if (run.opens[i] <= run.opens[i - 1])
      throw new Error("string-run: opens must ascend low → high with the strings");
  return run;
}

/** THE MIGRATION ALIAS: an old config's `setIndex`, read against the
 * enumeration it indexed (the caller passes it — engine/tetrad-sequence.mjs's
 * STRING_SETS). Load-time only; nothing writes setIndex back. */
function fromSetIndex(i, sets, opens = OPEN_MIDI) {
  if (!Array.isArray(sets) || !sets[i])
    throw new Error(`string-run: setIndex ${i} does not name a set in the given enumeration`);
  return makeRun(sets[i].strings, opens);
}

/** translateFigure(pattern, fromRun, toRun) → { pattern, clamped }
 * pattern: absolute string numbers (the player's reading). Equal sizes
 * delegate to string-sets.mjs's translatePattern, exactness asserted there.
 * Unequal sizes apply THE RULE above; `clamped` lists the 0-based steps whose
 * slot was flattened onto the top slot — [] means the translation was exact. */
function translateFigure(pattern, fromRun, toRun) {
  if (pattern === null || pattern === undefined) return { pattern: null, clamped: [] };
  if (fromRun.strings.length === toRun.strings.length)
    return { pattern: translatePattern(pattern, fromRun.strings, toRun.strings), clamped: [] };
  const slots = slotsOf(pattern, fromRun.strings);
  const top = toRun.strings.length - 1;
  const clamped = [];
  const mapped = slots.map((k, i) => {
    if (k <= top) return k;
    clamped.push(i);
    return top;
  });
  const out = stringsOf(mapped, toRun.strings);
  if (slots.some((k) => k <= top)) {
    // derived, then asserted: every unclamped step still reads the same slot
    const back = slotsOf(out, toRun.strings);
    for (let i = 0; i < slots.length; i++)
      if (!clamped.includes(i) && back[i] !== slots[i])
        throw new Error("string-run: an unclamped step changed slot in translation");
  }
  return { pattern: out, clamped };
}

/* ---------------- load-time structural assertions (golden rule 1) ---------------- */

{
  // the label rule is total (night 44): every open of the default names, and a moved one
  // names by its direction — G–D–A–D for the low set in drop D
  const moved = setLabel([6, 5, 4, 3], opensOf({ 6: -2 }), OPEN_MIDI).split("–");
  if (moved.length !== 4 || moved[3] !== "D" || moved[0] !== "G")
    throw new Error("string-run: the label rule does not follow a moved string (drop D's low set ends on D)");
  // the label reads high → low: four contiguous runs, spot arithmetic
  const r = makeRun([6, 5, 4, 3]);
  if (r.label.split("–").length !== 4 || !r.contiguous)
    throw new Error("string-run: the contiguous four-string run mislabels");
  const sk = makeRun([6, 4, 3, 1]);
  if (sk.contiguous) throw new Error("string-run: {6,4,3,1} is not contiguous");
  if (sk.strings.join() !== "6,4,3,1")
    throw new Error("string-run: storage order is low pitch → high pitch");
  // growing is exact; the clamp reports; nothing is silent
  const from = makeRun([4, 3, 2, 1]), to3 = makeRun([3, 2, 1]);
  const t = translateFigure([4, 3, 4, 3, 2, 1], from, to3);
  if (!t.clamped.length)
    throw new Error("string-run: a 4-slot figure on a 3-string run must report its clamp");
  const grow = translateFigure([3, 2, 1], to3, from);
  if (grow.clamped.length || grow.pattern.join() !== "4,3,2")
    throw new Error("string-run: growing a run must translate exactly, by slot");
}
return { makeRun, fromSetIndex, translateFigure };
})();

/* ===== engine/motion.mjs ===== */
const __m_engine_motion_mjs = (() => {
/* motion.mjs — the motion grammar (component v1).
 *
 * The shared drill layer's figure language (spec: notes/specs/motion-grammar.md;
 * Triadetudes v0.7 phase 3 is the first consumer; Tetradetudes and Substitute
 * Teacher inherit it). Pure: no DOM, no audio, no globals.
 *
 *   tones mode :  (-1,+2)[1] - (+2,-1)[3] - (-s,+s)[5]
 *   shape mode :  (-1,+2)H   - M          - (-s)L
 *
 * Targets: [deg] in tones mode (degrees 1–7 and compound 9/11/13, accidentals
 * b/#; compounds reduce mod 7 for pitch, keep their spelling for the readout);
 * H/M/L in shape mode (H = the set's highest-pitched string). Approach items,
 * in parens before their target, played in written order, target last:
 * a LEADING SIGN means distance from the target (-1 half step below, +2 whole
 * step above, -s the next scale tone below, +2s two scale steps); an UNSIGNED
 * token is an absolute degree of the étude's KEY (b9, 2, #9) taken in the
 * octave nearest the target. `s` means the étude's selected scale — chord-
 * scales are a v0.8+ question and are not improvised here (spec §4.4).
 *
 * describe() is the deliverable, not documentation (spec §5): it names the
 * idiom by DERIVATION from the figure's shape — enclosed / a run from /
 * approached from — never a lookup of figures. Parse failures surface as the
 * sentence refusing to finish plus a caret position; no color anywhere.
 *
 * MAX_EVENTS refuses by name; nothing truncates.
 */

const mod12 = (n) => ((n % 12) + 12) % 12;

const MAX_EVENTS = 16; // the family's figure ceiling (parseArp's, shared)

// degree → semitones above the root/tonic (chord.mjs's DEG arithmetic, restated
// and load-asserted; compounds reduce mod 7 for pitch, spelling kept aside)
const DEG_SEMIS = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 9: 14, 11: 17, 13: 21 };
const DEGREES = [1, 2, 3, 4, 5, 6, 7, 9, 11, 13];
for (const d of DEGREES)
  if (!(d in DEG_SEMIS)) throw new Error(`motion: degree ${d} has no interval`);
if (DEG_SEMIS[9] % 12 !== DEG_SEMIS[2] || DEG_SEMIS[11] % 12 !== DEG_SEMIS[4] ||
    DEG_SEMIS[13] % 12 !== DEG_SEMIS[6])
  throw new Error("motion: compound degrees must reduce mod 7");

function degreeSemis(deg, acc) { return DEG_SEMIS[deg] + (acc || 0); }

// ---------- the classifier: ONE predicate for clicking and typing ----------

/**
 * classify(pc, chordPcs) → {role:"target", degText:"1"|"3"|"5"} | {role:"approach", degText:null}
 * The rule (spec §3, ratified 2026-08-10): a pitch class is a TARGET iff it is
 * a chord tone of the sounding chord; anything else is an approach. This is the
 * sketchpad's click classifier AND the grammar's target-legality rule — the
 * same sentence, one predicate, so clicking and typing cannot drift.
 */
function classify(pc, chordPcs) {
  const ix = chordPcs.indexOf(mod12(pc));
  return ix >= 0 ? { role: "target", degText: String([1, 3, 5][ix]) }
                 : { role: "approach", degText: null };
}

// ---------- parse ----------

const err = (pos, message, figures) => ({ error: { pos, message }, figures });

/**
 * parse("( -1,+2 )[1] - [3]", "tones") →
 *   { mode, figures: [ { approaches:[item…], target } … ], n }
 * or { error: { pos, message }, figures: <parsed so far> }.
 *
 * item: {kind:"semi",delta:±n} | {kind:"scale",delta:±k}
 *     | {kind:"degree",deg,acc,text}
 * target (tones): {kind:"degree",deg,acc,text} · (shape): {kind:"slot",slot}
 */
function parse(src, mode) {
  if (typeof src !== "string") return err(0, "not a string", []);
  const figures = [];
  let i = 0, n = 0;
  const ws = () => { while (i < src.length && /\s/.test(src[i])) i++; };
  const parseDegreeToken = () => {
    const m = src.slice(i).match(/^([b#]?)(13|11|9|[1-7])/);
    if (!m) return null;
    i += m[0].length;
    return { kind: "degree", deg: +m[2], acc: m[1] === "b" ? -1 : m[1] === "#" ? 1 : 0,
      text: m[0] };
  };
  const parseItem = () => {
    const m = src.slice(i).match(/^([+-])(\d*)(s?)/);
    if (m && (m[2] || m[3])) {
      i += m[0].length;
      const sign = m[1] === "-" ? -1 : 1;
      if (m[3] === "s") return { kind: "scale", delta: sign * (m[2] ? +m[2] : 1) };
      return { kind: "semi", delta: sign * +m[2] };
    }
    if (m) return "sign-without-distance";
    return parseDegreeToken();
  };
  while (i < src.length) {
    ws();
    if (i >= src.length) break;
    const approaches = [];
    if (src[i] === "(") {
      i++;
      for (;;) {
        ws();
        if (src[i] === ")") { i++; break; }
        const item = parseItem();
        if (item === "sign-without-distance")
          return err(i, "a sign needs a distance: -1, +2, -s, +2s", figures);
        if (!item)
          return err(i, "expected an approach: -1, +2, -s, +2s, or a degree like b9", figures);
        approaches.push(item);
        ws();
        if (src[i] === ",") { i++; continue; }
        if (src[i] === ")") { i++; break; }
        return err(i, 'expected "," or ")" in the approach figure', figures);
      }
      ws();
    }
    let target = null;
    if (mode === "shape") {
      const c = (src[i] || "").toUpperCase();
      if (c === "H" || c === "M" || c === "L") { target = { kind: "slot", slot: c }; i++; }
      else return err(i, "expected a slot target: H, M or L", figures);
    } else {
      if (src[i] === "[") {
        i++;
        const d = parseDegreeToken();
        if (!d) return err(i, "expected a degree inside [ ]", figures);
        if (src[i] !== "]") return err(i, 'expected "]"', figures);
        i++;
        target = d;
      } else return err(i, "expected a target like [1] or [b3]", figures);
    }
    figures.push({ approaches, target });
    n += approaches.length + 1;
    if (n > MAX_EVENTS)
      return err(i, `${n} notes per chord — ${MAX_EVENTS} is the ceiling; split the figure`,
        figures);
    ws();
    if (i >= src.length) break;
    if (src[i] === "-") { i++; continue; }
    return err(i, 'expected "-" between figures', figures);
  }
  if (!figures.length) return err(0, "empty figure", figures);
  return { mode, figures, n };
}

// ---------- serialize (idempotent normal form) ----------

const itemText = (it) =>
  it.kind === "semi" ? (it.delta < 0 ? String(it.delta) : "+" + it.delta) :
  it.kind === "scale" ? ((it.delta < 0 ? "-" : "+") +
    (Math.abs(it.delta) === 1 ? "" : Math.abs(it.delta)) + "s") :
  (it.acc === -1 ? "b" : it.acc === 1 ? "#" : "") + it.deg;

function serialize(parsed) {
  return parsed.figures.map((f) => {
    const t = f.target.kind === "slot" ? f.target.slot
      : "[" + itemText(f.target) + "]";
    return (f.approaches.length ? "(" + f.approaches.map(itemText).join(",") + ")" : "") + t;
  }).join(" - ");
}

// ---------- describe: the idiom, named by derivation ----------

const ORDINAL = { 1: "root", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th",
  7: "7th", 9: "9th", 11: "11th", 13: "13th" };
const SLOT_NAME = { H: "high string", M: "middle string", L: "low string" };

function targetName(t) {
  if (t.kind === "slot") return "the " + SLOT_NAME[t.slot];
  const acc = t.acc === -1 ? "♭" : t.acc === 1 ? "♯" : "";
  return "the " + acc + ORDINAL[t.deg];
}
function itemName(it) {
  if (it.kind === "semi") {
    const n = Math.abs(it.delta), side = it.delta < 0 ? "below" : "above";
    const dist = n === 1 ? "a half step" : n === 2 ? "a whole step" : n + " semitones";
    return dist + " " + side;
  }
  if (it.kind === "scale") {
    const k = Math.abs(it.delta), side = it.delta < 0 ? "below" : "above";
    return (k === 1 ? "the scale tone" : k + " scale steps") + " " + side;
  }
  const acc = it.acc === -1 ? "♭" : it.acc === 1 ? "♯" : "";
  return "the " + acc + it.deg;
}
function sideOf(it) { // signed items only; absolute degrees have no side until resolved
  return it.kind === "degree" ? null : it.delta < 0 ? -1 : 1;
}

function describe(parsed) {
  return parsed.figures.map((f) => {
    const t = targetName(f.target);
    const a = f.approaches;
    if (!a.length) return t.charAt(0).toUpperCase() + t.slice(1) + ".";
    const names = a.map(itemName);
    const list = names.length === 1 ? names[0] :
      names.slice(0, -1).join(", ") + ", then " + names[names.length - 1];
    const sides = a.map(sideOf);
    let idiom;
    if (a.length === 1) idiom = "approached from " + list;
    else if (a.length === 2 && sides[0] !== null && sides[1] !== null &&
             sides[0] !== sides[1]) idiom = "enclosed — " + list;
    else if (sides.every((s2) => s2 !== null) &&
             sides.every((s2) => s2 === sides[0]))
      idiom = "approached by a run from " + list;
    else idiom = "approached — " + list;
    const T = t.charAt(0).toUpperCase() + t.slice(1);
    return T + ", " + idiom + ".";
  }).join(" ");
}

// ---------- resolve: figures + a chord context → role-tagged note entries ----------

/**
 * ctx: {
 *   chordPcs: [r,t,f],           // the chord's own tones (root first)
 *   rootPc,                      // for degree targets beyond the triad
 *   voicing: {notes:[{midi,string,fret,slot}]},
 *   scalePcs: [7 pcs],           // the étude's selected scale
 *   tonicPc,                     // for absolute-degree approaches
 *   open: {string→midi}, nfrets,
 *   set: [strings], setLowHigh: [low→high]
 * }
 * Returns entries [{midi,string,fret,slot,role}...] in playing order.
 * Every derivation is asserted before return (spec §8).
 */
/** approachMidi(item, targetMidi, {scalePcs, tonicPc}) → the approach's
 * midi — the ONE implementation of the three approach kinds (260918, CR-1:
 * exported so the Multetudes selection resolves approaches through the path
 * this module already owns rather than a second arithmetic):
 *   semi   → the target ± n semitones
 *   scale  → k scale tones below/above, walked through scalePcs
 *   degree → an absolute degree of the KEY, in the octave nearest the target */
function approachMidi(it, targetMidi, ctx) {
  if (it.kind === "semi") return targetMidi + it.delta;
  if (it.kind === "scale") {
    const dir = it.delta < 0 ? -1 : 1;
    let m = targetMidi, steps = Math.abs(it.delta);
    while (steps > 0) {
      m += dir;
      if (ctx.scalePcs.includes(mod12(m))) steps--;
      if (Math.abs(m - targetMidi) > 24)
        throw new Error("motion: scale walk ran away — scale context broken");
    }
    return m;
  }
  const pc = mod12(ctx.tonicPc + degreeSemis(it.deg, it.acc));
  const base = targetMidi - mod12(targetMidi) + pc;      // the octave nearest the target
  return [base - 12, base, base + 12].reduce((a, b2) =>
    Math.abs(b2 - targetMidi) < Math.abs(a - targetMidi) ? b2 : a);
}

/** placeNear(midi, nearFret, preferString, {set, open, nfrets}) → the nearest
 * playable position to nearFret on the set; the target's own string wins a
 * tie (exported 260918 for the same reason as approachMidi) */
function placeNear(midi, nearFret, preferString, ctx) {
  let best = null;
  for (const sn of ctx.set) {
    const f = midi - ctx.open[sn];
    if (f < 0 || f > ctx.nfrets + 2) continue;
    const d = Math.abs(f - nearFret) + (sn === preferString ? 0 : 0.25);
    if (!best || d < best.d) best = { string: sn, fret: f, d };
  }
  if (!best) throw new Error("motion: no playable position for midi " + midi);
  return best;
}

function resolve(parsed, ctx) {
  const out = [];
  const placeOnSet = (midi, nearFret, preferString) => placeNear(midi, nearFret, preferString, ctx);
  let prevFret = null;
  for (const fig of parsed.figures) {
    // target first — approaches are relative to it
    let tNote = null;
    if (fig.target.kind === "slot") {
      const slot = { L: 0, M: 1, H: 2 }[fig.target.slot];
      tNote = ctx.voicing.notes.find((n) => n.slot === slot);
      if (!tNote) throw new Error("motion: slot " + fig.target.slot +
        " is not a bijection here — shape mode needs one note per string");
      tNote = { ...tNote };
    } else {
      // target legality (spec §3, v0.7.6): a bare 1/3/5 names the chord's own
      // root/third/fifth (quality-aware); any other spelling resolves to a
      // pitch class and is legal ONLY if the chord contains it — [b3] on a
      // minor chord is legal by derivation, [2] on any triad is refused, and
      // the refusal teaches the construct that was wanted. Every legal target
      // is therefore in the voicing: resolve() never invents a position and no
      // figure can escape the isolation zone.
      const t = fig.target;
      const pc = (t.acc === 0 && (t.deg === 1 || t.deg === 3 || t.deg === 5))
        ? ctx.chordPcs[{ 1: 0, 3: 1, 5: 2 }[t.deg]]
        : mod12(ctx.rootPc + degreeSemis(t.deg, t.acc));
      if (classify(pc, ctx.chordPcs).role !== "target") {
        // the teaching refusal: suggest the nearest chord tone (upper on ties)
        let best = null;
        for (let k = 0; k < 3; k++) {
          const up = mod12(ctx.chordPcs[k] - pc), down = mod12(pc - ctx.chordPcs[k]);
          const d = Math.min(up, down);
          if (!best || d < best.d || (d === best.d && up < best.up))
            best = { k, d, up };
        }
        const tok = itemText(t);
        const e = new Error("[" + tok + "] is not a chord tone of " +
          (ctx.chordLabel || "the chord") + " — write (" + tok + ")[" +
          [1, 3, 5][best.k] + "] and it becomes an approach to " +
          ["the root", "the third", "the fifth"][best.k] + ".");
        e.teach = true;
        throw e;
      }
      const inVoicing = ctx.voicing.notes.find((n) => mod12(n.midi) === pc);
      if (!inVoicing)
        throw new Error("motion: chord tone pc " + pc + " missing from the voicing — voicing dishonest");
      tNote = { ...inVoicing };
    }
    // approaches, in written order, target last
    for (const it of fig.approaches) {
      const midi = approachMidi(it, tNote.midi, ctx);
      const pos = placeOnSet(midi, tNote.fret, tNote.string);
      const ev = { midi, string: pos.string, fret: pos.fret,
        slot: ctx.setLowHigh.indexOf(pos.string), role: "approach" };
      // derived, then asserted (spec §8)
      if (it.kind === "semi" && ev.midi - tNote.midi !== it.delta)
        throw new Error("motion: approach is not its written distance from the target");
      if (it.kind === "scale" && !ctx.scalePcs.includes(mod12(ev.midi)))
        throw new Error("motion: scale approach left the scale");
      if (it.kind === "degree" &&
          mod12(ev.midi) !== mod12(ctx.tonicPc + degreeSemis(it.deg, it.acc)))
        throw new Error("motion: degree approach missed its pitch class");
      if (ctx.open[ev.string] + ev.fret !== ev.midi)
        throw new Error("motion: approach placement dishonest");
      out.push(ev);
    }
    out.push({ ...tNote, role: "chord" });
    prevFret = tNote.fret;
  }
  if (out.length > MAX_EVENTS)
    throw new Error("motion: " + out.length + " notes — " + MAX_EVENTS + " is the ceiling");
  return out;
}

/* NAMED for a shared scope (260918): the door build inlines every module into
 * one scope and blanks the import lines, so an importer cannot alias —
 * `parse as parseMotion` names a symbol that never exists in the built page —
 * and the build REFUSES a re-export list by name (the night the build dropped
 * one in silence is in the verification doctrine). So the shared names are
 * plain exported constants; the Multetudes selection imports exactly these. */
const parseMotion = parse;
const describeMotion = describe;

// ---------- the sketchpad's emitter (the grammar's first external producer) ----------

/**
 * approachForms(midi, targetMidi, scalePcs) → {scale:boolean, semi:boolean}
 * Which readings exist for a click: scale iff the click is the adjacent scale
 * tone in its direction; semi iff within two semitones. Both true = the form
 * is tap-switchable in the sketch (v0.7.5); a click cannot reveal intent.
 */
function approachForms(midi, targetMidi, scalePcs) {
  const d = midi - targetMidi;
  if (d === 0) return { scale: false, semi: false };
  const dir = d < 0 ? -1 : 1;
  let m2 = targetMidi, hit = null;
  for (let k = 1; k <= 12; k++) {
    m2 += dir;
    if (scalePcs.includes(mod12(m2))) { hit = m2; break; }
  }
  return { scale: hit === midi, semi: Math.abs(d) <= 2 };
}

/**
 * emitFromClicks(clicks, ctx) → { src, discarded } | { error, at? }
 * clicks: [{midi, role:"target"|"approach", degText?, form?, slot?}] in click
 * order (= playing order). Classification happens at click time against the
 * then-current chord (the honest reading); this function only serialises.
 * Emission is deliberately LOSSY: degrees and relationships survive; octave and
 * placement are discarded — a figure is a design, not a fingering.
 *
 * THE SKETCH SPEAKS BOTH LANGUAGES (260812.7): ctx.mode picks the output
 * grammar. "shape" emits a slot pattern — every click must be a chord tone
 * (role target) carrying a slot letter (H/M/L, the caller's string-set rule);
 * an approach or a slotless click refuses with { error, at } naming it, since
 * shape has no approach vocabulary and a pattern is made of slots. "tones"
 * (the default — absent ctx.mode is the pre-260812.7 contract, pinned) emits
 * degree figures exactly as before. The emitter never chooses the mode; the
 * caller's toggle does. That is the whole point.
 *
 * Approach precedence (spec §4.1, v0.7.5): SCALE-ADJACENCY FIRST, semitone
 * fallback — and NO third form (ratified 2026-08-11, the palette's rule,
 * asserted here 2026-08-12): EMIT INVARIANTS, NEVER COORDINATES. A bare
 * degree in an approach slot is absolute against the key and stops following
 * a key or scale change; where no relative reading exists the emitter
 * REFUSES, returning { error, at } with `at` the index of the offending
 * click, so the caller can hold that click out by name rather than guess.
 * (The GRAMMAR still parses hand-typed degree approaches — user input is the
 * user's; this rule binds what the sketch emits.) `form: "semi"|"scale"`
 * overrides the default when that reading exists — the tap in the sketch.
 * ctx: { scalePcs, tonicPc }.
 */
function emitFromClicks(clicks, ctx) {
  if (ctx.mode === "shape") {
    const figures = [];
    for (let ci = 0; ci < clicks.length; ci++) {
      const c = clicks[ci];
      if (c.role !== "target")
        return { error: "shape has no approaches — switch to the tones to " +
          "use this note", at: ci };
      if (!c.slot)
        return { error: "no slot — the click is not on the set's strings " +
          "(or the grip's notes)", at: ci };
      figures.push({ approaches: [], target: { kind: "slot", slot: c.slot } });
    }
    if (!figures.length) return { error: "nothing to emit — the sketch is empty" };
    if (figures.length > MAX_EVENTS)
      return { error: figures.length + " notes — " + MAX_EVENTS + " is the ceiling" };
    return { src: serialize({ mode: "shape", figures, n: figures.length }),
      discarded: "octave and placement dropped — a figure is a design, not a fingering" };
  }
  const figures = [];
  let pending = [];
  for (let ci = 0; ci < clicks.length; ci++) {
    const c = clicks[ci];
    if (c.role === "target") {
      const m = (c.degText || "").match(/^([b#]?)(13|11|9|[1-7])$/);
      if (!m) return { error: 'a target needs a degree — got "' + (c.degText || "") + '"' };
      const target = { kind: "degree", deg: +m[2],
        acc: m[1] === "b" ? -1 : m[1] === "#" ? 1 : 0, text: m[0] };
      const approaches = [];
      for (const p of pending) {
        const a = p.click, d = a.midi - c.midi;
        const dir = d < 0 ? -1 : 1;
        const forms = approachForms(a.midi, c.midi, ctx.scalePcs);
        if (a.form === "semi" && forms.semi) { approaches.push({ kind: "semi", delta: d }); continue; }
        if (a.form === "scale" && forms.scale) { approaches.push({ kind: "scale", delta: dir }); continue; }
        if (forms.scale) { approaches.push({ kind: "scale", delta: dir }); continue; }
        if (forms.semi) { approaches.push({ kind: "semi", delta: d }); continue; }
        // no relative reading exists: REFUSE — a bare degree here would be a
        // coordinate stored where the app stores invariants (v0.6.6's failure)
        return { error: "an approach has no relative reading against its " +
          "target — not scale-adjacent, more than two semitones. Invariants " +
          "only: the click is refused, not renamed", at: p.at };
      }
      figures.push({ approaches, target });
      pending = [];
    } else pending.push({ click: c, at: ci });
  }
  if (pending.length)
    return { error: pending.length +
      " trailing approach note(s) with no target to resolve to — click a chord tone last" };
  if (!figures.length) return { error: "nothing to emit — the sketch is empty" };
  const parsed = { mode: "tones", figures,
    n: figures.reduce((a, f) => a + f.approaches.length + 1, 0) };
  if (parsed.n > MAX_EVENTS)
    return { error: parsed.n + " notes — " + MAX_EVENTS + " is the ceiling" };
  return { src: serialize(parsed),
    discarded: "octave and placement dropped — a figure is a design, not a fingering" };
}

// ---------- load-time assertions (golden rule 1, site form) ----------

{
  // the fixed-point property on a probe corpus: serialize ∘ parse is idempotent
  const probes = [
    ["tones", "(-1,+2)[1] - (+2,-1)[3] - (-s,+s)[5]"],
    ["tones", "[1]-[3]-[5]"],
    ["tones", "(b9,-1)[1]"],
    ["shape", "(-1,+2)H - M - (-s)L"],
    ["shape", "H-M-L"],
  ];
  for (const [mode, src] of probes) {
    const p1 = parse(src, mode);
    if (p1.error) throw new Error("motion: probe failed to parse: " + src);
    const s1 = serialize(p1);
    const p2 = parse(s1, mode);
    if (p2.error || serialize(p2) !== s1)
      throw new Error("motion: serialize∘parse is not a fixed point for " + src);
    if (!describe(p1)) throw new Error("motion: describe incomplete for " + src);
  }
  if (!parse("x", "tones").error) throw new Error("motion: garbage must refuse");
  const over = parse(Array(9).fill("(-1)[1]").join("-"), "tones");
  if (!over.error || !/ceiling/.test(over.error.message))
    throw new Error("motion: the event ceiling must refuse by name");
  // the classifier is one predicate: chord tone → target with its degree
  const CM = [0, 4, 7];
  if (classify(4, CM).degText !== "3" || classify(2, CM).role !== "approach")
    throw new Error("motion: the classifier predicate broke");
  // emitter precedence (spec §4.1, v0.7.5): scale-adjacency FIRST
  const CMAJ = [0, 2, 4, 5, 7, 9, 11];
  const probe = (clicks, want) => {
    const r = emitFromClicks(clicks, { scalePcs: CMAJ, tonicPc: 0 });
    if (r.src !== want)
      throw new Error("motion: emitter precedence broke — got " + (r.src || r.error));
  };
  probe([{ midi: 65, role: "approach" }, { midi: 67, role: "target", degText: "5" }],
    "(-s)[5]");                          // diatonic whole step → the invariant
  probe([{ midi: 61, role: "approach" }, { midi: 60, role: "target", degText: "1" }],
    "(+1)[1]");                          // chromatic half step → the coordinate
  probe([{ midi: 65, role: "approach", form: "semi" },
    { midi: 67, role: "target", degText: "5" }], "(-2)[5]");  // the tap override
}
return { MAX_EVENTS, degreeSemis, classify, parse, serialize, describe, approachMidi, placeNear, resolve, parseMotion, describeMotion, approachForms, emitFromClicks };
})();

/* ===== engine/selection.mjs ===== */
const __m_engine_selection_mjs = (() => {
const { parseChord } = __m_engine_chord_mjs;
const { field } = __m_engine_field_mjs;
const { positionOf, materialIn, windowLo } = __m_engine_position_mjs;
const { parseMotion, describeMotion, approachMidi, placeNear } = __m_engine_motion_mjs;
/* selection.mjs — THE SELECTION: what is taken from the field's pool
 * (Multetudes child 3a — Route B, ratified 2026-08-28).
 *
 * THE SECOND PLACEMENT PATH, DELIBERATELY. This module is native over
 * engine/field.mjs, engine/position.mjs and engine/string-run.mjs, and it is
 * the only place in the engine that knows a string can carry more than one
 * note. The shipped one-note-per-string path (tetrad-voicings → isolation) is
 * untouched: per-stream arity is CORRECT there, the frozen oracles pin it,
 * and this module is built beside it rather than through it.
 *
 * WHY NOT DELEGATE TO isolation.mjs's lineVoicing, which implements the same
 * §6.1.2 choice: (1) the route was ratified as a second path WITH a
 * conformance case — delegation would make the case vacuous and the filed
 * retirement item (3c) meaningless; (2) isolation.mjs is carried by the
 * tetradetudes door, so a multetudes path that depended on it would hit the
 * carrier constraint on its first change — the exact wall Route B exists to
 * avoid. The two implementations are instead ASSERTED TO AGREE on shared
 * ground (family standard U1 — a named behaviour, pinned):
 * engine/tests/selection.test.mjs, "the §6.1.2 choice".
 *
 * THE THREE RULES (the prototype's, derived and asserted — never copied):
 *
 *   oneOfEach        a VOICING: one occurrence per chord tone — spreading
 *                    before tightening (THE VOICING RULE, below), then
 *                    minimising total fret span, then drift from the frame
 *                    centre, then the lower strings. The ceiling is checked
 *                    ON THE COMBINATION, never on the candidates: capping the
 *                    pool made almost every chord unfindable, because the
 *                    root is rarely the lowest note on its string.
 *   everyOccurrence  an ARPEGGIO: every instance of the chord's tones in the
 *                    pool, at most n per string, by pitch.
 *   scaleTake        the scale object takes EVERY note the box offers, capped
 *                    only by the hand's three-per-string reach. PLACEMENT
 *                    DOES NOT APPLY TO A SCALE — a scale run is not sounded
 *                    together — and the reason belongs on the surface's
 *                    label, never in a silently halved material.
 *
 * THE VOICING RULE, and the counterexample that forced it to be a rule
 * rather than a consequence. The guide claims one-per-string "is always the
 * tighter span and the placement rule prefers it". FALSE, found by this
 * module's own load probe: C major, window frets 3–7 on string 5, tetrad
 * C E G B over strings {5,4,3,2} — the span-minimal combination puts C at
 * 3/5 and B at 3/4 on ONE string (span 1), beating the one-per-string
 * combination (span 2). The carried §6.1.2 key would double there too. But a
 * VOICING is "only what can sound together" (the model's own definition of
 * Grip), and two notes on one string cannot sound together — so one-of-each
 * SPREADS BEFORE IT TIGHTENS: the leading key term is the count of notes
 * forced onto shared strings, zero when tones ≤ strings allow it, minimal
 * (R7's 2+1, never 3+0) when the geometry forces a fold. TAKE IS NOT
 * PLACEMENT is then a theorem, not a sampled hope: raising the ceiling
 * PERMITS a second note on a string and never CAUSES one. Asserted at load.
 *
 * THE CAP IS A VOICING'S RULE (Daniel, 261012, on injection 261011c's item 2).
 * The simultaneity argument above is sound for a voicing — Grip, and the
 * tetrad doors' free placement — and it was applied to every placement,
 * including one that is not a voicing: a LINE. A line is played one note
 * after another along the set; no hand holds its notes together, so nothing
 * caps a string. `capOf(notesPer)` is the one site that says so: Grip's
 * stored value 1 is its cap; Line's stored value 3 (the control's, the
 * format's, every saved étude's — untouched) NAMES the placement and no
 * longer bounds it — its cap is UNCAPPED. Movement is NOT the axis: the
 * same Take must yield the same material under strum and under arpeggiate
 * (the 260905 severance — Take chooses the MATERIAL, Movement chooses
 * together-or-sequence); placement already decides whether a hand must hold
 * the notes. Line + strum therefore sounds its take at one onset, as it did
 * at the cap of three — the synth can, a guitar could not, and Movement
 * still chooses together; a decision, Daniel's to reverse.
 *
 * At n = 1 the term is identically zero, so on the ratified conformance
 * ground (one note per string) the choice is EXACTLY the carried §6.1.2 key.
 * At n > 1 this deliberately diverges from isolation.mjs's lineVoicing —
 * which would double where doubling is tighter — and the divergence is
 * pinned by name in the tests, with this header as its §4.4 reason. It is
 * Daniel's to reverse; the conformance ground is untouched either way.
 *
 * THE ZONE-CAPTURE CLAUSE IS DELIBERATELY ABSENT. The carried line voicer's
 * first step — "a chord tone present in the zone is taken there" — anchors
 * the triad/tetrad apps' pivot model. Multetudes' window is a FRAME (C5: a
 * rigid setting that never reports), not an anchor, and the prototype's
 * selection is uniform over the pool. That clause is therefore out of the
 * conformance ground, stated there and here (§4.4: deliberate, with the
 * reason written down).
 *
 * A COLLISION MUST THROW, WHEREVER THE ADDRESS LIVES (the superseded child
 * 3's surviving law): two notes on one string come back as DISTINCT entries,
 * ascending by fret, so the k-th note on a string is a well-defined ordinal —
 * and an output that ever carried two entries for one (string, fret) is
 * refused here, loudly, not left for a renderer to overwrite.
 *
 * Pure: no DOM, no globals, load-time structural assertions.
 */



// 260918 (CR-1): the approach grammar and arithmetic, owned by motion.mjs — imported by their exported names (the door build blanks imports; an alias would name nothing)

const mod12 = (x) => ((x % 12) + 12) % 12;

/** the role a scale-step offset wears — DERIVED, not tabled: offset 0 is
 * the root, and every other even offset o names degree o+1 (2→"3" … 12→"13",
 * the compounds being octave-displaced sevens). 260914 item 3: the old
 * four-entry table WAS this formula, written out — extending it to 9/11/13
 * meant deleting it, not growing it. */
const roleOfOffset = (o) => (o === 0 ? "R" : String(o + 1));
const OFFSET_ROLE = new Proxy({}, {
  get: (_, k) => {
    const o = Number(k);
    return Number.isInteger(o) && o >= 0 && o % 2 === 0 && o <= 12
      ? roleOfOffset(o) : undefined;
  },
});

/** STACK_DEPTH — depth is DATA (260914 item 3): every stacked object is
 * "thirds all the way up", differing only in how many. A new depth is a new
 * row here, and objectOffsets/objectTones/the hub menus all derive from it. */
const STACK_DEPTH = { triad: 3, tetrad: 4, ninth: 5, eleventh: 6, thirteenth: 7 };

/* ---------------- TONE SELECTION (260917, night 22 item 1 — ruled) ----------------
 *
 * Dyad already chose WHICH two tones; the ruling generalises it to every
 * stacked object: Triad picks three, Tetrad four, the extensions their
 * depth's worth, FEWER is legitimate (that is the whole point), a tone the
 * object cannot hold refuses BY NAME. The tones are named in the FIGURE
 * FIELD'S OWN NOTATION — R,3,5,7 — and parsed by the figure's own parser
 * (parseTones, shared with orderBy): one way to name tones in the app, one
 * refusal vocabulary. A second parser would be two vocabularies, the defect
 * this project has paid for twice.
 *
 * The degrees an object may hold DERIVE from STACK_DEPTH (dyad and shell
 * pick from the tetrad's); a pick is degree numbers (R = 1), the stored
 * identity; the face renders them in the figure notation. */

/** the degree numbers an object can hold — 1, 3, 5 … up to its depth */
function objectDegrees(object) {
  if (object === "scale") return null;
  const depth = object in STACK_DEPTH ? STACK_DEPTH[object]
    : (object === "dyad" || object === "shell") ? STACK_DEPTH.tetrad : null;
  if (depth === null) throw new Error(`objectDegrees: "${object}" is not an object this engine knows`);
  return Array.from({ length: depth }, (_, i) => 2 * i + 1);
}
/** the pick an object starts with: a stack is its whole stack; a dyad the
 * guide tones; a SHELL is R + the guide tones — Shell is a PRESET of the
 * selector (item 2): choosing it fills the tones as R,3,7, visibly */
function defaultPick(object) {
  if (object === "scale") return null;
  if (object === "dyad") return [3, 7];
  if (object === "shell") return [1, 3, 7];
  return objectDegrees(object);
}
/** the ONE place the legacy word is known (movementWord's shape): a saved
 * étude from v0.4.x carries `dyad: [3,7]`; `tones` is tonight's word and
 * wins when both are present; neither → the object's default */
const tonePick = (cfg) =>
  Array.isArray(cfg && cfg.tones) ? cfg.tones
  : Array.isArray(cfg && cfg.dyad) ? cfg.dyad : null;
const roleWord = (d) => (d === 1 ? "R" : String(d));
/** the pick a consumer is actually placing: the object's default when none
 * is chosen, null under a scale — what the bass is offered from (item 3) */
const pickOf = (cfg) => {
  if (!cfg || cfg.object === "scale") return null;
  const pk = tonePick(cfg);
  if (!pk) return defaultPick(cfg.object);
  /* THE TRANSIENT (260917, measured at the staff): a message that names an
   * OBJECT without a pick (a preset, a restore, a synthetic config) reaches
   * every mirror before the owner's derived default does, so for one tick a
   * mirror holds a triad with a tetrad's pick. An unlawful pick here takes
   * the object's default — never a throw in a board's paint — and the owner
   * announces the real default in the same dispatch. User input never
   * reaches this branch: the field refuses an unlawful pick by name first. */
  try { objectOffsets(cfg.object, pk); return pk; }
  catch { return defaultPick(cfg.object); }
};
/** TONES IS THE TRUTH; OBJECT IS THE NAME THE TONES MAKE (night 59, 261012 — Daniel's Centricity
 * re-cut, first half). Until tonight the object was chosen and the tones were a filter on it ("pick
 * from R, 3, 5, 7"); now the tones are the stored material and the object is DERIVED from them — an
 * input too (choosing one populates the tones, defaultPick), but never the stored truth.
 *
 * THE DERIVATION, and the tie it names (rule 11 — proposed, shipped, Daniel's to reverse):
 *   null                  → "scale" (the scale path; its material is the gamut)
 *   exactly a preset's own default — the guide tones [3,7] → "dyad"; R + the guide tones [1,3,7] → "shell"
 *   anything else         → the SMALLEST stack (STACK_DEPTH) whose degrees hold every tone: triad up to
 *                           the 5th, tetrad up to the 7th, ninth, eleventh, thirteenth.
 * So R,5 names a TRIAD narrowed to two, not a dyad — a dyad IS the guide tones, by its own default —
 * and R,3,7 is a shell, not a tetrad narrowed to three. Behaviour is identical either way (the pick is
 * the same and objectOffsets accepts it); only the LABEL is decided, and it is decided here, once,
 * not left for a menu to break arbitrarily. Every object's default pick names it back. */
function objectOf(tones) {
  if (tones == null) return "scale";
  if (!Array.isArray(tones) || !tones.length) throw new Error("objectOf: a chord object needs at least one tone");
  const sorted = [...tones].map(Number).sort((a, b) => a - b);
  if (new Set(sorted).size !== sorted.length) throw new Error(`objectOf: tones must be distinct, not ${renderPick(tones)}`);
  const all = objectDegrees("thirteenth");
  for (const d of sorted) if (!all.includes(d)) throw new Error(`objectOf: ${d} is not a chord degree — the roles are ${all.map(roleWord).join(", ")}`);
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  for (const preset of ["dyad", "shell"]) if (same(sorted, [...defaultPick(preset)].sort((a, b) => a - b))) return preset;
  const top = sorted[sorted.length - 1];
  for (const [name, depth] of Object.entries(STACK_DEPTH)) if (top <= 2 * depth - 1) return name;
  throw new Error(`objectOf: no stack holds ${renderPick(tones)}`);
}
/** degrees → the figure notation the face shows ("R,3,7") and back */
const renderPick = (pick) => (pick || []).map(roleWord).join(",");
const degreeOfTone = (t) => (t === "R" ? 1 : Number(t));

/** parseTones(text) → { tones: ["R","3",…] | null, err } — THE tones
 * tokenizer, shared by the figure (orderBy) and the selection: R 3 5 7 9 11
 * 13, longest first so 11 and 13 never half-read; every character is a
 * separator, a legal token, or refused BY NAME (register 21's manners).
 * A pattern-alphabet digit (1/2/4/6/8) is flagged so the FIGURE can offer
 * its mode-switch notice; the selection has no other mode and says the
 * plain refusal. Incomplete is not invalid — a trailing separator is
 * skipped, so "R," on the way to "R,3" never errs. */
function parseTones(text) {
  const raw = String(text || "").toUpperCase();
  const TONE_TOKENS = ["13", "11", "9", "7", "5", "3", "R"];
  const toks = [];
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (/[,\-\s.·]/.test(ch)) { i += 1; continue; }
    const hit = TONE_TOKENS.find((t) => raw.startsWith(t, i));
    if (hit) { toks.push(hit); i += hit.length; continue; }
    return { tones: null, err: `"${ch}" is not a tone — tones are R, 3, 5, 7, 9, 11, 13`,
      patternDigit: "12468".includes(ch) };
  }
  return { tones: toks, err: null };
}

/** objectOffsets(object, pick) → the scale-step offsets an object selects,
 * or null for a scale (the whole box — scaleTake's territory). CHILD 4's
 * consolidation: this derivation was spelled `object === "triad" ? [0,2,4]
 * : [0,2,4,6]` in FIVE hub modules — the duplicated-fact defect in exactly
 * the shape coreTetrad's error message warned about. One derivation now:
 *   - offset = degree − 1, pitch-class math, never a table (2i for a full
 *     stack falls out: degrees 1,3,5… are offsets 0,2,4…);
 *   - the PICK narrows the stack (item 1): any non-empty, distinct subset
 *     of the object's own degrees; absent → the object's default;
 *   - a DYAD is exactly two; a SHELL is R,3,7 unless edited.
 * Unknown objects and unlawful picks refuse by name (the loud-refusal law). */
function objectOffsets(object, pick) {
  if (object === "scale") return null;
  const degrees = objectDegrees(object);           // refuses an unknown object by name
  const holds = degrees.map(roleWord).join(", ");
  const chosen = pick == null ? defaultPick(object) : pick;
  if (!Array.isArray(chosen) || !chosen.length)
    throw new Error(`objectOffsets: a ${object} needs at least one tone from ${holds}`);
  for (const d of chosen)
    if (!degrees.includes(d))
      throw new Error(`objectOffsets: ${roleWord(d)} is not a tone of a ${object} — a ${object} holds ${holds}`);
  if (new Set(chosen).size !== chosen.length)
    throw new Error(`objectOffsets: a ${object}'s tones must be distinct, not ${renderPick(chosen)}`);
  if (object === "dyad" && chosen.length !== 2)
    throw new Error(`objectOffsets: a dyad is exactly two chord-tone degrees from ${holds}, not ${renderPick(chosen)}`);
  return chosen.map((d) => d - 1);
}

/** objectTones(parsed, object, dyad) → { tones:[{role,pc}], absent:[role…] }
 * — the object's tones ON AN ABSOLUTE CHORD (child 7: forms and typed
 * changes carry their own roots and qualities; the diatonic path stays
 * diatonicTones). The POSITIONS come from objectOffsets — the one place the
 * object vocabulary lives — halved: a scale offset 2i is stack position i,
 * because chord.mjs constructs intervals as [triad, seventh, extensions…],
 * so positions 0..3 ARE the R/3/5/7 slots by construction (v0.9's
 * ROLE_BY_INDEX rule: the role names the SLOT — C6's fourth voice wears
 * "7", the seventh-slot, as v0.9 labels it). A slot the chord does not
 * carry is ABSENT, BY NAME — a dyad's 7 on a plain triad, a tetrad's 7 on
 * "C" — never silently narrowed (the coreTetrad lesson, third sighting). */
function objectTones(parsed, object, pick) {
  if (!parsed || !parsed.root || !Array.isArray(parsed.intervals))
    throw new Error("objectTones expects parseChord() output");
  const offsets = objectOffsets(object, pick);
  if (offsets === null)
    throw new Error("objectTones: a scale is not a chord object — the scale path is scaleTake's");
  const SLOT_ROLE = Array.from({ length: 7 }, (_, i) => roleOfOffset(2 * i));
  const tones = [], absent = [];
  for (const off of offsets) {
    const i = off / 2;
    if (i < parsed.intervals.length)
      tones.push({ role: SLOT_ROLE[i], pc: (((parsed.root.pc + parsed.intervals[i]) % 12) + 12) % 12 });
    else absent.push(SLOT_ROLE[i]);
  }
  return { tones, absent };
}

/** THE PLACEMENT'S CAP (night 56, ruled 261012 — see the header): the per-string ceiling a
 * placement imposes, from the placement's stored value. Grip (1) is a voicing: one note per
 * string. Anything else is a line, and a line is UNCAPPED — its notes sound in sequence. The
 * boards hand this to gripFit (slots = strings × cap: Infinity passes a stack through verbatim),
 * oneOfEach and everyOccurrence (n), and to the dropped role's sentence. */
const UNCAPPED = Infinity;
function capOf(notesPer) {
  if (!Number.isInteger(notesPer) || notesPer < 1) throw new Error(`capOf: a placement's stored value is a positive integer, not ${notesPer}`);
  return notesPer === 1 ? 1 : UNCAPPED;
}

/** gripFit(tones, slots) → { tones, dropped, refuse? } — a stack deeper
 * than the strings can carry drops tones by a NAMED rule (260914 item 3;
 * RATIFIED 260915): the 5th goes first, then the non-naming extensions
 * 11-before-9; the root, the 3rd, the 7th and the NAMING extension (the
 * last role — what the chord is called after) are never dropped. Whatever
 * is dropped is returned by name so every face can SAY it. Past the
 * rule's reach it refuses by name rather than inventing a further
 * omission. A stack that fits passes through verbatim.
 *
 * Recorded with the ratification, not acted on: on MINOR shapes the
 * natural 11 is consonant (m11 is a real sonority), so 11-before-9 is a
 * weaker preference there — one order for all qualities is simpler and
 * defensible; and the ROOT is conventionally droppable when a bass
 * sounds it (rootless voicings), but the `shell` object already offers
 * that reduction by another door. */
function gripFit(tones, slots) {
  if (tones.length <= slots) return { tones, dropped: [] };
  const roles = tones.map((t) => t.role);
  const naming = roles[roles.length - 1];
  /* THE ORDER'S REASON (ratified 260915, written here so it is never
   * re-litigated): the 5th is the most redundant tone — implied by the
   * root, carrying no quality. Then 11 BEFORE 9 because the natural 11
   * sits a minor 9th above the major 3rd — the one real clash inside a
   * diatonic stack, which is why it is the conventional second omission.
   * R, 3, 7 are anchor and guide tones; the naming extension is what the
   * chord is CALLED after. Not taste; an interval. */
  const droppable = ["5", ...["11", "9"].filter((r) => roles.includes(r) && r !== naming)];
  const dropped = [];
  let keep = [...tones];
  for (const r of droppable) {
    if (keep.length <= slots) break;
    const i = keep.findIndex((t) => t.role === r);
    if (i >= 0) { dropped.push(r); keep.splice(i, 1); }
  }
  if (keep.length > slots)
    return { tones: keep, dropped,
      refuse: `${keep.length} tones after the drops and only ${slots} strings — no named rule reduces further` };
  return { tones: keep, dropped };
}

/** fieldPartition(tones, fld) → { inKey, offKey } — which of a chord's tones
 * the FIELD itself supplies. The field is the key, so an offKey tone is never a
 * member of the FIELD — but under CR-1 it may still be material: a chord the
 * harmony supplies makes its own tones material for as long as it holds. NOT
 * IN THE KEY, NOT IN THIS FRAME and NOT IN THIS CHORD are three different
 * absences, and all three are teaching. What this partition answers is only the
 * first. (CR-1 §4, ratified 261008 and landed night 46 with role A — the
 * 260918 holding note that deferred this sentence went with the deferral; the
 * loop below is unchanged, it partitions by key membership either way.) */
/** THE CHORD'S OWN SUPPLY (role A — CR-1 §6's deferred half, ratified §2.6 261010, night 46): a
 * tone the harmony supplies and the key does not contain is MATERIAL for as long as the chord
 * holds — a member of the chord, not of the field, not an approach. The field's pool (materialIn)
 * stays the field's own and keeps its throw (CR-1 §3); this is the second, ROLE-CARRYING list a
 * board adds to it: every fret in the window on the run's strings that sounds the tone's pitch
 * class, from the FIELD's opens (the tuning is the field's fact — never standard). Each note wears
 * `member: true, chromatic: true` and its role; a note off the field without either is still
 * illegal on every board (the guards get stronger, not weaker). */
function chordSupply(tones, fld, strings, pos) {
  const out = [];
  for (const t of tones) {
    if (!t.offKey) continue;
    for (const s of strings)
      for (let fret = windowLo(pos); fret <= pos.fHi; fret++) {   // the window as drawn, reach included (261010)
        const midi = fld.opens[s] + fret;
        if (mod12(midi) !== mod12(t.pc)) continue;
        if (fld.degOf(midi) >= 0) throw new Error("chordSupply: a chord-supplied tone must be off the field — this one is a degree of it");
        out.push({ string: s, fret, midi, deg: null, keyDeg: -1, role: t.role, member: true, chromatic: true, name: t.name });   // `name`: the chord's own spelling (B♭, not A♯)
      }
  }
  return out;
}

/** the material a CHORD is placed from: the field's pool, then the chord's own supply (role A) */
function materialFor(tones, pool, fld, strings, pos) {
  return [...pool, ...chordSupply(tones, fld, strings, pos)];
}

/** THE CHORD'S OWN TONE, said once (night 46, CR-1 §5 — "the readout owes two different
 * sentences"): the field does not supply it, the chord does, for as long as it holds. `labels`
 * are the altered-degree spellings (♭7, ♯4) the speller derives; `roles` the chord's roles. */
function chordSuppliedSentence(labels, symbol) {
  const list = labels.length <= 1 ? labels.join("") : labels.slice(0, -1).join(", ") + " and " + labels[labels.length - 1];
  return `the ${list} of ${symbol} ${labels.length === 1 ? "is" : "are"} the chord's own — the field does not supply ${labels.length === 1 ? "it" : "them"}; the chord does, for as long as it holds`;
}

function fieldPartition(tones, fld) {
  const inKey = [], offKey = [];
  for (const t of tones) (fld.degOf(t.pc) >= 0 ? inKey : offKey).push(t);
  return { inKey, offKey };
}

/** diatonicTones(field, keyDeg, offsets) → [{ role, pc, keyDeg }] — the stack
 * of scale thirds on a degree, BY keyDeg (chords read keyDeg; child 1's law).
 * Offsets normally arrive from objectOffsets; this is only the stack the
 * field itself implies. */
function diatonicTones(fld, keyDeg, offsets = [0, 2, 4, 6]) {
  if (!Number.isInteger(keyDeg) || keyDeg < 0 || keyDeg > 6)
    throw new Error(`diatonicTones: keyDeg 0..6, not ${keyDeg}`);
  const tones = offsets.map((o) => {
    const role = OFFSET_ROLE[o];
    if (!role) throw new Error(`diatonicTones: offset ${o} has no named role — dyad/shell menus are child 4's`);
    const kd = (keyDeg + o) % 7;
    return { role, pc: fld.pcs[kd], keyDeg: kd };
  });
  if (new Set(tones.map((t) => t.pc)).size !== tones.length)
    throw new Error("diatonicTones: a diatonic stack repeated a pitch class");
  return tones;
}

/* every output leaves through this gate: distinct (string, fret) addresses,
 * ascending frets per string — the collision law, enforced at source */
function assertAddressable(notes, where) {
  const seen = new Set();
  const lastFret = {};
  for (const n of notes) {
    const k = n.string + ":" + n.fret;
    if (seen.has(k))
      throw new Error(`${where}: two selected notes share string ${n.string} fret ${n.fret} — ` +
        "a collision must throw, wherever the address lives");
    seen.add(k);
    if (k in lastFret) throw new Error("unreachable");
    lastFret[k] = true;
  }
  return notes;
}

const perString = (notes) => {
  const c = {};
  for (const n of notes) c[n.string] = (c[n.string] || 0) + 1;
  return c;
};

/* strict lexicographic less-than; equal keys return false, so ties keep the
 * FIRST combination found — the carried voicer's own tie behaviour */
const lexLess = (a, b) => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return true;
    if (a[i] > b[i]) return false;
  }
  return false;
};

/**
 * oneOfEach(tones, pool, { n, centre }) → { notes, missing, unplaceable?, collide? }
 *
 * One occurrence per chord tone present in the pool; the combination with the
 * smallest [fold, span, Σ|fret − centre|, −Σstring], ties to the first found —
 * fold is THE VOICING RULE's term (notes forced onto shared strings; zero
 * whenever one-per-string is possible), and the rest is the §6.1.2 choice,
 * walked in tone order with candidates in pool order (the same enumeration
 * the carried voicer uses, which is what makes the conformance pin exact
 * rather than approximate — at n = 1, fold is identically zero and the whole
 * key IS the carried one). `missing` reports tones with no occurrence in the
 * pool, by role — absent is a fact, never an error. `unplaceable` (with
 * `collide` where derivable) reports a ceiling nothing satisfies. Loud,
 * structured, never silent.
 */
function oneOfEach(tones, pool, { n = 1, centre } = {}) {
  if (!Array.isArray(tones) || !tones.length) throw new Error("oneOfEach: no tones");
  if (n !== UNCAPPED && (!Number.isInteger(n) || n < 1 || n > 3))
    throw new Error(`oneOfEach: a voicing's ceiling is 1..3 (the hand's reach) and a line's is UNCAPPED (its notes sound in sequence — ruled 261012); ${n} is neither`);
  if (typeof centre !== "number") throw new Error("oneOfEach: the frame centre is required — drift is part of the choice");
  const missing = tones.filter((t) => !pool.some((m) => mod12(m.midi) === mod12(t.pc)));
  const present = tones.filter((t) => !missing.includes(t));
  if (!present.length) return { notes: null, missing: missing.map((t) => t.role) };

  const cands = present.map((t) =>
    pool.filter((m) => mod12(m.midi) === mod12(t.pc)).map((m) => ({ ...m, role: t.role })));
  const product = cands.reduce((a, c) => a * c.length, 1);
  if (product > 60000)
    throw new Error(`oneOfEach: ${product} combinations — the pool is not a window; place a position first`);

  let best = null, bk = null;
  const walk = (i, combo) => {
    if (i === cands.length) {
      if (Object.values(perString(combo)).some((c) => c > n)) return;   // ceiling ON THE COMBINATION
      const frets = combo.map((x) => x.fret);
      const fold = combo.length - new Set(combo.map((x) => x.string)).size;
      const key = [fold,                                   // THE VOICING RULE: spread before tightening
        Math.max(...frets) - Math.min(...frets),
        combo.reduce((a, x) => a + Math.abs(x.fret - centre), 0),
        -combo.reduce((a, x) => a + x.string, 0)];
      if (!bk || lexLess(key, bk)) { bk = key; best = combo; }
      return;
    }
    for (const c of cands[i]) walk(i + 1, [...combo, c]);
  };
  walk(0, []);

  if (!best) {
    // which roles were forced onto one string past the ceiling, where derivable
    const byString = {};
    present.forEach((t, i) => {
      const strings = [...new Set(cands[i].map((c) => c.string))];
      if (strings.length === 1) (byString[strings[0]] ||= []).push(t.role);
    });
    const clash = Object.entries(byString).find(([, roles]) => roles.length > n);
    /* THE ESCAPE, DERIVED (260908 — the refusal names the way through):
     * the smallest per-string cap that actually places these tones, found by
     * asking, never assumed. The measured truth as of the amendment: every
     * grip collide in the 8-key × 3-scale × 3-set × 7-window matrix resolves
     * by n=3 (2,200/2,200) — but this value is COMPUTED per case, so a
     * future field where nothing resolves says null and the face says that
     * instead. Consumers translate the number into their own control's word
     * (the engine names no UI). */
    let resolvesAt = null;
    for (let nn = n + 1; nn <= 3 && resolvesAt === null; nn++)
      if (oneOfEach(tones, pool, { n: nn, centre }).notes) resolvesAt = nn;
    /* …and past the hand's reach, the UNCAPPED line (night 56): four on one string place there,
     * and the escape says so as the number the engine derived — consumers word it */
    if (resolvesAt === null && n !== UNCAPPED && oneOfEach(tones, pool, { n: UNCAPPED, centre }).notes) resolvesAt = UNCAPPED;
    /* THE PARTIAL (260922b ruling 3, built 260923): draw what fits, name what
     * could not come and why. Derived HERE, once, so every view that asks
     * (the neck, the staff, the keys, the readout) draws the same three notes:
     * the colliding roles leave one at a time, LAST FIRST (the 7 before the R
     * — the root outranks its seventh; the alternative, dropping the R, is
     * proposed in the 260923 report, not settled here), until a placement
     * exists. `notes` stays null — the refusal is still the refusal — and
     * `partial` carries the placement beside it. Asserted: every partial role
     * is one of the tones, and every dropped role is one the collide named. */
    let partial = null, dropped = [];
    if (clash) {
      const order = [...clash[1]].reverse();
      for (const role of order) {
        dropped = order.slice(0, order.indexOf(role) + 1);
        const kept = present.filter((t) => !dropped.includes(t.role));
        if (!kept.length) break;
        const again = oneOfEach(kept, pool, { n, centre });
        if (again.notes) { partial = again.notes; break; }
      }
      if (partial) {
        if (!partial.every((x) => present.some((t) => t.role === x.role))) throw new Error("oneOfEach: a partial note is not one of the tones");
        if (!dropped.every((r) => clash[1].includes(r))) throw new Error("oneOfEach: the partial dropped a role the collide did not name");
      } else dropped = [];
    }
    return { notes: null, missing: missing.map((t) => t.role), unplaceable: true,
      collide: clash ? { string: +clash[0], roles: clash[1] } : null,
      resolvesAt, partial, dropped };
  }
  const notes = [...best].sort((a, b) => a.midi - b.midi);
  if (notes.length !== present.length) throw new Error("oneOfEach: lost a tone in placement");
  if (Object.values(perString(notes)).some((c) => c > n))
    throw new Error("oneOfEach: the chosen combination breaks its own ceiling");
  return { notes: assertAddressable(notes, "oneOfEach"), missing: missing.map((t) => t.role) };
}

/** everyOccurrence(tones, pool, { n }) → { notes, missing } — the ARPEGGIO:
 * every instance of the chord's tones the pool offers, at most n per string.
 *
 * THE COVERAGE RULE (260906 — Daniel's F voiced as two A's while its C sat
 * unplayed in the box; the sweep put the defect in ~half of all capped
 * configurations): between candidates on the same string, A TONE NOT YET
 * REPRESENTED BEATS A DUPLICATE. Derived, not special-cased: coverage is a
 * maximum matching of the chord's distinct tones onto the strings' capped
 * slots (augmenting paths — at most four tones, six strings), so a
 * duplicate can never hold a slot an uncovered available tone could take.
 * The leftover capacity then takes the leftover occurrences, lowest fret
 * first — the hand under the frame, which yields to coverage and to
 * nothing else. Where the cap does not bind, every occurrence is still
 * every occurrence. */
function everyOccurrence(tones, pool, { n = 3 } = {}) {
  if (n !== UNCAPPED && (!Number.isInteger(n) || n < 1 || n > 3))
    throw new Error(`everyOccurrence: a voicing's ceiling is 1..3 and a line's is UNCAPPED (ruled 261012); ${n} is neither`);
  const roleOf = new Map(tones.map((t) => [mod12(t.pc), t.role]));
  const missing = tones.filter((t) => !pool.some((m) => mod12(m.midi) === mod12(t.pc)))
    .map((t) => t.role);
  /* A LINE IS UNCAPPED (night 56): every occurrence is every occurrence, no slot to match, nothing
   * capped — the coverage rule below exists only because a cap can bind */
  if (n === UNCAPPED) {
    const notes = pool.filter((m) => roleOf.has(mod12(m.midi))).map((m) => ({ ...m, role: roleOf.get(mod12(m.midi)) }))
      .sort((a, b) => a.midi - b.midi);
    return { notes: assertAddressable(notes, "everyOccurrence"), missing, capped: [] };
  }
  const strings = [...new Set(pool.map((m) => m.string))].sort((a, b) => a - b);
  const cands = new Map(strings.map((s) => [s,
    pool.filter((m) => m.string === s && roleOf.has(mod12(m.midi)))
      .sort((a, b) => a.fret - b.fret)]));

  // slots: each string contributes n; matching pcs onto slots by augmenting
  const slots = [];
  for (const s of strings) for (let k = 0; k < n; k++) slots.push(s);
  const pcs = [...new Set(tones.map((t) => mod12(t.pc)))]
    .filter((pc) => pool.some((m) => mod12(m.midi) === pc));
  const slotPc = new Array(slots.length).fill(null);   // slot index → matched pc
  const tryPlace = (pc, seen) => {
    for (let i = 0; i < slots.length; i++) {
      if (seen.has(i)) continue;
      if (!cands.get(slots[i]).some((m) => mod12(m.midi) === pc)) continue;
      seen.add(i);
      if (slotPc[i] === null || tryPlace(slotPc[i], seen)) { slotPc[i] = pc; return true; }
    }
    return false;
  };
  for (const pc of pcs) tryPlace(pc, new Set());

  // realise the matching: per matched slot, the lowest-fret occurrence of
  // its pc on that string not already chosen
  const chosen = [];
  const used = new Set();
  for (let i = 0; i < slots.length; i++) {
    if (slotPc[i] === null) continue;
    const m = cands.get(slots[i]).find((x) => mod12(x.midi) === slotPc[i] && !used.has(x));
    if (!m) throw new Error("everyOccurrence: the matching named an occurrence that is not there");
    used.add(m); chosen.push(m);
  }
  /* THE LEFTOVER PASS RUNS ONLY WHEN NOTHING IS CAPPED (260922b, ruled; built
   * 260923, night 30). The matching above is what coverage permits; a tone
   * it could not carry (two tones sharing one one-slot string — the Cmaj7 at
   * frets 0–3 on strings 4–1, where R and 7 both live only on string 2) is a
   * capped loss. Until tonight the leftover capacity then took a second 5 on
   * string 1, and R-3-5-5 LOOKED like a full grip where R-3-5 with one string
   * silent looks like exactly what it is. A doubled tone buys nothing and
   * disguises the loss. A silent string is the honest picture. Where nothing
   * is capped, every occurrence is still every occurrence — the leftovers
   * fill every string the cap allows, as before. */
  const matchedPcs = new Set(slotPc.filter((pc) => pc !== null));
  const anyCapped = pcs.some((pc) => !matchedPcs.has(pc));
  const per = {};
  for (const m of chosen) per[m.string] = (per[m.string] || 0) + 1;
  if (!anyCapped)
    for (const s of strings)
      for (const m of cands.get(s)) {
        if (used.has(m) || (per[s] || 0) >= n) continue;
        used.add(m); chosen.push(m); per[s] = (per[s] || 0) + 1;
      }
  const notes = chosen.map((m) => ({ ...m, role: roleOf.get(mod12(m.midi)) }))
    .sort((a, b) => a.midi - b.midi);
  if (Object.values(perString(notes)).some((c) => c > n))
    throw new Error("everyOccurrence: the ceiling broke on the combination");
  // derived, then asserted: the rule's own promise, stated precisely — no
  // DUPLICATE holds a slot that an uncovered tone COULD take, i.e. no
  // duplicated note sits on a string that also carries an occurrence of a
  // tone the selection left unrepresented. (An uncovered tone whose only
  // strings are full of DISTINCT tones is an honest loss — two tones sharing
  // one one-slot string is the Am case.) REWRITTEN 260923 (rule 7): that
  // sentence was right about LEGALITY and wrong about DESIRABILITY. The loss
  // is honest; a duplicate drawn BESIDE it is not — it disguises the loss as
  // a full grip. So the stronger promise, ruled 260922b: while any role is
  // capped, NO tone is doubled at all. A silent string is the honest picture.
  const present = new Set(notes.map((x) => x.role));
  const counts = {};
  for (const x of notes) counts[x.role] = (counts[x.role] || 0) + 1;
  const uncoveredPcs = pcs.filter((pc) => !present.has(roleOf.get(pc)));
  for (const x of notes)
    if (counts[x.role] > 1
        && uncoveredPcs.some((pc) => cands.get(x.string).some((m) => mod12(m.midi) === pc)))
      throw new Error("everyOccurrence: a duplicate held a slot an uncovered tone could take");
  if (uncoveredPcs.length && Object.values(counts).some((c) => c > 1))
    throw new Error("everyOccurrence: a tone is doubled while a role is capped — the leftover pass ran under a cap");
  /* THE CAPPED LOSS, LOUD (260909 — Daniel: "the chord's 7th does not
   * show"): a tone IN THE POOL that the cap could not carry is the honest
   * loss the coverage matching permits (two tones sharing one one-slot
   * string), and it was SILENT — not `missing` (it is in the frame), not
   * `unplaceable` (notes were placed). Named here by role, with its escape
   * derived the resolvesAt way: the smallest cap at which every pool-
   * present tone appears. */
  const capped = uncoveredPcs.map((pc) => roleOf.get(pc));
  let resolvesAt = null;
  for (let nn = n + 1; nn <= 3 && capped.length && resolvesAt === null; nn++) {
    const again = everyOccurrence(tones, pool, { n: nn });
    if (again.capped.length === 0) resolvesAt = nn;
  }
  return { notes: assertAddressable(notes, "everyOccurrence"), missing, capped, resolvesAt };
}

/** scaleTake(pool, { reach }) → { notes } — the scale object: every note the
 * box offers, capped only by the hand's reach. NO PLACEMENT — a scale is not
 * a chord, and the surface owes the label its reason. */
function scaleTake(pool, { reach = 3 } = {}) {
  if (!Number.isInteger(reach) || reach < 1 || reach > 3)
    throw new Error(`scaleTake: the reach is 1..3, not ${reach}`);
  const out = [];
  for (const s of [...new Set(pool.map((m) => m.string))])
    out.push(...pool.filter((m) => m.string === s).slice(0, reach).map((m) => ({ ...m, role: null })));
  if (Object.values(perString(out)).some((c) => c > reach))
    throw new Error("scaleTake: the reach broke on the combination");
  return { notes: assertAddressable(out, "scaleTake") };
}

/* ---------------- THE STRINGS-ADDRESS (child 3b) ----------------
 *
 * Daniel, reading his own wireframe aloud: "the fourth string gets played
 * first, the third string gets played second, the fourth string gets played
 * again third…" → 4,3,4,3,2,1. A PATTERN names strings, in play order, with
 * repeats — AND A REPEAT IS THE ORDINAL, walking that string's notes low →
 * high. Nothing in either shipped grammar can say "the second note on string
 * 3"; under this address nothing needs to — G3 and half of G18 dissolve.
 * TONES names roles instead (R 3 5 7 — the dyad roles ride the same
 * alphabet). Both parse against a SELECTION directly; there is no slot
 * address here at all, and the legacy one is untouched (child 3c, possibly
 * never).
 *
 * THE VOCABULARY COLLISION, §4.4-stated rather than silent: drill.mjs also
 * says PATTERN, meaning a SLOT walk over a set — and the alphabets overlap
 * ("1,2,3,4" parses in both, meaning different things), so mutual loud
 * refusal is impossible. What keeps the two apart is that they never share
 * an input path: drill's parsePattern is reached only by the tetrad pass's
 * figure chain, this one only by the Multetudes boards, and the surface
 * labels the control "The figure is: pattern — string numbers". The PRD §2.6
 * ratifies PATTERN = string numbers for Multetudes; renaming drill's word
 * instead is a C3 rename with the carrier census behind it — priced in the
 * register (entry 12), deferred, possibly to 3c.
 *
 * APPROACHES (absorbed from child 6): grammar-compatible, deliberately not
 * built. The old refusal reason — slot mode cannot address a target — is
 * DISSOLVED by this address: "(­1,+2)4" would name a fully determined
 * target (the next note on string 4). What remains is a rendering law, not
 * a grammar problem: an approach note is CHROMATIC, off the field, and the
 * field's law for off-field notes (everything drawn is a field note,
 * asserted) has no ruling yet. So parentheses are REFUSED BY NAME — never
 * silently dropped, which is what v0.9's regex did — until that ruling
 * exists. Register entry 12 carries the reason and the cost.
 */

/** the addresses each string of a selection offers — the always-on faint
 * bracket's content: string → how many ordinals it holds */
function offersOn(notes) {
  const per = {};
  for (const n of notes) per[n.string] = (per[n.string] || 0) + 1;
  return per;
}

/**
 * orderBy(address, text, notes) → { order, err }
 *
 * address "pattern": text is string numbers in play order; a repeat is the
 * ordinal, walking that string's selected notes low → high and WRAPPING past
 * the last (v0.9's own rule, kept — the reference for behaviour).
 * address "tones": text names roles (R 3 5 7); each lands on the selection's
 * note wearing that role.
 * No tokens → { order: null, err: null } (a block — nothing to order).
 * Errors are VALUES, loud on the face, never throws: the surface owes the
 * user the reason, not a dead console.
 */
/** THE DROPPED ROLE'S SENTENCE (injection 261011c — a live wrong answer): a role the PLACEMENT
 * dropped is not "not there". Daniel, on one string with up to three notes on it and four tones,
 * read "this selection carries no 5th" while the 5 sat on the string in front of him. The
 * placement layer already knew (gripFit's `dropped`, oneOfEach's `dropped` + `resolvesAt`,
 * everyOccurrence's `capped`); this is the one sentence that reaches it — the CAUSE, and the WAY
 * THROUGH derived from the numbers (rule 14: no control is named; the cap is said as what it
 * is, notes on a string). `absent` = { dropped, kept, strings, notesPer, resolvesAt? }. */
function droppedRoleSentence(role, absent) {
  const word = role === 1 ? "root" : role + ({ 3: "rd" }[role] || "th");   // the role's word, as orderBy spells it
  const RANK = ["R", "3", "5", "7", "9", "11", "13"];   // said in role order, as the neck's own drop sentence says them
  const kept = [...(absent.kept || [])].map(String).sort((a, b) => RANK.indexOf(a) - RANK.indexOf(b));
  const keptList = kept.length <= 1 ? kept.join("") : kept.slice(0, -1).join(", ") + " and " + kept[kept.length - 1];
  const strings = absent.strings || 1, cap = absent.notesPer || 1;
  const need = kept.length + (absent.dropped || []).length;
  const capWord = (n) => (n === 1 ? "one note" : n === 2 ? "two notes" : n === 3 ? "three notes" : `${n} notes`);
  const cause = `the ${word} could not be placed — the set holds ${strings === 1 ? "one string" : strings + " strings"}, `
    + `up to ${capWord(cap)} on ${strings === 1 ? "it" : "each"}, and ${strings === 1 ? "it" : "they"} already carr${strings === 1 ? "ies" : "y"} ${keptList}`;
  let escape;
  if (absent.resolvesAt === UNCAPPED) escape = `placed one after another, the string${strings === 1 ? "" : "s"} would carry it`;   // night 56: the uncapped line
  else if (Number.isInteger(absent.resolvesAt) && absent.resolvesAt > cap) escape = `${capWord(absent.resolvesAt)} on a string would carry it`;
  else {
    const capNeeded = Math.ceil(need / strings);
    if (capNeeded <= 3 && capNeeded > cap) escape = `${capWord(capNeeded)} on a string would carry it`;
    else {
      const more = Math.ceil(need / 3) - strings;
      escape = more === 1 ? "a second string would carry it" : more > 1 ? `${more} more strings would carry it` : null;
    }
  }
  return cause + (escape ? ` — ${escape}` : " — no cap or set this neck offers would carry it");
}

/** THE WINDOW'S SENTENCE (Daniel, 261010 — Cm7 said "this selection carries no 3rd" while the E♭ sat below the
 * window): when a role the chord HOLDS has no note inside the window on these strings, the window is the cause —
 * said with the note's name and where it sits, and the way through. Derived from the caller's chord tones
 * (`ctx.tones`), the field's opens and the drawn window; null when the window is not the cause, or the caller handed
 * no tones (then the old sentence stands — nothing is invented). */
function windowRoleSentence(tok, ctx) {
  if (!ctx || !Array.isArray(ctx.tones) || !ctx.fld || !ctx.pos || !Array.isArray(ctx.strings)) return null;
  const t = ctx.tones.find((x) => String(x.role) === String(tok));
  if (!t) return null;
  const pc = mod12(t.pc), lo = windowLo(ctx.pos), hi = ctx.pos.fHi;
  const at = [];
  for (const s of ctx.strings)
    for (let f = 0; f <= 15; f++) if (mod12(ctx.fld.opens[s] + f) === pc) at.push({ s, f });
  if (at.some(({ f }) => f >= lo && f <= hi)) return null;   // the window holds it — the cause is elsewhere
  const name = t.name || (t.keyDeg >= 0 && ctx.fld.notes[t.keyDeg] ? ctx.fld.notes[t.keyDeg].name : null);
  const word = tok === "R" || tok === 1 ? "root" : tok + ({ 3: "rd" }[tok] || "th");
  const per = ctx.strings.map((s) => [s, at.filter((x) => x.s === s).map((x) => x.f)]).filter(([, fs]) => fs.length);
  const where = per.map(([s, fs]) => `${fs.map((f) => "fret " + f).join(" and ")} on string ${s}`).join(", ");
  return `the ${word}${name ? ` (${name})` : ""} is outside the window — it sits at ${where}; step the window or add a string`;
}

function orderBy(address, text, notes, ctx) {
  const raw = String(text || "").toUpperCase();
  /* THE APPROACH NOTE (260918, night 24 — CR-1 ruled it, Design Spec §2.6
   * marks it): a figure carrying ( … ) or [ … ] under the TONES address is
   * the ratified motion grammar — (b3)[3] · (-s)[3] · (-1,+2)[R] — parsed
   * by motion.mjs's own parser and resolved through its own arithmetic
   * (approachMidi, placeNear). The old refusal ("the field's rendering law
   * for off-field notes is undecided") is answered: an off-field note is
   * legal ONLY as an APPROACH — an event that exists while it points at a
   * target — and never as a member of the field (CR-1 §3: the guards get
   * stronger, not weaker; see the assertion at the end). */
  /* THE SIMULTANEOUS GROUP (Daniel, 261009 — motion-grammar §11): tones (or strings)
   * inside < > sound together, ONE step of the subdivision. Routed before the
   * approach grammar so a figure mixing the two is refused by name, never half-read. */
  if (/[<>]/.test(raw)) {
    if (/[()\[\]]/.test(raw))
      return { order: null, err: "an approach leads into one note, and a group sounds several at once — approaches into a group are not ruled yet; write the group's tones bare" };
    return orderGroups(address, raw, notes, ctx);
  }
  if (/[()\[\]]/.test(raw)) {
    if (address !== "tones")
      return { order: null, err: "approaches — (…)[…] — name TONES: the address is set to pattern; switch it to tones" };
    if (!ctx || !ctx.fld || !Array.isArray(ctx.strings) || !ctx.pos)
      return { order: null, err: "approaches need the field, the strings and the window to place on — this caller supplied "
        + (!ctx ? "nothing" : [ctx.fld ? "" : "no field", Array.isArray(ctx.strings) ? "" : "no strings", ctx.pos ? "" : "no window"].filter(Boolean).join(", ") || "them all") };
    return orderWithApproaches(String(text || ""), notes, ctx);
  }
  /* THE MODE MISMATCH, noticed by the alphabet (260902 — Daniel typed
   * R-3-5-7 under pattern and was told a true-but-useless fact about string
   * 5). R and 7 are not string numbers; 1/2/4/6 are not tone names. A figure
   * carrying the OTHER mode's letters is named as such, with the switch
   * offered, instead of half-reading it in the wrong alphabet. Tokens legal
   * in both alphabets (3, 5) stay ambiguous and read as the current mode. */
  if (address === "pattern" && /R|7|9/.test(raw))
    return { order: null, err: "this reads as a TONES figure (R, 7 and the extensions are roles, not strings) — " +
      "the address is set to pattern; switch it to tones" };
  /* THE JUNK REFUSAL (260910, item 2 — Daniel's ruling on the eleventh
   * silence): "R,Q" used to keep the R and drop the Q without a word — the
   * regex harvest was tolerant in both alphabets ("9,9" even read as an
   * errorless block). Now every character is either a separator, a legal
   * token, or refused BY NAME — the changes field's manners (child 7),
   * applied to the figure. INCOMPLETE is not INVALID: separators are
   * skippable, so "R," on the way to "R,3" never errs — the distinction
   * lives in the grammar, not in event timing.
   *
   * THE TONES ALPHABET GREW COMPOUNDS (260913b, item 4b — the centre's
   * ruling): R 3 5 7 9 11 13, longest first so 11 and 13 never half-read
   * as strings. 1/2/4/6/8 alone stay the pattern alphabet's and keep the
   * mode-mismatch notice. */
  const tk = tokensOf(address, raw);
  if (tk.err) return { order: null, err: tk.err };
  const toks = tk.toks;
  if (!toks.length) return { order: null, err: null };
  const rs = resolverFor(address, notes, ctx);
  const order = [];
  for (const tok of toks) {
    const hit = rs(tok);
    if (hit.err) return { order: null, err: hit.err };
    order.push(hit.note);
  }
  assertOrder(order, notes);
  return { order, steps: order.map((n) => [n]), err: null };
}

/** the figure's TOKENS in one alphabet — every character a separator, a legal token, or
 * refused BY NAME (the 260910 junk refusal; one parser with the selection, 260917) */
function tokensOf(address, raw) {
  const toks = [];
  if (address === "pattern") {
    for (const ch of raw) {
      if (/[,\-\s.·]/.test(ch)) continue;
      if ("123456".includes(ch)) { toks.push(ch); continue; }
      return { err: `"${ch}" is not a string — strings are 1–6` };
    }
  } else {
    /* ONE PARSER (260917, item 1): the tones alphabet is parseTones' — the
     * selection field reads the same tokens and refuses in the same words;
     * only the mode-mismatch notice is the figure's own, because only the
     * figure has another mode to switch to */
    const r = parseTones(raw);
    if (r.err)
      return { err: r.patternDigit
        ? "this reads as a string PATTERN (1/2/4/6 are strings, not roles) — " +
          "the address is set to tones; switch it to pattern"
        : r.err };
    toks.push(...r.tones);
  }
  return { toks };
}

/** resolverFor(address, notes, ctx) → tok → { note } | { err }: one token onto the selection,
 * the ordinal law's `used` count living in the closure (a figure shares one count, groups and all) */
function resolverFor(address, notes, ctx) {
  /* a selection whose notes carry no ROLES is the scale box (scaleTake) —
   * tones then address DEGREES FROM THE CENTRE (deg, already re-rooted by
   * the field), and a repeat is the ordinal over that degree's occurrences
   * low → high, wrapping — the pattern alphabet's own repeat law, ported.
   * Derived from the selection's own shape, never from a mode flag. */
  const degreeAddressed = notes.length > 0 && notes.every((n) => n.role == null);
  const degOfTok = (t) => (t === "R" ? 0 : (Number(t) - 1) % 7);
  const wordOf = (t) => t === "R" ? "root"
    : t + ({ "3": "rd" }[t] || "th");
  const used = {};
  return (tok) => {
    if (address === "pattern") {
      const s = +tok;
      const onStr = notes.filter((n) => n.string === s).sort((a, b) => a.fret - b.fret);
      if (!onStr.length)
        return { err: `string ${s} carries nothing in this selection` };
      const k = (used[s] || 0) % onStr.length;      // A REPEAT IS THE ORDINAL, wrapping
      used[s] = (used[s] || 0) + 1;
      return { note: onStr[k] };
    } else if (degreeAddressed) {
      const d = degOfTok(tok);
      const occ = notes.filter((n) => n.deg === d).sort((a, b) => a.midi - b.midi);
      if (!occ.length)
        return { err: `this box carries no ${wordOf(tok)} of the centre — step or widen the window` };
      const k = (used[tok] || 0) % occ.length;      // the same ordinal law
      used[tok] = (used[tok] || 0) + 1;
      return { note: occ[k] };
    } else {
      if (!"R357".includes(tok) || tok.length > 1)
        return { err: `${wordOf(tok)}s live in the SCALE box — a chord selection carries R, 3, 5, 7` };
      const hit = notes.find((n) => n.role === tok);
      if (!hit) {
        /* a role the PLACEMENT dropped is not absent from the chord: the cause and the way
         * through (injection 261011c); a role the chord does not hold reads as before */
        const ab = ctx && ctx.absent;
        if (ab && Array.isArray(ab.dropped) && ab.dropped.includes(tok))
          return { err: droppedRoleSentence(tok === "R" ? 1 : Number(tok), ab) };
        return { err: windowRoleSentence(tok, ctx) || `this selection carries no ${wordOf(tok)}` };   // 261010: the window, when it is the cause
      }
      return { note: hit };
    }
  };
}

/** orderGroups(address, raw, notes, ctx) → { order, steps, err } | { order: null, err: null, open }
 * — a figure carrying < > (motion-grammar §11). Each ungrouped token is a step; each group is
 * ONE step whose notes sound together, in no internal order (the schedule gives them one onset).
 * `steps` is an array of note arrays — a step that can later carry an approach without a format
 * change; `order` stays the flat list of every sounded note, so a reader of notes keeps working.
 * An OPEN group at the end is incomplete, not invalid (the 260910 manners): no order, no error,
 * and `open` says so. */
function orderGroups(address, raw, notes, ctx) {
  const noun = address === "pattern" ? "strings" : "tones";
  if (address === "pattern" && /R|7|9/.test(raw))   // the mode mismatch reads first, as in the plain path
    return { order: null, err: "this reads as a TONES figure (R, 7 and the extensions are roles, not strings) — " +
      "the address is set to pattern; switch it to tones" };
  const segs = [];
  let cur = "", open = false;
  for (const ch of raw) {
    if (ch === "<") {
      if (open) return { order: null, err: `a group cannot hold a group — close the first with > before opening another` };
      segs.push({ group: false, text: cur }); cur = ""; open = true;
    } else if (ch === ">") {
      if (!open) return { order: null, err: `a > closes no group — open one with <` };
      segs.push({ group: true, text: cur }); cur = ""; open = false;
    } else cur += ch;
  }
  segs.push({ group: open, text: cur, open });
  const parsed = [];
  for (const sg of segs) {
    const tk = tokensOf(address, sg.text);
    if (tk.err) return { order: null, err: tk.err };
    if (sg.group && !sg.open && !tk.toks.length)
      return { order: null, err: `an empty group sounds nothing — put the ${noun} that sound together inside < >` };
    parsed.push({ ...sg, toks: tk.toks });
  }
  if (open) return { order: null, err: null, open: "the group is open — close it with > and its notes sound together" };
  const rs = resolverFor(address, notes, ctx);
  const steps = [];
  for (const sg of parsed) {
    const here = [];
    for (const tok of sg.toks) {
      const hit = rs(tok);
      if (hit.err) return { order: null, err: hit.err };
      if (sg.group && here.includes(hit.note))
        return { order: null, err: `the group <${sg.text.trim()}> names the same note twice — a note cannot sound against itself` };
      if (sg.group) here.push(hit.note); else steps.push([hit.note]);
    }
    if (sg.group) steps.push(here);
  }
  if (!steps.length) return { order: null, err: null };
  const order = steps.flat();
  assertOrder(order, notes);
  for (const st of steps) if (new Set(st).size !== st.length) throw new Error("orderBy: a group holds one note twice — a note cannot sound against itself");
  return { order, steps, err: null };
}

/** groupClause(fig, sel) → the readout's words for a figure's groups, or "" when it has none:
 * a group equal to the whole selection is the strum, said so; otherwise how many groups sound
 * together; and a string holding two notes of one group (Line only — Grip is one per string) is
 * sounded, not fingered together (§11: sounded, not gripped). */
function groupClause(fig, sel) {
  const groups = (fig && fig.steps || []).filter((st) => st.length > 1);
  if (!groups.length) return "";
  const N = ["", "one", "two", "three", "four", "five", "six", "seven"];
  const parts = [];
  if (fig.steps.length === 1 && groups[0].length === (sel || []).length && sel.every((x) => groups[0].includes(x)))
    parts.push(`all ${N[groups[0].length] || groups[0].length} at once — the strum`);
  else parts.push(groups.length === 1 ? "one group sounding together, one step" : `${N[groups.length] || groups.length} groups sounding together, each one step`);
  const shared = new Set();
  for (const st of groups) {
    const per = {};
    for (const x of st) per[x.string] = (per[x.string] || 0) + 1;
    for (const [s, c] of Object.entries(per)) if (c > 1) shared.add(+s);
  }
  for (const s of [...shared].sort((a, b) => b - a))
    parts.push(`string ${s} holds two notes of one group — sounded, not fingered together`);
  return parts.join("; ");
}

/* THE ROLE TEST (CR-1 §3): a step is legal if it IS a note of the selection,
 * or if it is an APPROACH that carries a target the selection holds. An
 * off-field step with no role, or a role with no target, throws NAMING the
 * missing role — the bug class the old assertion caught stays caught. */
function assertOrder(order, notes) {
  for (const n of order) {
    if (notes.includes(n)) continue;
    if (n.role !== "approach")
      throw new Error("orderBy: an ordered step left the selection carrying no role — " +
        "an off-field note must be an approach (CR-1), and this one is unlabelled");
    if (!n.target || !notes.includes(n.target))
      throw new Error("orderBy: an approach step names no target in the selection — " +
        "an approach exists only while it points at one");
  }
}

/** orderWithApproaches(text, notes, {fld, strings}) → { order, err, describe }
 * — the motion grammar over the Multetudes selection. A TARGET names a role
 * the selection carries (R 3 5 7 9 11 13 by ROLE under a chord; a DEGREE
 * from the centre under the scale box — the same two laws the plain tones
 * figure obeys); accidentals on a target are refused by name (a role is not
 * a spelling). Each APPROACH is resolved by motion.mjs's own arithmetic
 * against that target's midi — semitones, scale steps through the field's
 * pitch classes, or an absolute degree of the key — and placed at the
 * nearest playable position on the run's strings, the target's own string
 * preferred. The entry carries its ROLE, its TARGET, whether it is CHROMATIC
 * (§2.6: a pitch class outside the current scale) and, when diatonic, the
 * degree it wears — read the way the selection reads degrees (re-rooted
 * under a centre by the same shift the target carries). describe() is
 * motion's own sentence, routed to the face rather than rewritten. */
function orderWithApproaches(text, notes, ctx) {
  const src = text.replace(/\bR\b/gi, "1").replace(/S/g, "s");   // the figure's R is motion's 1; `s` is the scale
  const parsed = parseMotion(src, "tones");
  if (parsed.error) return { order: null, err: parsed.error.message };   // 261009: the page says "figure: " once
  const fld = ctx.fld;
  const degreeAddressed = notes.length > 0 && notes.every((n) => n.role == null);
  const wordOf = (d) => (d === 1 ? "root" : d + ({ 3: "rd" }[d] || "th"));
  const order = [], used = {};
  for (const fig of parsed.figures) {
    const t = fig.target;
    if (t.acc !== 0)
      return { order: null, err: `a target is a role, not a spelling — [${t.text}] cannot be picked; the roles are R, 3, 5, 7 (9, 11, 13)` };
    let target;
    if (degreeAddressed) {
      const dg = (t.deg - 1) % 7;
      const occ = notes.filter((n) => n.deg === dg).sort((a, b) => a.midi - b.midi);
      if (!occ.length) return { order: null, err: `this box carries no ${wordOf(t.deg)} of the centre — step or widen the window` };
      const k = (used[t.deg] || 0) % occ.length; used[t.deg] = (used[t.deg] || 0) + 1;   // a repeat is the ordinal
      target = occ[k];
    } else {
      const role = t.deg === 1 ? "R" : String(t.deg);
      target = notes.find((n) => n.role === role);
      if (!target) {
        /* a role the PLACEMENT dropped is not absent from the chord — say the cause and the way
         * through (injection 261011c); a role the chord does not hold reads as before */
        const ab = ctx && ctx.absent;
        if (ab && Array.isArray(ab.dropped) && ab.dropped.includes(role))
          return { order: null, err: droppedRoleSentence(t.deg, ab) };
        return { order: null, err: windowRoleSentence(role, ctx) || `this selection carries no ${wordOf(t.deg)}` };   // 261010
      }
    }
    const shift = target.deg == null ? 0 : (((target.deg - fld.degOf(target.midi)) % 7) + 7) % 7;
    for (const it of fig.approaches) {
      let midi;
      try { midi = approachMidi(it, target.midi, { scalePcs: fld.pcs, tonicPc: fld.pcs[0] }); }
      catch (e) { return { order: null, err: String(e.message || e).replace(/^motion: /, "") }; }
      /* THE OCTAVE TIE (measured on the staff, 260918): an absolute-degree
       * approach takes "the octave nearest the target", and when the two
       * octaves are EQUALLY near motion's rule keeps the lower — which a
       * top-four set cannot always fret. The arithmetic stands; the
       * placement tries the equally-near octave before it refuses, and a
       * genuinely nearer-but-unplayable note still refuses by name. */
      /* THE REACH (260923, night 31 — the approach placement law, closing CR-1's
       * gap): an approach is placed relative to its TARGET, not to the window —
       * it is not material, so it may sit outside the window and is drawn there —
       * but it must be REACHABLE: its fret within [fLo − k, fHi + k], where k is
       * the largest step the field's own scale contains (major and melodic minor
       * 2, harmonic minor 3 — DERIVED from the field's pitch classes, never a
       * literal; a future scale type extends it for free). Among reachable
       * positions the rule is unchanged and still placeNear's: nearest the
       * target, the target's own string winning ties — reached by asking
       * placeNear on the set with the out-of-reach strings removed, so the tie
       * rule is never restated here. No reachable position → refuse BY NAME. */
      const gaps = ctx.fld.pcs.map((pc, i, arr) => (((arr[(i + 1) % arr.length] - pc) % 12) + 12) % 12);
      const reach = Math.max(...gaps);
      const lo = windowLo(ctx.pos) - reach, hi = ctx.pos.fHi + reach;   // from the window's drawn edge, reach down included (261010)
      const dist = Math.abs(midi - target.midi);
      const octaves = [midi, ...[midi + 12, midi - 12].filter((m) => Math.abs(m - target.midi) === dist)];
      let pos = null, nearestMiss = null;
      for (const m of octaves) {
        const within = ctx.strings.filter((sn) => { const f = m - ctx.fld.opens[sn]; return f >= lo && f <= hi; });   // the field's opens (night 44)
        for (const sn of ctx.strings) { const f = m - ctx.fld.opens[sn]; if (f >= 0 && f <= 17) { const miss = f < lo ? lo - f : f > hi ? f - hi : 0; if (nearestMiss === null || miss < nearestMiss) nearestMiss = miss; } }
        if (!within.length) continue;
        try { pos = placeNear(m, target.fret, target.string, { set: within, open: ctx.fld.opens, nfrets: 15 }); midi = m; break; } catch (e) { /* the next equally-near octave */ }
      }
      if (!pos) {
        const rel = `${midi - target.midi > 0 ? "+" : ""}${midi - target.midi}`;
        return { order: null, err: nearestMiss === null
          ? `the approach ${rel} to the ${wordOf(t.deg)} has no playable position on these strings`
          : `the approach ${rel} to the ${wordOf(t.deg)} sits ${nearestMiss} fret${nearestMiss === 1 ? "" : "s"} beyond the hand — the ${wordOf(t.deg)} is at fret ${target.fret}${target.fret === windowLo(ctx.pos) || target.fret === ctx.pos.fHi ? ", at the window's edge" : ""} (frets ${windowLo(ctx.pos)}–${ctx.pos.fHi}), and the reach is ${reach}` };   // 261001: the edge clause only AT the edge (rule 14's sibling — template text that is said whatever the fret is a caption of nothing)
      }
      const keyDeg = fld.degOf(midi);
      const chromatic = keyDeg < 0;
      order.push({ midi, string: pos.string, fret: pos.fret, role: "approach", target,
        chromatic, deg: chromatic ? -1 : (keyDeg + shift) % 7, keyDeg });
    }
    order.push(target);
  }
  // derived, then asserted: every approach is its written relation to its target, and is placed honestly
  for (const n of order) {
    if (n.role !== "approach") continue;
    if (fld.opens[n.string] + n.fret !== n.midi) throw new Error("orderBy: an approach's placement is dishonest");
    if (n.chromatic !== (fld.degOf(n.midi) < 0)) throw new Error("orderBy: an approach's function disagrees with the field");
  }
  assertOrder(order, notes);
  return { order, steps: order.map((n) => [n]), err: null, describe: describeMotion(parsed) };
}

/** the bracket beside each string: which steps of the order land there —
 * {1,3} beside string 4 means steps 1 and 3. Derived from the order itself,
 * never tracked separately. */
function bracketOf(order) {
  const per = {};
  if (!order) return per;
  /* a GROUP step is written <k> — the figure's own sign — once on each string it touches, so a string holding two
   * notes of one group reads {1,<2>,3}, never {1,2,2,3} (Daniel, 261009) */
  order.forEach((st, i) => {
    if (Array.isArray(st) && st.length > 1) { for (const s of new Set(st.map((n) => n.string))) (per[s] ??= []).push(`<${i + 1}>`); }
    else for (const n of Array.isArray(st) ? st : [st]) (per[n.string] ??= []).push(i + 1);
  });
  return per;
}

/* ---------------- load-time structural assertions (golden rule 1) ---------------- */

{
  const fld = field({ key: "C", scale: "major" });
  const pos = positionOf({ field: fld, anchorString: 5, startDegree: 0, nearFret: 5 });

  // TAKE IS NOT PLACEMENT: four tones, four strings, ceiling raised to 3 —
  // one-of-each must still come back one per string, because that is the
  // tighter span. If Line ever CAUSES a second note here, the two controls
  // have collapsed and that is the bug.
  const run4 = [5, 4, 3, 2];
  const pool4 = materialIn(pos, run4, fld);
  const tet = diatonicTones(fld, 0, [0, 2, 4, 6]);
  const line = oneOfEach(tet, pool4, { n: 3, centre: pos.centre });
  if (!line.notes || line.notes.length !== 4)
    throw new Error("selection: the probe tetrad did not place");
  if (Object.values(perString(line.notes)).some((c) => c !== 1))
    throw new Error("selection: raising the ceiling CAUSED a second note on a string — the take and the per-string ceiling have collapsed into one");   // rule 14 (261001): the thing, not the caption

  // THE CEILING CONSTRAINS THE RESULT, NOT THE POOL: on two strings a triad
  // must fold 2+1 (the geometry forces the line), which is only findable if
  // the pool kept every occurrence. R7's own set {3,2}, its own anchor.
  const pos2 = positionOf({ field: fld, anchorString: 3, startDegree: 0, nearFret: 5 });
  const pool2 = materialIn(pos2, [3, 2], fld);
  const tri = diatonicTones(fld, 0, [0, 2, 4]);
  const folded = oneOfEach(tri, pool2, { n: 2, centre: pos2.centre });
  if (!folded.notes || folded.notes.length !== 3)
    throw new Error("selection: a triad on two strings must fold rather than fail");
  if (Math.max(...Object.values(perString(folded.notes))) !== 2)
    throw new Error("selection: the folded triad is not 2+1 — the pool was capped before the combination");

  // the scale takes everything the box offers, within reach, placement off
  const sc = scaleTake(materialIn(pos, [6, 5, 4, 3, 2, 1], fld));
  if (sc.notes.length < 12)
    throw new Error("selection: the six-string scale box offers at least twelve notes");
  // and an arpeggio really does put two notes on one string when asked
  const arp = everyOccurrence(tet, pool4, { n: 3 });
  if (!Object.values(perString(arp.notes)).some((c) => c >= 2))
    throw new Error("selection: every-occurrence in a 4-5 fret window must double a string somewhere");

  // THE ONE DERIVATION (child 4): every object's offsets from the same place,
  // and every offset wears a named role — the guide-tone dyad reads 3 then 7
  const oo = objectOffsets;
  if (JSON.stringify(oo("tetrad")) !== "[0,2,4,6]" || JSON.stringify(oo("triad")) !== "[0,2,4]" ||
      JSON.stringify(oo("shell")) !== "[0,2,6]" || JSON.stringify(oo("dyad")) !== "[2,6]" ||
      oo("scale") !== null)
    throw new Error("selection: objectOffsets does not derive the five objects");
  if (diatonicTones(fld, 0, oo("dyad", [3, 7])).map((t) => t.role).join("") !== "37")
    throw new Error("selection: the default dyad is not the guide tones");
  for (const bad of [() => oo("chord"), () => oo("dyad", [3, 3]), () => oo("dyad", [2, 7])]) {
    let threw = false; try { bad(); } catch { threw = true; }
    if (!threw) throw new Error("selection: objectOffsets accepted what it must refuse by name");
  }

  // THE ABSOLUTE PATH (child 7): a typed chord's object tones, slots absent
  // BY NAME, and the key partition telling frame-absence from key-absence
  const ot = objectTones(parseChord("Bb7"), "tetrad");
  if (ot.tones.length !== 4 || ot.absent.length)
    throw new Error("selection: the tetrad of a seventh chord is four tones, none absent");
  const part = fieldPartition(ot.tones, fld);   // fld is C major here: Bb7's Bb and F are off-key? no — Bb IS off C major
  if (part.inKey.length + part.offKey.length !== 4)
    throw new Error("selection: fieldPartition must place every tone on one side");
  const dy = objectTones(parseChord("C"), "dyad", [3, 7]);
  if (dy.tones.length !== 1 || dy.absent.join() !== "7")
    throw new Error("selection: a dyad's 7 on a plain triad must be ABSENT BY NAME, never silently narrowed");
}
return { STACK_DEPTH, objectDegrees, defaultPick, tonePick, pickOf, objectOf, renderPick, degreeOfTone, parseTones, objectOffsets, objectTones, UNCAPPED, capOf, gripFit, chordSupply, materialFor, chordSuppliedSentence, fieldPartition, diatonicTones, oneOfEach, everyOccurrence, scaleTake, offersOn, droppedRoleSentence, windowRoleSentence, orderBy, groupClause, bracketOf };
})();

/* ===== engine/tetrad-voicings.mjs ===== */
const __m_engine_tetrad_voicings_mjs = (() => {
const { parseChord } = __m_engine_chord_mjs;
/* tetrad-voicings.mjs — THE CANDIDATE GENERATOR for four-voice chord shapes.
 *
 * Tetradetudes child 1 (scoping note 2026-08-16). The scoping pass established
 * that four-voice voice-leading ALREADY WORKS: engine/isolation.mjs carries no
 * arity assumption and `chooseVoicings` takes `candidatesFor` injected — the
 * seam Phase B stage 2 created for Triadetudes' sake. What was missing is the
 * thing that fills that seam: the candidate voicings themselves.
 *
 * This module is that, and nothing else. Pure, DOM-free (§4.2.2), no state.
 *
 * WHAT IS DERIVED HERE, AND WHAT IS NOT
 * -------------------------------------
 * Chord VOCABULARY is not here. `engine/chord.mjs` owns which intervals a
 * quality has — sevenths, m7b5, dim7, half-diminished, the augmented-major
 * seventh — and this module reads `chord.intervals` and never restates a
 * quality. A second spelling of a chord quality is the duplicated-fact defect
 * this project keeps finding.
 *
 * What IS derived here is VOICING: the order the chord's own tones are stacked
 * in, and where that stack lands on a string set. Both are pitch-class and
 * octave arithmetic over the intervals chord.mjs supplies:
 *
 *   close position   the tones in ascending order from a chosen inversion
 *   drop-2           the 2nd voice from the top of a close stack, an octave down
 *   drop-3           the 3rd voice from the top, an octave down
 *   shells           R-3-7 and R-7-3 — THREE voices, see the arity note below
 *   rootless         3-5-7-9 — which IS a tetrad on the third (asserted)
 *
 * The drop families are one rule with a parameter, not four tables. Every
 * shape's inversion is READ BACK from the result rather than declared, so a
 * wrong transform cannot be labelled into looking right.
 *
 * THE ARITY LAW, and why the shells live here anyway
 * --------------------------------------------------
 * `chooseVoicings` matches voices BY INDEX across a sequence
 * (`voiceLeadCost`: `v.notes[i].midi - prev.notes[i].midi`) and reads
 * `v.notes[pivotIndex]` for placement. Both are arity-generic but arity-
 * CONSISTENT. When this module was written, mixing arities failed differently
 * in each direction: `voiceLeadCost(4-voice, 3-voice)` threw, but
 * `voiceLeadCost(3-voice, 4-voice)` iterated three voices and returned a
 * PLAUSIBLE NUMBER — so a shell scored against a tetrad looked cheap simply
 * because it was measured over fewer voices, won on cost, and nothing reported
 * anything.
 *
 * That silent direction was FIXED AT SOURCE on 2026-08-17 (Update Log 260817.2):
 * `isolation.mjs` now refuses both directions by name, and `chooseVoicings`
 * additionally refuses a candidate whose arity does not match its string set.
 *
 * This module's own guard stays, and is not redundant. It fires EARLIER — where
 * a stream is BUILT rather than where it is used — and it speaks this module's
 * vocabulary ("keep shells out of a tetrad stream") rather than the optimizer's.
 * The suite pins both layers.
 *
 * So the deciding question is not "are shells tetrads" but "may a shell share a
 * candidate stream with a tetrad", and the answer is no. That is a constraint on
 * the STREAM, not on the module — and the module is the right home for them
 * because a shell is a REDUCTION OF THE SAME TETRAD (drop the 5) placed by the
 * SAME machinery. A sibling module would have to duplicate `placeOnSet`, the
 * octave walk and the neck bounds, which trades one real defect for another.
 *
 * The seam is therefore enforced instead of documented: shells are a separate
 * export that `tetradCandidates` never emits, and `assertUniformArity` makes a
 * mixed stream a loud failure at the point of use.
 */

/** four voices. Named so a reader never has to count. */
const ARITY = 4;

/** the drop families, as ONE rule with a parameter: which voice from the top
 * falls an octave. Close position is the identity — drop nothing. */
const FAMILIES = { close: 0, drop2: 2, drop3: 3 };

/** the shells, as positions in the chord's own tone list. A shell is the
 * guide-tone pair over the root: the 5th is what it leaves out. */
const SHELLS = { "R-3-7": [0, 1, 3], "R-7-3": [0, 3, 1] };

const asc = (a) => a.every((x, i) => i === 0 || x > a[i - 1]);

/** The chord's seventh-chord core: root, third, fifth, seventh. Extensions
 * stack above it (chord.mjs returns ascending intervals), so the core is the
 * first four — derived from that ordering, not from a per-quality table. */
function coreTetrad(chord) {
  const iv = chord.intervals;
  if (iv.length < ARITY)
    throw new Error(
      `${chord.symbol}: a tetrad voicing needs four tones, this chord has ${iv.length} ` +
      `(${iv.join(",")}) — triads belong to Triadetudes' generator`);
  /* NIGHT 84 (the silent-failure audit, place 3): an extended chord was cut to its first four intervals, so C13 voiced
   * as C7 and nothing said the 9th and 13th were gone. The parser spells what the four-voice voicer cannot hold; that
   * is a refusal, by name — never a silent narrowing (selection.mjs keeps the same rule). A caller that wants the
   * seventh-chord core asks for that chord. */
  if (iv.length > ARITY)
    throw new Error(
      `${chord.symbol}: a tetrad voicing holds four tones, this chord has ${iv.length} ` +
      `(${iv.join(",")}) — its extensions would be dropped in silence; voice its seventh chord by name`);
  return iv;
}

/* A stack is carried as {offset, tone} pairs — `tone` indexing the chord's own
 * core — so the bass and the root's position can be read back after a drop. */
const normalise = (pairs) => {
  const sorted = [...pairs].sort((a, b) => a.offset - b.offset);
  const base = sorted[0].offset;
  return sorted.map((p) => ({ ...p, offset: p.offset - base }));
};

/** Close position from inversion `inv`: start at that chord tone and take each
 * next tone above it, lifting an octave every time the list wraps. */
function closeStack(core, inv) {
  if (!Number.isInteger(inv) || inv < 0 || inv >= core.length)
    throw new Error(`inversion ${inv} is not one of 0..${core.length - 1}`);
  const out = [];
  for (let k = 0; k < core.length; k++) {
    const idx = (inv + k) % core.length;
    const wraps = Math.floor((inv + k) / core.length);
    out.push({ offset: core[idx] + 12 * wraps, tone: idx });
  }
  return normalise(out);                    // the bass sits at 0
}

/** Drop the `n`th voice from the top an octave. n = 0 is close position.
 * Re-sorted, because dropping a voice is what CHANGES the order — that is the
 * whole point of the family, and sorting is how the new order is derived
 * rather than typed out. */
function dropVoice(stack, n) {
  if (n === 0) return normalise(stack);
  if (n < 2 || n > stack.length)
    throw new Error(`drop-${n} is not defined on ${stack.length} voices`);
  const i = stack.length - n;               // nth from the top
  return normalise(stack.map((p, k) => (k === i ? { ...p, offset: p.offset - 12 } : p)));
}

/** Every shape of one family — one per STARTING inversion — each tagged with
 * the chord tone that ENDED UP in the bass. `bass` and `rootOffset` are read
 * back from the transformed stack, never from the inversion it started at:
 * dropping a voice is precisely what changes which tone is in the bass, so a
 * label taken from `inv` would be wrong for every drop family. */
function shapesOf(chord, family) {
  if (!(family in FAMILIES))
    throw new Error(`unknown family "${family}" — the named ones are ${Object.keys(FAMILIES).join(", ")}`);
  const core = coreTetrad(chord);
  const out = [];
  for (let inv = 0; inv < core.length; inv++) {
    const stack = dropVoice(closeStack(core, inv), FAMILIES[family]);
    const offsets = stack.map((p) => p.offset);
    if (!asc(offsets)) throw new Error(`${chord.symbol} ${family} inv ${inv}: offsets not ascending`);
    const rootVoice = stack.find((p) => p.tone === 0);
    if (!rootVoice) throw new Error(`${chord.symbol} ${family} inv ${inv}: the root left the voicing`);
    out.push({ family, inv, offsets, tones: stack.map((p) => p.tone),
      bass: stack[0].tone, rootOffset: rootVoice.offset });
  }
  return out;
}

/* ---------------- placement on a string set ---------------- */

/** One note per string, low to high, in the shape's own order. `set` is the
 * open-string midi values low → high; its length must equal the shape's, which
 * is how a three-voice shell and a four-string set refuse each other. */
function placeOnSet(shape, chord, { set, nfrets = 22, minFret = 0, strings = null }) {
  if (!Array.isArray(set) || !asc(set))
    throw new Error("a string set is open-string midi values, ascending low → high");
  if (set.length !== shape.offsets.length)
    throw new Error(
      `${shape.family} has ${shape.offsets.length} voices but the set has ${set.length} strings — ` +
      `arity must match, one note per string`);
  if (strings && strings.length !== set.length)
    throw new Error("`strings` names one string per open value");

  const bassPc = (((chord.root.pc - shape.rootOffset) % 12) + 12) % 12;
  const out = [];
  // walk every octave of the bass note that could put the shape on the neck
  for (let midi = 0; midi < 128; midi++) {
    if (midi % 12 !== bassPc) continue;
    const notes = shape.offsets.map((o, i) => {
      const m = midi + o;
      // `string` is the caller's own numbering when given — isolation.mjs's
      // zone names a real string (1..6), so a caller integrating with it must
      // be able to say which strings these are rather than accept 0..n indices
      return { midi: m, string: strings ? strings[i] : i, fret: m - set[i], slot: i };
    });
    if (notes.some((n) => n.fret < minFret || n.fret > nfrets)) continue;
    if (!asc(notes.map((n) => n.midi))) continue;
    out.push({ notes, family: shape.family, inv: shape.inv, bass: shape.bass });
  }
  return out;
}

/* ---------------- the candidate streams ---------------- */

/** Every candidate is the same arity — the law `chooseVoicings` needs and
 * cannot state for itself. Call it wherever a stream is assembled. */
function assertUniformArity(cands, what = "candidate stream") {
  if (!cands.length) return cands;
  const n = cands[0].notes.length;
  for (const v of cands)
    if (v.notes.length !== n)
      throw new Error(
        `${what}: mixed arity — ${n} and ${v.notes.length} voices in one stream. ` +
        `Voices are matched by index, so a mixed stream yields NaN costs silently ` +
        `rather than an error. Keep shells out of a tetrad stream.`);
  return cands;
}

/** THE SEAM. Feed this to `chooseVoicings`'s `candidatesFor`.
 *
 * Root position first within each family, because `chooseVoicings` breaks
 * cost ties by candidate order and the shipped optimizer's comment fixes that
 * convention ("root position first"). */
function tetradCandidates(chord, { set, nfrets = 22, strings = null, families = Object.keys(FAMILIES) }) {
  const ch = typeof chord === "string" ? parseChord(chord) : chord;
  const out = [];
  for (const family of families)
    for (const shape of shapesOf(ch, family).sort((a, b) => a.bass - b.bass))
      out.push(...placeOnSet(shape, ch, { set, nfrets, strings }));
  return assertUniformArity(out, `tetradCandidates(${ch.symbol})`);
}

/** Shells — ARITY 3, deliberately a separate door out of this module. A shell
 * stream and a tetrad stream must never be concatenated; see the arity law. */
function shellCandidates(chord, { set, nfrets = 22, strings = null, orders = Object.keys(SHELLS) }) {
  const ch = typeof chord === "string" ? parseChord(chord) : chord;
  const core = coreTetrad(ch);
  const out = [];
  for (const name of orders) {
    const idx = SHELLS[name];
    if (!idx) throw new Error(`unknown shell "${name}" — the named ones are ${Object.keys(SHELLS).join(", ")}`);
    // lift each tone above the one before it: the order IS the voicing
    const pairs = [];
    for (const i of idx) {
      let o = core[i];
      while (pairs.length && o <= pairs[pairs.length - 1].offset) o += 12;
      pairs.push({ offset: o, tone: i });
    }
    const stack = normalise(pairs);
    const shape = { family: "shell", order: name, inv: 0,
      offsets: stack.map((p) => p.offset), tones: stack.map((p) => p.tone),
      bass: stack[0].tone, rootOffset: stack.find((p) => p.tone === 0).offset };
    out.push(...placeOnSet(shape, ch, { set, nfrets, strings }).map((v) => ({ ...v, order: name })));
  }
  return assertUniformArity(out, `shellCandidates(${ch.symbol})`);
}

/* ---------------- rootless, and the identity it carries ---------------- */

/** A rootless voicing drops the root and takes the 9th: 3-5-7-9.
 *
 * The result IS a tetrad in its own right, rooted on the third — a rootless
 * Cmaj9 is an Em7. That is the cross-link to Triadetudes' break-down mode, and
 * it is exactly the kind of fact that rots silently, so this returns the
 * equivalent chord rather than describing it, and the suite asserts it. */
function rootlessTetrad(chord) {
  const ch = typeof chord === "string" ? parseChord(chord) : chord;
  const iv = ch.intervals;
  if (iv.length < 5)
    throw new Error(
      `${ch.symbol}: a rootless 3-5-7-9 voicing needs a ninth — this chord's tones are ${iv.join(",")}`);
  const offs = iv.slice(1, 5);                       // 3, 5, 7, 9
  const base = offs[0];
  const rel = offs.map((x) => x - base);             // as a stack on the third
  const rootPc = (((ch.root.pc + base) % 12) + 12) % 12;
  const pcs = rel.map((x) => (((rootPc + x) % 12) + 12) % 12);
  return { source: ch.symbol, offsets: rel, rootPc, pcs,
    /** the chord tones, low → high, of the tetrad this voicing actually is */
    intervals: rel };
}

/* ---------------- load-time assertions (golden rule 1, site form) ---------------- */

/* The families are checked on a chord whose shape is beyond argument, at load,
 * so a broken transform cannot reach a caller. Drop-2 root position on a major
 * seventh is R-5-7-3 — the shape the frozen study's whole payload is built
 * from — and drop-3 root position is R-7-3-5. */
{
  const maj7 = parseChord("Cmaj7");
  const core = coreTetrad(maj7);
  if (String(core) !== "0,4,7,11") throw new Error("tetrad-voicings: Cmaj7 core is not 0,4,7,11");

  const d2 = shapesOf(maj7, "drop2").find((s) => s.bass === 0);
  if (String(d2.offsets) !== "0,7,11,16")
    throw new Error("tetrad-voicings: drop-2 root position must be R-5-7-3, got " + d2.offsets);

  const d3 = shapesOf(maj7, "drop3").find((s) => s.bass === 0);
  if (String(d3.offsets) !== "0,11,16,19")
    throw new Error("tetrad-voicings: drop-3 root position must be R-7-3-5, got " + d3.offsets);

  const cl = shapesOf(maj7, "close").find((s) => s.bass === 0);
  if (String(cl.offsets) !== "0,4,7,11")
    throw new Error("tetrad-voicings: close root position must be R-3-5-7, got " + cl.offsets);

  // every family, every inversion: the chord's four pitch classes, exactly once
  for (const family of Object.keys(FAMILIES))
    for (const s of shapesOf(maj7, family)) {
      const pcs = new Set(s.offsets.map((o) => (o - s.rootOffset + 120) % 12));
      if (pcs.size !== ARITY)
        throw new Error(`tetrad-voicings: ${family} inv ${s.inv} does not hold four distinct tones`);
    }
}
return { ARITY, FAMILIES, SHELLS, coreTetrad, closeStack, dropVoice, shapesOf, placeOnSet, assertUniformArity, tetradCandidates, shellCandidates, rootlessTetrad };
})();

/* ===== engine/isolation.mjs ===== */
const __m_engine_isolation_mjs = (() => {
/* isolation.mjs — THE ISOLATION BOX AS A FIRST-CLASS VOICING CONSTRAINT
 * (component v1, Phase B stage 2).
 *
 * Extracted from Triadetudes rather than designed abstractly, per the family
 * spec's extraction principle: *engine from the most demanding app*. The box
 * is the app's thesis — "isolate, see it, hear it, practice it" — and it was
 * already a cost term rather than a UI toggle in the shipped study (roadmap
 * §4, "the ratified first-class voicing constraint"). What it was NOT was
 * separable: `placementCost` and `chooseVoicings` read `st.pivotFrets`,
 * `st.placement`, `st.setLowHigh` and `NFRETS` straight out of the app's
 * global state, so the constraint could not be posed without the app.
 *
 * THE EXTRACTION IS EXACTLY THAT: the zone becomes a VALUE a caller passes in,
 * and candidate generation becomes an injected dependency. What is left is the
 * choosing — which is the part Tetradetudes (four voices) and Modus Operandi
 * inherit unchanged, because neither shares Triadetudes' candidate geometry.
 *
 * Every number, tie rule and traversal order below is pinned byte-for-byte
 * against the shipped study by engine/tests/isolation.test.mjs, over a derived
 * corpus of keys × sets × pivots × placements. It is a REFACTOR, asserted as
 * one: the shipped étude's voicings are the specification.
 *
 * Pure: no DOM, no globals, no app state.
 */

/** The isolation zone: a window of frets on one string that the étude is
 * anchored to. Two centres, both preserved because the shipped engine uses
 * them for different things and they are not the same number:
 *
 *   mean    (min+max)/2      — the SEED ANCHOR, what an unvoiced first chord
 *                              is pulled toward
 *   centre  average of frets — the LINE DRIFT centre, what free placement is
 *                              scored against
 *
 * A three-fret window 1·3·5 has mean 3 and centre 3; a window 1·3·8 has mean
 * 4.5 and centre 4. The distinction is invisible until the window is uneven,
 * which is exactly when a refactor would silently change every étude.
 */
function makeZone({ string, frets }) {
  if (!Number.isInteger(string) || string < 1 || string > 6)
    throw new Error("isolation zone: the pivot string must be a real string");
  if (!Array.isArray(frets) || !frets.length)
    throw new Error("isolation zone: a zone is one or more frets on that string");
  for (const f of frets)
    if (!Number.isInteger(f) || f < 0) throw new Error("isolation zone: frets are non-negative integers");
  const min = Math.min(...frets), max = Math.max(...frets);
  return {
    string, frets: [...frets], min, max,
    mean: (min + max) / 2,
    centre: frets.reduce((a, b) => a + b, 0) / frets.length,
    /** the ratified cost of a pivot-string note against the window: free if it
     * is ON a window fret, cheap if merely inside it, otherwise the distance
     * to the nearer edge */
    cost(fret) {
      if (this.frets.includes(fret)) return 0;
      return fret >= this.min && fret <= this.max
        ? 1.5 : Math.min(Math.abs(fret - this.min), Math.abs(fret - this.max));
    },
  };
}

/** The three placements, named for what they mean (v0.6.14) — and the whole
 * difference between them expressed as weights and named tie rules rather
 * than as branches scattered through the optimizer.
 *
 *   GRIP  one note per string, anchored to the pivots — the isolation thesis
 *   FREE  the grip chosen by smoothest voice-leading, the pivot released; the
 *         étude begins in the zone and is then SEEN to leave it, so the seed
 *         anchor stays and only the pivot term drops (Daniel, 2026-08-10) —
 *         "anchor released" said here until night 85, and was never the rule
 *   LINE  placed freely along the set by the §6.1.2 rule
 *
 * Tie rules are NAMED because they are the pinned behaviour of every shipped
 * étude: Free ties resolve to the lower neck position; Grip ties keep the
 * first candidate, which is the generator's inversion order (root position
 * first) — stated and asserted rather than accidental.
 */
const PLACEMENTS = {
  grip: { pivotW: 4, anchorW: 0.5, tie: "candidate-order", ladderWrap: false },
  free: { pivotW: 0, anchorW: 0.5, tie: "lower-position", ladderWrap: true },
  line: { lineRule: true },
};

/* THE ARITY LAW (fixed 2026-08-17, Update Log 260817.2)
 * ------------------------------------------------------
 * Voices are matched BY INDEX across a sequence, so every comparison here
 * spans TWO voicings while the loop can only be written over ONE of them.
 * That asymmetry was a silent defect, found while building Tetradetudes 1:
 *
 *   voiceLeadCost(4-voice, 3-voice-prev)   read prev.notes[3] → TypeError, loud
 *   voiceLeadCost(3-voice, 4-voice-prev)   iterated 3 and returned a NUMBER
 *
 * The second is the hazard. A shorter voicing was measured over fewer voices
 * than the comparison actually spanned, the missing voices contributed nothing,
 * so it under-reported its own movement, won the cost comparison in
 * `chooseVoicings`, and nothing anywhere reported a problem.
 *
 * The fix is at SOURCE rather than in a caller, because a caller-side guard
 * protects one caller and every later consumer inherits the silent version.
 * `engine/tetrad-voicings.mjs` keeps its own `assertUniformArity` — the two are
 * not redundant, see `chooseVoicings` below.
 */
function sameArity(where, v, prev) {
  if (v.notes.length !== prev.notes.length)
    throw new Error(
      `${where}: arity mismatch — ${v.notes.length} voices compared against ${prev.notes.length}. ` +
      `Voices are matched by index, so a shorter voicing would silently under-report its ` +
      `movement and win on cost. Keep one arity per stream.`);
}

/** voice-leading measured in PITCH: midi, voices matched by sorted order
 * (the note list is ascending by construction). Both voicings must carry the
 * same number of voices — see THE ARITY LAW above. */
function voiceLeadCost(v, prev) {
  if (!prev) return 0;
  sameArity("voiceLeadCost", v, prev);
  let d = 0;
  for (let i = 0; i < v.notes.length; i++) d += Math.abs(v.notes[i].midi - prev.notes[i].midi);
  return d;
}

/** placement measured in FRETS: distance from the zone, plus the seed anchor
 * on the first chord only.
 *
 * `pivotIndex` is derived by the caller from `setLowHigh`, so a voicing whose
 * arity does not match that set indexes the WRONG VOICE. Out of range was
 * already loud by accident (`undefined.fret`); it is named here instead. The
 * in-range-but-wrong-arity case cannot be seen from inside this function —
 * it has no idea how long the set was — and is caught in `chooseVoicings`,
 * which is the one place both facts are known. */
function placementCost(v, prev, pivotIndex, zone, pivotW, anchorW) {
  if (!Number.isInteger(pivotIndex) || pivotIndex < 0 || pivotIndex >= v.notes.length)
    throw new Error(
      `placementCost: pivot index ${pivotIndex} is outside a ${v.notes.length}-voice voicing — ` +
      `the pivot is derived from the string set, so this voicing does not belong to that set`);
  const pf = v.notes[pivotIndex].fret;
  let c = pivotW * zone.cost(pf);
  if (!prev) c += Math.abs(pf - zone.mean) * anchorW;
  return c;
}

/** EXEMPT from the arity law, deliberately: one argument, and the divisor is
 * that same argument's length. A mean is arity-normalised by construction, so
 * it stays comparable across voicings of different sizes — which is what the
 * "lower-position" tie rule needs it to be. Nothing here spans two voicings. */
function meanFret(v) {
  return v.notes.reduce((a, n) => a + n.fret, 0) / v.notes.length;
}

/** total voice-leading movement across a voiced sequence, in semitones; a
 * wrapped transition is measured against the previous voicing an octave down */
function movementTotal(voic) {
  // A NULL entry is a chord `chooseVoicings` could not voice — a REAL result of
  // the optimizer, not a caller error (unlike the arity mismatch voiceLeadCost
  // throws on). A sequence carrying one is UNPLAYABLE, and its total movement is
  // therefore not zero but unbounded. The pre-fix loop skipped the null and the
  // pairs spanning it and returned the sum of the rest — so [A, null, C] scored 0,
  // the BEST possible value, and the most broken input imaginable won every
  // comparison it entered (measured: [A,B,C]→30, [A,null,C]→0). Infinity loses
  // them all, reads honestly in the placement readout that consumes this, keeps
  // the number→number signature every caller and the drift pin rely on, and never
  // throws on legitimate `chooseVoicings` output. (Item 260817.3, deferred by the
  // voiceLeadCost fix; movementTotal is reporting-only — it feeds no selection —
  // so no shipped étude output moves.)
  if (voic.some((v) => !v)) return Infinity;
  let t = 0;
  for (let i = 1; i < voic.length; i++) {
    let p = voic[i - 1];
    if (voic[i].wrapped) p = { notes: p.notes.map((n) => ({ ...n, midi: n.midi - 12 })) };
    t += voiceLeadCost(voic[i], p);
  }
  return t;
}

/** Line placement (spec §6.1.2, the rule verbatim): a chord tone present in
 * the zone is taken there; remaining tones take the placement on the set
 * minimising total fret span; at most three notes per string. Ties: tighter
 * span, then nearer the zone centre, then the lower string. Stateless per
 * chord — a line has no grip continuity to preserve.
 *
 * `positionsFor(pc)` and `zoneNotes` are injected: the rule is about placement,
 * not about one instrument's geometry. */
function lineVoicing(pcs, { zone, zoneNotes, positionsFor, setLowHigh, maxPerString = 3 }) {
  const placed = [], remaining = [];
  for (const pc of pcs) {
    const w = zoneNotes.find((n) => n.midi % 12 === pc);
    if (w) placed.push({ ...w }); else remaining.push(pc);
  }
  let bestCombo = null, bestKey = null;
  const tryCombo = (combo) => {
    const all = [...placed, ...combo];
    const perString = {};
    for (const n of all) perString[n.string] = (perString[n.string] || 0) + 1;
    if (Object.values(perString).some((c) => c > maxPerString)) return;
    const frets = all.map((n) => n.fret);
    const span = Math.max(...frets) - Math.min(...frets);
    const drift = combo.reduce((a, n) => a + Math.abs(n.fret - zone.centre), 0);
    const lowStr = -combo.reduce((a, n) => a + n.string, 0);   // lower pitch = higher number
    const key = [span, drift, lowStr];
    if (!bestKey || key[0] < bestKey[0] ||
      (key[0] === bestKey[0] && (key[1] < bestKey[1] ||
        (key[1] === bestKey[1] && key[2] < bestKey[2])))) { bestKey = key; bestCombo = combo; }
  };
  const walk = (idx, combo) => {
    if (idx === remaining.length) { tryCombo(combo); return; }
    for (const c of positionsFor(remaining[idx])) walk(idx + 1, [...combo, c]);
  };
  walk(0, []);
  const notes = [...placed, ...(bestCombo || [])].sort((a, b) => a.midi - b.midi)
    .map((n) => ({ ...n, slot: setLowHigh.indexOf(n.string) }));
  // derived, then asserted: the right count, the chord's pcs exactly
  if (notes.length !== pcs.length) throw new Error("lineVoicing: expected " + pcs.length + " notes");
  const got = new Set(notes.map((n) => n.midi % 12));
  for (const pc of pcs)
    if (!got.has(((pc % 12) + 12) % 12)) throw new Error("lineVoicing: chord tone lost in placement");
  const inv = pcs.indexOf(notes[0].midi % 12);
  return { notes, inv: inv < 0 ? 0 : inv };
}

/** THE OPTIMIZER. One chord at a time, cheapest (placement + voice-leading),
 * with the placement's named tie rule and — for Free — the ladder wrap.
 *
 * opts:
 *   zone            makeZone(...)            the isolation box
 *   placement       "grip" | "free" | "line"
 *   setLowHigh      the set, low → high      (pivot index is derived from it)
 *   candidatesFor   (chord) => voicings      the app's geometry, injected
 *   lineVoicingFor  (chord) => voicing       only needed for LINE
 *   nfrets          the neck's length        the ladder wrap's trigger
 */
function chooseVoicings(seq, opts) {
  const { zone, placement, setLowHigh, candidatesFor, lineVoicingFor, nfrets } = opts;
  const rule = PLACEMENTS[placement];
  if (!rule) throw new Error(`unknown placement "${placement}" — the named ones are ${Object.keys(PLACEMENTS).join(", ")}`);
  if (rule.lineRule) {
    if (!lineVoicingFor) throw new Error("line placement needs lineVoicingFor");
    return seq.map((ch) => lineVoicingFor(ch));
  }
  const pivotIndex = setLowHigh.indexOf(zone.string);
  if (pivotIndex < 0) throw new Error("the isolation zone's string is not in the set");

  /* THE SET-ANCHORED ARITY CHECK — the strongest form available, and the reason
   * `assertUniformArity` was NOT moved down here from engine/tetrad-voicings.mjs.
   *
   * That guard asks "is this stream internally consistent?", which a uniformly
   * three-voice stream on a four-string set passes while still being wrong.
   * This one asks the question only `chooseVoicings` can: does each candidate
   * match THE SET the pivot index was derived from? It subsumes uniformity —
   * every candidate equal to one number — and anchors it to the geometry.
   *
   * So the two guards sit at different levels and neither is redundant:
   * tetrad-voicings catches a bad stream where it is BUILT, with a message
   * about shells; this catches a stream that does not fit the set where it is
   * USED. A later consumer that writes its own generator gets this one for
   * free, which is the whole point of fixing it at source. */
  const arityOf = (v) => v.notes.length;
  let prev = null;
  const out = [];
  for (const ch of seq) {
    const cands = candidatesFor(ch);
    for (const v of cands)
      if (arityOf(v) !== setLowHigh.length)
        throw new Error(
          `chooseVoicings: a candidate has ${arityOf(v)} voices but the set has ` +
          `${setLowHigh.length} strings. The pivot index is derived from the set, so voices would ` +
          `be matched against the wrong strings and a shorter voicing would win on cost silently.`);
    let best = null, bc = 1e9;
    for (const v of cands) {
      const cost = placementCost(v, prev, pivotIndex, zone, rule.pivotW, rule.anchorW)
        + voiceLeadCost(v, prev);
      const tied = cost === bc && best !== null;
      if (cost < bc || (tied && rule.tie === "lower-position" && meanFret(v) < meanFret(best))) {
        bc = cost; best = v;
      } // candidate-order ties: the first candidate stands — root position first
    }
    if (rule.ladderWrap && prev && best &&
        Math.max(...best.notes.map((n) => n.fret)) > nfrets - 3) {
      /* the LADDER WRAP (named rule): Free walks the neck. Within three frets
       * of the neck's end the climb restarts — re-seek in the lowest position,
       * minimising pitch distance from the previous voicing transposed down an
       * octave. The box jumps to the nut: a visible consequence, not a clamp. */
      const ghost = { notes: prev.notes.map((n) => ({ ...n, midi: n.midi - 12 })) };
      let wb = null, wc = 1e9;
      for (const v of cands) {
        const c = voiceLeadCost(v, ghost);
        if (c < wc || (c === wc && wb && meanFret(v) < meanFret(wb))) { wc = c; wb = v; }
      }
      best = { ...wb, wrapped: true };
    }
    out.push(best); prev = best;
  }
  return out;
}
return { makeZone, PLACEMENTS, voiceLeadCost, placementCost, meanFret, movementTotal, lineVoicing, chooseVoicings };
})();

/* ===== engine/voice-identity.mjs ===== */
const __m_engine_voice_identity_mjs = (() => {
/* voice-identity.mjs — A STABLE KEY PER VOICE, ACROSS A CHORD CHANGE.
 *
 * Tetradetudes child 2 (scoping note 2026-08-16, finding 2). Pure, DOM-free,
 * no state, no dependencies — family infrastructure, not a Tetradetudes
 * feature: everything here works at any arity.
 *
 * WHY THIS EXISTS
 * ---------------
 * The roadmap treats animated voice movement as a RENDERER to be extracted and
 * shared. Measured on the frozen study it is three CSS transitions and about
 * six lines suppressing them on instant jumps; there is no
 * `requestAnimationFrame` in the file at all.
 *
 * **The difficulty is identity, not animation.** A dot glides only if the SAME
 * DOM NODE survives the chord change. A voice that holds must keep its element
 * while a voice that moves transitions to a new position — and that is an
 * engine question. `voiceLeadCost` already matches voices BY INDEX, so the seam
 * exists implicitly. This module makes it explicit and asserted.
 *
 * WHAT A VOICE KEY IS, AND THE ONE THING IT MUST NOT BE
 * ----------------------------------------------------
 * A voice's identity is its CHANNEL — the thing that persists across a change —
 * and emphatically NOT its rank in pitch order. That distinction is the whole
 * module, because the two coincide often enough to look interchangeable:
 *
 *   - keyed by CHANNEL: two voices that cross keep their identities and the
 *     renderer glides them past each other, which is what actually happened
 *   - keyed by PITCH RANK: the same crossing SWAPS the two dots' identities,
 *     so each appears to jump to the other's position and the narrator reports
 *     two leaps where the music had none
 *
 * The divergence is real in this codebase rather than hypothetical:
 * `isolation.mjs`'s `lineVoicing` sorts its notes by midi and then takes
 * `slot` from the string's position in the set, so a low string fretted high
 * puts a note late in pitch order and early in channel order.
 *
 * Neither is the key a PITCH CLASS or a chord-tone ROLE. A holding voice keeps
 * its pitch while its role changes underneath it — the frozen study's own
 * footer says so ("held notes recolor as their function changes") — and a
 * moving voice changes pitch while remaining the same voice. Both would break
 * exactly the cases this module exists to get right.
 *
 * DERIVED, NEVER STORED
 * ---------------------
 * `voiceKey` is a pure function of one note. There is no counter, no registry,
 * no WeakMap and nothing to persist or invalidate — the same note yields the
 * same key forever, in any session, which is what makes it safe as a DOM key.
 * (Relative-state doctrine: store the minimum, derive the rest.)
 *
 * The channel accessor is INJECTED, defaulting to `slot`, so a consumer whose
 * material is not strings says so rather than being told what a voice is —
 * the same idiom `drill.mjs` uses for its material.
 */

/** the default channel: `slot` is the set-position every engine voicing carries */
const DEFAULT_CHANNEL = (n) => n.slot;

const isChannel = (c) => (typeof c === "number" && Number.isFinite(c)) || typeof c === "string";

/** THE KEY. A pure function of one note — derived, never assigned. */
function voiceKey(note, channelOf = DEFAULT_CHANNEL) {
  if (!note || typeof note !== "object") throw new Error("voiceKey: a note is an object");
  const c = channelOf(note);
  if (!isChannel(c))
    throw new Error(
      `voiceKey: this note has no channel (${JSON.stringify(c)}). A voice's identity is its ` +
      `channel — its slot in the set — so a note without one cannot be tracked across a change. ` +
      `Pass channelOf if this material does not use "slot".`);
  return "v" + c;
}

/** Keys for a whole voicing, asserted UNIQUE: two voices sharing an identity
 * would collapse to one DOM node and the renderer would drop a dot silently. */
function keysOf(voicing, channelOf = DEFAULT_CHANNEL) {
  const notes = notesOf(voicing, "keysOf");
  const keys = notes.map((n) => voiceKey(n, channelOf));
  const seen = new Set();
  for (const k of keys) {
    if (seen.has(k))
      throw new Error(
        `keysOf: two voices share the channel "${k}" — voice identities must be distinct, or ` +
        `two voices collapse onto one element and a dot disappears without an error`);
    seen.add(k);
  }
  return keys;
}

function notesOf(voicing, where) {
  const notes = Array.isArray(voicing) ? voicing : voicing && voicing.notes;
  if (!Array.isArray(notes) || !notes.length)
    throw new Error(`${where}: expected a voicing (a {notes:[…]} or a note array)`);
  return notes;
}

/** THE CORRESPONDENCE across one change, by key rather than by position.
 *
 * Returns { paired, left, entered }. `left` and `entered` are reported rather
 * than thrown on, because a genuine change of string set really does end some
 * voices and begin others — a renderer fades those instead of gliding them. */
function matchVoices(prev, next, channelOf = DEFAULT_CHANNEL) {
  const a = notesOf(prev, "matchVoices"), b = notesOf(next, "matchVoices");
  const byKey = (notes) => {
    const m = new Map();
    keysOf(notes, channelOf).forEach((k, i) => m.set(k, notes[i]));
    return m;
  };
  const A = byKey(a), B = byKey(b);
  const paired = [], left = [], entered = [];
  for (const [k, from] of A) {
    if (B.has(k)) paired.push({ key: k, from, to: B.get(k) });
    else left.push({ key: k, from });
  }
  for (const [k, to] of B) if (!A.has(k)) entered.push({ key: k, to });
  return { paired, left, entered };
}

/** PER-VOICE TRANSITIONS, classified. Every voice must be paired: a transition
 * list with holes would under-report movement exactly the way a shorter
 * voicing under-reported its cost (Update Log 260817.3), so an unpaired voice
 * is named rather than skipped. */
function transitions(prev, next, channelOf = DEFAULT_CHANNEL) {
  const { paired, left, entered } = matchVoices(prev, next, channelOf);
  if (left.length || entered.length)
    throw new Error(
      `transitions: ${left.length} voice(s) left (${left.map((v) => v.key).join(", ") || "—"}) and ` +
      `${entered.length} entered (${entered.map((v) => v.key).join(", ") || "—"}). These voicings do ` +
      `not share a channel set, so there is no voice-to-voice correspondence to describe. Use ` +
      `matchVoices if a set change is expected.`);
  return paired.map(({ key, from, to }) => {
    const semitones = to.midi - from.midi;
    return { key, from, to, semitones, kind: semitones === 0 ? "hold" : "move" };
  });
}

/** THE OCTAVE LEAP — "runs out of neck, the whole grip jumps".
 *
 * True only when EVERY voice moves by the SAME non-zero whole number of
 * octaves. That is what lets a narrator describe it as ONE event rather than
 * as four independent leaps, and it is why the test for it is a property of
 * the whole voicing rather than of any voice.
 *
 * Derived from the transitions, so it cannot disagree with them. */
function octaveLeap(prev, next, channelOf = DEFAULT_CHANNEL) {
  const ts = transitions(prev, next, channelOf);
  const first = ts[0].semitones;
  const leapt = first !== 0 && first % 12 === 0 &&
    ts.every((t) => t.semitones === first);
  return { leapt, octaves: leapt ? first / 12 : 0, semitones: leapt ? first : 0 };
}

/** the voices that did not move — what a renderer leaves alone and a narrator
 * calls "held" */
function holding(prev, next, channelOf = DEFAULT_CHANNEL) {
  return transitions(prev, next, channelOf).filter((t) => t.kind === "hold");
}

/** Keys across a whole SEQUENCE, one row per voice: the shape a renderer wants,
 * because a row is one DOM node's life. Voicings may be null (a chord the
 * optimizer could not voice); the row carries null there rather than closing
 * the gap, so a hole stays visible instead of shortening the line. */
function voiceLines(voicings, channelOf = DEFAULT_CHANNEL) {
  const real = voicings.filter(Boolean);
  if (!real.length) throw new Error("voiceLines: no voicings");
  const keys = keysOf(real[0], channelOf);
  for (const v of real) {
    const k = keysOf(v, channelOf);
    if (k.length !== keys.length || k.some((x, i) => x !== keys[i]))
      throw new Error(
        `voiceLines: the channel set changes mid-sequence (${keys.join(",")} → ${k.join(",")}). ` +
        `A voice's identity would not survive it, so the renderer cannot glide across this point.`);
  }
  return keys.map((key, i) => ({
    key,
    notes: voicings.map((v) => (v ? notesOf(v, "voiceLines")[i] : null)),
  }));
}

/* ---------------- load-time assertions (golden rule 1, site form) ---------------- */

/* The crossing case is checked at load, because it is the one a naive key gets
 * wrong and the one whose breakage is invisible: both keys still exist, both
 * dots still render, and only the identities are swapped. */
{
  const note = (slot, midi) => ({ slot, midi, fret: midi - 40, string: 6 - slot });
  // two voices whose PITCH ORDER inverts while their channels do not
  const before = [note(0, 60), note(1, 64)];
  const after = [note(0, 66), note(1, 62)];
  const ts = transitions(before, after);
  if (ts.length !== 2) throw new Error("voice-identity: crossing lost a voice");
  if (ts[0].key !== "v0" || ts[1].key !== "v1")
    throw new Error("voice-identity: a crossing swapped voice identities");
  if (ts[0].semitones !== 6 || ts[1].semitones !== -2)
    throw new Error("voice-identity: a crossing mismeasured its own movement");
  // the whole-grip leap is one event
  const leapt = octaveLeap(before, before.map((n) => ({ ...n, midi: n.midi + 12 })));
  if (!leapt.leapt || leapt.octaves !== 1)
    throw new Error("voice-identity: a uniform octave jump is not being read as one event");
}
return { DEFAULT_CHANNEL, voiceKey, keysOf, matchVoices, transitions, octaveLeap, holding, voiceLines };
})();

/* ===== engine/tetrad-sequence.mjs ===== */
const __m_engine_tetrad_sequence_mjs = (() => {
const { parseChord, scaleNotes, SCALE_STEPS } = __m_engine_chord_mjs;
const { tetradCandidates } = __m_engine_tetrad_voicings_mjs;
const { chooseVoicings, makeZone } = __m_engine_isolation_mjs;
const { keysOf } = __m_engine_voice_identity_mjs;
const { OPEN_MIDI, opensOf } = __m_engine_field_mjs;
const { setLabel } = __m_engine_open_string_mjs;
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




/* THE TUNING IS THE FIELD'S FACT (260920, night 26 item 1 — standing rule 6):
 * this module stated standard tuning as a six-number literal beside
 * field.mjs's derived one, and the tests pinned the two equal. One value now,
 * derived in field.mjs from its named rule and imported here; nothing is
 * re-exported (the door build reads exports by declaration, so a re-export
 * would be silently dropped) — every consumer imports from field.mjs. */


/* ---------------- the instrument ---------------- */

/** the three four-string groups the frozen study offers, derived by sliding a
 * window of four down the six strings rather than listed */
const STRING_SETS = [0, 1, 2].map((offset) => {
  const strings = [6, 5, 4, 3].map((s) => s - offset);
  return {
    offset, strings,
    /* the ENUMERATION's opens are the default's — the sets are named against standard; a
     * pass built with a tuning carries the tuned opens on its own `set` (tetradPass) */
    opens: strings.map((s) => OPEN_MIDI[s]),   // the DEFAULT's — the enumeration is named against standard
    /* THE LABEL READS HIGH → LOW, the reference's dialect (Shell 4). `strings`
     * is the data and stays untouched — string 1 is the highest (string-sets.mjs
     * law) — so the label is derived by sorting ASCENDING by string number
     * (= descending pitch): offset 0 → G–D–A–E, not E–A–D–G. Presentation only;
     * `offset`/`opens`/`strings` are the stored identity a saved étude restores
     * by, and none of them move. */
    label: setLabel(strings, OPEN_MIDI, OPEN_MIDI),   // derived by the one rule (night 44) — N4's uppercase is the names'
  };
});

/* ---------------- the cycles ---------------- */

/** Each cycle is ONE number: how many scale degrees the root moves each step.
 * Every value is coprime with 7, so each cycle visits all seven degrees and
 * returns home in eight chords — derived, not enumerated per cycle. */
const CYCLES = {
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
function cycleDegrees(cycle, startDegree = 0) {
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
function tetradOnDegree(key, scaleType, degree) {
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
function romanOf({ chord, degree }) {
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
/** THE ZONE'S DEFAULT — DERIVED, ratified 2026-08-21 ("the window is a
 * position"): three consecutive SCALE notes on the anchor string, at the
 * familiar 5th position (the first scale fret at or above 5 starts the
 * triple; the last possible triple if the string runs out). This deliberately
 * retires the pre-ruling literal [5,6,7] — three ADJACENT frets, the e5ba874
 * flattening — and moves pinned default output WITH the ruling's authority;
 * the legacy path (explicit frets, bind:false) remains reachable and pinned,
 * which is what pre-ruling saved études restore through. `zone` is
 * `{ frets }` and optionally `{ string, bind }` — the string defaults to the
 * set's lowest, where the pivot lives in every voicing on that set. */
function defaultZoneFrets(key, scaleType, string, opens = OPEN_MIDI) {
  const pcs = scaleNotes(key, scaleType).map((n) => n.pc);
  const sf = [];
  for (let f = 0; f <= 22; f++) if (pcs.includes((opens[string] + f) % 12)) sf.push(f);
  let i = sf.findIndex((f) => f >= 5);
  if (i < 0 || i > sf.length - 3) i = sf.length - 3;
  return [sf[i], sf[i + 1], sf[i + 2]];
}

function tetradPass({
  key = "C", scale = "major", cycle = "fourths", bottom = 0, setIndex = 0,
  nfrets = 15, families = ["drop2"], startDegree = 0, placement = "free",
  zone = null, tuning = null,
} = {}) {
  if (!SCALE_STEPS[scale]) throw new Error(`unknown scale "${scale}" — chord.mjs knows ${Object.keys(SCALE_STEPS).join(", ")}`);
  const named = STRING_SETS[setIndex];
  if (!named) throw new Error(`unknown string set ${setIndex} — there are ${STRING_SETS.length}`);
  /* THE TUNING IS THE FIELD'S FACT (night 44): `tuning` is the same optional offsets map
   * field() takes; the opens are derived and asserted well-formed by the one function, and
   * the pass's set carries THEM — its label re-derived by the direction rule. No tuning is
   * standard, and standard is byte-for-byte what it was. */
  const opens = opensOf(tuning);
  const set = { ...named, opens: named.strings.map((s) => opens[s]), label: setLabel(named.strings, opens, OPEN_MIDI) };
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

  /* THE ZONE IS AN ARGUMENT, not a magic number. The relative-state doctrine:
   * store it small (a fret list, an optional string), pass it plainly, and let
   * isolation.mjs — untouched — build the real zone value with its two centres
   * and its cost. A caller with no opinion gets the derived default. */
  const zoneString = zone && Number.isInteger(zone.string) && set.strings.includes(zone.string)
    ? zone.string : set.strings[0];
  const zoneFrets = zone && Array.isArray(zone.frets) && zone.frets.length
    ? zone.frets.map(Number) : defaultZoneFrets(key, scale, zoneString, opens);
  const theZone = makeZone({ string: zoneString, frets: zoneFrets });

  /* BINDING IS THE DEFAULT (ratified 2026-08-21: "a position you do not stay
   * in is not a position"). The ANCHOR VOICE must land on one of the zone's
   * frets (or an open string — positionless); the other voices reach as the
   * chord requires. Never the whole box: whole-box binding is structurally
   * impossible for close and drop3 (measured, 260820). A bar with NO anchored
   * candidate takes the full pool — never an error, nothing throws. AMENDED
   * 2026-10-02 (Daniel, narrowing his own 2026-08-21 ruling): such a bar is no
   * longer SILENT — its step says `offZone`, derived below from the voicing,
   * and the readout names the bar; the BOX still never stretches and never
   * reports. The seed outranks the bind: bar 1 keeps the requested bottom, and
   * its fallback stays unmarked (ruled). `zone.bind === false` is the legacy unbound path,
   * byte-for-byte the pre-ruling optimizer — what pre-ruling saved études
   * restore through, and what the oracle comparisons pin. */
  const bind = !(zone && zone.bind === false);
  const zi = set.strings.indexOf(zoneString);
  const bindFilter = (pool) => {
    if (!bind) return pool;
    const anchored = pool.filter((v) => {
      const pf = v.notes[zi].fret;
      return pf === 0 || zoneFrets.includes(pf);
    });
    return anchored.length ? anchored : pool;
  };
  const boundCandidatesFor = (ch) => bindFilter(candidatesFor(ch));
  const voicings = chooseVoicings(chords, {
    zone: theZone, placement, setLowHigh: set.strings, nfrets, candidatesFor: boundCandidatesFor,
  });

  /* THE BOX IS THE WINDOW (ratified 2026-08-21): the span of the zone's three
   * anchor-string scale notes by the strings of the set — a SETTING, derived
   * from the zone and NEVER from the voicings. It is rigid: it never
   * stretches, never reports, never explains itself — still true after
   * 2026-10-02; what reports is the STEP (offZone) and the readout, not the box. Notes outside it are
   * stretches, left alone — that is the teaching. (The voicing scan, the
   * soft wall, brokeLeft and the reach counter shipped 2026-08-20 are
   * retracted by the ruling and deleted with it.) */
  const box = { fLo: Math.min(...zoneFrets), fHi: Math.max(...zoneFrets), strings: [...set.strings] };

  for (const [i, v] of voicings.entries())
    if (!v) throw new Error(`no voicing for ${chords[i].symbol} on ${set.label} within ${nfrets} frets`);

  return {
    key, scale, cycle, bottom, setIndex, set, families, placement, opens,
    zone: { string: zoneString, frets: [...zoneFrets], ...(bind ? {} : { bind: false }) },
    box,
    rule: CYCLES[cycle].rule,
    steps: chords.map((c, i) => ({
      ...c, voicing: voicings[i], keys: keysOf(voicings[i]),
      /* THE BAR WHOSE ANCHOR LEFT THE ZONE (night 85 — Daniel, 2026-10-02): with the bind on, a bar after the first whose
       * anchor voice is off the zone's frets (and not an open string) can only have come from the full pool — no grip
       * of that chord reached the zone. Derived from the voicing, never stored. Bar 1's seed fallback is ruled: unmarked. */
      ...(bind && i > 0 && voicings[i].notes[zi].fret !== 0 && !zoneFrets.includes(voicings[i].notes[zi].fret) ? { offZone: true } : {}),
      /** each voice's degree label against ITS OWN chord — the frozen study's
       * "held notes recolor as their function changes", derived per step */
      labels: voicings[i].notes.map((n) => degreeLabel(c.chord, n.midi)),
    })),
  };
}

/** the label a pitch wears inside a chord: its interval from that chord's root,
 * named. Derived from the chord's own root, so a held pitch relabels itself
 * when the chord under it changes — which is the whole point. */
function degreeLabel(chord, midi) {
  const iv = (((midi - chord.root.pc) % 12) + 12) % 12;
  return { 0: "R", 1: "b9", 2: "9", 3: "b3", 4: "3", 5: "11", 6: "b5",
    7: "5", 8: "#5", 9: "6", 10: "b7", 11: "7" }[iv];
}

/* ---------------- load-time assertions (golden rule 1, site form) ---------------- */

{
  /* the gap rule that stood here was the DEFAULT's identity, re-derived (night 44 —
   * design note §6): field.mjs asserts its own default's rule once, and every tuning is
   * asserted well-formed where it is built. What this module owns is its enumeration:
   * each named set's opens ascend low → high with its strings (no crossing) */
  for (const s of STRING_SETS)
    for (let i = 1; i < s.opens.length; i++)
      if (s.opens[i] <= s.opens[i - 1]) throw new Error(`tetrad-sequence: set ${s.label}'s opens do not ascend with its strings`);
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
return { STRING_SETS, CYCLES, cycleDegrees, tetradOnDegree, romanOf, defaultZoneFrets, tetradPass, degreeLabel };
})();

/* ===== engine/role.mjs ===== */
const __m_engine_role_mjs = (() => {
const { SCALE_STEPS } = __m_engine_chord_mjs;
/* role.mjs — THE ROLE A TONE WEARS IN A CHORD, spelled once (night 71, 261028 — PO ruling 261028).
 *
 * NAMED stackRole, NOT spellRole (the name the ruling approved): engine/chord.mjs already exports a spellRole — it
 * spells a tone's NOTE NAME (the 7th of C7 is Bb) from the root's letter — and chord.mjs is pinned byte for byte into
 * the hand-authored studies, so it cannot be renamed. Two exports of one name for two different things is a trap; the
 * name here says the doctrine instead: the STACK position names the role.
 *
 * *** AN INTERVAL DOES NOT NAME A CHORD ROLE. THE STACK POSITION DOES. ***
 *
 * Five semitones above a root is the 11 of a tetrad's stack or the 4 of a sus chord; six is the b5 of a diminished
 * fifth or the #11 over a perfect one. So semitones → role is not a function, and a table keyed by the interval alone
 * must pick one answer arbitrarily. stackRole takes BOTH facts — the stack degree the tone fills (1, 3, 5, 7, 9, 11,
 * 13, or 2, 4, 6 where a chord carries them) and its distance above the root — and COMPUTES the accidental: the
 * distance measured against the major scale's own distance for that degree (golden rule 1: computed, never chosen).
 *   stackRole(5, 6)  → "b5"    stackRole(11, 6) → "#11"    stackRole(7, 9) → "bb7"    stackRole(1, 0) → "R"
 *
 * THE SOURCE FOR ANYTHING NEW. Its consumers tonight: the chord symbol (reference.mjs's assembly) and the chip row's
 * role labels — both on one face, so they agree by construction.
 *
 * THE ONE NAMED SECOND VOCABULARY (outstanding, step B of ruling 261028): engine/upper-structure.mjs keeps its own
 * label tables (LABEL_SEMIS / LABEL_LETTER / IV_LABEL). It serves only triadetudes — a hand-authored published page
 * that the carrier census pins byte for byte — so it moves onto this function when triadetudes becomes a door, or by
 * a re-copy ruled separately. It is named HERE and in the step-B item only. A THIRD vocabulary must never appear.
 */

/* the major scale's distance above its root for degrees 1…7 — DERIVED from the one scale table, not typed */
const MAJOR = SCALE_STEPS.major.slice(0, 6).reduce((acc, s) => acc.concat(acc[acc.length - 1] + s), [0]);

/** the role of a tone that fills stack `degree` (1…13) at `semitones` above the chord's root */
function stackRole(degree, semitones) {
  if (!Number.isInteger(degree) || degree < 1 || degree > 13)
    throw new Error(`stackRole: a stack degree is 1…13, not ${degree}`);
  if (!Number.isInteger(semitones)) throw new Error(`stackRole: semitones must be an integer, not ${semitones}`);
  const ref = MAJOR[(degree - 1) % 7];
  let d = (((semitones - ref) % 12) + 12) % 12;
  if (d > 6) d -= 12;
  if (degree === 1) {
    if (d !== 0) throw new Error(`stackRole: the root is 0 semitones above itself, not ${semitones}`);
    return "R";
  }
  if (Math.abs(d) > 2) throw new Error(`stackRole: ${semitones} semitones cannot fill degree ${degree} (${d > 0 ? "+" : ""}${d} from its major distance)`);
  return (d < 0 ? "b".repeat(-d) : "#".repeat(d)) + degree;
}

/* ---------------- load-time assertions (golden rule 1, site form) ---------------- */
{
  if (MAJOR.join(",") !== "0,2,4,5,7,9,11") throw new Error(`role: the major reference did not derive to 0,2,4,5,7,9,11 — ${MAJOR}`);
  const cases = [[1, 0, "R"], [3, 4, "3"], [3, 3, "b3"], [5, 7, "5"], [5, 6, "b5"], [5, 8, "#5"], [7, 11, "7"], [7, 10, "b7"],
    [7, 9, "bb7"], [9, 2, "9"], [9, 1, "b9"], [9, 3, "#9"], [11, 5, "11"], [11, 6, "#11"], [13, 9, "13"], [13, 8, "b13"],
    [4, 5, "4"], [2, 2, "2"], [6, 9, "6"]];
  for (const [deg, st, want] of cases) {
    const got = stackRole(deg, st);
    if (got !== want) throw new Error(`role: stackRole(${deg}, ${st}) is "${got}", not "${want}"`);
  }
  // THE DOCTRINE, asserted: one interval, two stack positions, two roles
  if (stackRole(5, 6) === stackRole(11, 6) || stackRole(11, 5) === stackRole(4, 5))
    throw new Error("role: an interval named a role on its own — the stack position must decide it");
}
return { stackRole };
})();

/* ===== engine/reference.mjs ===== */
const __m_engine_reference_mjs = (() => {
const { field, notesOn, degAgainst } = __m_engine_field_mjs;
const { parseChord } = __m_engine_chord_mjs;
const { stackRole } = __m_engine_role_mjs;
/* reference.mjs — THE REFERENCE TONE, fretted and named (Multetudes child 5).
 *
 * v0.9's placeBass, re-derived (read at line 712, not guessed), with the
 * 08-23 ruling enforced structurally: THE REFERENCE IS A REAL FRETTED NOTE —
 * string, fret, midi — chosen against the frame, never a silent pedal. The
 * carried note-events.mjs still EXEMPTS its bass from the real-string
 * assertion (G11, priced with the release republish; a register entry
 * watches it since 261001); this module is the Route-B answer — its
 * reference is a real fretted note WHEREVER A REFERENCE STRING IS FREE.
 * AMENDED 261001 (night 37; ruled by Daniel 260929 and 261001 on night
 * 36's render): when strings 5 and 6 are both in the set the reference is
 * OFFERED UNFRETTED — a named offer, not a refusal and not a chosen pedal
 * (a fixed reference is centreDegreeOf's `fixed` source, 260914, and is
 * not built twice here). The offer carries the degree the relative rule
 * derives and the name the field spells; it claims no string and so
 * asserts no fret. The neck draws it with the reference's OWN mark,
 * unchanged, moved into the gutter below the strings left of the nut —
 * above the nut it reads as §2.3's open-string glyph. It is drawn and
 * named; whether it SOUNDS is the register entry's business (the
 * stringless bass is exactly G11's exemption).
 *
 * THE THREE RELATIVE OPTIONS ONLY (ruled for 260831): the root, a 3rd below,
 * a 5th below — offsets in SCALE STEPS from the chord degree (a 3rd below is
 * two degrees down, a 5th below four; degree arithmetic, not pitch tables).
 * A FIXED reference is deliberately unbuilt: with one bar, fixed and relative
 * are indistinguishable — the distinction only exists once the chords change,
 * which is child 7's progression.
 *
 * PLACEMENT (rewritten 260918, night 24 item 3 — Daniel: "the bass note
 * shown on the fretboard should be the closest one available"): NEARNESS
 * GOVERNS. The candidates are every occurrence of the target degree on EVERY
 * free reference string (6 and 5 — a string in the set is not free); the one
 * nearest the window's centre wins, and string 6 is only the TIEBREAK when
 * two occurrences are equally near — so no placement that was already the
 * nearest moves. Before tonight the string was decided FIRST by fixed
 * priority ("6 if free, else 5") and nearness was applied to the fret
 * inside that one string, which put the reference at fret 11 on string 6
 * while fret 6 on string 5 sat inside the box. Both reference strings in
 * the set → REFUSED BY NAME, a fact the face must say, not an empty board.
 * Outside the window the placement is a STRETCH — a real reach past the
 * box, carried as a flag (full colour, unmarked, per the ruling — the flag
 * is for prose, not for a badge) — and under the nearest law the flag means
 * what it says.
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



const mod12 = (x) => ((x % 12) + 12) % 12;
const mod7 = (x) => ((x % 7) + 7) % 7;

/** scale-step offsets below the chord degree — degree arithmetic (§ above) */
const REF_OFFSET = { root: 0, third: -2, fifth: -4 };

/**
 * placeReference(kind, chordDeg, fld, strings, pos) →
 *   { note: {string,fret,midi,deg,keyDeg} | null, stretch, reason }
 * kind "none" → note null, reason null (a block, not an error).
 * Both reference strings taken → note null, reason NAMES the refusal.
 */
/** the ruled trio + none (child 5, 260831) — stated ONCE; both faces that
 * offer the reference (Harmony's select and the under-neck view, 260913)
 * fill from this list rather than keeping their own copies. */
/** THE CENTRE'S SOURCE (260914 — completing the 260831 ruling, whose own
 * words deferred this: "A FIXED reference is deliberately unbuilt: with
 * one bar, fixed and relative are indistinguishable — the distinction
 * only exists once the chords change, which is child 7's progression."
 * Child 7 landed 260901; this is the unbuilt half, twelve days due).
 * A single global centre under a moving progression is contradictory by
 * construction, so the centre is a CHOICE OF SOURCE, derived per bar:
 *   "fixed"   — a pedal: one chosen degree, the chords pass over it;
 *   "follows" — each bar re-centres on its own chord's root degree.
 * Returns the key-space degree, or null when a bar cannot supply one (an
 * off-key root under "follows") — callers refuse by name, never guess. */
const centreDegreeOf = (source, fixedRef, barDegree) =>
  source === "follows"
    ? (Number.isInteger(barDegree) && barDegree >= 0 ? barDegree : null)
    : (fixedRef ?? 0);

/** the WINDOW IS A POSITION and must not jump per bar (the ratified
 * window law) — so under "follows" the MATERIAL (window, pool, selection)
 * anchors in key space and only the READING re-derives per bar: degree
 * labels, colours and figure addressing shift by the bar's centre. Both
 * derivations, stated once. */
const centreMaterialRef = (source, fixedRef) =>
  source === "follows" ? 0 : (fixedRef ?? 0);
const reRead = (notes, shift) =>
  shift ? notes.map((n) => ({ ...n, deg: (((n.deg - shift) % 7) + 7) % 7 })) : notes;

const CENTRE_SOURCES = [
  ["fixed", "a pedal"],
  ["follows", "follows the changes"],
];

const REFERENCE_CHOICES = [
  ["none", "none"],
  ["root", "the root"],
  ["third", "a 3rd below"],
  ["fifth", "a 5th below"],
];

/* THE BASS IS CHOSEN FROM THE TONES THE OBJECT HOLDS (260917, night 22
 * item 3 — Daniel: "the bass tone could always be the root, we should
 * always default to the root, and if the user wants to select something
 * else then that should be possible"). A chord TONE in the bass is the kind
 * `tone:<degree>` — its offset is degree arithmetic like the relative ones
 * (the 3rd is +2 scale steps, the 7th +6, the 9 wraps to +1), never a
 * table — and the offered list is derived from the CURRENT PICK (item 1):
 * a tone not selected is not offerable. The two relative options (a 3rd
 * below, a 5th below) STAY, explained on the face rather than removed. */
const refOffsetOf = (kind) =>
  kind in REF_OFFSET ? REF_OFFSET[kind]
  : /^tone:\d+$/.test(String(kind)) ? mod7(Number(String(kind).slice(5)) - 1) : null;
const degreeWord = (d) => d + ({ 3: "rd" }[d] || "th");
function referenceChoicesFor(pick) {
  const tones = (Array.isArray(pick) ? pick : []).filter((d) => d !== 1);
  return [
    ["none", "none"],
    ["root", "the root"],
    ...tones.map((d) => ["tone:" + d, `the ${degreeWord(d)} in the bass`]),
    ["third", "a 3rd below"],
    ["fifth", "a 5th below"],
  ];
}

/** THE SOUNDED BASS (night 57 — Daniel's ruling 261006, dispatched 261012): the reference tone and
 * the sounded bass were always two things, and this module held both in one field. The reference
 * (placeReference) is FRETTED, DRAWN and CHORD-NAMING, so it is not always offerable. A bass that
 * SOUNDS needs none of that: a pitch class by the same degree arithmetic (refOffsetOf — the root, a
 * 3rd below, a 5th below, a chord tone the pick holds), NO string, never drawn, names nothing, and
 * offerable on ANY set — the six-string set included. Where it sits is the walk's business
 * (voices.mjs bassSeat, below the voicing's lowest note); this answers only WHICH pitch class.
 * `unfretted: true` is the flag G11's exemption narrows to (note-events.mjs): a bass with no string
 * says so. The same pick guard as the reference: a tone the pick no longer holds is refused by name. */
function soundedBass(kind, chordDeg, fld, pick) {
  if (kind === "none" || kind == null) return { none: true };
  if (Array.isArray(pick) && /^tone:/.test(String(kind))) {
    const d = Number(String(kind).slice(5));
    if (!pick.includes(d))
      return { reason: `the sounded bass names the ${degreeWord(d)}, which the chosen tones do not hold — pick it, or choose another bass` };
  }
  const off = refOffsetOf(kind);
  if (off === null) throw new Error(`soundedBass: "${kind}" is not one of the bass choices`);
  if (!Number.isInteger(chordDeg) || chordDeg < 0 || chordDeg > 6)
    throw new Error(`soundedBass: chordDeg 0..6, not ${chordDeg}`);
  const keyDeg = mod7(chordDeg + off);
  return { keyDeg, pc: fld.pcs[keyDeg], name: fld.notes[keyDeg].name, unfretted: true };
}
/** the sounded bass's vocabulary IS the reference's (rule 6: one list) */
const soundedChoicesFor = referenceChoicesFor;

function placeReference(kind, chordDeg, fld, strings, pos, pick) {
  if (kind === "none" || kind == null) return { note: null, stretch: false, reason: null };
  const off = refOffsetOf(kind);
  if (off === null)
    throw new Error(`placeReference: "${kind}" is not a reference this engine knows`);
  /* a chord TONE in the bass must be among the CHOSEN tones (item 3 reads
   * item 1): a pick that no longer holds it refuses BY NAME here — the one
   * derivation every board and the walk share, so what sounds is what is
   * drawn. `pick` absent (a scale, or a caller with no pick) applies no
   * guard. CC-1: the state is never switched under the player; the face
   * says why the bass is silent. */
  if (Array.isArray(pick) && /^tone:/.test(String(kind))) {
    const d = Number(String(kind).slice(5));
    if (!pick.includes(d))
      return { note: null, stretch: false,
        reason: `the bass names the ${degreeWord(d)}, which the chosen tones do not hold — pick it, or choose another bass` };
  }
  if (!Number.isInteger(chordDeg) || chordDeg < 0 || chordDeg > 6)
    throw new Error(`placeReference: chordDeg 0..6, not ${chordDeg}`);
  const free = [6, 5].filter((s) => !strings.includes(s));
  const keyDeg = mod7(chordDeg + off);
  if (!free.length) {
    /* THE UNFRETTED OFFER (261001): both reference strings in the set is a
     * fact the face says BY NAME — and the reference still exists as a
     * degree, so it is offered unfretted rather than refused. `note` stays
     * null: nothing here is a fretted note, and every caller that draws or
     * sounds a fretted note keeps reading `note`. */
    const name = fld.notes[keyDeg].name;
    return { note: null, stretch: false,
      offer: { keyDeg, deg: degAgainst(keyDeg, fld.ref ?? 0), name, unfretted: true },
      reason: `strings 5 and 6 are both in the set — ${name} has nowhere to sit, so it is offered unfretted` };
  }
  /* NEARNESS GOVERNS (260918): every occurrence on every free string, the
   * nearest to the window's centre first; string 6 breaks a tie */
  const cands = free.flatMap((bs) => notesOn(bs, fld).filter((n) => n.keyDeg === keyDeg));
  if (!cands.length)
    return { note: null, stretch: false,
      reason: `that reference tone is not on string${free.length > 1 ? "s" : ""} ${free.join(" or ")}` };
  cands.sort((a, b) => (Math.abs(a.fret - pos.centre) - Math.abs(b.fret - pos.centre)) || (b.string - a.string));
  const note = { ...cands[0] };
  // A REAL FRETTED NOTE, asserted — the exemption this module refuses to inherit
  if (!free.includes(note.string) || !Number.isInteger(note.fret) || note.fret < 0
      || note.midi !== fld.opens[note.string] + note.fret)   // the field's opens (night 44)
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
  /* EVERY SLOT SPELLED BY stackRole (night 71, ruling 261028 — an interval does not name a chord role; the stack
   * position does): the third, the fifth and the seventh are named by the slot they fill, and the 6-semitone tone
   * over a perfect fifth is the ELEVENTH slot's — so the symbol and the chip row read one speller. */
  const third = has(4) ? stackRole(3, 4) : has(3) ? stackRole(3, 3) : null;
  // 6 is the b5 only when no perfect fifth claims the slot; over one it is #11
  const fifth = has(7) ? stackRole(5, 7) : has(6) ? stackRole(5, 6) : has(8) ? stackRole(5, 8) : null;
  const seventh = has(11) ? stackRole(7, 11) : has(10) ? stackRole(7, 10) : null;
  const nine = has(2), eleven = has(5), thirteen = has(9);

  let base;
  if (seventh === "7") {
    base = third === "b3" ? (nine ? "mMaj7add9" : "mMaj7")
      : nine ? "maj9" : "maj7";
  } else if (seventh === "b7") {
    if (third === "b3") base = thirteen ? "m13" : eleven ? "m11" : nine ? "m9" : "m7";
    else if (third === null && eleven) base = nine ? "9sus4" : "7sus4";
    else base = thirteen ? "13" : eleven ? "11" : nine ? "9" : "7";
  } else if (third === null && !thirteen) {
    // no third, no seventh: the suspensions own these shapes
    if (nine && fifth === "5" && !eleven) base = "sus2";
    else if (eleven && fifth === "5" && !nine) base = "sus4";
    else return null;
  } else if (third !== null) {
    if (thirteen && fifth === "5") base = third === "b3" ? "m6" : "6";
    else if (thirteen && fifth === "b5" && third === "b3") base = "dim7";
    else base = third === "b3" ? (fifth === "b5" ? "dim" : "m")
      : fifth === "#5" ? "aug" : "";
    if (nine && !seventh && base !== "dim7") base += "add9";
  } else return null;

  // the altered/absent slots, said out loud in the symbol
  if (fifth === "b5" && !["dim", "dim7"].includes(base.replace("add9", ""))) base += fifth;
  if (fifth === "#5" && base !== "aug") base += fifth;
  if (fifth === "5" && has(6)) base += stackRole(11, 6);
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
function compositeOver(fld, refKeyDeg, tonePcs) {
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
  /* ASSERTION REWRITTEN 260918 (item 3, rule 7): it used to demand string 6.
   * Under the nearest law the G a 3rd below B♭ is fret 10 on string 5 from
   * centre 6.67 (3.33 away) — string 6's fret 3 is 3.67 away, and the old
   * law had put it there. The claim now: a free string, the nearest
   * occurrence of all, DERIVED here rather than named. */
  if (!third.note || ![6, 5].includes(third.note.string))
    throw new Error("reference: a 3rd below the B♭ chord must fret on a free reference string");
  if (fld.pcs[third.note.keyDeg] !== 7)
    throw new Error("reference: a 3rd below B♭ is G");
  {
    const all = [6, 5].flatMap((s) => notesOn(s, fld).filter((n) => n.keyDeg === third.note.keyDeg));
    const nearest = Math.min(...all.map((n) => Math.abs(n.fret - pos.centre)));
    if (Math.abs(third.note.fret - pos.centre) !== nearest)
      throw new Error("reference: the placed G is not the nearest G on the free strings");
  }
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

  // a placement outside the window is a stretch, said as a flag.
  // PROBE MOVED 260918 (item 3): the old window 0–3 was a stretch only under
  // the string-first law (string 6's B♭ at fret 6); under the nearest law
  // string 5's B♭ at fret 1 sits INSIDE it. A window at 8–9 has no B♭ on
  // either free string inside it (6 on string 6, 1 and 13 on string 5).
  const far = placeReference("root", 0, fld, [4, 3, 2, 1], { fLo: 8, fHi: 9, centre: 8.5 });
  if (!far.note || far.stretch !== true || (far.note.fret >= 8 && far.note.fret <= 9))
    throw new Error("reference: a reach past the box must carry the stretch flag");
}
return { REF_OFFSET, centreDegreeOf, centreMaterialRef, reRead, CENTRE_SOURCES, REFERENCE_CHOICES, refOffsetOf, referenceChoicesFor, soundedBass, soundedChoicesFor, placeReference, compositeOver };
})();

/* ===== engine/progression.mjs ===== */
const __m_engine_progression_mjs = (() => {
const { CYCLES } = __m_engine_tetrad_sequence_mjs;
const { resolveStructure } = __m_engine_structures_mjs;
const { parseChord, resolveRoman, spellRole } = __m_engine_chord_mjs;
const { parseAtchart, serializeAtchart } = __m_engine_atchart_mjs;
const { diatonicTones, objectTones, fieldPartition, objectOffsets } = __m_engine_selection_mjs;
const { compositeOver } = __m_engine_reference_mjs;
/* progression.mjs — THE PROGRESSION (Multetudes child 7): three sources —
 * cycle · form · custom — derived into one shape every board can walk.
 *
 * THE BAR COUNT IS DERIVED, NEVER SET (PRD §2.7). A cycle's length is the
 * walk itself: step through the seven degrees until home returns, plus the
 * bar that lands home. Seven is prime, so every step 1–5 visits all seven —
 * eight bars — but the code WALKS rather than knowing that: the count comes
 * out of the loop, and the load assertion checks the walk visited every
 * degree exactly once (home twice, at both ends). Setting the count by hand
 * only ever padded the tail with duplicates; there is no bar-count input
 * anywhere in this module's shape.
 *
 * A FORM IS A DEGREE PATTERN WITH QUALITIES (structures.mjs — the module
 * name stays `structures`; "form" is the surface's word and PRD §2.7 is the
 * written reason). Resolution is resolveRoman's pitch-class math; nothing
 * here or there holds a typed chord table, and structures' own grep test
 * asserts it. THE CASE RULE IS LOAD-BEARING: ii7 is a MINOR seventh — the
 * absolute sentence "ii–V–I in B♭ is Cm7 F7 B♭maj7" is asserted in this
 * module's tests against the strings themselves, not against resolveRoman
 * (which would be circular).
 *
 * A FORM KEEPS ITS OWN BARS. v0.9 flattened a structure's chords and
 * regrouped them by the metronome split, which loses the form's own bar
 * structure (| Cm7 F7 | is one bar, and the chart format records that
 * fact explicitly). The door keeps the grouping — the chart round trip
 * (§8: the file is the only handoff channel) is byte-clean only because it
 * does. Registered divergence; the split then divides a bar's beats among
 * its chords instead of regrouping them (beatsOf).
 *
 * CUSTOM IS TYPED CHANGES — parseChord's UI at last (G28). Romans resolve
 * through resolveRoman (the case rule again); symbols parse through
 * parseChord; a line with `|` is a CHART LINE and parses through
 * parseAtchart itself — the same engine that reads the file — which is what
 * makes the palette → note → progression round trip byte-clean rather than
 * nearly-clean. A token neither path accepts is REFUSED BY NAME: the error
 * is a value carrying the token, never a silent drop (v0.9 dropped bad
 * tokens silently — improved, registered).
 *
 * Pure: no DOM, no globals, load-time structural assertions.
 */






const mod7 = (x) => ((x % 7) + 7) % 7;
const mod12 = (x) => ((x % 12) + 12) % 12;

/** the derived walk: home, every degree the step visits, home again.
 * The COUNT is an output — nothing here says "eight". */
function cycleDegreesWalk(cycle, start = 0) {
  const c = CYCLES[cycle];
  if (!c) throw new Error(`progression: unknown cycle "${cycle}" — the named ones are ${Object.keys(CYCLES).join(", ")}`);
  if (!Number.isInteger(start) || start < 0 || start > 6)
    throw new Error(`progression: start is a degree 0..6, not ${start}`);
  const seq = [start];
  let d = mod7(start + c.step);
  while (d !== start) {
    seq.push(d);
    if (seq.length > 7)
      throw new Error(`progression: the ${cycle} walk did not come home in seven moves — ` +
        "the derived bar count is broken and the arithmetic must be looked at, not padded");
    d = mod7(d + c.step);
  }
  seq.push(start);                                 // the bar that lands home
  // derived, then asserted: every degree once, home twice at the ends
  const counts = new Array(7).fill(0);
  for (const x of seq) counts[x]++;
  if (counts[start] !== 2 || counts.some((n, i) => i !== start && n !== 1))
    throw new Error(`progression: the ${cycle} walk from ${start} is not one visit per degree`);
  return seq;
}

/**
 * progressionOf({source, cycle, form, custom, start}, key, scale) →
 *   { chords, bars, err }
 *   chords  flat: {kind:"diatonic", degree} | {kind:"abs", symbol, parsed}
 *   bars    grouping: arrays of indices into chords
 *   err     null, or the refusal BY NAME (the fallback bars still stand, so
 *           a board never crashes on a half-typed line — but the face says)
 */
function progressionOf(cfg, key, scale = "major") {
  const src = (cfg && cfg.source) || "cycle";
  const fallback = () => {
    const chords = [{ kind: "diatonic", degree: 0 }];
    return { chords, bars: [[0]] };
  };
  try {
    if (src === "cycle") {
      const seq = cycleDegreesWalk(cfg.cycle || "fourths", cfg.start ?? 0);
      return { chords: seq.map((degree) => ({ kind: "diatonic", degree })),
        bars: seq.map((_, i) => [i]), err: null };
    }
    if (src === "form") {
      const st = resolveStructure(cfg.form || "ii-V-I", key);
      const chords = [], bars = [];
      for (const bar of st.bars) {
        const b = [];
        for (const symbol of bar) {
          b.push(chords.length);
          chords.push({ kind: "abs", symbol, parsed: parseChord(symbol) });
        }
        bars.push(b);
      }
      return { chords, bars, err: null };
    }
    if (src === "custom") {
      const text = String(cfg.custom || "").trim();
      if (!text) return { ...fallback(), err: null };     // empty is a block, not an error
      if (text.includes("|")) {
        // THE CHART CHANNEL: the very parser that reads the file reads this
        const at = parseAtchart("---\natchart: 1\n---\n```chart\n" + text + "\n```\n");
        const chords = [], bars = [];
        for (const sec of at.sections)
          for (const bar of sec.bars) {
            const b = [];
            for (const ch of bar.chords) {
              b.push(chords.length);
              chords.push({ kind: "abs", symbol: ch.symbol, parsed: ch.parsed });
            }
            bars.push(b);
          }
        if (!chords.length) throw new Error("the chart line holds no chords");
        return { chords, bars, err: null };
      }
      const toks = text.split(/[\s,]+/).filter(Boolean);
      const chords = [];
      for (const tok of toks) {
        const r = resolveRoman(tok, key, scale);
        if (r) { chords.push({ kind: "abs", symbol: r.symbol, parsed: r.parsed }); continue; }
        try { chords.push({ kind: "abs", symbol: parseChord(tok).symbol, parsed: parseChord(tok) }); }
        catch (e) {
          // REFUSED BY NAME — the token travels in the error (v0.9 dropped it silently)
          return { ...fallback(),
            err: `"${tok}" is neither a roman numeral nor a chord symbol — ${String(e.message || e)}` };
        }
      }
      return { chords, bars: chords.map((_, i) => [i]), err: null };
    }
    throw new Error(`unknown progression source "${src}"`);
  } catch (e) {
    return { ...fallback(), err: String(e.message || e) };
  }
}

/** beats per chord — ONE LAW (Daniel, 261010 — "everything plays at 2+2 no matter [what] is set"):
 *   - a SPLIT (an array): every chord takes the NEXT SLOT of the split, and the cycle carries across bars.
 *     The split sets the harmonic rhythm: under 4 a two-chord bar's chords each sound a whole bar, under
 *     1+1+1+1 each sounds a beat. Until 261010 this held only for one-chord bars (and for a bar whose chord
 *     count equalled the slot count); every other bar fell through to the even division, so on ii–V–I and
 *     every turnaround the control did nothing you could hear.
 *   - AS CHARTED ("chart", and null — a mirror that has not heard the split yet): the chart's own barring —
 *     a bar's chords divide its meter evenly, remainder to the front; an integer partition summing to the meter.
 * The chart's bar GROUPING stays notation either way (register 14): the boards draw the chart's bars.
 * A pass whose slots do not end on a bar line wraps where the chords run out — never padded. */
/** the split's stored word for the chart's own barring (261010) — meter-independent, never null, never [4] */
const AS_CHARTED = "chart";
function beatsOf(bars, meter = 4, split = null) {
  const out = [];
  if (Array.isArray(split) && split.length) {
    if (!split.every((b) => Number.isInteger(b) && b > 0))
      throw new Error("progression: a split's slots must be whole beats — [" + split.join(",") + "]");
    let slot = 0;                  // the split cycle, walked across every chord of every bar
    for (const bar of bars) out.push(bar.map(() => split[slot++ % split.length]));
    return out;
  }
  if (split != null && split !== AS_CHARTED)
    throw new Error(`progression: the split is a slot list or "${AS_CHARTED}" — got ${JSON.stringify(split)}`);
  for (const bar of bars) {
    const n = bar.length;
    const base = Math.floor(meter / n), extra = meter - base * n;
    const beats = bar.map((_, i) => base + (i < extra ? 1 : 0));
    if (beats.reduce((a, b) => a + b, 0) !== meter)
      throw new Error("progression: a bar's beats must sum to the meter");
    out.push(beats);
  }
  return out;
}

/**
 * walkSchedule(sel, order, beats, bpm, opts) → { events: [{midi, at}], span }
 * — THE TIME DIMENSION (260902, Daniel's headline finding: the figure never
 * reached the sound). Everything derived, no magic milliseconds:
 *   span         = beats × 60/bpm seconds — the chord's own duration;
 *   figure typed (order) — IT SEQUENCES, WHATEVER THE TAKE: step k sounds at
 *                  k · span/steps. The steps divide the chord's own span
 *                  evenly and never spill into the next chord;
 *   no figure    — a VOICING (spread=false) sounds together at 0; an
 *                  ARPEGGIO or a scale (spread=true) sounds low → high
 *                  across the span, the run the take already implies;
 *   opts.refMidi — the fretted reference, under the chord, at 0.
 *   opts.soundedMidi — the SOUNDED BASS (night 57): a pitch with no string, at 0, wearing the
 *                  bass role and the `unfretted: true` flag; not doubled when it is the
 *                  reference's own pitch (a saved étude's reference keeps meaning what it meant).
 * Nothing truncates: any number of steps subdivides the span (the report
 * states why the "more steps than the span can carry" case cannot arise
 * under even subdivision). Every schedule is asserted before it is returned:
 * times ascending within [0, span), the event count equal to the material's.
 */
function walkSchedule(sel, order, beats, bpm, { spread = false, refMidi = null, soundedMidi = null, carry = false } = {}) {
  if (!(beats > 0) || !(bpm > 0))
    throw new Error("walkSchedule: beats and bpm must be positive — the span is derived from them");
  const span = beats * 60 / bpm;
  const seq = order && order.length ? order
    : spread ? [...sel].sort((a, b) => a.midi - b.midi)
    : sel;
  const together = !(order && order.length) && !spread;
  const step = seq.length > 1 && !together ? span / seq.length : 0;
  /* a step may be a GROUP (261009, motion-grammar §11): an array of notes sounding together —
   * one onset, one step of the subdivision, no roll */
  /* `carry` (261014, the étude timeline): each note's string, fret and musical role ride along as `string`, `fret`,
   * `tone` — opt-in, so the bus's NOTE events (built from midi and the bass role) are unchanged */
  const events = seq.flatMap((st, k) => (Array.isArray(st) ? st : [st]).map((nt) => (carry
    ? { midi: nt.midi, at: together ? 0 : k * step, string: nt.string, fret: nt.fret, tone: nt.role }
    : { midi: nt.midi, at: together ? 0 : k * step })));
  /* the reference carries its ROLE (260906): it is the bass line's note, and
   * whoever realises audio may route it to the bass bus — the additive-field
   * precedent (STEP_CHANGED's attack) followed for NOTE */
  const sounded = soundedMidi != null && soundedMidi !== refMidi;   // the same pitch sounds once
  if (sounded) events.unshift({ midi: soundedMidi, at: 0, role: "bass", unfretted: true });
  if (refMidi != null) events.unshift({ midi: refMidi, at: 0, role: "bass" });
  for (let i = 1; i < events.length; i++)
    if (events[i].at < events[i - 1].at)
      throw new Error("walkSchedule: the schedule must ascend — time only runs forward");
  for (const e of events)
    if (e.at < 0 || e.at >= span - 1e-9)
      throw new Error("walkSchedule: a step left the chord's span — steps never spill into the next chord " +
        "(a step AT the span is the next chord's downbeat, which is spilling)");
  const expected = seq.reduce((t, st) => t + (Array.isArray(st) ? st.length : 1), 0) + (refMidi != null ? 1 : 0) + (sounded ? 1 : 0);
  if (events.length !== expected)
    throw new Error("walkSchedule: an event went missing — the schedule must carry every note it was given");
  return { events, span };
}

/** LEGACY WORDS (260913 rename, the PO's ruling — a block IS a strum):
 * Multetudes v0.1.0 saved études carry movement "block"/"arpeggio"; this
 * map is the one place the old words are known, applied where a config
 * merges in. */
const movementWord = (w) =>
  ({ block: "strum", arpeggio: "arpeggiate" })[w] || w;

/** the canonical chart body for a progression's bars — THROUGH the format
 * engine, so reading a palette-written chart and re-serialising it is a
 * byte fixed point (asserted in the tests, demanded by §8). */
function chartBodyOf(chords, bars, fld) {
  const sym = (ci) => {
    const c = chords[ci];
    if (c.kind === "abs") return c.symbol;
    throw new Error("progression: a diatonic bar has no absolute symbol without a naming field");
  };
  const raw = "| " + bars.map((b) => b.map(sym).join(" ")).join(" | ") + " |";
  const doc = "---\natchart: 1\n---\n```chart\n" + raw + "\n```\n";
  const out = serializeAtchart(parseAtchart(doc));
  return out.slice(out.indexOf("```chart\n") + 9, out.lastIndexOf("\n```"));
}

/**
 * chordAt(prog, index, fld, object, pick) → THE ONE DERIVATION every board
 * shares (last night found the object→offsets fact spelled in five modules;
 * this is the same lesson one level up — the per-bar chord read is derived
 * once, here, and mirrored everywhere):
 *   { kind, degree, rootPc, symbol, roman, tones, absent, offKey }
 *   degree   the chord root's field degree, or -1 (an off-key root)
 *   symbol   the chip's name: the chord's own for a typed one; for a
 *            diatonic bar, compositeOver's read-back name (or the bare root
 *            when no honest suffix reads back)
 *   unnamed  null when the symbol is a real name; otherwise the sentence
 *            the face must say (ruled 260915: a silent bare root tells a
 *            player their 13th is a plain triad — the refusal is named,
 *            reference.mjs's own honestly-unnamed idiom)
 *   roman    the analysis line — v0.9's rule: lower case when the third is
 *            minor, ° when diminished, "—" when the root is off the key
 *   tones    the object's PLAYABLE tones ({role,pc}; off-key ones removed)
 *   absent   slots the CHORD cannot fill, by role (the coreTetrad lesson)
 *   offKey   tones the KEY cannot carry, by role — a different absence from
 *            not-in-this-frame, which only the window can report
 * A scale object carries no chord: tones null, the symbol is the bar root's
 * name, and the boards keep their scale path.
 */
function chordAt(prog, index, fld, object, pick) {   // pick: tonePick(cfg) — degrees, or null for the object's default (260917, item 1)
  if (!prog || !Array.isArray(prog.chords) || !prog.chords.length)
    throw new Error("chordAt: no progression");
  const c = prog.chords[((index % prog.chords.length) + prog.chords.length) % prog.chords.length];
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
  const romanOf = (degree, pcs) => {
    if (degree < 0) return "—";
    const third = mod12(pcs[1] - pcs[0]), fifth = pcs.length > 2 ? mod12(pcs[2] - pcs[0]) : 7;
    const base = ROMAN[degree];
    /* THE ROMAN NAMES THE TRIAD (261008c): case for the third, and the FIFTH read on its own —
     * ° diminished, + augmented, nothing perfect. Until tonight the ° came only under a minor
     * third and the + never, so harmonic and melodic minor's third degree (Ebmaj7#5) read "III". */
    return (third === 3 ? base.toLowerCase() : base) + (fifth === 6 ? "°" : fifth === 8 ? "+" : "");
  };
  if (c.kind === "diatonic") {
    const degree = c.degree, rootPc = fld.pcs[degree];
    if (object === "scale")
      return { kind: c.kind, degree, rootPc, symbol: fld.notes[degree].name,
        roman: ROMAN[degree], tones: null, absent: [], offKey: [] };
    const tones = diatonicTones(fld, degree, objectOffsets(object, pick));
    const named = compositeOver(fld, degree, tones.map((t) => t.pc));
    // the analysis line reads the DEGREE's own triad — a dyad on ii is still ii
    const tri = diatonicTones(fld, degree, objectOffsets("triad")).map((t) => t.pc);
    return { kind: c.kind, degree, rootPc,
      symbol: named.name || named.bassName,
      unnamed: named.name ? null
        : `${named.bassName} is the root, not the name — this ${object}'s `
          + "stack reads back no taught symbol (honestly unnamed; the "
          + "naming pass owes the words)",
      roman: romanOf(degree, tri),
      tones, absent: [], offKey: [] };
  }
  const rootPc = c.parsed.root.pc, degree = fld.pcs.indexOf(mod12(rootPc));
  if (object === "scale")
    return { kind: c.kind, degree, rootPc, symbol: c.parsed.root.name,
      roman: degree < 0 ? "—" : ROMAN[degree], tones: null, absent: [], offKey: [] };
  const ot = objectTones(c.parsed, object, pick);
  const part = fieldPartition(ot.tones, fld);
  /* ROLE A (night 46, §2.6's material clause): the chord's offKey tones are MEMBERS of the chord —
   * they ride in `tones` flagged offKey (the placers take them from the chord's own supply), and
   * `offKey` still lists their roles for the sentence the boards owe */
  /* THE KEY DEGREE, AS A CYCLE'S TONES CARRY IT (night 84 — "a custom chart shows no chord roles"): an in-key tone's
   * index in the key's scale, derived from the field the same way diatonicTones' is. Without it the chip row (which
   * labels a chip by its tone's keyDeg) went blank on every form and custom chart. An off-key tone has no chip and
   * carries none. */
  return { kind: c.kind, degree, rootPc, symbol: c.symbol,
    roman: romanOf(degree, c.parsed.pcs),
    tones: [...part.inKey.map((t) => ({ ...t, keyDeg: fld.pcs.indexOf(mod12(t.pc)) })),
      ...part.offKey.map((t) => ({ ...t, offKey: true, name: spellRole(c.parsed.root.name, t.role, t.pc) }))], absent: ot.absent, offKey: part.offKey.map((t) => t.role) };
}

/* ---------------- load-time structural assertions (golden rule 1) ---------------- */

{
  // every cycle's walk comes home in eight bars — the count DERIVED, here
  // merely witnessed (and the witness would catch a broken step table)
  for (const cy of Object.keys(CYCLES)) {
    const seq = cycleDegreesWalk(cy, 0);
    if (seq.length !== 8)
      throw new Error(`progression: the ${cy} walk derived ${seq.length} bars — expected the seven degrees plus home`);
  }
  // the case rule, absolutely: ii–V–I in B♭ IS Cm7 F7 B♭maj7 — the minor
  // seventh, never the dominant. Asserted against the strings themselves.
  const p = progressionOf({ source: "form", form: "ii-V-I" }, "Bb");
  const line = p.chords.map((c) => c.symbol).join(" ");
  if (line !== "Cm7 F7 Bbmaj7")
    throw new Error(`progression: ii–V–I in Bb must be "Cm7 F7 Bbmaj7", not "${line}" — the numeral's case names the quality`);
  if (p.bars.length !== 2 || p.bars[0].length !== 2)
    throw new Error("progression: ii–V–I keeps its own bars — | Cm7 F7 | Bbmaj7 |");
  // a bad custom token refuses BY NAME, and the fallback keeps a board alive
  const bad = progressionOf({ source: "custom", custom: "Cm7 Qx7" }, "Bb");
  if (!bad.err || !bad.err.includes('"Qx7"') || bad.chords.length !== 1)
    throw new Error("progression: a bad token must refuse by name and fall back to the tonic bar");
}
return { cycleDegreesWalk, progressionOf, AS_CHARTED, beatsOf, walkSchedule, movementWord, chartBodyOf, chordAt };
})();

/* ===== engine/note-events.mjs ===== */
const __m_engine_note_events_mjs = (() => {
/* note-events.mjs — the note-event producer (component v1).
 *
 * Roadmap §1.4's keystone: one event list per chord, consumed identically by
 * the fretboard, score, keyboard and audio — the same figure must not be able
 * to sound one way and print another. Pure timing/pitch math, no DOM, no
 * audio, no globals; apps bind it themselves.
 *
 * Event shape (the family's shared drill-layer vocabulary — Tetradetudes and
 * Substitute Teacher inherit this):
 *
 *   { midi, string, fret, role: "chord" | "approach" | "bass", slot, onset, dur }
 *
 * - role is what makes an approach tone expressible (the grammar's consumer);
 * - slot is the STORED INVARIANT of the relative-state doctrine, carried from
 *   the voicing note (index into the set, 0 = lowest-pitched string); string
 *   and fret are the derived coordinate;
 * - onset/dur are seconds from the chord attack — the single source of the
 *   subdivision arithmetic the renderers used to compute independently.
 *
 * Grew out of Triadetudes' arpOnsets (v0.6.5, the sounding-note pulse), whose
 * scheduling numbers are pinned by an equivalence oracle: block strums stagger
 * 28 ms at 0.85 s; sequenced events divide the chord span evenly with a
 * legato tail of min(0.9, step × 1.6); the bass is a 1.0 s pedal at the
 * attack. Grown, not rewritten — the pin still passes.
 */

function noteEvents(voicing, order, bassMidi, durBeats, bpm) {
  // voicing: {notes:[{string,fret,midi,slot}]} — order: the sounding sequence
  // as an array of the voicing's own notes (identity, not lookup), or null
  // for a block strum of the whole voicing.
  const out = [];
  /* G11, NARROWED (night 57 — the register's own `then`): the pedal is the one legitimately
   * stringless event, and it SAYS SO — `unfretted: true` is the flag the real-string assertion
   * below reads; a stringless event without it is refused by name, as every chord event is */
  if (bassMidi !== null && bassMidi !== undefined)
    out.push({ midi: bassMidi, string: null, fret: null, role: "bass",
      slot: null, onset: 0, dur: 1.0, unfretted: true });
  const seq = order || voicing.notes;
  for (const n of seq)
    if (n.role === undefined && !voicing.notes.includes(n))
      throw new Error("noteEvents: ordered note is not one of the voicing's notes");
    // untagged orders are the legacy voicing-note paths and must be identity;
    // role-tagged entries come from the motion resolver, which asserted their
    // pitches, distances and placements before they arrived here
  const span = (durBeats || 2) * (60 / bpm);
  if (!order) {
    seq.forEach((n, k) => out.push({ midi: n.midi, string: n.string, fret: n.fret,
      role: "chord", slot: n.slot ?? null, onset: k * 0.028, dur: 0.85 }));
  } else {
    const step = span / seq.length;
    seq.forEach((n, k) => out.push({ midi: n.midi, string: n.string, fret: n.fret,
      role: n.role ?? "chord", slot: n.slot ?? null, onset: k * step,
      dur: Math.min(0.9, step * 1.6) }));
  }
  // structural assertions — derived, then checked, before anyone consumes it
  for (const e of out)   // the exemption is the FLAG, not the role (night 57)
    if (e.unfretted !== true && (!Number.isInteger(e.string) || e.string < 1 || e.string > 6))
      throw new Error("noteEvents: event carries no real string");
  const chord = out.filter((e) => e.role !== "bass");
  if (chord.length !== seq.length)
    throw new Error("noteEvents: event count != sequence length");
  for (let k = 0; k < chord.length; k++) {
    if (k > 0 && chord[k].onset <= chord[k - 1].onset)
      throw new Error("noteEvents: onsets not strictly increasing");
    if (chord[k].onset < 0 || chord[k].onset >= span)
      throw new Error("noteEvents: onset outside the chord span");
    if (!(chord[k].dur > 0)) throw new Error("noteEvents: non-positive duration");
    if (!Number.isInteger(chord[k].string) || chord[k].string < 1 || chord[k].string > 6)
      throw new Error("noteEvents: event carries no real string");
  }
  return out;
}
return { noteEvents };
})();

/* ===== engine/voices.mjs ===== */
const __m_engine_voices_mjs = (() => {
const { noteEvents } = __m_engine_note_events_mjs;
/* voices.mjs — THE FAMILY'S VOICES, as math rather than as nodes.
 *
 * The hub has never made a sound: `engine/` had no audio at all, and
 * `hub/modules/metronome-card.mjs` is live-but-silent by design. All the
 * working audio in this project lives inline inside the shipped studies. This
 * extracts Triadetudes' — the most developed (voice table, bass voice,
 * Karplus-Strong pluck, the mixer, v0.8.4–v0.8.7) — per §5's principle:
 * *shell from the simplest finished app, engine from the most demanding one.*
 *
 * SAFE TO EXTRACT, checked rather than assumed: `_load-triadetudes.mjs` slices
 * the study at `/* ==== audio ==== *\/` and evaluates only what is ABOVE it.
 * Measured: 4,270 pinned lines, zero `AudioContext`; 2,044 excluded lines below.
 * Everything realised here as nodes comes from the excluded half, so the
 * characterization suite pins none of it.
 *
 * THE SPLIT IS THE ONE `engine/metronome.mjs` ALREADY MODELS: pure, injected
 * time, no `AudioContext` and no `window` down here; the browser API and the
 * markup live in `hub/modules/audio-card.mjs` above.
 *
 * So a voice is described here as DATA — a source, a filter, a gain envelope as
 * an ordered breakpoint list — and the card is a dumb realiser that turns that
 * description into nodes. The consequences are worth naming:
 *
 *   - the envelopes are testable headlessly, which is most of what "does the
 *     audio work" means before you have ears on it;
 *   - the Karplus-Strong string is rendered by pure arithmetic into a
 *     Float32Array, so its decay and determinism are ASSERTED, not hoped;
 *   - a second host (Modus Operandi, a published study) can realise the same
 *     descriptions against its own graph without inheriting this one's.
 *
 * `voiceSchedule` and its two constants sit just ABOVE the study's cut, so they
 * ARE pinned — and this module's copy is asserted against the shipped one over
 * a derived corpus, the same discipline `isolation.mjs` and `drill.mjs` used.
 *
 * THE BUSES ARE NAMED BY ROLE, NOT BY ARITY. The shipped study called the
 * chord bus "triad" because that app plays triads; the four tetrad voices then
 * went to a bus named "triad", which is false one app over. `note-events.mjs`
 * already calls the role `"chord"`, so naming the bus after the role makes it
 * one fact instead of two, and it stays true at any arity.
 *
 * Pure: no DOM, no AudioContext, no globals.
 */

/** equal temperament, A440 — the one pitch fact every voice needs */
const hzOf = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

/* ---------------- the schedule (pinned against the shipped study) ---------------- */

const NOTE_VOICE_NAMES = ["tone", "pluck", "sustain"];

/** the (a)/(b) switch, one word, decided by ear in v0.8.5:
 *  "chord" = hold to the chord change, the triad accumulates;
 *  "slot"  = legato to the next onset, no accumulation. */
const SUSTAIN_HOLD = "chord";

/** Only DUR is voice-dependent — voices CONSUME the event list, they never
 * re-derive it (the v0.6.5 seam). tone keeps every event's own dur, which is
 * the anti-drift baseline; pluck rings to the chord change, capped, because a
 * struck string decays on its own; sustain holds. Harmony-BED events (the
 * short strummed context under a line — `bed` since 260913, when the strum
 * word went to the movement) keep their short dur in every voice, and the
 * bass pedal holds with the sustain voice. */
function voiceSchedule(evs, voice, durBeats, bpm) {
  const span = (durBeats || 2) * (60 / bpm);
  return evs.map((ev, i) => {
    let dur = ev.dur;
    if (!ev.bed) {
      if (voice === "pluck") dur = Math.min(1.1, Math.max(ev.dur, span - ev.onset));
      if (voice === "sustain") {
        if (SUSTAIN_HOLD === "slot" && ev.role !== "bass") {
          const next = evs.slice(i + 1).find((e) => !e.bed && e.role !== "bass" && e.onset > ev.onset);
          dur = (next ? next.onset : span) - ev.onset;
        } else dur = span - ev.onset;
      }
    }
    return { ...ev, dur };
  });
}

/** the events a chord sounds, then scheduled for the chosen voice — the one
 * call a host needs, so no host re-derives onsets (note-events.mjs owns those) */
function chordSchedule(voicing, { order = null, bassMidi = null, durBeats = 2, bpm = 72, voice = "tone" } = {}) {
  return voiceSchedule(noteEvents(voicing, order, bassMidi, durBeats, bpm), voice, durBeats, bpm);
}

/* ---------------- the bass register rule ---------------- */

/** Seat the pedal below the voicing's lowest note, never below `floor`.
 * Verbatim from the shipped orderedMidis, as arithmetic rather than as a
 * function of app state. */
function bassSeat(lowMidi, bassPc, floor = 28) {
  if (!Number.isFinite(lowMidi) || !Number.isFinite(bassPc)) return null;
  let bass = lowMidi - ((((lowMidi - bassPc) % 12) + 12) % 12);
  if (bass >= lowMidi) bass -= 12;
  if (bass < floor) bass += 12;
  return bass;
}

/* ---------------- the Karplus-Strong string, as arithmetic ---------------- */

/** The pluck, rendered SYNCHRONOUSLY into samples: deterministic, no worklet,
 * no async load — which is what keeps the `file://` zero-errors gate honest.
 *
 * The seed is a function of PITCH, so the same note is the same waveform in
 * every session and the test can assert it rather than eyeball it. The 0.996
 * factor is the loss in the feedback path; the two-tap average is the lowpass.
 */
function pluckSamples(midi, sampleRate, seconds = 1.2) {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0)
    throw new Error("pluckSamples: a real sample rate is required");
  const N = Math.max(2, Math.round(sampleRate / hzOf(midi)));
  const len = Math.floor(sampleRate * seconds);
  const out = new Float32Array(len);
  const ring = new Float32Array(N);
  let seed = (midi * 2654435761) >>> 0;          // deterministic per pitch — testable
  for (let i = 0; i < N; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; ring[i] = seed / 2147483648 - 1; }
  let idx = 0;
  for (let i = 0; i < len; i++) {
    const cur = ring[idx], nxt = ring[(idx + 1) % N];
    out[i] = cur;
    ring[idx] = 0.996 * 0.5 * (cur + nxt);        // the lowpass in the feedback path
    idx = (idx + 1) % N;
  }
  return out;
}

/** drawbar-ish partials for the sustain voice; index 0 is DC and stays 0 */
const SUSTAIN_PARTIALS = Object.freeze([0, 1, 0.45, 0.22, 0.10, 0.05]);

/* ---------------- the voices, as descriptions ---------------- */

/* A gain envelope is an ordered list of breakpoints the host applies to a gain
 * node: `set` → setValueAtTime, `linear` → linearRampToValueAtTime, `exp` →
 * exponentialRampToValueAtTime. Describing it rather than building it is what
 * makes it assertable without an AudioContext. */
const env = (kind, at, value) => ({ kind, at, value });

const NOTE_VOICES = {
  tone: {
    bus: "chord", tail: 0.05,
    source: { kind: "osc", type: "triangle" },
    filter: { type: "lowpass", freq: 2200, q: 0.4 },
    envelope: (t, dur, vel) => [
      env("set", t, 0),
      env("linear", t + 0.008, vel),
      env("exp", t + dur, 0.0008),
    ],
  },
  pluck: {
    bus: "chord", tail: 0.02,
    source: { kind: "pluck" },
    filter: { type: "lowpass", freq: 3400, q: 0.2 },
    envelope: (t, dur, vel) => [
      env("set", t, vel * 1.5),
      env("set", t + Math.max(0.01, dur - 0.08), vel * 1.5),
      env("linear", t + dur, 0),
    ],
  },
  sustain: {
    bus: "chord", tail: 0.05,
    source: { kind: "wave", partials: SUSTAIN_PARTIALS },
    filter: { type: "lowpass", freq: 2600, q: 0.3 },
    envelope: (t, dur, vel) => {
      const a = Math.min(0.03, dur * 0.3), r = Math.min(0.09, dur * 0.4);
      return [
        env("set", t, 0),
        env("linear", t + a, vel * 0.85),
        env("set", t + Math.max(a, dur - r), vel * 0.85),
        env("linear", t + dur, 0),
      ];
    },
  },
};

/** A bass of its own (roadmap §2): mellower, darker filter, so the pedal no
 * longer smears into the triads' register. */
const BASS_VOICE = {
  bus: "bass", tail: 0.05,
  source: { kind: "osc", type: "triangle" },
  filter: { type: "lowpass", freq: 520, q: 0.5 },
  envelope: (t, dur, vel) => {
    const r = Math.min(0.12, dur * 0.4);
    return [
      env("set", t, 0),
      env("linear", t + 0.012, vel),
      env("set", t + Math.max(0.012, dur - r), vel),
      env("linear", t + dur, 0),
    ];
  },
};

/* ---------------- the pad: a SEAT and a voice, not a subsystem (night 57) ---------------- */

/** THE PAD'S REGISTER, chosen by measurement (261012, 1,632 one-of-each voicings over 12 keys × 6 sets ×
 * 4 windows × 7 degrees): the guitar's voicings sit lowest 45–61 (p10–p90, median 52) and highest 60–73
 * (median 67); the bass seat sits 35–53 (median 43). Below the guitar is the bass's octave — a pad there
 * doubles the bass; the ONE register neither occupies is above 73. So the pad sits in [74, 86): D5 up to
 * (not including) D6 — clear of 90 % of the guitar's highs and of every bass seat — and its timbre does
 * the rest: fundamentals-heavy partials under a low-pass, a swell in, no attack. "Doesn't sit where the
 * guitar sits" is this number, not a taste. The pad's chord is the bar's harmony seated here — never a
 * voicing anyone plays, never drawn. Daniel's to move; the constant is the one place it lives. */
const PAD_REGISTER = Object.freeze([74, 86]);

/** the pad's notes: each of the chord's pitch classes at its one midi inside PAD_REGISTER, low → high */
function padSeat(pcs) {
  const [lo, hi] = PAD_REGISTER;
  const out = [];
  for (const pc of pcs) {
    if (!Number.isInteger(pc) || pc < 0 || pc > 11) throw new Error(`padSeat: ${pc} is not a pitch class (0..11)`);
    const m = lo + ((((pc - lo) % 12) + 12) % 12);
    if (m >= hi) throw new Error("padSeat: the register is narrower than an octave");
    out.push(m);
  }
  return out.sort((a, b) => a - b);
}

/** fundamentals-heavy, dark: the pad is heard under the material, not beside the guitar's lines */
const PAD_PARTIALS = Object.freeze([0, 1, 0.35, 0.12, 0.04]);

const PAD_VOICE = {
  bus: "pad", tail: 0.1,
  source: { kind: "wave", partials: PAD_PARTIALS },
  filter: { type: "lowpass", freq: 1400, q: 0.3 },
  envelope: (t, dur, vel) => {
    const a = Math.min(0.18, dur * 0.35), r = Math.min(0.3, dur * 0.4);
    return [
      env("set", t, 0),
      env("linear", t + a, vel),
      env("set", t + Math.max(a, dur - r), vel),
      env("linear", t + dur, 0),
    ];
  },
};

/** the voice a note event should use: the bass pedal and the pad have their own */
function voiceFor(role, name) {
  if (role === "bass") return BASS_VOICE;
  if (role === "pad") return PAD_VOICE;
  return NOTE_VOICES[name] || NOTE_VOICES.tone;
}

/** the envelope for one note, as data. `tail` is how long the source must run
 * past the envelope's end so the release is not cut off. */
function envelopeOf(spec, t, dur, vel) {
  const points = spec.envelope(t, dur, vel);
  for (let i = 1; i < points.length; i++)
    if (points[i].at < points[i - 1].at)
      throw new Error(`envelopeOf: breakpoints out of order at ${i} (${points[i].at} < ${points[i - 1].at})`);
  return { points, start: t, stop: t + dur + spec.tail };
}

/* ---------------- the click ---------------- */

/** three synthesized clicks, zero assets. Accent character is per-voice;
 * level 2 = bar, 1 = chord, 0 = beat, -1 = subdivision. */
const CLICK_VOICES = {
  beep: { type: "square", freq: { 2: 1800, 1: 1500, 0: 1150, "-1": 950 },
    gain: { 2: 0.17, 1: 0.12, 0: 0.08, "-1": 0.045 }, dur: 0.05 },
  wood: { type: "triangle", freq: { 2: 1660, 1: 1250, 0: 1000, "-1": 820 },
    gain: { 2: 0.50, 1: 0.38, 0: 0.28, "-1": 0.16 }, dur: 0.022 },
  tick: { noise: true, hp: { 2: 5200, 1: 6000, 0: 6800, "-1": 7600 },
    gain: { 2: 0.50, 1: 0.35, 0: 0.25, "-1": 0.14 }, dur: 0.04 },
};

const CLICK_VOICE_NAMES = Object.keys(CLICK_VOICES);

/** One click, described. **Accents off means every beat is a beat** — the level
 * is clamped rather than the gain flattened, which is the shipped rule and the
 * reason a downbeat with accents off sounds identical to any other beat. */
function clickSpec(name, level, { accents = true, vol = 1 } = {}) {
  const v = CLICK_VOICES[name] || CLICK_VOICES.beep;
  const lv = accents ? level : Math.min(level, 0);
  const gain = (v.gain[lv] ?? v.gain[0]) * vol;
  return v.noise
    ? { noise: true, hp: v.hp[lv] ?? v.hp[0], gain, dur: v.dur }
    : { noise: false, type: v.type, freq: v.freq[lv] ?? v.freq[0], gain, dur: v.dur };
}

/* ---------------- load-time assertions (golden rule 1, site form) ---------------- */

{
  // every named voice is complete enough for a host to realise blind
  for (const [n, v] of Object.entries({ ...NOTE_VOICES, bass: BASS_VOICE, pad: PAD_VOICE })) {
    if (!v.source || !v.filter || typeof v.envelope !== "function")
      throw new Error(`voices: ${n} is not a realisable description`);
    const { points } = envelopeOf(v, 0, 0.5, 0.2);
    if (points.length < 2) throw new Error(`voices: ${n} has no envelope`);
    if (Math.max(...points.map((p) => p.value)) > 1)
      throw new Error(`voices: ${n} peaks above unity at vel 0.2`);
  }
  // the pluck rings and then decays — the whole point of the feedback loop
  const s = pluckSamples(69, 8000, 0.5);
  const rms = (a, b) => {
    let t = 0; for (let i = a; i < b; i++) t += s[i] * s[i];
    return Math.sqrt(t / (b - a));
  };
  if (!(rms(0, 400) > rms(s.length - 400, s.length) * 2))
    throw new Error("voices: the Karplus-Strong string does not decay");
  // accents off flattens the bar down to a beat, by CLAMP not by gain
  if (clickSpec("beep", 2, { accents: false }).gain !== clickSpec("beep", 0, { accents: true }).gain)
    throw new Error("voices: accents off must make a downbeat sound exactly like a beat");
}
return { hzOf, NOTE_VOICE_NAMES, SUSTAIN_HOLD, voiceSchedule, chordSchedule, bassSeat, pluckSamples, SUSTAIN_PARTIALS, NOTE_VOICES, BASS_VOICE, PAD_REGISTER, padSeat, PAD_PARTIALS, PAD_VOICE, voiceFor, envelopeOf, CLICK_VOICES, CLICK_VOICE_NAMES, clickSpec };
})();

/* ===== engine/etude-timeline.mjs ===== */
const __m_engine_etude_timeline_mjs = (() => {
const { field } = __m_engine_field_mjs;
const { positionOf, materialIn } = __m_engine_position_mjs;
const { makeRun } = __m_engine_string_run_mjs;
const { oneOfEach, everyOccurrence, scaleTake, orderBy, gripFit, materialFor, capOf, pickOf, tonePick, objectOf } = __m_engine_selection_mjs;
const { progressionOf, chordAt, beatsOf, walkSchedule, movementWord } = __m_engine_progression_mjs;
const { bassSeat, padSeat } = __m_engine_voices_mjs;
const { placeReference, centreDegreeOf, centreMaterialRef, reRead, soundedBass } = __m_engine_reference_mjs;
/* etude-timeline.mjs — THE ÉTUDE'S TIMELINE: one pure function from a saved étude to timed notes (261014).
 *
 * Daniel, 2026-10-14: an étude should play inside an ordinary Obsidian note (RiffRaft's étude block). Every part was
 * already here and DOM-free — field, position, string-run, selection, progression, reference, voices — but the one
 * place that PUT THEM TOGETHER was hub/modules/etude-walk.mjs, bound to the bus and to setTimeout, so no other host
 * could ask what an étude sounds like. The derivation moved HERE, verbatim; the walk now keeps only its timing and
 * bus duties and takes its notes from barAt — one derivation, never two that agree today (rule 6, the FLAT_KEYS
 * failure).
 *
 * INPUT: a saved étude — the shape etudeRecord(doc).snapshot() produces, so a practice-log entry is valid input. A key
 * the étude does not carry takes ETUDE_DEFAULTS (the walk's own starting configuration, moved here); legacy movement
 * words normalise (movementWord); the saved `dyad` alias resolves through pickOf, as everywhere.
 *
 * OUTPUT: per chord, its symbol, degree and numeral, its beats, and its events
 *   { midi, onset, dur, role, string?, fret?, unfretted? }
 * with onset and dur in BEATS, never seconds: the tempo belongs to whoever plays it (the transport.mjs discipline), so
 * a host can change tempo without recomputing anything. `role` is "bass" for the reference and the sounded bass (the
 * NOTE contract's role), "pad" for the pad, and otherwise the note's musical role (R, 3, 5 … "approach"). A refused bar
 * (nothing selected) has no events — it is silent, with its reason on the door's face.
 *
 * dur: a note sounding together, the reference, the sounded bass and the pad hold to the end of the chord; a
 * sequenced note holds until the next onset. (The bus's NOTE carries a dur for the pad only; the rest are the
 * timeline's own reading of the same schedule.)
 */







/** the walk's starting configuration (moved verbatim from etude-walk.mjs) — what a key the étude omits resolves to */
const ETUDE_DEFAULTS = Object.freeze({ key: "Bb", scale: "major", ref: 0, tuning: null, gamut: null, strings: [4, 3, 2, 1],
  startDeg: 4, nearFret: 3, object: "tetrad", take: "one", notesPer: 3, sounded: "none", pad: false,
  tones: [1, 3, 5, 7], bass: "root", address: "pattern", figure: "", movement: "arpeggiate", repeat: false, centreSrc: "fixed",
  source: "cycle", cycle: "fourths", form: "ii-V-I", custom: "", start: 0, split: null });
const DEFAULT_METER = 4;

/** a saved étude → the configuration the derivation reads, by RESTORE's rules (hub/etude-record.mjs restore and the
 * owners that hear it): the defaults, overlaid by what the étude carries; an absent gamut is the whole field; the
 * OBJECT is never stored (night 59) — it is derived from the tones (or the legacy `dyad`), tones winning over a v1
 * entry's stored label, exactly as harmony-card and progression-card derive it on restore */
function etudeOf(saved) {
  const cfg = { ...ETUDE_DEFAULTS };
  if (!saved || typeof saved !== "object") return cfg;
  for (const k of Object.keys(ETUDE_DEFAULTS))
    if (k in saved) {
      const v = k === "movement" ? movementWord(saved[k]) : saved[k];
      cfg[k] = Array.isArray(v) ? [...v] : v;
    }
  if ("tones" in saved || "dyad" in saved) {
    const pick = tonePick(saved);
    cfg.tones = pick == null ? null : [...pick];
    try { cfg.object = objectOf(cfg.tones); } catch (_) { /* an unreadable pick keeps the label it came with */ }
  }
  return cfg;
}

const fieldOf = (cfg) => field({ key: cfg.key, scale: cfg.scale, tuning: cfg.tuning,   // the tuning is the field's fact (night 47)
  ref: cfg.object === "scale" ? centreMaterialRef(cfg.centreSrc, cfg.ref) : cfg.ref });

/** how many chords the étude walks */
function chordCount(cfg) {
  return progressionOf(cfg, cfg.key, cfg.scale).chords.length;
}

/** the beats chord `index` holds — beatsOf over the bars, under the meter and the split */
function beatsAt(cfg, index, meter = DEFAULT_METER) {
  const prog = progressionOf(cfg, cfg.key, cfg.scale);
  const per = beatsOf(prog.bars, meter, cfg.split);
  const flat = [];
  prog.bars.forEach((bar, bi) => bar.forEach((_, k) => flat.push(per[bi][k])));
  return flat[index] ?? meter;
}

/** one chord of the étude: { index, symbol, degree, roman, beats, events } — events in beats from the chord's downbeat */
function barAt(cfg, index, meter = DEFAULT_METER) {
  const fld = fieldOf(cfg);
  const prog = progressionOf(cfg, cfg.key, cfg.scale);
  const cur = chordAt(prog, index, fld, cfg.object, pickOf(cfg));
  const beats = beatsAt(cfg, index, meter);
  const run = makeRun(cfg.strings, fld.opens);   // the field's opens (night 44)
  const pos = positionOf({ field: fld, anchorString: Math.max(...run.strings),
    startDegree: cfg.startDeg, nearFret: cfg.nearFret, strings: run.strings });
  const pool = materialIn(pos, run.strings, fld, cfg.gamut);   // the gamut narrows the offer (night 48)
  let sel = [], walkAbsent = null;   // walkAbsent: what the placement dropped, for the figure's refusal (261011c)
  const refDeg = cfg.object === "scale"
    ? centreDegreeOf(cfg.centreSrc, cfg.ref, cur.degree)
    : cur.degree;
  if (cfg.object === "scale") {
    sel = scaleTake(pool).notes;
    /* the reading shifts to the bar's centre under "follows" */
    if (cfg.centreSrc === "follows" && refDeg != null)
      sel = reRead(sel, refDeg);
  } else {
    /* THE NAMED DROP (260914, item 3): an extended stack deeper than the placement's capacity reduces by gripFit's
     * rule (the boards speak the dropped roles; the walk sounds the kept stack) */
    const fit = cfg.take === "all" ? { tones: cur.tones, dropped: [] }
      : gripFit(cur.tones, run.strings.length * capOf(cfg.notesPer));   // night 56: a line is uncapped
    const mat = materialFor(cur.tones, pool, fld, run.strings, pos);   // role A (night 46): the chord's own supply sounds too
    const r = cfg.take === "all"
      ? everyOccurrence(cur.tones, mat, { n: capOf(cfg.notesPer) })
      : oneOfEach(fit.tones, mat, { n: capOf(cfg.notesPer), centre: pos.centre });
    sel = r.notes || r.partial || [];   // 260923: one-of-each's PARTIAL sounds beside its refusal (ruling 260922b/3)
    walkAbsent = { dropped: [...fit.dropped, ...(r.dropped || []), ...(r.capped || [])], kept: sel.map((x) => x.role), strings: run.strings.length, notesPer: capOf(cfg.notesPer), resolvesAt: r.resolvesAt };
  }
  /* THE REFERENCE DOES NOT SOUND THROUGH A REFUSED BAR (Daniel's ruling, 260904): with no harmony on top it has
   * nothing to be under. THE CENTRE WORKS (260913b, item 4a): under a scale it places against the modal centre. */
  let refNote = null;
  if (cfg.bass !== "none" && refDeg != null && refDeg >= 0 && sel.length
      && (cfg.object === "scale" || cur.degree >= 0)) {
    const rp = placeReference(cfg.bass, refDeg, fld, run.strings, pos, pickOf(cfg));
    if (rp.note) refNote = rp.note;
  }
  /* THE SOUNDED BASS (night 57): a pitch with no string, seated below the voicing's lowest note (bassSeat), on ANY
   * set; silent through a refused bar for the reference's own reason */
  let soundedMidi = null;
  if (cfg.sounded && cfg.sounded !== "none" && refDeg != null && refDeg >= 0 && sel.length
      && (cfg.object === "scale" || cur.degree >= 0)) {
    const sb = soundedBass(cfg.sounded, refDeg, fld, cfg.object === "scale" ? null : pickOf(cfg));
    if (sb.pc != null) soundedMidi = bassSeat(Math.min(...sel.map((x) => x.midi)), sb.pc);
  }
  /* THE SCHEDULE: the figure's order through orderBy — the same value the bracket and the polyline draw — or the
   * take's own shape. 260905: Take chooses the MATERIAL, Movement together-or-sequence (a scale stays a run); a typed
   * figure sequences regardless, as ruled. Scheduled at 60 bpm, so seconds ARE beats. */
  const fig = orderBy(cfg.address, cfg.figure, sel, { fld, strings: run.strings, pos, absent: walkAbsent, tones: cfg.object === "scale" ? null : cur.tones });
  const spread = cfg.object === "scale" || cfg.movement === "arpeggiate";
  const { events: raw } = walkSchedule(sel, fig.err ? null : fig.steps || null,   // a group is one step, its notes one onset (261009)
    beats, 60, { spread, refMidi: refNote ? refNote.midi : null, soundedMidi, carry: true });
  /* dur: until the next later onset, or to the chord's end */
  const onsets = [...new Set(raw.map((e) => e.at))].sort((a, b) => a - b);
  const until = (at) => onsets.find((o) => o > at + 1e-9) ?? beats;
  const events = raw.map((e) => {
    if (e.role === "bass")
      return e.unfretted ? { midi: e.midi, onset: 0, dur: beats, role: "bass", unfretted: true }
        : { midi: e.midi, onset: 0, dur: beats, role: "bass", string: refNote.string, fret: refNote.fret };
    return { midi: e.midi, onset: e.at, dur: until(e.at) - e.at, role: e.tone, string: e.string, fret: e.fret };
  });
  /* THE PAD (night 57): the bar's harmony seated above the strings' register (padSeat), at the attack, held for the
   * chord. Never under a scale (no chord), never through a refused bar. Listed FIRST — the walk announces it first. */
  const pad = (cfg.pad && cfg.object !== "scale" && cur.tones && cur.tones.length && sel.length)
    ? padSeat(cur.tones.map((t) => ((t.pc % 12) + 12) % 12)).map((m) => ({ midi: m, onset: 0, dur: beats, role: "pad" }))
    : [];
  return { index, symbol: cur.symbol, degree: cur.degree, roman: cur.roman, beats, events: [...pad, ...events] };
}

/** THE TIMELINE: every chord of a saved étude, in order, each with its beats and its events (onsets in beats from that
 * chord's downbeat; `at` is the chord's own downbeat from the étude's start, in beats) */
function etudeTimeline(saved) {
  const cfg = etudeOf(saved);
  const meter = saved && typeof saved.meter === "number" ? saved.meter : DEFAULT_METER;
  const n = chordCount(cfg);
  const bars = [];
  let at = 0;
  for (let i = 0; i < n; i++) {
    const b = barAt(cfg, i, meter);
    bars.push({ ...b, at });
    at += b.beats;
  }
  return { meter, beats: at, bars };
}
return { ETUDE_DEFAULTS, DEFAULT_METER, etudeOf, chordCount, beatsAt, barAt, etudeTimeline };
})();

/* ===== engine/degree-palette.mjs ===== */
const __m_engine_degree_palette_mjs = (() => {
/* degree-palette.mjs — THE DEGREE PALETTE, stated once, where every carrier can reach it
 * (night 43, 261007).
 *
 * Design Spec §2.1 is the law: colour encodes FUNCTION against the current root and
 * nothing else (golden rule 8 — never status, selection, error or emphasis). These are
 * its seven hexes, keyed by the degree family the legend names. Night 24 (260918) moved
 * the table out of five hub modules into hub/palette.mjs; night 43 moves the table one
 * step further, into the engine, because the family's chart line (chart-line.mjs) paints
 * the root-degree dot on every study that has a chart line — two of which are not doors
 * and cannot import a hub file. hub/palette.mjs binds to this table (FAM, FAM_COLOR) and
 * keeps the hub's own additions (the text rule, the annotation colours). Nothing
 * restates the map: a hand-authored page carries this module and binds to it.
 */
const FAM = ["R", "2", "3", "4", "5", "6", "7"];
const FAM_COLOR = { R: "#B82929", "2": "#3C8B2F", "3": "#2959A6", "4": "#A9ABB4",
  "5": "#212126", "6": "#1CB8D1", "7": "#D99A08" };
{
  // §2.1, asserted at load: seven families, seven distinct hexes, each a 6-digit colour
  if (FAM.length !== 7 || new Set(FAM).size !== 7) throw new Error("degree-palette: seven degree families");
  for (const f of FAM) if (!/^#[0-9A-F]{6}$/.test(FAM_COLOR[f])) throw new Error("degree-palette: " + f + " has no colour");
  if (new Set(Object.values(FAM_COLOR)).size !== 7) throw new Error("degree-palette: two families share a colour");
}
return { FAM, FAM_COLOR };
})();

/* ===== engine/tunings.mjs ===== */
const __m_engine_tunings_mjs = (() => {
const { OPEN_MIDI, STRINGS, TUNING_RANGE, opensOf } = __m_engine_field_mjs;
const { openStringName } = __m_engine_open_string_mjs;
/* tunings.mjs — THE NAMED TUNINGS, AND THE STEP (alternate tunings item 2, night 47, 261009).
 *
 * Item 1 made the tuning the field's fact (field.mjs: opensOf, assertOpens — well-formedness,
 * the ±6 window against the standard rule) and spelled an open string by the direction of its
 * move (open-string.mjs). This module is what an EDITOR reads:
 *
 *   THE NAMED TABLE — the names below. A vocabulary, not a computable fact, so it is DATA, stated ONCE
 *   (Daniel's ruling 3, 261008: "presets are a named table, read both ways"). Applying a name
 *   is reading the table forward; the row NAMING ITSELF when the six steppers spell one is
 *   reading it backward — nameOf compares total offsets against the same table, never a
 *   second list (rule 6). Offsets are semitones from standard per string number, §7's shape.
 *   The one entry that IS a computable fact — all fourths, a stack of perfect fourths from
 *   the sixth string — is derived, not typed.
 *
 *   WHAT THE TABLE HOLDS, AND WHY (the 261009 injection, Daniel's rulings):
 *   - a name that is another name plus a UNIFORM shift is redundant once the global stepper
 *     exists (the stepper IS "half-step down", "whole-step down", and "drop C" = drop D −2 —
 *     "just a full string register shift of drop D"). Those three left. Computed over the
 *     table the rule catches one more pair — open E = open D +2 — and OPEN E STAYS BY RULING:
 *     slide players name it as its own tuning, and it sits at a materially higher tension
 *     and brightness than open D, a difference the offsets cannot represent. Idiom outranks
 *     the arithmetic here; a session re-deriving the rule will find this pair again, and
 *     this comment is why it is not removed (rule 7). tunings.test asserts the pair is the
 *     ONLY shape-duplicate in the table.
 *   - a NAMED tuning may carry its own SPELLING for a string (Daniel, 261009): open D is
 *     D A D F♯ A D — the F♯ is the third of the chord it is named for — where the direction
 *     rule (open-string.mjs, unchanged: the label names the instrument, not the field) says
 *     G♭. The override is an optional per-string entry in THIS table and nowhere else; the
 *     label site prefers it ONLY on an exact match (a shifted open D is not open D, and its
 *     third string has moved somewhere the spelling does not describe); and its count is
 *     pinned at one — a second is a new decision and must arrive as one.
 *
 *   THE READING — readTuning: an EXACT match first (the name, no register note), else a
 *   SHAPE match (two tunings have the same shape when their offsets differ by a constant;
 *   the name plus the register shift — old "drop C" reads "drop D, a whole step down"), else
 *   unnamed. Exact-first is not optional: open D and open E share a shape, and only the
 *   exact match tells them apart — open D shifted up a whole step IS open E, and says so.
 *
 *   THE STEP — canStep(tuning, string, dir) answers "may this string move one semitone this
 *   way?" BEFORE the move, with the reason when not: a move that would carry a string past a
 *   neighbour (§4: slots are pitch-ordered; a crossed tuning would change what every stored
 *   figure means, silently) or out of the ±6 window. This is the user-facing "no" — inert at
 *   the point of the move, said there; assertOpens's throw is the wrong layer for it and is
 *   never reached from an editor that asks first. The neighbour is named by what it is and
 *   what it sounds (rule 14): "string 4, which sounds D".
 *
 *   THE GLOBAL STEP — canStepAll(tuning, dir) moves all six together from where they are. A
 *   uniform move never crosses a neighbour (the order is invariant), so only the window can
 *   refuse it, and it is refused whole when ANY string cannot take it, naming that string —
 *   never a clamp that moves five and skips one. One window law, two callers (rule 6).
 *
 * Pure; load-time assertions.
 */


const STANDARD_NAME = "standard";

/** all fourths, derived: a perfect fourth (five semitones) from each string to the next,
 * from the sixth string's standard E — E A D G C F; strings 2 and 1 each rise a semitone */
const allFourths = () => {
  const out = {};
  for (const s of STRINGS) { const o = OPEN_MIDI[6] + 5 * (6 - s) - OPEN_MIDI[s]; if (o) out[s] = o; }   // offsets are from the default, by definition
  return out;
};

/** THE ONE TABLE. Offsets from standard by string number; absent strings unmoved. `spell`,
 * when present, is the name's own spelling for a string (see the header — one today). */
const NAMED_TUNINGS = Object.freeze([
  { name: "drop D",      offsets: { 6: -2 } },
  { name: "DADGAD",      offsets: { 6: -2, 2: -2, 1: -2 } },
  { name: "open G",      offsets: { 6: -2, 5: -2, 1: -2 } },
  { name: "open D",      offsets: { 6: -2, 3: -1, 2: -2, 1: -2 }, spell: { 3: "F♯" } },
  { name: "open E",      offsets: { 5: 2, 4: 2, 3: 1 } },        // = open D +2; stays by ruling (header)
  { name: "all fourths", offsets: allFourths() },
].map((t) => Object.freeze({ name: t.name, offsets: Object.freeze({ ...t.offsets }), spell: Object.freeze({ ...(t.spell || {}) }) })));

/** every spelling override the table carries — [name, string, letter]; pinned at ONE */
const SPELLING_OVERRIDES = Object.freeze(NAMED_TUNINGS.flatMap((n) =>
  Object.keys(n.spell).map((s) => Object.freeze([n.name, +s, n.spell[s]]))));

/** every string's offset, zeros included — the one shape two tunings are compared in */
function totalOffsets(tuning) {
  const out = {};
  for (const s of STRINGS) out[s] = tuning && Number.isInteger(tuning[s]) ? tuning[s] : 0;
  return out;
}

const sameTuning = (a, b) => STRINGS.every((s) => totalOffsets(a)[s] === totalOffsets(b)[s]);

/** the table read backward, EXACTLY: the name the six offsets spell, "standard" for none
 * moved, null for a tuning no name spells exactly — the lit name is this reading */
function nameOf(tuning) {
  const t = totalOffsets(tuning);
  if (STRINGS.every((s) => t[s] === 0)) return STANDARD_NAME;
  const hit = NAMED_TUNINGS.find((n) => sameTuning(n.offsets, t));
  return hit ? hit.name : null;
}

/** the offsets with string 6's subtracted — two tunings of one SHAPE canonicalise alike */
const shapeOf = (tuning) => { const t = totalOffsets(tuning); const o = {}; for (const s of STRINGS) o[s] = t[s] - t[6]; return o; };

/** the table read backward, EXACT FIRST then by SHAPE: { name, shift } — shift 0 on an exact
 * match, the register shift in semitones on a shape match, null when nothing matches */
function readTuning(tuning) {
  const exact = nameOf(tuning);
  if (exact !== null) return { name: exact, shift: 0 };
  const t = totalOffsets(tuning), shape = shapeOf(t);
  const rows = [{ name: STANDARD_NAME, offsets: {} }, ...NAMED_TUNINGS];
  const hit = rows.find((n) => sameTuning(shapeOf(n.offsets), shape));
  return hit ? { name: hit.name, shift: t[6] - totalOffsets(hit.offsets)[6] } : null;
}

/** the house's words for a distance (motion.mjs says the same three): a half step, a whole
 * step, n semitones */
const shiftWords = (n) => (Math.abs(n) === 1 ? "a half step" : Math.abs(n) === 2 ? "a whole step" : `${Math.abs(n)} semitones`) + (n < 0 ? " down" : " up");

/** what the name field says — the one wording, every site: "open D" · "drop D, a whole step
 * down" · "" for an unnamed shape */
function describeTuning(tuning) {
  const r = readTuning(tuning);
  return r === null ? "" : r.shift === 0 ? r.name : `${r.name}, ${shiftWords(r.shift)}`;
}

/** the open string's LABEL: the name's own spelling on an exact match, else the direction
 * rule — one speller (open-string.mjs) and one optional table entry, not two spellers */
function openLabel(tuning, string) {
  const exact = nameOf(tuning);
  const row = exact === null ? null : NAMED_TUNINGS.find((n) => n.name === exact);
  if (row && row.spell[string]) return row.spell[string];
  return openStringName(opensOf(totalOffsets(tuning))[string], OPEN_MIDI[string]);   // the default is the spelling's reference
}

/** the window clause, once: the reason a string cannot take one more semitone this way */
const windowRefusal = (t, string, dir, subject) =>
  Math.abs(t[string] + dir) > TUNING_RANGE
    ? `six semitones is the window — ${subject} is at its ${dir > 0 ? "highest" : "lowest"}` : null;

/** may `string` move one semitone in `dir` (+1 up, −1 down)? { ok } or { ok:false, reason } */
function canStep(tuning, string, dir) {
  if (!STRINGS.includes(string)) throw new Error(`tunings: string ${string} is not a real string`);
  if (dir !== 1 && dir !== -1) throw new Error("tunings: a step is one semitone, up or down");
  const t = totalOffsets(tuning);
  const win = windowRefusal(t, string, dir, "this string");
  if (win) return { ok: false, reason: win };
  const opens = opensOf(t);
  const midi = opens[string] + dir;
  const neighbour = dir > 0 ? string - 1 : string + 1;   // string 1 is the highest: up meets the next-lower number
  if (STRINGS.includes(neighbour)) {
    const nm = opens[neighbour];
    if (dir > 0 ? midi >= nm : midi <= nm)
      return { ok: false, reason: `would pass string ${neighbour}, which sounds ${openStringName(nm, OPEN_MIDI[neighbour])}` };   // the default is the spelling's reference
  }
  return { ok: true };
}

/** the tuning after one legal step — a refused step throws, so nothing silently clamps */
function stepped(tuning, string, dir) {
  if (Math.abs(dir) !== 1) {
    // a multi-semitone move is walked one step at a time, so every refusal is the step's own
    let t = totalOffsets(tuning);
    for (let i = 0; i < Math.abs(dir); i++) t = stepped(t, string, Math.sign(dir));
    return t;
  }
  const r = canStep(tuning, string, dir);
  if (!r.ok) throw new Error(`tunings: refused — ${r.reason}`);
  const t = totalOffsets(tuning); t[string] += dir;
  return t;
}

/** may ALL SIX move one semitone in `dir` together? Refused whole when any one string
 * cannot, naming it: { ok } or { ok:false, reason, string } */
function canStepAll(tuning, dir) {
  if (dir !== 1 && dir !== -1) throw new Error("tunings: a step is one semitone, up or down");
  const t = totalOffsets(tuning);
  for (const s of STRINGS) {
    const win = windowRefusal(t, s, dir, `string ${s}`);
    if (win) return { ok: false, reason: win, string: s };
  }
  return { ok: true };
}

/** the tuning after one legal global step — refused whole or made whole, never clamped */
function steppedAll(tuning, dir) {
  const r = canStepAll(tuning, dir);
  if (!r.ok) throw new Error(`tunings: refused — ${r.reason}`);
  const t = totalOffsets(tuning);
  for (const s of STRINGS) t[s] += dir;
  opensOf(t);   // a uniform move keeps the order; this is the proof, not a check that can fail
  return t;
}

{
  // the table is well-formed and its names are its own
  for (const n of NAMED_TUNINGS) { opensOf(n.offsets); if (nameOf(n.offsets) !== n.name) throw new Error(`tunings: ${n.name} does not name itself`); }
  if (new Set(NAMED_TUNINGS.map((n) => n.name)).size !== NAMED_TUNINGS.length) throw new Error("tunings: a name is stated twice");
  if (nameOf({}) !== STANDARD_NAME) throw new Error("tunings: no move is standard");
  if (canStep({}, 5, 1).ok !== true || canStep(stepped({}, 5, 4), 5, 1).ok !== false) throw new Error("tunings: the crossing refusal does not hold — A up five meets D");
  if (SPELLING_OVERRIDES.length !== 1)
    throw new Error(`tunings: the table carries ${SPELLING_OVERRIDES.length} spelling overrides (${SPELLING_OVERRIDES.map((o) => `${o[0]} string ${o[1]}`).join(", ")}) — one is the ruling (open D, string 3, F♯); a second is a new decision and must arrive as one`);
  const openE = NAMED_TUNINGS.find((n) => n.name === "open E"), openD = NAMED_TUNINGS.find((n) => n.name === "open D");
  if (readTuning(openE.offsets).name !== "open E" || readTuning(openD.offsets).name !== "open D" || readTuning({ 6: -4, 5: -2, 4: -2, 3: -2, 2: -2, 1: -2 }).name !== "drop D")
    throw new Error("tunings: the reading is not exact-first — open D and open E share a shape and only an exact match tells them apart; old drop C is drop D down a whole step");
}
return { STANDARD_NAME, NAMED_TUNINGS, SPELLING_OVERRIDES, totalOffsets, nameOf, readTuning, shiftWords, describeTuning, openLabel, canStep, stepped, canStepAll, steppedAll };
})();

/* ===== engine/etude-describe.mjs ===== */
const __m_engine_etude_describe_mjs = (() => {
const { objectOf, tonePick } = __m_engine_selection_mjs;
const { describeTuning } = __m_engine_tunings_mjs;
/* etude-describe.mjs — the étude, in a musician's words (night 66, 261024): describe(snapshot) for the Settings
 * card. The SNAPSHOT comes from hub/etude-record.mjs — the one record the practice log saves; this file only
 * words it, so the face and the log cannot hold different lists. Kept apart from the record so the engine
 * modules it needs (selection, tunings) reach only the door that shows the card.
 * MOVED from hub/ to engine/ (261014, Daniel — bundle 2.1.0): its imports were already engine code, so the move
 * changes where it lives and nothing it says; RiffRaft's étude card now describes an étude in these same words. */


/* ---------------- the description: the snapshot, in a musician's words ---------------- */

const SCALE = { major: "major", harm: "harmonic minor", mel: "melodic minor" };
const OBJECT = { scale: "the scale itself", dyad: "a dyad", triad: "a triad", tetrad: "a tetrad", ninth: "a 9th chord",
  eleventh: "an 11th chord", thirteenth: "a 13th chord", shell: "a shell" };
const CYCLE = { scale: "the scale's own chords, step by step", thirds: "a cycle of thirds", fourths: "a cycle of fourths",
  fifths: "a cycle of fifths", sixths: "a cycle of sixths" };
const FORM = { "ii-V-I": "a ii–V–I", "ii-V-i": "a minor ii–V–i", turnaround: "the I–vi–ii–V turnaround",
  "blues-12": "a twelve-bar blues", "rhythm-a": "the A section of rhythm changes", "cycle-4ths": "a cycle of fourths" };
const NUMERAL = ["I", "II", "III", "IV", "V", "VI", "VII"];
const UNDER = { none: null, root: "the root", third: "a 3rd below", fifth: "a 5th below" };
const underWord = (v) => (v in UNDER ? UNDER[v] : /^tone:(\d)$/.test(String(v)) ? `the ${ordinal(+String(v).slice(5))} in the bass` : String(v));
const ordinal = (n) => (n === 1 ? "root" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);
const role = (d) => (Number(d) === 1 ? "R" : String(d));
const degreesOf = (g) => (Array.isArray(g) ? g : String(g).split(",")).map((x) => String(x).trim()).filter(Boolean);

/** the keys this file has words for — anything else in a snapshot is said under "also", never dropped */
const DESCRIBED = ["bpm", "meter", "split", "key", "scale", "gamut", "ref", "centreSrc", "tones", "dyad",
  "source", "cycle", "form", "custom", "start", "chart", "strings", "startDeg", "nearFret", "notesPer", "take",
  "movement", "address", "figure", "repeat", "bass", "sounded", "pad", "tuning",
  "sub", "click", "accents", "clickLevel", "clickVoice", "mixer"];   // night 83: the bench

/** [{ part, text }] — one line per part of the étude, in the order a player builds it */
function describe(s) {
  const out = [];
  const say = (part, text) => out.push({ part, text });
  // the clock
  const tempo = typeof s.bpm === "number" ? `${s.bpm} bpm` : "the clock's own tempo";
  const bar = typeof s.meter === "number" ? `, ${s.meter}/4` : "";
  /* the split's words (261010, the one law): a slot list sets the harmonic rhythm — each chord takes the next slot;
   * "chart" is the chart's own barring; absent (an entry saved before 261010) is not recorded, and says so */
  const slots = Array.isArray(s.split) ? s.split : typeof s.split === "string" && /^\d+(\+\d+)*$/.test(s.split) ? s.split.split("+").map(Number) : null;
  const split = s.split === "chart" ? " — chords as charted"
    : slots ? (slots.length === 1 ? ` — each chord ${slots[0]} beat${slots[0] === 1 ? "" : "s"}` : ` — each chord takes the next slot of ${slots.join("+")}`)
    : " — the bar split not recorded";
  say("tempo", `${tempo}${bar}${split}`);
  // the field and its centre
  const field = s.gamut == null ? "the whole field" : `narrowed to degrees ${degreesOf(s.gamut).join(" ")}`;
  say("field", `${s.key || "C"} ${SCALE[s.scale] || s.scale || "major"} — ${field}`);
  const centre = s.centreSrc === "follows" ? "each bar read against its own chord's root"
    : Number(s.ref) ? `centred on degree ${Number(s.ref) + 1} of the key` : "centred on the key";
  say("centre", centre);
  // the object: DERIVED from the tones, never stored (night 59)
  const pick = tonePick(s);
  let obj;
  try { obj = objectOf(pick); } catch (e) { obj = null; }
  say("object", pick == null ? "the scale itself — every note the field offers"
    : `${OBJECT[obj] || "a chord"} — ${pick.map(role).join(" ")}`);
  // the progression
  const start = Number.isInteger(s.start) ? ` from ${NUMERAL[s.start] || s.start}` : "";
  say("progression", s.source === "custom" ? (String(s.custom || "").trim() ? `your own chart: ${s.custom.trim()}` : "your own chart — empty")
    : s.source === "form" ? `${FORM[s.form] || s.form}${start}`
    : `${CYCLE[s.cycle] || s.cycle || "a cycle"}${start}`);
  // the window (position)
  if (Number.isInteger(s.startDeg) || Number.isInteger(s.nearFret))
    say("window", `the window framed from the ${ordinal((s.startDeg ?? 0) + 1)} of the key, near fret ${s.nearFret ?? "—"}`);
  // the motif (the span Take/Movement → figure — motif, 261022): placement, the take, movement, figure
  const strings = Array.isArray(s.strings) ? `strings ${s.strings.join("–")}` : "the neck's strings";
  const place = s.notesPer === 1 || s.notesPer == null ? "grip" : "line";
  const take = s.take === "all" ? "every occurrence" : "one of each";
  const figured = String(s.figure || "").trim();
  /* 261013 (the readout's figure clause, in line): under a figure the switch decides nothing — the figure orders the
   * notes, or sounds them together when it is one <group> — so the movement word is said only when there is no figure.
   * Unlike the readout, this line has no bar to resolve the figure against, so it keeps the address: for a digit figure
   * like 537 it is the only thing that says whether the digits are strings or tones. */
  const move = figured ? "" : /^arpeggi/.test(String(s.movement)) ? ", arpeggiated" : ", strummed";
  const fig = figured ? `, figure ${figured.replace(/\s+/g, "")} (${s.address === "tones" ? "by tone" : "by string"})` : ", no figure";
  say("motif", `a motif of ${place}, ${take}${move}${fig} — on ${strings}`);
  say("repeat", s.repeat ? "repeating the current bar" : "running through the chart");
  // under the harmony
  const fretted = underWord(s.bass ?? "root");
  say("reference", fretted ? `fretted under it: ${fretted}` : "nothing fretted under it");
  const sounded = underWord(s.sounded ?? "none");
  say("sound", `${sounded ? `the bass sounds ${sounded}` : "no bass sounds"}; ${s.pad ? "a pad holds the chord" : "no pad"}`);
  // the neck
  say("tuning", s.tuning == null ? "standard tuning" : (describeTuning(s.tuning) || "a tuning of its own"));
  // a chart written in the pad (the notepad's ```chart block): the progression the étude runs, when one is written
  if (s.chart != null && String(s.chart).trim()) say("chart", `a chart written in the notes: ${String(s.chart).trim().split(/\s+/).length} symbols`);
  /* THE BENCH (night 83 — a saved étude comes back as the whole bench, so the face says it), after the étude it
   * plays under — every earlier line keeps its place. Said only when the
   * record carries it; no second table of the controls' labels — the subdivision is a number, the voice its own
   * name, and the mix names its channels by the mixer's own keys, so a channel added later is said with no edit. */
  if (["sub", "click", "accents", "clickLevel", "clickVoice"].some((k) => k in s)) {
    const level = typeof s.clickLevel === "number" ? s.clickLevel : s.click === false ? 0 : null;
    const at = level == null ? "" : ` at ${Math.round(level * 100)}`;
    const how = level === 0 ? "the click muted" : s.clickVoice ? `a ${s.clickVoice} click${at}` : `the click${at}`;
    const acc = s.accents === false ? " · no accent on the one" : s.accents === true ? " · the one accented" : "";
    const sub = Number(s.sub) > 1 ? ` · each beat in ${Number(s.sub)}` : "";
    say("click", `${how}${acc}${sub}`);
  }
  if (s.mixer && typeof s.mixer === "object") {
    const m = s.mixer, lv = (v) => (v === 0 ? "muted" : String(Math.round(v * 100)));
    const chans = Object.keys(m).filter((k) => typeof m[k] === "number").sort().map((k) => `${k} ${lv(m[k])}`);
    say("mix", [m.voice ? `the ${m.voice} voice` : null, ...chans].filter(Boolean).join(" · "));
  }
  // anything the log carries that this file has no words for — SAID, never dropped
  const also = Object.keys(s).filter((k) => !DESCRIBED.includes(k)).sort();
  if (also.length) say("also", also.map((k) => `${k} ${JSON.stringify(s[k])}`).join(" · "));
  return out;
}
return { DESCRIBED, describe };
})();

export const { LETTER_PC, accOf, pcOf, parseChord, SCALE_STEPS, scaleNotes, chromaticSpeller, spellRole, alteredDegree, resolveRoman } = __m_engine_chord_mjs;
export const { ATCHART_VERSION, CHART_SLOT, readApp, writeApp, parseAtchart, serializeAtchart } = __m_engine_atchart_mjs;
export const { STRUCTURES, CHORD_ROOTS, CHORD_QUALITIES, GLYPHS, resolveStructure, chartBody, chartFence, changesLine, chordSymbol } = __m_engine_structures_mjs;
export const { applyEdit } = __m_engine_markdown_mjs;
export const { grammarRoman } = __m_engine_numeral_mjs;
export const { ETUDE_DEFAULTS, DEFAULT_METER, etudeOf, chordCount, beatsAt, barAt, etudeTimeline } = __m_engine_etude_timeline_mjs;
export const { FAM, FAM_COLOR } = __m_engine_degree_palette_mjs;
export const { DESCRIBED, describe } = __m_engine_etude_describe_mjs;
