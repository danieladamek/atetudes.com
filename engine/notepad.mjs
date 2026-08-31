/* notepad.mjs — the shared notepad model (component v1).
 *
 * The notepad pattern's child 2 (decisions 1, 2, 6, 7, 8): one document model,
 * one per-app payload slot, one file any sibling app can open. Pure module:
 * no DOM, no storage, no audio — the HOST wires those through the adapter
 * seam {app, version, snapshot(), apply(payload), summarize(payload)}.
 *
 * Document = { pad, entries, _at? }
 *   pad      free markdown, the user's (charter §7: data, never code)
 *   entries  [{id, savedAt, heading, text, payload}]
 *   payload  {app, v, data} — data is OPAQUE to this module. The host
 *            supplies it (adapter.snapshot()) and the host reads it
 *            (adapter.apply / adapter.summarize). An unrecognized app or a
 *            v above the reader's is carried untouched — never dropped,
 *            never guessed at. summarize() output is DERIVED, never stored:
 *            a stored summary field is the bug class 260811.3 flagged.
 *   _at      the parsed engine/atchart.mjs document a foreign file arrived
 *            as — chart block, substitutions, practice log and §2.7
 *            frontmatter all replay through the ENGINE on write. This
 *            module never grows a rival format implementation; that split
 *            is the point (260811.6).
 *
 * File shape (.atchart.md): frontmatter · chart block (empty for a pure
 * notepad file; real charts from sibling apps replay verbatim) · the pad's
 * markdown · "## Notes" · one "### <savedAt>" span per entry, prose then a
 * fenced ```json ENVELOPE {app, v, id, savedAt, data}. The envelope is what
 * makes an entry an entry; a user's own fenced block — even a ```json one
 * without an envelope shape — is prose and stays prose. Fences pair top to
 * bottom; an unclosed opener is literal text (the same rule the markdown
 * engine renders by), so a stray ``` in a note can never swallow a payload.
 *
 * No derived musical data is stored (§7): entries carry what the user typed
 * and the host's CONFIG choice; anything derivable recomputes on load.
 * The file is the handoff channel (§5): storage is a per-app cache, and
 * this module never touches either.
 */

// ---------- ids and construction ----------

export function makeEntry(fields) {
  const f = fields || {};
  return {
    id: String(f.id ?? entryId()),
    savedAt: f.savedAt === undefined ? null : f.savedAt,
    heading: f.heading === undefined ? null : f.heading,
    text: String(f.text ?? ""),
    payload: f.payload === undefined ? null : f.payload,
  };
}
function entryId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

export function emptyDoc() { return { pad: "", entries: [] }; }

// ---------- pure entry operations (every one returns a NEW document) ----------

export function addEntry(doc, entry) {
  return { ...doc, entries: [...doc.entries, makeEntry(entry)] };
}
export function editEntry(doc, id, patch) {
  return { ...doc, entries: doc.entries.map((e) =>
    e.id === id ? makeEntry({ ...e, ...patch, id: e.id }) : e) };
}
export function deleteEntry(doc, id) {
  return { ...doc, entries: doc.entries.filter((e) => e.id !== id) };
}
export function reorderEntry(doc, id, toIndex) {
  const from = doc.entries.findIndex((e) => e.id === id);
  if (from < 0) return { ...doc, entries: [...doc.entries] };
  const entries = [...doc.entries];
  const [m] = entries.splice(from, 1);
  entries.splice(Math.max(0, Math.min(entries.length, toIndex | 0)), 0, m);
  return { ...doc, entries };
}

// ---------- the v1.0 Metronome migration (before any UI — the pin) ----------

/** fromMetronomeV1(pad, log) → doc. The shipped v1.0 shapes are the
 * characterization pin: pad was a bare string (metronome.v1.pad), log was
 * [{id, savedAt, text, metro}] (metronome.v1.log). Nothing is lost: every
 * field maps, the metro config becomes the opaque payload data. */
