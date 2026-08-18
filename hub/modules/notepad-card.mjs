/* notepad-card.mjs — THE GATE CASE: the smallest real module that contributes
 * script, markup AND styles, and the one a door must be able to prune whole.
 *
 * Behaviour is engine/notepad-surface.mjs, untouched — it is byte-pinned into
 * two shipped studies, so this module WRAPS it rather than changing it. What
 * moves here is what the shipped study holds at page level and therefore could
 * never prune: the notepad's markup, and every style rule that only the
 * notepad's markup can match (`#journalIn`, `.jcol`, `.hist …`, `.palette …`,
 * the two-column media query).
 *
 * Its transitive reach is the real thing too: notepad-surface pulls notepad,
 * markdown, palette, structures, atchart and chord. A door that locks the
 * notepad out therefore drops six engine modules as well as this card — which
 * is what makes the pruning worth having rather than cosmetic.
 *
 * PERSISTENCE (audit 260818 §A1) — the log stores under the DOOR'S OWN KEY,
 * `<door-id>.v1.log`, never the reference study's. Shared
 * SCHEMA, separate NAMESPACE: the roadmap's merged-history page is then a
 * reader over N keys, not a migration. And under `file://` every page shares
 * ONE origin, so a door that reused the reference's key would silently merge
 * with — or clobber — a study opened from the same disk. Charter: browser
 * storage is a per-app cache, never a transport; the file stays the handoff.
 *
 * THE ENTRY IS NOT BLIND (§B5): its payload is the door's whole announced
 * configuration, and the surface renders `adapter.summarize(data)` on every
 * row — key · scale · cycle · start bottom · set · family · bpm — so Restore
 * says what it will restore. Restore ANNOUNCES the saved config on the bus;
 * every card that owns a piece of it re-renders from the message (§4.2.3).
 * This card reaches into nothing.
 */
import { createNotepadSurface } from "../../engine/notepad-surface.mjs";
import { fromTriadetudesV1 } from "../../engine/notepad.mjs";
import { CONFIG_CHANGED, CLOCK, CLOCK_STATE, listen, announce } from "../bus.mjs";

