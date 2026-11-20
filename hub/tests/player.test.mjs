/* player.test.mjs — the player door's one decision, playable(), and its permanence (261120).
 *
 * Child 3 of the étude embed epic. What a link plays is decided in one pure function (hub/modules/etude-player.mjs
 * `playable`); the browser half (it plays, tempo, Open, one at a time across origins) is hub/tests/player_door.py.
 *
 * PERMANENCE (the epic, "read before building"): once a player is embedded on someone else's page its link format is a
 * published URL. The player must read every block version it has ever accepted, forever — so the v2 corpus block below
 * is PINNED as text, not re-written by today's writer: if a later writer changes, this block still has to play.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { playable } from "../modules/etude-player.mjs";
import { toFragment, fromFragment } from "../../engine/etude-link.mjs";
import { etudeBlockBody, ETUDE_V } from "../../engine/etude-block.mjs";

const corpus = JSON.parse(readFileSync(new URL("./fixtures/etude-corpus.json", import.meta.url), "utf8"));
const APP = "multetudes";
const enc = (snap, env) => "#etude=" + encodeURIComponent(etudeBlockBody(snap, env));
const typed = (s) => s.source === "custom" || (typeof s.custom === "string" && s.custom.trim() !== "");

test("every corpus étude that may travel plays; every one with typed changes is refused by name (§6)", () => {
  let played = 0, refused = 0;
  for (const { name, saved } of corpus) {
    const got = playable(enc(saved, { app: APP, v: ETUDE_V }), APP);
    if (typed(saved)) {
      assert.ok(got.reason && /typed/.test(got.reason) && /§6/.test(got.reason), `${name}: refused, naming typed changes and §6 — ${got.reason}`);
      assert.equal(got.snapshot, undefined, `${name}: a §6 refusal offers nothing to open`);
      refused++;
    } else {
      assert.equal(got.reason, undefined, `${name}: plays — ${got.reason}`);
      assert.deepEqual(got.snapshot, fromFragment(toFragment(saved, { app: APP, v: ETUDE_V })).snapshot, `${name}: the étude read is the link's`);
      played++;
    }
  }
  assert.ok(played >= 10 && refused >= 1, `the corpus ran both ways (${played} played, ${refused} refused)`);
});

test("it never guesses: no link, a broken link, another app, a version it cannot read, a value it cannot play", () => {
  const arp = corpus.find((x) => x.name === "an arpeggio").saved;
  const cases = [
    ["", /no étude in this link/],
    ["#etude=%E0%A4%A", /percent-encoding is broken/],
    [enc(arp, { app: "riffraft", v: 2 }), /riffraft wrote; this player plays multetudes/],
    [enc(arp, { app: APP, v: ETUDE_V + 1 }), new RegExp(`version ${ETUDE_V + 1}; this player reads up to version ${ETUDE_V}`)],
    [enc({ ...arp, key: "H#" }, { app: APP, v: 2 }), /a value the player cannot play: key/],
  ];
  for (const [hash, words] of cases) {
    const got = playable(hash, APP);
    assert.match(got.reason ?? "", words, `${JSON.stringify(hash.slice(0, 40))} → ${got.reason}`);
  }
  // a refused VALUE still has an étude to open (Multetudes skips and names it there); a §6 refusal has none
  assert.ok(playable(enc({ ...arp, key: "H#" }, { app: APP, v: 2 }), APP).snapshot);
});

test("Open in Multetudes carries the same étude: the link it writes reads back to what the player plays", () => {
  for (const { name, saved } of corpus.filter((x) => !typed(x.saved))) {
    const got = playable(enc(saved, { app: APP, v: ETUDE_V }), APP);
    const open = "https://atetudes.com/studies/multetudes/study.html" + toFragment(got.snapshot, { app: APP, v: ETUDE_V });
    const back = fromFragment(new URL(open).hash);
    assert.equal(back.reason, undefined, name);
    assert.deepEqual(back.snapshot, got.snapshot, `${name}: Open's étude = the player's`);
    assert.equal(back.app, APP);
  }
});

/* THE PERMANENCE PIN — the v2 block of the corpus's "an arpeggio", as text (written 261120 by etude-block v2). Never
 * re-generate it: if this stops playing, an embed on someone's page has stopped playing. */
const V2_BLOCK = "app: multetudes\nv: 2\nsplit: chart\nstrings: [4, 3, 2, 1]\nstartDeg: 4\nnearFret: 3\nnotesPer: 3\naddress: pattern\nfigure:\nmovement: arpeggiate\ntake: one\nrepeat: false\ntuning: null\nkey: Bb\nscale: major\nref: 0\nbass: root\ncentreSrc: fixed\ngamut: null\nsounded: none\npad: false\ntones: [1, 3, 5, 7]\nsource: cycle\ncycle: fourths\nform: ii-V-I\ncustom:\nstart: 0\nbpm: 120\nmeter: 4\nsub: 1\nclick: true\naccents: true\nclickLevel: 0.8\nclickVoice: beep\nmixer: {voice: tone, chord: 1, bass: 1, pad: 1}";
const V2_PINNED = "#etude=" + encodeURIComponent(V2_BLOCK);
const V2_TEXT_START = "app: multetudes\nv: 2\n";

test("permanence: a v2 block plays, and the reader keeps reading v2 whatever ETUDE_V becomes", () => {
  assert.ok(decodeURIComponent(V2_PINNED.slice(7)).startsWith(V2_TEXT_START), "the pinned block is a v2 multetudes block");
  const got = playable(V2_PINNED, APP);
  assert.equal(got.reason, undefined, got.reason);
  assert.equal(got.snapshot.address, "pattern");
  assert.equal(got.snapshot.key, "Bb");
  assert.equal(got.snapshot.cycle, "fourths");
  // a future build that reads up to v3 still plays the v2 block
  assert.equal(playable(V2_PINNED, APP, 3).reason, undefined);
});
