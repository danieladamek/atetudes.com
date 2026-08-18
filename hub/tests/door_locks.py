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

        # leave it LIT into the orphan check: .trLit is a state this door has
        page.click("#playBtn")
        check(page.eval_on_selector_all(".trPlay.trLit", "e => e.length") == 1,
              f"{tag} the play toggle does not light")

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
        page.click("#winSeg >> text=Follow")
        page.wait_for_timeout(80)
        follow_vb = page.get_attribute("#fretSvg", "viewBox")
        check(follow_vb != full_vb and float(follow_vb.split()[2]) < 1160,
              f"{tag} Follow did not crop the window: {full_vb!r} -> {follow_vb!r}")
        check(frets_now() == frets_now(),
              f"{tag} Follow moved the dots — the crop must be a camera over the same drawing")
        # Box: the zone draws, and it is CONFIG — announced, adopted, and it moves the pass
        page.click("#winSeg >> text=Box")
        page.wait_for_timeout(80)
        check(page.eval_on_selector_all(".fs-zone", "e => e.length") >= 2,
              f"{tag} Box mode did not draw the zone and its box")
        check(page.get_attribute("#fretSvg", "viewBox") == "0 0 1160 260",
              f"{tag} Box mode should show the whole neck")
        # under Grip the box PULLS; choose it, then move the zone by keyboard.
        # Read the dots at STEP 2, not step 0: the first chord is the SEED and
        # sits at its bottom-tone anchor whatever the zone (root-position Cmaj7
        # drop-2 has one home) — the zone moves the pass from step 1 onward.
        page.click("#placeSeg >> text=Grip")
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

    if "arpIn" in r["controlsPresent"]:
        # ---- THE FIGURE CHAIN (extensions §1, audit A3/B4). Every stage is a
        # tested engine seam; the gate proves the WIRING end to end in the page.
        # 1. the segment and field are live (no longer disabled)
        check(page.eval_on_selector_all("#playbackSeg button[disabled]", "e => e.length") == 0,
              f"{tag} Playback is still disabled")
        check(page.eval_on_selector_all("#motionSeg button[disabled]", "e => e.length") == 0,
              f"{tag} Figure addresses is still disabled")
        check(page.is_enabled("#arpIn") and page.is_enabled("#figSel"), f"{tag} the figure field/picker are disabled")
        # 2. arpErr — figures fail LOUDLY (audit A3): a bad slot, and parens in slot mode
        page.click("#motionSeg >> text=slots")
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
        page.click("#motionSeg >> text=tones"); page.wait_for_timeout(60)
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
            page.click(f"#playbackSeg >> text={mode}"); page.wait_for_timeout(60)
            # step away and let ALL prior sources finish (a 2-beat step at 120bpm
            # rings ~1s; wait past it) so the counter starts from silence
            page.click("#tlBars >> button >> nth=4"); page.wait_for_timeout(1400)
            page.evaluate("() => { window.__st = 0 }")
            page.click("#tlBars >> button >> nth=0"); page.wait_for_timeout(350)    # sound step 0 once
            return page.evaluate("() => window.__st")
        block_n = sources_for("Block")
        arp_n = sources_for("Arpeggiated")
        both_n = sources_for("Both")
        check(block_n >= 4 and arp_n >= 4, f"{tag} figure playback started no audio (block {block_n}, arp {arp_n})")
        check(both_n > block_n, f"{tag} Both must sound MORE sources than Block (both {both_n}, block {block_n})")
        check(both_n >= arp_n, f"{tag} Both carries the line, so it is at least Arpeggiated (both {both_n}, arp {arp_n})")
        # 6. the pulse rings appear from the SAME event list, at their onsets
        page.click("#playbackSeg >> text=Arpeggiated"); page.select_option("#figSel", "3-7-3-7")
        page.click("#nextBtn")
        seen = 0
        for _ in range(8):
            page.wait_for_timeout(120)
            seen = max(seen, page.eval_on_selector_all("#fretSvg circle[stroke='#212126'][r='19']", "e => e.length"))
        check(seen >= 1, f"{tag} the sounding-note pulse never rang for the figure")
        # 7. the score draws the figure at its onsets: an arpeggiated 4-note line
        #    over a 4-beat bar writes quarters — four heads per bar, not one stack
        page.click("#playbackSeg >> text=Block"); page.wait_for_timeout(120)
        stems_block = page.eval_on_selector_all("#score line[stroke-width='1.2']", "e => e.length")
        page.click("#playbackSeg >> text=Arpeggiated"); page.wait_for_timeout(120)
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
        page.click("#winSeg >> text=Follow"); page.click("#motionSeg >> text=slots")
        page.select_option("#figSel", "1-2-3-4"); page.click("#placeSeg >> text=Free"); page.wait_for_timeout(120)
        page.click("#playbackSeg >> text=Arpeggiated"); page.wait_for_timeout(80)
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
        page.click("#winSeg >> text=Full"); page.click("#placeSeg >> text=Grip")
        page.select_option("#figSel", ""); page.click("#playbackSeg >> text=Block"); page.wait_for_timeout(80)

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
        page.click("#setSeg >> text=B–G–D–A")           # the middle set (index 1), labelled high → low
        page.click("#famSeg >> text=Drop-3")
        page.wait_for_timeout(150)
        if "winSeg" in r["controlsPresent"]:
            # the zone is CONFIG: set it here, on this fresh page, so it is part
            # of the configuration this entry snapshots and must round-trip
            page.click("#winSeg >> text=Box")
            page.wait_for_timeout(60)
            page.focus("#fretSvg")
            for _ in range(4):
                page.keyboard.press("ArrowRight")
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
        page.click(".hist >> text=Restore étude")
        page.wait_for_timeout(200)
        check(page.input_value("#keySel") == "Ab", f"{tag} restore did not bring the key back")
        check(page.input_value("#scaleSel") == "harm", f"{tag} restore did not bring the scale back")
        check(page.input_value("#progSel") == "sixths", f"{tag} restore did not bring the cycle back")
        check(page.input_value("#bottomSel") == "2", f"{tag} restore did not bring the start bottom back")
        check(page.eval_on_selector_all("#setSeg button.on", "e => e.map(x => x.textContent)") == ["B–G–D–A"],
              f"{tag} restore did not bring the string set back")
        check(page.eval_on_selector_all("#famSeg button.on", "e => e.map(x => x.textContent)") == ["Drop-3"],
              f"{tag} restore did not bring the voicing family back")
        check(page.inner_text("#tlBars button >> nth=0") == first_before,
              f"{tag} restore did not rebuild the same pass")
        if "winSeg" in r["controlsPresent"]:
            # the zone came back too: Shape & Motion adopted it, and the stage's
            # hint (Box mode) names the restored frets
            page.click("#winSeg >> text=Box")
            page.wait_for_timeout(80)
            restored_hint = page.inner_text("#fsBoxHint")
            check(zone_saved and f"frets {min(zone_saved['frets'])}–{max(zone_saved['frets'])}" in restored_hint,
                  f"{tag} restore did not bring the zone back: {restored_hint!r} vs {zone_saved!r}")

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
    check(panel.bounding_box()["height"] < before_h, f"{tag} collapsing did not shrink the panel")
    panel.query_selector(".clpsBtn").click()             # a real toggle: expand again
    page.wait_for_timeout(80)
    check("clpsd" not in (panel.get_attribute("class") or ""), f"{tag} the chevron did not expand the panel")
    check(body.is_visible(), f"{tag} the body did not come back on expand")

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
    collapsed_for_check = []
    for sel in (".card", ".board"):
        p = page.query_selector(sel)
        if p and "clpsd" not in (p.get_attribute("class") or ""):
            p.query_selector(".clpsBtn").click()
            collapsed_for_check.append(p)
    page.wait_for_timeout(60)
    check(page.query_selector(".clpsd") is not None,
          f"{tag} no panel is collapsed going into the orphan check — .clpsd rules would orphan")
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

    # re-expand the panels collapsed only for the orphan check, so the gate
    # screenshots show the whole page rather than two shut panels
    for p in collapsed_for_check:
        btn = p.query_selector(".clpsBtn")
        if btn:
            btn.click()
    page.wait_for_timeout(40)

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
