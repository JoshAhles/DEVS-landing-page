import { animate, stagger } from "animejs";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function heroEntrance() {
  const block = document.querySelector("[data-hero-content]");
  if (!block || REDUCED) return;
  animate(block.children, { opacity: [0, 1], translateY: [14, 0], delay: stagger(70), duration: 550, ease: "outCubic" });
}

function scrollReveals() {
  const els = document.querySelectorAll("[data-reveal]");
  if (REDUCED) {
    els.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const siblings = [...el.parentElement.querySelectorAll(":scope > [data-reveal]")];
        const i = Math.max(siblings.indexOf(el), 0);
        setTimeout(() => el.classList.add("is-in"), i * 70);
        io.unobserve(el);
      });
    },
    { threshold: 0.05, rootMargin: "0px 0px -6% 0px" },
  );
  els.forEach((el) => io.observe(el));
}

// headlines resolve out of terminal glyphs when they scroll in
const GLYPHS = "<>/{}[]_-";
function decodeHeadlines() {
  const heads = document.querySelectorAll("[data-decode]");
  if (REDUCED) return;
  heads.forEach((h) => {
    const text = h.textContent.replace(/\s+/g, " ").trim();
    h.setAttribute("aria-label", text);
    h.textContent = "";
    const letters = [];
    text.split(" ").forEach((word, wi, arr) => {
      const w = document.createElement("span"); w.className = "word";
      [...word].forEach((ch) => {
        const g = document.createElement("span"); g.className = "glyph"; g.textContent = ch; g.dataset.ch = ch;
        w.appendChild(g); letters.push(g);
      });
      h.appendChild(w);
      if (wi < arr.length - 1) h.appendChild(document.createTextNode(" "));
    });
    // lock each glyph to its final width so scrambling never reflows the line
    letters.forEach((g) => { g.style.width = g.getBoundingClientRect().width + "px"; });
    const picked = letters.filter((_, i) => (i * 7) % 10 < 4); // scramble ~40% of letters, spread evenly
    picked.forEach((g) => g.classList.add("is-scrambling"));
    const run = () => {
      const start = performance.now(), per = 12, dur = 150;
      const tick = (now) => {
        let done = true;
        picked.forEach((g, i) => {
          const local = now - start - i * per * 2;
          if (local < dur) { g.textContent = GLYPHS[Math.floor(now / 60 + i) % GLYPHS.length]; done = false; }
          else if (g.classList.contains("is-scrambling")) { g.textContent = g.dataset.ch; g.classList.remove("is-scrambling"); }
        });
        if (!done) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (h.closest("#hero")) { run(); return; }
    const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { io.disconnect(); run(); } }, { threshold: 0.3 });
    io.observe(h);
  });
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
decodeHeadlines();
ctaClicks();
