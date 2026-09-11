# DEVS Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the begindevs.com homepage as a 7-section, amber-on-charcoal page with an inline Formspree signup, a procedural Three.js git-graph hero, GA4 conversion tracking, and stronger search/LLM discoverability.

**Architecture:** Astro static site. Pure logic (form payload/submit, analytics consent, graph model) lives in `src/lib/*.js` as dependency-free ESM so it is testable with `node --test`. Astro components consume those modules via inline `<script>` tags. The 3D scene is a dynamically imported module so hero text stays the LCP.

**Tech Stack:** Astro 5, Tailwind 4, anime.js 4, Three.js, @astrojs/partytown, @astrojs/rss, @fontsource (self-hosted fonts), Node 22 `node:test`, puppeteer-core (local Chrome) for asset rendering.

**Spec:** `docs/superpowers/specs/2026-09-10-landing-redesign-design.md`

## Global Constraints

- **Never `git commit`, push, or deploy.** Josh commits himself. No commit steps in this plan.
- Review target is `npm run dev` on `http://localhost:4321`.
- Formspree endpoint: `https://formspree.io/f/xkjnyqgp`, method POST, every input has a `name`.
- Palette tokens (exact): bg-0 `#0B0C10`, bg-1 `#12141A`, bg-2 `#1A1D25`, ink `#F2F0EA`, ink-muted `#A7A49C`, ink-subtle `#6E6B64`, accent `#FFB020`, accent-ink `#0B0C10`, merge `#3DDC84`, line `rgba(242,240,234,0.08)`.
- Green (`--merge`) only for merged/passed semantics. No glows, gradient orbs, or neon text-shadow anywhere.
- Fonts: Archivo (display + body) and IBM Plex Mono only, self-hosted.
- CTA label everywhere: **Get early access**.
- Budgets: page JS ≤ 250 KB gz, three chunk ≤ 160 KB gz, Lighthouse mobile Perf ≥ 90, LCP < 2.0 s, CLS < 0.1, A11y ≥ 95.
- `prefers-reduced-motion` respected in every animation.
- GA measurement ID comes from `PUBLIC_GA_ID`; tag omitted when unset.
- No fake social proof (testimonials, invented counts).

## File map

Create:
- `src/lib/formspree.js` — payload + submit (pure)
- `src/lib/analytics.js` — `track()`, consent region decision (pure)
- `src/lib/graph-model.js` — node/edge layout + loop phases (pure)
- `src/scripts/hero-scene.js` — Three.js renderer for the graph model
- `src/scripts/signup-form.js` — wires `SignupForm.astro` DOM to `formspree.js` + `track()`
- `src/components/SignupForm.astro`, `Gap.astro`, `HowItWorks.astro`, `WorkspaceMockup.astro`, `Skills.astro`, `FounderNote.astro`, `Faq.astro`, `FinalCta.astro`, `Footer.astro`, `ConsentToast.astro`, `Analytics.astro`
- `src/data/faq.js` — FAQ content shared by component and JSON-LD
- `src/pages/rss.xml.js`, `src/pages/og.astro`
- `public/llms.txt`, `public/images/hero-graph.png` (rendered), `public/og-image.png` (re-rendered)
- `scripts/render-assets.mjs` — puppeteer-core renders og + hero fallback
- `tests/formspree.test.js`, `tests/analytics.test.js`, `tests/graph-model.test.js`, `tests/build.test.js`

Modify: `package.json`, `astro.config.mjs`, `src/styles/global.css`, `src/layouts/Layout.astro`, `src/components/Header.astro`, `src/components/Section.astro`, `src/components/Hero.astro`, `src/pages/index.astro`, `src/scripts/animations.js`, `public/robots.txt`

Delete: `src/components/{TrustSection,ValueProps,NotVibeSection,ProcessTimeline,LabTeaserEnhanced,FeaturesGrid,WhyDEVS,PortfolioShowcase,Testimonials,PricingEnhanced,CtaSection}.astro`

---

### Task 1: Dependencies, test runner, fonts

**Files:**
- Modify: `package.json`, `astro.config.mjs`
- Create: `tests/build.test.js`

**Interfaces:**
- Produces: `npm test` (runs `node --test tests/`), `npm run build`, `npm run render-assets`.

- [ ] **Step 1: Install dependencies**

```bash
cd /Users/josh/Desktop/DEVS-landing-page
npm i three @astrojs/partytown @astrojs/rss @fontsource-variable/archivo @fontsource/ibm-plex-mono
npm i -D puppeteer-core
```

Expected: no peer errors. (Free. puppeteer-core does not download a browser.)

- [ ] **Step 2: Add scripts to package.json**

Edit the `scripts` block to:

```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "test": "node --test tests/",
  "render-assets": "node scripts/render-assets.mjs"
}
```

- [ ] **Step 3: Register integrations**

Replace `astro.config.mjs`:

```js
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import partytown from "@astrojs/partytown";

export default defineConfig({
  site: "https://begindevs.com",
  output: "static",
  integrations: [
    sitemap(),
    partytown({ config: { forward: ["dataLayer.push", "gtag"] } }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/three")) return "three";
          },
        },
      },
    },
  },
});
```

- [ ] **Step 4: Write the build smoke test (fails until later tasks)**

`tests/build.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;

test("dist exists (run `npm run build` first)", () => {
  assert.ok(existsSync(join(dist, "index.html")), "dist/index.html missing");
});

test("homepage has no leftover neon/brevo/notify markers", () => {
  const html = readFileSync(join(dist, "index.html"), "utf8");
  for (const bad of ["sibforms.com", "neon-glow", "cta-glow", "#notify", "Join early access", "Notify me"]) {
    assert.ok(!html.includes(bad), `found "${bad}"`);
  }
});

test("homepage has required conversion + discoverability markup", () => {
  const html = readFileSync(join(dist, "index.html"), "utf8");
  assert.ok(html.includes('action="https://formspree.io/f/xkjnyqgp"'));
  assert.ok((html.match(/Get early access/g) || []).length >= 3);
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
  for (const f of ["llms.txt", "robots.txt", "rss.xml", "og-image.png", "images/hero-graph.png"]) {
    assert.ok(existsSync(join(dist, f)), `${f} missing`);
  }
  const robots = readFileSync(join(dist, "robots.txt"), "utf8");
  for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) {
    assert.ok(robots.includes(`User-agent: ${bot}`), `robots missing ${bot}`);
  }
});
```

- [ ] **Step 5: Run tests, confirm they fail for the right reason**

Run: `npm test`
Expected: build tests FAIL (dist has old markup / missing files). Other test files don't exist yet.

---

### Task 2: Visual system — tokens, global.css, Section, Layout fonts, Header

**Files:**
- Modify: `src/styles/global.css` (full rewrite), `src/components/Section.astro` (rewrite), `src/layouts/Layout.astro` (head: fonts, theme-color), `src/components/Header.astro` (rewrite)

**Interfaces:**
- Produces CSS utility classes used by every later task: `.btn-primary`, `.btn-ghost`, `.eyebrow`, `.card`, `.copy-muted`, `.copy-subtle`, `.font-mono`, `.font-display`, `.section-title`, `.section-lede`, `.input`.
- `Section.astro` props: `{ id: string; class?: string; wide?: boolean }`; renders `<section id class="section"><div class="section-inner" data-animate>slot</div></section>`.

- [ ] **Step 1: Rewrite global.css**

