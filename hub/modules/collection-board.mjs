/* collection-board.mjs — CHROMATETUDES' BOARD: the collection, its scale of chords, walked on a string set
 * (Chromatetudes child 3, 261122; brief notes/specs/chromatetudes — the collection door, v0.1.md).
 *
 * One board: the controls (Key · Collection · Stacking interval · Voicing · String set), the walk's
 * transport (◀ Play ▶), the neck and the chord. Everything musical is derived by the engine:
 * engine/collection.mjs (the collection, its spelling, the stack) and engine/collection-walk.mjs (the
 * placed walk, its law asserted on every walk it returns). Nothing here places a note.
 *
 * THE WALK OWNS ITS OWN STEP, ON THE FAMILY'S CLOCK. Play asks the clock owner (the metronome card) to
 * run, as the transport does (CLOCK { run, owner: "transport" }); each bar of BEATs advances one position
 * and the chord sounds through NOTE — the family's audio card realises it with the current voice. The
 * walk climbs to the top of the neck and comes back down. This board announces no STEP message: the
 * audio card answers a step echo with the tetrad door's own pass, which is not this door's music.
 *
 * NAMING — RULED, Daniel 261122 (brief §6.2): a chord is named once, by the collection — the lowest
 * member degree of its cycle names it. C6 in every inversion, D°7 for the diminished in C. One rule,
 * chordName below; the count of distinct names equals the engine's count of distinct chords (asserted
 * in hub/tests/collection-board.test.mjs over twelve keys).
 *
 * COLOUR AND SHAPE — RULED, Daniel 261122 (brief §6.3): every member is a circle in the §2.1 colour of
 * its DEGREE NAME (the engine's `fam`), labelled with the degree name. Never the letter's colour: in
 * D♭ the ♭6 is shown as A, and it is still cyan. v0.1 draws no starburst — nothing is outside the
 * collection.
 *
 * SHARED SETTINGS — RULED (brief §6.4): key, string set, bpm and meter travel through the practice log
 * (the door's `shared` declaration; the notepad card does the mapping). The collection is not a shared
 * concept: a seven-note scale from a sibling's note is withheld by the card, named. A string set this
 * door cannot play is not applied, and the board says so on its face.
 */
import { KEYS, COLLECTIONS, collection, stackIntervals, chordOn, enharmonicOf } from "../../engine/collection.mjs";
import { walk, setsFor, familiesFor, WALK_FAMILIES, NFRETS } from "../../engine/collection-walk.mjs";
import { pcOfKey } from "../../engine/shared-config.mjs";
import { CONFIG_CHANGED, CLOCK, CLOCK_STATE, BEAT, NOTE, MIXER, listen, announce, announceAfter } from "../bus.mjs";
import { FAM_COLOR, FAM_TEXT } from "../palette.mjs";

const SVGNS = "http://www.w3.org/2000/svg";
const NECK = { X0: 34, FW: 44, Y0: 18, SG: 22, R: 11, r: 4.5 };   // the neck's geometry: nut x, fret width, top string y, string gap, dot radii

