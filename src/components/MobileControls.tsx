import React, { useState, useEffect, useRef } from 'react';
import { Camera, Pause, Volume2, VolumeX, Shuffle, RotateCcw } from 'lucide-react';
import { Aircraft } from '../types';

interface MobileControlsProps {
  aircraft: Aircraft;
  keysRef: React.MutableRefObject<{
    pitchUp: boolean;
    pitchDown: boolean;
    rollLeft: boolean;
    rollRight: boolean;
    yawLeft: boolean;
    yawRight: boolean;
    throttleUp: boolean;
    throttleDown: boolean;
    brakes: boolean;
    landingGear: boolean;
    pitch?: number;
    roll?: number;
    yaw?: number;
    throttleOverride?: number;
  }>;
  currentThrottle: number;
  onCameraToggle: () => void;
  onPauseToggle: () => void;
  onResetToggle: () => void;
  isMuted: boolean;
  onMuteToggle: () => void;
}

export default function MobileControls({
  aircraft,
  keysRef,
  currentThrottle,
  onCameraToggle,
  onPauseToggle,
  onResetToggle,
  isMuted,
  onMuteToggle,
}: MobileControlsProps) {
  // Joystick Touch Tracking
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isDraggingJoystick, setIsDraggingJoystick] = useState(false);
  const joystickContainerRef = useRef<HTMLDivElement>(null);
  const activeTouchId = useRef<number | null>(null);

  // Throttle values (0 to 100)
  const [localThrottle, setLocalThrottle] = useState(currentThrottle);
  const throttleTrackRef = useRef<HTMLDivElement>(null);

  // Sync initial dynamic values
  useEffect(() => {
    setLocalThrottle(Math.round(currentThrottle));
  }, [currentThrottle]);

  // Clean values on unmount
  useEffect(() => {
    return () => {
      if (keysRef.current) {
        keysRef.current.pitch = 0;
        keysRef.current.roll = 0;
        keysRef.current.yaw = 0;
        delete keysRef.current.throttleOverride;
      }
    };
  }, [keysRef]);

  // --- JOYSTICK LOGIC ---
  const handleJoystickStart = (clientX: number, clientY: number, identifier: number | null) => {
    if (!joystickContainerRef.current) return;
    setIsDraggingJoystick(true);
    activeTouchId.current = identifier;
    handleJoystickMove(clientX, clientY);
  };

  const handleJoystickMove = (clientX: number, clientY: number) => {
    if (!joystickContainerRef.current) return;
    const rect = joystickContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = rect.width / 2; // e.g. 64px radius

    const distance = Math.sqrt(dx * dx + dy * dy);
    let targetX = dx;
    let targetY = dy;

    if (distance > maxRadius) {
      targetX = (dx / distance) * maxRadius;
      targetY = (dy / distance) * maxRadius;
    }

    setJoystickPos({ x: targetX, y: targetY });

    // Normalized analog values between -1 and 1
    let normX = targetX / maxRadius;
    let normY = targetY / maxRadius;

    // Apply soft deadzone near center
    const DEADZONE = 0.08;
    if (Math.abs(normX) < DEADZONE) normX = 0;
    if (Math.abs(normY) < DEADZONE) normY = 0;

    // Map:
    // Drag left (normX < 0) => Roll Left (positive roll command)
    // Drag right (normX > 0) => Roll Right (negative roll command)
    // Drag up (normY < 0) => Pitch Down (negative pitch command)
    // Drag down (normY > 0) => Pitch Up (positive pitch command)
    keysRef.current.roll = -normX;
    keysRef.current.pitch = -normY;
  };

  const handleJoystickEnd = () => {
    setIsDraggingJoystick(false);
    activeTouchId.current = null;
    setJoystickPos({ x: 0, y: 0 });
    keysRef.current.roll = 0;
    keysRef.current.pitch = 0;
  };

  // Touch handlers for Joystick
  const onJoystickTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    handleJoystickStart(touch.clientX, touch.clientY, touch.identifier);
  };

  const onJoystickTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingJoystick) return;
    e.preventDefault();
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === activeTouchId.current) {
        handleJoystickMove(e.touches[i].clientX, e.touches[i].clientY);
        break;
      }
    }
  };

  // Mouse fallback handlers for testability
  const onJoystickMouseDown = (e: React.MouseEvent) => {
    handleJoystickStart(e.clientX, e.clientY, null);
    const onMouseMove = (moveEvent: MouseEvent) => {
      handleJoystickMove(moveEvent.clientX, moveEvent.clientY);
    };
    const onMouseUp = () => {
      handleJoystickEnd();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // --- THROTTLE SLIDER LOGIC ---
  const handleThrottleStartOrMove = (clientY: number) => {
    if (!throttleTrackRef.current) return;
    const rect = throttleTrackRef.current.getBoundingClientRect();
    // Invert so bottom of container is 0, top of container is 100
    const relativeY = rect.bottom - clientY;
    const fillPercent = Math.max(0, Math.min(100, (relativeY / rect.height) * 100));

    setLocalThrottle(Math.round(fillPercent));
    keysRef.current.throttleOverride = fillPercent;
  };

  const onThrottleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleThrottleStartOrMove(touch.clientY);
  };

  const onThrottleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleThrottleStartOrMove(touch.clientY);
  };

  const onThrottleMouseDown = (e: React.MouseEvent) => {
    handleThrottleStartOrMove(e.clientY);
    const onMouseMove = (moveEvent: MouseEvent) => {
      handleThrottleStartOrMove(moveEvent.clientY);
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // --- BRAKES & YAW CONTROLS (Continuous press) ---
  const setKeyVal = (key: 'brakes' | 'yawLeft' | 'yawRight', pressed: boolean) => {
    if (keysRef.current) {
      keysRef.current[key] = pressed;
    }
  };

  const [activeYaw, setActiveYaw] = useState<'L' | 'R' | null>(null);
  const [brakesActive, setBrakesActive] = useState(false);

  return (
    <div 
      className="absolute inset-0 pointer-events-none select-none z-[20] flex flex-col justify-between p-4 sm:p-6 sm:hidden lg:hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top, 16px)',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'env(safe-area-inset-left, 16px)',
        paddingRight: 'env(safe-area-inset-right, 16px)',
      }}
    >
      {/* 1. TOP UTILE ACTIONS (CAM, GEAR, RESET, PAUSE, MUTE) */}
      <div className="w-full flex justify-between items-center z-[21]">
        {/* Left corner mini cluster */}
        <div className="flex gap-2 pointer-events-auto">
          {aircraft.hasLandingGear && aircraft.id !== 'seaplane' && (
            <button
              onClick={() => {
                if (keysRef.current) {
                  keysRef.current.landingGear = !keysRef.current.landingGear;
                }
              }}
              className={`h-11 px-3.5 rounded-xl border font-bold text-[10px] tracking-wider transition-all font-mono shadow-md ${
                keysRef.current?.landingGear
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400'
              }`}
            >
              GEAR
            </button>
          )}

          <button
            onClick={() => {
              if (keysRef.current) {
                setKeyVal('brakes', true);
                setBrakesActive(true);
                setTimeout(() => {
                  setKeyVal('brakes', false);
                  setBrakesActive(false);
                }, 1500); // safety reset auto-brake release
              }
            }}
            onTouchStart={() => {
              setKeyVal('brakes', true);
              setBrakesActive(true);
            }}
            onTouchEnd={() => {
              setKeyVal('brakes', false);
              setBrakesActive(false);
            }}
            onMouseDown={() => {
              setKeyVal('brakes', true);
              setBrakesActive(true);
            }}
            onMouseUp={() => {
              setKeyVal('brakes', false);
              setBrakesActive(false);
            }}
            className={`h-11 px-3.5 rounded-xl border font-bold text-[10px] tracking-wider transition-all font-mono shadow-md ${
              brakesActive
                ? 'bg-red-500/25 border-red-500/40 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                : 'bg-slate-900/80 border-slate-800 text-slate-400'
            }`}
          >
            BRAKE
          </button>
        </div>

        {/* Right corner operational cluster */}
        <div className="flex gap-1.5 pointer-events-auto bg-slate-950/80 border border-slate-900 p-1.5 rounded-2xl shadow-xl backdrop-blur-md">
          <button
            onClick={onCameraToggle}
            className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-850 text-slate-300 hover:text-white flex items-center justify-center border border-slate-800 transition-all"
            title="Cycle Camera View"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            onClick={onMuteToggle}
            className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-850 text-slate-300 hover:text-white flex items-center justify-center border border-slate-800 transition-all"
            title="Toggle Audio"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          </button>

          <button
            onClick={onResetToggle}
            className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-850 text-slate-300 hover:text-white flex items-center justify-center border border-slate-800 transition-all"
            title="Restart Flight"
          >
            <RotateCcw className="w-4 h-4 text-amber-500" />
          </button>

          <button
            onClick={onPauseToggle}
            className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-850 text-slate-300 hover:text-white flex items-center justify-center border border-slate-800 transition-all"
            title="Pause Flight"
          >
            <Pause className="w-4 h-4 text-slate-200" />
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC BOTTOM OPERATIONAL PANELS */}
      <div className="w-full flex justify-between items-end z-[21] relative select-none">
        
        {/* LEFT COMPONENT: ANALOG JOYSTICK PANEL */}
        <div className="flex flex-col items-center space-y-2 pointer-events-auto">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">PITCH & ROLL</span>
          
          <div 
            ref={joystickContainerRef}
            className={`relative w-28 h-28 rounded-full border-2 bg-slate-950/75 backdrop-blur-sm shadow-2xl flex items-center justify-center transition-all ${
              isDraggingJoystick 
                ? 'border-sky-450 shadow-[0_0_15px_rgba(56,189,248,0.22)] scale-[1.03]' 
                : 'border-slate-800'
            }`}
            onTouchStart={onJoystickTouchStart}
            onTouchMove={onJoystickTouchMove}
            onTouchEnd={handleJoystickEnd}
            onMouseDown={onJoystickMouseDown}
            style={{ touchAction: 'none' }}
          >
            {/* Center Deadzone Crosshairs */}
            <div className="absolute w-4 h-[1px] bg-slate-800" />
            <div className="absolute h-4 w-[1px] bg-slate-800" />

            {/* Glowing stick knob indicator */}
            <div 
              className="absolute w-11 h-11 rounded-full bg-linear-to-b from-sky-400 to-sky-600 border border-white/20 flex items-center justify-center shadow-xl cursor-grab active:cursor-grabbing transition-transform duration-75 select-none"
              style={{
                transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                boxShadow: isDraggingJoystick ? '0 0 15px rgba(56,189,248,0.6)' : '0 4px 8px rgba(0,0,0,0.4)',
              }}
            >
              {/* Inner dot */}
              <div className="w-3.5 h-3.5 rounded-full bg-slate-100 opacity-60" />
            </div>
          </div>
        </div>

        {/* MID-BOTTOM: RUDDER CONTROLS (YAW RUDDERS) */}
        <div className="flex items-center gap-1.5 pointer-events-auto pb-1">
          <button
            onTouchStart={() => {
              setKeyVal('yawLeft', true);
              setActiveYaw('L');
            }}
            onTouchEnd={() => {
              setKeyVal('yawLeft', false);
              setActiveYaw(null);
            }}
            onMouseDown={() => {
              setKeyVal('yawLeft', true);
              setActiveYaw('L');
            }}
            onMouseUp={() => {
              setKeyVal('yawLeft', false);
              setActiveYaw(null);
            }}
            className={`h-11 px-3.5 rounded-xl border font-bold text-[10px] tracking-wider transition-all font-mono shadow-md ${
              activeYaw === 'L'
                ? 'bg-sky-500/25 border-sky-400/40 text-sky-300'
                : 'bg-slate-900/85 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            YAW L
          </button>
          
          <button
            onTouchStart={() => {
              setKeyVal('yawRight', true);
              setActiveYaw('R');
            }}
            onTouchEnd={() => {
              setKeyVal('yawRight', false);
              setActiveYaw(null);
            }}
            onMouseDown={() => {
              setKeyVal('yawRight', true);
              setActiveYaw('R');
            }}
            onMouseUp={() => {
              setKeyVal('yawRight', false);
              setActiveYaw(null);
            }}
            className={`h-11 px-3.5 rounded-xl border font-bold text-[10px] tracking-wider transition-all font-mono shadow-md ${
              activeYaw === 'R'
                ? 'bg-sky-500/25 border-sky-400/40 text-sky-300'
                : 'bg-slate-900/85 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            YAW R
          </button>
        </div>

        {/* RIGHT COMPONENT: INTEGRATED THROTTLE SYSTEM */}
        {aircraft.hasEngine && (
          <div className="flex flex-col items-center space-y-2 pointer-events-auto">
            <span className="text-[8px] font-bold text-amber-500 uppercase tracking-widest font-mono">
              THR: {localThrottle}%
            </span>
            
            <div 
              ref={throttleTrackRef}
              className="relative w-12 h-32 rounded-xl bg-slate-950/80 border border-slate-800 p-1 flex items-end justify-center cursor-pointer shadow-2xl select-none"
              onTouchStart={onThrottleTouchStart}
              onTouchMove={onThrottleTouchMove}
              onMouseDown={onThrottleMouseDown}
              style={{ touchAction: 'none' }}
            >
              {/* Colored power filling bar */}
              <div 
                className="absolute bottom-1 left-1 right-1 rounded-lg bg-linear-to-t from-orange-600 via-amber-500 to-amber-400 transition-all duration-75"
                style={{ height: `calc(${localThrottle}% - 8px)` }}
              />

              {/* Slider thumb handle indicator */}
              <div 
                className="absolute left-0 right-0 h-6 bg-slate-100 border-t border-b border-slate-350 rounded shadow-md z-10 flex items-center justify-center text-[7px] text-slate-700 font-extrabold select-none"
                style={{ 
                  bottom: `calc(${localThrottle}% - 12px)`,
                  transition: 'bottom 75ms linear'
                }}
              >
                |||
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
