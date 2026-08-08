#!/usr/bin/env python3
"""Cycling sixths: the 7th falls one scale step to become the next chord's root.
Drop-2 on the top 4 strings, four keys starting in the same position."""
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas

W, H = landscape(letter)
c = canvas.Canvas("Cycling_Sixths_Drop2.pdf", pagesize=(W, H))

INK = (0.13, 0.13, 0.15)
ACCENT = (0.72, 0.16, 0.16)   # root
FALL = (0.13, 0.13, 0.15)     # ring: the 7th about to fall
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
PC = {"C":0,"C#":1,"Db":1,"D":2,"D#":3,"Eb":3,"E":4,"F":5,"F#":6,"G":7,"G#":8,"Ab":8,"A":9,"A#":10,"Bb":10,"B":11}
OPEN = [50, 55, 59, 64]  # midi D G B E

def tones(r, third, fifth, seventh):  # note names for degrees 1,3,5,7
    return {1: r, 3: third, 5: fifth, 7: seventh}

TONES = {
    "Gmaj7":  tones("G","B","D","F#"),   "Em7":    tones("E","G","B","D"),
    "Cmaj7":  tones("C","E","G","B"),    "Am7":    tones("A","C","E","G"),
    "F#m7b5": tones("F#","A","C","E"),   "D7":     tones("D","F#","A","C"),
    "Bm7":    tones("B","D","F#","A"),   "Fmaj7":  tones("F","A","C","E"),
    "Dm7":    tones("D","F","A","C"),    "Bm7b5":  tones("B","D","F","A"),
    "G7":     tones("G","B","D","F"),    "Emaj7":  tones("E","G#","B","D#"),
    "C#m7":   tones("C#","E","G#","B"),  "Amaj7":  tones("A","C#","E","G#"),
    "F#m7":   tones("F#","A","C#","E"),  "D#m7b5": tones("D#","F#","A","C#"),
    "B7":     tones("B","D#","F#","A"),  "G#m7":   tones("G#","B","D#","F#"),
    "Dmaj7":  tones("D","F#","A","C#"),  "G#m7b5": tones("G#","B","D","F#"),
    "E7":     tones("E","G#","B","D"),
}
def quality_ivals(name):
    if "m7b5" in name: return {1:"R",3:"b3",5:"b5",7:"b7"}
    if "maj7" in name: return {1:"R",3:"3",5:"5",7:"7"}
    if "m7" in name:   return {1:"R",3:"b3",5:"5",7:"b7"}
    return {1:"R",3:"3",5:"5",7:"b7"}  # dominant

INV_DEGREES = {"root":[1,5,7,3], "1st":[3,7,1,5], "2nd":[5,1,3,7], "3rd":[7,3,5,1]}
ROMAN = ["Imaj7","vi-7","IVmaj7","ii-7","viio7","V7","iii-7","Imaj7"]

# (chord, inversion, frets D-G-B-E)
PASSES = [
    ("Key of G — starts on root position", [
        ("Gmaj7","root",[5,7,7,7]), ("Em7","1st",[5,7,5,7]), ("Cmaj7","2nd",[5,5,5,7]), ("Am7","3rd",[5,5,5,5]),
        ("F#m7b5","root",[4,5,5,5]), ("D7","1st",[4,5,3,5]), ("Bm7","2nd",[4,4,3,5]), ("Gmaj7","3rd",[4,4,3,3])]),
    ("Key of C — starts on the 2nd inversion", [
        ("Cmaj7","2nd",[5,5,5,7]), ("Am7","3rd",[5,5,5,5]), ("Fmaj7","root",[3,5,5,5]), ("Dm7","1st",[3,5,3,5]),
        ("Bm7b5","2nd",[3,4,3,5]), ("G7","3rd",[3,4,3,3]), ("Em7","root",[2,4,3,3]), ("Cmaj7","1st",[2,4,1,3])]),
    ("Key of E — starts on the 1st inversion", [
        ("Emaj7","1st",[6,8,5,7]), ("C#m7","2nd",[6,6,5,7]), ("Amaj7","3rd",[6,6,5,5]), ("F#m7","root",[4,6,5,5]),
        ("D#m7b5","1st",[4,6,4,5]), ("B7","2nd",[4,4,4,5]), ("G#m7","3rd",[4,4,4,4]), ("Emaj7","root",[2,4,4,4])]),
    ("Key of A — starts on the 3rd inversion", [
        ("Amaj7","3rd",[6,6,5,5]), ("F#m7","root",[4,6,5,5]), ("Dmaj7","1st",[4,6,3,5]), ("Bm7","2nd",[4,4,3,5]),
        ("G#m7b5","3rd",[4,4,3,4]), ("E7","root",[2,4,3,4]), ("C#m7","1st",[2,4,2,4]), ("Amaj7","2nd",[2,2,2,4])]),
]

