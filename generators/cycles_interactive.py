#!/usr/bin/env python3
"""Tetrad Voice Leading — Cycling Through a Scale (cycles interactive v3).

Per Daniel's wireframe: a Key/Scale/Bottom-tone block drives the whole tool;
scales beyond major (Major, Harmonic Minor, Melodic Minor — with mMaj7, +Maj7
and o7 tetrads derived by interval classification, never tabled); five engines
(Scaler = the tetrads walk the scale stepwise; Cycling 4ths; the new Cycling
5ths mirror; 6ths; 3rds); string-group selection by clicking a string name on
the neck itself. Every pass is derived in Python from the named voice-leading
rules and asserted (ascending stacks, complete tetrads, exact mover counts,
scale-step sizes 1-3 semitones — the harmonic-minor augmented 2nd is legal);
the JS computes no music.

Hard regression: the major-scale 6ths/3rds/4ths engines must reproduce ALL 12
of the print books' passes grip-for-grip (cycle6, cycle3, drop2_study are
imported, re-running their own assertions and rebuilding their PDFs).
"""
import json

import cycle6
import cycle3
import drop2_study as d2

# ---------------- spelling & scales ----------------
LETTERS = "CDEFGAB"
NAT = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
ACC = {-2: "bb", -1: "b", 0: "", 1: "#", 2: "##"}
KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
SCALES = {"M":  {"name": "Major",          "iv": [0, 2, 4, 5, 7, 9, 11]},
          "HM": {"name": "Harmonic Minor", "iv": [0, 2, 3, 5, 7, 8, 11]},
          "MM": {"name": "Melodic Minor",  "iv": [0, 2, 3, 5, 7, 9, 11]}}
SCALE_ORDER = ["M", "HM", "MM"]

def spell_scale(tonic, ivs):
    l0 = tonic[0]
    pc0 = (NAT[l0] + {"": 0, "#": 1, "b": -1}[tonic[1:]]) % 12
    names, pcs = [], []
    for i, step in enumerate(ivs):
        L = LETTERS[(LETTERS.index(l0) + i) % 7]
        pc = (pc0 + step) % 12
        d = (pc - NAT[L]) % 12
        if d > 2:
            d -= 12
        assert -2 <= d <= 2, f"unspellable: {tonic} degree {i+1}"
        names.append(L + ACC[d])
        pcs.append(pc)
    return names, pcs

# tetrad quality by interval structure (semitones to 3rd, 5th, 7th)
QUAL = {(4, 7, 11): "maj7", (3, 7, 10): "m7", (4, 7, 10): "7",
        (3, 6, 10): "m7b5", (3, 7, 11): "mM7", (4, 8, 11): "+M7",
        (3, 6, 9): "o7"}
IVALS = {"maj7": {1: "R", 3: "3", 5: "5", 7: "7"},
         "m7":   {1: "R", 3: "b3", 5: "5", 7: "b7"},
         "7":    {1: "R", 3: "3", 5: "5", 7: "b7"},
         "m7b5": {1: "R", 3: "b3", 5: "b5", 7: "b7"},
         "mM7":  {1: "R", 3: "b3", 5: "5", 7: "7"},
         "+M7":  {1: "R", 3: "3", 5: "#5", 7: "7"},
         "o7":   {1: "R", 3: "b3", 5: "b5", 7: "o7"}}
ROMAN_SUFFIX = {"maj7": "maj7", "m7": "-7", "7": "7", "m7b5": "ø7",
                "mM7": "-Δ7", "+M7": "+Δ7", "o7": "o7"}
MINORISH = {"m7", "m7b5", "mM7", "o7"}
NUMERAL = ["I", "II", "III", "IV", "V", "VI", "VII"]

def diatonic_tetrad(key, scale, deg):
    names, pcs = spell_scale(key, SCALES[scale]["iv"])
    i = deg - 1
    idx = [i, (i + 2) % 7, (i + 4) % 7, (i + 6) % 7]
    tone_pcs = [pcs[j] for j in idx]
    shape = tuple((tone_pcs[k] - tone_pcs[0]) % 12 for k in (1, 2, 3))
    qual = QUAL[shape]
    numeral = NUMERAL[i].lower() if qual in MINORISH else NUMERAL[i]
    return {"sym": names[i] + qual, "qual": qual,
            "roman": numeral + ROMAN_SUFFIX[qual],
            "pc": {d: p for d, p in zip((1, 3, 5, 7), tone_pcs)}}

