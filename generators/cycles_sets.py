#!/usr/bin/env python3
"""Sixths & thirds cycles transplanted to the middle (5-4-3-2) and inner (6-5-4-3) string sets.
Voicings are DERIVED from the starting grip by the voice-leading rule itself, then verified."""
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas

W, H = landscape(letter)
c = canvas.Canvas("Drop2_Cycles_Middle_Inner_Sets.pdf", pagesize=(W, H))

INK = (0.13, 0.13, 0.15)
ACCENT = (0.72, 0.16, 0.16)
MOVE = (0.13, 0.13, 0.15)
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

# ================= music data =================
PC = {"C":0,"C#":1,"D":2,"D#":3,"E":4,"F":5,"F#":6,"G":7,"G#":8,"A":9,"Bb":10,"B":11}

def tones(r,t3,t5,t7): return {1:r,3:t3,5:t5,7:t7}
TONES = {
    "Gmaj7":tones("G","B","D","F#"),  "Am7":tones("A","C","E","G"),    "Bm7":tones("B","D","F#","A"),
    "Cmaj7":tones("C","E","G","B"),   "D7":tones("D","F#","A","C"),    "Em7":tones("E","G","B","D"),
    "F#m7b5":tones("F#","A","C","E"), "Dm7":tones("D","F","A","C"),    "Fmaj7":tones("F","A","C","E"),
    "G7":tones("G","B","D","F"),      "Bm7b5":tones("B","D","F","A"),  "Emaj7":tones("E","G#","B","D#"),
    "F#m7":tones("F#","A","C#","E"),  "G#m7":tones("G#","B","D#","F#"),"Amaj7":tones("A","C#","E","G#"),
    "B7":tones("B","D#","F#","A"),    "C#m7":tones("C#","E","G#","B"), "D#m7b5":tones("D#","F#","A","C#"),
    "Dmaj7":tones("D","F#","A","C#"), "E7":tones("E","G#","B","D"),    "G#m7b5":tones("G#","B","D","F#"),
}
def quality_ivals(name):
    if "m7b5" in name: return {1:"R",3:"b3",5:"b5",7:"b7"}
    if "maj7" in name: return {1:"R",3:"3",5:"5",7:"7"}
    if "m7" in name:   return {1:"R",3:"b3",5:"5",7:"b7"}
    return {1:"R",3:"3",5:"5",7:"b7"}

KEY_CHORDS = {
    "G": ["Gmaj7","Am7","Bm7","Cmaj7","D7","Em7","F#m7b5"],
    "C": ["Cmaj7","Dm7","Em7","Fmaj7","G7","Am7","Bm7b5"],
    "E": ["Emaj7","F#m7","G#m7","Amaj7","B7","C#m7","D#m7b5"],
    "A": ["Amaj7","Bm7","C#m7","Dmaj7","E7","F#m7","G#m7b5"],
}
SIXTHS = [0,5,3,1,6,4,2,0]   # I vi IV ii viio V iii I
THIRDS = [0,2,4,6,1,3,5,0]   # I iii V viio ii IV vi I
ROMAN6 = ["Imaj7","vi-7","IVmaj7","ii-7","viio7","V7","iii-7","Imaj7"]
ROMAN3 = ["Imaj7","iii-7","V7","viio7","ii-7","IVmaj7","vi-7","Imaj7"]
INV_NAME = {1:"root", 3:"1st", 5:"2nd", 7:"3rd"}

SETS = {
    "middle": {"opens":[45,50,55,59], "s_offset":1, "label":"strings 5-4-3-2 (A-D-G-B)"},
    "inner":  {"opens":[40,45,50,55], "s_offset":0, "label":"strings 6-5-4-3 (E-A-D-G)"},
}
STARTS = {  # per set, per key: Imaj7 grip near 5th position
    "middle": {"G":[5,5,4,7], "C":[3,5,4,5], "E":[6,6,4,5], "A":[4,6,2,5]},
    "inner":  {"G":[3,5,4,4], "C":[3,3,2,4], "E":[4,6,2,4], "A":[4,4,2,2]},
}

