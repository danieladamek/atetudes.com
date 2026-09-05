#!/usr/bin/env python3
"""capture_cards.py — the landing page's study-card thumbnails, CAPTURED from the
shipped studies, never drawn (item: Study card thumbnails, 260821; the sixth,
tetrad-voice-leading, added by AptÉtudes and SolÉtudes, 260929).

Each frame is a real study driven to a state Daniel picked, identified by the
study's own readout string. THE READOUT IS ASSERTED BEFORE THE CAPTURE — if a
study drifts so the frame is no longer reachable, this script fails loudly,
naming the study and the expected string; nobody recaptures until it "looks
right" and nobody touches a PNG in an editor. A study whose frame cannot be
reached gets NO thumbnail (golden-rule-1 position in the item note).

One ratio: 16:10 — each crop rectangle is the smallest 16:10 rect COVERING
the named subject, centred; nothing is scaled or letterboxed to fit, which is
why the Tetradetudes frame crops to the neck region rather than the roughly-
square card.

Two rules the shelf review added (item: The shelf reads ragged, 260929), both
ASSERTED, so the six sit as one row and a seventh cannot break it silently:

  CROP CLOSE. The subject is the content's own bounding box and the pad is a
  hairline (PAD, 6 CSS px) — never the captured page's margin. The 16:10
  cover may add at most MAX_BLEED of the padded subject's area, so a subject
  whose own shape is far from 16:10 is refused: pick a subject that is, do
  not let the cover fill the frame with white.

  LONG EDGE >= MIN_LONG_EDGE device px (1400 — the index's 420 CSS px slot on
  a 2x display wants 840, the landing card ~800; 1400 leaves room). The frame
  is chosen in CSS px, so the device scale factor is raised per capture until
  the clip clears the floor; a 660 px triadetudes frame was upscaled soft.

Frames are driven over file:// in a FRESH browser context per study, so
localStorage is empty and the defaults are actually the defaults. No study
reads URL parameters (verified in the item); the DOM is driven directly.

Optimisation: neither oxipng nor pngquant is installed on this machine, so
the palette reduction is Pillow's (adaptive 256-colour quantize + optimize)
— same effect on these flat-colour UI captures. Budget: <=120 kB per file,
<=400 kB total, asserted at the end.

This is a STOPGAP with a stated death date: when `Site shell - live chart
miniatures` lands, these PNGs and this script are deleted in the same
commit. Do not grow features here.

usage: python3 tools/capture_cards.py [slug ...]   (no slugs = every card)
"""
import io
import math
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "static" / "assets" / "cards"
RATIO = 16 / 10
PAD = 6                 # the hairline around the subject, CSS px
MAX_BLEED = 1.25        # cover area / padded subject area, at most
MIN_LONG_EDGE = 1400    # device px on the saved PNG's long edge
BASE_DSF = 2


def die(study, expected, got):
    sys.exit(f"CAPTURE REFUSED [{study}]: expected {expected!r}, got {got!r} — "
             f"the study has drifted; re-derive the frame with Daniel, do not force it")


def norm(s):
    return " ".join((s or "").split())


def cover_16x10(page, x0, y0, x1, y1, pad=PAD, name="?"):
    """the smallest 16:10 rect covering the subject (padded), centred on it —
    then SHIFTED fully inside the page, because Playwright silently clamps a
    clip at the page edge and a clamped clip breaks the ratio (found when the
    Tetradetudes card rendered at 1.41)"""
    x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
    w, h = x1 - x0, y1 - y0
    sw, sh = w, h
    if w / h < RATIO:
        w = h * RATIO
    else:
        h = w / RATIO
    bleed = (w * h) / (sw * sh)
    print(f"  [{name}] subject {sw:.0f}x{sh:.0f} ({sw / sh:.2f}) -> cover {w:.0f}x{h:.0f}, bleed {bleed:.2f}")
    if bleed > MAX_BLEED:
        sys.exit(f"CAPTURE REFUSED [{name}]: the 16:10 cover would be {bleed:.2f}x the subject "
                 f"(> {MAX_BLEED}) — the frame would be mostly page margin; choose a subject nearer 16:10")
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
    png = page.screenshot(clip=clip, full_page=True)   # the clip is in document px; without full_page Playwright clamps it to the viewport
    img = Image.open(io.BytesIO(png)).convert("RGB")
    img = img.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.png"
    img.save(path, optimize=True)
    ratio = img.size[0] / img.size[1]
    if abs(ratio - RATIO) > 0.01:
        sys.exit(f"CAPTURE REFUSED [{name}]: saved image is {img.size[0]}x{img.size[1]} "
                 f"(ratio {ratio:.3f}, want 1.600) — the clip was clamped somewhere")
    if max(img.size) < MIN_LONG_EDGE:
        sys.exit(f"CAPTURE REFUSED [{name}]: {img.size[0]}x{img.size[1]} is under the "
                 f"{MIN_LONG_EDGE} px long-edge floor — it would be upscaled soft in the index's slot")
    kb = path.stat().st_size / 1024
    print(f"  {path.relative_to(REPO)}  {img.size[0]}x{img.size[1]}  {kb:.0f} kB")
    return kb


