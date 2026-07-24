# Changelog

All notable changes to AERO are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Semantic Versioning](https://semver.org/). See [VERSION_STEWARD.md](VERSION_STEWARD.md) for how this file is maintained.

## [2.0.0] — 2026-07-24

**The MaxFun merge.** AERO and MaxFun — two takes on the same idea (learn CPET by playing it) — are now one app. MaxFun began as the evolution of AERO's concept inside the SSMC@KKH portfolio PWA; it comes home in this release as AERO's primary experience.

### Added
- **MaxFun game** (`src/component/MaxFun.tsx`, `src/constants/cpetQuestions.ts`): Canvas-2D lane-runner/cycling game with real CPET question banks (27 clinician / 19 patient), Pokémon-style encounter pauses, two roles (Patient/Child, Clinician/Student), two exercise modes (treadmill city, cycling park), VO₂ reserve, acidosis mechanic, Web Audio SFX + haptics, per-question analytics, and persistent hi-score.
- **Keyboard answering** in the encounter card: `1/2/3` or `A/B/C` to select, `Enter` to confirm.
- **Encounter jingle**: GB-style descending chirps + haptic pattern when a question triggers.
- **Kahoot-style feedback recap**: the correct tile (green ✓) and a wrong pick (red ✗) are shown above the explanation.
- **Idle breathing bob** on the frozen character during encounters, so the pause never reads as a hang.
- Landing screen offers both experiences: **Play MaxFun** (primary) and **3D Runner (Classic)** (the original Three.js demo).
- `motion` (Motion v12) dependency for MaxFun's screen transitions.

### Changed
- Landing/summary rebranded from "CPET RUNNER"/"CPX SIM" to **AERO**, with messaging for the three audiences: patients, healthcare professionals, healthcare students.
- Orb spawning is now delta-time scaled — encounter pacing is identical at 60 Hz and 120 Hz displays.
- Dead landing-page buttons (System Check, LOGIN) removed.

### Fixed
- Encounter **Confirm double-submit** (fast second tap double-counted score/reserve/analytics) — the pending question is consumed on first submit.
- Encounter card **unusable at phone widths** (16:9 game area clipped the card) — game area now has a 540 px minimum height below the `md` breakpoint.

## [1.1.0] — 2026-07-23

**Remediation release** (unreleased to production; verified locally). Full context in POSTMORTEM.md / REMEDIATION_PLAN.md / HANDOFF.md.

### Fixed
- 3D engine (`CPETGame3D.tsx`): bullet-time soft-lock (a missed portal row now resolves as a miss), frame-rate-dependent physics (all movement delta-time scaled), theme toggle now updates the 3D scene live, HUD score sync made deterministic, complete unmount cleanup (geometries/materials/textures/composer/tweens/timeouts), fake loading screen removed.
- Type-safety net reconnected: `@types/react`/`@types/react-dom` added, `tsc --noEmit` wired into CI before build.

### Changed
- Deploy consolidated to a single workflow → Firebase project `smartaero` (`smartaero.web.app`); stray auto-generated workflows removed.
- Docs rewritten to describe only what exists; single product name **AERO**.

### Added
- Real PWA: manifest, service worker (network-first navigations, cache-first assets, offline shell), installability.

### Removed
- Unused scaffold deps (`@google/genai`, `express`, `dotenv`, `motion`¹, `lucide-react`, …), `GEMINI_API_KEY` build define (secret-leak vector), superseded `CPETGame.tsx`, `.glb` models moved out of the deploy payload to `assets/models/`.

¹ `motion` returned in 2.0.0 as a real dependency of MaxFun.

## [1.0.0] — 2026-07-04 and earlier

Original prototype built in Google AI Studio: Three.js endless-runner CPET simulation (single hardcoded decision question, static vitals HUD), deployed ad hoc to Firebase Hosting.
