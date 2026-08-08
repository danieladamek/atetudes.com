#!/usr/bin/env python3
"""Modes from pentatonics — the two-added-colors chart, extended to all five boxes.
Page 1: overview at Box 1 (six mode diagrams, 3 extension sets x major/relative minor).
Pages 2-5: the same six diagrams in Boxes 2, 3, 4, 5.
Pages 6-8: one page per extension set — all five boxes across the neck, major row
over relative-minor row.
Page 9: cheat sheet.
All boxes DERIVED (never hand-placed): each string takes the consecutive pentatonic
pair whose midpoint is nearest the low-E anchor pair's midpoint; every diagram's
window is asserted to sound exactly its mode's pitch-class set."""
import math
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas

W, H = landscape(letter)
c = canvas.Canvas("Modes_From_Pentatonics.pdf", pagesize=(W, H))

INK = (0.13, 0.13, 0.15)
RED = (0.72, 0.16, 0.16)      # root
BLUE = (0.16, 0.35, 0.65)     # 3rd
AMBER = (0.85, 0.60, 0.05)    # 7th
GREEN = (0.24, 0.55, 0.18)    # 2nd / 9th   (#3C8B2F, Spec v1.1)
SILVER = (0.66, 0.67, 0.71)   # 4th / 11th  (#A9ABB4, Spec v1.1 — perfect-interval family, light shade)
CYAN = (0.11, 0.72, 0.82)     # 6th / 13th  (#1CB8D1, Spec v1.1)
GRAY = (0.45, 0.45, 0.48)
LIGHT = (0.80, 0.80, 0.82)
PAPER = (1, 1, 1)
DEG_COLOR = {"R": RED, "2": GREEN, "b2": GREEN, "3": BLUE, "b3": BLUE,
             "4": SILVER, "#4": SILVER, "5": INK, "6": CYAN, "b6": CYAN,
             "7": AMBER, "b7": AMBER}
LIGHT_MARKS = ("7", "b7", "4", "#4", "6", "b6")   # light marks take dark text (Spec v1.1)
def lab_text(lab):
    return (0.1, 0.1, 0.1) if lab in LIGHT_MARKS else (1, 1, 1)

def set_fill(rgb): c.setFillColorRGB(*rgb)
def set_stroke(rgb): c.setStrokeColorRGB(*rgb)

# ================= music data =================
OPENS = [40, 45, 50, 55, 59, 64]      # E A D G B e
PENT = {0, 2, 4, 7, 9}                # C major pent = A minor pent (pitch classes)

SETS_PC = [
    ({5}, {11}),    # F  + B   -> Ionian / Aeolian
    ({6}, {11}),    # F# + B   -> Lydian / Dorian
    ({5}, {10}),    # F  + Bb  -> Mixolydian / Phrygian
]
TOP = [   # (mode, function, first added degree, second added degree, tensions)
    ("Ionian",     "Imaj7",  "4",  "7",  "11 · ma7"),
    ("Lydian",     "IVmaj7", "#4", "7",  "#11 · ma7"),
    ("Mixolydian", "V7",     "4",  "b7", "11 · b7"),
]
BOT = [
    ("Aeolian",  "vi-7",  "b6", "2",  "9 · b13"),
    ("Dorian",   "ii-7",  "6",  "2",  "9 · 13"),
    ("Phrygian", "iii-7", "b6", "b2", "b9 · b13"),
]
IVL_C = {0:"R", 2:"2", 4:"3", 5:"4", 6:"#4", 7:"5", 9:"6", 10:"b7", 11:"7"}   # vs C
IVL_A = {9:"R", 11:"2", 0:"b3", 2:"4", 4:"5", 5:"b6", 6:"6", 7:"b7", 10:"b2"} # vs A
MODE_PCS = {  # ground truth for verification (pcs relative to C=0)
    "Ionian":     {0,2,4,5,7,9,11}, "Lydian":   {0,2,4,6,7,9,11}, "Mixolydian": {0,2,4,5,7,9,10},
    "Aeolian":    {9,11,0,2,4,5,7}, "Dorian":   {9,11,0,2,4,6,7}, "Phrygian":   {9,10,0,2,4,5,7},
}

