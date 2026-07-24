# AERO — Remediation Plan

**Version:** 1.0 · **Date:** 2026-07-04 · **Companion to:** POSTMORTEM.md v1.0
**Constraint declared up front:** this session cannot execute `tsc` or `vite build` (see POSTMORTEM §7.4). Acceptance criteria marked ⏳ are deferred to a verification run on Alif's machine, itemised in HANDOFF.md.

## Execution order (explicit)

| # | Plan | Block | Why this position | Delegation tier |
|---|------|-------|-------------------|-----------------|
| 1 | Deployment consolidation | A | Gates how everything ships; touches no app code, so lowest regression risk — but requires Alif's decisions on project identity before any edit | **Fable-supervised** |
| 2 | Reconnect the type-safety net | C | Small mechanical change that protects every later code edit; must land before engine work | **Opus-alone** |
| 3 | Engine fixes in CPETGame3D | B | The substantive product repair; depends on Plan 2's net and Plan 1's single deploy path | **Fable-supervised** (Fable specifies and reviews line-by-line; Opus executes the fixed spec) |
| 4 | Scaffold residue removal | D | Deletions are safest after Plan 3 settles which files/deps are truly unused | **Opus-alone** |
| 5 | Documentation truth pass | E | Must document the *post-remediation* state, so runs last | **Opus-alone** (drafts from a Fable-supplied fact inventory; Fable verifies every claim) |

Tier definitions per brief: *Opus-alone* = result fully evaluable and verifiable on return; *Fable-supervised* = requires session-holder judgment throughout.

## Plan 1 — Deployment consolidation (Block A)

**Done means:** exactly one workflow deploys on push to `main`; `firebase.json`, `.firebaserc`, and the workflow name the same project and site; the two auto-generated `smartaerosim` workflows are removed or disabled; the residual identities are recorded for console-side cleanup.

Steps: (1) Alif confirms canonical project + site (evidence says project `smartaero`, site `smartaero`, since `deploy.yml --project smartaero` is what plausibly produced the live site). (2) Align `.firebaserc` and `firebase.json`. (3) Remove `firebase-hosting-merge.yml` and `firebase-hosting-pull-request.yml` (or re-point the PR one if preview channels are wanted). (4) Add `npm run lint` to `deploy.yml` before build (lands with Plan 2). ⏳ Next real push to `main` deploys once, successfully, to `smartaero.web.app`.

**Blocked on:** Alif's answers (project identity, PR previews). Cannot verify console/secret state from here.

## Plan 2 — Reconnect the type-safety net (Block C)

**Done means:** `@types/react` + `@types/react-dom` in `devDependencies` pinned compatible with React 19; `deploy.yml` runs `npm run lint` before build; any pre-existing type errors in `src/` fixed or explicitly listed. ⏳ `tsc --noEmit` exits 0 on Alif's machine.

Note: the subagent cannot run tsc either; it must fix *statically identifiable* type issues (e.g. `THREE.Shader` no longer exported in three r183 — `onBeforeCompile` callback typing) and list anything uncertain rather than guess (P1).

## Plan 3 — Engine fixes in CPETGame3D (Block B)

**Done means (each independently reviewable in the diff):**
1. Bullet time always terminates: a missed portal row counts as incorrect (or re-arms) — no reachable state keeps `timeScale = 0.2` indefinitely.
2. Physics are delta-time based: gravity, jump, speeds, slide duration scaled by `delta` (60 fps-equivalent constants), behaviour identical at 60/120 Hz.
3. Theme reactivity: scene/material colour state updated on `isDarkMode` change via refs (no scene rebuild); dead stub effect removed.
4. Deterministic HUD sync: score pushed to React on change or fixed interval; `Math.random()` gate removed.
5. Complete unmount cleanup: dispose geometries/materials/textures/composer, kill GSAP tweens, clear both timeouts.
6. Honest loading: fake `setTimeout(onLoad)` removed (loader either loads the real `.glb`s or the loading screen goes; decision recorded, not fudged).
7. Out of scope (recorded, not fixed silently): question bank, persona/mode wiring, live vitals, pause/skip handlers — product features, not defects; flagged for Alif.

**Why Fable-supervised:** interacting changes inside one 752-line effect with no runtime verification available; correctness rests on line-level reasoning during review.

## Plan 4 — Scaffold residue removal (Block D)

**Done means:** unused deps removed from `package.json` (`@google/genai`, `express`, `dotenv`, `motion`, `lucide-react`, `@types/express`, `tsx`); `GEMINI_API_KEY` define removed from `vite.config.ts`; `src/component/CPETGame.tsx` deleted; `.DS_Store` deleted and gitignored; package renamed `aero`; `metadata.json` retained only if AI Studio hosting still matters (ask, don't guess); `.glb` models kept/removed per Plan 3 decision 6. Verification: grep proves zero references to every removed item. ⏳ build passes on Alif's machine.

## Plan 5 — Documentation truth pass (Block E)

**Done means:** README/TECHNICAL describe only what exists (Firebase backend claims removed or moved to a clearly-labelled roadmap); all `[cite_…]` artefacts stripped; one product name used consistently; deployment target corrected; numeric claims match code constants.

**Decisions received 2026-07-04 (Alif):** canonical project `smartaero`; delete both auto-generated workflows; product name **AERO**; **implement a real PWA**. The PWA work (manifest, service worker, icons, registration in `main.tsx`, `index.html` links) is a declared scope addition to this plan, executed as Plan 5a before the docs pass so the docs describe the true final state.
