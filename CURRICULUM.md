# AERO Curriculum & Assets

> **Implementation note (fail-loud):** This file documents the intended educational content. In the current build, only the first decision-node question ("early O₂ pulse flattening" → Cardiac System) is implemented in-game; the remaining rows of the Decision Node Matrix, the token/hazard set below, and the asset manifest are planned content, not yet wired into gameplay.

## 📊 CPET Variable Tokens
| Token | Fact Snippet | Clinical Significance |
| :--- | :--- | :--- |
| **VO₂ Orb** | "VO₂ rises with work rate—it reflects aerobic energy use." | Primary measure of exercise capacity. |
| **VE Token** | "Breathing reserve helps identify pulmonary limitation." | Ventilation capacity versus demand. |
| **HR Gem** | "O₂ pulse reflects stroke volume and cardiac output." | Cardiac system efficiency. |
| **RER Spark** | "RER > 1.1 confirms peak effort." | Objective indicator of maximal exercise. |

## 🧱 Clinical Hazards (Obstacles)
Obstacles represent common testing errors and safety risks that clinicians must navigate:
* **Contraindication Cracks**: absolute contraindications (e.g. unstable angina).
* **Artifact Alley**: ECG motion artefacts or signal noise.
* **Calibration Canyon**: uncalibrated gas analysers or flow sensors.
* **Hyperventilation Storm**: non-metabolic respiratory overdrive.

## 🎓 Decision Node Matrix
| Query | Correct Answer | Clinical Rationale |
| :--- | :--- | :--- |
| Early O₂ pulse flattening? | **Cardiac System** | Suggests a limitation in stroke volume. |
| Absolute stop indication? | **ST Elevation** | Immediate safety halt required. |
| Peak effort indicator? | **RER > 1.1** | Confirms metabolic ceiling reached. |

*Only the first row is currently implemented in-game (see the note at the top of this file).*

## 🎨 Asset Manifest
| Asset Type | Item Name | Notes |
| :--- | :--- | :--- |
| Character | `Physiologist_3D.glb` | Low-poly runner in SingHealth uniform. |
| Guide | `AeroDrone.glb` | Floating assistant with pulsing heart. |
| Audio | `AERO_Ambient.mp3` | High-energy, non-intrusive soundscape. |
| HUD | `HUD_Icons.svg` | Clinical iconography for stats tracking. |

*These assets are planned; the current build renders the runner as a capsule primitive and does not load `.glb`, audio or SVG-icon assets at runtime.*
