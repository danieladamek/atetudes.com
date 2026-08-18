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
import { CONFIG_CHANGED, STEP_CHANGED, listen, announce } from "../bus.mjs";

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
const FAM_COLOR = { R: "#B82929", "2": "#3C8B2F", "3": "#2959A6", "4": "#A9ABB4",
  "5": "#212126", "6": "#1CB8D1", "7": "#D99A08" };
const FAM_TEXT = { R: "#fff", "2": "#fff", "3": "#fff", "4": "#212126",
  "5": "#fff", "6": "#212126", "7": "#212126" };

export const fretboardStage = {
  id: "fretboard-stage",
  layer: "surface",
  requires: { material: "tetrad" },
  mount_point: "boards",
  order: 20,
  controls: ["fretSvg"],

  /* the reference's board, verbatim: a readout line, then the neck SVG at the
   * board's full width. The step buttons this card used to carry are the
   * Transport card's ◀ ▶ now, as they are in the reference. */
  markup: `
  <div class="readout" id="readout"></div>
  <svg id="fretSvg" data-control="fretSvg" viewBox="0 0 1160 260" aria-label="fretboard"></svg>`,

  /* Every rule names an `fs` token. The three transitions below are the whole
   * animation; they travel with the stage and cannot outlive it. */
  styles: `
#fretSvg{width:100%;height:auto;display:block}
#fretSvg .dot-label{font-weight:bold;pointer-events:none;user-select:none}
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
    let pass = null, dots = [], step = 0, ctxLayer = null;

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
          const g = el("g", { opacity: 0.28 }, svg);
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
      show(0, true);
    };

    const show = (i, instant) => {
      const n = pass.steps.length;
      step = ((i % n) + n) % n;
      const cur = pass.steps[step], next = pass.steps[step + 1] || null;

      dots.forEach(({ g }, k) => {
        const note = cur.voicing.notes[k];
        const iv = note.midi - cur.chord.root.pc;
        const fam = famOfIv(iv), lab = cur.labels[k];
        if (instant) g.style.transition = "none";
        g.style.transform = "translate(" + fx(note.fret) + "px," + fy(note.string) + "px)";
        g.querySelector(".fs-mk").setAttribute("fill", FAM_COLOR[fam]);
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

      announce(d, STEP_CHANGED, { index: step, total: n, symbol: cur.symbol });
    };

    /* PLAYING BELONGS TO THE TRANSPORT, NOT THE STAGE (Shell 1). The stage
     * owns WHERE the pass is and answers every move with the step it rendered;
     * it no longer decides WHEN, and the ◀ ▶ buttons are the Transport's. */
    listen(d, CONFIG_CHANGED, (next) => { cfg = { ...cfg, ...next }; build(); });
    /* another module asking to move — the stage owns the position */
    listen(d, STEP_CHANGED, (m) => {
      if (m && m.request === true && pass && m.index !== step) show(m.index, false);
    });

    build();
  },
};
