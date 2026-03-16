/**
 * Particle flow field.
 * Particles follow Simplex-like noise vectors, denser near center.
 * Pointer interaction gently warps the field.
 */

// ── Cheap 2D noise (good enough, no deps) ───────
// Based on a simple hash-based gradient noise
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263 + 1013904223) | 0;
  h = ((h >> 13) ^ h) | 0;
  h = (h * (h * h * 15731 + 789221) + 1376312589) | 0;
  return h;
}

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + t * (b - a); }

function grad(hash, x, y) {
  const h = hash & 3;
  const u = h < 2 ? x : -x;
  const v = h === 0 || h === 3 ? y : -y;
  return u + v;
}

function noise2D(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = fade(xf), v = fade(yf);

  const aa = hash(xi, yi);
  const ab = hash(xi, yi + 1);
  const ba = hash(xi + 1, yi);
  const bb = hash(xi + 1, yi + 1);

  return lerp(
    lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
    lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
    v
  ) * 0.5 + 0.5;
}

// ── Config ───────────────────────────────────────
const PARTICLE_COUNT_DESKTOP = 6000;
const PARTICLE_COUNT_MOBILE = 2500;
const NOISE_SCALE = 0.003;
const NOISE_SPEED = 0.0004;
const PARTICLE_SPEED = 1.2;
const PARTICLE_ALPHA_BASE = 0.35;
const PARTICLE_ALPHA_CENTER = 0.85;
const CENTER_PULL = 0.0003;
const ACCENT_R = 139, ACCENT_G = 92, ACCENT_B = 246;

export function initFlow(canvas) {
  const ctx = canvas.getContext('2d');
  let w, h, particles;
  let mx = 0.5, my = 0.5;
  let running = true;
  let time = 0;

  const isMobile = window.innerWidth < 768;
  const count = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;

  function createParticle() {
    // bias toward center using gaussian-ish distribution
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.5;
    const cx = 0.5 + Math.cos(angle) * radius * (0.4 + Math.random() * 0.6);
    const cy = 0.5 + Math.sin(angle) * radius * (0.4 + Math.random() * 0.6);
    return {
      x: cx * w,
      y: cy * h,
      size: 0.5 + Math.random() * 1,
      life: Math.random() * 300 + 100,
      age: 0,
    };
  }

  function init() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * devicePixelRatio;
    canvas.height = h * devicePixelRatio;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    particles = Array.from({ length: count }, createParticle);
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
    time++;

    // fade trail
    ctx.fillStyle = 'rgba(8, 8, 12, 0.12)';
    ctx.fillRect(0, 0, w, h);

    const t = time * NOISE_SPEED;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.age++;

      if (p.age > p.life || p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) {
        particles[i] = createParticle();
        continue;
      }

      // flow field angle from noise
      const n = noise2D(p.x * NOISE_SCALE + t, p.y * NOISE_SCALE + t);
      const angle = n * Math.PI * 4;

      // pointer influence
      const pdx = mx - p.x / w;
      const pdy = my - p.y / h;
      const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
      const pInfluence = Math.max(0, 1 - pDist / 0.3) * 0.4;

      // velocity
      let vx = Math.cos(angle) * PARTICLE_SPEED;
      let vy = Math.sin(angle) * PARTICLE_SPEED;

      // gentle pull toward center
      const cdx = w * 0.5 - p.x;
      const cdy = h * 0.5 - p.y;
      vx += cdx * CENTER_PULL;
      vy += cdy * CENTER_PULL;

      // pointer warp
      vx += pdx * pInfluence;
      vy += pdy * pInfluence;

      p.x += vx;
      p.y += vy;

      // alpha: brighter near center, fade at edges of life
      const cx = p.x / w - 0.5;
      const cy = p.y / h - 0.5;
      const cDist = Math.sqrt(cx * cx + cy * cy);
      const centerAlpha = lerp(PARTICLE_ALPHA_CENTER, PARTICLE_ALPHA_BASE, Math.min(1, cDist / 0.5));
      const lifeFade = Math.min(1, p.age / 30) * Math.min(1, (p.life - p.age) / 30);
      const alpha = centerAlpha * lifeFade;

      // color: white near center, accent at edges
      const accentMix = Math.min(1, cDist / 0.4);
      const r = Math.round(lerp(220, ACCENT_R, accentMix));
      const g = Math.round(lerp(220, ACCENT_G, accentMix));
      const b = Math.round(lerp(230, ACCENT_B, accentMix));

      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
  return () => { running = false; };
}
