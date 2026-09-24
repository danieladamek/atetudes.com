/* etude-describe.mjs — the étude, in a musician's words (night 66, 261024): describe(snapshot) for the Settings
 * card. The SNAPSHOT comes from hub/etude-record.mjs — the one record the practice log saves; this file only
 * words it, so the face and the log cannot hold different lists. Kept apart from the record so the engine
 * modules it needs (selection, tunings) reach only the door that shows the card. */
import { objectOf, tonePick } from "../engine/selection.mjs";
import { describeTuning } from "../engine/tunings.mjs";

/* ---------------- the description: the snapshot, in a musician's words ---------------- */

const SCALE = { major: "major", harm: "harmonic minor", mel: "melodic minor" };
const OBJECT = { scale: "the scale itself", dyad: "a dyad", triad: "a triad", tetrad: "a tetrad", ninth: "a 9th chord",
  eleventh: "an 11th chord", thirteenth: "a 13th chord", shell: "a shell" };
const CYCLE = { scale: "the scale's own chords, step by step", thirds: "a cycle of thirds", fourths: "a cycle of fourths",
  fifths: "a cycle of fifths", sixths: "a cycle of sixths" };
const FORM = { "ii-V-I": "a ii–V–I", "ii-V-i": "a minor ii–V–i", turnaround: "the I–vi–ii–V turnaround",
  "blues-12": "a twelve-bar blues", "rhythm-a": "the A section of rhythm changes", "cycle-4ths": "a cycle of fourths" };
const NUMERAL = ["I", "II", "III", "IV", "V", "VI", "VII"];
const UNDER = { none: null, root: "the root", third: "a 3rd below", fifth: "a 5th below" };
const underWord = (v) => (v in UNDER ? UNDER[v] : /^tone:(\d)$/.test(String(v)) ? `the ${ordinal(+String(v).slice(5))} in the bass` : String(v));
const ordinal = (n) => (n === 1 ? "root" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);
const role = (d) => (Number(d) === 1 ? "R" : String(d));
const degreesOf = (g) => (Array.isArray(g) ? g : String(g).split(",")).map((x) => String(x).trim()).filter(Boolean);

/** the keys this file has words for — anything else in a snapshot is said under "also", never dropped */
export const DESCRIBED = ["bpm", "meter", "split", "key", "scale", "gamut", "ref", "centreSrc", "tones", "dyad",
  "source", "cycle", "form", "custom", "start", "chart", "strings", "startDeg", "nearFret", "notesPer", "take",
  "movement", "address", "figure", "repeat", "bass", "sounded", "pad", "tuning"];

/** [{ part, text }] — one line per part of the étude, in the order a player builds it */
export function describe(s) {
  const out = [];
  const say = (part, text) => out.push({ part, text });
  // the clock
  const tempo = typeof s.bpm === "number" ? `${s.bpm} bpm` : "the clock's own tempo";
  const bar = typeof s.meter === "number" ? `, ${s.meter}/4` : "";
  const split = s.split && s.split !== "4" ? ` — each bar split ${s.split}` : " — one chord to a bar";
  say("tempo", `${tempo}${bar}${split}`);
  // the field and its centre
  const field = s.gamut == null ? "the whole field" : `narrowed to degrees ${degreesOf(s.gamut).join(" ")}`;
  say("field", `${s.key || "C"} ${SCALE[s.scale] || s.scale || "major"} — ${field}`);
  const centre = s.centreSrc === "follows" ? "each bar read against its own chord's root"
    : Number(s.ref) ? `centred on degree ${Number(s.ref) + 1} of the key` : "centred on the key";
  say("centre", centre);
  // the object: DERIVED from the tones, never stored (night 59)
  const pick = tonePick(s);
  let obj;
  try { obj = objectOf(pick); } catch (e) { obj = null; }
  say("object", pick == null ? "the scale itself — every note the field offers"
    : `${OBJECT[obj] || "a chord"} — ${pick.map(role).join(" ")}`);
  // the progression
  const start = Number.isInteger(s.start) ? ` from ${NUMERAL[s.start] || s.start}` : "";
  say("progression", s.source === "custom" ? (String(s.custom || "").trim() ? `your own chart: ${s.custom.trim()}` : "your own chart — empty")
    : s.source === "form" ? `${FORM[s.form] || s.form}${start}`
    : `${CYCLE[s.cycle] || s.cycle || "a cycle"}${start}`);
  // the window (position)
  if (Number.isInteger(s.startDeg) || Number.isInteger(s.nearFret))
    say("window", `the window framed from the ${ordinal((s.startDeg ?? 0) + 1)} of the key, near fret ${s.nearFret ?? "—"}`);
  // the motif (the span Take/Movement → figure — motif, 261022): placement, the take, movement, figure
  const strings = Array.isArray(s.strings) ? `strings ${s.strings.join("–")}` : "the neck's strings";
  const place = s.notesPer === 1 || s.notesPer == null ? "grip" : "line";
  const take = s.take === "all" ? "every occurrence" : "one of each";
  const figured = String(s.figure || "").trim();
  const move = figured ? "arpeggiated in the figure's order" : /^arpeggi/.test(String(s.movement)) ? "arpeggiated" : "strummed";
  const fig = figured ? `, ${figured.replace(/\s+/g, "")} (${s.address === "tones" ? "by tone" : "by string"})` : ", no figure";
  say("motif", `a motif of ${place}, ${take}, ${move}${fig} — on ${strings}`);
  say("repeat", s.repeat ? "repeating the current bar" : "running through the chart");
  // under the harmony
  const fretted = underWord(s.bass ?? "root");
  say("reference", fretted ? `fretted under it: ${fretted}` : "nothing fretted under it");
  const sounded = underWord(s.sounded ?? "none");
  say("sound", `${sounded ? `the bass sounds ${sounded}` : "no bass sounds"}; ${s.pad ? "a pad holds the chord" : "no pad"}`);
  // the neck
  say("tuning", s.tuning == null ? "standard tuning" : (describeTuning(s.tuning) || "a tuning of its own"));
  // a chart written in the pad (the notepad's ```chart block): the progression the étude runs, when one is written
  if (s.chart != null && String(s.chart).trim()) say("chart", `a chart written in the notes: ${String(s.chart).trim().split(/\s+/).length} symbols`);
  // anything the log carries that this file has no words for — SAID, never dropped
  const also = Object.keys(s).filter((k) => !DESCRIBED.includes(k)).sort();
  if (also.length) say("also", also.map((k) => `${k} ${JSON.stringify(s[k])}`).join(" · "));
  return out;
}
