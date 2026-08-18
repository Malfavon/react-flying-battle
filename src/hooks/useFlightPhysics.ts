import { useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { ControlInputs, FlightTelemetry, FlapStage, FlapConfiguration } from '../types/flight';

export const FLAP_CONFIGS: Record<FlapStage, FlapConfiguration> = {
  0: {
    stage: 0,
    label: '0° Clean (Cruise)',
    angleDeg: 0,
    liftCoeff: 1.0,
    dragCoeff: 0.15,
    stallSpeedKnots: 28
  },
  1: {
    stage: 1,
    label: '15° Takeoff / Appr',
    angleDeg: 15,
    liftCoeff: 1.35,
    dragCoeff: 0.22,
    stallSpeedKnots: 20
  },
  2: {
    stage: 2,
    label: '30° Landing',
    angleDeg: 30,
    liftCoeff: 1.70,
    dragCoeff: 0.38,
    stallSpeedKnots: 15
  }
};

const SPAWN_POS: [number, number, number] = [0, 7.2, 0]; // Main Airport Runway (Elevation 6.0 + 1.2 gear height)

const INITIAL_STATE: FlightTelemetry = {
  position: SPAWN_POS,
  velocity: [0, 0, 0],
  rotation: [0, 0, 0],
  pitchDeg: 0,
  rollDeg: 0,
  yawDeg: 0,
  airspeedKnots: 0,
  airspeedMs: 0,
  altitudeMeters: 0,
  altitudeFeet: 0,
  verticalSpeedMs: 0,
  throttle: 0, // Starts at 0% idle
  flapStage: 0,
  isBraking: false,
  isGrounded: true,
  isStalling: false,
  isCrashed: false,
  crashReason: null,
  isLanded: false
};

export function useFlightPhysics() {
  const [telemetry, setTelemetry] = useState<FlightTelemetry>(INITIAL_STATE);

  // High performance physics state vectors
  const posRef = useRef<THREE.Vector3>(new THREE.Vector3(...SPAWN_POS));
  const velRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const rotEulerRef = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0, 'YXZ'));
  const quatRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const hasEverBeenAirborneRef = useRef<boolean>(false);

  // Aircraft physical constants
  const mass = 700; // kg
  const gravity = 9.81; // m/s^2
  const weight = mass * gravity; // 6867 N
  const maxThrust = 10500; // Newtons

  // Reset plane to spawn position on runway or in-flight
  const resetFlight = useCallback((
    spawnPos: [number, number, number] = SPAWN_POS,
    spawnHeadingDeg: number = 0,
    initialSpeedMs: number = 0,
    initialThrottle: number = 0,
    airborne: boolean = false
  ) => {
    posRef.current.set(spawnPos[0], spawnPos[1], spawnPos[2]);
    const yawRad = THREE.MathUtils.degToRad(spawnHeadingDeg);
    rotEulerRef.current.set(0, yawRad, 0, 'YXZ');
    quatRef.current.setFromEuler(rotEulerRef.current);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quatRef.current);
    velRef.current.copy(forward.multiplyScalar(initialSpeedMs));
    hasEverBeenAirborneRef.current = airborne;

    setTelemetry({
      ...INITIAL_STATE,
      position: spawnPos,
      velocity: [velRef.current.x, velRef.current.y, velRef.current.z],
      yawDeg: spawnHeadingDeg,
      airspeedKnots: Math.round(initialSpeedMs * 1.94384),
      airspeedMs: Math.round(initialSpeedMs * 10) / 10,
      altitudeMeters: Math.max(0, Math.round((spawnPos[1] - 1.2) * 10) / 10),
      altitudeFeet: Math.max(0, Math.round((spawnPos[1] - 1.2) * 3.28084)),
      throttle: initialThrottle,
      isGrounded: !airborne,
      isLanded: false
    });
  }, []);

  // Main physics update step called in requestAnimationFrame / useFrame
  const updatePhysics = useCallback((
    delta: number,
    inputs: ControlInputs,
    groundElevation: number = 6.0,
    isOnRunway: boolean = true
  ) => {
    const dt = Math.min(delta, 0.05);

    if (telemetry.isCrashed) {
      return telemetry;
    }

    const pos = posRef.current;
    const vel = velRef.current;
    const quat = quatRef.current;
    const rot = rotEulerRef.current;

    // Aircraft orientation vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
    const groundForward = new THREE.Vector3(forward.x, 0, forward.z).normalize();

    // Forward airspeed (m/s)
    const forwardSpeed = Math.max(0, vel.dot(forward));
    const totalSpeed = vel.length();
    const airspeedKnots = totalSpeed * 1.94384;

    const flapConfig = FLAP_CONFIGS[inputs.flapStage];
    const stallSpeedMs = flapConfig.stallSpeedKnots / 1.94384;
    const gearHeight = groundElevation + 1.2;

    // Grounded status check
    const isGrounded = pos.y <= gearHeight + 0.12 && vel.y <= 0.9;
    const isStalling = !isGrounded && forwardSpeed < stallSpeedMs;

    // Track if plane has achieved sustained flight
    if (pos.y > gearHeight + 3.0) {
      hasEverBeenAirborneRef.current = true;
    }

    // Control surfaces authority scales with forward speed
    const controlAuthority = Math.min(1.3, Math.max(0.2, forwardSpeed / 18.0));

    // Steering and Rotations
    if (isGrounded) {
      // Ground pitch rotation (S / Down Arrow tilts nose UP: rot.x increases)
      rot.x = THREE.MathUtils.clamp(rot.x + inputs.pitch * 1.2 * dt, -0.05, 0.25);
      // Suspension levels roll on ground
      rot.z = THREE.MathUtils.lerp(rot.z, 0, dt * 10.0);
      // Ground nose-wheel steering: Left turns Left (rot.y increases), Right turns Right (rot.y decreases)
      const groundSteer = inputs.yaw !== 0 ? inputs.yaw : inputs.roll;
      rot.y -= groundSteer * 1.8 * dt;
    } else {
      // In-flight pitch control:
      // S / Down Arrow (+pitch): rot.x increases (nose points UP to climb)
      // W / Up Arrow (-pitch): rot.x decreases (nose points DOWN to dive)
      if (Math.abs(inputs.pitch) > 0.05) {
        rot.x += inputs.pitch * 1.3 * controlAuthority * dt;
      } else {
        // Natural aerodynamic stability: nose auto-levels towards 0 (level flight) when key is released!
        rot.x = THREE.MathUtils.lerp(rot.x, 0, dt * 1.5);
      }

      // Roll: D / Right Arrow (roll > 0) tilts right (rot.z < 0), A / Left Arrow (roll < 0) tilts left (rot.z > 0)
      rot.z -= inputs.roll * 2.8 * controlAuthority * dt;
      if (Math.abs(inputs.roll) < 0.05) {
        rot.z = THREE.MathUtils.lerp(rot.z, 0, dt * 1.0);
      }

      // Coordinated banking turn:
      // When rolling LEFT (rot.z > 0, bankAngle < 0), turn left (rot.y increases).
      // When rolling RIGHT (rot.z < 0, bankAngle > 0), turn right (rot.y decreases).
      const bankAngle = -rot.z;
      const turnRate = (forwardSpeed > 5.0) ? (Math.sin(bankAngle) * 1.6 * controlAuthority) : 0;
      rot.y -= (turnRate + inputs.yaw * 1.2 * controlAuthority) * dt;

      // Stall nose drop (rot.x drops towards dive)
      if (isStalling) {
        rot.x = THREE.MathUtils.lerp(rot.x, -0.35, dt * 2.0);
      }

      // Clamp pitch to avoid gimbal flips
      rot.x = THREE.MathUtils.clamp(rot.x, -Math.PI / 2.3, Math.PI / 2.3);
    }

    quat.setFromEuler(rot);

    // Forces accumulator
    // 1. Engine Thrust (Always pushes forward along nose vector)
    const thrustMagnitude = (inputs.throttle / 100) * maxThrust;
    const thrustForce = forward.clone().multiplyScalar(thrustMagnitude);

    // 2. Aerodynamic Drag (Opposes velocity)
    const dynamicPressure = 0.5 * 1.225 * Math.pow(forwardSpeed, 2);
    const dragMagnitude = dynamicPressure * 16.0 * flapConfig.dragCoeff;
    const dragForce = totalSpeed > 0.01 ? vel.clone().normalize().negate().multiplyScalar(dragMagnitude) : new THREE.Vector3();

    // 3. Gravity (Always pulls downward)
    const gravityForce = new THREE.Vector3(0, -weight, 0);

    // 4. Aerodynamic Lift:
    // Balances gravity in level flight, increases when pulling UP (S/Down), decreases when pushing DOWN (W/Up)
    let liftForce = new THREE.Vector3();
    if (!isStalling && forwardSpeed > 6.0) {
      const speedRatio = Math.min(1.0, forwardSpeed / stallSpeedMs);
      const baseLift = weight * Math.max(0, Math.cos(rot.z)) * speedRatio;
      const flapExtra = (flapConfig.liftCoeff - 1.0) * weight * 0.4;
      const pitchLift = inputs.pitch * weight * 0.9;
      const totalLiftMag = Math.max(0, baseLift + flapExtra + pitchLift);
      liftForce = up.clone().multiplyScalar(totalLiftMag);
    } else if (isStalling) {
      liftForce = up.clone().multiplyScalar(weight * 0.25);
    }

    // Acceleration & Velocity integration
    const forces = new THREE.Vector3().add(thrustForce).add(liftForce).add(dragForce).add(gravityForce);
    vel.addScaledVector(forces.divideScalar(mass), dt);

    // Smooth flight path alignment with forward heading
    if (!isGrounded && totalSpeed > 5.0) {
      const targetVel = forward.clone().multiplyScalar(totalSpeed);
      vel.lerp(targetVel, dt * 3.0);
    }

    // 5. Ground Wheel Interaction & Takeoff Transition
    if (isGrounded) {
      const horizontalSpeed = Math.max(0, vel.dot(groundForward));
      vel.copy(groundForward.clone().multiplyScalar(horizontalSpeed));
      vel.multiplyScalar(Math.max(0, 1 - 0.01 * dt * 60));

      // Wheel Brakes
      if (inputs.brakes) {
        const brakeDecel = 14.0 * dt;
        const curSpeed = vel.length();
        if (curSpeed > 0.01) {
          vel.setLength(Math.max(0, curSpeed - brakeDecel));
        }
      }

      // Takeoff Liftoff Trigger:
      // When airspeed is >= 24 knots and either lift > gravity or pilot pulls UP (S / Down Arrow)
      const liftAboveWeight = (liftForce.y) > weight * 0.8;
      const pilotPullingUp = airspeedKnots >= 24 && (inputs.pitch > 0.1 || rot.x > 0.04);
      const highSpeedTakeoff = airspeedKnots >= 42;

      if (liftAboveWeight || pilotPullingUp || highSpeedTakeoff) {
        vel.y = Math.max(2.5, (forwardSpeed / 20.0) * 4.0 + Math.max(0, inputs.pitch) * 3.5);
        pos.y = gearHeight + 0.2;
      } else {
        vel.y = 0;
        pos.y = gearHeight;
      }
    }

    // Update position on EVERY frame
    pos.addScaledVector(vel, dt);

    // Clamp ground penetration
    if (pos.y < gearHeight) {
      pos.y = gearHeight;
    }

    // Safe landing check: ONLY triggers if the plane was previously airborne!
    const isLanded = hasEverBeenAirborneRef.current && isGrounded && isOnRunway && totalSpeed < 0.8 && inputs.throttle < 5;

    // Degrees conversion (rot.x > 0 = nose UP, rot.x < 0 = nose DOWN)
    const pitchDeg = THREE.MathUtils.radToDeg(rot.x);
    const rollDeg = THREE.MathUtils.radToDeg(-rot.z);
    let yawDeg = THREE.MathUtils.radToDeg(rot.y) % 360;
    if (yawDeg < 0) yawDeg += 360;

    const newTelemetry: FlightTelemetry = {
      position: [pos.x, pos.y, pos.z],
      velocity: [vel.x, vel.y, vel.z],
      rotation: [rot.x, rot.y, rot.z],
      pitchDeg: Math.round(pitchDeg * 10) / 10,
      rollDeg: Math.round(rollDeg * 10) / 10,
      yawDeg: Math.round(yawDeg),
      airspeedKnots: Math.round(airspeedKnots),
      airspeedMs: Math.round(totalSpeed * 10) / 10,
      altitudeMeters: Math.max(0, Math.round((pos.y - 1.2) * 10) / 10),
      altitudeFeet: Math.max(0, Math.round((pos.y - 1.2) * 3.28084)),
      verticalSpeedMs: Math.round(vel.y * 10) / 10,
      throttle: inputs.throttle,
      flapStage: inputs.flapStage,
      isBraking: inputs.brakes,
      isGrounded,
      isStalling,
      isCrashed: false,
      crashReason: null,
      isLanded
    };

    setTelemetry(newTelemetry);
    return newTelemetry;
  }, [telemetry.isCrashed]);

  const triggerCrash = useCallback((reason: string) => {
    setTelemetry((prev) => ({
      ...prev,
      isCrashed: true,
      crashReason: reason,
      velocity: [0, 0, 0]
    }));
  }, []);

  return {
    telemetry,
    posRef,
    velRef,
    rotEulerRef,
    quatRef,
    updatePhysics,
    resetFlight,
    triggerCrash
  };
}