/** a spelled name in the family's glyphs: Db → D♭, F# → F♯, Bbb → B𝄫 */
export const glyph = (name) => name[0] + name.slice(1).replace(/bb/g, "𝄫").replace(/##/g, "𝄪").replace(/b/g, "♭").replace(/#/g, "♯");

/* Design Spec §2.5's glyphs for the four qualities a collection stacks */
const QUALITY_GLYPH = { "6": "6", m6: "m6", dim7: "°7", aug: "+" };

/** THE NAME (ruling §6.2): the lowest member degree of the cycle names the chord. Returns the root note,
 * the shown symbol, and whether the chord is symmetric (every member a root). */
export function chordName(coll, ch) {
  const lowest = Math.min(...ch.members);
  const root = coll.notes[lowest];
  if (!ch.roots.includes(root.pc))
    throw new Error(`chordName: ${root.name} is the lowest member of the chord on degree ${ch.degree} of ${coll.name}, ` +
      `and chord.mjs does not read it as a root of ${ch.quality}`);
  return { root, symbol: glyph(root.name) + QUALITY_GLYPH[ch.quality], ascii: root.name + ch.quality,
    symmetric: ch.roots.length === ch.members.length };
}

const KTH = (k) => k + (k === 1 ? "st" : k === 2 ? "nd" : k === 3 ? "rd" : "th");

export const collectionBoard = {
  id: "collection-board",
  layer: "surface",
  requires: { surface: "chromatetudes" },
  mount_point: "boards",
  order: 10,
  controls: ["cxKey", "cxColl", "cxStack", "cxFam", "cxSet", "cxPrev", "cxPlay", "cxNext", "cxNeck"],

  markup: `
  <div class="bh"><span>The scale of chords</span></div>
  <div class="cxRow">
    <div><label for="cxKey">Key</label><select id="cxKey" data-control="cxKey"></select></div>
    <div><label for="cxColl">Collection</label><select id="cxColl" data-control="cxColl"></select></div>
    <div id="cxStackGrp"><label for="cxStack">Stacking interval</label><select id="cxStack" data-control="cxStack"></select></div>
    <div><label for="cxFam">Voicing</label><select id="cxFam" data-control="cxFam"></select></div>
    <div><label for="cxSet">String set</label><select id="cxSet" data-control="cxSet"></select></div>
  </div>
  <div class="transport cxTr">
    <button id="cxPrev" data-control="cxPrev" title="previous chord" aria-label="previous chord">&#9664;</button>
    <button id="cxPlay" data-control="cxPlay" class="primary">Play</button>
    <button id="cxNext" data-control="cxNext" title="next chord" aria-label="next chord">&#9654;</button>
    <span class="cxChord" id="cxChord"></span>
    <span class="cxPos" id="cxPos"></span>
  </div>
  <svg id="cxNeck" data-control="cxNeck" role="img" aria-label="the neck"></svg>
  <div class="cxLine" id="cxTones"></div>
  <div class="cxLine" id="cxSays"></div>
  <div class="clpsum" id="cxSum"></div>
  <div class="hint info">The collection's scale of chords: stack every chosen note of the collection from each degree and you get one chord per degree, voiced on four (or three) adjacent strings. Step a chord at a time with the arrows, or let the middle button walk it up the neck and back on the metronome's beat — one chord a bar. Between neighbouring chords every voice moves exactly one note of the collection, on its own string. Each dot is coloured by its degree against the key and labelled with it; click a dot to hear it.</div>
  <div class="hint info" id="cxReadings"></div>`,

  styles: `
.cxRow{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:flex-end;margin-bottom:8px}
.cxRow>div{flex:0 1 auto}
.cxTr{margin:6px 0 4px}
.cxChord{font-size:20px;font-weight:bold;margin-left:10px;color:var(--ink)}
.cxPos{font-size:12px;color:var(--gray)}
#cxNeck{width:100%;height:auto;display:block;margin-top:4px}
#cxNeck [data-midi]{cursor:pointer}
.cxLine{font-size:12.5px;color:var(--ink);margin-top:6px;line-height:1.45}
#cxSays{color:var(--gray)}`,

  mount(ctx) {
    const d = ctx.doc, byId = ctx.byId, view = d.defaultView;
    /* PRIVATE STATE. The configuration this board announces, and the walk's position. */
    let cfg = { key: "C", collection: "sixth-dim-major", k: 2, family: "drop2", strings: [4, 3, 2, 1] };
    let w = null, pos = 0, dir = 1;
    let armed = false, spent = 0, meter = 4, bpm = 120;
    let notApplied = "";
    const preferred = { 3: null, 4: null };   // the last set chosen per arity, so a collection change keeps the hand where it was

    const el = (t, a, p) => { const e = d.createElementNS(SVGNS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
    const opt = (sel, value, text, on, disabled) => {
      const o = d.createElement("option"); o.value = value; o.textContent = text;
      if (on) o.selected = true; if (disabled) o.disabled = true; sel.appendChild(o);
    };
    const coll = () => collection({ key: cfg.key, id: cfg.collection });
    const arityOf = (c, k) => chordOn(c, 0, k).members.length;

    /* the configuration made whole: an offered k, a family and a set the arity can take — corrected, never refused */
    const settle = () => {
      const ks = stackIntervals(cfg.collection);
      if (!ks.includes(cfg.k)) cfg.k = ks[0];
      const ar = arityOf(coll(), cfg.k);
      const fams = familiesFor(ar);
      if (!fams.includes(cfg.family)) cfg.family = fams[0];
      const sets = setsFor(ar);
      const same = (s) => s.strings.join() === cfg.strings.join();
      if (!sets.some(same)) {
        const keep = preferred[ar] && sets.find((s) => s.strings.join() === preferred[ar].join());
        cfg.strings = [...(keep || sets[sets.length - 1]).strings];
      }
      preferred[ar] = [...cfg.strings];
      return ar;
    };

    const fill = () => {
      const c = coll(), ar = arityOf(c, cfg.k);
      const sk = byId("cxKey"); sk.textContent = "";
      for (const k of KEYS) opt(sk, k, glyph(k), k === cfg.key);
      const sc = byId("cxColl"); sc.textContent = "";
      for (const [id, x] of Object.entries(COLLECTIONS)) opt(sc, id, x.name, id === cfg.collection);
      const ss = byId("cxStack"); ss.textContent = "";
      const ks = stackIntervals(cfg.collection);
      for (const k of ks) {
        const q = chordOn(c, 0, k).quality;
        opt(ss, String(k), `every ${KTH(k)} note — ${QUALITY_GLYPH[q]} chords`, k === cfg.k);
      }
      byId("cxStackGrp").hidden = ks.length < 2;   // shown only when the collection offers more than one
      const sf = byId("cxFam"); sf.textContent = "";
      for (const f of Object.keys(WALK_FAMILIES).filter((f) => WALK_FAMILIES[f].arity === ar))
        opt(sf, f, WALK_FAMILIES[f].label + (WALK_FAMILIES[f].withheld ? " — withheld" : ""), f === cfg.family, !!WALK_FAMILIES[f].withheld);
      const st = byId("cxSet"); st.textContent = "";
      setsFor(ar).forEach((s, i) => opt(st, String(i), s.label, s.strings.join() === cfg.strings.join()));
    };

    const say = () => announce(d, CONFIG_CHANGED, { key: cfg.key, collection: cfg.collection, k: cfg.k, family: cfg.family, strings: [...cfg.strings] });

    /* rebuild the walk; keep the hand near where it was (the nearest average fret) */
    const rebuild = () => {
      const ar = settle();
      const set = setsFor(ar).find((s) => s.strings.join() === cfg.strings.join());
      const before = w && w.positions[pos] ? w.positions[pos].notes.reduce((a, n) => a + n.fret, 0) / w.positions[pos].notes.length : null;
      w = walk({ key: cfg.key, id: cfg.collection, k: cfg.k, family: cfg.family, set });
      if (before === null) pos = Math.max(0, w.positions.findIndex((q) => q.degree === 0));   // the first chord of the collection, lowest on the neck
      else {
        let best = 0, bd = Infinity;
        w.positions.forEach((p, i) => { const a = p.notes.reduce((s, n) => s + n.fret, 0) / p.notes.length; if (Math.abs(a - before) < bd) { bd = Math.abs(a - before); best = i; } });
        pos = best;
      }
      fill(); render();
    };

    const narrow = () => !!(view && view.matchMedia && view.matchMedia("(max-width: 600px)").matches);
    const fx = (f) => f === 0 ? NECK.X0 - 14 : NECK.X0 + (f - 0.5) * NECK.FW;
    const sy = (s) => NECK.Y0 + (s - 1) * NECK.SG;

    const render = () => {
      const c = coll(), p = w.positions[pos], ch = p.chord, nm = chordName(c, ch);
      const svg = byId("cxNeck"); svg.textContent = "";
      const W = NECK.X0 + NECK.FW * NFRETS + 10, H = sy(6) + 30;
      let x0 = 0, vw = W;
      if (narrow()) {   // at a phone's width the neck is a window of six frets around the chord, as Multetudes' is
        const fr = p.notes.map((n) => n.fret);
        const lo = Math.max(0, Math.min(NFRETS - 5, Math.min(...fr) - 1));
        x0 = lo === 0 ? 0 : fx(lo) - NECK.FW / 2 - 8; vw = fx(lo + 5) + NECK.FW / 2 + 8 - x0;
        svg.setAttribute("data-window", `${lo}-${lo + 5}`);
      } else svg.removeAttribute("data-window");
      svg.setAttribute("viewBox", `${x0} 0 ${vw} ${H}`);
      // the board: frets, nut, inlays, strings, fret numbers — neutral furniture
      for (let f = 0; f <= NFRETS; f++)
        el("line", { x1: NECK.X0 + f * NECK.FW, y1: sy(1), x2: NECK.X0 + f * NECK.FW, y2: sy(6), stroke: f === 0 ? "#212126" : "#C9C9CE", "stroke-width": f === 0 ? 3 : 1 }, svg);
      for (const f of [3, 5, 7, 9, 12, 15]) {
        const t = el("text", { x: fx(f), y: sy(6) + 20, "text-anchor": "middle", "font-size": "10", fill: "#73737A" }, svg);
        t.textContent = String(f);
      }
      for (let s = 1; s <= 6; s++)
        el("line", { x1: NECK.X0, y1: sy(s), x2: NECK.X0 + NFRETS * NECK.FW, y2: sy(s), stroke: w.set.strings.includes(s) ? "#8E8E95" : "#DADADE", "stroke-width": 1 + (s - 1) * 0.25 }, svg);
      // the collection on the set's strings — small, unlabelled, in their degree colour (the field the chord sits in)
      const opens = Object.fromEntries(w.set.strings.map((s, i) => [s, w.set.opens[i]]));
      const pcs = new Map(c.notes.map((n) => [n.pc, n]));
      for (const s of w.set.strings)
        for (let f = 0; f <= NFRETS; f++) {
          const n = pcs.get((opens[s] + f) % 12);
          if (n) el("circle", { cx: fx(f), cy: sy(s), r: NECK.r, fill: FAM_COLOR[n.fam], "fill-opacity": "0.35", class: "cxField" }, svg);
        }
      // the chord: full circles, the degree name inside
      for (const n of p.notes) {
        const g = el("g", { "data-midi": String(n.midi), "data-deg": n.degName, "data-fam": n.fam, role: "button", "aria-label": `${glyph(n.name)}, the ${n.degName}, string ${n.string} fret ${n.fret}` }, svg);
        el("circle", { cx: fx(n.fret), cy: sy(n.string), r: NECK.R, fill: FAM_COLOR[n.fam] }, g);
        const t = el("text", { x: fx(n.fret), y: sy(n.string) + 3.6, "text-anchor": "middle", "font-size": "10", "font-weight": "bold", fill: FAM_TEXT[n.fam], class: "dot-label" }, g);
        t.textContent = n.degName;
        g.addEventListener("click", () => announce(d, NOTE, { midi: n.midi }));
      }
      byId("cxChord").textContent = nm.symbol;
      byId("cxPos").textContent = `${pos + 1} of ${w.positions.length}`;
      // the chord's tones, low to high, each with its degree; and the collection's distinct chords
      byId("cxTones").textContent = `${nm.symbol}: ` + p.notes.map((n) => `${glyph(n.name)} (${n.degName})`).join(" · ");
      const names = [...new Set(Array.from({ length: c.N }, (_, dg) => chordName(c, chordOn(c, dg, cfg.k)).symbol))];
      const sym = nm.symmetric ? ` ${nm.symbol} is symmetric: every member is a root — ${[...ch.members].sort((x, y) => x - y).map((m) => glyph(c.notes[m].name)).join(" ")} name the same chord.` : "";
      byId("cxSays").textContent = `${glyph(cfg.key)} ${c.name}: ${names.length} chord${names.length === 1 ? "" : "s"} — ${names.join(" · ")}.${sym}` +
        (notApplied ? " " + notApplied : "");
      // the info note: the other reading of every altered degree, from the engine's enharmonicOf
      const altered = c.notes.filter((n) => /[♭♯]/.test(n.degName));
      byId("cxReadings").textContent = altered.length
        ? `Spelling in ${glyph(cfg.key)} ${c.name}: every note is named by its degree and spelled on that degree's letter; an altered degree that would need a double accidental, C♭, F♭, E♯ or B♯ is shown as the plain note. The other readings: ` +
          altered.map((n) => `${n.degName} ${glyph(n.name)} = ${glyph(enharmonicOf(n))}`).join(" · ") + "."
        : `Spelling in ${glyph(cfg.key)} ${c.name}: every note is named by its degree and spelled on that degree's letter.`;
      const fam = WALK_FAMILIES.drop3.withheld && arityOf(c, cfg.k) === 4 ? " Drop 3 is withheld: it wants a skipped string set (6-4-3-2, 5-3-2-1), and this door's sets are adjacent strings." : "";
      byId("cxReadings").textContent += fam;
      byId("cxSum").textContent = `${glyph(cfg.key)} ${c.name} · ${nm.symbol} · ${pos + 1} of ${w.positions.length}`;
    };

    /* the sound of the current position: the chord's notes, held for its bar */
    const sound = () => {
      const p = w.positions[pos];
      for (const n of p.notes) announce(d, NOTE, { midi: n.midi, dur: meter * 60 / bpm });
    };
    const go = (to) => {
      if (to < 0 || to >= w.positions.length) return false;
      pos = to; render(); return true;
    };
    const setPlaying = (want) => {
      byId("cxPlay").textContent = want ? "Pause" : "Play";
      if (want) {
        armed = true; spent = 0; dir = pos >= w.positions.length - 1 ? -1 : 1;   // Play climbs, unless the hand is already at the top
        announce(d, MIXER, { on: true });
        sound();   // the cold play sounds NOW (the family's 260902 lesson: seat the beat before the clock)
        announce(d, CLOCK, { run: true, owner: "transport" });
      } else {
        armed = false;
        announce(d, CLOCK, { run: false, owner: "transport" });
      }
    };

    byId("cxPrev").addEventListener("click", () => { if (go(pos - 1)) { dir = -1; spent = 0; sound(); } });
    byId("cxNext").addEventListener("click", () => { if (go(pos + 1)) { dir = 1; spent = 0; sound(); } });
    byId("cxPlay").addEventListener("click", () => setPlaying(!armed));
    const change = (fn) => (e) => { fn(e.target.value); notApplied = ""; rebuild(); say(); };
    byId("cxKey").addEventListener("change", change((v) => { cfg.key = v; }));
    byId("cxColl").addEventListener("change", change((v) => { cfg.collection = v; }));
    byId("cxStack").addEventListener("change", change((v) => { cfg.k = Number(v); }));
    byId("cxFam").addEventListener("change", change((v) => { cfg.family = v; }));
    byId("cxSet").addEventListener("change", change((v) => { cfg.strings = [...setsFor(arityOf(coll(), cfg.k))[Number(v)].strings]; }));

    listen(d, BEAT, (ev) => {
      if (!armed || !ev || ev.sub) return;
      spent += 1;
      if (spent <= meter) return;
      spent = 1;
      // up the neck to the top, then back down — the walk is the collection's, both ways
      if (!go(pos + dir)) { dir = -dir; go(pos + dir); }
      sound();
    });
    listen(d, CLOCK_STATE, (m) => {
      if (!m) return;
      if (typeof m.meter === "number") meter = m.meter;
      if (typeof m.bpm === "number") bpm = m.bpm;
      if (m.running === false && armed) { armed = false; byId("cxPlay").textContent = "Play"; }
    });

    /* RESTORE AND THE SHARED OFFER ARRIVE AS CONFIG — this board is the owner of these keys; it adopts
     * what it can play and corrects (after the message, night 61) what it had to settle */
    listen(d, CONFIG_CHANGED, (m) => {
      if (!m || typeof m !== "object") return;
      const was = JSON.stringify(cfg);
      if (typeof m.key === "string" && m.key !== cfg.key) {
        const k = KEYS.includes(m.key) ? m.key : (/^[A-G](b|#)?$/.test(m.key) ? KEYS.find((x) => pcOfKey(x) === pcOfKey(m.key)) : null);
        if (k) cfg.key = k;
      }
      if (typeof m.collection === "string" && m.collection in COLLECTIONS) cfg.collection = m.collection;
      if (Number.isInteger(m.k)) cfg.k = m.k;
      if (typeof m.family === "string" && m.family in WALK_FAMILIES && !WALK_FAMILIES[m.family].withheld) cfg.family = m.family;
      const ms = Array.isArray(m.strings) ? [...m.strings].sort((x, y) => y - x) : null;   // low → high, the sets' own order
      if (ms && ms.join() !== cfg.strings.join()) {
        const want = ms.join();
        const at = [3, 4].find((a) => setsFor(a).some((s) => s.strings.join() === want));
        const now = arityOf(collection({ key: cfg.key, id: typeof m.collection === "string" && m.collection in COLLECTIONS ? m.collection : cfg.collection }),
          Number.isInteger(m.k) ? m.k : cfg.k);
        if (at) {
          preferred[at] = [...ms]; cfg.strings = [...ms];
          notApplied = at === now ? "" : `Strings ${ms.join("-")} are kept for the ${at === 3 ? "three" : "four"}-note collections.`;
        }
        else notApplied = `Strings ${ms.join("-")} were not applied: this door plays sets of three or four adjacent strings.`;
      }
      if (JSON.stringify(cfg) === was && !notApplied) return;
      const asked = JSON.stringify(cfg);
      rebuild();
      if (JSON.stringify(cfg) !== asked || JSON.stringify(cfg) !== was) announceAfter(d, CONFIG_CHANGED, { key: cfg.key, collection: cfg.collection, k: cfg.k, family: cfg.family, strings: [...cfg.strings] });
    });
    if (view && view.matchMedia) {
      const mq = view.matchMedia("(max-width: 600px)");
      if (mq.addEventListener) mq.addEventListener("change", () => w && render());
    }
    rebuild();
    say();
  },
};
