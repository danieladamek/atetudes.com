#!/usr/bin/env python3
"""site_logo.py — atetudes.com logo asset kit (v4, ratified 2026-08-07).

THE MARK: the literal '@' glyph set in ROOT RED (#B82929). THE WORDMARK IS
THE SCALE (Daniel's round-6 idea): '@etudes' is exactly seven symbols, so
'@' = root and the six letters e-t-u-d-e-s wear the six remaining families
in ascending canonical order — e=2 green, t=3 blue, u=4 silver, d=5 ink,
e=6 cyan, s=7 amber (count and order asserted). Read aloud: "at-etudes".
The lockup is the degree legend itself; the faint silver 'u' is the Spec's
own doctrine on display — the 4th is the avoid tone that wears no color.

Ratified stepwise by Daniel 2026-08-07 across six rendered studies
(🛠 Working/site-logo-study-260807/): Degree Wheel → arcs → lockup →
'@' construction (E1x2) → true-'@' glyph (M2, root red) → full-spectrum
wordmark (S1, everywhere — nav, stacked, OG).

Glyphs embedded as paths from Liberation Sans Bold (Arial-metric, the site's
Helvetica/Arial stack) — all shipped SVGs are font-independent.

Emits into ./assets/:
  logo_mark.svg            the red '@' alone
  logo_lockup.svg          '@etudes' horizontal (nav/header)
  logo_lockup_stacked.svg  '@' over 'etudes' (square formats)
  favicon.svg              adaptive: dark scheme adds a thin white halo
                           behind the red '@' (piano black-key trick)
  favicon-32.png, favicon-16.png, apple-touch-icon.png (180, white ground)
  og_image.png             1200x630 link-share card
Plus logo_final_proof.png — the render-and-inspect sheet.
"""
import io, re
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform

# ---------------------------------------------------------------- palette (Spec v1.1) + assertions
DEG = {1: "#B82929", 2: "#3C8B2F", 3: "#2959A6", 4: "#A9ABB4",
       5: "#212126", 6: "#1CB8D1", 7: "#D99A08"}
assert [DEG[d] for d in range(1, 8)] == ["#B82929", "#3C8B2F", "#2959A6", "#A9ABB4",
                                         "#212126", "#1CB8D1", "#D99A08"], "Spec v1.1 palette drift"
ROOT = DEG[1]
INK, GRAY, GROUND = "#212126", "#73737A", "#ECECEE"

# The wordmark is the scale: six letters, the six non-root families, in order.
WORD = "etudes"
LETTER_DEGREES = [2, 3, 4, 5, 6, 7]
assert len(WORD) == len(LETTER_DEGREES) == 6, "six letters, six remaining families"
assert sorted(LETTER_DEGREES + [1]) == list(range(1, 8)), "lockup covers all seven degrees"
LETTER_COLORS = [DEG[d] for d in LETTER_DEGREES]

OUT = Path(__file__).parent / "assets"
OUT.mkdir(exist_ok=True)

FONT = TTFont("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf")
GLYPHS = FONT.getGlyphSet()
UPM = FONT["head"].unitsPerEm
CMAP = FONT.getBestCmap()

def glyph_path(ch, size, x, y, fill=INK, cls=None):
    scale = size / UPM
    glyph = GLYPHS[CMAP[ord(ch)]]
    spen = SVGPathPen(GLYPHS)
    glyph.draw(TransformPen(spen, Transform(scale, 0, 0, -scale, x, y)))
    d = spen.getCommands()
    assert d, f"empty glyph for {ch!r}"
    c = f' class="{cls}"' if cls else ""
    return f'<path{c} d="{d}" fill="{fill}"/>', glyph.width * scale

def word_path(text, size, x, y, fill=INK):
    parts, pen_x = [], x
    for ch in text:
        p, adv = glyph_path(ch, size, pen_x, y, fill)
        parts.append(p)
        pen_x += adv
    return "".join(parts), pen_x - x

def etudes_path(size, x, y):
    """'etudes' with each letter in its degree family's color (S1, ratified)."""
    parts, pen_x = [], x
    for ch, fill in zip(WORD, LETTER_COLORS):
        p, adv = glyph_path(ch, size, pen_x, y, fill)
        parts.append(p)
        pen_x += adv
    return "".join(parts), pen_x - x

def at_mark(cx=32, cy=32, size=58, cls=None):
    """The root-red '@', centered. Ratified M2 geometry (round 5)."""
    _, adv = glyph_path("@", size, 0, 0)
    p, _ = glyph_path("@", size, cx - adv / 2, cy + size * 0.36, fill=ROOT, cls=cls)
    return p

def svg_doc(w, h, body, style=""):
    s = f"<style>{style}</style>" if style else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">{s}{body}</svg>'

