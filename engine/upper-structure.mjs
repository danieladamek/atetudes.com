/* upper-structure.mjs — upper-structure triads by named rule.
 *
 * Pure module: parseChord() output → ranked upper-structure triad candidates
 * plus the auto-selected bass. No DOM, no audio, headless-testable.
 *
 * Shared family code (family note §5): first consumer is Triadetudes v0.6
 * break-down mode (roadmap §3.1); second is Substitute Teacher's ST-2 voicing
 * lens ("upper-structure triad over bass", ST PRD §4.2) and the substitution
 * lab's "upper-structure reinterpretation" row (§4.3).
 *
 * Doctrine (golden rule 1 / charter §7): the roadmap §3.1 decomposition table
 * is the ASSERTION CORPUS (engine/tests/upper-structure.test.mjs), not the
 * implementation. Nothing here maps a symbol to a triad; every candidate is
 * DERIVED from the parsed chord's pitch-class content by one of four named
 * rules, then structurally asserted before it is returned:
 *
 *   1. chord-tone triads — every 3-subset of the chord's pitch classes that
 *      forms a maj/min/dim/aug triad (triad root ≠ chord root). Covers the
 *      rootless sevenths (Cmaj7→Em, Dm7→F, G7→B°, Cm7b5→Ebm, CmMaj7→Eb+),
 *      the extension colors (Cmaj9→G, Dm9→Am), the relative pairing of sixth
 *      chords (C6→Am, Cm6→A°), the b9-diminished family (G7b9→Ab°), and
 *      °7's symmetric rotation.
 *   2. tension triad on the b7 — dominants carrying a natural 9 (and sus
 *      dominants): the major triad built on the b7 sounds b7-9-11 (G9→F).
 *      Any member not in the chord symbol (the 11 over G9) is an ADDED
 *      TENSION, declared as such on the candidate.
 *   3. tritone-sub triad — alt dominants: the major triad on the b5 is the
 *      tritone substitute's own triad (G7alt→Db), sounding b5-b7-b9. The b5
 *      is the added tension of the sub hearing, declared as such.
 *   4. triad identity — a plain triad is its own material (C→C; F/G→F over G).
 *
 * Ranking is a NAMED PREFERENCE POLICY per chord function (§3.1's defaults):
 * alt → tritone-sub triad; dominant b9 → the diminished on the b9; sixth
 * chords → the relative triad on the 6; maj9/m9 → the 5-7-9 extension color;
 * any seventh → its rootless 3-5-7 stack; dominant 9 → guide tones first
 * (B°), tension triad second (F). candidates[0] is the default; every other
 * candidate is an honest alternative the UI may offer (the chip's "▾").
 *
 * The auto bass is the chord root — or the slash bass when the user wrote one.
 */

import { LETTER_PC } from "./chord.mjs";

const mod12 = (n) => ((n % 12) + 12) % 12;
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const PLAIN_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// ---------- triad shapes (the only qualities the family's triad engines play) ----------

const TRIAD_SHAPES = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8] };
const TRIAD_SUFFIX = { maj: "", min: "m", dim: "°", aug: "+" };

// ---------- degree labels: semitones + letter offsets, kept congruent ----------

const LABEL_SEMIS = {
  R: 0, b9: 1, 9: 2, b3: 3, "#9": 3, 3: 4, 4: 5, 11: 5, b5: 6, "#11": 6,
  5: 7, "#5": 8, b13: 8, 6: 9, 13: 9, bb7: 9, b7: 10, 7: 11,
};
const LABEL_LETTER = {
  R: 0, b9: 1, 9: 1, "#9": 1, b3: 2, 3: 2, 4: 3, 11: 3, "#11": 3,
  b5: 4, 5: 4, "#5": 4, b13: 5, 6: 5, 13: 5, bb7: 6, b7: 6, 7: 6,
};
// chord interval → degree label (context: interval 9 is bb7 inside a dim7)
const IV_LABEL = {
  0: "R", 1: "b9", 2: "9", 3: "b3", 4: "3", 5: "4", 6: "b5", 7: "5", 8: "#5",
  9: "6", 10: "b7", 11: "7", 13: "b9", 14: "9", 15: "#9", 17: "11", 18: "#11",
  20: "b13", 21: "13",
};

// ---------- load-time structural assertions (golden rule 1, site form) ----------

