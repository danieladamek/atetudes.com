#!/usr/bin/env python3
"""Chapter 1 (shells): forms on all three root strings + jazz blues in F + rhythm changes in Bb.
Shell = R + 3 + 7. Grips computed from pitch classes; tune sequences chosen by DP for smoothness."""
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas

W, H = landscape(letter)
c = canvas.Canvas("Shells_Ch1.pdf", pagesize=(W, H))

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

PC = {"C":0,"C#":1,"Db":1,"D":2,"Eb":3,"E":4,"F":5,"F#":6,"Gb":6,"G":7,"G#":8,"Ab":8,"A":9,"Bb":10,"B":11}
OPENS = [40, 45, 50, 55, 59, 64]

def tones(r,t3,t7): return {1:r,3:t3,7:t7}   # shells: no 5th
TONES = {
    "Amaj7":tones("A","C#","G#"), "A7":tones("A","C#","G"), "Am7":tones("A","C","G"),
    "Dmaj7":tones("D","F#","C#"), "D7":tones("D","F#","C"), "Dm7":tones("D","F","C"),
    "Gmaj7":tones("G","B","F#"),  "G7":tones("G","B","F"),  "Gm7":tones("G","Bb","F"),
    "F7":tones("F","A","Eb"),     "Bb7":tones("Bb","D","Ab"), "Cm7":tones("C","Eb","Bb"),
    "Bdim7":tones("B","D","Ab"),  "C7":tones("C","E","Bb"),
    "Bbmaj7":tones("Bb","D","A"), "Fm7":tones("F","Ab","Eb"), "Ebmaj7":tones("Eb","G","D"),
    "Ab7":tones("Ab","C","Gb"),
}
def ivals(name):
    if "dim" in name:  return {1:"R",3:"b3",7:"o7"}
    if "maj7" in name: return {1:"R",3:"3",7:"7"}
    if "m7" in name:   return {1:"R",3:"b3",7:"b7"}
    return {1:"R",3:"3",7:"b7"}

FORMS = [  # (label, root string, 7th string, 3rd string)  — strings 0=lowE..5
    ("6th-string root", 0, 2, 3),
    ("5th-string root", 1, 3, 4),
    ("4th-string root", 2, 4, 5),
]

def nearest(base, rf):
    cands = [base + 12 * k for k in (-1, 0, 1)]
    return min(cands, key=lambda f: abs(f - rf))

def shell_grip(chord, form, rf):
    _, rs, s7, s3 = ("", *form[1:])
    f7 = nearest((PC[TONES[chord][7]] - OPENS[s7]) % 12, rf)
    f3 = nearest((PC[TONES[chord][3]] - OPENS[s3]) % 12, rf)
    frets = {rs: rf, s7: f7, s3: f3}
    pitches = [OPENS[s] + f for s, f in sorted(frets.items())]
    assert all(a < b for a, b in zip(pitches, pitches[1:])), f"{chord} {form[0]} not ascending"
    for s, f in frets.items():
        assert 0 <= f <= 13, f"{chord} {form[0]} fret {f}"
    return frets  # dict string->fret

def shell_candidates(chord):
    out = []
    for form in FORMS:
        rs = form[1]
        rf0 = (PC[TONES[chord][1]] - OPENS[rs]) % 12
        for rf in (rf0, rf0 + 12):
            if not 1 <= rf <= 10:
                continue
            try:
                fr = shell_grip(chord, form, rf)
            except AssertionError:
                continue
            if max(fr.values()) - min(fr.values()) > 4 or max(fr.values()) > 11:
                continue
            pitches = sorted(OPENS[s] + f for s, f in fr.items())
            out.append((form, fr, pitches))
    return out

def dp_pick(seq, start_pos=3):
    cands = [shell_candidates(ch) for ch in seq]
    INF = float("inf")
    n = len(seq)
    cost = [[abs(min(fr.values()) - start_pos) * 0.5 for _, fr, _ in cands[0]]] + \
           [[INF] * len(cands[i]) for i in range(1, n)]
    back = [[-1] * len(cands[i]) for i in range(n)]
    for i in range(1, n):
        for j, (_, frj, pj) in enumerate(cands[i]):
            for k, (_, frk, pk) in enumerate(cands[i - 1]):
                cc = (cost[i - 1][k] + sum(abs(a - b) for a, b in zip(pk, pj))
                      + 2.0 * abs(min(frj.values()) - min(frk.values())))
                if cc < cost[i][j]:
                    cost[i][j], back[i][j] = cc, k
    j = min(range(len(cands[n - 1])), key=lambda j: cost[n - 1][j])
    path = [j]
    for i in range(n - 1, 0, -1):
        j = back[i][j]
        path.append(j)
    path.reverse()
    return [cands[i][path[i]] for i in range(n)]