# ---------------- engines ----------------
ENG = {
    "S": {"order": [1, 2, 3, 4, 5, 6, 7, 1], "name": "Scaler",
          "rule": "every voice climbs one scale step — the whole tetrad walks the scale · I > II > III > IV > V > VI > VII > I"},
    "4": {"order": [1, 4, 7, 3, 6, 2, 5, 1], "name": "Cycling 4ths",
          "rule": "R and 3 hold (becoming the new 5 and 7); the 5 falls to the new root, the 7 falls to the new 3rd · roots move in 4ths · I > IV > viiø > iii > vi > ii > V > I"},
    "5": {"order": [1, 5, 2, 6, 3, 7, 4, 1], "name": "Cycling 5ths",
          "rule": "the mirror of the 4ths: 5 and 7 hold (becoming the new root and 3rd); the R rises to the new 5, the 3 rises to the new 7 · roots move in 5ths"},
    "6": {"order": [1, 6, 4, 2, 7, 5, 3, 1], "name": "Cycling 6ths",
          "rule": "the 7th falls one scale step and becomes the root of the chord a 6th away · I > vi > IV > ii > viiø > V > iii > I"},
    "3": {"order": [1, 3, 5, 7, 2, 4, 6, 1], "name": "Cycling 3rds",
          "rule": "the root rises one scale step and becomes the next chord's 7th · I > iii > V > viiø > ii > IV > vi > I"},
}
ENG_ORDER = ["S", "4", "5", "6", "3"]
INV_STACK = {"R": [1, 5, 7, 3], "3": [3, 7, 1, 5], "5": [5, 1, 3, 7], "7": [7, 3, 5, 1]}
INV_NAME = {1: "root", 3: "1st", 5: "2nd", 7: "3rd"}
BOTTOMS = ["R", "3", "5", "7"]
SETS = [
    {"key": "inner",  "label": "E–A–D–G", "offset": 0, "opens": [40, 45, 50, 55]},
    {"key": "middle", "label": "A–D–G–B", "offset": 1, "opens": [45, 50, 55, 59]},
    {"key": "top",    "label": "D–G–B–E", "offset": 2, "opens": [50, 55, 59, 64]},
]

def start_grip(opens, ch, bottom):
    stack = INV_STACK[bottom]
    f0 = (ch["pc"][stack[0]] - opens[0]) % 12
    if f0 == 0:
        f0 = 12
    pitches = [opens[0] + f0]
    for k in range(1, 4):
        delta = (ch["pc"][stack[k]] - pitches[-1]) % 12
        pitches.append(pitches[-1] + (delta or 12))
    frets = [p - o for p, o in zip(pitches, opens)]
    if min(frets) < 1:
        frets = [f + 12 for f in frets]
    assert all(1 <= f <= 18 for f in frets), f"start out of range: {frets}"
    return frets

def degrees_of(frets, opens, ch):
    by_pc = {pc: d for d, pc in ch["pc"].items()}
    degs = []
    for f, o in zip(frets, opens):
        pc = (o + f) % 12
        assert pc in by_pc, f'{ch["sym"]}: pc {pc} not a chord tone'
        degs.append(by_pc[pc])
    assert sorted(degs) == [1, 3, 5, 7], f'{ch["sym"]}: incomplete {degs}'
    return degs

def fall(from_pc, to_pc):
    d = -((from_pc - to_pc) % 12)
    assert -3 <= d <= -1, f"bad fall {d}"      # aug-2nd steps are legal in HM
    return d

def rise(from_pc, to_pc):
    d = (to_pc - from_pc) % 12
    assert 1 <= d <= 3, f"bad rise {d}"
    return d

