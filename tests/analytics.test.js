import { test } from "node:test";
import assert from "node:assert/strict";
import { needsConsentPrompt, EEA_UK_REGIONS, track } from "../src/lib/analytics.js";

test("EEA + UK region list has 31 entries and includes GB, DE, NO", () => {
  assert.equal(EEA_UK_REGIONS.length, 31);
  for (const c of ["GB", "DE", "NO", "IS", "LI"]) assert.ok(EEA_UK_REGIONS.includes(c));
});

test("needsConsentPrompt by timezone heuristic", () => {
  assert.equal(needsConsentPrompt("Europe/Berlin"), true);
  assert.equal(needsConsentPrompt("Europe/London"), true);
  assert.equal(needsConsentPrompt("America/Phoenix"), false);
  assert.equal(needsConsentPrompt("Europe/Istanbul"), false);
  assert.equal(needsConsentPrompt("Europe/Moscow"), false);
  assert.equal(needsConsentPrompt(undefined), false);
});

test("track is a no-op without gtag and forwards with it", () => {
  assert.doesNotThrow(() => track("x", {}));
  const calls = [];
  globalThis.window = { gtag: (...a) => calls.push(a) };
  track("cta_click", { location: "header" });
  assert.deepEqual(calls[0], ["event", "cta_click", { location: "header" }]);
  delete globalThis.window;
});
