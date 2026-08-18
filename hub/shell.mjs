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
 */

export const SHELL_STYLES = `
:root{
  --ground:#ECECEE; --card:#FFFFFF; --ink:#212126; --gray:#73737A; --line:#D8D8DC;
  --red:#B82929;
}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);
     font-family:Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:18px 16px 60px}
header h1{font-size:26px;margin:6px 0 2px}
header .tag{color:var(--gray);font-size:13px;margin-bottom:14px}
.cards{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px;align-items:flex-start}
label{font-size:12px;color:var(--gray);display:block;margin:8px 0 3px}
select,input[type=text]{
  font:inherit;font-size:13px;padding:5px 7px;border:1px solid var(--line);
  border-radius:6px;background:#fff;color:var(--ink);max-width:100%}
.bpmrow{display:flex;align-items:center;gap:8px;margin-top:10px}
.bpmrow input[type=range]{flex:1;accent-color:var(--ink)}
.hint{font-size:11.5px;color:var(--gray);line-height:1.45;margin-top:8px}
.chk{display:flex;align-items:center;gap:7px;font-size:13px;margin:7px 0;cursor:pointer}
.chk input{width:auto}
.row2{display:flex;gap:10px;flex-wrap:wrap}
.row2>div{flex:1 1 90px}
.transport{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.transport button{font:inherit;font-size:14px;padding:7px 13px;border:1px solid var(--line);
  border-radius:8px;background:#fff;cursor:pointer;color:var(--ink)}
.transport button.primary{background:var(--red);border-color:var(--red);color:#fff;font-weight:bold}
footer{color:var(--gray);font-size:11.5px;margin-top:18px;line-height:1.5}

/* EXPAND/COLLAPSE ON EVERY PANEL (Shell 4) — the reference's chevron, its look
 * and its persistence behaviour, which is NONE: collapse is a DOM class only,
 * session-only, never stored and never on the bus. A shared étude opens the way
 * its author left it. The chevron and one-line summary are injected by the shell
 * (initCollapse) into every card, strip and board; collapse hard-hides every
 * direct child, then re-shows the header, the chevron and the summary. The
 * board-header variant (.bh) lives with the boards wrapper, since only a door
 * with boards can match it — the rest is universal and belongs here. */
.clpsBtn{position:absolute;top:8px;right:10px;font:inherit;font-size:11px;
  padding:1px 7px;border:1px solid var(--line);border-radius:6px;background:#fff;
  cursor:pointer;color:var(--gray);z-index:7}
.clpsBtn:hover{border-color:var(--ink);color:var(--ink)}
.clpsSum{display:none;font-size:12px;color:var(--gray);margin:0;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:58px}
.clpsd>*{display:none!important}
.clpsd>h2{display:block!important;margin-bottom:2px}
.clpsd>.clpsBtn{display:block!important}
.clpsd>.clpsSum{display:block!important}
`;

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
    styles: `
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;
      padding:12px 14px;flex:1 1 260px;min-width:250px;position:relative}
.card h2{font-size:12px;letter-spacing:.06em;text-transform:uppercase;
         color:var(--gray);margin:0 0 10px;font-weight:bold}
`,
  },
  /* the reference page's THIRD container: a full-width material strip between
   * the clock row and the boards — `.card.strip` in the study, where Harmony,
   * Shape & Motion and the timeline live. It was missing here, and its absence
   * is most of why the page read airy: strips were being mounted as boards. */
  strips: {
    html: (inner, extra) => `<div class="card strip${extra ? " " + extra : ""}">${inner}</div>`,
    styles: `
.card.strip{background:var(--card);border:1px solid var(--line);border-radius:10px;
      padding:12px 14px;margin-bottom:12px;position:relative}
.card.strip h2{font-size:12px;letter-spacing:.06em;text-transform:uppercase;
         color:var(--gray);margin:0 0 10px;font-weight:bold}
.card.strip .row2.alignEnd{align-items:flex-end}
.striprow{display:flex;flex-wrap:wrap;gap:8px 28px;align-items:flex-start}
.striprow .grp{flex:0 1 auto;min-width:170px}
.seg{display:flex;flex-wrap:wrap;gap:6px}
.seg button{font:inherit;font-size:12.5px;padding:5px 9px;border:1px solid var(--line);
  border-radius:6px;background:#fff;cursor:pointer;color:var(--ink)}
.seg button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.seg button:disabled{opacity:.45;cursor:not-allowed}`,
  },
  boards: {
    html: (inner, extra) => `<div class="board${extra ? " " + extra : ""}">${inner}</div>`,
    styles: `
.board{background:var(--card);border:1px solid var(--line);border-radius:10px;
       padding:10px 12px;margin-bottom:12px;position:relative}
.board .bh{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--gray);
           font-weight:bold;margin:0 0 6px;display:flex;justify-content:space-between;align-items:center}
/* the collapse header-variant for a board (.bh, not h2) rides with the boards
 * wrapper — it ships only when a door has boards, so it can never orphan */
.clpsd>.bh{display:flex!important;margin-bottom:2px}
`,
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

/** Expand/collapse on every panel — page grammar, applied AFTER the modules
 * mount so it wraps whatever a door actually rendered without naming one. The
 * chevron and summary are the shell's; the state is a DOM class and nothing
 * else (session-only, off the bus), so a shared étude opens the way its author
 * left it. The summary is derived from the panel's own live readout — its hint,
 * the stage's readout line, or a board's header — and refreshed while collapsed
 * so it never shows stale settings. */
function initCollapse(doc) {
  // the summary is derived from a panel's own live line, named only through
  // GRAMMAR tokens (.hint, .bh) — never a module's private id, which would ship
  // this shell's always-present code into a door that prunes that module
  const summaryOf = (p) => {
    const src = p.querySelector(".hint") || p.querySelector(".bh span");
    return src ? src.textContent.replace(/\s+/g, " ").trim() : "";
  };
  const panels = [];
  for (const p of doc.querySelectorAll(".card, .board")) {
    const header = p.querySelector("h2") || p.querySelector(".bh");
    const sum = doc.createElement("div");
    sum.className = "clpsSum";
    if (header) header.after(sum); else p.prepend(sum);
    const btn = doc.createElement("button");
    btn.className = "clpsBtn"; btn.textContent = "▾"; btn.title = "collapse";
    btn.addEventListener("click", () => {
      const on = p.classList.toggle("clpsd");
      btn.textContent = on ? "▸" : "▾";
      btn.title = on ? "expand" : "collapse";
      if (on) sum.textContent = summaryOf(p);
    });
    p.appendChild(btn);
    panels.push([p, sum]);
  }
  // a collapsed panel's summary stays current as the user works elsewhere —
  // derived on any interaction, the way the reference refreshes on render
  const refresh = () => {
    for (const [p, sum] of panels)
      if (p.classList.contains("clpsd")) sum.textContent = summaryOf(p);
  };
  for (const ev of ["input", "change", "click"]) doc.addEventListener(ev, refresh, true);
}

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
  initCollapse(doc);
  return ctx;
}
