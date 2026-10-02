"""_bench_record.py — A SAVED ÉTUDE COMES BACK AS THE WHOLE BENCH (night 83 — Daniel, 2026-10-01, ruling 261050 §5;
scoping 261052). The door gate's half, on the real cards, at the artifact: the saved entry and the controls.

The record (hub/etude-record.mjs) absorbs whole messages and names only what it EXCLUDES. Three claims, each checked
on every door that keeps a practice log:

  1. A KEY ON A RECORDED MESSAGE IS EITHER SAVED OR NAMED AS EXCLUDED (rule 6). Every key the real cards say on the
     config, the clock's state and the mixer while the bench is driven is either in the saved entry, in its place, or in
     EXCLUDED — read from the record itself, never restated here. A key that is neither fails, by name. And no key may
     sit flat on two messages, or restore could not tell whose it is.

  2. THE WHOLE BENCH COMES BACK. The bench is COMPUTED: every input control of every card whose source says the clock's
     state or the mix (the metronome, the mixer card, the mixer strip, the transport — today). Saved at boot, then
     driven off its defaults with the click muted and the clock PLAYING, saved again; on a fresh page each entry is
     restored and every control must read as it did when that entry was saved. The boot entry is the check that a
     setting is SAID AT ITS DEFAULT — what is said only when it moves is never recorded where it starts. And restoring
     an entry saved while playing must not start the clock: LOADING AN ÉTUDE MAY NOT START PLAYBACK.

  3. AN ENTRY FROM BEFORE TONIGHT IS BENCH-BLIND (Daniel, 2026-10-02: "leave them where they are" — the click stays
     muted). A REAL pre-night-83 entry (hub/tests/pre-n83-entries.json, captured from the pre-change build, never
     typed) is restored over a moved bench: the clock is asked for exactly the bench keys the entry carries, no mix is
     announced, and every bench control stays where the player left it.
"""
import json
import re
import subprocess
from pathlib import Path

from _empty_guard import absent_ok

HUB = Path(__file__).resolve().parent.parent
REPO = HUB.parent
FIXTURE = HUB / "tests" / "pre-n83-entries.json"

CFG, CLOCK, CLOCK_STATE, MIXER, BEAT = ("atetudes:config", "atetudes:clock", "atetudes:clock-state", "atetudes:mixer",
                                        "atetudes:beat")
RECORDED = (CFG, CLOCK_STATE, MIXER)

# every message the gate needs to see, from the page's first script on: keys seen per message, the merged last state,
# the clock requests and the mixer announces (resettable), and a beat count
CAPTURE_JS = """(() => { if (window.__bench) return;
  const B = window.__bench = { seen: {}, last: {}, asked: [], mixed: [], beats: 0 };
  for (const n of %s) document.addEventListener(n, (e) => {
    const m = e.detail; if (!m || typeof m !== 'object') return;
    (B.seen[n] ||= {}); for (const k of Object.keys(m)) B.seen[n][k] = 1;
    B.last[n] = { ...(B.last[n] || {}), ...m };
    if (n === %r) B.asked.push(m);
    if (n === %r) B.mixed.push(m);
  });
  document.addEventListener(%r, () => { B.beats++; });
})();""" % (json.dumps([*RECORDED, CLOCK]), CLOCK, MIXER, BEAT)


def node_json(code):
    r = subprocess.run(["node", "--input-type=module", "-e", code], capture_output=True, text=True, cwd=REPO)
    if r.returncode != 0:
        raise RuntimeError(f"node: {r.stderr.strip()[:300]}")
    return json.loads(r.stdout)


def the_record():
    """EXCLUDED and PLACE, read from the record itself — the gate restates neither"""
    return node_json('import { EXCLUDED, PLACE } from "./hub/etude-record.mjs";'
                     'console.log(JSON.stringify({ EXCLUDED, PLACE }));')


