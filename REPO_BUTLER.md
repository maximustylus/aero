# Repo Butler

Housekeeping guide for the AERO repository — what lives where, how changes flow, and the chores that keep the repo honest.

## Layout

```
src/
  App.tsx                  # screen router: landing → maxfun | classic 3D flow
  Screen.tsx               # landing / persona / mode / calibration / summary (classic flow + branding)
  component/
    MaxFun.tsx             # the MaxFun game (canvas 2D, self-contained; see ANIMATOR_STEWARD.md)
    CPETGame3D.tsx         # classic Three.js runner (demo-grade: 1 question, static vitals)
  constants/
    cpetQuestions.ts       # question banks (27 clinician / 19 patient) + shuffle
public/                    # PWA: manifest.webmanifest, sw.js, icons (192/512 are placeholders)
assets/models/             # .glb models kept versioned but NOT shipped (not loaded by any code)
.github/workflows/deploy.yml  # the ONLY deploy path
```

Companion docs: `CHANGELOG.md`, `VERSION_STEWARD.md`, `ANIMATOR_STEWARD.md`, plus historical `POSTMORTEM.md` / `REMEDIATION_PLAN.md` / `HANDOFF.md` (read-only context; don't update them for new work — use the changelog).

## How changes flow

- Work directly on `main` is the current convention (solo project). If that changes, branch → PR → squash.
- Every commit that changes behavior updates `CHANGELOG.md` in the same commit.
- Push to `main` = deploy: the workflow runs `npm ci` → `npm run lint` → `npm run build` → Firebase Hosting deploy to project **smartaero** → https://smartaero.web.app/.
- CI auth: workload identity for `github-actions-deploy@smart-aero.iam.gserviceaccount.com`. If a deploy fails at auth, the fix is in GCP IAM, not the repo.

## Standing chores

- **Never** reintroduce: secrets in `vite.config.ts` defines (the `GEMINI_API_KEY` incident), auto-generated parallel deploy workflows, `.DS_Store` (gitignored).
- `package-lock.json` is authoritative; delete any `package-lock 2.json`-style Finder duplicates on sight.
- Placeholder PWA icons (`public/icon-*.png`) should be replaced with branded art before promoting installability.
- `assets/models/` stays only while there's intent to load the models in the 3D game; delete the folder if that intent dies.
- GitHub secret `FIREBASE_SERVICE_ACCOUNT_SMARTAEROSIM` and the `smartaerosim` Firebase project are legacy — delete/archive from the consoles when convenient.

## Cross-repo note

MaxFun's upstream lives in the SSMC@KKH portfolio repo (iCloud path, separate product). As of v2.0.0 the AERO copy is **the** maintained copy for AERO purposes — improvements here do not auto-flow back. If a fix matters to both, apply it in both and say so in both changelogs/TODOs.