function assertShape(name, ivs) {
  if (ivs[0] !== 0) throw new Error(`shape ${name}: no root`);
  for (let i = 1; i < ivs.length; i++)
    if (ivs[i] <= ivs[i - 1]) throw new Error(`shape ${name}: not ascending`);
  if (new Set(ivs.map(mod12)).size !== ivs.length)
    throw new Error(`shape ${name}: duplicate pitch class`);
}
for (const [n, ivs] of Object.entries(TRIAD_SHAPES)) assertShape(n, ivs);

// the two label tables must agree in domain, and each label's letter must sit
// within two semitones of its pitch — a typo in either table fails the load
for (const lab of Object.keys(LABEL_SEMIS)) {
  if (!(lab in LABEL_LETTER)) throw new Error(`label ${lab}: no letter offset`);
  const drift = mod12(LABEL_SEMIS[lab] - LETTER_PC[LETTERS[LABEL_LETTER[lab]]]);
  if (drift > 2 && drift < 10) throw new Error(`label ${lab}: letter/semis disagree`);
}

// the generated rules are interval arithmetic; assert the identities they claim:
// a major triad on the b7 sounds the 9 and the 11 …
if (mod12(LABEL_SEMIS.b7 + 4) !== LABEL_SEMIS[9] || mod12(LABEL_SEMIS.b7 + 7) !== LABEL_SEMIS[11])
  throw new Error("tension-b7 rule: triad on b7 does not sound 9 and 11");
// … and a major triad on the b5 sounds the b7 and the b9 (the tritone sub)
if (mod12(LABEL_SEMIS.b5 + 4) !== LABEL_SEMIS.b7 || mod12(LABEL_SEMIS.b5 + 7) !== LABEL_SEMIS.b9)
  throw new Error("tritone-sub rule: triad on b5 does not sound b7 and b9");

// ---------- triad classification ----------

/** classify a set of 3 pitch classes as a triad; returns every valid
 * (rootPc, quality) reading — one for maj/min/dim, three for aug. */
function classifyTriad(pcs) {
  const out = [];
  for (const r of pcs) {
    const rel = pcs.map((p) => mod12(p - r)).sort((a, b) => a - b);
    for (const [q, shape] of Object.entries(TRIAD_SHAPES))
      if (rel.every((v, i) => v === shape[i])) out.push({ rootPc: r, quality: q });
  }
  return out;
}

// ---------- spelling ----------

/** spell a candidate's root from its degree relative to the chord root;
 * fall back to plain pitch-class names when the degree spelling (or the
 * triad it implies) would need double accidentals (Bbb° → A°, A# → Bb). */
function spellRoot(parsed, rootPc, quality, rootLabel) {
  const off = LABEL_LETTER[rootLabel];
  if (off === undefined) return PLAIN_NAMES[rootPc];
  const letterIdx = (LETTERS.indexOf(parsed.root.name[0]) + off) % 7;
  const letter = LETTERS[letterIdx];
  let acc = mod12(rootPc - LETTER_PC[letter]);
  if (acc > 6) acc -= 12;
  if (Math.abs(acc) > 1) return PLAIN_NAMES[rootPc];
  // the spelling must also serve the triad's own members without doubles
  for (let k = 1; k < 3; k++) {
    const mLetter = LETTERS[(letterIdx + 2 * k) % 7];
    let mAcc = mod12(mod12(rootPc + TRIAD_SHAPES[quality][k]) - LETTER_PC[mLetter]);
    if (mAcc > 6) mAcc -= 12;
    if (Math.abs(mAcc) > 1) return PLAIN_NAMES[rootPc];
  }
  return letter + (acc === 1 ? "#" : acc === -1 ? "b" : "");
}

// ---------- the ranking policy (named preferences, derived per chord) ----------

