#!/usr/bin/env python3
"""Drop-2 vocabulary + fourths-cadence levels for the middle (5-4-3-2) and inner (6-5-4-3) sets.
All grips computed from pitch classes; all voice leading derived and verified."""
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas

W, H = landscape(letter)
c = canvas.Canvas("Drop2_Vocab_Cadence_Middle_Inner.pdf", pagesize=(W, H))

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

# ================= music =================
PC = {"C":0,"C#":1,"D":2,"D#":3,"Eb":3,"E":4,"F":5,"F#":6,"G":7,"G#":8,"A":9,"Bb":10,"B":11}
def tones(r,t3,t5,t7): return {1:r,3:t3,5:t5,7:t7}
TONES = {
    "Bbmaj7":tones("Bb","D","F","A"), "Gm7":tones("G","Bb","D","F"), "C7":tones("C","E","G","Bb"),
    "Em7b5":tones("E","G","Bb","D"),  "Am7":tones("A","C","E","G"),  "Dm7":tones("D","F","A","C"),
    "Fmaj7":tones("F","A","C","E"),
}
def quality_ivals(name):
    if "m7b5" in name: return {1:"R",3:"b3",5:"b5",7:"b7"}
    if "maj7" in name: return {1:"R",3:"3",5:"5",7:"7"}
    if "m7" in name:   return {1:"R",3:"b3",5:"5",7:"b7"}
    return {1:"R",3:"3",5:"5",7:"b7"}
INV_DEGREES = {"root":[1,5,7,3], "1st":[3,7,1,5], "2nd":[5,1,3,7], "3rd":[7,3,5,1]}
INV_ORDER = ["root", "1st", "2nd", "3rd"]

SETS = {
    "middle": {"opens":[45,50,55,59], "s_offset":1, "label":"strings 5-4-3-2 (A-D-G-B)"},
    "inner":  {"opens":[40,45,50,55], "s_offset":0, "label":"strings 6-5-4-3 (E-A-D-G)"},
}

def compute_drop2(chord, inv, opens):
    """Unique compact drop-2 grip for chord+inversion on this string set."""
    pcs = [PC[TONES[chord][d]] for d in INV_DEGREES[inv]]
    f0 = (pcs[0] - opens[0]) % 12
    for base in (f0, f0+ 12):
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
        if ok and max(frets) <= 16:
            return frets
    raise AssertionError(f"no placement for {chord} {inv}")

def degrees_of(frets, opens, chord):
    inv_pc = {PC[n]: d for d, n in TONES[chord].items()}
    degs = [inv_pc[(o + f) % 12] for f, o in zip(frets, opens)]
    assert sorted(degs) == [1, 3, 5, 7], f"{chord}: incomplete {degs}"
    return degs

# verify all vocabulary grips
VOCAB_CHORDS = [("maj7","Bbmaj7"), ("m7","Gm7"), ("dom7","C7"), ("m7b5","Em7b5")]
for set_name, S in SETS.items():
    for _, chord in VOCAB_CHORDS:
        for inv in INV_ORDER:
            fr = compute_drop2(chord, inv, S["opens"])
            degs = degrees_of(fr, S["opens"], chord)
            assert degs == INV_DEGREES[inv], f"{chord} {inv}: {degs}"
            pitches = [o + f for o, f in zip(S["opens"], fr)]
            assert all(a < b for a, b in zip(pitches, pitches[1:]))

# ---- fourths cadence: roots fall in diatonic 5ths; 5 falls to new R, 7 falls to new 3; R & 3 hold
CADENCE = ["Bbmaj7", "Em7b5", "Am7", "Dm7", "Gm7", "C7", "Fmaj7"]

