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
  Minimize2
} from 'lucide-react';
import { CameraMode, FlightTelemetry, FlapStage, LocalPlayerIdentity, RemotePlayer } from '../../types/flight';
import { ThrottleSlider } from './ThrottleSlider';
import { FlapSelector } from './FlapSelector';
import { VirtualJoystick } from './VirtualJoystick';

interface HUDProps {
  telemetry: FlightTelemetry;
  setThrottle: (val: number | ((prev: number) => number)) => void;
  setFlapStage: (stage: FlapStage) => void;
  isBraking: boolean;
  setIsBraking: (braking: boolean) => void;
  setVirtualAxes: (axes: { pitch?: number; roll?: number; yaw?: number }) => void;
  cameraMode: CameraMode;
  cycleCamera: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  onReset: () => void;
  onOpenHelp: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
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
  cameraMode,
  cycleCamera,
  isMuted,
  toggleMute,
  onReset,
  onOpenHelp,
  isFullscreen = false,
  onToggleFullscreen,
  multiplayer
}) => {
  const [showJoystick, setShowJoystick] = useState<boolean>(true);

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
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-2.5 sm:p-4 z-20 overflow-hidden font-mono">
      {/* ========================================================================= */}
      {/* TOP BAR: COMPACT STATUS, HEADING & TOOLBAR                                */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between w-full pointer-events-none gap-2">
        {/* Left Status: Compact Glass Flight Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 bg-slate-950/60 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-sky-500/30 text-[11px] shadow-lg pointer-events-auto">
          <span className={`font-bold ${telemetry.isGrounded ? 'text-amber-400' : 'text-emerald-400'}`}>
            {telemetry.isGrounded ? 'GROUND' : 'AIR'}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-sky-300 uppercase">{cameraMode}</span>

          {/* Multiplayer pill */}
          {multiplayer && multiplayer.isConnected && (
            <>
              <span className="text-slate-600">|</span>
              <div className="flex items-center gap-1 text-emerald-400 font-bold">
                <Users className="w-3 h-3 inline" />
                <span>{pilotsCount}</span>
              </div>
            </>
          )}
        </div>

        {/* Center: Minimalist Compass Heading Pip */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-sky-500/30 shadow-lg pointer-events-auto">
          <span className="text-[10px] text-slate-400 font-bold tracking-wider">HDG</span>
          <span className="text-sm font-bold text-sky-400 tracking-wider">
            {headingFormatted}°
          </span>
          <span className="text-[11px] font-bold text-cyan-300">
            {cardinal}
          </span>
        </div>

        {/* Right: Quick Action Controls Toolbar */}
        <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto">
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 bg-slate-950/60 hover:bg-slate-800 backdrop-blur-md text-sky-400 hover:text-white rounded-xl border border-sky-500/30 transition-colors shadow-lg"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={() => setShowJoystick((prev) => !prev)}
            className={`p-2 rounded-xl border backdrop-blur-md transition-colors shadow-lg ${
              showJoystick
                ? 'bg-sky-600/40 border-sky-400 text-sky-300'
                : 'bg-slate-950/60 hover:bg-slate-800 border-sky-500/30 text-slate-400'
            }`}
            title="Toggle Virtual Joystick"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={cycleCamera}
            className="p-2 bg-slate-950/60 hover:bg-slate-800 backdrop-blur-md text-sky-400 hover:text-white rounded-xl border border-sky-500/30 transition-colors shadow-lg"
            title="Switch Camera (C)"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleMute}
            className="p-2 bg-slate-950/60 hover:bg-slate-800 backdrop-blur-md text-sky-400 hover:text-white rounded-xl border border-sky-500/30 transition-colors shadow-lg"
            title="Mute / Unmute Audio (M)"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onReset}
            className="p-2 bg-slate-950/60 hover:bg-slate-800 backdrop-blur-md text-sky-400 hover:text-white rounded-xl border border-sky-500/30 transition-colors shadow-lg"
            title="Reset Flight (R)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenHelp}
            className="p-2 bg-sky-600/90 hover:bg-sky-500 text-white rounded-xl border border-sky-400 shadow-lg shadow-sky-500/20 transition-colors"
            title="Flight Controls Guide (H)"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CENTER: TRANSPARENT GLASS RETICLE & MARGIN TAPES                          */}
      {/* ========================================================================= */}
      <div className="relative flex-1 flex items-center justify-center pointer-events-none">
        {/* Stall Warning Flashing Banner */}
        {telemetry.isStalling && !telemetry.isGrounded && (
          <div className="absolute top-2 bg-red-600/90 border border-white px-4 py-1.5 rounded-xl text-white font-bold text-xs sm:text-sm tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.9)] animate-bounce z-30">
            <AlertTriangle className="w-4 h-4 animate-pulse" />
            <span>STALL WARNING! PUSH NOSE DOWN / POWER UP</span>
          </div>
        )}

        {/* Minimalist Transparent Horizon Pitch Lines (0% solid background!) */}
        <div className="relative w-48 h-48 flex items-center justify-center overflow-hidden pointer-events-none">
          {/* Rotating Pitch Ladder */}
          <div
            className="absolute w-full h-full flex items-center justify-center transition-transform duration-75"
            style={{
              transform: `rotate(${rollAngleDeg}deg) translateY(${pitchOffsetPx}px)`
            }}
          >
            {/* Horizon Center Line */}
            <div className="w-32 h-[1.5px] bg-sky-400/80 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />

            {/* Pitch Ladders (+10°, -10°) */}
            <div className="absolute top-[calc(50%-28px)] w-16 h-[1px] bg-sky-400/60 flex justify-between text-[8px] text-sky-300">
              <span>+10</span>
              <span>+10</span>
            </div>
            <div className="absolute top-[calc(50%+28px)] w-16 h-[1px] border-b border-dashed border-sky-400/60 flex justify-between text-[8px] text-sky-300">
              <span>-10</span>
              <span>-10</span>
            </div>
          </div>

          {/* Fixed Boresight Crosshair */}
          <div className="relative z-10 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full border border-yellow-400 bg-yellow-400/40" />
            <div className="absolute -left-5 w-4 h-[1.5px] bg-yellow-400" />
            <div className="absolute -right-5 w-4 h-[1.5px] bg-yellow-400" />
          </div>
        </div>

        {/* Left Margin: Slim Airspeed Tape */}
        <div className="absolute left-1 sm:left-2 flex flex-col items-end bg-slate-950/60 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-sky-500/25 shadow-lg">
          <span className="text-[8px] text-slate-400 font-semibold tracking-wider">SPEED</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-base sm:text-lg font-bold text-sky-400">{telemetry.airspeedKnots}</span>
            <span className="text-[9px] text-sky-400">KT</span>
          </div>
          <span className="text-[8px] text-slate-400">
            {Math.round(telemetry.airspeedMs * 3.6)} km/h
          </span>
        </div>

        {/* Right Margin: Slim Altitude Tape + Vertical Speed */}
        <div className="absolute right-1 sm:right-2 flex flex-col items-start bg-slate-950/60 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-sky-500/25 shadow-lg">
          <span className="text-[8px] text-slate-400 font-semibold tracking-wider">ALT</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-base sm:text-lg font-bold text-sky-400">{telemetry.altitudeFeet}</span>
            <span className="text-[9px] text-sky-400">FT</span>
          </div>
          <div className="flex items-center gap-1 text-[8px] text-slate-400">
            <span>{telemetry.altitudeMeters}m</span>
            {telemetry.verticalSpeedMs >= 0.5 ? (
              <span className="flex items-center text-emerald-400 font-semibold">
                <ArrowUpRight className="w-2.5 h-2.5" />
                +{Math.round(telemetry.verticalSpeedMs * 196.85)}
              </span>
            ) : telemetry.verticalSpeedMs <= -0.5 ? (
              <span className="flex items-center text-red-400 font-semibold">
                <ArrowDownRight className="w-2.5 h-2.5" />
                {Math.round(telemetry.verticalSpeedMs * 196.85)}
              </span>
            ) : (
              <span>0 fpm</span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM BAR: LEFT THUMB (THROTTLE/FLAPS) & RIGHT THUMB (JOYSTICK/BRAKES)    */}
      {/* ========================================================================= */}
      <div className="flex items-end justify-between w-full pointer-events-none gap-2">
        {/* Bottom Left Cluster: Slim Throttle + Horizontal Flap Pill */}
        <div className="flex items-end gap-1.5 pointer-events-auto">
          <ThrottleSlider throttle={telemetry.throttle} setThrottle={setThrottle} compact={true} />
          <FlapSelector flapStage={telemetry.flapStage} setFlapStage={setFlapStage} compact={true} />
        </div>

        {/* Bottom Right Cluster: Wheel Brakes & Translucent Virtual Joystick */}
        <div className="flex items-end gap-1.5 pointer-events-auto">
          {/* Wheel Brakes Trigger Button */}
          <div className="flex flex-col items-end mb-1">
            <button
              onMouseDown={() => setIsBraking(true)}
              onMouseUp={() => setIsBraking(false)}
              onTouchStart={() => setIsBraking(true)}
              onTouchEnd={() => setIsBraking(false)}
              className={`px-2.5 py-2 rounded-xl border font-mono text-[10px] font-bold transition-all shadow-lg flex items-center gap-1 select-none touch-none ${
                isBraking
                  ? 'bg-red-600/60 border-red-400 text-white shadow-[0_0_16px_rgba(239,68,68,0.7)] scale-95'
                  : 'bg-slate-950/60 hover:bg-slate-800 border-sky-500/30 text-slate-300'
              }`}
              style={{ touchAction: 'none' }}
              title="Ground Wheel Brakes (Hold Space / Tap)"
            >
              <Disc className={`w-3.5 h-3.5 ${isBraking ? 'text-red-300 animate-spin' : 'text-slate-400'}`} />
              <span>{isBraking ? 'BRAKING' : 'BRAKE'}</span>
            </button>
          </div>

          {/* Virtual Flight Joystick */}
          {showJoystick && (
            <VirtualJoystick onAxesChange={setVirtualAxes} compact={true} />
          )}
        </div>
      </div>
    </div>
  );
};
