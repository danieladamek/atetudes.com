// etude-record.test.mjs — THE RECORD NAMES WHAT IT EXCLUDES, NOT WHAT IT KEEPS (night 83, ruling 261050 §5; scoping
// 261052). The mechanism, pinned on a minimal document — enough of the DOM's event contract for bus.mjs, no browser.
// The authoritative half is the door gate's (hub/tests/_bench_record.py): there the keys are the ones the real cards
// say, and the round trip is driven through the real controls. Here: a key nobody has written yet is saved by default;
// the exclusions are named, each with its reason; the mixer keeps its own name; restore never starts the clock; and an
// entry saved BEFORE tonight — a real one, captured from the pre-change build — restores only what it has.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONFIG_CHANGED, CLOCK, CLOCK_STATE, MIXER, announce, listen } from "../bus.mjs";
import { etudeRecord, EXCLUDED, PLACE } from "../etude-record.mjs";

const fakeDoc = () => {
  const handlers = new Map();
  class Ev { constructor(type, init) { this.type = type; this.detail = init && init.detail; } }
  return {
    defaultView: { CustomEvent: Ev },
    addEventListener(name, fn) { (handlers.get(name) || handlers.set(name, []).get(name)).push(fn); },
    removeEventListener(name, fn) { handlers.set(name, (handlers.get(name) || []).filter((h) => h !== fn)); },
    dispatchEvent(ev) { for (const h of [...(handlers.get(ev.type) || [])]) h(ev); return true; },
  };
};

// a page as the cards leave it: the clock's whole state, the mix, the config (the clock playing, the audio armed)
const CLOCK_NOW = { running: true, bpm: 132, meter: 3, sub: 2, owner: "transport", click: false,
  accents: false, clickLevel: 0, clickVoice: "wood" };
const page = () => {
  const d = fakeDoc();
  announce(d, CONFIG_CHANGED, { key: "D", bass: "root", pad: true, object: "triad", tones: [1, 3, 5] });
  announce(d, CLOCK_STATE, CLOCK_NOW);
  announce(d, MIXER, { voice: "pluck", chord: 0.3, bass: 0.55, pad: 0.4, on: true });
  return d;
};
const heardOn = (d, names) => {
  const got = [];
  for (const n of names) d.addEventListener(n, (e) => got.push([n, e.detail]));
  return got;
};

test("NIGHT 83: every exclusion is named WITH ITS REASON, and they are the only list", () => {
  const named = Object.entries(EXCLUDED).flatMap(([msg, keys]) => Object.entries(keys).map(([k, why]) => [msg, k, why]));
  assert.ok(named.length >= 5, `the exclusions are read, not passed on nothing: ${named.length}`);
  for (const [msg, k, why] of named)
    assert.ok(typeof why === "string" && why.trim().length > 12, `${msg}.${k} is excluded with no reason at the site`);
  assert.deepEqual(Object.keys(EXCLUDED).sort(), Object.keys(PLACE).sort(), "every recorded message has its place and its exclusions");
  assert.match(EXCLUDED[CLOCK_STATE].running, /MAY NOT START PLAYBACK/, "running is excluded for the reason Daniel ruled");
});

test("NIGHT 83: the record ABSORBS WHOLE MESSAGES — a key nobody has written yet is saved by default, on every message", () => {
  const d = page();
  announce(d, CONFIG_CHANGED, { zzConfig: 1 });
  announce(d, CLOCK_STATE, { zzClock: 2 });
  announce(d, MIXER, { zzMixer: 3 });
  const s = etudeRecord(d).snapshot();
  assert.equal(s.zzConfig, 1, "a new config key is saved");
  assert.equal(s.zzClock, 2, "a new clock key is saved — no hand-written list of the clock's keys");
  assert.equal(s.mixer && s.mixer.zzMixer, 3, "a new mixer key is saved, under the mixer's name");
  for (const k of ["bpm", "meter", "sub", "click", "accents", "clickLevel", "clickVoice"])
    assert.deepEqual(s[k], CLOCK_NOW[k], `the clock's ${k} is saved`);
});

test("NIGHT 83: what is excluded is never saved — running, owner, the armed audio, the derived object", () => {
  const s = etudeRecord(page()).snapshot();
  for (const [msg, keys] of Object.entries(EXCLUDED)) {
    const where = PLACE[msg] === null ? s : s[PLACE[msg]] || {};
    for (const k of Object.keys(keys)) assert.ok(!(k in where), `${msg}.${k} is excluded but the saved entry carries it`);
  }
});

