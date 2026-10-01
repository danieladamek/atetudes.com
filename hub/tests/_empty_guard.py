"""_empty_guard.py — A LOOKUP THAT FINDS NOTHING IS AN ERROR, NOT A PASS (night 81, dispatch 261048, rule 2).

Three mechanisms in seven days looked like they were guarding something they could not see. The third was the harmony
panel's "no overlap" check: it queried `.hp-strip`, a class the panel lost on 2026-08-17, found nothing, compared
nothing, and passed for six weeks. A check over an empty set is vacuously true. This guard makes the empty set loud.

WHAT IT WATCHES — the door gate's own lookups, both sides:
  Python   page.query_selector / query_selector_all, element.query_selector / query_selector_all, and the selector of
           page.eval_on_selector_all (counted before the function runs). (inner_text, click, fill, select_option,
           input_value and eval_on_selector already THROW on a missing element — loud by construction, not watched.)
  JS       document/element.querySelector, querySelectorAll and document.getElementById called BY GATE CODE inside
           page.evaluate / eval_on_selector(_all) / element.evaluate. Gate code is told from the app's own code by the
           caller's stack frame: the app runs from the page's file:// URL, the gate's evaluated code does not. The app's
           own null lookups (it probes optional markup all the time) are never counted. Lookups made while
           wait_for_function polls are discarded — "not yet" is not "never".

ABSENCE IS DECLARED WHERE IT IS ASSERTED, never in a list: `with absent_ok("why absence is the point here"):` around
the Python call, or `__may(() => <expr>, "why")` inside the gate's own JS (for a lookup in a shared JS string evaluated
from many places). Everything else that comes back empty is an error.

MODES (env EMPTY_GUARD): "strict" (default) — every undeclared empty lookup fails the gate, naming its line in
door_locks.py and the selector; "census" — record and report, fail nothing (how the guard was turned on: measure first).
"""
import contextlib
import json
import os
import traceback

MODE = os.environ.get("EMPTY_GUARD", "strict")
STATE = {"absent": 0, "door": None, "hits": [], "declared": 0, "watched": 0}

INIT_JS = r"""(() => {
  if (window.__gq) return;
  const G = window.__gq = { empty: [], may: 0 };
  /* ABSENCE DECLARED IN THE GATE'S OWN JS: __may(() => expr, "why") — lookups inside find nothing without counting */
  window.__may = (fn, why) => { if (!why || String(why).length < 8) throw new Error('__may needs its reason');
    G.may++; try { return fn(); } finally { G.may--; } };
  const byGate = () => {
    if (G.may > 0) return false;
    const lines = (new Error().stack || '').split('\n');
    const caller = lines[3] || '';            // [0] Error · [1] byGate · [2] the wrapper · [3] whoever called it
    return caller && !/file:\/\//.test(caller);
  };
  const wrap = (proto, name, isEmpty) => {
    const f = proto[name];
    proto[name] = function (...a) {
      const r = f.apply(this, a);
      if (isEmpty(r) && byGate()) G.empty.push(name + '(' + String(a[0]).slice(0, 140) + ')');
      return r;
    };
  };
  wrap(Document.prototype, 'querySelector', (r) => r === null);
  wrap(Document.prototype, 'querySelectorAll', (r) => r.length === 0);
  wrap(Element.prototype, 'querySelector', (r) => r === null);
  wrap(Element.prototype, 'querySelectorAll', (r) => r.length === 0);
  wrap(Document.prototype, 'getElementById', (r) => r === null);
})();"""

DRAIN_JS = "() => { const g = window.__gq; if (!g) return []; const e = g.empty; g.empty = []; return e; }"


@contextlib.contextmanager
def absent_ok(why):
    """absence IS the assertion here — say why; lookups inside find nothing without failing"""
    assert why and len(why) > 8, "absent_ok needs its reason"
    STATE["absent"] += 1
    STATE["declared"] += 1
    try:
        yield
    finally:
        STATE["absent"] -= 1


