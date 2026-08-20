/* THE FAMILY REGISTER — which pages are the family, what kind each one is, and
 * where its four floor surfaces live.
 *
 * WHY THIS FILE EXISTS (the gap of 260820): the carrier census (_carriers.mjs)
 * answers "which STUDIES carry this MODULE" — and answered it well enough to
 * drive three re-inlines. But this week ran three UI-idiom propagations (mute
 * icons, card grammar, info buttons) and every one of them answered "which
 * APPS carry this IDIOM" by hand — "both apps" meant the two Daniel was
 * looking at, in a family of five, and it left the appliance behind on
 * purpose, twice. The census cannot answer that question because an idiom is
 * not a module. THIS list answers it: a propagation's checklist is
 * `appsOf()`, not whatever was on screen.
 *
 * WHAT THE ENTRIES MEAN
 *   kind: "app"    — an interactive instrument; the conformance floor
 *                    (Ruling 2, 2026-08-19: metronome · transport ·
 *                    interactive neck · animated staff) binds it, and
 *                    tools/family_floor.py asserts the four surfaces at the
 *                    artifact level. Whether EVERY app owes ALL four is
 *                    Daniel's scope ruling — see the proposal
 *                    (notes/specs/) — so the suite runs against every entry
 *                    and absence is a REPORTED failure, filed, not hidden.
 *   kind: "chart"  — a published chart study (a page, not an instrument).
 *                    The floor does not bind it; the suite still runs it and
 *                    reports, so a chart study that grows controls cannot
 *                    drift into being an unregistered app.
 *
 *   surfaces: per-surface HANDLES — where the suite reaches each surface in
 *   THIS app. The suite asserts BEHAVIOUR through the handle (a click that
 *   sounds, a staff that changes during play); the handle is one line of data
 *   per app, which is how "the same knob under two idioms" gets named as one
 *   thing without the suite encoding either idiom. A surface with no handle
 *   entry is a surface the app DOES NOT HAVE — the suite fails it as absent,
 *   by name. Do not delete a failing entry to green the suite; that is §4.4's
 *   silent divergence, in the register.
 *
 * COMPLETENESS is asserted by family-register.test.mjs: every directory under
 * static/studies/ has exactly one entry here. A new study cannot ship
 * unregistered — the same "cannot slip in unpinned" rule the carrier census
 * enforces for modules.
 */

export const FAMILY = new Map([
  ["triadetudes", {
    kind: "app",
    surfaces: {
      metronome: { start: "#metroBtn" },
      transport: { play: "#playBtn" },
      /* the note handle targets the LISTENER group's circle — the neck's
       * first bare circles are inert markers, which the suite's first run
       * found by failing on them */
      neck:      { root: "#fret", note: '#fret g[cursor] circle' },
      staff:     { root: "#score" },
    },
  }],
  ["tetradetudes", {
    kind: "app",
    surfaces: {
      metronome: { start: "#metroBtn" },
      transport: { play: "#playBtn" },
      neck:      { root: "#fretSvg", note: "#fretSvg circle" },
      staff:     { root: "#score" },
    },
  }],
  ["metronome", {
    kind: "app",
    surfaces: {
      metronome: { start: "#metroBtn" },
      /* transport, neck, staff: the appliance does not carry them. Whether an
       * appliance owes the full floor is the scope question the proposal puts
       * to Daniel; until he narrows the floor, the suite fails these three by
       * name (filed 260820, not fixed here). */
    },
  }],
  ["tetrad-voice-leading", {
    kind: "app",
    surfaces: {
      /* no metronome card — the study predates the shared component */
      /* no arm handle: #soundBtn defaults ON — the suite's first run
       * clicked it as an arm and turned the sound OFF, its second suite
       * defect. The register records the lesson so it is not re-made. */
      transport: { play: "#playBtn" },
      neck:      { root: "#neck", note: "#neck circle" },
      /* no staff — the animated surfaces are the neck and the keyboard */
    },
  }],
  ["modes-from-pentatonic-boxes", {
    kind: "chart",
    surfaces: {},
  }],
]);

/** The answer to "which apps?" for a shared UI idiom — the propagation
 * checklist. Every idiom item enumerates THIS list and records a disposition
 * per app (carried · deliberately divergent with a written reason (§4.4) ·
 * not applicable with the reason); "the two apps on screen" is not a list. */
export const appsOf = () =>
  [...FAMILY].filter(([, v]) => v.kind === "app").map(([k]) => k);

export const SURFACE_NAMES = ["metronome", "transport", "neck", "staff"];
