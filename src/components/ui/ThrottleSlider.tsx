import React, { useRef } from 'react';
import { Gauge } from 'lucide-react';

interface ThrottleSliderProps {
  throttle: number; // 0 - 100
  setThrottle: (val: number | ((prev: number) => number)) => void;
  compact?: boolean;
}

export const ThrottleSlider: React.FC<ThrottleSliderProps> = ({ throttle, setThrottle, compact = false }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateThrottleFromPointer(e);
  };

  const updateThrottleFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = (rect.bottom - e.clientY) / rect.height;
    const clamped = Math.max(0, Math.min(100, Math.round(ratio * 100)));
    setThrottle(clamped);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    updateThrottleFromPointer(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  if (compact) {
    return (
      <div className="flex flex-col items-center bg-slate-950/75 backdrop-blur-md p-1 sm:p-1.5 rounded-xl border border-sky-500/30 shadow-2xl pointer-events-auto select-none min-w-[54px] sm:min-w-[60px]">
        {/* Compact Percentage */}
        <div className="text-[10px] sm:text-[11px] font-bold font-mono text-white mb-0.5 tracking-tight flex items-center gap-0.5">
          <Gauge className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-sky-400" />
          <span>{Math.round(throttle)}</span>
          <span className="text-[8px] sm:text-[9px] text-sky-400 font-normal">%</span>
        </div>

        {/* Compact Interactive Vertical Slider Track */}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative h-20 sm:h-24 w-8 sm:w-9 flex items-center justify-center my-0.5 cursor-ns-resize touch-none py-1.5"
          style={{ touchAction: 'none' }}
        >
          {/* Visual Background Track */}
          <div className="absolute w-2.5 sm:w-3 bg-slate-900/90 rounded-full h-[calc(100%-6px)] border border-slate-700/80 overflow-hidden pointer-events-none">
            <div
              className="w-full bg-gradient-to-t from-sky-600 via-sky-400 to-cyan-300 rounded-full transition-all duration-75"
              style={{
                height: `${throttle}%`,
                position: 'absolute',
                bottom: 0
              }}
            />
          </div>

          {/* Custom Visual Thumb Indicator (Bounded within track height) */}
          <div
            className="absolute w-7 sm:w-8 h-3.5 sm:h-4 rounded-md bg-sky-400 border border-white shadow-[0_0_10px_rgba(56,189,248,0.8)] pointer-events-none transition-all duration-75 z-10 flex items-center justify-center"
            style={{
              bottom: `calc(${throttle * 0.80}% + 2px)`
            }}
          >
            <div className="w-3 sm:w-3.5 h-[1.5px] bg-slate-950/80 rounded-full" />
          </div>
        </div>

        {/* Compact IDLE / 50% / MAX buttons */}
        <div className="flex gap-0.5 sm:gap-1 mt-0.5 w-full">
          <button
            onClick={() => setThrottle(0)}
            className="flex-1 py-0.5 text-[7px] sm:text-[8px] font-mono font-bold rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 transition-colors active:scale-95"
            title="Idle Throttle (0%)"
          >
            0%
          </button>
          <button
            onClick={() => setThrottle(50)}
            className="flex-1 py-0.5 text-[7px] sm:text-[8px] font-mono font-bold rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 transition-colors active:scale-95"
            title="Cruise Throttle (50%)"
          >
            50%
          </button>
          <button
            onClick={() => setThrottle(100)}
            className="flex-1 py-0.5 text-[7px] sm:text-[8px] font-mono font-bold rounded bg-sky-950/90 hover:bg-sky-900 text-sky-300 border border-sky-600/40 transition-colors active:scale-95"
            title="Max Throttle (100%)"
          >
            MAX
          </button>
        </div>
      </div>
    );
  }

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
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative h-44 w-12 flex items-center justify-center my-1 cursor-ns-resize touch-none"
        style={{ touchAction: 'none' }}
      >
        {/* Visual Background Track */}
        <div className="absolute w-3.5 bg-slate-800 rounded-full h-full border border-slate-700 overflow-hidden pointer-events-none">
          <div
            className="w-full bg-gradient-to-t from-sky-600 via-sky-400 to-cyan-300 rounded-full transition-all duration-75"
            style={{
              height: `${throttle}%`,
              position: 'absolute',
              bottom: 0
            }}
          />
        </div>

        {/* Custom Visual Thumb Indicator */}
        <div
          className="absolute w-9 h-5 rounded-md bg-sky-400 border-2 border-white shadow-[0_0_12px_rgba(56,189,248,0.8)] pointer-events-none transition-all duration-75 z-10 flex items-center justify-center"
          style={{
            bottom: `calc(${throttle}% - 10px)`
          }}
        >
          <div className="w-4 h-[2px] bg-slate-900/60 rounded-full" />
        </div>

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
