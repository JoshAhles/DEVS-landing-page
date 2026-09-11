import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, BoxGeometry, PlaneGeometry, CylinderGeometry, TubeGeometry,
  CatmullRomCurve3, Vector3, MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, ShadowMaterial, Color,
  CanvasTexture, PMREMGenerator, AmbientLight, DirectionalLight, PointLight, MathUtils, SRGBColorSpace,
  PCFSoftShadowMap, ACESFilmicToneMapping, RepeatWrapping,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { gaze, blinkAmount, moodFor } from "../lib/mascot-model.js";

const C = {
  shell: 0x434b56, shellDark: 0x353c46, bezel: 0x1c2128, key: 0x444c57, line: 0x30363d, muted: 0x9da7b3,
  blue: 0x58a6ff, green: 0x3fb950, yellow: 0xd29922, purple: 0xa371f7, red: 0xf85149, bg: 0x0d1117,
};
let grainTex = null;
function grain() {
  if (grainTex) return grainTex;
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d"); const img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) { const v = 200 + Math.random() * 55; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  grainTex = new CanvasTexture(c); grainTex.wrapS = grainTex.wrapT = RepeatWrapping; grainTex.repeat.set(3, 3);
  return grainTex;
}
// moulded plastic: clearcoat over a slightly rough, faintly grainy base
const std = (color, extra = {}) => new MeshPhysicalMaterial({
  color, roughness: 0.58, metalness: 0.0, clearcoat: 0.45, clearcoatRoughness: 0.4,
  roughnessMap: grain(), bumpMap: grain(), bumpScale: 0.003, ...extra,
});
const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

/* ---------- terminal screen (canvas texture) ---------- */
function makeTerminal() {
  const W = window.innerWidth < 768 ? 512 : 768, H = window.innerWidth < 768 ? 373 : 560;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  const tex = new CanvasTexture(c); tex.colorSpace = SRGBColorSpace; tex.anisotropy = 4;
  const BOOT = [
    ["$ ", "whoami", "#9da7b3"], ["", "new_developer", "#e6edf3"],
    ["$ ", "git checkout -b first-ticket", "#9da7b3"], ["", "Switched to 'first-ticket'", "#3fb950"],
    ["$ ", "devs review --open", "#9da7b3"], ["", "2 comments · changes requested", "#d29922"],
    ["$ ", "git push && devs merge", "#9da7b3"], ["", "✓ merged · nice work", "#3fb950"],
  ];
  const state = { booted: false, bootT: 0 };
  const SX = W / 512, SY = H / 400;
  function draw(t, eyes, mood, open) {
    g.setTransform(SX, 0, 0, SY, 0, 0);
    g.fillStyle = "#0b0f16"; g.fillRect(0, 0, 512, 400);
    g.font = "500 22px 'JetBrains Mono', ui-monospace, monospace"; g.textBaseline = "top";
    // header bar
    g.fillStyle = "#161b22"; g.fillRect(0, 0, 512, 34);
    ["#f85149", "#d29922", "#3fb950"].forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc(20 + i * 22, 17, 6, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = "#7d8590"; g.font = "500 16px 'JetBrains Mono', ui-monospace, monospace"; g.fillText("~/devs — teammate.sh", 96, 9);
    g.font = "500 22px 'JetBrains Mono', ui-monospace, monospace";
    const bootDur = 4.2;
    if (t < bootDur) {
      // typewriter boot
      const lines = Math.min(BOOT.length, Math.floor((t / bootDur) * (BOOT.length + 1)));
      for (let i = 0; i < lines; i++) {
        const [p, s, col] = BOOT[i]; const y = 50 + i * 30;
        if (p) { g.fillStyle = "#3fb950"; g.fillText(p, 16, y); }
        const frac = i === lines - 1 ? Math.min(1, ((t / bootDur) * (BOOT.length + 1) - i) * 1.4) : 1;
        g.fillStyle = col; g.fillText(s.slice(0, Math.ceil(s.length * frac)), 16 + (p ? 26 : 0), y);
      }
      if (Math.floor(t * 2.5) % 2 === 0) { g.fillStyle = "#3fb950"; g.fillRect(16, 50 + lines * 30 + 2, 12, 22); }
    } else {
      // eyes as terminal UI
      const W = 512, H = 400;
      const ex = eyes.x * 150, ey = -eyes.y * 70;
      const col = mood === "happy" ? "#3fb950" : "#58a6ff";
      const ew = mood === "happy" ? 92 : 74, eh = Math.max(8, 96 * open);
      [-1, 1].forEach((side) => {
        const x = W / 2 + side * 105 + ex - ew / 2, y = 168 + ey - eh / 2;
        g.fillStyle = col; g.beginPath(); g.roundRect(x, y, ew, eh, Math.min(20, eh / 2)); g.fill();
        if (open > 0.5 && mood !== "happy") { g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(x + ew - 26, y + 12, 12, 16, 5); g.fill(); }
      });
      if (mood === "happy") { g.fillStyle = "#3fb950"; g.beginPath(); g.arc(W / 2 + ex, 250 + ey, 34, 0.15 * Math.PI, 0.85 * Math.PI); g.lineWidth = 10; g.strokeStyle = "#3fb950"; g.stroke(); }
      // prompt line
      const prompt = mood === "form" ? "typing… i'm listening" : mood === "happy" ? "welcome to the team" : "hello, teammate";
      g.fillStyle = "#3fb950"; g.fillText("$ ", 16, H - 46);
      g.fillStyle = "#9da7b3"; g.fillText(prompt, 42, H - 46);
      if (Math.floor(t * 2.2) % 2 === 0) { g.fillStyle = mood === "form" ? "#d29922" : "#3fb950"; g.fillRect(44 + g.measureText(prompt).width + 4, H - 44, 12, 22); }
    }
    // scanlines + vignette
    g.fillStyle = "rgba(0,0,0,0.14)"; for (let y = 0; y < 400; y += 3) g.fillRect(0, y, 512, 1);
    const v = g.createRadialGradient(256, 200, 150, 256, 200, 340);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.4)"); g.fillStyle = v; g.fillRect(0, 0, 512, 400);
    tex.needsUpdate = true;
  }
  return { tex, draw };
}

