#!/usr/bin/env python3
"""Interactive single-file HTML edition of Modes from Pentatonics — v3 (any key).

Importing the base generator (modes_pent) re-runs ALL of its assertions and
rebuilds the canonical PDF first. This script then DERIVES the five boxes in
all 12 chromatic keys (properly spelled), re-running the full assertion suite
per key, and materializes every dot for both the major and relative-minor
hearing into one self-contained HTML. The JS computes no music.

Box numbering (RATIFIED, matches the print edition): Box 1 anchors on the
RELATIVE MINOR root on the low E string; numbering is fixed per key and does
NOT change with the hearing toggle. (Internal derivation nums anchor on the
major root; MIN_NUM in the template maps them to display numbers.) The stack
displays boxes in neck order, lowest frets first.

Regression: the C-key derivation must reproduce the base generator's five box
shapes exactly (up to the octave placement of one pattern).
"""
import json

import modes_pent as mp   # side effect: asserts everything + rebuilds the PDF

# ---------------- spelling ----------------
LETTERS = "CDEFGAB"
NAT = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
ACC = {-2: "bb", -1: "b", 0: "", 1: "#", 2: "##"}
KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
MAJOR = [0, 2, 4, 5, 7, 9, 11]

def spell_major(tonic):
    l0 = tonic[0]
    pc0 = (NAT[l0] + {"": 0, "#": 1, "b": -1}[tonic[1:]]) % 12
    names, pcs = [], []
    for i, step in enumerate(MAJOR):
        L = LETTERS[(LETTERS.index(l0) + i) % 7]
        pc = (pc0 + step) % 12
        d = (pc - NAT[L]) % 12
        if d > 2:
            d -= 12
        names.append(L + ACC[d])
        pcs.append(pc)
    return names, pcs

def hexc(rgb):
    return "#%02X%02X%02X" % tuple(round(v * 255) for v in rgb)

def dot_side(lab):
    return {"lab": lab, "color": hexc(mp.DEG_COLOR[lab]), "dark": lab in mp.LIGHT_MARKS}

# ---------------- per-key derivation (assertions re-run per key) ----------------
OPENS = mp.OPENS
PENT_DEG = [0, 2, 4, 7, 9]            # major-pent degrees: R 2 3 5 6

