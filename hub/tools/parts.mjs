/* parts.mjs — the parts primitive's two functions, stated once.
 *
 * MOVED from build.mjs (night 35, 260929) verbatim, so that a TEST can import
 * them: the hand-authored studies now carry notepad-card's markup in one of
 * the build's own assemblies (unseated, or the pad seated as multetudes seats
 * it), and host-conformance pins those bytes with THIS function rather than a
 * second copy of the regex. build.mjs cannot be imported by a test — it builds
 * every door on import — which is the one reason these live here. Behaviour
 * unchanged: every door rebuilt byte-identical on the move (the additive
 * proof). */
export const PART_OPEN = /<!--part:([\w-]+)-->/g;
export const PART_REGION = /<!--part:([\w-]+)-->([\s\S]*?)<!--\/part:\1-->/g;

/** the named parts of a markup string: Map(name → concatenated regions) */
export function partsOf(markup) {
  const out = new Map();
  for (const m of markup.matchAll(PART_REGION))
    out.set(m[1], (out.get(m[1]) ?? "") + m[2]);
  // an unpaired marker is a silent half-part — refuse it by name
  const opens = [...markup.matchAll(PART_OPEN)].length;
  const paired = [...markup.matchAll(PART_REGION)].length;
  if (opens !== paired)
    throw new Error(`a part marker is unpaired (${opens} opens, ${paired} paired regions) — ` +
      "an unpaired marker would ship half a part in silence");
  return out;
}

/** the module's markup with `seated` parts removed and all markers stripped —
 * the default assembly when `seated` is empty. NO trim: the old path passed
 * markup through verbatim, and a stripped leading newline is a byte moved in
 * every door (the additive proof caught exactly that on this function's first
 * draft, 2026-08-30). */
export function markupWithout(markup, seated) {
  return markup
    .replace(PART_REGION, (whole, name, inner) => (seated.has(name) ? "" : inner));
}
