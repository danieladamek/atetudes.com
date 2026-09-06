/* marks.mjs — the shapes the family draws, stated once (night 36, 260930).
 *
 * Design Spec v1.4 §2.6: SHAPE CARRIES CHROMATICITY. A non-diatonic note
 * draws as a STARBURST, a diatonic note stays a circle; colour tracks the
 * degree the note alters (palette.mjs supplies it — this module supplies no
 * colour). The geometry is the render's finding, not a taste: eight points
 * with the inner radius at 0.70 kept the silhouette open at 0.6 of r 10.5 in
 * silver and in ink, where ten and twelve points closed into a rough ring
 * (notes/working/shots-260930). A helper like bus.mjs or palette.mjs — no
 * markup, no styles, no control — so the resolver treats it as reached code.
 */
export const STARBURST = Object.freeze({ points: 8, inner: 0.70 });

/** the polygon points of a starburst centred at (cx, cy) with outer radius r —
 * the same silhouette at every size, a point straight up */
export function starburst(cx, cy, r, { points = STARBURST.points, inner = STARBURST.inner } = {}) {
  const pts = [];
  for (let i = 0; i < 2 * points; i++) {
    const rr = i % 2 ? r * inner : r, a = (Math.PI * i) / points - Math.PI / 2;
    pts.push((cx + rr * Math.cos(a)).toFixed(2) + "," + (cy + rr * Math.sin(a)).toFixed(2));
  }
  return pts.join(" ");
}
{
  // the ruling's geometry, asserted at load: a starburst is never a circle in disguise
  if (!(STARBURST.points >= 6 && STARBURST.inner < 0.85 && STARBURST.inner > 0.5))
    throw new Error("marks: the starburst must keep an open silhouette (points ≥ 6, inner radius 0.5–0.85)");
  if (starburst(0, 0, 10).split(" ").length !== 2 * STARBURST.points) throw new Error("marks: starburst emits one vertex per point and valley");
}
