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
 */
import { fromFragment, toFragment } from "../../engine/etude-link.mjs";
import { checkEtude, ETUDE_V } from "../../engine/etude-block.mjs";
import { etudeRecord } from "../etude-record.mjs";
import { CLOCK, CLOCK_STATE, announce, listen } from "../bus.mjs";

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
.pl-open{margin-left:auto;font-size:12px;color:var(--ink);text-decoration:underline;text-underline-offset:2px}`,

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
    if (got.reason) {
      msg.textContent = got.reason;
      /* NOTHING PLAYS: the neck is not shown, and its transport cannot be pressed (the board is field-board's — its
       * container is hidden whole, never reached into); the reason stands where the neck would be */
      const neck = byId("fieldSvg");
      const board = neck && neck.closest(".board");
      if (board) { board.before(foot); board.hidden = true; }
      return;
    }
    byId("doorFoot").appendChild(foot);
    /* after every module has mounted and the clock has said what it is (the record sorts clock keys by what the clock
     * has said on this page), the étude goes home */
    queueMicrotask(() => etudeRecord(d).restore(got.snapshot));

    /* ONE AT A TIME */
    if (typeof win.BroadcastChannel !== "function") return;
    const me = Math.random().toString(36).slice(2);
    const ch = new win.BroadcastChannel(PLAYER_CHANNEL);
    let running = false;
    listen(d, CLOCK_STATE, (m) => {
      if (!m || typeof m.running !== "boolean") return;
      if (m.running && !running) ch.postMessage({ started: me });
      running = m.running;
    });
    ch.onmessage = (e) => {
      if (e.data && e.data.started && e.data.started !== me && running) announce(d, CLOCK, { run: false });
    };
  },
};
