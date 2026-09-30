/* bpm-field.mjs — THE FAMILY'S ONE TYPEABLE TEMPO: its markup and its look, stated once (night 77, ruling 261036 §5).
 *
 * Daniel, 261035: "I'd like the tempo field in the metronome to be editable not just controlled by the slider ... like
 * it is everywhere else." Until tonight the family had ONE typeable bpm — the clock view's, seated on the neck — and two
 * read-only readouts, the Metronome card's and the Transport card's. Now all three seats are THIS field: the clock view
 * seats it, the Metronome card seats it (the card that owns the clock), and the Transport card seats it.
 *
 * WHY ITS OWN FILE AND NOT AN EXPORT OF THE CLOCK VIEW (the dispatch's wording; measured tonight, rule 4): a module that
 * imports the clock view REACHES it, and a door that reaches the clock view ships all of it — its code and its grammar.
 * The two cards are in every door; the clock view is in two. The door gate's pruning grep refused the plain and scribe
 * doors for exactly that. The field alone is what the cards need, so the field alone is what they reach. (This header
 * ships in every door, so it names no other module's path or addresses — the same grep reads it.)
 *
 * A VIEW, NOT AN OWNER: a seat announces a CLOCK request on `change`, the Metronome card clamps (15–300, from its
 * slider's own bounds), and every seat paints only what the owner echoes (rule 10 — a control's state has three sites).
 * Its look ships with the build to any door that reaches this file, and to a page without a build through the
 * generator bridge — the bytes below, never retyped.
 */

const TITLE = "the tempo — one state, every view; the Metronome card owns the clock";

/** the field's markup. `id` keeps a seat's address (rule 12); `value` is the seat's boot face — the card seats pass
 * hub/tempo.mjs's constant, the clock view passes none. */
export function bpmField({ id = null, value = null } = {}) {
  const ctl = id ? ` id="${id}" data-control="${id}"` : "";
  const val = value === null ? "" : ` value="${value}"`;
  return `<input type="number" class="clk-bpm" data-role="bpm"${ctl} min="15" max="300" step="1"${val}  title="${TITLE}">`;
}

/** the field's look — the neck's bpm box, byte for byte since night 69 */
export const BPM_FIELD_STYLES = `
.clk-bpm{font:inherit;font-size:12.5px;width:58px;padding:3px 5px;border:1px solid var(--line);
  border-radius:6px;color:var(--ink)}
`;
