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
import { parseChord } from "./chord.mjs";

/** four voices. Named so a reader never has to count. */
export const ARITY = 4;

/** the drop families, as ONE rule with a parameter: which voice from the top
 * falls an octave. Close position is the identity — drop nothing. */
export const FAMILIES = { close: 0, drop2: 2, drop3: 3 };

/** the shells, as positions in the chord's own tone list. A shell is the
 * guide-tone pair over the root: the 5th is what it leaves out. */
export const SHELLS = { "R-3-7": [0, 1, 3], "R-7-3": [0, 3, 1] };

const asc = (a) => a.every((x, i) => i === 0 || x > a[i - 1]);

/** The chord's seventh-chord core: root, third, fifth, seventh. Extensions
 * stack above it (chord.mjs returns ascending intervals), so the core is the
 * first four — derived from that ordering, not from a per-quality table. */
export function coreTetrad(chord) {
  const iv = chord.intervals;
  if (iv.length < ARITY)
    throw new Error(
      `${chord.symbol}: a tetrad voicing needs four tones, this chord has ${iv.length} ` +
      `(${iv.join(",")}) — triads belong to Triadetudes' generator`);
  return iv.slice(0, ARITY);
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
export function closeStack(core, inv) {
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
export function dropVoice(stack, n) {
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
export function shapesOf(chord, family) {
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
export function placeOnSet(shape, chord, { set, nfrets = 22, minFret = 0, strings = null }) {
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
export function assertUniformArity(cands, what = "candidate stream") {
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
export function tetradCandidates(chord, { set, nfrets = 22, strings = null, families = Object.keys(FAMILIES) }) {
  const ch = typeof chord === "string" ? parseChord(chord) : chord;
  const out = [];
  for (const family of families)
    for (const shape of shapesOf(ch, family).sort((a, b) => a.bass - b.bass))
      out.push(...placeOnSet(shape, ch, { set, nfrets, strings }));
  return assertUniformArity(out, `tetradCandidates(${ch.symbol})`);
}

/** Shells — ARITY 3, deliberately a separate door out of this module. A shell
 * stream and a tetrad stream must never be concatenated; see the arity law. */
export function shellCandidates(chord, { set, nfrets = 22, strings = null, orders = Object.keys(SHELLS) }) {
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
export function rootlessTetrad(chord) {
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
