/* vendor.mjs — THE ENGINE BUNDLE RIFFRAFT VENDORS (Roadmap phase 4; ruling 261011c, option C).
 *
 * One ESM file, build/vendor/atetudes-engine.<version>.mjs, and its manifest beside it. RiffRaft keeps a
 * hash-pinned copy, so At-Etudes is the one source of the chord vocabulary and the chart grammar for both
 * products (a second copy would drift, the way FLAT_KEYS did).
 *
 * WHAT IT CARRIES (ruling 261011c): chord · atchart · structures · applyEdit from markdown · grammarRoman from
 * numeral, and whatever those import (field, today), DERIVED from their import statements. palette.mjs is NOT
 * carried: every word it offers lives in structures.mjs; its panel, padInsert and tier 4 stay At-Etudes'.
 * motion.mjs is NOT carried in 1.0.0: FORBIDDEN_OF below is a lock, and the build refuses a bundle that reaches it.
 *
 * 2.0.0 (Daniel, 2026-10-14 — the étude chain): adds etude-timeline (a saved étude → timed notes, for RiffRaft's
 * étude block) and the degree palette's FAM / FAM_COLOR (the card reads the Spec's colours from the bundle, never
 * retyped). THE MOTION LOCK IS LIFTED FOR 2.0.0 ("for sure"): an étude with an approach cannot be played without
 * motion.mjs, and the lock was a scope for 1.0.0, never a safety rule. palette.mjs STAYS forbidden (tier 4 and the
 * panel are At-Etudes'). The lock is PER VERSION: 1.0.0 still checks both. Carrying motion does not mean storing
 * derived notes — RiffRaft derives every time it plays (charter §7).
 *
 * 2.1.0 (Daniel, 2026-10-14): 2.0.0's contents plus etude-describe (`describe`, `DESCRIBED`) — the étude in Multetudes'
 * own words, moved from hub/ into engine/ (its imports were already engine code); the engine-only closure is NOT
 * widened. Additive, so the minor version. palette.mjs still forbidden.
 *
 * 2.2.0 (Daniel, 2026-11-20): 2.1.0's entries and API unchanged, its sources moved — selection.mjs and
 * etude-timeline.mjs now play a tones figure that names 9, 11, 13 beyond the chord (261119, Multetudes v1.1.15:
 * extensions sound from the field inside the window, under Line only, and in < > groups); degree-palette.mjs moved by
 * a comment only. Additive behaviour, so the minor version. palette.mjs still forbidden.
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
 * THE SHELL KIND (261119 — decision D of the card shell bundle, ruled by Daniel 2026-11-19): a SECOND bundle kind in
 * this one tool, not a sibling — one inliner, one manifest law, one --check. build/vendor/atetudes-shell.<v>.mjs carries
 * hub/card-shell.mjs (the tokens, the frames, the controls, ▾ and ⓘ) and hub/readout-grammar.mjs (the readout's type).
 * Its lock is the ruling's "no degree colours": its closure never leaves hub/, and its BYTES hold no degree hex but the
 * ink the 5th shares by value — read on the artifact, as the engine lock reads motion.mjs's signature. The engine
 * bundle is untouched (its engine-only closure stays as ruled 10-14), and a shell manifest is checked as a shell's.
 *
 * CLI:  node hub/tools/vendor.mjs                   build the engine's current VERSION (refuses to change an existing version's bytes)
 *       node hub/tools/vendor.mjs --shell           build the shell's current SHELL_VERSION, under the same law
 *       node hub/tools/vendor.mjs --check           verify every committed version of both kinds; exit 1 on any problem
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve as resolvePath, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { REPO, importStatementsOf } from "./resolve.mjs";
import { inlineForm, moduleChunk, nsOf } from "./build.mjs";

export const VERSION = "2.2.0";
export const OUT_DIR = join(REPO, "build", "vendor");
export const bundleName = (v, kind = "engine") => `${kind === "shell" ? "atetudes-shell" : "atetudes-engine"}.${v}.mjs`;
export const manifestName = (v, kind = "engine") => `${kind === "shell" ? "atetudes-shell" : "atetudes-engine"}.${v}.manifest.json`;

/** the API, declared per module: `only` picks names, `except` drops them, neither exports every name */
const ENTRIES_1 = [
  { mod: "chord", except: ["parseRoman"] },
  { mod: "atchart" },
  { mod: "structures" },
  { mod: "markdown", only: ["applyEdit"] },
  { mod: "numeral", only: ["grammarRoman"] },
];
const ENTRIES_2_0 = [...ENTRIES_1,
  { mod: "etude-timeline" },                                // 2.0.0: the étude chain (RiffRaft's étude block)
  { mod: "degree-palette", only: ["FAM", "FAM_COLOR"] },    // 2.0.0: the Spec's degree colours, read, never retyped
];
export const ENTRIES = [...ENTRIES_2_0,
  { mod: "etude-describe" },                                // 2.1.0: the étude in Multetudes' own words
];
/** each version's entries — a past version rebuilds from its own (1.0.0's are 1.0.0's forever, 2.0.0's likewise) */
export const ENTRIES_OF = { "1.0.0": ENTRIES_1, "2.0.0": ENTRIES_2_0, "2.1.0": ENTRIES, "2.2.0": ENTRIES };