function badgeTexture() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#1c2128"; g.fillRect(0, 0, 256, 64);
  g.font = "500 30px 'JetBrains Mono', ui-monospace, monospace"; g.textBaseline = "middle";
  g.fillStyle = "#3fb950"; g.fillText("~/", 26, 33); g.fillStyle = "#e6edf3"; g.fillText("devs", 66, 33);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}

export default function mountHeroScene(container) {
  const mobile = window.innerWidth < 768;
  const touch = window.matchMedia("(pointer: coarse)").matches;
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = !mobile; renderer.shadowMap.type = PCFSoftShadowMap;
  const canvas = renderer.domElement;
  // one fixed layer behind the whole page; the mascot is placed in world space over its anchor element
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;opacity:0;transition:opacity 700ms ease;pointer-events:none;z-index:0";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; pmrem.dispose();
  scene.add(new AmbientLight(0xffffff, 0.3));
  const key = new DirectionalLight(0xfff1dc, 2.6); key.position.set(3.5, 6, 5);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6; key.shadow.bias = -0.0005;
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 }); scene.add(key); scene.add(key.target);
  const rim = new DirectionalLight(C.blue, 1.1); rim.position.set(-5, 2.5, -3); scene.add(rim);
  const fill = new DirectionalLight(C.purple, 0.2); fill.position.set(-2, -1, 4); scene.add(fill);

  const camera = new PerspectiveCamera(28, 1, 0.1, 100);

  /* ---------- mascot ---------- */
  const mascot = new Group(); scene.add(mascot);
  const rig = new Group(); rig.add(mascot); scene.add(rig); // rig = position/scale from the anchor; mascot = fixed pose
  mascot.rotation.set(0.1, -0.34, 0);
  const front = shadowed(new Mesh(new RoundedBoxGeometry(2.5, 2.15, 0.9, 6, 0.2), std(C.shell))); front.position.z = 0.35; mascot.add(front);
  const back = shadowed(new Mesh(new RoundedBoxGeometry(2.0, 1.75, 1.4, 6, 0.22), std(C.shellDark))); back.position.set(0, -0.05, -0.75); mascot.add(back);
  const bezel = shadowed(new Mesh(new RoundedBoxGeometry(2.05, 1.5, 0.12, 4, 0.08), std(C.bezel, { roughness: 0.35 }))); bezel.position.set(0, 0.2, 0.82); mascot.add(bezel);
  const term = makeTerminal();
  // CRT glass bulges slightly toward the viewer
  const curved = (w, h) => {
    const geo = new PlaneGeometry(w, h, 24, 18); const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) / (w / 2), y = pos.getY(i) / (h / 2); pos.setZ(i, (1 - (x * x + y * y) * 0.5) * 0.07); }
    geo.computeVertexNormals(); return geo;
  };
  const screen = new Mesh(curved(1.84, 1.34), new MeshStandardMaterial({ map: term.tex, emissiveMap: term.tex, emissive: new Color(0xffffff), emissiveIntensity: 1.9, color: 0x000000, roughness: 0.6 }));
  screen.position.set(0, 0.2, 0.885); mascot.add(screen);
  const glass = new Mesh(curved(1.84, 1.34), new MeshPhysicalMaterial({ color: 0xbfd3ee, transparent: true, opacity: 0.045, roughness: 0.25, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.3, depthWrite: false }));
  glass.position.set(0, 0.2, 0.895); mascot.add(glass);
  const spill = new PointLight(C.blue, 1.1, 3.5, 2); spill.position.set(0, -0.6, 1.6); mascot.add(spill);
  const badge = new Mesh(new PlaneGeometry(0.62, 0.155), new MeshStandardMaterial({ map: badgeTexture(), roughness: 0.6 })); badge.position.set(-0.7, -0.78, 0.805); mascot.add(badge);
  const slot = shadowed(new Mesh(new BoxGeometry(0.7, 0.07, 0.04), std(C.bg))); slot.position.set(0.45, -0.78, 0.8); mascot.add(slot);
  const led = new Mesh(new BoxGeometry(0.09, 0.09, 0.02), new MeshBasicMaterial({ color: C.green })); led.position.set(1.0, -0.78, 0.8); mascot.add(led);
  for (let i = 0; i < 7; i++) { const vent = new Mesh(new BoxGeometry(0.02, 0.5, 0.05), std(C.bg)); vent.position.set(1.0, -0.15, -0.75 - i * 0.12 + 0.36); vent.rotation.z = 0; vent.position.x = 1.005; mascot.add(vent); }
  const neck = shadowed(new Mesh(new CylinderGeometry(0.45, 0.55, 0.22, 24), std(C.shellDark))); neck.position.set(0, -1.18, -0.1); mascot.add(neck);
  const foot = shadowed(new Mesh(new RoundedBoxGeometry(1.7, 0.16, 1.35, 4, 0.08), std(C.shell))); foot.position.set(0, -1.36, -0.05); mascot.add(foot);
  const keyboard = shadowed(new Mesh(new RoundedBoxGeometry(2.4, 0.16, 0.9, 4, 0.06), std(C.shellDark))); keyboard.position.set(0, -1.38, 1.35); mascot.add(keyboard);
  const keyGeo = new RoundedBoxGeometry(0.15, 0.07, 0.15, 2, 0.02);
  for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) {
    const accent = r === 2 && i < 3 ? [C.blue, C.purple, C.green][i] : null;
    const k = shadowed(new Mesh(keyGeo, std(accent ?? C.key, { roughness: 0.45 })));
    k.position.set(-0.98 + i * 0.178, -1.26, 1.05 + r * 0.2 + (r === 2 ? 0.03 : 0)); mascot.add(k);
  }
  const space = shadowed(new Mesh(new RoundedBoxGeometry(0.9, 0.07, 0.15, 2, 0.02), std(C.key))); space.position.set(0.3, -1.26, 1.68); mascot.add(space);
  // mouse + cable
  const mouse = shadowed(new Mesh(new RoundedBoxGeometry(0.38, 0.16, 0.55, 4, 0.08), std(C.shell))); mouse.position.set(1.75, -1.36, 1.25); mouse.rotation.y = -0.3; mascot.add(mouse);
  const cable = new Mesh(new TubeGeometry(new CatmullRomCurve3([new Vector3(1.7, -1.4, 1.0), new Vector3(1.6, -1.42, 0.5), new Vector3(1.2, -1.42, 0.1), new Vector3(1.0, -1.3, -0.2)]), 20, 0.02, 6), std(C.bezel)); mascot.add(cable);
  const powerCable = new Mesh(new TubeGeometry(new CatmullRomCurve3([new Vector3(-0.4, -0.5, -1.45), new Vector3(-0.9, -1.1, -1.7), new Vector3(-1.6, -1.42, -1.4), new Vector3(-2.6, -1.42, -0.9)]), 24, 0.03, 6), std(C.bezel)); mascot.add(powerCable);

  // ground shadow catcher, travels with the rig
  const ground = new Mesh(new PlaneGeometry(14, 14), new ShadowMaterial({ opacity: 0.38 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1.44; ground.receiveShadow = true; rig.add(ground);

  /* ---------- camera: fixed distance, moves with scroll; rig follows the anchor element ---------- */
  const CAM_D = 12;
  camera.position.set(0, 0, CAM_D);
  let unitsPerPx = 0.01, anchorX = 0, anchorY0 = 0;
  const layout = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const tanV = Math.tan((camera.fov / 2) * Math.PI / 180);
    unitsPerPx = (2 * tanV * CAM_D) / h;
    const r = container.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + window.scrollY + r.height * 0.52;
    anchorX = (cx - w / 2) * unitsPerPx;
    anchorY0 = -(cy - h / 2) * unitsPerPx; // camera centre = page y h/2 at scrollY 0; page y grows downward
    rig.position.set(anchorX, anchorY0, 0);
    rig.scale.setScalar((r.width * unitsPerPx) / 4.9);
  };
  layout();
  const ro = new ResizeObserver(layout); ro.observe(container);
  window.addEventListener("resize", layout);

  /* ---------- input ---------- */
  let nx = 0, ny = 0, mood = "idle", happyUntil = 0;
  const onMove = (e) => {
    const r = container.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.45;
    nx = MathUtils.clamp((e.clientX - cx) / (window.innerWidth * 0.5), -1, 1);
    ny = MathUtils.clamp(-(e.clientY - cy) / (window.innerHeight * 0.5), -1, 1);
  };
  if (!touch) window.addEventListener("pointermove", onMove, { passive: true });
  const onForm = (e) => {
    const m = moodFor(e.detail?.type);
    if (m === "happy") { happyUntil = performance.now() + 2600; mood = "happy"; }
    else if (mood !== "happy" || performance.now() > happyUntil) mood = m;
  };
  document.addEventListener("devs:form", onForm);

  /* ---------- loop ---------- */
  let running = false, raf = 0, lastDraw = 0; const t0 = performance.now();
  const eyeState = { x: 0, y: 0 };
  const frame = (now) => {
    if (!running) return;
    const t = (now - t0) / 1000;
    if (mood === "happy" && now > happyUntil) mood = "idle";
    const gx = touch ? Math.sin(t * 0.7) * 0.8 : nx, gy = touch ? Math.cos(t * 0.5) * 0.5 : ny;
    const g = gaze(gx, gy, mood === "form" ? "form" : "idle");
    eyeState.x += (g.eyeX / 0.22 - eyeState.x) * 0.15; eyeState.y += (g.eyeY / 0.14 - eyeState.y) * 0.15;
    if (now - lastDraw > 33) { term.draw(t, eyeState, mood, mood === "happy" ? 0.5 : blinkAmount(t)); lastDraw = now; }
    screen.material.emissiveIntensity = mood === "form" ? 2.1 : 1.9;
    led.material.color.setHex(mood === "form" ? C.yellow : C.green);

    const hop = mood === "happy" ? Math.abs(Math.sin(((happyUntil - now) / 2600) * Math.PI * 3)) * 0.2 : 0;
    mascot.position.y = hop;

    // camera rides the page so the mascot scrolls exactly with its anchor
    camera.position.y = -window.scrollY * unitsPerPx;
    key.position.set(3.5, camera.position.y + 6, 5); key.target.position.set(0, camera.position.y, 0); key.target.updateMatrixWorld();
    spill.intensity = (mood === "form" ? 1.4 : 1.1) + Math.sin(t * 3) * 0.06;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  const start = () => { if (running) return; running = true; raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  const io = { disconnect() {} };
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVis);

  term.draw(0, eyeState, "idle", 1); renderer.render(scene, camera);
  requestAnimationFrame(() => { canvas.style.opacity = "1"; const fb = container.querySelector("[data-hero-fallback]"); if (fb) fb.style.opacity = "0"; });
  start();

  return {
    destroy() {
      stop(); io.disconnect(); ro.disconnect();
      window.removeEventListener("pointermove", onMove); document.removeEventListener("devs:form", onForm);
      window.removeEventListener("resize", layout);
      document.removeEventListener("visibilitychange", onVis); renderer.dispose(); canvas.remove();
    },
  };
}
