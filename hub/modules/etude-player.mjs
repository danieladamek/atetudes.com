/* etude-player.mjs — THE PLAYER'S OWN PART: the étude from the link, the refusal, Open in Multetudes, one at a time
 * (261120 — child 3 of the étude embed epic; Daniel's scope and his two rulings of 2026-11-20 are in the item,
 * *Player door — the neck, chord symbols, transport and tempo*).
 *
 * WHAT IT DOES, AND WHAT IT LEAVES TO OTHERS. The neck, the chord readout, play/stop and the tempo are field-board's
 * (ruling 1: the neck is drawn once); the walk is etude-walk's; the grid is the metronome card's, mounted hidden
 * (ruling 2). This module holds no musical fact of its own (golden rule 1, web form): the étude arrives as the
 * link's block, read by engine/etude-link.mjs — the ONLY reader, which draws the §6 line — and goes home by the
 * record's own restore, exactly as a pasted block does in Multetudes. Every note sounded is derived from it, now.
 *
 * IT NEVER GUESSES. A link it cannot read, an étude another app wrote, a version newer than this build reads, a value
 * the block's grammar or the bench refuses, or typed changes (§6): the neck is not shown, the reason is, in plain ink,
 * and Open in Multetudes stays when there is an étude to open. Restoring part of an étude would play something the
 * author did not write — so a single refused value refuses the whole link (unlike Multetudes' paste, which skips and
 * names: there a person is at the bench to see it).
 *
 * ONE PLAYER AT A TIME (Daniel, 2026-11-20): starting one stops every other. The players are same-origin documents
 * (atetudes.com) on one host page, so a BroadcastChannel reaches them all — and under storage partitioning it is keyed
 * by the top-level site, which is exactly "the page they are embedded in". (Two tabs of the same host page share it
 * too: starting a player in one stops a player in the other. Accepted — still one sound at a time.)
 *
 * THE PLAYER STATES ITS HEIGHT (261123, *Player - the frame fits the étude, no white space under it*). A bare iframe
 * cannot size itself, so the player tells whoever holds it: a message named HEIGHT_MSG (hub/embed-fit.mjs), numbers only — its natural
 * height and the width it was measured at. The height is the étude's TALLEST chord at this width, never the current
 * chord's: a frame that grew and shrank with the chords would make the post jump under its reader. It is measured
 * by the player's own layout — every chord drawn in turn, read, and the shown chord drawn back, in one task, before
 * anything paints — and only while stopped: the pass walks the step echo every board answers, and a playing walk
 * would take an echo for an advance. While playing, a width change can only grow the frame; the exact pass runs at
 * the stop. It is sent once laid out, again when the fonts have come, on every width change, and when a host asks
 * (MEASURE_MSG) — the atetudes.com fence (layouts/_markup/render-codeblock-etude.html) and Copy embed code's
 * measuring frame (presets-card) are the two that listen.
 */
import { fromFragment, toFragment } from "../../engine/etude-link.mjs";
import { checkEtude, ETUDE_V } from "../../engine/etude-block.mjs";
import { etudeRecord } from "../etude-record.mjs";
import { progressionOf } from "../../engine/progression.mjs";
import { HEIGHT_MSG, MEASURE_MSG } from "../embed-fit.mjs";
import { CLOCK, CLOCK_STATE, CONFIG_CHANGED, STEP_CHANGED, announce, listen } from "../bus.mjs";

/** the channel every player on a page shares — named once */
export const PLAYER_CHANNEL = "atetudes-player";

/** a location hash → { snapshot } to play, or { reason } (and `snapshot` when there is an étude to open elsewhere).
 * Pure: the module's one decision, testable without a page. */
export function playable(hash, app, readsUpTo = ETUDE_V) {
  const r = fromFragment(hash);
  if (r.reason) return { reason: r.reason };
  if (r.app && r.app !== app) return { reason: `this link holds an étude ${r.app} wrote; this player plays ${app} études` };
  if (typeof r.v !== "number" || !Number.isInteger(r.v) || r.v < 1)
    return { reason: "this link's étude names no version this player can read" };
  if (r.v > readsUpTo) return { reason: `this link's étude is version ${r.v}; this player reads up to version ${readsUpTo}` };
  const refused = [...r.flagged.map((f) => `${f.key || `line ${f.n}`} (${f.reason})`),
    ...checkEtude(r.snapshot).map((b) => `${b.key} (${b.reason})`)];
  if (refused.length) return { reason: `this link's étude has a value the player cannot play: ${refused.join("; ")}`, snapshot: r.snapshot };
  return { snapshot: r.snapshot };
}

