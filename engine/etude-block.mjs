/* etude-block.mjs — THE ÉTUDE BLOCK: a saved étude as plain key-value lines, and back (261022).
 *
 * The format is docs/etude-block-format.md v1 (approved by Daniel, 2026-10-22, all seven §9 decisions as recommended).
 * This module is its one writer and its one reader. Multetudes writes the block (Settings → Copy note block) and reads
 * it back (a block pasted into the notepad restores the bench); RiffRaft reads it to play the étude.
 *
 * THE KEYS ARE THE SNAPSHOT'S OWN (format §2): the writer iterates whatever etudeRecord(doc).snapshot() hands it, in its
 * order. There is no key list here — a setting added to the bench later reaches the block with no edit to this file.
 * The one key left out is named, with its reason (BLOCK_OMITS).
 *
 * THE VALUE GRAMMAR (format §3) is the family's flow grammar, engine/atchart.mjs's, reused — reached through the two
 * public functions that already speak it (readApp and writeApp, on a one-entry apps map: FLOW below), so the grammar
 * stays one function and atchart's export list, which six published pages carry, does not move. One addition the
 * format rules: TOP-LEVEL TEXT IS WRITTEN BARE WHENEVER READING IT BACK BARE GIVES THE SAME TEXT,
 * and quoted (JSON) only when it would not. The writer proves every line reads back to the value it wrote before it
 * returns, so a value the grammar cannot carry is refused at the write, never shipped.
 *
 * A BAD VALUE IS FLAGGED, NEVER GUESSED (format §6): the reader returns what it could read and names what it could not.
 * checkEtude adds the bench's own refusals (the field's key, scale and reference; opensOf's tuning) — the bench's
 * functions, called, not a second table of what is allowed.
 *
 * SETTINGS, NEVER NOTES (format §1, charter §7): nothing here derives or stores a note. The notes are etude-timeline.mjs's,
 * derived from these settings every time the étude plays.
 */
import { readApp, writeApp } from "./atchart.mjs";
import { field, opensOf } from "./field.mjs";

/** the fence's info string (format §9 decision 1) */
export const ETUDE_FENCE = "etude";

/** the envelope lines that come first, in the practice log's own words (format §9 decision 4) */
export const ENVELOPE = ["app", "v"];

/** the snapshot schema a block written today names on its `v:` line — the practice log's own payload version
 * (hub/modules/notepad-card.mjs, `version:` in its adapter); engine/tests/etude-block.test.mjs holds the two equal */
export const ETUDE_V = 2;

/** what the block does not carry — the only list in this file, each with its reason (format §9 decision 5) */
export const BLOCK_OMITS = {
  chart: "the notepad's own chart-block text, mirrored — the note the block is pasted into has its own",
};

const NUMBER = /^-?\d+(\.\d+)?$/;   // the flow grammar's number, exactly (parseFlow)
const KEY_LINE = /^([A-Za-z_][A-Za-z0-9_.-]*):(.*)$/;

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** THE FLOW GRAMMAR, atchart's own: a value is read or written as a one-entry apps map's entry. readApp answers null
 * for flow it cannot read; read() is only asked for a list or a map, which never reads as null, so null means refused. */
const FLOW = {
  read: (s) => readApp({ _fm: [{ kind: "apps", entries: [{ id: "x", raw: `x: ${s}` }] }] }, "x"),
  write: (v) => writeApp({ _fm: [], meta: {} }, "x", v)._fm[0].entries[0].raw.replace(/^\s*x: /, ""),
};

/** one top-level value → { value } or { reason } (format §3) */
export function readValue(raw) {
  const s = String(raw).trim();
  if (s === "") return { value: "" };
  if (s[0] === "[" || s[0] === "{") {
    const v = FLOW.read(s);
    return v !== null ? { value: v } : { reason: `not a readable ${s[0] === "[" ? "list" : "map"}: ${s}` };
  }
  if (s[0] === '"') {
    try { const v = JSON.parse(s); if (typeof v === "string") return { value: v }; } catch { /* named below */ }
    return { reason: `an unfinished quote: ${s}` };
  }
  if (s === "true") return { value: true };
  if (s === "false") return { value: false };
  if (s === "null") return { value: null };
  if (NUMBER.test(s)) return { value: Number(s) };
  return { value: s };
}

/** one top-level value → its text; refuses a value that would not read back as itself */
export function writeValue(v) {
  let out;
  if (typeof v === "string") {
    const bare = readValue(v);
    out = v === v.trim() && !/[\r\n]/.test(v) && "value" in bare && bare.value === v ? v : JSON.stringify(v);
  } else out = FLOW.write(v);
  const back = readValue(out);
  if (!("value" in back) || !same(back.value, v))
    throw new Error(`etude block: the value ${JSON.stringify(v)} does not read back as itself — it cannot be written`);
  return out;
}

const line = (k, v) => { const t = writeValue(v); return t === "" ? `${k}:` : `${k}: ${t}`; };

