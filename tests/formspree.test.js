import { test } from "node:test";
import assert from "node:assert/strict";
import { FORMSPREE_ENDPOINT, buildPayload, validateEmail, submitSignup } from "../src/lib/formspree.js";

test("endpoint is the Formspree form Josh provided", () => {
  assert.equal(FORMSPREE_ENDPOINT, "https://formspree.io/f/xkjnyqgp");
});

test("buildPayload trims email, carries source, subject, honeypot", () => {
  assert.deepEqual(buildPayload({ email: "  a@b.co ", source: "hero", gotcha: "" }), {
    email: "a@b.co", source: "hero", _subject: "DEVS early access", _gotcha: "",
  });
});

test("validateEmail", () => {
  assert.equal(validateEmail("josh@example.com"), true);
  assert.equal(validateEmail("nope"), false);
  assert.equal(validateEmail(""), false);
});

test("submitSignup posts JSON and returns ok on 200", async () => {
  let captured;
  const fetchImpl = async (url, init) => { captured = { url, init }; return { ok: true, json: async () => ({ ok: true }) }; };
  const res = await submitSignup(buildPayload({ email: "a@b.co", source: "footer", gotcha: "" }), fetchImpl);
  assert.deepEqual(res, { ok: true });
  assert.equal(captured.url, FORMSPREE_ENDPOINT);
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.headers["Accept"], "application/json");
  assert.equal(JSON.parse(captured.init.body).source, "footer");
});

test("submitSignup surfaces Formspree error message", async () => {
  const fetchImpl = async () => ({ ok: false, json: async () => ({ errors: [{ message: "Bad email" }] }) });
  const res = await submitSignup({ email: "x" }, fetchImpl);
  assert.deepEqual(res, { ok: false, error: "Bad email" });
});

test("submitSignup handles network failure", async () => {
  const fetchImpl = async () => { throw new Error("offline"); };
  const res = await submitSignup({ email: "x" }, fetchImpl);
  assert.equal(res.ok, false);
});
