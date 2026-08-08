#!/usr/bin/env python3
"""Bird blues (Blues for Alice changes) in Bb, charted with shell voicings."""
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas

W, H = landscape(letter)
c = canvas.Canvas("Bird_Blues_Bb_Shell_Voicings.pdf", pagesize=(W, H))

INK = (0.13, 0.13, 0.15)
ACCENT = (0.72, 0.16, 0.16)
GRAY = (0.45, 0.45, 0.48)
LIGHT = (0.80, 0.80, 0.82)

BLUE = (0.16, 0.35, 0.65)
AMBER = (0.85, 0.60, 0.05)
def deg_color(lab):
    if lab == "R": return (0.72, 0.16, 0.16)
    if lab in ("3", "b3"): return BLUE
    if lab in ("7", "b7", "o7"): return AMBER
    return (0.13, 0.13, 0.15)
def lab_text(lab):
    return (0.1, 0.1, 0.1) if lab in ("7", "b7", "o7") else (1, 1, 1)
def set_fill(rgb): c.setFillColorRGB(*rgb)
def set_stroke(rgb): c.setStrokeColorRGB(*rgb)

# ---- shape templates: (string 0=lowE..5, fret offset from root, label, is_root)
SHAPES = {
    ("E", "maj7"): {"dots": [(0, 0, "R", 1), (2, 1, "7", 0), (3, 1, "3", 0)], "muted": [1, 4, 5]},
    ("E", "7"):    {"dots": [(0, 0, "R", 1), (2, 0, "b7", 0), (3, 1, "3", 0)], "muted": [1, 4, 5]},
    ("E", "m7"):   {"dots": [(0, 0, "R", 1), (2, 0, "b7", 0), (3, 0, "b3", 0)], "muted": [1, 4, 5]},
    ("A", "maj7"): {"dots": [(1, 0, "R", 1), (3, 1, "7", 0), (4, 2, "3", 0)], "muted": [0, 2, 5]},
    ("A", "7"):    {"dots": [(1, 0, "R", 1), (3, 0, "b7", 0), (4, 2, "3", 0)], "muted": [0, 2, 5]},
    ("A", "m7"):   {"dots": [(1, 0, "R", 1), (3, 0, "b7", 0), (4, 1, "b3", 0)], "muted": [0, 2, 5]},
}

# ---- the 12 bars: list of (chord name, quality, root string, root fret)
BARS = [
    [("Bbmaj7", "maj7", "E", 6)],
    [("Am7b5*", "m7", "E", 5), ("D7", "7", "A", 5)],
    [("Gm7", "m7", "E", 3), ("C7", "7", "A", 3)],
    [("Fm7", "m7", "A", 8), ("Bb7", "7", "E", 6)],
    [("Eb7", "7", "A", 6)],
    [("Ebm7", "m7", "A", 6), ("Ab7", "7", "E", 4)],
    [("Dm7", "m7", "A", 5), ("G7", "7", "E", 3)],
    [("Dbm7", "m7", "A", 4), ("Gb7", "7", "E", 2)],
    [("Cm7", "m7", "A", 3)],
    [("F7", "7", "E", 1)],
    [("Bbmaj7", "maj7", "E", 6), ("G7", "7", "E", 3)],
    [("Cm7", "m7", "A", 3), ("F7", "7", "E", 1)],
]

# ---- mini diagram geometry
S_GAP = 11
F_GAP = 15
NFRETS = 3
GW = S_GAP * 5
GH = F_GAP * NFRETS

def draw_mini(x, y, name, quality, rstring, rfret):
    """x,y = top-left of grid."""
    shape = SHAPES[(rstring, quality)]
    # chord name
    set_fill(INK)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(x + GW / 2, y + 16, name)
    # grid
    set_stroke(INK)
    c.setLineWidth(1.1)
    c.line(x, y, x + GW, y)
    c.setLineWidth(0.6)
    for i in range(1, NFRETS + 1):
        c.line(x, y - i * F_GAP, x + GW, y - i * F_GAP)
    for s in range(6):
        c.line(x + s * S_GAP, y, x + s * S_GAP, y - GH)
    # fret label
    set_fill(GRAY)
    c.setFont("Helvetica", 7)
    c.drawRightString(x - 9, y - F_GAP / 2 - 2.5, f"{rfret}fr")
    # muted
    c.setFont("Helvetica", 7)
    for s in shape["muted"]:
        c.drawCentredString(x + s * S_GAP, y + 3.5, "x")
    # dots
    for s, off, label, is_root in shape["dots"]:
        cx = x + s * S_GAP
        cy = y - off * F_GAP - F_GAP / 2
        set_fill(deg_color(label))
        c.circle(cx, cy, 5.2, stroke=0, fill=1)
        c.setFillColorRGB(*lab_text(label))
        c.setFont("Helvetica-Bold", 4.6 if len(label) > 1 else 5.4)
        c.drawCentredString(cx, cy - 1.8, label)

# ---- page header
set_fill(INK)
c.setFont("Helvetica-Bold", 21)
c.drawCentredString(W / 2, H - 55, "Bird Blues in Bb")
set_fill(GRAY)
c.setFont("Helvetica", 10.5)
c.drawCentredString(W / 2, H - 72, '"Blues for Alice" changes  ·  shell voicings (R-3-7, no 5th)  ·  two beats per chord when a bar has two')

# ---- 12-bar grid: 3 rows x 4 bars
LM, RM = 44, W - 44
BAR_W = (RM - LM) / 4
ROW_H = 128
TOP = H - 112

for i, bar in enumerate(BARS):
    row, col = divmod(i, 4)
    bx = LM + col * BAR_W
    by = TOP - row * ROW_H          # top of this bar cell
    # bar number
    set_fill(LIGHT)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(bx + 5, by - 10, str(i + 1))
    # bar lines
    set_stroke(LIGHT)
    c.setLineWidth(1)
    c.line(bx, by, bx, by - ROW_H + 18)
    if col == 3:
        c.line(bx + BAR_W, by, bx + BAR_W, by - ROW_H + 18)
        if i == len(BARS) - 1:  # final double bar
            c.setLineWidth(2.2)
            c.line(bx + BAR_W - 4, by, bx + BAR_W - 4, by - ROW_H + 18)
    # diagrams centered in the cell
    n = len(bar)
    gap = 24
    total_w = n * GW + (n - 1) * gap
    start_x = bx + (BAR_W - total_w) / 2
    gy = by - 40
    for j, (name, quality, rstring, rfret) in enumerate(bar):
        draw_mini(start_x + j * (GW + gap), gy, name, quality, rstring, rfret)

# ---- footer notes
set_fill(GRAY)
c.setFont("Helvetica", 9)
fy = TOP - 3 * ROW_H - 8
c.drawCentredString(W / 2, fy,
    "* Am7b5: the shell voicing drops the 5th, so it uses the same grip as Am7 — the b5 lives in the D7 that follows")
c.drawCentredString(W / 2, fy - 13,
    "Red = root, blue = 3rd, amber = 7th  ·  x = muted string  ·  ii-V grips: m7 on the A string pairs with a dom7 on the E string two frets lower")
c.drawCentredString(W / 2, fy - 26,
    "(and m7 on the E string pairs with a dom7 on the A string at the same fret — bars 2, 3)")

c.save()
print("done")
