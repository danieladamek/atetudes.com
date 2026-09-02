/* fretboard-stage.mjs — the neck, the dots, the armed rings, the transitions.
 *
 * The stage the frozen study calls its crown jewel, rebuilt as a door
 * contribution. It owns its markup and its styles; the music comes from
 * engine/tetrad-sequence.mjs and the gliding comes from engine/voice-identity.mjs.
 * Neither is restated here (§4.2.2).
 *
 * THE ANIMATION IS THREE CSS RULES, measured on the frozen study and quoted in
 * the item — `transform` on the group, `fill` on the mark, `opacity` on the
 * ring. There is no `requestAnimationFrame` and there is none here either.
 *
 * WHY IT GLIDES AT ALL: **a dot glides only if its DOM node survives the chord
 * change.** So the four groups are built ONCE per pass and are then only moved;
 * they are keyed by `engine/voice-identity.mjs`'s stable voice key, which is
 * what guarantees the node a voice gets is the node that voice had. Rebuilding
 * the dots per step would produce a correct-looking still frame that never
 * animates — which is precisely the failure child 2 exists to prevent, so the
 * key is used rather than re-derived here.
 *
 * The window AUTO-CROPS to the frets the pass actually uses, exactly as the
 * frozen study does: the neck is drawn to the music, not the music to the neck.
 */
import { tetradPass, OPEN_MIDI } from "../../engine/tetrad-sequence.mjs";
import { scaleNotes } from "../../engine/chord.mjs";
import { keysOf } from "../../engine/voice-identity.mjs";
import { parseFigure, figureEvents, toneIndexOf, playbackWord } from "../../engine/figure.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, CLOCK_STATE, ATTACK, NOTE, listen, announce } from "../bus.mjs";
// the degree palette, stated once (260918, item 2a — was a hand-copied literal here)
import { FAM_COLOR, FAM_TEXT } from "../palette.mjs";

const SVGNS = "http://www.w3.org/2000/svg";
/* THE REFERENCE'S GEOMETRY, verbatim: a 15-fret neck across a 1160-wide
 * viewBox, string 1 at the top. The study's `FX0=46,FW=71,SY0=34,SGAP=34` and
 * its fx/fy — the neck is drawn full-bleed and dense because that IS the
 * layout specification, not because a number here was tuned. */
const NFRETS = 15, FX0 = 46, FW = 71, SY0 = 34, SGAP = 34;
const fx = (f) => (f === 0 ? FX0 - 22 : FX0 + (f - 0.5) * FW);
const fy = (str) => SY0 + (str - 1) * SGAP;
/* the scale-degree family palette and its text colours — the Spec's, and the
 * study's FAM_COLOR/FAM_TEXT verbatim: light marks (4, 6, 7) take dark text */


