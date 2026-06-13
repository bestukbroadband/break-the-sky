import React from 'react';
import { Plane, Compass, CloudSnow, Wind, RefreshCw, Volume2, ShieldAlert, BookOpen } from 'lucide-react';
import { GameMode } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { APP_CONFIG } from '../config/appConfig';

interface HomeScreenProps {
  onStart: (selectedMode: GameMode) => void;
  onOpenLogbook: () => void;
}

export default function HomeScreen({ onStart, onOpenLogbook }: HomeScreenProps) {
  const [selectedMode, setSelectedMode] = React.useState<GameMode>('free_flight');
  const [isMuted, setIsMuted] = React.useState<boolean>(true);

  React.useEffect(() => {
    setIsMuted(audioEngine.getIsMuted());
    audioEngine.startHomeScreenEngine();

    return () => {
      audioEngine.stop();
    };
  }, []);

  const toggleAudio = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngine.setMute(nextMuted);
    if (!nextMuted) {
      audioEngine.startHomeScreenEngine();
    }
  };

  const modesList = [
    {
      id: 'free_flight' as GameMode,
      name: 'Free Flight',
      desc: 'Take off from the local airport, soar above the clouds, and land at your own leisure with no pressure.',
      icon: Compass,
      difficulty: 'Easy',
      color: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20',
    },
    {
      id: 'landing_challenge' as GameMode,
      name: 'Landing Challenge',
      desc: 'Start at 2,000 feet, pre-aligned to the runway, during complex wind shears. Score relies on touchdown quality and alignment.',
      icon: Plane,
      difficulty: 'Medium',
      color: 'border-amber-500/30 text-amber-400 bg-amber-950/20',
    },
    {
      id: 'coastal_tour' as GameMode,
      name: 'Coastal Tour',
      desc: 'Tour circular neon route waypoints floating along the serene, sunny ocean shoreline. Test your low-altitude control.',
      icon: RefreshCw,
      difficulty: 'Easy',
      color: 'border-sky-500/30 text-sky-400 bg-sky-950/20',
    },
    {
      id: 'mountain_run' as GameMode,
      name: 'Mountain Run',
      desc: 'Maneuver high-amplitude peaks, avoiding physical collisions with valleys. Steer precisely through floating checkpoints.',
      icon: ShieldAlert,
      difficulty: 'Hard',
      color: 'border-orange-500/30 text-orange-400 bg-orange-950/20',
    },
    {
      id: 'storm_flight' as GameMode,
      name: 'Storm Flight',
      desc: 'Extremely high wind gusts, heavy rain clouds, and low runway line-of-sight. Demands constant throttle adjustment.',
      icon: Wind,
      difficulty: 'Expert',
      color: 'border-red-500/30 text-red-400 bg-red-950/20',
    },
  ];

  return (
    <div 
      id="home-screen" 
      className="relative min-h-screen w-full flex flex-col justify-between text-slate-100 bg-linear-to-b from-slate-950 via-slate-900 to-indigo-950 overflow-y-auto px-4 py-8 sm:px-8"
      style={{ 
        WebkitOverflowScrolling: 'touch', 
        paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' 
      }}
    >
      {/* Visual background lights */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-sky-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Animated Home screen background silhouettes - Part 6 */}
      <div className="homeSky pointer-events-none select-none" style={{ pointerEvents: 'none' }}>
        {/* Jet Silhouette */}
        <div className="aircraftSilhouette silhouetteJet text-sky-450/40">
          <Plane className="w-16 h-16 rotate-90" />
        </div>
        {/* Bomber Silhouette (different rotation/size) */}
        <div className="aircraftSilhouette silhouetteBomber text-indigo-400/30">
          <Plane className="w-24 h-24 rotate-[135deg]" />
        </div>
        {/* Prop Silhouette (small scale) */}
        <div className="aircraftSilhouette silhouetteProp silhouetteSmall text-cyan-400/40">
          <Plane className="w-12 h-12 rotate-45" />
        </div>
        {/* Horizon Glow */}
        <div className="horizonGlow" />
        {/* Runway Lights */}
        <div className="runwayLights">
          <span className="runwayLight" />
          <span className="runwayLight" />
          <span className="runwayLight" />
          <span className="runwayLight" />
          <span className="runwayLight" />
          <span className="runwayLight" />
          <span className="runwayLight" />
          <span className="runwayLight" />
        </div>
      </div>

      {/* Parallax Cloud Drift and Jet Flyby Background Animations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none opacity-25">
        {/* Animated Flying Jet Silhouette */}
        <div className="absolute top-[28%] left-[-180px] animate-flyby">
          <div className="relative">
            <Plane className="w-14 h-14 text-sky-400/85 rotate-90" />
            {/* Supersonic condensation trails */}
            <div className="absolute right-12 top-6 w-32 h-[1px] bg-gradient-to-l from-transparent to-sky-400/40 rounded-full" />
            <div className="absolute right-12 top-8 w-24 h-[1px] bg-gradient-to-l from-transparent to-sky-300/25 rounded-full" />
          </div>
        </div>

        {/* Floating background clouds */}
        <div className="absolute top-[12%] left-[45%] w-36 h-12 bg-white/4 rounded-full blur-md animate-drift-slow" />
        <div className="absolute top-[38%] left-[15%] w-48 h-14 bg-white/3 rounded-full blur-lg animate-drift-fast" />
        <div className="absolute top-[70%] left-[80%] w-28 h-8 bg-white/2 rounded-full blur-sm animate-drift-slow" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <Plane className="w-8 h-8 text-sky-400 animate-pulse" />
          <div>
            <h1 className="text-xl font-bold tracking-widest text-white font-sans uppercase">{APP_CONFIG.name}</h1>
            <p className="text-xs text-slate-400 tracking-wider uppercase">{APP_CONFIG.technicalLabel}</p>
          </div>
        </div>
        <div className="mt-2 sm:mt-0 flex items-center gap-3">
          <button
            id="open-logbook-home-btn"
            onClick={onOpenLogbook}
            className="flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 rounded-full border border-sky-400/20 text-xs transition-all cursor-pointer font-bold font-mono"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" /> VIEW PILOT LOGBOOK
          </button>
          <button
            id="toggle-ambient-audio-btn"
            onClick={toggleAudio}
            className={`flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-mono font-bold transition-all cursor-pointer ${
              !isMuted 
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-400/30' 
                : 'bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-700/80 shadow-md'
            }`}
          >
            <Volume2 className={`w-3.5 h-3.5 ${!isMuted ? 'animate-bounce text-emerald-400' : 'text-slate-500'}`} />
            <span>{!isMuted ? 'AMBIENT AUDIO: ENGINE ON' : 'AMBIENT AUDIO: MUTED'}</span>
            
            {!isMuted && (
              <span className="flex items-center gap-0.5 ml-1 h-3">
                <span className="w-0.5 h-1.5 bg-emerald-400 animate-[pulse_0.4s_infinite_alternate]" />
                <span className="w-0.5 h-3 bg-emerald-400 animate-[pulse_0.6s_infinite_alternate_0.1s]" />
                <span className="w-0.5 h-2 bg-emerald-400 animate-[pulse_0.5s_infinite_alternate_0.2s]" />
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Hero & Config */}
      <main className="relative z-10 max-w-7xl mx-auto w-full my-auto flex flex-col lg:flex-row gap-8 items-center py-8">
        {/* Left Side: Game Intro */}
        <div className="w-full lg:w-1/2 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-mono">
            <span>SKYLINE FLIGHT ENGINE v1.0</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-none">
            Break the <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-sky-400 via-blue-400 to-indigo-400">
              Skyline
            </span>
          </h2>
          
          <p className="text-slate-300 text-base sm:text-lg max-w-lg leading-relaxed">
            {APP_CONFIG.description}
          </p>

          {/* Quick Stats list */}
          <div className="grid grid-cols-2 gap-4 max-w-md pt-2">
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-xs block font-mono">MAP SIZE</span>
              <span className="text-white font-bold font-sans">15km x 15km Stage</span>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-xs block font-mono">AIRCRAFT ROSTER</span>
              <span className="text-white font-bold font-sans">12 Unique Flight Models</span>
            </div>
          </div>

          {/* Keyboard Controls Summary panel */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2 max-w-lg">
            <h4 className="text-xs uppercase tracking-wider text-slate-300 font-bold border-b border-slate-800 pb-1.5 font-sans">
              ✈️ Flight Instruments & Keyboard controls
            </h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs font-mono text-slate-400">
              <div className="flex justify-between">
                <span>Pitch (Nose):</span>
                <span className="text-sky-300">↑ Up / ↓ Down</span>
              </div>
              <div className="flex justify-between">
                <span>Throttle:</span>
                <span className="text-sky-300">W (Up) / S (Down)</span>
              </div>
              <div className="flex justify-between">
                <span>Roll (Wings):</span>
                <span className="text-sky-300">← Left / → Right</span>
              </div>
              <div className="flex justify-between">
                <span>Gear Toggle:</span>
                <span className="text-sky-300">G Key</span>
              </div>
              <div className="flex justify-between">
                <span>Yaw (Rudder):</span>
                <span className="text-sky-300">A (Left) / D (Right)</span>
              </div>
              <div className="flex justify-between">
                <span>Wheel Brakes:</span>
                <span className="text-sky-300">Hold B</span>
              </div>
              <div className="flex justify-between">
                <span>Cameras:</span>
                <span className="text-sky-300">C Key</span>
              </div>
              <div className="flex justify-between">
                <span>Reset Simulation:</span>
                <span className="text-sky-300">R Key</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Mission/Mode Selector & Call to Action */}
        <div className="w-full lg:w-1/2 bg-slate-900/40 p-6 sm:p-8 rounded-2xl border border-slate-800 backdrop-blur-md">
          <h3 className="text-lg font-bold text-white mb-2 font-sans tracking-wide">SELECT YOUR MISSION</h3>
          <p className="text-xs text-slate-400 mb-6">Choose an air route challenge or free fly over the water lines.</p>

          <div className="space-y-3 mb-8">
            {modesList.map((mode) => {
              const IconComp = mode.icon;
              const isSelected = selectedMode === mode.id;
              return (
                <button
                  key={mode.id}
                  id={`mode-select-${mode.id}`}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`w-full flex items-start gap-4 p-4 rounded-xl text-left border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-950/40 border-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.25)] text-white'
                      : 'bg-slate-950/20 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className={`p-2.5 rounded-lg border ${isSelected ? 'border-sky-500/40 bg-sky-950/30' : 'border-slate-800 bg-slate-900/60'}`}>
                    <IconComp className={`w-5 h-5 ${isSelected ? 'text-sky-400 animate-pulse' : 'text-slate-400'}`} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm tracking-wide font-sans">{mode.name}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${mode.color}`}>
                        {mode.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-normal">{mode.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            id="start-aircraft-select-btn"
            onClick={() => onStart(selectedMode)}
            className="w-full py-4 text-center text-sm font-bold tracking-widest text-slate-950 uppercase rounded-xl bg-linear-to-r from-sky-400 via-blue-400 to-indigo-400 hover:from-sky-300 hover:to-indigo-300 cursor-pointer shadow-[0_4px_20px_rgba(56,189,248,0.3)] hover:shadow-[0_4px_30px_rgba(56,189,248,0.5)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all font-mono"
          >
            PROCEED TO AIRCRAFT SELECTION 🛫
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full pt-6 border-t border-slate-800/40 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between">
        <p>© 2026 {APP_CONFIG.name}. Completely procedurally calculated & lightweight.</p>
        <p className="mt-1 sm:mt-0 font-mono text-slate-600">Built using React 19 + Vite + Three.js</p>
      </footer>
    </div>
  );
}
