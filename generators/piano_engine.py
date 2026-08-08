#!/usr/bin/env python3
"""Shared engine for the piano workbook: MusicXML writer -> verovio -> PNG, and keyboard diagrams."""
import io
import verovio
import cairosvg
from reportlab.lib.utils import ImageReader

STEP_ALTER = {"C":("C",0),"C#":("C",1),"Db":("D",-1),"D":("D",0),"D#":("D",1),"Eb":("E",-1),
              "E":("E",0),"F":("F",0),"F#":("F",1),"Gb":("G",-1),"G":("G",0),"G#":("G",1),
              "Ab":("A",-1),"A":("A",0),"A#":("A",1),"Bb":("B",-1),"B":("B",0)}
PC = {"C":0,"C#":1,"Db":1,"D":2,"D#":3,"Eb":3,"E":4,"F":5,"F#":6,"Gb":6,"G":7,"G#":8,"Ab":8,"A":9,"A#":10,"Bb":10,"B":11}

def _note_xml(name, midi, dur, dtype, chord=False, staff=1, voice=1, color=None):
    step, alter = STEP_ALTER[name]
    octave = midi // 12 - 1
    alt = f"<alter>{alter}</alter>" if alter else ""
    ch = "<chord/>" if chord else ""
    col = f' color="{color}"' if color else ""
    return (f"<note{col}>{ch}<pitch><step>{step}</step>{alt}<octave>{octave}</octave></pitch>"
            f"<duration>{dur}</duration><voice>{voice}</voice><type>{dtype}</type>"
            f"<staff>{staff}</staff></note>")

def measures_xml(measures, fifths=0, grand=True):
    """measures: list of bars; each bar = list of chord events; each event =
    {'rh': [(name, midi), ...], 'lh': [(name, midi), ...]} — events split the bar evenly (1 or 2)."""
    out = []
    for mi, bar in enumerate(measures):
        n_ev = len(bar)
        dur = 16 // n_ev
        dtype = "whole" if n_ev == 1 else "half"
        body = ""
        if mi == 0:
            staves = "<staves>2</staves><clef number=\"1\"><sign>G</sign><line>2</line></clef>" \
                     "<clef number=\"2\"><sign>F</sign><line>4</line></clef>" if grand else \
                     "<clef><sign>G</sign><line>2</line></clef>"
            body += (f"<attributes><divisions>4</divisions><key><fifths>{fifths}</fifths></key>"
                     f"{staves}</attributes>")
        # RH voice 1 staff 1
        for ev in bar:
            notes = ev["rh"]
            for i, note in enumerate(notes):
                nm, md = note[0], note[1]
                col = note[2] if len(note) > 2 else None
                body += _note_xml(nm, md, dur, dtype, chord=(i > 0), staff=1, voice=1, color=col)
        if grand:
            body += f"<backup><duration>16</duration></backup>"
            for ev in bar:
                notes = ev["lh"]
                if not notes:
                    body += f"<note><rest/><duration>{dur}</duration><voice>5</voice><staff>2</staff></note>"
                    continue
                for i, note in enumerate(notes):
                    nm, md = note[0], note[1]
                    col = note[2] if len(note) > 2 else None
                    body += _note_xml(nm, md, dur, dtype, chord=(i > 0), staff=2, voice=5, color=col)
        out.append(f"<measure number=\"{mi+1}\">{body}</measure>")
    # dummy measure on a forced new system so the real system justifies to full width;
    # the renderer crops it away
    dummy = ("<measure number=\"999\" implicit=\"yes\"><print new-system=\"yes\"/>"
             "<note><rest/><duration>16</duration><voice>1</voice><staff>1</staff></note>")
    if grand:
        dummy += ("<backup><duration>16</duration></backup>"
                  "<note><rest/><duration>16</duration><voice>5</voice><staff>2</staff></note>")
    dummy += "</measure>"
    out.append(dummy)
    return ("<?xml version=\"1.0\"?><score-partwise version=\"3.1\">"
            "<part-list><score-part id=\"P1\"><part-name></part-name></score-part></part-list>"
            "<part id=\"P1\">" + "".join(out) + "</part></score-partwise>")

_tk = verovio.toolkit()

