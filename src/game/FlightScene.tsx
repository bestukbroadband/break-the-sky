import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Camera, X } from 'lucide-react';
import { Aircraft, FlightTelemetry, GameMode, WeatherOption } from '../types';
import { FlightPhysics } from './FlightPhysics';
import { audioEngine } from '../utils/audioEngine';
import MobileControls from '../components/MobileControls';
import { WEATHER_OPTIONS } from '../data/weatherData';
import { WeatherTransitioner } from './DynamicWeather';

interface FlightSceneProps {
  key?: any;
  aircraft: Aircraft;
  weather: WeatherOption;
  mode: GameMode;
  onTelemetryUpdate: (telemetry: FlightTelemetry) => void;
  gamePaused: boolean;
  setGamePaused: React.Dispatch<React.SetStateAction<boolean>>;
  onGameEnded: (isCrash: boolean, peakSpeed: number, peakAltitude: number, duration: number) => void;
  showMap: boolean;
  isReplaying?: boolean;
  setIsReplaying?: (replaying: boolean) => void;
  isIntroActive?: boolean;
  setIsIntroActive?: (active: boolean) => void;
  activeFailureManualTrigger?: 'bird_strike' | 'engine_flameout' | 'gear_jam' | null;
  onClearManualTrigger?: () => void;
}

