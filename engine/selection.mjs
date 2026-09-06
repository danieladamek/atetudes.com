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
// 260918 (CR-1): the approach grammar and arithmetic, owned by motion.mjs — imported by their exported names (the door build blanks imports; an alias would name nothing)
import { parseMotion, describeMotion, approachMidi, placeNear } from "./motion.mjs";
import { OPEN_MIDI } from "./field.mjs";

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
export const STACK_DEPTH = { triad: 3, tetrad: 4, ninth: 5, eleventh: 6, thirteenth: 7 };

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
export function objectDegrees(object) {
  if (object === "scale") return null;
  const depth = object in STACK_DEPTH ? STACK_DEPTH[object]
    : (object === "dyad" || object === "shell") ? STACK_DEPTH.tetrad : null;
  if (depth === null) throw new Error(`objectDegrees: "${object}" is not an object this engine knows`);
  return Array.from({ length: depth }, (_, i) => 2 * i + 1);
}
/** the pick an object starts with: a stack is its whole stack; a dyad the
 * guide tones; a SHELL is R + the guide tones — Shell is a PRESET of the
 * selector (item 2): choosing it fills the tones as R,3,7, visibly */
export function defaultPick(object) {
  if (object === "scale") return null;
  if (object === "dyad") return [3, 7];
  if (object === "shell") return [1, 3, 7];
  return objectDegrees(object);
}
/** the ONE place the legacy word is known (movementWord's shape): a saved
 * étude from v0.4.x carries `dyad: [3,7]`; `tones` is tonight's word and
 * wins when both are present; neither → the object's default */
export const tonePick = (cfg) =>
  Array.isArray(cfg && cfg.tones) ? cfg.tones
  : Array.isArray(cfg && cfg.dyad) ? cfg.dyad : null;
const roleWord = (d) => (d === 1 ? "R" : String(d));
/** the pick a consumer is actually placing: the object's default when none
 * is chosen, null under a scale — what the bass is offered from (item 3) */
