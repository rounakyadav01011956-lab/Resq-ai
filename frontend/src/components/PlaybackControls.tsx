import React from 'react'
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Sparkles,
  Compass,
  Flame
} from 'lucide-react'
import type { ScenarioConfig } from '../types/simulation'

interface PlaybackControlsProps {
  isPaused: boolean
  isCompleted: boolean
  onTogglePlay: () => void
  onStep: () => void
  onReset: () => void
  config: ScenarioConfig
  onConfigChange: (newConfig: ScenarioConfig) => void
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPaused,
  isCompleted,
  onTogglePlay,
  onStep,
  onReset,
  config,
  onConfigChange
}) => {
  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
      {/* Primary Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition cursor-pointer shadow-lg ${
            isPaused || isCompleted
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/40'
              : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40'
          }`}
        >
          {isPaused || isCompleted ? (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>{isCompleted ? 'Restart' : 'Start / Resume'}</span>
            </>
          ) : (
            <>
              <Pause className="w-4 h-4 fill-white" />
              <span>Pause</span>
            </>
          )}
        </button>

        <button
          onClick={onStep}
          disabled={!isPaused && !isCompleted}
          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          title="Single Step Forward"
        >
          <SkipForward className="w-4 h-4" />
          <span>Step</span>
        </button>

        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          title="Reset Simulation State"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset</span>
        </button>
      </div>

      {/* Speed Slider */}
      <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800 px-3.5 py-2 rounded-xl text-xs">
        <span className="text-slate-400 font-medium">Speed:</span>
        <input
          type="range"
          min="0.2"
          max="4.0"
          step="0.2"
          value={config.speed_multiplier}
          onChange={(e) =>
            onConfigChange({ ...config, speed_multiplier: parseFloat(e.target.value) })
          }
          className="w-24 accent-cyan-500 cursor-pointer"
        />
        <span className="font-mono text-cyan-400 font-bold w-10 text-right">
          {config.speed_multiplier.toFixed(1)}x
        </span>
      </div>

      {/* Population Slider */}
      <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800 px-3.5 py-2 rounded-xl text-xs">
        <span className="text-slate-400 font-medium">Population:</span>
        <input
          type="range"
          min="10"
          max="250"
          step="5"
          value={config.population}
          onChange={(e) =>
            onConfigChange({ ...config, population: parseInt(e.target.value, 10) })
          }
          className="w-28 accent-cyan-500 cursor-pointer"
        />
        <span className="font-mono text-white font-bold w-8 text-right">
          {config.population}
        </span>
      </div>

      {/* Seed Input for Deterministic Scenarios */}
      <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-slate-400 font-medium">Seed:</span>
        <input
          type="number"
          min="1"
          max="99999"
          value={config.random_seed}
          onChange={(e) =>
            onConfigChange({ ...config, random_seed: parseInt(e.target.value, 10) || 1 })
          }
          className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-white font-mono text-center focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-4 text-xs text-slate-300">
        <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            checked={config.avoid_hazards}
            onChange={(e) =>
              onConfigChange({ ...config, avoid_hazards: e.target.checked })
            }
            className="rounded accent-cyan-500 cursor-pointer"
          />
          <Flame className="w-3.5 h-3.5 text-red-400" />
          <span>Avoid Hazards</span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            checked={config.allow_diagonal}
            onChange={(e) =>
              onConfigChange({ ...config, allow_diagonal: e.target.checked })
            }
            className="rounded accent-cyan-500 cursor-pointer"
          />
          <Compass className="w-3.5 h-3.5 text-blue-400" />
          <span>8-Way Diagonal</span>
        </label>
      </div>
    </div>
  )
}
