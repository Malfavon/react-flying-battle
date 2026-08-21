import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Camera,
  HelpCircle,
  RotateCcw,
  AlertTriangle,
  Disc,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Gamepad2,
  Maximize2,
  Minimize2,
  Shield,
  Crosshair
} from 'lucide-react';
import { CameraMode, FlightTelemetry, FlapStage, LocalPlayerIdentity, RemotePlayer, TacticalRadarData } from '../../types/flight';
import { ThrottleSlider } from './ThrottleSlider';
import { FlapSelector } from './FlapSelector';
import { VirtualJoystick } from './VirtualJoystick';
import { TacticalRadar } from './TacticalRadar';
import { CombatHUDOverlay } from './CombatHUDOverlay';

interface HUDProps {
  telemetry: FlightTelemetry;
  setThrottle: (val: number | ((prev: number) => number)) => void;
  setFlapStage: (stage: FlapStage) => void;
  isBraking: boolean;
  setIsBraking: (braking: boolean) => void;
  setVirtualAxes: (axes: { pitch?: number; roll?: number; yaw?: number }) => void;
  setIsFiringVirtual?: (firing: boolean) => void;
  isFiring?: boolean;
  damageFlash?: boolean;
  cameraMode: CameraMode;
  cycleCamera: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  onReset: () => void;
  onOpenHelp: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  targetingData?: TacticalRadarData;
  hitMarkerTime?: number;
  multiplayer?: {
    isConnected: boolean;
    onlineCount: number;
    identity: LocalPlayerIdentity | null;
    remotePlayers: RemotePlayer[];
  };
}

