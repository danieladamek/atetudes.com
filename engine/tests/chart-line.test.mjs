/* chart-line.test.mjs — THE FAMILY'S CHART LINE (night 43, 261007): one module, data in
 *
 * Daniel, 260907, with a screenshot of the Multetudes chart line: "and can we get this
 * standard across the etudes please?" engine/chart-line.mjs renders the strip the way
 * hub/modules/timeline-strip.mjs (the reference) drew it — bars of chips, widths from
 * beats, the current chip ringed and its bar shaded, the root-degree dot, the roman under
 * the symbol, an optional sub-line — from DATA the host supplies. It spells nothing,
 * derives nothing, owns no position: a click is handed back to the host through onPick.
 *
 *   - the dot: derived from the chip's degree, coloured FAM_COLOR[FAM[degree]] (the one
 *     palette) — an off-key root wears NONE, honestly: not grey, not the nearest degree
 *   - the roman is data (the spelling gate, built for KEEP): the module draws what it is
 *     handed and does not spell
 *   - the sub-line exists only when the host supplies one; a host with no reference gets
 *     no sub-line, not an empty one
 *   - the styles are one string, scoped under the host's own strip id, the sub-line rules
 *     only for a host that asks for them (a door's stylesheet must name a token the host
 *     owns; a rule that matches nothing is an orphan the gate refuses)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDoc } from "./_dom-stub.mjs";
import { renderChartLine, chartLineStyles, CHART_LINE_CSS, CHART_LINE_SUBLINE_CSS } from "../chart-line.mjs";
import { FAM, FAM_COLOR } from "../degree-palette.mjs";

const chip = (symbol, degree, roman, beats = 1, extra = {}) => ({ symbol, degree, roman, beats, ...extra });
const walk = (el, out = []) => { out.push(el); for (const c of el.childNodes || []) walk(c, out); return out; };
const byClass = (host, cls) => walk(host).filter((e) => (e.attributes && e.attributes.class || "").split(" ").includes(cls));
const dotsOf = (host) => walk(host).filter((e) => e.attributes && e.attributes["data-role"] === "degree-dot");

test("the dot: every on-key chip wears its degree's colour from the one palette; an off-key root wears none", () => {
  const d = makeDoc(); const host = d.createElement("div");
  const bars = [[chip("Bbmaj7", 0, "I", 2), chip("Db7", -1, "—", 2)], [chip("Cm7", 1, "ii"), chip("F7", 4, "V"), chip("X", undefined, "")]];
  renderChartLine(host, { doc: d, bars, index: 0, onPick: () => {} });
  const dots = dotsOf(host);
  assert.equal(dots.length, 3, "three chips have a degree; two do not");
  assert.deepEqual(dots.map((x) => x.attributes["data-deg"]), ["R", "2", "5"]);
  for (const x of dots) assert.equal(x.style.background, FAM_COLOR[x.attributes["data-deg"]], "the dot's colour IS the palette's for its family");
  const chips = walk(host).filter((e) => e.tagName === "BUTTON");
  assert.equal(chips.length, 5);
  const db7 = chips[1];
  assert.equal(dotsOf(db7).length, 0, "Db7 in Bb: off-key, no dot");
  assert.ok(!walk(db7).some((e) => e.style && e.style.background), "…and nothing grey stands in for it");
  // every degree, every colour — the map is read, never restated here
  const all = d.createElement("div");
  renderChartLine(all, { doc: d, bars: [FAM.map((_, i) => chip("c" + i, i, "r"))], index: 0, onPick: () => {} });
  assert.deepEqual(dotsOf(all).map((x) => x.style.background), FAM.map((f) => FAM_COLOR[f]));
});

test("the roman is data: the module draws what it is handed, spells nothing, and a chip without one has no roman line", () => {
  const d = makeDoc(); const host = d.createElement("div");
  renderChartLine(host, { doc: d, bars: [[chip("Bm7b5", 6, "viiø7"), chip("Bm7b5", 6, "vii°"), chip("Bm7b5", 6, "")]], index: 1, onPick: () => {} });
  const rns = byClass(host, "tl-rn").map((e) => e.textContent);
  assert.deepEqual(rns, ["viiø7", "vii°"], "two spellings of one function, both drawn verbatim; the empty one draws nothing");
  assert.equal(dotsOf(host).length, 3, "the dot follows the degree, not the spelling");
});

test("the current chip and its bar; widths from beats; the click is the host's", () => {
  const d = makeDoc(); const host = d.createElement("div"); const picked = [];
  const bars = [[chip("A", 0, "I", 3), chip("B", 1, "ii", 1)], [chip("C", 2, "iii", 4)]];
  renderChartLine(host, { doc: d, bars, index: 2, onPick: (i) => picked.push(i) });
  const barEls = host.childNodes;
  assert.equal(barEls.length, 2);
  assert.deepEqual(barEls.map((b) => b.attributes.class), ["tl-bar", "tl-bar tl-curbar"]);
  const chips = walk(host).filter((e) => e.tagName === "BUTTON");
  assert.deepEqual(chips.map((c) => c.attributes.class || ""), ["", "", "tl-cur"]);
  assert.deepEqual(chips.map((c) => c.style.flex), ["3 1 0", "1 1 0", "4 1 0"]);
  assert.deepEqual(chips.map((c) => c.title), ["bar 1, 3 beats", "bar 1, 1 beat", "bar 2, 4 beats"]);
  assert.deepEqual(chips.map((c) => c.attributes["data-tlchip"]), ["A", "B", "C"]);
  assert.equal(host.attributes["data-tlline"], "A B C"); assert.equal(host.attributes["data-tlbars"], "2");
  chips[1].click();
  assert.deepEqual(picked, [1], "a click hands the chip's index to the host — the module owns no position");
  // the top line is the symbol, first in reading order after the dot
  assert.equal(walk(chips[0]).filter((e) => e.tagName === "SPAN")[0].textContent, "A");
});

test("the sub-line exists only where the host supplies one — no reference, no sub-line, not an empty one", () => {
  const d = makeDoc(); const host = d.createElement("div");
  renderChartLine(host, { doc: d, bars: [[chip("Bbmaj7", 0, "I", 4, { us: "Dm7", slash: "Bbmaj7/D" }), chip("Ebmaj7", 3, "IV", 4, { slash: "Ebmaj7/G" }), chip("F7", 4, "V", 4)]], index: 0, onPick: () => {} });
  const chips = walk(host).filter((e) => e.tagName === "BUTTON");
  assert.deepEqual(byClass(chips[0], "tl-us").map((e) => e.textContent), ["Dm7"]);
  assert.deepEqual(byClass(chips[0], "tl-slash").map((e) => e.textContent), ["Bbmaj7/D"]);
  assert.equal(byClass(chips[1], "tl-us").length, 0); assert.equal(byClass(chips[1], "tl-slash").length, 1);
  assert.equal(byClass(chips[2], "tl-us").length + byClass(chips[2], "tl-slash").length, 0);
  assert.ok(!walk(chips[2]).some((e) => (e.attributes && e.attributes.class || "").match(/tl-us|tl-slash/)), "no empty sub-line element either");
});

test("the styles: one string, scoped under the host's strip; the sub-line rules only on request; the one set of names", () => {
  const a = chartLineStyles("#tlScroll", { subline: true }), b = chartLineStyles("#tlBars");
  assert.ok(a.includes("#tlScroll .tl-bar{") && a.includes("#tlScroll .tl-bar button.tl-cur{") && a.includes("#tlScroll .tl-bar button .tl-dot{"));
  assert.ok(a.includes(".tl-us") && a.includes(".tl-slash"), "asked for: the sub-line rules");
  assert.ok(!b.includes(".tl-us") && !b.includes(".tl-slash"), "not asked for: no sub-line rules — a rule that matches nothing is an orphan");
  assert.ok(!a.includes("SCOPE") && !b.includes("SCOPE"), "every scope placeholder substituted");
  assert.equal(a.replace(/#tlScroll/g, "S").replace(chartLineStyles("S", { subline: true }), ""), "", "one source: the scope is the only difference");
  assert.ok(CHART_LINE_CSS.startsWith("SCOPE{") && CHART_LINE_SUBLINE_CSS.startsWith("SCOPE "), "the strings are the source the bridge slices");
  for (const twin of [".tlbar", ".tlrn", "button.cur", ".curbar", ".tlscroll"])
    assert.ok(!(CHART_LINE_CSS + CHART_LINE_SUBLINE_CSS).includes(twin), `the near-miss twin ${twin} is gone — one set of names`);
  // the colour of the dot is never in the stylesheet: it is the palette's, painted per chip
  assert.ok(!/#[0-9A-Fa-f]{6}/.test(CHART_LINE_CSS.replace(/#B9B9BF|#E9E9EC/g, "")), "no degree colour in the CSS — only the strip's own two greys");
});
