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
const RED = /var\(--red\)|#B82929/i;

/* THE GRANTS — decisions Daniel MADE, each one a numbered BORROWING in the Spec's closed list (v1.5, §7 rule 8: "The
 * Root's red is deliberately borrowed in three places, and only these three … A fourth borrowing is a Spec amendment,
 * not a judgement"). The list is READ FROM THE SPEC (specBorrowings, below): a grant citing a borrowing the Spec does
 * not list is malformed, and so is a listed borrowing no grant covers. A grant never expires, and pins its site count —
 * an entry is removed or added only by a new ruling. */
export const GRANTS = {
  "rule8-borrowing-1": { borrowing: 1, sites: 2, granted: "Spec v1.5 §7 rule 8, borrowing 1 — the transport's Play " +
    "(Daniel, 2026-08-19, shell parity N2: \"more obvious that it is a play button\"). NARROWED to Play by role, " +
    "2026-10-01 (Daniel: \"nobody decided Save should be red — a selector did\")." },
  "rule8-borrowing-2": { borrowing: 2, sites: 5, granted: "Spec v1.5 §7 rule 8, borrowing 2 — the metronome's first beat " +
    "of a measure (Daniel, 2026-08-19, shell parity N3)." },
  "rule8-borrowing-3": { borrowing: 3, sites: 26, granted: "Spec v1.5 §7 rule 8, borrowing 3 — refusal and alarm text " +
    "(Daniel, 2026-10-01: \"context removes any confusion about the meaning of red\"; draft 261046 ratified the 26 " +
    "sites as they stand — 6 of them are danger buttons and an errored chip's border, not text: a wording gap, reported)." },
};

/* THE OPEN QUESTIONS — decisions still to be made. Closing one (open: false) turns every entry AWAITING it red until its
 * sites are fixed. None is open since Spec v1.5; the alarm question is kept, answered, as the record of how it closed. */
export const RULINGS = {
  "261041b-alarm": { open: false, question: "How an alarm or status looks (night 78, part B).",
    answered: "Spec v1.5 §7 rule 8, borrowing 3 (Daniel, 2026-10-01) — the 26 sites keep the Root's red." },
};

/** the Spec's closed list of borrowings, read from rule 8's own text — { number → title } */
export function specBorrowings(specText) {
  const a = specText.indexOf("deliberately borrowed"), b = specText.indexOf("closed list", a);
  if (a < 0 || b < 0) throw new Error("the Spec's rule 8 states no closed list of borrowings — re-site specBorrowings");
  const out = new Map();
  for (const m of specText.slice(a, b).matchAll(/^>\s+(\d+)\.\s+\*\*(.+?)\*\*/gm)) out.set(Number(m[1]), m[2]);
  return out;
}

const P = (slug) => `static/studies/${slug}/study.html`;
/* THE LEDGER — every use of the red outside the key, the token and the palette. Each entry is EITHER `granted` (cites a
 * GRANT, never expires) OR `awaiting` (cites an OPEN question, expires when it closes) — never both, never neither.
 * `match` identifies the line; `n` is how many lines. */
