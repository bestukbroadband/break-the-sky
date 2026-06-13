import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Aircraft, WeatherOption, GameMode } from '../types';
import { Plane, Compass, CloudSun, Loader2, ArrowRight } from 'lucide-react';

interface CinematicOverlayProps {
  aircraft: Aircraft;
  weather: WeatherOption;
  mode: GameMode;
  onSkip: () => void;
}

export default function CinematicOverlay({
  aircraft,
  weather,
  mode,
  onSkip,
}: CinematicOverlayProps) {
  const [progress, setProgress] = useState(0);

  // Synchronized 6-second progress ticker for visual polish
  useEffect(() => {
    let start: number | null = null;
    const duration = 6000; // 6 seconds
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const currentProgress = Math.min(100, (elapsed / duration) * 100);
      setProgress(currentProgress);

      if (elapsed < duration) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const getSlogan = () => {
    switch (mode) {
      case 'landing_challenge':
        return 'APPROACH & TOUCHDOWN SCAN ACTIVE';
      case 'storm_flight':
        return 'CRITICAL STORMY PENETRATION MAP';
      case 'coastal_tour':
        return 'RECREATIONAL ROUTE INITIALIZATION';
      case 'mountain_run':
        return 'TERRAIN AVOIDANCE PROFILING';
      default:
        return 'RUNWAY LAUNCH COORDINATES LOCKED';
    }
  };

  const getTip = () => {
    if (mode === 'landing_challenge') {
      return 'Maintain an pitch of 2.5° to 5.0° and decrease throttle to stay on the standard 3-degree glide slope.';
    }
    return 'Gently pull back your nose (Down Arrow key) once your speed sweeps past the standard aircraft rotation limit.';
  };

  return (
    <div id="cinematic-briefing-overlay" className="absolute inset-0 z-20 flex flex-col justify-between p-6 md:p-10 pointer-events-none select-none">
      
      {/* Visual Ambient Vignettes */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,_var(--color-slate-950)_0%,_transparent_100%] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/85 pointer-events-none" />

      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pointer-events-auto">
        <div className="flex items-center gap-3.5 bg-slate-950/70 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-800/80 shadow-2xl">
          <div className="relative flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
            <Plane className="w-4 h-4 text-emerald-400 absolute" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono text-sky-400 tracking-[0.2em] font-bold">PRE-FLIGHT SYSTEMS ON</span>
            </div>
            <h2 className="text-sm font-black text-white tracking-wider uppercase font-sans">
              RUNWAY SWEEP CINEMATIC
            </h2>
          </div>
        </div>

        {/* Live Scan Metrics */}
        <div className="flex items-center gap-4 bg-slate-950/70 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-800/80 shadow-2xl font-mono text-xs">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Telemetry Link</span>
            <span className="text-emerald-400 font-bold tracking-tight animate-pulse uppercase">🛰️ SCANNING LIVE</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Feed Code</span>
            <span className="text-slate-300 font-bold">POS-{Math.round(2000 + progress * 50)}</span>
          </div>
        </div>
      </div>

      {/* Centered Target HUD Scope Graphic */}
      <div className="hidden lg:flex flex-col items-center justify-center text-center text-sky-400/20 pointer-events-none flex-grow">
        <div className="w-32 h-32 rounded-full border border-dashed border-sky-450/20 relative flex items-center justify-center animate-[spin_50s_linear_infinite]">
          <div className="w-24 h-24 rounded-full border border-sky-450/10 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-sky-400/20" />
          </div>
          <div className="absolute top-0 w-[1px] h-full bg-sky-500/10" />
          <div className="absolute left-0 w-full h-[1px] bg-sky-500/10" />
        </div>
        <span className="text-[9px] tracking-[0.3em] font-mono mt-3 uppercase">SURFACE SCAN ALIGNED</span>
      </div>

      {/* Bottom Mission HUD Panel */}
      <div className="space-y-4 pointer-events-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Mission Specifications */}
          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/85 p-4 rounded-2xl shadow-xl flex items-start gap-3">
            <div className="p-2.5 bg-sky-950/40 rounded-xl border border-sky-900/30 text-sky-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">OPERATIONAL MISSION</span>
              <span className="text-xs font-bold text-slate-200 block uppercase tracking-wide font-mono mt-0.5">
                {mode.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-sky-400 font-mono tracking-wider block mt-0.5 uppercase">
                {getSlogan()}
              </span>
            </div>
          </div>

          {/* Aircraft Specifications */}
          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/85 p-4 rounded-2xl shadow-xl flex items-start gap-3">
            <div className="p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-900/30 text-emerald-400">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">AIRCRAFT ASSIGNED</span>
              <span className="text-xs font-bold text-slate-200 block font-mono mt-0.5">
                {aircraft.name}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                Weight: {aircraft.weight.toLocaleString()} lb • Takeoff: {aircraft.takeoffSpeed} kts
              </span>
            </div>
          </div>

          {/* Atmospheric Profile */}
          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/85 p-4 rounded-2xl shadow-xl flex items-start gap-3">
            <div className="p-2.5 bg-amber-950/40 rounded-xl border border-amber-900/30 text-amber-400">
              <CloudSun className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">METEORIC WAVEFORM</span>
              <span className="text-xs font-bold text-slate-200 block font-mono mt-0.5 uppercase">
                {weather.name}
              </span>
              <span className="text-[10px] text-amber-400 font-mono tracking-wider block mt-0.5">
                Wind: {weather.windSpeed} kts • Sky: {weather.timeOfDay}
              </span>
            </div>
          </div>

        </div>

        {/* Outer progress frame and quick action */}
        <div className="bg-slate-950/85 backdrop-blur-lg border border-slate-800 p-4 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="flex-grow w-full space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
              <span className="uppercase tracking-wider">Seeding Terrain Matrix & Sweeping Runway Beacons</span>
              <span className="text-sky-400 font-bold">{Math.round(progress)}% COMPLETE</span>
            </div>
            
            {/* Custom high-tech progress track */}
            <div className="h-1.5 w-full bg-slate-900 border border-slate-800 rounded-full overflow-hidden flex items-center">
              <div 
                className="bg-gradient-to-r from-sky-500 via-emerald-400 to-sky-400 h-full rounded-full transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Dynamic pilot advice */}
            <p className="text-[10px] text-slate-400 leading-relaxed italic font-sans">
              💡 <span className="font-semibold text-slate-200">Pilot Briefing Note:</span> {getTip()}
            </p>
          </div>

          {/* Action Button: skip & fly */}
          <button
            id="skip-cinematic-intro-btn"
            onClick={onSkip}
            className="w-full md:w-auto px-6 py-3.5 font-bold tracking-wider text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-xl cursor-pointer text-xs transition-all shadow-[0_0_15px_rgba(56,189,248,0.35)] flex items-center justify-center gap-2 font-mono uppercase shrink-0"
          >
            SKIP SEQUENCE & FLY <ArrowRight className="w-4 h-4 ml-1 text-slate-950 animate-bounce-right" />
          </button>
        </div>

        {/* Mini overlay hints */}
        <div className="text-center font-mono text-[9px] text-slate-500 block uppercase tracking-widest pt-1">
          💡 PRO-TIP: PRESS <span className="text-slate-400 font-bold">[SPACEBAR]</span> TO INSTANTLY ENTER COCKPIT FLIGHT CONTROLS ANYTIME
        </div>

      </div>

    </div>
  );
}
