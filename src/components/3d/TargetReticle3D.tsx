import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface TargetReticle3DProps {
  targetPosRef: React.RefObject<THREE.Vector3>;
  targetQuatRef: React.RefObject<THREE.Quaternion>;
  targetSpeed: number;
  localPos: [number, number, number];
  localQuat: THREE.Quaternion;
  accentColor?: string;
  isCrashed: boolean;
}

const BULLET_SPEED = 480; // m/s effective intercept speed

export const TargetReticle3D: React.FC<TargetReticle3DProps> = ({
  targetPosRef,
  targetQuatRef,
  targetSpeed,
  localPos,
  localQuat,
  accentColor = '#f59e0b',
  isCrashed
}) => {
  const { camera } = useThree();

  const targetBoxGroupRef = useRef<THREE.Group>(null);
  const leadPipGroupRef = useRef<THREE.Group>(null);
  const lineRef = useRef<THREE.Line>(null);
  const leadRingMeshRef = useRef<THREE.Mesh>(null);

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([0, 0, 0, 0, 0, 0]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  const leadPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const isLockedRef = useRef<boolean>(false);

  useFrame(() => {
    if (isCrashed || !targetPosRef.current || !targetQuatRef.current) {
      if (targetBoxGroupRef.current) targetBoxGroupRef.current.visible = false;
      if (leadPipGroupRef.current) leadPipGroupRef.current.visible = false;
      if (lineRef.current) lineRef.current.visible = false;
      return;
    }

    const tPos = targetPosRef.current;
    const tQuat = targetQuatRef.current;
    const lPos = new THREE.Vector3(...localPos);

    // Distance to local plane and to camera
    const distToPlane = tPos.distanceTo(lPos);
    const distToCam = tPos.distanceTo(camera.position);

    // Hide if out of visual combat range or behind camera
    const toTargetCam = new THREE.Vector3().subVectors(tPos, camera.position);
    const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const isTargetInFront = toTargetCam.dot(camForward) > 0;

    if (distToPlane > 1500 || distToPlane < 2.0 || !isTargetInFront) {
      if (targetBoxGroupRef.current) targetBoxGroupRef.current.visible = false;
      if (leadPipGroupRef.current) leadPipGroupRef.current.visible = false;
      if (lineRef.current) lineRef.current.visible = false;
      return;
    }

    // 1. Compute 3D Velocity & Intercept Solution
    const targetForward = new THREE.Vector3(0, 0, -1).applyQuaternion(tQuat);
    const speed = Math.max(0, targetSpeed);
    const targetVel = targetForward.clone().multiplyScalar(speed);

    const toTarget = new THREE.Vector3().subVectors(tPos, lPos);

    // Solve quadratic intercept: || toTarget + targetVel * t || = BULLET_SPEED * t
    const a = targetVel.lengthSq() - BULLET_SPEED * BULLET_SPEED;
    const b = 2.0 * toTarget.dot(targetVel);
    const c = toTarget.lengthSq();

    let leadPos = tPos.clone();
    let hasLead = false;

    const disc = b * b - 4 * a * c;
    if (disc >= 0 && Math.abs(a) > 0.001) {
      const sqrtDisc = Math.sqrt(disc);
      const t1 = (-b - sqrtDisc) / (2 * a);
      const t2 = (-b + sqrtDisc) / (2 * a);

      let leadTime = -1;
      if (t1 > 0 && t2 > 0) leadTime = Math.min(t1, t2);
      else if (t1 > 0) leadTime = t1;
      else if (t2 > 0) leadTime = t2;

      if (leadTime > 0 && leadTime < 2.8) {
        leadPos = tPos.clone().addScaledVector(targetVel, leadTime);
        hasLead = true;
      }
    }

    leadPosRef.current.copy(leadPos);

    // 2. Check if Local Player is Aiming Directly at Lead Pip
    const playerAim = new THREE.Vector3(0, 0, -1).applyQuaternion(localQuat);
    const toLead = new THREE.Vector3().subVectors(leadPos, lPos).normalize();
    const aimDot = playerAim.dot(toLead);
    const isLocked = hasLead && aimDot > 0.9975; // ~2.8 degree gunsight lock cone
    isLockedRef.current = isLocked;

    // 3. Update Target Bracket Box in 3D
    if (targetBoxGroupRef.current) {
      targetBoxGroupRef.current.visible = true;
      targetBoxGroupRef.current.position.copy(tPos);
      targetBoxGroupRef.current.quaternion.copy(camera.quaternion);

      // Adaptive constant screen-size scale factor
      const boxScale = Math.max(0.9, distToCam * 0.032);
      targetBoxGroupRef.current.scale.set(boxScale, boxScale, boxScale);
    }

    // 4. Update Lead Pip in 3D
    if (leadPipGroupRef.current) {
      const leadDistToCam = leadPos.distanceTo(camera.position);
      const toLeadCam = new THREE.Vector3().subVectors(leadPos, camera.position);
      const isLeadInFront = toLeadCam.dot(camForward) > 0;

      if (hasLead && isLeadInFront) {
        leadPipGroupRef.current.visible = true;
        leadPipGroupRef.current.position.copy(leadPos);
        leadPipGroupRef.current.quaternion.copy(camera.quaternion);

        const pipScale = Math.max(0.7, leadDistToCam * (isLocked ? 0.038 : 0.028));
        leadPipGroupRef.current.scale.set(pipScale, pipScale, pipScale);

        if (leadRingMeshRef.current) {
          const mat = leadRingMeshRef.current.material as THREE.MeshBasicMaterial;
          if (mat) {
            mat.color.set(isLocked ? '#34d399' : '#f59e0b');
          }
        }
      } else {
        leadPipGroupRef.current.visible = false;
      }
    }

    // 5. Update 3D Connecting Line from Target to Lead Pip
    if (lineRef.current) {
      if (hasLead && leadPos.distanceTo(tPos) > 0.5) {
        lineRef.current.visible = true;
        const posAttr = lineGeometry.attributes.position as THREE.BufferAttribute;
        posAttr.setXYZ(0, tPos.x, tPos.y, tPos.z);
        posAttr.setXYZ(1, leadPos.x, leadPos.y, leadPos.z);
        posAttr.needsUpdate = true;

        const lineMat = lineRef.current.material as THREE.LineDashedMaterial;
        if (lineMat) {
          lineMat.color.set(isLocked ? '#34d399' : '#f59e0b');
        }
      } else {
        lineRef.current.visible = false;
      }
    }
  });

  if (isCrashed) return null;

  return (
    <>
      {/* 3D Connecting Line from Target to Lead Pip */}
      <primitive
        object={
          new THREE.Line(
            lineGeometry,
            new THREE.LineBasicMaterial({
              color: '#f59e0b',
              transparent: true,
              opacity: 0.75,
              depthTest: false
            })
          )
        }
        ref={lineRef}
        renderOrder={998}
      />

      {/* 3D Target Brackets around Aircraft */}
      <group ref={targetBoxGroupRef} renderOrder={999}>
        {/* 4 Corner Bracket Segments */}
        {/* Top-Left */}
        <mesh position={[-1.2, 1.2, 0]}>
          <boxGeometry args={[0.8, 0.08, 0.01]} />
          <meshBasicMaterial color={accentColor} depthTest={false} transparent opacity={0.9} />
        </mesh>
        <mesh position={[-1.6, 0.8, 0]}>
          <boxGeometry args={[0.08, 0.8, 0.01]} />
          <meshBasicMaterial color={accentColor} depthTest={false} transparent opacity={0.9} />
        </mesh>

        {/* Top-Right */}
        <mesh position={[1.2, 1.2, 0]}>
          <boxGeometry args={[0.8, 0.08, 0.01]} />
          <meshBasicMaterial color={accentColor} depthTest={false} transparent opacity={0.9} />
        </mesh>
        <mesh position={[1.6, 0.8, 0]}>
          <boxGeometry args={[0.08, 0.8, 0.01]} />
          <meshBasicMaterial color={accentColor} depthTest={false} transparent opacity={0.9} />
        </mesh>

        {/* Bottom-Left */}
        <mesh position={[-1.2, -1.2, 0]}>
          <boxGeometry args={[0.8, 0.08, 0.01]} />
          <meshBasicMaterial color={accentColor} depthTest={false} transparent opacity={0.9} />
        </mesh>
        <mesh position={[-1.6, -0.8, 0]}>
          <boxGeometry args={[0.08, 0.8, 0.01]} />
          <meshBasicMaterial color={accentColor} depthTest={false} transparent opacity={0.9} />
        </mesh>

        {/* Bottom-Right */}
        <mesh position={[1.2, -1.2, 0]}>
          <boxGeometry args={[0.8, 0.08, 0.01]} />
          <meshBasicMaterial color={accentColor} depthTest={false} transparent opacity={0.9} />
        </mesh>
        <mesh position={[1.6, -0.8, 0]}>
          <boxGeometry args={[0.08, 0.8, 0.01]} />
          <meshBasicMaterial color={accentColor} depthTest={false} transparent opacity={0.9} />
        </mesh>
      </group>

      {/* 3D Predictive Lead Pip Reticle */}
      <group ref={leadPipGroupRef} renderOrder={1000}>
        {/* Outer Circular Ring */}
        <mesh ref={leadRingMeshRef}>
          <ringGeometry args={[0.65, 0.75, 24]} />
          <meshBasicMaterial color="#f59e0b" depthTest={false} transparent opacity={0.95} />
        </mesh>

        {/* Inner Aim Dot */}
        <mesh>
          <circleGeometry args={[0.12, 12]} />
          <meshBasicMaterial color="#ffffff" depthTest={false} />
        </mesh>

        {/* 4 Crosshair Ticks */}
        <mesh position={[-0.85, 0, 0]}>
          <boxGeometry args={[0.35, 0.06, 0.01]} />
          <meshBasicMaterial color="#f59e0b" depthTest={false} />
        </mesh>
        <mesh position={[0.85, 0, 0]}>
          <boxGeometry args={[0.35, 0.06, 0.01]} />
          <meshBasicMaterial color="#f59e0b" depthTest={false} />
        </mesh>
        <mesh position={[0, 0.85, 0]}>
          <boxGeometry args={[0.06, 0.35, 0.01]} />
          <meshBasicMaterial color="#f59e0b" depthTest={false} />
        </mesh>
        <mesh position={[0, -0.85, 0]}>
          <boxGeometry args={[0.06, 0.35, 0.01]} />
          <meshBasicMaterial color="#f59e0b" depthTest={false} />
        </mesh>
      </group>
    </>
  );
};