```css
@import "tailwindcss";
@import "@fontsource-variable/archivo";
@import "@fontsource/ibm-plex-mono/400.css";
@import "@fontsource/ibm-plex-mono/500.css";

@theme {
  --color-bg-0: #0b0c10;
  --color-bg-1: #12141a;
  --color-bg-2: #1a1d25;
  --color-ink: #f2f0ea;
  --color-ink-muted: #a7a49c;
  --color-ink-subtle: #6e6b64;
  --color-accent: #ffb020;
  --color-accent-ink: #0b0c10;
  --color-merge: #3ddc84;
  --color-line: rgba(242, 240, 234, 0.08);
  --color-line-strong: rgba(242, 240, 234, 0.16);
  --font-sans: "Archivo Variable", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}

@layer base {
  * { border-color: var(--color-line); }
  :focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; }
  html { scroll-behavior: smooth; }
  @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
  body {
    font-family: var(--font-sans);
    background: var(--color-bg-0);
    color: var(--color-ink);
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  ::selection { background: var(--color-accent); color: var(--color-accent-ink); }
  h1, h2, h3 { letter-spacing: -0.02em; text-wrap: balance; }
  [id] { scroll-margin-top: 5.5rem; }
}

.font-mono { font-family: var(--font-mono); }
.font-display { font-family: var(--font-sans); font-weight: 800; }
.copy-muted { color: var(--color-ink-muted); }
.copy-subtle { color: var(--color-ink-subtle); }

.section { padding: 4rem 1.5rem; border-top: 1px solid var(--color-line); }
@media (min-width: 768px) { .section { padding: 6rem 1.5rem; } }
.section-inner { max-width: 72rem; margin: 0 auto; }
.section-title { font-weight: 800; font-size: clamp(1.75rem, 3.5vw, 2.75rem); line-height: 1.1; }
.section-lede { margin-top: 1rem; font-size: 1.125rem; color: var(--color-ink-muted); max-width: 40rem; }

.eyebrow {
  font-family: var(--font-mono); font-size: 0.75rem; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--color-accent);
}
.eyebrow::before { content: "// "; color: var(--color-ink-subtle); }

.btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 0.85rem 1.4rem; border-radius: 0.5rem;
  background: var(--color-accent); color: var(--color-accent-ink);
  font-weight: 700; font-size: 0.95rem; line-height: 1;
  transition: transform 150ms ease, background 150ms ease;
}
.btn-primary:hover { background: #ffc24d; transform: translateY(-1px); }
.btn-primary:active { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.6; cursor: wait; transform: none; }
.btn-ghost {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: 0.7rem 1.1rem; border-radius: 0.5rem;
  border: 1px solid var(--color-line-strong); color: var(--color-ink);
  font-weight: 600; font-size: 0.9rem; line-height: 1;
  transition: border-color 150ms ease, background 150ms ease;
}
.btn-ghost:hover { border-color: var(--color-accent); background: var(--color-bg-1); }

.card {
  border: 1px solid var(--color-line); border-radius: 0.75rem;
  background: var(--color-bg-1); padding: 1.5rem;
}
.input {
  width: 100%; border-radius: 0.5rem; border: 1px solid var(--color-line-strong);
  background: var(--color-bg-1); color: var(--color-ink);
  font-family: var(--font-mono); font-size: 0.95rem; padding: 0.85rem 1rem;
}
.input::placeholder { color: var(--color-ink-subtle); }
.input:focus { border-color: var(--color-accent); outline: none; }

/* scroll reveal hook used by animations.js */
[data-reveal] { opacity: 0; transform: translateY(12px); }
[data-reveal].is-in { opacity: 1; transform: none; transition: opacity 500ms ease, transform 500ms ease; }
@media (prefers-reduced-motion: reduce) { [data-reveal] { opacity: 1; transform: none; } }
```

- [ ] **Step 2: Rewrite Section.astro**

```astro
---
interface Props { id: string; class?: string; wide?: boolean }
const { id, class: cls = "", wide = false } = Astro.props;
---
<section id={id} class:list={["section", cls]}>
  <div class:list={["section-inner", wide && "max-w-[80rem]"]} data-animate>
    <slot />
  </div>
</section>
```

- [ ] **Step 3: Update Layout head**

In `src/layouts/Layout.astro`: delete the three Google Fonts `<link>` tags. Change `theme-color` to `#0B0C10`. Delete the animated-title script (the `CURSOR`/`typeSteps` IIFE) and the hue-cycling favicon script (the `canvas`/`hue` IIFE) — both burn CPU with zero conversion value. Keep the `import "../scripts/animations.js"` script. Layout is finished in Task 9 (analytics, RSS link, sameAs).

- [ ] **Step 4: Rewrite Header.astro**

```astro
---
---
<header id="site-header" class="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-bg-0)]/85 backdrop-blur">
  <div class="mx-auto flex max-w-[72rem] items-center justify-between px-6 py-3">
    <a href="/" class="flex items-center gap-3" aria-label="DEVS home">
      <img src="/images/DEVS-logo-transparent.png" alt="DEVS" width="120" height="32" class="h-8 w-auto brightness-0 invert" />
      <span class="hidden font-mono text-xs text-[var(--color-ink-subtle)] sm:inline">team simulation for developers</span>
    </a>
    <nav class="flex items-center gap-5" aria-label="Primary">
      <a href="/#how" class="hidden text-sm copy-muted hover:text-[var(--color-ink)] md:inline">How it works</a>
      <a href="/#faq" class="hidden text-sm copy-muted hover:text-[var(--color-ink)] md:inline">FAQ</a>
      <a href="/blog" class="hidden text-sm copy-muted hover:text-[var(--color-ink)] md:inline">Blog</a>
      <a href="/#hero-form" class="btn-primary !py-2.5 !px-4 text-sm" data-cta="header">Get early access</a>
    </nav>
  </div>
</header>
```

- [ ] **Step 5: Verify dev server renders with new tokens**

Run: `npm run dev` then open `http://localhost:4321`. Expected: charcoal background, Archivo text, amber header button; old sections still render (ugly but no build errors). Stop the dev server.

---

### Task 3: Formspree signup — pure lib, tests, component, DOM wiring

**Files:**
- Create: `src/lib/formspree.js`, `tests/formspree.test.js`, `src/components/SignupForm.astro`, `src/scripts/signup-form.js`

**Interfaces:**
- `formspree.js`: `FORMSPREE_ENDPOINT` (string); `buildPayload({ email, source, gotcha }) → { email, source, _subject, _gotcha }`; `validateEmail(str) → boolean`; `submitSignup(payload, fetchImpl) → Promise<{ ok: true } | { ok: false, error: string }>`.
- `SignupForm.astro` props: `{ source: "hero" | "footer"; id: string }`. Emits `form[data-signup]` with `data-source`.
- `signup-form.js` calls `track("form_start", {source})` and `track("generate_lead", {source})` from `src/lib/analytics.js` (Task 8; until then import a stub — see Step 6).

- [ ] **Step 1: Write failing tests**

`tests/formspree.test.js`:

```js
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
```

- [ ] **Step 2: Run, confirm fail**

