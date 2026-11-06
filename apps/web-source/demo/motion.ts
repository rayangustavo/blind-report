// Movimento da landing: campo de partículas do hero, morfose das etapas e
// orquestração de scroll (reveals, passo ativo, capítulos e progresso).
// Sem dependências externas e sem estilos inline no HTML (compatível com CSP).

type Pt = { x: number; y: number; z: number; r: number; s: number; hue: number; ph: number };
type Vec = { x: number; y: number };

const TAU = Math.PI * 2;
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function fibonacci(n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * 2.399963229728653;
    out.push({
      x: Math.cos(theta) * r,
      y,
      z: Math.sin(theta) * r,
      r: 0.94 + Math.random() * 0.62,
      s: 0.45 + Math.random() * 1.6,
      hue: Math.random(),
      ph: Math.random() * TAU,
    });
  }
  return out;
}

export function mountHeroField(canvas: HTMLCanvasElement): { destroy: () => void } {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { destroy: () => {} };

  const reduce = prefersReduced();
  const dust = fibonacci(360);
  const shield = new Path2D("M0 -106 L82 -74 V6 C82 66 47 100 0 120 C-47 100 -82 66 -82 6 V-74 Z");
  const check = new Path2D("M-33 4 L-10 27 L37 -28");
  let width = 0;
  let height = 0;
  let raf = 0;
  let scroll = 0;
  let mx = 0;
  let my = 0;
  let tx = 0;
  let ty = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const onPointer = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    tx = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
    ty = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
  };

  const onScroll = () => {
    const rect = canvas.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    scroll = clamp((vh * 0.35 - rect.top) / (rect.height * 1.15));
  };

  const draw = (now: number) => {
    if (!width || !height) {
      raf = reduce ? 0 : requestAnimationFrame(draw);
      return;
    }
    ctx.clearRect(0, 0, width, height);
    const cx = width * 0.54;
    const cy = height * 0.49;
    const scale = Math.min(width, height) * 0.34;
    mx += (tx - mx) * 0.045;
    my += (ty - my) * 0.045;

    const spin = now * 0.00012;
    for (const p of dust) {
      const ring = Math.sqrt(Math.max(0, 1 - p.y * p.y));
      const theta = Math.atan2(p.z, p.x) + spin * (0.7 + p.r * 0.5);
      const radius = ring * scale * (1.24 + scroll * 1.7) * p.r;
      const x = Math.cos(theta) * radius + mx * 26 * (0.4 + p.r * 0.6);
      const yy = p.y * scale * (1.05 + scroll * 1.5) * p.r + Math.sin(now * 0.0011 + p.ph) * 3.2 + my * 20;
      const alpha = (0.14 + (p.z + 1) * 0.24) * (1 - scroll * 0.5);
      const color = p.hue > 0.68 ? "56, 224, 200" : p.hue > 0.34 ? "180, 140, 255" : "150, 180, 255";
      ctx.beginPath();
      ctx.arc(cx + x, cy + yy, p.s * (1 + scroll * 0.7), 0, TAU);
      ctx.fillStyle = `rgba(${color}, ${alpha.toFixed(3)})`;
      ctx.fill();
    }

    const alphaShield = 1 - scroll * 0.9;
    const k = scale * 0.0092;
    ctx.save();
    ctx.translate(cx + mx * 18, cy + my * 15);
    ctx.rotate(-0.02 + mx * 0.015);
    ctx.scale(k, k);
    ctx.globalAlpha = alphaShield;

    ctx.shadowColor = "rgba(122, 162, 255, 0.95)";
    ctx.shadowBlur = 16;
    ctx.lineWidth = 2.3;
    ctx.strokeStyle = "rgba(190, 208, 255, 0.92)";
    ctx.stroke(shield);
    ctx.shadowBlur = 0;

    ctx.setLineDash([1.5, 11]);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = "rgba(56, 224, 200, 0.62)";
    ctx.stroke(shield);
    ctx.setLineDash([]);

    ctx.save();
    ctx.clip(shield);
    const scanY = (((now * 0.055) % 300) - 140);
    const scan = ctx.createLinearGradient(0, scanY, 0, scanY + 28);
    scan.addColorStop(0, "rgba(122, 162, 255, 0)");
    scan.addColorStop(0.5, "rgba(190, 214, 255, 0.45)");
    scan.addColorStop(1, "rgba(122, 162, 255, 0)");
    ctx.fillStyle = scan;
    ctx.fillRect(-92, scanY, 184, 26);
    ctx.restore();

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(238, 244, 255, 0.94)";
    ctx.stroke(check);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, scale * 1.42, 0, TAU);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
    ctx.lineWidth = 1;
    ctx.stroke();

    if (!reduce) raf = requestAnimationFrame(draw);
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  onScroll();
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  if (reduce) draw(0);
  else raf = requestAnimationFrame(draw);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
    },
  };
}

