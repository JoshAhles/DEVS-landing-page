// Pure helpers for the terminal mascot: eye tracking, blink schedule, mood.
export const EYE_RANGE = { x: 0.22, y: 0.14 }; // max eye offset on the screen plane
export const HEAD_RANGE = { x: 0.16, y: 0.11 }; // max head tilt in radians

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/** pointer in NDC (-1..1) → eye offset + head tilt; mood "form" looks at the form (down-left) */
export function gaze(ndcX, ndcY, mood = "idle") {
  if (mood === "form") return { eyeX: -EYE_RANGE.x * 0.75, eyeY: -EYE_RANGE.y * 0.9, tiltX: HEAD_RANGE.x * 0.55, tiltY: -HEAD_RANGE.y * 0.6 };
  const x = clamp(ndcX, -1, 1), y = clamp(ndcY, -1, 1);
  return { eyeX: x * EYE_RANGE.x, eyeY: y * EYE_RANGE.y, tiltX: -y * HEAD_RANGE.x, tiltY: x * HEAD_RANGE.y };
}

/** deterministic blink: returns eye open amount 0..1 at time t (seconds) */
export function blinkAmount(t, seed = 0) {
  const period = 3.6 + ((seed * 7919) % 5) * 0.3;
  const phase = (t + seed) % period;
  if (phase > 0.14) return 1;
  const k = phase / 0.14; // 0..1 across the blink
  return 1 - Math.sin(k * Math.PI);
}

/** idle bob offset */
export function bob(t) {
  return Math.sin(t * 1.4) * 0.06;
}

/** mood from form state events */
export function moodFor(event) {
  return { focus: "form", input: "form", blur: "idle", success: "happy", error: "idle" }[event] ?? "idle";
}
