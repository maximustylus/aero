/**
 * MaxFun — CPET Educational Runner / Cycling Game   v2.0
 *
 * What changed from v1
 * ────────────────────
 * BUG FIXES
 *   • DPR / Retina fix — game loop now uses canvas.offsetWidth/offsetHeight as
 *     logical W/H so ctx.scale(dpr,dpr) maps correctly; no more off-screen rendering
 *   • ctx transform reset on resize — uses setTransform() instead of stacking scale()
 *   • pickAnswer lane mapping — option index 0/1/2 now correctly maps to lane -1/0/1
 *   • Arrow-key movement during active gantry now registers as an answer (givenLane synced)
 *
 * NEW FEATURES
 *   • Role select screen — 🧒 Patient/Child (PATIENT_QUESTIONS, friendly mode)
 *                          🩺 Clinician/Student (QUESTIONS, clinical mode)
 *   • Smooth lane interpolation — currentLane float lerps toward targetLane each frame
 *   • Touch / swipe support — horizontal swipe >28px changes lane; tap-thirds still works
 *   • On-screen A / B / C lane buttons — always visible during gameplay (mobile-first)
 *   • Persistent lane indicators painted on the road near the character
 *   • Screen flash — green on correct, red on wrong, white pulse on orb collect
 *   • Web Audio API sound effects — orb collect beep, correct fanfare, wrong buzz
 *   • Patient mode — slower drain, lower penalties, patientExplanation used in feedback,
 *                    friendly game-over copy, effort-level HUD instead of km/h
 *   • Clinician mode — full speed ramp, VO₂ reserve bar, technical explanations
 *   • Bigger confetti burst on correct answers
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { QUESTIONS, PATIENT_QUESTIONS, shuffleQuestions } from '../constants/cpetQuestions';
import type { Question } from '../constants/cpetQuestions';
import { motion, AnimatePresence } from 'motion/react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Stage =
  | 'welcome'
  | 'role-select'
  | 'char-select'
  | 'mode-select'
  | 'playing'
  | 'feedback'
  | 'gameover';
type CharGender = 'male' | 'female';
type GameMode   = 'treadmill' | 'cycling';
type GameRole   = 'patient'   | 'clinician';

interface Orb            { lane: number; depth: number; color: string; label: string; pulse: number; collected: boolean; }
interface Particle       { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; }
interface AnalyticsRecord { qNum: number; latencyMs: number; speedKmH: number; correct: boolean; }

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_SPEED      = 0.006;
const MAX_SPEED       = BASE_SPEED * 2.4;
const SPEED_RAMP      = 0.0000025;
const PAT_BASE_SPEED  = BASE_SPEED * 0.72;
const PAT_MAX_SPEED   = BASE_SPEED * 1.55;
const PAT_SPEED_RAMP  = SPEED_RAMP  * 0.55;

const ORBS_PER_Q_CLIN  = 8;
const ORBS_PER_Q_PAT   = 5;
const ORB_SPAWN_INT    = 55;

const RESERVE_START        = 80;
const RESERVE_DRAIN_CLIN   = 0.018;
const RESERVE_DRAIN_PAT    = 0.010;
const RESERVE_WRONG_CLIN   = -20;
const RESERVE_WRONG_PAT    = -10;
const RESERVE_RIGHT_CLIN   = 10;
const RESERVE_RIGHT_PAT    = 20;

const ENCOUNTER_FLASH_FRAMES = 6;   // GB-style white/dark alternating flashes on encounter
const HORIZON   = 0.30;
const ROAD_BOT  = 0.44;
const ROAD_TOP  = 0.032;
const CHAR_DEPTH = 0.74;
const MAX_PARTICLES = 300;
const LANE_LERP = 0.10;   // per-frame fraction toward target lane (at 60fps baseline)
const DT_BASE   = 16.667; // ms — 60fps baseline; all physics values are tuned at this rate

const KAHOOT_COLORS = ['#e21b3c', '#1368ce', '#26890c'] as const;
const KAHOOT_LABELS = ['A', 'B', 'C'] as const;

const ORB_TYPES = [
  { label: 'VO₂',  color: '#007aff' },
  { label: 'VCO₂', color: '#ff3b30' },
  { label: 'HR',   color: '#34c759' },
  { label: 'VE',   color: '#af52de' },
] as const;

// ─── Perspective helpers ──────────────────────────────────────────────────────
const pY = (d: number, H: number) => HORIZON * H + d * H * (1 - HORIZON);
const pX = (lane: number, d: number, W: number) =>
  W / 2 + lane * (ROAD_TOP + (ROAD_BOT - ROAD_TOP) * d) * W;
const pS = (d: number) => 0.10 + d * 0.90;

// ─── Particles ────────────────────────────────────────────────────────────────
function emitBurst(
  pool: Particle[], x: number, y: number, color: string, n: number, spd = 5,
) {
  for (let i = 0; i < n; i++) {
    if (pool.length >= MAX_PARTICLES) break;
    const a = (Math.PI * 2 / n) * i + Math.random() * 0.5;
    pool.push({
      x, y,
      vx: Math.cos(a) * spd * (0.5 + Math.random()),
      vy: Math.sin(a) * spd * (0.5 + Math.random()) - 2,
      life: 1,
      color,
      size: 3 + Math.random() * 5,
    });
  }
}
function tickParticles(pool: Particle[], dtScale = 1) {
  for (let i = pool.length - 1; i >= 0; i--) {
    const p = pool[i];
    p.x    += p.vx * dtScale;
    p.y    += p.vy * dtScale;
    p.vy   += 0.12 * dtScale;
    p.vx   *= Math.pow(0.96, dtScale); // exponential drag stays correct across frame rates
    p.life -= 0.026 * dtScale;
    if (p.life <= 0) pool.splice(i, 1);
  }
}
function drawParticles(ctx: CanvasRenderingContext2D, pool: Particle[]) {
  for (const p of pool) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── Web Audio ────────────────────────────────────────────────────────────────
let _ac: AudioContext | null = null;
function getAC(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!_ac)
      _ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (_ac.state === 'suspended') void _ac.resume();
    return _ac;
  } catch { return null; }
}
function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.14) {
  const ctx = getAC(); if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.start(); o.stop(ctx.currentTime + dur);
}
// ── Haptic feedback (no-op on desktop, tactile on mobile) ────────────────────
function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch { /* not supported */ }
  }
}

const sfxOrb = () => {
  tone(880, 0.07, 'sine', 0.09);
  vibrate(15);
};
const sfxCorrect = () => {
  tone(660, 0.10, 'sine', 0.17);
  setTimeout(() => tone(880,  0.12, 'sine', 0.17), 90);
  setTimeout(() => tone(1100, 0.22, 'sine', 0.15), 200);
  vibrate([30, 50, 30]);
};
const sfxWrong = () => {
  tone(180, 0.38, 'sawtooth', 0.11);
  vibrate(200);
};
// GB-style "wild encounter" jingle: two sharp descending chirps, then a low hold
const sfxEncounter = () => {
  tone(988, 0.06, 'square', 0.10);
  setTimeout(() => tone(784, 0.06, 'square', 0.10), 70);
  setTimeout(() => tone(659, 0.06, 'square', 0.10), 140);
  setTimeout(() => tone(330, 0.30, 'triangle', 0.12), 220);
  vibrate([20, 40, 20, 40, 60]);
};

// ─── Background: daytime city ─────────────────────────────────────────────────
function drawCityBackground(
  ctx: CanvasRenderingContext2D, W: number, H: number, offset: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON * H);
  sky.addColorStop(0, '#87ceeb');
  sky.addColorStop(1, '#c9e8f5');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, HORIZON * H);

  ctx.save();
  ctx.fillStyle = '#ffe066';
  ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 28;
  ctx.beginPath(); ctx.arc(W * 0.78, H * 0.08, 28, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  const bldgs = [
    { x: 0.05, w: 0.09, h: 0.18, c: '#b0c4de' },
    { x: 0.13, w: 0.06, h: 0.22, c: '#8fa8c8' },
    { x: 0.20, w: 0.10, h: 0.14, c: '#c5d5e8' },
    { x: 0.30, w: 0.07, h: 0.19, c: '#a8bfd8' },
    { x: 0.38, w: 0.05, h: 0.25, c: '#7a9cc0' },
    { x: 0.45, w: 0.08, h: 0.16, c: '#b5c9de' },
    { x: 0.55, w: 0.06, h: 0.20, c: '#8faec8' },
    { x: 0.63, w: 0.09, h: 0.17, c: '#c0d2e5' },
    { x: 0.73, w: 0.07, h: 0.24, c: '#7b9dc2' },
    { x: 0.82, w: 0.08, h: 0.15, c: '#afc3d8' },
    { x: 0.91, w: 0.06, h: 0.21, c: '#8dabc6' },
  ];
  for (const b of bldgs) {
    const bx = ((b.x * W - offset * 0.25) % W + W) % W;
    const by = HORIZON * H - b.h * H;
    ctx.fillStyle = b.c;
    ctx.fillRect(bx - b.w * W / 2, by, b.w * W, b.h * H + 2);
    ctx.fillStyle = 'rgba(255,255,200,0.55)';
    for (let wy = by + 6; wy < HORIZON * H - 4; wy += 10)
      for (let wx = bx - b.w * W / 2 + 5; wx < bx + b.w * W / 2 - 5; wx += 10)
        if (Math.abs((wx + wy * 3) % 17) > 5)
          ctx.fillRect(wx, wy, 5, 5);
  }
}

