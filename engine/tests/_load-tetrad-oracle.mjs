/* _load-tetrad-oracle.mjs — the frozen study's payload, READ-ONLY.
 *
 * `static/studies/tetrad-voice-leading/study.html` is 1,184,559 bytes across 386
 * lines, of which ONE line is 1,164,245 bytes of precomputed known-good
 * voicings. Family spec §5.2.1 preserves that study precisely so this corpus
 * stays live: "the oracle stays live… a running reference".
 *
 * This loader reads it and never writes it. The study is FROZEN — no item may
 * modify it, and this one touches nothing under static/ at all.
 *
 * SHAPE, derived by inspection and asserted below so a payload that changed
 * shape fails loudly instead of silently pinning the wrong thing:
 *
 *   passes[engine][scale][set][key][bottom][step] → leaf
 *   leaf = [symbol, roman, inversionName, frets[4], degreeLabels[4]]
 *
 *   engines 5   Scaler · Cycling 4ths · Cycling 5ths · Cycling 6ths · Cycling 3rds
 *   scales  3   Major · Harmonic Minor · Melodic Minor
 *   sets    3   E–A–D–G · A–D–G–B · D–G–B–E   (adjacent four-string groups)
 *   keys   12
 *   bottoms 4   R · 3 · 5 · 7   (which chord tone is in the bass)
 *   steps   8
 *
 * 5 × 3 × 3 × 12 × 4 × 8 = 17,280 voicings.
 *
 * EVERY VOICING IN THE PAYLOAD IS A DROP-2. That is a finding about the corpus,
 * not an assumption: the four distinct tone orderings it contains are exactly
 * the four drop-2 inversions, and the suite asserts it. The payload therefore
 * cannot witness drop-3, close position, the shells or rootless — which is what
 * the item means by "the texture the frozen study cannot show today".
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const STUDY = join(here, "..", "..", "static", "studies",
  "tetrad-voice-leading", "study.html");

/** the payload line, parsed. Read-only: the file is opened for reading and
 * nothing in this module writes to it. */
export function loadOracle() {
  const lines = readFileSync(STUDY, "utf8").split("\n");
  const line = lines.find((l) => l.includes("const DATA = {"));
  if (!line)
    throw new Error("no `const DATA = {` line in the frozen study — payload layout changed");
  const data = JSON.parse(line.slice(line.indexOf("{"), line.lastIndexOf("}") + 1));

  for (const k of ["engines", "passes", "keys", "scales", "bottoms", "sets"])
    if (!(k in data)) throw new Error(`oracle payload is missing "${k}"`);
  if (data.passes.length !== data.engines.length)
    throw new Error("oracle: passes and engines disagree on length");
  return data;
}

/** Flatten to a list of {symbol, frets, degrees, set, opens, key, bottom,
 * engine, scale}. One pass over 17,280 leaves. */
export function oracleVoicings(data = loadOracle()) {
  const out = [];
  for (const [e, eng] of data.passes.entries())
    for (const [s, sc] of eng.entries())
      for (const [si, st] of sc.entries())
        for (const [k, ky] of st.entries())
          for (const [b, bt] of ky.entries())
            for (const [step, leaf] of bt.entries()) {
              const [symbol, roman, inversion, frets, degrees] = leaf;
              out.push({
                symbol, roman, inversion, frets, degrees, step,
                engine: data.engines[e].key, scale: data.scales[s].key,
                setIndex: si, opens: data.sets[si].opens,
                key: data.keys[k], bottom: data.bottoms[b],
              });
            }
  return out;
}

/** midi values of a leaf, low → high */
export const midisOf = (v) => v.frets.map((f, i) => v.opens[i] + f);
