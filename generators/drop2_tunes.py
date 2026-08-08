#!/usr/bin/env python3
"""Chapter 4: three tunes in drop-2 across all three string sets (cascade per phrase)."""
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas

W, H = landscape(letter)
c = canvas.Canvas("Drop2_Tunes_Ch4.pdf", pagesize=(W, H))

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
def tones(r,t3,t5,t7): return {1:r,3:t3,5:t5,7:t7}
TONES = {
    "F7":tones("F","A","C","Eb"),     "Bb7":tones("Bb","D","F","Ab"),   "Cm7":tones("C","Eb","G","Bb"),
    "Bdim7":tones("B","D","F","Ab"),  "D7":tones("D","F#","A","C"),     "Gm7":tones("G","Bb","D","F"),
    "C7":tones("C","E","G","Bb"),     "Bbmaj7":tones("Bb","D","F","A"), "Am7b5":tones("A","C","Eb","G"),
    "Fm7":tones("F","Ab","C","Eb"),   "Eb7":tones("Eb","G","Bb","Db"),  "Ebm7":tones("Eb","Gb","Bb","Db"),
    "Ab7":tones("Ab","C","Eb","Gb"),  "Dm7":tones("D","F","A","C"),     "G7":tones("G","B","D","F"),
    "Dbm7":tones("Db","E","Ab","B"),  "Gb7":tones("Gb","Bb","Db","E"),  "F#m7b5":None,
    "Ebmaj7":tones("Eb","G","Bb","D"),
}
del TONES["F#m7b5"]
def quality_ivals(name):
    if "dim" in name:   return {1:"R",3:"b3",5:"b5",7:"o7"}
    if "m7b5" in name:  return {1:"R",3:"b3",5:"b5",7:"b7"}
    if "maj7" in name:  return {1:"R",3:"3",5:"5",7:"7"}
    if "m7" in name:    return {1:"R",3:"b3",5:"5",7:"b7"}
    return {1:"R",3:"3",5:"5",7:"b7"}
INV_DEGREES = {"root":[1,5,7,3], "1st":[3,7,1,5], "2nd":[5,1,3,7], "3rd":[7,3,5,1]}

STRSETS = [
    {"name":"4-3-2-1", "opens":[50,55,59,64], "s_offset":2},
    {"name":"5-4-3-2", "opens":[45,50,55,59], "s_offset":1},
    {"name":"6-5-4-3", "opens":[40,45,50,55], "s_offset":0},
]

def compute_drop2(chord, inv, opens):
    pcs = [PC[TONES[chord][d]] for d in INV_DEGREES[inv]]
    f0 = (pcs[0] - opens[0]) % 12
    for base in (f0, f0 + 12):
        frets, p = [base], opens[0] + base
        ok = True
        for i in range(1, 4):
            step = (pcs[i] - p) % 12 or 12
            p += step
            f = p - opens[i]
            if f < 0:
                ok = False
                break
            frets.append(f)
        if ok:
            return frets
    raise AssertionError(f"no placement {chord} {inv}")

def degrees_of(frets, opens, chord):
    inv_pc = {PC[n]: d for d, n in TONES[chord].items()}
    degs = [inv_pc[(o + f) % 12] for f, o in zip(frets, opens)]
    assert sorted(degs) == [1, 3, 5, 7]
    return degs

def candidates(chord, si):
    out = []
    S = STRSETS[si]
    for inv in INV_DEGREES:
        base = compute_drop2(chord, inv, S["opens"])
        for shift in (-12, 0, 12):
            fr = [f + shift for f in base]
            if min(fr) < 1 or max(fr) > 11 or min(fr) > 9 or max(fr) - min(fr) > 5:
                continue
            out.append((si, inv, fr, [o + f for o, f in zip(S["opens"], fr)]))
    return out

