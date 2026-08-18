import React from 'react';
import { Gauge } from 'lucide-react';

interface ThrottleSliderProps {
  throttle: number; // 0 - 100
  setThrottle: (val: number | ((prev: number) => number)) => void;
}

export const ThrottleSlider: React.FC<ThrottleSliderProps> = ({ throttle, setThrottle }) => {
  return (
    <div className="flex flex-col items-center bg-slate-900/85 backdrop-blur-md p-3 rounded-xl border border-sky-500/30 shadow-2xl pointer-events-auto select-none min-w-[120px]">
      <div className="flex items-center gap-1.5 mb-1.5 text-sky-400 font-mono text-xs font-semibold tracking-wider">
        <Gauge className="w-3.5 h-3.5" />
        <span>THROTTLE</span>
      </div>

      {/* Throttle Percentage Display */}
      <div className="text-xl font-bold font-mono text-white mb-1 tracking-tight">
        {Math.round(throttle)}<span className="text-xs text-sky-400 font-normal">%</span>
      </div>

      {/* Interactive Vertical Slider Track */}
      <div className="relative h-44 w-12 flex items-center justify-center my-1">
        {/* Visual Background Track */}
        <div className="absolute w-3.5 bg-slate-800 rounded-full h-full border border-slate-700 overflow-hidden">
          <div
            className="w-full bg-gradient-to-t from-sky-600 via-sky-400 to-cyan-300 rounded-full transition-all duration-75"
            style={{
              height: `${throttle}%`,
              position: 'absolute',
              bottom: 0
            }}
          />
        </div>

        {/* Real HTML Range Slider (Rotated for cross-browser support) */}
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={throttle}
          onChange={(e) => setThrottle(Number(e.target.value))}
          className="absolute w-44 h-10 -rotate-90 cursor-pointer opacity-0 z-20"
          style={{ transformOrigin: 'center center' }}
        />

        {/* Custom Visual Thumb Indicator */}
        <div
          className="absolute w-8 h-4 rounded bg-sky-400 border border-white shadow-[0_0_10px_rgba(56,189,248,0.8)] pointer-events-none transition-all duration-75 z-10"
          style={{
            bottom: `calc(${throttle}% - 8px)`
          }}
        />

        {/* Marker Ticks */}
        <div className="absolute right-0 top-0 h-full flex flex-col justify-between text-[9px] font-mono text-slate-400 pl-3 pointer-events-none">
          <span>100</span>
          <span>75</span>
          <span>50</span>
          <span>25</span>
          <span>0</span>
        </div>
      </div>

      {/* Quick Preset Buttons */}
      <div className="flex gap-1 mt-2.5 w-full">
        <button
          onClick={() => setThrottle(0)}
          className="flex-1 py-1 text-[10px] font-mono font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Idle Throttle (0%)"
        >
          IDLE
        </button>
        <button
          onClick={() => setThrottle(50)}
          className="flex-1 py-1 text-[10px] font-mono font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title="Cruise Throttle (50%)"
        >
          50%
        </button>
        <button
          onClick={() => setThrottle(100)}
          className="flex-1 py-1 text-[10px] font-mono font-medium rounded bg-sky-950/90 hover:bg-sky-900 text-sky-300 border border-sky-600/40 transition-colors"
          title="Full Throttle (100%)"
        >
          MAX
        </button>
      </div>
      <span className="text-[9px] text-slate-400 font-mono mt-1">Shift / Ctrl</span>
    </div>
  );
};