export const HUD: React.FC<HUDProps> = ({
  telemetry,
  setThrottle,
  setFlapStage,
  isBraking,
  setIsBraking,
  setVirtualAxes,
  setIsFiringVirtual,
  isFiring = false,
  damageFlash = false,
  cameraMode,
  cycleCamera,
  isMuted,
  toggleMute,
  onReset,
  onOpenHelp,
  isFullscreen = false,
  onToggleFullscreen,
  targetingData,
  hitMarkerTime = 0,
  multiplayer
}) => {
  const [showJoystick, setShowJoystick] = useState<boolean>(true);
  const [showRadar, setShowRadar] = useState<boolean>(true);
  const [isTouchFiring, setIsTouchFiring] = useState<boolean>(false);

  const health = telemetry.health !== undefined ? telemetry.health : 100;
  const healthPct = Math.max(0, Math.min(100, health));

  // Horizon Pitch & Roll transforms
  const pitchOffsetPx = (telemetry.pitchDeg || 0) * 3.0;
  const rollAngleDeg = -(telemetry.rollDeg || 0);

  // Compass Heading formatted
  const headingFormatted = String(Math.round(telemetry.yawDeg)).padStart(3, '0');

  // Determine Cardinal direction
  const yaw = telemetry.yawDeg || 0;
  let cardinal = 'N';
  if (yaw >= 22.5 && yaw < 67.5) cardinal = 'NE';
  else if (yaw >= 67.5 && yaw < 112.5) cardinal = 'E';
  else if (yaw >= 112.5 && yaw < 157.5) cardinal = 'SE';
  else if (yaw >= 157.5 && yaw < 202.5) cardinal = 'S';
  else if (yaw >= 202.5 && yaw < 247.5) cardinal = 'SW';
  else if (yaw >= 247.5 && yaw < 292.5) cardinal = 'W';
  else if (yaw >= 292.5 && yaw < 337.5) cardinal = 'NW';

  const pilotsCount = multiplayer ? multiplayer.onlineCount : 1;

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-20 overflow-hidden font-mono">
      {/* Combat HUD Overlay: Lead Gunsight, Target Brackets, Screen-Edge Threats & Hitmarker */}
      <CombatHUDOverlay
        targets={targetingData?.targets || []}
        primaryTarget={targetingData?.primaryTarget || null}
        hitMarkerTime={hitMarkerTime}
      />

      {/* Damage Screen Flash Vignette */}
      {damageFlash && (
        <div className="absolute inset-0 border-4 sm:border-8 border-red-600/80 bg-red-600/15 pointer-events-none z-40 animate-pulse shadow-[inset_0_0_50px_rgba(239,68,68,0.5)]" />
      )}

      {/* Stall Warning Flashing Banner */}
      {telemetry.isStalling && !telemetry.isGrounded && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-red-600/90 border border-white px-3 py-1 rounded-xl text-white font-bold text-[10px] sm:text-xs tracking-wider flex items-center gap-1.5 shadow-[0_0_20px_rgba(239,68,68,0.9)] animate-bounce z-30 pointer-events-none">
          <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
          <span>STALL WARNING! PUSH NOSE DOWN / POWER UP</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP BAR: STATUS, HEALTH, HEADING & TOOLBAR                             */}
      {/* ========================================================================= */}
      <div className="absolute top-0 left-0 right-0 pt-[max(0.25rem,env(safe-area-inset-top))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] flex items-center justify-between w-full pointer-events-none z-30 gap-1 sm:gap-2">
        {/* Left: Status + Health Bar */}
        <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto">
          {/* Status Pill */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-950/75 backdrop-blur-md px-2 py-1 rounded-xl border border-sky-500/30 text-[10px] sm:text-[11px] shadow-lg">
            <span className={`font-bold ${telemetry.isGrounded ? 'text-amber-400' : 'text-emerald-400'}`}>
              {telemetry.isGrounded ? 'GROUND' : 'AIR'}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-sky-300 uppercase">{cameraMode}</span>

            {multiplayer && multiplayer.isConnected && (
              <>
                <span className="text-slate-600">|</span>
                <div className="flex items-center gap-0.5 text-emerald-400 font-bold">
                  <Users className="w-2.5 h-2.5 inline" />
                  <span>{pilotsCount}</span>
                </div>
              </>
            )}
          </div>

          {/* Health Bar Pill */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-950/75 backdrop-blur-md px-2 py-1 rounded-xl border border-sky-500/30 text-[10px] sm:text-[11px] shadow-lg">
            <Shield className={`w-3 h-3 ${healthPct > 50 ? 'text-emerald-400' : healthPct > 25 ? 'text-amber-400' : 'text-red-400 animate-pulse'}`} />
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[9px] font-bold">
                <span className="text-slate-400">HP</span>
                <span className={healthPct > 50 ? 'text-emerald-400' : healthPct > 25 ? 'text-amber-400' : 'text-red-400 font-bold animate-pulse'}>
                  {health}/100
                </span>
              </div>
              <div className="w-14 sm:w-20 bg-slate-800/90 rounded-full h-1.5 overflow-hidden border border-slate-700/60">
                <div
                  className={`h-full transition-all duration-150 ${
                    healthPct > 50
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                      : healthPct > 25
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                      : 'bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse'
                  }`}
                  style={{ width: `${healthPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center: Minimalist Compass Heading Pip */}
        <div className="hidden md:flex items-center gap-1 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-xl border border-sky-500/30 shadow-lg pointer-events-auto">
          <span className="text-[9px] text-slate-400 font-bold tracking-wider">HDG</span>
          <span className="text-xs sm:text-sm font-bold text-sky-400 tracking-wider">
            {headingFormatted}°
          </span>
          <span className="text-[10px] font-bold text-cyan-300">
            {cardinal}
          </span>
        </div>

        {/* Right: Quick Action Controls Toolbar */}
        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            onClick={() => setShowRadar((prev) => !prev)}
            className={`p-1.5 rounded-xl border backdrop-blur-md transition-colors shadow-lg active:scale-95 ${
              showRadar
                ? 'bg-sky-600/40 border-sky-400 text-sky-300'
                : 'bg-slate-950/70 hover:bg-slate-800 border-sky-500/30 text-slate-400'
            }`}
            title="Toggle Tactical Radar"
          >
            <Crosshair className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 bg-slate-950/70 hover:bg-slate-800 backdrop-blur-md text-sky-400 hover:text-white rounded-xl border border-sky-500/30 transition-colors shadow-lg active:scale-95"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            </button>
          )}
          <button
            onClick={() => setShowJoystick((prev) => !prev)}
            className={`p-1.5 rounded-xl border backdrop-blur-md transition-colors shadow-lg active:scale-95 ${
              showJoystick
                ? 'bg-sky-600/40 border-sky-400 text-sky-300'
                : 'bg-slate-950/70 hover:bg-slate-800 border-sky-500/30 text-slate-400'
            }`}
            title="Toggle Virtual Joystick"
          >
            <Gamepad2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            onClick={cycleCamera}
            className="p-1.5 bg-slate-950/70 hover:bg-slate-800 backdrop-blur-md text-sky-400 hover:text-white rounded-xl border border-sky-500/30 transition-colors shadow-lg active:scale-95"
            title="Switch Camera (C)"
          >
            <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            onClick={toggleMute}
            className="p-1.5 bg-slate-950/70 hover:bg-slate-800 backdrop-blur-md text-sky-400 hover:text-white rounded-xl border border-sky-500/30 transition-colors shadow-lg active:scale-95"
            title="Mute / Unmute Audio (M)"
          >
            {isMuted ? <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" /> : <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          </button>
          <button
            onClick={onReset}
            className="p-1.5 bg-slate-950/70 hover:bg-slate-800 backdrop-blur-md text-sky-400 hover:text-white rounded-xl border border-sky-500/30 transition-colors shadow-lg active:scale-95"
            title="Reset Flight (R)"
          >
            <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            onClick={onOpenHelp}
            className="p-1.5 bg-sky-600/90 hover:bg-sky-500 text-white rounded-xl border border-sky-400 shadow-lg shadow-sky-500/20 transition-colors active:scale-95"
            title="Flight Controls Guide (H)"
          >
            <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TACTICAL RADAR (TOP RIGHT, BELOW TOOLBAR)                              */}
      {/* ========================================================================= */}
      {showRadar && (
        <div className="absolute top-11 right-[max(0.5rem,env(safe-area-inset-right))] z-30 pointer-events-auto">
          <TacticalRadar
            targets={targetingData?.targets || []}
            primaryTarget={targetingData?.primaryTarget || null}
            playerYawDeg={telemetry.yawDeg}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CENTER PRIMARY FLIGHT INSTRUMENTS (PFD: SPEED | HORIZON | ALTITUDE)   */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {/* Speed Tape (Left of Center Pitch Ladder) */}
        <div className="absolute left-[calc(50%-130px)] sm:left-[calc(50%-150px)] top-1/2 -translate-y-1/2 flex flex-col items-end bg-slate-950/65 backdrop-blur-md px-2 py-1 rounded-xl border border-sky-500/25 shadow-lg">
          <span className="text-[8px] text-slate-400 font-semibold tracking-wider">SPEED</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-sm sm:text-base font-bold text-sky-400">{telemetry.airspeedKnots}</span>
            <span className="text-[8px] text-sky-400">KT</span>
          </div>
          <span className="text-[7px] text-slate-400">
            {Math.round(telemetry.airspeedMs * 3.6)} km/h
          </span>
        </div>

        {/* Minimalist Transparent Horizon Pitch Ladder */}
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center overflow-hidden pointer-events-none">
          <div
            className="absolute w-full h-full flex items-center justify-center transition-transform duration-75"
            style={{
              transform: `rotate(${rollAngleDeg}deg) translateY(${pitchOffsetPx}px)`
            }}
          >
            {/* Horizon Center Line */}
            <div className="w-28 sm:w-32 h-[1.5px] bg-sky-400/80 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />

            {/* Pitch Ladders (+10°, -10°) */}
            <div className="absolute top-[calc(50%-24px)] w-14 h-[1px] bg-sky-400/60 flex justify-between text-[7px] text-sky-300">
              <span>+10</span>
              <span>+10</span>
            </div>
            <div className="absolute top-[calc(50%+24px)] w-14 h-[1px] border-b border-dashed border-sky-400/60 flex justify-between text-[7px] text-sky-300">
              <span>-10</span>
              <span>-10</span>
            </div>
          </div>

          {/* Fixed Boresight Crosshair */}
          <div className="relative z-10 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full border border-yellow-400 bg-yellow-400/40" />
            <div className="absolute -left-4 w-3.5 h-[1.5px] bg-yellow-400" />
            <div className="absolute -right-4 w-3.5 h-[1.5px] bg-yellow-400" />
          </div>

          {/* Gun Target Sight Crosshair Pip */}
          <div className="absolute w-10 h-10 rounded-full border border-sky-400/30 flex items-center justify-center pointer-events-none">
            <div className="w-1 h-1 rounded-full bg-red-400/80" />
          </div>
        </div>

        {/* Altitude Tape (Right of Center Pitch Ladder) */}
        <div className="absolute right-[calc(50%-130px)] sm:right-[calc(50%-150px)] top-1/2 -translate-y-1/2 flex flex-col items-start bg-slate-950/65 backdrop-blur-md px-2 py-1 rounded-xl border border-sky-500/25 shadow-lg">
          <span className="text-[8px] text-slate-400 font-semibold tracking-wider">ALT</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-sm sm:text-base font-bold text-sky-400">{telemetry.altitudeFeet}</span>
            <span className="text-[8px] text-sky-400">FT</span>
          </div>
          <div className="flex items-center gap-0.5 text-[7px] text-slate-400">
            <span>{telemetry.altitudeMeters}m</span>
            {telemetry.verticalSpeedMs >= 0.5 ? (
              <span className="flex items-center text-emerald-400 font-semibold">
                <ArrowUpRight className="w-2 h-2" />
                +{Math.round(telemetry.verticalSpeedMs * 196.85)}
              </span>
            ) : telemetry.verticalSpeedMs <= -0.5 ? (
              <span className="flex items-center text-red-400 font-semibold">
                <ArrowDownRight className="w-2 h-2" />
                {Math.round(telemetry.verticalSpeedMs * 196.85)}
              </span>
            ) : (
              <span>0 fpm</span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM LEFT ZONE (LEFT THUMB): JOYSTICK & RUDDER PEDALS               */}
      {/* ========================================================================= */}
      <div className="absolute bottom-0 left-0 pl-[max(0.5rem,env(safe-area-inset-left))] pb-[max(0.25rem,env(safe-area-inset-bottom))] pointer-events-auto z-30">
        {showJoystick && (
          <VirtualJoystick onAxesChange={setVirtualAxes} compact={true} />
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. BOTTOM RIGHT ZONE (RIGHT THUMB): THROTTLE, FIRE, BRAKES, FLAPS         */}
      {/* ========================================================================= */}
      <div className="absolute bottom-0 right-0 pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.25rem,env(safe-area-inset-bottom))] pointer-events-auto z-30 flex items-end gap-1.5 sm:gap-2">
        {/* Action Buttons Column */}
        <div className="flex flex-col items-end gap-1">
          {/* Tactical Machine Gun FIRE Button */}
          <button
            onMouseDown={() => {
              setIsTouchFiring(true);
              setIsFiringVirtual?.(true);
            }}
            onMouseUp={() => {
              setIsTouchFiring(false);
              setIsFiringVirtual?.(false);
            }}
            onTouchStart={() => {
              setIsTouchFiring(true);
              setIsFiringVirtual?.(true);
            }}
            onTouchEnd={() => {
              setIsTouchFiring(false);
              setIsFiringVirtual?.(false);
            }}
            className={`px-3 py-1.5 rounded-xl border font-mono text-[10px] font-bold transition-all shadow-lg flex items-center gap-1.5 select-none touch-none active:scale-95 ${
              isFiring || isTouchFiring
                ? 'bg-amber-600/95 border-amber-300 text-white shadow-[0_0_18px_rgba(245,158,11,0.9)] scale-95'
                : 'bg-slate-950/75 hover:bg-slate-800 border-amber-500/40 text-amber-300'
            }`}
            style={{ touchAction: 'none' }}
            title="Fire Machine Guns (Hold / Tap)"
          >
            <Crosshair className={`w-3 h-3 ${isFiring || isTouchFiring ? 'text-amber-200 animate-spin' : 'text-amber-400'}`} />
            <span>{isFiring || isTouchFiring ? 'FIRING' : 'FIRE'}</span>
          </button>

          {/* Wheel Brakes Trigger Button */}
          <button
            onMouseDown={() => setIsBraking(true)}
            onMouseUp={() => setIsBraking(false)}
            onTouchStart={() => setIsBraking(true)}
            onTouchEnd={() => setIsBraking(false)}
            className={`px-2.5 py-1 rounded-xl border font-mono text-[9px] font-bold transition-all shadow-lg flex items-center gap-1 select-none touch-none active:scale-95 ${
              isBraking
                ? 'bg-red-600/70 border-red-400 text-white shadow-[0_0_16px_rgba(239,68,68,0.7)] scale-95'
                : 'bg-slate-950/70 hover:bg-slate-800 border-sky-500/30 text-slate-300'
            }`}
            style={{ touchAction: 'none' }}
            title="Ground Wheel Brakes (Hold to Stop)"
          >
            <Disc className={`w-2.5 h-2.5 ${isBraking ? 'text-red-300 animate-spin' : 'text-slate-400'}`} />
            <span>{isBraking ? 'BRAKING' : 'BRAKE'}</span>
          </button>

          {/* Compact Flap Pill Selector */}
          <FlapSelector flapStage={telemetry.flapStage} setFlapStage={setFlapStage} compact={true} />
        </div>

        {/* Vertical Throttle Slider */}
        <div className="flex items-end">
          <ThrottleSlider throttle={telemetry.throttle} setThrottle={setThrottle} compact={true} />
        </div>
      </div>
    </div>
  );
};