def run_cadence(opens, start_inv):
    frets = list(compute_drop2("Bbmaj7", start_inv, opens))
    out, jumps = [], []
    for idx, chord in enumerate(CADENCE):
        degs = degrees_of(frets, opens, chord)
        pitches = [o + f for o, f in zip(opens, frets)]
        assert all(a < b for a, b in zip(pitches, pitches[1:])), f"not ascending: {chord} {frets}"
        out.append((chord, {1:"root",3:"1st",5:"2nd",7:"3rd"}[degs[0]], list(frets), degs))
        if idx == len(CADENCE) - 1:
            break
        nxt = CADENCE[idx + 1]
        new = list(frets)
        moved = 0
        for s, d in enumerate(degs):
            if d in (5, 7):  # falls to next chord's R (from 5) or 3rd (from 7)
                target = PC[TONES[nxt][1 if d == 5 else 3]]
                delta = -((PC[TONES[chord][d]] - target) % 12)
                assert delta in (-1, -2), f"bad step {delta} into {nxt}"
                new[s] += delta
                moved += 1
        assert moved == 2
        if min(new) < 0:
            new = [f + 12 for f in new]
            jumps.append(nxt)
        frets = new
    return out, jumps

CAD = {}
for set_name, S in SETS.items():
    CAD[set_name] = []
    for inv in INV_ORDER:
        seq, jumps = run_cadence(S["opens"], inv)
        CAD[set_name].append((inv, seq, jumps))

for set_name in SETS:
    print(f"--- cadence / {set_name}")
    for inv, seq, jumps in CAD[set_name]:
        tag = f"  [8va at {jumps[0]}]" if jumps else ""
        print(" ", inv, " | ".join(f"{ch}({iv}) {'-'.join(map(str, fr))}" for ch, iv, fr, _ in seq) + tag)

# ================= drawing =================
def draw_diagram(x, y, chord, frets, degs, s_offset, nfrets, sg, fg, name_fs, dot_r,
                 above1=None, above2=None, below=None, notes=False, opens=None):
    ivals = quality_ivals(chord)
    nut = min(frets) <= 1
    start = 1 if nut else min(frets)
    gw = sg * 5
    if above2:
        set_fill(GRAY)
        c.setFont("Helvetica-Oblique", 8)
        c.drawCentredString(x + gw / 2, y + name_fs + 13, above2)
    if above1:
        set_fill(INK)
        c.setFont("Helvetica-Bold", name_fs)
        c.drawCentredString(x + gw / 2, y + 9, above1)
    set_stroke(INK)
    c.setLineWidth(2.0 if nut else 1.1)
    c.line(x, y, x + gw, y)
    c.setLineWidth(0.6)
    for i in range(1, nfrets + 1):
        c.line(x, y - i * fg, x + gw, y - i * fg)
    for s in range(6):
        c.line(x + s * sg, y, x + s * sg, y - nfrets * fg)
    if not nut:
        set_fill(GRAY)
        c.setFont("Helvetica", 6.5)
        c.drawRightString(x - (10 if s_offset == 0 else 4), y - fg / 2 - 2.5, f"{start}fr")
    set_fill(GRAY)
    c.setFont("Helvetica", 6.5)
    for s in range(6):
        if not (s_offset <= s < s_offset + 4):
            c.drawCentredString(x + s * sg, y + 3, "x")
    for k, fret in enumerate(frets):
        s = k + s_offset
        cx = x + s * sg
        lab = ivals[degs[k]]
        is_root = degs[k] == 1
        if fret == 0:
            set_stroke(deg_color(lab))
            c.setLineWidth(1.1)
            c.circle(cx, y + 4.5, 3.4, stroke=1, fill=0)
            continue
        cy = y - (fret - start) * fg - fg / 2
        set_fill(deg_color(lab))
        c.circle(cx, cy, dot_r, stroke=0, fill=1)
        c.setFillColorRGB(*lab_text(lab))
        c.setFont("Helvetica-Bold", dot_r * 0.85 if len(lab) > 1 else dot_r)
        c.drawCentredString(cx, cy - dot_r * 0.35, lab)
    if notes:
        set_fill(GRAY)
        c.setFont("Helvetica", 7.5)
        for k in range(4):
            c.drawCentredString(x + (k + s_offset) * sg, y - nfrets * fg - 10,
                                TONES[chord][degs[k]])
    if below:
        set_fill(LIGHT)
        c.setFont("Helvetica", 7)
        c.drawCentredString(x + gw / 2, y - nfrets * fg - 9, below)