def _site():
    for fr in reversed(traceback.extract_stack()):
        if fr.filename.endswith("door_locks.py"):
            return f"door_locks.py:{fr.lineno}"
    return "?"


def install(check):
    from playwright.sync_api import Page, ElementHandle, Browser

    def record(kind, sel):
        if STATE["absent"] > 0:
            return
        site = _site()
        STATE["hits"].append({"site": site, "kind": kind, "sel": str(sel)[:160], "door": STATE["door"]})
        if MODE == "strict":
            check(False, f"[{STATE['door']}] a lookup found NOTHING at {site}: {kind}({str(sel)[:120]!r}) — an empty "
                         f"lookup is an error (night 81); if absence IS the assertion, wrap it in absent_ok(why)")

    orig = {}

    def patch(cls, name, make):
        orig[(cls, name)] = getattr(cls, name)
        setattr(cls, name, make(orig[(cls, name)]))

    def drain(page):
        try:
            for e in orig[(Page, "evaluate")](page, DRAIN_JS):
                record("js:" + e.split("(")[0], e[e.index("(") + 1:-1])
        except Exception:   # a page that navigated away or closed has nothing to drain
            pass

    def page_of(h):
        return h if isinstance(h, Page) else getattr(h, "_gq_page", None)

    def q_one(f):
        def g(self, sel, *a, **k):
            STATE["watched"] += 1
            r = f(self, sel, *a, **k)
            if r is None:
                record("query_selector", sel)
            elif isinstance(self, Page):
                r._gq_page = self
            return r
        return g

    def q_all(f):
        def g(self, sel, *a, **k):
            STATE["watched"] += 1
            r = f(self, sel, *a, **k)
            if not r:
                record("query_selector_all", sel)
            return r
        return g

    def eval_all(f):
        def g(self, sel, expr, *a, **k):
            STATE["watched"] += 1
            if not orig[(Page, "query_selector_all")](self, sel):
                record("eval_on_selector_all", sel)
            r = f(self, sel, expr, *a, **k)
            drain(self)
            return r
        return g

    def ev(f):
        def g(self, *a, **k):
            r = f(self, *a, **k)
            p = page_of(self)
            if p is not None:
                drain(p)
            return r
        return g

    def wait(f):
        def g(self, *a, **k):
            r = f(self, *a, **k)
            try:
                orig[(Page, "evaluate")](self, DRAIN_JS)   # polling lookups are "not yet", never "never" — discarded
            except Exception:
                pass
            return r
        return g

    def ctx(f):
        def g(self, *a, **k):
            c = f(self, *a, **k)
            c.add_init_script(INIT_JS)
            return c
        return g

    patch(Page, "evaluate", ev)
    patch(Page, "query_selector", q_one)
    patch(Page, "query_selector_all", q_all)
    patch(Page, "eval_on_selector_all", eval_all)
    patch(Page, "eval_on_selector", ev)
    patch(Page, "wait_for_function", wait)
    patch(ElementHandle, "query_selector", q_one)
    patch(ElementHandle, "query_selector_all", q_all)
    patch(ElementHandle, "evaluate", ev)
    patch(Browser, "new_context", ctx)


def report(out_path):
    """the census: every distinct site that found nothing, with its doors and selectors"""
    by = {}
    for h in STATE["hits"]:
        k = (h["site"], h["kind"], h["sel"])
        by.setdefault(k, set()).add(h["door"])
    rows = sorted(by.items(), key=lambda kv: int(kv[0][0].split(":")[1]) if kv[0][0][-1].isdigit() else 0)
    from pathlib import Path   # night 81: hub/tests/out is gitignored — on a fresh checkout (CI) it does not exist
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump([{"site": s, "kind": k, "sel": sel, "doors": sorted(d)} for (s, k, sel), d in rows], f, indent=1)
    return rows
