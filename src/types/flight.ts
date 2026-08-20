export type FlapStage = 0 | 1 | 2;

export type CameraMode = 'chase' | 'cockpit' | 'free';

export interface FlightTelemetry {
  position: [number, number, number];
  velocity: [number, number, number];
  rotation: [number, number, number]; // [pitch, yaw, roll] in radians
  pitchDeg: number;
  rollDeg: number;
  yawDeg: number;
  airspeedKnots: number;
  airspeedMs: number;
  altitudeMeters: number;
  altitudeFeet: number;
  verticalSpeedMs: number;
  throttle: number; // 0 to 100
  flapStage: FlapStage;
  isBraking: boolean;
  isGrounded: boolean;
  isStalling: boolean;
  isCrashed: boolean;
  crashReason: string | null;
  isLanded: boolean;
  health: number; // 0 to 100
  maxHealth: number; // 100
}

export interface ControlInputs {
  pitch: number; // -1 (down/push) to 1 (up/pull)
  roll: number;  // -1 (left) to 1 (right)
  yaw: number;   // -1 (left) to 1 (right)
  throttle: number; // 0 to 100
  flapStage: FlapStage;
  brakes: boolean;
  fire: boolean;
}

export interface FlapConfiguration {
  stage: FlapStage;
  label: string;
  angleDeg: number;
  liftCoeff: number;
  dragCoeff: number;
  stallSpeedKnots: number;
}

export interface RunwayZone {
  id: string;
  name: string;
  center: [number, number, number];
  length: number;
  width: number;
  elevation: number;
  headingDeg: number;
}

export interface MountainHazard {
  id: string;
  position: [number, number, number];
  radius: number;
  height: number;
}

export interface RemotePlayer {
  id: string;
  callsign: string;
  color: string;
  accentColor: string;
  wingColor: string;
  position: [number, number, number];
  quaternion: [number, number, number, number]; // [x, y, z, w]
  throttle: number;
  flapStage: FlapStage;
  rollInput: number;
  pitchInput: number;
  yawInput: number;
  forwardSpeed: number;
  isGrounded: boolean;
  isCrashed: boolean;
  crashReason: string | null;
  health: number; // 0 to 100
  maxHealth: number; // 100
}

export interface LocalPlayerIdentity {
  id: string;
  callsign: string;
  color: string;
  accentColor: string;
  wingColor: string;
  health: number;
  maxHealth: number;
}

export interface Bullet {
  id: string;
  shooterId: string;
  position: [number, number, number];
  velocity: [number, number, number];
  createdAt: number;
  lifetime: number; // in seconds (e.g. 2.5s)
  damage: number;   // 8 HP
}

export interface DamageEvent {
  targetId: string;
  shooterId: string;
  shooterCallsign?: string;
  damage: number;
  remainingHealth: number;
}

