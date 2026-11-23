"""player_door.py — the player door, exercised in a real browser (261120; child 3 of the étude embed epic).

The door gate (door_locks.py) holds the player to every door's rules, loaded with one corpus étude. This gate holds it
to its OWN Done when (*Player door — the neck, chord symbols, transport and tempo*):

  1. it plays a corpus étude, the chord readout changing on the bar at the tempo — and at a new tempo, faster
  2. a refused link (typed changes, a version it cannot read, no link) shows the reason where the neck would be
  3. Open in Multetudes carries the same étude (the link it writes reads back to the player's)
  4. two players on a host page served from a DIFFERENT origin stop each other (BroadcastChannel, partitioned by site)
  5. §5: the embedded player makes no request beyond its own page load; the host learns nothing else
  6. the published embed is the build, byte for byte (static/embed/multetudes/index.html = hub/build/player.html)
  --- *Player - the chart line travels with the neck* (261120) ---
  7. the chart line shows under the neck: its playhead follows playback; a chip click jumps there, playing and stopped
  8. no chord name is ever cut in the readout, across or down — every chord of every linkable corpus étude, at every width below
  9. THE EMBED HEIGHT IS GATED: the player's natural height, at its TALLEST chord, for every linkable corpus étude and
     Daniel's 21-note figure, at seven widths from phone to desktop, never exceeds the Multetudes door's embed.height —
     the number Copy embed code writes. A typed figure can be any length; the failure names the étude that outgrew it.
     --- *Player - the frame fits the étude, no white space under it* (261123) ---
     9b. the height the player REPORTS to the page holding it (hub/embed-fit.mjs HEIGHT_MSG) is its tallest chord's,
     as stepped here, for every étude at every width (to the rounding pixel) — read from a host page of another site
     12. THE FENCE ON ATETUDES.COM: a content page built by Hugo with the shortest and the tallest corpus étude — each
     frame is set to what ITS player reported, ends within a few px of the player's last line at its tallest chord,
     never overflows at any chord, holds its height while playing, and the page logs no console error; at 390/740/1280
  --- *Player - the @ mark replaces the card title, and the header holds its shape* (261120) ---
 10. THE HEADER HOLDS ITS SHAPE: at each of the seven widths, through every chord of every étude in 8/9 — and Daniel's
     G harmonic minor cycle, whose F#dim7 — F# Altered ♭♭7 dropped the transport a row (his shot, 17:23) — the
     transport's top and the neck's top never move from chord to chord: the header's rows depend on the width alone
 11. the card title is the logo's @ — its typeface and colour READ FROM static/assets/logo.svg, not typed here — linking
     to atetudes.com in a new tab, named for a screen reader; and Multetudes still says "On the neck", with no @

Prints its assertion count; exits 1 on any failure. Two throwaway local servers stand in for atetudes.com and a
stranger's blog — 127.0.0.1 and localhost are different SITES to the browser, which is the point.
"""
import json, os, shutil, socket, subprocess, sys, tempfile, threading, time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parent.parent.parent
BUILD = REPO / "hub" / "build" / "player.html"
PUBLISHED = REPO / "static" / "embed" / "multetudes" / "index.html"
fails, n = [], 0

def check(ok, msg):
    global n
    n += 1
    if not ok: fails.append(msg)

