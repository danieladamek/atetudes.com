#!/usr/bin/env python3
"""Ingest transform for study pages: inject the site navigation bar.

Study pages arrive from the vault as generated, self-contained HTML files
that must never be hand-edited. This script is the sanctioned, repeatable
site-side step of every ingest: it injects a slim navigation bar immediately
after <body>, wrapped in marker comments so re-running is idempotent
(any previous injection is replaced, so a fresh vault edition can simply be
dropped in place and this script re-run).

The bar is fully self-contained (inline CSS, no external assets) and links
with absolute https URLs, so a downloaded study file keeps working offline
and still links back to the site. Neutral chrome only — no degree colors.

Usage (run after placing new editions in static/studies/):

    python3 tools/ingest_study.py
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STUDIES = ROOT / "static" / "studies"

MARK_START = "<!-- atetudes-sitenav:start -->"
MARK_END = "<!-- atetudes-sitenav:end -->"

NAV = f"""{MARK_START}
<div style="background:#fff;border-bottom:1px solid #E2E2E6;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:1200px;margin:0 auto;padding:0 20px;height:52px;display:flex;align-items:center;justify-content:space-between;">
    <a href="https://atetudes.com/" style="display:flex;align-items:center;gap:9px;text-decoration:none;color:#212126;">
      <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#212126;color:#fff;font-size:14px;font-weight:700;">&AElig;</span>
      <span style="font-size:15px;font-weight:700;">At-Etudes</span>
    </a>
    <span style="display:flex;gap:22px;">
      <a href="https://atetudes.com/#studies" style="text-decoration:none;color:#73737A;font-size:14px;">Studies</a>
      <a href="https://atetudes.com/blog/" style="text-decoration:none;color:#73737A;font-size:14px;">Blog</a>
    </span>
  </div>
</div>
{MARK_END}"""


def inject(path):
    html = path.read_text(encoding="utf-8")
    stripped = re.sub(
        re.escape(MARK_START) + r".*?" + re.escape(MARK_END) + r"\n?",
        "", html, flags=re.S,
    )
    m = re.search(r"<body[^>]*>", stripped)
    if not m:
        print(f"ERROR: no <body> tag in {path}")
        return False
    out = stripped[:m.end()] + "\n" + NAV + stripped[m.end():]
    path.write_text(out, encoding="utf-8")
    print(f"{'re-' if stripped != html else ''}injected nav: {path.relative_to(ROOT)}")
    return True


def main():
    pages = sorted(STUDIES.glob("*/index.html"))
    if not pages:
        print("no study pages found under static/studies/")
        sys.exit(1)
    ok = all([inject(p) for p in pages])
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
