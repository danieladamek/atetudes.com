// bus-replay.test.mjs — the bus replays state-shaped messages to a late subscriber (night 63: repeat rides on CONFIG,
// so a transport view that mounts mid-repeat hears the current value on subscribe — the answer to the
// mount-mid-repeat question, pinned at the mechanism). A minimal document: enough of the DOM's event contract for
// bus.mjs, no browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CONFIG_CHANGED, STEP_CHANGED, announce, listen } from "../bus.mjs";

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

test("NIGHT 63: a listener subscribed AFTER an announce hears the merged last CONFIG — repeat included — on subscribe", () => {
  const d = fakeDoc();
  announce(d, CONFIG_CHANGED, { key: "C", repeat: false });
  announce(d, CONFIG_CHANGED, { repeat: true });
  const heard = [];
  listen(d, CONFIG_CHANGED, (m) => heard.push(m));
  assert.equal(heard.length, 1, "one replay on subscribe");
  assert.equal(heard[0].repeat, true, "the last value of repeat, merged over the earlier message");
  assert.equal(heard[0].key, "C", "…with the rest of the state merged in");
});

test("NIGHT 63: STEP is event-shaped — a late subscriber hears nothing on subscribe (night 62's finding, pinned)", () => {
  const d = fakeDoc();
  announce(d, STEP_CHANGED, { index: 3 });
  const heard = [];
  listen(d, STEP_CHANGED, (m) => heard.push(m));
  assert.equal(heard.length, 0);
});
