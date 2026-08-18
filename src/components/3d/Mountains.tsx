import React from 'react';

export const Mountains: React.FC = () => {
  return (
    <group>
      {/* ========================================================================= */}
      {/* 1. SOUTH MOUNTAIN RIDGE ([450, 0, 650])                                   */}
      {/* ========================================================================= */}
      <group position={[450, 0, 650]}>
        {/* Main Peak (Height 190m) */}
        <mesh position={[0, 95, 0]} castShadow receiveShadow>
          <coneGeometry args={[180, 190, 7]} />
          <meshStandardMaterial color="#475569" flatShading roughness={0.9} />
        </mesh>
        {/* Snow Cap */}
        <mesh position={[0, 165, 0]} castShadow>
          <coneGeometry args={[65, 55, 7]} />
          <meshStandardMaterial color="#f8fafc" flatShading roughness={0.3} />
        </mesh>

        {/* Secondary Sub-Peak */}
        <mesh position={[-90, 65, 80]} castShadow receiveShadow>
          <coneGeometry args={[120, 130, 6]} />
          <meshStandardMaterial color="#334155" flatShading roughness={0.9} />
        </mesh>
        <mesh position={[-90, 115, 80]}>
          <coneGeometry args={[45, 35, 6]} />
          <meshStandardMaterial color="#f8fafc" flatShading />
        </mesh>

        {/* Third Sub-Peak */}
        <mesh position={[80, 50, -70]} castShadow receiveShadow>
          <coneGeometry args={[100, 100, 6]} />
          <meshStandardMaterial color="#334155" flatShading roughness={0.9} />
        </mesh>
      </group>

      {/* ========================================================================= */}
      {/* 2. WEST SNOW PEAK ([-650, 0, 450])                                        */}
      {/* ========================================================================= */}
      <group position={[-650, 0, 450]}>
        {/* Sharp High Peak (Height 230m) */}
        <mesh position={[0, 115, 0]} castShadow receiveShadow>
          <coneGeometry args={[150, 230, 6]} />
          <meshStandardMaterial color="#334155" flatShading roughness={0.95} />
        </mesh>
        {/* White Snow Cap */}
        <mesh position={[0, 195, 0]} castShadow>
          <coneGeometry args={[60, 75, 6]} />
          <meshStandardMaterial color="#ffffff" flatShading roughness={0.2} />
        </mesh>

        {/* Rocky Foot Ridge */}
        <mesh position={[70, 45, -60]} castShadow receiveShadow>
          <coneGeometry args={[110, 90, 5]} />
          <meshStandardMaterial color="#475569" flatShading />
        </mesh>
      </group>

      {/* ========================================================================= */}
      {/* 3. EAST SEA NEEDLES & ROCK ARCH ([950, 0, 150])                           */}
      {/* ========================================================================= */}
      <group position={[950, 0, 150]}>
        {/* Towering Rock Needle (Height 160m) */}
        <mesh position={[0, 80, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[25, 75, 160, 6]} />
          <meshStandardMaterial color="#78716c" flatShading roughness={0.9} />
        </mesh>
        {/* Adjacent Needle */}
        <mesh position={[-60, 60, 50]} castShadow receiveShadow>
          <cylinderGeometry args={[20, 60, 120, 5]} />
          <meshStandardMaterial color="#57534e" flatShading roughness={0.9} />
        </mesh>
        {/* Third Needle */}
        <mesh position={[50, 45, -45]} castShadow receiveShadow>
          <cylinderGeometry args={[15, 45, 90, 5]} />
          <meshStandardMaterial color="#78716c" flatShading roughness={0.9} />
        </mesh>
      </group>

      {/* ========================================================================= */}
      {/* 4. NORTH VOLCANO ([-450, 0, -1300])                                       */}
      {/* ========================================================================= */}
      <group position={[-450, 0, -1300]}>
        {/* Massive Volcanic Cone (Height 270m) */}
        <mesh position={[0, 125, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[80, 240, 250, 8]} />
          <meshStandardMaterial color="#292524" flatShading roughness={0.95} />
        </mesh>
        {/* Volcano Crater Core with Glowing Lava */}
        <mesh position={[0, 248, 0]}>
          <cylinderGeometry args={[75, 78, 8, 8]} />
          <meshStandardMaterial color="#0c0a09" flatShading />
        </mesh>
        <mesh position={[0, 249, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[65, 8]} />
          <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={3.0} />
        </mesh>
      </group>
    </group>
  );
};
