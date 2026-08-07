#!/usr/bin/env python3
"""Build the atetudes.com blog: blog/src/*.md -> blog/<slug>.html + blog/index.html.

House manner: one readable script, Python stdlib only, no external deps.
Posts are named YYYY-MM-DD-slug.md and start with a small YAML header:

    ---
    title: Post Title
    date: 2026-08-06
    summary: One-line summary shown on the index.
    ---

Everything after the header is Markdown (the subset below). Built HTML is
committed; GitHub Pages serves it as-is. Run from anywhere:

    python3 tools/build_blog.py
"""

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "blog" / "src"
OUT = ROOT / "blog"

PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — At-Etudes</title>
<meta name="description" content="{summary}">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<div class="wrap">
<header class="site">
  <h1>{heading}</h1>
  <p class="tagline">At-Etudes — notes on the system</p>
</header>
<nav class="site"><a href="/">Home</a> · <a href="/blog/">Blog</a></nav>
<main class="prose">
{body}
</main>
<footer class="site">
  <p>© At-Etudes · <a href="/">atetudes.com</a></p>
</footer>
</div>
</body>
</html>
"""


def parse_header(text):
    """Split the YAML-ish front matter from the Markdown body."""
    m = re.match(r"\A---\s*\n(.*?)\n---\s*\n", text, re.S)
    if not m:
        raise ValueError("post is missing its --- header block")
    meta = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            key, _, val = line.partition(":")
            meta[key.strip()] = val.strip().strip("\"'")
    for key in ("title", "date", "summary"):
        if key not in meta:
            raise ValueError(f"post header is missing '{key}'")
    return meta, text[m.end():]


def inline(text):
    """Escape, then apply inline Markdown: code, bold, italic, links."""
    text = html.escape(text, quote=False)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r'<a href="\2">\1</a>', text)
    return text


def markdown(body):
    """A deliberately small Markdown subset: headings, lists, quotes,
    fenced code, paragraphs. Enough for blog posts; nothing exotic."""
    out = []
    lines = body.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith("```"):
            block = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                block.append(lines[i])
                i += 1
            i += 1  # closing fence
            out.append("<pre><code>%s</code></pre>" % html.escape("\n".join(block)))
            continue
        m = re.match(r"(#{1,3}) (.*)", line)
        if m:
            level = len(m.group(1)) + 1  # page h1 is the post title
            out.append(f"<h{level}>{inline(m.group(2))}</h{level}>")
            i += 1
            continue
        if line.startswith(">"):
            block = []
            while i < len(lines) and lines[i].startswith(">"):
                block.append(lines[i].lstrip("> "))
                i += 1
            out.append("<blockquote><p>%s</p></blockquote>" % inline(" ".join(block)))
            continue
        for tag, marker in (("ul", r"[-*] "), ("ol", r"\d+\. ")):
            if re.match(marker, line):
                items = []
                while i < len(lines) and re.match(marker, lines[i]):
                    item = [re.sub(marker, "", lines[i], count=1)]
                    i += 1
                    # wrapped item text continues on indented lines
                    while i < len(lines) and re.match(r"\s+\S", lines[i]):
                        item.append(lines[i].strip())
                        i += 1
                    items.append("<li>%s</li>" % inline(" ".join(item)))
                out.append("<%s>\n%s\n</%s>" % (tag, "\n".join(items), tag))
                break
        else:
            para = []
            while i < len(lines) and lines[i].strip() and not re.match(r"(#{1,3} |> |[-*] |\d+\. |```)", lines[i]):
                para.append(lines[i].strip())
                i += 1
            out.append("<p>%s</p>" % inline(" ".join(para)))
        continue
    return "\n".join(out)


def build():
    posts = []
    for path in sorted(SRC.glob("*.md")):
        meta, body = parse_header(path.read_text(encoding="utf-8"))
        slug = re.sub(r"^\d{4}-\d{2}-\d{2}-", "", path.stem)
        page = PAGE.format(
            title=html.escape(meta["title"]),
            heading=html.escape(meta["title"]),
            summary=html.escape(meta["summary"]),
            body=f'<p class="postmeta">{meta["date"]}</p>\n' + markdown(body),
        )
        (OUT / f"{slug}.html").write_text(page, encoding="utf-8")
        posts.append((meta["date"], slug, meta["title"], meta["summary"]))
        print(f"built blog/{slug}.html")

    posts.sort(reverse=True)  # newest first
    cards = "\n".join(
        f'''<div class="card postlist">
  <h2><a href="/blog/{slug}.html">{html.escape(title)}</a></h2>
  <p class="date">{date}</p>
  <p>{html.escape(summary)}</p>
</div>'''
        for date, slug, title, summary in posts
    )
    index = PAGE.format(
        title="Blog",
        heading="Blog",
        summary="Notes on the At-Etudes system: how the studies are built, what changed, and what's next.",
        body=cards,
    )
    (OUT / "index.html").write_text(index, encoding="utf-8")
    print(f"built blog/index.html ({len(posts)} post(s))")


if __name__ == "__main__":
    build()
