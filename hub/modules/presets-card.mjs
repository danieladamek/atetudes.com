/* presets-card.mjs — v0.9's PRESETS card, LIVE (Multetudes surface,
 * 2026-08-29).
 *
 * A preset seeds every control and leaves them all live (v0.9's own words —
 * the note travels with the card). The catalogue is the journal page's
 * recipes RESTRICTED TO WHAT THE ENGINE SUPPORTS TONIGHT: scale, triad and
 * tetrad objects over any run at any ceiling (children 0–3a). The dyad and
 * shell recipes (R4, R17, R19, R26) arrive with child 4, R14's figure with
 * 3b, R7's and R19's bass with child 5 — each omission is that child's, not
 * a silent trim.
 *
 * A CATALOGUE IS CONTENT, NOT A DERIVABLE FACT — but it is CHECKED, not
 * trusted: at load every preset is applied through field → position →
 * selection and asserted to produce a non-empty, lawful take, so a recipe
 * that stops building fails here at import, not in Daniel's browser.
 */
import { field } from "../../engine/field.mjs";
import { positionOf, materialIn } from "../../engine/position.mjs";
import { diatonicTones, objectOffsets, oneOfEach, everyOccurrence, scaleTake } from "../../engine/selection.mjs";
import { CONFIG_CHANGED, listen, announce } from "../bus.mjs";
import { mountMini } from "../mini.mjs";
import { etudeRecord } from "../etude-record.mjs";
import { describe } from "../../engine/etude-describe.mjs";
import { etudeBlock, findEtudeBlock, readEtudeBlock, checkEtude, ETUDE_V } from "../../engine/etude-block.mjs";
import { LINK_KEY, linkable, toFragment, fromFragment } from "../../engine/etude-link.mjs";

/* label · the config it seeds. `take` defaults back to "one" exactly as v0.9
 * resets it, so a preset states only what it means. */
export const PRESETS = [
  ["R1 · a mode along one string", { strings: [2], notesPer: 3, object: "scale" }],
  ["R4 · dyads across two strings", { strings: [3, 2], notesPer: 1, object: "dyad" }],
  ["R5 · the scale, three per string, on two", { strings: [4, 3], notesPer: 3, object: "scale" }],
  ["R7 · a triad folded onto two strings", { strings: [3, 2], notesPer: 3, object: "triad" }],
  ["R9 · block triads", { strings: [4, 3, 2], notesPer: 1, object: "triad" }],
  ["R11 · triad lines", { strings: [4, 3, 2], notesPer: 3, object: "triad", take: "all" }],
  ["R12 · block tetrads", { strings: [4, 3, 2, 1], notesPer: 1, object: "tetrad" }],
  ["R14 · tetrad lines", { strings: [4, 3, 2, 1], notesPer: 3, object: "tetrad", take: "all" }],
  ["R15 · the six-string scale box", { strings: [6, 5, 4, 3, 2, 1], notesPer: 3, object: "scale" }],
  ["R16 · an open voicing on a skipped set", { strings: [6, 4, 3, 1], notesPer: 1, object: "tetrad" }],
  ["R17 · a shell", { strings: [6, 4, 3], notesPer: 1, object: "shell" }],
  ["R19 · a tetrad over a third below", { strings: [4, 3, 2, 1], notesPer: 1, object: "tetrad", bass: "third" }],
  ["R26 · a guide-tone dyad", { strings: [4, 3], notesPer: 1, object: "dyad", tones: [3, 7] }],
];

