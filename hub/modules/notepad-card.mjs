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
 */
import { createNotepadSurface } from "../../engine/notepad-surface.mjs";

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
    const byId = ctx.byId;
    let mem = null;                       // this door is a proving ground, not
    const storage = {                     // a shipped app: in-memory storage
      load: () => mem,                    // keeps the gate free of a real
      save: (s) => { mem = s; },          // persistence dependency
    };
    createNotepadSurface({
      adapter: {
        app: "hub-door", version: 1,
        nouns: { item: "entry", apply: "Restore settings" },
        snapshot: () => ({ door: ctx.door.id }),
        apply: () => {},
        summarize: (data) => "door " + (data && data.door),
      },
      storage,
      els: { pad: byId("journalIn"), saveBtn: byId("saveEntry"),
        clearBtn: byId("clearPad"), confirmRoot: byId("clearConfirm"),
        confirmSave: byId("clearSave"), confirmDiscard: byId("clearDiscard"),
        confirmCancel: byId("clearCancel"), exportBtn: byId("exportLog"),
        importBtn: byId("importBtn"), importFile: byId("importFile"),
        msg: byId("saveMsg"), importMsg: byId("importMsg"),
        list: byId("histList"), count: byId("histCount"),
        storeNote: byId("storeNote"), controls: byId("journalControls"),
        handoff: byId("handoffNote") },
      file: { title: "hub door", name: () => "hub-door.atchart.md" },
      onChange: () => ctx.changed(),
    });
  },
};
