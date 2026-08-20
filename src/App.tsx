import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useFlightControls } from './hooks/useFlightControls';
import { useFlightPhysics } from './hooks/useFlightPhysics';
import { useCollision } from './hooks/useCollision';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useMultiplayer } from './hooks/useMultiplayer';
import { WorldScene } from './components/3d/WorldScene';
import { BulletsHandle } from './components/3d/Bullets';
import { HUD } from './components/ui/HUD';
import { ControlsGuide } from './components/ui/ControlsGuide';
import { StartModal } from './components/ui/StartModal';
import { LandingModal } from './components/ui/LandingModal';
import { CrashModal } from './components/ui/CrashModal';
import { OrientationPrompt } from './components/ui/OrientationPrompt';
import { useFullscreen } from './hooks/useFullscreen';
import { FlightTelemetry, ControlInputs, RemotePlayer, Bullet, DamageEvent } from './types/flight';
import * as THREE from 'three';

// Sub-component inside Canvas to run physics & combat loop at RAF rate
const FlightPhysicsLoop: React.FC<{
  updatePhysics: (delta: number, inputs: ControlInputs, groundElevation: number, isOnRunway: boolean) => FlightTelemetry;
  getInputs: () => ControlInputs;
  getGroundInfo: (pos: THREE.Vector3) => { groundElevation: number; isOnRunway: boolean };
  checkCollision: (pos: THREE.Vector3, vel: THREE.Vector3, rollDeg: number, pitchDeg: number) => { crashed: boolean; reason: string | null };
  checkPlaneCollisions: (pos: THREE.Vector3, remotePlayers: RemotePlayer[]) => { crashed: boolean; reason: string | null };
  triggerCrash: (reason: string) => void;
  playTouchdownSfx: () => void;
  playCrashSfx: () => void;
  playShootSfx: () => void;
  updateAudio: (throttle: number, speedKnots: number, isStalling: boolean, isCrashed: boolean, isGrounded: boolean) => void;
  broadcastTelemetry: (telemetry: FlightTelemetry, quat: THREE.Quaternion, inputs: ControlInputs) => void;
  broadcastCrash: (reason: string) => void;
  broadcastShoot: (bullet: Bullet) => void;
  posRef: React.MutableRefObject<THREE.Vector3>;
  quatRef: React.MutableRefObject<THREE.Quaternion>;
  remotePlayersRef: React.MutableRefObject<RemotePlayer[]>;
  bulletsRef: React.RefObject<BulletsHandle>;
  localId?: string;
  isGameActive: boolean;
}> = ({
  updatePhysics,
  getInputs,
  getGroundInfo,
  checkCollision,
  checkPlaneCollisions,
  triggerCrash,
  playTouchdownSfx,
  playCrashSfx,
  playShootSfx,
  updateAudio,
  broadcastTelemetry,
  broadcastCrash,
  broadcastShoot,
  posRef,
  quatRef,
  remotePlayersRef,
  bulletsRef,
  localId,
  isGameActive
}) => {
  const prevGroundedRef = React.useRef(true);
  const lastShootTimeRef = React.useRef<number>(0);

  useFrame((_, delta) => {
    if (!isGameActive) return;

    const inputs = getInputs();

    // Query current ground elevation under plane
    const { groundElevation, isOnRunway } = getGroundInfo(posRef.current);

    // 1. Compute physics step with current ground height
    const currentTelemetry = updatePhysics(delta, inputs, groundElevation, isOnRunway);

    if (currentTelemetry.isCrashed) {
      updateAudio(0, 0, false, true, false);
      return;
    }

    const pos = new THREE.Vector3(
      currentTelemetry.position[0],
      currentTelemetry.position[1],
      currentTelemetry.position[2]
    );

    const vel = new THREE.Vector3(
      currentTelemetry.velocity[0],
      currentTelemetry.velocity[1],
      currentTelemetry.velocity[2]
    );

    // 2. Touchdown detection for SFX
    if (!prevGroundedRef.current && currentTelemetry.isGrounded) {
      playTouchdownSfx();
    }
    prevGroundedRef.current = currentTelemetry.isGrounded;

    // 3. Terrain / Obstacle Collision Checks
    const colResult = checkCollision(pos, vel, currentTelemetry.rollDeg, currentTelemetry.pitchDeg);
    if (colResult.crashed) {
      playCrashSfx();
      triggerCrash(colResult.reason || 'Impact with obstacle');
      broadcastCrash(colResult.reason || 'Impact with obstacle');
      return;
    }

    // 4. Multiplayer Plane-to-Plane Collision Checks
    const planeCol = checkPlaneCollisions(pos, remotePlayersRef.current);
    if (planeCol.crashed) {
      playCrashSfx();
      triggerCrash(planeCol.reason || 'Mid-air collision with aircraft');
      broadcastCrash(planeCol.reason || 'Mid-air collision');
      return;
    }

    // 5. Dogfight Gunfire Handling (4 shots per second = 250ms cadence)
    if (inputs.fire) {
      const now = performance.now();
      if (now - lastShootTimeRef.current >= 250) {
        lastShootTimeRef.current = now;

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quatRef.current);
        const noseOffset = new THREE.Vector3(0, -0.05, -2.5).applyQuaternion(quatRef.current);
        const nosePos = pos.clone().add(noseOffset);

        const bulletVel = forward.clone().multiplyScalar(currentTelemetry.airspeedMs + 320);
        const bulletId = `${localId || 'local'}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        const newBullet: Bullet = {
          id: bulletId,
          shooterId: localId || 'local',
          position: [nosePos.x, nosePos.y, nosePos.z],
          velocity: [bulletVel.x, bulletVel.y, bulletVel.z],
          createdAt: now,
          lifetime: 2.5,
          damage: 8
        };

        if (bulletsRef.current) {
          bulletsRef.current.spawnBullet(newBullet);
          bulletsRef.current.triggerMuzzleFlash([nosePos.x, nosePos.y, nosePos.z], quatRef.current);
        }

        playShootSfx();
        broadcastShoot(newBullet);
      }
    }

    // 6. Broadcast telemetry to peers over Socket.io
    broadcastTelemetry(currentTelemetry, quatRef.current, inputs);

    // 7. Update procedural audio engine
    updateAudio(
      currentTelemetry.throttle,
      currentTelemetry.airspeedKnots,
      currentTelemetry.isStalling,
      currentTelemetry.isCrashed,
      currentTelemetry.isGrounded
    );
  });

  return null;
};

export function App() {
  const [isStartModalOpen, setIsStartModalOpen] = useState<boolean>(true);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [damageFlash, setDamageFlash] = useState<boolean>(false);
  const bulletsRef = useRef<BulletsHandle>(null);

  const {
    initAudio,
    updateAudio,
    playTouchdownSfx,
    playCrashSfx,
    playShootSfx,
    playHitMarkerSfx,
    playDamageSfx,
    isMuted,
    toggleMute,
    isAudioReady
  } = useAudioEngine();

  const {
    telemetry,
    posRef,
    quatRef,
    updatePhysics,
    resetFlight,
    triggerCrash,
    applyDamage
  } = useFlightPhysics();

  const {
    getGroundInfo,
    checkCollision,
    checkPlaneCollisions
  } = useCollision();

  const handleLocalDamage = useCallback((data: DamageEvent) => {
    playDamageSfx();
    setDamageFlash(true);
    setTimeout(() => setDamageFlash(false), 300);

    const remaining = applyDamage(data.damage, `Shot down by ${data.shooterCallsign || 'enemy aircraft'}`);
    if (remaining <= 0) {
      playCrashSfx();
    }
  }, [applyDamage, playCrashSfx, playDamageSfx]);

  const handleRemoteBullet = useCallback((bullet: Bullet) => {
    if (bulletsRef.current) {
      bulletsRef.current.spawnBullet(bullet);
    }
  }, []);

  const {
    isConnected,
    identity,
    remotePlayers,
    remotePlayersRef,
    onlineCount,
    broadcastTelemetry,
    broadcastShoot,
    reportBulletHit,
    broadcastCrash,
    broadcastRespawn
  } = useMultiplayer({
    onLocalDamage: handleLocalDamage,
    onRemoteBullet: handleRemoteBullet
  });

  const {
    isFullscreen,
    enterFullscreen,
    toggleFullscreen
  } = useFullscreen();

  const handleReset = useCallback(() => {
    resetFlight([0, 7.2, 0], 0, 0, 0, false);
    broadcastRespawn([0, 7.2, 0]);
  }, [resetFlight, broadcastRespawn]);

  const {
    setThrottle,
    setFlapStage,
    isBraking,
    setIsBraking,
    cameraMode,
    cycleCamera,
    getInputs,
    setVirtualAxes,
    setIsFiringVirtual
  } = useFlightControls({
    onReset: handleReset,
    onMuteToggle: toggleMute,
    onHelpToggle: () => setIsHelpOpen((prev) => !prev)
  });

  // Enable audio on first user interact
  const handleUserInteract = useCallback(() => {
    if (!isAudioReady) {
      initAudio();
    }
  }, [initAudio, isAudioReady]);

  // Handle Scenario Choice: Take Off (Runway)
  const handleSpawnRunway = useCallback(() => {
    handleUserInteract();
    resetFlight([0, 7.2, 0], 0, 0, 0, false);
    broadcastRespawn([0, 7.2, 0]);
    setThrottle(0);
    setIsStartModalOpen(false);
  }, [handleUserInteract, resetFlight, broadcastRespawn, setThrottle]);

  // Handle Scenario Choice: Spawn In Flight (Airborne with 20% throttle)
  const handleSpawnInFlight = useCallback(() => {
    handleUserInteract();
    // Spawn over ocean at 150m (approx 500 ft) heading North, initial speed 28 m/s (~55 knots), 20% throttle
    resetFlight([0, 150, 200], 0, 28, 20, true);
    broadcastRespawn([0, 150, 200]);
    setThrottle(20);
    setIsStartModalOpen(false);
  }, [handleUserInteract, resetFlight, broadcastRespawn, setThrottle]);

  const handleBulletHit = useCallback((targetId: string, bulletId: string, damage: number) => {
    playHitMarkerSfx();
    reportBulletHit(targetId, bulletId, damage);
  }, [playHitMarkerSfx, reportBulletHit]);

  useEffect(() => {
    window.addEventListener('click', handleUserInteract, { once: true });
    window.addEventListener('keydown', handleUserInteract, { once: true });
    return () => {
      window.removeEventListener('click', handleUserInteract);
      window.removeEventListener('keydown', handleUserInteract);
    };
  }, [handleUserInteract]);

  const inputs = getInputs();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* 3D WebGL Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 10, 15], fov: 60, near: 0.1, far: 6000 }}
        className="w-full h-full"
      >
        <WorldScene
          planePos={telemetry.position}
          planeQuat={quatRef.current}
          throttle={telemetry.throttle}
          flapStage={telemetry.flapStage}
          rollInput={inputs.roll}
          pitchInput={inputs.pitch}
          yawInput={inputs.yaw}
          isGrounded={telemetry.isGrounded}
          forwardSpeed={telemetry.airspeedMs}
          isCrashed={telemetry.isCrashed}
          cameraMode={cameraMode}
          remotePlayers={remotePlayers}
          bulletsRef={bulletsRef}
          localId={identity?.id}
          onBulletHit={handleBulletHit}
        />

        <FlightPhysicsLoop
          updatePhysics={updatePhysics}
          getInputs={getInputs}
          getGroundInfo={getGroundInfo}
          checkCollision={checkCollision}
          checkPlaneCollisions={checkPlaneCollisions}
          triggerCrash={triggerCrash}
          playTouchdownSfx={playTouchdownSfx}
          playCrashSfx={playCrashSfx}
          playShootSfx={playShootSfx}
          updateAudio={updateAudio}
          broadcastTelemetry={broadcastTelemetry}
          broadcastCrash={broadcastCrash}
          broadcastShoot={broadcastShoot}
          posRef={posRef}
          quatRef={quatRef}
          remotePlayersRef={remotePlayersRef}
          bulletsRef={bulletsRef}
          localId={identity?.id}
          isGameActive={!isStartModalOpen}
        />
      </Canvas>

      {/* Flight HUD Overlay */}
      <HUD
        telemetry={telemetry}
        setThrottle={setThrottle}
        setFlapStage={setFlapStage}
        isBraking={isBraking}
        setIsBraking={setIsBraking}
        setVirtualAxes={setVirtualAxes}
        setIsFiringVirtual={setIsFiringVirtual}
        isFiring={inputs.fire}
        damageFlash={damageFlash}
        cameraMode={cameraMode}
        cycleCamera={cycleCamera}
        isMuted={isMuted}
        toggleMute={toggleMute}
        onReset={handleReset}
        onOpenHelp={() => setIsHelpOpen(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        multiplayer={{
          isConnected,
          onlineCount,
          identity,
          remotePlayers
        }}
      />

      {/* Modals & Dialogs */}
      <StartModal
        isOpen={isStartModalOpen}
        onSpawnRunway={handleSpawnRunway}
        onSpawnInFlight={handleSpawnInFlight}
        onEnterFullscreen={enterFullscreen}
      />
      <ControlsGuide isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <LandingModal
        telemetry={telemetry}
        onTakeoffAgain={() => setThrottle(100)}
        onReset={handleReset}
      />
      <CrashModal telemetry={telemetry} onRespawn={handleReset} />
      <OrientationPrompt onEnterFullscreen={enterFullscreen} />
    </div>
  );
}

export default App;
