/* triadetudes-notebook.test.mjs — the notebook round-trip (v0.6.9), headless.
 *
 * logToMarkdown / parseLogExport / mergeLog are pure functions in the study,
 * harvested via the characterization loader. Two format generations:
 *   - v0.6.9+ exports carry the FULL entry in the fenced JSON — lossless;
 *   - older exports carried only cfg — the degraded path is pinned here
 *     exactly (content-hashed ids, header-year date reconstruction, prose
 *     recovery), not improvised at import time.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";

const CFG_A = { v: 1, key: "C", scaleType: "major", set: [1, 2, 3], pivotString: 2,
  pivotFrets: [1, 3, 5], prog: "cycle4", startDeg: 0, chromLen: 6, custom: "ii V I vi",
  arpPattern: [2, 3, 1], roots: false, ext: "none", harmonyMode: "build",
  breakProg: [{ sym: "Dm7", us: null }], bpm: 72, meter: 4, splitIdx: 1,
  clickOn: true, clickVol: 0.8, clickAccent: true, clickSub: 1, clickVoice: "beep",
  countIn: false };
const CFG_B = { ...CFG_A, key: "Eb", harmonyMode: "break",
  breakProg: [{ sym: "Ebm7", us: null }, { sym: "G9", us: "5:maj" }] };

const ENTRIES = [
  { id: "1754700000000-aaaaa", savedAt: "2026-08-09T17:00:00.000Z", minutes: 5,
    title: "C · Cycling 4ths · C major", summary: "C major · strings 1-2-3 · …",
    intention: "clean pivots at 90", accomplished: "made 84, wobbly at 90", cfg: CFG_A },
  { id: "1754700300000-bbbbb", savedAt: "2026-08-09T17:30:00.000Z", minutes: 12,
    title: "Ebm7… break-down · Eb major", summary: "Eb · break down (Ebm7 G9) · …",
    intention: "", accomplished: "", cfg: CFG_B },
];

/* the PRE-v0.6.9 exporter, replicated verbatim as the oracle for old files */
function oldFormatExport(e, entries, exportedAt) {
  let md = "# Triadetudes practice log\n\nExported " + exportedAt + "\n";
  for (const en of entries) {
    md += "\n---\n\n## " + en.title + "\n\n*" + e.fmtWhen(en.savedAt) +
      (en.minutes ? " · ~" + en.minutes + " min" : "") + "*\n\n";
    md += en.summary + "\n\n";
    if (en.intention) md += "**Intention:** " + en.intention + "\n\n";
    if (en.accomplished) md += "**Accomplished:** " + en.accomplished + "\n\n";
    md += "```json\n" + JSON.stringify(en.cfg) + "\n```\n";
  }
  return md;
}

test("lossless: export → import of the v0.6.9 format reproduces every field", () => {
  const e = loadTriadetudesEngine();
  const md = e.logToMarkdown(ENTRIES, "8/9/2026, 7:00:00 PM");
  const res = unwrap(e.parseLogExport(md, "2026-08-10T00:00:00.000Z"));
  assert.equal(res.skipped, 0);
  assert.equal(res.degraded, 0);
  assert.deepEqual(res.entries, ENTRIES, "ids, dates, minutes, notes, configs — identical");
});

test("degraded: a pre-v0.6.9 export imports with the pinned reconstruction policy", () => {
  const e = loadTriadetudesEngine();
  const md = oldFormatExport(e, ENTRIES, "8/9/2026, 7:00:00 PM");
  const res = unwrap(e.parseLogExport(md, "2026-08-10T00:00:00.000Z"));
  assert.equal(res.degraded, 2);
  assert.equal(res.entries.length, 2);
  const [a, b] = res.entries;
  assert.deepEqual(a.cfg, CFG_A, "config survives intact — the point of migration");
  assert.deepEqual(b.cfg, CFG_B);
  assert.equal(a.minutes, 5, "minutes recovered from the human line");
  assert.equal(a.intention, "clean pivots at 90", "prose recovered");
  assert.equal(a.accomplished, "made 84, wobbly at 90");
  assert.ok(a.id.startsWith("imp-"), "regenerated id");
  // date reconstruction: human line + the header's year → the original day
  const d = new Date(a.savedAt);
  assert.equal(d.getFullYear(), 2026, "year injected from the export header");
  assert.equal(d.getMonth(), 7, "August survives");
  assert.equal(d.getDate(), 9);
  // idempotent ids: parsing the same file twice yields the same ids
  const again = unwrap(e.parseLogExport(md, "2026-08-11T00:00:00.000Z"));
  assert.deepEqual(again.entries.map((x) => x.id), res.entries.map((x) => x.id));
});

test("degraded: a headerless or unparseable date falls back to import time", () => {
  const e = loadTriadetudesEngine();
  const md = oldFormatExport(e, [ENTRIES[0]], "sometime").replace(/^\*.+\*$/m, "*whenever*");
  const res = unwrap(e.parseLogExport(md, "2026-08-10T00:00:00.000Z"));
  assert.equal(res.entries.length, 1);
  assert.equal(res.entries[0].savedAt, "2026-08-10T00:00:00.000Z");
});

test("garbage and partial files are data: skipped and counted, never a throw", () => {
  const e = loadTriadetudesEngine();
  assert.deepEqual(unwrap(e.parseLogExport("wat", "x")), { entries: [], skipped: 0, degraded: 0 });
  assert.deepEqual(unwrap(e.parseLogExport("", "x")), { entries: [], skipped: 0, degraded: 0 });
  const md = e.logToMarkdown(ENTRIES, "8/9/2026");
  const broken = md.replace(/"cfg":\{"v":1,"key":"C"/, '"cfg":{oops');
  const res = unwrap(e.parseLogExport(broken, "x"));
  assert.equal(res.entries.length, 1, "the intact entry still arrives");
  assert.equal(res.skipped, 1, "the broken one is counted, not fatal");
  const noFence = "# log\n\n## title only\n\nno block here\n";
  assert.equal(unwrap(e.parseLogExport(noFence, "x")).skipped, 1);
});

test("merge: dedup by id, append unknowns, sort by date, double-import idempotent", () => {
  const e = loadTriadetudesEngine();
  const first = unwrap(e.mergeLog([], ENTRIES));
  assert.equal(first.added, 2);
  const again = unwrap(e.mergeLog(first.list, ENTRIES));
  assert.equal(again.added, 0, "re-import is a no-op");
  assert.deepEqual(again.list, first.list);
  const newer = { ...ENTRIES[0], id: "zzz", savedAt: "2026-08-01T00:00:00.000Z" };
  const merged = unwrap(e.mergeLog(first.list, [newer]));
  assert.equal(merged.added, 1);
  assert.deepEqual(merged.list.map((x) => x.id),
    ["zzz", ENTRIES[0].id, ENTRIES[1].id], "sorted by savedAt ascending");
});

test("import never deletes: merging a subset leaves the rest untouched", () => {
  const e = loadTriadetudesEngine();
  const { list } = unwrap(e.mergeLog(ENTRIES, [ENTRIES[1]]));
  assert.equal(list.length, 2);
});
