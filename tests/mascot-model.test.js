import { test } from "node:test";
import assert from "node:assert/strict";
import { gaze, blinkAmount, bob, moodFor, EYE_RANGE } from "../src/lib/mascot-model.js";

test("gaze follows pointer within range and clamps", () => {
  const g = gaze(2, -2);
  assert.ok(Math.abs(g.eyeX - EYE_RANGE.x) < 1e-9);
  assert.ok(Math.abs(g.eyeY + EYE_RANGE.y) < 1e-9);
  assert.equal(gaze(0, 0).eyeX, 0);
  assert.ok(gaze(1, 0).tiltY > 0);
});

test("form mood looks toward the form regardless of pointer", () => {
  const a = gaze(1, 1, "form"), b = gaze(-1, -1, "form");
  assert.deepEqual(a, b);
  assert.ok(a.eyeX < 0 && a.eyeY < 0);
});

test("blink is mostly open and fully closes mid-blink", () => {
  const samples = Array.from({ length: 400 }, (_, i) => blinkAmount(i * 0.05));
  const open = samples.filter((v) => v === 1).length;
  assert.ok(open / samples.length > 0.9);
  assert.ok(Math.min(...samples) < 0.15);
});

test("bob and mood mapping", () => {
  assert.ok(Math.abs(bob(0)) < 1e-9);
  assert.equal(moodFor("focus"), "form");
  assert.equal(moodFor("success"), "happy");
  assert.equal(moodFor("whatever"), "idle");
});
