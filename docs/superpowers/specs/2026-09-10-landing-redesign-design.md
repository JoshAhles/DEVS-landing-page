# DEVS landing page redesign — design spec

Date: 2026-09-10
Repo: ~/Desktop/DEVS-landing-page (Astro 5 static, Tailwind 4, anime.js 4, GitHub Pages)
Status: approved by Josh in chat 2026-09-10

## Goal

Increase early-access email signups on begindevs.com and improve organic
discoverability, with no product behind the page yet. Review happens on a
local dev server only; no push or deploy as part of this work.

Single conversion: email submitted to Formspree (`https://formspree.io/f/xkjnyqgp`).

## Visual system

- Palette (dark, non-neon):
  - `--bg-0` #0B0C10 (page), `--bg-1` #12141A (surface), `--bg-2` #1A1D25 (raised)
  - `--ink` #F2F0EA (text), `--ink-muted` #A7A49C, `--ink-subtle` #6E6B64
  - `--accent` #FFB020 amber (CTAs, review nodes, eyebrows), `--accent-ink` #0B0C10 (text on amber)
  - `--merge` #3DDC84 green, used only for merged/passed semantics
  - `--line` rgba(242,240,234,0.08) borders
  - No glows, no blurred gradient orbs, no neon text-shadow.
- Type: Archivo (400/500/700/800) for display and body; IBM Plex Mono
  (400/500) for eyebrows, code, form inputs. Self-hosted via `@fontsource`
  packages, `font-display: swap`, display face preloaded.
- Layout: max-width 72rem content, 6rem section rhythm desktop / 4rem mobile,
  1px `--line` dividers between sections instead of alternating backgrounds.
- Motion: anime.js scroll reveals (existing `animations.js`, trimmed),
  `prefers-reduced-motion` respected everywhere.

## Page structure (index.astro)

1. **Hero** — h1 "You can write code. Now ship it with a team." One-sentence
   sub. Inline email form (`source=hero`). Line under form: "Free during early
   access. No spam." 3D git-graph scene to the right on desktop, below on mobile.
2. **The gap** (`#gap`) — "You can code. Teams need more." Three cards:
   reading a codebase you didn't write; getting a PR through review; working a
   sprint with other people. Absorbs current TrustSection + NotVibeSection
   content, including the AI stance in one sentence.
3. **How it works** (`#how`) — the delivery loop: Plan → Branch → PR → Review →
   Merge. Existing ProcessTimeline tightened. The current hero workspace mockup
   moves here as product proof.
4. **What you practice** (`#skills`) — six items from FeaturesGrid.
5. **Founder note** (`#why`) — ~120 words, photo optional, GitHub + LinkedIn.
6. **FAQ** (`#faq`) — five Q/As, `<details>` markup, FAQPage JSON-LD.
   Questions: Do I need to know how to code already? Is this a course? What
   does early access include? Will it cost money? How is this different from
   vibe coding / using AI?
7. **Final CTA** (`#join`) — same form (`source=footer`), one line on founding
   members locking in half price when Pro launches. Footer with links.

