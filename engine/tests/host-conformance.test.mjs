/* host-conformance.test.mjs — family spec §4.3: consistency is asserted,
 * not remembered.
 *
 * One suite, one host list per shared module, the same assertions against
 * every entry — the generalisation of three mechanisms that each existed for
 * one case (§4.2's config locks, the metronome anti-drift pin, the
 * characterization tests). NOT a framework: adding a host is one entry in a
 * list, and an unwired host fails with a message NAMING what is missing —
 * the failures are the specification a third app wires against.
 *
 * Everything here asserts on the ARTIFACT: the ids present in the shipped
 * page, and the controls that actually render when the shared surface mounts
 * over exactly those elements — never on what the code registers (a host can
 * register five handlers and render four buttons). Same discipline as the
 * byte-identity and content-fingerprint rules (docs/render-dependencies.md).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createNotepadSurface, CAPABILITIES } from "../notepad-surface.mjs";
import { makeDoc, memStorage, capsOf } from "./_dom-stub.mjs";
import { carriersOf, CENSUS, STUDY_SLUGS } from "./_carriers.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const studyOf = (slug) =>
  readFileSync(join(here, "..", "..", "static", "studies", slug, "study.html"), "utf8");

// ================= notepad-surface.mjs: THE HOST LIST =================
// Adding a host is ONE entry here. mounts maps the surface's els keys to the
// page's element ids; a capability with no mount arrives via `controls`
// (auto-append), which is itself asserted present.

const NOTEPAD_HOSTS = [
  /* RE-HOUSED (night 35, 260929): both hand-authored studies now carry
   * notepad-card.mjs's own markup — the metronome study with the pad part
   * seated beside the metronome as the multetudes door seats it, triadetudes
   * unseated — so their ids ARE the card's, every capability an explicit
   * mount (copy included: the loss the surface's header cites), plus the
   * title field and the per-capability message slots. The auto-append path
   * is exercised by no shipped host any more; it stays the family's net for
   * a host that has not decided, covered by notepad-surface.test.mjs. */
  { name: "metronome",
    nouns: { item: "note", apply: "Apply settings" },
    mounts: { pad: "journalIn", title: "npTitle", saveBtn: "saveEntry", clearBtn: "clearPad",
      confirmRoot: "clearConfirm", confirmSave: "clearSave",
      confirmDiscard: "clearDiscard", confirmCancel: "clearCancel",
      exportBtn: "exportLog", copyBtn: "copyBtn", paletteBtn: "paletteBtn",
      paletteRoot: "paletteRoot", importBtn: "importBtn", importFile: "importFile",
      msg: "saveMsg", importMsg: "importMsg", exportMsg: "exportMsg", copyMsg: "copyMsg",
      list: "histList", count: "histCount", storeNote: "storeNote",
      controls: "journalControls", handoff: "handoffNote" } },
  { name: "triadetudes",
    nouns: { item: "entry", apply: "Restore étude" },
    mounts: { pad: "journalIn", title: "npTitle", saveBtn: "saveEntry", clearBtn: "clearPad",
      confirmRoot: "clearConfirm", confirmSave: "clearSave",
      confirmDiscard: "clearDiscard", confirmCancel: "clearCancel",
      exportBtn: "exportLog", copyBtn: "copyBtn", paletteBtn: "paletteBtn",
      paletteRoot: "paletteRoot", importBtn: "importBtn", importFile: "importFile",
      msg: "saveMsg", importMsg: "importMsg", exportMsg: "exportMsg", copyMsg: "copyMsg",
      list: "histList", count: "histCount", storeNote: "storeNote",
      controls: "journalControls", handoff: "handoffNote" } },
  { name: "tetradetudes",   // the door's notepad-card ports triadetudes' ids wholesale
    nouns: { item: "entry", apply: "Restore étude" },
    mounts: { pad: "journalIn", saveBtn: "saveEntry", clearBtn: "clearPad",
      confirmRoot: "clearConfirm", confirmSave: "clearSave",
      confirmDiscard: "clearDiscard", confirmCancel: "clearCancel",
      exportBtn: "exportLog", importBtn: "importBtn", importFile: "importFile",
      msg: "saveMsg", importMsg: "importMsg", list: "histList",
      count: "histCount", storeNote: "storeNote", controls: "journalControls",
      handoff: "handoffNote" } },
  { name: "multetudes",
    /* item 1 (260911): this host TOOK the placement — copyBtn and paletteRoot
     * are DECLARED mounts here, not auto-appends. The auto-append path was
     * exercised by triadetudes until night 35 re-housed it onto the card; it
     * remains the family's net for a host that has not decided, and no host
     * deciding is not a reason to remove it (notepad-surface.test.mjs keeps it).
     * nouns: "note" is v0.9's word, adopted by the same item (D12) — the
     * entry describes the host as SHIPPED. */
    nouns: { item: "note", apply: "Restore étude" },
    mounts: { pad: "journalIn", saveBtn: "saveEntry", clearBtn: "clearPad",
      confirmRoot: "clearConfirm", confirmSave: "clearSave",
      confirmDiscard: "clearDiscard", confirmCancel: "clearCancel",
      exportBtn: "exportLog", copyBtn: "copyBtn", importBtn: "importBtn",
      importFile: "importFile", msg: "saveMsg", importMsg: "importMsg",
      list: "histList", count: "histCount", storeNote: "storeNote",
      controls: "journalControls", handoff: "handoffNote" } },
];

