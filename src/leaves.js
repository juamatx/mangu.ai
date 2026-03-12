import gsap from 'gsap';

// Each leaf drifts in from off-screen (like koi.ai's clouds),
// then enters a continuous floating loop.

export function initLeaves() {

  // ── Drift in from edges ──────────────────────────────────────────
  // leaf-1: from left
  gsap.fromTo('.leaf-1',
    { x: -240, opacity: 0 },
    { x: 0, opacity: 1, duration: 3.8, ease: 'power2.out', delay: 0.4 }
  );

  // leaf-2: from right
  gsap.fromTo('.leaf-2',
    { x: 220, opacity: 0 },
    { x: 0, opacity: 1, duration: 4.2, ease: 'power2.out', delay: 1.0 }
  );

  // leaf-3: from bottom
  gsap.fromTo('.leaf-3',
    { y: 140, opacity: 0 },
    { y: 0, opacity: 1, duration: 3.2, ease: 'power2.out', delay: 0.7 }
  );

  // leaf-4: from right
  gsap.fromTo('.leaf-4',
    { x: 160, opacity: 0 },
    { x: 0, opacity: 1, duration: 3.5, ease: 'power2.out', delay: 1.8 }
  );

  // ── Continuous floating loops (begin after drift-in settles) ─────

  gsap.to('.leaf-1', {
    y: -28, rotation: 7,
    duration: 9.0, ease: 'sine.inOut',
    repeat: -1, yoyo: true, delay: 4.2,
  });

  gsap.to('.leaf-2', {
    y: 22, rotation: -8, x: -8,
    duration: 7.6, ease: 'sine.inOut',
    repeat: -1, yoyo: true, delay: 5.2,
  });

  gsap.to('.leaf-3', {
    y: -18, rotation: 10, x: 10,
    duration: 10.5, ease: 'sine.inOut',
    repeat: -1, yoyo: true, delay: 3.9,
  });

  gsap.to('.leaf-4', {
    y: 16, rotation: -6,
    duration: 7.0, ease: 'sine.inOut',
    repeat: -1, yoyo: true, delay: 5.3,
  });
}