def links():
    """corpus études as links, written by the engine's own writers — a §6-refused block is written by the block writer
    (the link writer refuses to), exactly as a hand-made link would be"""
    js = """import { toFragment, linkable } from './engine/etude-link.mjs'; import { etudeBlockBody, ETUDE_V } from './engine/etude-block.mjs';
      import door from './hub/doors/multetudes.door.mjs';
      import { readFileSync } from 'node:fs';
      const c = JSON.parse(readFileSync('hub/tests/fixtures/etude-corpus.json', 'utf8')); const by = (n) => c.find((x) => x.name === n).saved;
      const enc = (s, env) => '#etude=' + encodeURIComponent(etudeBlockBody(s, env));
      process.stdout.write(JSON.stringify({
        arpeggio: toFragment(by('an arpeggio'), { app: 'multetudes', v: ETUDE_V }),
        sixths: toFragment(by('a cycle (6ths)'), { app: 'multetudes', v: ETUDE_V }),
        custom: enc(by('a custom progression'), { app: 'multetudes', v: ETUDE_V }),
        newer: enc(by('an arpeggio'), { app: 'multetudes', v: ETUDE_V + 1 }),
        all: c.filter((x) => linkable(x.saved) === true).map((x) => [x.name, toFragment(x.saved, { app: 'multetudes', v: ETUDE_V })])
          .concat([["Daniel's 21-note figure (the pattern étude, its figure lengthened)",
            toFragment({ ...by('a pattern figure'), figure: '4,3,4,3,2,1,2,3,4,3,2,1,2,3,4,3,2,1,2,3,4' }, { app: 'multetudes', v: ETUDE_V })],
            ["Daniel's G harmonic minor cycle (the arpeggio in G harm: F#dim7 — F# Altered bb7)",
            toFragment({ ...by('an arpeggio'), key: 'G', scale: 'harm' }, { app: 'multetudes', v: ETUDE_V })]]),
        height: Number(process.env.EMBED_HEIGHT_OVERRIDE || door.embed.height),
        v: ETUDE_V }));"""
    return json.loads(subprocess.run(["node", "--input-type=module", "-e", js], cwd=REPO, capture_output=True, text=True, check=True).stdout)