def degrees_of(frets, opens, chord):
    inv_pc = {PC[n]: d for d, n in TONES[chord].items()}
    degs = []
    for f, o in zip(frets, opens):
        pc = (o + f) % 12
        assert pc in inv_pc, f"{chord}: pitch class {pc} not a chord tone"
        degs.append(inv_pc[pc])
    assert sorted(degs) == [1, 3, 5, 7], f"{chord}: incomplete chord {degs}"
    return degs

def run_pass(opens, start, chords, mode, jumps=None):
    frets = list(start)
    out = []
    if jumps is None:
        jumps = []
    for idx, chord in enumerate(chords):
        degs = degrees_of(frets, opens, chord)
        pitches = [o + f for o, f in zip(opens, frets)]
        assert all(a < b for a, b in zip(pitches, pitches[1:])), f"not ascending: {chord} {frets}"
        out.append((chord, INV_NAME[degs[0]], list(frets), degs))
        if idx == len(chords) - 1:
            break
        nxt = chords[idx + 1]
        if mode == "6":   # 7th falls to next root
            s = degs.index(7)
            delta = -((PC[TONES[chord][7]] - PC[TONES[nxt][1]]) % 12)
        else:             # root rises to next 7th
            s = degs.index(1)
            delta = (PC[TONES[nxt][7]] - PC[TONES[chord][1]]) % 12
        assert abs(delta) in (1, 2), f"bad step {delta} into {nxt}"
        frets[s] += delta
        if frets[s] < 0:  # ran out of neck: shift the whole chord up an octave
            frets = [f + 12 for f in frets]
            jumps.append(nxt)
    return out

PAGES = []
for set_name in ["middle", "inner"]:
    for mode, order, romans, cyc in [("6", SIXTHS, ROMAN6, "Sixths"), ("3", THIRDS, ROMAN3, "Thirds")]:
        rows = []
        for key in ["G", "C", "E", "A"]:
            chords = [KEY_CHORDS[key][i] for i in order]
            jumps = []
            seq = run_pass(SETS[set_name]["opens"], STARTS[set_name][key], chords, mode, jumps)
            rows.append((key, seq, jumps))
        PAGES.append((set_name, cyc, mode, romans, rows))

for set_name, cyc, mode, romans, rows in PAGES:
    print(f"--- {set_name} / {cyc}")
    for key, seq, jumps in rows:
        tag = f"  [8va at {', '.join(jumps)}]" if jumps else ""
        print(" ", key, " | ".join(f"{ch}({inv}) {'-'.join(str(f) for f in fr)}" for ch, inv, fr, _ in seq) + tag)

# ================= drawing =================
SG, FG = 11, 11
GW = SG * 5

