/**
 * Particle flow field with chaos-to-order transition.
 * Particles start scattered, then converge into orbits around center.
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

// ── Config ───────────────────────────────────────
const COUNT_DESKTOP = 5000;
const COUNT_MOBILE = 2000;
const NOISE_SCALE = 0.003;
const NOISE_SPEED = 0.0003;
const ACCENT_R = 139, ACCENT_G = 92, ACCENT_B = 246;

// Transition timing (frames)
const CONVERGE_START = 60;    // start pulling in after 1s
const CONVERGE_END = 360;     // fully ordered by ~6s
const CONVERGE_DURATION = CONVERGE_END - CONVERGE_START;

export function initFlow(canvas) {
  const ctx = canvas.getContext('2d');
  let w, h, particles;
  let mx = 0.5, my = 0.5;
  let running = true;
  let frame = 0;

  const isMobile = window.innerWidth < 768;
  const count = isMobile ? COUNT_MOBILE : COUNT_DESKTOP;

  // Orbit radii bands — particles settle into rings
  const BANDS = [0.06, 0.10, 0.15, 0.21, 0.28, 0.36, 0.44];

  function createParticle() {
    // start fully scattered
    const x = Math.random() * w;
    const y = Math.random() * h;

    // assign an orbit band + slight offset for organic feel
    const band = BANDS[Math.floor(Math.random() * BANDS.length)];
    const orbitRadius = band + (Math.random() - 0.5) * 0.03;
    const orbitAngle = Math.random() * Math.PI * 2;
    const orbitSpeed = (0.002 + Math.random() * 0.004) * (Math.random() < 0.5 ? 1 : -1);

    return {
      x, y,
      orbitRadius,
      orbitAngle,
      orbitSpeed,
      size: 0.5 + Math.random() * 1,
      life: 400 + Math.random() * 300,
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
    frame++;

    // fade trail
    ctx.fillStyle = 'rgba(8, 8, 12, 0.1)';
    ctx.fillRect(0, 0, w, h);

    const t = frame * NOISE_SPEED;

    // convergence progress: 0 = chaos, 1 = fully ordered
    const rawProgress = Math.max(0, Math.min(1, (frame - CONVERGE_START) / CONVERGE_DURATION));
    // ease in-out for smooth transition
    const order = rawProgress * rawProgress * (3 - 2 * rawProgress);

    const centerX = w * 0.5;
    const centerY = h * 0.5;
    // use smaller dimension so orbits are circular
    const dim = Math.min(w, h);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.age++;

      if (p.age > p.life) {
        // respawn — if ordered, spawn near orbit; if chaotic, spawn anywhere
        const np = createParticle();
        if (order > 0.5) {
          np.x = centerX + Math.cos(np.orbitAngle) * np.orbitRadius * dim;
          np.y = centerY + Math.sin(np.orbitAngle) * np.orbitRadius * dim;
        }
        np.age = 0;
        particles[i] = np;
        continue;
      }

      // advance orbit angle
      p.orbitAngle += p.orbitSpeed;

      // target position (orbit)
      const tx = centerX + Math.cos(p.orbitAngle) * p.orbitRadius * dim;
      const ty = centerY + Math.sin(p.orbitAngle) * p.orbitRadius * dim;

      // chaotic movement: flow field
      const n = noise2D(p.x * NOISE_SCALE + t, p.y * NOISE_SCALE + t);
      const angle = n * Math.PI * 4;
      const chaosVx = Math.cos(angle) * 1.5;
      const chaosVy = Math.sin(angle) * 1.5;

      // ordered movement: move toward orbit target
      const dx = tx - p.x;
      const dy = ty - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pull = Math.min(dist, 3) / Math.max(dist, 0.01);
      const orderVx = dx * pull * 0.06;
      const orderVy = dy * pull * 0.06;

      // blend chaos and order
      p.x += lerp(chaosVx, orderVx, order);
      p.y += lerp(chaosVy, orderVy, order);

      // pointer warp (subtle)
      const pdx = mx - p.x / w;
      const pdy = my - p.y / h;
      const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
      const pInf = Math.max(0, 1 - pDist / 0.25) * 0.3;
      p.x += pdx * pInf;
      p.y += pdy * pInf;

      // alpha
      const cx = (p.x - centerX) / dim;
      const cy = (p.y - centerY) / dim;
      const cDist = Math.sqrt(cx * cx + cy * cy);
      const centerAlpha = lerp(0.8, 0.25, Math.min(1, cDist / 0.5));
      const lifeFade = Math.min(1, p.age / 40) * Math.min(1, (p.life - p.age) / 40);
      const alpha = centerAlpha * lifeFade;

      // color: white core, accent at edges
      const accentMix = Math.min(1, cDist / 0.35);
      const r = Math.round(lerp(210, ACCENT_R, accentMix));
      const g = Math.round(lerp(210, ACCENT_G, accentMix));
      const b = Math.round(lerp(220, ACCENT_B, accentMix));

      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
  return () => { running = false; };
}