Run: `node --test tests/formspree.test.js` → FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/formspree.js`**

```js
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
    try { const data = await res.json(); msg = data?.errors?.[0]?.message || msg; } catch {}
    return { ok: false, error: msg };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." };
  }
}
```

- [ ] **Step 4: Run, confirm pass**

Run: `node --test tests/formspree.test.js` → 6 passing.

- [ ] **Step 5: Create `SignupForm.astro`**

```astro
---
interface Props { source: "hero" | "footer"; id: string }
const { source, id } = Astro.props;
import { FORMSPREE_ENDPOINT } from "../lib/formspree.js";
---
<form id={id} data-signup data-source={source} action={FORMSPREE_ENDPOINT} method="POST" class="w-full max-w-md" novalidate>
  <label for={`${id}-email`} class="sr-only">Email address</label>
  <div class="flex flex-col gap-2 sm:flex-row">
    <input id={`${id}-email`} name="email" type="email" required autocomplete="email" inputmode="email"
      placeholder="you@example.com" class="input" aria-describedby={`${id}-msg`} />
    <input type="hidden" name="source" value={source} />
    <input type="hidden" name="_subject" value="DEVS early access" />
    <input type="text" name="_gotcha" tabindex="-1" autocomplete="off" class="hidden" aria-hidden="true" />
    <button type="submit" class="btn-primary whitespace-nowrap" data-cta={`form-${source}`}>
      <span data-label>Get early access</span>
    </button>
  </div>
  <p id={`${id}-msg`} class="mt-2 min-h-[1.25rem] font-mono text-xs copy-subtle" data-msg aria-live="polite">
    Free during early access. No spam, unsubscribe any time.
  </p>
</form>
<script>
  import "../scripts/signup-form.js";
</script>
```

- [ ] **Step 6: Create `src/scripts/signup-form.js`**

```js
import { buildPayload, validateEmail, submitSignup } from "../lib/formspree.js";
import { track } from "../lib/analytics.js";

const SUCCESS = "You're on the list. Watch your inbox.";

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
    msg.classList.toggle("text-[var(--color-accent)]", tone === "err");
    msg.classList.toggle("copy-subtle", !tone);
  };

  email.addEventListener("input", () => {
    if (!started) { started = true; track("form_start", { source }); }
  }, { once: false });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateEmail(email.value)) { setMsg("Enter a valid email address.", "err"); email.focus(); return; }
    btn.disabled = true; label.textContent = "Sending…"; setMsg(idle);
    const res = await submitSignup(buildPayload({ email: email.value, source, gotcha: gotcha.value }));
    btn.disabled = false;
    if (res.ok) {
      label.textContent = "You're in";
      email.value = "";
      setMsg(SUCCESS, "ok");
      track("generate_lead", { source });
    } else {
      label.textContent = "Get early access";
      setMsg(res.error, "err");
    }
  });
}

document.querySelectorAll("form[data-signup]").forEach(wire);
```

Until Task 8 exists, create a temporary `src/lib/analytics.js` containing only `export function track() {}` so the build passes. Task 8 replaces it.

- [ ] **Step 7: Run all tests**

Run: `npm test` → formspree tests pass; build test still fails (expected until Task 10).

---

### Task 4: Graph model (pure) with tests

**Files:**
- Create: `src/lib/graph-model.js`, `tests/graph-model.test.js`

**Interfaces:**
- `buildGraph({ mobile?: boolean }) → { nodes: Node[], edges: Edge[] }`
  - `Node = { id: string, x: number, y: number, z: number, kind: "commit"|"pr"|"review"|"merge", appearAt: number /* 0..1 */ }`
  - `Edge = { from: string, to: string, kind: "main"|"branch"|"merge" }`
- `PHASES = ["branch","commit","pr","review","merge"]`
- `phaseAt(progress) → { phase: string, local: number /* 0..1 within phase */ }`
- `loopProgress(timeMs, durationMs = 9000) → number 0..1`

Layout: main line along +x at y=0. Branch nodes at y = ±1.2 (alternating), z small jitter. Mobile halves commits per branch.

- [ ] **Step 1: Write failing tests**

`tests/graph-model.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGraph, phaseAt, loopProgress, PHASES } from "../src/lib/graph-model.js";

test("PHASES order matches the delivery loop", () => {
  assert.deepEqual(PHASES, ["branch", "commit", "pr", "review", "merge"]);
});

test("desktop graph has main line, 3 branches, pr, reviews, merge", () => {
  const g = buildGraph({});
  const kinds = g.nodes.reduce((m, n) => ((m[n.kind] = (m[n.kind] || 0) + 1), m), {});
  assert.equal(kinds.pr, 1);
  assert.equal(kinds.merge, 1);
  assert.equal(kinds.review, 3);
  assert.ok(kinds.commit >= 12);
  assert.ok(g.edges.some((e) => e.kind === "merge"));
  assert.ok(g.edges.every((e) => g.nodes.find((n) => n.id === e.from) && g.nodes.find((n) => n.id === e.to)));
});

test("mobile graph has roughly half the commits", () => {
  const d = buildGraph({}).nodes.filter((n) => n.kind === "commit").length;
  const m = buildGraph({ mobile: true }).nodes.filter((n) => n.kind === "commit").length;
  assert.ok(m <= Math.ceil(d / 2));
});

test("appearAt is monotonic along the story: commits < pr < reviews < merge", () => {
  const g = buildGraph({});
  const at = (k) => g.nodes.filter((n) => n.kind === k).map((n) => n.appearAt);
  assert.ok(Math.max(...at("commit")) < Math.min(...at("pr")));
  assert.ok(Math.max(...at("pr")) < Math.min(...at("review")));
  assert.ok(Math.max(...at("review")) < Math.min(...at("merge")));
  g.nodes.forEach((n) => assert.ok(n.appearAt >= 0 && n.appearAt <= 1));
});

test("phaseAt maps progress to phases", () => {
  assert.equal(phaseAt(0).phase, "branch");
  assert.equal(phaseAt(0.99).phase, "merge");
  assert.equal(phaseAt(0.5).phase, "pr");
  const p = phaseAt(0.1); assert.ok(p.local >= 0 && p.local <= 1);
});

test("loopProgress wraps", () => {
  assert.equal(loopProgress(0), 0);
  assert.ok(Math.abs(loopProgress(4500) - 0.5) < 1e-9);
  assert.ok(Math.abs(loopProgress(9000)) < 1e-9);
});
```

- [ ] **Step 2: Run, confirm fail**

`node --test tests/graph-model.test.js` → FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/graph-model.js`**

