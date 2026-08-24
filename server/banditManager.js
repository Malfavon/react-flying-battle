/**
 * Server-Side AI Bandit Bot Manager (Node.js)
 * Simulates a synchronized 3D dogfighting Bandit Bot across all connected pilots on Socket.io.
 */

const BOT_ID = 'bot-bandit-01';
const BOT_CALLSIGN = 'BANDIT-01';

const MOUNTAIN_HAZARDS = [
  { position: [450, 0, 650], radius: 260, height: 190 },
  { position: [-650, 0, 450], radius: 200, height: 230 },
  { position: [950, 0, 150], radius: 120, height: 160 },
  { position: [-450, 0, -1300], radius: 320, height: 270 }
];

export function initBanditManager(io, players) {
  const bot = {
    id: BOT_ID,
    callsign: BOT_CALLSIGN,
    isBot: true,
    color: '#0f172a',
    accentColor: '#ef4444',
    wingColor: '#1e293b',
    position: [0, 200, -1000],
    quaternion: [0, 1, 0, 0], // Heading South
    rotEuler: { x: 0, y: Math.PI, z: 0 },
    velocity: [0, 0, 45],
    forwardSpeed: 45,
    throttle: 70,
    flapStage: 0,
    rollInput: 0,
    pitchInput: 0,
    yawInput: 0,
    isGrounded: false,
    isCrashed: false,
    crashReason: null,
    health: 100,
    maxHealth: 100,
    lastUpdated: Date.now()
  };

  let isBursting = false;
  let burstShotsFired = 0;
  let lastShotTime = 0;
  let lastBurstStartTime = 0;
  let wingGunSide = 0;
  let respawnTimeout = null;

  // BFM Combat tracking variables
  let recentDamageAccumulator = 0;
  let lastDamageTime = 0;
  let lastEvasionEndTime = 0;
  let evasionStateTimer = 0;
  let reversalStateTimer = 0;
  let evasionRollSign = 1;

  // Register bot in players map
  players.set(BOT_ID, bot);

  function respawnBot() {
    bot.isCrashed = false;
    bot.crashReason = null;
    bot.health = 100;
    const angle = Math.random() * Math.PI * 2;
    const radius = 960 + Math.random() * 80;
    const px = Math.sin(angle) * radius;
    const pz = -Math.cos(angle) * radius;
    const py = 190 + Math.random() * 40;
    bot.position = [px, py, pz];

    const desiredYaw = Math.atan2(-px, -pz);
    bot.rotEuler = { x: 0, y: desiredYaw, z: 0 };
    bot.quaternion = eulerToQuaternion(bot.rotEuler.x, bot.rotEuler.y, bot.rotEuler.z);
    bot.forwardSpeed = 46;
    bot.throttle = 75;
    isBursting = false;
    burstShotsFired = 0;
    recentDamageAccumulator = 0;
    evasionStateTimer = 0;
    reversalStateTimer = 0;

    io.emit('playerRespawned', {
      id: BOT_ID,
      callsign: BOT_CALLSIGN,
      position: bot.position,
      health: 100
    });
    console.log(`[Bandit] ${BOT_CALLSIGN} respawned in aerial combat zone.`);
  }

  // 30Hz Simulation Loop
  const TICK_RATE_MS = 33;
  const dt = 0.033;

  const intervalId = setInterval(() => {
    // Only simulate if at least one human player is connected
    const humanPilots = Array.from(players.values()).filter((p) => p.id !== BOT_ID && !p.isCrashed);

    if (bot.isCrashed) {
      return;
    }

    if (humanPilots.length === 0) {
      // Idle patrol orbit if no active human pilots
      updatePatrol(bot, dt);
      emitBotUpdate();
      return;
    }

    // 1. Find Closest Human Target
    let closestTarget = null;
    let closestDistSq = Infinity;

    for (let i = 0; i < humanPilots.length; i++) {
      const p = humanPilots[i];
      const dx = p.position[0] - bot.position[0];
      const dy = p.position[1] - bot.position[1];
      const dz = p.position[2] - bot.position[2];
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        closestTarget = p;
      }
    }

    if (!closestTarget) {
      updatePatrol(bot, dt);
      emitBotUpdate();
      return;
    }

    const dist = Math.sqrt(closestDistSq);
    const toTarget = [
      closestTarget.position[0] - bot.position[0],
      closestTarget.position[1] - bot.position[1],
      closestTarget.position[2] - bot.position[2]
    ];

    // 2. Terrain, Mountain, Ceiling & Horizontal Boundary Avoidance
    const distFromCenter = Math.hypot(bot.position[0], bot.position[2]);
    let emergencyClimb = false;
    let emergencyDive = false;
    let boundaryHazard = false;

    if (bot.position[1] < 50) {
      emergencyClimb = true;
    } else if (bot.position[1] > 320) {
      emergencyDive = true;
    }

    if (distFromCenter > 1100 || (dist > 800 && distFromCenter > 600)) {
      boundaryHazard = true;
    }

    for (const mtn of MOUNTAIN_HAZARDS) {
      const dx = bot.position[0] - mtn.position[0];
      const dz = bot.position[2] - mtn.position[2];
      const distXZ = Math.hypot(dx, dz);
      if (distXZ < mtn.radius + 60 && bot.position[1] < mtn.height + 40) {
        emergencyClimb = true;
        break;
      }
    }

    // 3. Guidance & Steering
    const now = Date.now();
    const forward = getForwardVector(bot.quaternion);

    if (emergencyClimb) {
      bot.throttle = 100;
      bot.pitchInput = 1.0;
      bot.rollInput = clamp(-bot.rotEuler.z * 2.0, -1, 1);
      bot.yawInput = 0;
    } else if (emergencyDive) {
      bot.throttle = 80;
      const divePitchError = -0.35 - bot.rotEuler.x;
      bot.pitchInput = clamp(divePitchError * 2.8, -1, 1);
      bot.rollInput = clamp(-bot.rotEuler.z * 2.0, -1, 1);
      bot.yawInput = 0;
    } else if (now < evasionStateTimer) {
      // 3A. Emergency Defensive Break Turn (on burst damage)
      bot.throttle = 95;
      const breakPitchError = 0.28 - bot.rotEuler.x;
      bot.pitchInput = clamp(breakPitchError * 2.8, -1, 1);
      bot.rollInput = evasionRollSign * 1.0;
      bot.yawInput = evasionRollSign * 0.4;
      if (now + 33 >= evasionStateTimer) {
        reversalStateTimer = now + 1600; // Chain directly into reversal
      }
    } else if (now < reversalStateTimer) {
      // 3B. Combat Pitchback Reversal
      bot.throttle = 90;
      const reversalPitchError = 0.42 - bot.rotEuler.x;
      bot.pitchInput = clamp(reversalPitchError * 2.8, -1, 1);
      bot.rollInput = evasionRollSign * 0.95;
      bot.yawInput = evasionRollSign * 0.3;
    } else {
      // 3C. Head-on Merge Pass Detection (only when target passes behind bot at close range)
      const dotTargetDir = (forward[0] * toTarget[0] + forward[1] * toTarget[1] + forward[2] * toTarget[2]) / Math.max(0.001, dist);
      if (dotTargetDir < -0.15 && dist < 90) {
        reversalStateTimer = now + 1400;
        evasionRollSign = Math.random() > 0.5 ? 1 : -1;
      }

      // Calculate Lead Intercept Point
      const targetSpeed = closestTarget.forwardSpeed || 0;
      const targetFwd = getForwardVector(closestTarget.quaternion || [0, 0, 0, 1]);
      const targetVel = [targetFwd[0] * targetSpeed, targetFwd[1] * targetSpeed, targetFwd[2] * targetSpeed];

      const effBulletSpeed = bot.forwardSpeed + 450;
      const leadTime = clamp(dist / effBulletSpeed, 0, 2.0);
      const leadAimPoint = [
        closestTarget.position[0] + targetVel[0] * leadTime,
        clamp(closestTarget.position[1] + targetVel[1] * leadTime, 120, 220),
        closestTarget.position[2] + targetVel[2] * leadTime
      ];

      // Steer towards lead point using pitch/yaw error calculation
      const dx = leadAimPoint[0] - bot.position[0];
      const dy = leadAimPoint[1] - bot.position[1];
      const dz = leadAimPoint[2] - bot.position[2];
      const distHoriz = Math.hypot(dx, dz);

      // Pitch control: desired elevation angle clamped to [-38°, +35°]
      const desiredPitch = clamp(Math.atan2(dy, Math.max(0.001, distHoriz)), -0.66, 0.60);
      const pitchError = desiredPitch - bot.rotEuler.x;
      const bankMagnitude = Math.abs(bot.rotEuler.z);

      // Yaw & Roll control
      const desiredYaw = Math.atan2(-dx, -dz);
      let yawError = desiredYaw - bot.rotEuler.y;
      while (yawError > Math.PI) yawError -= Math.PI * 2;
      while (yawError < -Math.PI) yawError += Math.PI * 2;

      const turnPull = Math.sin(bankMagnitude) * Math.min(1.0, Math.abs(yawError) * 1.5) * 0.55;
      bot.pitchInput = clamp(pitchError * 2.8 + turnPull, -1, 1);

      bot.rollInput = clamp(-yawError * 1.6, -1.1, 1.1);
      bot.yawInput = clamp(-yawError * 0.35, -0.4, 0.4);

      // Speed control
      if (boundaryHazard || bot.forwardSpeed < 40) bot.throttle = 95;
      else if (bot.forwardSpeed > 50) bot.throttle = 45;
      else bot.throttle = 80;

      // 4. Weapons & Gunfire Trigger (Evaluates lead gunsight aim angle)
      const aimDir = normalize([dx, dy, dz]);
      const dotAim = forward[0] * aimDir[0] + forward[1] * aimDir[1] + forward[2] * aimDir[2];
      const angleDeg = Math.acos(clamp(dotAim, -1, 1)) * (180 / Math.PI);

      if (dist >= 25 && dist <= 460 && angleDeg <= 18 && !isBursting && now - lastBurstStartTime > 1100) {
        isBursting = true;
        burstShotsFired = 0;
        lastBurstStartTime = now;
      }
    }

    if (isBursting && now - lastShotTime >= 95) {
      lastShotTime = now;
      burstShotsFired++;

      wingGunSide = wingGunSide === 0 ? 1 : 0;
      const gunX = wingGunSide === 0 ? -1.8 : 1.8;
      const muzzlePos = [
        bot.position[0] + forward[0] * 2.0 + (wingGunSide === 0 ? -1.2 : 1.2),
        bot.position[1] + forward[1] * 2.0,
        bot.position[2] + forward[2] * 2.0
      ];

      const bulletVel = [
        forward[0] * (bot.forwardSpeed + 450),
        forward[1] * (bot.forwardSpeed + 450),
        forward[2] * (bot.forwardSpeed + 450)
      ];

      const bulletId = `${BOT_ID}-${now}-${burstShotsFired}`;

      io.emit('bulletFired', {
        id: bulletId,
        shooterId: BOT_ID,
        position: muzzlePos,
        velocity: bulletVel,
        createdAt: now,
        lifetime: 2.5,
        damage: 8
      });

      if (burstShotsFired >= 5) {
        isBursting = false;
      }
    }

    // 5. Integrate Kinematics
    integrateBotPhysics(bot, dt);
    emitBotUpdate();
  }, TICK_RATE_MS);

  function emitBotUpdate() {
    bot.lastUpdated = Date.now();
    io.emit('playerMoved', {
      id: BOT_ID,
      callsign: BOT_CALLSIGN,
      color: bot.color,
      accentColor: bot.accentColor,
      wingColor: bot.wingColor,
      position: bot.position,
      quaternion: bot.quaternion,
      throttle: bot.throttle,
      flapStage: bot.flapStage,
      rollInput: bot.rollInput,
      pitchInput: bot.pitchInput,
      yawInput: bot.yawInput,
      forwardSpeed: bot.forwardSpeed,
      isGrounded: bot.isGrounded,
      isCrashed: bot.isCrashed,
      crashReason: bot.crashReason,
      health: bot.health,
      maxHealth: bot.maxHealth
    });
  }

  // Handle combat damage hit on server bot
  function handleBotDamage(shooterSocketId, damage = 8) {
    if (bot.isCrashed) return;
    const now = Date.now();

    const shooter = players.get(shooterSocketId);
    bot.health = Math.max(0, bot.health - damage);

    // Damage accumulation & BFM emergency break trigger
    if (now - lastDamageTime > 3000) {
      recentDamageAccumulator = 0;
    }
    recentDamageAccumulator += damage;
    lastDamageTime = now;

    if (recentDamageAccumulator >= 24 && now - lastEvasionEndTime > 5500) {
      evasionStateTimer = now + 1300;
      lastEvasionEndTime = now + 1300;
      recentDamageAccumulator = 0;
      evasionRollSign = Math.random() > 0.5 ? 1 : -1;
    }

    io.emit('playerDamaged', {
      targetId: BOT_ID,
      shooterId: shooterSocketId,
      shooterCallsign: shooter ? shooter.callsign : 'Unknown',
      damage,
      remainingHealth: bot.health
    });

    if (bot.health <= 0) {
      bot.isCrashed = true;
      bot.crashReason = `Shot down by ${shooter ? shooter.callsign : 'enemy pilot'}`;
      io.emit('playerCrashed', {
        id: BOT_ID,
        callsign: BOT_CALLSIGN,
        reason: bot.crashReason
      });

      // Schedule respawn after 6s
      if (respawnTimeout) clearTimeout(respawnTimeout);
      respawnTimeout = setTimeout(respawnBot, 6000);
    }
  }

  return {
    getBot: () => bot,
    handleBotDamage,
    cleanup: () => {
      clearInterval(intervalId);
      if (respawnTimeout) clearTimeout(respawnTimeout);
    }
  };
}

