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
 * EVERYTHING ELSE is a LEDGER entry, and every entry names the OPEN ruling it waits on. The check fails on a new site,
 *   on an entry whose site is gone, and on an entry whose ruling is no longer open — an entry cannot outlive its
 *   question (approval 261041b, adjustment A; m95's lesson: a mechanism that can go quiet, does).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { CENSUS, STUDY_SLUGS, driftScope } from "./_carriers.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const RED = /var\(--red\)|#B82929/i;

/* THE OPEN QUESTIONS. Closing one (open: false) turns every entry that waits on it red until its sites are fixed. */
export const RULINGS = {
  "shell-parity-N2": { open: true, question: "Play is the shell's red .primary — Daniel chose red on 2026-08-19 " +
    "(shell parity N2: \"more obvious that it is a play button\"), after golden rule 8 (2026-08-09). Does rule 8 now " +
    "retire it, and if so what carries Play?" },
  "shell-parity-N3": { open: true, question: "The bar's first beat is red on the beat lamp — Daniel asked for it on " +
    "2026-08-19 (shell parity N3: \"a red first beat of a measure on the beat indicator next to the tap button\"), " +
    "after rule 8. Retire it (the neutral was bright white against grey) or keep it?" },
  "261041b-alarm": { open: true, question: "How an alarm or status looks (night 78, part B): the Spec's answer — a hue " +
    "that is not in the palette, its VALUE Daniel's — or no colour at all (weight, a mark, the word)." },
};

const P = (slug) => `static/studies/${slug}/study.html`;
/* THE LEDGER — every use of the red that waits on a ruling. `match` identifies the line; `n` is how many lines. */
export const LEDGER = [
  // Play — shell parity N2
  { where: "hub/shell.mjs", match: ".transport button.primary{", waits: "shell-parity-N2" },
  { where: "generators/atetudes_bridge.py", match: ".transport button.primary{background:#B82929", waits: "shell-parity-N2" },
  { where: P("metronome"), match: ".transport button.primary{", waits: "shell-parity-N2" },
  { where: P("triadetudes"), match: ".transport button.primary{", waits: "shell-parity-N2" },
  { where: P("modes-from-pentatonic-boxes"), match: ".transport button.primary{", waits: "shell-parity-N2" },
  // the first-beat lamp — shell parity N3
  { where: "hub/modules/metronome-card.mjs", match: "#beatLamp span.acc{", waits: "shell-parity-N3" },
  { where: P("metronome"), match: "#beatLamp span.acc{", waits: "shell-parity-N3" },
  { where: P("triadetudes"), match: "#beatLamp span.acc{", waits: "shell-parity-N3" },
  { where: P("triadetudes"), match: "const LAMP={idle:", waits: "shell-parity-N3" },
  { where: P("modes-from-pentatonic-boxes"), match: "#beatLamp span.acc{", waits: "shell-parity-N3" },
  // alarm and status — part B
  { where: "hub/modules/notepad-card.mjs", match: ".hist .acts button.danger{", waits: "261041b-alarm" },
  { where: "hub/modules/shape-motion.mjs", match: ".smErr{", waits: "261041b-alarm" },
  { where: "hub/modules/neck-readout.mjs", match: "the centre cannot follow", waits: "261041b-alarm" },
  { where: "hub/modules/neck-readout.mjs", match: "figure: ${fg.err}", waits: "261041b-alarm" },
  { where: "hub/modules/neck-readout.mjs", match: "reference refused: the reference is relative", waits: "261041b-alarm" },
  { where: "hub/modules/neck-readout.mjs", match: "reference refused: ${rp.reason}", waits: "261041b-alarm" },
  { where: "hub/modules/neck-readout.mjs", match: "sounded bass silent: ${sb.reason}", waits: "261041b-alarm" },
  { where: "hub/modules/neck-readout.mjs", match: "${a}</span>", waits: "261041b-alarm" },
  { where: "hub/modules/neck-readout.mjs", match: "${msg}</span>", waits: "261041b-alarm" },
  { where: "hub/modules/neck-readout.mjs", match: "String(e && e.message || e)", waits: "261041b-alarm" },
  { where: "hub/modules/neck-readout.mjs", match: "a.style.fontWeight = \"bold\"", waits: "261041b-alarm" },
  { where: "hub/modules/field-board.mjs", match: "fill: \"#B82929\" }, svg);", waits: "261041b-alarm" },   // the field's refusal
  { where: "hub/modules/field-board.mjs", match: "noteEl.style.color = \"#B82929\"", waits: "261041b-alarm" },   // the figure's error
  { where: "hub/modules/progression-card.mjs", match: "#pgNote.pg-err{", waits: "261041b-alarm" },
  { where: "hub/modules/progression-card.mjs", match: "if (tonesErr) { note.style.color", waits: "261041b-alarm" },
  { where: "hub/modules/score-board.mjs", match: "const fe = el(\"text\"", waits: "261041b-alarm" },   // the figure refused
  { where: "hub/modules/staff-board.mjs", match: "\"data-strefuse\": ci", waits: "261041b-alarm" },
  { where: P("metronome"), match: ".hist .acts button.danger{", waits: "261041b-alarm" },
  { where: P("modes-from-pentatonic-boxes"), match: ".hist .acts button.danger{", waits: "261041b-alarm" },
  { where: P("triadetudes"), match: ".hist .acts button.danger{", waits: "261041b-alarm" },
  { where: P("triadetudes"), match: ".chips button.bd.err{", waits: "261041b-alarm" },
  { where: P("triadetudes"), match: ".chips button.bd.err .eq{", waits: "261041b-alarm" },
  { where: P("triadetudes"), match: ".chipEd .acts button.danger{", waits: "261041b-alarm" },
  { where: P("triadetudes"), match: ".chipEd .err{", waits: "261041b-alarm" },
  { where: P("triadetudes"), match: "<span id=\"arpErr\"", waits: "261041b-alarm" },
  { where: P("triadetudes"), match: "const r=el(\"text\",{x:x+3,y:28,", waits: "261041b-alarm" },   // typed symbol ≠ the reading
];

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

test("golden rule 8: the degree red appears only as the key, the token and the palette — every other use waits on a named, open ruling", () => {
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
  const stale = LEDGER.filter((e) => hits.get(e) !== (e.n ?? 1))
    .map((e) => `${e.where} "${e.match}" — matched ${hits.get(e)} line(s), the entry says ${e.n ?? 1}`);
  assert.equal(stale.length, 0, "a ledger entry no longer matches its site — fixed sites leave the ledger:\n" + stale.join("\n"));
  const answered = LEDGER.filter((e) => !(RULINGS[e.waits] && RULINGS[e.waits].open))
    .map((e) => `${e.where} "${e.match}" waits on "${e.waits}", which is ${RULINGS[e.waits] ? "ANSWERED" : "not a ruling"}`);
  assert.equal(answered.length, 0, "a ledger entry outlived its question — fix the site, then remove the entry:\n" + answered.join("\n"));
  assert.ok(sources.length >= 60 && pages.length >= 2 && keyFound >= 1, `not vacuous: ${sources.length} sources, ${pages.length} pages, the key found ${keyFound}×`);
  const by = {};
  for (const e of LEDGER) by[e.waits] = (by[e.waits] || 0) + 1;
  console.log(`  golden rule 8: ${sources.length} sources + ${pages.length} pages scanned · ${allowed} allowed (token, key, palette) · ` +
    `${LEDGER.length} held — ${Object.entries(by).map(([k, n]) => `${k} ${n}`).join(", ")} · ${gap} line(s) of generated degree data not covered (named)`);
});
