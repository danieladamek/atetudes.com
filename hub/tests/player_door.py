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
  8. no chord name is ever cut in the readout — every chord of every linkable corpus étude, at every width below
  9. THE EMBED HEIGHT IS GATED: the player's natural height, at its TALLEST chord, for every linkable corpus étude and
     Daniel's 21-note figure, at seven widths from phone to desktop, never exceeds the Multetudes door's embed.height —
     the number Copy embed code writes. A typed figure can be any length; the failure names the étude that outgrew it.

Prints its assertion count; exits 1 on any failure. Two throwaway local servers stand in for atetudes.com and a
stranger's blog — 127.0.0.1 and localhost are different SITES to the browser, which is the point.
"""
import json, os, socket, subprocess, sys, tempfile, threading, time
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
            toFragment({ ...by('a pattern figure'), figure: '4,3,4,3,2,1,2,3,4,3,2,1,2,3,4,3,2,1,2,3,4' }, { app: 'multetudes', v: ETUDE_V })]]),
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
            worst = {}
            for w in (360, 390, 500, 650, 700, 900, 1280):
                pg = b.new_page(viewport={"width": w, "height": 100})
                for name, link in L["all"]:
                    pg.goto("about:blank"); pg.goto(f"http://127.0.0.1:{ps}/embed/multetudes/{link}"); pg.wait_for_timeout(300)
                    n_ch = pg.evaluate("document.querySelectorAll('#tlScroll button').length")
                    tallest, cut = 0, []
                    for i in range(max(n_ch, 1)):
                        pg.evaluate("(i) => document.dispatchEvent(new CustomEvent('atetudes:step', { detail: { index: i, request: true } }))", i)
                        pg.wait_for_timeout(30)
                        h, c = pg.evaluate("""() => { const t = document.querySelector('#fdMode .readtext');
                          return [document.documentElement.scrollHeight, t.scrollWidth > t.clientWidth + 0.5 ? t.textContent : null]; }""")
                        tallest = max(tallest, h)
                        if c: cut.append(c)
                    check(n_ch >= 3, f"8. @{w} {name}: the chart line has its chords ({n_ch})")
                    check(not cut, f"8. @{w} {name}: no chord name cut in the readout — {cut[:2]}")
                    check(tallest <= L["height"], f"9. @{w} {name}: the player at its tallest chord is {tallest} px — over the embed height {L['height']}")
                    worst[w] = max(worst.get(w, 0), tallest)
                pg.close()
            print("tallest player per width:", worst, "— embed height", L["height"])
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
