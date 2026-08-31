#!/usr/bin/env python3
"""capture_cards.py — the landing page's four study-card thumbnails, CAPTURED
from the shipped studies, never drawn (item: Study card thumbnails, 260821).

Each frame is a real study driven to a state Daniel picked, identified by the
study's own readout string. THE READOUT IS ASSERTED BEFORE THE CAPTURE — if a
study drifts so the frame is no longer reachable, this script fails loudly,
naming the study and the expected string; nobody recaptures until it "looks
right" and nobody touches a PNG in an editor. A study whose frame cannot be
reached gets NO thumbnail (golden-rule-1 position in the item note).

One ratio: 16:10 at device_scale_factor=2 — each crop rectangle is the
smallest 16:10 rect COVERING the named subject, centred; nothing is scaled or
letterboxed to fit, which is why the Tetradetudes frame crops to the neck
region rather than the roughly-square card.

Frames are driven over file:// in a FRESH browser context per study, so
localStorage is empty and the defaults are actually the defaults. No study
reads URL parameters (verified in the item); the DOM is driven directly.

Optimisation: neither oxipng nor pngquant is installed on this machine, so
the palette reduction is Pillow's (adaptive 256-colour quantize + optimize)
— same effect on these flat-colour UI captures. Budget: <=120 kB per file,
<=400 kB total, asserted at the end.

This is a STOPGAP with a stated death date: when `Site shell - live chart
miniatures` lands, these four PNGs and this script are deleted in the same
commit. Do not grow features here.

usage: python3 tools/capture_cards.py
"""
import io
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "static" / "assets" / "cards"
RATIO = 16 / 10


def die(study, expected, got):
    sys.exit(f"CAPTURE REFUSED [{study}]: expected {expected!r}, got {got!r} — "
             f"the study has drifted; re-derive the frame with Daniel, do not force it")


def norm(s):
    return " ".join((s or "").split())


def cover_16x10(page, x0, y0, x1, y1, pad=8):
    """the smallest 16:10 rect covering the subject (padded), centred on it —
    then SHIFTED fully inside the page, because Playwright silently clamps a
    clip at the page edge and a clamped clip breaks the ratio (found when the
    Tetradetudes card rendered at 1.41)"""
    x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
    w, h = x1 - x0, y1 - y0
    if w / h < RATIO:
        w = h * RATIO
    else:
        h = w / RATIO
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    x, y = cx - w / 2, cy - h / 2
    pw_, ph_ = page.evaluate("() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]")
    x = max(0, min(x, pw_ - w))
    y = max(0, min(y, ph_ - h))
    if w > pw_ or h > ph_:
        sys.exit(f"CAPTURE REFUSED: a {w:.0f}x{h:.0f} clip cannot fit the {pw_}x{ph_} page")
    clip = {"x": x, "y": y, "width": w, "height": h}
    assert abs(clip["width"] / clip["height"] - RATIO) < 1e-6
    return clip


def bbox(page, sel):
    b = page.query_selector(sel).bounding_box()
    return b["x"], b["y"], b["x"] + b["width"], b["y"] + b["height"]


def union(*boxes):
    return (min(b[0] for b in boxes), min(b[1] for b in boxes),
            max(b[2] for b in boxes), max(b[3] for b in boxes))


def shoot(page, clip, name):
    png = page.screenshot(clip=clip)
    img = Image.open(io.BytesIO(png)).convert("RGB")
    img = img.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.png"
    img.save(path, optimize=True)
    ratio = img.size[0] / img.size[1]
    if abs(ratio - RATIO) > 0.01:
        sys.exit(f"CAPTURE REFUSED [{name}]: saved image is {img.size[0]}x{img.size[1]} "
                 f"(ratio {ratio:.3f}, want 1.600) — the clip was clamped somewhere")
    kb = path.stat().st_size / 1024
    print(f"  {path.relative_to(REPO)}  {img.size[0]}x{img.size[1]}  {kb:.0f} kB")
    return kb


def fresh(browser, slug, width=1280, height=1400):
    ctx = browser.new_context(viewport={"width": width, "height": height},
                              device_scale_factor=2)
    page = ctx.new_page()
    page.goto((REPO / "static" / "studies" / slug / "study.html").as_uri())
    page.wait_for_timeout(800)
    return page


