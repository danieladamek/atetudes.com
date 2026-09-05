/* lexicon.mjs — THE FAMILY'S CONTROL VOCABULARY, stated once (260926, night 32).
 *
 * Family spec §4.3: consistency is asserted, not remembered. Three host lists in
 * engine/tests/host-conformance.test.mjs already assert the notepad, the
 * metronome card and the card grammar over every shipped study; this is the
 * fourth's subject — THE WORDS. Multetudes is the reference for every word
 * (Daniel, 260923). The 260913 ruling renamed Block to Strum; it reached
 * multetudes and tetradetudes and not triadetudes, and nothing noticed for
 * thirteen days. A word that drifts on one surface is now a failing test
 * naming the surface, the control, the expected word and the found word.
 *
 * WHERE THIS LIVES, and why: beside palette.mjs and mini.mjs — a helper with
 * no engine import, so a NON-TETRAD door (scribe, plain) can reach it without
 * dragging a domain module in (notepad-card.mjs:197 states that constraint).
 * It is reached through imports, never mounted; it contributes no markup.
 *
 * SCOPE: only controls that genuinely exist on more than one surface. By ROLE,
 * never by id or appearance (rule 12) — the hosts map their own ids to these
 * roles in the conformance test's host list. Values are the stored identities;
 * words are what the face says. Words are compared case-insensitively: the
 * multetudes segments read lowercase ("strum"), the tetrad family capitalises
 * ("Strum"); that is a style split, reported, not a vocabulary one.
 *
 * NOT IN THE LEXICON, deliberately (each a finding for a ruling, not a fix):
 *   - the playback's second word — multetudes says "arpeggiate", the tetrad
 *     family "Arpeggiated"; and "Both", which multetudes does not offer
 *   - the caption over that segment — multetudes "Movement", the others
 *     "Playback"
 *   - "Key" as a caption — the reference dropped it 260922 (rule 12)
 *   - "Free" placement, "Build up / Break down", the figure's "slots" —
 *     one surface's, or two without the reference
 *   - the extension select — the same id on two surfaces with DIFFERENT
 *     meanings (a seventh chord's third below vs a pedal), so not one word
 */
export const LEXICON = {
  meter:       { caption: "Meter",       options: { 4: "4/4", 3: "3/4", 5: "5/4", 6: "6/4", 7: "7/4" } },
  subdivision: { caption: "Subdivision", options: { 1: "beats", 2: "8ths", 3: "triplets", 4: "16ths" } },
  voice:       { caption: "Voice",       options: { beep: "beep", wood: "wood", tick: "tick" } },
  bpm:         { caption: "BPM" },
  volume:      { caption: "Vol" },
  scale:       { caption: "Scale",       options: { major: "Major", harm: "Harmonic minor", mel: "Melodic minor" } },
  placement:   { caption: "Placement",   options: { grip: "Grip", line: "Line" } },
  /* THE VOCABULARY SWEEP (260928, night 34 — Daniel 260923, "Centricity for sure across all"):
   * the canon is multetudes for every word AND ITS CASE. Words are compared exactly now.
   * Values stay each surface's own (tetradetudes and triadetudes store "arpeggiated"; the
   * word is "arpeggiate"); the conformance test maps values per host. "Both", "Free",
   * "Build up / Break down" are FEATURE differences and are not in here. */
  centricity:  { caption: "Centricity" },                       // the key/scale card's name — was Harmony on two surfaces
  movement:    { caption: "Movement",                             // how notes sound — was Playback on two surfaces
                 options: { strum: "strum", arpeggiate: "arpeggiate" } },
  figureIs:    { caption: "The figure is" },                    // the figure's alphabet — was "Figure addresses" / "Motion follows"
  bass:        { caption: "Bass / reference tone" },            // was "Hear the tetrads over a bass" / "… triads … (extension)"
};
