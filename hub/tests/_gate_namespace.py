"""_gate_namespace.py — A BLOCK MAY NOT REBIND A NAME A LATER BLOCK READS (night 86, ruling 261054 §3: dispatched, not filed).

The door gate is one function: `run_door` holds ~140 blocks, each opened by a `# ----` banner, all in ONE namespace. Night
84's item-6 block named a loop result `r`; `r` was the resolver's result, bound once at the top and read by every block
after it, so each of those raised `KeyError: 'controlsPresent'` — red at bite's closing run, a nine-minute round trip. The
fix then was a rename, and the convention since (a night suffix: row84, q84, boot69) is a rule asking everyone to remember.
This is the mechanism instead, run before any browser opens:

  REBOUND BEFORE READ   a name read in a block that has not bound it itself, after TWO OR MORE earlier blocks bound it —
                        which binding the read gets depends on which block ran last, so it fails by name.
  CLOSURE REBOUND       a name a closure reads (a lambda, a def — a page.on handler is called long after its block ends)
                        rebound by any later block: the handler would read the later block's object.

A block is a banner-delimited span of `run_door` (the lines before the first banner are the prologue: the resolver's `r`,
`page`, `tag`, `html`, `console`, ...). Reads and binds are lexical: a read is "its own" when its block bound the name on
an earlier line. Importing the same module twice binds the same object and is not a rebind. Comprehensions, lambdas and
defs are their own scopes; what they read from run_door is a read of run_door's name.

WHAT IT CANNOT SEE — said, not assumed: a block that rebinds a name and reads it itself, with no later reader, passes (no
collision has happened); the order is textual, so a read at the top of a loop that binds the name at its bottom counts as
relying on an earlier block; `exec`/`globals()` are invisible (the gate uses neither).

usage:  python3 hub/tests/_gate_namespace.py [path] [--json]     (exit 1 on any finding)
"""
import ast
import bisect
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

BANNER = re.compile(r"^\s+# -{3,}")


def findings(src, fn_name="run_door"):
    """[(kind, name, read_line, [binding block starts])] for the function `fn_name` in `src`"""
    tree = ast.parse(src)
    fn = next((n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == fn_name), None)
    if fn is None:
        raise ValueError(f"no function {fn_name!r} — the guard would pass on nothing")
    lines = src.split("\n")
    lo, hi = fn.body[0].lineno, fn.end_lineno
    starts = sorted({lo} | {i for i in range(lo, hi + 1) if BANNER.match(lines[i - 1])})
    block = lambda line: starts[bisect.bisect_right(starts, line) - 1]
    binds, reads, imported = defaultdict(list), defaultdict(list), defaultdict(list)

    def params(a):
        return {x.arg for x in a.posonlyargs + a.args + a.kwonlyargs} | {x.arg for x in (a.vararg, a.kwarg) if x}

    class Inner(ast.NodeVisitor):
        """a nested scope: its own locals; a free name is a READ of run_door's name (a closure reads it when called)"""
        def __init__(self, local, closure):
            self.local, self.closure = set(local), closure

        def run(self, nodes):
            for nd in nodes:
                for x in ast.walk(nd):
                    if isinstance(x, ast.Name) and isinstance(x.ctx, ast.Store):
                        self.local.add(x.id)
            for nd in nodes:
                self.visit(nd)

        def visit_Name(self, n):
            if isinstance(n.ctx, ast.Load) and n.id not in self.local:
                reads[n.id].append((n.lineno, self.closure))

        def visit_FunctionDef(self, n):
            Inner(self.local | params(n.args), self.closure).run(n.body)

        def visit_Lambda(self, n):
            Inner(self.local | params(n.args), self.closure).run([n.body])

    class Outer(ast.NodeVisitor):
        """run_door's own scope"""
        def visit_FunctionDef(self, n):
            binds[n.name].append(n.lineno)
            for d in n.args.defaults + n.args.kw_defaults:
                if d is not None:
                    self.visit(d)
            Inner(params(n.args), True).run(n.body)

        def visit_Lambda(self, n):
            for d in n.args.defaults:
                self.visit(d)
            Inner(params(n.args), True).run([n.body])

        def comp(self, n):
            self.visit(n.generators[0].iter)   # the first iterable is evaluated in the enclosing scope
            bound = {x.id for g in n.generators for x in ast.walk(g.target) if isinstance(x, ast.Name)}
            rest = [g.iter for g in n.generators[1:]] + [c for g in n.generators for c in g.ifs]
            rest += [n.key, n.value] if isinstance(n, ast.DictComp) else [n.elt]
            Inner(bound, False).run(rest)
        visit_ListComp = visit_SetComp = visit_GeneratorExp = visit_DictComp = comp

        def visit_Name(self, n):
            if isinstance(n.ctx, (ast.Store, ast.Del)):
                binds[n.id].append(n.lineno)
            else:
                reads[n.id].append((n.lineno, False))

        def visit_NamedExpr(self, n):
            binds[n.target.id].append(n.lineno)
            self.visit(n.value)

        def visit_ExceptHandler(self, n):
            if n.name:
                binds[n.name].append(n.lineno)
            self.generic_visit(n)

        def visit_Import(self, n):
            for a in n.names:
                imported[(a.asname or a.name).split(".")[0]].append(((getattr(n, "module", None) or "", a.name), n.lineno))
        visit_ImportFrom = visit_Import

    for s in fn.body:
        Outer().visit(s)
    for name, rows in imported.items():          # one module imported under one name is one object, however often
        binds[name] += [ln for _, ln in rows] if len({m for m, _ in rows}) > 1 else [min(ln for _, ln in rows)]
    out = []
    for name, rs in reads.items():
        bl = sorted(binds.get(name, ()))
        if not bl:
            continue
        for line, closure in sorted(set(rs)):
            here = block(line)
            if closure:
                later = sorted({block(b) for b in bl if b > line and block(b) != here})
                if later:
                    out.append(("closure rebound", name, line, later))
            elif not any(block(b) == here and b <= line for b in bl):
                earlier = sorted({block(b) for b in bl if b < line})
                if len(earlier) >= 2:
                    out.append(("rebound before read", name, line, earlier))
    return out, len(starts)


def describe(f):
    kind, name, line, blocks = f
    if kind == "closure rebound":
        return (f"`{name}` is read by a closure at line {line} (called after its block ends) and REBOUND by the block(s) at "
                f"line(s) {blocks} — the handler would read the later block's object; give the later one its own name")
    return (f"`{name}` is read at line {line} by a block that never bound it, after the blocks at lines {blocks} each bound "
            f"it — the read gets whichever ran last; give the later binding its own name")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    path = Path(args[0]) if args else Path(__file__).resolve().parent / "door_locks.py"
    found, n_blocks = findings(path.read_text())
    if "--json" in sys.argv:
        print(json.dumps({"blocks": n_blocks, "findings": found}))
    else:
        print(f"gate namespace (night 86): {n_blocks} block(s) of run_door · {len(found)} finding(s)")
        for f in found:
            print("FAIL " + describe(f))
    sys.exit(1 if found else 0)
