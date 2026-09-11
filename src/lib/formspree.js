export const FORMSPREE_ENDPOINT = "https://formspree.io/f/xkjnyqgp";

export function buildPayload({ email, source, gotcha }) {
  return { email: String(email || "").trim(), source, _subject: "DEVS early access", _gotcha: gotcha ?? "" };
}

export function validateEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(str || "").trim());
}

export async function submitSignup(payload, fetchImpl = globalThis.fetch) {
  try {
    const res = await fetchImpl(FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return { ok: true };
    let msg = "Something went wrong. Try again.";
    try {
      const data = await res.json();
      msg = data?.errors?.[0]?.message || msg;
    } catch {}
    return { ok: false, error: msg };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." };
  }
}
