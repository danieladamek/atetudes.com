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


def main():
    print("hub bite harness — every stage-2 assertion must be seen to fail\n")
    for fn in (m1_shell_styles_a_module, m2_module_styles_another_module,
               m3_styles_shipped_regardless_of_reach, m4_markup_shipped_regardless_of_reach,
               m5_dynamic_import_and_lookup_by_string, m6_new_module_no_door_edited):
        try:
            fn()
        except BuildBroken as e:
            record(fn.__name__, False, "the BUILD broke, so the suite never ran "
                   "against this mutation: " + str(e))
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
