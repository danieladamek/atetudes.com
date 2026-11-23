/* embed-fit.mjs — A PASTED FRAME THAT FITS ITS ÉTUDE AT EVERY WIDTH (261123, *Player - the frame fits the étude, no
 * white space under it*; Daniel's ruling 09:12: B, falling back to A).
 *
 * The problem. A bare iframe cannot size itself, and where embed code is pasted (Obsidian, a feed reader, a hosted
 * blog editor) no script of ours runs. So the height has to be written into the markup, as a function of the width
 * the frame is given. The player's natural height at its tallest chord is not one curve: it climbs with the width
 * (the neck is drawn to the width) and drops at each width where the header rewraps or the neck changes its window.
 *
 * What this module does with that. It takes what the player itself measured — its tallest chord's height at many
 * widths (never a typed number: presets-card asks the real player, in a frame) — and writes it as ONE inline CSS
 * declaration a sanitiser that keeps style attributes keeps:
 *
 *   padding-top: max( min(<line 1>, <gate: width under b1>), min(<line 2>, <gates: a2 … b2>), … )
 *
 * In padding, a percentage is a percentage of the WIDTH, so `s% + c px` is a straight line in the frame's width, and
 * `(100% - a px) * 100000` is a gate: hugely positive past `a`, hugely negative before it. Each line holds one stretch
 * of widths and sits at or above every height measured there; neighbouring stretches overlap across the gap between
 * their samples, so the frame is never shorter than the player at a measured width or between two of them. The first
 * declaration, `padding-top: <A>px`, is A's single number (the tallest height at any measured width): a host whose
 * sanitiser drops the second declaration still shows the whole player, with some space under it. With no style at
 * all, the iframe's own width/height attributes do the same.
 *
 * Nothing here is musical; it is geometry of the page. Pure, tested in hub/tests/embed-fit.test.mjs.
 */

/** player → its host: { type, height, width } — the étude's tallest chord at this width, in px (etude-player sends) */
export const HEIGHT_MSG = "atetudes:player-height";
/** host → player: { type } — please state your height now */
export const MEASURE_MSG = "atetudes:player-measure";

/** the widths the player is measured at — a blog column to a wide Obsidian pane. Past either end the end lines
 * continue (the player's .wrap stops growing at 1212 px, so the last stretch is flat). */
export const FIT_WIDTHS = Array.from({ length: 101 }, (_, i) => 300 + i * 10);

/** a gate's steepness: 1 px past its width it is already 100000 px — taller than any line */
const STEEP = 100000;

/** samples [[width, height], …] → stretches [{ a, b, s, c }]: over widths a…b (the first and last sample it covers)
 * the frame's height is s·width + c, at or above every sample there, never more than `tol` above any of them. */
export function fitStretches(samples, { tol = 12, pad = 6 } = {}) {
  const pts = [...samples].map(([w, h]) => [Number(w), Number(h)]).sort((x, y) => x[0] - y[0]);
  if (!pts.length || pts.some(([w, h]) => !(w > 0) || !(h > 0))) throw new Error("embed-fit: no measured heights to fit");
  const lineOver = (seg) => {
    if (seg.length === 1) return { s: 0, c: seg[0][1] };
    const n = seg.length, mw = seg.reduce((t, p) => t + p[0], 0) / n, mh = seg.reduce((t, p) => t + p[1], 0) / n;
    const sxx = seg.reduce((t, p) => t + (p[0] - mw) ** 2, 0), sxy = seg.reduce((t, p) => t + (p[0] - mw) * (p[1] - mh), 0);
    const s = sxx ? sxy / sxx : 0;
    return { s, c: Math.max(...seg.map(([w, h]) => h - s * w)) };   // lifted onto the highest sample
  };
  const excess = (seg, { s, c }) => Math.max(...seg.map(([w, h]) => s * w + c - h));
  const out = [];
  for (let i = 0; i < pts.length;) {
    let j = i + 1, best = lineOver(pts.slice(i, j));
    while (j < pts.length) {
      const cand = lineOver(pts.slice(i, j + 1));
      if (excess(pts.slice(i, j + 1), cand) > tol) break;
      best = cand; j++;
    }
    out.push({ a: pts[i][0], b: pts[j - 1][0], s: best.s, c: best.c + pad });
    i = j;
  }
  // the guarantee, asserted on the numbers it will write (rounded as they will be written)
  for (const [w, h] of pts) if (frameAt(out, w) < h) throw new Error(`embed-fit: the frame at ${w} px is shorter than the player (${h})`);
  return out;
}

const r4 = (x) => Math.round(x * 1e4) / 1e4;
const up = (x) => Math.ceil(x);

/** where stretch i's gates open: half a pixel past the neighbour's last sample, half a pixel short of the next one's
 * first — so at every measured width only its own line holds, and in a gap between two stretches (where the player
 * rewraps at a width nobody sampled) both do, and the taller wins */
const gatesOf = (stretches, i) => [i ? stretches[i - 1].b + 0.5 : -Infinity, i < stretches.length - 1 ? stretches[i + 1].a - 0.5 : Infinity];

