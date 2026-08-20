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
  onBulletHit?: (targetId: string, bulletId: string, damage: number) => void;
}

const MAX_BULLETS = 200;
const MAX_SPARKS = 150;
const BULLET_RADIUS = 3.6; // Collision radius against planes (meters)

export const Bullets = forwardRef<BulletsHandle, BulletsProps>(({
  remotePlayers,
  localId,
  onBulletHit
}, ref) => {
  const bulletsRef = useRef<ActiveBullet[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const muzzleFlashRef = useRef<MuzzleFlashState | null>(null);

  // Three.js references
  const coreMeshRef = useRef<THREE.InstancedMesh>(null);
  const glowMeshRef = useRef<THREE.InstancedMesh>(null);
  const sparksMeshRef = useRef<THREE.InstancedMesh>(null);
  const muzzleGroupRef = useRef<THREE.Group>(null);

  // Temporary transform objects for instanced matrix math
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const sparkDummy = useMemo(() => new THREE.Object3D(), []);

  // Pre-rotated geometries so cylinder aligns along -Z (forward)
  const coreGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.09, 0.09, 2.8, 8);
    geo.rotateX(Math.PI / 2);
    return geo;
  }, []);

  const glowGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.22, 0.22, 3.2, 8);
    geo.rotateX(Math.PI / 2);
    return geo;
  }, []);

  const sparkGeometry = useMemo(() => new THREE.SphereGeometry(0.25, 6, 6), []);

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
          pos: posVec,
          vel: velVec,
          quat,
          createdAt: performance.now(),
          lifetime: (bullet.lifetime || 2.5) * 1000,
          damage: bullet.damage || 8
        });
      }
    },
    triggerMuzzleFlash: (pos: [number, number, number], quat: THREE.Quaternion) => {
      muzzleFlashRef.current = {
        pos: new THREE.Vector3(...pos),
        quat: quat.clone(),
        expiresAt: performance.now() + 75 // 75ms flash
      };
    }
  }));

  const spawnSparks = (pos: THREE.Vector3) => {
    for (let i = 0; i < 8; i++) {
      if (sparksRef.current.length >= MAX_SPARKS) break;
      const speed = 5 + Math.random() * 14;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      sparksRef.current.push({
        pos: pos.clone(),
        vel: new THREE.Vector3(
          Math.cos(theta) * Math.cos(phi) * speed,
          Math.sin(phi) * speed + 2,
          Math.sin(theta) * Math.cos(phi) * speed
        ),
        scale: 0.25 + Math.random() * 0.35,
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

    // 1. Update active bullets & check hits
    for (let i = 0; i < activeBullets.length; i++) {
      const b = activeBullets[i];
      const age = now - b.createdAt;

      if (age > b.lifetime) {
        continue; // Expired
      }

      // Step position forward along velocity
      b.pos.addScaledVector(b.vel, dt);

      // Check ground/water hit
      if (b.pos.y <= 0.5) {
        spawnSparks(b.pos);
        continue; // Hit water/ground
      }

      let hit = false;

      // Hit detection: local player's bullets check against remote players
      const isLocalBullet = !b.shooterId || b.shooterId === 'local' || (localId && b.shooterId === localId);
      if (isLocalBullet) {
        for (const player of remotePlayers) {
          if (player.isCrashed) continue;

          const dx = b.pos.x - player.position[0];
          const dy = b.pos.y - player.position[1];
          const dz = b.pos.z - player.position[2];
          const distSq = dx * dx + dy * dy + dz * dz;

          if (distSq <= BULLET_RADIUS * BULLET_RADIUS) {
            hit = true;
            spawnSparks(b.pos);
            if (onBulletHit) {
              onBulletHit(player.id, b.id, b.damage);
            }
            break;
          }
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

    // 3. Update Muzzle Flash visibility & transform
    if (muzzleGroupRef.current) {
      if (muzzleFlashRef.current && now <= muzzleFlashRef.current.expiresAt) {
        muzzleGroupRef.current.visible = true;
        muzzleGroupRef.current.position.copy(muzzleFlashRef.current.pos);
        muzzleGroupRef.current.quaternion.copy(muzzleFlashRef.current.quat);
      } else {
        muzzleGroupRef.current.visible = false;
        if (muzzleFlashRef.current && now > muzzleFlashRef.current.expiresAt) {
          muzzleFlashRef.current = null;
        }
      }
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
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.85} depthWrite={false} toneMapped={false} />
      </instancedMesh>

      {/* Impact Sparks (Instanced) */}
      <instancedMesh
        ref={sparksMeshRef}
        args={[sparkGeometry, undefined, MAX_SPARKS]}
        frustumCulled={false}
      >
        <meshBasicMaterial color="#fde047" transparent opacity={0.9} depthWrite={false} toneMapped={false} />
      </instancedMesh>

      {/* Muzzle Flash Effect at Nose */}
      <group ref={muzzleGroupRef} visible={false}>
        <mesh>
          <sphereGeometry args={[0.35, 8, 8]} />
          <meshBasicMaterial color="#fef08a" toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.65, 8, 8]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.65} depthWrite={false} toneMapped={false} />
        </mesh>
        <pointLight color="#fef08a" intensity={4.0} distance={12} />
      </group>
    </group>
  );
});
