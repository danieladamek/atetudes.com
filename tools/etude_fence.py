"""etude_fence.py — an `etude` fence on a content page renders the player (261120; child 5 of the étude embed epic).

The item's Done when (*Blog - an etude fence on a content page renders the player*), on a TEST POST that never ships:
it is mounted into a throwaway Hugo build (an extra config adds one content mount) written to a temp directory, so the
real site and its content are untouched.

  1. a post with two fences and one deliberately custom fence: the build check (tools/check_site.py
     check_etude_embeds — the player's own playable() on every built iframe) fails, naming the custom one
  2. with it removed, the check passes, and the post renders two players that play, and stop each other —
     in a real browser at 1280 and 390, no console errors (screenshots with --shots DIR)
  3. a fence with no app: line fails the Hugo build itself, at the fence's position
  4. the fences are Copy note block's own output (engine/etude-block.mjs etudeBlock), never hand-typed

Prints its assertion count; exits 1 on any failure.
"""
import json, socket, subprocess, sys, tempfile, threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "tools"))
from check_site import check_etude_embeds   # noqa: E402

BROWSER = "--no-browser" not in sys.argv   # the publish job (no browser) runs 1, 3, 4 and the clean check; CI's app gate and tools/check.py run all
MINIFY = ["--minify"] if "--minify" in sys.argv else []   # the deploy builds minified: the check must read that too
SHOTS = Path(sys.argv[sys.argv.index("--shots") + 1]) if "--shots" in sys.argv else None
SLUG = "etude-fence-test"
fails, n = [], 0

def check(ok, msg):
    global n
    n += 1
    if not ok: fails.append(msg)

def fences():
    js = """import { etudeBlock, ETUDE_V } from './engine/etude-block.mjs'; import { readFileSync } from 'node:fs';
      const c = JSON.parse(readFileSync('hub/tests/fixtures/etude-corpus.json', 'utf8')); const by = (n) => c.find((x) => x.name === n).saved;
      const env = { app: 'multetudes', v: ETUDE_V };
      const { default: door } = await import('./hub/doors/multetudes.door.mjs');
      process.stdout.write(JSON.stringify({ a: etudeBlock(by('an arpeggio'), env), b: etudeBlock(by('a cycle (6ths)'), env),
        custom: etudeBlock(by('a custom progression'), env), height: door.embed.height }));"""
    return json.loads(subprocess.run(["node", "--input-type=module", "-e", js], cwd=REPO, capture_output=True, text=True, check=True).stdout)

def build(tmp, body):
    post, out = tmp / "post", tmp / "out"
    post.mkdir(exist_ok=True)
    (post / "index.md").write_text(f"---\ntitle: Two études\ndate: 2026-11-20\n---\n\n{body}\n")
    mounts = "\n".join(f"    - {{ source: {s}, target: {t} }}" for s, t in
                       [("content", "content"), (str(post), f"content/blog/{SLUG}"), ("static", "static"), ("layouts", "layouts"),
                        ("assets", "assets"), ("i18n", "i18n"), ("archetypes", "archetypes"), ("data", "data")])
    (tmp / "mount.yaml").write_text(f"module:\n  mounts:\n{mounts}\n")
    r = subprocess.run(["hugo", *MINIFY, "--config", f"hugo.yaml,{tmp / 'mount.yaml'}", "-d", str(out)], cwd=REPO, capture_output=True, text=True)
    return r, out, post

