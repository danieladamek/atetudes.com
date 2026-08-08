#!/usr/bin/env python3
"""Cycling thirds: the root rises one scale step to become the next chord's 7th.
Drop-2 on the top 4 strings, four keys starting from the same grips as the sixths study."""
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas

W, H = landscape(letter)
c = canvas.Canvas("Cycling_Thirds_Drop2.pdf", pagesize=(W, H))

INK = (0.13, 0.13, 0.15)
ACCENT = (0.72, 0.16, 0.16)   # root
RISE = (0.13, 0.13, 0.15)     # ring: the root about to rise
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
PC = {"C":0,"C#":1,"D":2,"D#":3,"E":4,"F":5,"F#":6,"G":7,"G#":8,"A":9,"Bb":10,"B":11}
OPEN = [50, 55, 59, 64]  # midi D G B E

def tones(r, third, fifth, seventh):
    return {1: r, 3: third, 5: fifth, 7: seventh}

TONES = {
    "Gmaj7":  tones("G","B","D","F#"),   "Bm7":    tones("B","D","F#","A"),
    "D7":     tones("D","F#","A","C"),   "F#m7b5": tones("F#","A","C","E"),
    "Am7":    tones("A","C","E","G"),    "Cmaj7":  tones("C","E","G","B"),
    "Em7":    tones("E","G","B","D"),    "G7":     tones("G","B","D","F"),
    "Bm7b5":  tones("B","D","F","A"),    "Dm7":    tones("D","F","A","C"),
    "Fmaj7":  tones("F","A","C","E"),    "Emaj7":  tones("E","G#","B","D#"),
    "G#m7":   tones("G#","B","D#","F#"), "B7":     tones("B","D#","F#","A"),
    "D#m7b5": tones("D#","F#","A","C#"), "F#m7":   tones("F#","A","C#","E"),
    "Amaj7":  tones("A","C#","E","G#"),  "C#m7":   tones("C#","E","G#","B"),
    "E7":     tones("E","G#","B","D"),   "G#m7b5": tones("G#","B","D","F#"),
    "Dmaj7":  tones("D","F#","A","C#"),
}
def quality_ivals(name):
    if "m7b5" in name: return {1:"R",3:"b3",5:"b5",7:"b7"}
    if "maj7" in name: return {1:"R",3:"3",5:"5",7:"7"}
    if "m7" in name:   return {1:"R",3:"b3",5:"5",7:"b7"}
    return {1:"R",3:"3",5:"5",7:"b7"}

INV_DEGREES = {"root":[1,5,7,3], "1st":[3,7,1,5], "2nd":[5,1,3,7], "3rd":[7,3,5,1]}
ROMAN = ["Imaj7","iii-7","V7","viio7","ii-7","IVmaj7","vi-7","Imaj7"]

PASSES = [
    ("Key of G — starts on root position", [
        ("Gmaj7","root",[5,7,7,7]), ("Bm7","3rd",[7,7,7,7]), ("D7","2nd",[7,7,7,8]), ("F#m7b5","1st",[7,9,7,8]),
        ("Am7","root",[7,9,8,8]), ("Cmaj7","3rd",[9,9,8,8]), ("Em7","2nd",[9,9,8,10]), ("Gmaj7","1st",[9,11,8,10])]),
    ("Key of C — starts on the 2nd inversion", [
        ("Cmaj7","2nd",[5,5,5,7]), ("Em7","1st",[5,7,5,7]), ("G7","root",[5,7,6,7]), ("Bm7b5","3rd",[7,7,6,7]),
        ("Dm7","2nd",[7,7,6,8]), ("Fmaj7","1st",[7,9,6,8]), ("Am7","root",[7,9,8,8]), ("Cmaj7","3rd",[9,9,8,8])]),
    ("Key of E — starts on the 1st inversion", [
        ("Emaj7","1st",[6,8,5,7]), ("G#m7","root",[6,8,7,7]), ("B7","3rd",[7,8,7,7]), ("D#m7b5","2nd",[7,8,7,9]),
        ("F#m7","1st",[7,9,7,9]), ("Amaj7","root",[7,9,9,9]), ("C#m7","3rd",[9,9,9,9]), ("Emaj7","2nd",[9,9,9,11])]),
    ("Key of A — starts on the 3rd inversion", [
        ("Amaj7","3rd",[6,6,5,5]), ("C#m7","2nd",[6,6,5,7]), ("E7","1st",[6,7,5,7]), ("G#m7b5","root",[6,7,7,7]),
        ("Bm7","3rd",[7,7,7,7]), ("Dmaj7","2nd",[7,7,7,9]), ("F#m7","1st",[7,9,7,9]), ("Amaj7","root",[7,9,9,9])]),
]

