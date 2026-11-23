/* collection-walk.mjs — THE SCALE OF CHORDS WALKED ON A STRING SET (Chromatetudes child 2, 261122).
 *
 * Brief: notes/specs/chromatetudes — the collection door, v0.1.md §2; diminetudes-prd.md §2.4.
 * Pure: no DOM, no audio, no state.
 *
 * For a key, a collection, a stacking interval, a voicing family and a string
 * set: every placed voicing of the collection's walk from the bottom of the neck
 * to the top. Position n holds the chord on degree n mod N.
 *
 * NO SECOND VOICING GENERATOR. Tetrads (6, m6, dim7) come from
 * tetrad-voicings.mjs (shapesOf + placeOnSet), triads (augmented) from
 * triad-voicings.mjs (triadCandidates). The walk only CHOOSES among their
 * candidates: from one placement, each next position is the candidate of the
 * next chord in which every voice has moved exactly one collection step on its
 * own string. If the stepped voicing is on the neck and no candidate matches it,
 * the walk law has broken and this module throws, by name.
 *
 * FAMILIES — WHAT SHIPS, MEASURED 261122 (child 2's "verify first"):
 *   drop 2   tetrads, on the family's three adjacent four-string sets (STRING_SETS)
 *   close    triads — the only family triadCandidates offers (closed rotations
 *            walked up a three-string set)
 *   drop 3   WITHHELD. It wants a skipped set (6-4-3-2, 5-3-2-1); the family's
 *            four-string sets are adjacent runs only (tetrad-sequence.mjs's
 *            STRING_SETS, the Multetudes gap analysis's G6). Not faked, not
 *            shipped silently smaller: refused here by name, said in the door.
 *
 * A shape that recurs before the octave (a dim7 every three frets) is the
 * symmetric collections' lesson, not a defect; nothing here asserts against it.
 */
import { parseChord } from "./chord.mjs";
import { shapesOf, placeOnSet } from "./tetrad-voicings.mjs";
import { triadCandidates } from "./triad-voicings.mjs";
import { collection, chordOn } from "./collection.mjs";
import { STRING_SETS } from "./tetrad-sequence.mjs";
import { OPEN_MIDI } from "./field.mjs";
import { setLabel } from "./open-string.mjs";

const mod = (n, m) => ((n % m) + m) % m;

/** the neck the family draws — frets 0..15 */
export const NFRETS = 15;

/** the families, by arity; `withheld` carries the reason a family is not offered */
export const WALK_FAMILIES = {
  drop2: { arity: 4, label: "drop 2" },
  drop3: { arity: 4, label: "drop 3", withheld: "drop 3 wants a skipped string set (6-4-3-2, 5-3-2-1) and this door's four-string sets are adjacent runs — withheld, not faked" },
  close: { arity: 3, label: "close" },
};

/** the string sets of an arity: the family's four-string sets, and three-string sets by the same sliding rule */
export function setsFor(arity) {
  if (arity === 4) return STRING_SETS.map((s) => ({ strings: s.strings, opens: s.opens, label: s.label }));
  if (arity === 3) return [0, 1, 2, 3].map((offset) => {
    const strings = [6, 5, 4].map((s) => s - offset);   // low → high, sliding a window of three as STRING_SETS slides four
    return { strings, opens: strings.map((s) => OPEN_MIDI[s]), label: setLabel(strings, OPEN_MIDI, OPEN_MIDI) };   // the DEFAULT's opens, as STRING_SETS
  });
  throw new Error(`collection-walk: no string sets for ${arity} voices`);
}

/** the families offered for an arity — the withheld one is named, never listed as offered */
export const familiesFor = (arity) => Object.keys(WALK_FAMILIES).filter((f) => WALK_FAMILIES[f].arity === arity && !WALK_FAMILIES[f].withheld);

const SUFFIX = { "6": "6", m6: "m6", dim7: "dim7", aug: "aug" };

/** a chordOn result as a chord.mjs chord, rooted on the lowest member degree chord.mjs accepts as a root */
export function chordOf(coll, ch) {
  const rootDeg = [...ch.members].sort((a, b) => a - b).find((m) => ch.roots.includes(coll.notes[m].pc));
  const parsed = parseChord(coll.notes[rootDeg].name + SUFFIX[ch.quality]);
  const want = [...ch.pcs].sort((a, b) => a - b).join(), got = [...parsed.pcs].sort((a, b) => a - b).join();
  if (want !== got) throw new Error(`collection-walk: ${parsed.symbol} is {${got}}, the cycle is {${want}}`);
  return parsed;
}