export function fromMetronomeV1(pad, log) {
  const entries = (Array.isArray(log) ? log : []).map((en) => makeEntry({
    id: en.id, savedAt: en.savedAt ?? null, text: en.text ?? "",
    payload: { app: "metronome", v: 1, data: en.metro ?? null },
  }));
  return { pad: String(pad ?? ""), entries };
}

/** fromTriadetudesV1(log) → doc. The shipped Practice Log shape is the pin:
 * [{id, savedAt, minutes, title, summary, intention, accomplished, cfg}]
 * (triadetudes.v1.log). The cfg is a complete rawCfg() snapshot (established
 * 260811.3) and becomes the opaque payload data BYTE-IDENTICAL. Note text
 * merges the two prose fields under their old row markers (→ intention,
 * ✓ accomplished) so the distinction survives as visible text; the duration
 * joins the note as a trailing line — a fact of the session, kept visible.
 * title and summary are DROPPED: both are derived values (summary is the
 * stale-cache bug 260811.3 flagged; the label now derives at render via
 * adapter.summarize). Supersedes "Stop storing en.summary". */
export function fromTriadetudesV1(log) {
  const entries = (Array.isArray(log) ? log : []).map((en) => {
    const parts = [];
    if (en.intention) parts.push("\u2192 " + en.intention);
    if (en.accomplished) parts.push("\u2713 " + en.accomplished);
    if (en.minutes) parts.push("~" + en.minutes + " min");
    return makeEntry({
      id: en.id, savedAt: en.savedAt ?? null, text: parts.join("\n\n"),
      payload: { app: "triadetudes", v: 1, data: en.cfg ?? null },
    });
  });
  return { pad: "", entries };
}

// ---------- fence pairing (shared by parse; the unclosed rule) ----------

function pairFences(lines) {
  // returns [{open, close, info}] for CLOSED fences only: an opener may carry
  // an info string, only a BARE ``` closes (the markdown engine's rule), and
  // an opener with no closer is not a fence — it is literal text
  const out = [];
  let open = -1, info = "";
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^```(.*)$/);
    if (!m) continue;
    if (open < 0) { open = i; info = m[1].trim(); }
    else if (m[1].trim() === "") { out.push({ open, close: i, info }); open = -1; }
    // an info-carrying ``` line inside an open fence is content, not a closer
  }
  return out;
}

function envelopeOf(lines, fence) {
  if (fence.info !== "json") return null;
  try {
    const o = JSON.parse(lines.slice(fence.open + 1, fence.close).join("\n"));
    if (o && typeof o === "object" && !Array.isArray(o) &&
        typeof o.app === "string" && typeof o.id === "string" && "data" in o)
      return o;
  } catch { /* a user's own json block: prose stays prose */ }
  return null;
}

// ---------- to / from .atchart.md, THROUGH engine/atchart.mjs ----------

import { parseAtchart, serializeAtchart, CHART_SLOT } from "./atchart.mjs";

const NOTES_HEAD = /^##\s+Notes\s*$/;

/** toAtchart(doc, meta) → .atchart.md source. meta merges into frontmatter
 * (atchart version and defaults handled by the engine). A foreign file's
 * chart, substitutions, practice log and unknown frontmatter replay through
 * the engine untouched; a pure notepad file carries an empty chart block. */
