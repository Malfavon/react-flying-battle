import { useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { ControlInputs, FlightTelemetry, FlapStage, FlapConfiguration } from '../types/flight';

export const FLAP_CONFIGS: Record<FlapStage, FlapConfiguration> = {
  0: {
    stage: 0,
    label: '0° Clean (Cruise)',
    angleDeg: 0,
    liftCoeff: 1.0,
    dragCoeff: 0.12,
    stallSpeedKnots: 65
  },
  1: {
    stage: 1,
    label: '15° Takeoff / Appr',
    angleDeg: 15,
    liftCoeff: 1.35,
    dragCoeff: 0.18,
    stallSpeedKnots: 55
  },
  2: {
    stage: 2,
    label: '30° Landing',
    angleDeg: 30,
    liftCoeff: 1.70,
    dragCoeff: 0.28,
    stallSpeedKnots: 45
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
  isLanded: false,
  health: 100,
  maxHealth: 100
};

export function useFlightPhysics() {
  const [telemetry, setTelemetry] = useState<FlightTelemetry>(INITIAL_STATE);

  // High performance physics state vectors
  const posRef = useRef<THREE.Vector3>(new THREE.Vector3(...SPAWN_POS));
  const velRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const rotEulerRef = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0, 'YXZ'));
  const quatRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const hasEverBeenAirborneRef = useRef<boolean>(false);
  const healthRef = useRef<number>(100);
  const isCrashedRef = useRef<boolean>(false);
  const crashReasonRef = useRef<string | null>(null);

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
    healthRef.current = 100;
    isCrashedRef.current = false;
    crashReasonRef.current = null;

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
      isLanded: false,
      health: 100,
      maxHealth: 100
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

    if (isCrashedRef.current || healthRef.current <= 0) {
      isCrashedRef.current = true;
      if (!crashReasonRef.current) {
        crashReasonRef.current = 'Shot down in aerial combat!';
      }
      velRef.current.set(0, 0, 0);
      const crashedTelemetry: FlightTelemetry = {
        ...telemetry,
        isCrashed: true,
        crashReason: crashReasonRef.current,
        health: 0,
        airspeedKnots: 0,
        airspeedMs: 0,
        throttle: 0,
        velocity: [0, 0, 0]
      };
      return crashedTelemetry;
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
    const controlAuthority = Math.min(1.1, Math.max(0.18, forwardSpeed / 42.0));

    // Steering and Rotations
    if (isGrounded) {
      // Ground pitch rotation (S / Down Arrow tilts nose UP: rot.x increases)
      rot.x = THREE.MathUtils.clamp(rot.x + inputs.pitch * 0.55 * dt, -0.04, 0.22);
      // Suspension levels roll on ground
      rot.z = THREE.MathUtils.lerp(rot.z, 0, dt * 10.0);
      // Ground nose-wheel steering: Left turns Left (rot.y increases), Right turns Right (rot.y decreases)
      const groundSteer = inputs.yaw !== 0 ? inputs.yaw : inputs.roll;
      rot.y -= groundSteer * 0.95 * dt;
    } else {
      // In-flight pitch control:
      // S / Down Arrow (+pitch): rot.x increases (nose points UP to climb)
      // W / Up Arrow (-pitch): rot.x decreases (nose points DOWN to dive)
      if (Math.abs(inputs.pitch) > 0.05) {
        rot.x += inputs.pitch * 0.65 * controlAuthority * dt;
      } else {
        // Pilot released pitch controls:
        if (inputs.throttle < 15 || isStalling) {
          // Unpowered / low-throttle / stall behavior:
          // Without engine thrust and airflow, center-of-gravity (forward of center-of-lift)
          // naturally pulls the nose down toward the ground into a gliding dive.
          const throttleDeficit = 1.0 - Math.max(0, inputs.throttle / 15.0); // 1.0 at 0% throttle, 0.0 at 15% throttle
          const targetNoseDownPitch = isStalling ? -0.45 : -0.22; // -25° stall dive or -12.5° glide dive
          const noseDropSpeed = isStalling ? 1.6 : (0.3 + 0.4 * throttleDeficit);
          rot.x = THREE.MathUtils.lerp(rot.x, targetNoseDownPitch, dt * noseDropSpeed);
        } else {
          // Powered flight (throttle >= 15%):
          // Aircraft MAINTAINS its cruising / climb / dive pitch attitude!
          // If pointed up, it continues pointing up and climbing.
          // Gently damp extreme pitch angles beyond +-60 degrees to prevent tumbling
          if (Math.abs(rot.x) > 1.05) {
            rot.x = THREE.MathUtils.lerp(rot.x, Math.sign(rot.x) * 1.05, dt * 1.0);
          }
        }
      }

      // Roll: D / Right Arrow (roll > 0) tilts right (rot.z < 0), A / Left Arrow (roll < 0) tilts left (rot.z > 0)
      rot.z -= inputs.roll * 1.35 * controlAuthority * dt;
      if (Math.abs(inputs.roll) < 0.05) {
        rot.z = THREE.MathUtils.lerp(rot.z, 0, dt * 0.8);
      }

      // Coordinated banking turn:
      // When rolling LEFT (rot.z > 0, bankAngle < 0), turn left (rot.y increases).
      // When rolling RIGHT (rot.z < 0, bankAngle > 0), turn right (rot.y decreases).
      const bankAngle = -rot.z;
      const turnRate = (forwardSpeed > 10.0) ? (Math.sin(bankAngle) * 0.85 * controlAuthority) : 0;
      rot.y -= (turnRate + inputs.yaw * 0.65 * controlAuthority) * dt;

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
    // Parasitic drag + flap drag + angle-of-attack induced drag
    const inducedDragCoeff = Math.abs(rot.x) * 0.15;
    const totalDragCoeff = flapConfig.dragCoeff + inducedDragCoeff;
    const dragMagnitude = dynamicPressure * 16.0 * totalDragCoeff;
    const dragForce = totalSpeed > 0.01 ? vel.clone().normalize().negate().multiplyScalar(dragMagnitude) : new THREE.Vector3();

    // 3. Gravity (Always pulls downward)
    const gravityForce = new THREE.Vector3(0, -weight, 0);

    // 4. Aerodynamic Lift:
    // Dynamic lift scales with airspeed squared (dynamic pressure), bank angle, flap settings, and pitch angle/input
    let liftForce = new THREE.Vector3();
    if (!isStalling && forwardSpeed > 8.0) {
      const cruiseSpeedMs = 45.0; // ~87.5 knots reference cruise speed where L = W in level flight
      const speedFactor = Math.min(1.5, Math.pow(forwardSpeed / cruiseSpeedMs, 2));
      const bankFactor = Math.max(0, Math.cos(rot.z));
      const flapMultiplier = flapConfig.liftCoeff;
      const pitchAngleBonus = THREE.MathUtils.clamp(rot.x * 0.5, -0.3, 0.6);
      const pitchInputBonus = inputs.pitch * 0.4;
      const totalLiftMag = weight * speedFactor * bankFactor * flapMultiplier * (1.0 + pitchAngleBonus + pitchInputBonus);
      liftForce = up.clone().multiplyScalar(Math.max(0, totalLiftMag));
    } else if (isStalling) {
      liftForce = up.clone().multiplyScalar(weight * 0.2);
    }

    // Acceleration & Velocity integration
    const forces = new THREE.Vector3().add(thrustForce).add(liftForce).add(dragForce).add(gravityForce);
    vel.addScaledVector(forces.divideScalar(mass), dt);

    // Aerodynamic flight path convergence:
    // Airflow over the aerodynamic surfaces naturally converges the aircraft's horizontal heading
    // while PRESERVING physical vertical sink / descent under gravity.
    if (!isGrounded && totalSpeed > 3.0) {
      const horizForward = new THREE.Vector3(forward.x, 0, forward.z).normalize();
      const currentHorizSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
      const targetHorizVel = horizForward.multiplyScalar(currentHorizSpeed);

      vel.x = THREE.MathUtils.lerp(vel.x, targetHorizVel.x, dt * 2.5);
      vel.z = THREE.MathUtils.lerp(vel.z, targetHorizVel.z, dt * 2.5);

      // Pitch flight path coupling:
      // High-speed airflow guides vertical velocity along climb / dive orientation
      const targetPitchVelY = forward.y * totalSpeed;
      vel.y = THREE.MathUtils.lerp(vel.y, targetPitchVelY, dt * 1.8);
    }

    // 5. Ground Wheel Interaction & Takeoff Transition
    if (isGrounded) {
      const horizontalSpeed = Math.max(0, vel.dot(groundForward));
      vel.copy(groundForward.clone().multiplyScalar(horizontalSpeed));

      // Realistic rolling friction on runway (tarmac rolling resistance)
      const rollingResistance = 0.03 * Math.max(0, weight - liftForce.y);
      const rollingDecel = (rollingResistance / mass) * dt;
      const curSpeed = vel.length();
      if (curSpeed > 0.01) {
        vel.setLength(Math.max(0, curSpeed - rollingDecel));
      }

      // Wheel Brakes (Active when holding Space or tapping Brake button)
      if (inputs.brakes) {
        const brakeDecel = 18.0 * dt;
        const curSpd = vel.length();
        if (curSpd > 0.01) {
          vel.setLength(Math.max(0, curSpd - brakeDecel));
        }
      }

      // Takeoff Liftoff Trigger:
      // Requires at least 80 knots airspeed and either pilot pulls UP (S / Down Arrow) or rotated nose,
      // or high-speed auto-liftoff (>= 105 knots)
      const liftAboveWeight = (liftForce.y) > weight * 0.85;
      const pilotPullingUp = airspeedKnots >= 80 && (inputs.pitch > 0.08 || rot.x > 0.03);
      const highSpeedTakeoff = airspeedKnots >= 105;

      if ((pilotPullingUp && liftAboveWeight) || highSpeedTakeoff) {
        vel.y = Math.max(2.0, (forwardSpeed / 40.0) * 3.5 + Math.max(0, inputs.pitch) * 3.0);
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
      isCrashed: isCrashedRef.current,
      crashReason: crashReasonRef.current,
      isLanded,
      health: healthRef.current,
      maxHealth: 100
    };

    setTelemetry(newTelemetry);
    return newTelemetry;
  }, []);

  const triggerCrash = useCallback((reason: string) => {
    isCrashedRef.current = true;
    crashReasonRef.current = reason;
    velRef.current.set(0, 0, 0);
    setTelemetry((prev) => ({
      ...prev,
      isCrashed: true,
      crashReason: reason,
      velocity: [0, 0, 0],
      airspeedKnots: 0,
      airspeedMs: 0,
      throttle: 0
    }));
  }, []);

  const applyDamage = useCallback((amount: number, reason: string = 'Shot down in aerial combat!') => {
    healthRef.current = Math.max(0, healthRef.current - amount);
    const remaining = healthRef.current;
    if (remaining <= 0) {
      isCrashedRef.current = true;
      crashReasonRef.current = reason;
      velRef.current.set(0, 0, 0);
    }
    setTelemetry((prev) => ({
      ...prev,
      health: remaining,
      isCrashed: remaining <= 0 ? true : isCrashedRef.current,
      crashReason: remaining <= 0 ? reason : crashReasonRef.current,
      velocity: remaining <= 0 ? [0, 0, 0] : prev.velocity,
      airspeedKnots: remaining <= 0 ? 0 : prev.airspeedKnots,
      airspeedMs: remaining <= 0 ? 0 : prev.airspeedMs,
      throttle: remaining <= 0 ? 0 : prev.throttle
    }));
    return remaining;
  }, []);

  return {
    telemetry,
    posRef,
    velRef,
    rotEulerRef,
    quatRef,
    healthRef,
    updatePhysics,
    resetFlight,
    triggerCrash,
    applyDamage
  };
}