/* The MEMBERSHIP of these host lists is the census's fact: every study the
 * census says carries the module must have an entry here, and no entry may
 * name a study that does not carry it. The per-host CONFIG (mounts, nouns,
 * control ids) stays here — that is genuinely per-host — but a new carrier
 * shipping without a host entry now FAILS NAMING WHAT IS MISSING instead of
 * passing quietly, which is how the fifth study slipped every list (260819.5). */
test("§4.3 hosts: the notepad host list IS the census's carrier list for notepad-surface", () => {
  assert.deepEqual(NOTEPAD_HOSTS.map((h) => h.name).sort(), carriersOf("notepad-surface"),
    "a study carrying notepad-surface.mjs has no host entry (or an entry names a non-carrier) — wire it here");
});

function mountHost(host) {
  // build stub els from exactly the mounts the page provides, then let the
  // surface render over them — what comes out is what a user gets
  const d = makeDoc();
  const els = {};
  for (const key of Object.keys(host.mounts))
    els[key] = d.createElement(key === "pad" ? "textarea" :
      key === "importFile" || key === "title" ? "input" : key.endsWith("Btn") ? "button" : "div");
  const surface = createNotepadSurface({
    adapter: { app: host.name, version: 1, nouns: host.nouns,
      snapshot: () => ({ probe: 1 }), apply: () => {},
      summarize: () => "label" },
    storage: memStorage(false), els,
    file: { title: host.name, name: () => host.name + ".atchart.md" } });
  return { els, surface };
}

test("§4.3 notepad: every declared mount exists in every host's shipped page, and is wired", () => {
  for (const host of NOTEPAD_HOSTS) {
    const page = studyOf(host.name);
    const preHub = CENSUS.get(host.name).source === "detected";
    for (const [key, id] of Object.entries(host.mounts)) {
      assert.ok(page.includes('id="' + id + '"'),
        `[${host.name}] mount "${key}" expects #${id} in the page — ` +
        `add the element, or update this host list if it moved`);
      /* the wiring and nouns greps below read the HAND-AUTHORED idiom
       * (getElementById, minified adapter literals) and are those pages'
       * only check. A door-built host wires through ctx.byId and is asserted
       * LIVE by door_locks.py — every declared control rendered and driven in
       * a real browser — which is the stronger claim, so the textual proxy is
       * not applied to it. */
      if (preHub) assert.ok(page.includes('getElementById("' + id + '")'),
        `[${host.name}] #${id} exists but nothing passes it to the surface — ` +
        `wire els.${key} in the host's init`);
    }
    if (preHub) assert.ok(page.includes('nouns:{item:"' + host.nouns.item + '"'),
      `[${host.name}] the adapter must declare nouns {item:"${host.nouns.item}"} — ` +
      `vocabulary is adapter-supplied, never hand-written in the page`);
  }
});

test("§4.3 notepad: the RENDERED capability set is identical across all hosts", () => {
  const rendered = NOTEPAD_HOSTS.map((host) => {
    const { els } = mountHost(host);
    return { name: host.name,
      caps: capsOf(Object.values(els)).filter((c) => CAPABILITIES.includes(c)) };
  });
  for (const r of rendered)
    assert.deepEqual(r.caps, [...CAPABILITIES].sort(),
      `[${r.name}] renders ${r.caps.join(",")} — the declared set is ` +
      CAPABILITIES.join(",") + `; a missing one means a mount or els.controls is gone`);
  for (let i = 1; i < rendered.length; i++)
    assert.deepEqual(rendered[i].caps, rendered[0].caps,
      `[${rendered[i].name}] and [${rendered[0].name}] render different capability sets`);
});