```js
export const PHASES = ["branch", "commit", "pr", "review", "merge"];
// phase boundaries as fractions of the loop
const BOUNDS = [0, 0.15, 0.45, 0.55, 0.8, 1];

export function phaseAt(progress) {
  const p = Math.min(Math.max(progress, 0), 0.999999);
  for (let i = 0; i < PHASES.length; i++) {
    if (p < BOUNDS[i + 1]) return { phase: PHASES[i], local: (p - BOUNDS[i]) / (BOUNDS[i + 1] - BOUNDS[i]) };
  }
  return { phase: "merge", local: 1 };
}

export function loopProgress(timeMs, durationMs = 9000) {
  return ((timeMs % durationMs) + durationMs) % durationMs / durationMs;
}

export function buildGraph({ mobile = false } = {}) {
  const nodes = [];
  const edges = [];
  const perBranch = mobile ? 2 : 4;
  const branches = 3;
  const spacing = 1.1;
  let id = 0;
  const add = (kind, x, y, z, appearAt) => { const n = { id: `n${id++}`, kind, x, y, z, appearAt }; nodes.push(n); return n; };

  // main line: one commit per branch slot plus head
  const mainNodes = [];
  for (let i = 0; i <= branches; i++) mainNodes.push(add("commit", i * spacing * (perBranch + 1), 0, 0, 0.02 * i));
  for (let i = 1; i < mainNodes.length; i++) edges.push({ from: mainNodes[i - 1].id, to: mainNodes[i].id, kind: "main" });

  // feature branches, commits appear during 0.15..0.45
  const commitWindow = [0.15, 0.44];
  const totalCommits = branches * perBranch;
  let c = 0;
  for (let b = 0; b < branches; b++) {
    const y = b % 2 === 0 ? 1.2 : -1.2;
    let prev = mainNodes[b];
    for (let k = 0; k < perBranch; k++) {
      const t = commitWindow[0] + ((commitWindow[1] - commitWindow[0]) * c) / Math.max(totalCommits - 1, 1);
      const n = add("commit", prev.x + spacing, y, ((b + k) % 3 - 1) * 0.15, t);
      edges.push({ from: prev.id, to: n.id, kind: "branch" });
      prev = n; c++;
    }
    if (b < branches - 1) edges.push({ from: prev.id, to: mainNodes[b + 1].id, kind: "merge" });
    else {
      // last branch becomes the PR under review
      const pr = add("pr", prev.x + spacing, y, 0, 0.5);
      edges.push({ from: prev.id, to: pr.id, kind: "branch" });
      const reviews = [0.6, 0.68, 0.76];
      reviews.forEach((t, i) => {
        const r = add("review", pr.x + 0.5 + i * 0.35, y + (y > 0 ? 0.8 : -0.8), (i - 1) * 0.3, t);
        edges.push({ from: pr.id, to: r.id, kind: "branch" });
      });
      const merge = add("merge", mainNodes[mainNodes.length - 1].x + spacing, 0, 0, 0.9);
      edges.push({ from: pr.id, to: merge.id, kind: "merge" });
      edges.push({ from: mainNodes[mainNodes.length - 1].id, to: merge.id, kind: "main" });
    }
  }
  return { nodes, edges };
}
```

- [ ] **Step 4: Run, confirm pass**

`node --test tests/graph-model.test.js` → 6 passing. If the review count or window math fails, fix the model, not the test.

---

### Task 5: Hero + Three.js scene

**Files:**
- Create: `src/scripts/hero-scene.js`
- Modify: `src/components/Hero.astro` (full rewrite)

**Interfaces:**
- `hero-scene.js` default export `mountHeroScene(container: HTMLElement): { destroy(): void }`. Reads `[data-hero-scroll]` progress via IntersectionObserver + scroll; falls back to time loop.
- Hero markup: `#hero`, `#hero-form` (SignupForm id), `[data-hero-scene]` container containing `<img data-hero-fallback>`.

- [ ] **Step 1: Rewrite Hero.astro**

```astro
---
import SignupForm from "./SignupForm.astro";
---
<section id="hero" class="relative overflow-hidden px-6 pb-16 pt-16 md:pt-24">
  <div class="mx-auto grid max-w-[72rem] items-center gap-12 lg:grid-cols-12">
    <div class="lg:col-span-6" data-hero-content>
      <p class="eyebrow">early access · free</p>
      <h1 class="font-display mt-5 text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
        You can write code.<br />Now ship it <span class="text-[var(--color-accent)]">with a team.</span>
      </h1>
      <p class="mt-6 max-w-xl text-lg copy-muted">
        DEVS is a simulated engineering team. You pick up tickets, open pull requests, get real code review, and ship inside a sprint — before your first job asks you to.
      </p>
      <div class="mt-8">
        <SignupForm source="hero" id="hero-form" />
      </div>
      <ul class="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs copy-subtle">
        <li>git + PRs</li><li>code review</li><li>sprints</li><li>AI, used properly</li>
      </ul>
    </div>
    <div class="lg:col-span-6">
      <div class="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-bg-1)]" data-hero-scene aria-hidden="true">
        <img data-hero-fallback src="/images/hero-graph.png" alt="" width="1200" height="900"
          class="absolute inset-0 h-full w-full object-cover" loading="eager" decoding="async" />
        <div class="absolute bottom-3 left-3 font-mono text-[0.65rem] copy-subtle" data-hero-phase>branch</div>
      </div>
    </div>
  </div>
</section>

<script>
  const container = document.querySelector("[data-hero-scene]");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasWebGL = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } })();
  if (container && !reduced && hasWebGL) {
    const start = () => import("../scripts/hero-scene.js").then((m) => m.default(container)).catch(() => {});
    if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 2000 });
    else window.addEventListener("load", () => setTimeout(start, 200), { once: true });
  }
</script>
```

- [ ] **Step 2: Create `src/scripts/hero-scene.js`**

```js
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, SphereGeometry, MeshStandardMaterial,
  InstancedMesh, Object3D, Color, TubeGeometry, CatmullRomCurve3, Vector3, Mesh,
  AmbientLight, DirectionalLight,
} from "three";
import { buildGraph, phaseAt, loopProgress } from "../lib/graph-model.js";

const COLORS = { commit: 0xa7a49c, pr: 0xf2f0ea, review: 0xffb020, merge: 0x3ddc84, line: 0x3a3d47 };

export default function mountHeroScene(container) {
  const mobile = window.innerWidth < 768;
  const graph = buildGraph({ mobile });
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity 600ms ease";
  container.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 100);
  const root = new Group();
  scene.add(root);
  scene.add(new AmbientLight(0xffffff, 0.6));
  const key = new DirectionalLight(0xffffff, 1.2); key.position.set(3, 4, 6); scene.add(key);

  // center graph
  const xs = graph.nodes.map((n) => n.x);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  root.position.x = -cx;

  // nodes: one InstancedMesh per kind so color is static per mesh
  const byKind = {};
  const nodeMeshes = {};
  const dummy = new Object3D();
  for (const n of graph.nodes) (byKind[n.kind] ||= []).push(n);
  for (const [kind, list] of Object.entries(byKind)) {
    const r = kind === "commit" ? 0.11 : kind === "review" ? 0.13 : 0.18;
    const mesh = new InstancedMesh(new SphereGeometry(r, 16, 16), new MeshStandardMaterial({ color: new Color(COLORS[kind]), roughness: 0.4, metalness: 0.1 }), list.length);
    list.forEach((n, i) => { dummy.position.set(n.x, n.y, n.z); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
    root.add(mesh); nodeMeshes[kind] = { mesh, list };
  }

  // edges: tubes, revealed by scaling along their length isn't cheap; use opacity per edge material
  const nodeById = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));
  const edgeMeshes = graph.edges.map((e) => {
    const a = nodeById[e.from], b = nodeById[e.to];
    const mid = new Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    const curve = new CatmullRomCurve3([new Vector3(a.x, a.y, a.z), mid, new Vector3(b.x, b.y, b.z)]);
    const color = e.kind === "merge" ? COLORS.merge : COLORS.line;
    const mat = new MeshStandardMaterial({ color, transparent: true, opacity: 0, roughness: 0.6 });
    const m = new Mesh(new TubeGeometry(curve, 12, 0.025, 6, false), mat);
    root.add(m);
    return { mesh: m, appearAt: Math.max(a.appearAt, b.appearAt) };
  });

  // sizing
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, 0.4, mobile ? 11 : 9);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(container);

  // progress: scroll-in-hero blends with time loop
  let scrollBias = 0;
  const onScroll = () => {
    const r = container.getBoundingClientRect();
    scrollBias = Math.min(Math.max(-r.top / (window.innerHeight || 1), 0), 1) * 0.25;
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  // pointer parallax (desktop)
  let tx = 0, ty = 0;
  const onMove = (e) => {
    const r = container.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 0.14;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 0.14;
  };
  if (!mobile) container.addEventListener("pointermove", onMove);

  const phaseEl = container.querySelector("[data-hero-phase]");
  const fallback = container.querySelector("[data-hero-fallback]");
  let running = false, raf = 0, t0 = performance.now(), lastPhase = "";

  const frame = (now) => {
    if (!running) return;
    const progress = loopProgress(now - t0 + scrollBias * 9000);
    const { phase } = phaseAt(progress);
    if (phase !== lastPhase && phaseEl) { phaseEl.textContent = phase === "pr" ? "open PR" : phase; lastPhase = phase; }
    for (const { mesh, list } of Object.values(nodeMeshes)) {
      list.forEach((n, i) => {
        const s = Math.min(Math.max((progress - n.appearAt) / 0.05, 0), 1);
        dummy.position.set(n.x, n.y, n.z); dummy.scale.setScalar(0.0001 + s); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    for (const e of edgeMeshes) e.mesh.material.opacity = Math.min(Math.max((progress - e.appearAt) / 0.05, 0), 1) * 0.9;
    root.rotation.y += (tx - root.rotation.y) * 0.05;
    root.rotation.x += (ty - root.rotation.x) * 0.05;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  const start = () => { if (running) return; running = true; raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  const io = new IntersectionObserver((entries) => (entries[0].isIntersecting && !document.hidden ? start() : stop()), { threshold: 0.05 });
  io.observe(container);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVis);

  renderer.render(scene, camera);
  requestAnimationFrame(() => { canvas.style.opacity = "1"; if (fallback) fallback.style.opacity = "0"; });
  start();

  return {
    destroy() {
      stop(); io.disconnect(); ro.disconnect();
      window.removeEventListener("scroll", onScroll); container.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
      renderer.dispose(); canvas.remove();
    },
  };
}
```

