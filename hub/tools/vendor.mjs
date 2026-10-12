/* vendor.mjs — THE ENGINE BUNDLE RIFFRAFT VENDORS (Roadmap phase 4; ruling 261011c, option C).
 *
 * One ESM file, build/vendor/atetudes-engine.<version>.mjs, and its manifest beside it. RiffRaft keeps a
 * hash-pinned copy, so At-Etudes is the one source of the chord vocabulary and the chart grammar for both
 * products (a second copy would drift, the way FLAT_KEYS did).
 *
 * WHAT IT CARRIES (ruling 261011c): chord · atchart · structures · applyEdit from markdown · grammarRoman from
 * numeral, and whatever those import (field, today), DERIVED from their import statements. palette.mjs is NOT
 * carried: every word it offers lives in structures.mjs; its panel, padInsert and tier 4 stay At-Etudes'.
 * motion.mjs is NOT carried: FORBIDDEN below is a lock, and the build refuses a bundle that reaches it.
 * parseRoman is NOT in the API (its docstring is stale and chord.mjs is carried by every study, so it is not
 * edited); resolveRoman, which is exported, parses through it.
 *
 * THE INLINER is the door build's own (build.mjs moduleChunk): each module in its own IIFE returning its exports,
 * its imports destructured from the modules already emitted, which is what lets chord, field and numeral each
 * declare their own mod12. (The first draft concatenated inlineForm flat; the smoke test refused to load it on
 * exactly that collision.) The bundle then exports the API by name, which is the one thing a door does not do.
 *
 * THE LAW OF A VERSION: its bytes never change. A changed API (a name added, removed or changed) or a moved source
 * means a new VERSION and a new pair of files. Old versions stay (RiffRaft may pin any of them). The manifest
 * records each source file's git blob, so the gate REBUILDS the bundle from exactly those blobs and compares
 * bytes: the bundle is provably the inliner's output, not a hand edit. A source that has moved since is
 * reported as BEHIND, not red: a pin is a snapshot, and RiffRaft takes a new one deliberately (MIDI-LOOP-FORMAT §5.2).
 *
 * CLI:  node hub/tools/vendor.mjs           build the current VERSION (refuses to change an existing version's bytes)
 *       node hub/tools/vendor.mjs --check   verify every committed version; exit 1 on any problem
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve as resolvePath, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { REPO, importStatementsOf } from "./resolve.mjs";
import { inlineForm, moduleChunk, nsOf } from "./build.mjs";

export const VERSION = "1.0.0";
export const OUT_DIR = join(REPO, "build", "vendor");
export const bundleName = (v) => `atetudes-engine.${v}.mjs`;
export const manifestName = (v) => `atetudes-engine.${v}.manifest.json`;

/** the API, declared per module: `only` picks names, `except` drops them, neither exports every name */
export const ENTRIES = [
  { mod: "chord", except: ["parseRoman"] },
  { mod: "atchart" },
  { mod: "structures" },
  { mod: "markdown", only: ["applyEdit"] },
  { mod: "numeral", only: ["grammarRoman"] },
];

/** modules whose code the bundle must never carry (the lock); reaching one refuses the build */
export const FORBIDDEN = ["motion", "palette"];

const EXPORT_NAME = /^export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm;
export const exportNamesOf = (src) => [...src.matchAll(EXPORT_NAME)].map((m) => m[1]);
const modPath = (mod) => `engine/${mod}.mjs`;
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8" });

/** read(relPath) → source text; the default reads the working tree */
const readTree = (rel) => readFileSync(join(REPO, rel), "utf8");

/** the import closure of the entries, dependencies first, from the sources' own import statements */
export function closureOf(entries, read = readTree) {
  const order = [], seen = new Set();
  const visit = (rel) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    for (const s of importStatementsOf(read(rel), rel)) {
      if (!s.spec.startsWith("./")) throw new Error(`${rel}: import "${s.spec}" leaves engine/ — the bundle carries engine modules only`);
      visit(relative(REPO, resolvePath(REPO, dirname(rel), s.spec)));
    }
    order.push(rel);
  };
  for (const e of entries) visit(modPath(e.mod));
  return order;
}

