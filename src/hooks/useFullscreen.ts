import { useState, useEffect, useCallback } from 'react';

export function useFullscreen() {
  const isSupported = typeof document !== 'undefined' && !!(
    document.fullscreenEnabled ||
    (document as any).webkitFullscreenEnabled ||
    (document as any).mozFullScreenEnabled ||
    (document as any).msFullscreenEnabled ||
    document.documentElement?.requestFullscreen ||
    (document.documentElement as any)?.webkitRequestFullscreen
  );

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
          // Ignore orientation lock failures
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
    if (!isSupported) {
      // On iOS Safari where Fullscreen API is unavailable, scroll down to collapse toolbar
      window.scrollTo(0, 1);
      return;
    }
    if (getIsFullscreen()) {
      await exitFullscreen();
    } else {
      await enterFullscreen(element);
    }
  }, [isSupported, getIsFullscreen, enterFullscreen, exitFullscreen]);

  return {
    isSupported,
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen
  };
}
