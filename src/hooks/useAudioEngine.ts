import { useEffect, useRef, useState, useCallback } from 'react';

export function useAudioEngine() {
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAudioReady, setIsAudioReady] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Engine Sound Nodes
  const engineOscRef = useRef<OscillatorNode | null>(null);
  const engineSubOscRef = useRef<OscillatorNode | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);
  const engineFilterRef = useRef<BiquadFilterNode | null>(null);

  // Wind Rush Nodes
  const windNoiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const windGainRef = useRef<GainNode | null>(null);
  const windFilterRef = useRef<BiquadFilterNode | null>(null);

  // Stall Alarm Nodes
  const stallOscRef = useRef<OscillatorNode | null>(null);
  const stallGainRef = useRef<GainNode | null>(null);
  const stallIntervalRef = useRef<number | null>(null);

  // Master Gain
  const masterGainRef = useRef<GainNode | null>(null);

  // Initialize Web Audio graph
  const initAudio = useCallback(() => {
    if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtxClass();
      audioCtxRef.current = ctx;

      // Master Gain
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.6;
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      // 1. Engine Oscillator & Sub-oscillator
      const engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;

      const engineSub = ctx.createOscillator();
      engineSub.type = 'triangle';
      engineSub.frequency.value = 27.5;

      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 350;
      engineFilter.Q.value = 2.0;

      const engineGain = ctx.createGain();
      engineGain.gain.value = 0.15;

      engineOsc.connect(engineFilter);
      engineSub.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(masterGain);

      engineOsc.start();
      engineSub.start();

      engineOscRef.current = engineOsc;
      engineSubOscRef.current = engineSub;
      engineGainRef.current = engineGain;
      engineFilterRef.current = engineFilter;

      // 2. Wind Rushing (Synthesized White Noise)
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const windSource = ctx.createBufferSource();
      windSource.buffer = noiseBuffer;
      windSource.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 500;
      windFilter.Q.value = 1.0;

      const windGain = ctx.createGain();
      windGain.gain.value = 0.0;

      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(masterGain);

      windSource.start();

      windNoiseNodeRef.current = windSource;
      windFilterRef.current = windFilter;
      windGainRef.current = windGain;

      // 3. Stall Alarm Oscillator
      const stallOsc = ctx.createOscillator();
      stallOsc.type = 'square';
      stallOsc.frequency.value = 750;

      const stallGain = ctx.createGain();
      stallGain.gain.value = 0.0;

      stallOsc.connect(stallGain);
      stallGain.connect(masterGain);
      stallOsc.start();

      stallOscRef.current = stallOsc;
      stallGainRef.current = stallGain;

      setIsAudioReady(true);
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
    }
  }, []);

  // Update telemetry audio parameters
  const updateAudio = useCallback((
    throttle: number, // 0-100
    airspeedKnots: number,
    isStalling: boolean,
    isCrashed: boolean,
    isGrounded: boolean
  ) => {
    if (!audioCtxRef.current || audioCtxRef.current.state !== 'running' || isMuted) {
      return;
    }

    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    if (isCrashed) {
      if (engineGainRef.current) engineGainRef.current.gain.setTargetAtTime(0, now, 0.1);
      if (windGainRef.current) windGainRef.current.gain.setTargetAtTime(0, now, 0.1);
      if (stallGainRef.current) stallGainRef.current.gain.setTargetAtTime(0, now, 0.1);
      return;
    }

    // Engine Pitch & Filter scaling with throttle
    const throttleRatio = Math.max(0, Math.min(1, throttle / 100));
    const engineFreq = 50 + throttleRatio * 150; // 50Hz at idle to 200Hz at max
    const filterFreq = 250 + throttleRatio * 750;
    const engineVol = 0.1 + throttleRatio * 0.25;

    if (engineOscRef.current) {
      engineOscRef.current.frequency.setTargetAtTime(engineFreq, now, 0.05);
    }
    if (engineSubOscRef.current) {
      engineSubOscRef.current.frequency.setTargetAtTime(engineFreq * 0.5, now, 0.05);
    }
    if (engineFilterRef.current) {
      engineFilterRef.current.frequency.setTargetAtTime(filterFreq, now, 0.05);
    }
    if (engineGainRef.current) {
      engineGainRef.current.gain.setTargetAtTime(engineVol, now, 0.05);
    }

    // Wind Rush scaling with airspeed
    const speedRatio = Math.max(0, Math.min(1, airspeedKnots / 120));
    const windVol = Math.pow(speedRatio, 1.5) * 0.25;
    const windCenterFreq = 300 + speedRatio * 900;

    if (windGainRef.current) {
      windGainRef.current.gain.setTargetAtTime(windVol, now, 0.1);
    }
    if (windFilterRef.current) {
      windFilterRef.current.frequency.setTargetAtTime(windCenterFreq, now, 0.1);
    }

    // Stall Warning Alarm
    if (stallGainRef.current && !isGrounded && isStalling) {
      // Pulse stall alarm
      const pulseTime = Math.sin(now * 12);
      const alarmVol = pulseTime > 0 ? 0.2 : 0.0;
      stallGainRef.current.gain.setTargetAtTime(alarmVol, now, 0.02);
    } else if (stallGainRef.current) {
      stallGainRef.current.gain.setTargetAtTime(0, now, 0.05);
    }
  }, [isMuted]);

  // Touchdown tire squeak effect
  const playTouchdownSfx = useCallback(() => {
    if (!audioCtxRef.current || isMuted || audioCtxRef.current.state !== 'running') return;
    try {
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(800, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      if (masterGainRef.current) gain.connect(masterGainRef.current);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // ignore
    }
  }, [isMuted]);

  // Crash Explosion SFX
  const playCrashSfx = useCallback(() => {
    if (!audioCtxRef.current || isMuted || audioCtxRef.current.state !== 'running') return;
    try {
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      // Low frequency boom
      const boom = ctx.createOscillator();
      boom.type = 'triangle';
      boom.frequency.setValueAtTime(160, now);
      boom.frequency.exponentialRampToValueAtTime(30, now + 0.8);

      const boomGain = ctx.createGain();
      boomGain.gain.setValueAtTime(0.8, now);
      boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      boom.connect(boomGain);
      if (masterGainRef.current) boomGain.connect(masterGainRef.current);

      boom.start(now);
      boom.stop(now + 1.0);
    } catch {
      // ignore
    }
  }, [isMuted]);

  // Gunfire SFX (Crisp machine gun / laser tracer)
  const playShootSfx = useCallback(() => {
    if (!audioCtxRef.current || isMuted || audioCtxRef.current.state !== 'running') return;
    try {
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      // Laser / Gunshot body oscillator
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.07);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.07);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      if (masterGainRef.current) gain.connect(masterGainRef.current);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // ignore
    }
  }, [isMuted]);

  // Hit Marker Ding SFX (Confirming shot hit enemy aircraft)
  const playHitMarkerSfx = useCallback(() => {
    if (!audioCtxRef.current || isMuted || audioCtxRef.current.state !== 'running') return;
    try {
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, now); // High A6 note
      osc.frequency.exponentialRampToValueAtTime(2200, now + 0.1);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      if (masterGainRef.current) gain.connect(masterGainRef.current);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // ignore
    }
  }, [isMuted]);

  // Damage Impact SFX (Local aircraft taking damage)
  const playDamageSfx = useCallback(() => {
    if (!audioCtxRef.current || isMuted || audioCtxRef.current.state !== 'running') return;
    try {
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      // Heavy metallic thud
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      if (masterGainRef.current) gain.connect(masterGainRef.current);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {
      // ignore
    }
  }, [isMuted]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (masterGainRef.current && audioCtxRef.current) {
        masterGainRef.current.gain.setTargetAtTime(next ? 0 : 0.6, audioCtxRef.current.currentTime, 0.05);
      }
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stallIntervalRef.current) clearInterval(stallIntervalRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  return {
    initAudio,
    updateAudio,
    playTouchdownSfx,
    playCrashSfx,
    playShootSfx,
    playHitMarkerSfx,
    playDamageSfx,
    isMuted,
    toggleMute,
    isAudioReady
  };
}
