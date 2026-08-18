import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Airplane } from './Airplane';
import { Ocean } from './Ocean';
import { Islands } from './Islands';
import { Mountains } from './Mountains';
import { Clouds } from './Clouds';
import { CrashParticles } from './CrashParticles';
import { CameraController } from './CameraController';
import { CameraMode, FlapStage } from '../../types/flight';

interface WorldSceneProps {
  planePos: [number, number, number];
  planeQuat: THREE.Quaternion;
  throttle: number;
  flapStage: FlapStage;
  rollInput: number;
  pitchInput: number;
  yawInput: number;
  isGrounded: boolean;
  forwardSpeed: number;
  isCrashed: boolean;
  cameraMode: CameraMode;
}

export const WorldScene: React.FC<WorldSceneProps> = ({
  planePos,
  planeQuat,
  throttle,
  flapStage,
  rollInput,
  pitchInput,
  yawInput,
  isGrounded,
  forwardSpeed,
  isCrashed,
  cameraMode
}) => {
  const planeGroupRef = useRef<THREE.Group>(null);
  const planePosVec = new THREE.Vector3(...planePos);

  // Synchronize 3D plane group transform on every RAF frame
  useFrame(() => {
    if (planeGroupRef.current) {
      planeGroupRef.current.position.set(planePos[0], planePos[1], planePos[2]);
      planeGroupRef.current.quaternion.copy(planeQuat);
    }
  });

  return (
    <>
      {/* Atmosphere Fog */}
      <color attach="background" args={['#bae6fd']} />
      <fog attach="fog" args={['#bae6fd', 300, 3500]} />

      {/* Sun Directional Light */}
      <directionalLight
        position={[250, 450, 250]}
        intensity={1.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={2500}
        shadow-camera-left={-600}
        shadow-camera-right={600}
        shadow-camera-top={600}
        shadow-camera-bottom={-600}
        shadow-bias={-0.0005}
      />

      {/* Ambient & Hemisphere Lighting */}
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#bae6fd', '#1e3a8a', 0.65]} />

      {/* Stylized Sun Disc in Sky */}
      <mesh position={[600, 1000, 600]}>
        <sphereGeometry args={[70, 16, 16]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>

      {/* 3D World Objects */}
      <Ocean />
      <Islands />
      <Mountains />
      <Clouds />

      {/* Aircraft Group positioned in world */}
      <group ref={planeGroupRef} position={planePos} quaternion={planeQuat}>
        <Airplane
          throttle={throttle}
          flapStage={flapStage}
          rollInput={rollInput}
          pitchInput={pitchInput}
          yawInput={yawInput}
          isGrounded={isGrounded}
          forwardSpeed={forwardSpeed}
          isCrashed={isCrashed}
        />
      </group>

      {/* Crash Explosion Debris */}
      {isCrashed && <CrashParticles position={planePos} />}

      {/* Dynamic Camera */}
      <CameraController
        planePos={planePosVec}
        planeQuat={planeQuat}
        cameraMode={cameraMode}
        airspeedMs={forwardSpeed}
      />
    </>
  );
};
