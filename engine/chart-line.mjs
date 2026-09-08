/* chart-line.mjs — THE FAMILY'S CHART LINE (night 43, 261007 — Daniel, 260907, with a
 * screenshot of the Multetudes chart line: "and can we get this standard across the
 * etudes please?").
 *
 * Multetudes' strip (v0.9's chart line, live, the timeline strip of the multetudes door) is
 * the reference. This module is its DRAWING, lifted out so that every study with an ordered
 * chord sequence draws the same strip: bars of chips, one chip per chord, widths from the
 * chord's beats (so the bar split is visible rather than prose), the current chip ringed
 * and its bar shaded, the ROOT-DEGREE DOT in the one palette, the roman under the symbol,
 * and — only where the host has a chosen bass reference — the sub-line (the composite's
 * read-back name and the slash).
 *
 * EVERYTHING HERE IS DATA THE HOST SUPPLIES. The module spells no chord, derives no
 * degree, chooses no reference and owns no position:
 *
 *   bars     [[chip, …], …]   chip = { symbol, degree, roman, beats, us?, slash? }
 *   index    the current chord's index across all bars (the host's position)
 *   onPick   (index) => …     a click is handed back; what happens is the host's grammar —
 *                             Multetudes' strip answers it (the position owner), the
 *                             tetradetudes strip announces a request to the transport, the
 *                             hand-authored and generated pages set their own position.
 *
 * THE DOT (260918, item 2, carried verbatim): derived from the chip's DEGREE — an off-key
 * root wears NONE, honestly. Not grey, not the nearest degree's colour: no element at all.
 * Its colour is FAM_COLOR[FAM[degree]] (engine/degree-palette.mjs, the one palette); the
 * stylesheet never names a degree colour.
 *
 * THE ROMAN is data. The two tetrad apps spell one function two ways (vii° / viiø7); the
 * spelling gate (night 43) was built for KEEP — the module draws what it is handed. ONE
 * is a one-line change at the caller, not here.
 *
 * THE SUB-LINE: a chip carries `us` and/or `slash` only when the host derived them
 * (Multetudes: compositeOver over the placed reference). A host with no reference passes
 * neither and gets no sub-line — not an empty one — and asks for no sub-line rules.
 *
 * THE STYLES are one string, scoped under the host's own strip (`SCOPE` → the strip's id),
 * because a door's stylesheet must name a token its module owns and a rule that matches
 * nothing in a door is an orphan the gate refuses; the sub-line rules are appended only on
 * request, for the same reason. The near-miss twins the two door strips carried
 * (.tlbar/.tl-bar, .tlrn/.tl-rn, .cur/.tl-cur — night 39's bpmR/bpmRange failure, again)
 * are gone: this is the one set of names.
 */
import { FAM, FAM_COLOR } from "./degree-palette.mjs";

/** the strip's rules, Multetudes' values verbatim; SCOPE is the host's strip selector */
export const CHART_LINE_CSS = `SCOPE{display:flex;flex:1 1 auto;overflow-x:auto;align-items:stretch;padding:2px 0}
SCOPE .tl-bar{display:flex;flex:1 0 auto;align-items:stretch;gap:4px;border-left:2px solid #B9B9BF;
  padding:3px 8px;min-width:88px;border-radius:2px}
SCOPE .tl-bar:last-child{border-right:2px solid #B9B9BF}
SCOPE .tl-bar.tl-curbar{background:#E9E9EC}
SCOPE .tl-bar button{font:inherit;font-size:12.5px;padding:2px 6px;border:1.4px solid transparent;
  border-radius:999px;background:transparent;cursor:pointer;color:var(--ink);min-width:0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-flex;
  flex-direction:column;align-items:center;justify-content:center;line-height:1.15}
SCOPE .tl-bar button:hover{border-color:var(--line);background:#fff}
/* SELECTION IS WEIGHT AND NEUTRAL INK (260918, item 2 — golden rule 8's own remedy): the
 * current chip keeps its outline and fill; its text is ink. The red text it wore said
 * "root" about chords that were not one. --red means the key, nowhere else. */
SCOPE .tl-bar button.tl-cur{border-color:var(--red);font-weight:bold;background:#fff}
/* the chord's ROOT DEGREE dot — the legend's mark, the one palette, painted per chip */
SCOPE .tl-bar button .tl-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-bottom:1px}
SCOPE .tl-bar button .tl-rn{font-size:9px;font-weight:normal;color:var(--gray);font-style:italic}
SCOPE .tl-bar button.tl-cur .tl-rn{color:var(--gray)}`;