/** the declared API resolved against the sources: [name, …] in entry order; a declared name that is not exported refuses */
export function apiOf(entries, read = readTree) {
  const api = [];
  for (const e of entries) {
    const names = exportNamesOf(read(modPath(e.mod)));
    for (const n of [...(e.only || []), ...(e.except || [])])
      if (!names.includes(n)) throw new Error(`vendor: ${modPath(e.mod)} exports no "${n}"`);
    api.push(...(e.only ? e.only : names.filter((n) => !(e.except || []).includes(n))));
  }
  if (new Set(api).size !== api.length) throw new Error("vendor: a name is exported twice");
  return api;
}

/** THE LOCK: does `text` carry any forbidden module? → [problem, …]. Checked on the artifact: each forbidden module's
 * banner, and its SIGNATURE (every line of its inline form 40+ chars long that no carried module also has; generic
 * helpers such as mod12 are shared and prove nothing), must be absent from the bundle's bytes. An empty signature is
 * itself a problem: a lock with nothing to look for cannot prove it ran. */
export function lockProblems(text, read = readTree, carried = closureOf(ENTRIES, read)) {
  const out = [];
  const lines = (src, rel) => inlineForm(src, rel).split("\n").map((l) => l.trim()).filter((l) => l.length >= 40);
  const shared = new Set(carried.filter((f) => !FORBIDDEN.map(modPath).includes(f)).flatMap((f) => lines(read(f), f)));
  for (const mod of FORBIDDEN) {
    if (text.includes(`/* ${mod}.mjs`) || text.includes(`/* ===== ${modPath(mod)} =====`))
      out.push(`${mod}.mjs: its banner is in the bundle`);
    const sig = lines(read(modPath(mod)), modPath(mod)).filter((l) => !shared.has(l));
    if (!sig.length) { out.push(`${mod}.mjs: no signature lines — the lock cannot see it`); continue; }
    const hit = sig.filter((l) => text.includes(l));
    if (hit.length) out.push(`${mod}.mjs: ${hit.length} of its ${sig.length} signature lines are in the bundle, first: ${hit[0].slice(0, 80)}`);
  }
  return out;
}

/** build in memory → { text, manifest }. `read` lets the gate rebuild from recorded blobs. */
export function buildBundle({ version = VERSION, entries = ENTRIES, read = readTree, sourceCommit, blobs } = {}) {
  const files = closureOf(entries, read);
  const reached = FORBIDDEN.filter((m) => files.includes(modPath(m)));
  if (reached.length) throw new Error(`vendor: the bundle reaches ${reached.map(modPath).join(", ")} — forbidden (the lock)`);
  const api = apiOf(entries, read);
  const resolveDep = (from, spec) => relative(REPO, resolvePath(REPO, dirname(from), spec)).split("\\").join("/");
  const byMod = new Map(entries.map((e) => [modPath(e.mod), e]));
  const exportLines = [];
  for (const [f, e] of byMod) {
    const names = apiOf([e], read);
    exportLines.push(`export const { ${names.join(", ")} } = ${nsOf(f)};`);
  }
  const text =
`/* atetudes-engine ${version} — the At-Etudes engine subset RiffRaft vendors. BUILT FILE: never edit it.
 * Built by hub/tools/vendor.mjs with the door build's inliner (build.mjs moduleChunk).
 * Contains: ${files.join(", ")}
 * Rebuild under a NEW version; a version's bytes never change. The manifest beside it pins this file's sha256. */

${files.map((f) => moduleChunk(f, read(f), resolveDep)).join("\n\n")}

${exportLines.join("\n")}
`;
  const problems = lockProblems(text, read, files);
  if (problems.length) throw new Error("vendor: the lock is open —\n  " + problems.join("\n  "));
  // a fresh build records each source's COMMITTED blob, and refuses a source whose working copy is not that blob —
  // otherwise the bytes built and the blob recorded would describe two different files
  const blob = (f) => {
    if (blobs) return blobs.get(f);
    const head = git("rev-parse", `HEAD:${f}`).trim();
    if (git("hash-object", join(REPO, f)).trim() !== head) throw new Error(`vendor: ${f} has uncommitted changes — commit the source first`);
    return head;
  };
  const manifest = {
    name: "atetudes-engine",
    version,
    file: bundleName(version),
    sha256: sha256(text),
    sourceCommit: sourceCommit ?? git("log", "-1", "--format=%H", "--", ...files).trim(),
    sources: files.map((f) => ({ path: f, blob: blob(f) })),
    api,
    ruling: "261011c (option C): no palette.mjs, no motion.mjs, parseRoman not in the API",
  };
  return { text, manifest };
}

