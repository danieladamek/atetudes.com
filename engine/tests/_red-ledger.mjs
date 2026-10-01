/* _red-ledger.mjs — THE ROOT'S RED: its grants, its open questions, its ledger, and their pure judgement — ONE place
 * (night 81). Moved out of degree-red.test.mjs so the door gate's EFFECT-SCAN (hub/tests/door_locks.py) reads the very
 * same ledger the line check reads: a test file cannot be imported for its data without running its tests. Rule 6 —
 * one ledger, two readers: the line check (engine/tests/degree-red.test.mjs) and the effect-scan (the door gate).
 */
/* THE GRANTS — decisions Daniel MADE, each one a numbered BORROWING in the Spec's closed list (v1.5, §7 rule 8: "The
 * Root's red is deliberately borrowed in three places, and only these three … A fourth borrowing is a Spec amendment,
 * not a judgement"). The list is READ FROM THE SPEC (specBorrowings, below): a grant citing a borrowing the Spec does
 * not list is malformed, and so is a listed borrowing no grant covers. A grant never expires, and pins its site count —
 * an entry is removed or added only by a new ruling.
 *
 * `role` (night 81) is what the door gate's EFFECT-SCAN holds each borrowing's PAINTED elements to, when a stylesheet
 * rule painted them (a rule can reach more than its grant intended — Save under Play's rule, night 80). Borrowings 1 and
 * 2 are addresses (rule 12). Borrowing 3 is a vocabulary of ROLE NAMES on the element or an ancestor (its id, class or
 * data-* names) — the weakest of the three: it trusts the names its rules were written with. */
/** the KEY's address (register 35: --red means the key) — the one place the key's red may paint (night 81) */
export const KEY_ROLE = "#hcKey";

export const GRANTS = {
  "rule8-borrowing-1": { borrowing: 1, title: "the transport's Play", sites: 2,
    role: { address: "#playBtn, [data-control=\"playBtn\"]" }, granted: "Spec v1.5 §7 rule 8, borrowing 1 — the transport's Play " +
    "(Daniel, 2026-08-19, shell parity N2: \"more obvious that it is a play button\"). NARROWED to Play by role, " +
    "2026-10-01 (Daniel: \"nobody decided Save should be red — a selector did\")." },
  "rule8-borrowing-2": { borrowing: 2, title: "the metronome's first beat of a measure", sites: 5,
    /* the FIRST beat, not the whole lamp (night 81 design review) */
    role: { address: "#beatLamp > :first-child" }, granted: "Spec v1.5 §7 rule 8, borrowing 2 — the metronome's first beat " +
    "of a measure (Daniel, 2026-08-19, shell parity N3)." },
  "rule8-borrowing-3": { borrowing: 3, title: "refusal, error and destructive actions", sites: 26,
    role: { names: "err|danger|refus|assert" }, granted: "Spec v1.6 §7 rule 8, " +
    "borrowing 3 — refusal, error and destructive actions: the places the app says no, and the controls that discard " +
    "(Daniel, 2026-10-01: \"context removes any confusion about the meaning of red\"). Re-read and re-granted night 81 " +
    "under the v1.6 words; the 26 sites are the set ratified as they stood (draft 261046) — v1.5's \"refusal and alarm " +
    "text\" covered only 20 of them." },
};

/* THE OPEN QUESTIONS — decisions still to be made. Closing one (open: false) turns every entry AWAITING it red until its
 * sites are fixed. None is open since Spec v1.5; the alarm question is kept, answered, as the record of how it closed. */
export const RULINGS = {
  "261041b-alarm": { open: false, question: "How an alarm or status looks (night 78, part B).",
    answered: "Spec v1.5 §7 rule 8, borrowing 3 (Daniel, 2026-10-01) — the 26 sites keep the Root's red." },
};

/** the Spec's closed list of borrowings, read from rule 8's own text — { number → title } */
export function specBorrowings(specText) {
  const a = specText.indexOf("deliberately borrowed"), b = specText.indexOf("closed list", a);
  if (a < 0 || b < 0) throw new Error("the Spec's rule 8 states no closed list of borrowings — re-site specBorrowings");
  const out = new Map();
  for (const m of specText.slice(a, b).matchAll(/^>\s+(\d+)\.\s+\*\*(.+?)\*\*/gm)) out.set(Number(m[1]), m[2]);
  return out;
}

