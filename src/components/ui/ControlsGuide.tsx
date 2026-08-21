import React, { useState } from 'react';
import { X, Navigation, Disc3, Sliders, Camera, Smartphone, Keyboard, Move, Disc, Crosshair } from 'lucide-react';

interface ControlsGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ControlsGuide: React.FC<ControlsGuideProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'keyboard' | 'touch'>('keyboard');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm pointer-events-auto p-4">
      <div className="bg-slate-900/95 border border-sky-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-200 font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-lg text-sky-400">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">FLIGHT CONTROLS GUIDE</h2>
              <p className="text-xs text-slate-400">Desktop Keyboard & Mobile Touch Instructions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-4">
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
          <button
            onClick={() => setActiveTab('touch')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-mono text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
              activeTab === 'touch'
                ? 'bg-sky-600/30 border-sky-400 text-white shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile / Touch Joystick</span>
          </button>
        </div>

        {/* Keybinding Grid: Keyboard */}
        {activeTab === 'keyboard' && (
          <div className="space-y-3 text-xs font-mono">
            {/* Pitch & Direction */}
            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
              <Navigation className="w-4 h-4 text-sky-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-white font-semibold mb-1">Direction & Steering (Inverted Flight Stick)</div>
                <div className="grid grid-cols-2 gap-y-1 text-slate-300">
                  <div><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">S</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">↓</kbd> : Pitch UP (Pull back / Climb)</div>
                  <div><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">W</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">↑</kbd> : Pitch DOWN (Push / Dive)</div>
                  <div><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">A</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">←</kbd> : Roll & Turn Left</div>
                  <div><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">D</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">→</kbd> : Roll & Turn Right</div>
                  <div><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">Q</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-sky-300">E</kbd> : Rudder Yaw Left / Right</div>
                </div>
              </div>
            </div>

            {/* Throttle & Brakes */}
            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
              <Sliders className="w-4 h-4 text-emerald-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-white font-semibold mb-1">Throttle & Ground Brakes</div>
                <div className="grid grid-cols-2 gap-y-1 text-slate-300">
                  <div><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-emerald-300">Shift</kbd> : Increase Throttle</div>
                  <div><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-emerald-300">Ctrl</kbd> : Decrease Throttle</div>
                  <div className="col-span-2 mt-1">
                    <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-600 rounded text-emerald-300">Space</kbd> : Ground Wheel Brakes (hold to stop on runway)
                  </div>
                </div>
              </div>
            </div>

            {/* Flaps */}
            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
              <Disc3 className="w-4 h-4 text-amber-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-white font-semibold mb-1">3 Flap Configurations</div>
                <div className="text-slate-300 space-y-1">
                  <div><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300">1</kbd> : Flaps 0° Clean (High speed cruise)</div>
                  <div><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300">2</kbd> : Flaps 15° Takeoff / Approach (+35% lift)</div>
                  <div><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300">3</kbd> : Flaps 30° Landing (+70% lift & high drag)</div>
                </div>
              </div>
            </div>

            {/* Combat & Gunfire */}
            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/40">
              <Crosshair className="w-4 h-4 text-amber-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-amber-300 font-semibold mb-1">Dogfight Twin Guns & Lead Gunsight</div>
                <div className="text-slate-300 space-y-1">
                  <div>
                    <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300">F</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-amber-300">J</kbd> : Rapid-fire twin wing cannons (11 shots/sec)
                  </div>
                  <div className="text-[11px] text-slate-300">
                    <span className="text-emerald-400 font-bold">🎯 Predictive Lead Gunsight</span>: Align your crosshair with the dynamic lead pip in front of enemy aircraft for direct hits.
                  </div>
                  <div className="text-[11px] text-slate-300">
                    <span className="text-sky-400 font-bold">📡 Tactical Radar & Off-Screen Chevrons</span>: Track enemy aircraft 360° around you with relative altitude indicators.
                  </div>
                </div>
              </div>
            </div>

            {/* Views & Utility */}
            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
              <Camera className="w-4 h-4 text-cyan-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-white font-semibold mb-1">Camera & Quick Actions</div>
                <div className="grid grid-cols-2 gap-y-1 text-slate-300">
                  <div><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-cyan-300">C</kbd> : Chase / Cockpit Cam</div>
                  <div><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-cyan-300">R</kbd> : Quick Respawn (Resets to 0% Throttle)</div>
                  <div><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-cyan-300">M</kbd> : Mute / Unmute Audio</div>
                  <div><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-cyan-300">H</kbd> : Toggle This Guide</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Keybinding Grid: Touch / Mobile */}
        {activeTab === 'touch' && (
          <div className="space-y-3 text-xs font-mono">
            {/* Right Thumb: Virtual Joystick */}
            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
              <Move className="w-4 h-4 text-sky-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-white font-semibold mb-1">Right Thumb: Virtual Flight Stick & Gun</div>
                <div className="text-slate-300 space-y-1">
                  <div><span className="text-sky-300 font-bold">Drag Down</span> : Pitch UP (Pull back / Climb)</div>
                  <div><span className="text-sky-300 font-bold">Drag Up</span> : Pitch DOWN (Push / Dive)</div>
                  <div><span className="text-sky-300 font-bold">Drag Left / Right</span> : Roll & Coordinated Bank Turn</div>
                  <div><span className="text-amber-300 font-bold">Hold FIRE (F)</span> : Rapid-fire twin wing cannons (8 DMG per hit)</div>
                  <div><span className="text-sky-300 font-bold">YAW L / YAW R</span> : Tap Rudder Pedals for manual yaw</div>
                </div>
              </div>
            </div>

            {/* Left Thumb: Throttle & Flaps */}
            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
              <Sliders className="w-4 h-4 text-emerald-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-white font-semibold mb-1">Left Thumb: Throttle & Flaps</div>
                <div className="text-slate-300 space-y-1">
                  <div><span className="text-emerald-300 font-bold">Drag Slider</span> : Smooth engine thrust (0% - 100%)</div>
                  <div><span className="text-emerald-300 font-bold">IDLE / 50% / MAX</span> : One-tap power presets</div>
                  <div><span className="text-amber-300 font-bold">Flaps 1 / 2 / 3</span> : Tap to select flap configuration</div>
                </div>
              </div>
            </div>

            {/* Brakes & Actions */}
            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
              <Disc className="w-4 h-4 text-red-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-white font-semibold mb-1">Brakes & Touch Actions</div>
                <div className="text-slate-300 space-y-1">
                  <div><span className="text-red-300 font-bold">Hold WHEEL BRAKES</span> : Stop plane on the ground</div>
                  <div><span className="text-cyan-300 font-bold">Gamepad Icon</span> : Toggle virtual joystick on/off</div>
                  <div><span className="text-cyan-300 font-bold">Top Bar Icons</span> : Tap for Camera, Mute, Respawn & Help</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="mt-5 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl transition-colors font-mono text-sm tracking-wide shadow-lg shadow-sky-600/30"
          >
            LET'S FLY
          </button>
        </div>
      </div>
    </div>
  );
};
