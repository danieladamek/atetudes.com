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

/* THE INFO BUTTON + POPOUT (Daniel: static instructional prose "takes up real
 * estate and lends to visual clutter"). Shell-level like the chevron: a panel
 * marks its STATIC prose with the grammar class .info, and the shell moves it
 * off the panel face into a popout behind a neutral circle-i, immediately left
 * of the collapse chevron. A panel with no .info prose gets no button. LIVE
 * readouts (a .hint written at runtime) are never .info, so they stay on the
 * face — the whole point of the item. House neutrals only; --red is the degree
 * palette's Root. The popout is a plain element, never a dialog element: the
 * file:// gate forbids a modal. .clpsum is a hidden one-line collapse summary a
 * panel supplies when moving its prose would otherwise leave it summariless. */
.infoBtn{position:absolute;top:8px;right:38px;font:inherit;font-size:11px;
  padding:1px 7px;border:1px solid var(--line);border-radius:6px;background:#fff;
  cursor:pointer;color:var(--gray);z-index:7}
.infoBtn:hover{border-color:var(--ink);color:var(--ink)}
.infoPop{position:absolute;top:32px;left:10px;right:10px;z-index:20;
  background:var(--card);border:1px solid var(--line);border-radius:8px;
  padding:12px 14px;box-shadow:0 6px 24px rgba(0,0,0,.14);max-height:60vh;overflow:auto}
.infoPop[hidden]{display:none}
.infoPop .info{font-size:12px;color:var(--ink);line-height:1.55;margin:0}
.clpsum{display:none}
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
  // the summary is derived from a panel's own line, named only through GRAMMAR
  // tokens (.clpsum, .hint, .bh) — never a module's private id, which would ship
  // this shell's always-present code into a door that prunes that module. The
  // FIRST NON-EMPTY source wins: an explicit `.clpsum` one-liner, else a live
  // `.hint` (never `.info` — that is the static prose now in a popout), else the
  // board header. Skipping empties matters — a hidden fsBoxHint or an empty
  // import message must fall through to the header, not blank the summary.
  const summaryOf = (p) => {
    // …and the panel's own title (h2) is the floor: a panel must never collapse
    // to a blank line, and its name is the minimum honest summary. Real panels
    // all carry a richer source above and never reach it.
    for (const sel of [".clpsum", ".hint:not(.info)", ".bh span", "h2"]) {
      const el = p.querySelector(sel);
      const t = el ? el.textContent.replace(/\s+/g, " ").trim() : "";
      if (t) return t;
    }
    return "";
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

/** The info button + popout — page grammar, applied AFTER the modules mount so
 * it wraps whatever a door rendered without naming one. A panel that carries
 * `.info` prose grows a neutral ⓘ just left of the collapse chevron; the prose
 * is MOVED verbatim into a popout the button toggles. Dismissed by click-outside
 * and by Escape — never a browser modal (the file:// gate forbids a dialog).
 * Keyboard-reachable (a real button) and labelled, since the popout is now the
 * only route to that text. A panel with no static prose gets no button. */
function initInfo(doc) {
  let openBtn = null, openPop = null;
  const close = () => {
    if (openPop) { openPop.hidden = true; openBtn.setAttribute("aria-expanded", "false"); }
    openBtn = openPop = null;
  };
  let n = 0;
  for (const p of doc.querySelectorAll(".card, .board")) {
    const prose = [...p.querySelectorAll(".info")];
    if (!prose.length) continue;
    const pop = doc.createElement("div");
    pop.className = "infoPop"; pop.hidden = true; pop.id = "infoPop-" + (++n);
    for (const el of prose) pop.appendChild(el);   // MOVE the prose in, verbatim
    p.appendChild(pop);
    const btn = doc.createElement("button");
    btn.className = "infoBtn"; btn.textContent = "ⓘ";   // ⓘ
    btn.setAttribute("aria-label", "About this panel");
    btn.setAttribute("aria-controls", pop.id);
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();          // this click must not reach the outside-close
      const willOpen = pop.hidden;
      close();
      if (willOpen) { pop.hidden = false; btn.setAttribute("aria-expanded", "true"); openBtn = btn; openPop = pop; }
    });
    p.appendChild(btn);
  }
  doc.addEventListener("click", (e) => { if (openPop && !openPop.contains(e.target)) close(); });
  doc.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
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
  initInfo(doc);
  initCollapse(doc);
  return ctx;
}
