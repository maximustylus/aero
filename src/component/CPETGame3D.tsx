import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';

// --- Clinical Decision Databases ---
const ClinicalDecisionNodes = [
  { prompt: "RER has crossed 1.15. What does this indicate?", options: ["Maximal Effort", "Artifact", "Calibration Error"], correctAnswer: "Maximal Effort" },
  { prompt: "Early plateau in O2 Pulse with rising HR indicates?", options: ["Stroke Volume Limit", "Ventilatory Limit", "Poor Motivation"], correctAnswer: "Stroke Volume Limit" },
  { prompt: "3mm ST segment depression observed. Action?", options: ["Terminate Test", "Push Harder", "Wait for Stage End"], correctAnswer: "Terminate Test" }
];

const PaediatricDecisionNodes = [
  { prompt: "You cannot speak clearly with the mask, but feel okay. Action?", options: ["Thumbs Up", "Pull Mask Off", "Stop Pedalling"], correctAnswer: "Thumbs Up" },
  { prompt: "Your legs feel very tired and heavy. What is the best action?", options: ["Point to Legs", "Close Eyes", "Jump Off Bike"], correctAnswer: "Point to Legs" },
  { prompt: "Why do we put sticky patches on your chest?", options: ["Listen to Heart", "Run Faster", "Measure Sweat"], correctAnswer: "Listen to Heart" }
];

const LANES = [-3, 0, 3];
const RUN_SPEED = 0.5;
const GRAVITY = -0.015;
const JUMP_FORCE = 0.3;

type Action = 'LANE_LEFT' | 'LANE_RIGHT' | 'JUMP' | 'SLIDE' | null;

interface CPETGame3DProps {
  persona?: 'learner' | 'patient';
  protocol?: 'running' | 'cycling';
  onEnd?: () => void;
}

interface GameState {
  score: number;
  isBulletTime: boolean;
  prompt: string | null;
  feedback: { text: string; isCorrect: boolean } | null;
  isLoading: boolean;
  loadProgress: number;
}

class InputManager {
  private action: Action = null;
  private touchStartX = 0;
  private touchStartY = 0;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    window.addEventListener('touchend', this.handleTouchEnd, { passive: false });
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft' || e.key === 'a') this.action = 'LANE_LEFT';
    if (e.key === 'ArrowRight' || e.key === 'd') this.action = 'LANE_RIGHT';
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') this.action = 'JUMP';
    if (e.key === 'ArrowDown' || e.key === 's') this.action = 'SLIDE';
  }

  private handleTouchStart(e: TouchEvent) {
    this.touchStartX = e.changedTouches[0].screenX;
    this.touchStartY = e.changedTouches[0].screenY;
  }

  private handleTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].screenX - this.touchStartX;
    const dy = e.changedTouches[0].screenY - this.touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30) this.action = 'LANE_RIGHT';
      else if (dx < -30) this.action = 'LANE_LEFT';
    } else {
      if (dy < -30) this.action = 'JUMP';
      else if (dy > 30) this.action = 'SLIDE';
    }
  }

  public consumeAction(): Action {
    const a = this.action;
    this.action = null;
    return a;
  }

  public dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchend', this.handleTouchEnd);
  }
}

class ObjectPool {
  private active: THREE.Mesh[] = [];
  private inactive: THREE.Mesh[] = [];
  private createFn: () => THREE.Mesh;

  constructor(createFn: () => THREE.Mesh, initialSize = 10) {
    this.createFn = createFn;
    for (let i = 0; i < initialSize; i++) {
      const mesh = this.createFn();
      mesh.visible = false;
      this.inactive.push(mesh);
    }
  }

  get(): THREE.Mesh {
    const mesh = this.inactive.length > 0 ? this.inactive.pop()! : this.createFn();
    mesh.visible = true;
    this.active.push(mesh);
    return mesh;
  }

