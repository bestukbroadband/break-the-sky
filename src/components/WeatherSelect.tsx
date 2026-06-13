import React from 'react';
import { ArrowLeft, Clock, EyeOff, Wind, ShieldAlert, Zap, CloudOff } from 'lucide-react';
import { WeatherOption, WeatherType } from '../types';
import { WEATHER_OPTIONS } from '../data/weatherData';

interface WeatherSelectProps {
  onBack: () => void;
  onSelect: (option: WeatherOption) => void;
}

export default function WeatherSelect({ onBack, onSelect }: WeatherSelectProps) {
  const [selectedId, setSelectedId] = React.useState<WeatherType>('morning');

  const selectedWeather = WEATHER_OPTIONS.find((opt) => opt.id === selectedId) || WEATHER_OPTIONS[0];

  return (
    <div id="weather-select-screen" className="relative min-h-screen w-full flex flex-col justify-between text-slate-100 bg-linear-to-b from-slate-950 via-slate-900 to-indigo-950 overflow-y-auto px-4 py-8 sm:px-8">
      {/* Background radial spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full flex items-center justify-between border-b border-slate-800/80 pb-4">
        <button
          id="back-to-aircraft-btn"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> BACK TO AIRCRAFT
        </button>
        <div className="text-right">
          <h1 className="text-lg font-bold tracking-widest text-white font-stencil">CONFIGURE LIGHTING & WEATHER</h1>
          <p className="text-xs text-sky-400 font-mono">STEP 3 OF 3 • ATMOSPHERIC METEOROLOGY</p>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-7xl mx-auto w-full my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 py-8 items-stretch">
        
        {/* Left list */}
        <section className="col-span-1 lg:col-span-6 space-y-4">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="text-md uppercase font-bold tracking-wider text-slate-400 font-sans">
              METEOROLOGICAL STATIONS
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WEATHER_OPTIONS.map((opt) => {
              const isSelected = selectedId === opt.id;
              return (
                <button
                  key={opt.id}
                  id={`weather-card-${opt.id}`}
                  onClick={() => setSelectedId(opt.id)}
                  className={`p-4 rounded-xl text-left border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-950/40 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)] text-white'
                      : 'bg-slate-950/20 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-mono text-slate-400 tracking-wider">
                      {opt.timeOfDay}
                    </span>
                    {opt.hasRain && (
                      <span className="p-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                        <Zap className="w-3 h-3 animate-bounce" />
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm sm:text-base font-sans tracking-wide">
                    {opt.name}
                  </h3>
                  
                  <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {opt.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right Detail */}
        <section className="col-span-1 lg:col-span-6 flex flex-col justify-between p-6 bg-slate-900/50 rounded-2xl border border-slate-800/80 backdrop-blur-md">
          <div className="space-y-6">
            <div className="space-y-2 border-b border-slate-800 pb-4">
              <span className="text-xs font-mono text-sky-400 uppercase tracking-widest">METEOROLOGICAL REPORT</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight font-sans">
                {selectedWeather.name}
              </h2>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Clocks */}
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 font-mono text-[10px] uppercase flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Local Time
                </span>
                <span className="text-white font-bold font-sans text-sm block">
                  {selectedWeather.timeOfDay}
                </span>
              </div>

              {/* Fog Density percentage mapping */}
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 font-mono text-[10px] uppercase flex items-center gap-1">
                  <EyeOff className="w-3.5 h-3.5" /> Fog Level
                </span>
                <span className="text-white font-bold font-sans text-sm block">
                  {Math.round(selectedWeather.fogDensity * 10000)}% density
                </span>
              </div>

              {/* Wind scale */}
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 font-mono text-[10px] uppercase flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5" /> Wind speed
                </span>
                <span className="text-white font-bold font-sans text-sm block">
                  {selectedWeather.windSpeed} knots
                </span>
              </div>

            </div>

            {/* Weather briefing warning card */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-3">
              <h4 className="text-xs uppercase tracking-wider text-slate-300 font-bold border-b border-slate-800 pb-1 font-sans">
                💡 FLIGHT CREW ADVISORY
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedWeather.id === 'rain' && '🚨 Visibility heavily restricted! Rain drops and wet surface reduce tire brake friction. Safe landing gear alignment is critical.'}
                {selectedWeather.id === 'fog' && '🚨 Near-zero runway line-of-sight! Do not trust external visuals - guide your flight pitch, roll, and angle of descent purely on your cockpit artificial horizon instrument.'}
                {selectedWeather.id === 'sunset' && '🌅 Beautiful golden rays cast beautiful glancings. Keep a close eye on your airspeed indicator during shadow transitions.'}
                {selectedWeather.id === 'night' && '🌙 Ground and sky blend into darkness. Runway flash beacons will illuminate your final descent line.'}
                {selectedWeather.id === 'afternoon' && '🌥️ Perfect high flight test condition. Some drift vectors around mountains.'}
                {selectedWeather.id === 'morning' && '☀️ Ideal wind vectors. Crystal blue clear light maximizes touchdown survival rates for novice fliers.'}
                {selectedWeather.id === 'snow' && '❄️ BLIZZARD WARNING: Low air temperatures and rapid whiteout hazard! Ice on the wings degrades aerodynamic profiles, necessitating constant throttle power offsets.'}
                {selectedWeather.id === 'aurora' && '🌌 ATMOSPHERIC MAGNETIC FLUX: Ethereal solar storms create vibrant neon light arrays. Beware of high velocity vertical cross-currents.'}
              </p>
            </div>
          </div>

          <div className="mt-8 cabin-well !p-1.5 focus-within:ring-2 focus-within:ring-cyan-500/50">
            <button
              id={`confirm-weather-${selectedWeather.id}`}
              onClick={() => onSelect(selectedWeather)}
              className="w-full py-4 px-4 cabin-btn-base cabin-btn-cyan cursor-pointer text-sm flex items-center justify-center gap-2 shadow-2xl"
            >
              <Zap className="w-4 h-4 text-cyan-400 fill-cyan-405 animate-pulse" />
              <span>IGNITE INSTRUMENTS & BOARD FLIGHT</span>
              <span className="w-2.5 h-2.5 rounded-full cabin-led-green animate-[ping_1.5s_infinite]" />
            </button>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full pt-6 border-t border-slate-800/40 text-center text-xs text-slate-500">
        <p>Three.js procedural atmosphere, haze scattering, and ambient lights adapt directly on startup.</p>
      </footer>
    </div>
  );
}
