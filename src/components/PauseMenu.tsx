import React from 'react';
import { Play, RotateCcw, Home, CloudLightning, ShieldAlert, Sliders, Volume2 } from 'lucide-react';
import { Aircraft, WeatherOption } from '../types';

interface PauseMenuProps {
  onContinue: () => void;
  onRestart: () => void;
  onChangeAircraftOrWeather: () => void;
  onExitToMenu: () => void;
  aircraft: Aircraft;
  weather: WeatherOption;
  onWatchReplay?: () => void;
}

export default function PauseMenu({
  onContinue,
  onRestart,
  onChangeAircraftOrWeather,
  onExitToMenu,
  aircraft,
  weather,
  onWatchReplay,
}: PauseMenuProps) {
  return (
    <div id="pause-screen-overlay" className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-30 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-slate-900 border-2 border-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl relative space-y-6">
        
        {/* Glow corner light */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Title */}
        <div className="text-center space-y-1">
          <PlaneLogo />
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-widest font-stencil uppercase">
            SIMULATION PAUSED
          </h2>
          <p className="text-xs text-sky-400 font-mono">
            {aircraft.name} • {weather.name} ({weather.timeOfDay})
          </p>
        </div>

        {/* Dynamic configuration overview */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <div>
            <span className="text-slate-500 block uppercase font-bold text-[9px] font-mono tracking-wider">Aircraft Weight</span>
            <span className="text-slate-200 block font-stencil text-sm mt-0.5">{aircraft.weight.toLocaleString()} lb</span>
          </div>
          <div>
            <span className="text-slate-500 block uppercase font-bold text-[9px] font-mono tracking-wider">Meteorology Wind</span>
            <span className="text-slate-200 block font-stencil text-sm mt-0.5">{weather.windSpeed} Knots</span>
          </div>
        </div>

        {/* Button Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          
          {/* Resume button well */}
          <div className="cabin-well !p-1.5 focus-within:ring-1 focus-within:ring-cyan-500/50">
            <button
              id="pause-resume-btn"
              onClick={onContinue}
              className="w-full py-4 px-4 cabin-btn-base cabin-btn-cyan cursor-pointer text-sm flex items-center justify-center gap-2.5 shadow-md"
            >
              <Play className="w-4 h-4 text-cyan-400 fill-cyan-405" />
              <span>RESUME FLIGHT [P]</span>
              <span className="w-2 h-2 rounded-full cabin-led-green" />
            </button>
          </div>

          {onWatchReplay && (
            <div className="cabin-well !p-1.5 focus-within:ring-1 focus-within:ring-amber-500/55">
              <button
                id="pause-replay-btn"
                onClick={onWatchReplay}
                className="w-full py-4 px-4 cabin-btn-base cabin-btn-alert cursor-pointer text-sm flex items-center justify-center gap-2.5 shadow-md"
              >
                <span>REPLAY MANEUVER [V]</span>
                <span className="w-2 h-2 rounded-full cabin-led-amber animate-pulse" />
              </button>
            </div>
          )}

          {/* Restart button well */}
          <div className="cabin-well !p-1.5 focus-within:ring-1 focus-within:ring-slate-500/50">
            <button
              id="pause-restart-btn"
              onClick={onRestart}
              className="w-full py-4 px-4 cabin-btn-base cabin-btn-metallic cursor-pointer text-sm flex items-center justify-center gap-2.5 shadow-md"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>RESTART AIRLINE [R]</span>
            </button>
          </div>

          {/* Change configurations button well */}
          <div className="cabin-well !p-1.5 focus-within:ring-1 focus-within:ring-slate-500/50">
            <button
              id="pause-change-config-btn"
              onClick={onChangeAircraftOrWeather}
              className="w-full py-4 px-4 cabin-btn-base cabin-btn-metallic cursor-pointer text-sm flex items-center justify-center gap-2.5 shadow-md"
            >
              <Sliders className="w-4 h-4 text-slate-400" />
              <span>CHANGE CONFIG</span>
            </button>
          </div>

          {/* Quit button well */}
          <div className="w-full sm:col-span-2 cabin-well !p-1.5 focus-within:ring-1 focus-within:ring-red-500/50">
            <button
              id="pause-exit-btn"
              onClick={onExitToMenu}
              className="w-full py-4 px-4 cabin-btn-base cabin-btn-warning cursor-pointer text-sm flex items-center justify-center gap-2.5 shadow-md"
            >
              <Home className="w-4 h-4 text-rose-300" />
              <span>QUIT TO MAIN MENU</span>
              <span className="w-2 h-2 rounded-full cabin-led-red" />
            </button>
          </div>

        </div>

        {/* Inline controller tips */}
        <div className="border-t border-slate-800 pt-4 text-center text-[10px] text-slate-500">
          <p>💡 Tip: If you stall, glide down slightly to catch wind velocity before pulling up again.</p>
        </div>

      </div>
    </div>
  );
}

function PlaneLogo() {
  return (
    <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-sky-500/10 border border-sky-500/20 text-sky-400 animate-pulse mb-2">
      <Sliders className="w-6 h-6 text-sky-400" />
    </div>
  );
}
