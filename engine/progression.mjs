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
import { CYCLES } from "./tetrad-sequence.mjs";
import { resolveStructure } from "./structures.mjs";
import { parseChord, resolveRoman } from "./chord.mjs";
import { parseAtchart, serializeAtchart } from "./atchart.mjs";
import { diatonicTones, objectTones, fieldPartition, objectOffsets } from "./selection.mjs";
import { compositeOver } from "./reference.mjs";

const mod7 = (x) => ((x % 7) + 7) % 7;
const mod12 = (x) => ((x % 12) + 12) % 12;

/** the derived walk: home, every degree the step visits, home again.
 * The COUNT is an output — nothing here says "eight". */
export function cycleDegreesWalk(cycle, start = 0) {
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
export function progressionOf(cfg, key, scale = "major") {
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

/** beats per chord — the family transport's own sentence, "chords take the
 * bar's slots in order", applied whole (corrected 260902 — Daniel's finding:
 * 1+1+1+1 audibly did nothing):
 *   - a bar with as many chords as the split has slots: the slots ARE the
 *     beats;
 *   - a bar with ONE chord under a multi-slot split: the chord takes the
 *     NEXT SLOT of the split's cycle — so under 1+1+1+1 a cycle's chords
 *     change every beat, four to the metric bar, exactly as v0.9's
 *     regrouping sounds (register 14 amended: the timing follows v0.9, the
 *     bar GROUPING still follows the chart);
 *   - otherwise the meter divides evenly, remainder to the front — an
 *     integer partition, derived, summing to the meter. */
export function beatsOf(bars, meter = 4, split = null) {
  const out = [];
  let slot = 0;                    // the split cycle, walked across one-chord bars
  for (const bar of bars) {
    const n = bar.length;
    if (split && Array.isArray(split) && split.length === n) { out.push([...split]); continue; }
    if (split && Array.isArray(split) && split.length > 1 && n === 1) {
      out.push([split[slot % split.length]]); slot++; continue;
    }
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
 * Nothing truncates: any number of steps subdivides the span (the report
 * states why the "more steps than the span can carry" case cannot arise
 * under even subdivision). Every schedule is asserted before it is returned:
 * times ascending within [0, span), the event count equal to the material's.
 */
export function walkSchedule(sel, order, beats, bpm, { spread = false, refMidi = null } = {}) {
  if (!(beats > 0) || !(bpm > 0))
    throw new Error("walkSchedule: beats and bpm must be positive — the span is derived from them");
  const span = beats * 60 / bpm;
  const seq = order && order.length ? order
    : spread ? [...sel].sort((a, b) => a.midi - b.midi)
    : sel;
  const together = !(order && order.length) && !spread;
  const step = seq.length > 1 && !together ? span / seq.length : 0;
  const events = seq.map((nt, k) => ({ midi: nt.midi, at: together ? 0 : k * step }));
  /* the reference carries its ROLE (260906): it is the bass line's note, and
   * whoever realises audio may route it to the bass bus — the additive-field
   * precedent (STEP_CHANGED's attack) followed for NOTE */
  if (refMidi != null) events.unshift({ midi: refMidi, at: 0, role: "bass" });
  for (let i = 1; i < events.length; i++)
    if (events[i].at < events[i - 1].at)
      throw new Error("walkSchedule: the schedule must ascend — time only runs forward");
  for (const e of events)
    if (e.at < 0 || e.at >= span - 1e-9)
      throw new Error("walkSchedule: a step left the chord's span — steps never spill into the next chord " +
        "(a step AT the span is the next chord's downbeat, which is spilling)");
  const expected = seq.length + (refMidi != null ? 1 : 0);
  if (events.length !== expected)
    throw new Error("walkSchedule: an event went missing — the schedule must carry every note it was given");
  return { events, span };
}

/** LEGACY WORDS (260913 rename, the PO's ruling — a block IS a strum):
 * Multetudes v0.1.0 saved études carry movement "block"/"arpeggio"; this
 * map is the one place the old words are known, applied where a config
 * merges in. */
export const movementWord = (w) =>
  ({ block: "strum", arpeggio: "arpeggiate" })[w] || w;

/** the canonical chart body for a progression's bars — THROUGH the format
 * engine, so reading a palette-written chart and re-serialising it is a
 * byte fixed point (asserted in the tests, demanded by §8). */
export function chartBodyOf(chords, bars, fld) {
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
 * chordAt(prog, index, fld, object, dyad) → THE ONE DERIVATION every board
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
export function chordAt(prog, index, fld, object, dyad = [3, 7]) {
  if (!prog || !Array.isArray(prog.chords) || !prog.chords.length)
    throw new Error("chordAt: no progression");
  const c = prog.chords[((index % prog.chords.length) + prog.chords.length) % prog.chords.length];
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
  const romanOf = (degree, pcs) => {
    if (degree < 0) return "—";
    const third = mod12(pcs[1] - pcs[0]), fifth = pcs.length > 2 ? mod12(pcs[2] - pcs[0]) : 7;
    const base = ROMAN[degree];
    return (third === 3 ? base.toLowerCase() : base) + (third === 3 && fifth === 6 ? "°" : "");
  };
  if (c.kind === "diatonic") {
    const degree = c.degree, rootPc = fld.pcs[degree];
    if (object === "scale")
      return { kind: c.kind, degree, rootPc, symbol: fld.notes[degree].name,
        roman: ROMAN[degree], tones: null, absent: [], offKey: [] };
    const tones = diatonicTones(fld, degree, objectOffsets(object, dyad));
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
  const ot = objectTones(c.parsed, object, dyad);
  const part = fieldPartition(ot.tones, fld);
  return { kind: c.kind, degree, rootPc, symbol: c.symbol,
    roman: romanOf(degree, c.parsed.pcs),
    tones: part.inKey, absent: ot.absent, offKey: part.offKey.map((t) => t.role) };
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
