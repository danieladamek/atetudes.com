/* etude-link.test.mjs — THE ÉTUDE LINK (261120): a block in a URL fragment, and the §6 line drawn once.
 *
 * Round trip on every corpus étude a link may carry; refusal by name, in both directions, of every one it may not; and
 * the permanence pin — one v2 block as a literal fragment string, with the snapshot it reads to stated literally
 * beside it, so neither the fixture nor the writer can move what an embedded link means.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { toFragment, fromFragment, linkable, LINK_KEY } from "../etude-link.mjs";
import { etudeBlockBody, BLOCK_OMITS, ETUDE_V } from "../etude-block.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORPUS = JSON.parse(readFileSync(join(REPO, "hub", "tests", "fixtures", "etude-corpus.json"), "utf8"));
const ENV = { app: "multetudes", v: ETUDE_V };
const without = (s) => { const o = { ...s }; for (const k of Object.keys(BLOCK_OMITS)) delete o[k]; return o; };
const typed = ({ saved }) => saved.source === "custom";

test("round trip: snapshot → fragment → snapshot is identity on every cycle- and form-sourced corpus étude", () => {
  const linked = CORPUS.filter((e) => !typed(e));
  for (const { name, saved } of linked) {
    const frag = toFragment(saved, ENV);
    assert.ok(frag.startsWith(`#${LINK_KEY}=`), `${name}: the fragment's key`);
    assert.ok(!/[\s#]/.test(frag.slice(1)), `${name}: no space, newline or second # survives the encoding`);
    const r = fromFragment(frag);
    assert.ok(!("reason" in r), `${name}: refused — ${r.reason}`);
    assert.deepEqual(r.flagged, [], `${name}: nothing flagged`);
    assert.equal(r.app, ENV.app); assert.equal(r.v, ENV.v);
    assert.deepEqual(r.snapshot, without(saved), `${name}: the read-back is the snapshot, less what a block omits`);
    assert.equal(fromFragment(frag.slice(1)).app, ENV.app, `${name}: the hash's # is optional`);
  }
  const sources = new Set(linked.map((e) => e.saved.source));
  assert.ok(linked.length >= 10 && sources.has("cycle") && sources.has("form"),
    `not vacuous: ${linked.length} études, sources ${[...sources].join(", ")}`);
  console.log(`  ${linked.length} études round-tripped through a link (${[...sources].join(", ")}); ` +
    `${CORPUS.length - linked.length} custom-sourced refused`);
});

test("a custom-sourced étude is refused in both directions, by name", () => {
  const custom = CORPUS.filter(typed);
  assert.ok(custom.length >= 2, `not vacuous: ${custom.length} custom-sourced études`);
  for (const { name, saved } of custom) {
    assert.match(linkable(saved).reason, /source: custom/, `${name}: linkable names the rule`);
    assert.throws(() => toFragment(saved, ENV), /refused — .*source: custom.*charter §6/, `${name}: the writer refuses`);
    // a hand-made link: the same block, encoded the same way, offered to the reader
    const r = fromFragment(`#${LINK_KEY}=` + encodeURIComponent(etudeBlockBody(saved, ENV)));
    assert.deepEqual(Object.keys(r), ["reason"], `${name}: the reader returns a refusal and nothing else`);
    assert.match(r.reason, /refused — .*source: custom/, `${name}: the reader refuses`);
  }
});

test("typed changes left in `custom` under another source never ride along — refused both ways", () => {
  const saved = { ...CORPUS.find((e) => e.saved.source === "cycle").saved, custom: "| Cm7 F7 | Bbmaj7 |" };
  assert.match(linkable(saved).reason, /still holds typed changes \(custom\)/);
  assert.throws(() => toFragment(saved, ENV), /still holds typed changes/);
  const r = fromFragment(`#${LINK_KEY}=` + encodeURIComponent(etudeBlockBody(saved, ENV)));
  assert.match(r.reason, /still holds typed changes/);
  assert.equal(linkable({ ...saved, custom: "   " }), true, "whitespace is no typed change");
});

test("what is not an étude link is named", () => {
  assert.match(fromFragment("").reason, /carries no #etude=/);
  assert.match(fromFragment("#tab=2").reason, /carries no #etude=/);
  assert.match(fromFragment("#etude=%E0%A4%A").reason, /percent-encoding is broken/);
  assert.match(fromFragment("#etude=").reason, /empty/);
  assert.match(linkable(null).reason, /no étude/);
  const flagged = fromFragment("#etude=" + encodeURIComponent("app: multetudes\nv: 2\nkey: C\nstrings: [4, 3,"));
  assert.deepEqual(flagged.snapshot, { key: "C" }, "a hand-edited link reads like a pasted block: the rest still loads");
  assert.equal(flagged.flagged[0].key, "strings", "and the bad value is flagged for the host to name");
});

/* THE PERMANENCE PIN — written 2026-11-20 from the corpus étude "a form (ii-V-I)", block v2. Once a link is embedded
 * this string is out of our hands: it must read back to exactly this snapshot forever. Never edit either literal; a
 * format change that breaks it is a new `v`, read beside this one. */