/** a snapshot (and its envelope) → the block's body, one key per line: app, v, then the snapshot's keys in order */
export function etudeBlockBody(snapshot, { app, v }) {
  if (!snapshot || typeof snapshot !== "object") throw new Error("etude block: no étude to write");
  for (const k of ENVELOPE)
    if (k in snapshot) throw new Error(`etude block: the étude carries "${k}", which the envelope's line already names`);
  const out = [line("app", app), line("v", v)];
  for (const [k, val] of Object.entries(snapshot)) {
    if (k in BLOCK_OMITS) continue;
    if (!KEY_LINE.test(`${k}:`)) throw new Error(`etude block: "${k}" cannot be a key line`);
    out.push(line(k, val));
  }
  return out.join("\n");
}

/** the fenced block, ready to paste into a note */
export const etudeBlock = (snapshot, envelope) => "```" + ETUDE_FENCE + "\n" + etudeBlockBody(snapshot, envelope) + "\n```";

/** the body of the first etude fence in a note's text, or null — the notepad's chart-fence scan, for this fence */
export function findEtudeBlock(text) {
  const lines = String(text || "").split("\n");
  const open = lines.findIndex((l) => l.trim() === "```" + ETUDE_FENCE);
  if (open < 0) return null;
  const close = lines.findIndex((l, i) => i > open && /^\s*```\s*$/.test(l));
  return close > open ? lines.slice(open + 1, close).join("\n") : null;
}

/** a block's body → { app, v, snapshot, flagged, lines }
 *   snapshot  every key that read, in the block's order (the envelope's lines are not in it)
 *   flagged   [{ n, key?, raw, reason }] — what did not read, by line number; never in the snapshot
 *   lines     every line, kept verbatim with its kind (pair · comment · blank · other) — format §5's preservation */
export function readEtudeBlock(body) {
  const lines = [], flagged = [], seen = new Map(), read = new Map();
  String(body ?? "").replace(/\r\n?/g, "\n").split("\n").forEach((raw, i) => {
    const n = i + 1, t = raw.trim();
    if (t === "") { lines.push({ kind: "blank", raw }); return; }
    if (t[0] === "#") { lines.push({ kind: "comment", raw }); return; }
    const m = t.match(KEY_LINE);
    if (!m) { lines.push({ kind: "other", raw }); flagged.push({ n, raw, reason: "not a key: value line" }); return; }
    const key = m[1];
    lines.push({ kind: "pair", key, raw });
    if (seen.has(key)) {
      flagged.push({ n, key, raw, reason: `${key} is said twice (lines ${seen.get(key)} and ${n})` });
      read.delete(key); seen.set(key, n); return;   // neither is taken: picking one would be a guess
    }
    seen.set(key, n);
    const r = readValue(m[2]);
    if ("value" in r) read.set(key, r.value);
    else flagged.push({ n, key, raw, reason: r.reason });
  });
  const snapshot = {};
  for (const [k, v] of read) if (!ENVELOPE.includes(k)) snapshot[k] = v;
  const app = read.get("app"), v = read.get("v");
  if (app !== undefined && typeof app !== "string")
    flagged.push({ n: seen.get("app"), key: "app", raw: `app: ${app}`, reason: "app names the app that wrote the étude, as a word" });
  if (v !== undefined && !Number.isInteger(v))
    flagged.push({ n: seen.get("v"), key: "v", raw: `v: ${v}`, reason: "v is the snapshot's schema, a whole number" });
  return { app: typeof app === "string" ? app : null, v: Number.isInteger(v) ? v : null, snapshot, flagged, lines };
}

/** a body with its values set to a snapshot's, everything else kept in place (format §5): a pair whose value is
 * unchanged keeps its own text, a changed one is rewritten, a snapshot key the body lacks is added at the end, and
 * comments, blanks and unread lines are written back exactly as they were */
export function rewriteEtudeBlock(body, snapshot, envelope) {
  const was = readEtudeBlock(body);
  const want = { ...(envelope || {}), ...snapshot };
  for (const k of Object.keys(BLOCK_OMITS)) delete want[k];
  const said = new Set();
  const out = was.lines.map((l) => {
    if (l.kind !== "pair" || !(l.key in want) || said.has(l.key)) return l.raw;
    said.add(l.key);
    const now = readValue(l.raw.slice(l.raw.indexOf(":") + 1));
    return "value" in now && same(now.value, want[l.key]) ? l.raw : line(l.key, want[l.key]);
  });
  for (const k of Object.keys(want)) if (!said.has(k)) out.push(line(k, want[k]));
  return out.join("\n");
}

/** the bench's own refusals of a read snapshot → [{ key, reason }] (format §6). Each check calls the function the bench
 * itself calls; a key no bench function refuses is not checked here — its owner hears it on restore. */
export function checkEtude(snapshot) {
  const bad = [];
  const tryIt = (key, fn) => { try { fn(); } catch (e) { bad.push({ key, reason: String(e.message || e) }); } };
  const s = snapshot || {};
  if ("key" in s) tryIt("key", () => field({ key: s.key }));
  if ("scale" in s) tryIt("scale", () => field({ key: "C", scale: s.scale }));
  if ("ref" in s) tryIt("ref", () => field({ key: "C", ref: s.ref }));
  if ("tuning" in s && s.tuning !== null) tryIt("tuning", () => {
    if (typeof s.tuning !== "object" || Array.isArray(s.tuning)) throw new Error("a tuning is a map of string number to semitone offset");
    opensOf(s.tuning);
  });
  return bad;
}
