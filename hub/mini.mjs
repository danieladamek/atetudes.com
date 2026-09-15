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
 *   🔁     REPEAT — a TOGGLE WITH STATE, not a stateless request (night 63,
 *          261014d — Daniel: the same transport set, repeat included, on the
 *          staff and keys views). Repeat was one board's setting (field-board's
 *          cfg.repeat, painted on the neck's own repeat button); a fifth request here would have
 *          reached into that board's config from every host. So repeat MOVED
 *          ONTO THE BUS: it rides on CONFIG {repeat} — the message the neck's
 *          board already adopts, the walk already consults, and the bus
 *          REPLAYS to a late subscriber — which answers the mount-mid-repeat
 *          question: a view mounted after the last announcement hears the
 *          current value on subscribe. The button announces CONFIG {repeat}
 *          and paints aria-pressed from what it hears back; it is SHOWN only
 *          where the bus carries the state (a boolean repeat heard on CONFIG)
 *          — in a door whose transport consults no repeat it stays hidden,
 *          because a control nobody consults is a lie. The neck's own repeat
 *          button is one more view of the same state.
 *
 * This file owns no markup or styles of its own — the `.mini` grammar is the
 * shell's (three modules render it, so it is page furniture, not one module's
 * property) — so, like bus.mjs, it is reached through the imports of the
 * modules that use it rather than mounted as a contribution. It owns no timer
 * and no piece of the walk (§4.2.3), before and after repeat joined.
 */
import { STEP_CHANGED, CLOCK, CLOCK_STATE, PLAY, CONFIG_CHANGED, listen, announce } from "./bus.mjs";

/* glyph · title · role — the reference's four, byte for byte; repeat fifth (night 63), a toggle */
const BUTTONS = [
  ["⏮", "previous chord", "prev"],
  ["▶", "play the étude", "play"],
  ["⏹", "stop", "stop"],
  ["⏭", "next chord", "next"],
  ["\u{1F501}", "repeat the current bar", "repeat"],
];

/** Fill `host` (a declared `.mini` span) with the cluster and wire it to the
 * bus. Returns nothing — the mini holds only its own copies of what it reads
 * back from the bus: the position (STEP_CHANGED), the clock's running
 * (CLOCK_STATE) and, since night 63, REPEAT (CONFIG {repeat}, the transport's
 * state on the bus). The sentence this used to end with — "never another
 * module's state" — is kept honest by the move: repeat stopped being one
 * board's setting the night it joined; no view owns it, every view reads it. */
export function mountMini(ctx, host) {
  const d = ctx.doc;
  let cur = 0, running = false, repeat = null;   // repeat: null until the bus says — the button hidden until then
  const playBtn = { el: null }, repeatBtn = { el: null };

  host.textContent = "";
  for (const [glyph, title, role] of BUTTONS) {
    const b = d.createElement("button");
    b.textContent = glyph; b.title = title; b.dataset.role = role;
    b.addEventListener("click", () => {
      if (role === "prev") announce(d, STEP_CHANGED, { index: cur - 1, request: true });
      else if (role === "next") announce(d, STEP_CHANGED, { index: cur + 1, request: true });
      else if (role === "play") announce(d, PLAY, { run: true });
      else if (role === "stop") announce(d, CLOCK, { run: false });
      else if (role === "repeat") announce(d, CONFIG_CHANGED, { repeat: !repeat });
    });
    if (role === "play") playBtn.el = b;
    if (role === "repeat") {
      /* a glyph-only button has no name of its own (injection 261014c): the word is its accessible name; addressed
       * by data-role everywhere, never by the glyph (rule 12) */
      b.setAttribute("aria-label", title); b.setAttribute("aria-pressed", "false"); b.hidden = true;
      repeatBtn.el = b;
    }
    host.appendChild(b);
  }

  // gray Play while the pass is running, as the reference does — the one visible
  // sign the mini reads back from the clock it does not own; and repeat's pressed
  // state, painted as the neck's own button paints it (inline — this file owns no
  // stylesheet): ink on white while on, the hue never spent (golden rule 8)
  const sync = () => {
    if (playBtn.el) playBtn.el.style.color = running ? "var(--gray)" : "";
    const rb = repeatBtn.el;
    if (rb) {
      rb.hidden = repeat === null;
      rb.setAttribute("aria-pressed", repeat ? "true" : "false");
      rb.style.background = repeat ? "var(--ink)" : "";
      rb.style.color = repeat ? "#fff" : "";
      rb.style.borderColor = repeat ? "var(--ink)" : "";
    }
  };
  listen(d, STEP_CHANGED, (m) => {
    if (!m || m.request === true) return;
    if (typeof m.index === "number") cur = m.index;
  });
  listen(d, CLOCK_STATE, (m) => { if (m) { running = !!m.running; sync(); } });
  listen(d, CONFIG_CHANGED, (m) => {
    if (m && typeof m.repeat === "boolean") { repeat = m.repeat; sync(); }
  });
  sync();
}
