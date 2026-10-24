import React, { useEffect, useState } from 'react'
import {
  BrainCircuit,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Info,
  RefreshCw
} from 'lucide-react'
import type { AIAdvisoryReport } from '../types/simulation'
import { fetchAIAdvisory } from '../services/api'

interface AIAdvisorModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AIAdvisorModal: React.FC<AIAdvisorModalProps> = ({ isOpen, onClose }) => {
  const [advisory, setAdvisory] = useState<AIAdvisoryReport | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadAdvisory()
    }
  }, [isOpen])

  const loadAdvisory = async () => {
    setLoading(true)
    try {
      const data = await fetchAIAdvisory()
      setAdvisory(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg text-white">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">ResQ AI Evacuation Safety Advisory</h2>
              <p className="text-xs text-slate-400">
                Actionable crowd routing diagnostics and bottleneck mitigation strategies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
            <span>Analyzing crowd routing vectors and doorway queuing contention...</span>
          </div>
        ) : advisory ? (
          <div className="space-y-4 my-4 text-xs">
            {/* Assessment Card */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
              <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-1">
                Executive Congestion Assessment
              </div>
              <p className="text-slate-200 font-medium leading-relaxed">
                {advisory.congestion_assessment}
              </p>
              <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                <span>Exit Load Imbalance Ratio: <strong className="text-amber-400">{advisory.exit_imbalance_ratio}x</strong></span>
                <span>Projected Queue Improvement: <strong className="text-emerald-400">+{advisory.projected_time_improvement_pct}%</strong></span>
              </div>
            </div>

            {/* Critical Bottlenecks */}
            {advisory.critical_bottlenecks.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Detected Doorway & Corridor Bottlenecks</span>
                </h4>
                <div className="space-y-2">
                  {advisory.critical_bottlenecks.map((b, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-slate-200">{b.location}</span>
                        <div className="text-slate-400 text-[11px] mt-0.5">{b.primary_cause}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-amber-400 font-mono font-bold">
                          {b.accumulated_wait_cycles} delay cycles
                        </span>
                        <div className="text-[10px] text-slate-500 font-semibold">{b.severity}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable Recommendations */}
            {advisory.recommendations.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-cyan-400" />
                  <span>Evidence-Based Tactical Recommendations</span>
                </h4>
                <div className="space-y-2.5">
                  {advisory.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/90 border border-cyan-900/40 p-3.5 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-300">{rec.category}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                          {rec.priority} PRIORITY
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{rec.finding}</p>
                      <div className="bg-slate-900/80 p-2 rounded-lg text-emerald-400 font-medium text-[11px] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Action: {rec.action} ({rec.projected_gain})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer notice */}
            <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg text-[10px] text-slate-500 leading-normal flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
              <span>{advisory.limitations_notice}</span>
            </div>
          </div>
        ) : null}

        {/* Footer Actions */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={loadAdvisory}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-evaluate</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close Advisory
          </button>
        </div>
      </div>
    </div>
  )
}