# ================= box derivation (never hand-placed) =================
# Box k is anchored at a consecutive pentatonic pair on the low E string; every other
# string takes its consecutive pentatonic pair whose midpoint lies nearest the anchor
# pair's midpoint. Standard box numbering for the A-minor / C-major pentatonic.
BOXES = [(1, 5), (2, 8), (3, 10), (4, 12), (5, 15)]  # (box number, low-E anchor fret)

def string_pent_pairs(o, hi=18):
    fs = [f for f in range(0, hi) if (o + f) % 12 in PENT]
    return list(zip(fs, fs[1:]))

def build_box(anchor):
    pair0 = next(pq for pq in string_pent_pairs(OPENS[0]) if pq[0] == anchor)
    mid0 = sum(pair0) / 2
    box = []
    for o in OPENS:
        best = min(string_pent_pairs(o),
                   key=lambda pq: (abs(sum(pq) / 2 - mid0), pq[0]))
        box.append(best)
    return box

BOX_SHAPES = {}
for num, anchor in BOXES:
    box = build_box(anchor)
    # invariants: two notes per string, union of pcs = the pentatonic, compact span
    pcs = {(o + f) % 12 for o, pq in zip(OPENS, box) for f in pq}
    assert pcs == PENT, f"box {num}: pcs {pcs} != pentatonic"
    span = max(q for _, q in box) - min(p for p, _ in box)
    assert span <= 4, f"box {num}: span {span} too wide"
    BOX_SHAPES[num] = box
    print(f"box {num} (anchor {anchor}): " +
          "  ".join(f"{'EADGBe'[s]}:{p}-{q}" for s, (p, q) in enumerate(box)))

def box_window(box):
    return list(range(min(p for p, _ in box) - 1, max(q for _, q in box) + 1))

def build_dots(box, red_pcs, gold_pcs, ivl):
    """(string, fret, kind, label) for one box+set; kind: pent|red|gold. Verified."""
    frets = box_window(box)
    dots, sounded = [], set()
    for s, o in enumerate(OPENS):
        for f in box[s]:
            dots.append((s, f, "pent", ivl[(o + f) % 12]))
            sounded.add((o + f) % 12)
        for f in frets:
            pc = (o + f) % 12
            if pc in red_pcs:
                dots.append((s, f, "red", ivl[pc])); sounded.add(pc)
            elif pc in gold_pcs:
                dots.append((s, f, "gold", ivl[pc])); sounded.add(pc)
    return dots, sounded

# verify every (box, set, row): window sounds exactly the mode; each added color >= 2x
for num in BOX_SHAPES:
    for col in range(3):
        red_pcs, gold_pcs = SETS_PC[col]
        for table, ivl in ((TOP, IVL_C), (BOT, IVL_A)):
            mode = table[col][0]
            dots, sounded = build_dots(BOX_SHAPES[num], red_pcs, gold_pcs, ivl)
            assert sounded == MODE_PCS[mode], \
                f"box {num} {mode}: sounds {sounded} != {MODE_PCS[mode]}"
            for kind in ("red", "gold"):
                n = sum(1 for d in dots if d[2] == kind)
                assert n >= 2, f"box {num} {mode}: {kind} tone appears {n}x (<2)"
print("all 30 box/mode windows verified")

# ================= drawing =================
def colored_caption(cx, y, pieces, size, align="center"):
    c.setFont("Helvetica-Bold", size)
    total = sum(c.stringWidth(t, "Helvetica-Bold", size) for t, _ in pieces)
    x = cx - total / 2 if align == "center" else cx
    for t, col in pieces:
        set_fill(col)
        c.drawString(x, y, t)
        x += c.stringWidth(t, "Helvetica-Bold", size)