export const LEDGER = [
  // borrowing 1 — Play, BY ROLE (narrowed 2026-10-01)
  { where: "hub/modules/transport-card.mjs", match: "#playBtn{background:var(--red)", granted: "rule8-borrowing-1" },
  { where: P("triadetudes"), match: "#playBtn{background:var(--red)", granted: "rule8-borrowing-1" },
  // borrowing 2 — the first beat of a measure
  { where: "hub/modules/metronome-card.mjs", match: "#beatLamp span.acc{", granted: "rule8-borrowing-2" },
  { where: P("metronome"), match: "#beatLamp span.acc{", granted: "rule8-borrowing-2" },
  { where: P("triadetudes"), match: "#beatLamp span.acc{", granted: "rule8-borrowing-2" },
  { where: P("triadetudes"), match: "const LAMP={idle:", granted: "rule8-borrowing-2" },
  { where: P("modes-from-pentatonic-boxes"), match: "#beatLamp span.acc{", granted: "rule8-borrowing-2" },
  // borrowing 3 — refusal and alarm (26 sites, ratified as they stand)
  { where: "hub/modules/notepad-card.mjs", match: ".hist .acts button.danger{", granted: "rule8-borrowing-3" },
  { where: "hub/modules/shape-motion.mjs", match: ".smErr{", granted: "rule8-borrowing-3" },
  { where: "hub/modules/neck-readout.mjs", match: "the centre cannot follow", granted: "rule8-borrowing-3" },
  { where: "hub/modules/neck-readout.mjs", match: "figure: ${fg.err}", granted: "rule8-borrowing-3" },
  { where: "hub/modules/neck-readout.mjs", match: "reference refused: the reference is relative", granted: "rule8-borrowing-3" },
  { where: "hub/modules/neck-readout.mjs", match: "reference refused: ${rp.reason}", granted: "rule8-borrowing-3" },
  { where: "hub/modules/neck-readout.mjs", match: "sounded bass silent: ${sb.reason}", granted: "rule8-borrowing-3" },
  { where: "hub/modules/neck-readout.mjs", match: "${a}</span>", granted: "rule8-borrowing-3" },
  { where: "hub/modules/neck-readout.mjs", match: "${msg}</span>", granted: "rule8-borrowing-3" },
  { where: "hub/modules/neck-readout.mjs", match: "String(e && e.message || e)", granted: "rule8-borrowing-3" },
  { where: "hub/modules/neck-readout.mjs", match: "a.style.fontWeight = \"bold\"", granted: "rule8-borrowing-3" },
  { where: "hub/modules/field-board.mjs", match: "fill: \"#B82929\" }, svg);", granted: "rule8-borrowing-3" },   // the field's refusal
  { where: "hub/modules/field-board.mjs", match: "noteEl.style.color = \"#B82929\"", granted: "rule8-borrowing-3" },   // the figure's error
  { where: "hub/modules/progression-card.mjs", match: "#pgNote.pg-err{", granted: "rule8-borrowing-3" },
  { where: "hub/modules/progression-card.mjs", match: "if (tonesErr) { note.style.color", granted: "rule8-borrowing-3" },
  { where: "hub/modules/score-board.mjs", match: "const fe = el(\"text\"", granted: "rule8-borrowing-3" },   // the figure refused
  { where: "hub/modules/staff-board.mjs", match: "\"data-strefuse\": ci", granted: "rule8-borrowing-3" },
  { where: P("metronome"), match: ".hist .acts button.danger{", granted: "rule8-borrowing-3" },
  { where: P("modes-from-pentatonic-boxes"), match: ".hist .acts button.danger{", granted: "rule8-borrowing-3" },
  { where: P("triadetudes"), match: ".hist .acts button.danger{", granted: "rule8-borrowing-3" },
  { where: P("triadetudes"), match: ".chips button.bd.err{", granted: "rule8-borrowing-3" },
  { where: P("triadetudes"), match: ".chips button.bd.err .eq{", granted: "rule8-borrowing-3" },
  { where: P("triadetudes"), match: ".chipEd .acts button.danger{", granted: "rule8-borrowing-3" },
  { where: P("triadetudes"), match: ".chipEd .err{", granted: "rule8-borrowing-3" },
  { where: P("triadetudes"), match: "<span id=\"arpErr\"", granted: "rule8-borrowing-3" },
  { where: P("triadetudes"), match: "const r=el(\"text\",{x:x+3,y:28,", granted: "rule8-borrowing-3" },   // typed symbol ≠ the reading
];

/** THE LEDGER'S JUDGEMENT, pure (night 79, PO ruling 261042 §2). stale: an entry's site count moved. expired: an
 * AWAITING entry whose question is no longer open. malformed: anything that would let a grant pass as a question or a
 * question as a grant — both keys or neither, a granted entry citing a question, an awaiting entry citing a grant, a grant
 * carrying an `open` flag, a key in both registries, or a grant whose entries no longer number its `sites`. */
export function judgeLedger({ ledger, hits, grants = {}, rulings = {}, borrowings = null }) {
  const stale = ledger.filter((e) => (hits.get(e) ?? 0) !== (e.n ?? 1))
    .map((e) => `${e.where} "${e.match}" — matched ${hits.get(e) ?? 0} line(s), the entry says ${e.n ?? 1}`);
  const malformed = [];
  for (const e of ledger) {
    const id = `${e.where} "${e.match}"`;
    if (("granted" in e) === ("awaiting" in e)) malformed.push(`${id} must be EITHER granted OR awaiting — it is ${"granted" in e ? "both" : "neither"}`);
    else if ("granted" in e && !grants[e.granted]) malformed.push(`${id} is granted by "${e.granted}", which is not a grant${rulings[e.granted] ? " (it is an open question)" : ""}`);
    else if ("awaiting" in e && !rulings[e.awaiting]) malformed.push(`${id} awaits "${e.awaiting}", which is not a question${grants[e.awaiting] ? " (it is a grant — a grant awaits nothing)" : ""}`);
  }
  for (const [k, gr] of Object.entries(grants)) {
    if (borrowings && !borrowings.has(gr.borrowing))
      malformed.push(`grant "${k}" cites borrowing ${gr.borrowing}, which the Spec's closed list does not hold (it lists ${[...borrowings.keys()].join(", ")}) — a fourth borrowing is a Spec amendment, not a judgement`);
    if ("open" in gr) malformed.push(`grant "${k}" carries an open flag — a grant is a decision made, it cannot be closed`);
    if (rulings[k]) malformed.push(`"${k}" is both a grant and an open question`);
    const n = ledger.filter((e) => e.granted === k).length;
    if (n !== gr.sites) malformed.push(`grant "${k}" covers ${gr.sites} site(s) but ${n} entr${n === 1 ? "y cites" : "ies cite"} it — a granted entry is removed or added only by a new ruling`);
  }
  if (borrowings) for (const [n, title] of borrowings)
    if (!Object.values(grants).some((g) => g.borrowing === n)) malformed.push(`the Spec lists borrowing ${n} (${title}) but no grant covers it`);
  const expired = ledger.filter((e) => "awaiting" in e && rulings[e.awaiting] && !rulings[e.awaiting].open)
    .map((e) => `${e.where} "${e.match}" awaits "${e.awaiting}", which is ANSWERED`);
  return { stale, expired, malformed };
}

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
