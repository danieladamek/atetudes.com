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
import { field } from "./field.mjs";
import { positionOf, materialIn } from "./position.mjs";

const mod12 = (x) => ((x % 12) + 12) % 12;

/** the roles a diatonic stack wears, by scale-step offset */
const OFFSET_ROLE = { 0: "R", 2: "3", 4: "5", 6: "7" };

/** diatonicTones(field, keyDeg, offsets) → [{ role, pc, keyDeg }] — the stack
 * of scale thirds on a degree, BY keyDeg (chords read keyDeg; child 1's law).
 * Chord VOCABULARY — qualities, dyad menus, shells — stays child 4's; this is
 * only the stack the field itself implies. */
export function diatonicTones(fld, keyDeg, offsets = [0, 2, 4, 6]) {
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
export function oneOfEach(tones, pool, { n = 1, centre } = {}) {
  if (!Array.isArray(tones) || !tones.length) throw new Error("oneOfEach: no tones");
  if (!Number.isInteger(n) || n < 1 || n > 3)
    throw new Error(`oneOfEach: the ceiling is 1..3 (the hand's reach), not ${n}`);
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
    return { notes: null, missing: missing.map((t) => t.role), unplaceable: true,
      collide: clash ? { string: +clash[0], roles: clash[1] } : null };
  }
  const notes = [...best].sort((a, b) => a.midi - b.midi);
  if (notes.length !== present.length) throw new Error("oneOfEach: lost a tone in placement");
  if (Object.values(perString(notes)).some((c) => c > n))
    throw new Error("oneOfEach: the chosen combination breaks its own ceiling");
  return { notes: assertAddressable(notes, "oneOfEach"), missing: missing.map((t) => t.role) };
}

/** everyOccurrence(tones, pool, { n }) → { notes, missing } — the ARPEGGIO:
 * every instance of the chord's tones the pool offers, at most n per string
 * (the lowest n on each, by fret — the hand under the frame), sorted by
 * pitch, each note wearing its role. */
export function everyOccurrence(tones, pool, { n = 3 } = {}) {
  if (!Number.isInteger(n) || n < 1 || n > 3)
    throw new Error(`everyOccurrence: the ceiling is 1..3, not ${n}`);
  const roleOf = new Map(tones.map((t) => [mod12(t.pc), t.role]));
  const missing = tones.filter((t) => !pool.some((m) => mod12(m.midi) === mod12(t.pc)))
    .map((t) => t.role);
  const out = [];
  for (const s of [...new Set(pool.map((m) => m.string))]) {
    const hits = pool.filter((m) => m.string === s && roleOf.has(mod12(m.midi)));
    out.push(...hits.slice(0, n).map((m) => ({ ...m, role: roleOf.get(mod12(m.midi)) })));
  }
  const notes = out.sort((a, b) => a.midi - b.midi);
  if (Object.values(perString(notes)).some((c) => c > n))
    throw new Error("everyOccurrence: the ceiling broke on the combination");
  return { notes: assertAddressable(notes, "everyOccurrence"), missing };
}

/** scaleTake(pool, { reach }) → { notes } — the scale object: every note the
 * box offers, capped only by the hand's reach. NO PLACEMENT — a scale is not
 * a chord, and the surface owes the label its reason. */
export function scaleTake(pool, { reach = 3 } = {}) {
  if (!Number.isInteger(reach) || reach < 1 || reach > 3)
    throw new Error(`scaleTake: the reach is 1..3, not ${reach}`);
  const out = [];
  for (const s of [...new Set(pool.map((m) => m.string))])
    out.push(...pool.filter((m) => m.string === s).slice(0, reach).map((m) => ({ ...m, role: null })));
  if (Object.values(perString(out)).some((c) => c > reach))
    throw new Error("scaleTake: the reach broke on the combination");
  return { notes: assertAddressable(out, "scaleTake") };
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
    throw new Error("selection: raising the ceiling CAUSED a second note on a string — Take and Placement have collapsed");

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
}
