import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Compass, Move, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

interface VirtualJoystickProps {
  onAxesChange: (axes: { pitch?: number; roll?: number; yaw?: number }) => void;
  className?: string;
}

const JOYSTICK_RADIUS = 55; // Maximum travel radius in pixels
const DEADZONE = 0.08; // 8% deadzone to avoid micro-jitter

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onAxesChange,
  className = ''
}) => {
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState<boolean>(false);
  const [invertedPitch, setInvertedPitch] = useState<boolean>(false); // false = Standard flight stick (pull back = climb)
  const [rudderActive, setRudderActive] = useState<'left' | 'right' | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const centerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update center position whenever container bounds change
  const updateCenter = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      centerPos.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }
  }, []);

  useEffect(() => {
    updateCenter();
    window.addEventListener('resize', updateCenter);
    window.addEventListener('scroll', updateCenter);
    return () => {
      window.removeEventListener('resize', updateCenter);
      window.removeEventListener('scroll', updateCenter);
    };
  }, [updateCenter]);

  // Handle pointer down on joystick area
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Capture pointer
    activePointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsActive(true);
    updateCenter();

    handlePointerMove(e);
  };

  // Process joystick displacement
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;

    const rawDeltaX = e.clientX - centerPos.current.x;
    const rawDeltaY = e.clientY - centerPos.current.y;
    const distance = Math.hypot(rawDeltaX, rawDeltaY);

    let clampedX = rawDeltaX;
    let clampedY = rawDeltaY;

    if (distance > JOYSTICK_RADIUS) {
      const angle = Math.atan2(rawDeltaY, rawDeltaX);
      clampedX = Math.cos(angle) * JOYSTICK_RADIUS;
      clampedY = Math.sin(angle) * JOYSTICK_RADIUS;
    }

    setKnobPos({ x: clampedX, y: clampedY });

    // Calculate normalized outputs (-1.0 to +1.0)
    let normRoll = clampedX / JOYSTICK_RADIUS;
    let normY = clampedY / JOYSTICK_RADIUS;

    // Apply deadzone
    if (Math.abs(normRoll) < DEADZONE) normRoll = 0;
    else normRoll = (normRoll - Math.sign(normRoll) * DEADZONE) / (1 - DEADZONE);

    if (Math.abs(normY) < DEADZONE) normY = 0;
    else normY = (normY - Math.sign(normY) * DEADZONE) / (1 - DEADZONE);

    // Standard Flight Stick:
    // Pull stick down (+normY on screen) = Pitch UP (+1.0 climb)
    // Push stick up (-normY on screen) = Pitch DOWN (-1.0 dive)
    // If invertedPitch is toggled true, flip sign
    const normPitch = invertedPitch ? -normY : normY;

    onAxesChange({
      pitch: Math.max(-1, Math.min(1, normPitch)),
      roll: Math.max(-1, Math.min(1, normRoll))
    });
  };

  // Reset joystick to neutral on release
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current === e.pointerId) {
      activePointerId.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture might already be released
      }
      setIsActive(false);
      setKnobPos({ x: 0, y: 0 });
      onAxesChange({ pitch: 0, roll: 0 });
    }
  };

  // Rudder touch handlers
  const handleRudderStart = (direction: 'left' | 'right') => {
    setRudderActive(direction);
    onAxesChange({ yaw: direction === 'left' ? -1 : 1 });
  };

  const handleRudderEnd = () => {
    setRudderActive(null);
    onAxesChange({ yaw: 0 });
  };

  // Display percentage readout
  const pitchPercent = Math.round((invertedPitch ? -knobPos.y : knobPos.y) / JOYSTICK_RADIUS * 100);
  const rollPercent = Math.round((knobPos.x / JOYSTICK_RADIUS) * 100);

  return (
    <div className={`flex flex-col items-center select-none pointer-events-auto ${className}`}>
      {/* Flight Stick Header & Status */}
      <div className="flex items-center justify-between w-full px-2 mb-1 text-[11px] font-mono text-sky-400">
        <div className="flex items-center gap-1">
          <Move className="w-3.5 h-3.5" />
          <span className="font-semibold tracking-wider">FLIGHT STICK</span>
        </div>
        <button
          onClick={() => setInvertedPitch((prev) => !prev)}
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 border border-sky-500/20 text-slate-300 transition-colors"
          title="Toggle Pitch Inversion"
        >
          <ArrowUpDown className="w-2.5 h-2.5" />
          <span>{invertedPitch ? 'INV PITCH' : 'STD STICK'}</span>
        </button>
      </div>

      {/* Main Joystick Pad Area */}
      <div className="relative flex items-center justify-center p-2">
        {/* Outer Boundary & Visual Backdrop */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative w-36 h-36 rounded-full border-2 transition-colors duration-150 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none ${
            isActive
              ? 'bg-slate-900/90 border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.4)]'
              : 'bg-slate-900/80 border-sky-500/30 hover:border-sky-400/50 shadow-xl'
          } backdrop-blur-md`}
          style={{ touchAction: 'none' }}
        >
          {/* Inner concentric guidance rings */}
          <div className="absolute w-24 h-24 rounded-full border border-dashed border-sky-500/20 pointer-events-none" />
          <div className="absolute w-12 h-12 rounded-full border border-sky-500/25 pointer-events-none" />

          {/* Crosshair Guides */}
          <div className="absolute w-full h-[1px] bg-sky-500/20 pointer-events-none" />
          <div className="absolute h-full w-[1px] bg-sky-500/20 pointer-events-none" />

          {/* Axis Markings */}
          <span className="absolute top-1 text-[9px] font-mono text-sky-400/70 font-bold pointer-events-none">
            {invertedPitch ? '▲ CLIMB' : '▲ DIVE'}
          </span>
          <span className="absolute bottom-1 text-[9px] font-mono text-sky-400/70 font-bold pointer-events-none">
            {invertedPitch ? '▼ DIVE' : '▼ CLIMB'}
          </span>
          <span className="absolute left-1.5 text-[9px] font-mono text-sky-400/70 font-bold pointer-events-none">
            ◀ L
          </span>
          <span className="absolute right-1.5 text-[9px] font-mono text-sky-400/70 font-bold pointer-events-none">
            R ▶
          </span>

          {/* Interactive Thumb Knob */}
          <div
            className={`absolute w-14 h-14 rounded-full border-2 flex items-center justify-center pointer-events-none shadow-lg transition-transform duration-75 ${
              isActive
                ? 'bg-gradient-to-br from-sky-400 to-cyan-500 border-white text-slate-950 shadow-[0_0_16px_rgba(56,189,248,0.8)] scale-105'
                : 'bg-gradient-to-br from-slate-700 to-slate-800 border-sky-400/60 text-sky-300'
            }`}
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`
            }}
          >
            <Compass className={`w-6 h-6 ${isActive ? 'animate-spin-slow' : ''}`} />
          </div>
        </div>
      </div>

      {/* Axis Readout & Rudder Pedals Bar */}
      <div className="flex items-center justify-between w-full mt-1.5 gap-2 px-1">
        {/* Left Rudder Button */}
        <button
          onPointerDown={() => handleRudderStart('left')}
          onPointerUp={handleRudderEnd}
          onPointerCancel={handleRudderEnd}
          className={`flex-1 py-1.5 rounded-lg border font-mono text-[10px] font-bold flex items-center justify-center gap-0.5 transition-all touch-none ${
            rudderActive === 'left'
              ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.6)]'
              : 'bg-slate-800/80 hover:bg-slate-700/80 border-sky-500/20 text-slate-300'
          }`}
          title="Rudder Yaw Left (Q)"
        >
          <ChevronLeft className="w-3 h-3" />
          <span>YAW L</span>
        </button>

        {/* Real-time Pitch & Roll Numerical Readout */}
        <div className="text-center font-mono text-[9px] text-slate-400 min-w-[72px]">
          <div>P: <span className={pitchPercent !== 0 ? 'text-sky-300 font-bold' : ''}>{pitchPercent > 0 ? `+${pitchPercent}` : pitchPercent}%</span></div>
          <div>R: <span className={rollPercent !== 0 ? 'text-sky-300 font-bold' : ''}>{rollPercent > 0 ? `+${rollPercent}` : rollPercent}%</span></div>
        </div>

        {/* Right Rudder Button */}
        <button
          onPointerDown={() => handleRudderStart('right')}
          onPointerUp={handleRudderEnd}
          onPointerCancel={handleRudderEnd}
          className={`flex-1 py-1.5 rounded-lg border font-mono text-[10px] font-bold flex items-center justify-center gap-0.5 transition-all touch-none ${
            rudderActive === 'right'
              ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.6)]'
              : 'bg-slate-800/80 hover:bg-slate-700/80 border-sky-500/20 text-slate-300'
          }`}
          title="Rudder Yaw Right (E)"
        >
          <span>YAW R</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
