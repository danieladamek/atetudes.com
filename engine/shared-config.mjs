/* shared-config.mjs — THE FAMILY'S SHARED CONFIG VOCABULARY (night 41, 261005).
 *
 * "Share what you make — the file is the channel" (approved 2026-08-14). The
 * export file was already the transport: a foreign app's payload is named,
 * inert and carried untouched (notepad-surface.mjs), so a note written in
 * one app already opens in another. What did not travel was the SETTING —
 * summarize() is per-app, so a foreign entry rendered as an inert blob.
 *
 * This module is the ONE definition of the concepts every surface genuinely
 * has: key · scale · progression · start-on · string set · bpm · meter. It
 * SUPPLIES nothing to any host and reads no host's state; each host maps its
 * own state to it (adapter.shared.to) and declares what it can take back
 * (adapter.shared.host), and the notepad surface writes the writer's shared
 * form INTO the entry (payload.shared) so any reader reads it without
 * knowing the writer. The rules it obeys, from the dispatch:
 *   1. ADDITIVE — an entry without `shared` loads, summarises and applies as
 *      it always did; nothing here changes an existing file's meaning.
 *   2. a concept a surface does not have stays CARRIED AND INERT — the
 *      foreign `data` is never read here, never dropped.
 *   3. a PARTIAL apply is NAMED — offerOf says which concepts a host takes
 *      and why each other one is withheld; never a silent subset.
 *   4. applying is a CLICK — this module builds an offer; the surface applies
 *      only when the reader presses it.
 *   5. DERIVED, not restated — the labels, the value vocabularies and the
 *      wording live here once; a host that spells "key" is naming a concept
 *      it maps, never re-describing it.
 */