export const presetsCard = {
  id: "presets-card",
  layer: "surface",
  requires: { surface: "multetudes" },
  mount_point: "cards",
  order: 12,
  controls: ["psMini", "psSel", "psCopyBlock", "psCopyEmbed", "psPasteBlock"],

  /* THE SETTINGS CARD (261024, night 66 — Daniel, 261014: "a complete view of the étude the user has just
   * structured… all of that content should echo what then gets saved in the practice log"). The FACE renames;
   * the module id `presets-card` does not — an id is an address, a caption an appearance (rule 12), and every
   * seat, lock and pin addresses the id. The picker and its trace are unchanged. Below the rule, the étude
   * described from hub/etude-record.mjs — the SAME record the practice log saves, one instance per page. */
  markup: `
  <h2>Settings</h2>
  <!-- A VIEW OF THE TRANSPORT (night 69 — ruling 261026, D5 approved): one more mini host (hub/mini.mjs). One press,
       one state, every view — the host list is computed from the sources wherever it is counted. -->
  <div class="ps-miniseat"><span class="mini" id="psMini" data-control="psMini"></span></div>
  <label>Start from</label>
  <select id="psSel" data-control="psSel"></select>
  <div class="hint ps-trace" id="psTrace"></div>
  <div class="ps-desc" id="psDesc" aria-label="what this étude is — what a saved note keeps"></div>
  <!-- THE ÉTUDE BLOCK (261022 — docs/etude-block-format.md v1): the étude above, as a note block, both ways. Here and not
       in the notepad's row: that row is v0.9's ratified six, and its markup is carried byte for byte into two hand pages. -->
  <div class="ps-block">
    <button id="psCopyBlock" data-control="psCopyBlock">Copy note block</button>
    <button id="psCopyEmbed" data-control="psCopyEmbed">Copy embed code</button>
    <textarea id="psPasteBlock" data-control="psPasteBlock" rows="1" aria-label="paste an étude block to bring that étude back"
      placeholder="or paste a block here"></textarea>
    <div class="hint ps-blockmsg" id="psEmbedWhy"></div>
    <div class="hint ps-blockmsg" id="psBlockMsg" role="status"></div>
  </div>
  <div class="hint ps-note info">A preset sets up one of the journal page's exercises — the strings, the placement, the object and its tones — and leaves every control live to change; the key, the scale and the centre stay whatever you set them to. The card remembers which preset you started from, and says so once you've changed what it set. Below, it describes the whole étude as it stands, in words, updating as you change anything; the transport along the top plays and steps it from here. Copy note block copies the étude's settings (never its notes) as an etude block, to paste into an Obsidian note where RiffRaft plays it; paste such a block into the field beside it and the étude comes back here, every setting at once. Copy embed code copies a player of this étude for a web page: an iframe, with a plain link beneath it for sites that take no iframes. A link to an étude opens it here the same way; an étude with typed changes travels in neither, and the button says why.</div>`,

  styles: `
.ps-miniseat{margin:0 0 8px}
#psMini{display:flex;gap:4px}
#psMini button{font:inherit;font-size:11px;padding:2px 8px;border:1px solid var(--line);border-radius:6px;background:#fff;cursor:pointer;color:var(--ink);line-height:1.5}
#psMini button:hover{border-color:var(--ink)}
.ps-note{margin-top:8px}
#psSel{width:100%}
.ps-trace{margin-top:6px;color:var(--gray)}
.ps-trace b{font-weight:600;color:var(--ink)}
.ps-desc{margin-top:10px;padding-top:8px;border-top:1px solid var(--line);font-size:12px;line-height:1.45}
.ps-desc .ps-line{margin:0 0 3px}
.ps-block{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px}
#psCopyBlock,#psCopyEmbed{font:inherit;font-size:11px;padding:2px 9px;border:1px solid var(--line);border-radius:6px;background:#fff;cursor:pointer;color:var(--ink);line-height:1.5}
#psCopyBlock:hover,#psCopyEmbed:hover{border-color:var(--ink)}
#psCopyEmbed:disabled{color:var(--gray);cursor:default;border-color:var(--line)}
#psPasteBlock{flex:1 1 120px;min-width:0;font:inherit;font-size:11px;padding:2px 7px;border:1px solid var(--line);border-radius:6px;color:var(--ink);resize:none;height:22px;line-height:1.5}
.ps-blockmsg{flex-basis:100%;margin:0}
.ps-blockmsg:empty{display:none}`,

  mount(ctx) {
    mountMini(ctx, ctx.byId("psMini"));
    const d = ctx.doc, byId = ctx.byId;
    const sel = byId("psSel");
    sel.textContent = "";
    const o0 = d.createElement("option");
    o0.value = ""; o0.textContent = "— start from a preset —";
    sel.appendChild(o0);
    PRESETS.forEach(([label], i) => {
      const o = d.createElement("option");
      o.value = String(i); o.textContent = label;
      sel.appendChild(o);
    });
    /* THE CHOSEN PRESET LEAVES A TRACE (260909, item 5): the seed-then-
     * release rule stands (the select empties — v0.9's own behaviour), but
     * the card now says WHICH recipe seeded the state, and derives
     * "modified" by comparing the live config against the preset's own
     * seeded values — no hand-tracked dirty flag. Only the keys a preset
     * actually seeds are compared: the key, the scale and the reference
     * stay the player's, and moving them is not drift. */
    let chosen = null;      // { label, seed } of the last preset applied
    let live = {};          // the merged config as the bus replays it
    const trace = byId("psTrace");
    const sameVal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const paintTrace = () => {
      if (!chosen) { trace.textContent = ""; return; }
      const drifted = Object.keys(chosen.seed)
        .some((k) => k in live && !sameVal(live[k], chosen.seed[k]));
      trace.innerHTML = `Start from: <b></b>${drifted ? " · modified" : ""}`;
      trace.querySelector("b").textContent = chosen.label;
    };
    sel.addEventListener("change", (e) => {
      const p = PRESETS[+e.target.value];
      if (!p) return;
      const seed = { take: "one", notesPer: 1, ...p[1], strings: [...p[1].strings] };
      chosen = { label: p[0], seed };
      announce(d, CONFIG_CHANGED, seed);
      sel.value = "";                      // v0.9's own behaviour: seed, then release
      paintTrace();
    });
    /* THE DESCRIPTION: the record's snapshot, described — repainted whenever the record hears the bus */
    const record = etudeRecord(d), desc = byId("psDesc");
    const paintDesc = () => {
      desc.textContent = "";
      for (const { part, text } of describe(record.snapshot())) {
        const line = d.createElement("div");
        line.className = "ps-line";
        if (part === "also") line.style.color = "var(--gray)";   // inline: a rule for it would match nothing at boot (the door's CSS check)
        line.dataset.part = part; line.textContent = text;
        desc.appendChild(line);
      }
    };
    record.onChange(paintDesc); paintDesc();
    /* THE ÉTUDE BLOCK, BOTH WAYS (261022). Out: the record's snapshot, written by engine/etude-block.mjs — the same object
     * the description above says and a saved note keeps, so the three cannot disagree. In: a pasted block is read, every
     * value the grammar or the bench refuses is skipped and named (format §6, decision 7), and the rest goes home by the
     * record's own restore, exactly as a practice-log entry does. An étude another app wrote is named and left alone. */
    const blockMsg = byId("psBlockMsg");
    const say = (text) => { blockMsg.textContent = text; };
    /* A BLOCK GOES HOME (shared by a paste and a link, 261120): another app's étude is named and left alone; every value
     * the grammar or the bench refuses is skipped and named; the rest goes by the record's own restore */
    const bring = (r, from) => {
      if (r.app && r.app !== ctx.door.id) { say(`an étude ${r.app} wrote: this page restores its own (app: ${ctx.door.id})`); return; }
      const refused = [...r.flagged.map((f) => ({ what: f.key || `line ${f.n}`, key: f.key, reason: f.reason })),
        ...checkEtude(r.snapshot).map((b) => ({ what: b.key, key: b.key, reason: b.reason }))];
      const snap = { ...r.snapshot };
      for (const f of refused) if (f.key) delete snap[f.key];
      record.restore(snap);
      const n = Object.keys(snap).length;
      say(`restored ${n} setting${n === 1 ? "" : "s"} from the ${from}` +
        (refused.length ? `; skipped ${refused.map((f) => `${f.what} (${f.reason})`).join("; ")}` : ""));
    };
    byId("psCopyBlock").addEventListener("click", async () => {
      let text;
      try { text = etudeBlock(record.snapshot(), { app: ctx.door.id, v: ETUDE_V }); }
      catch (e) { say(String(e.message || e)); return; }
      try { await d.defaultView.navigator.clipboard.writeText(text); say("copied: an etude block, ready to paste into a note"); }
      catch (_) { say("clipboard unavailable: this browser would not let the page copy"); }
    });
    const paste = byId("psPasteBlock");
    paste.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData && e.clipboardData.getData("text")) || "";
      const r = readEtudeBlock(findEtudeBlock(text) ?? text);
      if (!r.lines.some((l) => l.kind === "pair")) { say("nothing to restore: no key: value lines in what was pasted"); return; }
      bring(r, "block");
    });
    /* COPY EMBED CODE (261120 — child 4 of the étude embed epic): the player of THIS étude, as a web page takes it — an
     * iframe of the door's declared player address and, beneath it, a plain link to the full app for a site that strips
     * iframes. The fragment is etude-link's writer's; whether the étude may travel is etude-link's linkable(), whose
     * reason is shown as it stands — this card never restates the rule (charter §6, §8). */
    const embed = ctx.door.embed, embedBtn = byId("psCopyEmbed"), embedWhy = byId("psEmbedWhy");
    if (!embed) embedBtn.hidden = true;
    else {
      const paintEmbed = () => {
        const ok = linkable(record.snapshot());
        embedBtn.disabled = ok !== true;
        embedWhy.textContent = ok === true ? "" : `No embed code: ${ok.reason}.`;
      };
      record.onChange(paintEmbed); paintEmbed();
      embedBtn.addEventListener("click", async () => {
        let frag;
        try { frag = toFragment(record.snapshot(), { app: ctx.door.id, v: ETUDE_V }); }
        catch (e) { say(String(e.message || e)); return; }
        const text = `<iframe src="${embed.player}${frag}" title="An étude on the neck, from At-Etudes" loading="lazy" ` +
          `style="display:block;width:100%;height:${embed.height}px;border:0"></iframe>\n` +
          `<p><a href="${embed.open}${frag}">Play this étude on At-Etudes</a></p>\n`;
        try { await d.defaultView.navigator.clipboard.writeText(text); say("copied: embed code, ready to paste into a web page's HTML"); }
        catch (_) { say("clipboard unavailable: this browser would not let the page copy"); }
      });
    }
    /* OPEN FROM A LINK (261120): a #etude= fragment is read by etude-link's reader — the same reader and refusals as a
     * pasted block (charter §8) — and goes home once every module has mounted and the clock has said what it is. The
     * fragment is then CLEARED, read or refused, so a reload opens the bench as left, never the link again over later
     * edits; it is never written anywhere (§8: nothing stored). A refused link says why, and the bench opens as usual. */
    const win = d.defaultView;
    if (new RegExp(`^#${LINK_KEY}=`).test(win.location.hash)) {
      const r = fromFragment(win.location.hash);
      try { win.history.replaceState(null, "", win.location.pathname + win.location.search); } catch (_) {}
      if (r.reason) say(`${r.reason}; the bench opened as usual`);
      else queueMicrotask(() => bring(r, "link"));
    }
    /* the trace re-derives on every config move — drift is a comparison,
     * never a flag */
    listen(d, CONFIG_CHANGED, (m) => {
      if (m && typeof m === "object") live = { ...live, ...m };
      paintTrace();
    });
  },
};

/* ---------------- load-time: every preset BUILDS (checked, not trusted) ---------------- */

{
  const fld = field({ key: "C", scale: "major" });
  for (const [label, p] of PRESETS) {
    const anchor = Math.max(...p.strings);
    const pos = positionOf({ field: fld, anchorString: anchor, startDegree: 0, nearFret: 5, strings: p.strings });
    const pool = materialIn(pos, p.strings, fld);
    let take;
    if (p.object === "scale") take = scaleTake(pool);
    else {
      const tones = diatonicTones(fld, 0, objectOffsets(p.object, p.tones));
      take = (p.take === "all")
        ? everyOccurrence(tones, pool, { n: p.notesPer })
        : oneOfEach(tones, pool, { n: p.notesPer, centre: pos.centre });
    }
    if (!take.notes || !take.notes.length)
      throw new Error(`presets: "${label}" does not build — a preset that seeds an empty take is a broken recipe`);
  }
}
