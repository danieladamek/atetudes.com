/* motion.mjs — the motion grammar (component v1).
 *
 * The shared drill layer's figure language (spec: notes/specs/motion-grammar.md;
 * Triadetudes v0.7 phase 3 is the first consumer; Tetradetudes and Substitute
 * Teacher inherit it). Pure: no DOM, no audio, no globals.
 *
 *   tones mode :  (-1,+2)[1] - (+2,-1)[3] - (-s,+s)[5]
 *   shape mode :  (-1,+2)H   - M          - (-s)L
 *
 * Targets: [deg] in tones mode (degrees 1–7 and compound 9/11/13, accidentals
 * b/#; compounds reduce mod 7 for pitch, keep their spelling for the readout);
 * H/M/L in shape mode (H = the set's highest-pitched string). Approach items,
 * in parens before their target, played in written order, target last:
 * a LEADING SIGN means distance from the target (-1 half step below, +2 whole
 * step above, -s the next scale tone below, +2s two scale steps); an UNSIGNED
 * token is an absolute degree of the étude's KEY (b9, 2, #9) taken in the
 * octave nearest the target. `s` means the étude's selected scale — chord-
 * scales are a v0.8+ question and are not improvised here (spec §4.4).
 *
 * describe() is the deliverable, not documentation (spec §5): it names the
 * idiom by DERIVATION from the figure's shape — enclosed / a run from /
 * approached from — never a lookup of figures. Parse failures surface as the
 * sentence refusing to finish plus a caret position; no color anywhere.
 *
 * MAX_EVENTS refuses by name; nothing truncates.
 */

const mod12 = (n) => ((n % 12) + 12) % 12;

export const MAX_EVENTS = 16; // the family's figure ceiling (parseArp's, shared)

// degree → semitones above the root/tonic (chord.mjs's DEG arithmetic, restated
// and load-asserted; compounds reduce mod 7 for pitch, spelling kept aside)
const DEG_SEMIS = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11, 9: 14, 11: 17, 13: 21 };
const DEGREES = [1, 2, 3, 4, 5, 6, 7, 9, 11, 13];
for (const d of DEGREES)
  if (!(d in DEG_SEMIS)) throw new Error(`motion: degree ${d} has no interval`);
if (DEG_SEMIS[9] % 12 !== DEG_SEMIS[2] || DEG_SEMIS[11] % 12 !== DEG_SEMIS[4] ||
    DEG_SEMIS[13] % 12 !== DEG_SEMIS[6])
  throw new Error("motion: compound degrees must reduce mod 7");

export function degreeSemis(deg, acc) { return DEG_SEMIS[deg] + (acc || 0); }

// ---------- the classifier: ONE predicate for clicking and typing ----------

/**
 * classify(pc, chordPcs) → {role:"target", degText:"1"|"3"|"5"} | {role:"approach", degText:null}
 * The rule (spec §3, ratified 2026-08-10): a pitch class is a TARGET iff it is
 * a chord tone of the sounding chord; anything else is an approach. This is the
 * sketchpad's click classifier AND the grammar's target-legality rule — the
 * same sentence, one predicate, so clicking and typing cannot drift.
 */
export function classify(pc, chordPcs) {
  const ix = chordPcs.indexOf(mod12(pc));
  return ix >= 0 ? { role: "target", degText: String([1, 3, 5][ix]) }
                 : { role: "approach", degText: null };
}

// ---------- parse ----------

const err = (pos, message, figures) => ({ error: { pos, message }, figures });

/**
 * parse("( -1,+2 )[1] - [3]", "tones") →
 *   { mode, figures: [ { approaches:[item…], target } … ], n }
 * or { error: { pos, message }, figures: <parsed so far> }.
 *
 * item: {kind:"semi",delta:±n} | {kind:"scale",delta:±k}
 *     | {kind:"degree",deg,acc,text}
 * target (tones): {kind:"degree",deg,acc,text} · (shape): {kind:"slot",slot}
 */
