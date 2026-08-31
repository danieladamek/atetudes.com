/* harmony-card.mjs — v0.9's HARMONY card: the field, what sits on it, and the
 * reference underneath (Multetudes surface, 2026-08-29 — identical-to-v0.9
 * ruling).
 *
 * OWNS the harmony half of the configuration and announces it as a plain
 * value (§4.2.3): key · scale · object · take · ref (the mode re-rooting,
 * child 1's engine) · bass (the fretted reference — CHILD 5, so its options
 * render disabled with the reason visible, never silently absent). The neck
 * (field-board) derives from what it hears; nothing reaches anything.
 *
 * THE UI STANDARD, applied here and written into the register: a DROPDOWN
 * chooses one value out of a domain (keys, scales, objects, reference tones —
 * nounish lists); a SEGMENTED ROW chooses a mode of reading (two or three
 * mutually exclusive readings that recolour the surface — placement, figure
 * address, progression source). v0.9 already follows this split everywhere;
 * the standard is its behaviour named.
 *
 * Dyad and Shell appear in the Object list DISABLED — child 4's engine.
 * Visibly inert, not absent: the menu is the model's, the grey is tonight's.
 */
import { field } from "../../engine/field.mjs";
import { REFERENCE_CHOICES, CENTRE_SOURCES } from "../../engine/reference.mjs";
import { MODES } from "../../engine/field.mjs";
import { CONFIG_CHANGED, listen, announce } from "../bus.mjs";

const KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const SCALES = [["major", "Major"], ["harm", "Harmonic minor"], ["mel", "Melodic minor"]];
const OBJECTS = [
  ["scale", "Scale or mode", true],
  ["dyad", "Dyad", true],           // child 4: two chord tones, by role
  ["triad", "Triad", true],
  ["tetrad", "Tetrad", true],
  ["shell", "Shell", true],         // child 4: R + the guide tones
];

