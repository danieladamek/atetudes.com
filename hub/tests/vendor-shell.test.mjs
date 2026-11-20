/* vendor-shell.test.mjs — shell 1.0.0, the family's tokens and card grammar RiffRaft vendors (item "The card shell
 * bundle", decisions A–E ruled by Daniel 2026-11-19), tested as the ARTIFACT.
 *
 * Every assertion below about what the shell IS imports the committed bundle file, which has no imports, so what passes
 * here is what RiffRaft gets. The family's pages are read as built or published bytes: the doors' :root, the hand
 * pages' and the generator pages' must be the bundle's tokensCss, byte for byte, which is how the family keeps one copy.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { SHELL_VERSION, OUT_DIR, KINDS, bundleName, manifestName, checkCommitted, degreeHexProblems, buildBundle } from "../tools/vendor.mjs";
import { FAM_COLOR } from "../../engine/degree-palette.mjs";
import * as SOURCE from "../card-shell.mjs";

const REPO = join(OUT_DIR, "..", "..");
const BUNDLE = join(OUT_DIR, bundleName(SHELL_VERSION, "shell"));
const text = readFileSync(BUNDLE, "utf8");
const manifest = JSON.parse(readFileSync(join(OUT_DIR, manifestName(SHELL_VERSION, "shell")), "utf8"));
const S = await import(pathToFileURL(BUNDLE).href);
const SPEC = readFileSync(join(REPO, "docs", "design-language-and-engine-spec.md"), "utf8");
const page = (p) => readFileSync(join(REPO, p), "utf8");
const RED = { red: FAM_COLOR.R };

test("shell 1.0.0 is committed, is its manifest's sha, reproduces from its recorded sources, and is locked", async () => {
  const { problems, versions } = await checkCommitted();
  assert.deepEqual(problems, []);
  assert.ok(versions.includes(`shell ${SHELL_VERSION}`), `shell ${SHELL_VERSION} is committed: ${versions}`);
  assert.equal(manifest.name, KINDS.shell.name);
  assert.deepEqual(manifest.sources.map((s) => s.path), ["hub/card-shell.mjs", "hub/readout-grammar.mjs"]);
  assert.ok(Array.isArray(manifest.excluded) && manifest.excluded.length >= 3, "what 1.0.0 leaves outside is named in the manifest");
});

test("the bundle stands alone and exports exactly the manifest's API — tokens, frames, controls, readout, ▾ and ⓘ", () => {
  assert.equal(/^\s*import\b/m.test(text), false, "no import statement");
  assert.equal(/\bimport\s*\(/.test(text), false, "no dynamic import");
  assert.deepEqual(Object.keys(S).sort(), [...manifest.api].sort());
  for (const n of ["SHELL_VERSION", "TOKENS", "tokensCss", "CARD_CSS", "CONTROLS_CSS", "READOUT_CSS", "initCollapse", "initInfo"])
    assert.ok(n in S, `the proposal's API names ${n}`);
  assert.equal(S.SHELL_VERSION, SHELL_VERSION);
});

test("decision A: both skins named — door is v0.9's, page is the hand pages', and page states no --edge", () => {
  assert.deepEqual(Object.keys(S.TOKENS), ["door", "page"]);
  assert.deepEqual(S.TOKENS.door, { ground: "#FFFFFF", card: "#FAFAFB", ink: "#212126", gray: "#73737A", line: "#B9B9BF", edge: "#E6E6EA" });
  assert.deepEqual(S.TOKENS.page, { ground: "#ECECEE", card: "#FFFFFF", ink: "#212126", gray: "#73737A", line: "#D8D8DC", edge: null });
  assert.doesNotMatch(S.tokensCss("page"), /--edge/);
  assert.throws(() => S.tokensCss("dark"), /no skin "dark"/);
});

test("decision B: ink and gray ARE the Spec's §2.1 supporting grays, by value; the other four are declared chrome", () => {
  const line = SPEC.split("\n").find((l) => l.startsWith("- Supporting grays:"));
  assert.ok(line, "§2.1 states the supporting grays");
  const ink = line.match(/ink (#[0-9A-F]{6})/)[1];
  const g = line.match(/gray \(([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/).slice(1).map(Number);
  const hex = "#" + g.map((x) => Math.round(x * 255).toString(16).padStart(2, "0").toUpperCase()).join("");
  for (const skin of ["door", "page"]) {
    assert.equal(S.TOKENS[skin].ink, ink, `${skin}: ink is the Spec's`);
    assert.equal(S.TOKENS[skin].gray, hex, `${skin}: gray is the Spec's (${g})`);
  }
  assert.deepEqual([...S.SPEC_TOKENS], ["ink", "gray"]);
});

test("NO DEGREE COLOURS: the bundle's bytes carry none but the ink — and the lock bites on one appended hex", async () => {
  assert.deepEqual(await degreeHexProblems(text), []);
  for (const [k, hex] of Object.entries(FAM_COLOR)) {
    if (k === "5") continue;   // the ink: the 5th's colour by value, the Spec's own word for it
    assert.ok((await degreeHexProblems(text + `\n/* ${hex} */`)).length === 1, `the lock sees ${k}'s ${hex}`);
  }
  assert.doesNotMatch(S.tokensCss("door"), /--red/, "--red is not a shell token: a caller lends it from the degree palette");
  await assert.rejects(() => buildBundle({ kind: "shell", entries: [{ mod: "palette" }], sourceCommit: "x", blobs: new Map() }),
    /leaves hub\/|lock is open/, "an entry reaching the degree palette is refused");
});