test("§4.3 notepad: charter guarantee statements render in every host", () => {
  for (const host of NOTEPAD_HOSTS) {
    const { els } = mountHost(host);
    /* PIN REWRITTEN 260915 (5d, the plain-English pass — rule 7, never
     * relaxed): the guarantee is IDENTICAL, the words are a player's.
     * Daniel, on the old sentence: "none of that means anything to me". */
    assert.equal(els.handoff.textContent,
      "Your notes stay on this computer — nothing is uploaded. "
        + "Moving notes anywhere happens only through the file Export writes.",
      `[${host.name}] must render the §5/§6 privacy guarantee — it is a ` +
      `charter statement, not helper prose`);
  }
});

test("§4.3 notepad: the behavioural contract holds per host — save clears the pad", () => {
  for (const host of NOTEPAD_HOSTS) {
    const { els, surface } = mountHost(host);
    els.pad.value = "an idea"; els.pad.dispatch("input");
    els.saveBtn.click();
    assert.equal(els.pad.value, "",
      `[${host.name}] save must CLEAR the pad — the canonical semantics are ` +
      `not optional per host`);
    assert.equal(surface.getDoc().entries.at(-1).text, "an idea",
      `[${host.name}] the note must be FILED, not lost`);
    assert.equal(els.saveBtn.textContent, "Save " + host.nouns.item,
      `[${host.name}] the save label composes from the adapter's nouns`);
  }
});

test("§4.3 notepad: an unwired host fails NAMING what is missing (the spec for host #3)", () => {
  // a third app adds itself to the list, runs the suite, and reads the
  // failures as its wiring checklist — simulate one with nothing wired
  const d = makeDoc();
  const bare = { pad: d.createElement("textarea"),
    saveBtn: d.createElement("button"), clearBtn: d.createElement("button"),
    confirmRoot: d.createElement("div"), confirmSave: d.createElement("button"),
    confirmDiscard: d.createElement("button"), confirmCancel: d.createElement("button") };
  assert.throws(() => createNotepadSurface({
    adapter: { app: "third-app", version: 1, snapshot: () => ({}),
      apply: () => {}, summarize: () => "" },
    storage: memStorage(false), els: bare,
    file: { title: "t", name: () => "t.md" } }),
    /declared capability "export" — provide els\.exportBtn or els\.controls/,
    "the failure names the capability and both ways to satisfy it");
});

