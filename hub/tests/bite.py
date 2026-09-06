#!/usr/bin/env python3
"""bite.py — proves the stage-2 assertions FAIL when they should.

Same discipline as the stage-1 harness: a green suite is evidence of nothing
until it has been seen to go red for the reason it claims to guard. Each
mutation is applied, the doors are rebuilt, the suite is run, the failure is
matched against the message it must produce, and everything is reverted.

The mutations that matter here are the CSS/markup ones — stage 1 already
proved the script half.

usage:  python3 hub/tests/bite.py
"""
import argparse
import datetime
import signal
import subprocess
import sys
from pathlib import Path

HUB = Path(__file__).resolve().parent.parent
REPO = HUB.parent
results = []

# ---- THE HARNESS SURVIVES A CLOSED LID (260913, item 0) ----
# A killed run must leave (a) a line-buffered log holding everything up to
# the kill and (b) CLEAN SOURCES. try/finally covers exceptions and Ctrl-C;
# it does not cover a closing terminal — SIGHUP/SIGTERM land here instead.
LOG = {"fh": None, "path": None}
LIVE = {"path": None, "original": None, "mutation": None}   # the one patched file


def log_line(text):
    print(text)
    if LOG["fh"]:
        LOG["fh"].write(text + "\n")
        LOG["fh"].flush()


def open_log(path):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    LOG["fh"] = open(p, "a", buffering=1)
    LOG["path"] = p
    return p


class PatchedPath:
    """pathlib.Path proxy: write_text also tracks the LIVE mutation, so a
    signal handler can restore the file a dying process would abandon. The
    36 mutation bodies stay byte-identical — they call p.write_text as
    they always did."""
    def __init__(self, p, original):
        self._p = p
        self._original = original

    def write_text(self, text):
        r = self._p.write_text(text)
        if text == self._original:
            LIVE["path"] = None; LIVE["original"] = None
        else:
            LIVE["path"] = self._p; LIVE["original"] = self._original
        return r

    def __getattr__(self, name):
        return getattr(self._p, name)

    def __truediv__(self, other):
        return self._p / other

    def __str__(self):
        return str(self._p)


def _die_clean(signum, frame):
    name = {signal.SIGTERM: "SIGTERM", signal.SIGHUP: "SIGHUP",
            signal.SIGINT: "SIGINT"}.get(signum, str(signum))
    if LIVE["path"] is not None:
        LIVE["path"].write_text(LIVE["original"])
        log_line(f"KILLED ({name}) during {LIVE['mutation'] or '?'} — "
                 f"RESTORED {LIVE['path']}")
    else:
        log_line(f"KILLED ({name}) between mutations — sources were clean")
    log_line(f"log: {LOG['path']}")
    sys.exit(128 + (signum if isinstance(signum, int) else 15))


for _sig in (signal.SIGTERM, signal.SIGHUP, signal.SIGINT):
    signal.signal(_sig, _die_clean)


def sh(*args):
    return subprocess.run(args, capture_output=True, text=True, cwd=REPO)


def build():
    """A mutation that breaks the BUILD must not be mistaken for one the suite
    caught, and must never leave the suite running against stale artifacts —
    which is what happened the first time mutation 4 was written."""
    r = sh("node", "hub/tools/build.mjs")
    if r.returncode != 0:
        raise BuildBroken(r.stderr.strip().splitlines()[-1] if r.stderr.strip() else "build failed")
    return r


class BuildBroken(Exception):
    pass


def suite():
    return sh("python3", "hub/tests/door_locks.py")


def conformance():
    """the engine's host-conformance suite — the gate for a mutation of a HAND-AUTHORED
    page, which no door pin reads (night 35: the card-carrier pin lives there)"""
    return sh("node", "--test", "engine/tests/host-conformance.test.mjs")


def record(name, ok, detail):
    results.append((ok, name, detail))
    log_line(("  BITES    " if ok else "  NO BITE  ") + name + " — " + detail)


PREFLIGHT = {"on": False, "rotted": [], "checked": 0}


def patch(path, find, replace):
    p = REPO / path
    original = p.read_text()
    if PREFLIGHT["on"]:
        # THE ANCHOR PREFLIGHT (260902): validate only — return a
        # byte-identical triple so the mutation body runs without mutating,
        # and every anchor (m5 carries two) is checked in one sub-second pass
        PREFLIGHT["checked"] += 1
        if find not in original:
            PREFLIGHT["rotted"].append(f"{path}: {find.strip()[:70]!r}")
        return p, original, original
    assert find in original, f"mutation anchor not found in {path}"
    log_line(f"  patch    {path} :: {find.strip().splitlines()[0][:60]!r}")
    return PatchedPath(p, original), original, original.replace(find, replace, 1)