/* ---------- morfose das etapas ---------- */

type Shape = { points: Vec[]; draw: (ctx: CanvasRenderingContext2D) => void };

const SHAPE_SIZE = 360;
const SHAPE_CENTER = SHAPE_SIZE / 2;
const SHAPE_COUNT = 260;

function sampleShape(draw: (ctx: CanvasRenderingContext2D) => void): Vec[] {
  const off = document.createElement("canvas");
  off.width = SHAPE_SIZE;
  off.height = SHAPE_SIZE;
  const ctx = off.getContext("2d");
  if (!ctx) return [];
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#fff";
  draw(ctx);
  const data = ctx.getImageData(0, 0, SHAPE_SIZE, SHAPE_SIZE).data;
  const all: Vec[] = [];
  for (let y = 0; y < SHAPE_SIZE; y += 2) {
    for (let x = 0; x < SHAPE_SIZE; x += 2) {
      if (data[(y * SHAPE_SIZE + x) * 4 + 3] > 48) {
        all.push({ x: (x - SHAPE_CENTER) / SHAPE_CENTER, y: (y - SHAPE_CENTER) / SHAPE_CENTER });
      }
    }
  }
  if (!all.length) return Array.from({ length: SHAPE_COUNT }, () => ({ x: 0, y: 0 }));
  const out: Vec[] = [];
  for (let i = 0; i < SHAPE_COUNT; i++) {
    const base = all[Math.floor((i * all.length) / SHAPE_COUNT)] ?? all[0];
    const jitter = 0.012;
    out.push({ x: base.x + (Math.random() - 0.5) * jitter, y: base.y + (Math.random() - 0.5) * jitter });
  }
  return out;
}

