#!/usr/bin/env python3
"""generator_identity.py — THE PIN THAT WOULD HAVE CAUGHT aac92a0 (night 40, 261004).

A generated study page is an OUTPUT. On 2026-08-08 commit aac92a0 added 157 lines to
modes-from-pentatonic-boxes by editing the generated page, and the drift lived two months
because nothing asserted that a generator still reproduces what it published — hub doors have
byte-identity checked at every deploy; generators had nothing. This is that check, run by
tools/check_site.py locally and in CI.

Nothing here lists the generators: each generator DECLARES where its output is published
(`PUBLISHED = "static/studies/<slug>/study.html"`) and what it emits (`out = "<file>.html"`),
and this scans generators/*.py for those declarations. Each declared generator is run in a
scratch directory with generators/ on the path and its emitted bytes compared to the published
page. Byte-identical, or a failure that says what to do.
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
GENERATORS = REPO / "generators"


def declared():
    """[(generator path, emitted filename, published path)] from the generators' own declarations"""
    out = []
    for py in sorted(GENERATORS.glob("*.py")):
        src = py.read_text()
        pub = re.search(r'^PUBLISHED = "([^"]+)"', src, re.M)
        if not pub:
            continue
        emit = re.search(r'^out = "([^"]+\.html)"', src, re.M)
        if not emit:
            raise SystemExit(f"{py.name} declares PUBLISHED but no `out = \"….html\"` — the pin cannot find what it emits")
        out.append((py, emit.group(1), REPO / pub.group(1)))
    return out


def check():
    """→ [problem strings]; empty when every generator reproduces its published page"""
    problems = []
    gens = declared()
    if not gens:
        return ["generator identity: no generator declares PUBLISHED — the pin has nothing to check (it must never pass vacuously)"]
    for py, emitted, published in gens:
        with tempfile.TemporaryDirectory() as tmp:
            r = subprocess.run([sys.executable, str(py)], cwd=tmp, capture_output=True, text=True,
                               env={**__import__("os").environ, "PYTHONPATH": str(GENERATORS)})
            if r.returncode != 0:
                problems.append(f"generator identity: {py.name} failed to run ({r.stderr.strip()[-300:]})")
                continue
            got = Path(tmp) / emitted
            if not got.exists():
                problems.append(f"generator identity: {py.name} did not emit {emitted}")
                continue
            if not published.exists():
                problems.append(f"generator identity: {py.name} declares {published.relative_to(REPO)}, which does not exist")
                continue
            a, b = got.read_bytes(), published.read_bytes()
            if a != b:
                # the first differing line, so the drift is named
                al, bl = a.split(b"\n"), b.split(b"\n")
                k = next((i for i in range(min(len(al), len(bl))) if al[i] != bl[i]), min(len(al), len(bl)))
                problems.append(
                    f"generator identity: {published.relative_to(REPO)} is NOT what {py.name} emits "
                    f"(first difference at line {k + 1}; emitted {len(a)} bytes, published {len(b)}). "
                    f"The page is an OUTPUT — do NOT edit it to clear this: fix it UPSTREAM in {py.name} "
                    f"and re-ingest (run the generator, copy {emitted} to {published.relative_to(REPO)}, cmp).")
            else:
                print(f"generator identity: {published.relative_to(REPO)} is byte-identical to what {py.name} emits ({len(a)} bytes)")
    return problems


if __name__ == "__main__":
    ps = check()
    for p in ps:
        print("PROBLEM: " + p)
    sys.exit(1 if ps else 0)
