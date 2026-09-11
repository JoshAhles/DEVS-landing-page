import { buildPayload, validateEmail, submitSignup } from "../lib/formspree.js";
import { track } from "../lib/analytics.js";

const SUCCESS = "You're in. We'll email you once when the first labs open.";

function wire(form) {
  if (form.dataset.wired) return;
  form.dataset.wired = "1";
  const source = form.dataset.source;
  const email = form.querySelector('input[name="email"]');
  const gotcha = form.querySelector('input[name="_gotcha"]');
  const btn = form.querySelector("button[type=submit]");
  const label = btn.querySelector("[data-label]");
  const msg = form.querySelector("[data-msg]");
  const idle = msg.textContent;
  let started = false;

  const setMsg = (text, tone) => {
    msg.textContent = text;
    msg.classList.toggle("text-[var(--color-merge)]", tone === "ok");
    msg.classList.toggle("text-[var(--color-danger)]", tone === "err");
    msg.classList.toggle("copy-subtle", !tone);
  };

  const mood = (type) => document.dispatchEvent(new CustomEvent("devs:form", { detail: { type, source } }));
  email.addEventListener("focus", () => mood("focus"));
  email.addEventListener("blur", () => mood("blur"));
  email.addEventListener("input", () => {
    mood("input");
    if (!started) {
      started = true;
      track("form_start", { source });
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateEmail(email.value)) {
      setMsg("Enter a valid email address.", "err");
      email.focus();
      return;
    }
    btn.disabled = true;
    label.textContent = "Sending…";
    setMsg(idle);
    const res = await submitSignup(buildPayload({ email: email.value, source, gotcha: gotcha.value }));
    btn.disabled = false;
    if (res.ok) {
      label.textContent = "Spot saved";
      email.value = "";
      setMsg(SUCCESS, "ok");
      mood("success");
      track("generate_lead", { source });
    } else {
      label.textContent = "Save my spot";
      setMsg(res.error, "err");
      mood("error");
    }
  });
}

document.querySelectorAll("form[data-signup]").forEach(wire);
