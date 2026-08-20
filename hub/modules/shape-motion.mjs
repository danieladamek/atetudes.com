/* shape-motion.mjs — the SHAPE & MOTION strip, the reference's form with the
 * tetrad's content.
 *
 * `#shapeStrip` in static/studies/triadetudes/study.html: three groups left to
 * right — *what shape · what figure · how it sounds* — with prose readout lines
 * below taking the full width. This is **the one sanctioned divergence**, and
 * "really only slightly" (Daniel): the panel's SHAPE is the reference's, and
 * only what four voices genuinely force is different. Each change, named:
 *
 *   String set        reference: E-B-G, B-G-D, G-D-A (three strings), listed
 *                     high → low. Here: the four-string groups in the SAME
 *                     dialect — E–B–G–D, B–G–D–A, G–D–A–E, highest set first
 *                     (Shell 4 settled the family on high → low). Same segment;
 *                     the label is derived, the stored setIndex is the fact.
 *   Voicing family    NEW group in the shape column: close / drop-2 / drop-3.
 *                     The triad app's "inversion" is a property of the voicing;
 *                     the tetrad app's is a FAMILY, so it needs a control. This
 *                     is the second consumer of `families` — the lock key the
 *                     resolver refused yesterday because nothing required it.
 *   Figure addresses  how a FIGURE is spelled: SLOTS 1-2-3-4 repeat a shape;
 *                     TONES R-3-5-7 follow the harmony through the shape (Daniel,
 *                     2026-08-18). Control id `figAddrSeg` — renamed off the
 *                     reference's `motionSeg` (P3, 260818.x): the reference's
 *                     "Motion follows: the shape / the tones" is how VOICE-LEADING
 *                     MOTION is derived, a DIFFERENT concept, and it is NOT
 *                     OFFERED here. Borrowing the id for figure-addressing was the
 *                     accretion the truth-table item found; the id now names its
 *                     own idea so no later reader assumes Motion-follows exists.
 *   Figure            the reference's picker + field, LIVE, with arpErr — the
 *                     error surface the audit found missing. The field is the
 *                     truth; the picker writes into it. Consumers parse the
 *                     text through engine/figure.mjs; nothing is pre-digested.
 *   Placement         LIVE: Grip / Free / Line are isolation.mjs's own named
 *                     placements, unchanged at four voices; Line is disabled
 *                     because it needs a lineVoicingFor the pass does not build.
 *   Playback          LIVE: Block / Arpeggiated / Both, exactly the reference's.
 *   Guide tones only  NEW toggle: dim R and 5, leave 3 and 7 full — the reading
 *                     light for tone-figures. A view, not a mode.
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
import { parseFigure, describeFigure, SLOT_ORDER, TONE_ORDER } from "../../engine/figure.mjs";
import { CONFIG_CHANGED, announce, listen } from "../bus.mjs";

const FAMILY_LABEL = { close: "Close", drop2: "Drop-2", drop3: "Drop-3" };
const PLACE_LABEL = { grip: "Grip", line: "Line", free: "Free" };

export const shapeMotion = {
  id: "shape-motion",
  layer: "surface",
  requires: { material: "tetrad" },
  mount_point: "strips",
  order: 12,
  controls: ["setSeg", "famSeg", "figAddrSeg", "figSel", "arpIn", "arpErr", "placeSeg", "playbackSeg", "rootsChk", "guideChk"],

  markup: `
  <h2>Shape &amp; Motion</h2>
  <div class="striprow">
    <div class="grp">
      <label>String set (tetrads live here, high → low)</label>
      <div class="seg" id="setSeg" data-control="setSeg"></div>
      <label>Voicing family</label>
      <div class="seg" id="famSeg" data-control="famSeg"></div>
    </div>
    <div class="grp smFig">
      <div class="row2 alignEnd">
        <div class="smTight"><label>Figure addresses</label>
          <div class="seg" id="figAddrSeg" data-control="figAddrSeg">
            <button data-mm="slots" class="on" title="1-2-3-4, low → high: a figure repeats a SHAPE">slots</button>
            <button data-mm="tones" title="R-3-5-7, by role: a figure follows the HARMONY through the shape">tones</button>
          </div></div>
        <div class="smTight"><label>Figure</label>
          <select id="figSel" data-control="figSel"></select></div>
      </div>
      <label id="arpLabel">Figure (slots 1–4 low → high)</label>
      <input type="text" id="arpIn" data-control="arpIn" spellcheck="false" placeholder="e.g. 1-2-3-4">
      <span id="arpErr" data-control="arpErr" class="smErr"></span>
    </div>
    <div class="grp">
      <div class="row2">
        <div class="smTight"><label>Placement</label>
          <div class="seg" id="placeSeg" data-control="placeSeg"></div></div>
        <div class="smTight"><label>Playback</label>
          <div class="seg" id="playbackSeg" data-control="playbackSeg">
            <button data-pb="block" class="on" title="the harmony, strummed">Block</button>
            <button data-pb="arpeggiated" title="the figure as a line — the figure IS the rhythm">Arpeggiated</button>
            <button data-pb="both" title="the line over a short strummed harmony">Both</button>
          </div></div>
      </div>
      <label class="chk"><input type="checkbox" id="rootsChk" data-control="rootsChk"> Show root notes on lower strings</label>
      <label class="chk" title="the reading light for tone-figures: dim R and 5, leave 3 and 7 full">
        <input type="checkbox" id="guideChk" data-control="guideChk"> Guide tones only (dim R and 5)</label>
    </div>
  </div>
  <div class="hint" id="smHint"></div>
  <div class="smNote" id="smWhy"></div>`,

  /* `sm` tokens anchor every rule; the strip grammar is the harmony panel's
   * until the resolver promotes it (this module is that second user). */
  styles: `
.smErr{color:var(--red);font-size:11.5px;display:block;min-height:1.2em}
.striprow .grp.smFig{flex:1 1 320px;max-width:560px}
.striprow .smTight{flex:0 1 auto}
.striprow #arpIn{width:100%;box-sizing:border-box}
#smHint{margin-top:8px}
.smNote{font-size:11px;color:var(--gray);font-style:italic;margin-top:3px}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const lock = ctx.door.lock || {};
    const allowed = Array.isArray(lock.families) && lock.families.length
      ? lock.families.filter((f) => f in FAMILIES) : Object.keys(FAMILIES);

    /* PRIVATE (§4.2.3) — the shape half of the configuration */
    // drop-2 is the reference texture (the frozen study is entirely drop-2), so
    // it is the default whenever the door allows it
    const cfg = { setIndex: 0, families: [allowed.includes("drop2") ? "drop2" : allowed[0]],
      /* GRIP, as the reference defaults (`placement:"grip"`). The door had said
       * "free" — under which isolation.mjs releases the anchor (pivotW: 0), so
       * the box shipped by the zone item was decorative on first run. Third
       * instance of the same pattern: where the reference has an answer, take
       * it. The ENGINE's own argument default stays "free" — that is a library
       * default, and the oracle corpus and the default-zone pin were measured
       * under it; moving it would move pinned output. */
      placement: "grip", roots: false,
      /* THE FIGURE CHAIN. `address` is the vocabulary toggle (slots | tones);
       * `figure` is the user's text, verbatim — parsed by every consumer through
       * engine/figure.mjs, never pre-digested here, so the pass stays the only
       * derived thing and the text stays the stored fact. `playback` is the
       * reference's segment. `guide` is the guide-tone reduction view. */
      address: "slots", figure: "", playback: "block", guide: false,
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
      /* display HIGHEST set first (the reference lists high → low), but each
       * button's value stays the real STRING_SETS index — the stored identity a
       * saved étude restores by. Presentation reversed; the fact is not. */
      seg(byId("setSeg"), STRING_SETS.map((s, i) => ({ value: i, label: s.label })).reverse(),
        cfg.setIndex, (v) => { cfg.setIndex = v; push(); });
      seg(byId("famSeg"), allowed.map((f) => ({ value: f, label: FAMILY_LABEL[f] || f })),
        cfg.families[0], (v) => { cfg.families = [v]; push(); });
      seg(byId("placeSeg"), Object.keys(PLACEMENTS).map((p) => ({ value: p, label: PLACE_LABEL[p] || p,
        title: p === "grip" ? "one note per string, anchored to the zone"
             : p === "free" ? "the grip chosen by smoothest voice-leading, anchor released"
             : "free placement along the set — needs the line voicer, not wired yet" })),
        cfg.placement, (v) => { cfg.placement = v; push(); }, (v) => v === "line");
      byId("rootsChk").checked = cfg.roots;
      byId("guideChk").checked = cfg.guide;
      // the address toggle
      for (const b of byId("figAddrSeg").querySelectorAll("button"))
        b.classList.toggle("on", b.dataset.mm === cfg.address);
      byId("arpLabel").textContent = cfg.address === "tones"
        ? "Figure (tones R 3 5 7; approaches in parens: (-1,+2)3)"
        : "Figure (slots 1–4 low → high)";
      byId("arpIn").placeholder = cfg.address === "tones" ? "e.g. R-3-7-5 or (-1,+2)3 7" : "e.g. 1-2-3-4";
      // the picker: presets derived from the address's stated letter order —
      // v0.7.7 gave the reference a picker because raw figure syntax was
      // hostile; the door keeps both, the picker writing into the field
      const letters = cfg.address === "tones" ? TONE_ORDER : SLOT_ORDER;
      const presets = [
        ["", "— block —"],
        [letters.join("-"), "up " + letters.join("-")],
        [[...letters].reverse().join("-"), "down " + [...letters].reverse().join("-")],
        [letters[0] + "-" + letters[2] + "-" + letters[1] + "-" + letters[3], "broken " + letters[0] + "-" + letters[2] + "-" + letters[1] + "-" + letters[3]],
      ];
      if (cfg.address === "tones") presets.push(["3-7-3-7", "guide tones 3-7-3-7"], ["(-1,+2)3 7", "enclose the 3rd, land the 7th"]);
      const sel = byId("figSel"); sel.textContent = "";
      for (const [v, label] of presets) {
        const o = d.createElement("option"); o.value = v; o.textContent = label;
        if (v === cfg.figure) o.selected = true;
        sel.appendChild(o);
      }
      if (![...sel.options].some((o) => o.value === cfg.figure)) {
        const o = d.createElement("option"); o.value = cfg.figure; o.textContent = "custom: " + cfg.figure; o.selected = true; sel.appendChild(o);
      }
      if (byId("arpIn").value !== cfg.figure) byId("arpIn").value = cfg.figure;
      // THE ERROR SURFACE (audit A3): a bad figure says why, loudly, and the
      // segment reflects that no figure is in force
      const parsed = parseFigure(cfg.figure, cfg.address);
      byId("arpErr").textContent = parsed.err || "";
      const hasFig = !!parsed.pattern;
      for (const b of byId("playbackSeg").querySelectorAll("button")) {
        b.classList.toggle("on", b.dataset.pb === cfg.playback);
        // P1 (cheap variant): the figure sounds only when Playback ≠ Block AND a
        // figure parses, so Arpeggiated and Both have nothing to sound without
        // one — "Block with a figure" and "Arpeggiated with no figure" reach the
        // identical silent chord. Disable them until a figure parses; enabling is
        // LIVE (render runs on every change). Playback stays three real buttons —
        // not collapsed, not renamed; this only gates when the axis is inert.
        b.disabled = b.dataset.pb !== "block" && !hasFig;
      }

      /* THE PANEL NARRATES ITSELF (this item: state the rules in the hints, so
       * the page explains itself). The one rule that catches everyone — read off
       * figure.mjs:161-162 — is that the figure sounds ONLY when Playback ≠ Block
       * AND a figure parses; on Block, or with no figure, `order` is null and the
       * plain block chord plays. Two different control states therefore reach the
       * SAME silent result, and the panel used to say neither. Every clause below
       * is stated only when it is true, so an inert control announces itself. */
      const figWords = hasFig
        ? describeFigure(parsed.pattern, cfg.address) + (parsed.source === "motion" ? "" : (cfg.address === "tones" ? " by role" : " by slot"))
        : "";
      const parts = [`${FAMILY_LABEL[cfg.families[0]]} voicings on ${STRING_SETS[cfg.setIndex].label}`];
      parts.push(`${PLACE_LABEL[cfg.placement]}: ${cfg.placement === "grip"
        ? "one note per string, anchored to the zone"
        : "the grip chosen by smoothest voice-leading, anchor released"}`);
      // Placement = Free makes the stage's Box inert (isolation.mjs pivotW:0) —
      // the same dependency the Box hint states, said from this side too
      if (cfg.placement === "free")
        parts.push("Free releases the zone, so the Box on the neck won't pull — choose Grip to practise inside it");
      // the sounding rule, and the two ways to reach the silent block chord
      if (cfg.playback === "block")
        parts.push(hasFig
          ? "Playback is Block, so the figure is typed but not sounding — choose Arpeggiated or Both to hear it"
          : "Block chords");
      else
        parts.push(hasFig
          ? `${cfg.playback}: ${figWords}`
          : `${cfg.playback} has no figure to sound — Block chords until one parses`);
      // the address toggle only bites while a figure is actually sounding
      if (hasFig && cfg.playback !== "block")
        parts.push(cfg.address === "tones" ? "spelled by tone role" : "spelled by slot");
      if (cfg.guide) parts.push("guide tones lit — a neck view that dims R and 5");
      byId("smHint").textContent = parts.join(" · ");

      // every DISABLED control states why, in the panel, not only in a tooltip:
      // Arpeggiated/Both are gated on a figure (P1), and Line placement needs a
      // voicer the pass does not build. Each reason shows only while it applies.
      const why = [];
      if (!hasFig) why.push("Arpeggiated and Both need a figure — type one to enable them.");
      why.push("“Line” placement is greyed because it needs the line voicer the pass doesn’t build yet.");
      byId("smWhy").textContent = why.join(" ");
    };
    const push = () => { render(); announce(d, CONFIG_CHANGED, cfg); };

    /* adopt this panel's own fields from any announcement (a restore carries
     * them), without re-announcing — see the harmony panel's note */
    const MINE = ["setIndex", "families", "placement", "roots", "zone", "address", "figure", "playback", "guide"];
    listen(d, CONFIG_CHANGED, (m) => {
      if (!m || typeof m !== "object") return;
      let changed = false;
      for (const k of MINE) if (k in m && JSON.stringify(m[k]) !== JSON.stringify(cfg[k])) {
        cfg[k] = Array.isArray(m[k]) ? [...m[k]] : m[k]; changed = true;
      }
      if (changed) render();
    });

    byId("rootsChk").addEventListener("change", (e) => { cfg.roots = e.target.checked; push(); });
    byId("guideChk").addEventListener("change", (e) => { cfg.guide = e.target.checked; push(); });
    for (const b of byId("figAddrSeg").querySelectorAll("button"))
      b.addEventListener("click", () => { cfg.address = b.dataset.mm; push(); });
    for (const b of byId("playbackSeg").querySelectorAll("button"))
      b.addEventListener("click", () => { cfg.playback = b.dataset.pb; push(); });
    // the field is the truth; the picker writes into it. A bad figure is kept
    // in the field (so the user can fix it) and refused loudly by arpErr; the
    // pass falls back to block until it parses.
    byId("arpIn").addEventListener("input", (e) => { cfg.figure = e.target.value; push(); });
    byId("figSel").addEventListener("change", (e) => { cfg.figure = e.target.value; push(); });
    push();
  },
};