function updatePatrol(bot, dt) {
  bot.throttle = 60;
  bot.pitchInput = 0;
  bot.rollInput = 0.2; // Gentle orbit bank
  bot.yawInput = 0;
  integrateBotPhysics(bot, dt);
}

function integrateBotPhysics(bot, dt) {
  const authority = clamp(bot.forwardSpeed / 42.0, 0.3, 1.1);

  bot.rotEuler.x += bot.pitchInput * 0.7 * authority * dt;
  bot.rotEuler.x = clamp(bot.rotEuler.x, -1.05, 1.05);

  bot.rotEuler.z -= bot.rollInput * 1.4 * authority * dt;
  if (Math.abs(bot.rollInput) < 0.05) {
    bot.rotEuler.z = lerp(bot.rotEuler.z, 0, dt * 1.2);
  }

  const turnRate = Math.sin(-bot.rotEuler.z) * 0.9 * authority;
  bot.rotEuler.y -= (turnRate + bot.yawInput * 0.5 * authority) * dt;

  bot.quaternion = eulerToQuaternion(bot.rotEuler.x, bot.rotEuler.y, bot.rotEuler.z);

  const forward = getForwardVector(bot.quaternion);

  // Speed integration
  const targetSpeed = 20 + (bot.throttle / 100) * 45;
  bot.forwardSpeed = lerp(bot.forwardSpeed, targetSpeed, dt * 0.8);

  // Velocity & Position
  bot.velocity = [
    forward[0] * bot.forwardSpeed,
    forward[1] * bot.forwardSpeed,
    forward[2] * bot.forwardSpeed
  ];

  bot.position[0] += bot.velocity[0] * dt;
  bot.position[1] += bot.velocity[1] * dt;
  bot.position[2] += bot.velocity[2] * dt;

  if (bot.position[1] < 1.2) {
    bot.position[1] = 1.2;
  }
}

