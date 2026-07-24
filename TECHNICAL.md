# AERO Technical Documentation

## 🏗️ System Architecture
AERO is a single-page React 19 + TypeScript application built with Vite 6. It combines a Three.js (r183) 3D game canvas with a Tailwind CSS v4 DOM overlay for the HUD.

The app is a linear flow of six screens, driven by a single `currentScreen` state value in `src/App.tsx`:

```
Landing → Persona → Mode → Calibration → Game → Summary
```

Five of these (`src/Screen.tsx`) are static presentational screens; the sixth, `Game`, is the playable 3D runner (`src/component/CPETGame3D.tsx`). The Summary screen loops back to Landing.

### 1. Unified Input Manager
`CPETGame3D` uses an input-agnostic `InputManager` class so keyboard and touch behave identically:
* **Keyboard**: arrow keys and WASD, plus `Space`. `←/A` and `→/D` map to lane changes; `↑/W/Space` maps to jump; `↓/S` maps to slide.
* **Touch**: `touchstart`/`touchend` swipe detection with a 30px threshold on the dominant axis.
* **Mapping**: all inputs resolve to one of four actions — `LANE_LEFT`, `LANE_RIGHT`, `JUMP`, `SLIDE` — consumed once per frame by the game loop.

### 2. Theming Engine
A dark/light toggle updates the live Three.js scene in place (no scene rebuild) and the DOM:
* **Scene**: background colour, `FogExp2` colour, `UnrealBloomPass` on/off, `AmbientLight` intensity, and per-material emissive hexes are all switched via a `themeRef` handle.
* **DOM**: the Tailwind `dark` class is toggled on `document.documentElement`.
* **Lighting**: the scene uses one `AmbientLight` plus one `DirectionalLight` (with shadow mapping). Bloom is enabled only in dark mode.

### 3. Rendering & Performance
* **Post-processing**: `EffectComposer` with a `RenderPass` and an `UnrealBloomPass`.
* **Curved-world effect**: a shared `onBeforeCompile` vertex-shader tweak bends geometry down over the horizon.
* **Object pooling**: an `ObjectPool` class recycles token and obstacle meshes to avoid per-spawn allocation.
* **Cleanup**: the main effect disposes geometries, materials, pools, the composer and renderer, and kills GSAP tweens on unmount.

## 🧠 Core Game Loop & Physics
The runner auto-advances; the world scrolls towards the camera. The loop is delta-time based and frame-rate independent (`dt60 = delta * 60`, delta capped at 0.1s so a backgrounded tab cannot teleport the world).

* **Speed**: increases gradually over time and by a larger step on each correct answer; obstacle hits and wrong answers reduce it (floored at the base `RUN_SPEED`).
* **Decision nodes**: every 30 seconds of non-bullet-time play, the game enters "bullet time" (`timeScale = 0.2`), spawns a row of three portals and displays a clinical query.
* **Portal system**: three `TorusGeometry` portals sit in the three lanes, each labelled with an answer (Cardiac / Pulmonary / Metabolic, shuffled). Steering into a portal resolves the decision; if the whole row scrolls past unclaimed it resolves as a miss. Bullet time always terminates.
* **End condition**: reaching a score of 1000 calls `onEnd`, advancing to the Summary screen.

## 🧪 Deployment Pipeline
A single GitHub Actions workflow (`.github/workflows/deploy.yml`) runs on push to `main`:
1. Checkout and authenticate to Google Cloud via workload identity federation.
2. Set up Node.js 20 and `npm install`.
3. **Typecheck** — `npm run lint` (`tsc --noEmit`).
4. **Build** — `npm run build` (Vite).
5. **Deploy** — `firebase-tools deploy --only hosting` to Firebase project `smartaero`.

The live site is https://smartaero.web.app/. Hosting config (`firebase.json`) serves `dist/` with an SPA rewrite of `**` to `/index.html`.

## 📲 PWA
* `public/manifest.webmanifest`: name, icons (`icon-192.png`, `icon-512.png`), `standalone` display, landscape orientation, theme colour `#0d59f2`.
* `public/sw.js`: caches the app shell on install; navigations are network-first with a cached-shell fallback, static assets are cache-first. Registered only for production builds.
* `index.html`: `theme-color` meta, manifest link and Apple touch icon.

## ⚠️ Known Limitations
These are stated plainly so they are not mistaken for finished behaviour:
1. **Single decision question.** Only one query exists — *"If O2 Pulse flattens early but VE reserve is high, what system is limiting?"* (answer: **Cardiac**). It repeats at every decision node.
2. **Persona and Mode are not wired.** Every Persona and Mode choice leads to the same game; the in-game HUD always reads "Running (Treadmill)".
3. **Static HUD and Summary values.** The HUD vitals (HR 148, VO₂ 32.1, stage 2/3, acidosis meter) and the Summary results (45.2 ml/kg/min, 94%) are hard-coded placeholders, not computed from play. Only the SCORE value is live.
4. **Non-functional buttons.** The pause and skip buttons are decorative and do nothing.
5. **Models not loaded.** `.glb` character/treadmill/bike assets exist under `assets/models/` but are not loaded; the runner is a Three.js capsule primitive.
6. **Cosmetic naming inconsistency.** The product is **AERO**, but some in-app screens still literally render legacy strings such as "CPET Runner" and "CPX SIM" as UI text.

## 🗺️ Roadmap (not yet implemented)
The following are referenced as goals but do not exist in the current codebase:
* Firebase Auth / Google Sign-In, Firestore and Cloud Storage.
* User XP, rank and session logging.
* Any AI/LLM integration.
* Multiple protocols and multiple decision questions.
* Loading the `.glb` models at runtime.
