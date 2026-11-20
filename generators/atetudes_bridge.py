"""atetudes_bridge.py — THE GENERATOR BRIDGE (night 39, 261003; Daniel 260923: "The generator
inlines them").

A generator-emitted study page (modes-from-pentatonic-boxes, tetrad-voice-leading) cannot
import engine/*.mjs — it is one self-contained file, built by Python. This module reads the
engine modules and the hub cards and emits them INLINE, in the HAND-INLINE CONVENTION the
carrier census already matches (engine/tests/_carriers.mjs: "every inline convention strips or
blanks imports — the hand-inlined studies REMOVE the line, the door build blanks it").

THE CONVENTION, chosen: the hand-inlined studies' — import lines REMOVED, `export ` stripped,
one IIFE per module with its imports bound as consts from the modules emitted before it, the
module's own text otherwise BYTE-FAITHFUL. Why this one and not the door build's: the whole-
module drift pins (notepad.test, metronome.test, …) match pre-hub carriers CONTIGUOUSLY in
exactly this form (`inlineForm`: drop "import " lines, strip `^export `, trim), and a door's
blanked import lines break that contiguity — so a generator page, which is a pre-hub app to
the census ("detected"), takes the hand form and is pinned by every existing test. Nothing
reformats, minifies or re-indents: the 40+ character segments survive verbatim by construction.

Nothing here is a list of what a page carries: `engine_inline(names)` walks the modules'
own imports for the order, and the census DETECTS the result by scanning the page.
"""
import json
import re
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
ENGINE = REPO / "engine"
HUB = REPO / "hub"

# the ONE accepted import form (hub/tools/resolve.mjs refuses every other) — parsed the same way
IMPORT_RE = re.compile(r'^import \{ ([^}]*) \} from "\./([\w-]+)\.mjs";\s*$', re.M)
EXPORT_RE = re.compile(r'^export (?:async )?(?:function\*? |const |let |class )([A-Za-z_$][\w$]*)', re.M)


def ns_of(mod):
    """the page-level name a module's IIFE returns into: engine/notepad-surface.mjs → M_NOTEPAD_SURFACE.
    Prefixed, because a module may export a name spelt like its own file (structures.mjs exports
    STRUCTURES): a binding `const { STRUCTURES } = STRUCTURES` would read its own declaration"""
    return "M_" + mod.upper().replace("-", "_")


def module_source(mod):
    return (ENGINE / f"{mod}.mjs").read_text()


def imports_of(src):
    """[(names[], module)] in source order — the one accepted form, or a loud refusal"""
    out = []
    for line in src.split("\n"):
        if line.startswith("import "):
            m = IMPORT_RE.match(line)
            if not m:
                raise ValueError(f"an import the bridge cannot bind (the one accepted form is "
                                 f'`import {{ a, b }} from "./x.mjs";`): {line!r}')
            out.append(([n.strip() for n in m.group(1).split(",") if n.strip()], m.group(2)))
    return out


def exports_of(src):
    names = EXPORT_RE.findall(src)
    if not names:
        raise ValueError("a module with nothing to export")
    return names


def inline_form(src):
    """the hand-inline form of a module's text — the whole-module pins' `inlineForm`, verbatim:
    drop the import lines, strip `export `, no leading newlines, exactly one trailing newline"""
    body = "\n".join(l for l in src.split("\n") if not l.startswith("import "))
    body = re.sub(r"^export ", "", body, flags=re.M)
    body = re.sub(r"^\n+", "", body)
    body = re.sub(r"\n+$", "\n", body)
    return body


def reach_of(names):
    """the modules `names` reach, in dependency order — walked from their own imports"""
    order, seen = [], set()

    def visit(mod, stack=()):
        if mod in seen:
            return
        if mod in stack:
            raise ValueError("an import cycle: " + " → ".join(stack + (mod,)))
        for _, dep in imports_of(module_source(mod)):
            visit(dep, stack + (mod,))
        seen.add(mod)
        order.append(mod)

    for n in names:
        visit(n)
    return order


def engine_inline(names):
    """the JS text that inlines `names` and everything they reach, one IIFE per module"""
    parts = []
    for mod in reach_of(names):
        src = module_source(mod)
        # `a as b` in an import is `a: b` in a destructuring binding (palette.mjs aliases motion's parse)
        bind = lambda ns: ", ".join(n.replace(" as ", ": ") for n in ns)
        bindings = "".join(f"const {{ {bind(ns)} }} = {ns_of(dep)};\n" for ns, dep in imports_of(src))
        parts.append(f"const {ns_of(mod)} = (() => {{\n{bindings}{inline_form(src)}"
                     f"return {{ {', '.join(exports_of(src))} }};\n}})();\n")
    return "".join(parts)


# ---------------- the hub cards: markup and styles, the module's own bytes ----------------
PART_REGION = re.compile(r"<!--part:([\w-]+)-->([\s\S]*?)<!--/part:\1-->")


