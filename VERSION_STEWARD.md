# Version Steward

Role guide for whoever (human or agent) cuts AERO releases. The steward's job: **every deployed build is traceable to a version, and every version tells the truth about what changed.**

## Versioning policy

Semantic Versioning against the *user-facing product*:

- **MAJOR** — the experience fundamentally changes (e.g. 2.0.0 = MaxFun became the primary game).
- **MINOR** — new capability: a new mode, question bank, mechanic, screen, or PWA feature.
- **PATCH** — fixes and tuning that don't add capability: bug fixes, copy, balance values, dependency bumps.

The version lives in **`package.json`** (single source of truth). Keep the landing-page version chip (`src/Screen.tsx`, "AERO v2.0") in sync with the MAJOR.MINOR when you bump.

## Changelog discipline

- `CHANGELOG.md` follows Keep-a-Changelog headings: `Added / Changed / Fixed / Removed`.
- Write entries for the *reader who plays the app*, not the diff: "keyboard answering in the encounter card", not "add useEffect in MaxFun.tsx".
- Every entry lands in the same commit/PR as the change it describes — no batch reconstruction later.
- Unreleased work accumulates under an `## [Unreleased]` heading; the release commit renames it to the version + date.

## Release checklist

1. `npm run lint` — must exit 0 (this is the CI type gate).
2. `npm run build` — must succeed locally.
3. Smoke-test both experiences in a browser: one full MaxFun encounter (answer, feedback, resume) and one classic 3D run reaching a decision node. Check one mobile viewport.
4. Update `CHANGELOG.md` (rename Unreleased → version + date) and bump `package.json`.
5. Commit with message `release: vX.Y.Z`, then `git tag vX.Y.Z`.
6. Push `main` + tags. The GitHub Actions workflow (`.github/workflows/deploy.yml`) lints, builds, and deploys to Firebase Hosting (`smartaero.web.app`).
7. Watch the Actions run to green, then load https://smartaero.web.app/ and confirm the version chip and a hard-refresh (the service worker serves network-first navigations, so new HTML shows on reload).

## Known version-relevant facts

- Question banks: 27 clinician / **19** patient (older docs said 20 — unresolved whether one was lost; see the portfolio repo's TODO if investigating).
- The service worker caches assets cache-first: hashed asset filenames make this safe, but never reuse an asset filename across versions.
