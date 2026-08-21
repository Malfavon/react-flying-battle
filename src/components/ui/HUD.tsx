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
  multiplayer
}) => {
  const [showJoystick, setShowJoystick] = useState<boolean>(true);
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
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-2 sm:p-3.5 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] z-20 overflow-hidden font-mono">
      {/* Damage Screen Flash Vignette */}
      {damageFlash && (
        <div className="absolute inset-0 border-4 sm:border-8 border-red-600/80 bg-red-600/15 pointer-events-none z-40 animate-pulse shadow-[inset_0_0_50px_rgba(239,68,68,0.5)]" />
      )}

      {/* ========================================================================= */}
      {/* TOP BAR: COMPACT STATUS, HEALTH BAR, HEADING & TOOLBAR                    */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between w-full pointer-events-none gap-1.5 sm:gap-2">
        {/* Left Cluster: Status + Health Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Status Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950/70 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-sky-500/30 text-[11px] shadow-lg pointer-events-auto">
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

          {/* Health Bar Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950/70 backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-xl border border-sky-500/30 text-[11px] shadow-lg pointer-events-auto">
            <Shield className={`w-3.5 h-3.5 ${healthPct > 50 ? 'text-emerald-400' : healthPct > 25 ? 'text-amber-400' : 'text-red-400 animate-pulse'}`} />
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-slate-400">HP</span>
                <span className={healthPct > 50 ? 'text-emerald-400' : healthPct > 25 ? 'text-amber-400' : 'text-red-400 font-bold animate-pulse'}>
                  {health}/100
                </span>
              </div>
              <div className="w-16 sm:w-24 bg-slate-800/90 rounded-full h-1.5 overflow-hidden border border-slate-700/60">
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
        <div className="hidden md:flex items-center gap-1.5 bg-slate-950/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-sky-500/30 shadow-lg pointer-events-auto">
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
              className="p-1.5 sm:p-2 bg-slate-950/70 hover:bg-slate-800 backdrop-blur-md text-sky-400 hover:text-white rounded-xl border border-sky-500/30 transition-colors shadow-lg active:scale-95"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={() => setShowJoystick((prev) => !prev)}
            className={`p-1.5 sm:p-2 rounded-xl border backdrop-blur-md transition-colors shadow-lg active:scale-95 ${
              showJoystick
                ? 'bg-sky-600/40 border-sky-400 text-sky-300'
                : 'bg-slate-950/70 hover:bg-slate-800 border-sky-500/30 text-slate-400'
            }`}
            title="Toggle Virtual Joystick"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={cycleCamera}
            className="p-1.5 sm:p-2 bg-slate-950/70 hover:bg-slate-800 backdrop-blur-md text-sky-400 hover:text-white rounded-xl border border-sky-500/30 transition-colors shadow-lg active:scale-95"
            title="Switch Camera (C)"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleMute}
            className="p-1.5 sm:p-2 bg-slate-950/70 hover:bg-slate-800 backdrop-blur-md text-sky-400 hover:text-white rounded-xl border border-sky-500/30 transition-colors shadow-lg active:scale-95"
            title="Mute / Unmute Audio (M)"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onReset}
            className="p-1.5 sm:p-2 bg-slate-950/70 hover:bg-slate-800 backdrop-blur-md text-sky-400 hover:text-white rounded-xl border border-sky-500/30 transition-colors shadow-lg active:scale-95"
            title="Reset Flight (R)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenHelp}
            className="p-1.5 sm:p-2 bg-sky-600/90 hover:bg-sky-500 text-white rounded-xl border border-sky-400 shadow-lg shadow-sky-500/20 transition-colors active:scale-95"
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
          <div className="absolute top-2 bg-red-600/90 border border-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl text-white font-bold text-[11px] sm:text-sm tracking-wider flex items-center gap-1.5 shadow-[0_0_20px_rgba(239,68,68,0.9)] animate-bounce z-30">
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
            <span>STALL WARNING! PUSH NOSE DOWN / POWER UP</span>
          </div>
        )}

        {/* Minimalist Transparent Horizon Pitch Lines */}
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

          {/* Gun Target Sight Crosshair Pip */}
          <div className="absolute w-12 h-12 rounded-full border border-sky-400/30 flex items-center justify-center pointer-events-none">
            <div className="w-1 h-1 rounded-full bg-red-400/80" />
          </div>
        </div>

        {/* Left Margin: Slim Airspeed Tape */}
        <div className="absolute left-1 sm:left-2 flex flex-col items-end bg-slate-950/60 backdrop-blur-md px-2 sm:px-2.5 py-1.5 rounded-xl border border-sky-500/25 shadow-lg">
          <span className="text-[8px] text-slate-400 font-semibold tracking-wider">SPEED</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-sm sm:text-lg font-bold text-sky-400">{telemetry.airspeedKnots}</span>
            <span className="text-[9px] text-sky-400">KT</span>
          </div>
          <span className="text-[8px] text-slate-400">
            {Math.round(telemetry.airspeedMs * 3.6)} km/h
          </span>
        </div>

        {/* Right Margin: Slim Altitude Tape + Vertical Speed */}
        <div className="absolute right-1 sm:right-2 flex flex-col items-start bg-slate-950/60 backdrop-blur-md px-2 sm:px-2.5 py-1.5 rounded-xl border border-sky-500/25 shadow-lg">
          <span className="text-[8px] text-slate-400 font-semibold tracking-wider">ALT</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-sm sm:text-lg font-bold text-sky-400">{telemetry.altitudeFeet}</span>
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
      {/* BOTTOM BAR (INVERTED ERGONOMICS):                                         */}
      {/* LEFT THUMB: Virtual Joystick & Rudder Pedals                               */}
      {/* RIGHT THUMB: Throttle Slider, Tactical Fire, Wheel Brakes & Flaps         */}
      {/* ========================================================================= */}
      <div className="flex items-end justify-between w-full pointer-events-none gap-2">
        {/* Bottom Left Cluster: Virtual Flight Stick & Yaw (Left Thumb) */}
        <div className="flex items-end gap-1.5 pointer-events-auto">
          {showJoystick && (
            <VirtualJoystick onAxesChange={setVirtualAxes} compact={true} />
          )}
        </div>

        {/* Bottom Right Cluster: Throttle, Flaps, Fire & Wheel Brakes (Right Thumb) */}
        <div className="flex items-end gap-2 pointer-events-auto">
          {/* Action Buttons: Tactical FIRE & Wheel Brakes */}
          <div className="flex flex-col items-end gap-1.5 mb-1">
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
              className={`px-3.5 py-2 rounded-xl border font-mono text-[11px] font-bold transition-all shadow-lg flex items-center gap-1.5 select-none touch-none active:scale-95 ${
                isFiring || isTouchFiring
                  ? 'bg-amber-600/95 border-amber-300 text-white shadow-[0_0_18px_rgba(245,158,11,0.9)] scale-95'
                  : 'bg-slate-950/75 hover:bg-slate-800 border-amber-500/40 text-amber-300'
              }`}
              style={{ touchAction: 'none' }}
              title="Fire Machine Guns (Hold / Tap)"
            >
              <Crosshair className={`w-3.5 h-3.5 ${isFiring || isTouchFiring ? 'text-amber-200 animate-spin' : 'text-amber-400'}`} />
              <span>{isFiring || isTouchFiring ? 'FIRING' : 'FIRE'}</span>
            </button>

            {/* Wheel Brakes Trigger Button */}
            <button
              onMouseDown={() => setIsBraking(true)}
              onMouseUp={() => setIsBraking(false)}
              onTouchStart={() => setIsBraking(true)}
              onTouchEnd={() => setIsBraking(false)}
              className={`px-3 py-1.5 rounded-xl border font-mono text-[10px] font-bold transition-all shadow-lg flex items-center gap-1 select-none touch-none active:scale-95 ${
                isBraking
                  ? 'bg-red-600/70 border-red-400 text-white shadow-[0_0_16px_rgba(239,68,68,0.7)] scale-95'
                  : 'bg-slate-950/70 hover:bg-slate-800 border-sky-500/30 text-slate-300'
              }`}
              style={{ touchAction: 'none' }}
              title="Ground Wheel Brakes (Hold to Stop)"
            >
              <Disc className={`w-3 h-3 ${isBraking ? 'text-red-300 animate-spin' : 'text-slate-400'}`} />
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
    </div>
  );
};
