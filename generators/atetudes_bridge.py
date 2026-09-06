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
import re
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
    """the card module's `key: \\`…\\`` template literal, verbatim"""
    src = (HUB / "modules" / f"{card}.mjs").read_text()
    m = re.search(rf"^  {key}: `([\s\S]*?)`,?\n", src, re.M)
    if not m:
        raise ValueError(f"{card}.mjs has no `{key}` literal")
    return m.group(1)


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
FAMILY_GRAMMAR_CSS = """
  .cards{display:flex;flex-wrap:wrap;gap:12px;margin:14px auto 12px;width:min(1040px, 94vw)}
  .card{background:#fff;border:1px solid #D8D8DC;border-radius:10px;padding:12px 14px;flex:1 1 300px;min-width:280px;position:relative;text-align:left}
  .card h2{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--gray);margin:0 0 10px;font-weight:bold}
  .card label{font-size:12px;color:var(--gray);display:block;margin:8px 0 3px}
  .card select{font:inherit;font-size:13px;padding:5px 7px;border:1px solid #D8D8DC;border-radius:6px;background:#fff;color:var(--ink);max-width:100%}
  .card .hint{font-size:11.5px;color:var(--gray);line-height:1.45;margin-top:8px;font-style:normal;text-align:left;padding:0}
  .card.metro .hint{color:#85858D}
  .chk{display:flex;align-items:center;gap:7px;font-size:13px;margin:7px 0;cursor:pointer}
  .muteBtn{font:inherit;font-size:12px;line-height:1;padding:2px 4px;border:none;background:transparent;cursor:pointer}
  .muteBtn[aria-pressed="true"]{opacity:.55}
  .transport .rowEnd{margin-left:auto;display:flex;gap:9px;align-items:center}
  .row2>.rowEnd{margin-left:auto;flex:0 0 auto;display:flex;gap:9px;align-items:flex-end}
  .rowEnd .chk{margin:0}
  .transport{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
  .transport button{font:inherit;font-size:14px;padding:7px 13px;border:1px solid #D8D8DC;border-radius:8px;background:#fff;cursor:pointer;color:var(--ink)}
  .transport button.primary{background:#B82929;border-color:#B82929;color:#fff;font-weight:bold}
  .bpmrow{display:flex;align-items:center;gap:8px;margin-top:10px}
  .bpmrow input[type=range]{flex:1;accent-color:var(--ink)}
  .row2{display:flex;gap:10px;flex-wrap:wrap}
  .row2>div{flex:1 1 90px}
  .board{background:#fff;border:1px solid #D8D8DC;border-radius:10px;padding:10px 12px;margin:0 auto 12px;width:min(1040px, 94vw);box-sizing:border-box;position:relative;text-align:left}
  .bh{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--gray);font-weight:bold;margin:0 0 6px;display:flex;justify-content:space-between;align-items:center}
  .hint.nomargin{margin:0}
"""