/** modules whose code a version must never carry (the lock); reaching one refuses the build. PER VERSION (261014):
 * the motion lock is lifted for 2.0.0 (Daniel); palette stays forbidden in every version */
export const FORBIDDEN_OF = { "1.0.0": ["motion", "palette"], "2.0.0": ["palette"], "2.1.0": ["palette"], "2.2.0": ["palette"] };
export const FORBIDDEN = FORBIDDEN_OF[VERSION];
const RULING_OF = {
  "1.0.0": "261011c (option C): no palette.mjs, no motion.mjs, parseRoman not in the API",
  "2.0.0": "261011c + 2026-10-14 (the étude chain): adds etude-timeline and FAM/FAM_COLOR; the motion lock lifted for 2.0.0, palette.mjs still forbidden; parseRoman not in the API",
  "2.1.0": "2.0.0 + 2026-10-14 (Daniel): adds etude-describe (describe, DESCRIBED), moved from hub/ into engine/; the engine-only closure not widened; palette.mjs still forbidden; parseRoman not in the API",
  "2.2.0": "2.1.0 + 2026-11-20 (Daniel): the same API, the sources moved — a tones figure names 9, 11, 13 beyond the chord (261119); palette.mjs still forbidden; parseRoman not in the API",
};

/* ---- THE SHELL KIND (261119) ---- */
export const SHELL_VERSION = "1.0.0";
const SHELL_ENTRIES_1 = [
  { mod: "card-shell" },        // TOKENS · tokensCss · the frames, controls, hint, ▾ and ⓘ rules · initCollapse · initInfo
  { mod: "readout-grammar" },   // READOUT_CSS — the readout's type
];
/** named OUTSIDE 1.0.0 (the proposal's §2), so the manifest says what the family still holds elsewhere */
const SHELL_EXCLUDED_1 = [
  "static/studies/tetrad-voice-leading — frozen (R3); its own chrome copies stay",
  "assets/css/custom.css and layouts/study.html — Hextra's chrome, the site (decision E)",
  "the boards' SVG grays (field, staff, score, keys, keyboard strip, fretboard stage, hub/palette.mjs, engine/chart-line.mjs) — drawing ink, not card chrome",
  "the hand pages' card frame, ▾ and ⓘ rules (triadetudes, metronome) — v0.8's values, a visible change to converge; they carry the page skin's tokens only",
];
export const KINDS = {
  engine: { name: "atetudes-engine", dir: "engine", what: "the At-Etudes engine subset RiffRaft vendors",
    version: () => VERSION, entriesOf: (v) => ENTRIES_OF[v] ?? ENTRIES, forbiddenOf: (v) => FORBIDDEN_OF[v] ?? FORBIDDEN,
    rulingOf: (v) => RULING_OF[v] ?? RULING_OF[VERSION], excludedOf: () => null },
  shell: { name: "atetudes-shell", dir: "hub", what: "the family's chrome tokens and card grammar, the one copy RiffRaft vendors",
    version: () => SHELL_VERSION, entriesOf: () => SHELL_ENTRIES_1, forbiddenOf: () => [],
    rulingOf: () => "card shell bundle decisions A–E, Daniel 2026-11-19: both skins named (door, page); ink and gray asserted against Spec §2.1, the rest chrome; CONTROLS_CSS in; a second kind in vendor.mjs; the site out; no degree colours",
    excludedOf: () => SHELL_EXCLUDED_1 },
};
const kindOfManifest = (m) => (m.name === KINDS.shell.name ? "shell" : "engine");

/** THE SHELL'S LOCK, on the artifact: every degree colour but the 5th's (the ink, the same hex by value — Spec §2.1
 * names it ink) is absent from the bytes. The hexes are READ from the degree palette, never typed; an empty list is
 * itself a problem (a lock with nothing to look for cannot prove it ran). */
export async function degreeHexProblems(text) {
  const { FAM_COLOR } = await import(pathToFileURL(join(REPO, "engine", "degree-palette.mjs")).href);
  const hexes = Object.entries(FAM_COLOR).filter(([k]) => k !== "5").map(([, v]) => v);
  if (hexes.length !== 6) return [`the degree palette gave ${hexes.length} hexes to look for, not 6 — the lock cannot see`];
  return hexes.filter((h) => text.toLowerCase().includes(h.toLowerCase())).map((h) => `a degree colour is in the shell's bytes: ${h}`);
}

