import * as THREE from 'three';
import { Aircraft, FlightTelemetry } from '../types';

export class FlightPhysics {
  public aircraft: Aircraft;
  public position: THREE.Vector3;
  public rotation: THREE.Euler; // pitch: x, yaw: y, roll: z
  public velocity: THREE.Vector3;
  public speedKnot: number = 0; // forward speed in knots
  public throttle: number = 0; // 0 to 100
  public landingGear: boolean = true;
  public brakes: boolean = false;
  public stalled: boolean = false;
  
  // Scoring & flight state
  public score: number = 0;
  public takeoffSuccess: boolean = false;
  public lastMessage: string = "Ready for departure. Max throttle to takeoff!";
  public isGrounded: boolean = true;
  public hasCrashed: boolean = false;
  public hasLanded: boolean = false;

  // Emergency failures state
  public activeFailure: 'bird_strike' | 'engine_flameout' | 'gear_jam' | null = null;
  public failureMessage: string = "";
  public failureLogged: boolean = false;
  private flightTimeAirborne: number = 0;
  private failureScheduledTime: number = 0;
  private hasScheduledFailure: boolean = false;
  private scheduledFailureType: 'bird_strike' | 'engine_flameout' | 'gear_jam' = 'engine_flameout';
  
  // Constants
  private readonly KNOT_TO_M_PER_S = 0.514444;
  private readonly M_PER_S_TO_KNOT = 1.94384;
  
  constructor(aircraft: Aircraft, startPos: THREE.Vector3, startRot: THREE.Euler) {
    this.aircraft = aircraft;
    this.position = startPos.clone();
    this.rotation = startRot.clone();
    this.velocity = new THREE.Vector3();
    
    // Wind/Glider adjustments
    if (!this.aircraft.hasEngine) {
      this.throttle = 0;
      this.isGrounded = false; // Gliders start airborne or dragged
      this.speedKnot = 40; // baseline speed
    } else {
      this.throttle = 0;
      this.isGrounded = true;
      this.speedKnot = 0;
    }

    // Schedule a potential emergency failure mid-flight
    // 35% probability of scheduling per scenario
    this.hasScheduledFailure = false;
    if (Math.random() < 0.35) {
      const failures: ('bird_strike' | 'engine_flameout' | 'gear_jam')[] = [];
      if (this.aircraft.hasEngine) {
        failures.push('bird_strike', 'engine_flameout');
      } else {
        failures.push('bird_strike');
      }
      if (this.aircraft.hasLandingGear) {
        failures.push('gear_jam');
      }
      
      if (failures.length > 0) {
        this.hasScheduledFailure = true;
        this.scheduledFailureType = failures[Math.floor(Math.random() * failures.length)];
        this.failureScheduledTime = 12 + Math.random() * 15; // Trigger after 12-27 seconds of airborne flight
        this.activeFailure = null;
      }
    }
  }

  public triggerEmergency(type: 'bird_strike' | 'engine_flameout' | 'gear_jam') {
    if (this.hasCrashed || this.hasLanded) return;
    this.activeFailure = type;
    this.failureLogged = true;
    
    switch (type) {
      case 'bird_strike':
        this.failureMessage = "🚨 BIRD STRIKE! Engine compressor damaged (power max 25%), severe wing drag & left rolling drift!";
        this.lastMessage = "⚠️ WARNING: BIRD STRIKE! Engine and wings damaged! Stabilize immediately!";
        this.score = Math.max(0, this.score - 150);
        break;
      case 'engine_flameout':
        this.failureMessage = "🚨 ENGINE FLAMEOUT! Fuel feed lost. Engine shut down completely. Glide down safely!";
        this.lastMessage = "⚠️ WARNING: ENGINE FLAMEOUT! Loss of thrust! Pitch down to glide!";
        this.throttle = 0;
        this.score = Math.max(0, this.score - 150);
        break;
      case 'gear_jam':
        this.failureMessage = "🚨 LANDING GEAR STUCK RETRACTED! Gear actuators jammed. Prepare for high-stakes belly touchdown!";
        this.lastMessage = "⚠️ WARNING: LANDING GEAR FAILURE! Align wings perfectly and touch down cushion-soft!";
        this.landingGear = false;
        this.score = Math.max(0, this.score - 150);
        break;
    }
  }

