/* progression-card.mjs — v0.9's PROGRESSION card, LIVE (child 7).
 *
 * THE OWNER of the progression half of the configuration: source (cycle ·
 * form · custom), the cycle, the form, the custom line, and Start on. It
 * announces; every board derives its own bars from the same message through
 * engine/progression.mjs (§4.2.3 — nobody reads this card's state).
 *
 * THE BAR COUNT IS DERIVED AND HAS NO CONTROL — the walk comes home and
 * that is the length (PRD §2.7; setting it by hand only ever padded the
 * tail). "Start on" renders ONLY under a cycle: a form or a typed line
 * carries its own roots, and a control that means nothing must not stand
 * there implying it does. "Form" is the surface's word; the engine module
 * stays structures.mjs (§2.7 is the written reason — §4.4).
 *
 * TYPED CHANGES (G28 closes): the custom line takes romans (the case rule:
 * ii7 is a MINOR seventh), chord symbols, or a chart line with | bars — the
 * same grammar the file's chart block speaks, which is what makes the
 * palette → note → progression round trip byte-clean. A token nothing
 * accepts is REFUSED BY NAME on the card's face, in red, while the boards
 * hold the tonic bar. "From the note's chart" copies the pad's own chart
 * fence into the line — §8's one handoff channel, closing.
 */
import { CYCLES } from "../../engine/tetrad-sequence.mjs";
import { STRUCTURES } from "../../engine/structures.mjs";
import { progressionOf, chartBodyOf } from "../../engine/progression.mjs";
import { CONFIG_CHANGED, listen, announce, announceAfter } from "../bus.mjs";
import { clockMarkup, mountClock } from "../clock.mjs";
import { parseTones, degreeOfTone, renderPick, defaultPick, objectDegrees, pickOf, tonePick, objectOf } from "../../engine/selection.mjs";
import { field } from "../../engine/field.mjs";
import { SHARED } from "../../engine/shared-config.mjs";

/* THE OBJECT AND ITS TONES (night 64, 261014e — from harmony-card.mjs, where they lived since v0.9): Daniel —
 * "Object really does belong to Progression, because that is what the progression is acting on." The table and
 * the rules came verbatim; what changed is the ruling in §3b: ONE EDITOR PER CARD — Centricity edits the field,
 * this card edits the object. At Object = scale the Tones field READS the field's notes and is TYPED in roles;
 * typing roles derives an object and leaves scale (the exit). Typed note names set no gamut any more. */
const OBJECTS = [
  ["scale", "Scale or mode", true],
  ["dyad", "Dyad", true],           // child 4: two chord tones, by role — since 260917 picked in the Tones field
  ["triad", "Triad", true],
  ["tetrad", "Tetrad", true],
  ["ninth", "9th chord", true],     // 260914 item 3: depth is data —
  ["eleventh", "11th chord", true], // offsets 2i to the named extension,
  ["thirteenth", "13th chord", true], // mod7; Grip drops by a NAMED rule
  ["shell", "Shell", true],         // child 4: R + the guide tones
];


const ORD = ["root", "2nd", "3rd", "4th", "5th", "6th", "7th"];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