// ================= RULE 14 (ratified 260928; asserted 261001, night 37): no error string quotes a CAPTION =================
// "A user-facing string never quotes a control's CAPTION. Name the mode, the
// value, or the thing itself. The caption is the part that changes, and a
// sentence quoting it goes stale the day it is renamed."
// THE SPLIT THAT MAKES IT PRECISE: CAPTION words (Centricity · Movement · The
// figure is · Bass / reference tone · Placement · Subdivision …) name a
// CONTROL and are banned in an error string; OPTION words (strum, arpeggiate,
// tones, pattern, Grip, Line …) name a VALUE the user chose or typed and are
// LEGAL — selection.mjs's own refusal "the address is set to pattern; switch
// it to tones" is the sentence held up as correct. A blanket ban would break
// it. The captions come from the lexicon, never a list here; the population
// is every string or template literal that is an argument of `new Error(`
// or the value of an `err:` / `reason:` property, in engine/ and
// hub/modules/ — the strings a player reads when something is refused.
const CAPTIONS = Object.values(LEXICON).map((e) => e.caption).filter(Boolean);
const OPTION_WORDS = Object.values(LEXICON).flatMap((e) => Object.values(e.options || {}));
function errorStringsOf(src) {
  const out = [];
  const grab = (start) => {   // the balanced expression from `start` to the closing paren / the next `,` or `}` at depth 0
    let depth = 0, i = start, inStr = null;
    for (; i < src.length; i++) {
      const c = src[i], p = src[i - 1];
      if (inStr) { if (c === inStr && p !== "\\") inStr = null; continue; }
      if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
      if (c === "(" || c === "{" || c === "[") depth++;
      else if (c === ")" || c === "}" || c === "]") { if (depth === 0) break; depth--; }
      else if ((c === "," || c === ";") && depth === 0) break;
    }
    return src.slice(start, i);
  };
  for (const m of src.matchAll(/new Error\(|\b(?:err|reason)\s*:\s*/g)) {
    const expr = grab(m.index + m[0].length);
    for (const lit of expr.matchAll(/`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g))
      out.push({ line: src.slice(0, m.index).split("\n").length, text: lit[0].slice(1, -1) });
  }
  return out;
}
const RULE14_FILES = [
  ...readdirSync(join(here, "..")).filter((f) => f.endsWith(".mjs")).map((f) => "engine/" + f),
  ...readdirSync(join(here, "..", "..", "hub", "modules")).filter((f) => f.endsWith(".mjs")).map((f) => "hub/modules/" + f),
];
test("rule 14: no error string in engine/ or hub/modules/ quotes a caption the lexicon owns — option words stay legal", () => {
  assert.ok(CAPTIONS.length >= 10 && OPTION_WORDS.length >= 10, "the lexicon supplies the words");
  const hits = [];
  let strings = 0;
  for (const rel of RULE14_FILES) {
    const src = readFileSync(join(here, "..", "..", rel), "utf8");
    for (const s of errorStringsOf(src)) {
      strings++;
      for (const cap of CAPTIONS) {
        const re = new RegExp("(^|[^\\w])" + cap.replace(/[.*+?^$()|[\]\\/{}]/g, "\\$&") + "($|[^\\w])");
        if (re.test(s.text)) hits.push(`${rel}:${s.line} quotes the caption "${cap}": ${JSON.stringify(s.text.slice(0, 90))}`);
      }
    }
  }
  assert.ok(strings >= 200, `the sweep must actually read the refusals (found ${strings})`);
  assert.deepEqual(hits, [], "rule 14 — name the mode, the value or the thing; a quoted caption goes stale the day it is renamed");
  // the sentence held up as correct still passes: option words are legal
  const sel = readFileSync(join(here, "..", "selection.mjs"), "utf8");
  const held = errorStringsOf(sel).find((s) => /the address is set to pattern; switch it to tones/.test(s.text));
  assert.ok(held, "selection.mjs's address refusal is in the population");
  assert.ok(OPTION_WORDS.includes("tones") || CAPTIONS.every((c) => !held.text.includes(c)), "…and it quotes option words only");
});

// ================= the CARD CARRIERS (night 35, 260929): a hub card's bytes in a hand-authored page =================
// The two hand-authored studies were RE-HOUSED onto notepad-card.mjs and
// metronome-card.mjs — Daniel, 260923: "the same split notepad/log in all
// including the metronome". A page cannot import a hub module, so it carries
// the card's markup and styles the way it carries an engine module: VERBATIM,
// and pinned. The markup must appear in one of the BUILD'S OWN assemblies —
// markupWithout(markup, seats) plus each seated part, computed by the same
// function the door build runs (hub/tools/parts.mjs) for every subset of the
// card's parts — so a hand page ships exactly the bytes a door would. Nothing
// is listed by hand: the carriers are DETECTED (the census's own rule —
// presence needs the module's name in the page or any 60+ char markup line,
// so a partially drifted carrier still reads as carried and the pin fires on
// the drift rather than the card quietly leaving). Door-built pages are the
// resolver's and the build's business, not this pin's.
import { notepadCard } from "../../hub/modules/notepad-card.mjs";
import { metronomeCard } from "../../hub/modules/metronome-card.mjs";
import { partsOf, markupWithout } from "../../hub/tools/parts.mjs";

/* metronome-card's pinned region is its FOUR ROW GROUPS — the grammar the
 * family constant above counts; the h2, the collapse summary and the info
 * prose are the host's (an appliance with no étude cannot say "the étude
 * subscribes to this grid"). Sliced from the module, never retyped. */
const rowsOf = (markup) => {
  const a = markup.indexOf('  <div class="transport">'), b = markup.indexOf('  <div class="clpsum"');
  assert.ok(a >= 0 && b > a, "metronome-card's markup no longer opens with the transport row and closes with the summary — re-site the slice");
  return markup.slice(a, b);
};
const CARDS = [
  { card: notepadCard, file: "hub/modules/notepad-card.mjs", markup: notepadCard.markup, styles: notepadCard.styles },
  { card: metronomeCard, file: "hub/modules/metronome-card.mjs", markup: rowsOf(metronomeCard.markup), styles: metronomeCard.styles },
];
const subsets = (names) => names.reduce((acc, n) => acc.concat(acc.map((s) => [...s, n])), [[]]);
const assembliesOf = (markup) => {
  const parts = partsOf(markup);
  return subsets([...parts.keys()]).map((seated) => ({
    seated, pieces: [markupWithout(markup, new Set(seated)), ...seated.map((n) => parts.get(n))] }));
};
const carriesCard = (page, c) =>
  page.includes(c.file) || c.markup.split("\n").some((l) => l.trim().length >= 60 && page.includes(l));

test("§4.3 card carriers: a hand-authored page that carries a hub card carries its bytes VERBATIM, in one of the build's own assemblies", () => {
  let pinned = 0;
  for (const slug of STUDY_SLUGS) {
    if (CENSUS.get(slug).source !== "detected") continue;   // door-built: the build's proof
    const page = studyOf(slug);
    for (const c of CARDS) {
      if (!carriesCard(page, c)) continue;
      assert.ok(page.includes(c.styles),
        `[${slug}] carries ${c.file} but its styles have drifted from the module's — re-copy the styles block verbatim`);
      const ok = assembliesOf(c.markup).find((a) => a.pieces.every((piece) => page.includes(piece)));
      assert.ok(ok, `[${slug}] carries ${c.file} but its markup matches none of the build's assemblies ` +
        `(seats tried: ${assembliesOf(c.markup).map((a) => "{" + a.seated.join(",") + "}").join(" ")}) — ` +
        "re-copy the markup verbatim from the module; the host's own pieces are seated at init, never typed into the card");
      pinned++;
    }
  }
  assert.equal(pinned, 4, "two hand-authored studies × two cards: the pin must actually have run four times");
});

// ================= metronome.mjs: widened to the same shape =================
// The anti-drift pin (metronome.test.mjs) already asserts CODE identity per
// carrier; this asserts the RENDERED control inventory and the shared-
// component guarantee line, from the same one-line-per-host list.

const METRONOME_HOSTS = [
  /* 260820.4 closed the recorded divergence: the appliance's Sound button
   * became the mute icon too — all three hosts ship one inventory again. */
  { name: "metronome", controls: ["metroBtn", "tapBtn", "bpmRange", "bpmVal",
      "meterSel", "subSel", "voiceSel", "clickMute", "accChk", "clickVolR",
      "clickVolVal", "beatLamp"] },
  { name: "triadetudes", controls: ["metroBtn", "tapBtn", "bpmRange", "bpmVal",
      "meterSel", "subSel", "voiceSel", "clickMute", "accChk", "clickVolR",
      "clickVolVal", "beatLamp"] },
  { name: "tetradetudes", controls: ["metroBtn", "tapBtn", "bpmRange", "bpmVal",
      "meterSel", "subSel", "voiceSel", "clickMute", "accChk", "clickVolR",
      "clickVolVal", "beatLamp"] },
  { name: "multetudes", controls: ["metroBtn", "tapBtn", "bpmRange", "bpmVal",
      "meterSel", "subSel", "voiceSel", "clickMute", "accChk", "clickVolR",
      "clickVolVal", "beatLamp"] },
];
const METRONOME_GUARANTEE = "every At-Etudes app carries this metronome, first block, this look";

test("§4.3 hosts: the metronome host list IS the census's carrier list for metronome", () => {
  assert.deepEqual(METRONOME_HOSTS.map((h) => h.name).sort(), carriersOf("metronome"),
    "a study carrying metronome.mjs has no host entry (or an entry names a non-carrier) — wire it here");
});

test("§4.3 metronome: the control inventory and the family guarantee render in every carrier", () => {
  for (const host of METRONOME_HOSTS) {
    const page = studyOf(host.name);
    for (const id of host.controls)
      assert.ok(page.includes('id="' + id + '"'),
        `[${host.name}] the metronome card must render #${id} — the appliance ` +
        `is a family constant (clock row, first block)`);
    // whitespace-normalized: HTML prose wraps at the author's line length
    assert.ok(page.replace(/\s+/g, " ").includes(METRONOME_GUARANTEE),
      `[${host.name}] must carry the shared-component sentence: "${METRONOME_GUARANTEE}"`);
  }
});

// ================= the card grammar (260820.4): four rows, none spent on a checkbox =================
// Daniel's sketch made row count part of the family look: the metronome card is
// exactly four row groups (transport · BPM · selects+accents · icon+Vol) and the
// transport card exactly five (play · BPM · sig+voice · chord · bass) — the
// checkbox-only rows (`metrosound`, `trChecks`, and the hand-authored studies'
// inline-styled equivalents) are gone, their controls riding the right end of
// rows that already exist. This asserts the SHAPE statically: row-group counts
// per card region and the absence of the retired row classes. The stronger
// predicate — "no row group's live content is only checkboxes" — needs a DOM,
// and lives in hub/tests/door_locks.py where one runs.

const ROW_COUNTS = { Metronome: 4, Transport: 5 };
const GRAMMAR_HOSTS = ["metronome", "triadetudes", "tetradetudes", "multetudes"];

test("§4.3 grammar: metronome cards are four row groups, transport cards five, in every host", () => {
  for (const name of GRAMMAR_HOSTS) {
    const page = studyOf(name);
    assert.ok(!/metrosound|trChecks/.test(page),
      `[${name}] carries a retired checkbox-row class — the card grammar item deleted these`);
    // a door page holds each card twice (module template + door body); the
    // count must hold for EVERY occurrence of a card's <h2> region
    for (const m of page.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)) {
      const title = m[1].trim().replace("&amp;", "&");
      if (!(title in ROW_COUNTS)) continue;
      const next = page.indexOf("<h2", m.index + m[0].length);
      const seg = page.slice(m.index, next < 0 ? page.length : next);
      const rows = seg.match(/class="(transport|row2[^"]*|bpmrow)"/g) || [];
      assert.equal(rows.length, ROW_COUNTS[title],
        `[${name}] the ${title} card must be exactly ${ROW_COUNTS[title]} row groups, ` +
        `found ${rows.length} — the card grammar is a family constant`);
    }
  }
});

