/* _dom-stub.mjs — the headless DOM stub the surface suites share.
 * One source per fact (family spec §4.3): notepad-surface.test.mjs and
 * host-conformance.test.mjs mount the same stub, so the stub itself cannot
 * fork. Elements carry value, style, listeners and a click() that dispatches
 * them. No innerHTML exists anywhere in it.
 */
export function makeDoc() {
  /* a window just wide enough for the download path (260916, item 3): a
   * Blob keeps its text, an object URL is a key back to it, and an <a>
   * element's click() records {download, text} in win.downloads — so the
   * surface's real download() runs headless and the test reads WHAT WAS
   * WRITTEN (the artifact), never a flag. navigator has no clipboard:
   * copy's "unavailable" outcome stays exercised. */
  const blobs = new Map();
  const win = {
    downloads: [],
    Blob: class { constructor(parts) { this.text = parts.join(""); } },
    URL: { createObjectURL(b) { const u = "blob:" + blobs.size; blobs.set(u, b); return u; },
           revokeObjectURL() {} },
    navigator: {},
  };
  const doc = {
    defaultView: win,
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
        click() {
          if (this.tagName === "A" && this.download !== undefined)
            win.downloads.push({ download: this.download,
              text: (blobs.get(this.href) || { text: "" }).text });
          this.dispatch("click");
        },
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
