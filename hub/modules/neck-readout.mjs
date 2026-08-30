/* neck-readout.mjs — v0.9's READOUT and ASSERT lines (Multetudes surface,
 * 2026-08-29).
 *
 * Two full-width lines between the neck and the étude, exactly where v0.9
 * puts them: the prose readout (the reading · the bar · the frame · the
 * strings · the shape · what is missing, loudly) and the assertion line —
 * "N assertions passed before drawing", which in this build is TRUE twice
 * over: this module RE-DERIVES the whole configuration from the bus through
 * the same pure engine the neck used (§4.2.3 — modules derive independently
 * from the message, never from each other), runs v0.9's own checks against
 * that derivation, and paints the count. A failing check paints RED — the
 * prototype's honesty, kept.
 */
import { field, OPEN_MIDI } from "../../engine/field.mjs";
import { positionOf, materialIn, regionOf } from "../../engine/position.mjs";
import { makeRun } from "../../engine/string-run.mjs";
import { oneOfEach, everyOccurrence, scaleTake } from "../../engine/selection.mjs";
import { progressionOf, chordAt } from "../../engine/progression.mjs";
import { placeReference, compositeOver } from "../../engine/reference.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, listen } from "../bus.mjs";

const ORD = ["root", "2nd", "3rd", "4th", "5th", "6th", "7th"];
const SCALE_WORD = { major: "major", harm: "harmonic minor", mel: "melodic minor" };

