// opens-as.test.mjs — WHAT A HAND-TYPED CHART OPENS AS NEVER MOVES BY ACCIDENT (night 84 — Daniel, 2026-10-02).
// "A lesson IS a hand-typed chart plus prose saying what you will see; a lesson that silently stops matching is the
// worst kind." The values a silent file opens on are pinned in the door's declaration (door.opensAs), named in the
// format (docs/atchart-format.md, wording drafted night 84 for Daniel), and they may NOT follow a live default — so
// they are pinned here as values AND as literals in the source. Moving one is a ruling, not an edit: this test is the
// tripwire that makes it one. The door gate proves the page opens on them (hub/tests/door_locks.py, night 84 item 9).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import multetudes from "../doors/multetudes.door.mjs";

test("NIGHT 84: a hand-typed chart opens Multetudes on Line, arpeggiated, at 120 — the values Daniel pinned 2026-10-02", () => {
  assert.deepEqual(multetudes.opensAs, { notesPer: 3, movement: "arpeggiate", bpm: 120 });
});

test("NIGHT 84: the pinned values are LITERALS in the door — never an identifier that a live default could move", () => {
  const src = readFileSync(new URL("../doors/multetudes.door.mjs", import.meta.url), "utf8");
  const line = src.split("\n").find((l) => /^\s*opensAs:/.test(l));
  assert.ok(line, "the door declares opensAs on one line");
  assert.match(line, /^\s*opensAs: \{ notesPer: \d+, movement: "[a-z]+", bpm: \d+ \},/, `not literals: ${line.trim()}`);
});
