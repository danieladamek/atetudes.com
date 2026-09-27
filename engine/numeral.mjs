/* numeral.mjs — THE CHORD'S NUMERAL, spelled by the roman GRAMMAR (night 71, PO ruling 261029b).
 *
 * The grammar is engine/chord.mjs's ROMAN_RE — the parser this codebase reads romans with — and an emitted roman must
 * parse. It is smaller than a chord symbol because CASE carries the third and the SUFFIX carries the seventh:
 *   major triad + maj7 → IVmaj7    minor triad + b7 → ii7 (lower case already says minor)    dominant → V7
 *   half-diminished → viiø7        diminished seventh → vii°7      augmented → III+    triads → I, ii, vii°
 * Read off the chord's own tones (the readout's derivation: its roles and pitch classes) — case from the third, the
 * mark from the fifth, the suffix from the seventh. No table of chord names.
 *
 * WHY NOT AN EXISTING SPELLER (the roman estate, night 71's run note): tetrad-sequence.mjs's romanOf writes the minor
 * seventh "-7", which the grammar REJECTS (the same reason "∆7" was refused); progression.mjs's inner romanOf spells the
 * triad only. Neither is changed tonight — tetradetudes' published labels do not move. Consolidating the family's roman
 * spellers is filed, not done.
 */
import { parseRoman } from "./chord.mjs";

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];
const mod12 = (x) => ((x % 12) + 12) % 12;

/** the numeral for a chord in the key: `degree` 0…6 (or < 0 for an off-key root), `rootPc`, and its `tones`
 * ({ role: "R" | "3" | "5" | "7" | …, pc }). Returns "—" for an off-key root. */
export function grammarRoman({ degree, rootPc, tones }) {
  if (!(degree >= 0 && degree <= 6)) return "—";
  const at = (role) => {
    const t = (tones || []).find((x) => String(x.role) === role);
    return t ? mod12(t.pc - rootPc) : null;
  };
  const third = at("3"), fifth = at("5"), seventh = at("7");
  const minor = third === 3;
  let out = minor ? NUMERALS[degree].toLowerCase() : NUMERALS[degree];
  if (fifth === 6) out += seventh === 10 ? "ø" : "°";
  else if (fifth === 8) out += "+";
  if (seventh === 11) out += "maj7";
  else if (seventh === 10 || seventh === 9) out += "7";
  return out;
}

/* ---------------- load-time assertions (golden rule 1, site form) ---------------- */
{
  const cases = [
    [{ degree: 3, rootPc: 3, tones: [{ role: "R", pc: 3 }, { role: "3", pc: 7 }, { role: "5", pc: 10 }, { role: "7", pc: 2 }] }, "IVmaj7"],
    [{ degree: 1, rootPc: 0, tones: [{ role: "R", pc: 0 }, { role: "3", pc: 3 }, { role: "5", pc: 7 }, { role: "7", pc: 10 }] }, "ii7"],
    [{ degree: 4, rootPc: 5, tones: [{ role: "R", pc: 5 }, { role: "3", pc: 9 }, { role: "5", pc: 0 }, { role: "7", pc: 3 }] }, "V7"],
    [{ degree: 6, rootPc: 9, tones: [{ role: "R", pc: 9 }, { role: "3", pc: 0 }, { role: "5", pc: 3 }, { role: "7", pc: 7 }] }, "viiø7"],
    [{ degree: 6, rootPc: 11, tones: [{ role: "R", pc: 11 }, { role: "3", pc: 2 }, { role: "5", pc: 5 }, { role: "7", pc: 8 }] }, "vii°7"],
    [{ degree: 0, rootPc: 0, tones: [{ role: "R", pc: 0 }, { role: "3", pc: 4 }, { role: "5", pc: 7 }] }, "I"],
  ];
  for (const [c, want] of cases) {
    const got = grammarRoman(c);
    if (got !== want) throw new Error(`numeral: expected ${want}, spelled ${got}`);
    if (parseRoman(got) === null) throw new Error(`numeral: "${got}" does not parse against the roman grammar`);
  }
}