def dp_pick(seq, set_of_event, start_pos=5):
    cands = [candidates(ch, set_of_event[i]) for i, ch in enumerate(seq)]
    INF = float("inf")
    n = len(seq)
    cost = [[abs(min(fr) - start_pos) * 0.5 for _, _, fr, _ in cands[0]]] + \
           [[INF] * len(cands[i]) for i in range(1, n)]
    back = [[-1] * len(cands[i]) for i in range(n)]
    for i in range(1, n):
        same_set = set_of_event[i] == set_of_event[i - 1]
        for j, (_, _, frj, pj) in enumerate(cands[i]):
            for k, (_, _, frk, pk) in enumerate(cands[i - 1]):
                move = sum(abs(a - b) for a, b in zip(pk, pj))
                pos = abs(min(frj) - min(frk))
                cc = cost[i - 1][k] + (move + 2.0 * pos if same_set else 0.6 * pos)
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
def draw_d2(x, y, chord, si, inv, frets, sg, fg, nf, name_fs, dot_r):
    S = STRSETS[si]
    degs = degrees_of(frets, S["opens"], chord)
    iv = quality_ivals(chord)
    start = min(frets)
    gw = sg * 5
    set_fill(INK)
    c.setFont("Helvetica-Bold", name_fs)
    c.drawCentredString(x + gw / 2, y + 10, chord)
    set_stroke(INK)
    c.setLineWidth(1.1)
    c.line(x, y, x + gw, y)
    c.setLineWidth(0.6)
    for i in range(1, nf + 1):
        c.line(x, y - i * fg, x + gw, y - i * fg)
    for s in range(6):
        c.line(x + s * sg, y, x + s * sg, y - nf * fg)
    set_fill(GRAY)
    c.setFont("Helvetica", 6.5)
    c.drawRightString(x - (10 if S["s_offset"] == 0 else 4), y - fg / 2 - 2.5, f"{start}fr")
    for s in range(6):
        if not (S["s_offset"] <= s < S["s_offset"] + 4):
            c.drawCentredString(x + s * sg, y + 3, "x")
    for k, fret in enumerate(frets):
        s = k + S["s_offset"]
        cx = x + s * sg
        lab = iv[degs[k]]
        cy = y - (fret - start) * fg - fg / 2
        set_fill(deg_color(lab))
        c.circle(cx, cy, dot_r, stroke=0, fill=1)
        c.setFillColorRGB(*lab_text(lab))
        c.setFont("Helvetica-Bold", dot_r * 0.85 if len(lab) > 1 else dot_r)
        c.drawCentredString(cx, cy - dot_r * 0.35, lab)
    set_fill(LIGHT)
    c.setFont("Helvetica", 6.5)
    c.drawCentredString(x + gw / 2, y - nf * fg - 8, S["name"])

def tune_page(title, subtitle, bar_rows, set_of_row, footers, start_pos=5):
    seq, set_of_event, row_of_event = [], [], []
    for ri, row in enumerate(bar_rows):
        for _, bar in row:
            for ch in bar:
                seq.append(ch)
                set_of_event.append(set_of_row[ri])
                row_of_event.append(ri)
    chosen = dp_pick(seq, set_of_event, start_pos)
    for ch, (si, inv, fr, p) in zip(seq, chosen):
        print(f"  {ch:7s} {inv:4s} {STRSETS[si]['name']}  {'-'.join(map(str, fr))}")
    set_fill(INK)
    c.setFont("Helvetica-Bold", 19)
    c.drawCentredString(W / 2, H - 42, title)
    set_fill(GRAY)
    c.setFont("Helvetica", 10)
    c.drawCentredString(W / 2, H - 59, subtitle)
    SG, FG = 10, 11
    GW = SG * 5
    ROW_P = 150
    ev = 0
    for ri, row in enumerate(bar_rows):
        # row nfrets from its events
        row_events = [chosen[i] for i in range(len(seq)) if row_of_event[i] == ri]
        nf = max(4, max(max(fr) - min(fr) + 1 for _, _, fr, _ in row_events))
        by = H - 106 - ri * ROW_P
        n_bars = len(row)
        bw = (W - 88) / n_bars
        for bi, (blabel, bar) in enumerate(row):
            bx = 44 + bi * bw
            set_fill(LIGHT)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(bx + 4, by - 8, blabel)
            set_stroke(LIGHT)
            c.setLineWidth(1)
            c.line(bx, by, bx, by - ROW_P + 30)
            if bi == n_bars - 1:
                c.line(bx + bw, by, bx + bw, by - ROW_P + 30)
            n_ch = len(bar)
            gap = 20
            tw = n_ch * GW + (n_ch - 1) * gap
            sx = bx + (bw - tw) / 2
            gy = by - 28
            for _ in range(n_ch):
                si, inv, fr, p = chosen[ev]
                draw_d2(sx, gy, seq[ev], si, inv, fr, SG, FG, nf, 9.5, 4.7)
                sx += GW + gap
                ev += 1
    set_fill(GRAY)
    c.setFont("Helvetica", 8.5)
    for i, ln in enumerate(footers):
        c.drawCentredString(W / 2, 32 - i * 12, ln)

