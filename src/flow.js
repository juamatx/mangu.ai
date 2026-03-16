/**
 * Particle text formation with flow field.
 * Particles converge from chaos to spell "mangú.ai"
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
  [230, 225, 215],
  [215, 210, 200],
  [240, 235, 228],
];
const AI_COLORS = [
  [139, 92, 246],
  [167, 120, 255],
  [110, 70, 220],
];
const AMBIENT_COLOR = [80, 75, 95];

// ── Config ───────────────────────────────────────
const NOISE_SCALE = 0.003;
const NOISE_SPEED = 0.0003;
const CONVERGE_START = 15;
const CONVERGE_END = 120;
const CONVERGE_DURATION = CONVERGE_END - CONVERGE_START;

// ── Sample text pixels ───────────────────────────
function sampleText(text, font, w, h) {
  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const octx = offscreen.getContext('2d');

  octx.fillStyle = '#000';
  octx.fillRect(0, 0, w, h);

  octx.font = font;
  octx.textAlign = 'center';
  octx.textBaseline = 'middle';
  octx.fillStyle = '#fff';
  octx.fillText(text, w / 2, h / 2);

  const imageData = octx.getImageData(0, 0, w, h);
  const pixels = imageData.data;
  const points = [];

  // measure where ".ai" starts
  const fullWidth = octx.measureText(text).width;
  const mangWidth = octx.measureText('mangú').width;
  const aiStartX = (w / 2) - (fullWidth / 2) + mangWidth;

  const gap = Math.max(2, Math.floor(Math.min(w, h) / 280));

  for (let y = 0; y < h; y += gap) {
    for (let x = 0; x < w; x += gap) {
      const i = (y * w + x) * 4;
      if (pixels[i] > 128) {
        const isAi = x >= aiStartX;
        points.push({ x, y, isAi });
      }
    }
  }
  return points;
}

export function initFlow(canvas) {
  const ctx = canvas.getContext('2d');
  let w, h, textParticles, ambientParticles;
  let mx = 0.5, my = 0.5;
  let running = true;
  let frame = 0;

  const isMobile = window.innerWidth < 768;
  const ambientCount = isMobile ? 400 : 1200;

  function getFontSize() {
    return Math.min(window.innerWidth * 0.12, 120);
  }

  function init() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * devicePixelRatio;
    canvas.height = h * devicePixelRatio;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    const fontSize = getFontSize();
    const font = `500 ${fontSize}px 'JetBrains Mono', monospace`;
    const targets = sampleText('mangú.ai', font, w, h);

    // create text particles
    textParticles = targets.map((tgt) => {
      const colors = tgt.isAi ? AI_COLORS : MANGU_COLORS;
      const color = colors[Math.floor(Math.random() * colors.length)];
      // stagger: particles closer to center converge first
      const dx = tgt.x - w / 2;
      const dy = tgt.y - h / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.sqrt(w * w + h * h) / 2;
      const delay = (dist / maxDist) * 0.3 + Math.random() * 0.2;

      // on narrow screens, bias scatter toward center so it looks balanced
      const spread = w < 768 ? 0.6 : 1;
      const sx = (w / 2) + (Math.random() - 0.5) * w * spread;
      const sy = (h / 2) + (Math.random() - 0.5) * h * spread;

      return {
        x: sx,
        y: sy,
        tx: tgt.x,
        ty: tgt.y,
        color,
        size: 1 + Math.random() * 0.8,
        delay,
        settled: false,
        driftAngle: Math.random() * Math.PI * 2,
        driftSpeed: 0.005 + Math.random() * 0.01,
        driftRadius: 0.5 + Math.random() * 1,
      };
    });

    // ambient scattered particles
    ambientParticles = Array.from({ length: ambientCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: 0.5 + Math.random() * 0.8,
      alpha: 0.08 + Math.random() * 0.15,
    }));

    frame = 0;
  }

  function onPointer(e) {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    mx = x / w;
    my = y / h;
  }

  window.addEventListener('resize', init);
  window.addEventListener('mousemove', onPointer, { passive: true });
  window.addEventListener('touchmove', onPointer, { passive: true });
  init();

  function render() {
    if (!running) return;
    frame++;

    // fade trail
    ctx.fillStyle = 'rgba(8, 8, 12, 0.15)';
    ctx.fillRect(0, 0, w, h);

    const t = frame * NOISE_SPEED;
    const rawProgress = Math.max(0, Math.min(1, (frame - CONVERGE_START) / CONVERGE_DURATION));
    const globalOrder = rawProgress * rawProgress * (3 - 2 * rawProgress);

    // ── Ambient particles ──────────────────────
    for (let i = 0; i < ambientParticles.length; i++) {
      const p = ambientParticles[i];
      const n = noise2D(p.x * NOISE_SCALE + t, p.y * NOISE_SCALE + t * 0.7);
      const angle = n * Math.PI * 4;
      p.x += Math.cos(angle) * 0.4 + p.vx;
      p.y += Math.sin(angle) * 0.4 + p.vy;

      // wrap around
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.fillStyle = `rgba(${AMBIENT_COLOR[0]},${AMBIENT_COLOR[1]},${AMBIENT_COLOR[2]},${p.alpha})`;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    // ── Text particles ─────────────────────────
    for (let i = 0; i < textParticles.length; i++) {
      const p = textParticles[i];

      // per-particle progress (staggered by delay)
      const pProgress = Math.max(0, Math.min(1, (globalOrder - p.delay * 0.3) / 0.7));
      const order = pProgress * pProgress * (3 - 2 * pProgress);

      if (order < 1) {
        // chaos phase: flow field movement
        const n = noise2D(p.x * NOISE_SCALE + t, p.y * NOISE_SCALE + t);
        const angle = n * Math.PI * 4;
        const chaosVx = Math.cos(angle) * 1.8;
        const chaosVy = Math.sin(angle) * 1.8;

        // pull toward target
        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        const orderVx = dx * 0.08;
        const orderVy = dy * 0.08;

        p.x += lerp(chaosVx, orderVx, order);
        p.y += lerp(chaosVy, orderVy, order);
      } else {
        // settled: gentle drift around target
        p.driftAngle += p.driftSpeed;
        p.x = p.tx + Math.cos(p.driftAngle) * p.driftRadius;
        p.y = p.ty + Math.sin(p.driftAngle) * p.driftRadius;
      }

      // pointer repel (subtle)
      const pdx = p.x / w - mx;
      const pdy = p.y / h - my;
      const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pDist < 0.08) {
        const force = (1 - pDist / 0.08) * 2;
        p.x += pdx / pDist * force;
        p.y += pdy / pDist * force;
      }

      // alpha: fade in as they converge
      const alpha = lerp(0.3, 0.9, order);

      const [r, g, b] = p.color;
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
  return () => { running = false; };
}
