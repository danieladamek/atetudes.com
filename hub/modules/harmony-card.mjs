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
import { CENTRE_SOURCES } from "../../engine/reference.mjs";
import { MODES } from "../../engine/field.mjs";
import { parseTones, degreeOfTone, renderPick, defaultPick, objectDegrees, objectOffsets, pickOf } from "../../engine/selection.mjs";
import { CONFIG_CHANGED, listen, announce } from "../bus.mjs";

const KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const SCALES = [["major", "Major"], ["harm", "Harmonic minor"], ["mel", "Melodic minor"]];
const OBJECTS = [
  ["scale", "Scale or mode", true],
  ["dyad", "Dyad", true],           // child 4: two chord tones, by role — since 260917 picked in the Tones field
  ["triad", "Triad", true],
  ["tetrad", "Tetrad", true],
  ["ninth", "9th chord", true],     // 260914 item 3: depth is data —
  ["eleventh", "11th chord", true], // offsets 2i to the named extension,
  ["thirteenth", "13th chord", true], // mod7; Grip drops by a NAMED rule
  ["shell", "Shell", true],         // child 4: R + the guide tones
];

export const harmonyCard = {
  id: "harmony-card",
  layer: "surface",
  requires: { surface: "multetudes" },
  mount_point: "cards",
  order: 10,
  controls: ["hcKey", "hcScale", "hcObj", "hcRef", "hcTones", "hcCentreSrc"],

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
    <!-- THE KEY'S CAPTION IS GONE (260922, night 28 — ruled 260921): "Key" named an
         APPEARANCE (this collection happens to be a key) where the control's ROLE is
         the field's centre, and it will not hold once a chromatic collection lands
         (the vault's own note anticipates it). Its accessible name is the card's own
         ratified word — never a term invented inside an attribute; the rename ruling
         is Daniel's and open. -->
    <div><select id="hcKey" data-control="hcKey" aria-label="Centricity"></select></div>
    <div><label>Scale</label><select id="hcScale" data-control="hcScale"></select></div>
    <div><label>Object</label><select id="hcObj" data-control="hcObj"></select></div>
  </div>
  <!-- THE TONES (260917, item 1 — ruled): every stacked object picks its
       tones in the FIGURE FIELD'S OWN NOTATION (R,3,5,7); the dyad's pair
       menu became this field. Shell is a PRESET of it (item 2): choosing
       Shell fills R,3,7 visibly. Hidden under a scale — no stack to narrow. -->
  <label id="hcTonesLab" hidden>Tones</label>
  <input type="text" id="hcTones" data-control="hcTones" autocomplete="off" hidden>
  <!-- THE CENTRE (scale mode). In chord mode the bass WINDOW here is
       CLOSED (260917, item 4 — register 31): the bass is a note you sound
       and lives under the neck beside the mixer that drives it. One state,
       two views (night 18) was about the WIRING and stands; this is about
       which window earns its place. -->
  <label id="hcRefLab">Bass / reference tone</label>
  <select id="hcRef" data-control="hcRef"></select>
  <!-- THE CENTRE'S SOURCE (260914, completing 260831): visible in scale
       mode only — fixed (a pedal) or following the changes; the value is
       derived per bar by every consumer, never stored resolved -->
  <div class="seg hc-srcseg" id="hcCentreSrc" data-control="hcCentreSrc" hidden></div>
  <div class="hint" id="hcNote"></div>`,

  styles: `
.hc-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 10px;margin-top:4px;align-items:end}
.hc-srcseg{display:flex;gap:6px;margin-top:6px}
.hc-srcseg button{font:inherit;font-size:12.5px;padding:5px 9px;border:1px solid var(--line);
  border-radius:7px;background:#fff;color:var(--ink);cursor:pointer}
.hc-srcseg button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.hc-srcseg[hidden]{display:none}
#hcRefLab{display:block;margin-top:10px}
#hcNote{margin-top:7px}
/* THE KEY READS IN BOLD RED (260918, item 1 — ruled). Not decoration: the
 * legend under the neck says "colour = function against the key", and R —
 * the root — is red. The key IS the root, so this is the colour law applied
 * to the control that sets it: the one place it was stated everywhere
 * except at its own origin. The red is the degree palette's R — the shell's
 * --red is that palette's Root by its own comment — never a new literal.
 * THE FIELD WEARS ITS WEIGHT (260922, night 28 — Daniel, 260921, reversing
 * 260918's "size untouched"): a larger type, and the field about 1.75× the
 * height of Scale and Object. Size and weight are the EMPHASIS channel —
 * golden rule 8 keeps the hue for function — which is why this is legitimate
 * and a hue change would not be. THE RATIO IS THE LAW, THE VALUE IS TUNABLE
 * AT RENDER INSPECTION (§2.6's idiom): the gate pins a band around 1.75
 * against the neighbours, never a pixel (CI's Chromium renders a select 29px
 * where this machine renders 30). Stated in em so it scales with the type;
 * the three fields share a BOTTOM edge (ruled: bottom-aligned) and the Key
 * rises above it. */
#hcKey{color:var(--red);font-weight:bold;font-size:18px;height:2.9em;padding:0 6px}
#hcRef,#hcTones{width:100%}
#hcTonesLab[hidden],#hcTones[hidden],#hcRefLab[hidden],#hcRef[hidden]{display:none}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    /* PRIVATE (§4.2.3): the harmony half. `ref` re-roots the field (a mode);
     * `bass` is the reference under a chord and is child 5's — held at "none"
     * and its selector disabled until that engine lands. */
    /* THE BOOT STATE (register entry 11, ruled 2026-08-28): v0.9's opening
     * frame — the B♭ major tetrad block — as far as the engine allows. */
    let cfg = { key: "Bb", scale: "major", object: "tetrad", ref: 0, bass: "root", tones: [1, 3, 5, 7],
      centreSrc: "fixed" };   // the source, not a resolved value (260914)

    let tonesErr = null;   // the tones field's standing refusal, by name (null when the field is lawful)
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
      const isScale = cfg.object === "scale";
      /* THE TONES FIELD (260917, item 1 \u2014 the dyad's six-pair menu became
       * this): the pick in the figure's notation. The field is repainted
       * from the model only when it does not already SAY the current pick
       * (a caret mid-edit is never moved), and a refused edit keeps its
       * text on the face with the refusal beside it \u2014 the figure field's
       * own manners (register 21). The label names the degrees this
       * object can hold, derived from its depth. */
      {
        const f = byId("hcTones"), lab = byId("hcTonesLab");
        f.hidden = isScale; lab.hidden = isScale;
        if (!isScale) {
          const pick = pickOf(cfg);
          const says = parseTones(f.value);
          const saysPick = says.tones ? renderPick(says.tones.map(degreeOfTone)) : null;
          if (!tonesErr && saysPick !== renderPick(pick)) f.value = renderPick(pick);
          lab.textContent = `Tones \u2014 pick from ${renderPick(objectDegrees(cfg.object)).split(",").join(", ")}`;
          f.placeholder = renderPick(defaultPick(cfg.object));
        }
      }
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
      /* item 4 (260917, register 31): the card's select is the CENTRE and
       * shows in scale mode only; in chord mode the bass window is closed —
       * the control lives under the neck. Hidden, never dead-with-no-reason. */
      byId("hcRef").hidden = !isScale;
      byId("hcRefLab").hidden = !isScale;
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
        /* chord mode: the face speaks for the TONES — a refusal, by name and
         * red, or the one sentence that says what the pick is and where the
         * bass went (item 4). The chord-mode fill of the bass select is gone
         * with the window; CC-1's audit fix (the scale disable cleared) now
         * lives on the surviving view under the neck. */
        byId("hcRef").disabled = false;
        const note = byId("hcNote");
        if (tonesErr) {
          note.textContent = "tones: " + tonesErr;
          note.style.color = "#B82929";
        } else {
          note.style.color = "";
          const pick = pickOf(cfg);
          const whole = renderPick(pick) === renderPick(objectDegrees(cfg.object));
          note.textContent = (cfg.object === "shell"
            ? "A shell is the root under the guide tones — R,3,7, the tones above; edit them and it is a pick like any other. "
            : whole ? `The whole ${cfg.object}. Narrow it above — fewer tones is the point; a tone this object cannot hold is refused by name. `
            : `The ${cfg.object} narrowed to ${renderPick(pick).split(",").join(" ")}. `)
            + "The bass tone lives under the neck, beside the mixer that drives it.";
        }
      }
    };

    const push = () => { render(); announce(d, CONFIG_CHANGED, cfg); };

    const MINE = ["key", "scale", "object", "ref", "bass", "tones", "centreSrc"];
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    listen(d, CONFIG_CHANGED, (m) => {
      if (!m || typeof m !== "object") return;
      let changed = false;
      for (const k of MINE) if (k in m && !same(m[k], cfg[k])) { cfg = { ...cfg, [k]: m[k] }; changed = true; }
      /* a saved étude's `dyad` arrives as the pick (tonePick is the one
       * alias site); an OBJECT arriving without a pick (a preset) takes its
       * default — a triad preset must not inherit a dyad's [3,7] */
      if (!("tones" in m) && Array.isArray(m.dyad) && !same(m.dyad, cfg.tones)) {
        cfg = { ...cfg, tones: [...m.dyad] }; changed = true;
      } else if ("object" in m && !("tones" in m) && !("dyad" in m) && changed) {
        cfg = { ...cfg, tones: defaultPick(cfg.object) }; tonesErr = null;
        /* the owner SAYS the pick it derived — every mirror that heard the
         * object without one hears the default in the same dispatch */
        announce(d, CONFIG_CHANGED, { tones: cfg.tones });
      }
      if (changed) render();
    });

    byId("hcKey").addEventListener("change", (e) => { cfg = { ...cfg, key: e.target.value }; push(); });
    byId("hcScale").addEventListener("change", (e) => { cfg = { ...cfg, scale: e.target.value }; push(); });
    /* choosing an object FILLS its tones (item 2's whole point for Shell:
     * R,3,7 appears, visibly) — a refused edit is forgotten with the object */
    byId("hcObj").addEventListener("change", (e) => {
      tonesErr = null;
      cfg = { ...cfg, object: e.target.value, tones: defaultPick(e.target.value) }; push();
    });
    /* THE TONES FIELD: parsed by the figure's parser, checked by the one
     * derivation (objectOffsets) — a refusal is a value on the face and the
     * last lawful pick stands; validation is live, as the figure's is */
    byId("hcTones").addEventListener("input", (e) => {
      const r = parseTones(e.target.value);
      if (r.err) { tonesErr = r.err; render(); return; }
      const pick = r.tones.map(degreeOfTone);
      try { objectOffsets(cfg.object, pick); }
      catch (err) { tonesErr = String(err.message || err).replace(/^objectOffsets: /, ""); render(); return; }
      tonesErr = null;
      cfg = { ...cfg, tones: pick }; push();
    });
    byId("hcRef").addEventListener("change", (e) => {
      const v = e.target.value;
      if (v.startsWith("mode:")) cfg = { ...cfg, ref: +v.slice(5) };
      else cfg = { ...cfg, bass: v };
      push();
    });

    push();
  },
};
