/* transport.mjs — THE ÉTUDE'S WALK ALONG A BEAT GRID, as pure arithmetic.
 *
 * Shell child 1's engine half. Pure, DOM-free (§4.2.2): no timer, no
 * AudioContext, no clock of its own. Beats are INJECTED — the same discipline
 * `engine/metronome.mjs` uses for its grid and `engine/voices.mjs` for its
 * envelopes — so the whole walk is testable headlessly by handing it a list of
 * beat events.
 *
 * WHAT IT OWNS, AND WHAT IT DELIBERATELY DOES NOT
 * ----------------------------------------------
 * It owns the answer to one question: *given the next beat, does the chord
 * change, and to which one?* That is the roadmap's complaint about the study
 * made concrete — "the fixed 1700 ms interval was fine for a demonstration; it
 * isn't practice" — because a chord that changes on a BEAT can be practised
 * against, and one that changes on a wall-clock timer cannot.
 *
 * It does NOT own a clock, a tempo or a meter. Those belong to whatever is
 * counting beats; this only reads the beats it is given. That is what lets one
 * grid drive the click, the chord and the playhead together instead of three
 * timers agreeing by luck.
 *
 * The bar SPLIT is `engine/drill.mjs`'s — the same table the drill layer walks,
 * consumed rather than restated, because "how a bar divides" is one fact.
 *
 * NAMED BY ROLE, NOT BY APP. Nothing here says triad, tetrad, chord or fret: a
 * transport walks STEPS of a sequence. Whatever a step means is the consumer's.
 */
import { SPLITS as DRILL_SPLITS, splitFor as drillSplitFor } from "./drill.mjs";

/* Re-exported BY VALUE, not as an `export { … }` list: the door build inlines
 * modules and reads their exports by declaration, so a bare re-export list is
 * silently dropped and the consumer gets `undefined` at runtime. Assigning it
 * keeps one import for consumers and stays identity-equal to drill.mjs's table,
 * so "this is the same table, not a copy" remains assertable. */
export const SPLITS = DRILL_SPLITS;
export const splitFor = drillSplitFor;

/** the beat's weight, which is also the click's accent level:
 *  2 = bar line · 1 = a step begins · 0 = an ordinary beat */
export const LEVEL = { BAR: 2, STEP: 1, BEAT: 0 };

/** the split pattern for a meter, by index — bounds-checked so a stale index
 * from a meter change cannot silently select the wrong division */
export function patternOf(meter, splitIdx) {
  const list = SPLITS[meter];
  if (!list) throw new Error(`transport: no bar splits for meter ${meter} — known: ${Object.keys(SPLITS).join(", ")}`);
  return list[splitIdx] || list[0];
}

/** how many beats one pass takes, given its splits — what a loop counter counts */
export function beatsPerPass(meter, splitIdx, steps) {
  const p = patternOf(meter, splitIdx);
  let beats = 0;
  for (let i = 0; i < steps; i++) beats += p[i % p.length];
  return beats;
}

/**
 * THE WALK. A pure state machine fed beat events.
 *
 * `beat(ev)` takes `{ index, beat }` — an absolute beat index and the beat's
 * position in its bar, exactly what `createMetroCore`'s `pump` already returns —
 * and answers what the transport does on it:
 *
 *   { playing, countingIn, attack, step, loop, level, beatsLeft }
 *
 * `attack` is the only edge that matters: true on the beat a new step begins.
 * A consumer sounds the chord and moves the playhead on `attack` and does
 * nothing on the others, so the click and the chord change are the SAME event
 * rather than two events that happen to coincide.
 */
