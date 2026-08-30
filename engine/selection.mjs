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
import { parseChord } from "./chord.mjs";
import { field } from "./field.mjs";
import { positionOf, materialIn } from "./position.mjs";

const mod12 = (x) => ((x % 12) + 12) % 12;

/** the roles a diatonic stack wears, by scale-step offset */
const OFFSET_ROLE = { 0: "R", 2: "3", 4: "5", 6: "7" };

/** objectOffsets(object, dyad) → the scale-step offsets an object selects,
 * or null for a scale (the whole box — scaleTake's territory). CHILD 4's
 * consolidation: this derivation was spelled `object === "triad" ? [0,2,4]
 * : [0,2,4,6]` in FIVE hub modules — the duplicated-fact defect in exactly
 * the shape coreTetrad's error message warned about. One derivation now:
 *   - a stack of diatonic thirds is offsets 2i (triad n=3, tetrad n=4);
 *   - a DYAD is any two chord tones named by degree (default 3+7, the guide
 *     tones): offset = degree − 1, pitch-class math, never a pair table;
 *   - a SHELL is the root under the guide-tone dyad: degrees [1,3,7].
 * Unknown objects and malformed dyads refuse by name (the loud-refusal law). */
export function objectOffsets(object, dyad = [3, 7]) {
  if (object === "scale") return null;
  if (object === "triad" || object === "tetrad")
    return Array.from({ length: object === "triad" ? 3 : 4 }, (_, i) => 2 * i);
  if (object === "shell") return [1, 3, 7].map((d) => d - 1);
  if (object === "dyad") {
    if (!Array.isArray(dyad) || dyad.length !== 2 || dyad[0] === dyad[1] ||
        dyad.some((d) => ![1, 3, 5, 7].includes(d)))
      throw new Error(`objectOffsets: a dyad is two distinct chord-tone degrees from 1/3/5/7, not ${JSON.stringify(dyad)}`);
    return dyad.map((d) => d - 1);
  }
  throw new Error(`objectOffsets: "${object}" is not an object this engine knows`);
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
export function objectTones(parsed, object, dyad = [3, 7]) {
  if (!parsed || !parsed.root || !Array.isArray(parsed.intervals))
    throw new Error("objectTones expects parseChord() output");
  const offsets = objectOffsets(object, dyad);
  if (offsets === null)
    throw new Error("objectTones: a scale is not a chord object — the scale path is scaleTake's");
  const SLOT_ROLE = ["R", "3", "5", "7"];
  const tones = [], absent = [];
  for (const off of offsets) {
    const i = off / 2;
    if (i < parsed.intervals.length)
      tones.push({ role: SLOT_ROLE[i], pc: (((parsed.root.pc + parsed.intervals[i]) % 12) + 12) % 12 });
    else absent.push(SLOT_ROLE[i]);
  }
  return { tones, absent };
}

/** fieldPartition(tones, fld) → { inKey, offKey } — which of a chord's tones
 * the FIELD can carry at all. The field is the key, so a tone outside the
 * key can never be material: NOT IN THE KEY is a different absence from NOT
 * IN THIS FRAME, and both are teaching (child 7's own deliverable). */
export function fieldPartition(tones, fld) {
  const inKey = [], offKey = [];
  for (const t of tones) (fld.degOf(t.pc) >= 0 ? inKey : offKey).push(t);
  return { inKey, offKey };
}

/** diatonicTones(field, keyDeg, offsets) → [{ role, pc, keyDeg }] — the stack
 * of scale thirds on a degree, BY keyDeg (chords read keyDeg; child 1's law).
 * Offsets normally arrive from objectOffsets; this is only the stack the
 * field itself implies. */
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
    return { notes: null, missing: missing.map((t) => t.role), unplaceable: true,
      collide: clash ? { string: +clash[0], roles: clash[1] } : null,
      resolvesAt };
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
export function everyOccurrence(tones, pool, { n = 3 } = {}) {
  if (!Number.isInteger(n) || n < 1 || n > 3)
    throw new Error(`everyOccurrence: the ceiling is 1..3, not ${n}`);
  const roleOf = new Map(tones.map((t) => [mod12(t.pc), t.role]));
  const missing = tones.filter((t) => !pool.some((m) => mod12(m.midi) === mod12(t.pc)))
    .map((t) => t.role);
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
  // leftovers: remaining capacity takes remaining occurrences, fret order
  const per = {};
  for (const m of chosen) per[m.string] = (per[m.string] || 0) + 1;
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
  // strings are full of DISTINCT tones is an honest loss, not a violation —
  // two tones sharing one one-slot string is the Am case.)
  const present = new Set(notes.map((x) => x.role));
  const counts = {};
  for (const x of notes) counts[x.role] = (counts[x.role] || 0) + 1;
  const uncoveredPcs = pcs.filter((pc) => !present.has(roleOf.get(pc)));
  for (const x of notes)
    if (counts[x.role] > 1
        && uncoveredPcs.some((pc) => cands.get(x.string).some((m) => mod12(m.midi) === pc)))
      throw new Error("everyOccurrence: a duplicate held a slot an uncovered tone could take");
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
export function offersOn(notes) {
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
export function orderBy(address, text, notes) {
  const raw = String(text || "").toUpperCase();
  if (/[()]/.test(raw))
    return { order: null, err: "approaches — (…) — are not built yet: an approach note is " +
      "chromatic, off the field, and the field's rendering law for off-field notes is undecided" };
  if (/[\[\]]/.test(raw))
    return { order: null, err: "[…] is a TARGET in the ratified motion grammar — the order bracket is { }" };
  /* THE MODE MISMATCH, noticed by the alphabet (260902 — Daniel typed
   * R-3-5-7 under pattern and was told a true-but-useless fact about string
   * 5). R and 7 are not string numbers; 1/2/4/6 are not tone names. A figure
   * carrying the OTHER mode's letters is named as such, with the switch
   * offered, instead of half-reading it in the wrong alphabet. Tokens legal
   * in both alphabets (3, 5) stay ambiguous and read as the current mode. */
  if (address === "pattern" && /R|7/.test(raw))
    return { order: null, err: "this reads as a TONES figure (R and 7 are roles, not strings) — " +
      "the address is set to pattern; switch it to tones" };
  if (address !== "pattern" && /[12468]/.test(raw))
    return { order: null, err: "this reads as a string PATTERN (1/2/4/6 are strings, not roles) — " +
      "the address is set to tones; switch it to pattern" };
  const toks = address === "pattern" ? (raw.match(/[1-6]/g) || []) : (raw.match(/R|[357]/g) || []);
  if (!toks.length) return { order: null, err: null };
  const order = [];
  const used = {};
  for (const tok of toks) {
    if (address === "pattern") {
      const s = +tok;
      const onStr = notes.filter((n) => n.string === s).sort((a, b) => a.fret - b.fret);
      if (!onStr.length)
        return { order: null, err: `string ${s} carries nothing in this selection` };
      const k = (used[s] || 0) % onStr.length;      // A REPEAT IS THE ORDINAL, wrapping
      used[s] = (used[s] || 0) + 1;
      order.push(onStr[k]);
    } else {
      const hit = notes.find((n) => n.role === tok);
      if (!hit)
        return { order: null, err: `this selection carries no ${tok === "R" ? "root" : tok + (tok === "3" ? "rd" : "th")}` };
      order.push(hit);
    }
  }
  // derived, then asserted: every ordered step is a note of the selection
  for (const n of order)
    if (!notes.includes(n)) throw new Error("orderBy: an ordered step left the selection");
  return { order, err: null };
}

/** the bracket beside each string: which steps of the order land there —
 * {1,3} beside string 4 means steps 1 and 3. Derived from the order itself,
 * never tracked separately. */
export function bracketOf(order) {
  const per = {};
  if (!order) return per;
  order.forEach((n, i) => { (per[n.string] ??= []).push(i + 1); });
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
