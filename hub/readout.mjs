/* readout.mjs — THE HARMONIC READOUT, built once for the three boards that
 * carry it (the neck, the étude end to end, the keys) — 260920, night 26
 * item 3, on mini.mjs's precedent and by the same count.
 *
 * WHAT IT SAYS: the current bar's chord and the mode that chord's degree
 * names in the chosen scale — `● Am7b5 — A Locrian`, the dot in the root's
 * own degree colour. The same value on all three boards, RULED: "the bar
 * tracking is synched with the other two views so it's the identical thing
 * in all three places."
 *
 * SHARE THE CODE, NOT THE VALUE (§4.2.3 — modules derive independently from
 * the message, never from each other). One builder, one markup, one set of
 * styles — standing rule 6 — but each board mounts its OWN instance, and each
 * instance keeps its own mirror of the configuration and the position,
 * adopted from CONFIG_CHANGED and STEP_CHANGED, and derives the chord through
 * the same progressionOf/chordAt and the one MODES table. They agree because
 * they compute the same thing from the same message, not because one told
 * the others: no instance reads another's DOM or state, and the gate empties
 * all three and steps the bar to prove each refills on its own.
 *
 * This file owns no markup or styles of its own — the `.readbox` grammar is
 * the shell's (three modules render it, so by the resolver's own rule it is
 * page grammar, not one module's property) — so, like mini.mjs, it is
 * reached through the imports of the modules that use it rather than mounted
 * as a contribution. The neck's night-25 seat (in .bh after the title, one
 * line, the ellipsis on the inner span, the chord surviving whole) is now the
 * grammar every board gets.
 */
import { field, MODES } from "../engine/field.mjs";
import { progressionOf, chordAt } from "../engine/progression.mjs";
import { pickOf } from "../engine/selection.mjs";
import { FAM, FAM_COLOR } from "./palette.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, listen } from "./bus.mjs";

/** the configuration the readout needs, mirrored — the boot values are the
 * family's (harmony announces them; every mirror boots to the same) */
const BOOT = () => ({ key: "Bb", scale: "major", ref: 0, object: "tetrad",
  take: "one", notesPer: 3, tones: [1, 3, 5, 7],   // night 72: the neck opens on Line
  source: "cycle", cycle: "fourths", form: "ii-V-I", custom: "", start: 0 });

/** the chord at one position of one configuration — the ONE derivation chordNow and seatReadout both run; `n` is how
 * many chords the chart line holds (the positions a seat must hold) */
function deriveAt(cfg, index) {
  try {
    const fld = field({ key: cfg.key, scale: cfg.scale, ref: cfg.ref });
    const prog = progressionOf(cfg, cfg.key, cfg.scale);
    return { fld, cur: chordAt(prog, index, fld, cfg.object, pickOf(cfg)), cfg, index, n: prog.chords.length };
  } catch (e) { return { err: String(e && e.message || e), cfg, index }; }
}

/** the readout's words for one derived chord, painted into its `.readtext` span — the one painter, so a seat measured
 * from it is the box's own width at that chord */
function paintText(d, text, now) {
  text.textContent = "";
  if (now.err) { text.textContent = now.err; return; }
  const { fld, cur, cfg } = now;
  if (cur.degree >= 0) {
    const dot = d.createElement("i"); dot.className = "readdot";
    dot.setAttribute("data-role", "degree-dot"); dot.setAttribute("data-deg", FAM[cur.degree]);
    dot.style.background = FAM_COLOR[FAM[cur.degree]]; text.appendChild(dot);
  }
  const ch = d.createElement("b"); ch.className = "readchord"; ch.textContent = cur.symbol;
  const md = d.createElement("span"); md.className = "readmode";
  md.textContent = cur.degree >= 0
    ? ` — ${fld.notes[cur.degree].name} ${MODES[cfg.scale][cur.degree]}`
    : " — not in the key";
  text.appendChild(ch); text.appendChild(md);
}

/** Fill `host` (a declared `.readbox` element) with the readout and wire it
 * to the bus. Returns the instance's own paint, for a board that wants to
 * repaint in step with its own render (it re-derives; it is handed nothing). */
/** THE CHORD NOW, ONE DERIVATION (night 70, 261027): the instance's mirror of the configuration and the position,
 * and the chord it names — exported so another surface that must agree with the readout (the chip row's root and roles,
 * sitting directly under Centricity's readout) reads the SAME derivation, never a second one that can disagree
 * (§4.4). Each caller gets its own mirror, as each readout instance always did; `onChange` fires with
 * { fld, cur, cfg, index } — or { err } when the configuration cannot name a chord. */