export function createTransportCore({ meter = 4, splitIdx = 0, steps = 8, countIn = false } = {}) {
  if (!Number.isInteger(steps) || steps < 1)
    throw new Error(`transport: a pass needs at least one step, got ${steps}`);
  const s = {
    meter, splitIdx, steps, countIn,
    on: false, joinIdx: 0, countingIn: false,
    beatInStep: 0, patPos: 0, runStep: 0,
  };
  const pattern = () => patternOf(s.meter, s.splitIdx);

  return {
    get playing() { return s.on; },
    get step() { return s.runStep % s.steps; },
    get loop() { return Math.floor(s.runStep / s.steps); },
    get countingIn() { return s.countingIn; },
    get steps() { return s.steps; },
    get meter() { return s.meter; },
    get splitIdx() { return s.splitIdx; },

    /** Join the grid AT THE NEXT BAR, not the arming beat. `beatInBar` is the
     * arming beat's place in its bar (the metronome's `ev.beat`, 0 on a down-
     * beat); the distance to the next bar line is `(meter − beatInBar) % meter`,
     * which is zero when Play lands on a downbeat, so you join immediately. This
     * is the reference's `nextBarStartIndex()`, derived from the beat the BEAT
     * handler already armed on rather than a separate clock query — and it is the
     * fix for "block chords sound on beat 2": joining on the arming beat made
     * `beatInStep` cycle from that offset, so every chord fell off the downbeat.
     *
     * A count-in composes ON TOP: align to the next bar FIRST, then hold one
     * whole aligned bar of clicks. Any other order gives a "count-in" that is a
     * fraction of a bar — a bar you cannot come in on, which is the whole point
     * of one. `beatInBar` defaults to 0 so a caller that arms on a known downbeat
     * (every headless test here, and the initial mount) needs say nothing. */
    start(atIndex, { fromStep = 0, beatInBar = 0 } = {}) {
      s.on = true;
      s.beatInStep = 0; s.patPos = 0; s.runStep = fromStep;
      s.countingIn = !!s.countIn;
      const toNextBar = (s.meter - (beatInBar % s.meter)) % s.meter;
      s.joinIdx = atIndex + toNextBar + (s.countIn ? s.meter : 0);
    },
    stop() { s.on = false; s.countingIn = false; },

    /** the pass length changed under us (a new key, a new cycle) */
    setSteps(n) {
      if (!Number.isInteger(n) || n < 1) return;
      s.steps = n;
      if (s.runStep >= n * 1000) s.runStep = 0;      // keep the counter sane
    },
    setCountIn(on) { s.countIn = !!on; },

    /** A meter change lands on the clock's own terms; all this must do is keep
     * the walk inside the new pattern's bounds — the shipped rule, verbatim. */
    setMeter(m) {
      if (!SPLITS[m] || m === s.meter) return;
      s.splitIdx = splitFor(s.meter, s.splitIdx, m);
      s.meter = m;
      s.patPos %= pattern().length;
      if (s.beatInStep >= pattern()[s.patPos]) s.beatInStep = 0;
    },
    setSplit(idx) {
      const list = SPLITS[s.meter];
      if (!list || !list[idx]) return;
      s.splitIdx = idx;
      s.patPos %= pattern().length;
      if (s.beatInStep >= pattern()[s.patPos]) s.beatInStep = 0;
    },

    /** THE ONE CALL. Feed it a beat; it tells you what happens on that beat. */
    beat(ev) {
      const bar = ev.beat === 0;
      if (!s.on)
        return { playing: false, countingIn: false, attack: false,
          step: this.step, loop: this.loop, level: bar ? LEVEL.BAR : LEVEL.BEAT, beatsLeft: 0 };

      if (ev.index < s.joinIdx) {
        // the count-in bar: the click is the whole point of it, so it stays audible
        s.countingIn = true;
        return { playing: true, countingIn: true, attack: false,
          step: this.step, loop: this.loop, level: bar ? LEVEL.BAR : LEVEL.BEAT,
          beatsLeft: s.joinIdx - ev.index };
      }
      s.countingIn = false;

      const attack = s.beatInStep === 0;
      const step = this.step, loop = this.loop;
      const level = attack ? (bar ? LEVEL.BAR : LEVEL.STEP) : (bar ? LEVEL.BAR : LEVEL.BEAT);

      const held = pattern()[s.patPos];
      s.beatInStep++;
      if (s.beatInStep >= held) {
        s.beatInStep = 0;
        s.patPos = (s.patPos + 1) % pattern().length;
        s.runStep++;
      }
      return { playing: true, countingIn: false, attack, step, loop, level,
        beatsLeft: held - (attack ? 0 : s.beatInStep) };
    },
  };
}

/* ---------------- load-time assertions (golden rule 1, site form) ---------------- */

{
  // a plain 4/4 pass, one chord per bar: every fourth beat attacks
  const t = createTransportCore({ meter: 4, splitIdx: 0, steps: 4 });
  t.start(0);
  const attacks = [];
  for (let i = 0; i < 16; i++) if (t.beat({ index: i, beat: i % 4 }).attack) attacks.push(i);
  if (attacks.join(",") !== "0,4,8,12")
    throw new Error("transport: one-chord-per-bar does not attack on the bar lines — " + attacks);
  if (t.loop !== 1) throw new Error("transport: four steps of four beats is one full loop");

  // two chords per bar
  const h = createTransportCore({ meter: 4, splitIdx: 1, steps: 4 });
  h.start(0);
  const half = [];
  for (let i = 0; i < 8; i++) if (h.beat({ index: i, beat: i % 4 }).attack) half.push(i);
  if (half.join(",") !== "0,2,4,6")
    throw new Error("transport: a 2+2 split does not attack twice a bar — " + half);

  // a count-in holds the walk for exactly one bar
  const c = createTransportCore({ meter: 4, splitIdx: 0, steps: 4, countIn: true });
  c.start(0);
  const first = [];
  for (let i = 0; i < 8; i++) if (c.beat({ index: i, beat: i % 4 }).attack) first.push(i);
  if (first[0] !== 4) throw new Error("transport: the count-in did not hold a whole bar — " + first);
}