def draw_diagram(x, y, box, red_pcs, gold_pcs, ivl, FW, SS):
    """One fretboard diagram, bottom-left at (x, y). Returns its drawn width."""
    frets = box_window(box)
    DW, DH = FW * len(frets), SS * 5
    k = FW / 27.0                       # scale factor vs the reference geometry
    set_stroke(LIGHT)
    c.setLineWidth(1)
    for s in range(6):
        c.line(x, y + s * SS, x + DW, y + s * SS)
    for i in range(len(frets) + 1):
        c.line(x + i * FW, y - 4 * k, x + i * FW, y + DH + 4 * k)
    set_fill(LIGHT)
    c.setFont("Helvetica", 7 * k)
    for i, f in enumerate(frets):
        c.drawCentredString(x + i * FW + FW / 2, y - 14 * k, str(f))
    dots, _ = build_dots(box, red_pcs, gold_pcs, ivl)
    def pos(s, f):
        return x + (f - frets[0]) * FW + FW / 2, y + s * SS
    # dashed loops FIRST (under the dots); neighboring added notes share one capsule
    added = [(s, f) for s, f, kind, _ in dots if kind != "pent"]
    comps, seen = [], set()
    for start in added:
        if start in seen:
            continue
        comp, stack = [], [start]
        seen.add(start)
        while stack:
            cur = stack.pop()
            comp.append(cur)
            for nb in added:
                if nb not in seen and max(abs(nb[0] - cur[0]), abs(nb[1] - cur[1])) == 1:
                    seen.add(nb)
                    stack.append(nb)
        comps.append(comp)
    set_stroke(GRAY)
    c.setLineWidth(1.2)
    c.setDash([3, 2.2])
    PAD = 8.6 * k
    for comp in comps:
        pts = [pos(s, f) for s, f in comp]
        if len(pts) == 1:
            c.circle(pts[0][0], pts[0][1], PAD, stroke=1, fill=0)
        else:
            if len(pts) > 2:
                pts = sorted(pts)
            (x1, y1), (x2, y2) = pts[0], pts[-1]
            L = math.hypot(x2 - x1, y2 - y1)
            ang = math.degrees(math.atan2(y2 - y1, x2 - x1))
            c.saveState()
            c.translate((x1 + x2) / 2, (y1 + y2) / 2)
            c.rotate(ang)
            c.roundRect(-L / 2 - PAD, -PAD, L + 2 * PAD, 2 * PAD, PAD, stroke=1, fill=0)
            c.restoreState()
    c.setDash([])
    # dots on top: pentatonic core = squares, added notes = circles
    for s, f, kind, lab in dots:
        cx, cy = pos(s, f)
        set_fill(DEG_COLOR[lab])
        if kind == "pent":
            h = 5.7 * k
            c.roundRect(cx - h, cy - h, 2 * h, 2 * h, 1.4 * k, stroke=0, fill=1)
        else:
            c.circle(cx, cy, 6.2 * k, stroke=0, fill=1)
        c.setFillColorRGB(*lab_text(lab))
        c.setFont("Helvetica-Bold", (5.4 if len(lab) > 1 else 6.2) * k)
        c.drawCentredString(cx, cy - 2.2 * k, lab)
    return DW

def footer_legend():
    set_fill(GRAY)
    c.setFont("Helvetica", 9)
    c.drawCentredString(W / 2, 42,
        "square = pentatonic core  ·  circle + dashed loop = the two added notes  ·  one color per degree:  red R  ·  green 2  ·  blue 3  ·  silver 4  ·  black 5  ·  cyan 6  ·  amber 7")
    c.drawCentredString(W / 2, 29,
        "shown in C major / A minor — every box is movable  ·  color = function vs. the current root, never absolute pitch")