const manifestText = (m) => JSON.stringify(m, null, 2) + "\n";

/** every committed version, checked → { problems, notes, versions } */
export function checkCommitted() {
  const problems = [], notes = [], versions = [];
  if (!existsSync(OUT_DIR)) return { problems: [`${relative(REPO, OUT_DIR)}: missing`], notes, versions };
  for (const f of readdirSync(OUT_DIR).filter((f) => f.endsWith(".manifest.json")).sort()) {
    const m = JSON.parse(readFileSync(join(OUT_DIR, f), "utf8"));
    versions.push(m.version);
    const p = join(OUT_DIR, m.file);
    if (!existsSync(p)) { problems.push(`${m.file}: missing beside its manifest`); continue; }
    const text = readFileSync(p, "utf8");
    if (sha256(text) !== m.sha256) problems.push(`${m.file}: sha256 ${sha256(text).slice(0, 12)} ≠ manifest ${m.sha256.slice(0, 12)}`);
    for (const x of lockProblems(text)) problems.push(`${m.file}: ${x}`);
    // reproduce from the recorded blobs: the bytes must be exactly the inliner's output on exactly those sources
    const blobs = new Map(m.sources.map((s) => [s.path, s.blob]));
    const read = (rel) => {
      if (!blobs.has(rel)) return readTree(rel);   // forbidden modules, read only by the lock
      return git("cat-file", "blob", blobs.get(rel));
    };
    try {
      const re = buildBundle({ version: m.version, read, blobs, sourceCommit: m.sourceCommit, entries: ENTRIES_OF[m.version] ?? ENTRIES });
      if (re.text !== text) problems.push(`${m.file}: does not reproduce from its recorded sources`);
      if (JSON.stringify(re.manifest.api) !== JSON.stringify(m.api)) problems.push(`${m.file}: API differs from its manifest`);
    } catch (e) {
      problems.push(`${m.file}: rebuild from recorded sources failed — ${e.message.split("\n")[0]}`);
    }
    const moved = m.sources.filter((s) => git("hash-object", join(REPO, s.path)).trim() !== s.blob).map((s) => s.path);
    if (moved.length) notes.push(`${m.file}: BEHIND source (${moved.join(", ")}) — a pin is a snapshot; bump VERSION to take a new one`);
  }
  if (!versions.includes(VERSION)) problems.push(`VERSION ${VERSION} has no committed manifest — run node hub/tools/vendor.mjs`);
  return { problems, notes, versions };
}

/** a past version's entries, if they ever differ from ENTRIES (none yet: 1.0.0 is the first) */
const ENTRIES_OF = {};

if (process.argv[1] && import.meta.url === pathToFileURL(resolvePath(process.argv[1])).href) {
  if (process.argv.includes("--check")) {
    const { problems, notes, versions } = checkCommitted();
    for (const n of notes) console.log("NOTE  " + n);
    for (const p of problems) console.log("PROBLEM  " + p);
    console.log(`${problems.length ? "RED" : "GREEN"}  vendor: ${versions.length} version(s) checked (${versions.join(", ")})`);
    process.exit(problems.length ? 1 : 0);
  }
  const { text, manifest } = buildBundle();
  mkdirSync(OUT_DIR, { recursive: true });
  const bp = join(OUT_DIR, bundleName(VERSION)), mp = join(OUT_DIR, manifestName(VERSION));
  if (existsSync(bp) && readFileSync(bp, "utf8") !== text) {
    console.error(`REFUSED: ${bundleName(VERSION)} exists with other bytes — a version's bytes never change; bump VERSION in hub/tools/vendor.mjs`);
    process.exit(1);
  }
  writeFileSync(bp, text);
  writeFileSync(mp, manifestText(manifest));
  console.log(`built ${relative(REPO, bp)}  ${text.length} bytes  sha256 ${manifest.sha256.slice(0, 12)}…  ${manifest.sources.length} sources  ${manifest.api.length} names`);
}
