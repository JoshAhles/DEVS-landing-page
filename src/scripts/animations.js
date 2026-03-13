/**
 * Anime.js v4: polished entrances (word reveal, soft scroll).
 * Respects prefers-reduced-motion.
 */

import { animate, createTimeline, stagger, set } from "animejs";
import { splitText } from "animejs/text";

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function runHeroEntrance() {
  const hero = document.querySelector("#hero");
  const block = hero?.querySelector("[data-hero-content]");
  if (!block || REDUCED_MOTION) return;

  const h1 = block.querySelector("h1");
  const p = block.querySelector("p");
  const cta = block.querySelector("a[href='#notify']");
  const accentSpan = h1?.querySelector(".neon-glow"); // "starts here."

  set(block, { opacity: 0 });

  // Brief block fade-in so hero isn’t stuck hidden
  animate(block, { opacity: [0, 1], duration: 360, ease: "outQuad" });

  // Word-by-word headline: split then reveal with gentle stagger
  let wordSpans = [];
  try {
    const splitter = splitText(h1, { words: true });
    splitter.split();
    wordSpans = splitter.words || [];
  } catch (_) {
    wordSpans = [];
  }

  if (wordSpans.length > 0) {
    wordSpans.forEach((span) => set(span, { opacity: 0, translateY: "6px" }));
    animate(wordSpans, {
      opacity: [0, 1],
      translateY: ["6px", "0px"],
      delay: stagger(38, { start: 180 }),
      duration: 420,
      ease: "outQuad",
    });
  } else {
    set(h1, { opacity: 0, translateY: "10px" });
    animate(h1, { opacity: [0, 1], translateY: ["10px", "0px"], duration: 640, delay: 80, ease: "outQuad" });
  }

  // Subtext and CTA: soft fade after headline has started
  set(p, { opacity: 0 });
  set(cta, { opacity: 0 });
  const tl = createTimeline({ ease: "outQuad" });
  tl.add(p, { opacity: [0, 1], duration: 560 }, 420);
  tl.add(cta, { opacity: [0, 1], duration: 480 }, 620);
  if (accentSpan && !wordSpans.length) {
    set(accentSpan, { opacity: 0.7 });
    animate(accentSpan, { opacity: [0.7, 1], duration: 350, delay: 500 });
  }
}

function runScrollAnimations() {
  const sections = document.querySelectorAll("[data-animate]");
  if (!sections.length || REDUCED_MOTION) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        if (el.hasAttribute("data-animated")) return; // guard: only animate once
        el.setAttribute("data-animated", "true");
        animate(el, {
          opacity: [0, 1],
          duration: 720,
          ease: "outQuad",
        });
        observer.unobserve(el);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -24px 0px" }
  );

  sections.forEach((section) => observer.observe(section));
}

function init() {
  if (REDUCED_MOTION) return;
  runHeroEntrance();
  runScrollAnimations();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