# ---- verify: ascending stacks, correct notes, one voice RISES per change
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
            assert len(diffs) == 1 and diffs[0][1] in (1, 2), f"voice leading broken into {chord}: {diffs}"
        prev = frets

# ================= drawing =================
SG, FG, NF = 11, 12, 4
GW = SG * 5

def draw_chord(x, y, chord, inv, frets, roman, ring_root):
    degs = INV_DEGREES[inv]
    ivals = quality_ivals(chord)
    start = min(frets)
    set_fill(GRAY)
    c.setFont("Helvetica-Oblique", 7)
    c.drawCentredString(x + GW / 2, y + 22, roman.replace("viio7", "viiø7"))
    set_fill(INK)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(x + GW / 2, y + 11, chord)
    set_stroke(INK)
    c.setLineWidth(1.1)
    c.line(x, y, x + GW, y)
    c.setLineWidth(0.6)
    for i in range(1, NF + 1):
        c.line(x, y - i * FG, x + GW, y - i * FG)
    for s in range(6):
        c.line(x + s * SG, y, x + s * SG, y - NF * FG)
    set_fill(GRAY)
    c.setFont("Helvetica", 6.5)
    c.drawRightString(x - 4, y - FG / 2 - 2.5, f"{start}fr")
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
        if ring_root and is_root:  # this voice rises next
            set_stroke(RISE)
            c.setLineWidth(1.3)
            c.circle(cx, cy, 6.7, stroke=1, fill=0)
        c.setFillColorRGB(*lab_text(lab))
        c.setFont("Helvetica-Bold", 4.2 if len(lab) > 1 else 4.9)
        c.drawCentredString(cx, cy - 1.7, lab)
    set_fill(LIGHT)
    c.setFont("Helvetica", 7)
    c.drawCentredString(x + GW / 2, y - NF * FG - 9, inv)

# ---- header
set_fill(INK)
c.setFont("Helvetica-Bold", 19)
c.drawCentredString(W / 2, H - 42, "Cycling Thirds — One Rising Voice")
set_fill(GRAY)
c.setFont("Helvetica", 10)
c.drawCentredString(W / 2, H - 59,
    "the root rises a scale step to become the 7th of the chord a 3rd away:  I > iii > V > viiø > ii > IV > vi > I   ·   same strings and starting grips — this cycle climbs")

PASS_PITCH = 122
for p, (title, seq) in enumerate(PASSES):
    ty = H - 92 - p * PASS_PITCH
    set_fill(INK)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(46, ty, title)
    x = 52
    top = ty - 34
    for k, (chord, inv, frets) in enumerate(seq):
        draw_chord(x, top, chord, inv, frets, ROMAN[k], ring_root=(k < len(seq) - 1))
        x += GW + 33
        if k in (1, 3, 5):
            set_stroke(LIGHT)
            c.setLineWidth(1)
            c.line(x - 17, top + 12, x - 17, top - NF * FG - 12)
            x += 10

set_fill(GRAY)
c.setFont("Helvetica", 8.5)
c.drawCentredString(W / 2, 36,
    "Ringed root = the root that rises (a whole- or half-step) to become the next chord's 7th  ·  every other voice holds — only one note moves per change")
c.drawCentredString(W / 2, 24,
    "The inversions now rotate in reverse (root > 3rd > 2nd > 1st) — the retrograde of the sixths cycle.  Play the two pages back to back and you rise and fall through the position without repeating a move.")

c.save()
print("all checks passed, pdf written")
