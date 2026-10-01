/* degree-red.test.mjs — GOLDEN RULE 8, ASSERTED: the Root's red is the Root's and the key's, nothing else
 * (night 78; dispatch 261041, approval 261041b; Spec §7 rule 8: "The §2.1 colors encode function and nothing else —
 * never status, selection, error, or emphasis … emphasis is weight and neutral ink, and alarm states use a hue that is
 * not in the palette").
 *
 * SUBJECT: every use of the degree palette's red — the literal #B82929, and the shell token --red, which IS that red.
 * SCOPE, stated (rule 16) —
 *   COVERED, both forms: every hub/ source (*.mjs; not hub/build, hub/tests), every engine/ source (not engine/tests),
 *     generators/atetudes_bridge.py (it emits the family's furniture CSS into generated pages), and every MAINTAINED
 *     detected study page (driftScope): a hand-authored page in full; a GENERATED page for var(--red) everywhere and for
 *     the literal inside its <style> blocks.
 *   NOT COVERED, named:
 *     1. a generated page's script and markup literals — the generator's degree data (modes-from-pentatonic-boxes: its
 *        dots, legend and chips, ~870), musical by construction;
 *     2. the doors' published pages — built byte-identically from the covered sources (the build is the proof);
 *     3. tetrad-voice-leading — frozen (R3): printed EXMT, and it keeps all its red under the recorded divergence;
 *     4. the generators' own degree tables (piano_book, cycles_interactive, site_logo) — musical by construction.
 *
 * ALLOWED without an entry: the token's definition (`--red:#B82929`), the KEY (`#hcKey{` — register 35: --red means the
 *   key), and the palette's definition (`FAM_COLOR = {` — in sources only engine/degree-palette.mjs; a page's inlined
 *   copy of it). A MUSICAL use imports the palette (FAM_COLOR.R) and never types the hex; furniture touches neither.
 * EVERYTHING ELSE is a LEDGER entry: GRANTED (Daniel decided; it never expires, and only a new ruling removes it) or
 *   AWAITING (an open question; it expires when the question closes — an entry cannot outlive its question, approval
 *   261041b adjustment A). The check fails on a new site, a stale entry, an expired one, and any entry that could pass
 *   for the other kind (PO ruling 261042 §2, night 79).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { CENSUS, STUDY_SLUGS, driftScope } from "./_carriers.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
/* THE ROOT'S RED IN EVERY FORM IT HAS BEEN WRITTEN (night 81): the token, the hex — and its ALPHA forms, rgba(184,41,41,a)
 * and #B82929aa. The score's current-chord highlight was the Root at 6% alpha, in two places, invisible to a check that
 * only knew the hex (found by the effect-scan's design review). */
const RED = /var\(--red\)|#B82929|rgba?\(\s*184\s*,\s*41\s*,\s*41\b/i;

import { GRANTS, RULINGS, LEDGER, P, specBorrowings, judgeLedger } from "./_red-ledger.mjs";
export { GRANTS, RULINGS, LEDGER, specBorrowings, judgeLedger };

