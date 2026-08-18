import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const Islands: React.FC = () => {
  const windsockRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (windsockRef.current) {
      windsockRef.current.rotation.y = Math.sin(time * 0.5) * 0.2 + 0.5;
      windsockRef.current.rotation.z = Math.sin(time * 2.5) * 0.08;
    }
  });

  return (
    <group>
      {/* ========================================================================= */}
      {/* 1. MAIN AIRPORT ISLAND (Runway Elevation Y = 6.0m)                       */}
      {/* ========================================================================= */}
      <group position={[0, 0, 0]}>
        {/* Shallow Water Coral/Reef Base (Under Sea) */}
        <mesh position={[0, 0, 0]} receiveShadow>
          <cylinderGeometry args={[440, 500, 6, 24]} />
          <meshStandardMaterial color="#06b6d4" flatShading roughness={0.6} />
        </mesh>

        {/* Sandy Beach Island Base */}
        <mesh position={[0, 2.5, 0]} receiveShadow>
          <cylinderGeometry args={[360, 420, 6, 20]} />
          <meshStandardMaterial color="#fde047" flatShading roughness={0.9} />
        </mesh>

        {/* Green Grass Terrain Plateau (Top at Y = 5.9m) */}
        <mesh position={[0, 4.5, 0]} receiveShadow>
          <cylinderGeometry args={[320, 365, 3, 20]} />
          <meshStandardMaterial color="#15803d" flatShading roughness={0.8} />
        </mesh>

        {/* Main Paved Runway (Asphalt: 500m length x 45m width, at Y = 6.0m) */}
        <mesh position={[0, 6.0, 0]} receiveShadow>
          <boxGeometry args={[500, 0.2, 45]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>

        {/* Runway White Centerline Dashes */}
        {Array.from({ length: 15 }).map((_, i) => (
          <mesh key={i} position={[-210 + i * 30, 6.12, 0]}>
            <boxGeometry args={[16, 0.04, 2.2]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.2} />
          </mesh>
        ))}

        {/* Runway Threshold Lines (West End) */}
        {[-14, -7, 0, 7, 14].map((offsetZ, i) => (
          <mesh key={`thresh-w-${i}`} position={[-235, 6.12, offsetZ]}>
            <boxGeometry args={[15, 0.04, 2.5]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
        ))}

        {/* Runway Threshold Lines (East End) */}
        {[-14, -7, 0, 7, 14].map((offsetZ, i) => (
          <mesh key={`thresh-e-${i}`} position={[235, 6.12, offsetZ]}>
            <boxGeometry args={[15, 0.04, 2.5]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
        ))}

        {/* Green Runway Threshold Lights (West & East) */}
        {[-20, -10, 0, 10, 20].map((z, i) => (
          <React.Fragment key={`lights-${i}`}>
            <mesh position={[-248, 6.4, z]}>
              <sphereGeometry args={[0.5, 6, 6]} />
              <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2.0} />
            </mesh>
            <mesh position={[248, 6.4, z]}>
              <sphereGeometry args={[0.5, 6, 6]} />
              <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2.0} />
            </mesh>
          </React.Fragment>
        ))}

        {/* Airport Control Tower */}
        <group position={[-60, 6.0, 65]}>
          {/* Base */}
          <mesh position={[0, 10, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[3.5, 4.5, 20, 8]} />
            <meshStandardMaterial color="#94a3b8" flatShading />
          </mesh>
          {/* Cab (Glass Observation Room) */}
          <mesh position={[0, 21.5, 0]} castShadow>
            <cylinderGeometry args={[5.5, 4.2, 3.5, 8]} />
            <meshStandardMaterial color="#0284c7" transparent opacity={0.8} />
          </mesh>
          {/* Roof & Radar Dome */}
          <mesh position={[0, 24, 0]} castShadow>
            <coneGeometry args={[5.8, 2, 8]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0, 25.5, 0]}>
            <sphereGeometry args={[1.2, 8, 8]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
        </group>

        {/* Aircraft Hangar */}
        <group position={[60, 6.0, 70]}>
          <mesh position={[0, 7, 0]} castShadow receiveShadow>
            <boxGeometry args={[45, 14, 30]} />
            <meshStandardMaterial color="#475569" flatShading />
          </mesh>
          {/* Hangar Arched Roof */}
          <mesh position={[0, 14.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[8, 8, 45, 12, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#334155" flatShading />
          </mesh>
          {/* Hangar Open Doorway */}
          <mesh position={[0, 5.5, -15.1]}>
            <boxGeometry args={[30, 11, 0.2]} />
            <meshStandardMaterial color="#090d16" />
          </mesh>
        </group>

        {/* Airport Windsock */}
        <group position={[-150, 6.0, -45]}>
          <mesh position={[0, 4, 0]}>
            <cylinderGeometry args={[0.15, 0.2, 8, 6]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} />
          </mesh>
          <group ref={windsockRef} position={[0, 7.8, 0]}>
            <mesh position={[0, 0, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.7, 2.5, 8, 1, true]} />
              <meshStandardMaterial color="#f97316" side={THREE.DoubleSide} />
            </mesh>
          </group>
        </group>

        {/* Low-Poly Trees on Island Perimeter */}
        {[
          [-180, 45], [-160, 70], [-210, -50], [-120, 85],
          [140, 75], [190, 50], [210, -45], [160, -70]
        ].map(([tx, tz], i) => (
          <group key={`tree-${i}`} position={[tx, 6.0, tz]}>
            {/* Trunk */}
            <mesh position={[0, 2.5, 0]} castShadow>
              <cylinderGeometry args={[0.5, 0.7, 5, 5]} />
              <meshStandardMaterial color="#78350f" />
            </mesh>
            {/* Foliage Cones */}
            <mesh position={[0, 6, 0]} castShadow>
              <coneGeometry args={[3.2, 4.5, 6]} />
              <meshStandardMaterial color="#16a34a" flatShading />
            </mesh>
            <mesh position={[0, 8.5, 0]} castShadow>
              <coneGeometry args={[2.4, 3.8, 6]} />
              <meshStandardMaterial color="#22c55e" flatShading />
            </mesh>
          </group>
        ))}
      </group>

      {/* ========================================================================= */}
      {/* 2. SANDBAR ATOLL STRIP ([750, 0, -800], Runway Elevation Y = 5.0m)       */}
      {/* ========================================================================= */}
      <group position={[750, 0, -800]} rotation={[0, Math.PI / 4, 0]}>
        {/* Sand Base extending from water */}
        <mesh position={[0, 2.0, 0]} receiveShadow>
          <cylinderGeometry args={[220, 270, 6, 16]} />
          <meshStandardMaterial color="#fef08a" flatShading roughness={0.9} />
        </mesh>

        {/* Compact Dirt / Sand Airstrip (320m x 35m, at Y = 5.0m) */}
        <mesh position={[0, 5.0, 0]} receiveShadow>
          <boxGeometry args={[320, 0.2, 35]} />
          <meshStandardMaterial color="#d97706" roughness={0.9} />
        </mesh>

        {/* Runway Edge Markers (Orange cones) */}
        {[-140, -70, 0, 70, 140].map((x, i) => (
          <React.Fragment key={`sandbar-marker-${i}`}>
            <mesh position={[x, 5.5, -19]}>
              <coneGeometry args={[0.6, 1.2, 6]} />
              <meshStandardMaterial color="#ea580c" />
            </mesh>
            <mesh position={[x, 5.5, 19]}>
              <coneGeometry args={[0.6, 1.2, 6]} />
              <meshStandardMaterial color="#ea580c" />
            </mesh>
          </React.Fragment>
        ))}

        {/* Small Atoll Radio Hut */}
        <mesh position={[-60, 7.5, 40]} castShadow>
          <boxGeometry args={[10, 5, 8]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[-60, 10.8, 40]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[7, 3, 4]} />
          <meshStandardMaterial color="#b91c1c" />
        </mesh>
      </group>

      {/* ========================================================================= */}
      {/* 3. HIGHLAND MESA ISLAND ([-900, 0, -600], Runway Elevation Y = 70.0m)    */}
      {/* ========================================================================= */}
      <group position={[-900, 0, -600]} rotation={[0, Math.PI / 2, 0]}>
        {/* Massive Cliff Base */}
        <mesh position={[0, 35, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[220, 320, 70, 12]} />
          <meshStandardMaterial color="#57534e" flatShading roughness={0.95} />
        </mesh>

        {/* Mesa Top Grass */}
        <mesh position={[0, 70.0, 0]} receiveShadow>
          <cylinderGeometry args={[200, 215, 1.0, 12]} />
          <meshStandardMaterial color="#4d7c0f" flatShading roughness={0.8} />
        </mesh>

        {/* Elevated Runway (320m x 40m, at Y = 70.2m) */}
        <mesh position={[0, 70.2, 0]} receiveShadow>
          <boxGeometry args={[320, 0.2, 40]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>

        {/* White Dashed Line */}
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh key={`highland-dash-${i}`} position={[-120 + i * 30, 70.35, 0]}>
            <boxGeometry args={[14, 0.04, 2.0]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
        ))}

        {/* Runway Beacon Tower */}
        <mesh position={[-140, 78, 30]} castShadow>
          <cylinderGeometry args={[0.6, 1.2, 16, 6]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[-140, 86.5, 30]}>
          <sphereGeometry args={[1.2, 8, 8]} />
          <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={2.0} />
        </mesh>
      </group>
    </group>
  );
};