// Math Helpers
function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function lerp(a, b, t) {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function normalize(v) {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function eulerToQuaternion(pitch, yaw, roll) {
  // YXZ Euler order
  const c1 = Math.cos(yaw / 2);
  const s1 = Math.sin(yaw / 2);
  const c2 = Math.cos(pitch / 2);
  const s2 = Math.sin(pitch / 2);
  const c3 = Math.cos(roll / 2);
  const s3 = Math.sin(roll / 2);

  const x = s1 * s2 * c3 + c1 * s2 * c3;
  const y = s1 * c2 * c3 - c1 * s2 * s3;
  const z = c1 * c2 * s3 - s1 * s2 * c3;
  const w = c1 * c2 * c3 + s1 * s2 * s3;

  return [x, y, z, w];
}

function getForwardVector(q) {
  // Forward is (0, 0, -1) transformed by quaternion
  const x = q[0], y = q[1], z = q[2], w = q[3];
  return [
    -(2 * (x * z + w * y)),
    -(2 * (y * z - w * x)),
    -(1 - 2 * (x * x + y * y))
  ];
}

function worldToLocal(worldDir, q) {
  // Transform direction by inverse quaternion
  const qx = -q[0], qy = -q[1], qz = -q[2], qw = q[3];
  const x = worldDir[0], y = worldDir[1], z = worldDir[2];

  // Quaternion multiplication q_inv * v * q
  const ix = qw * x + qy * z - qz * y;
  const iy = qw * y + qz * x - qx * z;
  const iz = qw * z + qx * y - qy * x;
  const iw = -qx * x - qy * y - qz * z;

  return [
    ix * qw + iw * -qx + iy * -qz - iz * -qy,
    iy * qw + iw * -qy + iz * -qx - ix * -qz,
    iz * qw + iw * -qz + ix * -qy - iy * -qx
  ];
}
