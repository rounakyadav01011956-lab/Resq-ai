import React from 'react'
import {
  Users,
  ShieldCheck,
  Footprints,
  AlertOctagon,
  Hourglass,
  Clock,
  Gauge
} from 'lucide-react'
import type { SimulationMetrics } from '../types/simulation'

interface MetricsBarProps {
  metrics: SimulationMetrics
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 px-6 py-3">
      {/* 1. Population */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span>Population</span>
          <Users className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="text-xl font-bold text-white mt-1">{metrics.total_agents}</div>
        <div className="text-[10px] text-slate-500">Total Simulated</div>
      </div>

      {/* 2. Evacuated */}
      <div className="bg-slate-900/80 border border-emerald-900/50 rounded-xl p-3 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between text-emerald-400 text-xs">
          <span>Evacuated</span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-xl font-bold text-emerald-400 mt-1">
          {metrics.evacuated}{' '}
          <span className="text-xs font-normal text-emerald-500">
            ({metrics.completion_percentage}%)
          </span>
        </div>
        {/* Micro progress bar */}
        <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${metrics.completion_percentage}%` }}
          />
        </div>
      </div>

      {/* 3. Moving */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span>Moving</span>
          <Footprints className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="text-xl font-bold text-cyan-400 mt-1">{metrics.moving}</div>
        <div className="text-[10px] text-slate-500">En Route to Exits</div>
      </div>

      {/* 4. Queued at Bottleneck */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between text-amber-400 text-xs">
          <span>Bottleneck Queued</span>
          <Hourglass className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-xl font-bold text-amber-400 mt-1">{metrics.queued}</div>
        <div className="text-[10px] text-slate-500">Doorway Delays: {metrics.bottleneck_events}</div>
      </div>

      {/* 5. Trapped / Cut Off */}
      <div className="bg-slate-900/80 border border-red-900/40 rounded-xl p-3 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between text-red-400 text-xs">
          <span>Trapped</span>
          <AlertOctagon className="w-4 h-4 text-red-400" />
        </div>
        <div className="text-xl font-bold text-red-400 mt-1">{metrics.trapped}</div>
        <div className="text-[10px] text-red-400/70">No Available Route</div>
      </div>

      {/* 6. Elapsed Time */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span>Elapsed Time</span>
          <Clock className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-xl font-bold text-slate-200 mt-1">
          {metrics.elapsed_seconds.toFixed(1)} <span className="text-xs text-slate-500">sec</span>
        </div>
        <div className="text-[10px] text-slate-500">Step #{metrics.current_step}</div>
      </div>

      {/* 7. Average Evac Time */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs">
          <span>Avg Evac Time</span>
          <Gauge className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-xl font-bold text-purple-300 mt-1">
          {metrics.avg_evacuation_time_seconds.toFixed(1)}{' '}
          <span className="text-xs text-slate-500">sec</span>
        </div>
        <div className="text-[10px] text-slate-500">Per Safe Occupant</div>
      </div>
    </div>
  )
}