def fresh(browser, slug, dsf, width=1280, height=1400):
    ctx = browser.new_context(viewport={"width": width, "height": height},
                              device_scale_factor=dsf)
    page = ctx.new_page()
    page.goto((REPO / "static" / "studies" / slug / "study.html").as_uri())
    page.wait_for_timeout(800)
    return page


def cap_metronome(browser, dsf):
    """Defaults: BPM 72 · 4/4 · beats · beep · accents on · Vol 80. Page top:
    H1 + subtitle, the METRONOME and NOTEPAD cards side by side, the notepad
    showing its placeholder. (The frame table was written against v1.4.3; the
    range item shipped v1.4.4 the same day — the subtitle asserts the SHIPPED
    version, and the delta is recorded in the scrum note.)"""
    page = fresh(browser, "metronome", dsf)
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
    return page, cover_16x10(page, *subject, name="metronome"), "metronome"


def cap_triadetudes(browser, dsf):
    """Key D, pivots seeded by clicking the string-2 fret-0 scale dot:
    readout `D I · 2nd inv. · 1 of 8 · D major`. Crop: the readout line and
    the neck below it — the pivot window and the strings under it, to 16:10."""
    page = fresh(browser, "triadetudes", dsf)
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
    # the readout + window alone is a 2:1 strip; Daniel's subject is "the neck with its readout
    # line above it", so the frame runs from the readout DOWN INTO THE NECK — the strings under
    # the window — until it is 16:10, instead of centring page margin above the readout
    x0, y0, x1, y1 = union(tuple(rt), tuple(win))
    fret_bottom = bbox(page, "#fret")[3]
    y1 = min(fret_bottom, y0 + (x1 - x0 + 2 * PAD) / RATIO - 2 * PAD)
    return page, cover_16x10(page, x0, y0, x1, y1, name="triadetudes"), "triadetudes"


def cap_tetradetudes(browser, dsf):
    """Key Bb, the zone at its lowest scale triple (frets 1–5), stepped to
    4 of 8: readout `Dm7 iii-7 · drop2 · 1st inv. · 4 of 8 · Bb major`. Crop:
    the neck region (not the whole roughly-square card), the ringed tones in
    frame, widened along the neck to 16:10. The window view returns to Full so
    the crop is the neck alone."""
    page = fresh(browser, "tetradetudes", dsf)
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
    # the sounding dots span a near-square patch of neck; the frame widens ALONG THE NECK, centred
    # on them, until it is 16:10 — more frets either side, never page margin above and below
    y0, y1 = dots["neckTop"], dots["neckBot"]
    sx0, _, sx1, _ = bbox(page, "#fretSvg")
    need_w = (y1 - y0 + 2 * PAD) * RATIO - 2 * PAD
    cx = (x0 + x1) / 2
    x0, x1 = cx - need_w / 2, cx + need_w / 2
    if x0 < sx0:                        # the neck ran out on one side: take the frets on the other
        x0, x1 = sx0, min(sx1, sx0 + need_w)
    elif x1 > sx1:
        x0, x1 = max(sx0, sx1 - need_w), sx1
    return page, cover_16x10(page, x0, y0, x1, y1, name="tetradetudes"), "tetradetudes"


