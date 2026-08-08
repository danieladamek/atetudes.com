#!/usr/bin/env python3
"""Voicing Studies v3 — Daniel's 4-chapter structure."""
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter

W, H = landscape(letter)
INK = (0.13, 0.13, 0.15)
ACCENT = (0.72, 0.16, 0.16)
GRAY = (0.45, 0.45, 0.48)

c = canvas.Canvas("cover.pdf", pagesize=(W, H))
c.setStrokeColorRGB(*ACCENT)
c.setLineWidth(3)
c.line(140, H - 128, W - 140, H - 128)
c.setFillColorRGB(*INK)
c.setFont("Helvetica-Bold", 32)
c.drawCentredString(W / 2, H - 100, "Voicing Studies for Jazz Guitar")
c.setFillColorRGB(*GRAY)
c.setFont("Helvetica", 12)
c.drawCentredString(W / 2, H - 150, "shells and drop-2 across all three string sets  ·  learn the forms, cycle the key, then play the tunes")

CHAPTERS = [
    ("Chapter 1 — Shell Voicings", [
        ("2", "The Three Forms (6th-, 5th-, 4th-string roots)"),
        ("3", "Basic Jazz Blues in F"),
        ("4", "Bird Blues in Bb"),
        ("5", "Rhythm Changes in Bb"),
    ]),
    ("Chapter 2 — Drop-2: Cycling 4ths to the Tonic", [
        ("6", "The Four-Bar Cadence in F (how the voices move)"),
        ("7-8", "Top set: Vocabulary + All Four Levels"),
        ("9-10", "Middle set: Vocabulary + All Four Levels"),
        ("11-12", "Inner set: Vocabulary + All Four Levels"),
    ]),
    ("Chapter 3 — Cycling 6ths & 3rds", [
        ("13-15", "Sixths (one falling voice): top, middle, inner"),
        ("16-18", "Thirds (one rising voice): top, middle, inner"),
    ]),
    ("Chapter 4 — Tune Etudes in Drop-2 (top four strings)", [
        ("19", "Basic Jazz Blues in F"),
        ("20", "Bird Blues in Bb"),
        ("21", "Rhythm Changes in Bb"),
        ("", "translate to the other sets via the Chapter 2 vocabulary"),
    ]),
]
col_lefts = [110, 425]
part_col = [0, 0, 1, 1]
y_by_col = [H - 195, H - 195]
for pi, (part, entries) in enumerate(CHAPTERS):
    col = part_col[pi]
    y = y_by_col[col]
    c.setFillColorRGB(*INK)
    c.setFont("Helvetica-Bold", 12.5)
    c.drawString(col_lefts[col], y, part)
    y -= 20
    for num, title in entries:
        c.setFillColorRGB(*ACCENT)
        c.setFont("Helvetica-Bold", 10)
        c.drawRightString(col_lefts[col] + 34, y, num)
        c.setFillColorRGB(*GRAY)
        c.setFont("Helvetica", 10.5)
        c.drawString(col_lefts[col] + 44, y, title)
        y -= 17
    y -= 18
    y_by_col[col] = y

c.setFillColorRGB(*INK)
c.setFont("Helvetica-Bold", 11)
c.drawCentredString(W / 2, 88, "The arc: shells put the essentials under your fingers — drop-2 fills them out — the cycles teach the neck — the tunes make it music.")
c.setFillColorRGB(*GRAY)
c.setFont("Helvetica", 9.5)
c.drawCentredString(W / 2, 70,
    "Color code: red = root, blue = 3rd, amber = 7th, black = 5th  ·  every grip and voice-leading connection was derived and verified programmatically")
c.save()

SRC = {
    "cover": "cover.pdf",
    "sh": "Shells_Ch1.pdf",                       # p0 forms, p1 jb-F, p2 rhythm
    "bird_sh": "Bird_Blues_Bb_Shell_Voicings.pdf",
    "fcad": "F_Cadence_Top4_Strings.pdf",
    "top": "Drop2_Study_F_Cadence.pdf",           # p0 vocab, p1 levels
    "vc": "Drop2_Vocab_Cadence_Middle_Inner.pdf", # p0 midV p1 midL p2 innV p3 innL
    "six_top": "Cycling_Sixths_Drop2.pdf",
    "thr_top": "Cycling_Thirds_Drop2.pdf",
    "cyc": "Drop2_Cycles_Middle_Inner_Sets.pdf",  # p0 mid6 p1 mid3 p2 inn6 p3 inn3
    "tunes": "Drop2_Tunes_Ch4.pdf",               # p0 jbF p1 bird p2 rc
}
readers = {k: PdfReader(v) for k, v in SRC.items()}
ORDER = [
    ("cover", 0),
    # ch1
    ("sh", 0), ("sh", 1), ("bird_sh", 0), ("sh", 2),
    # ch2
    ("fcad", 0), ("top", 0), ("top", 1), ("vc", 0), ("vc", 1), ("vc", 2), ("vc", 3),
    # ch3
    ("six_top", 0), ("cyc", 0), ("cyc", 2), ("thr_top", 0), ("cyc", 1), ("cyc", 3),
    # ch4
    ("tunes", 0), ("tunes", 1), ("tunes", 2),
]
writer = PdfWriter()
for src, pg in ORDER:
    writer.add_page(readers[src].pages[pg])
with open("Jazz_Guitar_Voicing_Studies.pdf", "wb") as out:
    writer.write(out)
print("pages:", len(PdfReader("Jazz_Guitar_Voicing_Studies.pdf").pages))
