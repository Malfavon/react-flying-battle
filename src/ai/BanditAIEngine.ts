import * as THREE from 'three';
import { Bullet, FlapStage, RemotePlayer } from '../types/flight';
import { BanditProfile, BANDIT_PROFILES } from './banditConfig';
import { MOUNTAIN_HAZARDS } from '../hooks/useCollision';

export type BanditAIState =
  | 'PATROL'
  | 'INTERCEPT'
  | 'LEAD_PURSUIT'
  | 'GUN_BURST'
  | 'HIGH_YOYO'
  | 'EVASIVE_BREAK'
  | 'COMBAT_REVERSAL'
  | 'TERRAIN_PULL_UP';

export interface BanditSpawnOptions {
  id?: string;
  callsign?: string;
  name?: string;
  color?: string;
  accentColor?: string;
  wingColor?: string;
  position?: [number, number, number];
  headingDeg?: number;
  speedMs?: number;
}

export class BanditAIEngine {
  public profile: BanditProfile;
  public state: BanditAIState = 'PATROL';

  // Kinematic vectors
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public quaternion: THREE.Quaternion;
  public rotEuler: THREE.Euler;

  // Aircraft control state
  public throttle: number = 65; // %
  public flapStage: FlapStage = 0;
  public rollInput: number = 0;
  public pitchInput: number = 0;
  public yawInput: number = 0;
  public forwardSpeed: number = 45; // m/s
  public isGrounded: boolean = false;
  public isCrashed: boolean = false;
  public crashReason: string | null = null;
  public health: number = 100;
  public maxHealth: number = 100;

  // Combat & Gunfire state
  public isFiring: boolean = false;
  private lastShotTime: number = 0;
  private lastBurstStartTime: number = 0;
  private burstShotsFired: number = 0;
  private isBursting: boolean = false;
  private wingGunSide: number = 0; // 0 = Left (-1.8m), 1 = Right (+1.8m)
  private respawnTime: number = 0;

  // Flight AI timers & BFM pattern tracking
  private stateTimer: number = 0;
  private evasiveRollSign: number = 1;
  private reversalRollSign: number = 1;
  private aimJitterVec: THREE.Vector3 = new THREE.Vector3();
  private lastJitterUpdate: number = 0;
  private recentDamageAccumulator: number = 0;
  private lastDamageTime: number = 0;
  private lastEvasionEndTime: number = 0;
  private attackPhaseEndTime: number = 0;

  // Aerodynamic constants (identical mass/thrust ratio to player aircraft)
  private mass: number = 700;
  private weight: number = 700 * 9.81;
  private maxThrust: number = 10500;

  constructor(profileKey: string = 'alpha', spawnOpts: BanditSpawnOptions = {}) {
    const base = BANDIT_PROFILES[profileKey] || BANDIT_PROFILES.alpha;
    this.profile = {
      ...base,
      id: spawnOpts.id || base.id,
      callsign: spawnOpts.callsign || base.callsign,
      name: spawnOpts.name || base.name,
      color: spawnOpts.color || base.color,
      accentColor: spawnOpts.accentColor || base.accentColor,
      wingColor: spawnOpts.wingColor || base.wingColor
    };
    this.health = this.profile.maxHealth;
    this.maxHealth = this.profile.maxHealth;

    const spawnPos = spawnOpts.position || [150, 190, -450];
    this.position = new THREE.Vector3(spawnPos[0], spawnPos[1], spawnPos[2]);
    this.velocity = new THREE.Vector3(0, 0, -1);
    this.rotEuler = new THREE.Euler(0, THREE.MathUtils.degToRad(spawnOpts.headingDeg ?? 180), 0, 'YXZ');
    this.quaternion = new THREE.Quaternion().setFromEuler(this.rotEuler);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
    this.forwardSpeed = spawnOpts.speedMs ?? 46;
    this.velocity.copy(forward.multiplyScalar(this.forwardSpeed));
  }

