/**
 * Pixel noise field with center bloom.
 * Runs on a 2D canvas at reduced resolution for performance,
 * then gets scaled up for that chunky pixel aesthetic.
 */

const PIXEL_RATIO = 3;  // lower = chunkier pixels
const BLOOM_RADIUS = 0.35;
const BLOOM_INTENSITY = 1.6;
const BASE_NOISE_ALPHA = 0.7;
const ACCENT_R = 139, ACCENT_G = 92, ACCENT_B = 246; // matches --accent

export function initNoise(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  let w, h, sw, sh, imageData, data;
  let frame = 0;
  let mx = 0.5, my = 0.5; // normalized mouse/touch position
  let running = true;

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    sw = Math.ceil(w / PIXEL_RATIO);
    sh = Math.ceil(h / PIXEL_RATIO);
    imageData = ctx.createImageData(sw, sh);
    data = imageData.data;
  }

  function onPointer(e) {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    mx = x / w;
    my = y / h;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onPointer, { passive: true });
  window.addEventListener('touchmove', onPointer, { passive: true });
  resize();

  function render() {
    if (!running) return;
    frame++;

    const time = frame * 0.008;
    // bloom center drifts slightly toward pointer
    const cx = 0.5 + (mx - 0.5) * 0.15;
    const cy = 0.5 + (my - 0.5) * 0.15;

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const i = (y * sw + x) * 4;

        // distance from bloom center (normalized)
        const dx = (x / sw) - cx;
        const dy = (y / sh) - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // bloom falloff
        const bloom = Math.max(0, 1 - dist / BLOOM_RADIUS);
        const bloomVal = bloom * bloom * BLOOM_INTENSITY;

        // noise
        const noise = Math.random();
        const n = noise * BASE_NOISE_ALPHA;

        // base dark pixel
        const base = 6 + n * 14;

        // accent bleed in bloom zone
        const accent = bloomVal * (0.3 + noise * 0.2);

        data[i]     = base + accent * ACCENT_R | 0;  // R
        data[i + 1] = base + accent * ACCENT_G * 0.4 | 0;  // G
        data[i + 2] = base + accent * ACCENT_B * 0.6 | 0;  // B
        data[i + 3] = 255;  // A
      }
    }

    // draw at small size then scale up
    ctx.putImageData(imageData, 0, 0);

    // scale up with nearest-neighbor for chunky pixels
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      canvas,
      0, 0, sw, sh,
      0, 0, w, h
    );

    requestAnimationFrame(render);
  }

  // slight flicker: every ~2s, skip a few frames of noise for a "glitch"
  // (handled naturally by random noise, but we add a subtle brightness pulse)

  requestAnimationFrame(render);

  return () => { running = false; };
}