test("ONE COPY: every door, both hand pages and both generator pages carry the bundle's :root byte for byte", () => {
  const door = S.tokensCss("door", RED), pg = S.tokensCss("page", RED);
  let n = 0;
  for (const d of ["multetudes", "tetradetudes", "plain", "scribe"]) {
    const html = page(`hub/build/${d}.html`);
    assert.ok(html.includes(door), `door ${d} carries tokensCss("door")`); n++;
  }
  for (const p of ["static/studies/multetudes/study.html", "static/studies/tetradetudes/study.html"]) { assert.ok(page(p).includes(door), `${p}: tokensCss("door")`); n++; }
  for (const p of ["static/studies/triadetudes/study.html", "static/studies/metronome/study.html"]) {
    const html = page(p);
    assert.ok(html.includes(pg), `${p}: tokensCss("page") byte for byte`);
    assert.equal((html.match(/:root\s*\{/g) || []).length, 1, `${p}: one :root, the bundle's`); n++;
  }
  // the bridge's maintained page; tetrad-voice-leading is frozen (R3) and named in the manifest as outside 1.0.0
  for (const p of ["static/studies/modes-from-pentatonic-boxes/study.html"]) {
    assert.ok(page(p).includes(door), `${p}: the bridge emits tokensCss("door") byte for byte`); n++;
  }
  assert.ok(!page("static/studies/tetrad-voice-leading/study.html").includes(door), "the frozen page is untouched — if it ever carries the shell, re-site this pin");
  assert.equal(n, 9, "nine carriers checked");
});

test("the source is the bundle: card-shell.mjs's exports and the bundle's agree, string for string", () => {
  for (const k of Object.keys(SOURCE)) {
    const a = SOURCE[k], b = S[k];
    if (typeof a === "function") assert.equal(String(b), String(a), `${k}: the same function text`);
    else assert.deepEqual(b, a, k);
  }
  assert.equal(S.CARD_CSS, S.CARD_FRAME_CSS + S.STRIP_FRAME_CSS + S.BOARD_FRAME_CSS + S.HINT_CSS + S.COLLAPSE_CSS + S.INFO_CSS);
  assert.equal(S.CONTROLS_CSS, S.FIELD_CSS + S.TRANSPORT_CSS + S.SEG_CSS);
  for (const [k, css] of Object.entries(S).filter(([k, v]) => /_CSS$/.test(k) && typeof v === "string"))
    assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length, `${k}: braces balance`);
});