  /**
   * Reset / Respawn bandit in air at tactical engagement vantage point
   */
  public respawn(playerPos?: THREE.Vector3, playerHeadingDeg?: number) {
    this.isCrashed = false;
    this.crashReason = null;
    this.health = this.profile.maxHealth;
    this.state = 'INTERCEPT';
    this.throttle = 75;
    this.forwardSpeed = 48;
    this.burstShotsFired = 0;
    this.isBursting = false;

    // Always spawn from the outer limits of the map (Radius: 960m - 1040m)
    const angle = playerHeadingDeg !== undefined
      ? THREE.MathUtils.degToRad(playerHeadingDeg)
      : Math.random() * Math.PI * 2;
    const perimeterRadius = 960 + Math.random() * 80;
    const px = Math.sin(angle) * perimeterRadius;
    const pz = -Math.cos(angle) * perimeterRadius;
    const py = 190 + Math.random() * 40; // 190m - 230m altitude

    this.position.set(px, py, pz);

    // Aim toward player or arena center
    const target = playerPos ? playerPos.clone() : new THREE.Vector3(0, 180, 0);
    const toTarget = new THREE.Vector3().subVectors(target, this.position).normalize();
    const yaw = Math.atan2(-toTarget.x, -toTarget.z);

    this.rotEuler.set(0, yaw, 0, 'YXZ');
    this.quaternion.setFromEuler(this.rotEuler);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
    this.velocity.copy(forward.multiplyScalar(this.forwardSpeed));
  }

