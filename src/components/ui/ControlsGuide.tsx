import React, { useState } from 'react';
import { X, Navigation, Sliders, Smartphone, Keyboard, Move, Disc, Crosshair } from 'lucide-react';

interface ControlsGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ControlsGuide: React.FC<ControlsGuideProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'keyboard' | 'touch'>('keyboard');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm pointer-events-auto p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900/95 border border-sky-500/40 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative text-slate-200 font-sans my-auto max-h-[92dvh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-sky-500/10 border border-sky-500/30 rounded-lg text-sky-400">
              <Navigation className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">FLIGHT CONTROLS GUIDE</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">Desktop Keyboard & Mobile Touch Instructions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setActiveTab('touch')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-mono text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
              activeTab === 'touch'
                ? 'bg-sky-600/30 border-sky-400 text-white shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile / Touch Controls</span>
          </button>
          <button
            onClick={() => setActiveTab('keyboard')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-mono text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
              activeTab === 'keyboard'
                ? 'bg-sky-600/30 border-sky-400 text-white shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Keyboard (Desktop)</span>
          </button>
        </div>

        {/* Keybinding Grid: Touch / Mobile */}
        {activeTab === 'touch' && (
          <div className="space-y-2.5 text-xs font-mono">
            {/* Left Thumb: Virtual Joystick & Rudder */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
              <Move className="w-4 h-4 text-sky-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-white font-semibold mb-1">Left Thumb: Virtual Flight Stick & Rudder</div>
                <div className="text-slate-300 space-y-0.5 text-[11px]">
                  <div><span className="text-sky-300 font-bold">Drag Down</span> : Pitch UP (Pull back / Climb)</div>
                  <div><span className="text-sky-300 font-bold">Drag Up</span> : Pitch DOWN (Push / Dive)</div>
                  <div><span className="text-sky-300 font-bold">Drag Left / Right</span> : Roll & Coordinated Bank Turn</div>
                  <div><span className="text-sky-300 font-bold">YAW L / YAW R</span> : Tap Rudder Pedals below stick for yaw</div>
                </div>
              </div>
            </div>

            {/* Right Thumb: Throttle, Weapons & Flaps */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
              <Sliders className="w-4 h-4 text-emerald-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-white font-semibold mb-1">Right Thumb: Throttle, Weapons & Flaps</div>
                <div className="text-slate-300 space-y-0.5 text-[11px]">
                  <div><span className="text-emerald-300 font-bold">Drag Throttle</span> : Smooth thrust control (0% - 100%)</div>
                  <div><span className="text-emerald-300 font-bold">0% / 50% / MAX</span> : One-tap power presets</div>
                  <div><span className="text-amber-300 font-bold">Hold FIRE</span> : Rapid-fire twin cannons (8 DMG per hit)</div>
                  <div><span className="text-red-300 font-bold">Hold BRAKE</span> : Wheel brakes to stop on runway</div>
                  <div><span className="text-sky-300 font-bold">Flaps 0° / 15° / 30°</span> : Tap to toggle lift & drag</div>
                </div>
              </div>
            </div>

            {/* Top Toolbar */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
              <Disc className="w-4 h-4 text-cyan-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-white font-semibold mb-1">Top Toolbar Controls</div>
                <div className="text-slate-300 space-y-0.5 text-[11px]">
                  <div><span className="text-cyan-300 font-bold">Fullscreen Icon</span> : Toggle immersive fullscreen</div>
                  <div><span className="text-cyan-300 font-bold">Gamepad Icon</span> : Toggle virtual flight stick</div>
                  <div><span className="text-cyan-300 font-bold">Camera / Sound / Reset</span> : Switch cockpit/chase, mute, or respawn</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Keybinding Grid: Keyboard */}
        {activeTab === 'keyboard' && (
          <div className="space-y-2.5 text-xs font-mono">
            {/* Pitch & Direction */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
              <Navigation className="w-4 h-4 text-sky-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-white font-semibold mb-1">Direction & Steering (Inverted Flight Stick)</div>
                <div className="grid grid-cols-2 gap-y-1 text-slate-300 text-[11px]">
                  <div><kbd className="px-1 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">S</kbd> / <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">↓</kbd> : Pitch UP (Climb)</div>
                  <div><kbd className="px-1 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">W</kbd> / <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">↑</kbd> : Pitch DOWN (Dive)</div>
                  <div><kbd className="px-1 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">A</kbd> / <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">←</kbd> : Roll Left</div>
                  <div><kbd className="px-1 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">D</kbd> / <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">→</kbd> : Roll Right</div>
                  <div><kbd className="px-1 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">Q</kbd> / <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">E</kbd> : Rudder Yaw</div>
                </div>
              </div>
            </div>

            {/* Throttle & Brakes */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
              <Sliders className="w-4 h-4 text-emerald-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-white font-semibold mb-1">Throttle & Ground Brakes</div>
                <div className="grid grid-cols-2 gap-y-1 text-slate-300 text-[11px]">
                  <div><kbd className="px-1 py-0.5 bg-slate-800 border border-slate-600 rounded text-emerald-300">Shift</kbd> : Increase Throttle</div>
                  <div><kbd className="px-1 py-0.5 bg-slate-800 border border-slate-600 rounded text-emerald-300">Ctrl</kbd> : Decrease Throttle</div>
                  <div className="col-span-2">
                    <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-emerald-300">Space</kbd> : Ground Wheel Brakes
                  </div>
                </div>
              </div>
            </div>

            {/* Combat & Gunfire */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/40">
              <Crosshair className="w-4 h-4 text-amber-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-amber-300 font-semibold mb-1">Dogfight Guns & Combat</div>
                <div className="text-slate-300 text-[11px]">
                  <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300">F</kbd> / <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300">J</kbd> : Rapid-fire Twin Cannons (8 DMG per shot)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl transition-colors font-mono text-xs sm:text-sm tracking-wide shadow-lg shadow-sky-600/30"
          >
            LET'S FLY
          </button>
        </div>
      </div>
    </div>
  );
};
