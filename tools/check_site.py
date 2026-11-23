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
        self.downloads = []  # (href, download) of every <a download>
        self.title, self._in_title = None, False

    def handle_starttag(self, tag, attrs):
        if tag == "title" and self.title is None:
            self._in_title, self.title = True, ""
        if tag == "a" and any(n == "download" for n, _ in attrs):
            d = dict(attrs)
            self.downloads.append((d.get("href"), d.get("download")))
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


def check_downloads():
    """EVERY STUDY GETS A DOWNLOAD LINK (item, 261012): its study page, its landing card and its /studies/ row each link
    to its own study.html with download="<slug>.html". The studies are COMPUTED from static/studies/ (rule 6)."""
    problems, found = [], 0
    slugs = sorted(f.parent.name for f in (ROOT.parent / "static" / "studies").glob("*/study.html"))
    if not slugs:
        return ["downloads: no study found in static/studies/ — the check would pass on nothing"], 0
    pages = {}
    for rel in ["index.html", "studies/index.html"] + [f"studies/{s}/index.html" for s in slugs]:
        parser = LinkCollector()
        if (ROOT / rel).exists():
            parser.feed((ROOT / rel).read_text(encoding="utf-8"))
        pages[rel] = set(parser.downloads)
    for slug in slugs:
        want = (f"/studies/{slug}/study.html", f"{slug}.html")
        for rel in ("index.html", "studies/index.html", f"studies/{slug}/index.html"):
            if want in pages[rel]:
                found += 1
            else:
                problems.append(f"{rel}: no Download link for {slug} (want <a href=\"{want[0]}\" download=\"{want[1]}\">)")
    return problems, found


class EmbedCollector(HTMLParser):
    """every player iframe (src under /embed/) and the fallback link after it, in page order"""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.players = []   # [{src, style, link}]

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "iframe" and (d.get("src") or "").startswith("/embed/"):
            self.players.append({"src": d["src"], "style": d.get("style") or "", "link": None})
        elif tag == "a" and self.players and self.players[-1]["link"] is None and (d.get("href") or "").startswith("/studies/"):
            self.players[-1]["link"] = d["href"]


def check_etude_embeds(root=ROOT, content=(ROOT.parent / "content",)):
    """AN ETUDE FENCE NEVER SHIPS AS A BROKEN PLAYER (261120 — child 5 of the étude embed epic). Read on the ARTIFACT:
    every player iframe in the built pages (layouts/_markup/render-codeblock-etude.html writes them from `etude`
    fences) is asked the player's OWN question — hub/modules/etude-player.mjs playable(hash, app), the function that
    decides what /embed/<app>/ plays — so a bad or custom block fails here, by page and by name, exactly as the player
    would refuse it; nothing here restates a rule. Also: the fallback link carries the same étude; the iframe's height is
    the app door's measured embed.height. The fences in the content sources are counted, and every one must have
    become a player — a check that found no iframe because the hook stopped running would otherwise pass on nothing."""
    import json, re, subprocess
    problems, found = [], []
    for path in sorted(root.rglob("*.html")):
        rel = path.relative_to(root)
        if str(rel).startswith(("embed/", "studies/")) and path.name != "index.html":
            continue   # the published apps themselves, never content
        c = EmbedCollector()
        c.feed(path.read_text(encoding="utf-8"))
        for i, pl in enumerate(c.players, 1):
            found.append({"page": str(rel), "n": i, "of": len(c.players), **pl})
    fences = sum(len(re.findall(r"^```etude[ \t]*$", f.read_text(encoding="utf-8"), re.M))
                 for d in content for f in Path(d).rglob("*.md"))
    pages_with = {f["page"] for f in found}
    if len(found) < fences:
        problems.append(f"etude fences: {fences} in the content, but {len(found)} player(s) in the built pages — the render hook did not run on every fence")
    js = """import { playable } from './hub/modules/etude-player.mjs';
      import { existsSync } from 'node:fs';
      const out = [];
      for (const p of JSON.parse(process.argv[1])) {
        const m = p.src.match(/^\\/embed\\/([a-z0-9-]+)\\/(#[\\s\\S]*)?$/);
        const name = `${p.page}, player ${p.n} of ${p.of}`;
        if (!m) { out.push(`${name}: not a player address: ${p.src.slice(0, 60)}`); continue; }
        const [, app, hash = ''] = m;
        const got = playable(hash, app);
        if (got.reason) out.push(`${name}: ${got.reason}`);
        if (p.link !== `/studies/${app}/study.html${hash}`) out.push(`${name}: its fallback link does not carry the same étude`);
        const door = `./hub/doors/${app}.door.mjs`;
        if (!existsSync(door)) { out.push(`${name}: no door ${app} to measure its height against`); continue; }
        const h = (await import(door)).default.embed?.height;
        if (!p.style.includes(`height:${h}px`)) out.push(`${name}: its height is not the ${app} door's measured embed.height (${h}px)`);
      }
      process.stdout.write(JSON.stringify(out));"""
    # THE FRAME FITS ITS ÉTUDE (261123): every page with a player carries the fence's one script, listening for the
    # message the player sends — its name read from the module that names it (hub/embed-fit.mjs HEIGHT_MSG)
    msg = re.search(r'export const HEIGHT_MSG = "([^"]+)";', (ROOT.parent / "hub" / "embed-fit.mjs").read_text(encoding="utf-8"))
    for page in sorted(pages_with):
        n = (root / page).read_text(encoding="utf-8").count(f'"{msg.group(1)}"') if msg else -1
        if n != 1:
            problems.append(f"etude fence: {page} carries {n} frame-fitting script(s) listening for the player's height — one per page")
    if found:
        r = subprocess.run(["node", "--input-type=module", "-e", js, json.dumps(found)], cwd=ROOT.parent, capture_output=True, text=True)
        if r.returncode:
            problems.append("etude fences: the player's reader did not run — " + r.stderr.strip()[:300])
        else:
            problems += [f"etude fence: {x}" for x in json.loads(r.stdout)]
    return problems, len(found), fences, len(pages_with)


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
    dl_problems, dl_found = check_downloads()
    problems += dl_problems
    print(f"downloads: {dl_found} study Download link(s) found (study page, landing card, /studies/ row per study)")
    em_problems, em_found, em_fences, em_pages = check_etude_embeds()
    problems += em_problems
    print(f"etude fences: {em_fences} in the content; {em_found} player(s) on {em_pages} built page(s), each read by the player's own playable()")
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
