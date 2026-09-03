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
import { resolveDoor, listDoors, HUB, REPO, importStatementsOf, withoutImports } from "./resolve.mjs";

/* the import statement is read by resolve.mjs's ONE parser (260921): what
 * binds and what blanks come from the same match, and any other spelling is
 * refused by name before a byte is emitted */
const EXPORT_DECL = /^export\s+(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;

export function inlineForm(src, relPath = "?") {
  return withoutImports(src, relPath).replace(/^export\s+/gm, "").trim();
}

/* A ROW THAT DECLARES ITS COLUMN TEMPLATE (Multetudes child 8, 2026-08-29 —
 * the one missing primitive, measured): the flex cards row divides space
 * EVENLY, and no grammar existed for "a quarter beside three quarters". A
 * door may declare `rows` — each names a grid template and the card modules
 * that sit in it — and the build lays those cards on a grid instead of the
 * flex flow. THE LAW THIS KEEPS: rows are PLACEMENT of what the lock already
 * reached, exactly as a module's own `order` is — they can never add or
 * remove reach (the resolver refuses a row naming an unreached module, by
 * name), and a reached card no row names still flows into the ordinary
 * cards row.
 *
 * WHY THIS LIVES HERE AND NOT IN hub/shell.mjs, recorded because the first
 * draft learned it the hard way: shell.mjs's SOURCE is inlined verbatim into
 * every built door, so ANY addition to it changes every door's bytes — and
 * the primitive's own gate is that row-less doors rebuild byte-identically.
 * The shell has two halves: the inlined page grammar (shell.mjs) and the
 * build-time emitters (this file, which ships in nothing). A wrapper the
 * page never executes is build grammar, so it sits in the build half, and
 * its styles ship only for a door that declares rows — the same rule that
 * keeps `.board` from outliving the last board. */
const ROW_WRAPPER = {
  html: (inner, template) =>
    `<div class="cardrow" style="grid-template-columns:${template}">${inner}\n</div>`,
  styles: `
.cardrow{display:grid;gap:12px;margin-bottom:12px;align-items:stretch}
`,
};

/* THE READOUT GRAMMAR (260920, night 26 item 3): the harmonic readout box seated
 * in a board's header — night 25's seat on the neck, ruled by Daniel (after the
 * title, one line at every width, the ellipsis on the inner span, the chord
 * surviving whole) — rendered by three boards through hub/readout.mjs, so by the
 * resolver's own rule the grammar is the page's and is stated ONCE. It lives in
 * THIS half of the shell, not shell.mjs, for the same reason ROW_WRAPPER does:
 * shell.mjs is inlined verbatim into every door and its rules must match in
 * every door (the orphan gate), while this grammar is right only where a door
 * reaches the helper — so it ships exactly there, and shell.mjs stays byte-still.
 *
 *   .readhead   the header row: title · box · spacer · (a board's mini, in flow)
 *   .readbox    the box; .readtext the inner ellipsis span; .readdot the root's
 *               degree colour from the one palette; .readchord / .readmode
 *
 * The 66px is the band the shell's own ⓘ (.infoBtn right:38px, 27px wide) and ▾
 * occupy at the header's right — an in-flow row must end before it. AT PHONE
 * WIDTH title, box, mini and band cannot share one row and the readout must stay
 * ONE line beside its title (no extra row, no dropped title — the ruling), so the
 * header becomes a grid: a board WITH a mini already needs a second row there and
 * the box shares it with the mini (box left, shrinking to its ellipsis; mini
 * right) while the title keeps the first row; a board WITHOUT one (the neck)
 * keeps title and box on its single row. Collapsed, the mini hides with the rest
 * of the board (the !important outranks a module's own #id rule, as the shell's
 * collapse rules do); the readout stays. */
const READOUT_GRAMMAR = {
  reaches: "hub/readout.mjs",
  styles: `
.board .bh.readhead{gap:10px;min-width:0;justify-content:flex-start;padding-right:66px}
.board .bh.readhead>span:first-child{flex:0 0 auto}
.headspace{flex:1 1 0;min-width:0}
.readbox{flex:0 1 auto;min-width:0;max-width:100%;
  border:1px solid var(--edge);border-radius:8px;background:#fff;padding:3px 12px;
  font-size:15px;font-weight:bold;color:var(--ink);letter-spacing:0;text-transform:none;
  white-space:nowrap;overflow:hidden;line-height:1.3}
.readbox .readtext{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.readbox .readchord{color:var(--ink)}
.readbox .readdot{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:7px;vertical-align:-1px}
.readbox .readmode{font-weight:600}
@media (max-width:480px){
  .board .bh.readhead{display:grid!important;grid-template-columns:auto minmax(0,1fr);align-items:center}
  .board .bh.readhead .headspace{display:none}
  .board .bh.readhead:has(.mini){grid-template-columns:minmax(0,1fr) auto}
  .board .bh.readhead:has(.mini)>span:first-child{grid-column:1 / -1}
  .board .bh.readhead:has(.mini) .readbox{grid-column:1}
  .board .bh.readhead:has(.mini) .mini{grid-column:2;justify-content:flex-end}
}
.clpsd>.bh.readhead .mini{display:none!important}
`,
};

/* NAMED PARTS (the parts primitive, 2026-08-30 — register entry 4's route):
 * a module's markup may mark regions as a named part —
 *
 *   <!--part:log--> … <!--/part:log-->
 *
 * (several regions may share one name; they concatenate in source order), and
 * a DOOR may seat a part away from the module's own mount:
 *
 *   seats: [{ part: "notepad-card#log", mount_point: "boards", order: 96 }]
 *
 * A door that seats nothing gets the DEFAULT ASSEMBLY: the markers are
 * stripped and every byte of markup renders at the module's own seat, in
 * source order — so a door that never heard of parts builds the exact page it
 * always built. THE LAW THIS KEEPS is the row primitive's own: seating is
 * PLACEMENT of what the lock already reached — one module, one state, one
 * mount of script; only markup regions move. That is why the journal can sit
 * pad-in-row-1, log-at-the-foot without a second importer of
 * notepad-surface.mjs — the CSS ownership wall (register entry 4) never
 * fires, because the RESOLVER never sees a new module. And like the row
 * primitive, this lives in the build half, which ships in nothing: the
 * additive proof (other doors byte-identical) gates it. */
const PART_OPEN = /<!--part:([\w-]+)-->/g;
const PART_REGION = /<!--part:([\w-]+)-->([\s\S]*?)<!--\/part:\1-->/g;

/** the named parts of a markup string: Map(name → concatenated regions) */
function partsOf(markup) {
  const out = new Map();
  for (const m of markup.matchAll(PART_REGION))
    out.set(m[1], (out.get(m[1]) ?? "") + m[2]);
  // an unpaired marker is a silent half-part — refuse it by name
  const opens = [...markup.matchAll(PART_OPEN)].length;
  const paired = [...markup.matchAll(PART_REGION)].length;
  if (opens !== paired)
    throw new Error(`a part marker is unpaired (${opens} opens, ${paired} paired regions) — ` +
      "an unpaired marker would ship half a part in silence");
  return out;
}

/** the module's markup with `seated` parts removed and all markers stripped —
 * the default assembly when `seated` is empty. NO trim: the old path passed
 * markup through verbatim, and a stripped leading newline is a byte moved in
 * every door (the additive proof caught exactly that on this function's first
 * draft, 2026-08-30). */
function markupWithout(markup, seated) {
  return markup
    .replace(PART_REGION, (whole, name, inner) => (seated.has(name) ? "" : inner));
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
  for (const s of importStatementsOf(src, relPath)) {
    const from = nsOf(resolveDep(relPath, s.spec));
    const names = s.names.map((n) => n.replace(/\s+as\s+/, ": "));
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
    inlineForm(src, relPath) + `\nreturn { ${exports.join(", ")} };\n})();`;
}

async function build(id) {
  const r = await resolveDoor(id);
  const shell = await import(pathToFileURL(join(HUB, "shell.mjs")).href);

  const resolveDep = (from, spec) =>
    relative(REPO, resolvePath(dirname(join(REPO, from)), spec)).split("\\").join("/");
  const emitted = new Set();
  const chunks = r.filesIn.map((relPath) => {
    const src = readFileSync(join(REPO, relPath), "utf8");
    for (const s of importStatementsOf(src, relPath)) {
      const dep = resolveDep(relPath, s.spec);
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
  /* DECLARED ROWS (shell.ROW_WRAPPER): a rowed card renders inside its row's
   * grid instead of the flex flow. The resolver already proved every rowed id
   * is reached; here the one remaining fact is checked — that it mounts at
   * "cards", because rows lay out the clock row only. */
  const rows = r.rows ?? [];
  const rowKey = (entry) => (typeof entry === "string" ? entry : entry.part);
  const rowed = new Set(rows.flatMap((row) => row.cards.map(rowKey)));
  const rowHeading = new Map();
  for (const row of rows)
    for (const entry of row.cards)
      if (typeof entry !== "string" && entry.heading) rowHeading.set(entry.part, entry.heading);
  const rowHtml = new Map();
  const rowedMounts = new Set();
  /* the door's seated parts, grouped by module — the resolver proved the ids
   * are reached; the part names are checked here against the markup itself */
  const seatedBy = new Map();
  for (const st of (r.seats ?? [])) {
    const [id, name] = st.part.split("#");
    (seatedBy.get(id) ?? seatedBy.set(id, new Map()).get(id)).set(name, st);
  }
  /* one ordered list of PLACEABLES — the modules (their markup minus any
   * seated parts, markers stripped either way) and the seated parts, each
   * with its own order. With no seats this reduces exactly to the old loop:
   * the placed list was already order-sorted and the sort below is stable. */
  const placeables = [];
  placed.forEach((m, i) => {
    const seated = seatedBy.get(m.id) ?? new Map();
    const parts = partsOf(m.markup);
    /* a part may also be seated by a ROW naming "id#name" — those extract
     * exactly like seats and take the module's own wrapper (plus the row's
     * optional heading, rendered as the standard board header) */
    const rowedParts = [...rowed].filter((k) => k.startsWith(m.id + "#"))
      .map((k) => k.split("#")[1]);
    for (const name of [...seated.keys(), ...rowedParts])
      if (!parts.has(name))
        throw new Error(`the door seats "${m.id}#${name}", but the module marks no part "${name}" — ` +
          `the marked parts are: ${[...parts.keys()].join(", ") || "(none)"}`);
    for (const name of rowedParts)
      if (seated.has(name))
        throw new Error(`"${m.id}#${name}" is both rowed and seated — one part, one seat`);
    placeables.push({ order: m.order ?? 0, idx: i, id: m.id,
      mount: m.mount_point ?? "cards", wrap_class: m.wrap_class,
      html: markupWithout(m.markup, new Set([...seated.keys(), ...rowedParts])), rowable: true });
    for (const [name, spec] of seated)
      placeables.push({ order: spec.order ?? 0, idx: i, id: m.id + "#" + name,
        mount: spec.mount_point, wrap_class: spec.wrap_class,
        html: parts.get(name), rowable: false });
    for (const name of rowedParts) {
      const key = m.id + "#" + name;
      const heading = rowHeading.get(key);
      placeables.push({ order: m.order ?? 0, idx: i, id: key,
        mount: m.mount_point ?? "cards", wrap_class: m.wrap_class,
        html: (heading ? `\n  <div class="bh"><span>${esc(heading)}</span></div>` : "")
          + parts.get(name), rowable: true });
    }
  });
  placeables.sort((a, b) => (a.order - b.order) || (a.idx - b.idx));
  for (const pl of placeables) {
    const wrap = shell.WRAPPERS[pl.mount];
    if (!wrap) throw new Error(`${pl.id}: unknown mount point "${pl.mount}" — the shell offers ${Object.keys(shell.WRAPPERS).join(", ")}`);
    if (!pl.rowable && pl.mount === "hidden")
      throw new Error(`${pl.id}: a part cannot be seated hidden — a part that ships invisibly is half a module in silence`);
    const html = wrap.html(pl.html, pl.wrap_class);
    if (pl.rowable && pl.mount !== "hidden" && rowed.has(pl.id)) { rowHtml.set(pl.id, html); rowedMounts.add(pl.mount); }
    else slots[pl.mount].push(html);
  }
  for (const id of rowed)
    if (!rowHtml.has(id))
      throw new Error(`row names "${id}", which has no visible mount — a hidden module cannot be laid out`);
  const rowsHtml = rows.map((row) => ROW_WRAPPER.html(
    row.cards.map((entry) => {
      const html = rowHtml.get(rowKey(entry));
      if (html === undefined)
        throw new Error(`row entry "${rowKey(entry)}" produced no markup — a row that ` +
          "emits a hole would ship a smaller, quieter page");
      return html;
    }).join("\n"), row.template)).join("\n");
  // a container's styles ship only if a module filled that container — a
  // module in a declared row still fills its own container's grammar
  const slotUsed = (k) => slots[k].length > 0 || rowedMounts.has(k);
  const styles = shell.SHELL_STYLES
    + Object.keys(slots).filter(slotUsed)
        .map((k) => shell.WRAPPERS[k].styles).join("\n")
    + (rows.length ? ROW_WRAPPER.styles : "")
    + (r.filesIn.includes(READOUT_GRAMMAR.reaches) ? READOUT_GRAMMAR.styles : "")
    + mods.map((m) => m.styles ?? "").join("\n");
  /* a rows-only door still carries a .cards element (hidden, empty) so the
   * shell's always-shipped .cards rule has something to match — the orphan
   * gate is the authority and a selector with nothing to match is a trace */
  const cardsArea = rows.length
    ? `<div id="cards">${rowsHtml}${slots.cards.length
        ? '\n<div class="cards">' + slots.cards.join("\n") + "\n</div>"
        : '\n<div class="cards" hidden></div>'}\n</div>`
    : `<div class="cards" id="cards">${slots.cards.join("\n")}\n</div>`;
  const markup = shell.SHELL_MARKUP
    .replace('<div class="cards" id="cards"></div>', cardsArea)
    .replace('<div id="hidden"></div>', slots.hidden.join("\n"))
    .replace('<div id="strips"></div>',
      `<div id="strips">${slots.strips.join("\n")}\n</div>`)
    .replace('<div id="boards"></div>',
      `<div id="boards">${slots.boards.join("\n")}\n</div>`);

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(r.present.title)} · At-Etudes</title>
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
  /* BYTES BESIDE THE kB (260917, 6d — flagged night 19): the kB figure is
   * the payload's character count; the FILE'S bytes are what `wc -c` and
   * the SITELOG report, and a session once lost real time to the two being
   * compared as one quantity */
  const bytes = Buffer.byteLength(html, "utf8");
  console.log(`built ${r.door}.html  ${kb} kB (${bytes} bytes)  ${r.filesIn.length} file(s) in, ` +
    `${r.filesOut.length} pruned  controls ${r.controlsPresent.length}/${r.controlsAbsent.length} ` +
    `present/locked  tokens locked out: ${r.tokensAbsent.length}`);
}

const which = process.argv[2] ? [process.argv[2]] : listDoors();
for (const id of which) await build(id);
