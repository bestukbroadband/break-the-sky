import MobileControls from './MobileControlsUI';

export default MobileControls;

export interface InputStatePayload {
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
}

export const initialInputState: InputStatePayload = {
  pitchUp: false,
  pitchDown: false,
  rollLeft: false,
  rollRight: false,
  yawLeft: false,
  yawRight: false,
  throttleUp: false,
  throttleDown: false,
  brakes: false,
  landingGear: true, // Default landing gear extended
  pitch: 0,
  roll: 0,
  yaw: 0,
  throttleOverride: undefined,
};

/**
 * Standard unified 'InputState' ref.
 * Ensures all UI components, mobile controls, keyboard listeners, and the 3D FlightScene
 * read from and write to a single absolute source of truth.
 */
export const InputState = {
  current: { ...initialInputState }
};

// Provide InputStateRef as an alias for additional flexibility & backwards-compatibility
export const InputStateRef = InputState;

/**
 * Cleanly reset the standard input state to default positions on mission restart or termination
 */
export function resetInputState() {
  InputState.current = { ...initialInputState };
}