def _card_literal(card, key):
    """the card module's `key` string AS THE MODULE EVALUATES IT — the bytes the door build ships and host-conformance
    compares (`metronomeCard.markup`). Night 77: this read the template's SOURCE text until then, so a `${…}` in a card
    (hub/tempo.mjs's constant, hub/bpm-field.mjs's one bpm field) would have been emitted raw into a generated page — the
    reason night 72 had to pin a typed 72 in the card. Evaluated, a card with no interpolation gives the same bytes."""
    export = card.split("-")[0] + "".join(w.title() for w in card.split("-")[1:])   # metronome-card → metronomeCard
    r = subprocess.run(["node", "--input-type=module", "-e",
                        f'import {{ {export} }} from "./hub/modules/{card}.mjs"; '
                        f'const v = {export}[{json.dumps(key)}]; if (typeof v !== "string") process.exit(3); process.stdout.write(v);'],
                       cwd=REPO, capture_output=True, text=True)
    if r.returncode != 0:
        raise ValueError(f"{card}.mjs has no string `{key}` (node exit {r.returncode}): {r.stderr.strip()[:200]}")
    return r.stdout


def card_markup(card, seated=()):
    """hub/tools/parts.mjs's markupWithout: seated parts removed, all markers stripped"""
    markup = _card_literal(card, "markup")
    return PART_REGION.sub(lambda m: "" if m.group(1) in seated else m.group(2), markup)


def card_part(card, name):
    """one named part of a card's markup — what a host seats elsewhere"""
    markup = _card_literal(card, "markup")
    parts = [m.group(2) for m in PART_REGION.finditer(markup) if m.group(1) == name]
    if not parts:
        raise ValueError(f"{card}.mjs marks no part `{name}`")
    return "".join(parts)


def card_styles(card):
    return _card_literal(card, "styles")


def metronome_rows():
    """metronome-card's FOUR ROW GROUPS — the family constant GRAMMAR_HOSTS counts — sliced from
    the module between the transport row and the collapse summary, as host-conformance's
    card-carrier pin slices it; the h2, the summary and the info prose are the host's"""
    markup = _card_literal("metronome-card", "markup")
    a, b = markup.index('  <div class="transport">'), markup.index('  <div class="clpsum"')
    return markup[a:b]


def clock_field_css():
    """the one bpm field's look — hub/bpm-field.mjs's BPM_FIELD_STYLES, VERBATIM (night 77). A door gets it from the
    build (any door reaching that file); a page without the build takes the same bytes from here, stated once, read
    from the module as it evaluates — never retyped. host-conformance pins it on every maintained carrier."""
    r = subprocess.run(["node", "--input-type=module", "-e",
                        'import { BPM_FIELD_STYLES } from "./hub/bpm-field.mjs"; process.stdout.write(BPM_FIELD_STYLES);'],
                       cwd=REPO, capture_output=True, text=True)
    if r.returncode != 0 or ".clk-bpm{" not in r.stdout:
        raise ValueError(f"hub/bpm-field.mjs states no .clk-bpm rule ({r.stderr.strip()[:200]})")
    return r.stdout.strip("\n")


def metronome_guarantee():
    """the shared-component sentence every carrier must say, read from the card's own prose"""
    markup = _card_literal("metronome-card", "markup")
    m = re.search(r"\(Shared component: (every At-Etudes app carries this\s+metronome, first block, this look)\.\)", markup)
    if not m:
        raise ValueError("metronome-card.mjs no longer states the family guarantee")
    return re.sub(r"\s+", " ", m.group(1))


# the family's page grammar for a page WITHOUT the shell — the card styles above name only their
# own tokens; these are the rules the cards sit in (.card/.transport/.bpmrow/.row2/.chk/…), taken
# from the appliance page (static/studies/metronome/study.html), the family's own metronome look
def card_shell_tokens():
    """THE CARD SHELL'S TOKENS (261119, shell 1.0.0): hub/card-shell.mjs's TOKENS, read from its source — the one
    copy. {skin: [(name, hex or None), …]} in the module's own order."""
    src = (HUB / "card-shell.mjs").read_text()
    body = re.search(r"^export const TOKENS = Object\.freeze\(\{([\s\S]*?)^\}\);", src, re.M).group(1)
    skins = {}
    for m in re.finditer(r"^\s*(\w+): Object\.freeze\(\{ (.*?) \}\),$", body, re.M):
        skins[m.group(1)] = [(k, None if v == "null" else v.strip('"')) for k, v in re.findall(r'(\w+): ("#[0-9A-F]{6}"|null)', m.group(2))]
    if set(skins) != {"door", "page"} or any(len(v) != 6 for v in skins.values()):
        raise ValueError(f"atetudes_bridge: card-shell.mjs's TOKENS did not read as two skins of six: {skins}")
    return skins


def degree_root_colour():
    """the Root's colour, lent to chrome as --red by rule 8 — read from engine/degree-palette.mjs, never typed"""
    m = re.search(r'FAM_COLOR = \{ R: "(#[0-9A-F]{6})"', module_source("degree-palette"))
    if not m:
        raise ValueError("atetudes_bridge: engine/degree-palette.mjs gave no Root colour")
    return m.group(1)