export function chordNow(ctx, onChange) {
  const d = ctx.doc;
  let cfg = BOOT(), index = 0;
  const derive = () => deriveAt(cfg, index);
  listen(d, CONFIG_CHANGED, (m) => {
    if (!m) return;
    let changed = false;
    for (const k of Object.keys(cfg)) if (k in m) { cfg = { ...cfg, [k]: m[k] }; changed = true; }
    if (changed) onChange(derive());
  });
  listen(d, STEP_CHANGED, (m) => {
    if (!m || m.request === true) return;
    if (typeof m.index === "number" && m.index !== index) { index = m.index; onChange(derive()); }
  });
  return derive;
}

export function mountReadout(ctx, host) {
  const d = ctx.doc;
  host.textContent = "";
  const text = d.createElement("span"); text.className = "readtext"; host.appendChild(text);

  const paint = (now) => paintText(d, text, now);

  const now = chordNow(ctx, paint);
  const repaint = () => paint(now());
  repaint();
  return repaint;
}

/** THE SEAT HOLDS ITS SHAPE (261120 — *Player - the @ mark replaces the card title, and the header holds its shape*):
 * a box sized to the chord it shows makes every row after it move when a long mode name comes up (Daniel: "the
 * transport going to the next line with a longer mode name"). This sizes `host`'s seat to the LONGEST readout of the
 * whole chart line — every position derived and painted by the readout's own painter into a hidden twin of the box,
 * in the box's own place, and measured — so the header's rows depend on the width alone. Nothing is typed: the words
 * are the derivation's, the width is the browser's. It keeps its own mirror (§4.2.3) and re-seats on every
 * configuration and on a resize.
 *
 * BESIDE ITS TITLE, AND NO CHORD CUT AT ANY WIDTH: the box keeps its seat beside whatever precedes it on the row
 * (the player's @). Where the longest readout is wider than that seat (G harmonic minor at 390 px: "GmMaj7 — G
 * Harmonic minor" wants 256 px; beside the @ there are 236 — measured; the one-line box dropped under the title, and
 * at 360 it was cut), the box takes the seat's width and the mode name WRAPS under the chord, and the seat's HEIGHT
 * is the étude's tallest, measured the same way — so a chord that needs two lines moves nothing either.
 *
 * It reaches for no one's DOM (the 260920 rule): the board that owns the header hands it `room()` — the width the box
 * may take beside what precedes it — and `home`, where the hidden twin lives so it takes the box's own styles. Returns
 * the seat function, which returns the seat it set. */
export function seatReadout(ctx, host, { room, home }) {
  const d = ctx.doc, win = d.defaultView;
  let cfg = BOOT();
  const twin = host.cloneNode(false);
  twin.removeAttribute("id"); twin.removeAttribute("data-control"); twin.removeAttribute("title");
  twin.setAttribute("aria-hidden", "true");
  Object.assign(twin.style, { position: "absolute", visibility: "hidden", left: "0", top: "0", minWidth: "0",
    maxWidth: "none", minHeight: "0", pointerEvents: "none" });
  const text = d.createElement("span"); text.className = "readtext"; twin.appendChild(text);
  host.style.boxSizing = twin.style.boxSizing = "border-box";
  const wrapAs = (box, on) => {
    box.style.whiteSpace = on ? "normal" : "";
    const t = box.firstElementChild; if (t) t.style.whiteSpace = on ? "normal" : "";   // the box's .readtext — the painter's one child
  };
  const each = (fn) => {
    const first = deriveAt(cfg, 0), n = first.err ? 1 : first.n;
    let most = 0;
    for (let i = 0; i < n; i++) { paintText(d, text, i ? deriveAt(cfg, i) : first); most = Math.max(most, fn()); }
    return most;
  };
  let last = null;
  const seat = () => {
    const avail = Math.floor(room());
    if (!(avail > 0)) return last;   // not laid out (a refused link hides the board) — nothing to measure against
    if (!twin.isConnected) home.appendChild(twin);
    wrapAs(twin, false); twin.style.width = "auto";
    const widest = Math.ceil(each(() => twin.getBoundingClientRect().width));
    if (widest <= avail) {
      wrapAs(host, false);
      host.style.minWidth = widest + "px"; host.style.width = ""; host.style.minHeight = "";
      last = { wraps: false, width: widest, avail };
    } else {
      wrapAs(twin, true); twin.style.width = avail + "px";
      const tallest = Math.ceil(each(() => twin.getBoundingClientRect().height));
      wrapAs(host, true);
      host.style.minWidth = ""; host.style.width = avail + "px"; host.style.minHeight = tallest + "px";
      last = { wraps: true, width: widest, avail, height: tallest };
    }
    return last;
  };
  listen(d, CONFIG_CHANGED, (m) => {
    if (!m) return;
    let changed = false;
    for (const k of Object.keys(cfg)) if (k in m) { cfg = { ...cfg, [k]: m[k] }; changed = true; }
    if (changed) seat();
  });
  win.addEventListener("resize", seat);
  seat();
  return seat;
}
