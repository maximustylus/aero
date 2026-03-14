export function ModeSelectionScreen({ onSelectRunning, onSelectCycling }: { onSelectRunning: () => void, onSelectCycling: () => void }) {
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
          <div onClick={onSelectRunning} className="group relative cursor-pointer">
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
          <div onClick={onSelectCycling} className="group relative cursor-pointer">
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
