/* neck-readout.mjs — v0.9's READOUT and ASSERT lines (Multetudes surface,
 * 2026-08-29).
 *
 * Two full-width lines between the neck and the étude, exactly where v0.9
 * puts them: the prose readout (the reading · the bar · the frame · the
 * strings · the shape · what is missing, loudly) and the self-check line.
 * This module RE-DERIVES the whole configuration from the bus through
 * the same pure engine the neck used (§4.2.3 — modules derive independently
 * from the message, never from each other) and runs v0.9's own checks against
 * that derivation before drawing.
 *
 * THE READOUT SPEAKS TO THE PLAYER ABOUT THE MUSIC (night 86 — ruling 261054
 * §3). v0.9 painted "N assertions passed before drawing" under every bar; a
 * count of internal checks is not musician's language, and night 85 already
 * sent the failure's name to the console. The pass goes there too, with the
 * checks' names; the line is empty, and says something only when a check
 * fails — what is wrong and what to do (night 85).
 */
import { field, notesOn } from "../../engine/field.mjs";
import { positionOf, materialIn, regionOf } from "../../engine/position.mjs";
import { makeRun } from "../../engine/string-run.mjs";
import { oneOfEach, everyOccurrence, scaleTake, gripFit, orderBy, materialFor, chordSuppliedSentence, capOf } from "../../engine/selection.mjs";
import { progressionOf, chordAt } from "../../engine/progression.mjs";
import { placeReference, compositeOver, centreDegreeOf, centreMaterialRef, soundedBass } from "../../engine/reference.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, listen } from "../bus.mjs";
// 260917 item 1: the pick, and the ONE alias site for saved études' `dyad`
import { tonePick, pickOf } from "../../engine/selection.mjs";
import { describeGamut, pentatonicBreak } from "../../engine/gamut.mjs";
import { inGamut } from "../../engine/position.mjs";
import { alteredDegree } from "../../engine/chord.mjs";

const ORD = ["root", "2nd", "3rd", "4th", "5th", "6th", "7th"];
const SCALE_WORD = { major: "major", harm: "harmonic minor", mel: "melodic minor" };

/** THE PLACEMENT LAW the readout re-checks before drawing (night 85): every selected note sits in the frame, and is a
 * field note — or, since night 46 (role A, 7fc4e4a), one of the CHORD'S OWN off-key tones, placed from the chord's
 * supply (engine/selection.mjs chordSupply: member, chromatic, inside the frame). Returns the notes that break it; an
 * empty list is lawful. The v0.9 check (2026-08-28) demanded a field note and nothing else, and night 46 changed the law
 * without the check — so from 2026-09-12 every bar whose chord holds a tone the key lacks (a blues, a minor ii–V–i)
 * showed the visitor "assertion failed": 30,264 of 100,224 bars measured, every one the chord's own tone, none a fault. */
export function unlawfulNotes(sel, fld, pos, cur) {
  const pc = (m) => ((m % 12) + 12) % 12;
  const own = new Set(((cur && cur.tones) || []).filter((t) => t.offKey).map((t) => pc(t.pc)));
  return (sel || []).filter((x) => !(x.fret >= pos.fLo && x.fret <= pos.fHi
    && (fld.degOf(x.midi) >= 0 || (x.member === true && x.chromatic === true && own.has(pc(x.midi))))));
}

