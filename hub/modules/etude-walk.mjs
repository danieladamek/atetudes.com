/* etude-walk.mjs — THE WALK (child 7): the transport the door's own header
 * promised back ("the transport returns with child 7's progression and
 * walk"). Multetudes' étude is the progression: Play walks the bars.
 *
 * THE CONTRACT, all of it already ratified (bus.mjs):
 *   PLAY {run:true}   the minis' ▶ — this module arms and starts the grid
 *                     through CLOCK {run:true, owner:"transport"}.
 *   BEAT              the clock owner's pulse. Each chord holds its DERIVED
 *                     beats (beatsOf — "chords take the bar's slots in
 *                     order"); when they run out the walk REQUESTS the next
 *                     step. The chart line owns the position: it wraps and
 *                     echoes, this module never sets the index itself.
 *   STEP_CHANGED echo while armed, an arrived chord SOUNDS — each selected
 *                     note (and the fretted reference) travels as NOTE
 *                     {midi}, the family's one-note message; audio-card
 *                     voices it at the chord level, so the mixer's mutes
 *                     hold. The COLD PLAY sounds the current chord at once
 *                     (260819.2 — the first chord of a cold Play was silent
 *                     once already; not again).
 *   CLOCK_STATE       running:false disarms — the mini's ⏹ stops the clock
 *                     and the walk falls silent with it, one stop cascaded.
 *
 * The selection is DERIVED HERE, independently, through the same engine
 * every board uses (§4.2.3 — the walk renders sound the way a board renders
 * pixels; it reads no board's state).
 */
import { field } from "../../engine/field.mjs";
import { positionOf, materialIn } from "../../engine/position.mjs";
import { makeRun } from "../../engine/string-run.mjs";
import { oneOfEach, everyOccurrence, scaleTake } from "../../engine/selection.mjs";
import { progressionOf, chordAt, beatsOf } from "../../engine/progression.mjs";
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
      startDeg: 5, nearFret: 5, object: "tetrad", take: "one", notesPer: 1,
      dyad: [3, 7], bass: "none",
      source: "cycle", cycle: "fourths", form: "ii-V-I", custom: "", start: 0, split: null };
    let meter = 4;
    let index = 0;
    let armed = false, beatsLeft = 0;

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
      for (const nt of sel) announce(d, NOTE, { midi: nt.midi });
      if (cfg.object !== "scale" && cfg.bass !== "none" && cur.degree >= 0) {
        const rp = placeReference(cfg.bass, cur.degree, fld, run.strings, pos);
        if (rp.note) announce(d, NOTE, { midi: rp.note.midi });
      }
    };

    listen(d, PLAY, (m) => {
      if (!m || m.run !== true || armed) return;
      armed = true;
      announce(d, CLOCK, { run: true, owner: "transport" });
      const { prog } = derive();
      beatsLeft = chordBeats(prog);
      soundCurrent();                        // the cold play sounds NOW
    });
    listen(d, BEAT, () => {
      if (!armed) return;
      beatsLeft -= 1;
      if (beatsLeft <= 0)
        announce(d, STEP_CHANGED, { index: index + 1, request: true });
    });
    listen(d, STEP_CHANGED, (m) => {
      if (!m || m.request === true || typeof m.index !== "number") return;
      const moved = m.index !== index;
      index = m.index;
      if (armed && moved) {
        const { prog } = derive();
        beatsLeft = chordBeats(prog);
        soundCurrent();
      }
    });
    listen(d, CLOCK_STATE, (m) => {
      if (m && m.running === false) armed = false;
    });
    listen(d, CONFIG_CHANGED, (m) => {
      if (!m || typeof m !== "object") return;
      for (const k of Object.keys(cfg))
        if (k in m) cfg = { ...cfg, [k]: Array.isArray(m[k]) ? [...m[k]] : m[k] };
    });
  },
};
