import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;

test("dist exists (run `npm run build` first)", () => {
  assert.ok(existsSync(join(dist, "index.html")), "dist/index.html missing");
});

test("homepage has no leftover neon/brevo/notify markers", () => {
  const html = readFileSync(join(dist, "index.html"), "utf8");
  for (const bad of ["sibforms.com", "neon-glow", "cta-glow", "#notify", "Join early access", "Notify me", "#ffb020", "Archivo"]) {
    assert.ok(!html.includes(bad), `found "${bad}"`);
  }
});

test("homepage has required conversion + discoverability markup", () => {
  const html = readFileSync(join(dist, "index.html"), "utf8");
  assert.ok(html.includes('action="https://formspree.io/f/xkjnyqgp"'));
  assert.ok((html.match(/Save my spot/g) || []).length >= 3);
  assert.ok(html.includes('"@type":"FAQPage"'));
  assert.ok(html.includes('rel="alternate" type="application/rss+xml"'));
  assert.ok(html.includes('name="source"'));
});

test("JS budget: total <= 250 KB gz, three chunk <= 160 KB gz", () => {
  const astroDir = join(dist, "_astro");
  let total = 0;
  let three = 0;
  for (const f of readdirSync(astroDir)) {
    if (!f.endsWith(".js")) continue;
    const gz = gzipSync(readFileSync(join(astroDir, f))).length;
    total += gz;
    if (f.startsWith("three.")) three += gz;
  }
  assert.ok(three > 0 && three <= 160 * 1024, `three chunk ${three} bytes gz`);
  assert.ok(total <= 250 * 1024, `total js ${total} bytes gz`);
});

test("static discoverability files exist", () => {
  for (const f of ["llms.txt", "robots.txt", "rss.xml", "og-image.png", "images/hero-fallback.jpg"]) {
    assert.ok(existsSync(join(dist, f)), `${f} missing`);
  }
  const robots = readFileSync(join(dist, "robots.txt"), "utf8");
  for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) {
    assert.ok(robots.includes(`User-agent: ${bot}`), `robots missing ${bot}`);
  }
});
