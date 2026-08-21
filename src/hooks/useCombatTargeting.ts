import * as THREE from 'three';
import { RemotePlayer, TargetHUDData, TacticalRadarData } from '../types/flight';

const BULLET_SPEED = 460; // m/s
const MAX_RADAR_RANGE = 1200; // meters

export function computeCombatTargeting(
  camera: THREE.Camera,
  playerPos: THREE.Vector3,
  playerQuat: THREE.Quaternion,
  playerSpeedMs: number,
  remotePlayers: RemotePlayer[],
  viewportWidth: number,
  viewportHeight: number
): TacticalRadarData {
  if (!remotePlayers || remotePlayers.length === 0) {
    return { targets: [], primaryTarget: null };
  }

  const screenCenterX = viewportWidth / 2;
  const screenCenterY = viewportHeight / 2;

  // Player orientation vectors
  const playerForward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerQuat);
  const playerEuler = new THREE.Euler().setFromQuaternion(playerQuat, 'YXZ');
  const playerYaw = playerEuler.y;

  const hudTargets: TargetHUDData[] = [];
  let bestTarget: TargetHUDData | null = null;
  let bestScore = -Infinity; // Higher score = better primary target (angle + distance)

  const tempVec = new THREE.Vector3();
  const tempLead = new THREE.Vector3();

  for (let i = 0; i < remotePlayers.length; i++) {
    const p = remotePlayers[i];
    if (p.isCrashed) continue;

    const targetPos = new THREE.Vector3(p.position[0], p.position[1], p.position[2]);
    const toTarget = new THREE.Vector3().subVectors(targetPos, playerPos);
    const distance = toTarget.length();

    if (distance > 2500 || distance < 0.5) continue;

    // Target estimated velocity vector
    const targetQuat = new THREE.Quaternion(
      p.quaternion[0],
      p.quaternion[1],
      p.quaternion[2],
      p.quaternion[3]
    );
    const targetForward = new THREE.Vector3(0, 0, -1).applyQuaternion(targetQuat);
    const targetSpeed = Math.max(0, p.forwardSpeed || 0);
    const targetVel = targetForward.clone().multiplyScalar(targetSpeed);

    // =========================================================================
    // 1. Solve 3D Kinematic Intercept Quadratic for Lead Gunsight
    // =========================================================================
    // || D + V_t * t || = V_bullet * t
    // (V_t . V_t - V_b^2) * t^2 + 2 * (D . V_t) * t + (D . D) = 0
    const effBulletSpeed = Math.max(BULLET_SPEED, playerSpeedMs + 380);
    const a = targetVel.lengthSq() - effBulletSpeed * effBulletSpeed;
    const b = 2.0 * toTarget.dot(targetVel);
    const c = toTarget.lengthSq();

    let leadPos = targetPos.clone();
    let hasLeadSolution = false;
    let leadTime = 0;

    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const sqrtDisc = Math.sqrt(disc);
      const t1 = (-b - sqrtDisc) / (2 * a);
      const t2 = (-b + sqrtDisc) / (2 * a);

      if (t1 > 0 && t2 > 0) {
        leadTime = Math.min(t1, t2);
      } else if (t1 > 0) {
        leadTime = t1;
      } else if (t2 > 0) {
        leadTime = t2;
      }

      if (leadTime > 0 && leadTime < 3.0) {
        leadPos = targetPos.clone().addScaledVector(targetVel, leadTime);
        hasLeadSolution = true;
      }
    }

    // =========================================================================
    // 2. Project Target & Lead Positions onto Screen
    // =========================================================================
    // Target projection
    tempVec.copy(targetPos);
    tempVec.project(camera);
    const isBehindCamera = tempVec.z > 1.0;

    const screenX = (tempVec.x * 0.5 + 0.5) * viewportWidth;
    const screenY = (-tempVec.y * 0.5 + 0.5) * viewportHeight;
    const isVisibleOnScreen =
      !isBehindCamera &&
      screenX >= 24 &&
      screenX <= viewportWidth - 24 &&
      screenY >= 24 &&
      screenY <= viewportHeight - 24;

    // Lead Pip projection
    tempLead.copy(leadPos);
    tempLead.project(camera);
    const isLeadBehind = tempLead.z > 1.0;
    const leadScreenX = (tempLead.x * 0.5 + 0.5) * viewportWidth;
    const leadScreenY = (-tempLead.y * 0.5 + 0.5) * viewportHeight;

    // Check if player's crosshair (screen center) is aligned on lead pip
    const leadDistFromCenter = Math.hypot(leadScreenX - screenCenterX, leadScreenY - screenCenterY);
    const isLeadInRange = hasLeadSolution && !isLeadBehind && leadDistFromCenter < 40;

    // =========================================================================
    // 3. Screen Edge Clamping for Off-Screen Threat Indicator
    // =========================================================================
    let dirX = tempVec.x;
    let dirY = -tempVec.y;
    if (isBehindCamera) {
      dirX = -dirX;
      dirY = -dirY;
      if (Math.abs(dirX) < 0.001 && Math.abs(dirY) < 0.001) {
        dirY = 1.0; // Default downward if directly behind
      }
    }

    const edgeAngleRad = Math.atan2(dirY, dirX);
    const edgeMargin = 42;
    const boundW = (viewportWidth - edgeMargin * 2) / 2;
    const boundH = (viewportHeight - edgeMargin * 2) / 2;

    const scaleX = boundW / Math.max(0.0001, Math.abs(dirX));
    const scaleY = boundH / Math.max(0.0001, Math.abs(dirY));
    const scale = Math.min(scaleX, scaleY);

    const edgeX = screenCenterX + dirX * scale;
    const edgeY = screenCenterY + dirY * scale;

    // =========================================================================
    // 4. Tactical Radar Relative Coordinates
    // =========================================================================
    // Rotate world delta vector by -playerYaw so +Y is forward, +X is right
    const cosYaw = Math.cos(-playerYaw);
    const sinYaw = Math.sin(-playerYaw);
    const relX = toTarget.x * cosYaw - toTarget.z * sinYaw;
    const relZ = toTarget.x * sinYaw + toTarget.z * cosYaw;

    // In Three.js coords: -Z is forward. On 2D radar: +Y is forward (top), +X is right
    const radarForward = -relZ;
    const radarRight = relX;

    const radarX = THREE.MathUtils.clamp(radarRight / MAX_RADAR_RANGE, -1.0, 1.0);
    const radarY = THREE.MathUtils.clamp(radarForward / MAX_RADAR_RANGE, -1.0, 1.0);
    const altitudeDiffMeters = targetPos.y - playerPos.y;

    const hudTarget: TargetHUDData = {
      id: p.id,
      callsign: p.callsign,
      color: p.color,
      accentColor: p.accentColor,
      distance: Math.round(distance),
      health: p.health !== undefined ? p.health : 100,
      maxHealth: p.maxHealth || 100,
      isCrashed: !!p.isCrashed,
      screenX,
      screenY,
      isVisibleOnScreen,
      isBehindCamera,
      leadScreenX,
      leadScreenY,
      hasLeadSolution,
      isLeadInRange,
      leadDistance: Math.round(playerPos.distanceTo(leadPos)),
      edgeX,
      edgeY,
      edgeAngleRad,
      radarX,
      radarY,
      altitudeDiffMeters: Math.round(altitudeDiffMeters)
    };

    hudTargets.push(hudTarget);

    // Score target for primary lock (in-cone front bonus + proximity)
    const toTargetNorm = toTarget.clone().normalize();
    const dotFacing = playerForward.dot(toTargetNorm); // 1 = directly ahead, -1 = behind
    if (dotFacing > 0.1) {
      const score = dotFacing * 1000 - distance;
      if (score > bestScore) {
        bestScore = score;
        bestTarget = hudTarget;
      }
    }
  }

  // If no target in front cone, pick closest overall
  if (!bestTarget && hudTargets.length > 0) {
    let closestDist = Infinity;
    for (const t of hudTargets) {
      if (t.distance < closestDist) {
        closestDist = t.distance;
        bestTarget = t;
      }
    }
  }

  return {
    targets: hudTargets,
    primaryTarget: bestTarget
  };
}
