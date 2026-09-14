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
import { parseTones, degreeOfTone, renderPick, defaultPick, objectDegrees, objectOffsets, pickOf, tonePick, objectOf } from "../../engine/selection.mjs";
import { CONFIG_CHANGED, NOTE, STEP_CHANGED, CLOCK_STATE, listen, announce } from "../bus.mjs";
// the degree palette, stated once (night 60: the chip row wears it — the neck legend's own table)
import { FAM, FAM_COLOR, FAM_TEXT } from "../palette.mjs";
import { triads, tetrads, triadPairs, pentatonics, pentatonicRefusal, normalizeGamut, describeGamut, pentatonicBreak } from "../../engine/gamut.mjs";
import { LEXICON } from "../lexicon.mjs";
// the scale's one word (night 41's vocabulary) — one statement, nothing after the semicolon: the build binds exactly this form
import { SHARED } from "../../engine/shared-config.mjs";

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

/** note names → key degrees (night 59): the tokens are matched against the FIELD's own spelled names
 * (case-insensitive, ♭/♯ or b/#), so the letters the face shows are the letters it accepts; a token
 * that is not a note of this key refuses by name. Order is not identity; duplicates are one degree. */
function parseNoteNames(text, fld) {
  const norm = (x) => String(x).replace(/♭/g, "b").replace(/♯/g, "#").toLowerCase();
  const names = fld.notes.map((n) => norm(n.name));
  const toks = String(text || "").split(/[\s,·\-]+/).filter(Boolean);
  const degrees = [];
  for (const t of toks) {
    const i = names.indexOf(norm(t));
    if (i < 0) return { degrees: null, err: `"${t}" is not a note of this key — the notes are ${fld.notes.map((n) => n.name).join(" ")}` };
    if (!degrees.includes(i + 1)) degrees.push(i + 1);
  }
  return { degrees: degrees.sort((a, b) => a - b), err: null };
}

export const harmonyCard = {
  id: "harmony-card",
  layer: "surface",
  requires: { surface: "multetudes" },
  mount_point: "cards",
  order: 10,
  controls: ["hcKey", "hcScale", "hcObj", "hcRef", "hcTones", "hcCentreSrc", "hcGamut", "hcChips"],

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
  <!-- THE GAMUT (night 48, ruled by Daniel 261008 — the partial collection): what the material is
       drawn FROM, beside Object (what shape) — the row directly under the three, full width: the
       width its contents need (Daniel, 261012: "the width it is currently is the proper width"),
       never Scale's or Object's. Every option is DERIVED (pentatonics by the anhemitonic rule per
       scale, the seven stepwise triad pairs, the seven stacks of each depth, the seven degrees).
       Harmonic minor's empty pentatonic list REFUSES BY NAME in the list, never as an empty group.
       NIGHT 60 (the Centricity re-cut, second half — ruled): a SINGLE select, the same KIND as Scale
       and Object; live in exactly one state — a gamut narrows the scale, and under a chord object the
       object has already narrowed it, so it is disabled with the reason on its own label; the
       dropdown's own first option IS the whole field (the 261011c stopgap is gone — its job is this
       option's). Selection is EQUALITY: the one option that equals the gamut; a set no option names
       is shown by its own letters. Night 48's union-by-containment passed to the chip row below. -->
  <div class="hc-gamut" id="hcGamutBox">
    <label for="hcGamut" id="hcGamutLab"></label>
    <select id="hcGamut" data-control="hcGamut"></select>
    <!-- THE CHIP ROW (night 60, Daniel 261012): seven chips, ALWAYS the key's seven degrees in the
         §2.1 palette, named by note. Under a chord object they light AS THE NOTES PASS (the walk's own
         NOTE — no second source of what is sounding) and hold the bar's notes until the next; under a
         scale they hold the gamut's set and are a PICKER. LIT-NESS IS OPACITY (the neck's field-opacity
         idiom), never a hue — golden rule 8. Two standing marks in the caption: the ORIGIN (the legend's
         own words — the row stays keyed to the KEY while the neck re-roots, ruled 261012, so both
         origins are stated) and the MEANING (following / held — the still frame after a stop is told
         from a held set by the words, never by a colour). -->
    <div class="hc-chips" id="hcChips" data-control="hcChips" role="group" aria-labelledby="hcChipCap"></div>
    <div class="hint hc-chipcap" id="hcChipCap"></div>
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
/* THE 390 GRID (night 59 — the precondition, raised 260922): a 1fr track carries min-width:auto and cannot
 * shrink below its select's longest option, so at 390 the Object select ran 100 px past the card's edge
 * (measured 261013: its right at 366 against the card's 266). minmax(0,1fr) lets the tracks share the
 * card; the two neighbours become 67 px each at 390 and the Key stays exactly as ruled (59 × 52, ratio
 * 1.74, a shared bottom edge); a narrowed select shows the head of its value inside the control, which
 * is better than a control cut off by the card. At 1280 nothing changes (133 / 123, as before). */