const CHART_OPENER = /^```chart\s*$/;

export function toAtchart(doc, meta) {
  // the format's one-chart law (spec §2.2, multiples reserved for v2).
  // ENTRIES refuse a ```chart fence by name — a note is a per-take record,
  // not the document's chart. The PAD is different: its single chart fence
  // IS the document's chart (tier 3 — the palette inserts structures here),
  // so it is LIFTED into the file's chart block, positioned where the user
  // typed it. Two fences, an unclosed opener, or a fence when the file
  // already carries a chart all refuse by name; nothing is lost or mangled.
  const offends = (t) => String(t ?? "").split("\n").some((l) => CHART_OPENER.test(l));
  if (doc.entries.some((e) => offends(e.text)))
    /* REWORDED 260911 (item 2a, PO finding): the old message cited the spec
     * ("the format holds one chart per file (v1)") — a citation, not an
     * instruction. The player needs the route, and the route is the pad's
     * own lift: its one chart fence becomes the file's chart block. Host-
     * neutral by necessity — this string is carried into every door. */
    throw new Error("a saved note holds a ```chart fence — move the chart into " +
      "the pad, where its one ```chart fence becomes the file's chart block; " +
      "a fence that is just prose can be a plain ``` fence");
  const at = doc._at
    ? JSON.parse(JSON.stringify(doc._at))
    : { meta: { atchart: 1, ...(meta || {}) },
        sections: [], substitutions: [], practiceLog: [], body: [] };
  if (doc._at && meta) at.meta = { ...at.meta, ...meta };

  const pad = String(doc.pad ?? "").replace(/\n+$/, "");
  let padLines = pad ? pad.split("\n") : [];
  const chartFences = pairFences(padLines).filter((f) => f.info === "chart");
  const strayOpeners = padLines.filter((l) => CHART_OPENER.test(l)).length;
  if (chartFences.length > 1 ||
      (chartFences.length === 0 && strayOpeners > 0) ||
      (chartFences.length === 1 && strayOpeners > 1))
    throw new Error("the pad holds " + (strayOpeners || chartFences.length) +
      " ```chart openers — the format holds one chart per file (v1), " +
      "and an unclosed chart fence cannot be written");
  let body;
  // where does the stored file keep its chart? slot at body[0] = file-level
  // (the classic layout); slot deeper in = the pad owns it (a prior lift)
  const storedSlot = doc._at ? doc._at.body.indexOf(CHART_SLOT) : -1;
  if (chartFences.length === 1) {
    if (at.sections.length && storedSlot === 0)
      throw new Error("the file already carries a chart block — one per " +
        "file (v1); edit the existing chart or remove the pad's fence");
    const f = chartFences[0];
    // parse the fence THROUGH the format engine — its assertions gate the write
    const probe = parseAtchart("---\natchart: 1\n---\n```chart\n" +
      padLines.slice(f.open + 1, f.close).join("\n") + "\n```\n");
    at.sections = probe.sections;
    padLines = [...padLines.slice(0, f.open), CHART_SLOT,
      ...padLines.slice(f.close + 1)];
    body = [];
  } else {
    body = [CHART_SLOT];
  }
  if (padLines.length) { if (body.length) body.push(""); body.push(...padLines); }
  if (doc.entries.length) {
    body.push("");
    body.push("## Notes");
    for (const e of doc.entries) {
      body.push("");
      body.push("### " + (e.heading ?? (e.savedAt || "note")));
      const text = String(e.text ?? "").replace(/\n+$/, "");
      if (text) { body.push(""); body.push(...text.split("\n")); }
      if (e.payload) {
        body.push("");
        body.push("```json");
        body.push(JSON.stringify({ app: e.payload.app, v: e.payload.v,
          id: e.id, savedAt: e.savedAt, data: e.payload.data }));
        body.push("```");
      }
    }
  }
  at.body = body;
  return serializeAtchart(at);
}

/** fromAtchart(src) → doc. Parses THROUGH the engine (charts, §2.7, apps:
 * maps all intact in _at), then reads the notepad's own section: pad = the
 * prose before "## Notes" (fence-aware — a "## Notes" inside a fenced block
 * is prose); entries = "### " spans after it. A span with an envelope fence
 * is a payload entry; a span without one is a payloadless entry (foreign
 * prose is carried, never dropped). Throws only what parseAtchart throws —
 * a non-atchart file is refused by the format, not mangled by this module. */
