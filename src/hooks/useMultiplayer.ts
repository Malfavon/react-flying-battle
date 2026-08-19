import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import * as THREE from 'three';
import { RemotePlayer, LocalPlayerIdentity, FlightTelemetry, ControlInputs } from '../types/flight';

export function useMultiplayer() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [identity, setIdentity] = useState<LocalPlayerIdentity | null>(null);
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayer[]>([]);
  
  // Ref mirror for zero-lag access inside 60FPS physics loop
  const remotePlayersRef = useRef<RemotePlayer[]>([]);
  const lastSendTimeRef = useRef<number>(0);

  useEffect(() => {
    // Connect directly to Socket.io backend on port 3001 (works seamlessly across localhost & LAN IP)
    const serverUrl = typeof window !== 'undefined' && window.location.hostname
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : 'http://localhost:3001';

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
              forwardSpeed: data.forwardSpeed !== undefined ? data.forwardSpeed : p.forwardSpeed
            };
          }
          return p;
        });
        remotePlayersRef.current = updated;
        return updated;
      });
    });

    socket.on('playerCrashed', (data: { id: string; callsign: string; reason: string }) => {
      setRemotePlayers((prev) => {
        const updated = prev.map((p) => (p.id === data.id ? { ...p, isCrashed: true, crashReason: data.reason } : p));
        remotePlayersRef.current = updated;
        return updated;
      });
    });

    socket.on('playerRespawned', (data: { id: string; callsign: string; position: [number, number, number] }) => {
      setRemotePlayers((prev) => {
        const updated = prev.map((p) => (p.id === data.id ? { ...p, isCrashed: false, crashReason: null, position: data.position } : p));
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
  }, []);

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
      crashReason: telemetry.crashReason
    });
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
    broadcastCrash,
    broadcastRespawn
  };
}