export const P = (slug) => `static/studies/${slug}/study.html`;
/* THE LEDGER — every use of the red outside the key, the token and the palette. Each entry is EITHER `granted` (cites a
 * GRANT, never expires) OR `awaiting` (cites an OPEN question, expires when it closes) — never both, never neither.
 * `match` identifies the line; `n` is how many lines. */
export const LEDGER = [
  // borrowing 1 — Play, BY ROLE (narrowed 2026-10-01)
  { where: "hub/modules/transport-card.mjs", match: "#playBtn{background:var(--red)", granted: "rule8-borrowing-1" },
  { where: P("triadetudes"), match: "#playBtn{background:var(--red)", granted: "rule8-borrowing-1" },
  // borrowing 2 — the first beat of a measure
  { where: "hub/modules/metronome-card.mjs", match: "#beatLamp span.acc{", granted: "rule8-borrowing-2" },
  { where: P("metronome"), match: "#beatLamp span.acc{", granted: "rule8-borrowing-2" },
  { where: P("triadetudes"), match: "#beatLamp span.acc{", granted: "rule8-borrowing-2" },
  { where: P("triadetudes"), match: "const LAMP={idle:", granted: "rule8-borrowing-2" },
  { where: P("modes-from-pentatonic-boxes"), match: "#beatLamp span.acc{", granted: "rule8-borrowing-2" },
  // borrowing 3 — refusal, error and destructive actions (26 sites, ratified as they stand; worded v1.6)
  { where: "hub/modules/notepad-card.mjs", match: ".hist .acts button.danger{", granted: "rule8-borrowing-3" },
  { where: "hub/modules/shape-motion.mjs", match: ".smErr{", granted: "rule8-borrowing-3" },
  { where: "hub/modules/neck-readout.mjs", match: "the centre cannot follow", granted: "rule8-borrowing-3" },
  { where: "hub/modules/neck-readout.mjs", match: "figure: ${fg.err}", granted: "rule8-borrowing-3" },
  { where: "hub/modules/neck-readout.mjs", match: "reference refused: the reference is relative", granted: "rule8-borrowing-3" },
  { where: "hub/modules/neck-readout.mjs", match: "reference refused: ${rp.reason}", granted: "rule8-borrowing-3" },
  { where: "hub/modules/neck-readout.mjs", match: "sounded bass silent: ${sb.reason}", granted: "rule8-borrowing-3" },
  { where: "hub/modules/neck-readout.mjs", match: "${a}</span>", granted: "rule8-borrowing-3" },
  { where: "hub/modules/neck-readout.mjs", match: "${msg}</span>", granted: "rule8-borrowing-3" },
  { where: "hub/modules/neck-readout.mjs", match: "String(e && e.message || e)", granted: "rule8-borrowing-3" },
  { where: "hub/modules/neck-readout.mjs", match: "a.style.fontWeight = \"bold\"", granted: "rule8-borrowing-3" },
  { where: "hub/modules/field-board.mjs", match: "fill: \"#B82929\" }, svg);", granted: "rule8-borrowing-3" },   // the field's refusal
  { where: "hub/modules/field-board.mjs", match: "noteEl.style.color = \"#B82929\"", granted: "rule8-borrowing-3" },   // the figure's error
  { where: "hub/modules/progression-card.mjs", match: "#pgNote.pg-err{", granted: "rule8-borrowing-3" },
  { where: "hub/modules/progression-card.mjs", match: "if (tonesErr) { note.style.color", granted: "rule8-borrowing-3" },
  { where: "hub/modules/score-board.mjs", match: "const fe = el(\"text\"", granted: "rule8-borrowing-3" },   // the figure refused
  { where: "hub/modules/staff-board.mjs", match: "\"data-strefuse\": ci", granted: "rule8-borrowing-3" },
  { where: P("metronome"), match: ".hist .acts button.danger{", granted: "rule8-borrowing-3" },
  { where: P("modes-from-pentatonic-boxes"), match: ".hist .acts button.danger{", granted: "rule8-borrowing-3" },
  { where: P("triadetudes"), match: ".hist .acts button.danger{", granted: "rule8-borrowing-3" },
  { where: P("triadetudes"), match: ".chips button.bd.err{", granted: "rule8-borrowing-3" },
  { where: P("triadetudes"), match: ".chips button.bd.err .eq{", granted: "rule8-borrowing-3" },
  { where: P("triadetudes"), match: ".chipEd .acts button.danger{", granted: "rule8-borrowing-3" },
  { where: P("triadetudes"), match: ".chipEd .err{", granted: "rule8-borrowing-3" },
  { where: P("triadetudes"), match: "<span id=\"arpErr\"", granted: "rule8-borrowing-3" },
  { where: P("triadetudes"), match: "const r=el(\"text\",{x:x+3,y:28,", granted: "rule8-borrowing-3" },   // typed symbol ≠ the reading
];

