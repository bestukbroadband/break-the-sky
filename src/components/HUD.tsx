import React from 'react';
import { Plane, Compass, AlertTriangle, Disc, ArrowDownLeft, Eye, RefreshCw, Key, Landmark, HelpCircle, Map, Video, CloudSun } from 'lucide-react';
import { FlightTelemetry, Aircraft, GameMode, WeatherOption } from '../types';
import { WEATHER_OPTIONS } from '../data/weatherData';

interface HUDProps {
  telemetry: FlightTelemetry;
  aircraft: Aircraft;
  mode: GameMode;
  weather: WeatherOption;
  cameraMode: string;
  gamePaused: boolean;
  onPauseToggle: () => void;
  showMap: boolean;
  onMapToggle: () => void;
  isReplaying?: boolean;
  onReplayToggle?: () => void;
  onTriggerFailure?: (type: 'bird_strike' | 'engine_flameout' | 'gear_jam' | null) => void;
  onWeatherChange?: (weather: WeatherOption) => void;
}

export default function HUD({
  telemetry,
  aircraft,
  mode,
  weather,
  cameraMode,
  gamePaused,
  onPauseToggle,
  showMap,
  onMapToggle,
  isReplaying = false,
  onReplayToggle,
  onTriggerFailure,
  onWeatherChange,
}: HUDProps) {
  // Speed and altitude dial values
  const relativePower = telemetry.throttle;
  const [showDrillPanel, setShowDrillPanel] = React.useState(false);
  const [showWeatherDropdown, setShowWeatherDropdown] = React.useState(false);

  // Heading text conversion (e.g., 0/360 -> N, 90 -> E, 180 -> S, 270 -> W)
  const getHeadingDirection = (hd: number) => {
    if (hd >= 337.5 || hd < 22.5) return 'N';
    if (hd >= 22.5 && hd < 67.5) return 'NE';
    if (hd >= 67.5 && hd < 112.5) return 'E';
    if (hd >= 112.5 && hd < 157.5) return 'SE';
    if (hd >= 157.5 && hd < 202.5) return 'S';
    if (hd >= 202.5 && hd < 247.5) return 'SW';
    if (hd >= 247.5 && hd < 292.5) return 'W';
    return 'NW';
  };

  // Safe landing flags
  const isSpeedSafe = telemetry.speed <= aircraft.takeoffSpeed * 1.55;
  const isDescentSafe = telemetry.verticalSpeed >= -850;
  const isPitchLevel = Math.abs(telemetry.pitch) < 15;

  // Emergency Checklist Live Verification
  const isFlameout = telemetry.failureType === 'engine_flameout';
  const isBirdStrike = telemetry.failureType === 'bird_strike';
  const isGearJam = telemetry.failureType === 'gear_jam';

  // Flameout tasks
  const flameoutPitchDown = telemetry.pitch < -2;
  const flameoutGearRetired = !telemetry.landingGear;
  const flameoutDescentSafe = telemetry.verticalSpeed < 0 && telemetry.verticalSpeed > -1200;

  // Bird strike tasks
  const birdThrotOk = telemetry.throttle <= 25;
  const birdRollOk = telemetry.roll > 2 && telemetry.roll < 20; // counter-acting roll-left drift
  const birdSpeedOk = telemetry.speed >= aircraft.takeoffSpeed;

  // Gear jam tasks
  const gearJamWingsFlat = Math.abs(telemetry.roll) < 4;
  const gearJamDescentOk = telemetry.verticalSpeed >= -250 && telemetry.verticalSpeed < 0;
  
  // Highlight alarm statuses when below 400ft in the air
  const isApproachingTouchdown = telemetry.altitude < 400 && telemetry.altitude > 10;
  const showLandingHelp = isApproachingTouchdown && !telemetry.brakes;

  // Camera readable names
  const cameraLabel = () => {
    switch (cameraMode) {
      case 'chase': return '✈️ CHASE CAMERA';
      case 'cockpit': return '🎛️ COCKPIT INTERNAL';
      case 'wing': return '🪶 WING ASPECT';
      case 'cinematic': return '🎬 FLY-BY CINEMATIC';
      case 'topDown': return '🗺️ TOP DOWN WATCH';
      default: return 'CAMERA';
    }
  };

  return (
    <div id="flight-hud-overlay" className="absolute inset-0 pointer-events-none select-none font-mono flex flex-col justify-between p-4 sm:p-5 z-20">
      
      {/* 1. HUD TOP STATUS BAR */}
      <div className="w-full flex items-start justify-between">
        
        {/* Left Stats Block: Aircraft Specs & Score */}
        <div className="pointer-events-auto bg-slate-950/65 backdrop-blur-md border border-slate-800/90 p-3 sm:p-4 rounded-xl flex items-center gap-3 shadow-xl">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-extrabold text-white font-sans tracking-wide">
                {aircraft.name}
              </h2>
              <span className="text-[8px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                {aircraft.category}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
              <span className="uppercase">{mode.replace('_', ' ')}</span>
              <span>•</span>
              <span className="text-yellow-400 font-bold">SCORE: {telemetry.score} PTS</span>
            </div>
          </div>
        </div>

        {/* Center: Mission Guidance Messages & Alerts */}
        <div className="flex-grow max-w-md mx-4 text-center">
          <div className="bg-slate-950/65 backdrop-blur-md border border-slate-800/90 px-4 py-2.5 rounded-xl shadow-xl flex items-center justify-center gap-2 text-xs text-sky-300">
            <span className="animate-pulse">📻</span>
            <span className="font-semibold text-slate-200 leading-tight">
              {telemetry.lastMessage}
            </span>
          </div>

          {/* CRITICAL STATE ALERTS */}
          <div className="mt-2 space-y-1.5">
            {telemetry.stalled && (
              <div className="bg-red-950/95 border-2 border-red-500 text-red-400 px-4 py-2 rounded-lg font-black text-xs uppercase animate-pulse flex items-center justify-center gap-2 shadow-2xl">
                <AlertTriangle className="w-4 h-4 text-red-400 bg-red-400/10 p-0.5 rounded" />
                <span>⚠️ CRITICAL STALL WARNING! SPEED TOO LOW - PITCH DOWN NOSE NOW!</span>
              </div>
            )}
            
            {showLandingHelp && (
              <div className="bg-blue-950/90 border border-blue-500/80 text-blue-300 px-4 py-1.5 rounded-lg text-xs leading-normal">
                <span className="font-bold">🛫 touchdown APPROACH:</span>{' '}
                <span className={isSpeedSafe ? 'text-emerald-400' : 'text-red-400'}>
                  Speed: {telemetry.speed} kts ({isSpeedSafe ? 'OK' : 'TOO FAST'})
                </span>
                {' | '}
                <span className={isDescentSafe ? 'text-emerald-400' : 'text-red-400'}>
                  VSpeed: {telemetry.verticalSpeed} ft/m ({isDescentSafe ? 'OK' : 'TOO HARD'})
                </span>
                {' | '}
                <span className={telemetry.landingGear ? 'text-emerald-400' : 'text-red-400 font-bold animate-pulse'}>
                  Gear: {telemetry.landingGear ? 'DOWN (Extended)' : 'GEAR RETRACTED! (Press G)'}
                </span>
              </div>
            )}

            {telemetry.failureType && (
              <div className="bg-red-950/95 border-2 border-red-500 text-red-100 px-4 py-2 rounded-lg font-black text-xs uppercase animate-pulse flex flex-col items-center justify-center gap-1 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 animate-[bounce_1.5s_infinite]" />
                  <span className="tracking-wider">🚨 MASTER WARNING COCKPIT ALARM 🚨</span>
                </div>
                <p className="font-mono text-[9px] text-red-300 normal-case tracking-tight font-medium bg-black/40 px-2 py-0.5 rounded border border-red-800">
                  Anomaly: {telemetry.failureType.toUpperCase().replace('_', ' ')} Active • Safety checklists primed below
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Menu Toggles */}
        <div className="pointer-events-auto flex items-center gap-2 p-1 bg-slate-950/70 backdrop-blur-md border border-slate-800/90 rounded-lg shadow-xl shadow-black/80">
          
          {/* Replay well */}
          <div className="cabin-well !p-0.5 !rounded-lg w-auto">
            <button
              id="replay-toggle-hud"
              onClick={onReplayToggle}
              className={`cabin-btn-base px-3 py-2 text-[10px] flex items-center justify-center gap-1.5 cursor-pointer ${
                isReplaying 
                  ? 'cabin-btn-alert' 
                  : 'cabin-btn-metallic'
              }`}
              title="Watch last 30 seconds replay of flight maneuvers"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isReplaying ? 'STABILIZED REPLAY' : 'REPLAY [V]'}</span>
              <span className={`w-2 h-2 rounded-full ${isReplaying ? 'cabin-led-amber animate-pulse' : 'bg-slate-705 border border-black/50'}`} />
            </button>
          </div>

          {/* Map well */}
          <div className="cabin-well !p-0.5 !rounded-lg w-auto">
            <button
              id="map-toggle-hud"
              onClick={onMapToggle}
              className={`cabin-btn-base px-3 py-2 text-[10px] flex items-center justify-center gap-1.5 cursor-pointer ${
                showMap 
                  ? 'cabin-btn-cyan' 
                  : 'cabin-btn-metallic'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">RADAR MAP [M]</span>
              <span className={`w-2 h-2 rounded-full ${showMap ? 'cabin-led-green' : 'bg-slate-705 border border-black/50'}`} />
            </button>
          </div>

          {/* Emergency toggles well */}
          <div className="cabin-well !p-0.5 !rounded-lg w-auto">
            <button
              id="emergency-toggles-control"
              onClick={() => setShowDrillPanel(!showDrillPanel)}
              className={`cabin-btn-base px-3 py-2 text-[10px] flex items-center justify-center gap-1.5 cursor-pointer ${
                showDrillPanel 
                  ? 'cabin-btn-warning' 
                  : 'cabin-btn-metallic'
              }`}
              title="Cockpit Emergency Drill Scenario Selector"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
              <span className="hidden md:inline">MALFUNCTIONS</span>
              <span className={`w-2 h-2 rounded-full ${showDrillPanel ? 'cabin-led-red animate-pulse' : 'bg-slate-705 border border-black/50'}`} />
            </button>
          </div>

          {/* Weather select well - Part 5 */}
          <div className="cabin-well !p-0.5 !rounded-lg w-auto relative">
            <button
              id="weather-change-hud"
              onClick={() => setShowWeatherDropdown(!showWeatherDropdown)}
              className={`cabin-btn-base px-3 py-2 text-[10px] flex items-center justify-center gap-1.5 cursor-pointer ${
                showWeatherDropdown 
                  ? 'cabin-btn-cyan' 
                  : 'cabin-btn-metallic'
              }`}
              title="Change weather and atmospheric conditions instantly"
            >
              <CloudSun className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WEATHER</span>
              <span className={`w-2 h-2 rounded-full ${showWeatherDropdown ? 'cabin-led-green' : 'bg-slate-705 border border-black/50'}`} />
            </button>
            
            {showWeatherDropdown && (
              <div className="absolute right-0 top-12 bg-slate-950/95 backdrop-blur-md border border-slate-800 p-2 rounded-xl shadow-2xl flex flex-col gap-1 w-44 z-50 pointer-events-auto">
                <div className="text-[9px] text-slate-500 font-bold border-b border-slate-900/60 pb-1 mb-1 font-sans text-left px-2">
                  METEOROLOGY COCKPIT INDEX
                </div>
                {WEATHER_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (onWeatherChange) onWeatherChange(opt);
                      setShowWeatherDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-1 text-[11px] rounded flex items-center justify-between transition-colors font-mono hover:bg-slate-800 cursor-pointer ${
                      weather.id === opt.id ? 'text-sky-400 bg-sky-950/45 font-bold' : 'text-slate-300'
                    }`}
                  >
                    <span>{opt.name}</span>
                    {weather.id === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Pause toggle well */}
          <div className="cabin-well !p-0.5 !rounded-lg w-auto">
            <button
              id="pause-toggle-hud"
              onClick={onPauseToggle}
              className="cabin-btn-base cabin-btn-metallic px-4 py-2 text-[10px] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{gamePaused ? 'CONTINUE [P]' : 'PAUSE [P]'}</span>
              <span className={`w-2 h-2 rounded-full ${gamePaused ? 'bg-slate-705 border border-black/50' : 'cabin-led-green'}`} />
            </button>
          </div>

        </div>

      </div>

      {/* 2. HUD MIDDLE: FLIGHT INSTRUMENTS & SPEED/ALTITUDE TAPES */}
      <div className="w-full flex-1 flex items-center justify-between my-auto px-2 sm:px-10">
        
        {/* Left Side Tape: Airspeed Indication */}
        <div className="flex flex-col items-center bg-slate-950/70 backdrop-blur-md border border-slate-800/90 p-3 rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.85)] border-l-sky-500/55">
          <span className="text-[9px] text-sky-400 font-extrabold tracking-widest font-mono">AIRSPEED</span>
          
          {/* Animated speed bars representing tape */}
          <div className="h-32 w-12 flex flex-col justify-between items-center text-xs font-mono py-1 relative border-l-2 border-slate-800 mt-2">
            <span className="text-slate-600 font-mono">{telemetry.speed + 30}</span>
            <span className="text-slate-500 font-mono">{telemetry.speed + 15}</span>
            <span className="text-sky-300 font-stencil text-base leading-none tracking-wider px-2 py-1 bg-sky-950/70 border-2 border-sky-450 rounded shadow-[0_0_8px_rgba(56,189,248,0.35)] animate-pulse">
              {telemetry.speed}
            </span>
            <span className="text-slate-500 font-mono">{Math.max(0, telemetry.speed - 15)}</span>
            <span className="text-slate-600 font-mono">{Math.max(0, telemetry.speed - 30)}</span>
          </div>

          <span className="text-sky-400 font-stencil text-base mt-2 tracking-widest">{telemetry.speed} <span className="text-[10px] text-slate-400 font-sans tracking-tight font-medium">KTS</span></span>
        </div>

        {/* Center Canvas overlay: Artificial Horizon (Pitch, Roll, Slip) */}
        <div className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-full border-2 border-slate-800/90 overflow-hidden bg-slate-950/60 backdrop-blur-md flex items-center justify-center shadow-inner">
          {/* Sky (Blue) and Ground (Brown) half circles rotated based on Roll, translated based on Pitch */}
          <div 
            className="absolute inset-0 w-full h-[500%] flex flex-col transition-all duration-75"
            style={{ 
              transform: `translateY(${telemetry.pitch * 1.5}px) rotate(${-telemetry.roll}deg)`,
              transformOrigin: 'center center'
            }}
          >
            {/* Sky blue half */}
            <div className="flex-1 bg-linear-to-b from-sky-600 to-indigo-500" />
            
            {/* Horizon separator path */}
            <div className="h-0.5 bg-white/85 shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
            
            {/* Ground brown half */}
            <div className="flex-1 bg-linear-to-b from-amber-800 to-yellow-950" />
          </div>

          {/* Pitch lines scale overlay */}
          <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none text-[8px] text-white/50 font-mono">
            <div className="w-10 h-0.5 bg-white/30 mb-8 flex justify-between px-1"><span className="-mt-1.5">20</span><span className="-mt-1.5">20</span></div>
            <div className="w-14 h-0.5 bg-white/30 mb-8 flex justify-between px-1"><span className="-mt-1.5">10</span><span className="-mt-1.5">10</span></div>
            {/* Horizon zero line indicator */}
            <div className="w-20 h-0.5 bg-yellow-400/50" />
            <div className="w-14 h-0.5 bg-white/30 mt-8 flex justify-between px-1"><span className="-mt-1.5">-10</span><span className="-mt-1.5">-10</span></div>
            <div className="w-10 h-0.5 bg-white/30 mt-8 flex justify-between px-1"><span className="-mt-1.5">-20</span><span className="-mt-1.5">-20</span></div>
          </div>

          {/* Plane wings bracket (Static) */}
          <div className="absolute w-24 h-5 flex items-center justify-between pointer-events-none">
            <div className="w-8 h-1 bg-amber-400 rounded shadow-md" /> {/* Left wing */}
            <div className="w-2.5 h-2.5 bg-amber-400 rounded-full border border-slate-900 shadow-md" /> {/* Center fuselage */}
            <div className="w-8 h-1 bg-amber-400 rounded shadow-md" /> {/* Right wing */}
          </div>

          {/* Top heading pointer marker */}
          <div className="absolute top-2 w-0 h-0 border-l-4 border-r-4 border-b-6 border-transparent border-b-yellow-400" />
        </div>

        {/* Right Side Tape: Altitude and VSI (Vertical Speed) */}
        <div className="flex flex-col items-center bg-slate-950/70 backdrop-blur-md border border-slate-800/90 p-3 rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.85)] border-r-emerald-500/55">
          <span className="text-[9px] text-emerald-400 font-extrabold tracking-widest font-mono">ALTITUDE</span>

          {/* Animated tape */}
          <div className="h-32 w-12 flex flex-col justify-between items-center text-xs font-mono py-1 relative border-r-2 border-slate-800 mt-2">
            <span className="text-slate-600 font-mono">{telemetry.altitude + 300}</span>
            <span className="text-slate-500 font-mono">{telemetry.altitude + 150}</span>
            <span className="text-emerald-300 font-stencil text-base leading-none tracking-wider px-2 py-1 bg-emerald-950/70 border-2 border-emerald-450 rounded shadow-[0_0_8px_rgba(16,185,129,0.35)] animate-pulse">
              {telemetry.altitude}
            </span>
            <span className="text-slate-500 font-mono">{Math.max(0, telemetry.altitude - 150)}</span>
            <span className="text-slate-600 font-mono">{Math.max(0, telemetry.altitude - 300)}</span>
          </div>

          <span className="text-emerald-400 font-stencil text-base mt-2 tracking-widest">{telemetry.altitude} <span className="text-[10px] text-slate-400 font-sans tracking-tight font-medium">FT</span></span>
        </div>

      </div>

      {/* 3. HUD LOWER PANELS & ENGINE SPECS */}
      <div className="w-full flex flex-col sm:flex-row items-end justify-between gap-3 pt-3">
        
        {/* Left Aspect Grid: Engine Thrust / Brks */}
        <div className="pointer-events-auto bg-slate-950/65 backdrop-blur-md border border-slate-800/90 p-3 rounded-xl flex items-center gap-4 w-full sm:w-auto shadow-lg">
          {/* Throttle dial */}
          <div className="flex flex-col items-center space-y-1">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">PWR THRUST</span>
            <div className="relative w-14 h-2.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
              <div 
                className="bg-blue-400 h-full rounded-full transition-all duration-150" 
                style={{ width: `${relativePower}%` }}
              />
            </div>
            <span className={`text-[11px] font-bold ${aircraft.hasEngine ? 'text-white' : 'text-slate-500'}`}>
              {aircraft.hasEngine ? `${relativePower}% [W/S]` : 'NO ENGINE'}
            </span>
          </div>

          {/* Gear and Brake states */}
          <div className="flex items-center gap-3 border-l-2 border-slate-800 pl-4 text-[10px]">
            {/* Gear info */}
            <div>
              <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">GEAR [G]</span>
              <span className={`font-extrabold flex items-center gap-1 font-mono tracking-wide ${telemetry.landingGear ? 'text-emerald-400' : 'text-slate-500'}`}>
                <Disc className="w-3 h-3" />
                {telemetry.landingGear ? 'DEPLOYED' : 'RETRACTED'}
              </span>
            </div>

            {/* Brakes info */}
            <div>
              <span className="text-slate-500 block uppercase font-bold text-[8px] tracking-wider">BRAKES [B]</span>
              <span className={`font-extrabold font-mono tracking-wide ${telemetry.brakes ? 'text-amber-400' : 'text-slate-500'}`}>
                {telemetry.brakes ? 'HOLD ACTIVE' : 'OPEN'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Compass tape compass readout */}
        <div className="bg-slate-950/65 backdrop-blur-md border-2 border-slate-800/95 px-4 py-2.5 rounded-lg text-center shadow-[0_4px_20px_rgba(0,0,0,0.85)] w-full sm:w-56 mx-auto">
          <span className="text-[9px] text-slate-500 font-extrabold block uppercase tracking-widest font-mono">HEADING INDEX</span>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Compass className="w-4 h-4 text-amber-500 animate-[pulse_2s_infinite]" />
            <span className="text-base font-stencil text-amber-400 tracking-widest bg-black/60 px-3 py-0.5 rounded border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.25)]">
              {telemetry.heading.toString().padStart(3, '0')}° {getHeadingDirection(telemetry.heading)}
            </span>
          </div>
        </div>

        {/* Right Aspect Panel: Camera and VSpeed */}
        <div className="pointer-events-auto bg-slate-950/65 backdrop-blur-md border border-slate-800/90 p-3 rounded-lg flex items-center gap-4 w-full sm:w-auto shadow-[0_4px_20px_rgba(0,0,0,0.85)] border-r-indigo-500/35">
          {/* VSpeed indicator */}
          <div className="flex flex-col items-start text-[10px]">
            <span className="text-slate-500 font-bold block uppercase text-[8px] tracking-wider">VERT AIRSPEED</span>
            <span className={`text-sm font-stencil tracking-wider leading-none ${telemetry.verticalSpeed >= 0 ? 'text-emerald-400' : telemetry.verticalSpeed < -700 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
              {telemetry.verticalSpeed >= 0 ? '+' : ''}{telemetry.verticalSpeed} <span className="text-[9px] font-mono tracking-normal">FT/M</span>
            </span>
          </div>

          {/* Camera details banner */}
          <div className="border-l-2 border-slate-800 pl-4 flex flex-col items-start">
            <span className="text-slate-300 text-[10px] block font-mono font-bold tracking-wider">{cameraLabel()}</span>
            <span className="text-slate-500 text-[9px] font-mono">[C] TOGGLE CAMERA VIEW</span>
          </div>
        </div>

      </div>

      {/* Dynamic Emergency Flight Checklist HUD Card */}
      {telemetry.failureType && (
        <div className="absolute top-28 left-6 pointer-events-auto bg-slate-950/95 backdrop-blur-md border border-red-500 p-4 rounded-xl shadow-[0_0_25px_rgba(239,68,68,0.3)] w-80 text-white z-30 font-sans">
          <div className="flex items-center gap-2 border-b border-red-500/30 pb-2 mb-3 font-sans">
            <AlertTriangle className="w-5 h-5 text-red-500 animate-[bounce_1.5s_infinite]" />
            <div>
              <span className="text-[9px] font-bold text-red-400 tracking-widest block font-mono">EMERGENCY CHECKLIST</span>
              <span className="text-xs font-bold uppercase block tracking-wider font-sans">
                {telemetry.failureType.replace('_', ' ')} PROCEDURE
              </span>
            </div>
          </div>

          <p className="text-[11px] text-red-200/90 leading-tight mb-3 italic font-sans font-medium">
            Checklist Status: Please comply with critical flight adjustments below to stabilize the aircraft frame.
          </p>

          <div className="space-y-2 font-mono">
            {isFlameout && (
              <>
                <div className="flex items-center justify-between text-[11px] bg-black/60 p-2.5 rounded border border-red-900/40">
                  <span className={`${flameoutPitchDown ? 'line-through text-slate-500' : 'text-slate-200'} font-medium`}>
                    1. Pitch Down (Pitch &lt; -2°)
                  </span>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${flameoutPitchDown ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-500 animate-pulse'}`}>
                    {flameoutPitchDown ? 'COMPLIED' : 'PENDING'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] bg-black/60 p-2.5 rounded border border-red-900/40">
                  <span className={`${flameoutGearRetired ? 'line-through text-slate-500' : 'text-slate-200'} font-medium`}>
                    2. Retract Landing Gear (G)
                  </span>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${flameoutGearRetired ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-500 animate-pulse'}`}>
                    {flameoutGearRetired ? 'COMPLIED' : 'PENDING'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] bg-black/60 p-2.5 rounded border border-red-900/40">
                  <span className={`${flameoutDescentSafe ? 'line-through text-slate-500' : 'text-slate-200'} font-medium`}>
                    3. Safe Glide Desc (Negative VSpeed)
                  </span>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${flameoutDescentSafe ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-500 animate-pulse'}`}>
                    {flameoutDescentSafe ? 'OK' : 'STALL RISK'}
                  </span>
                </div>
              </>
            )}

            {isBirdStrike && (
              <>
                <div className="flex items-center justify-between text-[11px] bg-black/60 p-2.5 rounded border border-red-900/40">
                  <span className={`${birdThrotOk ? 'line-through text-slate-500' : 'text-slate-200'} font-medium`}>
                    1. Drop Throttle to &le; 25%
                  </span>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${birdThrotOk ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-500 animate-pulse'}`}>
                    {birdThrotOk ? 'COMPLIED' : 'POWER HIGH'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] bg-black/60 p-2.5 rounded border border-red-900/40">
                  <span className={`${birdRollOk ? 'line-through text-slate-500' : 'text-slate-200'} font-medium`}>
                    2. Bank Right (Counteract Drift)
                  </span>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${birdRollOk ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-500 animate-pulse'}`}>
                    {birdRollOk ? 'COMPLIED' : 'DRIFTING'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] bg-black/60 p-2.5 rounded border border-red-900/40">
                  <span className={`${birdSpeedOk ? 'line-through text-slate-500' : 'text-slate-200'} font-medium`}>
                    3. Maintain Knots &gt; {aircraft.takeoffSpeed} kts
                  </span>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${birdSpeedOk ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-500 animate-pulse'}`}>
                    {birdSpeedOk ? 'STABLE' : 'STALL RISK'}
                  </span>
                </div>
              </>
            )}

            {isGearJam && (
              <>
                <div className="flex items-center justify-between text-[11px] bg-black/60 p-2.5 rounded border border-red-900/40">
                  <span className={`${gearJamWingsFlat ? 'line-through text-slate-500' : 'text-slate-200'} font-medium`}>
                    1. Target Level Wings (&lt; 4°)
                  </span>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${gearJamWingsFlat ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-500 animate-pulse'}`}>
                    {gearJamWingsFlat ? 'COMPLIED' : 'UNLEVEL'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] bg-black/60 p-2.5 rounded border border-red-900/40">
                  <span className={`${gearJamDescentOk ? 'line-through text-slate-500' : 'text-slate-200'} font-medium`}>
                    2. Cushion Descent (0 to -250f/m)
                  </span>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${gearJamDescentOk ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-500 animate-pulse'}`}>
                    {gearJamDescentOk ? 'SAFE' : 'TOO HARD'}
                  </span>
                </div>
                <div className="text-[10px] text-red-400 text-center uppercase tracking-widest bg-black/30 p-2 rounded border border-red-900/30 font-sans">
                  ⚠️ Belly Landing Override Active
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating Emergency Drill control panel */}
      {showDrillPanel && (
        <div className="absolute top-20 right-6 pointer-events-auto bg-slate-950/95 border-2 border-slate-800 p-5 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.85)] w-80 text-white z-30 font-sans border-t-red-650">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4 font-sans focus-within:outline-hidden">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-[ping_1.2s_infinite] block" />
              <span className="text-xs font-black tracking-widest uppercase text-red-500 font-stencil">
                SYS MALFUNCTION SIMULATOR
              </span>
            </div>
            <button 
              onClick={() => setShowDrillPanel(false)}
              className="text-slate-500 hover:text-slate-300 text-xs font-bold font-mono cursor-pointer border border-slate-800 rounded px-1.5 py-0.5 bg-slate-955 transition-colors"
            >
              ESC
            </button>
          </div>

          <p className="text-[10px] text-slate-400 leading-normal mb-4 font-mono tracking-wide">
            SIMULATE MID-AIR AVIONICS FAILURE MODES. OVERRIDE AUTOMATIC GROUND PROTECTION PROTOCOLS.
          </p>

          <div className="space-y-3.5">
            {/* Drill 1 Well */}
            <div className="cabin-well !p-1.5 focus-within:ring-1 focus-within:ring-red-500/50">
              <button
                onClick={() => onTriggerFailure?.('bird_strike')}
                disabled={!aircraft.hasEngine}
                className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer cabin-btn-base ${
                  telemetry.failureType === 'bird_strike'
                    ? 'cabin-btn-warning'
                    : 'cabin-btn-metallic opacity-85 hover:opacity-100 disabled:opacity-30'
                }`}
              >
                <div className="text-left font-mono pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${telemetry.failureType === 'bird_strike' ? 'cabin-led-red animate-pulse' : 'bg-slate-700'}`} />
                    <span className="font-extrabold text-[11px] tracking-wide">BIRD STRIKE</span>
                  </div>
                  <span className="text-[9px] text-slate-300 font-medium font-sans block normal-case font-normal mt-0.5 leading-tight">Capped power to 25% & aerodynamic drift</span>
                </div>
                <span className="text-[8px] font-mono text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 shrink-0 select-none font-black tracking-wider">DRILL A</span>
              </button>
            </div>

            {/* Drill 2 Well */}
            <div className="cabin-well !p-1.5 focus-within:ring-1 focus-within:ring-red-500/50">
              <button
                onClick={() => onTriggerFailure?.('engine_flameout')}
                disabled={!aircraft.hasEngine}
                className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer cabin-btn-base ${
                  telemetry.failureType === 'engine_flameout'
                    ? 'cabin-btn-warning'
                    : 'cabin-btn-metallic opacity-85 hover:opacity-100 disabled:opacity-30'
                }`}
              >
                <div className="text-left font-mono pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${telemetry.failureType === 'engine_flameout' ? 'cabin-led-red animate-pulse' : 'bg-slate-700'}`} />
                    <span className="font-extrabold text-[11px] tracking-wide">ENGINE FLAMEOUT</span>
                  </div>
                  <span className="text-[9px] text-slate-300 font-medium font-sans block normal-case font-normal mt-0.5 leading-tight">Total thrust loss, forced mechanical glide</span>
                </div>
                <span className="text-[8px] font-mono text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 shrink-0 select-none font-black tracking-wider">DRILL B</span>
              </button>
            </div>

            {/* Drill 3 Well */}
            <div className="cabin-well !p-1.5 focus-within:ring-1 focus-within:ring-red-500/50">
              <button
                onClick={() => onTriggerFailure?.('gear_jam')}
                disabled={!aircraft.hasLandingGear}
                className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer cabin-btn-base ${
                  telemetry.failureType === 'gear_jam'
                    ? 'cabin-btn-warning'
                    : 'cabin-btn-metallic opacity-85 hover:opacity-100 disabled:opacity-30'
                }`}
              >
                <div className="text-left font-mono pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${telemetry.failureType === 'gear_jam' ? 'cabin-led-red animate-pulse' : 'bg-slate-700'}`} />
                    <span className="font-extrabold text-[11px] tracking-wide">GEAR JAM DISORDER</span>
                  </div>
                  <span className="text-[9px] text-slate-300 font-medium font-sans block normal-case font-normal mt-0.5 leading-tight">Stuck retracted, belly-landing override required</span>
                </div>
                <span className="text-[8px] font-mono text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 shrink-0 select-none font-black tracking-wider">DRILL C</span>
              </button>
            </div>

            {telemetry.failureType && (
              <div className="cabin-well !p-1 !rounded-lg mt-4">
                <button
                  onClick={() => onTriggerFailure?.(null)}
                  className="w-full text-center py-2.5 cabin-btn-base cabin-btn-alert text-slate-950 text-xs font-black rounded-md cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>INITIATE IN-FLIGHT REPAIR [R]</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
