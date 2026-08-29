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
import subprocess
import sys
from pathlib import Path

HUB = Path(__file__).resolve().parent.parent
REPO = HUB.parent
results = []


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


def record(name, ok, detail):
    results.append((ok, name, detail))
    print(("  BITES    " if ok else "  NO BITE  ") + name + " — " + detail)


def patch(path, find, replace):
    p = REPO / path
    original = p.read_text()
    assert find in original, f"mutation anchor not found in {path}"
    return p, original, original.replace(find, replace, 1)


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
        hit = ("the field did not re-derive" in r.stdout
               or "the field hint did not follow the key" in r.stdout)
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
    p, original, mutated = patch("hub/modules/field-board.mjs",
        "      const moved = reanchor(curB.pos, next, fld);\n"
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
        hit = "hijacked the field" in r.stdout or "derived label is not in the hint" in r.stdout
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
        hit = ("the log rides it" in r.stdout or "under v0.9's 'Notepad' header" in r.stdout) \
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
    # tonight's found defect, reintroduced: rooting the chord at the window's
    # anchor degree boots the door on Gm7 where the ruling (register 11) and
    # v0.9 hold the B-flat tetrad block. The strengthened boot pin must bite.
    p, original, mutated = patch("hub/modules/field-board.mjs",
        "        const keyDeg = fld.ref % 7;",
        "        const keyDeg = (pos.startDeg + fld.ref) % 7;")
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
    p, original, mutated = patch("hub/modules/field-board.mjs",
        '          : (refP.reason ? ` Reference refused: ${refP.reason}.` : "")) +',
        '          : "") +')
    try:
        p.write_text(mutated)
        build()
        r = suite()
        hit = "must refuse the reference BY NAME on the face" in r.stdout
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


def main():
    print("hub bite harness — every stage-2 assertion must be seen to fail\n")
    for fn in (m1_shell_styles_a_module, m2_module_styles_another_module,
               m3_styles_shipped_regardless_of_reach, m4_markup_shipped_regardless_of_reach,
               m5_dynamic_import_and_lookup_by_string, m6_new_module_no_door_edited,
               m7_checkbox_only_row_returns, m8_moved_accents_dead, m9_moved_voice_dead,
               m10_field_frozen_on_key_change, m11_field_walk_loses_a_string,
               m12_set_change_resets_the_design, m13_live_setindex_hijacks_the_field,
               m14_take_collapses_into_placement, m15_scale_material_silently_halved,
               m16_card_moved_between_rows, m17_part_moved_between_seats,
               m18_repeat_stops_being_the_ordinal, m19_chord_reroots_at_the_window,
               m20_reference_refusal_goes_silent, m21_typed_romans_stop_resolving):
        try:
            fn()
        except BuildBroken as e:
            record(fn.__name__, False, "the BUILD broke, so the suite never ran "
                   "against this mutation: " + str(e))
        except AssertionError as e:
            record(fn.__name__, False, "the mutation anchor rotted — the harness "
                   "must be updated with the code it mutates: " + str(e))
    build()
    r = suite()
    green = r.returncode == 0
    print("\nreverted and rebuilt: suite %s" % ("GREEN" if green else "RED — SOURCES MAY BE DIRTY"))
    bad = [n for ok, n, _ in results if not ok]
    print("%d/%d mutations behaved as required" % (len(results) - len(bad), len(results)))
    for n in bad:
        print("  DID NOT BITE: " + n)
    return 0 if green and not bad else 1


if __name__ == "__main__":
    sys.exit(main())
