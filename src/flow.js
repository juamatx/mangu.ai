/**
 * Particle text formation with flow field.
 * Swipe/drag to push particles, they spring back to form the name.
 * Optimized for mobile: capped DPR, reduced particles, no per-frame noise on ambient.
 */

// ── Noise ────────────────────────────────────────
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263 + 1013904223) | 0;
  h = ((h >> 13) ^ h) | 0;
  h = (h * (h * h * 15731 + 789221) + 1376312589) | 0;
  return h;
}
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + t * (b - a); }
function grad(h, x, y) {
  const v = h & 3;
  return (v < 2 ? x : -x) + (v === 0 || v === 3 ? y : -y);
}
function noise2D(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = fade(xf), v = fade(yf);
  return lerp(
    lerp(grad(hash(xi, yi), xf, yf), grad(hash(xi + 1, yi), xf - 1, yf), u),
    lerp(grad(hash(xi, yi + 1), xf, yf - 1), grad(hash(xi + 1, yi + 1), xf - 1, yf - 1), u),
    v
  ) * 0.5 + 0.5;
}

// ── Colors ───────────────────────────────────────
const MANGU_COLORS = [
  [235, 190, 80],
  [220, 170, 60],
  [245, 205, 100],
  [200, 155, 50],
  [250, 220, 130],
];
const AI_COLORS = [
  [20, 160, 90],
  [15, 135, 75],
  [30, 180, 105],
  [10, 110, 60],
  [50, 195, 120],
];
const AMBIENT_COLOR = [100, 88, 60];

// ── Config ───────────────────────────────────────
const NOISE_SCALE = 0.003;
const NOISE_SPEED = 0.0003;
const CONVERGE_FRAMES = 105;
const PUSH_RADIUS = 50;
const PUSH_STRENGTH = 18;
const SPRING_BACK = 0.04;
const DAMPING = 0.72;

function sampleText(text, font, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const cx = c.getContext('2d');
  cx.fillStyle = '#000';
  cx.fillRect(0, 0, w, h);
  cx.font = font;
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillStyle = '#fff';
  cx.fillText(text, w / 2, h / 2);

  const px = cx.getImageData(0, 0, w, h).data;
  const points = [];
  const fullW = cx.measureText(text).width;
  const mangW = cx.measureText('mangu').width;
  const aiX = (w / 2) - (fullW / 2) + mangW;
  const gap = Math.max(2, Math.floor(Math.min(w, h) / 280));

  for (let y = 0; y < h; y += gap) {
    for (let x = 0; x < w; x += gap) {
      if (px[(y * w + x) * 4] > 128) {
        points.push({ x, y, isAi: x >= aiX });
      }
    }
  }
  return points;
}

