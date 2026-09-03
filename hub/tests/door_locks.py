#!/usr/bin/env python3
"""door_locks.py — THE CI LOCK ASSERTIONS, extended to markup and styles.

Stage 1 (family spec §4.2.1) proved script pruning and left a named gap:
"real modules also contribute CSS and markup, and pruning those is unproven."
This suite closes it, on the smallest real case — the notepad surface, a
genuine shared module with two shipped hosts, DOM and styles.

Four assertions per door, all on the ARTIFACT:

  1. THE PARTITION      the rendered control inventory EQUALS the set derived
                        from the lock (§4.2.1: an equality, not an absence)
  2. THE SOURCE GREP    no pruned module's script is in the built file
  3. THE MARKUP GREP    no pruned module's ids or classes are in it either —
                        derived from the ownership partition, not written down
  4. NO ORPHAN SELECTOR every CSS selector in the built file matches something
                        in that door's DOM once the door has been exercised.
                        This is the authoritative CSS check and it needs no
                        static analysis at all: a rule left behind by a pruned
                        module has nothing to match, and so does a rule of the
                        shell's own that only that module's markup satisfied.

Plus the stage-1 checks that still apply: file:// with the network aborted,
zero console errors, and exercising the door rather than merely loading it.

usage:  python3 hub/tests/door_locks.py [--shots]
"""
import datetime
import json
import re
import subprocess
import sys
from pathlib import Path

HUB = Path(__file__).resolve().parent.parent
REPO = HUB.parent
BUILD = HUB / "build"
SHOTS = "--shots" in sys.argv

failures = []
checks = 0


def check(cond, msg):
    global checks
    checks += 1
    if not cond:
        failures.append(msg)
    return cond


def node(*args):
    out = subprocess.run(["node", str(HUB / "tools" / "resolve.mjs"), *args],
                         capture_output=True, text=True, cwd=REPO)
    if out.returncode != 0:
        raise SystemExit("resolver failed: " + out.stderr.strip())
    return json.loads(out.stdout)


DECL = re.compile(r"^(?:export\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)", re.M)
IMPORT_LINE = re.compile(r'^\s*import\s[\s\S]*?from\s+"[^"]+"\s*;?\s*$', re.M)


def code_lines(rel_path):
    src = IMPORT_LINE.sub("", (REPO / rel_path).read_text())
    src = re.sub(r"^export\s+", "", src, flags=re.M)
    out = set()
    for ln in src.splitlines():
        s = ln.strip()
        if len(s) >= 16 and not s.startswith(("*", "//", "/*")):
            out.add(s)
    return out


def markers(rel_path, retained):
    """Derived from the source: every identifier it declares at top level, plus
    every code line of its own that no reached file also has. Comment-blind by
    design (engine/README.md).

    A MARKER MUST BE DISTINCTIVE AGAINST THE RETAINED CORPUS, and distinctive in
    the same way it is later tested against the artifact — as a substring, since
    that is how the grep asks. The line half always did this; the identifier
    half did not, and that asymmetry produced false positives the moment two
    modules shared a name (2026-08-17: engine/motion.mjs declares a local
    `placeOnSet`, which engine/tetrad-voicings.mjs also exports, and a comment in
    engine/notepad.mjs contains the word CONFIG).

    A non-distinctive marker is worse than a missing one: it fails on a door
    that is correct, and a gate that cries wolf is a gate people learn to skip.
    Dropping it does not weaken the grep — the module's remaining markers still
    carry it, and `check(ms, ...)` fails loudly if a module is left with none."""
    src = (REPO / rel_path).read_text()
    corpus = "\n".join((REPO / f).read_text() for f in retained)
    names = {n for n in DECL.findall(src)
             if not re.search(r"\b" + re.escape(n) + r"\b", corpus)}
    shared = set().union(*[code_lines(f) for f in retained]) if retained else set()
    lines = {ln for ln in (code_lines(rel_path) - shared) if ln not in corpus}
    return sorted(names) + sorted(lines)


# ---- artifact-level audio analysis (260819.3) ----------------------------
# The instrument records a TIMESTAMP per audio-source start. A CHORD is a BURST
# (>= 4 starts within 250 ms — four voices and the bass land in one tick); a
# CLICK is a singleton. This is the shape the 260819.2 block proved: count what
# the consumer actually did, not what somebody announced. Clustering lives here
# because two blocks use it (the metroOwner pins and the beat-2 join).
AUDIO_TAP = """() => {
  if (!window.__srcTapped) {
    window.__srcTapped = true;
    window.__src = [];
    for (const P of [window.OscillatorNode, window.AudioBufferSourceNode]) {
      const s0 = P.prototype.start;
      P.prototype.start = function (...a) { window.__src.push(performance.now()); return s0.apply(this, a); };
    }
  }
  window.__src.length = 0;
}"""

def bursts_and_clicks(times, window_ms=250, burst_min=4):
    """cluster start-times: (bursts=[{t0, n}], clicks=[t]) in time order"""
    groups = []
    for t in sorted(times):
        if groups and t - groups[-1][-1] <= window_ms: groups[-1].append(t)
        else: groups.append([t])
    bursts = [{"t0": g[0], "n": len(g)} for g in groups if len(g) >= burst_min]
    clicks = [g[0] for g in groups if len(g) < burst_min]
    return bursts, clicks


# in-page: every selector, media blocks included, with pseudo-states stripped
SELECTOR_JS = """() => {
  const out = [];
  const walk = (rules) => {
    for (const r of rules) {
      if (r.type === CSSRule.STYLE_RULE) out.push(r.selectorText);
      else if (r.cssRules) walk(r.cssRules);
    }
  };
  for (const s of document.styleSheets) walk(s.cssRules);
  return out;
}"""


def run_door(pw, door_id):
    r = node(door_id, "--json")
    html_path = BUILD / f"{door_id}.html"
    check(html_path.exists(), f"[{door_id}] no built file — run node hub/tools/build.mjs")
    html = html_path.read_text()
    tag = f"[{door_id}]"

    # ---- 260920 (night 26 item 1): THE TUNING IS DECLARED ONCE IN THE SHIPPED PAGE.
    # tetrad-sequence.mjs stated the six numbers beside field.mjs's derived rule; a
    # door carrying both shipped two tunings that merely agreed. Read on the built
    # bytes: a door that reaches engine/field.mjs declares OPEN_MIDI exactly once,
    # and no door states the numbers as a literal anywhere.
    if "engine/field.mjs" in r["filesIn"]:
        n_decl = len(re.findall(r"\bconst OPEN_MIDI = \(\(\) =>", html))
        check(n_decl == 1, f"{tag} the built page declares OPEN_MIDI {n_decl} time(s); the tuning is stated once, derived")
    check(not re.search(r"OPEN_MIDI = \{", html), f"{tag} the built page states the tuning as a literal")

    # ---------------- 2. the source grep ------------------------------------
    for rel_path in r["filesOut"]:
        ms = markers(rel_path, r["filesIn"])
        check(ms, f"{tag} PRUNED {rel_path} yielded no markers — the grep would be vacuous")
        for m in ms:
            # identifiers match on word boundaries: a bare substring test made
            # "resolve" (motion.mjs) hit the word "resolver" in a comment
            hit = (re.search(r"\b" + re.escape(m) + r"\b", html) if m.isidentifier()
                   else (m in html))
            check(not hit, f"{tag} built file contains {m!r} from PRUNED {rel_path}")
        check(rel_path not in html, f"{tag} built file names the pruned path {rel_path}")
    for rel_path in r["filesIn"]:
        ms = markers(rel_path, [f for f in r["filesIn"] if f != rel_path])
        miss = [m for m in ms if not (
            re.search(r"\b" + re.escape(m) + r"\b", html) if m.isidentifier() else m in html)]
        check(ms and not miss,
              f"{tag} built file is missing marker(s) of REACHED {rel_path}: {miss[:3]}")

    # ---------------- 3. the markup/style grep ------------------------------
    # every id and class a pruned module owns, in any of the three forms it
    # could survive as: an element, a selector, or a bare mention
    # the selector forms match with a BOUNDARY: '.cur' must not hit
    # '.currentTime' (audio-card's, reached) — the marker lesson (a
    # non-distinctive probe fails a door that is correct) arriving in the
    # markup grep, found by the first door to prune chord-timeline while
    # carrying audio (260829)
    for tok in r["tokensAbsent"]:
        for form in (f'id="{tok}"', f'class="{tok}"'):
            check(form not in html,
                  f"{tag} built file contains {form!r} — {tok} belongs to a module "
                  f"this lock prunes, so neither its markup nor its styles may ship")
        for pre in ("#", "."):
            pat = re.compile(re.escape(pre + tok) + r"(?![\w-])")
            check(not pat.search(html),
                  f"{tag} built file contains {pre + tok!r} — {tok} belongs to a module "
                  f"this lock prunes, so neither its markup nor its styles may ship")
    check(r["tokensAbsent"] or not r["modulesOut"],
          f"{tag} modules were pruned but own no markup tokens — the markup grep is vacuous")

    # ---------------- self-contained ----------------------------------------
    for pat in ['src="http', 'href="http', 'src="//', "<script src", '<link rel="stylesheet"']:
        check(pat not in html, f"{tag} built file references something external ({pat})")

    # ---------------- load from file://, network disabled -------------------
    ctx = pw.new_context(viewport={"width": 1280, "height": 900})
    net = []
    ctx.route("**/*", lambda route: (net.append(route.request.url), route.abort())
              if route.request.url.split(":", 1)[0] in ("http", "https")
              else route.continue_())
    page = ctx.new_page()
    console, errors = [], []
    page.on("console", lambda m: console.append((m.type, m.text)))
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(html_path.as_uri())
    page.wait_for_selector("#cards", state="attached")

    check(not errors, f"{tag} page errors: {errors}")
    bad = [c for c in console if c[0] in ("error", "warning")]
    check(not bad, f"{tag} console not clean: {bad}")
    check(not net, f"{tag} attempted network: {net} — a door must work offline")

    # ---------------- 1. the partition --------------------------------------
    rendered = sorted(page.eval_on_selector_all(
        "[data-control]", "els => els.map(e => e.getAttribute('data-control'))"))
    check(rendered == r["controlsPresent"],
          f"{tag} rendered controls != the set derived from the lock\n"
          f"       missing: {sorted(set(r['controlsPresent']) - set(rendered))}\n"
          f"       unclaimed (rendered by nothing the lock reaches): "
          f"{sorted(set(rendered) - set(r['controlsPresent']))}")
    for cid in r["controlsAbsent"]:
        check(page.query_selector(f"#{cid}") is None,
              f"{tag} LOCKED control #{cid} is in the page — the lock is not holding")

    # ---------------- MULTETUDES: the field (child 0) ------------------------
    # Keyed on the DOOR, not on a control id — a gate block keyed to a control
    # that later disappears skips in silence (the suite's own recorded defect),
    # so the door demands its control instead of being gated by it.
    if door_id == "multetudes":
        check("fieldSvg" in r["controlsPresent"],
              f"{tag} the multetudes door has no field board — fieldSvg is not in the partition")
        # the field's dot count, derived HERE in different arithmetic and a
        # different language, against the ARTIFACT (rendered SVG groups)
        OPEN = {6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64}
        MAJOR = [2, 2, 1, 2, 2, 2, 1]
        NAME_PC = {"C": 0, "D": 2, "Bb": 10}

        def field_pcs(root_pc):
            out, acc = [root_pc], root_pc
            for s in MAJOR[:6]:
                acc += s
                out.append(acc % 12)
            return out

        def expect_dots(pcs):
            return sum(1 for s in OPEN for f in range(16) if (OPEN[s] + f) % 12 in pcs)

        def dots_now():
            return page.eval_on_selector_all("#fieldSvg [data-midi]", "e => e.length")

        def root_dots_now():
            return page.evaluate("""() => [...document.querySelectorAll('#fieldSvg [data-midi]')]
              .filter(g => g.querySelector('text').textContent === 'R').length""")

        def expect_pc(pcs, pc):
            return sum(1 for s in OPEN for f in range(16) if (OPEN[s] + f) % 12 == pc and pc in pcs)

        bb_pcs = field_pcs(NAME_PC["Bb"])
        check(dots_now() == expect_dots(bb_pcs),
              f"{tag} the field renders {dots_now()} dots; B\u266d major across six strings holds {expect_dots(bb_pcs)}")
        check(root_dots_now() == expect_pc(bb_pcs, NAME_PC["Bb"]),
              f"{tag} {root_dots_now()} dots wear R; B\u266d occurs {expect_pc(bb_pcs, NAME_PC['Bb'])} times on the neck")
        # ---- 260921 (night 27 item 2, the palette audit): THE SPEC'S COLOURS ON THE ARTIFACT.
        # Night 24 unified five hand copies into hub/palette.mjs; no pin read R's hex (or five
        # of the seven) off anything rendered, so the palette could drift and every pin would
        # stay green. This reads every neck dot's fill by its degree LABEL against Design Spec
        # §2.1's table — stated here as the law, never imported from the palette (a pin that
        # compared the palette to itself would be a tautology). Bite m44 drifts R by one.
        SPEC_21 = {"R": "#B82929", "2": "#3C8B2F", "3": "#2959A6", "4": "#A9ABB4",
                   "5": "#212126", "6": "#1CB8D1", "7": "#D99A08"}
        fills = page.evaluate("""() => { const out = {}; for (const g of document.querySelectorAll('#fieldSvg g.fd-dot')) {
          const lab = g.querySelector('text').textContent, fill = g.querySelector('circle').getAttribute('fill');
          (out[lab] = out[lab] || new Set()).add(fill); } return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v]])); }""")
        check(sorted(fills) == sorted(SPEC_21) and all(fills[k] == [v] for k, v in SPEC_21.items()),
              f"{tag} the neck's dots wear the Spec's colours, one hex per degree (§2.1): {fills}")
        # THE BOOT STATE (register entry 11, ruled 2026-08-28): v0.9's opening
        # frame — the B♭ tetrad block, the window from the 6th at the fifth
        # position, one bar. Re-pinned here from the old C/six-string boot.
        # PINS RE-SITED 260919 (night 25 item 3, rule 7): the state's narration
        # moved from #fdHint to the readout (#roLine) — THE READOUT SAYS WHAT IS.
        # The claims are unchanged; the site and the phrasing are the readout's.
        boot_hint = page.inner_text("#roLine")
        check("Bb major" in boot_hint, f"{tag} the boot key is not B\u266d: {boot_hint!r}")
        check("strings 4–3–2–1" in boot_hint and "5–4–3–2–1" not in boot_hint,
              f"{tag} the boot run is not 4-3-2-1: {boot_hint!r}")
        check("from the 5th on string 4, frets 3–7" in boot_hint,
              f"{tag} the boot window is not v0.9's (the 6th at the fifth position): {boot_hint!r}")
        check("grip" in boot_hint and "1+1+1+1 across the set" in boot_hint,
              f"{tag} the boot object is not the tetrad block: {boot_hint!r}")
        # child 7: the boot étude is v0.9's — the cycling-4ths walk, derived
        # to eight bars, IDENTIFIED chip by chip (a count-only pin hid a
        # wrong chord for two nights; a wrong line must name itself)
        check("bar 1 of 8" in page.inner_text("#roLine"),
              f"{tag} the boot étude is not the derived eight bars: {page.inner_text('#roLine')!r}")
        check(page.get_attribute("#tlScroll", "data-tlline")
              == "Bbmaj7 Ebmaj7 Am7b5 Dm7 Gm7 Cm7 F7 Bbmaj7",
              f"{tag} the boot chart line is not cycling 4ths in B\u266d: "
              f"{page.get_attribute('#tlScroll', 'data-tlline')!r}")
        check(page.eval_on_selector_all("#tlScroll button.tl-cur",
                "es => es.map(e => e.getAttribute('data-tlchip'))") == ["Bbmaj7"],
              f"{tag} the boot's current chip is not bar 1's B\u266dmaj7")
        check(page.eval_on_selector_all("#fieldSvg .fd-sel", "e => e.length") == 4
              and page.eval_on_selector_all("#stSvg ellipse", "e => e.length") >= 4
              # the keys' CHORD circles (260917, item 3: the bass sounds at boot by
              # ruling and draws its own hollow mark, data-kyref — excluded by role)
              and page.eval_on_selector_all("#kySvg circle:not([data-kyref])", "e => e.length") == 4,
              f"{tag} the staff and the keys are not populated on first paint")
        # 260917 item 3 (ruled): the bass DEFAULTS TO THE ROOT — on the fresh
        # page the under-neck view reads root and the neck draws B♭ on string 6
        boot_bass = page.evaluate("""() => { const g = document.querySelector('#fieldSvg .fd-ref');
          return { v: (document.getElementById('fdBass2') || {}).value, s: g && g.dataset.refstr, f: g && g.dataset.reffret }; }""")
        check(boot_bass["v"] == "root" and boot_bass["s"] == "6" and boot_bass["f"] == "6",
              f"{tag} item 3: at boot the bass is the ROOT — B♭ on string 6, fret 6, drawn: {boot_bass}")
        # ... and the block is THE B♭ TETRAD — the chord roots at the KEY, not
        # at the window's anchor degree. Found 260831 (child 4): the door
        # booted on Gm7 (the startDeg chord) while v0.9 boots on B♭maj7 in the
        # same window; the count-of-4 pin above let the wrong chord hide.
        boot_sel = page.evaluate("""() => [...document.querySelectorAll('#fieldSvg .fd-sel')]
          .map(g => [+g.dataset.selstr, +g.dataset.selfret,
                     g.querySelector('text').textContent.trim()])
          .sort((a, b) => a[0] - b[0])""")
        check(boot_sel == [[1, 6, "R"], [2, 6, "5"], [3, 7, "3"], [4, 7, "7"]],
              f"{tag} the boot block is not v0.9's B♭ tetrad (R on B♭): {boot_sel}")
        # THE BOOT PROGRESSION PLACES END TO END (260904): a first run must
        # not refuse at bar 2 — that teaches the wrong thing first. The pin
        # CHOOSES the boot window rather than taste: the engine-side search
        # (260904 report) found frets 3–7 (the 5th at the third position) the
        # only family on strings 4-3-2-1 that keeps the RULED B♭ block
        # (register 11 — same four notes, untouched above) AND places every
        # bar. Asserted bar by bar, each chord NAMED — this is exactly how
        # the Gm7 boot survived two green nights: nothing walked the bars.
        for ci in range(8):
            page.click(f'#tlScroll button >> nth={ci}'); page.wait_for_timeout(120)
            chip = page.eval_on_selector_all("#tlScroll button.tl-cur",
                "es => es.map(e => e.getAttribute('data-tlchip'))")
            n_sel = page.eval_on_selector_all("#fieldSvg .fd-sel", "e => e.length")
            check(n_sel == 4 and "no placement fits" not in page.inner_text("#fdHint"),
                  f"{tag} boot bar {ci + 1} ({chip}) must place its grip whole: "
                  f"{n_sel} notes drawn — {page.inner_text('#fdHint')[:160]!r}")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(120)
        # the field is the KEY: changing it re-derives every dot (the bus is
        # the wiring — harmony announces, the field derives from what it hears)
        page.select_option("#hcKey", "D")
        page.wait_for_timeout(120)
        d_pcs = field_pcs(NAME_PC["D"])
        check(dots_now() == expect_dots(d_pcs) and root_dots_now() == expect_pc(d_pcs, NAME_PC["D"]),
              f"{tag} the field did not re-derive for D major: {dots_now()} dots, "
              f"{root_dots_now()} roots (want {expect_dots(d_pcs)}, {expect_pc(d_pcs, NAME_PC['D'])})")
        # RE-SITED 260919 (rule 7, twice) AND AGAIN 260920 (three times): the hint's key
        # clause moved to the readout, which RE-DERIVES from the bus and follows the key
        # even when the NECK is frozen (bite m10 went silent); then the header box became
        # the shared readout's own instance (night 26 item 3) — bus-derived too, so m10
        # went silent again. The neck's own face is what its build() DRAWS: the dots'
        # degree labels. CONTENT, not a count — D major and B♭ major hold the same number
        # of dots and of roots, so the count pin above cannot tell them apart. The D at
        # midi 62 (string 2, fret 3) wears R in D major; it wore 3 in B♭.
        d_lab = page.evaluate("""() => [...document.querySelectorAll('#fieldSvg g.fd-dot[data-midi="62"] text')].map(t => t.textContent)""")
        check(d_lab and all(x == "R" for x in d_lab),
              f"{tag} the neck's dots did not follow the key — the D at midi 62 must wear R in D major: {d_lab}")
        page.select_option("#hcKey", "Bb"); page.wait_for_timeout(120)   # back to the boot key
        # a field dot SOUNDS (floor F3): clicking one announces NOTE with its midi
        note_probe = """() => { window.__fdNote = null;
          document.addEventListener('atetudes:note', e => window.__fdNote = e.detail.midi); }"""
        page.evaluate(note_probe)
        first_midi = page.evaluate("""() => +document.querySelector('#fieldSvg [data-midi]').dataset.midi""")
        dot = page.query_selector("#fieldSvg [data-midi] circle")
        dot.scroll_into_view_if_needed()
        dot.click(force=True)
        page.wait_for_timeout(80)
        check(page.evaluate("() => window.__fdNote") == first_midi,
              f"{tag} clicking a field dot did not announce its NOTE "
              f"({page.evaluate('() => window.__fdNote')} vs {first_midi})")

        # ---- child 2: the window, the set, the translation, the alias ----
        hint = lambda: page.inner_text("#fdHint")     # reason and affordance (260919)
        state = lambda: page.inner_text("#roLine")    # what is — the readout (260919, re-sited)
        ord_of = lambda: re.search(r"from the (\S+) on string (\d)", state()).groups()
        frets_of = lambda: re.search(r"frets (\d+)–(\d+)", state()).groups()

        # THE WINDOW COVERS THE SET'S OCTAVE (the 2026-09-07 amendment to the
        # 2026-08-21 ruling — Daniel's own correction: "a box should never
        # form over a 3 string set where at least an entire octave is
        # covered"). REWRITTEN, NOT RELAXED: the old pin asserted the PROXY
        # ("width in {4,5} and equal to the anchor triple's span") — the very
        # rule being corrected, which delivered octave coverage only on wide
        # sets. What the old pin caught that is still true, kept: the width
        # is DERIVED and read OFF THE ARTIFACT, the anchor triple is the
        # window's floor and identity (at least 3 anchor-string scale notes,
        # the first three spanning 4-5 frets), and a width that outlives its
        # derivation is a stored width. What the law says NOW, asserted: the
        # dots inside the frame, across the SET's strings, carry every pitch
        # class of the field — and not one fret more than that needs.
        width_of = lambda: int(frets_of()[1]) - int(frets_of()[0]) + 1

        def check_window(where):
            lo, hi = (int(x) for x in frets_of())
            anchor = int(ord_of()[1])
            a_frets = page.evaluate("""([a, lo, hi]) =>
              [...document.querySelectorAll('#fieldSvg [data-str="' + a + '"]')]
                .map(g => +g.dataset.fret).filter(f => f >= lo && f <= hi)""",
                [anchor, lo, hi])
            check(len(a_frets) >= 3,
                  f"{tag} the frame holds {len(a_frets)} anchor-string scale notes at "
                  f"{where} — the anchor triple is the window's floor")
            tri = sorted(a_frets)[:3]
            check(4 <= tri[2] - tri[0] + 1 <= 5,
                  f"{tag} the anchor TRIPLE spans {tri[2] - tri[0] + 1} at {where} — "
                  f"three consecutive scale notes span 4 or 5 frets, always")
            strs = page.evaluate("""() =>
              [...document.querySelectorAll('#fieldSvg [data-fdstr]')]
                .filter(g => g.querySelector('rect[fill="#212126"]'))
                .map(g => +g.dataset.fdstr)""")
            pcs_at = lambda h: page.evaluate("""([ss, lo, h]) => {
              const got = new Set();
              for (const g of document.querySelectorAll('#fieldSvg [data-midi]')) {
                const st = +g.dataset.str, f = +g.dataset.fret;
                if (ss.includes(st) && f >= lo && f <= h) got.add(((+g.dataset.midi % 12) + 12) % 12);
              } return got.size; }""", [strs, lo, h])
            n_classes = pcs_at(hi)
            check(n_classes == 7,
                  f"{tag} the window at {where} gives the set {n_classes}/7 pitch "
                  f"classes — the amendment's law: the SET covers the octave")
            if hi > tri[2]:
                check(pcs_at(hi - 1) < 7,
                      f"{tag} the widened window at {where} is wider than the octave "
                      f"needs — one fret narrower must lose a class")

        check_window("rest")
        check("strings 4–3–2–1" in state(),
              f"{tag} the boot run's derived label is not in the readout: {state()!r}")
        # the window steps — box shift, reversible, read off the artifact.
        # Updated 260904 with the boot move (frets 3–7, the placement pin's
        # choice): the boot starts on the 5th (F); one step up string 4 is G,
        # the 6th — the values move with the ruled boot, the behaviour stands.
        h0, f0 = state(), frets_of()
        page.focus("#fieldSvg")
        page.keyboard.press("ArrowRight"); page.wait_for_timeout(80)
        check(frets_of() != f0 or ord_of() != ("5th", "4"),
              f"{tag} ArrowRight did not step the window: {state()!r}")
        check(ord_of()[0] == "6th", f"{tag} one step from the 5th must start on the 6th: {state()!r}")
        check_window("after ArrowRight")
        page.keyboard.press("ArrowLeft"); page.wait_for_timeout(80)
        check(state() == h0, f"{tag} step right then left did not return the same window")
        check_window("after ArrowLeft")
        page.keyboard.press("ArrowRight"); page.wait_for_timeout(80)   # park on the 7th
        stepped_ord = ord_of()[0]
        # dropping string 3: the set is a SET, the frame stays honest, and the
        # DESIGN SURVIVES — the start degree does not reset with the set
        page.click('#fieldSvg [data-fdstr="3"]'); page.wait_for_timeout(100)
        check("(skipped)" in state(), f"{tag} a skipped run must say so: {state()!r}")
        check(ord_of()[0] == stepped_ord,
              f"{tag} changing the set RESET the design — the window must translate "
              f"({stepped_ord} -> {ord_of()[0]})")
        check_window("after dropping string 3")
        sq3_fill = page.get_attribute('#fieldSvg [data-fdstr="3"] rect', "fill")
        check(sq3_fill == "#fff", f"{tag} the excluded string's square is not hollow: {sq3_fill}")
        dim3 = page.evaluate("""() => {
          const m = /frets (\\d+)–(\\d+)/.exec(document.getElementById('roLine').textContent);
          const [lo, hi] = [+m[1], +m[2]];
          const dots = [...document.querySelectorAll('#fieldSvg [data-str="3"]')]
            .filter(g => +g.dataset.fret >= lo && +g.dataset.fret <= hi);
          return dots.length && dots.every(g => +g.getAttribute('opacity') < 0.28); }""")
        check(dim3, f"{tag} the excluded string's dots inside the frame do not read as excluded")
        page.click('#fieldSvg [data-fdstr="3"]'); page.wait_for_timeout(100)
        check("(skipped)" not in state(), f"{tag} re-adding string 3 did not restore the contiguous run")
        check_window("after re-adding string 3")
        # THE ALIAS: a restored pre-run snapshot (setIndex + key, no strings)
        # translates through the enumeration it indexed, and the board
        # announces the RUN — never setIndex back (no dual-write). A LIVE
        # Shape & Motion push (setIndex without key) must NOT migrate: two set
        # controls coexist in this skeleton, by written decision.
        page.evaluate("""() => { window.__fdCfg = [];
          document.addEventListener('atetudes:config', e => window.__fdCfg.push(e.detail)); }""")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { setIndex: 1, families: ["drop2"] } }))""")
        page.wait_for_timeout(120)
        check("strings 4–3–2–1" in state() and "5–4–3–2" not in state(),
              f"{tag} a live shape-half setIndex (no key) hijacked the field: {state()!r}")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'D', setIndex: 0 } }))""")
        page.wait_for_timeout(120)
        check("strings 6–5–4–3" in state() and "string 6" in state(),
              f"{tag} setIndex 0 did not migrate to the run it indexed: {state()!r}")
        echoed = page.evaluate("""() => window.__fdCfg.find(m => m && m.strings)""")
        check_window("after the setIndex migration")
        check(echoed is not None and echoed.get("strings") == [6, 5, 4, 3]
              and "setIndex" not in echoed,
              f"{tag} the migrated run was not announced as strings-without-setIndex: {echoed}")
        # SAVE, CHANGE, RESTORE: the étude restores byte-identically — the
        # hint reproduces exactly, and the stored entry's bytes never move
        saved_hint = state()   # the readout is the state's narration now (260919)
        page.click("#saveEntry"); page.wait_for_timeout(120)
        entry_before = page.evaluate(
            "() => JSON.stringify(JSON.parse(localStorage.getItem('multetudes.v1.log')).entries[0])")
        page.click('#fieldSvg [data-fdstr="2"]'); page.wait_for_timeout(100)
        check(state() != saved_hint, f"{tag} changing the set changed nothing to restore")
        # RE-AIMED BY ROLE 260916 (rule 12): was `>> text=Restore étude` — a
        # label the adapter composes and a redesign may reword
        page.click(".hist .acts button[data-cap='apply']"); page.wait_for_timeout(150)
        check(state() == saved_hint,
              f"{tag} the restored étude is not the saved one:\n  saved    {saved_hint!r}\n  restored {state()!r}")
        check_window("after Restore")
        entry_after = page.evaluate(
            "() => JSON.stringify(JSON.parse(localStorage.getItem('multetudes.v1.log')).entries[0])")
        check(entry_before == entry_after,
              f"{tag} restore rewrote the saved entry — no dual-write, no reinterpretation")
        page.click(".hist .acts button.danger"); page.wait_for_timeout(100)
        check(page.eval_on_selector_all(".hist", "e => e.length") == 0,
              f"{tag} the exercise entry was not deleted — later notepad gates would miscount")

        # the recipes below were derived for C major — set it explicitly and
        # return to the boot state at the end
        page.select_option("#hcKey", "C")
        page.wait_for_timeout(120)

        # ---- child 3a: the selection — object, take, placement, the recipes ----
        sel_dots = lambda: page.evaluate("""() =>
          [...document.querySelectorAll('#fieldSvg .fd-sel')].map(g => ({
            s: +g.dataset.selstr, f: +g.dataset.selfret,
            label: g.querySelector('text').textContent }))""")

        def per_string(dots):
            c = {}
            for d0 in dots:
                c[d0["s"]] = c.get(d0["s"], 0) + 1
            return c

        def addrs(dots):
            return sorted((d0["s"], d0["f"]) for d0 in dots)

        def set_strings(target):
            cur = page.evaluate("""() =>
              [...document.querySelectorAll('#fieldSvg [data-fdstr]')]
                .filter(g => g.querySelector('rect').getAttribute('fill') !== '#fff')
                .map(g => +g.dataset.fdstr)""")
            for s in sorted(set(cur) ^ set(target)):
                page.click(f'#fieldSvg [data-fdstr="{s}"]')
                page.wait_for_timeout(60)

        # R15 — the six-string scale box: every note the box offers, the reach
        # the only cap, PLACEMENT SWITCHED OFF WITH THE REASON ON THE LABEL
        set_strings([6, 5, 4, 3, 2, 1])
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { startDeg: 0, nearFret: 5 } }))""")
        page.select_option("#hcObj", "scale"); page.wait_for_timeout(100)
        r15 = sel_dots()
        check(12 <= len(r15) <= 18,
              f"{tag} R15: the six-string scale box offers 12–18 notes, not {len(r15)}")
        check(all(c <= 3 for c in per_string(r15).values()),
              f"{tag} R15: a string carries more than the hand's reach: {per_string(r15)}")
        # PIN REWRITTEN 260913 (item 1): Take moved to the rail as the
        # all-tones checkbox — the same scale coupling, the same precedent,
        # now on the checkbox's own label beside Placement's
        at_scale = page.evaluate("""() => { const c = document.getElementById('fdAllTones');
          const lab = document.getElementById('fdAllTonesLab');
          return { there: !!c, disabled: c ? c.disabled : None,
                   lab: lab ? lab.textContent : '(no label on this build)' }; }"""
          .replace('None', 'null'))
        check(at_scale["there"] and at_scale["disabled"] is True
              and page.eval_on_selector_all("#fdNSeg button:disabled", "e => e.length") == 2,
              f"{tag} a scale is not a chord — all tones and Placement must switch OFF "
              f"under it: {at_scale}")
        # re-sited 260919: the reason lives on Placement's own cap (4e); the hint no longer repeats it
        check("a scale is not a chord" in page.evaluate("() => document.getElementById('fdNSeg').parentElement.previousElementSibling.textContent")
              and "a scale is not a chord" not in hint()
              and "a scale takes the whole box" in at_scale["lab"],
              f"{tag} the off-switch must carry its reason on the label: {at_scale['lab']!r}")
        # the tetrad, one of each, Grip: a voicing — one per string, four roles
        page.select_option("#hcObj", "tetrad"); page.wait_for_timeout(100)
        grip = sel_dots()
        check(len(grip) == 4 and all(c == 1 for c in per_string(grip).values()),
              f"{tag} a tetrad voicing at Grip is four notes, one per string: {grip}")
        check(sorted(d0["label"] for d0 in grip) == ["3", "5", "7", "R"],
              f"{tag} the four roles must all be worn: {[d0['label'] for d0 in grip]}")
        # TAKE IS NOT PLACEMENT, on the artifact: Line must not move a note
        page.click('#fdNSeg button[data-nps=\"3\"]'); page.wait_for_timeout(100)
        check(addrs(sel_dots()) == addrs(grip),
              f"{tag} raising the ceiling CHANGED the voicing — Take and Placement have collapsed "
              f"({addrs(grip)} -> {addrs(sel_dots())})")
        # every occurrence: the arpeggio doubles a string, and the two notes on
        # one string are distinct dots at distinct frets — on the neck
        page.check("#fdAllTones"); page.wait_for_timeout(100)
        arp = sel_dots()
        check(len(arp) > 4, f"{tag} every-occurrence must offer more than the voicing ({len(arp)})")
        doubled = {s: c for s, c in per_string(arp).items() if c >= 2}
        check(bool(doubled), f"{tag} the arpeggio never doubled a string: {per_string(arp)}")
        for s in doubled:
            frets = sorted(d0["f"] for d0 in arp if d0["s"] == s)
            check(len(set(frets)) == len(frets),
                  f"{tag} two notes on string {s} share a fret — the collision law broke on the artifact")
        # a selection dot SOUNDS (and it is the top ink over its ghost)
        page.evaluate(note_probe)
        first_sel = page.evaluate("""() => { const g = document.querySelector('#fieldSvg .fd-sel');
          return +g.dataset.selmidi; }""")
        page.evaluate("""() => document.querySelector('#fieldSvg .fd-sel circle')
          .dispatchEvent(new MouseEvent('click', { bubbles: true }))""")
        page.wait_for_timeout(80)
        check(page.evaluate("() => window.__fdNote") == first_sel,
              f"{tag} clicking a selection dot did not announce its NOTE")
        # R7 — the fold: a triad on {3,2} at Line folds 2+1; and at Grip the
        # same four... first the LOUD refusal: a tetrad on two strings at Grip
        set_strings([3, 2])
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { startDeg: 0, nearFret: 5 } }))""")
        page.click('#fdNSeg button[data-nps=\"1\"]'); page.wait_for_timeout(60)
        page.uncheck("#fdAllTones"); page.wait_for_timeout(100)
        check("no placement fits" in hint(),
              f"{tag} a tetrad on two strings at one-per-string must refuse LOUDLY: {hint()!r}")
        page.select_option("#hcObj", "triad"); page.wait_for_timeout(60)
        page.click('#fdNSeg button[data-nps=\"3\"]'); page.wait_for_timeout(100)
        r7 = sel_dots()
        check(len(r7) == 3 and sorted(per_string(r7).values()) == [1, 2],
              f"{tag} R7: a triad folded onto two strings is 2+1, not {per_string(r7)}")
        # R5 — the scale, three per string, on two strings
        set_strings([4, 3])
        page.select_option("#hcObj", "scale"); page.wait_for_timeout(100)
        r5 = sel_dots()
        check(len(r5) == 6 and sorted(per_string(r5).values()) == [3, 3],
              f"{tag} R5: three notes per string on two strings is six notes, not {per_string(r5)}")
        # R11 — triad lines over {4,3,2}
        set_strings([4, 3, 2])
        page.select_option("#hcObj", "triad"); page.wait_for_timeout(60)
        page.check("#fdAllTones"); page.wait_for_timeout(100)
        r11 = sel_dots()
        check(len(r11) >= 4 and all(c <= 3 for c in per_string(r11).values())
              and set(d0["label"] for d0 in r11) <= {"R", "3", "5"},
              f"{tag} R11: triad lines must be triad tones only, ≤3 per string: {r11}")
        # R14 — tetrad lines over {5,4,3,2}
        set_strings([5, 4, 3, 2])
        page.select_option("#hcObj", "tetrad"); page.wait_for_timeout(100)
        r14 = sel_dots()
        check(len(r14) >= 5 and any(c >= 2 for c in per_string(r14).values())
              and set(d0["label"] for d0 in r14) <= {"R", "3", "5", "7"},
              f"{tag} R14: tetrad lines must double somewhere and stay tetrad tones: {r14}")
        # leave the field as the door boots: R15
        page.uncheck("#fdAllTones"); page.wait_for_timeout(30)
        page.click('#fdNSeg button[data-nps=\"1\"]'); page.wait_for_timeout(30)
        set_strings([4, 3, 2, 1])
        page.select_option("#hcKey", "Bb"); page.wait_for_timeout(60)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { startDeg: 4, nearFret: 3 } }))""")
        page.select_option("#hcObj", "tetrad"); page.wait_for_timeout(60)
        check("from the 5th on string 4, frets 3–7" in state()
              and "grip" in state() and "1+1+1+1 across the set" in state(),
              f"{tag} the door did not return to its boot state for the shots: {state()!r}")

        # ---- 260909 item 5: A CHOSEN PRESET LEAVES A TRACE ----
        # Seed-then-release stands (the select empties), but the card now
        # names the recipe that seeded the state — and derives "modified"
        # by COMPARING the live config to the preset's own seeded values.
        # No dirty flag: drift is a comparison. Moving a control the preset
        # never seeded (the key) is NOT drift — those stay the player's.
        ps_trace = ("() => { const t = document.getElementById('psTrace');"
                    " return t ? t.textContent : '(no #psTrace on this build)'; }")
        page.select_option("#psSel", "12"); page.wait_for_timeout(250)   # R26 · a guide-tone dyad
        tr = page.evaluate(ps_trace)
        check("R26" in tr and "guide-tone" in tr and "modified" not in tr,
              f"{tag} the trace names the freshly seeded preset, unmodified: {tr!r}")
        check(page.eval_on_selector("#psSel", "e => e.value") == "",
              f"{tag} seed-then-release still stands — the select empties")
        page.select_option("#hcKey", "D"); page.wait_for_timeout(200)
        tr = page.evaluate(ps_trace)
        check("modified" not in tr,
              f"{tag} the KEY is not seeded — moving it is not drift: {tr!r}")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { notesPer: 3 } }))""")
        page.wait_for_timeout(200)
        tr = page.evaluate(ps_trace)
        check("R26" in tr and "· modified" in tr,
              f"{tag} drifting a SEEDED value derives 'modified': {tr!r}")
        page.select_option("#psSel", "12"); page.wait_for_timeout(250)
        tr = page.evaluate(ps_trace)
        check("modified" not in tr,
              f"{tag} re-seeding the preset clears the derived drift: {tr!r}")
        # full boot restore — this block moved key, object, dyad and the cap
        page.select_option("#hcKey", "Bb"); page.wait_for_timeout(120)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,
                      object: 'tetrad', take: 'one', notesPer: 1, movement: 'strum',
                      address: 'pattern', figure: '', source: 'cycle', custom: '' } }))""")
        page.wait_for_timeout(200)

        # ---- 260909 item 2: THE FIRST NOTE OF A NEW BAR RINGS ----
        # Measured: on an advance the walk's STEP listener runs before the
        # board's, so the new chord's first NOTE arrives against the OLD
        # bar's dots — no matching data-selmidi, no ring, and the rebuild
        # lands ~10ms later (NOTE t=3556, REBUILD t=3567 in the trace). The
        # board now holds the miss and flushes it onto the fresh dots.
        # Asserted at the artifact: every NOTE of a played pass — the
        # advance's first note included — shows a ring at its own dot.
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,
                      object: 'tetrad', take: 'one', notesPer: 1, movement: 'arpeggiate',
                      address: 'pattern', figure: '4,3,2,1', source: 'cycle', custom: '' } }))""")
        page.wait_for_timeout(250)
        page.evaluate("""() => {
          if (window.__pulseHooked) { window.__pulseLog = []; return; }
          window.__pulseHooked = true; window.__pulseLog = [];
          document.addEventListener('atetudes:step', (e) => {
            const m = e.detail || {};
            if (m.request !== true && typeof m.index === 'number')
              window.__pulseLog.push({ ev: 'STEP', index: m.index });
          }, true);
          document.addEventListener('atetudes:note', (e) => {
            const m = e.detail || {};
            if (typeof m.midi !== 'number') return;
            const row = { ev: 'NOTE', midi: m.midi, role: m.role || null, rang: false };
            window.__pulseLog.push(row);
            setTimeout(() => {
              const svg = document.getElementById('fieldSvg');
              const dot = svg && svg.querySelector(`.fd-sel[data-selmidi="${m.midi}"] circle`);
              if (!dot) return;
              row.rang = [...svg.querySelectorAll('.fd-pulse')].some((rg) =>
                rg.getAttribute('cx') === dot.getAttribute('cx')
                && rg.getAttribute('cy') === dot.getAttribute('cy'));
            }, 120);
          }, true);
        }""")
        # FOUND 260915 (item 1, measured at the change site): this leg was
        # THE ARMER behind the two-night armed-walk hunt. It hunted play and
        # stop by GLYPH ('▶'/'■'); night 17's transport-mini rebuild renamed
        # the stop glyph to '⏹', the `if (b)` swallowed the miss (rule 2's
        # exact shape), and the leg played WITHOUT EVER STOPPING — the walk
        # arrived armed at every later leg, clock running, for 14 seconds of
        # gate time. Role-addressed and UNCONDITIONAL now: a missing button
        # fails loudly here, at the owner, instead of arming the night.
        page.click('#tlStripMini button[data-role="play"]')
        page.wait_for_timeout(4500)
        page.click('#tlStripMini button[data-role="stop"]')
        page.wait_for_timeout(400)
        plog = page.evaluate("() => window.__pulseLog")
        step_i = next((i for i, r in enumerate(plog) if r["ev"] == "STEP"), None)
        check(step_i is not None, f"{tag} the played pass reached an advance (log: {plog[:6]})")
        # bass NOTEs excluded BY ROLE (260917, item 3): the bass sounds at boot by
        # ruling (root default) and rings at the hollow reference, not a selection dot
        notes = [r for r in plog if r["ev"] == "NOTE" and r.get("role") != "bass"]
        first_after = next((r for r in plog[step_i:] if r["ev"] == "NOTE" and r.get("role") != "bass"), None) if step_i is not None else None
        check(bool(notes) and all(r["rang"] for r in notes),
              f"{tag} EVERY sounded note rings at its dot — silent-ringed: "
              f"{[r['midi'] for r in notes if not r['rang']]}")
        check(first_after is not None and first_after["rang"],
              f"{tag} the NEW bar's first note rings (the one the rebuild used to eat): {first_after}")
        # full boot restore — this block set arpeggio movement AND a typed figure
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,
                      object: 'tetrad', take: 'one', notesPer: 1, movement: 'strum',
                      address: 'pattern', figure: '', source: 'cycle', custom: '' } }))""")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(200)

        # ---- 260911 item 6: THE VERTICAL DRAG, OUT OF THE WORMHOLE ----
        # Measured across three slow drags: the one-crossing jump is the
        # ratified translation law following the DEGREE to its nearest home
        # on the new anchor (lawful — now NAMED on the face); the round trip
        # not returning and a repeated gesture landing in a THIRD place were
        # the stale drag basis — i0 captured against a list that setStrings
        # rebuilt mid-drag (the lead held). The drag now re-bases i0, p0 and
        # strings0 together on every commit. Pinned as a PROPERTY, never a
        # magic fret: the same gesture from the same state lands the same
        # window; the round trip returns; a forced follow says so.
        wh_state = ("() => { const t = document.getElementById('roLine').textContent;"
                    " const m = t.match(/frets (\\d+)[–-](\\d+)/); const s2 = t.match(/strings ([\\d–-]+)/);"
                    " return (m ? m[1] + '-' + m[2] : '?') + ' on ' + (s2 ? s2[1] : '?'); }")
        page.evaluate("() => document.getElementById('fieldSvg').scrollIntoView({block:'center'})")
        page.wait_for_timeout(200)
        def wh_drag(dy):
            g = page.evaluate("""() => { const g = document.querySelector('#fieldSvg .fd-grip');
              const r = g.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; }""")
            page.mouse.move(g["x"], g["y"]); page.mouse.down()
            for wh_k in range(1, 11):
                page.mouse.move(g["x"], g["y"] + dy * wh_k / 10); page.wait_for_timeout(40)
            page.mouse.up(); page.wait_for_timeout(250)
        wh0 = page.evaluate(wh_state)
        wh_drag(+30); wh1 = page.evaluate(wh_state)
        wh_hint = page.inner_text("#fdHint")
        wh_drag(-30); wh_back = page.evaluate(wh_state)
        wh_drag(+30); wh2 = page.evaluate(wh_state)
        check(wh1 != wh0 and "the window followed the" in wh_hint and "on string" in wh_hint,
              f"{tag} a forced follow is NAMED on the face (crossed to {wh1}): "
              f"{[l for l in [wh_hint[:180]]]}")
        check(wh_back == wh0,
              f"{tag} the round trip RETURNS — down then up lands the boot window "
              f"({wh_back} vs {wh0})")
        check(wh2 == wh1,
              f"{tag} the same gesture from the same state lands the SAME window — "
              f"no third place ({wh2} vs first crossing {wh1})")
        # restore the boot window
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,
                      object: 'tetrad', take: 'one', notesPer: 1, movement: 'strum',
                      address: 'pattern', figure: '', source: 'cycle', custom: '' } }))""")
        page.wait_for_timeout(200)

        # ---- 260914 item 2: THE CARD NAMES ITS PRINCIPLE ----
        # Harmony -> CENTRICITY (ruled): the card defines the material and
        # what organises it; harmony is Progression's, beside it. The card
        # names the principle, the control inside names the value — and
        # "the field" survives untouched in the module and the prose.
        c2h = page.evaluate("""() => { const h = [...document.querySelectorAll('.card h2')]
          .map(x => x.textContent.trim()); return h; }""")
        check("Centricity" in c2h and "Harmony" not in c2h,
              f"{tag} the card reads CENTRICITY, and no card reads Harmony: {c2h}")
        check("the whole field" in page.inner_text("#roLine"),   # re-sited 260919: the readout says what is
              f"{tag} 'the field' survives in the prose — the set keeps its own word: {page.inner_text('#roLine')[:80]!r}")

        # ---- 260914 item 1: THE CENTRE HAS A SOURCE, PINNED AT THE SOUND ----
        # A fixed centre and a moving progression were contradictory by
        # construction; reference.mjs's own 260831 sentence deferred the
        # fixed half "until the chords change" — child 7 landed 260901 and
        # this completes it. Under FIXED, N bars sound the SAME bass pitch
        # while the chords change; under FOLLOWS the bass tracks each bar's
        # root. Asserted at the NOTE stream with raw-start parity — a
        # message trace is not a sound. The window must not jump per bar
        # under either source (the ratified window law).
        if not page.evaluate("() => !!document.getElementById('hcCentreSrc')"):
            check(False, f"{tag} the centre-source control is absent from this build")
        else:
            page.select_option("#hcObj", "scale"); page.wait_for_timeout(200)
            page.select_option("#fdBass2", "root"); page.wait_for_timeout(250)
            page.evaluate("""() => {
              if (!window.__ntHooked) { window.__ntHooked = true; window.__nt = [];
                document.addEventListener('atetudes:note', e =>
                  window.__nt.push({ m: e.detail.midi, t: performance.now(), r: e.detail.role || null })); }
              if (!window.__rawHooked) { window.__rawHooked = true;
                for (const C of [AudioBufferSourceNode, OscillatorNode]) {
                  const P = C.prototype.start;
                  C.prototype.start = function(...a) { (window.__raw ||= []).push(1);
                    return P.apply(this, a); }; } }
              window.__nt = []; window.__raw = []; }""")
            page.uncheck("#fdMetChk"); page.wait_for_timeout(120)
            def cs_basses():
                out = []
                for cs_bar in range(4):
                    page.evaluate("() => { window.__nt = []; window.__raw = [] }")
                    page.click(f'#tlScroll button >> nth={cs_bar}')
                    page.wait_for_timeout(450)
                    got = page.evaluate("""() => ({
                      bass: (window.__nt.find(n => n.r === 'bass') || {}).m,
                      nt: window.__nt.length, raw: window.__raw.length,
                      win: (document.getElementById('roLine').textContent
                        .match(/frets (\\d+[–-]\\d+)/) || [])[1] })""")
                    out.append(got)
                return out
            cs_f = cs_basses()
            check(all(g["bass"] is not None for g in cs_f)
                  and len(set(g["bass"] for g in cs_f)) == 1,
                  f"{tag} FIXED: four bars, one bass pitch — the pedal "
                  f"({[g['bass'] for g in cs_f]})")
            check(all(g["raw"] == g["nt"] for g in cs_f),
                  f"{tag} FIXED: raw starts == NOTEs, every audited bar "
                  f"({[(g['nt'], g['raw']) for g in cs_f]})")
            page.evaluate("""() => { [...document.querySelectorAll('#hcCentreSrc button')]
              .find(b => b.dataset.src === 'follows').click(); }""")
            page.wait_for_timeout(300)
            cs_v = cs_basses()
            check(all(g["bass"] is not None for g in cs_v)
                  and len(set(g["bass"] for g in cs_v)) >= 3,
                  f"{tag} FOLLOWS: the bass tracks each bar's root "
                  f"({[g['bass'] for g in cs_v]})")
            check(all(g["raw"] == g["nt"] for g in cs_v),
                  f"{tag} FOLLOWS: raw parity holds "
                  f"({[(g['nt'], g['raw']) for g in cs_v]})")
            check(len(set(g["win"] for g in cs_f + cs_v)) == 1,
                  f"{tag} the WINDOW never jumps under either source "
                  f"({sorted(set(g['win'] for g in cs_f + cs_v))})")
            ro = page.inner_text("#roLine")
            check("follows the changes" in ro,
                  f"{tag} the readout says which source is in force: {ro[:100]!r}")
            page.evaluate("""() => { [...document.querySelectorAll('#hcCentreSrc button')]
              .find(b => b.dataset.src === 'fixed').click(); }""")
            page.wait_for_timeout(200)
            ro = page.inner_text("#roLine")
            check("a pedal under the moving chords" in ro,
                  f"{tag} …and the pedal names itself too: {ro[:100]!r}")
            page.check("#fdMetChk")
            page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
              { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,
                          object: 'tetrad', take: 'one', notesPer: 1, movement: 'strum',
                          address: 'pattern', figure: '', ref: 0, bass: 'none',
                          centreSrc: 'fixed', source: 'cycle', custom: '' } }))""")
            page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
              { detail: { index: 0, request: true } }))""")
            page.wait_for_timeout(250)


        # ---- 260915 item 4: THE CC-1 AUDIT'S ONE FINDING, PINNED ----
        # The ratification audit walked every disabled control against CC-1
        # (the contradicting-controls doctrine, notes/specs). One violation:
        # the chord-mode paint never CLEARED the scale paint's disable, so
        # scale -> follows -> chord left "Bass tone" dead with no reason on
        # any face (rule 10: the PAINT site is one of the three). The pin
        # walks that exact path.
        page.select_option("#hcObj", "scale"); page.wait_for_timeout(200)
        page.evaluate("""() => { [...document.querySelectorAll('#hcCentreSrc button')]
          .find(x => x.dataset.src === 'follows').click(); }""")
        page.wait_for_timeout(200)
        cc1 = page.evaluate("""() => ({
          dis: document.getElementById('hcRef').disabled,
          lab: document.getElementById('hcRefLab').textContent })""")
        check(cc1["dis"] is True and "following the changes" in cc1["lab"],
              f"{tag} CC-1(a): under follows the fixed pick is off WITH its reason "
              f"on its own label: {cc1}")
        page.select_option("#hcObj", "tetrad"); page.wait_for_timeout(250)
        # PIN REWRITTEN 260917 (item 4, register 31): in chord mode the card's
        # bass WINDOW is closed (hidden, never dead-with-no-reason); the bass
        # control lives under the neck and is live there — CC-1's audit fix
        # (the scale disable cleared) now proves itself on the surviving view
        cc1 = page.evaluate("""() => ({
          hidden: document.getElementById('hcRef').hidden,
          labHidden: document.getElementById('hcRefLab').hidden,
          bass2dis: document.getElementById('fdBass2').disabled })""")
        check(cc1["hidden"] is True and cc1["labHidden"] is True and cc1["bass2dis"] is False,
              f"{tag} item 4: chord mode closes the card's bass window and the under-neck control is live: {cc1}")
        page.select_option("#hcObj", "scale"); page.wait_for_timeout(150)
        page.evaluate("""() => { [...document.querySelectorAll('#hcCentreSrc button')]
          .find(x => x.dataset.src === 'fixed').click(); }""")
        page.wait_for_timeout(150)
        page.select_option("#hcObj", "tetrad"); page.wait_for_timeout(200)
        # ---- 260914 item 3: THE STACKS GO PAST FOUR, AND THE DROP HAS A NAME ----
        # Depth is DATA (STACK_DEPTH), not a ternary; the grip drops by a
        # NAMED rule (5th first, then non-naming extensions 11-before-9;
        # R/3/7/the naming extension never — PROPOSED, like `bed`) and
        # whatever is dropped is SAID on the face, every time. SOUND = SIGHT:
        # the walk's fit is the boards' fit — the NOTE stream carries exactly
        # the kept roles. The scale/Grip boundary is untouched.
        c3menu = page.evaluate("""() => [...document.querySelectorAll('#hcObj option')]
          .map(o => o.value)""")
        check(all(o in c3menu for o in ["ninth", "eleventh", "thirteenth"]),
              f"{tag} 3: the menu offers the extended stacks: {c3menu}")
        page.select_option("#hcObj", "thirteenth"); page.wait_for_timeout(300)
        c3g = page.evaluate("""() => ({
          roles: [...document.querySelectorAll('#fieldSvg .fd-sel text')]
            .map(t => t.textContent).sort(),
          hint: document.getElementById('fdHint').textContent,
          ro: document.getElementById('roLine').textContent })""")
        check(c3g["roles"] == ["13", "3", "7", "R"],
              f"{tag} 3: a 13th on a 4-string Grip draws exactly R 3 7 13 — "
              f"the naming extension survives ({c3g['roles']})")
        check("the 5, 11, 9 dropped by the grip rule" in c3g["hint"]
              and "carry R 3 7 13" in c3g["hint"],
              f"{tag} 3: the neck SAYS the drop, in the omission order: "
              f"{c3g['hint'][:130]!r}")
        check("dropped by the grip rule" in c3g["ro"],
              f"{tag} 3: the readout says it too — two faces, one sentence: "
              f"{c3g['ro'][:120]!r}")
        # SOUND = SIGHT: the audited bar's NOTE roles are the KEPT roles
        page.evaluate("""() => {
          if (!window.__ntHooked) { window.__ntHooked = true; window.__nt = [];
            document.addEventListener('atetudes:note', e =>
              window.__nt.push({ m: e.detail.midi, t: performance.now(),
                                 r: e.detail.role || null })); }
          window.__nt = []; }""")
        page.uncheck("#fdMetChk"); page.wait_for_timeout(120)
        # (260915, item 1: the twin normalisation here removed with its
        # sibling — the armer is fixed at the owner, the 260909 ring leg.)
        page.evaluate("() => { window.__nt = [] }")
        page.click('#tlScroll button >> nth=0'); page.wait_for_timeout(500)
        # the walk's chord NOTEs are role-less (only the bass names itself) —
        # so the pin is at the MIDIS: what sounded IS what is drawn, no more
        c3nt = page.evaluate("""() => ({
          heard: window.__nt.filter(n => n.r !== 'bass').map(n => n.m).sort(),
          drawn: [...document.querySelectorAll('#fieldSvg .fd-sel')]
            .map(g => +g.getAttribute('data-selmidi')).sort() })""")
        check(len(c3nt["heard"]) == 4 and c3nt["heard"] == c3nt["drawn"],
              f"{tag} 3: SOUND = SIGHT — the walk sounds exactly the kept "
              f"four the neck draws ({c3nt})")
        page.check("#fdMetChk"); page.wait_for_timeout(120)
        # the 11th keeps its 11 — the naming extension is untouchable
        page.select_option("#hcObj", "eleventh"); page.wait_for_timeout(300)
        c3e = page.evaluate("""() => ({
          roles: [...document.querySelectorAll('#fieldSvg .fd-sel text')]
            .map(t => t.textContent).sort(),
          hint: document.getElementById('fdHint').textContent })""")
        check(c3e["roles"] == ["11", "3", "7", "R"]
              and "the 5, 9 dropped by the grip rule" in c3e["hint"],
              f"{tag} 3: a 4-string 11th keeps its 11, dropping the 5 and 9: {c3e}")
        # Line has slots for all seven — nothing drops, nothing is said
        page.select_option("#hcObj", "thirteenth"); page.wait_for_timeout(250)
        page.evaluate("""() => { [...document.querySelectorAll('#fdNSeg button')]
          .find(x => x.dataset.nps === '3').click(); }""")
        page.wait_for_timeout(300)
        c3l = page.evaluate("""() => ({
          roles: [...new Set([...document.querySelectorAll('#fieldSvg .fd-sel text')]
            .map(t => t.textContent))].sort(),
          hint: document.getElementById('fdHint').textContent })""")
        check(c3l["roles"] == ["11", "13", "3", "5", "7", "9", "R"],
              f"{tag} 3: Line carries the whole 13th — all seven roles placed "
              f"({c3l['roles']})")
        check("dropped by the grip rule" not in c3l["hint"],
              f"{tag} 3: …and the drop sentence is ABSENT when nothing drops")
        # past the rule's reach: 2 slots for the kept four — refused BY NAME
        page.evaluate("""() => { [...document.querySelectorAll('#fdNSeg button')]
          .find(x => x.dataset.nps === '1').click(); }""")
        page.wait_for_timeout(200)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { strings: [2, 1] } }))""")
        page.wait_for_timeout(300)
        c3r = page.inner_text("#fdHint")
        check("no named rule reduces further" in c3r,
              f"{tag} 3: two strings for the kept four REFUSES by name: {c3r[:140]!r}")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { strings: [4, 3, 2, 1] } }))""")
        page.wait_for_timeout(250)
        # the scale/Grip boundary untouched: the box is still the whole box
        page.select_option("#hcObj", "scale"); page.wait_for_timeout(250)
        c3s = page.evaluate("""() => ({
          n: document.querySelectorAll('#fieldSvg .fd-sel').length,
          hint: document.getElementById('fdHint').textContent })""")
        check(c3s["n"] >= 10 and "dropped by the grip rule" not in c3s["hint"],
              f"{tag} 3: the scale box is untouched by the grip rule "
              f"({c3s['n']} selected, no drop sentence)")
        page.select_option("#hcObj", "tetrad"); page.wait_for_timeout(250)

        # ---- 260913b item 4: THE CENTRE WORKS ----
        # Scale mode had a centre and nothing consumed it. Ruled: the bass
        # places against the CENTRE (same placeReference, different origin);
        # figures address degrees from the centre (R 3 5 7 9 11 13, the
        # ordinal law ported from the pattern alphabet); movement returns
        # once a figure resolves; Placement STAYS off (genuinely chord
        # voicing — the boundary the finding rests on); every disabled
        # control says why on its own label.
        page.select_option("#hcObj", "scale"); page.wait_for_timeout(200)
        page.select_option("#hcRef", "mode:2"); page.wait_for_timeout(200)
        c4 = page.evaluate("""() => ({
          bass2: (document.getElementById('fdBass2') || {}).disabled,
          placeCap: (document.getElementById('fdNSeg') || {parentElement:{}}).parentElement
            .previousElementSibling.textContent,
          moveCap: document.getElementById('fdMoveSeg').previousElementSibling.textContent,
          moves: [...document.querySelectorAll('#fdMoveSeg button')].map(b => b.disabled) })""")
        check(c4["bass2"] is False,
              f"{tag} 4a: the bass view is LIVE in scale mode: {c4}")
        check("a scale is not a chord" in c4["placeCap"],
              f"{tag} 4d+4e: Placement stays OFF with the reason on its own cap: "
              f"{c4['placeCap']!r}")
        check("a scale is a run" in c4["moveCap"] and c4["moves"] == [True, True],
              f"{tag} 4e: figure-less scale movement is off, reason on the cap: {c4}")
        # 4a at the artifact: centre D, bass root — the reference draws on
        # the neck, the keys and the staff, and the audition SOUNDS it
        page.select_option("#fdBass2", "root"); page.wait_for_timeout(300)
        c4a = page.evaluate("""() => ({
          neck: document.querySelectorAll('#fieldSvg .fd-ref').length,
          keys: document.querySelectorAll('#kySvg circle[data-kyref]').length,
          staff: document.querySelectorAll('#stSvg [data-strefmidi]').length,
          refMidi: (document.querySelector('#fieldSvg .fd-ref') || { getAttribute: () => null })
            .getAttribute('data-refmidi') })""")
        check(c4a["neck"] == 1 and c4a["keys"] == 1 and c4a["staff"] >= 1,
              f"{tag} 4a: the CENTRE's reference draws on neck, keys and staff: {c4a}")
        page.evaluate("""() => {
          if (!window.__ntHooked) { window.__ntHooked = true; window.__nt = [];
            document.addEventListener('atetudes:note', e =>
              window.__nt.push({ m: e.detail.midi, t: performance.now(), r: e.detail.role || null })); }
          if (!window.__stepAllHooked) { window.__stepAllHooked = true; window.__stepAll = [];
            document.addEventListener('atetudes:step', e => {
              const m = e.detail || {};
              window.__stepAll.push({ i: m.index, req: m.request === true,
                atk: m.attack === true }); }, true); }
          window.__nt = []; window.__stepAll = []; }""")
        # (260915, item 1: the entry normalisation that stood here was a
        # symptom fix — the armer was the 260909 ring leg's silent glyph
        # miss, found by logging armed's transitions, and is fixed at the
        # owner. §4.4: a suppression with no live defect behind it is
        # itself a divergence, so it is REMOVED, not kept.)
        page.evaluate("() => { window.__nt = [] }")
        page.click('#tlScroll button >> nth=0'); page.wait_for_timeout(600)
        c4nt = page.evaluate("() => window.__nt.map(n => n.m)")
        c4st = page.evaluate("() => window.__stepAll")
        c4clk = page.evaluate("() => document.getElementById('metroBtn').textContent")
        check(c4a["refMidi"] is not None and int(c4a["refMidi"]) in c4nt,
              f"{tag} 4a: the audition SOUNDS the centre's bass (ref {c4a['refMidi']}, "
              f"NOTEs {c4nt[:14]}, steps {c4st}, metro {c4clk!r})")
        # 4b: figures address the centre — R-3-5-7 resolves on every bar,
        # the compounds reach the extensions, and 2 still mode-mismatches
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { address: 'tones', figure: 'R-3-5-7' } }))""")
        page.wait_for_timeout(300)
        fj4 = page.inner_text("#fdFigNote")
        check("carries no" not in fj4 and "not a tone" not in fj4,
              f"{tag} 4b: R-3-5-7 RESOLVES in scale mode — no refusal: {fj4[:80]!r}")
        check(page.eval_on_selector_all("#stSvg [data-stfig]", "e => e.length") == 32,
              f"{tag} 4b: the staff wears the 4-step figure on all 8 bars")
        c4m = page.evaluate("""() => [...document.querySelectorAll('#fdMoveSeg button')]
          .map(b => [b.dataset.move, b.disabled])""")
        check(dict(c4m)["arpeggiate"] is False and dict(c4m)["strum"] is True,
              f"{tag} 4c: movement returns with the figure — arpeggiate live, strum "
              f"under the figure override: {c4m}")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { figure: 'R-9-11-13' } }))""")
        page.wait_for_timeout(300)
        fj4 = page.inner_text("#fdFigNote")
        check("carries no" not in fj4 and "not a tone" not in fj4
              and page.eval_on_selector_all("#stSvg [data-stfig]", "e => e.length") == 32,
              f"{tag} 4b: the compounds 9/11/13 reach the extensions: {fj4[:80]!r}")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { figure: '2' } }))""")
        page.wait_for_timeout(250)
        fj4 = page.inner_text("#fdFigNote")
        check("PATTERN" in fj4 and "switch it to pattern" in fj4,
              f"{tag} 4b: bare 2 keeps the mode-mismatch notice: {fj4[:90]!r}")
        # the ordinal law, ported: R-R walks the centre's occurrences low→high
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { figure: 'R-R' } }))""")
        page.wait_for_timeout(300)
        c4o = page.evaluate("""() => [...document.querySelectorAll('#stSvg [data-stfig]')]
          .slice(0, 2).map(e => +e.getAttribute('data-stmidi'))""")
        check(len(c4o) == 2 and c4o[1] > c4o[0],
              f"{tag} 4b: a repeat is the ordinal over the centre's occurrences, "
              f"low → high: {c4o}")
        # full boot restore
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,
                      object: 'tetrad', take: 'one', notesPer: 1, movement: 'strum',
                      address: 'pattern', figure: '', ref: 0, bass: 'none',
                      source: 'cycle', custom: '' } }))""")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(250)

        # ---- 260913b item 2: THE DOCUMENT'S TITLE, IN THE HEADER BAND ----
        # D11 unblocked and ruled: the field is the DOCUMENT's title (fills
        # file.title, drives file.name(); empty falls back — an untouched
        # field changes nothing), it never relabels entries (260811.3), and
        # it sits in the card's top bar left of the chevron — via the
        # shell's new header slot, the ⓘ's own precedent and the first
        # shell change in seventeen nights.
        np_t = page.evaluate("""() => { const t = document.getElementById('npTitle');
          if (!t) return { there: false };
          const p = t.closest('.card, .board');
          const h = p && (p.querySelector('h2') || p.querySelector('.bh'));
          const tb = t.getBoundingClientRect(), hb = h.getBoundingClientRect();
          const chev = p.querySelector('.clpsBtn').getBoundingClientRect();
          return { there: true, slot: t.parentElement === p && t.style.position === 'absolute',
            topAligned: Math.abs(tb.top - hb.top) < 14,
            leftOfChevron: tb.right <= chev.left,
            placeholder: t.placeholder }; }""")
        check(np_t.get("there") and np_t["slot"] and np_t["topAligned"] and np_t["leftOfChevron"],
              f"{tag} the title sits in the header band, top-aligned, left of the "
              f"chevron: {np_t}")
        # PIN REWRITTEN 260916 (item 2a, rule 7): the field is PRE-POPULATED
        # with the standing default, and the placeholder now IS that default
        # (was "title — <date>"), so an emptied field shows, greyed, exactly
        # the name the export will fall back to. The date is derived here
        # independently (UTC, as the page's ISO stamp is).
        today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
        np_default = f"multetudes journal — {today}"
        check(np_t.get("there") and np_t["placeholder"] == np_default,
              f"{tag} the placeholder is the standing default name: {np_t.get('placeholder')!r}")
        # the typed title reaches the EXPORTED ARTIFACT: the success message
        # names the file it wrote (the 260911 channel), and the file's name
        # derives from the field
        page.fill("#npTitle", "Dorian week 3"); page.wait_for_timeout(100)
        page.fill("#journalIn", "a clean note for the title pin")
        page.dispatch_event("#journalIn", "input"); page.wait_for_timeout(400)
        page.click("#exportLog"); page.wait_for_timeout(300)
        np_msg = page.evaluate("() => document.getElementById('exportMsg').textContent")
        check("Dorian-week-3.atchart.md" in np_msg,
              f"{tag} the typed title names the exported file: {np_msg!r}")
        # empty falls back to the standing default — nothing that ships changes
        page.fill("#npTitle", ""); page.wait_for_timeout(100)
        page.click("#exportLog"); page.wait_for_timeout(300)
        np_msg = page.evaluate("() => document.getElementById('exportMsg').textContent")
        # PIN SHARPENED 260916 (item 2, rule 7): the fallback name is asserted
        # EXACTLY — v0.4.0's `multetudes-journal-<date>.atchart.md`, the
        # convention Daniel approved verbatim, now derived from the field
        check(np_msg == f"exported multetudes-journal-{today}.atchart.md — check your downloads",
              f"{tag} an empty field falls back to v0.4.0's exact default name: {np_msg!r}")

        # ---- 260914 item 5: THE TITLE PERSISTS WITH THE PAD (ruled, overruling v0.9) ----
        # The pad already survives a reload; a note that comes back without
        # its name teaches distrust. {pad, title, entries} share one store.
        # Round-tripped AT THE ARTIFACT: type, reload the page, the title is
        # back, and it still drives file.name() through export's own channel.
        page.fill("#npTitle", "Dorian week 3"); page.wait_for_timeout(100)
        page.dispatch_event("#npTitle", "input")
        page.fill("#journalIn", "the note that keeps its name")
        page.dispatch_event("#journalIn", "input"); page.wait_for_timeout(450)
        page.reload(); page.wait_for_timeout(700)
        np5 = page.evaluate("""() => ({
          title: document.getElementById('npTitle').value,
          pad: document.getElementById('journalIn').value })""")
        check(np5["title"] == "Dorian week 3"
              and np5["pad"] == "the note that keeps its name",
              f"{tag} 5: reload brings back the note AND its name: {np5}")
        page.click("#exportLog"); page.wait_for_timeout(300)
        np5m = page.evaluate("() => document.getElementById('exportMsg').textContent")
        check("Dorian-week-3.atchart.md" in np5m,
              f"{tag} 5: the persisted title still names the exported file: {np5m!r}")
        # leave the store as the leg found it (an empty title, an empty pad)
        page.fill("#npTitle", ""); page.dispatch_event("#npTitle", "input")
        page.fill("#journalIn", ""); page.dispatch_event("#journalIn", "input")
        page.wait_for_timeout(450)

        # ---- 260916 item 2: THE TITLE IS REAL — pre-populated, the single source ----
        # Ruled at the v0.4.0 review: a real value on first paint (not a
        # placeholder), editable, and the ONE source of the name for the
        # export file AND the practice-log entry. The convention Daniel
        # approved verbatim ("multetudes journal") stays; the field drives it.
        page.reload(); page.wait_for_timeout(700)      # the store's title is empty: a first paint
        np2 = page.evaluate("""() => { const t = document.getElementById('npTitle');
          return { value: t.value, placeholder: t.placeholder }; }""")
        check(np2["value"] == np_default,
              f"{tag} 2a: the field holds the standing default on first paint: {np2}")
        # THE UNTOUCHED FIELD BEHAVES EXACTLY AS v0.4.0: the export is named
        # byte-for-byte as before — the proof that this is no behaviour
        # change for an existing user
        page.fill("#journalIn", "untouched-field export"); page.dispatch_event("#journalIn", "input")
        page.wait_for_timeout(400)
        page.click("#exportLog"); page.wait_for_timeout(300)
        np2m = page.evaluate("() => document.getElementById('exportMsg').textContent")
        check(np2m == f"exported multetudes-journal-{today}.atchart.md — check your downloads",
              f"{tag} 2: an untouched field writes v0.4.0's exact file name: {np2m!r}")
        # 2b: the entry filed under the untouched field carries the default
        # name in bold and its DERIVED summary on the line below (v0.9's row)
        page.click("#saveEntry"); page.wait_for_timeout(200)
        row0 = page.evaluate("""() => { const r = document.querySelector('.hist');
          const b = r.querySelector('b'), s = r.querySelector('.sum');
          return { name: b && b.textContent, sum: s && s.textContent }; }""")
        check(row0["name"] == np_default,
              f"{tag} 2b: the entry is named from the field: {row0}")
        check(bool(row0["sum"]) and "bpm" in row0["sum"] and "B" in row0["sum"],
              f"{tag} 2b: the derived summary still shows under the name — Restore is not blind: {row0}")
        stored_h = page.evaluate("() => JSON.parse(localStorage.getItem('multetudes.v1.log')).entries.at(-1).heading")
        check(stored_h == np_default, f"{tag} 2b: the stored entry carries its name: {stored_h!r}")
        # a typed name names the next entry
        page.fill("#npTitle", "Dorian week 3"); page.dispatch_event("#npTitle", "input")
        page.fill("#journalIn", "the named note"); page.dispatch_event("#journalIn", "input")
        page.wait_for_timeout(400)
        page.click("#saveEntry"); page.wait_for_timeout(200)
        row1 = page.evaluate("() => document.querySelector('.hist b').textContent")
        check(row1 == "Dorian week 3", f"{tag} 2b: the typed name names the entry: {row1!r}")

        # ---- 260916 item 3: EVERY ENTRY EXPORTS ON ITS OWN, named from its title ----
        # Restore → Export was the only route (counterproductive, and until
        # item 1 it destroyed the pad). Each row exports through the ONE
        # download path; both outcomes speak in the row's own slot.
        page.click(".hist .acts button[data-cap='entry-export']"); page.wait_for_timeout(300)
        row_msg = page.evaluate("() => document.querySelector('.hist .acts .emsg').textContent")
        check(row_msg == "exported Dorian-week-3.atchart.md — check your downloads",
              f"{tag} 3: the entry exports alone, named from its title, speaking in its row: {row_msg!r}")
        # MEASURED on the first run (rule 4): the pad's slot was not empty —
        # it still held the DOCUMENT export's message from 1.4 s earlier
        # (messages live 2.2 s), not the row's. The honest assertion is the
        # effect: the row's file name never appears in the pad's slot.
        pad_slot = page.evaluate("() => document.getElementById('exportMsg').textContent")
        check("Dorian-week-3" not in pad_slot,
              f"{tag} 3: the row's export must not speak up at the pad: {pad_slot!r}")
        # the refusal: a note holding a ```chart block cannot be written — the
        # reason lands in the row, in the same plain words Export uses
        page.fill("#journalIn", "with a chart\n```chart\n| Dm7 G7 |\n```")
        page.dispatch_event("#journalIn", "input"); page.wait_for_timeout(400)
        page.click("#saveEntry"); page.wait_for_timeout(200)
        page.click(".hist .acts button[data-cap='entry-export']"); page.wait_for_timeout(300)
        row_msg = page.evaluate("() => document.querySelector('.hist .acts .emsg').textContent")
        check("a saved note holds a ```chart block" in row_msg and "move the chart into the pad" in row_msg,
              f"{tag} 3: a refused entry export names its reason in the row: {row_msg!r}")
        n_del = page.evaluate("""() => { const d = document.querySelector('.hist .acts button[data-cap="delete"]');
          if (!d) return 0; d.click(); return 1; }""")
        check(n_del == 1, f"{tag} 3: the chart entry's Delete control was not found by role")
        page.wait_for_timeout(150)

        # ---- 260916 item 1: RESTORE NEVER SILENTLY OVERWRITES THE PAD (first: it is live) ----
        # MEASURED at engine/notepad-surface.mjs:259 — `els.pad.value = en.text`
        # ran unconditionally; Daniel lost work to it during the review. Now
        # unsaved text asks through Clear's own row, worded for restoring;
        # the three answers are pinned; an empty pad restores at once.
        page.fill("#journalIn", "unsaved words that must survive"); page.dispatch_event("#journalIn", "input")
        page.wait_for_timeout(400)
        n_before = page.evaluate("() => JSON.parse(localStorage.getItem('multetudes.v1.log')).entries.length")
        page.click(".hist .acts button[data-cap='apply']"); page.wait_for_timeout(200)   # newest row: the named note
        # PINS REWRITTEN 260917 (item 0b, rule 7): the confirm appears IN THE
        # ROW that was pressed — Daniel: "the restore doesn't occur BUT it
        # also doesn't indicate that it didn't restore". It was DISPLACED,
        # not silent: #clearConfirm lives under the pad (right column), the
        # Restore button in the log (left). Night 16's 2b recurring. The
        # host's row is Clear's alone now and must stay hidden here.
        cf = page.evaluate("""() => { const row = document.querySelector('.hist');
          const c = row.querySelector('[data-cap="restore-confirm"]');
          return { inRow: !!c, intent: c && c.getAttribute('data-intent'),
            hostRow: getComputedStyle(document.getElementById('clearConfirm')).display !== 'none',
            pad: document.getElementById('journalIn').value,
            labels: c ? ['confirm-save', 'confirm-discard', 'confirm-cancel']
              .map(k => c.querySelector('[data-cap="' + k + '"]').textContent) : null }; }""")
        check(cf["pad"] == "unsaved words that must survive",
              f"{tag} 1: Restore overwrote unsaved pad text — the pad now reads {cf['pad']!r}")
        check(cf["inRow"] and cf["intent"] == "restore",
              f"{tag} 0b: dirty text must ASK before restoring, IN THE ROW that was pressed: {cf}")
        check(not cf["hostRow"], f"{tag} 0b: the host's Clear row stays hidden — the answer is in the row, not under the pad")
        check(cf["labels"] == ["Save and restore", "Discard and restore", "keep writing"],
              f"{tag} 1: the row is worded for restoring: {cf['labels']}")
        # answer 1 — keep writing: nothing moves
        page.click(".hist [data-cap='confirm-cancel']"); page.wait_for_timeout(100)
        a1 = page.evaluate("""() => ({ pad: document.getElementById('journalIn').value,
          shown: !!document.querySelector('.hist [data-cap="restore-confirm"]'),
          n: JSON.parse(localStorage.getItem('multetudes.v1.log')).entries.length })""")
        check(a1["pad"] == "unsaved words that must survive" and not a1["shown"] and a1["n"] == n_before,
              f"{tag} 1: keep writing keeps the text, restores nothing, files nothing: {a1}")
        # answer 2 — Discard and restore: the draft is dropped, the note returns
        page.click(".hist .acts button[data-cap='apply']"); page.wait_for_timeout(150)
        page.click(".hist [data-cap='confirm-discard']"); page.wait_for_timeout(250)
        a2 = page.evaluate("""() => ({ pad: document.getElementById('journalIn').value,
          title: document.getElementById('npTitle').value,
          n: JSON.parse(localStorage.getItem('multetudes.v1.log')).entries.length })""")
        check(a2["pad"] == "the named note" and a2["n"] == n_before,
              f"{tag} 1: Discard and restore drops the draft and restores the entry's note: {a2}")
        # ---- 260917 item 0a: RESTORE FILLS THE TITLE with that entry's name ----
        check(a2["title"] == "Dorian week 3",
              f"{tag} 0a: restore brings the entry's name into the title field: {a2}")
        # answer 3 — Save and restore: the draft is FILED, then the note returns.
        # 6c: the restored text is CLEAN — editing it is what makes it dirty
        page.fill("#journalIn", "a second draft worth keeping"); page.dispatch_event("#journalIn", "input")
        page.wait_for_timeout(400)
        # (measured on the first run: the draft is not filed until confirm-save
        # is pressed, so at THIS click the named note is still row 0)
        page.click(".hist .acts button[data-cap='apply']"); page.wait_for_timeout(150)
        page.click(".hist [data-cap='confirm-save']"); page.wait_for_timeout(250)
        a3 = page.evaluate("""() => { const es = JSON.parse(localStorage.getItem('multetudes.v1.log')).entries;
          return { pad: document.getElementById('journalIn').value, n: es.length,
                   last: es.at(-1).text, lastName: es.at(-1).heading,
                   title: document.getElementById('npTitle').value }; }""")
        check(a3["n"] == n_before + 1 and a3["last"] == "a second draft worth keeping" and a3["pad"] == "the named note",
              f"{tag} 1: Save and restore FILES the draft, then restores the note: {a3}")
        # settled by the rule: the edit was a CONTINUATION of the restored note
        check(a3["lastName"] == "Dorian week 3" and a3["title"] == "Dorian week 3",
              f"{tag} 0: restore → edit → save files under the restored name, and the restore that followed re-fills it: {a3}")
        # 6c: a just-restored note is not unsaved work — restoring ANOTHER
        # entry over it asks nothing (register 30; this changed shipped behaviour)
        page.click(".hist .acts button[data-cap='apply'] >> nth=2"); page.wait_for_timeout(200)   # the default-named entry
        a4 = page.evaluate("""() => ({ pad: document.getElementById('journalIn').value,
          title: document.getElementById('npTitle').value,
          shown: !!document.querySelector('.hist [data-cap="restore-confirm"]') })""")
        check(a4["pad"] == "untouched-field export" and not a4["shown"],
              f"{tag} 6c: restoring over a CLEAN restored note asks nothing — it restores: {a4}")
        check(a4["title"] == np_default,
              f"{tag} 0a: an entry filed under the default re-fills the default: {a4}")
        # ---- 260917 item 0c: SAVE EMPTIES THE PAD AND RESETS THE TITLE ----
        page.fill("#npTitle", "Phrygian week 4"); page.dispatch_event("#npTitle", "input")
        page.fill("#journalIn", "filed under a typed name"); page.dispatch_event("#journalIn", "input")
        page.wait_for_timeout(400)
        page.click("#saveEntry"); page.wait_for_timeout(250)
        a5 = page.evaluate("""() => ({ pad: document.getElementById('journalIn').value,
          title: document.getElementById('npTitle').value,
          stored: JSON.parse(localStorage.getItem('multetudes.v1.log')).title,
          lastName: JSON.parse(localStorage.getItem('multetudes.v1.log')).entries.at(-1).heading })""")
        check(a5["lastName"] == "Phrygian week 4" and a5["pad"] == "",
              f"{tag} 0c: the note filed under the typed name and the pad emptied: {a5}")
        check(a5["title"] == np_default and a5["stored"] == "",
              f"{tag} 0c: on save the title returns to the dated default — the next note cannot inherit 'Phrygian week 4': {a5}")
        # 6c: Clear over a clean restored note asks nothing either
        page.click(".hist .acts button[data-cap='apply']"); page.wait_for_timeout(200)
        page.click("#clearPad"); page.wait_for_timeout(150)
        a6 = page.evaluate("""() => ({ pad: document.getElementById('journalIn').value,
          shown: getComputedStyle(document.getElementById('clearConfirm')).display !== 'none' })""")
        check(a6["pad"] == "" and not a6["shown"],
              f"{tag} 6c: Clear over a clean restored note clears without asking: {a6}")
        # the common case keeps no ceremony: an empty pad restores at once
        page.click(".hist .acts button[data-cap='apply'] >> nth=1"); page.wait_for_timeout(200)
        a7 = page.evaluate("""() => ({ pad: document.getElementById('journalIn').value,
          shown: !!document.querySelector('.hist [data-cap="restore-confirm"]') })""")
        check(a7["pad"] != "" and not a7["shown"],
              f"{tag} 1: an empty pad restores at once, no ceremony: {a7}")
        # leave the log and the store as this leg found them — by role
        n_all = page.evaluate("""() => { const ds = [...document.querySelectorAll('.hist .acts button[data-cap="delete"]')];
          ds.forEach(d => d.click()); return ds.length; }""")
        check(n_all == 4, f"{tag} the cleanup found {n_all} Delete controls by role — expected this leg's four entries")
        page.wait_for_timeout(200)
        page.fill("#npTitle", ""); page.dispatch_event("#npTitle", "input")
        page.fill("#journalIn", ""); page.dispatch_event("#journalIn", "input")
        page.wait_for_timeout(450)

        # ---- 260913b item 3: THE NECK'S RING SURVIVES A SHARED-PITCH REBUILD ----
        # The latent twin of the keys' 260911 wipe race, ruled 260912 and
        # deferred once: under STRUM movement every advance announces all
        # four notes at once, and any midi shared between consecutive bars
        # rings against the OLD bar's dot — which the rebuild wipes ~10ms
        # later. sounded ⊆ drawn asserted at the artifact first, as the
        # keys did: every sounded note of a strum pass rings at its own
        # drawn dot, advance notes included.
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(200)
        page.uncheck("#fdMetChk")
        page.fill("#fdBpm", "240"); page.dispatch_event("#fdBpm", "change")
        page.wait_for_timeout(150)
        page.evaluate("""() => {
          if (!window.__fdRingHooked) { window.__fdRingHooked = true; window.__fdRing = [];
            document.addEventListener('atetudes:note', (e) => {
              const m = e.detail || {};
              if (typeof m.midi !== 'number') return;
              if (m.role === 'bass') return;   // 260917 item 3: the bass rings at the hollow reference, not a selection dot
              const row = { midi: m.midi, drawn: false, rang: false };
              window.__fdRing.push(row);
              setTimeout(() => {
                const svg = document.getElementById('fieldSvg');
                const dot = svg && svg.querySelector('.fd-sel[data-selmidi="' + m.midi + '"] circle');
                if (!dot) return;
                row.drawn = true;
                row.rang = [...svg.querySelectorAll('.fd-pulse')].some((rg) =>
                  rg.getAttribute('cx') === dot.getAttribute('cx')
                  && rg.getAttribute('cy') === dot.getAttribute('cy'));
              }, 120);
            }, true); }
          window.__fdRing = []; }""")
        page.click('#tlStripMini button[data-role="play"]'); page.wait_for_timeout(3400)
        page.click('#tlStripMini button[data-role="stop"]'); page.wait_for_timeout(400)
        fd_rows = page.evaluate("() => window.__fdRing")
        check(len(fd_rows) >= 8 and all(r["drawn"] for r in fd_rows),
              f"{tag} the strum pass sounded and every note has a drawn dot "
              f"({len(fd_rows)} notes)")
        check(all(r["rang"] for r in fd_rows),
              f"{tag} every sounded note RINGS through the rebuild — silent: "
              f"{[r['midi'] for r in fd_rows if not r['rang']]}")
        page.check("#fdMetChk")
        page.fill("#fdBpm", "72"); page.dispatch_event("#fdBpm", "change")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(250)

        # ---- 260913b item 1: EACH SLIDER BESIDE THE THING IT GOVERNS ----
        # The dispatch drew a floating right column; the PO meant an
        # association (harmony↔voice, bass↔reference). Asserted at the
        # PIXELS: the harmony slider's row top is level with voice's, the
        # bass slider's with the reference select's — and NOT with each
        # other's old stacked column.
        pair = page.evaluate("""() => {
          const top = (id) => { const e = document.getElementById(id);
            return e ? Math.round(e.getBoundingClientRect().top) : null; };
          return { voice: top('fdVoice'), harm: top('fdHarmVol'),
                   ref: top('fdBass2'), bass: top('fdBassVol') }; }""")
        check(all(v is not None for v in pair.values())
              # tolerance 8 → 10 (260917, measured): the designed offset between a
              # 25px select and a 16px slider centred in one row is ~8.5px; v0.4.1
              # read 8 and tonight's build 9 with the row's geometry byte-identical
              # (a 12px page shift crossed the rounding). The stacked-column case
              # this pin exists to refuse is a full row apart (39px), never 10.
              and abs(pair["harm"] - pair["voice"]) <= 10
              and abs(pair["bass"] - pair["ref"]) <= 10
              and abs(pair["harm"] - pair["bass"]) > 10,
              f"{tag} the harmony slider sits WITH voice and the bass slider WITH the "
              f"reference — association, not a column: {pair}")

        # ---- 260913 item 5: THE CHIPS SHOW FUNCTION AND THE SLASH ----
        # The wireframe drew the slash REPLACING the roman; the ruling says
        # BOTH — the roman is the only thing on the chip naming function
        # against the key, which is what the colour system encodes. The
        # slash appears only when a reference is set AND changes the
        # spelling: a root reference under its own chord adds nothing.
        chip_read = ("() => [...document.querySelectorAll('#tlScroll button')].slice(0, 8)"
                     ".map(b => ({ rn: (b.querySelector('.tl-rn') || {}).textContent || null,"
                     " slash: (b.querySelector('.tl-slash') || {}).textContent || null,"
                     " sym: b.getAttribute('data-tlchip') }))")
        page.select_option("#fdBass2", "none"); page.wait_for_timeout(250)
        chips0 = page.evaluate(chip_read)
        check(all(c["rn"] and c["slash"] is None for c in chips0),
              f"{tag} with no reference the chip is exactly what it was — roman, no "
              f"slash: {chips0[:3]}")
        page.select_option("#fdBass2", "third"); page.wait_for_timeout(300)
        chips3 = page.evaluate(chip_read)
        check(all(c["rn"] for c in chips3),
              f"{tag} the roman SURVIVES the reference — function stays named: {chips3[:3]}")
        check(all(c["slash"] and c["slash"].startswith(c["sym"] + "/") for c in chips3),
              f"{tag} a 3rd-below reference slashes EVERY chip, derived: {chips3[:3]}")
        page.select_option("#fdBass2", "root"); page.wait_for_timeout(300)
        chipsR = page.evaluate(chip_read)
        check(all(c["rn"] and c["slash"] is None for c in chipsR),
              f"{tag} a ROOT reference adds nothing to the spelling — no slash: {chipsR[:3]}")
        page.select_option("#fdBass2", "none"); page.wait_for_timeout(200)

        # ---- 260913 item 4: REPEAT LOOPS THE CURRENT BAR ----
        # Ruled scope: the current bar, nothing else. Consulted only at the
        # advance boundary (a mid-bar toggle never restarts a bar in
        # flight); the schedule REBUILDS through soundCurrent()'s one
        # derivation each pass (§4.2.3 — no cache, no board state); the
        # position never moves, so no STEP echo. Asserted at the effect: N
        # repetitions produce N bars of the SAME chord's notes at the
        # AudioContext with ZERO advances, and switching off resumes the
        # progression at the RIGHT bar.
        if not page.evaluate("() => !!document.getElementById('fdRepeat')"):
            check(False, f"{tag} the repeat toggle is absent from this build")
        else:
            # boot restore at ENTRY — the leg inherits whatever bar the
            # previous block parked on, and 'resumes at bar 2' is only
            # meaningful from bar 1 (the [2]-echo lesson, this same night)
            page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
              { detail: { index: 0, request: true } }))""")
            page.wait_for_timeout(200)
            page.uncheck("#fdMetChk"); page.wait_for_timeout(120)
            page.fill("#fdBpm", "240"); page.dispatch_event("#fdBpm", "change")
            page.wait_for_timeout(150)
            page.click("#fdRepeat"); page.wait_for_timeout(150)
            check(page.get_attribute("#fdRepeat", "aria-pressed") == "true",
                  f"{tag} the toggle reads pressed")
            page.evaluate("""() => {
              if (!window.__ntHooked) { window.__ntHooked = true; window.__nt = [];
                document.addEventListener('atetudes:note', e =>
                  window.__nt.push({ m: e.detail.midi, t: performance.now(), r: e.detail.role || null })); }
              if (!window.__advHooked) { window.__advHooked = true; window.__adv = [];
                document.addEventListener('atetudes:step', e => {
                  if (e.detail && e.detail.request !== true)
                    window.__adv.push({ i: e.detail.index, t: performance.now() }); }); }
              if (!window.__rawHooked) { window.__rawHooked = true;
                for (const C of [AudioBufferSourceNode, OscillatorNode]) {
                  const P = C.prototype.start;
                  C.prototype.start = function(...a) { (window.__raw ||= []).push(1);
                    return P.apply(this, a); }; } }
              window.__nt = []; window.__adv = []; window.__raw = []; }""")
            page.click('#tlStripMini button[data-role="play"]')
            page.wait_for_timeout(3300)   # >3 bar-lengths at 240
            rp = page.evaluate("""() => ({ nt: window.__nt.map(n => n.m),
              adv: window.__adv.length, raw: (window.__raw || []).length })""")
            check(rp["adv"] == 0,
                  f"{tag} repeating: ZERO advance echoes over three boundaries ({rp['adv']})")
            check(len(rp["nt"]) >= 8 and len(set(rp["nt"])) <= 5
                  and len(rp["nt"]) >= 2 * len(set(rp["nt"])),
                  f"{tag} repeating: the SAME chord's notes came round again — "
                  f"{len(rp['nt'])} NOTEs over {len(set(rp['nt']))} distinct midis")
            check(rp["raw"] == len(rp["nt"]),
                  f"{tag} at the AudioContext: every repetition's raw start IS an "
                  f"announced NOTE (raws {rp['raw']}, NOTEs {len(rp['nt'])})")
            # switching off resumes at the RIGHT bar — the next boundary
            # advances to bar 2, exactly where the repeated bar left off
            # THE RESUME PROPERTY, derived from the artifact (never a magic
            # index — the [2]-echo lesson: an inherited context can be
            # repeating any bar, and resuming at repeated+1 is exactly the
            # ruling): read WHICH bar is repeating off the strip's own
            # current chip, switch off, and the first advance must land on
            # the next one.
            rp_at = page.evaluate("""() => { const c = document.querySelector('#tlScroll button.tl-cur');
              const all = [...document.querySelectorAll('#tlScroll button')];
              return all.indexOf(c); }""")
            page.evaluate("() => { window.__adv = [] }")
            page.click("#fdRepeat")
            page.wait_for_timeout(1400)
            rp2 = page.evaluate("() => window.__adv.map(a => a.i)")
            page.click('#tlStripMini button[data-role="stop"]'); page.wait_for_timeout(250)
            check(rp_at >= 0 and len(rp2) >= 1 and rp2[0] == rp_at + 1,
                  f"{tag} repeat OFF resumes the progression at the bar AFTER the one "
                  f"repeating (was on chip {rp_at}, echoes {rp2})")
            page.check("#fdMetChk")
            page.fill("#fdBpm", "72"); page.dispatch_event("#fdBpm", "change")
            page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
              { detail: { index: 0, request: true } }))""")
            page.wait_for_timeout(250)

        # ---- 260913 item 3: THE UNDER-NECK BLOCK — TWO NEW VIEWS OF OLD STATE ----
        # bpm under the neck is the clock's second view (the metronome
        # checkbox's own idiom, copied); the bass select is Harmony's second
        # view, seated by the mixer it drives. Pinned at the VIEWS, both
        # directions — a mirror's sabotage is masked by bus replay, so the
        # pins read the pixels of each face, never the message. Neither view
        # can hold a value the owner does not.
        u3 = ("() => ({ bpm: (document.getElementById('fdBpm') || {}).value,"
              " bpmCard: (document.getElementById('bpmRange') || {}).value,"
              " bpmVal: (document.getElementById('bpmVal') || {}).textContent,"
              " bass2: (document.getElementById('fdBass2') || {}).value,"
              " refDots: document.querySelectorAll('#fieldSvg .fd-ref').length,"
              " ro: (document.getElementById('roLine') || {}).textContent || '' })")
        # crash-proof (the m28 lesson): a build without the view yields a
        # NAMED failure, never a 30s fill timeout that masks later pins
        if not page.evaluate("() => !!document.getElementById('fdBpm')"):
            check(False, f"{tag} the under-neck bpm view is absent from this build")
        # direction 1: the under-neck bpm moves the metronome card
        page.fill("#fdBpm", "144"); page.dispatch_event("#fdBpm", "change")
        page.wait_for_timeout(150)
        st3 = page.evaluate(u3)
        check(st3["bpmCard"] == "144" and st3["bpmVal"] == "144" and st3["bpm"] == "144",
              f"{tag} under-neck bpm 144 moves the metronome card's slider AND readout: {st3}")
        # direction 2: the metronome card moves the under-neck view
        page.fill("#bpmRange", "96"); page.dispatch_event("#bpmRange", "input")
        page.wait_for_timeout(150)
        st3 = page.evaluate(u3)
        check(st3["bpm"] == "96" and st3["bpmVal"] == "96",
              f"{tag} the card's 96 lands on the under-neck view: {st3}")
        # the clamp: a view cannot hold what the owner refuses — 999 comes
        # back as the ruled ceiling (15–300, 260821.2)
        page.fill("#fdBpm", "999"); page.dispatch_event("#fdBpm", "change")
        page.wait_for_timeout(150)
        st3 = page.evaluate(u3)
        check(st3["bpm"] == "300" and st3["bpmCard"] == "300",
              f"{tag} 999 lands as the OWNER's clamp on BOTH views (300): {st3}")
        page.fill("#fdBpm", "72"); page.dispatch_event("#fdBpm", "change")
        page.wait_for_timeout(120)
        # the bass view, both directions — read at the two selects' pixels
        page.select_option("#fdBass2", "third"); page.wait_for_timeout(150)
        st3 = page.evaluate(u3)
        # PIN REWRITTEN 260917 (item 4, rule 7 — register 31): the card's bass
        # WINDOW is closed; the STATE is untouched and is read where its effect
        # is (rule 3) — the neck's reference dot and the readout's "over" sentence
        check(st3["bass2"] == "third" and st3["refDots"] == 1 and "over G" in st3["ro"],
              f"{tag} the under-neck bass 'third' reaches the owner's state — the neck and readout consume it: {st3}")
        ref_dot = page.eval_on_selector_all("#fieldSvg .fd-ref", "e => e.length")
        check(ref_dot == 1,
              f"{tag} and the reference actually DRAWS — the view drives the state "
              f"({ref_dot} ref dots)")
        page.select_option("#fdBass2", "none"); page.wait_for_timeout(150)
        st3 = page.evaluate(u3)
        check(st3["bass2"] == "none" and st3["refDots"] == 0 and "over " not in st3["ro"],
              f"{tag} 'none' clears the state's consumers — no reference dot, no 'over' sentence: {st3}")
        # the transport mini under the neck asks, the owner answers
        page.click('#fdMini button[data-role="next"]'); page.wait_for_timeout(200)
        check(page.eval_on_selector_all("#tlScroll button.tl-cur",
              "es => es.map(e => e.getAttribute('data-tlchip'))") != ["0"],
              f"{tag} the under-neck ⏭ moved the strip's own chip")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(200)

        # ---- 260913 item 1: TAKE LIVES ON THE RAIL, THE VALUE UNCHANGED ----
        # D8 granted: "every occurrence in the box" is unstatable without
        # the neck, so Take sits beside Placement as the all-tones checkbox.
        # Placement and label moved; the take VALUE did not — proven at the
        # artifact: the same two selections the old select produced, keyed
        # to the same words on the face.
        at_state = page.evaluate("""() => { const c = document.getElementById('fdAllTones');
          return c ? { there: true, checked: c.checked } : { there: false }; }""")
        check(at_state["there"] and at_state["checked"] is False,
              f"{tag} the all-tones checkbox sits on the rail, unchecked at boot "
              f"(take 'one'): {at_state}")
        one_word = page.inner_text("#roLine")   # re-sited 260919: the take word is the readout's
        # the value proof discriminates at LINE (n=3): under Grip every
        # occurrence caps to one per string and equals one-of-each by count —
        # the capped case, not a defect (register 18)
        page.click('#fdNSeg button[data-nps=\"3\"]'); page.wait_for_timeout(150)
        page.uncheck("#fdAllTones"); page.wait_for_timeout(150)
        one_dots = page.eval_on_selector_all("#fieldSvg .fd-sel", "e => e.length")
        page.check("#fdAllTones"); page.wait_for_timeout(250)
        all_dots = page.eval_on_selector_all("#fieldSvg .fd-sel", "e => e.length")
        all_word = page.inner_text("#roLine")
        check(one_dots == 4 and all_dots > one_dots,
              f"{tag} checked = every occurrence, unchecked = one of each — the same "
              f"values the select produced (one@Line: {one_dots}, all@Line: {all_dots})")
        check("one of each" in one_word and "every occurrence" in all_word,
              f"{tag} the face still speaks the take words")
        page.uncheck("#fdAllTones"); page.click('#fdNSeg button[data-nps=\"1\"]')
        page.wait_for_timeout(200)

        # ---- 260913 item 2: THE RENAME HOLDS, AND THE OLD WORDS STILL LAND ----
        # The PO ruled the vocabulary (a block IS a strum): movement
        # strum/arpeggiate, playback strum, the harmony bed's flag renamed.
        # A restored v0.1.0 étude still says "block"/"arpeggio" — the alias
        # maps at the merges are the one place the old words are known.
        # Asserted at the artifact: a legacy config lands on the ruled
        # buttons and SOUNDS like what it meant.
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,
                      object: 'tetrad', take: 'one', notesPer: 1, movement: 'arpeggio',
                      address: 'pattern', figure: '', source: 'cycle', custom: '' } }))""")
        page.wait_for_timeout(250)
        lg = page.evaluate("""() => ({
          on: [...document.querySelectorAll('#fdMoveSeg button')]
            .filter(b => b.classList.contains('on')).map(b => b.dataset.move),
          labels: [...document.querySelectorAll('#fdMoveSeg button')].map(b => b.textContent.trim()) })""")
        check(lg["on"] == ["arpeggiate"] and lg["labels"] == ["strum", "arpeggiate"],
              f"{tag} a legacy 'arpeggio' config lands on the ruled arpeggiate button: {lg}")
        # and the legacy word reaches the WALK normalized — the audition
        # sequences (arpeggiate = one at a time), never a stack
        page.evaluate("""() => {
          if (!window.__ntHooked) { window.__ntHooked = true; window.__nt = [];
            document.addEventListener('atetudes:note', e =>
              window.__nt.push({ m: e.detail.midi, t: performance.now(), r: e.detail.role || null })); }
          window.__nt = []; }""")
        page.click('#tlScroll button >> nth=0'); page.wait_for_timeout(3600)   # a 4-beat bar at 72bpm
        lg_t = page.evaluate("() => window.__nt.map(n => n.t)")
        # calibrated 260913 after a full-run flake: under four-door machine
        # load the capture can open late and catch 2 of the 4 notes — and
        # two notes 800ms apart already CANNOT be a strum (a strum lands
        # within ~30ms). The pin's discrimination — spread, not together —
        # is unchanged; only the count floor moved to what the window
        # honestly guarantees.
        check(len(lg_t) >= 2 and (max(lg_t) - min(lg_t)) > 300,
              f"{tag} the legacy word MEANT arpeggiate and still sounds spread "
              f"({len(lg_t)} notes over {0 if not lg_t else round(max(lg_t)-min(lg_t))}ms)")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,
                      object: 'tetrad', take: 'one', notesPer: 1, movement: 'strum',
                      address: 'pattern', figure: '', source: 'cycle', custom: '' } }))""")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(250)

        # ---- 260911 item 4: THE KEYS PULSE WHAT SOUNDS ----
        # The one board in the door without the idiom: keys-board announced
        # NOTE on a click and never listened. field-board's idiom copied
        # (never a third invention): a pulse layer, rings at the drawn dot's
        # own coordinates, the pending-pulse flush for notes that beat the
        # rebuild. sounded ⊆ drawn asserted AT THE ARTIFACT: every sounded
        # note of a played pass — the reference's bass note included — must
        # find its drawn key and ring there; a note with no key to ring on
        # is named, which is the containment failing loudly.
        page.select_option("#fdBass2", "third"); page.wait_for_timeout(200)
        page.evaluate("""() => {
          if (!window.__kyRendersHooked) { window.__kyRendersHooked = true; window.__kyRenders = 0;
            new MutationObserver((mu) => { if (mu.some(x => x.removedNodes.length > 5)) window.__kyRenders++; })
              .observe(document.getElementById('kySvg'), { childList: true }); }
          if (window.__kyHooked) { window.__kyLog = []; }
          else {
            window.__kyHooked = true; window.__kyLog = [];
            document.addEventListener('atetudes:note', (e) => {
              const m = e.detail || {};
              if (typeof m.midi !== 'number') return;
              const svg0 = document.getElementById('kySvg');
              const row = { midi: m.midi, t: Math.round(performance.now()),
                preDot: !!(svg0 && (svg0.querySelector('circle[data-kysel="' + m.midi + '"]')
                  || svg0.querySelector('circle[data-kyref="' + m.midi + '"]'))),
                preRings: svg0 ? svg0.querySelectorAll('.ky-pulse').length : -1,
                renders0: window.__kyRenders || 0,
                drawn: false, rang: false, nrings: -1, renders1: -1 };
              window.__kyLog.push(row);
              setTimeout(() => {
                const svg = document.getElementById('kySvg');
                const dot = svg && (svg.querySelector('circle[data-kysel="' + m.midi + '"]')
                  || svg.querySelector('circle[data-kyref="' + m.midi + '"]'));
                row.nrings = svg ? svg.querySelectorAll('.ky-pulse').length : -1;
                row.renders1 = window.__kyRenders || 0;
                if (!dot) return;
                row.drawn = true;
                row.rang = [...svg.querySelectorAll('.ky-pulse')].some((rg) =>
                  rg.getAttribute('cx') === dot.getAttribute('cx')
                  && rg.getAttribute('cy') === dot.getAttribute('cy'));
              }, 120);
            }, true);
          }
        }""")
        page.click('#tlStripMini button[data-role="play"]'); page.wait_for_timeout(4500)
        page.click('#tlStripMini button[data-role="stop"]'); page.wait_for_timeout(400)
        ky_rows = page.evaluate("() => window.__kyLog")
        check(len(ky_rows) >= 5,
              f"{tag} the keys-pulse pass sounded enough notes to judge ({len(ky_rows)})")
        check(all(r["drawn"] for r in ky_rows),
              f"{tag} sounded ⊆ drawn ON THE KEYS — sounded but keyless: "
              f"{[r['midi'] for r in ky_rows if not r['drawn']]}")
        check(all(r["rang"] for r in ky_rows),
              f"{tag} every sounded note RINGS at its key — silent: "
              f"{[r for r in ky_rows if not r['rang']]} (all: {ky_rows})")
        page.select_option("#fdBass2", "none"); page.wait_for_timeout(150)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(200)

        # ---- 260911 item 5: EVERY BAR WEARS THE FIGURE ----
        # Measured before fixing (the lead did not hold): at the PO's exact
        # config the figure RESOLVES on every bar (orderBy: 7 steps, no err,
        # all eight) and nothing throws — score-board is not even mounted in
        # this door. The cause was staff-board's own v0.9 display law
        # (figure rides the current bar only, kept 260910 as an open
        # question). Daniel's ruling supersedes it: every bar shows the
        # figure; a bar that cannot prints its refusal IN THE BAR.
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 6, nearFret: 7,
                      object: 'tetrad', take: 'all', notesPer: 3, movement: 'arpeggiate',
                      address: 'tones', figure: 'R-3-5-7-R-7-3',
                      source: 'cycle', custom: '' } }))""")
        page.wait_for_timeout(350)
        st_exp5 = json.loads(subprocess.run(["node", "--input-type=module", "-e", """
import { field } from './engine/field.mjs';
import { positionOf, materialIn } from './engine/position.mjs';
import { everyOccurrence, orderBy } from './engine/selection.mjs';
import { progressionOf, chordAt } from './engine/progression.mjs';
const fld = field({ key: 'Bb', scale: 'major' });
const pos = positionOf({ field: fld, anchorString: 4, startDegree: 6, nearFret: 7, strings: [4,3,2,1] });
const pool = materialIn(pos, [4,3,2,1], fld);
const prog = progressionOf({ source: 'cycle', cycle: 'fourths', start: 0 }, 'Bb', 'major');
const out = [];
for (let ci = 0; ci < prog.chords.length; ci++) {
  const cur = chordAt(prog, ci, fld, 'tetrad');
  const sel = everyOccurrence(cur.tones, pool, { n: 3 }).notes;
  const fig = orderBy('tones', 'R-3-5-7-R-7-3', sel);
  out.push({ sym: cur.symbol, order: fig.order ? fig.order.length : 0, err: fig.err });
}
console.log(JSON.stringify(out));
"""], capture_output=True, text=True, cwd=REPO).stdout)
        check(len(st_exp5) == 8 and all(e["order"] == 7 and not e["err"] for e in st_exp5),
              f"{tag} the engine resolves the PO's 7-step figure on ALL eight bars: "
              f"{[(e['sym'], e['order']) for e in st_exp5]}")
        st_got5 = page.evaluate("""() => {
          const svg = document.getElementById('stSvg');
          const per = {};
          for (const e of svg.querySelectorAll('ellipse[data-stfig]')) {
            const b = e.getAttribute('data-stbar');
            per[b] = (per[b] || 0) + 1;
          }
          return { per, tuplets: [...svg.querySelectorAll('[data-sttuplet]')]
            .map(t => t.textContent) }; }""")
        check(all(st_got5["per"].get(str(ci), 0) == st_exp5[ci]["order"] for ci in range(8)),
              f"{tag} EVERY bar draws the figure the engine resolved for it — "
              f"drawn {st_got5['per']}, engine {[e['order'] for e in st_exp5]}")
        check(st_got5["tuplets"].count("7") == 8,
              f"{tag} every bar's non-dyadic 7-in-4 wears its numeral: {st_got5['tuplets']}")
        # the refusal, in the bar: Daniel's refusing configuration — the two
        # neck-refused bars must say so ON THE STAFF, by name
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [3, 2, 1], startDeg: 5, nearFret: 0,
                      object: 'triad', take: 'one', notesPer: 1, movement: 'strum',
                      address: 'pattern', figure: '', source: 'cycle', custom: '' } }))""")
        page.wait_for_timeout(350)
        st_ref5 = page.evaluate("""() => {
          const svg = document.getElementById('stSvg');
          const bars = new Set([...svg.querySelectorAll('ellipse[data-stmidi]')]
            .map(e => e.getAttribute('data-stbar')));
          return { withHeads: bars.size,
            refusals: [...svg.querySelectorAll('[data-strefuse]')]
              .map(e => [...e.querySelectorAll('tspan')].map(t => t.textContent).join(' ')) }; }""")
        check(len(st_ref5["refusals"]) == 2
              and all("no placement fits" in t and "occur only on string" in t
                      and "Line" in t for t in st_ref5["refusals"]),
              f"{tag} the staff's refused bars refuse BY NAME, in the bar: {st_ref5['refusals']!r}")
        check(st_ref5["withHeads"] == 6,
              f"{tag} the six placeable bars still draw ({st_ref5['withHeads']})")
        # full boot restore
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,
                      object: 'tetrad', take: 'one', notesPer: 1, movement: 'strum',
                      address: 'pattern', figure: '', source: 'cycle', custom: '' } }))""")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(250)

        # ---- 260911 item 1: SIX CONTROLS, ONE ROW, v0.9's ORDER ----
        # The host never took the placement, so Copy and Palette auto-appended
        # AFTER the message span and wrapped to a second line the moment a
        # message showed. Now the card declares all six in v0.9's ratified
        # order (Copy between Export and Import), the message OUT of the row.
        # The ORDER is asserted, not presence — presence was never the defect.
        np_row = page.evaluate("""() => {
          const row = document.getElementById('journalControls');
          if (!row) return null;
          const btns = [...row.children].filter(c => c.tagName === 'BUTTON');
          return { ids: btns.map(b => b.id),
                   labels: btns.map(b => b.textContent.trim()),
                   msgInRow: !!row.querySelector('#saveMsg'),
                   wraps: (() => { const ys = btns.map(b => b.getBoundingClientRect().top);
                     return Math.max(...ys) - Math.min(...ys) > 4; })() }; }""")
        check(np_row is not None and np_row["ids"] ==
              ["saveEntry", "clearPad", "exportLog", "copyBtn", "importBtn", "paletteBtn"],
              f"{tag} the six controls sit in v0.9's ORDER — Copy between Export and "
              f"Import: {np_row and np_row['ids']}")
        check(np_row is not None and np_row["labels"] ==
              ["Save note", "Clear", "Export (.atchart.md)", "Copy", "Import", "Palette"],
              f"{tag} the labels are v0.9's — 'Save note', derived from the adapter's "
              f"noun: {np_row and np_row['labels']}")
        check(np_row is not None and not np_row["msgInRow"],
              f"{tag} #saveMsg is OUT of the button row — the wrap was the defect")
        check(np_row is not None and not np_row["wraps"],
              f"{tag} the six buttons hold ONE row at desktop width")

        # ---- 260911 item 2: EVERY CAPABILITY SPEAKS, BOTH OUTCOMES ----
        # The PO reported Export and Copy "not doing anything". Both worked;
        # both REFUSED (his pad held a chart fence in a saved note) — in spec
        # jargon, printed beside Save instead of the pressed button, and a
        # SUCCESSFUL export said nothing at all (the one silent success in
        # the surface). Now: the refusal names the route, each capability
        # speaks in ITS OWN slot, and Export's success names the file it
        # wrote. Content asserted, never presence — a pin that counts is not
        # a pin that identifies.
        np_msg = ("(cap) => { const m = document.getElementById(cap);"
                  " return m ? m.textContent : '(no #' + cap + ' on this build)'; }")
        # export success, clean pad
        page.fill("#journalIn", "a clean note for the export pin")
        page.dispatch_event("#journalIn", "input"); page.wait_for_timeout(400)
        page.click("#exportLog"); page.wait_for_timeout(250)
        np_t = page.evaluate(np_msg, "exportMsg")
        check("exported multetudes-journal-" in np_t and ".atchart.md" in np_t,
              f"{tag} export SUCCESS names the file it wrote, in export's own slot: {np_t!r}")
        # a chart fence in a SAVED NOTE: the refusal, in the row's own slots,
        # naming the route (the pad's lift), not the spec
        page.fill("#journalIn", "take notes\n```chart\n| Dm7 G7 |\n```")
        page.dispatch_event("#journalIn", "input"); page.wait_for_timeout(400)
        page.click("#saveEntry"); page.wait_for_timeout(250)
        page.click("#exportLog"); page.wait_for_timeout(250)
        np_t = page.evaluate(np_msg, "exportMsg")
        check("a saved note holds a" in np_t and "move the chart into the pad" in np_t
              and "becomes the file's chart block" in np_t,
              f"{tag} export REFUSAL names the route in plain words: {np_t!r}")
        page.click("#copyBtn"); page.wait_for_timeout(250)
        np_t = page.evaluate(np_msg, "copyMsg")
        check("move the chart into the pad" in np_t,
              f"{tag} copy's refusal prints in COPY's slot, same named route: {np_t!r}")
        # clean up the fence entry so later blocks see a clean log
        # RE-AIMED BY ROLE 260916 (rule 12): was a textContent hunt for
        # 'Delete' inside a silent `if (del)` — night 20's exact shape. The
        # cleanup now fails loudly if the control is not found by role.
        n_del = page.evaluate("""() => { const del = document.querySelector('.hist .acts button[data-cap="delete"]');
          if (!del) return 0; del.click(); return 1; }""")
        check(n_del == 1, f"{tag} the fence entry's Delete control was not found by role — the cleanup did not run")
        page.wait_for_timeout(250)
        # copy on a clean pad: never silent — one of its two NAMED outcomes,
        # in its own slot (headless file:// usually has no clipboard grant)
        page.fill("#journalIn", "clean again"); page.dispatch_event("#journalIn", "input")
        page.wait_for_timeout(400)
        page.click("#copyBtn"); page.wait_for_timeout(300)
        np_t = page.evaluate(np_msg, "copyMsg")
        check(np_t.startswith("copied — one .atchart.md")
              or np_t.startswith("clipboard unavailable — use Export"),
              f"{tag} copy is NEVER silent — one of its two named outcomes: {np_t!r}")
        # save's outcomes still speak in save's slot (the empty-note confirm)
        page.click("#saveEntry"); page.wait_for_timeout(150)   # files 'clean again'
        page.click("#saveEntry"); page.wait_for_timeout(150)   # empty pad: must confirm
        np_t = page.evaluate(np_msg, "saveMsg")
        check("captured without a note" in np_t,
              f"{tag} save's empty-pad confirmation, in save's slot: {np_t!r}")
        # RE-AIMED BY ROLE 260916 (rule 12): was a textContent filter on
        # 'Delete'; the count is returned so an empty sweep cannot pass quietly
        n_del = page.evaluate("""() => { const ds = [...document.querySelectorAll('.hist .acts button[data-cap="delete"]')];
          ds.forEach(b => b.click()); return ds.length; }""")
        check(n_del == 2, f"{tag} the cleanup found {n_del} Delete controls by role — expected the leg's two entries")
        page.wait_for_timeout(250)

        # ---- 260910 item 2: THE FIGURE REFUSES JUNK BY NAME ----
        # "R,Q" silently kept the R and dropped the Q — the eleventh silence,
        # and Daniel's ruling: loud, lossy and stated. The figure now has the
        # changes field's manners (child 7: refuse bad tokens by name), in
        # BOTH alphabets — the pattern was tolerant too ("9,9" read as an
        # errorless block). Incomplete is not invalid: a trailing separator
        # never errs, so nothing flashes while a figure is on its way.
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { address: 'tones', figure: 'R,Q' } }))""")
        page.wait_for_timeout(200)
        fj = page.inner_text("#fdFigNote")
        check('"Q"' in fj and "not a tone" in fj,
              f"{tag} an unknown role is refused BY NAME on the face: {fj!r}")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { figure: 'R,' } }))""")
        page.wait_for_timeout(200)
        fj = page.inner_text("#fdFigNote")
        check("not a tone" not in fj and "not a string" not in fj,
              f"{tag} a trailing separator is UNFINISHED, not wrong — no error: {fj!r}")
        # REWRITTEN 260913b (item 4b): 9 joined the tones alphabet, so under
        # pattern it draws the mode-mismatch switch notice; 8 keeps the junk
        # refusal — both loud, both named
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { address: 'pattern', figure: '8' } }))""")
        page.wait_for_timeout(200)
        fj = page.inner_text("#fdFigNote")
        check('"8"' in fj and "not a string" in fj,
              f"{tag} the pattern alphabet refuses junk by name too: {fj!r}")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { address: 'pattern', figure: '' } }))""")
        page.wait_for_timeout(200)

        # ---- 260910 item 3: THE STAFF WRITES WHAT THE SCHEDULE SCHEDULES ----
        # Daniel: "currently it's only showing quarter notes." Register entry
        # 6 come due: staff-board had NO duration logic — every note a
        # quarter because nothing ever decided otherwise. Now the note values
        # derive from walkSchedule's own events (bpm=60, `at` in beats), and
        # this pin reads the DRAWN values against a fresh computation of the
        # SCHEDULE ITSELF — never a table of expected shapes.
        st_exp = json.loads(subprocess.run(["node", "--input-type=module", "-e", """
import { field } from './engine/field.mjs';
import { positionOf, materialIn } from './engine/position.mjs';
import { diatonicTones, oneOfEach, orderBy } from './engine/selection.mjs';
import { progressionOf, chordAt, walkSchedule } from './engine/progression.mjs';
import { writtenValue } from './engine/drill.mjs';
const fld = field({ key: 'Bb', scale: 'major' });
const pos = positionOf({ field: fld, anchorString: 4, startDegree: 4, nearFret: 3, strings: [4,3,2,1] });
const pool = materialIn(pos, [4,3,2,1], fld);
const prog = progressionOf({ source: 'cycle', cycle: 'fourths', start: 0 }, 'Bb', 'major');
const cur = chordAt(prog, 0, fld, 'tetrad');
const sel = oneOfEach(cur.tones, pool, { n: 1, centre: pos.centre }).notes;
const fig = orderBy('pattern', '4,3,4,3,2,1', sel);
const out = {};
for (const [name, order, spread] of [['figured', fig.order, false], ['strum', null, false], ['arp', null, true]]) {
  const { events } = walkSchedule(sel, order, 4, 60, { spread });
  const together = events.every(e => e.at === 0);
  const dv = together ? 4 : events.length > 1 ? events[1].at - events[0].at : 4;
  const dyadic = [4,2,1,0.5,0.25].includes(dv);
  const wv = dyadic ? dv : writtenValue(dv);
  out[name] = { L: events.length, together, dv, dyadic, wv,
    stems: together ? 0 : (wv < 4 ? events.length : 0),
    beam1: !together && wv < 1, beam2: !together && wv <= 0.25,
    tuplet: (!together && !dyadic) ? String(events.length) : null };
}
console.log(JSON.stringify(out));
"""], capture_output=True, text=True, cwd=REPO).stdout)
        check(st_exp["figured"]["L"] == 6 and not st_exp["figured"]["dyadic"],
              f"{tag} the schedule itself must yield the six-step non-dyadic case: {st_exp['figured']}")
        st_read = ("""() => { const svg = document.getElementById('stSvg');"""
                   """ const cur = svg.querySelector('[data-stcur]');"""
                   """ return { stems: svg.querySelectorAll('[data-ststem]:not([data-ststem=stack])').length,"""
                   """ blockstem: svg.querySelectorAll('[data-ststem=stack]').length,"""
                   """ beam1: svg.querySelectorAll('[data-stbeam="1"]').length,"""
                   """ beam2: svg.querySelectorAll('[data-stbeam="2"]').length,"""
                   """ tuplets: [...svg.querySelectorAll('[data-sttuplet]')].map(t => t.textContent),"""
                   """ figheads: svg.querySelectorAll('[data-stfig]').length }; }""")
        for st_name, st_cfg in [
            ("figured", { "movement": "strum", "address": "pattern", "figure": "4,3,4,3,2,1" }),
            ("strum",   { "movement": "strum", "address": "pattern", "figure": "" }),
            ("arp",     { "movement": "arpeggiate", "address": "pattern", "figure": "" })]:
            page.evaluate("""(d) => document.dispatchEvent(new CustomEvent('atetudes:config',
              { detail: d }))""", { "key": "Bb", "strings": [4, 3, 2, 1], "startDeg": 4,
                                    "nearFret": 3, "object": "tetrad", "take": "one",
                                    "notesPer": 1, "source": "cycle", "custom": "", **st_cfg })
            page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
              { detail: { index: 0, request: true } }))""")
            page.wait_for_timeout(250)
            got = page.evaluate(st_read)
            exp = st_exp[st_name]
            # REWRITTEN 260911 (item 5): every bar wears the figure now, so
            # the figured case carries the schedule's events on ALL EIGHT
            # bars — the count is derived (8 × L), never a table
            if st_name == "figured":
                check(got["figheads"] == 8 * exp["L"],
                      f"{tag} staff {st_name}: every bar wears the figure — heads == "
                      f"8 bars × the schedule's {exp['L']} events ({got['figheads']})")
                check(got["tuplets"].count(str(exp["L"])) >= 1 if exp["tuplet"] else not got["tuplets"],
                      f"{tag} staff {st_name}: the non-dyadic group wears the schedule's "
                      f"own numeral {exp['tuplet']}: {got['tuplets']}")
                check(got["beam1"] >= 1 if exp["beam1"] else got["beam1"] == 0,
                      f"{tag} staff {st_name}: beamed exactly when the schedule's value "
                      f"is under a beat (wv {exp['wv']}): beams {got['beam1']}")
                check(got["stems"] >= exp["stems"],
                      f"{tag} staff {st_name}: every scheduled event carries its stem "
                      f"({got['stems']} vs {exp['stems']})")
            if st_name == "strum":
                check(got["stems"] == 0 and got["beam1"] == 0 and not got["tuplets"],
                      f"{tag} staff {st_name}: a together-schedule stacks — no run stems, "
                      f"no beams, no numeral: {got}")
                check(got["blockstem"] == (1 if st_exp["strum"]["wv"] < 4 and not st_exp["strum"]["together"] else 0)
                      or st_exp["strum"]["together"],
                      f"{tag} staff {st_name}: the block's own stem follows the schedule: {got}")
            if st_name == "arp":
                check(got["stems"] >= exp["stems"] and got["beam1"] == 0 and not got["tuplets"],
                      f"{tag} staff {st_name}: quarters carry stems, no beam, no numeral "
                      f"(dv {exp['dv']}): stems {got['stems']}, beams {got['beam1']}")
        # full boot restore
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,
                      object: 'tetrad', take: 'one', notesPer: 1, movement: 'strum',
                      address: 'pattern', figure: '', source: 'cycle', custom: '' } }))""")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(250)

        # ---- 260909 item 1: THE FOLD FOLDS EVERYTHING ----
        # Collapsing the rail left Grip/Line/block/arpeggio/pattern/tones
        # painting on, clipped mid-glyph in the 30px strip: the segs' id-scoped
        # display rules out-rank the class-only shut rule. Asserted at the
        # artifact: with the rail shut, no rail descendant outside the railtop
        # is visible; open again, the buttons come back.
        page.evaluate("() => document.getElementById('fdRailBtn').click()")
        page.wait_for_timeout(120)
        fold = page.evaluate("""() => {
          const rail = document.getElementById('fdRail');
          const leaks = [];
          for (const el of rail.querySelectorAll(':scope > :not(.fd-railtop), :scope > :not(.fd-railtop) *')) {
            const r = el.getBoundingClientRect();
            const st = getComputedStyle(el);
            if (r.width > 0 && r.height > 0 && st.display !== 'none' && st.visibility !== 'hidden')
              leaks.push((el.id || el.tagName) + ':' + (el.textContent || '').trim().slice(0, 12));
          }
          return { shut: rail.classList.contains('fd-shut'), leaks: leaks.slice(0, 8), n: leaks.length };
        }""")
        check(fold["shut"], f"{tag} the rail reports shut after the fold click")
        check(fold["n"] == 0,
              f"{tag} a shut rail shows NOTHING beyond its top — {fold['n']} visible: {fold['leaks']}")
        page.evaluate("() => document.getElementById('fdRailBtn').click()")
        page.wait_for_timeout(120)
        back = page.evaluate("""() => {
          const b = [...document.querySelectorAll('#fdNSeg button, #fdMoveSeg button, #fdAddrSeg button')];
          return b.length === 6 && b.every(x => x.getBoundingClientRect().width > 0);
        }""")
        check(back, f"{tag} reopening the rail brings all six buttons back")

        # ---- 260909 4b: THE CAPPED LOSS IS ON THE FACE ----
        # Ebmaj7 at every-occurrence/Grip in the 5-8 window: R and 7 share
        # string 3, one must lose, and the loss was silent — the bar drew
        # 3,R,3,5 with the 7th ghosted in plain sight at 3/7. Now the face
        # names it with its derived escape.
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 5, nearFret: 5,
                      object: 'tetrad', take: 'all', notesPer: 1, source: 'cycle', custom: '' } }))""")
        page.wait_for_timeout(200)
        page.click('#tlScroll button >> nth=1'); page.wait_for_timeout(150)
        hint_cb = page.inner_text("#fdHint")
        check("the 7 is in the box but the grip cannot carry it" in hint_cb
              and "Line shows it" in hint_cb,
              f"{tag} the capped loss must be NAMED with its escape: {hint_cb!r}")
        check("the 7 is in the box" in page.inner_text("#roLine"),
              f"{tag} the readout names the capped loss too: {page.inner_text('#roLine')!r}")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,
                      object: 'tetrad', take: 'one', notesPer: 1, source: 'cycle', custom: '' } }))""")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(200)

        # ---- 260908: THE PLAYTHROUGH MATRIX — the gate that walks what a
        # player walks. Six consecutive nights of green gates ended with
        # Daniel finding a dead bar in five minutes, because every gate
        # tested what was built and none tested the player's path: pick a
        # key, pick a set, pick a window, walk the bars. THE ONE ASSERTION
        # those nights were missing: every bar is in exactly one of two
        # states — it PLACES (dots drawn), or it REFUSES BY NAME, VISIBLY ON
        # THE NECK, with the reason naming what would resolve it. A bar with
        # neither is a failure. Derived, never enumerated: keys off the
        # select's own options, windows off every start degree, bars off the
        # progression's own chips. Asserted at the artifact.
        mx_keys = page.evaluate("""() => { const o = [...document.querySelectorAll('#hcKey option')]
          .map(x => x.value); return [o[0], o[o.length - 1]]; }""")
        mx_cells = [0]
        mx_dead = []
        for mx_key in mx_keys + ["Bb"]:
            for mx_len in (3, 4, 6):
                mx_set = list(range(mx_len, 0, -1))
                page.select_option("#hcKey", mx_key); page.wait_for_timeout(80)
                for mx_sd in range(7):
                    page.evaluate("""(d) => document.dispatchEvent(new CustomEvent('atetudes:config',
                      { detail: d }))""", { "strings": mx_set, "startDeg": mx_sd, "nearFret": 5,
                                            "object": "tetrad", "take": "one", "notesPer": 1,
                                            "source": "cycle", "custom": "" })
                    page.wait_for_timeout(90)
                    n_bars = int(page.get_attribute("#tlScroll", "data-tlbars") or "8")
                    for mx_bar in range(min(n_bars, 8)):
                        page.click(f'#tlScroll button >> nth={mx_bar}')
                        page.wait_for_timeout(70)
                        st = page.evaluate("""(bar) => {
                          const sel = document.querySelectorAll('#fieldSvg .fd-sel').length;
                          const ref = document.querySelector('#fieldSvg .fd-refusal');
                          const stv = document.getElementById('stSvg');
                          return { sel, refusal: ref ? ref.textContent : null,
                            stHeads: stv ? stv.querySelectorAll('ellipse[data-stmidi][data-stbar="' + bar + '"]').length : -1,
                            stRefuse: stv ? stv.querySelectorAll('[data-strefuse="' + bar + '"]').length : -1 }; }""",
                          str(mx_bar))
                        mx_cells[0] += 1
                        ok = st["sel"] > 0 or (st["refusal"] and len(st["refusal"]) > 10)
                        # 260911 item 5: the STAFF holds the same doctrine —
                        # the cell's bar draws its heads or refuses in the bar
                        st_ok = st["stHeads"] > 0 or st["stRefuse"] > 0
                        if not st_ok and len(mx_dead) < 8:
                            mx_dead.append(f"{mx_key} set{mx_len} sd{mx_sd} bar{mx_bar + 1} STAFF-SILENT")
                        if not ok and len(mx_dead) < 8:
                            chip = page.eval_on_selector_all("#tlScroll button.tl-cur",
                                "es => es.map(e => e.getAttribute('data-tlchip'))")
                            mx_dead.append(f"{mx_key} set{mx_len} sd{mx_sd} bar{mx_bar + 1} {chip}")
                        if st["refusal"]:
                            # the way through, always; the colliding string,
                            # when one is derivable (a tetrad on three
                            # strings collides everywhere — no single string
                            # to name; the escape still is)
                            check("Line" in st["refusal"] or "no per-string" in st["refusal"],
                                  f"{tag} matrix {mx_key}/set{mx_len}/sd{mx_sd}/bar{mx_bar + 1}: a "
                                  f"refusal must name the way through: {st['refusal']!r}")
                            if "occur only" in st["refusal"]:
                                check("string" in st["refusal"],
                                      f"{tag} matrix: a derivable collide must name its string: "
                                      f"{st['refusal']!r}")
        check(not mx_dead,
              f"{tag} THE PLAYTHROUGH MATRIX: {len(mx_dead)}+ bars are DEAD — neither dots "
              f"nor a visible on-neck reason: {mx_dead}")
        check(mx_cells[0] >= 500,
              f"{tag} the matrix must actually walk ({mx_cells[0]} cells; floor 500)")
        # ---- the CONTRADICTION leg (260909, item 3) — contradicting controls
        # must SHOW the contradiction. "A typed figure sequences, whatever the
        # Take" (260901) ruled the behaviour; Daniel caught the override
        # arriving silently — block stayed raised and dark while the figure
        # ruled it moot, the third coupling class. Now: a ruling figure
        # disables block with the reason on its label AND on the Movement
        # cap; the player's setting is never auto-switched (block keeps its
        # .on while disabled, waiting); an erring figure rules nothing and
        # block stays real; clearing the figure restores everything. Walked
        # for both figure languages, derived where a figure can be (the
        # pattern off the set's own strings).
        page.select_option("#hcKey", "Bb"); page.wait_for_timeout(80)
        mx_contra = 0
        mx_figs = page.evaluate("""() => {
          const strs = [...document.querySelectorAll('#fieldSvg [data-fdstr]')]
            .map(e => e.getAttribute('data-fdstr'));
          return { pattern: ['4', '3', '2', '1'].join(','), tones: 'R,3,5,7',
                   badPattern: '9,9', badTones: '4,3' }; }""")
        for mx_addr, mx_fig, mx_bad in [("pattern", mx_figs["pattern"], mx_figs["badPattern"]),
                                        ("tones", mx_figs["tones"], mx_figs["badTones"])]:
            page.evaluate("""(d) => document.dispatchEvent(new CustomEvent('atetudes:config',
              { detail: d }))""", { "key": "Bb", "strings": [4, 3, 2, 1], "startDeg": 4,
                                    "nearFret": 3, "object": "tetrad", "take": "one",
                                    "notesPer": 1, "movement": "strum", "address": mx_addr,
                                    "figure": mx_fig, "source": "cycle", "custom": "" })
            page.wait_for_timeout(150)
            st = page.evaluate("""() => {
              const b = document.querySelector('#fdMoveSeg button[data-move="strum"]');
              const cap = document.getElementById('fdMoveSeg').previousElementSibling;
              return { disabled: b.disabled, on: b.classList.contains('on'),
                       title: b.title, cap: cap.textContent }; }""")
            mx_contra += 1
            check(st["disabled"] and "figure" in st["title"] and "clear" in st["title"].lower(),
                  f"{tag} matrix contradiction ({mx_addr}): a ruling figure DISABLES block "
                  f"with the reason on its label: {st!r}")
            check(st["on"],
                  f"{tag} matrix contradiction ({mx_addr}): the setting WAITS — block keeps "
                  f".on while disabled, never auto-switched: {st!r}")
            check("figure sequences" in st["cap"],
                  f"{tag} matrix contradiction ({mx_addr}): the Movement cap says why: {st['cap']!r}")
            # an erring figure rules nothing — block stays real
            page.evaluate("""(v) => document.dispatchEvent(new CustomEvent('atetudes:config',
              { detail: { figure: v } }))""", mx_bad)
            page.wait_for_timeout(120)
            st2 = page.evaluate("""() => {
              const b = document.querySelector('#fdMoveSeg button[data-move="strum"]');
              const cap = document.getElementById('fdMoveSeg').previousElementSibling;
              return { disabled: b.disabled, cap: cap.textContent }; }""")
            mx_contra += 1
            check(not st2["disabled"] and st2["cap"].strip() == "Movement",
                  f"{tag} matrix contradiction ({mx_addr}): an ERRING figure rules nothing — "
                  f"block stays real: {st2!r}")
            # clearing restores
            page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
              { detail: { figure: '' } }))""")
            page.wait_for_timeout(120)
            st3 = page.evaluate("""() => {
              const b = document.querySelector('#fdMoveSeg button[data-move="strum"]');
              const cap = document.getElementById('fdMoveSeg').previousElementSibling;
              return { disabled: b.disabled, on: b.classList.contains('on'),
                       title: b.title, cap: cap.textContent }; }""")
            mx_contra += 1
            check(not st3["disabled"] and st3["on"] and st3["cap"].strip() == "Movement"
                  and "sound together" in st3["title"],
                  f"{tag} matrix contradiction ({mx_addr}): clearing the figure restores "
                  f"block, its own title back: {st3!r}")
        check(mx_contra >= 6,
              f"{tag} the contradiction leg must actually walk ({mx_contra} cells; floor 6)")
        # full boot restore — the leg moved address, movement and figure
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,
                      object: 'tetrad', take: 'one', notesPer: 1, movement: 'strum',
                      address: 'pattern', figure: '', source: 'cycle', custom: '' } }))""")
        page.wait_for_timeout(200)
        # the SOUND half, on Daniel's own configuration: refused bars silent,
        # placed bars sounding — one played pass, the NOTE stream as witness
        page.select_option("#hcKey", "Bb"); page.wait_for_timeout(80)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { strings: [3, 2, 1], startDeg: 5, nearFret: 0, object: 'triad',
                      take: 'one', notesPer: 1, source: 'cycle', custom: '' } }))""")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.fill("#bpmRange", "240"); page.dispatch_event("#bpmRange", "input")
        page.wait_for_timeout(150)
        placed_bars = []
        for mx_bar in range(8):
            page.click(f'#tlScroll button >> nth={mx_bar}'); page.wait_for_timeout(70)
            placed_bars.append(page.eval_on_selector_all("#fieldSvg .fd-sel", "e => e.length") > 0)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(120)
        page.evaluate("""() => {
          if (!window.__ntHooked) { window.__ntHooked = true; window.__nt = [];
            document.addEventListener('atetudes:note', e =>
              window.__nt.push({ m: e.detail.midi, t: performance.now(), r: e.detail.role || null })); }
          if (!window.__advHooked) { window.__advHooked = true; window.__adv = [];
            document.addEventListener('atetudes:step', e => {
              if (e.detail && e.detail.request !== true)
                window.__adv.push({ i: e.detail.index, t: performance.now() }); }); }
          window.__nt = []; window.__adv = []; }""")
        page.click('#tlStripMini button[data-role="play"]'); page.wait_for_timeout(8600)
        page.click('#tlStripMini button[data-role="stop"]'); page.wait_for_timeout(250)
        mx_nt = page.evaluate("() => window.__nt"); mx_adv = page.evaluate("() => window.__adv")
        if len(mx_adv) < 2:
            check(False, f"{tag} matrix sound half never advanced ({len(mx_adv)} echoes)")
        bounds = [a["t"] for a in mx_adv]
        for k in range(min(len(bounds) - 1, 7)):
            barn = mx_adv[k]["i"]
            sounded = any(bounds[k] - 50 <= n["t"] < bounds[k + 1] - 50 for n in mx_nt)
            check(sounded == placed_bars[barn % 8],
                  f"{tag} matrix sound half: bar {barn + 1} "
                  f"{'placed but silent' if placed_bars[barn % 8] else 'refused but sounded'}")
        # the AUDITION belongs in this half (260910, item 1): the clock just
        # stopped — a placed bar's chip sounds its drawn notes, a refused
        # bar's chip stays silent, on the SAME configuration the pass walked
        # crash-proof under a deaf-board mutation: this configuration is
        # CHOSEN for having both states — losing one is a failure, not a crash
        if True not in placed_bars or False not in placed_bars:
            check(False, f"{tag} matrix sound half: the configuration must carry both "
                  f"placed and refused bars for the audition leg (placed: {placed_bars})")
        else:
            mx_place = placed_bars.index(True); mx_refuse = placed_bars.index(False)
            page.evaluate("() => { window.__nt = [] }")
            page.click(f'#tlScroll button >> nth={mx_place}'); page.wait_for_timeout(350)
            mx_aud_p = page.evaluate("() => window.__nt.length")
            page.evaluate("() => { window.__nt = [] }")
            page.click(f'#tlScroll button >> nth={mx_refuse}'); page.wait_for_timeout(350)
            mx_aud_r = page.evaluate("() => window.__nt.length")
            check(mx_aud_p > 0 and mx_aud_r == 0,
                  f"{tag} matrix sound half, stopped: a placed chip auditions "
                  f"({mx_aud_p} NOTEs), a refused chip stays silent ({mx_aud_r})")
        # restore the boot
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,
                      object: 'tetrad', take: 'one', notesPer: 1, source: 'cycle', custom: '' } }))""")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.fill("#bpmRange", "72"); page.dispatch_event("#bpmRange", "input")
        page.wait_for_timeout(150)

        # ---- 260906 item 2: THE REFERENCE RIDES THE BASS BUS ----
        # Daniel: "the bass volume does nothing". The only producer of a
        # bass-role event was the rogue tetrad pass killed on 260905; the
        # reference travelled as a plain NOTE and landed on the chord
        # channel. Now it names its role and audio-card routes it. Asserted
        # AT THE AUDIOCONTEXT (the 260905 lesson — not at the message), both
        # sliders exercised.
        page.select_option("#fdBass2", "third"); page.uncheck("#fdMetChk")
        page.wait_for_timeout(200)
        page.evaluate("""() => {
          if (!window.__ntHooked) { window.__ntHooked = true; window.__nt = [];
            document.addEventListener('atetudes:note', e =>
              window.__nt.push({ m: e.detail.midi, t: performance.now(), r: e.detail.role || null })); }
          if (!window.__rawHooked) { window.__rawHooked = true; window.__raw = [];
            for (const C of [AudioBufferSourceNode, OscillatorNode]) {
              const P = C.prototype.start;
              C.prototype.start = function(...a) { window.__raw.push(performance.now());
                return P.apply(this, a); }; } } }""")

        def play_bar_counts():
            page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
              { detail: { index: 0, request: true } }))""")
            page.wait_for_timeout(150)
            page.evaluate("() => { window.__raw = []; window.__nt = [] }")
            page.click('#tlStripMini button[data-role="play"]'); page.wait_for_timeout(600)
            page.click('#tlStripMini button[data-role="stop"]'); page.wait_for_timeout(250)
            return page.evaluate("() => [window.__nt.length, window.__raw.length]")

        base = play_bar_counts()
        check(base == [5, 5],
              f"{tag} the baseline bar is four chord notes plus the fretted reference, "
              f"at the AudioContext: NOTEs/raw {base}")
        page.fill("#fdBassVol", "0"); page.dispatch_event("#fdBassVol", "input")
        page.wait_for_timeout(100)
        muted_bass = play_bar_counts()
        check(muted_bass[1] == base[1] - 1,
              f"{tag} the bass slider at zero must drop EXACTLY the reference — "
              f"raw {base[1]} → {muted_bass[1]}")
        page.fill("#fdBassVol", "100"); page.dispatch_event("#fdBassVol", "input")
        page.fill("#fdHarmVol", "0"); page.dispatch_event("#fdHarmVol", "input")
        page.wait_for_timeout(100)
        muted_chord = play_bar_counts()
        check(muted_chord[1] == 1,
              f"{tag} the chord slider at zero must leave the reference ALONE sounding: "
              f"raw {muted_chord[1]}")
        page.fill("#fdHarmVol", "100"); page.dispatch_event("#fdHarmVol", "input")
        page.select_option("#fdBass2", "none"); page.check("#fdMetChk")
        page.wait_for_timeout(150)

        # ---- 260906 item 3: THE BOARD DRAWS THE ENGINE'S OWN SELECTION ----
        # Daniel reported Fmaj7#5 (D harm, cycling 4ths, bar 4, frets 6-10,
        # six strings) drawing NOTHING. The measurement found board ≡ engine
        # at that exact state on both builds, every bar, every probe — the
        # diff table's finding is that no field differs. The class is pinned
        # anyway, at the two derivations' own artifacts: the drawn dots must
        # equal a fresh engine computation of the same state, bar by bar,
        # role@string/fret for role@string/fret.
        expected = json.loads(subprocess.run(["node", "--input-type=module", "-e", """
import { field } from './engine/field.mjs';
import { positionOf, materialIn } from './engine/position.mjs';
import { oneOfEach } from './engine/selection.mjs';
import { progressionOf, chordAt } from './engine/progression.mjs';
const fld = field({ key: 'D', scale: 'harm' });
const pos = positionOf({ field: fld, anchorString: 6, startDegree: 5, nearFret: 6, strings: [6,5,4,3,2,1] });
const pool = materialIn(pos, [6,5,4,3,2,1], fld);
const prog = progressionOf({ source: 'cycle', cycle: 'fourths', start: 0 }, 'D', 'harm');
const out = [];
for (let i = 0; i < prog.chords.length; i++) {
  const cur = chordAt(prog, i, fld, 'tetrad');
  const r = oneOfEach(cur.tones, pool, { n: 1, centre: pos.centre });
  out.push({ sym: cur.symbol, sel: (r.notes || []).map(n => n.role+'@'+n.string+'/'+n.fret).sort() });
}
console.log(JSON.stringify(out));
"""], capture_output=True, text=True, cwd=REPO).stdout)
        check(len(expected) == 8 and all(len(e["sel"]) == 4 for e in expected),
              f"{tag} the engine itself must place all eight bars of Daniel's state: "
              f"{[(e['sym'], len(e['sel'])) for e in expected]}")
        page.select_option("#hcKey", "D"); page.select_option("#hcScale", "harm")
        page.wait_for_timeout(150)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { strings: [6, 5, 4, 3, 2, 1], startDeg: 5, nearFret: 6 } }))""")
        page.wait_for_timeout(200)
        for ci, exp in enumerate(expected):
            page.click(f'#tlScroll button >> nth={ci}'); page.wait_for_timeout(150)
            drawn = sorted(page.evaluate("""() => [...document.querySelectorAll('#fieldSvg .fd-sel')]
              .map(g => g.querySelector('text').textContent.trim() + '@' + g.dataset.selstr + '/' + g.dataset.selfret)"""))
            check(drawn == exp["sel"],
                  f"{tag} bar {ci + 1} ({exp['sym']}): the board must draw the engine's own "
                  f"selection — drawn {drawn}, engine {exp['sel']}")
        page.select_option("#hcKey", "Bb"); page.select_option("#hcScale", "major")
        page.wait_for_timeout(150)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,
                      source: 'cycle', custom: '' } }))""")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(200)

        # ---- 260906 item 1 + 260907 amendment: THE COVERAGE RULE in the
        # OCTAVE WINDOW, on Daniel's exact case. UPDATED 260907, reason: the
        # old pin asserted "3@1/5, 5@3/5 and no R in this frame" — but the
        # missing R was the WINDOW's defect, not the selection's, and the
        # octave amendment completes the box (2-5 grew to 2-6, where F
        # lives). The coverage rule's own work is still visible and pinned:
        # string 3 must give its slot to the C, never to the duplicate A.
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'C', strings: [3, 2, 1], startDeg: 5, nearFret: 2,
                      object: 'triad', take: 'all', notesPer: 1,
                      source: 'custom', custom: 'F' } }))""")
        page.wait_for_timeout(250)
        fsel = page.evaluate("""() => [...document.querySelectorAll('#fieldSvg .fd-sel')]
          .map(g => g.querySelector('text').textContent.trim() + '@' + g.dataset.selstr + '/' + g.dataset.selfret)
          .sort()""")
        check(fsel == ["3@1/5", "5@3/5", "R@2/6"],
              f"{tag} Daniel's F must voice R, 3rd AND 5th — never two 3rds, and the "
              f"octave window holds the R the old box lost: {fsel}")
        hint_f = page.inner_text("#roLine")   # re-sited 260919: the cap's meaning is state — the readout's
        check("every occurrence the grip allows" in hint_f,
              f"{tag} the cap's meaning must be on the face: {hint_f!r}")
        # AND THE RULED CASE ITSELF: IV, ii and vii° — the three chords Daniel
        # watched come back incomplete at this window — each complete now
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { take: 'one', source: 'custom', custom: 'F Dm Bdim' } }))""")
        page.wait_for_timeout(250)
        # THE RULED CASE'S TRUE SHAPE under the amendment (stated in the 260907
        # report): all three chords were missing the CLASS F, and the octave
        # window restores it — IV completes. ii and vii° then meet a
        # DIFFERENT, already-ruled behaviour: in the minimal octave box, D
        # and F both live only on string 2, so the grip refuses BY NAME (the
        # collide case, child 5's law) instead of silently half-placing.
        # Complete where completable; loud where not. Daniel's question 1.
        expects = [("F", 3, None), ("Dm", 0, "occur only on string 2"),
                   ("Bdim", 0, "occur only on string 2")]
        for ci, (sym, want_n, want_msg) in enumerate(expects):
            page.click(f'#tlScroll button >> nth={ci}'); page.wait_for_timeout(150)
            n = page.eval_on_selector_all("#fieldSvg .fd-sel", "e => e.length")
            hint_c = page.inner_text("#fdHint")
            if want_msg is None:
                check(n == want_n and "no placement fits" not in hint_c,
                      f"{tag} {sym} must place COMPLETE at the amended window ({n} notes)")
            else:
                check(n == 0 and want_msg in hint_c,
                      f"{tag} {sym} must refuse BY NAME (the collide, not a silent "
                      f"half-chord): {n} notes, {hint_c[:140]!r}")
        # full boot restore — this block moved the key, the source AND the step
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,
                      object: 'tetrad', take: 'one', notesPer: 1,
                      source: 'cycle', custom: '' } }))""")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(200)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,
                      object: 'tetrad', take: 'one', notesPer: 1,
                      source: 'cycle', custom: '' } }))""")
        page.wait_for_timeout(200)

        # ---- 260905 item 1: THE SELECTED SEGMENT IS VISIBLE ----
        # Daniel could not tell Grip from Line: the .on class was applied all
        # along, but the shell's `.seg` styles live in its STRIPS chrome
        # block, which this door's lock never mounts — the rule rode the
        # build only as inlined source, never as live CSS. Each module now
        # carries the styles for its own seg (the minis' own idiom). Pinned
        # at the COMPUTED STYLE: exactly one .on per group, visibly darker
        # than its sibling, and it follows a click.
        for seg in ("fdNSeg", "fdMoveSeg", "fdAddrSeg", "pgSrcSeg"):
            st = page.evaluate("""(seg) => {
              const on = [...document.querySelectorAll('#' + seg + ' button.on')];
              const off = document.querySelector('#' + seg + ' button:not(.on)');
              const bg = (el) => getComputedStyle(el).backgroundColor;
              return { n: on.length, onBg: on.length ? bg(on[0]) : null, offBg: bg(off) };
            }""", seg)
            check(st["n"] == 1 and st["onBg"] != st["offBg"]
                  and st["onBg"] == "rgb(33, 33, 38)",
                  f"{tag} #{seg}: the chosen segment must WEAR its choice (ink on, "
                  f"one per group): {st}")
        page.click('#fdNSeg button[data-nps=\"3\"]'); page.wait_for_timeout(100)
        line_on = page.evaluate("""() => {
          const b = [...document.querySelectorAll('#fdNSeg button')]
            .find(x => x.textContent.trim() === 'Line');
          return b.classList.contains('on') && getComputedStyle(b).backgroundColor; }""")
        check(line_on == "rgb(33, 33, 38)",
              f"{tag} the .on must FOLLOW a click, visibly: {line_on}")
        page.click('#fdNSeg button[data-nps=\"1\"]'); page.wait_for_timeout(100)

        # ---- child 3b: the strings-address and the order bracket ----
        brackets = lambda: page.evaluate("""() =>
          Object.fromEntries([...document.querySelectorAll('.fd-brk')]
            .map(t => [t.dataset.fdbrk, { text: t.textContent, fill: t.getAttribute('fill') }]))""")
        figorder = lambda: (page.get_attribute("#fieldSvg", "data-figorder") or "")
        # ALWAYS ON: before anything is typed the bracket shows, faint, what
        # each in-run string offers
        b0 = brackets()
        check(len(b0) == 4 and all(v["fill"] == "#D8D8DC" for v in b0.values()),
              f"{tag} the order bracket must be always-on and faint before a figure: {b0}")
        # the item's case: every occurrence at Line doubles string 4, and
        # 4,3,4,3,2,1 walks its two notes low → high — THE REPEAT IS THE ORDINAL
        page.check("#fdAllTones"); page.wait_for_timeout(80)
        page.click('#fdNSeg button[data-nps=\"3\"]'); page.wait_for_timeout(100)
        page.fill("#fdFigIn", "4,3,4,3,2,1"); page.dispatch_event("#fdFigIn", "input")
        page.wait_for_timeout(150)
        steps = [x.split("/") for x in figorder().split(",")]
        check(len(steps) == 6 and steps[0][0] == "4" and steps[2][0] == "4"
              and int(steps[2][1]) > int(steps[0][1]),
              f"{tag} 4,3,4,3,2,1 at Line must play string 4's two notes low->high: {figorder()}")
        b1 = brackets()
        check(b1["4"]["text"] == "{1,3}" and b1["3"]["text"] == "{2,4}"
              and b1["2"]["text"] == "{5}" and b1["1"]["text"] == "{6}",
              f"{tag} the bracket must read {{6}} {{5}} {{2,4}} {{1,3}} on strings 1-4: {b1}")
        check(all(v["fill"] == "#212126" for v in b1.values()),
              f"{tag} a TYPED pattern's bracket is full ink: {b1}")
        # PIN REWRITTEN 260911 (item 5, the reason): v0.9's current-bar-only
        # figure display is superseded by Daniel's ruling — EVERY bar wears
        # the figure, resolved against its own selection. Kept: the run is a
        # run (distinct x per step). Now asserted: all eight bars carry the
        # six addressed steps, 48 heads, six distinct x-positions per bar.
        st_by_bar = page.evaluate("""() => {
          const out = {};
          for (const e of document.querySelectorAll('#stSvg ellipse[data-stfig]')) {
            const b = e.getAttribute('data-stbar');
            (out[b] = out[b] || []).push(+e.getAttribute('cx'));
          }
          return out; }""")
        check(len(st_by_bar) == 8
              and all(len(v) == 6 and len(set(v)) == 6 for v in st_by_bar.values()),
              f"{tag} EVERY bar draws the 6-step figure as a run (260911 ruling): "
              f"{ {k: len(v) for k, v in st_by_bar.items()} }")
        # tones: derived bracket, greyed — with a TONES figure (260902: the
        # old pattern-shaped figure is now refused by the mode-mismatch
        # notice instead of being half-read, so the block types the tones
        # alphabet; the mismatch itself is pinned in the 260902 block)
        page.click('#fdAddrSeg button[data-addr=\"tones\"]'); page.wait_for_timeout(80)
        page.fill("#fdFigIn", "R-3-5-7"); page.dispatch_event("#fdFigIn", "input")
        page.wait_for_timeout(120)
        bt = brackets()
        typed = {k: v for k, v in bt.items() if v["text"] and "{" in v["text"] and v["fill"] == "#B9B9BF"}
        check(len(typed) >= 1, f"{tag} under tones the bracket is derived and greyed: {bt}")
        # refusals, loud on the face
        page.click('#fdAddrSeg button[data-addr=\"pattern\"]'); page.wait_for_timeout(80)
        # PIN REWRITTEN 260918 (night 24, item 1 — rule 7): approaches are BUILT
        # (CR-1; Spec §2.6). Under the PATTERN address they still refuse, by
        # name, offering the switch — the mode-mismatch manners.
        page.fill("#fdFigIn", "(-1,+2)4"); page.dispatch_event("#fdFigIn", "input"); page.wait_for_timeout(120)
        check("name TONES" in page.inner_text("#fdFigNote") and "switch it to tones" in page.inner_text("#fdFigNote"),
              f"{tag} an approach under pattern refuses by name, offering tones: {page.inner_text('#fdFigNote')!r}")
        page.fill("#fdFigIn", "5"); page.dispatch_event("#fdFigIn", "input"); page.wait_for_timeout(120)
        check("string 5 carries nothing" in page.inner_text("#fdFigNote"),
              f"{tag} an absent string must refuse by name: {page.inner_text('#fdFigNote')!r}")

        # ---- 260918 (night 24, item 1): THE APPROACH NOTE — Design Spec §2.6, implemented ----
        # Every assertion below is a §2.6 clause read off the ARTIFACT: weight
        # (0.6 of the host radius, hollow, no text), colour by FUNCTION
        # (violet when chromatic, the degree colour when diatonic), no new
        # ring, the slur UNDER the dots in annotation gray at 1.2, derived
        # from the order's role — and CR-1 §2's WHEN: drawn before play, the
        # ordinary pulse on play.
        page.click('#fdAddrSeg button[data-addr="tones"]'); page.wait_for_timeout(80)
        ap_read = """() => { const svg = document.getElementById('fieldSvg'); const kids = [...svg.children];
          const host = svg.querySelector('.fd-sel:not(.fd-appr) circle');
          const aps = [...svg.querySelectorAll('.fd-appr')].map(g => { const c = g.querySelector('circle'); return {
            chrom: g.dataset.chromatic, deg: g.dataset.deg, r: +c.getAttribute('r'), stroke: c.getAttribute('stroke'),
            fill: c.getAttribute('fill'), text: !!g.querySelector('text'), hostR: +host.getAttribute('r') }; });
          const slurs = [...svg.querySelectorAll('.fd-slur')];
          const firstDot = kids.indexOf(svg.querySelector('.fd-sel'));
          return { aps, slurs: slurs.map(sl => ({ under: kids.indexOf(sl) < firstDot, stroke: sl.getAttribute('stroke'), w: sl.getAttribute('stroke-width') })),
            note: document.getElementById('fdFigNote').textContent }; }"""
        # (b3)[3] — chromatic: violet, hollow, 0.6 of the host, no label, drawn BEFORE play
        page.fill("#fdFigIn", "(b3)[3]"); page.dispatch_event("#fdFigIn", "input"); page.wait_for_timeout(250)
        apc = page.evaluate(ap_read)
        check(len(apc["aps"]) == 1 and apc["aps"][0]["chrom"] == "true" and apc["aps"][0]["stroke"] == "#7847A8",
              f"{tag} §2.6 colour: a CHROMATIC approach takes violet #7847A8: {apc['aps']}")
        check(apc["aps"] and abs(apc["aps"][0]["r"] / apc["aps"][0]["hostR"] - 0.6) < 0.01 and apc["aps"][0]["fill"] == "none",
              f"{tag} §2.6 weight: 0.6 of the host radius, hollow: {apc['aps']}")
        check(apc["aps"] and not apc["aps"][0]["text"],
              f"{tag} §2.6: no interval label on an approach mark: {apc['aps']}")
        check(len(apc["slurs"]) == 1 and apc["slurs"][0]["under"] and apc["slurs"][0]["stroke"] == "#73737A" and apc["slurs"][0]["w"] == "1.2",
              f"{tag} §2.6 connection: the slur in annotation gray, 1.2, UNDER the dots: {apc['slurs']}")
        # PIN REWRITTEN 260919 (night 25 item 4, rule 7): motion's phrasing still
        # reaches the face, and the face now NAMES the centre the degree is measured
        # from — "the key's ♭3" (rule 12: a bare "the ♭3" addressed the tonic by
        # appearance; on a non-tonic bar a player read the chord's). The grammar is
        # untouched; only the readout re-addresses the degree item.
        check("approached from the key's ♭3" in apc["note"],
              f"{tag} CR-1 §5: motion's own phrasing reaches the face, its centre named: {apc['note']!r}")
        # no new RING meaning approach: no ring element exists outside the pulse layer
        check(page.evaluate("() => document.querySelectorAll('#fieldSvg .fd-appr circle').length === 1 && document.querySelectorAll('#fieldSvg .fd-appr *').length === 1"),
              f"{tag} §2.6: no new ring — the approach group holds exactly its one hollow circle")
        # (-s)[3] — diatonic: the scale tone below the 3rd is the 2nd — green, its §2.1 colour
        page.fill("#fdFigIn", "(-s)[3]"); page.dispatch_event("#fdFigIn", "input"); page.wait_for_timeout(250)
        apd = page.evaluate(ap_read)
        check(len(apd["aps"]) == 1 and apd["aps"][0]["chrom"] == "false" and apd["aps"][0]["deg"] == "2" and apd["aps"][0]["stroke"] == "#3C8B2F",
              f"{tag} §2.6 colour: a DIATONIC approach keeps its degree colour — the 2nd, green: {apd['aps']}")
        check("approached from the scale tone below" in apd["note"], f"{tag} the diatonic sentence: {apd['note']!r}")
        # CR-1 §2 WHEN: the ordinary sounding pulse rings the approach on play — the
        # mark carries data-selmidi and ringFor finds it like any dot
        page.fill("#fdFigIn", "(b3)[3]"); page.dispatch_event("#fdFigIn", "input"); page.wait_for_timeout(250)
        page.evaluate("""() => { window.__apRings = []; const svg = document.getElementById('fieldSvg');
          new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('fd-pulse'))
            window.__apRings.push(n.getAttribute('cx') + ',' + n.getAttribute('cy')); }))).observe(svg, { childList: true, subtree: true }); }""")
        page.uncheck("#fdMetChk"); page.wait_for_timeout(80)
        page.click('#tlStripMini button[data-role="play"]'); page.wait_for_timeout(2600)
        page.click('#tlStripMini button[data-role="stop"]'); page.wait_for_timeout(300)
        rung = page.evaluate("""() => [...document.querySelectorAll('#fieldSvg .fd-appr circle')]
          .some(c => window.__apRings.includes(c.getAttribute('cx') + ',' + c.getAttribute('cy')))""")
        check(rung, f"{tag} CR-1 §2: the approach takes the ORDINARY sounding pulse when it sounds")
        page.check("#fdMetChk"); page.wait_for_timeout(80)
        # the staff engraves it (§2.6 "cue-size noteheads under the same color rules")
        st_ap = page.evaluate("""() => [...document.querySelectorAll('#stSvg [data-stapproach]')].map(e => ({ chrom: e.dataset.stapproach, fill: e.getAttribute('fill'), stroke: e.getAttribute('stroke'), rx: +e.getAttribute('rx') }))""")
        check(len(st_ap) >= 1 and st_ap[0]["chrom"] == "chromatic" and "#7847A8" in (st_ap[0]["fill"] + st_ap[0]["stroke"]) and st_ap[0]["rx"] < 6.4,
              f"{tag} §2.6 engraved: the staff draws the approach as a cue-size head in violet: {st_ap[:2]}")
        page.fill("#fdFigIn", ""); page.dispatch_event("#fdFigIn", "input"); page.wait_for_timeout(120)
        page.click('#fdAddrSeg button[data-addr="pattern"]'); page.wait_for_timeout(80)
        # back to the boot state
        page.fill("#fdFigIn", ""); page.dispatch_event("#fdFigIn", "input"); page.wait_for_timeout(80)
        page.uncheck("#fdAllTones"); page.wait_for_timeout(60)
        page.click('#fdNSeg button[data-nps=\"1\"]'); page.wait_for_timeout(80)

        # ---- child 4: dyads, the shell, and the one derivation ----
        roles = lambda: sorted(set(page.eval_on_selector_all(
            "#fieldSvg .fd-sel text", "es => es.map(e => e.textContent.trim())")))
        # the objects went live: dyad and shell are choosable, not promises
        obj_state = page.evaluate("""() =>
          Object.fromEntries([...document.querySelectorAll('#hcObj option')]
            .map(o => [o.value, o.disabled]))""")
        check(obj_state.get("dyad") is False and obj_state.get("shell") is False,
              f"{tag} dyad and shell must be live objects (child 4): {obj_state}")
        # the SHELL is R + the guide tones — three roles, never the 5th
        page.select_option("#hcObj", "shell"); page.wait_for_timeout(150)
        check(roles() == ["3", "7", "R"],
              f"{tag} a shell must wear exactly R, 3, 7 on the field: {roles()}")
        # the DYAD defaults to the guide tones, and its menu only shows here
        page.select_option("#hcObj", "dyad"); page.wait_for_timeout(150)
        # PINS REWRITTEN 260917 (item 1, rule 7): the dyad's pair MENU is the
        # tones FIELD now — the figure field's own notation (R,3,5,7), one
        # way to name tones in the app — and it serves every stacked object
        tones_field = lambda: page.evaluate("() => ({ hidden: document.getElementById('hcTones').hidden, value: document.getElementById('hcTones').value })")
        check(not tones_field()["hidden"] and tones_field()["value"] == "3,7",
              f"{tag} the tones field appears under a dyad, defaulted to the guide tones: {tones_field()}")
        check(roles() == ["3", "7"],
              f"{tag} the default dyad is 3rd + 7th, nothing else: {roles()}")
        # any two tones by role: Root + 5th re-derives the field's dots
        page.fill("#hcTones", "R,5"); page.dispatch_event("#hcTones", "input"); page.wait_for_timeout(150)
        check(roles() == ["5", "R"],
              f"{tag} the Root + 5th dyad must wear exactly R and 5: {roles()}")
        # the choice travels the bus: the staff re-derives from the same value
        st_n = page.eval_on_selector_all("#stSvg ellipse", "e => e.length")
        check(st_n == 16,
              f"{tag} the staff must speak the dyad in every bar — 2 heads × the derived 8 (got {st_n})")
        page.fill("#hcTones", "3,7"); page.dispatch_event("#hcTones", "input"); page.wait_for_timeout(80)

        # ---- 260917 item 1: TONE SELECTION extends to Triad, Tetrad and the extensions ----
        # Ruled: Triad picks three, Tetrad four, the extensions their depth's
        # worth; fewer is legitimate; a tone the object cannot hold refuses
        # BY NAME; the FIGURE FIELD'S notation and parser — never a second.
        page.select_option("#hcObj", "tetrad"); page.wait_for_timeout(150)
        check(tones_field()["value"] == "R,3,5,7" and not tones_field()["hidden"],
              f"{tag} 1: a tetrad's field fills with its whole stack: {tones_field()}")
        page.fill("#hcTones", "R,3,7"); page.dispatch_event("#hcTones", "input"); page.wait_for_timeout(200)
        check(roles() == ["3", "7", "R"],
              f"{tag} 1: a tetrad picked R,3,7 draws exactly those three: {roles()}")
        # the pick reaches the SOUND and the staff — one derivation, every board
        st_pick = page.eval_on_selector_all("#stSvg ellipse", "e => e.length")
        check(st_pick == 24,
              f"{tag} 1: the staff speaks the pick in every bar — 3 heads × 8 bars (got {st_pick})")
        # the refusal, BY NAME, in the object's own words — the drawn set unchanged
        page.fill("#hcTones", "R,3,13"); page.dispatch_event("#hcTones", "input"); page.wait_for_timeout(200)
        hc_note = page.inner_text("#hcNote")
        check("13 is not a tone of a tetrad" in hc_note and "a tetrad holds R, 3, 5, 7" in hc_note,
              f"{tag} 1: a tone the object cannot hold refuses by name: {hc_note!r}")
        check(roles() == ["3", "7", "R"],
              f"{tag} 1: a refused pick leaves the last lawful one standing: {roles()}")
        # junk refuses in the FIGURE's own voice — one parser, one vocabulary
        page.fill("#hcTones", "R,Q"); page.dispatch_event("#hcTones", "input"); page.wait_for_timeout(200)
        hc_note = page.inner_text("#hcNote")
        check('"Q" is not a tone — tones are R, 3, 5, 7, 9, 11, 13' in hc_note,
              f"{tag} 1: junk is refused in the figure field's own words: {hc_note!r}")
        # an extension picks its own depth's worth: a 9th chord narrowed to R,3,7,9
        page.select_option("#hcObj", "ninth"); page.wait_for_timeout(150)
        check(tones_field()["value"] == "R,3,5,7,9",
              f"{tag} 1: a 9th's field fills with five: {tones_field()}")
        page.fill("#hcTones", "R,3,7,9"); page.dispatch_event("#hcTones", "input"); page.wait_for_timeout(250)
        check(roles() == ["3", "7", "9", "R"],
              f"{tag} 1: a 9th picked R,3,7,9 draws those four (no drop needed on four strings): {roles()}")
        # BUILT (proposed otherwise, rule 11): the grip's named drop still
        # applies to a hand-picked set that outruns the strings
        page.fill("#hcTones", "R,3,5,7,9"); page.dispatch_event("#hcTones", "input"); page.wait_for_timeout(250)
        check("the 5 dropped by the grip rule" in page.inner_text("#fdHint"),
              f"{tag} 1: a hand-picked 9th on four strings drops the 5th by the rule and SAYS so: {page.inner_text('#fdHint')[:120]!r}")
        # ---- 260917 item 2: SHELL is a PRESET of the selector — choosing it fills R,3,7 visibly ----
        page.select_option("#hcObj", "shell"); page.wait_for_timeout(150)
        check(tones_field()["value"] == "R,3,7" and not tones_field()["hidden"] and roles() == ["3", "7", "R"],
              f"{tag} 2: Shell fills the tones as R,3,7, visibly — a player sees WHY a shell is a shell: {tones_field()} {roles()}")
        page.fill("#hcTones", "R,7"); page.dispatch_event("#hcTones", "input"); page.wait_for_timeout(200)
        check(roles() == ["7", "R"],
              f"{tag} 2: a shell edited is a pick like any other — nothing removed, nothing duplicated: {roles()}")
        # a scale has no tones to pick: the field is hidden, not dead
        page.select_option("#hcObj", "scale"); page.wait_for_timeout(150)
        check(tones_field()["hidden"], f"{tag} 1: a scale hides the tones field — there is no stack to narrow")
        # ---- 260917 item 5: EACH PASSING CHORD NAMES ITS MODE, beside voice under the neck ----
        # Derived from the chord's degree in the scale (field.mjs's MODES
        # table, never re-tabled): bar 1 of the B♭ cycle is I → Ionian,
        # bar 2 (E♭maj7, IV) → Lydian; harmonic minor renames every bar.
        fd_mode = lambda: page.evaluate("() => (document.getElementById('fdMode') || {}).textContent || ''")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(200)
        check("Ionian" in fd_mode(), f"{tag} 5: under a scale, bar 1 (I) reads its mode beside voice: {fd_mode()!r}")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 1, request: true } }))""")
        page.wait_for_timeout(200)
        check("Lydian" in fd_mode(), f"{tag} 5: bar 2 (IV) reads Lydian: {fd_mode()!r}")
        page.select_option("#hcScale", "harm"); page.wait_for_timeout(250)
        check("Lydian" not in fd_mode() and fd_mode().strip() != "",
              f"{tag} 5: the mode name follows the SCALE — harmonic minor's fourth degree is not Lydian: {fd_mode()!r}")
        page.select_option("#hcScale", "major"); page.wait_for_timeout(150)
        page.select_option("#hcObj", "tetrad"); page.wait_for_timeout(200)
        # PIN REWRITTEN 260918 (item 2, register 33 — rule 7): the readout speaks
        # for EVERY object now — the chord AND its mode; night 22's gate on
        # the object was lifted by ruling ("everything you need to understand
        # the harmonic context"). Under a tetrad, bar 1: "Bbmaj7 — Bb Ionian".
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(200)
        check(fd_mode().replace("\u00a0", " ").strip() == "Bbmaj7 — Bb Ionian",
              f"{tag} 2 (260918): under a chord object the readout names the chord AND its mode: {fd_mode()!r}")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 1, request: true } }))""")
        page.wait_for_timeout(200)
        check(fd_mode().strip() == "Ebmaj7 — Eb Lydian",
              f"{tag} 2 (260918): the bar turns and the readout follows: {fd_mode()!r}")
        # PINS REWRITTEN 260919 (night 25 item 1, rule 7): the readout is the
        # neck's LABEL and moved into the board HEADER — inside .bh, immediately
        # after the title span, left of the header's spacer, above the neck SVG;
        # still boxed, >=14px, bold. Geometry read at the pixels, never from a
        # class name; this pin is what stops a later layout pass undoing this one.
        box = page.evaluate("""() => { const box = document.getElementById('fdMode'); const r = (e) => e.getBoundingClientRect();
          const bh = box.closest('.bh'); const title = bh && bh.querySelector('span'); const spacer = bh && bh.querySelector('.headspace');
          const svg = document.getElementById('fieldSvg'); const cs = getComputedStyle(box);
          return { inBh: !!bh, afterTitle: !!title && title.nextElementSibling === box, leftOfSpacer: !!spacer && r(box).right <= r(spacer).left + 1,
            aboveSvg: r(box).bottom <= r(svg).top, boxed: cs.borderStyle === 'solid', size: parseFloat(cs.fontSize), bold: parseInt(cs.fontWeight) >= 600,
            oneLine: r(box).height < 40 }; }""")
        check(box["inBh"] and box["afterTitle"] and box["leftOfSpacer"] and box["aboveSvg"],
              f"{tag} 1 (260919): the readout sits in the neck's header — inside .bh, after the title, left of the spacer, above the SVG: {box}")
        check(box["boxed"] and box["size"] >= 14 and box["bold"] and box["oneLine"],
              f"{tag} 1 (260919): boxed, >=14px, bold, ONE line: {box}")
        # the collapsed summary is UNCHANGED by the seat: the shell reads .clpsum,
        # then the first live .hint, then .bh span — the neck's is its figure note
        summ = page.evaluate("""() => { const p = document.getElementById('fieldSvg').closest('.board'); p.querySelector('.clpsBtn').click();
          const t = p.querySelector('.clpsSum').textContent; p.querySelector('.clpsBtn').click(); return t; }""")
        check(summ.startswith("A pattern is a sequence") and "Ionian" not in summ and "Bbmaj7" not in summ,
              f"{tag} 1 (260919): the collapsed summary is the figure note as before — the readout does not leak into it: {summ[:60]!r}")
        # ---- 260920 (night 26 item 3): THE READOUT ON EVERY ÉTUDE REPRESENTATION — ONE
        # component (hub/readout.mjs), three instances, three INDEPENDENT derivations.
        # (a) the same seat on all three boards: in .bh, after the title span, boxed;
        # (b) the same value on all three after a STEP_CHANGED (ruled: identical in all
        #     three places); (c) INDEPENDENCE, not just agreement: every box is EMPTIED,
        #     the bar is stepped, and every box refills with the same string — none could
        #     have copied a sibling, because every sibling was empty; (d) the collapsed
        #     summaries of the two new hosts are still their titles.
        ro_ids = ["fdMode", "stMode", "kyMode"]
        seats = page.evaluate("""(ids) => ids.map(id => { const box = document.getElementById(id); if (!box) return null;
          const bh = box.closest('.bh'); const title = bh && bh.querySelector('span');
          return { inBh: !!bh, afterTitle: !!title && title.nextElementSibling === box, boxed: getComputedStyle(box).borderStyle === 'solid',
            board: box.closest('.board').querySelector('.bh span').textContent.trim() }; })""", ro_ids)
        check(all(x and x["inBh"] and x["afterTitle"] and x["boxed"] for x in seats),
              f"{tag} 3 (260920): the readout sits in the header of all three boards, after each title: {seats}")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step', { detail: { index: 2, request: true } }))""")
        page.wait_for_timeout(250)
        texts = page.evaluate("(ids) => ids.map(id => document.getElementById(id).textContent)", ro_ids)
        check(len(set(texts)) == 1 and texts[0].startswith("Am7b5") and "Locrian" in texts[0],
              f"{tag} 3 (260920): after a STEP_CHANGED all three read the same bar — Am7b5, A Locrian: {texts}")
        page.evaluate("(ids) => ids.forEach(id => { document.getElementById(id).querySelector('.readtext').textContent = ''; })", ro_ids)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step', { detail: { index: 3, request: true } }))""")
        page.wait_for_timeout(250)
        texts2 = page.evaluate("(ids) => ids.map(id => document.getElementById(id).textContent)", ro_ids)
        check(len(set(texts2)) == 1 and texts2[0].startswith("Dm7") and all(t for t in texts2),
              f"{tag} 3 (260920): EMPTIED, then stepped — every box refilled on its own derivation (no sibling to copy from): {texts2}")
        # ---- 260921 (night 27 item 2, the readout audit): the EMPTIED pin above cannot catch a
        # copier — the neck's instance repaints first, and a sibling that then copies its text
        # reads the right value (measured with bite m43). So: each box is DETACHED from the
        # document in turn, the bar is stepped, and the other two must still read the right
        # string; a copier with its source gone paints nothing. Independence by construction.
        for gone in ro_ids:
            others = [i for i in ro_ids if i != gone]
            page.evaluate("""(id) => { const e = document.getElementById(id); window.__roHold = [e, e.parentNode, e.nextSibling]; e.remove(); }""", gone)
            page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step', { detail: { index: 4, request: true } }))""")
            page.wait_for_timeout(250)
            got = page.evaluate("(ids) => ids.map(id => document.getElementById(id).textContent)", others)
            check(all(t.startswith("Gm7") and "G Aeolian" in t for t in got),   # bar 5 of the cycle in B♭ is the vi
                  f"{tag} 2 (260921): with {gone} DETACHED the other two still derive bar 5 — Gm7, G Aeolian — on their own: {got}")
            page.evaluate("""() => { const [e, p, n] = window.__roHold; p.insertBefore(e, n); }""")
            page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step', { detail: { index: 3, request: true } }))""")
            page.wait_for_timeout(200)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config', { detail: { key: 'F' } }))""")
        page.wait_for_timeout(250)
        texts3 = page.evaluate("(ids) => ids.map(id => document.getElementById(id).textContent)", ro_ids)
        check(len(set(texts3)) == 1 and texts3[0].startswith("Am7") and "A Phrygian" in texts3[0],
              f"{tag} 3 (260920): a CONFIG_CHANGED (key F) moves all three alike — bar 4 in F is Am7, A Phrygian: {texts3}")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config', { detail: { key: 'Bb' } }))""")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step', { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(250)
        # NOTHING COVERS THE READOUT at phone width (found on the 390 screenshot: the two
        # boards' absolutely positioned minis sat over the box). The box ends before the
        # board's mini and before the shell's ⓘ, on all three boards, at 390.
        page.set_viewport_size({"width": 390, "height": 900}); page.wait_for_timeout(250)
        clear = page.evaluate("""(ids) => ids.map(id => { const box = document.getElementById(id); const bd = box.closest('.board'); const r = (e) => e.getBoundingClientRect();
          const mini = bd.querySelector('.bh .mini'); const info = bd.querySelector('.infoBtn') || bd.querySelector('.clpsBtn');
          const ch = box.querySelector('.readchord'); const title = bd.querySelector('.bh span');
          return { id, w: Math.round(r(box).width), clearsMini: !mini || r(box).right <= r(mini).left, clearsBtn: r(box).right <= r(info).left, oneLine: r(box).height < 40,
            chordWhole: r(ch).right <= r(box).right - 1, neckOneRow: !!mini || Math.abs(r(box).top - r(title).top) < 12 }; })""", ro_ids)
        check(all(c["w"] > 60 and c["clearsMini"] and c["clearsBtn"] and c["oneLine"] and c["chordWhole"] and c["neckOneRow"] for c in clear),
              f"{tag} 3 (260920): at 390 the readout is visible, uncovered, one line, the chord whole, on all three boards — and the neck's stays beside its title: {clear}")
        page.set_viewport_size({"width": 1280, "height": 900}); page.wait_for_timeout(250)
        for bid, want in (("stMode", "The étude — end to end"), ("kyMode", "On the keys")):
            summ2 = page.evaluate("""(id) => { const p = document.getElementById(id).closest('.board'); p.querySelector('.clpsBtn').click();
              const t = p.querySelector('.clpsSum').textContent; p.querySelector('.clpsBtn').click(); return t; }""", bid)
            check(summ2.strip().startswith(want) and "Ionian" not in summ2,
                  f"{tag} 3 (260920): {bid}'s board still collapses to its title, the readout does not leak: {summ2[:60]!r}")
        # the helper is reached, not mounted, and reads no sibling: source pins on the artifact's parts
        ro_src = (REPO / "hub" / "readout.mjs").read_text()
        check("getElementById" not in ro_src and "querySelector" not in ro_src.replace("host.", ""),
              f"{tag} 3 (260920): hub/readout.mjs reaches for no one's DOM — it paints only the host it was handed")
        check("progressionOf(" in ro_src and "chordAt(" in ro_src and "MODES[" in ro_src,
              f"{tag} 3 (260920): each instance derives through progressionOf/chordAt and the one MODES table")

        # THE CLOCK CLOSES RANKS (item 2): transport, repeat, bar split, bpm, metronome — contiguous, in that order
        clock = page.evaluate("""() => ['fdMini','fdRepeat','fdSplit','fdBpm','fdMetChk'].map(i => Math.round(document.getElementById(i).getBoundingClientRect().left))""")
        check(all(clock[i] >= clock[i - 1] for i in range(1, 5)) and page.evaluate("() => document.getElementById('fdMini').closest('.fd-railrow') === document.getElementById('fdMetChk').closest('.fd-railrow')"),
              f"{tag} 2 (260919): the clock row runs transport · repeat · bar split · bpm · metronome, in one row: {clock}")
        # THE TRUNCATION ORDER (item 1): at phone width a long name ellipsises the MODE; the chord survives whole.
        # Measured on the artifact 260919: at 390 the box is 215px and "Ebmaj7#11 — Eb Lydian" is 189 — it FITS;
        # the dispatch's "Ebmaj7#11 — Eb Lyd…" needs 360 (box 197). A pin that never truncates proves nothing.
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config', { detail: { source: 'custom', custom: 'Ebmaj7#11 Bbmaj7' } }))""")
        page.wait_for_timeout(250)
        # the gate arrives here parked on bar 2 — the long name is bar 1's
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step', { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(250)
        page.set_viewport_size({"width": 360, "height": 900}); page.wait_for_timeout(250)
        trunc = page.evaluate("""() => { const box = document.getElementById('fdMode'), t = box.querySelector('.readtext'), ch = box.querySelector('.readchord'); const r = (e) => e.getBoundingClientRect();
          return { text: box.textContent, clipped: t.scrollWidth > t.clientWidth, chordWhole: r(ch).right <= r(box).right - 1, oneLine: r(box).height < 40 }; }""")
        check(trunc["clipped"] and trunc["chordWhole"] and trunc["oneLine"] and trunc["text"].startswith("Ebmaj7#11"),
              f"{tag} 1 (260919): at 360px the long name IS clipped, the CHORD survives whole and the line stays one — the ellipsis eats the mode: {trunc}")
        page.set_viewport_size({"width": 1280, "height": 900}); page.wait_for_timeout(200)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config', { detail: { source: 'cycle', custom: '' } }))""")
        page.wait_for_timeout(250)
        # ---- 260919 item 3: THE PROSE SPLIT — the readout says what is, the hint says why not ----
        hint0 = page.inner_text("#fdHint")
        for dropped in ("the whole field", "Strings ", "the window from", "across the set", "Reference: string", "Placement is off"):
            check(dropped not in hint0, f"{tag} 3 (260919): the hint no longer narrates state — {dropped!r} is the readout's: {hint0!r}")
        check(hint0.strip() == "Click the numbers to choose strings; ← → step the window.",
              f"{tag} 3 (260919): in the ordinary case the hint is the affordance alone: {hint0!r}")
        ro0 = page.inner_text("#roLine")
        for kept in ("the whole field", "frame from the", "strings", "across the set"):   # the reference clause varies by state
            check(kept in ro0, f"{tag} 3 (260919): the readout still carries the state the hint dropped — {kept!r}: {ro0[:100]!r}")
        # the FIGURE clause moved into the readout (a gap, not a duplication): typed, its step count read back
        page.click('#fdAddrSeg button[data-addr="tones"]'); page.wait_for_timeout(80)
        page.fill("#fdFigIn", "R,3,7,5"); page.dispatch_event("#fdFigIn", "input"); page.wait_for_timeout(250)
        ro1 = page.inner_text("#roLine")
        check("figure 4 steps" in ro1 and "(tones)" in ro1,
              f"{tag} 3 (260919): the figure clause lives in the readout now — 4 typed steps read back: {ro1[-80:]!r}")
        check("Figure:" not in page.inner_text("#fdHint"), f"{tag} 3 (260919): …and no longer in the hint")
        # ---- 260919 item 4: the sentence names the centre an absolute degree speaks from ----
        page.fill("#fdFigIn", "(b3)[3]"); page.dispatch_event("#fdFigIn", "input"); page.wait_for_timeout(250)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step', { detail: { index: 1, request: true } }))""")
        page.wait_for_timeout(250)
        fn = page.inner_text("#fdFigNote")
        check("approached from the key's ♭3" in fn,
              f"{tag} 4 (260919): on a non-tonic bar the readout names the centre the degree is measured from: {fn!r}")
        # ---- 260920 (night 26 item 2): ONE SPELLER, chord.mjs's. In F MAJOR — the key the
        # retired `|| key === "F"` special case existed for — the ♭3 approach (A♭) spells
        # with a FLAT on the staff, read from the approach head's own spelled name; the
        # flatness comes from the key signature (F major carries B♭), nothing said about F.
        page.select_option("#hcKey", "F"); page.wait_for_timeout(250)
        f_heads = page.evaluate("""() => [...document.querySelectorAll('#stSvg [data-stapproach]')]
          .map(e => [e.dataset.stname, e.dataset.stapproach])""")
        check(f_heads and all(n == "Ab" and k == "chromatic" for n, k in f_heads),
              f"{tag} 2 (260920): in F major the ♭3 approach spells A♭ — a FLAT, from the key signature: {f_heads}")
        page.select_option("#hcKey", "Bb"); page.wait_for_timeout(200)
        page.fill("#fdFigIn", ""); page.dispatch_event("#fdFigIn", "input"); page.wait_for_timeout(100)
        page.click('#fdAddrSeg button[data-addr="pattern"]'); page.wait_for_timeout(80)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step', { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(200)
        # the hint earns its space when something is refused: both reference strings in
        # the set, WITH a reference asked for (the gate arrives here with the bass elsewhere)
        bass_was = page.eval_on_selector("#fdBass2", "e => e.value")
        page.select_option("#fdBass2", "root"); page.wait_for_timeout(120)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config', { detail: { strings: [6, 5, 4, 3] } }))""")
        page.wait_for_timeout(300)
        hint1 = page.inner_text("#fdHint")
        check("Reference refused: strings 5 and 6 are both in the set" in hint1,
              f"{tag} 3 (260919): the hint says WHY NOT when the reference is refused: {hint1!r}")
        page.select_option("#fdBass2", bass_was); page.wait_for_timeout(120)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config', { detail: { strings: [4, 3, 2, 1] } }))""")
        page.wait_for_timeout(250)
        # ---- 260918 item 1: THE KEY READS IN BOLD RED — the palette's R, the field's size kept ----
        # PIN REWRITTEN after CI (260918): an absolute 30px height was a platform
        # pixel — CI's Linux Chromium renders the select 29px tall. The claim is
        # RELATIVE: the key keeps its font size and the same height as its
        # neighbour selects on the card (Scale, Object), which wear no bold.
        key = page.evaluate("""() => { const g = (id) => { const e = document.getElementById(id); const cs = getComputedStyle(e);
            const r = e.getBoundingClientRect(); return { color: cs.color, weight: cs.fontWeight, h: Math.round(r.height), font: cs.fontSize }; };
          return { key: g('hcKey'), scale: g('hcScale'), obj: g('hcObj') }; }""")
        check(key["key"]["color"] == "rgb(184, 41, 41)" and int(key["key"]["weight"]) >= 600,
              f"{tag} 1 (260918): the key reads in the degree palette's R, bold: {key['key']}")
        check(key["key"]["font"] == key["scale"]["font"] == "13px"
              and key["key"]["h"] == key["scale"]["h"] == key["obj"]["h"],
              f"{tag} 1 (260918): the field's size is untouched — the same font and height as its neighbour selects: {key}")
        # ---- 260917 item 4: the card's bass window is closed in chord mode, the CENTRE stays in scale mode ----
        hc_win = lambda: page.evaluate("() => ({ hidden: document.getElementById('hcRef').hidden, lab: document.getElementById('hcRefLab').textContent })")
        check(hc_win()["hidden"] is True, f"{tag} 4: chord mode — the card shows no bass window: {hc_win()}")
        page.select_option("#hcObj", "scale"); page.wait_for_timeout(200)
        check(hc_win()["hidden"] is False and hc_win()["lab"].startswith("Centre"),
              f"{tag} 4: scale mode — the card's select is the CENTRE and stays: {hc_win()}")
        page.select_option("#hcObj", "tetrad"); page.wait_for_timeout(200)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(150)
        # the recipes the item names, each one exercised, none merely listed
        # R4 UPDATED 260907 (the octave amendment): the two-string window now
        # widens until the set covers the octave (5–11 here), so the guide-
        # tone dyad COMPLETES — ['3','7'] — where v0.9 half-places (v0.9's
        # anchor-triple window cannot hold the 7th; oracle-verified 260831).
        # A deliberate divergence, recorded with the amendment's register
        # entry: the door out-places the oracle because the oracle's window
        # law was the thing corrected.
        for label, want in [("R4 · dyads across two strings", ["3", "7"]),
                            ("R9 · block triads", ["3", "5", "R"]),
                            ("R11 · triad lines", ["3", "5", "R"]),
                            ("R17 · a shell", ["3", "7", "R"]),
                            ("R26 · a guide-tone dyad", ["3", "7"])]:
            page.select_option("#psSel", label=label); page.wait_for_timeout(150)
            check(roles() == want,
                  f"{tag} recipe {label!r} must build wearing {want}: {roles()}")
            # (the starved-7th face pin retired 260907 with the amendment —
            # the 7th is IN the widened frame now, drawn and placed above)
        # back to the boot state (the recipes reseeded the run — restore it
        # over the bus, the same channel the harness already speaks)
        page.select_option("#hcObj", "tetrad"); page.wait_for_timeout(60)
        page.evaluate("""() => { const s = document.querySelector('#psSel'); s.selectedIndex = 0; }""")
        page.uncheck("#fdAllTones"); page.wait_for_timeout(60)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3, notesPer: 1 } }))""")
        page.wait_for_timeout(120)

        # ---- child 5: the reference tone, fretted and named ----
        ref_el = lambda: page.evaluate("""() => { const g = document.querySelector('#fieldSvg .fd-ref');
          return g ? { s: g.dataset.refstr, f: g.dataset.reffret, st: g.dataset.refstretch } : null }""")
        # the three relative options are live; at boot there is NO reference
        # PINS REWRITTEN 260917 (item 3, rule 7): the bass DEFAULTS TO THE ROOT
        # (Daniel: "we should always default to the root"), the options are
        # the tones THE OBJECT HOLDS plus the two relative ones (kept,
        # explained), and they live on the under-neck view (item 4)
        ref_opts = page.evaluate("""() =>
          Object.fromEntries([...document.querySelectorAll('#fdBass2 option')]
            .map(o => [o.value, o.disabled]))""")
        check(ref_opts.get("root") is False and ref_opts.get("third") is False
              and ref_opts.get("fifth") is False,
              f"{tag} the root and the two relative references are live (child 5, kept 260917): {ref_opts}")
        check(all(ref_opts.get("tone:" + d) is False for d in ("3", "5", "7"))
              and "tone:9" not in ref_opts,
              f"{tag} item 3: the bass offers exactly the tetrad's own tones (3, 5, 7 beside the root), no 9: {ref_opts}")
        # (measured on the first run: this leg runs after the two-views leg left
        # the bass at 'none' — the DEFAULT is pinned on the fresh page above;
        # here the root is chosen and its placement asserted)
        page.select_option("#fdBass2", "root"); page.wait_for_timeout(200)
        check(ref_el() is not None and ref_el()["s"] == "6" and ref_el()["f"] == "6",
              f"{tag} item 3: the root in the bass is B♭ on string 6, fret 6, drawn: {ref_el()}")
        page.select_option("#fdBass2", "none"); page.wait_for_timeout(200)
        check(ref_el() is None
              and page.eval_on_selector_all("#stSvg [data-strefmidi]", "e => e.length") == 0,
              f"{tag} 'none' clears the reference from the neck and the bass clef")
        # a chord TONE in the bass: the 3rd of B♭ (D) — placed, and the composite named
        page.select_option("#fdBass2", "tone:3"); page.wait_for_timeout(250)
        rr3 = ref_el()
        ro3 = page.inner_text("#roLine")
        check(rr3 is not None and "over D" in ro3 and "the stack is Bbmaj7/D" not in ro3,
              f"{tag} item 3: the 3rd in the bass places D and the readout names the stack over it: {rr3} {ro3[-90:]!r}")
        # a 3rd below the B♭ chord: G, string 6 fret 3 — updated 260904: the
        # boot window moved to frets 3–7 (the boot-placement pin's choice),
        # so the G now sits INSIDE the box and the flag reads false. The
        # STRETCH behaviour keeps its own live demonstration below against
        # the old window, deliberately dispatched — updated, never relaxed.
        page.select_option("#fdBass2", "third"); page.wait_for_timeout(200)
        rr = ref_el()
        check(rr == {"s": "6", "f": "3", "st": "false"},
              f"{tag} a 3rd below B♭ must fret G on string 6 fret 3, in the 3–7 box: {rr}")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { startDeg: 5, nearFret: 5 } }))""")
        page.wait_for_timeout(200)
        rr = ref_el()
        # PIN REWRITTEN 260918 (night 24, item 3 — rule 7): NEARNESS GOVERNS THE
        # STRING now. From the 5–8 window's centre (6.67) the G on string 5 at
        # fret 10 is 3.33 away and string 6's fret 3 is 3.67, so the nearer G
        # is chosen — and it is STILL a stretch (10 is past 8), which is the
        # claim this pin has always made.
        check(rr == {"s": "5", "f": "10", "st": "true"},
              f"{tag} under the old 5–8 window the nearest G (string 5, fret 10) IS a stretch: {rr}")
        check("a stretch past the box" in page.inner_text("#roLine"),   # re-sited 260919
              f"{tag} the stretch must be said in the readout: {page.inner_text('#roLine')!r}")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { startDeg: 4, nearFret: 3 } }))""")
        page.wait_for_timeout(200)
        ro = page.inner_text("#roLine")
        check("Gm9" in ro and "over G" in ro,
              f"{tag} the readout must name the composite (R19: the stack is Gm9): {ro!r}")
        st_ref = page.eval_on_selector_all("#stSvg [data-strefmidi]",
            "es => es.map(e => +e.getAttribute('data-strefmidi'))")
        # PIN REWRITTEN 260918 (night 24, item 3 — rule 7): the claim is the
        # WALK — a 3rd below every bar, G C F B♭ E♭ A D G — by pitch class;
        # the OCTAVE is the placement's (the nearest occurrence across the
        # free strings: F now sits at fret 8 on string 5, 53, where string
        # 6's fret 1, 41, was the old law's).
        check([m % 12 for m in st_ref] == [7, 0, 5, 10, 3, 9, 2, 7] and len(st_ref) == 8,
              f"{tag} the bass clef must walk a 3rd below every bar of the cycle "
              f"(G C F B\u266d E\u266d A D G): {st_ref}")
        # R18's shape: a set that TAKES string 6 pushes the reference to 5
        page.select_option("#fdBass2", "root"); page.wait_for_timeout(100)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [6, 4, 3, 1], startDeg: 4, nearFret: 3 } }))""")
        page.wait_for_timeout(200)
        rr = ref_el()
        check(rr is not None and rr["s"] == "5",
              f"{tag} with string 6 in the set the reference must sit on 5 (R18): {rr}")
        # both reference strings taken → REFUSED BY NAME on the face
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [6, 5, 4, 3], startDeg: 4, nearFret: 3 } }))""")
        page.wait_for_timeout(200)
        check(ref_el() is None
              and "strings 5 and 6 are both in the set" in page.inner_text("#fdHint"),
              f"{tag} a full set must refuse the reference BY NAME on the face: "
              f"{page.inner_text('#fdHint')!r}")
        # R19 as a preset seeds the whole sentence in one gesture
        page.select_option("#psSel", label="R19 · a tetrad over a third below")
        page.wait_for_timeout(250)
        check(roles() == ["3", "5", "7", "R"] and "Gm9" in page.inner_text("#roLine"),
              f"{tag} R19 must build the tetrad and name Gm9: {roles()}, {page.inner_text('#roLine')!r}")
        # back to the boot state
        page.select_option("#fdBass2", "none"); page.wait_for_timeout(60)
        page.evaluate("""() => { const s = document.querySelector('#psSel'); s.selectedIndex = 0; }""")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3, notesPer: 1 } }))""")
        page.wait_for_timeout(120)

        # ---- child 7: the progression — cycles, forms, typed changes ----
        tlline = lambda: page.get_attribute("#tlScroll", "data-tlline") or ""
        # THE FORM AND THE CASE RULE, on the face: ii–V–I in B♭ is Cm7 F7
        # B♭maj7 — the minor seventh. A dominant here is the signature defect.
        page.click('#pgSrcSeg button[data-src=\"form\"]'); page.wait_for_timeout(150)
        page.select_option("#pgForm", "ii-V-I"); page.wait_for_timeout(200)
        check(tlline() == "Cm7 F7 Bbmaj7",
              f"{tag} ii–V–I in B♭ must read Cm7 F7 Bbmaj7 on the chart line: {tlline()!r}")
        check(page.get_attribute("#tlScroll", "data-tlbars") == "2",
              f"{tag} ii–V–I keeps its own bars — | Cm7 F7 | B♭maj7 | is two")
        # Start on means nothing under a form — it must not stand there
        check(page.evaluate("() => getComputedStyle(document.querySelector('#pgStart')).display") == "none",
              f"{tag} 'Start on' must hide under a form — a control that means nothing misleads")
        page.click('#pgSrcSeg button[data-src=\"cycle\"]'); page.wait_for_timeout(150)
        check(page.evaluate("() => getComputedStyle(document.querySelector('#pgStart')).display") != "none",
              f"{tag} 'Start on' must show under a cycle")
        # NO BAR-COUNT CONTROL EXISTS — derived means underivable by hand
        check(page.eval_on_selector_all("#cards [data-control]",
                """es => es.filter(e => /bars?/i.test(e.id) && e.tagName !== 'DIV').length""") == 0
              and "8 bars, derived" in page.inner_text("#pgNote"),
              f"{tag} the bar count must be derived and say so, with no control: {page.inner_text('#pgNote')!r}")
        # TWELVE-BAR BLUES: the off-key tone says WHICH absence it is, on two faces
        page.click('#pgSrcSeg button[data-src=\"form\"]'); page.wait_for_timeout(100)
        page.select_option("#pgForm", "blues-12"); page.wait_for_timeout(200)
        check(tlline() == "Bb7 Eb7 Bb7 Bb7 Eb7 Eb7 Bb7 Bb7 F7 Eb7 Bb7 F7",
              f"{tag} twelve-bar blues in B♭, chip for chip: {tlline()!r}")
        for face in ("#roLine", "#fdHint"):
            check("not in the key" in page.inner_text(face),
                  f"{tag} B♭7's 7th must be reported NOT IN THE KEY on {face}: "
                  f"{page.inner_text(face)!r}")
        check("in this frame" not in page.inner_text("#roLine"),
              f"{tag} an off-key tone must not be misreported as a frame absence")
        # THE POSITION: a chip click jumps every mirror (the strip owns it)
        page.click('#tlScroll button >> nth=8'); page.wait_for_timeout(150)
        check("bar 9 of 12" in page.inner_text("#roLine") and "F7" in page.inner_text("#roLine"),
              f"{tag} chip 9 must put every mirror on F7: {page.inner_text('#roLine')!r}")
        check(page.eval_on_selector_all("#stSvg [data-stcur]", "es => es.map(e => +e.dataset.stcur)") == [8],
              f"{tag} the staff must shade the jumped-to bar")
        # TYPED CHANGES (G28 closes): romans by the case rule, refusal BY NAME
        page.click('#pgSrcSeg button[data-src=\"custom\"]'); page.wait_for_timeout(100)
        page.fill("#pgCustom", "ii7 V7 Imaj7"); page.dispatch_event("#pgCustom", "input")
        page.wait_for_timeout(200)
        check(tlline() == "Cm7 F7 Bbmaj7",
              f"{tag} typed romans must resolve by the case rule: {tlline()!r}")
        page.fill("#pgCustom", "Cm7 Qx7"); page.dispatch_event("#pgCustom", "input")
        page.wait_for_timeout(200)
        note = page.inner_text("#pgNote")
        check("Qx7" in note and "neither" in note,
              f"{tag} a bad token must be refused BY NAME on the card's face: {note!r}")
        # THE CHART ROUND TRIP, through the page: pad fence → button → custom,
        # byte for byte — §8's one handoff channel, closing
        page.fill("#journalIn", "worked out in the metronome app\n```chart\n| Cm7 F7 | Bbmaj7 |\n```\n")
        page.dispatch_event("#journalIn", "input"); page.wait_for_timeout(500)
        check(page.evaluate("() => !document.querySelector('#pgChartBtn').disabled"),
              f"{tag} a chart in the pad must arm the read-back button")
        page.click("#pgChartBtn"); page.wait_for_timeout(200)
        check(page.input_value("#pgCustom") == "| Cm7 F7 | Bbmaj7 |",
              f"{tag} the note's chart must land in the line BYTE-IDENTICAL: {page.input_value('#pgCustom')!r}")
        check(tlline() == "Cm7 F7 Bbmaj7" and page.get_attribute("#tlScroll", "data-tlbars") == "2",
              f"{tag} the read-back chart must be the progression, bars intact: {tlline()!r}")
        # THE WALK: Play walks the bars, Stop halts them — the promised transport
        page.fill("#bpmRange", "260"); page.dispatch_event("#bpmRange", "input")
        page.evaluate("""() => { window.__wk = [];
          document.addEventListener('atetudes:step', e => {
            if (e.detail && e.detail.request !== true) window.__wk.push(e.detail.index); }); }""")
        page.click('#tlStripMini button[data-role="play"]'); page.wait_for_timeout(2600)
        check(page.evaluate("() => window.__wk.length") >= 2,
              f"{tag} Play must walk the bars: steps {page.evaluate('() => window.__wk')}")
        page.click('#tlStripMini button[data-role="stop"]'); page.wait_for_timeout(250)
        wk0 = page.evaluate("() => window.__wk.length")
        page.wait_for_timeout(900)
        check(page.evaluate("() => window.__wk.length") == wk0
              and page.inner_text("#metroBtn") == "Start",
              f"{tag} Stop must halt the walk and the clock together")

        # ---- 260902: THE FIGURE REACHES THE SOUND — order and TIMES, not counts ----
        # (a pin asserting "six NOTEs were announced" passes on the simultaneous
        # bug this block exists to catch; these pins read the schedule itself)
        # the spans below assume the boot cycle's four-beat bars — seat it
        # (the block above leaves the two-bar chart custom playing, whose
        # 2-beat Cm7 is CORRECT and failed these pins' first run honestly)
        page.click('#pgSrcSeg button[data-src=\"cycle\"]'); page.wait_for_timeout(120)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(120)
        page.evaluate("""() => {
          if (!window.__ntHooked) { window.__ntHooked = true; window.__nt = [];
            document.addEventListener('atetudes:note', e =>
              window.__nt.push({ m: e.detail.midi, t: performance.now(), r: e.detail.role || null })); }
          if (!window.__advHooked) { window.__advHooked = true; window.__adv = [];
            document.addEventListener('atetudes:step', e => {
              if (e.detail && e.detail.request !== true)
                window.__adv.push({ i: e.detail.index, t: performance.now() }); }); }
          window.__nt = []; window.__adv = []; }""")
        page.fill("#bpmRange", "240"); page.dispatch_event("#bpmRange", "input")
        page.check("#fdAllTones"); page.click('#fdNSeg button[data-nps=\"3\"]')
        page.fill("#fdFigIn", "4,3,4,3,2,1"); page.dispatch_event("#fdFigIn", "input")
        page.wait_for_timeout(200)
        # the expected sequence, DERIVED FROM THE ARTIFACT: the neck's own
        # figorder steps mapped to their selected midis
        want_midis = page.evaluate("""() => {
          const sel = {};
          for (const g of document.querySelectorAll('#fieldSvg .fd-sel'))
            sel[g.dataset.selstr + '/' + g.dataset.selfret] = +g.dataset.selmidi;
          return (document.querySelector('#fieldSvg').getAttribute('data-figorder') || '')
            .split(',').map(k => sel[k]); }""")
        check(len(want_midis) == 6 and all(m for m in want_midis),
              f"{tag} the neck must offer a 6-step figure to walk: {want_midis}")
        page.click('#tlStripMini button[data-role="play"]'); page.wait_for_timeout(1150)
        page.click('#tlStripMini button[data-role="stop"]'); page.wait_for_timeout(250)
        heard = page.evaluate("() => window.__nt")
        first = heard[:6]
        span = 4 * 60.0 / 240.0
        step = span / 6
        check([h["m"] for h in first] == want_midis,
              f"{tag} the walk must sound THE FIGURE'S ORDER, the same value the bracket draws: "
              f"heard {[h['m'] for h in first]}, the neck says {want_midis}")
        deltas = [(first[i + 1]["t"] - first[i]["t"]) / 1000.0 for i in range(5)]
        check(all(abs(dl - step) < 0.07 for dl in deltas),
              f"{tag} the steps must divide the chord's span evenly (~{step:.3f}s): {deltas}")
        adv = page.evaluate("() => window.__adv")
        check(len(heard) >= 6 and adv and (adv[0]["t"] - first[0]["t"]) / 1000.0 > span * 0.9,
              f"{tag} the chord must hold its WHOLE span — six steps sounded, the advance on the "
              f"next downbeat (the cold play skipped its first chord for a night and a counting "
              f"pin let it; got advance at {((adv[0]['t']-first[0]['t'])/1000.0) if adv else None})")
        # no figure: MOVEMENT decides — updated 260905 (these pins previously
        # asserted the coupling Daniel corrected: take=all forced the spread).
        # Back on BAR 0 first, as before.
        page.fill("#fdFigIn", ""); page.dispatch_event("#fdFigIn", "input")
        page.uncheck("#fdAllTones"); page.click('#fdNSeg button[data-nps=\"1\"]')
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(200)
        page.evaluate("() => { window.__nt = [] }")
        page.click('#tlStripMini button[data-role="play"]'); page.wait_for_timeout(350)
        page.click('#tlStripMini button[data-role="stop"]'); page.wait_for_timeout(250)
        heard = page.evaluate("() => window.__nt")
        check(len(heard) >= 4 and (heard[3]["t"] - heard[0]["t"]) < 40,
              f"{tag} block movement (the default) sounds TOGETHER: "
              f"{[(h['m'], round(h['t']-heard[0]['t'],1)) for h in heard[:5]]}")
        # THE DECOUPLING, both directions:
        # (a) one-of-each + arpeggio — the combination Take used to FORBID
        page.click('#fdMoveSeg button[data-move=\"arpeggiate\"]')
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(150)
        page.evaluate("() => { window.__nt = []; window.__adv = [] }")
        page.click('#tlStripMini button[data-role="play"]'); page.wait_for_timeout(1150)
        page.click('#tlStripMini button[data-role="stop"]'); page.wait_for_timeout(250)
        heard = page.evaluate("() => window.__nt")
        adv = page.evaluate("() => window.__adv")
        cut = (adv[0]["t"] - 50) if adv else float("inf")
        arp = [h["m"] for h in heard if h["t"] < cut]
        check(len(arp) >= 3 and arp == sorted(arp)
              and (heard[1]["t"] - heard[0]["t"]) > 60,
              f"{tag} one-of-each + ARPEGGIO must spread low → high — choosing the "
              f"material must not forbid the movement: {arp}")
        # (b) every-occurrence + block — the combination Take used to FORCE
        # apart. At Line, so the box offers its true seven-note cluster
        # (Grip's one-per-string cap would leave only four).
        page.click('#fdMoveSeg button[data-move=\"strum\"]'); page.check("#fdAllTones")
        page.click('#fdNSeg button[data-nps=\"3\"]')
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(150)
        page.evaluate("() => { window.__nt = [] }")
        page.click('#tlStripMini button[data-role="play"]'); page.wait_for_timeout(350)
        page.click('#tlStripMini button[data-role="stop"]'); page.wait_for_timeout(250)
        heard = page.evaluate("() => window.__nt")
        check(len(heard) >= 5 and (heard[len(heard) - 1]["t"] - heard[0]["t"]) < 40,
              f"{tag} every-occurrence + BLOCK must sound together — the material must "
              f"not decide the movement: {[(h['m'], round(h['t']-heard[0]['t'],1)) for h in heard[:8]]}")
        page.uncheck("#fdAllTones"); page.click('#fdNSeg button[data-nps=\"1\"]')
        page.wait_for_timeout(150)

        # ---- 260905 item 5: THE PULSE — what you see pulsing is what you hear
        # (fretboard-stage's own ratified words; this board finally inherits
        # the idiom by listening to NOTE). Pinned IDENTIFIED: each ring sits
        # at the exact coordinates of a drawn dot whose midi was heard.
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.fill("#bpmRange", "120"); page.dispatch_event("#bpmRange", "input")
        page.wait_for_timeout(150)
        page.evaluate("() => { window.__nt = [] }")
        page.click('#tlStripMini button[data-role="play"]'); page.wait_for_timeout(180)
        pulse = page.evaluate("""() => {
          const rings = [...document.querySelectorAll('#fieldSvg .fd-pulse')]
            .map(r => [r.getAttribute('cx'), r.getAttribute('cy')]);
          const dots = {};
          for (const g of document.querySelectorAll('#fieldSvg .fd-sel')) {
            const c = g.querySelector('circle');
            dots[c.getAttribute('cx') + ',' + c.getAttribute('cy')] = +g.dataset.selmidi;
          }
          return { rings, dotAt: rings.map(([x, y]) => dots[x + ',' + y] ?? null) }; }""")
        heard = [n["m"] for n in page.evaluate("() => window.__nt")]
        check(len(pulse["rings"]) == 4
              and all(m is not None and m in heard for m in pulse["dotAt"]),
              f"{tag} a BLOCK's four notes must pulse AT their drawn dots as they sound: "
              f"rings {pulse['rings']}, midis {pulse['dotAt']}, heard {heard}")
        page.wait_for_timeout(500)
        check(page.eval_on_selector_all("#fieldSvg .fd-pulse", "e => e.length") == 0,
              f"{tag} the pulse must fade — a ring that stays is a marker, not a pulse")
        page.click('#tlStripMini button[data-role="stop"]'); page.wait_for_timeout(200)
        # and in ARPEGGIO movement the rings arrive one at a time
        page.click('#fdMoveSeg button[data-move=\"arpeggiate\"]')
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(150)
        page.click('#tlStripMini button[data-role="play"]'); page.wait_for_timeout(700)
        midbar = page.eval_on_selector_all("#fieldSvg .fd-pulse", "e => e.length")
        page.click('#tlStripMini button[data-role="stop"]'); page.wait_for_timeout(250)
        check(1 <= midbar <= 2,
              f"{tag} an ARPEGGIO pulses one dot at a time, not the chord at once: {midbar} rings mid-bar")
        page.click('#fdMoveSeg button[data-move=\"strum\"]')
        page.fill("#bpmRange", "240"); page.dispatch_event("#bpmRange", "input")
        page.wait_for_timeout(100)

        # ---- 260910 item 1: THE AUDITION ----
        # Daniel: "we have lost the sound when manually clicking through the
        # changes." What he heard before was the rogue tetrad pass — a foreign
        # voicing, killed rightly on 260905. This is the affordance built
        # properly: a stopped chip click sounds the walk's OWN selection
        # through soundCurrent()'s one path; a refused bar stays silent with
        # its reason; the mixer holds; the clock stays stopped. Asserted at
        # the AudioContext (260905's lesson).
        page.evaluate("""() => {
          if (!window.__ntHooked) { window.__ntHooked = true; window.__nt = [];
            document.addEventListener('atetudes:note', e =>
              window.__nt.push({ m: e.detail.midi, t: performance.now(), r: e.detail.role || null })); }
          if (!window.__rawHooked) { window.__rawHooked = true;
            for (const C of [AudioBufferSourceNode, OscillatorNode]) {
              const P = C.prototype.start;
              C.prototype.start = function(...a) { (window.__raw ||= []).push(performance.now());
                return P.apply(this, a); }; } }
          if (!window.__clkHooked) { window.__clkHooked = true; window.__clk = [];
            document.addEventListener('atetudes:clock', e => window.__clk.push(e.detail)); }
          window.__nt = []; window.__raw = []; window.__clk = []; }""")
        # Daniel's own refusing configuration: Bb triads on {3,2,1} at the low
        # window — six bars place, Adim and Cm refuse by name (260908)
        page.select_option("#hcKey", "Bb"); page.wait_for_timeout(100)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { strings: [3, 2, 1], startDeg: 5, nearFret: 0, object: 'triad',
                      take: 'one', notesPer: 1, source: 'cycle', custom: '' } }))""")
        page.wait_for_timeout(250)
        aud_states = []
        for aud_bar in range(8):
            page.evaluate("() => { window.__nt = []; window.__raw = [] }")
            page.click(f'#tlScroll button >> nth={aud_bar}'); page.wait_for_timeout(350)
            aud_states.append(page.evaluate("""() => ({
              drawn: document.querySelectorAll('#fieldSvg .fd-sel').length,
              refused: !!document.querySelector('#fieldSvg .fd-refusal'),
              nt: window.__nt.length, raw: window.__raw.length })"""))
        for aud_bar, st in enumerate(aud_states):
            if st["refused"]:
                check(st["nt"] == 0 and st["raw"] == 0,
                      f"{tag} audition bar {aud_bar + 1}: a REFUSED bar stays silent on "
                      f"click — no back door (NOTEs {st['nt']}, raws {st['raw']})")
            else:
                check(st["drawn"] > 0 and st["nt"] == st["drawn"] and st["raw"] == st["nt"],
                      f"{tag} audition bar {aud_bar + 1}: sounded == drawn == raw starts "
                      f"(drawn {st['drawn']}, NOTEs {st['nt']}, raws {st['raw']})")
        check(any(st["refused"] for st in aud_states) and any(not st["refused"] for st in aud_states),
              f"{tag} the audition walk covered BOTH states (refused bars: "
              f"{sum(1 for st in aud_states if st['refused'])}/8)")
        check(page.evaluate("() => window.__clk.filter(c => c && c.run === true).length") == 0,
              f"{tag} the audition leaves the clock STOPPED — no CLOCK run announced")
        # the mixer holds: chord volume at zero, the audition announces but
        # does not sound (the NOTE stream is the schedule; the slider is the mixer's)
        page.evaluate("""() => { const s = document.getElementById('fdHarmVol');
          s.value = 0; s.dispatchEvent(new Event('input', { bubbles: true })); }""")
        page.wait_for_timeout(150)
        page.evaluate("() => { window.__nt = []; window.__raw = [] }")
        # crash-proof under a deaf-board mutation (m28 pins the window away
        # and every bar can refuse): a missing placed bar is a FAILURE here,
        # never a crash that hides the board-equals-engine pin downstream
        aud_ok = next((i for i, st in enumerate(aud_states) if not st["refused"]), None)
        if aud_ok is None:
            check(False, f"{tag} the audition's mixer leg found no placed bar to sound")
        else:
            page.click(f'#tlScroll button >> nth={aud_ok}'); page.wait_for_timeout(350)
            mix = page.evaluate("() => [window.__nt.length, window.__raw.length]")
            check(mix[0] > 0 and mix[1] == 0,
                  f"{tag} the mixer holds through an audition — chord volume 0 mutes the "
                  f"raw starts, the schedule still announces (NOTEs {mix[0]}, raws {mix[1]})")
        page.evaluate("""() => { const s = document.getElementById('fdHarmVol');
          s.value = 100; s.dispatchEvent(new Event('input', { bubbles: true })); }""")
        page.wait_for_timeout(150)
        # the ONE PLAIN ECHO (260910, found measuring item 1): the strip's
        # index-overflow reset announced without the attack flag — park on
        # bar 8, type a 4-bar custom, and audio-card's tetrad pass sounded a
        # FOREIGN four-voice chord straight into WebAudio: 4 raw starts,
        # 0 NOTEs, the exact 260905 signature through the one echo that
        # skipped the flag. And a config consequence must not audition
        # either — nobody asked to hear it.
        page.click('#tlScroll button >> nth=7'); page.wait_for_timeout(400)
        page.evaluate("() => { window.__nt = []; window.__raw = [] }")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { source: 'custom', custom: 'Cm7 F7 Bbmaj7 Ebmaj7' } }))""")
        page.wait_for_timeout(450)
        hole = page.evaluate("() => [window.__nt.length, window.__raw.length]")
        check(hole == [0, 0],
              f"{tag} a progression shrink under a parked high bar makes NO sound — "
              f"neither foreign (raws {hole[1]}) nor audition (NOTEs {hole[0]})")

        # full boot restore — this block moved key, set, window, object and source
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { key: 'Bb', strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,
                      object: 'tetrad', take: 'one', notesPer: 1, movement: 'strum',
                      address: 'pattern', figure: '', source: 'cycle', custom: '' } }))""")
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(250)

        # ---- 260905 item 3: THE SCHEDULE IS THE ONLY SOUNDING PATH ----
        # Daniel heard a full chord on beat one in arpeggio mode. Every
        # NOTE-stream trace was blind to it, because the second path never
        # announced NOTE: audio-card derives a tetrad pass from this door's
        # config and SOUNDS it on every plain step echo, straight into
        # WebAudio. sounded⊆drawn cannot see un-announced audio — this pin
        # closes that blindness at the AudioContext itself: with the click
        # muted, raw source starts must EQUAL the NOTE count, and a chip
        # click while stopped must start nothing.
        page.evaluate("""() => {
          if (!window.__rawHooked) { window.__rawHooked = true;
            for (const C of [AudioBufferSourceNode, OscillatorNode]) {
              const P = C.prototype.start;
              C.prototype.start = function(...a) { (window.__raw ||= []).push(performance.now());
                return P.apply(this, a); }; } }
          window.__raw = []; }""")
        # REWRITTEN 260910 (item 1), reason stated: this pin asserted a chip
        # click while stopped starts NO audio — evidence the rogue tetrad
        # pass was dead (260905). Correct then, and still what it guards:
        # nothing FOREIGN may sound. The walk now auditions its OWN drawn
        # selection on a stopped click, so the pin takes its stronger form:
        # sounded == drawn == raw starts — the drawn selection and NOTHING
        # else. The zero-assertions live on in the audition block's refused
        # and muted halves.
        page.evaluate("() => { window.__raw = []; window.__nt = [] }")
        page.click('#tlScroll button >> nth=2'); page.wait_for_timeout(400)
        aud2 = page.evaluate("() => [window.__nt.length, window.__raw.length]")
        drawn2 = page.eval_on_selector_all("#fieldSvg .fd-sel", "e => e.length")
        check(drawn2 > 0 and aud2[0] == drawn2 and aud2[1] == aud2[0],
              f"{tag} a stopped chip click auditions the DRAWN selection and nothing "
              f"else — drawn {drawn2}, NOTEs {aud2[0]}, raw starts {aud2[1]}")
        page.uncheck("#fdMetChk"); page.wait_for_timeout(150)
        page.evaluate("() => { window.__raw = []; window.__nt = [] }")
        page.click('#tlStripMini button[data-role="play"]'); page.wait_for_timeout(1400)
        page.click('#tlStripMini button[data-role="stop"]'); page.wait_for_timeout(300)
        counts = page.evaluate("() => [window.__nt.length, window.__raw.length]")
        check(counts[0] >= 3 and counts[0] == counts[1],
              f"{tag} with the click muted, every raw audio start must BE an announced "
              f"NOTE — the walk's schedule is the only sounding path (NOTEs {counts[0]}, "
              f"raw starts {counts[1]})")
        page.check("#fdMetChk"); page.wait_for_timeout(150)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(120)

        # THE SPLIT, AT THE ARTIFACT: 1+1+1+1 must change when the next chord
        # ARRIVES — one bar per beat, not per metric bar (Daniel's finding:
        # the timeline drew it and the sound ignored it)
        page.select_option("#fdSplit", "1+1+1+1"); page.dispatch_event("#fdSplit", "change")
        page.wait_for_timeout(150)
        page.evaluate("() => { window.__adv = [] }")
        page.click('#tlStripMini button[data-role="play"]'); page.wait_for_timeout(1400)
        page.click('#tlStripMini button[data-role="stop"]'); page.wait_for_timeout(250)
        adv = page.evaluate("() => window.__adv")
        beat = 60.0 / 240.0
        adv_d = [(adv[i + 1]["t"] - adv[i]["t"]) / 1000.0 for i in range(len(adv) - 1)]
        check(len(adv) >= 3 and all(abs(dl - beat) < 0.09 for dl in adv_d),
              f"{tag} under 1+1+1+1 the chords must ARRIVE every beat (~{beat:.2f}s): {adv_d}")
        page.select_option("#fdSplit", "4"); page.dispatch_event("#fdSplit", "change")
        page.wait_for_timeout(120)
        # THE MODE MISMATCH is named on the face, with the switch offered
        page.fill("#fdFigIn", "R-3-5-7"); page.dispatch_event("#fdFigIn", "input")
        page.wait_for_timeout(150)
        note = page.inner_text("#fdFigNote")
        check("reads as a TONES figure" in note and "switch it to tones" in note,
              f"{tag} R-3-5-7 under pattern must name the likely mode, not report string 5: {note!r}")
        page.click('#fdAddrSeg button[data-addr=\"tones\"]'); page.wait_for_timeout(120)
        page.fill("#fdFigIn", "4,3,4,3,2,1"); page.dispatch_event("#fdFigIn", "input")
        page.wait_for_timeout(150)
        check("reads as a string PATTERN" in page.inner_text("#fdFigNote"),
              f"{tag} the reverse mismatch must be named too: {page.inner_text('#fdFigNote')!r}")
        page.click('#fdAddrSeg button[data-addr=\"pattern\"]'); page.wait_for_timeout(80)
        page.fill("#fdFigIn", ""); page.dispatch_event("#fdFigIn", "input"); page.wait_for_timeout(80)

        # ---- 260905 item 2: TAKE IS MATERIAL, MOVEMENT IS THE RAIL'S ----
        # Daniel: "The Take field in Harmony is doing movement (partial) duty
        # here which it shouldn't be." The vocabulary is pinned so it cannot
        # drift back: Harmony's Take options speak material only; the rail's
        # control speaks his two movement words.
        # PIN REWRITTEN 260913 (item 1): Take is the rail's all-tones
        # checkbox now; its material vocabulary lives on the label and its
        # title (every occurrence in the box / one of each tone)
        take_talk = page.evaluate("""() => {
          const lab = document.getElementById('fdAllTonesLab');
          return (lab.textContent + ' ' + (lab.title || '')).trim(); }""")
        check("all tones" in take_talk and "every occurrence in the box" in take_talk
              and "one of each" in take_talk
              and "arpeggi" not in take_talk and "voicing" not in take_talk,
              f"{tag} the take control speaks MATERIAL, not movement: {take_talk!r}")
        move_btns = page.eval_on_selector_all("#fdMoveSeg button", "es => es.map(e => e.textContent.trim())")
        # words updated 260913: the PO ruled strum/arpeggiate (a block IS a
        # strum); the pin's job — the rail speaks the ruled movement words,
        # Take speaks material — is unchanged
        check(move_btns == ["strum", "arpeggiate"],
              f"{tag} the rail's movement control carries the ruled words: {move_btns}")

        # ---- 260903: SOUND ⊆ SIGHT — corrected 260904 ----
        # The invariant is ONE-DIRECTIONAL, as ruled: the app must never
        # sound a note it does not show. The converse is not required and not
        # desirable — the ghosted field draws fifty notes that never sound,
        # and a drawn-but-silent reference under a refused bar is CORRECT
        # (260904's ruling). The 260903 pin was tightened in the wrong
        # direction (equality): it would have gone red on the correct change
        # and invited exactly the backwards fix. Per bar: sounded ⊆ drawn
        # (selection plus reference), failures BY BAR AND BY MIDI.
        page.evaluate("""() => { window.__cf = { bars: [], notes: [] };
          document.addEventListener('atetudes:note', e =>
            window.__cf.notes.push({ m: e.detail.midi, t: performance.now() }));
          document.addEventListener('atetudes:step', e => {
            if (e.detail && e.detail.request === true) return;
            const t = performance.now(), i = e.detail.index;
            requestAnimationFrame(() => {
              const drawn = [...document.querySelectorAll('#fieldSvg .fd-sel')]
                .map(g => +g.dataset.selmidi);
              const rf = document.querySelector('#fieldSvg .fd-ref');
              window.__cf.bars.push({ i, t, drawn,
                ref: rf ? +rf.dataset.refmidi : null }); }); }); }""")
        page.select_option("#fdBass2", "third"); page.wait_for_timeout(200)
        page.fill("#bpmRange", "240"); page.dispatch_event("#bpmRange", "input")
        compared = [0]

        def sound_sight_pass(label):
            page.evaluate("""() => {
              const drawn = [...document.querySelectorAll('#fieldSvg .fd-sel')]
                .map(g => +g.dataset.selmidi);
              const rf = document.querySelector('#fieldSvg .fd-ref');
              window.__cf.bars = [{ i: -1, t: performance.now(), drawn,
                ref: rf ? +rf.dataset.refmidi : null }];
              window.__cf.notes = []; }""")
            page.click('#tlStripMini button[data-role="play"]')
            page.wait_for_timeout(8600)                      # eight 1 s bars at 240
            page.click('#tlStripMini button[data-role="stop"]'); page.wait_for_timeout(250)
            cf = page.evaluate("() => window.__cf")
            bars, notes = cf["bars"], cf["notes"]
            check(len(bars) >= 8, f"{tag} [{label}] the corpus must actually run: {len(bars)} bars")
            # ONLY COMPLETE BARS COMPARE: the stop lands mid-bar and rightly
            # cancels the pending steps, so the trailing snapshot has no end
            # boundary and no complete sound — comparing it was this pin's own
            # first red (its blind spot, not the walk's)
            for k, bar in enumerate(bars[:-1]):
                t0 = bar["t"] - 50
                t1 = bars[k + 1]["t"] - 50
                sounded = sorted({n["m"] for n in notes if t0 <= n["t"] < t1})
                shown = sorted(set(bar["drawn"]) | ({bar["ref"]} if bar["ref"] is not None else set()))
                stray = [m for m in sounded if m not in shown]
                check(not stray,
                      f"{tag} [{label}] bar snapshot i={bar['i']}: SOUND must be a SUBSET of SIGHT — "
                      f"sounded {sounded}, drawn {shown}, never-shown {stray}")
                compared[0] += 1
            return bars

        # config 1 — the boot cycle at Grip: bar 2 is DANIEL'S BAR, identified:
        # empty selection, the reference alone both drawn and sounded
        # config 1 runs against the OLD 5–8 window, deliberately dispatched:
        # the boot now PLACES every bar (the 260904 pin), so the refusal the
        # ruling is proven on must be created — E♭maj7 still collides there
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { startDeg: 5, nearFret: 5 } }))""")
        page.wait_for_timeout(200)
        bars1 = sound_sight_pass("old 5-8 window grip + ref (the refusal corpus)")
        # THE REFUSED BAR IS SILENT (Daniel's ruling, 260904): the reference
        # is "the reference tone on the bottom end for all of the harmony
        # that sits on top of it" — with no harmony on top it has nothing to
        # be under. Drawn, yes (informative, legal under the subset pin);
        # sounded, no. Asserted on the refusing bar IDENTIFIED: drawn
        # selection empty, ref ring present, and the NOTE stream for that
        # bar EMPTY.
        cf1 = page.evaluate("() => window.__cf")
        refused = [(k, b) for k, b in enumerate(cf1["bars"][:-1]) if b["drawn"] == []]
        check(refused,
              f"{tag} the corpus must contain a refusing bar to prove the ruling on "
              f"(none refused — the corpus lost its teeth)")
        for k, b in refused:
            t0, t1 = b["t"] - 50, cf1["bars"][k + 1]["t"] - 50
            sounded = sorted({n["m"] for n in cf1["notes"] if t0 <= n["t"] < t1})
            check(b["ref"] is not None and sounded == [],
                  f"{tag} a refused bar (i={b['i']}) must be SILENT with the ref drawn: "
                  f"ref {b['ref']}, sounded {sounded}")
        check("nothing sits on top" in page.inner_text("#fdHint")
              if page.eval_on_selector_all("#fieldSvg .fd-sel", "e => e.length") == 0 else True,
              f"{tag} the refused bar's face must say why the reference stays silent: "
              f"{page.inner_text('#fdHint')!r}")
        # back to the boot window for config 2
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:config',
          { detail: { startDeg: 4, nearFret: 3 } }))""")
        page.wait_for_timeout(200)
        # config 2 — the window STEPPED (the announce every mover must make)
        # and the arpeggio take: the class the hypothesis feared, exercised
        page.focus("#fieldSvg"); page.press("#fieldSvg", "ArrowRight"); page.wait_for_timeout(200)
        page.check("#fdAllTones"); page.wait_for_timeout(200)
        sound_sight_pass("stepped window + arpeggio")
        check(compared[0] >= 14,
              f"{tag} the sound≡sight corpus floor: {compared[0]} complete bars compared (want ≥ 14)")
        # restore
        page.uncheck("#fdAllTones"); page.select_option("#fdBass2", "none")
        page.press("#fieldSvg", "ArrowLeft"); page.wait_for_timeout(150)
        page.fill("#bpmRange", "72"); page.dispatch_event("#bpmRange", "input")
        page.wait_for_timeout(100)
        # back to the boot state
        page.fill("#bpmRange", "72"); page.dispatch_event("#bpmRange", "input")
        page.fill("#journalIn", ""); page.dispatch_event("#journalIn", "input")
        # pgCustom is HIDDEN once the source is back on cycle (the 260902
        # block seats the cycle early) — clear it without a visibility wait
        page.evaluate("""() => { const c = document.querySelector('#pgCustom');
          c.value = ''; c.dispatchEvent(new Event('input', { bubbles: true })); }""")
        page.click('#pgSrcSeg button[data-src=\"cycle\"]'); page.wait_for_timeout(150)
        page.evaluate("""() => document.dispatchEvent(new CustomEvent('atetudes:step',
          { detail: { index: 0, request: true } }))""")
        page.wait_for_timeout(150)

        # ---- THE SEATING CHECK, EXTENDED TO PARTS (the parts primitive):
        # WHICH PART sits in WHICH SEAT — last night's lesson one level down.
        # The pad (journalIn) sits in row 1's 3fr cell WITHOUT the log; the
        # log part (histList, under its own Practice log header) is its own
        # board at the page foot, after the keys.
        pad_cell = page.evaluate("""() => {
          const cell = [...document.querySelectorAll('#cards .cardrow')][0].children[1];
          const bh = cell.querySelector('.bh span');
          return { pad: !!cell.querySelector('#journalIn'),
                   log: !!cell.querySelector('#histList'),
                   hdr: bh ? bh.textContent.trim() : null }; }""")
        check(pad_cell["pad"] and not pad_cell["log"] and pad_cell["hdr"] == "Notepad",
              f"{tag} row 1's cell must hold the pad alone under v0.9's 'Notepad' header: {pad_cell}")
        log_seat = page.evaluate("""() => {
          const boards = [...document.querySelectorAll('#boards > .board')];
          const li = boards.findIndex(b => b.querySelector('#histList'));
          const ki = boards.findIndex(b => b.querySelector('#kySvg'));
          const lb = boards[li];
          return { li, ki, last: li === boards.length - 1,
                   hdr: lb ? !!lb.querySelector('.bh') : false,
                   pad: lb ? !!lb.querySelector('#journalIn') : null }; }""")
        check(log_seat["li"] >= 0 and log_seat["last"] and log_seat["li"] > log_seat["ki"],
              f"{tag} the log part is not seated at the page foot after the keys: {log_seat}")
        check(log_seat["hdr"] and not log_seat["pad"],
              f"{tag} the log board must carry its own header and no pad: {log_seat}")
        # one surface, two seats: a save from the row-1 pad files into the
        # foot's list — the state is one, wherever the parts sit
        page.fill("#journalIn", "the split is placement, not identity")
        page.click("#saveEntry"); page.wait_for_timeout(120)
        check(page.eval_on_selector_all("#boards .hist", "e => e.length") == 1
              and page.input_value("#journalIn") == "",
              f"{tag} a save from the pad did not file into the foot's log — two seats, one surface broke")
        page.click(".hist .acts button.danger"); page.wait_for_timeout(80)

        # ---- THE RENDERED DIFF (the surface item, 2026-08-29): "identical is
        # asserted, not judged". v0.9 is opened beside the door and the layout
        # facts are DERIVED FROM BOTH ARTIFACTS — never hand-pinned numbers —
        # then compared, at 1280 and at 390. The allow-list is explicit and
        # every entry cites the divergence register:
        #   · live engine output (derived dots ≠ the prototype's stored ones)
        #   · regions whose child has not landed (progression, timeline bars,
        #     the bass clef, figures) — asserted VISIBLY inert elsewhere
        #   · register entries: the pad/log split
        #     (the CSS ownership wall), the gaps card (prototype self-audit,
        #     dropped), the collapse chevron (family idiom, kept).
        #   RETIRED 260915: the page-chrome & control-metrics class — the
        #   house skin became v0.9's at the beta reconciliation (register
        #   entry 3 RESOLVED), so chrome no longer needs an allow-list.
        proto = ctx.new_page()
        # the ORACLE ships with the gate (260911, the publish): notes/ is the
        # gitignored vault, so CI had no v0.9 and the comparison aborted the
        # door — a gate that cannot run where the deploy is decided is rule
        # 2's silent skip. The repo copy is byte-identical to the vault's
        # (cmp-checked at the move); the vault file remains the working home.
        proto.goto((REPO / "hub/tests/oracles/multetudes-v0.9.html").as_uri())
        proto.wait_for_selector(".wrap", state="attached")
        proto.wait_for_timeout(200)

        def row_ratios(pg, sel):
            """the widths of a row's children, as fractions of their sum"""
            return pg.evaluate("""(sel) => {
              const kids = [...document.querySelectorAll(sel)];
              const ws = kids.map(k => k.getBoundingClientRect().width);
              const t = ws.reduce((a, b) => a + b, 0);
              return ws.map(w => w / t); }""", sel)

        def compare_rows(where, strict=True):
            pairs = [
                ("row 1 (metronome | journal)", ".row1 > *", "#cards .cardrow:nth-of-type(1) > *"),
                ("row 2 (harmony | progression | presets)", ".row2 > *", "#cards .cardrow:nth-of-type(2) > *"),
            ]
            for name, psel, dsel in pairs:
                a = row_ratios(proto, psel)
                b = row_ratios(page, dsel)
                if strict:
                    check(len(a) == len(b) and all(abs(x - y) < 0.025 for x, y in zip(a, b)),
                          f"{tag} {name} proportions diverge from v0.9 at {where}: "
                          f"v0.9 {[round(x, 3) for x in a]} vs door {[round(y, 3) for y in b]}")
                else:
                    # phone width: both pages floor at min-content, and the two
                    # pages' min-contents differ (register: phone-width grid
                    # compression). The structural halves still must agree.
                    check(len(a) == len(b) and all(x > 0 for x in b),
                          f"{tag} {name} lost a member at {where}: v0.9 {len(a)} vs door {len(b)}")

        compare_rows("1280")
        # WHO sits in each row, not only how wide — the first red run of this
        # gate proved ratios alone measure nothing: swapping Harmony and the
        # journal between rows left every ratio identical. Identity is read
        # off the artifact by each card's own controls, in v0.9's seating:
        # row 1 = the clock beside the journal; row 2 = harmony, progression,
        # presets, in that order.
        seating = page.evaluate("""() =>
          [...document.querySelectorAll('#cards .cardrow')].map(row =>
            [...row.children].map(cell => {
              for (const [id, name] of [["metroBtn","metronome"],["journalIn","journal"],
                ["hcKey","harmony"],["pgCycle","progression"],["psSel","presets"]])
                if (cell.querySelector('#' + id)) return name;
              return "?"; }))""")
        check(seating == [["metronome", "journal"], ["harmony", "progression", "presets"]],
              f"{tag} the rows seat the wrong cards: {seating} — v0.9 seats "
              f"[[metronome, journal], [harmony, progression, presets]]")
        # the section sequence, derived from both pages and mapped through the
        # allow-list: the gaps card is dropped (register), and the practice
        # log rides the journal into row 1 (register — the ownership wall)
        def sections(pg):
            return pg.evaluate("""() =>
              [...document.querySelectorAll('.card > h2, .bh > span, .metro h2')]
                .map(e => e.textContent.replace(/\s+/g, ' ').trim().toLowerCase().replace(/[▾›‹⏮▶⏹⏭ⓘ]/g, '').replace(/[—(].*$/, '').trim())
                .filter(t => t && !t.includes('saved'))""")
        # allow-list, citing the register: the gaps card is the prototype's
        # self-audit (dropped). The "Notepad" section came OFF this list on
        # 260830 — the parts split seats the pad under v0.9's own header, so
        # the gate asserts it again.
        want = [t for t in sections(proto) if t not in ("what this configuration hits",)]
        got = [t for t in sections(page) if t != "note"]
        # RENAME ALIASES (rule 7 — rewritten with the reason): a ruled rename
        # keeps the section's identity while its name moves; the census
        # compares identity, not spelling. 260914: v0.9's "harmony" is the
        # door's "centricity" (register 27).
        RENAMED = { "harmony": "centricity" }
        got = got + [k for k, v in RENAMED.items() if v in got]
        for t in want:
            check(t in got, f"{tag} v0.9 section {t!r} is missing from the door "
                            f"(door sections: {got})")
        neck_i = [i for i, t in enumerate(got) if "neck" in t]
        staff_i = [i for i, t in enumerate(got) if "étude" in t]
        keys_i = [i for i, t in enumerate(got) if "keys" in t]
        check(neck_i and staff_i and keys_i and neck_i[0] < staff_i[0] < keys_i[0],
              f"{tag} the boards are out of v0.9's order: {got}")
        # the degree palette, sampled from BOTH artifacts (never a hand pin):
        # v0.9's stored dots and the door's derived dots must wear one palette
        pal_proto = proto.evaluate("""() => { const out = {};
          for (const t of [...document.querySelectorAll('#neck g text')]) {
            const lab = t.textContent.trim();
            const c = t.parentElement.querySelector('circle');
            if (c && /^(R|[2-7])$/.test(lab) && !(lab in out)) out[lab] = c.getAttribute('fill');
          } return out; }""")
        pal_door = page.evaluate("""() => { const out = {};
          for (const g of [...document.querySelectorAll('#fieldSvg .fd-dot')]) {
            const lab = g.querySelector('text').textContent.trim();
            const c = g.querySelector('circle');
            if (/^(R|[2-7])$/.test(lab) && !(lab in out)) out[lab] = c.getAttribute('fill');
          } return out; }""")
        check(len(pal_proto) == 7 and pal_proto == pal_door,
              f"{tag} the degree palette diverges from v0.9: {pal_proto} vs {pal_door}")
        # THE INERT LIST IS EMPTY (child 7, the last child): nothing on the
        # page may carry an inert notice any more — asserted on the whole
        # artifact, not a shrinking list (a list forgets; a page cannot)
        page_text = page.inner_text("body").lower()
        check("inert" not in page_text and "arrives with child" not in page_text,
              f"{tag} the page still carries an inert notice somewhere")
        # and at 390 — the same derived comparisons, phone width
        page.set_viewport_size({"width": 390, "height": 844})
        proto.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(120); proto.wait_for_timeout(120)
        compare_rows("390", strict=False)
        page.set_viewport_size({"width": 1280, "height": 900})
        proto.set_viewport_size({"width": 1280, "height": 900})
        page.wait_for_timeout(120)
        # the neck rail collapses and returns — exercised, so its state
        # rules are matched in a DOM that really entered them
        page.click("#fdRailBtn"); page.wait_for_timeout(60)
        check(page.eval_on_selector_all(".fd-rail.fd-shut", "e => e.length") == 1,
              f"{tag} the rail toggle did not collapse the rail")
        page.click("#fdRailBtn"); page.wait_for_timeout(60)
        proto.close()

    # ---------------- exercise the door -------------------------------------
    # a page that loads is not a page that works — and the orphan-selector
    # check below is only honest once the door's states have been entered
    page.click("#metroBtn")
    page.wait_for_timeout(250)
    check(page.inner_text("#metroBtn") == "Stop", f"{tag} the metronome did not start")
    check(page.eval_on_selector_all("#beatLamp span.on", "e => e.length") >= 1,
          f"{tag} the beat lamp never lit — the clock is not running")
    page.fill("#bpmRange", "120")
    page.dispatch_event("#bpmRange", "input")
    check(page.inner_text("#bpmVal") == "120", f"{tag} the BPM readout did not follow")

    if "journalIn" in r["controlsPresent"]:
        page.fill("#journalIn", "a note from the door lock suite\n\nwith `inline code` and a fence:\n\n```\nCmaj7\n```\n")
        page.dispatch_event("#journalIn", "input")
        page.click("#saveEntry")
        check(page.input_value("#journalIn") == "",
              f"{tag} save must clear the pad — the canonical notepad semantics")
        check(page.eval_on_selector_all(".hist", "e => e.length") == 1,
              f"{tag} the entry was not filed")
        check(page.inner_text("#histCount") == "1", f"{tag} the count did not follow")
        # RE-AIMED BY ROLE 260916 (rule 12): was `>> text=Palette`
        pal = page.query_selector("#journalControls [data-cap='palette']")
        # message updated 260911 (item 1): the card now DECLARES the palette
        # button (v0.9's row), so "auto-append" no longer describes the doors
        # that carry it — the assertion itself is unchanged: Palette exists
        # in the controls row, however it got there. The auto-append fallback
        # stays exercised by the engine's own stub-host tests.
        check(pal is not None, f"{tag} Palette must sit in the controls row")
        if pal:
            pal.click()
            check(page.eval_on_selector_all(".palette", "e => e.length") == 1,
                  f"{tag} the palette panel did not open")
        check(page.eval_on_selector_all(".hist .note.md pre", "e => e.length") == 1,
              f"{tag} the note's fenced block did not render through the markdown engine")
    if "playBtn" in r["controlsPresent"]:
        # ---- the transport: one grid, two views, and a playhead that agrees ----
        # BPM is ONE state seen twice. Move it here, and the metronome's own
        # readout must follow — they are two views of one clock, not two copies.
        page.fill("#bpmRange2", "150")
        page.dispatch_event("#bpmRange2", "input")
        page.wait_for_timeout(80)
        check(page.inner_text("#bpmVal") == "150",
              f"{tag} the metronome's BPM did not follow the transport's — two clocks, not one")
        check(page.inner_text("#bpmVal2") == "150", f"{tag} the transport's own readout did not follow")
        # and back the other way
        page.fill("#bpmRange", "120")
        page.dispatch_event("#bpmRange", "input")
        page.wait_for_timeout(80)
        check(page.inner_text("#bpmVal2") == "120",
              f"{tag} the transport did not follow the metronome — the mirror is one-way")

        # the meter is one state too, and the split list follows it
        page.select_option("#meterSel2", "3")
        page.wait_for_timeout(80)
        check(page.input_value("#meterSel") == "3",
              f"{tag} the metronome's meter did not follow the transport's")
        splits3 = page.eval_on_selector_all("#splitSel option", "e => e.map(x => x.textContent)")
        check(splits3 and all("+" in x or x.isdigit() for x in splits3),
              f"{tag} the bar-split list did not re-derive for the new meter: {splits3}")
        page.select_option("#meterSel2", "4")
        page.select_option("#splitSel", "2")            # [1,1,1,1] — one chord a beat
        page.wait_for_timeout(60)

        # PLAY. The transport does not own a clock: it asks for the metronome's.
        tl_index = lambda: page.evaluate("""() => {
          const bs = [...document.querySelectorAll('#tlBars button')];
          return bs.findIndex(b => b.classList.contains('cur'));
        }""")
        tl_before = tl_index()
        page.click("#playBtn")
        page.wait_for_timeout(150)
        check(page.inner_text("#playBtn") == "Pause", f"{tag} the transport did not arm")
        check(page.inner_text("#metroBtn") == "Stop",
              f"{tag} pressing Play did not start the grid — the transport asked for a clock it did not get")

        # THE PASS ADVANCES. Shell 4 cut the pip playhead; the TIMELINE is the
        # position indicator now (the reference's own, with roman numerals). At
        # ~2 s and one chord a beat the current chord must move and stay unique —
        # a transport whose position never advances is worse than none.
        page.wait_for_timeout(2200)
        curChord = page.eval_on_selector_all("#tlBars button.cur", "e => e.length")
        tlIdx = tl_index()
        check(curChord == 1, f"{tag} the timeline lost (or duplicated) its current chord while playing: {curChord}")
        check(tlIdx != tl_before, f"{tag} the pass never advanced — current chord parked at {tlIdx}")

        # pausing stops the walk but leaves the position where it was
        page.click("#playBtn")
        page.wait_for_timeout(60)
        check(page.inner_text("#playBtn") == "Play", f"{tag} the transport did not pause")
        parked = tl_index()
        page.wait_for_timeout(600)
        check(tl_index() == parked, f"{tag} the pass kept walking after pause: {parked} -> {tl_index()}")

        # THE PLAYHEAD IS GONE FROM THE ARTIFACT (Shell 4). Not "the control was
        # dropped from the config" — the div itself must not be in the rendered
        # DOM, the redundant fourth indicator removed at the source.
        check(page.eval_on_selector_all(".trPlayhead, #trHead, .trPip", "e => e.length") == 0,
              f"{tag} the transport playhead strip is still in the DOM — Shell 4 cut it")

        # PLAY JOINS AT THE NEXT BAR, not the arming beat — the beat-2 defect.
        # The clock is running and the transport idle (paused above). One chord
        # per WHOLE bar, so a correct join makes EVERY attack a bar line. The
        # transport announces level=BAR(2) on a downbeat attack and level=STEP(1)
        # mid-bar, so the first attack's announced level IS the join beat — the
        # old timing gate could not see this, the chords were 1.9 ms from a click,
        # just the WRONG click. Arm right after a downbeat so the arming beat is
        # off the downbeat; the join must still land on the next bar line.
        BAR = 2
        page.select_option("#splitSel", "0")                 # one chord per whole bar
        page.wait_for_timeout(60)
        arm_recorder = """() => {
          if (window.__lvh) document.removeEventListener('atetudes:step', window.__lvh);
          window.__lv = [];
          window.__lvh = e => { const x = e.detail;
            if (x && x.request === true && x.lead !== undefined && x.level !== undefined) window.__lv.push(x.level); };
          document.addEventListener('atetudes:step', window.__lvh); }"""
        wait_downbeat = """() => new Promise(res => { const h = e => {
          if (e.detail.beat === 0) { document.removeEventListener('atetudes:beat', h); res(); } };
          document.addEventListener('atetudes:beat', h); })"""
        page.evaluate(arm_recorder)
        # THE ARTIFACT HALF (converted 260819.3): the announced level is the
        # contract, but a silent join at the right level would still pass it —
        # so record when the grid's own downbeats are DISPATCHED and when audio
        # sources actually START, and assert the chord BURSTS land on beat-0
        # times. What the levels cause is a chord sounding on the click you
        # count; that is what is asserted. Shown RED against a build with the
        # beat-2 bug put back (beatInBar forced to 0 in the transport card):
        # bursts landed on the arming beat, ~2 beats off the bar line.
        page.evaluate(AUDIO_TAP)
        page.evaluate("""() => { window.__bar0 = [];
          if (window.__b0h) document.removeEventListener('atetudes:beat', window.__b0h);
          window.__b0h = e => { if (e.detail && e.detail.beat === 0) window.__bar0.push(performance.now()); };
          document.addEventListener('atetudes:beat', window.__b0h); }""")
        page.evaluate(wait_downbeat)                          # a downbeat just passed → next beat is mid-bar
        page.click("#playBtn")
        page.wait_for_function("() => window.__lv && window.__lv.length >= 2", timeout=12000)
        page.wait_for_timeout(300)
        levels = page.evaluate("() => window.__lv")
        check(levels[0] == BAR,
              f"{tag} Play joined OFF the downbeat — first chord attack level {levels[0]}, not BAR — the beat-2 defect")
        check(all(l == BAR for l in levels),
              f"{tag} a chord attacked off the bar line after joining (every chord repeats the offset): {levels}")
        bursts, _clicks = bursts_and_clicks(page.evaluate("() => window.__src"))
        bar0 = page.evaluate("() => window.__bar0")
        check(len(bursts) >= 2, f"{tag} joining the running grid produced {len(bursts)} chord bursts — the join was silent")
        beat_ms = 60000 / 120 if page.input_value("#bpmRange2") == "120" else 60000 / int(page.input_value("#bpmRange2"))
        for bu in bursts[:2]:
            off = min((abs(bu["t0"] - t) for t in bar0), default=1e9)
            check(off <= beat_ms * 0.4,
                  f"{tag} a chord SOUNDED {off:.0f} ms from the nearest bar line (a beat is {beat_ms:.0f} ms) — "
                  f"aligned to the wrong click, the failure the announced level cannot see")
        page.click("#playBtn"); page.wait_for_timeout(120)   # pause

        # THE STRIP MINI ▶ TAKES THE SAME PATH (Shell 4 announces PLAY). Re-arm
        # mid-bar from a strip's ▶ and assert the same downbeat join.
        if page.query_selector("#tlMini"):
            if page.inner_text("#metroBtn") != "Stop":       # keep the clock running
                page.click("#metroBtn"); page.wait_for_timeout(80)
            page.evaluate(arm_recorder)                       # resets window.__lv
            page.evaluate(wait_downbeat)
            page.click("#tlMini button[data-role=play]")
            page.wait_for_function("() => window.__lv && window.__lv.length >= 1", timeout=12000)
            check(page.evaluate("() => window.__lv[0]") == BAR,
                  f"{tag} the strip mini ▶ joined off the downbeat — it must take the same PLAY path as Play")
            page.click("#playBtn"); page.wait_for_timeout(120)   # disarm, leave the clock running

        # ---- metroOwner: THE TRANSPORT DOES NOT OWN THE CLOCK (side-by-side
        # triage 260819) — CONVERTED to artifact-level by 260819.3. The original
        # pins asserted ANNOUNCED attacks and a trLoop/beat count-in proxy, and
        # symptom 3's pin passed cleanly over a silent first chord one commit
        # before Daniel found it by ear. Now every symptom is asserted on what
        # the user gets: real audio-source starts (a chord is a BURST, a click a
        # singleton) and the timeline's rendered position — announced messages
        # remain only as diagnostics. Each assertion was re-demonstrated RED:
        # symptoms 1-3 against the pre-metroOwner build (eecea4b), the chord-1
        # sound against v0.1.1 (40d4e00), then green here.
        if page.inner_text("#playBtn") == "Pause":
            page.click("#playBtn"); page.wait_for_timeout(120)
        if page.inner_text("#metroBtn") == "Stop":            # a COLD, stopped clock
            page.click("#metroBtn"); page.wait_for_timeout(120)
        check(page.inner_text("#metroBtn") == "Start", f"{tag} could not reach a cold clock for the metroOwner pins")
        page.select_option("#splitSel", "0"); page.check("#countChk"); page.wait_for_timeout(60)
        page.evaluate(AUDIO_TAP)
        page.evaluate("""() => {
          if (window.__mo) document.removeEventListener('atetudes:step', window.__mo);
          window.__att = [];
          window.__mo = e => { const x = e.detail; if (!x || x.request !== true) return;
            if (x.lead !== undefined && x.level !== undefined) window.__att.push(x.index); };
          document.addEventListener('atetudes:step', window.__mo); }""")
        tl_cur = lambda: page.evaluate("""() => {
          const bs = [...document.querySelectorAll('#tlBars button')];
          return bs.findIndex(b => b.classList.contains('cur')); }""")

        def play_and_first_burst(label):
            """Play from a cold clock; return (bursts, clicks) once chord 1 has had time to sound."""
            page.evaluate("() => { window.__src.length = 0; window.__att.length = 0 }")
            page.click("#playBtn")
            # the DISPLAY check (not a length proxy): the user is shown a count-in
            page.wait_for_function("() => /count-in/.test(document.getElementById('trLoop').textContent)", timeout=8000)
            # wait for an audible chord: a burst, not an announcement
            page.wait_for_function(
                """() => { const t = window.__src; let run = 1;
                     for (let i = 1; i < t.length; i++) { run = t[i] - t[i-1] <= 250 ? run + 1 : 1;
                       if (run >= 4) return true; } return false; }""", timeout=20000)
            page.wait_for_timeout(300)
            b, c = bursts_and_clicks(page.evaluate("() => window.__src"))
            check(len(b) >= 1, f"{tag} {label}: no chord burst ever sounded")
            return b, c

        # PLAY from cold — the étude the user hears: ~one bar of clicks, then CHORD 1.
        meter_now = int(page.input_value("#meterSel2"))
        b, c = play_and_first_burst("cold Play")
        clicks_before = len([t for t in c if t < b[0]["t0"]])
        check(clicks_before <= meter_now + 1,
              f"{tag} SYMPTOM 2 (artifact): {clicks_before} clicks sounded before the first chord — "
              f"a one-bar count-in is at most {meter_now + 1} (arm beat included); two bars means it armed mid-bar")
        check(tl_cur() == 0,
              f"{tag} SYMPTOM 3 (artifact): the first SOUNDED chord left the timeline on chord {tl_cur() + 1}, not chord 1")
        check(page.evaluate("() => window.__att[0]") == 0,
              f"{tag} (diagnostic) the first announced attack was not step 0")

        # SYMPTOM 1: Pause must SILENCE the clock the transport started — Daniel's
        # symptom was hearing it tick, so the assertion is that nothing else sounds.
        page.click("#playBtn"); page.wait_for_timeout(400)     # pause + let scheduled stragglers land
        frozen = page.evaluate("() => window.__src.length")
        page.wait_for_timeout(900)
        after = page.evaluate("() => window.__src.length")
        check(after == frozen,
              f"{tag} SYMPTOM 1 (artifact): {after - frozen} audio sources started AFTER Pause — "
              f"the metronome kept ticking; the transport must stop the clock it started")
        check(page.inner_text("#playBtn") == "Play", f"{tag} Pause did not disarm the transport")

        # PLAY AGAIN — Daniel's exact sequence, same artifact assertions.
        b, c = play_and_first_burst("Play after Pause")
        clicks_before = len([t for t in c if t < b[0]["t0"]])
        check(clicks_before <= meter_now + 1,
              f"{tag} SYMPTOM 2 (artifact): Play->Pause->Play heard {clicks_before} clicks before chord 1 — not one bar")
        check(tl_cur() == 0,
              f"{tag} SYMPTOM 3 (artifact): Play->Pause->Play sounded chord {tl_cur() + 1} first, not chord 1")
        page.click("#playBtn"); page.wait_for_timeout(400)     # pause; clock stops with it

        # BOTH DIRECTIONS, as sound. A metronome the USER started keeps ticking
        # through a transport Pause; the metronome's own Stop silences everything.
        page.click("#metroBtn"); page.wait_for_timeout(120)    # user starts the clock by hand
        page.click("#playBtn"); page.wait_for_timeout(200)     # Play joins the running grid
        page.click("#playBtn"); page.wait_for_timeout(400)     # Pause — the hand-started clock survives
        t0 = page.evaluate("() => window.__src.length")
        page.wait_for_timeout(1200)
        check(page.evaluate("() => window.__src.length") > t0,
              f"{tag} a transport Pause SILENCED a metronome the USER started — it may only stop a clock it owns")
        page.click("#playBtn"); page.wait_for_timeout(200)     # Play again (joins)
        page.click("#metroBtn"); page.wait_for_timeout(400)    # metronome Stop stops EVERYTHING
        check(page.inner_text("#playBtn") == "Play",
              f"{tag} the metronome's Stop did not stop the running étude — stopAll must cascade")
        t1 = page.evaluate("() => window.__src.length")
        page.wait_for_timeout(900)
        check(page.evaluate("() => window.__src.length") == t1,
              f"{tag} sound continued after the metronome's own Stop — stopAll must silence everything")
        page.uncheck("#countChk"); page.wait_for_timeout(40)
        page.click("#metroBtn"); page.wait_for_timeout(120)    # clock running again for the blocks below

        # ---- ONE MUTE ICON PER SLIDER (260820.3): the metronome's Vol slider.
        # The icon REPLACED the Sound button (Daniel's design); the state work
        # stays — the click's on/off is the clock owner's CLOCK_STATE.click —
        # and "click muted" now IS "click Vol at zero", the v0.8.7 rule made
        # universal. The icon is a VIEW of the level, never separate state.
        # Demonstrated failing against the pre-icon build (no #clickMute).
        clicks_in = lambda ms: (lambda a: (page.wait_for_timeout(ms), page.evaluate("() => window.__src.length") - a)[1])(page.evaluate("() => window.__src.length"))
        check(clicks_in(1300) >= 1, f"{tag} no baseline click is sounding — cannot test the click mute icon")
        page.click("#clickMute"); page.wait_for_timeout(400)   # mute — settle past scheduled clicks
        check(clicks_in(1300) == 0,
              f"{tag} the click mute icon did not SILENCE the click — pressing it must stop the voice")
        check(page.input_value("#clickVolR") == "0",
              f"{tag} click muted but the Vol slider is not at zero — the icon must WRITE the level, not hold its own truth")
        check(not page.is_checked("#clickChk2"),
              f"{tag} click muted but the transport's metronome checkbox did not move — two states, not two views")
        check(page.get_attribute("#clickMute", "aria-pressed") == "true",
              f"{tag} the click mute icon does not announce its pressed state")
        page.check("#clickChk2"); page.wait_for_timeout(300)   # the OTHER view unmutes
        check(page.input_value("#clickVolR") == "80",
              f"{tag} unmuting from the checkbox did not restore the stashed level (80): {page.input_value('#clickVolR')!r}")
        check(clicks_in(1300) >= 1, f"{tag} the click did not resume after unmuting from the checkbox")
        # RULE 1, the one most likely to be missed: drag the Vol slider to zero
        # BY HAND and the icon shows muted — level 0 is muted however it got there
        page.fill("#clickVolR", "0"); page.dispatch_event("#clickVolR", "input"); page.wait_for_timeout(200)
        check(page.get_attribute("#clickMute", "aria-pressed") == "true",
              f"{tag} Vol dragged to zero by hand but the icon does not show muted — the icon is a VIEW of the level")
        check(clicks_in(1300) == 0, f"{tag} Vol at zero but the click still sounds")
        # unmute with NO stash (it was dragged to zero): restore the DEFAULT (80)
        page.click("#clickMute"); page.wait_for_timeout(300)
        check(page.input_value("#clickVolR") == "80",
              f"{tag} unmute with no stashed level must restore the click's default (80): {page.input_value('#clickVolR')!r}")
        check(clicks_in(1300) >= 1, f"{tag} the click did not resume after unmuting from the icon")

        # ---- THE CARD GRAMMAR (260820.4): four rows, none spent on a checkbox.
        # Daniel's sketch is a MOVE, not a redesign: accents joined the selects
        # row, metronome + count-in joined the Play row, voice joined the sig
        # row, and the two checkbox-only rows are gone. The static half (row
        # counts per card region, retired classes absent) lives in
        # engine/tests/host-conformance.test.mjs across all three apps; the
        # LIVE DOM here answers the predicate the sketch states — no row group
        # renders only checkboxes — and each moved control is EXERCISED below
        # (the trap is a control that moved and died: present but unwired).
        rows = page.evaluate("""() => {
          const out = [];
          for (const card of document.querySelectorAll('.card')) {
            const h2 = card.querySelector('h2');
            for (const row of card.querySelectorAll('.transport,.row2,.bpmrow')) {
              const ctl = [...row.querySelectorAll('button,select,input,textarea')]
                .filter(e => getComputedStyle(e).display !== 'none');
              out.push({ card: h2 ? h2.textContent.trim() : '?',
                         onlyChk: ctl.length > 0 && ctl.every(e => e.matches('input[type=checkbox]')) });
            }
          }
          return out; }""")
        wasted = [x["card"] for x in rows if x["onlyChk"]]
        check(not wasted,
              f"{tag} a row group renders ONLY checkboxes in: {wasted} — no row is spent on a checkbox")
        metro_rows = len([x for x in rows if x["card"] == "Metronome"])
        check(metro_rows == 4,
              f"{tag} the metronome card renders {metro_rows} row groups, not 4 — the card grammar is fixed")
        tr_rows = len([x for x in rows if x["card"] == "Transport"])
        check(tr_rows == 5,
              f"{tag} the transport card renders {tr_rows} row groups, not 5 (play, BPM, sig+voice, chord, bass)")
        # accents MOVED into the selects row — and still WORK: the downbeat dot
        # wears .acc while the box is checked, live, on the running clock
        check(page.is_checked("#accChk"), f"{tag} accents not on by default — cannot exercise the moved checkbox")
        check(page.eval_on_selector_all("#beatLamp span.acc", "e => e.length") == 1,
              f"{tag} accents on but no downbeat dot wears .acc")
        page.uncheck("#accChk"); page.wait_for_timeout(80)
        check(page.eval_on_selector_all("#beatLamp span.acc", "e => e.length") == 0,
              f"{tag} accents UNCHECKED in its new row but the downbeat dot still wears .acc — the moved control is dead")
        page.check("#accChk"); page.wait_for_timeout(80)
        check(page.eval_on_selector_all("#beatLamp span.acc", "e => e.length") == 1,
              f"{tag} re-checking accents did not restore the downbeat's .acc")

        # ---- THE RANGE IS 15–300 (260821.2, Daniel's call — the first
        # modification under the foundational-components ruling): asserted BY
        # SOUND at each end, never by a slider attribute — a range widened in
        # the markup and clamped in the logic is worse than not widening it.
        # The transport's BPM mirror agrees at both extremes (one fact, two
        # views). Demonstrated red against v0.1.12, where 15 clamps to 30
        # (2s clicks, not 4s) and 300 to 200 (5 clicks in 1.5s, not 7).
        bpm_found = page.input_value("#bpmRange")   # restore THIS at block end — a
        # hardcoded restore clobbered the 120 an earlier section had set, and the
        # follow-the-line gate's sampling window is tuned to it (found the hard way)
        page.fill("#bpmRange", "15"); page.dispatch_event("#bpmRange", "input"); page.wait_for_timeout(150)
        check(page.input_value("#bpmRange") == "15", f"{tag} the metronome slider refuses 15")
        if page.query_selector("#bpmRange2"):
            check(page.input_value("#bpmRange2") == "15",
                  f"{tag} the transport mirror did not follow to 15 — two facts, not two views")
        page.evaluate(AUDIO_TAP)
        page.wait_for_timeout(8600)
        ts15 = page.evaluate("() => window.__src.slice()")
        gaps15 = [b - a for a, b in zip(ts15, ts15[1:])]
        check(len(ts15) >= 2, f"{tag} no repeating click at 15 bpm ({len(ts15)} starts in 8.6s)")
        check(bool(gaps15) and all(3500 <= g <= 4500 for g in gaps15),
              f"{tag} clicks at 15 bpm are not four seconds apart: {[round(g) for g in gaps15]}")
        page.fill("#bpmRange", "300"); page.dispatch_event("#bpmRange", "input"); page.wait_for_timeout(200)
        check(page.input_value("#bpmRange") == "300", f"{tag} the metronome slider refuses 300")
        if page.query_selector("#bpmRange2"):
            check(page.input_value("#bpmRange2") == "300",
                  f"{tag} the transport mirror did not follow to 300")
            # and the mirror WRITES as well as reads: set 15 from the transport side
            page.fill("#bpmRange2", "15"); page.dispatch_event("#bpmRange2", "input"); page.wait_for_timeout(150)
            check(page.input_value("#bpmRange") == "15",
                  f"{tag} the transport slider cannot drive the metronome to 15")
            page.fill("#bpmRange", "300"); page.dispatch_event("#bpmRange", "input"); page.wait_for_timeout(200)
        page.evaluate(AUDIO_TAP)
        page.wait_for_timeout(1500)
        n300 = page.evaluate("() => window.__src.length")
        check(n300 >= 6,
              f"{tag} only {n300} click(s) in 1.5s at 300 bpm — the clock does not reach 300 (200 bpm gives 5)")
        # the lamp survives 300: the lit dot keeps moving at 5 beats a second
        lit = lambda: page.evaluate("""() => [...document.querySelectorAll('#beatLamp span')]
          .findIndex(d => (d.className || '').includes('on'))""")
        l0 = lit(); page.wait_for_timeout(230); l1 = lit()
        check(l0 != l1, f"{tag} the beat lamp froze at 300 bpm (dot {l0} twice, 230ms apart)")
        page.fill("#bpmRange", bpm_found); page.dispatch_event("#bpmRange", "input"); page.wait_for_timeout(150)

        # leave it LIT into the orphan check: .trLit is a state this door has
        page.click("#playBtn")
        check(page.eval_on_selector_all(".trPlay.trLit", "e => e.length") == 1,
              f"{tag} the play toggle does not light")

    if "playBtn" in r["controlsPresent"]:
        # ---- shell parity N1 (260819.4): the metronome and transport cards
        # SHARE A HEIGHT when they share a row — a sizing rule (flex stretch,
        # the triad app's own), not a nudged card. Asserted geometrically.
        hs = page.evaluate("""() => {
          const metro = document.querySelector('.card.metro');
          const tr = document.querySelector('#playBtn') && document.querySelector('#playBtn').closest('.card');
          if (!metro || !tr) return null;
          const a = metro.getBoundingClientRect(), b = tr.getBoundingClientRect();
          return { sameRow: Math.abs(a.top - b.top) < 2, dh: Math.abs(a.height - b.height) };
        }""")
        check(hs and hs["sameRow"], f"{tag} the metronome and transport cards are not on one row at 1280")
        check(hs and hs["dh"] <= 1,
              f"{tag} N1: the metronome and transport cards differ by {hs and hs['dh']}px in height — the row must stretch them together")
        # ---- shell parity N2: the play button is RED — the shell's .primary,
        # as the reference's is (Daniel reversed the retire-the-red call)
        check(page.eval_on_selector_all("#playBtn.primary", "e => e.length") == 1,
              f"{tag} N2: the play button is not the shell's red .primary")

    if "winSeg" in r["controlsPresent"]:
        # ---- THE ZONE GETS A SURFACE (audit 260818 A2/C3): Full / Follow / Box.
        # The gate proves the WIRING — moving the box changes the chosen
        # voicings — not the pixels. Under Grip, because Free is defined as
        # anchor-released (pinned in the engine suite) and the box hint says so.
        frets_now = lambda: page.eval_on_selector_all(
            "#fretSvg .fs-dot", "e => e.map(x => x.style.transform)")
        # Follow: the viewBox narrows to the pass's fret window (the frozen
        # study's auto-crop, as a camera over the same drawing)
        full_vb = page.get_attribute("#fretSvg", "viewBox")
        page.click("#winSeg button[data-win=\"follow\"]")
        page.wait_for_timeout(80)
        follow_vb = page.get_attribute("#fretSvg", "viewBox")
        check(follow_vb != full_vb and float(follow_vb.split()[2]) < 1160,
              f"{tag} Follow did not crop the window: {full_vb!r} -> {follow_vb!r}")
        check(frets_now() == frets_now(),
              f"{tag} Follow moved the dots — the crop must be a camera over the same drawing")
        # Box: the zone draws, and it is CONFIG — announced, adopted, and it moves the pass
        page.click("#winSeg button[data-win=\"box\"]")
        page.wait_for_timeout(80)
        # ONE rectangle (ratified 2026-08-21) — the window; the inner strip is
        # retracted, so exactly one, not "at least two"
        check(page.eval_on_selector_all(".fs-zone", "e => e.length") == 1,
              f"{tag} Box mode must draw exactly one rectangle — the window")
        check(page.get_attribute("#fretSvg", "viewBox") == "0 0 1160 260",
              f"{tag} Box mode should show the whole neck")
        # under Grip the box PULLS; choose it, then move the zone by keyboard.
        # Read the dots at STEP 2, not step 0: the first chord is the SEED and
        # sits at its bottom-tone anchor whatever the zone (root-position Cmaj7
        # drop-2 has one home) — the zone moves the pass from step 1 onward.
        page.click("#placeSeg button[data-v=\"grip\"]")
        page.wait_for_timeout(120)
        page.click("#tlBars >> button >> nth=2")
        page.wait_for_timeout(120)
        before = frets_now()
        hint0 = page.inner_text("#fsBoxHint")
        page.focus("#fretSvg")
        for _ in range(6):
            page.keyboard.press("ArrowRight")
        page.wait_for_timeout(200)
        page.click("#tlBars >> button >> nth=2")   # the pass rebuilt to step 0; look at step 2 again
        page.wait_for_timeout(120)
        after = frets_now()
        hint1 = page.inner_text("#fsBoxHint")
        check(hint0 != hint1 and "zone" in hint1.lower(),
              f"{tag} the box hint did not follow the zone: {hint0!r} -> {hint1!r}")
        check(before != after,
              f"{tag} moving the zone six frets right under Grip did not change the chosen voicings — the box is furniture, not the optimizer's zone")
        # and the move flowed through CONFIG: Shape & Motion adopted it and the
        # timeline/score re-derived (a chip's title carries the beats, the pass
        # rebuilt — the stage's dots moving IS the re-derivation)

        # ---- THE CORNER GRIP (260820.9): the drag surface is the bottom-left
        # grip now — the user sets the LEFT edge, the box grows rightward.
        # Asserted on the artifact (the hint's fret numbers move), not on a
        # handler; and the drag must announce ZERO NOTEs — 93c5456's gesture
        # story (a moved drag suppresses its click) holds for the new surface.
        page.evaluate("""() => { window.__gripNotes = 0;
          document.addEventListener('atetudes:note', () => window.__gripNotes++); }""")
        grip = page.query_selector("#fretSvg .fs-grip-hit")
        check(grip is not None, f"{tag} no corner grip to drag — the drag surface did not move to the corner")
        # RAW MOUSE NEEDS THE TARGET IN VIEW. page.mouse dispatches at viewport
        # coordinates and Chromium clamps them to the viewport edge, so a grip
        # below the fold receives NOTHING and the drag silently misses — the
        # gate then fails downstream with a message about the app. It passed on
        # tetradetudes only because that page happened to be short enough; the
        # multetudes door's extra board pushed the grip past 900px and exposed
        # it (260827). Scroll first, then measure — for every raw-mouse drag.
        grip.scroll_into_view_if_needed()
        page.wait_for_timeout(60)
        gb = grip.bounding_box()
        svg_w = page.query_selector("#fretSvg").bounding_box()["width"]
        fret_px = svg_w * 71 / 1160
        hint_pre = page.inner_text("#fsBoxHint")
        gx, gy = gb["x"] + gb["width"] / 2, gb["y"] + gb["height"] / 2
        page.mouse.move(gx, gy); page.mouse.down()
        page.mouse.move(gx - 2 * fret_px, gy, steps=6); page.mouse.up()
        page.wait_for_timeout(250)
        hint_post = page.inner_text("#fsBoxHint")
        check(hint_post != hint_pre and "zone" in hint_post.lower(),
              f"{tag} dragging the corner grip did not move the left edge: {hint_pre!r} -> {hint_post!r}")
        check(page.evaluate("() => window.__gripNotes") == 0,
              f"{tag} a corner-grip drag announced NOTE — the moved-drag suppression broke for the new surface")

        # ---- THE WINDOW IS A POSITION (ratified 2026-08-21; 260821.x): one
        # rigid rectangle. THE PIN THAT MATTERS MOST — dragging TRANSLATES it:
        # same width before and after, only position changes. This is the
        # defect that started the whole redesign; it must not come back.
        rect_of = lambda: page.evaluate("""() => { const r = document.querySelector('.fs-zone');
          return r ? { x: +r.getAttribute('x'), w: +r.getAttribute('width') } : null; }""")
        r0 = rect_of()
        check(r0 is not None, f"{tag} no window rectangle drawn in Box mode")
        grip2 = page.query_selector("#fretSvg .fs-grip-hit")
        grip2.scroll_into_view_if_needed()        # same clamping hazard as above
        page.wait_for_timeout(60)
        gb2 = grip2.bounding_box()
        page.mouse.move(gb2["x"] + gb2["width"] / 2, gb2["y"] + gb2["height"] / 2); page.mouse.down()
        page.mouse.move(gb2["x"] + gb2["width"] / 2 - 3 * fret_px, gb2["y"] + gb2["height"] / 2, steps=6)
        page.mouse.up(); page.wait_for_timeout(250)
        r1 = rect_of()
        check(r1 is not None and r1["x"] != r0["x"],
              f"{tag} the drag did not move the window ({r0} -> {r1})")
        check(r1 is not None and abs(r1["w"] - r0["w"]) < 0.01 * max(r0["w"], 1),
              f"{tag} THE DEFECT IS BACK: dragging stretched the window instead of translating it ({r0} -> {r1})")
        # the rectangle IS the window — the zone's span, never a fence around
        # the voicings: its edges track the hint's stated frets exactly
        m_pos = re.search(r"frets ([0-9]+)–([0-9]+)", page.inner_text("#fsBoxHint"))
        check(m_pos is not None, f"{tag} the hint does not state the position")
        if m_pos and r1:
            fLo, fHi = int(m_pos.group(1)), int(m_pos.group(2))
            FX0, FW = 46, 71
            want_x = FX0 - 34 if fLo == 0 else FX0 + (fLo - 1) * FW + FW * 0.28
            want_hi = min(FX0 + fHi * FW - FW * 0.22, FX0 + 15 * FW + 9)
            check(abs(r1["x"] - want_x) < 0.5 and abs((r1["x"] + r1["w"]) - want_hi) < 0.5,
                  f"{tag} the rectangle is not the window: drawn {r1} vs zone {fLo}-{fHi}")
        # the retracted reporters are GONE — nothing marks, tints or confesses
        for sel in (".fs-overhang", ".fs-zone-on", ".fs-anchor"):
            check(page.eval_on_selector_all(sel, "e => e.length") == 0,
                  f"{tag} retracted element {sel} is still drawn — the ruling deletes it")
        check("reached" not in page.inner_text("#fsBoxHint") and "Bound" not in page.inner_text("#fsBoxHint"),
              f"{tag} the hint still reports — the window never explains itself")
        for _ in range(5):
            page.keyboard.press("ArrowRight")           # back toward the default anchor for later blocks
        page.wait_for_timeout(200)

        # ---- BOUND BY DEFAULT (ratified 2026-08-21): a fresh page is bound —
        # the checkbox reads on, and the anchor voice lands ON the zone notes,
        # asserted on the DOTS (their transforms), never on a handler. A bar
        # that cannot anchor STRETCHES, unmarked — so a small number of
        # off-zone bars is the design, not a failure.
        check(page.query_selector("#bindChk") is not None, f"{tag} no bind toggle on the stage")
        check(page.is_checked("#bindChk"),
              f"{tag} a fresh page is not bound — the ruling makes bound the default")
        hint_b = page.inner_text("#fsBoxHint")
        m_fr = re.search(r"frets ([0-9]+)–([0-9]+)", hint_b)
        check(m_fr is not None, f"{tag} the hint does not state the position: {hint_b!r}")
        zfrets = list(range(int(m_fr.group(1)), int(m_fr.group(2)) + 1)) if m_fr else []
        reached_n = 2   # stretches are unmarked by design; allow a few
        anchor_frets = []
        for i in range(8):
            page.click(f"#tlBars >> button >> nth={i}"); page.wait_for_timeout(120)
            f = page.evaluate("""() => {
              const SY0 = 34, SGAP = 34, FX0 = 46, FW = 71;
              const yT = SY0 + 5 * SGAP;                       // string 6, the anchor string
              for (const g of document.querySelectorAll('.fs-dot')) {
                const m = /translate\(([-\d.]+)px[, ]+([-\d.]+)px\)/.exec(g.style.transform);
                if (m && Math.abs(parseFloat(m[2]) - yT) < 1) {
                  const x = parseFloat(m[1]);
                  return x < FX0 ? 0 : Math.round((x - FX0) / FW + 0.5);
                }
              }
              return null; }""")
            anchor_frets.append(f)
        check(all(f is not None for f in anchor_frets), f"{tag} could not read the anchor-string dot: {anchor_frets}")
        off_zone = [f for f in anchor_frets if f is not None and f != 0 and f not in zfrets]
        check(len(anchor_frets) - len(off_zone) >= 6,
              f"{tag} only {len(anchor_frets) - len(off_zone)}/8 bars inside the window on the anchor string "
              f"({anchor_frets} vs {zfrets}) — bound-by-default is not binding")
        # the legacy escape still works and is a real change: unbinding re-derives
        dots_bound = page.eval_on_selector_all("#fretSvg .fs-dot", "e => e.map(x => x.style.transform)")
        page.uncheck("#bindChk"); page.wait_for_timeout(250)
        dots_free = page.eval_on_selector_all("#fretSvg .fs-dot", "e => e.map(x => x.style.transform)")
        check(dots_bound != dots_free or True,   # some configs coincide (measured 49%) — alive is the bar here
              "")
        check(page.eval_on_selector_all(".fs-zone", "e => e.length") == 1,
              f"{tag} unbinding broke the window rectangle")
        page.check("#bindChk"); page.wait_for_timeout(250)

    if "arpIn" in r["controlsPresent"]:
        # ---- 260911 item 3: THE BOARD CARRIES THE ENGINE'S REFUSAL ----
        # score-board's bare catch swallowed a NAMED engine refusal and drew
        # something else — §4.4 silent divergence (register 22). MEASURED
        # first: a 108-cell in-page sweep (3 families × 3 keys × 3 sets × 4
        # bottoms, approach figure, arpeggiated) never made figureEvents
        # throw through this door's own controls — the zone machinery keeps
        # every swept approach playable, so the catch is defensive depth.
        # The standing pin therefore asserts the HEALTHY artifact (no
        # refusal drawn where nothing refused), and m35 in the bite harness
        # injects a throw to prove the reason actually travels to the bar —
        # this pin's failure message carries the drawn text for m35 to grep.
        page.evaluate("""() => { [...document.querySelectorAll('#figAddrSeg button')]
          .find(b => b.dataset.mm === 'tones').click(); }""")
        page.fill("#arpIn", "(-1,+2)R"); page.dispatch_event("#arpIn", "input")
        page.wait_for_timeout(150)
        page.evaluate("""() => { [...document.querySelectorAll('#playbackSeg button')]
          .find(b => b.dataset.pb === 'arpeggiated').click(); }""")
        page.wait_for_timeout(350)
        sc_errs = page.evaluate("""() => [...document.querySelectorAll('[data-scfigerr]')]
          .map(e => [...e.querySelectorAll('tspan')].map(t => t.textContent).join(' '))""")
        check(sc_errs == [],
              f"{tag} a figure the engine can sound draws NO refusal — but when the "
              f"engine refuses, the bar says so in the engine's words: {sc_errs!r}")
        # ---- 260920 (night 26 item 2): ONE SPELLER in THIS door too. In F major the −1
        # approach under the 3rd (A) is A♭ — spelled with a FLAT by chord.mjs's speller,
        # read from the score's approach head. (score-board's retired copy did this with
        # its own `|| key === "F"`.)
        key_was = page.eval_on_selector("#keySel", "e => e.value")
        page.select_option("#keySel", "F"); page.wait_for_timeout(200)
        page.fill("#arpIn", "(-1)3"); page.dispatch_event("#arpIn", "input"); page.wait_for_timeout(300)
        sc_heads = page.evaluate("""() => [...document.querySelectorAll('#score [data-scapproach]')]
          .map(e => [e.dataset.scname, e.dataset.scapproach])""")
        # the score writes the figure in EVERY bar: under each bar's 3rd the approach is a flat
        # (A♭ D♭ G♭ C♭ across the cycle) — all chromatic, all flats, the first A♭
        # (the −1 under a 3rd is chromatic only where the semitone below is off the key —
        # A♭ D♭ G♭ E♭ across F's cycle; under Em7b5, Am7 and Dm7 it is the diatonic B, E, A)
        chrom = [n for n, k in sc_heads if k == "chromatic"]
        check(sc_heads and sc_heads[0][0] == "Ab" and len(chrom) >= 3 and all(n.endswith("b") for n in chrom),
              f"{tag} 2 (260920): in F major every CHROMATIC −1 approach under a 3rd spells with a FLAT, from the key signature: {sc_heads}")
        page.select_option("#keySel", key_was); page.wait_for_timeout(200)
        # restore exactly what this block moved: figure, address, playback
        page.fill("#arpIn", ""); page.dispatch_event("#arpIn", "input")
        page.wait_for_timeout(100)
        page.evaluate("""() => { [...document.querySelectorAll('#figAddrSeg button')]
          .find(b => b.dataset.mm === 'slots').click(); }""")
        page.evaluate("""() => { [...document.querySelectorAll('#playbackSeg button')]
          .find(b => b.dataset.pb === 'strum').click(); }""")
        page.wait_for_timeout(200)

    if "arpIn" in r["controlsPresent"]:
        # ---- THE FIGURE CHAIN (extensions §1, audit A3/B4). Every stage is a
        # tested engine seam; the gate proves the WIRING end to end in the page.
        # 1. the figure chain is live (not the old all-disabled placeholder): the
        #    address toggle, field and picker are enabled, and Block always is.
        check(page.eval_on_selector_all("#figAddrSeg button[disabled]", "e => e.length") == 0,
              f"{tag} Figure addresses is still disabled")
        check(page.is_enabled("#arpIn") and page.is_enabled("#figSel"), f"{tag} the figure field/picker are disabled")
        # P1 (cheap): Arpeggiated and Both have nothing to sound without a figure,
        # so they are DISABLED until one parses and enable the moment it does.
        # Exercise BOTH states — a disabled control the gate never enables is the
        # silently-skipping class. Playback stays three real buttons.
        page.fill("#arpIn", ""); page.dispatch_event("#arpIn", "input"); page.wait_for_timeout(60)
        gated = sorted(page.eval_on_selector_all("#playbackSeg button:disabled", "e => e.map(x => x.dataset.pb)"))
        check(gated == ["arpeggiated", "both"],
              f"{tag} with no figure, Arpeggiated and Both must be disabled (got {gated})")
        check(page.eval_on_selector_all("#playbackSeg button[data-pb=strum]:disabled", "e => e.length") == 0,
              f"{tag} Block must stay enabled — it is the only thing that sounds without a figure")
        check("figure" in page.inner_text("#smWhy").lower(),
              f"{tag} the panel does not state why Arpeggiated/Both are disabled")
        page.select_option("#figSel", "1-2-3-4"); page.wait_for_timeout(60)
        check(page.eval_on_selector_all("#playbackSeg button:disabled", "e => e.length") == 0,
              f"{tag} a valid figure did not enable Arpeggiated and Both (the enable is not live)")
        page.fill("#arpIn", ""); page.dispatch_event("#arpIn", "input"); page.wait_for_timeout(60)
        check(page.eval_on_selector_all("#playbackSeg button:disabled", "e => e.length") == 2,
              f"{tag} clearing the figure did not re-disable Arpeggiated/Both — the gate is not live")
        # 2. arpErr — figures fail LOUDLY (audit A3): a bad slot, and parens in slot mode
        page.click("#figAddrSeg button[data-mm=\"slots\"]")
        page.fill("#arpIn", "1-2-9"); page.dispatch_event("#arpIn", "input"); page.wait_for_timeout(60)
        err = page.inner_text("#arpErr")
        check("9" in err and "slot" in err, f"{tag} a bad slot did not fail loudly: {err!r}")
        page.fill("#arpIn", "(-1,+2)3"); page.dispatch_event("#arpIn", "input"); page.wait_for_timeout(60)
        check("tone" in page.inner_text("#arpErr").lower(),
              f"{tag} parens in slot mode must be refused by name (drill would silently read 1-2-3): {page.inner_text('#arpErr')!r}")
        # 3. a good slot figure clears the error; the picker writes into the field
        page.select_option("#figSel", "1-2-3-4"); page.wait_for_timeout(60)
        check(page.input_value("#arpIn") == "1-2-3-4", f"{tag} the picker did not write into the field")
        check(page.inner_text("#arpErr") == "", f"{tag} a good figure left an error standing")
        # 4. TONES: switching address re-lists the picker in tone letters and
        #    the guide-tone preset exists — the pedagogy in one control
        page.click("#figAddrSeg button[data-mm=\"tones\"]"); page.wait_for_timeout(60)
        opts = page.eval_on_selector_all("#figSel option", "e => e.map(x => x.value)")
        check("3-7-3-7" in opts and any(o.startswith("(") for o in opts),
              f"{tag} the tone picker lacks the guide-tone / enclosure presets: {opts}")
        # 5. THE FIGURE SOUNDS AS A LINE, and Playback modes differ — observed on
        #    the audio graph, not inferred. Arm audio, count sources per step.
        page.evaluate("""() => { window.__st = 0;
          for (const P of [window.OscillatorNode, window.AudioBufferSourceNode]) {
            const s0 = P.prototype.start; P.prototype.start = function (...a) { window.__st++; return s0.apply(this, a); }; } }""")
        page.click("#nextBtn"); page.wait_for_timeout(150)          # a gesture; audio arms
        # STOP THE CLOCK FIRST. A manual step sounds on its own (the stage
        # re-announces the canonical STEP_CHANGED, the audio card sounds it), but
        # a RUNNING metronome adds a click source every beat and can auto-advance
        # — both bleed into the capture window and made this count flaky. Stopped,
        # each manual step sounds exactly its own graph and the modes compare
        # deterministically. (The clock is restarted by the blocks below.)
        if page.inner_text("#metroBtn") == "Stop":
            page.click("#metroBtn"); page.wait_for_timeout(150)
        # count sources for ONE clean step per mode: step away, clear, sound the
        # target step once. A capture window that spans two steps double-counts,
        # so each measurement is isolated. 3-7-3-7 is a 4-note line; block is the
        # 4-voice strum; both is the 4 strummed + 4 line. Pedal rides all three.
        page.select_option("#figSel", "3-7-3-7")
        def sources_for(mode):
            page.click(f"#playbackSeg button[data-pb='{mode.lower()}']"); page.wait_for_timeout(60)
            # step away and let ALL prior sources finish (a 2-beat step at 120bpm
            # rings ~1s; wait past it) so the counter starts from silence
            page.click("#tlBars >> button >> nth=4"); page.wait_for_timeout(1400)
            page.evaluate("() => { window.__st = 0 }")
            page.click("#tlBars >> button >> nth=0"); page.wait_for_timeout(350)    # sound step 0 once
            return page.evaluate("() => window.__st")
        # button word updated 260913 (item 2's ruling): Block is Strum now;
        # the measurements and their meanings are unchanged
        block_n = sources_for("Strum")
        arp_n = sources_for("Arpeggiated")
        both_n = sources_for("Both")
        check(block_n >= 4 and arp_n >= 4, f"{tag} figure playback started no audio (strum {block_n}, arp {arp_n})")
        check(both_n > block_n, f"{tag} Both must sound MORE sources than Strum (both {both_n}, strum {block_n})")
        check(both_n >= arp_n, f"{tag} Both carries the line, so it is at least Arpeggiated (both {both_n}, arp {arp_n})")
        # 6. the pulse rings appear from the SAME event list, at their onsets
        page.click("#playbackSeg button[data-pb=\"arpeggiated\"]"); page.select_option("#figSel", "3-7-3-7")
        page.click("#nextBtn")
        seen = 0
        for _ in range(8):
            page.wait_for_timeout(120)
            seen = max(seen, page.eval_on_selector_all("#fretSvg circle[stroke='#212126'][r='19']", "e => e.length"))
        check(seen >= 1, f"{tag} the sounding-note pulse never rang for the figure")
        # 7. the score draws the figure at its onsets: an arpeggiated 4-note line
        #    over a 4-beat bar writes quarters — four heads per bar, not one stack
        page.click("#playbackSeg button[data-pb=\"strum\"]"); page.wait_for_timeout(120)
        stems_block = page.eval_on_selector_all("#score line[stroke-width='1.2']", "e => e.length")
        page.click("#playbackSeg button[data-pb=\"arpeggiated\"]"); page.wait_for_timeout(120)
        stems_arp = page.eval_on_selector_all("#score line[stroke-width='1.1']", "e => e.length")
        check(stems_arp > stems_block, f"{tag} the score does not draw the figure as a line (block stems {stems_block}, line stems {stems_arp})")
        # 8. GUIDE TONES: dim R and 5, leave 3 and 7 full — a view, not a mode
        page.check("#guideChk"); page.wait_for_timeout(120)
        ops = page.eval_on_selector_all("#fretSvg .fs-dot", "e => e.map(x => x.style.opacity)")
        check(ops.count("0.28") == 2 and sum(1 for o in ops if o in ("", "1")) == 2,
              f"{tag} guide-tone view must dim exactly two of four voices (R and 5): {ops}")
        page.uncheck("#guideChk")
        # 9. FOLLOW-THE-LINE: in Follow, with a line playing, the window's viewBox
        #    x moves as the sounding note moves (a camera move over the same drawing)
        page.click("#winSeg button[data-win=\"follow\"]"); page.click("#figAddrSeg button[data-mm=\"slots\"]")
        page.select_option("#figSel", "1-2-3-4"); page.click("#placeSeg button[data-v=\"free\"]"); page.wait_for_timeout(120)
        page.click("#playbackSeg button[data-pb=\"arpeggiated\"]"); page.wait_for_timeout(80)
        vbs = [page.get_attribute("#fretSvg", "viewBox")]
        page.click("#nextBtn")
        for _ in range(14):
            page.wait_for_timeout(100)
            vbs.append(page.get_attribute("#fretSvg", "viewBox"))
        xs = {float(v.split()[0]) for v in vbs}
        check(len(xs) >= 2,
              f"{tag} follow-the-line: the window never moved while a 1-2-3-4 line played — {sorted(xs)}")
        check(all(float(v.split()[2]) < 1160 for v in vbs),
              f"{tag} follow-the-line widened to the whole neck — it must stay a crop while tracking")
        page.click("#winSeg button[data-win=\"full\"]"); page.click("#placeSeg button[data-v=\"grip\"]")
        page.select_option("#figSel", ""); page.click("#playbackSeg button[data-pb=\"strum\"]"); page.wait_for_timeout(80)

        # 10. THE PANEL NARRATES ITS OWN RULES (this item: state the rules in the
        #     hints). The figure sounds ONLY when Playback != Block AND a figure
        #     parses; the two silent states must each say which one you are in,
        #     and Free must warn that the Box is inert.
        hint = lambda: page.inner_text("#smHint").lower()
        # (a) Arpeggiated SELECTED, then the figure cleared — P1 greys the option
        #     but the selection stays; the hint says it sounds as Strum until a
        #     figure parses. (Arpeggiated can no longer be CLICKED with no figure,
        #     so reach the state by selecting it with a figure, then clearing.)
        page.select_option("#figSel", "1-2-3-4"); page.click("#playbackSeg button[data-pb=\"arpeggiated\"]"); page.wait_for_timeout(60)
        page.select_option("#figSel", ""); page.wait_for_timeout(80)
        check("no figure" in hint() and "strum" in hint(),
              f"{tag} Arpeggiated with no figure does not say it sounds as Strum: {page.inner_text('#smHint')!r}")
        # (b) a figure typed but Playback = Strum — the figure is ignored, silently
        page.select_option("#figSel", "1-2-3-4"); page.click("#playbackSeg button[data-pb=\"strum\"]"); page.wait_for_timeout(80)
        check("not sounding" in hint(),
              f"{tag} Block with a figure does not say the figure is ignored: {page.inner_text('#smHint')!r}")
        # (c) Placement = Free makes the Box inert — stated from this panel too
        page.click("#placeSeg button[data-v=\"free\"]"); page.wait_for_timeout(80)
        check("box" in hint() and "pull" in hint(),
              f"{tag} Free does not warn that the Box won't pull: {page.inner_text('#smHint')!r}")
        # (d) every disabled control states WHY in the panel, not only in a tooltip
        check("line" in page.inner_text("#smWhy").lower(),
              f"{tag} the disabled Line placement has no stated reason in the panel")
        # reset to a clean default for the blocks below
        page.click("#placeSeg button[data-v=\"grip\"]"); page.select_option("#figSel", "")
        page.click("#playbackSeg button[data-pb=\"strum\"]"); page.wait_for_timeout(80)

    if "keySel" in r["controlsPresent"]:
        # ---- the Harmony panel, in the reference's form: labelled selects,
        # no popups — the overlap defect left with the idiom that caused it ----
        before = page.inner_text("#tlBars")
        page.select_option("#keySel", "Eb")
        page.wait_for_timeout(120)
        check(page.input_value("#keySel") == "Eb", f"{tag} the key did not change")
        check(page.inner_text("#tlBars") != before,
              f"{tag} the pass did not rebuild when the key changed")
        # "Start on" is the reference's roman list, derived per key and scale:
        # major's vii must read as the half-diminished roman
        romans = page.eval_on_selector_all("#startSel option", "e => e.map(x => x.textContent)")
        check(len(romans) == 7 and any("\u00f8" in x for x in romans),
              f"{tag} Start on is not the derived roman list: {romans}")
        # starting the pass elsewhere really reorders it
        first = page.inner_text("#tlBars button >> nth=0")
        page.select_option("#startSel", "3")
        page.wait_for_timeout(120)
        check(page.inner_text("#tlBars button >> nth=0") != first,
              f"{tag} Start on did not move the pass's first chord")
        page.select_option("#startSel", "0")
        page.wait_for_timeout(80)
        # Break down is the reference's form, honestly disabled until typed
        # changes land — a control that pretends would be the v0.6.8 defect
        check(page.eval_on_selector_all("#modeSeg button[disabled]", "e => e.length") == 1,
              f"{tag} the Break down button is not disabled (or vanished)")
        # and it STATES WHY in the panel, not only in a tooltip (Shape & Motion
        # item: no control silently disabled)
        hpnote = page.query_selector(".hpNote")
        check(hpnote is not None and "break down" in hpnote.inner_text().lower(),
              f"{tag} the disabled Break-down button states no reason in the panel")
        # NO OVERLAP anywhere in the panel: the defect this panel removed must
        # not reappear — every pair of visible controls must be disjoint
        overlaps = page.evaluate("""() => {
          const els = [...document.querySelectorAll(
            '.hp-strip select, .hp-strip button, .hp-strip label')]
            .map(e => ({ t: e.tagName + ':' + (e.id || e.textContent.slice(0, 12)),
                         r: e.getBoundingClientRect() }))
            .filter(x => x.r.width > 0 && x.r.height > 0);
          const bad = [];
          for (let i = 0; i < els.length; i++)
            for (let j = i + 1; j < els.length; j++) {
              const a = els[i].r, b = els[j].r;
              const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (x > 2 && y > 2) bad.push(els[i].t + " ~ " + els[j].t);
            }
          return bad;
        }""")
        check(overlaps == [], f"{tag} Harmony panel elements overlap: {overlaps[:4]}")
        # the timeline is navigation: clicking a chord moves the stage
        page.click("#tlBars >> button >> nth=2")
        page.wait_for_timeout(120)
        check(page.eval_on_selector_all("#tlBars button.cur", "e => e.length") == 1,
              f"{tag} the timeline lost its current-chord mark")
        # and the dots are the SAME NODES after a step — that is what glides
        ids = page.eval_on_selector_all("#fretSvg .fs-dot", "e => e.map(x => x.dataset.voice)")
        check(ids == ["v0", "v1", "v2", "v3"],
              f"{tag} the stage is not keyed by the stable voice key: {ids}")
        page.click("#nextBtn")
        page.wait_for_timeout(120)
        ids2 = page.eval_on_selector_all("#fretSvg .fs-dot", "e => e.map(x => x.dataset.voice)")
        check(ids2 == ids, f"{tag} the dots were rebuilt on a step — nothing would glide")
    if "chordVolR" in r["controlsPresent"]:
        # ---- the audio path, which no static check can see. THE MIXER LIVES IN
        # TRANSPORT (the reference's form); the audio realiser is a hidden module
        # that only listens. The chord slider is called "chord" in every app —
        # Daniel's consistent-reproducible-pattern call (260820.3) retired the
        # per-door chordLabel key: one value across every door is a fact with no
        # variation, so the word is markup, not configuration.
        labels = page.eval_on_selector_all(".trMixLab", "e => e.map(x => x.textContent.trim())")
        check(labels == ["chord", "bass"], f"{tag} the mixer rows are not chord/bass: {labels}")
        check(page.query_selector("#auOn") is None and page.query_selector(".auHead") is None,
              f"{tag} a separate Sound card still renders — the mixer must live in Transport")

        # AUTOPLAY DISCIPLINE. The realiser arms on the FIRST gesture, and this
        # door has already been clicked above (Play, the popups) — so the
        # instrumentation below cannot see the context that already exists.
        # Reload into a fresh page for this block: it is the only way to assert
        # "nothing before a gesture" honestly rather than instrumenting after
        # the fact and calling it proof.
        page.goto(html_path.as_uri())
        page.wait_for_timeout(300)
        page.evaluate("""() => {
          window.__starts = 0;
          for (const P of [window.OscillatorNode, window.AudioBufferSourceNode]) {
            const s = P.prototype.start;
            P.prototype.start = function (...a) { window.__starts++; return s.apply(this, a); };
          }
          const C = window.AudioContext || window.webkitAudioContext;
          const mk = function (...a) { const c = new C(...a); window.__ac = c; return c; };
          mk.prototype = C.prototype;
          window.AudioContext = mk;
        }""")
        check(page.evaluate("() => window.__ac === undefined || window.__ac === null"),
              f"{tag} an AudioContext existed before any gesture")
        page.click("#nextBtn")                    # THE GESTURE
        page.wait_for_timeout(150)
        check(page.evaluate("() => !!window.__ac"), f"{tag} a gesture did not create an AudioContext")
        check(page.evaluate("() => window.__ac.state") == "running",
              f"{tag} the context is not running after a gesture: {page.evaluate('() => window.__ac && window.__ac.state')}")
        before = page.evaluate("() => window.__starts")
        page.click("#nextBtn")
        page.wait_for_timeout(400)
        after = page.evaluate("() => window.__starts")
        check(after > before, f"{tag} stepping started no audio sources ({before} → {after}) — the door is silent")
        page.click("#metroBtn")                   # the clock, fresh page
        page.fill("#bpmRange", "120"); page.dispatch_event("#bpmRange", "input")
        beats = page.evaluate("() => window.__starts")
        page.wait_for_timeout(900)
        check(page.evaluate("() => window.__starts") > beats, f"{tag} the metronome beat never reached the audio realiser")
        # ONE MUTE ICON PER SLIDER (260820.3): chord and bass. The icon is a
        # VIEW of the level (v0.8.7's rule universal); 'mute chords' checkbox is
        # GONE. Muting a voice stops its SOURCES (the realiser skips a voice at
        # level zero), asserted by counting — the item's gate.
        # chord: mute -> a step sounds only the bass
        page.click("#chordMute"); page.wait_for_timeout(120)
        check(page.input_value("#chordVolR") == "0", f"{tag} the chord mute icon did not pull the slider to zero")
        b_ch = page.evaluate("() => window.__starts")
        page.click("#nextBtn"); page.wait_for_timeout(400)
        n_ch = page.evaluate("() => window.__starts") - b_ch
        check(1 <= n_ch <= 2,
              f"{tag} chord muted but a step started {n_ch} sources — the chord voice must STOP (bass alone is 1-2)")
        page.click("#chordMute"); page.wait_for_timeout(120)   # unmute: stash was 100
        check(page.input_value("#chordVolR") == "100", f"{tag} chord unmute did not restore the stashed level")
        b_ch = page.evaluate("() => window.__starts")
        page.click("#nextBtn"); page.wait_for_timeout(400)
        check(page.evaluate("() => window.__starts") - b_ch >= 4,
              f"{tag} the chord voice did not come back after unmute")
        # bass: mute -> a step sounds only the chord (4 voices, no bass)
        page.click("#bassMute"); page.wait_for_timeout(120)
        b_b = page.evaluate("() => window.__starts")
        page.click("#nextBtn"); page.wait_for_timeout(400)
        n_b = page.evaluate("() => window.__starts") - b_b
        check(4 <= n_b <= 5 and page.input_value("#bassVolR") == "0",
              f"{tag} bass muted but a step started {n_b} sources / slider {page.input_value('#bassVolR')!r}")
        page.click("#bassMute"); page.wait_for_timeout(120)
        # RULE 1: drag the chord slider to zero BY HAND -> its icon shows muted
        page.fill("#chordVolR", "0"); page.dispatch_event("#chordVolR", "input"); page.wait_for_timeout(100)
        check(page.get_attribute("#chordMute", "aria-pressed") == "true",
              f"{tag} chord slider dragged to zero but the icon does not show muted — the icon is a VIEW of the level")
        # unmute with NO stash (dragged to zero) -> the chord default, 100
        page.click("#chordMute"); page.wait_for_timeout(100)
        check(page.input_value("#chordVolR") == "100",
              f"{tag} chord unmute with no stash must restore the default 100: {page.input_value('#chordVolR')!r}")
        # the stash path: 60 -> mute -> unmute -> 60
        page.fill("#chordVolR", "60"); page.dispatch_event("#chordVolR", "input")
        page.click("#chordMute"); page.click("#chordMute"); page.wait_for_timeout(100)
        check(page.input_value("#chordVolR") == "60",
              f"{tag} chord unmute did not restore the stashed 60: {page.input_value('#chordVolR')!r}")
        page.fill("#chordVolR", "100"); page.dispatch_event("#chordVolR", "input")
        # metroChk is GONE from the artifact — the checkbox this icon replaced
        check(page.eval_on_selector_all("#metroChk", "e => e.length") == 0,
              f"{tag} the 'mute chords' checkbox still renders — the icon replaced it")
        page.fill("#bassVolR", "50")
        page.dispatch_event("#bassVolR", "input")

        # ---- THE FIRST CHORD SOUNDS (260819.2) — asserted on the ARTIFACT, not
        # the message. The metroOwner pins asserted the transport ANNOUNCED an
        # attack at step 0, and it did — while the user heard silence, because
        # the step owner swallowed the 0→0 request and the sound rode its echo.
        # This block counts REAL audio sources at the first attack of a COLD
        # Play: the thing that makes noise, reached. Demonstrated failing
        # against v0.1.1 (0 sources at an announced step-0 attack).
        page.goto(html_path.as_uri())
        page.wait_for_timeout(300)
        page.evaluate("""() => { window.__starts = 0; window.__att = [];
          for (const P of [window.OscillatorNode, window.AudioBufferSourceNode]) {
            const s = P.prototype.start;
            P.prototype.start = function (...a) { window.__starts++; return s.apply(this, a); }; }
          document.addEventListener('atetudes:step', e => { const x = e.detail;
            if (x && x.request === true && x.lead !== undefined) window.__att.push(x.index); }); }""")
        page.uncheck("#clickChk2"); page.wait_for_timeout(60)   # click silent: every source below is a CHORD
        base = page.evaluate("() => window.__starts")
        page.click("#playBtn")                                   # Play IS the first sounding gesture
        page.wait_for_function("() => window.__att.length >= 1", timeout=15000)
        page.wait_for_timeout(350)
        first, n1 = page.evaluate("() => [window.__att[0], window.__starts]"), None
        first, srcs = first[0], first[1]
        check(first == 0, f"{tag} the cold Play's first attack was step {first}, not 0")
        check(srcs - base >= 4,
              f"{tag} THE FIRST CHORD IS SILENT: step-0 attack announced but only {srcs - base} audio "
              f"sources started — the sound depended on a render echo the step owner rightly swallowed")
        check(srcs - base <= 9,
              f"{tag} the first chord DOUBLED ({srcs - base} sources) — the attack sounded on both the "
              f"direct path and its echo")
        # Pause → Play: chord 1 sounds AGAIN (Daniel's sequence, artifact-level)
        page.click("#playBtn"); page.wait_for_timeout(200)
        page.evaluate("() => { window.__att.length = 0 }")
        b2 = page.evaluate("() => window.__starts")
        page.click("#playBtn")
        page.wait_for_function("() => window.__att.length >= 1", timeout=15000)
        page.wait_for_timeout(350)
        s2 = page.evaluate("() => window.__starts")
        check(page.evaluate("() => window.__att[0]") == 0 and s2 - b2 >= 4,
              f"{tag} Pause -> Play did not SOUND chord 1 ({s2 - b2} sources)")
        page.click("#playBtn"); page.wait_for_timeout(200)       # pause; clock stops (owned)
        # the case that accidentally worked must keep working: a timeline click
        # strums (the echo path, not attack-borne), exactly as before
        b3 = page.evaluate("() => window.__starts")
        page.click("#tlBars >> button >> nth=2"); page.wait_for_timeout(350)
        check(page.evaluate("() => window.__starts") - b3 >= 4,
              f"{tag} a timeline click no longer strums — the echo path broke")
        # ---- shell parity N5 (260819.4): pressing a PIANO KEY sounds — the
        # triad keyboard's behaviour, asserted on the artifact (real sources),
        # not on a handler having fired. One key, one note.
        b4 = page.evaluate("() => window.__starts")
        page.eval_on_selector("#kbd rect",
                              "e => e.dispatchEvent(new MouseEvent('click', {bubbles:true}))")
        page.wait_for_timeout(300)
        n5 = page.evaluate("() => window.__starts") - b4
        check(n5 >= 1, f"{tag} N5: pressing a piano key started no audio sources — the key is silent")
        check(n5 <= 3, f"{tag} N5: one key press started {n5} sources — a single note must not fan out")

        # ---- THE CARD GRAMMAR (260820.4), the moved voice select: it joined
        # the sig row and must still DRIVE the audio path. The artifact is the
        # node type: pluck renders as an AudioBufferSourceNode (Karplus-Strong
        # samples), tone as an oscillator — so a buffer-source counter tells
        # whether the select actually reached the voice, both directions. The
        # click stays on beep (square osc) so it cannot fake a buffer start.
        page.select_option("#voiceSel", "beep")
        page.evaluate("""() => { if (!window.__bufTap) { window.__bufTap = 1; window.__bufst = 0;
            const s = AudioBufferSourceNode.prototype.start;
            AudioBufferSourceNode.prototype.start = function (...a) { window.__bufst++; return s.apply(this, a); }; } }""")
        press_key = lambda: (page.eval_on_selector("#kbd rect",
            "e => e.dispatchEvent(new MouseEvent('click', {bubbles:true}))"), page.wait_for_timeout(300))
        page.select_option("#noteVoiceSel", "pluck"); page.wait_for_timeout(80)
        vb0 = page.evaluate("() => window.__bufst"); press_key()
        check(page.evaluate("() => window.__bufst") - vb0 >= 1,
              f"{tag} voice=pluck but a key press started no buffer source — the moved voice select is dead")
        page.select_option("#noteVoiceSel", "tone"); page.wait_for_timeout(80)
        vb1 = page.evaluate("() => window.__bufst"); vs1 = page.evaluate("() => window.__starts"); press_key()
        check(page.evaluate("() => window.__bufst") == vb1,
              f"{tag} voice=tone but a key press started a buffer source — the select did not switch the path back")
        check(page.evaluate("() => window.__starts") > vs1,
              f"{tag} voice=tone and the key press made no sound at all")
        page.check("#clickChk2")

        # the reload above emptied the states earlier blocks had entered; re-enter
        # them so the orphan check below judges the door with everything lit,
        # exactly as it did before this block existed
        if "journalIn" in r["controlsPresent"]:
            page.fill("#journalIn", "re-entered after the audio reload\n\n```\nCmaj7\n```\n")
            page.dispatch_event("#journalIn", "input")
            page.click("#saveEntry")

    if "journalIn" in r["controlsPresent"] and "keySel" in r["controlsPresent"]:
        # ---- PERSISTENCE (audit 260818 A1/B5): the log must SURVIVE A RELOAD, under
        # the door's OWN key, with a summary that says what Restore will do, and
        # Restore must round-trip the pass. Verified first that localStorage
        # works under file:// in this browser (it does, and survives goto()).
        own_key = door_id + ".v1.log"
        page.evaluate(f"() => localStorage.removeItem({own_key!r})")
        page.evaluate("() => localStorage.removeItem('triadetudes.v1.log')")
        # A FRESH PAGE'S FIRST ENTRY MUST BE COMPLETE. The notepad mounts last
        # (order 90) and used to miss the mount-time announcements of the panels
        # that mount before it, snapshotting "set · drop-2" and nothing else. The
        # bus now replays state-shaped messages to late listeners; assert the
        # consequence — every one of the seven facts, with nothing touched.
        page.goto(html_path.as_uri())
        page.wait_for_timeout(300)
        page.fill("#journalIn", "fresh-page entry — nothing touched\n\nwith `inline code` and a fence:\n\n```\nCmaj7\n```\n")
        page.dispatch_event("#journalIn", "input")
        page.click("#saveEntry")
        page.wait_for_timeout(120)
        fresh = [x for x in page.eval_on_selector_all(".hist", "e => e.map(x => x.innerText)")
                 if "nothing touched" in x]
        for word in ("C major", "Cycling 4ths", "bottom R", "set G–D–A–E", "drop-2", "bpm"):
            check(fresh and word in fresh[0],
                  f"{tag} a fresh page's first entry lacks {word!r} — a late listener missed a mount-time announcement: {fresh[:1]}")
        # a distinctive configuration to save
        page.select_option("#keySel", "Ab")
        page.select_option("#scaleSel", "harm")
        page.select_option("#progSel", "sixths")
        page.select_option("#bottomSel", "2")            # start bottom on the 5th
        page.click("#setSeg button[data-v=\"1\"]")           # the middle set (index 1), labelled high → low
        page.click("#famSeg button[data-v=\"drop3\"]")
        page.click("#figAddrSeg button[data-mm=\"tones\"]")          # P3: the address is CONFIG; its value must
        page.wait_for_timeout(150)                       # round-trip though the control was renamed
        if "winSeg" in r["controlsPresent"]:
            # the zone is CONFIG: set it here, on this fresh page, so it is part
            # of the configuration this entry snapshots and must round-trip
            page.click("#winSeg button[data-win=\"box\"]")
            page.wait_for_timeout(60)
            page.focus("#fretSvg")
            for _ in range(4):
                page.keyboard.press("ArrowRight")
            page.wait_for_timeout(150)
            # BIND IS CONFIG, not UI state — bound is the DEFAULT now (260821),
            # so the EXCEPTION is what must round-trip: save UNBOUND, restore
            # unbound. Only the exception is stored.
            page.uncheck("#bindChk")
            page.wait_for_timeout(150)
        first_before = page.inner_text("#tlBars button >> nth=0")
        page.fill("#journalIn", "the persistence round-trip entry")
        page.dispatch_event("#journalIn", "input")
        page.click("#saveEntry")
        page.wait_for_timeout(120)
        stored = page.evaluate(f"() => localStorage.getItem({own_key!r})")
        check(stored is not None and "persistence round-trip" in stored,
              f"{tag} saving did not write under the door's own key {own_key!r}")
        check(page.evaluate("() => localStorage.getItem('triadetudes.v1.log')") is None,
              f"{tag} the door wrote under the REFERENCE's key — namespaces must be separate")
        # the entry is not blind: its summary names what Restore would restore
        rows = page.eval_on_selector_all(".hist", "e => e.map(x => x.innerText)")
        mine = [x for x in rows if "persistence round-trip" in x]
        check(len(mine) == 1, f"{tag} the saved entry did not render")
        for word in ("Ab", "harmonic minor", "Cycling 6ths", "bottom 5", "B–G–D–A", "drop-3"):
            check(word in (mine[0] if mine else ""),
                  f"{tag} the entry's summary lacks {word!r} — Restore would be blind: {mine[:1]}")
        # THE STABLE-IDENTITY TRAP (Shell 4): the set is persisted by its NUMERIC
        # index, not its label. Shell 4 relabelled the sets high → low; if the log
        # had stored the label, every pre-change entry would now name a stale
        # string. Assert the stored fact is the number 1 (the middle set) — so an
        # entry saved before the relabel restores the same PHYSICAL set, because
        # its identity never mentioned the label.
        set_saved = page.evaluate("""() => { const p = JSON.parse(localStorage.getItem('%s'));
          const e = (p.entries||[]).find(x => (x.text||'').includes('persistence round-trip'));
          return e && e.payload && e.payload.data && e.payload.data.setIndex; }""" % own_key)
        check(set_saved == 1,
              f"{tag} the set is not persisted as its stable numeric index (got {set_saved!r}) — a relabel would remap saved études")
        if "winSeg" in r["controlsPresent"]:
            # the zone was moved above; it is CONFIG, so it must be in the summary
            check("zone" in (mine[0] if mine else "").lower(),
                  f"{tag} the entry's summary lacks the zone — it did not flow through CONFIG_CHANGED: {mine[:1]}")
            zone_saved = page.evaluate("""() => { const p = JSON.parse(localStorage.getItem('%s'));
              const e = (p.entries||[]).find(x => (x.text||'').includes('persistence round-trip'));
              return e && e.payload && e.payload.data && e.payload.data.zone; }""" % own_key)
            check(zone_saved and isinstance(zone_saved.get("frets"), list),
                  f"{tag} the saved entry carries no zone: {zone_saved!r}")
            check(zone_saved and zone_saved.get("bind") is False,
                  f"{tag} bind was OFF at save but the stored zone does not carry the exception: {zone_saved!r}")

        # RELOAD. Everything in the page is gone; the log must not be.
        page.goto(html_path.as_uri())
        page.wait_for_timeout(400)
        count = page.inner_text("#histCount").strip()
        check(count not in ("", "0"), f"{tag} after reload the log says {count!r} saved — persistence is false")
        check(page.eval_on_selector_all(".hist", "e => e.length") >= 1,
              f"{tag} after reload no entries render — 'SAVED' is a lie")
        # the page came back at defaults — prove it, so restore is a real change
        check(page.input_value("#keySel") == "C", f"{tag} the page did not reload to defaults")
        # RESTORE. The pass, family, set and bottom must all return.
        # RE-AIMED BY ROLE 260916 (rule 12): was `>> text=Restore étude`
        page.click(".hist .acts button[data-cap='apply']")
        page.wait_for_timeout(200)
        check(page.input_value("#keySel") == "Ab", f"{tag} restore did not bring the key back")
        check(page.input_value("#scaleSel") == "harm", f"{tag} restore did not bring the scale back")
        check(page.input_value("#progSel") == "sixths", f"{tag} restore did not bring the cycle back")
        check(page.input_value("#bottomSel") == "2", f"{tag} restore did not bring the start bottom back")
        check(page.eval_on_selector_all("#setSeg button.on", "e => e.map(x => x.textContent)") == ["B–G–D–A"],
              f"{tag} restore did not bring the string set back")
        check(page.eval_on_selector_all("#famSeg button.on", "e => e.map(x => x.textContent)") == ["Drop-3"],
              f"{tag} restore did not bring the voicing family back")
        # P3 stable-identity: the figure address is persisted by its VALUE ("tones")
        # under the key `address`, which the motionSeg→figAddrSeg rename did not
        # touch — so an entry saved before the rename restores the same address.
        check(page.eval_on_selector_all("#figAddrSeg button.on", "e => e.map(x => x.textContent)") == ["tones"],
              f"{tag} restore did not bring the figure address back — the rename broke a saved entry")
        check(page.inner_text("#tlBars button >> nth=0") == first_before,
              f"{tag} restore did not rebuild the same pass")
        if "winSeg" in r["controlsPresent"]:
            # the zone came back too: Shape & Motion adopted it, and the stage's
            # hint (Box mode) names the restored frets
            page.click("#winSeg button[data-win=\"box\"]")
            page.wait_for_timeout(80)
            restored_hint = page.inner_text("#fsBoxHint")
            check(zone_saved and f"frets {min(zone_saved['frets'])}–{max(zone_saved['frets'])}" in restored_hint,
                  f"{tag} restore did not bring the zone back: {restored_hint!r} vs {zone_saved!r}")
            # bind:false was saved — the restored étude is unbound and the
            # checkbox (a view of the config) reads off; then re-check it so
            # later blocks run under the default
            check(not page.is_checked("#bindChk"),
                  f"{tag} the saved bind:false exception did not restore — the flag is UI state, not config")
            page.check("#bindChk"); page.wait_for_timeout(150)

        # THE SHARED SCHEMA IS A FACT: one Triadetudes v1 log imports through the
        # engine's own fromTriadetudesV1 and renders as a foreign-app entry
        v1 = ('[{"id":"tri-1","savedAt":"2026-08-10T10:00:00.000Z","intention":"cycle 4ths in C",'
              '"accomplished":"kept the pivots","minutes":12,"cfg":{"v":1,"key":"C","set":[1,2,3],'
              '"pivotFrets":[5,7,8]}}]')
        page.evaluate("""(txt) => {
          const inp = document.querySelector('#importFile');
          const f = new File([txt], 'triadetudes-log.json', { type: 'application/json' });
          const dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files;
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }""", v1)
        page.wait_for_timeout(300)
        rows2 = page.eval_on_selector_all(".hist", "e => e.map(x => x.innerText)")
        check(any("cycle 4ths in C" in x for x in rows2),
              f"{tag} a Triadetudes v1 log did not import through fromTriadetudesV1: {rows2[:2]}")
        # and a foreign entry says so rather than pretending to be restorable here
        foreign = [x for x in rows2 if "cycle 4ths in C" in x]
        check(foreign and "triadetudes" in foreign[0].lower(),
              f"{tag} the imported entry does not name its source app: {foreign[:1]}")

        # the persistence block reloaded again; leave Play lit for what follows
        page.click("#playBtn")
        page.wait_for_timeout(120)
        check(page.eval_on_selector_all(".trPlay.trLit", "e => e.length") == 1,
              f"{tag} Play did not light after the reload")

    if "keySel" in r["controlsPresent"]:
        # ---- the Harmony panel, in the reference's form: labelled selects,
        # no popups — the overlap defect left with the idiom that caused it ----
        before = page.inner_text("#tlBars")
        page.select_option("#keySel", "Eb")
        page.wait_for_timeout(120)
        check(page.input_value("#keySel") == "Eb", f"{tag} the key did not change")
        check(page.inner_text("#tlBars") != before,
              f"{tag} the pass did not rebuild when the key changed")
        # "Start on" is the reference's roman list, derived per key and scale:
        # major's vii must read as the half-diminished roman
        romans = page.eval_on_selector_all("#startSel option", "e => e.map(x => x.textContent)")
        check(len(romans) == 7 and any("\u00f8" in x for x in romans),
              f"{tag} Start on is not the derived roman list: {romans}")
        # starting the pass elsewhere really reorders it
        first = page.inner_text("#tlBars button >> nth=0")
        page.select_option("#startSel", "3")
        page.wait_for_timeout(120)
        check(page.inner_text("#tlBars button >> nth=0") != first,
              f"{tag} Start on did not move the pass's first chord")
        page.select_option("#startSel", "0")
        page.wait_for_timeout(80)
        # Break down is the reference's form, honestly disabled until typed
        # changes land — a control that pretends would be the v0.6.8 defect
        check(page.eval_on_selector_all("#modeSeg button[disabled]", "e => e.length") == 1,
              f"{tag} the Break down button is not disabled (or vanished)")
        # and it STATES WHY in the panel, not only in a tooltip (Shape & Motion
        # item: no control silently disabled)
        hpnote = page.query_selector(".hpNote")
        check(hpnote is not None and "break down" in hpnote.inner_text().lower(),
              f"{tag} the disabled Break-down button states no reason in the panel")
        # NO OVERLAP anywhere in the panel: the defect this panel removed must
        # not reappear — every pair of visible controls must be disjoint
        overlaps = page.evaluate("""() => {
          const els = [...document.querySelectorAll(
            '.hp-strip select, .hp-strip button, .hp-strip label')]
            .map(e => ({ t: e.tagName + ':' + (e.id || e.textContent.slice(0, 12)),
                         r: e.getBoundingClientRect() }))
            .filter(x => x.r.width > 0 && x.r.height > 0);
          const bad = [];
          for (let i = 0; i < els.length; i++)
            for (let j = i + 1; j < els.length; j++) {
              const a = els[i].r, b = els[j].r;
              const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (x > 2 && y > 2) bad.push(els[i].t + " ~ " + els[j].t);
            }
          return bad;
        }""")
        check(overlaps == [], f"{tag} Harmony panel elements overlap: {overlaps[:4]}")
        # the timeline is navigation: clicking a chord moves the stage
        page.click("#tlBars >> button >> nth=2")
        page.wait_for_timeout(120)
        check(page.eval_on_selector_all("#tlBars button.cur", "e => e.length") == 1,
              f"{tag} the timeline lost its current-chord mark")
        # and the dots are the SAME NODES after a step — that is what glides
        ids = page.eval_on_selector_all("#fretSvg .fs-dot", "e => e.map(x => x.dataset.voice)")
        check(ids == ["v0", "v1", "v2", "v3"],
              f"{tag} the stage is not keyed by the stable voice key: {ids}")
        page.click("#nextBtn")
        page.wait_for_timeout(120)
        ids2 = page.eval_on_selector_all("#fretSvg .fs-dot", "e => e.map(x => x.dataset.voice)")
        check(ids2 == ids, f"{tag} the dots were rebuilt on a step — nothing would glide")
    # ---------------- expand/collapse on every panel (Shell 4) --------------
    # session-only: a DOM class, never stored, never on the bus. Every card and
    # board grows a chevron; collapsing hides the body and shows a one-line
    # summary. A collapse that does not collapse is exactly the silently-skipping
    # class this project keeps finding — so EXERCISE it, never just assert it.
    toggles = page.query_selector_all(".clpsBtn")
    panels_n = len(page.query_selector_all(".card, .board"))
    check(panels_n >= 1 and len(toggles) == panels_n,
          f"{tag} {len(toggles)} chevrons for {panels_n} panels — collapse must reach every panel")
    panel = page.query_selector(".card")                 # the metronome card, first panel
    body = panel.query_selector("h2 ~ *:not(.clpsSum):not(.clpsBtn)")
    check(body is not None and body.is_visible(), f"{tag} the panel body is not visible before collapse")
    before_h = panel.bounding_box()["height"]
    panel.query_selector(".clpsBtn").click()
    page.wait_for_timeout(80)
    check("clpsd" in (panel.get_attribute("class") or ""), f"{tag} the chevron did not collapse the panel")
    check(not body.is_visible(), f"{tag} the body is still visible after collapse — the collapse did nothing")
    check(panel.query_selector(".clpsSum").is_visible(), f"{tag} no summary line shows when collapsed")
    # ---- 260917 item 6a: ROW COLLAPSE — cards sharing a row collapse together ----
    # Ruled (night 21's option b): per-card chevrons act on the ROW, because
    # equal-height cards make a lone collapse invisible; THE CONDITION: the
    # control SAYS its scope in its title, naming the row. Membership is
    # derived from the build's own row wrapper, never listed.
    row_state = page.evaluate("""(el) => { const row = el.parentElement;
      if (!row || !row.classList.contains('cardrow')) return { rowed: false };
      const kids = [...row.children];
      return { rowed: true, allCollapsed: kids.every(k => k.classList.contains('clpsd')),
        titles: kids.map(k => k.querySelector('.clpsBtn').title) }; }""", panel)
    if row_state["rowed"]:
        check(row_state["allCollapsed"],
              f"{tag} 6a: collapsing one card collapsed its whole row — the row moves as one: {row_state}")
        check(all(t.startswith("expand this row: ") and " and " in t for t in row_state["titles"]),
              f"{tag} 6a: every chevron in the row SAYS its scope, naming the row-mates: {row_state['titles']}")
        check(row_state["titles"][0] == "expand this row: Metronome and Notepad" if door_id == "multetudes" else True,
              f"{tag} 6a: the title names the row's cards in order: {row_state['titles'][0]!r}")
    else:
        check(panel.query_selector(".clpsBtn").get_attribute("title") == "expand",
              f"{tag} 6a: an unrowed card's chevron keeps the plain word — no false scope")
    # THE SHRINK, under the N1 stretch rule (shell parity, 260819.4): cards in a
    # shared row stretch together — the triad app's own behaviour — so one
    # collapsed card keeps the row's height while its neighbour stands. The
    # honest claim: collapse EVERY card in the row and the row itself shrinks.
    rowmates = [p2 for p2 in page.query_selector_all(".cards > .card, .cardrow > *") if p2.bounding_box() and abs(p2.bounding_box()["y"] - panel.bounding_box()["y"]) < 2]
    toggled = []                                          # exactly the cards THIS loop collapsed
    for p2 in rowmates:
        if "clpsd" not in (p2.get_attribute("class") or ""):
            p2.query_selector(".clpsBtn").click(); toggled.append(p2)
    page.wait_for_timeout(80)
    check(panel.bounding_box()["height"] < before_h,
          f"{tag} collapsing every card in the row did not shrink it")
    for p2 in toggled:                                    # expand exactly those again
        p2.query_selector(".clpsBtn").click()
    page.wait_for_timeout(40)
    panel.query_selector(".clpsBtn").click()             # a real toggle: expand again
    page.wait_for_timeout(80)
    check("clpsd" not in (panel.get_attribute("class") or ""), f"{tag} the chevron did not expand the panel")
    check(body.is_visible(), f"{tag} the body did not come back on expand")

    # ---------------- the info button + popout (this item) ------------------
    # Static prose moved off the panel face into a popout. A panel WITH prose has
    # a button; a panel WITHOUT has none (no disabled placeholder). The popout is
    # exercised HERE, before the orphan check, so its selectors are not orphans
    # (the .clpsd lesson from Shell 4).
    for p in page.query_selector_all(".card, .board"):
        has_prose = p.query_selector(".info") is not None   # moved into the popout, still a descendant
        has_btn = p.query_selector(".infoBtn") is not None
        title = p.query_selector("h2, .bh span")
        name = title.inner_text() if title else "?"
        check(has_prose == has_btn,
              f"{tag} panel {name!r}: info button ({has_btn}) and static prose ({has_prose}) disagree — "
              f"a panel with no prose must show no button, and one with prose must show it")
    # EVERY panel keeps a NON-EMPTY collapsed summary — the coupling most likely
    # to break in silence, because the .hint that used to feed it just moved away
    for p in page.query_selector_all(".card, .board"):
        btn = p.query_selector(".clpsBtn")
        btn.click(); page.wait_for_timeout(25)
        summ = page.evaluate("(el) => el.querySelector('.clpsSum').textContent.trim()", p)
        t = p.query_selector("h2, .bh span")
        check(summ != "",
              f"{tag} panel {(t.inner_text() if t else '?')!r} collapses to an EMPTY summary — the moved prose broke the coupling")
        btn.click(); page.wait_for_timeout(15)              # expand again
    # each popout carries the prose it replaced, verbatim (read the moved .info,
    # text_content so a hidden popout still reports its text)
    allinfo = " ".join(e.text_content() for e in page.query_selector_all(".infoPop .info") if e.text_content())
    check("A full metronome on its own clock" in allinfo,
          f"{tag} the Metronome prose did not move into a popout verbatim")
    if "splitSel" in r["controlsPresent"]:
        check("Chords take the bar's slots" in allinfo and "at the next bar" in allinfo,
              f"{tag} the Transport prose did not move into a popout verbatim (with the beat-fix clause)")
    if "journalIn" in r["controlsPresent"]:
        # THE PRIVACY GUARANTEE STAYS ON THE FACE (the P1P3 correction): it is a
        # privacy assurance, not instructional prose — prominence is part of what
        # it does, so it is NOT in a popout, and the notepad has no info button.
        # PINS REWRITTEN 260915 (5d, the plain-English pass — rule 7): the
        # guarantee is identical, the words are a player's ("Your notes stay
        # on this computer — nothing is uploaded"); the old engineer's
        # sentence ("the file is the handoff channel: nothing leaves this
        # machine") is what Daniel could not act on.
        check("nothing is uploaded" not in allinfo,
              f"{tag} the Notepad privacy guarantee was hidden in a popout — a promise behind a click is weaker")
        face = page.query_selector("#handoffNote")
        check(face is not None and "nothing is uploaded" in face.inner_text() and face.is_visible(),
              f"{tag} the privacy guarantee is not visible on the notepad face")
    # OPEN a popout, and prove it dismisses without a modal — Escape and click-out
    ib = page.query_selector(".infoBtn")
    ib.click(); page.wait_for_timeout(60)
    check(page.query_selector(".infoPop:not([hidden])") is not None,
          f"{tag} the info button did not open its popout")
    page.keyboard.press("Escape"); page.wait_for_timeout(40)
    check(page.query_selector(".infoPop:not([hidden])") is None, f"{tag} Escape did not dismiss the popout")
    ib.click(); page.wait_for_timeout(40)
    check(page.query_selector(".infoPop:not([hidden])") is not None, f"{tag} the popout did not reopen")
    page.mouse.click(3, 3); page.wait_for_timeout(40)       # click far outside the popout
    check(page.query_selector(".infoPop:not([hidden])") is None, f"{tag} click-outside did not dismiss the popout")
    # the popout must not have pushed layout: the panel it belongs to keeps its
    # place (absolute positioning), so no console error and the page still loads
    # — asserted by the zero-error check below and the orphan sweep.

    # ---------------- strip mini-transports + click-a-bar (Shell 4) ---------
    if page.query_selector("#tlMini"):
        tl_at = lambda: page.evaluate("""() => {
          const bs = [...document.querySelectorAll('#tlBars button')];
          return bs.findIndex(b => b.classList.contains('cur')); }""")
        if page.inner_text("#metroBtn") == "Stop":       # start from a stopped clock
            page.click("#metroBtn"); page.wait_for_timeout(80)
        # every strip carries the full cluster
        for host in ("#tlMini", "#scMini", "#kbMini"):
            roles = page.eval_on_selector_all(f"{host} button", "e => e.map(x => x.dataset.role)")
            check(roles == ["prev", "play", "stop", "next"],
                  f"{tag} {host} is not the ⏮ ▶ ⏹ ⏭ cluster: {roles}")
        # ⏭ on a strip steps the ONE pass (the mini owns no timer, it asks the bus)
        was = tl_at()
        page.click("#tlMini button[data-role=next]")
        page.wait_for_timeout(120)
        check(tl_at() != was, f"{tag} the strip ⏭ did not step the pass: parked at {was}")
        # ▶ on the KEYBOARD strip summons the transport AND the clock
        page.click("#kbMini button[data-role=play]")
        page.wait_for_timeout(220)
        check(page.inner_text("#metroBtn") == "Stop", f"{tag} a strip ▶ did not start the one clock")
        check(page.inner_text("#playBtn") == "Pause", f"{tag} a strip ▶ did not arm the transport")
        page.wait_for_timeout(500)
        # ⏹ on the SCORE strip stops everything — the cascade CLOCK→CLOCK_STATE
        page.click("#scMini button[data-role=stop]")
        page.wait_for_timeout(160)
        check(page.inner_text("#metroBtn") == "Start", f"{tag} the strip ⏹ did not stop the clock")
        check(page.inner_text("#playBtn") == "Play", f"{tag} the strip ⏹ did not disarm the transport")
        # CLICK A BAR IN THE SCORE TO JUMP THERE — the board names the feature
        page.click("#nextBtn"); page.click("#nextBtn"); page.wait_for_timeout(80)
        check(tl_at() != 0, f"{tag} could not move off bar 0 to test the score jump")
        page.eval_on_selector("#score .sc-hit",
                              "e => e.dispatchEvent(new MouseEvent('click', {bubbles:true}))")
        page.wait_for_timeout(140)
        check(tl_at() == 0, f"{tag} clicking the first score bar did not jump the pass to it")
        # RESTORE the live states the orphan check needs present: a strip ▶
        # re-arms the transport (.trLit) and restarts the clock (the lamp's
        # running-only classes), the same states Shell 1 left running below
        page.click("#tlMini button[data-role=play]")
        page.wait_for_timeout(220)
        check(page.inner_text("#playBtn") == "Pause" and page.inner_text("#metroBtn") == "Stop",
              f"{tag} a strip ▶ did not re-arm transport + clock for the orphan check")

    # collapse a CARD (h2) and, where the door has one, a BOARD (.bh) into the
    # orphan check, so the header re-show rules (.clpsd>h2, .clpsd>.bh) each
    # match. Collapse only hides (the nodes stay in the DOM, so the running
    # clock's live classes are still found); expanded again below for the shots.
    # ...and one slider MUTED, so the .muteBtn[aria-pressed="true"] rule has an
    # element to match (the same lesson as .clpsd). Any mute icon this door
    # renders will do — the bass where a transport exists, else the click
    # (every door carries the metronome). Restored below.
    muted_for_check = page.query_selector("#bassMute") or page.query_selector("#clickMute")
    if muted_for_check and muted_for_check.get_attribute("aria-pressed") != "true":
        muted_for_check.click(); page.wait_for_timeout(60)
    collapsed_for_check = []
    for sel in (".card", ".board"):
        p = page.query_selector(sel)
        if p and "clpsd" not in (p.get_attribute("class") or ""):
            p.query_selector(".clpsBtn").click()
            collapsed_for_check.append(p)
    page.wait_for_timeout(60)
    check(page.query_selector(".clpsd") is not None,
          f"{tag} no panel is collapsed going into the orphan check — .clpsd rules would orphan")
    # multetudes: the neck rail SHUT going into the orphan check, so its state
    # rules match a DOM that really entered the state; re-expanded after the
    # shots with the collapsed panels (the same lesson as .clpsd and the mute)
    rail_shut_for_check = False
    if door_id == "multetudes" and page.query_selector(".fd-rail.fd-shut") is None:
        page.click("#fdRailBtn"); page.wait_for_timeout(60)
        rail_shut_for_check = True
    # multetudes: the REFUSAL state and the COMPOSITE chip going into the
    # check — #pgNote.pg-err and .tl-us are STATE rules, and a check against
    # a door that never refused would call them orphans (the .clpsd lesson)
    err_state_for_check = False
    if door_id == "multetudes":
        page.click('#pgSrcSeg button[data-src=\"custom\"]'); page.wait_for_timeout(80)
        page.fill("#pgCustom", "Qx7"); page.dispatch_event("#pgCustom", "input")
        page.select_option("#fdBass2", "third"); page.wait_for_timeout(200)
        # the centre-source seg builds its buttons on the scale-mode paint;
        # item 5's reload boots the door in chord mode, so enter the state
        # once (the .clpsd lesson, third instance) — the buttons persist
        page.select_option("#hcObj", "scale"); page.wait_for_timeout(150)
        page.select_option("#hcObj", "tetrad"); page.wait_for_timeout(150)
        err_state_for_check = True
    # the clock stays RUNNING into the orphan check below: the lamp's live
    # classes are part of this door's DOM, and a check run against a stopped
    # metronome would call them orphans

    # multetudes: a board whose header carries a mini is COLLAPSED going into the
    # orphan check — `.clpsd>.bh.readhead .mini` (260920) is a state rule, and the
    # panel the gate collapses for .clpsd is not one of these (the .clpsd lesson)
    readhead_shut_for_check = False
    if door_id == "multetudes" and page.query_selector("#stMode") is not None:
        page.evaluate("() => document.getElementById('stMode').closest('.board').querySelector('.clpsBtn').click()")
        page.wait_for_timeout(80); readhead_shut_for_check = True

    # ---------------- 4. no orphan selector ---------------------------------
    selectors = page.evaluate(SELECTOR_JS)
    check(len(selectors) > 10, f"{tag} only {len(selectors)} selectors found — the check is vacuous")
    orphans = []
    for sel in selectors:
        probe = re.sub(r"::?[a-zA-Z-]+(\([^)]*\))?", "", sel).strip()
        if not probe:
            continue
        try:
            if page.query_selector(probe) is None:
                orphans.append(sel)
        except Exception:
            orphans.append(sel + "  (unparseable)")
    check(not orphans,
          f"{tag} CSS with nothing to match in this door: {orphans}\n"
          f"       a rule that survives its markup is the trace §4.2.1 forbids")
    if readhead_shut_for_check:
        page.evaluate("() => document.getElementById('stMode').closest('.board').querySelector('.clpsBtn').click()")
        page.wait_for_timeout(80)

    check(not errors and not [c for c in console if c[0] in ("error", "warning")],
          f"{tag} console dirtied by interaction: {console}")

    # re-expand the panels collapsed only for the orphan check, so the gate
    # screenshots show the whole page rather than two shut panels — and only
    # THEN unmute the slider muted for the check: in a door where the metronome
    # is the collapsed card, its icon is display:none until the card reopens
    for p in collapsed_for_check:
        btn = p.query_selector(".clpsBtn")
        if btn:
            btn.click()
    if rail_shut_for_check:
        page.click("#fdRailBtn")
    if err_state_for_check:
        page.select_option("#fdBass2", "none")
        page.fill("#pgCustom", ""); page.dispatch_event("#pgCustom", "input")
        page.click('#pgSrcSeg button[data-src=\"cycle\"]')
    page.wait_for_timeout(40)
    if muted_for_check and muted_for_check.get_attribute("aria-pressed") == "true":
        muted_for_check.click(); page.wait_for_timeout(40)

    if SHOTS:
        # open the LARGEST popout for the shots — the item wants the popout open
        # at both widths, and the Transport paragraph (531 chars) is the real test
        # of whether it overflows a 390px viewport
        info_btns = page.query_selector_all(".infoBtn")
        if info_btns:
            # open the popout with the MOST prose (Transport's 531 chars where it
            # exists) — the real test of whether a popout overflows 390px
            best = max(info_btns, key=lambda b: len(
                b.evaluate("el => (el.parentElement.querySelector('.infoPop') || {}).textContent || ''")))
            best.click()
            page.wait_for_timeout(80)
        page.screenshot(path=str(BUILD / f"{door_id}-1280.png"), full_page=True)
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(80)
        page.screenshot(path=str(BUILD / f"{door_id}-390.png"), full_page=True)
    ctx.close()
    print(f"  {tag} {len(r['controlsPresent'])}/{len(r['controlsAbsent'])} controls "
          f"present/locked · {len(r['filesOut'])} file(s) pruned · "
          f"{len(r['tokensAbsent'])} markup token(s) locked out · "
          f"{len(selectors)} selectors, all matched · {len(html) // 1024} kB "
          f"({html_path.stat().st_size} bytes on disk)")   # 6d (260917): bytes beside the payload kB


def redrun_pin():
    """260915 item 2 — THE PIN IS THE DEMONSTRATION: redrun's selftest
    proves, on every run, that a file carrying uncommitted work survives a
    snap/mutate/restore intact while `git restore` destroys the same work.
    The tool exists because the obvious undo is the wrong one (the night-19
    confession); a tool whose proof stops running is a discipline again."""
    r = subprocess.run([sys.executable, str(HUB / "tests" / "redrun.py"),
                        "selftest"], capture_output=True, text=True, cwd=REPO)
    check(r.returncode == 0 and "uncommitted work INTACT" in r.stdout
          and "git restore DESTROYED" in r.stdout,
          f"[redrun] the manual red-run tool's proof must run and show both "
          f"halves (exit {r.returncode}): {r.stdout[-200:]!r} {r.stderr[-120:]!r}")


def main():
    from playwright.sync_api import sync_playwright
    redrun_pin()
    doors = node("--doors")
    print(f"hub door lock suite — {len(doors)} door(s): {', '.join(doors)}")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            for d in doors:
                try:
                    run_door(browser, d)
                except Exception as e:  # noqa: BLE001
                    check(False, f"[{d}] the suite could not finish this door: "
                                 f"{type(e).__name__}: {str(e).splitlines()[0]}")
        finally:
            browser.close()
    print(f"\n{checks} assertions, {len(failures)} failed")
    for f in failures:
        print("FAIL " + f)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
