/* resolve.mjs — THE RESOLVER. door lock → reach-set → control partition →
 * the CSS/markup ownership partition.
 *
 * Promoted from the stage-1 prototype (Update Log 260816.1, family spec §4.2.1)
 * and extended for what stage 1 did not cover: modules that contribute MARKUP
 * and STYLES, not only script.
 *
 * The one place the fact "which modules does this door reach" exists. Two
 * consumers derive from it and neither restates it:
 *   - tools/build.mjs      inlines exactly the reach-set: script, markup, styles
 *   - tests/door_locks.py  asserts the control partition and greps the artifact
 *
 * It reads SOURCES ONLY. A test that uses it is not asking the build to grade
 * its own work.
 *
 * THE CSS PROBLEM, and the rule that answers it
 * ---------------------------------------------
 * Script reachability is a graph walk. Styles are not: a stylesheet is one flat
 * namespace, so a pruned module's rules can be left behind (a trace, and the
 * exact thing §4.2.1 forbids) or a kept module's rules can be taken away.
 * A style manifest per door would "solve" it and would be the hand-maintained
 * list this project has found nine times.
 *
 * Instead, ownership is DERIVED (see `ownership` below) and every style rule
 * must be ANCHORED IN WHAT IT SHIPS WITH:
 *
 *   1. a rule in a module's styles must name at least one token only that
 *      module ships — so the rule ships exactly when something it can match
 *      does, and orphan CSS becomes impossible rather than merely unlikely
 *   2. no rule, the shell's included, may name a token only ANOTHER module
 *      ships — which is what catches `#journalIn` styled by the page, the
 *      shape of CSS the shipped study has today and no lock could prune
 *
 * Grammar is not declared in advance: a token is page grammar when the shell
 * mentions it or when two or more modules do. It is therefore PROMOTED as the
 * codebase grows, with the evidence, instead of being asserted by someone.
 *
 * This build-time check is the early warning. The authoritative one is in
 * tests/door_locks.py and needs no static analysis at all: every selector in
 * a built file must match something in that door's DOM.
 *
 * CLI:  node hub/tools/resolve.mjs <door-id> [--json] | --doors
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, relative, basename, resolve as resolvePath } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const HUB = join(here, "..");
export const REPO = join(HUB, "..");
const MODULES_DIR = join(HUB, "modules");
const DOORS_DIR = join(HUB, "doors");
const SHELL = join(HUB, "shell.mjs");

const rel = (p) => relative(REPO, p).split("\\").join("/");
const camel = (file) =>
  basename(file, ".mjs").replace(/-([a-z])/g, (_, c) => c.toUpperCase());

export const listDoors = () =>
  readdirSync(DOORS_DIR).filter((f) => f.endsWith(".door.mjs"))
    .map((f) => basename(f, ".door.mjs")).sort();

// ---------------- the import graph, parsed from source ----------------

/* THE ONE IMPORT PARSER (260921, night 27 item 1). Until tonight the import
 * statement was read by two regexes that could disagree about one line: a lazy
 * `import … from "…";`-to-end-of-line matcher that BLANKED, and a strict
 * `import { … } from "…";` matcher that BOUND. A trailing comment on an import
 * line made the lazy one run through the NEXT import line and blank both as one
 * match, while the strict one bound only the second — the page built, and read
 * `OPEN_MIDI is not defined` in the browser (260918 and again 260920; the
 * written lesson did not stop the second). Measured 260921: a line comment, a
 * block comment, and no-semicolon-plus-comment all build and bind nothing; a
 * comment inside the braces emits a syntax error; a namespace or side-effect
 * import builds and binds nothing; a default import crashes the build with a
 * stack. The whole CLASS is "an import statement that is not exactly the one
 * bindable form" — so there is one parser now, it accepts exactly that form,
 * everything that binds and everything that blanks comes from it, and anything
 * else is REFUSED BY NAME with the file and the line. (The same lazy regex is
 * still restated in hub/tests/door_build.test.mjs — repointed here — and in
 * hub/tests/door_locks.py, which is Python and keeps its copy, noted 260921.) */
