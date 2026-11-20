#!/usr/bin/env python3
"""check_studies.py — THE PERMANENT-URL GUARD, gate side (night 82, ruling 261045; split from check_site.py by SUBJECT).

A study is a self-contained file at static/studies/<slug>/study.html. The site may wrap it, link it and list it; the site
may never modify it, and may never be required for it to work (draft web contract §9). This check is that sentence,
enforced on the artifact a deploy would publish: every study in the repo is present in the BUILT site, byte for byte.

    hugo && python3 tools/check_studies.py

It runs on EVERY publish, whatever changed — it exists to protect the studies FROM the site (a Hugo config change, a
layout writing to /studies/<slug>/study.html, an overhaul), so it can never be gated on an app change. It must survive
any site overhaul intact: it knows nothing of Hugo, only of two directories. tools/deploy_record.py is its live-side twin
(the published bytes, fetched).

The list of studies is COMPUTED from static/studies/ (rule 6). Not covered: the wrapper pages at /studies/<slug>/ (the
site's — tools/check_site.py follows their links).
"""
import hashlib
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "static" / "studies"
OUT = REPO / "public" / "studies"


def check(src=SRC, out=OUT):
    problems, seen = [], []
    if not out.parent.is_dir():
        return ["public/ not found — run `hugo` first"], seen
    for f in sorted(src.glob("*/study.html")):
        slug = f.parent.name
        built = out / slug / "study.html"
        seen.append(slug)
        if not built.exists():
            problems.append(f"{slug}: the published study is MISSING from the built site ({built.relative_to(REPO)})")
            continue
        a, b = f.read_bytes(), built.read_bytes()
        if a != b:
            problems.append(f"{slug}: the built study is NOT byte-identical to the repo's "
                            f"({hashlib.sha256(a).hexdigest()[:12]} in the repo, {hashlib.sha256(b).hexdigest()[:12]} built) — "
                            f"the site may wrap a study, never modify it")
    stray = sorted(p.parent.name for p in out.glob("*/study.html") if p.parent.name not in seen)
    if stray:
        problems.append(f"the built site publishes study file(s) the repo does not have: {stray}")
    if len(seen) < 1:
        problems.append("no study found in static/studies/ — the check would pass on nothing")
    return problems, seen


EMBED_SRC = REPO / "static" / "embed"
EMBED_OUT = REPO / "public" / "embed"


def check_embeds(src=EMBED_SRC, out=EMBED_OUT):
    """THE EMBED PLAYERS (261120): /embed/<app>/ is a permanent URL from the first embed on someone else's page — the
    same guard as a study's: every player in the repo is in the built site, byte for byte, and none the repo lacks"""
    problems, seen = [], []
    for f in sorted(src.glob("*/index.html")):
        app = f.parent.name
        built = out / app / "index.html"
        seen.append(app)
        if not built.exists():
            problems.append(f"embed/{app}: the published player is MISSING from the built site"); continue
        if f.read_bytes() != built.read_bytes():
            problems.append(f"embed/{app}: the built player is NOT byte-identical to the repo's — the site never modifies it")
    stray = sorted(p.parent.name for p in out.glob("*/index.html") if p.parent.name not in seen) if out.is_dir() else []
    if stray:
        problems.append(f"the built site publishes player(s) the repo does not have: {stray}")
    return problems, seen


if __name__ == "__main__":
    probs, seen = check()
    eprobs, eseen = check_embeds()
    for p in probs + eprobs:
        print("PROBLEM: " + p)
    if probs or eprobs:
        sys.exit(1)
    print(f"studies: {len(seen)} published, each byte-identical in the built site: {', '.join(seen)}")
    print(f"embeds: {len(eseen)} published, each byte-identical in the built site: {', '.join(eseen) or '(none)'}")