export const harmonyCard = {
  id: "harmony-card",
  layer: "surface",
  requires: { surface: "multetudes" },
  mount_point: "cards",
  order: 10,
  controls: ["hcKey", "hcScale", "hcObj", "hcRef", "hcDyad", "hcCentreSrc"],

  /* v0.9's card, structurally verbatim: two captioned pairs on a two-up grid,
   * then the reference across the full width because its options carry a note
   * AND a mode name. The grid is the card's own (`hgrid` in v0.9) — a
   * module's internal layout is the module's. */
  /* ONE HORIZONTAL PANEL (260913, item 1 — D8 granted): Key | Scale |
   * Object across one row, the reference full-width below. Take LEFT this
   * card — it was the only Harmony control whose meaning is defined by the
   * BOX ("every occurrence in the box" is unstatable without the neck), so
   * it lives on the neck's rail now, beside Placement, as the "all tones"
   * checkbox. field-board owns and announces it; the value is unchanged. */
  markup: `
  <!-- CENTRICITY (260914, ruled): the card holds Key, Scale, Object and
       the centre — it defines the MATERIAL and what organises it; the card
       that defines harmony is Progression, beside it. "Centricity" is the
       one name that stays true through key, mode and the non-diatonic
       collections to come, so this rename happens once. Rejected with
       reasons in register 27: Centre (would collide with the control
       inside), Field (names the SET without its organiser — and keeps its
       own word everywhere it already lives), Key (false under a mode),
       Pitch-Class Set (centreless by definition), Key/Centricity (a slash
       label on the card that just had one split). -->
  <h2>Centricity</h2>
  <div class="hc-grid3">
    <div><label>Key</label><select id="hcKey" data-control="hcKey"></select></div>
    <div><label>Scale</label><select id="hcScale" data-control="hcScale"></select></div>
    <div><label>Object</label><select id="hcObj" data-control="hcObj"></select></div>
  </div>
  <label id="hcDyadLab" hidden>Which two tones</label>
  <select id="hcDyad" data-control="hcDyad" hidden></select>
  <label id="hcRefLab">Bass / reference tone</label>
  <select id="hcRef" data-control="hcRef"></select>
  <!-- THE CENTRE'S SOURCE (260914, completing 260831): visible in scale
       mode only — fixed (a pedal) or following the changes; the value is
       derived per bar by every consumer, never stored resolved -->
  <div class="seg hc-srcseg" id="hcCentreSrc" data-control="hcCentreSrc" hidden></div>
  <div class="hint" id="hcNote"></div>`,

  styles: `
.hc-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 10px;margin-top:4px}
.hc-srcseg{display:flex;gap:6px;margin-top:6px}
.hc-srcseg button{font:inherit;font-size:12.5px;padding:5px 9px;border:1px solid var(--line);
  border-radius:7px;background:#fff;color:var(--ink);cursor:pointer}
.hc-srcseg button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.hc-srcseg[hidden]{display:none}
#hcRefLab{display:block;margin-top:10px}
#hcNote{margin-top:7px}
#hcRef,#hcDyad{width:100%}
#hcDyadLab[hidden],#hcDyad[hidden]{display:none}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    /* PRIVATE (§4.2.3): the harmony half. `ref` re-roots the field (a mode);
     * `bass` is the reference under a chord and is child 5's — held at "none"
     * and its selector disabled until that engine lands. */
    /* THE BOOT STATE (register entry 11, ruled 2026-08-28): v0.9's opening
     * frame — the B♭ major tetrad block — as far as the engine allows. */
    let cfg = { key: "Bb", scale: "major", object: "tetrad", ref: 0, bass: "none", dyad: [3, 7],
      centreSrc: "fixed" };   // the source, not a resolved value (260914)

    const fill = (sel, items, current) => {
      sel.textContent = "";
      for (const it of items) {
        const o = d.createElement("option");
        o.value = it.value; o.textContent = it.label;
        if (it.disabled) { o.disabled = true; o.title = it.title || ""; }
        if (String(it.value) === String(current)) o.selected = true;
        sel.appendChild(o);
      }
    };

    const render = () => {
      fill(byId("hcKey"), KEYS.map((k) => ({ value: k, label: k })), cfg.key);
      fill(byId("hcScale"), SCALES.map(([v, l]) => ({ value: v, label: l })), cfg.scale);
      fill(byId("hcObj"), OBJECTS.map(([v, l, live]) => ({ value: v, label: l,
        disabled: !live, title: live ? "" : "arrives with child 4 (dyads, and the chord vocabulary)" })),
        cfg.object);
      /* THE DYAD MENU (child 4): v0.9's six pairs — every 2-subset of the
       * chord-tone degrees {1,3,5,7}, guide tones first. The pair LIST is
       * combinatorics, the labels are derived from the degrees; what a pair
       * MEANS in offsets is objectOffsets' business, stated once. */
      const DEGNAME = { 1: "Root", 3: "3rd", 5: "5th", 7: "7th" };
      const PAIRS = [[3, 7], [1, 3], [1, 5], [1, 7], [3, 5], [5, 7]];
      fill(byId("hcDyad"), PAIRS.map((p) => ({ value: p.join(","),
        label: `${DEGNAME[p[0]]} + ${DEGNAME[p[1]]}` + (p[0] === 3 && p[1] === 7 ? " \u2014 guide tones" : "") })),
        cfg.dyad.join(","));
      byId("hcDyadLab").hidden = cfg.object !== "dyad";
      byId("hcDyad").hidden = cfg.object !== "dyad";
      const isScale = cfg.object === "scale";
      /* THE REFERENCE. Under a scale it is the CENTRE — pick any note of the
       * collection and the field is re-read against it, which is what a mode
       * is (LIVE — child 1's field.ref). Under a chord it is what sits
       * underneath — the root, a 3rd or a 5th below, fretted and drawn —
       * which is CHILD 5, so the list renders disabled with the reason. */
      /* the source seg paints in scale mode only — a mode of reading, so a
       * SEG (the UI standard's own split) */
      {
        const seg = byId("hcCentreSrc");
        seg.hidden = !isScale;
        if (isScale && !seg.childElementCount) {
          for (const [v, l] of CENTRE_SOURCES) {
            const b = d.createElement("button");
            b.dataset.src = v; b.textContent = l;
            b.title = v === "fixed"
              ? "one chosen centre — the chords pass over it (modal study)"
              : "each bar re-centres on its own chord's root";
            b.addEventListener("click", () => { cfg = { ...cfg, centreSrc: v }; push(); });
            seg.appendChild(b);
          }
        }
        for (const b of seg.querySelectorAll("button"))
          b.classList.toggle("on", b.dataset.src === (cfg.centreSrc || "fixed"));
      }
      if (isScale) {
        const f = field({ key: cfg.key, scale: cfg.scale });
        const follows = cfg.centreSrc === "follows";
        fill(byId("hcRef"), f.notes.map((n, i) => ({
          value: "mode:" + i, label: `${n.name} — ${MODES[cfg.scale][i]}` })), "mode:" + cfg.ref);
        /* under FOLLOWS the fixed pick is moot — disabled with the reason
         * on its own label, the house rule */
        byId("hcRef").disabled = follows;
        byId("hcRefLab").textContent = follows
          ? "Centre — following the changes, each bar re-centres on its own chord"
          : "Centre — the note the field is read against";   // the ruled word (260914)
        byId("hcNote").textContent = follows
          ? "Each bar is read against its own chord's root — the colours and the bass move with the changes."
          : (cfg.ref
            ? `The same seven notes, re-rooted: ${f.notes[cfg.ref].name} ${MODES[cfg.scale][cfg.ref]} — degree colours and labels follow the centre, not the key.`
            : "The same seven notes; choose any of them as the centre and the field is re-read against it — which is what a mode is.");
      } else {
        /* THE THREE RELATIVE OPTIONS (child 5, ruled 260831): root, a 3rd
         * below, a 5th below — relative to the chord. The FIXED half of that
         * ruling — deferred "until the chords change" — was completed
         * 260914 as the scale centre's source (centreDegreeOf). */
        fill(byId("hcRef"), REFERENCE_CHOICES.map(([v, l]) => ({ value: v, label: l })),
          cfg.bass);
        byId("hcRefLab").textContent = "Bass tone";   // the ruled word (260914)
        byId("hcNote").textContent = cfg.bass === "none"
          ? "The bass the harmony sits on — a real fretted note on string 5 or 6, outside the isolation. Relative to the chord: it will follow the changes."
          : "A real fretted note on string 5 or 6, chosen against the window — the neck shows it hollow, the readout names what the stack becomes over it.";
      }
    };

    const push = () => { render(); announce(d, CONFIG_CHANGED, cfg); };

    const MINE = ["key", "scale", "object", "ref", "bass", "dyad", "centreSrc"];
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    listen(d, CONFIG_CHANGED, (m) => {
      if (!m || typeof m !== "object") return;
      let changed = false;
      for (const k of MINE) if (k in m && !same(m[k], cfg[k])) { cfg = { ...cfg, [k]: m[k] }; changed = true; }
      if (changed) render();
    });

    byId("hcKey").addEventListener("change", (e) => { cfg = { ...cfg, key: e.target.value }; push(); });
    byId("hcScale").addEventListener("change", (e) => { cfg = { ...cfg, scale: e.target.value }; push(); });
    byId("hcObj").addEventListener("change", (e) => { cfg = { ...cfg, object: e.target.value }; push(); });
    byId("hcDyad").addEventListener("change", (e) => { cfg = { ...cfg, dyad: e.target.value.split(",").map(Number) }; push(); });
    byId("hcRef").addEventListener("change", (e) => {
      const v = e.target.value;
      if (v.startsWith("mode:")) cfg = { ...cfg, ref: +v.slice(5) };
      else cfg = { ...cfg, bass: v };
      push();
    });

    push();
  },
};
