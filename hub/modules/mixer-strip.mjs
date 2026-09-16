/* mixer-strip.mjs — THE MIXER STRIP: what sounds under the neck, as a board of its own (night 58, 261012).
 *
 * Daniel's 261009 mockup, finished: "a separate module strip to contain volume controls and include
 * the separate reference bass and pad controls in there as well." Night 55 moved the transport
 * (the neck's own cluster IS the transport, once); night 57 built the contents — the reference
 * tone and the SOUNDED BASS as two controls, and the pad as a seat and a bus; this night builds
 * the board that holds them. The neck keeps its clock row (the 260919 ruling: transport · repeat ·
 * bar split · bpm · metronome, contiguous) and its tuning rows; the three mixer rows moved here
 * with their ids, their bus messages and their state (rule 10 — all three sites together):
 *
 *   voice · the harmony level                      MIXER { voice } · MIXER { chord }
 *   reference tone · sounded bass · the bass level  CONFIG { bass } · CONFIG { sounded } · MIXER { bass }
 *   pad · the pad level                             CONFIG { pad } · MIXER { pad }
 *
 * The board has a header, as every board does, so the shell's collapse chevron sits in it. At 390
 * the rows stack: each level row wraps to its own line at the board's full width (stack, do not
 * shrink — night 51's rule). Nothing here owns state another module owns: the reference's and the
 * sounded bass's option lists come from the engine (reference.mjs, one list), the pick from the
 * announced configuration.
 */
import { referenceChoicesFor, soundedChoicesFor } from "../../engine/reference.mjs";
import { pickOf } from "../../engine/selection.mjs";
import { NOTE_VOICE_NAMES } from "../../engine/voices.mjs";
import { CONFIG_CHANGED, MIXER, listen, announce } from "../bus.mjs";
import { mountMini } from "../mini.mjs";

