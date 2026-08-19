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
  Radio,
  Gamepad2
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
  multiplayer
}) => {
  const [showJoystick, setShowJoystick] = useState<boolean>(true);

  // Horizon Pitch & Roll transforms
  const pitchOffsetPx = (telemetry.pitchDeg || 0) * 3.5;
  const rollAngleDeg = -(telemetry.rollDeg || 0);

  // Compass Heading formatted
  const headingFormatted = String(Math.round(telemetry.yawDeg)).padStart(3, '0');

  const pilotsCount = multiplayer ? multiplayer.onlineCount : 1;

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3 sm:p-4 z-20 overflow-hidden font-mono">
      {/* ========================================================================= */}
      {/* TOP BAR: COMPASS HEADING & UTILITY ACTIONS                                */}
      {/* ========================================================================= */}
      <div className="flex items-start justify-between w-full">
        {/* Left Status: Flight Status / Gear & Multiplayer */}
        <div className="flex flex-col gap-1 bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-xl border border-sky-500/30 text-xs shadow-xl">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">STATE:</span>
            <span className={`font-bold ${telemetry.isGrounded ? 'text-amber-400' : 'text-emerald-400'}`}>
              {telemetry.isGrounded ? 'ON GROUND' : 'AIRBORNE'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">CAMERA:</span>
            <span className="text-sky-300 font-semibold uppercase">{cameraMode}</span>
          </div>

          {/* Multiplayer LAN / Room Indicator */}
          {multiplayer && (
            <div className="pt-1 border-t border-slate-700/60 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <Radio className={`w-3.5 h-3.5 ${multiplayer.isConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
                <span className="text-slate-400">LAN:</span>
                <span className={`font-bold flex items-center gap-1 ${multiplayer.isConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <Users className="w-3 h-3 inline" />
                  {multiplayer.isConnected ? `${pilotsCount} PILOT${pilotsCount > 1 ? 'S' : ''}` : 'CONNECTING...'}
                </span>
              </div>
              {multiplayer.identity && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white/40"
                    style={{ backgroundColor: multiplayer.identity.accentColor }}
                  />
                  <span className="text-white font-bold">{multiplayer.identity.callsign}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Compass Heading Ribbon */}
        <div className="flex flex-col items-center bg-slate-900/80 backdrop-blur-md px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl border border-sky-500/30 shadow-xl">
          <div className="text-[10px] text-slate-400 tracking-widest font-semibold">HEADING</div>
          <div className="text-base sm:text-lg font-bold text-sky-400 tracking-wider">
            {headingFormatted}°
          </div>
          {/* Compass visual ticks */}
          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
            <span className={telemetry.yawDeg >= 350 || telemetry.yawDeg <= 10 ? 'text-cyan-300 font-bold' : ''}>N</span>
            <span className={telemetry.yawDeg >= 80 && telemetry.yawDeg <= 100 ? 'text-cyan-300 font-bold' : ''}>E</span>
            <span className={telemetry.yawDeg >= 170 && telemetry.yawDeg <= 190 ? 'text-cyan-300 font-bold' : ''}>S</span>
            <span className={telemetry.yawDeg >= 260 && telemetry.yawDeg <= 280 ? 'text-cyan-300 font-bold' : ''}>W</span>
          </div>
        </div>

        {/* Right: Quick Action Controls Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          <button
            onClick={() => setShowJoystick((prev) => !prev)}
            className={`p-2.5 rounded-xl border backdrop-blur-md transition-colors shadow-lg ${
              showJoystick
                ? 'bg-sky-600/30 border-sky-400 text-sky-300'
                : 'bg-slate-900/80 hover:bg-slate-800 border-sky-500/30 text-slate-400'
            }`}
            title="Toggle Virtual Joystick"
          >
            <Gamepad2 className="w-4 h-4" />
          </button>
          <button
            onClick={cycleCamera}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md text-sky-400 hover:text-white rounded-xl border border-sky-500/30 transition-colors shadow-lg"
            title="Switch Camera (C)"
          >
            <Camera className="w-4 h-4" />
          </button>
          <button
            onClick={toggleMute}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md text-sky-400 hover:text-white rounded-xl border border-sky-500/30 transition-colors shadow-lg"
            title="Mute / Unmute Audio (M)"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onReset}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md text-sky-400 hover:text-white rounded-xl border border-sky-500/30 transition-colors shadow-lg"
            title="Reset Flight (R)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenHelp}
            className="p-2.5 bg-sky-600/90 hover:bg-sky-500 text-white rounded-xl border border-sky-400 shadow-lg shadow-sky-500/20 transition-colors"
            title="Flight Controls Guide (H)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CENTER: ARTIFICIAL HORIZON & STALL WARNING                                */}
      {/* ========================================================================= */}
      <div className="relative flex-1 flex items-center justify-center pointer-events-none">
        {/* Stall Warning Flashing Banner */}
        {telemetry.isStalling && !telemetry.isGrounded && (
          <div className="absolute top-8 sm:top-12 bg-red-600/90 border-2 border-white px-4 sm:px-6 py-2 rounded-xl text-white font-bold text-xs sm:text-base tracking-widest flex items-center gap-2 shadow-[0_0_25px_rgba(239,68,68,0.9)] animate-bounce">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <span>STALL WARNING! NOSE DOWN / POWER UP</span>
          </div>
        )}

        {/* Pitch / Roll Horizon Box */}
        <div className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-full border border-sky-500/20 flex items-center justify-center overflow-hidden">
          {/* Rotating Horizon Ladder Container */}
          <div
            className="absolute w-full h-full flex items-center justify-center transition-transform duration-75"
            style={{
              transform: `rotate(${rollAngleDeg}deg) translateY(${pitchOffsetPx}px)`
            }}
          >
            {/* Horizon Center Line */}
            <div className="w-36 sm:w-44 h-[2px] bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />

            {/* Pitch Ladders (+10°, +20°, -10°, -20°) */}
            <div className="absolute top-[calc(50%-35px)] w-20 h-[1.5px] bg-sky-400/70 flex justify-between text-[9px] text-sky-300">
              <span>+10</span>
              <span>+10</span>
            </div>
            <div className="absolute top-[calc(50%-70px)] w-14 h-[1.5px] bg-sky-400/70 flex justify-between text-[9px] text-sky-300">
              <span>+20</span>
              <span>+20</span>
            </div>
            <div className="absolute top-[calc(50%+35px)] w-20 h-[1.5px] border-b border-dashed border-sky-400/70 flex justify-between text-[9px] text-sky-300">
              <span>-10</span>
              <span>-10</span>
            </div>
            <div className="absolute top-[calc(50%+70px)] w-14 h-[1.5px] border-b border-dashed border-sky-400/70 flex justify-between text-[9px] text-sky-300">
              <span>-20</span>
              <span>-20</span>
            </div>
          </div>

          {/* Fixed Aircraft Boresight Crosshair (Center) */}
          <div className="relative z-10 flex items-center justify-center">
            {/* Center dot */}
            <div className="w-2.5 h-2.5 rounded-full border-2 border-yellow-400 bg-yellow-400/30" />
            {/* Left & Right reticle wings */}
            <div className="absolute -left-7 w-6 h-[2px] bg-yellow-400" />
            <div className="absolute -right-7 w-6 h-[2px] bg-yellow-400" />
          </div>
        </div>

        {/* Left Side: Airspeed Indicator Tape */}
        <div className="absolute left-2 sm:left-4 flex flex-col items-end bg-slate-900/80 backdrop-blur-md px-3 py-2 sm:px-3.5 sm:py-3 rounded-xl border border-sky-500/30 shadow-xl">
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold tracking-wider">AIRSPEED</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold text-sky-400">{telemetry.airspeedKnots}</span>
            <span className="text-[10px] sm:text-xs text-sky-400">KTS</span>
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">
            {Math.round(telemetry.airspeedMs * 3.6)} km/h
          </span>
        </div>

        {/* Right Side: Altitude Indicator Tape + Vertical Speed */}
        <div className="absolute right-2 sm:right-4 flex flex-col items-start bg-slate-900/80 backdrop-blur-md px-3 py-2 sm:px-3.5 sm:py-3 rounded-xl border border-sky-500/30 shadow-xl">
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold tracking-wider">ALTITUDE</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold text-sky-400">{telemetry.altitudeFeet}</span>
            <span className="text-[10px] sm:text-xs text-sky-400">FT</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-slate-400 mt-0.5">
            <span>{telemetry.altitudeMeters} m</span>
            <span className="text-slate-600">|</span>
            {telemetry.verticalSpeedMs >= 0.5 ? (
              <span className="flex items-center text-emerald-400 font-semibold">
                <ArrowUpRight className="w-3 h-3" />
                +{Math.round(telemetry.verticalSpeedMs * 196.85)} fpm
              </span>
            ) : telemetry.verticalSpeedMs <= -0.5 ? (
              <span className="flex items-center text-red-400 font-semibold">
                <ArrowDownRight className="w-3 h-3" />
                {Math.round(telemetry.verticalSpeedMs * 196.85)} fpm
              </span>
            ) : (
              <span className="text-slate-400">0 fpm</span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM BAR: THROTTLE, FLAPS, VIRTUAL JOYSTICK & BRAKES                    */}
      {/* ========================================================================= */}
      <div className="flex items-end justify-between w-full pointer-events-none gap-2">
        {/* Bottom Left: Throttle Slider + Flap Selector (Left Thumb Zone) */}
        <div className="flex items-end gap-2 sm:gap-3 pointer-events-auto">
          <ThrottleSlider throttle={telemetry.throttle} setThrottle={setThrottle} />
          <FlapSelector flapStage={telemetry.flapStage} setFlapStage={setFlapStage} />
        </div>

        {/* Bottom Right: Virtual Flight Joystick & Wheel Brakes (Right Thumb Zone) */}
        <div className="flex items-end gap-2 sm:gap-3 pointer-events-auto">
          {/* Wheel Brakes Button */}
          <div className="flex flex-col items-end mb-1">
            <button
              onMouseDown={() => setIsBraking(true)}
              onMouseUp={() => setIsBraking(false)}
              onTouchStart={() => setIsBraking(true)}
              onTouchEnd={() => setIsBraking(false)}
              className={`px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border font-mono text-xs font-bold transition-all shadow-xl flex items-center gap-2 select-none touch-none ${
                isBraking
                  ? 'bg-red-600/50 border-red-400 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.6)] scale-95'
                  : 'bg-slate-900/80 hover:bg-slate-800 border-sky-500/30 text-slate-200'
              }`}
              style={{ touchAction: 'none' }}
              title="Ground Wheel Brakes (Hold Space / Tap)"
            >
              <Disc className={`w-4 h-4 ${isBraking ? 'text-red-400 animate-spin' : 'text-slate-400'}`} />
              <div className="flex flex-col items-start text-left">
                <span>{isBraking ? 'BRAKING' : 'BRAKES'}</span>
                <span className="text-[8px] sm:text-[9px] text-slate-400 font-normal">Hold</span>
              </div>
            </button>
          </div>

          {/* Virtual Flight Joystick */}
          {showJoystick && (
            <VirtualJoystick onAxesChange={setVirtualAxes} />
          )}
        </div>
      </div>
    </div>
  );
};
