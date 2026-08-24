import { useRef, useImperativeHandle, forwardRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Bullet, RemotePlayer } from '../../types/flight';

export interface BulletsHandle {
  spawnBullet: (bullet: Bullet) => void;
  triggerMuzzleFlash: (pos: [number, number, number], quat: THREE.Quaternion) => void;
}

interface ActiveBullet {
  id: string;
  shooterId: string;
  pos: THREE.Vector3;
  prevPos: THREE.Vector3;
  vel: THREE.Vector3;
  quat: THREE.Quaternion;
  createdAt: number;
  lifetime: number;
  damage: number;
}

interface Spark {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  scale: number;
  alpha: number;
  createdAt: number;
}

interface MuzzleFlashState {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  expiresAt: number;
}

interface BulletsProps {
  remotePlayers: RemotePlayer[];
  localId?: string;
  localPos?: [number, number, number];
  onBulletHit?: (targetId: string, bulletId: string, damage: number) => void;
  onLocalHit?: (damage: number, shooterId: string) => void;
}

const MAX_BULLETS = 400;
const MAX_SPARKS = 250;
const BULLET_RADIUS = 3.2; // Realistic aircraft hitbox radius (meters) with continuous swept-segment collision

export const Bullets = forwardRef<BulletsHandle, BulletsProps>(({
  remotePlayers,
  localId,
  localPos,
  onBulletHit,
  onLocalHit
}, ref) => {
  const bulletsRef = useRef<ActiveBullet[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const muzzleFlashesRef = useRef<MuzzleFlashState[]>([]);

  // Three.js references
  const coreMeshRef = useRef<THREE.InstancedMesh>(null);
  const glowMeshRef = useRef<THREE.InstancedMesh>(null);
  const sparksMeshRef = useRef<THREE.InstancedMesh>(null);

  // Temporary transform objects for instanced matrix math
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const sparkDummy = useMemo(() => new THREE.Object3D(), []);

  // Pre-rotated geometries so cylinder aligns along -Z (forward)
  const coreGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.12, 0.12, 3.8, 8);
    geo.rotateX(Math.PI / 2);
    return geo;
  }, []);

  const glowGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.28, 0.28, 4.4, 8);
    geo.rotateX(Math.PI / 2);
    return geo;
  }, []);

  const sparkGeometry = useMemo(() => new THREE.SphereGeometry(0.28, 6, 6), []);

  useImperativeHandle(ref, () => ({
    spawnBullet: (bullet: Bullet) => {
      const posVec = new THREE.Vector3(...bullet.position);
      const velVec = new THREE.Vector3(...bullet.velocity);

      // Compute rotation aligned with velocity vector
      const forward = velVec.clone().normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), forward);

      if (bulletsRef.current.length < MAX_BULLETS) {
        bulletsRef.current.push({
          id: bullet.id,
          shooterId: bullet.shooterId,
          pos: posVec.clone(),
          prevPos: posVec.clone(),
          vel: velVec,
          quat,
          createdAt: performance.now(),
          lifetime: (bullet.lifetime || 2.5) * 1000,
          damage: bullet.damage || 8
        });
      }
    },
    triggerMuzzleFlash: (pos: [number, number, number], quat: THREE.Quaternion) => {
      const flash: MuzzleFlashState = {
        pos: new THREE.Vector3(...pos),
        quat: quat.clone(),
        expiresAt: performance.now() + 65 // 65ms rapid muzzle flash
      };
      muzzleFlashesRef.current = [
        ...muzzleFlashesRef.current.filter((f) => performance.now() <= f.expiresAt),
        flash
      ].slice(-6); // Keep last 6 flashes
    }
  }));

  const spawnSparks = (pos: THREE.Vector3) => {
    for (let i = 0; i < 10; i++) {
      if (sparksRef.current.length >= MAX_SPARKS) break;
      const speed = 6 + Math.random() * 16;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      sparksRef.current.push({
        pos: pos.clone(),
        vel: new THREE.Vector3(
          Math.cos(theta) * Math.cos(phi) * speed,
          Math.sin(phi) * speed + 2.5,
          Math.sin(theta) * Math.cos(phi) * speed
        ),
        scale: 0.28 + Math.random() * 0.35,
        alpha: 1.0,
        createdAt: performance.now()
      });
    }
  };

  // Initialize instanced mesh properties
  useEffect(() => {
    if (coreMeshRef.current) {
      coreMeshRef.current.count = 0;
      coreMeshRef.current.frustumCulled = false;
      coreMeshRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
    if (glowMeshRef.current) {
      glowMeshRef.current.count = 0;
      glowMeshRef.current.frustumCulled = false;
      glowMeshRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
    if (sparksMeshRef.current) {
      sparksMeshRef.current.count = 0;
      sparksMeshRef.current.frustumCulled = false;
      sparksMeshRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const now = performance.now();
    const activeBullets = bulletsRef.current;
    const remainingBullets: ActiveBullet[] = [];

    // Pre-cache remote target vectors for fast collision & magnetism
    const targetEntities = remotePlayers
      .filter((p) => !p.isCrashed)
      .map((p) => ({
        id: p.id,
        pos: new THREE.Vector3(p.position[0], p.position[1], p.position[2])
      }));

    // 1. Update active bullets & check continuous swept-segment hits
    for (let i = 0; i < activeBullets.length; i++) {
      const b = activeBullets[i];
      const age = now - b.createdAt;

      if (age > b.lifetime) {
        continue; // Expired
      }

      b.prevPos.copy(b.pos);

      // Step position forward along velocity (Pure straight ballistics)
      b.pos.addScaledVector(b.vel, dt);

      // Check ground/water hit
      if (b.pos.y <= 0.5) {
        spawnSparks(b.pos);
        continue; // Hit water/ground
      }

      let hit = false;

      // Continuous Swept-Segment Hit Detection (Zero Tunneling)
      const isLocalBullet = !b.shooterId || b.shooterId === 'local' || (localId && b.shooterId === localId);
      const seg = new THREE.Vector3().subVectors(b.pos, b.prevPos);
      const segLenSq = seg.lengthSq();

      if (isLocalBullet && targetEntities.length > 0) {
        for (let t = 0; t < targetEntities.length; t++) {
          const target = targetEntities[t];

          let distSq = 0;
          let closestPoint = b.pos;

          if (segLenSq > 0.0001) {
            const toTarget = new THREE.Vector3().subVectors(target.pos, b.prevPos);
            const factor = THREE.MathUtils.clamp(toTarget.dot(seg) / segLenSq, 0, 1);
            closestPoint = b.prevPos.clone().addScaledVector(seg, factor);
            distSq = closestPoint.distanceToSquared(target.pos);
          } else {
            distSq = b.pos.distanceToSquared(target.pos);
          }

          if (distSq <= BULLET_RADIUS * BULLET_RADIUS) {
            hit = true;
            spawnSparks(closestPoint);
            if (onBulletHit) {
              onBulletHit(target.id, b.id, b.damage);
            }
            break;
          }
        }
      } else if (!isLocalBullet && localPos && onLocalHit) {
        // Non-local bullet (e.g. fired by AI bandit or remote player): check hit on local player
        const localTargetPos = new THREE.Vector3(localPos[0], localPos[1], localPos[2]);
        let distSq = 0;
        let closestPoint = b.pos;

        if (segLenSq > 0.0001) {
          const toTarget = new THREE.Vector3().subVectors(localTargetPos, b.prevPos);
          const factor = THREE.MathUtils.clamp(toTarget.dot(seg) / segLenSq, 0, 1);
          closestPoint = b.prevPos.clone().addScaledVector(seg, factor);
          distSq = closestPoint.distanceToSquared(localTargetPos);
        } else {
          distSq = b.pos.distanceToSquared(localTargetPos);
        }

        if (distSq <= BULLET_RADIUS * BULLET_RADIUS) {
          hit = true;
          spawnSparks(closestPoint);
          onLocalHit(b.damage, b.shooterId);
        }
      }

      if (!hit) {
        remainingBullets.push(b);
      }
    }

    bulletsRef.current = remainingBullets;

    // Update Bullet Instanced Meshes
    if (coreMeshRef.current && glowMeshRef.current) {
      const count = remainingBullets.length;
      for (let i = 0; i < count; i++) {
        const b = remainingBullets[i];
        dummy.position.copy(b.pos);
        dummy.quaternion.copy(b.quat);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();

        coreMeshRef.current.setMatrixAt(i, dummy.matrix);
        glowMeshRef.current.setMatrixAt(i, dummy.matrix);
      }

      coreMeshRef.current.count = count;
      glowMeshRef.current.count = count;
      coreMeshRef.current.instanceMatrix.needsUpdate = true;
      glowMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // 2. Update impact sparks
    const remainingSparks: Spark[] = [];
    for (let i = 0; i < sparksRef.current.length; i++) {
      const s = sparksRef.current[i];
      const sparkAge = now - s.createdAt;
      if (sparkAge > 400) continue; // 400ms spark life

      s.vel.y -= 15.0 * dt;
      s.pos.addScaledVector(s.vel, dt);
      s.alpha = Math.max(0, 1.0 - sparkAge / 400);
      remainingSparks.push(s);
    }
    sparksRef.current = remainingSparks;

    // Update Sparks Instanced Mesh
    if (sparksMeshRef.current) {
      const count = remainingSparks.length;
      for (let i = 0; i < count; i++) {
        const s = remainingSparks[i];
        sparkDummy.position.copy(s.pos);
        const curScale = s.scale * s.alpha;
        sparkDummy.scale.set(curScale, curScale, curScale);
        sparkDummy.updateMatrix();

        sparksMeshRef.current.setMatrixAt(i, sparkDummy.matrix);
      }

      sparksMeshRef.current.count = count;
      sparksMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* High-visibility glowing tracer core (Instanced) */}
      <instancedMesh
        ref={coreMeshRef}
        args={[coreGeometry, undefined, MAX_BULLETS]}
        frustumCulled={false}
      >
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>

      {/* Outer glowing laser shell (Instanced) */}
      <instancedMesh
        ref={glowMeshRef}
        args={[glowGeometry, undefined, MAX_BULLETS]}
        frustumCulled={false}
      >
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.88} depthWrite={false} toneMapped={false} />
      </instancedMesh>

      {/* Impact Sparks (Instanced) */}
      <instancedMesh
        ref={sparksMeshRef}
        args={[sparkGeometry, undefined, MAX_SPARKS]}
        frustumCulled={false}
      >
        <meshBasicMaterial color="#fde047" transparent opacity={0.9} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  );
});