/* ---- SMOKE: the bundle's ▾ and ⓘ, run on a card — a minimal DOM written for exactly what the two functions touch ---- */
function miniDom() {
  const all = [];
  const listeners = {};
  const matches = (el, sel) => sel.split(",").map((s) => s.trim()).some((s) => {
    s = s.replace(/^:scope\s*>\s*/, "");
    const not = s.match(/^(.*):not\(\.([\w-]+)\)$/);
    if (not) return matches(el, not[1]) && !el.cls.has(not[2]);
    if (s === "[data-header-slot]") return "header-slot" in el.data;
    const [tag, ...cls] = s.split(".");
    return (!tag || el.tag === tag) && cls.every((c) => el.cls.has(c));
  });
  const make = (tag) => {
    const el = { tag, cls: new Set(), data: {}, attrs: {}, style: {}, children: [], parentElement: null, hidden: false, _t: "", _ls: {},
      get className() { return [...this.cls].join(" "); }, set className(v) { this.cls = new Set(v.split(/\s+/).filter(Boolean)); },
      get textContent() { return this._t + this.children.map((c) => c.textContent).join(""); }, set textContent(v) { this._t = v; this.children = []; },
      get id() { return this.attrs.id || ""; }, set id(v) { this.attrs.id = v; },
      classList: null,
      setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k] ?? null; },
      appendChild(c) { if (c.parentElement) c.parentElement.children = c.parentElement.children.filter((x) => x !== c); c.parentElement = this; this.children.push(c); return c; },
      prepend(c) { c.parentElement = this; this.children.unshift(c); },
      after(c) { const p = this.parentElement; if (c.parentElement) c.parentElement.children = c.parentElement.children.filter((x) => x !== c); c.parentElement = p; p.children.splice(p.children.indexOf(this) + 1, 0, c); },
      get nextElementSibling() { const p = this.parentElement; return p ? p.children[p.children.indexOf(this) + 1] ?? null : null; },
      get lastChild() { return this.children[this.children.length - 1] ?? null; },
      querySelectorAll(sel) { const out = []; const walk = (n) => { for (const c of n.children) { if (matches(c, sel) && !(/^:scope/.test(sel) && c.parentElement !== this)) out.push(c); walk(c); } }; walk(this); return out; },
      querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; },
      contains(n) { for (let x = n; x; x = x.parentElement) if (x === this) return true; return false; },
      matches(sel) { return matches(this, sel); },
      addEventListener(t, fn) { (this._ls[t] ||= []).push(fn); },
      click() { for (const fn of this._ls.click || []) fn({ target: this, stopPropagation() {} }); },
      getClientRects() { return []; },
    };
    el.classList = { contains: (c) => el.cls.has(c), add: (c) => el.cls.add(c), toggle: (c, on) => { const v = on ?? !el.cls.has(c); v ? el.cls.add(c) : el.cls.delete(c); return v; } };
    all.push(el);
    return el;
  };
  const body = make("body");
  const doc = { body, createElement: make, querySelectorAll: (s) => body.querySelectorAll(s), querySelector: (s) => body.querySelector(s),
    addEventListener(t, fn) { (listeners[t] ||= []).push(fn); },
    defaultView: { getComputedStyle: () => ({ paddingRight: "0px" }), addEventListener() {}, requestAnimationFrame() {} } };
  return { doc, make };
}

test("SMOKE: the bundle's initInfo and initCollapse dress a card — ⓘ moves the prose, ▾ shuts it to its live line", () => {
  const { doc, make } = miniDom();
  const card = doc.body.appendChild(make("div")); card.className = "card";
  const h2 = card.appendChild(make("h2")); h2.textContent = "Notepad";
  const hint = card.appendChild(make("div")); hint.className = "hint"; hint.textContent = "3 saved";
  const info = card.appendChild(make("div")); info.className = "hint info"; info.textContent = "What the notepad is for.";
  S.initInfo(doc);
  S.initCollapse(doc);
  const btnI = card.querySelector("button.infoBtn"), pop = card.querySelector(".infoPop");
  assert.ok(btnI && pop, "the card grew an ⓘ and its popout");
  assert.equal(pop.children[0], info, "the .info prose MOVED into the popout, verbatim");
  assert.equal(pop.hidden, true);
  btnI.click();
  assert.equal(pop.hidden, false, "ⓘ opens it");
  assert.equal(h2.style.paddingRight, "66px", "the header reserves ⓘ + ▾");
  const btnC = card.querySelector("button.clpsBtn");
  assert.ok(btnC, "the card grew a ▾");
  assert.equal(btnC.textContent, "▾");
  btnC.click();
  assert.ok(card.classList.contains("clpsd"), "▾ shuts the card");
  assert.equal(btnC.textContent, "▸");
  assert.equal(card.querySelector(".clpsSum").textContent, "3 saved", "shut, it reads its own live line — never the static prose");
  btnC.click();
  assert.ok(!card.classList.contains("clpsd"), "and opens again");
});