/** the sub-line's rules — only for a host that supplies a bass reference */
export const CHART_LINE_SUBLINE_CSS = `SCOPE .tl-bar button .tl-slash{display:block;font-size:10px;color:var(--gray);line-height:1.2}
SCOPE .tl-bar button .tl-us{font-size:10.5px;font-weight:600;color:var(--ink)}
SCOPE .tl-bar button.tl-cur .tl-us{color:var(--ink)}`;

export function chartLineStyles(scope, { subline = false } = {}) {
  return (CHART_LINE_CSS + (subline ? "\n" + CHART_LINE_SUBLINE_CSS : "")).split("SCOPE").join(scope);
}

/** draw the strip into `host` from the host's data; returns nothing, keeps nothing */
export function renderChartLine(host, { doc, bars, index, onPick, keepInView = true }) {
  const d = doc || host.ownerDocument;
  while (host.firstChild) host.removeChild(host.firstChild);   // clear by removal: no stray text node in any DOM
  const symbols = [];
  let ci = 0, curBar = null;
  bars.forEach((bar, bi) => {
    const el = d.createElement("div");
    const inBar = bar.length && ci <= index && index < ci + bar.length;
    el.className = "tl-bar" + (inBar ? " tl-curbar" : "");
    if (inBar) curBar = el;
    bar.forEach((c) => {
      const i = ci++;
      symbols.push(c.symbol);
      const b = d.createElement("button");
      b.className = i === index ? "tl-cur" : "";
      const beats = Number.isFinite(c.beats) && c.beats > 0 ? c.beats : 1;
      b.style.flex = `${beats} 1 0`;
      b.title = `bar ${bi + 1}, ${beats} beat${beats > 1 ? "s" : ""}`;
      b.setAttribute("data-tlchip", c.symbol);
      /* the degree dot (260918, item 2): derived from the chip's degree — an off-key root
       * wears none, honestly. First in reading order, above the symbol. */
      if (Number.isInteger(c.degree) && c.degree >= 0 && c.degree < FAM.length) {
        const dot = d.createElement("i"); dot.className = "tl-dot";
        dot.setAttribute("data-role", "degree-dot"); dot.setAttribute("data-deg", FAM[c.degree]);
        dot.style.background = FAM_COLOR[FAM[c.degree]]; b.appendChild(dot);
      }
      const top = d.createElement("span"); top.textContent = c.symbol; b.appendChild(top);
      /* the roman: data, drawn verbatim when the host hands one */
      if (typeof c.roman === "string" && c.roman) {
        const rn = d.createElement("span"); rn.className = "tl-rn"; rn.textContent = c.roman; b.appendChild(rn);
      }
      /* the sub-line: only what the host derived — never an empty element */
      if (typeof c.us === "string" && c.us) {
        const us = d.createElement("span"); us.className = "tl-us"; us.textContent = c.us; b.appendChild(us);
      }
      if (typeof c.slash === "string" && c.slash) {
        const sl = d.createElement("span"); sl.className = "tl-slash"; sl.textContent = c.slash; b.appendChild(sl);
      }
      b.addEventListener("click", () => onPick(i));
      el.appendChild(b);
    });
    host.appendChild(el);
  });
  host.setAttribute("data-tlline", symbols.join(" "));
  host.setAttribute("data-tlbars", String(bars.length));
  /* keep the sounding bar in view — scroll the strip, never the page (the tetradetudes,
   * triadetudes and tetrad-voice-leading strips all did this; the reference gains it) */
  if (keepInView && curBar && typeof host.getBoundingClientRect === "function") {
    const dr = host.getBoundingClientRect(), cr = curBar.getBoundingClientRect();
    const r = cr.left - dr.left + host.scrollLeft, w = cr.width;
    if (r < host.scrollLeft) host.scrollLeft = r - 8;
    else if (r + w > host.scrollLeft + host.clientWidth) host.scrollLeft = r + w - host.clientWidth + 8;
  }
}
