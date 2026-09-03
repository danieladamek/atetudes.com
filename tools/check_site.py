#!/usr/bin/env python3
"""Static integrity checks for atetudes.com (Site Charter, Verification #4).

Walks every .html file in the BUILT site (public/ — run `hugo` first),
parses it, and verifies that every internal link and asset reference
resolves to a real file. Also checks the Pages plumbing (CNAME, .nojekyll).
Stdlib only. Exit code 0 = clean.

    hugo && python3 tools/check_site.py
"""

import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote

ROOT = Path(__file__).resolve().parent.parent / "public"
SKIP_DIRS = ()


class LinkCollector(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in ("href", "src") and value:
                self.links.append(value)


def site_pages():
    for path in sorted(ROOT.rglob("*.html")):
        rel = path.relative_to(ROOT)
        if any(str(rel).startswith(d) for d in SKIP_DIRS):
            continue
        yield path, rel


def resolve(link, page_dir):
    """Map an internal link to the file Pages would serve, or None if external."""
    parsed = urlparse(link)
    if parsed.scheme or link.startswith("//"):
        return None  # external
    path = unquote(parsed.path)
    if not path:
        return None  # pure fragment
    target = ROOT / path.lstrip("/") if path.startswith("/") else page_dir / path
    target = target.resolve()
    if path.endswith("/") or target.is_dir():
        target = target / "index.html"
    return target


def main():
    problems = []
    if not ROOT.is_dir():
        print("public/ not found — run `hugo` first")
        sys.exit(1)

    for plumbing in ("CNAME", ".nojekyll"):
        if not (ROOT / plumbing).exists():
            problems.append(f"missing {plumbing}")
    cname = ROOT / "CNAME"
    if cname.exists() and cname.read_text().strip() != "atetudes.com":
        problems.append("CNAME does not read 'atetudes.com'")

    pages = 0
    for path, rel in site_pages():
        pages += 1
        parser = LinkCollector()
        try:
            parser.feed(path.read_text(encoding="utf-8"))
        except Exception as exc:
            problems.append(f"{rel}: failed to parse as HTML ({exc})")
            continue
        for link in parser.links:
            target = resolve(link, path.parent)
            if target is not None and not target.exists():
                problems.append(f"{rel}: broken internal link -> {link}")

    print(f"checked {pages} page(s)")
    # THE DEPLOY RECORDS ARE VERIFIED AGAINST GITHUB (260921, night 27 item 3): every
    # SITELOG deploy record above the mechanism marker must carry the `record:` line
    # tools/deploy_record.py wrote from the fetched run, and its run id, conclusion
    # and commit are re-fetched here. A missing gh fails loudly; nothing is skipped.
    import subprocess
    v = subprocess.run([sys.executable, str(Path(__file__).resolve().parent / "deploy_record.py"), "verify"],
                       capture_output=True, text=True)
    print(v.stdout.strip())
    if v.returncode != 0:
        problems.append("deploy records: " + (v.stderr.strip() or v.stdout.strip() or "verify failed")[:300])
    if problems:
        for p in problems:
            print(f"PROBLEM: {p}")
        sys.exit(1)
    print("all internal links resolve; CNAME and .nojekyll present")


if __name__ == "__main__":
    main()
