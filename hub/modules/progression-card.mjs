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
import { CONFIG_CHANGED, listen, announce } from "../bus.mjs";

const ORD = ["root", "2nd", "3rd", "4th", "5th", "6th", "7th"];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

export const progressionCard = {
  id: "progression-card",
  layer: "surface",
  requires: { surface: "multetudes" },
  mount_point: "cards",
  order: 11,
  controls: ["pgSrcSeg", "pgCycle", "pgForm", "pgCustom", "pgChartBtn", "pgStart"],

  markup: `
  <h2>Progression</h2>
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
.pg-hid{display:none}
#pgNote{margin-top:8px}
#pgNote.pg-err{color:#B82929;font-weight:bold}
#pgCycle,#pgForm,#pgStart,#pgCustom{width:100%}
#pgChartBtn{font:inherit;font-size:12px;margin-top:6px;padding:4px 10px;
  border:1px solid var(--line);border-radius:6px;background:#fff;cursor:pointer;color:var(--ink)}
#pgChartBtn:hover:not(:disabled){border-color:var(--ink)}
#pgChartBtn:disabled{color:var(--gray);cursor:default}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    /* PRIVATE — the progression half. key/scale are MIRRORS (harmony owns
     * them) held only to validate and to phrase the note. */
    let cfg = { source: "cycle", cycle: "fourths", form: "ii-V-I", custom: "", start: 0 };
    let key = "Bb", scale = "major";
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

    const render = () => {
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

    const MINE = ["source", "cycle", "form", "custom", "start"];
    listen(d, CONFIG_CHANGED, (m) => {
      if (!m || typeof m !== "object") return;
      let changed = false;
      for (const k of MINE) if (k in m && m[k] !== cfg[k]) { cfg = { ...cfg, [k]: m[k] }; changed = true; }
      if ("key" in m && m.key !== key) { key = m.key; changed = true; }
      if ("scale" in m && m.scale !== scale) { scale = m.scale; changed = true; }
      if ("chart" in m && m.chart !== padChart) { padChart = m.chart; changed = true; }
      if (changed) render();
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