# ---------------- vocabulary pages ----------------
def vocab_page(set_name):
    S = SETS[set_name]
    set_title = "Middle Set" if set_name == "middle" else "Inner Set"
    set_fill(INK)
    c.setFont("Helvetica-Bold", 19)
    c.drawCentredString(W / 2, H - 42, f"Drop-2 Vocabulary — {set_title}, {S['label']}")
    set_fill(GRAY)
    c.setFont("Helvetica", 10)
    c.drawCentredString(W / 2, H - 59,
        "all four inversions of each quality, ordered low position to high  ·  the reference grips behind this set's cadence and cycle pages")
    SG1, FG1 = 12, 12
    ROW_PITCH = 116
    for r, (qual, chord) in enumerate(VOCAB_CHORDS):
        top = H - 118 - r * ROW_PITCH
        set_fill(INK)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(46, top - 24, qual)
        set_fill(GRAY)
        c.setFont("Helvetica", 10)
        c.drawString(46, top - 40, chord)
        grips = [(inv, compute_drop2(chord, inv, S["opens"])) for inv in INV_ORDER]
        grips.sort(key=lambda g: min(g[1]) or 0.5)
        nfrets = max(4, max(max(fr) - (1 if min(fr) <= 1 else min(fr)) + 1 for _, fr in grips))
        for k, (inv, fr) in enumerate(grips):
            degs = degrees_of(fr, S["opens"], chord)
            draw_diagram(160 + k * 150, top - 26, chord, fr, degs, S["s_offset"], nfrets,
                         SG1, FG1, 11, 5.6,
                         above1=chord, above2=inv + (" pos." if inv == "root" else " inv."),
                         notes=True)
    set_fill(GRAY)
    c.setFont("Helvetica", 8.5)
    c.drawCentredString(W / 2, 20,
        "Bottom to top: root pos. R-5-7-3  ·  1st inv. 3-7-R-5  ·  2nd inv. 5-R-3-7  ·  3rd inv. 7-3-5-R  ·  red = root, blue = 3rd, amber = 7th  ·  hollow circle above the nut = open string")

# ---------------- cadence pages ----------------
def cadence_page(set_name):
    S = SETS[set_name]
    set_title = "Middle Set" if set_name == "middle" else "Inner Set"
    set_fill(INK)
    c.setFont("Helvetica-Bold", 19)
    c.drawCentredString(W / 2, H - 42, f"The Cadence Through All Four Levels — {set_title}")
    set_fill(GRAY)
    c.setFont("Helvetica", 10)
    c.drawCentredString(W / 2, H - 59,
        f"| Bbmaj7 Em7b5 | Am7 Dm7 | Gm7 C7 | Fmaj7 |  on {S['label']}  ·  every change holds two common tones while two voices step down")
    SG2, FG2 = 11, 11
    GW2 = SG2 * 5
    PASS_PITCH = 122
    for p, (inv, seq, jumps) in enumerate(CAD[set_name]):
        ty = H - 90 - p * PASS_PITCH
        nfrets = max(4, max(max(fr) - (1 if min(fr) <= 1 else min(fr)) + 1 for _, _, fr, _ in seq))
        set_fill(INK)
        c.setFont("Helvetica-Bold", 10.5)
        title = f"Pass {p+1} — start on " + ("root position" if inv == "root" else f"the {inv} inversion")
        if jumps:
            title += f"  (runs out of neck — jumps up an octave at {jumps[0]})"
        c.drawString(46, ty, title)
        x = 60
        top = ty - 30
        for k, (chord, civ, fr, degs) in enumerate(seq):
            draw_diagram(x, top, chord, fr, degs, S["s_offset"], nfrets, SG2, FG2, 9, 4.9,
                         above1=chord, below=civ)
            x += GW2 + 40
            if k in (1, 3, 5):
                set_stroke(LIGHT)
                c.setLineWidth(1)
                c.line(x - 20, top + 12, x - 20, top - nfrets * FG2 - 12)
                x += 12
    set_fill(GRAY)
    c.setFont("Helvetica", 8.5)
    c.drawCentredString(W / 2, 20,
        "Moving in 4ths, drop-2 alternates paired inversions: root <-> 2nd and 1st <-> 3rd  ·  red = root  ·  derived and verified from the voice-leading rule")

vocab_page("middle"); c.showPage()
cadence_page("middle"); c.showPage()
vocab_page("inner"); c.showPage()
cadence_page("inner")
c.save()
print("pdf written")
