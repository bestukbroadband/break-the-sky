export interface Aircraft {
  id: string;
  name: string;
  type: string;
  category: 'Beginner' | 'Classic' | 'Commercial' | 'Military' | 'Specialist';
  description: string;
  // Handling traits
  maxSpeed: number; // knots
  climbRate: number; // rate of ascent/descent
  maneuverability: number; // 1-10 rating
  weight: number; // lb
  hasEngine: boolean;
  hasLandingGear: boolean;
  takeoffSpeed: number; // knots threshold
  dragCoefficient: number;
  liftCoefficient: number;
  rollSpeed: number;
  pitchSpeed: number;
  yawSpeed: number;
  // Styling hints for renderer
  color: string;
  accentColor: string;
}

export type WeatherType = 'morning' | 'afternoon' | 'sunset' | 'night' | 'rain' | 'fog' | 'snow' | 'aurora';

export interface WeatherOption {
  id: WeatherType;
  name: string;
  timeOfDay: string;
  fogDensity: number;
  lightColor: string;
  lightIntensity: number;
  skyColor: string;
  groundColor: string;
  description: string;
  hasRain: boolean;
  windSpeed: number; // affects glide/flight
}

export type GameMode = 'free_flight' | 'landing_challenge' | 'coastal_tour' | 'mountain_run' | 'storm_flight';

export interface FlightTelemetry {
  speed: number; // knots
  altitude: number; // feet
  pitch: number; // degrees
  roll: number; // degrees
  heading: number; // degrees (0-359)
  throttle: number; // percentage (0-100)
  verticalSpeed: number; // ft/min
  landingGear: boolean; // extended/retracted
  brakes: boolean; // active/inactive
  stalled: boolean;
  score: number;
  takeoffSuccess: boolean;
  lastMessage: string;
  failureType?: 'bird_strike' | 'engine_flameout' | 'gear_jam' | null;
  failureMessage?: string;
}

export interface ControlState {
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
  reset: boolean;
}

export interface FlightRecord {
  id: string;
  timestamp: number;
  aircraftId: string;
  aircraftName: string;
  mode: GameMode;
  weatherName: string;
  weatherId?: string;
  topSpeed: number; // knots
  maxAltitude: number; // feet
  flightDuration: number; // seconds
  status: 'landed' | 'crashed' | 'ongoing' | 'aborted';
  landingRate: number; // final vertical rate in ft/min
  score: number;
  summary: string; // Brief description
}