- [ ] **Step 3: Temporary fallback image**

Until Task 9 renders the real one, create a 1×1 placeholder so the build doesn't 404: `mkdir -p public/images && printf '\x89PNG\r\n\x1a\n' > public/images/hero-graph.png` is not a valid PNG; instead copy the existing OG as a stand-in: `cp public/og-image.png public/images/hero-graph.png`.

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`. Open `http://localhost:4321`. Expected: hero text + amber form on left, graph animating on right; nodes appear in order commit → PR → amber reviews → green merge, looping ~9s; slight tilt on mouse move. Check DevTools Performance: idle frame < 4ms on M-series Mac. Check the `three` chunk is a separate request and loads after first paint (Network tab). Toggle "Emulate prefers-reduced-motion" in Rendering panel and reload: static image, no canvas.

---

### Task 6: Content sections — Gap, HowItWorks + WorkspaceMockup, Skills, FounderNote

**Files:**
- Create: `src/components/Gap.astro`, `HowItWorks.astro`, `WorkspaceMockup.astro`, `Skills.astro`, `FounderNote.astro`

**Interfaces:** each exports no props; each root element carries `data-reveal` on child cards for `animations.js`.

- [ ] **Step 1: Gap.astro**

```astro
---
const gaps = [
  { title: "Reading a codebase you didn't write", body: "Tutorials start from an empty file. Jobs start from 40,000 lines someone else wrote. You need reps finding your way around, not more syntax." },
  { title: "Getting a PR through review", body: "Opening the pull request is the easy part. Responding to feedback, defending a decision, and revising without ego is what teams actually evaluate." },
  { title: "Working a sprint with other people", body: "Estimates, blockers, standups, scope creep. The rhythm of shipping with a team is learned by doing it, and nobody practices it before day one." },
];
---
<p class="eyebrow">the gap</p>
<h2 class="section-title mt-4">You can code. Teams need more than code.</h2>
<p class="section-lede">Bootcamps and degrees teach you to build alone. DEVS gives you the reps in the parts of the job that happen between people.</p>
<div class="mt-12 grid gap-4 md:grid-cols-3">
  {gaps.map((g, i) => (
    <article class="card" data-reveal style={`--i:${i}`}>
      <span class="font-mono text-xs copy-subtle">0{i + 1}</span>
      <h3 class="mt-3 text-lg font-bold">{g.title}</h3>
      <p class="mt-2 text-sm copy-muted">{g.body}</p>
    </article>
  ))}
</div>
<p class="mt-10 max-w-2xl text-sm copy-muted">
  On AI: the industry builds with it, so does DEVS. Use whatever makes you faster. The skill is reviewing what it produces and owning every line you ship.
</p>
```

- [ ] **Step 2: WorkspaceMockup.astro**

Move the `<div class="hero-mockup-frame …">` block (window chrome, task / terminal / PR review panels, status bar) from the old `Hero.astro` (git history: `git show HEAD:src/components/Hero.astro`) into this component verbatim, then recolor: replace `text-[var(--color-accent-2)]` with `text-[var(--color-merge)]`, `bg-[var(--color-surface-0)]`→`bg-[var(--color-bg-0)]`, `bg-[var(--color-surface-1)]`→`bg-[var(--color-bg-1)]`, `bg-[var(--color-surface-2)]`→`bg-[var(--color-bg-2)]`, `border-[var(--color-border-subtle)]`/`border-[var(--color-border)]`→`border-[var(--color-line)]`, `text-white`→`text-[var(--color-ink)]`, `text-emerald-400`→`text-[var(--color-merge)]`, `text-amber-400`→`text-[var(--color-accent)]`. Drop the `hero-mockup-glow` div and the `<style>` block's glow. Replace the terminal PR link text `begindevs.com/pr/47` with `devs/pr/47`.

- [ ] **Step 3: HowItWorks.astro**

```astro
---
import WorkspaceMockup from "./WorkspaceMockup.astro";
const steps = [
  { k: "plan", t: "Pick up a ticket", d: "A real task with acceptance criteria, in a codebase that already exists." },
  { k: "branch", t: "Branch and build", d: "Work the way teams do: small commits, tests, a branch with a name that means something." },
  { k: "pr", t: "Open the pull request", d: "Write the description a reviewer actually needs. Link the ticket. Ask for review." },
  { k: "review", t: "Respond to review", d: "Simulated teammates push back on edge cases and naming. You revise and reply." },
  { k: "merge", t: "Merge and retro", d: "Ship it, then look at what slowed you down. Next ticket is harder." },
];
---
<p class="eyebrow">how it works</p>
<h2 class="section-title mt-4">One delivery loop, repeated until it's reflex.</h2>
<p class="section-lede">Every lab runs the same cycle a real team runs. The tickets get harder; the loop stays the same.</p>
<ol class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
  {steps.map((s, i) => (
    <li class="card" data-reveal>
      <span class:list={["font-mono text-xs", s.k === "merge" ? "text-[var(--color-merge)]" : s.k === "review" ? "text-[var(--color-accent)]" : "copy-subtle"]}>{s.k}</span>
      <h3 class="mt-3 font-bold">{s.t}</h3>
      <p class="mt-2 text-sm copy-muted">{s.d}</p>
    </li>
  ))}
</ol>
<div class="mt-14" data-reveal>
  <WorkspaceMockup />
  <p class="mt-3 text-center font-mono text-xs copy-subtle">Concept of the DEVS workspace. Early access shapes what ships.</p>
</div>
```

