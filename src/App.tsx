import React, { useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useFlightControls } from './hooks/useFlightControls';
import { useFlightPhysics } from './hooks/useFlightPhysics';
import { useCollision } from './hooks/useCollision';
import { useAudioEngine } from './hooks/useAudioEngine';
import { WorldScene } from './components/3d/WorldScene';
import { HUD } from './components/ui/HUD';
import { ControlsGuide } from './components/ui/ControlsGuide';
import { StartModal } from './components/ui/StartModal';
import { LandingModal } from './components/ui/LandingModal';
import { CrashModal } from './components/ui/CrashModal';
import { FlightTelemetry, ControlInputs } from './types/flight';
import * as THREE from 'three';

// Sub-component inside Canvas to run physics loop at RAF rate
const FlightPhysicsLoop: React.FC<{
  updatePhysics: (delta: number, inputs: ControlInputs, groundElevation: number, isOnRunway: boolean) => FlightTelemetry;
  getInputs: () => ControlInputs;
  getGroundInfo: (pos: THREE.Vector3) => { groundElevation: number; isOnRunway: boolean };
  checkCollision: (pos: THREE.Vector3, vel: THREE.Vector3, rollDeg: number, pitchDeg: number) => { crashed: boolean; reason: string | null };
  triggerCrash: (reason: string) => void;
  playTouchdownSfx: () => void;
  playCrashSfx: () => void;
  updateAudio: (throttle: number, speedKnots: number, isStalling: boolean, isCrashed: boolean, isGrounded: boolean) => void;
  posRef: React.MutableRefObject<THREE.Vector3>;
  isGameActive: boolean;
}> = ({
  updatePhysics,
  getInputs,
  getGroundInfo,
  checkCollision,
  triggerCrash,
  playTouchdownSfx,
  playCrashSfx,
  updateAudio,
  posRef,
  isGameActive
}) => {
  const prevGroundedRef = React.useRef(true);

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

    // 3. Collision Checks
    const colResult = checkCollision(pos, vel, currentTelemetry.rollDeg, currentTelemetry.pitchDeg);
    if (colResult.crashed) {
      playCrashSfx();
      triggerCrash(colResult.reason || 'Impact with obstacle');
    }

    // 4. Update procedural audio engine
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

  const {
    initAudio,
    updateAudio,
    playTouchdownSfx,
    playCrashSfx,
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
    triggerCrash
  } = useFlightPhysics();

  const {
    getGroundInfo,
    checkCollision
  } = useCollision();

  const handleReset = useCallback(() => {
    resetFlight([0, 7.2, 0], 0, 0, 0, false);
  }, [resetFlight]);

  const {
    setThrottle,
    setFlapStage,
    isBraking,
    setIsBraking,
    cameraMode,
    cycleCamera,
    getInputs
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
    setThrottle(0);
    setIsStartModalOpen(false);
  }, [handleUserInteract, resetFlight, setThrottle]);

  // Handle Scenario Choice: Spawn In Flight (Airborne with 20% throttle)
  const handleSpawnInFlight = useCallback(() => {
    handleUserInteract();
    // Spawn over ocean at 150m (approx 500 ft) heading North, initial speed 28 m/s (~55 knots), 20% throttle
    resetFlight([0, 150, 200], 0, 28, 20, true);
    setThrottle(20);
    setIsStartModalOpen(false);
  }, [handleUserInteract, resetFlight, setThrottle]);

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
        />

        <FlightPhysicsLoop
          updatePhysics={updatePhysics}
          getInputs={getInputs}
          getGroundInfo={getGroundInfo}
          checkCollision={checkCollision}
          triggerCrash={triggerCrash}
          playTouchdownSfx={playTouchdownSfx}
          playCrashSfx={playCrashSfx}
          updateAudio={updateAudio}
          posRef={posRef}
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
        cameraMode={cameraMode}
        cycleCamera={cycleCamera}
        isMuted={isMuted}
        toggleMute={toggleMute}
        onReset={handleReset}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Modals & Dialogs */}
      <StartModal
        isOpen={isStartModalOpen}
        onSpawnRunway={handleSpawnRunway}
        onSpawnInFlight={handleSpawnInFlight}
      />
      <ControlsGuide isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <LandingModal
        telemetry={telemetry}
        onTakeoffAgain={() => setThrottle(100)}
        onReset={handleReset}
      />
      <CrashModal telemetry={telemetry} onRespawn={handleReset} />
    </div>
  );
}

export default App;
