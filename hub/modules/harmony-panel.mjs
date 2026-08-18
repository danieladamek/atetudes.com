/* harmony-panel.mjs — the HARMONY strip, in the reference's form.
 *
 * Shell 2, under the parent's 2026-08-17 rescope: **the shipped
 * static/studies/triadetudes/study.html IS the layout specification.** This
 * panel reproduces its `#harmonyStrip` — a full-width labelled strip: Key and
 * Scale, the Harmony-mode segment, then Progression / Start on / the bass
 * select, with the explanatory hint underneath. The markup shapes, class
 * grammar (`striprow`, `grp`, `seg`, `row2 alignEnd`) and control ids are the
 * reference's own, so a future back-port meets familiar bones.
 *
 * It REPLACES the door's earlier chart-heading module — that one was not the
 * reference's form, and its floating popups overlapped the row beneath at
 * 1280. This panel has no popups at all: like the reference, every choice is
 * an ordinary labelled <select> or a segment row, so the overlap defect is
 * removed by removing the idiom that produced it. (The predecessor is not
 * named here on purpose: the artifact grep is comment-blind by design, and a
 * comment naming a retired module keeps its name in every built file.)
 *
 * WHERE THE CONTENT IS TETRAD-SHAPED the reference's FORM is kept and only the
 * content changes (each named in the item's report):
 *   - Progression lists the door's five derived cycles, not the study's seven;
 *   - the bass select offers none/root — the pedal, not triad extensions;
 *   - "Start bottom on" (R/3/5/7, the inversion seed) has no reference twin;
 * *   - Break down is rendered DISABLED: the reference's mode segment is part of
 *     the panel's form, but typed changes are a later shell child, and a
 *     control that pretends is worse than one that says "not yet".
 *
 * THIS MODULE OWNS THE CONFIGURATION (§4.2.3), as its predecessor did:
 * private state, announced as a plain value on the bus. Prune it and the
 * stage, timeline and audio keep their mounted defaults — smaller, not broken.
 *
 * Everything musical is DERIVED from the engine: keys spelled by chord.mjs,
 * the "Start on" romans by tetrad-sequence's own romanOf over the current
 * key and scale, cycles and sets from their engine tables. Nothing is typed
 * out here that the engine already knows.
 */
import { scaleNotes, SCALE_STEPS } from "../../engine/chord.mjs";
import { CYCLES, tetradOnDegree, romanOf } from "../../engine/tetrad-sequence.mjs";
import { CONFIG_CHANGED, announce, listen } from "../bus.mjs";

/* the twelve keys, kept exactly to the ones chord.mjs can spell */
const KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
  .filter((k) => { try { return scaleNotes(k, "major").length === 7; } catch { return false; } });

/* the reference's scale spellings, verbatim ("Harmonic minor", lowercase m) */
const SCALE_NAMES = { major: "Major", harm: "Harmonic minor", mel: "Melodic minor" };

/* the door's cycles in the reference's shelf order — 4ths first, as the study
 * lists cycle4, cycle6, cycle3 before the scalar rows */
const CYCLE_ORDER = ["fourths", "sixths", "thirds", "fifths", "scale"];

const BOTTOMS = ["R", "3", "5", "7"];

