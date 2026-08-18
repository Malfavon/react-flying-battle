import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CloudCluster {
  x: number;
  y: number;
  z: number;
  scale: number;
}

export const Clouds: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  // Generate random cloud positions across the map
  const clusters = useMemo<CloudCluster[]>(() => {
    const list: CloudCluster[] = [];
    for (let i = 0; i < 35; i++) {
      list.push({
        x: (Math.random() - 0.5) * 4500,
        y: 180 + Math.random() * 260, // Altitude 180m - 440m
        z: (Math.random() - 0.5) * 4500,
        scale: 1.0 + Math.random() * 1.5
      });
    }
    return list;
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    // Gentle drift with prevailing wind
    groupRef.current.position.x += 2.5 * delta;
    if (groupRef.current.position.x > 2000) {
      groupRef.current.position.x = -2000;
    }
  });

  return (
    <group ref={groupRef}>
      {clusters.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.scale}>
          {/* Main Cloud Block */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[45, 14, 30]} />
            <meshStandardMaterial color="#ffffff" roughness={0.1} flatShading />
          </mesh>
          {/* Secondary Puffs */}
          <mesh position={[-15, 6, -5]} castShadow>
            <boxGeometry args={[28, 12, 22]} />
            <meshStandardMaterial color="#ffffff" roughness={0.1} flatShading />
          </mesh>
          <mesh position={[16, 5, 8]} castShadow>
            <boxGeometry args={[32, 11, 24]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.1} flatShading />
          </mesh>
          <mesh position={[0, 9, 2]} castShadow>
            <boxGeometry args={[22, 10, 18]} />
            <meshStandardMaterial color="#ffffff" roughness={0.1} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
};
