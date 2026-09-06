/* decorative.test.mjs — a predicate for the DECORATIVE control (night 35b, 260929).
 *
 * Subdivision did nothing on the door-built pages for as long as the door
 * existed, and every test we owned passed: the control existed
 * (METRONOME_HOSTS), its bytes matched (the card pin), its words were right
 * (the lexicon), and the inert sweep looks for a control with NO handler —
 * this one had a handler that validated the value and discarded it. Not
 * inert: decorative.
 *
 * THE PREDICATE: a change/input handler in a hub module is decorative when
 * its body, after the checks are removed, neither WRITES STATE nor CALLS
 * anything. Precisely:
 *   - the population is every `X.addEventListener("change" | "input", H)`
 *     in hub/modules/*.mjs and hub/shell.mjs — the handlers a select, a
 *     range, a checkbox or a text field fires; click handlers are not swept
 *     (a button's job is often only to call, and that would be vacuous here);
 *   - H is a function literal, or a name resolved to `const NAME = (…) =>`
 *     or `function NAME(` in the same file — an unresolved H is REPORTED,
 *     never failed;
 *   - from H's body, comments, string and template literals are blanked and
 *     every `throw …;` statement is removed (a refusal is a check, not an
 *     effect); what remains must contain an assignment (`=`, `+=`, `++`, …)
 *     or a call (`name(` — the keywords if/for/while/switch/catch/return/
 *     typeof excluded; `new X(` counts);
 *   - a handler with neither is decorative, and this test names it by file,
 *     line and the control it is bound to.
 * KNOWN BLIND SPOT, stated: a handler whose only call is itself inert
 * (`e.preventDefault()`, a call into a function that does nothing) passes —
 * the predicate reads one hop, by design; a second hop would make it guess.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HUB = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = [...readdirSync(join(HUB, "modules")).filter((f) => f.endsWith(".mjs")).map((f) => "modules/" + f), "shell.mjs"];

/** the index just past the bracket that balances src[open] (strings, templates and comments skipped) */
function balancedEnd(src, open) {
  const pair = { "(": ")", "{": "}", "[": "]" };
  const stack = [pair[src[open]]];
  let i = open + 1;
  while (i < src.length && stack.length) {
    const c = src[i], n = src[i + 1];
    if (c === "/" && n === "/") { i = src.indexOf("\n", i); if (i < 0) break; continue; }
    if (c === "/" && n === "*") { i = src.indexOf("*/", i) + 2; continue; }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) { if (src[j] === "\\") j++; j++; }
      i = j + 1; continue;
    }
    if (c in pair) stack.push(pair[c]);
    else if (c === stack[stack.length - 1]) stack.pop();
    i++;
  }
  return i;
}
/** comments, strings and templates blanked; `throw …;` statements removed */
function effectsText(body) {
  let t = body.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
  t = t.replace(/`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');
  t = t.replace(/\bthrow\b[^;]*;/g, " ");
  return t;
}
const KEYWORDS = /\b(?:if|for|while|switch|catch|return|typeof|function)\s*\($/;
function hasEffect(t) {
  if (/(^|[^=!<>])=(?!=|>)/.test(t) || /\+\+|--|[-+*/%|&^]=|\?\?=|\|\|=|&&=/.test(t)) return "writes";
  for (const m of t.matchAll(/([\w$.\]\)]+)\s*\(/g))
    if (!KEYWORDS.test(t.slice(0, m.index + m[0].length))) return "calls";
  return null;
}
/** every change/input handler in a source, with its body text and its control */
function handlersOf(src) {
  const out = [];
  const re = /(\w+|byId\("([\w-]+)"\)|byId\(([\w.]+)\))\.addEventListener\(\s*"(change|input)"\s*,\s*/g;
  for (const m of src.matchAll(re)) {
    const line = src.slice(0, m.index).split("\n").length;
    const control = m[2] || m[3] || m[1];
    const argAt = m.index + m[0].length;
    const callOpen = src.lastIndexOf("(", argAt - 1);   // addEventListener's own paren (argAt itself may be the handler's)
    const handlerText = src.slice(argAt, balancedEnd(src, callOpen) - 1).trim();
    let body = null, how = "literal";
    if (/^(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>/.test(handlerText) || /^(?:async\s+)?function\b/.test(handlerText)) {
      body = handlerText.replace(/^(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>\s*/, "").replace(/^(?:async\s+)?function\s*\w*\s*\([^)]*\)\s*/, "");
    } else if (/^[\w$]+$/.test(handlerText)) {
      how = "named:" + handlerText;
      const def = src.match(new RegExp(`(?:const|let|var)\\s+${handlerText}\\s*=\\s*(?:async\\s*)?(?:\\([^)]*\\)|\\w+)\\s*=>\\s*|function\\s+${handlerText}\\s*\\([^)]*\\)\\s*`));
      if (def) {
        const at = def.index + def[0].length;
        body = src[at] === "{" ? src.slice(at + 1, balancedEnd(src, at) - 1) : src.slice(at, src.indexOf("\n", at));
      }
    }
    out.push({ line, control, event: m[4], how, body, effect: body === null ? "unresolved" : (hasEffect(effectsText(body)) || "DECORATIVE") });
  }
  return out;
}

test("decorative controls: no change/input handler in a hub module both keeps its value and does nothing with it", () => {
  const rows = [];
  for (const rel of FILES) {
    const src = readFileSync(join(HUB, rel), "utf8");
    for (const h of handlersOf(src)) rows.push({ file: "hub/" + rel, ...h });
  }
  assert.ok(rows.length >= 30, `the sweep must actually find the population (found ${rows.length})`);
  const decorative = rows.filter((r) => r.effect === "DECORATIVE");
  const unresolved = rows.filter((r) => r.effect === "unresolved");
  console.log(`decorative sweep: ${rows.length} change/input handlers — ${rows.length - decorative.length - unresolved.length} with an effect, ${unresolved.length} unresolved, ${decorative.length} decorative`);
  for (const r of unresolved) console.log(`  unresolved  ${r.file}:${r.line}  #${r.control} (${r.how})`);
  for (const r of decorative) console.log(`  DECORATIVE  ${r.file}:${r.line}  #${r.control} on ${r.event}`);
  assert.deepEqual(decorative.map((r) => `${r.file}:${r.line} #${r.control}`), [],
    "a control wired to a handler that neither writes state nor calls anything is DECORATIVE — " +
    "it passes the existence, bytes, words and inert checks and does nothing; give it its effect or remove the control");
});