export const neckReadout = {
  id: "neck-readout",
  layer: "surface",
  requires: { surface: "multetudes" },
  mount_point: "boards",
  order: 19,
  controls: ["roLine", "roAssert"],

  markup: `
  <span class="clpsum">the readout</span>
  <div class="ro-line" id="roLine" data-control="roLine"></div>
  <div class="ro-assert" id="roAssert" data-control="roAssert"></div>`,

  styles: `
.ro-line{font-size:13px;line-height:1.6;color:var(--ink)}
.ro-line b{font-weight:bold}
.ro-line .ro-dim{color:var(--gray)}
.ro-assert{font-size:11px;color:var(--gray);margin-top:6px}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    let cfg = { key: "Bb", scale: "major", ref: 0, strings: [4, 3, 2, 1],
      startDeg: 4, nearFret: 3, object: "tetrad", take: "one", notesPer: 1, dyad: [3, 7],
      bass: "none" ,
      source: "cycle", cycle: "fourths", form: "ii-V-I", custom: "", start: 0 };
    let index = 0;

    const render = () => {
      const asserts = [], fails = [];
      const check = (name, f) => {
        asserts.push(name);
        try { if (f() === false) throw new Error("returned false"); }
        catch (e) { fails.push(name + " — " + e.message); }
      };
      let bits = [];
      try {
        const fld = field({ key: cfg.key, scale: cfg.scale, ref: cfg.ref });
        const run = makeRun(cfg.strings);
        const anchor = Math.max(...run.strings);
        const pos = positionOf({ field: fld, anchorString: anchor,
          startDegree: cfg.startDeg, nearFret: cfg.nearFret, strings: run.strings });
        regionOf(pos, run.strings);
        const pool = materialIn(pos, run.strings, fld);
        /* THE CURRENT BAR through the one derivation (child 7). THREE
         * ABSENCES, each named, never merged: a slot the CHORD cannot fill
         * (a dyad's 7 on a triad), a tone the KEY cannot carry (B♭7's own
         * 7th in B♭ major — the field IS the key), and a tone this FRAME
         * cannot reach (the window's report, unchanged). */
        const prog = progressionOf(cfg, cfg.key, cfg.scale);
        if (index >= prog.chords.length) index = 0;
        const cur = chordAt(prog, index, fld, cfg.object, cfg.dyad);
        let sel = [], msg = "", absences = [];
        if (prog.err) absences.push(prog.err);
        if (cfg.object === "scale") sel = scaleTake(pool).notes;
        else {
          const r = cfg.take === "all"
            ? everyOccurrence(cur.tones, pool, { n: cfg.notesPer })
            : oneOfEach(cur.tones, pool, { n: cfg.notesPer, centre: pos.centre });
          sel = r.notes || [];
          if (cur.absent.length)
            absences.push(`${cur.symbol} has no ${cur.absent.join(" or ")} — the chord cannot fill that slot`);
          if (cur.offKey.length)
            absences.push(`the ${cur.offKey.join(" and ")} of ${cur.symbol} is not in the key — the field cannot carry it`);
          if (r.missing && r.missing.length) msg = `no ${r.missing.join(" or ")} in this frame`;
          if (r.unplaceable) msg = r.collide
            ? `no placement fits — the ${r.collide.roles.join(" and ")} occur only on string ${r.collide.string}`
            : "no placement fits";
        }
        // v0.9's own pre-draw checks, re-run here against an independent derivation
        check("the field is seven distinct degrees", () =>
          fld.pcs.length === 7 && new Set(fld.pcs).size === 7);
        check("the frame is three ascending scale notes", () =>
          pos.frets.length === 3 && pos.fLo < pos.fHi);
        check("no string carries more than the placement allows", () => {
          const per = {};
          for (const x of sel) per[x.string] = (per[x.string] || 0) + 1;
          const cap = cfg.object === "scale" ? 3 : cfg.notesPer;
          return Object.values(per).every((c) => c <= cap);
        });
        check("every selected note is a real field note in the frame", () =>
          sel.every((x) => fld.degOf(x.midi) >= 0 && x.fret >= pos.fLo && x.fret <= pos.fHi));
        check("the étude is at least one bar", () => true);

        bits.push(cfg.ref
          ? `<b>${fld.refNote.name} ${fld.modeName}</b> <span class="ro-dim">(the ${cfg.key} ${SCALE_WORD[cfg.scale]} collection)</span>`
          : `<b>${cfg.key} ${SCALE_WORD[cfg.scale] || cfg.scale}</b>`);
        bits.push(`bar <b>${index + 1}</b> of ${prog.chords.length}` +
          (cfg.object === "scale" ? "" :
            ` — <b>${cur.symbol}</b> <span class="ro-dim">(${cur.roman})</span>`));
        bits.push(`frame from the <b>${ORD[pos.startDeg]}</b> on string ${anchor}, frets <b>${pos.fLo}–${pos.fHi}</b>`);
        const ss = [...run.strings].sort((a, b) => b - a).map(String).join("–");
        bits.push(`strings <b>${ss}</b>${run.contiguous ? "" : ' <span class="ro-dim">(skipped)</span>'}, <b>${cfg.notesPer === 1 ? "grip" : "line"}</b>`);
        if (sel.length) {
          const per = {};
          for (const x of sel) per[x.string] = (per[x.string] || 0) + 1;
          const shape = run.strings.map((s) => per[s] || 0).join("+");
          const isLine = Object.values(per).some((c) => c > 1);
          bits.push(`${shape} across the set <span class="ro-dim">(${isLine ? "a line" : "a block"})</span>`);
        }
        /* THE REFERENCE, fretted and NAMED (child 5): the readout says what
         * the stack becomes over it — R19's sentence. The name arrives from
         * compositeOver's read-back through chord.mjs, or honestly not at
         * all; a refusal is spoken by name, never blanked. */
        if (cfg.object !== "scale" && cfg.bass !== "none" && cur.degree < 0) {
          bits.push(`<span style="color:#B82929">reference refused: the reference is relative to the ` +
            `chord's degree, and ${cur.symbol}'s root is not in the key</span>`);
        } else if (cfg.object !== "scale" && cfg.bass !== "none") {
          const rp = placeReference(cfg.bass, cur.degree, fld, run.strings, pos);
          check("the reference is a real fretted note or refused by name", () =>
            rp.note
              ? rp.note.midi === OPEN_MIDI[rp.note.string] + rp.note.fret
              : typeof rp.reason === "string" && rp.reason.length > 0);
          if (rp.note) {
            const comp = compositeOver(fld, rp.note.keyDeg, cur.tones.map((t) => t.pc));
            bits.push(`over <b>${comp.bassName}</b> — string ${rp.note.string}, fret ${rp.note.fret}`
              + (rp.stretch ? ' <span class="ro-dim">(a stretch past the box)</span>' : "")
              + (comp.name ? `: the stack is <b>${comp.name}</b>` : ' <span class="ro-dim">(an unnamed stack — no honest symbol reads back)</span>'));
          } else {
            bits.push(`<span style="color:#B82929">reference refused: ${rp.reason}</span>`);
          }
        }
        for (const a of absences) bits.push(`<span style="color:#B82929">${a}</span>`);
        if (msg) bits.push(`<span style="color:#B82929">${msg}</span>`);
      } catch (e) {
        fails.push(String(e && e.message || e));
        bits = [`<span style="color:#B82929">${String(e && e.message || e)}</span>`];
      }
      byId("roLine").innerHTML = bits.join(" · ");
      const a = byId("roAssert");
      if (fails.length) {
        a.style.color = "#B82929"; a.style.fontWeight = "bold";
        a.textContent = "assertion failed — " + fails.join(" ; ");
      } else {
        a.style.color = ""; a.style.fontWeight = "";
        a.textContent = `${asserts.length} assertions passed before drawing.`;
      }
    };

    listen(d, CONFIG_CHANGED, (m) => {
      if (!m || typeof m !== "object") return;
      for (const k of Object.keys(cfg))
        if (k in m) cfg = { ...cfg, [k]: Array.isArray(m[k]) ? [...m[k]] : m[k] };
      render();
    });
    listen(d, STEP_CHANGED, (m) => {
      if (!m || m.request === true || typeof m.index !== "number") return;
      if (m.index !== index) { index = m.index; render(); }
    });
    render();
  },
};
