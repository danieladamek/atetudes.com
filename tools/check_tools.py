#!/usr/bin/env python3
"""check_tools.py — THE /tools/ SECTION'S PINS (item: RiffRaft on the site — publish the web edition, Daniel 2026-09-23).

A tool is a self-contained file someone else builds, copied in BYTE-IDENTICAL at a named commit:
static/tools/<slug>/index.html, with static/tools/<slug>/PIN recording the commit and the file's sha256. The site never
edits the copy; updating it is a deliberate re-pin (both files in one commit, plus a SITELOG entry).

    python3 tools/check_tools.py             the pins: every copy's sha256 is its PIN's — always
                                             and, if public/ exists (`hugo` first): every copy is byte-identical in the
                                             BUILT site, and the built /tools/ page offers each one (Open + Download)
    python3 tools/check_tools.py --offline   also: each copy opened from file:// in Chromium with every non-file request
                                             aborted, at 1280 and 390 — zero console errors, zero network attempts
                                             (the download must work from a double-click)

The list of tools is COMPUTED from static/tools/*/PIN (rule 6); the /tools/ page's list is data/tools.yaml, and the two
are held to each other here, on the built page. A tool is not a study: no Design Spec, no study check.
"""
import hashlib
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "static" / "tools"
OUT = REPO / "public" / "tools"


def read_pin(path):
    pin = {}
    for ln in path.read_text().splitlines():
        if ln.strip() and not ln.startswith("#"):
            k, _, v = ln.partition(" ")
            pin[k] = v.strip()
    return pin


def check():
    problems, slugs, asserts = [], [], 0
    for pinf in sorted(SRC.glob("*/PIN")):
        slug, copy = pinf.parent.name, pinf.parent / "index.html"
        slugs.append(slug)
        pin = read_pin(pinf)
        for k in ("commit", "sha256", "source"):
            asserts += 1
            if not pin.get(k):
                problems.append(f"{slug}: PIN states no `{k}`")
        asserts += 1
        if not copy.exists():
            problems.append(f"{slug}: PIN without a copy ({copy.relative_to(REPO)})")
            continue
        got = hashlib.sha256(copy.read_bytes()).hexdigest()
        if got != pin.get("sha256"):
            problems.append(f"{slug}: the copy's sha256 is {got}, its PIN says {pin.get('sha256')} — the site never "
                            f"edits a pinned tool; re-pin deliberately (both files, one commit, a SITELOG entry)")
    loose = sorted(d.name for d in SRC.iterdir() if d.is_dir() and not (d / "PIN").exists()) if SRC.is_dir() else []
    if loose:
        problems.append(f"tool folder(s) without a PIN: {loose}")
    if not slugs:
        problems.append("no pinned tool found in static/tools/ — the check would pass on nothing")

    built = OUT.parent.is_dir()
    if built:
        for slug in slugs:
            src, b = SRC / slug / "index.html", OUT / slug / "index.html"
            asserts += 1
            if not b.exists():
                problems.append(f"{slug}: MISSING from the built site ({b.relative_to(REPO)})")
            elif b.read_bytes() != src.read_bytes():
                problems.append(f"{slug}: the built copy is NOT byte-identical to the pinned one — the build altered it")
        index = OUT / "index.html"
        asserts += 1
        if not index.exists():
            problems.append("the built /tools/ page is missing (public/tools/index.html) — /tools/ would 404")
        else:
            html = index.read_text(encoding="utf-8")
            offered = set(re.findall(r'href="?/tools/([^/"\s>]+)/"?[\s>]', html))
            downloads = set(re.findall(r'href="?/tools/([^/"\s>]+)/index\.html"?\s+download="?([^"\s>]+)', html))
            for slug in slugs:
                asserts += 2
                if slug not in offered:
                    problems.append(f"{slug}: the /tools/ page does not open it (no link to /tools/{slug}/) — "
                                    f"add its row to data/tools.yaml")
                if (slug, f"{slug}.html") not in downloads:
                    problems.append(f"{slug}: the /tools/ page offers no Download of it (download=\"{slug}.html\")")
            asserts += 1
            if offered - set(slugs):
                problems.append(f"the /tools/ page lists tool(s) with no pinned copy: {sorted(offered - set(slugs))}")
    return problems, slugs, asserts, built


def offline(slugs):
    from playwright.sync_api import sync_playwright
    problems, asserts = [], 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for slug in slugs:
            for w, h in ((1280, 900), (390, 844)):
                ctx = browser.new_context(viewport={"width": w, "height": h})
                page = ctx.new_page()
                errors, net = [], []
                page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
                page.on("pageerror", lambda e: errors.append(str(e)))
                page.route("**/*", lambda r: r.continue_() if r.request.url.startswith(("file:", "data:", "blob:"))
                           else (net.append(r.request.url), r.abort()))
                page.goto((SRC / slug / "index.html").as_uri())
                page.wait_for_timeout(1200)
                title = page.title()
                asserts += 3
                if errors:
                    problems.append(f"{slug} @{w} file://: {len(errors)} console error(s): {errors[:3]}")
                if net:
                    problems.append(f"{slug} @{w} file://: attempted network: {net[:3]} — a download must work offline")
                if not title or page.evaluate("document.body.innerText.trim().length") < 20:
                    problems.append(f"{slug} @{w} file://: rendered nothing readable")
                print(f"  offline {slug} @{w}: title {title!r}, {len(errors)} console error(s), {len(net)} request(s)")
                ctx.close()
        browser.close()
    return problems, asserts


if __name__ == "__main__":
    probs, slugs, n, built = check()
    if "--offline" in sys.argv[1:]:
        p2, n2 = offline(slugs)
        probs, n = probs + p2, n + n2
    for p in probs:
        print("PROBLEM: " + p)
    if probs:
        sys.exit(1)
    print(f"tools: {len(slugs)} pinned ({', '.join(slugs)}), {n} assertion(s), each copy's sha256 its PIN's"
          + ("; byte-identical in the built site, offered on /tools/" if built else "; public/ not built — pins only"))
