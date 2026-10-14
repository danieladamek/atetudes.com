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
import { field } from "./field.mjs";
import { positionOf, materialIn } from "./position.mjs";
import { makeRun } from "./string-run.mjs";
import { oneOfEach, everyOccurrence, scaleTake, orderBy, gripFit, materialFor, capOf, pickOf, tonePick, objectOf } from "./selection.mjs";
import { progressionOf, chordAt, beatsOf, walkSchedule, movementWord } from "./progression.mjs";
import { bassSeat, padSeat } from "./voices.mjs";
import { placeReference, centreDegreeOf, centreMaterialRef, reRead, soundedBass } from "./reference.mjs";

/** the walk's starting configuration (moved verbatim from etude-walk.mjs) — what a key the étude omits resolves to */
export const ETUDE_DEFAULTS = Object.freeze({ key: "Bb", scale: "major", ref: 0, tuning: null, gamut: null, strings: [4, 3, 2, 1],
  startDeg: 4, nearFret: 3, object: "tetrad", take: "one", notesPer: 3, sounded: "none", pad: false,
  tones: [1, 3, 5, 7], bass: "root", address: "pattern", figure: "", movement: "arpeggiate", repeat: false, centreSrc: "fixed",
  source: "cycle", cycle: "fourths", form: "ii-V-I", custom: "", start: 0, split: null });
export const DEFAULT_METER = 4;

/** a saved étude → the configuration the derivation reads, by RESTORE's rules (hub/etude-record.mjs restore and the
 * owners that hear it): the defaults, overlaid by what the étude carries; an absent gamut is the whole field; the
 * OBJECT is never stored (night 59) — it is derived from the tones (or the legacy `dyad`), tones winning over a v1
 * entry's stored label, exactly as harmony-card and progression-card derive it on restore */
export function etudeOf(saved) {
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
export function chordCount(cfg) {
  return progressionOf(cfg, cfg.key, cfg.scale).chords.length;
}

/** the beats chord `index` holds — beatsOf over the bars, under the meter and the split */
export function beatsAt(cfg, index, meter = DEFAULT_METER) {
  const prog = progressionOf(cfg, cfg.key, cfg.scale);
  const per = beatsOf(prog.bars, meter, cfg.split);
  const flat = [];
  prog.bars.forEach((bar, bi) => bar.forEach((_, k) => flat.push(per[bi][k])));
  return flat[index] ?? meter;
}

/** one chord of the étude: { index, symbol, degree, roman, beats, events } — events in beats from the chord's downbeat */
export function barAt(cfg, index, meter = DEFAULT_METER) {
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
export function etudeTimeline(saved) {
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