def derive_key(key):
    names7, pcs7 = spell_major(key)
    pc0 = pcs7[0]
    keymap = dict(zip(pcs7, names7))
    def alter(name, delta):
        n = {"bb": -2, "b": -1, "": 0, "#": 1, "##": 2}[name[1:]]
        return name[0] + ACC[n + delta]
    keymap[(pc0 + 6) % 12] = alter(names7[3], +1)    # the #4 family (Lydian)
    keymap[(pc0 + 10) % 12] = alter(names7[6], -1)   # the b7 family (Mixolydian side)
    pent = {(pc0 + d) % 12 for d in PENT_DEG}
    tr = lambda m: {(pc + pc0) % 12: v for pc, v in m.items()}
    ivl_C = tr(mp.IVL_C)               # labels vs the major root
    ivl_A = tr(mp.IVL_A)               # labels vs the relative-minor root
    sets_pc = [({(p + pc0) % 12 for p in r}, {(p + pc0) % 12 for p in g})
               for r, g in mp.SETS_PC]
    mode_pcs = {m: {(p + pc0) % 12 for p in s} for m, s in mp.MODE_PCS.items()}

    def spp(o):
        fs = [f for f in range(0, 19) if (o + f) % 12 in pent]
        return list(zip(fs, fs[1:]))

    def build_box(anchor):
        pair0 = next(pq for pq in spp(OPENS[0]) if pq[0] == anchor)
        mid = sum(pair0) / 2
        return [min(spp(o), key=lambda pq: (abs(sum(pq) / 2 - mid), pq[0]))
                for o in OPENS]

    boxes = {}
    for num, d in enumerate(PENT_DEG, start=1):        # Box 1 anchors on the major root
        apc = (pc0 + d) % 12
        a = ((apc - OPENS[0] - 1) % 12) + 1            # low-E anchor fret in 1..12
        box = build_box(a)
        pcs_box = {(o + f) % 12 for o, pq in zip(OPENS, box) for f in pq}
        assert pcs_box == pent, f"{key} box {num}: pcs != pentatonic"
        assert max(q for _, q in box) - min(p for p, _ in box) <= 4, f"{key} box {num} span"
        bmin = min(p for p, _ in box)
        bmax = max(q for _, q in box)
        lo, extra = bmin - 1, 0
        if lo < 0:                     # box sits at the nut: no fret -1 —
            lo, extra = 0, 1           # recover coverage one fret to the right
        window = list(range(lo, bmax + 1 + extra))
        sets = []
        for si, (red, gold) in enumerate(sets_pc):
            dots, sounded = [], set()
            for s, o in enumerate(OPENS):
                for f in box[s]:
                    pc = (o + f) % 12
                    dots.append({"s": s, "f": f, "kind": "pent", "midi": o + f,
                                 "note": keymap[pc],
                                 "C": dot_side(ivl_C[pc]), "A": dot_side(ivl_A[pc])})
                    sounded.add(pc)
                for f in window:
                    pc = (o + f) % 12
                    if pc in red or pc in gold:
                        dots.append({"s": s, "f": f,
                                     "kind": "red" if pc in red else "gold",
                                     "midi": o + f, "note": keymap[pc],
                                     "C": dot_side(ivl_C[pc]), "A": dot_side(ivl_A[pc])})
                        sounded.add(pc)
            for table in (mp.TOP, mp.BOT):
                mode = table[si][0]
                assert sounded == mode_pcs[mode], f"{key} box {num} {mode}: wrong window"
            for kind in ("red", "gold"):
                n = sum(1 for d in dots if d["kind"] == kind)
                assert n >= 2, f"{key} box {num} set {si}: {kind} x{n}"
            added = [(d["s"], d["f"]) for d in dots if d["kind"] != "pent"]
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
                comps.append(sorted(comp))
            sets.append({"dots": dots, "loops": comps})
        boxes[num] = {"window": window, "sets": sets}
    order = sorted(boxes, key=lambda n: boxes[n]["window"][0])
    return {"maj": key, "min": keymap[(pc0 + 9) % 12],
            "order": order, "boxes": boxes}

KEYDATA = {k: derive_key(k) for k in KEYS}

# regression: C-key patterns must reproduce the base generator's shapes
c_shapes = {tuple(tuple(pq) for pq in
                  [(p % 12, q if q - p <= 4 else q) for p, q in
                   [((pr[0]) % 12, (pr[0]) % 12 + (pr[1] - pr[0])) for pr in box]])
            for box in ()}  # (structural check below instead)
def shape_of(box):
    base = min(p for p, _ in box)
    return tuple((p - base, q - base) for p, q in box)
mp_shapes = {shape_of(b) for b in mp.BOX_SHAPES.values()}
my_shapes = set()
for num in KEYDATA["C"]["boxes"]:
    win = KEYDATA["C"]["boxes"][num]["window"]
    pent_dots = [d for d in KEYDATA["C"]["boxes"][num]["sets"][0]["dots"] if d["kind"] == "pent"]
    per_s = {}
    for d in pent_dots:
        per_s.setdefault(d["s"], []).append(d["f"])
    box = [tuple(sorted(per_s[s])) for s in range(6)]
    my_shapes.add(shape_of(box))
assert my_shapes == mp_shapes, "C-key regression failed: shapes differ from the book"
print(f"derived {len(KEYS)} keys x 5 boxes x 3 sets, all asserted; "
      f"C-key shapes match the book ({len(mp_shapes)}/5)")