  /**
   * Apply combat damage to bandit with rolling 3s accumulator & threshold check
   */
  public applyDamage(amount: number, reason: string = 'Shot down in dogfight!'): number {
    if (this.isCrashed) return 0;
    const now = performance.now();

    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.isCrashed = true;
      this.crashReason = reason;
      this.velocity.set(0, 0, 0);
      this.respawnTime = now + 6000; // 6 seconds respawn cycle
    } else {
      // Accumulate damage in rolling 3s window
      if (now - this.lastDamageTime > 3000) {
        this.recentDamageAccumulator = 0;
      }
      this.recentDamageAccumulator += amount;
      this.lastDamageTime = now;

      // Trigger emergency defensive break ONLY on taking substantial burst damage (>= 24 HP) and off cooldown
      if (
        this.recentDamageAccumulator >= this.profile.damageThresholdForEvasion &&
        now - this.lastEvasionEndTime > this.profile.evasionCooldownMs &&
        this.state !== 'TERRAIN_PULL_UP'
      ) {
        this.state = 'EVASIVE_BREAK';
        this.stateTimer = now + this.profile.evasionDurationMs;
        this.recentDamageAccumulator = 0;
        this.lastEvasionEndTime = now + this.profile.evasionDurationMs;
        this.evasiveRollSign = Math.random() > 0.5 ? 1 : -1;
      }
    }
    return this.health;
  }

  /**
   * Main AI Update Tick called on every animation / physics frame
   */
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    playerVel: THREE.Vector3,
    _playerQuat: THREE.Quaternion,
    isPlayerCrashed: boolean
  ): {
    firedBullets: Bullet[];
    muzzleFlashPos: [number, number, number] | null;
    muzzleFlashQuat: THREE.Quaternion | null;
  } {
    const dt = Math.min(delta, 0.05);
    const now = performance.now();
    const firedBullets: Bullet[] = [];
    let muzzleFlashPos: [number, number, number] | null = null;
    let muzzleFlashQuat: THREE.Quaternion | null = null;

    // 1. Handle Crashed State & Respawn Timer
    if (this.isCrashed) {
      if (now >= this.respawnTime && this.respawnTime > 0) {
        this.respawn(playerPos);
      }
      return { firedBullets, muzzleFlashPos, muzzleFlashQuat };
    }

    // Aircraft orientation vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);

    // Vector to Player
    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
    const distanceToPlayer = toPlayer.length();

    // 2. High-Priority Terrain, Mountain Hazard, Ceiling & World Horizontal Boundary Checks
    const altitude = this.position.y;
    const distFromCenter = Math.hypot(this.position.x, this.position.z);

    let isTerrainHazard = false;
    let isCeilingHazard = false;
    let isBoundaryHazard = false;

    // A. Ocean Hard-Deck Floor (< 50m) & Combat Ceiling (> 320m)
    if (altitude < 50) {
      isTerrainHazard = true;
    } else if (altitude > 320) {
      isCeilingHazard = true;
    }

    // B. Horizontal Map Arena Boundary Limit (Radius > 1100m or separation > 800m)
    if (distFromCenter > 1100 || (distanceToPlayer > 800 && distFromCenter > 600)) {
      isBoundaryHazard = true;
    }

    // C. Proactive Mountain Cylinder Hazard Proximity Check
    for (const mtn of MOUNTAIN_HAZARDS) {
      const dx = this.position.x - mtn.position[0];
      const dz = this.position.z - mtn.position[2];
      const distXZ = Math.hypot(dx, dz);
      const safeRadius = mtn.radius + 70; // 70m safety buffer
      const safeHeight = mtn.height + 40;

      if (distXZ < safeRadius && altitude < safeHeight) {
        isTerrainHazard = true;
        break;
      }
    }

    // 3. Finite State Machine Evaluation (Tactical 3-Phase BFM Stance System)
    if (isTerrainHazard) {
      this.state = 'TERRAIN_PULL_UP';
    } else if (isCeilingHazard) {
      this.state = 'HIGH_YOYO'; // Use diving recovery
    } else if (isBoundaryHazard) {
      // Out of bounds or too far: force high-speed turn-around back into the combat arena
      this.state = 'INTERCEPT';
    } else if (isPlayerCrashed) {
      this.state = 'PATROL';
    } else if (this.state === 'TERRAIN_PULL_UP' && altitude > 85) {
      this.state = 'INTERCEPT';
    } else if (this.state === 'EVASIVE_BREAK') {
      if (now > this.stateTimer) {
        // Defensive break completed -> Flow directly into combat reversal pitchback to acquire player's 6 o'clock!
        this.state = 'COMBAT_REVERSAL';
        this.stateTimer = now + this.profile.reversalDurationMs;
        this.reversalRollSign = this.evasiveRollSign;
      }
    } else if (this.state === 'COMBAT_REVERSAL') {
      if (now > this.stateTimer) {
        // Reversal completed -> Lock into aggressive committed attack window
        this.state = 'LEAD_PURSUIT';
        this.attackPhaseEndTime = now + this.profile.attackWindowDurationMs;
      }
    } else if (this.state === 'HIGH_YOYO') {
      if (now > this.stateTimer || altitude < 250) {
        this.state = 'LEAD_PURSUIT';
      }
    } else {
      // Normal Tactical Combat & Attack Pursuit
      // Head-On Merge Pass: only when target actually passes behind the bandit at close range
      const isTargetBehind = forward.dot(toPlayer) < -0.15;
      if (isTargetBehind && distanceToPlayer < 90) {
        this.state = 'COMBAT_REVERSAL';
        this.stateTimer = now + this.profile.reversalDurationMs;
        this.reversalRollSign = Math.random() > 0.5 ? 1 : -1;
      } else if (distanceToPlayer > 480) {
        this.state = 'INTERCEPT';
      } else {
        this.state = 'LEAD_PURSUIT';
      }
    }

    // 4. Calculate Desired Aim Point and Steering Targets based on State
    let targetAimPoint = playerPos.clone();

    // Solve 3D Predictive Quadratic Lead Intercept
    const effBulletSpeed = this.forwardSpeed + 450;
    const a = playerVel.lengthSq() - effBulletSpeed * effBulletSpeed;
    const b = 2.0 * toPlayer.dot(playerVel);
    const c = toPlayer.lengthSq();
    const disc = b * b - 4 * a * c;

    let leadTime = 0;
    if (disc >= 0) {
      const sqrtDisc = Math.sqrt(disc);
      const t1 = (-b - sqrtDisc) / (2 * a);
      const t2 = (-b + sqrtDisc) / (2 * a);
      if (t1 > 0 && t2 > 0) leadTime = Math.min(t1, t2);
      else if (t1 > 0) leadTime = t1;
      else if (t2 > 0) leadTime = t2;
    }

    if (leadTime > 0 && leadTime < 2.5) {
      targetAimPoint = playerPos.clone().addScaledVector(playerVel, leadTime);
    }

    // Update periodic human aim jitter
    if (now - this.lastJitterUpdate > 250) {
      this.lastJitterUpdate = now;
      const jitterMag = this.profile.aimLeadErrorJitter * distanceToPlayer;
      this.aimJitterVec.set(
        (Math.random() - 0.5) * jitterMag,
        (Math.random() - 0.5) * jitterMag * 0.6,
        (Math.random() - 0.5) * jitterMag
      );
    }
    targetAimPoint.add(this.aimJitterVec);

    // 5. Execute State-Specific Flight Guidance & Steering Controls
    switch (this.state) {
      case 'TERRAIN_PULL_UP': {
        // Maximum pitch up to gain altitude, wings level, full throttle
        this.throttle = 100;
        this.pitchInput = 1.0; // S / Pull UP
        this.rollInput = THREE.MathUtils.clamp(-this.rotEuler.z * 2.5, -1, 1); // Level wings
        this.yawInput = 0;
        break;
      }

      case 'PATROL': {
        // Gentle cruising orbit around island center at 200m
        const centerPos = new THREE.Vector3(0, 200, 0);
        const toCenter = new THREE.Vector3().subVectors(centerPos, this.position);
        this.throttle = 55;
        this.steerTowardsVector(toCenter, dt);
        break;
      }

      case 'INTERCEPT': {
        // Fast approach vector toward target / arena
        this.throttle = isBoundaryHazard ? 95 : 85;
        const targetPoint = (distFromCenter > 1150 && distanceToPlayer > 1000)
          ? new THREE.Vector3(0, 180, 0)
          : targetAimPoint.clone();

        // Clamp target altitude safely within [120m, 220m]
        targetPoint.y = THREE.MathUtils.clamp(targetPoint.y + (isBoundaryHazard ? 0 : 25), 120, 220);
        const toAim = new THREE.Vector3().subVectors(targetPoint, this.position);
        this.steerTowardsVector(toAim, dt);
        break;
      }

      case 'HIGH_YOYO': {
        if (altitude > 270) {
          // If above standard arena altitude, actively dive back down toward the dogfight
          this.throttle = 80;
          const divePitchError = -0.35 - this.rotEuler.x; // Target -20° dive
          this.pitchInput = THREE.MathUtils.clamp(divePitchError * 2.8, -1.0, 1.0);
          this.rollInput = THREE.MathUtils.clamp(-this.rotEuler.z * 2.0, -1.0, 1.0);
        } else {
          // Brief 0.75s displacement climb (+20°) and bank to avoid target overshoot
          this.throttle = 55;
          const climbPitchError = 0.35 - this.rotEuler.x; // Target +20°
          this.pitchInput = THREE.MathUtils.clamp(climbPitchError * 2.8, -1.0, 1.0);
          this.rollInput = this.evasiveRollSign * 0.55;
        }
        this.yawInput = 0;
        break;
      }

      case 'EVASIVE_BREAK': {
        // High-G rolling break turn to spoil attacker's gunsight solution
        this.throttle = 95;
        const breakPitchError = 0.28 - this.rotEuler.x;
        this.pitchInput = THREE.MathUtils.clamp(breakPitchError * 2.8, -1.0, 1.0);
        this.rollInput = this.evasiveRollSign * 1.0;
        this.yawInput = this.evasiveRollSign * 0.4;
        break;
      }

      case 'COMBAT_REVERSAL': {
        // Tactical BFM Pitchback / Vertical Slice Reversal to swing nose 180° onto target
        this.throttle = 90;
        const reversalPitchTarget = 0.42; // +24° climb
        const pitchError = reversalPitchTarget - this.rotEuler.x;
        this.pitchInput = THREE.MathUtils.clamp(pitchError * 2.8, -1.0, 1.0);
        this.rollInput = this.reversalRollSign * 0.95;
        this.yawInput = this.reversalRollSign * 0.3;
        break;
      }

      case 'LEAD_PURSUIT':
      default: {
        // Proportional navigation turn toward lead gunsight aim point
        // During committed attack phase, power up aggressively to close distance
        const isCommittedAttack = now < this.attackPhaseEndTime;
        if (isCommittedAttack || this.forwardSpeed < this.profile.cornerSpeedMs - 4) {
          this.throttle = 95;
        } else if (this.forwardSpeed > this.profile.cornerSpeedMs + 8) {
          this.throttle = 50; // Idle back if too fast
        } else {
          this.throttle = 80; // Cruise maintain
        }

        const toAim = new THREE.Vector3().subVectors(targetAimPoint, this.position);
        this.steerTowardsVector(toAim, dt);
        break;
      }
    }

    // 6. Gunfire Decision & Twin-Cannon Discharge (Evaluates lead gunsight alignment)
    const toAimLead = new THREE.Vector3().subVectors(targetAimPoint, this.position).normalize();
    const angleToAimDeg = THREE.MathUtils.radToDeg(forward.angleTo(toAimLead));
    const inGunRange =
      distanceToPlayer >= this.profile.minFireRange &&
      distanceToPlayer <= this.profile.fireRange &&
      angleToAimDeg <= this.profile.fireMaxAngleDeg &&
      !isTerrainHazard &&
      !isPlayerCrashed &&
      this.state !== 'EVASIVE_BREAK';

    if (inGunRange && !this.isBursting && now - this.lastBurstStartTime > this.profile.burstCooldownMs) {
      this.isBursting = true;
      this.burstShotsFired = 0;
      this.lastBurstStartTime = now;
      this.state = 'GUN_BURST';
    }

    if (this.isBursting) {
      if (now - this.lastShotTime >= this.profile.burstCadenceMs) {
        this.lastShotTime = now;
        this.burstShotsFired++;

        // Alternate Left / Right wing cannons
        this.wingGunSide = this.wingGunSide === 0 ? 1 : 0;
        const gunX = this.wingGunSide === 0 ? -1.8 : 1.8;
        const wingGunOffset = new THREE.Vector3(gunX, 0.05, -0.8).applyQuaternion(this.quaternion);
        const muzzlePos = this.position.clone().add(wingGunOffset);

        // Ballistic bullet velocity
        const bulletVel = forward.clone().multiplyScalar(this.forwardSpeed + 450);
        const bulletId = `${this.profile.id}-${now}-${this.burstShotsFired}`;

        const newBullet: Bullet = {
          id: bulletId,
          shooterId: this.profile.id,
          position: [muzzlePos.x, muzzlePos.y, muzzlePos.z],
          velocity: [bulletVel.x, bulletVel.y, bulletVel.z],
          createdAt: now,
          lifetime: 2.5,
          damage: 8
        };

        firedBullets.push(newBullet);
        muzzleFlashPos = [muzzlePos.x, muzzlePos.y, muzzlePos.z];
        muzzleFlashQuat = this.quaternion.clone();

        if (this.burstShotsFired >= this.profile.burstCount) {
          this.isBursting = false;
        }
      }
    }

    // 7. Integrate 3D Aerodynamic Flight Physics
    this.integrateFlightPhysics(dt);

    return {
      firedBullets,
      muzzleFlashPos,
      muzzleFlashQuat
    };
  }

  /**
   * Steering Controller: Robust pitch/yaw error calculation that pulls elevator through banked turns
   */
  private steerTowardsVector(targetVec: THREE.Vector3, dt: number) {
    const dx = targetVec.x;
    const dy = targetVec.y;
    const dz = targetVec.z;
    const distHoriz = Math.hypot(dx, dz);

    // 1. Pitch Control: Compute desired world elevation angle, clamped safely to [-38°, +35°]
    const desiredPitchWorld = Math.atan2(dy, Math.max(0.001, distHoriz));
    const clampedDesiredPitch = THREE.MathUtils.clamp(desiredPitchWorld, -0.66, 0.60);

    // 2. Yaw & Roll Control: Compute desired heading angle
    const desiredYawWorld = Math.atan2(-dx, -dz);
    let yawError = desiredYawWorld - this.rotEuler.y;
    while (yawError > Math.PI) yawError -= Math.PI * 2;
    while (yawError < -Math.PI) yawError += Math.PI * 2;

    // Elevator pushes or pulls based on pitch error + elevator G-pull in banked turns
    const pitchError = clampedDesiredPitch - this.rotEuler.x;
    const bankMagnitude = Math.abs(this.rotEuler.z);
    const turnPull = Math.sin(bankMagnitude) * Math.min(1.0, Math.abs(yawError) * 1.5) * 0.55;
    this.pitchInput = THREE.MathUtils.clamp(pitchError * 2.8 + turnPull, -1.0, 1.0);

    // Coordinated Bank Angle: bank wings to steer heading toward target
    const targetRoll = THREE.MathUtils.clamp(-yawError * 1.8, -1.1, 1.1);
    this.rollInput = THREE.MathUtils.lerp(this.rollInput, targetRoll, dt * 8.0);
    this.yawInput = THREE.MathUtils.clamp(-yawError * 0.35, -0.4, 0.4);
  }

  /**
   * 3D Aerodynamic Physics Integration (Lift, Drag, Thrust, Gravity, Banking turn rates)
   */
  private integrateFlightPhysics(dt: number) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);

    // Airspeed and control authority
    this.forwardSpeed = Math.max(0, this.velocity.dot(forward));
    const totalSpeed = this.velocity.length();
    const controlAuthority = THREE.MathUtils.clamp(this.forwardSpeed / 42.0, 0.25, 1.1) * this.profile.turnAuthority;

    // 1. Rotation Updates
    // Pitch: S / Down (+pitch) tilts nose UP (rotEuler.x increases)
    this.rotEuler.x += this.pitchInput * 0.75 * controlAuthority * dt;
    this.rotEuler.x = THREE.MathUtils.clamp(this.rotEuler.x, -Math.PI / 2.8, Math.PI / 2.8);

    // Roll: A (left) tilts left (rotEuler.z > 0), D (right) tilts right (rotEuler.z < 0)
    this.rotEuler.z -= this.rollInput * 1.45 * controlAuthority * dt;
    if (Math.abs(this.rollInput) < 0.05) {
      this.rotEuler.z = THREE.MathUtils.lerp(this.rotEuler.z, 0, dt * 1.2);
    }

    // Coordinated banking turn yaw
    const bankAngle = -this.rotEuler.z;
    const turnRate = (this.forwardSpeed > 10.0) ? (Math.sin(bankAngle) * 0.92 * controlAuthority) : 0;
    this.rotEuler.y -= (turnRate + this.yawInput * 0.55 * controlAuthority) * dt;

    this.quaternion.setFromEuler(this.rotEuler);

    // 2. Aerodynamic Forces Accumulator
    // A. Engine Thrust
    const thrustMag = (this.throttle / 100) * this.maxThrust;
    const thrustForce = forward.clone().multiplyScalar(thrustMag);

    // B. Aerodynamic Drag
    const dynamicPressure = 0.5 * 1.225 * Math.pow(this.forwardSpeed, 2);
    const inducedDrag = Math.abs(this.rotEuler.x) * 0.14;
    const dragMagnitude = dynamicPressure * 16.0 * (0.12 + inducedDrag);
    const dragForce = totalSpeed > 0.01
      ? this.velocity.clone().normalize().negate().multiplyScalar(dragMagnitude)
      : new THREE.Vector3();

    // C. Gravity
    const gravityForce = new THREE.Vector3(0, -this.weight, 0);

    // D. Aerodynamic Lift
    let liftForce = new THREE.Vector3();
    if (this.forwardSpeed > 8.0) {
      const speedFactor = Math.min(1.5, Math.pow(this.forwardSpeed / 45.0, 2));
      const bankFactor = Math.max(0, Math.cos(this.rotEuler.z));
      const pitchBonus = THREE.MathUtils.clamp(this.rotEuler.x * 0.5, -0.3, 0.6);
      const totalLiftMag = this.weight * speedFactor * bankFactor * (1.0 + pitchBonus + this.pitchInput * 0.35);
      liftForce = up.clone().multiplyScalar(Math.max(0, totalLiftMag));
    }

    // Acceleration & Velocity Integration
    const forces = new THREE.Vector3().add(thrustForce).add(liftForce).add(dragForce).add(gravityForce);
    this.velocity.addScaledVector(forces.divideScalar(this.mass), dt);

    // Aerodynamic convergence (velocity vector naturally aligns with aircraft nose)
    if (totalSpeed > 3.0) {
      const horizForward = new THREE.Vector3(forward.x, 0, forward.z).normalize();
      const currentHorizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      const targetHorizVel = horizForward.multiplyScalar(currentHorizSpeed);

      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetHorizVel.x, dt * 2.8);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetHorizVel.z, dt * 2.8);

      const targetPitchVelY = forward.y * totalSpeed;
      this.velocity.y = THREE.MathUtils.lerp(this.velocity.y, targetPitchVelY, dt * 2.0);
    }

    // Position integration
    this.position.addScaledVector(this.velocity, dt);

    // Floor clamp
    if (this.position.y < 1.2) {
      this.position.y = 1.2;
      this.velocity.y = Math.max(0, this.velocity.y);
    }
  }

  /**
   * Convert Bandit state into RemotePlayer format for unified 3D rendering and Radar systems
   */
  public toRemotePlayer(): RemotePlayer {
    return {
      id: this.profile.id,
      callsign: this.profile.callsign,
      color: this.profile.color,
      accentColor: this.profile.accentColor,
      wingColor: this.profile.wingColor,
      position: [this.position.x, this.position.y, this.position.z],
      quaternion: [this.quaternion.x, this.quaternion.y, this.quaternion.z, this.quaternion.w],
      throttle: this.throttle,
      flapStage: this.flapStage,
      rollInput: this.rollInput,
      pitchInput: this.pitchInput,
      yawInput: this.yawInput,
      forwardSpeed: this.forwardSpeed,
      isGrounded: this.isGrounded,
      isCrashed: this.isCrashed,
      crashReason: this.crashReason,
      health: this.health,
      maxHealth: this.maxHealth
    };
  }
}