// ================= hub/lexicon.mjs: THE FOURTH HOST LIST — the words =================
// 260926 (night 32). Multetudes is the reference for every word (Daniel, 260923).
// Adding a host is ONE entry: it maps the lexicon's ROLES to its own ids (a segment
// is [id, the data-attribute its buttons carry]); a role it does not offer is
// omitted. Asserted on the ARTIFACT — the shipped page's <option>s and segment
// <button>s; for the reference door, whose harmony card fills its selects at
// mount, the words are read from the module source THE PAGE SHIPS. Never from
// what a module registers.
import { LEXICON } from "../../hub/lexicon.mjs";

const LEXICON_HOSTS = [
  { name: "metronome",
    selects: { meter: "meterSel", subdivision: "subSel", voice: "voiceSel" },
    captions: ["bpm", "volume", "subdivision", "voice"] },
  { name: "triadetudes",
    selects: { meter: "meterSel", subdivision: "subSel", voice: "voiceSel", scale: "scaleSel" },
    segments: { placement: ["placeSeg", "place"], movement: ["playbackSeg", "pb"] },
    captions: ["bpm", "volume", "subdivision", "voice", "scale", "placement", "centricity", "movement", "figureIs", "bass"] },
  { name: "tetradetudes",
    selects: { meter: "meterSel", subdivision: "subSel", voice: "voiceSel", scale: "scaleSel" },
    shippedSource: { placement: "PLACE_LABEL" },   // shape-motion builds #placeSeg at mount from this literal, which the page ships
    segments: { movement: ["playbackSeg", "pb"] },
    captions: ["bpm", "volume", "subdivision", "voice", "scale", "placement", "centricity", "movement", "figureIs", "bass"] },
  { name: "multetudes",
    selects: { meter: "meterSel", subdivision: "subSel", voice: "voiceSel" },
    shippedSource: { scale: "SCALES" },   // harmony-card fills #hcScale at mount from this literal, which the page ships
    segments: { placement: ["fdNSeg", "nps"], movement: ["fdMoveSeg", "move"] },
    captions: ["bpm", "volume", "subdivision", "voice", "scale", "placement", "centricity", "movement", "figureIs", "bass"] },
];
// a host's STORED value for a lexicon value where they differ: multetudes' placement stores the
// per-string ceiling (grip 1, line 3); the tetrad family stores "arpeggiated" for the word "arpeggiate"
const HOST_VALUE = { fdNSeg: { grip: "1", line: "3" }, playbackSeg: { arpeggiate: "arpeggiated" } };