/** THE LEDGER'S JUDGEMENT, pure (night 79, PO ruling 261042 §2). stale: an entry's site count moved. expired: an
 * AWAITING entry whose question is no longer open. malformed: anything that would let a grant pass as a question or a
 * question as a grant — both keys or neither, a granted entry citing a question, an awaiting entry citing a grant, a grant
 * carrying an `open` flag, a key in both registries, or a grant whose entries no longer number its `sites`. */
export function judgeLedger({ ledger, hits, grants = {}, rulings = {}, borrowings = null }) {
  const stale = ledger.filter((e) => (hits.get(e) ?? 0) !== (e.n ?? 1))
    .map((e) => `${e.where} "${e.match}" — matched ${hits.get(e) ?? 0} line(s), the entry says ${e.n ?? 1}`);
  const malformed = [];
  for (const e of ledger) {
    const id = `${e.where} "${e.match}"`;
    if (("granted" in e) === ("awaiting" in e)) malformed.push(`${id} must be EITHER granted OR awaiting — it is ${"granted" in e ? "both" : "neither"}`);
    else if ("granted" in e && !grants[e.granted]) malformed.push(`${id} is granted by "${e.granted}", which is not a grant${rulings[e.granted] ? " (it is an open question)" : ""}`);
    else if ("awaiting" in e && !rulings[e.awaiting]) malformed.push(`${id} awaits "${e.awaiting}", which is not a question${grants[e.awaiting] ? " (it is a grant — a grant awaits nothing)" : ""}`);
  }
  for (const [k, gr] of Object.entries(grants)) {
    if (borrowings && !borrowings.has(gr.borrowing))
      malformed.push(`grant "${k}" cites borrowing ${gr.borrowing}, which the Spec's closed list does not hold (it lists ${[...borrowings.keys()].join(", ")}) — a fourth borrowing is a Spec amendment, not a judgement`);
    /* NOT BY NUMBER ALONE (night 81): a grant carries the Spec's WORDING of its borrowing, and that wording must still be
     * what rule 8 says — a reworded borrowing (v1.6 widened borrowing 3) is re-read and re-granted, never passed through
     * on its number. */
    else if (borrowings && gr.title !== borrowings.get(gr.borrowing))
      malformed.push(`grant "${k}" was made for borrowing ${gr.borrowing} as "${gr.title}", but the Spec now words it "${borrowings.get(gr.borrowing)}" — re-read the borrowing, then re-grant it under the new words`);
    if ("open" in gr) malformed.push(`grant "${k}" carries an open flag — a grant is a decision made, it cannot be closed`);
    if (rulings[k]) malformed.push(`"${k}" is both a grant and an open question`);
    const n = ledger.filter((e) => e.granted === k).length;
    if (n !== gr.sites) malformed.push(`grant "${k}" covers ${gr.sites} site(s) but ${n} entr${n === 1 ? "y cites" : "ies cite"} it — a granted entry is removed or added only by a new ruling`);
  }
  if (borrowings) for (const [n, title] of borrowings)
    if (!Object.values(grants).some((g) => g.borrowing === n)) malformed.push(`the Spec lists borrowing ${n} (${title}) but no grant covers it`);
  const expired = ledger.filter((e) => "awaiting" in e && rulings[e.awaiting] && !rulings[e.awaiting].open)
    .map((e) => `${e.where} "${e.match}" awaits "${e.awaiting}", which is ANSWERED`);
  return { stale, expired, malformed };
}