def cap_modes(browser, dsf):
    """Key A: `Box 2 · frets 4–7 — A Ionian`. Crop: the Box 2 board and its
    legend column (hearing / mode tones, the core+add row, the note rows).
    Captured at a 700px viewport, where the page's own responsive layout
    stacks the legend under the board — the stacked union is 1.56:1, so the
    16:10 cover adds almost no bleed. At desktop widths the side-by-side
    union is 4.5:1 and the cover-rect would drag Boxes 1 and 3 into frame."""
    page = fresh(browser, "modes-from-pentatonic-boxes", dsf, width=700, height=2600)
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
    return page, cover_16x10(page, *subject, name="modes-from-pentatonic-boxes"), "modes-from-pentatonic-boxes"


def cap_multetudes(browser, dsf):
    """The RATIFIED BOOT (the note-for-note pinned block, 260904): Bb major,
    the window from the 5th on string 4 at frets 3-7, the tetrad one-of-each,
    bar 1 of 8 placing. The boot is the one state the gate pins note-for-note,
    so the frame cannot drift without the door gate going red first. Chosen by
    the session at the v0.1.0 publish, PENDING Daniel's own frame pick — swap
    the state here when he names one. Crop: the chip strip's board and the
    ON THE NECK board, the door's signature."""
    page = fresh(browser, "multetudes", dsf)
    ro = norm(page.inner_text("#roLine"))
    want = ("Bb major — the whole field, 57 notes · bar 1 of 8 — Bbmaj7 (I) · frame from the "
            "5th on string 4, frets 3–7 (12 notes · 8/8 bars place) · strings 4–3–2–1, grip, "
            "one of each · 1+1+1+1 across the set (a stack) · over Bb — string 6, fret 6: the "
            "stack is Bbmaj7")     # the same boot in the v0.5.6 canon's words (night 34)
    if ro != want:
        die("multetudes", want, ro)
    if page.eval_on_selector_all("#fieldSvg .fd-sel", "e => e.length") != 4:
        die("multetudes", "four selection dots at boot", "a different count")
    # the strip and the neck alone are a 3.4:1 band; the frame that has always shipped is the
    # strip's board and the ON THE NECK board entire (neck, set column, placement panel, the
    # transport row under the neck) — the door's dense UI, near 16:10 by itself. Name it as such.
    boards = page.evaluate("""() => ['#tlScroll', '#fieldSvg'].map(s => {
      const b = document.querySelector(s).closest('.board').getBoundingClientRect();
      return [b.x, b.y, b.x + b.width, b.y + b.height]; })""")
    subject = union(*[tuple(b) for b in boards])
    return page, cover_16x10(page, *subject, name="multetudes"), "multetudes"


def cap_tetrad_voice_leading(browser, dsf):
    """Cycling 4ths in C major, stepped to 2 of 8: Fmaj7 (IVmaj7, 2nd inversion)
    sounding on the neck AND the keyboard, the 5 and the 7 ringed as the voices
    about to fall — the two staves moving together is the study's subject, and
    the ringed pair is the rule (R and 3 hold; 5 falls to the new root, 7 to
    the new 3rd). Frame chosen by the build session (Daniel's ruling, 260929);
    a different frame later is a re-capture, not a rework. Captured at a 760px
    viewport, where the study's own responsive layout scales the keyboard to
    the card and the whole stage — neck, hint, keyboard, timeline, narration —
    is itself close to 16:10, so the cover adds only card padding."""
    page = fresh(browser, "tetrad-voice-leading", dsf, width=760, height=1400)
    if norm(page.inner_text("#keyVal")) != "C" or norm(page.inner_text("#scaleVal")) != "Major":
        die("tetrad-voice-leading", "the C Major defaults",
            norm(page.inner_text("#keyVal")) + " " + norm(page.inner_text("#scaleVal")))
    page.click("#engSeg >> text=Cycling 4ths")
    page.wait_for_timeout(500)
    if norm(page.inner_text("#engSeg button.on")) != "Cycling 4ths":
        die("tetrad-voice-leading", "Cycling 4ths selected", norm(page.inner_text("#engSeg button.on")))
    page.click("#fwdBtn")
    page.wait_for_timeout(900)     # the .55s slide, then the label swap
    cur = norm(page.inner_text("#timeline button.cur"))
    want = "Fmaj7 IVmaj7 · 2nd"
    if cur != want:
        die("tetrad-voice-leading", want, cur)
    narr = norm(page.inner_text("#narr"))
    want_narr = "next: the 5 of Fmaj7 falls to the R of Bm7b5 · the 7 of Fmaj7 falls to the b3 of Bm7b5"
    if narr != want_narr:
        die("tetrad-voice-leading", want_narr, narr)
    for svg in ("#neck", "#kbd"):
        labs = sorted(page.eval_on_selector_all(svg + " .dotg .lb", "els => els.map(e => e.textContent)"))
        if labs != ["3", "5", "7", "R"]:
            die("tetrad-voice-leading", f"R 3 5 7 sounding on {svg}", labs)
    ringed = sorted(page.eval_on_selector_all("#neck .dotg.armed .lb", "els => els.map(e => e.textContent)"))
    if ringed != ["5", "7"]:
        die("tetrad-voice-leading", "the 5 and the 7 ringed", ringed)
    tops = page.eval_on_selector_all("#timeline button", "els => els.map(e => Math.round(e.getBoundingClientRect().y))")
    if len(set(tops)) != 1:
        die("tetrad-voice-leading", "the timeline on one row", f"{len(set(tops))} rows")
    subject = union(bbox(page, "#neck"), bbox(page, "#kbd"), bbox(page, "#timeline"), bbox(page, "#narr"))
    return page, cover_16x10(page, *subject, name="tetrad-voice-leading"), "tetrad-voice-leading"