const optionsOf = (page, id) => {
  const m = page.match(new RegExp(`<select id="${id}"[^>]*>([\\s\\S]*?)</select>`));
  if (!m) return null;
  return Object.fromEntries([...m[1].matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/g)].map((o) => [o[1], o[2].trim()]));
};
const segmentOf = (page, id, attr) => {
  const m = page.match(new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)</div>`));
  if (!m) return null;
  return Object.fromEntries([...m[1].matchAll(new RegExp(`<button[^>]*data-${attr}="([^"]*)"[^>]*>([^<]*)</button>`, "g"))].map((o) => [o[1], o[2].trim()]));
};
// EXACT since 260928 (night 34): the canon's CASE is the canon's too — multetudes' segments read lowercase
const sameWord = (a, b) => String(a).trim() === String(b).trim();

test("§4.3 lexicon: every shared control says the family's word on every host that offers it — the reference is multetudes", () => {
  let checked = 0;
  for (const host of LEXICON_HOSTS) {
    const page = studyOf(host.name);
    for (const [role, id] of Object.entries(host.selects || {})) {
      const found = optionsOf(page, id);
      assert.ok(found, `[${host.name}] ${role}: no <select id="${id}"> in the shipped page — the host list names a control the page does not carry`);
      for (const [value, word] of Object.entries(LEXICON[role].options)) {
        assert.ok(value in found, `[${host.name}] ${role} (#${id}): the family offers value "${value}" ("${word}") and this page does not`);
        assert.ok(sameWord(found[value], word), `[${host.name}] ${role} (#${id}): for value "${value}" the family's word is "${word}", found "${found[value]}" — Multetudes is the reference (260923)`);
        checked++;
      }
    }
    for (const [role, literal] of Object.entries(host.shippedSource || {})) {
      for (const [value, word] of Object.entries(LEXICON[role].options)) {
        // the literal's shape is the module's: [["value", "word"], …] pairs, or { value: "word", … }
        const re = new RegExp(`(?:\\["${value}",\\s*"([^"]*)"\\]|\\b${value}:\\s*"([^"]*)")`);
        const m = page.match(new RegExp(`const ${literal} = [^;]*?` + re.source));
        if (m) m[1] = m[1] ?? m[2];
        assert.ok(m, `[${host.name}] ${role}: the shipped page's ${literal} literal offers no value "${value}"`);
        assert.ok(sameWord(m[1], word), `[${host.name}] ${role} (${literal}): for value "${value}" the family's word is "${word}", found "${m[1]}" — Multetudes is the reference (260923)`);
        checked++;
      }
    }
    for (const [role, [id, attr]] of Object.entries(host.segments || {})) {
      const found = segmentOf(page, id, attr);
      assert.ok(found, `[${host.name}] ${role}: no segment #${id} with data-${attr} buttons in the shipped page`);
      for (const [value, word] of Object.entries(LEXICON[role].options)) {
        const v = (HOST_VALUE[id] || {})[value] ?? value;
        assert.ok(v in found, `[${host.name}] ${role} (#${id}): the family offers value "${v}" ("${word}") and this segment does not — found ${JSON.stringify(found)}`);
        assert.ok(sameWord(found[v], word), `[${host.name}] ${role} (#${id}): for value "${v}" the family's word is "${word}", found "${found[v]}" — Multetudes is the reference (260923)`);
        checked++;
      }
    }
    for (const role of host.captions || []) {
      const cap = LEXICON[role].caption;
      const esc = cap.replace(/[.*+?^$()|[\]\\/{}]/g, "\\$&");   // escaped outside the template (a `${` inside one is an interpolation)
      assert.ok(new RegExp(`>\\s*${esc}\\s*<`).test(page), `[${host.name}] ${role}: the caption "${cap}" is not on the shipped page — Multetudes is the reference (260923)`);
      checked++;
    }
  }
  assert.ok(checked >= 60, `the lexicon sweep must actually run: ${checked} words checked`);
});

