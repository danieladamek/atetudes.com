"""_red_effects.py — THE ROOT'S RED, ENFORCED ON THE PIXELS (night 81, dispatch 261048 part 1).

Spec v1.6 §7 rule 8 lends the Root's red (#B82929, and the shell token --red that IS it) to three places only, and says
a check enforces the list. Until tonight the check keyed on SOURCE LINES (engine/tests/degree-red.test.mjs) — and a line
cannot see what a rule paints: Save sat red on five pages under the line granted as Play (night 80). This is the check
on what is PAINTED.

THE HARD PART — MUSICAL RED AND BORROWED RED ARE THE SAME PIXELS. Told apart by PROVENANCE, never by a list of
elements (rule 6). Each page is loaded from a temp copy in which every SOURCE the red may lawfully come from is re-tinted
with its own sentinel, one unit off the Root and invisible to the eye:

    the palette's Root (`FAM_COLOR = {` …)          → MUSICAL   #B8292A
    the key (register 35: `#hcKey{`)                 → KEY       #B8292B
    every line a GRANTED ledger entry names          → BORROWING n: #B8292C (1) · #B8292D (2) · #B8292E (3)
    a GENERATED page's degree data (literals outside <style> — its DATA, legend and chips; the line check's named gap)
                                                     → MUSICAL

Then every painted element is read. EXACTLY #B82929 means the red came from no palette, no key and no grant: a LEAK, and
the gate is red. A BORROWING sentinel painted by a STYLESHEET rule must also be that borrowing's ROLE (the ledger's
GRANTS[*].role — Play and the beat lamp by address; borrowing 3 by role names): a granted rule reaching an element it
was not granted for is the Save species, and the gate is red. (A borrowing painted INLINE — a style or SVG attribute
written by the granted line's own code — paints exactly what that code wraps; no selector can spill.)

SCOPE, stated (rule 16):
  PAGES   the four hub doors (hub/build — byte-identical to the published copies after an ingest; a door is gated
          BEFORE its ingest, so the build IS the artifact under review) and every MAINTAINED detected study (the three
          hand/generated pages, from static/). tetrad-voice-leading is frozen (R3): printed EXMT.
  STATES  1280×900: the page as it opens; with a notepad entry saved (so Delete exists); and with the metronome RUNNING,
          sampled ten times across about a bar (the first beat lights only while it plays). Transitions and animations
          are switched off in the tinted copy, so no colour is read mid-fade.
  ELEMENTS every element, HIDDEN ONES TOO — a computed paint resolves under display:none, and a hidden red is still a red
          (night 80's narrowing also un-reddened the hidden "Save and clear", which no visible-only scan could see).
  PAINT   color (elements with their own text, and form controls, which draw their own), background-color, the four
          border colours (where that border has width and a style), outline-color (with an outline style),
          text-decoration-color (when decorated), accent-color (form controls), fill and stroke (SVG shapes and text),
          stop-color, box-shadow and text-shadow colours, background-image gradients — on every element and on
          ::before/::after — in ANY alpha (the Root at 6% alpha hid from the hex-only line check until tonight).
  ROLES   each painted element traces to ONE ledger line (a sentinel per entry). A stylesheet paint must be its
          borrowing's role: Play and the first beat by address (GRANTS[*].role), refusal/error/destructive by role
          NAMES. The key's red may paint only the key (KEY_ROLE). Inline paints (a style or SVG attribute written by the
          granted line's own code) paint exactly what that code wraps and are not role-checked.
  COVERAGE the scan prints, per granted line, whether it was SEEN painting; a line never seen is NAMED with a count, never
          silent (most refusals only paint in error states the scan does not drive).
  NOT SEEN, named:
    - FURNITURE THAT READS THE PALETTE: a control painted with FAM_COLOR.R comes out MUSICAL and passes. The approach's
      real blind spot. (Proposed, not built: pin which element KINDS may be painted musical.)
    - borrowing 3's role is by NAME (err|danger|refus|assert on the element or an ancestor): a CSS rule whose own
      selector holds the name passes by construction, and an err-named container blesses its descendants.
    - error and refusal states the scan does not enter; :hover/:focus/@media-only reds; canvas, raster images, iframes,
      shadow DOM, color-mix() — none present in the scanned pages today; the Hugo wrapper, its navbar logo (the "@"
      in Root red — the brand mark) and the favicon.
    - colours a script writes after the last sample.
"""
import json
import re
import subprocess
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ROOT = "B82929"
SENT = {"musical": "B8292A", "key": "B8292B", 1: "B8292C", 2: "B8292D", 3: "B8292E"}
RGB = lambda h: f"rgb({int(h[0:2], 16)}, {int(h[2:4], 16)}, {int(h[4:6], 16)})"
NAME = {RGB(v): k for k, v in SENT.items()}
LEAK = RGB(ROOT)

