"""player_parity.py — the player plays what Multetudes plays (261121; *Player - the object comes from the tones, so a 9th
chord plays as a 9th*).

Daniel, 2026-11-21: "the 9th didn't get captured in the embedding code." The link carried R 3 5 7 9; the player played
Fmaj7. Every earlier gate checked that the link ROUND-TRIPS (multetudes_link.py: the snapshot, byte for byte), never that
the two doors PLAY the same thing from it. This one does.

For every linkable corpus étude (hub/tests/fixtures/etude-corpus.json, which since tonight holds one étude per object:
dyad, shell, triad, tetrad, 9th, 11th, 13th, scale, plus a two-tone pick the stack names), opened from its link in both
doors, at 1280 and 390, every chord in turn, the two doors agree on:

  1. the readout (#fdMode): the chord symbol and its mode
  2. the note sequence under the neck (#fdMotif)
  3. the tones lit on the neck: every selected note (g.fd-sel) by string, fret and pitch
  4. the chart line's chips (#tlScroll): every chord's symbol

Coverage is asserted too: the corpus must name every object (by the engine's own objectOf), so a missing object fails
here rather than passing by omission. Prints its assertion count; exits 1 on any failure. `--shots DIR` saves the 9th
étude's first chord in both doors at 1280.
"""
import json, subprocess, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parent.parent.parent
BUILD = REPO / "hub" / "build"
SHOTS = Path(sys.argv[sys.argv.index("--shots") + 1]) if "--shots" in sys.argv else None
OBJECTS = {"dyad", "shell", "triad", "tetrad", "ninth", "eleventh", "thirteenth", "scale"}
NINTH = "a 9th chord (Daniel's, 261121 — F, cycling 4ths, R 3 5 7 9)"
fails, n = [], 0

def check(ok, msg):
    global n
    n += 1
    if not ok: fails.append(msg)

js = """import { toFragment, linkable } from './engine/etude-link.mjs'; import { ETUDE_V } from './engine/etude-block.mjs';
  import { objectOf, tonePick } from './engine/selection.mjs'; import { readFileSync } from 'node:fs';
  const c = JSON.parse(readFileSync('hub/tests/fixtures/etude-corpus.json', 'utf8')); const env = { app: 'multetudes', v: ETUDE_V };
  process.stdout.write(JSON.stringify(c.filter((x) => linkable(x.saved) === true)
    .map((x) => ({ name: x.name, link: toFragment(x.saved, env), object: objectOf(tonePick(x.saved)) }))));"""
ETUDES = json.loads(subprocess.run(["node", "--input-type=module", "-e", js], cwd=REPO, capture_output=True, text=True, check=True).stdout)

PLAYS = """() => ({
  mode: document.getElementById('fdMode').textContent.trim(),
  motif: document.getElementById('fdMotif').textContent.trim(),
  sel: [...document.querySelectorAll('#fieldSvg g.fd-sel')].map((g) => [g.dataset.selstr, g.dataset.selfret, g.dataset.selmidi].join('/')).sort(),
})"""
CHIPS = "() => [...document.querySelectorAll('#tlScroll button')].map((b) => b.textContent.trim())"

def plays(pg, door, link):
    """everything the door plays from the link: its chips, and per chord its readout, sequence and lit tones"""
    pg.goto("about:blank"); pg.goto((BUILD / f"{door}.html").as_uri() + link); pg.wait_for_timeout(500)
    chips = pg.evaluate(CHIPS)
    per = []
    for i in range(len(chips)):
        pg.evaluate("(i) => document.dispatchEvent(new CustomEvent('atetudes:step', { detail: { index: i, request: true } }))", i)
        pg.wait_for_timeout(40)
        per.append(pg.evaluate(PLAYS))
    return chips, per

def main():
    seen = {e["object"] for e in ETUDES}
    check(OBJECTS <= seen, f"the corpus links an étude of every object — missing {sorted(OBJECTS - seen)}")
    check(any(e["name"] == NINTH for e in ETUDES), "Daniel's 9th étude is in the corpus and linkable")
    with sync_playwright() as p:
        b = p.chromium.launch(); errs = []
        for w in (1280, 390):
            pages = {d: b.new_page(viewport={"width": w, "height": 900}) for d in ("multetudes", "player")}
            for pg in pages.values(): pg.on("pageerror", lambda e: errs.append(str(e)))
            lit_9 = False
            for e in ETUDES:
                m_chips, m = plays(pages["multetudes"], "multetudes", e["link"])
                p_chips, pl = plays(pages["player"], "player", e["link"])
                tag = f"[@{w}] {e['name']} ({e['object']})"
                check(len(m_chips) >= 3, f"{tag}: Multetudes charts its chords ({len(m_chips)})")
                check(p_chips == m_chips, f"{tag}: the chart line's chips — player {p_chips} vs Multetudes {m_chips}")
                for i in range(min(len(m), len(pl))):
                    for k in ("mode", "motif", "sel"):
                        check(pl[i][k] == m[i][k], f"{tag} chord {i + 1}: {k} — player {pl[i][k]!r} vs Multetudes {m[i][k]!r}")
                if e["name"] == NINTH:   # the reported case, said positively: a 9 is lit and sounding
                    lit_9 = bool(m) and m[0]["mode"].startswith("Fmaj9") and len(m[0]["sel"]) == 5
                    check(lit_9, f"{tag}: chord 1 reads Fmaj9 and lights five tones in Multetudes — {m[:1]}")
            if SHOTS and w == 1280:
                SHOTS.mkdir(parents=True, exist_ok=True)
                link = next(e["link"] for e in ETUDES if e["name"] == NINTH)
                for d, pg in pages.items():
                    pg.goto("about:blank"); pg.goto((BUILD / f"{d}.html").as_uri() + link); pg.wait_for_timeout(600)
                    pg.screenshot(path=str(SHOTS / f"parity-9th-{d}-{w}.png"), full_page=True)
            for pg in pages.values(): pg.close()
        check(not errs, f"no page errors: {errs[:3]}")
        b.close()
    print(f"player parity — {n} assertions over {len(ETUDES)} études, {len(fails)} failed")
    for f in fails: print("FAIL", f)
    return 1 if fails else 0

if __name__ == "__main__":
    sys.exit(main())