function buildShapes(): Shape[] {
  const globe = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.arc(180, 180, 118, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(180, 180, 46, 118, 0, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(180, 180, 118, 46, 0, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(62, 180);
    ctx.lineTo(298, 180);
    ctx.stroke();
  };
  const lock = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.roundRect(110, 156, 140, 118, 24);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(180, 156, 46, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(180, 204, 15, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(180, 219);
    ctx.lineTo(180, 242);
    ctx.stroke();
  };
  const fingerprint = (ctx: CanvasRenderingContext2D) => {
    for (const r of [112, 92, 72, 52]) {
      ctx.beginPath();
      ctx.arc(180, 194, r, Math.PI * 0.08, Math.PI * 1.92);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(180, 108);
    ctx.bezierCurveTo(252, 146, 226, 250, 180, 280);
    ctx.stroke();
  };
  const cube = (ctx: CanvasRenderingContext2D) => {
    const pts: [number, number][] = [
      [180, 58],
      [290, 122],
      [290, 242],
      [180, 306],
      [70, 242],
      [70, 122],
    ];
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(180, 182);
    ctx.lineTo(180, 58);
    ctx.moveTo(180, 182);
    ctx.lineTo(70, 242);
    ctx.moveTo(180, 182);
    ctx.lineTo(290, 242);
    ctx.stroke();
  };
  return [globe, lock, fingerprint, cube].map((draw) => ({ points: sampleShape(draw), draw }));
}

export function mountMorphField(canvas: HTMLCanvasElement): { setStep: (index: number) => void; destroy: () => void } {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { setStep: () => {}, destroy: () => {} };

  const reduce = prefersReduced();
  const shapes = buildShapes();
  const parts = shapes[0].points.map((p) => ({
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    s: 0.55 + Math.random() * 1.3,
    hue: Math.random(),
  }));
  let target = shapes[0].points;
  let step = 0;
  let width = 0;
  let height = 0;
  let raf = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const paint = (now: number) => {
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const scale = Math.min(width, height) * 0.4;

    const rot = reduce ? 0 : now * 0.00016;
    for (const [i, r] of [1.02, 1.18, 1.34].entries()) {
      ctx.beginPath();
      ctx.arc(cx, cy, scale * r, rot * (i + 1), rot * (i + 1) + Math.PI * 1.55);
      ctx.strokeStyle = `rgba(140, 170, 255, ${0.12 - i * 0.03})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(now * 0.0004) * 0.02 + rot * 0.4);
    ctx.scale(scale / 180, scale / 180);
    ctx.translate(-180, -180);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "rgba(170, 195, 255, 0.2)";
    shapes[step].draw(ctx);
    ctx.restore();

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const t = target[i] ?? target[target.length - 1] ?? { x: 0, y: 0 };
      const ease = reduce ? 1 : 0.075;
      p.x += (t.x - p.x) * ease;
      p.y += (t.y - p.y) * ease;
      const wob = reduce ? 0 : Math.sin(now * 0.0016 + i * 1.7) * 0.004;
      const px = cx + (p.x + wob) * scale;
      const py = cy + (p.y + wob) * scale;
      const color = p.hue > 0.72 ? "56, 224, 200" : p.hue > 0.42 ? "180, 140, 255" : "170, 198, 255";
      ctx.beginPath();
      ctx.arc(px, py, p.s, 0, TAU);
      ctx.fillStyle = `rgba(${color}, 0.72)`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, 3.2, 0, TAU);
    ctx.fillStyle = "rgba(238, 244, 255, 0.9)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, TAU);
    ctx.strokeStyle = "rgba(122, 162, 255, 0.4)";
    ctx.stroke();
  };

  const loop = (now: number) => {
    paint(now);
    if (!reduce) raf = requestAnimationFrame(loop);
  };

  const ro = new ResizeObserver(() => {
    resize();
    if (reduce) paint(0);
  });
  ro.observe(canvas);
  resize();
  if (reduce) paint(0);
  else raf = requestAnimationFrame(loop);

  return {
    setStep(index: number) {
      const next = clamp(index, 0, shapes.length - 1);
      if (next === step) return;
      step = next;
      target = shapes[step].points;
      if (reduce) paint(0);
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
    },
  };
}

/* ---------- orquestração de scroll ---------- */

export function setupScrolly(root: HTMLElement): () => void {
  const cleanups: (() => void)[] = [];
  const reduce = prefersReduced();

  const revealEls = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
  if (reduce) {
    for (const el of revealEls) el.classList.add("is-visible");
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "-8% 0px -12% 0px", threshold: 0.12 },
    );
    for (const el of revealEls) io.observe(el);
    cleanups.push(() => io.disconnect());
  }

  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  if (!reduce && !coarsePointer) {
    document.documentElement.style.setProperty("--glow", "1");
    let glowRaf = 0;
    let gx = 0;
    let gy = 0;
    const onMove = (e: PointerEvent) => {
      gx = e.clientX;
      gy = e.clientY;
      if (glowRaf) return;
      glowRaf = requestAnimationFrame(() => {
        glowRaf = 0;
        document.documentElement.style.setProperty("--mx", `${gx}px`);
        document.documentElement.style.setProperty("--my", `${gy}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    cleanups.push(() => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(glowRaf);
      document.documentElement.style.setProperty("--glow", "0");
    });
  }

  const heroCanvas = root.querySelector<HTMLCanvasElement>(".hero-field");
  if (heroCanvas) {
    const field = mountHeroField(heroCanvas);
    cleanups.push(field.destroy);
  }

  const latticeCanvas = root.querySelector<HTMLCanvasElement>(".lattice-field");
  if (latticeCanvas) {
    const lattice = mountLattice(latticeCanvas);
    cleanups.push(lattice.destroy);
  }

  const keyboardCanvas = root.querySelector<HTMLCanvasElement>(".keyboard-field");
  if (keyboardCanvas) {
    const keyboard = mountKeyboard(keyboardCanvas);
    cleanups.push(keyboard.destroy);
  }

  const keyboardCount = root.querySelector<HTMLElement>(".keyboard-count");
  const onInputCount = (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (!keyboardCount || target?.id !== "txt") return;
    const n = (target as HTMLTextAreaElement).value.length;
    keyboardCount.textContent = `${n} ${n === 1 ? "caractere" : "caracteres"} · só neste aparelho`;
  };
  document.addEventListener("input", onInputCount);
  cleanups.push(() => document.removeEventListener("input", onInputCount));

  const globeCanvas = root.querySelector<HTMLCanvasElement>(".region-field");
  if (globeCanvas) {
    const globe = mountRegionGlobe(globeCanvas);
    cleanups.push(globe.destroy);
    const regionName = root.querySelector<HTMLElement>(".region-name");
    const regionCoords = root.querySelector<HTMLElement>(".region-coords");
    const onRegion = (e: Event) => {
      const detail = (e as CustomEvent<{ lat: number; lon: number; country?: string; city?: string }>).detail;
      if (!detail || typeof detail.lat !== "number" || typeof detail.lon !== "number") return;
      globe.setLocation(detail.lat, detail.lon);
      if (regionName && detail.country && detail.city) regionName.textContent = `${detail.country} · ${detail.city}`;
      if (regionCoords) regionCoords.textContent = `${detail.lat.toFixed(2)}°, ${detail.lon.toFixed(2)}°`;
    };
    window.addEventListener("br:region", onRegion);
    cleanups.push(() => window.removeEventListener("br:region", onRegion));
  }

  const process = root.querySelector<HTMLElement>("#processo");
  const morphCanvas = root.querySelector<HTMLCanvasElement>(".morph-field");
  const morph = morphCanvas ? mountMorphField(morphCanvas) : null;
  if (morph) cleanups.push(morph.destroy);

  const processSteps = process ? Array.from(process.querySelectorAll<HTMLElement>("[data-process-step]")) : [];
  let processActive = -1;
  const processCount = process?.querySelector<HTMLElement>(".process-count");
  const processBar = process?.querySelector<HTMLElement>(".process-progress span");

  const chapters = Array.from(root.querySelectorAll<HTMLElement>("[data-chapter]"));
  const chapterLinks = Array.from(root.querySelectorAll<HTMLElement>("[data-chapter-link]"));

  let raf = 0;
  const update = () => {
    raf = 0;
    const vh = window.innerHeight || 1;
    const docH = document.documentElement.scrollHeight;
    const progress = clamp(window.scrollY / Math.max(1, docH - vh));
    document.documentElement.style.setProperty("--scroll", progress.toFixed(4));

    if (process && processSteps.length) {
      let active = 0;
      const threshold = vh * 0.58;
      processSteps.forEach((el, i) => {
        if (el.getBoundingClientRect().top <= threshold) active = i;
      });
      if (active !== processActive) {
        processActive = active;
        processSteps.forEach((el, i) => el.classList.toggle("is-active", i === active));
        processCount && (processCount.textContent = `${String(active + 1).padStart(2, "0")} / 04`);
        morph?.setStep(active);
      }
      const current = processSteps[active];
      const next = processSteps[active + 1];
      const curTop = current.getBoundingClientRect().top;
      const nextTop = next ? next.getBoundingClientRect().top : curTop + 1;
      const frac = next ? clamp((vh * 0.58 - curTop) / Math.max(1, nextTop - curTop)) : 1;
      const p = (active + frac) / processSteps.length;
      processBar?.style.setProperty("--p", clamp(p, 0.02, 1).toFixed(4));
    }

    let activeChapter = chapters[0]?.dataset.chapter ?? "";
    for (const section of chapters) {
      if (section.getBoundingClientRect().top <= vh * 0.45) activeChapter = section.dataset.chapter ?? activeChapter;
    }
    for (const link of chapterLinks) {
      const on = link.dataset.chapterLink === activeChapter;
      link.classList.toggle("is-active", on);
      if (on) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
    if (chapters.length) document.body.dataset.scene = activeChapter;
  };

  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(update);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  cleanups.push(() => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    cancelAnimationFrame(raf);
  });

  update();
  return () => {
    for (const fn of cleanups) fn();
    delete document.body.dataset.scene;
  };
}

/* ---------- rede de grafeno (custódia Arkiv) ---------- */

export function mountLattice(canvas: HTMLCanvasElement): { destroy: () => void } {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { destroy: () => {} };

  const reduce = prefersReduced();
  const R = 40;
  const hStep = R * 1.5;
  const vStep = Math.sqrt(3) * R;
  const hexes: { x: number; y: number }[] = [];
  for (let q = -4; q <= 4; q++) {
    for (let r = -4; r <= 4; r++) {
      if (Math.abs(q + r) > 4) continue;
      hexes.push({ x: q * hStep, y: r * vStep + (Math.abs(q) % 2 === 1 ? vStep / 2 : 0) });
    }
  }
  const nodes: { x: number; y: number; accent: boolean; hue: number }[] = [];
  hexes.forEach((hex, hi) => {
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      nodes.push({ x: hex.x + Math.cos(a) * R, y: hex.y + Math.sin(a) * R, accent: (hi * 6 + i) % 31 === 0, hue: (hi + i) % 7 });
    }
  });
  const packets = Array.from({ length: 10 }, (_, i) => ({
    hex: (i * 13 + 7) % hexes.length,
    edge: (i * 5 + 2) % 6,
    speed: 0.07 + (i % 4) * 0.03,
    phase: (i * 0.37) % 1,
  }));

  let width = 0;
  let height = 0;
  let raf = 0;
  let mx = 0;
  let my = 0;
  let tx = 0;
  let ty = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const paint = (now: number) => {
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    mx += (tx - mx) * 0.05;
    my += (ty - my) * 0.05;

    const cx = width / 2;
    const cy = height * 0.53;
    const zoom = Math.min(width / 640, height / 470);
    const yaw = 0.5 + (reduce ? 0 : now * 0.000075) + mx * 0.22;
    const tilt = 1.0 + my * 0.08;
    const f = 1250;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    const project = (x: number, y: number) => {
      const x1 = x * cosY;
      const z1 = -x * sinY;
      const y1 = y * cosT - z1 * sinT;
      const z2 = y * sinT + z1 * cosT;
      const s = f / (f + z2);
      return { x: cx + x1 * s * zoom, y: cy + y1 * s * zoom, depth: clamp((z2 + 420) / 840) };
    };

    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, width * 0.52);
    halo.addColorStop(0, "rgba(122, 162, 255, 0.13)");
    halo.addColorStop(0.5, "rgba(180, 107, 255, 0.055)");
    halo.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);

    for (const [hi, hex] of hexes.entries()) {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i;
        return project(hex.x + Math.cos(a) * R, hex.y + Math.sin(a) * R);
      });
      const depth = pts.reduce((sum, p) => sum + p.depth, 0) / pts.length;
      const color = hi % 11 === 0 ? "56, 224, 200" : hi % 7 === 0 ? "180, 140, 255" : "150, 180, 255";
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.strokeStyle = `rgba(${color}, ${(0.055 + depth * 0.2).toFixed(3)})`;
      ctx.lineWidth = 0.7 + depth * 0.75;
      ctx.stroke();
    }

    if (!reduce) {
      const sy = ((now * 0.028) % (height + 200)) - 100;
      const scan = ctx.createLinearGradient(0, sy - 45, 0, sy + 45);
      scan.addColorStop(0, "rgba(122, 162, 255, 0)");
      scan.addColorStop(0.5, "rgba(150, 195, 255, 0.06)");
      scan.addColorStop(1, "rgba(122, 162, 255, 0)");
      ctx.fillStyle = scan;
      ctx.fillRect(0, sy - 45, width, 90);
    }

    for (const node of nodes) {
      const p = project(node.x, node.y);
      const r = (node.accent ? 2.7 : 1.25) * (0.65 + p.depth * 1.1);
      if (node.accent) {
        ctx.save();
        ctx.shadowColor = "rgba(56, 224, 200, 0.9)";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fillStyle = `rgba(120, 240, 220, ${(0.35 + p.depth * 0.5).toFixed(3)})`;
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fillStyle = `rgba(170, 195, 255, ${(0.08 + p.depth * 0.42).toFixed(3)})`;
        ctx.fill();
      }
    }

    if (!reduce) {
      for (const packet of packets) {
        const hex = hexes[packet.hex];
        const t = (now * 0.00008 * packet.speed * 60 + packet.phase) % 1;
        const a0 = (Math.PI / 3) * packet.edge;
        const a1 = (Math.PI / 3) * ((packet.edge + 1) % 6);
        const x = hex.x + Math.cos(a0) * R + (Math.cos(a1) - Math.cos(a0)) * R * t;
        const y = hex.y + Math.sin(a0) * R + (Math.sin(a1) - Math.sin(a0)) * R * t;
        const p = project(x, y);
        ctx.save();
        ctx.shadowColor = "rgba(150, 190, 255, 0.9)";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.9, 0, TAU);
        ctx.fillStyle = `rgba(225, 238, 255, ${(0.25 + p.depth * 0.6).toFixed(3)})`;
        ctx.fill();
        ctx.restore();
      }
    }
  };

  const onPointer = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    tx = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
    ty = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
  };
  const onLeave = () => {
    tx = 0;
    ty = 0;
  };
  const loop = (now: number) => {
    paint(now);
    raf = requestAnimationFrame(loop);
  };

  const ro = new ResizeObserver(() => {
    resize();
    if (reduce) paint(0);
  });
  ro.observe(canvas);
  resize();
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerleave", onLeave);
  if (reduce) paint(0);
  else raf = requestAnimationFrame(loop);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerleave", onLeave);
    },
  };
}