  release(mesh: THREE.Mesh) {
    mesh.visible = false;
    const index = this.active.indexOf(mesh);
    if (index > -1) this.active.splice(index, 1);
    this.inactive.push(mesh);
  }

  getActive() { return this.active; }
}

export default function CPETGame3D({ persona = 'learner', protocol = 'running', onEnd }: CPETGame3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [uiState, setUiState] = useState<GameState>({
    score: 0, isBulletTime: false, prompt: null, feedback: null, isLoading: true, loadProgress: 0,
  });

  const gameState = useRef({
    score: 0, timeScale: 1.0, speed: RUN_SPEED, targetLane: 1, velocity: new THREE.Vector3(),
    isJumping: false, isSliding: false, slideTimer: 0, timeSinceLastPortal: 0,
    isBulletTime: false, currentPrompt: null as string | null, correctAnswer: null as string | null,
  });

  useEffect(() => {
    if (!mountRef.current) return;

    const manager = new THREE.LoadingManager();
    manager.onProgress = (url, itemsLoaded, itemsTotal) => setUiState(prev => ({ ...prev, loadProgress: (itemsLoaded / itemsTotal) * 100 }));
    manager.onLoad = () => setUiState(prev => ({ ...prev, isLoading: false }));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 5, 10);
    camera.rotation.x = -15 * (Math.PI / 180);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85));

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const curvedShader = (shader: THREE.Shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float dist = transformed.z - cameraPosition.z;
         transformed.y -= (dist * dist) * 0.0015;`
      );
    };

    const track = new THREE.Mesh(new THREE.PlaneGeometry(20, 400, 10, 100), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    track.material.onBeforeCompile = curvedShader;
    track.rotation.x = -Math.PI / 2;
    track.position.z = -150;
    track.receiveShadow = true;
    scene.add(track);

    const gridHelper = new THREE.GridHelper(20, 200, 0x334155, 0x334155);
    gridHelper.position.y = 0.01;
    gridHelper.position.z = -100;
    gridHelper.material.onBeforeCompile = curvedShader;
    scene.add(gridHelper);

    // --- Asset Assembly Pipeline ---
    const playerGroup = new THREE.Group();
    playerGroup.position.set(0, 1, 0);
    scene.add(playerGroup);

    const fallbackMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1, 4, 16), new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7 }));
    playerGroup.add(fallbackMesh);

    let mixer: THREE.AnimationMixer;
    const gltfLoader = new GLTFLoader(manager);

    const loadModel = (path: string) => new Promise<any>((resolve, reject) => gltfLoader.load(path, resolve, undefined, reject));

    const assembleClinicalScene = async () => {
      try {
        const charGltf = await loadModel('/models/character.glb');
        const characterModel = charGltf.scene;
        characterModel.position.y = -1; // Adjust origin
        characterModel.scale.set(1.1, 1.1, 1.1);
        
        if (charGltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(characterModel);
          mixer.clipAction(charGltf.animations[0]).play();
        }

        const equipPath = protocol === 'cycling' ? '/models/bike.glb' : '/models/treadmill.glb';
        const equipGltf = await loadModel(equipPath);
        const equipmentModel = equipGltf.scene;
        equipmentModel.position.y = -1.2; // Sit slightly under the character
        equipmentModel.scale.set(1.1, 1.1, 1.1);

        playerGroup.remove(fallbackMesh);
        playerGroup.add(equipmentModel);
        playerGroup.add(characterModel);

        playerGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) child.castShadow = true;
        });
      } catch (error) {
        console.warn('Failed to load separate assets. Using fallback.', error);
      }
    };
    assembleClinicalScene();

    const matVO2 = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x2563eb, emissiveIntensity: 1 });
    const matObstacle = new THREE.MeshStandardMaterial({ color: 0xf97316 });
    const matPortal = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x9333ea, transparent: true, opacity: 0.8 });
    [matVO2, matObstacle, matPortal].forEach(m => m.onBeforeCompile = curvedShader);

    const poolVO2 = new ObjectPool(() => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), matVO2);
      m.userData = { type: 'token', value: 10 };
      scene.add(m);
      return m;
    }, 10);

    const poolObstacleLow = new ObjectPool(() => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 0.5), matObstacle);
      m.userData = { type: 'obstacle', penalty: 20, isLow: true };
      scene.add(m);
      return m;
    }, 5);

    const activePortals: THREE.Group[] = [];

    const spawnObject = (zPos: number, isPortalRow = false, portalOptions: string[] = []) => {
      if (isPortalRow && portalOptions.length > 0) {
        const options = [...portalOptions].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(3, options.length); i++) {
          const portalGroup = new THREE.Group();
          portalGroup.position.set(LANES[i], 1.5, zPos);

          const portalMesh = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.2, 16, 32), matPortal);
          portalGroup.add(portalMesh);

          const canvas = document.createElement('canvas');
          canvas.width = 256; canvas.height = 128;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#9333ea'; ctx.fillRect(0, 0, 256, 128);
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const words = options[i].split(' ');
            if (words.length > 2) { ctx.fillText(words.slice(0, 2).join(' '), 128, 48); ctx.fillText(words.slice(2).join(' '), 128, 80); } 
            else { ctx.fillText(options[i], 128, 64); }
          }
          const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
          labelMesh.material.onBeforeCompile = curvedShader;
          labelMesh.position.y = 2;
          portalGroup.add(labelMesh);

          portalGroup.userData = { type: 'portal', answer: options[i] };
          scene.add(portalGroup);
          activePortals.push(portalGroup);
        }
        return;
      }

      const lane = LANES[Math.floor(Math.random() * 3)];
      if (Math.random() < 0.7) {
        const mesh = poolVO2.get(); mesh.position.set(lane, 1, zPos);
      } else {
        const mesh = poolObstacleLow.get(); mesh.position.set(lane, 0.5, zPos);
      }
    };

    for (let i = 0; i < 20; i++) spawnObject(-20 - i * 15);

    const inputManager = new InputManager();
    let animationId: number;
    const clock = new THREE.Clock();

    const resolveDecision = (answer: string) => {
      const isCorrect = answer === gameState.current.correctAnswer;
      gameState.current.isBulletTime = false;
      gameState.current.timeScale = 1.0;
      gameState.current.timeSinceLastPortal = 0;
      
      if (isCorrect) { gameState.current.score += 100; gameState.current.speed += 0.1; } 
      else { gameState.current.score -= 50; gameState.current.speed = Math.max(RUN_SPEED, gameState.current.speed - 0.1); }

      setUiState(prev => ({ ...prev, score: gameState.current.score, isBulletTime: false, prompt: null, feedback: { text: isCorrect ? "Calibrated! +Speed" : "Artifact! Penalty.", isCorrect } }));
      setTimeout(() => setUiState(prev => ({ ...prev, feedback: null })), 3000);
    };

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const state = gameState.current;

      if (Math.random() < 0.1) setUiState(prev => ({ ...prev, score: state.score }));
      if (state.score >= 1000 && onEnd) { onEnd(); return; }

      if (!state.isBulletTime) {
        state.timeSinceLastPortal += delta;
        state.speed += 0.0001; 
        if (state.timeSinceLastPortal > 25) {
          state.isBulletTime = true; state.timeScale = 0.2; 
          const activeBank = persona === 'learner' ? ClinicalDecisionNodes : PaediatricDecisionNodes;
          const randomNode = activeBank[Math.floor(Math.random() * activeBank.length)];
          state.currentPrompt = randomNode.prompt; state.correctAnswer = randomNode.correctAnswer;
          spawnObject(-60, true, randomNode.options);
          setUiState(prev => ({ ...prev, isBulletTime: true, prompt: randomNode.prompt }));
        }
      }

      const effectiveSpeed = state.speed * state.timeScale;
      if (mixer) mixer.update(delta * state.timeScale * (state.speed / RUN_SPEED));

      const action = inputManager.consumeAction();
      if (action === 'LANE_LEFT' && state.targetLane > 0) { state.targetLane--; gsap.to(playerGroup.position, { x: LANES[state.targetLane], duration: 0.4 }); } 
      else if (action === 'LANE_RIGHT' && state.targetLane < 2) { state.targetLane++; gsap.to(playerGroup.position, { x: LANES[state.targetLane], duration: 0.4 }); } 
      else if (action === 'JUMP' && !state.isJumping && !state.isSliding) { state.velocity.y = JUMP_FORCE; state.isJumping = true; } 
      else if (action === 'SLIDE' && !state.isJumping && !state.isSliding) { state.isSliding = true; state.slideTimer = 40; gsap.to(playerGroup.scale, { y: 0.5, duration: 0.2 }); }

      if (state.isJumping) {
        state.velocity.y += GRAVITY; playerGroup.position.y += state.velocity.y;
        if (playerGroup.position.y <= 1) { playerGroup.position.y = 1; state.isJumping = false; state.velocity.y = 0; }
      }

      if (state.isSliding) {
        state.slideTimer--;
        if (state.slideTimer <= 0) { state.isSliding = false; gsap.to(playerGroup.scale, { y: 1, duration: 0.2 }); }
      }

      [poolVO2, poolObstacleLow].forEach(pool => {
        const activeMeshes = pool.getActive();
        for (let i = activeMeshes.length - 1; i >= 0; i--) {
          const obj = activeMeshes[i];
          obj.position.z += effectiveSpeed;
          if (obj.userData.type === 'token') obj.rotation.y += 0.05;

          if (playerGroup.position.distanceTo(obj.position) < 1.2) {
            if (obj.userData.type === 'token') { state.score += obj.userData.value; pool.release(obj); } 
            else if (obj.userData.type === 'obstacle' && !(obj.userData.isLow && state.isJumping)) {
              state.score -= obj.userData.penalty; state.speed = Math.max(RUN_SPEED, state.speed - 0.05); pool.release(obj);
            }
          } else if (obj.position.z > 10) { pool.release(obj); if (!state.isBulletTime) spawnObject(-150); }
        }
      });

      for (let i = activePortals.length - 1; i >= 0; i--) {
        const portal = activePortals[i];
        portal.position.z += effectiveSpeed;
        if (playerGroup.position.distanceTo(portal.position) < 1.5) {
          resolveDecision(portal.userData.answer);
          activePortals.forEach(p => scene.remove(p)); activePortals.length = 0; break;
        } else if (portal.position.z > 10) { scene.remove(portal); activePortals.splice(i, 1); }
      }

      camera.position.x += (playerGroup.position.x * 0.5 - camera.position.x) * 0.1;
      composer.render();
    };

    setTimeout(() => manager.onLoad(), 500);
    animate();

    const handleResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight); };
    window.addEventListener('resize', handleResize);
    return () => { inputManager.dispose(); window.removeEventListener('resize', handleResize); cancelAnimationFrame(animationId); if (mountRef.current) mountRef.current.removeChild(renderer.domElement); renderer.dispose(); };
  }, [persona, protocol]);

  const acidosisLevel = Math.min(100, Math.max(10, ((uiState.score / 1000) * 100)));

  return (
    <div className="relative w-full h-screen overflow-hidden touch-none font-display bg-background-dark text-white">
      <div ref={mountRef} className="absolute inset-0 z-0" />
      
      {uiState.isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0f172a]">
          <span className="material-symbols-outlined text-6xl text-primary animate-spin mb-4">sync</span>
          <h2 className="text-2xl font-black uppercase italic tracking-widest mb-4">Mounting Assets</h2>
          <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${uiState.loadProgress}%` }}></div></div>
        </div>
      )}

      {!uiState.isLoading && (
        <div className="absolute inset-0 z-10 pointer-events-none p-6 md:p-10 flex flex-col justify-between">
          <div className="flex justify-center w-full pointer-events-auto">
            <div className="glass-panel px-8 py-4 rounded-full flex items-center gap-10 shadow-2xl border border-white/10 backdrop-blur-xl">
              <div className="flex flex-col items-center min-w-[80px]">
                <div className="flex items-center gap-1 mb-1"><span className="material-symbols-outlined text-red-500 text-sm animate-pulse">favorite</span><span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">HR</span></div>
                <span className="text-4xl font-black tabular-nums">148 <span className="text-xs opacity-40">bpm</span></span>
              </div>
              <div className="h-10 w-px bg-white/10"></div>
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="flex items-center gap-1 mb-1"><span className="material-symbols-outlined text-primary text-sm">vital_signs</span><span className="text-[10px] font-bold text-primary uppercase tracking-widest">VO₂ Peak</span></div>
                <span className="text-4xl font-black tabular-nums text-glow">32.1</span>
              </div>
              <div className="h-10 w-px bg-white/10"></div>
              <div className="flex flex-col items-center min-w-[80px]">
                <div className="flex items-center gap-1 mb-1 text-yellow-500"><span className="material-symbols-outlined text-sm">stars</span><span className="text-[10px] font-bold uppercase tracking-widest">Score</span></div>
                <span className="text-4xl font-black tabular-nums">{uiState.score}</span>
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between w-full pointer-events-auto">
            <div className="glass-panel p-1 rounded-[2.5rem] border border-white/10 shadow-xl">
              <div className="bg-primary/20 border border-primary/30 rounded-[2.2rem] px-10 py-6 flex flex-col justify-center min-w-[200px]">
                <span className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-1">Current Stage</span>
                <div className="flex items-baseline gap-2"><span className="text-5xl font-black italic">{protocol === 'cycling' ? 'Ramp' : 'Bruce'}</span></div>
                <span className="text-white text-xs font-bold mt-2 uppercase tracking-widest bg-white/5 py-1 px-3 rounded-full">{persona === 'learner' ? 'Clinical' : 'Patient'}</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="glass-panel p-3 rounded-full h-[320px] w-[70px] flex flex-col items-center justify-end relative overflow-hidden border border-white/10">
                <span className="absolute top-6 material-symbols-outlined text-red-500 text-2xl animate-pulse">warning</span>
                <div className="w-2.5 acidosis-gradient rounded-full relative shadow-[0_0_15px_rgba(13,89,242,0.3)] transition-all duration-300" style={{ height: `${acidosisLevel}%` }}><div className="absolute top-0 left-0 right-0 h-1.5 bg-white shadow-[0_0_15px_white] rounded-full"></div></div>
                <span className="material-symbols-outlined text-white/30 text-2xl mt-6 mb-2">water_drop</span>
              </div>
              <button onClick={onEnd} className="h-20 w-20 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.4)] transition-transform active:scale-90"><span className="material-symbols-outlined text-4xl font-black text-white">stop</span></button>
            </div>
          </div>

          {uiState.isBulletTime && uiState.prompt && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-50 pointer-events-none">
              <div className="bg-indigo-900/90 backdrop-blur-xl border-2 border-indigo-400/50 rounded-3xl p-10 text-center shadow-[0_0_60px_rgba(79,70,229,0.4)]">
                <h2 className="text-indigo-300 text-xs font-black tracking-[0.4em] uppercase mb-6 animate-pulse">Challenge Detected</h2>
                <p className="text-3xl md:text-4xl font-bold leading-tight text-white">{uiState.prompt}</p>
              </div>
            </div>
          )}

          {uiState.feedback && (
            <div className="absolute bottom-40 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
              <div className={`px-8 py-4 rounded-full border-2 backdrop-blur-md shadow-2xl ${uiState.feedback.isCorrect ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-red-500/20 border-red-500 text-red-400'}`}>
                <span className="font-black uppercase tracking-widest text-lg italic">{uiState.feedback.text}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
