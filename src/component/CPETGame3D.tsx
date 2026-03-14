import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';

// --- Constants & Types ---
const LANES = [-3, 0, 3];
const RUN_SPEED = 0.5;
const GRAVITY = -0.015;
const JUMP_FORCE = 0.3;

type Action = 'LANE_LEFT' | 'LANE_RIGHT' | 'JUMP' | 'SLIDE' | null;

// --- 1. Unified Input Bridge ---
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
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.action = 'LANE_LEFT';
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.action = 'LANE_RIGHT';
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') this.action = 'JUMP';
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.action = 'SLIDE';
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

// --- Object Pooling ---
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

  getActive() {
    return this.active;
  }
}

interface GameState {
  score: number;
  isBulletTime: boolean;
  prompt: string | null;
  feedback: { text: string; isCorrect: boolean } | null;
  isLoading: boolean;
  loadProgress: number;
}

export default function CPETGame3D({ onEnd }: { onEnd?: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [uiState, setUiState] = useState<GameState>({
    score: 0,
    isBulletTime: false,
    prompt: null,
    feedback: null,
    isLoading: true,
    loadProgress: 0,
  });

  // Mutable state for the animation loop
  const gameState = useRef({
    score: 0,
    timeScale: 1.0,
    speed: RUN_SPEED,
    targetLane: 1, // 0: Left, 1: Center, 2: Right
    velocity: new THREE.Vector3(),
    isJumping: false,
    isSliding: false,
    slideTimer: 0,
    timeSinceLastPortal: 0,
    isBulletTime: false,
    currentPrompt: null as string | null,
    correctAnswer: null as string | null,
  });

  // Theme Toggle Handler
  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Synchronise DOM with Tailwind dark class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Loading Manager ---
    const manager = new THREE.LoadingManager();
    manager.onProgress = (url, itemsLoaded, itemsTotal) => {
      setUiState(prev => ({ ...prev, loadProgress: (itemsLoaded / itemsTotal) * 100 }));
    };
    manager.onLoad = () => {
      setUiState(prev => ({ ...prev, isLoading: false }));
    };

    // --- 3. 3D Scene Geometry & Camera ---
    const scene = new THREE.Scene();
    const darkBg = new THREE.Color(0x0f172a);
    const lightBg = new THREE.Color(0xf5f6f8);
    scene.background = isDarkMode ? darkBg : lightBg;
    scene.fog = new THREE.FogExp2(isDarkMode ? 0x0f172a : 0xf5f6f8, 0.015);

    // PerspectiveCamera: 75 FOV, pos (0, 5, 10), tilt -15 deg
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 5, 10);
    camera.rotation.x = -15 * (Math.PI / 180); // Tilt down 15 degrees

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // --- Post-Processing (UnrealBloomPass) ---
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.enabled = isDarkMode; // Only enable bloom in dark mode
    composer.addPass(bloomPass);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, isDarkMode ? 0.6 : 1.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    scene.add(dirLight);

    // --- Curved World Shader ---
    const curvedShader = (shader: THREE.Shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float dist = transformed.z - cameraPosition.z;
        transformed.y -= (dist * dist) * 0.0015; // Curve down over horizon
        `
      );
    };

    // --- Environment (Track) ---
    const trackGeo = new THREE.PlaneGeometry(20, 400, 10, 100);
    const trackMat = new THREE.MeshStandardMaterial({ 
      color: 0x1e293b, 
      roughness: 0.8,
    });
    trackMat.onBeforeCompile = curvedShader;
    const track = new THREE.Mesh(trackGeo, trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.z = -150;
    track.receiveShadow = true;
    scene.add(track);

    const gridHelper = new THREE.GridHelper(20, 200, 0x334155, 0x334155);
    gridHelper.position.y = 0.01;
    gridHelper.position.z = -100;
    gridHelper.material.onBeforeCompile = curvedShader;
    scene.add(gridHelper);

    // --- Assets & Entities ---
    // Runner (Physiologist Avatar)
    const runnerGeo = new THREE.CapsuleGeometry(0.4, 1, 4, 16);
    const runnerMat = new THREE.MeshStandardMaterial({ 
      color: 0x0ea5e9, 
      emissive: isDarkMode ? 0x0284c7 : 0x000000,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8
    });
    const runner = new THREE.Mesh(runnerGeo, runnerMat);
    runner.position.set(0, 1, 0);
    runner.castShadow = true;
    scene.add(runner);

    // Materials
    const matVO2 = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: isDarkMode ? 0x2563eb : 0x000000, emissiveIntensity: 1 });
    const matHR = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: isDarkMode ? 0xdc2626 : 0x000000, emissiveIntensity: 1 });
    const matVCO2 = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: isDarkMode ? 0x059669 : 0x000000, emissiveIntensity: 1 });
    const matObstacle = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.9 });
    const matCloud = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    const matPortal = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: isDarkMode ? 0x9333ea : 0x000000, emissiveIntensity: 1.5, transparent: true, opacity: 0.8 });

    [matVO2, matHR, matVCO2, matObstacle, matCloud, matPortal].forEach(m => m.onBeforeCompile = curvedShader);

    // Object Pools
    const poolVO2 = new ObjectPool(() => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), matVO2);
      m.userData = { type: 'token', value: 10, name: 'VO2' };
      scene.add(m);
      return m;
    }, 10);

    const poolHR = new ObjectPool(() => {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), matHR);
      m.userData = { type: 'token', value: 15, name: 'HR' };
      scene.add(m);
      return m;
    }, 10);

    const poolVCO2 = new ObjectPool(() => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 16), matVCO2);
      m.userData = { type: 'token', value: 15, name: 'VCO2' };
      scene.add(m);
      return m;
    }, 10);

    const poolObstacleLow = new ObjectPool(() => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 0.5), matObstacle);
      m.userData = { type: 'obstacle', penalty: 20, isLow: true };
      scene.add(m);
      return m;
    }, 5);

    const poolObstacleHigh = new ObjectPool(() => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), matCloud);
      m.userData = { type: 'obstacle', penalty: 20, isHigh: true };
      scene.add(m);
      return m;
    }, 5);

    const activePortals: THREE.Group[] = [];

    const createTextTexture = (text: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = isDarkMode ? '#9333ea' : '#0d59f2'; 
        ctx.fillRect(0, 0, 256, 128);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 64);
      }
      return new THREE.CanvasTexture(canvas);
    };

    const spawnObject = (zPos: number, isPortalRow = false) => {
      if (isPortalRow) {
        const options = ['Cardiac', 'Pulmonary', 'Metabolic'];
        options.sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < 3; i++) {
          const portalGroup = new THREE.Group();
          portalGroup.position.set(LANES[i], 1.5, zPos);

          const portalGeo = new THREE.TorusGeometry(1.2, 0.2, 16, 32);
          const portalMesh = new THREE.Mesh(portalGeo, matPortal);
          portalGroup.add(portalMesh);

          const labelGeo = new THREE.PlaneGeometry(2, 1);
          const labelMat = new THREE.MeshBasicMaterial({ 
            map: createTextTexture(options[i]),
            transparent: true,
            opacity: 0.9
          });
          labelMat.onBeforeCompile = curvedShader;
          const labelMesh = new THREE.Mesh(labelGeo, labelMat);
          labelMesh.position.y = 2;
          portalGroup.add(labelMesh);

          portalGroup.userData = { type: 'portal', answer: options[i] };
          scene.add(portalGroup);
          activePortals.push(portalGroup);
        }
        return;
      }

      const lane = LANES[Math.floor(Math.random() * 3)];
      const rand = Math.random();
      let mesh: THREE.Mesh;

      if (rand < 0.4) {
        mesh = poolVO2.get();
        mesh.position.set(lane, 1, zPos);
      } else if (rand < 0.6) {
        mesh = poolHR.get();
        mesh.position.set(lane, 1, zPos);
      } else if (rand < 0.7) {
        mesh = poolVCO2.get();
        mesh.position.set(lane, 1, zPos);
      } else if (rand < 0.85) {
        mesh = poolObstacleLow.get();
        mesh.position.set(lane, 0.5, zPos);
      } else {
        mesh = poolObstacleHigh.get();
        mesh.position.set(lane, 2.5, zPos);
      }
    };

    // Initial spawn
    for (let i = 0; i < 20; i++) {
      spawnObject(-20 - i * 15);
    }

    // --- Input Manager ---
    const inputManager = new InputManager();

    // --- Game Loop ---
    let animationId: number;
    const clock = new THREE.Clock();

    const triggerDecisionNode = () => {
      gameState.current.isBulletTime = true;
      gameState.current.timeScale = 0.2; // Bullet Time
      gameState.current.currentPrompt = "If O2 Pulse flattens early but VE reserve is high, what system is limiting?";
      gameState.current.correctAnswer = "Cardiac";
      
      spawnObject(-60, true);

      setUiState(prev => ({
        ...prev,
        isBulletTime: true,
        prompt: gameState.current.currentPrompt,
      }));
    };

    const resolveDecision = (answer: string) => {
      const isCorrect = answer === gameState.current.correctAnswer;
      gameState.current.isBulletTime = false;
      gameState.current.timeScale = 1.0;
      gameState.current.timeSinceLastPortal = 0;
      gameState.current.currentPrompt = null;
      
      if (isCorrect) {
        gameState.current.score += 100;
        gameState.current.speed += 0.1;
      } else {
        gameState.current.score -= 50;
        gameState.current.speed = Math.max(RUN_SPEED, gameState.current.speed - 0.1);
      }

      setUiState(prev => ({
        ...prev,
        score: gameState.current.score,
        isBulletTime: false,
        prompt: null,
        feedback: {
          text: isCorrect ? "Correct! Massive Speed Boost!" : "Incorrect! Stumble Penalty.",
          isCorrect
        }
      }));

      setTimeout(() => setUiState(prev => ({ ...prev, feedback: null })), 3000);
    };

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const state = gameState.current;

      if (Math.random() < 0.1) {
        setUiState(prev => ({ ...prev, score: state.score }));
      }

      if (state.score >= 1000 && onEnd) {
        onEnd();
        return;
      }

      if (!state.isBulletTime) {
        state.timeSinceLastPortal += delta;
        state.speed += 0.0001; 
        
        if (state.timeSinceLastPortal > 30) {
          triggerDecisionNode();
        }
      }

      const effectiveSpeed = state.speed * state.timeScale;

      // Process Input
      const action = inputManager.consumeAction();
      if (action === 'LANE_LEFT' && state.targetLane > 0) {
        state.targetLane--;
        gsap.to(runner.position, { x: LANES[state.targetLane], duration: 0.4, ease: "power2.out" });
      } else if (action === 'LANE_RIGHT' && state.targetLane < 2) {
        state.targetLane++;
        gsap.to(runner.position, { x: LANES[state.targetLane], duration: 0.4, ease: "power2.out" });
      } else if (action === 'JUMP' && !state.isJumping && !state.isSliding) {
        state.velocity.y = JUMP_FORCE;
        state.isJumping = true;
      } else if (action === 'SLIDE' && !state.isJumping && !state.isSliding) {
        state.isSliding = true;
        state.slideTimer = 40;
        gsap.to(runner.scale, { y: 0.5, duration: 0.2 });
        gsap.to(runner.position, { y: 0.5, duration: 0.2 });
      }

      // Physics
      if (state.isJumping) {
        state.velocity.y += GRAVITY;
        runner.position.y += state.velocity.y;
        if (runner.position.y <= 1) {
          runner.position.y = 1;
          state.isJumping = false;
          state.velocity.y = 0;
        }
      }

      if (state.isSliding) {
        state.slideTimer--;
        if (state.slideTimer <= 0) {
          state.isSliding = false;
          gsap.to(runner.scale, { y: 1, duration: 0.2 });
          gsap.to(runner.position, { y: 1, duration: 0.2 });
        }
      }

      // Move & Cull Objects
      const allPools = [poolVO2, poolHR, poolVCO2, poolObstacleLow, poolObstacleHigh];
      
      allPools.forEach(pool => {
        const activeMeshes = pool.getActive();
        for (let i = activeMeshes.length - 1; i >= 0; i--) {
          const obj = activeMeshes[i];
          obj.position.z += effectiveSpeed;

          if (obj.userData.type === 'token') {
            obj.rotation.y += 0.05;
            obj.rotation.x += 0.02;
          }

          const dist = runner.position.distanceTo(obj.position);
          if (dist < 1.2) {
            if (obj.userData.type === 'token') {
              state.score += obj.userData.value;
              pool.release(obj);
            } else if (obj.userData.type === 'obstacle') {
              const isDodgingHigh = obj.userData.isHigh && state.isSliding;
              const isDodgingLow = obj.userData.isLow && state.isJumping;
              
              if (!isDodgingHigh && !isDodgingLow) {
                state.score -= obj.userData.penalty;
                state.speed = Math.max(RUN_SPEED, state.speed - 0.05);
                
                // Flash red
                const mat = runner.material as THREE.MeshStandardMaterial;
                const originalEmissive = mat.emissive.getHex();
                mat.emissive.setHex(0xff0000);
                setTimeout(() => mat.emissive.setHex(originalEmissive), 200);

                pool.release(obj);
              }
            }
          } else if (obj.position.z > 10) { // Culling Z > 10
            pool.release(obj);
            if (!state.isBulletTime) spawnObject(-150);
          }
        }
      });

      // Move Portals
      for (let i = activePortals.length - 1; i >= 0; i--) {
        const portal = activePortals[i];
        portal.position.z += effectiveSpeed;
        portal.children[0].rotation.z -= 0.02; // Rotate torus

        const dist = runner.position.distanceTo(portal.position);
        if (dist < 1.5) {
          resolveDecision(portal.userData.answer);
          activePortals.forEach(p => scene.remove(p));
          activePortals.length = 0;
          break;
        } else if (portal.position.z > 10) {
          scene.remove(portal);
          activePortals.splice(i, 1);
        }
      }

      // Camera follow
      camera.position.x += (runner.position.x * 0.5 - camera.position.x) * 0.1;
      
      composer.render();
    };

    // Simulate loading delay for demonstration
    setTimeout(() => manager.onLoad(), 500);
    animate();

    // --- Responsive Design ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- Cleanup ---
    return () => {
      inputManager.dispose();
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // --- Dynamic Theming Effect ---
  useEffect(() => {
    // We animate the background colour of the scene directly if we had access to it here,
    // but since scene is inside the other useEffect, we handle the DOM classes here.
    // The Three.js scene background interpolation can be handled by exposing the scene or 
    // simply re-rendering. For a true 500ms linear interpolation in Three.js, we'd need 
    // a ref to the scene. Let's do a quick DOM transition for the HUD.
  }, [isDarkMode]);

return (
    <div className={`relative w-full h-screen overflow-hidden touch-none font-display transition-colors duration-500 ${isDarkMode ? 'bg-background-dark text-white' : 'bg-background-light text-slate-900'}`}>
      
      {/* 3D Container: Always rendered to prevent crashing */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* Loading Screen: Hovers over the game until Three.js is ready */}
      {uiState.isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900 text-white">
          <div className="flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-6xl text-blue-500 animate-spin">sync</span>
            <h2 className="text-2xl font-bold tracking-widest uppercase">Loading Assets</h2>
            <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${uiState.loadProgress}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Game HUD: Only appears once loading is false */}
      {!uiState.isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col h-full p-4 md:p-8 justify-between pointer-events-none">
          
          {/* Top Bar Stats */}
          <div className="flex flex-col xl:flex-row gap-4 w-full items-start xl:items-center justify-between pointer-events-auto">
            <div className="glass-panel px-5 py-3 rounded-full flex items-center gap-3 shadow-lg">
              <button onClick={onEnd} className="opacity-70 hover:opacity-100">
                <span className="material-symbols-outlined text-2xl">arrow_back</span>
              </button>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold">Protocol</span>
                <h1 className="text-lg font-bold leading-none">Running (Treadmill)</h1>
              </div>
            </div>

            <div className="glass-panel px-6 py-3 rounded-full flex items-center gap-8 shadow-2xl box-glow">
              <div className="flex flex-col items-center min-w-[80px]">
                <span className="text-xs font-medium opacity-60">SCORE</span>
                <span className="text-3xl font-bold tabular-nums">{uiState.score}</span>
              </div>
              <div className="flex flex-col items-center min-w-[80px]">
                <span className="text-xs font-medium opacity-60">HR</span>
                <span className="text-3xl font-bold text-red-500">148</span>
              </div>
              <div className="flex flex-col items-center min-w-[100px]">
                <span className="text-xs font-bold text-blue-400">VO₂</span>
                <span className="text-3xl font-bold">32.1</span>
              </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="flex w-full items-end justify-between pointer-events-auto pb-4">
            <div className="glass-panel p-4 rounded-2xl flex flex-col min-w-[160px]">
              <span className="text-blue-400 text-xs font-bold uppercase mb-1">Current Stage</span>
              <span className="text-3xl font-bold">2 <span className="text-sm opacity-50">/ 3</span></span>
            </div>

            <div className="flex items-center gap-4">
               <button onClick={onEnd} className="h-20 w-20 rounded-full bg-red-600 shadow-lg flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-4xl font-bold">stop</span>
              </button>
            </div>
          </div>

          {/* Bullet Time Logic Overlay */}
          {uiState.isBulletTime && uiState.prompt && (
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl text-center z-50">
              <div className="bg-indigo-900/90 backdrop-blur-lg border-2 border-indigo-400 rounded-2xl p-8 shadow-2xl text-white">
                <h2 className="text-indigo-300 text-sm font-black tracking-widest uppercase mb-4 animate-pulse">⚠️ Clinical Query ⚠️</h2>
                <p className="text-2xl md:text-3xl font-medium">{uiState.prompt}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
