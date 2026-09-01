#!/usr/bin/env python3
"""redrun.py — the manual red-run's snapshot/restore (260915, item 2).

Night 19's confession: a `git restore` taken to undo a deliberate red-run
mutation erased uncommitted engine work, because git restores to the last
COMMIT, not to the pre-mutation state. The recorded lesson depended on
remembering it at 2am. This tool is the lesson made unforgettable: the
harness's own PatchedPath idea (night 18, item 0) exposed for hand use —
snapshot the file, mutate however you like, restore FROM THE SNAPSHOT.
A manual red-run never reaches for git at all.

  python3 hub/tests/redrun.py snap <file> [...]   snapshot before mutating
  python3 hub/tests/redrun.py restore [<file>...] restore from snapshot(s)
                                                  (no args: restore ALL pending)
  python3 hub/tests/redrun.py drop <file> [...]   abandon a snapshot when the
                                                  mutation became the keeper
  python3 hub/tests/redrun.py status              list pending snapshots
  python3 hub/tests/redrun.py selftest            the pin: prove uncommitted
                                                  work survives a mutate+restore
                                                  where git restore destroys it

Refusals are loud and by name: snapping a file that already has a pending
snapshot refuses (a second snap would clobber the one true original);
restoring a file with no pending snapshot refuses; a restore verifies the
bytes it wrote and only then clears the manifest entry.
"""

import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
STORE = REPO / "hub" / "tests" / "out" / "redrun"
MANIFEST = STORE / "manifest.json"


def _load():
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text())
    return {}


def _save(m):
    STORE.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(m, indent=2))


def snap(paths):
    m = _load()
    for p in paths:
        f = Path(p).resolve()
        key = str(f)
        if not f.is_file():
            raise SystemExit(f"refused: {p} is not a file")
        if key in m:
            raise SystemExit(
                f"refused: {p} already has a pending snapshot ({m[key]}) — "
                "a second snap would clobber the one true original. "
                "restore it first.")
        data = f.read_bytes()
        digest = hashlib.sha256(data).hexdigest()[:12]
        STORE.mkdir(parents=True, exist_ok=True)
        dest = STORE / f"{f.name}.{digest}.snap"
        dest.write_bytes(data)
        m[key] = str(dest)
        _save(m)
        shown = dest.relative_to(REPO) if dest.is_relative_to(REPO) else dest
        print(f"snapped  {p}  ->  {shown}  ({len(data)} bytes)")


def restore(paths):
    m = _load()
    if not paths:
        paths = list(m)
        if not paths:
            print("nothing pending")
            return
    for p in paths:
        key = str(Path(p).resolve())
        if key not in m:
            raise SystemExit(f"refused: no pending snapshot for {p} — "
                             "redrun cannot invent the original")
        snap_path = Path(m[key])
        data = snap_path.read_bytes()
        Path(key).write_bytes(data)
        back = Path(key).read_bytes()
        if back != data:
            raise SystemExit(f"restore of {p} did not verify — manifest kept")
        del m[key]
        _save(m)
        snap_path.unlink()
        print(f"restored {p}  ({len(data)} bytes, verified)")


def drop(paths):
    """Abandon pending snapshot(s) WITHOUT restoring — for when the
    mutation became the keeper (wanted edits landed while the snapshot was
    pending, so restore would now destroy them). Found on the tool's first
    night: the second-snap refusal protects the original, but nothing
    warned that restore had become the destructive verb. Loud by design."""
    m = _load()
    for p in paths:
        key = str(Path(p).resolve())
        if key not in m:
            raise SystemExit(f"refused: no pending snapshot for {p}")
        snap_path = Path(m[key])
        del m[key]
        _save(m)
        snap_path.unlink()
        print(f"dropped  {p} — the snapshot is gone; the CURRENT bytes are "
              f"now the only version")


def status():
    m = _load()
    if not m:
        print("no pending snapshots")
        return
    for k, v in m.items():
        print(f"pending  {k}  <-  {v}")


def selftest():
    """THE PIN (rule 5's shape, permanent): in a scratch repo, a file
    carries committed baseline PLUS uncommitted work; a red-run mutation
    is applied and restored through redrun; the uncommitted work is
    intact. The same sequence through `git restore` is then shown
    DESTROYING the uncommitted work — the tool exists because the
    obvious undo is the wrong one."""
    global STORE, MANIFEST
    with tempfile.TemporaryDirectory() as td:
        work = Path(td)
        old_store, old_manifest = STORE, MANIFEST
        STORE = work / "redrun-store"
        MANIFEST = STORE / "manifest.json"
        try:
            run = lambda *a: subprocess.run(a, cwd=work, check=True,
                                            capture_output=True)
            run("git", "init", "-q")
            run("git", "config", "user.email", "t@t")
            run("git", "config", "user.name", "t")
            f = work / "engine.mjs"
            f.write_text("export const committed = 1;\n")
            run("git", "add", "engine.mjs")
            run("git", "commit", "-qm", "baseline")
            uncommitted = ("export const committed = 1;\n"
                           "export const tonightsUnshippedWork = 2;\n")
            f.write_text(uncommitted)

            # the red run, through the tool
            snap([str(f)])
            f.write_text("export const committed = 999; // RED-RUN NEUTER\n")
            restore([str(f)])
            assert f.read_text() == uncommitted, \
                "redrun restore lost the uncommitted work"
            print("selftest: uncommitted work INTACT through snap/mutate/restore")

            # the counterfactual: git restore destroys it
            f.write_text("export const committed = 999; // RED-RUN NEUTER\n")
            run("git", "restore", "engine.mjs")
            assert f.read_text() == "export const committed = 1;\n", \
                "git restore did not behave as documented"
            assert "tonightsUnshippedWork" not in f.read_text()
            print("selftest: git restore DESTROYED the same work — "
                  "which is why this tool exists")
        finally:
            STORE, MANIFEST = old_store, old_manifest
    print("selftest: PASS")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(2)
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == "snap":
        if not args:
            raise SystemExit("snap needs at least one file")
        snap(args)
    elif cmd == "restore":
        restore(args)
    elif cmd == "drop":
        if not args:
            raise SystemExit("drop needs the file(s) whose snapshot to abandon")
        drop(args)
    elif cmd == "status":
        status()
    elif cmd == "selftest":
        selftest()
    else:
        raise SystemExit(f"unknown command {cmd!r}")


if __name__ == "__main__":
    main()
