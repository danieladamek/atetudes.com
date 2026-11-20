/* card-shell.mjs — THE FAMILY'S CHROME TOKENS AND CARD GRAMMAR, ONE SOURCE (shell 1.0.0; item "The card shell bundle",
 * FAMILY-REDESIGN decision 4; decisions A–E ruled by Daniel 2026-11-19, as the card shell proposal, §2, specifies).
 *
 * The doors' shell (hub/shell.mjs) composes its page grammar from these pieces; the two hand pages carry tokensCss("page")
 * byte for byte; the generator bridge emits the same :root from TOKENS. RiffRaft vendors the lot as
 * build/vendor/atetudes-shell.<version>.mjs (hub/tools/vendor.mjs, the shell kind). Every rule below MOVED here verbatim
 * from hub/shell.mjs on 261119; nothing in what a page shows changed.
 *
 * NEVER IN IT: a degree colour. --red is the Root's (FAM_COLOR R), lent to chrome by rule 8 — a caller that wants it
 * passes it in tokensCss's second argument from the degree palette; this file states no degree hex, and the bundle's
 * lock reads its bytes for one. No bus, no mount code, no mini: those are door machinery.
 *
 * DECISION A — two skins, named: `door` (v0.9's: white ground, #FAFAFB cards, #E6E6EA edges — the doors and RiffRaft)
 * and `page` (the hand pages': #ECECEE ground, white cards, a #D8D8DC line; it has no --edge today, so it states none).
 * Each page keeps exactly the values it shows; one-skin convergence is its own item.
 * DECISION B — ink and gray are the Spec's (§2.1's supporting grays) and are asserted against it at test time; ground,
 * card, line and edge are CHROME, not Spec, until an amendment makes them law.
 */

export const SHELL_VERSION = "1.0.0";

/** the two skins (decision A), in the order the :root block states them; null = the skin states no such token */
export const TOKENS = Object.freeze({
  door: Object.freeze({ ground: "#FFFFFF", card: "#FAFAFB", ink: "#212126", gray: "#73737A", line: "#B9B9BF", edge: "#E6E6EA" }),
  page: Object.freeze({ ground: "#ECECEE", card: "#FFFFFF", ink: "#212126", gray: "#73737A", line: "#D8D8DC", edge: null }),
});
/** which tokens the Spec fixes (decision B) — the rest are chrome */
export const SPEC_TOKENS = Object.freeze(["ink", "gray"]);

/** tokensCss(skin, extra) → the :root block, emitted from TOKENS — "--ground:#FFFFFF; --card:…" in TOKENS' order, then
 * `extra`'s (the caller's, e.g. { red } from the degree palette), four to a line as the hand-written blocks were */
export function tokensCss(skin, extra = {}) {
  const t = TOKENS[skin];
  if (!t) throw new Error(`tokensCss: no skin "${skin}" — the skins are ${Object.keys(TOKENS).join(", ")}`);
  const decl = [...Object.entries(t), ...Object.entries(extra)].filter(([, v]) => v != null).map(([k, v]) => `--${k}:${v};`);
  const lines = [];
  for (let i = 0; i < decl.length; i += 4) lines.push("  " + decl.slice(i, i + 4).join(" "));
  return `:root{\n${lines.join("\n")}\n}`;
}

/* ---------------- the controls (decision C) ---------------- */
export const FIELD_CSS = `label{font-size:12px;color:var(--gray);display:block;margin:8px 0 3px}
select,input[type=text]{
  font:inherit;font-size:13px;padding:5px 7px;border:1px solid var(--line);
  border-radius:6px;background:#fff;color:var(--ink);max-width:100%}
`;
export const TRANSPORT_CSS = `.transport{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.transport button{font:inherit;font-size:14px;padding:7px 13px;border:1px solid var(--line);
  border-radius:8px;background:#fff;cursor:pointer;color:var(--ink)}
.transport button.primary{background:var(--ink);border-color:var(--ink);color:#fff;font-weight:bold}
`;
export const SEG_CSS = `.seg{display:flex;flex-wrap:wrap;gap:6px}
.seg button{font:inherit;font-size:12.5px;padding:5px 9px;border:1px solid var(--line);
  border-radius:6px;background:#fff;cursor:pointer;color:var(--ink)}
.seg button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.seg button:disabled{opacity:.45;cursor:not-allowed}`;
/** the family's controls: labels, selects and text fields, the transport's buttons and its ink primary, the segmented row */
export const CONTROLS_CSS = FIELD_CSS + TRANSPORT_CSS + SEG_CSS;