/** the concepts, in the order a summary reads them */
export const SHARED = Object.freeze({
  key:         { label: "key",         describe: (v) => String(v) },
  scale:       { label: "scale",       values: { major: "major", harm: "harmonic minor", mel: "melodic minor" },
                 describe: (v) => SHARED.scale.values[v] },
  progression: { label: "progression", values: { scale: "Scaler", thirds: "Cycling 3rds", fourths: "Cycling 4ths",
                                                  fifths: "Cycling 5ths", sixths: "Cycling 6ths" },
                 describe: (v) => SHARED.progression.values[v] },
  startOn:     { label: "start-on",    describe: (v) => "start on " + ROMAN[v] },
  stringSet:   { label: "string set",  describe: (v) => "strings " + [...v].sort((a, b) => b - a).join("-") },
  bpm:         { label: "bpm",         describe: (v) => v + " bpm" },
  meter:       { label: "meter",       describe: (v) => v + "/4" },
});
export const CONCEPTS = Object.freeze(Object.keys(SHARED));
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];   // degree numerals, quality-blind on purpose: a start-on names a degree, not a chord
const NOTE_RE = /^[A-G](b|#)?$/;

/** is `v` a legal value of `concept`? — the vocabulary's own check, one place */
export function isValid(concept, v) {
  switch (concept) {
    case "key": return typeof v === "string" && NOTE_RE.test(v);
    case "scale": return typeof v === "string" && v in SHARED.scale.values;
    case "progression": return typeof v === "string" && v in SHARED.progression.values;
    case "startOn": return Number.isInteger(v) && v >= 0 && v <= 6;
    case "stringSet": return Array.isArray(v) && v.length >= 1 && v.length <= 6
      && v.every((s) => Number.isInteger(s) && s >= 1 && s <= 6) && new Set(v).size === v.length;
    case "bpm": return typeof v === "number" && v >= 15 && v <= 300;
    case "meter": return Number.isInteger(v) && v >= 1 && v <= 12;
    default: return false;
  }
}

/** the shared form read off a payload: only known concepts with legal values; an
 * entry from before the vocabulary (no `shared`) reads as {} — additive by construction */
export function readShared(payload) {
  const out = {};
  const src = payload && payload.shared;
  if (!src || typeof src !== "object") return out;
  for (const c of CONCEPTS) if (c in src && isValid(c, src[c])) out[c] = src[c];
  return out;
}

/** a host's shared form, checked: a host that maps a concept badly fails HERE, loudly, at write time */
export function checkShared(shared, app = "a host") {
  if (!shared || typeof shared !== "object") throw new Error(`shared-config: ${app} mapped no object`);
  for (const [c, v] of Object.entries(shared)) {
    if (!(c in SHARED)) throw new Error(`shared-config: ${app} mapped "${c}", which is not a shared concept (${CONCEPTS.join(", ")})`);
    if (!isValid(c, v)) throw new Error(`shared-config: ${app} mapped ${c} to ${JSON.stringify(v)}, not a legal value`);
  }
  return shared;
}

/** the summary a foreign entry's shared settings read as — "Bb harmonic minor · Cycling 4ths · start on I · strings 6-5-4-3 · 72 bpm · 4/4" */
export function describeShared(shared) {
  const parts = [];
  const s = shared || {};
  if ("key" in s || "scale" in s) parts.push([s.key, s.scale && SHARED.scale.describe(s.scale)].filter(Boolean).join(" "));
  for (const c of CONCEPTS) if (c !== "key" && c !== "scale" && c in s) parts.push(SHARED[c].describe(s[c]));
  return parts.join(" · ");
}

/** the English list "key, scale and progression" */
export const listOf = (labels) => labels.length <= 1 ? labels.join("")
  : labels.slice(0, -1).join(", ") + " and " + labels[labels.length - 1];

/**
 * THE OFFER. `shared` is the entry's (readShared); `host` is what this surface
 * declares: { canTake(concept, value) → true | "why not" }. Returns
 *   { take: {concept: value}, withheld: [{concept, reason}], wording, withheldWording }
 * wording: "apply the key, scale and progression from this note" (empty when nothing
 * applies); withheldWording: "not offered: string set — this page has no string set;
 * meter — …" (empty when everything applies). Nothing is applied here.
 */
export function offerOf(shared, host) {
  const take = {}, withheld = [];
  for (const c of CONCEPTS) {
    if (!(c in shared)) continue;
    const ok = host && typeof host.canTake === "function" ? host.canTake(c, shared[c]) : "this page carries no shared settings";
    if (ok === true) take[c] = shared[c];
    else withheld.push({ concept: c, reason: typeof ok === "string" && ok ? ok : "not carried here" });
  }
  const taken = Object.keys(take);
  const wording = taken.length ? `apply the ${listOf(taken.map((c) => SHARED[c].label))} from this note` : "";
  const withheldWording = withheld.length
    ? "not offered: " + withheld.map((w) => `${SHARED[w.concept].label} — ${w.reason}`).join("; ")
    : "";
  return { take, withheld, wording, withheldWording };
}

/** the enharmonic reach a host may use to take a key it spells differently: "Gb" → 6 */
export const pcOfKey = (k) => ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 })[k[0]] + (k[1] === "#" ? 1 : k[1] === "b" ? -1 : 0);

/* ---------------- load-time assertions ---------------- */
{
  const s = checkShared({ key: "Bb", scale: "harm", progression: "fourths", startOn: 0, stringSet: [6, 5, 4, 3], bpm: 72, meter: 4 });
  if (describeShared(s) !== "Bb harmonic minor · Cycling 4ths · start on I · strings 6-5-4-3 · 72 bpm · 4/4")
    throw new Error("shared-config: the summary sentence broke: " + describeShared(s));
  const o = offerOf(s, { canTake: (c) => (c === "bpm" || c === "meter") ? true : "the metronome has no " + SHARED[c].label });
  if (o.wording !== "apply the bpm and meter from this note" || !/^not offered: key — the metronome has no key; scale/.test(o.withheldWording))
    throw new Error("shared-config: the offer wording broke: " + o.wording + " | " + o.withheldWording);
  if (Object.keys(readShared({ app: "old", v: 1, data: { key: "C" } })).length) throw new Error("shared-config: an entry without `shared` must read as nothing shared");
  if (readShared({ shared: { key: "H", bpm: 72 } }).key !== undefined) throw new Error("shared-config: an illegal value must not read");
}
