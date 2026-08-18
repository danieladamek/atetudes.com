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
    for tok in r["tokensAbsent"]:
        for form in (f'id="{tok}"', f'class="{tok}"', f"#{tok}", f".{tok}"):
            check(form not in html,
                  f"{tag} built file contains {form!r} — {tok} belongs to a module "
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
        pal = page.query_selector("#journalControls >> text=Palette")
        check(pal is not None, f"{tag} the surface did not auto-append Palette")
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
        head0 = page.inner_text("#trHead")
        page.click("#playBtn")
        page.wait_for_timeout(150)
        check(page.inner_text("#playBtn") == "Pause", f"{tag} the transport did not arm")
        check(page.inner_text("#metroBtn") == "Stop",
              f"{tag} pressing Play did not start the grid — the transport asked for a clock it did not get")

        # THE PLAYHEAD AGREES WITH THE PASS. At 120 BPM with one chord per beat,
        # ~2 s is about four chord changes; the head must move and must land on
        # the same step the stage rendered.
        page.wait_for_timeout(2200)
        pips = page.eval_on_selector_all("#trHead .trPip", "e => e.length")
        now = page.eval_on_selector_all("#trHead .trNow", "e => e.length")
        check(pips > 1, f"{tag} the playhead has {pips} steps — it never learned the pass length")
        check(now == 1, f"{tag} the playhead marks {now} current steps, not exactly one")
        headIdx = page.evaluate("""() => {
          const ps = [...document.querySelectorAll('#trHead .trPip')];
          return ps.findIndex(p => p.classList.contains('trNow'));
        }""")
        curChord = page.eval_on_selector_all("#tlBars button.cur", "e => e.length")
        tlIdx = page.evaluate("""() => {
          const bs = [...document.querySelectorAll('#tlBars button')];
          return bs.findIndex(b => b.classList.contains('cur'));
        }""")
        check(curChord == 1, f"{tag} the timeline lost its current chord while playing")
        check(headIdx == tlIdx,
              f"{tag} the playhead says step {headIdx} and the pass says {tlIdx} — "
              f"a transport that drifts from what you hear is worse than none")
        check(page.inner_text("#trHead") != head0 or headIdx > 0,
              f"{tag} the playhead never moved")

        # pausing stops the walk but leaves the position where it was
        page.click("#playBtn")
        page.wait_for_timeout(60)
        check(page.inner_text("#playBtn") == "Play", f"{tag} the transport did not pause")
        parked = page.evaluate("""() => {
          const ps = [...document.querySelectorAll('#trHead .trPip')];
          return ps.findIndex(p => p.classList.contains('trNow'));
        }""")
        page.wait_for_timeout(600)
        check(page.evaluate("""() => {
          const ps = [...document.querySelectorAll('#trHead .trPip')];
          return ps.findIndex(p => p.classList.contains('trNow'));
        }""") == parked, f"{tag} the playhead kept walking after pause")

        # leave it LIT into the orphan check: .trLit is a state this door has
        page.click("#playBtn")
        check(page.eval_on_selector_all(".trPlay.trLit", "e => e.length") == 1,
              f"{tag} the play toggle does not light")

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
        # that only listens. Its label is the door's own `present.chordLabel`.
        want = ((r.get("present") or {}).get("chordLabel") or "chord").lower()
        got = page.inner_text("#chordVolLab").strip()
        check(got == want, f"{tag} the mixer's chord slider says {got!r}, the door says {want!r}")
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
        # the mixer ramps rather than steps, and zero is legal; mute chords IS the
        # chord slider at zero — one state, two views (the reference's rule)
        page.fill("#chordVolR", "0")
        page.dispatch_event("#chordVolR", "input")
        check(page.is_checked("#metroChk"), f"{tag} the chord slider at zero did not tick 'mute chords'")
        page.uncheck("#metroChk")
        check(page.input_value("#chordVolR") != "0", f"{tag} unticking 'mute chords' did not restore the level")
        page.fill("#bassVolR", "50")
        page.dispatch_event("#bassVolR", "input")
        # the reload above emptied the states earlier blocks had entered; re-enter
        # them so the orphan check below judges the door with everything lit,
        # exactly as it did before this block existed
        if "journalIn" in r["controlsPresent"]:
            page.fill("#journalIn", "re-entered after the audio reload\n\n```\nCmaj7\n```\n")
            page.dispatch_event("#journalIn", "input")
            page.click("#saveEntry")
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
    # the clock stays RUNNING into the orphan check below: the lamp's live
    # classes are part of this door's DOM, and a check run against a stopped
    # metronome would call them orphans

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

    check(not errors and not [c for c in console if c[0] in ("error", "warning")],
          f"{tag} console dirtied by interaction: {console}")

    if SHOTS:
        page.screenshot(path=str(BUILD / f"{door_id}-1280.png"), full_page=True)
        page.set_viewport_size({"width": 390, "height": 844})
        page.screenshot(path=str(BUILD / f"{door_id}-390.png"), full_page=True)
    ctx.close()
    print(f"  {tag} {len(r['controlsPresent'])}/{len(r['controlsAbsent'])} controls "
          f"present/locked · {len(r['filesOut'])} file(s) pruned · "
          f"{len(r['tokensAbsent'])} markup token(s) locked out · "
          f"{len(selectors)} selectors, all matched · {len(html) // 1024} kB")


def main():
    from playwright.sync_api import sync_playwright
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
