import React from 'react';
import { Award, RotateCcw, Home, Skull, ShieldCheck, Crosshair, AlertTriangle, BookOpen } from 'lucide-react';
import { Aircraft, FlightTelemetry } from '../types';

interface LandingResultProps {
  telemetry: FlightTelemetry;
  aircraft: Aircraft;
  isCrash: boolean;
  onRestart: () => void;
  onExit: () => void;
  onViewLogbook: () => void;
  onWatchReplay?: () => void;
}

export default function LandingResult({
  telemetry,
  aircraft,
  isCrash,
  onRestart,
  onExit,
  onViewLogbook,
  onWatchReplay,
}: LandingResultProps) {
  
  // Calculate a rating grade based on score
  const getGrade = () => {
    if (isCrash) return 'F (CRITICAL FATIGUE)';
    const ts = telemetry.score;
    if (ts >= 1500) return 'S+ (ELITE AVIATOR)';
    if (ts >= 1200) return 'A (PROFESSIONAL TOUCHDOWN)';
    if (ts >= 800) return 'B (GOOD FLIGHT ALIGNMENT)';
    if (ts >= 400) return 'C (STANDARDIZED DESCENT)';
    return 'D (AMATEUR FLIGHT PILOT)';
  };

  const getSubtext = () => {
    if (isCrash) {
      return "Flight parameters outside structural integrity thresholds. Review controls and try again.";
    }
    return "Outstanding flight deck control! Wings were level, vertical descent was smooth, and alignment was pristine.";
  };

  return (
    <div id="landing-result-overlay" className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-40 overflow-y-auto flex items-start sm:items-center justify-center p-4 py-8">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 p-5 sm:p-8 rounded-2xl shadow-2xl relative space-y-4 my-auto">
        
        {/* Colorful flare */}
        <div className={`absolute top-0 right-0 w-44 h-44 rounded-full blur-3xl pointer-events-none ${
          isCrash ? 'bg-red-500/10' : 'bg-emerald-500/10'
        }`} />

        {/* Top Header Icon */}
        <div className="text-center space-y-2">
          <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center border-2 ${
            isCrash 
              ? 'bg-red-500/10 border-red-500/30 text-red-500 animate-[bounce_1s_infinite]' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 animate-pulse'
          }`}>
            {isCrash ? <Skull className="w-8 h-8 text-red-500" /> : <ShieldCheck className="w-8 h-8 text-emerald-405" />}
          </div>

          <h2 className={`text-2xl sm:text-3xl font-black font-stencil tracking-widest uppercase ${
            isCrash ? 'text-red-505 shadow-[0_0_12px_rgba(239,68,68,0.25)]' : 'text-emerald-405 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
          }`}>
            {isCrash ? 'SIMULATION DISASTER' : 'SUCCESSFUL TOUCHDOWN!'}
          </h2>
          
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            {getSubtext()}
          </p>
        </div>

        {/* Detailed feedback lists */}
        <div className="bg-slate-950/80 rounded-xl p-5 border border-slate-800 space-y-4">
          <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-850 pb-2">
            🚨 TELEMETRY FLIGHT DATA ANALYTICS
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs font-mono">
            
            {/* Landing speed */}
            <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">TOUCHDOWN VELOCITY</span>
              <span className={`font-stencil text-sm tracking-wider ${isCrash ? 'text-red-400' : 'text-white'}`}>
                {telemetry.speed} <span className="text-[9px] font-mono select-none tracking-normal">KTS</span>
              </span>
            </div>

            {/* Descent rate */}
            <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">VERTICAL RATE</span>
              <span className={`font-stencil text-sm tracking-wider ${telemetry.verticalSpeed < -850 ? 'text-red-400' : 'text-white'}`}>
                {telemetry.verticalSpeed} <span className="text-[9px] font-mono select-none tracking-normal">FT/M</span>
              </span>
            </div>

            {/* Rating Grade */}
            <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 sm:col-span-2">
              <span className="text-slate-400">AVIATOR RATING CERTIFICATE</span>
              <span className={`font-stencil tracking-widest text-sm uppercase ${isCrash ? 'text-red-400' : 'text-emerald-400'}`}>
                {getGrade()}
              </span>
            </div>

            {/* Total Points accumulated */}
            <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border-2 border-slate-800 sm:col-span-2 shadow-inner">
              <span className="text-slate-400">TOTAL SCORE ACCUMULATION</span>
              <span className="text-yellow-405 font-stencil text-base tracking-widest bg-black/40 px-2.5 py-0.5 rounded border border-yellow-500/10 shadow-[0_0_8px_rgba(234,179,8,0.2)]">
                {telemetry.score} PTS
              </span>
            </div>

          </div>

          {/* Crash helper text */}
          {isCrash && (
            <div className="p-3 bg-red-950/30 border border-red-900/30 rounded-lg text-[11px] text-red-300 leading-normal">
              💡 <span className="font-bold uppercase">Incident log:</span> {telemetry.lastMessage}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Retry well */}
          <div className="cabin-well !p-1.5 focus-within:ring-1 focus-within:ring-cyan-500/50">
            <button
              id="result-retry-btn"
              onClick={onRestart}
              className="w-full py-4 px-4 cabin-btn-base cabin-btn-cyan cursor-pointer text-sm flex items-center justify-center gap-2 shadow-md"
            >
              <RotateCcw className="w-4 h-4 text-cyan-405" />
              <span>RETRY INCIDENT [R]</span>
              <span className="w-2 h-2 rounded-full cabin-led-green animate-pulse" />
            </button>
          </div>

          {onWatchReplay && (
            <div className="cabin-well !p-1.5 focus-within:ring-1 focus-within:ring-amber-500/50">
              <button
                id="result-replay-btn"
                onClick={onWatchReplay}
                className="w-full py-4 px-4 cabin-btn-base cabin-btn-alert cursor-pointer text-sm flex items-center justify-center gap-2 shadow-md"
              >
                <span>REPLAY RUN [V]</span>
                <span className="w-2 h-2 rounded-full cabin-led-amber animate-pulse" />
              </button>
            </div>
          )}

          {/* Logbook well */}
          <div className="cabin-well !p-1.5 focus-within:ring-1 focus-within:ring-slate-500/50">
            <button
              id="result-logbook-btn"
              onClick={onViewLogbook}
              className="w-full py-4 px-4 cabin-btn-base cabin-btn-metallic cursor-pointer text-sm flex items-center justify-center gap-2 shadow-md"
            >
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>PILOT LOGBOOK</span>
            </button>
          </div>

          {/* Main menu well */}
          <div className="cabin-well !p-1.5 focus-within:ring-1 focus-within:ring-red-500/50">
            <button
              id="result-quit-btn"
              onClick={onExit}
              className="w-full py-4 px-4 cabin-btn-base cabin-btn-warning cursor-pointer text-sm flex items-center justify-center gap-2 shadow-md"
            >
              <Home className="w-4 h-4 text-rose-300" />
              <span>MAIN MENU</span>
              <span className="w-2 h-2 rounded-full cabin-led-red" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
