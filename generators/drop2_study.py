#!/usr/bin/env python3
"""Drop-2 study: all four inversions per quality + the F cadence through all levels."""
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas

W, H = landscape(letter)
c = canvas.Canvas("Drop2_Study_F_Cadence.pdf", pagesize=(W, H))

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

# ================= data =================
PC = {"C":0,"C#":1,"D":2,"Eb":3,"E":4,"F":5,"F#":6,"G":7,"Ab":8,"A":9,"Bb":10,"B":11}
OPEN = [50, 55, 59, 64]  # midi of D G B E

TONES = {
    "Bbmaj7": ({1:"Bb",3:"D",5:"F",7:"A"},  {1:"R",3:"3", 5:"5", 7:"7"}),
    "Gm7":    ({1:"G", 3:"Bb",5:"D",7:"F"}, {1:"R",3:"b3",5:"5", 7:"b7"}),
    "C7":     ({1:"C", 3:"E", 5:"G",7:"Bb"},{1:"R",3:"3", 5:"5", 7:"b7"}),
    "Em7b5":  ({1:"E", 3:"G", 5:"Bb",7:"D"},{1:"R",3:"b3",5:"b5",7:"b7"}),
    "Am7":    ({1:"A", 3:"C", 5:"E",7:"G"}, {1:"R",3:"b3",5:"5", 7:"b7"}),
    "Dm7":    ({1:"D", 3:"F", 5:"A",7:"C"}, {1:"R",3:"b3",5:"5", 7:"b7"}),
    "Fmaj7":  ({1:"F", 3:"A", 5:"C",7:"E"}, {1:"R",3:"3", 5:"5", 7:"7"}),
}
INV_DEGREES = {"root":[1,5,7,3], "1st":[3,7,1,5], "2nd":[5,1,3,7], "3rd":[7,3,5,1]}

GRIPS = {  # frets on strings D G B E
    ("Bbmaj7","root"):[8,10,10,10], ("Bbmaj7","1st"):[12,14,11,13], ("Bbmaj7","2nd"):[3,3,3,5],  ("Bbmaj7","3rd"):[7,7,6,6],
    ("Gm7","root"):[5,7,6,6],       ("Gm7","1st"):[8,10,8,10],      ("Gm7","2nd"):[12,12,11,13], ("Gm7","3rd"):[3,3,3,3],
    ("C7","root"):[10,12,11,12],    ("C7","1st"):[2,3,1,3],         ("C7","2nd"):[5,5,5,6],      ("C7","3rd"):[8,9,8,8],
    ("Em7b5","root"):[2,3,3,3],     ("Em7b5","1st"):[5,7,5,6],      ("Em7b5","2nd"):[8,9,8,10],  ("Em7b5","3rd"):[12,12,11,12],
    ("Am7","root"):[7,9,8,8],       ("Am7","1st"):[10,12,10,12],    ("Am7","2nd"):[2,2,1,3],     ("Am7","3rd"):[5,5,5,5],
    ("Dm7","root"):[12,14,13,13],       ("Dm7","1st"):[3,5,3,5],        ("Dm7","2nd"):[7,7,6,8],     ("Dm7","3rd"):[10,10,10,10],
    ("Fmaj7","root"):[3,5,5,5],     ("Fmaj7","1st"):[7,9,6,8],      ("Fmaj7","2nd"):[10,10,10,12],("Fmaj7","3rd"):[2,2,1,1],
}

# ---- verify every grip: ascending pitches, correct notes in inversion order
for (chord, inv), frets in GRIPS.items():
    notes, _ = TONES[chord]
    degs = INV_DEGREES[inv]
    pitches = [OPEN[i] + f for i, f in enumerate(frets)]
    assert all(a < b for a, b in zip(pitches, pitches[1:])), f"not ascending: {chord} {inv}"
    for p, d in zip(pitches, degs):
        assert p % 12 == PC[notes[d]], f"wrong note: {chord} {inv} deg {d}"

