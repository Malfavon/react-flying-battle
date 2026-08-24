import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import * as THREE from 'three';
import { RemotePlayer, LocalPlayerIdentity, FlightTelemetry, ControlInputs, Bullet, DamageEvent } from '../types/flight';

interface UseMultiplayerProps {
  enabled?: boolean;
  onLocalDamage?: (event: DamageEvent) => void;
  onRemoteBullet?: (bullet: Bullet) => void;
}

export function useMultiplayer({ enabled = false, onLocalDamage, onRemoteBullet }: UseMultiplayerProps = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [identity, setIdentity] = useState<LocalPlayerIdentity | null>(null);
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayer[]>([]);
  
  // Ref mirror for zero-lag access inside 60FPS physics loop
  const remotePlayersRef = useRef<RemotePlayer[]>([]);
  const lastSendTimeRef = useRef<number>(0);
  const onLocalDamageRef = useRef(onLocalDamage);
  const onRemoteBulletRef = useRef(onRemoteBullet);

  useEffect(() => {
    onLocalDamageRef.current = onLocalDamage;
    onRemoteBulletRef.current = onRemoteBullet;
  }, [onLocalDamage, onRemoteBullet]);

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      setIdentity(null);
      setRemotePlayers([]);
      remotePlayersRef.current = [];
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Determine backend Socket.io server URL
    // Priority:
    // 1. VITE_SERVER_URL environment variable (configured in Vercel / .env)
    // 2. Window hostname:3001 (for local dev & LAN testing)
    // 3. http://localhost:3001 (default fallback)
    const envUrl = import.meta.env.VITE_SERVER_URL;
    const serverUrl = envUrl && envUrl.trim() !== ''
      ? envUrl.trim()
      : (typeof window !== 'undefined' && window.location.hostname
          ? `${window.location.protocol}//${window.location.hostname}:3001`
          : 'http://localhost:3001');

    console.log('[Multiplayer] Connecting to server at:', serverUrl);

    const socket: Socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('[Multiplayer] Connected to server, ID:', socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('[Multiplayer] Disconnected from server');
    });

    socket.on('init', (data: { self: LocalPlayerIdentity; players: RemotePlayer[] }) => {
      setIdentity(data.self);
      setRemotePlayers(data.players);
      remotePlayersRef.current = data.players;
    });

    socket.on('playerJoined', (player: RemotePlayer) => {
      setRemotePlayers((prev) => {
        const updated = [...prev.filter((p) => p.id !== player.id), player];
        remotePlayersRef.current = updated;
        return updated;
      });
    });

    socket.on('playerMoved', (data: Partial<RemotePlayer> & { id: string }) => {
      setRemotePlayers((prev) => {
        const updated = prev.map((p) => {
          if (p.id === data.id) {
            return {
              ...p,
              ...data,
              position: data.position || p.position,
              quaternion: data.quaternion || p.quaternion,
              forwardSpeed: data.forwardSpeed !== undefined ? data.forwardSpeed : p.forwardSpeed,
              health: data.health !== undefined ? data.health : p.health,
              maxHealth: data.maxHealth !== undefined ? data.maxHealth : p.maxHealth
            };
          }
          return p;
        });
        remotePlayersRef.current = updated;
        return updated;
      });
    });

    // Handle remote gunfire
    socket.on('bulletFired', (bullet: Bullet) => {
      if (onRemoteBulletRef.current) {
        onRemoteBulletRef.current(bullet);
      }
    });

    // Handle combat damage
    socket.on('playerDamaged', (data: DamageEvent) => {
      if (socket.id && data.targetId === socket.id) {
        if (onLocalDamageRef.current) {
          onLocalDamageRef.current(data);
        }
      } else {
        // Update remote player health in state
        setRemotePlayers((prev) => {
          const updated = prev.map((p) =>
            p.id === data.targetId ? { ...p, health: data.remainingHealth } : p
          );
          remotePlayersRef.current = updated;
          return updated;
        });
      }
    });

    socket.on('playerCrashed', (data: { id: string; callsign: string; reason: string }) => {
      setRemotePlayers((prev) => {
        const updated = prev.map((p) => (p.id === data.id ? { ...p, isCrashed: true, crashReason: data.reason } : p));
        remotePlayersRef.current = updated;
        return updated;
      });
    });

    socket.on('playerRespawned', (data: { id: string; callsign: string; position: [number, number, number]; health?: number }) => {
      setRemotePlayers((prev) => {
        const updated = prev.map((p) =>
          p.id === data.id
            ? { ...p, isCrashed: false, crashReason: null, position: data.position, health: data.health ?? 100 }
            : p
        );
        remotePlayersRef.current = updated;
        return updated;
      });
    });

    socket.on('playerLeft', (data: { id: string }) => {
      setRemotePlayers((prev) => {
        const updated = prev.filter((p) => p.id !== data.id);
        remotePlayersRef.current = updated;
        return updated;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [enabled]);

  // Send local telemetry (throttled to ~30Hz)
  const broadcastTelemetry = useCallback((
    telemetry: FlightTelemetry,
    quat: THREE.Quaternion,
    inputs: ControlInputs
  ) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    const now = performance.now();
    // Throttle to 30Hz (~33ms)
    if (now - lastSendTimeRef.current < 33) return;
    lastSendTimeRef.current = now;

    socket.emit('playerUpdate', {
      position: telemetry.position,
      quaternion: [quat.x, quat.y, quat.z, quat.w],
      throttle: telemetry.throttle,
      flapStage: telemetry.flapStage,
      rollInput: inputs.roll,
      pitchInput: inputs.pitch,
      yawInput: inputs.yaw,
      forwardSpeed: telemetry.airspeedMs,
      isGrounded: telemetry.isGrounded,
      isCrashed: telemetry.isCrashed,
      crashReason: telemetry.crashReason,
      health: telemetry.health,
      maxHealth: telemetry.maxHealth
    });
  }, []);

  // Broadcast gunfire
  const broadcastShoot = useCallback((bullet: Bullet) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;
    socket.emit('playerShoot', bullet);
  }, []);

  // Report bullet hit on a remote player
  const reportBulletHit = useCallback((targetId: string, bulletId: string, damage: number = 8) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;
    socket.emit('bulletHit', { targetId, bulletId, damage });
  }, []);

  // Immediate crash notification
  const broadcastCrash = useCallback((reason: string) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;
    socket.emit('playerCrash', { reason });
  }, []);

  // Immediate respawn notification
  const broadcastRespawn = useCallback((position: [number, number, number]) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;
    socket.emit('playerRespawn', { position });
  }, []);

  return {
    isConnected,
    identity,
    remotePlayers,
    remotePlayersRef,
    onlineCount: (identity ? 1 : 0) + remotePlayers.length,
    broadcastTelemetry,
    broadcastShoot,
    reportBulletHit,
    broadcastCrash,
    broadcastRespawn
  };
}
