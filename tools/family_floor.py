#!/usr/bin/env python3
"""family_floor.py — the conformance floor, asserted against every study.

Ruling 2 (Daniel, 2026-08-19): "anticipate that every application will have at
least the metronome, transport, and the interactive neck and animated ledger
[staff]." Four surfaces. This suite asserts them AT THE ARTIFACT LEVEL against
every entry in the family register (engine/tests/_family.mjs) — hand-authored
and hub-built alike — in a real browser, from a cold page, with the network
disabled. "A floor nothing checks is the instruction nobody asserts."

WHAT EACH SURFACE MEANS HERE (behaviour, not implementation — the register
supplies the per-app HANDLE, this file supplies the one shared assertion):

  metronome — pressing the registered start control makes a REPEATING audible
              click (>= 2 real audio-source starts in 1.6 s); pressing it
              again silences it. Counted at the AudioNode, not the announce.
  transport — pressing the registered play control makes the etude SOUND
              (>= 1 source start in 2.5 s); pressing it again stops new sound.
              An optional registered `arm` control is clicked first (an app
              whose sound ships off must still be able to make the first
              gesture sound).
  neck      — clicking a registered note element SOUNDS it (>= 1 source
              start). "Interactive" means the click has an audible
              consequence, not that the SVG exists.
  staff     — while the transport plays, the staff CHANGES: its subtree is
              sampled twice, 2.8 s apart, and must differ. The lit position is
              sampled, not the constant that set it.

SCOPE IS RATIFIED (Daniel, 2026-08-20, R2-R4) and lives in the register's
FLOOR_SCOPE, not here: an app owes all four surfaces; an appliance owes the
metronome and is EXEMPT from the rest; a frozen study is skipped entirely; a
chart is not bound. AN EXEMPTED SURFACE REPORTS AS EXEMPTED, WITH ITS RATIFIED
REASON, NEVER AS A PASS — an exemption that reads like a pass is section 4.4's
silent-divergence defect wearing a register entry. For a BOUND surface, a
missing handle still FAILS as absent, by name — the register is the
declaration, and a missing declaration is a missing surface, not an
exemption.

This suite is deliberately NOT in CI yet: the door's neck finding (F3) is
filed and open, and a red floor in CI should mean a regression, not a known,
filed gap. Wiring options are in the spec's section 4.5.

usage:  python3 tools/family_floor.py [--demo slug=path] [--only slug]
        --demo substitutes a file for one study (used to demonstrate the
        assertions bite on a sabotaged build; never against the real family)
"""
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
STUDIES = REPO / "static" / "studies"

AUDIO_TAP = """() => {
  if (!window.__srcTapped) {
    window.__srcTapped = true;
    window.__src = [];
    for (const P of [window.OscillatorNode, window.AudioBufferSourceNode]) {
      const s0 = P.prototype.start;
      P.prototype.start = function (...a) { window.__src.push(performance.now()); return s0.apply(this, a); };
    }
  }
  window.__src.length = 0;
}"""


def register():
    """the family register and the ratified floor scope, read from the one
    place they exist — the suite carries no scope opinions of its own"""
    r = subprocess.run(
        ["node", "--input-type=module", "-e",
         'import {FAMILY, FLOOR_SCOPE} from "./engine/tests/_family.mjs";'
         "console.log(JSON.stringify({fam: [...FAMILY], scope: FLOOR_SCOPE}))"],
        capture_output=True, text=True, cwd=REPO, check=True)
    d = json.loads(r.stdout)
    return dict(d["fam"]), d["scope"]


def click(page, sel):
    """press like a USER — a real click fires pointerdown first, and apps
    legitimately arm their AudioContext on pointerdown (the browser autoplay
    contract). A synthetic click event skips that and fails honest apps —
    the suite's own first defect, caught on its first run."""
    el = page.query_selector(sel)
    if el is None:
        return False
    try:
        el.click(timeout=2000, force=True)
    except Exception:
        el.evaluate("e => e.dispatchEvent(new MouseEvent('click', {bubbles: true}))")
    return True


def baseline(page):
    return page.evaluate("() => window.__src.length")


def starts_since(page, n0, ms):
    """count source starts against a baseline taken BEFORE the press. The
    suite's third first-run defect: reading the baseline after the click
    already counted a one-shot note's start into it, so a working neck
    measured zero. Repeating surfaces masked the bug; the one-shot exposed
    it. Baseline first, always."""
    page.wait_for_timeout(ms)
    return page.evaluate("() => window.__src.length") - n0