export const progressionCard = {
  id: "progression-card",
  layer: "surface",
  requires: { surface: "multetudes" },
  mount_point: "cards",
  order: 11,
  controls: ["pgClock", "hcObj", "hcTones", "pgSrcSeg", "pgCycle", "pgForm", "pgCustom", "pgChartBtn", "pgStart"],   // hcObj, hcTones: night 64, their ids kept (every pin, message and saved étude addresses them)

  markup: `
  <h2>Progression</h2>
  <!-- THE CLOCK, SEATED HERE (night 69 — ruling 261026, D5 approved): a second VIEW of the clock (hub/clock.mjs),
       addressed by data-role, owning nothing. TWO DECLARED ROWS — bar split · bpm, then the click · its pulse —
       Daniel's grouping, a wrapper per row, never a wrap flex finds. The neck keeps its own view. -->
  <div class="pg-clock" id="pgClock" data-control="pgClock">${clockMarkup({ rows: 2 })}</div>
  <!-- OBJECT AND TONES FIRST, above Source (night 64): they are what the progression acts on, so they are read
       before how it moves. STACKED, not adjacent — this card is a narrow column (281 px at 1280, 250 at 390) and
       its own idiom is label-above-control at full width; two selects side by side would clip the object's
       longest name at 390. Object still POPULATES Tones; editing Tones re-names the Object (night 59). -->
  <label>Object</label>
  <select id="hcObj" data-control="hcObj"></select>
  <label id="hcTonesLab">Tones</label>
  <input type="text" id="hcTones" data-control="hcTones" autocomplete="off">
  <div class="hint" id="pgObjNote"></div>
  <label>Source</label>
  <div class="seg" id="pgSrcSeg" data-control="pgSrcSeg">
    <button data-src="cycle" class="on">cycle</button>
    <button data-src="form">form</button>
    <button data-src="custom">custom</button>
  </div>
  <label class="pg-cyc">Cycle</label>
  <select id="pgCycle" data-control="pgCycle" class="pg-cyc"></select>
  <label class="pg-frm pg-hid">Form</label>
  <select id="pgForm" data-control="pgForm" class="pg-frm pg-hid"></select>
  <label class="pg-cus pg-hid">Custom — romans, symbols, or | bars |</label>
  <input type="text" id="pgCustom" data-control="pgCustom" class="pg-cus pg-hid"
    placeholder="ii7 V7 Imaj7 · or · | Cm7 F7 | Bbmaj7 |">
  <button id="pgChartBtn" data-control="pgChartBtn" class="pg-cus pg-hid" disabled
    title="the pad holds no chart block yet">From the note's chart</button>
  <label class="pg-cyc">Start on</label>
  <select id="pgStart" data-control="pgStart" class="pg-cyc"></select>
  <div class="hint" id="pgNote"></div>`,

  styles: `
.pg-clock{margin:0 0 10px}
.pg-clock .clk-row{display:flex;align-items:center;gap:9px}
.pg-clock .clk-row+.clk-row{margin-top:2px}
.pg-hid{display:none}
#pgNote{margin-top:8px}
/* the seg's visual grammar, scoped to this module's own markup (260905):
 * the shell defines these rules in its STRIPS chrome block, which this
 * door's lock never mounts — so the .on state was applied and invisible.
 * Same facts, this module's own selectors (the minis' idiom); the shell
 * stays untouched. */
#pgSrcSeg{display:flex;flex-wrap:wrap;gap:6px}
#pgSrcSeg button{font:inherit;font-size:12.5px;padding:5px 9px;
  border:1px solid var(--line);border-radius:6px;background:#fff;cursor:pointer;color:var(--ink)}
#pgSrcSeg button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
#pgNote.pg-err{color:#B82929;font-weight:bold}
#pgCycle,#pgForm,#pgStart,#pgCustom,#hcObj,#hcTones{width:100%}
#pgObjNote{margin:6px 0 10px}
#pgChartBtn{font:inherit;font-size:12px;margin-top:6px;padding:4px 10px;
  border:1px solid var(--line);border-radius:6px;background:#fff;cursor:pointer;color:var(--ink)}
#pgChartBtn:hover:not(:disabled){border-color:var(--ink)}
#pgChartBtn:disabled{color:var(--gray);cursor:default}`,

  mount(ctx) {
    mountClock(ctx, ctx.byId("pgClock"));   // night 69: a view of the one clock
    const d = ctx.doc, byId = ctx.byId;
    /* PRIVATE — the progression half. key/scale are MIRRORS (harmony owns
     * them) held only to validate and to phrase the note. */
    let cfg = { object: "tetrad", tones: [1, 3, 5, 7],   // night 64: the object (a derived label — only tones is stored) and its tones
      source: "cycle", cycle: "fourths", form: "ii-V-I", custom: "", start: 0 };
    let key = "Bb", scale = "major", gamut = null;   // key/scale/gamut are MIRRORS (Centricity owns them) — the tones' letters under a scale
    let migrated = null;   // night 59: { saved, derived } when a restored entry's stored object is not what its tones make
    let tonesErr = null;   // the tones field's standing refusal, by name
    let padChart = null;                  // the note's chart body, announced by the notepad

    const fill = (sel, items, cur) => {
      sel.textContent = "";
      for (const [v, l] of items) {
        const o = d.createElement("option"); o.value = v; o.textContent = l; sel.appendChild(o);
      }
      sel.value = cur;
    };
    fill(byId("pgCycle"), Object.entries(CYCLES).map(([id, c]) => [id, c.name]), cfg.cycle);
    fill(byId("pgForm"), STRUCTURES.map((s) => [s.id, s.name]), cfg.form);
    fill(byId("pgStart"), ORD.map((o, i) => [String(i), `${o} — ${ROMAN[i]}`]), String(cfg.start));
    {
      const sel = byId("hcObj");
      for (const [v, l, live] of OBJECTS) { const o = d.createElement("option"); o.value = v; o.textContent = l; if (!live) { o.disabled = true; o.title = "arrives with child 4 (dyads, and the chord vocabulary)"; } sel.appendChild(o); }
    }

    const render = () => {
      /* THE OBJECT AND ITS TONES (night 64 — from the harmony card, night 59's rules): a chord object's tones
       * speak ROLES against the chord root and the object is the name the tones make; under a scale the field
       * READS the field's notes (the gamut's letters, the whole field when none is set) and is TYPED in roles —
       * the first control where read and write differ (§3b, Daniel: "a reasonable trade") — said on the face. */
      byId("hcObj").value = cfg.object;
      const isScale = cfg.object === "scale";
      {
        const f = byId("hcTones"), lab = byId("hcTonesLab");
        if (!isScale) {
          const pick = pickOf(cfg);
          const says = parseTones(f.value);
          const saysPick = says.tones ? renderPick(says.tones.map(degreeOfTone)) : null;
          if (!tonesErr && saysPick !== renderPick(pick)) f.value = renderPick(pick);
          lab.textContent = "Tones \u2014 the material, by role against the chord root: R, 3, 5, 7, 9, 11, 13";
          f.placeholder = renderPick(defaultPick(cfg.object));
        } else {
          const fld = field({ key, scale });
          const degs = gamut || [1, 2, 3, 4, 5, 6, 7];
          const letters = degs.map((dg) => fld.notes[dg - 1].name).join(" ");
          if (!tonesErr) f.value = letters;   // a READOUT of the field: repainted from the model, never edited into the gamut
          lab.textContent = `Tones \u2014 the material, by note in ${key} ${SHARED.scale.values[scale] || scale}; typed by role`;
          f.placeholder = "R,3,5";
        }
      }
      {
        const note = byId("pgObjNote");
        if (tonesErr) { note.style.color = "#B82929"; note.textContent = "tones: " + tonesErr; }
        else if (isScale) {
          note.style.color = "";
          note.textContent = `Under a scale the tones read as notes of ${key} ${SHARED.scale.values[scale] || scale} and are typed as roles \u2014 type R, 3, 5 and the tones make a triad and leave the scale; the field is narrowed from its own notes, where the field is.`;
        } else {
          note.style.color = "";
          const pick = pickOf(cfg);
          const whole = renderPick(pick) === renderPick(objectDegrees(cfg.object));
          note.textContent = (cfg.object === "shell"
            ? "A shell is the root under the guide tones — R,3,7, the tones above; edit them and the object is re-named to what the tones make. "
            : cfg.object === "dyad" ? "A dyad is the guide tones — 3,7; edit them and the object is re-named to what the tones make. "
            : whole ? `The whole ${cfg.object}. Narrow it above — fewer tones is the point — or add a tone and the object is re-named to what the tones make. `
            : `The ${cfg.object} narrowed to ${renderPick(pick).split(",").join(" ")}. `)
            + (migrated ? `This étude was saved as a ${migrated.saved}; its tones make a ${migrated.derived} — the tones are the truth.` : "");
        }
      }
      for (const b of byId("pgSrcSeg").querySelectorAll("button"))
        b.classList.toggle("on", b.dataset.src === cfg.source);
      const show = (cls, on) => {
        for (const el of d.querySelectorAll("." + cls)) el.classList.toggle("pg-hid", !on);
      };
      show("pg-cyc", cfg.source === "cycle");
      show("pg-frm", cfg.source === "form");
      show("pg-cus", cfg.source === "custom");
      byId("pgCycle").value = cfg.cycle; byId("pgForm").value = cfg.form;
      if (byId("pgCustom").value !== cfg.custom) byId("pgCustom").value = cfg.custom;
      byId("pgStart").value = String(cfg.start);
      const cb = byId("pgChartBtn");
      cb.disabled = !padChart;
      cb.title = padChart ? "copy the pad's chart block into the line" : "the pad holds no chart block yet";

      /* the note: the DERIVED truth about what the boards will walk */
      const note = byId("pgNote");
      const p = progressionOf(cfg, key, scale);
      if (p.err) { note.classList.add("pg-err"); note.textContent = p.err; return; }
      note.classList.remove("pg-err");
      if (cfg.source === "custom" && !cfg.custom.trim()) {
        note.textContent = "Type changes — romans (ii7 V7 Imaj7), symbols (Cm7 F7), " +
          "or a chart line with | bars — or take the note's chart. Until then the étude holds the tonic bar.";
        return;
      }
      if (cfg.source === "cycle")
        note.textContent = `${CYCLES[cfg.cycle].name} — ${CYCLES[cfg.cycle].rule}. ` +
          `${p.bars.length} bars, derived: the walk comes home.`;
      else
        note.textContent = `${p.bars.length} bar${p.bars.length === 1 ? "" : "s"} in ${key}: ` +
          chartBodyOf(p.chords, p.bars);
    };

    const push = () => { render(); announce(d, CONFIG_CHANGED, { ...cfg }); };

    const MINE = ["object", "tones", "source", "cycle", "form", "custom", "start"];   // object, tones: night 64
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    listen(d, CONFIG_CHANGED, (m) => {
      if (!m || typeof m !== "object") return;
      let changed = false;
      for (const k of MINE) if (k in m && !same(m[k], cfg[k])) { cfg = { ...cfg, [k]: Array.isArray(m[k]) ? [...m[k]] : m[k] }; changed = true; }
      /* the field's mirrors — and a standing refusal in the Tones field is stale once the field it was typed against
       * moves (a key, scale or gamut change repaints the readout; the refused text must not outlive the model) */
      if ("key" in m && m.key !== key) { key = m.key; tonesErr = null; changed = true; }
      if ("scale" in m && m.scale !== scale) { scale = m.scale; tonesErr = null; changed = true; }
      if ("gamut" in m && !same(m.gamut || null, gamut)) { gamut = m.gamut ? [...m.gamut] : null; tonesErr = null; changed = true; }
      if ("chart" in m && m.chart !== padChart) { padChart = m.chart; changed = true; }
      /* a saved étude's `dyad` arrives as the pick (tonePick is the one alias site); an OBJECT arriving without a
       * pick (a preset) takes its default — a triad preset must not inherit a dyad's [3,7] */
      if (!("tones" in m) && Array.isArray(m.dyad) && !same(m.dyad, cfg.tones)) {
        cfg = { ...cfg, tones: [...m.dyad] }; changed = true;
      } else if ("object" in m && !("tones" in m) && !("dyad" in m) && changed) {
        cfg = { ...cfg, tones: defaultPick(cfg.object) }; tonesErr = null;
        announceAfter(d, CONFIG_CHANGED, { tones: cfg.tones });   // the owner SAYS the pick it derived — after the message, not inside it
      }
      /* TONES IS THE TRUTH (night 59): tones that arrive NAME the object; a v1 entry's stored object is a label to
       * compare — where it is not what the tones make, the tones win and the face says so once. NULL INCLUDED
       * (night 60): a saved scale étude carries tones: null, and objectOf(null) is the scale. */
      if ("tones" in m || "dyad" in m) {
        const derived = objectOf(tonePick(cfg));
        if (derived !== cfg.object) {
          if ("object" in m && m.object !== derived && m.object !== "scale") migrated = { saved: m.object, derived };
          cfg = { ...cfg, object: derived }; changed = true;
          announceAfter(d, CONFIG_CHANGED, { object: derived });
        }
      }
      if (changed) render();
    });

    /* choosing an object FILLS its tones (night 59: a shortcut, not a cage) — a refused edit is forgotten with the object */
    byId("hcObj").addEventListener("change", (e) => {
      tonesErr = null; migrated = null;
      cfg = { ...cfg, object: e.target.value, tones: defaultPick(e.target.value) }; push();
    });
    /* THE TONES FIELD: typed in ROLES in every state (night 64, one editor per card); parsed by the figure's parser,
     * named by the one derivation — a refusal is a value on the face and the last lawful pick stands. Under a scale
     * the refusal says the read/write difference: the field reads notes, is typed in roles, and the gamut is set
     * where the field is. */
    byId("hcTones").addEventListener("input", (e) => {
      migrated = null;
      const r = parseTones(e.target.value);
      if (r.err) {
        tonesErr = cfg.object === "scale"
          ? `${r.err} \u2014 under a scale the tones read as notes and are typed as roles (R, 3, 5); the field is narrowed from its own notes, where the field is`
          : r.err;
        render(); return;
      }
      const pick = r.tones.map(degreeOfTone);
      let derived;
      try { derived = objectOf(pick); }
      catch (err) { tonesErr = String(err.message || err).replace(/^objectOf: /, ""); render(); return; }
      tonesErr = null;
      cfg = { ...cfg, tones: pick, object: derived }; push();   // the object is the name the tones make
    });

    byId("pgSrcSeg").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-src]");
      if (!b) return;
      cfg = { ...cfg, source: b.dataset.src }; push();
    });
    byId("pgCycle").addEventListener("change", (e) => { cfg = { ...cfg, cycle: e.target.value }; push(); });
    byId("pgForm").addEventListener("change", (e) => { cfg = { ...cfg, form: e.target.value }; push(); });
    byId("pgStart").addEventListener("change", (e) => { cfg = { ...cfg, start: +e.target.value }; push(); });
    byId("pgCustom").addEventListener("input", (e) => { cfg = { ...cfg, custom: e.target.value }; push(); });
    byId("pgChartBtn").addEventListener("click", () => {
      if (!padChart) return;
      cfg = { ...cfg, source: "custom", custom: padChart }; push();
    });

    push();
  },
};
