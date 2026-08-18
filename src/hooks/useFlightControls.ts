import { useEffect, useState, useCallback, useRef } from 'react';
import { CameraMode, ControlInputs, FlapStage } from '../types/flight';

interface UseFlightControlsProps {
  onCameraToggle?: () => void;
  onReset?: () => void;
  onMuteToggle?: () => void;
  onHelpToggle?: () => void;
}

export function useFlightControls({
  onCameraToggle,
  onReset,
  onMuteToggle,
  onHelpToggle
}: UseFlightControlsProps = {}) {
  // Always start at 0% throttle at game start
  const [throttle, setThrottleState] = useState<number>(0);
  const [flapStage, setFlapStageState] = useState<FlapStage>(0);
  const [isBraking, setIsBrakingState] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');

  // Real-time references for 60 FPS RAF reads
  const throttleRef = useRef<number>(0);
  const flapStageRef = useRef<FlapStage>(0);
  const isBrakingRef = useRef<boolean>(false);
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const setThrottle = useCallback((val: number | ((prev: number) => number)) => {
    setThrottleState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      const clamped = Math.max(0, Math.min(100, Math.round(next)));
      throttleRef.current = clamped;
      return clamped;
    });
  }, []);

  const setFlapStage = useCallback((stage: FlapStage) => {
    flapStageRef.current = stage;
    setFlapStageState(stage);
  }, []);

  const setIsBraking = useCallback((braking: boolean) => {
    isBrakingRef.current = braking;
    setIsBrakingState(braking);
  }, []);

  const cycleCamera = useCallback(() => {
    setCameraMode((prev) => {
      if (prev === 'chase') return 'cockpit';
      if (prev === 'cockpit') return 'free';
      return 'chase';
    });
    if (onCameraToggle) onCameraToggle();
  }, [onCameraToggle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      keysPressed.current[e.code] = true;

      switch (e.code) {
        case 'Digit1':
          setFlapStage(0);
          break;
        case 'Digit2':
          setFlapStage(1);
          break;
        case 'Digit3':
          setFlapStage(2);
          break;
        case 'Space':
          setIsBraking(true);
          e.preventDefault();
          break;
        case 'KeyC':
          cycleCamera();
          break;
        case 'KeyR':
          setThrottle(0);
          if (onReset) onReset();
          break;
        case 'KeyM':
          if (onMuteToggle) onMuteToggle();
          break;
        case 'KeyH':
          if (onHelpToggle) onHelpToggle();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;

      if (e.code === 'Space') {
        setIsBraking(false);
      }
    };

    // Continuous throttle adjustment while holding Shift or Ctrl
    const interval = setInterval(() => {
      if (keysPressed.current['ShiftLeft'] || keysPressed.current['ShiftRight'] || keysPressed.current['Equal']) {
        setThrottle((t) => t + 2.5);
      }
      if (keysPressed.current['ControlLeft'] || keysPressed.current['ControlRight'] || keysPressed.current['Minus']) {
        setThrottle((t) => t - 2.5);
      }
    }, 25);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(interval);
    };
  }, [cycleCamera, onReset, onMuteToggle, onHelpToggle, setFlapStage, setIsBraking, setThrottle]);

  // Calculate normalized input axes in real time
  const getInputs = useCallback((): ControlInputs => {
    const keys = keysPressed.current;
    
    // Inverted flight controls convention:
    // S / Down Arrow: Pull stick back -> Pitch UP / Takeoff (+1.0)
    // W / Up Arrow: Push stick forward -> Pitch DOWN / Dive (-1.0)
    let pitch = 0;
    if (keys['KeyS'] || keys['ArrowDown']) pitch += 1.0;
    if (keys['KeyW'] || keys['ArrowUp']) pitch -= 1.0;

    // Roll: D / ArrowRight = Roll Right (+1), A / ArrowLeft = Roll Left (-1)
    let roll = 0;
    if (keys['KeyD'] || keys['ArrowRight']) roll += 1.0;
    if (keys['KeyA'] || keys['ArrowLeft']) roll -= 1.0;

    // Yaw: E = Yaw Right (+1), Q = Yaw Left (-1)
    let yaw = 0;
    if (keys['KeyE']) yaw += 1.0;
    if (keys['KeyQ']) yaw -= 1.0;

    // Coordinated bank turning
    if (yaw === 0 && Math.abs(roll) > 0.1) {
      yaw = roll * 0.35;
    }

    return {
      pitch,
      roll,
      yaw,
      throttle: throttleRef.current,
      flapStage: flapStageRef.current,
      brakes: isBrakingRef.current || !!keys['Space']
    };
  }, []);

  return {
    throttle,
    setThrottle,
    flapStage,
    setFlapStage,
    isBraking,
    setIsBraking,
    cameraMode,
    setCameraMode,
    cycleCamera,
    getInputs
  };
}