def capture(fn, browser):
    """drive the study at the base scale, and if the chosen frame is too small
    in CSS px to clear the long-edge floor at that scale, drive it AGAIN at the
    scale that does — the frame (in CSS px) is identical, only the pixel
    density changes. The scale is derived from the frame, never hand-picked."""
    page, clip, name = fn(browser, BASE_DSF)
    dsf = BASE_DSF
    if max(clip["width"], clip["height"]) * dsf < MIN_LONG_EDGE:
        dsf = math.ceil(MIN_LONG_EDGE / max(clip["width"], clip["height"]))
        print(f"  [{name}] {clip['width']:.0f} CSS px frame: re-driving at {dsf}x for the {MIN_LONG_EDGE} px floor")
        page.context.close()
        page, clip, name = fn(browser, dsf)
    try:
        return shoot(page, clip, name)
    finally:
        page.context.close()


def main():
    by_slug = {"metronome": cap_metronome, "triadetudes": cap_triadetudes,
               "tetradetudes": cap_tetradetudes, "modes-from-pentatonic-boxes": cap_modes,
               "multetudes": cap_multetudes, "tetrad-voice-leading": cap_tetrad_voice_leading}
    caps = tuple(by_slug.values())
    slugs = sys.argv[1:]
    if slugs:
        unknown = [s for s in slugs if s not in by_slug]
        if unknown:
            sys.exit(f"no such card: {unknown} — know {sorted(by_slug)}")
        caps = tuple(by_slug[s] for s in slugs)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for fn in caps:
            kb = capture(fn, browser)
            if kb > 120:
                sys.exit(f"BUDGET: {fn.__name__} produced {kb:.0f} kB (> 120 kB limit)")
        browser.close()
    # the budget, the ratio and the floor are facts about the DIRECTORY, not this run — a subset
    # run still asserts them over every card on disk, so a card this run did not touch cannot
    # sit under the floor unnoticed
    total = 0.0
    for path in sorted(OUT.glob("*.png")):
        total += path.stat().st_size / 1024
        w, h = Image.open(path).size
        if abs(w / h - RATIO) > 0.01:
            sys.exit(f"ON DISK [{path.name}]: {w}x{h} is not 16:10")
        if max(w, h) < MIN_LONG_EDGE:
            sys.exit(f"ON DISK [{path.name}]: {w}x{h} is under the {MIN_LONG_EDGE} px long-edge floor — re-capture it")
    if total > 400:
        sys.exit(f"BUDGET: {total:.0f} kB total on disk (> 400 kB limit)")
    print(f"{len(caps)} card(s) captured, {len(list(OUT.glob('*.png')))} on disk, {total:.0f} kB total")


if __name__ == "__main__":
    main()