/* ---------------- the card grammar ---------------- */
export const HINT_CSS = `.hint{font-size:11.5px;color:var(--gray);line-height:1.45;margin-top:8px}
`;
/** the three containers — a card, a full-width strip, a board — each shipped only where a page mounts one */
export const CARD_FRAME_CSS = `
.card{background:var(--card);border:1px solid var(--edge);border-radius:10px;
      padding:12px 14px;flex:1 1 260px;min-width:250px;position:relative}
.card h2{font-size:12px;letter-spacing:.06em;text-transform:uppercase;
         color:var(--gray);margin:0 0 10px;font-weight:bold}
`;
export const STRIP_FRAME_CSS = `
.card.strip{background:var(--card);border:1px solid var(--edge);border-radius:10px;
      padding:12px 14px;margin-bottom:12px;position:relative}
.card.strip h2{font-size:12px;letter-spacing:.06em;text-transform:uppercase;
         color:var(--gray);margin:0 0 10px;font-weight:bold}
.card.strip .row2.alignEnd{align-items:flex-end}
.striprow{display:flex;flex-wrap:wrap;gap:8px 28px;align-items:flex-start}
.striprow .grp{flex:0 1 auto;min-width:170px}
`;
export const BOARD_FRAME_CSS = `
.board{background:var(--card);border:1px solid var(--edge);border-radius:10px;
       padding:10px 12px;margin-bottom:12px;position:relative}
.board .bh{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--gray);
           font-weight:bold;margin:0 0 6px;display:flex;justify-content:space-between;align-items:center}
/* the collapse header-variant for a board (.bh, not h2) rides with the boards
 * wrapper — it ships only when a door has boards, so it can never orphan */
.clpsd>.bh{display:flex!important;margin-bottom:2px}
`;
/* EXPAND/COLLAPSE ON EVERY PANEL (Shell 4) — the reference's chevron, its look
 * and its persistence behaviour, which is NONE: collapse is a DOM class only,
 * session-only, never stored and never on the bus. A shared étude opens the way
 * its author left it. The chevron and one-line summary are injected by the shell
 * (initCollapse) into every card, strip and board; collapse hard-hides every
 * direct child, then re-shows the header, the chevron and the summary. The
 * board-header variant (.bh) lives with the boards wrapper, since only a door
 * with boards can match it — the rest is universal and belongs here. */