export const notepadCard = {
  id: "notepad-card",
  layer: "surface",
  requires: { notepad: true },
  mount_point: "boards",
  /* the notebook is where a take is written DOWN, so it reads last on any door
   * that also carries material boards (build.mjs `order`, default 0) */
  order: 90,
  controls: ["journalIn", "saveEntry", "clearPad", "exportLog", "importBtn",
    "histList", "histCount", "clearConfirm", "clearSave", "clearDiscard",
    "clearCancel", "storeNote", "handoffNote"],

  markup: `
  <div class="bh"><span>Practice log — <span id="histCount" data-control="histCount">0</span> saved</span>
    <span id="storeNote" data-control="storeNote" class="storenote"></span></div>
  <div class="nb2j">
    <div class="jcol" id="logCol">
      <div id="histList" data-control="histList"></div>
      <span id="importMsg" class="hint"></span>
    </div>
    <div id="dragBar" title="drag to resize"></div>
    <div class="jcol" id="noteCol">
      <div class="colhd">Note — what just happened</div>
      <textarea id="journalIn" data-control="journalIn"
        placeholder="The note for this take — plain prose (it's markdown underneath)."></textarea>
      <div class="transport journalcontrols" id="journalControls">
        <button id="saveEntry" data-control="saveEntry" class="primary"></button>
        <button id="clearPad" data-control="clearPad"></button>
        <button id="exportLog" data-control="exportLog"></button>
        <button id="importBtn" data-control="importBtn"></button>
        <input type="file" id="importFile" accept=".md,.json,text/markdown,application/json">
        <span id="saveMsg" class="hint nomargin"></span>
      </div>
      <div class="transport journalconfirm" id="clearConfirm" data-control="clearConfirm">
        <span class="hint nomargin">that note is filed nowhere —</span>
        <button id="clearSave" data-control="clearSave" class="primary">Save and clear</button>
        <button id="clearDiscard" data-control="clearDiscard">Discard</button>
        <button id="clearCancel" data-control="clearCancel">keep writing</button>
      </div>
      <div class="hint" id="handoffNote" data-control="handoffNote"></div>
    </div>
  </div>`,

  /* Every rule below names a token only this module ships. In the shipped
   * study these same rules sit in the page's one stylesheet, where no lock
   * could reach them — the move IS the mechanism. */
  styles: `
.nb2j{display:flex;align-items:stretch}
.jcol{min-width:0;position:relative}
#logCol{flex:0 1 auto;width:50%;padding-right:12px}
#noteCol{flex:1 1 0;padding-left:12px}
#dragBar{flex:0 0 8px;cursor:col-resize;border-left:2px solid var(--line);
  border-radius:2px;touch-action:none}
#dragBar:hover{border-left-color:var(--ink)}
.colhd{font-size:12px;letter-spacing:.06em;text-transform:uppercase;
  color:var(--gray);font-weight:bold;margin:0 0 8px}
#journalIn{font:inherit;font-size:13px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;width:100%;resize:vertical;color:var(--ink);min-height:210px}
#importFile{display:none}
.journalcontrols{margin-top:10px}
.journalconfirm{display:none;margin-top:6px}
.nomargin{margin:0}
.storenote{text-transform:none;letter-spacing:0;font-weight:normal}
.hist{border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:12.5px}
.hist .hd{display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.hist .when{color:var(--gray);font-size:11.5px;white-space:nowrap}
.hist .note{color:var(--ink);margin:2px 0;white-space:pre-wrap}
.hist .acts{display:flex;gap:6px;margin-top:6px}
.hist .acts button{font:inherit;font-size:11px;padding:2px 9px;border:1px solid var(--line);
  border-radius:6px;background:#fff;cursor:pointer;color:var(--ink)}
.hist .acts button.danger{color:var(--red)}
.hist .note.md{white-space:normal}
.hist .note.md p{margin:4px 0}
.hist .note.md pre{background:var(--ground);border-radius:6px;padding:5px 7px;
  overflow:auto;font-size:11.5px}
.hist .note.md code{font-family:ui-monospace,monospace;font-size:11.5px}
.palette{flex-basis:100%;display:flex;flex-direction:column;gap:6px;margin-top:6px;
  border:1px solid var(--line);border-radius:8px;padding:8px 10px;background:var(--ground)}
.palette .prow{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.palette .plab{color:var(--gray);font-size:11px;min-width:62px;text-transform:uppercase;
  letter-spacing:.4px}
.palette select{font:inherit;font-size:13px;padding:4px 6px;border:1px solid var(--line);
  border-radius:6px;background:var(--card);color:var(--ink);width:auto}
.palette button.pbtn{font:inherit;font-size:13px;padding:4px 10px;border:1px solid var(--line);
  border-radius:6px;background:var(--card);color:var(--ink);cursor:pointer}
.palette button.pbtn:hover{border-color:var(--gray)}
@media (max-width:719px){
  .nb2j{flex-direction:column}
  #dragBar{display:none}
  #logCol{width:auto;padding-right:0;order:2}
  #noteCol{padding-left:0;order:1;margin-bottom:12px}
}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const doorId = ctx.door.id;
    const KEY = doorId + ".v1.log";          // the door's OWN namespace, derived

    /* the last configuration heard on the bus, merged across its owners — the
     * harmony panel, Shape & Motion, and the clock's tempo. This is what an
     * entry snapshots. Nothing here is read from another module. */
    let cfg = {};
    let bpm = null;
    listen(d, CONFIG_CHANGED, (m) => { if (m) cfg = { ...cfg, ...m }; });
    listen(d, CLOCK_STATE, (m) => { if (m && typeof m.bpm === "number") bpm = m.bpm; });

    const view = d.defaultView;
    const storage = {
      load: () => view.localStorage.getItem(KEY),          // MAY THROW — the
      save: (str) => view.localStorage.setItem(KEY, str),   // surface handles denial
    };

    /* the one-line summary, in the reference's register: every fact the door
     * can restore, and only those. `family` and `set` are Shape & Motion's
     * words; the rest are Harmony's. */
    const FAMILY = { close: "close", drop2: "drop-2", drop3: "drop-3" };
    const SCALE = { major: "major", harm: "harmonic minor", mel: "melodic minor" };
    const CYCLE = { scale: "Scaler", thirds: "Cycling 3rds", fourths: "Cycling 4ths",
      fifths: "Cycling 5ths", sixths: "Cycling 6ths" };
    const SETS = ["E–A–D–G", "A–D–G–B", "D–G–B–e"];
    const summarize = (c) => {
      if (!c || typeof c !== "object") return "no configuration attached";
      const parts = [];
      if (c.key) parts.push(c.key + (c.scale ? " " + (SCALE[c.scale] || c.scale) : ""));
      if (c.cycle) parts.push(CYCLE[c.cycle] || c.cycle);
      if (typeof c.bottom === "number") parts.push("bottom " + ["R", "3", "5", "7"][c.bottom]);
      if (typeof c.setIndex === "number") parts.push("set " + (SETS[c.setIndex] || c.setIndex));
      if (Array.isArray(c.families) && c.families.length) parts.push(FAMILY[c.families[0]] || c.families[0]);
      if (c.placement && c.placement !== "free") parts.push(c.placement);
      if (c.zone && Array.isArray(c.zone.frets) && c.zone.frets.length)
        parts.push("zone " + Math.min(...c.zone.frets) + "–" + Math.max(...c.zone.frets));
      if (typeof c.bpm === "number") parts.push(c.bpm + " bpm");
      return parts.join(" · ") || "no configuration attached";
    };

    createNotepadSurface({
      adapter: {
        app: doorId, version: 1,
        nouns: { item: "entry", apply: "Restore étude" },
        snapshot: () => ({ ...cfg, ...(bpm !== null ? { bpm } : {}) }),
        /* RESTORE = ANNOUNCE. The owners of each piece of config re-render from
         * the message; the tempo goes to the clock owner as a request. */
        apply: (data) => {
          if (!data || typeof data !== "object") return;
          const { bpm: savedBpm, ...rest } = data;
          announce(d, CONFIG_CHANGED, rest);
          if (typeof savedBpm === "number") announce(d, CLOCK, { bpm: savedBpm });
        },
        summarize,
      },
      storage,
      /* the shared schema is a fact: a Triadetudes v1 log imports through the
       * engine's own migration. Nothing to migrate on first run here — this
       * door has no v1 predecessor — but the path is wired, and the gate
       * asserts one import through it. */
      migrate: () => null,
      importFallback: (text) => {
        try {
          const j = JSON.parse(text);
          const log = Array.isArray(j) ? j : (j && Array.isArray(j.entries) ? j.entries : null);
          if (!log || !log.length || !log.some((e) => e && (e.cfg !== undefined || e.intention !== undefined))) return null;
          return fromTriadetudesV1(log).entries;
        } catch { return null; }
      },
      els: { pad: byId("journalIn"), saveBtn: byId("saveEntry"),
        clearBtn: byId("clearPad"), confirmRoot: byId("clearConfirm"),
        confirmSave: byId("clearSave"), confirmDiscard: byId("clearDiscard"),
        confirmCancel: byId("clearCancel"), exportBtn: byId("exportLog"),
        importBtn: byId("importBtn"), importFile: byId("importFile"),
        msg: byId("saveMsg"), importMsg: byId("importMsg"),
        list: byId("histList"), count: byId("histCount"),
        storeNote: byId("storeNote"), controls: byId("journalControls"),
        handoff: byId("handoffNote") },
      file: { title: doorId + " journal",
        name: () => doorId + "-journal-" + new Date().toISOString().slice(0, 10) + ".atchart.md" },
      onChange: () => ctx.changed(),
    });
  },
};