# ---- verify: ascending stacks, correct notes, and one falling voice per change
for title, seq in PASSES:
    prev = None
    for chord, inv, frets in seq:
        degs = INV_DEGREES[inv]
        pitches = [OPEN[i] + f for i, f in enumerate(frets)]
        assert all(a < b for a, b in zip(pitches, pitches[1:])), f"not ascending: {chord} {inv}"
        for p, d in zip(pitches, degs):
            assert p % 12 == PC[TONES[chord][d]], f"wrong note: {chord} {inv} deg {d}"
        if prev is not None:
            diffs = [(i, b - a) for i, (a, b) in enumerate(zip(prev, frets)) if a != b]
            assert len(diffs) == 1 and diffs[0][1] in (-1, -2), f"voice leading broken into {chord}: {diffs}"
        prev = frets

# ================= drawing =================
SG, FG, NF = 11, 12, 4
GW = SG * 5

def draw_chord(x, y, chord, inv, frets, roman, ring_seventh):
    degs = INV_DEGREES[inv]
    ivals = quality_ivals(chord)
    nut = min(frets) <= 1
    start = 1 if nut else min(frets)
    set_fill(GRAY)
    c.setFont("Helvetica-Oblique", 7)
    c.drawCentredString(x + GW / 2, y + 22, roman.replace("viio7", "viiø7"))
    set_fill(INK)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(x + GW / 2, y + 11, chord)
    # grid
    set_stroke(INK)
    c.setLineWidth(2.0 if nut else 1.1)
    c.line(x, y, x + GW, y)
    c.setLineWidth(0.6)
    for i in range(1, NF + 1):
        c.line(x, y - i * FG, x + GW, y - i * FG)
    for s in range(6):
        c.line(x + s * SG, y, x + s * SG, y - NF * FG)
    if not nut:
        set_fill(GRAY)
        c.setFont("Helvetica", 6.5)
        c.drawRightString(x - 4, y - FG / 2 - 2.5, f"{start}fr")
    set_fill(GRAY)
    c.setFont("Helvetica", 6.5)
    for s in (0, 1):
        c.drawCentredString(x + s * SG, y + 3, "x")
    for k, fret in enumerate(frets):
        s = k + 2
        cx = x + s * SG
        cy = y - (fret - start) * FG - FG / 2
        lab = ivals[degs[k]]
        is_root = degs[k] == 1
        set_fill(deg_color(lab))
        c.circle(cx, cy, 4.9, stroke=0, fill=1)
        if ring_seventh and degs[k] == 7:  # this voice falls next
            set_stroke(FALL)
            c.setLineWidth(1.3)
            c.circle(cx, cy, 6.7, stroke=1, fill=0)
        c.setFillColorRGB(*lab_text(lab))
        c.setFont("Helvetica-Bold", 4.2 if len(lab) > 1 else 4.9)
        c.drawCentredString(cx, cy - 1.7, lab)
    # inversion tag
    set_fill(LIGHT)
    c.setFont("Helvetica", 7)
    c.drawCentredString(x + GW / 2, y - NF * FG - 9, inv)

# ---- header
set_fill(INK)
c.setFont("Helvetica-Bold", 19)
c.drawCentredString(W / 2, H - 42, "Cycling Sixths — One Falling Voice")
set_fill(GRAY)
c.setFont("Helvetica", 10)
c.drawCentredString(W / 2, H - 59,
    "the 7th falls one scale step and becomes the root of the chord a 6th away:  I > vi > IV > ii > viiø > V > iii > I   ·   drop-2 on the top 4 strings, four keys from the same position")

PASS_PITCH = 122
for p, (title, seq) in enumerate(PASSES):
    ty = H - 92 - p * PASS_PITCH
    set_fill(INK)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(46, ty, title)
    x = 52
    top = ty - 34
    for k, (chord, inv, frets) in enumerate(seq):
        draw_chord(x, top, chord, inv, frets, ROMAN[k], ring_seventh=(k < len(seq) - 1))
        x += GW + 33
        if k in (1, 3, 5):
            set_stroke(LIGHT)
            c.setLineWidth(1)
            c.line(x - 17, top + 12, x - 17, top - NF * FG - 12)
            x += 10

set_fill(GRAY)
c.setFont("Helvetica", 8.5)
c.drawCentredString(W / 2, 36,
    "Ringed note = the 7th that falls a step to become the next root  ·  red = root, blue = 3rd, amber = 7th  ·  only one note moves per change")
c.drawCentredString(W / 2, 24,
    "The new root lands on a different string each time, so the inversions rotate in order (root > 1st > 2nd > 3rd).  Starting G, C, E, A in one position begins each pass on a different inversion.")

c.save()
print("all checks passed, pdf written")
