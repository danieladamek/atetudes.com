/* shape-motion.mjs — the SHAPE & MOTION strip, the reference's form with the
 * tetrad's content.
 *
 * `#shapeStrip` in static/studies/triadetudes/study.html: three groups left to
 * right — *what shape · what figure · how it sounds* — with prose readout lines
 * below taking the full width. This is **the one sanctioned divergence**, and
 * "really only slightly" (Daniel): the panel's SHAPE is the reference's, and
 * only what four voices genuinely force is different. Each change, named:
 *
 *   String set        reference: E–B–G, B–G–D, G–D–A (three strings), listed
 *                     high → low. Here: the four-string groups in the SAME
 *                     dialect — E–B–G–D, B–G–D–A, G–D–A–E, highest set first
 *                     (Shell 4 settled the family on high → low). Same segment;
 *                     the label is derived, the stored setIndex is the fact.
 *   Voicing family    NEW group in the shape column: close / drop-2 / drop-3.
 *                     The triad app's "inversion" is a property of the voicing;
 *                     the tetrad app's is a FAMILY, so it needs a control. This
 *                     is the second consumer of `families` — the lock key the
 *                     resolver refused yesterday because nothing required it.
 *   The figure is     how a FIGURE is spelled (ONE ADDRESS FAMILY, 261002 — multetudes'):
 *                     PATTERN = real string numbers, the instrument's own address
 *                     (6-5-4-3 on the low set; slots 1-2-3-4 retired to a saved-étude alias);
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
import { parseFigure, describeFigure, TONE_ORDER, legacySlotsToPattern, shiftFigure } from "../../engine/figure.mjs";
import { lowToHigh } from "../../engine/string-sets.mjs";
import { CONFIG_CHANGED, announce, listen } from "../bus.mjs";
import { playbackWord } from "../../engine/figure.mjs";

const FAMILY_LABEL = { close: "Close", drop2: "Drop-2", drop3: "Drop-3" };
const PLACE_LABEL = { grip: "Grip", line: "Line", free: "Free" };

export const shapeMotion = {
  id: "shape-motion",
  layer: "surface",
  requires: { material: "tetrad" },
  mount_point: "strips",
  order: 12,
  controls: ["setSeg", "famSeg", "figAddrSeg", "figSel", "arpIn", "arpErr", "figShift", "placeSeg", "playbackSeg", "rootsChk", "guideChk"],

  markup: `
  <h2>Shape &amp; Motion</h2>
  <div class="striprow">
    <div class="grp">
      <label>String set (named high → low, as the reference writes it)</label>
      <div class="seg" id="setSeg" data-control="setSeg"></div>
      <label>Voicing family</label>
      <div class="seg" id="famSeg" data-control="famSeg"></div>
    </div>
    <div class="grp smFig">
      <div class="row2 alignEnd">
        <div class="smTight"><label>The figure is</label>
          <div class="seg" id="figAddrSeg" data-control="figAddrSeg">
            <button data-mm="pattern" class="on" title="real string numbers, as the set lists them low → high — the instrument's own address">pattern</button>
            <button data-mm="tones" title="R-3-5-7, by role: a figure follows the HARMONY through the shape">tones</button>
          </div></div>
        <div class="smTight"><label>Figure</label>
          <select id="figSel" data-control="figSel"></select></div>
      </div>
      <label id="arpLabel">Figure (string numbers — the set's strings, low to high)</label>
      <input type="text" id="arpIn" data-control="arpIn" spellcheck="false" placeholder="e.g. 6-5-4-3">
      <span id="arpErr" data-control="arpErr" class="smErr"></span>
      <!-- THE SHIFT OFFER (261002): a pattern figure names absolute strings, so a set
           change leaves it naming strings the new set lacks. The refusal above names the
           mismatch; this button OFFERS the same figure slot for slot on the new set — a
           click, never a surprise (a figure is the user's sentence). Hidden until offered. -->
      <button id="figShift" data-control="figShift" class="smShift" hidden></button>
    </div>
    <div class="grp">
      <div class="row2">
        <div class="smTight"><label>Placement</label>
          <div class="seg" id="placeSeg" data-control="placeSeg"></div></div>
        <div class="smTight"><label>Movement</label>
          <div class="seg" id="playbackSeg" data-control="playbackSeg">
            <button data-pb="strum" class="on" title="the harmony, strummed — the word was Block until the 260913 ruling">strum</button>
            <button data-pb="arpeggiated" title="the figure as a line — the figure IS the rhythm">arpeggiate</button>
            <button data-pb="both" title="the line over a short harmony bed">both</button>
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
.smShift{font:inherit;font-size:11.5px;padding:2px 9px;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--ink);cursor:pointer;margin-left:6px}
.smShift:hover{border-color:var(--ink)}
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
      /* THE FIGURE CHAIN. `address` is the vocabulary toggle (pattern | tones — ONE ADDRESS
       * FAMILY since 261002; a saved "slots" is migrated on intake, below);
       * `figure` is the user's text, verbatim — parsed by every consumer through
       * engine/figure.mjs, never pre-digested here, so the pass stays the only
       * derived thing and the text stays the stored fact. `playback` is the
       * reference's segment. `guide` is the guide-tone reduction view. */
      address: "pattern", figure: "", playback: "strum", guide: false,
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
        /* the VALUE rides the button as a role (260917, rule 12): a harness
         * that finds "Drop-3" or "B–G–D–A" by its label is reading a word a
         * relabel may change — the stored identity is what to address */
        b.dataset.v = String(value);
        if (title) b.title = title;
        if (value === current) b.className = "on";
        if (disabled(value)) b.disabled = true;
        b.addEventListener("click", () => pick(value));
        host.appendChild(b);
      });
    };

    /* the set's strings, low → high — the pattern address's own alphabet */
    const setStrings = () => lowToHigh(STRING_SETS[cfg.setIndex].strings);
    /* THE SHIFT OFFER (261002): set at the moment the set changes under a pattern figure
     * the new set cannot hold; cleared when the figure changes. Local — never stored. */
    let offer = null;
    const render = () => {
      /* display HIGHEST set first (the reference lists high → low), but each
       * button's value stays the real STRING_SETS index — the stored identity a
       * saved étude restores by. Presentation reversed; the fact is not. */
      seg(byId("setSeg"), STRING_SETS.map((s, i) => ({ value: i, label: s.label })).reverse(),
        cfg.setIndex, (v) => {
          /* a pattern figure names ABSOLUTE strings and does not survive a set change — the
           * trade Daniel made knowingly (260923). Name the mismatch (the parse refuses it) and
           * OFFER the shift, slot for slot; never translate silently, never drop. */
          const from = lowToHigh(STRING_SETS[cfg.setIndex].strings), to = lowToHigh(STRING_SETS[v].strings);
          const wasFine = cfg.address === "pattern" && cfg.figure && !parseFigure(cfg.figure, "pattern", { set: from }).err;
          const shifted = wasFine ? shiftFigure(cfg.figure, from, to) : null;
          offer = shifted && parseFigure(cfg.figure, "pattern", { set: to }).err ? { figure: cfg.figure, to: shifted } : null;
          cfg.setIndex = v; push(); });
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
        : `Figure (string numbers — this set's strings, low to high: ${setStrings().join("-")})`;
      byId("arpIn").placeholder = cfg.address === "tones" ? "e.g. R-3-7-5 or (-1,+2)3 7" : `e.g. ${setStrings().join("-")}`;
      // the picker: presets derived from the address's stated letter order —
      // v0.7.7 gave the reference a picker because raw figure syntax was
      // hostile; the door keeps both, the picker writing into the field
      const letters = cfg.address === "tones" ? TONE_ORDER : setStrings().map(String);
      const presets = [
        ["", "— strum —"],   // was "— block —" until the 260913 word ruling
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
      const parsed = parseFigure(cfg.figure, cfg.address, { set: setStrings() });
      byId("arpErr").textContent = (cfg.figureUnresolved && cfg.figure
        ? "this figure was saved as slots without its set, so it cannot be translated — retype it as string numbers. "
        : "") + (parsed.err || "");
      // the shift offer stands while the refused figure is the one it was made for
      const shift = byId("figShift");
      if (offer && offer.figure === cfg.figure && parsed.err) {
        shift.hidden = false; shift.textContent = `shift the figure to ${offer.to}`;
        shift.title = `the same figure, slot for slot, on ${STRING_SETS[cfg.setIndex].label}`;
      } else shift.hidden = true;
      const hasFig = !!parsed.pattern;
      for (const b of byId("playbackSeg").querySelectorAll("button")) {
        b.classList.toggle("on", b.dataset.pb === cfg.playback);
        // P1 (cheap variant): the figure sounds only when Playback ≠ Block AND a
        // figure parses, so Arpeggiated and Both have nothing to sound without
        // one — "Block with a figure" and "Arpeggiated with no figure" reach the
        // identical silent chord. Disable them until a figure parses; enabling is
        // LIVE (render runs on every change). Playback stays three real buttons —
        // not collapsed, not renamed; this only gates when the axis is inert.
        b.disabled = b.dataset.pb !== "strum" && !hasFig;
      }

      /* THE PANEL NARRATES ITSELF (this item: state the rules in the hints, so
       * the page explains itself). The one rule that catches everyone — read off
       * figure.mjs:161-162 — is that the figure sounds ONLY when Playback ≠ Block
       * AND a figure parses; on Block, or with no figure, `order` is null and the
       * plain block chord plays. Two different control states therefore reach the
       * SAME silent result, and the panel used to say neither. Every clause below
       * is stated only when it is true, so an inert control announces itself. */
      const figWords = hasFig
        ? describeFigure(parsed.pattern, cfg.address, { set: setStrings() }) + (parsed.source === "motion" ? "" : (cfg.address === "tones" ? " by role" : " by string"))
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
      if (cfg.playback === "strum")
        parts.push(hasFig
          ? "Movement is strum, so the figure is typed but not sounding — choose arpeggiate or both to hear it"
          : "strum chords");
      else
        parts.push(hasFig
          ? `${cfg.playback}: ${figWords}`
          : `${cfg.playback} has no figure to sound — strum chords until one parses`);
      // the address toggle only bites while a figure is actually sounding
      if (hasFig && cfg.playback !== "strum")
        parts.push(cfg.address === "tones" ? "spelled by tone role" : "spelled by string number");
      if (cfg.guide) parts.push("guide tones lit — a neck view that dims R and 5");
      byId("smHint").textContent = parts.join(" · ");

      // every DISABLED control states why, in the panel, not only in a tooltip:
      // Arpeggiated/Both are gated on a figure (P1), and Line placement needs a
      // voicer the pass does not build. Each reason shows only while it applies.
      const why = [];
      if (!hasFig) why.push("arpeggiate and both need a figure — type one to enable them.");
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
      /* THE SAVED-SLOTS MIGRATION (261002, night 38 — the night-32 alias precedent, one
       * layer up): a pre-261002 étude says address "slots" and a figure of slot digits.
       * Resolve it against the set it was SAVED with (setIndex rides every entry — the
       * stored identity, notepad-card.mjs) and re-announce once, so every consumer
       * converges on the migrated text. A message with no set at all (nothing shipped
       * ever wrote one) keeps the figure VERBATIM, flagged unresolved, and the face says
       * so — an old note that cannot be translated is still the user's note. */
      if (m.address === "slots") {
        const idx = Number.isInteger(m.setIndex) ? m.setIndex : cfg.setIndex;
        const set = STRING_SETS[idx] && STRING_SETS[idx].strings;
        const migrated = { ...m, address: "pattern" };
        if (set) { migrated.figure = legacySlotsToPattern(m.figure ?? cfg.figure, set); migrated.figureUnresolved = false; }
        else migrated.figureUnresolved = true;
        cfg.figureUnresolved = migrated.figureUnresolved;
        m = migrated;
        d.defaultView.setTimeout(() => announce(d, CONFIG_CHANGED, { address: cfg.address, figure: cfg.figure }), 0);
      } else if ("figure" in m || "address" in m) cfg.figureUnresolved = false;
      for (const k of MINE) if (k in m && JSON.stringify(m[k]) !== JSON.stringify(cfg[k])) {
        /* a restored pre-260913 étude says playback "block" — the alias map
         * is the one place the old word is known */
        const v = k === "playback" ? playbackWord(m[k]) : m[k];
        if (JSON.stringify(v) === JSON.stringify(cfg[k])) continue;
        cfg[k] = Array.isArray(v) ? [...v] : v; changed = true;
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
    byId("arpIn").addEventListener("input", (e) => { cfg.figure = e.target.value; cfg.figureUnresolved = false; offer = null; push(); });
    byId("figSel").addEventListener("change", (e) => { cfg.figure = e.target.value; cfg.figureUnresolved = false; offer = null; push(); });
    // the offer, taken: the shifted figure becomes the user's — a click, and it is theirs
    byId("figShift").addEventListener("click", () => { if (offer) { cfg.figure = offer.to; offer = null; push(); } });
    push();
  },
};
