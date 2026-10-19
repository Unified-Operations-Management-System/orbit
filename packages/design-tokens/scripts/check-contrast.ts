// Fails if any text pair misses WCAG AA, or if the web @theme drifts from the tokens.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { colors, textPairs } from "../src/index.ts";
import { contrast } from "../src/contrast.ts";

for (const [fg, bg] of textPairs) {
  const ratio = contrast(colors[fg], colors[bg]);
  assert.ok(ratio >= 4.5, `${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs 4.5:1`);
}

// Known values from the design doc guard the formula itself.
assert.equal(contrast("#111111", "#FFFFFF").toFixed(2), "18.88");
assert.equal(contrast("#D62839", "#FFFFFF").toFixed(2), "4.97");

const css = readFileSync(new URL("../../../apps/web/app/globals.css", import.meta.url), "utf8");
for (const [name, hex] of Object.entries(colors)) {
  const cssName = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  const match = css.match(new RegExp(`--color-${cssName}:\\s*(#[0-9A-Fa-f]{6})`));
  assert.ok(match, `globals.css is missing --color-${cssName}`);
  assert.equal(match[1]?.toUpperCase(), hex.toUpperCase(), `--color-${cssName} differs from tokens`);
}

console.log(`ok: ${textPairs.length} text pairs pass AA, web theme matches tokens`);