def draw_chord(x, y, chord, inv, frets, degs, roman, ring_deg, s_offset, nfrets):
    ivals = quality_ivals(chord)
    nut = min(frets) <= 1
    start = 1 if nut else min(frets)
    set_fill(GRAY)
    c.setFont("Helvetica-Oblique", 7)
    c.drawCentredString(x + GW / 2, y + 22, roman.replace("viio7", "viiø7"))
    set_fill(INK)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(x + GW / 2, y + 11, chord)
    set_stroke(INK)
    c.setLineWidth(2.0 if nut else 1.1)
    c.line(x, y, x + GW, y)
    c.setLineWidth(0.6)
    for i in range(1, nfrets + 1):
        c.line(x, y - i * FG, x + GW, y - i * FG)
    for s in range(6):
        c.line(x + s * SG, y, x + s * SG, y - nfrets * FG)
    if not nut:
        set_fill(GRAY)
        c.setFont("Helvetica", 6.5)
        c.drawRightString(x - (10 if s_offset == 0 else 4), y - FG / 2 - 2.5, f"{start}fr")
    set_fill(GRAY)
    c.setFont("Helvetica", 6.5)
    for s in range(6):
        if not (s_offset <= s < s_offset + 4):
            c.drawCentredString(x + s * SG, y + 3, "x")
    for k, fret in enumerate(frets):
        s = k + s_offset
        cx = x + s * SG
        lab = ivals[degs[k]]
        is_root = degs[k] == 1
        if fret == 0:  # open string: hollow marker above the nut
            set_stroke(deg_color(lab))
            c.setLineWidth(1.1)
            c.circle(cx, y + 4.5, 3.4, stroke=1, fill=0)
            if ring_deg is not None and degs[k] == ring_deg:
                set_stroke(MOVE)
                c.circle(cx, y + 4.5, 5.2, stroke=1, fill=0)
            continue
        cy = y - (fret - start) * FG - FG / 2
        set_fill(deg_color(lab))
        c.circle(cx, cy, 4.9, stroke=0, fill=1)
        if ring_deg is not None and degs[k] == ring_deg:
            set_stroke(MOVE)
            c.setLineWidth(1.3)
            c.circle(cx, cy, 6.7, stroke=1, fill=0)
        c.setFillColorRGB(*lab_text(lab))
        c.setFont("Helvetica-Bold", 4.2 if len(lab) > 1 else 4.9)
        c.drawCentredString(cx, cy - 1.7, lab)
    set_fill(LIGHT)
    c.setFont("Helvetica", 7)
    c.drawCentredString(x + GW / 2, y - nfrets * FG - 9, inv)

SUBS = {
    "6": "the 7th falls a scale step to become the root of the chord a 6th away:  I > vi > IV > ii > viiø > V > iii > I",
    "3": "the root rises a scale step to become the 7th of the chord a 3rd away:  I > iii > V > viiø > ii > IV > vi > I",
}

for pg, (set_name, cyc, mode, romans, rows) in enumerate(PAGES):
    if pg > 0:
        c.showPage()
    set_title = "Middle Set" if set_name == "middle" else "Inner Set"
    set_fill(INK)
    c.setFont("Helvetica-Bold", 19)
    c.drawCentredString(W / 2, H - 42, f"Cycling {cyc} — {set_title}, {SETS[set_name]['label']}")
    set_fill(GRAY)
    c.setFont("Helvetica", 10)
    c.drawCentredString(W / 2, H - 59, SUBS[mode] + "   ·   same logic, new grips")
    PASS_PITCH = 125
    for p, (key, seq, jumps) in enumerate(rows):
        ty = H - 90 - p * PASS_PITCH
        nfrets = max(4, max(max(fr) - (1 if min(fr) <= 1 else min(fr)) + 1 for _, _, fr, _ in seq))
        start_inv = seq[0][1]
        set_fill(INK)
        c.setFont("Helvetica-Bold", 10.5)
        title_txt = (f"Key of {key} — starts on " +
                     ("root position" if start_inv == "root" else f"the {start_inv} inversion"))
        if jumps:
            title_txt += f"  (runs out of neck — jumps up an octave at {jumps[0]})"
        c.drawString(46, ty, title_txt)
        x = 52
        top = ty - 34
        for k, (chord, inv, frets, degs) in enumerate(seq):
            ring = (7 if mode == "6" else 1) if k < len(seq) - 1 else None
            draw_chord(x, top, chord, inv, frets, degs, romans[k], ring, SETS[set_name]["s_offset"], nfrets)
            x += GW + 33
            if k in (1, 3, 5):
                set_stroke(LIGHT)
                c.setLineWidth(1)
                c.line(x - 17, top + 12, x - 17, top - nfrets * FG - 12)
                x += 10
    set_fill(GRAY)
    c.setFont("Helvetica", 8.5)
    ring_word = ("the 7th that falls to become the next root" if mode == "6"
                 else "the root that rises to become the next 7th")
    c.drawCentredString(W / 2, 20,
        f"Ringed note = {ring_word}  ·  red = root, blue = 3rd, amber = 7th  ·  only one note moves per change  ·  every grip derived and verified by the voice-leading rule itself")

c.save()
print("pdf written")
