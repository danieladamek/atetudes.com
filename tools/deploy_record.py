#!/usr/bin/env python3
"""deploy_record.py — THE DEPLOY RECORD IS WRITTEN FROM THE RUN (260921, night 27 item 3).

Three SITELOG deploy records were composed by hand from a run the writer may not
have opened; one of them recorded a run that had failed. Nothing in the path
required the run to be read. This tool is that requirement made mechanical:

  emit <sha>      fetch the Actions run for that commit (gh), fetch every published
                  study's LIVE bytes and compare them to the repo's, and print the
                  record's FACTUAL HALF — run id, conclusion, commit, timestamps,
                  the per-study shasum comparison — plus a `record:` line whose
                  digest is computed over the raw fetched run JSON and the live
                  shasums. The prose is yours; the facts are the fetch's. A FAILED
                  run prints a record that says FAILED, in capitals, first.
  verify [SITELOG.md]
                  every DEPLOYED entry above the mechanism marker must carry a
                  `record:` line, and its run id, conclusion and commit are
                  RE-FETCHED from GitHub and compared to what the line says. A
                  record that cannot be verified fails; a missing gh fails LOUDLY
                  (never a silent skip — a gate must be able to prove it ran).

Run by tools/check_site.py (locally in the ritual, and in CI), so a hand-typed
record cannot pass the path. What it reads is a real artifact — the run as
GitHub reports it and the bytes the site serves — never an intention.
"""
import hashlib
import json
import re
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
STUDIES = REPO / "static" / "studies"
SITE = "https://atetudes.com"
MARKER = "<!-- deploy records below this line predate tools/deploy_record.py (260921); records above it are written from the run -->"
RECORD_RE = re.compile(r"^- record: run (\d+) · (\w+) · commit ([0-9a-f]{7,40}) · fetched (\S+) · (\d+)/(\d+) studies byte-identical · digest ([0-9a-f]{12})$", re.M)


def sh(*args):
    try:
        r = subprocess.run(args, capture_output=True, text=True)
    except FileNotFoundError:
        raise SystemExit(f"deploy_record: `{args[0]}` is not installed — the fetch cannot run, and nothing is skipped in its place")
    if r.returncode != 0:
        raise SystemExit(f"deploy_record: `{' '.join(args)}` failed ({r.returncode}): {(r.stderr or r.stdout).strip()[:300]}")
    return r.stdout


def gh_run_for_sha(sha):
    raw = sh("gh", "run", "list", "--limit", "30", "--json", "databaseId,headSha,conclusion,status,createdAt,updatedAt,url,event")
    runs = [r for r in json.loads(raw) if r["headSha"].startswith(sha) and r["event"] == "push"]
    if not runs:
        raise SystemExit(f"deploy_record: no push run found for {sha} in the last 30 runs")
    return runs[0]


def gh_run_by_id(run_id):
    return json.loads(sh("gh", "run", "view", str(run_id), "--json", "databaseId,headSha,conclusion,status,createdAt,updatedAt,url"))


def local_shasums():
    out = {}
    for d in sorted(p for p in STUDIES.iterdir() if p.is_dir() and (p / "study.html").exists()):
        out[d.name] = hashlib.sha1((d / "study.html").read_bytes()).hexdigest()[:12]
    return out


def live_shasums(slugs):
    out = {}
    stamp = int(datetime.now(timezone.utc).timestamp())
    for s in slugs:
        try:
            with urllib.request.urlopen(f"{SITE}/studies/{s}/study.html?cb={stamp}", timeout=30) as r:
                out[s] = hashlib.sha1(r.read()).hexdigest()[:12]
        except Exception as exc:
            out[s] = f"UNREACHABLE ({type(exc).__name__})"
    return out


def emit(sha):
    run = gh_run_for_sha(sha)
    if run["status"] != "completed":
        raise SystemExit(f"deploy_record: run {run['databaseId']} is {run['status']} — a record is written from a finished run, not a pending one")
    local = local_shasums(); live = live_shasums(local.keys())
    same = [s for s in local if live[s] == local[s]]
    raw = json.dumps(run, sort_keys=True) + "\n" + "\n".join(f"{s} {live[s]}" for s in local)
    digest = hashlib.sha256(raw.encode()).hexdigest()[:12]
    fetched = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    ok = run["conclusion"] == "success"
    date = fetched[:10]
    head = f"## {date} — DEPLOYED: " if ok else f"## {date} — DEPLOY FAILED: "
    lines = [head + "<write the human half of the title here>", ""]
    lines.append(f"- record: run {run['databaseId']} · {run['conclusion']} · commit {run['headSha'][:7]} · fetched {fetched} · {len(same)}/{len(local)} studies byte-identical · digest {digest}")
    lines.append(f"- Actions run {run['databaseId']} {'green' if ok else 'FAILED (' + str(run['conclusion']) + ')'} on `{run['headSha'][:7]}` — {run['url']} (created {run['createdAt']}, finished {run['updatedAt']}).")
    for s in local:
        mark = "matches" if live[s] == local[s] else "DOES NOT MATCH"
        lines.append(f"- {s}: repo {local[s]} · live {live[s]} — {mark}.")
    if not ok:
        lines.append("- THE RUN FAILED. Nothing above should be read as a deploy; the live bytes are whatever the previous run left.")
    lines.append("")
    print("\n".join(lines))


def verify(path):
    text = Path(path).read_text()
    if MARKER not in text:
        raise SystemExit(f"deploy_record: {path} carries no mechanism marker — nothing to verify against")
    above = text.split(MARKER)[0]
    entries = re.split(r"^(?=## )", above, flags=re.M)
    problems, checked = [], 0
    for e in entries:
        first = e.splitlines()[0] if e.strip() else ""
        if "DEPLOYED" not in first and "DEPLOY FAILED" not in first:
            continue
        m = RECORD_RE.search(e)
        if not m:
            problems.append(f"{first[:70]!r}: no `record:` line — a deploy record above the marker must be written by this tool")
            continue
        run_id, conclusion, commit = m.group(1), m.group(2), m.group(3)
        run = gh_run_by_id(run_id)
        if run["conclusion"] != conclusion:
            problems.append(f"{first[:70]!r}: records conclusion {conclusion!r}, GitHub says {run['conclusion']!r}")
        if not run["headSha"].startswith(commit):
            problems.append(f"{first[:70]!r}: records commit {commit}, run {run_id} is on {run['headSha'][:7]}")
        if ("DEPLOYED" in first) != (run["conclusion"] == "success"):
            problems.append(f"{first[:70]!r}: the title's verdict does not match the run's conclusion {run['conclusion']!r}")
        checked += 1
    print(f"deploy records verified against GitHub: {checked} checked, {len(problems)} problem(s)")
    for p in problems:
        print("PROBLEM:", p)
    if problems:
        raise SystemExit(1)
    if checked == 0 and "DEPLOYED" in above:
        raise SystemExit("deploy_record: the verify checked nothing — the gate cannot prove it ran")


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "emit":
        emit(sys.argv[2])
    elif len(sys.argv) >= 2 and sys.argv[1] == "verify":
        verify(sys.argv[2] if len(sys.argv) > 2 else REPO / "SITELOG.md")
    else:
        print(__doc__); sys.exit(2)