def bench_controls():
    """THE BENCH, COMPUTED: the controls of every module whose source says the clock's state or the mix"""
    return node_json("""
      import { readdirSync, readFileSync } from "node:fs";
      const out = {};
      for (const f of readdirSync("hub/modules").filter((f) => f.endsWith(".mjs")).sort()) {
        if (!/announce\\(d,\\s*(CLOCK_STATE|MIXER)\\b/.test(readFileSync("hub/modules/" + f, "utf8"))) continue;
        for (const v of Object.values(await import("./hub/modules/" + f)))
          if (v && v.id && Array.isArray(v.controls)) out[v.id] = v.controls;
      }
      console.log(JSON.stringify(out));""")


# the bench's INPUT controls this door mounts (buttons are actions, spans are readouts — the mutes are views of levels)
PRESENT_JS = """(ids) => __may(() => ids.filter((i) => { const e = document.getElementById(i);
  return e && (e.tagName === 'SELECT' || (e.tagName === 'INPUT' && ['checkbox', 'range', 'number'].includes(e.type))); }),
  'the bench is the union of every door\\'s cards; a door mounts some of them')"""
VALUES_JS = """(ids) => Object.fromEntries(ids.map((i) => { const e = document.getElementById(i);
  return [i, e.type === 'checkbox' ? e.checked : e.value]; }))"""
# every control OFF ITS DEFAULT: a select's last offered option that is neither its current nor its default; a checkbox
# against its default; a number away from both its current and its default. Each fires as a player's change would.
DRIVE_JS = """(ids) => { const fire = (e, t) => e.dispatchEvent(new Event(t, { bubbles: true }));
  for (const i of ids) { const e = document.getElementById(i);
    if (e.tagName === 'SELECT') {
      const dflt = [...e.options].find((o) => o.defaultSelected);
      const opts = [...e.options].filter((o) => !o.disabled && o.value !== e.value && o !== dflt);
      if (!opts.length) continue;
      e.value = opts[opts.length - 1].value;
    } else if (e.type === 'checkbox') e.checked = !e.defaultChecked;
    else { const min = +e.min || 0, max = e.max === '' ? min + 100 : +e.max, step = +e.step || 1;
      let v = min + Math.round((max - min) * 0.37 / step) * step;
      while (String(v) === e.value || String(v) === e.defaultValue) v += step;
      e.value = String(v); }
    fire(e, 'input'); fire(e, 'change'); }
  return true; }"""


def run(browser, check, build_dir, doors):
    rec = the_record()
    excluded, place = rec["EXCLUDED"], rec["PLACE"]
    bench = bench_controls()
    all_ids = [i for ids in bench.values() for i in ids]
    check(len(bench) >= 2 and all_ids, f"[bench] the bench is computed from the sources, not passed on nothing: {sorted(bench)}")
    fixture = json.loads(FIXTURE.read_text())["entries"]
    seen_excl = set()
    print(f"the bench (night 83): {len(all_ids)} control(s) of {', '.join(sorted(bench))} · "
          f"exclusions read from the record: " + ", ".join(f"{n.split(':')[1]}.{k}" for n, ks in excluded.items() for k in ks))
    for door in doors:
        html = build_dir / f"{door}.html"
        if 'id="saveEntry"' not in html.read_text():
            print(f"  [{door}] keeps no practice log — nothing to record")
            continue
        seen_excl |= _door(browser, check, html, door, excluded, place, all_ids, fixture.get(door))
    never = sorted(f"{n.split(':')[1]}.{k}" for n, ks in excluded.items() for k in ks if (n, k) not in seen_excl)
    if never:
        print(f"  exclusions no driven door said tonight (kept — a restored entry can still carry them): {', '.join(never)}")