const EXPORT_NAME = /^export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm;
export const exportNamesOf = (src) => [...src.matchAll(EXPORT_NAME)].map((m) => m[1]);
const modPathIn = (kind) => (mod) => `${KINDS[kind].dir}/${mod}.mjs`;
const modPath = modPathIn("engine");
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8" });

/** read(relPath) → source text; the default reads the working tree */
const readTree = (rel) => readFileSync(join(REPO, rel), "utf8");

/** the import closure of the entries, dependencies first, from the sources' own import statements */
export function closureOf(entries, read = readTree, kind = "engine") {
  const order = [], seen = new Set(), dir = KINDS[kind].dir;
  const visit = (rel) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    for (const s of importStatementsOf(read(rel), rel)) {
      if (!s.spec.startsWith("./")) throw new Error(`${rel}: import "${s.spec}" leaves ${dir}/ — the bundle carries ${dir} modules only`);
      visit(relative(REPO, resolvePath(REPO, dirname(rel), s.spec)));
    }
    order.push(rel);
  };
  for (const e of entries) visit(modPathIn(kind)(e.mod));
  return order;
}

/** the declared API resolved against the sources: [name, …] in entry order; a declared name that is not exported refuses */
export function apiOf(entries, read = readTree, kind = "engine") {
  const api = [], mp = modPathIn(kind);
  for (const e of entries) {
    const names = exportNamesOf(read(mp(e.mod)));
    for (const n of [...(e.only || []), ...(e.except || [])])
      if (!names.includes(n)) throw new Error(`vendor: ${mp(e.mod)} exports no "${n}"`);
    api.push(...(e.only ? e.only : names.filter((n) => !(e.except || []).includes(n))));
  }
  if (new Set(api).size !== api.length) throw new Error("vendor: a name is exported twice");
  return api;
}

/** THE LOCK: does `text` carry any forbidden module? → [problem, …]. Checked on the artifact: each forbidden module's
 * banner, and its SIGNATURE (every line of its inline form 40+ chars long that no carried module also has; generic
 * helpers such as mod12 are shared and prove nothing), must be absent from the bundle's bytes. An empty signature is
 * itself a problem: a lock with nothing to look for cannot prove it ran. */