# ---- page 1: basic jazz blues in F
print("jazz blues F (drop-2):")
JB = [
    [("1", ["F7"]), ("2", ["Bb7"]), ("3", ["F7"]), ("4", ["Cm7", "F7"])],
    [("5", ["Bb7"]), ("6", ["Bdim7"]), ("7", ["F7"]), ("8", ["D7"])],
    [("9", ["Gm7"]), ("10", ["C7"]), ("11", ["F7", "D7"]), ("12", ["Gm7", "C7"])],
]
tune_page("Basic Jazz Blues in F — Drop-2 Etude, Top Four Strings",
    "| F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bo7 | F7 | D7 | Gm7 | C7 | F7 D7 | Gm7 C7 |  ·  one string set, minimum voice movement from grip to grip",
    JB, [0, 0, 0],
    ["red = root, blue = 3rd, amber = 7th  ·  o7 = diminished 7th  ·  every change is the smallest available move — watch which voices hold and which step",
     "to move this etude to the middle or inner set, translate each inversion using the Chapter 2 vocabulary pages"])
c.showPage()

# ---- page 2: Bird blues in Bb
print("bird blues Bb (drop-2):")
BB = [
    [("1", ["Bbmaj7"]), ("2", ["Am7b5", "D7"]), ("3", ["Gm7", "C7"]), ("4", ["Fm7", "Bb7"])],
    [("5", ["Eb7"]), ("6", ["Ebm7", "Ab7"]), ("7", ["Dm7", "G7"]), ("8", ["Dbm7", "Gb7"])],
    [("9", ["Cm7"]), ("10", ["F7"]), ("11", ["Bbmaj7", "G7"]), ("12", ["Cm7", "F7"])],
]
tune_page("Bird Blues in Bb — Drop-2 Etude, Top Four Strings",
    "\"Blues for Alice\" changes  ·  one string set, minimum voice movement  ·  Am7b5 is the full four-note grip (the b5 the shells left out)",
    BB, [0, 0, 0],
    ["red = root, blue = 3rd, amber = 7th  ·  the descending ii-Vs of bars 6-8 walk down the neck in strict parallel voice leading — the heart of the etude",
     "to move this etude to the middle or inner set, translate each inversion using the Chapter 2 vocabulary pages"])
c.showPage()

# ---- page 3: rhythm changes in Bb
print("rhythm changes Bb (drop-2):")
RC = [
    [("1", ["Bbmaj7", "G7"]), ("2", ["Cm7", "F7"]), ("3", ["Dm7", "G7"]), ("4", ["Cm7", "F7"])],
    [("5", ["Fm7", "Bb7"]), ("6", ["Ebmaj7", "Ab7"]), ("7", ["Dm7", "G7"]), ("8", ["Cm7", "F7"])],
    [("B: 1-2", ["D7"]), ("B: 3-4", ["G7"]), ("B: 5-6", ["C7"]), ("B: 7-8", ["F7"])],
]
tune_page("Rhythm Changes in Bb — Drop-2 Etude, Top Four Strings",
    "A section (bars 1-8) and the bridge, two bars per chord  ·  one string set, minimum voice movement  ·  form is AABA",
    RC, [0, 0, 0],
    ["red = root, blue = 3rd, amber = 7th  ·  two chords per bar in the A — drop-2 pairs move mostly by step while half the chord holds",
     "on the final A, land bar 8 on Bbmaj7  ·  to move this etude to another set, translate each inversion via the Chapter 2 vocabulary"])
c.save()
print("pdf written")
