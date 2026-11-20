/* PLAYER — Multetudes' étude, played: the neck, the chord, play/stop and tempo (261120).
 *
 * Child 3 of the étude embed epic (*Player door — the neck, chord symbols, transport and tempo*). Embedded in an
 * iframe on any site, served at atetudes.com/embed/multetudes/ — one build per address, matching the block's
 * `app:` line; the address is PERMANENT from the first embed.
 *
 * The lock reaches the neck (field-board), the walk (etude-walk), the position owner (timeline-strip), the ears
 * (audio-card) and the player's own part (etude-player). It does NOT reach a single Multetudes card: no harmony,
 * progression, presets, mixer, notepad, staff or keys — nothing that changes the étude structurally (Daniel's scope).
 *
 *   hide: metronome-card   ruling 2 (Daniel, 2026-11-20): the player is EXEMPT from family spec §4.3 — no metronome
 *                          card is shown. Its clock still runs, mounted hidden: it is the grid the walk and the
 *                          neck's bpm and transport ask.
 *   hide: timeline-strip   the chart line owns the position the walk steps; the scope shows the CURRENT chord (the
 *                          neck's readout), so its chips are not shown.
 *   player                 read by field-board (ruling 1: the neck module, its rail and structural header controls
 *                          not shown) and by etude-player (which app's étude it plays, and where Open goes).
 */
export default {
  id: "player",
  lock: {
    field: true,
    audio: true,
    surface: "player",
  },
  hide: ["metronome-card", "timeline-strip"],
  player: {
    app: "multetudes",
    open: "https://atetudes.com/studies/multetudes/study.html",
  },
  present: {
    title: "Multetudes",
    blurb: "an étude, played",
    footer: "",
  },
};
