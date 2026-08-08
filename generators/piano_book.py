#!/usr/bin/env python3
"""Voicing Studies for Jazz Piano — a guitarist's companion.
Same musical material as the guitar book; keyboard diagrams + grand-staff notation.
Chapter 2-4 voicings are the SAME PITCHES as the guitar top-set drop-2 grips."""
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas
from piano_engine import measures_xml, render_system, draw_keyboard, PC, WHITE_PCS

W, H = landscape(letter)
c = canvas.Canvas("Jazz_Piano_Voicing_Studies.pdf", pagesize=(W, H))

INK = (0.13, 0.13, 0.15)
ACCENT = (0.72, 0.16, 0.16)
GRAY = (0.45, 0.45, 0.48)
LIGHT = (0.80, 0.80, 0.82)

def set_fill(rgb): c.setFillColorRGB(*rgb)
def set_stroke(rgb): c.setStrokeColorRGB(*rgb)

# ================= chords =================
def tones4(r,t3,t5,t7): return {1:r,3:t3,5:t5,7:t7}
TONES = {
    "Fmaj7":tones4("F","A","C","E"),   "Bbmaj7":tones4("Bb","D","F","A"), "Ebmaj7":tones4("Eb","G","Bb","D"),
    "F7":tones4("F","A","C","Eb"),     "Bb7":tones4("Bb","D","F","Ab"),   "Eb7":tones4("Eb","G","Bb","Db"),
    "C7":tones4("C","E","G","Bb"),     "G7":tones4("G","B","D","F"),      "D7":tones4("D","F#","A","C"),
    "Ab7":tones4("Ab","C","Eb","Gb"),  "Gb7":tones4("Gb","Bb","Db","E"),
    "Cm7":tones4("C","Eb","G","Bb"),   "Gm7":tones4("G","Bb","D","F"),    "Dm7":tones4("D","F","A","C"),
    "Fm7":tones4("F","Ab","C","Eb"),   "Ebm7":tones4("Eb","Gb","Bb","Db"),"Dbm7":tones4("Db","E","Ab","B"),
    "Am7b5":tones4("A","C","Eb","G"),  "Em7b5":tones4("E","G","Bb","D"),  "Bdim7":tones4("B","D","F","Ab"),
    "Cmaj7":tones4("C","E","G","B"),   "Cm7_":None,
}
del TONES["Cm7_"]
INV_DEGREES = {"root":[1,5,7,3], "1st":[3,7,1,5], "2nd":[5,1,3,7], "3rd":[7,3,5,1]}
TOP_OPENS = [50, 55, 59, 64]   # guitar top set — source of the drop-2 pitches

def compute_drop2(chord, inv):
    pcs = [PC[TONES[chord][d]] for d in INV_DEGREES[inv]]
    f0 = (pcs[0] - TOP_OPENS[0]) % 12
    for base in (f0, f0 + 12):
        frets, p = [base], TOP_OPENS[0] + base
        ok = True
        for i in range(1, 4):
            step = (pcs[i] - p) % 12 or 12
            p += step
            f = p - TOP_OPENS[i]
            if f < 0:
                ok = False
                break
            frets.append(f)
        if ok:
            return frets
    raise AssertionError(f"{chord} {inv}")

def d2_event(chord, frets):
    """Drop-2 grip -> notation event: LH bottom note, RH top three, with names."""
    inv_pc = {PC[n]: d for d, n in TONES[chord].items()}
    pitches = [o + f for o, f in zip(TOP_OPENS, frets)]
    assert all(a < b for a, b in zip(pitches, pitches[1:]))
    named = [(TONES[chord][inv_pc[p % 12]], p) for p in pitches]
    return {"lh": [named[0]], "rh": named[1:]}

# degree color code: R = red, 3 = blue, 7 = amber, 5 = ink
DEG_RGB = {1: (0.72, 0.16, 0.16), 3: (0.16, 0.35, 0.65), 5: (0.13, 0.13, 0.15), 7: (0.85, 0.60, 0.05)}
DEG_HEX = {1: "#B82929", 3: "#2959A6", 5: "#212126", 7: "#D99A08"}

