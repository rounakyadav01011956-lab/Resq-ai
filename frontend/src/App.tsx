import React, { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Header } from './components/Header'
import { MetricsBar } from './components/MetricsBar'
import { PlaybackControls } from './components/PlaybackControls'
import { City3DViewport } from './scene/City3DViewport'
import { GeoJSONUploadModal } from './components/GeoJSONUploadModal'
import { HazardConfigModal } from './components/HazardConfigModal'
import { AnalyticsModal } from './components/AnalyticsModal'
import { AIAdvisorModal } from './components/AIAdvisorModal'
import { AboutModal } from './components/AboutModal'

import type {
  CityModel,
  SimulationFrame,
  ScenarioConfig,
  GeoJSONValidationResponse,
  HazardConfig
} from './types/simulation'

import {
  fetchCityPresets,
  fetchCurrentCity,
  selectCityPreset,
  fetchSimulationFrame,
  updateScenarioConfig,
  stepSimulation,
  pauseSimulation,
  resumeSimulation,
  resetSimulation,
  createSimulationSocket
} from './services/api'

export const App: React.FC = () => {
  // Cities & Presets
  const [cityPresets, setCityPresets] = useState<Array<{ id: string; name: string }>>([])
  const [currentCity, setCurrentCity] = useState<CityModel | null>(null)

  // Simulation Frame & Config
  const [frame, setFrame] = useState<SimulationFrame | null>(null)
  const [config, setConfig] = useState<ScenarioConfig>({
    scenario_id: 'scenario_default',
    name: 'Metropolis Emergency Evacuation',
    city_id: 'financial_district',
    population: 60,
    random_seed: 42,
    speed_multiplier: 1.0,
    allow_diagonal: true,
    avoid_hazards: true,
    hazards: [],
    exits: [],
    blocked_road_ids: []
  })

  // Selected agent for 3D inspection
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null)

  // Connection & Playback Status
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<{ close: () => void } | null>(null)
  const celebratedRef = useRef(false)

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isHazardsOpen, setIsHazardsOpen] = useState(false)
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false)
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(false)

  // 1. Initial Data Fetch
  useEffect(() => {
    async function init() {
      try {
        const presets = await fetchCityPresets()
        setCityPresets(presets.map((p) => ({ id: p.id, name: p.name })))

        const city = await fetchCurrentCity()
        setCurrentCity(city)
        setConfig((prev) => ({
          ...prev,
          city_id: city.id,
          hazards: city.default_hazards,
          exits: city.exits
        }))

        const initialFrame = await fetchSimulationFrame()
        setFrame(initialFrame)
      } catch (err) {
        console.warn('Backend not responding yet or initializing:', err)
      }
    }
    init()
  }, [])

  // 2. Establish WebSocket Streaming
  useEffect(() => {
    const sock = createSimulationSocket(
      (newFrame) => {
        setFrame(newFrame)
        // Trigger celebratory confetti on complete evacuation!
        if (
          newFrame.is_completed &&
          newFrame.metrics.evacuated > 0 &&
          newFrame.metrics.trapped === 0 &&
          !celebratedRef.current
        ) {
          celebratedRef.current = true
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          })
        }
      },
      (connected) => setIsConnected(connected)
    )
    socketRef.current = sock

    return () => {
      sock.close()
    }
  }, [])

  // 3. Preset Selection Handler
  const handleSelectCity = async (cityId: string) => {
    try {
      const res = await selectCityPreset(cityId)
      if (res.success) {
        setCurrentCity(res.city)
        setConfig((prev) => ({
          ...prev,
          city_id: cityId,
          hazards: res.city.default_hazards,
          exits: res.city.exits
        }))
        const newFrame = await fetchSimulationFrame()
        setFrame(newFrame)
        celebratedRef.current = false
      }
    } catch (err) {
      console.error(err)
    }
  }

  // 4. Playback Handlers
  const handleTogglePlay = async () => {
    if (!frame) return
    celebratedRef.current = false
    try {
      if (frame.is_completed) {
        const restarted = await resetSimulation()
        setFrame(restarted)
        const resumed = await resumeSimulation()
        setFrame(resumed)
      } else if (frame.is_paused) {
        const resumed = await resumeSimulation()
        setFrame(resumed)
      } else {
        const paused = await pauseSimulation()
        setFrame(paused)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleStep = async () => {
    try {
      const stepped = await stepSimulation()
      setFrame(stepped)
    } catch (err) {
      console.error(err)
    }
  }

  const handleReset = async () => {
    try {
      celebratedRef.current = false
      const reset = await resetSimulation()
      setFrame(reset)
    } catch (err) {
      console.error(err)
    }
  }

  const handleConfigChange = async (newConfig: ScenarioConfig) => {
    setConfig(newConfig)
    celebratedRef.current = false
    try {
      const res = await updateScenarioConfig(newConfig)
      if (res.success) {
        setFrame(res.frame)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleMoveHazard = (newX: number, newZ: number) => {
    const existing = config.hazards || []
    let updated: HazardConfig[]
    if (existing.length > 0) {
      updated = existing.map((h, i) =>
        i === 0 ? { ...h, x: newX, z: newZ, is_active: true } : h
      )
    } else {
      updated = [
        {
          id: `hazard_${Date.now()}`,
          name: 'Primary Disaster Threat',
          category: 'fire',
          x: newX,
          z: newZ,
          radius: 24,
          severity: 1.0,
          is_active: true,
          blocks_movement: true
        }
      ]
    }
    handleConfigChange({ ...config, hazards: updated })
  }

  const handleGeoJSONSuccess = (resp: GeoJSONValidationResponse) => {
    if (resp.city_model) {
      setCurrentCity(resp.city_model)
      setConfig((prev) => ({
        ...prev,
        city_id: resp.city_model!.id,
        hazards: resp.city_model!.default_hazards,
        exits: resp.city_model!.exits
      }))
      fetchSimulationFrame().then(setFrame)
      celebratedRef.current = false
    }
  }

  return (
    <ErrorBoundary fallbackTitle="ResQ AI Tactical Operations Intercept">
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        {/* Navigation Header */}
        <Header
          activeCityName={currentCity?.name || 'Metropolis Financial District'}
          presets={cityPresets}
          onSelectCity={handleSelectCity}
          isConnected={isConnected}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenHazards={() => setIsHazardsOpen(true)}
          onOpenAnalytics={() => setIsAnalyticsOpen(true)}
          onOpenAdvisor={() => setIsAdvisorOpen(true)}
          onOpenAbout={() => setIsAboutOpen(true)}
        />

        {/* Live Metrics Bar */}
        {frame ? (
          <MetricsBar metrics={frame.metrics} />
        ) : (
          <div className="px-6 py-3 text-xs text-slate-500">Initializing simulation metrics...</div>
        )}

        {/* Main 3D Simulation Twin Viewport */}
        <main className="flex-1 px-6 pb-3 flex flex-col gap-3">
          {currentCity && frame ? (
            <div className="w-full h-[580px]">
              <City3DViewport
                city={currentCity}
                agents={frame.agents}
                hazards={frame.hazards}
                exits={frame.exits}
                selectedAgentId={selectedAgentId}
                onSelectAgent={setSelectedAgentId}
                onMoveHazard={handleMoveHazard}
              />
            </div>
          ) : (
            <div className="w-full h-[580px] bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 text-sm">
              <div className="animate-pulse flex items-center gap-2">
                <span>Loading 3D Digital Twin...</span>
              </div>
            </div>
          )}

          {/* Timeline & Playback Controller */}
          <PlaybackControls
            isPaused={frame ? frame.is_paused : true}
            isCompleted={frame ? frame.is_completed : false}
            onTogglePlay={handleTogglePlay}
            onStep={handleStep}
            onReset={handleReset}
            config={config}
            onConfigChange={handleConfigChange}
          />
        </main>

        {/* Interactive Modals */}
        <GeoJSONUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onLoadSuccess={handleGeoJSONSuccess}
        />

        <HazardConfigModal
          isOpen={isHazardsOpen}
          onClose={() => setIsHazardsOpen(false)}
          config={config}
          onSaveConfig={handleConfigChange}
          city={currentCity}
        />

        {frame && (
          <AnalyticsModal
            isOpen={isAnalyticsOpen}
            onClose={() => setIsAnalyticsOpen(false)}
            frame={frame}
          />
        )}

        <AIAdvisorModal
          isOpen={isAdvisorOpen}
          onClose={() => setIsAdvisorOpen(false)}
        />

        <AboutModal
          isOpen={isAboutOpen}
          onClose={() => setIsAboutOpen(false)}
        />
      </div>
    </ErrorBoundary>
  )
}
export default App
