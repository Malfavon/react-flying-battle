import React, { useMemo } from 'react';
import { TargetHUDData } from '../../types/flight';

interface CombatHUDOverlayProps {
  targets: TargetHUDData[];
  primaryTarget: TargetHUDData | null;
  hitMarkerTime: number;
}

interface PositionedIndicator {
  id: string;
  callsign: string;
  distance: number;
  health: number;
  maxHealth: number;
  isPrimary: boolean;
  x: number;
  y: number;
  angleRad: number;
}

function relax1D(positions: number[], minGap: number, minBound: number, maxBound: number): number[] {
  if (positions.length <= 1) return positions;
  const res = [...positions];

  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < res.length - 1; i++) {
      const gap = res[i + 1] - res[i];
      if (gap < minGap) {
        const overlap = minGap - gap;
        res[i] -= overlap * 0.5;
        res[i + 1] += overlap * 0.5;
      }
    }
    for (let i = 0; i < res.length; i++) {
      if (res[i] < minBound) res[i] = minBound;
      if (res[i] > maxBound) res[i] = maxBound;
    }
  }
  return res;
}

export const CombatHUDOverlay: React.FC<CombatHUDOverlayProps> = ({
  targets,
  primaryTarget,
  hitMarkerTime
}) => {
  const isHitMarkerActive = performance.now() - hitMarkerTime < 220;

  // De-overlap offscreen threat badges along screen edges (only for threats <= 800m)
  const positionedIndicators = useMemo<PositionedIndicator[]>(() => {
    const rawOffScreen = targets
      .filter((t) => !t.isVisibleOnScreen && !t.isCrashed && t.distance <= 800)
      .sort((a, b) => {
        if (a.id === primaryTarget?.id) return -1;
        if (b.id === primaryTarget?.id) return 1;
        return a.distance - b.distance;
      })
      .slice(0, 6); // Keep top 6 closest/urgent off-screen threats within 800m

    if (rawOffScreen.length === 0) return [];

    // Group into 4 screen edges: left, right, top, bottom
    const leftGroup: { target: TargetHUDData; idx: number }[] = [];
    const rightGroup: { target: TargetHUDData; idx: number }[] = [];
    const topGroup: { target: TargetHUDData; idx: number }[] = [];
    const bottomGroup: { target: TargetHUDData; idx: number }[] = [];

    rawOffScreen.forEach((t, idx) => {
      const cosA = Math.cos(t.edgeAngleRad);
      const sinA = Math.sin(t.edgeAngleRad);

      if (Math.abs(cosA) >= Math.abs(sinA)) {
        if (cosA < 0) leftGroup.push({ target: t, idx });
        else rightGroup.push({ target: t, idx });
      } else {
        if (sinA < 0) topGroup.push({ target: t, idx });
        else bottomGroup.push({ target: t, idx });
      }
    });

    const result: PositionedIndicator[] = new Array(rawOffScreen.length);

    // 1. Relax Left Edge (vertical separation)
    if (leftGroup.length > 0) {
      leftGroup.sort((a, b) => a.target.edgeY - b.target.edgeY);
      const yCoords = leftGroup.map((g) => g.target.edgeY);
      const relaxedY = relax1D(yCoords, 50, 70, window.innerHeight - 70);
      leftGroup.forEach((g, i) => {
        result[g.idx] = {
          id: g.target.id,
          callsign: g.target.callsign,
          distance: g.target.distance,
          health: g.target.health,
          maxHealth: g.target.maxHealth || 100,
          isPrimary: g.target.id === primaryTarget?.id,
          x: g.target.edgeX,
          y: relaxedY[i],
          angleRad: g.target.edgeAngleRad
        };
      });
    }

    // 2. Relax Right Edge (vertical separation)
    if (rightGroup.length > 0) {
      rightGroup.sort((a, b) => a.target.edgeY - b.target.edgeY);
      const yCoords = rightGroup.map((g) => g.target.edgeY);
      const relaxedY = relax1D(yCoords, 50, 70, window.innerHeight - 70);
      rightGroup.forEach((g, i) => {
        result[g.idx] = {
          id: g.target.id,
          callsign: g.target.callsign,
          distance: g.target.distance,
          health: g.target.health,
          maxHealth: g.target.maxHealth || 100,
          isPrimary: g.target.id === primaryTarget?.id,
          x: g.target.edgeX,
          y: relaxedY[i],
          angleRad: g.target.edgeAngleRad
        };
      });
    }

    // 3. Relax Top Edge (horizontal separation)
    if (topGroup.length > 0) {
      topGroup.sort((a, b) => a.target.edgeX - b.target.edgeX);
      const xCoords = topGroup.map((g) => g.target.edgeX);
      const relaxedX = relax1D(xCoords, 110, 80, window.innerWidth - 80);
      topGroup.forEach((g, i) => {
        result[g.idx] = {
          id: g.target.id,
          callsign: g.target.callsign,
          distance: g.target.distance,
          health: g.target.health,
          maxHealth: g.target.maxHealth || 100,
          isPrimary: g.target.id === primaryTarget?.id,
          x: relaxedX[i],
          y: g.target.edgeY,
          angleRad: g.target.edgeAngleRad
        };
      });
    }

    // 4. Relax Bottom Edge (horizontal separation)
    if (bottomGroup.length > 0) {
      bottomGroup.sort((a, b) => a.target.edgeX - b.target.edgeX);
      const xCoords = bottomGroup.map((g) => g.target.edgeX);
      const relaxedX = relax1D(xCoords, 110, 80, window.innerWidth - 80);
      bottomGroup.forEach((g, i) => {
        result[g.idx] = {
          id: g.target.id,
          callsign: g.target.callsign,
          distance: g.target.distance,
          health: g.target.health,
          maxHealth: g.target.maxHealth || 100,
          isPrimary: g.target.id === primaryTarget?.id,
          x: relaxedX[i],
          y: g.target.edgeY,
          angleRad: g.target.edgeAngleRad
        };
      });
    }

    return result.filter(Boolean);
  }, [targets, primaryTarget]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-10 font-mono">
      {/* ========================================================================= */}
      {/* 1. OFF-SCREEN THREAT INDICATORS WITH MINI HEALTH BAR (<= 800m)             */}
      {/* ========================================================================= */}
      {positionedIndicators.map((t) => {
        const hpPct = Math.max(0, Math.min(100, (t.health / (t.maxHealth || 100)) * 100));

        return (
          <div
            key={`offscreen-${t.id}`}
            className="absolute transition-all duration-75"
            style={{
              left: `${t.x}px`,
              top: `${t.y}px`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div
              className="flex items-center gap-2 bg-slate-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border shadow-xl transition-all"
              style={{
                borderColor: t.isPrimary ? '#f59e0b' : '#ef4444',
                boxShadow: t.isPrimary
                  ? '0 0 16px rgba(245,158,11,0.6)'
                  : '0 0 12px rgba(239,68,68,0.45)'
              }}
            >
              {/* Rotating Directional Chevron Arrow */}
              <div
                className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0"
                style={{
                  transform: `rotate(${t.angleRad}rad)`
                }}
              >
                <svg
                  viewBox="0 0 16 16"
                  className={`w-full h-full ${
                    t.isPrimary ? 'text-amber-400' : 'text-red-400'
                  } fill-current`}
                >
                  <polygon points="2,2 14,8 2,14 5,8" />
                </svg>
              </div>

              {/* Target Callsign, Distance & Mini Health Bar */}
              <div className="flex flex-col text-[10px] leading-tight gap-1 min-w-[70px]">
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className={`font-bold tracking-tight ${
                      t.isPrimary ? 'text-amber-300' : 'text-red-300'
                    }`}
                  >
                    {t.callsign}
                  </span>
                  <span className="text-slate-200 font-mono font-semibold text-[9px]">{t.distance}m</span>
                </div>

                {/* Off-screen Mini Health Bar */}
                <div className="w-full bg-slate-900/90 rounded-full h-1.5 border border-slate-700/80 overflow-hidden shadow">
                  <div
                    className={`h-full rounded-full transition-all duration-150 ${
                      hpPct > 50
                        ? 'bg-emerald-400'
                        : hpPct > 25
                        ? 'bg-amber-400'
                        : 'bg-red-500 animate-pulse'
                    }`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* ========================================================================= */}
      {/* 2. ON-SCREEN ENEMY OVERHEAD PROMINENT HEALTH BAR & CALLSIGN (<= 800m)      */}
      {/* ========================================================================= */}
      {targets.map((t) => {
        if (!t.isVisibleOnScreen || t.isCrashed || t.distance > 800) return null;
        const isPrimary = primaryTarget?.id === t.id;
        const healthPct = Math.max(0, Math.min(100, (t.health / (t.maxHealth || 100)) * 100));
        const accent = t.accentColor || '#ef4444';

        return (
          <div
            key={`onscreen-${t.id}`}
            className="absolute transition-all duration-75 pointer-events-none -translate-x-1/2 -translate-y-full"
            style={{
              left: `${t.screenX}px`,
              top: `${t.screenY - 36}px`
            }}
          >
            <div className="flex flex-col items-center gap-1 whitespace-nowrap drop-shadow-2xl font-mono">
              {/* Callsign Header Pill */}
              <div
                className="px-2.5 py-0.5 rounded-lg text-[12px] font-bold text-white shadow-xl border flex items-center gap-1.5 backdrop-blur-md"
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.92)',
                  borderColor: isPrimary ? '#f59e0b' : accent,
                  boxShadow: isPrimary ? '0 0 16px rgba(245,158,11,0.7)' : `0 0 12px ${accent}66`
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full animate-pulse shadow-sm"
                  style={{
                    backgroundColor: isPrimary ? '#f59e0b' : accent,
                    boxShadow: `0 0 8px ${isPrimary ? '#f59e0b' : accent}`
                  }}
                />
                <span className={isPrimary ? 'text-amber-300 tracking-wide' : 'text-white tracking-wide'}>
                  {t.callsign}
                </span>
              </div>

              {/* Prominent High-Visibility Health Bar */}
              <div className="w-28 bg-slate-950/95 rounded-full h-2.5 border border-slate-600/90 overflow-hidden shadow-2xl p-[1px]">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    healthPct > 50
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                      : healthPct > 25
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]'
                      : 'bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_14px_rgba(239,68,68,1)] animate-pulse'
                  }`}
                  style={{ width: `${healthPct}%` }}
                />
              </div>

              {/* Distance & Numerical HP Status Tag */}
              <div className="text-[10px] font-bold text-slate-200 bg-slate-950/90 px-2 py-0.5 rounded-md border border-slate-700/80 shadow-lg flex items-center gap-1.5 backdrop-blur-md">
                <span className="text-slate-300 font-mono">{t.distance}m</span>
                <span className="text-slate-500">•</span>
                <span
                  className={
                    healthPct > 50
                      ? 'text-emerald-400 font-bold'
                      : healthPct > 25
                      ? 'text-amber-400 font-bold'
                      : 'text-red-400 font-bold animate-pulse'
                  }
                >
                  {t.health}/100 HP
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* ========================================================================= */}
      {/* 3. DYNAMIC SCREEN HITMARKER 'X'                                           */}
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
