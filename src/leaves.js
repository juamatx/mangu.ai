import gsap from 'gsap';

// Floaters enter from off-screen (exactly like koi.ai's drifting clouds),
// then settle into continuous gentle floating loops.

export function initFloaters() {

  // ── Entrance: drift in from off-screen edges ─────────────────────

  // Leaf 1 — from left
  gsap.fromTo('.leaf-1',
    { x: -260, y: 20, rotation: -8, opacity: 0 },
    { x: 0, y: 0, rotation: 0, opacity: 1, duration: 3.8, ease: 'power2.out', delay: 0.3 }
  );

  // Leaf 2 — from right (already scaleX(-1) in CSS, so enters from its right)
  gsap.fromTo('.leaf-2',
    { x: 240, opacity: 0 },
    { x: 0, opacity: 1, duration: 4.3, ease: 'power2.out', delay: 0.9 }
  );

  // Leaf 3 — from bottom-left
  gsap.fromTo('.leaf-3',
    { x: -80, y: 160, opacity: 0 },
    { x: 0, y: 0, opacity: 1, duration: 3.4, ease: 'power2.out', delay: 0.6 }
  );

  // Tambora drum — from right/bottom
  gsap.fromTo('.tambora',
    { x: 180, y: 60, opacity: 0 },
    { x: 0, y: 0, opacity: 1, duration: 4.0, ease: 'power2.out', delay: 1.5 }
  );

  // ── Continuous floating loops ─────────────────────────────────────
  // Each element floats independently — different durations,
  // different axis emphasis, slightly different timing for organic feel.

  gsap.to('.leaf-1', {
    y: -30, rotation: 7, x: 8,
    duration: 9.5, ease: 'sine.inOut',
    repeat: -1, yoyo: true, delay: 4.1,
  });

  gsap.to('.leaf-2', {
    y: 24, rotation: -9, x: -10,
    duration: 8.0, ease: 'sine.inOut',
    repeat: -1, yoyo: true, delay: 5.2,
  });

  gsap.to('.leaf-3', {
    y: -20, rotation: 12, x: 12,
    duration: 11.0, ease: 'sine.inOut',
    repeat: -1, yoyo: true, delay: 4.0,
  });

  // Drum has a slightly heavier bob — less rotation, more vertical sway
  gsap.to('.tambora', {
    y: -18, rotation: 3,
    duration: 7.5, ease: 'sine.inOut',
    repeat: -1, yoyo: true, delay: 5.5,
  });
}