- [ ] **Step 4: Skills.astro**

```astro
---
const skills = [
  ["Git and pull requests", "Branching, rebasing, writing PRs people want to review."],
  ["Code review", "Giving and receiving feedback that improves the code, not the mood."],
  ["Sprint execution", "Estimating, flagging blockers early, finishing what you start."],
  ["Testing and debugging", "Proving a fix works before you ask anyone to look at it."],
  ["Working in existing code", "Reading, tracing, and changing systems you didn't build."],
  ["AI-assisted development", "Using AI to move faster while staying accountable for every line."],
];
---
<p class="eyebrow">what you practice</p>
<h2 class="section-title mt-4">The skills hiring managers check for and no course teaches.</h2>
<ul class="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
  {skills.map(([t, d]) => (
    <li class="border-l border-[var(--color-line-strong)] pl-5" data-reveal>
      <h3 class="font-bold">{t}</h3>
      <p class="mt-1 text-sm copy-muted">{d}</p>
    </li>
  ))}
</ul>
```

- [ ] **Step 5: FounderNote.astro**

```astro
---
---
<div class="grid gap-10 md:grid-cols-12 md:items-start">
  <div class="md:col-span-4">
    <p class="eyebrow">why devs</p>
    <h2 class="section-title mt-4">What I wish someone had taught me before my first dev job.</h2>
  </div>
  <div class="md:col-span-8" data-reveal>
    <p class="text-lg copy-muted">
      I have a CS degree and eight years in software companies: five in support, sitting between customers and engineering, and the last three as a developer. My degree taught me algorithms. It didn't teach me how to open a pull request, respond to review, communicate a blocker, or ship inside a sprint. I learned that under pressure, slower than I needed to.
    </p>
    <p class="mt-4 text-lg copy-muted">That gap shouldn't require a first job to close. DEVS simulates the environment so you show up already knowing the loop.</p>
    <div class="mt-8 flex items-center gap-4">
      <img src="/images/josh-ahles.jpeg" alt="Josh Ahles" width="56" height="56" loading="lazy" class="h-14 w-14 rounded-full object-cover" />
      <div>
        <p class="font-bold">Josh Ahles</p>
        <p class="font-mono text-xs copy-subtle">
          <a href="https://github.com/JoshAhles" rel="me noopener" target="_blank" class="hover:text-[var(--color-ink)]">GitHub</a> ·
          <a href="https://www.linkedin.com/in/joshahles/" rel="me noopener" target="_blank" class="hover:text-[var(--color-ink)]">LinkedIn</a> ·
          <a href="https://joshahles.com/" rel="me noopener" target="_blank" class="hover:text-[var(--color-ink)]">Portfolio</a>
        </p>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 6: Build check**

Run: `npm run build`. Expected: succeeds (components unused until Task 8's index assembly is fine; Astro doesn't fail on unused components).

---

### Task 7: FAQ data + component + FinalCta + Footer + ConsentToast shell

**Files:**
- Create: `src/data/faq.js`, `src/components/Faq.astro`, `src/components/FinalCta.astro`, `src/components/Footer.astro`

**Interfaces:**
- `faq.js` exports `FAQ: { q: string; a: string }[]` (used by `Faq.astro` and `Layout.astro` JSON-LD in Task 9).

- [ ] **Step 1: `src/data/faq.js`**

```js
export const FAQ = [
  { q: "Do I need to know how to code already?", a: "Yes. DEVS is for people who can build things but haven't worked on a software team yet: bootcamp grads, self-taught developers, CS students, and people in their first role. It is not a learn-to-code course." },
  { q: "Is this a course?", a: "No. There are no video lectures. You work tickets inside a simulated engineering team: a codebase, a sprint board, pull requests, and reviewers who push back. You learn the loop by running it." },
  { q: "What does early access include?", a: "Founding members get in first, run the earliest labs, and shape what gets built. You'll get a short email when there is something to try, and nothing else." },
  { q: "Will it cost money?", a: "Early access is free. When a paid Pro tier launches, founding members lock in half price for life. Your email is the only thing we ask for now." },
  { q: "How is this different from vibe coding with AI?", a: "DEVS expects you to use AI. What it trains is everything around it: understanding what the AI produced, reviewing it critically, defending it to a reviewer, and owning it when it ships." },
];
```

- [ ] **Step 2: `Faq.astro`**

```astro
---
import { FAQ } from "../data/faq.js";
---
<div class="grid gap-10 md:grid-cols-12">
  <div class="md:col-span-4">
    <p class="eyebrow">faq</p>
    <h2 class="section-title mt-4">Questions, answered.</h2>
  </div>
  <div class="md:col-span-8 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
    {FAQ.map((f) => (
      <details class="group py-5" data-reveal>
        <summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
          {f.q}
          <span class="font-mono text-[var(--color-accent)] transition-transform group-open:rotate-45" aria-hidden="true">+</span>
        </summary>
        <p class="mt-3 max-w-2xl copy-muted">{f.a}</p>
      </details>
    ))}
  </div>
</div>
```

- [ ] **Step 3: `FinalCta.astro`**

```astro
---
import SignupForm from "./SignupForm.astro";
---
<div class="mx-auto max-w-2xl text-center">
  <p class="eyebrow">next step</p>
  <h2 class="section-title mt-4">Stop practicing alone.</h2>
  <p class="section-lede mx-auto">Get in before the first labs open. Founding members shape the product and lock in half price when Pro launches.</p>
  <div class="mt-8 flex justify-center">
    <SignupForm source="footer" id="footer-form" />
  </div>
</div>
```

- [ ] **Step 4: `Footer.astro`**

```astro
---
const year = new Date().getFullYear();
---
<footer class="border-t border-[var(--color-line)] px-6 py-10">
  <div class="mx-auto flex max-w-[72rem] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <p class="font-mono text-xs copy-subtle">© {year} DEVS · The team simulation for developers who can code but haven't shipped with a team yet.</p>
    <nav class="flex gap-5 font-mono text-xs copy-subtle" aria-label="Footer">
      <a href="/blog" class="hover:text-[var(--color-ink)]">Blog</a>
      <a href="/rss.xml" class="hover:text-[var(--color-ink)]">RSS</a>
      <a href="/privacy" class="hover:text-[var(--color-ink)]">Privacy</a>
      <a href="/terms" class="hover:text-[var(--color-ink)]">Terms</a>
      <a href="https://github.com/JoshAhles" rel="noopener" target="_blank" class="hover:text-[var(--color-ink)]">GitHub</a>
    </nav>
  </div>