export const fretboardStage = {
  id: "fretboard-stage",
  layer: "surface",
  requires: { material: "tetrad" },
  mount_point: "boards",
  order: 20,
  controls: ["fretSvg", "winSeg", "bindChk"],

  /* the reference's board, verbatim: a readout line, then the neck SVG at the
   * board's full width. The step buttons this card used to carry are the
   * Transport card's ◀ ▶ now, as they are in the reference. */
  /* the reference's board — a readout line, then the neck — plus the WINDOW
   * segment (audit 260818 §A2/§C3): Full (the whole neck, the reference's
   * rendering) · Follow (the frozen tetrad study's auto-cropping window,
   * ported read-only) · Box (the isolation zone as a visible, movable object,
   * as Triadetudes draws it). The mode is display state and the stage's own;
   * THE ZONE IS CONFIG and travels on the bus like key or family. */
  markup: `
  <div class="bh"><span>On the neck</span></div>
  <div class="fsTop">
    <div class="readout" id="readout"></div>
    <div class="seg fsWin" id="winSeg" data-control="winSeg">
      <button data-win="full" class="on" title="the whole neck">Full</button>
      <button data-win="follow" title="the frozen study's auto-cropping window — the neck framed to the pass">Follow</button>
      <button data-win="box" title="the isolation zone as a movable box the optimizer honours (Grip placement)">Box</button>
    </div>
    <label class="chk fsBind" title="bind: the anchor voice must land on one of the three zone notes — a bar that cannot reaches outside and the box says so. Off, the zone only pulls (today's behaviour).">
      <input type="checkbox" id="bindChk" data-control="bindChk"> bind</label>
  </div>
  <svg id="fretSvg" data-control="fretSvg" viewBox="0 0 1160 260" aria-label="fretboard"></svg>
  <div class="hint fsBoxHint" id="fsBoxHint" hidden></div>`,

  /* Every rule names an `fs` token. The three transitions below are the whole
   * animation; they travel with the stage and cannot outlive it. */
  styles: `
#fretSvg{width:100%;height:auto;display:block}
#fretSvg .dot-label{font-weight:bold;pointer-events:none;user-select:none}
.fsTop{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.fsWin{flex:0 0 auto;margin-top:2px}
.fsBind{flex:0 0 auto;margin:4px 0 0 2px}
.fsBoxHint{margin-top:6px}
.fs-zone{fill:none;stroke:#73737A;stroke-width:1.6;stroke-dasharray:6 4}
.fs-grip{fill:var(--ink);cursor:ew-resize}
.fs-grip-hit{fill:transparent;cursor:ew-resize}
.readout{font-size:14px;margin:2px 2px 10px;color:var(--ink)}
.readout b{font-size:16px}
.readout .rosub{color:var(--gray);font-size:12.5px}
.fs-dot{transition:transform .55s cubic-bezier(.4,0,.2,1);cursor:pointer}
.fs-dot .fs-mk{transition:fill .55s}
.fs-dot .fs-ring{fill:none;stroke:#212126;stroke-width:2;opacity:0;transition:opacity .2s}
.fs-dot.fs-armed .fs-ring{opacity:1}
.fs-dot .fs-lab{font-family:inherit;font-weight:bold}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    const lock = ctx.door.lock || {};
    // the lock's families is the door's DEFAULT; Shape & Motion announces the
    // one actually chosen and that wins when present
    const families = Array.isArray(lock.families) && lock.families.length ? lock.families : ["drop2"];

    /* PRIVATE state. Nothing else reads it; the step is announced, not shared. */
    let cfg = { key: "C", scale: "major", cycle: "fourths", bottom: 0, setIndex: 0 };
    let pass = null, dots = [], step = 0, ctxLayer = null, zoneLayer = null, pulseLayer = null;
    let echoAttack = false;   // the next show()'s echo is attack-borne — see the announce
    let bpm = 72, durBeats = 2;            // the clock's, heard on the bus — for the pulse and Follow-the-line
    let pulseTimers = [];
    /* the WINDOW MODE is display state — the stage's own, not config */
    let win = "full";
    /* the ZONE is config. It defaults to nothing (the pass applies its own
     * historical default) and becomes a value the moment the user sets it —
     * announced on the bus, so every consumer re-derives, the owners adopt it,
     * and it lands in the practice log like key or family. */
    let dragging = null, justDragged = false;

    const el = (t, a, p) => {
      const e = d.createElementNS(SVGNS, t);
      for (const k in a) e.setAttribute(k, a[k]);
      if (p) p.appendChild(e);
      return e;
    };

    /* the current chord's tone → family, so the ghosted scale and the active
     * dots agree on colour; a family is the degree relative to the CHORD root
     * for the voicing, and to the KEY for the ghosted scale (the study's own
     * two readings, both by function) */
    const famOfIv = (iv) => ({ 0: "R", 1: "2", 2: "2", 3: "3", 4: "3", 5: "4", 6: "4",
      7: "5", 8: "6", 9: "6", 10: "7", 11: "7" })[((iv % 12) + 12) % 12];

    const build = () => {
      pass = tetradPass({ families, ...cfg });
      const svg = byId("fretSvg");
      svg.textContent = "";
      const scale = scaleNotes(cfg.key, cfg.scale);
      const keyPcs = scale.map((n) => n.pc);

      /* ---- the neck: the reference's renderFret, verbatim geometry ---- */
      for (let f = 0; f <= NFRETS; f++)
        el("line", { x1: FX0 + f * FW, y1: fy(1) - 14, x2: FX0 + f * FW, y2: fy(6) + 14,
          stroke: f === 0 ? "#212126" : "#D8D8DC", "stroke-width": f === 0 ? 4 : 1.2 }, svg);
      for (const mf of [3, 5, 7, 9, 12]) {
        el("circle", { cx: FX0 + (mf - 0.5) * FW, cy: fy(6) + 26, r: 3.4, fill: "#D8D8DC" }, svg);
        if (mf === 12) el("circle", { cx: FX0 + (mf - 0.5) * FW + 10, cy: fy(6) + 26, r: 3.4, fill: "#D8D8DC" }, svg);
        const tx = el("text", { x: FX0 + (mf - 0.5) * FW, y: fy(1) - 22, "text-anchor": "middle",
          "font-size": "10", fill: "#B9B9BF" }, svg);
        tx.textContent = mf;
      }
      for (let s2 = 1; s2 <= 6; s2++) {
        el("line", { x1: FX0 - 30, y1: fy(s2), x2: FX0 + NFRETS * FW, y2: fy(s2),
          stroke: "#B9B9BF", "stroke-width": s2 >= 4 ? 1.8 : 1.1 }, svg);
        const t = el("text", { x: FX0 + NFRETS * FW + 8, y: fy(s2) + 4, "font-size": "11", fill: "#73737A" }, svg);
        t.textContent = s2;
      }
      /* the whole scale, ghosted at 0.28 — the study's density comes from this */
      for (let s2 = 1; s2 <= 6; s2++)
        for (let f = 0; f <= NFRETS; f++) {
          const pc = (OPEN_MIDI[s2] + f) % 12, di = keyPcs.indexOf(pc);
          if (di < 0) continue;
          const fam = ["R", "2", "3", "4", "5", "6", "7"][di];
          const g = el("g", { opacity: 0.28, "data-midi": OPEN_MIDI[s2] + f, cursor: "pointer" }, svg);
          el("circle", { cx: fx(f), cy: fy(s2), r: 10.5, fill: FAM_COLOR[fam] }, g);
          const t = el("text", { x: fx(f), y: fy(s2) + 3.4, "text-anchor": "middle", "font-size": "9.5",
            fill: FAM_TEXT[fam], class: "dot-label" }, g);
          t.textContent = fam === "R" ? "R" : String(di + 1);
        }
      ctxLayer = el("g", {}, svg);           // root rings on the lower strings
      const active = el("g", {}, svg);

      /* THE NODES THAT MUST SURVIVE. One group per VOICE KEY, built once for the
       * whole pass — never per step, or nothing would ever glide. */
      dots = keysOf(pass.steps[0].voicing).map((key) => {
        const g = el("g", { class: "fs-dot", "data-voice": key }, active);
        el("circle", { class: "fs-mk", cx: 0, cy: 0, r: 14, fill: "#212126", stroke: "#fff", "stroke-width": 2 }, g);
        el("circle", { class: "fs-ring", cx: 0, cy: 0, r: 17.5 }, g);
        el("text", { class: "fs-lab", x: 0, y: 3.6, "text-anchor": "middle", "font-size": "10.5" }, g);
        return { key, g };
      });
      pulseLayer = el("g", {}, svg);       // the sounding-note pulse — outlives chord changes
      zoneLayer = el("g", {}, svg);        // the box, drawn ABOVE the dots so it can be dragged
      drawZone();
      applyWindow();
      show(0, true);
    };

    /* ---- THE BOX: the zone as Triadetudes draws it — the dashed rectangle,
     * clamped to the drawn board — over the set's strings, from the zone grown
     * to cover every chosen voicing (`pass.box`, derived in the engine). It is
     * DRAGGABLE: dragging moves the ZONE (three frets), which is config, which
     * re-derives the pass, which moves the box. The user sets the zone; the
     * engine sets the box. ---- */
    const drawZone = () => {
      zoneLayer.textContent = "";
      if (win !== "box" || !pass) return;
      /* THE WINDOW IS A POSITION (ratified 2026-08-21): one rigid rectangle —
       * the box, which IS the zone's span, by the strings of the set — and the
       * corner grip that moves it. It never stretches, never reports, never
       * explains itself; a note outside it is a stretch shown in full colour
       * hard against the line, and that is the teaching. The overhang tint,
       * the solid anchor strip, the anchor edge and the seed-vs-consequence
       * rendering rule shipped 2026-08-20 are retracted and deleted. */
      const B = pass.box;
      const ys = B.strings.map(fy), yLo = Math.min(...ys) - 17, yHi = Math.max(...ys) + 17;
      const xLo = B.fLo === 0 ? FX0 - 34 : FX0 + (B.fLo - 1) * FW + FW * 0.28;
      const xHi = Math.min(FX0 + B.fHi * FW - FW * 0.22, FX0 + NFRETS * FW + 9);
      el("rect", { class: "fs-zone", x: xLo, y: yLo, width: xHi - xLo, height: yHi - yLo, rx: 12 }, zoneLayer);
      /* the corner grip — bottom-left, the only drag-start surface (93c5456's
       * gesture story unchanged); a generous invisible hit square keeps it
       * grabbable */
      el("rect", { class: "fs-grip", x: xLo - 7, y: yHi - 7, width: 14, height: 14, rx: 3 }, zoneLayer);
      const gripHit = el("rect", { class: "fs-grip-hit", x: xLo - 20, y: yHi - 20, width: 40, height: 40 }, zoneLayer);
      const start = (e) => { dragging = { x0: e.clientX, lo0: B.fLo }; e.preventDefault(); };
      gripHit.addEventListener("pointerdown", start);
      byId("fsBoxHint").hidden = false;
      byId("fsBoxHint").textContent =
        `Isolation zone: the position at frets ${B.fLo}–${B.fHi} on string ${pass.zone.string}. ` +
        `Drag the corner grip to move it, or press ← → with the neck focused.`;
    };

    /* the drag: pointer x → fret; announce the new zone as CONFIG.
     *
     * THE UN-FLATTENING (260820, the measurements' slice 1): the zone the USER
     * sets is three consecutive SCALE notes on the anchor string — the triad
     * app's st.pivotFrets model, which e5ba874 flattened to three adjacent
     * frets. Width 4–5 falls out of the scale by construction; it is never
     * set and never stored. The un-flattening lives HERE, at the seam where
     * the user sets the zone: every drag and every arrow press writes a scale
     * triple. The ENGINE's cold-load default stays the pinned literal
     * ([5,6,7]) — a library default the oracle corpus and the default-zone
     * pin were measured under (shape-motion's placement note is the
     * precedent); making the cold default scale-derived changes unbound
     * output and is exactly the slice-2 ruling Daniel makes with his ears. */
    const svgEl = () => byId("fretSvg");
    const scaleFretsOnAnchor = () => {
      const pcs = scaleNotes(cfg.key, cfg.scale).map((n) => n.pc);
      const zs = pass ? pass.zone.string : 6;
      const out = [];
      for (let f = 0; f <= NFRETS; f++) if (pcs.includes((OPEN_MIDI[zs] + f) % 12)) out.push(f);
      return out;
    };
    const tripleAt = (lo) => {
      const sf = scaleFretsOnAnchor();
      if (sf.length < 3) return null;                     // cannot happen for real scales; stay honest
      let i = 0;
      for (let k = 0; k < sf.length; k++) if (Math.abs(sf[k] - lo) < Math.abs(sf[i] - lo)) i = k;
      i = Math.max(0, Math.min(sf.length - 3, i));
      return [sf[i], sf[i + 1], sf[i + 2]];
    };
    const fretAt = (clientX) => {
      const r = svgEl().getBoundingClientRect();
      const x = (clientX - r.left) * (1160 / r.width);
      return Math.max(0, Math.min(NFRETS, Math.round((x - FX0) / FW + 0.5)));
    };
    const setZoneLo = (lo) => {
      const frets = tripleAt(lo);
      if (!frets) return;
      if (pass && frets.join() === pass.zone.frets.join()) return;
      announce(d, CONFIG_CHANGED, { zone: { frets, string: pass.zone.string,
        ...(cfg.zone && cfg.zone.bind === false ? { bind: false } : {}) } });
    };
    const stepZone = (dir) => {
      const sf = scaleFretsOnAnchor();
      const lo = Math.min(...pass.zone.frets);
      let i = 0;
      for (let k = 0; k < sf.length; k++) if (Math.abs(sf[k] - lo) < Math.abs(sf[i] - lo)) i = k;
      i = Math.max(0, Math.min(sf.length - 3, i + dir));
      const frets = [sf[i], sf[i + 1], sf[i + 2]];
      if (frets.join() === pass.zone.frets.join()) return;
      announce(d, CONFIG_CHANGED, { zone: { frets, string: pass.zone.string,
        ...(cfg.zone && cfg.zone.bind === false ? { bind: false } : {}) } });
    };
    d.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const lo = fretAt(e.clientX);
      if (lo !== dragging.lo0) { dragging.lo0 = lo; dragging.moved = true; setZoneLo(lo); }
    });
    d.addEventListener("pointerup", () => { justDragged = dragging ? !!dragging.moved : false; dragging = null; });

    /* ---- THE NECK SOUNDS (floor F3, filed 260820): clicking a dot announces
     * NOTE — the audio card's existing listener realises it, exactly as the
     * keyboard's keys do. The stage grows no audio of its own: one behaviour,
     * one owner. Every dot carries `data-midi` (the ghosted scale dots at
     * build, the gliding voice dots per step), and ONE delegated click
     * listener reads it — the next refactor of this handler inherits the
     * whole gesture story from this block.
     *
     * HOW THE CLICK AND THE ZONE DRAG SHARE THE SVG WITHOUT COLLIDING:
     * element-level ownership plus a did-it-move fact — no pixel threshold,
     * no timer. The drag starts only on the zone's own rects (pointerdown
     * above); a drag counts as MOVED only when the zone's low fret actually
     * changed (`dragging.moved`, the artifact-level definition of a drag),
     * and the click that concludes a moved drag is suppressed via
     * `justDragged`. A press on the zone's wide hit rect that never moved IS
     * a click — it falls through to the dot beneath it via elementsFromPoint,
     * so Box mode does not shadow the dots it covers. */
    svgEl().addEventListener("click", (e) => {
      const wasDrag = justDragged; justDragged = false;
      if (wasDrag) return;                       // a drag is not a click
      let hit = e.target.closest("[data-midi]");
      if (!hit)                                  // through the zone's hit rect
        for (const n of d.elementsFromPoint(e.clientX, e.clientY)) {
          const g = n.closest && n.closest("[data-midi]");
          if (g) { hit = g; break; }
        }
      if (hit) announce(d, NOTE, { midi: +hit.dataset.midi });
    });
    svgEl().setAttribute("tabindex", "0");
    svgEl().addEventListener("keydown", (e) => {
      if (win !== "box" || !pass) return;
      if (e.key === "ArrowLeft") { stepZone(-1); e.preventDefault(); }
      if (e.key === "ArrowRight") { stepZone(1); e.preventDefault(); }
    });

    /* ---- THE WINDOW: Full shows the whole neck; FOLLOW is the frozen tetrad
     * study's auto-crop, ported read-only — `fmin = max(1, min(frets) − 1)`,
     * `fmax = max(frets) + 1` over every fret of every step of the pass — as
     * a viewBox over the same fixed drawing, so the gliding nodes never move
     * and only the camera does. Box shows the whole neck with the zone drawn. */
    const applyWindow = () => {
      const svg = svgEl();
      if (win === "follow" && pass) {
        const frets = pass.steps.flatMap((s) => s.voicing.notes.map((n) => n.fret));
        const fmin = Math.max(1, Math.min(...frets) - 1), fmax = Math.max(...frets) + 1;
        const x0 = FX0 + (fmin - 1) * FW - 6, x1 = FX0 + fmax * FW + 6;
        svg.setAttribute("viewBox", `${x0} 0 ${x1 - x0} 260`);
      } else svg.setAttribute("viewBox", "0 0 1160 260");
      byId("fsBoxHint").hidden = win !== "box";
    };
    for (const b of byId("winSeg").querySelectorAll("button"))
      b.addEventListener("click", () => {
        win = b.dataset.win;
        for (const o of byId("winSeg").querySelectorAll("button")) o.classList.toggle("on", o === b);
        drawZone(); applyWindow();
      });

    const show = (i, instant) => {
      const n = pass.steps.length;
      step = ((i % n) + n) % n;
      const cur = pass.steps[step], next = pass.steps[step + 1] || null;

      dots.forEach(({ g }, k) => {
        const note = cur.voicing.notes[k];
        g.dataset.midi = note.midi;      // the dot's sounding truth, per step
        const iv = note.midi - cur.chord.root.pc;
        const fam = famOfIv(iv), lab = cur.labels[k];
        if (instant) g.style.transition = "none";
        g.style.transform = "translate(" + fx(note.fret) + "px," + fy(note.string) + "px)";
        g.querySelector(".fs-mk").setAttribute("fill", FAM_COLOR[fam]);
        /* THE GUIDE-TONE REDUCTION VIEW: dim R and 5, leave 3 and 7 full — the
         * reading light for tone-figures. A view, not a mode: opacity only. */
        const role = toneIndexOf(note, cur.chord);
        g.style.opacity = cfg.guide && (role === 0 || role === 2) ? "0.28" : "";
        const t = g.querySelector(".fs-lab");
        const swap = () => {
          t.textContent = lab;
          t.setAttribute("fill", FAM_TEXT[fam]);
          t.setAttribute("font-size", lab.length > 1 ? 9 : 10.5);
        };
        instant ? swap() : setTimeout(swap, 260);
        if (instant) { void g.getBoundingClientRect(); g.style.transition = ""; }
        g.classList.toggle("fs-armed", !!next && next.voicing.notes[k].fret !== note.fret);
      });

      /* root rings on the strings BELOW the set — the reference's rootsChk */
      ctxLayer.textContent = "";
      if (cfg.roots) {
        const maxStr = Math.max(...pass.set.strings);
        for (let s2 = maxStr + 1; s2 <= 6; s2++)
          for (let f = 0; f <= NFRETS; f++)
            if ((OPEN_MIDI[s2] + f) % 12 === cur.chord.root.pc)
              el("circle", { cx: fx(f), cy: fy(s2), r: 11, fill: "none", stroke: "#B82929", "stroke-width": 2.6 }, ctxLayer);
      }

      /* the readout: the reference's line — chord, roman · family/inversion ·
       * n of N · key scale — every prefix true */
      const invName = ["root pos.", "1st inv.", "2nd inv.", "3rd inv."][cur.voicing.bass] || "";
      const fam = pass.families && pass.families[0] ? pass.families[0] : "drop2";
      byId("readout").innerHTML =
        `<b>${cur.symbol}</b> <span class="rosub">${cur.roman} · ${fam} · ${invName} · ` +
        `${step + 1} of ${n} · ${cfg.key} ${({ major: "major", harm: "harmonic minor", mel: "melodic minor" })[cfg.scale]}</span>`;

      /* the echo: the canonical position fact every board follows. When the
       * show was attack-borne the echo says so, and the audio card skips it —
       * the sound already travelled on ATTACK, and an echo that also sounded
       * would double every walked chord. The guard above stays: a request for
       * the step we are on is still not a render. */
      announce(d, STEP_CHANGED, echoAttack
        ? { index: step, total: n, symbol: cur.symbol, attack: true }
        : { index: step, total: n, symbol: cur.symbol });
      echoAttack = false;
      pulse(cur);
    };

    /* THE SOUNDING-NOTE PULSE (the reference's v0.6.5): one ring per event at
     * its onset, from the SAME event list the audio realises — figure.mjs's —
     * so what you see pulsing is what you hear. Approaches pulse hollow. And
     * FOLLOW-THE-LINE: in Follow mode with a figure playing, the window tracks
     * the sounding note rather than the grip — the coupling deferred out of the
     * zone item lands here. */
    const pulse = (cur) => {
      for (const t of pulseTimers) d.defaultView.clearTimeout(t);
      pulseTimers = [];
      pulseLayer.textContent = "";
      const parsed = parseFigure(cfg.figure, cfg.address || "slots");
      const scale = scaleNotes(cfg.key, cfg.scale);
      let events;
      try {
        events = figureEvents(cur, {
          parsed: parsed.err ? null : parsed.pattern, address: cfg.address || "slots",
          playback: playbackWord(cfg.playback) || "strum", durBeats, bpm,
          ctx: { scalePcs: scale.map((n) => n.pc), tonicPc: scale[0].pc, open: OPEN_MIDI, nfrets: 15, set: pass.set.strings },
        });
      } catch { return; }
      const line = events.filter((e) => e.role !== "bass" && !e.bed);
      const isLine = (playbackWord(cfg.playback) || "strum") !== "strum" && !!parsed.pattern;
      line.forEach((ev) => {
        const t = d.defaultView.setTimeout(() => {
          if (ev.string == null || ev.fret == null) return;
          const r = el("circle", { cx: fx(ev.fret), cy: fy(ev.string), r: ev.role === "approach" ? 9 : 19,
            fill: "none", stroke: ev.role === "approach" ? "#7847A8" : "#212126",
            "stroke-width": ev.role === "approach" ? 1.6 : 2.4, opacity: 0.9, "pointer-events": "none" }, pulseLayer);
          const fade = d.defaultView.setTimeout(() => r.remove(), 320);
          pulseTimers.push(fade);
          if (isLine && win === "follow") followTo(ev.fret);
        }, Math.max(0, ev.onset * 1000));
        pulseTimers.push(t);
      });
    };
    /* the window slides to keep the sounding fret framed — a camera move, not a rebuild */
    const followTo = (fret) => {
      const svg = svgEl();
      const cur = svg.getAttribute("viewBox").split(" ").map(Number);
      const width = cur[2];
      const cx = fx(fret);
      let x0 = cx - width / 2;
      x0 = Math.max(0, Math.min(1160 - width, x0));
      svg.setAttribute("viewBox", `${x0} 0 ${width} 260`);
    };

    /* PLAYING BELONGS TO THE TRANSPORT, NOT THE STAGE (Shell 1). The stage
     * owns WHERE the pass is and answers every move with the step it rendered;
     * it no longer decides WHEN, and the ◀ ▶ buttons are the Transport's. */
    /* THE BIND TOGGLE — BOUND IS THE DEFAULT now (ratified 2026-08-21: "a
     * position you do not stay in is not a position"). The checkbox stays
     * because it costs nothing and it is how Daniel A/Bs the sound; it is a
     * VIEW of `cfg.zone.bind !== false`, and only the EXCEPTION is stored:
     * unchecking writes bind:false into the zone (config, snapshot-carried),
     * re-checking drops the flag and snaps a legacy zone to a scale triple. */
    byId("bindChk").addEventListener("change", (e) => {
      const on = e.target.checked;
      const lo = pass ? Math.min(...pass.zone.frets) : 5;
      const frets = on ? (tripleAt(lo) || pass.zone.frets) : [...pass.zone.frets];
      announce(d, CONFIG_CHANGED, { zone: { frets, string: pass ? pass.zone.string : 6,
        ...(on ? {} : { bind: false }) } });
    });
    byId("bindChk").checked = true;
    listen(d, CONFIG_CHANGED, (next) => { cfg = { ...cfg, ...next }; build();
      byId("bindChk").checked = !(cfg.zone && cfg.zone.bind === false); });
    /* another module asking to move — the stage owns the position */
    listen(d, CLOCK_STATE, (m) => { if (m && typeof m.bpm === "number") bpm = m.bpm; });
    listen(d, STEP_CHANGED, (m) => {
      if (m && m.request === true && typeof m.beats === "number") durBeats = m.beats;
      if (m && m.request === true && pass && m.index !== step) { echoAttack = m.attack === true; show(m.index, false); }
    });
    /* the sounding-note rings rode the same echo the sound did, so a swallowed
     * 0 -> 0 attack also lost its pulse. When an attack lands on the step we
     * already show, pulse it here; when it moves us, show() pulses as always
     * (the request arrives right after this event, so exactly one fires). */
    listen(d, ATTACK, (m) => {
      if (m && pass && typeof m.index === "number" && ((m.index % pass.steps.length) + pass.steps.length) % pass.steps.length === step)
        pulse(pass.steps[step]);
    });

    build();
  },
};