// ─── Background: sunny park ───────────────────────────────────────────────────
function drawParkBackground(
  ctx: CanvasRenderingContext2D, W: number, H: number, offset: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON * H);
  sky.addColorStop(0, '#5bb8f5');
  sky.addColorStop(1, '#aadefc');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, HORIZON * H);

  for (const cp of [0.12, 0.38, 0.62, 0.85]) {
    const cx = ((cp * W - offset * 0.08) % W + W) % W;
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.beginPath(); ctx.ellipse(cx, H * 0.08, 55, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx - 28, H * 0.10, 35, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 32, H * 0.09, 30, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = '#7bc67e';
  ctx.beginPath(); ctx.moveTo(0, HORIZON * H);
  for (let x = 0; x <= W; x += 20) {
    const hy = HORIZON * H - 18 * Math.sin(((x + offset * 0.05) / W) * Math.PI * 3);
    ctx.lineTo(x, hy);
  }
  ctx.lineTo(W, HORIZON * H); ctx.closePath(); ctx.fill();

  for (const tp of [0.08, 0.22, 0.36, 0.50, 0.65, 0.78, 0.92]) {
    const tx = ((tp * W - offset * 0.18) % W + W) % W;
    const ty = HORIZON * H - 2;
    ctx.fillStyle = '#7a5c3a'; ctx.fillRect(tx - 4, ty - 38, 8, 38);
    ctx.fillStyle = '#2d8b3e'; ctx.beginPath(); ctx.arc(tx, ty - 46, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3aab4e';
    ctx.beginPath(); ctx.arc(tx - 8, ty - 52, 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(tx + 10, ty - 50, 14, 0, Math.PI * 2); ctx.fill();
  }
}

// ─── Road ─────────────────────────────────────────────────────────────────────
function drawRoad(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  mode: GameMode, offset: number,
) {
  const horizY = HORIZON * H;
  const botY   = H;

  const roadGrad = ctx.createLinearGradient(0, horizY, 0, botY);
  if (mode === 'treadmill') {
    roadGrad.addColorStop(0, '#b0b0b0'); roadGrad.addColorStop(1, '#888888');
  } else {
    roadGrad.addColorStop(0, '#5a5a5a'); roadGrad.addColorStop(1, '#3a3a3a');
  }
  ctx.fillStyle = roadGrad;
  ctx.beginPath();
  ctx.moveTo(W / 2 - ROAD_TOP * W, horizY);
  ctx.lineTo(W / 2 + ROAD_TOP * W, horizY);
  ctx.lineTo(W / 2 + ROAD_BOT * W, botY);
  ctx.lineTo(W / 2 - ROAD_BOT * W, botY);
  ctx.closePath(); ctx.fill();

  ctx.strokeStyle = mode === 'treadmill' ? '#999' : '#666';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(W / 2 - ROAD_TOP * W, horizY); ctx.lineTo(W / 2 - ROAD_BOT * W, botY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W / 2 + ROAD_TOP * W, horizY); ctx.lineTo(W / 2 + ROAD_BOT * W, botY); ctx.stroke();

  if (mode === 'cycling') {
    const dashCount = 12;
    for (let i = 0; i < dashCount; i++) {
      const d0 = ((i / dashCount) + (offset * 0.003) % 1) % 1;
      const d1 = Math.min(d0 + 0.04, 1);
      if (d1 - d0 < 0.01) continue;
      ctx.strokeStyle = '#f5c518';
      ctx.lineWidth = Math.max(1, pS(d0) * 3);
      ctx.beginPath();
      ctx.moveTo(pX(0, d0, W), pY(d0, H));
      ctx.lineTo(pX(0, d1, W), pY(d1, H));
      ctx.stroke();
    }
  } else {
    for (const lane of [-0.5, 0.5]) {
      const dashCount = 14;
      for (let i = 0; i < dashCount; i++) {
        const d0 = ((i / dashCount) + (offset * 0.003) % 1) % 1;
        const d1 = Math.min(d0 + 0.035, 1);
        if (d1 - d0 < 0.01) continue;
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = Math.max(1, pS(d0) * 2);
        ctx.beginPath();
        ctx.moveTo(pX(lane, d0, W), pY(d0, H));
        ctx.lineTo(pX(lane, d1, W), pY(d1, H));
        ctx.stroke();
      }
    }
  }

  if (mode === 'treadmill') {
    ctx.fillStyle = '#c8e6c9';
  } else {
    ctx.fillStyle = '#5aaa5a';
  }
  ctx.fillRect(0, horizY, W / 2 - ROAD_BOT * W, botY - horizY);
  ctx.fillRect(W / 2 + ROAD_BOT * W, horizY, W - (W / 2 + ROAD_BOT * W), botY - horizY);
}

// ─── Lane indicators — always-on A / B / C circles near the character ─────────
function drawLaneIndicators(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  currentLane: number,
) {
  const d = CHAR_DEPTH + 0.08;
  for (let i = 0; i < 3; i++) {
    const lane   = i - 1; // -1, 0, 1
    const cx     = pX(lane, d, W);
    const cy     = pY(d, H) + 18;
    const active = Math.abs(currentLane - lane) < 0.35;
    const r      = active ? 11 : 8;
    const alpha  = active ? 0.78 : 0.32;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = KAHOOT_COLORS[i];
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${active ? 10 : 8}px 'Courier New', monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(KAHOOT_LABELS[i], cx, cy);
    ctx.restore();
  }
}

// ─── Runner character ─────────────────────────────────────────────────────────
function drawRunner(
  ctx: CanvasRenderingContext2D,
  cx: number, gY: number, u: number,
  gender: CharGender, phase: number,
  speedRatio: number,   // 0 = base walk, 1 = full sprint
) {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // ── Forward lean — pivot around ground contact, Fortnite-style ───────────────
  // walk ≈ 0°  jog ≈ 4°  run ≈ 8°  sprint ≈ 12°
  const leanAngle = speedRatio * 0.21;
  ctx.translate(cx, gY);
  ctx.rotate(-leanAngle);
  ctx.translate(-cx, -gY);

  const skinTone   = gender === 'male' ? '#f0c080' : '#f5b07a';
  const shirtColor = gender === 'male' ? '#2255cc' : '#cc2255';
  const shoeColor  = '#111';

  const headR    = u * 0.12;
  const torsoH   = u * 0.28;
  const torsoW   = u * 0.16;
  const legL     = u * 0.31;
  const armL     = u * 0.22;
  const shoulderW = u * 0.20;

  // Vertical bounce: barely perceptible at walk, visible stomp at sprint
  const bobAmt = (0.010 + speedRatio * 0.030) * u;
  const bob    = bobAmt * Math.abs(Math.sin(phase * 2));

  // Tiny lateral torso sway
  const torsoX = cx + Math.sin(phase) * u * 0.007;
  const rootY  = gY - legL - torsoH - headR * 2 - bob;
  const hipY   = rootY + torsoH + headR * 2 - u * 0.02;
  const hipSpread = u * 0.062;
  const lHipX  = torsoX - hipSpread;
  const rHipX  = torsoX + hipSpread;

  // ── LEG PHYSICS — sagittal plane, back-view projection ──────────────────────
  // sin(ph) > 0  →  leg swings FORWARD toward horizon  →  knee RISES
  // sin(ph) < 0  →  leg is BEHIND toward camera        →  foot drives to ground
  //
  // Key fix: use kneeBaseY + absolute kneeLift so range of motion is large enough
  // to read as running at every speed tier, not a shuffle.
  //   walk  (sr=0.0): knee rise = 0.42 * legL  → knee sits at hip height
  //   jog   (sr=0.4): knee rise = 0.59 * legL  → knee clearly above hip
  //   run   (sr=0.7): knee rise = 0.71 * legL  → pronounced drive
  //   sprint(sr=1.0): knee rise = 0.84 * legL  → Fortnite-level high-knee
  const kneeBaseY  = hipY + legL * 0.42;         // relaxed hang (knee slightly bent below hip)
  const kneeLiftAmt = legL * (0.42 + speedRatio * 0.42);  // full lift range scales with speed

  const computeLeg = (hipX: number, ph: number) => {
    const s        = Math.sin(ph);
    const c        = Math.cos(ph);
    const kneeRise = Math.max(0,  s);   // 0 → 1 on forward swing
    const kneePush = Math.max(0, -s);   // 0 → 1 on back push-off

    const kneeX = hipX + c * legL * 0.038;          // minimal lateral drift (back-view)
    const kneeY = kneeBaseY - kneeRise * kneeLiftAmt; // knee climbs above hipY at speed

    // Foot: folds behind the raised knee in recovery; drives flat to ground at push-off
    const footFold = kneeRise * legL * (0.26 + speedRatio * 0.26);
    const footX    = kneeX + kneePush * legL * 0.10; // slight backward kick at push-off
    const footY    = Math.min(gY - u * 0.025, kneeY + legL * 0.52 - footFold);
    return { kneeX, kneeY, footX, footY };
  };

  const lLeg = computeLeg(lHipX, phase);
  const rLeg = computeLeg(rHipX, phase + Math.PI);

  const drawLeg = (
    hx: number, hy: number, kx: number, ky: number, fx: number, fy: number, front: boolean,
  ) => {
    const a  = front ? 1 : 0.68;
    const [br, bg, bb] = gender === 'male' ? [0, 0, 0] : [68, 0, 136];
    ctx.strokeStyle = `rgba(${br},${bg},${bb},${a})`;
    ctx.lineWidth = u * 0.075;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.stroke();
    ctx.lineWidth = u * 0.060;
    ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.fillStyle = front ? shoeColor : '#333';
    ctx.beginPath(); ctx.ellipse(fx, fy, u * 0.068, u * 0.030, -0.15, 0, Math.PI * 2); ctx.fill();
  };

  // In back-view: "forward" leg (toward horizon) is farther → draw it first (behind)
  if (Math.sin(phase) > 0) {
    drawLeg(lHipX, hipY, lLeg.kneeX, lLeg.kneeY, lLeg.footX, lLeg.footY, false);
    drawLeg(rHipX, hipY, rLeg.kneeX, rLeg.kneeY, rLeg.footX, rLeg.footY, true);
  } else {
    drawLeg(rHipX, hipY, rLeg.kneeX, rLeg.kneeY, rLeg.footX, rLeg.footY, false);
    drawLeg(lHipX, hipY, lLeg.kneeX, lLeg.kneeY, lLeg.footX, lLeg.footY, true);
  }

  // ── TORSO ─────────────────────────────────────────────────────────────────────
  const torsoTopY = rootY + headR * 2;
  ctx.fillStyle = shirtColor;
  ctx.beginPath();
  ctx.roundRect(torsoX - torsoW / 2, torsoTopY, torsoW, torsoH, [u*0.04, u*0.04, u*0.02, u*0.02]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = u * 0.022;
  ctx.beginPath(); ctx.moveTo(torsoX, torsoTopY + u*0.04); ctx.lineTo(torsoX, torsoTopY + torsoH - u*0.04); ctx.stroke();

  // ── ARMS — Y-dominant counterswing pump ─────────────────────────────────────
  // Amplitude: small at walk, aggressive high-elbow drive at sprint
  const pumpAmp = 0.28 + speedRatio * 0.58;

  const drawArm = (side: number, armPh: number, front: boolean) => {
    const sX = torsoX + side * shoulderW / 2;
    const sY = torsoTopY + u * 0.04;
    const sw = Math.sin(armPh);
    const elbX = sX + side * armL * 0.10;
    const elbY = sY + armL * 0.30 - sw * armL * pumpAmp * 0.48;
    const handX = elbX + side * armL * 0.04;
    const handY = elbY + armL * 0.38 + sw * armL * pumpAmp * 0.30;
    const al = front ? 1 : 0.68;
    const hex = shirtColor.slice(1).match(/.{2}/g)!.map(h => parseInt(h, 16));
    ctx.strokeStyle = `rgba(${hex[0]},${hex[1]},${hex[2]},${al})`;
    ctx.lineWidth = u * 0.062;
    ctx.beginPath(); ctx.moveTo(sX, sY); ctx.lineTo(elbX, elbY); ctx.stroke();
    const sk = skinTone.slice(1).match(/.{2}/g)!.map(h => parseInt(h, 16));
    ctx.strokeStyle = `rgba(${sk[0]},${sk[1]},${sk[2]},${al})`;
    ctx.lineWidth = u * 0.052;
    ctx.beginPath(); ctx.moveTo(elbX, elbY); ctx.lineTo(handX, handY); ctx.stroke();
  };
  // Left arm counterswings with right leg; right arm with left leg
  drawArm(-1, phase + Math.PI, false);
  drawArm( 1, phase,           true);

  // ── HEAD ─────────────────────────────────────────────────────────────────────
  ctx.fillStyle = skinTone;
  ctx.fillRect(torsoX - u*0.04, rootY + headR*1.7, u*0.08, headR*0.6);
  ctx.beginPath(); ctx.arc(torsoX, rootY + headR, headR, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = gender === 'male' ? '#2a1a08' : '#5c2d0a';
  ctx.beginPath(); ctx.arc(torsoX, rootY + headR*0.6, headR*0.92, Math.PI*1.1, Math.PI*1.9); ctx.fill();
  if (gender === 'female') {
    ctx.fillStyle = '#5c2d0a';
    ctx.beginPath();
    ctx.ellipse(torsoX - headR*0.7, rootY + headR*0.8, headR*0.22, headR*0.45, -0.5, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.fillStyle = skinTone;
  ctx.beginPath(); ctx.arc(torsoX - headR*0.9, rootY + headR*1.05, headR*0.22, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(torsoX + headR*0.9, rootY + headR*1.05, headR*0.22, 0, Math.PI*2); ctx.fill();

  ctx.restore();
}

// ─── Cyclist character — forward-facing (back-of-rider toward camera) ──────────
function drawCyclist(
  ctx: CanvasRenderingContext2D,
  cx: number, gY: number, u: number,
  gender: CharGender, pedalPhase: number,
  _speedRatio: number,  // reserved — cyclist lean could be added later
) {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const skinTone    = gender === 'male' ? '#f0c080' : '#f5b07a';
  const jerseyColor = gender === 'male' ? '#e03020' : '#cc1166';
  const frameColor  = '#16213e';

  // ── WHEEL GEOMETRY ────────────────────────────────────────────────────────────
  // Both wheels centered on cx — forward-facing / back-of-rider view
  const wheelR  = u * 0.22;      // conceptual radius (sets overall scale)

  // Rear wheel: large foreshortened ellipse, bottom at gY (close to camera)
  const rearRX  = wheelR;
  const rearRY  = wheelR * 0.14;
  const rearCY  = gY - rearRY;

  // Front wheel: smaller ellipse, much higher (perspective depth = farther away)
  const frontRX = wheelR * 0.56;
  const frontRY = frontRX * 0.14;
  const frontCY = rearCY - wheelR * 2.20;

  // Bottom bracket / crank center
  const bbX = cx;
  const bbY = rearCY - wheelR * 0.52;

  // Saddle height — CRITICAL: must satisfy hip-to-bottom-pedal ≈ legL * 0.96
  // Old value (1.55) put saddle 46% too high, making leg geometry physically impossible.
  // With 0.85: hip-to-bottom-pedal = 0.299u, legL = 0.31u → ratio 0.965 ✓
  const seatTopY = bbY - wheelR * 0.85;

  // Stem / head tube area (just above front wheel)
  const stemY    = frontCY - wheelR * 0.28;

  // Drop handlebars: top of bars
  const hbarTopY  = stemY + wheelR * 0.10;
  const hbarHalfW = u * 0.155;   // bars extend wide

  // Rider geometry
  const hipSpread  = u * 0.058;
  const shdHalfW   = u * 0.135;
  const hipY       = seatTopY - u * 0.015;
  const shoulderY  = hbarTopY - u * 0.058;
  const headCY     = shoulderY - u * 0.135;

  // Axle spread for chainstays
  const axleSpread = rearRX * 0.44;

  // ── WHEEL helper ─────────────────────────────────────────────────────────────
  // Spokes drawn via coordinate transform: squash to circle-space → draw radially → restore
  const drawWheel = (wcx: number, wcy: number, rx: number, ry: number, spin: number) => {
    // Tire
    ctx.strokeStyle = '#111'; ctx.lineWidth = rx * 0.13;
    ctx.beginPath(); ctx.ellipse(wcx, wcy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    // Deep-section carbon rim
    ctx.strokeStyle = '#1c1c2e'; ctx.lineWidth = rx * 0.09;
    ctx.beginPath(); ctx.ellipse(wcx, wcy, rx * 0.87, ry * 0.87, 0, 0, Math.PI * 2); ctx.stroke();
    // Spokes in ellipse-projected space
    ctx.save();
    ctx.translate(wcx, wcy);
    ctx.scale(1, ry / rx);
    ctx.strokeStyle = 'rgba(155,155,165,0.40)'; ctx.lineWidth = u * 0.007 * (rx / rearRX);
    for (let i = 0; i < 16; i++) {
      const a = spin + (i / 16) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * rx * 0.84, Math.sin(a) * rx * 0.84); ctx.stroke();
    }
    ctx.restore();
    // Hub
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.ellipse(wcx, wcy, u * 0.020, u * 0.020 * (ry / rx), 0, 0, Math.PI * 2); ctx.fill();
  };

  // ── PAINTER ORDER: back → front ──────────────────────────────────────────────

  // 1. Front wheel (farther away → draw first)
  drawWheel(cx, frontCY, frontRX, frontRY, pedalPhase * 0.45 + 0.5);

  // 2. Fork legs (from head tube down to front axle)
  const forkSpread = frontRX * 0.30;
  ctx.strokeStyle = frameColor; ctx.lineWidth = u * 0.020;
  ctx.beginPath(); ctx.moveTo(cx - forkSpread, frontCY); ctx.lineTo(cx - forkSpread * 0.8, stemY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + forkSpread, frontCY); ctx.lineTo(cx + forkSpread * 0.8, stemY); ctx.stroke();

  // 3. Top tube going forward (seat tube top → stem)
  ctx.lineWidth = u * 0.032;
  ctx.beginPath(); ctx.moveTo(cx, seatTopY); ctx.lineTo(cx, stemY); ctx.stroke();

  // 4. Stem (short vertical at top of fork, connecting to bars)
  ctx.lineWidth = u * 0.028;
  ctx.beginPath(); ctx.moveTo(cx, stemY); ctx.lineTo(cx, hbarTopY); ctx.stroke();

  // 5. Drop handlebars — top bar + drops
  ctx.strokeStyle = '#2a2a3e'; ctx.lineWidth = u * 0.022;
  // Top of bars (wide horizontal)
  ctx.beginPath(); ctx.moveTo(cx - hbarHalfW, hbarTopY); ctx.lineTo(cx + hbarHalfW, hbarTopY); ctx.stroke();
  // Drops: curve outward and down on each side
  const dropY = hbarTopY + u * 0.072;
  ctx.beginPath();
  ctx.moveTo(cx - hbarHalfW, hbarTopY);
  ctx.bezierCurveTo(cx - hbarHalfW, hbarTopY + u*0.028, cx - hbarHalfW * 0.72, dropY, cx - hbarHalfW * 0.72, dropY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + hbarHalfW, hbarTopY);
  ctx.bezierCurveTo(cx + hbarHalfW, hbarTopY + u*0.028, cx + hbarHalfW * 0.72, dropY, cx + hbarHalfW * 0.72, dropY);
  ctx.stroke();

  // 6. Back rider leg (lower pedal = farther from camera → draw first)
  const crankLen = wheelR * 0.44;
  // Cranks trace a squashed ellipse from back-view:
  //   Y = full sinusoidal up-down (dominant motion)
  //   X = tiny cosine wobble (foreshortened depth axis ≈ 7% of crankLen)
  const lPedalX = cx - crankLen * 0.15 + Math.cos(pedalPhase + Math.PI) * crankLen * 0.07;
  const lPedalY = bbY + Math.sin(pedalPhase) * crankLen;
  const rPedalX = cx + crankLen * 0.15 + Math.cos(pedalPhase) * crankLen * 0.07;
  const rPedalY = bbY + Math.sin(pedalPhase + Math.PI) * crankLen;

  const drawRiderLeg = (hipX: number, pedX: number, pedY: number, front: boolean) => {
    // Two-segment leg with explicit knee joint — much clearer than a single quadratic curve
    const outDir = hipX < cx ? -1 : 1;
    const kneeX  = (hipX + pedX) * 0.5 + outDir * u * 0.065;  // knee bows outward
    const kneeY  = (hipY  + pedY) * 0.5 - u * 0.012;          // knee rises slightly above midpoint
    const al     = front ? 1.0 : 0.55;
    ctx.strokeStyle = `rgba(20,20,20,${al})`; ctx.lineWidth = u * 0.070;
    // Thigh: hip → knee
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, kneeY); ctx.stroke();
    // Shin: knee → pedal
    ctx.beginPath(); ctx.moveTo(kneeX, kneeY); ctx.lineTo(pedX, pedY); ctx.stroke();
    // Kneecap dot
    ctx.fillStyle = front ? `rgba(45,45,45,${al})` : `rgba(70,70,70,${al})`;
    ctx.beginPath(); ctx.arc(kneeX, kneeY, u * 0.026, 0, Math.PI * 2); ctx.fill();
    // Shoe
    ctx.fillStyle = front ? '#111' : '#3a3a3a';
    ctx.beginPath(); ctx.ellipse(pedX, pedY, u * 0.052, u * 0.022, 0.2, 0, Math.PI * 2); ctx.fill();
  };

  if (lPedalY > rPedalY) {
    // Left pedal lower → left leg is "down" (more forward in crank rotation when closer)
    drawRiderLeg(cx - hipSpread, rPedalX, rPedalY, false);
  } else {
    drawRiderLeg(cx + hipSpread, lPedalX, lPedalY, false);
  }

  // 7. Rear wheel (closer to camera → draw over far-side frame tubes)
  drawWheel(cx, rearCY, rearRX, rearRY, pedalPhase * 0.45);

  // 8. Frame — chainstays and seatstays (near side, over rear wheel)
  ctx.strokeStyle = frameColor; ctx.lineWidth = u * 0.030;
  // Chainstays: BB → rear axle (left & right)
  ctx.beginPath(); ctx.moveTo(bbX, bbY); ctx.lineTo(cx - axleSpread, rearCY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bbX, bbY); ctx.lineTo(cx + axleSpread, rearCY); ctx.stroke();
  // Seatstays: saddle area → rear axle
  ctx.lineWidth = u * 0.022;
  ctx.beginPath(); ctx.moveTo(cx - u*0.038, seatTopY); ctx.lineTo(cx - axleSpread, rearCY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + u*0.038, seatTopY); ctx.lineTo(cx + axleSpread, rearCY); ctx.stroke();
  // Seat tube: BB → saddle
  ctx.lineWidth = u * 0.038;
  ctx.beginPath(); ctx.moveTo(bbX, bbY); ctx.lineTo(bbX, seatTopY); ctx.stroke();

  // 9. Chainring (foreshortened horizontal ellipse at BB)
  ctx.strokeStyle = '#777'; ctx.lineWidth = u * 0.016;
  ctx.beginPath(); ctx.ellipse(bbX, bbY, crankLen * 0.80, crankLen * 0.11, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#555'; ctx.lineWidth = u * 0.020;
  ctx.beginPath(); ctx.moveTo(bbX, bbY); ctx.lineTo(lPedalX, lPedalY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bbX, bbY); ctx.lineTo(rPedalX, rPedalY); ctx.stroke();
  ctx.fillStyle = '#444';
  ctx.beginPath(); ctx.ellipse(lPedalX, lPedalY, u*0.038, u*0.016, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(rPedalX, rPedalY, u*0.038, u*0.016, 0.2, 0, Math.PI*2); ctx.fill();

  // 10. Saddle
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.ellipse(cx, seatTopY - u*0.016, u*0.095, u*0.026, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = u*0.010;
  ctx.beginPath(); ctx.ellipse(cx, seatTopY - u*0.016, u*0.095, u*0.026, 0, 0, Math.PI*2); ctx.stroke();

  // 11. Torso — trapezoid back (wider at shoulders since they're at same width, taper toward hips)
  ctx.fillStyle = jerseyColor;
  ctx.beginPath();
  ctx.moveTo(cx - hipSpread - u*0.015, hipY);
  ctx.lineTo(cx + hipSpread + u*0.015, hipY);
  ctx.lineTo(cx + shdHalfW, shoulderY);
  ctx.lineTo(cx - shdHalfW, shoulderY);
  ctx.closePath();
  ctx.fill();
  // Jersey seam highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = u * 0.016;
  ctx.beginPath(); ctx.moveTo(cx, hipY); ctx.lineTo(cx, shoulderY + u*0.03); ctx.stroke();

  // 12. Front leg (higher pedal = closer to camera → draw on top)
  if (lPedalY > rPedalY) {
    drawRiderLeg(cx - hipSpread, lPedalX, lPedalY, true);
  } else {
    drawRiderLeg(cx + hipSpread, rPedalX, rPedalY, true);
  }

  // 13. Arms from shoulders to hoods
  const lHoodX = cx - hbarHalfW * 0.72;
  const rHoodX = cx + hbarHalfW * 0.72;
  const hoodY  = dropY;
  ctx.strokeStyle = jerseyColor; ctx.lineWidth = u * 0.050;
  ctx.beginPath();
  ctx.moveTo(cx - shdHalfW, shoulderY);
  ctx.quadraticCurveTo(cx - shdHalfW - u*0.015, shoulderY + u*0.08, lHoodX, hoodY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + shdHalfW, shoulderY);
  ctx.quadraticCurveTo(cx + shdHalfW + u*0.015, shoulderY + u*0.08, rHoodX, hoodY);
  ctx.stroke();
  // Gloves on hoods
  ctx.fillStyle = skinTone;
  ctx.beginPath(); ctx.ellipse(lHoodX, hoodY, u*0.025, u*0.020, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(rHoodX, hoodY, u*0.025, u*0.020, -0.2, 0, Math.PI*2); ctx.fill();

  // 14. Head + helmet from behind
  // Neck
  ctx.strokeStyle = skinTone; ctx.lineWidth = u * 0.038;
  ctx.beginPath(); ctx.moveTo(cx, shoulderY - u*0.018); ctx.lineTo(cx, headCY + u*0.072); ctx.stroke();
  // Head (back of skull)
  ctx.fillStyle = skinTone;
  ctx.beginPath(); ctx.arc(cx, headCY, u * 0.082, 0, Math.PI * 2); ctx.fill();
  // Helmet dome (aero road helmet from behind)
  ctx.fillStyle = jerseyColor;
  ctx.beginPath(); ctx.ellipse(cx, headCY - u*0.018, u*0.096, u*0.082, 0, Math.PI * 1.12, Math.PI * 1.88); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, headCY - u*0.018, u*0.096, u*0.082, 0, 0, Math.PI); ctx.fill();
  // Helmet vent slits (decorative horizontal lines)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = u * 0.010;
  ctx.beginPath(); ctx.moveTo(cx - u*0.052, headCY - u*0.038); ctx.lineTo(cx + u*0.052, headCY - u*0.038); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - u*0.040, headCY - u*0.060); ctx.lineTo(cx + u*0.040, headCY - u*0.060); ctx.stroke();
  // Helmet strap (under chin area — just the back strap visible from behind)
  ctx.strokeStyle = '#999'; ctx.lineWidth = u * 0.010;
  ctx.beginPath(); ctx.arc(cx, headCY + u*0.055, u*0.068, 0.15, Math.PI - 0.15); ctx.stroke();

  ctx.restore();
}

// ─── Orbs ─────────────────────────────────────────────────────────────────────
function drawOrbs(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  orbs: Orb[], frame: number,
) {
  for (const orb of orbs) {
    if (orb.collected) continue;
    const ox = pX(orb.lane, orb.depth, W);
    const oy = pY(orb.depth, H);
    const os = pS(orb.depth) * 18;
    const pulse = 0.92 + 0.08 * Math.sin(frame * 0.12 + orb.pulse);
    ctx.save();
    const grd = ctx.createRadialGradient(ox, oy, 0, ox, oy, os * 2.2 * pulse);
    grd.addColorStop(0, orb.color + 'cc');
    grd.addColorStop(1, orb.color + '00');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(ox, oy, os * 2.2 * pulse, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = orb.color;
    ctx.beginPath(); ctx.arc(ox, oy, os * pulse, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(8, os * 0.72)}px 'Courier New', monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(orb.label, ox, oy);
    ctx.restore();
  }
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function drawHUD(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  reserve: number, score: number, hiScore: number,
  orbsCollected: number, orbsNeeded: number,
  speed: number, baseSpeed: number, maxSpeed: number,
  qCount: number, qTotal: number,
  role: GameRole,
) {
  ctx.save();
  ctx.textBaseline = 'top';

  // ── Reserve / Energy bar (left) ──
  const barX = 16, barY = 16, barW = 14, barH = H * 0.28;
  ctx.fillStyle = 'rgba(0,0,0,0.50)';
  ctx.beginPath(); ctx.roundRect(barX-2, barY-2, barW+4, barH+4, 6); ctx.fill();

  const pct = Math.max(0, Math.min(1, reserve / 100));
  const barColor = pct > 0.6 ? '#34c759' : pct > 0.3 ? '#ff9500' : '#ff3b30';
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 4); ctx.fill();
  const fillH = barH * pct;
  ctx.fillStyle = barColor;
  ctx.beginPath(); ctx.roundRect(barX, barY + barH - fillH, barW, fillH, 4); ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = `bold 9px 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(role === 'patient' ? '⚡' : 'VO₂', barX + barW/2, barY + barH + 5);

  // ── Score (top right) ──
  ctx.textAlign = 'right';
  ctx.font = `bold 22px 'Courier New', monospace`;
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#007aff'; ctx.shadowBlur = 8;
  ctx.fillText(String(score).padStart(6, '0'), W - 16, 16);
  ctx.shadowBlur = 0;
  ctx.font = `bold 11px 'Courier New', monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(`HI ${String(hiScore).padStart(6, '0')}`, W - 16, 42);

  // ── Q progress (top center) ──
  ctx.textAlign = 'center';
  ctx.font = `bold 11px 'Courier New', monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(`Q ${qCount + 1} / ${qTotal}`, W/2, 14);
  const dotSpacing = 16;
  const dotsTotalW = (orbsNeeded - 1) * dotSpacing;
  const dotsStartX = W/2 - dotsTotalW/2;
  for (let i = 0; i < orbsNeeded; i++) {
    ctx.fillStyle = i < orbsCollected ? '#ffcc00' : 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(dotsStartX + i * dotSpacing, 35, 5, 0, Math.PI*2); ctx.fill();
  }

  // ── Speed / Effort (bottom left) ──
  ctx.textAlign = 'left';
  ctx.font = `bold 13px 'Courier New', monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  if (role === 'patient') {
    const effort = (speed - baseSpeed) / (maxSpeed - baseSpeed);
    const label  = effort < 0.33 ? 'EASY' : effort < 0.66 ? 'MEDIUM' : 'HARD';
    ctx.fillText(`EFFORT: ${label}`, 16, H - 28);
  } else {
    const kmh = Math.round((speed / BASE_SPEED) * 8 + 8);
    ctx.fillText(`${kmh} km/h`, 16, H - 28);
  }

  ctx.restore();
}

// ─── Acidosis bar (right side of screen, mirrors the reserve bar on the left) ─
function drawAcidosisBar(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  acidosis: number, role: GameRole,
) {
  const barW = 14, barH = H * 0.28;
  const barX = W - 16 - barW, barY = 56; // below the hi-score text

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.50)';
  ctx.beginPath(); ctx.roundRect(barX-2, barY-2, barW+4, barH+4, 6); ctx.fill();

  // Track
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 4); ctx.fill();

  // Fill — yellow→orange→red as acidosis builds
  const pct      = Math.max(0, Math.min(1, acidosis / 100));
  const fillH    = barH * pct;
  const r = Math.round(255);
  const g = Math.round(pct < 0.5 ? 200 - pct * 200 : 0);
  ctx.fillStyle = `rgb(${r},${g},0)`;
  ctx.beginPath(); ctx.roundRect(barX, barY + barH - fillH, barW, fillH, 4); ctx.fill();

  // Warning pulse when >75
  if (acidosis > 75) {
    ctx.globalAlpha = 0.25 + 0.25 * Math.abs(Math.sin(Date.now() * 0.006));
    ctx.fillStyle   = '#ff0000';
    ctx.beginPath(); ctx.roundRect(barX, barY + barH - fillH, barW, fillH, 4); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font       = `bold 9px 'Courier New', monospace`;
  ctx.textAlign  = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(
    role === 'patient' ? '🦵' : 'H⁺',
    barX + barW / 2,
    barY + barH + 5,
  );

  ctx.restore();
}

// ─── Speed lines ─────────────────────────────────────────────────────────────
function drawSpeedLines(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  speed: number, frame: number,
) {
  const intensity = Math.max(0, (speed - BASE_SPEED*1.4) / (MAX_SPEED - BASE_SPEED*1.4));
  if (intensity < 0.01) return;
  ctx.save();
  ctx.globalAlpha = intensity * 0.4;
  ctx.strokeStyle = '#fff';
  const cx2 = W/2, cy2 = HORIZON * H;
  const lineCount = Math.floor(intensity * 18) + 4;
  for (let i = 0; i < lineCount; i++) {
    const angle = (frame * 0.008 + i / lineCount) * Math.PI * 2;
    const near = 0.12 + Math.random() * 0.1;
    const far  = 0.35 + Math.random() * 0.55;
    ctx.lineWidth = Math.random() * 1.5 + 0.5;
    ctx.beginPath();
    ctx.moveTo(cx2 + Math.cos(angle)*near*W,   cy2 + Math.sin(angle)*near*H*0.4);
    ctx.lineTo(cx2 + Math.cos(angle)*far*W,    cy2 + Math.sin(angle)*far*H*0.4);
    ctx.stroke();
  }
  ctx.restore();
}

// ═════════════════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
export function MaxFun() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  // ── React state (UI only — canvas uses refs for perf) ──
  const [stage,           setStage]           = useState<Stage>('welcome');
  const [gender,          setGender]          = useState<CharGender>('male');
  const [mode,            setMode]            = useState<GameMode>('treadmill');
  const [role,            setRole]            = useState<GameRole>('patient');
  const [score,           setScore]           = useState(0);
  const [hiScore,         setHiScore]         = useState<number>(() => {
    try { return parseInt(localStorage.getItem('maxfun_hi') ?? '0', 10) || 0; }
    catch { return 0; }
  });
  const [reserve,         setReserve]         = useState(RESERVE_START);
  const [feedbackCorrect, setFeedbackCorrect] = useState(false);
  const [feedbackText,    setFeedbackText]    = useState('');
  // Kahoot-style recap on the feedback screen: which tile was right, which was picked
  const [feedbackMeta,    setFeedbackMeta]    = useState<{ options: string[]; correct: number; chosen: number } | null>(null);
  const [showQuestion,    setShowQuestion]    = useState(false);
  const [activeQ,         setActiveQ]         = useState<Question | null>(null);
  const [chosenOption,    setChosenOption]    = useState(-1); // for button highlight
  const [analyticsLog,    setAnalyticsLog]    = useState<AnalyticsRecord[]>([]);

  // ── Refs mirroring state — avoid stale closures inside rAF loop ──
  const stageRef      = useRef<Stage>('welcome');
  const genderRef     = useRef<CharGender>('male');
  const modeRef       = useRef<GameMode>('treadmill');
  const roleRef       = useRef<GameRole>('patient');
  const scoreRef      = useRef(0);
  const hiScoreRef    = useRef(0); // seeded from localStorage in mount effect below
  const reserveRef    = useRef(RESERVE_START);
  const showQRef          = useRef(false);
  const lastTimeRef       = useRef<number>(0);        // for delta-time physics
  const encounterStartRef = useRef<number>(0);        // for latency analytics

  // ── Seed hiScore ref from localStorage on mount ──
  useEffect(() => {
    try {
      const saved = parseInt(localStorage.getItem('maxfun_hi') ?? '0', 10) || 0;
      hiScoreRef.current = saved;
      if (saved > 0) setHiScore(saved);
    } catch { /* private / incognito browsing — fail silently */ }
  }, []);

  useEffect(() => { stageRef.current  = stage;  }, [stage]);
  useEffect(() => { genderRef.current = gender; }, [gender]);
  useEffect(() => { modeRef.current   = mode;   }, [mode]);
  useEffect(() => { roleRef.current   = role;   }, [role]);

  // ── Mutable game state (never triggers re-renders) ──
  const gs = useRef({
    frame:         0,
    speed:         BASE_SPEED,
    baseSpeed:     BASE_SPEED,
    maxSpeed:      MAX_SPEED,
    targetLane:    0,        // integer: -1, 0, 1
    currentLane:   0.0,      // float, lerps toward targetLane
    phase:         0,
    offset:        0,
    orbsCollected: 0,
    orbSpawnTimer: 0,
    orbsPerQ:      ORBS_PER_Q_CLIN,
    orbs:               [] as Orb[],
    particles:          [] as Particle[],
    // ── Pokémon-style encounter ─────────────────────────────────────────────
    isPaused:           false,   // world frozen while question is active
    encounterFlashFrames: 0,     // GB flash countdown (ENCOUNTER_FLASH_FRAMES → 0)
    pendingQIdx:        -1,      // index of the question currently shown
    givenAnswer:        -1,      // option index 0/1/2 player chose, -1 = none
    // ───────────────────────────────────────────────────────────────────────
    qIndex:        0,
    qCount:        0,
    questions:     QUESTIONS as Question[],
    flashColor:    '#00ff00',
    flashAlpha:    0,
    analytics:     [] as AnalyticsRecord[],
    // ── Acidosis (lactic acid accumulation) ──────────────────────────────────
    // 0–100. Builds passively with speed + spikes on wrong answers.
    // Correct answers and orb collection reduce it.
    // >60 → input lag; >80 → character stumble jitter.
    acidosis:       0,
    pendingLane:    null as number | null, // holds delayed lane change during input-lag
  });

  // ── Pick answer (from encounter question buttons) ──
  // i = option index 0/1/2
  const pickAnswer = useCallback((i: number) => {
    const g = gs.current;
    if (!g.isPaused || g.pendingQIdx < 0 || g.givenAnswer >= 0) return; // already answered
    g.givenAnswer = i;
    setChosenOption(i);
  }, []);

  // ── Start game ──
  const startGame = useCallback(() => {
    const g = gs.current;
    const isPatient = roleRef.current === 'patient';

    g.frame         = 0;
    g.speed         = isPatient ? PAT_BASE_SPEED : BASE_SPEED;
    g.baseSpeed     = isPatient ? PAT_BASE_SPEED : BASE_SPEED;
    g.maxSpeed      = isPatient ? PAT_MAX_SPEED  : MAX_SPEED;
    g.targetLane    = 0;
    g.currentLane   = 0;
    g.phase         = 0;
    g.offset        = 0;
    g.orbsCollected = 0;
    g.orbSpawnTimer = 0;
    g.orbsPerQ      = isPatient ? ORBS_PER_Q_PAT : ORBS_PER_Q_CLIN;
    g.orbs          = [];
    g.particles     = [];
    g.isPaused              = false;
    g.encounterFlashFrames  = 0;
    g.pendingQIdx           = -1;
    g.givenAnswer           = -1;
    g.qIndex        = 0;
    g.qCount        = 0;
    g.questions     = shuffleQuestions(isPatient ? PATIENT_QUESTIONS : QUESTIONS);
    g.flashAlpha    = 0;
    g.analytics     = [];
    g.acidosis      = 0;
    g.pendingLane   = null;

    scoreRef.current   = 0;
    reserveRef.current = RESERVE_START;
    lastTimeRef.current = performance.now(); // prime dt so first frame doesn't spike
    setScore(0);
    setReserve(RESERVE_START);
    setAnalyticsLog([]);
    setShowQuestion(false);
    showQRef.current = false;
    setActiveQ(null);
    setChosenOption(-1);
    setStage('playing');
    stageRef.current = 'playing';
  }, []);

  // ── Shared lane-change helper (handles acidosis input lag) ──
  // During an encounter the world is frozen — lane movement is disabled.
  const applyLaneChange = useCallback((newLane: number) => {
    const g = gs.current;
    if (g.isPaused) return;     // world frozen — use the A/B/C buttons instead
    const lagMs = g.acidosis > 60 ? Math.round((g.acidosis - 60) * 5) : 0; // 0–200ms
    const commit = () => {
      g.targetLane = Math.max(-1, Math.min(1, newLane));
    };
    if (lagMs > 0) setTimeout(commit, lagMs);
    else commit();
  }, []);

  // ── Keyboard ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (stageRef.current !== 'playing') return;
      const g = gs.current;
      if (e.key === 'ArrowLeft')  applyLaneChange(g.targetLane - 1);
      if (e.key === 'ArrowRight') applyLaneChange(g.targetLane + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [applyLaneChange]);

  // ── Touch / swipe ──
  const touchStartX = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (stageRef.current !== 'playing') return;
    const g     = gs.current;
    const dx    = e.changedTouches[0].clientX - touchStartX.current;
    const absDx = Math.abs(dx);

    if (absDx > 28) {
      applyLaneChange(dx < 0 ? g.targetLane - 1 : g.targetLane + 1);
    } else {
      const canvas = canvasRef.current; if (!canvas) return;
      const rect  = canvas.getBoundingClientRect();
      const x     = e.changedTouches[0].clientX - rect.left;
      const third = rect.width / 3;
      applyLaneChange(x < third ? -1 : x < third * 2 ? 0 : 1);
    }
  }, [applyLaneChange]);

  // ── Mouse tap (desktop) ──
  const handleCanvasTap = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (stageRef.current !== 'playing') return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect  = canvas.getBoundingClientRect();
    const x     = e.clientX - rect.left;
    const third = rect.width / 3;
    applyLaneChange(x < third ? -1 : x < third * 2 ? 0 : 1);
  }, [applyLaneChange]);

  // ── Game loop ──
  useEffect(() => {
    if (stage !== 'playing') {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── DPR fix: set physical resolution; draw in logical CSS pixels ──
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = canvas.offsetWidth  * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Use setTransform so repeated calls (resize) don't stack the scale
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const loop = (timestamp: number) => {
      if (stageRef.current !== 'playing') return;
      rafRef.current = requestAnimationFrame(loop);

      // ── Delta-time: frame-rate independent physics ──────────────────────────
      // Cap at 100ms so a backgrounded tab doesn't cause a physics explosion.
      const dt      = Math.min(timestamp - lastTimeRef.current, 100);
      lastTimeRef.current = timestamp;
      const dtScale = dt / DT_BASE; // 1.0 at 60fps, 0.5 at 120fps, 2.0 at 30fps

      // ── Use LOGICAL dimensions for all drawing ──
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      const g = gs.current;
      g.frame++;

      const isPatient = roleRef.current === 'patient';
      const drain     = isPatient ? RESERVE_DRAIN_PAT : RESERVE_DRAIN_CLIN;
      const speedRamp = isPatient ? PAT_SPEED_RAMP    : SPEED_RAMP;

      // ── Physics (all values scaled by dtScale) — frozen during encounter ───
      if (!g.isPaused) {
        g.speed   = Math.min(g.maxSpeed, g.speed + speedRamp * dtScale);
        g.phase  += g.speed * 18      * dtScale;
        g.offset += g.speed * W * 0.5 * dtScale;
      }

      // ── Acidosis, lane lerp, reserve — all frozen during encounter ─────────
      let displayLane = g.currentLane; // visual offset (stumble); updated below if !isPaused
      if (!g.isPaused) {
        const speedExcess = Math.max(0, (g.speed - g.baseSpeed) / (g.maxSpeed - g.baseSpeed));
        const acidBuildRate = isPatient ? 0.008 : 0.012;
        const acidDecayRate = isPatient ? 0.004 : 0.003;
        g.acidosis = Math.max(
          0,
          Math.min(100, g.acidosis + (speedExcess * acidBuildRate - acidDecayRate) * dtScale),
        );

        const stumble = g.acidosis > 80
          ? Math.sin(g.frame * 0.45) * 0.08 * ((g.acidosis - 80) / 20)
          : 0;
        g.currentLane += (g.targetLane - g.currentLane) * LANE_LERP * dtScale;
        displayLane = g.currentLane + stumble;

        // ── Reserve drain ──
        reserveRef.current = Math.max(0, reserveRef.current - drain * dtScale);
        if (g.frame % 30 === 0) setReserve(Math.round(reserveRef.current));
        if (reserveRef.current <= 0) {
          setStage('gameover');
          stageRef.current = 'gameover';
          if (scoreRef.current > hiScoreRef.current) {
            hiScoreRef.current = scoreRef.current;
            setHiScore(hiScoreRef.current);
            try { localStorage.setItem('maxfun_hi', String(hiScoreRef.current)); }
            catch { /* storage quota or private browsing */ }
          }
          setAnalyticsLog([...g.analytics]);
          return;
        }
      } // end !isPaused block

      // ── Orb spawning (only when world is running) ──
      if (!g.isPaused) {
        // dt-scaled so spawn cadence (and encounter pacing) matches at 60/120 Hz
        g.orbSpawnTimer += dtScale;
        if (g.orbSpawnTimer >= ORB_SPAWN_INT) {
          g.orbSpawnTimer = 0;
          const lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
          const ot   = ORB_TYPES[Math.floor(Math.random() * ORB_TYPES.length)];
          g.orbs.push({
            lane, depth: 0.04,
            color: ot.color, label: ot.label,
            pulse: Math.random() * Math.PI * 2, collected: false,
          });
        }
      }

      // ── Orb movement & collection (freeze orbs during encounter) ──
      if (!g.isPaused) {
        for (const orb of g.orbs) {
          orb.depth += g.speed * 1.1 * dtScale;
          if (
            !orb.collected &&
            orb.depth >= CHAR_DEPTH - 0.06 &&
            orb.depth <= CHAR_DEPTH + 0.06
          ) {
            if (Math.abs(orb.lane - g.currentLane) < 0.45) {
              orb.collected = true;
              g.orbsCollected++;
              scoreRef.current += 10;
              if (g.frame % 5 === 0) setScore(scoreRef.current);
              emitBurst(g.particles, pX(orb.lane, CHAR_DEPTH, W), pY(CHAR_DEPTH, H), orb.color, 8, 4);
              g.acidosis = Math.max(0, g.acidosis - 2);
              sfxOrb();
              g.flashColor = '#ffffff'; g.flashAlpha = 0.06;
            }
          }
        }
        g.orbs = g.orbs.filter(o => o.depth < 1.05);
      }

      // ── Pokémon encounter: trigger when enough orbs collected ──
      if (!g.isPaused && g.orbsCollected >= g.orbsPerQ) {
        g.orbsCollected       = 0;
        g.isPaused            = true;
        g.encounterFlashFrames = ENCOUNTER_FLASH_FRAMES;
        g.pendingQIdx         = g.qIndex;
        g.qIndex              = (g.qIndex + 1) % g.questions.length;
        g.givenAnswer         = -1;
        encounterStartRef.current = performance.now();
        // Clear orbs so screen is clean when card appears
        g.orbs = [];
        // Show question after flash finishes (~6 frames ≈ 100ms) via timeout
        // We keep the flag in showQRef so the rAF loop doesn't re-trigger it
        showQRef.current = false;
        setChosenOption(-1);
        sfxEncounter();
        setTimeout(() => {
          if (stageRef.current !== 'playing') return;
          showQRef.current = true;
          setActiveQ(gs.current.questions[gs.current.pendingQIdx]);
          setShowQuestion(true);
        }, ENCOUNTER_FLASH_FRAMES * (DT_BASE + 4)); // ≈ 120ms
      }

      // ── Encounter: evaluate answer when player submits ──
      // Player presses an A/B/C button → pickAnswer sets g.givenAnswer.
      // The question card JSX shows a "Submit" button that calls evaluateAnswer().
      // (see evaluateAnswer callback defined below in component body)
      // No more auto-pass-through — world stays frozen until feedback is shown.

      // ── Particles & flash decay (dt-scaled) ──
      tickParticles(g.particles, dtScale);
      if (g.flashAlpha > 0) g.flashAlpha = Math.max(0, g.flashAlpha - 0.055 * dtScale);

      // ── DRAW ────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);

      if (modeRef.current === 'treadmill') drawCityBackground(ctx, W, H, g.offset);
      else                                  drawParkBackground(ctx, W, H, g.offset);

      drawRoad(ctx, W, H, modeRef.current, g.offset);
      if (!g.isPaused) drawSpeedLines(ctx, W, H, g.speed, g.frame);
      drawOrbs(ctx, W, H, g.orbs, g.frame);

      // Lane indicators — hidden during encounter (question card takes over)
      if (!g.isPaused) drawLaneIndicators(ctx, W, H, g.currentLane);

      // Character drawn at displayLane (includes stumble jitter); collection uses currentLane
      const charX       = pX(displayLane, CHAR_DEPTH, W);
      // Idle breathing bob while the encounter freeze is active, so the pause
      // reads as "waiting", not "hung" (g.frame keeps ticking during pause)
      const idleBob     = g.isPaused ? Math.sin(g.frame * 0.06) * H * 0.004 : 0;
      const charGroundY = pY(CHAR_DEPTH, H) + idleBob;
      const charScale   = pS(CHAR_DEPTH) * Math.min(W, H) * 0.5;
      const speedRatio  = Math.max(0, Math.min(1, (g.speed - g.baseSpeed) / (g.maxSpeed - g.baseSpeed)));
      if (modeRef.current === 'treadmill')
        drawRunner(ctx, charX, charGroundY, charScale, genderRef.current, g.phase, speedRatio);
      else
        drawCyclist(ctx, charX, charGroundY, charScale, genderRef.current, g.phase, speedRatio);

      drawParticles(ctx, g.particles);

      // Screen flash overlay (normal gameplay flashes)
      if (g.flashAlpha > 0.005) {
        ctx.save();
        ctx.globalAlpha = g.flashAlpha;
        ctx.fillStyle   = g.flashColor;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      // ── Pokémon GB-style encounter flash ────────────────────────────────────
      if (g.encounterFlashFrames > 0) {
        g.encounterFlashFrames--;
        ctx.save();
        ctx.fillStyle   = g.encounterFlashFrames % 2 === 1 ? '#ffffff' : '#0a0a1a';
        ctx.globalAlpha = 0.90 - (ENCOUNTER_FLASH_FRAMES - g.encounterFlashFrames) * 0.12;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      drawHUD(
        ctx, W, H,
        reserveRef.current, scoreRef.current, hiScoreRef.current,
        g.orbsCollected, g.orbsPerQ,
        g.speed, g.baseSpeed, g.maxSpeed,
        g.qCount, g.questions.length,
        roleRef.current,
      );
      drawAcidosisBar(ctx, W, H, g.acidosis, roleRef.current);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stage]);

  // ── Resize ──
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas || stageRef.current !== 'playing') return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // reset, don't stack
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── Resume from feedback ──
  const resumeFromFeedback = useCallback(() => {
    const g = gs.current;
    g.isPaused             = false;
    g.encounterFlashFrames = 0;
    g.pendingQIdx          = -1;
    g.givenAnswer          = -1;
    g.orbsCollected        = 0;
    g.orbSpawnTimer        = 0;
    showQRef.current = false;
    lastTimeRef.current = performance.now(); // prime dt — feedback pause could be 3–30 s
    setShowQuestion(false);
    setChosenOption(-1);
    setStage('playing');
    stageRef.current = 'playing';
  }, []);

  // ── Evaluate answer (called by Submit button in question card) ──
  const evaluateAnswer = useCallback(() => {
    const g = gs.current;
    if (!g.isPaused || g.pendingQIdx < 0) return;

    const isPatient     = roleRef.current === 'patient';
    const q             = g.questions[g.pendingQIdx];
    // Consume the pending question immediately: the card stays clickable while
    // its exit animation runs, so a second Confirm tap must be a no-op
    // (otherwise score/reserve/qCount/analytics double-count).
    g.pendingQIdx       = -1;
    const correctOptIdx = q.correct;
    const isCorrect     = g.givenAnswer === correctOptIdx;
    const rightBonus    = isPatient ? RESERVE_RIGHT_PAT : RESERVE_RIGHT_CLIN;
    const wrongPen      = isPatient ? RESERVE_WRONG_PAT : RESERVE_WRONG_CLIN;

    // ── Analytics ──
    g.analytics.push({
      qNum:      g.qCount + 1,
      latencyMs: Math.round(performance.now() - encounterStartRef.current),
      speedKmH:  Math.round((g.speed / BASE_SPEED) * 8 + 8),
      correct:   isCorrect,
    });

    if (isCorrect) {
      reserveRef.current = Math.min(100, reserveRef.current + rightBonus);
      scoreRef.current  += 100;
      setScore(scoreRef.current);
      g.acidosis = Math.max(0, g.acidosis - (isPatient ? 20 : 15));
      sfxCorrect();
    } else {
      reserveRef.current = Math.max(0, reserveRef.current + wrongPen);
      g.acidosis = Math.min(100, g.acidosis + (isPatient ? 18 : 25));
      sfxWrong();
    }
    setReserve(Math.round(reserveRef.current));

    // ── Build feedback ──
    const explanation = (isPatient && q.patientExplanation)
      ? q.patientExplanation
      : q.explanation;
    const feedbackMsg = isCorrect
      ? explanation
      : `Correct answer: ${q.options[correctOptIdx]} — ${explanation}`;

    g.qCount++;
    showQRef.current = false;
    setShowQuestion(false);
    setFeedbackCorrect(isCorrect);
    setFeedbackText(feedbackMsg);
    setFeedbackMeta({ options: q.options, correct: correctOptIdx, chosen: g.givenAnswer });
    setAnalyticsLog([...g.analytics]);
    setStage('feedback');
    stageRef.current = 'feedback';
  }, []);

  // ── Keyboard: answer inside the encounter card (1/2/3 or A/B/C, Enter to confirm) ──
  useEffect(() => {
    const KEY_TO_OPTION: Record<string, number> = {
      '1': 0, '2': 1, '3': 2, a: 0, b: 1, c: 2,
    };
    const onKey = (e: KeyboardEvent) => {
      if (stageRef.current !== 'playing' || !showQRef.current) return;
      const opt = KEY_TO_OPTION[e.key.toLowerCase()];
      if (opt !== undefined) pickAnswer(opt);
      else if (e.key === 'Enter' && gs.current.givenAnswer >= 0) evaluateAnswer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickAnswer, evaluateAnswer]);

  // ─────────────────────────────────────────────────────────────────────────
  // ── SHARED STYLES ──
  // ─────────────────────────────────────────────────────────────────────────
  const SCREEN_BG  = 'linear-gradient(160deg, #0a1628 0%, #112244 50%, #0a1628 100%)';
  const MONO       = "'Courier New', monospace";
  const primaryBtn: React.CSSProperties = {
    background: 'linear-gradient(135deg, #0071e3, #0055b3)',
    fontFamily: MONO,
    boxShadow:  '0 0 24px rgba(0,113,227,0.5)',
  };
  const ghostBtn: React.CSSProperties = {
    background: 'rgba(255,255,255,0.08)',
    color:       'rgba(255,255,255,0.6)',
    fontFamily:  MONO,
  };

  // ── Grid overlay (decorative) ──
  const GridOverlay = () => (
    <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={`h${i}`} className="absolute inset-x-0" style={{ top: `${i*10}%`, height: 1, background: '#4488ff' }} />
      ))}
      {Array.from({ length: 16 }).map((_, i) => (
        <div key={`v${i}`} className="absolute inset-y-0" style={{ left: `${i*6.25}%`, width: 1, background: '#4488ff' }} />
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // ── RENDER ──
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl select-none min-h-[540px] md:min-h-0"
      style={{ aspectRatio: '16/9', background: '#0d1117' }}
    >
      {/* Canvas — always mounted */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 0 }}
        onClick={handleCanvasTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />

      {/* ── WELCOME ── */}
      <AnimatePresence>
        {stage === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: SCREEN_BG, zIndex: 10 }}
          >
            <GridOverlay />
            <div className="absolute rounded-full pointer-events-none" style={{ width: 320, height: 320, background: 'radial-gradient(circle, rgba(0,113,227,0.20) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-60%)' }} />

            <div className="relative flex flex-col items-center gap-5 px-6">
              <div className="px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase" style={{ background: 'rgba(0,113,227,0.25)', color: '#4da8ff', border: '1px solid rgba(0,113,227,0.4)', fontFamily: MONO }}>
                AERO · CPET Education
              </div>

              <div className="text-center">
                <div className="font-black uppercase tracking-widest" style={{ fontSize: 'clamp(2.6rem, 8vw, 4.8rem)', fontFamily: MONO, color: '#fff', textShadow: '0 0 40px rgba(0,113,227,0.8), 0 0 80px rgba(0,113,227,0.4)', lineHeight: 1 }}>
                  MAX<span style={{ color: '#007aff' }}>FUN</span>
                </div>
                <div className="mt-2 text-sm font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: MONO }}>
                  Cardiopulmonary Exercise Testing
                </div>
              </div>

              {/* Orb pills */}
              <div className="flex gap-3 flex-wrap justify-center">
                {[{ label: 'VO₂', color: '#007aff' }, { label: 'VCO₂', color: '#ff3b30' }, { label: 'HR', color: '#34c759' }, { label: 'VE', color: '#af52de' }].map(o => (
                  <div key={o.label} className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: o.color + '33', color: o.color, border: `1px solid ${o.color}55`, fontFamily: MONO }}>
                    {o.label}
                  </div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                onClick={() => setStage('role-select')}
                className="mt-1 px-10 py-3 rounded-xl font-black text-white uppercase tracking-widest text-base"
                style={primaryBtn}
              >
                START GAME
              </motion.button>

              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: MONO }}>
                ← → keys · swipe · or tap to change lanes
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ROLE SELECT ── */}
      <AnimatePresence>
        {stage === 'role-select' && (
          <motion.div
            key="role-select"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-6"
            style={{ background: SCREEN_BG, zIndex: 10 }}
          >
            <GridOverlay />
            <div className="relative flex flex-col items-center gap-6 px-6 w-full max-w-lg">
              <div className="text-xs font-bold tracking-widest uppercase" style={{ color: '#4da8ff', fontFamily: MONO }}>
                Who's playing?
              </div>

              <div className="flex gap-4 flex-wrap justify-center w-full">
                {/* Patient / Child card */}
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setRole('patient')}
                  className="flex flex-col items-start gap-2 px-5 py-4 rounded-2xl flex-1"
                  style={{
                    background: role === 'patient' ? 'rgba(52,199,89,0.18)' : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${role === 'patient' ? '#34c759' : 'rgba(255,255,255,0.1)'}`,
                    minWidth: 140,
                  }}
                >
                  <div className="text-3xl">🧒</div>
                  <div className="font-black text-sm uppercase tracking-wider" style={{ color: '#fff', fontFamily: MONO }}>
                    Patient / Child
                  </div>
                  <div className="text-xs leading-snug text-left" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: MONO }}>
                    Plain-language CPET facts · Slower pace · Friendly mode
                  </div>
                  {role === 'patient' && (
                    <div className="text-xs font-bold mt-1" style={{ color: '#34c759', fontFamily: MONO }}>✓ Selected</div>
                  )}
                </motion.button>

                {/* Clinician card */}
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setRole('clinician')}
                  className="flex flex-col items-start gap-2 px-5 py-4 rounded-2xl flex-1"
                  style={{
                    background: role === 'clinician' ? 'rgba(0,113,227,0.22)' : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${role === 'clinician' ? '#007aff' : 'rgba(255,255,255,0.1)'}`,
                    minWidth: 140,
                  }}
                >
                  <div className="text-3xl">🩺</div>
                  <div className="font-black text-sm uppercase tracking-wider" style={{ color: '#fff', fontFamily: MONO }}>
                    Clinician / Student
                  </div>
                  <div className="text-xs leading-snug text-left" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: MONO }}>
                    Clinical CPET questions · Full speed · Technical HUD
                  </div>
                  {role === 'clinician' && (
                    <div className="text-xs font-bold mt-1" style={{ color: '#007aff', fontFamily: MONO }}>✓ Selected</div>
                  )}
                </motion.button>
              </div>

              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setStage('welcome')}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider"
                  style={ghostBtn}
                >
                  ← Back
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setStage('char-select')}
                  className="px-8 py-2.5 rounded-xl font-black text-white uppercase tracking-widest text-sm"
                  style={primaryBtn}
                >
                  Next →
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CHAR SELECT ── */}
      <AnimatePresence>
        {stage === 'char-select' && (
          <motion.div
            key="char-select"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-6"
            style={{ background: SCREEN_BG, zIndex: 10 }}
          >
            <GridOverlay />
            <div className="relative flex flex-col items-center gap-6 px-6">
              <div className="text-xs font-bold tracking-widest uppercase" style={{ color: '#4da8ff', fontFamily: MONO }}>Choose Your Athlete</div>
              <div className="flex gap-5 flex-wrap justify-center">
                {(['male', 'female'] as CharGender[]).map(g => (
                  <motion.button
                    key={g}
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setGender(g)}
                    className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl"
                    style={{
                      background: gender === g ? 'rgba(0,113,227,0.22)' : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${gender === g ? '#007aff' : 'rgba(255,255,255,0.1)'}`,
                      minWidth: 120,
                    }}
                  >
                    <div className="text-4xl">{g === 'male' ? '🏃' : '🏃‍♀️'}</div>
                    <div className="font-bold text-sm uppercase tracking-wider" style={{ color: '#fff', fontFamily: MONO }}>
                      {g === 'male' ? 'Male' : 'Female'}
                    </div>
                  </motion.button>
                ))}
              </div>
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setStage('role-select')}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider"
                  style={ghostBtn}
                >
                  ← Back
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setStage('mode-select')}
                  className="px-8 py-3 rounded-xl font-black text-white uppercase tracking-widest text-sm"
                  style={primaryBtn}
                >
                  Next →
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODE SELECT ── */}
      <AnimatePresence>
        {stage === 'mode-select' && (
          <motion.div
            key="mode-select"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-6"
            style={{ background: SCREEN_BG, zIndex: 10 }}
          >
            <GridOverlay />
            <div className="relative flex flex-col items-center gap-6 px-6">
              <div className="text-xs font-bold tracking-widest uppercase" style={{ color: '#4da8ff', fontFamily: MONO }}>Choose Exercise Mode</div>
              <div className="flex gap-5 flex-wrap justify-center">
                {(['treadmill', 'cycling'] as GameMode[]).map(m => (
                  <motion.button
                    key={m}
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setMode(m)}
                    className="flex flex-col items-center gap-3 px-7 py-5 rounded-2xl"
                    style={{
                      background: mode === m ? 'rgba(0,113,227,0.22)' : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${mode === m ? '#007aff' : 'rgba(255,255,255,0.1)'}`,
                      minWidth: 130,
                    }}
                  >
                    <div className="text-4xl">{m === 'treadmill' ? '🏙️' : '🚴'}</div>
                    <div className="font-bold text-sm uppercase tracking-wider" style={{ color: '#fff', fontFamily: MONO }}>
                      {m === 'treadmill' ? 'Treadmill' : 'Cycling'}
                    </div>
                    <div className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: MONO }}>
                      {m === 'treadmill' ? 'City Pavement Run' : 'Sunny Park Ride'}
                    </div>
                  </motion.button>
                ))}
              </div>
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setStage('char-select')}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider"
                  style={ghostBtn}
                >
                  ← Back
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={startGame}
                  className="px-8 py-2.5 rounded-xl font-black text-white uppercase tracking-widest text-sm"
                  style={primaryBtn}
                >
                  GO!
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ON-SCREEN LANE CONTROLS (only during normal play, not during encounter) ── */}
      <AnimatePresence>
        {stage === 'playing' && !showQuestion && (
          <motion.div
            key="lane-controls"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-x-0 bottom-2 flex justify-center gap-2 z-20 pointer-events-auto px-4"
          >
            {[
              { label: 'A', lane: -1, color: KAHOOT_COLORS[0] },
              { label: 'B', lane:  0, color: KAHOOT_COLORS[1] },
              { label: 'C', lane:  1, color: KAHOOT_COLORS[2] },
            ].map(({ label, lane, color }) => (
              <motion.button
                key={label}
                whileTap={{ scale: 0.90 }}
                onPointerDown={() => applyLaneChange(lane)}
                className="flex-1 max-w-[80px] py-2 rounded-xl font-black text-white text-sm"
                style={{
                  background: color,
                  fontFamily: MONO,
                  opacity:    0.85,
                  boxShadow:  `0 2px 12px ${color}66`,
                }}
              >
                {label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── POKÉMON-STYLE ENCOUNTER QUESTION CARD ── */}
      <AnimatePresence>
        {stage === 'playing' && showQuestion && activeQ && (
          <motion.div
            key="encounter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-auto"
            style={{ background: 'rgba(4,8,20,0.88)', backdropFilter: 'blur(6px)' }}
          >
            {/* Card */}
            <motion.div
              initial={{ scale: 0.88, y: 28 }}
              animate={{ scale: 1,    y: 0  }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="w-full flex flex-col"
              style={{ maxWidth: 540, padding: '0 12px' }}
            >
              {/* Header stripe */}
              <div
                className="rounded-t-2xl px-5 py-3 flex items-center gap-3"
                style={{ background: 'linear-gradient(90deg, #0055b3 0%, #0071e3 100%)' }}
              >
                <div className="text-xl">❓</div>
                <div>
                  <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: MONO }}>
                    CPET Question · {role === 'patient' ? 'Patient Mode' : 'Clinician Mode'}
                  </div>
                  <div className="text-xs font-bold" style={{ color: '#fff', fontFamily: MONO }}>
                    Q {gs.current.qCount + 1} / {gs.current.questions.length}
                  </div>
                </div>
              </div>

              {/* Question text */}
              <div
                className="px-5 py-4"
                style={{ background: 'rgba(10,18,40,0.98)', border: '1px solid rgba(0,113,227,0.3)', borderTop: 'none' }}
              >
                <p
                  className="font-semibold leading-relaxed"
                  style={{ color: '#fff', fontFamily: MONO, fontSize: 'clamp(0.8rem, 2.2vw, 1rem)' }}
                >
                  {activeQ.text}
                </p>
              </div>

              {/* Answer options */}
              <div
                className="grid gap-2 px-5 py-4"
                style={{
                  gridTemplateColumns: '1fr 1fr 1fr',
                  background: 'rgba(10,18,40,0.98)',
                  border: '1px solid rgba(0,113,227,0.3)',
                  borderTop: 'none',
                }}
              >
                {activeQ.options.slice(0, 3).map((opt, i) => {
                  const selected = chosenOption === i;
                  return (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => pickAnswer(i)}
                      className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl"
                      style={{
                        background: selected ? KAHOOT_COLORS[i] : KAHOOT_COLORS[i] + '44',
                        border: `2px solid ${selected ? '#fff' : KAHOOT_COLORS[i]}`,
                        transition: 'background 0.12s, border 0.12s',
                      }}
                    >
                      <span
                        className="font-black text-sm"
                        style={{ color: '#fff', fontFamily: MONO }}
                      >
                        {KAHOOT_LABELS[i]}
                      </span>
                      <span
                        className="text-xs font-semibold text-center leading-snug"
                        style={{ color: selected ? '#fff' : 'rgba(255,255,255,0.8)', fontFamily: MONO }}
                      >
                        {opt}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Submit footer */}
              <div
                className="rounded-b-2xl px-5 py-3 flex items-center justify-between"
                style={{ background: 'rgba(8,14,32,0.98)', border: '1px solid rgba(0,113,227,0.3)', borderTop: 'none' }}
              >
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.38)', fontFamily: MONO }}>
                  {chosenOption < 0 ? 'Select an answer above' : `Selected: ${KAHOOT_LABELS[chosenOption]}`}
                </div>
                <motion.button
                  whileHover={{ scale: chosenOption >= 0 ? 1.04 : 1 }}
                  whileTap={{ scale: chosenOption >= 0 ? 0.96 : 1 }}
                  onClick={evaluateAnswer}
                  disabled={chosenOption < 0}
                  className="px-6 py-2 rounded-xl font-black uppercase tracking-widest text-sm"
                  style={{
                    background: chosenOption >= 0
                      ? 'linear-gradient(135deg, #0071e3, #0055b3)'
                      : 'rgba(255,255,255,0.08)',
                    color: chosenOption >= 0 ? '#fff' : 'rgba(255,255,255,0.3)',
                    fontFamily: MONO,
                    cursor: chosenOption >= 0 ? 'pointer' : 'not-allowed',
                    boxShadow: chosenOption >= 0 ? '0 0 18px rgba(0,113,227,0.5)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  Confirm →
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FEEDBACK ── */}
      <AnimatePresence>
        {stage === 'feedback' && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1   }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center px-6"
            style={{
              background: feedbackCorrect ? 'rgba(0,28,12,0.96)' : 'rgba(28,4,4,0.96)',
              backdropFilter: 'blur(8px)',
              zIndex: 10,
            }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.05 }}
              className="text-5xl mb-3"
            >
              {feedbackCorrect ? '⭐' : '💡'}
            </motion.div>

            <div className="font-black text-2xl uppercase tracking-wider mb-3" style={{ color: feedbackCorrect ? '#34c759' : '#ff9500', fontFamily: MONO }}>
              {feedbackCorrect
                ? (role === 'patient' ? 'Amazing! 🎉' : 'Correct!')
                : (role === 'patient' ? 'Good try!'   : 'Not quite')}
            </div>

            {/* Kahoot-style recap: green = correct answer, red = your wrong pick */}
            {feedbackMeta && (
              <div className="flex gap-2 w-full max-w-md mb-4">
                {feedbackMeta.options.map((opt, i) => {
                  const isRight  = i === feedbackMeta.correct;
                  const isChosen = i === feedbackMeta.chosen;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-lg px-2 py-2 text-center"
                      style={{
                        fontFamily: MONO,
                        border: `2px solid ${isRight ? '#34c759' : isChosen ? '#ff3b30' : 'rgba(255,255,255,0.15)'}`,
                        background: isRight ? 'rgba(52,199,89,0.18)' : isChosen ? 'rgba(255,59,48,0.15)' : 'rgba(255,255,255,0.04)',
                        opacity: isRight || isChosen ? 1 : 0.45,
                      }}
                    >
                      <div className="font-black text-xs text-white">
                        {KAHOOT_LABELS[i]} {isRight ? '✓' : isChosen ? '✗' : ''}
                      </div>
                      <div className="text-[10px] leading-tight mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                        {opt}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-sm text-center max-w-md leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.78)', fontFamily: MONO }}>
              {feedbackText}
            </p>

            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={resumeFromFeedback}
              className="px-8 py-3 rounded-xl font-black text-white uppercase tracking-widest text-sm"
              style={primaryBtn}
            >
              {role === 'patient' ? 'Keep going! →' : 'Continue →'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── GAME OVER ── */}
      <AnimatePresence>
        {stage === 'gameover' && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-5"
            style={{ background: 'linear-gradient(160deg, #0a0a1a 0%, #1a0a0a 100%)', zIndex: 10 }}
          >
            <GridOverlay />
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="relative text-6xl"
            >
              {role === 'patient' ? '😮' : '❤️‍🔥'}
            </motion.div>

            <div className="text-center">
              <div className="font-black text-3xl uppercase tracking-widest" style={{ color: '#ff3b30', fontFamily: MONO }}>
                {role === 'patient' ? 'Take a Breath!' : 'VO₂ Depleted'}
              </div>
              {role === 'patient' && (
                <div className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: MONO }}>
                  You did great — collect orbs to stay energised!
                </div>
              )}
            </div>

            <div className="flex gap-8">
              <div className="text-center">
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: MONO }}>Score</div>
                <div className="text-2xl font-black" style={{ color: '#fff', fontFamily: MONO }}>{String(score).padStart(6, '0')}</div>
              </div>
              <div className="text-center">
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: MONO }}>Best</div>
                <div className="text-2xl font-black" style={{ color: '#ffcc00', fontFamily: MONO }}>{String(hiScore).padStart(6, '0')}</div>
              </div>
            </div>

            {/* ── Analytics table (clinician) / summary (patient) ── */}
            {analyticsLog.length > 0 && (
              <div className="w-full max-w-sm mx-4">
                {role === 'clinician' ? (
                  /* Full clinical report */
                  <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="px-3 pt-2 pb-1">
                      <div className="text-xs font-bold tracking-widest uppercase" style={{ color: '#4da8ff', fontFamily: MONO }}>
                        Session Report
                      </div>
                    </div>
                    <div className="px-3 pb-1" style={{ fontFamily: MONO }}>
                      {/* Header */}
                      <div className="grid grid-cols-4 gap-1 text-[9px] font-bold uppercase pb-1 mb-1" style={{ color: 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div>Q</div>
                        <div className="text-center">Speed</div>
                        <div className="text-center">Latency</div>
                        <div className="text-right">Result</div>
                      </div>
                      {/* Rows */}
                      {analyticsLog.map((row, idx) => (
                        <div key={idx} className="grid grid-cols-4 gap-1 text-[10px] py-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                          <div>Q{row.qNum}</div>
                          <div className="text-center">{row.speedKmH} km/h</div>
                          <div className="text-center">{row.latencyMs} ms</div>
                          <div className={`text-right font-black text-[10px] ${row.correct ? 'text-green-400' : 'text-red-400'}`}>
                            {row.correct ? 'PASS' : 'FAIL'}
                          </div>
                        </div>
                      ))}
                      {/* Summary row */}
                      <div className="grid grid-cols-4 gap-1 text-[10px] pt-1 mt-1 font-bold" style={{ color: 'rgba(255,255,255,0.5)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div>AVG</div>
                        <div className="text-center">
                          {Math.round(analyticsLog.reduce((s, r) => s + r.speedKmH, 0) / analyticsLog.length)} km/h
                        </div>
                        <div className="text-center">
                          {Math.round(analyticsLog.reduce((s, r) => s + r.latencyMs, 0) / analyticsLog.length)} ms
                        </div>
                        <div className="text-right" style={{ color: '#ffcc00' }}>
                          {analyticsLog.filter(r => r.correct).length}/{analyticsLog.length}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Patient / child — friendly score summary only */
                  <div className="flex justify-center gap-4">
                    <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(52,199,89,0.18)', border: '1px solid rgba(52,199,89,0.3)' }}>
                      <div className="text-xs font-bold uppercase" style={{ color: '#34c759', fontFamily: MONO }}>Correct</div>
                      <div className="text-2xl font-black" style={{ color: '#34c759', fontFamily: MONO }}>
                        {analyticsLog.filter(r => r.correct).length}
                      </div>
                    </div>
                    <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(255,59,48,0.18)', border: '1px solid rgba(255,59,48,0.3)' }}>
                      <div className="text-xs font-bold uppercase" style={{ color: '#ff3b30', fontFamily: MONO }}>Missed</div>
                      <div className="text-2xl font-black" style={{ color: '#ff3b30', fontFamily: MONO }}>
                        {analyticsLog.filter(r => !r.correct).length}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4 mt-2">
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={startGame}
                className="px-8 py-3 rounded-xl font-black text-white uppercase tracking-widest text-sm"
                style={primaryBtn}
              >
                {role === 'patient' ? 'Try Again!' : 'Play Again'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => setStage('welcome')}
                className="px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider"
                style={ghostBtn}
              >
                Menu
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