</footer>
```

---

### Task 8: Assemble index.astro, delete old components, trim animations.js

**Files:**
- Modify: `src/pages/index.astro`, `src/scripts/animations.js`
- Delete: the 11 old components listed in the file map

- [ ] **Step 1: index.astro**

```astro
---
import Layout from "../layouts/Layout.astro";
import Hero from "../components/Hero.astro";
import Section from "../components/Section.astro";
import Gap from "../components/Gap.astro";
import HowItWorks from "../components/HowItWorks.astro";
import Skills from "../components/Skills.astro";
import FounderNote from "../components/FounderNote.astro";
import Faq from "../components/Faq.astro";
import FinalCta from "../components/FinalCta.astro";
import Footer from "../components/Footer.astro";
---
<Layout title="DEVS — Practice Pull Requests, Code Review, and Sprints on a Simulated Team">
  <main id="main">
    <Hero />
    <Section id="gap"><Gap /></Section>
    <Section id="how" wide><HowItWorks /></Section>
    <Section id="skills"><Skills /></Section>
    <Section id="why"><FounderNote /></Section>
    <Section id="faq"><Faq /></Section>
    <Section id="join"><FinalCta /></Section>
  </main>
  <Footer />
</Layout>
```

- [ ] **Step 2: Delete old components**

```bash
cd /Users/josh/Desktop/DEVS-landing-page/src/components
rm TrustSection.astro ValueProps.astro NotVibeSection.astro ProcessTimeline.astro LabTeaserEnhanced.astro FeaturesGrid.astro WhyDEVS.astro PortfolioShowcase.astro Testimonials.astro PricingEnhanced.astro CtaSection.astro
```

- [ ] **Step 3: Replace animations.js**

```js
import { animate, stagger } from "animejs";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function heroEntrance() {
  const block = document.querySelector("[data-hero-content]");
  if (!block || REDUCED) return;
  const items = block.children;
  animate(items, { opacity: [0, 1], translateY: [14, 0], delay: stagger(70), duration: 550, ease: "outCubic" });
}