const PINNED_V2 = "#etude=app%3A%20multetudes%0Av%3A%202%0Asplit%3A%20chart%0Astrings%3A%20%5B4%2C%203%2C%202%2C%201%5D%0AstartDeg%3A%204%0AnearFret%3A%203%0AnotesPer%3A%203%0Aaddress%3A%20pattern%0Afigure%3A%0Amovement%3A%20arpeggiate%0Atake%3A%20one%0Arepeat%3A%20false%0Atuning%3A%20null%0Akey%3A%20Bb%0Ascale%3A%20major%0Aref%3A%200%0Abass%3A%20root%0AcentreSrc%3A%20fixed%0Agamut%3A%20null%0Asounded%3A%20none%0Apad%3A%20false%0Atones%3A%20%5B1%2C%203%2C%205%2C%207%5D%0Asource%3A%20form%0Acycle%3A%20fourths%0Aform%3A%20ii-V-I%0Acustom%3A%0Astart%3A%200%0Abpm%3A%20120%0Ameter%3A%204%0Asub%3A%201%0Aclick%3A%20true%0Aaccents%3A%20true%0AclickLevel%3A%200.8%0AclickVoice%3A%20beep%0Amixer%3A%20%7Bvoice%3A%20tone%2C%20chord%3A%201%2C%20bass%3A%201%2C%20pad%3A%201%7D";
const PINNED_V2_READS = {
  split: "chart", strings: [4, 3, 2, 1], startDeg: 4, nearFret: 3, notesPer: 3, address: "pattern", figure: "",
  movement: "arpeggiate", take: "one", repeat: false, tuning: null, key: "Bb", scale: "major", ref: 0, bass: "root",
  centreSrc: "fixed", gamut: null, sounded: "none", pad: false, tones: [1, 3, 5, 7], source: "form", cycle: "fourths",
  form: "ii-V-I", custom: "", start: 0, bpm: 120, meter: 4, sub: 1, click: true, accents: true, clickLevel: 0.8,
  clickVoice: "beep", mixer: { voice: "tone", chord: 1, bass: 1, pad: 1 },
};

test("permanence: a pinned v2 link reads back to its pinned snapshot, forever", () => {
  const r = fromFragment(PINNED_V2);
  assert.ok(!("reason" in r), `the pinned link is refused — ${r.reason}`);
  assert.equal(r.app, "multetudes"); assert.equal(r.v, 2);
  assert.deepEqual(r.flagged, []);
  assert.deepEqual(r.snapshot, PINNED_V2_READS);
  // the writer still writes it today; if this alone fails, the WRITER moved — the pin above still binds the reader
  assert.equal(toFragment(PINNED_V2_READS, { app: "multetudes", v: 2 }), PINNED_V2, "today's writer no longer writes the pinned link");
});