export function parse(src, mode) {
  if (typeof src !== "string") return err(0, "not a string", []);
  const figures = [];
  let i = 0, n = 0;
  const ws = () => { while (i < src.length && /\s/.test(src[i])) i++; };
  const parseDegreeToken = () => {
    const m = src.slice(i).match(/^([b#]?)(13|11|9|[1-7])/);
    if (!m) return null;
    i += m[0].length;
    return { kind: "degree", deg: +m[2], acc: m[1] === "b" ? -1 : m[1] === "#" ? 1 : 0,
      text: m[0] };
  };
  const parseItem = () => {
    const m = src.slice(i).match(/^([+-])(\d*)(s?)/);
    if (m && (m[2] || m[3])) {
      i += m[0].length;
      const sign = m[1] === "-" ? -1 : 1;
      if (m[3] === "s") return { kind: "scale", delta: sign * (m[2] ? +m[2] : 1) };
      return { kind: "semi", delta: sign * +m[2] };
    }
    if (m) return "sign-without-distance";
    return parseDegreeToken();
  };
  while (i < src.length) {
    ws();
    if (i >= src.length) break;
    const approaches = [];
    if (src[i] === "(") {
      i++;
      for (;;) {
        ws();
        if (src[i] === ")") { i++; break; }
        const item = parseItem();
        if (item === "sign-without-distance")
          return err(i, "a sign needs a distance: -1, +2, -s, +2s", figures);
        if (!item)
          return err(i, "expected an approach: -1, +2, -s, +2s, or a degree like b9", figures);
        approaches.push(item);
        ws();
        if (src[i] === ",") { i++; continue; }
        if (src[i] === ")") { i++; break; }
        return err(i, 'expected "," or ")" in the approach figure', figures);
      }
      ws();
    }
    let target = null;
    if (mode === "shape") {
      const c = (src[i] || "").toUpperCase();
      if (c === "H" || c === "M" || c === "L") { target = { kind: "slot", slot: c }; i++; }
      else return err(i, "expected a slot target: H, M or L", figures);
    } else {
      if (src[i] === "[") {
        i++;
        const d = parseDegreeToken();
        if (!d) return err(i, "expected a degree inside [ ]", figures);
        if (src[i] !== "]") return err(i, 'expected "]"', figures);
        i++;
        target = d;
      } else return err(i, "expected a target like [1] or [b3]", figures);
    }
    figures.push({ approaches, target });
    n += approaches.length + 1;
    if (n > MAX_EVENTS)
      return err(i, `${n} notes per chord — ${MAX_EVENTS} is the ceiling; split the figure`,
        figures);
    ws();
    if (i >= src.length) break;
    if (src[i] === "-") { i++; continue; }
    return err(i, 'expected "-" between figures', figures);
  }
  if (!figures.length) return err(0, "empty figure", figures);
  return { mode, figures, n };
}

// ---------- serialize (idempotent normal form) ----------

const itemText = (it) =>
  it.kind === "semi" ? (it.delta < 0 ? String(it.delta) : "+" + it.delta) :
  it.kind === "scale" ? ((it.delta < 0 ? "-" : "+") +
    (Math.abs(it.delta) === 1 ? "" : Math.abs(it.delta)) + "s") :
  (it.acc === -1 ? "b" : it.acc === 1 ? "#" : "") + it.deg;

export function serialize(parsed) {
  return parsed.figures.map((f) => {
    const t = f.target.kind === "slot" ? f.target.slot
      : "[" + itemText(f.target) + "]";
    return (f.approaches.length ? "(" + f.approaches.map(itemText).join(",") + ")" : "") + t;
  }).join(" - ");
}

// ---------- describe: the idiom, named by derivation ----------

const ORDINAL = { 1: "root", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th",
  7: "7th", 9: "9th", 11: "11th", 13: "13th" };
const SLOT_NAME = { H: "high string", M: "middle string", L: "low string" };

function targetName(t) {
  if (t.kind === "slot") return "the " + SLOT_NAME[t.slot];
  const acc = t.acc === -1 ? "♭" : t.acc === 1 ? "♯" : "";
  return "the " + acc + ORDINAL[t.deg];
}
function itemName(it) {
  if (it.kind === "semi") {
    const n = Math.abs(it.delta), side = it.delta < 0 ? "below" : "above";
    const dist = n === 1 ? "a half step" : n === 2 ? "a whole step" : n + " semitones";
    return dist + " " + side;
  }
  if (it.kind === "scale") {
    const k = Math.abs(it.delta), side = it.delta < 0 ? "below" : "above";
    return (k === 1 ? "the scale tone" : k + " scale steps") + " " + side;
  }
  const acc = it.acc === -1 ? "♭" : it.acc === 1 ? "♯" : "";
  return "the " + acc + it.deg;
}
function sideOf(it) { // signed items only; absolute degrees have no side until resolved
  return it.kind === "degree" ? null : it.delta < 0 ? -1 : 1;
}

export function describe(parsed) {
  return parsed.figures.map((f) => {
    const t = targetName(f.target);
    const a = f.approaches;
    if (!a.length) return t.charAt(0).toUpperCase() + t.slice(1) + ".";
    const names = a.map(itemName);
    const list = names.length === 1 ? names[0] :
      names.slice(0, -1).join(", ") + ", then " + names[names.length - 1];
    const sides = a.map(sideOf);
    let idiom;
    if (a.length === 1) idiom = "approached from " + list;
    else if (a.length === 2 && sides[0] !== null && sides[1] !== null &&
             sides[0] !== sides[1]) idiom = "enclosed — " + list;
    else if (sides.every((s2) => s2 !== null) &&
             sides.every((s2) => s2 === sides[0]))
      idiom = "approached by a run from " + list;
    else idiom = "approached — " + list;
    const T = t.charAt(0).toUpperCase() + t.slice(1);
    return T + ", " + idiom + ".";
  }).join(" ");
}

// ---------- resolve: figures + a chord context → role-tagged note entries ----------

/**
 * ctx: {
 *   chordPcs: [r,t,f],           // the chord's own tones (root first)
 *   rootPc,                      // for degree targets beyond the triad
 *   voicing: {notes:[{midi,string,fret,slot}]},
 *   scalePcs: [7 pcs],           // the étude's selected scale
 *   tonicPc,                     // for absolute-degree approaches
 *   open: {string→midi}, nfrets,
 *   set: [strings], setLowHigh: [low→high]
 * }
 * Returns entries [{midi,string,fret,slot,role}...] in playing order.
 * Every derivation is asserted before return (spec §8).
 */
/** approachMidi(item, targetMidi, {scalePcs, tonicPc}) → the approach's
 * midi — the ONE implementation of the three approach kinds (260918, CR-1:
 * exported so the Multetudes selection resolves approaches through the path
 * this module already owns rather than a second arithmetic):
 *   semi   → the target ± n semitones
 *   scale  → k scale tones below/above, walked through scalePcs
 *   degree → an absolute degree of the KEY, in the octave nearest the target */
export function approachMidi(it, targetMidi, ctx) {
  if (it.kind === "semi") return targetMidi + it.delta;
  if (it.kind === "scale") {
    const dir = it.delta < 0 ? -1 : 1;
    let m = targetMidi, steps = Math.abs(it.delta);
    while (steps > 0) {
      m += dir;
      if (ctx.scalePcs.includes(mod12(m))) steps--;
      if (Math.abs(m - targetMidi) > 24)
        throw new Error("motion: scale walk ran away — scale context broken");
    }
    return m;
  }
  const pc = mod12(ctx.tonicPc + degreeSemis(it.deg, it.acc));
  const base = targetMidi - mod12(targetMidi) + pc;      // the octave nearest the target
  return [base - 12, base, base + 12].reduce((a, b2) =>
    Math.abs(b2 - targetMidi) < Math.abs(a - targetMidi) ? b2 : a);
}

/** placeNear(midi, nearFret, preferString, {set, open, nfrets}) → the nearest
 * playable position to nearFret on the set; the target's own string wins a
 * tie (exported 260918 for the same reason as approachMidi) */
export function placeNear(midi, nearFret, preferString, ctx) {
  let best = null;
  for (const sn of ctx.set) {
    const f = midi - ctx.open[sn];
    if (f < 0 || f > ctx.nfrets + 2) continue;
    const d = Math.abs(f - nearFret) + (sn === preferString ? 0 : 0.25);
    if (!best || d < best.d) best = { string: sn, fret: f, d };
  }
  if (!best) throw new Error("motion: no playable position for midi " + midi);
  return best;
}

export function resolve(parsed, ctx) {
  const out = [];
  const placeOnSet = (midi, nearFret, preferString) => placeNear(midi, nearFret, preferString, ctx);
  let prevFret = null;
  for (const fig of parsed.figures) {
    // target first — approaches are relative to it
    let tNote = null;
    if (fig.target.kind === "slot") {
      const slot = { L: 0, M: 1, H: 2 }[fig.target.slot];
      tNote = ctx.voicing.notes.find((n) => n.slot === slot);
      if (!tNote) throw new Error("motion: slot " + fig.target.slot +
        " is not a bijection here — shape mode needs one note per string");
      tNote = { ...tNote };
    } else {
      // target legality (spec §3, v0.7.6): a bare 1/3/5 names the chord's own
      // root/third/fifth (quality-aware); any other spelling resolves to a
      // pitch class and is legal ONLY if the chord contains it — [b3] on a
      // minor chord is legal by derivation, [2] on any triad is refused, and
      // the refusal teaches the construct that was wanted. Every legal target
      // is therefore in the voicing: resolve() never invents a position and no
      // figure can escape the isolation zone.
      const t = fig.target;
      const pc = (t.acc === 0 && (t.deg === 1 || t.deg === 3 || t.deg === 5))
        ? ctx.chordPcs[{ 1: 0, 3: 1, 5: 2 }[t.deg]]
        : mod12(ctx.rootPc + degreeSemis(t.deg, t.acc));
      if (classify(pc, ctx.chordPcs).role !== "target") {
        // the teaching refusal: suggest the nearest chord tone (upper on ties)
        let best = null;
        for (let k = 0; k < 3; k++) {
          const up = mod12(ctx.chordPcs[k] - pc), down = mod12(pc - ctx.chordPcs[k]);
          const d = Math.min(up, down);
          if (!best || d < best.d || (d === best.d && up < best.up))
            best = { k, d, up };
        }
        const tok = itemText(t);
        const e = new Error("[" + tok + "] is not a chord tone of " +
          (ctx.chordLabel || "the chord") + " — write (" + tok + ")[" +
          [1, 3, 5][best.k] + "] and it becomes an approach to " +
          ["the root", "the third", "the fifth"][best.k] + ".");
        e.teach = true;
        throw e;
      }
      const inVoicing = ctx.voicing.notes.find((n) => mod12(n.midi) === pc);
      if (!inVoicing)
        throw new Error("motion: chord tone pc " + pc + " missing from the voicing — voicing dishonest");
      tNote = { ...inVoicing };
    }
    // approaches, in written order, target last
    for (const it of fig.approaches) {
      const midi = approachMidi(it, tNote.midi, ctx);
      const pos = placeOnSet(midi, tNote.fret, tNote.string);
      const ev = { midi, string: pos.string, fret: pos.fret,
        slot: ctx.setLowHigh.indexOf(pos.string), role: "approach" };
      // derived, then asserted (spec §8)
      if (it.kind === "semi" && ev.midi - tNote.midi !== it.delta)
        throw new Error("motion: approach is not its written distance from the target");
      if (it.kind === "scale" && !ctx.scalePcs.includes(mod12(ev.midi)))
        throw new Error("motion: scale approach left the scale");
      if (it.kind === "degree" &&
          mod12(ev.midi) !== mod12(ctx.tonicPc + degreeSemis(it.deg, it.acc)))
        throw new Error("motion: degree approach missed its pitch class");
      if (ctx.open[ev.string] + ev.fret !== ev.midi)
        throw new Error("motion: approach placement dishonest");
      out.push(ev);
    }
    out.push({ ...tNote, role: "chord" });
    prevFret = tNote.fret;
  }
  if (out.length > MAX_EVENTS)
    throw new Error("motion: " + out.length + " notes — " + MAX_EVENTS + " is the ceiling");
  return out;
}

/* NAMED for a shared scope (260918): the door build inlines every module into
 * one scope and blanks the import lines, so an importer cannot alias —
 * `parse as parseMotion` names a symbol that never exists in the built page —
 * and the build REFUSES a re-export list by name (the night the build dropped
 * one in silence is in the verification doctrine). So the shared names are
 * plain exported constants; the Multetudes selection imports exactly these. */
export const parseMotion = parse;
export const describeMotion = describe;

// ---------- the sketchpad's emitter (the grammar's first external producer) ----------

/**
 * approachForms(midi, targetMidi, scalePcs) → {scale:boolean, semi:boolean}
 * Which readings exist for a click: scale iff the click is the adjacent scale
 * tone in its direction; semi iff within two semitones. Both true = the form
 * is tap-switchable in the sketch (v0.7.5); a click cannot reveal intent.
 */
export function approachForms(midi, targetMidi, scalePcs) {
  const d = midi - targetMidi;
  if (d === 0) return { scale: false, semi: false };
  const dir = d < 0 ? -1 : 1;
  let m2 = targetMidi, hit = null;
  for (let k = 1; k <= 12; k++) {
    m2 += dir;
    if (scalePcs.includes(mod12(m2))) { hit = m2; break; }
  }
  return { scale: hit === midi, semi: Math.abs(d) <= 2 };
}

/**
 * emitFromClicks(clicks, ctx) → { src, discarded } | { error, at? }
 * clicks: [{midi, role:"target"|"approach", degText?, form?, slot?}] in click
 * order (= playing order). Classification happens at click time against the
 * then-current chord (the honest reading); this function only serialises.
 * Emission is deliberately LOSSY: degrees and relationships survive; octave and
 * placement are discarded — a figure is a design, not a fingering.
 *
 * THE SKETCH SPEAKS BOTH LANGUAGES (260812.7): ctx.mode picks the output
 * grammar. "shape" emits a slot pattern — every click must be a chord tone
 * (role target) carrying a slot letter (H/M/L, the caller's string-set rule);
 * an approach or a slotless click refuses with { error, at } naming it, since
 * shape has no approach vocabulary and a pattern is made of slots. "tones"
 * (the default — absent ctx.mode is the pre-260812.7 contract, pinned) emits
 * degree figures exactly as before. The emitter never chooses the mode; the
 * caller's toggle does. That is the whole point.
 *
 * Approach precedence (spec §4.1, v0.7.5): SCALE-ADJACENCY FIRST, semitone
 * fallback — and NO third form (ratified 2026-08-11, the palette's rule,
 * asserted here 2026-08-12): EMIT INVARIANTS, NEVER COORDINATES. A bare
 * degree in an approach slot is absolute against the key and stops following
 * a key or scale change; where no relative reading exists the emitter
 * REFUSES, returning { error, at } with `at` the index of the offending
 * click, so the caller can hold that click out by name rather than guess.
 * (The GRAMMAR still parses hand-typed degree approaches — user input is the
 * user's; this rule binds what the sketch emits.) `form: "semi"|"scale"`
 * overrides the default when that reading exists — the tap in the sketch.
 * ctx: { scalePcs, tonicPc }.
 */
export function emitFromClicks(clicks, ctx) {
  if (ctx.mode === "shape") {
    const figures = [];
    for (let ci = 0; ci < clicks.length; ci++) {
      const c = clicks[ci];
      if (c.role !== "target")
        return { error: "shape has no approaches — switch to the tones to " +
          "use this note", at: ci };
      if (!c.slot)
        return { error: "no slot — the click is not on the set's strings " +
          "(or the grip's notes)", at: ci };
      figures.push({ approaches: [], target: { kind: "slot", slot: c.slot } });
    }
    if (!figures.length) return { error: "nothing to emit — the sketch is empty" };
    if (figures.length > MAX_EVENTS)
      return { error: figures.length + " notes — " + MAX_EVENTS + " is the ceiling" };
    return { src: serialize({ mode: "shape", figures, n: figures.length }),
      discarded: "octave and placement dropped — a figure is a design, not a fingering" };
  }
  const figures = [];
  let pending = [];
  for (let ci = 0; ci < clicks.length; ci++) {
    const c = clicks[ci];
    if (c.role === "target") {
      const m = (c.degText || "").match(/^([b#]?)(13|11|9|[1-7])$/);
      if (!m) return { error: 'a target needs a degree — got "' + (c.degText || "") + '"' };
      const target = { kind: "degree", deg: +m[2],
        acc: m[1] === "b" ? -1 : m[1] === "#" ? 1 : 0, text: m[0] };
      const approaches = [];
      for (const p of pending) {
        const a = p.click, d = a.midi - c.midi;
        const dir = d < 0 ? -1 : 1;
        const forms = approachForms(a.midi, c.midi, ctx.scalePcs);
        if (a.form === "semi" && forms.semi) { approaches.push({ kind: "semi", delta: d }); continue; }
        if (a.form === "scale" && forms.scale) { approaches.push({ kind: "scale", delta: dir }); continue; }
        if (forms.scale) { approaches.push({ kind: "scale", delta: dir }); continue; }
        if (forms.semi) { approaches.push({ kind: "semi", delta: d }); continue; }
        // no relative reading exists: REFUSE — a bare degree here would be a
        // coordinate stored where the app stores invariants (v0.6.6's failure)
        return { error: "an approach has no relative reading against its " +
          "target — not scale-adjacent, more than two semitones. Invariants " +
          "only: the click is refused, not renamed", at: p.at };
      }
      figures.push({ approaches, target });
      pending = [];
    } else pending.push({ click: c, at: ci });
  }
  if (pending.length)
    return { error: pending.length +
      " trailing approach note(s) with no target to resolve to — click a chord tone last" };
  if (!figures.length) return { error: "nothing to emit — the sketch is empty" };
  const parsed = { mode: "tones", figures,
    n: figures.reduce((a, f) => a + f.approaches.length + 1, 0) };
  if (parsed.n > MAX_EVENTS)
    return { error: parsed.n + " notes — " + MAX_EVENTS + " is the ceiling" };
  return { src: serialize(parsed),
    discarded: "octave and placement dropped — a figure is a design, not a fingering" };
}

// ---------- load-time assertions (golden rule 1, site form) ----------

{
  // the fixed-point property on a probe corpus: serialize ∘ parse is idempotent
  const probes = [
    ["tones", "(-1,+2)[1] - (+2,-1)[3] - (-s,+s)[5]"],
    ["tones", "[1]-[3]-[5]"],
    ["tones", "(b9,-1)[1]"],
    ["shape", "(-1,+2)H - M - (-s)L"],
    ["shape", "H-M-L"],
  ];
  for (const [mode, src] of probes) {
    const p1 = parse(src, mode);
    if (p1.error) throw new Error("motion: probe failed to parse: " + src);
    const s1 = serialize(p1);
    const p2 = parse(s1, mode);
    if (p2.error || serialize(p2) !== s1)
      throw new Error("motion: serialize∘parse is not a fixed point for " + src);
    if (!describe(p1)) throw new Error("motion: describe incomplete for " + src);
  }
  if (!parse("x", "tones").error) throw new Error("motion: garbage must refuse");
  const over = parse(Array(9).fill("(-1)[1]").join("-"), "tones");
  if (!over.error || !/ceiling/.test(over.error.message))
    throw new Error("motion: the event ceiling must refuse by name");
  // the classifier is one predicate: chord tone → target with its degree
  const CM = [0, 4, 7];
  if (classify(4, CM).degText !== "3" || classify(2, CM).role !== "approach")
    throw new Error("motion: the classifier predicate broke");
  // emitter precedence (spec §4.1, v0.7.5): scale-adjacency FIRST
  const CMAJ = [0, 2, 4, 5, 7, 9, 11];
  const probe = (clicks, want) => {
    const r = emitFromClicks(clicks, { scalePcs: CMAJ, tonicPc: 0 });
    if (r.src !== want)
      throw new Error("motion: emitter precedence broke — got " + (r.src || r.error));
  };
  probe([{ midi: 65, role: "approach" }, { midi: 67, role: "target", degText: "5" }],
    "(-s)[5]");                          // diatonic whole step → the invariant
  probe([{ midi: 61, role: "approach" }, { midi: 60, role: "target", degText: "1" }],
    "(+1)[1]");                          // chromatic half step → the coordinate
  probe([{ midi: 65, role: "approach", form: "semi" },
    { midi: 67, role: "target", degText: "5" }], "(-2)[5]");  // the tap override
}
