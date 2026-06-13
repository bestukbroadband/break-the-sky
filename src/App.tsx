import React, { useState } from 'react';
import HomeScreen from './components/HomeScreen';
import AircraftSelect from './components/AircraftSelect';
import WeatherSelect from './components/WeatherSelect';
import HUD from './components/HUD';
import PauseMenu from './components/PauseMenu';
import LandingResult from './components/LandingResult';
import FlightHistory from './components/FlightHistory';
import FlightScene from './game/FlightScene';
import CinematicOverlay from './components/CinematicOverlay';
import { Aircraft, FlightTelemetry, GameMode, WeatherOption, FlightRecord } from './types';
import { Plane, Compass, CloudSnow, Sun, BookOpen } from 'lucide-react';

type ScreenType = 'home' | 'aircraft_select' | 'weather_select' | 'loading' | 'game';

export default function App() {
  const [screen, setScreen] = useState<ScreenType>('home');
  const [selectedMode, setSelectedMode] = useState<GameMode>('free_flight');
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
  const [selectedWeather, setSelectedWeather] = useState<WeatherOption | null>(null);
  const [showLogbook, setShowLogbook] = useState<boolean>(false);

  // Flight HUD States
  const [telemetry, setTelemetry] = useState<FlightTelemetry>({
    speed: 0,
    altitude: 1,
    pitch: 0,
    roll: 0,
    heading: 0,
    throttle: 0,
    verticalSpeed: 0,
    landingGear: true,
    brakes: false,
    stalled: false,
    score: 0,
    takeoffSuccess: false,
    lastMessage: 'All clear. Check coordinates before engine startup.',
  });

  // Appends new flight data dynamically to LocalStorage
  const handleLogFlight = (crashed: boolean, peakSpeed: number, peakAltitude: number, duration: number) => {
    if (!selectedAircraft || !selectedWeather) return;

    // Reject extremely transient runs (< 2 seconds) to prevent pollution
    if (duration < 2) return;

    let summaryText = '';
    if (crashed) {
      summaryText = telemetry.lastMessage || 'Structural limits exceeded during operational envelope.';
    } else {
      const vrate = telemetry.verticalSpeed;
      if (vrate > -180) {
        summaryText = `Pristine glass-smooth touchdown (${vrate} ft/min) on runway center lines. Outstanding flight deck control!`;
      } else if (vrate > -550) {
        summaryText = `Smooth, standard approach touchdown (${vrate} ft/min). Approved passenger flight profile.`;
      } else {
        summaryText = `Hard impact touchdown landing (${vrate} ft/min). Exceeded standard airliner guidelines.`;
      }
    }

    const newRecord: FlightRecord = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: Date.now(),
      aircraftId: selectedAircraft.id,
      aircraftName: selectedAircraft.name,
      mode: selectedMode,
      weatherName: selectedWeather.name,
      weatherId: selectedWeather.id,
      topSpeed: Math.max(peakSpeed, telemetry.speed),
      maxAltitude: Math.max(peakAltitude, telemetry.altitude),
      flightDuration: duration,
      status: crashed ? 'crashed' : 'landed',
      landingRate: telemetry.verticalSpeed,
      score: telemetry.score,
      summary: summaryText,
    };

    try {
      const storedStr = localStorage.getItem('skyline:flight_history') || localStorage.getItem('skyforge:flight_history');
      const existing: FlightRecord[] = storedStr ? JSON.parse(storedStr) : [];
      const updated = [newRecord, ...existing];
      localStorage.setItem('skyline:flight_history', JSON.stringify(updated.slice(0, 50)));
    } catch (e) {
      console.error('Failed to append to pilot logbook:', e);
    }
  };

  const [gamePaused, setGamePaused] = useState<boolean>(false);
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [isCrash, setIsCrash] = useState<boolean>(false);
  const [showMap, setShowMap] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<string>('chase');
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [isIntroActive, setIsIntroActive] = useState<boolean>(false);
  const [gameKey, setGameKey] = useState<number>(0);
  const [activeFailureManualTrigger, setActiveFailureManualTrigger] = useState<'bird_strike' | 'engine_flameout' | 'gear_jam' | null>(null);

  // Global listener for SPACE key to instantly hop into active flight
  React.useEffect(() => {
    if (!isIntroActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsIntroActive(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isIntroActive]);

  // Trigger loading transition simulator
  const startLoadingTransition = (weatherOpt: WeatherOption) => {
    setSelectedWeather(weatherOpt);
    setScreen('game');
    setIsIntroActive(true);
    setGamePaused(false);
    setGameEnded(false);
    setIsCrash(false);
    setIsReplaying(false);
    setActiveFailureManualTrigger(null);
    setGameKey((prev) => prev + 1);
  };

  const handleStartMission = (mode: GameMode) => {
    setSelectedMode(mode);
    setScreen('aircraft_select');
  };

  const handleSelectAircraft = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft);
    setScreen('weather_select');
  };

  const handleExitToMenu = () => {
    setScreen('home');
    setGamePaused(false);
    setGameEnded(false);
    setIsReplaying(false);
    setIsIntroActive(false);
  };

  return (
    <div id="app-root-container" className="w-full min-h-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
      
      {/* Dynamic Mobile Orientation Guard (iPhone Portrait Guidance) */}
      <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-slate-950/98 backdrop-blur-lg text-center p-6 sm:hidden pointer-events-auto transition-opacity duration-300 select-none orientation-portrait-only">
        <div className="w-20 h-20 rounded-full bg-sky-500/10 border border-sky-400/20 flex items-center justify-center mb-6 text-sky-400 animate-pulse">
          <svg className="w-10 h-10 transform -rotate-90 animate-[spin_4s_linear_infinite]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <h3 className="text-lg font-black tracking-widest text-slate-100 uppercase font-sans mb-2">
          ORIENTATION DETECTED
        </h3>
        <p className="text-slate-400 text-xs leading-relaxed max-w-xs font-mono">
          Rotate your iPhone sideways for the best flying experience.
        </p>
      </div>

      {/* 1. HOME SCREEN VIEW */}
      {screen === 'home' && (
        <HomeScreen 
          onStart={handleStartMission} 
          onOpenLogbook={() => setShowLogbook(true)}
        />
      )}

      {/* 2. FLEET SELECTION VIEW */}
      {screen === 'aircraft_select' && (
        <AircraftSelect 
          onBack={() => setScreen('home')} 
          onSelect={handleSelectAircraft} 
        />
      )}

      {/* 3. WEATHER / ENVIRONMENT STATION VIEW */}
      {screen === 'weather_select' && selectedAircraft && (
        <WeatherSelect 
          onBack={() => setScreen('aircraft_select')} 
          onSelect={startLoadingTransition} 
        />
      )}

      {/* 4. LIVE SIMULATION GAME OVERLAY */}
      {screen === 'game' && selectedAircraft && selectedWeather && (
        <div id="simulation-viewport" className="relative w-full h-screen overflow-hidden">
          
          {/* Active 3D Scene */}
           <FlightScene
            key={gameKey}
            aircraft={selectedAircraft}
            weather={selectedWeather}
            mode={selectedMode}
            onTelemetryUpdate={(tel) => {
               setTelemetry(tel);
               setCameraMode(tel.landingGear ? 'chase' : cameraMode); // update default
            }}
            gamePaused={gamePaused}
            setGamePaused={setGamePaused}
            onGameEnded={(crashed, peakSpeed, peakAltitude, duration) => {
               setIsCrash(crashed);
               setGameEnded(true);
               handleLogFlight(crashed, peakSpeed, peakAltitude, duration);
            }}
            showMap={showMap}
            isReplaying={isReplaying}
            setIsReplaying={setIsReplaying}
            isIntroActive={isIntroActive}
            setIsIntroActive={setIsIntroActive}
            activeFailureManualTrigger={activeFailureManualTrigger}
            onClearManualTrigger={() => setActiveFailureManualTrigger(null)}
          />

          {/* Panoramic Intro Loading Scan Overlay */}
          {isIntroActive && (
            <CinematicOverlay
              aircraft={selectedAircraft}
              weather={selectedWeather}
              mode={selectedMode}
              onSkip={() => setIsIntroActive(false)}
            />
          )}

          {/* Interactive HUD Layer - hidden during cinematic pre-flight flyover */}
          {!isIntroActive && (
            <HUD
              telemetry={telemetry}
              aircraft={selectedAircraft}
              mode={selectedMode}
              weather={selectedWeather}
              cameraMode={cameraMode}
              gamePaused={gamePaused}
              onPauseToggle={() => setGamePaused(!gamePaused)}
              showMap={showMap}
              onMapToggle={() => setShowMap(!showMap)}
              isReplaying={isReplaying}
              onReplayToggle={() => setIsReplaying(!isReplaying)}
              onTriggerFailure={(type) => setActiveFailureManualTrigger(type)}
              onWeatherChange={(w) => setSelectedWeather(w)}
            />
          )}

          {/* PAUSED STATE OVERLAY */}
          {gamePaused && !gameEnded && !isReplaying && (
            <PauseMenu
              onContinue={() => setGamePaused(false)}
              onRestart={() => {
                setIsIntroActive(true);
                setGamePaused(false);
                setGameEnded(false);
                setIsCrash(false);
                setIsReplaying(false);
                setActiveFailureManualTrigger(null);
                setGameKey((prev) => prev + 1);
              }}
              onChangeAircraftOrWeather={() => setScreen('aircraft_select')}
              onExitToMenu={handleExitToMenu}
              aircraft={selectedAircraft}
              weather={selectedWeather}
              onWatchReplay={() => {
                setIsReplaying(true);
                setGamePaused(false);
              }}
            />
          )}

          {/* GAME CONCLUDED ANALYSIS OVERLAY */}
          {gameEnded && !isReplaying && (
            <LandingResult
              telemetry={telemetry}
              aircraft={selectedAircraft}
              isCrash={isCrash}
              onRestart={() => {
                setIsIntroActive(true);
                setGamePaused(false);
                setGameEnded(false);
                setIsCrash(false);
                setIsReplaying(false);
                setActiveFailureManualTrigger(null);
                setGameKey((prev) => prev + 1);
              }}
              onExit={handleExitToMenu}
              onViewLogbook={() => setShowLogbook(true)}
              onWatchReplay={() => {
                setIsReplaying(true);
                setGamePaused(false);
                setGameEnded(false);
              }}
            />
          )}

        </div>
      )}

      {/* PILOT LOGBOOK DETAILED MODAL OVERLAY */}
      {showLogbook && (
        <div id="logbook-portal" className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <FlightHistory onClose={() => setShowLogbook(false)} />
        </div>
      )}

    </div>
  );
}
