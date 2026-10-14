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
/* THE DERIVATION LEFT THIS FILE (261014 — the étude timeline): what a chord sounds is engine/etude-timeline.mjs's
 * barAt, a pure function from the étude to events in beats, so another host (RiffRaft's étude block) can ask the same
 * question. The walk keeps its TIMING and its BUS duties only: beats become seconds at the clock's tempo here, and the
 * notes are announced at their times. It holds no derivation of its own (rule 6 — two derivations agreeing today is
 * the FLAT_KEYS failure); the door gate's equivalence oracle holds the door's NOTE stream to the function's output. */
import { ETUDE_DEFAULTS, barAt, beatsAt, chordCount } from "../../engine/etude-timeline.mjs";
import { movementWord, AS_CHARTED } from "../../engine/progression.mjs";
import { SPLITS, splitFor } from "../../engine/drill.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, PLAY, CLOCK, CLOCK_STATE, BEAT, NOTE,
  listen, announce } from "../bus.mjs";
import { DEFAULT_BPM } from "../tempo.mjs";

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
    let cfg = { ...ETUDE_DEFAULTS };   // the starting configuration lives with the derivation (engine/etude-timeline.mjs)
    let meter = 4, bpm = DEFAULT_BPM;      // adopted from CLOCK_STATE — the metronome owns both
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

    /* the position wraps when the étude shrinks under it (a shorter progression) — the walk's own state */
    const wrap = () => { if (index >= chordCount(cfg)) index = 0; };
    const chordBeats = () => { wrap(); return beatsAt(cfg, index, meter); };
    const soundCurrent = () => {
      wrap();
      /* the chord, as the engine derives it: events in BEATS from the downbeat (a refused bar has none — silent,
       * with its reason on the face). Here they become seconds at the clock's tempo, and are announced: the pad
       * first, at the attack with the chord's span as its duration; the downbeat's events now (the cold-play
       * guarantee, 260819.2); the rest by view.setTimeout, cancelled on advance and on stop. */
      const bar = barAt(cfg, index, meter);
      const spb = 60 / bpm;
      clearPending();
      for (const ev of bar.events) {
        /* the pad's duration in the old span arithmetic (beats × 60 / bpm), so the NOTE it carries is the same to the bit */
        if (ev.role === "pad") { announce(d, NOTE, { midi: ev.midi, role: "pad", dur: ev.dur * 60 / bpm }); continue; }
        const msg = ev.role === "bass" ? { midi: ev.midi, role: "bass", ...(ev.unfretted ? { unfretted: true } : {}) } : { midi: ev.midi };
        const at = ev.onset * spb;
        if (at <= 0) { announce(d, NOTE, msg); continue; }
        timers.push(d.defaultView.setTimeout(() => {
          if (armed || auditioning) announce(d, NOTE, msg);
        }, at * 1000));
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
    listen(d, BEAT, (ev) => {
      if (!armed) return;
      if (ev && ev.sub) return;   // a subdivision click is not a beat (260929)
      /* a chord holds its derived beats WHOLE: its own downbeat is beat 1,
       * and the advance lands on the NEXT downbeat (260902 — the first fix
       * seated the count before the clock, then the trace showed the chord
       * still losing its last beat to its own downbeat) */
      spent += 1;
      if (spent > chordBeats()) {
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
      if (typeof m.meter === "number" && m.meter !== meter) {
        /* THE SPLIT'S OWNER on a meter change (261010, carrying the 261002 orphan ruling): a slot list maps
         * through splitFor (the same shape where the new meter has it, else the whole bar); "as charted"
         * survives every meter and is said again, so a saved étude always carries the split it played in.
         * Announced in a microtask — never from inside another message's delivery (night 61). */
        const old = meter;
        meter = m.meter;
        const s = cfg.split;
        const next = Array.isArray(s) && SPLITS[old] && SPLITS[meter]
          ? [...SPLITS[meter][splitFor(old, SPLITS[old].findIndex((p) => p.join("+") === s.join("+")), meter)]]
          : AS_CHARTED;
        queueMicrotask(() => announce(d, CONFIG_CHANGED, { split: next }));
      } else if (typeof m.meter === "number") meter = m.meter;
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
    /* THE SPLIT HAS AN OWNER (orphan item, ruled 261002; 261010): the walk says it at boot — "as charted", the
     * load default — unless a replayed config already said one. An entry saved before tonight carries no split,
     * and its restore leaves the split where it is (silence means "not recorded", 2026-10-02). */
    if (cfg.split == null) announce(d, CONFIG_CHANGED, { split: AS_CHARTED });
  },
};
