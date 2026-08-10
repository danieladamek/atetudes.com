/* _load-triadetudes.mjs — extracts the shipped Triadetudes engine for headless tests.
 *
 * Reads static/studies/triadetudes/study.html VERBATIM (never modifies it), slices
 * its <script> up to the audio section — everything musical is above that line; DOM,
 * audio and rendering are below it — and evaluates the slice in a vm sandbox. The
 * harvest line exposes the pure functions and the st state object.
 *
 * If the study file's internal layout changes (the marker comment moves or a
 * harvested symbol disappears), this loader throws loudly rather than pinning the
 * wrong thing.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const STUDY = join(here, "..", "..", "static", "studies", "triadetudes", "study.html");
const CUT = "/* ============ audio ============ */";

const HARVEST = [
  "accOf", "pcOf", "buildScale", "pcName", "triadPcs", "chordName", "ivlOf",
  "scaleData", "buildSequence", "voicingsFor", "chooseVoicings",
  "scaleFretsOnString", "defaultPivots", "defaultArpPattern", "parseArp",
  "writtenValue", "subdivisionName", "bassPcFor", "tetradName", "arpOnsets",
  "pivotContext", "changeSet", "changeKey", "changeScale",
  "fmtWhen", "logToMarkdown", "parseLogExport", "mergeLog",
  "st", "SCALES", "SPLITS", "OPEN", "NFRETS", "KEYS", "IVL_LABEL", "IVL_FAMILY",
];

/** vm-realm values fail strict deepEqual against host literals (different Array
 * prototype). unwrap() normalizes any data structure into the host realm. */
export const unwrap = (x) => JSON.parse(JSON.stringify(x));

export function loadTriadetudesEngine() {
  const html = readFileSync(STUDY, "utf8");
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("no <script> block found in study.html");
  const cut = m[1].indexOf(CUT);
  if (cut < 0)
    throw new Error(`marker "${CUT}" not found — study layout changed; re-derive the loader`);
  const src = m[1].slice(0, cut);
  const harvest = `\n;globalThis.__ENGINE__ = { ${HARVEST.join(", ")} };`;
  const context = vm.createContext({ console });
  vm.runInContext(src + harvest, context, { filename: "triadetudes-engine-slice.js" });
  const eng = context.__ENGINE__;
  for (const name of HARVEST)
    if (eng[name] === undefined)
      throw new Error(`harvested symbol "${name}" missing — study engine changed shape`);
  return eng;
}
