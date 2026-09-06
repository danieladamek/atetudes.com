/* marks.test.mjs — the starburst is a shape, stated once (night 36) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { STARBURST, starburst } from "../marks.mjs";

test("the starburst: eight points, inner radius 0.70, one vertex per point and valley, a point straight up", () => {
  assert.deepEqual({ ...STARBURST }, { points: 8, inner: 0.70 });
  const pts = starburst(20, 20, 10).split(" ").map((p) => p.split(",").map(Number));
  assert.equal(pts.length, 16);
  assert.deepEqual(pts[0], [20, 10], "the first vertex is the top point");
  const radii = pts.map(([x, y]) => Math.hypot(x - 20, y - 20));
  radii.forEach((r, i) => assert.ok(Math.abs(r - (i % 2 ? 7 : 10)) < 0.02, `vertex ${i} sits at ${i % 2 ? "the valley" : "the point"}`));
});

test("the silhouette scales, never changes: 0.6 of the host is the same shape at 0.6 of the size", () => {
  const big = starburst(0, 0, 13).split(" ").map((p) => p.split(",").map(Number));
  const small = starburst(0, 0, 13 * 0.6).split(" ").map((p) => p.split(",").map(Number));
  big.forEach(([x, y], i) => { assert.ok(Math.abs(x * 0.6 - small[i][0]) < 0.02 && Math.abs(y * 0.6 - small[i][1]) < 0.02); });
});
