/* build.mjs — reach-set → one self-contained HTML file per door.
 *
 * Stage 1 inlined script. This inlines SCRIPT, MARKUP and STYLES, all three
 * from the same reach-set, so a locked-out module leaves nothing behind in any
 * of the three. The build still takes no module list of any kind.
 *
 * The inline transform is the repo's existing one for engine modules — drop
 * `import` lines, strip a leading `export `, trim — the same transform the
 * anti-drift pins use.
 *
 * CLI:  node hub/tools/build.mjs            all doors
 *       node hub/tools/build.mjs scribe     one door
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, dirname, resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveDoor, listDoors, HUB, REPO } from "./resolve.mjs";

const IMPORT_LINE = /^\s*import\s[\s\S]*?from\s+"[^"]+"\s*;?\s*$/gm;
const IMPORT_PARTS = /^\s*import\s+\{([^}]*)\}\s+from\s+"([^"]+)"\s*;?\s*$/gm;
const EXPORT_DECL = /^export\s+(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;

export function inlineForm(src) {
  return src.replace(IMPORT_LINE, "").replace(/^export\s+/gm, "").trim();
}

/* Each module is inlined inside its own IIFE that returns its exports, and
 * its imports are destructured from the namespaces of the modules already
 * emitted. This is the shipped study's own convention (`const CHORD = (() =>
 * {…})()`), not a new one — and it is what lets chord.mjs and motion.mjs both
 * declare `mod12` in one file, which flat concatenation could not. */
const nsOf = (relPath) => "__m_" + relPath.replace(/[^A-Za-z0-9]+/g, "_");
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

function moduleChunk(relPath, src, resolveDep) {
  const binds = [];
  for (const m of src.matchAll(IMPORT_PARTS)) {
    const from = nsOf(resolveDep(relPath, m[2]));
    const names = m[1].split(",").map((s) => s.trim()).filter(Boolean)
      .map((s) => s.replace(/\s+as\s+/, ": "));
    binds.push(`const { ${names.join(", ")} } = ${from};`);
  }
  const exports = [...src.matchAll(EXPORT_DECL)].map((m) => m[1]);
  /* A re-export LIST (`export { a, b };` or `export … from "…"`) is invisible to
   * the declaration scan above, so it would be dropped in silence and the
   * consumer would see `undefined` at runtime — a page error with no hint of
   * where it came from. Refuse it by name instead, and say what to write. */
  const RE_EXPORT = /^\s*export\s*\{[^}]*\}/m;
  if (RE_EXPORT.test(src))
    throw new Error(`${relPath}: a re-export list (\`export { … }\`) does not survive inlining — ` +
      `the build reads exports by declaration, so this would be dropped silently and read as ` +
      `undefined at runtime. Re-export by value instead: \`export const X = Y;\``);
  if (!exports.length) throw new Error(`${relPath}: exports nothing — a hub module must export what its consumers name`);
  return `/* ===== ${relPath} ===== */\nconst ${nsOf(relPath)} = (() => {\n` +
    (binds.length ? binds.join("\n") + "\n" : "") +
    inlineForm(src) + `\nreturn { ${exports.join(", ")} };\n})();`;
}

async function build(id) {
  const r = await resolveDoor(id);
  const shell = await import(pathToFileURL(join(HUB, "shell.mjs")).href);

  const resolveDep = (from, spec) =>
    relative(REPO, resolvePath(dirname(join(REPO, from)), spec)).split("\\").join("/");
  const emitted = new Set();
  const chunks = r.filesIn.map((relPath) => {
    const src = readFileSync(join(REPO, relPath), "utf8");
    for (const m of src.matchAll(IMPORT_PARTS)) {
      const dep = resolveDep(relPath, m[2]);
      if (!emitted.has(dep))
        throw new Error(`${relPath} imports ${dep}, which the reach-set orders after it — the topological order is wrong`);
    }
    emitted.add(relPath);
    return moduleChunk(relPath, src, resolveDep);
  });

  // the module array, the markup and the stylesheet are all GENERATED from the
  // reach-set, in import order — three consumers of one derivation
  const order = r.filesIn.map((f) => r.modulesIn.find((m) => m.rel === f)).filter(Boolean);
  const names = order.map((m) => `${nsOf(m.rel)}.${m.name}`);

  const mods = [];
  for (const m of order)
    mods.push((await import(pathToFileURL(join(REPO, m.rel)).href))[m.name]);

  /* A contribution may state where it belongs on the page with `order`
   * (default 0, stable within a tie). Without it the page order is an accident
   * of filename, which is not a fact any module should be asserting — and on
   * this door it put the configuration BELOW the neck it configures. */
  const slots = { hidden: [], cards: [], strips: [], boards: [] };
  const placed = [...mods].map((m, i) => ({ m, i }))
    .sort((a, b) => ((a.m.order ?? 0) - (b.m.order ?? 0)) || (a.i - b.i))
    .map((x) => x.m);
  for (const m of placed) {
    const where = m.mount_point ?? "cards";
    const wrap = shell.WRAPPERS[where];
    if (!wrap) throw new Error(`${m.id}: unknown mount point "${where}" — the shell offers ${Object.keys(shell.WRAPPERS).join(", ")}`);
    slots[where].push(wrap.html(m.markup, m.wrap_class));
  }
  // a container's styles ship only if a module filled that container
  const styles = shell.SHELL_STYLES
    + Object.entries(slots).filter(([, v]) => v.length)
        .map(([k]) => shell.WRAPPERS[k].styles).join("\n")
    + mods.map((m) => m.styles ?? "").join("\n");
  const markup = shell.SHELL_MARKUP
    .replace('<div class="cards" id="cards"></div>',
      `<div class="cards" id="cards">${slots.cards.join("\n")}\n</div>`)
    .replace('<div id="hidden"></div>', slots.hidden.join("\n"))
    .replace('<div id="strips"></div>',
      `<div id="strips">${slots.strips.join("\n")}\n</div>`)
    .replace('<div id="boards"></div>',
      `<div id="boards">${slots.boards.join("\n")}\n</div>`);

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(r.present.title)} — At-Etudes hub door</title>
<!-- BUILT FILE. Door "${r.door}", lock ${esc(JSON.stringify(r.lock))}.
     Contains: ${r.filesIn.join(", ")}
     Regenerate: node hub/tools/build.mjs ${r.door}
     (What the lock does NOT reach is deliberately unnamed here — a file that
      names its pruned modules still contains their names.) -->
<style>${styles}</style>
</head><body>
${markup}
<script>
${chunks.join("\n\n")}

/* ===== generated: the reach-set, derived from the lock ===== */
const MODULES = [${names.join(", ")}];
const DOOR = ${JSON.stringify({ id: r.door, lock: r.lock, present: r.present })};
__m_hub_shell_mjs.boot(MODULES, DOOR, document);
</script>
</body></html>
`;
  mkdirSync(join(HUB, "build"), { recursive: true });
  writeFileSync(join(HUB, "build", r.door + ".html"), html);
  const kb = (html.length / 1024).toFixed(1);
  console.log(`built ${r.door}.html  ${kb} kB  ${r.filesIn.length} file(s) in, ` +
    `${r.filesOut.length} pruned  controls ${r.controlsPresent.length}/${r.controlsAbsent.length} ` +
    `present/locked  tokens locked out: ${r.tokensAbsent.length}`);
}

const which = process.argv[2] ? [process.argv[2]] : listDoors();
for (const id of which) await build(id);
