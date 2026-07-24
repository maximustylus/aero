# HANDOFF — AERO remediation

**Date:** 2026-07-04 · **Session model:** Claude Fable 5 (with Opus subagents) · **For:** Alif
**Read alongside:** POSTMORTEM.md, REMEDIATION_PLAN.md (both in repo root)

## 1. Current state

All five remediation plans were executed in the classified order. Every code and doc change is written to the repo at its real path. **Nothing here has been typechecked or built** — see §3 for why, and §4 for exactly what you must run.

### Completed and self-verified in-session
- **Plan 1 — Deploy consolidation (Block A).** `.firebaserc` default → `smartaero`; `firebase.json` site → `smartaero`; the two auto-generated `smartaerosim` workflows deleted; `deploy.yml` now runs `npm run lint` (typecheck) → build → deploy, single workflow on push to `main`.
- **Plan 2 — Type-safety net (Block C).** `@types/react` + `@types/react-dom` added to devDependencies (React 19 ships no bundled types). `CPETGame3D.tsx` shader annotation `THREE.Shader` → `THREE.WebGLProgramParametersWithUniforms` (the former was removed from @types/three long before r183; new type confirmed exported at `@types/three/src/renderers/webgl/WebGLPrograms.d.ts` and re-exported from `Three.d.ts`). `src/vite-env.d.ts` added so `import.meta.env.PROD` typechecks.
- **Plan 3 — Engine fixes (Block B), CPETGame3D.tsx.** (a) Bullet time now always terminates — a missed portal row resolves as a miss. (b) Physics are delta-time based (`dt60`, delta capped at 0.1s): gravity, jump, speeds, slide, token/portal motion, camera smoothing. (c) Theme is live — a `themeRef` lets the `[isDarkMode]` effect update scene background/fog/bloom/ambient/emissives in place without rebuilding. (d) HUD score pushes to React only on change (removed the `Math.random()<0.1` gate). (e) Full unmount cleanup: geometries, materials, portal textures, composer, GSAP tweens, both timeout families. (f) Fake `LoadingManager`/`setTimeout(onLoad)` and the dead loading UI removed.
- **Plan 4 — Scaffold residue (Block D).** Removed unused deps (`@google/genai`, `express`, `dotenv`, `motion`, `lucide-react`, `@types/express`, `tsx`); package renamed `react-example` → `aero`; `GEMINI_API_KEY` define removed from `vite.config.ts` (secret-leak vector closed); `src/component/CPETGame.tsx` deleted; `.DS_Store` files removed and gitignored; the three `.glb` models moved out of the deploy payload to `assets/models/` (still versioned, not shipped).
- **Plan 5a — Real PWA (Block E scope addition, your decision).** `public/manifest.webmanifest`, `public/sw.js` (network-first navigations, cache-first assets, offline shell), `index.html` link/theme-color tags, placeholder `icon-192.png`/`icon-512.png` (replace with branded art), SW registration in `main.tsx` gated to production builds.
- **Plan 5 — Docs truth pass (Block E).** README / TECHNICAL / CURRICULUM rewritten to describe only what exists; all `[cite_start]`/`[cite: N]` artefacts stripped; single product name **AERO**; deploy target corrected; decision-node interval corrected to 30s; fictional Firebase backend moved to a labelled Roadmap; honest "Known Limitations" documented.

## 2. Work outstanding (deliberately NOT done — flagged, not silently dropped)

These are product features, not defects, and were out of remediation scope (POSTMORTEM §3, item 8). They remain true limitations, now documented honestly in the code and README:
- Only **one** decision-node question exists; it repeats every node. Needs a question bank.
- **Persona and Mode selections are not wired** — every path leads to the same game; HUD hard-codes "Running (Treadmill)".
- **HUD vitals and the Summary results are static placeholders** (HR 148, VO₂ 32.1, 45.2 ml/kg/min, 94%), not computed from play. In a clinical-education tool this matters; prioritise if the audience is learners.
- **Pause and skip buttons** have no handlers.
- **`.glb` models are not loaded** — the runner is a capsule primitive. Models are preserved in `assets/models/`.

## 3. Why verification is blocked in this environment

This sandbox cannot install from the npm registry (403) and its mounted binaries are macOS-native, so `tsc`, `vite build`, and a browser run were all impossible here. Every "typecheck/build passes" criterion is therefore **unverified** and must be run by you. The static type sweep (Plan 2) found no errors I'm confident about, but that is reading `.d.ts` files, not running the compiler.

## 4. Decisions awaiting you

1. **Service-account identity (blocker for deploy).** `deploy.yml` still authenticates as `github-actions-deploy@smart-aero.iam.gserviceaccount.com` with workload-identity project number `1031321304123`, while it deploys `--project smartaero`. I did not change this: the GCP **project** hosting the service account may legitimately be named `smart-aero` even though Firebase **Hosting** serves at `smartaero.web.app`. Confirm the service account and workload-identity provider are correct for project `smartaero`; if the GCP project is actually `smartaero`, update line 22–23 of `deploy.yml`. **Do not push to `main` until this is confirmed** — a wrong service account fails the deploy.
2. **Dead Firebase project/secret cleanup (console-side, I have no access).** If `smartaerosim` and its `FIREBASE_SERVICE_ACCOUNT_SMARTAEROSIM` GitHub secret are truly unused, delete the secret and archive the project so they can't resurface.
3. **Branded PWA icons.** `public/icon-192.png` / `icon-512.png` are generated placeholders (dark bg + heartbeat glyph). Replace with real branding before you promote installability.
4. **`assets/models/` — keep or delete?** Kept them versioned on the assumption you intend to load them (Plan 3 item f / §2). If the game will stay primitive-only, delete the folder.

## 5. Exact steps to resume in a fresh session

```bash
cd <repo root>            # /Users/sitiaisha/Documents/GitHub/AERO
rm -rf node_modules package-lock.json
npm install               # regenerates lock without the removed deps; pulls @types/react etc.
npm run lint              # tsc --noEmit — MUST exit 0. This has never run before; expect to fix stragglers.
npm run build             # vite build — MUST succeed
npm run dev               # smoke test at localhost:3000
```

Manual smoke test (no automated tests exist): play to a decision node, **jump so the whole portal row passes**, confirm bullet time ends with a "Missed!" message and normal speed resumes (this was the reachable soft-lock). Toggle the theme mid-game and confirm the 3D scene — not just the HUD — switches. If you have a 120 Hz display, confirm the runner speed feels the same as on 60 Hz (delta-time fix).

PWA check: `npm run build && npm run preview`, open in Chrome, DevTools → Application → Manifest (no errors) and Service Workers (registered). Lighthouse PWA audit should now pass installability.

If `npm run lint` reports type errors: they are pre-existing, exposed for the first time now that the compiler can run. Fix at source or, if any is a genuine false positive from @types/three, narrow with a typed cast rather than disabling strict. Report back and I can take them on.

## 6. Nothing was force-pushed or deployed

All changes are local working-tree edits. No commit, no push, no deploy was performed. You control when this ships.
