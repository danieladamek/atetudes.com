#!/usr/bin/env python3
"""reinline.py — re-inline an engine module into the HAND-AUTHORED study pages (261010).

The hand pages (metronome, triadetudes) carry engine modules as IIFE blocks:

    const NAME = (() => {
    const { a, b } = DEP;            # one binding line per `import { a, b } from "./dep.mjs"`
    /* module.mjs — … */             # the module's source, `export ` stripped at line starts,
    …                                #   import lines removed — the census's defSegmentsOf form
    return { x, y, z };              # the module's exported names, in source order
    })();

The carrier census (engine/tests/_carriers.mjs) pins every exported definition VERBATIM against
the page, so an edited module must be re-inlined here or its drift pin goes red. Two earlier copies
of this tool lived in a session scratchpad and were lost to restarts; this one is tracked.

    python3 tools/reinline.py <module> [<module> …] [--pages metronome,triadetudes]
      replaces each named module's block in each page that carries it; a dependency the page does
      not yet carry is ADDED (its own block, named MODULE_UPPER, placed just before the first block
      that binds it), recursively.
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
ENGINE = REPO / "engine"
HAND_PAGES = ["metronome", "triadetudes"]

IMPORT_RE = re.compile(r'^import \{([^}]*)\} from "\./([a-z0-9-]+)\.mjs";[^\n]*\n?', re.M)
EXPORT_NAME_RE = re.compile(r'^export (?:async )?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)', re.M)
BLOCK_HEAD_RE = re.compile(r'^const ([A-Z_][A-Z0-9_]*) = \(\(\) => \{$', re.M)


def module_source(mod):
    return (ENGINE / f"{mod}.mjs").read_text()


def imports_of(src):
    """[(names, dep)] from the module's own import statements, in order"""
    return [([n.strip() for n in m.group(1).split(",") if n.strip()], m.group(2)) for m in IMPORT_RE.finditer(src)]


def inline_body(src):
    body = IMPORT_RE.sub("", src)
    body = re.sub(r'^export ', '', body, flags=re.M)
    return body.rstrip("\n")


def export_names(src):
    return EXPORT_NAME_RE.findall(src)


def blocks_of(page):
    """[(name, start, end, mod)] — every IIFE block and the module banner it carries"""
    out = []
    for m in BLOCK_HEAD_RE.finditer(page):
        start = m.start()
        end = page.index("\n})();", m.end()) + len("\n})();")
        body = page[start:end]
        b = re.search(r'/\* ([a-z0-9-]+)\.mjs', body)
        out.append((m.group(1), start, end, b.group(1) if b else None))
    return out


def block_text(name, mod, page_names):
    src = module_source(mod)
    lines = [f"const {name} = (() => {{"]
    for names, dep in imports_of(src):
        if dep not in page_names:
            raise KeyError(dep)
        lines.append(f"const {{ {', '.join(names)} }} = {page_names[dep]};")
    lines.append(inline_body(src))
    lines.append(f"return {{ {', '.join(export_names(src))} }};")
    lines.append("})();")
    return "\n".join(lines)


def reinline(page, mod):
    """the page with `mod`'s block regenerated (added if absent, dependencies first)"""
    blocks = blocks_of(page)
    page_names = {b[3]: b[0] for b in blocks if b[3]}
    # dependencies the page lacks are added first, recursively
    for _, dep in imports_of(module_source(mod)):
        if dep not in page_names:
            page = reinline_add(page, dep, before_mod=mod)
            blocks = blocks_of(page); page_names = {b[3]: b[0] for b in blocks if b[3]}
    hit = [b for b in blocks if b[3] == mod]
    if not hit:
        return page, "absent"
    name, start, end, _ = hit[0]
    new = block_text(name, mod, page_names)
    if page[start:end] == new:
        return page, "unchanged"
    return page[:start] + new + page[end:], "replaced"


def reinline_add(page, mod, before_mod):
    """add `mod` as a new block just before the block of `before_mod` (which will bind it)"""
    blocks = blocks_of(page)
    page_names = {b[3]: b[0] for b in blocks if b[3]}
    for _, dep in imports_of(module_source(mod)):
        if dep not in page_names:
            page = reinline_add(page, dep, before_mod=mod)
            blocks = blocks_of(page); page_names = {b[3]: b[0] for b in blocks if b[3]}
    name = mod.upper().replace("-", "_")
    new = block_text(name, mod, page_names)
    anchor = [b for b in blocks if b[3] == before_mod]
    at = anchor[0][1] if anchor else len(page)
    print(f"  + added {mod}.mjs as {name} before {before_mod}")
    return page[:at] + new + "\n" + page[at:]


def main(argv):
    mods = [a for a in argv if not a.startswith("--")]
    pages = HAND_PAGES
    for a in argv:
        if a.startswith("--pages="): pages = a.split("=", 1)[1].split(",")
    if not mods:
        print(__doc__); return 2
    for slug in pages:
        path = REPO / "static/studies" / slug / "study.html"
        page = path.read_text(); before = page
        for mod in mods:
            page, what = reinline(page, mod)
            print(f"{slug}: {mod}.mjs {what}")
        if page != before:
            path.write_text(page)
            print(f"{slug}: written ({len(before)} -> {len(page)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