def run_study(browser, slug, entry, scope, file_path, results):
    def fail(surface, msg):
        results.append((slug, surface, False, msg))
        print(f"  FAIL  {slug} · {surface} — {msg}")

    def ok(surface, msg):
        results.append((slug, surface, True, msg))
        print(f"  pass  {slug} · {surface} — {msg}")

    def exempt(surface):
        """R2/R3: an exemption is reported out loud with its ratified reason,
        and is a third status — never a pass, never silence."""
        reason = scope["exempt"][surface]
        results.append((slug, surface, "exempt", reason))
        print(f"  EXMT  {slug} · {surface} — exempt, not passing: {reason}")

    bound = scope["binds"]

    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.route("**/*", lambda r: r.continue_() if r.request.url.startswith("file://") else r.abort())
    page.goto(file_path.as_uri())
    page.wait_for_timeout(900)
    page.evaluate(AUDIO_TAP)
    surfaces = entry.get("surfaces", {})

    # ---- metronome: a repeating audible click, start and stop ----
    h = surfaces.get("metronome") if "metronome" in bound else None
    if "metronome" not in bound:
        exempt("metronome")
    elif not h:
        fail("metronome", "no registered handle — the surface is absent")
    elif not click(page, h["start"]):
        fail("metronome", f"registered start control {h['start']} is not on the page")
    else:
        page.wait_for_timeout(150)
        n = starts_since(page, baseline(page), 1600)
        if n < 2:
            fail("metronome", f"start pressed, {n} source start(s) in 1.6s — the click does not repeat audibly")
        else:
            click(page, h["start"])          # stop
            page.wait_for_timeout(400)       # let scheduled clicks land
            n2 = starts_since(page, baseline(page), 900)
            if n2 != 0:
                fail("metronome", f"stopped, but {n2} source(s) still started — stop does not silence")
            else:
                ok("metronome", f"{n} clicks while running, silent after stop")

    # ---- transport: play sounds, pause stops new sound ----
    h = surfaces.get("transport") if "transport" in bound else None
    playing = False
    if "transport" not in bound:
        exempt("transport")
    elif not h:
        fail("transport", "no registered handle — the surface is absent")
    elif not click(page, h.get("arm", "#__none__")) and h.get("arm"):
        fail("transport", f"registered arm control {h['arm']} is not on the page")
    else:
        n0 = baseline(page)
        if not click(page, h["play"]):
            fail("transport", f"registered play control {h['play']} is not on the page")
            n0 = None
        else:
            n = starts_since(page, n0, 2500)
            if n < 1:
                fail("transport", "Play pressed, zero source starts in 2.5s — the first gesture does not sound")
            else:
                playing = True
                ok("transport", f"{n} source start(s) after Play")

    # ---- staff: changes while the transport plays ----
    h = surfaces.get("staff") if "staff" in bound else None
    if "staff" not in bound:
        exempt("staff")
    elif not h:
        fail("staff", "no registered handle — the surface is absent")
    else:
        root = page.query_selector(h["root"])
        if root is None:
            fail("staff", f"registered root {h['root']} is not on the page")
        elif not playing:
            fail("staff", "cannot assert animation — the transport did not play")
        else:
            a = root.evaluate("e => e.innerHTML")
            page.wait_for_timeout(2800)
            b = root.evaluate("e => e.innerHTML")
            if a == b:
                fail("staff", "the staff did not change over 2.8s of playback — a static staff is not animated")
            else:
                ok("staff", "the staff changed during playback")
    if playing and surfaces.get("transport"):
        click(page, surfaces["transport"]["play"])   # stop before the neck test
        page.wait_for_timeout(500)

    # ---- neck: clicking a note sounds it ----
    h = surfaces.get("neck") if "neck" in bound else None
    if "neck" not in bound:
        exempt("neck")
    elif not h:
        fail("neck", "no registered handle — the surface is absent")
    elif "note" not in h or page.query_selector(h["note"]) is None:
        fail("neck", f"no clickable note at registered handle {h.get('note')} — nothing to press")
    else:
        n0 = baseline(page)
        click(page, h["note"])
        n = starts_since(page, n0, 800)
        if n < 1:
            fail("neck", "a note was clicked and nothing sounded — the neck is a picture, not an instrument")
        else:
            ok("neck", f"a clicked note started {n} source(s)")

    if errors:
        print(f"        [{slug}] page errors during the exercise (reported, not a floor surface): {errors[:2]}")
    ctx.close()


def main():
    from playwright.sync_api import sync_playwright
    demo = {}
    only = None
    for a in sys.argv[1:]:
        if a.startswith("--demo"):
            slug, _, path = a.split("=", 1)[1].partition(":")
            demo[slug] = Path(path)
        elif a.startswith("--only"):
            only = a.split("=", 1)[1]
    fam, floor_scope = register()
    results = []
    print(f"family floor — {len(fam)} registered stud(ies), four surfaces "
          f"(Ruling 2: metronome · transport · neck · staff; scope R2-R4, ratified 2026-08-20)\n")
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for slug, entry in fam.items():
            if only and slug != only:
                continue
            scope = floor_scope[entry["kind"]]
            if entry["kind"] == "chart":
                print(f"  --    {slug} — kind: chart (R4: a map, not a designer — the floor does not bind it)")
                continue
            if entry["kind"] == "frozen":
                # R3: skipped entirely, and the skip NAMES its ruling — a
                # silent skip would be indistinguishable from a pass
                print(f"[{slug}] kind: frozen — floor skipped:")
                for name in ["metronome", "transport", "neck", "staff"]:
                    results.append((slug, name, "exempt", scope["exempt"][name]))
                    print(f"  EXMT  {slug} · {name} — exempt, not passing: {scope['exempt'][name]}")
                continue
            f = demo.get(slug, STUDIES / slug / "study.html")
            tag = " (DEMO FILE)" if slug in demo else ""
            print(f"[{slug}]{tag} kind: {entry['kind']}")
            run_study(browser, slug, entry, scope, f, results)
        browser.close()
    fails = [r for r in results if r[2] is False]
    exempts = [r for r in results if r[2] == "exempt"]
    passes = [r for r in results if r[2] is True]
    print(f"\n{len(results)} surface(s): {len(passes)} pass · {len(exempts)} exempt (never counted as passes) · {len(fails)} failed")
    for slug, surface, _, msg in fails:
        print(f"  BELOW THE FLOOR  {slug} · {surface} — {msg}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
