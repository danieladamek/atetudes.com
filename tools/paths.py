#!/usr/bin/env python3
"""paths.py — WHICH GATE A CHANGE OWES, computed from ONE partition (night 82, ruling 261045; dispatch trap B).

Daniel, 2026-10-01: "I want to separate the site build from the apps build." The builds and the gates separate; THE DEPLOY
DOES NOT (one Pages site takes one artifact). This file is the one place the repository is split, and the workflow
(.github/workflows/pages.yaml) reads it — nothing types the sets twice (rule 6).

THE PARTITION — every tracked path falls in EXACTLY ONE set, by non-overlapping prefixes. A path in NO set is an ERROR,
never a default: a filter that is wrong silently skips a gate (night 81's `.hp-strip`, with a yaml accent).

    app    the apps and what proves them: the expensive gate (the browser door gate, the generator identity) runs
    site   the Hugo site and its plumbing: no extra gate
    all    the pipeline and the shared tools: EVERY gate runs (a change to CI or a tool is never trusted to be narrow)
    meta   repository contracts that ship nothing: no extra gate — declared here, not defaulted

What runs on EVERY publish whatever changed (cheap, and some read both sides): the engine and hub suites (the
spec-version check reads site content), the Hugo build, the studies check (the permanent-URL guard — it exists to protect
the studies FROM the site, so it can never be gated on an app change) and the site check.

  python3 tools/paths.py check                       every tracked path in exactly one set — or name the ones that are not
  python3 tools/paths.py classify EVENT BEFORE AFTER  `app=true|false` lines for $GITHUB_OUTPUT; exit 1 on a changed path in
                                                     no set. A release or a manual run, or an unknown BEFORE, runs every gate.
  python3 tools/paths.py selftest                    the rules, pinned on synthetic paths
"""
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

SETS = {
    "app":  ["hub/", "engine/", "generators/", "static/studies/", "docs/"],
    "site": ["content/", "layouts/", "assets/", "data/", "i18n/", "hugo.yaml", "go.mod", "go.sum",
             "static/assets/", "static/CNAME", "static/.nojekyll", "SITELOG.md"],
    "all":  [".github/", "tools/", ".gitignore"],
    "meta": ["CLAUDE.md"],
}
APP_GATE = {"app", "all"}   # the sets whose change owes the app gate


def sets_of(path):
    """every set whose prefix claims `path` — a prefix ending in "/" claims a directory, any other claims one file"""
    return [s for s, prefixes in SETS.items()
            if any(path.startswith(p) if p.endswith("/") else path == p for p in prefixes)]


def check(paths):
    """→ problems: a path in no set, or in more than one"""
    out = []
    for p in paths:
        hit = sets_of(p)
        if len(hit) != 1:
            out.append(f"{p}: in {'NO set' if not hit else 'sets ' + ', '.join(hit)} — every path falls in exactly one "
                       f"(tools/paths.py SETS); a path in no set would skip a gate silently")
    return out


def git(*a):
    r = subprocess.run(["git", "-C", str(REPO), *a], capture_output=True, text=True)
    return r.returncode, r.stdout


def classify(event, before, after):
    rc, tracked = git("ls-files")
    problems = check(tracked.split())
    if event in ("release", "workflow_dispatch") or not before or set(before) == {"0"}:
        changed, why = None, f"event {event}" + ("" if before and set(before) != {"0"} else ", no prior commit") + " → every gate"
    else:
        rc, out = git("diff", "--name-status", "--no-renames", before, after)
        if rc != 0:
            changed, why = None, f"cannot diff {before[:7]}..{after[:7]} → every gate"
        else:
            rows = [ln.split("\t", 1) for ln in out.splitlines() if "\t" in ln]
            changed = [p for st, p in rows]
            why = f"{len(changed)} changed path(s) {before[:7]}..{after[:7]}"
            # a DELETED path in no set is not an error — it no longer exists, and every remaining path is checked above;
            # a deleted path IN a set still owes that set's gate (deleting a study is an app change)
            problems += [x for x in check([p for st, p in rows if not st.startswith("D")]) if x not in problems]
    touched = {s for p in (changed or []) for s in sets_of(p)}
    # an UNCLASSIFIABLE change owes every gate (the run fails at classify anyway; the answer is never "owe nothing")
    app = changed is None or bool(touched & APP_GATE) or bool(problems)
    return {"app": app, "touched": sorted(touched) if changed is not None else ["(all)"], "why": why,
            "changed": changed}, problems


def selftest():
    fails = []
    def pin(c, what):
        print(("  ok    " if c else "  FAIL  ") + what)
        if not c: fails.append(what)
    pin(sets_of("hub/modules/x.mjs") == ["app"], "a hub module is app")
    pin(sets_of("static/studies/metronome/study.html") == ["app"], "a published study is app")
    pin(sets_of("content/blog/post.md") == ["site"], "a blog post is site")
    pin(sets_of("static/assets/logo.svg") == ["site"], "a site asset is site")
    pin(sets_of(".github/workflows/pages.yaml") == ["all"], "the pipeline is all")
    pin(sets_of("CLAUDE.md") == ["meta"], "the contract is meta")
    pin(sets_of("static/robots.txt") == [], "a new file loose in static/ is in NO set")
    pin(bool(check(["static/robots.txt"])), "…and that is an error, named")
    pin(sets_of("hugo.yaml.bak") == [], "a file prefix claims one file, not its namesakes")
    for k, v in SETS.items():
        for p in v:
            others = [s for s in SETS if s != k and any(p.startswith(q) or q.startswith(p) for q in SETS[s])]
            pin(not others, f"prefix {p!r} ({k}) overlaps no other set")
    print("selftest:", "PASS" if not fails else f"FAIL ({len(fails)})")
    return 0 if not fails else 1


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
    if cmd == "selftest":
        sys.exit(selftest())
    if cmd == "check":
        rc, tracked = git("ls-files")
        probs = check(tracked.split())
        for p in probs:
            print("PROBLEM: " + p)
        print(f"paths: {len(tracked.split())} tracked path(s), each in exactly one set" if not probs else f"paths: {len(probs)} problem(s)")
        sys.exit(1 if probs else 0)
    if cmd == "classify":
        event, before, after = (sys.argv[2:5] + ["", "", ""])[:3]
        res, probs = classify(event, before, after)
        for p in probs:
            print("PROBLEM: " + p, file=sys.stderr)
        print(f"classify: {res['why']} · sets touched: {', '.join(res['touched']) or 'none'} · app gate owed: {res['app']}",
              file=sys.stderr)
        print(f"app={'true' if res['app'] else 'false'}")
        sys.exit(1 if probs else 0)
    print(__doc__); sys.exit(2)