test("NIGHT 83: the mixer keeps its own name — its levels never overwrite the config's reference tone or pad switch", () => {
  const s = etudeRecord(page()).snapshot();
  assert.equal(s.bass, "root", "the reference tone survives the mixer's bass level");
  assert.equal(s.pad, true, "the pad switch survives the mixer's pad level");
  assert.deepEqual(s.mixer, { voice: "pluck", chord: 0.3, bass: 0.55, pad: 0.4 });
});

test("NIGHT 83: restore sends each part to its owner, and NEVER a run — a file that says running cannot start the clock", () => {
  const d = page(), r = etudeRecord(d);
  const saved = { ...r.snapshot(), running: true, owner: "metro", mixer: { ...r.snapshot().mixer, on: true } };
  const got = heardOn(d, [CONFIG_CHANGED, CLOCK, MIXER]);
  r.restore(saved);
  const clock = got.filter(([n]) => n === CLOCK).map(([, m]) => m);
  assert.equal(clock.length, 1, "one request to the clock owner");
  assert.ok(!("run" in clock[0]) && !("running" in clock[0]) && !("owner" in clock[0]), `the request carries no run state: ${JSON.stringify(clock[0])}`);
  assert.deepEqual(Object.keys(clock[0]).sort(), ["accents", "bpm", "click", "clickLevel", "clickVoice", "meter", "sub"]);
  const cfg = got.filter(([n]) => n === CONFIG_CHANGED).map(([, m]) => m);
  assert.ok(cfg.length === 1 && cfg[0].key === "D" && !("bpm" in cfg[0]) && !("sub" in cfg[0]) && !("mixer" in cfg[0]),
    `the config bus carries the config and nothing of the clock or the mix: ${JSON.stringify(cfg[0])}`);
  const mx = got.filter(([n]) => n === MIXER).map(([, m]) => m);
  assert.deepEqual(mx, [{ voice: "pluck", chord: 0.3, bass: 0.55, pad: 0.4 }], "the mix, less the armed audio");
});

test("NIGHT 83: AN ENTRY FROM BEFORE TONIGHT IS BENCH-BLIND — it restores only what it HAS (Daniel, 2026-10-02)", () => {
  const fx = JSON.parse(readFileSync(new URL("./pre-n83-entries.json", import.meta.url), "utf8"));
  const doors = Object.keys(fx.entries);
  assert.ok(doors.length >= 3, `the captured entries are read: ${doors}`);
  for (const door of doors) {
    const data = fx.entries[door].payload.data;
    const d = page(), got = heardOn(d, [CLOCK, MIXER]);
    etudeRecord(d).restore(data);
    const asked = got.filter(([n]) => n === CLOCK).flatMap(([, m]) => Object.keys(m)).sort();
    const benchInFile = Object.keys(data).filter((k) => k in CLOCK_NOW).sort();
    assert.deepEqual(asked, benchInFile, `${door}: the clock is asked for exactly what the entry carries — silence is "not recorded", never "the default"`);
    assert.deepEqual(asked, ["bpm", "meter"], `${door}: a pre-tonight entry carries the tempo and the meter and nothing else of the bench`);
    assert.equal(got.filter(([n]) => n === MIXER).length, 0, `${door}: no mix is announced from an entry that has none`);
  }
});

test("NIGHT 83: a config key the clock has never said rides the config bus, as every key did — carried, never dropped", () => {
  const d = page(), got = heardOn(d, [CONFIG_CHANGED, CLOCK]);
  etudeRecord(d).restore({ key: "E", zzFromALaterBuild: 9 });
  const cfg = got.filter(([n]) => n === CONFIG_CHANGED).map(([, m]) => m)[0];
  assert.equal(cfg.zzFromALaterBuild, 9);
  assert.equal(got.filter(([n]) => n === CLOCK).length, 0, "nothing of the clock asked when the entry has nothing of it");
  const later = [];
  listen(d, CONFIG_CHANGED, (m) => later.push(m));
  assert.equal(later[0].zzFromALaterBuild, 9, "…and the bus keeps it, so the next save carries it again");
});