Removed: Testimonials, PricingEnhanced, PortfolioShowcase, LabTeaserEnhanced
(mockup content reused in #how), ValueProps (folded into #gap).

Header: logo + single button "Get early access" → `#hero-form`.

## CTAs and form

- One CTA label everywhere: "Get early access".
- `SignupForm.astro` component, used twice. POST to Formspree via `fetch` with
  `Accept: application/json`; fields `email`, `source`, `_subject`
  ("DEVS early access"), honeypot `_gotcha`. Inline states: idle / submitting /
  success ("You're on the list. Watch your inbox.") / error with retry.
  Progressive enhancement: works as a plain POST if JS fails.
- Remove Brevo form, iframe, and bot-timestamp script.

## 3D hero scene

- `src/scripts/hero-scene.ts`, Three.js imported dynamically after
  `requestIdleCallback` (fallback: `load` + 200ms) so hero text is LCP.
- Procedural git graph: main line, 2–3 feature branches (TubeGeometry),
  commit nodes (InstancedMesh spheres), a PR node, amber review-comment nodes,
  a green merge node. Loop: branch → commits → PR → reviews → merge, ~9s,
  advanced by scroll progress within hero and by time when idle.
- Pointer parallax ±4° on desktop only.
- Perf rules: `renderer.setPixelRatio(min(devicePixelRatio, 1.5))`;
  `IntersectionObserver` + `visibilitychange` pause RAF; node count halved
  under 768px; `powerPreference: "low-power"`; single directional + ambient
  light, MeshStandardMaterial, no shadows, no postprocessing.
- Fallback: `public/images/hero-graph.png` (rendered from the scene) shown
  when `prefers-reduced-motion`, WebGL unavailable, or Three fails to load.
- Budget: three tree-shaken ≤ 160 KB gz; total page JS ≤ 250 KB gz.

## Analytics

- GA4 via `@astrojs/partytown` (`forward: ["dataLayer.push", "gtag"]`).
  Measurement ID from `PUBLIC_GA_ID` env var; tag omitted when unset (dev).
- Consent Mode v2: default `analytics_storage: denied` for region list EEA +
  UK, `granted` elsewhere; `ads_storage` denied everywhere. Small bottom-left
  consent toast rendered only when the default was denied (region check via
  gtag consent default; UI shows via `Intl` timezone heuristic).
- Events: `cta_click` {location}, `form_start` {source}, `generate_lead`
  {source} on Formspree success.

## Discoverability

- FAQPage JSON-LD from the FAQ content; Organization `sameAs` = GitHub,
  LinkedIn, X; keep WebSite/WebPage.
- `public/llms.txt` describing DEVS, audience, links to blog posts.
- `robots.txt`: Allow all, explicit `User-agent` blocks for GPTBot,
  ClaudeBot, PerplexityBot, Google-Extended with Allow.
- RSS feed for blog at `/rss.xml` via `@astrojs/rss`, `<link rel=alternate>`.
- Regenerated `og-image.png` (1200×630) in the new design, produced by
  screenshotting `/og` route locally.
- Search Console verification meta if Josh supplies the token (optional).
- Fonts self-hosted; preload display woff2; `fetchpriority=high` on nothing
  else (hero is text).

## Verification

- `npm run dev` on localhost:4321 for Josh's review; `npm run build` passes.
- Lighthouse (Chrome, mobile preset) on the built preview: Performance ≥ 90,
  LCP < 2.0s, CLS < 0.1, Accessibility ≥ 95.
- One real Formspree submission from the hero form and one from the footer
  form; both reach Josh's inbox with correct `source`.
- Reduced-motion and no-WebGL fallbacks checked by toggling in DevTools.
- Bundle sizes checked in build output.

## Out of scope

Deploying, pushing, committing (Josh does these), blog content changes,
paid tooling, any product/app work.

## Revision 2 (2026-09-10, evening) — supersedes Visual system and 3D hero above

Josh's feedback: the amber/charcoal palette matched WhyIDied; the git-graph and
ring heroes were diagrams, not experiences; he wants a terminal/GitHub feel that
stays approachable for fresh learners, real depth on the page, DEVS branding
inside the model, and copy rewritten for conversion without overselling.

- Palette: GitHub Dark tokens. bg `#0d1117` / `#161b22` / `#21262d`, ink
  `#e6edf3`, muted `#9da7b3`, subtle `#7d8590`, blue `#58a6ff`, green
  `#3fb950` (merge), warn `#d29922`, danger `#f85149`, border `#30363d`.
  Primary button green `#1f7a33` (white text, 5.4:1). Rounded radii, more air.
- Type: Manrope (variable) + JetBrains Mono, self-hosted. Wordmark `~/devs_`.
- Hero object: procedural CRT computer mascot in Three.js, no frame. Its screen is
  a live canvas-texture terminal: boots with `~/devs $` commands, then draws
  pixel eyes that follow the cursor anywhere on the page, blinks, shows a
  `hello, teammate_` prompt. Focusing the email field → eyes look at the form,
  caret blinks, LED goes yellow. Successful signup → green screen, squint, hop.
  Model details: tapered CRT back, glass overlay, `~/devs` badge, floppy slot,
  LED, vents, keyboard with blue/purple/green keys, mouse + cables, real cast
  shadows, blue rim light, exponential fog, drifting code chips with cursor
  parallax. Static JPEG fallback on phones, reduced motion, or no WebGL.
- Page depth: `data-depth` scroll-parallax layers (dot grid + glow in hero,
  floating code chips in three sections) via `src/scripts/depth.js`.
- Copy: "Ship like you already have the job." CTA everywhere: "Save my spot".
  Microcopy: "Free during early access · no credit card · one email when labs
  open". FAQ leads with "I'm still learning to code. Is DEVS for me?" Founding
  members lock in 50% off Pro for life; no other pricing.
- Perf (built preview, Lighthouse): mobile 100 / desktop 99, LCP 0.9 s / 0.8 s,
  A11y 100, SEO 100. Stylesheets inlined; 3D only mounts for fine pointers ≥768px.

## Revision 3 (2026-09-10, late) — refinements from Josh's review

- Mascot: no cursor tilt and no floating; fixed three-quarter pose, grounded
  on a shadow-catching floor. Eyes, blink, boot sequence, form reactions and
  the signup hop stay. Materials: clearcoat plastic with micro-grain
  roughness/bump maps, curved CRT glass, screen light spilling onto the
  keyboard, ACES tone mapping. Scene is one fixed WebGL layer behind the page;
  the model is world-positioned over its hero anchor so it scrolls 1:1.
- Depth: all floating "code chip" decorations removed (CSS and 3D). Depth now
  comes from elevation only: stacked-card shadow behind the diff block, soft
  shadow on the workspace mockup, one blue glow behind the mascot.
- Text effect: terminal-glyph decode on three headlines only (hero, gap,
  final CTA), ~40% of letters, 150 ms, dim glyphs from `<>/{}[]_-`.
- Copy trimmed for conversion: hero tag pills and mascot caption removed,
  Skills section removed, How-it-works cards replaced by a one-line step
  strip above the mockup, founder note cut to ~60 words, FAQ cut to four,
  ledes shortened to one or two sentences. Gap section is a git-diff block.
- Perf (built preview): mobile 99 / desktop 98, A11y 100, SEO 100.

## Analytics + Search Console wiring (2026-09-11)

- Google Cloud project `begindevs-site` (no billing), service account
  `devs-agent@begindevs-site.iam.gserviceaccount.com`, key at
  `~/.config/devs/gcp-sa.json` (outside repo). Josh added it as GA Editor and
  Search Console Full user.
- GA4 property `properties/553743822` "DEVS — begindevs.com" in account
  398157043, web stream `G-6GVR9Z5R50`, key event `generate_lead`, retention 14 months.
- `PUBLIC_GA_ID` set in local `.env` and as GitHub Actions repo variable;
  deploy.yml passes it into the build.
- Search Console: `sc-domain:begindevs.com` verified; sitemap-index resubmitted.
- GA4 ↔ Search Console product link created by Josh 2026-09-11.
