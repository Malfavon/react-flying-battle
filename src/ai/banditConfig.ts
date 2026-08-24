export interface BanditProfile {
  id: string;
  callsign: string;
  name: string;
  color: string;
  accentColor: string;
  wingColor: string;
  maxHealth: number;
  maxSpeedMs: number;
  cornerSpeedMs: number;       // Optimal turn airspeed (m/s)
  stallSpeedMs: number;        // Below this speed AI struggles to turn
  maxClimbRateMs: number;
  turnAuthority: number;       // Turn agility multiplier
  aimLeadErrorJitter: number;  // Radians of simulated human aiming error
  fireRange: number;           // Max firing range in meters
  minFireRange: number;        // Minimum firing distance to prevent point-blank collision
  fireMaxAngleDeg: number;     // Cone angle in degrees within which AI will fire
  burstCadenceMs: number;      // Milliseconds between rounds in a burst (e.g. 95ms)
  burstCount: number;          // Rounds per burst
  burstCooldownMs: number;     // Milliseconds between bursts
  reactionDelayMs: number;
  attackWindowDurationMs: number;  // Duration of committed offensive pursuit (ms)
  evasionCooldownMs: number;       // Cooldown between evasive break maneuvers (ms)
  evasionDurationMs: number;       // Duration of defensive break maneuver (ms)
  damageThresholdForEvasion: number; // Damage within 3s required to trigger emergency break
  reversalDurationMs: number;      // Duration of combat pitchback reversal (ms)
}

export const BANDIT_PROFILES: Record<string, BanditProfile> = {
  alpha: {
    id: 'bandit-alpha',
    callsign: 'BANDIT-01',
    name: 'Crimson Viper',
    color: '#0f172a',          // Midnight stealth fuselage
    accentColor: '#dc2626',    // Crimson Red accents / stripes
    wingColor: '#1e293b',      // Charcoal carbon wings
    maxHealth: 100,
    maxSpeedMs: 62,            // ~120 knots top speed
    cornerSpeedMs: 44,         // ~85 knots optimal dogfight corner speed
    stallSpeedMs: 22,          // ~42 knots
    maxClimbRateMs: 25,
    turnAuthority: 1.05,
    aimLeadErrorJitter: 0.04,  // ~2.3 degrees realistic aim jitter
    fireRange: 460,
    minFireRange: 25,
    fireMaxAngleDeg: 18,
    burstCadenceMs: 90,
    burstCount: 5,
    burstCooldownMs: 1100,
    reactionDelayMs: 150,
    attackWindowDurationMs: 4000,
    evasionCooldownMs: 6500,
    evasionDurationMs: 1100,
    damageThresholdForEvasion: 24,
    reversalDurationMs: 1400
  },
  ace: {
    id: 'bandit-ace',
    callsign: 'RED-BARON',
    name: 'Scarlet Ace',
    color: '#450a0a',
    accentColor: '#ef4444',
    wingColor: '#7f1d1d',
    maxHealth: 120,
    maxSpeedMs: 68,
    cornerSpeedMs: 46,
    stallSpeedMs: 20,
    maxClimbRateMs: 28,
    turnAuthority: 1.2,
    aimLeadErrorJitter: 0.02,
    fireRange: 480,
    minFireRange: 30,
    fireMaxAngleDeg: 15,
    burstCadenceMs: 85,
    burstCount: 6,
    burstCooldownMs: 1600,
    reactionDelayMs: 120,
    attackWindowDurationMs: 4200,
    evasionCooldownMs: 5000,
    evasionDurationMs: 1200,
    damageThresholdForEvasion: 24,
    reversalDurationMs: 1500
  }
};
