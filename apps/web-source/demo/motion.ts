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