const walk = (dir, out = []) => {
  for (const name of readdirSync(join(REPO, dir))) {
    const rel = `${dir}/${name}`;
    if (["hub/build", "hub/tests", "engine/tests"].includes(rel)) continue;
    if (statSync(join(REPO, rel)).isDirectory()) walk(rel, out);
    else if (rel.endsWith(".mjs")) out.push(rel);
  }
  return out;
};
/* a generated page is one a generator DECLARES it publishes (tools/generator_identity.py's own rule) — computed */
const GENERATED = new Set(readdirSync(join(REPO, "generators")).filter((f) => f.endsWith(".py"))
  .map((f) => (readFileSync(join(REPO, "generators", f), "utf8").match(/^PUBLISHED = "([^"]+)"/m) || [])[1]).filter(Boolean));

test("golden rule 8: the degree red appears only as the key, the token and the palette — every other use is granted by Daniel or awaits an open question", () => {
  const sources = [...walk("hub"), ...walk("engine"), "generators/atetudes_bridge.py"];
  const detected = STUDY_SLUGS.filter((s) => CENSUS.get(s).source === "detected");
  const pages = driftScope(detected, "golden rule 8 — the degree red").bound.map(P);
  const hits = new Map(LEDGER.map((e) => [e, 0]));
  const unclaimed = [];
  let allowed = 0, keyFound = 0, gap = 0;
  for (const rel of [...sources, ...pages]) {
    const generated = GENERATED.has(rel), isPage = rel.startsWith("static/");
    let inStyle = false;
    readFileSync(join(REPO, rel), "utf8").split("\n").forEach((line, i) => {
      if (/<style[\s>]/.test(line)) inStyle = true;
      if (RED.test(line)) {
        if (generated && !/var\(--red\)/.test(line) && !inStyle) gap++;                  // named gap 1: degree data
        else if (/--red:\s*#B82929/i.test(line)) allowed++;
        else if (/#hcKey\{/.test(line)) { allowed++; keyFound++; }
        else if (/\bFAM_COLOR = \{/.test(line) && (isPage || rel === "engine/degree-palette.mjs")) allowed++;
        else {
          const es = LEDGER.filter((e) => e.where === rel && line.includes(e.match));
          if (es.length === 1) hits.set(es[0], hits.get(es[0]) + 1);
          else unclaimed.push(`${rel}:${i + 1}: ${line.trim().slice(0, 140)}` + (es.length > 1 ? "  (matches several entries)" : ""));
        }
      }
      if (/<\/style>/.test(line)) inStyle = false;
    });
  }
  assert.equal(unclaimed.length, 0, "the Root's red is used outside the key, the token and the palette — golden rule 8: " +
    "emphasis and selection are weight and neutral ink; a MUSICAL use imports FAM_COLOR; anything waiting on Daniel is a " +
    "LEDGER entry naming its ruling:\n" + unclaimed.join("\n"));
  const borrowings = specBorrowings(readFileSync(join(REPO, "docs", "design-language-and-engine-spec.md"), "utf8"));
  assert.ok(borrowings.size >= 1, "not vacuous: the Spec's closed list was read");
  const j = judgeLedger({ ledger: LEDGER, hits, grants: GRANTS, rulings: RULINGS, borrowings });
  assert.equal(j.malformed.length, 0, "the ledger is malformed — a grant and a question are different things:\n" + j.malformed.join("\n"));
  assert.equal(j.stale.length, 0, "a ledger entry no longer matches its site — fixed sites leave the ledger:\n" + j.stale.join("\n"));
  assert.equal(j.expired.length, 0, "a ledger entry outlived its question — fix the site, then remove the entry:\n" + j.expired.join("\n"));
  assert.ok(sources.length >= 60 && pages.length >= 2 && keyFound >= 1, `not vacuous: ${sources.length} sources, ${pages.length} pages, the key found ${keyFound}×`);
  const by = {};
  for (const e of LEDGER) { const k = e.granted ? `granted ${e.granted}` : `awaiting ${e.awaiting}`; by[k] = (by[k] || 0) + 1; }
  console.log(`  golden rule 8: ${sources.length} sources + ${pages.length} pages scanned · ${allowed} allowed (token, key, palette) · ` +
    `${LEDGER.length} held — ${Object.entries(by).map(([k, n]) => `${k} ${n}`).join(", ")} · ${gap} line(s) of generated degree data not covered (named)`);
});

/* ---- THE LEDGER SPLIT (night 79, PO ruling 261042 §2): a GRANT is not a question. ----
 * Play (N2) and the first-beat lamp (N3) were GRANTED by Daniel on 2026-08-19; they await nothing. Modelled as questions,
 * the expiry rule would come for them the day anyone "answered" them, and delete his decision. Pinned on synthetic
 * ledgers, so the property holds whatever the real ledger holds. */
test("the ledger split: a GRANTED entry survives its ruling being closed; an AWAITING entry expires; neither can pass as the other", () => {
  const g = { where: "x", match: "play", granted: "N2" }, a = { where: "x", match: "err", awaiting: "ALARM" };
  const hits = new Map([[g, 1], [a, 1]]);
  const grants = { N2: { granted: "Daniel, 2026-08-19", sites: 1 } };
  // the alarm ruling CLOSES: the awaiting entry expires, the granted one does not
  const closed = judgeLedger({ ledger: [g, a], hits, grants, rulings: { ALARM: { open: false, question: "?" } } });
  assert.deepEqual(closed.expired.length, 1, `exactly the awaiting entry expires: ${closed.expired}`);
  assert.ok(closed.expired[0].includes('"err"') && !closed.expired.join().includes('"play"'), `the granted entry survives: ${closed.expired}`);
  // open: nothing expires, nothing is malformed
  const open = judgeLedger({ ledger: [g, a], hits, grants, rulings: { ALARM: { open: true, question: "?" } } });
  assert.equal(open.expired.length + open.malformed.length + open.stale.length, 0, "a well-formed ledger under an open ruling is clean");
  // neither can pass as the other
  const both = { where: "x", match: "b", granted: "N2", awaiting: "ALARM" }, neither = { where: "x", match: "n" };
  const asOpen = { where: "x", match: "c", granted: "ALARM" }, asGrant = { where: "x", match: "d", awaiting: "N2" };
  const m = judgeLedger({ ledger: [g, both, neither, asOpen, asGrant], hits: new Map([[g, 1], [both, 1], [neither, 1], [asOpen, 1], [asGrant, 1]]),
    grants, rulings: { ALARM: { open: true, question: "?" } } });
  for (const k of ['"b"', '"n"', '"c"', '"d"'])
    assert.ok(m.malformed.some((x) => x.includes(k)), `entry ${k} is malformed — a grant and a question are different things: ${m.malformed}`);
  // a grant cannot be "closed": giving one an open flag is malformed
  const m2 = judgeLedger({ ledger: [g], hits: new Map([[g, 1]]), grants: { N2: { granted: "D", sites: 1, open: false } }, rulings: {} });
  assert.ok(m2.malformed.some((x) => x.includes("N2")), `a grant with an open flag is malformed: ${m2.malformed}`);
  // a granted entry may not be removed without a new ruling: the grant pins its site count
  const m3 = judgeLedger({ ledger: [], hits: new Map(), grants: { N2: { granted: "D", sites: 1 } }, rulings: {} });
  assert.ok(m3.malformed.some((x) => x.includes("N2")), `removing a granted entry without changing its grant fails: ${m3.malformed}`);
});

/* ---- THE CLOSED LIST BITES ON A FOURTH (night 80, Spec v1.5 §7 rule 8) ----
 * "A fourth borrowing is a Spec amendment, not a judgement": a grant citing a borrowing the Spec does not list is
 * malformed, and so is a listed borrowing that no grant covers. Pinned on the real Spec's list and on synthetic ones. */
test("the closed list: the Spec's borrowings are read from the Spec, and a fourth borrowing in code fails until the Spec lists it", () => {
  const listed = specBorrowings(readFileSync(join(REPO, "docs", "design-language-and-engine-spec.md"), "utf8"));
  assert.deepEqual([...listed.keys()], [1, 2, 3], `the Spec's rule 8 lists borrowings 1–3: ${[...listed]}`);
  const e4 = { where: "x", match: "save", granted: "b4" };
  const grants = { b1: { borrowing: 1, sites: 0 }, b2: { borrowing: 2, sites: 0 }, b3: { borrowing: 3, sites: 0 }, b4: { borrowing: 4, sites: 1 } };
  const j = judgeLedger({ ledger: [e4], hits: new Map([[e4, 1]]), grants, rulings: {}, borrowings: listed });
  assert.ok(j.malformed.some((m) => m.includes("borrowing 4") && m.includes("Spec amendment")), `a fourth borrowing is refused: ${j.malformed}`);
  const missing = judgeLedger({ ledger: [], hits: new Map(), grants: { b1: { borrowing: 1, sites: 0 } }, rulings: {}, borrowings: listed });
  assert.ok(missing.malformed.some((m) => m.includes("lists borrowing 2")), `a listed borrowing with no grant is named: ${missing.malformed}`);
});
