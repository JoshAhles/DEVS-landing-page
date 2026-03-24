/**
 * Anime.js v4: polished entrances with staggered children, directional motion,
 * and timeline-based scroll reveals.
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
  const accentSpan = h1?.querySelector(".neon-glow");

  set(block, { opacity: 0 });
  animate(block, { opacity: [0, 1], duration: 360, ease: "outQuad" });

  let wordSpans = [];
  try {
    const splitter = splitText(h1, { words: true });
    splitter.split();
    wordSpans = splitter.words || [];
  } catch (_) {
    wordSpans = [];
  }

  if (wordSpans.length > 0) {
    wordSpans.forEach((span) => set(span, { opacity: 0, translateY: "14px" }));
    animate(wordSpans, {
      opacity: [0, 1],
      translateY: ["14px", "0px"],
      delay: stagger(45, { start: 180 }),
      duration: 500,
      ease: "outCubic",
    });
  } else {
    set(h1, { opacity: 0, translateY: "16px" });
    animate(h1, { opacity: [0, 1], translateY: ["16px", "0px"], duration: 640, delay: 80, ease: "outCubic" });
  }

  set(p, { opacity: 0, translateY: "12px" });
  set(cta, { opacity: 0, translateY: "8px", scale: 0.96 });
  const tl = createTimeline({ ease: "outCubic" });
  tl.add(p, { opacity: [0, 1], translateY: ["12px", "0px"], duration: 600 }, 450);
  tl.add(cta, { opacity: [0, 1], translateY: ["8px", "0px"], scale: [0.96, 1], duration: 500 }, 650);
  if (accentSpan && !wordSpans.length) {
    set(accentSpan, { opacity: 0.7 });
    animate(accentSpan, { opacity: [0.7, 1], duration: 350, delay: 500 });
  }

  const mockup = hero.querySelector("[data-hero-mockup]");
  if (mockup) {
    const glow = mockup.querySelector(".hero-mockup-glow");
    const panels = mockup.querySelectorAll(".hero-panel");

    set(mockup, { opacity: 0, translateY: "30px", scale: 0.97 });
    animate(mockup, {
      opacity: [0, 1],
      translateY: ["30px", "0px"],
      scale: [0.97, 1],
      duration: 800,
      delay: 900,
      ease: "outCubic",
    });

    if (glow) {
      set(glow, { opacity: 0 });
      animate(glow, { opacity: [0, 1], duration: 1200, delay: 1100, ease: "outQuad" });
    }

    if (panels.length) {
      panels.forEach((panel) => set(panel, { opacity: 0, translateY: "12px" }));
      animate(panels, {
        opacity: [0, 1],
        translateY: ["12px", "0px"],
        delay: stagger(140, { start: 1200 }),
        duration: 500,
        ease: "outCubic",
      });
    }
  }
}

function animateChildren(parent, selector, options = {}) {
  const children = parent.querySelectorAll(selector);
  if (!children.length) return;

  const {
    translateY = "20px",
    translateX = "0px",
    staggerDelay = 80,
    startDelay = 0,
    duration = 580,
  } = options;

  children.forEach((el) => set(el, { opacity: 0, translateY, translateX }));
  animate(children, {
    opacity: [0, 1],
    translateY: [translateY, "0px"],
    translateX: [translateX, "0px"],
    delay: stagger(staggerDelay, { start: startDelay }),
    duration,
    ease: "outCubic",
  });
}

function runScrollAnimations() {
  const sections = document.querySelectorAll("[data-animate]");
  if (!sections.length || REDUCED_MOTION) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        if (el.hasAttribute("data-animated")) return;
        el.setAttribute("data-animated", "true");

        const section = el.closest("section");
        const sectionId = section?.id || "";

        animate(el, {
          opacity: [0, 1],
          translateY: ["18px", "0px"],
          duration: 600,
          ease: "outCubic",
        });

        if (sectionId === "who") {
          animateChildren(el, ".surface-card", { staggerDelay: 100, startDelay: 200, translateY: "24px" });
        }

        if (sectionId === "difference") {
          animateChildren(el, ".flex.gap-5", { staggerDelay: 120, startDelay: 250, translateX: "-16px", translateY: "0px" });
        }

        if (sectionId === "how-it-works") {
          animateChildren(el, ".relative.flex.gap-5", { staggerDelay: 150, startDelay: 200, translateY: "20px" });
        }

        if (sectionId === "skills") {
          animateChildren(el, ".content-list-item", { staggerDelay: 70, startDelay: 150, translateY: "14px" });
        }

        if (sectionId === "proof") {
          animateChildren(el, ".surface-card", { staggerDelay: 120, startDelay: 200, translateY: "20px" });
        }

        if (sectionId === "pricing") {
          animateChildren(el, ".surface-card", { staggerDelay: 150, startDelay: 200, translateY: "24px" });
        }

        observer.unobserve(el);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
  );

  sections.forEach((section) => observer.observe(section));
}

function runTimelineFill() {
  const timelineLine = document.querySelector("#how-it-works .absolute.left-5");
  if (!timelineLine || REDUCED_MOTION) return;

  set(timelineLine, { scaleY: 0, transformOrigin: "top" });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animate(timelineLine, {
          scaleY: [0, 1],
          duration: 1200,
          delay: 300,
          ease: "outCubic",
        });
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.2 }
  );

  const section = document.querySelector("#how-it-works");
  if (section) observer.observe(section);
}

function runTerminalTyping() {
  const terminalLines = document.querySelectorAll(".terminal-shell .copy-muted, .terminal-shell .copy-subtle");
  if (!terminalLines.length || REDUCED_MOTION) return;

  terminalLines.forEach((line) => set(line, { opacity: 0, translateX: "-8px" }));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (entry.target.hasAttribute("data-terminal-animated")) return;
        entry.target.setAttribute("data-terminal-animated", "true");

        animate(terminalLines, {
          opacity: [0, 1],
          translateX: ["-8px", "0px"],
          delay: stagger(280, { start: 200 }),
          duration: 400,
          ease: "outQuad",
        });

        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.3 }
  );

  const terminal = document.querySelector(".terminal-shell");
  if (terminal) observer.observe(terminal);
}

function init() {
  if (REDUCED_MOTION) return;
  runHeroEntrance();
  runScrollAnimations();
  runTimelineFill();
  runTerminalTyping();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
