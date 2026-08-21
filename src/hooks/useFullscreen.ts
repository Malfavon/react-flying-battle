import { useState, useEffect, useCallback } from 'react';

export function useFullscreen() {
  const getIsFullscreen = useCallback((): boolean => {
    if (typeof document === 'undefined') return false;
    const doc = document as any;
    return !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
  }, []);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(getIsFullscreen);

  const updateFullscreenState = useCallback(() => {
    setIsFullscreen(getIsFullscreen());
  }, [getIsFullscreen]);

  useEffect(() => {
    const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    events.forEach(evt => document.addEventListener(evt, updateFullscreenState));
    return () => {
      events.forEach(evt => document.removeEventListener(evt, updateFullscreenState));
    };
  }, [updateFullscreenState]);

  const enterFullscreen = useCallback(async (element?: HTMLElement) => {
    const el = (element || document.documentElement) as any;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }

      // Attempt to lock screen orientation to landscape on supported devices
      if ('orientation' in screen && (screen.orientation as any)?.lock) {
        try {
          await (screen.orientation as any).lock('landscape');
        } catch {
          // Ignore orientation lock failures (e.g. unsupported on some browsers/iOS)
        }
      }
    } catch (err) {
      console.warn('Fullscreen request failed or was cancelled:', err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    const doc = document as any;
    try {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }

      if ('orientation' in screen && (screen.orientation as any)?.unlock) {
        try {
          (screen.orientation as any).unlock();
        } catch {}
      }
    } catch (err) {
      console.warn('Exit fullscreen failed:', err);
    }
  }, []);

  const toggleFullscreen = useCallback(async (element?: HTMLElement) => {
    if (getIsFullscreen()) {
      await exitFullscreen();
    } else {
      await enterFullscreen(element);
    }
  }, [getIsFullscreen, enterFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen
  };
}
