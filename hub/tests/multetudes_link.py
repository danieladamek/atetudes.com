"""multetudes_link.py — Multetudes opens an étude from a link, and copies embed code (261120; child 4 of the étude embed epic).

The item's Done when (*Multetudes - open an étude from a link, and copy embed code*), each in a real browser:

  1. Open in Multetudes from the player restores the bench EXACTLY — round trip on every linkable corpus étude: the
     player's own Open link, followed, gives a bench whose Copy note block is the étude's block, byte for byte
  2. the fragment is read once and cleared, and never written to browser storage (charter §8)
  3. the copied iframe, pasted into a plain HTML page on another site, plays — and fits its declared height, no inner
     scrollbar, at 1280 and 390
  4. the fallback link opens the same bench
  5. a custom étude shows the control disabled, with linkable()'s reason; a custom link is refused by name and the bench
     opens as usual

Prints its assertion count; exits 1 on any failure. Two throwaway local servers stand in for atetudes.com and a
stranger's blog (127.0.0.1 and localhost are different sites to the browser). `--shots DIR` saves screenshots.
"""
import json, socket, subprocess, sys, tempfile, threading, time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote
from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parent.parent.parent
BUILD = REPO / "hub" / "build"
SHOTS = Path(sys.argv[sys.argv.index("--shots") + 1]) if "--shots" in sys.argv else None
fails, n = [], 0

def check(ok, msg):
    global n
    n += 1
    if not ok: fails.append(msg)

def corpus():
    """every corpus étude as its link and its block, written by the engine's own writers; the door's embed declaration"""
    js = """import { toFragment, linkable } from './engine/etude-link.mjs'; import { etudeBlock, etudeBlockBody, ETUDE_V } from './engine/etude-block.mjs';
      import { readFileSync } from 'node:fs'; import door from './hub/doors/multetudes.door.mjs';
      const env = { app: 'multetudes', v: ETUDE_V };
      const c = JSON.parse(readFileSync('hub/tests/fixtures/etude-corpus.json', 'utf8'));
      process.stdout.write(JSON.stringify({ embed: door.embed, etudes: c.map(({ name, saved }) => ({ name,
        block: etudeBlock(saved, env), linkable: linkable(saved) === true,
        link: linkable(saved) === true ? toFragment(saved, env) : '#etude=' + encodeURIComponent(etudeBlockBody(saved, env)) })) }));"""
    return json.loads(subprocess.run(["node", "--input-type=module", "-e", js], cwd=REPO, capture_output=True, text=True, check=True).stdout)

