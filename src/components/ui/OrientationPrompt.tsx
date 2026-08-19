import React, { useState, useEffect } from 'react';
import { Smartphone, Maximize2, X } from 'lucide-react';

interface OrientationPromptProps {
  onEnterFullscreen?: () => void;
}

export const OrientationPrompt: React.FC<OrientationPromptProps> = ({ onEnterFullscreen }) => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches;

      // Only check on touch devices or small screens
      if (isTouch && window.innerHeight > window.innerWidth) {
        setIsPortrait(true);
      } else {
        setIsPortrait(false);
        setDismissed(false); // Reset when rotated back to landscape
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 pointer-events-auto select-none animate-in fade-in duration-200">
      <div className="bg-slate-900/90 border border-sky-500/40 rounded-2xl max-w-sm w-full p-6 text-center shadow-[0_0_40px_rgba(56,189,248,0.3)] relative">
        {/* Close / Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Dismiss prompt"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Rotating Phone Animation */}
        <div className="flex items-center justify-center my-4">
          <div className="relative p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shadow-inner">
            <Smartphone className="w-12 h-12 transform rotate-90 animate-pulse text-sky-400" />
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-lg font-bold font-mono text-white tracking-wider mb-2">
          ROTATE TO LANDSCAPE
        </h3>
        <p className="text-xs text-slate-300 font-sans leading-relaxed mb-6">
          For the optimal flight simulator controls and wide cockpit view, please rotate your device to landscape orientation.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {onEnterFullscreen && (
            <button
              onClick={() => {
                onEnterFullscreen();
                setDismissed(true);
              }}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
              <span>FULLSCREEN & FLY</span>
            </button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="w-full py-2 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono text-xs font-semibold rounded-xl border border-slate-700/60 transition-colors"
          >
            Continue in Portrait
          </button>
        </div>
      </div>
    </div>
  );
};
