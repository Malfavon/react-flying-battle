import React from 'react';
import { TargetHUDData } from '../../types/flight';

interface CombatHUDOverlayProps {
  targets: TargetHUDData[];
  primaryTarget: TargetHUDData | null;
  hitMarkerTime: number;
}

export const CombatHUDOverlay: React.FC<CombatHUDOverlayProps> = ({
  targets,
  primaryTarget,
  hitMarkerTime
}) => {
  const isHitMarkerActive = performance.now() - hitMarkerTime < 220;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-10 font-mono">
      {/* ========================================================================= */}
      {/* 1. OFF-SCREEN THREAT INDICATORS (SCREEN-EDGE CHEVRON & DISTANCE)          */}
      {/* ========================================================================= */}
      {targets.map((t) => {
        if (t.isVisibleOnScreen || t.isCrashed) return null;
        const isPrimary = primaryTarget?.id === t.id;

        return (
          <div
            key={t.id}
            className="absolute transition-all duration-75"
            style={{
              left: `${t.edgeX}px`,
              top: `${t.edgeY}px`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div
              className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md px-2 py-1 rounded-lg border shadow-xl transition-all"
              style={{
                borderColor: isPrimary ? '#f59e0b' : '#ef4444',
                boxShadow: isPrimary
                  ? '0 0 16px rgba(245,158,11,0.6)'
                  : '0 0 12px rgba(239,68,68,0.4)'
              }}
            >
              {/* Rotating Directional Chevron Arrow */}
              <div
                className="w-3.5 h-3.5 flex items-center justify-center"
                style={{
                  transform: `rotate(${t.edgeAngleRad}rad)`
                }}
              >
                <svg
                  viewBox="0 0 16 16"
                  className={`w-full h-full ${
                    isPrimary ? 'text-amber-400' : 'text-red-400'
                  } fill-current`}
                >
                  <polygon points="2,2 14,8 2,14 5,8" />
                </svg>
              </div>

              {/* Target Distance & Callsign */}
              <div className="flex flex-col text-[9px] leading-tight">
                <span
                  className={`font-bold ${
                    isPrimary ? 'text-amber-300' : 'text-red-300'
                  }`}
                >
                  {t.callsign}
                </span>
                <span className="text-white font-mono">{t.distance}m</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* ========================================================================= */}
      {/* 2. DYNAMIC SCREEN HITMARKER 'X'                                           */}
      {/* ========================================================================= */}
      {isHitMarkerActive && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 animate-ping">
          <div className="relative w-8 h-8 flex items-center justify-center">
            {/* Top-Left to Bottom-Right */}
            <div className="absolute w-5 h-0.5 bg-red-400 rotate-45 shadow-[0_0_8px_rgba(248,113,113,1)]" />
            <div className="absolute w-5 h-0.5 bg-red-400 -rotate-45 shadow-[0_0_8px_rgba(248,113,113,1)]" />
          </div>
        </div>
      )}
    </div>
  );
};
