import React from 'react';
import { ArrowLeft, Check, FastForward, Weight, Paintbrush, Gauge, ShieldAlert, Zap, Compass } from 'lucide-react';
import { Aircraft } from '../types';
import { AIRCRAFT_LIST } from '../data/aircraftData';

interface AircraftSelectProps {
  onBack: () => void;
  onSelect: (aircraft: Aircraft) => void;
}

interface Livery {
  name: string;
  color: string;
  accentColor: string;
  description: string;
}

const LIVERIES: Livery[] = [
  { name: 'Factory Standard', color: '', accentColor: '', description: 'Default squadron military coat paint' },
  { name: 'Red Baron Ace', color: '#dc2626', accentColor: '#fbbf24', description: 'Aggressive crimson and yellow racing strip' },
  { name: 'Tactical Matte', color: '#111827', accentColor: '#f97316', description: 'Radar-absorbent gunmetal with high-vis orange trim' },
  { name: 'Blue Lightning', color: '#1d4ed8', accentColor: '#38bdf8', description: 'Interstellar navy with neon cyan highlight' },
  { name: 'Vortex Green', color: '#090d16', accentColor: '#22c55e', description: 'Void-black shell with glowing radioactive decals' },
  { name: 'Vanguard Gold', color: '#b45309', accentColor: '#f1f5f9', description: 'Polished gold composite with crisp arctic white' },
];

