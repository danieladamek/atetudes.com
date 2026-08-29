/* etude-walk.mjs — THE WALK (child 7; the TIME DIMENSION 260902): Play
 * walks the bars, and THE FIGURE WALKS THE SELECTION ACROSS THE CHORD'S
 * BEATS — Daniel's headline finding was that it did not: every note was
 * announced in one synchronous loop, the figure derived, drawn, asserted
 * and then discarded before anything sounded. Now the schedule is DERIVED
 * (walkSchedule — golden rule 1: span = beats × 60/bpm, step = span/steps,
 * no magic milliseconds) and the announcements are TIMED:
 *
 *   figure typed  it SEQUENCES, whatever the Take — the Take chooses the
 *                 material, the figure the order and the time (v0.9's
 *                 model: a picking pattern applies to whatever is under
 *                 the hand). The order comes from selection.mjs's orderBy —
 *                 the SAME derivation the bracket and the polyline draw —
 *                 never from the Triadetudes chain (drill/figure address by
 *                 slot; §4.2.3: the walk derives its own sound the way a
 *                 board derives its own pixels).
 *   no figure     a VOICING sounds together, as before; an ARPEGGIO (and a
 *                 scale) runs low → high across the chord's span.
 *   the timing    step 0 sounds NOW (the cold-play guarantee, 260819.2 —
 *                 the first chord of a cold Play was silent once already);
 *                 later steps are announced by view.setTimeout at their
 *                 derived offsets, cancelled on advance and on stop. The
 *                 NOTE contract carries no onset and audio-card plays on
 *                 arrival, so the walk times the ANNOUNCEMENTS — the cost
 *                 of touching neither the bus nor a foundational component
 *                 (the alternative is priced in the 260902 report).
 *
 * THE CONTRACT, all of it already ratified (bus.mjs):
 *   PLAY {run:true}   arm, and start the grid through CLOCK
 *                     {run:true, owner:"transport"}.
 *   BEAT              the clock owner's pulse; each chord spends its
 *                     DERIVED beats (beatsOf — meter and split cycle), then
 *                     the walk REQUESTS the next step. The chart line owns
 *                     the position: it wraps and echoes.
 *   STEP_CHANGED echo while armed, an arrived chord's SCHEDULE sounds, each
 *                     event as NOTE {midi} at its derived time; the mixer's
 *                     mutes hold, the reference rides at 0.
 *   CLOCK_STATE       running:false disarms and cancels every pending step;
 *                     meter and bpm are ADOPTED here from their owner (the
 *                     metronome — 260902: meter was hardcoded 4 and the
 *                     split audibly did nothing).
 */
import { field } from "../../engine/field.mjs";
import { positionOf, materialIn } from "../../engine/position.mjs";
import { makeRun } from "../../engine/string-run.mjs";
import { oneOfEach, everyOccurrence, scaleTake, orderBy } from "../../engine/selection.mjs";
import { progressionOf, chordAt, beatsOf, walkSchedule } from "../../engine/progression.mjs";
import { placeReference } from "../../engine/reference.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, PLAY, CLOCK, CLOCK_STATE, BEAT, NOTE,
  listen, announce } from "../bus.mjs";