function prefsFor(parsed) {
  const raw = parsed.intervals;
  const third = raw.includes(4) ? "3" : raw.includes(3) ? "b3" : null;
  const fifth = raw.includes(7) ? "5" : raw.includes(6) ? "b5" : raw.includes(8) ? "#5" : null;
  const sev =
    parsed.seventh === "dim7" ? "bb7" : raw.includes(11) ? "7" : raw.includes(10) ? "b7" : null;
  const has9 = raw.includes(14);
  const hasB9 = raw.includes(13);
  const dom = parsed.seventh === "7";
  const p = [];
  if (parsed.alterations.includes("alt"))
    p.push({ labels: ["b5", "b7", "b9"], rule: "tritone-sub" });
  if (dom && hasB9 && third === "3" && fifth === "5")
    p.push({ labels: ["b9", "3", "5"], rule: "b9-diminished" });
  if (parsed.seventh === "6" || parsed.seventh === "m6") {
    if (third) p.push({ labels: ["6", "R", third], rule: "relative-triad" });
  } else if (parsed.seventh) {
    if (!dom && has9 && fifth && sev)
      p.push({ labels: [fifth, sev, "9"], rule: "extension-color" });
    if (third && fifth && sev)
      p.push({ labels: [third, fifth, sev], rule: "rootless-seventh" });
    if ((dom && has9) || parsed.seventh === "7sus4")
      p.push({ labels: ["b7", "9", "11"], rule: "tension-b7" });
    if (dom && has9 && fifth)
      p.push({ labels: [fifth, "b7", "9"], rule: "extension-color" });
  } else if (third && fifth) {
    p.push({ labels: ["R", third, fifth], rule: "triad-identity" });
  }
  return p;
}

// every preference the policy can emit for an unaltered family must itself be
// a well-formed triad — asserted at load across the family probe space
{
  const probes = [
    { seventh: "maj7", triad: [0, 4, 7, 11] }, { seventh: "7", triad: [0, 4, 7, 10] },
    { seventh: "m7", triad: [0, 3, 7, 10] }, { seventh: "m7b5", triad: [0, 3, 6, 10] },
    { seventh: "dim7", triad: [0, 3, 6, 9] }, { seventh: "mMaj7", triad: [0, 3, 7, 11] },
    { seventh: "6", triad: [0, 4, 7, 9] }, { seventh: "m6", triad: [0, 3, 7, 9] },
    { seventh: "7sus4", triad: [0, 5, 7, 10] },
  ];
  for (const pr of probes)
    for (const ext of [[], [14], [13]]) {
      const fake = {
        seventh: pr.seventh, intervals: [...pr.triad, ...ext],
        alterations: [], root: { name: "C", pc: 0 },
      };
      for (const pref of prefsFor(fake)) {
        const pcs = pref.labels.map((l) => LABEL_SEMIS[l]);
        if (!classifyTriad(pcs).length)
          throw new Error(`preference ${pref.labels} for ${pr.seventh} is not a triad`);
      }
    }
}

// ---------- generated candidates (rules that may add a declared tension) ----------

function generatedCandidates(parsed) {
  const raw = parsed.intervals;
  const out = [];
  const alteredNine = raw.includes(13) || raw.includes(15);
  if (((parsed.seventh === "7" && raw.includes(14)) || parsed.seventh === "7sus4") && !alteredNine)
    out.push({ rootLabel: "b7", quality: "maj", labels: ["b7", "9", "11"], rule: "tension-b7" });
  if (parsed.alterations.includes("alt"))
    out.push({ rootLabel: "b5", quality: "maj", labels: ["b5", "b7", "b9"], rule: "tritone-sub" });
  return out;
}

// ---------- the derivation ----------

/**
 * upperStructures(parseChord("G9")) →
 * { candidates: [ { root:{pc,name}, quality:"dim", pcs:[11,2,5],
 *     degrees:["3","5","b7"], added:[], rule:"rootless-seventh", label:"B°" }, … ],
 *   bass: {pc,name},          // chord root, or the slash bass if written
 *   symmetric: false }        // true for °7 — rotate candidates per repeat
 *
 * candidates[0] is the default; the rest are honest alternatives, ranked.
 * Throws only on malformed input or an internal derivation error — a chord
 * with no honest triad inside it (Gsus4) returns candidates: [].
 */