# ================= drawing =================
def draw_shell(x, y, chord, frets_dict, sg, fg, nf, name_fs, dot_r, notes=False):
    iv = ivals(chord)
    inv_pc = {PC[n]: d for d, n in TONES[chord].items()}
    start = 1 if min(frets_dict.values()) <= 1 else min(frets_dict.values())
    nut = min(frets_dict.values()) <= 1
    gw = sg * 5
    set_fill(INK)
    c.setFont("Helvetica-Bold", name_fs)
    c.drawCentredString(x + gw / 2, y + 10, chord)
    set_stroke(INK)
    c.setLineWidth(2.0 if nut else 1.1)
    c.line(x, y, x + gw, y)
    c.setLineWidth(0.6)
    for i in range(1, nf + 1):
        c.line(x, y - i * fg, x + gw, y - i * fg)
    for s in range(6):
        c.line(x + s * sg, y, x + s * sg, y - nf * fg)
    if not nut:
        set_fill(GRAY)
        c.setFont("Helvetica", 6.5)
        c.drawRightString(x - (10 if 0 in frets_dict else 4), y - fg / 2 - 2.5, f"{start}fr")
    set_fill(GRAY)
    c.setFont("Helvetica", 6.5)
    for s in range(6):
        if s not in frets_dict:
            c.drawCentredString(x + s * sg, y + 3, "x")
    for s, f in sorted(frets_dict.items()):
        cx = x + s * sg
        deg = inv_pc[(OPENS[s] + f) % 12]
        lab = iv[deg]
        is_root = deg == 1
        cy = y - (f - start) * fg - fg / 2
        set_fill(deg_color(lab))
        c.circle(cx, cy, dot_r, stroke=0, fill=1)
        c.setFillColorRGB(*lab_text(lab))
        c.setFont("Helvetica-Bold", dot_r * 0.85 if len(lab) > 1 else dot_r)
        c.drawCentredString(cx, cy - dot_r * 0.35, lab)
        if notes:
            set_fill(GRAY)
            c.setFont("Helvetica", 7.5)
            c.drawCentredString(cx, y - nf * fg - 10, TONES[chord][deg])

# ---------------- page 1: the forms ----------------
set_fill(INK)
c.setFont("Helvetica-Bold", 19)
c.drawCentredString(W / 2, H - 42, "Shell Voicings — The Three Forms")
set_fill(GRAY)
c.setFont("Helvetica", 10)
c.drawCentredString(W / 2, H - 59,
    "root + 3rd + 7th, no 5th  ·  one form per root string, shown at the 5th fret  ·  every shape is movable")

ROWS = [(FORMS[0], "A", ["Amaj7", "A7", "Am7"]),
        (FORMS[1], "D", ["Dmaj7", "D7", "Dm7"]),
        (FORMS[2], "G", ["Gmaj7", "G7", "Gm7"])]
SG1, FG1, NF1 = 13, 14, 4
ROW_PITCH = 152
for r, (form, rootname, chords) in enumerate(ROWS):
    top = H - 120 - r * ROW_PITCH
    set_fill(INK)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(46, top - 20, form[0].capitalize())
    set_fill(GRAY)
    c.setFont("Helvetica", 9.5)
    c.drawString(46, top - 35, f"root: {rootname}, 5th fret")
    for k, chord in enumerate(chords):
        fr = shell_grip(chord, form, 5)
        draw_shell(230 + k * 180, top - 22, chord, fr, SG1, FG1, NF1, 12, 6.2, notes=True)
set_fill(GRAY)
c.setFont("Helvetica", 9)
c.drawCentredString(W / 2, 30,
    "red = root, blue = 3rd, amber = 7th  ·  only the 3rd and 7th define quality, so the 5th is omitted — mute the unused strings  ·  these three forms put a shell under your fingers anywhere on the neck")
c.showPage()

