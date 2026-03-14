import React, { useState } from 'react';

export function LandingScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="relative min-h-screen flex flex-col w-full overflow-hidden bg-background-dark text-white font-display">
      <div className="absolute inset-0 w-full h-full z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#101622]/80 via-[#101622]/60 to-[#101622] z-10"></div>
        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA63Lj1kMMdFKZD6xxbQ3X-oQ8BVCjNj5a4VZ9OBWdQE5ZTVDLMnuNc4hMpEJQCboI3FDiEWSZbSBqGx33xbnM3V0MrPbxHg1YqAj1r8qmrqa96f8ySycJNjuiFsOIUIXDmDwWuZoOFHPKUAHtjqEhdsvh1dl2go9XFanJyxx8iQWKtIzB8OKxVfTcF7E0dPThknOAqCV2JNbB0g209x9EBs1zYLexZs30ogSFHuby7FfYXFWuWKrLqHDnmrKgKHJ-Hl7Or205QjZo')" }}></div>
      </div>
      <header className="relative z-20 w-full px-6 py-4 md:px-10 flex items-center justify-between border-b border-white/5 glass-panel">
        <div className="flex items-center gap-3 text-white">
          <div className="p-2 bg-primary rounded-full shadow-[0_0_15px_rgba(13,89,242,0.5)]">
            <span className="material-symbols-outlined text-white text-xl">monitor_heart</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight uppercase">CPET Runner</h2>
        </div>
        <div className="flex items-center gap-4">
          <button className="hidden md:flex text-gray-300 hover:text-white font-medium text-sm uppercase tracking-wider transition-colors">System Check</button>
          <button className="flex items-center justify-center rounded-full h-10 px-6 bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm font-bold tracking-wide transition-all backdrop-blur-sm">LOGIN</button>
        </div>
      </header>
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-4 py-12 md:py-20 text-center w-full max-w-7xl mx-auto">
        <div className="flex flex-col items-center gap-6 md:gap-8 max-w-4xl animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary-glow text-xs font-bold uppercase tracking-[0.1em] mb-2 shadow-[0_0_10px_rgba(13,89,242,0.2)]">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Simulation v2.0 Ready
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-blue-100 to-blue-400 drop-shadow-2xl">
            CPX SIM
          </h1>
          <h2 className="text-lg md:text-2xl text-blue-200/80 font-normal max-w-2xl leading-relaxed">
            The Integration Journey. <br className="hidden md:block"/>Master the physiology of performance in a high-stakes simulation.
          </h2>
          <div className="mt-8 flex flex-col items-center w-full">
            <button onClick={onNext} className="group relative flex items-center justify-center w-full max-w-[320px] h-16 rounded-full bg-primary hover:bg-blue-600 text-white transition-all shadow-[0_0_40px_rgba(13,89,242,0.4)] hover:shadow-[0_0_60px_rgba(13,89,242,0.6)] hover:scale-105">
              <span className="absolute inset-0 rounded-full border border-white/20"></span>
              <span className="text-lg font-bold tracking-widest uppercase mr-2">Start Simulation</span>
              <span className="material-symbols-outlined text-2xl group-hover:translate-x-1 transition-transform">play_arrow</span>
            </button>
            <p className="mt-4 text-xs text-blue-300/50 uppercase tracking-widest">Press to initialize</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export function PersonaScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="relative flex flex-grow flex-col min-h-screen bg-background-dark text-white font-display">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] opacity-50"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] opacity-30"></div>
      </div>
      <div className="relative z-10 flex h-full grow flex-col items-center justify-center p-8">
        <div className="w-full max-w-[1080px] flex flex-col gap-8">
          <div className="flex flex-col items-center text-center gap-4 mb-4">
            <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">Select Your Character</h1>
            <p className="text-[#9ca6ba] text-lg max-w-2xl">Choose your path to begin the CPET experience. This choice customizes the language and complexity.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <button onClick={onNext} className="persona-card group relative flex flex-col gap-6 p-6 md:p-8 rounded-xl border-2 border-[#282e39] bg-[#1a202c] text-left transition-all duration-300 hover:border-primary hover:shadow-[0_0_20px_rgba(13,89,242,0.4)] hover:-translate-y-1">
              <div className="w-full aspect-video md:aspect-[4/3] rounded-lg bg-cover bg-center overflow-hidden relative shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>
                <div className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC9ANcTQmlF9ehxY6dENH0T2RxqMzVE_Md4ki5HtHYWZfPhfqPKNgraI4ctM-xTlasTonS1IIc51R7OYRQUpgmX9P2G3D3EtZtsGAHoan0RFxyT2bdHIW96TcfV_J6s2XnokQSO0FkGA0poIdnnx2LhlYqKDoiXk2CuChy7CvB1W0ruZi8VRQuQl4VJ4QlKZCpic12Ox-u4gsrSnuedwbaKcL6DEEUzfegYM5q78QlKjOTyxcDEBat8ntZ-NC5x4ZHdTr6u6QqlXbw')" }}></div>
                <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
                  <div className="bg-primary p-2 rounded-full text-white flex items-center justify-center">
                    <span className="material-symbols-outlined">school</span>
                  </div>
                  <span className="text-white font-bold text-lg tracking-wide">Learner Mode</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-bold text-white group-hover:text-primary transition-colors">Medical Learner</h3>
                <p className="text-[#9ca6ba] text-base leading-relaxed">Explore CPET protocols with full clinical terminology, physiological data breakdowns, and interpretation challenges.</p>
              </div>
            </button>
            <button onClick={onNext} className="persona-card group relative flex flex-col gap-6 p-6 md:p-8 rounded-xl border-2 border-[#282e39] bg-[#1a202c] text-left transition-all duration-300 hover:border-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:-translate-y-1">
              <div className="w-full aspect-video md:aspect-[4/3] rounded-lg bg-cover bg-center overflow-hidden relative shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>
                <div className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAacSpJvH2Vusg2mcHyXG69KYQOIKfiP_5Cer6AgBu3jvhYclntBzvIMGm1-V6Z0UpTFqpXHPGUcI0kOLzuCceW3qU5w2wErQKvtmc4BDbzXkwPBE_jxzvvNo6sS0spzLCbxWKOxt-DgQ2Oo4AaGe82Ou7oJjIGKsJ58dP0l_D4waXy6bUFlZe3BVRJeHmxmgEANULW-Z45EMgb5xTKRa6c4l65F3G6Z8n3IEEUv5LlWSKIYOh0zYbQXOyN_lrngnb4nCeIIlk8Ek8')" }}></div>
                <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
                  <div className="bg-emerald-500 p-2 rounded-full text-white flex items-center justify-center">
                    <span className="material-symbols-outlined">health_and_safety</span>
                  </div>
                  <span className="text-white font-bold text-lg tracking-wide">Patient Mode</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">Patient Guide</h3>
                <p className="text-[#9ca6ba] text-base leading-relaxed">Learn what to expect during your test in simple, easy-to-understand language. Focuses on comfort and procedure.</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModeSelectionScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="relative min-h-screen flex flex-col w-full overflow-hidden bg-surface-dark text-white font-display">
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/90 via-[#0f172a]/80 to-[#0f172a] z-10 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-hex-pattern z-10 opacity-30"></div>
      </div>
      <main className="relative z-30 flex-grow flex flex-col items-center justify-center px-4 py-8 w-full max-w-7xl mx-auto">
        <div className="mb-10 text-center relative">
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white drop-shadow-2xl mb-2">
            Select <span className="text-transparent bg-clip-text bg-gradient-to-r from-game-accent to-game-secondary game-text-shadow">Simulation</span>
          </h1>
          <p className="text-indigo-200/80 font-bold tracking-[0.2em] uppercase text-sm md:text-base">Choose your CPET integration path</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 w-full max-w-5xl px-2">
          <div onClick={onNext} className="group relative cursor-pointer">
            <div className="absolute -inset-1 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative h-full bg-slate-900/90 backdrop-blur-xl border border-white/10 group-hover:border-cyan-400/50 rounded-2xl p-8 lg:p-12 flex flex-col items-center justify-center gap-8 overflow-hidden transition-all duration-300 transform group-hover:-translate-y-2">
              <div className="relative z-10 w-32 h-32 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-400/20 group-hover:border-cyan-400/60 group-hover:scale-105 transition-all duration-300">
                <span className="material-symbols-outlined text-6xl text-cyan-400 group-hover:text-white transition-colors">directions_run</span>
              </div>
              <div className="z-10 text-center space-y-1">
                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white group-hover:text-cyan-400 transition-colors">Running</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest border-t border-white/10 pt-2 mt-2">Treadmill Protocol</p>
              </div>
              <button className="w-full py-4 bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 rounded skew-box transition-all border border-white/10">
                <span className="block skew-box-content font-black uppercase tracking-widest text-sm text-white">Initialize</span>
              </button>
            </div>
          </div>
          <div onClick={onNext} className="group relative cursor-pointer">
            <div className="absolute -inset-1 bg-gradient-to-b from-pink-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative h-full bg-slate-900/90 backdrop-blur-xl border border-white/10 group-hover:border-pink-400/50 rounded-2xl p-8 lg:p-12 flex flex-col items-center justify-center gap-8 overflow-hidden transition-all duration-300 transform group-hover:-translate-y-2">
              <div className="relative z-10 w-32 h-32 flex items-center justify-center rounded-full bg-gradient-to-br from-pink-500/10 to-purple-600/10 border border-pink-400/20 group-hover:border-pink-400/60 group-hover:scale-105 transition-all duration-300">
                <span className="material-symbols-outlined text-6xl text-pink-400 group-hover:text-white transition-colors">pedal_bike</span>
              </div>
              <div className="z-10 text-center space-y-1">
                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white group-hover:text-pink-400 transition-colors">Cycling</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest border-t border-white/10 pt-2 mt-2">Bike Ergometer</p>
              </div>
              <button className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded skew-box transition-all border border-white/10">
                <span className="block skew-box-content font-black uppercase tracking-widest text-sm text-white">Initialize</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function CalibrationScreen({ onNext }: { onNext: () => void }) {
  const [checks, setChecks] = useState([false, false, false]);
  const allChecked = checks.every(c => c);

  const toggleCheck = (index: number) => {
    const newChecks = [...checks];
    newChecks[index] = !newChecks[index];
    setChecks(newChecks);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background-dark font-display text-white">
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 flex flex-col gap-6">
            <h1 className="text-5xl lg:text-6xl font-black leading-[0.9] tracking-tighter uppercase">
              Calibration <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Sequence</span>
            </h1>
            <p className="text-[#9ca6ba] text-lg font-medium leading-relaxed mt-2">
              Verify safety parameters before engaging the CPET protocol. Accuracy is critical.
            </p>
            <div className="rounded-2xl bg-[#1a202c] border border-[#282e39] p-6">
              <div className="flex justify-between items-end mb-4">
                <p className="text-white text-base font-bold uppercase tracking-wide">System Readiness</p>
                <p className="text-primary text-2xl font-black font-mono">{checks.filter(c=>c).length}/3</p>
              </div>
              <div className="relative h-3 w-full rounded-full bg-[#3b4354] overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-primary transition-all duration-500" style={{ width: `${(checks.filter(c=>c).length / 3) * 100}%` }}></div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-7 flex flex-col justify-between h-full gap-6">
            <div className="flex flex-col gap-4">
              {[
                { title: 'Environment Check', desc: 'Ensure 2 meters of clear space.', icon: 'open_in_full' },
                { title: 'Equipment Stability', desc: 'Verify treadmill is stable.', icon: 'directions_run' },
                { title: 'Vitals Monitoring', desc: 'Confirm HR monitor is transmitting.', icon: 'monitor_heart' }
              ].map((item, i) => (
                <label key={i} className="group relative flex items-center justify-between gap-4 rounded-2xl border border-[#282e39] bg-[#1a202c] p-5 transition-all hover:border-primary/50 cursor-pointer">
                  <div className="flex items-center gap-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#282e39] text-white group-hover:bg-primary transition-colors">
                      <span className="material-symbols-outlined text-3xl">{item.icon}</span>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-white text-lg font-bold">{item.title}</p>
                      <p className="text-[#9ca6ba] text-sm">{item.desc}</p>
                    </div>
                  </div>
                  <div className="relative flex h-[32px] w-[56px] items-center rounded-full bg-[#282e39] p-1 transition-colors" style={{ backgroundColor: checks[i] ? '#0d59f2' : '' }}>
                    <input type="checkbox" className="sr-only" checked={checks[i]} onChange={() => toggleCheck(i)} />
                    <div className={`h-6 w-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${checks[i] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-4 pt-6 border-t border-[#282e39]">
              <button 
                onClick={onNext}
                disabled={!allChecked}
                className={`relative w-full h-16 flex items-center justify-center gap-3 rounded-full text-lg font-black uppercase tracking-widest transition-all ${allChecked ? 'bg-primary text-white shadow-[0_0_20px_rgba(13,89,242,0.4)] hover:scale-[1.02]' : 'bg-[#282e39] text-gray-500 cursor-not-allowed'}`}
              >
                <span>{allChecked ? 'Initiate Simulation' : 'Awaiting Confirmation'}</span>
                <span className="material-symbols-outlined">{allChecked ? 'arrow_forward' : 'lock'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function SummaryScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="bg-background-dark font-display text-white min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full glass-panel border-b border-[#282e39] px-6 py-4">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <span className="material-symbols-outlined text-3xl text-primary">monitor_heart</span>
          <h2 className="text-xl font-bold">CPET RUNNER</h2>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8 relative">
        <div className="flex flex-col items-center justify-center text-center gap-4 py-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-success/30 bg-accent-success/10 px-4 py-1.5">
            <span className="material-symbols-outlined text-accent-success text-sm">check_circle</span>
            <span className="text-accent-success text-xs font-bold tracking-wider uppercase">Session Complete</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white drop-shadow-2xl">
            MISSION <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">ACCOMPLISHED</span>
          </h1>
        </div>
        <div className="w-full bg-gradient-to-r from-surface-highlight to-surface-dark border border-white/10 rounded-2xl p-1 shadow-2xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-[#111318] rounded-[14px] p-8 md:p-12">
            <div className="flex flex-col gap-2 text-center md:text-left">
              <div className="text-sm font-bold text-primary tracking-widest uppercase mb-1">Primary Objective</div>
              <div className="text-6xl md:text-8xl font-black text-white leading-none tracking-tighter tabular-nums text-glow">45.2</div>
              <div className="text-2xl font-bold text-[#9ca6ba]">ml/kg/min</div>
            </div>
            <div className="flex flex-col gap-6 w-full md:w-64">
              <div className="flex justify-between text-sm font-medium text-[#9ca6ba]">
                <span>Predicted VO₂ Max</span>
                <span className="text-white">48.0</span>
              </div>
              <div className="w-full h-3 bg-surface-highlight rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-cyan-400 w-[94%] rounded-full"></div>
              </div>
              <div className="text-right text-xs text-primary font-bold">94% ACHIEVED</div>
            </div>
          </div>
        </div>
        <div className="flex justify-center mt-8">
          <button onClick={onRestart} className="flex items-center justify-center h-14 px-10 rounded-full bg-primary hover:bg-blue-600 text-white font-bold shadow-lg shadow-primary/30 transition-all gap-2 text-lg">
            <span className="material-symbols-outlined">replay</span>
            <span>Play Again</span>
          </button>
        </div>
      </main>
    </div>
  );
}
