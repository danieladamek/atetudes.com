/* tempo.mjs — THE HUB'S DEFAULT TEMPO, stated once (night 72, 261031 — Daniel, 2026-09-27: "reset the metronome
 * default to 120"). The metronome card owns the clock and boots it at this value; every mirror that holds a tempo before
 * the clock's first CLOCK_STATE arrives (the walk, the audio, the transport card, the stage, the staff) and every piece of
 * markup that shows it (a range's value, a readout's text) reads THIS — one fact, derived once (rule 6). It was the hand-
 * typed 72 in eleven hub sites.
 *
 * NOT MOVED: the engine's own argument default (a library default carried into published pages), the published metronome
 * study (it moves when it becomes a door), and saved études and handoffs (they open at the tempo they saved). */
export const DEFAULT_BPM = 120;
