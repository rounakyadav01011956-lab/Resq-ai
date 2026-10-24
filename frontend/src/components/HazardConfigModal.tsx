import React, { useState, useEffect, useRef } from 'react'
import {
  Flame,
  Plus,
  Trash2,
  Droplets,
  Cloud,
  Ban,
  Check,
  Zap,
  MapPin,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Crosshair
} from 'lucide-react'
import type { HazardConfig, HazardCategory, ScenarioConfig, CityModel } from '../types/simulation'

interface HazardConfigModalProps {
  isOpen: boolean
  onClose: () => void
  config: ScenarioConfig
  onSaveConfig: (newConfig: ScenarioConfig) => void
  city?: CityModel | null
}

export const HazardConfigModal: React.FC<HazardConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  city
}) => {
  const [hazards, setHazards] = useState<HazardConfig[]>(config.hazards || [])

  // Calculate city center and reasonable default radius
  const cx = city?.bounds ? Math.round((city.bounds.min_x + city.bounds.max_x) / 2) : 0
  const cz = city?.bounds ? Math.round((city.bounds.min_z + city.bounds.max_z) / 2) : 0
  const spanX = city?.bounds ? Math.round(city.bounds.max_x - city.bounds.min_x) : 200
  const spanZ = city?.bounds ? Math.round(city.bounds.max_z - city.bounds.min_z) : 200
  const defaultRadius = Math.max(16, Math.round(Math.min(spanX, spanZ) * 0.14))

  // New Hazard Form state initialized to primary hazard coordinates or city center
  const [name, setName] = useState('')
  const [category, setCategory] = useState<HazardCategory>('fire')
  const [x, setX] = useState<number>(cx)
  const [z, setZ] = useState<number>(cz)
  const [radius, setRadius] = useState<number>(defaultRadius)
  const [severity, setSeverity] = useState<number>(1.0)
  const [blocksMovement, setBlocksMovement] = useState<boolean>(true)

  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Sync state whenever modal opens or external config changes
  useEffect(() => {
    if (isOpen) {
      const currentList = config.hazards ? [...config.hazards] : []
      setHazards(currentList)
      if (currentList.length > 0) {
        setX(currentList[0].x)
        setZ(currentList[0].z)
        setRadius(currentList[0].radius)
      } else {
        setX(cx)
        setZ(cz)
        setRadius(defaultRadius)
      }
    }
  }, [isOpen, config.hazards, cx, cz, defaultRadius])

  // Draw 2D Interactive Radar
  useEffect(() => {
    if (!isOpen || !radarCanvasRef.current) return
    const canvas = radarCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    const minX = city?.bounds?.min_x ?? -150
    const maxX = city?.bounds?.max_x ?? 150
    const minZ = city?.bounds?.min_z ?? -150
    const maxZ = city?.bounds?.max_z ?? 150

    const toCanvasX = (wx: number) => ((wx - minX) / (maxX - minX)) * (w - 20) + 10
    const toCanvasY = (wz: number) => ((wz - minZ) / (maxZ - minZ)) * (h - 20) + 10

    // Background grid
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    for (let gx = 0; gx < w; gx += 20) {
      ctx.beginPath()
      ctx.moveTo(gx, 0)
      ctx.lineTo(gx, h)
      ctx.stroke()
    }
    for (let gy = 0; gy < h; gy += 20) {
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(w, gy)
      ctx.stroke()
    }

    // City Boundary Frame
    ctx.strokeStyle = '#0284c7'
    ctx.lineWidth = 2
    ctx.strokeRect(10, 10, w - 20, h - 20)

    // Center Crosshair
    const centerCanvasX = toCanvasX(cx)
    const centerCanvasY = toCanvasY(cz)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(centerCanvasX, 10)
    ctx.lineTo(centerCanvasX, h - 10)
    ctx.moveTo(10, centerCanvasY)
    ctx.lineTo(w - 10, centerCanvasY)
    ctx.stroke()
    ctx.setLineDash([])

    // Safe Exits
    city?.exits.forEach((ex) => {
      const exX = toCanvasX(ex.x)
      const exY = toCanvasY(ex.z)
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.arc(exX, exY, 4, 0, Math.PI * 2)
      ctx.fill()
    })

    // Active Hazards
    hazards.forEach((haz) => {
      if (!haz.is_active) return
      const hx = toCanvasX(haz.x)
      const hz = toCanvasY(haz.z)
      const hr = Math.max(6, (haz.radius / (maxX - minX)) * (w - 20))

      // Threat radius zone circle
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)'
      ctx.beginPath()
      ctx.arc(hx, hz, hr, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2
      ctx.stroke()

      // Center glowing pin
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(hx, hz, 3.5, 0, Math.PI * 2)
      ctx.fill()

      // Label
      ctx.fillStyle = '#fca5a5'
      ctx.font = 'bold 10px monospace'
      ctx.fillText(haz.name.substring(0, 12), hx + 6, hz - 4)
    })
  }, [isOpen, hazards, city, cx, cz])

  if (!isOpen) return null

  // Interactive Mini-Radar Click to Reposition
  const handleRadarClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = radarCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const minX = city?.bounds?.min_x ?? -150
    const maxX = city?.bounds?.max_x ?? 150
    const minZ = city?.bounds?.min_z ?? -150
    const maxZ = city?.bounds?.max_z ?? 150

    const normX = Math.max(0, Math.min(1, (clickX - 10) / (canvas.width - 20)))
    const normY = Math.max(0, Math.min(1, (clickY - 10) / (canvas.height - 20)))

    const newCoordX = Math.round(minX + normX * (maxX - minX))
    const newCoordZ = Math.round(minZ + normY * (maxZ - minZ))

    setX(newCoordX)
    setZ(newCoordZ)

    // Directly update primary hazard if exists
    if (hazards.length > 0) {
      handleUpdateHazard(hazards[0].id, { x: newCoordX, z: newCoordZ })
    }
  }

  // Update specific hazard in the active list
  const handleUpdateHazard = (id: string, updates: Partial<HazardConfig>) => {
    setHazards((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          const updated = { ...h, ...updates }
          // If updating first hazard, sync form X and Z as well
          if (prev[0]?.id === id) {
            if (updates.x !== undefined) setX(updates.x)
            if (updates.z !== undefined) setZ(updates.z)
            if (updates.radius !== undefined) setRadius(updates.radius)
          }
          return updated
        }
        return h
      })
    )
  }

  // Nudge Hazard position
  const handleNudgeHazard = (id: string, dx: number, dz: number) => {
    setHazards((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          const newX = Math.round(h.x + dx)
          const newZ = Math.round(h.z + dz)
          if (prev[0]?.id === id) {
            setX(newX)
            setZ(newZ)
          }
          return { ...h, x: newX, z: newZ }
        }
        return h
      })
    )
  }

  // Quick Preset Handlers
  const handleQuickAdd = (type: HazardCategory, offsetRatioX: number, offsetRatioZ: number, customName: string) => {
    const posX = Math.round(cx + spanX * offsetRatioX)
    const posZ = Math.round(cz + spanZ * offsetRatioZ)
    const newH: HazardConfig = {
      id: `hazard_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: customName,
      category: type,
      x: posX,
      z: posZ,
      radius: defaultRadius,
      severity: 1.0,
      is_active: true,
      blocks_movement: type !== 'smoke'
    }
    const updated = [...hazards, newH]
    setHazards(updated)
    setX(posX)
    setZ(posZ)
  }

  // Add from custom form as new hazard
  const handleAddAsNewHazard = () => {
    const newHazard: HazardConfig = {
      id: `hazard_${Date.now()}`,
      name: name.trim() || `${category.toUpperCase()} Threat Zone`,
      category,
      x: Number(x),
      z: Number(z),
      radius: Number(radius) || defaultRadius,
      severity: Number(severity) || 1.0,
      is_active: true,
      blocks_movement: blocksMovement
    }
    const updated = [...hazards, newHazard]
    setHazards(updated)
    setName('')
  }

  // Update the primary / first hazard with form coordinates
  const handleUpdatePrimaryHazard = () => {
    if (hazards.length === 0) {
      handleAddAsNewHazard()
      return
    }
    setHazards((prev) =>
      prev.map((h, idx) =>
        idx === 0
          ? {
              ...h,
              name: name.trim() || h.name,
              category,
              x: Number(x),
              z: Number(z),
              radius: Number(radius) || h.radius,
              severity: Number(severity) || h.severity,
              blocks_movement: blocksMovement,
              is_active: true
            }
          : h
      )
    )
  }

  const handleDeleteHazard = (id: string) => {
    setHazards(hazards.filter((h) => h.id !== id))
  }

  const handleToggleActive = (id: string) => {
    setHazards(
      hazards.map((h) => (h.id === id ? { ...h, is_active: !h.is_active } : h))
    )
  }

  const handleApplyChanges = () => {
    let finalHazards = [...hazards]

    // If there is a primary hazard and user typed new numbers into form, sync it
    if (finalHazards.length > 0) {
      if (finalHazards[0].x !== Number(x) || finalHazards[0].z !== Number(z)) {
        finalHazards[0] = {
          ...finalHazards[0],
          x: Number(x),
          z: Number(z),
          radius: Number(radius) || finalHazards[0].radius,
          is_active: true
        }
      }
    } else if (finalHazards.length === 0) {
      // If user deleted all and typed coordinates, create a new hazard
      finalHazards.push({
        id: `hazard_${Date.now()}`,
        name: name.trim() || 'Primary Threat Zone',
        category,
        x: Number(x),
        z: Number(z),
        radius: Number(radius) || defaultRadius,
        severity: Number(severity) || 1.0,
        is_active: true,
        blocks_movement: blocksMovement
      })
    }

    onSaveConfig({
      ...config,
      hazards: finalHazards
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-red-950 border border-red-800 rounded-xl text-red-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Emergency Hazards & Threat Relocation</h2>
              <p className="text-xs text-slate-400">
                Change X/Z coordinates, drag on mini-map, or nudge with arrows. A* pathfinding immediately reroutes around threats.
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

        {/* Map Coordinates & Bounds Context Banner */}
        <div className="mt-4 p-3 bg-slate-950/90 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-200">{city?.name || 'Active City Model'}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">
              Map Bounds: X [{city?.bounds?.min_x ?? -100}m, {city?.bounds?.max_x ?? 100}m], Z [{city?.bounds?.min_z ?? -100}m, {city?.bounds?.max_z ?? 100}m]
            </span>
          </div>
          <div className="text-[11px] text-cyan-400 font-mono bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
            Center: ({cx}m, {cz}m)
          </div>
        </div>

        {/* Interactive 2D Mini-Radar Click-to-Move */}
        <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex flex-col items-center">
            <canvas
              ref={radarCanvasRef}
              width={240}
              height={160}
              onClick={handleRadarClick}
              className="border border-slate-700/80 rounded-lg cursor-crosshair bg-slate-900/90 shadow-inner"
              title="Click anywhere to move primary fire hazard"
            />
            <div className="text-[10px] text-center text-cyan-400 font-medium mt-1 flex items-center gap-1">
              <Crosshair className="w-3 h-3" />
              <span>Click on radar to move Fire</span>
            </div>
          </div>
          <div className="flex-1 text-xs space-y-2.5">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-red-400" />
              <span>Primary Threat Coordinates</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Aap mini-map par kisi bhi point par click karke fire hazard ko uss jagah move kar sakte hain, ya niche list me direct numeric coordinates type kar sakte hain.
            </p>
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs bg-slate-900 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400">Current Position:</span>
              <span className="px-2 py-0.5 bg-red-950 text-red-300 rounded border border-red-800 font-bold">
                X: {hazards[0]?.x ?? x}m
              </span>
              <span className="px-2 py-0.5 bg-red-950 text-red-300 rounded border border-red-800 font-bold">
                Z: {hazards[0]?.z ?? z}m
              </span>
              <span className="px-2 py-0.5 bg-amber-950 text-amber-300 rounded border border-amber-800 font-bold">
                Radius: {hazards[0]?.radius ?? radius}m
              </span>
            </div>
          </div>
        </div>

        {/* Quick 1-Click Preset Threat Injectors */}
        <div className="mt-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick 1-Click Hazard Presets</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => handleQuickAdd('fire', 0, 0, 'Central Inferno Threat')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-950/80 hover:bg-red-900 border border-red-800/80 rounded-xl text-red-300 text-xs font-semibold cursor-pointer transition shadow"
            >
              <Flame className="w-4 h-4 text-red-400" />
              <span>Center Fire</span>
            </button>
            <button
              onClick={() => handleQuickAdd('smoke', 0.2, -0.2, 'North-East Toxic Smoke')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-200 text-xs font-semibold cursor-pointer transition shadow"
            >
              <Cloud className="w-4 h-4 text-slate-400" />
              <span>East Smoke</span>
            </button>
            <button
              onClick={() => handleQuickAdd('flood', -0.2, 0.2, 'South-West Flash Flood')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-950/80 hover:bg-blue-900 border border-blue-800/80 rounded-xl text-blue-300 text-xs font-semibold cursor-pointer transition shadow"
            >
              <Droplets className="w-4 h-4 text-blue-400" />
              <span>West Flood</span>
            </button>
            <button
              onClick={() => handleQuickAdd('blocked_road', 0, 0.25, 'Main Road Barricade')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-950/80 hover:bg-amber-900 border border-amber-800/80 rounded-xl text-amber-300 text-xs font-semibold cursor-pointer transition shadow"
            >
              <Ban className="w-4 h-4 text-amber-400" />
              <span>Roadblock</span>
            </button>
          </div>
        </div>

        {/* Existing Hazards List with Direct Editable X/Z Inputs & Nudge Controls */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Scenario Hazards ({hazards.length}) — Direct Editable Coordinates
            </h3>
            {hazards.length > 0 && (
              <button
                onClick={() => setHazards([])}
                className="text-[11px] text-red-400 hover:text-red-300 cursor-pointer"
              >
                Clear All Hazards
              </button>
            )}
          </div>

          {hazards.length === 0 ? (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-center text-xs text-slate-500">
              No hazards currently placed. Click a quick preset button above or type coordinates below.
            </div>
          ) : (
            hazards.map((h, index) => (
              <div
                key={h.id}
                className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-xl space-y-3 shadow"
              >
                {/* Header row: Icon, Name, Category badge, Toggle Active, Delete */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-lg ${
                        h.category === 'fire'
                          ? 'bg-red-950 text-red-400 border border-red-900'
                          : h.category === 'smoke'
                          ? 'bg-slate-800 text-slate-300'
                          : h.category === 'flood'
                          ? 'bg-blue-950 text-blue-400 border border-blue-900'
                          : 'bg-amber-950 text-amber-400 border border-amber-900'
                      }`}
                    >
                      {h.category === 'fire' && <Flame className="w-4 h-4" />}
                      {h.category === 'smoke' && <Cloud className="w-4 h-4" />}
                      {h.category === 'flood' && <Droplets className="w-4 h-4" />}
                      {h.category === 'blocked_road' && <Ban className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={h.name}
                          onChange={(e) => handleUpdateHazard(h.id, { name: e.target.value })}
                          className="font-semibold text-sm text-slate-200 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-500 focus:outline-none"
                        />
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {h.category}
                        </span>
                        {index === 0 && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                            Primary Threat
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(h.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition ${
                        h.is_active
                          ? 'bg-red-950 text-red-400 border-red-800'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      {h.is_active ? 'Active' : 'Disabled'}
                    </button>

                    <button
                      onClick={() => handleDeleteHazard(h.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg cursor-pointer"
                      title="Delete Hazard"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Direct Live Coordinate Inputs for this Hazard */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                      X Coordinate (East / West):
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={h.x}
                        onChange={(e) => handleUpdateHazard(h.id, { x: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                      />
                      <span className="text-slate-500 text-xs">m</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                      Z Coordinate (North / South):
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={h.z}
                        onChange={(e) => handleUpdateHazard(h.id, { z: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                      />
                      <span className="text-slate-500 text-xs">m</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                      Blast Radius:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="5"
                        max="250"
                        value={h.radius}
                        onChange={(e) => handleUpdateHazard(h.id, { radius: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                      />
                      <span className="text-slate-500 text-xs">m</span>
                    </div>
                  </div>
                </div>

                {/* Directional Nudge Quick Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                  <span className="text-slate-400 text-[11px] font-medium">Position Nudge:</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => handleNudgeHazard(h.id, -20, 0)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-200 text-[11px] font-mono cursor-pointer transition"
                      title="Move 20m West"
                    >
                      <ArrowLeft className="w-3 h-3 text-cyan-400" />
                      <span>West -20m</span>
                    </button>
                    <button
                      onClick={() => handleNudgeHazard(h.id, 20, 0)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-200 text-[11px] font-mono cursor-pointer transition"
                      title="Move 20m East"
                    >
                      <ArrowRight className="w-3 h-3 text-cyan-400" />
                      <span>East +20m</span>
                    </button>
                    <button
                      onClick={() => handleNudgeHazard(h.id, 0, -20)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-200 text-[11px] font-mono cursor-pointer transition"
                      title="Move 20m North"
                    >
                      <ArrowUp className="w-3 h-3 text-cyan-400" />
                      <span>North -20m</span>
                    </button>
                    <button
                      onClick={() => handleNudgeHazard(h.id, 0, 20)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-200 text-[11px] font-mono cursor-pointer transition"
                      title="Move 20m South"
                    >
                      <ArrowDown className="w-3 h-3 text-cyan-400" />
                      <span>South +20m</span>
                    </button>
                    <button
                      onClick={() => handleUpdateHazard(h.id, { x: cx, z: cz })}
                      className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 rounded-lg border border-cyan-800 text-cyan-300 text-[11px] font-mono cursor-pointer transition"
                      title="Reset to City Center"
                    >
                      🎯 Center ({cx}, {cz})
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add / Modify Custom Hazard Form */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>Add or Set Threat Coordinates</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Hazard Name:</label>
              <input
                type="text"
                placeholder="e.g. West Wing Fire"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Hazard Type:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as HazardCategory)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="fire">🔥 Structural Fire</option>
                <option value="smoke">☁️ Toxic Chemical Smoke</option>
                <option value="flood">🌊 Flash Flood / Water</option>
                <option value="blocked_road">⛔ Physical Debris Blockade</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Blast Radius (meters):</label>
              <input
                type="number"
                min="5"
                max="250"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">X Coordinate (East-West):</label>
              <input
                type="number"
                value={x}
                onChange={(e) => setX(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Z Coordinate (North-South):</label>
              <input
                type="number"
                value={z}
                onChange={(e) => setZ(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Severity Multiplier:</label>
              <input
                type="number"
                min="0.5"
                max="5.0"
                step="0.5"
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center pt-2 sm:col-span-3">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={blocksMovement}
                  onChange={(e) => setBlocksMovement(e.target.checked)}
                  className="rounded accent-red-500"
                />
                <span>Blocks Movement Completely (Forces agents to find alternate escape route)</span>
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            {hazards.length > 0 && (
              <button
                onClick={handleUpdatePrimaryHazard}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg font-semibold text-xs cursor-pointer transition"
                title="Update the coordinates of the first hazard directly"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Move Primary Hazard to (X: {x}, Z: {z})</span>
              </button>
            )}
            <button
              onClick={handleAddAsNewHazard}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded-lg font-semibold text-xs cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add as Additional Hazard</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyChanges}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-lg shadow-red-950"
          >
            <Check className="w-4 h-4" />
            <span>Apply to 3D Simulation Now</span>
          </button>
        </div>
      </div>
    </div>
  )
}