def _door(browser, check, html, door, excluded, place, all_ids, old_entry):
    tag = f"[{door} bench]"
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    ctx.add_init_script(CAPTURE_JS)
    page = ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    key = f"{door}.v1.log"
    boot = lambda: (page.goto(html.as_uri()), page.wait_for_timeout(450))
    boot()
    ids = page.evaluate(PRESENT_JS, all_ids)
    check(len(ids) >= 4, f"{tag} the door mounts bench controls to drive: {ids}")
    values = lambda: page.evaluate(VALUES_JS, ids)
    bench = lambda: page.evaluate("() => window.__bench")
    state = lambda: (bench()["last"].get(CLOCK_STATE) or {})

    def save(text):
        page.fill("#journalIn", text); page.click("#saveEntry"); page.wait_for_timeout(300)
        log = json.loads(page.evaluate(f"() => localStorage.getItem({key!r})"))
        hit = [e for e in log["entries"] if text in (e.get("text") or "")]
        check(len(hit) == 1, f"{tag} the entry {text!r} was saved once: {len(hit)}")
        return hit[0]["payload"]["data"] if hit else {}

    def restore(text):
        rows = [r for r in page.query_selector_all(".hist") if text in r.inner_text()]
        check(len(rows) == 1, f"{tag} one log row holds {text!r}: {len(rows)}")
        if rows:
            rows[0].query_selector(".acts button[data-cap='apply']").click()   # by role (rule 12), never its caption
        page.wait_for_timeout(450)

    def differ(a, b):
        return {i: (a.get(i), b.get(i)) for i in ids if a.get(i) != b.get(i)}

    def drive_off_defaults():
        page.evaluate(DRIVE_JS, ids); page.wait_for_timeout(250)
        # THE CLICK MUTED — the setting Daniel named ("the click stays muted"); the mute is the level at zero
        if page.get_attribute("#clickMute", "aria-pressed") != "true":
            page.click("#clickMute"); page.wait_for_timeout(120)
        check(page.get_attribute("#clickMute", "aria-pressed") == "true", f"{tag} the click is muted before the save")

    # ---- 2a: an entry saved AT BOOT — every bench setting must be said at its default to be recorded there
    v_boot = values()
    save("n83 the bench at boot")
    # ---- 2b: the bench off its defaults, the click muted, the clock PLAYING — then saved
    drive_off_defaults()
    with absent_ok("a door without the étude's Play has only the metronome's own Start"):
        play = page.query_selector("#playBtn")
    (play or page.query_selector("#metroBtn")).click()
    page.wait_for_timeout(350)
    check(state().get("running") is True, f"{tag} the clock is PLAYING when the entry is saved: {state()}")
    v_moved = values()
    moved_n = len(differ(v_boot, v_moved))
    check(moved_n >= len(ids) // 2, f"{tag} the drive moved the bench off its defaults: {moved_n} of {len(ids)} — "
                                    f"{sorted(set(ids) - set(differ(v_boot, v_moved)))} unmoved")
    seen = {n: set(ks) for n, ks in bench()["seen"].items()}
    data = save("n83 the bench, moved and playing")

    # ---- 1: every key on a recorded message is saved or excluded; no key on two flat messages
    neither, saved_n, excl_n, said = [], 0, 0, set()
    for name in RECORDED:
        where = data if place[name] is None else (data.get(place[name]) or {})
        for k in sorted(seen.get(name, ())):
            if k in excluded[name]:
                excl_n += 1; said.add((name, k))
                check(k not in where, f"{tag} {name.split(':')[1]}.{k} is EXCLUDED ({excluded[name][k]}) but the saved "
                                      f"entry carries it: {where.get(k)!r}")
            elif k in where:
                saved_n += 1
            else:
                neither.append(f"{name.split(':')[1]}.{k}")
    check(not neither, f"{tag} a key on a recorded message is NEITHER saved NOR named as excluded: {neither} — the record "
                       f"names what it excludes (hub/etude-record.mjs EXCLUDED); a key that is neither is a setting "
                       f"forgotten in silence")
    flat = [n for n in RECORDED if place[n] is None]
    clash = sorted(set.intersection(*(seen.get(n, set()) for n in flat)))
    check(not clash, f"{tag} a key sits flat on two recorded messages, so restore cannot tell whose it is: {clash}")
    names = sorted({p for p in place.values() if p} & set().union(*(seen.get(n, set()) for n in flat)))
    check(not names, f"{tag} a flat message says a key named like a nested place: {names}")
    check(saved_n > 0 and seen.get(CLOCK_STATE) and seen.get(CFG),
          f"{tag} the key check read the real messages, not nothing: {saved_n} saved, messages {sorted(seen)}")
    print(f"  {tag} {saved_n + excl_n + len(neither)} key(s) said on {sum(1 for n in RECORDED if seen.get(n))} recorded "
          f"message(s): {saved_n} saved, {excl_n} excluded by name, {len(neither)} neither · {len(ids)} bench control(s)")

    # ---- 2c: a fresh page; the moved entry comes back whole, and does not play
    boot()
    check(len(differ(values(), v_moved)) >= moved_n // 2,
          f"{tag} the reload came back at the defaults, so the restore below is a real change: {differ(values(), v_moved)}")
    beats = bench()["beats"]
    restore("n83 the bench, moved and playing")
    page.wait_for_timeout(300)
    off = differ(v_moved, values())
    check(not off, f"{tag} A SAVED ÉTUDE COMES BACK AS THE WHOLE BENCH — restored, these controls did not return to what "
                   f"was saved (saved, now): {off}")
    check(state().get("running") is False and bench()["beats"] == beats,
          f"{tag} LOADING AN ÉTUDE MAY NOT START PLAYBACK — an entry saved while playing was restored and the clock "
          f"{'runs' if state().get('running') else 'beat'} ({bench()['beats'] - beats} beat(s))")
    # ---- 2d: the entry saved at boot brings the defaults back over the moved bench
    restore("n83 the bench at boot")
    off = differ(v_boot, values())
    check(not off, f"{tag} the entry saved at boot did not bring the defaults back — a setting said only when it moves "
                   f"is never recorded at its default (saved, now): {off}")

    # ---- 3: a REAL entry from before tonight, restored over a moved bench, moves nothing of it
    if old_entry is None:
        print(f"  {tag} no pre-night-83 entry was captured for this door — it postdates the bench (nothing to restore)")
    else:
        old = old_entry["payload"]["data"]
        log = json.loads(page.evaluate(f"() => localStorage.getItem({key!r})"))
        log["entries"] = [old_entry]
        page.evaluate("([k, v]) => localStorage.setItem(k, v)", [key, json.dumps(log)])
        boot()
        drive_off_defaults()
        # THE PAGE FIRST AGREES WITH EVERYTHING THE ENTRY SAYS — its own clock keys (a pre-tonight entry carries the
        # tempo and the meter) asked of the clock, its config said on the config — so anything that moves below moved
        # because the restore reached PAST what the entry has. (The reference tone is the entry's: it moves with it.)
        clock_keys = set(state())
        own = {k: old[k] for k in old if k in clock_keys}
        conf = {k: v for k, v in old.items() if k not in clock_keys and k not in {p for p in place.values() if p}}
        say = "([n, m]) => document.dispatchEvent(new CustomEvent(n, { detail: m }))"
        page.evaluate(say, [CLOCK, own])
        page.evaluate(say, [CFG, {**conf, "gamut": conf.get("gamut")}])
        page.wait_for_timeout(300)
        v_before = values()
        page.evaluate("() => { window.__bench.asked = []; window.__bench.mixed = []; }")
        restore(old_entry.get("text", "")[:40] or "pre-night-83")
        asked = sorted({k for m in bench()["asked"] for k in m})
        check(bench()["asked"], f"{tag} the pre-tonight entry was restored — the clock was asked (the restore ran)")
        check(asked == sorted(own), f"{tag} AN ENTRY FROM BEFORE TONIGHT RESTORES ONLY WHAT IT HAS — the clock was asked "
                                    f"for {asked}, the entry carries {sorted(own)}: silence in a file means 'not "
                                    f"recorded', never 'the default' (Daniel, 2026-10-02)")
        check(not bench()["mixed"], f"{tag} a pre-tonight entry carries no mix, and one was announced: {bench()['mixed']}")
        moved = differ(v_before, values())
        check(not moved, f"{tag} THE BENCH MOVED under a pre-tonight entry (was, now): {moved} — Daniel: leave them "
                         f"where they are")
        check(page.get_attribute("#clickMute", "aria-pressed") == "true",
              f"{tag} the click stays muted under a pre-tonight entry (Daniel, 2026-10-02)")
        print(f"  {tag} a pre-night-83 entry restored: the clock asked for {asked} only, no mix, "
              f"{len(v_before)} bench control(s) unmoved")
    check(not errs, f"{tag} no page errors: {errs[:3]}")
    ctx.close()
    return said
