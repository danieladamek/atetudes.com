#!/usr/bin/env python3
"""chain_due.py — IS A FULL MUTATION CHAIN OWED? (night 75, PO rulings 261033 §2 and 261034)

A night runs every gate in full and its own NEW mutations (`bite.py --new`). The FULL chain — every mutation — runs
weekly, and before any night that touches a trigger path. Nothing is excluded on a claim about what it depends on:
every mutation still runs; this tool only says WHEN. A schedule that lives in a prompt is not a schedule, so it lives
here, computed from the record the last full chain wrote (hub/tests/chain-record.json) and from the tree.

  python3 tools/chain_due.py            the verdict, loud: DUE (exit 2) or NOT DUE (exit 0), with every reason
  python3 tools/chain_due.py selftest   the rules, pinned on synthetic cases

DUE when any of:
  - there is no record, or it cannot be read;
  - the record is older than INTERVAL_DAYS;
  - the last full chain did not end green, or recorded a mutation that did not bite;
  - a TRIGGER file changed since the record — a family constant, the shell, the build, the harness, a gate file.
    PROPOSED REFINEMENT (rule 11 — Daniel rules the final set): for the harness and the gate files, a change that only
    ADDS lines (a new pin, a new mutation — what nearly every night does) is not a trigger; a change that MODIFIES or
    REMOVES an existing line is, because existing mutations may rely on what moved (night 72's m14/m24). Without the
    refinement every night is in scope and the full chain is nightly again (night 73's finding).
"""
import datetime
import fnmatch
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
RECORD = REPO / "hub" / "tests" / "chain-record.json"
INTERVAL_DAYS = 7                                    # PROPOSED — Daniel rules the interval

# THE TRIGGER LIST — PROPOSED (rule 11). Globs over repo-relative paths.
TRIGGERS = {
    "a family constant": ["engine/tests/_family.mjs", "engine/tests/host-conformance.test.mjs", "hub/palette.mjs"],
    "the shell":         ["hub/shell.mjs"],
    "the build":         ["hub/tools/*.mjs"],
    "the harness":       ["hub/tests/bite.py", "hub/tests/redrun.py", "tools/chain_due.py"],
    "a gate file":       ["hub/tests/door_locks.py", "engine/tests/*.test.mjs", "hub/tests/*.test.mjs"],
}
ADDITIONS_ONLY_OK = {"the harness", "a gate file"}   # PROPOSED: pure additions here do not trigger


def git(*args, text=True):
    return subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=text)


def tracked_and_new():
    out = git("ls-files", "--cached", "--others", "--exclude-standard").stdout.split()
    return sorted(set(out))


def trigger_files(paths=None):
    """{path: kind} for every present file matching a trigger glob — computed, never typed (rule 6)"""
    paths = tracked_and_new() if paths is None else paths
    found = {}
    for kind, globs in TRIGGERS.items():
        for p in paths:
            if any(fnmatch.fnmatch(p, g) for g in globs):
                found[p] = kind
    return found


def blob_of(path, write=False):
    args = ["hash-object"] + (["-w"] if write else []) + [str(REPO / path)]
    r = git(*args)
    return r.stdout.strip() if r.returncode == 0 else None


def snapshot():
    """the trigger files' content hashes, each written into git's object store so a later diff can read the old text"""
    return {p: blob_of(p, write=True) for p in trigger_files()}


def only_additions(old_text, new_text):
    """True when new_text is old_text with lines inserted and none changed or removed"""
    old, new = old_text.split("\n"), new_text.split("\n")
    i = 0
    for line in new:
        if i < len(old) and line == old[i]:
            i += 1
    return i == len(old)


