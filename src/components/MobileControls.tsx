import React, { useState, useEffect, useRef } from 'react';
import { Camera, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';
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
    pitch: number;
    roll: number;
    yaw: number;
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
  // Joystick Coordinates Tracker
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isDraggingJoystick, setIsDraggingJoystick] = useState(false);
  const joystickContainerRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);

  // Dynamic Throttle (scaled 0-100)
  const [localThrottle, setLocalThrottle] = useState(currentThrottle);
  const throttleTrackRef = useRef<HTMLDivElement>(null);

  // continuous buttons local feedback states
  const [activeYaw, setActiveYaw] = useState<'L' | 'R' | null>(null);
  const [brakesActive, setBrakesActive] = useState(false);

  // Toggle for debug HUD
  const [showDebug, setShowDebug] = useState(true);

  // Sync throttle value from physics on startup or change
  useEffect(() => {
    setLocalThrottle(Math.round(currentThrottle));
  }, [currentThrottle]);

  // Clean values on unmount to make sure controls don't stick on game reset or screen leave
  useEffect(() => {
    return () => {
      if (keysRef.current) {
        keysRef.current.pitch = 0;
        keysRef.current.roll = 0;
        keysRef.current.yaw = 0;
        keysRef.current.yawLeft = false;
        keysRef.current.yawRight = false;
        keysRef.current.brakes = false;
        delete keysRef.current.throttleOverride;
      }
    };
  }, [keysRef]);

  // --- JOYSTICK GESTURE INTERACTION ---
  const handleJoystickStart = (clientX: number, clientY: number, pointerId: number) => {
    setIsDraggingJoystick(true);
    activePointerId.current = pointerId;
    handleJoystickMove(clientX, clientY);
  };

  const handleJoystickMove = (clientX: number, clientY: number) => {
    if (!joystickContainerRef.current) return;
    const rect = joystickContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = rect.width / 2;

    const distance = Math.sqrt(dx * dx + dy * dy);
    let targetX = dx;
    let targetY = dy;

    if (distance > maxRadius) {
      targetX = (dx / distance) * maxRadius;
      targetY = (dy / distance) * maxRadius;
    }

    setJoystickPos({ x: targetX, y: targetY });

    // Calculate normalized output values [-1.0, 1.0]
    let normX = targetX / maxRadius;
    let normY = targetY / maxRadius;

    // Apply soft deadzone safety margin
    const DEADZONE = 0.08;
    if (Math.abs(normX) < DEADZONE) normX = 0;
    if (Math.abs(normY) < DEADZONE) normY = 0;

    // Map:
    // Drag left (normX < 0) => Roll Left (positive keysRef.current.roll)
    // Drag right (normX > 0) => Roll Right (negative keysRef.current.roll)
    // Drag up (normY < 0) => Pitch Down (negative keysRef.current.pitch)
    // Drag down (normY > 0) => Pitch Up (positive keysRef.current.pitch)
    keysRef.current.roll = -normX;
    keysRef.current.pitch = normY;
  };

  const handleJoystickEnd = () => {
    setIsDraggingJoystick(false);
    activePointerId.current = null;
    setJoystickPos({ x: 0, y: 0 });
    keysRef.current.roll = 0;
    keysRef.current.pitch = 0;
  };

  // Modern Universal Pointer Event Handlers
  const onJoystickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    handleJoystickStart(e.clientX, e.clientY, e.pointerId);
  };

  const onJoystickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingJoystick || activePointerId.current !== e.pointerId) return;
    e.preventDefault();
    handleJoystickMove(e.clientX, e.clientY);
  };

  const onJoystickPointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    e.preventDefault();
    e.currentTarget.releasePointerCapture(e.pointerId);
    handleJoystickEnd();
  };


  // --- THROTTLE GESTURE SLIDER INTERACTION ---
  const handleThrottleStartOrMove = (clientY: number) => {
    if (!throttleTrackRef.current) return;
    const rect = throttleTrackRef.current.getBoundingClientRect();
    const relativeY = rect.bottom - clientY;
    const fillPercent = Math.max(0, Math.min(100, (relativeY / rect.height) * 100));

    const finalVal = Math.round(fillPercent);
    setLocalThrottle(finalVal);
    keysRef.current.throttleOverride = finalVal;
  };

  const onThrottlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    handleThrottleStartOrMove(e.clientY);
  };

  const onThrottlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      handleThrottleStartOrMove(e.clientY);
    }
  };

  const onThrottlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.releasePointerCapture(e.pointerId);
  };


  // --- RUDDER YAW AND BRAKES CONTROLLERS (Continuous triggers) ---
  const handleYawLeftDown = (e: React.PointerEvent) => {
    e.preventDefault();
    keysRef.current.yawLeft = true;
    keysRef.current.yaw = -1.0;
    setActiveYaw('L');
  };

  const handleYawLeftUpOrCancel = (e: React.PointerEvent) => {
    e.preventDefault();
    keysRef.current.yawLeft = false;
    keysRef.current.yaw = 0;
    if (activeYaw === 'L') {
      setActiveYaw(null);
    }
  };

  const handleYawRightDown = (e: React.PointerEvent) => {
    e.preventDefault();
    keysRef.current.yawRight = true;
    keysRef.current.yaw = 1.0;
    setActiveYaw('R');
  };

  const handleYawRightUpOrCancel = (e: React.PointerEvent) => {
    e.preventDefault();
    keysRef.current.yawRight = false;
    keysRef.current.yaw = 0;
    if (activeYaw === 'R') {
      setActiveYaw(null);
    }
  };

  const handleBrakesDown = (e: React.PointerEvent) => {
    e.preventDefault();
    keysRef.current.brakes = true;
    setBrakesActive(true);
  };

  const handleBrakesUpOrCancel = (e: React.PointerEvent) => {
    e.preventDefault();
    keysRef.current.brakes = false;
    setBrakesActive(false);
  };


  // --- EDGE-TRIGGERED IMMEDIATE ACTION TOGGLES ---
  const handleGearTap = (e: React.PointerEvent) => {
    e.preventDefault();
    if (keysRef.current) {
      keysRef.current.landingGear = !keysRef.current.landingGear;
    }
  };

  const handleCameraTap = (e: React.PointerEvent) => {
    e.preventDefault();
    onCameraToggle();
  };

  const handleMuteTap = (e: React.PointerEvent) => {
    e.preventDefault();
    onMuteToggle();
  };

  const handleResetTap = (e: React.PointerEvent) => {
    e.preventDefault();
    onResetToggle();
  };

  const handlePauseTap = (e: React.PointerEvent) => {
    e.preventDefault();
    onPauseToggle();
  };

  return (
    <div className="mobileControlsContainer select-none pointer-events-none">
      
      {/* Absolute floating wrappers to position layout dynamically */}
      <div 
        className="absolute inset-0 flex flex-col justify-between p-4"
        style={{
          paddingTop: 'calc(10px + env(safe-area-inset-top, 16px))',
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 16px))',
          paddingLeft: 'calc(10px + env(safe-area-inset-left, 16px))',
          paddingRight: 'calc(10px + env(safe-area-inset-right, 16px))',
        }}
      >
        {/* 1. TOP UTILITY ACTION BAR */}
        <div className="w-full flex justify-between items-center z-[51] pointer-events-none">
          {/* Left quick settings items */}
          <div className="flex gap-2">
            {aircraft.hasLandingGear && aircraft.id !== 'seaplane' && (
              <button
                onPointerDown={handleGearTap}
                className={`h-11 px-3.5 rounded-xl border font-bold text-[10px] tracking-wider transition-all font-mono shadow-md cursor-pointer mobileControlButton ${
                  keysRef.current?.landingGear
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400'
                }`}
              >
                GEAR
              </button>
            )}

            <button
              onPointerDown={handleBrakesDown}
              onPointerUp={handleBrakesUpOrCancel}
              onPointerCancel={handleBrakesUpOrCancel}
              onPointerLeave={handleBrakesUpOrCancel}
              className={`h-11 px-3.5 rounded-xl border font-bold text-[10px] tracking-wider transition-all font-mono shadow-md cursor-pointer mobileControlButton ${
                brakesActive
                  ? 'bg-red-500/25 border-red-500/40 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400'
              }`}
            >
              BRAKE
            </button>
          </div>

          {/* Clean Top-Center Small Debug Overlay */}
          {showDebug && (
            <div 
              onPointerDown={(e) => { e.preventDefault(); setShowDebug(false); }}
              className="hidden xs:flex bg-slate-950/85 border border-slate-800/80 rounded-xl px-3 py-1.5 flex-row gap-4 text-[8px] font-mono text-slate-400 pointer-events-auto shadow-lg backdrop-blur-xs cursor-pointer"
              title="Tap to hide flight telemetry"
            >
              <div>ROLL: <span className="font-extrabold text-sky-400">{(keysRef.current?.roll || 0).toFixed(2)}</span></div>
              <div>PITCH: <span className="font-extrabold text-sky-400">{(keysRef.current?.pitch || 0).toFixed(2)}</span></div>
              <div>YAW: <span className="font-extrabold text-sky-400">{(keysRef.current?.yaw || 0).toFixed(1)}</span></div>
              <div>THR: <span className="font-extrabold text-amber-500">{localThrottle}%</span></div>
              <div>BRK: <span className={`font-extrabold ${brakesActive ? 'text-red-400 animate-pulse' : 'text-slate-500'}`}>{brakesActive ? 'ACTIVE' : 'OFF'}</span></div>
            </div>
          )}

          {/* Right corner operation badges */}
          <div className="flex gap-1.5 bg-slate-950/80 border border-slate-900/90 p-1.5 rounded-2xl shadow-xl backdrop-blur-md">
            <button
              onPointerDown={handleCameraTap}
              className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-850 text-slate-300 hover:text-white flex items-center justify-center border border-slate-800 transition-all cursor-pointer mobileControlButton"
              title="Change Viewpoint"
            >
              <Camera className="w-4 h-4" />
            </button>

            <button
              onPointerDown={handleMuteTap}
              className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-850 text-slate-300 hover:text-white flex items-center justify-center border border-slate-800 transition-all cursor-pointer mobileControlButton"
              title="Toggle Audio"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
            </button>

            <button
              onPointerDown={handleResetTap}
              className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-850 text-slate-300 hover:text-white flex items-center justify-center border border-slate-800 transition-all cursor-pointer mobileControlButton"
              title="Restart Level"
            >
              <RotateCcw className="w-4 h-4 text-amber-500" />
            </button>

            <button
              onPointerDown={handlePauseTap}
              className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-850 text-slate-300 hover:text-white flex items-center justify-center border border-slate-800 transition-all cursor-pointer mobileControlButton"
              title="Pause Simulation"
            >
              <Pause className="w-4 h-4 text-slate-200" />
            </button>
          </div>
        </div>

        {/* 2. DYNAMIC BOTTOM MAIN TOUCH CONTROL PANELS */}
        <div className="w-full flex justify-between items-end z-[51] pointer-events-none">
          
          {/* LEFT PANEL: VIRTUAL FLIGHT ANALOG STICK */}
          <div className="flex flex-col items-center space-y-2">
            <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest font-mono">JOYSTICK (PITCH/ROLL)</span>
            
            <div 
              ref={joystickContainerRef}
              onPointerDown={onJoystickPointerDown}
              onPointerMove={onJoystickPointerMove}
              onPointerUp={onJoystickPointerUpOrCancel}
              onPointerCancel={onJoystickPointerUpOrCancel}
              onPointerLeave={onJoystickPointerUpOrCancel}
              className={`relative w-28 h-28 rounded-full border-2 bg-slate-950/75 backdrop-blur-sm shadow-2xl flex items-center justify-center transition-all virtualJoystick cursor-grab ${
                isDraggingJoystick 
                  ? 'border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.22)] scale-[1.03]' 
                  : 'border-slate-800'
              }`}
            >
              {/* Target guidelines */}
              <div className="absolute w-4 h-[1px] bg-slate-800 pointer-events-none" />
              <div className="absolute h-4 w-[1px] bg-slate-800 pointer-events-none" />

              {/* Positioned Joystick Handle/Thumb knob */}
              <div 
                className="absolute w-11 h-11 rounded-full bg-gradient-to-b from-sky-400 to-sky-600 border border-white/20 flex items-center justify-center shadow-xl select-none pointer-events-none"
                style={{
                  transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                  boxShadow: isDraggingJoystick ? '0 0 15px rgba(56,189,248,0.6)' : '0 4px 8px rgba(0,0,0,0.4)',
                  transition: isDraggingJoystick ? 'none' : 'transform 150ms cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {/* Visual marker */}
                <div className="w-3.5 h-3.5 rounded-full bg-slate-100 opacity-60" />
              </div>
            </div>
          </div>

          {/* LOWER CENTER PANEL: RUDDER YAW TRIGGERS */}
          <div className="flex items-center gap-1.5 pb-1">
            <button
              onPointerDown={handleYawLeftDown}
              onPointerUp={handleYawLeftUpOrCancel}
              onPointerCancel={handleYawLeftUpOrCancel}
              onPointerLeave={handleYawLeftUpOrCancel}
              className={`h-11 px-3.5 rounded-xl border font-bold text-[10px] tracking-wider transition-all font-mono shadow-md cursor-pointer mobileControlButton ${
                activeYaw === 'L'
                  ? 'bg-sky-500/25 border-sky-450 text-sky-300'
                  : 'bg-slate-900/85 border-slate-800 text-slate-400'
              }`}
            >
              YAW L
            </button>
            
            <button
              onPointerDown={handleYawRightDown}
              onPointerUp={handleYawRightUpOrCancel}
              onPointerCancel={handleYawRightUpOrCancel}
              onPointerLeave={handleYawRightUpOrCancel}
              className={`h-11 px-3.5 rounded-xl border font-bold text-[10px] tracking-wider transition-all font-mono shadow-md cursor-pointer mobileControlButton ${
                activeYaw === 'R'
                  ? 'bg-sky-500/25 border-sky-450 text-sky-300'
                  : 'bg-slate-900/85 border-slate-800 text-slate-400'
              }`}
            >
              YAW R
            </button>
          </div>

          {/* RIGHT PANEL: VERTICAL POWER THROTTLE SLIDER */}
          {aircraft.hasEngine && (
            <div className="flex flex-col items-center space-y-2">
              <span className="text-[7.5px] font-bold text-amber-500 uppercase tracking-widest font-mono">
                POWER: {localThrottle}%
              </span>
              
              <div 
                ref={throttleTrackRef}
                onPointerDown={onThrottlePointerDown}
                onPointerMove={onThrottlePointerMove}
                onPointerUp={onThrottlePointerUpOrCancel}
                onPointerCancel={onThrottlePointerUpOrCancel}
                onPointerLeave={onThrottlePointerUpOrCancel}
                className="relative w-12 h-32 rounded-xl bg-slate-950/80 border border-slate-800 p-1 flex items-end justify-center cursor-ns-resize shadow-2xl throttleSlider throttleSliderInput"
              >
                {/* Dynamically sizing throttle bar */}
                <div 
                  className="absolute bottom-1 left-1 right-1 rounded-lg bg-gradient-to-t from-orange-600 via-amber-500 to-amber-400 transition-all duration-75 pointer-events-none"
                  style={{ height: `calc(${localThrottle}% - 8px)` }}
                />

                {/* Tactile slide handle thumb indicator */}
                <div 
                  className="absolute left-0 right-0 h-6 bg-slate-100 border-t border-b border-slate-300 rounded shadow-md z-10 flex items-center justify-center text-[7px] text-slate-705 font-extrabold select-none pointer-events-none"
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

    </div>
  );
}