# ---------------- pages 1-5: the six modes, one box per page ----------------
def mode_six_page(num, overview=False):
    box = BOX_SHAPES[num]
    frets = box_window(box)
    FW, SS = 27, 13.5
    DW, DH = FW * len(frets), SS * 5
    set_fill(INK)
    c.setFont("Helvetica-Bold", 20)
    title = ("Modes from Pentatonics — Two Added Colors" if overview
             else f"The Six Modes in Box {num}")
    c.drawCentredString(W / 2, H - 44, title)
    set_fill(GRAY)
    c.setFont("Helvetica", 10)
    sub = (f"every mode = a pentatonic box + two notes  ·  only three extension sets, because each major mode and its relative minor add the SAME two notes  ·  shown in Box {num} (frets {frets[1]}–{frets[-1]})"
           if overview else
           f"the same six modes as page 1, in the box at frets {frets[1]}–{frets[-1]}  ·  same colors, same rules — only the shape under the fingers changes")
    c.drawCentredString(W / 2, H - 61, sub)

    margin = 62
    gap = (W - 2 * margin - 3 * DW) / 2
    COL_X = [margin + i * (DW + gap) for i in range(3)]
    TOP_Y, BOT_Y = H - 224, 150

    set_fill(GRAY)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, TOP_Y + DH + 58, "Major  (major pentatonic + the 4-family and 7-family notes)")
    c.drawString(40, BOT_Y + DH + 58, "Relative minor  (minor pentatonic + the 2-family and 6-family notes)")

    for col in range(3):
        red_pcs, gold_pcs = SETS_PC[col]
        for (m, fn, rd, gd, tn), ivl, yy in ((TOP[col], IVL_C, TOP_Y), (BOT[col], IVL_A, BOT_Y)):
            x = COL_X[col]
            set_fill(INK)
            c.setFont("Helvetica-Bold", 15)
            c.drawCentredString(x + DW / 2, yy + DH + 34, f"{m}  ({fn})")
            colored_caption(x + DW / 2, yy + DH + 20,
                [("add ", GRAY), (rd, DEG_COLOR[rd]), (" & ", GRAY),
                 (gd, DEG_COLOR[gd]), (f"   ({tn})", GRAY)], 10)
            draw_diagram(x, yy, box, red_pcs, gold_pcs, ivl, FW, SS)
        mid_x = COL_X[col] + DW / 2
        set_fill(LIGHT)
        c.setFont("Helvetica-Bold", 13)
        c.drawCentredString(mid_x, (TOP_Y - 24 + BOT_Y + DH + 40) / 2 + 8, "=")
    set_fill(GRAY)
    c.setFont("Helvetica-Oblique", 9.5)
    c.drawCentredString(W / 2, (TOP_Y - 24 + BOT_Y + DH + 40) / 2 - 6,
        "top and bottom of each column are the SAME notes and the SAME pattern — only the root (and the ear) moves")
    if overview:
        c.drawCentredString(W / 2, 92,
            "Practice: loop the plain pentatonic box, then melt the two colors in — then keep the dots and move the root from C to A, and hear every note change its meaning.")
    footer_legend()
    c.showPage()

# ---------------- pages 6-8: one extension set, all five boxes ----------------
NECK_ORDER = [1, 2, 3, 4, 5]          # ascending in BOTH box number and frets: 5-8 ... 14-17

def set_neck_page(col):
    (m_maj, fn_maj, rd_maj, gd_maj, tn_maj) = TOP[col]
    (m_min, fn_min, rd_min, gd_min, tn_min) = BOT[col]
    red_pcs, gold_pcs = SETS_PC[col]
    FW, SS = 23, 12.0
    DH = SS * 5
    widths = {n: FW * len(box_window(BOX_SHAPES[n])) for n in NECK_ORDER}
    margin = 40
    gap = (W - 2 * margin - sum(widths.values())) / 4

    set_fill(INK)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(W / 2, H - 44, f"{m_maj} & {m_min} — All Five Boxes")
    set_fill(GRAY)
    c.setFont("Helvetica", 10)
    c.drawCentredString(W / 2, H - 61,
        "one sound, the whole neck  ·  the boxes overlap and tile the fretboard — the top of each box is the bottom of the next  ·  Box 5 repeats an octave down at frets 2–5")

    rows = [
        (H - 215, m_maj, fn_maj, rd_maj, gd_maj, tn_maj, IVL_C),
        (108,     m_min, fn_min, rd_min, gd_min, tn_min, IVL_A),
    ]
    for yy, m, fn, rd, gd, tn, ivl in rows:
        set_fill(INK)
        c.setFont("Helvetica-Bold", 13)
        label = f"{m}  ({fn})"
        c.drawString(margin, yy + DH + 40, label)
        lw = c.stringWidth(label, "Helvetica-Bold", 13)
        colored_caption(margin + lw + 14, yy + DH + 40 + 1,
            [("—  add ", GRAY), (rd, DEG_COLOR[rd]), (" & ", GRAY),
             (gd, DEG_COLOR[gd]), (f"   ({tn})", GRAY)], 10, align="left")
        x = margin
        for n in NECK_ORDER:
            set_fill(GRAY)
            c.setFont("Helvetica-Bold", 9)
            c.drawCentredString(x + widths[n] / 2, yy + DH + 14, f"Box {n}")
            draw_diagram(x, yy, BOX_SHAPES[n], red_pcs, gold_pcs, ivl, FW, SS)
            x += widths[n] + gap
    set_fill(GRAY)
    c.setFont("Helvetica-Oblique", 9.5)
    c.drawCentredString(W / 2, 295,
        "both rows are the SAME dots — hear C on top, A below  ·  practice: run one box until it sings, then cross the seam into the next")
    footer_legend()
    c.showPage()

