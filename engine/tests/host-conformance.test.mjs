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
import { carriersOf, CENSUS } from "./_carriers.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const studyOf = (slug) =>
  readFileSync(join(here, "..", "..", "static", "studies", slug, "study.html"), "utf8");

// ================= notepad-surface.mjs: THE HOST LIST =================
// Adding a host is ONE entry here. mounts maps the surface's els keys to the
// page's element ids; a capability with no mount arrives via `controls`
// (auto-append), which is itself asserted present.

const NOTEPAD_HOSTS = [
  { name: "metronome",
    nouns: { item: "note", apply: "Apply settings" },
    mounts: { pad: "pad", saveBtn: "saveNote", clearBtn: "clearPad",
      confirmRoot: "clearConfirm", confirmSave: "clearSave",
      confirmDiscard: "clearDiscard", confirmCancel: "clearCancel",
      exportBtn: "exportBtn", copyBtn: "copyBtn", importBtn: "importBtn",
      importFile: "importFile", msg: "saveMsg", list: "noteList",
      count: "noteCount", storeNote: "storeNote", controls: "padControls",
      handoff: "handoffNote" } },
  { name: "triadetudes",   // no copyBtn: Copy arrives by auto-append — by design
    nouns: { item: "entry", apply: "Restore étude" },
    mounts: { pad: "journalIn", saveBtn: "saveEntry", clearBtn: "clearPad",
      confirmRoot: "clearConfirm", confirmSave: "clearSave",
      confirmDiscard: "clearDiscard", confirmCancel: "clearCancel",
      exportBtn: "exportLog", importBtn: "importBtn", importFile: "importFile",
      msg: "saveMsg", importMsg: "importMsg", list: "histList",
      count: "histCount", storeNote: "storeNote", controls: "journalControls",
      handoff: "handoffNote" } },
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
     * are DECLARED mounts here, not auto-appends. The auto-append path stays
     * exercised by triadetudes above; it is the family's net for a host that
     * has not decided, and one host deciding is not a reason to remove it.
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
      key === "importFile" ? "input" : key.endsWith("Btn") ? "button" : "div");
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
    assert.equal(els.handoff.textContent,
      "The file is the handoff channel: nothing leaves this machine.",
      `[${host.name}] must render the §5/§6 handoff guarantee — it is a ` +
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