export function initFlow(canvas) {
  const ctx = canvas.getContext('2d');
  const glow = document.getElementById('glow');
  let w, h;
  let mxPx = -9999, myPx = -9999;
  let running = true;
  let frame = 0;
  let textFrame = -1;
  let textParticles = null;

  const isMobile = window.innerWidth < 768;
  const ambientCount = isMobile ? 300 : 1200;
  // cap DPR at 2 — 3x on iPhones is overkill for particles
  const dpr = Math.min(devicePixelRatio, 2);
  let ambientParticles;

  function makeAmbient() {
    const r = Math.random();
    const depth = r < 0.5 ? 0 : r < 0.8 ? 1 : 2;
    const sizeScale = [0.4, 0.7, 1.2][depth];
    const alphaScale = [0.6, 0.85, 1][depth];

    return {
      x: Math.random() * w,
      y: Math.random() * h,
      // pre-bake velocity direction (no per-frame noise on mobile)
      angle: Math.random() * Math.PI * 2,
      speed: (0.3 + Math.random() * 0.5) * [0.5, 0.8, 1.2][depth],
      size: (0.5 + Math.random() * 0.8) * sizeScale,
      alpha: (0.08 + Math.random() * 0.15) * alphaScale,
      depth,
    };
  }

  function sizeCanvas() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initAmbient() {
    ambientParticles = Array.from({ length: ambientCount }, makeAmbient);
  }

  function buildTextParticles() {
    const fontSize = Math.min(w * 0.12, 120);
    const font = `500 ${fontSize}px 'JetBrains Mono', monospace`;
    const targets = sampleText('mangu.ai', font, w, h);
    const maxDist = Math.sqrt(w * w + h * h) / 2;

    textParticles = targets.map((tgt) => {
      const colors = tgt.isAi ? AI_COLORS : MANGU_COLORS;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const dx = tgt.x - w / 2, dy = tgt.y - h / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delay = (dist / maxDist) * 0.3 + Math.random() * 0.2;

      return {
        x: Math.random() * w, y: Math.random() * h,
        vx: 0, vy: 0,
        tx: tgt.x, ty: tgt.y,
        color, size: 1 + Math.random() * 0.8, delay,
        driftAngle: Math.random() * Math.PI * 2,
        driftSpeed: 0.005 + Math.random() * 0.01,
        driftRadius: 0.5 + Math.random() * 1,
      };
    });
    textFrame = 0;
  }

  function onPointer(e) {
    e.preventDefault();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    mxPx = x; myPx = y;
    if (glow) {
      glow.style.display = 'block';
      glow.style.left = x + 'px';
      glow.style.top = y + 'px';
    }
  }

  function onPointerLeave() {
    mxPx = -9999; myPx = -9999;
    if (glow) glow.style.display = 'none';
  }

  function onResize() {
    sizeCanvas();
    initAmbient();
    if (textParticles) buildTextParticles();
  }

  window.addEventListener('resize', onResize);
  window.addEventListener('mousemove', onPointer, { passive: true });
  window.addEventListener('touchmove', onPointer, { passive: false });
  window.addEventListener('mouseleave', onPointerLeave);
  window.addEventListener('touchend', onPointerLeave);

  sizeCanvas();
  initAmbient();

  // pre-compute ambient color string once
  const ambColorStr = `${AMBIENT_COLOR[0]},${AMBIENT_COLOR[1]},${AMBIENT_COLOR[2]}`;

  function render() {
    if (!running) return;
    frame++;
    if (textFrame >= 0) textFrame++;

    ctx.fillStyle = 'rgba(10, 15, 12, 0.15)';
    ctx.fillRect(0, 0, w, h);

    const t = frame * NOISE_SPEED;

    // ── Ambient (lightweight — no per-frame noise on mobile) ──
    for (let i = 0; i < ambientParticles.length; i++) {
      const p = ambientParticles[i];
      // slow drift + very occasional direction change
      if (frame % 120 === 0) p.angle += (Math.random() - 0.5) * 0.5;
      p.x += Math.cos(p.angle) * p.speed;
      p.y += Math.sin(p.angle) * p.speed;
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;

      ctx.fillStyle = `rgba(${ambColorStr},${p.alpha})`;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    // ── Text particles ─────────────────────────
    if (textParticles && textFrame >= 0) {
      const raw = Math.max(0, Math.min(1, textFrame / CONVERGE_FRAMES));
      const globalOrder = raw * raw * (3 - 2 * raw);

      for (let i = 0; i < textParticles.length; i++) {
        const p = textParticles[i];
        const pRaw = Math.max(0, Math.min(1, (globalOrder - p.delay * 0.3) / 0.7));
        const order = pRaw * pRaw * (3 - 2 * pRaw);

        let targetX = p.tx, targetY = p.ty;
        if (order >= 1) {
          p.driftAngle += p.driftSpeed;
          targetX = p.tx + Math.cos(p.driftAngle) * p.driftRadius;
          targetY = p.ty + Math.sin(p.driftAngle) * p.driftRadius;
        }

        const dx = targetX - p.x;
        const dy = targetY - p.y;

        if (order < 1) {
          const n = noise2D(p.x * NOISE_SCALE + t, p.y * NOISE_SCALE + t);
          const a = n * Math.PI * 4;
          p.vx += lerp(Math.cos(a) * 0.2, dx * SPRING_BACK, order);
          p.vy += lerp(Math.sin(a) * 0.2, dy * SPRING_BACK, order);
        } else {
          p.vx += dx * SPRING_BACK;
          p.vy += dy * SPRING_BACK;
        }

        // pointer push
        const pdx = p.x - mxPx;
        const pdy = p.y - myPx;
        const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pDist < PUSH_RADIUS && pDist > 0) {
          const force = (1 - pDist / PUSH_RADIUS) * PUSH_STRENGTH;
          p.vx += (pdx / pDist) * force;
          p.vy += (pdy / pDist) * force;
        }

        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.x += p.vx;
        p.y += p.vy;

        const alpha = lerp(0.3, 0.9, order);
        const [r, g, b] = p.color;
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

  return {
    startText: buildTextParticles,
    destroy: () => { running = false; },
  };
}