export function lockProblems(text, read = readTree, carried = closureOf(ENTRIES, read), forbidden = FORBIDDEN) {
  const out = [];
  const lines = (src, rel) => inlineForm(src, rel).split("\n").map((l) => l.trim()).filter((l) => l.length >= 40);
  const shared = new Set(carried.filter((f) => !forbidden.map(modPath).includes(f)).flatMap((f) => lines(read(f), f)));
  for (const mod of forbidden) {
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
export async function buildBundle({ kind = "engine", version, entries, read = readTree, sourceCommit, blobs } = {}) {
  const K = KINDS[kind], mp = modPathIn(kind);
  version = version ?? K.version();
  entries = entries ?? K.entriesOf(version);
  const forbidden = K.forbiddenOf(version);
  const files = closureOf(entries, read, kind);
  const reached = forbidden.filter((m) => files.includes(mp(m)));
  if (reached.length) throw new Error(`vendor: the bundle reaches ${reached.map(mp).join(", ")} — forbidden (the lock)`);
  const api = apiOf(entries, read, kind);
  const resolveDep = (from, spec) => relative(REPO, resolvePath(REPO, dirname(from), spec)).split("\\").join("/");
  const byMod = new Map(entries.map((e) => [mp(e.mod), e]));
  const exportLines = [];
  for (const [f, e] of byMod) {
    const names = apiOf([e], read, kind);
    exportLines.push(`export const { ${names.join(", ")} } = ${nsOf(f)};`);
  }
  const text =
`/* ${K.name} ${version} — ${K.what}. BUILT FILE: never edit it.
 * Built by hub/tools/vendor.mjs with the door build's inliner (build.mjs moduleChunk).
 * Contains: ${files.join(", ")}
 * Rebuild under a NEW version; a version's bytes never change. The manifest beside it pins this file's sha256. */

${files.map((f) => moduleChunk(f, read(f), resolveDep)).join("\n\n")}

${exportLines.join("\n")}
`;
  const problems = kind === "shell" ? await degreeHexProblems(text) : lockProblems(text, read, files, forbidden);
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
    name: K.name,
    version,
    file: bundleName(version, kind),
    sha256: sha256(text),
    sourceCommit: sourceCommit ?? git("log", "-1", "--format=%H", "--", ...files).trim(),
    sources: files.map((f) => ({ path: f, blob: blob(f) })),
    api,
    ruling: K.rulingOf(version),
    ...(K.excludedOf(version) ? { excluded: K.excludedOf(version) } : {}),
  };
  return { text, manifest };
}

const manifestText = (m) => JSON.stringify(m, null, 2) + "\n";

/** every committed version, checked → { problems, notes, versions } */
export async function checkCommitted() {
  const problems = [], notes = [], versions = [];
  if (!existsSync(OUT_DIR)) return { problems: [`${relative(REPO, OUT_DIR)}: missing`], notes, versions };
  for (const f of readdirSync(OUT_DIR).filter((f) => f.endsWith(".manifest.json")).sort()) {
    const m = JSON.parse(readFileSync(join(OUT_DIR, f), "utf8"));
    versions.push(kindOfManifest(m) === "shell" ? `shell ${m.version}` : m.version);
    const p = join(OUT_DIR, m.file);
    if (!existsSync(p)) { problems.push(`${m.file}: missing beside its manifest`); continue; }
    const text = readFileSync(p, "utf8");
    if (sha256(text) !== m.sha256) problems.push(`${m.file}: sha256 ${sha256(text).slice(0, 12)} ≠ manifest ${m.sha256.slice(0, 12)}`);
    const kind = kindOfManifest(m), K = KINDS[kind];
    const entriesV = K.entriesOf(m.version), forbiddenV = K.forbiddenOf(m.version);
    const locked = kind === "shell" ? await degreeHexProblems(text) : lockProblems(text, readTree, closureOf(entriesV), forbiddenV);
    for (const x of locked) problems.push(`${m.file}: ${x}`);
    // reproduce from the recorded blobs: the bytes must be exactly the inliner's output on exactly those sources
    const blobs = new Map(m.sources.map((s) => [s.path, s.blob]));
    const read = (rel) => {
      if (!blobs.has(rel)) return readTree(rel);   // forbidden modules, read only by the lock
      return git("cat-file", "blob", blobs.get(rel));
    };
    try {
      const re = await buildBundle({ kind, version: m.version, read, blobs, sourceCommit: m.sourceCommit, entries: entriesV });
      if (re.text !== text) problems.push(`${m.file}: does not reproduce from its recorded sources`);
      if (JSON.stringify(re.manifest.api) !== JSON.stringify(m.api)) problems.push(`${m.file}: API differs from its manifest`);
    } catch (e) {
      problems.push(`${m.file}: rebuild from recorded sources failed — ${e.message.split("\n")[0]}`);
    }
    const moved = m.sources.filter((s) => git("hash-object", join(REPO, s.path)).trim() !== s.blob).map((s) => s.path);
    if (moved.length) notes.push(`${m.file}: BEHIND source (${moved.join(", ")}) — a pin is a snapshot; bump VERSION to take a new one`);
  }
  if (!versions.includes(VERSION)) problems.push(`VERSION ${VERSION} has no committed manifest — run node hub/tools/vendor.mjs`);
  if (!versions.includes(`shell ${SHELL_VERSION}`)) problems.push(`SHELL_VERSION ${SHELL_VERSION} has no committed manifest — run node hub/tools/vendor.mjs --shell`);
  return { problems, notes, versions };
}


if (process.argv[1] && import.meta.url === pathToFileURL(resolvePath(process.argv[1])).href) {
  if (process.argv.includes("--check")) {
    const { problems, notes, versions } = await checkCommitted();
    for (const n of notes) console.log("NOTE  " + n);
    for (const p of problems) console.log("PROBLEM  " + p);
    console.log(`${problems.length ? "RED" : "GREEN"}  vendor: ${versions.length} version(s) checked (${versions.join(", ")})`);
    process.exit(problems.length ? 1 : 0);
  }
  const kind = process.argv.includes("--shell") ? "shell" : "engine", v = KINDS[kind].version();
  const { text, manifest } = await buildBundle({ kind });
  mkdirSync(OUT_DIR, { recursive: true });
  const bp = join(OUT_DIR, bundleName(v, kind)), mp = join(OUT_DIR, manifestName(v, kind));
  if (existsSync(bp) && readFileSync(bp, "utf8") !== text) {
    console.error(`REFUSED: ${bundleName(v, kind)} exists with other bytes — a version's bytes never change; bump ${kind === "shell" ? "SHELL_VERSION" : "VERSION"} in hub/tools/vendor.mjs`);
    process.exit(1);
  }
  writeFileSync(bp, text);
  writeFileSync(mp, manifestText(manifest));
  console.log(`built ${relative(REPO, bp)}  ${text.length} bytes  sha256 ${manifest.sha256.slice(0, 12)}…  ${manifest.sources.length} sources  ${manifest.api.length} names`);
}