def tokens_css(skin, extra=()):
    """card-shell.mjs's tokensCss(skin, extra), the same text: the skin's tokens then extra's, nulls left out, four
    declarations to a line. host-conformance and vendor-shell.test hold the page to the JS function's bytes."""
    decl = [f"--{k}:{v};" for k, v in [*card_shell_tokens()[skin], *extra] if v is not None]
    return ":root{\n" + "\n".join("  " + " ".join(decl[i:i + 4]) for i in range(0, len(decl), 4)) + "\n}"


def shell_css():
    """the door skin's tokens and the one shell rule the carried cards rely on — from hub/card-shell.mjs (261119; it was
    sliced from hub/shell.mjs until the card shell became the one copy), never restated. 261005: the cards' styles say
    var(--line), the --red token, var(--card), var(--edge) and size their messages through the shell's `.hint`; a page
    that carries the cards without these renders borderless buttons, a black Delete and a 16px import message (seen in
    the night-41 renders). host-conformance computes the token list from the carried styles and asserts each resolves
    on the page."""
    src = (HUB / "card-shell.mjs").read_text()
    hint = re.search(r"^export const HINT_CSS = `(\.hint\{[^}]*\})\n`;$", src, re.M).group(1)
    return tokens_css("door", [("red", degree_root_colour())]) + "\n" + hint


def chart_line_styles(scope, subline=False):
    """engine/chart-line.mjs's rules, scoped under the page's strip — the same substitution
    chartLineStyles(scope, { subline }) performs, on the same two template literals, so a
    generated page carries byte-for-byte what host-conformance computes from the module.
    261007 (night 43): the family's chart line reaches tetrad-voice-leading through this."""
    src = module_source("chart-line")
    css = re.search(r"^export const CHART_LINE_CSS = `([\s\S]*?)`;$", src, re.M).group(1)
    sub = re.search(r"^export const CHART_LINE_SUBLINE_CSS = `([\s\S]*?)`;$", src, re.M).group(1)
    return (css + ("\n" + sub if subline else "")).replace("SCOPE", scope)


# the generator pages wear the PAGE skin's card and line (261119: read from hub/card-shell.mjs, the one copy — the two
# literals this block typed were those values); a control's own white (a select, a transport button) is not a token
_PAGE = dict(card_shell_tokens()["page"])
FAMILY_GRAMMAR_CSS = """
  .cards{display:flex;flex-wrap:wrap;gap:12px;margin:14px auto 12px;width:min(1040px, 94vw)}
  .card{background:__PAGE_CARD__;border:1px solid __PAGE_LINE__;border-radius:10px;padding:12px 14px;flex:1 1 300px;min-width:280px;position:relative;text-align:left}
  .card h2{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--gray);margin:0 0 10px;font-weight:bold}
  .card label{font-size:12px;color:var(--gray);display:block;margin:8px 0 3px}
  .card select{font:inherit;font-size:13px;padding:5px 7px;border:1px solid __PAGE_LINE__;border-radius:6px;background:#fff;color:var(--ink);max-width:100%}
  .card .hint{font-size:11.5px;color:var(--gray);line-height:1.45;margin-top:8px;font-style:normal;text-align:left;padding:0}
  .card.metro .hint{color:#85858D}
  .chk{display:flex;align-items:center;gap:7px;font-size:13px;margin:7px 0;cursor:pointer}
  .muteBtn{font:inherit;font-size:12px;line-height:1;padding:2px 4px;border:none;background:transparent;cursor:pointer}
  .muteBtn[aria-pressed="true"]{opacity:.55}
  .transport .rowEnd{margin-left:auto;display:flex;gap:9px;align-items:center}
  .row2>.rowEnd{margin-left:auto;flex:0 0 auto;display:flex;gap:9px;align-items:flex-end}
  .rowEnd .chk{margin:0}
  .transport{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
  .transport button{font:inherit;font-size:14px;padding:7px 13px;border:1px solid __PAGE_LINE__;border-radius:8px;background:#fff;cursor:pointer;color:var(--ink)}
  .transport button.primary{background:var(--ink);border-color:var(--ink);color:#fff;font-weight:bold}
  .bpmrow{display:flex;align-items:center;gap:8px;margin-top:10px}
  .bpmrow input[type=range]{flex:1;accent-color:var(--ink)}
  .row2{display:flex;gap:10px;flex-wrap:wrap}
  .row2>div{flex:1 1 90px}
  .board{background:__PAGE_CARD__;border:1px solid __PAGE_LINE__;border-radius:10px;padding:10px 12px;margin:0 auto 12px;width:min(1040px, 94vw);box-sizing:border-box;position:relative;text-align:left}
  .bh{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--gray);font-weight:bold;margin:0 0 6px;display:flex;justify-content:space-between;align-items:center}
  .hint.nomargin{margin:0}
""".replace("__PAGE_CARD__", _PAGE["card"]).replace("__PAGE_LINE__", _PAGE["line"])
