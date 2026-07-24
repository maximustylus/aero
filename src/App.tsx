/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LandingScreen, PersonaScreen, ModeSelectionScreen, CalibrationScreen, SummaryScreen } from './Screen';
import CPETGame3D from './component/CPETGame3D';
import { MaxFun } from './component/MaxFun';

export type ScreenState = 'landing' | 'maxfun' | 'persona' | 'mode' | 'calibration' | 'game' | 'summary';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('landing');

  return (
    <div className="min-h-screen bg-background-dark text-white font-display">
      {currentScreen === 'landing' && (
        <LandingScreen
          onPlayMaxFun={() => setCurrentScreen('maxfun')}
          onNext={() => setCurrentScreen('persona')}
        />
      )}
      {currentScreen === 'maxfun' && (
        <div className="min-h-screen flex flex-col px-4 py-6 md:px-10">
          <div className="w-full max-w-5xl mx-auto flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentScreen('landing')}
              className="flex items-center gap-2 text-gray-300 hover:text-white text-sm font-bold uppercase tracking-wider transition-colors"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
              AERO Home
            </button>
            <span className="text-xs uppercase tracking-widest text-blue-300/60">MaxFun · CPET Education</span>
          </div>
          <div className="w-full max-w-5xl mx-auto flex-1">
            <MaxFun />
          </div>
        </div>
      )}
      {currentScreen === 'persona' && <PersonaScreen onNext={() => setCurrentScreen('mode')} />}
      {currentScreen === 'mode' && <ModeSelectionScreen onNext={() => setCurrentScreen('calibration')} />}
      {currentScreen === 'calibration' && <CalibrationScreen onNext={() => setCurrentScreen('game')} />}
      {currentScreen === 'game' && <CPETGame3D onEnd={() => setCurrentScreen('summary')} />}
      {currentScreen === 'summary' && <SummaryScreen onRestart={() => setCurrentScreen('landing')} />}
    </div>
  );
}
