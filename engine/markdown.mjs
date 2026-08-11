/* markdown.mjs — the notepad's markdown engine (component v1).
 *
 * A CommonMark SUBSET that builds DOM nodes, written in-house because the two
 * guarantees below cannot be imported (notepad item, charter §7, web contract
 * §5 — every dependency must pass the inline test):
 *
 *   1. None of the four HTML-string sinks (the grep test in
 *      markdown.test.mjs names them) appears anywhere in this module. The
 *      renderer builds the tree with createElement / createTextNode /
 *      textContent only, so user input being data-not-code is STRUCTURAL,
 *      not a sanitizer's promise.
 *   2. NO HTML PASSTHROUGH. CommonMark permits raw inline and block HTML;
 *      this subset REFUSES it: a typed `<script>` is text and renders as the
 *      visible characters `<script>`. This is a documented, tested divergence
 *      from CommonMark — not an oversight to be "fixed" later.
 *
 * The subset (what a musician writing practice notes actually types):
 * ATX headings · paragraphs · *em* / **strong** · bullet + ordered lists (ONE
 * nesting level) · > blockquotes · `code spans` · fenced blocks with info
 * strings · --- rules · [text](url) · hard line breaks (two trailing spaces).
 * Deliberately out: tables, footnotes, task lists, wiki-links, autolinks,
 * setext headings, deeper nesting, syntax highlighting inside fences.
 *
 * Load-bearing choices:
 * - Fenced blocks are OPAQUE: the node carries {info, body} byte-identically
 *   and the renderer shows them as preformatted text, never interpreting
 *   them. This is the hook the payload convention and the `chart` block hang
 *   on — engine/atchart.mjs stays the only thing that reads a chart fence.
 * - An UNCLOSED fence is not a fence: the ``` line renders as the literal
 *   characters typed and parsing continues — good for live preview (typing a
 *   fence never swallows the rest of the note) and no content is ever lost.
 * - Links sanitize by scheme allow-list AT RENDER: http, https, mailto, and
 *   same-document # fragments. Anything else (javascript:, data:, vbscript:,
 *   file:) renders as the literal source text — inert AND nothing lost.
 * - Unknown/malformed syntax degrades to text, NEVER throws. There is no
 *   error path that loses content.
 * - ROUND-TRIP IS NOT CLAIMED. This is a renderer, not a formatter: the
 *   textarea source stays canonical, there is no serializer and no
 *   fixed-point law here (that law lives in engine/atchart.mjs).
 *
 * applyEdit(src, sel, op) is the toolbar's seam — a pure string+selection
 * transform (the palette inserts through the same seam via {type:"insert"}).
 * Wrapping ops toggle rather than nest; line ops apply across every line the
 * selection touches; the returned selection is the contract that the caret
 * survives every op.
 *
 * Pure module: no DOM globals at parse time; renderTo reaches the document
 * only through el.ownerDocument, so tests run against a stub.
 */

// ---------- parse ----------

const FENCE_OPEN = /^```(.*)$/;
const FENCE_CLOSE = /^```\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^-{3,}\s*$/;
const BULLET = /^(\s*)([-*+])\s+(.*)$/;
const ORDERED = /^(\s*)(\d{1,9})[.)]\s+(.*)$/;
const MAX_DEPTH = 8; // quotes-in-quotes beyond this degrade to text, never throw

export function parseMarkdown(src) {
  const s = typeof src === "string" ? src : String(src ?? "");
  return { type: "doc", children: parseBlocks(s.split("\n"), 0) };
}

function matchListLine(line) {
  let m = line.match(BULLET);
  if (m) return { indent: m[1].length, ordered: false, num: null, text: m[3] };
  m = line.match(ORDERED);
  if (m) return { indent: m[1].length, ordered: true, num: +m[2], text: m[3] };
  return null;
}