export const neckReadout = {
  id: "neck-readout",
  layer: "surface",
  requires: { surface: "multetudes" },
  mount_point: "boards",
  order: 19,
  controls: ["roLine", "roAssert"],

  /* THE HEADER BAND (night 85 — the shell rule: every panel has a header, the chevron's only seat; this board had none,
   * and the chevron sat on its first line — over the chord's name at 390). Its own collapse summary, shown. */
  markup: `
  <div class="bh"><span>The readout</span></div>
  <span class="clpsum">the readout</span>
  <div class="ro-line" id="roLine" data-control="roLine"></div>
  <div class="ro-assert" id="roAssert" data-control="roAssert"></div>`,

  styles: `
.ro-line{font-size:13px;line-height:1.6;color:var(--ink)}
.ro-line b{font-weight:bold}
.ro-line .ro-dim{color:var(--gray)}
.ro-assert{font-size:11px;color:var(--gray);margin-top:6px}
.ro-assert:empty{display:none}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId;
    let cfg = { key: "Bb", scale: "major", ref: 0, tuning: null, gamut: null, strings: [4, 3, 2, 1],
      startDeg: 4, nearFret: 3, object: "tetrad", take: "one", notesPer: 3, tones: [1, 3, 5, 7], sounded: "none", pad: false,   // night 57
      bass: "root" ,
      source: "cycle", cycle: "fourths", form: "ii-V-I", custom: "", start: 0,
      centreSrc: "fixed",
      movement: "arpeggiate",   // night 72 (was strum) · 261023 (night 65): mirrored so the readout can SAY the motif's movement
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
        const fld = field({ key: cfg.key, scale: cfg.scale, tuning: cfg.tuning,   // night 47
          ref: cfg.object === "scale" ? centreMaterialRef(cfg.centreSrc, cfg.ref) : cfg.ref });
        const run = makeRun(cfg.strings, fld.opens);   // the field's opens (night 44)
        const anchor = Math.max(...run.strings);
        const pos = positionOf({ field: fld, anchorString: anchor,
          startDegree: cfg.startDeg, nearFret: cfg.nearFret, strings: run.strings });
        regionOf(pos, run.strings);
        const pool = materialIn(pos, run.strings, fld, cfg.gamut);   // the gamut narrows the offer (night 48)
        /* THE CURRENT BAR through the one derivation (child 7). THREE
         * ABSENCES, each named, never merged: a slot the CHORD cannot fill
         * (a dyad's 7 on a triad), a tone the KEY cannot carry (B♭7's own
         * 7th in B♭ major — the field IS the key), and a tone this FRAME
         * cannot reach (the window's report, unchanged). */
        const prog = progressionOf(cfg, cfg.key, cfg.scale);
        if (index >= prog.chords.length) index = 0;
        const cur = chordAt(prog, index, fld, cfg.object, pickOf(cfg));
        let sel = [], msg = "", absences = [], absent = null;   // absent: what the placement dropped (261011c)
        if (prog.err) absences.push(prog.err);
        /* THE GAMUT (night 48) — the readout's sentence, site two of three (rule 10): what the
         * material is drawn from, and the rule's own refusal after a scale change (the degrees
         * stay in force; the pentatonic NAME is refused, never silently dropped) */
        if (cfg.gamut) {
          absences.push(`gamut: ${describeGamut(cfg.gamut, fld)}`);
          const brk = pentatonicBreak(cfg.gamut, cfg.scale);
          if (brk) absences.push(`${cfg.gamut.join(" ")} of ${cfg.key} ${SCALE_WORD[cfg.scale] || cfg.scale} is not semitone-free — ${fld.notes[brk[0]].name} and ${fld.notes[brk[1]].name} sit a semitone apart`);
          if (!pool.length) absences.push("the gamut leaves nothing in this window");
        }
        if (cfg.object === "scale") sel = scaleTake(pool).notes;
        else {
          const roFit = cfg.take === "all" ? { tones: cur.tones, dropped: [] }
            : gripFit(cur.tones, run.strings.length * capOf(cfg.notesPer));   // night 56: a line is uncapped
          const mat = materialFor(cur.tones, pool, fld, run.strings, pos);   // role A (night 46): the chord's own supply
          const r = cfg.take === "all"
            ? everyOccurrence(cur.tones, mat, { n: capOf(cfg.notesPer) })
            : oneOfEach(roFit.tones, mat, { n: capOf(cfg.notesPer), centre: pos.centre });
          sel = r.notes || r.partial || [];   // 260923: one-of-each's PARTIAL draws beside its refusal (ruling 260922b/3), the same in every view
          absent = { dropped: [...roFit.dropped, ...(r.dropped || []), ...(r.capped || [])], kept: sel.map((x) => x.role), strings: run.strings.length, notesPer: capOf(cfg.notesPer), resolvesAt: r.resolvesAt };
          if (roFit.dropped.length)
            absences.push(`the ${roFit.dropped.join(", ")} dropped by the grip rule — `
              + `${run.strings.length * capOf(cfg.notesPer)} slots carry `
              + roFit.tones.map((t) => t.role).join(" "));
          if (roFit.refuse) absences.push(roFit.refuse);
          if (cur.unnamed) absences.push(cur.unnamed);
          if (cur.absent.length)
            absences.push(`${cur.symbol} has no ${cur.absent.join(" or ")} — the chord cannot fill that slot`);
          if (cur.offKey.length) {   // the chord's own tone, said by the one engine sentence (night 46)
            const alt = alteredDegree(cfg.key, cfg.scale);
            absences.push(chordSuppliedSentence(cur.tones.filter((x) => x.offKey).map((x) => alt(x.pc + 60, x.name).label), cur.symbol));
          }
          /* the GAMUT's absence (night 48): a fourth absence, named on its own */
          const outsideGamut = cur.tones.filter((t) => fld.pcs.indexOf(t.pc) >= 0 && !inGamut(cfg.gamut, fld.pcs.indexOf(t.pc))).map((t) => t.role);
          if (outsideGamut.length) absences.push(`the ${outsideGamut.join(" and ")} of ${cur.symbol} is outside the gamut — a ${cfg.object} cannot be filled from it`);
          /* the frame's absence names only what the gamut did not already withhold — one fact, one sentence */
          const frameMissing = (r.missing || []).filter((x) => !outsideGamut.includes(x));
          if (frameMissing.length) msg = `no ${frameMissing.join(" or ")} in this frame`;
          if (r.capped && r.capped.length)
            msg = (msg ? msg + " · " : "")
              + `the ${r.capped.join(" and ")} is in the box but the grip cannot carry it`
              + (r.resolvesAt != null ? " — Line shows it" : "");   // night 56: any derived resolution is the line's
          if (r.unplaceable) msg = (r.collide
            ? `no placement fits — the ${r.collide.roles.join(" and ")} occur only on string ${r.collide.string}`
            : "no placement fits")
            + (r.resolvesAt != null
              ? " — Line takes them" : " — and no per-string ceiling resolves it");
        }
        // v0.9's own pre-draw checks, re-run here against an independent derivation
        check("the field is seven distinct degrees", () =>
          fld.pcs.length === 7 && new Set(fld.pcs).size === 7);
        check("the frame is three ascending scale notes", () =>
          pos.frets.length === 3 && pos.fLo < pos.fHi);
        check("no string carries more than the placement allows", () => {   // night 56: a line is UNCAPPED, so this binds under grip (and the scale's reach); vacuous under a line, by the ruling
          const per = {};
          for (const x of sel) per[x.string] = (per[x.string] || 0) + 1;
          const cap = cfg.object === "scale" ? 3 : capOf(cfg.notesPer);
          return Object.values(per).every((c) => c <= cap);
        });
        check("every selected note sits in the frame — a field note, or the chord's own tone", () =>
          unlawfulNotes(sel, fld, pos, cfg.object === "scale" ? null : cur).length === 0);
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
            : oneOfEach(bc.tones, pool, { n: capOf(cfg.notesPer), centre: pos.centre });
          if (br.notes) placeK++;
        }
        /* WHY THE WINDOW IS THIS WIDE (night 85, item 7 C — PO ruling 261053 §2): the engine widens a narrow set's
         * window until the set holds every pitch class of the field (position.mjs, 2026-09-07), and stops at the neck's
         * end naming what is still missing — and the readout said neither, so it held a silent value. It states the
         * fact here; the neck's hint teaches the control and the way out (it is where the control is: this line sits
         * 556 px below the neck at 1280, ~1100 at 390). Ink, never red: a window is drawn, not refused. */
        const SETN = ["", "one string holds", "two strings hold", "three strings hold", "four strings hold", "five strings hold", "six strings hold"];
        const nameOfPc = (pc) => (fld.notes.find((n) => ((n.pc % 12) + 12) % 12 === pc) || { name: "?" }).name;
        const short = pos.covered ? "" : pos.uncovered.map((pc) => `<b>${nameOfPc(pc)}</b>`).join(" and ");
        const why = !pos.covered ? "the neck ends · " : pos.fHi > pos.frets[2] ? `widened so ${SETN[run.strings.length] || "the set holds"} the whole scale · ` : "";
        bits.push(`frame from the <b>${ORD[pos.startDeg]}</b> on string ${anchor}, frets <b>${pos.fLo}–${pos.fHi}</b>`
          + (short ? `, short of ${short}` : "")
          + ` <span class="ro-dim">(${why}${pool.length} notes · ${placeK}/${prog.chords.length} bars place)</span>`);
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
        /* THE MOVEMENT, in the readout's voice (261023, night 65 — the motif's third part: the readout said the
         * placement and the figure and never said strum or arpeggiate). Stated as the neck resolves it: a figure
         * that resolves sequences the notes whatever the switch says (the neck greys strum then), and a scale
         * with no figure is a run with nothing to move (the neck greys both) — said, not guessed. */
        const fgm = String(cfg.figure || "").trim() ? orderBy(cfg.address, cfg.figure, sel, { fld, strings: run.strings, pos, absent }) : null;
        if (fgm && fgm.order && fgm.order.length)
          bits.push(`<b>arpeggiated</b> <span class="ro-dim">(in sequence — the figure orders it)</span>`);
        else if (cfg.object !== "scale")
          bits.push(/^arpeggi/.test(String(cfg.movement))   // a restored v0.1.0 étude says "arpeggio"
            ? `<b>arpeggiated</b> <span class="ro-dim">(in sequence, low to high)</span>`
            : `<b>strummed</b> <span class="ro-dim">(together)</span>`);
        if (String(cfg.figure || "").trim()) {
          const fg = fgm;   // 260923: the window, for the approach reach; 261011c: what the placement dropped
          if (fg.order && fg.order.length)
            bits.push(`figure <b>${fg.order.length} steps</b> <span class="ro-dim">(${cfg.address === "pattern" ? "a pattern" : "tones"}${fg.order.some((n) => n.role === "approach") ? ", with approaches" : ""})</span>`);
          else if (fg.err) bits.push(`<span style="color:#B82929">figure: ${fg.err}</span>`);   // the refusal reaches the readout too (rule 10, 261011c)
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
              ? rp.note.midi === fld.opens[rp.note.string] + rp.note.fret
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
          } else if (rp.offer && cfg.object === "scale") {
            /* night 85 — FOUND BY THE SELF-CHECK GUARD in a state the gate drives (C major, scale, strings 6 5 4 3 1 2):
             * the offered-unfretted branch (261001) read the stack back from cur.tones, which a scale does not have — the
             * night-18 .map-on-null, returned through a later branch, shown to a visitor as "assertion failed — Cannot
             * read properties of null". A scale has no stack: the offer is named plainly, as the fretted note is above. */
            bits.push(`the bass under the centre: <b>${rp.offer.name}</b> — <span class="ro-dim">unfretted: strings 5 and 6 are in the set; drawn below the strings, sounding nothing</span>`);
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
        /* THE SOUNDED BASS AND THE PAD (night 57) — the readout says them so the split is visible on the face (rule 10, CC-1) */
        if (cfg.sounded && cfg.sounded !== "none" && cfg.object !== "scale" && cur.degree >= 0 && roRefDeg != null) {
          const sb = soundedBass(cfg.sounded, roRefDeg, fld, pickOf(cfg));
          bits.push(sb.reason ? `<span style="color:#B82929">sounded bass silent: ${sb.reason}</span>`
            : `sounded bass <b>${sb.name}</b> <span class="ro-dim">— no string, under the material</span>`);
        } else if (cfg.sounded && cfg.sounded !== "none" && cfg.object === "scale" && roRefDeg != null) {
          const sb = soundedBass(cfg.sounded, roRefDeg, fld, null);
          bits.push(`sounded bass <b>${sb.name}</b> <span class="ro-dim">— no string, under the centre</span>`);
        }
        if (cfg.pad) bits.push(cfg.object === "scale" ? `<span class="ro-dim">pad: no chord under a scale</span>` : `pad <b>${cur.symbol}</b> <span class="ro-dim">— above the strings' register</span>`);
        for (const a of absences) bits.push(`<span style="color:#B82929">${a}</span>`);
        if (msg) bits.push(`<span style="color:#B82929">${msg}</span>`);
      } catch (e) {
        /* a THROW is a failing self-check too; for us, its first frames ride with it to the console (night 85) */
        fails.push(String(e && e.message || e) + (e && e.stack ? " @ " + String(e.stack).split("\n").slice(1, 3).map((l) => l.trim()).join(" < ") : ""));
        bits = [`<span style="color:#B82929">${String(e && e.message || e)}</span>`];
      }
      byId("roLine").innerHTML = bits.join(" · ");
      const a = byId("roAssert");
      /* A SELF-CHECK IS FOR US; A VISITOR NEEDS WHAT IS WRONG AND WHAT TO DO (night 85 — the two are not one string).
       * The check's own name and reason go where we look — the console (which every door gate reads) and a data
       * attribute — never onto the page. The visitor is told the drawing may be wrong and how to step away from it. */
      if (fails.length) {
        a.style.color = "#B82929"; a.style.fontWeight = "bold";
        a.textContent = "Something on this bar did not add up, so the neck may be drawn wrong here — step to another bar, or choose other strings.";
        a.dataset.selfcheck = fails.join(" ; ");
        if (d.defaultView && d.defaultView.console) d.defaultView.console.error("[readout self-check] " + fails.join(" ; "));
      } else {
        /* the pass is ours too (night 86): the console, beside where a failure goes, at the debug level — a line per
         * bar while playing, so never one a visitor's console shows by default */
        a.style.color = ""; a.style.fontWeight = "";
        delete a.dataset.selfcheck;
        a.textContent = "";
        if (d.defaultView && d.defaultView.console) d.defaultView.console.debug(`[readout self-check] ${asserts.length} passed before drawing: ${asserts.join(" · ")}`);
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
