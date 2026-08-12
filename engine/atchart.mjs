/* atchart.mjs — parser + serializer for the .atchart.md format (v1 + v1.1).
 * Spec: docs/atchart-format.md (v1 ratified 2026-08-08; v1.1 ratified
 * 2026-08-10 — §2.6 app namespaces, §2.7 unknown frontmatter keys, §5 the
 * handoff channel; Update Log 260810.5). Pure, no DOM.
 *
 * Round-trip law (§4): parse→serialize→parse identical; serialize is a fixed
 * point; and — v1.1 — unknown frontmatter keys and apps: entries replay
 * VERBATIM, so a file can pass through several applications and come back
 * whole. A v1 file with no apps: round-trips byte-identically and never
 * acquires a version bump; `atchart: 1.1` becomes writable only when
 * something actually writes an apps: map (writeApp).
 *
 * §2.6 is deliberately schema-free: entries are opaque — carried,
 * round-tripped, never interpreted, never validated. A validator here would
 * be the bug: opacity is the mechanism that keeps unknown app ids and
 * higher-v entries intact across readers.
 */
import { parseChord } from "./chord.mjs";

export const ATCHART_VERSION = 1;
// the body-skeleton slot markers (§2.5 preservation): exported so consumers
// building documents THROUGH this engine (engine/notepad.mjs) can place the
// chart slot without copying the literal
export const CHART_SLOT = "\x00CHART\x00";

const DEFAULTS = { key: "C", meter: "4/4" };
const FM_ORDER = ["atchart", "title", "composer", "key", "meter", "tempo", "form", "sections"];

// ---------- frontmatter ----------
// Deliberately tiny YAML subset: scalar lines + [a, b] lists + ONE nested
// block, apps: (§2.6). v1.1 §2.7: every line is kept as a raw segment in
// original order, and the serializer REPLAYS the raw text for anything the
// caller has not changed — unknown keys, comments, odd spacing and apps:
// entries all round-trip byte-identically instead of being re-normalized.

