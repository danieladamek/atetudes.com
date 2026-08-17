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
export function makeZone({ string, frets }) {
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
 *   FREE  the grip chosen by smoothest voice-leading, anchor released; the
 *         étude begins in the zone and is then SEEN to leave it, so the seed
 *         anchor stays and only the pivot term drops (Daniel, 2026-08-10)
 *   LINE  placed freely along the set by the §6.1.2 rule
 *
 * Tie rules are NAMED because they are the pinned behaviour of every shipped
 * étude: Free ties resolve to the lower neck position; Grip ties keep the
 * first candidate, which is the generator's inversion order (root position
 * first) — stated and asserted rather than accidental.
 */
export const PLACEMENTS = {
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
export function voiceLeadCost(v, prev) {
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
export function placementCost(v, prev, pivotIndex, zone, pivotW, anchorW) {
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
export function meanFret(v) {
  return v.notes.reduce((a, n) => a + n.fret, 0) / v.notes.length;
}

/** total voice-leading movement across a voiced sequence, in semitones; a
 * wrapped transition is measured against the previous voicing an octave down */
export function movementTotal(voic) {
  let t = 0;
  for (let i = 1; i < voic.length; i++) {
    if (!voic[i] || !voic[i - 1]) continue;
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
export function lineVoicing(pcs, { zone, zoneNotes, positionsFor, setLowHigh, maxPerString = 3 }) {
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
export function chooseVoicings(seq, opts) {
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