def serve(root, host):
    s = socket.socket(); s.bind((host, 0)); port = s.getsockname()[1]; s.close()
    httpd = ThreadingHTTPServer((host, port), partial(type("Q", (SimpleHTTPRequestHandler,), {"log_message": lambda *a: None}), directory=str(root)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, port

def readout(f):
    return f.inner_text("#fdMode").split("—")[0].strip()

def main():
    check(BUILD.exists(), "no hub/build/player.html — run node hub/tools/build.mjs")
    check(PUBLISHED.exists() and PUBLISHED.read_bytes() == BUILD.read_bytes(),
          "6. static/embed/multetudes/index.html is not the build byte for byte — copy hub/build/player.html there")
    L = links()
    with tempfile.TemporaryDirectory() as tmp:
        site, blog = Path(tmp) / "site", Path(tmp) / "blog"
        (site / "embed" / "multetudes").mkdir(parents=True); blog.mkdir()
        (site / "embed" / "multetudes" / "index.html").write_bytes(BUILD.read_bytes())
        hs, ps = serve(site, "127.0.0.1")              # stands in for atetudes.com
        hb, pb = serve(blog, "127.0.0.1")              # a stranger's blog, reached as localhost — another site
        player = lambda k: f"http://127.0.0.1:{ps}/embed/multetudes/{L[k]}"
        (blog / "index.html").write_text(f"""<!doctype html><meta charset=utf-8><title>a blog</title><body>
<iframe id=one src="{player('arpeggio')}" style="width:100%;height:480px;border:0" title="one"></iframe>
<iframe id=two src="{player('sixths')}" style="width:100%;height:480px;border:0" title="two"></iframe></body>""")
        with sync_playwright() as p:
            b = p.chromium.launch()
            # ---- 1. it plays, the readout changing on the bar; and faster at a faster tempo ----
            pg = b.new_page(viewport={"width": 1280, "height": 800}); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
            pg.goto(player("arpeggio")); pg.wait_for_timeout(500)
            check(pg.is_visible("#fieldSvg") and readout(pg) == "Bbmaj7", f"1. the arpeggio opens on its first chord, the neck shown: {readout(pg)!r}")
            check(not pg.is_visible("#metroBtn") and not pg.is_visible("#fdRail") and not pg.is_visible("#fdSplit"),
                  "1. nothing that changes the étude is shown: no metronome card, no motif rail, no bar split")
            pg.click('#fdMini [data-role="play"]')
            def changes(window_ms, step=100):
                seen, t0 = [readout(pg)], time.time()
                while (time.time() - t0) * 1000 < window_ms:
                    pg.wait_for_timeout(step); r = readout(pg)
                    if r != seen[-1]: seen.append(r)
                return seen
            at120 = changes(4300)
            check(len(at120) == 3 and at120[:3] == ["Bbmaj7", "Ebmaj7", "Am7b5"],
                  f"1. at 120 a 4/4 bar is 2 s: three chords in 4.3 s, in the cycle's order — {at120}")
            pg.fill("#fdBpm", "240"); pg.dispatch_event("#fdBpm", "change")
            at240 = changes(4300)
            check(len(at240) >= 5, f"1. at 240 the bar is 1 s: at least five chords in 4.3 s — {at240}")
            pg.click('#fdMini [data-role="stop"]')
            check(not errs, f"1. no console errors while playing: {errs[:3]}")
            # ---- 7. the chart line, under the neck: the playhead follows playback; a chip jumps there, playing and stopped ----
            check(pg.is_visible("#tlScroll") and pg.evaluate("""() => { const n = document.getElementById('fieldSvg').getBoundingClientRect(),
                  t = document.getElementById('tlScroll').getBoundingClientRect(); return t.top > n.bottom; }"""),
                  "7. the chart line is shown, under the neck")
            if pg.is_visible("#tlScroll"):   # a hidden chart line fails the check above, not by a click that never lands
                cur = lambda: pg.evaluate("() => { const b = document.querySelector('#tlScroll button.tl-cur'); return b ? b.innerText.split('\\n')[0].trim() : null; }")
                check(cur() == readout(pg), f"7. stopped: the red chip is the readout's chord ({cur()} / {readout(pg)})")
                chip = lambda i: pg.locator("#tlScroll button").nth(i)   # the strip re-renders its chips on every step
                name = lambda i: chip(i).inner_text().split("\n")[0].strip()
                chip(4).click(); pg.wait_for_timeout(150)
                check(readout(pg) == cur() == name(4), f"7. stopped: a chip click jumps there — {readout(pg)}")
                pg.click('#fdMini [data-role="play"]'); pg.wait_for_timeout(2300)
                check(cur() == readout(pg) and readout(pg) != name(4),
                      f"7. playing: the playhead follows the bar — {cur()} / {readout(pg)}")
                chip(1).click(); pg.wait_for_timeout(150)
                check(readout(pg) == cur() == name(1), f"7. playing: a chip click jumps there — {readout(pg)}")
                # the jump moves the place, not the clock: the NEXT bar line plays the chip after the one clicked
                at = readout(pg); t0 = time.time()
                while readout(pg) == at and time.time() - t0 < 3: pg.wait_for_timeout(50)
                check(cur() == readout(pg) == name(2), f"7. playing on from the jump: the next chord is the next chip — {readout(pg)} / {name(2)}")
                pg.click('#fdMini [data-role="stop"]'); pg.wait_for_timeout(100)
            # ---- 3. Open in Multetudes carries the same étude ----
            href = pg.get_attribute("#plOpen", "href") or ""
            check(href.startswith("https://atetudes.com/studies/multetudes/study.html#etude=") and pg.get_attribute("#plOpen", "target") == "_blank"
                  and pg.get_attribute("#plOpen", "rel") == "noopener", f"3. Open goes to the standalone app, a new tab, noopener: {href[:70]}")
            same = pg.evaluate("""([a, b]) => decodeURIComponent(a.split('#etude=')[1]) === decodeURIComponent(b.split('#etude=')[1])""", [href, L["arpeggio"]])
            check(same, "3. Open's étude is the player's, block for block")
            check(pg.is_visible("#plOpen") and pg.evaluate("() => document.getElementById('doorFoot').contains(document.getElementById('plOpen'))"),
                  "3. the Open link sits in the page footer")
            pg.close()
            # ---- 2. refusals: the reason where the neck would be ----
            for k, words, offers_open in (("custom", "typed changes never travel in a link (charter §6)", False),
                                          ("newer", f"version {L['v'] + 1}; this player reads up to version {L['v']}", False)):
                for w in (1280, 390):
                    pg = b.new_page(viewport={"width": w, "height": 600}); errs = []
                    pg.on("pageerror", lambda e: errs.append(str(e)))
                    pg.goto(player(k)); pg.wait_for_timeout(400)
                    msg = pg.inner_text("#plMsg")
                    check(words in msg and not pg.is_visible("#fieldSvg") and not pg.is_visible('#fdMini [data-role="play"]'),
                          f"2. @{w} {k}: refused by name, nothing playable shown — {msg!r}")
                    check(pg.is_visible("#plOpen") == offers_open, f"2. @{w} {k}: Open offered = {offers_open}")
                    check(not errs, f"2. @{w} {k}: no page errors {errs[:2]}")
                    pg.close()
            pg = b.new_page(); pg.goto(f"http://127.0.0.1:{ps}/embed/multetudes/"); pg.wait_for_timeout(300)
            check("no étude in this link" in pg.inner_text("#plMsg"), "2. no link: it says so, and plays nothing (there is no default étude)")
            pg.close()
            # ---- 8 + 9. every chord whole in the readout; the tallest chord inside the embed height ----
            worst, T = {}, {}
            for w in (360, 390, 440, 500, 650, 700, 750, 900, 1280):   # 440, 750: where the old header moved Daniel's G harmonic minor (swept, 261120)
                pg = b.new_page(viewport={"width": w, "height": 100})
                for name, link in L["all"]:
                    pg.goto("about:blank"); pg.goto(f"http://127.0.0.1:{ps}/embed/multetudes/{link}"); pg.wait_for_timeout(300)
                    n_ch = pg.evaluate("document.querySelectorAll('#tlScroll button').length")
                    tallest, cut, shape, said = 0, [], {}, set()
                    for i in range(max(n_ch, 1)):
                        pg.evaluate("(i) => document.dispatchEvent(new CustomEvent('atetudes:step', { detail: { index: i, request: true } }))", i)
                        pg.wait_for_timeout(30)
                        h, c, tops, words = pg.evaluate("""() => { const t = document.querySelector('#fdMode .readtext'), top = (id) => Math.round(document.getElementById(id).getBoundingClientRect().top * 2) / 2;
                          return [document.documentElement.scrollHeight, t.scrollWidth > t.clientWidth + 0.5 || t.scrollHeight > t.clientHeight + 0.5 ? t.textContent : null,
                                  [top('fdMini'), top('fieldSvg')], t.textContent]; }""")
                        tallest = max(tallest, h)
                        if c: cut.append(c)
                        shape.setdefault(tuple(tops), []).append(words); said.add(words)
                    check(n_ch >= 3, f"8. @{w} {name}: the chart line has its chords ({n_ch})")
                    check(not cut, f"8. @{w} {name}: no chord name cut in the readout — {cut[:2]}")
                    check(tallest <= L["height"], f"9. @{w} {name}: the player at its tallest chord is {tallest} px — over the embed height {L['height']}")
                    check(len(said) >= 2, f"10. @{w} {name}: the readout changed through the run ({len(said)} readings) — else nothing was stepped")
                    check(len(shape) == 1, f"10. @{w} {name}: the transport and the neck hold still through every chord — "
                          + "; ".join(f"transport/neck top {k} at {v[0]!r}" for k, v in list(shape.items())[:3]))
                    worst[w] = max(worst.get(w, 0), tallest); T[(w, name)] = tallest
                pg.close()
            print("tallest player per width:", worst, "— embed height", L["height"])
            # ---- 9b. what the player REPORTS is that tallest height: every étude, framed on another site's page ----
            reported = 0
            for w in sorted(worst):
                (blog / "host.html").write_text("<!doctype html><meta charset=utf-8><body style='margin:0'><script>window.__h = {};"
                    "addEventListener('message', (e) => { const fs = [...document.querySelectorAll('iframe')], i = fs.findIndex((f) => f.contentWindow === e.source);"
                    " if (i >= 0 && e.data && e.data.type === 'atetudes:player-height') window.__h[i] = e.data; });</script>"
                    + "".join(f"<iframe src='http://127.0.0.1:{ps}/embed/multetudes/{link}' style='display:block;width:100%;height:1600px;border:0'></iframe>" for _, link in L["all"]))
                pg = b.new_page(viewport={"width": w, "height": 900}); pg.goto(f"http://localhost:{pb}/host.html")
                try: pg.wait_for_function(f"() => Object.keys(window.__h).length === {len(L['all'])}", timeout=30000)
                except Exception: pass
                got = pg.evaluate("window.__h")
                for i, (name, _) in enumerate(L["all"]):
                    r = got.get(str(i)) or {}
                    ok = r.get("width") == w and isinstance(r.get("height"), (int, float)) and 0 <= r["height"] - T[(w, name)] <= 1
                    reported += ok
                    check(ok, f"9b. @{w} {name}: the player reports {r.get('height')} px at width {r.get('width')} — its tallest chord, stepped, is {T[(w, name)]}")
                pg.close()
            print(f"reported heights matching the tallest chord: {reported} of {len(worst) * len(L['all'])}")
            # ---- 12. the fence on an atetudes.com content page: each frame is what its player reported, ending at its last line ----
            by_max = sorted({name for _, name in T}, key=lambda nm: max(T[(w, nm)] for w in worst))
            fence_names = [by_max[0], by_max[-1]]
            fence_dir = Path(tmp) / "fence"; shutil.copytree(REPO / "content", fence_dir / "content")
            blocks = subprocess.run(["node", "--input-type=module", "-e", """import { etudeBlock, ETUDE_V } from './engine/etude-block.mjs';
              import { readFileSync } from 'node:fs'; const c = JSON.parse(readFileSync('hub/tests/fixtures/etude-corpus.json', 'utf8'));
              const want = JSON.parse(process.argv[1]); process.stdout.write(JSON.stringify(want.map((n) => etudeBlock(c.find((x) => x.name === n).saved, { app: 'multetudes', v: ETUDE_V }))));""",
              json.dumps(fence_names)], cwd=REPO, capture_output=True, text=True, check=True).stdout
            (fence_dir / "content" / "blog" / "fence-gate.md").write_text("---\ntitle: the fence gate\ndate: 2026-11-23\n---\n\nBefore.\n\n"
                + "\n\nBetween.\n\n".join(json.loads(blocks)) + "\n\nAfter.\n")
            hugo = subprocess.run(["hugo", "--quiet", "--contentDir", str(fence_dir / "content"), "--destination", str(fence_dir / "public")],
                                  cwd=REPO, capture_output=True, text=True)
            check(hugo.returncode == 0, f"12. Hugo built the fence page: {hugo.stderr[-300:]}")
            (fence_dir / "public" / "embed" / "multetudes" / "index.html").write_bytes(BUILD.read_bytes())
            hf, pf = serve(fence_dir / "public", "127.0.0.1")
            LAST = """() => Math.max(...[...document.querySelectorAll('.wrap *')].filter((e) => e.getClientRects().length
                && getComputedStyle(e).visibility !== 'hidden').map((e) => e.getBoundingClientRect().bottom))"""
            fenced = 0
            for w in (390, 740, 1280):
                pg = b.new_page(viewport={"width": w, "height": 900}); errs = []
                pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
                pg.add_init_script("window.__h = []; addEventListener('message', (e) => { if (e.data && e.data.type === 'atetudes:player-height') window.__h.push([e.source, e.data.height]); });")
                pg.goto(f"http://127.0.0.1:{pf}/blog/fence-gate/")
                els = pg.query_selector_all("iframe[data-etude-player]")
                check(len(els) == 2, f"12. @{w}: the page carries the two étude frames ({len(els)})")
                for el in els: el.scroll_into_view_if_needed(); pg.wait_for_timeout(600)
                pg.wait_for_timeout(400)
                for i, el in enumerate(els):
                    fr = el.content_frame(); nm = fence_names[i]
                    said = pg.evaluate("(i) => { const f = document.querySelectorAll('iframe[data-etude-player]')[i]; const m = window.__h.filter((x) => x[0] === f.contentWindow); return m.length ? m[m.length - 1][1] : null; }", i)
                    fh = el.bounding_box()["height"]
                    check(said is not None and abs(fh - said) < 0.5, f"12. @{w} {nm}: the frame is {fh} px — its player reported {said}")
                    n_ch = fr.evaluate("document.querySelectorAll('#tlScroll button').length"); gaps, over = [], []
                    for c in range(n_ch):
                        fr.evaluate("(i) => document.dispatchEvent(new CustomEvent('atetudes:step', { detail: { index: i, request: true } }))", c); fr.wait_for_timeout(30)
                        gaps.append(fr.evaluate("document.documentElement.clientHeight") - fr.evaluate(LAST))
                        over.append(fr.evaluate("document.documentElement.scrollHeight - document.documentElement.clientHeight"))
                    check(n_ch >= 3 and 0 <= min(gaps) <= 8, f"12. @{w} {nm}: at its tallest chord the frame ends {min(gaps):.1f} px under the player's last line (0–8)")
                    check(not any(over), f"12. @{w} {nm}: the player never overflows its frame, at any chord: {over}")
                    if i == 1:
                        fr.click('#fdMini [data-role="play"]'); hts = set()
                        for _ in range(8): pg.wait_for_timeout(400); hts.add(round(el.bounding_box()["height"], 1))
                        fr.click('#fdMini [data-role="stop"]')
                        check(len(hts) == 1, f"12. @{w} {nm}: the frame holds its height while playing: {sorted(hts)}")
                    fenced += 1
                check(not errs, f"12. @{w}: the fence page logs no error: {errs[:3]}")
                pg.screenshot(path=str(Path(tmp) / f"fence-{w}.png"))
                if os.environ.get("FENCE_SHOTS"): shutil.copy(Path(tmp) / f"fence-{w}.png", Path(os.environ["FENCE_SHOTS"]) / f"fence-{w}.png")
                pg.close()
            hf.shutdown()
            check(fenced == 6, f"12. the fence ran on two études at three widths ({fenced} of 6)")
            # ---- 10, swept: Daniel's étude, the window RESIZED every 10 px from 340 to 1300 — the seat re-measures on a
            # resize, so the shape holds at widths no list names (the old header moved it at 410-470 and 720-780) ----
            name, link = L["all"][-1]
            pg = b.new_page(viewport={"width": 1300, "height": 900}); pg.goto(f"http://127.0.0.1:{ps}/embed/multetudes/{link}"); pg.wait_for_timeout(400)
            n_ch = pg.evaluate("document.querySelectorAll('#tlScroll button').length"); moved, widths = [], 0
            for w in range(340, 1301, 10):
                pg.set_viewport_size({"width": w, "height": 900}); pg.wait_for_timeout(30); tops = set(); widths += 1
                for i in range(n_ch):
                    pg.evaluate("(i) => document.dispatchEvent(new CustomEvent('atetudes:step', { detail: { index: i, request: true } }))", i); pg.wait_for_timeout(15)
                    tops.add(tuple(pg.evaluate("() => ['fdMini', 'fieldSvg'].map((id) => Math.round(document.getElementById(id).getBoundingClientRect().top))")))
                if len(tops) > 1: moved.append(w)
            check(widths == 97 and n_ch >= 3, f"10. swept {widths} widths through {n_ch} chords of {name}")
            check(not moved, f"10. resized from 340 to 1300 px, {name}: the transport and the neck never move between chords — they did at {moved[:12]}")
            pg.close()
            # ---- 11. the @ is the title, the logo's own; Multetudes keeps its title ----
            import re
            logo = (REPO / "static" / "assets" / "logo.svg").read_text()
            at_attrs = re.findall(r'<text\b([^>]*)>\s*@\s*</text>', logo)
            check(len(at_attrs) == 1, f"11. the logo draws one @ ({len(at_attrs)})")
            la = (lambda k: (re.search(rf'\b{k}="([^"]*)"', at_attrs[0]) or [None, ""])[1]) if at_attrs else (lambda k: "")
            fam = lambda v: [x.strip().strip("'\"") for x in v.split(",")]
            fill = la("fill").lstrip("#"); want_rgb = f"rgb({int(fill[0:2], 16)}, {int(fill[2:4], 16)}, {int(fill[4:6], 16)})" if len(fill) == 6 else "?"
            ctx = b.new_context(viewport={"width": 1280, "height": 800})
            ctx.route("https://atetudes.com/**", lambda r: r.fulfill(status=200, content_type="text/html", body="<title>atetudes.com</title>"))
            pg = ctx.new_page(); pg.goto(player("arpeggio")); pg.wait_for_timeout(400)
            m = pg.evaluate("""() => { const h = document.getElementById('fdHead'), t = h.firstElementChild, a = t.querySelector('[data-role=brand-at]');
              if (!a) return { title: t.textContent };
              const cs = getComputedStyle(a), ch = document.querySelector('#fdMode .readchord').getBoundingClientRect(), r = a.getBoundingClientRect();
              return { title: t.textContent, tag: a.tagName, font: cs.fontFamily, colour: cs.color, href: a.href, target: a.target, rel: a.rel,
                       label: a.getAttribute('aria-label'), deco: cs.textDecorationLine, left: r.right <= document.getElementById('fdMode').getBoundingClientRect().left,
                       mid: Math.abs((r.top + r.bottom) / 2 - (ch.top + ch.bottom) / 2) }; }""")
            check(m.get("tag") == "A" and m["title"] == "@", f"11. the player's card title is the @ alone, a link — {m.get('title')!r}")
            check(m.get("font") and fam(m["font"]) == fam(la("font-family")), f"11. the @ is set in the logo's typeface: {m.get('font')!r} vs the logo's {la('font-family')!r}")
            check(m.get("colour") == want_rgb, f"11. the @ is the logo's colour: {m.get('colour')} vs the logo's #{fill}")
            check(m.get("href") == "https://atetudes.com/" and m.get("target") == "_blank" and m.get("rel") == "noopener",
                  f"11. the @ opens atetudes.com in a new tab, noopener: {m.get('href')} {m.get('target')} {m.get('rel')}")
            check(m.get("label") == "At-Etudes — opens atetudes.com" and m.get("deco") == "none", f"11. named for a screen reader, a quiet link: {m.get('label')!r} {m.get('deco')}")
            check(m.get("left") and m.get("mid", 99) <= 3, f"11. it sits left of the readout, centred on the chord name's line (off by {m.get('mid')})")
            if m.get("tag") == "A":
                with ctx.expect_page() as np: pg.click("[data-role=brand-at]")
                nt = np.value; nt.wait_for_load_state()
                check(nt.url == "https://atetudes.com/" and pg.url.startswith(player("arpeggio").split("#")[0]), f"11. clicking the @ opens atetudes.com in a NEW tab, the player stays: {nt.url}")
            ctx.close()
            pg = b.new_page(viewport={"width": 1280, "height": 800}); pg.goto((REPO / "hub" / "build" / "multetudes.html").as_uri()); pg.wait_for_timeout(500)
            mt = pg.evaluate("() => [document.getElementById('fdHead').firstElementChild.textContent, document.querySelectorAll('[data-role=brand-at]').length]")
            check(mt == ["On the neck", 0], f"11. Multetudes still says \"On the neck\", and carries no @: {mt}")
            pg.close()
            # ---- 4 + 5. two players on another site's page: one at a time; no request beyond the page loads ----
            ctx = b.new_context(viewport={"width": 900, "height": 1100}); pg = ctx.new_page(); reqs = []
            pg.on("request", lambda r: reqs.append(r.url.split("#")[0]))
            pg.goto(f"http://localhost:{pb}/"); pg.wait_for_timeout(1200)
            frames = [f for f in pg.frames if f"127.0.0.1:{ps}" in f.url]
            check(len(frames) == 2, f"4. the host page carries two players ({len(frames)})")
            for f in frames:
                f.evaluate("() => { window.__r = false; document.addEventListener('atetudes:clock-state', e => { if (e.detail && typeof e.detail.running === 'boolean') window.__r = e.detail.running; }); }")
            run = lambda: [f.evaluate("() => window.__r") for f in frames]
            frames[0].click('#fdMini [data-role="play"]'); pg.wait_for_timeout(600); s1 = run()
            frames[1].click('#fdMini [data-role="play"]'); pg.wait_for_timeout(600); s2 = run()
            frames[0].click('#fdMini [data-role="play"]'); pg.wait_for_timeout(600); s3 = run()
            check(s1 == [True, False] and s2 == [False, True] and s3 == [True, False],
                  f"4. across origins, starting one stops the other: {s1} → {s2} → {s3}")
            frames[0].click('#fdMini [data-role="stop"]')
            expected = {f"http://localhost:{pb}/", f"http://127.0.0.1:{ps}/embed/multetudes/"}
            check(set(reqs) == expected, f"5. no request beyond the host page and the two player loads: {sorted(set(reqs) - expected)}")
            ctx.close(); b.close()
        hs.shutdown(); hb.shutdown()
    print(f"player door — {n} assertions, {len(fails)} failed")
    for f in fails: print("FAIL", f)
    return 1 if fails else 0

if __name__ == "__main__":
    sys.exit(main())
