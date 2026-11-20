/* shell.mjs — the hub's host surface: page grammar and nothing else.
 *
 * It owns the family's layout vocabulary — the wrap, the card, the transport
 * row, the hint — and it mounts contributions FROM A LIST IT DOES NOT WRITE.
 * It never names a module (§4.2.1's structural constraint) and it renders no
 * control of its own.
 *
 * SHELL_STYLES is the page grammar, lifted verbatim in spirit from the shipped
 * Triadetudes study so the doors look like the family rather than like a test
 * rig. Every rule here either uses a bare element selector or names something
 * this file's own markup contains — the resolver enforces that, because a
 * shell rule anchored in a MODULE's markup is CSS that outlives its module.
 *
 * `.chk` and `.row2` are here by PROMOTION rather than by decree: each lived
 * in the metronome card while exactly one module used it, and moved up on
 * 2026-08-17 when a second user arrived (`.chk`: the transport card; `.row2`:
 * the harmony panel). Grammar is earned with evidence (§4.2.2), and the
 * resolver refused the build until they moved — the rule doing its job.
 *
 * THE CARD SHELL (261119, shell 1.0.0): the tokens, the containers' frames, the controls, the hint, the ▾ and the ⓘ —
 * their rules and their behaviour — now live in hub/card-shell.mjs, the family's one copy (RiffRaft vendors it). This
 * file composes them, in the order they always stood, around the page grammar that is the doors' alone. --red is the
 * Root's, lent by rule 8: it arrives from the degree palette, never typed here.
 */
import { tokensCss, FIELD_CSS, TRANSPORT_CSS, SEG_CSS, HINT_CSS, CARD_FRAME_CSS, STRIP_FRAME_CSS, BOARD_FRAME_CSS, COLLAPSE_CSS, INFO_CSS, initCollapse, initInfo } from "./card-shell.mjs";
import { FAM_COLOR } from "../engine/degree-palette.mjs";

export const SHELL_STYLES = `
${tokensCss("door", { red: FAM_COLOR.R })}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);
     font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
     -webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:18px 16px 60px}
header h1{font-size:17px;margin:6px 0 2px}
header .tag{color:var(--gray);font-size:13px;margin-bottom:14px}
/* cards in one row share a height (default stretch), exactly the triad app's
 * rule — align-items:flex-start had let the metronome fall short of the
 * transport, the dead gap Daniel saw (shell parity N1, 260819.4) */
.cards{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px}
${FIELD_CSS}.bpmrow{display:flex;align-items:center;gap:8px;margin-top:10px}
.bpmrow input[type=range]{flex:1;accent-color:var(--ink)}
${HINT_CSS}.chk{display:flex;align-items:center;gap:7px;font-size:13px;margin:7px 0;cursor:pointer}
.chk input{width:auto}
.row2{display:flex;gap:10px;flex-wrap:wrap}
.row2>div{flex:1 1 90px}
${TRANSPORT_CSS}/* ONE MUTE ICON PER SLIDER (260820.3, Daniel's design) — page grammar because
 * two cards render it (the transport's chord and bass rows, the metronome's
 * Vol). The icon is a VIEW of its slider's level: level 0 renders muted however
 * it got there — v0.8.7's mute-is-the-slider-at-zero rule made universal. */
.muteBtn{font:inherit;font-size:12px;line-height:1;padding:2px 4px;border:none;
  background:transparent;cursor:pointer}
.muteBtn[aria-pressed="true"]{opacity:.55}
/* THE CARD GRAMMAR (260820.4, Daniel's sketch): no row spent on a checkbox —
 * state toggles ride the right-hand end of a row that already exists. .rowEnd
 * is that seat, in both cards, in every app. (Right-alignment is an inference
 * from the sketch, flagged in the item.) */
.row2>.rowEnd{margin-left:auto;flex:0 0 auto;display:flex;gap:9px;align-items:flex-end}
.rowEnd .chk{margin:0}
footer{color:var(--gray);font-size:11.5px;margin-top:18px;line-height:1.5}

${COLLAPSE_CSS}
${INFO_CSS}`;

/** The layout CONTAINERS are the shell's, and the shell writes them — that is
 * why `.card` and `.board` are page grammar rather than one module's property.
 * A module contributes the contents and names the container it wants; it never
 * writes the container itself, exactly as it never writes the module list.
 *
 * A container's STYLES travel with the container, and the build emits them only
 * for mount points a door actually fills. Otherwise `.board` outlives the last
 * module that asked for a board — page grammar becomes a trace, which is the
 * orphan the suite caught on first run. */
export const WRAPPERS = {
  /* a contribution with NO surface of its own — script that realises what
   * other cards control (the audio realiser). It gets no container, so it can
   * never be the empty box the reference has none of. */
  hidden: {
    html: (inner) => inner ? `<div hidden>${inner}</div>` : "",
    styles: "",
  },
  cards: {
    html: (inner, extra) => `<div class="card${extra ? " " + extra : ""}">${inner}</div>`,
    styles: `${CARD_FRAME_CSS}`,
  },
  /* the reference page's THIRD container: a full-width material strip between
   * the clock row and the boards — `.card.strip` in the study, where Harmony,
   * Shape & Motion and the timeline live. It was missing here, and its absence
   * is most of why the page read airy: strips were being mounted as boards. */
  strips: {
    html: (inner, extra) => `<div class="card strip${extra ? " " + extra : ""}">${inner}</div>`,
    styles: `${STRIP_FRAME_CSS}${SEG_CSS}`,
  },
  boards: {
    html: (inner, extra) => `<div class="board${extra ? " " + extra : ""}">${inner}</div>`,
    styles: `${BOARD_FRAME_CSS}`,
  },
};

/** the page skeleton. cards and boards are the two mount points a
 * contribution can ask for; everything else is chrome. */
export const SHELL_MARKUP = `
<div class="wrap">
  <header>
    <h1 id="doorTitle"></h1>
    <div class="tag" id="doorTag"></div>
  </header>
  <div id="hidden"></div>
  <div class="cards" id="cards"></div>
  <div id="strips"></div>
  <div id="boards"></div>
  <footer id="doorFoot"></footer>
</div>`;

export function boot(MODULES, door, doc) {
  const byId = (id) => doc.getElementById(id);
  doc.getElementById("doorTitle").textContent = door.present.title;
  doc.getElementById("doorTag").textContent = door.present.blurb;
  doc.getElementById("doorFoot").textContent = door.present.footer || "";
  const ctx = { door, doc, byId,
    /** modules report state changes here; the shell owns no readout of its
     * own, so this is a no-op seam the host page can take over */
    changed() {} };
  for (const m of MODULES) m.mount(ctx);
  initInfo(doc);
  initCollapse(doc);
  return ctx;
}