export const etudeWalk = {
  id: "etude-walk",
  layer: "surface",
  requires: { surface: "multetudes" },
  mount_point: "hidden",
  order: 6,
  controls: [],
  markup: ``,
  styles: ``,

  mount(ctx) {
    const d = ctx.doc;
    let cfg = { key: "Bb", scale: "major", ref: 0, strings: [4, 3, 2, 1],
      startDeg: 4, nearFret: 3, object: "tetrad", take: "one", notesPer: 1,
      dyad: [3, 7], bass: "none", address: "pattern", figure: "", movement: "block",
      source: "cycle", cycle: "fourths", form: "ii-V-I", custom: "", start: 0, split: null };
    let meter = 4, bpm = 72;      // adopted from CLOCK_STATE — the metronome owns both
    let index = 0;
    let armed = false;
    let spent = 0;          // beats this chord has consumed; its own downbeat counts as 1
    let advancing = false;  // true only inside the walk's own on-beat advance
    let timers = [];
    const clearPending = () => { for (const t of timers) d.defaultView.clearTimeout(t); timers = []; };

    const derive = () => {
      const fld = field({ key: cfg.key, scale: cfg.scale, ref: cfg.ref });
      const prog = progressionOf(cfg, cfg.key, cfg.scale);
      if (index >= prog.chords.length) index = 0;
      return { fld, prog };
    };
    const chordBeats = (prog) => {
      const per = beatsOf(prog.bars, meter, cfg.split);
      const flat = [];
      prog.bars.forEach((bar, bi) => bar.forEach((_, k) => flat.push(per[bi][k])));
      return flat[index] ?? meter;
    };
    const soundCurrent = () => {
      const { fld, prog } = derive();
      const cur = chordAt(prog, index, fld, cfg.object, cfg.dyad);
      const run = makeRun(cfg.strings);
      const pos = positionOf({ field: fld, anchorString: Math.max(...run.strings),
        startDegree: cfg.startDeg, nearFret: cfg.nearFret });
      const pool = materialIn(pos, run.strings, fld);
      let sel = [];
      if (cfg.object === "scale") sel = scaleTake(pool).notes;
      else {
        const r = cfg.take === "all"
          ? everyOccurrence(cur.tones, pool, { n: cfg.notesPer })
          : oneOfEach(cur.tones, pool, { n: cfg.notesPer, centre: pos.centre });
        sel = r.notes || [];
      }
      /* THE REFERENCE DOES NOT SOUND THROUGH A REFUSED BAR (Daniel's
       * ruling, 260904). His own ratification is the reason: the reference
       * is "the reference tone on the bottom end for all of the harmony
       * that sits on top of it" — with no harmony on top, it has nothing to
       * be under. The bar is SILENT with the reason on the face; the boards
       * still DRAW the ref (where it would sit is informative, and the
       * sound⊆sight pin permits drawn-but-silent). A scale take keeps no
       * reference path at all, as before. */
      let refMidi = null;
      if (cfg.object !== "scale" && cfg.bass !== "none" && cur.degree >= 0 && sel.length) {
        const rp = placeReference(cfg.bass, cur.degree, fld, run.strings, pos);
        if (rp.note) refMidi = rp.note.midi;
      }
      /* THE SCHEDULE: the figure's order through orderBy — the same value
       * the bracket and the polyline draw — or the take's own shape */
      const fig = orderBy(cfg.address, cfg.figure, sel);
      /* 260905, the coupling severed: Take chooses the MATERIAL, the rail's
       * Movement control chooses together-or-sequence (a scale stays a run —
       * the box has no chord to sound as one). A typed figure sequences
       * regardless, as ruled. */
      const spread = cfg.object === "scale" || cfg.movement === "arpeggio";
      const { events } = walkSchedule(sel, fig.err ? null : fig.order,
        chordBeats(prog), bpm, { spread, refMidi });
      clearPending();
      for (const ev of events) {
        if (ev.at <= 0) { announce(d, NOTE, { midi: ev.midi }); continue; }
        timers.push(d.defaultView.setTimeout(() => {
          if (armed) announce(d, NOTE, { midi: ev.midi });
        }, ev.at * 1000));
      }
    };

    listen(d, PLAY, (m) => {
      if (!m || m.run !== true || armed) return;
      armed = true;
      /* THE ORDER MATTERS (260902 — found by reading the schedule's own
       * trace): the metronome's first BEAT arrives SYNCHRONOUSLY inside
       * announce(CLOCK), and with beatsLeft still 0 the walk requested the
       * next bar at once — every cold play since 260901 SKIPPED ITS FIRST
       * CHORD, and the gate's step pin only counted, so it passed. The
       * beats are seated and the chord sounded BEFORE the clock starts. */
      spent = 0;                             // the clock's first downbeat is this chord's beat 1
      soundCurrent();                        // the cold play sounds NOW
      announce(d, CLOCK, { run: true, owner: "transport" });
    });
    listen(d, BEAT, () => {
      if (!armed) return;
      /* a chord holds its derived beats WHOLE: its own downbeat is beat 1,
       * and the advance lands on the NEXT downbeat (260902 — the first fix
       * seated the count before the clock, then the trace showed the chord
       * still losing its last beat to its own downbeat) */
      spent += 1;
      if (spent > chordBeats(derive().prog)) {
        advancing = true;
        announce(d, STEP_CHANGED, { index: index + 1, request: true });
        advancing = false;
      }
    });
    listen(d, STEP_CHANGED, (m) => {
      if (!m || m.request === true || typeof m.index !== "number") return;
      const moved = m.index !== index;
      index = m.index;
      if (armed && moved) {
        /* an on-beat advance: the beat that carried it is the NEW chord's
         * beat 1. A manual jump (a chip click) starts fresh at 0. */
        spent = advancing ? 1 : 0;
        soundCurrent();
      }
    });
    listen(d, CLOCK_STATE, (m) => {
      if (!m) return;
      if (typeof m.meter === "number") meter = m.meter;
      if (typeof m.bpm === "number") bpm = m.bpm;
      if (m.running === false) { armed = false; clearPending(); }
    });
    listen(d, CONFIG_CHANGED, (m) => {
      if (!m || typeof m !== "object") return;
      for (const k of Object.keys(cfg))
        if (k in m) cfg = { ...cfg, [k]: Array.isArray(m[k]) ? [...m[k]] : m[k] };
    });
  },
};
