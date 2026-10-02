"""_selfcheck_guard.py — A VISITOR NEVER SEES A SELF-CHECK FAIL, IN ANY STATE THE GATE DRIVES (night 85, dispatch 261056).

A published study showed visitors "assertion failed — every selected note is a real field note in the frame — returned
false" on every bar whose chord holds a tone the key lacks. It was seen twice and filed by neither sighting, because no
check looked: each block of the door gate asserted its OWN subject and walked past a red line it was not asking about.

So this is a MECHANISM, not a block (the empty-lookup guard's shape): every page the door gate opens carries an observer
on the readout's self-check line (#roAssert). Every render of it is counted, and any render whose self-check FAILED (the
readout marks it with data-selfcheck since night 85; the old "assertion failed" wording is watched too) is reported with
the door and the text. The gate fails on any, at the end of the run, naming each.

WHAT IT CANNOT SEE — said, not assumed: only the states some block drives. Most of key × scale × source × object × set ×
placement is never visited by a browser; that space is covered for the readout's placement law by
hub/tests/neck-readout.test.mjs's sweep of every bar the readout can derive (and the readout's other three self-checks
never fail anywhere in it). A custom chart's arbitrary symbols, tunings and gamuts are not swept.
"""

STATE = {"renders": 0, "doors": set(), "failed": []}

INIT_JS = r"""(() => {
  if (window.__scg) return; window.__scg = true;
  let last = null, el = null, cfg = {}, step = null;
  // the STATE a failure happened in, so a failing report names what to reproduce (the config merged, the bar)
  document.addEventListener('atetudes:config', (e) => { if (e.detail && typeof e.detail === 'object') cfg = { ...cfg, ...e.detail }; });
  document.addEventListener('atetudes:step', (e) => { if (e.detail && e.detail.request !== true && typeof e.detail.index === 'number') step = e.detail.index; });
  const stateOf = () => { const keep = ['key', 'scale', 'object', 'tones', 'source', 'cycle', 'form', 'custom', 'strings', 'startDeg', 'nearFret', 'notesPer', 'take', 'gamut', 'ref', 'centreSrc', 'bass', 'sounded', 'tuning'];
    return JSON.stringify(Object.fromEntries(keep.filter((k) => k in cfg).map((k) => [k, cfg[k]]))) + ' bar ' + (step == null ? '?' : step + 1); };
  const look = () => {
    el = el && el.isConnected ? el : (window.__may ? __may(() => document.getElementById('roAssert'), 'the self-check guard looks on every page; most have no readout yet, or none') : document.getElementById('roAssert'));
    if (!el) return;
    const text = el.textContent || '', fail = el.dataset.selfcheck || (/assertion failed|returned false/i.test(text) ? text : '');
    const key = text + '|' + fail;
    if (key === last || !text) return;
    last = key;
    if (window.__scgSaw) window.__scgSaw(fail ? 'FAIL ' + fail + ' || state: ' + stateOf() + ' || shown: ' + text : '');
  };
  new MutationObserver(look).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['data-selfcheck'] });
})();"""


def install(door_of):
    """patch every new browser context the gate opens: the observer, and the binding it reports through"""
    from playwright.sync_api import Browser
    orig = Browser.new_context
    if getattr(orig, "_selfcheck_guard", False):   # installed once: a second wrap would register the binding twice
        return

    def new_context(self, *a, **k):
        c = orig(self, *a, **k)

        def saw(source, failed):
            STATE["renders"] += 1
            STATE["doors"].add(door_of())
            if failed:
                STATE["failed"].append((door_of(), failed[:900]))
        c.expose_binding("__scgSaw", saw)
        c.add_init_script(INIT_JS)
        return c
    new_context._selfcheck_guard = True
    Browser.new_context = new_context


def verdict(check):
    """at the end of the run: no driven state showed a failing self-check, and the guard saw real renders"""
    seen = sorted(set(STATE["failed"]))
    for door, text in seen[:12]:
        check(False, f"[{door}] A VISITOR SAW A SELF-CHECK FAIL on the readout: {text}")
    readout_doors = sorted(d for d in STATE["doors"] if d)
    print(f"self-check guard (night 85): {STATE['renders']} readout self-check render(s) observed on "
          f"{', '.join(readout_doors) or 'no door'}; {len(seen)} distinct failing state(s)")
    return STATE["renders"]