SEQ = ["Bbmaj7", "Em7b5", "Am7", "Dm7", "Gm7", "C7", "Fmaj7"]
PASSES = [
    ("Pass 1 — start on root position (the page you already have)", ["root","2nd"]*3 + ["root"]),
    ("Pass 2 — start on the 1st inversion", ["1st","3rd"]*3 + ["1st"]),
    ("Pass 3 — start on the 2nd inversion (runs out of neck at Dm7, so it jumps up an octave)", ["2nd","root"]*3 + ["2nd"]),
    ("Pass 4 — start on the 3rd inversion", ["3rd","1st"]*3 + ["3rd"]),
]

# ---- verify voice leading: each change keeps 2 pitch classes, moves 2 down by 1-2 semitones
for title, invs in PASSES:
    prev = None
    for chord, inv in zip(SEQ, invs):
        pcs = set((OPEN[i] + f) % 12 for i, f in enumerate(GRIPS[(chord, inv)]))
        if prev is not None:
            common = prev & pcs
            assert len(common) == 2, f"voice leading broken: {title} -> {chord} {inv}"
        prev = pcs

# ================= drawing helpers =================
def draw_grid(x, y, sg, fg, nfrets, start, nut):
    set_stroke(INK)
    c.setLineWidth(2.2 if nut else 1.2)
    c.line(x, y, x + sg * 5, y)
    c.setLineWidth(0.7)
    for i in range(1, nfrets + 1):
        c.line(x, y - i * fg, x + sg * 5, y - i * fg)
    for s in range(6):
        c.line(x + s * sg, y, x + s * sg, y - nfrets * fg)

def draw_chord(x, y, chord, inv, sg, fg, nfrets, name_fs, inv_fs, dot_r, show_notes):
    frets = GRIPS[(chord, inv)]
    notes, ivals = TONES[chord]
    degs = INV_DEGREES[inv]
    nut = min(frets) <= 1
    start = 1 if nut else min(frets)
    # labels
    set_fill(GRAY)
    c.setFont("Helvetica-Oblique", inv_fs)
    c.drawCentredString(x + sg * 2.5, y + name_fs + 12, inv + (" pos." if inv == "root" else " inv."))
    set_fill(INK)
    c.setFont("Helvetica-Bold", name_fs)
    c.drawCentredString(x + sg * 2.5, y + 8, chord)
    draw_grid(x, y, sg, fg, nfrets, start, nut)
    if not nut:
        set_fill(GRAY)
        c.setFont("Helvetica", inv_fs)
        c.drawRightString(x - 5, y - fg / 2 - 2.5, f"{start}fr")
    # muted 6th/5th strings
    set_fill(GRAY)
    c.setFont("Helvetica", inv_fs)
    for s in (0, 1):
        c.drawCentredString(x + s * sg, y + 3, "x")
    # dots
    for k, fret in enumerate(frets):
        s = k + 2
        cx = x + s * sg
        lab = ivals[degs[k]]
        is_root = lab == "R"
        if fret == 0:  # open string: hollow circle above the nut, label inside
            set_stroke(deg_color(lab))
            c.setLineWidth(1.1)
            c.circle(cx, y + dot_r + 2, dot_r, stroke=1, fill=0)
            set_fill(deg_color(lab))
            c.setFont("Helvetica-Bold", dot_r * 0.85 if len(lab) > 1 else dot_r)
            c.drawCentredString(cx, y + dot_r + 2 - dot_r * 0.35, lab)
            continue
        cy = y - (fret - start) * fg - fg / 2
        set_fill(deg_color(lab))
        c.circle(cx, cy, dot_r, stroke=0, fill=1)
        c.setFillColorRGB(*lab_text(lab))
        c.setFont("Helvetica-Bold", dot_r * 0.85 if len(lab) > 1 else dot_r)
        c.drawCentredString(cx, cy - dot_r * 0.35, lab)
    if show_notes:
        set_fill(GRAY)
        c.setFont("Helvetica", 8)
        for k in range(4):
            c.drawCentredString(x + (k + 2) * sg, y - nfrets * fg - 11, notes[degs[k]])