// ================= restated literals: guarded, never imported =================
// 260926 (night 32 item 3). notepad-card.mjs:201 restates the three string-set labels
// engine/tetrad-sequence.mjs derives, and says why (the card is shared with non-tetrad
// doors — scribe — and may not import the tetrad engine). The duplication is defensible;
// the SILENCE was not: nothing asserted the literal still matched, which is how the
// lowercase "e" survived in the notepad while the panel said something else (N4,
// 260820). A test may import both; the shipping module may not. That is the whole
// trick, and it costs nothing at runtime.
import { STRING_SETS, CYCLES } from "../tetrad-sequence.mjs";

test("§4.3 restated literal: notepad-card's SETS equals the labels STRING_SETS derives — update the literal, do NOT import", () => {
  const src = readFileSync(join(here, "..", "..", "hub", "modules", "notepad-card.mjs"), "utf8");
  const m = src.match(/const SETS = \[([^\]]*)\];/);
  assert.ok(m, "notepad-card.mjs no longer carries the SETS literal — if it now imports STRING_SETS, scribe carries the tetrad engine; put the literal back");
  const literal = [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
  const derived = STRING_SETS.map((s) => s.label);
  assert.deepEqual(literal, derived,
    `hub/modules/notepad-card.mjs's SETS literal reads ${JSON.stringify(literal)} but engine/tetrad-sequence.mjs derives ${JSON.stringify(derived)} — ` +
    `UPDATE THE LITERAL in notepad-card.mjs to match; do NOT import STRING_SETS there (the card is shared with non-tetrad doors: scribe)`);
  assert.ok(!/from "\.\.\/\.\.\/engine\/tetrad-sequence\.mjs"/.test(src), "notepad-card.mjs must not import the tetrad engine (scribe)");
});

