// gate-namespace.test.mjs — THE DOOR GATE'S ONE NAMESPACE FAILS ON A REBIND, BY NAME (night 86, ruling 261054 §3).
// hub/tests/_gate_namespace.py is the mechanism (door_locks.py runs it before any browser opens). Pinned here: it is
// silent on today's gate, and it FAILS on the real case — night 84's item-6 block named its loop result `r`, and every
// block after it read the resolver's `r` and raised KeyError: 'controlsPresent' — reconstructed from today's source by
// undoing that night's rename. And on the closure case nothing has hit yet: a handler bound in the prologue reads
// `console` when it is called, long after a later block could have rebound it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const GATE = "hub/tests/door_locks.py";
const run = (src) => {
  const dir = mkdtempSync(join(tmpdir(), "gate-ns-")), p = join(dir, "door_locks.py");
  writeFileSync(p, src);
  try { execFileSync("python3", ["hub/tests/_gate_namespace.py", p, "--json"], { encoding: "utf8" }); }
  catch (e) { return JSON.parse(e.stdout); }   // exit 1 = findings
  return { blocks: -1, findings: [] };
};
const today = readFileSync(GATE, "utf8");

test("today's gate: one namespace, and no block rebinds a name a later block reads", () => {
  const out = JSON.parse(execFileSync("python3", ["hub/tests/_gate_namespace.py", GATE, "--json"], { encoding: "utf8" }));
  assert.ok(out.blocks > 100, `the guard read run_door's real blocks, not nothing: ${out.blocks}`);
  assert.deepEqual(out.findings, []);
});

test("NIGHT 84, REAL: the item-6 block's loop result named `r` again — every later reader of the resolver's `r` is named", () => {
  assert.match(today, /\brow84\b/, "the night-84 block still carries the rename this test undoes — if it moved, re-aim the reconstruction");
  const red = run(today.replace(/\brow84\b/g, "r"));
  const r = red.findings.filter(([kind, name]) => kind === "rebound before read" && name === "r");
  assert.ok(r.length >= 1, `night 84's shadowing is found: ${JSON.stringify(red.findings)}`);
  const share = today.split("\n").findIndex((l) => /# -{3,}.*SHARE WHAT YOU MAKE/.test(l)) + 1;
  assert.ok(r.some(([, , line]) => line > share), `a reader after the share block's banner (line ${share}) is named — the KeyError's site`);
});

test("NIGHT 84: the item-9 block's `q` and `moved` were renamed the same night — and never collided (no later reader)", () => {
  const out = run(today.replace(/\bq84\b/g, "q").replace(/\bmoved84\b/g, "moved"));
  assert.deepEqual(out.findings, [], "renamed preemptively: the guard does not cry wolf on a name a block binds and reads itself");
});

test("THE CLOSURE CASE: a later block rebinds a name a prologue handler reads when it is called", () => {
  const handler = today.search(/page\.on\("console", lambda m: console\.append/);
  assert.ok(handler > 0, "the prologue's console handler is where this test expects it");
  const re = /^( +)# -{3,}/gm; re.lastIndex = handler;
  const banner = re.exec(today);   // the first block after the handler is bound, at its own indentation
  const pad = banner[1];
  const out = run(today.slice(0, banner.index) + `${pad}# ---- a later block, made up\n${pad}console = []\n` + today.slice(banner.index));
  assert.ok(out.findings.some(([kind, name]) => kind === "closure rebound" && name === "console"), JSON.stringify(out.findings));
});