# ---------------- tune pages ----------------
def tune_page(title, subtitle, bar_rows, footers, start_pos=3):
    """bar_rows: list of rows; each row = list of (bar_label, [chords])."""
    seq = [ch for row in bar_rows for _, bar in row for ch in bar]
    chosen = dp_pick(seq, start_pos)
    for ch, (form, fr, p) in zip(seq, chosen):
        print(f"  {ch:7s} {form[0][:3]}  " + ",".join(f"{s}:{f}" for s, f in sorted(fr.items())))
    set_fill(INK)
    c.setFont("Helvetica-Bold", 19)
    c.drawCentredString(W / 2, H - 42, title)
    set_fill(GRAY)
    c.setFont("Helvetica", 10)
    c.drawCentredString(W / 2, H - 59, subtitle)
    SG, FG, NF = 10, 12, 4
    GW = SG * 5
    n_rows = len(bar_rows)
    ROW_P = 150 if n_rows == 3 else 145
    ev = 0
    for ri, row in enumerate(bar_rows):
        by = H - 108 - ri * ROW_P
        n_bars = len(row)
        bw = (W - 88) / n_bars
        for bi, (blabel, bar) in enumerate(row):
            bx = 44 + bi * bw
            set_fill(LIGHT)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(bx + 4, by - 8, blabel)
            set_stroke(LIGHT)
            c.setLineWidth(1)
            c.line(bx, by, bx, by - ROW_P + 28)
            if bi == n_bars - 1:
                c.line(bx + bw, by, bx + bw, by - ROW_P + 28)
            n_ch = len(bar)
            gap = 22
            tw = n_ch * GW + (n_ch - 1) * gap
            sx = bx + (bw - tw) / 2
            gy = by - 30
            for _ in range(n_ch):
                form, fr, p = chosen[ev]
                draw_shell(sx, gy, seq[ev], fr, SG, FG, NF, 9.5, 4.9)
                # form tag
                set_fill(LIGHT)
                c.setFont("Helvetica", 6.5)
                c.drawCentredString(sx + GW / 2, gy - NF * FG - 8, form[0][:3] + " root")
                sx += GW + gap
                ev += 1
    set_fill(GRAY)
    c.setFont("Helvetica", 8.5)
    for i, ln in enumerate(footers):
        c.drawCentredString(W / 2, 34 - i * 12, ln)

# page 2: basic jazz blues in F
print("jazz blues F (shells):")
JB = [
    [("1", ["F7"]), ("2", ["Bb7"]), ("3", ["F7"]), ("4", ["Cm7", "F7"])],
    [("5", ["Bb7"]), ("6", ["Bdim7"]), ("7", ["F7"]), ("8", ["D7"])],
    [("9", ["Gm7"]), ("10", ["C7"]), ("11", ["F7", "D7"]), ("12", ["Gm7", "C7"])],
]
tune_page("Basic Jazz Blues in F — Shell Voicings",
    "| F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bo7 | F7 | D7 | Gm7 | C7 | F7 D7 | Gm7 C7 |  ·  each grip's root string is tagged below it",
    JB,
    ["red = root, blue = 3rd, amber = 7th  ·  o7 = diminished 7th  ·  grips chosen across all three forms for minimum voice movement",
     "two beats per chord when a bar has two"])
c.showPage()

# page 3: rhythm changes in Bb (A section + bridge)
print("rhythm changes Bb (shells):")
RC = [
    [("1", ["Bbmaj7", "G7"]), ("2", ["Cm7", "F7"]), ("3", ["Dm7", "G7"]), ("4", ["Cm7", "F7"])],
    [("5", ["Fm7", "Bb7"]), ("6", ["Ebmaj7", "Ab7"]), ("7", ["Dm7", "G7"]), ("8", ["Cm7", "F7"])],
    [("B: 1-2", ["D7"]), ("B: 3-4", ["G7"]), ("B: 5-6", ["C7"]), ("B: 7-8", ["F7"])],
]
tune_page("Rhythm Changes in Bb — Shell Voicings",
    "A section (bars 1-8) and the bridge (two bars per chord)  ·  form is AABA: play A twice, bridge, then A again",
    RC,
    ["red = root, blue = 3rd, amber = 7th  ·  the A section moves two chords per bar — shells keep it light enough to breathe",
     "bar 8 turns the corner back into the next A; on the final A, land bar 8 on Bbmaj7"],
    start_pos=5)
c.save()
print("pdf written")