function scrollReveals() {
  const els = document.querySelectorAll("[data-reveal]");
  if (REDUCED) { els.forEach((el) => el.classList.add("is-in")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      const siblings = [...el.parentElement.querySelectorAll(":scope > [data-reveal]")];
      const i = Math.max(siblings.indexOf(el), 0);
      setTimeout(() => el.classList.add("is-in"), i * 70);
      io.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  els.forEach((el) => io.observe(el));
}

function ctaClicks() {
  document.querySelectorAll("[data-cta]").forEach((el) => {
    el.addEventListener("click", () => {
      import("../lib/analytics.js").then(({ track }) => track("cta_click", { location: el.dataset.cta }));
    });
  });
}

heroEntrance();
scrollReveals();
ctaClicks();
```

Note: `data-cta` on header button = `header`; on form submit buttons = `form-hero` / `form-footer` (set in Task 3).

- [ ] **Step 4: Build and review**

Run: `npm run build && npm run dev`. Expected: seven sections in order, no console errors, reveals stagger in on scroll. Grep check: `grep -c "Get early access" dist/index.html` ≥ 3. Old CSS class leftovers: `grep -o "surface-card\|neon-glow\|color-surface" dist/index.html | sort -u` → empty.

---

### Task 9: Analytics (GA4 + Partytown + Consent Mode v2) and discoverability

**Files:**
- Create: `src/lib/analytics.js` (replace stub), `tests/analytics.test.js`, `src/components/Analytics.astro`, `src/components/ConsentToast.astro`, `src/pages/rss.xml.js`, `public/llms.txt`
- Modify: `src/layouts/Layout.astro`, `public/robots.txt`

**Interfaces:**
- `analytics.js`: `track(name, params)`; `EEA_UK_REGIONS` (ISO codes array); `needsConsentPrompt(timeZone: string) → boolean`; `readConsent() → "granted"|"denied"|null`; `saveConsent(value)`.
- Env: `PUBLIC_GA_ID` (e.g. `G-XXXXXXX`). Create `.env.example` with `PUBLIC_GA_ID=` and confirm `.env` is gitignored.

- [ ] **Step 1: Failing tests**

`tests/analytics.test.js`:

```js
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
```

- [ ] **Step 2: Run, confirm fail** — `node --test tests/analytics.test.js` (stub lacks exports).

- [ ] **Step 3: Implement `src/lib/analytics.js`**

```js
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
```

- [ ] **Step 4: Run, confirm pass** — `node --test tests/analytics.test.js` → 3 passing.

- [ ] **Step 5: `Analytics.astro`**

```astro
---
import { EEA_UK_REGIONS } from "../lib/analytics.js";
const id = import.meta.env.PUBLIC_GA_ID;
const regions = JSON.stringify(EEA_UK_REGIONS);
---
{id && (
  <>
    <script type="text/partytown" src={`https://www.googletagmanager.com/gtag/js?id=${id}`}></script>
    <script type="text/partytown" set:html={`
      window.dataLayer = window.dataLayer || [];
      function gtag(){ dataLayer.push(arguments); }
      gtag('consent','default',{ analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied', region:${regions}, wait_for_update: 500 });
      gtag('consent','default',{ analytics_storage:'granted', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied' });
      var stored = null; try { stored = localStorage.getItem('devs.consent'); } catch(e){}
      if (stored) gtag('consent','update',{ analytics_storage: stored });
      gtag('js', new Date());
      gtag('config','${id}',{ anonymize_ip:true });
    `} />
  </>
)}
```

- [ ] **Step 6: `ConsentToast.astro`**

```astro
---
---
<div id="consent-toast" hidden class="fixed bottom-4 left-4 z-50 max-w-sm rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-bg-1)] p-4 text-sm shadow-xl" role="dialog" aria-label="Analytics consent">
  <p class="copy-muted">We use anonymous analytics to see which parts of this page work. Okay with you?</p>
  <div class="mt-3 flex gap-2">
    <button class="btn-primary !py-2 !px-3 text-xs" data-consent="granted">Allow</button>
    <button class="btn-ghost !py-2 !px-3 text-xs" data-consent="denied">No thanks</button>
  </div>
</div>
<script>
  import { needsConsentPrompt, readConsent, saveConsent } from "../lib/analytics.js";
  const el = document.getElementById("consent-toast");
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (el && !readConsent() && needsConsentPrompt(tz)) {
    el.hidden = false;
    el.querySelectorAll("[data-consent]").forEach((b) => b.addEventListener("click", () => {
      const v = b.dataset.consent;
      saveConsent(v);
      if (typeof window.gtag === "function") window.gtag("consent", "update", { analytics_storage: v });
      el.hidden = true;
    }));
  }
</script>
```

- [ ] **Step 7: Layout.astro finish**

In `<head>`: add `<Analytics />` (import from `../components/Analytics.astro`), add `<link rel="alternate" type="application/rss+xml" title="DEVS blog" href="/rss.xml" />`. Change Organization `sameAs` to `["https://github.com/JoshAhles", "https://www.linkedin.com/in/joshahles/", "https://x.com/begindevs"]`. Add FAQ JSON-LD on the homepage only:

```astro
---
import { FAQ } from "../data/faq.js";
const faqJsonLd = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
---
{isHomePage && <script type="application/ld+json" set:html={faqJsonLd} />}
```

Update the default `description` prop to: "DEVS is a simulated engineering team where developers practice pull requests, code review, and sprints before their first job. Free during early access." In `<body>` add `<ConsentToast />` before the closing tag. Fix the skip-link classes: `focus:bg-[var(--color-accent)] focus:text-[var(--color-accent-ink)]`.

- [ ] **Step 8: RSS `src/pages/rss.xml.js`**

```js
import rss from "@astrojs/rss";

const posts = [
  { slug: "ai-use-during-learning", title: "Should You Use AI While Learning to Code? A Practical Guide", pubDate: new Date("2026-04-20"), description: "When AI helps you learn and when it replaces the learning." },
  { slug: "what-college-misses-in-developer-education", title: "What College Doesn't Teach About Software Engineering", pubDate: new Date("2026-04-27"), description: "The team skills a CS degree leaves out." },
  { slug: "first-code-review-guide", title: "How to Prepare for Your First Code Review", pubDate: new Date("2026-05-01"), description: "What reviewers look for and how to respond." },
];

export function GET(context) {
  return rss({
    title: "DEVS blog",
    description: "Practical writing on becoming team-ready as a developer.",
    site: context.site,
    items: posts.map((p) => ({ ...p, link: `/blog/${p.slug}/` })),
  });
}
```

Verify dates against the `published` prop in each `src/pages/blog/*.astro` and use those values.

- [ ] **Step 9: `public/robots.txt`**

```
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://begindevs.com/sitemap-index.xml
```

- [ ] **Step 10: `public/llms.txt`**

```
# DEVS (begindevs.com)

> DEVS is a simulated engineering team where developers who can already code practice pull requests, code review, and sprint work before their first job. Free during early access; join the list at https://begindevs.com/#hero-form.

## Who it's for
Bootcamp graduates, self-taught developers, CS students, and developers in their first role who have built projects alone but never shipped on a team.

## What you practice
Git and pull requests, code review, sprint execution, testing and debugging, working in existing codebases, AI-assisted development with accountability.

## Pages
- https://begindevs.com/ : landing page and early-access signup
- https://begindevs.com/blog : articles
- https://begindevs.com/blog/first-code-review-guide : How to Prepare for Your First Code Review
- https://begindevs.com/blog/what-college-misses-in-developer-education : What College Doesn't Teach About Software Engineering
- https://begindevs.com/blog/ai-use-during-learning : Should You Use AI While Learning to Code?
- https://begindevs.com/rss.xml : RSS feed

## Founder
Josh Ahles — https://github.com/JoshAhles
```

- [ ] **Step 11: Build and verify**

Run: `PUBLIC_GA_ID=G-TEST npm run build`. Expected: `dist/index.html` contains `googletagmanager.com/gtag/js?id=G-TEST` inside a `type="text/partytown"` script, `~partytown` dir exists in dist, `dist/rss.xml` exists, FAQPage JSON-LD present. Run `npm run build` without the env var and confirm the gtag script is absent.

---

### Task 10: Rendered assets (OG image + hero fallback) and final verification

**Files:**
- Create: `src/pages/og.astro`, `scripts/render-assets.mjs`
- Produce: `public/og-image.png`, `public/images/hero-graph.png`

- [ ] **Step 1: `src/pages/og.astro`** (1200×630 static card; not linked from nav, excluded from sitemap)

```astro
---
import "../styles/global.css";
---
<html lang="en"><head><meta charset="utf-8" /><title>og</title></head>
<body style="margin:0;background:#0B0C10;color:#F2F0EA;width:1200px;height:630px;overflow:hidden">
  <div style="padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between;height:100%;box-sizing:border-box">
    <p class="eyebrow" style="font-size:20px">early access · free</p>
    <div>
      <h1 style="font-family:'Archivo Variable',sans-serif;font-weight:800;font-size:84px;line-height:1.02;margin:0;letter-spacing:-0.02em">You can write code.<br />Now ship it <span style="color:#FFB020">with a team.</span></h1>
      <p style="font-size:30px;color:#A7A49C;margin:28px 0 0;max-width:900px">Practice pull requests, code review, and sprints on a simulated engineering team.</p>
    </div>
    <p style="font-family:'IBM Plex Mono',monospace;font-size:22px;color:#6E6B64;margin:0">begindevs.com</p>
  </div>
</body></html>
```

Add to `astro.config.mjs` sitemap: `sitemap({ filter: (page) => !page.includes("/og") })`.

- [ ] **Step 2: `scripts/render-assets.mjs`**

```js
import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:4321";

const dev = spawn("npx", ["astro", "dev", "--port", "4321"], { stdio: "ignore" });
try {
  for (let i = 0; i < 40; i++) { try { await fetch(BASE); break; } catch { await sleep(500); } }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--use-gl=angle", "--enable-webgl"] });
  const page = await browser.newPage();

  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/og`, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "public/og-image.png", clip: { x: 0, y: 0, width: 1200, height: 630 } });

  await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await sleep(6500); // reach the review phase of the 9s loop
  const el = await page.$("[data-hero-scene]");
  await el.screenshot({ path: "public/images/hero-graph.png" });
  await browser.close();
  console.log("rendered public/og-image.png and public/images/hero-graph.png");
} finally {
  dev.kill();
}
```

Run: `npm run render-assets`. Expected: both PNGs written; open them and confirm the OG card and a graph frame with amber review nodes. Keep `hero-graph.png` under 150 KB (`sips -Z 1200 public/images/hero-graph.png` if larger).

- [ ] **Step 3: Full test run**

Run: `npm run build && npm test`. Expected: all tests in `tests/` pass, including budgets. If `three` exceeds 160 KB gz, verify only named imports are used in `hero-scene.js` (no `import * as THREE`).

- [ ] **Step 4: Lighthouse (local Chrome, free)**

```bash
npm run preview &  # port 4321
npx lighthouse http://localhost:4321 --preset=perf --form-factor=mobile --screenEmulation.mobile --chrome-flags="--headless=new" --output=json --output-path=/private/tmp/claude-501/-Users-josh/386d072a-2a25-49d0-ad39-2dd42df95dd4/scratchpad/lh.json --quiet
node -e 'const r=require("/private/tmp/claude-501/-Users-josh/386d072a-2a25-49d0-ad39-2dd42df95dd4/scratchpad/lh.json");const a=r.audits;console.log({perf:r.categories.performance.score,lcp:a["largest-contentful-paint"].displayValue,cls:a["cumulative-layout-shift"].displayValue})'
npx lighthouse http://localhost:4321 --only-categories=accessibility --chrome-flags="--headless=new" --output=json --output-path=/private/tmp/claude-501/-Users-josh/386d072a-2a25-49d0-ad39-2dd42df95dd4/scratchpad/lh-a11y.json --quiet
```

Expected: perf ≥ 0.90, LCP < 2.0 s, CLS < 0.1, a11y ≥ 0.95. If LCP is the fallback image, lower its weight or mark hero `<h1>` larger; the text should be LCP.

- [ ] **Step 5: Real Formspree submissions**

With `npm run dev` running, in Chrome submit `hero-form` with Josh's email and then `footer-form`. Expected: inline "You're on the list. Watch your inbox." on each; Formspree emails arrive with `source: hero` and `source: footer`. Note: the first submission to a new Formspree form may require Josh to confirm the form via the email Formspree sends. Report that if it happens.

- [ ] **Step 6: Fallback checks in DevTools**

Rendering panel → emulate `prefers-reduced-motion: reduce` → reload: no `<canvas>`, static PNG shows, section reveals are visible immediately. Console → `WebGLRenderingContext = undefined` is not reliable; instead block `three.*.js` in Network request blocking and reload: PNG stays visible, no uncaught errors.

- [ ] **Step 7: Hand-off**

Leave `npm run dev` running on `http://localhost:4321` and report: what changed, test results, Lighthouse numbers, form results, and the open item (Josh supplies `PUBLIC_GA_ID` in `.env` and, optionally, a Search Console verification token).
