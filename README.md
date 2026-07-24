# AERO
### Learn CPET by playing it

**AERO** is a browser-based CPET (Cardiopulmonary Exercise Testing) education platform for **patients, healthcare professionals, and healthcare students**. Since v2.0.0 it ships two experiences from one landing page:

1. **MaxFun** *(primary)* — a Canvas-2D lane-runner/cycling quiz game with real CPET question banks, Pokémon-style encounter pauses, and per-question analytics.
2. **3D Runner (Classic)** — the original Three.js endless-runner demo that started the project in Google AI Studio.

Live at **https://smartaero.web.app/** · History in [CHANGELOG.md](CHANGELOG.md)

## 🎮 MaxFun

Collect physiological orbs (VO₂, VCO₂, HR, VE) by switching lanes. Fill the quota and the world freezes, Game-Boy-style, into a **CPET question encounter** — read at your own pace, answer, get a role-aware explanation, and keep running.

- **Two roles**: Patient/Child (plain language, gentler pace, friendly copy) and Clinician/Student (technical questions, full speed ramp, km/h HUD, response analytics).
- **Question banks**: 27 clinician / 19 patient questions, shuffled per run (`src/constants/cpetQuestions.ts`).
- **Two modes**: treadmill (city) and cycling (park), with back-view characters whose animation scales through walk/jog/run/sprint tiers.
- **Mechanics**: VO₂ reserve (health), acidosis (builds with effort — causes input lag, then stumble), obstacle jump/slide, hi-score persistence, Kahoot-style answer recap, procedural sound + haptics.
- **Controls**: `←/→` lanes, swipe/tap on touch; in an encounter `1/2/3` or `A/B/C` selects and `Enter` confirms, or tap the tiles.

## 🕹️ 3D Runner (Classic)

The original prototype: steer a runner through token pickups and hazards; at intervals the world drops into bullet time and poses a clinical query answered by steering into a portal. `←/→/↑/↓` or `WASD` + swipes.

> **Scope note (fail-loud):** the classic runner is demo-grade — one decision question, static HUD vitals, persona/mode selections don't change gameplay, pause/skip are inert. It is kept as the project's 3D showcase; MaxFun is the maintained learning experience. Details in the Roadmap.

## 🚀 Technical Stack
* **Framework**: React 19 + TypeScript, built with Vite 6.
* **MaxFun engine**: Canvas 2D, delta-time physics, Motion v12 for screen transitions. See [ANIMATOR_STEWARD.md](ANIMATOR_STEWARD.md) before touching animation code.
* **3D engine**: Three.js (r183) with GSAP and `UnrealBloomPass` post-processing.
* **Styling**: Tailwind CSS v4.
* **PWA**: web app manifest plus a service worker providing an offline app-shell cache (registered in production builds only).
* **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`) runs a typecheck, then build, then deploys to Firebase Hosting on every push to `main`.

## 🛠️ Installation & Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/maximustylus/aero.git
   cd aero
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the local development server**:
   ```bash
   npm run dev
   ```

4. **Typecheck** (also run in CI):
   ```bash
   npm run lint   # tsc --noEmit
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

6. **Deploy**: pushing to `main` triggers the GitHub Action, which deploys to Firebase Hosting (project `smartaero`, live at https://smartaero.web.app/).

## 📚 Repo guides
- [CHANGELOG.md](CHANGELOG.md) — what changed, per version
- [VERSION_STEWARD.md](VERSION_STEWARD.md) — versioning + release checklist
- [REPO_BUTLER.md](REPO_BUTLER.md) — layout, deploy pipeline, standing chores
- [ANIMATOR_STEWARD.md](ANIMATOR_STEWARD.md) — animation constants, traps, and testing notes

## 🗺️ Roadmap (not yet implemented)
* Classic 3D runner: wire persona/mode selections, add more decision questions, live HUD vitals, functional pause/skip, load the `.glb` models (runner is a capsule primitive).
* MaxFun: difficulty progression using the existing `Question.difficulty` field, per-category stats, resolve whether the patient bank should have a 20th question.
* User accounts, progression and session logging.

## ⚖️ License
* **Proprietary. All rights reserved by Muhammad Alif.**
