#!/usr/bin/env python3
"""Static integrity checks for atetudes.com (Site Charter, Verification #4) — THE SITE half (night 82).

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
        self.title, self._in_title = None, False

    def handle_starttag(self, tag, attrs):
        if tag == "title" and self.title is None:
            self._in_title, self.title = True, ""
        for name, value in attrs:
            if name in ("href", "src") and value:
                self.links.append(value)

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data


def site_title():
    """the site's own title, read from hugo.yaml — never restated here"""
    for line in (ROOT.parent / "hugo.yaml").read_text().splitlines():
        if line.startswith("title:"):
            return line.split(":", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("hugo.yaml states no title")


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

    pages, site, titled = 0, site_title(), 0
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
        # THE TAB SAYS THE SITE'S NAME ONCE (night 84, item 1): Hextra composes "<page> – <site>", so a page whose OWN
        # title is the site's ("At-Etudes", the section index since b236e6c) read "At-Etudes – At-Etudes". A title that
        # merely contains the name ("Welcome to At-Etudes – At-Etudes") is a title, not the defect.
        if parser.title is not None:
            titled += 1
            parts = [x.strip() for x in parser.title.split(" – ")]
            if len(parts) >= 2 and parts[0] == site:
                problems.append(f"{rel}: the tab names the site twice — <title>{parser.title.strip()}</title>")

    print(f"checked {pages} page(s); {titled} <title>(s) read against the site's own title {site!r}")
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
    # (night 82, split by SUBJECT — rule 16) the generator pin moved to the APP gate, where its subject lives:
    # `python3 tools/generator_identity.py` (it runs the generators). The studies' presence and byte-identity in the
    # built site is tools/check_studies.py, which runs on every publish. This file is the SITE: links and plumbing.
    if problems:
        for p in problems:
            print(f"PROBLEM: {p}")
        sys.exit(1)
    print("all internal links resolve; CNAME and .nojekyll present")


if __name__ == "__main__":
    main()
