import React from 'react'
import { ShieldAlert, Cpu, Compass, BookOpen } from 'lucide-react'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">About ResQ AI & Scientific Methodology</h2>
              <p className="text-xs text-slate-400">
                System architecture, core assumptions, data sources, and limitations
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

        <div className="space-y-4 my-4 text-xs text-slate-300 leading-relaxed">
          {/* Section 1: Overview */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Simulation Engine Architecture</span>
            </h3>
            <p>
              <strong>ResQ AI</strong> combines 3D spatial WebGL rendering with a discrete-agent evacuation
              simulation backend. The city grid is rasterized from architectural footprints and road networks.
              Each simulated occupant computes optimal escape trajectories toward accessible assembly gates using
              an augmented <strong>A* pathfinding algorithm</strong> supporting 8-way diagonal movement with
              corner-cutting prevention and dynamic hazard avoidance.
            </p>
          </div>

          {/* Section 2: Crowd Bottlenecks */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Doorway & Intersection Bottleneck Accounting</span>
            </h3>
            <p>
              Physical space occupancy is strictly enforced: no two human agents can occupy the exact same spatial
              slot simultaneously. When multiple evacuees compete for a doorway or narrow corridor, an arbitration
              resolver moves one occupant while placing others into a queued wait state. These wait events are
              accumulated to calculate bottleneck delay hotspots and exit door saturation.
            </p>
          </div>

          {/* Section 3: Data Provenance */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-1.5">Geographic Data Handling & Coordinates</h3>
            <p>
              The platform supports both synthetic demo cities and uploaded real-world <strong>GeoJSON</strong> files.
              WGS84 longitude/latitude coordinates are projected into metric Cartesian meters using Equirectangular
              local origin projection. Polygon features are extruded into 3D building masses, LineStrings are mapped
              to traversable road graphs, and Point features with emergency tags are designated as safety assembly gates.
            </p>
          </div>

          {/* Section 4: Life Safety Disclaimer */}
          <div className="bg-red-950/40 border border-red-900/60 p-4 rounded-xl text-red-200">
            <h3 className="text-sm font-bold text-red-400 mb-1 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              <span>Regulatory & Life-Safety Disclaimer</span>
            </h3>
            <p className="text-[11px] leading-relaxed">
              ResQ AI is an academic prototype and educational disaster-scenario exploration tool developed
              for technology demonstration and hackathon evaluation. It does NOT incorporate full computational
              fluid dynamics (CFD) smoke toxic dispersion, certified psychological panic behavior, or structural
              collapse models. <strong>Do not use this software for certified emergency response planning or
              regulatory life-safety engineering compliance.</strong>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  )
}