def colorize(ev, chord):
    """Attach a degree color to every note (for engraved noteheads)."""
    inv_pc = {PC[n]: d for d, n in TONES[chord].items()}
    return {hand: [(nm, p, DEG_HEX[inv_pc[p % 12]]) for nm, p in ev[hand]] for hand in ("lh", "rh")}

def ev_deg_colors(ev, chord):
    """Keyboard dots: midi -> rgb by chord degree."""
    inv_pc = {PC[n]: d for d, n in TONES[chord].items()}
    return {p: DEG_RGB[inv_pc[p % 12]] for nm, p in ev["lh"] + ev["rh"]}

# ---- guide-tone shells
def guide_path(chords, prefer_third_low=True):
    """Returns list of events: LH root, RH two guide tones with minimal movement."""
    out = []
    prev_gt = None
    prev_lh = None
    for ch in chords:
        t3, t7 = TONES[ch][3], TONES[ch][7]
        p3s = [PC[t3] + 12 * o for o in range(3, 7)]
        p7s = [PC[t7] + 12 * o for o in range(3, 7)]
        best = None
        for lo_name, lo_opts, hi_name, hi_opts in ((t3, p3s, t7, p7s), (t7, p7s, t3, p3s)):
            for lo in lo_opts:
                for hi in hi_opts:
                    if not (lo < hi and 55 <= lo and hi <= 72 and hi - lo <= 9):
                        continue
                    if prev_gt is None:
                        cost = abs(lo - 60) + abs(hi - 65) + (0 if (prefer_third_low == (lo_name == t3)) else 1)
                    else:
                        cost = abs(lo - prev_gt[0][1]) + abs(hi - prev_gt[1][1])
                    if best is None or cost < best[0]:
                        best = (cost, [(lo_name, lo), (hi_name, hi)])
        gt = best[1]
        rname = TONES[ch][1]
        ropts = [PC[rname] + 12 * o for o in range(2, 5)]
        if prev_lh is None:
            lh = min(ropts, key=lambda p: abs(p - 45))
        else:
            lh = min((p for p in ropts if 38 <= p <= 55), key=lambda p: abs(p - prev_lh))
        out.append({"lh": [(rname, lh)], "rh": gt})
        prev_gt, prev_lh = gt, lh
    return out

# ================= layout helpers =================
def header(title, subtitle):
    set_fill(INK)
    c.setFont("Helvetica-Bold", 19)
    c.drawCentredString(W / 2, H - 40, title)
    set_fill(GRAY)
    c.setFont("Helvetica", 9.5)
    c.drawCentredString(W / 2, H - 56, subtitle)

def kb_range(events, pad=4):
    ps = [p for ev in events for _, p in ev["lh"] + ev["rh"]]
    lo, hi = min(ps) - pad, max(ps) + pad
    while lo % 12 not in WHITE_PCS:
        lo -= 1
    while hi % 12 not in WHITE_PCS:
        hi += 1
    return lo, hi

def draw_kb_cell(x, y, wk, kh, ev, chord, label=None):
    lo, hi = kb_range([ev], pad=3)
    if hi - lo < 24:
        hi = lo + 24
        while hi % 12 not in WHITE_PCS:
            hi += 1
    set_fill(INK)
    c.setFont("Helvetica-Bold", 8.5)
    n_wh = sum(1 for m in range(lo, hi + 1) if m % 12 in WHITE_PCS)
    c.drawCentredString(x + n_wh * wk / 2, y + kh + 4, chord)
    if label:
        set_fill(GRAY)
        c.setFont("Helvetica-Oblique", 6.5)
        c.drawCentredString(x + n_wh * wk / 2, y + kh + 14, label)
    draw_keyboard(c, x, y, wk, kh, lo, hi, ev_deg_colors(ev, chord))
    # C labels
    set_fill(LIGHT)
    c.setFont("Helvetica", 4.5)
    whites = [m for m in range(lo, hi + 1) if m % 12 in WHITE_PCS]
    for i, m in enumerate(whites):
        if m % 12 == 0:
            c.drawCentredString(x + i * wk + wk / 2, y - 6, f"C{m // 12 - 1}")
    return n_wh * wk