SCAN_JS = r"""(args) => {
  const [LEAK, SENTS, ADDR] = args;   // ADDR: { borrowing → its role's address }, from the ledger's GRANTS
  const want = new Set([LEAK, ...SENTS]);
  const out = [];
  /* every colour in a value, in ANY alpha (night 81: the Root at 6% alpha hid from a hex-only check); alpha 0 paints nothing */
  const colours = (v) => [...(v || '').matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/g)]
    .filter((m) => m[4] === undefined || +m[4] > 0).map((m) => `rgb(${m[1]}, ${m[2]}, ${m[3]})`);
  const read = (cs, el, pseudo) => {
    const hits = [];
    const add = (prop, v) => { for (const k of colours(v)) if (want.has(k)) hits.push([prop, k]); };
    const ownText = pseudo ? (cs.content && cs.content !== 'none' && cs.content !== 'normal')
      : [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
        || (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(el.tagName) && ((el.value || '') + (el.textContent || '')).trim() !== '');   // a control draws its own text (the key is a <select>)
    if (ownText || el instanceof SVGTextContentElement) add('color', cs.color);
    add('background-color', cs.backgroundColor);
    for (const side of ['Top', 'Right', 'Bottom', 'Left'])
      if (parseFloat(cs['border' + side + 'Width']) > 0 && cs['border' + side + 'Style'] !== 'none') add('border-' + side.toLowerCase() + '-color', cs['border' + side + 'Color']);
    if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) add('outline-color', cs.outlineColor);
    if (cs.textDecorationLine && cs.textDecorationLine !== 'none') add('text-decoration-color', cs.textDecorationColor);
    if (/^(INPUT|SELECT|PROGRESS|METER)$/.test(el.tagName)) add('accent-color', cs.accentColor);
    if (el instanceof SVGGeometryElement || el instanceof SVGTextContentElement) { if (cs.fill !== 'none') add('fill', cs.fill); if (cs.stroke !== 'none') add('stroke', cs.stroke); }
    if (el instanceof SVGStopElement) add('stop-color', cs.stopColor);
    add('box-shadow', cs.boxShadow); add('text-shadow', cs.textShadow); add('background-image', cs.backgroundImage);
    return hits;
  };
  const inlineHas = (el, k) => { const s = (el.getAttribute('style') || '') + ' ' + (el.getAttribute('fill') || '') + ' ' + (el.getAttribute('stroke') || '');
    const m = k.match(/(\d+), (\d+), (\d+)/); const hex = '#' + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, '0')).join('');
    const bare = k.replace(/[^\d,]/g, '');
    return s.toLowerCase().includes(hex) || s.replace(/\s/g, '').includes(bare); };
  const desc = (el) => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.getAttribute('class') ? '.' + el.getAttribute('class').trim().split(/\s+/).join('.') : ''))
    + ((el.textContent || '').trim() ? ' "' + el.textContent.trim().slice(0, 30) + '"' : '');
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);   // hidden elements TOO: their computed paint resolves, and a hidden red is a red
    const shown = el.checkVisibility ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : true;
    for (const pseudo of [null, '::before', '::after']) {
      const pcs = pseudo ? getComputedStyle(el, pseudo) : cs;
      if (pseudo && (!pcs.content || pcs.content === 'none' || pcs.content === 'normal')) continue;
      for (const [prop, k] of read(pcs, el, pseudo))
        out.push({ el: desc(el) + (pseudo || '') + (shown ? '' : ' (hidden)'), prop, colour: k, inline: !pseudo && inlineHas(el, k),
                   names: [el, ...(function* (e) { while ((e = e.parentElement)) yield e; })(el)].slice(0, 8)
                     .map((e) => [e.id, e.getAttribute('class'), ...[...e.attributes].filter((a) => a.name.startsWith('data-')).map((a) => a.name + '=' + a.value)].join(' ')).join(' | '),
                   roles: Object.fromEntries(Object.entries(ADDR).map(([n, a]) => [n, !!el.closest(a)])) });
    }
  }
  return out;
}"""


