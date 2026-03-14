import React, { useEffect, useRef, useState } from 'react';

export default function CPETGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showDecision, setShowDecision] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const animationFrameId = useRef<number | null>(null);

  const gameState = useRef({
    isRunning: true,
    speed: 5,
    score: 0,
    frames: 0,
    decisionTriggered: false,
    runner: {
      x: 50,
      y: 250,
      width: 30,
      height: 50,
      dy: 0,
      gravity: 0.6,
      jumpPower: -12,
      isJumping: false,
      isSliding: false
    },
    tokens: [] as { x: number, y: number, radius: number, collected: boolean }[],
    groundY: 300
  });

  const handleAnswer = (isCorrect: boolean) => {
    if (isCorrect) {
      gameState.current.speed += 2;
      gameState.current.score += 100;
      setFeedback("Correct. O2 Pulse flattening suggests a cardiac output limitation. Speed boosted.");
    } else {
      gameState.current.speed = Math.max(3, gameState.current.speed - 2);
      gameState.current.score -= 20;
      setFeedback("Incorrect. O2 Pulse reflects stroke volume and oxygen extraction. A flat trajectory with high VE reserve indicates a cardiac limit. Speed reduced.");
    }
    
    setTimeout(() => {
      setFeedback(null);
      setShowDecision(false);
      gameState.current.decisionTriggered = false;
      gameState.current.isRunning = true;
      animationFrameId.current = requestAnimationFrame(gameLoop);
    }, 5000);
  };

  const update = () => {
    const state = gameState.current;
    if (!state.isRunning) return;

    state.frames++;
    state.speed += 0.002;

    state.runner.dy += state.runner.gravity;
    state.runner.y += state.runner.dy;

    if (state.runner.y + state.runner.height >= state.groundY) {
      state.runner.y = state.groundY - state.runner.height;
      state.runner.dy = 0;
      state.runner.isJumping = false;
    }

    if (state.frames % Math.floor(100 / (state.speed / 5)) === 0) {
      const isHigh = Math.random() > 0.5;
      state.tokens.push({
        x: 800,
        y: isHigh ? state.groundY - 90 : state.groundY - 20,
        radius: 15,
        collected: false
      });
    }

    state.tokens.forEach(token => {
      token.x -= state.speed;
      if (!token.collected) {
        const distX = Math.abs(token.x - (state.runner.x + state.runner.width / 2));
        const distY = Math.abs(token.y - (state.runner.y + state.runner.height / 2));

        if (distX < (state.runner.width / 2 + token.radius) && 
            distY < (state.runner.height / 2 + token.radius)) {
          token.collected = true;
          state.score += 10;
        }
      }
    });

    state.tokens = state.tokens.filter(t => t.x > -50);

    if (state.score >= 100 && !state.decisionTriggered) {
      state.decisionTriggered = true;
      state.isRunning = false;
      setShowDecision(true);
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const state = gameState.current;
    
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(0, 0, 800, 400);

    ctx.fillStyle = '#333333';
    ctx.fillRect(0, state.groundY, 800, 100);

    ctx.fillStyle = '#005A8D';
    ctx.fillRect(state.runner.x, state.runner.y, state.runner.width, state.runner.height);

    state.tokens.forEach(token => {
      if (!token.collected) {
        ctx.beginPath();
        ctx.arc(token.x, token.y, token.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#00A3E0';
        ctx.fill();
        ctx.closePath();
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('VO2', token.x, token.y);
      }
    });

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`Score: ${state.score}`, 20, 30);
    ctx.fillText(`Speed: ${state.speed.toFixed(1)}`, 20, 55);
  };

  const gameLoop = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    update();
    draw(ctx);

    if (gameState.current.isRunning) {
      animationFrameId.current = requestAnimationFrame(gameLoop);
    } else {
      animationFrameId.current = null;
    }
  };

  const togglePause = () => {
    const state = gameState.current;
    if (state.decisionTriggered) return; // Cannot pause during a decision node
    
    if (state.isRunning) {
      state.isRunning = false;
      setIsPaused(true);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    } else {
      state.isRunning = true;
      setIsPaused(false);
      animationFrameId.current = requestAnimationFrame(gameLoop);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p' || e.key === 'Escape') {
        togglePause();
        return;
      }

      const state = gameState.current;
      if (!state.isRunning) return;

      if (e.key === 'ArrowUp' && !state.runner.isJumping) {
        state.runner.dy = state.runner.jumpPower;
        state.runner.isJumping = true;
        state.runner.isSliding = false;
      } else if (e.key === 'ArrowDown' && !state.runner.isJumping) {
        state.runner.isSliding = true;
        state.runner.height = 25;
        state.runner.y = state.groundY - 25;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const state = gameState.current;
      if (e.key === 'ArrowDown') {
        state.runner.isSliding = false;
        state.runner.height = 50;
        if (!state.runner.isJumping) {
          state.runner.y = state.groundY - 50;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    animationFrameId.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full max-w-4xl mx-auto mt-10 flex flex-col items-center">
      <div className="mb-4 text-center">
        <h1 className="text-3xl font-bold text-slate-800">CPET DASH: The SingHealth Ascent</h1>
        <p className="text-slate-600 mt-2">Use Up Arrow to Jump, Down Arrow to Slide. Press 'P' to Pause. Collect VO2 tokens.</p>
      </div>
      
      <div className="w-full flex justify-end mb-2">
        <button 
          onClick={togglePause}
          disabled={showDecision}
          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-md transition-colors disabled:opacity-50"
        >
          {isPaused ? 'Resume Game' : 'Pause Game'}
        </button>
      </div>

      <div className="relative border-4 border-slate-800 rounded-lg overflow-hidden bg-slate-100 shadow-xl">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={400} 
          className="block"
        />

        {isPaused && !showDecision && (
          <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
            <h2 className="text-4xl font-bold text-white mb-4 tracking-widest">PAUSED</h2>
            <p className="text-slate-200 mb-8">Press 'P' or click Resume to continue the protocol.</p>
            <button 
              onClick={togglePause}
              className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 transition-colors text-lg shadow-lg"
            >
              Resume Protocol
            </button>
          </div>
        )}

        {showDecision && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Clinical Query: Decision Node</h2>
            
            {!feedback ? (
              <>
                <p className="text-lg text-slate-800 mb-8 max-w-2xl font-medium">
                  If O2 Pulse flattens early but VE reserve is high, what system is limiting?
                </p>
                <div className="flex flex-col gap-4 w-full max-w-md">
                  <button 
                    onClick={() => handleAnswer(true)}
                    className="px-6 py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Cardiac System
                  </button>
                  <button 
                    onClick={() => handleAnswer(false)}
                    className="px-6 py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Pulmonary System
                  </button>
                  <button 
                    onClick={() => handleAnswer(false)}
                    className="px-6 py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Peripheral Muscle
                  </button>
                </div>
              </>
            ) : (
              <div className="max-w-2xl">
                <p className={`text-xl font-bold mb-4 ${feedback.startsWith('Correct') ? 'text-emerald-700' : 'text-red-700'}`}>
                  {feedback.startsWith('Correct') ? 'Clinical Assessment Accurate' : 'Clinical Assessment Inaccurate'}
                </p>
                <p className="text-lg text-slate-800">
                  {feedback}
                </p>
                <p className="text-sm text-slate-500 mt-8 animate-pulse">
                  Resuming protocol...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
