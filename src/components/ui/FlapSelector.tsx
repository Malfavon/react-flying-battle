import React from 'react';
import { Layers } from 'lucide-react';
import { FlapStage } from '../../types/flight';
import { FLAP_CONFIGS } from '../../hooks/useFlightPhysics';

interface FlapSelectorProps {
  flapStage: FlapStage;
  setFlapStage: (stage: FlapStage) => void;
  compact?: boolean;
}

export const FlapSelector: React.FC<FlapSelectorProps> = ({ flapStage, setFlapStage, compact = false }) => {
  const stages: FlapStage[] = [0, 1, 2];

  if (compact) {
    return (
      <div className="flex items-center bg-slate-950/75 backdrop-blur-md p-0.5 sm:p-1 rounded-xl border border-sky-500/30 shadow-lg pointer-events-auto select-none gap-0.5 sm:gap-1">
        <div className="flex items-center gap-0.5 px-1 text-sky-400 font-mono text-[9px] font-semibold">
          <Layers className="w-2.5 h-2.5" />
          <span>FLP</span>
        </div>
        {stages.map((stage) => {
          const config = FLAP_CONFIGS[stage];
          const isActive = flapStage === stage;

          return (
            <button
              key={stage}
              onClick={() => setFlapStage(stage)}
              className={`px-1.5 sm:px-2 py-0.5 rounded-lg font-mono text-[9px] font-bold flex items-center gap-0.5 transition-all ${
                isActive
                  ? 'bg-sky-500 text-slate-950 shadow-[0_0_10px_rgba(56,189,248,0.6)] scale-105 font-black'
                  : 'text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700'
              }`}
              title={`Flap Stage ${stage + 1}: ${config.angleDeg}° (${stage === 0 ? 'Cruise' : stage === 1 ? 'Takeoff' : 'Landing'})`}
            >
              <span>{config.angleDeg}°</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-slate-900/80 backdrop-blur-md p-3.5 rounded-xl border border-sky-500/30 shadow-2xl pointer-events-auto select-none min-w-[160px]">
      <div className="flex items-center gap-1.5 mb-2.5 text-sky-400 font-mono text-xs font-semibold tracking-wider">
        <Layers className="w-3.5 h-3.5" />
        <span>FLAPS CONFIG</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {stages.map((stage) => {
          const config = FLAP_CONFIGS[stage];
          const isActive = flapStage === stage;

          return (
            <button
              key={stage}
              onClick={() => setFlapStage(stage)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg font-mono text-xs transition-all duration-150 border ${
                isActive
                  ? 'bg-sky-600/30 border-sky-400 text-white shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 flex items-center justify-center rounded text-[10px] font-bold ${
                  isActive ? 'bg-sky-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                }`}>
                  {stage + 1}
                </span>
                <span className="font-semibold">{config.angleDeg}°</span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">
                {stage === 0 ? 'Cruise' : stage === 1 ? 'Takeoff' : 'Landing'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 text-[10px] font-mono text-slate-400 text-center">
        Keys: <span className="text-sky-300">1</span>, <span className="text-sky-300">2</span>, <span className="text-sky-300">3</span>
      </div>
    </div>
  );
};