export function upperStructures(parsed) {
  if (!parsed || !parsed.root || !Array.isArray(parsed.pcs) || !Array.isArray(parsed.intervals))
    throw new Error("upperStructures expects parseChord() output");
  const rootPc = parsed.root.pc;
  const found = new Map();

  const register = (triadRoot, quality, sourceRule, addedLabels, rootLabelHint) => {
    const triRoot = mod12(triadRoot);
    const key = triRoot + ":" + quality;
    if (found.has(key)) return;
    // members ordered as stacked from the triad root (the table's notation)
    const ordered = TRIAD_SHAPES[quality].map((iv) => mod12(triRoot + iv));
    const added = [];
    const degrees = ordered.map((pc, k) => {
      const i = parsed.pcs.indexOf(pc);
      if (i >= 0) {
        const iv = parsed.intervals[i];
        return iv === 9 && parsed.seventh === "dim7" ? "bb7" : IV_LABEL[iv];
      }
      const lab = addedLabels && addedLabels[k];
      if (!lab) throw new Error(`internal: pc ${pc} neither chord tone nor declared tension`);
      added.push(lab);
      return lab;
    });
    // structural assertions — never return an unasserted candidate
    if (new Set(ordered).size !== 3) throw new Error("internal: duplicate pc in candidate");
    for (let k = 0; k < 3; k++)
      if (mod12(rootPc + LABEL_SEMIS[degrees[k]]) !== ordered[k])
        throw new Error(`internal: degree ${degrees[k]} does not land on pc ${ordered[k]}`);
    const rootLabel = rootLabelHint || degrees[0];
    const name = spellRoot(parsed, triRoot, quality, rootLabel);
    found.set(key, {
      root: { pc: mod12(triRoot), name },
      quality,
      pcs: ordered,
      degrees,
      added,
      rule: sourceRule,
      label: name + TRIAD_SUFFIX[quality],
      relRoot: mod12(triRoot - rootPc),
    });
  };

  // rule 1 — chord-tone triads (triad root ≠ chord root)
  const pcs = parsed.pcs;
  for (let i = 0; i < pcs.length; i++)
    for (let j = i + 1; j < pcs.length; j++)
      for (let k = j + 1; k < pcs.length; k++) {
        const trio = [pcs[i], pcs[j], pcs[k]];
        const ids = classifyTriad(trio);
        if (!ids.length) continue;
        // canonical reading: the root nearest above the chord root, never the
        // chord root itself (that would be the chord's own triad, not an upper one)
        const upper = ids
          .filter((id) => mod12(id.rootPc - rootPc) !== 0)
          .sort((a, b) => mod12(a.rootPc - rootPc) - mod12(b.rootPc - rootPc))[0];
        if (!upper) continue;
        register(upper.rootPc, upper.quality, "chord-tone-triad", null, null);
      }

  // rules 2 & 3 — generated triads with declared added tensions
  for (const g of generatedCandidates(parsed))
    register(rootPc + LABEL_SEMIS[g.rootLabel], g.quality, g.rule, g.labels, g.rootLabel);

  // rule 4 — triad identity (plain triads are their own material)
  if (!parsed.seventh && TRIAD_SHAPES[parsed.triad]) {
    const members = TRIAD_SHAPES[parsed.triad].map((iv) => mod12(rootPc + iv));
    if (members.every((pc) => parsed.pcs.includes(pc)))
      register(rootPc, parsed.triad, "triad-identity", null, "R");
  }

  // ranking: named preference order, then fewest added tensions, then lowest root
  const prefs = prefsFor(parsed).map((p) => ({
    rule: p.rule,
    set: p.labels.map((l) => mod12(rootPc + LABEL_SEMIS[l])).sort((a, b) => a - b).join(","),
  }));
  const candidates = [...found.values()]
    .map((c) => {
      const setKey = [...c.pcs].sort((a, b) => a - b).join(",");
      const pi = prefs.findIndex((p) => p.set === setKey);
      if (pi >= 0) c.rule = prefs[pi].rule;
      return { c, pi: pi >= 0 ? pi : prefs.length };
    })
    .sort(
      (a, b) =>
        a.pi - b.pi ||
        a.c.added.length - b.c.added.length ||
        a.c.relRoot - b.c.relRoot
    )
    .map(({ c }) => {
      const { relRoot, ...pub } = c;
      return pub;
    });

  return {
    candidates,
    bass: parsed.bass
      ? { pc: parsed.bass.pc, name: parsed.bass.name }
      : { pc: rootPc, name: parsed.root.name },
    symmetric: parsed.seventh === "dim7",
  };
}

/** stable identity for a candidate, for config round-trips: "pc:quality".
 * findCandidate() re-matches a stored choice against a fresh derivation —
 * a stale key (the chord was edited) returns null and the caller falls back
 * to the default. */
export function candidateKey(c) {
  return mod12(c.root.pc) + ":" + c.quality;
}
export function findCandidate(candidates, key) {
  return candidates.find((c) => candidateKey(c) === key) || null;
}