export default function FlightScene({
  aircraft,
  weather,
  mode,
  onTelemetryUpdate,
  gamePaused,
  setGamePaused,
  onGameEnded,
  showMap,
  isReplaying = false,
  setIsReplaying,
  isIntroActive = false,
  setIsIntroActive,
  activeFailureManualTrigger = null,
  onClearManualTrigger,
}: FlightSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const physicsRef = useRef<FlightPhysics | null>(null);

  // States managed in React
  const [cameraMode, setCameraMode] = useState<string>('chase'); // chase, cockpit, wing, cinematic, topDown
  const [localReplayIndex, setLocalReplayIndex] = useState<number>(0);

  // Mobile Audio State and handlers
  const [isMuted, setIsMuted] = useState(audioEngine.getIsMuted());

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    audioEngine.setMute(nextMuted);
    setIsMuted(nextMuted);
  };

  const handleCameraToggle = () => {
    const modes = ['chase', 'cockpit', 'wing', 'cinematic', 'topDown'];
    const nextIdx = (modes.indexOf(cameraMode) + 1) % modes.length;
    const newMode = modes[nextIdx];
    setCameraMode(newMode);
    stateRef.current.cameraMode = newMode;
  };

  const handleResetFlight = () => {
    if (!physicsRef.current) return;
    
    let startPos = new THREE.Vector3(0, 400, 2000);
    let startRot = new THREE.Euler(0, 0, 0);

    if (mode === 'landing_challenge') {
      startPos.set(0, 250, 1500);
      startRot.set(0, 0, 0);
    } else if (mode === 'free_flight' || mode === 'coastal_tour' || mode === 'storm_flight') {
      startPos.set(0, 1.2, 350);
      startRot.set(0, 0, 0);
    } else if (mode === 'mountain_run') {
      startPos.set(0, 300, 2500);
      startRot.set(0, 0, 0);
    }

    physicsRef.current.resetTo(startPos, startRot);
    stateRef.current.currentCheckpointIndex = 0;
    stateRef.current.checkpoints.forEach((ring) => {
      ring.passed = false;
      if (ring.mesh && ring.mesh.material && 'color' in ring.mesh.material) {
        (ring.mesh.material as THREE.MeshBasicMaterial).color.setHex(0x00f0ff);
      }
    });
    stateRef.current.landingTriggered = false;
    stateRef.current.crashTriggered = false;
    stateRef.current.peakSpeed = 0;
    stateRef.current.peakAltitude = 0;
    stateRef.current.flightDuration = 0;
    setGamePaused(false);
  };

  // Setup refs for live loop parameters
  const keysRef = useRef({
    pitchUp: false,
    pitchDown: false,
    rollLeft: false,
    rollRight: false,
    yawLeft: false,
    yawRight: false,
    throttleUp: false,
    throttleDown: false,
    brakes: false,
    landingGear: true,
  });

  const stateRef = useRef({
    cameraMode: 'chase',
    gamePaused: false,
    prevCKey: false,
    prevGKey: false,
    prevRKey: false,
    prevPKey: false,
    prevVKey: false,
    checkpoints: [] as { mesh: THREE.Mesh; pos: THREE.Vector3; passed: boolean }[],
    currentCheckpointIndex: 0,
    rainParticles: null as THREE.Points | null,
    cloudsGroup: null as THREE.Group | null,
    auroraRibbons: [] as THREE.Mesh[],
    propellerMesh: null as THREE.Mesh | null,
    afterburnerMesh: null as THREE.Mesh | null,
    gearGroup: null as THREE.Group | null,
    planeGroup: null as THREE.Group | null,
    landingTriggered: false,
    crashTriggered: false,
    peakSpeed: 0,
    peakAltitude: 0,
    flightDuration: 0,
    // Replay system properties
    isReplaying: false,
    recordTimer: 0,
    recordedFrames: [] as Array<{
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
      speed: number;
      speedKnot: number;
      altitude: number;
      verticalSpeed: number;
      throttle: number;
      brakes: boolean;
      landingGear: boolean;
      heading: number;
      pitch: number;
      roll: number;
      score: number;
      lastMessage: string;
      stalled: boolean;
    }>,
    replayFrameIndex: 0,
    replayPlaying: true,
    replaySpeed: 1.0,
    replayAccumulator: 0,
    setReplayFrameIdxReact: null as null | ((idx: number) => void),
    introTimer: 0,
    activeWeatherId: weather.id,
    activeWeatherHasRain: weather.hasRain,
  });

  const weatherTransitionerRef = useRef<WeatherTransitioner | null>(null);

  // Sync React state into loop handles
  useEffect(() => {
    if (isIntroActive) {
      stateRef.current.introTimer = 0;
    }
  }, [isIntroActive]);

  useEffect(() => {
    stateRef.current.gamePaused = gamePaused;
  }, [gamePaused]);

  // Trigger progressive, gradual, and non-blocking in-flight weather transition!
  const prevWeatherIdRef = useRef(weather.id);
  useEffect(() => {
    if (prevWeatherIdRef.current !== weather.id) {
      if (weatherTransitionerRef.current) {
        const fromPreset = WEATHER_OPTIONS.find(w => w.id === prevWeatherIdRef.current) || weather;
        weatherTransitionerRef.current.startTransition(fromPreset, weather);
      }
      stateRef.current.activeWeatherId = weather.id;
      stateRef.current.activeWeatherHasRain = weather.hasRain;
      prevWeatherIdRef.current = weather.id;
    }
  }, [weather]);

  useEffect(() => {
    stateRef.current.cameraMode = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    stateRef.current.isReplaying = !!isReplaying;
    if (isReplaying) {
      stateRef.current.replayFrameIndex = 0;
      setLocalReplayIndex(0);
      stateRef.current.replayPlaying = true;
      stateRef.current.replaySpeed = 1.0;
      stateRef.current.replayAccumulator = 0;
    }
  }, [isReplaying]);

  useEffect(() => {
    stateRef.current.setReplayFrameIdxReact = setLocalReplayIndex;
    return () => {
      stateRef.current.setReplayFrameIdxReact = null;
    };
  }, []);

  // Synchronize manual failures requested from the React HUD
  useEffect(() => {
    if (activeFailureManualTrigger && physicsRef.current) {
      physicsRef.current.triggerEmergency(activeFailureManualTrigger);
      if (onClearManualTrigger) {
        onClearManualTrigger();
      }
    }
  }, [activeFailureManualTrigger, onClearManualTrigger]);

  // Handle Resize beautifully
  useEffect(() => {
    if (!mountRef.current) return;
    
    // Set initial start flight parameters
    // In Landing Challenge, we start high in the air, aligned with the runway
    let startPos = new THREE.Vector3(0, 400, 2000); // 2000 meters approaching runway (which starts around z=500 and ends at z=-1500)
    let startRot = new THREE.Euler(0, 0, 0); // facing north (aligned to z=-1)

    if (mode === 'landing_challenge') {
      startPos.set(0, 250, 1500); // lower slope
      startRot.set(0, 0, 0);
    } else if (mode === 'free_flight' || mode === 'coastal_tour' || mode === 'storm_flight') {
      startPos.set(0, 1.2, 350); // level on the runway threshold ready to takeoff!
      startRot.set(0, 0, 0);
    } else if (mode === 'mountain_run') {
      startPos.set(0, 300, 2500); // start elevated approaching range
      startRot.set(0, 0, 0);
    }

    const physics = new FlightPhysics(aircraft, startPos, startRot);
    physicsRef.current = physics;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // 1. Scene, Camera, WebGL Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(weather.skyColor);
    scene.fog = new THREE.FogExp2(weather.skyColor, weather.fogDensity);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.5, 20000);
    
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobileDevice, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isMobileDevice; // Disable directional shadows on mobile for massive rendering gains
    renderer.shadowMap.type = THREE.BasicShadowMap;
    renderer.setPixelRatio(isMobileDevice ? 1.5 : Math.min(window.devicePixelRatio, 2));

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // 2. Lights Configuration based on Selected Weather Option
    const ambientLight = new THREE.AmbientLight(weather.lightColor, weather.lightIntensity * 0.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(weather.lightColor, weather.lightIntensity);
    if (weather.id === 'sunset') {
      sunLight.position.set(4000, 400, -8000); // flat low angle
    } else if (weather.id === 'night') {
      sunLight.position.set(0, 1000, 0); // moonlight overhead
    } else {
      sunLight.position.set(2000, 4000, 2000);
    }
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 15000;
    const sCamSize = 4000;
    sunLight.shadow.camera.left = -sCamSize;
    sunLight.shadow.camera.right = sCamSize;
    sunLight.shadow.camera.top = sCamSize;
    sunLight.shadow.camera.bottom = -sCamSize;
    scene.add(sunLight);

    // Dynamic light following plane slightly for shadow resolution
    const dirLightTarget = new THREE.Object3D();
    scene.add(dirLightTarget);
    sunLight.target = dirLightTarget;

    // 3. Procedural Mountains terrain creation
    const terrainSize = 15000;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 96, 96);
    terrainGeo.rotateX(-Math.PI / 2); // horizontal alignment

    const positions = terrainGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const vx = positions[i];
      const vz = positions[i+2];
      
      const heightVal = physics.getTerrainHeightAt(vx, vz);
      positions[i+1] = heightVal; // Y altitude coordinate
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(weather.groundColor),
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // 4. Sparkling Ocean plane at Y = 1.0 (Sea Level)
    const oceanGeo = new THREE.PlaneGeometry(35000, 35000);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x004c8c,
      roughness: 0.2,
      metalness: 0.85,
      transparent: true,
      opacity: 0.75,
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.position.y = 1.0;
    oceanMesh.receiveShadow = true;
    scene.add(oceanMesh);

    // 5. Airport Runway and Buildings
    const runwayWidth = 100;
    const runwayLength = 2400; // ample line space
    const runwayGeo = new THREE.PlaneGeometry(runwayWidth, runwayLength);
    runwayGeo.rotateX(-Math.PI / 2);
    const runwayMat = new THREE.MeshStandardMaterial({
      color: 0x111827, // near pitch black carbon pavement
      roughness: 0.4,
      metalness: 0.2,
    });
    const runwayMesh = new THREE.Mesh(runwayGeo, runwayMat);
    // Sit slightly above ground height to prevent z-fighting
    runwayMesh.position.set(0, 1.05, -600); // Centered offset
    runwayMesh.receiveShadow = true;
    scene.add(runwayMesh);

    // Runway White Stripes
    const stripeGroup = new THREE.Group();
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let z = -1700; z <= 500; z += 120) {
      const g = new THREE.PlaneGeometry(3, 40);
      g.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, stripeMat);
      m.position.set(0, 1.07, z);
      stripeGroup.add(m);
    }
    
    // Landing zone indicators
    const thresholdGeo = new THREE.PlaneGeometry(60, 4);
    thresholdGeo.rotateX(-Math.PI / 2);
    const limit1 = new THREE.Mesh(thresholdGeo, stripeMat);
    limit1.position.set(0, 1.07, 450);
    const limit2 = new THREE.Mesh(thresholdGeo, stripeMat);
    limit2.position.set(0, 1.07, -1650);
    stripeGroup.add(limit1, limit2);
    scene.add(stripeGroup);

    // Runway Beacon lights (spherical points)
    const beaconsGroup = new THREE.Group();
    const greenBeaconMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const redBeaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const whiteBeaconMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let side = -1; side <= 1; side += 2) {
      if (side === 0) continue;
      const xOffset = side * (runwayWidth / 2 - 2);

      // Edge Lights along runway
      for (let z = -1750; z <= 550; z += 150) {
        let mat = whiteBeaconMat;
        if (z === 550) mat = greenBeaconMat; // Threshold approach green
        if (z === -1750) mat = redBeaconMat; // End limit red
        
        const bGeo = new THREE.SphereGeometry(1, 4, 4);
        const bMesh = new THREE.Mesh(bGeo, mat);
        bMesh.position.set(xOffset, 2.05, z);
        beaconsGroup.add(bMesh);
      }
    }
    scene.add(beaconsGroup);

    // Modern airport Control Tower procedural
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-150, 0, -300);
    
    const baseGeo = new THREE.CylinderGeometry(15, 18, 120, 8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 60;
    base.castShadow = true;
    base.receiveShadow = true;
    towerGroup.add(base);

    const cabinGeo = new THREE.CylinderGeometry(25, 20, 15, 12);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, transparent: true, opacity: 0.75, roughness: 0.2 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.y = 125;
    towerGroup.add(cabin);

    const roofGeo = new THREE.ConeGeometry(26, 8, 12);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 136;
    towerGroup.add(roof);

    scene.add(towerGroup);

    // 6. Spawn Procedural Aircraft Group
    const planeGroup = new THREE.Group();
    scene.add(planeGroup);
    stateRef.current.planeGroup = planeGroup;

    // Build the craft based on current selected criteria
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: aircraft.color, 
      roughness: aircraft.id === 'stealth_bomber' || aircraft.id === 'recon_jet' ? 0.3 : 0.4, 
      metalness: aircraft.id === 'stealth_bomber' || aircraft.id === 'recon_jet' ? 0.8 : 0.5 
    });
    const trimMat = new THREE.MeshStandardMaterial({ color: aircraft.accentColor, roughness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ 
      color: aircraft.id === 'stealth_bomber' ? 0xff3300 : 0x38bdf8, 
      transparent: true, 
      opacity: aircraft.id === 'stealth_bomber' ? 0.85 : 0.7, 
      roughness: 0.1 
    });
    const engineConeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });

    let gearGroup = new THREE.Group();
    let afterburnerMesh: THREE.Mesh | null = null;
    let propellerMesh: THREE.Mesh | null = null;

    // A. Main body fuselage
    const fuselageLength = aircraft.id === 'heavy_bomber' ? 52 
                         : aircraft.id === 'stealth_bomber' ? 6
                         : aircraft.id === 'recon_jet' ? 44
                         : aircraft.id === 'passenger_jet' ? 45 
                         : aircraft.id === 'private_jet' ? 24 
                         : aircraft.id === 'ww2_fighter' ? 15
                         : 14;
    const fuselageRadius = aircraft.id === 'heavy_bomber' ? 2.8
                         : aircraft.id === 'stealth_bomber' ? 3.4
                         : aircraft.id === 'recon_jet' ? 1.4
                         : aircraft.id === 'passenger_jet' ? 3.5 
                         : aircraft.id === 'private_jet' ? 1.8 
                         : aircraft.id === 'ww2_fighter' ? 1.1
                         : 0.9;
    
    const fuseGeo = new THREE.CylinderGeometry(fuselageRadius * 0.9, fuselageRadius * 1.1, fuselageLength, 12);
    fuseGeo.rotateX(Math.PI / 2); // align forward along Z
    const fuselage = new THREE.Mesh(fuseGeo, bodyMat);
    fuselage.castShadow = true;
    fuselage.receiveShadow = true;
    planeGroup.add(fuselage);

    // Nose Cone
    const noseLength = aircraft.id === 'recon_jet' ? 8 
                     : aircraft.id === 'stealth_bomber' ? 1.5 
                     : 5;
    const noseGeo = new THREE.ConeGeometry(fuselageRadius, noseLength, 12);
    noseGeo.rotateX(-Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, trimMat);
    nose.position.set(0, 0, -fuselageLength / 2 - noseLength / 2);
    nose.castShadow = true;
    planeGroup.add(nose);

    // B. Wings (Left/Right)
    const wingspan = aircraft.id === 'heavy_bomber' ? 62
                   : aircraft.id === 'stealth_bomber' ? 44
                   : aircraft.id === 'recon_jet' ? 24
                   : aircraft.id === 'passenger_jet' ? 48 
                   : aircraft.id === 'glider' ? 32 
                   : aircraft.id === 'cargo_plane' ? 38 
                   : aircraft.id === 'ww2_fighter' ? 22
                   : 18;
    const wingChord = aircraft.id === 'stealth_bomber' ? 12
                    : aircraft.id === 'recon_jet' ? 8
                    : aircraft.id === 'passenger_jet' ? 8 
                    : aircraft.id === 'glider' ? 1.5 
                    : aircraft.id === 'heavy_bomber' ? 5.5
                    : aircraft.id === 'cargo_plane' ? 4.5
                    : aircraft.id === 'ww2_fighter' ? 4.0
                    : 3.5;
    const wingThickness = aircraft.id === 'stealth_bomber' ? 0.35 : 0.2;

    const wingLGeo = new THREE.BoxGeometry(wingspan / 2, wingThickness, wingChord);
    // Swept wings for jet models and stealth/recon deltas
    if (aircraft.id === 'military_jet' || aircraft.id === 'private_jet' || aircraft.id === 'passenger_jet' || aircraft.id === 'recon_jet') {
      wingLGeo.translate(wingspan / 4, 0, wingChord * 0.25);
    } else if (aircraft.id === 'stealth_bomber') {
      // Extremely swept triangular flying wing
      wingLGeo.translate(wingspan / 4, -0.1, wingChord * 0.45);
    } else {
      wingLGeo.translate(wingspan / 4, 0, 0);
    }
    const wingL = new THREE.Mesh(wingLGeo, bodyMat);
    
    // Position wings slightly lower/centered
    const wingZOffset = aircraft.id === 'stealth_bomber' ? 1.0 : -1;
    wingL.position.set(fuselageRadius * 0.8, aircraft.id === 'stealth_bomber' ? -0.2 : 0, wingZOffset);
    wingL.castShadow = true;
    planeGroup.add(wingL);

    const wingRGeo = new THREE.BoxGeometry(wingspan / 2, wingThickness, wingChord);
    if (aircraft.id === 'military_jet' || aircraft.id === 'private_jet' || aircraft.id === 'passenger_jet' || aircraft.id === 'recon_jet') {
      wingRGeo.translate(-wingspan / 4, 0, wingChord * 0.25);
    } else if (aircraft.id === 'stealth_bomber') {
      wingRGeo.translate(-wingspan / 4, -0.1, wingChord * 0.45);
    } else {
      wingRGeo.translate(-wingspan / 4, 0, 0);
    }
    const wingR = new THREE.Mesh(wingRGeo, bodyMat);
    wingR.position.set(-fuselageRadius * 0.8, aircraft.id === 'stealth_bomber' ? -0.2 : 0, wingZOffset);
    wingR.castShadow = true;
    planeGroup.add(wingR);

    // Biplane dual wings connector
    if (aircraft.id === 'biplane') {
      const topWingL = wingL.clone();
      topWingL.position.y += 2.5;
      const topWingR = wingR.clone();
      topWingR.position.y += 2.5;
      planeGroup.add(topWingL, topWingR);

      // Struts
      const strutGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 6);
      const strutS = new THREE.MeshStandardMaterial({ color: 0x1e293b });
      const strutL1 = new THREE.Mesh(strutGeo, strutS); strutL1.position.set(wingspan / 4, 1.25, -1);
      const strutL2 = new THREE.Mesh(strutGeo, strutS); strutL2.position.set(wingspan / 8, 1.25, -1);
      const strutR1 = new THREE.Mesh(strutGeo, strutS); strutR1.position.set(-wingspan / 4, 1.25, -1);
      const strutR2 = new THREE.Mesh(strutGeo, strutS); strutR2.position.set(-wingspan / 8, 1.25, -1);
      planeGroup.add(strutL1, strutL2, strutR1, strutR2);
    }

    // C. Cockpit Canopy bubble
    const bubbleGeo = new THREE.SphereGeometry(fuselageRadius * 0.8, 8, 8);
    bubbleGeo.scale(1, 0.7, 2);
    const bubble = new THREE.Mesh(bubbleGeo, glassMat);
    // Move canopy forward for longer aircraft, center of fuselage for bomber flying wings
    const canopyZ = aircraft.id === 'stealth_bomber' ? -0.5 
                  : aircraft.id === 'recon_jet' ? -fuselageLength * 0.22
                  : -fuselageLength * 0.15;
    bubble.position.set(0, fuselageRadius * (aircraft.id === 'stealth_bomber' ? 0.35 : 0.6), canopyZ);
    planeGroup.add(bubble);

    // D. Tail stabilizer fins (Omit entirely for stealth flying wings!)
    if (aircraft.id !== 'stealth_bomber') {
      if (aircraft.id === 'recon_jet') {
        // Double canted high speed tail fins
        const finGeo = new THREE.BoxGeometry(0.12, fuselageRadius * 2.2, fuselageRadius * 1.8);
        finGeo.translate(0, fuselageRadius * 1.1, 0);
        const leftFin = new THREE.Mesh(finGeo, trimMat);
        leftFin.position.set(-2.5, 0, fuselageLength / 2 - 2);
        leftFin.rotation.z = 0.22; // canted outwards
        leftFin.castShadow = true;
        
        const rightFin = leftFin.clone();
        rightFin.position.x = 2.5;
        rightFin.rotation.z = -0.22;
        planeGroup.add(leftFin, rightFin);

        // Horizontal delta tips stabilizer
        const tailHGeo = new THREE.BoxGeometry(wingspan * 0.3, 0.1, fuselageRadius * 1.2);
        const tailH = new THREE.Mesh(tailHGeo, trimMat);
        tailH.position.set(0, 0.2, fuselageLength / 2 - 2);
        tailH.castShadow = true;
        planeGroup.add(tailH);
      } else {
        // Standard tail setup
        const tailYGeo = new THREE.BoxGeometry(0.15, fuselageRadius * (aircraft.id === 'heavy_bomber' ? 4.2 : 2.8), fuselageRadius * 2);
        tailYGeo.translate(0, fuselageRadius * (aircraft.id === 'heavy_bomber' ? 2.1 : 1.4), 0);
        const tailY = new THREE.Mesh(tailYGeo, trimMat);
        tailY.position.set(0, 0, fuselageLength / 2 - 1.5);
        tailY.castShadow = true;
        planeGroup.add(tailY);

        const tailHGeo = new THREE.BoxGeometry(wingspan * 0.25, 0.1, fuselageRadius * 1.5);
        const tailH = new THREE.Mesh(tailHGeo, trimMat);
        tailH.position.set(0, aircraft.id === 'heavy_bomber' ? 2.0 : 1.0, fuselageLength / 2 - 1.5);
        tailH.castShadow = true;
        planeGroup.add(tailH);
      }
    }

    // E. Engine propulsion systems
    if (aircraft.id === 'propeller' || aircraft.id === 'biplane' || aircraft.id === 'seaplane' || aircraft.id === 'ww2_fighter') {
      const propHubGeo = new THREE.SphereGeometry(aircraft.id === 'ww2_fighter' ? 0.45 : 0.35, 6, 6);
      const propHub = new THREE.Mesh(propHubGeo, engineConeMat);
      propHub.position.set(0, 0, -fuselageLength / 2 - (aircraft.id === 'ww2_fighter' ? 3.2 : 3));
      
      const propBladeGeo = new THREE.BoxGeometry(aircraft.id === 'ww2_fighter' ? 5.2 : 4.2, 0.25, 0.05);
      const propBlade = new THREE.Mesh(propBladeGeo, engineConeMat);
      propHub.add(propBlade);
      
      planeGroup.add(propHub);
      propellerMesh = propHub;
      stateRef.current.propellerMesh = propHub;
    } else if (aircraft.id === 'military_jet') {
      // Fighter jet glowing flame exhaust
      const exhaustGeo = new THREE.ConeGeometry(1.0, 4.0, 10);
      exhaustGeo.rotateX(Math.PI / 2);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xff7700, transparent: true, opacity: 0.95 });
      const flame = new THREE.Mesh(exhaustGeo, flameMat);
      flame.position.set(0, 0, fuselageLength / 2 + 1.8);
      planeGroup.add(flame);
      afterburnerMesh = flame;
      stateRef.current.afterburnerMesh = flame;
    } else if (aircraft.id === 'stealth_bomber') {
      // Disguised flat composite engine vents (orange infrared suppressors)
      const ventGeo = new THREE.BoxGeometry(1.6, 0.35, 2.0);
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.65 });
      
      const leftVent = new THREE.Mesh(ventGeo, engineConeMat);
      leftVent.position.set(-2.0, -0.1, fuselageLength / 2 - 0.5);
      const leftGlow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 0.2), glowMat);
      leftGlow.position.set(0, 0, 1.01);
      leftVent.add(leftGlow);

      const rightVent = leftVent.clone();
      rightVent.position.x = 2.0;

      planeGroup.add(leftVent, rightVent);
    } else if (aircraft.id === 'recon_jet') {
      // Huge dual wing nacelles
      const nacelleGeo = new THREE.CylinderGeometry(1.1, 1.0, 10, 8);
      nacelleGeo.rotateX(Math.PI / 2);
      
      const nacL = new THREE.Mesh(nacelleGeo, bodyMat);
      nacL.position.set(-wingspan * 0.28, 0, 1);
      
      // glowing jet nozzle on each nacelle
      const burnerCone = new THREE.ConeGeometry(0.7, 3.2, 8);
      burnerCone.rotateX(Math.PI / 2);
      const burnerMat = new THREE.MeshBasicMaterial({ color: 0xbf55ff, transparent: true, opacity: 0.9 });
      
      const flameL = new THREE.Mesh(burnerCone, burnerMat);
      flameL.position.set(0, 0, 6.0);
      nacL.add(flameL);
      nacL.castShadow = true;

      const nacR = new THREE.Mesh(nacelleGeo, bodyMat);
      nacR.position.set(wingspan * 0.28, 0, 1);
      const flameR = new THREE.Mesh(burnerCone, burnerMat);
      flameR.position.set(0, 0, 6.0);
      nacR.add(flameR);
      nacR.castShadow = true;

      planeGroup.add(nacL, nacR);
      
      // Wire up a state reference item to let these afterburners pulse!
      stateRef.current.afterburnerMesh = flameL; // hook left one as main flare
    } else if (aircraft.id === 'heavy_bomber') {
      // 4 dual engine pod capsules hanging under wings on struts
      const podBodyGeo = new THREE.CylinderGeometry(0.75, 0.65, 4.2, 8);
      podBodyGeo.rotateX(Math.PI / 2);
      const strutGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 4);

      const xOffsets = [-wingspan * 0.32, -wingspan * 0.16, wingspan * 0.16, wingspan * 0.32];
      xOffsets.forEach(x => {
        const pod = new THREE.Mesh(podBodyGeo, engineConeMat);
        pod.position.set(x, -1.8, -0.5);
        pod.castShadow = true;

        const strut = new THREE.Mesh(strutGeo, engineConeMat);
        strut.position.set(x, -1.0, -0.5);
        planeGroup.add(pod, strut);
      });
    } else if (aircraft.id === 'passenger_jet' || aircraft.id === 'private_jet') {
      // Dual turbine engines underwing
      const turbineGeo = new THREE.CylinderGeometry(0.8, 0.7, 4.5, 8);
      turbineGeo.rotateX(Math.PI / 2);
      const leftTurbine = new THREE.Mesh(turbineGeo, engineConeMat);
      leftTurbine.position.set(-wingspan * 0.22, -1.8, -1);
      leftTurbine.castShadow = true;
      const rightTurbine = leftTurbine.clone();
      rightTurbine.position.x = wingspan * 0.22;
      planeGroup.add(leftTurbine, rightTurbine);
    } else if (aircraft.id === 'cargo_plane') {
      // Cargo plane 4 turboprops
      const turbineGeo = new THREE.CylinderGeometry(0.6, 0.5, 3.5, 8);
      turbineGeo.rotateX(Math.PI / 2);
      const t1 = new THREE.Mesh(turbineGeo, engineConeMat); t1.position.set(-wingspan * 0.18, 0, -1);
      const t2 = new THREE.Mesh(turbineGeo, engineConeMat); t2.position.set(-wingspan * 0.3, 0, -1);
      const t3 = new THREE.Mesh(turbineGeo, engineConeMat); t3.position.set(wingspan * 0.18, 0, -1);
      const t4 = new THREE.Mesh(turbineGeo, engineConeMat); t4.position.set(wingspan * 0.3, 0, -1);
      planeGroup.add(t1, t2, t3, t4);
    }

    // F. Landing Gear tires
    planeGroup.add(gearGroup);
    stateRef.current.gearGroup = gearGroup;
    
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const strutMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });

    const createGearStrut = (xOff: number, yOff: number, zOff: number) => {
      const sg = new THREE.Group();
      const strutGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.0, 6);
      const strut = new THREE.Mesh(strutGeo, strutMat);
      strut.position.y = -1.0;
      sg.add(strut);

      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.position.y = -2.0;
      tire.castShadow = true;
      sg.add(tire);

      sg.position.set(xOff, yOff, zOff);
      return sg;
    };

    if (aircraft.id === 'seaplane') {
      // Large structural dual floats
      const floatGeo = new THREE.BoxGeometry(1.2, 0.8, 11);
      const floatL = new THREE.Mesh(floatGeo, trimMat);
      floatL.position.set(-3.2, -2.4, -1);
      floatL.castShadow = true;
      const floatR = floatL.clone();
      floatR.position.x = 3.2;
      gearGroup.add(floatL, floatR);

      // Float struts
      const strutGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 6);
      const pin1 = new THREE.Mesh(strutGeo, strutMat); pin1.position.set(-3.2, -1.2, -3); pin1.rotateZ(-0.2);
      const pin2 = new THREE.Mesh(strutGeo, strutMat); pin2.position.set(-3.2, -1.2, 1); pin2.rotateZ(-0.2);
      const pin3 = new THREE.Mesh(strutGeo, strutMat); pin3.position.set(3.2, -1.2, -3); pin3.rotateZ(0.2);
      const pin4 = new THREE.Mesh(strutGeo, strutMat); pin4.position.set(3.2, -1.2, 1); pin4.rotateZ(0.2);
      gearGroup.add(pin1, pin2, pin3, pin4);
    } else {
      // standard nose/rear wheels
      const backGearL = createGearStrut(4.2, -1.2, 1);
      const backGearR = createGearStrut(-4.2, -1.2, 1);
      const frontGear = createGearStrut(0, -1.2, -fuselageLength * 0.35);
      gearGroup.add(backGearL, backGearR, frontGear);
    }

    // 7. Route Waypoint Checkpoints
    const checkPtsGroup = new THREE.Group();
    const isTourMode = mode === 'coastal_tour';
    const isMtnMode = mode === 'mountain_run';

    let pts: THREE.Vector3[] = [];
    if (isTourMode) {
      // Float rings along coast
      pts = [
        new THREE.Vector3(500, 160, 1000),
        new THREE.Vector3(1200, 120, -100),
        new THREE.Vector3(2000, 100, -800),
        new THREE.Vector3(3000, 180, -1500),
        new THREE.Vector3(2500, 220, -2500),
        new THREE.Vector3(1000, 200, -3200),
        new THREE.Vector3(-800, 150, -2500),
        new THREE.Vector3(-2200, 250, -1600),
        new THREE.Vector3(-1500, 300, -200),
        new THREE.Vector3(0, 180, 800) // aligned near runway
      ];
    } else if (isMtnMode) {
      // Mountain valley gates
      pts = [
        new THREE.Vector3(800, 380, 1500),
        new THREE.Vector3(2200, 480, 200),
        new THREE.Vector3(1800, 420, -1200),
        new THREE.Vector3(500, 350, -2800),
        new THREE.Vector3(-1200, 480, -3200),
        new THREE.Vector3(-2800, 500, -1800),
        new THREE.Vector3(-2000, 320, 100),
        new THREE.Vector3(-600, 260, 1200)
      ];
    }

    const ringList: { mesh: THREE.Mesh; pos: THREE.Vector3; passed: boolean }[] = [];
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });

    pts.forEach((pos, idx) => {
      // Torus ring
      const rGeo = new THREE.TorusGeometry(38, 2.5, 8, 24);
      const rMesh = new THREE.Mesh(rGeo, ringMat);
      rMesh.position.copy(pos);
      // look towards next checkpoint position or runway center
      const lookTgt = idx < pts.length - 1 ? pts[idx + 1] : new THREE.Vector3(0, 100, 0);
      rMesh.lookAt(lookTgt);
      
      checkPtsGroup.add(rMesh);
      ringList.push({ mesh: rMesh, pos: pos.clone(), passed: false });
    });
    scene.add(checkPtsGroup);
    stateRef.current.checkpoints = ringList;

    // 8. Storm Rain / Snow Particles - Always construct the precipitation points so they can transition in flight
    const isMobileDevicePrecip = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const pCount = isMobileDevicePrecip ? 1200 : 4000;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount * 3; i += 3) {
      rainPos[i] = (Math.random() - 0.5) * 800;
      rainPos[i+1] = Math.random() * 400; // altitude
      rainPos[i+2] = (Math.random() - 0.5) * 800;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    
    const initiallyActive = weather.hasRain || weather.id === 'snow';
    const rainMat = new THREE.PointsMaterial({
      color: weather.id === 'snow' ? 0xffffff : 0x93c5fd,
      size: weather.id === 'snow' ? 2.5 : 1.0,
      transparent: true,
      opacity: initiallyActive ? 0.85 : 0.0
    });
    const rainPoints = new THREE.Points(rainGeo, rainMat);
    rainPoints.visible = initiallyActive;
    scene.add(rainPoints);
    stateRef.current.rainParticles = rainPoints;

    // Initialize progressive weather transitioner
    const transitioner = new WeatherTransitioner(
      scene,
      sunLight,
      ambientLight,
      renderer,
      rainPoints,
      null
    );
    weatherTransitionerRef.current = transitioner;

    // 8.5. Procedural 3D Weather Clouds
    const cloudsGroup = new THREE.Group();
    scene.add(cloudsGroup);
    stateRef.current.cloudsGroup = cloudsGroup;

    const isMobileDeviceClouds = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    let cloudCount = isMobileDeviceClouds ? 8 : 15;
    if (weather.id === 'fog') cloudCount = isMobileDeviceClouds ? 18 : 35;
    else if (weather.id === 'rain') cloudCount = isMobileDeviceClouds ? 14 : 28;
    else if (weather.id === 'snow') cloudCount = isMobileDeviceClouds ? 15 : 30;
    else if (weather.id === 'afternoon') cloudCount = isMobileDeviceClouds ? 10 : 20;
    else if (weather.id === 'aurora') cloudCount = isMobileDeviceClouds ? 5 : 10;

    let cloudColorHex = 0xffffff;
    if (weather.id === 'sunset') cloudColorHex = 0xfecdd3; // Rosy sunset clouds
    else if (weather.id === 'night') cloudColorHex = 0x1f2937; // Dark nightly clouds
    else if (weather.id === 'rain') cloudColorHex = 0x475569; // Slate gray rain clouds
    else if (weather.id === 'snow') cloudColorHex = 0xe2e8f0; // Chilly ice-gray
    else if (weather.id === 'aurora') cloudColorHex = 0x1e1b4b; // Deep purple cosmic stardust

    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: cloudColorHex,
      roughness: 0.95,
      metalness: 0.05,
      transparent: true,
      opacity: weather.id === 'fog' ? 0.4 : weather.id === 'rain' ? 0.70 : 0.85,
    });

    for (let c = 0; c < cloudCount; c++) {
      const cloudPuffs = new THREE.Group();
      const puffCount = 5 + Math.floor(Math.random() * 5);
      
      const cx = (Math.random() - 0.5) * 12000;
      const cy = 250 + Math.random() * 650; // Random altitudes
      const cz = (Math.random() - 0.5) * 12000;
      
      for (let p = 0; p < puffCount; p++) {
        const pRadius = 50 + Math.random() * 60;
        const puffGeo = new THREE.SphereGeometry(pRadius, 5, 5); // Low poly spheres
        const puffMesh = new THREE.Mesh(puffGeo, cloudMaterial);
        
        // Flattened cloud distribution
        puffMesh.position.set(
          (Math.random() - 0.5) * pRadius * 1.6,
          (Math.random() - 0.5) * pRadius * 0.45,
          (Math.random() - 0.5) * pRadius * 1.6
        );
        puffMesh.castShadow = true;
        cloudPuffs.add(puffMesh);
      }
      
      cloudPuffs.position.set(cx, cy, cz);
      cloudsGroup.add(cloudPuffs);
    }

    // 8.6. Cosmic Aurora Curtain Ribbons
    const auroraRibbons: THREE.Mesh[] = [];
    if (weather.id === 'aurora') {
      const ribbonCount = 3;
      const ribbonsGroup = new THREE.Group();
      scene.add(ribbonsGroup);
      
      const colors = [0x22c55e, 0xa855f7, 0x06b6d4]; // green, purple, sky blue
      
      for (let r = 0; r < ribbonCount; r++) {
        const rGeo = new THREE.PlaneGeometry(8000, 450, 24, 2);
        // Elevate extremely high in the ozone layer
        rGeo.translate(0, 1500, 0);
        
        const rMat = new THREE.MeshBasicMaterial({
          color: colors[r % colors.length],
          transparent: true,
          opacity: 0.28,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        
        const rMesh = new THREE.Mesh(rGeo, rMat);
        rMesh.position.set(
          (Math.random() - 0.5) * 2000, 
          0, 
          -3500 + (r * 2000)
        );
        rMesh.rotation.y = Math.PI / 6 * (r - 1);
        rMesh.rotation.x = Math.PI / 5;
        
        ribbonsGroup.add(rMesh);
        auroraRibbons.push(rMesh);
      }
      stateRef.current.auroraRibbons = auroraRibbons;
    }

    // 9. Input Receivers (Smooth Key Down)
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      // Rotation keys
      if (e.key === 'ArrowUp') keysRef.current.pitchDown = true;
      if (e.key === 'ArrowDown') keysRef.current.pitchUp = true;
      if (e.key === 'ArrowLeft') keysRef.current.rollLeft = true;
      if (e.key === 'ArrowRight') keysRef.current.rollRight = true;

      if (key === 'a') keysRef.current.yawLeft = true;
      if (key === 'd') keysRef.current.yawRight = true;
      if (key === 'w') keysRef.current.throttleUp = true;
      if (key === 's') keysRef.current.throttleDown = true;
      if (key === 'b') keysRef.current.brakes = true;

      // Single triggers (G / G, C / C, R / R, P / P, M / M)
      if (key === 'g' && !stateRef.current.prevGKey) {
        if (aircraft.id !== 'seaplane' && aircraft.hasLandingGear) {
          keysRef.current.landingGear = !keysRef.current.landingGear;
          physics.lastMessage = keysRef.current.landingGear
            ? '🛞 Landing gear extended. Drag coefficient increased.'
            : '✈️ Landing gear retracted. Speed drag reduced.';
        }
        stateRef.current.prevGKey = true;
      }
      
      if (key === 'c' && !stateRef.current.prevCKey) {
        const modes = ['chase', 'cockpit', 'wing', 'cinematic', 'topDown'];
        const nextIdx = (modes.indexOf(stateRef.current.cameraMode) + 1) % modes.length;
        setCameraMode(modes[nextIdx]);
        stateRef.current.prevCKey = true;
      }

      if (key === 'r' && !stateRef.current.prevRKey) {
        physics.resetTo(startPos, startRot);
        stateRef.current.currentCheckpointIndex = 0;
        stateRef.current.checkpoints.forEach((ring) => {
          ring.passed = false;
          (ring.mesh.material as THREE.MeshBasicMaterial).color.setHex(0x00f0ff);
        });
        stateRef.current.landingTriggered = false;
        stateRef.current.crashTriggered = false;
        stateRef.current.peakSpeed = 0;
        stateRef.current.peakAltitude = 0;
        stateRef.current.flightDuration = 0;
        setGamePaused(false);
        stateRef.current.prevRKey = true;
      }

      if (key === 'p' && !stateRef.current.prevPKey) {
        setGamePaused((prev) => !prev);
        stateRef.current.prevPKey = true;
      }

      if (key === 'v' && !stateRef.current.prevVKey) {
        if (setIsReplaying) {
          setIsReplaying(!isReplaying);
        }
        stateRef.current.prevVKey = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.key === 'ArrowUp') keysRef.current.pitchDown = false;
      if (e.key === 'ArrowDown') keysRef.current.pitchUp = false;
      if (e.key === 'ArrowLeft') keysRef.current.rollLeft = false;
      if (e.key === 'ArrowRight') keysRef.current.rollRight = false;

      if (key === 'a') keysRef.current.yawLeft = false;
      if (key === 'd') keysRef.current.yawRight = false;
      if (key === 'w') keysRef.current.throttleUp = false;
      if (key === 's') keysRef.current.throttleDown = false;
      if (key === 'b') keysRef.current.brakes = false;

      if (key === 'g') stateRef.current.prevGKey = false;
      if (key === 'c') stateRef.current.prevCKey = false;
      if (key === 'r') stateRef.current.prevRKey = false;
      if (key === 'p') stateRef.current.prevPKey = false;
      if (key === 'v') stateRef.current.prevVKey = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 10. Frame Loop
    let clock = new THREE.Clock();
    let requestId: number;

    const mainLoop = () => {
      requestId = requestAnimationFrame(mainLoop);
      
      // Compute delta limits to prevent jump lags
      let dt = Math.min(0.03, clock.getDelta());

      // Cinematic Pre-flight Intro Sweep Bypass
      if (isIntroActive) {
        stateRef.current.introTimer += dt;
        const totalIntroDuration = 6.0; // 6 seconds of cinematic flyover
        const t = Math.min(1, stateRef.current.introTimer / totalIntroDuration);

        // Keep the aircraft stationary at its starting point
        planeGroup.position.copy(physics.position);
        planeGroup.rotation.copy(physics.rotation);

        // Turn propeller gently on standby
        if (stateRef.current.propellerMesh) {
          stateRef.current.propellerMesh.rotation.z += dt * 3.5;
        }

        // Animate lights and rain particles (if any)
        dirLightTarget.position.copy(physics.position);
        sunLight.position.copy(physics.position).add(new THREE.Vector3(2000, 4000, 2000));
        
        if (stateRef.current.rainParticles) {
          const posAttr = stateRef.current.rainParticles.geometry.attributes.position;
          const arr = posAttr.array as Float32Array;
          const activeId = stateRef.current.activeWeatherId;

          // Dynamically adjust size & color during transitions
          const pointsMat = stateRef.current.rainParticles.material as THREE.PointsMaterial;
          if (activeId === 'snow') {
            pointsMat.color.setHex(0xffffff);
            pointsMat.size = 2.5;
          } else {
            pointsMat.color.setHex(0x93c5fd);
            pointsMat.size = 1.0;
          }

          const speedMultiplier = (activeId === 'snow' ? 65 : 150) * dt;
          for (let i = 1; i < arr.length; i += 3) {
            arr[i] -= speedMultiplier;
            if (activeId === 'snow') {
              arr[i-1] += 15 * dt; // blowing side wind
            }
            if (arr[i] < -200) {
              arr[i] = 250 + Math.random() * 150;
              arr[i-1] = (Math.random() - 0.5) * 800;
              arr[i+1] = (Math.random() - 0.5) * 800;
            }
          }
          posAttr.needsUpdate = true;
          stateRef.current.rainParticles.position.copy(physics.position);
        }

        // Slow clouds drift
        if (stateRef.current.cloudsGroup) {
          stateRef.current.cloudsGroup.children.forEach((cloud) => {
            cloud.position.x += 15 * dt;
            if (cloud.position.x > 6000) cloud.position.x = -6000;
          });
        }

        // Aurora Curtains ethereal waves
        if (stateRef.current.auroraRibbons && stateRef.current.auroraRibbons.length > 0) {
          const time = Date.now() * 0.001;
          stateRef.current.auroraRibbons.forEach((mesh, index) => {
            mesh.position.x += Math.sin(time + index) * 0.15;
            if (mesh.material && 'opacity' in mesh.material) {
              (mesh.material as any).opacity = 0.18 + Math.sin(time * 1.5 + index) * 0.08;
            }
          });
        }

        // Beautiful Camera Sweep
        if (mode === 'landing_challenge') {
          // Inner/outer spotter camera looking up at the high approaching plane
          const startCam = new THREE.Vector3(-180, 15, 300);
          const endCam = new THREE.Vector3(140, 95, -150);
          camera.position.lerpVectors(startCam, endCam, t);
          camera.lookAt(physics.position);
        } else {
          // Takeoff / Free Flight / Storm view
          // Sweep alongside the custom pavement of the runway, flying towards the waiting plane
          const zStart = -1600;
          const zEnd = 230;
          const camX = -90 + (t * 180) + Math.sin(t * Math.PI) * 45;
          const camY = 16 + (1 - t) * 65 + Math.sin(t * Math.PI) * 25;
          const camZ = zStart + t * (zEnd - zStart);
          camera.position.set(camX, camY, camZ);
          
          // Focus at the aircraft body coordinates
          camera.lookAt(physics.position.clone().add(new THREE.Vector3(0, 1.0, 0)));
        }

        // Auto-complete intro when the duration is surpassed
        if (t >= 1.0) {
          if (setIsIntroActive) {
            setIsIntroActive(false);
          }
        }

        // Render the pass
        renderer.render(scene, camera);

        // Push standard telemetry to HUD
        onTelemetryUpdate({
          speed: 0,
          altitude: Math.round(physics.getTelemetry().altitude),
          verticalSpeed: 0,
          throttle: 0,
          heading: Math.round(physics.getTelemetry().heading),
          pitch: Math.round(physics.getTelemetry().pitch),
          roll: Math.round(physics.getTelemetry().roll),
          landingGear: true,
          brakes: true,
          stalled: false,
          score: 0,
          takeoffSuccess: false,
          lastMessage: `🎬 FLIGHT INITIATION • SPECTATING RUNWAY STAGE`,
        });

        return;
      }

      // 1. REPLAY SYSTEM OVERRIDE (Checked first before normal game loop actions or pause skips)
      if (stateRef.current.isReplaying) {
        const frames = stateRef.current.recordedFrames;
        if (frames && frames.length > 0) {
          const idx = Math.max(0, Math.min(frames.length - 1, stateRef.current.replayFrameIndex));
          const frame = frames[idx];
          if (frame) {
            // Position plane visually based on recorded physical state
            planeGroup.position.set(frame.position.x, frame.position.y, frame.position.z);
            planeGroup.rotation.set(frame.rotation.x, frame.rotation.y, frame.rotation.z);

            // Animate structural components (propeller spin)
            if (stateRef.current.propellerMesh) {
              const spinRate = (frame.speedKnot + frame.throttle * 2) * dt * 0.4;
              stateRef.current.propellerMesh.rotation.z += spinRate;
            }

            // Afterburner size scale
            if (stateRef.current.afterburnerMesh) {
              const burnerScale = Math.max(0.2, (frame.throttle / 100) * (0.8 + Math.random() * 0.4));
              stateRef.current.afterburnerMesh.scale.set(burnerScale, burnerScale, burnerScale * 1.5);
            }

            // Gear retract/deploy representation
            if (stateRef.current.gearGroup && aircraft.id !== 'seaplane') {
              const isGearDown = frame.landingGear;
              const targetScaleY = isGearDown ? 1.0 : 0.04;
              stateRef.current.gearGroup.scale.y += (targetScaleY - stateRef.current.gearGroup.scale.y) * 4 * dt;
              stateRef.current.gearGroup.position.y += ((isGearDown ? 0 : 0.8) - stateRef.current.gearGroup.position.y) * 4 * dt;
            }

            // Lights positioning
            dirLightTarget.position.set(frame.position.x, frame.position.y, frame.position.z);
            sunLight.position.set(frame.position.x, frame.position.y, frame.position.z).add(new THREE.Vector3(2000, 4000, 2000));

            // Stormy weather rain simulation
            if (stateRef.current.rainParticles) {
              stateRef.current.rainParticles.position.set(frame.position.x, frame.position.y, frame.position.z);
            }

            // Camera calculations based on exact recorded coordinates
            const chaseDistance = fuselageLength * 2.2 + 20;
            const chaseHeight = fuselageRadius * 3.5 + 4.5;
            const framePos = new THREE.Vector3(frame.position.x, frame.position.y, frame.position.z);
            const frameRot = new THREE.Euler(frame.rotation.x, frame.rotation.y, frame.rotation.z);

            switch (stateRef.current.cameraMode) {
              case 'chase': {
                const backOffset = new THREE.Vector3(0, chaseHeight, chaseDistance).applyEuler(frameRot);
                const tgtCamPos = framePos.clone().add(backOffset);
                camera.position.lerp(tgtCamPos, 0.15);
                camera.lookAt(framePos.clone().add(new THREE.Vector3(0, 1.5, -fuselageLength * 0.4).applyEuler(frameRot)));
                break;
              }
              case 'cockpit': {
                const copitOffset = new THREE.Vector3(0, fuselageRadius * 0.7, -fuselageLength * 0.15).applyEuler(frameRot);
                camera.position.copy(framePos).add(copitOffset);
                const lookFwd = new THREE.Vector3(0, 0, -40).applyEuler(frameRot);
                camera.lookAt(framePos.clone().add(lookFwd));
                break;
              }
              case 'wing': {
                const wingOffset = new THREE.Vector3(-wingspan * 0.45, 1.2, 0).applyEuler(frameRot);
                camera.position.copy(framePos).add(wingOffset);
                camera.lookAt(framePos.clone().add(new THREE.Vector3(0, 0, -fuselageLength * 0.25).applyEuler(frameRot)));
                break;
              }
              case 'cinematic': {
                const towerPos = new THREE.Vector3(120, 80, -300);
                const distToPlane = towerPos.distanceTo(framePos);
                if (distToPlane > 1200) {
                  camera.position.copy(framePos).add(new THREE.Vector3(140, 40, -140));
                } else {
                  camera.position.copy(towerPos);
                }
                camera.lookAt(framePos);
                break;
              }
              case 'topDown': {
                camera.position.set(framePos.x, framePos.y + 400, framePos.z);
                camera.lookAt(framePos);
                break;
              }
            }

            // Push the matching frame telemetry down to upper panels
            const repTelemetry: FlightTelemetry = {
              speed: Math.round(frame.speedKnot),
              altitude: Math.round(frame.altitude),
              verticalSpeed: Math.round(frame.verticalSpeed),
              throttle: Math.round(frame.throttle),
              heading: Math.round(frame.heading),
              pitch: Math.round(frame.pitch),
              roll: Math.round(frame.roll),
              landingGear: frame.landingGear,
              brakes: frame.brakes,
              stalled: frame.stalled,
              score: frame.score,
              takeoffSuccess: true,
              lastMessage: `🎬 REPLAY MODE • CAMERA ASPECT: ${stateRef.current.cameraMode.toUpperCase()}`,
            };
            onTelemetryUpdate(repTelemetry);

            // Playback progress over time
            if (stateRef.current.replayPlaying) {
              stateRef.current.replayAccumulator += dt * stateRef.current.replaySpeed;
              if (stateRef.current.replayAccumulator >= 0.033) {
                const stepsInTime = Math.floor(stateRef.current.replayAccumulator / 0.033);
                stateRef.current.replayAccumulator %= 0.033;
                let nextIndex = stateRef.current.replayFrameIndex + stepsInTime;
                if (nextIndex >= frames.length) {
                  nextIndex = 0; // loops back to beginning automatically
                }
                stateRef.current.replayFrameIndex = nextIndex;
                if (stateRef.current.setReplayFrameIdxReact) {
                  stateRef.current.setReplayFrameIdxReact(nextIndex);
                }
              }
            }
          }
        }
        renderer.render(scene, camera);
        return;
      }

      // If flight is normally paused, skip further loops (checked after Replay!)
      if (stateRef.current.gamePaused) {
        // Render pause scene but skip physics calculations
        renderer.render(scene, camera);
        return;
      }

      // 2. LIVE GAME PLAY TELEMETRY RECORDING TICK (records 30s envelope)
      if (!stateRef.current.isReplaying && !stateRef.current.gamePaused) {
        stateRef.current.recordTimer += dt;
        if (stateRef.current.recordTimer >= 0.033) {
          stateRef.current.recordTimer = 0;
          
          const currentTelemetry = physics.getTelemetry();
          stateRef.current.recordedFrames.push({
            position: { x: physics.position.x, y: physics.position.y, z: physics.position.z },
            rotation: { x: physics.rotation.x, y: physics.rotation.y, z: physics.rotation.z },
            speed: currentTelemetry.speed,
            speedKnot: physics.speedKnot,
            altitude: currentTelemetry.altitude,
            verticalSpeed: currentTelemetry.verticalSpeed,
            throttle: physics.throttle,
            brakes: keysRef.current.brakes,
            landingGear: keysRef.current.landingGear,
            heading: currentTelemetry.heading,
            pitch: currentTelemetry.pitch,
            roll: currentTelemetry.roll,
            score: physics.score,
            lastMessage: physics.lastMessage,
            stalled: currentTelemetry.stalled,
          });

          // Enforce 30-second sliding buffer limit (~900 frames at 30Hz)
          if (stateRef.current.recordedFrames.length > 900) {
            stateRef.current.recordedFrames.shift();
          }
        }
      }

      // Record passive active flight duration
      if (!physics.isGrounded && !physics.hasLanded && !physics.hasCrashed) {
        stateRef.current.flightDuration += dt;
      }

      // Update dynamic weather progressive transitioner
      if (weatherTransitionerRef.current) {
        weatherTransitionerRef.current.update(dt, physics);
      }

      // Update flight aerodynamics state
      const windVel = (weatherTransitionerRef.current?.currentWeather?.windSpeed !== undefined)
        ? weatherTransitionerRef.current.currentWeather.windSpeed
        : weather.windSpeed;
      physics.update(dt, keysRef.current, mode === 'landing_challenge', windVel);

      // Track peak metrics
      const peakCheckTelemetry = physics.getTelemetry();
      if (peakCheckTelemetry.speed > stateRef.current.peakSpeed) {
        stateRef.current.peakSpeed = peakCheckTelemetry.speed;
      }
      if (peakCheckTelemetry.altitude > stateRef.current.peakAltitude) {
        stateRef.current.peakAltitude = peakCheckTelemetry.altitude;
      }

      // sync plane visual positions
      planeGroup.position.copy(physics.position);
      planeGroup.rotation.copy(physics.rotation);

      // Update light follow target
      dirLightTarget.position.copy(physics.position);
      sunLight.position.copy(physics.position).add(new THREE.Vector3(2000, 4000, 2000));

      // Modulate audio engine pitch & noise volume based on throttle
      const isJetSound = aircraft.id === 'f18_wasp' || aircraft.id === 'mil_f18' || aircraft.id === 'sky_liner' || aircraft.id.toLowerCase().includes('jet') || aircraft.id.toLowerCase().includes('liner') || aircraft.id.toLowerCase().includes('bomber');
      audioEngine.updateEnginePitch(physics.throttle, isJetSound);

      // Animated structural components (propeller spin)
      if (stateRef.current.propellerMesh) {
        // Propeller rotates proportional to forward speed and engine throttle
        const spinRate = (physics.speedKnot + physics.throttle * 2) * dt * 0.4;
        stateRef.current.propellerMesh.rotation.z += spinRate;
      }

      // Afterburner flame size fluctuates
      if (stateRef.current.afterburnerMesh) {
        const burnerScale = Math.max(0.2, (physics.throttle / 100) * (0.8 + Math.random() * 0.4));
        stateRef.current.afterburnerMesh.scale.set(burnerScale, burnerScale, burnerScale * 1.5);
      }

      // Smooth retractable gear animation
      if (stateRef.current.gearGroup && aircraft.id !== 'seaplane') {
        const isGearDown = keysRef.current.landingGear;
        const targetScaleY = isGearDown ? 1.0 : 0.04;
        stateRef.current.gearGroup.scale.y += (targetScaleY - stateRef.current.gearGroup.scale.y) * 4 * dt;
        stateRef.current.gearGroup.position.y += ((isGearDown ? 0 : 0.8) - stateRef.current.gearGroup.position.y) * 4 * dt;
      }

      // Checkpoints checking (Torus hoops)
      const flightPos = physics.position;
      stateRef.current.checkpoints.forEach((ring, idx) => {
        if (!ring.passed && idx === stateRef.current.currentCheckpointIndex) {
          const d = flightPos.distanceTo(ring.pos);
          if (d <= 95) { // wing overlaps checkpoint size
            ring.passed = true;
            (ring.mesh.material as THREE.MeshBasicMaterial).color.setHex(0x22c55e); // Turn Green!
            physics.score += 300;
            physics.lastMessage = `✨ CHECKPOINT ${idx + 1} PASSED! (+300 PTS)`;
            stateRef.current.currentCheckpointIndex++;
          }
        }
      });

      // Animate stormy rain/snow points centered around the plane
      if (stateRef.current.rainParticles) {
        const posAttr = stateRef.current.rainParticles.geometry.attributes.position;
        const arr = posAttr.array as Float32Array;
        const activeId = stateRef.current.activeWeatherId;

        // Dynamically adjust size & color during transitions
        const pointsMat = stateRef.current.rainParticles.material as THREE.PointsMaterial;
        if (activeId === 'snow') {
          pointsMat.color.setHex(0xffffff);
          pointsMat.size = 2.5;
        } else {
          pointsMat.color.setHex(0x93c5fd);
          pointsMat.size = 1.0;
        }

        const speedMultiplier = (activeId === 'snow' ? 65 : 150) * dt;

        for (let i = 1; i < arr.length; i += 3) {
          // move downwards
          arr[i] -= speedMultiplier;
          if (activeId === 'snow') {
            arr[i-1] += 15 * dt; // blowing side wind
          }
          if (arr[i] < -200) {
            arr[i] = 250 + Math.random() * 150; // loop back to ceiling
            arr[i-1] = (Math.random() - 0.5) * 800; // scatter around plane
            arr[i+1] = (Math.random() - 0.5) * 800;
          }
        }
        posAttr.needsUpdate = true;
        stateRef.current.rainParticles.position.copy(physics.position);
      }

      // Slow clouds drift
      if (stateRef.current.cloudsGroup) {
        stateRef.current.cloudsGroup.children.forEach((cloud) => {
          cloud.position.x += 15 * dt;
          if (cloud.position.x > 6000) cloud.position.x = -6000;
        });
      }

      // Aurora Curtains ethereal waves
      if (stateRef.current.auroraRibbons && stateRef.current.auroraRibbons.length > 0) {
        const time = Date.now() * 0.001;
        stateRef.current.auroraRibbons.forEach((mesh, index) => {
          mesh.position.x += Math.sin(time + index) * 0.15;
          if (mesh.material && 'opacity' in mesh.material) {
            (mesh.material as any).opacity = 0.18 + Math.sin(time * 1.5 + index) * 0.08;
          }
        });
      }

      // Update Camera positions
      const yaw = physics.rotation.y;
      const roll = physics.rotation.z;
      const pitch = physics.rotation.x;

      const chaseDistance = fuselageLength * 2.2 + 20;
      const chaseHeight = fuselageRadius * 3.5 + 4.5;

      switch (stateRef.current.cameraMode) {
        case 'chase': {
          // Classic follow behind aircraft with subtle lags and drifts
          const backOffset = new THREE.Vector3(0, chaseHeight, chaseDistance).applyEuler(physics.rotation);
          const tgtCamPos = physics.position.clone().add(backOffset);
          camera.position.lerp(tgtCamPos, 0.15); // smooth lerp
          camera.lookAt(physics.position.clone().add(new THREE.Vector3(0, 1.5, -fuselageLength * 0.4).applyEuler(physics.rotation)));
          break;
        }

        case 'cockpit': {
          // First person seated on flight deck looking ahead
          const copitOffset = new THREE.Vector3(0, fuselageRadius * 0.7, -fuselageLength * 0.15).applyEuler(physics.rotation);
          camera.position.copy(physics.position).add(copitOffset);
          const lookFwd = new THREE.Vector3(0, 0, -40).applyEuler(physics.rotation);
          camera.lookAt(physics.position.clone().add(lookFwd));
          break;
        }

        case 'wing': {
          // Camera placed on Left wing tip looking over the fuselage
          const wingOffset = new THREE.Vector3(-wingspan * 0.45, 1.2, 0).applyEuler(physics.rotation);
          camera.position.copy(physics.position).add(wingOffset);
          camera.lookAt(physics.position.clone().add(new THREE.Vector3(0, 0, -fuselageLength * 0.25).applyEuler(physics.rotation)));
          break;
        }

        case 'cinematic': {
          // Cinematic ground based spotting tower looking at plane
          const towerPos = new THREE.Vector3(120, 80, -300);
          const distToPlane = towerPos.distanceTo(physics.position);
          
          if (distToPlane > 1200) {
            // position camera ahead of plane Path to capture majestic face-on views
            const spawnAhead = physics.position.clone().add(physics.velocity.clone().normalize().multiplyScalar(400));
            camera.position.copy(spawnAhead).add(new THREE.Vector3(45, 15, 0));
          } else {
            camera.position.copy(towerPos);
          }
          camera.lookAt(physics.position);
          break;
        }

        case 'topDown': {
          // Vertical map viewing mode centered above
          camera.position.set(physics.position.x, physics.position.y + 400, physics.position.z);
          camera.lookAt(physics.position);
          break;
        }
      }

      // Render updated frame
      renderer.render(scene, camera);

      // Frame telemetry updates callback
      const currentTelemetry = physics.getTelemetry();
      onTelemetryUpdate(currentTelemetry);

      // Trigger Game Concluded checks (Crash or Landing success)
      if (physics.hasCrashed && !stateRef.current.crashTriggered) {
        stateRef.current.crashTriggered = true;
        setGamePaused(true);
        onGameEnded(
          true,
          Math.round(stateRef.current.peakSpeed),
          Math.round(stateRef.current.peakAltitude),
          Math.round(stateRef.current.flightDuration)
        );
      }
      
      if (physics.hasLanded && !stateRef.current.landingTriggered && physics.speedKnot < 5.0) {
        stateRef.current.landingTriggered = true;
        setGamePaused(true);
        onGameEnded(
          false,
          Math.round(stateRef.current.peakSpeed),
          Math.round(stateRef.current.peakAltitude),
          Math.round(stateRef.current.flightDuration)
        );
      }
    };

    mainLoop();

    // Resize monitoring handler
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Start procedural flight audio engine matching aircraft type
    const isJetSound = aircraft.id === 'f18_wasp' || aircraft.id === 'mil_f18' || aircraft.id === 'sky_liner' || aircraft.id.toLowerCase().includes('jet') || aircraft.id.toLowerCase().includes('liner') || aircraft.id.toLowerCase().includes('bomber');
    audioEngine.startFlightEngine(isJetSound);

    // Clean up hook
    return () => {
      cancelAnimationFrame(requestId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      audioEngine.stop();
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
    };

  }, [aircraft.id, mode]);

  return (
    <div 
      className="absolute inset-0 w-full h-full bg-slate-900 overflow-hidden select-none"
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        overscrollBehavior: 'none'
      }}
    >
      {/* Flight Canvas spot */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Embedded Floating Map overlay */}
      {showMap && !isReplaying && (
        <div className="absolute bottom-20 left-4 sm:left-6 w-44 h-44 bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 pointer-events-auto z-20 flex flex-col justify-between">
          <div className="text-[9px] text-slate-500 font-bold border-b border-slate-900 pb-1 flex justify-between">
            <span>SATELLITE MINIMAP</span>
            <span className="text-sky-400">STAGE RADAR</span>
          </div>
          
          {/* Simulated procedural 2D radar vector line */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden border border-slate-900 rounded bg-[#0b0f19] my-1">
            {/* Center Runway beacon */}
            <div className="absolute w-[2px] h-10 bg-yellow-400/40 transform -rotate-45" title="Local airport Runway" />
            
            {/* Mountain areas representation */}
            <div className="absolute top-2 right-4 w-4 h-4 rounded-full bg-slate-800 border border-slate-700/60 leading-none flex items-center justify-center text-[6px] text-slate-400">▲</div>
            <div className="absolute bottom-5 left-3 w-6 h-6 rounded-full bg-slate-800 border border-slate-700/60 leading-none flex items-center justify-center text-[6px] text-slate-400">▲</div>

            {/* Checkpoint Rings representation */}
            {stateRef.current.checkpoints.map((cp, idx) => {
              const isCurrent = idx === stateRef.current.currentCheckpointIndex;
              return (
                <div 
                  key={idx}
                  className={`absolute w-1.5 h-1.5 rounded-full ${
                    cp.passed ? 'bg-emerald-500' : isCurrent ? 'bg-sky-400 animate-ping' : 'bg-sky-600/50'
                  }`}
                  style={{
                    left: `${Math.round(50 + (cp.pos.x / 4000) * 40)}%`,
                    top: `${Math.round(50 + (cp.pos.z / 4000) * 40)}%`
                  }}
                />
              );
            })}

            {/* Jet aircraft blip dots */}
            <div 
              className="absolute w-2 h-2 bg-yellow-400 border border-slate-950 rounded-full animate-pulse flex items-center justify-center text-[5px]"
              style={{
                left: `${Math.round(50 + (physicsRef.current?.position.x ? (physicsRef.current.position.x / 4000) * 40 : 0))}%`,
                top: `${Math.round(50 + (physicsRef.current?.position.z ? (physicsRef.current.position.z / 4000) * 40 : 0))}%`
              }}
            >
              🛸
            </div>
          </div>

          <div className="text-[8px] text-slate-400 font-mono flex justify-between">
            <span>RNG: 4KM</span>
            <span>GRID: AUTO</span>
          </div>
        </div>
      )}

      {/* Control instruction floating card */}
      {!isReplaying && (
        <div className="hidden sm:block absolute bottom-20 right-4 sm:right-6 max-w-xs bg-slate-950/85 border border-slate-800/80 p-3 rounded-xl pointer-events-none z-20 text-[9px] text-slate-400 space-y-1.5">
          <span className="font-bold text-slate-300 block border-b border-slate-900 pb-0.5">🎮 AUTOPILOT REFERENCE</span>
          <div><span className="text-sky-300 font-bold">W / S:</span> Engine Throttle Up/Down</div>
          <div><span className="text-sky-300 font-bold">↑ | ↓:</span> Nose pitch down / pitch up</div>
          <div><span className="text-sky-300 font-bold">← | →:</span> Bank wings Roll left / right</div>
          <div><span className="text-sky-300 font-bold">A / D:</span> Yaw steer rudder left / right</div>
          <div><span className="text-sky-300 font-bold">G:</span> Retract/Deploy Landing Gear</div>
          <div><span className="text-sky-300 font-bold">B:</span> Apply wheel brakes (Grounded)</div>
          <div><span className="text-slate-300 font-bold">R Key / P Key:</span> Reset flight / Pause</div>
        </div>
      )}

      {/* Mobile Touch Overlay */}
      {!isReplaying && (
        <MobileControls
          aircraft={aircraft}
          keysRef={keysRef}
          currentThrottle={physicsRef.current?.throttle || 0}
          onCameraToggle={handleCameraToggle}
          onPauseToggle={() => setGamePaused(!gamePaused)}
          onResetToggle={handleResetFlight}
          isMuted={isMuted}
          onMuteToggle={handleMuteToggle}
        />
      )}

      {/* 🎬 DYNAMIC REPLAY OVERLAY SYSTEM */}
      {isReplaying && stateRef.current.recordedFrames && stateRef.current.recordedFrames.length > 0 && (
        <div id="flight-replay-hud" className="absolute inset-0 z-[25] pointer-events-none flex flex-col justify-between p-4 sm:p-6 font-mono bg-radial from-transparent via-slate-950/10 to-slate-950/40 animate-fade-in">
          
          {/* Top telemetry and indicator */}
          <div className="w-full flex flex-col sm:flex-row justify-between items-start gap-3">
            {/* Live Indicator flashing */}
            <div className="pointer-events-auto bg-slate-950/90 border border-amber-500/40 p-3 rounded-xl shadow-xl backdrop-blur-md flex items-center gap-3 max-w-xs">
              <div className="relative flex h-3.5 w-3.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
              </div>
              <div className="space-y-0.5">
                <span className="text-amber-400 font-extrabold text-[10px] tracking-widest block uppercase">🎬 REPLAY TRANSMISSION</span>
                <span className="text-[9px] text-slate-400 block leading-tight font-sans">
                  Analyzing physics telemetry. Use the player timeline to scrub.
                </span>
              </div>
            </div>

            {/* Quick Metrics of the frame being watched */}
            {(() => {
              const frames = stateRef.current.recordedFrames;
              const f = frames[Math.max(0, Math.min(frames.length - 1, localReplayIndex))] || frames[0];
              if (!f) return null;
              return (
                <div className="pointer-events-auto bg-slate-950/90 border border-slate-800/80 p-3 rounded-xl shadow-xl flex items-center gap-4 text-center text-[10px] backdrop-blur-md">
                  <div>
                    <span className="text-[8px] text-slate-500 block">SPEED</span>
                    <span className="text-white font-extrabold text-[11px] block">{Math.round(f.speedKnot)} kts</span>
                  </div>
                  <div className="border-l border-slate-800 h-6 shrink-0" />
                  <div>
                    <span className="text-[8px] text-slate-500 block">ALTITUDE</span>
                    <span className="text-emerald-400 font-extrabold text-[11px] block">{Math.round(f.altitude)} ft</span>
                  </div>
                  <div className="border-l border-slate-800 h-6 shrink-0" />
                  <div>
                    <span className="text-[8px] text-slate-500 block">VSI SPEED</span>
                    <span className={`font-extrabold text-[11px] block ${f.verticalSpeed >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {f.verticalSpeed >= 0 ? '+' : ''}{Math.round(f.verticalSpeed)} fpm
                    </span>
                  </div>
                  <div className="border-l border-slate-800 h-6 shrink-0" />
                  <div>
                    <span className="text-[8px] text-slate-500 block">THROTTLE</span>
                    <span className="text-blue-400 font-extrabold text-[11px] block">{f.throttle}%</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Bottom Timeline, Speed Controls and Cameras */}
          <div className="w-full space-y-3 pointer-events-auto max-w-4xl mx-auto">
            
            {/* Timeline Scrubbing slider */}
            <div className="bg-slate-950/90 border border-slate-800/85 rounded-xl p-3 shadow-2xl backdrop-blur-sm flex items-center gap-4">
              <span className="text-[9px] text-slate-500 font-black shrink-0 tracking-widest">START</span>
              
              <div className="flex-1 flex flex-col relative">
                <input
                  id="replay-time-scrubber-slider"
                  type="range"
                  min="0"
                  max={stateRef.current.recordedFrames.length - 1}
                  value={localReplayIndex}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value);
                    setLocalReplayIndex(idx);
                    stateRef.current.replayFrameIndex = idx;
                    stateRef.current.replayPlaying = false; // pause on manual dragging
                  }}
                  className="w-full accent-amber-500 bg-slate-900 hover:bg-slate-850 h-2 rounded-lg appearance-none cursor-pointer border border-slate-800 transition-all focus:outline-none"
                />
                
                {/* Visual marker tick showing progression */}
                <div className="flex justify-between text-[8px] text-slate-500 mt-1.5 select-none font-semibold">
                  <span>-30.0s</span>
                  <span>-22.5s</span>
                  <span>-15.0s</span>
                  <span>-7.5s</span>
                  <span className="text-amber-500/80 font-bold uppercase">PRESENT</span>
                </div>
              </div>

              <div className="shrink-0 text-amber-400 text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5 font-mono">
                FRAME {localReplayIndex + 1} / {stateRef.current.recordedFrames.length}
              </div>
            </div>

            {/* Complete Replay Controls layout */}
            <div className="bg-slate-950/90 border border-slate-800/85 rounded-2xl p-4 shadow-2xl backdrop-blur-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              
              {/* Play / pause / skip */}
              <div className="flex items-center gap-2">
                {/* Play/Pause Button */}
                <button
                  id="replay-playback-toggle"
                  onClick={() => {
                    stateRef.current.replayPlaying = !stateRef.current.replayPlaying;
                  }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    stateRef.current.replayPlaying 
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 animate-pulse' 
                      : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-500'
                  }`}
                  title={stateRef.current.replayPlaying ? "Pause Playback" : "Resume Playback"}
                >
                  {stateRef.current.replayPlaying ? (
                    <Pause className="w-4 h-4 fill-current text-slate-950" />
                  ) : (
                    <Play className="w-4 h-4 fill-current text-amber-500 pl-0.5" />
                  )}
                </button>

                {/* Rewind to first frame */}
                <button
                  id="replay-rewind-start-btn"
                  onClick={() => {
                    setLocalReplayIndex(0);
                    stateRef.current.replayFrameIndex = 0;
                    stateRef.current.replayPlaying = false;
                  }}
                  className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Rewind to Start"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                {/* Forward to latest frame */}
                <button
                  id="replay-forward-end-btn"
                  onClick={() => {
                    const lastIdx = stateRef.current.recordedFrames.length - 1;
                    setLocalReplayIndex(lastIdx);
                    stateRef.current.replayFrameIndex = lastIdx;
                    stateRef.current.replayPlaying = false;
                  }}
                  className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Skip to End"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                {/* Playback speed buttons */}
                <div className="h-10 bg-slate-900 border border-slate-850 p-1 rounded-xl flex items-center gap-0.5 ml-1">
                  {[0.5, 1.0, 2.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => {
                        stateRef.current.replaySpeed = spd;
                      }}
                      className={`text-[9px] font-black tracking-wider px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                        stateRef.current.replaySpeed === spd
                          ? 'bg-amber-500/25 text-amber-400 border border-amber-500/20'
                          : 'text-slate-500 hover:text-slate-350'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Angle selector quick badges */}
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
                <span className="text-[8px] text-slate-500 mr-1.5 uppercase font-black tracking-widest hidden lg:inline font-mono">CAM VIEW:</span>
                {[
                  { id: 'chase', label: 'CHASE' },
                  { id: 'cockpit', label: 'COCKPIT' },
                  { id: 'wing', label: 'WING' },
                  { id: 'cinematic', label: 'FLY-BY' },
                  { id: 'topDown', label: 'MAPVIEW' }
                ].map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => {
                      setCameraMode(cam.id);
                      stateRef.current.cameraMode = cam.id;
                    }}
                    className={`text-[9px] font-black tracking-widest py-1.5 px-2.5 rounded-lg border cursor-pointer transition-all uppercase whitespace-nowrap ${
                      cameraMode === cam.id
                        ? 'bg-sky-500/15 border-sky-450 text-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.1)]'
                        : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>

              {/* Close Replay Back-To-Base */}
              <button
                id="replay-exit-btn"
                onClick={() => {
                  if (setIsReplaying) {
                    setIsReplaying(false);
                  }
                }}
                className="w-full md:w-auto py-2.5 px-4 font-bold tracking-widest text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl cursor-pointer text-center text-xs transition-all shadow-md flex items-center justify-center gap-2 font-mono"
              >
                <X className="w-3.5 h-3.5 text-slate-950" /> RETURN
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
