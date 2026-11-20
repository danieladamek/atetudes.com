/* etude-link.mjs — THE ÉTUDE LINK: an étude block carried in a URL fragment, and back (261120).
 *
 * Charter §8 (amended 2026-11-20): an étude block carried in a link IS the file, inline — the same reader, the same
 * refusals, nothing stored, nothing sent (a fragment never leaves the browser). So this module is a wrapper and nothing
 * more: the block's text is engine/etude-block.mjs's writer's output, and reading it back is that module's reader. It
 * holds NO key list and NO second grammar. Item: *Étude link — an étude block in a URL fragment, refusing custom
 * changes* (child 2 of the étude embed epic).
 *
 * THE ENCODING (Daniel, 2026-11-20): the block body itself, percent-encoded by encodeURIComponent, after `#etude=`.
 * No compression: the format is permanent once embedded, and a link a person can decode by hand is the block they
 * could have pasted. The reader is decodeURIComponent, which also reads any lighter percent-encoding of the same text.
 *   MEASURED, the 13 études of hub/tests/fixtures/etude-corpus.json (block bodies 470–508 characters):
 *     encodeURIComponent, the shipped form       729–809 characters including `#etude=`
 *     leaving : , @ $ ; / ? bare (not shipped)   639–713 — about 12% shorter, not worth a second encoder
 *   Workable: no browser limits a fragment near this length, and no server ever sees it.
 *
 * THE §6 LINE, DRAWN ONCE (charter §6, copyright posture; §8: "under §6 never user-typed changes"): linkable() is the
 * only place the rule lives. The writer asks it before writing and the reader asks it after reading; the player and
 * Multetudes call these functions and never restate it. It refuses an étude whose progression is user-typed
 * (`source: custom`), and an étude that still CARRIES typed changes in `custom` under another source — the block
 * writes every snapshot key, so the typed text would otherwise ride along in the link unseen.
 */
import { etudeBlockBody, readEtudeBlock } from "./etude-block.mjs";

/** the fragment's one key: `#etude=<percent-encoded block body>` */
export const LINK_KEY = "etude";

/** may this étude travel in a link? → true, or { reason } naming why not (charter §6, §8) */
export function linkable(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return { reason: "no étude to link" };
  if (snapshot.source === "custom")
    return { reason: "its progression is typed by hand (source: custom), and typed changes never travel in a link (charter §6)" };
  if (typeof snapshot.custom === "string" && snapshot.custom.trim() !== "")
    return { reason: "it still holds typed changes (custom), and typed changes never travel in a link (charter §6) — clear them first" };
  return true;
}

/** a snapshot and its envelope ({ app, v }, as the block's writer takes them) → `#etude=…`; throws the refusal's
 * reason for an étude that may not travel */
export function toFragment(snapshot, envelope) {
  const ok = linkable(snapshot);
  if (ok !== true) throw new Error(`étude link: refused — ${ok.reason}`);
  return `#${LINK_KEY}=` + encodeURIComponent(etudeBlockBody(snapshot, envelope));
}

/** a location hash (with or without its `#`) → the block reader's result { app, v, snapshot, flagged, lines },
 * or { reason }. Flagged values come back exactly as from a pasted block: the host skips and names them. */
export function fromFragment(hash) {
  const m = String(hash ?? "").match(new RegExp(`^#?${LINK_KEY}=([\\s\\S]*)$`));
  if (!m) return { reason: `no étude in this link (it carries no #${LINK_KEY}=)` };
  let body;
  try { body = decodeURIComponent(m[1]); }
  catch { return { reason: "the link's étude is not readable: its percent-encoding is broken" }; }
  const r = readEtudeBlock(body);
  if (!r.lines.some((l) => l.kind === "pair")) return { reason: "the link's étude is empty: no key: value lines" };
  const ok = linkable(r.snapshot);
  if (ok !== true) return { reason: `this link's étude is refused — ${ok.reason}` };
  return r;
}
