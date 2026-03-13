import './style.css';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ── Smooth scroll ─────────────────────────────────────────────────────
const lenis = new Lenis({ lerp: 0.08 });
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// ── Hero entrance ─────────────────────────────────────────────────────
const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

tl.from('.hero-kicker',  { opacity: 0, y: 10, duration: 1.0, delay: 0.1 })
  .from('.hero-title',   { opacity: 0, y: 50, duration: 1.5, ease: 'power4.out' }, '-=0.7')
  .from('.hero-rule',    { scaleX: 0,  duration: 1.2, ease: 'power3.inOut',
                           transformOrigin: 'left center' }, '-=0.9')
  .from('.hero-tagline', { opacity: 0, y: 10, duration: 0.9 }, '-=0.6')
  .from('.site-header',  { opacity: 0, duration: 0.8 }, '-=1.2')
  .from('.hero-scroll',  { opacity: 0, duration: 0.8 }, '-=0.3');

// ── Hero title parallax on scroll ────────────────────────────────────
gsap.to('.hero-title', {
  scrollTrigger: {
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    scrub: 1.2,
  },
  y: -70,
  opacity: 0.15,
});

// ── Statement reveal ─────────────────────────────────────────────────
gsap.from('.statement-text', {
  scrollTrigger: {
    trigger: '.statement',
    start: 'top 68%',
  },
  opacity: 0,
  y: 55,
  duration: 1.5,
  ease: 'power3.out',
});

// ── Footer reveal ────────────────────────────────────────────────────
gsap.from('.site-footer', {
  scrollTrigger: {
    trigger: '.site-footer',
    start: 'top 92%',
  },
  opacity: 0,
  y: 18,
  duration: 1.0,
  ease: 'power2.out',
});