/** every placement of one chord of the walk, from the family's own generator */
function candidates(chord, family, set, nfrets) {
  const all = WALK_FAMILIES[family].arity === 3
    ? triadCandidates(chord, { set: set.opens, strings: set.strings, nfrets, reach: 0 })
    : shapesOf(chord, family).flatMap((shape) => placeOnSet(shape, chord, { set: set.opens, strings: set.strings, nfrets }));
  /* a symmetric chord's inversions are one shape: a dim7's four drop-2 inversions place the same notes,
   * so a placement is kept once (by its notes, never by its label) */
  const seen = new Set();
  return all.map((v) => v.notes).filter((ns) => !seen.has(key(ns)) && seen.add(key(ns)));
}

const key = (notes) => notes.map((n) => n.midi).join(",");

/**
 * walk({ key, id, k, family, set, nfrets }) → { coll, k, family, set, N, positions }
 * set: one of setsFor(arity) ({ strings, opens }). positions, low to high:
 * [{ n, degree, chord: chordOn result, symbolRoot, notes: [{ string, fret, midi, slot, degree, name, degName, fam }] }]
 * — n is the walk index (0 is the lowest position on the neck).
 */
export function walk({ key: tonic, id, k, family, set, nfrets = NFRETS }) {
  const fam = WALK_FAMILIES[family];
  if (!fam) throw new Error(`collection-walk: unknown family "${family}" — the named ones are ${Object.keys(WALK_FAMILIES).join(", ")}`);
  if (fam.withheld) throw new Error(`collection-walk: ${fam.withheld}`);
  const coll = collection({ key: tonic, id });
  const N = coll.N;
  const chords = Array.from({ length: N }, (_, d) => chordOn(coll, d, k));
  if (chords[0].members.length !== fam.arity)
    throw new Error(`collection-walk: ${coll.name} at k=${k} stacks ${chords[0].members.length}-note chords; ${fam.label} voices ${fam.arity}`);
  if (!set || set.opens.length !== fam.arity) throw new Error(`collection-walk: ${fam.label} needs a ${fam.arity}-string set`);
  const parsed = chords.map((c) => chordOf(coll, c));
  const cands = parsed.map((p) => candidates(p, family, set, nfrets));

  // the collection's pitch classes in order, so a midi's degree and its one-step neighbours are arithmetic
  const degOfPc = new Map(coll.notes.map((n) => [n.pc, n.degree]));
  const stepMidi = (midi, dir) => {
    const d = degOfPc.get(mod(midi, 12));
    if (d === undefined) throw new Error(`collection-walk: ${midi} is not in ${coll.key} ${coll.name}`);
    return dir > 0 ? midi + coll.steps[d] : midi - coll.steps[mod(d - 1, N)];
  };
  const onNeck = (notes) => notes.every((n) => n.fret >= 0 && n.fret <= nfrets);
  const stepped = (notes, dir) => notes.map((n) => { const midi = stepMidi(n.midi, dir); return { ...n, midi, fret: midi - set.opens[n.slot] }; });
  const matchIn = (pool, notes, at) => {
    const hit = pool.filter((c) => key(c) === key(notes) && c.every((x, i) => x.string === notes[i].string));
    if (hit.length !== 1) throw new Error(`collection-walk: the walk law broke at degree ${at} of ${coll.key} ${coll.name} (k=${k}, ${fam.label}, ` +
      `strings ${set.strings.join("-")}) — ${hit.length} placements are one collection step from the last`);
    return hit[0];
  };

  // seed: the lowest placement of the chord on degree 0, then step down to the bottom and up to the top
  if (!cands[0].length) throw new Error(`collection-walk: no ${fam.label} placement of ${parsed[0].symbol} on strings ${set.strings.join("-")}`);
  const seed = [...cands[0]].sort((a, b) => a[0].midi - b[0].midi)[0];
  const down = [];
  let cur = seed, d = 0;
  for (;;) {
    const nx = stepped(cur, -1);
    if (!onNeck(nx)) break;
    d = mod(d - 1, N);
    cur = matchIn(cands[d], nx, d);
    down.unshift({ degree: d, notes: cur });
  }
  const up = [{ degree: 0, notes: seed }];
  cur = seed; d = 0;
  for (;;) {
    const nx = stepped(cur, +1);
    if (!onNeck(nx)) break;
    d = mod(d + 1, N);
    cur = matchIn(cands[d], nx, d);
    up.push({ degree: d, notes: cur });
  }
  const noteOf = (midi) => coll.notes[degOfPc.get(mod(midi, 12))];
  const positions = [...down, ...up].map((p, n) => ({
    n, degree: p.degree, chord: chords[p.degree], parsed: parsed[p.degree],
    notes: p.notes.map((x) => { const c = noteOf(x.midi); return { string: x.string, fret: x.fret, midi: x.midi, slot: x.slot,
      degree: c.degree, name: c.name, degName: c.degName, fam: c.fam }; }),
  }));
  const w = { coll, k, family, set, N, nfrets, positions };
  assertWalk(w, cands);
  return w;
}