.hc-grid3{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr);gap:0 10px;margin-top:4px;align-items:end}
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
.hc-gamut{margin-top:8px}
#hcGamutLab{display:block}
#hcGamut{width:100%}   /* night 60: the shell's select — Scale's own kind and type size; the width is its box's */
#hcGamut:disabled{opacity:.45;cursor:not-allowed}
/* THE CHIP ROW (night 60): seven across at every width — flex shares the box (26 px each at 390, 46 at
 * 1280, capped square); the hue is the palette's and NEVER moves; lit-ness is the FILL's opacity (the
 * neck's field opacity, on the fill alone — the label keeps §2.1's text rule, so an unlit chip still
 * names its note at AA contrast; the fill and the text are set from the palette table, inline) */
.hc-chips{display:flex;gap:6px;margin-top:8px}
.hc-chip{flex:1 1 0;min-width:0;max-width:46px;aspect-ratio:1;min-height:34px;border:0;border-radius:8px;padding:0;
  font:inherit;font-weight:700;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer}
.hc-chip[data-pick="false"]{cursor:default}
.hc-chip .hc-chipdeg{font-size:9px;font-weight:500;line-height:1;opacity:.72}
.hc-chip .hc-chipname{font-size:14px;line-height:1.15}
.hc-chipcap{margin-top:5px}
#hcTonesLab[hidden],#hcTones[hidden],#hcRefLab[hidden],#hcRef[hidden]{display:none}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    /* PRIVATE (§4.2.3): the harmony half. `ref` re-roots the field (a mode);
     * `bass` is the reference under a chord and is child 5's — held at "none"
     * and its selector disabled until that engine lands. */
    /* THE BOOT STATE (register entry 11, ruled 2026-08-28): v0.9's opening
     * frame — the B♭ major tetrad block — as far as the engine allows. */
    let migrated = null;   // night 59: { saved, derived } when a restored entry's stored object is not what its tones make
    let dropped = null;    // night 60: the letters of a gamut dropped under a chord object — said once (ruled 261013b), never silent
    let lit = new Set();   // night 60, chord objects: the key degrees the walk sounded since the bar began — the chips light as the notes pass
    let running = false;   // CLOCK_STATE's running — the row's meaning mark says following / stopped
    let cfg = { key: "Bb", scale: "major", object: "tetrad", ref: 0, bass: "root", tones: [1, 3, 5, 7],
      centreSrc: "fixed",     // the source, not a resolved value (260914)
      gamut: null };          // the stored key: degrees 1..7 sorted, or null = the whole field (night 48)

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

    /* THE CHIP ROW (night 60): rendered on its own — the walk's NOTE arrives every beat, and a full render
     * would rebuild the selects under an open dropdown. Seven chips, the KEY's degrees in the palette (one
     * table, the neck legend's), named by note; lit = opacity 1, unlit = the neck's field opacity (the CSS
     * rule keyed to data-lit); the hue NEVER moves with a state. Under a scale: held to the gamut's set, a
     * picker (aria-pressed). Under a chord: a readout of the notes that passed since the bar began. */
    const letterOfGamut = (gamut) => { const f = field({ key: cfg.key, scale: cfg.scale }); return gamut.map((dg) => f.notes[dg - 1].name).join(" "); };
    /* LIT-NESS (night 60): the fill's opacity — 1 lit, the neck's FIELD OPACITY unlit (field-board.mjs draws an
     * omitted dot at 0.28); the hue is the same rgb in both states, only the alpha moves. An unlit fill is a
     * light mark, so it takes §2.1's dark text (the palette's own rule for 4, 6 and 7), bound, never restated. */
    const FIELD_OPACITY = 0.28;
    const DARK_TEXT = FAM_TEXT["4"];
    const fade = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${a})`;
    const renderChips = () => {
      const row = byId("hcChips"), cap = byId("hcChipCap");
      const isScale = cfg.object === "scale";
      const fld = field({ key: cfg.key, scale: cfg.scale });
      const on = isScale ? (cfg.gamut || [1, 2, 3, 4, 5, 6, 7]) : [...lit];
      if (row.childElementCount !== 7) {
        row.textContent = "";
        for (let i = 0; i < 7; i++) {
          const b = d.createElement("button"); b.type = "button"; b.className = "hc-chip"; b.dataset.deg = String(i + 1);
          b.innerHTML = `<span class="hc-chipdeg">${i + 1}</span><span class="hc-chipname"></span>`;
          b.addEventListener("click", () => {
            if (cfg.object !== "scale") return;   // a readout under a chord — a click has no coherent meaning there
            const set = new Set(cfg.gamut || [1, 2, 3, 4, 5, 6, 7]);
            if (set.has(i + 1)) set.delete(i + 1); else set.add(i + 1);
            dropped = null; migrated = null;
            cfg = { ...cfg, gamut: normalizeGamut([...set]) }; push();
          });
          row.appendChild(b);
        }
      }
      row.querySelectorAll(".hc-chip").forEach((b, i) => {
        const fam = FAM[i];
        const isLit = on.includes(i + 1);
        b.style.backgroundColor = isLit ? FAM_COLOR[fam] : fade(FAM_COLOR[fam], FIELD_OPACITY);
        b.style.color = isLit ? FAM_TEXT[fam] : DARK_TEXT;
        b.querySelector(".hc-chipname").textContent = fld.notes[i].name;
        b.dataset.lit = String(isLit); b.dataset.pick = String(isScale);
        b.setAttribute("aria-label", `${fld.notes[i].name}, the key's ${i + 1}`);
        if (isScale) b.setAttribute("aria-pressed", String(isLit)); else b.removeAttribute("aria-pressed");
      });
      /* the two standing marks: the ORIGIN in the legend's own words (adopted, not coined — the neck says
       * "against the reference tone" when re-rooted, this row is always against the key, and both are
       * on the face together, which is what makes the divergence legitimate); the MEANING, held or following */
      cap.textContent = "colour = function against the key \u2014 "
        + (isScale ? "held: the chosen set; click a note to change it"
          : running ? "following the changes" : "following the changes, stopped \u2014 the notes that last passed stay lit");
    };

    const render = () => {
      fill(byId("hcKey"), KEYS.map((k) => ({ value: k, label: k })), cfg.key);
      fill(byId("hcScale"), SCALES.map(([v, l]) => ({ value: v, label: l })), cfg.scale);
      fill(byId("hcObj"), OBJECTS.map(([v, l, live]) => ({ value: v, label: l,
        disabled: !live, title: live ? "" : "arrives with child 4 (dyads, and the chord vocabulary)" })),
        cfg.object);
      const isScale = cfg.object === "scale";
      /* THE GAMUT LIST (night 48): rebuilt from the rules on every render — the field's own letters
       * name the options. NIGHT 60: a SINGLE select. ONE STATE (ruled): a gamut narrows the scale; under
       * a chord object the object has already narrowed it — disabled, with the reason on its own label.
       * EQUALITY, said before it changed: night 48 lit every option the gamut CONTAINED and their union
       * was the gamut; a single dropdown cannot show a union, so it shows the ONE option that EQUALS the
       * gamut, and the union's job — a set, built a degree at a time — belongs to the chip row. */
      {
        const sel = byId("hcGamut"), lab = byId("hcGamutLab");
        const fld = field({ key: cfg.key, scale: cfg.scale });
        const letter = (deg) => fld.notes[deg].name;
        sel.disabled = !isScale;
        lab.textContent = isScale ? LEXICON.gamut.caption
          : `${LEXICON.gamut.caption} \u2014 narrows the scale; a ${cfg.object} has already narrowed it`;   // the role, never a caption (rules 12, 14)
        const current = cfg.gamut == null ? "1,2,3,4,5,6,7" : cfg.gamut.join(",");
        let matched = false;
        sel.textContent = "";
        const opt = (parent, value, text, role) => {
          const o = d.createElement("option"); o.value = value; o.textContent = text;
          if (role) o.setAttribute("data-role", role);
          if (value === current) { o.selected = true; matched = true; }
          parent.appendChild(o); return o;
        };
        /* THE WHOLE FIELD — the dropdown's own first option, by ROLE (rule 12): all seven degrees, which
         * normalizeGamut already reads as null. The 261011c stopgap (a way back in a multi-select) is gone;
         * this option does its job. */
        opt(sel, "1,2,3,4,5,6,7", `the whole field \u2014 ${[1, 2, 3, 4, 5, 6, 7].join(" ")} of ${letter(0)}`, "whole-field");
        const group = (label, items) => {
          const g = d.createElement("optgroup"); g.label = label;
          for (const it of items) {
            if (it.disabled) { const o = d.createElement("option"); o.disabled = true; o.value = ""; o.textContent = it.label; g.appendChild(o); }
            else opt(g, it.degrees.map((x) => x + 1).join(","), it.label);
          }
          sel.appendChild(g);
        };
        const pents = pentatonics(cfg.scale);
        group("pentatonics", pents.length
          ? pents.map((p) => ({ degrees: p.degrees, label: describeGamut(p.degrees.map((x) => x + 1), fld) }))
          : [{ degrees: [], label: pentatonicRefusal(cfg.scale), disabled: true }]);
        group("triad pairs", triadPairs().map((p) => ({ degrees: p.degrees, label: describeGamut(p.degrees.map((x) => x + 1), fld) })));
        group("triads", triads().map((t) => ({ degrees: t.degrees, label: `triad on ${letter(t.root)}` })));
        group("tetrads", tetrads().map((t) => ({ degrees: t.degrees, label: `tetrad on ${letter(t.root)}` })));
        group("degrees", [0, 1, 2, 3, 4, 5, 6].map((x) => ({ degrees: [x], label: `${x + 1} \u2014 ${letter(x)}` })));
        /* a set no named option equals (built from the chips): shown by its own letters, appended, selected */
        if (!matched && cfg.gamut) {
          const g = d.createElement("optgroup"); g.label = "chosen";
          opt(g, current, `${cfg.gamut.map((dg) => letter(dg - 1)).join(" ")} \u2014 ${describeGamut(cfg.gamut, fld)}`, "chosen");
          sel.appendChild(g);
        }
        sel.setAttribute("data-gamut", cfg.gamut ? cfg.gamut.join(",") : "");
      }
      /* THE TONES FIELD (260917, item 1 \u2014 the dyad's six-pair menu became
       * this): the pick in the figure's notation. The field is repainted
       * from the model only when it does not already SAY the current pick
       * (a caret mid-edit is never moved), and a refused edit keeps its
       * text on the face with the refusal beside it \u2014 the figure field's
       * own manners (register 21). The label names the degrees this
       * object can hold, derived from its depth. */
      /* TONES IS THE TRUTH (night 59 — Daniel's Centricity re-cut, first half): the field is visible in
       * both modes and its VOCABULARY FOLLOWS THE OBJECT. Under a chord object it speaks ROLES against
       * the chord root — R 3 5 7 9 11 13, any of them; the object is the name the tones make (objectOf)
       * and re-names itself as they are edited. Under a scale it speaks NOTE NAMES, absolute in the key —
       * the gamut's own letters (the whole field when none is set): a note name is the same note whatever
       * chord is sounding, so nothing re-labels as the chart moves. Letters are a RENDERING; the stored
       * value stays degrees (the gamut, 1..7 sorted, null = the whole field). */
      {
        const f = byId("hcTones"), lab = byId("hcTonesLab");
        f.hidden = false; lab.hidden = false;
        if (!isScale) {
          const pick = pickOf(cfg);
          const says = parseTones(f.value);
          const saysPick = says.tones ? renderPick(says.tones.map(degreeOfTone)) : null;
          if (!tonesErr && saysPick !== renderPick(pick)) f.value = renderPick(pick);
          lab.textContent = "Tones \u2014 the material, by role against the chord root: R, 3, 5, 7, 9, 11, 13";
          f.placeholder = renderPick(defaultPick(cfg.object));
        } else {
          const fld = field({ key: cfg.key, scale: cfg.scale });
          const degs = cfg.gamut || [1, 2, 3, 4, 5, 6, 7];
          const letters = degs.map((dg) => fld.notes[dg - 1].name).join(" ");
          const saysDegs = parseNoteNames(f.value, fld);
          if (!tonesErr && !(saysDegs.degrees && saysDegs.degrees.join(",") === degs.join(","))) f.value = letters;
          lab.textContent = `Tones \u2014 the material, by note in ${cfg.key} ${SHARED.scale.values[cfg.scale] || cfg.scale}`;
          f.placeholder = [1, 2, 3, 4, 5, 6, 7].map((dg) => fld.notes[dg - 1].name).join(" ");
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
      /* THE GAMUT'S HINT (night 48) — site three of three (rule 10): what is lit, said; appended to
       * the mode's own sentence below only when a gamut is set, so the whole field reads as today */
      const gamutNote = () => {
        if (!cfg.gamut) return "";
        const f = field({ key: cfg.key, scale: cfg.scale });
        const omitted = [0, 1, 2, 3, 4, 5, 6].filter((x) => !cfg.gamut.includes(x + 1)).map((x) => f.notes[x].name);
        const brk = pentatonicBreak(cfg.gamut, cfg.scale);
        return ` ${LEXICON.gamut.caption}: ${describeGamut(cfg.gamut, f)}` + (omitted.length ? ` — ${omitted.join(", ")} ${omitted.length === 1 ? "stays" : "stay"} on the neck at field opacity.` : ".")
          + (brk ? ` ${cfg.gamut.join(" ")} of ${cfg.key} ${SHARED.scale.values[cfg.scale] || cfg.scale} is not semitone-free — ${f.notes[brk[0]].name} and ${f.notes[brk[1]].name} sit a semitone apart.` : "");
      };
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
        /* a refused Tones edit under a scale (a letter that is not a note of the key) is said here, red, first —
         * the face speaks for the field in both modes (night 59) */
        byId("hcNote").style.color = tonesErr ? "#B82929" : "";
        byId("hcNote").textContent = (tonesErr ? "tones: " + tonesErr + " " : "") + (follows
          ? "Each bar is read against its own chord's root — the colours and the bass move with the changes."
          : (cfg.ref
            ? `The same seven notes, re-rooted: ${f.notes[cfg.ref].name} ${MODES[cfg.scale][cfg.ref]} — degree colours and labels follow the centre, not the key.`
            : "The same seven notes; choose any of them as the centre and the field is re-read against it — which is what a mode is."))
          + gamutNote();
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
            ? "A shell is the root under the guide tones — R,3,7, the tones above; edit them and the object is re-named to what the tones make. "
            : cfg.object === "dyad" ? "A dyad is the guide tones — 3,7; edit them and the object is re-named to what the tones make. "
            : whole ? `The whole ${cfg.object}. Narrow it above — fewer tones is the point — or add a tone and the object is re-named to what the tones make. `
            : `The ${cfg.object} narrowed to ${renderPick(pick).split(",").join(" ")}. `)
            + (migrated ? `This étude was saved as a ${migrated.saved}; its tones make a ${migrated.derived} — the tones are the truth. ` : "")
            /* THE DROPPED GAMUT (night 60, ruled 261013b): said once, in night 59's vocabulary — a saved one on a
             * restore, a live one when a chord object is chosen; keep what makes the material, drop what shades it */
            + (dropped ? (dropped.saved
              ? `This étude was saved with a gamut (${dropped.letters}); its object is a ${cfg.object}, and a gamut narrows only the scale — the gamut is dropped, the tones are the truth. `
              : `The gamut (${dropped.letters}) is dropped — a gamut narrows only the scale, and a ${cfg.object} has already narrowed it. `) : "")
            + "The bass tone lives under the neck, beside the mixer that drives it." + gamutNote();
        }
      }
      renderChips();
    };

    const push = () => { render(); announce(d, CONFIG_CHANGED, cfg); };

    const MINE = ["key", "scale", "object", "ref", "bass", "tones", "centreSrc", "gamut"];   // gamut joined night 48
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    /* A CORRECTION LANDS AFTER THE MESSAGE IT CORRECTS (night 61 — a defect of nights 59 and 60, found on the face):
     * this card owns the harmony half and, hearing a message, may correct it — the object the tones make, a gamut
     * dropped under a chord, a default pick. Announced from INSIDE the listener, the correction is dispatched while
     * the outer message is still being delivered: a listener registered after this card (the readout, order 19)
     * hears the correction FIRST and the stale outer value LAST, and keeps it — the readout said "this dyad's stack"
     * over a triad, and "the R of Cmaj7 is outside the gamut" over a gamut the card had dropped, while the card and
     * the neck said otherwise (§4.4's silent divergence, painted). So a correction is announced in a microtask:
     * after the outer dispatch has reached everyone, before anything is painted. */
    const correct = (patch) => d.defaultView.queueMicrotask(() => announce(d, CONFIG_CHANGED, patch));
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
         * object without one hears the default in the same task (night 61: after the message, not inside it) */
        correct({ tones: cfg.tones });
      }
      /* TONES IS THE TRUTH (night 59): tones that arrive NAME the object. A pre-cut entry (payload v1) also
       * carries the object it was saved under; where that word is not what the tones make, the tones win
       * and the face says so once — never a silent relabel (§4.4), never the stored word over the material.
       * A payload without `object` (v2) derives silently, as it should. `object: "scale"` with no tones is
       * the scale itself. */
      /* NIGHT 60 (a night-59 defect, found by the migration fixture): the pick is derived NULL INCLUDED — a saved
       * scale étude carries `tones: null` and, since v2, no `object`; skipped, it restored as whatever object the
       * page was under (a tetrad), and the gamut it carried was then "dropped" as a chord's. objectOf(null) is
       * the scale, and always was; the guard here was the gap. */
      if ("tones" in m || "dyad" in m) {
        const derived = objectOf(tonePick(cfg));
        if (derived !== cfg.object) {
          if ("object" in m && m.object !== derived && m.object !== "scale") migrated = { saved: m.object, derived };
          cfg = { ...cfg, object: derived }; changed = true;
          correct({ object: derived });
        }
      }
      /* THE MIGRATION (night 60, ruled 261013b): a saved gamut with a chord object — a combination the one-state
       * rule forbids (nights 48–59 stored it). DROP THE GAMUT, keep the object and its tones (what sounds and
       * draws), and say so once: the gamut only shaded the field, so nothing selected or sounding changes. */
      if ("gamut" in m && cfg.gamut && cfg.object !== "scale") {
        dropped = { letters: letterOfGamut(cfg.gamut), saved: true };
        cfg = { ...cfg, gamut: null }; changed = true;
        correct({ gamut: null });
      }
      if (changed) render();
    });

    byId("hcKey").addEventListener("change", (e) => { cfg = { ...cfg, key: e.target.value }; push(); });
    /* THE GAMUT (night 48; night 60 a single select): the chosen option's degrees — the whole field's
     * seven, or a set; seven, or none, is the whole field (null — the stored key is ABSENT for it, never []) */
    byId("hcGamut").addEventListener("change", (e) => {
      const degs = e.target.value ? e.target.value.split(",").map(Number) : [];
      dropped = null;
      cfg = { ...cfg, gamut: normalizeGamut(degs) }; push();
    });
    byId("hcScale").addEventListener("change", (e) => { cfg = { ...cfg, scale: e.target.value }; push(); });
    /* choosing an object FILLS its tones (item 2's whole point for Shell:
     * R,3,7 appears, visibly) — a refused edit is forgotten with the object */
    byId("hcObj").addEventListener("change", (e) => {
      tonesErr = null; migrated = null; dropped = null;
      /* ONE STATE (night 60, ruled): a gamut narrows the scale — a chord object has already narrowed it, so a
       * gamut set under a scale is DROPPED when a chord is chosen, and said (never silent; ruled 261013b:
       * keep what makes the material, drop what only shades it) */
      const toChord = e.target.value !== "scale";
      if (toChord && cfg.gamut) dropped = { letters: letterOfGamut(cfg.gamut), saved: false };
      cfg = { ...cfg, object: e.target.value, tones: defaultPick(e.target.value), gamut: toChord ? null : cfg.gamut }; push();   // an object POPULATES the tones (night 59: a shortcut, not a cage)
    });
    /* THE TONES FIELD: parsed by the figure's parser, checked by the one
     * derivation (objectOffsets) — a refusal is a value on the face and the
     * last lawful pick stands; validation is live, as the figure's is */
    byId("hcTones").addEventListener("input", (e) => {
      migrated = null;
      if (cfg.object === "scale") {
        /* under a scale the field speaks NOTE NAMES of the key; the stored value is the gamut's degrees */
        const fld = field({ key: cfg.key, scale: cfg.scale });
        const r = parseNoteNames(e.target.value, fld);
        if (r.err) { tonesErr = r.err; render(); return; }
        tonesErr = null;
        cfg = { ...cfg, gamut: normalizeGamut(r.degrees) }; push();
        return;
      }
      const r = parseTones(e.target.value);
      if (r.err) { tonesErr = r.err; render(); return; }
      const pick = r.tones.map(degreeOfTone);
      let derived;
      try { derived = objectOf(pick); }
      catch (err) { tonesErr = String(err.message || err).replace(/^objectOf: /, ""); render(); return; }
      tonesErr = null;
      cfg = { ...cfg, tones: pick, object: derived }; push();   // the object is the name the tones make
    });
    byId("hcRef").addEventListener("change", (e) => {
      const v = e.target.value;
      if (v.startsWith("mode:")) cfg = { ...cfg, ref: +v.slice(5) };
      else cfg = { ...cfg, bass: v };
      push();
    });

    /* THE READOUT'S SIGNAL (night 60, rule 6): the walk's own NOTE — a fretted note of the material (the bass
     * and the pad are the chord's own tones, not the notes passing); its key degree lights a chip until the
     * next bar. The walk (order 6) registers before this card (order 10), so on an advance its STEP listener
     * runs first and the bar's immediate notes reach here BEFORE this card's own STEP listener — the row is
     * therefore keyed to the STEP's index, not cleared on the event: a new index starts a new set. */
    let litIndex = null;
    listen(d, STEP_CHANGED, (m) => { if (!m || typeof m.index !== "number") return; if (m.index !== litIndex) { litIndex = m.index; lit = new Set(); renderChips(); } });
    listen(d, NOTE, (m) => {
      if (!m || typeof m.midi !== "number" || m.role === "bass" || m.role === "pad" || cfg.object === "scale") return;
      const fld = field({ key: cfg.key, scale: cfg.scale });
      const i = fld.pcs.indexOf(((m.midi % 12) + 12) % 12);
      if (i < 0) return;   // a chord-supplied tone outside the key lights no key chip
      lit.add(i + 1); renderChips();
    });
    listen(d, CLOCK_STATE, (m) => { if (!m || typeof m.running !== "boolean") return; running = m.running; renderChips(); });

    push();
  },
};