def verdict(record, now=None, current=None, read_blob=None, read_file=None):
    """(due, reasons) — pure given its inputs, so the selftest can pin it"""
    now = now or datetime.datetime.now().astimezone()
    reasons = []
    if not record:
        return True, ["there is no chain record — the full chain has never been recorded"]
    try:
        ran = datetime.datetime.fromisoformat(record["ran_at"])
    except (KeyError, ValueError):
        return True, ["the chain record cannot be read — its date is missing or malformed"]
    age = now - ran
    if age > datetime.timedelta(days=INTERVAL_DAYS):
        reasons.append(f"the last full chain is {age.days} days old (the interval is {INTERVAL_DAYS})")
    if not record.get("suite_green_after", False):
        reasons.append("the last full chain did not end with the suite green")
    nb = [k for k, v in record.get("verdicts", {}).items() if v != "BITES"]
    if nb:
        reasons.append(f"the last full chain recorded mutations that did not bite: {nb[:6]}")
    old = record.get("trigger_hashes", {})
    current = current if current is not None else {p: blob_of(p) for p in trigger_files()}
    kinds = trigger_files(sorted(set(current) | set(old)))
    for p in sorted(set(old) | set(current)):
        kind = kinds.get(p, "a trigger path")
        if p not in current:
            reasons.append(f"{kind} was REMOVED since the last full chain: {p}"); continue
        if p not in old:
            if kind in ADDITIONS_ONLY_OK:
                continue   # a new gate or harness file is an addition
            reasons.append(f"{kind} is NEW since the last full chain: {p}"); continue
        if current[p] == old[p]:
            continue
        if kind in ADDITIONS_ONLY_OK:
            before = (read_blob or (lambda b: git("cat-file", "-p", b).stdout))(old[p])
            after = (read_file or (lambda q: (REPO / q).read_text()))(p)
            if before is not None and only_additions(before, after):
                continue
            reasons.append(f"{kind} changed an EXISTING line since the last full chain: {p}"); continue
        reasons.append(f"{kind} changed since the last full chain: {p}")
    return bool(reasons), reasons


def status_lines():
    record = None
    try:
        record = json.loads(RECORD.read_text())
    except (OSError, ValueError):
        pass
    due, reasons = verdict(record)
    head = [f"chain record: {RECORD.relative_to(REPO)} — "
            + (f"last full chain {record['ran_at']} on {record.get('commit', '?')[:7]}, {record.get('bites')}/{record.get('total')} bite"
               if record and "ran_at" in record else "none")]
    if due:
        return 2, head + ["FULL CHAIN DUE — this night may not report itself closed without one:"] + [f"  · {r}" for r in reasons]
    return 0, head + ["full chain NOT due — a normal night: every gate in full, plus `bite.py --new`"]


def selftest():
    fails = []
    def pin(c, what):
        print(("  ok    " if c else "  FAIL  ") + what)
        if not c: fails.append(what)
    now = datetime.datetime(2026, 10, 1, 12, 0, tzinfo=datetime.timezone.utc)
    fresh = {"ran_at": "2026-09-30T12:00:00+00:00", "suite_green_after": True, "verdicts": {"m1": "BITES"},
             "trigger_hashes": {"hub/shell.mjs": "A", "hub/tests/door_locks.py": "G"}}
    same = {"hub/shell.mjs": "A", "hub/tests/door_locks.py": "G"}
    pin(verdict(None, now)[0], "no record → DUE")
    pin(verdict({"x": 1}, now)[0], "an unreadable record → DUE")
    pin(not verdict(fresh, now, same)[0], "a fresh, green record with nothing changed → not due")
    old = dict(fresh, ran_at="2026-09-20T12:00:00+00:00")
    pin(verdict(old, now, same)[0], "a record older than the interval → DUE")
    pin(verdict(dict(fresh, suite_green_after=False), now, same)[0], "a chain that ended red → DUE")
    pin(verdict(dict(fresh, verdicts={"m1": "NO BITE"}), now, same)[0], "a recorded NO BITE → DUE")
    pin(verdict(fresh, now, {"hub/shell.mjs": "B", "hub/tests/door_locks.py": "G"})[0], "the shell changed → DUE")
    added = verdict(fresh, now, {"hub/shell.mjs": "A", "hub/tests/door_locks.py": "G2"},
                    read_blob=lambda b: "a\nb\n", read_file=lambda p: "a\nNEW PIN\nb\n")
    pin(not added[0], "a gate file with lines ADDED only → not due (the proposed refinement)")
    changed = verdict(fresh, now, {"hub/shell.mjs": "A", "hub/tests/door_locks.py": "G2"},
                      read_blob=lambda b: "a\nb\n", read_file=lambda p: "a\nB CHANGED\n")
    pin(changed[0] and "EXISTING" in changed[1][0], "a gate file with an EXISTING line changed → DUE")
    pin(verdict(fresh, now, {"hub/tests/door_locks.py": "G"})[0], "a trigger file removed → DUE")
    pin(only_additions("x\ny", "x\nq\ny\nz") and not only_additions("x\ny", "x\nY"), "additions are told from edits")
    print("selftest:", "PASS" if not fails else f"FAIL ({len(fails)})")
    return 0 if not fails else 1


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "selftest":
        sys.exit(selftest())
    code, lines = status_lines()
    print("\n".join(lines))
    sys.exit(code)
