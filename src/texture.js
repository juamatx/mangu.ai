/**
 * Generates an organic fibrous background texture.
 * Drawn once to a canvas, then set as CSS background.
 */
export function generateTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  // base fill
  ctx.fillStyle = '#1a2420';
  ctx.fillRect(0, 0, size, size);

  // organic fibers — random short strokes at varied angles
  const fibers = 3000;
  for (let i = 0; i < fibers; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 8 + Math.random() * 25;
    const angle = Math.random() * Math.PI * 2;
    const brightness = Math.random();

    // mix of warm gold and green tones, very subtle
    let r, g, b;
    if (brightness < 0.4) {
      // dark green fiber
      r = 15 + Math.random() * 10;
      g = 25 + Math.random() * 15;
      b = 18 + Math.random() * 10;
    } else if (brightness < 0.7) {
      // warm brown/gold fiber
      r = 30 + Math.random() * 15;
      g = 28 + Math.random() * 10;
      b = 15 + Math.random() * 8;
    } else {
      // light accent fiber
      r = 35 + Math.random() * 20;
      g = 35 + Math.random() * 15;
      b = 20 + Math.random() * 10;
    }

    ctx.strokeStyle = `rgba(${r},${g},${b},${0.15 + Math.random() * 0.25})`;
    ctx.lineWidth = 0.5 + Math.random() * 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  // subtle noise grain on top
  const imageData = ctx.getImageData(0, 0, size, size);
  const px = imageData.data;
  for (let i = 0; i < px.length; i += 4) {
    const noise = (Math.random() - 0.5) * 8;
    px[i] += noise;
    px[i + 1] += noise;
    px[i + 2] += noise;
  }
  ctx.putImageData(imageData, 0, 0);

  return c.toDataURL('image/png');
}