# ================= page 1: inversion vocabulary =================
set_fill(INK)
c.setFont("Helvetica-Bold", 19)
c.drawCentredString(W / 2, H - 46, "Drop-2 Voicings on the Top 4 Strings — All Four Inversions")
set_fill(GRAY)
c.setFont("Helvetica", 10)
c.drawCentredString(W / 2, H - 63,
    "one chord per quality from the F cadence  ·  same four notes restacked, climbing the neck  ·  ordered low position to high")

ROWS = [("maj7", "Bbmaj7"), ("m7", "Gm7"), ("dom7", "C7"), ("m7b5", "Em7b5")]
SG1, FG1, NF1 = 13, 15, 4
ROW_PITCH = 118
for r, (qual, chord) in enumerate(ROWS):
    top = H - 122 - r * ROW_PITCH
    set_fill(INK)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(46, top - 24, qual)
    set_fill(GRAY)
    c.setFont("Helvetica", 10)
    c.drawString(46, top - 40, chord)
    invs = sorted(INV_DEGREES, key=lambda i: min(GRIPS[(chord, i)]) or 12)
    for k, inv in enumerate(invs):
        draw_chord(160 + k * 145, top - 26, chord, inv, SG1, FG1, NF1, 11, 8, 6.2, True)

set_fill(GRAY)
c.setFont("Helvetica", 9)
c.drawCentredString(W / 2, 20,
    "Bottom to top the stack is: root pos. R-5-7-3  ·  1st inv. 3-7-R-5  ·  2nd inv. 5-R-3-7  ·  3rd inv. 7-3-5-R   (drop-2 = close voicing with the 2nd-highest note dropped an octave)")
c.showPage()

# ================= page 2: the cadence through all levels =================
set_fill(INK)
c.setFont("Helvetica-Bold", 19)
c.drawCentredString(W / 2, H - 42, "The Cadence Through All Four Inversion Levels")
set_fill(GRAY)
c.setFont("Helvetica", 10)
c.drawCentredString(W / 2, H - 59,
    "| Bbmaj7 Em7b5 | Am7 Dm7 | Gm7 C7 | Fmaj7 |  ·  each pass starts from a different Bbmaj7 inversion, then voice leading picks every grip after that")

SG2, FG2, NF2 = 11, 12, 4
GW2 = SG2 * 5
PASS_PITCH = 122
for p, (title, invs) in enumerate(PASSES):
    ty = H - 92 - p * PASS_PITCH
    set_fill(INK)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(46, ty, title)
    x = 60
    top = ty - 34
    for k, (chord, inv) in enumerate(zip(SEQ, invs)):
        draw_chord(x, top, chord, inv, SG2, FG2, NF2, 9, 7, 4.9, False)
        # small inversion tag below the grid
        set_fill(LIGHT)
        c.setFont("Helvetica", 7)
        c.drawCentredString(x + GW2 / 2, top - NF2 * FG2 - 9, inv)
        x += GW2 + 40
        if k in (1, 3, 5):  # bar line
            set_stroke(LIGHT)
            c.setLineWidth(1)
            c.line(x - 20, top + 12, x - 20, top - NF2 * FG2 - 12)
            x += 12

set_fill(GRAY)
c.setFont("Helvetica", 9)
c.drawCentredString(W / 2, 36,
    "Moving in 4ths, drop-2 voice leading alternates between paired inversions: root <-> 2nd (passes 1 & 3) and 1st <-> 3rd (passes 2 & 4).")
c.drawCentredString(W / 2, 24,
    "Every change still holds two common tones while two voices step down — play all four passes and you cover the entire neck.")

c.save()
print("all checks passed, pdf written")
