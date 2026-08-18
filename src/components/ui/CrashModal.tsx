import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { FlightTelemetry } from '../../types/flight';

interface CrashModalProps {
  telemetry: FlightTelemetry;
  onRespawn: () => void;
}

export const CrashModal: React.FC<CrashModalProps> = ({ telemetry, onRespawn }) => {
  if (!telemetry.isCrashed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md pointer-events-auto p-4">
      <div className="bg-slate-900/95 border-2 border-red-500/70 rounded-2xl max-w-md w-full p-6 shadow-[0_0_35px_rgba(239,68,68,0.4)] text-center text-slate-200 animate-in zoom-in-95 duration-150">
        <div className="inline-flex p-3 rounded-full bg-red-500/20 text-red-400 mb-3 border border-red-500/40">
          <AlertOctagon className="w-9 h-9" />
        </div>

        <h2 className="text-xl font-bold font-mono text-white tracking-wider mb-1">
          AIRCRAFT CRASHED
        </h2>

        <p className="text-xs text-red-400 font-mono mb-4 px-2 font-medium">
          {telemetry.crashReason || 'Impact destroyed the aircraft.'}
        </p>

        {/* Telemetry at time of impact */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 mb-5 text-left">
          <div>
            <span className="text-slate-400">Impact Speed:</span>{' '}
            <span className="text-white font-semibold">{telemetry.airspeedKnots} kts</span>
          </div>
          <div>
            <span className="text-slate-400">Pitch Angle:</span>{' '}
            <span className="text-white font-semibold">{telemetry.pitchDeg}°</span>
          </div>
          <div>
            <span className="text-slate-400">Bank Angle:</span>{' '}
            <span className="text-white font-semibold">{telemetry.rollDeg}°</span>
          </div>
          <div>
            <span className="text-slate-400">Flaps:</span>{' '}
            <span className="text-white font-semibold">Stage {telemetry.flapStage}</span>
          </div>
        </div>

        <button
          onClick={onRespawn}
          className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all font-mono text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-600/40"
        >
          <RotateCcw className="w-4 h-4" />
          <span>RESPAWN ON RUNWAY (R)</span>
        </button>
      </div>
    </div>
  );
};
