/* clock.mjs — the CLOCK VIEW: bar split · bpm · the click · its pulse, built once and mounted in any host
 * (night 69, 261026 — PO ruling 261026: the clock becomes a mountable view, beside the mini).
 *
 * WHY IT EXISTS. The transport was always a primitive (mini.mjs: one file, many hosts, the id on the host and
 * data-role inside). The clock was hand-written markup inside one board with fixed ids, so it could live in one
 * place only — not by doctrine (260919's "the clock closes ranks" governs a BAND, re-scoped by ruling 261026)
 * but by mechanics. This file is the mechanics fixed: ONE clock view, N mounts (rule 6).
 *
 *   clockMarkup({ ids, rows })   the view's markup, as a string a host module interpolates into its OWN static
 *                                markup — so the resolver still sees every declared control (a control declared
 *                                by a module must be IN that module's markup). `ids` is optional: a host that
 *                                has always addressed these controls by id keeps its ids (rule 10 — nothing a
 *                                gate or the control census reaches is re-pointed); a new host passes none and
 *                                is addressed by data-role only, which is what makes a second seat legal.
 *                                `rows: 2` DECLARES the break — split · bpm, then the click · pulse (Daniel's
 *                                grouping, 261026) — a wrapper per row, never a wrap flex happens to find.
 *   mountClock(ctx, host)        wires every control inside `host` by data-role, to the bus and nothing else.
 *
 * A VIEW, NOT AN OWNER: no state, no timer. The split is announced as CONFIG {split} and painted back from it;
 * bpm and the click ask through CLOCK and paint only what the owner echoes on CLOCK_STATE (so a view can never
 * hold a value the clock does not). CONFIG_CHANGED and CLOCK_STATE are REPLAYED to a late subscriber (bus.mjs),
 * so a view mounted after the last announcement paints the current values on subscribe — no special case.
 * The pulse flashes on the BEAT (not replayed: a beat is an event, not a state).
 *
 * Its styles are page grammar shipped by the build to any door that reaches this file (hub/tools/build.mjs
 * CLOCK_GRAMMAR), as the readout's are — so no host copies them.
 */
import { CONFIG_CHANGED, CLOCK, CLOCK_STATE, BEAT, listen, announce } from "./bus.mjs";
import { SPLITS } from "../engine/drill.mjs";

const TITLE = {
  split: "the bar split — a bar's chords take these slots in order",
  bpm: "the tempo — one state, two views; the Metronome card owns the clock",
  click: "the click — one state, two views; the Metronome card's Sound is the other",
};

export function clockMarkup({ ids = null, rows = 1 } = {}) {
  const ctl = (k) => (ids && ids[k] ? ` id="${ids[k]}" data-control="${ids[k]}"` : "");
  const split = `<span class="clk-lab">bar split</span><select data-role="split"${ctl("split")}  title="${TITLE.split}"></select>`;
  const bpm = `<span class="clk-lab">bpm</span><input type="number" class="clk-bpm" data-role="bpm"${ctl("bpm")} min="15" max="300" step="1"  title="${TITLE.bpm}">`;
  const click = `<label class="chk" title="${TITLE.click}"><input type="checkbox" data-role="click"${ctl("click")}> metronome</label>`;
  const pulse = `<span class="clk-pulse" data-role="pulse"${ids && ids.pulse ? ` id="${ids.pulse}"` : ""}></span>`;
  return rows === 2
    ? `<span class="clk-row">${split}${bpm}</span><span class="clk-row">${click}${pulse}</span>`
    : `${split}${bpm}${click}${pulse}`;
}

export function mountClock(ctx, host) {
  const d = ctx.doc, view = d.defaultView;
  const q = (role) => host.querySelector(`[data-role="${role}"]`);
  const sp = q("split"), bpm = q("bpm"), click = q("click"), pulse = q("pulse");
  let split = null;   // the last split heard, as the select's value ("2+2"), painted once the options exist
  const fillSplits = (meter) => {
    const cur = sp.value;
    sp.textContent = "";
    for (const opt of (SPLITS[meter] || SPLITS[4] || []).map((x) => (Array.isArray(x) ? x.join("+") : String(x)))) {
      const o = d.createElement("option"); o.value = opt; o.textContent = opt;
      sp.appendChild(o);
    }
    const want = split ?? cur;
    if ([...sp.options].some((o) => o.value === want)) sp.value = want;
  };
  fillSplits(4);
  sp.addEventListener("change", (e) => announce(d, CONFIG_CHANGED, { split: e.target.value.split("+").map(Number) }));
  click.addEventListener("change", (e) => announce(d, CLOCK, { click: e.target.checked }));
  bpm.addEventListener("change", (e) => {
    const v = +e.target.value;
    if (Number.isFinite(v)) announce(d, CLOCK, { bpm: v });
  });
  listen(d, CLOCK_STATE, (m) => {
    if (!m) return;
    if (typeof m.click === "boolean") click.checked = m.click;
    if (typeof m.bpm === "number") bpm.value = m.bpm;
    if (typeof m.meter === "number") fillSplits(m.meter);
  });
  /* ONE STATE, EVERY VIEW (night 69): a split set at one view is painted at every other — before tonight the one
   * view announced and never painted back, which was invisible while it was the only view */
  listen(d, CONFIG_CHANGED, (m) => {
    if (!m || !Array.isArray(m.split)) return;
    split = m.split.join("+");
    if ([...sp.options].some((o) => o.value === split)) sp.value = split;
  });
  let pulseT = null;
  listen(d, BEAT, (ev) => {
    if (ev && ev.sub) return;   // the pulse is the beat's, not the subdivision's (260929)
    pulse.style.background = "#B82929";
    if (pulseT) view.clearTimeout(pulseT);
    pulseT = view.setTimeout(() => { pulse.style.background = ""; }, 70);
  });
}