export const pickOf = (cfg) => {
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
/** degrees → the figure notation the face shows ("R,3,7") and back */
export const renderPick = (pick) => (pick || []).map(roleWord).join(",");
export const degreeOfTone = (t) => (t === "R" ? 1 : Number(t));

/** parseTones(text) → { tones: ["R","3",…] | null, err } — THE tones
 * tokenizer, shared by the figure (orderBy) and the selection: R 3 5 7 9 11
 * 13, longest first so 11 and 13 never half-read; every character is a
 * separator, a legal token, or refused BY NAME (register 21's manners).
 * A pattern-alphabet digit (1/2/4/6/8) is flagged so the FIGURE can offer
 * its mode-switch notice; the selection has no other mode and says the
 * plain refusal. Incomplete is not invalid — a trailing separator is
 * skipped, so "R," on the way to "R,3" never errs. */
export function parseTones(text) {
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
export function objectOffsets(object, pick) {
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
export function objectTones(parsed, object, pick) {
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
export function gripFit(tones, slots) {
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
 * the FIELD can carry at all. The field is the key, so a tone outside the
 * key can never be material: NOT IN THE KEY is a different absence from NOT
 * IN THIS FRAME, and both are teaching (child 7's own deliverable). */
/* CR-1 §3 (260918): this partition still answers only NOT IN THE KEY. An
 * offKey tone that reaches a board is legal only wearing a role (an approach
 * tonight; a chord-supplied member once role A is ruled — deferred, see the
 * register's chromatic-chord-alterations entry). §4's doctrine amendment is
 * deferred with it. */
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
export function orderBy(address, text, notes, ctx) {
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
  const toks = [];
  if (address === "pattern") {
    for (const ch of raw) {
      if (/[,\-\s.·]/.test(ch)) continue;
      if ("123456".includes(ch)) { toks.push(ch); continue; }
      return { order: null, err: `"${ch}" is not a string — strings are 1–6` };
    }
  } else {
    /* ONE PARSER (260917, item 1): the tones alphabet is parseTones' — the
     * selection field reads the same tokens and refuses in the same words;
     * only the mode-mismatch notice is the figure's own, because only the
     * figure has another mode to switch to */
    const r = parseTones(raw);
    if (r.err)
      return { order: null, err: r.patternDigit
        ? "this reads as a string PATTERN (1/2/4/6 are strings, not roles) — " +
          "the address is set to tones; switch it to pattern"
        : r.err };
    toks.push(...r.tones);
  }
  if (!toks.length) return { order: null, err: null };
  /* a selection whose notes carry no ROLES is the scale box (scaleTake) —
   * tones then address DEGREES FROM THE CENTRE (deg, already re-rooted by
   * the field), and a repeat is the ordinal over that degree's occurrences
   * low → high, wrapping — the pattern alphabet's own repeat law, ported.
   * Derived from the selection's own shape, never from a mode flag. */
  const degreeAddressed = notes.length > 0 && notes.every((n) => n.role == null);
  const degOfTok = (t) => (t === "R" ? 0 : (Number(t) - 1) % 7);
  const wordOf = (t) => t === "R" ? "root"
    : t + ({ "3": "rd" }[t] || "th");
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
    } else if (degreeAddressed) {
      const d = degOfTok(tok);
      const occ = notes.filter((n) => n.deg === d).sort((a, b) => a.midi - b.midi);
      if (!occ.length)
        return { order: null, err: `this box carries no ${wordOf(tok)} of the centre — step or widen the window` };
      const k = (used[tok] || 0) % occ.length;      // the same ordinal law
      used[tok] = (used[tok] || 0) + 1;
      order.push(occ[k]);
    } else {
      if (!"R357".includes(tok) || tok.length > 1)
        return { order: null, err: `${wordOf(tok)}s live in the SCALE box — a chord selection carries R, 3, 5, 7` };
      const hit = notes.find((n) => n.role === tok);
      if (!hit)
        return { order: null, err: `this selection carries no ${wordOf(tok)}` };
      order.push(hit);
    }
  }
  assertOrder(order, notes);
  return { order, err: null };
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
  if (parsed.error) return { order: null, err: "figure — " + parsed.error.message };
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
      if (!target) return { order: null, err: `this selection carries no ${wordOf(t.deg)}` };
    }
    const shift = target.deg == null ? 0 : (((target.deg - fld.degOf(target.midi)) % 7) + 7) % 7;
    for (const it of fig.approaches) {
      let midi;
      try { midi = approachMidi(it, target.midi, { scalePcs: fld.pcs, tonicPc: fld.pcs[0] }); }
      catch (e) { return { order: null, err: "figure — " + String(e.message || e).replace(/^motion: /, "") }; }
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
      const lo = ctx.pos.fLo - reach, hi = ctx.pos.fHi + reach;
      const dist = Math.abs(midi - target.midi);
      const octaves = [midi, ...[midi + 12, midi - 12].filter((m) => Math.abs(m - target.midi) === dist)];
      let pos = null, nearestMiss = null;
      for (const m of octaves) {
        const within = ctx.strings.filter((sn) => { const f = m - OPEN_MIDI[sn]; return f >= lo && f <= hi; });
        for (const sn of ctx.strings) { const f = m - OPEN_MIDI[sn]; if (f >= 0 && f <= 17) { const miss = f < lo ? lo - f : f > hi ? f - hi : 0; if (nearestMiss === null || miss < nearestMiss) nearestMiss = miss; } }
        if (!within.length) continue;
        try { pos = placeNear(m, target.fret, target.string, { set: within, open: OPEN_MIDI, nfrets: 15 }); midi = m; break; } catch (e) { /* the next equally-near octave */ }
      }
      if (!pos) {
        const rel = `${midi - target.midi > 0 ? "+" : ""}${midi - target.midi}`;
        return { order: null, err: nearestMiss === null
          ? `the approach ${rel} to the ${wordOf(t.deg)} has no playable position on these strings`
          : `the approach ${rel} to the ${wordOf(t.deg)} sits ${nearestMiss} fret${nearestMiss === 1 ? "" : "s"} beyond the hand — the ${wordOf(t.deg)} is at fret ${target.fret}${target.fret === ctx.pos.fLo || target.fret === ctx.pos.fHi ? ", at the window's edge" : ""} (frets ${ctx.pos.fLo}–${ctx.pos.fHi}), and the reach is ${reach}` };   // 261001: the edge clause only AT the edge (rule 14's sibling — template text that is said whatever the fret is a caption of nothing)
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
    if (OPEN_MIDI[n.string] + n.fret !== n.midi) throw new Error("orderBy: an approach's placement is dishonest");
    if (n.chromatic !== (fld.degOf(n.midi) < 0)) throw new Error("orderBy: an approach's function disagrees with the field");
  }
  assertOrder(order, notes);
  return { order, err: null, describe: describeMotion(parsed) };
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