// the rider (260928, night 34): notepad-card's CYCLE map restates CYCLES[k].name for exactly the
// SETS reason — the same guard, the same instruction
test("§4.3 restated literal: notepad-card's CYCLE equals the engine's cycle names — update the literal, do NOT import", () => {
  const src = readFileSync(join(here, "..", "..", "hub", "modules", "notepad-card.mjs"), "utf8");
  const m = src.match(/const CYCLE = \{([^}]*)\};/);
  assert.ok(m, "notepad-card.mjs no longer carries the CYCLE literal — if it now imports CYCLES, scribe carries the tetrad engine; put the literal back");
  const literal = Object.fromEntries([...m[1].matchAll(/(\w+):\s*"([^"]*)"/g)].map((x) => [x[1], x[2]]));
  const derived = Object.fromEntries(Object.entries(CYCLES).map(([k, c]) => [k, c.name]));
  assert.deepEqual(literal, derived,
    `hub/modules/notepad-card.mjs's CYCLE literal reads ${JSON.stringify(literal)} but engine/tetrad-sequence.mjs derives ${JSON.stringify(derived)} — ` +
    `UPDATE THE LITERAL in notepad-card.mjs to match; do NOT import CYCLES there (the card is shared with non-tetrad doors: scribe)`);
  assert.ok(!/from "\.\.\/\.\.\/engine\/tetrad-sequence\.mjs"/.test(src), "notepad-card.mjs must not import the tetrad engine (scribe)");
});

// shape-motion.mjs restates the dialect in a DOCSTRING (line 12). Asserted too, and
// here is why: a comment that names the family's three labels is the reader's
// specification of the panel, and the README inventory precedent (below) already
// treats a document as an artifact worth pinning; the cost is one regex.
test("§4.3 restated literal: shape-motion.mjs's docstring names the dialect STRING_SETS derives", () => {
  const src = readFileSync(join(here, "..", "..", "hub", "modules", "shape-motion.mjs"), "utf8");
  for (const s of STRING_SETS)
    assert.ok(src.includes(s.label), `hub/modules/shape-motion.mjs's docstring no longer names "${s.label}" — update the comment to the derived dialect (${STRING_SETS.map((x) => x.label).join(", ")})`);
});

// triadetudes carries figure.mjs's playbackWord alias as ONE inlined line (it does not
// carry figure.mjs) — guarded the same way: the page's line is the engine's, verbatim
test("§4.3 restated literal: triadetudes' inlined playbackWord is engine/figure.mjs's line", () => {
  const eng = readFileSync(join(here, "..", "figure.mjs"), "utf8").match(/export const playbackWord = (.*);/);
  assert.ok(eng, "figure.mjs no longer exports playbackWord");
  const page = studyOf("triadetudes");
  assert.ok(page.includes(`const playbackWord = ${eng[1]};`),
    `triadetudes/study.html's playbackWord differs from engine/figure.mjs's — update the page's one line to: const playbackWord = ${eng[1]};`);
});

// ================= the engine inventory: derived, not remembered =================
// engine/README.md hand-typed its module list and was already missing three
// modules — the exact defect §4.3 exists to prevent, in the document that
// describes the engine. The list is now CI-asserted against engine/*.mjs.

test("§4.3 inventory: every engine module appears in engine/README.md", () => {
  const readme = readFileSync(join(here, "..", "README.md"), "utf8");
  const modules = readdirSync(join(here, "..")).filter((f) => f.endsWith(".mjs"));
  for (const m of modules)
    assert.ok(readme.includes(m),
      `engine/README.md is missing "${m}" — the inventory is asserted against ` +
      `engine/*.mjs (§4.3: derive or assert, never retype)`);
});