/* ---------- teclado físico (só visual, processado no aparelho) ---------- */

const KEY_ROWS = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
type KeyCap = { key: string; label: string; x: number; y: number; w: number; h: number; depth: number };

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

export function mountKeyboard(canvas: HTMLCanvasElement): { destroy: () => void } {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { destroy: () => {} };

  const reduce = prefersReduced();
  let width = 0;
  let height = 0;
  let raf = 0;
  let caps: KeyCap[] = [];
  const pressed = new Map<string, number>();

  const layout = () => {
    caps = [];
    const padX = Math.max(8, width * 0.05);
    const padTop = height * 0.1;
    const gap = Math.max(3, width * 0.008);
    const baseW = Math.min((width - padX * 2 - gap * 9) / 10, (height - padTop * 1.7) / 5.15);
    const baseH = baseW * 0.92;
    let y = padTop;
    KEY_ROWS.forEach((row, r) => {
      const s = 0.9 + r * 0.034;
      const kw = baseW * s;
      const kh = baseH * s;
      const rowW = row.length * kw + (row.length - 1) * gap;
      let x = (width - rowW) / 2;
      for (const ch of row) {
        caps.push({ key: ch, label: ch.toUpperCase(), x, y, w: kw, h: kh, depth: kh * 0.15 });
        x += kw + gap;
      }
      y += kh * 0.99;
    });
    const s = 0.9 + KEY_ROWS.length * 0.034;
    const kw = baseW * s * 4.4;
    const kh = baseH * s;
    caps.push({ key: " ", label: "espaço", x: (width - kw) / 2, y, w: kw, h: kh, depth: kh * 0.15 });
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout();
    if (reduce) paint(0);
  };

  const paint = (now: number) => {
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);

    const halo = ctx.createRadialGradient(width / 2, height * 0.56, 0, width / 2, height * 0.56, width * 0.6);
    halo.addColorStop(0, "rgba(122, 162, 255, 0.1)");
    halo.addColorStop(0.55, "rgba(180, 107, 255, 0.04)");
    halo.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);

    for (const cap of caps) {
      const t = pressed.get(cap.key);
      const age = t === undefined ? 1 : clamp((now - t) / 220);
      const press = t === undefined ? 0 : (1 - age) ** 2;
      const y = cap.y + press * Math.max(2, cap.h * 0.13);
      const radius = Math.max(3, cap.h * 0.2);

      roundRect(ctx, cap.x, y + cap.depth * 0.55, cap.w, cap.h + cap.depth, radius);
      const side = ctx.createLinearGradient(0, y, 0, y + cap.h + cap.depth);
      side.addColorStop(0, "rgba(15, 20, 37, 0.98)");
      side.addColorStop(1, "rgba(5, 8, 17, 0.98)");
      ctx.fillStyle = side;
      ctx.fill();

      roundRect(ctx, cap.x, y, cap.w, cap.h, radius);
      if (press > 0.02) {
        const g = ctx.createLinearGradient(cap.x, y, cap.x + cap.w, y + cap.h);
        g.addColorStop(0, "rgba(122, 162, 255, 0.96)");
        g.addColorStop(1, "rgba(180, 107, 255, 0.9)");
        ctx.save();
        ctx.shadowColor = "rgba(140, 170, 255, 0.9)";
        ctx.shadowBlur = 20 * press;
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = "rgba(222, 233, 255, 0.75)";
        ctx.lineWidth = 1;
      } else {
        const g = ctx.createLinearGradient(0, y, 0, y + cap.h);
        g.addColorStop(0, "rgba(32, 40, 68, 0.92)");
        g.addColorStop(1, "rgba(13, 18, 34, 0.96)");
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = "rgba(160, 180, 230, 0.14)";
        ctx.lineWidth = 1;
      }
      ctx.stroke();

      ctx.fillStyle = press > 0.2 ? "rgba(255, 255, 255, 0.98)" : "rgba(186, 200, 232, 0.58)";
      ctx.font = `${Math.max(7, cap.h * 0.29)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cap.label, cap.x + cap.w / 2, y + cap.h / 2 + (press > 0.2 ? 1 : 0));
    }
  };

  const keyFromEvent = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return "";
    if (e.code === "Space") return " ";
    if (e.code.startsWith("Key")) return e.code.slice(3).toLowerCase();
    if (e.code.startsWith("Digit")) return e.code.slice(5);
    return /^[a-z0-9]$/i.test(e.key) ? e.key.toLowerCase() : "";
  };

  const onKey = (e: KeyboardEvent) => {
    const key = keyFromEvent(e);
    if (!key) return;
    pressed.set(key, performance.now());
    if (reduce) requestAnimationFrame((now) => paint(now));
  };

  const onPointerDown = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (const cap of caps) {
      if (x >= cap.x && x <= cap.x + cap.w && y >= cap.y && y <= cap.y + cap.h + cap.depth) {
        pressed.set(cap.key, performance.now());
        break;
      }
    }
    if (reduce) requestAnimationFrame((now) => paint(now));
  };

  const loop = (now: number) => {
    paint(now);
    raf = requestAnimationFrame(loop);
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  window.addEventListener("keydown", onKey);
  canvas.addEventListener("pointerdown", onPointerDown);
  if (!reduce) raf = requestAnimationFrame(loop);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onPointerDown);
    },
  };
}

/* ---------- globo com pin de região ---------- */

const DEG = Math.PI / 180;

export function mountRegionGlobe(canvas: HTMLCanvasElement): { setLocation: (lat: number, lon: number) => void; destroy: () => void } {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { setLocation: () => {}, destroy: () => {} };

  const reduce = prefersReduced();
  let width = 0;
  let height = 0;
  let raf = 0;
  let mx = 0;
  let my = 0;
  let tx = 0;
  let ty = 0;
  let lat = Number(canvas.dataset.lat ?? -23.55);
  let lon = Number(canvas.dataset.lon ?? -46.63);
  let pulse = 0;

  const yawFor = (la: number, lo: number) => {
    const phi = (90 - la) * DEG;
    const th = lo * DEG;
    return Math.atan2(-Math.sin(phi) * Math.cos(th), Math.sin(phi) * Math.sin(th));
  };

  let target = yawFor(lat, lon);
  let yaw = target - 1.5;

  const stars = Array.from({ length: 52 }, (_, i) => ({
    x: ((i * 73) % 97) / 97,
    y: ((i * 41) % 89) / 89,
    s: 0.45 + (i % 5) * 0.16,
    ph: i * 0.7,
  }));

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reduce) paint(0);
  };

  const paint = (now: number) => {
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    mx += (tx - mx) * 0.05;
    my += (ty - my) * 0.05;

    const cx = width / 2 + mx * 8;
    const cy = height * 0.5 + my * 6;
    const R = Math.min(width * 0.33, height * 0.38);

    for (const star of stars) {
      const tw = reduce ? 0.5 : (Math.sin(now * 0.001 + star.ph) + 1) / 2;
      ctx.beginPath();
      ctx.arc(star.x * width, star.y * height, star.s, 0, TAU);
      ctx.fillStyle = `rgba(190, 210, 255, ${(0.05 + tw * 0.14).toFixed(3)})`;
      ctx.fill();
    }

    const wobble = reduce ? 0 : Math.sin(now * 0.00022) * 0.13;
    const drift = target + wobble - yaw;
    const delta = Math.atan2(Math.sin(drift), Math.cos(drift));
    yaw += reduce ? delta : delta * 0.055;
    const cyaw = Math.cos(yaw);
    const syaw = Math.sin(yaw);

    const toScreen = (la: number, lo: number) => {
      const phi = (90 - la) * DEG;
      const th = lo * DEG;
      const x0 = Math.sin(phi) * Math.cos(th);
      const z0 = Math.sin(phi) * Math.sin(th);
      const y0 = Math.cos(phi);
      const x1 = x0 * cyaw + z0 * syaw;
      const z1 = -x0 * syaw + z0 * cyaw;
      return { x: cx + x1 * R, y: cy - y0 * R, z: z1 };
    };

    const bg = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.42, R * 0.06, cx, cy, R * 1.18);
    bg.addColorStop(0, "rgba(48, 62, 106, 0.62)");
    bg.addColorStop(0.55, "rgba(12, 17, 34, 0.88)");
    bg.addColorStop(1, "rgba(3, 5, 12, 0.94)");
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.strokeStyle = "rgba(150, 180, 255, 0.24)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const ring = (pts: { x: number; y: number; z: number }[]) => {
      for (const front of [false, true]) {
        let drawing = false;
        ctx.beginPath();
        for (const p of pts) {
          if (front ? p.z < 0 : p.z >= 0) {
            drawing = false;
            continue;
          }
          if (drawing) ctx.lineTo(p.x, p.y);
          else {
            ctx.moveTo(p.x, p.y);
            drawing = true;
          }
        }
        ctx.strokeStyle = front ? "rgba(160, 190, 255, 0.19)" : "rgba(150, 180, 255, 0.055)";
        ctx.lineWidth = front ? 0.9 : 0.7;
        ctx.stroke();
      }
    };

    for (let la = -60; la <= 60; la += 30) {
      const pts = [];
      for (let lo = -180; lo <= 180; lo += 6) pts.push(toScreen(la, lo));
      ring(pts);
    }
    for (let lo = -180; lo < 180; lo += 30) {
      const pts = [];
      for (let la = -90; la <= 90; la += 6) pts.push(toScreen(la, lo));
      ring(pts);
    }

    for (let i = 0; i < 90; i++) {
      const y0 = 1 - (i / 89) * 2;
      const rr = Math.sqrt(Math.max(0, 1 - y0 * y0));
      const th = i * 2.399963229728653;
      const x0 = Math.cos(th) * rr;
      const z0 = Math.sin(th) * rr;
      const x1 = x0 * cyaw + z0 * syaw;
      const z1 = -x0 * syaw + z0 * cyaw;
      if (z1 < 0) continue;
      ctx.beginPath();
      ctx.arc(cx + x1 * R, cy - y0 * R, 0.8 + z1 * 0.9, 0, TAU);
      ctx.fillStyle = `rgba(170, 200, 255, ${(0.1 + z1 * 0.36).toFixed(3)})`;
      ctx.fill();
    }

    const pin = toScreen(lat, lon);
    if (pin.z > -0.05) {
      const front = clamp((pin.z + 0.25) / 1.25, 0, 1);
      const beat = reduce ? 0.4 : (Math.sin((now - pulse) * 0.0035) + 1) / 2;
      const scale = R / 118;

      ctx.beginPath();
      ctx.arc(pin.x, pin.y, (7 + beat * 13) * scale, 0, TAU);
      ctx.strokeStyle = `rgba(56, 224, 200, ${(0.32 * (1 - beat) * front).toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, 4.2 * scale, 0, TAU);
      ctx.save();
      ctx.shadowColor = "rgba(56, 224, 200, 0.95)";
      ctx.shadowBlur = 14;
      ctx.fillStyle = `rgba(140, 245, 225, ${(0.55 + front * 0.35).toFixed(3)})`;
      ctx.fill();
      ctx.restore();

      const tipY = pin.y;
      const headY = pin.y - 25 * scale;
      const pw = 7.6 * scale;
      ctx.beginPath();
      ctx.moveTo(pin.x, tipY);
      ctx.quadraticCurveTo(pin.x - pw * 0.7, headY + pw, pin.x - pw, headY);
      ctx.arc(pin.x, headY, pw, Math.PI, 0);
      ctx.quadraticCurveTo(pin.x + pw * 0.7, headY + pw, pin.x, tipY);
      ctx.closePath();
      const pg = ctx.createLinearGradient(pin.x - pw, headY - pw, pin.x + pw, headY + pw);
      pg.addColorStop(0, "rgba(144, 180, 255, 0.98)");
      pg.addColorStop(1, "rgba(180, 107, 255, 0.95)");
      ctx.save();
      ctx.shadowColor = "rgba(122, 162, 255, 0.9)";
      ctx.shadowBlur = 18;
      ctx.fillStyle = pg;
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(pin.x, headY, pw * 0.36, 0, TAU);
      ctx.fillStyle = "rgba(7, 11, 22, 0.9)";
      ctx.fill();
    }
  };

  const loop = (now: number) => {
    paint(now);
    raf = requestAnimationFrame(loop);
  };

  const onPointer = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    tx = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
    ty = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
  };
  const onLeave = () => {
    tx = 0;
    ty = 0;
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerleave", onLeave);
  if (reduce) paint(0);
  else raf = requestAnimationFrame(loop);

  return {
    setLocation(nextLat: number, nextLon: number) {
      lat = nextLat;
      lon = nextLon;
      target = yawFor(lat, lon);
      pulse = performance.now();
      if (reduce) {
        yaw = target;
        paint(0);
      }
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerleave", onLeave);
    },
  };
}
