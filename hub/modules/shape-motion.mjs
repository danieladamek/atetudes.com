/* shape-motion.mjs — the SHAPE & MOTION strip, the reference's form with the
 * tetrad's content.
 *
 * `#shapeStrip` in static/studies/triadetudes/study.html: three groups left to
 * right — *what shape · what figure · how it sounds* — with prose readout lines
 * below taking the full width. This is **the one sanctioned divergence**, and
 * "really only slightly" (Daniel): the panel's SHAPE is the reference's, and
 * only what four voices genuinely force is different. Each change, named:
 *
 *   String set        reference: E-B-G, B-G-D, G-D-A, D-A-E (three strings)
 *                     here: E–A–D–G, A–D–G–B, D–G–B–e (four). Same segment.
 *   Voicing family    NEW group in the shape column: close / drop-2 / drop-3.
 *                     The triad app's "inversion" is a property of the voicing;
 *                     the tetrad app's is a FAMILY, so it needs a control. This
 *                     is the second consumer of `families` — the lock key the
 *                     resolver refused yesterday because nothing required it.
 *   Motion follows    the reference's segment, RENDERED DISABLED: "the tones"
 *                     is the motion grammar's business and the sketch is not
 *                     ported yet. The form is kept; pretending is not.
 *   Figure            the reference's select + pattern field, DISABLED with the
 *                     same honesty — the drill layer exists (engine/drill.mjs)
 *                     but no door consumer wires it yet.
 *   Placement         LIVE: Grip / Free / Line are isolation.mjs's own named
 *                     placements, unchanged at four voices; Line is disabled
 *                     because it needs a lineVoicingFor the pass does not build.
 *   Playback          the reference's segment, disabled — arpeggiation is the
 *                     figure's business, above.
 *   Root notes        the reference's toggle, live: rings the chord root on the
 *                     strings below the set, exactly as the study draws them.
 *
 * THIS MODULE OWNS the shape configuration and announces it as a plain value
 * (§4.2.3); the harmony panel owns the harmony configuration the same way.
 * Both announce CONFIG_CHANGED; listeners merge, so a door that prunes either
 * keeps that half's defaults — smaller, not broken.
 */
import { STRING_SETS } from "../../engine/tetrad-sequence.mjs";
import { FAMILIES } from "../../engine/tetrad-voicings.mjs";
import { PLACEMENTS } from "../../engine/isolation.mjs";
import { CONFIG_CHANGED, announce, listen } from "../bus.mjs";

const FAMILY_LABEL = { close: "Close", drop2: "Drop-2", drop3: "Drop-3" };
const PLACE_LABEL = { grip: "Grip", line: "Line", free: "Free" };