def serve(root, host):
    s = socket.socket(); s.bind((host, 0)); port = s.getsockname()[1]; s.close()
    httpd = ThreadingHTTPServer((host, port), partial(type("Q", (SimpleHTTPRequestHandler,), {"log_message": lambda *a: None}), directory=str(root)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, port

def clip(pg):
    return pg.evaluate("() => navigator.clipboard.readText()")

def bench_block(pg):
    """what the bench holds, as its own Copy note block writes it"""
    pg.bring_to_front(); pg.focus("#psCopyBlock")   # the clipboard serves a focused document only
    pg.evaluate("() => navigator.clipboard.writeText('')")
    pg.click("#psCopyBlock"); pg.wait_for_timeout(100)
    return clip(pg)

def main():
    C = corpus(); E = C["embed"]
    good = [e for e in C["etudes"] if e["linkable"]]; bad = [e for e in C["etudes"] if not e["linkable"]]
    check(len(good) >= 10 and len(bad) >= 1, f"the corpus runs both ways ({len(good)} linkable, {len(bad)} not)")
    with tempfile.TemporaryDirectory() as tmp:
        site, blog = Path(tmp) / "site", Path(tmp) / "blog"
        (site / "embed" / "multetudes").mkdir(parents=True); (site / "studies" / "multetudes").mkdir(parents=True); blog.mkdir()
        (site / "embed" / "multetudes" / "index.html").write_bytes((BUILD / "player.html").read_bytes())
        (site / "studies" / "multetudes" / "study.html").write_bytes((BUILD / "multetudes.html").read_bytes())
        hs, ps = serve(site, "127.0.0.1"); hb, pb = serve(blog, "127.0.0.1")
        here = f"http://127.0.0.1:{ps}"
        local = lambda u: u.replace("https://atetudes.com", here)
        with sync_playwright() as p:
            b = p.chromium.launch()
            ctx = b.new_context(viewport={"width": 1280, "height": 900}, permissions=["clipboard-read", "clipboard-write"])
            errs = []
            ctx.on("page", lambda pg: pg.on("pageerror", lambda e: errs.append(str(e))))
            # ---- 1 + 2. the player's Open link, followed, restores the bench exactly; the fragment is cleared and never stored ----
            for e in good:
                pl = ctx.new_page(); pl.goto(f"{here}/embed/multetudes/{e['link']}"); pl.wait_for_timeout(300)
                href = pl.get_attribute("#plOpen", "href"); pl.close()
                pg = ctx.new_page(); pg.goto(local(href)); pg.wait_for_timeout(500)
                msg = pg.inner_text("#psBlockMsg")
                check(msg.startswith("restored ") and "from the link" in msg and "skipped" not in msg, f"1. {e['name']}: the link went home whole — {msg!r}")
                got = bench_block(pg)
                check(got == e["block"], f"1. {e['name']}: the bench's note block is the étude's, byte for byte"
                      + ("" if got == e["block"] else f"\n   want {e['block']!r}\n   got  {got!r}"))
                check(pg.evaluate("location.hash") == "", f"2. {e['name']}: the fragment is cleared after reading")
                stored = pg.evaluate("() => Object.keys(localStorage).map(k => k + '=' + localStorage.getItem(k)).join('\\n')")
                body = unquote(e["link"].split("#etude=")[1])
                check("etude=" not in stored and body not in stored and "app: multetudes\nv:" not in stored,
                      f"2. {e['name']}: nothing of the link is in browser storage")
                pg.close()
            # a reload after an edit opens the edit, not the link again
            e0 = good[0]
            pg = ctx.new_page(); pg.goto(f"{here}/studies/multetudes/study.html{e0['link']}"); pg.wait_for_timeout(500)
            pg.fill("#fdBpm", "97"); pg.dispatch_event("#fdBpm", "change"); pg.wait_for_timeout(100)
            pg.reload(); pg.wait_for_timeout(500)
            check(pg.evaluate("location.href").endswith("/study.html"), f"2. a reload carries no link: {pg.evaluate('location.href')}")
            check("from the link" not in pg.inner_text("#psBlockMsg"), "2. a reload does not re-open the link")
            pg.close()
            # ---- 3 + 4. Copy embed code → a stranger's page; it plays, fits, and its fallback opens the same bench ----
            for e in good[:3]:
                pg = ctx.new_page(); pg.goto(f"{here}/studies/multetudes/study.html{e['link']}"); pg.wait_for_timeout(500)
                check(pg.is_enabled("#psCopyEmbed") and pg.inner_text("#psEmbedWhy") == "", f"3. {e['name']}: Copy embed code is offered")
                pg.evaluate("() => navigator.clipboard.writeText('')"); pg.click("#psCopyEmbed"); pg.wait_for_timeout(100)
                code = clip(pg)
                check(code.startswith(f'<iframe src="{E["player"]}#etude=') and 'loading="lazy"' in code and "border:0" in code
                      and 'title="' in code and "width:100%" in code and f"height:{E['height']}px" in code,
                      f"3. {e['name']}: the code is an iframe of the player — lazy, borderless, titled, full width: {code[:120]!r}")
                check(f'<p><a href="{E["open"]}#etude=' in code and "Play this étude on At-Etudes</a></p>" in code,
                      f"3. {e['name']}: a plain link beneath it")
                frag = code.split('#etude=')[1].split('"')[0]
                check(unquote(frag) == unquote(e["link"].split("#etude=")[1]), f"3. {e['name']}: the code carries this étude, block for block")
                check(pg.inner_text("#psBlockMsg").startswith("copied: embed code"), f"3. {e['name']}: the card says what it copied")
                pg.close()
                (blog / "index.html").write_text(f"<!doctype html><meta charset=utf-8><title>a post</title><body style='max-width:680px;margin:2em auto'>"
                                                 f"<p>Before.</p>\n{local(code)}<p>After.</p></body>")
                for w in (1280, 390):
                    bp = ctx.new_page(); bp.set_viewport_size({"width": w, "height": 900})
                    bp.goto(f"http://localhost:{pb}/"); bp.wait_for_timeout(900)
                    fr = next((f for f in bp.frames if "/embed/multetudes/" in f.url), None)
                    check(fr is not None, f"3. @{w} {e['name']}: the pasted iframe loads the player")
                    if fr is None: bp.close(); continue
                    h = fr.evaluate("document.documentElement.scrollHeight")
                    check(h <= E["height"], f"3. @{w} {e['name']}: the player fits its iframe — {h} px of {E['height']}")
                    r0 = fr.inner_text("#fdMode").split("—")[0].strip()
                    fr.evaluate("() => { window.__r = false; document.addEventListener('atetudes:clock-state', e => { if (e.detail && typeof e.detail.running === 'boolean') window.__r = e.detail.running; }); }")
                    fr.click('#fdMini [data-role="play"]'); bp.wait_for_timeout(2300)
                    r1 = fr.inner_text("#fdMode").split("—")[0].strip()
                    check(fr.evaluate("() => window.__r") is True and r1 != r0, f"3. @{w} {e['name']}: it plays — {r0} → {r1}")
                    fr.click('#fdMini [data-role="stop"]')
                    if SHOTS and e is good[0]: bp.screenshot(path=str(SHOTS / f"pasted-embed-{w}.png"), full_page=True)
                    if w == 390:
                        bp.click("text=Play this étude on At-Etudes"); bp.wait_for_timeout(700)
                        msg = bp.inner_text("#psBlockMsg")
                        check(bp.url.startswith(f"{here}/studies/multetudes/study.html") and "from the link" in msg,
                              f"4. {e['name']}: the fallback link opens the bench — {bp.url[:60]} {msg!r}")
                        check(bench_block(bp) == e["block"], f"4. {e['name']}: the same étude")
                    bp.close()
            # ---- 5. custom: the control disabled with linkable's reason; a custom link refused, the bench as usual ----
            for w in (1280, 390):
                pg = ctx.new_page(); pg.set_viewport_size({"width": w, "height": 900})
                pg.goto(f"{here}/studies/multetudes/study.html"); pg.wait_for_timeout(500)
                fresh = bench_block(pg)
                check(pg.is_enabled("#psCopyEmbed"), f"5. @{w}: a fresh bench may be embedded")
                for e in bad:
                    pg.evaluate("""(t) => { const dt = new DataTransfer(); dt.setData('text/plain', t);
                      document.getElementById('psPasteBlock').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }""", e["block"])
                    pg.wait_for_timeout(200)
                    why = pg.inner_text("#psEmbedWhy")
                    check(not pg.is_enabled("#psCopyEmbed") and "typed changes never travel in a link (charter §6)" in why,
                          f"5. @{w} {e['name']}: Copy embed code disabled, linkable's reason shown — {why!r}")
                    check(pg.is_visible("#psEmbedWhy"), f"5. @{w} {e['name']}: the reason is visible")
                    if SHOTS:
                        pg.locator("#psCopyEmbed").scroll_into_view_if_needed(); pg.screenshot(path=str(SHOTS / f"custom-disabled-{w}.png"))
                pg.close()
                for e in bad:
                    pg = ctx.new_page(); pg.set_viewport_size({"width": w, "height": 900})
                    pg.goto(f"{here}/studies/multetudes/study.html{e['link']}"); pg.wait_for_timeout(500)
                    msg = pg.inner_text("#psBlockMsg")
                    check("refused" in msg and "typed changes never travel in a link (charter §6)" in msg and msg.endswith("the bench opened as usual"),
                          f"5. @{w} {e['name']}: a custom link is refused by name — {msg!r}")
                    check(bench_block(pg) == fresh and pg.evaluate("location.hash") == "", f"5. @{w} {e['name']}: the bench opened as usual, the fragment cleared")
                    pg.close()
            if SHOTS:
                pg = ctx.new_page(); pg.goto(f"{here}/studies/multetudes/study.html{good[0]['link']}"); pg.wait_for_timeout(500)
                for w in (1280, 390):
                    pg.set_viewport_size({"width": w, "height": 900}); pg.wait_for_timeout(200)
                    pg.locator("#psCopyEmbed").scroll_into_view_if_needed(); pg.screenshot(path=str(SHOTS / f"settings-{w}.png"))
                pg.close()
            check(not errs, f"no page errors: {errs[:3]}")
            ctx.close(); b.close()
        hs.shutdown(); hb.shutdown()
    print(f"multetudes link — {n} assertions, {len(fails)} failed")
    for f in fails: print("FAIL", f)
    return 1 if fails else 0

if __name__ == "__main__":
    sys.exit(main())
