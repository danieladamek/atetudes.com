#!/usr/bin/env python3
"""check.py — EVERY GATE, ONE COMMAND (2026-09-30, Daniel's ruling: a change closes on the gates).

  python3 tools/check.py            engine · hub · the door gate in every door · hugo · check_site   (~7–8 min)
  python3 tools/check.py --doors plain,scribe
                                    the same, with the door gate limited to the named doors

Runs every gate even when one fails, so one run shows everything; prints each gate's verdict and seconds, the failing
lines of any that failed, and the log paths. Exit 0 only when every gate is green. Nothing here is new — it is the
gates that already exist, in the order a close runs them. Mutations (hub/tests/bite.py) are separate and opt-in.
"""
import argparse
import datetime
import subprocess
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "hub" / "tests" / "out"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--doors", default=None, help="comma-separated doors for the door gate (default: every door)")
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    stamp = datetime.datetime.now().strftime("%m%d-%H%M%S")
    door_cmd = ["python3", "hub/tests/door_locks.py"] + (["--doors", a.doors] if a.doors else [])
    gates = [
        ("engine", ["node", "--test", "engine/tests/"]),
        ("hub", ["sh", "-c", "node --test hub/tests/*.test.mjs"]),
        ("build", ["node", "hub/tools/build.mjs"]),
        ("doors", door_cmd),
        ("hugo", ["hugo", "--quiet"]),
        ("check_site", ["python3", "tools/check_site.py"]),
    ]
    results = []
    for name, cmd in gates:
        log = OUT / f"check-{stamp}-{name}.log"
        t = time.time()
        r = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True)
        secs = time.time() - t
        log.write_text(r.stdout + r.stderr)
        results.append((name, r.returncode, secs, log))
        print(f"{'GREEN' if r.returncode == 0 else 'RED  '}  {name:<10} {secs:6.1f} s   {log.relative_to(REPO)}", flush=True)
        if r.returncode:
            bad = [ln for ln in (r.stdout + r.stderr).splitlines()
                   if ln.startswith(("FAIL", "not ok", "PROBLEM", "Error", "error")) or "✖" in ln][:8]
            for ln in bad:
                print("         " + ln[:200])
    red = [n for n, rc, _, _ in results if rc]
    print(("ALL GREEN" if not red else f"RED: {', '.join(red)}") + f" — {sum(s for _, _, s, _ in results):.0f} s total")
    return 1 if red else 0


if __name__ == "__main__":
    sys.exit(main())
