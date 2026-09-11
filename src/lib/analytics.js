export const EEA_UK_REGIONS = [
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
  "IS","LI","NO","GB",
];

const NON_EEA_EUROPE_TZ = new Set([
  "Europe/Istanbul","Europe/Moscow","Europe/Minsk","Europe/Kiev","Europe/Kyiv","Europe/Belgrade","Europe/Sarajevo","Europe/Skopje",
  "Europe/Podgorica","Europe/Tirane","Europe/Chisinau","Europe/Zurich","Europe/Andorra","Europe/Monaco","Europe/San_Marino",
  "Europe/Vatican","Europe/Kaliningrad","Europe/Samara","Europe/Volgograd","Europe/Simferopol","Europe/Ulyanovsk","Europe/Astrakhan",
  "Europe/Saratov","Europe/Kirov",
]);

export function needsConsentPrompt(timeZone) {
  if (!timeZone || !timeZone.startsWith("Europe/")) return false;
  return !NON_EEA_EUROPE_TZ.has(timeZone);
}

const KEY = "devs.consent";
export function readConsent() { try { return localStorage.getItem(KEY); } catch { return null; } }
export function saveConsent(v) { try { localStorage.setItem(KEY, v); } catch {} }

export function track(name, params = {}) {
  const w = globalThis.window;
  if (w && typeof w.gtag === "function") w.gtag("event", name, params);
}