/* the head and the tail consume exactly the whitespace the old blanking did —
 * preceding blank lines, and trailing blank lines up to the last newline — so
 * a door built through the one parser is byte-identical to one built before it
 * wherever the old transform was right (proven on all four doors, 260921) */
const IMPORT_HEAD = /^\s*import\b/gm;
const IMPORT_FORM = /import\s*\{([^{}]*)\}\s*from\s*"([^"]+)"\s*;[ \t]*(?:\n[ \t]*(?=\n))*(?=\n|$)/y;

/** every import statement of a source, in the one form the door build can
 * bind — `{ start, end, names, spec }` — or a refusal naming file and line */
export function importStatementsOf(src, relPath = "?") {
  const out = [];
  for (const h of src.matchAll(IMPORT_HEAD)) {
    const at = h.index + h[0].length - "import".length;
    const line = src.slice(0, at).split("\n").length;
    const lineText = src.slice(at).split("\n")[0];
    IMPORT_FORM.lastIndex = at;
    const m = IMPORT_FORM.exec(src);
    const refuse = (why) => {
      throw new Error(`${relPath}:${line}: an import the door build cannot bind — ${why}\n` +
        `    ${lineText.trim()}\n` +
        `  Write it as ONE statement of the form  import { a, b } from "./x.mjs";  with nothing after the semicolon: ` +
        `no trailing comment, no comment inside the braces, no default, namespace or side-effect import. ` +
        `The build binds imports from exactly this form and blanks exactly what it binds; any other spelling built silently and broke in the browser (260920).`);
    };
    if (!m) refuse("not the bindable form, or something follows the semicolon");
    if (/\/\/|\/\*/.test(m[1])) refuse("a comment inside the braces would be emitted into the binding");
    const names = m[1].split(",").map((s) => s.trim()).filter(Boolean);
    if (!names.length) refuse("an empty import list binds nothing");
    out.push({ start: h.index, end: m.index + m[0].length, names, spec: m[2] });
  }
  return out;
}

/** the source with every (bindable) import statement blanked — the transform
 * the build, the drift pins and the marker greps share */
export function withoutImports(src, relPath = "?") {
  let out = "", last = 0;
  for (const s of importStatementsOf(src, relPath)) { out += src.slice(last, s.start); last = s.end; }
  return out + src.slice(last);
}

/* §4.2.1 carried forward: the derivation is STATIC, so the two ways of
 * defeating it are banned here rather than discovered later. */
const DYNAMIC_IMPORT = /\bimport\s*\(/;
const LOOKUP_BY_STRING = /\b(?:window|globalThis|self)\s*\[/;

export function importsOf(file) {
  const src = readFileSync(file, "utf8");
  if (DYNAMIC_IMPORT.test(src))
    throw new Error(`${rel(file)}: dynamic import() defeats static reachability — a door could not know what it ships (family spec §4.2.1)`);
  if (LOOKUP_BY_STRING.test(src))
    throw new Error(`${rel(file)}: lookup-by-string on a global defeats static reachability — name the binding (family spec §4.2.1)`);
  const out = [];
  for (const s of importStatementsOf(src, rel(file))) {
    if (!s.spec.startsWith("."))
      throw new Error(`${rel(file)}: bare import "${s.spec}" — a door build inlines local sources only`);
    out.push(resolvePath(dirname(file), s.spec));
  }
  return out;
}

// ---------------- tokens: what a piece of the app calls its own ----------------

const ID_ATTR = /\bid\s*=\s*"([^"]+)"/g;
const CLASS_ATTR = /\bclass\s*=\s*"([^"]+)"/g;
const JS_CLASS = /\bclassName\s*=\s*(?:[\w.]+\s*\+\s*)?"([^"]*)"|\bclassList\.add\(\s*"([^"]+)"/g;
const JS_ID = /\.id\s*=\s*"([^"]+)"/g;

export function tokensOf(text) {
  const out = new Set();
  for (const m of text.matchAll(ID_ATTR)) out.add(m[1].trim());
  for (const m of text.matchAll(JS_ID)) out.add(m[1].trim());
  for (const m of [...text.matchAll(CLASS_ATTR), ...text.matchAll(JS_CLASS)])
    for (const c of (m[1] ?? m[2] ?? "").split(/\s+/)) if (c) out.add(c);
  return out;
}