def row_of_music(y_kb, y_img, events, chords, bars, fifths, labels=None, kh=26, wk=4.6,
                 x0=48, avail=W - 96, himax=68.0):
    """One engraved system with each keyboard positioned directly over its chord."""
    n = len(events)
    # engrave first to learn where each chord sits
    cevents = [colorize(ev, ch) for ev, ch in zip(events, chords)]
    meas = []
    k = 0
    for cnt in bars:
        meas.append(cevents[k:k + cnt])
        k += cnt
    xml = measures_xml(meas, fifths=fifths)
    # every row justifies to the FULL width; then pick the engraving page width so
    # the system's height lands right on the row's budget (music as large as fits)
    mei = 2300 + 140 * n
    img, (iw, ih), chord_xs, nsys = render_system(xml, page_width_mei=min(mei, 20000), scale=40)
    h = ih * avail / iw
    mei2 = max(int(mei * h / himax * 1.03), 900)
    img2, (iw2, ih2), xs2, nsys2 = render_system(xml, page_width_mei=min(mei2, 20000), scale=40)
    if nsys2 == 2 and len(xs2) == len(chord_xs) and ih2 * avail / iw2 <= himax * 1.05:
        img, iw, ih, chord_xs = img2, iw2, ih2, xs2
    sc = avail / iw
    x_img = x0
    c.drawImage(img, x_img, y_img - ih * sc, width=avail, height=ih * sc)
    assert len(chord_xs) == n, f"chord count mismatch: {len(chord_xs)} vs {n}"
    centers = [x_img + px * sc for px in chord_xs]
    # keyboard sizes
    widths = []
    for ev in events:
        lo, hi = kb_range([ev], pad=3)
        if hi - lo < 24:
            hi = lo + 24
            while hi % 12 not in WHITE_PCS:
                hi += 1
        widths.append(sum(1 for m in range(lo, hi + 1) if m % 12 in WHITE_PCS))
    gaps = [centers[i + 1] - centers[i] for i in range(n - 1)] or [avail]
    med_gap = sorted(gaps)[len(gaps) // 2]
    wk_use = max(3.2, min(6.4, (med_gap - 8) / max(widths)))
    # place keyboards centered over chords, nudged apart if they collide
    lefts = [cx - w * wk_use / 2 for cx, w in zip(centers, widths)]
    for i in range(n):
        lefts[i] = max(36.0, min(lefts[i], W - 36 - widths[i] * wk_use))
    for i in range(1, n):
        min_left = lefts[i - 1] + widths[i - 1] * wk_use + 3
        if lefts[i] < min_left:
            lefts[i] = min_left
    for i in range(n - 2, -1, -1):  # relieve right-edge pileup
        max_left = lefts[i + 1] - widths[i] * wk_use - 3
        if lefts[i] > max_left:
            lefts[i] = max(36.0, max_left)
    for i, (ev, ch) in enumerate(zip(events, chords)):
        draw_kb_cell(lefts[i], y_kb, wk_use, kh, ev, ch, labels[i] if labels else None)
        # connector tick from keyboard to its chord
        kb_cx = lefts[i] + widths[i] * wk_use / 2
        set_stroke(LIGHT)
        c.setLineWidth(0.6)
        c.line(kb_cx, y_kb - 10, centers[i], y_img + 2)

# ================= PAGE 1: cover =================
c.setStrokeColorRGB(*ACCENT)
c.setLineWidth(3)
c.line(150, H - 120, W - 150, H - 120)
set_fill(INK)
c.setFont("Helvetica-Bold", 30)
c.drawCentredString(W / 2, H - 94, "Voicing Studies for Jazz Piano")
set_fill(GRAY)
c.setFont("Helvetica", 12)
c.drawCentredString(W / 2, H - 140, "a guitarist's companion — the same voicings, the same voice leading, in the middle of the piano")

TOC = [
    ("Chapter 1 — Shells (guide tones)", "2  The two positions  ·  3  Jazz Blues in F  ·  4  Bird Blues in Bb  ·  5  Rhythm Changes in Bb"),
    ("Chapter 2 — Spread voicings (your drop-2s)", "6  Vocabulary: all four inversions  ·  7  The cadence through all four levels"),
    ("Chapter 3 — Cycles", "8  Cycling sixths — one falling voice  ·  9  Cycling thirds — one rising voice"),
    ("Chapter 4 — Tune etudes", "10  Jazz Blues in F  ·  11  Bird Blues in Bb  ·  12  Rhythm Changes in Bb"),
]
y = H - 210
for part, entries in TOC:
    set_fill(INK)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(150, y, part)
    set_fill(GRAY)
    c.setFont("Helvetica", 10.5)
    c.drawString(170, y - 17, entries)
    y -= 52

set_fill(INK)
c.setFont("Helvetica-Bold", 11)
c.drawCentredString(W / 2, 132, "How to read these pages")
set_fill(GRAY)
c.setFont("Helvetica", 10)
for i, ln in enumerate([
    "Every voicing is shown twice: as pressed keys on a keyboard strip, and in notation — both color-coded by chord degree:",
    "RED = root, BLUE = 3rd, AMBER = 7th, black = 5th. Left hand plays the bass clef, right hand the treble; everything sits around middle C.",
    "The Chapter 2-4 voicings are note-for-note the drop-2 grips from your guitar book's top string set — same pitches, new instrument.",
]):
    c.drawCentredString(W / 2, 114 - i * 14, ln)
set_fill(GRAY)
c.setFont("Helvetica-Oblique", 9)
c.drawCentredString(W / 2, 52, "Fingering: keep it lazy — RH 1-2-4 or 1-2-5 for three-note chords, both guide tones with 1 and 4. If it feels like work, use different fingers.")
c.showPage()

# ================= PAGE 2: shells, the two positions =================
header("Shells — Guide Tones in Two Positions",
       "left hand: the root  ·  right hand: just the 3rd and 7th  ·  the two notes that define every chord quality")
DEMO = [("Cmaj7", "3 low, 7 high"), ("C7", "3 low, b7 high"), ("Cm7", "b3 low, b7 high")]
x = 60
for chord, lab in DEMO:
    t3, t7 = TONES[chord][3], TONES[chord][7]
    ev = {"lh": [(TONES[chord][1], 36)], "rh": [(t3, 60 + PC[t3]), (t7, 60 + PC[t7])]}
    draw_kb_cell(x, H - 165, 5.2, 30, ev, chord, lab)
    x += 250
x = 60
for chord, _ in DEMO:
    t3, t7 = TONES[chord][3], TONES[chord][7]
    p3, p7 = 60 + PC[t3], 60 + PC[t7] - 12
    ev = {"lh": [(TONES[chord][1], 36)], "rh": [(t7, p7), (t3, p3)]}
    draw_kb_cell(x, H - 250, 5.2, 30, ev, chord, "flipped: 7 low, 3 high")
    x += 250

set_fill(INK)
c.setFont("Helvetica-Bold", 12)
c.drawString(60, H - 320, "The one rule of guide-tone voice leading  (ii-V-I in F)")
set_fill(GRAY)
c.setFont("Helvetica", 9.5)
c.drawString(60, H - 335, "one guide tone holds, the other falls a step — and the two swap jobs (the 7th of one chord becomes the 3rd of the next)")
ii_v_i = guide_path(["Gm7", "C7", "Fmaj7"])
row_of_music(H - 420, H - 445, ii_v_i, ["Gm7", "C7", "Fmaj7"], [1, 1, 1], -1,
             labels=["Bb (b3) + F (b7)", "Bb holds, F falls to E", "E holds, Bb falls to A"],
             kh=28, wk=5.0, x0=60, avail=430, himax=78.0)
set_fill(GRAY)
c.setFont("Helvetica", 9)
c.drawCentredString(W / 2, 36,
    "Gm7's b7 falls to become C7's 3rd; C7's b7 falls to become Fmaj7's 3rd — the 7-to-3 handoff is the entire engine of jazz harmony, and it never needs more than one moving finger.")
c.showPage()

# ================= tune pages (shells) =================
def shell_tune_page(title, subtitle, rows, fifths, footer):
    header(title, subtitle)
    all_chords = [ch for row in rows for _, bar in row for ch in bar]
    events = guide_path(all_chords)
    ev_i = 0
    ROW_P = 158
    for ri, row in enumerate(rows):
        row_chords, bars, bar_labels = [], [], []
        for blabel, bar in row:
            row_chords += bar
            bars.append(len(bar))
            bar_labels.append(blabel)
        n = len(row_chords)
        row_events = events[ev_i:ev_i + n]
        ev_i += n
        y_kb = H - 128 - ri * ROW_P
        set_fill(LIGHT)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(40, y_kb + 40, f"bars {bar_labels[0]}-{bar_labels[-1]}" if not bar_labels[0].startswith("B") else "bridge")
        row_of_music(y_kb, y_kb - 12, row_events, row_chords, bars, fifths, kh=24, wk=4.2, himax=92.0)
    set_fill(GRAY)
    c.setFont("Helvetica", 8.5)
    for i, ln in enumerate(footer):
        c.drawCentredString(W / 2, 30 - i * 11, ln)

JB_ROWS = [
    [("1", ["F7"]), ("2", ["Bb7"]), ("3", ["F7"]), ("4", ["Cm7", "F7"])],
    [("5", ["Bb7"]), ("6", ["Bdim7"]), ("7", ["F7"]), ("8", ["D7"])],
    [("9", ["Gm7"]), ("10", ["C7"]), ("11", ["F7", "D7"]), ("12", ["Gm7", "C7"])],
]
shell_tune_page("Jazz Blues in F — Shells",
    "| F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bo7 | F7 | D7 | Gm7 | C7 | F7 D7 | Gm7 C7 |  ·  LH roots, RH guide tones",
    JB_ROWS, -1,
    ["the right hand barely moves all chorus — most changes are one finger stepping a half- or whole-step",
     "red = root · blue = 3rd · amber = 7th — watch each amber 7 turn blue as it becomes the next chord's 3rd"])
c.showPage()

BB_ROWS = [
    [("1", ["Bbmaj7"]), ("2", ["Am7b5", "D7"]), ("3", ["Gm7", "C7"]), ("4", ["Fm7", "Bb7"])],
    [("5", ["Eb7"]), ("6", ["Ebm7", "Ab7"]), ("7", ["Dm7", "G7"]), ("8", ["Dbm7", "Gb7"])],
    [("9", ["Cm7"]), ("10", ["F7"]), ("11", ["Bbmaj7", "G7"]), ("12", ["Cm7", "F7"])],
]
shell_tune_page("Bird Blues in Bb — Shells",
    "\"Blues for Alice\" changes  ·  the descending ii-Vs of bars 6-8 are pure alternating guide-tone motion",
    BB_ROWS, -2,
    ["when the ii-Vs start falling chromatically, the guide tones just walk down in half-steps — let them",
     "red = root · blue = 3rd · amber = 7th"])
c.showPage()

RC_ROWS = [
    [("1", ["Bbmaj7", "G7"]), ("2", ["Cm7", "F7"]), ("3", ["Dm7", "G7"]), ("4", ["Cm7", "F7"])],
    [("5", ["Fm7", "Bb7"]), ("6", ["Ebmaj7", "Ab7"]), ("7", ["Dm7", "G7"]), ("8", ["Cm7", "F7"])],
    [("B 1-2", ["D7"]), ("B 3-4", ["G7"]), ("B 5-6", ["C7"]), ("B 7-8", ["F7"])],
]
shell_tune_page("Rhythm Changes in Bb — Shells",
    "A section (bars 1-8) + bridge (two bars per chord)  ·  form AABA — on the final A, land bar 8 on Bbmaj7",
    RC_ROWS, -2,
    ["two chords per bar and still almost no hand movement — this is why guide tones are the pianist's shells",
     "red = root · blue = 3rd · amber = 7th"])
c.showPage()

# ================= PAGE 6: spread voicing vocabulary =================
header("Spread Voicings — Your Drop-2s, All Four Inversions",
       "LH takes the bottom note, RH the top three  ·  these are note-for-note the guitar top-set grips  ·  bottom to top: root R-5-7-3, 1st 3-7-R-5, 2nd 5-R-3-7, 3rd 7-3-5-R")
VOCAB = [("maj7", "Bbmaj7"), ("m7", "Gm7"), ("dom7", "C7"), ("m7b5", "Em7b5")]
ROW_P = 118
for r, (qual, chord) in enumerate(VOCAB):
    grips = [(inv, compute_drop2(chord, inv)) for inv in ["root", "1st", "2nd", "3rd"]]
    grips.sort(key=lambda g: min(TOP_OPENS[i] + f for i, f in enumerate(g[1])))
    events = [d2_event(chord, fr) for _, fr in grips]
    labels = [inv + (" pos." if inv == "root" else " inv.") for inv, _ in grips]
    y_kb = H - 120 - r * ROW_P
    set_fill(INK)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(40, y_kb + 8, qual)
    row_of_music(y_kb, y_kb - 12, events, [chord] * 4, [1, 1, 1, 1], 0,
                 labels=labels, kh=22, wk=4.4, x0=120, avail=W - 170)
set_fill(GRAY)
c.setFont("Helvetica", 8.5)
c.drawCentredString(W / 2, 22, "ordered low to high  ·  red = root, blue = 3rd, amber = 7th, black = 5th  ·  same four notes restacked — watch the colors rotate through the stack")
c.showPage()

# ================= PAGE 7: the cadence through all four levels =================
CADENCE = ["Bbmaj7", "Em7b5", "Am7b5__", "Dm7", "Gm7", "C7", "Fmaj7"]
CADENCE = ["Bbmaj7", "Em7b5", "Am7", "Dm7", "Gm7", "C7", "Fmaj7"]
TONES["Am7"] = tones4("A", "C", "E", "G")

def run_cadence(start_inv):
    frets = list(compute_drop2("Bbmaj7", start_inv))
    out = []
    for idx, chord in enumerate(CADENCE):
        inv_pc = {PC[n]: d for d, n in TONES[chord].items()}
        degs = [inv_pc[(o + f) % 12] for f, o in zip(frets, TOP_OPENS)]
        assert sorted(degs) == [1, 3, 5, 7]
        out.append((chord, list(frets)))
        if idx == len(CADENCE) - 1:
            break
        nxt = CADENCE[idx + 1]
        new = list(frets)
        for s, d in enumerate(degs):
            if d in (5, 7):
                target = PC[TONES[nxt][1 if d == 5 else 3]]
                delta = -((PC[TONES[chord][d]] - target) % 12)
                assert delta in (-1, -2)
                new[s] += delta
        if min(new) < 0:
            new = [f + 12 for f in new]
        frets = new
    return out

header("The Cadence Through All Four Levels",
       "| Bbmaj7 Em7b5 | Am7 Dm7 | Gm7 C7 | Fmaj7 |  ·  every change holds two common tones while two voices step down  ·  four passes, one per starting inversion")
ROW_P = 118
for p, inv in enumerate(["root", "1st", "2nd", "3rd"]):
    seq = run_cadence(inv)
    events = [d2_event(ch, fr) for ch, fr in seq]
    y_kb = H - 118 - p * ROW_P
    set_fill(INK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, y_kb + 32, f"Pass {p+1} — start on {'root position' if inv=='root' else 'the '+inv+' inversion'}")
    row_of_music(y_kb, y_kb - 12, events, [ch for ch, _ in seq], [2, 2, 2, 1], -1, kh=20, wk=4.0)
set_fill(GRAY)
c.setFont("Helvetica", 8.5)
c.drawCentredString(W / 2, 20, "moving in 4ths, the inversions alternate in pairs: root <-> 2nd and 1st <-> 3rd  ·  exactly the passes from the guitar book, at pitch")
c.showPage()

# ================= PAGES 8-9: cycles =================
SIX_PASSES = [
    ("Key of G", 1, [("Gmaj7",[5,7,7,7]), ("Em7",[5,7,5,7]), ("Cmaj7",[5,5,5,7]), ("Am7",[5,5,5,5]),
        ("F#m7b5",[4,5,5,5]), ("D7",[4,5,3,5]), ("Bm7",[4,4,3,5]), ("Gmaj7",[4,4,3,3])]),
    ("Key of C", 0, [("Cmaj7",[5,5,5,7]), ("Am7",[5,5,5,5]), ("Fmaj7",[3,5,5,5]), ("Dm7",[3,5,3,5]),
        ("Bm7b5",[3,4,3,5]), ("G7",[3,4,3,3]), ("Em7",[2,4,3,3]), ("Cmaj7",[2,4,1,3])]),
    ("Key of E", 4, [("Emaj7",[6,8,5,7]), ("C#m7",[6,6,5,7]), ("Amaj7",[6,6,5,5]), ("F#m7",[4,6,5,5]),
        ("D#m7b5",[4,6,4,5]), ("B7",[4,4,4,5]), ("G#m7",[4,4,4,4]), ("Emaj7",[2,4,4,4])]),
    ("Key of A", 3, [("Amaj7",[6,6,5,5]), ("F#m7",[4,6,5,5]), ("Dmaj7",[4,6,3,5]), ("Bm7",[4,4,3,5]),
        ("G#m7b5",[4,4,3,4]), ("E7",[2,4,3,4]), ("C#m7",[2,4,2,4]), ("Amaj7",[2,2,2,4])]),
]
THIRD_PASSES = [
    ("Key of G", 1, [("Gmaj7",[5,7,7,7]), ("Bm7",[7,7,7,7]), ("D7",[7,7,7,8]), ("F#m7b5",[7,9,7,8]),
        ("Am7",[7,9,8,8]), ("Cmaj7",[9,9,8,8]), ("Em7",[9,9,8,10]), ("Gmaj7",[9,11,8,10])]),
    ("Key of C", 0, [("Cmaj7",[5,5,5,7]), ("Em7",[5,7,5,7]), ("G7",[5,7,6,7]), ("Bm7b5",[7,7,6,7]),
        ("Dm7",[7,7,6,8]), ("Fmaj7",[7,9,6,8]), ("Am7",[7,9,8,8]), ("Cmaj7",[9,9,8,8])]),
    ("Key of E", 4, [("Emaj7",[6,8,5,7]), ("G#m7",[6,8,7,7]), ("B7",[7,8,7,7]), ("D#m7b5",[7,8,7,9]),
        ("F#m7",[7,9,7,9]), ("Amaj7",[7,9,9,9]), ("C#m7",[9,9,9,9]), ("Emaj7",[9,9,9,11])]),
    ("Key of A", 3, [("Amaj7",[6,6,5,5]), ("C#m7",[6,6,5,7]), ("E7",[6,7,5,7]), ("G#m7b5",[6,7,7,7]),
        ("Bm7",[7,7,7,7]), ("Dmaj7",[7,7,7,9]), ("F#m7",[7,9,7,9]), ("Amaj7",[7,9,9,9])]),
]
for name3, t7 in [("Gmaj7",("G","B","D","F#")),("Em7",("E","G","B","D")),("Bm7",("B","D","F#","A")),
                  ("F#m7b5",("F#","A","C","E")),("Bm7b5",("B","D","F","A")),("Emaj7",("E","G#","B","D#")),
                  ("C#m7",("C#","E","G#","B")),("Amaj7",("A","C#","E","G#")),("F#m7",("F#","A","C#","E")),
                  ("D#m7b5",("D#","F#","A","C#")),("B7",("B","D#","F#","A")),("G#m7",("G#","B","D#","F#")),
                  ("Dmaj7",("D","F#","A","C#")),("E7",("E","G#","B","D")),("G#m7b5",("G#","B","D","F#"))]:
    TONES[name3] = tones4(*t7)

def cycle_page(title, subtitle, passes, footer):
    header(title, subtitle)
    ROW_P = 118
    for p, (kname, fifths, seq) in enumerate(passes):
        events = [d2_event(ch, fr) for ch, fr in seq]
        y_kb = H - 118 - p * ROW_P
        set_fill(INK)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(40, y_kb + 32, kname)
        row_of_music(y_kb, y_kb - 12, events, [ch for ch, _ in seq], [2, 2, 2, 2], fifths, kh=20, wk=3.9)
    set_fill(GRAY)
    c.setFont("Helvetica", 8.5)
    c.drawCentredString(W / 2, 20, footer)

cycle_page("Cycling Sixths — One Falling Voice",
    "the 7th falls a scale step and becomes the root of the chord a 6th away:  I > vi > IV > ii > viiø > V > iii > I  ·  only one key moves per change",
    SIX_PASSES,
    "on piano this is one finger sliding down while three hold — feel how the inversions rotate: root > 1st > 2nd > 3rd")
c.showPage()
cycle_page("Cycling Thirds — One Rising Voice",
    "the root rises a scale step and becomes the 7th of the chord a 3rd away:  I > iii > V > viiø > ii > IV > vi > I  ·  the ascending mirror",
    THIRD_PASSES,
    "same four keys, same starting chords — now one finger climbs while three hold, and the inversions rotate in reverse")
c.showPage()

# ================= PAGES 10-12: tune etudes (drop-2) =================
def d2_candidates(chord):
    out = []
    for inv in INV_DEGREES:
        base = compute_drop2(chord, inv)
        for shift in (-12, 0, 12):
            fr = [f + shift for f in base]
            if min(fr) < 1 or max(fr) > 11:
                continue
            out.append((fr, [o + f for o, f in zip(TOP_OPENS, fr)]))
    return out

def d2_dp(seq):
    cands = [d2_candidates(ch) for ch in seq]
    INF = float("inf")
    n = len(seq)
    cost = [[abs(min(fr) - 5) * 0.5 for fr, _ in cands[0]]] + [[INF] * len(cands[i]) for i in range(1, n)]
    back = [[-1] * len(cands[i]) for i in range(n)]
    for i in range(1, n):
        for j, (frj, pj) in enumerate(cands[i]):
            for k, (frk, pk) in enumerate(cands[i - 1]):
                cc = cost[i - 1][k] + sum(abs(a - b) for a, b in zip(pk, pj)) + 2.0 * abs(min(frj) - min(frk))
                if cc < cost[i][j]:
                    cost[i][j], back[i][j] = cc, k
    j = min(range(len(cands[n - 1])), key=lambda j: cost[n - 1][j])
    path = [j]
    for i in range(n - 1, 0, -1):
        j = back[i][j]
        path.append(j)
    path.reverse()
    return [cands[i][path[i]][0] for i in range(n)]

def d2_tune_page(title, subtitle, rows, fifths, footer):
    header(title, subtitle)
    all_chords = [ch for row in rows for _, bar in row for ch in bar]
    frets_seq = d2_dp(all_chords)
    events = [d2_event(ch, fr) for ch, fr in zip(all_chords, frets_seq)]
    ev_i = 0
    ROW_P = 158
    for ri, row in enumerate(rows):
        row_chords, bars = [], []
        for _, bar in row:
            row_chords += bar
            bars.append(len(bar))
        n = len(row_chords)
        row_events = events[ev_i:ev_i + n]
        ev_i += n
        y_kb = H - 128 - ri * ROW_P
        row_of_music(y_kb, y_kb - 12, row_events, row_chords, bars, fifths, kh=24, wk=4.2, himax=92.0)
    set_fill(GRAY)
    c.setFont("Helvetica", 8.5)
    for i, ln in enumerate(footer):
        c.drawCentredString(W / 2, 30 - i * 11, ln)

d2_tune_page("Jazz Blues in F — Spread Voicing Etude",
    "the same etude as the guitar book's Chapter 4, at pitch  ·  LH bottom note, RH top three  ·  minimum voice movement",
    JB_ROWS, -1,
    ["every change is the smallest available move — most of the time two keys hold and two step",
     "red = root, blue = 3rd, amber = 7th, black = 5th"])
c.showPage()
d2_tune_page("Bird Blues in Bb — Spread Voicing Etude",
    "\"Blues for Alice\"  ·  the descending ii-Vs of bars 6-8 walk down in strict parallel motion — the heart of the etude",
    BB_ROWS, -2,
    ["Am7b5 gets its full four-note grip here (the b5 the shells left out)",
     "red = root, blue = 3rd, amber = 7th, black = 5th"])
c.showPage()
d2_tune_page("Rhythm Changes in Bb — Spread Voicing Etude",
    "A section + bridge, form AABA  ·  two chords per bar and half of every chord holds still",
    RC_ROWS, -2,
    ["on the final A, land bar 8 on Bbmaj7",
     "red = root, blue = 3rd, amber = 7th, black = 5th"])
c.save()
print("piano book written")