def ledger():
    """the ledger, the grants and the pages — read from the one ledger module and the census, never retyped here"""
    r = subprocess.run(["node", "--input-type=module", "-e",
        'import { LEDGER, GRANTS, KEY_ROLE } from "./engine/tests/_red-ledger.mjs";'
        'import { STUDY_SLUGS, CENSUS } from "./engine/tests/_carriers.mjs";'
        'import { isMaintained, FAMILY, FLOOR_SCOPE } from "./engine/tests/_family.mjs";'
        'const detected = STUDY_SLUGS.filter((s) => CENSUS.get(s).source === "detected");'
        'console.log(JSON.stringify({ ledger: LEDGER, grants: GRANTS, key_role: KEY_ROLE,'
        ' pages: detected.filter(isMaintained), frozen: detected.filter((s) => !isMaintained(s)),'
        ' r3: FLOOR_SCOPE.frozen.exempt.metronome }));'], cwd=REPO, capture_output=True, text=True)
    if r.returncode:
        raise SystemExit("the red ledger could not be read: " + r.stderr.strip()[-300:])
    return json.loads(r.stdout.strip().splitlines()[-1])


def generated_pages():
    out = set()
    for py in (REPO / "generators").glob("*.py"):
        m = re.search(r'^PUBLISHED = "([^"]+)"', py.read_text(), re.M)
        if m:
            out.add(m.group(1))
    return out


RED_RX = re.compile(r"#B82929|var\(--red\)|rgba?\(\s*184\s*,\s*41\s*,\s*41", re.I)


def sentinel(i):
    """ledger entry i's own sentinel — one blue unit per entry, after MUSICAL (42) and KEY (43)"""
    return f"B829{44 + i:02X}"


def _to(sent):
    """the replacement for one match, in the match's own form (rgb/rgba stays rgb/rgba with its alpha)"""
    r, g, b = int(sent[0:2], 16), int(sent[2:4], 16), int(sent[4:6], 16)
    return lambda m: (f"rgb{'a' if m.group(0).lower().startswith('rgba') else ''}({r},{g},{b}"
                      if m.group(0).lower().startswith("rgb") else "#" + sent)


def _span(line, start):
    """a CSS construct runs from its selector to the next '}'; anything else is its whole line"""
    end = line.find("}", start)
    return (start, end + 1 if end >= 0 else len(line))


def tint(text, rel, entries, generated):
    """every LAWFUL source of the red re-tinted with its own sentinel, INSIDE ITS CONSTRUCT ONLY — a second red appended
    to a granted line is left raw and reads as a leak"""
    lines, inside = text.split("\n"), False
    tinted = {"musical": 0, "key": 0}
    for i, line in enumerate(lines):
        if re.search(r"<style[\s>]", line):
            inside = True
        if RED_RX.search(line):
            new = line
            for e in entries:
                p = new.find(e["match"])
                if p < 0:
                    continue
                # a CSS rule's match ENDS with its "{" — scoped to that rule; any other match (JS, possibly holding
                # `${…}` slots) is its whole line
                a, b = _span(new, p) if e["match"].rstrip().endswith("{") else (0, len(new))
                seg = RED_RX.sub(_to(sentinel(e["i"])), new[a:b])
                if seg != new[a:b]:
                    new = new[:a] + seg + new[b:]; e["_tinted"] = e.get("_tinted", 0) + 1
            k = new.find("#hcKey{")
            if k >= 0:
                a, b = _span(new, k); new = new[:a] + RED_RX.sub(_to(SENT["key"]), new[a:b]) + new[b:]; tinted["key"] += 1
            if re.search(r"\bFAM_COLOR = \{", new):
                new = re.sub(r'(\bR:\s*")#B82929(")', r"\g<1>#" + SENT["musical"] + r"\2", new, count=1, flags=re.I); tinted["musical"] += 1
            elif rel in generated and not inside and "var(--red)" not in new:
                new = re.sub(r"#B82929", "#" + SENT["musical"], new, flags=re.I); tinted["musical"] += 1
            lines[i] = new
        if "</style>" in line:
            inside = False
    return "\n".join(lines), tinted


