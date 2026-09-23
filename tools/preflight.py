#!/usr/bin/env python3
"""preflight.py — the machine's preconditions, taken at minute one (night 53, item 0).

Night 58 built, gated, chained and committed over six hours and then hit a 403 at
the push, because the machine's active GitHub account had been switched outside
the session. A precondition knowable in one command at minute one was taken at
hour six. Night 61 met a stale .git/index.lock that no host git process held.
Both are the same species: a fact owned by the MACHINE, not the repo, that a
night only discovers when it needs it. This tool takes them first.

  python3 tools/preflight.py account    the ACTIVE GitHub handle must be origin's
                                        owner — REFUSES (exit 2), never warns
  python3 tools/preflight.py lock       .git/index.lock: age, size, holder — refuses
                                        (exit 2) while a git process or a young lock
                                        holds it; a stale one is NAMED, never removed
  python3 tools/preflight.py            both, in that order
  python3 tools/preflight.py selftest   the pin: a mismatched handle refuses, a
                                        matched one passes, both URL forms parse —
                                        no network, no gh

THE EXPECTED HANDLE IS DERIVED FROM ORIGIN'S URL (rule 6 — never hand-maintain a
fact the code can read). The ACTIVE handle is what `gh api user` answers as, which
is the account gh will push as. Handles are compared, never vault labels, keychain
entry names or the local user.name (refinement 261014: `grandstech` in the vault IS
`danieladamek` on GitHub).

*** THIS TOOL NEVER SWITCHES THE ACCOUNT. *** Whose credentials publish a live site
is an account setting, not a build step. The preflight stops; the human switches
(the recovery path is night 58's: `notes/working/AtEtudes PO ruling 261013 — night 58
accepted locally; voice sits with the mixer; the push blocker is an account question.md`).

*** THIS TOOL NEVER REMOVES A LOCK. *** It measures — age, size, which process holds
it (lsof), whether any git runs on this host — and says what the measurement means.
The removal is one command and it is the human's, said in the message.
"""

import os
import re
import subprocess
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

REMEDY_ACCOUNT = ("switch the machine's active GitHub account to the handle origin expects "
                  "(gh auth switch --user <handle>), then re-run this preflight. The build session "
                  "does not switch it — see night 58's ruling, named above.")


def sh(*args, check=False):
    r = subprocess.run(args, capture_output=True, text=True)
    if check and r.returncode:
        raise RuntimeError(f"{' '.join(args)}: exit {r.returncode}: {(r.stderr or r.stdout).strip()}")
    return r.stdout.strip()


# ---------------- account ----------------

def expected_handle(origin_url):
    """the owner segment of a GitHub remote URL, https or ssh, .git or not"""
    m = re.search(r"github\.com[:/]([^/]+)/[^/]+?(?:\.git)?/?$", origin_url.strip())
    if not m:
        raise ValueError(f"origin is not a GitHub URL: {origin_url!r}")
    return m.group(1)


def active_handle():
    """the login gh is authenticated as RIGHT NOW — the account a push would use"""
    r = subprocess.run(["gh", "api", "user", "--jq", ".login"], capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f"gh api user failed (is gh logged in?): {(r.stderr or r.stdout).strip()}")
    return r.stdout.strip()


def account_verdict(expected, active):
    """(ok, message) — GitHub handles are case-insensitive"""
    if expected.lower() == active.lower():
        return True, f"account: active GitHub handle {active} is origin's owner {expected} — proceed"
    return False, (f"REFUSED — account: the active GitHub handle is {active}, origin expects {expected}. "
                   f"The night does not start. Remedy: {REMEDY_ACCOUNT}")


def account():
    origin = sh("git", "-C", str(REPO), "remote", "get-url", "origin", check=True)
    ok, msg = account_verdict(expected_handle(origin), active_handle())
    print(msg)
    return 0 if ok else 2


# ---------------- lock ----------------

def lock_holders(path):
    """command names holding the file open, from lsof (empty when none or lsof absent)"""
    r = subprocess.run(["lsof", "-F", "c", str(path)], capture_output=True, text=True)
    return sorted({ln[1:] for ln in r.stdout.splitlines() if ln.startswith("c")})


def host_git_pids():
    r = subprocess.run(["pgrep", "-x", "git"], capture_output=True, text=True)
    return [p for p in r.stdout.split() if p]


def lock_verdict(exists, age_s, size, holders, git_pids, young_s=120):
    if not exists:
        return True, "lock: no .git/index.lock — proceed"
    who = ", ".join(holders) if holders else "no process"
    facts = f".git/index.lock exists: {size} bytes, {age_s:.0f} s old, held open by {who}; git on this host: {git_pids or 'none'}"
    if git_pids:
        return False, f"REFUSED — lock: {facts}. A git process is running here; wait for it, then re-run."
    if age_s < young_s:
        return False, f"REFUSED — lock: {facts}. Younger than {young_s} s — something may be mid-write; re-run in a minute."
    return False, (f"REFUSED — lock: {facts}. STALE: no git runs on this host and the lock is old. "
                   f"Remove it by hand (rm .git/index.lock) once you have read who holds it; this tool never does.")


def lock():
    p = REPO / ".git" / "index.lock"
    exists = p.exists()
    age = time.time() - p.stat().st_mtime if exists else 0.0
    size = p.stat().st_size if exists else 0
    ok, msg = lock_verdict(exists, age, size, lock_holders(p) if exists else [], host_git_pids())
    print(msg)
    return 0 if ok else 2


# ---------------- selftest ----------------

def selftest():
    fails = []
    def pin(cond, what):
        print(("  ok    " if cond else "  FAIL  ") + what)
        if not cond: fails.append(what)
    pin(expected_handle("https://github.com/danieladamek/atetudes.com.git") == "danieladamek", "https form parses to the owner")
    pin(expected_handle("git@github.com:danieladamek/atetudes.com.git") == "danieladamek", "ssh form parses to the owner")
    pin(expected_handle("https://github.com/Owner/repo") == "Owner", "no .git suffix parses")
    ok, msg = account_verdict("danieladamek", "BarryElderwine")
    pin(not ok and "REFUSED" in msg and "BarryElderwine" in msg and "danieladamek" in msg,
        "a mismatch REFUSES and names both handles: " + msg[:80])
    ok, msg = account_verdict("danieladamek", "DanielAdamek")
    pin(ok, "a match differing only in case passes")
    ok, msg = lock_verdict(False, 0, 0, [], [])
    pin(ok, "no lock passes")
    ok, msg = lock_verdict(True, 3600, 0, ["com.apple.Virtualization.VirtualMachine"], [])
    pin(not ok and "STALE" in msg and "rm .git/index.lock" in msg and "Virtualization" in msg,
        "an old lock held by a non-git process is named STALE with the remedy, not removed")
    ok, msg = lock_verdict(True, 5, 0, [], [])
    pin(not ok and "Younger" in msg, "a young lock refuses without calling it stale")
    ok, msg = lock_verdict(True, 3600, 0, [], ["4242"])
    pin(not ok and "git process is running" in msg, "a lock beside a running git refuses")
    print("selftest:", "PASS" if not fails else f"FAIL ({len(fails)})")
    return 0 if not fails else 1


def main(argv):
    cmd = argv[1] if len(argv) > 1 else "all"
    if cmd == "account": return account()
    if cmd == "lock": return lock()
    if cmd == "selftest": return selftest()
    if cmd == "all":
        a = account()
        return a if a else lock()
    print(__doc__); return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
