import http from 'http';
import { Server } from 'socket.io';

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'Flight Simulator Socket.io Server Active', players: players.size }));
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

// Color palettes for unique player liveries
const LIVERIES = [
  { name: 'Sky Blue', color: '#f8fafc', accentColor: '#0284c7', wingColor: '#f1f5f9' },
  { name: 'Crimson Fury', color: '#fef2f2', accentColor: '#dc2626', wingColor: '#fee2e2' },
  { name: 'Emerald Hawk', color: '#f0fdf4', accentColor: '#16a34a', wingColor: '#dcfce7' },
  { name: 'Amber Comet', color: '#fffbeb', accentColor: '#d97706', wingColor: '#fef3c7' },
  { name: 'Violet Falcon', color: '#faf5ff', accentColor: '#9333ea', wingColor: '#f3e8ff' },
  { name: 'Stealth Shadow', color: '#1e293b', accentColor: '#64748b', wingColor: '#0f172a' },
  { name: 'Solar Blaze', color: '#fff7ed', accentColor: '#ea580c', wingColor: '#ffedd5' },
  { name: 'Cyan Streak', color: '#ecfeff', accentColor: '#0891b2', wingColor: '#cffafe' }
];

const CALLSIGNS = [
  'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot',
  'Ghost', 'Hawk', 'Icarus', 'Jester', 'Kestrel', 'Maverick',
  'Nova', 'Osprey', 'Phoenix', 'Raven', 'Strato', 'Viper'
];

let callsignIndex = 0;
const players = new Map();

io.on('connection', (socket) => {
  const livery = LIVERIES[players.size % LIVERIES.length];
  const callsignName = CALLSIGNS[callsignIndex % CALLSIGNS.length];
  const callsignNumber = Math.floor(100 + Math.random() * 900);
  const callsign = `${callsignName}-${callsignNumber}`;
  callsignIndex++;

  const newPlayer = {
    id: socket.id,
    callsign,
    color: livery.color,
    accentColor: livery.accentColor,
    wingColor: livery.wingColor,
    position: [0, 7.2, 0],
    quaternion: [0, 0, 0, 1],
    throttle: 0,
    flapStage: 0,
    rollInput: 0,
    pitchInput: 0,
    yawInput: 0,
    forwardSpeed: 0,
    isGrounded: true,
    isCrashed: false,
    crashReason: null,
    health: 100,
    maxHealth: 100,
    lastUpdated: Date.now()
  };

  players.set(socket.id, newPlayer);

  console.log(`[+] Pilot connected: ${callsign} (ID: ${socket.id}). Total pilots: ${players.size}`);

  // Send initial setup to new pilot
  socket.emit('init', {
    self: newPlayer,
    players: Array.from(players.values()).filter((p) => p.id !== socket.id)
  });

  // Broadcast new pilot to everyone else
  socket.broadcast.emit('playerJoined', newPlayer);

  // Handle telemetry updates (~30Hz)
  socket.on('playerUpdate', (data) => {
    const player = players.get(socket.id);
    if (!player) return;

    player.position = data.position;
    player.quaternion = data.quaternion;
    player.throttle = data.throttle;
    player.flapStage = data.flapStage;
    player.rollInput = data.rollInput;
    player.pitchInput = data.pitchInput;
    player.yawInput = data.yawInput;
    player.forwardSpeed = data.forwardSpeed;
    player.isGrounded = data.isGrounded;
    player.isCrashed = data.isCrashed;
    player.crashReason = data.crashReason || null;
    if (data.health !== undefined) player.health = data.health;
    player.lastUpdated = Date.now();

    // Broadcast to other pilots
    socket.broadcast.emit('playerMoved', {
      id: socket.id,
      position: player.position,
      quaternion: player.quaternion,
      throttle: player.throttle,
      flapStage: player.flapStage,
      rollInput: player.rollInput,
      pitchInput: player.pitchInput,
      yawInput: player.yawInput,
      forwardSpeed: player.forwardSpeed,
      isGrounded: player.isGrounded,
      isCrashed: player.isCrashed,
      crashReason: player.crashReason,
      health: player.health,
      maxHealth: player.maxHealth
    });
  });

  // Handle player gunfire
  socket.on('playerShoot', (bulletData) => {
    socket.broadcast.emit('bulletFired', {
      ...bulletData,
      shooterId: socket.id
    });
  });

  // Handle bullet hit & combat damage
  socket.on('bulletHit', (hitData) => {
    const { targetId, bulletId, damage = 8 } = hitData;
    const target = players.get(targetId);
    const shooter = players.get(socket.id);
    if (!target || target.isCrashed) return;

    target.health = Math.max(0, (target.health !== undefined ? target.health : 100) - damage);
    console.log(`[Combat] ${shooter ? shooter.callsign : socket.id} hit ${target.callsign} (-${damage} HP, remaining: ${target.health} HP)`);

    io.emit('playerDamaged', {
      targetId,
      shooterId: socket.id,
      shooterCallsign: shooter ? shooter.callsign : 'Unknown',
      bulletId,
      damage,
      remainingHealth: target.health
    });

    if (target.health <= 0) {
      target.isCrashed = true;
      target.crashReason = `Shot down in dogfight by ${shooter ? shooter.callsign : 'enemy aircraft'}`;
      io.emit('playerCrashed', {
        id: targetId,
        callsign: target.callsign,
        reason: target.crashReason
      });
    }
  });

  // Handle player crash broadcast
  socket.on('playerCrash', (data) => {
    const player = players.get(socket.id);
    if (player) {
      player.isCrashed = true;
      player.crashReason = data.reason || 'Impact';
      socket.broadcast.emit('playerCrashed', {
        id: socket.id,
        callsign: player.callsign,
        reason: player.crashReason
      });
    }
  });

  // Handle player respawn
  socket.on('playerRespawn', (data) => {
    const player = players.get(socket.id);
    if (player) {
      player.isCrashed = false;
      player.crashReason = null;
      player.health = 100;
      player.position = data.position || [0, 7.2, 0];
      socket.broadcast.emit('playerRespawned', {
        id: socket.id,
        callsign: player.callsign,
        position: player.position,
        health: 100
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    players.delete(socket.id);
    console.log(`[-] Pilot disconnected: ${player ? player.callsign : socket.id}. Remaining: ${players.size}`);
    io.emit('playerLeft', { id: socket.id });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 Flight Simulator Socket.io Server`);
  console.log(`📡 Listening on: http://0.0.0.0:${PORT}`);
  console.log(`🌐 Ready for Local & LAN Multiplayer`);
  console.log(`=========================================`);
});
