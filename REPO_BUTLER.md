# Repo Butler

Housekeeping guide for the AERO repository — what lives where, how changes flow, and the chores that keep the repo honest.

## Layout

```
src/
  App.tsx                  # screen router: landing → maxfun | classic 3D flow (persona/protocol state)
  Screen.tsx               # landing / persona / mode / calibration / summary (classic flow + branding)
  component/
    MaxFun.tsx             # the MaxFun game (canvas 2D, self-contained; see ANIMATOR_STEWARD.md)
    CPETGame3D.tsx         # 3D runner: remediated engine + persona-wired question banks + GLB models
  constants/
    cpetQuestions.ts       # MaxFun question banks (27 clinician / 19 patient) + shuffle
  data/
    questionBanks.ts       # 3D runner decision nodes (4 clinical / 4 paediatric)
public/                    # PWA files + models/*.glb (SHIPPED — loaded by the 3D game)
.github/workflows/firebase-hosting-merge.yml  # the ONLY deploy path
```

Companion docs: `CHANGELOG.md`, `VERSION_STEWARD.md`, `ANIMATOR_STEWARD.md`, plus historical `POSTMORTEM.md` / `REMEDIATION_PLAN.md` / `HANDOFF.md` (read-only context; don't update them for new work — use the changelog).

## How changes flow

- Work directly on `main` is the current convention (solo project). If that changes, branch → PR → squash.
- **Avoid the GitHub web editor for code files** — a pasted diff hunk once shipped inside `Screen.tsx` and broke every CI build until the next local merge. Edit locally, run `npm run lint`, then push.
- Every commit that changes behavior updates `CHANGELOG.md` in the same commit.
- Push to `main` = deploy: `firebase-hosting-merge.yml` runs `npm ci` → `npm run lint` → `npm run build` → `FirebaseExtended/action-hosting-deploy` to Firebase project **smartaerosim**, hosting target/site **smartaero** → https://smartaero.web.app/.
- CI auth: the `FIREBASE_SERVICE_ACCOUNT_SMARTAEROSIM` repo secret (service-account JSON). This is the proven working identity — the site `smartaero` lives inside the `smartaerosim` GCP project. `.firebaserc` maps the hosting target for local CLI use.

## Standing chores

- **Never** reintroduce: secrets in `vite.config.ts` defines (the `GEMINI_API_KEY` incident), auto-generated parallel deploy workflows, `.DS_Store` (gitignored).
- `package-lock.json` is authoritative; delete any `package-lock 2.json`-style Finder duplicates on sight.
- Placeholder PWA icons (`public/icon-*.png`) should be replaced with branded art before promoting installability.
- `public/models/*.glb` ship with the app and are loaded by the 3D game — keep them optimized (bike.glb is already ~430 kB, the largest asset).
- Do **not** delete the `FIREBASE_SERVICE_ACCOUNT_SMARTAEROSIM` secret or the `smartaerosim` project — despite the name, that project hosts the production `smartaero` site and the secret is the deploy credential. (Earlier docs had this backwards.)

## Cross-repo note

MaxFun's upstream lives in the SSMC@KKH portfolio repo (iCloud path, separate product). As of v2.0.0 the AERO copy is **the** maintained copy for AERO purposes — improvements here do not auto-flow back. If a fix matters to both, apply it in both and say so in both changelogs/TODOs.