function parseScalar(val) {
  if (val.startsWith("[") && val.endsWith("]"))
    return val.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
  if ((val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'")))
    return val.slice(1, -1);
  return /^-?\d+(\.\d+)?$/.test(val) ? Number(val) : val;
}

function canonLine(k, v) {
  if (Array.isArray(v)) return `${k}: [${v.join(", ")}]`;
  if (typeof v === "string" && /[:#\[\]]/.test(v)) return `${k}: "${v}"`;
  if (typeof v === "string" && v !== v.trim()) return `${k}: "${v}"`;
  return `${k}: ${v}`;
}

function parseFrontmatter(lines) {
  const meta = {};
  const fm = []; // ordered raw segments: {kind:"key"|"verbatim"|"apps", ...}
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line || line.startsWith("#")) { fm.push({ kind: "verbatim", raw }); i++; continue; }
    if (/^\s/.test(raw)) { // indentation outside an apps: block: not ours, keep it
      fm.push({ kind: "verbatim", raw }); i++; continue;
    }
    const ci = line.indexOf(":");
    if (ci < 1) throw new Error(`bad frontmatter line: "${raw}"`);
    const key = line.slice(0, ci).trim();
    const rest = line.slice(ci + 1).trim();
    if (key === "apps" && rest === "") {
      // §2.6: entries are RAW — carried, round-tripped, never interpreted
      const entries = [];
      i++;
      while (i < lines.length && /^\s+\S/.test(lines[i])) {
        const el = lines[i];
        const em = el.trim().match(/^([A-Za-z0-9_-]+):/);
        if (em) entries.push({ id: em[1], raw: el });
        else if (entries.length) entries[entries.length - 1].raw += "\n" + el;
        else entries.push({ id: null, raw: el });
        i++;
      }
      fm.push({ kind: "apps", entries });
      continue;
    }
    const value = parseScalar(rest);
    fm.push({ kind: "key", key, raw, value });
    meta[key] = value;
    i++;
  }
  return { meta, fm };
}

const valEq = (a, b) =>
  Array.isArray(a) && Array.isArray(b) ? a.join("\u0000") === b.join("\u0000") : a === b;

function serializeFrontmatter(meta, fm) {
  if (!fm) { // programmatically-built doc: canonical order, canonical lines
    const keys = [...FM_ORDER.filter((k) => k in meta),
      ...Object.keys(meta).filter((k) => !FM_ORDER.includes(k))];
    return keys.map((k) => canonLine(k, meta[k])).join("\n");
  }
  const out = [];
  const seen = new Set();
  for (const seg of fm) {
    if (seg.kind === "verbatim") { out.push(seg.raw); continue; }
    if (seg.kind === "apps") {
      seen.add("apps");
      out.push("apps:");
      for (const e of seg.entries) out.push(e.raw);
      continue;
    }
    seen.add(seg.key);
    if (!(seg.key in meta)) continue;              // deleted by the caller
    if (valEq(meta[seg.key], seg.value)) out.push(seg.raw); // untouched: VERBATIM
    else out.push(canonLine(seg.key, meta[seg.key]));       // changed: canonical
  }
  for (const k of Object.keys(meta)) {
    if (seen.has(k) || k === "apps") continue;
    // defaults injected at parse are not the file's text — appending them
    // would break §4's byte-identity for files that never wrote them
    if (k in DEFAULTS && valEq(meta[k], DEFAULTS[k])) continue;
    out.push(canonLine(k, meta[k]));
  }
  return out.join("\n");
}

// ---------- §2.6: the apps accessor ----------
// The format claims the key `apps` and NOTHING inside it. Entries are opaque
// at parse; readApp materializes ONE entry on demand for its own app;
// writeApp replaces ONE entry with a canonical serialization. Both return
// new documents / fresh objects and never mutate their input. There is no
// schema and no validator, on purpose — a helpful validator here would be
// the bug, because opacity is what lets one file pass through several apps
// (unknown ids, higher payload v) and come back whole.

function parseFlow(src) {
  let i = 0;
  const s = String(src);
  const fail = () => { throw new Error("flow"); };
  const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  function scalarEnd(stops) {
    let j = i;
    while (j < s.length && !stops.includes(s[j])) j++;
    return j;
  }
  function value() {
    ws();
    const c = s[i];
    if (c === "{") {
      i++; const o = {}; ws();
      if (s[i] === "}") { i++; return o; }
      for (;;) {
        ws();
        const m = s.slice(i).match(/^([A-Za-z0-9_.-]+)\s*:/) || fail();
        i += m[0].length;
        o[m[1]] = value();
        ws();
        if (s[i] === ",") { i++; continue; }
        if (s[i] === "}") { i++; return o; }
        fail();
      }
    }
    if (c === "[") {
      i++; const a = []; ws();
      if (s[i] === "]") { i++; return a; }
      for (;;) {
        a.push(value()); ws();
        if (s[i] === ",") { i++; continue; }
        if (s[i] === "]") { i++; return a; }
        fail();
      }
    }
    if (c === '"' || c === "'") {
      const q = c; let out = ""; i++;
      while (i < s.length && s[i] !== q) {
        if (s[i] === "\\" && i + 1 < s.length) { out += s[i + 1]; i += 2; }
        else { out += s[i]; i++; }
      }
      if (s[i] !== q) fail();
      i++; return out;
    }
    const j = scalarEnd([",", "}", "]"]);
    const tok = s.slice(i, j).trim();
    i = j;
    if (tok === "") fail();
    if (tok === "true") return true;
    if (tok === "false") return false;
    if (tok === "null") return null;
    if (/^-?\d+(\.\d+)?$/.test(tok)) return Number(tok);
    return tok; // bare word = string (the spec's own example: `scale: major`)
  }
  const v = value(); ws();
  if (i < s.length) fail();
  return v;
}

function serializeFlow(v) {
  if (v === null) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "string")
    return /^[A-Za-z0-9_.-]+$/.test(v) && !/^-?\d+(\.\d+)?$/.test(v) &&
      !["true", "false", "null"].includes(v)
      ? v : JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(serializeFlow).join(", ") + "]";
  if (typeof v === "object")
    return "{" + Object.entries(v)
      .map(([k, x]) => `${k}: ${serializeFlow(x)}`).join(", ") + "}";
  return JSON.stringify(String(v));
}

/** readApp(doc, id) → the app's own entry as a fresh object, or null.
 * Never mutates doc; never validates the entry (no schema — see above). */
export function readApp(doc, id) {
  const seg = (doc && doc._fm || []).find((x) => x.kind === "apps");
  if (!seg) return null;
  const e = seg.entries.find((x) => x.id === id);
  if (!e) return null;
  const m = e.raw.trim().match(/^[A-Za-z0-9_-]+:\s*([\s\S]*)$/);
  try { return parseFlow(m ? m[1] : ""); }
  catch { return null; } // an unreadable entry is absent to its app, never a throw
}

/** writeApp(doc, id, cfg) → a NEW document with only this app's entry
 * replaced (canonical flow serialization). Every other entry's raw text —
 * unknown app ids, higher payload v — replays verbatim. Writing an apps:
 * map is the one thing that turns `atchart: 1` into `atchart: 1.1`. */
export function writeApp(doc, id, cfg) {
  if (!/^[A-Za-z0-9_-]+$/.test(String(id)))
    throw new Error(`writeApp: app id "${id}" is not a slug`);
  const nd = JSON.parse(JSON.stringify(doc));
  if (!nd._fm) {
    nd._fm = [];
    const keys = [...FM_ORDER.filter((k) => k in nd.meta),
      ...Object.keys(nd.meta).filter((k) => !FM_ORDER.includes(k))];
    for (const k of keys) {
      if (k in DEFAULTS && valEq(nd.meta[k], DEFAULTS[k])) continue;
      nd._fm.push({ kind: "key", key: k, raw: canonLine(k, nd.meta[k]), value: nd.meta[k] });
    }
  }
  let seg = nd._fm.find((x) => x.kind === "apps");
  if (!seg) { seg = { kind: "apps", entries: [] }; nd._fm.push(seg); }
  const line = `  ${id}: ${serializeFlow(cfg)}`;
  const at = seg.entries.findIndex((x) => x.id === id);
  if (at >= 0) seg.entries[at] = { id, raw: line };
  else seg.entries.push({ id, raw: line });
  if (Number(nd.meta.atchart) === 1) nd.meta.atchart = 1.1;
  return nd;
}

// ---------- the chart block ----------

function parseChartBlock(lines) {
  const sections = [];
  let cur = null;
  const openSection = (name) => {
    cur = { name, bars: [], melody: [] };
    sections.push(cur);
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    let rest = line;
    const secM = rest.match(/^@(\S+)\s*/);
    if (secM) {
      openSection(secM[1]);
      rest = rest.slice(secM[0].length);
      if (!rest) continue;
    }
    if (/^melody:/.test(rest)) {
      if (!cur) openSection("A");
      cur.melody.push(rest.replace(/^melody:\s*/, ""));
      continue;
    }
    if (!cur) openSection("A");
    parseBarLine(rest, cur);
  }
  return sections;
}

function parseBarLine(text, section) {
  // tokenize on bar separators, tracking |: and :|
  let i = 0;
  let pendingRepeatStart = false;
  let bar = null;
  const flush = () => {
    if (bar && (bar.chords.length || bar.repeatStart || bar.repeatEnd)) section.bars.push(bar);
    bar = null;
  };
  // humans type "|Bbmaj7|G7#5|" — split on bar tokens directly, longest first,
  // so :|: never decomposes into :| + : or | + :
  const tokens = text
    .split(/(:\|:|\|:|:\|(?!:)|\|)/)
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((s) => (/^(:\|:|\|:|:\||\|)$/.test(s) ? [s] : s.split(/\s+/)));
  for (const tok of tokens) {
    if (tok === "|:") {
      flush();
      pendingRepeatStart = true;
    } else if (tok === ":|") {
      if (bar) bar.repeatEnd = true;
      flush();
    } else if (tok === "|") {
      flush();
    } else if (tok === ":|:") {
      if (bar) bar.repeatEnd = true;
      flush();
      pendingRepeatStart = true;
    } else {
      if (!bar) {
        bar = { chords: [], repeatStart: pendingRepeatStart, repeatEnd: false };
        pendingRepeatStart = false;
      }
      // chord symbols validate through the shared parser — bad text is an error
      // with a message naming the token, never a silently-wrong chart
      const parsed = parseChord(tok);
      bar.chords.push({ symbol: tok, parsed });
    }
    i++;
  }
  flush();
}

function serializeChartBlock(sections) {
  const lines = [];
  const multi = sections.length > 1 || sections[0]?.name !== "A";
  for (const sec of sections) {
    const parts = [];
    for (const bar of sec.bars) {
      parts.push(bar.repeatStart ? "|:" : "|");
      parts.push(bar.chords.map((c) => c.symbol).join(" "));
      if (bar.repeatEnd) {
        parts.push(":|");
      }
    }
    if (parts.length && parts[parts.length - 1] !== ":|") parts.push("|");
    const head = multi ? `@${sec.name}  ` : "";
    lines.push(head + parts.join(" "));
    for (const m of sec.melody) lines.push((multi ? "     " : "") + "melody: " + m);
  }
  return lines.join("\n");
}

// ---------- substitutions ----------

const SUB_RE = /^-\s+(\S+?)\.b(\d+)\s+(.+?)\s+(?:->|→)\s+(.+?)\s*(?:\[(.+?)\])?\s*$/;

function parseSubLine(line) {
  const m = line.match(SUB_RE);
  if (!m) return null;
  const parseSide = (s) => s.split(/\s+/).filter(Boolean).map((sym) => ({ symbol: sym, parsed: parseChord(sym) }));
  return {
    section: m[1],
    bar: Number(m[2]),
    original: parseSide(m[3]),
    replacement: parseSide(m[4]),
    name: m[5] || null,
  };
}

function serializeSub(sub) {
  const side = (cs) => cs.map((c) => c.symbol).join(" ");
  return `- ${sub.section}.b${sub.bar}  ${side(sub.original)}  ->  ${side(sub.replacement)}${sub.name ? `  [${sub.name}]` : ""}`;
}

// ---------- the whole document ----------

/**
 * parseAtchart(text) → { meta, sections, substitutions, practiceLog, body }
 * `body` is the document skeleton with placeholders, so serialization preserves
 * every line the format doesn't claim (spec §2.5).
 */
export function parseAtchart(text) {
  if (typeof text !== "string") throw new Error("atchart source must be a string");
  const lines = text.split(/\r?\n/);

  // frontmatter
  if (lines[0] !== "---") throw new Error("missing frontmatter (--- on line 1)");
  const fmEnd = lines.indexOf("---", 1);
  if (fmEnd < 0) throw new Error("unterminated frontmatter");
  const { meta: fmMeta, fm } = parseFrontmatter(lines.slice(1, fmEnd));
  const meta = { ...DEFAULTS, ...fmMeta };
  if (meta.atchart === undefined) throw new Error("frontmatter must declare: atchart: 1");
  if (Math.floor(Number(meta.atchart)) > ATCHART_VERSION)
    throw new Error(`atchart version ${meta.atchart} is newer than this parser (v${ATCHART_VERSION})`);

  // walk the body: extract the chart block and the two claimed sections,
  // keep everything else verbatim
  const body = [];
  let chartLines = null;
  const sections = [];
  const substitutions = [];
  const practiceLog = [];
  let mode = "prose"; // prose | chart | subs | log
  let sawChart = false;

  for (let i = fmEnd + 1; i < lines.length; i++) {
    const line = lines[i];
    if (mode === "chart") {
      if (/^```\s*$/.test(line)) {
        sections.push(...parseChartBlock(chartLines));
        chartLines = null;
        mode = "prose";
      } else chartLines.push(line);
      continue;
    }
    if (/^```chart\s*$/.test(line)) {
      if (sawChart) throw new Error("multiple chart blocks are reserved for v2");
      sawChart = true;
      chartLines = [];
      mode = "chart";
      body.push(CHART_SLOT);
      continue;
    }
    if (/^##\s+Substitutions\s*$/i.test(line)) {
      mode = "subs";
      body.push("\x00SUBS\x00");
      continue;
    }
    if (/^##\s+Practice log\s*$/i.test(line)) {
      mode = "log";
      body.push("\x00LOG\x00");
      continue;
    }
    if (/^##?\s+/.test(line) && (mode === "subs" || mode === "log")) mode = "prose";

    if (mode === "subs") {
      const sub = line.trim() ? parseSubLine(line) : null;
      if (sub) substitutions.push(sub);
      else if (line.trim()) throw new Error(`bad substitution line: "${line}"`);
      continue;
    }
    if (mode === "log") {
      if (line.trim()) practiceLog.push(line.replace(/^-\s*/, ""));
      continue;
    }
    body.push(line);
  }
  if (mode === "chart") throw new Error("unterminated chart block");
  if (!sawChart) throw new Error("no ```chart block found");

  return { meta, sections, substitutions, practiceLog, body, _fm: fm };
}

export function serializeAtchart(doc) {
  const out = [];
  out.push("---");
  out.push(serializeFrontmatter(doc.meta, doc._fm));
  out.push("---");
  for (const line of doc.body) {
    if (line === CHART_SLOT) {
      out.push("```chart");
      out.push(serializeChartBlock(doc.sections));
      out.push("```");
    } else if (line === "\x00SUBS\x00") {
      out.push("## Substitutions");
      out.push("");
      for (const s of doc.substitutions) out.push(serializeSub(s));
    } else if (line === "\x00LOG\x00") {
      out.push("## Practice log");
      out.push("");
      for (const l of doc.practiceLog) out.push("- " + l);
    } else out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\n+$/, "") + "\n";
}
