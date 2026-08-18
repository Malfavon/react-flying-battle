import React from 'react';
import { Plane, Compass, ArrowUpRight, CloudSun } from 'lucide-react';

interface StartModalProps {
  isOpen: boolean;
  onSpawnRunway: () => void;
  onSpawnInFlight: () => void;
}

export const StartModal: React.FC<StartModalProps> = ({
  isOpen,
  onSpawnRunway,
  onSpawnInFlight
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md pointer-events-auto p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900/95 border-2 border-sky-500/50 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-[0_0_50px_rgba(14,165,233,0.35)] text-slate-200 font-sans relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-6 relative">
          <div className="inline-flex p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mb-3 shadow-lg shadow-sky-500/10">
            <Plane className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-widest uppercase font-mono">
            MINIMALIST FLIGHT SIMULATOR
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Select your flight starting scenario
          </p>
        </div>

        {/* Option Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 relative">
          {/* Option 1: Take Off (Runway) */}
          <button
            onClick={onSpawnRunway}
            className="group flex flex-col justify-between p-4 rounded-xl bg-slate-800/60 hover:bg-sky-950/50 border border-slate-700/60 hover:border-sky-500 transition-all duration-200 text-left hover:scale-[1.02] shadow-md hover:shadow-sky-500/20"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Land
                </span>
              </div>
              <h3 className="text-base font-bold text-white font-mono tracking-wide group-hover:text-sky-300 transition-colors">
                TAKE OFF
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Spawn on the main airport runway. Throttle begins at 0% (Idle).
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/40 text-[11px] font-mono text-sky-400 flex items-center justify-between">
              <span>Start on Runway</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>

          {/* Option 2: Spawn In Flight (20% Throttle) */}
          <button
            onClick={onSpawnInFlight}
            className="group flex flex-col justify-between p-4 rounded-xl bg-slate-800/60 hover:bg-emerald-950/50 border border-slate-700/60 hover:border-emerald-500 transition-all duration-200 text-left hover:scale-[1.02] shadow-md hover:shadow-emerald-500/20"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <CloudSun className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                  Airborne
                </span>
              </div>
              <h3 className="text-base font-bold text-white font-mono tracking-wide group-hover:text-emerald-300 transition-colors">
                SPAWN IN FLIGHT
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Spawn airborne at 500 ft over ocean cruising at 20% throttle.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/40 text-[11px] font-mono text-emerald-400 flex items-center justify-between">
              <span>Fly in Mid-Air</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        </div>

        {/* Footer Quick Controls Hint */}
        <div className="text-center text-[11px] font-mono text-slate-500 border-t border-slate-800/80 pt-4 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">S</kbd> / <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">↓</kbd> Pull Up
          </span>
          <span>•</span>
          <span>
            <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">A</kbd> / <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">D</kbd> Bank & Turn
          </span>
        </div>
      </div>
    </div>
  );
};