export const harmonyPanel = {
  id: "harmony-panel",
  layer: "surface",
  requires: { material: "tetrad" },
  mount_point: "strips",
  order: 10,
  controls: ["keySel", "scaleSel", "modeSeg", "progSel", "startSel", "bottomSel", "extSel"],

  markup: `
  <h2>Harmony</h2>
  <div class="striprow">
    <div class="grp">
      <div class="row2">
        <div class="hpTight"><label>Key</label><select id="keySel" data-control="keySel"></select></div>
        <div class="hpTight"><label>Scale</label>
          <select id="scaleSel" data-control="scaleSel">
            <option value="major">Major</option>
            <option value="harm">Harmonic minor</option>
            <option value="mel">Melodic minor</option>
          </select></div>
      </div>
    </div>
    <div class="grp">
      <label>Harmony mode</label>
      <div class="seg" id="modeSeg" data-control="modeSeg">
        <button data-mode="build" class="on">Build up</button>
        <button data-mode="break" disabled
          title="typed changes arrive with a later shell child">Break down</button>
      </div>
      <div class="hpNote">“Break down” is greyed until typed chord entry ships in a later shell child.</div>
    </div>
    <div class="grp hpWide">
      <div class="row2 alignEnd">
        <div class="hpTight"><label>Progression</label>
          <select id="progSel" data-control="progSel"></select></div>
        <div class="hpTight"><label>Start on</label>
          <select id="startSel" data-control="startSel"></select></div>
        <div class="hpTight"><label>Start bottom on</label>
          <select id="bottomSel" data-control="bottomSel"></select></div>
        <div class="hpTight"><label>Hear the tetrads over a bass</label>
          <select id="extSel" data-control="extSel">
            <option value="root">the root — a pedal under the voicing</option>
            <option value="none">none — the voicing alone</option>
          </select></div>
      </div>
      <div class="hint" id="hpRule"></div>
    </div>
  </div>`,

  /* the strip grammar (`striprow`, `grp`, `seg`) lived here while this was its
   * only user and was PROMOTED to the shell the moment Shape & Motion became
   * the second — the evidence rule, fourth application. `hp` tokens anchor
   * what is genuinely this panel's. */
  styles: `
.striprow .grp.hpWide{flex:1 1 420px;max-width:none}
.striprow .hpTight{flex:0 1 auto}
#hpRule{margin-top:8px}
.hpNote{font-size:11px;color:var(--gray);font-style:italic;margin-top:4px;max-width:220px}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const lock = ctx.door.lock || {};

    /* PRIVATE (§4.2.3). Listeners get its value from the bus, never a reference. */
    const cfg = {
      key: "C", scale: "major",
      cycle: Object.keys(CYCLES).includes(lock.cycle) ? lock.cycle : "fourths",
      bottom: 0, startDegree: 0, bass: "root",
    };

    const fill = (host, items, current) => {
      host.textContent = "";
      items.forEach(({ value, label }) => {
        const o = d.createElement("option");
        o.value = String(value); o.textContent = label;
        if (String(value) === String(current)) o.selected = true;
        host.appendChild(o);
      });
    };

    /* "Start on" is the reference's roman-numeral list, DERIVED for the
     * current key and scale — so vii° reads ø7 in major and the borrowed
     * qualities follow the scale, exactly as the study's own list does. */
    const fillStart = () => fill(byId("startSel"),
      [0, 1, 2, 3, 4, 5, 6].map((deg) => {
        const t = tetradOnDegree(cfg.key, cfg.scale, deg);
        return { value: deg, label: romanOf({ ...t, degree: deg }) };
      }), cfg.startDegree);

    const render = () => {
      fill(byId("keySel"), KEYS.map((k) => ({ value: k, label: k })), cfg.key);
      byId("scaleSel").value = cfg.scale;
      fill(byId("progSel"), CYCLE_ORDER.map((c) => ({ value: c, label: CYCLES[c].name })), cfg.cycle);
      fillStart();
      fill(byId("bottomSel"), BOTTOMS.map((b, i) => ({ value: i, label: b })), cfg.bottom);
      byId("extSel").value = cfg.bass;
      byId("hpRule").textContent = CYCLES[cfg.cycle].rule;
    };

    const push = () => { render(); announce(d, CONFIG_CHANGED, cfg); };

    /* A RESTORE (or any other owner's announcement) may carry this panel's own
     * fields — a saved entry does. Adopt them and re-render, WITHOUT
     * re-announcing: this panel is a view of the fact as well as its owner,
     * and echoing the message back would loop. Only the fields this panel owns
     * are read; the rest belong to Shape & Motion (§4.2.3). */
    const MINE = ["key", "scale", "cycle", "bottom", "startDegree", "bass"];
    listen(d, CONFIG_CHANGED, (m) => {
      if (!m || typeof m !== "object") return;
      let changed = false;
      for (const k of MINE) if (k in m && m[k] !== cfg[k]) { cfg[k] = m[k]; changed = true; }
      if (changed) render();
    });

    byId("keySel").addEventListener("change", (e) => { cfg.key = e.target.value; push(); });
    byId("scaleSel").addEventListener("change", (e) => { cfg.scale = e.target.value; push(); });
    byId("progSel").addEventListener("change", (e) => { cfg.cycle = e.target.value; push(); });
    byId("startSel").addEventListener("change", (e) => { cfg.startDegree = Number(e.target.value); push(); });
    byId("bottomSel").addEventListener("change", (e) => { cfg.bottom = Number(e.target.value); push(); });
    byId("extSel").addEventListener("change", (e) => { cfg.bass = e.target.value; push(); });

    push();
  },
};
