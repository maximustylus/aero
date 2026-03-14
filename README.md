# SmartAeroSim (AERO) v1.0
### The NEXUS Integrated CPET Orientation Simulation

**AERO** is a high-fidelity, 3D interactive simulation designed for SingHealth Clinical Physiologists. [cite_start]It serves as an engaging pre-Module 1 introduction to Cardiopulmonary Exercise Testing (CPET), bridging the gap between theoretical knowledge and clinical practice[cite: 1, 3].

## 🎮 Game Concept
[cite_start]You are a SingHealth Physiologist tasked with guiding a patient through a high-stakes exercise test environment[cite: 3]. [cite_start]Navigate the "Exercise Test Protocol Pathway," collecting vital physiological data while avoiding clinical pitfalls to reach the **Maximal Effort CPET Lab**[cite: 5, 18].

## 🎯 Learning Objectives
By the end of the simulation, learners will instinctively understand:
* [cite_start]**CPET Variables**: Identify and collect $\text{VO}_2$, $\text{VCO}_2$, $\text{HR}$, $\text{VE}$, and $\text{RER}$ tokens[cite: 23].
* [cite_start]**Integrated Physiology**: Understand how systems work together during maximal effort[cite: 9].
* [cite_start]**Safety & Quality**: Recognize artifacts, contraindications, and equipment calibration errors[cite: 20].
* [cite_start]**Maximal Effort**: Identify objective indicators of peak exercise performance[cite: 26].

## 🚀 Technical Stack
* **Engine**: Three.js (WebGL) for 3D rendering and GSAP for fluid animations.
* **Frontend**: Tailwind CSS for a professional, clinical "Cyberpunk" HUD.
* **Backend**: Firebase (Auth, Firestore, and Cloud Storage) for user progression and data logging.
* **CI/CD**: GitHub Actions (`deploy.yml`) for automated deployment to Firebase Hosting.
* **Input**: Universal Input Manager supporting Mac keyboard (Arrow keys) and iPad touch gestures (Swipes).

## 🛠️ Installation & Setup
1. **Clone the repository**:
   ```bash
   git clone [https://github.com/maximustylus/aero.git](https://github.com/maximustylus/aero.git)
   cd aero
