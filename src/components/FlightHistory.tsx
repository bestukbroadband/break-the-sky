import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Trash2, 
  Clock, 
  Compass, 
  Plane, 
  Award, 
  Calendar, 
  Gauge, 
  ArrowUp, 
  Info, 
  CheckCircle, 
  XCircle,
  TrendingDown,
  BarChart2,
  Trophy,
  Zap,
  Moon,
  ShieldCheck
} from 'lucide-react';
import { FlightRecord } from '../types';

interface FlightHistoryProps {
  onClose?: () => void;
  inline?: boolean;
}

export default function FlightHistory({ onClose, inline = false }: FlightHistoryProps) {
  const [history, setHistory] = useState<FlightRecord[]>([]);
  const [filterMode, setFilterMode] = useState<string>('all');
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'achievements'>('logs');

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('skyline:flight_history') || localStorage.getItem('skyforge:flight_history');
      if (stored) {
        const parsed = JSON.parse(stored) as FlightRecord[];
        // Sort by newest timestamp first
        setHistory(parsed.sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch (e) {
      console.error('Failed to parse flight history storage:', e);
    }
  }, []);

  // Clear all logs
  const handleClearAll = () => {
    try {
      localStorage.removeItem('skyline:flight_history');
      localStorage.removeItem('skyforge:flight_history');
      setHistory([]);
      setShowConfirmClear(false);
    } catch (e) {
      console.error('Failed to clear flight logs:', e);
    }
  };

  // Filter logic
  const filteredHistory = history.filter((item) => {
    if (filterMode === 'all') return true;
    if (filterMode === 'landed') return item.status === 'landed';
    if (filterMode === 'crashed') return item.status === 'crashed';
    return true;
  });

  // Calculate high-level summary metrics
  const totalFlights = history.length;
  const landedSuccessfully = history.filter(item => item.status === 'landed').length;
  const crashCount = history.filter(item => item.status === 'crashed').length;
  const successRate = totalFlights > 0 ? Math.round((landedSuccessfully / totalFlights) * 100) : 0;
  
  const totalDuration = history.reduce((sum, item) => sum + item.flightDuration, 0);
  const maxSpeed = history.reduce((max, item) => Math.max(max, item.topSpeed), 0);
  const maxAltitude = history.reduce((max, item) => Math.max(max, item.maxAltitude), 0);
  const topScore = history.reduce((max, item) => Math.max(max, item.score), 0);

  // Find most flown aircraft
  const aircraftCounts = history.reduce((acc, current) => {
    acc[current.aircraftName] = (acc[current.aircraftName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let favoriteAircraft = 'N/A';
  let maxAircraftCounts = 0;
  (Object.entries(aircraftCounts) as [string, number][]).forEach(([name, count]) => {
    if (count > maxAircraftCounts) {
      maxAircraftCounts = count;
      favoriteAircraft = name;
    }
  });

  // Format flight duration (e.g. 5m 24s or 32s)
  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins}m ${rem}s`;
  };

  // Convert timestamp to human date
  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Achievements list mapping with dynamic checking
  const achievements = [
    {
      id: 'climb_1000',
      title: 'Atmosphere Pioneer',
      description: 'Climbed to or exceeded an altitude of 1,000 feet in a single flight session.',
      target: '1,000 ft altitude',
      category: 'altitude',
      icon: <ArrowUp className="w-5 h-5" />,
      getStats: () => {
        const peakAlt = history.length > 0 ? Math.max(...history.map(r => r.maxAltitude)) : 0;
        const unlocked = peakAlt >= 1000;
        const match = history.slice().reverse().find(r => r.maxAltitude >= 1000);
        return {
          unlocked,
          progress: Math.min(100, Math.round((peakAlt / 1000) * 100)),
          current: `${peakAlt} ft`,
          unlockedAt: match ? match.timestamp : null
        };
      }
    },
    {
      id: 'night_landing',
      title: 'Midnight Owl',
      description: 'Successfully touched down and landed the aircraft during a Night flight session.',
      target: 'Landed at Night',
      category: 'landing',
      icon: <Moon className="w-5 h-5" />,
      getStats: () => {
        const match = history.slice().reverse().find(r => r.status === 'landed' && (r.weatherId === 'night' || r.weatherName.toLowerCase().includes('night')));
        const unlocked = !!match;
        return {
          unlocked,
          progress: unlocked ? 100 : 0,
          current: unlocked ? 'Complete' : 'Incomplete',
          unlockedAt: match ? match.timestamp : null
        };
      }
    },
    {
      id: 'cross_country',
      title: 'Cross-Country Aviator',
      description: 'Completed an intensive endurance flight of 90 seconds or longer in the cockpit.',
      target: '90s duration',
      category: 'duration',
      icon: <Plane className="w-5 h-5" />,
      getStats: () => {
        const peakDur = history.length > 0 ? Math.max(...history.map(r => r.flightDuration)) : 0;
        const unlocked = peakDur >= 90;
        const match = history.slice().reverse().find(r => r.flightDuration >= 90);
        return {
          unlocked,
          progress: Math.min(100, Math.round((peakDur / 90) * 100)),
          current: `${peakDur}s`,
          unlockedAt: match ? match.timestamp : null
        };
      }
    },
    {
      id: 'butter_landing',
      title: 'Butter Touchdown',
      description: 'Demonstrated exceptional pitch flare mechanics to land with a vertical touchdown rate slower than -180 ft/min.',
      target: '>-180 ft/min rate',
      category: 'landing',
      icon: <ShieldCheck className="w-5 h-5" />,
      getStats: () => {
        const match = history.slice().reverse().find(r => r.status === 'landed' && r.landingRate > -180);
        const unlocked = !!match;
        const landedF = history.filter(r => r.status === 'landed');
        const bestRate = landedF.length > 0 ? Math.max(...landedF.map(r => r.landingRate)) : -999;
        return {
          unlocked,
          progress: unlocked ? 100 : 0,
          current: bestRate > -999 ? `${bestRate} fpm` : 'No Landings',
          unlockedAt: match ? match.timestamp : null
        };
      }
    },
    {
      id: 'storm_rider',
      title: 'Storm Rider',
      description: 'Successfully landed an aircraft during harsh, low-visibility Stormy Rain conditions.',
      target: 'Landed in Storm',
      category: 'special',
      icon: <Zap className="w-5 h-5" />,
      getStats: () => {
        const match = history.slice().reverse().find(r => r.status === 'landed' && (r.weatherId === 'rain' || r.weatherName.toLowerCase().includes('storm') || r.weatherName.toLowerCase().includes('rain')));
        const unlocked = !!match;
        return {
          unlocked,
          progress: unlocked ? 100 : 0,
          current: unlocked ? 'Complete' : 'Incomplete',
          unlockedAt: match ? match.timestamp : null
        };
      }
    },
    {
      id: 'sonic_velocity',
      title: 'Speed Demon',
      description: 'Throttled engines past extreme air resistance boundaries to reach a top speed over 220 knots.',
      target: '220 knots speed',
      category: 'speed',
      icon: <Gauge className="w-5 h-5" />,
      getStats: () => {
        const peakSpeed = history.length > 0 ? Math.max(...history.map(r => r.topSpeed)) : 0;
        const unlocked = peakSpeed >= 220;
        const match = history.slice().reverse().find(r => r.topSpeed >= 220);
        return {
          unlocked,
          progress: Math.min(100, Math.round((peakSpeed / 220) * 100)),
          current: `${peakSpeed} kts`,
          unlockedAt: match ? match.timestamp : null
        };
      }
    }
  ];

  const unlockedCount = achievements.filter(ach => ach.getStats().unlocked).length;

  return (
    <div 
      id="flight-history-panel" 
      className={`${
        inline 
          ? 'w-full bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 sm:p-7' 
          : 'max-w-4xl w-full bg-slate-950/95 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative'
      } text-slate-100 flex flex-col space-y-6 max-h-[85vh] overflow-y-auto`}
    >
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 rounded-xl border border-sky-500/20 text-sky-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black font-sans tracking-wider text-white uppercase">BREAK THE SKYLINE PILOT LOGBOOK</h3>
            <p className="text-xs text-slate-400 font-mono">Telemetry database persistent logs (LocalStorage)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {totalFlights > 0 && !showConfirmClear && (
            <button
              id="clear-logs-trigger"
              onClick={() => setShowConfirmClear(true)}
              className="py-1.5 px-3 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/15 cursor-pointer text-[11px] font-bold font-mono transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> CLEAR LOGBOOK
            </button>
          )}

          {showConfirmClear && (
            <div className="flex items-center gap-2 bg-red-950/40 p-1 border border-red-900/40 rounded-lg animate-pulse">
              <span className="text-[10px] text-red-300 font-bold font-mono px-2 uppercase">Wipe all logs?</span>
              <button
                id="confirm-clear-yes"
                onClick={handleClearAll}
                className="py-1 px-2.5 bg-red-500 hover:bg-red-400 text-slate-950 rounded text-[9px] font-extrabold cursor-pointer transition-all uppercase"
              >
                Yes, Wipe
              </button>
              <button
                id="confirm-clear-no"
                onClick={() => setShowConfirmClear(false)}
                className="py-1 px-2 text-slate-400 hover:text-white rounded text-[9px] font-bold cursor-pointer transition-all"
              >
                Cancel
              </button>
            </div>
          )}

          {onClose && (
            <button
              id="close-logbook"
              onClick={onClose}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-all"
            >
              CLOSE
            </button>
          )}
        </div>
      </div>

      {totalFlights === 0 ? (
        <div className="text-center py-10 space-y-3 bg-slate-900/30 border border-slate-900/60 rounded-xl">
          <Plane className="w-10 h-10 text-slate-600 mx-auto animate-bounce" />
          <h4 className="text-sm font-bold text-slate-400 font-sans">NO LOGGED FLIGHTS DETECTED</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-mono">
            Logbook tracks touchdown vertical rate, peak airspeed, altitude limits, and completion states once your flight session concludes or crashes!
          </p>
        </div>
      ) : (
        <>
          {/* Summary dashboard section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 sm:p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Compass className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold tracking-wider font-sans uppercase">TOTAL MISSIONS</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-white">{totalFlights}</p>
              <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-400 inline" /> {successRate}% touchdown success
              </span>
            </div>

            <div className="p-3 sm:p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold tracking-wider font-sans uppercase">CUMULATIVE FLIGHTS</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-sky-400">{formatDuration(totalDuration)}</p>
              <span className="text-[9px] font-mono text-slate-400 block">Active airborne logging</span>
            </div>

            <div className="p-3 sm:p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Gauge className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold tracking-wider font-sans uppercase">MAX RECORDED SPEED</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-amber-400">{maxSpeed} <span className="text-xs font-normal">kts</span></p>
              <span className="text-[9px] font-mono text-slate-400 block">Peak kinetic thrust level</span>
            </div>

            <div className="p-3 sm:p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Award className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold tracking-wider font-sans uppercase">HIGHEST SCORE</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-yellow-400">{topScore} <span className="text-xs font-normal">pts</span></p>
              <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                Fav: <span className="text-slate-300 font-bold truncate max-w-[80px]">{favoriteAircraft}</span>
              </span>
            </div>
          </div>

          {/* Tab Selector Section */}
          <div className="flex border-b border-slate-900 pb-1 gap-2">
            <button
              id="logbook-tab-logs"
              onClick={() => setActiveTab('logs')}
              className={`py-2 px-3 text-xs font-bold font-mono tracking-wider transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
                activeTab === 'logs'
                  ? 'border-sky-400 text-sky-400 font-extrabold pb-2.5'
                  : 'border-transparent text-slate-500 hover:text-slate-350 pb-2.5'
              }`}
            >
              <BookOpen className="w-4 h-4" /> FLIGHT LOG ENTRIES
            </button>
            <button
              id="logbook-tab-achievements"
              onClick={() => setActiveTab('achievements')}
              className={`py-2 px-3 text-xs font-bold font-mono tracking-wider transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
                activeTab === 'achievements'
                  ? 'border-yellow-500 text-yellow-500 font-extrabold pb-2.5'
                  : 'border-transparent text-slate-500 hover:text-slate-300 pb-2.5'
              }`}
            >
              <Trophy className="w-4 h-4" /> PILOT ACHIEVEMENTS ({unlockedCount} / {achievements.length})
            </button>
          </div>

          {activeTab === 'logs' ? (
            /* Filtering & Listing */
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-xs text-slate-400 font-mono font-bold uppercase">HISTORICAL SESSION ENTRIES ({filteredHistory.length})</span>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-850">
                  {['all', 'landed', 'crashed'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setFilterMode(m)}
                      className={`py-1 px-2.5 rounded text-[10px] font-bold font-mono uppercase cursor-pointer transition-all ${
                        filterMode === m 
                          ? 'bg-slate-800 text-white' 
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live session log items scroll */}
              <div className="divide-y divide-slate-800 border-t border-slate-800">
                {filteredHistory.map((session) => (
                  <div 
                    key={session.id}
                    className="py-4 hover:bg-slate-900/10 transition-all flex flex-col md:flex-row justify-between gap-4"
                  >
                    {/* Left Column: Aircraft & Weather Brief */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                          session.status === 'landed' ? 'bg-emerald-500' : 'bg-red-500'
                        }`} />
                        <span className="font-extrabold text-sm tracking-wide text-white font-sans">{session.aircraftName}</span>
                        <span className="text-[9px] font-mono text-slate-500 bg-slate-900/80 border border-slate-800 rounded px-1.5 uppercase">
                          {session.mode.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-x-4 gap-y-1 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" /> {formatDate(session.timestamp)}
                        </span>
                        <span>•</span>
                        <span className="text-slate-300">{session.weatherName} Weather</span>
                      </div>

                      {/* Brief result narrative */}
                      <p className={`text-[11px] leading-relaxed font-mono ${
                        session.status === 'landed' ? 'text-emerald-400/90' : 'text-red-400/90'
                      }`}>
                        {session.summary}
                      </p>
                    </div>

                    {/* Right Column: Performance Stats */}
                    <div className="grid grid-cols-4 sm:flex sm:items-center sm:gap-6 font-mono text-xs max-w-md w-full md:w-auto justify-between border-t border-slate-850/40 md:border-t-0 pt-2.5 md:pt-0">
                      {/* Top Speed */}
                      <div className="text-center sm:text-right">
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">TOP SPEED</span>
                        <span className="font-bold text-white block">{session.topSpeed} kts</span>
                      </div>

                      {/* Flight Time */}
                      <div className="text-center sm:text-right">
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">FLIGHT TIME</span>
                        <span className="text-slate-300 block">{formatDuration(session.flightDuration)}</span>
                      </div>

                      {/* Peak Altitude */}
                      <div className="text-center sm:text-right">
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">ALT LIMIT</span>
                        <span className="text-slate-300 block">{session.maxAltitude} ft</span>
                      </div>

                      {/* Touchdown quality / Descent */}
                      <div className="text-center sm:text-right min-w-[70px]">
                        {session.status === 'landed' ? (
                          <>
                            <span className="text-[9px] text-emerald-500/80 font-bold uppercase block">TD RATE</span>
                            <span className="font-bold text-emerald-400 font-mono block">
                              {session.landingRate} <span className="text-[8px]">fpm</span>
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[9px] text-red-500/80 font-bold uppercase block">TD RATE</span>
                            <span className="font-bold text-red-400 font-mono block">CRASH</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Achievements Grid View */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-xs text-slate-400 font-mono font-bold uppercase font-sans">PILOT LICENSE MILESTONES ({unlockedCount} / {achievements.length} SECURED)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {achievements.map((ach) => {
                  const stats = ach.getStats();
                  return (
                    <div 
                      key={ach.id}
                      id={`achievement-card-${ach.id}`}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        stats.unlocked
                          ? 'bg-yellow-950/15 border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.08)]'
                          : 'bg-slate-900/40 border-slate-850/80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon Container */}
                        <div className={`p-2.5 rounded-lg border-2 ${
                          stats.unlocked
                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
                            : 'bg-slate-950 border-slate-800 text-slate-650'
                        }`}>
                          {ach.icon}
                        </div>

                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className={`text-sm font-extrabold tracking-wide font-sans ${
                              stats.unlocked ? 'text-yellow-400' : 'text-slate-300'
                            }`}>
                              {ach.title}
                            </h4>
                            {stats.unlocked ? (
                              <span className="text-[9px] font-mono font-black text-yellow-500 bg-yellow-500/15 border border-yellow-500/20 rounded px-1.5 py-0.5 tracking-wide uppercase flex items-center gap-1 shrink-0">
                                <Trophy className="w-2.5 h-2.5" /> SECURED
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-slate-500 bg-slate-950 border border-slate-850 rounded px-1.5 py-0.5 uppercase shrink-0">
                                LOCKED
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{ach.description}</p>
                        </div>
                      </div>

                      {/* Progress details */}
                      <div className="mt-4 pt-3 border-t border-slate-800/60 text-xs font-mono">
                        <div className="flex justify-between items-center text-[10px] text-slate-405 mb-1">
                          <span>Target: {ach.target}</span>
                          <span className={stats.unlocked ? 'text-yellow-400 font-bold' : 'text-slate-500'}>
                            {stats.current}
                          </span>
                        </div>
                        
                        {/* Progress meter */}
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              stats.unlocked 
                                ? 'bg-gradient-to-r from-yellow-500 to-amber-500' 
                                : 'bg-slate-700'
                            }`}
                            style={{ width: `${stats.progress}%` }}
                          />
                        </div>

                        {/* Decoded unlock stamp */}
                        {stats.unlocked && stats.unlockedAt && (
                          <div className="text-[9px] text-slate-500 mt-2 text-right">
                            Unlocked: {formatDate(stats.unlockedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick local persistence alert */}
      <div className="border border-slate-800/80 bg-slate-900/30 p-3 rounded-xl flex items-start gap-2.5 text-[10px] text-slate-500 font-mono leading-relaxed">
        <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />
        <p>
          Your statistics and certificates are safely recorded locally inside your browser's persistent storage state. Deleting history is irreversible and clears your active certificate cache immediately.
        </p>
      </div>

    </div>
  );
}