export function fromAtchart(src) {
  const at = parseAtchart(src);
  const body = at.body;
  const fences = pairFences(body);
  const inFence = (i) => fences.some((f) => f.open < i && i < f.close);

  let notesAt = -1;
  for (let i = 0; i < body.length; i++)
    if (NOTES_HEAD.test(body[i]) && !inFence(i)) { notesAt = i; break; }

  const padRegion = notesAt < 0 ? body : body.slice(0, notesAt);
  const chartFenceText = () => {
    // the file's chart, re-rendered engine-canonically for the pad
    const mini = serializeAtchart({ meta: { atchart: 1 }, sections: at.sections,
      substitutions: [], practiceLog: [], body: [CHART_SLOT] });
    const a = mini.indexOf("```chart");
    return mini.slice(a, mini.indexOf("\n```", a) + 4);
  };
  const padLines = [];
  padRegion.forEach((l, i) => {
    if (l !== CHART_SLOT) { padLines.push(l); return; }
    // slot at the very top of the body = a file-level chart (the classic
    // notepad layout); a slot further down was LIFTED from the pad and
    // renders back into it, where the user put it
    if (i > 0) padLines.push(...chartFenceText().split("\n"));
  });
  const pad = padLines.join("\n").replace(/^\n+/, "").replace(/\n+$/, "");

  const entries = [];
  if (notesAt >= 0) {
    const tail = body.slice(notesAt + 1);
    const tailFences = pairFences(tail);
    const inTailFence = (i) => tailFences.some((f) => f.open < i && i < f.close);
    const heads = [];
    for (let i = 0; i < tail.length; i++)
      if (/^###\s+/.test(tail[i]) && !inTailFence(i) &&
          !tailFences.some((f) => f.open === i || f.close === i)) heads.push(i);
    heads.forEach((h, k) => {
      const end = k + 1 < heads.length ? heads[k + 1] : tail.length;
      const span = tail.slice(h + 1, end);
      // the payload envelope is END-ANCHORED: the serializer writes it as the
      // span's last block, so parse trims trailing blanks and looks for a
      // closing ``` whose nearest ```json opener above holds an envelope.
      // Anything above that block — including the user's own fences, closed
      // or stray — is text, verbatim. A mid-span envelope in a foreign file
      // is prose by this rule (carried, not interpreted).
      let last = span.length - 1;
      while (last >= 0 && span[last].trim() === "") last--;
      let env = null, envFence = null;
      if (last >= 0 && /^```\s*$/.test(span[last])) {
        for (let j = last - 1; j >= 0; j--) {
          if (/^```json\s*$/.test(span[j])) {
            const cand = { open: j, close: last, info: "json" };
            env = envelopeOf(span, cand);
            if (env) envFence = cand;
            break;
          }
          if (/^```/.test(span[j])) break; // a different fence intervenes
        }
      }
      const textLines = (envFence === null ? span
        : [...span.slice(0, envFence.open), ...span.slice(envFence.close + 1)])
        .filter((l) => l !== CHART_SLOT);
      const text = textLines.join("\n").replace(/^\n+/, "").replace(/\n+$/, "");
      const heading = tail[h].replace(/^###\s+/, "");
      if (env) entries.push(makeEntry({
        id: env.id, savedAt: env.savedAt ?? null,
        heading: heading === (env.savedAt || "note") ? null : heading,
        text, payload: { app: env.app, v: env.v, data: env.data } }));
      else entries.push(makeEntry({
        id: "x-" + hashStr(tail.slice(h, end).join("\n")),
        savedAt: null, heading, text, payload: null }));
    });
  }
  return { pad, entries, _at: at };
}

function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// ---------- load-time assertions (golden rule 1, site form) ----------

{
  const d0 = addEntry(emptyDoc(), { id: "a", savedAt: "2026-08-11T10:00:00.000Z",
    text: "an idea", payload: { app: "metronome", v: 1, data: { bpm: 132 } } });
  const src = toAtchart({ ...d0, pad: "free prose" }, { title: "probe" });
  const d1 = fromAtchart(src);
  if (d1.pad !== "free prose" || d1.entries.length !== 1 ||
      d1.entries[0].id !== "a" || d1.entries[0].payload.data.bpm !== 132)
    throw new Error("notepad: the probe must round-trip its entry");
  if (toAtchart(d1) !== src)
    throw new Error("notepad: toAtchart must be a byte-level fixed point");
  const mig = fromMetronomeV1("p", [{ id: "1", savedAt: "s", text: "t", metro: { bpm: 60 } }]);
  if (mig.entries[0].payload.data.bpm !== 60)
    throw new Error("notepad: the v1.0 migration must carry the config");
}
