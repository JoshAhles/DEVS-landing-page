import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 4399;
const BASE = `http://localhost:${PORT}`;

const dev = spawn("npx", ["astro", "dev", "--port", String(PORT)], { stdio: "ignore" });
try {
  for (let i = 0; i < 60; i++) {
    try { await fetch(BASE); break; } catch { await sleep(500); }
  }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage();

  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/og`, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => document.querySelector("astro-dev-toolbar")?.remove());
  await page.screenshot({ path: "public/og-image.png", clip: { x: 0, y: 0, width: 1200, height: 630 } });

  await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 2 });
  await page.mouse.move(700, 500);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.waitForSelector("body > canvas", { timeout: 20000 });
  await sleep(1800);
  await page.evaluate(() => document.querySelector("astro-dev-toolbar")?.remove());
  const el = await page.$("[data-hero-scene]");
  await el.screenshot({ path: "public/images/hero-fallback.jpg", type: "jpeg", quality: 72 });
  await browser.close();
  console.log("rendered public/og-image.png and public/images/hero-fallback.jpg");
} finally {
  dev.kill();
}
