import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CameraMode } from '../../types/flight';

interface CameraControllerProps {
  planePos: THREE.Vector3;
  planeQuat: THREE.Quaternion;
  cameraMode: CameraMode;
  airspeedMs: number;
}

export const CameraController: React.FC<CameraControllerProps> = ({
  planePos,
  planeQuat,
  cameraMode,
  airspeedMs
}) => {
  const { camera } = useThree();
  const currentPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 8, 14));
  const currentLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 7, 0));

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    if (cameraMode === 'chase') {
      // Deconstruct plane orientation
      const planeEuler = new THREE.Euler().setFromQuaternion(planeQuat, 'YXZ');
      const yaw = planeEuler.y;
      const pitch = planeEuler.x;

      // Sensation of speed: pull back slightly at high airspeed
      const speedOffset = Math.min(3.5, (airspeedMs / 30.0) * 2.0);

      // Create a trailing offset behind the plane based primarily on YAW and moderated PITCH
      // (Do NOT rotate camera by ROLL, so the player sees the aircraft roll and bank in 3D!)
      const followQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(pitch * 0.45, yaw, 0, 'YXZ')
      );

      const camOffset = new THREE.Vector3(0, 3.8 + speedOffset * 0.15, 11.5 + speedOffset);
      camOffset.applyQuaternion(followQuat);

      const targetCamPos = planePos.clone().add(camOffset);
      currentPosRef.current.lerp(targetCamPos, dt * 6.5);
      camera.position.copy(currentPosRef.current);

      // Look at the aircraft nose / center
      const lookAhead = new THREE.Vector3(0, 0.8, -6).applyQuaternion(followQuat);
      const targetLookAt = planePos.clone().add(lookAhead);
      currentLookAtRef.current.lerp(targetLookAt, dt * 8.5);
      camera.lookAt(currentLookAtRef.current);

      // Camera up-vector stays mostly upright (World UP [0, 1, 0]) with gentle 12% bank roll
      const planeUp = new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat);
      const gentleUp = new THREE.Vector3(0, 1, 0).lerp(planeUp, 0.12).normalize();
      camera.up.lerp(gentleUp, dt * 5.0);

    } else if (cameraMode === 'cockpit') {
      // First Person Cockpit View (Locked to pilot seat)
      const cockpitOffset = new THREE.Vector3(0, 0.62, -0.35).applyQuaternion(planeQuat);
      camera.position.copy(planePos.clone().add(cockpitOffset));

      const lookTarget = new THREE.Vector3(0, 0.6, -30).applyQuaternion(planeQuat);
      camera.lookAt(planePos.clone().add(lookTarget));

      const planeUp = new THREE.Vector3(0, 1, 0).applyQuaternion(planeQuat);
      camera.up.copy(planeUp);

    } else {
      // Free / Orbit View
      const orbitOffset = new THREE.Vector3(14, 7, 14);
      camera.position.lerp(planePos.clone().add(orbitOffset), dt * 4.0);
      camera.lookAt(planePos);
      camera.up.set(0, 1, 0);
    }
  });

  return null;
};