def render_system(xml, page_width_mei=1800, scale=42, spacing=0.55):
    """Render one system of music to a PNG ImageReader + (w,h) in px + chord x-centers."""
    _tk.setOptions({
        "pageWidth": page_width_mei, "scale": scale, "breaks": "encoded",
        "adjustPageHeight": True, "header": "none", "footer": "none",
        "pageMarginTop": 10, "pageMarginBottom": 10, "pageMarginLeft": 10, "pageMarginRight": 10,
        "spacingStaff": 7, "spacingLinear": min(1.0, spacing), "spacingNonLinear": 0.55,
    })
    ok = _tk.loadData(xml)
    assert ok, "verovio failed to load MusicXML"
    svg = _tk.renderToSVG(1)
    import re as _re0
    wm = _re0.search(r'<svg[^>]*width="([\d.]+)px"', svg)
    svg_w = float(wm.group(1)) if wm else 2000.0
    png_scale = min(2.0, 5500.0 / max(svg_w, 1.0))
    png = cairosvg.svg2png(bytestring=svg.encode(), scale=png_scale, background_color="white")
    from PIL import Image, ImageOps
    import re as _re
    full = Image.open(io.BytesIO(png))
    # chord x-centers in pixel coords (crop is vertical-only, so x is stable)
    vb = _re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg)
    vb_w = float(vb.group(1))
    mg = _re.search(r'class="page-margin" transform="translate\(([\d.]+), ?([\d.]+)\)"', svg)
    margin_x = float(mg.group(1)) if mg else 0.0
    ratio = full.width / vb_w
    chord_xs = []
    for cm in _re.finditer(r'class="chord"', svg):
        u = _re.search(r'translate\(([-\d.]+),', svg[cm.end():cm.end() + 1500])
        if u:
            chord_xs.append((margin_x + float(u.group(1)) + 95) * ratio)
    # crop away the dummy justification system (everything from the 2nd system down)
    vb_h = float(vb.group(2))
    margin_y = float(mg.group(2)) if mg else 0.0
    ratio_v = full.height / vb_h
    sys_positions = [m.start() for m in _re.finditer(r'class="system"', svg)]
    cut_px = full.height
    if len(sys_positions) > 1:
        tail = svg[sys_positions[1]:]
        ys = [float(m.group(1)) for m in _re.finditer(r'M[\d.]+ ([\d.]+)', tail)][:12]
        if ys:
            cut_px = int((margin_y + min(ys)) * ratio_v) - 34
    body = full.crop((0, 0, full.width, max(40, cut_px)))
    # then tight vertical crop
    gray = body.convert("L")
    bbox = ImageOps.invert(gray).getbbox()
    if bbox:
        pad = 6
        top = max(0, bbox[1] - pad)
        bot = min(body.height, bbox[3] + pad)
        img = body.crop((0, top, body.width, bot))
    else:
        img = body
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return ImageReader(buf), img.size, chord_xs, len(sys_positions)

# ---------------- keyboard diagrams ----------------
WHITE_PCS = [0, 2, 4, 5, 7, 9, 11]
BLACK_AFTER = {0: True, 2: True, 5: True, 7: True, 9: True}  # black key after C D F G A

def draw_keyboard(c, x, y, w_key, height, lo_midi, hi_midi, pressed, root_pcs=None,
                  ink=(0.13,0.13,0.15), accent=(0.72,0.16,0.16), light=(0.8,0.8,0.82)):
    """Keyboard from lo_midi..hi_midi (white-key aligned). pressed: {midi: color_key}
    where color_key in {'root','tone','lh'}; draws dots on keys. Returns width used."""
    # collect white keys
    whites = [m for m in range(lo_midi, hi_midi + 1) if m % 12 in WHITE_PCS]
    n = len(whites)
    W_TOT = n * w_key
    bh = height * 0.62
    bw = w_key * 0.62
    c.setLineWidth(0.6)
    # white keys
    for i, m in enumerate(whites):
        c.setStrokeColorRGB(*light)
        c.setFillColorRGB(1, 1, 1)
        c.rect(x + i * w_key, y, w_key, height, stroke=1, fill=1)
    # black keys
    xpos_of = {m: x + i * w_key for i, m in enumerate(whites)}
    for i, m in enumerate(whites[:-1]):
        if BLACK_AFTER.get(m % 12):
            bx = x + (i + 1) * w_key - bw / 2
            c.setFillColorRGB(*ink)
            c.rect(bx, y + height - bh, bw, bh, stroke=0, fill=1)
    # pressed dots — pressed maps midi -> rgb color tuple
    for m, col in pressed.items():
        pc = m % 12
        if pc in WHITE_PCS:
            cx = xpos_of[m] + w_key / 2
            cy = y + height * 0.20
            c.setFillColorRGB(*col)
            c.circle(cx, cy, w_key * 0.40, stroke=0, fill=1)
        else:
            # black key: colored fill with a white ring for contrast
            below = m - 1 if (m - 1) % 12 in WHITE_PCS else m - 2
            cx = xpos_of[below] + w_key
            cy = y + height - bh * 0.38
            r = w_key * 0.38
            c.setFillColorRGB(*col)
            c.circle(cx, cy, r, stroke=0, fill=1)
            c.setStrokeColorRGB(1, 1, 1)
            c.setLineWidth(1.1)
            c.circle(cx, cy, r, stroke=1, fill=0)
    return W_TOT

if __name__ == "__main__":
    # prototype: render a ii-V-I in F with guide tones + LH roots, and a keyboard
    from reportlab.pdfgen import canvas as rc
    from reportlab.lib.pagesizes import letter, landscape
    W, H = landscape(letter)
    c = rc.Canvas("proto.pdf", pagesize=(W, H))
    meas = [
        [{"rh": [("Bb", 58), ("F", 65)], "lh": [("G", 43)]}],   # Gm7: b3+b7 over G
        [{"rh": [("Bb", 58), ("E", 64)], "lh": [("C", 48)]}],   # C7: b7+3
        [{"rh": [("A", 57), ("E", 64)], "lh": [("F", 41)]}],    # Fmaj7: 3+7
    ]
    xml = measures_xml(meas, fifths=-1)
    img, (iw, ih) = render_system(xml, page_width_mei=1400, scale=45)
    scale = 420.0 / iw
    c.drawImage(img, 60, 300, width=iw * scale, height=ih * scale)
    draw_keyboard(c, 60, 180, 9, 40, 36, 84,
                  {43: "lh", 58: "tone", 65: "tone"}, )
    c.save()
    print("proto ok", iw, ih)