/** the frame's height at width w, as the CSS will compute it */
export function frameAt(stretches, w) {
  let best = -Infinity;
  stretches.forEach((st, i) => {
    const [lo, hi] = gatesOf(stretches, i);
    if (w <= lo || w >= hi) return;
    best = Math.max(best, (r4(st.s * 100) / 100) * w + up(st.c));
  });
  return best;
}

/** stretches → the padding-top expression (the value after `padding-top:`) */
export function paddingExpr(stretches) {
  const terms = stretches.map((st, i) => {
    const pct = r4(st.s * 100), c = up(st.c);
    const line = pct === 0 ? `${c}px` : `${pct}% + ${c}px`;
    const [lo, hi] = gatesOf(stretches, i), gates = [];
    if (lo > -Infinity) gates.push(`(100% - ${lo}px) * ${STEEP}`);
    if (hi < Infinity) gates.push(`(${hi}px - 100%) * ${STEEP}`);
    return gates.length ? `min(${line}, ${gates.join(", ")})` : (pct === 0 ? line : `calc(${line})`);
  });
  return terms.length === 1 ? terms[0] : `max(${terms.join(", ")})`;
}

/** the pasted markup. `fit` = { stretches, tallest } from the player's own measurement, or null (not measured: the
 * door's general embed height, the frame every étude fits). */
export function embedMarkup({ src, open, height, fit = null, title = "An étude on the neck, from At-Etudes" }) {
  const link = `<p><a href="${open}">Play this étude on At-Etudes</a></p>\n`;
  if (!fit) return `<iframe src="${src}" title="${title}" loading="lazy" ` +
    `style="display:block;width:100%;height:${height}px;border:0"></iframe>\n` + link;
  const a = up(fit.tallest);
  return `<div style="position:relative;width:100%;height:0;padding-top:${a}px;padding-top:${paddingExpr(fit.stretches)}">` +
    `<iframe src="${src}" title="${title}" loading="lazy" width="100%" height="${a}" frameborder="0" ` +
    `style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"></iframe></div>\n` + link;
}

/** a jump: two neighbouring samples further apart in height than any line through the player climbs in that span
 * (its steepest stretch, the narrow neck, is ~0.6 px per px) — the header rewrapped, or the neck changed its window,
 * somewhere between them */
export const isJump = ([w1, h1], [w2, h2]) => w2 - w1 > 1 && Math.abs(h2 - h1) > 4 + 0.6 * (w2 - w1);

/** MEASURE THE REAL PLAYER (Copy embed code's half): load `src` — the player of this étude — in a frame nobody sees,
 * set the frame to each width in turn, and collect what the player says its tallest chord needs there; then, in every
 * gap that holds a jump, halve the gap until the jump's width is known to the pixel (a stretch's line is only as good
 * as the samples that end it). Resolves to [[width, height], …]; rejects when the player cannot be reached (offline,
 * from a file) or stops answering. The frame is tall (no inner scrollbar narrows the layout being measured) and
 * transparent, on the page rather than off it (an off-screen frame may not be laid out at its new width), and
 * removed when done. */
export function measureInPlayer(doc, src, widths = FIT_WIDTHS, { timeout = 5000, onProgress = null } = {}) {
  const win = doc.defaultView, origin = new URL(src, doc.baseURI).origin;
  const f = doc.createElement("iframe");
  f.setAttribute("aria-hidden", "true"); f.tabIndex = -1; f.title = "measuring the player";
  f.style.cssText = `position:fixed;left:0;top:0;width:${widths[0]}px;height:1600px;border:0;opacity:0;pointer-events:none;z-index:-1`;
  let want = null;   // { w, resolve, reject, timer }
  const ask = () => { try { f.contentWindow.postMessage({ type: MEASURE_MSG }, origin === "null" ? "*" : origin); } catch (_) { /* not loaded yet */ } };
  const on = (e) => {
    if (!want || e.source !== f.contentWindow || (origin !== "null" && e.origin !== origin)) return;
    const m = e.data;
    if (!m || m.type !== HEIGHT_MSG || typeof m.height !== "number" || m.width !== want.w) return;   // said before the frame took its width
    const w = want; want = null; win.clearTimeout(w.timer); w.resolve(m.height);
  };
  const at = (w) => new Promise((resolve, reject) => {
    want = { w, resolve, reject, timer: win.setTimeout(() => reject(new Error(`the player did not answer at ${w} px`)), timeout) };
    f.style.width = `${w}px`;
  });
  win.addEventListener("message", on);
  const nudge = win.setInterval(ask, 400);   // a resize the frame never reported is asked for
  const run = async () => {
    const first = at(widths[0]);
    f.src = src; doc.body.appendChild(f);
    const out = [[widths[0], await first]];
    for (let k = 1; k < widths.length; k++) {
      out.push([widths[k], await at(widths[k])]);
      if (onProgress) onProgress(k + 1, widths.length);
    }
    for (let i = 0; i + 1 < out.length; i++)
      while (isJump(out[i], out[i + 1])) {
        const mid = Math.floor((out[i][0] + out[i + 1][0]) / 2);
        out.splice(i + 1, 0, [mid, await at(mid)]);
        if (!isJump(out[i], out[i + 1])) i++;   // the jump is in the upper half
      }
    return out;
  };
  return run().finally(() => { win.clearInterval(nudge); win.removeEventListener("message", on); f.remove(); });
}
