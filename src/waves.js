import * as THREE from 'three';

// ── GLSL shaders ──────────────────────────────────────────────────────────────

const vert = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Full-screen quad: position.xy is already in [-1,1] NDC
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const frag = /* glsl */`
  precision highp float;

  uniform float uTime;
  varying vec2 vUv;

  // ── Value noise ──────────────────────────────────────────────────
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f); // smoothstep
    return mix(
      mix(hash(i),             hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  // ── Fractional Brownian Motion (5 octaves) ───────────────────────
  // Classic rotation+scale matrix keeps octaves de-correlated
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6); // 36.87° rotation + 2× scale per octave
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p);
      p  = m * p;
      a *= 0.5;
    }
    return clamp(v, 0.0, 1.0);
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.07; // slow, dreamy drift

    // Two FBM layers moving in subtly different directions —
    // their interference creates organic, never-repeating patterns
    float n1 = fbm(uv * 2.3 + vec2(t,        t * 0.55));
    float n2 = fbm(uv * 1.8 + vec2(t * 0.62, t * 1.05) + vec2(1.7, 2.9));
    float wave = mix(n1, n2, 0.42);

    // ── Caribbean color palette ──────────────────────────────────
    // Deep ocean teal → forest green → warm gold → coral
    vec3 cTeal  = vec3(0.051, 0.431, 0.376); // #0d6e60
    vec3 cGreen = vec3(0.169, 0.349, 0.094); // #2b5918
    vec3 cGold  = vec3(0.690, 0.447, 0.035); // #b07209
    vec3 cCoral = vec3(0.757, 0.290, 0.141); // #c14a24

    vec3 color;
    float w = wave;
    if (w < 0.33) {
      color = mix(cTeal,  cGreen, smoothstep(0.0,  0.33, w));
    } else if (w < 0.66) {
      color = mix(cGreen, cGold,  smoothstep(0.33, 0.66, w));
    } else {
      color = mix(cGold,  cCoral, smoothstep(0.66, 1.0,  w));
    }

    // Alpha: semi-transparent — cream bg bleeds through
    float alpha = 0.26 + wave * 0.16; // range ~0.26–0.42

    // Soft edge fade so the canvas blends into the page seamlessly
    vec2 edgeUv = uv;
    float edge =
      smoothstep(0.0, 0.08, edgeUv.x) * smoothstep(1.0, 0.92, edgeUv.x) *
      smoothstep(0.0, 0.08, edgeUv.y) * smoothstep(1.0, 0.92, edgeUv.y);

    gl_FragColor = vec4(color, alpha * edge);
  }
`;

// ── Setup ─────────────────────────────────────────────────────────────────────

export function initWaves(heroEl) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;';
  heroEl.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,       // transparent clear — CSS bg shows through
    antialias: false,  // not needed for fragment shader
    powerPreference: 'low-power',
  });
  // Cap pixel ratio to keep GPU load reasonable
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const scene  = new THREE.Scene();
  // Orthographic camera is unused (full-screen quad bypasses projection),
  // but THREE.WebGLRenderer requires a camera for render().
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uTime = { value: 0.0 };

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms:       { uTime },
      vertexShader:   vert,
      fragmentShader: frag,
      transparent:    true,
      depthWrite:     false,
    })
  );
  scene.add(mesh);

  function resize() {
    renderer.setSize(heroEl.offsetWidth, heroEl.offsetHeight);
  }

  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();

  function tick() {
    uTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();
}
