"""neck_foot.py — the note sequence sits above the legend, and stays put (261120; *Player - the chart line travels with
the neck*, decision 4 — Daniel, 15:17).

The rule lives in hub/modules/field-board.mjs, so it holds wherever the neck's foot is drawn: today Multetudes and the
player. For every linkable corpus étude (opened from its link — both doors read #etude=) and Daniel's 21-note figure,
at 1280 and 390, every chord in turn:

  1. the sequence (#fdMotif) starts at the SAME place, chord after chord — the same top, the same left
  2. the legend (#fdLegend) is the last line: wholly below the sequence, starting at the foot's left edge — never beside it

With --shots DIR: the pair of consecutive chords whose sequences differ most in width (the 15:09 pair's kind), in both
doors, at both widths. Prints its assertion count; exits 1 on any failure.
"""
import json, subprocess, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parent.parent.parent
BUILD = REPO / "hub" / "build"
SHOTS = Path(sys.argv[sys.argv.index("--shots") + 1]) if "--shots" in sys.argv else None
fails, n = [], 0

def check(ok, msg):
    global n
    n += 1
    if not ok: fails.append(msg)

js = """import { toFragment, linkable } from './engine/etude-link.mjs'; import { ETUDE_V } from './engine/etude-block.mjs';
  import { readFileSync } from 'node:fs';
  const c = JSON.parse(readFileSync('hub/tests/fixtures/etude-corpus.json', 'utf8')); const env = { app: 'multetudes', v: ETUDE_V };
  const by = (n) => c.find((x) => x.name === n).saved;
  process.stdout.write(JSON.stringify(c.filter((x) => linkable(x.saved) === true).map((x) => [x.name, toFragment(x.saved, env)])
    .concat([["Daniel's 21-note figure", toFragment({ ...by('a pattern figure'), figure: '4,3,4,3,2,1,2,3,4,3,2,1,2,3,4,3,2,1,2,3,4' }, env)]])));"""
ETUDES = json.loads(subprocess.run(["node", "--input-type=module", "-e", js], cwd=REPO, capture_output=True, text=True, check=True).stdout)

GEOM = """() => { const r = (id) => { const e = document.getElementById(id); const b = e.getBoundingClientRect(); return { t: b.top, b: b.bottom, l: b.left, w: b.width, h: b.height }; };
  const foot = document.querySelector('.fd-foot').getBoundingClientRect(), svg = document.getElementById('fieldSvg').getBoundingClientRect();
  return { m: r('fdMotif'), g: r('fdLegend'), fl: foot.left, sb: svg.bottom }; }"""

# OWED (261121, Daniel's ruling on *Player - the object comes from the tones*): these corpus études, added that night,
# show the neck's hint line (#fdHint, above the foot) growing on some chords, so the sequence drops. It is present in
# the old builds as well, in both doors. Owed to the backlog item *Neck - the hint line holds its height, so the
# sequence stays put*. They are still measured: a jump is reported as OWED, not failed, and an owed étude that no
# longer jumps anywhere FAILS, so this list is cut the night the item lands.
OWED = {"a shell (R 3 7)", "a 9th chord (Daniel's, 261121 — F, cycling 4ths, R 3 5 7 9)", "an 11th chord"}

def main():
    jumped = set()
    with sync_playwright() as p:
        b = p.chromium.launch(); errs = []
        for door in ("multetudes", "player"):
            for w in (1280, 390):
                pg = b.new_page(viewport={"width": w, "height": 900}); pg.on("pageerror", lambda e: errs.append(str(e)))
                best, with_seq = (-1, None), 0
                for name, link in ETUDES:
                    pg.goto("about:blank"); pg.goto((BUILD / f"{door}.html").as_uri() + link); pg.wait_for_timeout(500)
                    n_ch = pg.evaluate("document.querySelectorAll('#tlScroll button').length")
                    seen, beside, starts = [], [], set()
                    for i in range(n_ch):
                        pg.evaluate("(i) => document.dispatchEvent(new CustomEvent('atetudes:step', { detail: { index: i, request: true } }))", i)
                        pg.wait_for_timeout(40)
                        g = pg.evaluate(GEOM); seen.append(g)
                        if g["m"]["h"] > 0:
                            starts.add((round(g["m"]["t"] - g["sb"], 1), round(g["m"]["l"] - g["fl"], 1)))
                            if g["g"]["t"] < g["m"]["b"] - 0.5 or abs(g["g"]["l"] - g["fl"]) > 0.5: beside.append(i)
                    check(n_ch >= 3 and len(seen) == n_ch, f"[{door} @{w}] {name}: stepped every chord ({n_ch})")
                    # an étude whose movement draws no sequence (a scale, a legacy slot figure) has nothing to hold still
                    with_seq += bool(starts)
                    if name in OWED:
                        if len(starts) > 1: jumped.add(name); print(f"OWED [{door} @{w}] {name}: the sequence moves — {sorted(starts)}")
                    else:
                        check(len(starts) <= 1, f"[{door} @{w}] {name}: the sequence starts at one place through the run — {sorted(starts)}")
                    check(not beside, f"[{door} @{w}] {name}: the legend is its own last line below the sequence — not at chords {beside}")
                    for i in range(1, len(seen)):
                        dw = abs(seen[i]["m"]["w"] - seen[i - 1]["m"]["w"])
                        if dw > best[0]: best = (dw, (link, i - 1, i, name))
                check(with_seq >= 8, f"[{door} @{w}] the check held a sequence still on {with_seq} études — too few to mean anything")
                if SHOTS and best[1]:
                    link, i0, i1, name = best[1]
                    pg.goto("about:blank"); pg.goto((BUILD / f"{door}.html").as_uri() + link); pg.wait_for_timeout(500)
                    for i in (i0, i1):
                        pg.evaluate("(i) => document.dispatchEvent(new CustomEvent('atetudes:step', { detail: { index: i, request: true } }))", i)
                        pg.wait_for_timeout(80)
                        board = pg.locator("#fieldSvg").locator("xpath=ancestor::*[contains(@class,'board')][1]")
                        board.screenshot(path=str(SHOTS / f"foot-{door}-{w}-chord{i + 1}.png"))
                    print(f"[{door} @{w}] shot pair: {name}, chords {i0 + 1}→{i1 + 1}, sequence width differs {best[0]:.0f} px")
                pg.close()
        check(not errs, f"no page errors: {errs[:3]}")
        for name in sorted(OWED):
            check(any(x == name for x, _ in ETUDES), f"OWED names a corpus étude: {name}")
            check(name in jumped, f"OWED {name} no longer jumps anywhere — the hint item has landed; cut it from OWED")
        b.close()
    print(f"neck foot — {n} assertions, {len(fails)} failed")
    for f in fails: print("FAIL", f)
    return 1 if fails else 0

if __name__ == "__main__":
    sys.exit(main())