/* Static extraction has a hard floor: a class name assembled at runtime
 * (`n.className = cls` inside a helper, or a concatenation) is invisible to
 * the patterns above, and engine/palette.mjs builds all of its class names
 * that way. Rather than pretend otherwise, a module may also CLAIM a token it
 * styles if a plain string literal of that exact name appears in a file only
 * it reaches. The claim is bounded in both directions — the token must be in
 * the module's own stylesheet AND in its own exclusive source — and the
 * disjointness check still applies, so two modules cannot both claim one.
 * The authoritative check remains the artifact one: tests/door_locks.py
 * asserts that every selector in a built file matches something in that
 * door's DOM, which needs no static analysis at all. */
const BARE_LITERAL = /"([a-z][a-z0-9-]{1,20})"/g;

export function claimableTokens(text) {
  return new Set([...text.matchAll(BARE_LITERAL)].map((m) => m[1]));
}

// ---------------- CSS: selectors and their tokens ----------------

/** rule selectors of a stylesheet, media blocks included (their inner rules,
 * not the @media condition). Comments stripped first. */
export function selectorsOf(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  let i = 0;
  const block = (from) => {
    let depth = 0, sel = "", j = from;
    for (; j < src.length; j++) {
      const c = src[j];
      if (c === "{") {
        depth++;
        if (depth === 1) {
          const s = sel.trim();
          sel = "";
          if (s.startsWith("@")) {
            if (/^@(media|supports|container)/.test(s)) {
              const inner = block(j + 1);
              j = inner.end;
              depth = 0;
              continue;
            }
            // @keyframes / @font-face: no selectors that can match markup
            let d = 1; j++;
            while (j < src.length && d > 0) { if (src[j] === "{") d++; if (src[j] === "}") d--; j++; }
            j--; depth = 0; continue;
          }
          for (const one of s.split(",")) if (one.trim()) out.push(one.trim());
          let d = 1; j++;
          while (j < src.length && d > 0) { if (src[j] === "{") d++; if (src[j] === "}") d--; j++; }
          j--; depth = 0; continue;
        }
      } else if (c === "}") {
        if (depth === 0) return { end: j };
      } else sel += c;
    }
    return { end: j };
  };
  block(i);
  return out;
}

const SEL_ID = /#([A-Za-z_][\w-]*)/g;
const SEL_CLASS = /\.([A-Za-z_][\w-]*)/g;

export function selectorTokens(sel) {
  const out = new Set();
  for (const m of sel.matchAll(SEL_ID)) out.add(m[1]);
  for (const m of sel.matchAll(SEL_CLASS)) out.add(m[1]);
  return out;
}

// ---------------- module declarations ----------------

async function loadModules() {
  const mods = [];
  for (const f of readdirSync(MODULES_DIR).filter((x) => x.endsWith(".mjs")).sort()) {
    const file = join(MODULES_DIR, f);
    const ns = await import(pathToFileURL(file).href);
    const name = camel(f);
    const c = ns[name];
    if (!c || typeof c !== "object")
      throw new Error(`${rel(file)}: must export "const ${name}" — the export name is derived from the filename, so the build is never told it`);
    for (const k of ["id", "requires", "controls", "markup", "mount"])
      if (!(k in c)) throw new Error(`${rel(file)}: contribution is missing "${k}"`);
    if (c.id !== basename(f, ".mjs"))
      throw new Error(`${rel(file)}: contribution id "${c.id}" must equal its filename`);
    // a declared control must actually be IN the markup, wearing data-control:
    // "declared but never rendered" is caught here, statically, as well as in
    // the browser
    for (const ctl of c.controls) {
      if (!c.markup.includes(`id="${ctl}"`))
        throw new Error(`${rel(file)}: declares control "${ctl}" but its markup has no id="${ctl}"`);
      if (!new RegExp(`data-control="${ctl}"`).test(c.markup))
        throw new Error(`${rel(file)}: control "${ctl}" must carry data-control="${ctl}" — the lock assertion reads the rendered inventory`);
    }
    mods.push({ file, rel: rel(file), name, id: c.id, layer: c.layer ?? null,
      requires: c.requires, controls: [...c.controls],
      markup: c.markup, styles: c.styles ?? "" });
  }
  return mods;
}

