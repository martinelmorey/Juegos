const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("arcade.css", "utf8");
const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));

test("landing announces the inactive service without exposing games", () => {
  assert.match(html, /<main class="coming-soon"/);
  assert.match(html, /PRÓXIMAMENTE/);
  assert.match(html, /Estamos preparando una nueva experiencia/i);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(html, /class="grid"/);
  assert.doesNotMatch(html, /leaderboard\.js/);
});

test("coming-soon screen is responsive and accessible", () => {
  assert.match(css, /\.coming-soon\s*\{/);
  assert.match(css, /min-height:\s*100(?:svh|dvh)/);
  assert.match(css, /@media\s*\(max-width:\s*500px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("direct game routes redirect to the inactive landing", () => {
  const sources = new Set(vercel.redirects.map((rule) => rule.source));
  for (const route of ["/game.html", "/tetris", "/tetris/:path*", "/rem-runner", "/rem-runner/:path*"]) {
    assert.ok(sources.has(route), `missing redirect for ${route}`);
  }
  assert.ok(vercel.redirects.every((rule) => rule.destination === "/" && rule.permanent === false));
});