function isBlockStart(line) {
  return HEADING.test(line) || RULE.test(line) || /^>/.test(line) ||
    FENCE_OPEN.test(line) || (matchListLine(line)?.indent === 0);
}

function parseBlocks(lines, depth) {
  if (depth > MAX_DEPTH)
    return [{ type: "para", children: [{ type: "text", text: lines.join("\n") }] }];
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }

    const f = line.match(FENCE_OPEN);
    if (f) {
      let close = -1;
      for (let j = i + 1; j < lines.length; j++)
        if (FENCE_CLOSE.test(lines[j])) { close = j; break; }
      if (close >= 0) {
        // opaque node; info string and body byte-identical through parse
        out.push({ type: "fence", info: f[1].trim(),
          body: lines.slice(i + 1, close).join("\n") });
        i = close + 1; continue;
      }
      // unclosed fence: the literal characters typed, parsing continues
      out.push({ type: "para", children: [{ type: "text", text: line }] });
      i++; continue;
    }

    const h = line.match(HEADING);
    if (h) {
      out.push({ type: "heading", level: h[1].length,
        children: parseInline(h[2].replace(/\s+#+\s*$/, "")) });
      i++; continue;
    }

    if (RULE.test(line)) { out.push({ type: "rule" }); i++; continue; }

    if (/^>/.test(line)) {
      const q = [];
      while (i < lines.length && /^>/.test(lines[i])) {
        q.push(lines[i].replace(/^> ?/, "")); i++;
      }
      out.push({ type: "quote", children: parseBlocks(q, depth + 1) });
      continue;
    }

    const li = matchListLine(line);
    if (li && li.indent === 0) {
      const [node, next] = parseList(lines, i);
      out.push(node); i = next; continue;
    }

    // paragraph: gather until a blank line or another block starts
    const para = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !isBlockStart(lines[i])) {
      para.push(lines[i]); i++;
    }
    if (!para.length) { // a block-start we cannot consume (defensive; unreachable)
      para.push(lines[i]); i++;
    }
    const children = [];
    para.forEach((ln, k) => {
      const hard = /\S {2,}$/.test(ln); // two+ trailing spaces = hard break
      children.push(...parseInline(ln.replace(/\s+$/, "")));
      if (k < para.length - 1)
        children.push(hard ? { type: "br" } : { type: "text", text: " " });
    });
    out.push({ type: "para", children });
  }
  return out;
}

function parseList(lines, i) {
  const first = matchListLine(lines[i]);
  const ordered = first.ordered;
  const items = [];
  while (i < lines.length) {
    const m = matchListLine(lines[i]);
    if (!m || m.indent !== 0 || m.ordered !== ordered) break;
    const item = { children: parseInline(m.text), sub: null };
    i++;
    // ONE nesting level: an immediately following indented run is the sub-list;
    // anything deeper is flattened into it (deeper nesting is out of the subset)
    const subItems = [];
    let subOrdered = null;
    while (i < lines.length) {
      const sm = matchListLine(lines[i]);
      if (!sm || sm.indent === 0) break;
      if (subOrdered === null) subOrdered = sm.ordered;
      subItems.push({ children: parseInline(sm.text), sub: null });
      i++;
    }
    if (subItems.length)
      item.sub = { type: "list", ordered: subOrdered, start: 1, items: subItems };
    items.push(item);
  }
  return [{ type: "list", ordered, start: first.num ?? 1, items }, i];
}

function parseInline(s, depth) {
  depth = depth || 0;
  const out = [];
  let buf = "", i = 0;
  const flush = () => { if (buf) { out.push({ type: "text", text: buf }); buf = ""; } };
  if (depth > MAX_DEPTH) return [{ type: "text", text: s }];
  while (i < s.length) {
    const c = s[i];
    if (c === "`") {
      const end = s.indexOf("`", i + 1);
      if (end > i + 1) { flush(); out.push({ type: "code", text: s.slice(i + 1, end) }); i = end + 1; continue; }
      buf += c; i++; continue;
    }
    if (s.startsWith("**", i)) {
      const end = s.indexOf("**", i + 2);
      if (end > i + 2) {
        flush();
        out.push({ type: "strong", children: parseInline(s.slice(i + 2, end), depth + 1) });
        i = end + 2; continue;
      }
      buf += "*"; i++; continue; // lone markers are the literal characters typed
    }
    if (c === "*") {
      const end = s.indexOf("*", i + 1);
      if (end > i + 1) {
        flush();
        out.push({ type: "em", children: parseInline(s.slice(i + 1, end), depth + 1) });
        i = end + 1; continue;
      }
      buf += c; i++; continue;
    }
    if (c === "[") {
      const close = s.indexOf("]", i + 1);
      if (close > i && s[close + 1] === "(") {
        const rp = s.indexOf(")", close + 2);
        if (rp >= 0) {
          flush();
          out.push({ type: "link", href: s.slice(close + 2, rp),
            children: parseInline(s.slice(i + 1, close), depth + 1) });
          i = rp + 1; continue;
        }
      }
      buf += c; i++; continue; // stray [ is the literal character typed
    }
    buf += c; i++;
  }
  flush();
  return out;
}

// ---------- render: DOM nodes only, no HTML-string sinks ----------

const SAFE_SCHEME = /^(https?:|mailto:)/i;

/** null = refuse: the construct renders as literal source text (inert AND
 * nothing lost). Allow-list, not deny-list: http, https, mailto, #fragment. */
export function safeHref(href) {
  const t = String(href ?? "").trim();
  if (t.startsWith("#")) return t;
  if (SAFE_SCHEME.test(t)) return t;
  return null;
}

function plainText(children) {
  let t = "";
  for (const n of children || []) {
    if (n.type === "text") t += n.text;
    else if (n.type === "code") t += "`" + n.text + "`";
    else if (n.type === "br") t += "\n";
    else t += plainText(n.children);
  }
  return t;
}

export function renderTo(el, ast) {
  const doc = el.ownerDocument;
  while (el.firstChild) el.removeChild(el.firstChild);
  for (const b of (ast && ast.children) || []) el.appendChild(blockNode(doc, b));
  return el;
}

function blockNode(doc, b) {
  switch (b.type) {
    case "heading": {
      const h = doc.createElement("h" + Math.min(6, Math.max(1, b.level)));
      appendInline(doc, h, b.children); return h;
    }
    case "para": {
      const p = doc.createElement("p");
      appendInline(doc, p, b.children); return p;
    }
    case "rule": return doc.createElement("hr");
    case "quote": {
      const q = doc.createElement("blockquote");
      for (const c of b.children) q.appendChild(blockNode(doc, c));
      return q;
    }
    case "fence": {
      // opaque: preformatted text; the info string rides as data-info for
      // consumers (the chart block's reader lives elsewhere, by design)
      const pre = doc.createElement("pre");
      const code = doc.createElement("code");
      if (b.info) code.setAttribute("data-info", b.info);
      code.textContent = b.body;
      pre.appendChild(code); return pre;
    }
    case "list": {
      const l = doc.createElement(b.ordered ? "ol" : "ul");
      if (b.ordered && b.start !== 1) l.setAttribute("start", String(b.start));
      for (const it of b.items) {
        const li = doc.createElement("li");
        appendInline(doc, li, it.children);
        if (it.sub) li.appendChild(blockNode(doc, it.sub));
        l.appendChild(li);
      }
      return l;
    }
    default: { // unknown node type: its text content, never a throw
      const p = doc.createElement("p");
      p.textContent = plainText(b.children);
      return p;
    }
  }
}

function appendInline(doc, el, children) {
  for (const n of children || []) {
    switch (n.type) {
      case "text": el.appendChild(doc.createTextNode(n.text)); break;
      case "br": el.appendChild(doc.createElement("br")); break;
      case "code": {
        const c = doc.createElement("code");
        c.textContent = n.text; el.appendChild(c); break;
      }
      case "em": case "strong": {
        const e = doc.createElement(n.type);
        appendInline(doc, e, n.children); el.appendChild(e); break;
      }
      case "link": {
        const href = safeHref(n.href);
        if (href === null) {
          // refused scheme: the literal source text, visible and inert
          el.appendChild(doc.createTextNode(
            "[" + plainText(n.children) + "](" + n.href + ")"));
        } else {
          const a = doc.createElement("a");
          a.setAttribute("href", href);
          a.setAttribute("rel", "noopener noreferrer");
          appendInline(doc, a, n.children);
          el.appendChild(a);
        }
        break;
      }
      default: el.appendChild(doc.createTextNode(plainText([n])));
    }
  }
}

// ---------- applyEdit: the toolbar's (and the palette's) seam ----------

/**
 * applyEdit(src, sel, op) → { src, selection:{start,end} }
 * sel: {start,end} string indices (clamped, ordered; never throws).
 * ops: {type:"insert",text} · {type:"strong"|"em"|"code"} ·
 *      {type:"link"} · {type:"heading",level} ·
 *      {type:"bullet"|"ordered"|"quote"}
 * Wrapping ops TOGGLE rather than nest (already-wrapped selection unwraps,
 * markers around the selection unwrap). Line ops apply across every line the
 * selection touches, and toggle off only when EVERY non-blank line already
 * carries the marker. The returned selection is exact — the caret's survival
 * is the contract.
 */
export function applyEdit(src, sel, op) {
  const s = typeof src === "string" ? src : String(src ?? "");
  let start = Math.max(0, Math.min(s.length, (sel && sel.start) | 0));
  let end = Math.max(0, Math.min(s.length, (sel && sel.end) | 0));
  if (end < start) [start, end] = [end, start];
  if (!op || typeof op.type !== "string")
    return { src: s, selection: { start, end } };

  switch (op.type) {
    case "insert": {
      const t = String(op.text ?? "");
      const out = s.slice(0, start) + t + s.slice(end);
      const caret = start + t.length;
      return { src: out, selection: { start: caret, end: caret } };
    }
    case "strong": return wrapToggle(s, start, end, "**");
    case "em": return wrapToggle(s, start, end, "*");
    case "code": return wrapToggle(s, start, end, "`");
    case "link": {
      if (start === end) {
        const t = "[text](url)";
        return { src: s.slice(0, start) + t + s.slice(end),
          selection: { start: start + 1, end: start + 5 } }; // "text" selected
      }
      const inner = s.slice(start, end);
      const out = s.slice(0, start) + "[" + inner + "](url)" + s.slice(end);
      const u = start + 1 + inner.length + 2;
      return { src: out, selection: { start: u, end: u + 3 } }; // "url" selected
    }
    case "heading": {
      const level = Math.min(6, Math.max(1, op.level | 0 || 1));
      const marker = "#".repeat(level) + " ";
      return lineOp(s, start, end,
        (line) => {
          const cur = line.match(/^(#{1,6})\s+/);
          return !!(cur && cur[1].length === level);
        },
        (line) => { // apply
          const cur = line.match(/^(#{1,6})\s+/);
          return marker + (cur ? line.slice(cur[0].length) : line);
        },
        (line) => line.replace(/^(#{1,6})\s+/, "")); // remove
    }
    case "quote":
      return lineOp(s, start, end,
        (line) => /^> /.test(line),
        (line) => /^> /.test(line) ? line : "> " + line,
        (line) => line.replace(/^> ?/, ""));
    case "bullet":
      return lineOp(s, start, end,
        (line) => /^[-*+] /.test(line),
        (line) => /^[-*+] /.test(line) ? line
          : "- " + line.replace(/^(\d{1,9})[.)]\s+/, ""),
        (line) => line.replace(/^[-*+]\s+/, ""));
    case "ordered": {
      let n = 0;
      return lineOp(s, start, end,
        (line) => /^\d{1,9}[.)] /.test(line),
        (line) => (++n) + ". " +
          line.replace(/^[-*+]\s+/, "").replace(/^\d{1,9}[.)]\s+/, ""),
        (line) => line.replace(/^\d{1,9}[.)]\s+/, ""));
    }
    default: // unknown op: a no-op, never a throw — content is data
      return { src: s, selection: { start, end } };
  }
}

function wrapToggle(s, start, end, m) {
  const L = m.length;
  if (start === end) {
    // empty selection: open a pair, caret between the markers
    const out = s.slice(0, start) + m + m + s.slice(end);
    return { src: out, selection: { start: start + L, end: start + L } };
  }
  const inner = s.slice(start, end);
  if (inner.length >= 2 * L && inner.startsWith(m) && inner.endsWith(m)) {
    // selection includes the markers: unwrap, select the bare text
    const bare = inner.slice(L, inner.length - L);
    return { src: s.slice(0, start) + bare + s.slice(end),
      selection: { start, end: start + bare.length } };
  }
  if (s.slice(start - L, start) === m && s.slice(end, end + L) === m) {
    // markers surround the selection: unwrap, selection shifts left
    return { src: s.slice(0, start - L) + inner + s.slice(end + L),
      selection: { start: start - L, end: end - L } };
  }
  const out = s.slice(0, start) + m + inner + m + s.slice(end);
  return { src: out, selection: { start: start + L, end: end + L } };
}

function lineOp(s, start, end, has, add, remove) {
  const ls = s.lastIndexOf("\n", start - 1) + 1;
  let le = s.indexOf("\n", end);
  if (le < 0) le = s.length;
  const seg = s.slice(ls, le);
  const lines = seg.split("\n");
  const marked = lines.filter((l) => l.trim() !== "");
  const allHave = marked.length > 0 && marked.every(has);
  const outLines = lines.map((l) => l.trim() === "" ? l : (allHave ? remove(l) : add(l)));
  const newSeg = outLines.join("\n");
  const out = s.slice(0, ls) + newSeg + s.slice(le);
  if (start === end && lines.length === 1) {
    // single-line caret: it rides the line's prefix change, clamped to the line
    const delta = outLines[0].length - lines[0].length;
    const caret = Math.max(ls, Math.min(ls + outLines[0].length, start + delta));
    return { src: out, selection: { start: caret, end: caret } };
  }
  // multi-line (or ranged) selection: select the whole transformed range
  return { src: out, selection: { start: ls, end: ls + newSeg.length } };
}

// ---------- load-time assertions (golden rule 1, site form) ----------

{
  const probe = parseMarkdown("# h\n\n**b** *i* `c` [t](https://x)\n\n```chart\nX\n```\n");
  if (probe.children.length !== 3 || probe.children[2].info !== "chart" ||
      probe.children[2].body !== "X")
    throw new Error("markdown: the probe document must parse to its three blocks");
  if (safeHref("javascript:alert(1)") !== null || safeHref("data:text/html,x") !== null)
    throw new Error("markdown: unsafe schemes must refuse");
  if (safeHref("https://a.b") === null || safeHref("#top") === null)
    throw new Error("markdown: safe schemes must pass");
  const e1 = applyEdit("ab", { start: 0, end: 2 }, { type: "strong" });
  if (e1.src !== "**ab**" || e1.selection.start !== 2 || e1.selection.end !== 4)
    throw new Error("markdown: wrap must preserve the selection");
  const e2 = applyEdit(e1.src, e1.selection, { type: "strong" });
  if (e2.src !== "ab") throw new Error("markdown: wrap must toggle, not nest");
  if (JSON.stringify(parseMarkdown("<b>x</b>").children[0].children[0]) !==
      JSON.stringify({ type: "text", text: "<b>x</b>" }))
    throw new Error("markdown: raw HTML must be text, not markup");
}
