/* embed-fit.test.mjs — THE PASTED FRAME'S ARITHMETIC (261123, *Player - the frame fits the étude, no white space under
 * it*). The browser half — the CSS this writes, laid out in a real page, holding the real player at widths nobody
 * sampled — is hub/tests/multetudes_link.py §3; this holds the numbers it is written from. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fitStretches, frameAt, paddingExpr, embedMarkup, isJump, FIT_WIDTHS, HEIGHT_MSG, MEASURE_MSG } from "../embed-fit.mjs";

/* a player-shaped curve: climbing lines broken by rewraps, a big drop where the neck leaves its phone window, flat
 * past the page's widest — the shape measured on the corpus, 261123 */
const curve = (w) => w <= 600 ? (w <= 450 ? 640 + 0.55 * (w - 300) : 610 + 0.55 * (w - 450)) + (w > 520 ? 20 : 0)
  : w < 1200 ? 470 + 0.2 * (w - 600) : 590;
const sampled = FIT_WIDTHS.map((w) => [w, Math.ceil(curve(w))]);

test("the widths run from a narrow column to a wide pane, every 10 px", () => {
  assert.equal(FIT_WIDTHS[0], 300); assert.equal(FIT_WIDTHS.at(-1), 1300);
  assert.ok(FIT_WIDTHS.every((w, i) => !i || w - FIT_WIDTHS[i - 1] === 10));
  assert.notEqual(HEIGHT_MSG, MEASURE_MSG);
});

test("the frame is never shorter than the player at a measured width, and at most tol + pad taller", () => {
  for (const tol of [8, 12, 24]) {
    const st = fitStretches(sampled, { tol, pad: 6 });
    for (const [w, h] of sampled) {
      const f = frameAt(st, w);
      assert.ok(f >= h, `tol ${tol}: ${w} px — frame ${f} under the player's ${h}`);
      assert.ok(f - h <= tol + 6 + 1, `tol ${tol}: ${w} px — frame ${f} is ${f - h} over the player's ${h}`);
    }
  }
});

test("in the gap where the player jumps, BOTH neighbouring lines hold, so either side of the jump fits", () => {
  const st = fitStretches(sampled);
  const i = st.findIndex((s) => s.b === 600);
  assert.ok(i >= 0 && st[i + 1].a === 610, `a stretch ends at 600 and the next starts at 610: ${JSON.stringify(st.map((s) => [s.a, s.b]))}`);
  for (const w of [601, 605, 609]) assert.ok(frameAt(st, w) >= Math.ceil(curve(600)), `${w} px holds the phone neck's height`);
  assert.ok(frameAt(st, 610) < Math.ceil(curve(600)), "at 610 (measured) only its own line holds");
});

test("a jump is told from a climb", () => {
  assert.equal(isJump([600, 700], [610, 500]), true);
  assert.equal(isJump([300, 600], [310, 605]), false);   // the steepest climb, 0.55 px a px
  assert.equal(isJump([600, 700], [601, 500]), false);   // a pixel apart: known to the pixel, nothing left to halve
});

test("the CSS says what frameAt computes: one line per stretch, gated half a pixel inside its neighbours' samples", () => {
  const st = fitStretches(sampled), css = paddingExpr(st);
  assert.ok(css.startsWith("max(min("), css.slice(0, 40));
  assert.equal((css.match(/min\(/g) || []).length, st.length);
  for (let i = 1; i < st.length; i++) {
    assert.ok(css.includes(`(100% - ${st[i - 1].b + 0.5}px) * 100000`), `stretch ${i} opens past ${st[i - 1].b}`);
    assert.ok(css.includes(`(${st[i].a - 0.5}px - 100%) * 100000`), `stretch ${i - 1} closes before ${st[i].a}`);
  }
  // a single stretch is just its line
  assert.equal(paddingExpr([{ a: 300, b: 1300, s: 0, c: 500 }]), "500px");
  assert.equal(paddingExpr([{ a: 300, b: 1300, s: 0.2, c: 500 }]), "calc(20% + 500px)");
});

test("the markup: A's one number first, the width-following line after it; unmeasured, the general height", () => {
  const st = fitStretches(sampled), tallest = Math.max(...sampled.map((x) => x[1]));
  const m = embedMarkup({ src: "https://x/embed/#etude=a", open: "https://x/s.html#etude=a", height: 760, fit: { stretches: st, tallest } });
  assert.ok(m.includes(`padding-top:${tallest}px;padding-top:${paddingExpr(st)}"`), "A's number, then B's line, in one style");
  assert.ok(m.includes(`width="100%" height="${tallest}"`), "with no style at all, the iframe's own attributes hold A's number");
  assert.ok(m.includes('<p><a href="https://x/s.html#etude=a">Play this étude on At-Etudes</a></p>'));
  const g = embedMarkup({ src: "https://x/embed/#etude=a", open: "https://x/s.html#etude=a", height: 760 });
  assert.equal(g, '<iframe src="https://x/embed/#etude=a" title="An étude on the neck, from At-Etudes" loading="lazy" ' +
    'style="display:block;width:100%;height:760px;border:0"></iframe>\n<p><a href="https://x/s.html#etude=a">Play this étude on At-Etudes</a></p>\n');
});

test("nothing measured is refused by name", () => {
  assert.throws(() => fitStretches([]), /no measured heights/);
  assert.throws(() => fitStretches([[300, 0]]), /no measured heights/);
});