def serve(root):
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
    httpd = ThreadingHTTPServer(("127.0.0.1", port), partial(type("Q", (SimpleHTTPRequestHandler,), {"log_message": lambda *a: None}), directory=str(root)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, port

def main():
    F = fences(); H = F.pop("height")   # the door's measured embed height — never a number typed here
    check(all(F[k].startswith("```etude\n") for k in F), "4. the fences are the note block's own (```etude)")
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        # ---- 1. two good fences and a custom one: the check fails, naming the custom one ----
        r, out, post = build(tmp, f"The first.\n\n{F['a']}\n\nThe second.\n\n{F['b']}\n\nA custom one.\n\n{F['custom']}\n\nAfter.")
        check(r.returncode == 0, f"1. hugo renders the post: {r.stderr[:200]}")
        probs, found, nf, _ = check_etude_embeds(out, (REPO / "content", post))
        check(found == 3 and nf >= 3, f"1. the check read every player: {found} of {nf} fences")
        check(len(probs) == 1 and f"blog/{SLUG}/index.html, player 3 of 3" in probs[0] and "typed changes never travel in a link (charter §6)" in probs[0],
              f"1. the check fails on the custom fence alone, by page, place and reason: {probs}")
        # ---- 3. a fence with no app: line fails the build itself ----
        r3, _, _ = build(tmp, "```etude\nv: 2\nkey: C\n```")
        check(r3.returncode != 0 and "carries no app: line" in r3.stdout + r3.stderr and "index.md:" in r3.stdout + r3.stderr,
              f"3. a fence naming no app fails hugo at its position: {(r3.stdout + r3.stderr).strip()[-200:]}")
        # ---- 2. with the custom one removed: clean, and two players that stop each other ----
        r, out, post = build(tmp, f"The first.\n\n{F['a']}\n\nThe second.\n\n{F['b']}\n\nAfter.")
        probs, found, nf, pages = check_etude_embeds(out, (REPO / "content", post))
        check(r.returncode == 0 and probs == [] and found == 2 and pages == 1, f"2. the clean post passes the check: {probs}, {found} players on {pages} page(s)")
        if not BROWSER:
            print("(--no-browser: the two players were not played)")
        hs, port = serve(out)
        if BROWSER:
          from playwright.sync_api import sync_playwright
          with sync_playwright() as p:
              b = p.chromium.launch()
              for w in (1280, 390):
                  pg = b.new_page(viewport={"width": w, "height": 900}); errs = []
                  pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
                  pg.goto(f"http://127.0.0.1:{port}/blog/{SLUG}/"); pg.wait_for_timeout(1500)
                  fr = [f for f in pg.frames if "/embed/multetudes/" in f.url]
                  check(len(fr) == 2, f"2. @{w}: the post carries two players ({len(fr)})")
                  if len(fr) != 2: pg.close(); continue
                  for f in fr:
                      f.evaluate("() => { window.__r = false; document.addEventListener('atetudes:clock-state', e => { if (e.detail && typeof e.detail.running === 'boolean') window.__r = e.detail.running; }); }")
                  shown = [f.is_visible("#fieldSvg") for f in fr]
                  check(all(shown), f"2. @{w}: both necks shown — {shown}; a refusal reads {[f.inner_text('#plMsg') for f in fr]}")
                  if not all(shown): pg.close(); continue
                  run = lambda: [f.evaluate("() => window.__r") for f in fr]
                  for el in pg.query_selector_all("iframe"): el.scroll_into_view_if_needed()
                  pg.evaluate("window.scrollTo(0, 0)")
                  fr[0].click('#fdMini [data-role="play"]'); pg.wait_for_timeout(600); s1 = run()
                  fr[1].click('#fdMini [data-role="play"]'); pg.wait_for_timeout(600); s2 = run()
                  check(s1 == [True, False] and s2 == [False, True], f"2. @{w}: starting one stops the other: {s1} → {s2}")
                  fr[1].click('#fdMini [data-role="stop"]')
                  h = [f.evaluate("document.documentElement.scrollHeight") for f in fr]
                  check(all(x <= H for x in h), f"2. @{w}: each player fits its iframe: {h} of {H}")
                  links = pg.eval_on_selector_all(".etude-embed a", "as => as.map(a => a.textContent)")
                  check(links == ["Play this étude on At-Etudes"] * 2, f"2. @{w}: a fallback link under each: {links}")
                  check(not errs, f"2. @{w}: no console errors: {errs[:3]}")
                  if SHOTS:
                      pg.evaluate("window.scrollTo(0, 0)"); pg.wait_for_timeout(300)
                      pg.screenshot(path=str(SHOTS / f"post-{w}.png"), full_page=True)
                  pg.close()
              b.close()
        hs.shutdown()
    print(f"etude fence — {n} assertions, {len(fails)} failed")
    for f in fails: print("FAIL", f)
    return 1 if fails else 0

if __name__ == "__main__":
    sys.exit(main())
