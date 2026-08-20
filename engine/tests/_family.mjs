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
 * WHAT THE ENTRIES MEAN — the kinds are RATIFIED (Daniel, 2026-08-20, R2–R4)
 *   kind: "app"       — an étude app; the conformance floor (Ruling 2,
 *                       2026-08-19: metronome · transport · interactive neck ·
 *                       animated staff) binds all four surfaces, asserted at
 *                       the artifact level by tools/family_floor.py.
 *   kind: "appliance" — R2: the floor binds the metronome surface only;
 *                       transport/neck/staff are EXEMPT and the suite reports
 *                       them as exempted WITH THE REASON, never as passes —
 *                       "a transport with nothing to transport, and a neck
 *                       with no étude on it, would be surfaces invented to
 *                       satisfy a gate." Idiom propagation still targets it:
 *                       appsOf() includes appliances, because leaving the
 *                       appliance behind is the exact defect the register
 *                       exists to end.
 *   kind: "frozen"    — R3: §5.2.1 freezes the study as the engine's
 *                       read-only oracle; the floor skips it entirely and
 *                       names why — "a floor that forces an edit to its own
 *                       oracle is a floor arguing with a deliberate
 *                       decision." Not an idiom target either: frozen means
 *                       not edited.
 *   kind: "chart"     — R4: a map, not a designer — "the material is fixed
 *                       and you explore it." The floor does not bind it; the
 *                       register still names it so a chart that grows
 *                       controls cannot drift into being an unregistered app.
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
      /* the note handle targets a dot that CARRIES its midi — the neck's
       * first bare circles are inert board markers, the same lesson the
       * triad's entry above records (v0.1.9 wired data-midi on every dot) */
      neck:      { root: "#fretSvg", note: "#fretSvg [data-midi] circle" },
      staff:     { root: "#score" },
    },
  }],
  ["metronome", {
    kind: "appliance",   // R2, ratified 2026-08-20 — exempt from F2/F3/F4 by kind
    surfaces: {
      metronome: { start: "#metroBtn" },
    },
  }],
  ["tetrad-voice-leading", {
    kind: "frozen",      // R3, ratified 2026-08-20 — §5.2.1's oracle; the floor skips it, named
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
 * not applicable with the reason); "the two apps on screen" is not a list.
 * Appliances ARE idiom targets — the appliance being left behind twice is
 * why this list exists. Frozen studies are not: frozen means not edited. */
export const appsOf = () =>
  [...FAMILY].filter(([, v]) => v.kind === "app" || v.kind === "appliance").map(([k]) => k);

export const KINDS = ["app", "appliance", "frozen", "chart"];
export const SURFACE_NAMES = ["metronome", "transport", "neck", "staff"];

/** Which floor surfaces bind a study of this kind — the suite reads THIS, so
 * an exemption is a register fact with a quotable reason, never suite logic.
 * The reasons are Daniel's ratified words (R2/R3, 2026-08-20). */
export const FLOOR_SCOPE = {
  app: { binds: SURFACE_NAMES, exempt: {} },
  appliance: {
    binds: ["metronome"],
    exempt: {
      transport: "R2: a transport with nothing to transport would be a surface invented to satisfy a gate",
      neck: "R2: a neck with no étude on it would be a surface invented to satisfy a gate",
      staff: "R2: a staff with no étude on it would be a surface invented to satisfy a gate",
    },
  },
  frozen: {
    binds: [],
    exempt: Object.fromEntries(SURFACE_NAMES.map((n) =>
      [n, "R3: §5.2.1 freezes this study as the engine's read-only oracle — a floor that forces an edit to its own oracle is a floor arguing with a deliberate decision"])),
  },
  chart: { binds: [], exempt: {} },   // R4: the floor does not bind a map at all
};
