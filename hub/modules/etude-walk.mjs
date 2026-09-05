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
import { oneOfEach, everyOccurrence, scaleTake, orderBy, gripFit } from "../../engine/selection.mjs";
import { progressionOf, chordAt, beatsOf, walkSchedule, movementWord } from "../../engine/progression.mjs";
import { placeReference, centreDegreeOf, centreMaterialRef, reRead } from "../../engine/reference.mjs";
// 260917 item 1: the pick, and the ONE alias site for saved études' `dyad`
import { tonePick, pickOf } from "../../engine/selection.mjs";
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
      tones: [1, 3, 5, 7], bass: "root", address: "pattern", figure: "", movement: "strum", repeat: false, centreSrc: "fixed",
      source: "cycle", cycle: "fourths", form: "ii-V-I", custom: "", start: 0, split: null };
    let meter = 4, bpm = 72;      // adopted from CLOCK_STATE — the metronome owns both
    let index = 0;
    let armed = false;
    let spent = 0;          // beats this chord has consumed; its own downbeat counts as 1
    let advancing = false;  // true only inside the walk's own on-beat advance
    let timers = [];
    /* THE AUDITION (260910, item 1): a chip click while the clock is stopped
     * sounds the walk's OWN current selection — the exact notes the board
     * draws, through soundCurrent()'s one path. NOT a restore: what used to
     * sound on a stopped click was audio-card's tetrad pass, a foreign
     * voicing killed on 260905 (the attack-borne echoes), and that kill
     * stands. `heard` mirrors audio-card's own arm idiom: an audition
     * answers a gesture — the boot echo, which is nobody's click, stays
     * silent. `auditioning` widens the timer guard so a figured bar plays
     * its sequence in time while stopped; a stop still clears pending. */
    let heard = false;
    let auditioning = false;
    let wantAudition = false;   // a STEP request arrived while stopped — its echo auditions
    d.addEventListener("pointerdown", () => { heard = true; }, true);
    const clearPending = () => { for (const t of timers) d.defaultView.clearTimeout(t); timers = []; };

    const derive = () => {
      /* the centre's SOURCE (260914): the material anchors on
       * centreMaterialRef so the window never jumps per bar; the READING
       * (degrees, colours, figure addressing, the bass) shifts per bar */
      const fld = field({ key: cfg.key, scale: cfg.scale,
        ref: cfg.object === "scale" ? centreMaterialRef(cfg.centreSrc, cfg.ref) : cfg.ref });
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
      const cur = chordAt(prog, index, fld, cfg.object, pickOf(cfg));
      const run = makeRun(cfg.strings);
      const pos = positionOf({ field: fld, anchorString: Math.max(...run.strings),
        startDegree: cfg.startDeg, nearFret: cfg.nearFret, strings: run.strings });
      const pool = materialIn(pos, run.strings, fld);
      let sel = [];
      const refDeg = cfg.object === "scale"
        ? centreDegreeOf(cfg.centreSrc, cfg.ref, cur.degree)
        : cur.degree;
      if (cfg.object === "scale") {
        sel = scaleTake(pool).notes;
        /* the reading shifts to the bar's centre under "follows" */
        if (cfg.centreSrc === "follows" && refDeg != null)
          sel = reRead(sel, refDeg);
      }
      else {
        /* THE NAMED DROP (260914, item 3): an extended stack deeper than
         * the placement's capacity reduces by gripFit's rule, and the
         * dropped roles are SAID (the boards speak them; the walk sounds the kept stack) */
        const fit = cfg.take === "all" ? { tones: cur.tones, dropped: [] }
          : gripFit(cur.tones, run.strings.length * cfg.notesPer);
        const r = cfg.take === "all"
          ? everyOccurrence(cur.tones, pool, { n: cfg.notesPer })
          : oneOfEach(fit.tones, pool, { n: cfg.notesPer, centre: pos.centre });
        sel = r.notes || r.partial || [];   // 260923: one-of-each's PARTIAL draws beside its refusal (ruling 260922b/3), the same in every view
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
      /* THE CENTRE WORKS (260913b, item 4a): in scale mode the reference
       * places against the MODAL CENTRE — same placeReference, same degree
       * arithmetic, the origin is cfg.ref instead of the chord's degree.
       * A mode is only audible against its centre; now it sounds. */
      if (cfg.bass !== "none" && refDeg != null && refDeg >= 0 && sel.length
          && (cfg.object === "scale" || cur.degree >= 0)) {
        const rp = placeReference(cfg.bass, refDeg, fld, run.strings, pos, pickOf(cfg));
        if (rp.note) refMidi = rp.note.midi;
      }
      /* THE SCHEDULE: the figure's order through orderBy — the same value
       * the bracket and the polyline draw — or the take's own shape */
      const fig = orderBy(cfg.address, cfg.figure, sel, { fld, strings: run.strings });
      /* 260905, the coupling severed: Take chooses the MATERIAL, the rail's
       * Movement control chooses together-or-sequence (a scale stays a run —
       * the box has no chord to sound as one). A typed figure sequences
       * regardless, as ruled. */
      const spread = cfg.object === "scale" || cfg.movement === "arpeggiate";
      const { events } = walkSchedule(sel, fig.err ? null : fig.order,
        chordBeats(prog), bpm, { spread, refMidi });
      clearPending();
      for (const ev of events) {
        const msg = ev.role ? { midi: ev.midi, role: ev.role } : { midi: ev.midi };
        if (ev.at <= 0) { announce(d, NOTE, msg); continue; }
        timers.push(d.defaultView.setTimeout(() => {
          if (armed || auditioning) announce(d, NOTE, msg);
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
        if (cfg.repeat) {
          /* REPEAT (260913, item 4 — ruled: the CURRENT bar): the boundary
           * that would advance repeats instead. Consulted only HERE, so a
           * mid-bar toggle never restarts a bar in flight; the downbeat is
           * the repeated bar's beat 1 (the 260902 accounting, unchanged);
           * the schedule is REBUILT through soundCurrent()'s one derivation
           * every pass — §4.2.3, no cache, no board state — and the position
           * never moves, so no STEP echo and every board simply keeps
           * showing the bar that is sounding. */
          spent = 1;
          soundCurrent();
          return;
        }
        advancing = true;
        announce(d, STEP_CHANGED, { index: index + 1, request: true });
        advancing = false;
      }
    });
    listen(d, STEP_CHANGED, (m) => {
      if (!m) return;
      /* an audition answers a REQUEST — a click somewhere asked for this
       * bar. A config consequence (the strip's index-overflow reset) also
       * echoes, and must NOT audition: nobody asked to hear it. */
      if (m.request === true) { if (!armed) wantAudition = heard; return; }
      if (typeof m.index !== "number") return;
      const moved = m.index !== index;
      index = m.index;
      if (armed && moved) {
        /* an on-beat advance: the beat that carried it is the NEW chord's
         * beat 1. A manual jump (a chip click) starts fresh at 0. */
        spent = advancing ? 1 : 0;
        soundCurrent();
      } else if (!armed && wantAudition && m.attack === true) {
        /* the audition: the step owner's attack-borne answer to a request
         * ("sound step N now" — the flag's own meaning), and while stopped
         * the walk answers it itself. The clock stays stopped; a refused
         * bar has no selection and soundCurrent sounds nothing. */
        wantAudition = false;
        auditioning = true;
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
        if (k in m) {
          /* legacy v0.1.0 movement words normalise at the merge (260913) */
          const v = k === "movement" ? movementWord(m[k]) : m[k];
          cfg = { ...cfg, [k]: Array.isArray(v) ? [...v] : v };
        }
    });
  },
};
