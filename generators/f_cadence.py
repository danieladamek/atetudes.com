#!/usr/bin/env python3
"""Diatonic cadence in F major — full 4-note grips on the top four strings."""
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas

W, H = landscape(letter)
c = canvas.Canvas("F_Cadence_Top4_Strings.pdf", pagesize=(W, H))

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

# ---- chord data: frets listed for strings 4-3-2-1 (D G B E)
CHORDS = [
    ("Bbmaj7",   "IVmaj7", [8, 10, 10, 10], ["R", "5", "7", "3"],   ["Bb", "F", "A", "D"]),
    ("Em7b5/Bb", "viio7",  [8, 9, 8, 10],   ["b5", "R", "b3", "b7"], ["Bb", "E", "G", "D"]),
    ("Am7",      "iii-7",  [7, 9, 8, 8],    ["R", "5", "b7", "b3"], ["A", "E", "G", "C"]),
    ("Dm7/A",    "vi-7",   [7, 7, 6, 8],    ["5", "R", "b3", "b7"], ["A", "D", "F", "C"]),
    ("Gm7",      "ii-7",   [5, 7, 6, 6],    ["R", "5", "b7", "b3"], ["G", "D", "F", "Bb"]),
    ("C7/G",     "V7",     [5, 5, 5, 6],    ["5", "R", "3", "b7"],  ["G", "C", "E", "Bb"]),
    ("Fmaj7",    "Imaj7",  [3, 5, 5, 5],    ["R", "5", "7", "3"],   ["F", "C", "E", "A"]),
]
BARS = [CHORDS[0:2], CHORDS[2:4], CHORDS[4:6], CHORDS[6:7]]

# ---- diagram geometry
S_GAP = 13
F_GAP = 18
NFRETS = 4
GW = S_GAP * 5
GH = F_GAP * NFRETS

def draw_diagram(x, y, name, roman, frets, ivals, notes):
    start = min(frets)
    # roman + chord name
    set_fill(GRAY)
    c.setFont("Helvetica-Oblique", 9)
    c.drawCentredString(x + GW / 2, y + 32, roman.replace("viio7", "viiø7"))
    set_fill(INK)
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(x + GW / 2, y + 18, name)
    # grid
    set_stroke(INK)
    c.setLineWidth(1.3)
    c.line(x, y, x + GW, y)
    c.setLineWidth(0.7)
    for i in range(1, NFRETS + 1):
        c.line(x, y - i * F_GAP, x + GW, y - i * F_GAP)
    for s in range(6):
        c.line(x + s * S_GAP, y, x + s * S_GAP, y - GH)
    # fret label
    set_fill(GRAY)
    c.setFont("Helvetica", 8)
    c.drawRightString(x - 6, y - F_GAP / 2 - 3, f"{start}fr")
    # muted low strings
    c.setFont("Helvetica", 8)
    for s in (0, 1):
        c.drawCentredString(x + s * S_GAP, y + 4, "x")
    # dots on strings D G B E (indices 2..5)
    for k, fret in enumerate(frets):
        s = k + 2
        cx = x + s * S_GAP
        cy = y - (fret - start) * F_GAP - F_GAP / 2
        lab = ivals[k]
        set_fill(deg_color(lab))
        c.circle(cx, cy, 6.6, stroke=0, fill=1)
        c.setFillColorRGB(*lab_text(lab))
        c.setFont("Helvetica-Bold", 5.6 if len(ivals[k]) > 1 else 6.6)
        c.drawCentredString(cx, cy - 2.2, ivals[k])
    # note names below
    set_fill(GRAY)
    c.setFont("Helvetica", 8)
    for k, note in enumerate(notes):
        c.drawCentredString(x + (k + 2) * S_GAP, y - GH - 11, note)

# ---- header
set_fill(INK)
c.setFont("Helvetica-Bold", 21)
c.drawCentredString(W / 2, H - 55, "Four-Bar Cadence in F Major")
set_fill(GRAY)
c.setFont("Helvetica", 10.5)
c.drawCentredString(W / 2, H - 73,
    "full 4-note grips on the top four strings (D-G-B-E)  ·  bottom note on the 4th string  ·  two beats per chord, Fmaj7 gets the bar")

# ---- one row of 4 bars
LM = 52
BAR2_W = 200   # bars with two chords
BAR1_W = 122   # final bar
TOP = H - 185
ROW_BOTTOM = TOP - GH - 24

x = LM
for bi, bar in enumerate(BARS):
    bw = BAR2_W if len(bar) == 2 else BAR1_W
    # bar number + bar line
    set_fill(LIGHT)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x + 4, TOP + 46, str(bi + 1))
    set_stroke(LIGHT)
    c.setLineWidth(1)
    c.line(x, TOP + 52, x, ROW_BOTTOM)
    # diagrams
    n = len(bar)
    gap = 36
    total = n * GW + (n - 1) * gap
    sx = x + (bw - total) / 2
    for j, (name, roman, frets, ivals, notes) in enumerate(bar):
        draw_diagram(sx + j * (GW + gap), TOP, name, roman, frets, ivals, notes)
    x += bw
# closing double bar
set_stroke(LIGHT)
c.setLineWidth(1)
c.line(x, TOP + 52, x, ROW_BOTTOM)
c.setLineWidth(2.4)
c.line(x + 5, TOP + 52, x + 5, ROW_BOTTOM)

# ---- voice-leading summary
set_fill(INK)
c.setFont("Helvetica-Bold", 12)
vy = ROW_BOTTOM - 66
c.drawString(LM, vy, "How the voices move")
set_fill(GRAY)
c.setFont("Helvetica", 10)
lines = [
    "Every change keeps two common tones while the other two voices step down one scale degree — the whole cadence",
    "slides from 8th position down to 3rd. Bottom note alternates root / 5th (Em7ø5 keeps Bb, its ø5, on the bottom).",
    "",
    "Bbmaj7 → Em7ø5:  Bb, D hold · F→E, A→G        Em7ø5 → Am7:  E, G hold · Bb→A, D→C        Am7 → Dm7:  A, C hold · E→D, G→F",
    "Dm7 → Gm7:  D, F hold · A→G, C→Bb        Gm7 → C7:  G, Bb hold · D→C, F→E        C7 → Fmaj7:  C, E hold · G→F, Bb→A",
]
ly = vy - 18
for ln in lines:
    if ln:
        c.drawString(LM, ly, ln)
    ly -= 14

# ---- footer
set_fill(GRAY)
c.setFont("Helvetica", 9)
c.drawCentredString(W / 2, 48,
    "Red = root, blue = 3rd, amber = 7th  ·  these grips are drop-2 voicings — the inversion of each chord is chosen for the smoothest voice leading")

c.save()
print("done")