export const etudePlayer = {
  id: "etude-player",
  layer: "surface",
  requires: { surface: "player" },
  /* no panel of its own (a panel needs a header band, and this has nothing to head): it ships hidden and its one line
   * moves at mount — into the page footer when the étude plays, into the neck's place when it is refused */
  mount_point: "hidden",
  controls: ["plOpen", "plMsg"],

  markup: `
  <div class="pl-foot">
    <span class="hint pl-msg" id="plMsg" data-control="plMsg" role="status"></span>
    <a class="pl-open" id="plOpen" data-control="plOpen" target="_blank" rel="noopener">Open in Multetudes ↗</a>
  </div>`,

  styles: `
.pl-foot{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline;justify-content:space-between}
.pl-msg{margin:0;color:var(--ink)}
.pl-msg:empty{display:none}
.pl-open{margin-left:auto;font-size:12px;color:var(--ink);text-decoration:underline;text-underline-offset:2px}
/* the page ends at its last line (261123): the shell's 60 px under the footer is space for a page you scroll, and in a
 * frame sized to the player it is only white space under the étude */
.wrap:has(.pl-foot){padding-bottom:6px}
/* NO SCROLLBAR OF ITS OWN (261123, measured): a frame a moment too short for the player — a host's frame resizing a
 * beat behind its column — gave the player a classic scrollbar, which narrowed its layout under 600 px, which drew
 * the tall phone neck, which kept the scrollbar: stuck 173 px over its frame at 604 px wide. The page still scrolls
 * (wheel, touch, keys); it just never takes width from the layout, so the player is always laid out at its frame's
 * width — the width it was measured at. */
html:has(.pl-foot){scrollbar-width:none}
html:has(.pl-foot)::-webkit-scrollbar{display:none}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId, win = d.defaultView;
    const cfg = ctx.door.player || {};
    const app = cfg.app, open = byId("plOpen"), msg = byId("plMsg");
    const got = playable(win.location.hash, app);
    /* the Open link: the same étude, in a new tab, at the full app — through the link's own writer, never restated */
    const linkTo = (snap) => { try { return cfg.open + toFragment(snap, { app, v: ETUDE_V }); } catch { return null; } };
    const href = got.snapshot ? linkTo(got.snapshot) : null;
    if (href) open.href = href; else open.hidden = true;
    const foot = msg.parentElement;

    /* THE HEIGHT (see the header): the page's own height — the body and its margins, which is what a frame must hold —
     * at the étude's tallest chord */
    const natural = () => {
      const b = d.body, cs = win.getComputedStyle(b);
      return Math.ceil(b.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom));
    };
    let conf = {}, at = 0, running = false, sent = 0, stale = false;
    listen(d, CONFIG_CHANGED, (m) => { if (m && typeof m === "object") conf = { ...conf, ...m }; });
    listen(d, STEP_CHANGED, (m) => { if (m && m.request !== true && typeof m.index === "number") at = m.index; });
    const tallest = () => {
      if (got.reason) return natural();
      const n = Math.max(1, progressionOf(conf, conf.key, conf.scale).chords.length), back = at;
      let t = 0;
      /* the step echo every board draws from, attack-borne (the sound did not travel on it — audio-card never sounds
       * one), so nothing is heard. It starts on the chord AFTER the shown one and ends on the shown one: a board
       * redraws only for a step it is not already on, and the shown chord's drawing may be from the last width
       * (measured: read first, it carried the phone neck past 600 px). */
      for (let k = 1; k <= n; k++) { announce(d, STEP_CHANGED, { index: (back + k) % n, attack: true }); t = Math.max(t, natural()); }
      return t;
    };
    const report = () => {
      if (win.parent === win) return;
      let h;
      if (running) { h = natural(); stale = true; if (h <= sent) return; }   // playing: only ever grow
      else { h = tallest(); stale = false; }
      sent = h;
      win.parent.postMessage({ type: HEIGHT_MSG, height: h, width: win.innerWidth }, "*");
    };
    let lastW = win.innerWidth;
    /* after the resize's own turn: the neck redraws for its media query only once the resize events have run */
    win.addEventListener("resize", () => { if (win.innerWidth !== lastW) { lastW = win.innerWidth; win.setTimeout(report, 0); } });
    win.addEventListener("message", (e) => { if (e.source === win.parent && e.data && e.data.type === MEASURE_MSG) report(); });
    listen(d, CLOCK_STATE, (m) => {
      if (m && typeof m.running === "boolean") { const was = running; running = m.running; if (was && !running && stale) report(); }
    });
    const settle = () => { win.setTimeout(report, 0); if (d.fonts && d.fonts.ready) d.fonts.ready.then(() => win.setTimeout(report, 0)); };

    if (got.reason) {
      msg.textContent = got.reason;
      /* NOTHING PLAYS: the neck is not shown, and its transport cannot be pressed (the board is field-board's — its
       * container is hidden whole, never reached into); the reason stands where the neck would be */
      const neck = byId("fieldSvg");
      const board = neck && neck.closest(".board");
      if (board) { board.before(foot); board.hidden = true; }
      settle();
      return;
    }
    byId("doorFoot").appendChild(foot);
    /* after every module has mounted and the clock has said what it is (the record sorts clock keys by what the clock
     * has said on this page), the étude goes home */
    queueMicrotask(() => { etudeRecord(d).restore(got.snapshot); settle(); });

    /* ONE AT A TIME */
    if (typeof win.BroadcastChannel !== "function") return;
    const me = Math.random().toString(36).slice(2);
    const ch = new win.BroadcastChannel(PLAYER_CHANNEL);
    let playing = false;
    listen(d, CLOCK_STATE, (m) => {
      if (!m || typeof m.running !== "boolean") return;
      if (m.running && !playing) ch.postMessage({ started: me });
      playing = m.running;
    });
    ch.onmessage = (e) => {
      if (e.data && e.data.started && e.data.started !== me && playing) announce(d, CLOCK, { run: false });
    };
  },
};
