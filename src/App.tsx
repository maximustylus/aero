/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LandingScreen, PersonaScreen, ModeSelectionScreen, CalibrationScreen, SummaryScreen } from './Screen';
import CPETGame3D from './component/CPETGame3D';

export type ScreenState = 'landing' | 'persona' | 'mode' | 'calibration' | 'game' | 'summary';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('landing');

  return (
    <div className="min-h-screen bg-background-dark text-white font-display">
      {currentScreen === 'landing' && <LandingScreen onNext={() => setCurrentScreen('persona')} />}
      {currentScreen === 'persona' && <PersonaScreen onNext={() => setCurrentScreen('mode')} />}
      {currentScreen === 'mode' && <ModeSelectionScreen onNext={() => setCurrentScreen('calibration')} />}
      {currentScreen === 'calibration' && <CalibrationScreen onNext={() => setCurrentScreen('game')} />}
      {currentScreen === 'game' && <CPETGame3D onEnd={() => setCurrentScreen('summary')} />}
      {currentScreen === 'summary' && <SummaryScreen onRestart={() => setCurrentScreen('landing')} />}
    </div>
  );
}