  public update(dt: number, keys: any, isLandingChallenge: boolean, windSpeed: number = 0) {
    if (this.hasCrashed || this.hasLanded) return;

    // Check airborne scheduled emergency failure trigger mid-flight
    if (!this.isGrounded) {
      this.flightTimeAirborne += dt;
      if (this.hasScheduledFailure && this.activeFailure === null && this.flightTimeAirborne >= this.failureScheduledTime) {
        this.triggerEmergency(this.scheduledFailureType);
      }
    }

    // 1. Throttle Input
    if (this.aircraft.hasEngine && this.activeFailure !== 'engine_flameout') {
      if (keys.throttleUp) {
        this.throttle = Math.min(100, this.throttle + dt * 40);
      }
      if (keys.throttleDown) {
        this.throttle = Math.max(0, this.throttle - dt * 40);
      }
    } else {
      this.throttle = 0; // Forced off or glider
    }

    // Landing gear & Brakes
    if (keys.brakes) {
      this.brakes = true;
    } else {
      this.brakes = false;
    }
    
    // Toggle landing gear (handled in controls keypress normally, but reflect state)
    // Locked retracted if gear jam is currently active
    if (this.activeFailure === 'gear_jam') {
      this.landingGear = false;
    } else {
      this.landingGear = keys.landingGear;
    }

    // 2. Compute Pitch, Roll, Yaw target adjustments
    let speedStiffness = 1.0;
    if (this.speedKnot > 450) {
      // Supersonic atmospheric compression locks control surfaces!
      speedStiffness = Math.max(0.32, 1.0 - (this.speedKnot - 450) / 800);
    }

    let pitchFactor = this.aircraft.pitchSpeed * 0.8 * speedStiffness;
    let rollFactor = this.aircraft.rollSpeed * 1.0 * speedStiffness;
    let yawFactor = this.aircraft.yawSpeed * 0.6 * speedStiffness;

    // Recon jet (delta wing) handles poorly at low airspeeds
    if (this.aircraft.id === 'recon_jet' && this.speedKnot < 220) {
      const lowSpeedControlDamp = Math.max(0.28, this.speedKnot / 220);
      pitchFactor *= lowSpeedControlDamp;
      rollFactor *= lowSpeedControlDamp;
    }

    // Spitfire (ww2_fighter) is exceptionally nimble and agile
    if (this.aircraft.id === 'ww2_fighter') {
      // Extremely sharp rolls in low altitude dogfights
      rollFactor *= (this.position.y < 1200 ? 1.15 : 1.0);
    }

    // Heavy strategic giants have massive rotational inertia
    if (this.aircraft.id === 'heavy_bomber' || this.aircraft.id === 'stealth_bomber') {
      pitchFactor *= 0.85;
      rollFactor *= 0.8;
    }

    // Ground resistance blocks roll and pitch
    if (this.isGrounded) {
      this.rotation.z = 0; // No roll on ground
      if (keys.pitchUp && this.speedKnot > this.aircraft.takeoffSpeed) {
        // Can pitch up to liftoff
        this.rotation.x += pitchFactor * dt;
      } else {
        this.rotation.x = 0; // level nose on runway
      }
      
      // Yaw/steer on taxiway
      if (keys.yawLeft) {
        this.rotation.y += yawFactor * dt * (this.speedKnot / 20);
      }
      if (keys.yawRight) {
        this.rotation.y -= yawFactor * dt * (this.speedKnot / 20);
      }
    } else {
      // In-flight rotations
      // Pitch (nose up / down)
      if (keys.pitchUp) {
        this.rotation.x += pitchFactor * dt;
      }
      if (keys.pitchDown) {
        this.rotation.x -= pitchFactor * dt;
      }
      
      // Roll (bank wings left / right)
      if (keys.rollLeft) {
        this.rotation.z += rollFactor * dt;
      }
      if (keys.rollRight) {
        this.rotation.z -= rollFactor * dt;
      }
      
      // Yaw (rudder direction pivot left / right)
      if (keys.yawLeft) {
        this.rotation.y += yawFactor * dt;
      }
      if (keys.yawRight) {
        this.rotation.y -= yawFactor * dt;
      }

      // Roll recovery: gently auto-level roll a tiny bit if no roll keys pressed (safety/stability)
      // Custom heavy auto-stability return for heavy strategic bombers
      const stabilizationRate = (this.aircraft.id === 'heavy_bomber' || this.aircraft.id === 'stealth_bomber') ? 2.5 : 1.5;
      if (!keys.rollLeft && !keys.rollRight) {
        this.rotation.z *= Math.exp(-stabilizationRate * dt);
      }

      // BIRD STRIKE aerodynamic damage side imbalance pull
      if (this.activeFailure === 'bird_strike') {
        const driftForce = -0.16; // constantly banks left
        this.rotation.z += driftForce * dt;
        this.rotation.x -= 0.015 * dt; // slightly pull nose down
      }
    }

    // Keep rotations within readable angles
    this.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.rotation.x)); // nose pitch max 60 deg
    this.rotation.z = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.z)); // roll max 90 deg

    // 3. Forward Thrust Calculation
    // Gliders have no thrust but can trade altitude for speed
    let thrust = 0;
    if (this.aircraft.hasEngine) {
      const maxThrust = (this.aircraft.maxSpeed * 8) * (this.aircraft.weight / 10000);
      let powerSource = this.throttle;
      if (this.activeFailure === 'engine_flameout') {
        powerSource = 0;
      }
      
      thrust = (powerSource / 100) * maxThrust;

      // Bird strike engine damage restricts power to 25%
      if (this.activeFailure === 'bird_strike') {
        thrust = Math.min(thrust, maxThrust * 0.25);
      }
    }

    // 4. Aerodynamic Forces: Drag & Lift
    const density = 1.225; // standard air density
    const speedMps = this.speedKnot * this.KNOT_TO_M_PER_S;
    
    // Lift: L = 1/2 * d * v^2 * S * Cl
    // Speed increases lift square. Pitch up increases lift but increases drag.
    const wingArea = (this.aircraft.weight / 40); // estimate wing load
    const angleOfAttack = this.rotation.x + 0.05; // natural wing tilt
    let lift = 0.5 * density * Math.pow(speedMps, 2) * wingArea * this.aircraft.liftCoefficient * Math.max(0, angleOfAttack + 0.1);

    // Glider relies heavily on lift coefficient and sink rate
    if (!this.aircraft.hasEngine) {
      // Glider lift is boosted slightly to allow beautiful floats
      lift *= 1.35;
    }

    // Drag: D = 1/2 * d * v^2 * S * Cd
    let dragCoefficient = this.aircraft.dragCoefficient;
    if (this.landingGear) dragCoefficient += 0.03; // extended gear drag
    if (this.brakes && this.isGrounded) dragCoefficient += 0.25; // ground brake drag
    
    // Bird strike wing tears increases drag significantly
    if (this.activeFailure === 'bird_strike') {
      dragCoefficient += 0.12;
    }

    // Induced drag from high attack angle / turns
    const inducedDrag = Math.abs(this.rotation.x) * 0.05 + Math.abs(this.rotation.z) * 0.03;
    const drag = 0.5 * density * Math.pow(speedMps + 2, 2) * wingArea * (dragCoefficient + inducedDrag);

    // 5. Gravity Code
    const gravityForce = (this.aircraft.weight * 0.453592) * 9.81; // in Newtons

    // 6. Stall mechanics
    // A stall occurs when speed is too low to produce enough lift
    const minSafeSpeed = this.aircraft.takeoffSpeed * 0.85;
    if (this.speedKnot < minSafeSpeed && !this.isGrounded) {
      if (!this.stalled) {
        this.stalled = true;
        this.score = Math.max(0, this.score - 50);
        this.lastMessage = "⚠️ WARNING: STALL! Gain speed immediately!";
      }
      // Stalling nose pitches down automatically due to center of gravity, loses lift
      this.rotation.x -= dt * 0.4;
      lift *= 0.15; // lose 85% of lift
    } else {
      this.stalled = false;
    }

    // 7. Calculate Acceleration forces relative to plane forward direction
    const forwardDir = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);
    const planeUpDir = new THREE.Vector3(0, 1, 0).applyEuler(this.rotation);
    const planeLeftDir = new THREE.Vector3(-1, 0, 0).applyEuler(this.rotation);

    // Turn lift: standard lift acts upwards perpendicular to wings. If rolled, it turns the plane!
    const liftForceVector = planeUpDir.clone().multiplyScalar(lift);
    const dragForceVector = forwardDir.clone().normalize().multiplyScalar(-drag);
    const thrustForceVector = forwardDir.clone().normalize().multiplyScalar(thrust);
    const gravityForceVector = new THREE.Vector3(0, -gravityForce, 0);

    // Wind gust drift (primarily storm mode)
    const windForceVector = new THREE.Vector3(0, 0, 0);
    if (windSpeed > 0) {
      // Wind drifts light planes easily, but heavy aircraft remain extremely steady
      const windInertiaReduction = Math.max(0.12, 10000 / this.aircraft.weight);
      windForceVector.set(
        Math.sin(this.position.z * 0.005) * windSpeed * 20 * windInertiaReduction, 
        0, 
        Math.cos(this.position.x * 0.005) * windSpeed * 10 * windInertiaReduction
      );
    }

    // Total forces (in Newtons)
    const massKg = (this.aircraft.weight * 0.453592);
    const netForce = new THREE.Vector3()
      .add(thrustForceVector)
      .add(dragForceVector)
      .add(liftForceVector)
      .add(gravityForceVector)
      .add(windForceVector);

    const acceleration = netForce.divideScalar(massKg);

    // Update velocity
    this.velocity.addScaledVector(acceleration, dt);

    // Clamp forward speed
    let currentForwardVelocity = this.velocity.dot(forwardDir);
    
    // Taxi speed controller
    if (this.isGrounded) {
      // Ground brakes/friction decelerates
      if (this.brakes) {
        currentForwardVelocity = Math.max(0, currentForwardVelocity - dt * 25.0);
      } else {
        // Rolling resistance
        currentForwardVelocity = Math.max(0, currentForwardVelocity - dt * 1.5);
      }
      
      // Clamp speed from going backward
      if (currentForwardVelocity < 0.1) {
        currentForwardVelocity = 0;
      }
      
      // Re-assign velocity purely along ground forward direction
      const groundForward = new THREE.Vector3(forwardDir.x, 0, forwardDir.z).normalize();
      this.velocity.copy(groundForward).multiplyScalar(currentForwardVelocity);
      this.velocity.y = 0;
    }

    // Calculate flight speeds
    this.speedKnot = this.velocity.length() * this.M_PER_S_TO_KNOT;

    // Glider trades height for speed mechanics
    if (!this.aircraft.hasEngine && !this.isGrounded) {
      // gliding force keeps glide ratio
      if (this.rotation.x < -0.05) {
        // diving speeds up
        this.speedKnot += Math.abs(this.rotation.x) * dt * 35;
      } else {
        // climbing slows down
        this.speedKnot -= (this.rotation.x + 0.02) * dt * 28;
      }
      this.speedKnot = Math.max(15, Math.min(this.aircraft.maxSpeed, this.speedKnot));
      // align speed vectors
      this.velocity.copy(forwardDir).multiplyScalar(this.speedKnot * this.KNOT_TO_M_PER_S);
    }

    // Update Position
    this.position.addScaledVector(this.velocity, dt);

    // 8. Ground Level Interactions / Landing Detection
    const terrainHeight = this.getTerrainHeightAt(this.position.x, this.position.z);
    const airportElevation = 1.0; // Runway sits at Y = 1.0
    const runwayBoundZMin = -2000;
    const runwayBoundZMax = 500;
    const runwayBoundXMax = 60; // 120m wide, so -60 to 60

    const onRunwayStrip = (
      this.position.z >= runwayBoundZMin &&
      this.position.z <= runwayBoundZMax &&
      Math.abs(this.position.x) <= runwayBoundXMax
    );

    const minHeight = onRunwayStrip ? airportElevation : Math.max(airportElevation - 0.5, terrainHeight);

    // Point calculations
    if (this.isGrounded) {
      this.position.y = airportElevation;
      
      // If we match takeoff speed and pitch up, we lift off!
      if (this.speedKnot > this.aircraft.takeoffSpeed && this.rotation.x > 0.04) {
        this.isGrounded = false;
        this.velocity.y = 2.0; // small initial lift boost
        this.score += 200;
        this.takeoffSuccess = true;
        this.lastMessage = "🛫 TAKEOFF SUCCESSFUL! Gain altitude and keep wings level.";
      }
    } else {
      // We are airborne
      // If we drop below our minimum height, we impact the ground/water
      if (this.position.y <= minHeight + 1.2) {
        // LANDING OR CRASH DETERMINATION!
        const verticalDescentRate = this.velocity.y * 196.85; // ft/min
        
        // Is it water? (If outside ground but below sea level)
        const isWaterBody = (terrainHeight <= 1.0 && !onRunwayStrip);

        // Seaplane landing criteria
        const canLandOnWater = (this.aircraft.id === 'seaplane' && isWaterBody);
        const landingSurfaceOk = onRunwayStrip || canLandOnWater;

        // Visual rules for landing:
        // 1. Gently descending (e.g., descent rate between -650 ft/min and 0, or -250 if gear is jammed)
        // 2. Clear surface
        // 3. Landing gear must be extended (ignored if gear is jammed but forces extreme criteria)
        // 4. Level wings (roll between -12 and +12 degrees, or perfect -4 to +4 if gear is jammed)
        // 5. Landing speed check
        
        const limitDescent = this.activeFailure === 'gear_jam' ? -250 : -850;
        const descentRateSafe = verticalDescentRate >= limitDescent;
        
        const limitRoll = this.activeFailure === 'gear_jam' ? 0.075 : 0.22; // strict 4 deg vs 12 deg
        const wingsLevel = Math.abs(this.rotation.z) < limitRoll;
        
        // Landing gearextended is true if we don't have it, or it is down.
        // If gear_jam is active, we bypass gear extended check because it's physically jammed retracted, 
        // allowing a safe belly landing IF descentRateSafe and wingsLevel are both met!
        const landingGearExtended = !this.aircraft.hasLandingGear || this.landingGear || this.activeFailure === 'gear_jam';

        if (landingSurfaceOk && descentRateSafe && wingsLevel && landingGearExtended) {
          // TOUCHDOWN OK!
          if (canLandOnWater) {
            this.lastMessage = "🌊 Water landing successful! Water taxing active.";
          } else if (this.activeFailure === 'gear_jam') {
            this.lastMessage = "🏆 COLD-BLOODED PILOT! Masterful emergency belly landing without landing gear!";
          } else {
            this.lastMessage = "🛬 Smooth landing! Applying automatic brake pressure.";
          }
          
          this.isGrounded = !canLandOnWater; // water landing still floats
          this.position.y = minHeight;
          this.rotation.x = 0;
          this.rotation.z = 0;
          this.velocity.y = 0;
          
          // Add landing score!
          if (!this.hasLanded) {
            this.hasLanded = true;
            // score logic based on landing precision
            const speedPenalty = Math.max(0, this.speedKnot - this.aircraft.takeoffSpeed);
            const descentPenalty = Math.abs(verticalDescentRate) / 2;
            const centerPenalty = Math.abs(this.position.x) * 4;
            
            let finalLandingScore = Math.max(100, Math.round(1500 - speedPenalty - descentPenalty - centerPenalty));
            
            // Add a massive emergency landing bonus!
            if (this.activeFailure !== null) {
              finalLandingScore += 1000;
              this.score += 1000;
            }
            this.score += finalLandingScore;
          }
        } else {
          // CRASH SYSTEM
          this.hasCrashed = true;
          const isGearJammedActive = this.activeFailure === 'gear_jam';
          this.lastMessage = this.getCrashReason(
            onRunwayStrip, 
            isWaterBody, 
            landingGearExtended, 
            descentRateSafe, 
            wingsLevel, 
            verticalDescentRate,
            isGearJammedActive
          );
        }
      }
    }

    // Gentle passive points for stable flight
    if (!this.isGrounded && !this.stalled && !this.hasCrashed && !this.hasLanded) {
      if (Math.abs(this.rotation.z) < 0.1 && this.position.y > 100) {
        this.score += Math.random() < 0.05 ? 10 : 0; // passive score
      }
    }
  }

  private getCrashReason(
    onRunway: boolean, 
    isWater: boolean, 
    gearExt: boolean, 
    descSafe: boolean, 
    levelWings: boolean, 
    vrate: number,
    gearJammed: boolean
  ): string {
    if (isWater && this.aircraft.id !== 'seaplane') {
      return "💥 CRASHED: Water impact! Only the Seaplane can survive sea landings.";
    }
    if (!onRunway && !isWater) {
      return "💥 CRASHED: Rough terrain impact! Land strictly on the concrete airport runway.";
    }
    if (gearJammed && !descSafe) {
      return `💥 CRASHED: Hard belly landing! Descent was ${Math.round(vrate)} ft/min (limit with jammed gear is -250 ft/min!).`;
    }
    if (gearJammed && !levelWings) {
      return "💥 CRASHED: Wing tip scrape! Safe emergency belly landing requires keeping wings perfectly level (< 4°).";
    }
    if (!gearExt) {
      return "💥 CRASHED: Belly landing! You forgot to retract and deploy your Landing Gear (G).";
    }
    if (!descSafe) {
      return `💥 CRASHED: Hard landing! Your descent rate was ${Math.round(vrate)} ft/min (limit is -850 ft/min).`;
    }
    if (!levelWings) {
      return "💥 CRASHED: Wing strike! Keep your wings parallel to the ground during touchdown.";
    }
    return "💥 CRASHED: Critical structural impact during approach.";
  }

  // Simplified procedural terrain height helper matching 3D landscape
  public getTerrainHeightAt(x: number, z: number): number {
    // Water region is far out
    const distFromOrigin = Math.sqrt(x * x + z * z);
    if (distFromOrigin > 3500) {
      return 0; // Deep ocean
    }
    
    // Mountains
    let height = 0;
    
    // Prominent hills in certain segments
    // Simple mathematical hill layers
    const hill1 = Math.sin(x * 0.001) * Math.cos(z * 0.001) * 280;
    const hill2 = Math.cos(x * 0.0003 + 2.0) * Math.sin(z * 0.0003 - 1.0) * 450;
    
    if (hill1 > 0) height += hill1;
    if (hill2 > 0) height += hill2;

    // Flatten airport grounds near center runway
    const airportRadius = 600;
    if (distFromOrigin < airportRadius) {
      const blendFactor = distFromOrigin / airportRadius;
      height = height * Math.pow(blendFactor, 2); // blend to flat 0
    }

    return Math.max(1.0, height);
  }

  // Generate complete HUD telemetry values
  public getTelemetry(): FlightTelemetry {
    // Pitch & roll back to user degrees
    const pitchDeg = Math.round(this.rotation.x * (180 / Math.PI));
    const rollDeg = Math.round(this.rotation.z * (180 / Math.PI));
    
    // Heading calculations: Three.js negative-Z is 0 (North), negative-X is 270 (West), positive-X is 90 (East), positive-Z is 180 (South)
    let headingDeg = Math.round(-this.rotation.y * (180 / Math.PI)) % 360;
    if (headingDeg < 0) headingDeg += 360;

    // Vertical speed convert from m/s upward to feet per minute
    const vSpeedFpm = Math.round(this.velocity.y * 196.85);

    return {
      speed: Math.round(this.speedKnot),
      altitude: Math.round(this.position.y * 3.28084), // meters to feet (approx)
      pitch: pitchDeg,
      roll: rollDeg,
      heading: headingDeg,
      throttle: Math.round(this.throttle),
      verticalSpeed: vSpeedFpm,
      landingGear: this.landingGear,
      brakes: this.brakes,
      stalled: this.stalled,
      score: this.score,
      takeoffSuccess: this.takeoffSuccess,
      lastMessage: this.lastMessage,
      failureType: this.activeFailure,
      failureMessage: this.failureMessage || undefined,
    };
  }

  // Fast reset action
  public resetTo(startPos: THREE.Vector3, startRot: THREE.Euler) {
    this.position.copy(startPos);
    this.rotation.copy(startRot);
    this.velocity.set(0, 0, 0);
    this.speedKnot = !this.aircraft.hasEngine ? 40 : 0;
    this.throttle = !this.aircraft.hasEngine ? 0 : 45;
    this.landingGear = true;
    this.brakes = false;
    this.stalled = false;
    this.hasCrashed = false;
    this.hasLanded = false;
    this.isGrounded = this.aircraft.hasEngine;
    
    // Reset emergency fields
    this.activeFailure = null;
    this.failureMessage = "";
    this.failureLogged = false;
    this.flightTimeAirborne = 0;

    // Re-schedule emergency chance for the next run
    this.hasScheduledFailure = false;
    if (Math.random() < 0.35) {
      const failures: ('bird_strike' | 'engine_flameout' | 'gear_jam')[] = [];
      if (this.aircraft.hasEngine) {
        failures.push('bird_strike', 'engine_flameout');
      } else {
        failures.push('bird_strike');
      }
      if (this.aircraft.hasLandingGear) {
        failures.push('gear_jam');
      }
      
      if (failures.length > 0) {
        this.hasScheduledFailure = true;
        this.scheduledFailureType = failures[Math.floor(Math.random() * failures.length)];
        this.failureScheduledTime = 12 + Math.random() * 15;
      }
    }
    
    this.lastMessage = "Simulation reset active. Flight parameters cleared.";
  }
}
