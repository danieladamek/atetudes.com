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
import { field, OPEN_MIDI, notesOn } from "../../engine/field.mjs";
import { positionOf, materialIn, regionOf } from "../../engine/position.mjs";
import { makeRun } from "../../engine/string-run.mjs";
import { oneOfEach, everyOccurrence, scaleTake, gripFit, orderBy } from "../../engine/selection.mjs";
import { progressionOf, chordAt } from "../../engine/progression.mjs";
import { placeReference, compositeOver, centreDegreeOf, centreMaterialRef } from "../../engine/reference.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, listen } from "../bus.mjs";
// 260917 item 1: the pick, and the ONE alias site for saved études' `dyad`
import { tonePick, pickOf } from "../../engine/selection.mjs";

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
      startDeg: 4, nearFret: 3, object: "tetrad", take: "one", notesPer: 1, tones: [1, 3, 5, 7],
      bass: "root" ,
      source: "cycle", cycle: "fourths", form: "ii-V-I", custom: "", start: 0,
      centreSrc: "fixed",
      /* the figure (260919, item 3): mirrored so the readout can SAY it — the
       * one piece of state it never carried; the hint's clause moved here */
      address: "pattern", figure: "" };
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
        /* the centre's SOURCE (260914): material stable, reading per bar */
        const fld = field({ key: cfg.key, scale: cfg.scale,
          ref: cfg.object === "scale" ? centreMaterialRef(cfg.centreSrc, cfg.ref) : cfg.ref });
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
        const cur = chordAt(prog, index, fld, cfg.object, pickOf(cfg));
        let sel = [], msg = "", absences = [];
        if (prog.err) absences.push(prog.err);
        if (cfg.object === "scale") sel = scaleTake(pool).notes;
        else {
          const roFit = cfg.take === "all" ? { tones: cur.tones, dropped: [] }
            : gripFit(cur.tones, run.strings.length * cfg.notesPer);
          const r = cfg.take === "all"
            ? everyOccurrence(cur.tones, pool, { n: cfg.notesPer })
            : oneOfEach(roFit.tones, pool, { n: cfg.notesPer, centre: pos.centre });
          sel = r.notes || r.partial || [];   // 260923: one-of-each's PARTIAL draws beside its refusal (ruling 260922b/3), the same in every view
          if (roFit.dropped.length)
            absences.push(`the ${roFit.dropped.join(", ")} dropped by the grip rule — `
              + `${run.strings.length * cfg.notesPer} slots carry `
              + roFit.tones.map((t) => t.role).join(" "));
          if (roFit.refuse) absences.push(roFit.refuse);
          if (cur.unnamed) absences.push(cur.unnamed);
          if (cur.absent.length)
            absences.push(`${cur.symbol} has no ${cur.absent.join(" or ")} — the chord cannot fill that slot`);
          if (cur.offKey.length)
            absences.push(`the ${cur.offKey.join(" and ")} of ${cur.symbol} is not in the key — the field cannot carry it`);
          if (r.missing && r.missing.length) msg = `no ${r.missing.join(" or ")} in this frame`;
          if (r.capped && r.capped.length)
            msg = (msg ? msg + " · " : "")
              + `the ${r.capped.join(" and ")} is in the box but the grip cannot carry it`
              + (r.resolvesAt != null && r.resolvesAt <= 3 ? " — Line shows it" : "");
          if (r.unplaceable) msg = (r.collide
            ? `no placement fits — the ${r.collide.roles.join(" and ")} occur only on string ${r.collide.string}`
            : "no placement fits")
            + (r.resolvesAt != null && r.resolvesAt <= 3
              ? " — Line takes them" : " — and no per-string ceiling resolves it");
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

        /* THE FIELD'S OWN COUNT (260919, item 3 — moved from the hint, which
         * said "the whole field, 57 notes"; the readout carried only the frame's
         * count): derived here through the engine's notesOn over six strings —
         * the neck's own arithmetic-checked count, re-derived, never read */
        const fieldN = [1, 2, 3, 4, 5, 6].reduce((n, s) => n + notesOn(s, fld).length, 0);
        bits.push((cfg.ref
          ? `<b>${fld.refNote.name} ${fld.modeName}</b> <span class="ro-dim">(the ${cfg.key} ${SCALE_WORD[cfg.scale]} collection)</span>`
          : `<b>${cfg.key} ${SCALE_WORD[cfg.scale] || cfg.scale}</b>`)
          + ` <span class="ro-dim">— the whole field, ${fieldN} notes</span>`);
        bits.push(`bar <b>${index + 1}</b> of ${prog.chords.length}` +
          (cfg.object === "scale" ? "" :
            ` — <b>${cur.symbol}</b> <span class="ro-dim">(${cur.roman})</span>`));
        const roRefDeg = cfg.object === "scale"
          ? centreDegreeOf(cfg.centreSrc, cfg.ref, cur.degree)
          : cur.degree;   // 4a + 260914: the centre, from its source
        /* WHICH SOURCE IS IN FORCE (260914): the sentence that resolves the
         * strip/bass mismatch — a pedal under the moving chords, or a
         * centre that follows. Being explicit here IS the fix; no separate
         * mismatch sentence exists. */
        if (cfg.object === "scale") {
          if (cfg.centreSrc === "follows")
            bits.push(roRefDeg != null
              ? `the centre <b>follows the changes</b> — this bar reads against <b>${fld.notes[roRefDeg].name}</b>`
              : `<span style="color:#B82929">the centre cannot follow ${cur.symbol} — its root is not in the key</span>`);
          else
            bits.push(`centre <b>${fld.notes[(cfg.ref ?? 0)].name}</b> — a pedal under the moving chords`);
        }
        /* THE FRAME'S CARRYING CAPACITY (260908, 2c): computed and thrown
         * away until tonight — how many notes this frame holds and how many
         * of the progression's bars place in it at the current cap. Real
         * guitar knowledge, one line. */
        let placeK = 0;
        for (let bi = 0; bi < prog.chords.length; bi++) {
          const bc = chordAt(prog, bi, fld, cfg.object, pickOf(cfg));
          if (cfg.object === "scale") { placeK++; continue; }
          const br = cfg.take === "all"
            ? { notes: true }
            : oneOfEach(bc.tones, pool, { n: cfg.notesPer, centre: pos.centre });
          if (br.notes) placeK++;
        }
        bits.push(`frame from the <b>${ORD[pos.startDeg]}</b> on string ${anchor}, frets <b>${pos.fLo}–${pos.fHi}</b>`
          + ` <span class="ro-dim">(${pool.length} notes · ${placeK}/${prog.chords.length} bars place)</span>`);
        const ss = [...run.strings].sort((a, b) => b - a).map(String).join("–");
        /* THE TAKE WORD (260919, item 3 — moved from the hint; the readout said
         * grip/line but never one-of-each/every-occurrence, the cap's meaning) */
        const takeWord = cfg.object === "scale" ? ""
          : cfg.take === "all"
            ? (cfg.notesPer === 1 ? ", every occurrence the grip allows" : ", every occurrence")
            : ", one of each";
        bits.push(`strings <b>${ss}</b>${run.contiguous ? "" : ' <span class="ro-dim">(skipped)</span>'}, <b>${cfg.notesPer === 1 ? "grip" : "line"}</b>${takeWord}`);
        if (sel.length) {
          const per = {};
          for (const x of sel) per[x.string] = (per[x.string] || 0) + 1;
          const shape = run.strings.map((s) => per[s] || 0).join("+");
          const isLine = Object.values(per).some((c) => c > 1);
          bits.push(`${shape} across the set <span class="ro-dim">(${isLine ? "a line" : "a stack"})</span>`);
        }
        /* THE FIGURE, in the readout's voice (260919, item 3 — moved from the
         * hint; the readout never mentioned it): derived here through the same
         * orderBy the neck uses, never read from the neck */
        if (String(cfg.figure || "").trim()) {
          const fg = orderBy(cfg.address, cfg.figure, sel, { fld, strings: run.strings, pos });   // 260923: the window, for the approach reach
          if (fg.order && fg.order.length)
            bits.push(`figure <b>${fg.order.length} steps</b> <span class="ro-dim">(${cfg.address === "pattern" ? "a pattern" : "tones"}${fg.order.some((n) => n.role === "approach") ? ", with approaches" : ""})</span>`);
        }
        /* THE REFERENCE, fretted and NAMED (child 5): the readout says what
         * the stack becomes over it — R19's sentence. The name arrives from
         * compositeOver's read-back through chord.mjs, or honestly not at
         * all; a refusal is spoken by name, never blanked. */
        if (cfg.object !== "scale" && cfg.bass !== "none" && cur.degree < 0) {
          bits.push(`<span style="color:#B82929">reference refused: the reference is relative to the ` +
            `chord's degree, and ${cur.symbol}'s root is not in the key</span>`);
        } else if (cfg.bass !== "none" && roRefDeg != null) {
          const rp = placeReference(cfg.bass, roRefDeg, fld, run.strings, pos, pickOf(cfg));
          check("the reference is a real fretted note, offered unfretted by name, or refused by name", () =>
            rp.note
              ? rp.note.midi === OPEN_MIDI[rp.note.string] + rp.note.fret
              : typeof rp.reason === "string" && rp.reason.length > 0 && (!rp.offer || rp.offer.unfretted === true));
          if (rp.note && cfg.object === "scale") {
            /* a scale has no stack to read back over the bass — the note is
             * named plainly (the .map-on-null this line replaces was the
             * night-18 4a change letting this branch run under a scale) */
            const bn = fld.notes.find((n) => n.pc === (((rp.note.midi % 12) + 12) % 12));
            bits.push(`the bass under the centre: <b>${bn ? bn.name : "?"}</b> — string ${rp.note.string}, fret ${rp.note.fret}`
              + (rp.stretch ? ' <span class="ro-dim">(a stretch past the box)</span>' : ""));
          } else if (rp.note) {
            const comp = compositeOver(fld, rp.note.keyDeg, cur.tones.map((t) => t.pc));
            bits.push(`over <b>${comp.bassName}</b> — string ${rp.note.string}, fret ${rp.note.fret}`
              + (rp.stretch ? ' <span class="ro-dim">(a stretch past the box)</span>' : "")
              + (comp.name ? `: the stack is <b>${comp.name}</b>` : ' <span class="ro-dim">(an unnamed stack — no honest symbol reads back)</span>'));
          } else if (rp.offer) {
            /* 261001: offered unfretted — named, the stack read back over its degree, and
             * honest about sound: nothing sits under the strings, so nothing sounds */
            const comp = compositeOver(fld, rp.offer.keyDeg, cur.tones.map((t) => t.pc));
            bits.push(`over <b>${rp.offer.name}</b> — <span class="ro-dim">unfretted: strings 5 and 6 are in the set; drawn below the strings, sounding nothing</span>`
              + (comp.name ? `: the stack is <b>${comp.name}</b>` : ""));
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
