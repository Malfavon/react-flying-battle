import { useRef, useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { RemotePlayer } from '../types/flight';
import { BanditAIEngine, BanditSpawnOptions } from '../ai/BanditAIEngine';
import { BulletsHandle } from '../components/3d/Bullets';

export const INITIAL_BANDIT_SQUADRON: BanditSpawnOptions[] = [
  {
    id: 'bandit-01',
    callsign: 'VIPER-01',
    name: 'Crimson Viper',
    color: '#0f172a',
    accentColor: '#ef4444',
    wingColor: '#1e293b',
    position: [0, 200, -1000],
    headingDeg: 180, // Facing South
    speedMs: 46
  },
  {
    id: 'bandit-02',
    callsign: 'SCARLET-02',
    name: 'Scarlet Ace',
    color: '#450a0a',
    accentColor: '#f87171',
    wingColor: '#7f1d1d',
    position: [588, 215, -809],
    headingDeg: 216, // Facing SSW
    speedMs: 47
  },
  {
    id: 'bandit-03',
    callsign: 'RAVEN-03',
    name: 'Shadow Raven',
    color: '#1e1b4b',
    accentColor: '#a855f7',
    wingColor: '#312e81',
    position: [951, 195, -309],
    headingDeg: 252, // Facing WSW
    speedMs: 45
  },
  {
    id: 'bandit-04',
    callsign: 'RAPTOR-04',
    name: 'Ghost Raptor',
    color: '#18181b',
    accentColor: '#f97316',
    wingColor: '#27272a',
    position: [951, 220, 309],
    headingDeg: 288, // Facing WNW
    speedMs: 48
  },
  {
    id: 'bandit-05',
    callsign: 'FALCON-05',
    name: 'Iron Falcon',
    color: '#064e3b',
    accentColor: '#10b981',
    wingColor: '#065f46',
    position: [588, 205, 809],
    headingDeg: 324, // Facing NNW
    speedMs: 46
  },
  {
    id: 'bandit-06',
    callsign: 'HAWK-06',
    name: 'Thunder Hawk',
    color: '#164e63',
    accentColor: '#06b6d4',
    wingColor: '#155e75',
    position: [0, 210, 1000],
    headingDeg: 0, // Facing North
    speedMs: 45
  },
  {
    id: 'bandit-07',
    callsign: 'COBRA-07',
    name: 'Desert Cobra',
    color: '#78350f',
    accentColor: '#f59e0b',
    wingColor: '#92400e',
    position: [-588, 195, 809],
    headingDeg: 36, // Facing NNE
    speedMs: 46
  },
  {
    id: 'bandit-08',
    callsign: 'STALKER-08',
    name: 'Night Stalker',
    color: '#0c4a6e',
    accentColor: '#38bdf8',
    wingColor: '#075985',
    position: [-951, 225, 309],
    headingDeg: 72, // Facing ENE
    speedMs: 47
  },
  {
    id: 'bandit-09',
    callsign: 'APEX-09',
    name: 'Apex Predator',
    color: '#171717',
    accentColor: '#eab308',
    wingColor: '#262626',
    position: [-951, 215, -309],
    headingDeg: 108, // Facing ESE
    speedMs: 48
  },
  {
    id: 'bandit-10',
    callsign: 'PHOENIX-10',
    name: 'Solar Phoenix',
    color: '#701a75',
    accentColor: '#d946ef',
    wingColor: '#86198f',
    position: [-588, 230, -809],
    headingDeg: 144, // Facing SSE
    speedMs: 46
  }
];

interface UseAIBanditsProps {
  enabled?: boolean;
  playShootSfx?: () => void;
}

export function useAIBandits({
  enabled = true,
  playShootSfx
}: UseAIBanditsProps = {}) {
  const banditsRef = useRef<BanditAIEngine[]>([]);
  const [banditPlayers, setBanditPlayers] = useState<RemotePlayer[]>([]);
  const banditPlayersRef = useRef<RemotePlayer[]>([]);

  // Initialize bandit instances on mount or when enabled changes
  useEffect(() => {
    if (!enabled) {
      banditsRef.current = [];
      setBanditPlayers([]);
      banditPlayersRef.current = [];
      return;
    }

    const squadron = INITIAL_BANDIT_SQUADRON.map(
      (opt, idx) => new BanditAIEngine(idx % 2 === 0 ? 'alpha' : 'ace', opt)
    );

    banditsRef.current = squadron;
    const initialPlayers = squadron.map((b) => b.toRemotePlayer());
    setBanditPlayers(initialPlayers);
    banditPlayersRef.current = initialPlayers;
  }, [enabled]);

  /**
   * Main RAF update called inside FlightPhysicsLoop
   */
  const updateBandits = useCallback((
    delta: number,
    playerPos: THREE.Vector3,
    playerVel: THREE.Vector3,
    playerQuat: THREE.Quaternion,
    isPlayerCrashed: boolean,
    bulletsHandle?: BulletsHandle | null
  ): RemotePlayer[] => {
    if (!enabled || banditsRef.current.length === 0) {
      return [];
    }

    const updatedPlayers: RemotePlayer[] = [];

    for (let i = 0; i < banditsRef.current.length; i++) {
      const bandit = banditsRef.current[i];
      const { firedBullets, muzzleFlashPos, muzzleFlashQuat } = bandit.update(
        delta,
        playerPos,
        playerVel,
        playerQuat,
        isPlayerCrashed
      );

      // Spawn fired bullets into the 3D laser system
      if (firedBullets.length > 0 && bulletsHandle) {
        for (let b = 0; b < firedBullets.length; b++) {
          bulletsHandle.spawnBullet(firedBullets[b]);
        }
        if (muzzleFlashPos && muzzleFlashQuat) {
          bulletsHandle.triggerMuzzleFlash(muzzleFlashPos, muzzleFlashQuat);
        }
        if (playShootSfx) {
          playShootSfx();
        }
      }

      updatedPlayers.push(bandit.toRemotePlayer());
    }

    banditPlayersRef.current = updatedPlayers;
    setBanditPlayers(updatedPlayers);
    return updatedPlayers;
  }, [enabled, playShootSfx]);

  /**
   * Apply bullet hit damage to a specific bandit
   */
  const damageBandit = useCallback((banditId: string, damage: number, reason: string = 'Shot down in dogfight!'): number => {
    const bandit = banditsRef.current.find((b) => b.profile.id === banditId);
    if (!bandit) return 0;

    const remaining = bandit.applyDamage(damage, reason);
    const updated = banditsRef.current.map((b) => b.toRemotePlayer());
    banditPlayersRef.current = updated;
    setBanditPlayers(updated);
    return remaining;
  }, []);

  /**
   * Reset all bandits (e.g. when player restarts flight)
   */
  const resetBandits = useCallback((playerPos?: THREE.Vector3) => {
    for (let i = 0; i < banditsRef.current.length; i++) {
      banditsRef.current[i].respawn(playerPos);
    }
    const updated = banditsRef.current.map((b) => b.toRemotePlayer());
    banditPlayersRef.current = updated;
    setBanditPlayers(updated);
  }, []);

  return {
    banditPlayers,
    banditPlayersRef,
    updateBandits,
    damageBandit,
    resetBandits
  };
}
