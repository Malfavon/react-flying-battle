import { useCallback } from 'react';
import * as THREE from 'three';
import { MountainHazard, RunwayZone } from '../types/flight';

export const RUNWAYS: RunwayZone[] = [
  {
    id: 'main-airport',
    name: 'Main Airport 09/27',
    center: [0, 6.0, 0],
    length: 520,
    width: 50,
    elevation: 6.0,
    headingDeg: 0
  },
  {
    id: 'sandbar-strip',
    name: 'Coral Sandbar Strip',
    center: [750, 5.0, -800],
    length: 330,
    width: 40,
    elevation: 5.0,
    headingDeg: 45
  },
  {
    id: 'highland-plateau',
    name: 'Highland Mesa 18/36',
    center: [-900, 70.0, -600],
    length: 330,
    width: 45,
    elevation: 70.0,
    headingDeg: 90
  }
];

export const ISLAND_BOUNDS = [
  { center: [0, 0], radius: 360, elevation: 6.0 },
  { center: [750, -800], radius: 240, elevation: 5.0 },
  { center: [-900, -600], radius: 220, elevation: 70.0 }
];

export const MOUNTAIN_HAZARDS: MountainHazard[] = [
  {
    id: 'peak-south',
    position: [450, 0, 650],
    radius: 260,
    height: 190
  },
  {
    id: 'peak-west',
    position: [-650, 0, 450],
    radius: 200,
    height: 230
  },
  {
    id: 'rock-needles-east',
    position: [950, 0, 150],
    radius: 120,
    height: 160
  },
  {
    id: 'volcano-north',
    position: [-450, 0, -1300],
    radius: 320,
    height: 270
  }
];

export function useCollision() {
  // Determine if position is currently over a runway or island, and calculate ground elevation
  const getGroundInfo = useCallback((pos: THREE.Vector3) => {
    let groundElevation = 0;
    let isOnRunway = false;
    let currentRunway: RunwayZone | null = null;

    // 1. Check runway boundaries
    for (const rw of RUNWAYS) {
      const dx = Math.abs(pos.x - rw.center[0]);
      const dz = Math.abs(pos.z - rw.center[2]);

      // Check within bounding box of runway
      if (dx <= rw.length / 2 + 15 && dz <= rw.width / 2 + 15) {
        isOnRunway = true;
        groundElevation = rw.elevation;
        currentRunway = rw;
        return { groundElevation, isOnRunway, currentRunway };
      }
    }

    // 2. Check general island terrain bounds
    for (const island of ISLAND_BOUNDS) {
      const dx = pos.x - island.center[0];
      const dz = pos.z - island.center[1];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= island.radius) {
        groundElevation = island.elevation;
        isOnRunway = false;
        return { groundElevation, isOnRunway: false, currentRunway: null };
      }
    }

    return {
      groundElevation: 0,
      isOnRunway: false,
      currentRunway: null
    };
  }, []);

  // Check collision with water, mountains, or hard landing
  const checkCollision = useCallback((
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    rollDeg: number,
    pitchDeg: number
  ): { crashed: boolean; reason: string | null } => {
    const { groundElevation } = getGroundInfo(pos);

    // 1. Water Crash (Altitude <= 0.8 outside any elevated terrain)
    if (pos.y <= 0.8 && groundElevation === 0) {
      return {
        crashed: true,
        reason: 'Water Crash: The plane ditched into the ocean!'
      };
    }

    // 2. Ground / Runway Hard Landing / Crash Check
    const gearHeight = groundElevation + 1.2;
    if (pos.y <= gearHeight + 0.15) {
      // If descending onto open ocean
      if (groundElevation === 0 && pos.y <= 1.0) {
        return {
          crashed: true,
          reason: 'Water Crash: Missed the runway and plunged into the ocean!'
        };
      }

      // If touching ground with high descent speed or excessive tilt
      const descentSpeed = -vel.y;
      if (descentSpeed > 5.0) {
        return {
          crashed: true,
          reason: `Hard Landing: Touchdown descent rate too steep (${(descentSpeed * 196.85).toFixed(0)} ft/min)!`
        };
      }

      if (Math.abs(rollDeg) > 30) {
        return {
          crashed: true,
          reason: `Wing Strike: Touched ground with excessive bank angle (${rollDeg.toFixed(0)}°)!`
        };
      }

      if (pitchDeg < -18 || pitchDeg > 32) {
        return {
          crashed: true,
          reason: `Gear Collapse: Landing pitch angle was out of safe limits (${pitchDeg.toFixed(0)}°)!`
        };
      }
    }

    // 3. Mountain Obstacle Collisions
    for (const mtn of MOUNTAIN_HAZARDS) {
      const dx = pos.x - mtn.position[0];
      const dz = pos.z - mtn.position[2];
      const distXZ = Math.sqrt(dx * dx + dz * dz);

      if (distXZ < mtn.radius) {
        // Conical / stepped mountain height profile
        const heightAtPoint = mtn.height * (1.0 - distXZ / mtn.radius);
        if (pos.y <= heightAtPoint + 1.5) {
          return {
            crashed: true,
            reason: `Mountain Impact: Crashed directly into rocky peak!`
          };
        }
      }
    }

    return { crashed: false, reason: null };
  }, [getGroundInfo]);

  return {
    runways: RUNWAYS,
    mountains: MOUNTAIN_HAZARDS,
    getGroundInfo,
    checkCollision
  };
}