// ---------------- the lock predicate ----------------

export function satisfies(lock, requires) {
  for (const [k, want] of Object.entries(requires)) {
    if (!(k in lock)) return false;             // FAIL CLOSED
    const have = lock[k];
    if (Array.isArray(have)) { if (!have.includes(want)) return false; }
    else if (have !== want) return false;
  }
  return true;
}

function validateLock(doorId, lock, mods) {
  const known = new Map();
  for (const m of mods)
    for (const [k, v] of Object.entries(m.requires))
      (known.get(k) ?? known.set(k, new Set()).get(k)).add(v);
  for (const [k, have] of Object.entries(lock)) {
    if (!known.has(k))
      throw new Error(`door "${doorId}": lock key "${k}" is required by no module. Known keys: ${[...known.keys()].join(", ") || "(none)"}`);
    for (const v of Array.isArray(have) ? have : [have]) {
      if (v === false) continue;
      if (!known.get(k).has(v))
        throw new Error(`door "${doorId}": lock ${k}=${JSON.stringify(v)} matches no module. Known values for "${k}": ${[...known.get(k)].map((x) => JSON.stringify(x)).join(", ")}`);
    }
  }
}

// ---------------- ownership: the CSS/markup partition ----------------

/** Ownership, derived three ways and never declared:
 *
 *   mentions(M)   tokens in M's markup, plus tokens in every file M is the
 *                 ONLY module to reach (so notepad-surface's runtime row
 *                 classes count as the notepad card's)
 *   grammar       tokens the shell mentions, plus tokens TWO OR MORE modules
 *                 mention — shared vocabulary is grammar by evidence rather
 *                 than by assertion, and the evidence updates itself as the
 *                 codebase grows
 *   owned(M)      mentions(M) − grammar
 *
 * A token only one module mentions is that module's, and a shell rule naming
 * it is the violation the whole check exists for (`#journalIn` styled by the
 * page, as it is in the shipped study today). */
export function ownership(mods, reachOf) {
  const shellMentions = tokensOf(readFileSync(SHELL, "utf8"));

  const owners = new Map();          // file → the module ids that reach it
  for (const m of mods)
    for (const f of reachOf.get(m.id))
      (owners.get(f) ?? owners.set(f, new Set()).get(f)).add(m.id);

  const mentions = new Map();
  for (const m of mods) {
    const t = tokensOf(m.markup);
    const styled = selectorsOf(m.styles).flatMap((s) => [...selectorTokens(s)]);
    for (const f of reachOf.get(m.id)) {
      if (f === SHELL || owners.get(f).size !== 1) continue;
      const src = readFileSync(f, "utf8");
      for (const x of tokensOf(src)) t.add(x);
      const claimable = claimableTokens(src);
      for (const x of styled) if (claimable.has(x)) t.add(x);
    }
    mentions.set(m.id, t);
  }

  const count = new Map();
  for (const m of mods) for (const t of mentions.get(m.id)) count.set(t, (count.get(t) ?? 0) + 1);
  const grammar = new Set([...shellMentions,
    ...[...count].filter(([, n]) => n >= 2).map(([t]) => t)]);

  const owned = new Map();
  for (const m of mods)
    owned.set(m.id, new Set([...mentions.get(m.id)].filter((t) => !grammar.has(t))));
  return { grammar, owned };
}

/** The two rules, for one stylesheet. Returns [] or a list of violations. */
export function checkStyles(whoId, css, ownedByMe, ownedByOthers, isShell) {
  const bad = [];
  for (const sel of selectorsOf(css)) {
    const toks = selectorTokens(sel);
    // rule 2 — never style another module's markup. For the shell this is the
    // whole check: the shell always ships, so its rules cannot be orphaned;
    // the only way it can be wrong is by owning styling it does not ship with.
    for (const t of toks)
      for (const [other, set] of ownedByOthers)
        if (set.has(t))
          bad.push(`[${whoId}] "${sel}" names "${t}", which only ${other} ships — ` +
            (isShell ? `move this rule into ${other}, or it survives every door that prunes ${other}`
                     : `a module must not style another module's markup`));
    // rule 1 — a module rule must be anchored in markup that ships with it
    if (!isShell && ![...toks].some((t) => ownedByMe.has(t)))
      bad.push(`[${whoId}] "${sel}" names nothing only ${whoId} ships — anchor it in ${whoId}'s own markup, or put it in the shell's page grammar where it belongs`);
  }
  return bad;
}