def cap_metronome(browser):
    """Defaults: BPM 72 · 4/4 · beats · beep · accents on · Vol 80. Page top:
    H1 + subtitle, the METRONOME and NOTEPAD cards side by side, the notepad
    showing its placeholder. (The frame table was written against v1.4.3; the
    range item shipped v1.4.4 the same day — the subtitle asserts the SHIPPED
    version, and the delta is recorded in the scrum note.)"""
    page = fresh(browser, "metronome")
    for sel, want in [("#bpmRange", "72"), ("#meterSel", "4"), ("#subSel", "1"),
                      ("#voiceSel", "beep"), ("#clickVolR", "80")]:
        got = page.input_value(sel)
        if got != want:
            die("metronome", f"{sel}={want}", got)
    if not page.is_checked("#accChk"):
        die("metronome", "accents checked", "unchecked")
    tag = norm(page.inner_text(".tag"))
    want_tag = "the At-Etudes appliance — tap it, hear it, jot the idea · v1.4.4"
    if tag != want_tag:
        die("metronome", want_tag, tag)
    if not norm(page.get_attribute("#pad", "placeholder") or ""):
        die("metronome", "notepad placeholder visible", "no placeholder")
    subject = union(bbox(page, "header"), bbox(page, ".card.metro"),
                    bbox(page, ".card:not(.metro)"))
    return shoot(page, cover_16x10(page, *subject), "metronome")


def cap_triadetudes(browser):
    """Key D, pivots seeded by clicking the string-2 fret-0 scale dot:
    readout `D I · 2nd inv. · 1 of 8 · D major`. Crop: the readout line and
    the pivot-window region of the neck below it."""
    page = fresh(browser, "triadetudes")
    page.select_option("#keySel", "D")
    page.wait_for_timeout(300)
    clicked = page.evaluate("""() => {
      for (const g of document.querySelectorAll('#fret g[cursor]')) {
        const c = g.querySelector('circle'); if (!c) continue;
        if (Math.abs(+c.getAttribute('cx') - 24) < 2 &&
            Math.abs(+c.getAttribute('cy') - 68) < 2) {
          g.dispatchEvent(new MouseEvent('click', {bubbles: true})); return true;
        }
      } return false; }""")
    if not clicked:
        die("triadetudes", "a scale dot at string 2, fret 0", "no such dot")
    page.wait_for_timeout(400)
    ro = norm(page.inner_text("#readout"))
    want = "D I · 2nd inv. · 1 of 8 · D major"
    if ro != want:
        die("triadetudes", want, ro)
    win = page.evaluate("""() => {
      const r = [...document.querySelectorAll('#fret rect')]
        .find(e => (e.getAttribute('stroke-dasharray') || '').length > 0);
      if (!r) return null;
      const b = r.getBoundingClientRect();
      return [b.x, b.y, b.x + b.width, b.y + b.height]; }""")
    if not win:
        die("triadetudes", "the dashed pivot-window rectangle", "absent")
    # the readout DIV spans the card; the subject is its TEXT extent
    rt = page.evaluate("""() => { const r = document.createRange();
      r.selectNodeContents(document.getElementById('readout'));
      const b = r.getBoundingClientRect();
      return [b.x, b.y, b.x + b.width, b.y + b.height]; }""")
    subject = union(tuple(rt), tuple(win))
    return shoot(page, cover_16x10(page, *subject, pad=14), "triadetudes")


def cap_tetradetudes(browser):
    """Key Bb, the zone at its lowest scale triple (frets 1–5), stepped to
    4 of 8: readout `Dm7 iii-7 · drop2 · 1st inv. · 4 of 8 · Bb major`. Crop:
    the neck region (not the whole roughly-square card), the ringed tones in
    frame. The window view returns to Full so the crop is the neck alone."""
    page = fresh(browser, "tetradetudes")
    page.select_option("#keySel", "Bb")
    page.wait_for_timeout(300)
    page.click("#winSeg >> text=Box")
    page.wait_for_timeout(150)
    page.focus("#fretSvg")
    for _ in range(8):
        page.keyboard.press("ArrowLeft")
    page.wait_for_timeout(300)
    hint = page.inner_text("#fsBoxHint")
    if "frets 1–5" not in hint:
        die("tetradetudes", "the zone at frets 1–5 (8 ArrowLefts hit the floor)", hint)
    for _ in range(3):
        page.click("#nextBtn")
        page.wait_for_timeout(200)
    page.wait_for_timeout(500)
    ro = norm(page.inner_text("#readout"))
    want = "Dm7 iii-7 · drop2 · 1st inv. · 4 of 8 · Bb major"
    if ro != want:
        die("tetradetudes", want, ro)
    ringed = sorted(page.eval_on_selector_all(
        "#fretSvg .fs-dot.fs-armed .fs-lab", "els => els.map(e => e.textContent)"))
    if not {"5", "b7"}.issubset(set(ringed)):
        die("tetradetudes", "the ringed tones to include 5 and b7", ringed)
    page.click("#winSeg >> text=Full")     # display state only — the pass is untouched
    page.wait_for_timeout(200)
    if norm(page.inner_text("#readout")) != want:
        die("tetradetudes", want + " (after Full)", norm(page.inner_text("#readout")))
    dots = page.evaluate("""() => {
      const bs = [...document.querySelectorAll('#fretSvg .fs-dot')]
        .map(d => d.getBoundingClientRect());
      const f = document.getElementById('fretSvg').getBoundingClientRect();
      return { d: [Math.min(...bs.map(b => b.x)), Math.min(...bs.map(b => b.y)),
                   Math.max(...bs.map(b => b.x + b.width)), Math.max(...bs.map(b => b.y + b.height))],
               neckTop: f.y + 14, neckBot: f.y + f.height - 30 }; }""")
    x0, _, x1, _ = dots["d"]
    subject = (x0, dots["neckTop"], x1, dots["neckBot"])
    return shoot(page, cover_16x10(page, *subject, pad=60), "tetradetudes")


