import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  rotVelocity: THREE.Vector3;
  scale: number;
  color: string;
}

interface CrashParticlesProps {
  position: [number, number, number];
}

export const CrashParticles: React.FC<CrashParticlesProps> = ({ position }) => {
  const groupRef = useRef<THREE.Group>(null);

  const particles = useMemo<Particle[]>(() => {
    const list: Particle[] = [];
    const colors = ['#f8fafc', '#0284c7', '#ef4444', '#f97316', '#334155', '#eab308'];

    for (let i = 0; i < 30; i++) {
      const speed = 8 + Math.random() * 25;
      const angleTheta = Math.random() * Math.PI * 2;
      const anglePhi = (Math.random() - 0.2) * Math.PI;

      const vx = Math.cos(angleTheta) * Math.cos(anglePhi) * speed;
      const vy = Math.abs(Math.sin(anglePhi) * speed) + 5;
      const vz = Math.sin(angleTheta) * Math.cos(anglePhi) * speed;

      list.push({
        position: new THREE.Vector3(
          position[0] + (Math.random() - 0.5) * 2,
          position[1] + (Math.random() - 0.5) * 2,
          position[2] + (Math.random() - 0.5) * 2
        ),
        velocity: new THREE.Vector3(vx, vy, vz),
        rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        rotVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ),
        scale: 0.3 + Math.random() * 0.7,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    return list;
  }, [position]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    particles.forEach((p) => {
      // Gravity
      p.velocity.y -= 25.0 * dt;
      // Position update
      p.position.addScaledVector(p.velocity, dt);
      // Floor bounce / clamp
      if (p.position.y <= 0.2) {
        p.position.y = 0.2;
        p.velocity.y = -p.velocity.y * 0.4;
        p.velocity.x *= 0.8;
        p.velocity.z *= 0.8;
      }
      // Spin
      p.rotation.x += p.rotVelocity.x * dt;
      p.rotation.y += p.rotVelocity.y * dt;
      p.rotation.z += p.rotVelocity.z * dt;
    });

    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        if (particles[i]) {
          child.position.copy(particles[i].position);
          child.rotation.copy(particles[i].rotation);
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <mesh key={i} scale={p.scale} castShadow>
          <boxGeometry args={[0.8, 0.5, 0.8]} />
          <meshStandardMaterial color={p.color} flatShading roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
};