// ---------------- reachability ----------------

export async function resolveDoor(doorId) {
  const doorFile = join(DOORS_DIR, doorId + ".door.mjs");
  const door = (await import(pathToFileURL(doorFile).href)).default;
  if (door.id !== doorId) throw new Error(`${rel(doorFile)}: declares id "${door.id}"`);
  if (!door.lock || !door.present) throw new Error(`${rel(doorFile)}: a door declares { id, lock, present }`);
  if ("modules" in door || "controls" in door || "styles" in door)
    throw new Error(`${rel(doorFile)}: a door must not list modules, controls or styles — all three are derived from the lock`);

  const mods = await loadModules();
  validateLock(doorId, door.lock, mods);

  const roots = mods.filter((m) => satisfies(door.lock, m.requires));
  const prunedMods = mods.filter((m) => !roots.includes(m));

  const walkFrom = (file) => {
    const seen = new Set();
    const go = (f) => { if (seen.has(f)) return; seen.add(f); for (const d of importsOf(f)) go(d); };
    go(file);
    return seen;
  };
  const reachOf = new Map(mods.map((m) => [m.id, walkFrom(m.file)]));
  const shellReach = walkFrom(SHELL);

  const reached = new Set(shellReach);
  for (const r of roots) for (const f of reachOf.get(r.id)) reached.add(f);
  const prunedFiles = new Set();
  for (const m of prunedMods) for (const f of reachOf.get(m.id)) if (!reached.has(f)) prunedFiles.add(f);

  const order = [];
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const dep of importsOf(file)) visit(dep);
    order.push(file);
  };
  for (const r of roots) visit(r.file);
  visit(SHELL);

  // ---- the style/markup partition ----
  const { grammar, owned } = ownership(mods, reachOf);
  const shellMod = await import(pathToFileURL(SHELL).href);
  const shellCss = shellMod.SHELL_STYLES +
    Object.values(shellMod.WRAPPERS).map((w) => w.styles).join("\n");
  const violations = [
    ...checkStyles("shell", shellCss, grammar,
      mods.map((m) => [m.id, owned.get(m.id)]), true),
  ];
  for (const m of mods)
    violations.push(...checkStyles(m.id, m.styles, owned.get(m.id),
      mods.filter((o) => o.id !== m.id).map((o) => [o.id, owned.get(o.id)]), false));
  if (violations.length)
    throw new Error("style ownership violations (the CSS partition is what makes markup prunable):\n  " +
      violations.join("\n  "));

  /* ROWS (shell.mjs ROW_WRAPPER): placement of what the lock already reached.
   * Validated here because this is the one place the reach-set exists: a row
   * naming an unreached module is an error naming it — a door that lays out a
   * module its lock pruned would otherwise render smaller and quieter than
   * declared, the one failure mode a door must not have. */
  const rows = door.rows ?? [];
  {
    if (!Array.isArray(rows)) throw new Error(`${rel(doorFile)}: rows must be an array of { template, cards }`);
    const seen = new Set();
    const rootIds = new Set(roots.map((m) => m.id));
    for (const row of rows) {
      if (!row || typeof row.template !== "string" || !row.template.trim())
        throw new Error(`${rel(doorFile)}: a row needs a grid template string`);
      if (!Array.isArray(row.cards) || !row.cards.length)
        throw new Error(`${rel(doorFile)}: a row needs the card module ids it carries`);
      if (row.template.split(/\s+/).length !== row.cards.length)
        throw new Error(`${rel(doorFile)}: row template "${row.template}" declares ` +
          `${row.template.split(/\s+/).length} columns for ${row.cards.length} card(s)`);
      for (const entry of row.cards) {
        /* an entry is a module id, or a PART with an optional door-given
         * heading: { part: "id#name", heading } (the parts primitive) */
        const key = typeof entry === "string" ? entry : entry && entry.part;
        if (typeof key !== "string" || (typeof entry !== "string"
            && !/^[\w-]+#[\w-]+$/.test(key)))
          throw new Error(`${rel(doorFile)}: a row entry is a module id or { part: "id#name" }, ` +
            `not ${JSON.stringify(entry)}`);
        const id = key.split("#")[0];
        if (!rootIds.has(id))
          throw new Error(`${rel(doorFile)}: row names "${id}", which this lock does not reach — ` +
            `rows place reached modules, never extend or shrink the reach-set`);
        if (seen.has(key)) throw new Error(`${rel(doorFile)}: "${key}" appears in two rows`);
        seen.add(key);
      }
    }
  }

  /* SEATS (the parts primitive, build half): a door may seat a module's
   * named part away from the module's own mount. The reach law is validated
   * here — a seat naming an unreached module is refused by name; whether the
   * part EXISTS in that module's markup is the build's to check, where the
   * markup is. */
  const seats = door.seats ?? [];
  {
    if (!Array.isArray(seats)) throw new Error(`${rel(doorFile)}: seats must be an array of { part, mount_point, order? }`);
    const rootIds = new Set(roots.map((m) => m.id));
    const seen = new Set();
    for (const st of seats) {
      if (!st || typeof st.part !== "string" || !/^[\w-]+#[\w-]+$/.test(st.part))
        throw new Error(`${rel(doorFile)}: a seat names "moduleId#partName", not ${JSON.stringify(st && st.part)}`);
      const id = st.part.split("#")[0];
      if (!rootIds.has(id))
        throw new Error(`${rel(doorFile)}: seat "${st.part}" names "${id}", which this lock does not reach — ` +
          `seats place reached modules' parts, never extend the reach-set`);
      if (seen.has(st.part)) throw new Error(`${rel(doorFile)}: "${st.part}" is seated twice`);
      seen.add(st.part);
      if (typeof st.mount_point !== "string" || !st.mount_point)
        throw new Error(`${rel(doorFile)}: seat "${st.part}" needs a mount_point`);
    }
  }

  const present = [...new Set(roots.flatMap((m) => m.controls))].sort();
  const absent = [...new Set(prunedMods.flatMap((m) => m.controls))].sort();
  const both = present.filter((c) => absent.includes(c));
  if (both.length)
    throw new Error(`door "${doorId}": control(s) ${both.join(", ")} are declared by both a reached and a pruned module`);

  return {
    door: doorId,
    lock: door.lock,
    present: door.present,
    rows,
    seats,
    modulesIn: roots.map((m) => ({ rel: m.rel, name: m.name, id: m.id, layer: m.layer,
      controls: m.controls, owns: [...owned.get(m.id)].sort() })),
    modulesOut: prunedMods.map((m) => ({ rel: m.rel, name: m.name, id: m.id, layer: m.layer,
      controls: m.controls, owns: [...owned.get(m.id)].sort() })),
    filesIn: order.map(rel),
    filesOut: [...prunedFiles].map(rel).sort(),
    controlsPresent: present,
    controlsAbsent: absent,
    tokensAbsent: [...new Set(prunedMods.flatMap((m) => [...owned.get(m.id)]))].sort(),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const id = process.argv[2];
  if (id === "--doors") { console.log(JSON.stringify(listDoors())); process.exit(0); }
  if (!id) { console.error("usage: node hub/tools/resolve.mjs <door-id> [--json] | --doors"); process.exit(2); }
  const r = await resolveDoor(id);
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(`door ${r.door}  lock ${JSON.stringify(r.lock)}`);
    console.log(`  reaches : ${r.filesIn.join("\n            ")}`);
    console.log(`  pruned  : ${r.filesOut.join("\n            ") || "(none)"}`);
    console.log(`  controls present: ${r.controlsPresent.join(", ")}`);
    console.log(`  controls absent : ${r.controlsAbsent.join(", ") || "(none)"}`);
    console.log(`  markup/style tokens that must not appear: ${r.tokensAbsent.join(", ") || "(none)"}`);
  }
}
