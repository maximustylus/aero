***

### 2. TECHNICAL.md
This file covers the architectural decisions, including the state management and the "Decision Node" logic.

```markdown
# AERO Technical Documentation

## 🏗️ System Architecture
AERO utilizes a hybrid architecture combining a high-performance **Three.js** 3D engine with a reactive **Tailwind CSS** 2D overlay.

### 1. Unified Input Manager
The engine uses an input-agnostic controller to ensure consistent gameplay across devices:
* **Mac/Desktop**: Listeners for `ArrowUp`, `ArrowDown`, `ArrowLeft`, and `ArrowRight`.
* **iPad/Tablet**: Swipe-detection algorithm for `touchstart` and `touchend`.
* **Mapping**: All inputs trigger unified events: `LANE_LEFT`, `LANE_RIGHT`, `JUMP`, and `SLIDE`[cite: 9].

### 2. Theming Engine
Integrated Dark/Light mode toggle synchronized between the 3D environment and the DOM:
* **Dark Mode**: Emissive neon materials, high-intensity `PointLights`, and `UnrealBloomPass` for a simulation vibe.
* **Light Mode**: High-contrast albedo materials and strong `DirectionalLight` for clinical clarity.

### 3. Firebase Integration (`smartaerosim`)
* **Firestore**: Stores user XP, rank, and session logs (VO2 peak, HR max, accuracy)[cite: 35].
* **Auth**: Google Sign-In gated access for authenticated SingHealth staff.
* **Storage**: Houses `.glb` models and clinical report exports.

## 🧠 Core Game Loop & Physics
The runner moves automatically forward, simulating the increasing metabolic demand of a ramp protocol[cite: 19].
* **Velocity**: Linear increase over time ($+0.005$ units per frame)[cite: 52].
* **Decision Nodes**: Triggers "Bullet Time" (slow-motion) every 25 seconds for clinical knowledge checks[cite: 25].
* **Portal System**: 3D Torus geometries represent choices; physical collision confirms the answer[cite: 9].

## 🧪 Deployment Pipeline
The project uses GitHub Actions for automated CI/CD. The `deploy.yml` workflow:
1. Installs Node dependencies.
2. Compiles Tailwind CSS and minifies JavaScript.
3. Deploys to `smartaerosim.web.app` via Firebase Hosting.
