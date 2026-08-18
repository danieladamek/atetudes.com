/* mini.mjs — the strip mini-transport: the reference's ⏮ ▶ ⏹ ⏭ cluster, built
 * once for the three strips that carry it (timeline, étude, keyboard).
 *
 * A STRIP SUMMONS THE TRANSPORT; IT NEVER OWNS A TIMER (§4.2.3, and the Shell 4
 * item's own words). Every button is a bus request and nothing more:
 *
 *   ⏮ / ⏭  a STEP_CHANGED request — the position owner (the stage) moves and
 *          re-announces; the mini learns where the pass is from that same
 *          canonical STEP_CHANGED, so it asks without reaching for anyone.
 *   ▶      a PLAY request the transport card answers by arming its walk, then
 *          the transport starts the grid through CLOCK — the mini touches
 *          neither the clock nor the walk.
 *   ⏹      a CLOCK stop; the metronome halts and the transport disarms on the
 *          CLOCK_STATE it hears back — one stop, cascaded, no module reaching
 *          another.
 *
 * This file owns no markup or styles of its own — the `.mini` grammar is the
 * shell's (three modules render it, so it is page furniture, not one module's
 * property) — so, like bus.mjs, it is reached through the imports of the
 * modules that use it rather than mounted as a contribution.
 */
import { STEP_CHANGED, CLOCK, CLOCK_STATE, PLAY, listen, announce } from "./bus.mjs";

/* glyph · title · role — the reference's, byte for byte */
const BUTTONS = [
  ["⏮", "previous chord", "prev"],
  ["▶", "play the étude", "play"],
  ["⏹", "stop", "stop"],
  ["⏭", "next chord", "next"],
];

/** Fill `host` (a declared `.mini` span) with the cluster and wire it to the
 * bus. Returns nothing — the mini holds only its own copy of the position,
 * derived from STEP_CHANGED, never another module's state. */
export function mountMini(ctx, host) {
  const d = ctx.doc;
  let cur = 0, running = false;
  const playBtn = { el: null };

  host.textContent = "";
  for (const [glyph, title, role] of BUTTONS) {
    const b = d.createElement("button");
    b.textContent = glyph; b.title = title; b.dataset.role = role;
    b.addEventListener("click", () => {
      if (role === "prev") announce(d, STEP_CHANGED, { index: cur - 1, request: true });
      else if (role === "next") announce(d, STEP_CHANGED, { index: cur + 1, request: true });
      else if (role === "play") announce(d, PLAY, { run: true });
      else if (role === "stop") announce(d, CLOCK, { run: false });
    });
    if (role === "play") playBtn.el = b;
    host.appendChild(b);
  }

  // gray Play while the pass is running, as the reference does — the one visible
  // sign the mini reads back from the clock it does not own
  const sync = () => { if (playBtn.el) playBtn.el.style.color = running ? "var(--gray)" : ""; };
  listen(d, STEP_CHANGED, (m) => {
    if (!m || m.request === true) return;
    if (typeof m.index === "number") cur = m.index;
  });
  listen(d, CLOCK_STATE, (m) => { if (m) { running = !!m.running; sync(); } });
  sync();
}
