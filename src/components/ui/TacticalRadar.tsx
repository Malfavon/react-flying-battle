import React from 'react';
import { TargetHUDData } from '../../types/flight';

interface TacticalRadarProps {
  targets: TargetHUDData[];
  primaryTarget: TargetHUDData | null;
  playerYawDeg: number;
}

export const TacticalRadar: React.FC<TacticalRadarProps> = ({
  targets,
  primaryTarget,
  playerYawDeg
}) => {
  // Center is (52, 52), radius is 44px
  const size = 104;
  const center = size / 2;
  const radius = 44;

  // North marker on compass ring (heading 0° in world, so relative to player yaw it is at -playerYawDeg)
  const northAngleRad = THREE_to_RAD(-playerYawDeg);
  const northX = center + Math.sin(northAngleRad) * (radius + 2);
  const northY = center - Math.cos(northAngleRad) * (radius + 2);

  return (
    <div className="relative w-[104px] h-[104px] rounded-full bg-slate-950/75 backdrop-blur-md border border-sky-500/40 shadow-xl overflow-hidden pointer-events-auto select-none">
      {/* Radar Background Grid & Range Rings */}
      <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
        {/* Outer Ring (1000m) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(56, 189, 248, 0.25)"
          strokeWidth="1"
        />
        {/* Mid Ring (500m) */}
        <circle
          cx={center}
          cy={center}
          r={radius * 0.5}
          fill="none"
          stroke="rgba(56, 189, 248, 0.2)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />

        {/* Crosshair Axes */}
        <line
          x1={center}
          y1={6}
          x2={center}
          y2={size - 6}
          stroke="rgba(56, 189, 248, 0.18)"
          strokeWidth="1"
        />
        <line
          x1={6}
          y1={center}
          x2={size - 6}
          y2={center}
          stroke="rgba(56, 189, 248, 0.18)"
          strokeWidth="1"
        />

        {/* Forward Scan Cone Angle */}
        <path
          d={`M ${center} ${center} L ${center - 24} 6 L ${center + 24} 6 Z`}
          fill="rgba(56, 189, 248, 0.05)"
        />

        {/* North Indicator Pip */}
        <circle cx={northX} cy={northY} r="2.5" fill="#ef4444" />
        <text
          x={northX}
          y={northY - 4}
          textAnchor="middle"
          fill="#ef4444"
          fontSize="7"
          fontWeight="bold"
          fontFamily="monospace"
        >
          N
        </text>

        {/* Player Ownship Icon in Center (Always pointing UP) */}
        <polygon
          points={`${center},${center - 6} ${center - 4},${center + 4} ${center},${center + 2} ${center + 4},${center + 4}`}
          fill="#38bdf8"
        />

        {/* Enemy Aircraft Blips */}
        {targets.map((t) => {
          const isPrimary = primaryTarget?.id === t.id;
          const blipX = center + t.radarX * radius;
          const blipY = center - t.radarY * radius; // Invert Y so +Y is forward (top)

          const color = isPrimary ? '#f59e0b' : '#ef4444';

          return (
            <g key={t.id} className="transition-all duration-75">
              {/* Primary Lock Pulse Ring */}
              {isPrimary && (
                <circle
                  cx={blipX}
                  cy={blipY}
                  r="6"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.2"
                  className="animate-ping"
                />
              )}

              {/* Target Symbol based on relative altitude */}
              {t.altitudeDiffMeters > 30 ? (
                // ▲ Target is ABOVE player
                <polygon
                  points={`${blipX},${blipY - 4} ${blipX - 3.5},${blipY + 3} ${blipX + 3.5},${blipY + 3}`}
                  fill={color}
                  stroke="#000"
                  strokeWidth="0.5"
                />
              ) : t.altitudeDiffMeters < -30 ? (
                // ▼ Target is BELOW player
                <polygon
                  points={`${blipX},${blipY + 4} ${blipX - 3.5},${blipY - 3} ${blipX + 3.5},${blipY - 3}`}
                  fill={color}
                  stroke="#000"
                  strokeWidth="0.5"
                />
              ) : (
                // ■ Target is LEVEL
                <rect
                  x={blipX - 3}
                  y={blipY - 3}
                  width="6"
                  height="6"
                  fill={color}
                  stroke="#000"
                  strokeWidth="0.5"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Radar Label & Target Count */}
      <div className="absolute bottom-1 left-0 right-0 flex items-center justify-center pointer-events-none">
        <span className="text-[7px] font-mono text-sky-400/80 font-bold tracking-tighter bg-slate-950/80 px-1 rounded border border-sky-500/20">
          RDR {targets.length > 0 ? `(${targets.length})` : 'CLR'}
        </span>
      </div>
    </div>
  );
};

function THREE_to_RAD(deg: number): number {
  return (deg * Math.PI) / 180;
}