def cap_modes(browser):
    """Key A: `Box 2 · frets 4–7 — A Ionian`. Crop: the Box 2 board and its
    legend column (hearing / mode tones, the core+add row, the note rows).
    Captured at a 700px viewport, where the page's own responsive layout
    stacks the legend under the board — the stacked union is 1.56:1, so the
    16:10 cover adds almost no bleed. At desktop widths the side-by-side
    union is 4.5:1 and the cover-rect would drag Boxes 1 and 3 into frame."""
    page = fresh(browser, "modes-from-pentatonic-boxes", width=700, height=2600)
    page.click("#keySeg >> text=/^A$/")
    page.wait_for_timeout(600)
    got = page.evaluate("""() => {
      const legends = [...document.querySelectorAll('*')].filter(e =>
        e.children.length >= 2 && /Box 2 · frets/.test(e.textContent) &&
        e.getBoundingClientRect().height < 260);
      if (!legends.length) return null;
      const lg = legends[0], b = lg.getBoundingClientRect();
      return { text: lg.textContent.trim().replace(/\\s+/g, ' ').slice(0, 120),
               box: [b.x, b.y, b.x + b.width, b.y + b.height] }; }""")
    if not got:
        die("modes-from-pentatonic-boxes", "the Box 2 legend column", "not found")
    squeezed = got["text"].replace(" ", "")
    for frag in ["Box 2 · frets 4–7 — A Ionian", "hearing: A major", "mode tones: in"]:
        if frag not in got["text"]:
            die("modes-from-pentatonic-boxes", frag, got["text"])
    for frag in ["coreR2356", "add47"]:      # per-label elements render unspaced
        if frag not in squeezed:
            die("modes-from-pentatonic-boxes", frag, got["text"])
    figs = page.query_selector_all(".boxfig")
    fb = figs[1].bounding_box()      # Box 2's board
    subject = union((fb["x"], fb["y"], fb["x"] + fb["width"], fb["y"] + fb["height"]),
                    tuple(got["box"]))
    return shoot(page, cover_16x10(page, *subject, pad=10), "modes-from-pentatonic-boxes")


def cap_multetudes(browser):
    """The RATIFIED BOOT (the note-for-note pinned block, 260904): Bb major,
    the window from the 5th on string 4 at frets 3-7, the tetrad one-of-each,
    bar 1 of 8 placing. The boot is the one state the gate pins note-for-note,
    so the frame cannot drift without the door gate going red first. Chosen by
    the session at the v0.1.0 publish, PENDING Daniel's own frame pick — swap
    the state here when he names one. Crop: the chip strip and the neck, the
    door's signature."""
    page = fresh(browser, "multetudes")
    ro = norm(page.inner_text("#roLine"))
    want = ("Bb major · bar 1 of 8 — Bbmaj7 (I) · frame from the 5th on string 4, "
            "frets 3–7 (12 notes · 8/8 bars place) · strings 4–3–2–1, grip · "
            "1+1+1+1 across the set (a block)")
    if ro != want:
        die("multetudes", want, ro)
    if page.eval_on_selector_all("#fieldSvg .fd-sel", "e => e.length") != 4:
        die("multetudes", "four selection dots at boot", "a different count")
    subject = union(bbox(page, "#tlScroll"), bbox(page, "#fieldSvg"))
    return shoot(page, cover_16x10(page, *subject, pad=10), "multetudes")


def main():
    total = 0.0
    caps = (cap_metronome, cap_triadetudes, cap_tetradetudes, cap_modes,
            cap_multetudes)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for fn in caps:
            kb = fn(browser)
            if kb > 120:
                sys.exit(f"BUDGET: {fn.__name__} produced {kb:.0f} kB (> 120 kB limit)")
            total += kb
        browser.close()
    if total > 400:
        sys.exit(f"BUDGET: {total:.0f} kB total (> 400 kB limit)")
    print(f"{len(caps)} cards, {total:.0f} kB total")


if __name__ == "__main__":
    main()
