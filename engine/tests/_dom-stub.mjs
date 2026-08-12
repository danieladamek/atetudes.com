/* _dom-stub.mjs — the headless DOM stub the surface suites share.
 * One source per fact (family spec §4.3): notepad-surface.test.mjs and
 * host-conformance.test.mjs mount the same stub, so the stub itself cannot
 * fork. Elements carry value, style, listeners and a click() that dispatches
 * them. No innerHTML exists anywhere in it.
 */
export function makeDoc() {
  const doc = {
    createElement(tag) {
      const el = {
        tagName: tag.toUpperCase(), ownerDocument: doc, childNodes: [],
        attributes: {}, style: {}, value: "", _ls: {},
        appendChild(n) { this.childNodes.push(n); return n; },
        removeChild(n) { this.childNodes = this.childNodes.filter((c) => c !== n); return n; },
        get firstChild() { return this.childNodes[0] ?? null; },
        setAttribute(k, v) { this.attributes[k] = String(v); },
        set className(v) { this.attributes.class = v; },
        get className() { return this.attributes.class || ""; },
        addEventListener(t, fn) { (this._ls[t] = this._ls[t] || []).push(fn); },
        dispatch(t, ev) { for (const fn of this._ls[t] || []) fn(ev || { target: this }); },
        click() { this.dispatch("click"); },
        set textContent(t) { this.childNodes = [doc.createTextNode(String(t))]; },
        get textContent() { return this.childNodes.map((c) => c.textContent).join(""); },
      };
      return el;
    },
    createTextNode(t) {
      return { nodeType: 3, data: String(t), ownerDocument: doc,
        get textContent() { return this.data; } };
    },
  };
  return doc;
}

export function memStorage(denied) {
  let held = null;
  return {
    load() { if (denied) throw new Error("denied"); return held; },
    save(s) { if (denied) throw new Error("denied"); held = s; },
    peek: () => held,
  };
}

/** collect every data-cap stamp reachable from the given roots — the
 * RENDERED artifact, not the registration */
export function capsOf(roots) {
  const found = [];
  (function walk(n) {
    if (!n) return;
    if (n.attributes && n.attributes["data-cap"]) found.push(n.attributes["data-cap"]);
    (n.childNodes || []).forEach(walk);
  })({ childNodes: roots.filter(Boolean) });
  return found.sort();
}