# ---------------------------------------------------------------- mutation 1
# The shipped study styles #journalIn at page level. That is exactly the shape
# of CSS a door cannot prune, so the resolver must refuse it.
def m1_shell_styles_a_module():
    p, original, mutated = patch("hub/shell.mjs",
        ".hint{font-size:11.5px;",
        "#journalIn{min-height:210px}\n.hint{font-size:11.5px;")
    try:
        p.write_text(mutated)
        r = sh("node", "hub/tools/resolve.mjs", "plain")
        hit = "journalIn" in r.stderr and "only notepad-card ships" in r.stderr
        record("a notepad rule left in the shell's stylesheet",
               r.returncode != 0 and hit,
               "resolver exit %d; named the token and its owner: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 2
# One module reaching into another's markup. Whichever is pruned first, the
# rule is wrong.
def m2_module_styles_another_module():
    p, original, mutated = patch("hub/modules/metronome-card.mjs",
        ".metrolabel{font-size:12px;color:#9C9CA4}",
        ".metrolabel{font-size:12px;color:#9C9CA4}\n.jcol{color:red}")
    try:
        p.write_text(mutated)
        r = sh("node", "hub/tools/resolve.mjs", "scribe")
        hit = "jcol" in r.stderr and "notepad-card" in r.stderr
        record("a module styling another module's markup",
               r.returncode != 0 and hit,
               "resolver exit %d; named both sides: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 3
# THE ONE THE GATE IS ABOUT. The build ships every module's styles regardless
# of what the lock reached — the page still looks and behaves correctly, and
# only the artifact catches it.
def m3_styles_shipped_regardless_of_reach():
    p, original, mutated = patch("hub/tools/build.mjs",
        '+ mods.map((m) => m.styles ?? "").join("\\n");',
        '+ ALL_MODULE_STYLES.join("\\n");')
    inject = ("async function build(id) {",
              "async function build(id) {\n"
              "  const ALL_MODULE_STYLES = [];\n"
              "  for (const f of (await import('node:fs')).readdirSync(join(HUB, 'modules'))) {\n"
              "    const ns = await import(pathToFileURL(join(HUB, 'modules', f)).href);\n"
              "    ALL_MODULE_STYLES.push(Object.values(ns)[0].styles ?? '');\n  }")
    try:
        p.write_text(mutated.replace(*inject, 1))
        build()
        r = suite()
        orphan = "CSS with nothing to match in this door" in r.stdout
        token = "belongs to a module this lock prunes" in r.stdout
        ctrl = "rendered controls != the set derived from the lock" not in r.stdout
        record("every module's styles shipped, whatever the lock reached",
               r.returncode != 0 and orphan and token,
               "suite exit %d; orphan check bit: %s; token grep bit: %s; the "
               "control partition stayed green (only the artifact caught it): %s"
               % (r.returncode, orphan, token, ctrl))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 4
# The markup half of the same failure: a pruned module's DOM shipped anyway.
def m4_markup_shipped_regardless_of_reach():
    p, original, mutated = patch("hub/tools/build.mjs",
        "  const markup = shell.SHELL_MARKUP",
        "  slots.boards.push('<div class=\"board\"><div id=\"journalIn\" "
        "data-control=\"journalIn\"></div></div>');\n"
        "  const markup = shell.SHELL_MARKUP")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        token = "journalIn" in r.stdout and "belongs to a module this lock prunes" in r.stdout
        ctrl = "unclaimed (rendered by nothing the lock reaches): ['journalIn']" in r.stdout \
            or "rendered controls != the set derived from the lock" in r.stdout
        record("a pruned module's markup shipped anyway",
               r.returncode != 0 and token and ctrl,
               "suite exit %d; markup grep bit: %s; the partition also bit: %s"
               % (r.returncode, token, ctrl))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 5
# §4.2.1's carry-forward, banned in this item before the codebase grows a use.
def m5_dynamic_import_and_lookup_by_string():
    p, original, mutated = patch("hub/modules/metronome-card.mjs",
        "  mount(ctx) {", "  async load() { return import('./notepad-card.mjs'); },\n  mount(ctx) {")
    try:
        p.write_text(mutated)
        r = sh("node", "hub/tools/resolve.mjs", "plain")
        hit = "dynamic import()" in r.stderr
        record("a dynamic import() added to a module",
               r.returncode != 0 and hit,
               "resolver exit %d; refused by name: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)
    p, original, mutated = patch("hub/modules/metronome-card.mjs",
        "  mount(ctx) {", '  probe() { return window["notepadCard"]; },\n  mount(ctx) {')
    try:
        p.write_text(mutated)
        r = sh("node", "hub/tools/resolve.mjs", "plain")
        hit = "lookup-by-string" in r.stderr
        record("a lookup-by-string on a global",
               r.returncode != 0 and hit,
               "resolver exit %d; refused by name: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 6
# THE POSITIVE ONE, now with markup and styles: a new module appears and lands
# in exactly the doors whose lock reaches it, with no door file edited.
def m6_new_module_no_door_edited():
    if PREFLIGHT["on"]:
        return   # no patch() anchors to check, and the preflight must not
                 # write real files (0d — a sandbox without delete rights
                 # turned the leftover into a FALSE ROT)
    new = REPO / "hub/modules/tuner-card.mjs"
    doors_before = {d: (REPO / f"hub/doors/{d}.door.mjs").read_text() for d in ("plain", "scribe")}
    try:
        new.write_text(
            '/* added by hub/tests/bite.py — no door file is edited for this. */\n'
            'export const tunerCard = {\n'
            '  id: "tuner-card",\n'
            '  requires: { notepad: true },\n'
            '  mount_point: "cards",\n'
            '  controls: ["tunerA"],\n'
            '  markup: `<h2>Tuner</h2><div class="tunerbox">'
            '<button id="tunerA" data-control="tunerA">A 440</button></div>`,\n'
            '  styles: `.tunerbox{padding:2px}`,\n'
            '  mount(ctx) { ctx.byId("tunerA").addEventListener("click", () => {}); },\n'
            '};\n')
        build()
        got = {d: (REPO / f"hub/build/{d}.html").read_text() for d in ("plain", "scribe")}
        ok = "tunerbox" in got["scribe"] and "tunerbox" not in got["plain"]
        untouched = all((REPO / f"hub/doors/{d}.door.mjs").read_text() == doors_before[d]
                        for d in doors_before)
        r = suite()
        record("a new module with markup and styles, no door edited",
               ok and untouched and r.returncode == 0,
               "scribe has it:%s plain does not:%s; doors unchanged:%s; suite green:%s"
               % ("tunerbox" in got["scribe"], "tunerbox" not in got["plain"],
                  untouched, r.returncode == 0))
    finally:
        new.unlink(missing_ok=True)


# ---------------------------------------------------------------- mutation 7
# THE CARD GRAMMAR (260820.4): a checkbox-only row reappears — accents back in
# a row of its own. The live-DOM predicate must name it. (The row keeps its
# rowEnd wrapper so the shell's shared token still ships from two modules —
# stripping it breaks the BUILD instead, which is the resolver's bite, not
# this suite's.)
def m7_checkbox_only_row_returns():
    p, original, mutated = patch("hub/modules/metronome-card.mjs",
        '    <div class="rowEnd"><label class="chk"><input type="checkbox" id="accChk" data-control="accChk" checked> accents</label></div>\n  </div>',
        '  </div>\n  <div class="transport"><span class="rowEnd"><label class="chk"><input type="checkbox" id="accChk" data-control="accChk" checked> accents</label></span></div>')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        only = "renders ONLY checkboxes" in r.stdout
        count = "row groups, not 4" in r.stdout
        record("a checkbox-only row back in the metronome card",
               r.returncode != 0 and only and count,
               "suite exit %d; the only-checkboxes predicate bit: %s; the row count bit: %s"
               % (r.returncode, only, count))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 8
# The item's trap, half one: accents MOVED and DIED — the checkbox renders but
# the lamp stops reading it. The gate exercises the box, not its presence.
def m8_moved_accents_dead():
    p, original, mutated = patch("hub/modules/metronome-card.mjs",
        '      const acc = byId("accChk").checked;',
        '      const acc = true;')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "the moved control is dead" in r.stdout
        record("the accents checkbox no longer read by the lamp",
               r.returncode != 0 and hit,
               "suite exit %d; caught exercising the box, not counting it: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 9
# The trap, half two: the voice select MOVED and DIED — the audio card stops
# taking the mixer's voice. pluck must fail to reach a buffer source.
def m9_moved_voice_dead():
    p, original, mutated = patch("hub/modules/audio-card.mjs",
        '      if (typeof m.voice === "string" && NOTE_VOICE_NAMES.includes(m.voice)) voice = m.voice;',
        '      /* voice pinned */')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "the moved voice select is dead" in r.stdout
        record("the voice select no longer drives the audio path",
               r.returncode != 0 and hit,
               "suite exit %d; caught on the node type (pluck != buffer source): %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 10
# MULTETUDES child 0: the field board stops re-deriving when the key changes.
# The page still loads, renders a correct-looking C-major field, and errors
# nowhere — only the door gate's field block (independent arithmetic against
# the rendered artifact, after a key change) may catch it.
def m10_field_frozen_on_key_change():
    p, original, mutated = patch("hub/modules/field-board.mjs",
        "      if (changed) build();",
        "      /* frozen */")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        # re-sited 260919: the neck's header box is the neck's own face (the readout
        # re-derives from the bus and follows the key even with the neck frozen)
        hit = ("the field did not re-derive" in r.stdout
               or "the neck's dots did not follow the key" in r.stdout)   # re-sited 260920: the dots the neck draws
        record("the field no longer re-derives on a key change",
               r.returncode != 0 and hit,
               "suite exit %d; caught on the artifact (dots or hint), not the handler: %s"
               % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 11
# MULTETUDES child 0: the field's derivation walk quietly loses a string. The
# module's own load-time assertion (walk vs closed-form count, different
# arithmetic) must throw at mount, and the gate must go red on the artifact —
# the assertion is seen to fail, not assumed able to.
def m11_field_walk_loses_a_string():
    p, original, mutated = patch("hub/modules/field-board.mjs",
        "  const dots = [];\n  for (let s = 1; s <= 6; s++)",
        "  const dots = [];\n  for (let s = 1; s <= 5; s++)")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "the field renders" in r.stdout or "field-board: string" in r.stdout \
            or "page errors" in r.stdout
        record("the field walk loses a string",
               r.returncode != 0 and hit,
               "suite exit %d; the load assertion reached the gate: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 12
# MULTETUDES child 2: a set change RESETS the window instead of translating
# it. The page loads clean and looks right; only the gate's stepped-then-
# toggled sequence (the design's start degree read off the hint) can see it.
def m12_set_change_resets_the_design():
    # anchor re-aimed 260911 (item 6 split the reanchor line and named the
    # forced follow between it and the cfg write)
    p, original, mutated = patch("hub/modules/field-board.mjs",
        "      cfg = { ...cfg, strings: next, startDeg: moved.startDeg, nearFret: moved.fLo };",
        "      cfg = { ...cfg, strings: next, startDeg: 0, nearFret: 5 };")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "RESET the design" in r.stdout
        record("a set change resets the window's design",
               r.returncode != 0 and hit,
               "suite exit %d; the translation gate bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 13
# MULTETUDES child 2: the setIndex migration loses its restored-snapshot guard
# and a LIVE shape-half announcement hijacks the field's six-string run — the
# defect the cold-load debugging actually found (mount order is import order).
def m13_live_setindex_hijacks_the_field():
    p, original, mutated = patch("hub/modules/field-board.mjs",
        '      } else if ("setIndex" in m && !("strings" in m) && "key" in m',
        '      } else if ("setIndex" in m && !("strings" in m)')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "hijacked the field" in r.stdout or "derived label is not in the readout" in r.stdout
        record("a live shape-half setIndex hijacks the field",
               r.returncode != 0 and hit,
               "suite exit %d; the coexistence gate bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 14
# MULTETUDES child 3a: TAKE COLLAPSES INTO PLACEMENT — choosing Line forces
# the arpeggio. The page renders plausibly (more dots, all of them real chord
# tones); only the artifact comparison of addresses across the Line click can
# see that the ceiling CAUSED what it may only PERMIT.
def m14_take_collapses_into_placement():
    p, original, mutated = patch("hub/modules/field-board.mjs",
        '        const r = cfg.take === "all"',
        '        const r = (cfg.take === "all" || cfg.notesPer > 1)')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "Take and Placement have collapsed" in r.stdout
        record("choosing Line forces the arpeggio",
               r.returncode != 0 and hit,
               "suite exit %d; the address comparison bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 15
# MULTETUDES child 3a: THE SCALE MATERIAL SILENTLY HALVED — the category error
# that already shipped once in the prototype. Placement applied to a scale
# looks tidy on the neck; the recipe counts (R15's 12-18, R5's six) are what
# catch it.
def m15_scale_material_silently_halved():
    p, original, mutated = patch("hub/modules/field-board.mjs",
        "        sel = scaleTake(pool).notes;",
        "        sel = scaleTake(pool, { reach: 1 }).notes;")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "R15: the six-string scale box offers" in r.stdout or "R5:" in r.stdout
        record("the scale material silently halved",
               r.returncode != 0 and hit,
               "suite exit %d; the recipe counts bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 16
# MULTETUDES surface: a card moved between rows. The first red run of the diff
# gate proved width ratios alone measure nothing here — the seating identity
# check (who sits in each row, read off each card's own controls) is what must
# bite, and this keeps it mutation-proven.
def m16_card_moved_between_rows():
    p, original, mutated = patch("hub/doors/multetudes.door.mjs",
        '    { template: "1fr 3fr",\n'
        '      cards: ["metronome-card", { part: "notepad-card#pad", heading: "Notepad" }] },\n'
        '    { template: "2fr 1fr 1fr", cards: ["harmony-card", "progression-card", "presets-card"] },',
        '    { template: "1fr 3fr",\n'
        '      cards: ["metronome-card", "harmony-card"] },\n'
        '    { template: "2fr 1fr 1fr", cards: [{ part: "notepad-card#pad", heading: "Notepad" }, "progression-card", "presets-card"] },')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "the rows seat the wrong cards" in r.stdout
        record("a card moved between rows",
               r.returncode != 0 and hit,
               "suite exit %d; the seating identity check bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 17
# MULTETUDES parts: a part moved between seats — the pad falls back into the
# module's own seat, so the log rides row 1 and the page foot loses its board.
# The page renders plausibly (everything present, just seated wrong); only the
# part-level seating identity can see it — last night's lesson, one level down.
def m17_part_moved_between_seats():
    p, original, mutated = patch("hub/doors/multetudes.door.mjs",
        '      cards: ["metronome-card", { part: "notepad-card#pad", heading: "Notepad" }] },',
        '      cards: ["metronome-card", "notepad-card"] },')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        # ("the log rides it" was a dead OR-arm — found by the grep preflight
        # on its own first run, 260905; the living arm carries the bite)
        hit = ("under v0.9's 'Notepad' header" in r.stdout) \
            and "not seated at the page foot" in r.stdout
        record("a part moved between seats",
               r.returncode != 0 and hit,
               "suite exit %d; the part-seating identity bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 18
# MULTETUDES child 3b: THE REPEAT STOPS BEING THE ORDINAL — every repeat of a
# string plays its first note again. The page renders plausibly (a figure, a
# polyline, a bracket); only the artifact's ordered addresses can see that
# step 3 never reached string 4's second note.
def m18_repeat_stops_being_the_ordinal():
    p, original, mutated = patch("engine/selection.mjs",
        "      const k = (used[s] || 0) % onStr.length;      // A REPEAT IS THE ORDINAL, wrapping\n"
        "      used[s] = (used[s] || 0) + 1;\n"
        "      order.push(onStr[k]);",
        "      order.push(onStr[0]);")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "must play string 4's two notes low->high" in r.stdout
        record("the repeat stops being the ordinal",
               r.returncode != 0 and hit,
               "suite exit %d; the ordered-address hook bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m19_chord_reroots_at_the_window():
    # the 260831 defect, reintroduced IN ITS CHILD-7 FORM (the anchor rotted
    # on 260901 when the progression took ownership of the chord, exactly as
    # the night-5 comment predicted): the chord rooted at the WINDOW'S anchor
    # degree instead of the progression's bar boots the door on Gm7 where the
    # ruling (register 11) and v0.9 hold the B-flat tetrad block. The
    # strengthened boot-block pin must still bite.
    p, original, mutated = patch("hub/modules/field-board.mjs",
        # anchor re-aimed 260917 (item 1: the pick threads as tonePick(cfg))
        "      const cur = chordAt(prog, index, fld, cfg.object, pickOf(cfg));",
        "      const cur = chordAt({ chords: [{ kind: \"diatonic\", degree: pos.startDeg }], bars: [[0]] }, 0, fld, cfg.object, pickOf(cfg));")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "the boot block is not v0.9's B\u266d tetrad" in r.stdout
        record("the chord reroots at the window's anchor degree",
               r.returncode != 0 and hit,
               "suite exit %d; the boot-block pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m20_reference_refusal_goes_silent():
    # child 5's law: both reference strings taken is a fact the FACE must say.
    # Silence the hint's refusal clause and the by-name pin must bite.
    # ANCHOR REWRITTEN 260919 (night 25 item 3, rule 7): the hint was trimmed to
    # reason and affordance; the refusal clause now leads its line, no leading space.
    # ANCHOR RE-AIMED 261001 (night 37, item 2): both strings taken is an OFFER now, said by
    # name in its own clause; silence THAT clause and the by-name pin must bite.
    p, original, mutated = patch("hub/modules/field-board.mjs",
        '          : refP.offer ? `Reference offered unfretted: ${refP.reason} — drawn below the strings, sounding nothing. `',
        '          : refP.offer ? ""')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "must OFFER the reference unfretted BY NAME on the face" in r.stdout
        record("the reference refusal goes silent",
               r.returncode != 0 and hit,
               "suite exit %d; the by-name refusal pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m21_typed_romans_stop_resolving():
    # child 7's typed path: the custom line tries resolveRoman before
    # parseChord. Sever the roman path and "ii7 V7 Imaj7" refuses instead of
    # resolving — no load assertion covers typed romans (the load block pins
    # the FORM path), so only the door gate's identified pin can bite.
    p, original, mutated = patch("engine/progression.mjs",
        "        const r = resolveRoman(tok, key, scale);",
        "        const r = null;")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "typed romans must resolve by the case rule" in r.stdout
        record("typed romans stop resolving",
               r.returncode != 0 and hit,
               "suite exit %d; the case-rule surface pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m22_the_figure_never_reaches_the_sound():
    # Daniel's 260902 headline finding, reintroduced: every scheduled event
    # at time zero — the selection sounds at the chord change and the figure
    # is derived, drawn, asserted and discarded. Only a pin that reads the
    # TIMES can bite; a count of NOTE announcements passes this mutation.
    p, original, mutated = patch("engine/progression.mjs",
        "const events = seq.map((nt, k) => ({ midi: nt.midi, at: together ? 0 : k * step }));",
        "const events = seq.map((nt) => ({ midi: nt.midi, at: 0 }));")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "divide the chord's span evenly" in r.stdout
        record("the figure never reaches the sound",
               r.returncode != 0 and hit,
               "suite exit %d; the TIMES pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m23_the_walk_goes_deaf_to_the_window():
    # 260903's class guard: the walk and the board derive the same selection
    # from SHARED CONFIG (§4.2.3 — never from each other's state). Deafen the
    # walk to the window — the brief's hypothesized mechanism, reintroduced
    # for real — and the sound≡sight pin must name the diverging midis when
    # the gate steps the window.
    # (anchor re-aimed 260907: the octave amendment added `strings:` to the
    # call — caught by the preflight in one second, its third live save.
    # 260904's note stands: the deaf window is 8–12, clear of the corpus.)
    p, original, mutated = patch("hub/modules/etude-walk.mjs",
        """      const pos = positionOf({ field: fld, anchorString: Math.max(...run.strings),
        startDegree: cfg.startDeg, nearFret: cfg.nearFret, strings: run.strings });""",
        """      const pos = positionOf({ field: fld, anchorString: Math.max(...run.strings),
        startDegree: 0, nearFret: 1, strings: run.strings });""")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        # (260904: the pin's message moved with the subset correction — the
        # GREP target rotted where the anchor did not; the preflight checks
        # anchors only, so this species still costs a run to find)
        hit = "SOUND must be a SUBSET of SIGHT" in r.stdout
        record("the walk goes deaf to the window",
               r.returncode != 0 and hit,
               "suite exit %d; the sound-equals-sight pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m24_the_boot_refuses_its_second_bar():
    # 260904's placement pin guards the first-run experience: every bar of
    # the boot progression places. Regress the boot to the old 6th-at-the-
    # fifth window (the owner of startDeg/nearFret is field-board's default)
    # and bar 2's E-flat maj7 refuses again — the pin must name the bar.
    p, original, mutated = patch("hub/modules/field-board.mjs",
        "      strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3,",
        "      strings: [4, 3, 2, 1], startDeg: 5, nearFret: 5,")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "must place its grip whole" in r.stdout
        record("the boot refuses its second bar",
               r.returncode != 0 and hit,
               "suite exit %d; the boot-placement pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m25_take_does_movement_duty_again():
    # Daniel's 260905 model correction, regressed: the walk derives the
    # spread from the MATERIAL again ("The Take field ... is doing movement
    # (partial) duty here which it shouldn't be"). The decoupling pins must
    # name the forbidden coupling from the sound itself.
    p, original, mutated = patch("hub/modules/etude-walk.mjs",
        # anchor re-aimed 260913 (item 2's word ruling: arpeggio -> arpeggiate)
        'const spread = cfg.object === "scale" || cfg.movement === "arpeggiate";',
        'const spread = cfg.object === "scale" || cfg.take === "all";')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "must not forbid the movement" in r.stdout or "not decide the movement" in r.stdout
        record("Take does movement duty again",
               r.returncode != 0 and hit,
               "suite exit %d; a decoupling pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m26_the_second_sounding_path_returns():
    # 260905 item 3's cause, reintroduced: the strip's step echo loses its
    # attack flag and audio-card sounds its disconnected tetrad pass on
    # every echo — straight into WebAudio, invisible to the NOTE stream.
    # Only the AudioContext-level pin can bite.
    p, original, mutated = patch("hub/modules/timeline-strip.mjs",
        "      announce(d, STEP_CHANGED, { index, attack: true });",
        "      announce(d, STEP_CHANGED, { index });")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        # re-aimed 260910: the silence pin it watched was REWRITTEN into the
        # audition's stronger form — under this mutation the echo is plain,
        # so the foreign pass sounds AND the audition goes deaf, and either
        # face of that bites
        hit = ("auditions the DRAWN selection" in r.stdout
               or "only sounding path" in r.stdout
               or "sounded == drawn == raw starts" in r.stdout)
        record("the second sounding path returns",
               r.returncode != 0 and hit,
               "suite exit %d; the AudioContext pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m27_the_cap_stops_covering():
    # 260906 item 1: the coverage matching disabled — the cap reverts to
    # fret order and Daniel's F voices as two 3rds again. The F-case pin
    # names the duplicate from the artifact.
    # RE-AIMED 260924 (night 30, rule 7): disabling the whole matching now trips the
    # engine's own load-time pin ("every-occurrence in a 4-5 fret window must double a
    # string somewhere") before the suite can run — under the ruled law a fully capped
    # take places nothing. The coverage is broken more precisely: the augmenting path is
    # removed, so a duplicate keeps a slot an uncovered tone could take (Daniel's F loses
    # its R) — the module loads, and the coverage pin bites.
    p, original, mutated = patch("engine/selection.mjs",
        "      if (slotPc[i] === null || tryPlace(slotPc[i], seen)) { slotPc[i] = pc; return true; }",
        "      if (slotPc[i] === null) { slotPc[i] = pc; return true; }")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        # measured 260924: without the augmenting path Daniel's F still voices R 3 5 — the
        # old coverage pin stays green — but the capped case and the uncapped window both
        # move (a tone the matching could have covered goes uncovered); those pins bite.
        hit = ("never two 3rds" in r.stdout or "duplicate held a slot" in r.stdout
               or "string 3 SILENT" in r.stdout or "an uncapped window is unchanged" in r.stdout)
        record("the cap stops covering (the augmenting path removed)",
               r.returncode != 0 and hit,
               "suite exit %d; a coverage pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m28_the_board_goes_deaf_to_the_window():
    # 260906 item 3's class guard: the BOARD deaf to the window (m23's twin,
    # the other side of the pair) — the board draws a different selection
    # than the engine derives for the shared config; the board≡engine pin
    # names the bar and both selections.
    # (anchor re-aimed 260907 with the octave amendment's call-site change)
    p, original, mutated = patch("hub/modules/field-board.mjs",
        """      const pos = positionOf({ field: fld, anchorString: anchor,
        startDegree: cfg.startDeg, nearFret: cfg.nearFret, strings: run.strings });""",
        """      const pos = positionOf({ field: fld, anchorString: anchor,
        startDegree: 0, nearFret: 1, strings: run.strings });""")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "the board must draw the engine's own" in r.stdout
        record("the board goes deaf to the window",
               r.returncode != 0 and hit,
               "suite exit %d; the board-equals-engine pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m29_the_reference_loses_its_role():
    # 260906 item 2, regressed: the reference event drops its bass role and
    # rides the chord bus again — the bass slider controls nothing. The
    # AudioContext slider pins must bite (engine load assertions do not
    # cover the role tag).
    p, original, mutated = patch("engine/progression.mjs",
        'if (refMidi != null) events.unshift({ midi: refMidi, at: 0, role: "bass" });',
        'if (refMidi != null) events.unshift({ midi: refMidi, at: 0 });')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "must drop EXACTLY the reference" in r.stdout \
            or "leave the reference ALONE sounding" in r.stdout
        record("the reference loses its role",
               r.returncode != 0 and hit,
               "suite exit %d; a bass-slider pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m30_the_window_forgets_the_octave():
    # the 2026-09-07 amendment regressed: the anchor-only proxy restored
    # (the widening loop removed) — three-string boxes lose a pitch class
    # again and Daniel's F loses its root. The octave pin reads the classes
    # off the drawn dots and must name the count.
    p, original, mutated = patch("engine/position.mjs",
        "    let got = covers(fHi);\n    while (got.size < fld.pcs.length && fHi < 15) { fHi++; got = covers(fHi); }",
        "    let got = covers(fHi);   // proxy restored: no widening")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "the SET covers the octave" in r.stdout or "the octave window holds the R" in r.stdout
        record("the window forgets the octave",
               r.returncode != 0 and hit,
               "suite exit %d; the octave pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m31_a_bar_dies_without_a_reason():
    # 260908's whole point: a bar that shows neither dots nor a visible
    # on-neck reason is the defect Daniel found six mornings running.
    # Remove the neck's refusal element and the playthrough matrix must
    # name the dead bars.
    p, original, mutated = patch("hub/modules/field-board.mjs",
        # ANCHOR RE-SITED 260923 (night 30, rule 7): the gate reads "something is wrong with what was placed"
        '      if (cfg.object !== "scale" && selMsg && wrong) {',
        '      if (false) {')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "bars are DEAD" in r.stdout
        record("a bar dies without a reason",
               r.returncode != 0 and hit,
               "suite exit %d; the playthrough matrix bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m32_the_override_goes_silent_again():
    # 260909 item 3: a typed figure rules the walk (260901, kept) — but the
    # override must be LOUD. Mutate the figRules derivation to never fire
    # and the matrix's contradiction leg must catch block standing raised
    # and real under a ruling figure.
    p, original, mutated = patch("hub/modules/field-board.mjs",
        # anchor re-aimed 260913b (item 4b widened the rule to scales)
        '      const figRules = !fig.err && !!(fig.order && fig.order.length);',
        '      const figRules = false;   // the override silent again')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "a ruling figure DISABLES block" in r.stdout
        record("the override goes silent again",
               r.returncode != 0 and hit,
               "suite exit %d; the contradiction leg bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m33_the_audition_goes_silent():
    # 260910 item 1: a stopped chip click must sound the walk's own drawn
    # selection. Mutate the audition branch to never fire and the audition
    # pins (sounded == drawn == raw starts, at the AudioContext) must name
    # the silence — the defect Daniel reported, restored.
    p, original, mutated = patch("hub/modules/etude-walk.mjs",
        "      } else if (!armed && wantAudition && m.attack === true) {",
        "      } else if (false) {   // the audition silent again")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "auditions the DRAWN selection" in r.stdout or "sounded == drawn == raw starts" in r.stdout
        record("the audition goes silent",
               r.returncode != 0 and hit,
               "suite exit %d; an audition pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m34_the_figure_tolerates_junk_again():
    # 260910 item 2: the junk refusal removed — the character scan skips
    # unknown characters instead of naming them, restoring the eleventh
    # silence ("R,Q" keeps the R, drops the Q). The named-refusal pins must
    # bite on both alphabets.
    p, original, mutated = patch("engine/selection.mjs",
        # anchor re-aimed 260913b (item 4b restructured the tokenizer;
        # the tones junk refusal is one line in the greedy scan)
        # anchor re-aimed 260917 (item 1: the tones tokenizer is parseTones,
        # shared by the figure and the selection — one refusal, one anchor)
        '    return { tones: null, err: `"${ch}" is not a tone — tones are R, 3, 5, 7, 9, 11, 13`,\n      patternDigit: "12468".includes(ch) };',
        '    { i += 1; continue; }   // tolerant again: junk vanishes without a word')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "refused BY NAME on the face" in r.stdout or "refuses junk by name" in r.stdout
        record("the figure tolerates junk again",
               r.returncode != 0 and hit,
               "suite exit %d; the named-refusal pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m35_the_engine_refusal_swallowed_again():
    # 260911 item 3: score-board's bare catch used to discard the engine's
    # named refusal and draw something else. No config in a 108-cell sweep
    # makes figureEvents throw through the door's own controls (the zone
    # machinery keeps approaches playable), so the plumbing is proven by
    # INJECTION: make figureEvents refuse by name, and the healthy-artifact
    # pin must fail SHOWING the refusal text drawn in the bar — the reason
    # travelled from the throw to the pixels.
    p, original, mutated = patch("engine/figure.mjs",
        '  const order = playback === "strum" ? null : orderFigure(parsed, step, address, ctx);',
        '  if (playback !== "block" && parsed)\n'
        '    throw new Error("motion: no playable position for midi 0 (m35 injection)");\n'
        '  const order = playback === "strum" ? null : orderFigure(parsed, step, address, ctx);')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        # grep targets are corpus-checked by the preflight, so both live in
        # real sources: the board's own prefix, and the engine's refusal
        # family that the injection borrows its wording from
        hit = ("the figure cannot sound here" in r.stdout
               and "no playable position for midi" in r.stdout)
        record("the engine refusal swallowed again (injected)",
               r.returncode != 0 and hit,
               "suite exit %d; the refusal REACHED the bar's pixels: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m36_repeat_stops_repeating():
    # 260913 item 4: the repeat boundary blanked — the walk advances as if
    # the toggle did not exist, and the zero-advance / same-chord pins must
    # name it at the AudioContext and the echo stream.
    p, original, mutated = patch("hub/modules/etude-walk.mjs",
        "        if (cfg.repeat) {",
        "        if (false) {   // repeat dead")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = ("ZERO advance echoes" in r.stdout
               or "the SAME chord's notes came round again" in r.stdout)
        record("repeat stops repeating",
               r.returncode != 0 and hit,
               "suite exit %d; a repeat pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 37
def m37_restore_overwrites_the_pad_again():
    # 260916 item 1: Restore's guard removed — the pad is overwritten in
    # silence, exactly as Daniel lost work during the v0.4.0 review. The
    # door pin must name the overwrite at the pad, not at the row.
    # ANCHOR UPDATED 260917 (item 0b moved the confirm into the row; 6c made
    # the predicate DIRTY) — the mutation is the same: the guard removed.
    p, original, mutated = patch("engine/notepad-surface.mjs",
        '          if (padDirty()) rowConfirmShow(acts, applyEntry);',
        '          if (false) rowConfirmShow(acts, applyEntry);   // silent again')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "Restore overwrote unsaved pad text" in r.stdout
        record("Restore silently overwrites unsaved pad text again",
               r.returncode != 0 and hit,
               "suite exit %d; the item-1 pin bit at the pad: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 38
def m38_a_tone_the_object_cannot_hold_slips_through():
    # 260917 item 1: the pick's guard removed — "R,3,13" under a tetrad would
    # be accepted in silence; the door pin must name the refusal on the face.
    # ANCHOR RE-AIMED after the first run (260917): removing the guard whole
    # broke the BUILD — selection.mjs's own load assertion (a dyad of [2,7]
    # must refuse) threw at import, so the engine refused the mutation before
    # any door pin could. The mutation now accepts every degree 1–13 for
    # every object: [2,7] still refuses at load, and a tetrad's "R,3,13"
    # slips through — exactly the silence the door pin must name.
    p, original, mutated = patch("engine/selection.mjs",
        "    if (!degrees.includes(d))\n      throw new Error(`objectOffsets: ${roleWord(d)} is not a tone of a ${object}",
        "    if (!objectDegrees(\"thirteenth\").includes(d))\n      throw new Error(`objectOffsets: ${roleWord(d)} is not a tone of a ${object}")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "a tone the object cannot hold refuses by name" in r.stdout
        record("a tone the object cannot hold slips through unrefused",
               r.returncode != 0 and hit,
               "suite exit %d; the item-1 refusal pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 39
def m39_the_row_stops_moving_as_one():
    # 260917 6a: the chevron collapses its card alone again — on an equal-
    # height row nothing visibly shrinks and the title lies about its scope.
    p, original, mutated = patch("hub/shell.mjs",
        "      for (const m of mates) {                    // the row moves as one",
        "      for (const m of []) {                       // the row does NOT move")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "collapsing one card collapsed its whole row" in r.stdout
        record("the row stops collapsing as one",
               r.returncode != 0 and hit,
               "suite exit %d; the 6a row pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 40
def m40_every_approach_goes_violet():
    # 260918 item 1: the FUNCTION channel collapses — a diatonic scale-step
    # approach is painted violet; the §2.6 colour pin for the diatonic case bites.
    p, original, mutated = patch("engine/selection.mjs",
        "      const chromatic = keyDeg < 0;",
        "      const chromatic = true;   // every approach violet")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "a DIATONIC approach keeps its degree colour" in r.stdout
        record("every approach painted violet (the diatonic case loses its degree)",
               r.returncode != 0 and hit,
               "suite exit %d; the diatonic colour pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 41
def m41_no_approach_goes_violet():
    # 260918 item 1: the other way — a chromatic approach painted in a degree
    # colour it does not have; the chromatic colour pin bites.
    p, original, mutated = patch("hub/modules/field-board.mjs",
        # ANCHOR RE-AIMED 260930 (night 36, v1.4): violet is retired; the chromatic
        # colour is the ALTERED degree's. The mutation paints it with the degree
        # the note is NOT (its diatonic neighbour index clamped) — the colour pin bites.
        "        const famOfAp = ap.chromatic ? FAM[altered(ap.midi).deg] : FAM[ap.deg];",
        "        const famOfAp = FAM[Math.max(0, ap.deg)];   // a chromatic one wears a degree colour it does not have")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "a CHROMATIC approach wears the ALTERED degree's colour" in r.stdout
        record("a chromatic approach wears a degree colour it does not have (the altered-degree pin)",
               r.returncode != 0 and hit,
               "suite exit %d; the chromatic colour pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 42
def m42_a_state_clause_returns_to_the_hint():
    # 260919 item 3: a dropped state clause creeps back into the hint — the
    # same configuration narrated twice again; the trim pin must name it.
    p, original, mutated = patch("hub/modules/field-board.mjs",
        '      byId("fdHint").textContent =\n        (selMsg ? `${selMsg}. ` : "") +',
        '      byId("fdHint").textContent =\n        `Strings ${run.label} · ` + (selMsg ? `${selMsg}. ` : "") +')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "the hint no longer narrates state" in r.stdout
        record("a state clause returns to the hint (narrated twice again)",
               r.returncode != 0 and hit,
               "suite exit %d; the prose-split pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutations 43–46
# 260921 (night 27 item 2): THE PIN-INDEPENDENCE SWEEP. Four unifications landed in
# four nights (the palette, OPEN_MIDI, the speller, the readout); each is mutated
# here so the pins around it are proven to fail for the reason they exist.
def m43_a_readout_copies_the_necks_box():
    # the readout's paint becomes a COPIER: every instance but the neck's reads
    # the neck's box text. The three still agree, so an agreement-only pin would
    # pass; the detached-box pin (and the source pin) must bite.
    p, original, mutated = patch("hub/readout.mjs",
        '    text.textContent = "";\n    let fld, cur;',
        '    text.textContent = "";\n    if (host.id !== "fdMode") { const n = d.getElementById("fdMode"); text.textContent = n ? n.textContent : ""; return; }\n    let fld, cur;')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "DETACHED the other two still derive" in r.stdout or "reaches for no one's DOM" in r.stdout
        record("a readout copies the neck's box (agreement without independence)",
               r.returncode != 0 and hit,
               "suite exit %d; the detached-box or the source pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m44_the_palettes_R_drifts_by_one():
    # the one palette drifts by a single hex digit: nothing visible to the eye,
    # and until tonight no pin read R's hex off anything rendered.
    p, original, mutated = patch("hub/palette.mjs",
        'R: "#B82929"',
        'R: "#B82928"')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "wear the Spec's colours" in r.stdout
        record("the palette's R drifts by one hex digit",
               r.returncode != 0 and hit,
               "suite exit %d; the §2.1 colour pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m45_a_second_tuning_is_declared():
    # tetrad-sequence states the six numbers again — the night-26 defect returning;
    # the built-page pin ("states the tuning as a literal") must bite.
    p, original, mutated = patch("engine/tetrad-sequence.mjs",
        'import { OPEN_MIDI } from "./field.mjs";',
        'export const OPEN_MIDI = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "states the tuning as a literal" in r.stdout
        record("a second tuning is declared (the copy returns)",
               r.returncode != 0 and hit,
               "suite exit %d; the one-declaration pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m46_a_flat_key_spells_sharp():
    # the speller's direction inverted: F major spells G#; both doors' F pins bite.
    # ANCHOR RE-SITED 260924 (night 31, rule 7): under rule C the key signature decides only
    # the LAST tiebreak (F major's pc 1: D♭ vs C♯ tie on accidentals and distance; the
    # parent's flat side picks D♭). Inverting the parent's side spells F major's chromatics
    # sharp — the same meaning, the same F-major pins in both doors.
    p, original, mutated = patch("engine/chord.mjs",
        '  const parentFlat = scaleNotes(parentKey, "major").some((n) => n.name.includes("b"));',
        '  const parentFlat = !scaleNotes(parentKey, "major").some((n) => n.name.includes("b"));')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        # grep re-sited 260925: the score's F-major pin was reworded for rule C ("no sharps, no doubles")
        hit = "from the key signature" in r.stdout and ("no sharps, no doubles" in r.stdout or r.stdout.count("from the key signature") >= 2)
        record("a flat key spells sharp (the speller's direction inverted)",
               r.returncode != 0 and hit,
               "suite exit %d; the F-major pins bit in both doors: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutations 47–48
# 260923 (night 29): THE PAIRING — the axe check must catch the set squares' own
# defect class: a control born without a name, or without a role.
def m47_a_set_square_loses_its_name():
    # MEASURED 260923 before writing: with the aria-label AND the <title> gone, axe's
    # button-name stays silent — the numeral inside the square names a role=button
    # from content ("1"). The instrument cannot see the name's QUALITY; the door's own
    # square pin ("string N …") is what watches it. The pairing is axe + the pin.
    p, original, mutated = patch("hub/modules/field-board.mjs",
        '          "aria-label": `string ${s}` + (on ? " — in the set" : " — not in the set") }, svg);',
        '          }, svg);   /* no name */')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "every set square is a named button" in r.stdout
        record("a set square loses its accessible name (the numeral is all that names it)",
               r.returncode != 0 and hit,
               "suite exit %d; the square's name pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m48_a_set_square_loses_its_role():
    p, original, mutated = patch("hub/modules/field-board.mjs",
        '        const g = el("g", { class: "fd-str", "data-fdstr": s, role: "button", tabindex: "0",',
        '        const g = el("g", { class: "fd-str", "data-fdstr": s, tabindex: "0",')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "not on the 260923 exemption list" in r.stdout or "every set square is a named button" in r.stdout
        record("a set square loses its role (a focusable thing that is nothing)",
               r.returncode != 0 and hit,
               "suite exit %d; the axe gate or the square pin named it: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutations 49–50
# 260923 (night 30): the board stops lying about what it placed.
def m49_the_leftover_pass_runs_under_a_cap():
    # the ruled gate removed: the leftover pass doubles the 5 again on the capped case
    p, original, mutated = patch("engine/selection.mjs",
        "  if (!anyCapped)\n    for (const s of strings)",
        "  if (true)\n    for (const s of strings)")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "the doubled 5 is gone, string 3 SILENT" in r.stdout
        record("the leftover pass runs under a cap (the doubled 5 returns)",
               r.returncode != 0 and hit,
               "suite exit %d; the silent-string pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m50_the_loss_goes_quiet_again():
    # the render gate reverts to "nothing placed": the capped loss falls back to the hint
    p, original, mutated = patch("hub/modules/field-board.mjs",
        "      const wrong = !sel.length || !!lossMsg;",
        "      const wrong = !sel.length;")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "LOUD on the window" in r.stdout
        record("the capped loss goes quiet again (gated on nothing placed)",
               r.returncode != 0 and hit,
               "suite exit %d; the loud-on-the-window pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutations 51–52
# 260924 (night 31): the speller and the reach.
def m51_the_reach_is_unbounded_again():
    # the reach removed: an approach may land anywhere on the neck again; the refusal pin bites
    p, original, mutated = patch("engine/selection.mjs",
        "      const lo = ctx.pos.fLo - reach, hi = ctx.pos.fHi + reach;",
        "      const lo = -Infinity, hi = Infinity;")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "the reach REFUSES by name on the face" in r.stdout
        record("the reach is unbounded again (an approach anywhere on the neck)",
               r.returncode != 0 and hit,
               "suite exit %d; the reach refusal pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


def m52_the_speller_keeps_the_letter_again():
    # rule C's first tiebreak inverted: the MORE-accidental neighbour wins — the old law's doubles return
    p, original, mutated = patch("engine/chord.mjs",
        "      if (cost(below) !== cost(above)) name = cost(below) < cost(above) ? below : above;   // fewest accidentals",
        "      if (cost(below) !== cost(above)) name = cost(below) > cost(above) ? below : above;   // MOST accidentals")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "spells D♭ on every bar of the staff" in r.stdout or "spell D♭ G♭ E B♭" in r.stdout
        record("the speller prefers the more-accidental neighbour (the doubles return)",
               r.returncode != 0 and hit,
               "suite exit %d; a rule-C pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 53
# 260929 (night 35): the hand-authored studies carry notepad-card.mjs's bytes
# VERBATIM (host-conformance's card-carrier pin, in the build's own
# assemblies). A word drifts in the metronome study's carried column head —
# the drift an "edit the copy, not the module" slip would make.
def m53_a_carried_card_drifts_in_a_hand_page():
    p, original, mutated = patch("static/studies/metronome/study.html",
        '<div class="colhd">Note — what just happened</div>',
        '<div class="colhd">Note — what happened</div>')
    try:
        p.write_text(mutated)
        # no build(): the mutated file is not a build input; the gate is the engine's
        r = conformance()
        hit = "[metronome] carries hub/modules/notepad-card.mjs but its markup matches none of the build's assemblies" in (r.stdout + r.stderr)
        record("a carried card drifts one word in a hand-authored page",
               r.returncode != 0 and hit,
               "conformance exit %d; the card-carrier pin named the page and the card: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


# ---------------------------------------------------------------- mutation 54
# 260930 (night 36, v1.4): SHAPE carries chromaticity. The chromatic approach
# reverts to a circle — colour intact, silhouette gone — and the shape pin bites.
def m54_the_chromatic_approach_loses_its_shape():
    p, original, mutated = patch("hub/modules/field-board.mjs",
        "        if (ap.chromatic)\n          el(\"polygon\", { points: starburst(fx(ap.fret), fy(ap.string), 13 * 0.6), fill: \"none\",",
        "        if (false)\n          el(\"polygon\", { points: starburst(fx(ap.fret), fy(ap.string), 13 * 0.6), fill: \"none\",")
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "a CHROMATIC approach is a STARBURST" in r.stdout
        record("the chromatic approach loses its shape (a circle in the right colour)",
               r.returncode != 0 and hit,
               "suite exit %d; the shape pin bit: %s" % (r.returncode, hit))
    finally:
        p.write_text(original)


MUTATIONS = None      # bound in main() — the one list, preflighted then run


def preflight(fns):
    """Every anchor checked against its file BEFORE any mutation runs. Two of
    the last three nights lost a full ~80-minute harness run to a rotted
    anchor (m16, then m19); the 260830 rot guard made rot visible at the end
    of the run — this makes it visible at the START. Subprocess helpers are
    stubbed and patch() returns byte-identical writes, so the bodies run
    without side effects and multi-patch mutations are covered whole."""
    import types
    g = globals()
    real = {k: g[k] for k in ("sh", "build", "suite", "record")}
    fake = types.SimpleNamespace(returncode=0, stdout="", stderr="")
    g["sh"] = lambda *a, **k: fake
    g["build"] = lambda *a, **k: None
    g["suite"] = lambda *a, **k: fake
    g["record"] = lambda *a, **k: None
    # 0d: a leftover tuner-card from a kill or a no-delete sandbox is
    # cleaned idempotently; a FAILED delete is an ENVIRONMENT note, never
    # rot — false rot is the noise this preflight exists to remove
    try:
        (REPO / "hub/modules/tuner-card.mjs").unlink(missing_ok=True)
    except OSError as e:
        log_line(f"  ENVIRONMENT  cannot delete leftover tuner-card.mjs ({e}) — "
                 "m6 may misreport until it is removed by hand")
    PREFLIGHT["on"] = True
    try:
        for fn in fns:
            try:
                fn()
            except Exception as e:  # noqa: BLE001 — a crash here is rot too
                PREFLIGHT["rotted"].append(f"{fn.__name__}: preflight crashed: {e}")
    finally:
        PREFLIGHT["on"] = False
        for k, v in real.items():
            g[k] = v
    # THE GREP-TARGET PREFLIGHT (260905, the carried item): m23's expected
    # message rotted when a pin was renamed, and the anchor pass cannot see
    # it. Cheap version, no suite run: every `"…" in r.stdout` literal in
    # this file's own source must appear somewhere in door_locks.py — a
    # renamed pin message now fails HERE, in a second, by name.
    import re as _re
    src = (REPO / "hub" / "tests" / "bite.py").read_text()
    gates = (REPO / "hub" / "tests" / "door_locks.py").read_text()
    # both sides normalised past Python's own seams: f-string line wraps and
    # quote boundaries dissolve, whitespace collapses. Targets that quote
    # RUNTIME values (interpolated lists etc.) are skipped — the check is for
    # renamed pin messages (the m23 rot), not for output simulation.
    norm = lambda t: _re.sub(r"\s+", " ", t.replace('\\u266d', '\u266d')
        .replace('f"', '').replace('"', ''))
    # module load-assertion texts surface through the gate's output too
    # (m11 greps field-board's own error), so the searched corpus is the
    # gate PLUS every hub module and engine source
    from pathlib import Path as _P
    corpus = [gates]
    for pat in ("hub/modules", "engine"):
        for p in sorted((_P(REPO) / pat).glob("*.mjs")):
            corpus.append(p.read_text())
    gates_n = norm("\n".join(corpus))
    greps = [g for g in _re.findall(r'"([^"\n]{12,})" in r\.stdout', src)
             if "['" not in g and "…" not in g]
    for gtext in greps:
        if norm(gtext) not in gates_n:
            PREFLIGHT["rotted"].append(f"grep target not in door_locks.py: {gtext!r}")
    if PREFLIGHT["rotted"]:
        print(f"ANCHOR PREFLIGHT: {len(PREFLIGHT['rotted'])} rotted "
              f"(of {PREFLIGHT['checked']} anchors + {len(greps)} grep targets) — fix first:")
        for r in PREFLIGHT["rotted"]:
            print("  ROTTED  " + r)
        sys.exit(1)
    print(f"anchor preflight: {PREFLIGHT['checked']} anchors and {len(greps)} grep targets checked, none rotted\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--log", default=None,
        help="line-buffered log path (default hub/tests/out/bite-<stamp>.log)")
    args = ap.parse_args()
    stamp = datetime.datetime.now().strftime("%m%d-%H%M")
    logp = open_log(args.log or (HUB / "tests" / "out" / f"bite-{stamp}.log"))
    log_line(f"log: {logp}")
    log_line("hub bite harness — every stage-2 assertion must be seen to fail\n")
    fns = (m1_shell_styles_a_module, m2_module_styles_another_module,
               m3_styles_shipped_regardless_of_reach, m4_markup_shipped_regardless_of_reach,
               m5_dynamic_import_and_lookup_by_string, m6_new_module_no_door_edited,
               m7_checkbox_only_row_returns, m8_moved_accents_dead, m9_moved_voice_dead,
               m10_field_frozen_on_key_change, m11_field_walk_loses_a_string,
               m12_set_change_resets_the_design, m13_live_setindex_hijacks_the_field,
               m14_take_collapses_into_placement, m15_scale_material_silently_halved,
               m16_card_moved_between_rows, m17_part_moved_between_seats,
               m18_repeat_stops_being_the_ordinal, m19_chord_reroots_at_the_window,
               m20_reference_refusal_goes_silent, m21_typed_romans_stop_resolving,
               m22_the_figure_never_reaches_the_sound, m23_the_walk_goes_deaf_to_the_window,
               m24_the_boot_refuses_its_second_bar, m25_take_does_movement_duty_again,
               m26_the_second_sounding_path_returns, m27_the_cap_stops_covering,
               m28_the_board_goes_deaf_to_the_window, m29_the_reference_loses_its_role,
               m30_the_window_forgets_the_octave, m31_a_bar_dies_without_a_reason,
               m32_the_override_goes_silent_again, m33_the_audition_goes_silent,
               m34_the_figure_tolerates_junk_again, m35_the_engine_refusal_swallowed_again,
               m36_repeat_stops_repeating, m37_restore_overwrites_the_pad_again,
               m38_a_tone_the_object_cannot_hold_slips_through, m39_the_row_stops_moving_as_one,
               m40_every_approach_goes_violet, m41_no_approach_goes_violet,
               m42_a_state_clause_returns_to_the_hint, m43_a_readout_copies_the_necks_box,
               m44_the_palettes_R_drifts_by_one, m45_a_second_tuning_is_declared, m46_a_flat_key_spells_sharp,
               m47_a_set_square_loses_its_name, m48_a_set_square_loses_its_role,
               m49_the_leftover_pass_runs_under_a_cap, m50_the_loss_goes_quiet_again,
               m51_the_reach_is_unbounded_again, m52_the_speller_keeps_the_letter_again,
               m53_a_carried_card_drifts_in_a_hand_page, m54_the_chromatic_approach_loses_its_shape)
    preflight(fns)
    for fn in fns:
        LIVE["mutation"] = fn.__name__
        try:
            fn()
        except BuildBroken as e:
            record(fn.__name__, False, "the BUILD broke, so the suite never ran "
                   "against this mutation: " + str(e))
        except AssertionError as e:
            record(fn.__name__, False, "the mutation anchor rotted — the harness "
                   "must be updated with the code it mutates: " + str(e))
    LIVE["mutation"] = None
    build()
    r = suite()
    green = r.returncode == 0
    log_line("\nreverted and rebuilt: suite %s" % ("GREEN" if green else "RED — SOURCES MAY BE DIRTY"))
    bad = [n for ok, n, _ in results if not ok]
    log_line("%d/%d mutations behaved as required" % (len(results) - len(bad), len(results)))
    log_line(f"log: {LOG['path']}")
    for n in bad:
        print("  DID NOT BITE: " + n)
    return 0 if green and not bad else 1


if __name__ == "__main__":
    sys.exit(main())
