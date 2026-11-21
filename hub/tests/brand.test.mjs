/* brand.test.mjs — the player's @ is the logo's @ (261120; *Player - the @ mark replaces the card title*).
 *
 * Asserted on the artifact: the shipped logo file's own <text> that draws the @, read as bytes on disk — its
 * font-family and fill must be hub/brand.mjs's, so the mark in the player and the mark in the site's header cannot
 * drift. (BRAND_AT.colour is the palette's R, which engine/tests/degree-palette.test.mjs holds to the Spec's table; the
 * rendered mark — in the player, absent from Multetudes — is hub/tests/player_door.py's §11.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BRAND_AT } from "../brand.mjs";

const REPO = new URL("../../", import.meta.url);
const logo = readFileSync(new URL("static/assets/logo.svg", REPO), "utf8");

test("the logo draws exactly one @, and it is hub/brand.mjs's glyph, typeface and colour", () => {
  const ats = [...logo.matchAll(/<text\b([^>]*)>\s*@\s*<\/text>/g)];
  assert.equal(ats.length, 1, "one <text> in the logo draws the @");
  const attr = (name) => (ats[0][1].match(new RegExp(`\\b${name}="([^"]*)"`)) || [])[1];
  assert.equal(BRAND_AT.glyph, "@");
  assert.equal(attr("font-family"), BRAND_AT.font, "the @'s typeface is the logo's");
  assert.equal(attr("fill").toUpperCase(), BRAND_AT.colour.toUpperCase(), "the @'s colour is the logo's — root red");
});
