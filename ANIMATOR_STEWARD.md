# Animator Steward

Guide for anyone touching AERO's animation and game-feel code. Two engines live here; each has hard-won tuning constants and traps. **Read the relevant section before editing — several of these numbers look arbitrary and are not.**

## MaxFun (`src/component/MaxFun.tsx`, Canvas 2D)

### Non-negotiables

1. **Delta-time everything.** `dtScale = min(dt, 100ms) / 16.667`. Every movement, decay, and timer multiplies by `dtScale`; exponential decays use `Math.pow(k, dtScale)`. The orb spawn timer is dt-scaled as of v2.0.0 — don't regress it to frame counting. (`g.frame` remains a frame counter; use it only for cosmetics like the idle bob and HUD throttling.)
2. **Refs, not state, in the loop.** Per-frame values live in `gs.current` and refs. Never add `score`/`reserve` state to the game-loop `useEffect` deps (keyed `[stage]` — it would restart the loop every frame).
3. **DPR:** `canvas.width = offsetWidth * dpr` then `ctx.setTransform(dpr,0,0,dpr,0,0)` — always `setTransform`, never `ctx.scale` (stacks on resize). Draw in logical CSS pixels.
4. **Encounter freeze:** while `g.isPaused`, only particles, flash decay, and the idle bob may animate. Lane lerp, physics, orb motion, acidosis, and reserve drain are all gated behind `!g.isPaused`.
5. **One-shot submits:** `evaluateAnswer` consumes `g.pendingQIdx = -1` on entry to its work — exit-animating cards remain clickable, so this guard is what prevents double scoring. Keep it.

### Character geometry (tuned against `legL = 0.31u` — change together or not at all)

- **Runner** (back view, sagittal): knee base `hipY + legL*0.42`, lift amplitude `legL*(0.42 + speedRatio*0.42)` — walk puts the knee at hip height, sprint well above. Forward lean `speedRatio * 0.21` rad pivoting at ground contact. Arms counterswing opposite legs. Distinct walk/jog/run/sprint tiers were an explicit product request.
- **Cyclist** (forward-facing road bike): both wheels centered at `cx` as foreshortened ellipses (`ry = rx*0.14`), front wheel 0.56× and `2.20*wheelR` higher. **Saddle: `seatTopY = bbY - wheelR*0.85`** — hip-to-bottom-pedal ≈ `legL*0.965`. A previous value of 1.55 made the leg geometry impossible (wild bowed arcs). Do not raise it without redoing the math. Two-segment legs with explicit knee joint; pedal path is a squashed ellipse in crank phase.
- `speedRatio = clamp((speed - baseSpeed)/(maxSpeed - baseSpeed), 0, 1)` drives both.

### Feel & feedback

- Encounter rhythm: 6 GB-style alternating flash frames + `sfxEncounter()` jingle → card after ~120 ms. No timer on questions — unlimited reading time is a design decision, not an oversight.
- Feedback recap tiles use `KAHOOT_COLORS`/`KAHOOT_LABELS`; green = correct, red = chosen-wrong, others dimmed.
- Idle bob during freeze: `sin(g.frame * 0.06) * H * 0.004` — subtle by design; it only needs to defeat "is it hung?".
- Audio is procedural (`tone()`); AudioContext is created lazily and resumed on user gesture. Never play audio outside a gesture-initiated call chain on iOS.

## Classic 3D runner (`src/component/CPETGame3D.tsx`, Three.js + GSAP)

- All physics are delta-time based via `dt60 = min(delta, 0.1s) * 60`; keep new motion consistent with that scale.
- **Bullet time must always terminate:** portal rows resolve as a miss when they pass `z > 10`. Any new decision mechanic needs an equivalent guaranteed exit — the original soft-lock here was the product's worst bug.
- Theme switching mutates live handles registered in `themeRef` (background, fog, bloom, ambient, per-material emissive). Don't rebuild the scene on theme change, and register any new theme-sensitive material in `themeRef`.
- Unmount cleanup is exhaustive (geometries, materials, textures, composer, GSAP tweens, both timeout arrays). Anything you allocate in the effect, you dispose in its cleanup.
- Known demo-grade limitations (single question, static vitals, unwired pause/skip) are documented in README — fix them or leave them documented; don't half-wire them silently.

## Testing animations headlessly (Claude Code / hidden tabs)

Hidden browser panes throttle `requestAnimationFrame` to zero and timers to ≥1/s. To drive either game headlessly: install a MessageChannel-based rAF shim paced to ~16 ms **that also honors `cancelAnimationFrame`** (React StrictMode double-mounts effects; a shim returning 0 defeats the cleanup and stacks loops). Motion/framer-motion captures the native rAF at module load, so its screen transitions only advance while the pane renders (screenshots force frames) — ghost screens during automation are a harness artifact, not an app bug.
