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

export const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function accOf(name) {
  let a = 0;
  for (const ch of name.slice(1)) a += ch === "#" ? 1 : ch === "b" ? -1 : 0;
  return a;
}

export function pcOf(name) {
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
export function parseChord(input) {
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
export function parseRoman(tok) {
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

export const SCALE_STEPS = {
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
export function scaleNotes(tonic, scaleType = "major") {
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
 * THE CHROMATIC SPELLER (260920, night 26 item 2 — standing rule 6). Until
 * tonight this rule lived twice, in score-board.mjs and staff-board.mjs, each
 * importing LETTER_PC from here and re-stating the law beside it — the tell
 * that the rule belonged beside its data. The law is resolveRoman's: KEEP THE
 * LETTER, MOVE THE ACCIDENTAL, throw past ±2.
 *
 *   chromaticSpeller("F", "major") → (midi) => { name, oct }
 *
 * A diatonic pitch class takes the scale's own spelled name. A chromatic one
 * takes the nearest scale note ABOVE in a flat key, lowered by the distance,
 * or the nearest scale note BELOW in a sharp key, raised by it — letter kept,
 * accidental moved (Db major: pc 2 is E♭ lowered → Ebb, never "Eb", which is
 * a different pitch; C harmonic minor: pc 9 lies in the augmented second, so
 * B lowered twice → Bbb). The two retired copies did letter + one accidental
 * and were wrong whenever the neighbour already carried one (staff-board drew
 * a WRONG PITCH a semitone off; score-board fell back to "C").
 *
 * WHICH WAY IS "FLAT" IS READ FROM THE KEY SIGNATURE, NOT A TABLE: the tonic's
 * major collection carries a flat (F major's B♭ — the old `|| key === "F"`
 * special case falls out with nothing said). Measured before choosing
 * (260920): reading the scale's OWN collection disagrees with the old rule
 * for C/G harmonic and C melodic minor and is undecidable for C major, D
 * harmonic and G melodic (equal counts); reading the key signature agrees in
 * all 45 key × scale cases. The other reading is Daniel's to rule on.
 *
 * The written octave follows the LETTER (a Cb/Cbb sounds below its C; a
 * B#/B## above its B), which is why those two lines survive here verbatim.
 */
export function chromaticSpeller(key, scaleType = "major") {
  const notes = scaleNotes(key, scaleType);
  const byPc = new Map(notes.map((n) => [n.pc, n.name]));
  const flatKey = scaleNotes(key, "major").some((n) => n.name.includes("b"));
  const dir = flatKey ? 1 : -1;
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
      let d = 1;
      while (!byPc.has(mod12(pc + dir * d))) d++;
      name = respell(byPc.get(mod12(pc + dir * d)), -dir * d);
    }
    let oct = Math.floor(midi / 12) - 1;
    if (name.startsWith("Cb")) oct += 1;
    if (name.startsWith("B#")) oct -= 1;
    return { name, oct };
  };
}

export function resolveRoman(tok, key, scaleType = "major") {
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