export default function AircraftSelect({ onBack, onSelect }: AircraftSelectProps) {
  const categories = ['Beginner', 'Classic', 'Commercial', 'Military', 'Specialist'] as const;
  const [selectedCategory, setSelectedCategory] = React.useState<typeof categories[number] | 'All'>('All');
  const [selectedId, setSelectedId] = React.useState<string>('propeller');
  const [selectedLiveryIdx, setSelectedLiveryIdx] = React.useState<number>(0);
  const [comparisonId, setComparisonId] = React.useState<string | null>(null);

  // Safety Cover Switch for the Air Force style ignition button
  const [safetyGuardLifted, setSafetyGuardLifted] = React.useState<boolean>(false);

  const currentAircraft = AIRCRAFT_LIST.find((item) => item.id === selectedId) || AIRCRAFT_LIST[0];
  const compareAircraft = comparisonId ? AIRCRAFT_LIST.find((item) => item.id === comparisonId) : null;

  // Reset livery and comparison plane when switching primary plane
  React.useEffect(() => {
    setSelectedLiveryIdx(0);
    // Auto-preselect another comparison plane in the same category, or none
    const relatives = AIRCRAFT_LIST.filter(a => a.id !== selectedId);
    if (relatives.length > 0) {
      setComparisonId(relatives[0].id);
    }
  }, [selectedId]);

  // Filtered list of fleet planes
  const filteredAircraft = selectedCategory === 'All' 
    ? AIRCRAFT_LIST 
    : AIRCRAFT_LIST.filter(p => p.category === selectedCategory);

  // Helper metrics for comparison panel
  const getSpeedRating = (plane: Aircraft) => Math.round((plane.maxSpeed / 1020) * 100);
  const getHandlingRating = (plane: Aircraft) => plane.maneuverability * 10;
  
  // Heavy stability is higher for narrow wing/heavy mass ratios
  const getStabilityRating = (plane: Aircraft) => {
    if (plane.id === 'stealth_bomber' || plane.id === 'heavy_bomber') return 95;
    if (plane.id === 'passenger_jet') return 90;
    if (plane.id === 'cargo_plane') return 88;
    if (plane.id === 'private_jet') return 75;
    if (plane.id === 'propeller') return 60;
    if (plane.id === 'seaplane') return 55;
    if (plane.id === 'biplane') return 45;
    return 35; // quiet glider is lightweight
  };

  // Turn rate and glide stall factor dictate landing difficulty rating
  const getLandingDifficulty = (plane: Aircraft) => {
    if (plane.takeoffSpeed > 130) return { label: 'EXPERT', color: 'text-red-400 border-red-500/30 bg-red-950/20' };
    if (plane.takeoffSpeed > 90) return { label: 'HARD', color: 'text-amber-400 border-amber-500/30 bg-amber-950/20' };
    if (plane.takeoffSpeed > 50) return { label: 'MEDIUM', color: 'text-yellow-400 border-yellow-500/20 bg-yellow-950/10' };
    return { label: 'EASY', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-950/20' };
  };

  return (
    <div id="aircraft-select-screen" className="relative min-h-screen w-full flex flex-col justify-between text-slate-100 bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 overflow-y-auto px-4 py-6 sm:px-8">
      {/* Structural dashboard border lines */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-transparent to-transparent pointer-events-none" />

      {/* Header Panel */}
      <header className="relative z-10 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b-2 border-slate-800 bg-slate-900/60 p-4 rounded-xl border-t border-x border-slate-700/35 shadow-lg gap-4">
        <button
          id="back-to-home-btn"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-slate-400 hover:text-white transition-all bg-slate-950/80 px-3.5 py-2 rounded-lg border border-slate-800 hover:border-slate-600 active:translate-y-0.5"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" /> ESC: OUT TO STEWARD COMMAND
        </button>
        <div className="text-right flex flex-col items-end">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h1 className="text-base sm:text-lg font-bold tracking-[0.25em] text-white font-mono uppercase bg-slate-950/40 px-3 py-1 rounded border border-slate-800/80">Flight Line Selection Desk</h1>
          </div>
          <p className="text-[10px] text-sky-400 font-mono tracking-widest mt-1">SQUADRON STATUS: GREEN • WEAPONRY SAFE</p>
        </div>
      </header>

      {/* Category Selection Filter Bar - Shaped like a military cockpit instrumentation plate */}
      <div className="relative z-10 max-w-7xl mx-auto w-full mt-4 bg-slate-950 border border-slate-800 p-2.5 rounded-xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] flex flex-wrap items-center justify-between gap-3">
        <span className="text-[10px] font-mono font-bold text-slate-500 px-2 tracking-widest uppercase">CLASSIFICATION FILTER:</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3.5 py-1.5 rounded text-xs font-mono font-bold tracking-wider transition-all cursor-pointer border ${
              selectedCategory === 'All'
                ? 'bg-sky-500/20 text-sky-300 border-sky-400/80 shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:bg-slate-800/50 hover:text-slate-300'
            }`}
          >
            [ SHOW ALL ]
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded text-xs font-mono font-bold tracking-wider transition-all cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                  : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:bg-slate-800/50 hover:text-slate-300'
              }`}
            >
              {cat.toUpperCase()} / SQUAD
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid View */}
      <main className="relative z-10 max-w-7xl mx-auto w-full my-auto grid grid-cols-1 lg:grid-cols-12 gap-6 py-4 items-stretch">
        
        {/* Left Side: Dynamic Grid of Aircraft Cards */}
        <section className="col-span-1 lg:col-span-6 space-y-4 flex flex-col justify-between">
          <div className="flex-1 space-y-3 bg-slate-950/20 p-2 rounded-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[64vh] overflow-y-auto pr-1">
              {filteredAircraft.map((plane) => {
                const isSelected = selectedId === plane.id;
                const isToCompare = comparisonId === plane.id;
                const diffInfo = getLandingDifficulty(plane);
                
                return (
                  <div
                    key={plane.id}
                    className={`relative p-3.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-900/90 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.22)]'
                        : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/75 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Accent Strip */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl" 
                      style={{ backgroundColor: plane.color }}
                    />

                    {/* Content Section */}
                    <div>
                      <div className="flex justify-between items-start pt-1 gap-2">
                        <div>
                          <span className="text-[9px] font-mono font-bold text-sky-400 uppercase tracking-widest">{plane.category} CATEGORY</span>
                          <h3 className="font-bold text-sm sm:text-base font-sans tracking-wide text-white mt-0.5">{plane.name}</h3>
                        </div>
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 border rounded ${diffInfo.color}`}>
                          {diffInfo.label}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                        {plane.description}
                      </p>

                      {/* Speed & Weight Indicators */}
                      <div className="grid grid-cols-2 gap-2 mt-3.5 border-t border-slate-800/60 pt-2 text-[10px] font-mono text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Gauge className="w-3 h-3 text-sky-400" />
                          <span>{plane.maxSpeed} KTS V_MAX</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Weight className="w-3 h-3 text-emerald-400" />
                          <span>{plane.weight.toLocaleString()} LBS</span>
                        </div>
                      </div>
                    </div>

                    {/* Cabin Action Bar */}
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-850 pt-2.5">
                      <button
                        onClick={() => setSelectedId(plane.id)}
                        className={`flex-1 py-1.5 px-2 rounded font-mono text-[10px] font-bold text-center border cursor-pointer uppercase transition-all ${
                          isSelected
                            ? 'bg-sky-500 text-slate-950 border-sky-300'
                            : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-900 hover:text-white'
                        }`}
                      >
                        {isSelected ? '✓ FLIERS PRIMARY' : 'ENGAGE CRAFT'}
                      </button>

                      {/* Compare Switch Toggle button like a cabin breaker toggle */}
                      {!isSelected && (
                        <button
                          onClick={() => {
                            if (isToCompare) {
                              setComparisonId(null);
                            } else {
                              setComparisonId(plane.id);
                            }
                          }}
                          className={`px-2 py-1.5 rounded font-mono text-[9px] font-medium border cursor-pointer uppercase transition-all ${
                            isToCompare
                              ? 'bg-amber-500/15 text-amber-400 border-amber-400/80 shadow-[0_0_6px_rgba(245,158,11,0.2)]'
                              : 'bg-slate-950/20 text-slate-500 border-slate-800 hover:text-slate-300'
                          }`}
                        >
                          {isToCompare ? 'CO-COMPARE ON' : 'ADD COMPARER'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Side: Airforce Cabin Dashboard Terminal & Comparison Panel */}
        <section className="col-span-1 lg:col-span-6 flex flex-col justify-between p-5 bg-gradient-to-b from-slate-900 to-indigo-950/40 rounded-2xl border-2 border-slate-800 relative shadow-2xl overflow-hidden gap-5">
          {/* Dashboard warning hazard block background */}
          <div className="absolute top-0 right-0 w-24 h-24 opacity-5 pointer-events-none bg-[repeating-linear-gradient(45deg,#000,#000_10px,#fff_10px,#fff_20px)]" />

          {/* Master Panel Header */}
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              <h3 className="text-xs font-mono font-bold text-emerald-400 tracking-widest uppercase">COCKPIT INJECTOR COMPARATOR</h3>
            </div>
            <span className="text-[9px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">MODEL RECALIBRATOR v4.6</span>
          </div>

          {/* Core Calibration Specs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Plane column info */}
            <div className="bg-slate-950/50 p-4 rounded-xl border border-sky-500/10 space-y-3 relative">
              <span className="absolute top-2 right-2 text-[10px] font-mono text-sky-400 bg-sky-950/30 px-1.5 rounded font-bold uppercase">PRIMARY</span>
              <div 
                className="w-10 h-10 rounded-full border border-sky-400/30 font-sans font-bold flex items-center justify-center text-xs shadow-md"
                style={{ backgroundColor: currentAircraft.color, color: currentAircraft.accentColor }}
              >
                {currentAircraft.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <span className="text-[9px] font-mono text-slate-500 block">{currentAircraft.type}</span>
                <h4 className="text-sm font-bold text-white tracking-wide font-mono">{currentAircraft.name}</h4>
              </div>
              <p className="text-[10px] text-slate-400 italic leading-normal select-none">
                "{currentAircraft.description}"
              </p>
            </div>

            {/* Comparison Plane column info */}
            <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-800 space-y-3 relative flex flex-col justify-between">
              {compareAircraft ? (
                <>
                  <button 
                    onClick={() => setComparisonId(null)}
                    className="absolute top-2 right-2 text-[8px] font-mono text-red-400 bg-red-950/30 px-1 rounded hover:bg-red-950 transition-colors uppercase border border-red-500/20"
                  >
                    CLEAR
                  </button>
                  <div className="space-y-3">
                    <div 
                      className="w-10 h-10 rounded-full border border-slate-700 font-sans font-bold flex items-center justify-center text-xs shadow-md"
                      style={{ backgroundColor: compareAircraft.color, color: compareAircraft.accentColor }}
                    >
                      {compareAircraft.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 block">{compareAircraft.type}</span>
                      <h4 className="text-sm font-bold text-amber-400 tracking-wide font-mono">{compareAircraft.name}</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 italic leading-normal select-none">
                      "{compareAircraft.description}"
                    </p>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-3 text-slate-500">
                  <Compass className="w-6 h-6 text-slate-700 animate-spin-slow mb-1" />
                  <span className="text-[10px] font-mono">NO COMPARISON PLANES CHOSEN</span>
                  <p className="text-[9px] text-slate-600 mt-1 italic leading-snug">Click "Add Comparer" on any pilot card below to evaluate side-by-side performance indicators.</p>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Stat Comparator Panels */}
          <div className="space-y-3.5 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
            <h4 className="text-[10px] font-mono font-bold text-slate-400 tracking-widest uppercase">HARMONIZED TELEMETRY METRIC EVALUATION</h4>
            
            {/* Speed comparison bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400 uppercase">AERODYNAMIC SPEED RATIO</span>
                <div className="space-x-2">
                  <span className="text-sky-400 font-bold">{currentAircraft.maxSpeed} KTS</span>
                  {compareAircraft && <span className="text-amber-400 font-bold">vs {compareAircraft.maxSpeed} KTS</span>}
                </div>
              </div>
              <div className="h-3.5 w-full bg-slate-950 rounded-md border border-slate-800 overflow-hidden relative flex flex-col justify-center px-1">
                {/* Primary speed bar */}
                <div 
                  className="bg-sky-500 h-1 rounded transition-all duration-300"
                  style={{ width: `${getSpeedRating(currentAircraft)}%` }}
                />
                {/* Secondary speed bar if compared */}
                {compareAircraft && (
                  <div 
                    className="bg-amber-500 h-1 rounded mt-0.5 transition-all duration-300"
                    style={{ width: `${getSpeedRating(compareAircraft)}%` }}
                  />
                )}
              </div>
            </div>

            {/* Handling comparison bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400 uppercase">AEROBATIC FLIGHT AGILITY</span>
                <div className="space-x-2">
                  <span className="text-emerald-400 font-bold">{currentAircraft.maneuverability}/10</span>
                  {compareAircraft && <span className="text-amber-400 font-bold">vs {compareAircraft.maneuverability}/10</span>}
                </div>
              </div>
              <div className="h-3.5 w-full bg-slate-950 rounded-md border border-slate-800 overflow-hidden relative flex flex-col justify-center px-1">
                <div 
                  className="bg-emerald-500 h-1 rounded transition-all duration-300"
                  style={{ width: `${getHandlingRating(currentAircraft)}%` }}
                />
                {compareAircraft && (
                  <div 
                    className="bg-amber-500 h-1 rounded mt-0.5 transition-all duration-300"
                    style={{ width: `${getHandlingRating(compareAircraft)}%` }}
                  />
                )}
              </div>
            </div>

            {/* Stability comparison bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400 uppercase">HEAVY AIRMASS STABILITY</span>
                <div className="space-x-2">
                  <span className="text-indigo-400 font-bold">{getStabilityRating(currentAircraft)}%</span>
                  {compareAircraft && <span className="text-amber-400 font-bold">vs {getStabilityRating(compareAircraft)}%</span>}
                </div>
              </div>
              <div className="h-3.5 w-full bg-slate-950 rounded-md border border-slate-800 overflow-hidden relative flex flex-col justify-center px-1">
                <div 
                  className="bg-indigo-500 h-1 rounded transition-all duration-300"
                  style={{ width: `${getStabilityRating(currentAircraft)}%` }}
                />
                {compareAircraft && (
                  <div 
                    className="bg-amber-500 h-1 rounded mt-0.5 transition-all duration-300"
                    style={{ width: `${getStabilityRating(compareAircraft)}%` }}
                  />
                )}
              </div>
            </div>

            {/* Landing Difficulty indicators */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-850">
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                <span className="text-[8px] font-mono text-slate-500 block uppercase">START LIFTOFF SPEED</span>
                <span className="text-xs font-mono font-bold text-slate-200 mt-1 block">{currentAircraft.takeoffSpeed} Knots</span>
                {compareAircraft && <span className="text-[9px] font-mono text-amber-500 mt-0.5 block">vs {compareAircraft.takeoffSpeed} Knots</span>}
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                <span className="text-[8px] font-mono text-slate-500 block uppercase">ASPECT RATIO LIFT RATIO</span>
                <span className="text-xs font-mono font-bold text-slate-200 mt-1 block">{(currentAircraft.liftCoefficient * 100).toFixed(1)}% Coefficient</span>
                {compareAircraft && <span className="text-[9px] font-mono text-amber-500 mt-0.5 block">vs {(compareAircraft.liftCoefficient * 100).toFixed(1)}%</span>}
              </div>
            </div>
          </div>

          {/* Custom Livery Selector inside right panel */}
          <div className="space-y-2.5 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-1.5">
              <Paintbrush className="w-3.5 h-3.5 text-sky-400" />
              <h4 className="text-[10px] font-mono font-bold text-slate-400 tracking-widest uppercase">LIVERY PAINT OR COCKPIT DECORATIONS</h4>
            </div>
            
            <div className="grid grid-cols-3 gap-1.5">
              {LIVERIES.map((livery, idx) => {
                const isLiverySelected = selectedLiveryIdx === idx;
                const displayColor = livery.color || currentAircraft.color;
                const displayAccent = livery.accentColor || currentAircraft.accentColor;
                
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedLiveryIdx(idx)}
                    title={livery.description}
                    className={`relative p-1.5 rounded-lg text-center border cursor-pointer transition-all flex flex-col items-center gap-1 group ${
                      isLiverySelected
                        ? 'bg-slate-900 border-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.2)]'
                        : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-900/40 hover:border-slate-700'
                    }`}
                  >
                    {/* Tiny Swatch */}
                    <div className="relative w-5 h-5 rounded-full overflow-hidden border border-slate-700/80 shadow-inner flex">
                      <div className="w-1/2 h-full" style={{ backgroundColor: displayColor }} />
                      <div className="w-1/2 h-full" style={{ backgroundColor: displayAccent }} />
                      {isLiverySelected && (
                        <div className="absolute inset-0 bg-sky-950/30 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-sky-400 stroke-[3px]" />
                        </div>
                      )}
                    </div>
                    <div className="text-[8px] font-bold text-slate-300 truncate w-full px-0.5 select-none">{livery.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Airforce Cabin Tactile Switch & Engager Button Group */}
          <div className="pt-4 border-t border-slate-800 bg-slate-950/50 p-4 rounded-xl border relative shadow-inner overflow-hidden">
            {/* Steel rivets aesthetic */}
            <div className="absolute top-1 left-1 w-1 h-1 bg-slate-700 rounded-full" />
            <div className="absolute top-1 right-1 w-1 h-1 bg-slate-700 rounded-full" />
            <div className="absolute bottom-1 left-1 w-1 h-1 bg-slate-700 rounded-full" />
            <div className="absolute bottom-1 right-1 w-1 h-1 bg-slate-700 rounded-full" />

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Tactical Safety Lever Guard Switch */}
              <div className="flex flex-col items-center text-center p-2 bg-slate-900 rounded-lg border border-slate-800/80 w-full sm:w-28 relative">
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block mb-1">SAFETY SW.</span>
                
                <button
                  onClick={() => setSafetyGuardLifted(!safetyGuardLifted)}
                  className={`w-12 h-6 rounded-full border p-0.5 transition-colors duration-200 relative cursor-pointer ${
                    safetyGuardLifted 
                      ? 'bg-red-500/25 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' 
                      : 'bg-slate-950 border-slate-700'
                  }`}
                >
                  <div 
                    className={`w-4 h-4 rounded-full transition-transform duration-200 shadow-md ${
                      safetyGuardLifted 
                        ? 'translate-x-6 bg-red-500' 
                        : 'translate-x-0 bg-slate-400'
                    }`}
                  />
                </button>
                <span className={`text-[8px] font-mono font-bold mt-1.5 uppercase ${safetyGuardLifted ? 'text-red-400 animate-pulse' : 'text-slate-500'}`}>
                  {safetyGuardLifted ? '● LIFTED' : '● SECURED'}
                </span>
              </div>

              {/* Heavy Cabin Engine Ignition Lock Button */}
              <div className="flex-1 w-full">
                <button
                  id={`select-aircraft-confirm-${currentAircraft.id}`}
                  disabled={!safetyGuardLifted}
                  onClick={() => {
                    const scheme = LIVERIES[selectedLiveryIdx];
                    const customized: Aircraft = {
                      ...currentAircraft,
                      color: scheme.color || currentAircraft.color,
                      accentColor: scheme.accentColor || currentAircraft.accentColor,
                    };
                    onSelect(customized);
                  }}
                  className={`w-full py-4 text-center text-xs font-mono font-bold tracking-widest uppercase rounded-lg border-2 select-none transition-all duration-150 flex items-center justify-center gap-2 relative ${
                    safetyGuardLifted
                      ? 'bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white border-yellow-400 cursor-pointer shadow-[0_4px_15px_rgba(239,68,68,0.4)] hover:scale-[1.01] active:scale-[0.98]'
                      : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-60'
                  }`}
                >
                  {/* Warning Strip bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[repeating-linear-gradient(45deg,#b45309,#b45309_8px,#facc15_8px,#facc15_16px)] opacity-60" />
                  
                  <Zap className={`w-4 h-4 ${safetyGuardLifted ? 'animate-bounce text-yellow-300' : 'text-slate-650'}`} />
                  {safetyGuardLifted ? 'ARM SQUADRON & INITIALIZE ENG' : 'LIFT COCKPIT COVER TO CRITICAL ENGAGE'}
                </button>
              </div>
            </div>
            
            <p className="text-[8px] font-mono text-slate-500 text-center mt-2.5 uppercase tracking-wider italic">
              ⚠️ Warning: Confirm all primary flight vectors conform with local airfield specifications before engaging prop fuel pumps.
            </p>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full pt-4 border-t border-slate-800/40 text-center text-[10px] text-slate-500 font-mono">
        <p>COCKPIT MANAGEMENT SYSTEM v9.1 • ALL RECONNAISSANCE SENSORS SHIELDED ON CARRIER BASELINES</p>
      </footer>
    </div>
  );
}