def effect_scan(browser, check, build_dir, log=print):
    L = ledger()
    KEY_ROLE = L["key_role"]
    num = {k: g["borrowing"] for k, g in L["grants"].items()}
    roles = {g["borrowing"]: g["role"] for g in L["grants"].values()}
    for i, e in enumerate(L["ledger"]):
        e["i"], e["n_borrow"] = i, num.get(e.get("granted"))
    NAME = {RGB(SENT["musical"]): "musical", RGB(SENT["key"]): "key"}
    for e in L["ledger"]:
        NAME[RGB(sentinel(e["i"]))] = e["i"]
    addresses = {str(n): r["address"] for n, r in roles.items() if "address" in r}
    addresses["key"] = KEY_ROLE
    generated = generated_pages()
    for s in L["frozen"]:
        log(f"  EXMT  {s} · golden rule 8 effect-scan — exempt, not passing: {L['r3']}")
    pages = [(f"door:{p.stem}", p, None) for p in sorted(Path(build_dir).glob("*.html"))]
    pages += [(s, REPO / f"static/studies/{s}/study.html", f"static/studies/{s}/study.html") for s in L["pages"]]
    tmp = Path(tempfile.mkdtemp(prefix="red-effects-"))
    total = {"elements": 0, "pages": 0}
    table = {}   # entry index → {"tinted": pages, "painted": count}
    from _empty_guard import absent_ok
    for name, path, rel in pages:
        if rel is None:   # a door carries the source lines of exactly the files it reaches — the resolver's own list
            r = subprocess.run(["node", "hub/tools/resolve.mjs", path.stem, "--json"], cwd=REPO, capture_output=True, text=True)
            reach = set(json.loads(r.stdout)["filesIn"])
            entries = [dict(e) for e in L["ledger"] if e.get("n_borrow") and e["where"] in reach]
        else:
            entries = [dict(e) for e in L["ledger"] if e.get("n_borrow") and
                       (e["where"] == rel or (rel in generated and e["where"].startswith("generators/")))]
        text, tinted = tint(path.read_text(), rel or "", entries, generated)
        missed = [f'{e["where"]} "{e["match"]}"' for e in entries if not e.get("_tinted")]
        check(not missed, f"[{name}] golden rule 8 effect-scan: granted ledger line(s) this page should carry were not "
                          f"found to re-tint — their pixels would read as leaks, or be missed: {missed[:4]}")
        for e in entries:
            if e.get("_tinted"):
                table.setdefault(e["i"], {"tinted": 0, "painted": 0})["tinted"] += 1
        copy = tmp / f"{name.replace(':', '-')}.html"; copy.write_text(text)
        for state in ("as it opens", "a notepad entry saved", "the metronome running"):
            ctx = browser.new_context(viewport={"width": 1280, "height": 900}); page = ctx.new_page()
            page.goto(copy.as_uri()); page.wait_for_timeout(700)
            # no colour is read mid-transition: an interpolated value is neither the Root nor a sentinel
            page.add_style_tag(content="*,*::before,*::after{transition:none!important;animation:none!important}")
            if state == "the metronome running":
                with absent_ok("a page without a metronome has no running state to scan; skipped, said in the log"):
                    has_metro = page.query_selector("#metroBtn") is not None
                if not has_metro:
                    log(f"  [{name}] red effect-scan, {state}: no metronome on this page — state not entered"); ctx.close(); continue
                page.click("#metroBtn")
                hits, seen = [], set()
                for _ in range(10):   # about a bar at the boot tempo, sampled: the first beat lights only while it plays
                    page.wait_for_timeout(130)
                    for h in page.evaluate(SCAN_JS, [LEAK, list(NAME.keys()), addresses]):
                        k = (h["el"], h["prop"], h["colour"])
                        if k not in seen:
                            seen.add(k); hits.append(h)
                page.click("#metroBtn")
            elif state != "as it opens":
                with absent_ok("a page without a notepad has no Delete to scan; the state is skipped, said in the log"):
                    has_pad = page.query_selector("#journalIn") is not None
                if not has_pad:
                    log(f"  [{name}] red effect-scan, {state}: no notepad on this page — state not entered"); ctx.close(); continue
                page.fill("#journalIn", "a note for the red scan"); page.dispatch_event("#journalIn", "input")
                page.click("#saveEntry"); page.wait_for_timeout(350)
            if state != "the metronome running":
                hits = page.evaluate(SCAN_JS, [LEAK, list(NAME.keys()), addresses])
            ctx.close()
            total["pages"] += 1; total["elements"] += len(hits)
            by = {}
            for h in hits:
                kind = NAME.get(h["colour"], "LEAK")
                if kind == "LEAK":
                    by["LEAK"] = by.get("LEAK", 0) + 1
                    check(False, f"[{name}] golden rule 8 (effect-scan, {state}): {h['el']} is painted the Root's red "
                                 f"({h['prop']}) and traces to no palette, no key and no granted ledger line — a fourth red")
                    continue
                if kind == "key":
                    by["key"] = by.get("key", 0) + 1
                    check(h["roles"].get("key", False), f"[{name}] golden rule 8 (effect-scan, {state}): {h['el']} carries the "
                          f"KEY's red ({h['prop']}) but is not the key ({KEY_ROLE}) — register 35 gives --red to the key alone")
                    continue
                if kind == "musical":
                    by["musical"] = by.get("musical", 0) + 1; continue
                e = L["ledger"][kind]; n = e["n_borrow"]
                by[f"b{n}"] = by.get(f"b{n}", 0) + 1
                table.setdefault(kind, {"tinted": 0, "painted": 0})["painted"] += 1
                if not h["inline"]:
                    role = roles[n]
                    ok = h["roles"].get(str(n), False) if "address" in role else bool(re.search(role["names"], h["names"], re.I))
                    check(ok, f"[{name}] golden rule 8 (effect-scan, {state}): {h['el']} is painted by borrowing {n}'s "
                              f"granted rule {e['where']} \"{e['match']}\" ({h['prop']}) but is not that borrowing's role "
                              f"({json.dumps(role)}) — a granted rule reaching an element it was not granted for (the Save species)")
            log(f"  [{name}] red effect-scan, {state}: " + (", ".join(f"{k} {v}" for k, v in sorted(by.items())) or "no red painted"))
    check(total["pages"] >= 6 and total["elements"] > 0,
          f"golden rule 8 effect-scan not vacuous: {total['pages']} page-states, {total['elements']} painted elements read")
    # THE PER-ENTRY TABLE (rule 2 — a granted line the scan never sees paint is named, with a count, never silent)
    unexercised = [e for e in L["ledger"] if e.get("n_borrow") and table.get(e["i"], {}).get("painted", 0) == 0]
    log(f"  golden rule 8 effect-scan: {total['pages']} page-states, {total['elements']} red-family paints read · "
        f"{len(L['ledger']) - len(unexercised)} of {len(L['ledger'])} granted lines SEEN painting in the scanned states · "
        f"{len(unexercised)} NOT EXERCISED (their state is not entered, or they paint nothing):")
    for e in unexercised:
        t = table.get(e["i"], {}).get("tinted", 0)
        log(f"      not exercised · b{e['n_borrow']} · {e['where']} \"{e['match']}\" · re-tinted on {t} page(s), painted on 0")
    return total
