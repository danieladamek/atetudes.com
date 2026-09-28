/* readout.mjs — THE HARMONIC READOUT, built once for the three boards that
 * carry it (the neck, the étude end to end, the keys) — 260920, night 26
 * item 3, on mini.mjs's precedent and by the same count.
 *
 * WHAT IT SAYS: the current bar's chord and the mode that chord's degree
 * names in the chosen scale — `● Am7b5 — A Locrian`, the dot in the root's
 * own degree colour. The same value on all three boards, RULED: "the bar
 * tracking is synched with the other two views so it's the identical thing
 * in all three places."
 *
 * SHARE THE CODE, NOT THE VALUE (§4.2.3 — modules derive independently from
 * the message, never from each other). One builder, one markup, one set of
 * styles — standing rule 6 — but each board mounts its OWN instance, and each
 * instance keeps its own mirror of the configuration and the position,
 * adopted from CONFIG_CHANGED and STEP_CHANGED, and derives the chord through
 * the same progressionOf/chordAt and the one MODES table. They agree because
 * they compute the same thing from the same message, not because one told
 * the others: no instance reads another's DOM or state, and the gate empties
 * all three and steps the bar to prove each refills on its own.
 *
 * This file owns no markup or styles of its own — the `.readbox` grammar is
 * the shell's (three modules render it, so by the resolver's own rule it is
 * page grammar, not one module's property) — so, like mini.mjs, it is
 * reached through the imports of the modules that use it rather than mounted
 * as a contribution. The neck's night-25 seat (in .bh after the title, one
 * line, the ellipsis on the inner span, the chord surviving whole) is now the
 * grammar every board gets.
 */
import { field, MODES } from "../engine/field.mjs";
import { progressionOf, chordAt } from "../engine/progression.mjs";
import { pickOf } from "../engine/selection.mjs";
import { FAM, FAM_COLOR } from "./palette.mjs";
import { CONFIG_CHANGED, STEP_CHANGED, listen } from "./bus.mjs";

/** the configuration the readout needs, mirrored — the boot values are the
 * family's (harmony announces them; every mirror boots to the same) */
const BOOT = () => ({ key: "Bb", scale: "major", ref: 0, object: "tetrad",
  take: "one", notesPer: 3, tones: [1, 3, 5, 7],   // night 72: the neck opens on Line
  source: "cycle", cycle: "fourths", form: "ii-V-I", custom: "", start: 0 });

/** Fill `host` (a declared `.readbox` element) with the readout and wire it
 * to the bus. Returns the instance's own paint, for a board that wants to
 * repaint in step with its own render (it re-derives; it is handed nothing). */
/** THE CHORD NOW, ONE DERIVATION (night 70, 261027): the instance's mirror of the configuration and the position,
 * and the chord it names — exported so another surface that must agree with the readout (the chip row's root and roles,
 * sitting directly under Centricity's readout) reads the SAME derivation, never a second one that can disagree
 * (§4.4). Each caller gets its own mirror, as each readout instance always did; `onChange` fires with
 * { fld, cur, cfg, index } — or { err } when the configuration cannot name a chord. */
export function chordNow(ctx, onChange) {
  const d = ctx.doc;
  let cfg = BOOT(), index = 0;
  const derive = () => {
    try {
      const fld = field({ key: cfg.key, scale: cfg.scale, ref: cfg.ref });
      const prog = progressionOf(cfg, cfg.key, cfg.scale);
      return { fld, cur: chordAt(prog, index, fld, cfg.object, pickOf(cfg)), cfg, index };
    } catch (e) { return { err: String(e && e.message || e), cfg, index }; }
  };
  listen(d, CONFIG_CHANGED, (m) => {
    if (!m) return;
    let changed = false;
    for (const k of Object.keys(cfg)) if (k in m) { cfg = { ...cfg, [k]: m[k] }; changed = true; }
    if (changed) onChange(derive());
  });
  listen(d, STEP_CHANGED, (m) => {
    if (!m || m.request === true) return;
    if (typeof m.index === "number" && m.index !== index) { index = m.index; onChange(derive()); }
  });
  return derive;
}

export function mountReadout(ctx, host) {
  const d = ctx.doc;
  host.textContent = "";
  const text = d.createElement("span"); text.className = "readtext"; host.appendChild(text);

  const paint = (now) => {
    text.textContent = "";
    if (now.err) { text.textContent = now.err; return; }
    const { fld, cur, cfg } = now;
    if (cur.degree >= 0) {
      const dot = d.createElement("i"); dot.className = "readdot";
      dot.setAttribute("data-role", "degree-dot"); dot.setAttribute("data-deg", FAM[cur.degree]);
      dot.style.background = FAM_COLOR[FAM[cur.degree]]; text.appendChild(dot);
    }
    const ch = d.createElement("b"); ch.className = "readchord"; ch.textContent = cur.symbol;
    const md = d.createElement("span"); md.className = "readmode";
    md.textContent = cur.degree >= 0
      ? ` — ${fld.notes[cur.degree].name} ${MODES[cfg.scale][cur.degree]}`
      : " — not in the key";
    text.appendChild(ch); text.appendChild(md);
  };

  const now = chordNow(ctx, paint);
  const repaint = () => paint(now());
  repaint();
  return repaint;
}