export const COLLAPSE_CSS = `.clpsBtn{position:absolute;top:8px;right:10px;font:inherit;font-size:11px;
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
export const INFO_CSS = `.infoBtn{position:absolute;top:8px;right:38px;font:inherit;font-size:11px;
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
/** the whole card grammar in one string, for a host that mounts every container (RiffRaft's card) */
export const CARD_CSS = CARD_FRAME_CSS + STRIP_FRAME_CSS + BOARD_FRAME_CSS + HINT_CSS + COLLAPSE_CSS + INFO_CSS;

/** Expand/collapse on every panel — page grammar, applied AFTER the modules
 * mount so it wraps whatever a door actually rendered without naming one. The
 * chevron and summary are the shell's; the state is a DOM class and nothing
 * else (session-only, off the bus), so a shared étude opens the way its author
 * left it. The summary is derived from the panel's own live readout — its hint,
 * the stage's readout line, or a board's header — and refreshed while collapsed
 * so it never shows stale settings. */
export function initCollapse(doc) {
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
    /* THE CHEVRON'S ONLY SEAT IS THE HEADER BAND (night 85 — PO ruling 261053 §2, a SHELL rule): every panel declares a
     * header (a card's h2, a board's .bh). A panel without one put the chevron over its own content (the chart line's
     * chips; the readout's chord name at 390). It cannot exist silently: the shell names it where every gate looks, and
     * the door gate holds every chevron inside its header band on every door, at 1280 and 390. */
    if (!header && doc.defaultView && doc.defaultView.console)
      doc.defaultView.console.error(`[shell] a panel with no header band (a card's h2, a board's .bh): ${p.id || p.className} — the collapse chevron has no seat`);
    const sum = doc.createElement("div");
    sum.className = "clpsSum";
    if (header) header.after(sum); else p.prepend(sum);
    /* THE HEADER SLOT (260913b, item 2 — the first shell change in
     * seventeen nights, reported not absorbed): a panel's module may mark
     * ONE element `data-header-slot`; the shell seats it in the header
     * band, left of the ⓘ and the chevron — the ⓘ's own precedent. The
     * shell owns placement; the element, its id and its behaviour stay
     * the module's. Hidden while collapsed, as the ⓘ is. */
    const slot = p.querySelector("[data-header-slot]");
    if (slot) {
      // placement styled inline: a stylesheet rule would orphan the CSS
      // check in every door whose modules declare no slot
      /* STACK, DO NOT SHRINK (261024b, night 67 item 1 — night 53's #8, PO ruling 261024): the slot sat
       * ABSOLUTE in the header band with nothing reserving its room, so where the band is narrow it lay over
       * the header's own words — at 390 the title field covered 99 px of "Practice log — 0 saved" in scribe
       * AND in the published tetradetudes, 59 px of "Notepad" in the published multetudes. The seat is now
       * MEASURED, never a per-page rule: the slot takes the band only while the header's words end left of it;
       * otherwise it drops into the flow on a line of its own directly under the header (night 51's answer).
       * Re-measured on resize. It is placed after the header either way, so the flow seat is under the words. */
      (header && header.nextElementSibling ? header.nextElementSibling : p.lastChild).after(slot);
      const seat = () => {
        slot.style.position = "absolute"; slot.style.top = "8px"; slot.style.right = "66px";
        slot.style.margin = ""; slot.style.maxWidth = "";
        if (!header || !slot.getClientRects().length) return;
        const words = doc.createRange(); words.selectNodeContents(header);
        const ink = words.getBoundingClientRect(), at = slot.getBoundingClientRect(), box = p.getBoundingClientRect();
        if (ink.right + 8 > at.left || at.left < box.left) {
          slot.style.position = "static"; slot.style.margin = "2px 0 8px"; slot.style.maxWidth = "100%";
        }
      };
      seat();
      const view = doc.defaultView;
      if (view) { view.addEventListener("resize", seat); view.requestAnimationFrame(seat); }
    }
    /* ROW COLLAPSE (260917, night 22 item 6a — ruled, night 21's option b):
     * cards sharing a declared row collapse TOGETHER. Cards in a row are
     * equal height by design, so collapsing one alone cannot shrink
     * anything — the taller card sets the height; the honest behaviour IS
     * the row. Membership is DERIVED from the build's own row wrapper (a
     * panel whose parent is a .cardrow shares that row) — nothing listed by
     * hand. THE CONDITION: the control SAYS its scope — its title names the
     * row ("collapse this row: Metronome and Notepad"), CC-1's third clause
     * applied to an affordance. A single-card row degrades to one name. */
    const row = p.parentElement && p.parentElement.classList.contains("cardrow")
      ? p.parentElement : null;
    const mates = row ? [...row.children].filter((c) => c !== p && c.matches(".card, .board")) : [];
    const nameOf = (x) => {
      const h = x.querySelector("h2, .bh span");
      return h ? h.textContent.replace(/\s+/g, " ").trim() : "this panel";
    };
    const scope = mates.length
      ? " this row: " + [p, ...mates].map(nameOf).reduce((acc, n, i, all) =>
          acc + (i === 0 ? "" : i === all.length - 1 ? " and " : ", ") + n, "")
      : "";
    const btn = doc.createElement("button");
    btn.className = "clpsBtn"; btn.textContent = "▾"; btn.title = "collapse" + scope;
    /* A DECLARED START-COLLAPSED (261012b — the tuning card, Daniel: "default the tuning to its collapsed form"): a
     * module that declares `collapsed: true` is written by the build with this class already on its container, so
     * it paints shut; the chevron reads ▸ / "expand" from the start and the summary is filled now. Not persisted:
     * every load opens it shut, by design. */
    if (p.classList.contains("clpsd")) { btn.textContent = "▸"; btn.title = "expand" + scope; sum.textContent = summaryOf(p); }
    btn.addEventListener("click", () => {
      const on = p.classList.toggle("clpsd");
      btn.textContent = on ? "▸" : "▾";
      btn.title = (on ? "expand" : "collapse") + scope;
      if (on) sum.textContent = summaryOf(p);
      for (const m of mates) {                    // the row moves as one
        m.classList.toggle("clpsd", on);
        const mb = m.querySelector(".clpsBtn"), ms = m.querySelector(".clpsSum");
        if (mb) { mb.textContent = on ? "▸" : "▾"; mb.title = (on ? "expand" : "collapse") + scope; }
        if (on && ms) ms.textContent = summaryOf(m);
      }
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
  /* …and a summary SOURCE rewritten by the bus, not by a gesture, reaches the shut panel too (261012b): the capture
   * listeners above run BEFORE the click's own handler, so a Restore in the log rewrote the tuning after the
   * refresh had read it. A panel's `.clpsum` (its declared one-liner) is watched, and a change re-reads the summary
   * while the panel is shut — a shut card never hides an altered neck (CC-1). */
  const Observer = doc.defaultView && doc.defaultView.MutationObserver;
  if (Observer)
    for (const [p, sum] of panels) {
      const src = p.querySelector(".clpsum");
      if (src) new Observer(() => { if (p.classList.contains("clpsd")) sum.textContent = summaryOf(p); })
        .observe(src, { childList: true, characterData: true, subtree: true });
    }
}

/** The info button + popout — page grammar, applied AFTER the modules mount so
 * it wraps whatever a door rendered without naming one. A panel that carries
 * `.info` prose grows a neutral ⓘ just left of the collapse chevron; the prose
 * is MOVED verbatim into a popout the button toggles. Dismissed by click-outside
 * and by Escape — never a browser modal (the file:// gate forbids a dialog).
 * Keyboard-reachable (a real button) and labelled, since the popout is now the
 * only route to that text. A panel with no static prose gets no button. */
export function initInfo(doc) {
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
    /* THE ⓘ TAKES ITS SEAT IN THE HEADER (261012d — ruled by Daniel): since 261012b (and, from 261013, each card's own
     * explanation), a panel that never had prose has an ⓘ, and three headers had reserved their right edge for the chevron alone — the ⓘ
     * lay over the Mixer's repeat and two Tetradetudes ⏭. A panel given an ⓘ reserves ⓘ + chevron (66 px, the
     * readout headers' figure) on its header band. Inline, as the header slot is placed: a stylesheet rule would
     * orphan in every door whose panels never grow an ⓘ. A header already reserving more keeps its own. */
    const header = p.querySelector(":scope > h2, :scope > .bh");
    const view = doc.defaultView;
    if (header && view && view.getComputedStyle && (parseFloat(view.getComputedStyle(header).paddingRight) || 0) < 66)
      header.style.paddingRight = "66px";
  }
  doc.addEventListener("click", (e) => { if (openPop && !openPop.contains(e.target)) close(); });
  doc.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

