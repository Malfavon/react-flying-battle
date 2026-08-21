import React, { useState } from 'react';
import { Plane, Compass, ArrowUpRight, CloudSun, Maximize2 } from 'lucide-react';

interface StartModalProps {
  isOpen: boolean;
  onSpawnRunway: () => void;
  onSpawnInFlight: () => void;
  onEnterFullscreen?: () => void;
  isFullscreenSupported?: boolean;
}

export const StartModal: React.FC<StartModalProps> = ({
  isOpen,
  onSpawnRunway,
  onSpawnInFlight,
  onEnterFullscreen,
  isFullscreenSupported = true
}) => {
  const [fullscreenOnLaunch, setFullscreenOnLaunch] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleRunway = () => {
    if (fullscreenOnLaunch && onEnterFullscreen) {
      onEnterFullscreen();
    }
    onSpawnRunway();
  };

  const handleInFlight = () => {
    if (fullscreenOnLaunch && onEnterFullscreen) {
      onEnterFullscreen();
    }
    onSpawnInFlight();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md pointer-events-auto p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900/95 border-2 border-sky-500/50 rounded-2xl max-w-xl w-full p-3.5 sm:p-6 shadow-[0_0_50px_rgba(14,165,233,0.35)] text-slate-200 font-sans relative overflow-hidden my-auto max-h-[92dvh] overflow-y-auto custom-scrollbar">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-3 sm:mb-4 relative">
          <div className="inline-flex p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mb-1.5 shadow-lg shadow-sky-500/10">
            <Plane className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h1 className="text-sm sm:text-xl font-black text-white tracking-widest uppercase font-mono">
            MINIMALIST FLIGHT SIMULATOR
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 font-mono mt-0.5">
            Select your flight starting scenario
          </p>
        </div>

        {/* Option Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 mb-3 sm:mb-4 relative">
          {/* Option 1: Take Off (Runway) */}
          <button
            onClick={handleRunway}
            className="group flex flex-col justify-between p-3 sm:p-4 rounded-xl bg-slate-800/60 hover:bg-sky-950/50 border border-slate-700/60 hover:border-sky-500 transition-all duration-200 text-left hover:scale-[1.02] shadow-md hover:shadow-sky-500/20 active:scale-[0.98]"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Runway
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white font-mono tracking-wide group-hover:text-sky-300 transition-colors">
                TAKE OFF
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-snug">
                Spawn on main runway at 0% idle throttle.
              </p>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-700/40 text-[10px] sm:text-[11px] font-mono text-sky-400 flex items-center justify-between">
              <span>Start on Runway</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>

          {/* Option 2: Spawn In Flight (50% Cruise Throttle) */}
          <button
            onClick={handleInFlight}
            className="group flex flex-col justify-between p-3 sm:p-4 rounded-xl bg-slate-800/60 hover:bg-emerald-950/50 border border-slate-700/60 hover:border-emerald-500 transition-all duration-200 text-left hover:scale-[1.02] shadow-md hover:shadow-emerald-500/20 active:scale-[0.98]"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <CloudSun className="w-4 h-4" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                  Airborne
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white font-mono tracking-wide group-hover:text-emerald-300 transition-colors">
                SPAWN IN FLIGHT
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-snug">
                Spawn airborne at 600 ft cruising at 50% (~93 KT).
              </p>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-700/40 text-[10px] sm:text-[11px] font-mono text-emerald-400 flex items-center justify-between">
              <span>Fly in Mid-Air</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        </div>

        {/* Fullscreen Option Row */}
        {isFullscreenSupported ? (
          <div className="flex items-center justify-between bg-slate-800/40 border border-slate-700/50 rounded-xl p-2 sm:p-2.5 mb-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-mono text-slate-300">
              <input
                type="checkbox"
                checked={fullscreenOnLaunch}
                onChange={(e) => setFullscreenOnLaunch(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 font-semibold text-white">
                <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                Launch in Fullscreen Mode
              </span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">Hides browser address bar</span>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-slate-800/30 border border-slate-700/40 rounded-xl p-2 sm:p-2.5 mb-3 text-[10px] sm:text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-sky-300 font-semibold">
              <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
              iPhone tip:
            </span>
            <span>Tap Share → "Add to Home Screen" for Fullscreen</span>
          </div>
        )}

        {/* Footer Quick Controls Hint */}
        <div className="text-center text-[10px] sm:text-[11px] font-mono text-slate-500 border-t border-slate-800/80 pt-2.5 flex items-center justify-center gap-3 sm:gap-4">
          <span className="flex items-center gap-1">
            <Compass className="w-3 h-3 text-slate-400" />
            <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">S</kbd> / <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">↓</kbd> Pull Up
          </span>
          <span>•</span>
          <span>
            <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">A</kbd> / <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">D</kbd> Roll / Turn
          </span>
        </div>
      </div>
    </div>
  );
};