sets_meta = []
for si in range(3):
    m, fn, rd, gd, tn = mp.TOP[si]
    mm, mfn, mrd, mgd, mtn = mp.BOT[si]
    sets_meta.append({
        "C": {"mode": m, "func": fn, "adds": [dot_side(rd), dot_side(gd)], "tens": tn},
        "A": {"mode": mm, "func": mfn, "adds": [dot_side(mrd), dot_side(mgd)], "tens": mtn},
        "maj": m, "min": mm,
    })

DATA = {"keydata": KEYDATA, "keys": KEYS, "sets": sets_meta,
        "ink": "#212126", "gray": "#73737A", "light": "#CCCCCE"}

TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Modes from Pentatonic Boxes — Interactive Guitar Fretboard Map</title>
<meta name="description" content="Learn the modes the easy way: every mode is a guitar pentatonic box you already know, plus two notes. Interactive fretboard map in every key — see it, flip it, hear it.">
<meta property="og:title" content="Modes from Pentatonic Boxes">
<meta property="og:description" content="Every mode is a guitar pentatonic box plus two notes. An interactive fretboard map in every key — see it, flip it, hear it.">
<style>
  :root { --ink:#212126; --gray:#73737A; --light:#CCCCCE; }
  body { margin:0; background:#F6F6F8; font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif; color:var(--ink); }
  header { text-align:center; padding:34px 12px 2px; }
  header h1 { margin:0; font-size:30px; letter-spacing:-0.4px; }
  header .tag { margin:7px 0 0; font-size:14.5px; font-style:italic; color:var(--gray); }
  header p { margin:8px auto 0; font-size:13px; color:var(--gray); max-width:900px; line-height:1.65; }
  .seg .cap { font:600 10px Helvetica; color:var(--gray); padding:11px 2px 0 10px; }
  .controls { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; padding:16px 10px 6px; }
  .seg { display:flex; border:1px solid var(--light); border-radius:8px; overflow:hidden; }
  .seg button { border:0; background:#fff; color:var(--ink); font:600 12.5px inherit; font-family:inherit; padding:9px 15px; cursor:pointer; }
  .seg button + button { border-left:1px solid var(--light); }
  .seg button.on { background:var(--ink); color:#fff; }
  #setSeg button .mn { opacity:1; }
  #setSeg button.on .mn { opacity:.45; }
  #setSeg button.on .mn.act { opacity:1; text-decoration:underline; text-underline-offset:3px; }
  #boxes { display:flex; flex-direction:column; gap:20px; align-items:center; padding:18px 8px 0; }
  .boxrow { display:flex; align-items:center; gap:40px; background:#fff;
            border:1px solid #E9E9EC; border-radius:16px; padding:24px 38px;
            box-shadow:0 1px 5px rgba(33,33,38,0.05);
            width:min(1040px, 94vw); box-sizing:border-box; }
  .boxfig { text-align:center; width:440px; flex:none; }
  .panel { flex:1; }
  .boxtitle { font:700 15px Helvetica; color:var(--gray); margin-bottom:4px; }
  .panel { width:490px; text-align:left; font:14px Helvetica; color:var(--ink); line-height:2.2; }
  .panel .ph { font:700 16px Helvetica; }
  .panel .ph .sub { font:400 13px Helvetica; color:var(--gray); }
  .panel .muted { color:var(--gray); }
  .chip { display:inline-flex; align-items:center; justify-content:center;
          width:21px; height:21px; font:700 10.5px Helvetica; color:#fff;
          margin:0 1px; vertical-align:middle; }
  .chip.sq { border-radius:3px; }
  .chip.ci { border-radius:50%; }
  .dot { cursor:pointer; }
  .dot .mk { transition: fill .3s; }
  .dot.dim { opacity:.25; }
  .dot, .dot.dim { transition: opacity .15s; }
  .ring { fill:none; stroke:var(--ink); stroke-width:2.6; opacity:0; pointer-events:none; transition:opacity .15s; }
  .dot.hot .ring { opacity:1; }
  .added-layer { transition:opacity .3s; }
  svg.nomelt .added-layer { opacity:0; pointer-events:none; }
  .pctl { display:flex; gap:6px; margin:5px 0 3px; flex-wrap:wrap; }
  .pb { border:1px solid var(--light); border-radius:6px; background:#fff; color:var(--ink);
        font:600 11.5px Helvetica; padding:4px 10px; cursor:pointer; line-height:1.4; }
  .pb:hover { border-color: var(--gray); }
  .pb.on { background:var(--ink); color:#fff; border-color:var(--ink); }
  #caption { text-align:center; padding:20px 0 0; min-height:20px; }
  #caption .capname { font-size:27px; font-weight:800; letter-spacing:-0.3px; }
  #caption .capname .fn { font-size:15px; font-weight:600; color:var(--gray); margin-left:9px; }
  #caption .capsub { font-size:14px; font-weight:600; padding-top:4px; }
  #hint { text-align:center; font-style:italic; font-size:11.5px; color:var(--gray); padding:4px 16px 0; max-width:980px; margin:0 auto; line-height:1.7; }
  footer { text-align:center; font-size:11.5px; color:var(--gray); padding:22px 12px 36px; line-height:1.8; }
  .boxfig svg { max-width:100%; height:auto; }
  @media (max-width: 760px) {
    header h1 { font-size:23px; }
    header .tag { font-size:13px; }
    header p { font-size:12.5px; padding:0 14px; }
    .seg { flex-wrap:wrap; justify-content:center; }
    .seg button { padding:8px 11px; font-size:12px; }
    .boxrow { flex-direction:column; gap:14px; padding:18px 16px; width:min(1040px, 94vw); }
    .boxfig { width:100%; }
    .panel { width:100%; flex:none; }
    #caption .capname { font-size:22px; }
    #hint { font-size:11px; }
  }
</style>
</head>
<body>
<header>
  <h1>Modes from Pentatonic Boxes</h1>
  <div class="tag">the modes, built from the guitar pentatonic boxes you already know — see it, flip it, hear it</div>
  <p>Every mode is a pentatonic scale you already know, plus two notes. Pick a key — the selector sets the <b>major tonal center</b> — and the five pentatonic boxes appear in order down the neck, each showing the two <b>mode tones</b> that turn that box into the full mode. Flip a mode pair to its relative minor and watch the same physical notes change color and meaning; switch the mode tones out to strip back to the bare pentatonic; press play on any box to hear what you see.</p>
</header>
<div class="controls" style="padding-bottom:0">
  <div class="seg" id="keySeg"><span class="cap">major key</span></div>
</div>
<div class="controls">
  <div class="seg" id="setSeg"></div>
  <div class="seg">
    <button id="meltBtn" class="on" title="Toggle the two mode tones on or off. Out = the bare pentatonic — the play buttons follow.">mode tones: in</button>
    <button id="soundBtn" class="on" title="Toggle audio on or off.">sound: on</button>
  </div>
</div>
<div id="caption"></div>
<div id="hint">click the selected mode pair again to flip major ↔ relative minor · <b>mode tones</b> toggles the two added notes in and out — out leaves the bare pentatonic, and the play buttons follow · hover a note to light up its degree family · click a note to hear it</div>
<div id="boxes"></div>
<footer>
  square = pentatonic core · circle + dashed loop = the two mode tones · one color per degree:
  red R · green 2 · blue 3 · silver 4 · black 5 · cyan 6 · amber 7<br>
  color = function vs. the current root, never absolute pitch — flipping major ↔ minor recolors the same physical notes<br>
  box numbers match the print edition: Box 1 is rooted on the relative minor root — numbering is fixed per key and never changes with the hearing
</footer>
<script>
const DATA = __DATA__;
const FW = 52, SS = 26, PADT = 14, PADB = 42, SC = FW / 30;
const state = { key: "A", set: 0, root: "C", melt: true, sound: true };
const SVGNS = "http://www.w3.org/2000/svg";
let audio = null, boxState = {}, boxEls = {}, playTimers = {};

function el(tag, attrs, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function kd() { return DATA.keydata[state.key]; }
function family(lab) { return lab.replace(/[b#]/g, ""); }
function tone(midi, t, dur) {
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = "triangle";
  o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.25, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audio.destination);
  o.start(t); o.stop(t + dur + 0.05);
}
function play(midi) {
  if (!state.sound) return;
  audio = audio || new (window.AudioContext || window.webkitAudioContext)();
  tone(midi, audio.currentTime, 0.7);
}
function playBox(num, dir) {
  if (!state.sound) return;
  audio = audio || new (window.AudioContext || window.webkitAudioContext)();
  (playTimers[num] || []).forEach(clearTimeout);
  playTimers[num] = [];
  const bs = boxState[num];
  const seq = boxEls[num].dots
    .filter(g => bs.melt || g.__rec.kind === "pent")   // colors out = pentatonic only
    .sort((a, b) => a.__rec.midi - b.__rec.midi);
  if (dir < 0) seq.reverse();
  seq.forEach((g, i) => {
    playTimers[num].push(setTimeout(() => {
      tone(g.__rec.midi, audio.currentTime, 0.45);
      g.classList.add("hot");
      setTimeout(() => g.classList.remove("hot"), 190);
    }, i * 210));
  });
}

function buildBoxes() {
  const host = document.getElementById("boxes");
  host.innerHTML = "";
  boxEls = {}; boxState = {}; playTimers = {};
  for (const num of kd().order) {
    boxState[num] = { root: state.root, melt: state.melt };
    const box = kd().boxes[num], setd = box.sets[state.set];
    const W = FW * box.window.length, H = PADT + SS * 5 + PADB;
    const row = document.createElement("div");
    row.className = "boxrow";
    const wrap = document.createElement("div");
    wrap.className = "boxfig";
    wrap.innerHTML = '<div class="boxtitle">Box ' + num + "</div>";
    const svg = el("svg", { width: W + 8, height: H, viewBox: (-4) + " 0 " + (W + 8) + " " + H });
    const X = f => (f - box.window[0]) * FW + FW / 2;
    const Y = s => PADT + 7 + (5 - s) * SS;
    for (let s = 0; s < 6; s++)
      el("line", { x1: 0, y1: Y(s), x2: W, y2: Y(s), stroke: DATA.light, "stroke-width": 1.6 }, svg);
    box.window.forEach((f, i) => {
      el("line", { x1: i * FW, y1: Y(5), x2: i * FW, y2: Y(0), stroke: DATA.light, "stroke-width": 2.2 }, svg);
      const t = el("text", { x: X(f), y: H - 6, "text-anchor": "middle", fill: DATA.gray, "font-size": 12, "font-family": "Helvetica" }, svg);
      t.textContent = f;
    });
    el("line", { x1: box.window.length * FW, y1: Y(5), x2: box.window.length * FW, y2: Y(0), stroke: DATA.light, "stroke-width": 2.2 }, svg);
    // fretboard inlay markers at their real positions (track the window)
    for (const f of box.window) {
      if (f < 1) continue;
      if ([3, 5, 7, 9, 15, 17, 19, 21].includes(f))
        el("circle", { cx: X(f), cy: Y(0) - 2.5 * SS, r: 5.5, fill: "#DDDDE1" }, svg);
      if (f === 12 || f === 24) {
        el("circle", { cx: X(f), cy: Y(0) - 1.5 * SS, r: 5.5, fill: "#DDDDE1" }, svg);
        el("circle", { cx: X(f), cy: Y(0) - 3.5 * SS, r: 5.5, fill: "#DDDDE1" }, svg);
      }
    }
    const addedLayer = el("g", { class: "added-layer" }, svg);
    const PAD = 9.6 * SC;
    for (const comp of setd.loops) {
      if (comp.length === 1) {
        el("circle", { cx: X(comp[0][1]), cy: Y(comp[0][0]), r: PAD,
          fill: "none", stroke: DATA.gray, "stroke-width": 1.8, "stroke-dasharray": (3.3*SC)+" "+(2.4*SC) }, addedLayer);
      } else {
        const pts = comp.map(([s, f]) => [X(f), Y(s)]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const [x1, y1] = pts[0], [x2, y2] = pts[pts.length - 1];
        const L = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        el("rect", { x: -L / 2 - PAD, y: -PAD, width: L + 2 * PAD, height: 2 * PAD, rx: PAD,
          fill: "none", stroke: DATA.gray, "stroke-width": 1.8, "stroke-dasharray": (3.3*SC)+" "+(2.4*SC),
          transform: "translate(" + (x1 + x2) / 2 + "," + (y1 + y2) / 2 + ") rotate(" + ang + ")" }, addedLayer);
      }
    }
    const dotList = [];
    for (const d of setd.dots) {
      const g = el("g", { class: "dot" }, d.kind === "pent" ? svg : addedLayer);
      g.__rec = d; g.__num = num;
      dotList.push(g);
      const cx = X(d.f), cy = Y(d.s), side = d[state.root];
      if (d.kind === "pent") {
        el("rect", { class: "mk", x: cx - 6.4*SC, y: cy - 6.4*SC, width: 12.8*SC, height: 12.8*SC, rx: 1.6*SC, fill: side.color }, g);
        el("rect", { class: "ring", x: cx - 8.4*SC, y: cy - 8.4*SC, width: 16.8*SC, height: 16.8*SC, rx: 3*SC }, g);
      } else {
        el("circle", { class: "mk", cx: cx, cy: cy, r: 7*SC, fill: side.color }, g);
        el("circle", { class: "ring", cx: cx, cy: cy, r: 9.4*SC }, g);
      }
      const t = el("text", { class: "lb", x: cx, y: cy + 2.6*SC, "text-anchor": "middle",
        "font-family": "Helvetica", "font-weight": "bold",
        "font-size": (side.lab.length > 1 ? 6.4 : 7.4) * SC,
        fill: side.dark ? "#212126" : "#fff" }, g);
      t.textContent = side.lab;
      const title = el("title", {}, g);
      g.addEventListener("mouseenter", () => hover(d[boxState[num].root].lab));
      g.addEventListener("mouseleave", () => hover(null));
      g.addEventListener("click", () => play(d.midi));
      g.__title = title;
    }
    wrap.appendChild(svg);
    row.appendChild(wrap);
    const panel = document.createElement("div");
    panel.className = "panel";
    panel.id = "panel-" + num;
    row.appendChild(panel);
    host.appendChild(row);
    boxEls[num] = { svg: svg, dots: dotList, title: wrap.querySelector(".boxtitle") };
  }
  refreshAll(true);
}

function allDots() { return Array.from(document.querySelectorAll(".dot")); }

function hover(lab) {
  const fam = lab ? family(lab) : null;
  for (const g of allDots()) {
    const mine = family(g.__rec[boxState[g.__num].root].lab);
    g.classList.toggle("hot", fam !== null && mine === fam);
    g.classList.toggle("dim", fam !== null && mine !== fam);
  }
}

function heardName(root) {
  return root === "C" ? kd().maj + " major" : kd().min + " minor";
}
// box numbers follow the heard root: major counts from the major-root box,
// minor re-anchors so the relative-minor-root box is Box 1 (5->1, 1->2, ...)
// Ratified numbering (matches the print edition): Box 1 anchors on the
// RELATIVE MINOR root; numbering is fixed per key and never changes with
// the hearing toggle.
const MIN_NUM = { 5: 1, 1: 2, 2: 3, 3: 4, 4: 5 };
function dispNum(num) { return MIN_NUM[num]; }
function modeName(root) {
  const meta = DATA.sets[state.set][root];
  return (root === "C" ? kd().maj : kd().min) + " " + meta.mode;
}

function updateBox(num, instant) {
  const bs = boxState[num];
  for (const g of boxEls[num].dots) {
    const side = g.__rec[bs.root];
    g.querySelector(".mk").setAttribute("fill", side.color);
    const t = g.querySelector(".lb");
    const swap = () => { t.textContent = side.lab;
      t.setAttribute("fill", side.dark ? "#212126" : "#fff");
      t.setAttribute("font-size", (side.lab.length > 1 ? 6.4 : 7.4) * SC); };
    instant ? swap() : setTimeout(swap, 130);
    g.__title.textContent = g.__rec.note + " — " + side.lab + " of " + heardName(bs.root);
  }
  boxEls[num].svg.classList.toggle("nomelt", !bs.melt);
  boxEls[num].title.textContent = "Box " + dispNum(num);
  fillPanel(num);
}

function refreshAll(instant) {
  for (const num of kd().order) updateBox(num, instant);
  const meta = DATA.sets[state.set][state.root];
  const keyName = state.root === "C" ? kd().maj : kd().min;
  const cap = document.getElementById("caption");
  cap.innerHTML = "";
  const name = document.createElement("div");
  name.className = "capname";
  name.textContent = keyName + " " + meta.mode;
  const fn = document.createElement("span");
  fn.className = "fn";
  fn.textContent = meta.func;
  name.appendChild(fn);
  cap.appendChild(name);
  const sub = document.createElement("div");
  sub.className = "capsub";
  const span = (txt, col) => { const s = document.createElement("span");
    s.textContent = txt; if (col) s.style.color = col; sub.appendChild(s); };
  span("add ", "#73737A");
  span(meta.adds[0].lab, meta.adds[0].color);
  span(" & ", "#73737A");
  span(meta.adds[1].lab, meta.adds[1].color);
  span("   (" + meta.tens + ")", "#73737A");
  cap.appendChild(sub);
  updateSetSeg();
}

const ORDER = ["R", "b2", "2", "b3", "3", "4", "#4", "5", "b6", "6", "b7", "7"];
const STRNUM = ["6th", "5th", "4th", "3rd", "2nd", "1st"];
function chip(lab, color, dark, shape) {
  return '<span class="chip ' + shape + '" style="background:' + color +
         ';color:' + (dark ? "#212126" : "#fff") + '">' + lab + "</span>";
}
function fillPanel(num) {
  const bs = boxState[num];
  const setd = kd().boxes[num].sets[state.set];
  const dots = setd.dots.map(d => ({ ...d, side: d[bs.root] }));
  const pent = dots.filter(d => d.kind === "pent");
  const added = dots.filter(d => d.kind !== "pent");
  const lo = Math.min(...pent.map(d => d.f)), hi = Math.max(...pent.map(d => d.f));
  const uniq = arr => ORDER.filter(l => arr.some(d => d.side.lab === l));
  const chipsOf = (labs, src, shape) => labs.map(l => {
    const d = src.find(x => x.side.lab === l).side;
    return chip(l, d.color, d.dark, shape);
  }).join("");
  const posList = ds => ds.map(d => STRNUM[d.s] + "·" + (d.f === 0 ? "open" : d.f + "fr")).join(",  ");
  const roots = dots.filter(d => d.side.lab === "R").sort((a, b) => a.s - b.s);
  let html = '<div class="ph">Box ' + dispNum(num) +
    ' <span class="sub">· frets ' + lo + "–" + hi + " — " + modeName(bs.root) + "</span></div>";
  html += '<div class="pctl">' +
    '<button class="pb" data-act="root">hearing: ' + heardName(bs.root) + "</button>" +
    '<button class="pb' + (bs.melt ? " on" : "") + '" data-act="melt" title="Toggle the two mode tones on or off. Out = the bare pentatonic — the play buttons follow.">mode tones: ' + (bs.melt ? "in" : "out") + "</button>" +
    '<button class="pb" data-act="up">play &#8593;</button>' +
    '<button class="pb" data-act="down">play &#8595;</button></div>';
  html += '<div><span class="muted">core</span>&nbsp; ' + chipsOf(uniq(pent), pent, "sq") +
          ' &nbsp;<span class="muted">+ add</span>&nbsp; <span' +
          (bs.melt ? ">" : ' style="opacity:.35">') +
          chipsOf(uniq(added), added, "ci") + "</span></div>";
  html += "<div>" + chip("R", "#B82929", false, roots[0] && roots[0].kind === "pent" ? "sq" : "ci") +
          ' <b>' + (roots[0] ? roots[0].note : "") + "</b>" +
          '<span class="muted"> — ' + posList(roots) + "</span></div>";
  for (const l of uniq(added)) {
    const ds = added.filter(d => d.side.lab === l).sort((a, b) => a.s - b.s);
    html += '<div' + (bs.melt ? ">" : ' style="opacity:.35">') +
            chip(l, ds[0].side.color, ds[0].side.dark, "ci") +
            " <b>" + ds[0].note + "</b>" +
            '<span class="muted"> — ' + posList(ds) + "</span></div>";
  }
  const panel = document.getElementById("panel-" + num);
  panel.innerHTML = html;
  panel.querySelector('[data-act="root"]').addEventListener("click", () => {
    bs.root = bs.root === "C" ? "A" : "C";
    updateBox(num, false);
  });
  panel.querySelector('[data-act="melt"]').addEventListener("click", () => {
    bs.melt = !bs.melt;
    updateBox(num, true);
  });
  panel.querySelector('[data-act="up"]').addEventListener("click", () => playBox(num, 1));
  panel.querySelector('[data-act="down"]').addEventListener("click", () => playBox(num, -1));
}

function setAllMelt(on) {
  state.melt = on;
  for (const num of kd().order) { boxState[num].melt = on; updateBox(num, true); }
  const b = document.getElementById("meltBtn");
  b.textContent = on ? "mode tones: in" : "mode tones: out";
  b.classList.toggle("on", on);
}

function updateSetSeg() {
  document.querySelectorAll("#setSeg button").forEach((b, i) => {
    b.classList.toggle("on", i === state.set);
    b.querySelector(".maj").classList.toggle("act", i === state.set && state.root === "C");
    b.querySelector(".min").classList.toggle("act", i === state.set && state.root === "A");
  });
}

const setSeg = document.getElementById("setSeg");
DATA.sets.forEach((s, i) => {
  const b = document.createElement("button");
  b.innerHTML = '<span class="mn maj">' + s.maj + '</span> / <span class="mn min">' + s.min + "</span>";
  b.addEventListener("click", () => {
    if (state.set === i) {                       // click again: flip major <-> minor everywhere
      state.root = state.root === "C" ? "A" : "C";
      for (const num of kd().order) boxState[num].root = state.root;
      refreshAll(false);
    } else {
      state.set = i;
      buildBoxes();
    }
  });
  setSeg.appendChild(b);
});
const keySeg = document.getElementById("keySeg");
DATA.keys.forEach(k => {
  const b = document.createElement("button");
  b.textContent = k;
  b.addEventListener("click", () => { state.key = k;
    keySeg.querySelectorAll("button").forEach(x => x.classList.toggle("on", x.textContent === k));
    buildBoxes(); });
  if (k === state.key) b.classList.add("on");
  keySeg.appendChild(b);
});
document.getElementById("meltBtn").addEventListener("click", () => setAllMelt(!state.melt));
document.getElementById("soundBtn").addEventListener("click", function () {
  state.sound = !state.sound;
  this.textContent = "sound: " + (state.sound ? "on" : "off");
  this.classList.toggle("on", state.sound); });
buildBoxes();
</script>
</body>
</html>
"""

html = TEMPLATE.replace("__DATA__", json.dumps(DATA))
out = "Modes_From_Pentatonics_Interactive.html"
with open(out, "w") as f:
    f.write(html)
n_dots = sum(len(b["sets"][s]["dots"]) for k in KEYDATA.values()
             for b in k["boxes"].values() for s in range(3))
print(f"{out}: {len(html)/1e6:.2f} MB · 12 keys · {n_dots} dots emitted")
