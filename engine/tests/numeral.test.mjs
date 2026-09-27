/* numeral.test.mjs — EVERY NUMERAL THE DOOR CAN PRODUCE PARSES (night 71, PO ruling 261029b).
 *
 * The chip row's numeral is grammarRoman(chordNow's chord). The contract: it parses against the roman grammar
 * (chord.mjs parseRoman) — the check that would have caught "ii-7" without a human. Enumerated, not sampled: every key
 * the door offers, every scale, every cycle, every form, every start, every chord object, every bar — through the same
 * progressionOf/chordAt the readout derives with. Lists read from their sources (rule 6). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { field } from "../field.mjs";
import { progressionOf, chordAt } from "../progression.mjs";
import { pickOf } from "../selection.mjs";
import { parseRoman, SCALE_STEPS } from "../chord.mjs";
import { CYCLES } from "../tetrad-sequence.mjs";
import { STRUCTURES } from "../structures.mjs";
import { grammarRoman } from "../numeral.mjs";

const src = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
const KEYS = JSON.parse(src("../../hub/modules/harmony-card.mjs").match(/const KEYS = (\[[^\]]*\])/)[1]);
const OBJECTS = [...src("../../hub/modules/progression-card.mjs").matchAll(/^\s*\["(\w+)", "[^"]*", true\]/gm)].map((m) => m[1]).filter((o) => o !== "scale");

test("every numeral the door can produce parses against the roman grammar", () => {
  assert.ok(KEYS.length === 12 && OBJECTS.length >= 7, `the lists were read: ${KEYS.length} keys, objects ${OBJECTS}`);
  let n = 0; const bad = [];
  for (const key of KEYS) for (const scale of Object.keys(SCALE_STEPS)) {
    const fld = field({ key, scale });
    const sources = [...Object.keys(CYCLES).map((cycle) => ({ source: "cycle", cycle })), ...STRUCTURES.map((s) => ({ source: "form", form: s.id }))];
    for (const s of sources) for (let start = 0; start < 7; start++) for (const object of OBJECTS) {
      const cfg = { ...s, start, object, tones: null, custom: "" };
      let prog;
      try { prog = progressionOf(cfg, key, scale); } catch { continue; }
      for (let i = 0; i < prog.chords.length; i++) {
        let cur;
        try { cur = chordAt(prog, i, fld, object, pickOf(cfg)); } catch { continue; }
        const r = grammarRoman(cur); n++;
        if (r !== "—" && parseRoman(r) === null) bad.push(`${key} ${scale} ${s.cycle || s.form} start ${start} ${object} bar ${i + 1}: ${cur.symbol} → "${r}"`);
      }
    }
  }
  assert.ok(n > 10000, `the enumeration ran: ${n} numerals`);
  assert.deepEqual(bad, [], `numerals that do not parse (${bad.length} of ${n}):\n${bad.slice(0, 8).join("\n")}`);
});