export const mixerStrip = {
  id: "mixer-strip",
  layer: "surface",
  requires: { surface: "multetudes" },
  mount_point: "boards",
  order: 18.5,
  controls: ["mxMini", "fdVoice", "fdHarmVol", "fdHarmMute", "fdBass2", "fdSounded", "fdBassVol", "fdBassMute",
    "fdPad", "fdPadVol", "fdPadMute"],

  markup: `
  <!-- A SEVENTH VIEW OF THE TRANSPORT (night 62, 261014b — Daniel, ruled: "a second view is what I intended";
       "the user can start and stop wherever they are"): hub/mini.mjs's cluster mounted in this board's header,
       as the chart line, the neck, the keyboard, the keys, the staff and the score mount it — a VIEW of the one clock
       through the bus, no state here (rule 10; the fork night 55 deleted was a copy with its own float, not a
       sixth view). Collapsed, it hides with the strip, as the readhead minis do. Seated after the spacer, at the
       header's right (injection 261015 — every mini sits right). -->
  <div class="bh mx-head"><span>Mixer</span><span class="mx-headspace"></span><span class="mini" id="mxMini" data-control="mxMini"></span></div>
  <span class="clpsum">the mixer — the voice, the reference tone, the sounded bass, the pad, and each bus's level</span>
  <div class="mx-row">
    <span class="mx-lab">voice</span>
    <select id="fdVoice" data-control="fdVoice"></select>
    <div class="bpmrow mx-mix" title="the mixer: the harmony level — muted is this slider at zero">
      <button class="muteBtn" id="fdHarmMute" data-control="fdHarmMute" aria-pressed="false">&#128266;</button>
      <span class="mx-lab mx-mixlab">harmony</span>
      <input type="range" id="fdHarmVol" data-control="fdHarmVol" min="0" max="100" value="100" aria-label="harmony level">
      <span class="mx-val" id="fdHarmVal">100</span>
    </div>
  </div>
  <!-- TWO THINGS, TWO CONTROLS (night 57 — Daniel's ruling 261006): the REFERENCE TONE is fretted, drawn
       on string 5 or 6 and names the chord it makes, so it is not always offerable (both reference strings
       in the set: an unfretted offer, drawn and silent — night 37, unchanged). The SOUNDED BASS is a pitch
       with no string — never drawn, naming nothing, sounding under the material on ANY set — seated below
       the voicing's lowest note (voices.mjs bassSeat). Same vocabulary, one list. One bass bus, one level. -->
  <div class="mx-row">
    <span class="mx-lab">reference tone</span>
    <select id="fdBass2" data-control="fdBass2"
      title="the reference under the harmony — fretted, drawn on string 5 or 6, naming the chord it makes; one state, two views; Harmony's select is the other"></select>
    <span class="mx-lab">sounded bass</span>
    <select id="fdSounded" data-control="fdSounded"
      title="a bass that sounds under the material on any string set — a pitch with no string, never drawn, naming nothing"></select>
    <div class="bpmrow mx-mix" title="the mixer: the bass level — the reference's and the sounded bass's, one bus; muted is this slider at zero">
      <button class="muteBtn" id="fdBassMute" data-control="fdBassMute" aria-pressed="false">&#128266;</button>
      <span class="mx-lab mx-mixlab">bass</span>
      <input type="range" id="fdBassVol" data-control="fdBassVol" min="0" max="100" value="100" aria-label="bass level">
      <span class="mx-val" id="fdBassVal">100</span>
    </div>
  </div>
  <!-- THE PAD IS A SEAT (night 57): the bar's harmony as a sustaining voice, seated ABOVE the guitar's
       register (voices.mjs PAD_REGISTER, chosen by measurement), never drawn; its own bus and level. -->
  <div class="mx-row">
    <label class="chk" id="fdPadLab" title="a sustaining chord under the material — the bar's harmony seated above the strings' register; never drawn, not a voicing anyone plays"><input type="checkbox" id="fdPad" data-control="fdPad"> pad</label>
    <div class="bpmrow mx-mix" title="the mixer: the pad level — muted is this slider at zero">
      <button class="muteBtn" id="fdPadMute" data-control="fdPadMute" aria-pressed="false">&#128266;</button>
      <span class="mx-lab mx-mixlab">pad</span>
      <input type="range" id="fdPadVol" data-control="fdPadVol" min="0" max="100" value="100" aria-label="pad level">
      <span class="mx-val" id="fdPadVal">100</span>
    </div>
  </div>`,

  /* the row grammar is the neck's under-neck row, re-stated as this board's own tokens (a module
   * styles only its own markup); the level row is the shell's .bpmrow with a mute icon per slider */
  styles: `
.mx-headspace{flex:1 1 auto}
.mx-head{padding-right:40px}   /* the shell's chevron band at the header's right (no ⓘ on this board) — a right-seated mini ends before it (injection 261015, measured: 19 px under it without this) */
#mxMini{display:flex;gap:4px;flex:0 0 auto;margin-left:12px}
#mxMini button{font:inherit;font-size:11px;padding:2px 8px;border:1px solid var(--line);
  border-radius:6px;background:#fff;cursor:pointer;color:var(--ink);line-height:1.5;text-transform:none;letter-spacing:0}
#mxMini button:hover{border-color:var(--ink)}
.clpsd>.bh #mxMini{display:none}
.mx-row{display:flex;gap:9px;align-items:center;padding:8px 2px 2px;font-size:12px;color:var(--gray);flex-wrap:wrap}
.mx-row+.mx-row{border-top:1px solid var(--line);margin-top:7px}
.mx-row select{width:auto;font:inherit;font-size:12px;padding:3px 6px;border:1px solid var(--line);border-radius:6px;color:var(--ink)}
#fdBass2,#fdSounded{max-width:260px}
.mx-lab{font-size:12px;color:var(--gray)}
.mx-mix{margin-left:auto;flex:0 1 380px;max-width:376px;margin-top:8px}
.mx-mixlab{width:52px}
.mx-val{font-size:13px;width:30px;text-align:right}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    /* a mirror of the owners' halves — the pick (Harmony's), the bass, the sounded bass, the pad;
     * this board announces its own three and paints from the announced state (rule 10) */
    let cfg = { object: "tetrad", tones: [1, 3, 5, 7], bass: "root", sounded: "none", pad: false };

    const fillSelect = (sel, offered, current) => {
      const have = [...sel.options].map((o) => o.value), want = offered.map(([v]) => v);
      if (want.join() !== have.join() || (!want.includes(current) && ![...sel.options].some((o) => o.value === current && o.disabled))) {
        sel.textContent = "";
        for (const [v, l] of offered) { const o = d.createElement("option"); o.value = v; o.textContent = l; sel.appendChild(o); }
        /* a standing choice the pick no longer holds is kept VISIBLE as a disabled option (CC-1: never
         * switched under the player); the neck says why it is silent */
        if (!want.includes(current) && current) {
          const o = d.createElement("option"); o.value = current; o.disabled = true;
          o.textContent = `${current.replace(/^tone:/, "the ") + (current.startsWith("tone:") ? " in the bass" : "")} — not among the chosen tones`;
          sel.appendChild(o);
        }
      }
      if (sel.value !== current) sel.value = current;
    };
    const paint = () => {
      const b2 = byId("fdBass2");
      fillSelect(b2, referenceChoicesFor(pickOf(cfg)), cfg.bass);
      b2.title = cfg.object === "scale"
        ? "the reference under the mode — placed against the CENTRE chosen in Harmony"
        : "the reference under the harmony — fretted, drawn on string 5 or 6, naming the chord it makes; one state, two views; Harmony's select is the other";
      fillSelect(byId("fdSounded"), soundedChoicesFor(pickOf(cfg)), cfg.sounded);
      byId("fdPad").checked = !!cfg.pad;
    };
    listen(d, CONFIG_CHANGED, (m) => {
      if (!m || typeof m !== "object") return;
      let changed = false;
      for (const k of ["object", "tones", "bass", "sounded", "pad"])
        if (k in m && JSON.stringify(m[k]) !== JSON.stringify(cfg[k])) { cfg = { ...cfg, [k]: Array.isArray(m[k]) ? [...m[k]] : m[k] }; changed = true; }
      if (changed) paint();
    });
    mountMini(ctx, byId("mxMini"));   // ⏮ ▶ ⏹ ⏭ at the mixer — the seventh view of the one clock (night 62)
    byId("fdBass2").addEventListener("change", (e) => announce(d, CONFIG_CHANGED, { bass: e.target.value }));
    byId("fdSounded").addEventListener("change", (e) => announce(d, CONFIG_CHANGED, { sounded: e.target.value }));
    byId("fdPad").addEventListener("change", (e) => announce(d, CONFIG_CHANGED, { pad: !!e.target.checked }));

    {
      const v = byId("fdVoice");
      for (const name of NOTE_VOICE_NAMES) { const o = d.createElement("option"); o.value = name; o.textContent = name; v.appendChild(o); }
      v.addEventListener("change", (e) => announce(d, MIXER, { voice: e.target.value }));
    }
    /* ONE MUTE ICON PER SLIDER (260820.3): the icon is the level at zero, a view, never separate state */
    for (const [slId, muteId, valId, chan] of
      [["fdHarmVol", "fdHarmMute", "fdHarmVal", "chord"], ["fdBassVol", "fdBassMute", "fdBassVal", "bass"], ["fdPadVol", "fdPadMute", "fdPadVal", "pad"]]) {
      const sl = byId(slId), mute = byId(muteId), val = byId(valId);
      let last = 100;
      const paintLvl = () => {
        const lvl = +sl.value;
        val.textContent = lvl;
        mute.setAttribute("aria-pressed", lvl === 0 ? "true" : "false");
        mute.textContent = lvl === 0 ? "\u{1F507}" : "\u{1F50A}";
      };
      const pushLvl = () => { paintLvl(); announce(d, MIXER, { [chan]: +sl.value / 100 }); };
      sl.addEventListener("input", pushLvl);
      mute.addEventListener("click", () => {
        const curLvl = +sl.value;
        if (curLvl > 0) { last = curLvl; sl.value = 0; } else sl.value = last || 100;
        pushLvl();
      });
      paintLvl();
    }
    paint();
  },
};
