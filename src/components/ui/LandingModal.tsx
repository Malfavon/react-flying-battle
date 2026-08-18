import React from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { FlightTelemetry } from '../../types/flight';

interface LandingModalProps {
  telemetry: FlightTelemetry;
  onTakeoffAgain: () => void;
  onReset: () => void;
}

export const LandingModal: React.FC<LandingModalProps> = ({
  telemetry,
  onTakeoffAgain,
  onReset
}) => {
  if (!telemetry.isLanded) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm pointer-events-auto p-4">
      <div className="bg-slate-900/95 border-2 border-emerald-500/60 rounded-2xl max-w-md w-full p-6 shadow-[0_0_30px_rgba(16,185,129,0.3)] text-center text-slate-200 animate-in zoom-in-95 duration-200">
        <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400 mb-3 border border-emerald-500/40">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold font-mono text-white tracking-wider mb-1">
          SUCCESSFUL LANDING!
        </h2>
        <p className="text-xs text-emerald-400 font-mono mb-4">
          Aircraft brought to a complete safe stop on runway
        </p>

        {/* Flight Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 mb-5 text-left">
          <div>
            <span className="text-slate-400">Heading:</span>{' '}
            <span className="text-white font-semibold">{telemetry.yawDeg}°</span>
          </div>
          <div>
            <span className="text-slate-400">Flaps Used:</span>{' '}
            <span className="text-white font-semibold">Stage {telemetry.flapStage}</span>
          </div>
          <div>
            <span className="text-slate-400">Wheel Brakes:</span>{' '}
            <span className="text-emerald-400 font-semibold">Applied</span>
          </div>
          <div>
            <span className="text-slate-400">Status:</span>{' '}
            <span className="text-emerald-400 font-semibold">Ready for departure</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onTakeoffAgain}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors font-mono text-xs tracking-wider shadow-lg shadow-emerald-600/30"
          >
            THROTTLE UP & DEPART
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors font-mono text-xs flex items-center gap-1.5"
            title="Reset to main runway"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
        </div>
      </div>
    </div>
  );
};