# ---------------- page 9: cheat sheet ----------------
def cheat_sheet():
    set_fill(INK)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(W / 2, H - 44, "The Mode Cheat Sheet")
    set_fill(GRAY)
    c.setFont("Helvetica", 10)
    c.drawCentredString(W / 2, H - 61,
        "same information as the diagrams, in table form  ·  signature = the one note that gives the mode its name")

    headers = ["Mode", "Build", "Scale degrees", "Added tensions", "Signature", "Use it over", "Parent key"]
    col_x = [46, 150, 330, 470, 565, 630, 736]
    rows = [
        ("Ionian",     "major pent + 4, 7",   "R 2 3 4 5 6 7",     "11, ma7",  "—",  "Imaj7 (mind the 4)", "I"),
        ("Lydian",     "major pent + #4, 7",  "R 2 3 #4 5 6 7",    "#11, ma7", "#4", "maj7#11, IVmaj7",           "IV"),
        ("Mixolydian", "major pent + 4, b7",  "R 2 3 4 5 6 b7",    "11, b7",   "b7", "dominant 7th chords",       "V"),
        ("Aeolian",    "minor pent + 2, b6",  "R 2 b3 4 5 b6 b7",  "9, b13",   "b6", "vi-7, minor-key i",         "vi"),
        ("Dorian",     "minor pent + 2, 6",   "R 2 b3 4 5 6 b7",   "9, 13",    "6",  "ii-7, minor blues",         "ii"),
        ("Phrygian",   "minor pent + b2, b6", "R b2 b3 4 5 b6 b7", "b9, b13",  "b2", "iii-7, phrygian vamps",     "iii"),
    ]
    ty = H - 100
    set_fill(GRAY)
    c.setFont("Helvetica-Bold", 9.5)
    for hx, htxt in zip(col_x, headers):
        c.drawString(hx, ty, htxt)
    set_stroke(LIGHT)
    c.setLineWidth(0.8)
    c.line(40, ty - 6, W - 40, ty - 6)
    ROW_H = 34
    for r, row in enumerate(rows):
        yy = ty - 28 - r * ROW_H
        set_fill(INK)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(col_x[0], yy, row[0])
        c.setFont("Helvetica", 10)
        for i in (1, 2, 3, 5, 6):
            set_fill(INK if i in (1, 2) else GRAY)
            c.drawString(col_x[i], yy, row[i])
        set_fill(DEG_COLOR.get(row[4], GRAY))
        c.setFont("Helvetica-Bold", 11)
        c.drawString(col_x[4], yy, row[4])
        if r == 2:
            set_stroke(LIGHT)
            c.line(40, yy - 12, W - 40, yy - 12)

    by = ty - 28 - 6 * ROW_H - 16
    set_fill(INK)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(46, by, "Why only three patterns?")
    set_fill(GRAY)
    c.setFont("Helvetica", 10)
    c.drawString(46, by - 16,
        "Each major mode and its relative minor are the same seven notes: Ionian = Aeolian, Lydian = Dorian, Mixolydian = Phrygian.")
    c.drawString(46, by - 30,
        "So the two added notes are physically identical in each pair — the major's 4 (silver) is the minor's b6 (cyan), and the major's 7 (amber) is the minor's 2 (green).")
    c.drawString(46, by - 44,
        "Learn three extension shapes and you own all six modes: choose the root you hear, and the same notes change color, name, and meaning.")

    set_fill(GRAY)
    c.setFont("Helvetica", 9)
    c.drawCentredString(W / 2, 30,
        "Correction from the original chart: Dorian is the ii-7 and Phrygian the iii-7 of the parent major key (only Aeolian is the vi-7).")
    c.showPage()

# ---------------- emit the book ----------------
mode_six_page(1, overview=True)
for num in (2, 3, 4, 5):
    mode_six_page(num)
for col in range(3):
    set_neck_page(col)
cheat_sheet()
c.save()
print("pdf written (9 pages)")
