import React from 'react'
import {
  Shield,
  Upload,
  Flame,
  BarChart3,
  BrainCircuit,
  Info,
  Radio,
  Building2
} from 'lucide-react'

interface HeaderProps {
  activeCityName: string
  presets: Array<{ id: string; name: string }>
  onSelectCity: (id: string) => void
  isConnected: boolean
  onOpenUpload: () => void
  onOpenHazards: () => void
  onOpenAnalytics: () => void
  onOpenAdvisor: () => void
  onOpenAbout: () => void
}

export const Header: React.FC<HeaderProps> = ({
  activeCityName,
  presets,
  onSelectCity,
  isConnected,
  onOpenUpload,
  onOpenHazards,
  onOpenAnalytics,
  onOpenAdvisor,
  onOpenAbout
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-xl shadow-lg shadow-cyan-900/40 text-white flex items-center justify-center">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-wider text-white">
              RESQ <span className="text-cyan-400">AI</span>
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-800/80 rounded-full tracking-widest uppercase">
              v2.0 3D Twin
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Intelligent Disaster Evacuation & Urban Safety Simulator
          </p>
        </div>
      </div>

      {/* Preset City Selector */}
      <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
        <Building2 className="w-4 h-4 text-cyan-400" />
        <span className="text-slate-400 font-medium">Scenario City:</span>
        <select
          value={presets.find((p) => p.name === activeCityName)?.id || ''}
          onChange={(e) => onSelectCity(e.target.value)}
          className="bg-transparent text-slate-100 font-semibold focus:outline-none cursor-pointer"
        >
          {presets.map((p) => (
            <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Action Buttons & Status */}
      <div className="flex items-center flex-wrap gap-2 text-xs">
        {/* Real-time Status Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium ${
            isConnected
              ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
              : 'bg-amber-950/60 border-amber-800/60 text-amber-400'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 ${isConnected ? 'animate-pulse' : ''}`} />
          <span>{isConnected ? 'Sim Engine Online' : 'Polling Sync'}</span>
        </div>

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium transition cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span>GeoJSON</span>
        </button>

        <button
          onClick={onOpenHazards}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium transition cursor-pointer"
        >
          <Flame className="w-3.5 h-3.5 text-red-400" />
          <span>Hazards</span>
        </button>

        <button
          onClick={onOpenAnalytics}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium transition cursor-pointer"
        >
          <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
          <span>Analytics</span>
        </button>

        <button
          onClick={onOpenAdvisor}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-semibold transition cursor-pointer shadow-lg shadow-cyan-950"
        >
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>AI Advisor</span>
        </button>

        <button
          onClick={onOpenAbout}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 rounded-lg transition cursor-pointer"
          title="About & Limitations"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