# ---------------------------------------------------------------- assets

def build():
    files = {}

    files["logo_mark.svg"] = svg_doc(64, 64, at_mark())

    p, wd = etudes_path(30, 62, 32 + 30 * 0.355)
    files["logo_lockup.svg"] = svg_doc(round(72 + wd), 64, at_mark() + p)

    wd = sum(GLYPHS[CMAP[ord(c)]].width * (22 / UPM) for c in WORD)
    p, _ = etudes_path(22, 60 - wd / 2, 96)
    files["logo_lockup_stacked.svg"] = svg_doc(120, 108, at_mark(60, 34, size=56) + p)

    # favicon: dark tabs get a thin white halo behind the red @ (contrast trick)
    style = ("@media (prefers-color-scheme: dark){"
             ".at{stroke:#FFFFFF;stroke-width:2.2;paint-order:stroke}}")
    files["favicon.svg"] = svg_doc(64, 64, at_mark(size=60, cls="at"), style)

    for name, s in files.items():
        (OUT / name).write_text(s)

    fav_light = files["favicon.svg"].replace(f"<style>{style}</style>", "")
    for px, name in [(32, "favicon-32.png"), (16, "favicon-16.png")]:
        (OUT / name).write_bytes(cairosvg.svg2png(bytestring=fav_light.encode(),
                                                  output_width=px, output_height=px))
    touch = Image.new("RGBA", (180, 180), "#FFFFFF")
    m = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=files["logo_mark.svg"].encode(),
                                               output_width=140, output_height=140))).convert("RGBA")
    touch.alpha_composite(m, (20, 20))
    touch.convert("RGB").save(OUT / "apple-touch-icon.png")

    og = Image.new("RGB", (1200, 630), GROUND)
    og.paste(Image.new("RGB", (1120, 550), "#FFFFFF"), (40, 40))
    # No tagline (Daniel, 260807): the card is the lockup alone, centered.
    lk = Image.open(io.BytesIO(cairosvg.svg2png(
        bytestring=files["logo_lockup.svg"].encode(), output_width=680))).convert("RGBA")
    ogx = Image.new("RGBA", og.size, (0, 0, 0, 0))
    ogx.alpha_composite(lk, ((1200 - lk.width) // 2, (630 - lk.height) // 2))
    og = Image.alpha_composite(og.convert("RGBA"), ogx).convert("RGB")
    og.save(OUT / "og_image.png")
    return files

# ---------------------------------------------------------------- proof sheet

def proof(files):
    f_head = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 17)
    f_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
    W = 960
    im = Image.new("RGB", (W, 900), "white")
    dr = ImageDraw.Draw(im)
    dr.text((22, 18), "atetudes.com logo v4 — final asset proof (spectrum wordmark, S1)", font=f_head, fill=INK)
    dr.text((22, 44), "mark · '@etudes' lockup · stacked · favicon 16 px light + dark · apple-touch · OG",
            font=f_small, fill=GRAY)

    def png(svg_text, width):
        return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg_text.encode(),
                                                      output_width=width))).convert("RGBA")
    def on(img, bg):
        base = Image.new("RGBA", img.size, bg); base.alpha_composite(img); return base.convert("RGB")

    im.paste(on(png(files["logo_mark.svg"], 128), "white"), (22, 80))
    im.paste(on(png(files["logo_lockup.svg"], 400), GROUND), (180, 105))
    im.paste(on(png(files["logo_lockup_stacked.svg"], 150), "white"), (680, 70))
    lf = on(png(files["favicon.svg"], 16), "white").resize((96, 96), Image.NEAREST)
    im.paste(lf, (22, 250))
    dark = re.sub(r"<style>.*?</style>",
                  '<style>.at{stroke:#FFFFFF;stroke-width:2.2;paint-order:stroke}</style>',
                  files["favicon.svg"])
    df = on(png(dark, 16), INK).resize((96, 96), Image.NEAREST)
    im.paste(df, (140, 250))
    dr.text((22, 352), "16 px light / dark form", font=f_small, fill=GRAY)
    im.paste(Image.open(OUT / "apple-touch-icon.png").convert("RGB"), (280, 240))
    im.paste(Image.open(OUT / "og_image.png").resize((600, 315)), (22, 400))
    dr.text((22, 725), "OG card 1200x630 (shown 50%)", font=f_small, fill=GRAY)
    im = im.crop((0, 0, W, 760))
    im.save(OUT.parent / "logo_final_proof.png")
    print("wrote logo_final_proof.png")

if __name__ == "__main__":
    fs = build()
    print("assets:", ", ".join(sorted(p.name for p in OUT.iterdir())))
    proof(fs)
