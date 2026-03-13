# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start local dev server (Vite, hot reload)
npm run build    # Production build → dist/
npm run preview  # Preview the production build locally
```

There are no tests in this project.

## Architecture

This is a static landing page for **mangú.ai**, a Caribbean-themed AI consultancy. It is a vanilla JS + Vite project with no framework.

**Entry point:** `index.html` → imports `src/main.js`

**Source modules:**
- `src/main.js` — bootstraps the page: calls `initWaves(hero)` and `initFloaters()`
- `src/waves.js` — Three.js fullscreen WebGL canvas injected as the hero background. Uses a custom GLSL fragment shader with 5-octave FBM (fractional Brownian motion) value noise to produce animated, organic wave patterns in a Caribbean color palette (teal, forest green, gold, coral). The canvas is positioned `absolute` inside `#hero` at z-index 0.
- `src/leaves.js` — GSAP animations for the `.floater` SVG elements (3 plantain leaves + 1 tambora drum). Elements entrance-animate from off-screen edges, then loop with continuous gentle floating motions.
- `src/style.css` — All visual styling. No CSS preprocessor.

**HTML structure** (`index.html`):
- `<header>` — fixed identity bar
- `#hero` — full-height hero with Three.js canvas background, CSS rhythm rings, and inline SVG floaters
- `.wave-break` — decorative SVG wave separator
- `.marquee-wrap` — scrolling text marquee (duplicated `.m-block` for seamless loop)
- `.recipe` — "ingredients" section blending mangú recipe with AI humor
- `.contact` — email CTA
- `<footer>`

**Deployment:** GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on every push to `main`. Output goes to `dist/`. The `vite.config.js` sets `base: '/'` for root deployment.

**Dependencies:**
- `three` — WebGL renderer for the hero wave animation
- `gsap` — floater entrance and looping animations
- `vite` — dev/build tooling only