def walk(mode, key, scale, bottom, opens, order=None):
    chords = [diatonic_tetrad(key, scale, d) for d in (order or ENG[mode]["order"])]
    frets = start_grip(opens, chords[0], bottom)
    steps = []
    for idx, ch in enumerate(chords):
        degs = degrees_of(frets, opens, ch)
        pitches = [o + f for o, f in zip(opens, frets)]
        assert all(a < b for a, b in zip(pitches, pitches[1:])), \
            f'not ascending: {ch["sym"]} {frets}'
        labs = [IVALS[ch["qual"]][d] for d in degs]
        steps.append([ch["sym"], ch["roman"], INV_NAME[degs[0]], list(frets), labs])
        if idx == len(chords) - 1:
            break
        nxt = chords[idx + 1]
        before = list(frets)
        if mode == "6":
            frets[degs.index(7)] += fall(ch["pc"][7], nxt["pc"][1])
        elif mode == "3":
            frets[degs.index(1)] += rise(ch["pc"][1], nxt["pc"][7])
        elif mode == "4":
            frets[degs.index(5)] += fall(ch["pc"][5], nxt["pc"][1])
            frets[degs.index(7)] += fall(ch["pc"][7], nxt["pc"][3])
        elif mode == "5":
            frets[degs.index(1)] += rise(ch["pc"][1], nxt["pc"][5])
            frets[degs.index(3)] += rise(ch["pc"][3], nxt["pc"][7])
        else:  # Scaler: every voice rises one scale step (same degree, next chord)
            for k in range(4):
                frets[k] += rise(ch["pc"][degs[k]], nxt["pc"][degs[k]])
        moved = sum(1 for a, b in zip(before, frets) if a != b)
        assert moved == {"6": 1, "3": 1, "4": 2, "5": 2, "S": 4}[mode], \
            f"{mode}: {moved} movers into {nxt['sym']}"
        if min(frets) < 1:
            frets = [f + 12 for f in frets]
        elif max(frets) > 16:
            frets = [f - 12 for f in frets]
    return steps

# ---------------- hard regression: the 12 book passes (major scale) ----------------
TOP = SETS[2]["opens"]
n_reg = 0
for book, mode in ((list(zip(["G", "C", "E", "A"], ["R", "5", "3", "7"], cycle6.PASSES)), "6"),
                   (list(zip(["G", "C", "E", "A"], ["R", "5", "3", "7"], cycle3.PASSES)), "3")):
    for key, bottom, (title, seq) in book:
        gen = walk(mode, key, "M", bottom, TOP)
        assert [(s[0], s[2], s[3]) for s in gen] == \
               [(c, i, list(f)) for c, i, f in seq], f"regression {mode} {key}"
        n_reg += 1
for bottom, (title, invs) in zip(BOTTOMS, d2.PASSES):
    # The print book's 4ths passes start on the IV chord; the interactive prepends
    # the I chord (all engines start on the tonic). Regression runs the engine from
    # the book's own start chord so every book grip is still reproduced exactly.
    gen = walk("4", "F", "M", bottom, TOP, order=[4, 7, 3, 6, 2, 5, 1])
    book = [(c, i, list(d2.GRIPS[(c, i)])) for c, i in zip(d2.SEQ, invs)]
    assert [(s[0], s[2], s[3]) for s in gen] == book, f"regression 4ths {bottom}"
    n_reg += 1
print(f"regression: {n_reg}/12 book passes reproduced exactly")

# ---------------- materialize every combination ----------------
passes, n_pass = [], 0
for mode in ENG_ORDER:
    e = []
    for sc in SCALE_ORDER:
        s_arr = []
        for st in SETS:
            k_arr = []
            for key in KEYS:
                b_arr = []
                for bottom in BOTTOMS:
                    b_arr.append(walk(mode, key, sc, bottom, st["opens"]))
                    n_pass += 1
                k_arr.append(b_arr)
            s_arr.append(k_arr)
        e.append(s_arr)
    passes.append(e)
print(f"derived and verified {n_pass} passes")

DATA = {"engines": [{"key": m, "name": ENG[m]["name"], "rule": ENG[m]["rule"]} for m in ENG_ORDER],
        "passes": passes, "keys": KEYS,
        "scales": [{"key": k, "name": SCALES[k]["name"],
            "disp": SCALES[k]["name"].split(" ") if " " in SCALES[k]["name"] else [SCALES[k]["name"]]}
           for k in SCALE_ORDER],
        "bottoms": BOTTOMS,
        "sets": [{"label": s["label"], "offset": s["offset"], "opens": s["opens"]} for s in SETS],
        "strings6": ["E", "A", "D", "G", "B", "E"],
        "botColor": {"R": "#B82929", "3": "#2959A6", "5": "#212126", "7": "#D99A08"},
        "labColor": {"R": "#B82929", "3": "#2959A6", "b3": "#2959A6", "5": "#212126",
                     "b5": "#212126", "#5": "#212126", "7": "#D99A08", "b7": "#D99A08",
                     "o7": "#D99A08"},
        "dark": ["7", "b7", "o7"], "ink": "#212126", "gray": "#73737A", "light": "#CCCCCE"}

TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tetrad Voice Leading — Cycling Through a Scale</title>
<meta name="description" content="Watch four-note chords walk through a scale one smooth voice-leading move at a time — on a guitar neck and a keyboard. Any key, major or minor scales, five cycles, sound included.">
<meta property="og:title" content="Tetrad Voice Leading — Cycling Through a Scale">
<meta property="og:description" content="Four-note chords connected by the smallest possible moves. See it on the neck and the keyboard, in any key and scale — and hear it.">
<style>
  :root { --ink:#212126; --gray:#73737A; --light:#CCCCCE; }
  body { margin:0; background:#F6F6F8; font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif; color:var(--ink); }
  header { text-align:center; padding:34px 12px 2px; }
  header h1 { margin:0; font-size:30px; letter-spacing:-0.4px; }
  header p { margin:9px auto 0; font-size:13px; color:var(--gray); max-width:880px; line-height:1.65; }
  .controls { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; padding:14px 10px 2px; }
  .seg { display:flex; border:1px solid var(--light); border-radius:8px; overflow:hidden; background:#fff; }
  .seg button { border:0; background:#fff; color:var(--ink); font:600 12.5px inherit; font-family:inherit; padding:9px 15px; cursor:pointer; }
  .seg button + button { border-left:1px solid var(--light); }
  .seg button.on { background:var(--ink); color:#fff; }
  /* ---- the Key / Scale / Bottom block ---- */
  #ibWrap { display:flex; justify-content:center; padding:18px 0 4px; position:relative; }
  #infoBlock { display:flex; align-items:stretch; background:#fff; border:2px solid var(--ink); border-radius:12px; overflow:hidden; }
  .ibc { padding:9px 26px 11px; text-align:center; cursor:pointer; }
  .ibc:hover { background:#F2F2F4; }
  .ibc + .ibc { border-left:2px solid var(--ink); }
  .ibl { font-size:11px; font-weight:600; color:var(--gray); }
  .ibv { font-size:30px; font-weight:800; letter-spacing:-0.5px; line-height:1.15; }
  .ibv.small { font-size:15px; line-height:1.25; padding-top:3px; }
  #ibTones { display:flex; flex-direction:column; border-left:2px solid var(--ink); }
  #ibTones button { flex:1; border:0; background:#fff; width:40px; cursor:pointer;
                    font:800 13px inherit; font-family:inherit; line-height:1; }
  #ibTones button + button { border-top:1px solid var(--light); }
  #ibTones button.on { color:#fff !important; }
  .pop { display:none; position:absolute; top:100%; z-index:20; background:#fff;
         border:1px solid var(--light); border-radius:10px; padding:8px;
         box-shadow:0 6px 22px rgba(33,33,38,0.14); }
  .pop.open { display:block; }
  #keyPop { display:none; grid-template-columns:repeat(6, 1fr); gap:4px; }
  #keyPop.open { display:grid; }
  .pop button { border:1px solid var(--light); border-radius:7px; background:#fff;
                font:600 12.5px inherit; font-family:inherit; padding:7px 10px; cursor:pointer; }
  .pop button.on { background:var(--ink); color:#fff; border-color:var(--ink); }
  #scalePop button { display:block; width:100%; margin:2px 0; text-align:left; }
  /* ---- stage ---- */
  #rule { text-align:center; font-style:italic; font-size:12px; color:var(--gray); padding:8px 14px 0; }
  #stageCard { background:#fff; border:1px solid #E9E9EC; border-radius:16px;
               box-shadow:0 1px 5px rgba(33,33,38,0.05); margin:14px auto 0;
               padding:20px 18px 16px; width:min(1000px, 95vw); box-sizing:border-box; }
  #stage { display:flex; flex-direction:column; align-items:center; }
  #stage svg { max-width:100%; height:auto; }
  .strlab { cursor:pointer; }
  .strlab:hover circle { stroke: var(--gray); }
  .dotg { transition: transform .55s cubic-bezier(.4,0,.2,1); cursor:pointer; }
  .dotg .mk { transition: fill .55s; }
  .dotg .ring { fill:none; stroke:#212126; stroke-width:2; opacity:0; transition:opacity .2s; }
  .dotg.armed .ring { opacity:1; }
  #strhint { text-align:center; font-size:10.5px; color:var(--gray); padding:2px 0 6px; }
  #timeline { display:flex; gap:6px; justify-content:center; flex-wrap:wrap; padding:12px 8px 0; }
  #timeline button { border:1px solid var(--light); border-radius:7px; background:#fff; cursor:pointer;
                     font:600 11px inherit; font-family:inherit; color:var(--ink); padding:5px 9px; text-align:center; }
  #timeline button .rn { display:block; font-style:italic; font-size:9px; font-weight:400; color:var(--gray); }
  #timeline button.cur { background:var(--ink); color:#fff; }
  #timeline button.cur .rn { color:var(--light); }
  #narr { text-align:center; font-weight:600; font-size:12.5px; padding:10px 0 2px; min-height:18px; }
  footer { text-align:center; font-size:11.5px; color:var(--gray); padding:20px 12px 34px; line-height:1.8; }
  @media (max-width: 760px) {
    header h1 { font-size:22px; }
    header p { font-size:12.5px; padding:0 14px; }
    .seg { flex-wrap:wrap; justify-content:center; }
    .ibv { font-size:24px; }
    .ibc { padding:8px 16px 10px; }
  }
</style>
</head>
<body>
<header>
  <h1>Tetrad Voice Leading — Cycling Through a Scale</h1>
  <p>Four-note chords — tetrads — connected by the smallest possible moves. Set the <b>key center and scale</b>, choose the <b>bottom note</b> of the starting tetrad, then pick a cycle and press play: at every step the voices that must move slide one scale step and recolor as their function changes, while the others hold still. The same pitches light up on the neck and on the keyboard. Click a <b>string name</b> on the neck to choose which four strings carry the voicing.</p>
</header>
<div id="ibWrap">
  <div id="infoBlock">
    <div class="ibc" id="keyCell" title="Key center — click to change">
      <div class="ibl">Key</div><div class="ibv" id="keyVal"></div>
    </div>
    <div class="ibc" id="scaleCell" title="Scale — click to change">
      <div class="ibl">Scale</div><div class="ibv" id="scaleVal"></div>
    </div>
    <div id="ibTones" title="Bottom tone of the starting tetrad"></div>
  </div>
  <div class="pop" id="keyPop"></div>
  <div class="pop" id="scalePop"></div>
</div>
<div class="controls"><div class="seg" id="engSeg"></div></div>
<div class="controls">
  <div class="seg">
    <button id="playBtn">play</button>
    <button id="backBtn">&#8592; step</button>
    <button id="fwdBtn">step &#8594;</button>
    <button id="soundBtn" class="on" title="Toggle audio on or off.">sound: on</button>
  </div>
</div>
<div id="rule"></div>
<div id="stageCard">
  <div id="stage">
    <svg id="neck"></svg>
    <div id="strhint">the circled string names are buttons — the filled four are the active group; click one to start the group there (E&#8594;E-A-D-G, A&#8594;A-D-G-B, D and above&#8594;D-G-B-E)</div>
    <svg id="kbd"></svg>
  </div>
  <div id="timeline"></div>
  <div id="narr"></div>
</div>
<footer>
  red = root · blue = 3rd · black = 5th · amber = 7th (altered tones share the family color) ·
  <b>ringed note = about to move</b> · held notes recolor as their function changes ·
  click any chord to jump there · click a note to hear it alone
</footer>
<script>
const DATA = __DATA__;
const SVGNS = "http://www.w3.org/2000/svg";
const FW = 46, SS = 26, PADT = 8, PADB = 20;
const KB_WIDTH = 860;    // FIXED keyboard width in px — never scales with the window
const state = { eng: 0, scale: 0, set: 2, key: 0, bot: 0, step: 0, playing: false, sound: true, timer: null };
let audio = null, dotEls = [], geom = null, kb = null;

function el(t, a, p) { const e = document.createElementNS(SVGNS, t);
  for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
function cur() { return DATA.passes[state.eng][state.scale][state.set][state.key][state.bot]; }
function opens() { return DATA.sets[state.set].opens; }
function midiOf(k, f) { return opens()[k] + f; }
function labColor(lab) { return DATA.labColor[lab]; }
function labDark(lab) { return DATA.dark.includes(lab); }

function tone(midi, t0, dur) {
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = "triangle"; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(audio.destination); o.start(t0); o.stop(t0 + dur + 0.05);
}
function strum(midis) {
  if (!state.sound) return;
  audio = audio || new (window.AudioContext || window.webkitAudioContext)();
  const t = audio.currentTime;
  midis.forEach((m, i) => tone(m, t + i * 0.055, 0.9));
}

function buildStage() {
  const steps = cur(), off = DATA.sets[state.set].offset;
  const fmin = Math.max(1, Math.min(...steps.flatMap(s => s[3])) - 1);
  const fmax = Math.max(...steps.flatMap(s => s[3])) + 1;
  const cols = fmax - fmin + 1, W = cols * FW, H = PADT + 5 * SS + PADB + 14;
  geom = { fmin, X: f => (f - fmin) * FW + FW / 2, Y: g6 => PADT + 7 + (5 - g6) * SS };
  const neck = document.getElementById("neck");
  neck.innerHTML = ""; neck.setAttribute("width", W + 36); neck.setAttribute("height", H);
  neck.setAttribute("viewBox", "-32 0 " + (W + 36) + " " + H);
  for (let g6 = 0; g6 < 6; g6++) {
    const active = g6 >= off && g6 < off + 4;
    el("line", { x1: 0, y1: geom.Y(g6), x2: W, y2: geom.Y(g6),
      stroke: active ? DATA.light : "#EBEBED", "stroke-width": active ? 1.4 : 1.1 }, neck);
    const gl = el("g", { class: "strlab" }, neck);
    el("circle", { cx: -17, cy: geom.Y(g6), r: 9.6,
      fill: active ? DATA.ink : "#fff",
      stroke: active ? DATA.ink : DATA.light, "stroke-width": 1.4 }, gl);
    const t = el("text", { x: -17, y: geom.Y(g6) + 3.4, "text-anchor": "middle",
      fill: active ? "#fff" : DATA.gray, "font-size": 10,
      "font-weight": "700", "font-family": "inherit" }, gl);
    t.textContent = DATA.strings6[g6];
    const title = el("title", {}, gl);
    title.textContent = "Click to start the four-string group here";
    gl.addEventListener("click", () => { state.set = Math.min(g6, 2); refresh(); });
  }
  for (let i = 0; i <= cols; i++) {
    el("line", { x1: i * FW, y1: geom.Y(5), x2: i * FW, y2: geom.Y(0), stroke: DATA.light, "stroke-width": 1.8 }, neck);
    if (i < cols) { const t = el("text", { x: i * FW + FW / 2, y: H - 4, "text-anchor": "middle",
      fill: DATA.gray, "font-size": 9, "font-family": "inherit" }, neck);
      t.textContent = fmin + i; }
  }
  for (let i = 0; i < cols; i++) {          // inlay markers, tracking the window
    const f = fmin + i, cx = i * FW + FW / 2;
    if ([3, 5, 7, 9, 15, 17, 19, 21].includes(f))
      el("circle", { cx: cx, cy: geom.Y(0) - 2.5 * SS, r: 4.6, fill: "#DDDDE1" }, neck);
    if (f === 12 || f === 24) {
      el("circle", { cx: cx, cy: geom.Y(0) - 1.5 * SS, r: 4.6, fill: "#DDDDE1" }, neck);
      el("circle", { cx: cx, cy: geom.Y(0) - 3.5 * SS, r: 4.6, fill: "#DDDDE1" }, neck);
    }
  }
  dotEls = [];
  for (let k = 0; k < 4; k++) {
    const g = el("g", { class: "dotg" }, neck);
    el("circle", { class: "mk", cx: 0, cy: 0, r: 10.5, fill: "#000" }, g);
    el("circle", { class: "ring", cx: 0, cy: 0, r: 13.6 }, g);
    el("text", { class: "lb", x: 0, y: 3.6, "text-anchor": "middle",
      "font-family": "inherit", "font-weight": "bold" }, g);
    g.addEventListener("click", () => { const s = cur()[state.step];
      if (state.sound) { audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        tone(midiOf(k, s[3][k]), audio.currentTime, 0.9); } });
    dotEls.push(g);
  }
  buildKeyboard(Math.min(KB_WIDTH, W + 26 > KB_WIDTH ? W + 26 : KB_WIDTH));
  buildTimeline();
  document.getElementById("rule").textContent = DATA.engines[state.eng].rule;
  setStep(0, true);
}

function buildKeyboard(fullW) {
  const steps = cur();
  const mAll = steps.flatMap(s => s[3].map((f, k) => midiOf(k, f)));
  const isB = m => [1, 3, 6, 8, 10].includes(m % 12);
  let lo = Math.min(...mAll) - 2; while (isB(lo)) lo--;
  let hi = Math.max(...mAll) + 2; while (isB(hi)) hi++;
  const whites = []; for (let m = lo; m <= hi; m++) if (!isB(m)) whites.push(m);
  const WK = fullW / whites.length;
  const KH = Math.min(110, Math.max(56, WK * 3.1));
  const R = Math.min(10.5, WK * 0.37);
  const xw = {}; whites.forEach((m, i) => xw[m] = i * WK);
  const W = whites.length * WK;
  const kbd = document.getElementById("kbd");
  kbd.innerHTML = ""; kbd.setAttribute("width", W + 8); kbd.setAttribute("height", KH + 18);
  kbd.setAttribute("viewBox", "-4 0 " + (W + 8) + " " + (KH + 18));
  whites.forEach(m => { el("rect", { x: xw[m], y: 6, width: WK, height: KH, fill: "#fff",
    stroke: DATA.light, "stroke-width": 1 }, kbd);
    if (m % 12 === 0) { const t = el("text", { x: xw[m] + WK / 2, y: KH + 15, "text-anchor": "middle",
      fill: DATA.light, "font-size": 9, "font-family": "inherit" }, kbd);
      t.textContent = "C" + (Math.floor(m / 12) - 1); } });
  kb = { xd: {}, dots: [] };
  for (let m = lo; m <= hi; m++) {
    if (isB(m)) { const x = xw[m - 1] + WK * 0.68;
      el("rect", { x: x, y: 6, width: WK * 0.64, height: KH * 0.6, fill: "#212126" }, kbd);
      kb.xd[m] = { x: x + WK * 0.32, y: 6 + KH * 0.42, black: true };
    } else kb.xd[m] = { x: xw[m] + WK / 2, y: 6 + KH - R - 5, black: false };
  }
  for (let k = 0; k < 4; k++) {
    const g = el("g", { class: "dotg" }, kbd);
    el("circle", { class: "halo", cx: 0, cy: 0, r: R * 1.23, fill: "#fff", opacity: 0 }, g);
    el("circle", { class: "mk", cx: 0, cy: 0, r: R }, g);
    el("text", { class: "lb", x: 0, y: R * 0.37, "text-anchor": "middle",
      "font-family": "inherit", "font-weight": "bold", "font-size": R * 0.95 }, g);
    kb.dots.push(g);
  }
}

function buildTimeline() {
  const tl = document.getElementById("timeline");
  tl.innerHTML = "";
  cur().forEach((s, i) => {
    const b = document.createElement("button");
    b.innerHTML = s[0] + '<span class="rn">' + s[1] + " · " + s[2] + "</span>";
    b.addEventListener("click", () => setStep(i, false));
    tl.appendChild(b);
  });
}

function setStep(i, instant) {
  const steps = cur();
  state.step = ((i % steps.length) + steps.length) % steps.length;
  const st = steps[state.step], next = steps[state.step + 1] || null;
  const off = DATA.sets[state.set].offset;
  for (let k = 0; k < 4; k++) {
    const f = st[3][k], lab = st[4][k], color = labColor(lab), midi = midiOf(k, f);
    const g = dotEls[k];
    if (instant) g.style.transition = "none";
    g.style.transform = "translate(" + geom.X(f) + "px," + geom.Y(off + k) + "px)";
    g.querySelector(".mk").setAttribute("fill", color);
    const t = g.querySelector(".lb");
    const swap = () => { t.textContent = lab;
      t.setAttribute("fill", labDark(lab) ? "#212126" : "#fff");
      t.setAttribute("font-size", lab.length > 1 ? 8.2 : 9.4); };
    instant ? swap() : setTimeout(swap, 260);
    if (instant) { void g.getBoundingClientRect(); g.style.transition = ""; }
    g.classList.toggle("armed", next !== null && next[3][k] !== f);
    const kg = kb.dots[k], kd = kb.xd[midi];
    if (instant) kg.style.transition = "none";
    kg.style.transform = "translate(" + kd.x + "px," + kd.y + "px)";
    kg.querySelector(".mk").setAttribute("fill", color);
    kg.querySelector(".halo").setAttribute("opacity", kd.black ? 1 : 0);
    const kt = kg.querySelector(".lb");
    const kswap = () => { kt.textContent = lab; kt.setAttribute("fill", labDark(lab) ? "#212126" : "#fff"); };
    instant ? kswap() : setTimeout(kswap, 260);
    if (instant) { void kg.getBoundingClientRect(); kg.style.transition = ""; }
  }
  document.querySelectorAll("#timeline button").forEach((b, j) =>
    b.classList.toggle("cur", j === state.step));
  narrate();
  strum(st[3].map((f, k) => midiOf(k, f)));
}

function narrate() {
  const steps = cur(), n = document.getElementById("narr");
  const st = steps[state.step], next = steps[state.step + 1];
  if (!next) { n.textContent = st[0] + " — the pass resolves; play again, or change the key, scale, or cycle"; return; }
  const moves = []; let jump = 0;
  for (let k = 0; k < 4; k++) {
    const df = next[3][k] - st[3][k];
    if (df !== 0) { if (Math.abs(df) > 4) jump = df;
      moves.push("the " + st[4][k] + " of " + st[0] + " " +
        (df > 0 ? "rises to" : "falls to") + " the " + next[4][k] + " of " + next[0]); }
  }
  if (jump) { n.textContent = "runs out of neck — the whole grip leaps " +
    (jump > 0 ? "up" : "down") + " the octave into " + next[0]; return; }
  n.textContent = moves.length === 4
    ? "next: every voice climbs one scale step into " + next[0]
    : "next: " + moves.join("  ·  ");
}

function play(on) {
  state.playing = on;
  document.getElementById("playBtn").textContent = on ? "pause" : "play";
  clearInterval(state.timer);
  if (on) state.timer = setInterval(() => setStep(state.step + 1, false), 1700);
}
function refresh() { play(false); closePops(); syncBlock(); buildStage(); }

/* ---- the Key / Scale / Bottom block ---- */
function syncBlock() {
  document.getElementById("keyVal").textContent = DATA.keys[state.key];
  const sc = DATA.scales[state.scale];
  const sv = document.getElementById("scaleVal");
  sv.innerHTML = "";
  sc.disp.forEach(w => { const d = document.createElement("div"); d.textContent = w; sv.appendChild(d); });
  sv.classList.toggle("small", sc.disp.length > 1);
  document.querySelectorAll("#ibTones button").forEach((b, i) => {
    const c = DATA.botColor[DATA.bottoms[i]];
    b.classList.toggle("on", i === state.bot);
    b.style.color = c;
    b.style.background = i === state.bot ? c : "#fff";
  });
  document.querySelectorAll("#keyPop button").forEach((b, i) => b.classList.toggle("on", i === state.key));
  document.querySelectorAll("#scalePop button").forEach((b, i) => b.classList.toggle("on", i === state.scale));
}
function closePops() {
  document.getElementById("keyPop").classList.remove("open");
  document.getElementById("scalePop").classList.remove("open");
}
const tonesHost = document.getElementById("ibTones");
DATA.bottoms.forEach((bt, i) => {
  const b = document.createElement("button");
  b.textContent = bt;
  b.addEventListener("click", () => { state.bot = i; refresh(); });
  tonesHost.appendChild(b);
});
const keyPop = document.getElementById("keyPop");
DATA.keys.forEach((k, i) => {
  const b = document.createElement("button");
  b.textContent = k;
  b.addEventListener("click", () => { state.key = i; refresh(); });
  keyPop.appendChild(b);
});
const scalePop = document.getElementById("scalePop");
DATA.scales.forEach((sc, i) => {
  const b = document.createElement("button");
  b.textContent = sc.name;
  b.addEventListener("click", () => { state.scale = i; refresh(); });
  scalePop.appendChild(b);
});
document.getElementById("keyCell").addEventListener("click", e => {
  e.stopPropagation(); scalePop.classList.remove("open"); keyPop.classList.toggle("open"); });
document.getElementById("scaleCell").addEventListener("click", e => {
  e.stopPropagation(); keyPop.classList.remove("open"); scalePop.classList.toggle("open"); });
document.addEventListener("click", closePops);
keyPop.addEventListener("click", e => e.stopPropagation());
scalePop.addEventListener("click", e => e.stopPropagation());

const engSeg = document.getElementById("engSeg");
DATA.engines.forEach((e, i) => {
  const b = document.createElement("button");
  b.textContent = e.name;
  b.addEventListener("click", () => { state.eng = i;
    engSeg.querySelectorAll("button").forEach((x, j) => x.classList.toggle("on", j === i));
    refresh(); });
  if (i === state.eng) b.classList.add("on");
  engSeg.appendChild(b);
});
document.getElementById("playBtn").addEventListener("click", () => play(!state.playing));
document.getElementById("fwdBtn").addEventListener("click", () => { play(false); setStep(state.step + 1, false); });
document.getElementById("backBtn").addEventListener("click", () => { play(false); setStep(state.step - 1, false); });
document.getElementById("soundBtn").addEventListener("click", function () {
  state.sound = !state.sound;
  this.textContent = "sound: " + (state.sound ? "on" : "off");
  this.classList.toggle("on", state.sound); });
syncBlock();
buildStage();
</script>
</body>
</html>
"""

html = TEMPLATE.replace("__DATA__", json.dumps(DATA))
out = "Voicing_Cycles_Interactive.html"
with open(out, "w") as f:
    f.write(html)
print(f"{out}: {len(html)/1e6:.2f} MB · 5 engines x 3 scales x 12 keys x 4 bottoms x 3 sets = {n_pass} passes")
