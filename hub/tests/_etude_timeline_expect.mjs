/* _etude_timeline_expect.mjs — the étude timeline's side of the equivalence gate (261014): every corpus étude through
 * engine/etude-timeline.mjs, printed as the NOTE sequence the door must announce for each chord — the pad first, then
 * the events in onset order (the walk announces the downbeat's events in order, the rest as their times arrive).
 * Onsets stay in beats; the door's trace is compared in beats at its own tempo. Read by hub/tests/door_locks.py.
 *   node hub/tests/_etude_timeline_expect.mjs [corpus.json] [bars]   */
import { readFileSync } from "node:fs";
import { etudeTimeline } from "../../engine/etude-timeline.mjs";
const corpus = JSON.parse(readFileSync(process.argv[2] || new URL("./fixtures/etude-corpus.json", import.meta.url), "utf8"));
const upto = Number(process.argv[3] || 4);
const out = {};
for (const { name, saved } of corpus) {
  const t = etudeTimeline(saved);
  out[name] = { meter: t.meter, bars: t.bars.slice(0, upto).map((b) => {
    const pad = b.events.filter((e) => e.role === "pad"), rest = b.events.filter((e) => e.role !== "pad");
    const ordered = [...pad, ...rest.map((e, i) => [e, i]).sort((a, c) => (a[0].onset - c[0].onset) || (a[1] - c[1])).map(([e]) => e)];
    return { symbol: b.symbol, beats: b.beats, notes: ordered.map((e) => ({ midi: e.midi,
      role: e.role === "bass" || e.role === "pad" ? e.role : null, unfretted: !!e.unfretted,
      dur: e.role === "pad" ? e.dur : null, onset: e.onset })) };
  }) };
}
console.log(JSON.stringify(out));