export const shapeMotion = {
  id: "shape-motion",
  layer: "surface",
  requires: { material: "tetrad" },
  mount_point: "strips",
  order: 12,
  controls: ["setSeg", "famSeg", "motionSeg", "figSel", "arpIn", "placeSeg", "playbackSeg", "rootsChk"],

  markup: `
  <h2>Shape &amp; Motion</h2>
  <div class="striprow">
    <div class="grp">
      <label>String set (tetrads live here, low → high)</label>
      <div class="seg" id="setSeg" data-control="setSeg"></div>
      <label>Voicing family</label>
      <div class="seg" id="famSeg" data-control="famSeg"></div>
    </div>
    <div class="grp smFig">
      <div class="row2 alignEnd">
        <div class="smTight"><label>Motion follows</label>
          <div class="seg" id="motionSeg" data-control="motionSeg">
            <button data-mm="shape" class="on" disabled title="the motion grammar arrives with a later shell child">the shape</button>
            <button data-mm="tones" disabled title="the motion grammar arrives with a later shell child">the tones</button>
          </div></div>
        <div class="smTight"><label>Figure</label>
          <select id="figSel" data-control="figSel" disabled title="the drill layer's figures arrive with a later shell child">
            <option>Block</option></select></div>
      </div>
      <label>Figure (slots low → high; approaches in parens)</label>
      <input type="text" id="arpIn" data-control="arpIn" spellcheck="false" placeholder="e.g. 1-2-3-4" disabled
        title="the drill layer's pattern field arrives with a later shell child">
    </div>
    <div class="grp">
      <div class="row2">
        <div class="smTight"><label>Placement</label>
          <div class="seg" id="placeSeg" data-control="placeSeg"></div></div>
        <div class="smTight"><label>Playback</label>
          <div class="seg" id="playbackSeg" data-control="playbackSeg">
            <button data-pb="block" class="on" disabled title="arpeggiation arrives with the figure">Block</button>
            <button data-pb="arpeggiated" disabled title="arpeggiation arrives with the figure">Arpeggiated</button>
            <button data-pb="both" disabled title="arpeggiation arrives with the figure">Both</button>
          </div></div>
      </div>
      <label class="chk"><input type="checkbox" id="rootsChk" data-control="rootsChk"> Show root notes on lower strings</label>
    </div>
  </div>
  <div class="hint" id="smHint"></div>`,

  /* `sm` tokens anchor every rule; the strip grammar is the harmony panel's
   * until the resolver promotes it (this module is that second user). */
  styles: `
.striprow .grp.smFig{flex:1 1 320px;max-width:560px}
.striprow .smTight{flex:0 1 auto}
.striprow #arpIn{width:100%;box-sizing:border-box}
#smHint{margin-top:8px}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const lock = ctx.door.lock || {};
    const allowed = Array.isArray(lock.families) && lock.families.length
      ? lock.families.filter((f) => f in FAMILIES) : Object.keys(FAMILIES);

    /* PRIVATE (§4.2.3) — the shape half of the configuration */
    // drop-2 is the reference texture (the frozen study is entirely drop-2), so
    // it is the default whenever the door allows it
    const cfg = { setIndex: 0, families: [allowed.includes("drop2") ? "drop2" : allowed[0]],
      placement: "free", roots: false,
      /* THE ZONE (audit 260818 §A2) is a SHAPE fact — where on the neck — so it
       * is owned here. `null` means "the pass's own default"; the stage's Box
       * mode announces a value the moment the user moves it, and this owner
       * adopts it like any other field. */
      zone: null };

    const seg = (host, items, current, pick, disabled = () => false) => {
      host.textContent = "";
      items.forEach(({ value, label, title }) => {
        const b = d.createElement("button");
        b.textContent = label;
        if (title) b.title = title;
        if (value === current) b.className = "on";
        if (disabled(value)) b.disabled = true;
        b.addEventListener("click", () => pick(value));
        host.appendChild(b);
      });
    };

    const render = () => {
      seg(byId("setSeg"), STRING_SETS.map((s, i) => ({ value: i, label: s.label })),
        cfg.setIndex, (v) => { cfg.setIndex = v; push(); });
      seg(byId("famSeg"), allowed.map((f) => ({ value: f, label: FAMILY_LABEL[f] || f })),
        cfg.families[0], (v) => { cfg.families = [v]; push(); });
      seg(byId("placeSeg"), Object.keys(PLACEMENTS).map((p) => ({ value: p, label: PLACE_LABEL[p] || p,
        title: p === "grip" ? "one note per string, anchored to the zone"
             : p === "free" ? "the grip chosen by smoothest voice-leading, anchor released"
             : "free placement along the set — needs the line voicer, not wired yet" })),
        cfg.placement, (v) => { cfg.placement = v; push(); }, (v) => v === "line");
      byId("rootsChk").checked = cfg.roots;
      byId("smHint").textContent =
        `${FAMILY_LABEL[cfg.families[0]]} voicings on ${STRING_SETS[cfg.setIndex].label} · ` +
        `${PLACE_LABEL[cfg.placement]}: ${cfg.placement === "grip"
          ? "one note per string, anchored to the zone"
          : "the grip chosen by smoothest voice-leading, anchor released"}.`;
    };
    const push = () => { render(); announce(d, CONFIG_CHANGED, cfg); };

    /* adopt this panel's own fields from any announcement (a restore carries
     * them), without re-announcing — see the harmony panel's note */
    const MINE = ["setIndex", "families", "placement", "roots", "zone"];
    listen(d, CONFIG_CHANGED, (m) => {
      if (!m || typeof m !== "object") return;
      let changed = false;
      for (const k of MINE) if (k in m && JSON.stringify(m[k]) !== JSON.stringify(cfg[k])) {
        cfg[k] = Array.isArray(m[k]) ? [...m[k]] : m[k]; changed = true;
      }
      if (changed) render();
    });

    byId("rootsChk").addEventListener("change", (e) => { cfg.roots = e.target.checked; push(); });
    push();
  },
};