/** THE WALK LAW, asserted on the placed result (child 2's four clauses, plus coverage) */
export function assertWalk(w, cands = null) {
  const { coll, N, positions, nfrets } = w;
  const say = (m) => { throw new Error(`collection-walk: ${coll.key} ${coll.name} k=${w.k} ${w.family} strings ${w.set.strings.join("-")}: ${m}`); };
  if (positions.length < 2) say("fewer than two positions on the neck");
  const deg = new Map(coll.notes.map((n) => [n.pc, n.degree]));
  positions.forEach((p, n) => {
    // every note a real string and fret within the neck
    for (const x of p.notes) {
      if (!w.set.strings.includes(x.string)) say(`position ${n} plays string ${x.string}, outside the set`);
      if (!(x.fret >= 0 && x.fret <= nfrets)) say(`position ${n} plays fret ${x.fret}, off the neck`);
      if (x.midi !== w.set.opens[x.slot] + x.fret) say(`position ${n}: string ${x.string} fret ${x.fret} is not midi ${x.midi}`);
    }
    // the pitch-class set at n is chordOn for its degree (and the degrees run consecutively)
    const want = chordOn(coll, p.degree, w.k).pcs.slice().sort((a, b) => a - b).join();
    const got = [...new Set(p.notes.map((x) => mod(x.midi, 12)))].sort((a, b) => a - b).join();
    if (want !== got) say(`position ${n} holds {${got}}, the chord on degree ${p.degree} is {${want}}`);
    if (n > 0) {
      const q = positions[n - 1];
      if (p.degree !== mod(q.degree + 1, N)) say(`position ${n} is degree ${p.degree} after ${q.degree}`);
      // every voice moves exactly one collection step, on its own string
      p.notes.forEach((x, i) => {
        const y = q.notes[i];
        if (x.string !== y.string) say(`voice ${i} changed string between positions ${n - 1} and ${n}`);
        const dy = deg.get(mod(y.midi, 12));
        if (x.midi - y.midi !== coll.steps[dy]) say(`voice ${i} moved ${x.midi - y.midi} semitones from ${y.midi}; one step is ${coll.steps[dy]}`);
      });
    }
    // position n+N is position n twelve frets up
    if (n + N < positions.length) positions[n + N].notes.forEach((x, i) => {
      if (x.fret !== p.notes[i].fret + 12 || x.string !== p.notes[i].string) say(`position ${n + N} is not position ${n} twelve frets up`);
    });
  });
  // coverage: every on-neck placement of every chord lies on the walk — it is THE walk, not a walk
  if (cands) cands.forEach((pool, d) => pool.forEach((c) => {
    // by notes, not by degree: in the sixth-diminished C6 is the chord on degrees 0, 2, 4 and 6 alike
    if (!positions.some((p) => key(p.notes) === key(c))) say(`the placement ${key(c)} of degree ${d} is not on the walk`);
  }));
  return w;
}

/** the transport's step: position n → n±1, held at the ends */
export const stepOf = (w, n, dir) => Math.max(0, Math.min(w.positions.length - 1, n + dir));
