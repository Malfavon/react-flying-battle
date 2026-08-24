import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RemotePlayer } from '../../types/flight';
import { FLAP_CONFIGS } from '../../hooks/useFlightPhysics';
import { CrashParticles } from './CrashParticles';
import { TargetReticle3D } from './TargetReticle3D';

interface RemoteAirplaneProps {
  player: RemotePlayer;
  localPos: [number, number, number];
  localQuat: THREE.Quaternion;
}

export const RemoteAirplane: React.FC<RemoteAirplaneProps> = ({ player, localPos, localQuat }) => {
  const groupRef = useRef<THREE.Group>(null);
  const propRef = useRef<THREE.Group>(null);
  const leftFlapRef = useRef<THREE.Mesh>(null);
  const rightFlapRef = useRef<THREE.Mesh>(null);
  const leftAileronRef = useRef<THREE.Mesh>(null);
  const rightAileronRef = useRef<THREE.Mesh>(null);
  const elevatorRef = useRef<THREE.Mesh>(null);
  const rudderRef = useRef<THREE.Mesh>(null);
  const frontWheelRef = useRef<THREE.Mesh>(null);
  const leftWheelRef = useRef<THREE.Mesh>(null);
  const rightWheelRef = useRef<THREE.Mesh>(null);

  // Smooth interpolation target vectors
  const targetPos = useMemo(() => new THREE.Vector3(...player.position), [player.position]);
  const targetQuat = useMemo(() => new THREE.Quaternion(...player.quaternion), [player.quaternion]);
  const currentPos = useRef<THREE.Vector3>(new THREE.Vector3(...player.position));
  const currentQuat = useRef<THREE.Quaternion>(new THREE.Quaternion(...player.quaternion));

  useFrame((_, delta) => {
    if (player.isCrashed) return;

    // Smooth interpolation (dead-reckoning / lerp)
    targetPos.set(player.position[0], player.position[1], player.position[2]);
    targetQuat.set(
      player.quaternion[0],
      player.quaternion[1],
      player.quaternion[2],
      player.quaternion[3]
    );

    currentPos.current.lerp(targetPos, Math.min(1, delta * 18));
    currentQuat.current.slerp(targetQuat, Math.min(1, delta * 18));

    if (groupRef.current) {
      groupRef.current.position.copy(currentPos.current);
      groupRef.current.quaternion.copy(currentQuat.current);
    }

    // 1. Spin propeller
    if (propRef.current) {
      const propSpeed = 10 + (player.throttle / 100) * 55;
      propRef.current.rotation.z += propSpeed * delta;
    }

    // 2. Animate flaps
    const targetFlapRad = THREE.MathUtils.degToRad(FLAP_CONFIGS[player.flapStage || 0].angleDeg);
    if (leftFlapRef.current) {
      leftFlapRef.current.rotation.x = THREE.MathUtils.lerp(
        leftFlapRef.current.rotation.x,
        targetFlapRad,
        delta * 6
      );
    }
    if (rightFlapRef.current) {
      rightFlapRef.current.rotation.x = THREE.MathUtils.lerp(
        rightFlapRef.current.rotation.x,
        targetFlapRad,
        delta * 6
      );
    }

    // 3. Animate ailerons
    const targetAileronRad = (player.rollInput || 0) * 0.35;
    if (leftAileronRef.current) {
      leftAileronRef.current.rotation.x = THREE.MathUtils.lerp(
        leftAileronRef.current.rotation.x,
        -targetAileronRad,
        delta * 12
      );
    }
    if (rightAileronRef.current) {
      rightAileronRef.current.rotation.x = THREE.MathUtils.lerp(
        rightAileronRef.current.rotation.x,
        targetAileronRad,
        delta * 12
      );
    }

    // 4. Animate elevator
    const targetElevatorRad = (player.pitchInput || 0) * 0.4;
    if (elevatorRef.current) {
      elevatorRef.current.rotation.x = THREE.MathUtils.lerp(
        elevatorRef.current.rotation.x,
        targetElevatorRad,
        delta * 12
      );
    }

    // 5. Animate rudder
    const targetRudderRad = -(player.yawInput || 0) * 0.4;
    if (rudderRef.current) {
      rudderRef.current.rotation.y = THREE.MathUtils.lerp(
        rudderRef.current.rotation.y,
        targetRudderRad,
        delta * 12
      );
    }

    // 6. Spin wheels on ground
    if (player.isGrounded && player.forwardSpeed > 0.1) {
      const wheelSpin = (player.forwardSpeed / 0.4) * delta;
      if (frontWheelRef.current) frontWheelRef.current.rotation.x += wheelSpin;
      if (leftWheelRef.current) leftWheelRef.current.rotation.x += wheelSpin;
      if (rightWheelRef.current) rightWheelRef.current.rotation.x += wheelSpin;
    }
  });

  if (player.isCrashed) {
    return <CrashParticles position={player.position} />;
  }

  const bodyColor = player.color || '#f8fafc';
  const accentColor = player.accentColor || '#0284c7';
  const wingColor = player.wingColor || '#f1f5f9';

  return (
    <>
      <group ref={groupRef} position={player.position} quaternion={new THREE.Quaternion(...player.quaternion)}>
      {/* Fuselage Main Body */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.9, 4.4]} />
        <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Fuselage Nose Cone */}
      <mesh position={[0, -0.05, -2.4]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.45, 0.6, 6]} />
        <meshStandardMaterial color={accentColor} roughness={0.3} />
      </mesh>

      {/* Decorative Fuselage Racing Stripe */}
      <mesh position={[0, 0.1, 0.2]}>
        <boxGeometry args={[0.92, 0.15, 3.2]} />
        <meshStandardMaterial color={accentColor} roughness={0.4} />
      </mesh>

      {/* Cockpit Canopy */}
      <mesh position={[0, 0.55, -0.4]} castShadow>
        <boxGeometry args={[0.65, 0.45, 1.4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.48, -1.15]} rotation={[-0.45, 0, 0]} castShadow>
        <boxGeometry args={[0.62, 0.35, 0.3]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.9} transparent opacity={0.85} />
      </mesh>

      {/* Main Wings */}
      <mesh position={[0, 0.1, -0.3]} castShadow receiveShadow>
        <boxGeometry args={[7.6, 0.08, 1.2]} />
        <meshStandardMaterial color={wingColor} roughness={0.3} />
      </mesh>
      {/* Wingtips */}
      <mesh position={[-3.85, 0.15, -0.3]}>
        <boxGeometry args={[0.15, 0.2, 1.1]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[3.85, 0.15, -0.3]}>
        <boxGeometry args={[0.15, 0.2, 1.1]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.6} />
      </mesh>

      {/* Twin Wing Gun Barrels */}
      <mesh position={[-1.8, 0.05, -0.75]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[1.8, 0.05, -0.75]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Flaps */}
      <group position={[-1.4, 0.08, 0.3]}>
        <mesh ref={leftFlapRef} position={[0, 0, 0.25]} castShadow>
          <boxGeometry args={[1.7, 0.05, 0.5]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
        </mesh>
      </group>
      <group position={[1.4, 0.08, 0.3]}>
        <mesh ref={rightFlapRef} position={[0, 0, 0.25]} castShadow>
          <boxGeometry args={[1.7, 0.05, 0.5]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
        </mesh>
      </group>

      {/* Ailerons */}
      <group position={[-2.85, 0.08, 0.3]}>
        <mesh ref={leftAileronRef} position={[0, 0, 0.2]}>
          <boxGeometry args={[1.2, 0.05, 0.4]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      </group>
      <group position={[2.85, 0.08, 0.3]}>
        <mesh ref={rightAileronRef} position={[0, 0, 0.2]}>
          <boxGeometry args={[1.2, 0.05, 0.4]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      </group>

      {/* Tail Fin */}
      <mesh position={[0, 0.8, 1.9]} rotation={[0.25, 0, 0]} castShadow>
        <boxGeometry args={[0.08, 1.2, 0.8]} />
        <meshStandardMaterial color={accentColor} />
      </mesh>
      <group position={[0, 0.8, 2.3]}>
        <mesh ref={rudderRef} position={[0, 0, 0.15]}>
          <boxGeometry args={[0.06, 1.0, 0.3]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      </group>

      {/* Horizontal Stabilizer */}
      <mesh position={[0, 0.35, 2.0]} castShadow>
        <boxGeometry args={[2.5, 0.06, 0.65]} />
        <meshStandardMaterial color={wingColor} />
      </mesh>
      <group position={[0, 0.35, 2.35]}>
        <mesh ref={elevatorRef} position={[0, 0, 0.15]}>
          <boxGeometry args={[2.4, 0.05, 0.3]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      </group>

      {/* Propeller */}
      <group position={[0, -0.05, -2.7]}>
        <mesh castShadow>
          <sphereGeometry args={[0.22, 8, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
        <group ref={propRef}>
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[0.12, 1.8, 0.02]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh position={[0, 0.8, 0.06]}>
            <boxGeometry args={[0.13, 0.2, 0.025]} />
            <meshStandardMaterial color="#eab308" />
          </mesh>
          <mesh position={[0, -0.8, 0.06]}>
            <boxGeometry args={[0.13, 0.2, 0.025]} />
            <meshStandardMaterial color="#eab308" />
          </mesh>
        </group>
      </group>

      {/* Tricycle Landing Gear */}
      <group position={[0, -0.7, -1.3]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.7, 6]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} />
        </mesh>
        <mesh ref={frontWheelRef} position={[0, -0.35, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.12, 12]} />
          <meshStandardMaterial color="#18181b" roughness={0.8} />
        </mesh>
      </group>

      <group position={[-1.1, -0.7, 0.1]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.7, 6]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} />
        </mesh>
        <mesh ref={leftWheelRef} position={[0, -0.35, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.25, 0.25, 0.16, 12]} />
          <meshStandardMaterial color="#18181b" roughness={0.8} />
        </mesh>
      </group>

      <group position={[1.1, -0.7, 0.1]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.7, 6]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} />
        </mesh>
        <mesh ref={rightWheelRef} position={[0, -0.35, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.25, 0.25, 0.16, 12]} />
          <meshStandardMaterial color="#18181b" roughness={0.8} />
        </mesh>
      </group>
    </group>

    {/* 3D Frame-Synced Target Reticle & Predictive Lead Pip */}
    <TargetReticle3D
      targetPosRef={currentPos}
      targetQuatRef={currentQuat}
      targetSpeed={player.forwardSpeed || 0}
      localPos={localPos}
      localQuat={localQuat}
      accentColor={accentColor}
      isCrashed={!!player.isCrashed}
    />
  </>
  );
};
