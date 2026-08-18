import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const Ocean: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Generate a subdivided low-poly plane geometry
  const { geometry, originalPositions } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(7000, 7000, 100, 100);
    geo.rotateX(-Math.PI / 2);
    
    // Store original positions for wave animation
    const posAttr = geo.attributes.position;
    const orig = new Float32Array(posAttr.array.length);
    orig.set(posAttr.array);

    return { geometry: geo, originalPositions: orig };
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    const posAttr = meshRef.current.geometry.attributes.position;
    const array = posAttr.array as Float32Array;

    // Displace vertices with gentle low-poly sea waves (amplitude max ~0.8m so it never clips islands)
    for (let i = 0; i < array.length; i += 3) {
      const x = originalPositions[i];
      const z = originalPositions[i + 2];

      const wave1 = Math.sin(x * 0.012 + time * 1.1) * Math.cos(z * 0.012 + time * 0.7) * 0.65;
      const wave2 = Math.sin(x * 0.03 - time * 0.8 + z * 0.02) * 0.35;
      
      array[i + 1] = wave1 + wave2; // Y coordinate around 0
    }

    posAttr.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, 0, 0]} receiveShadow>
      <meshStandardMaterial
        color="#1d4ed8"
        roughness={0.2}
        metalness={0.1}
        flatShading={true}
      />
    </mesh>
  );
};
