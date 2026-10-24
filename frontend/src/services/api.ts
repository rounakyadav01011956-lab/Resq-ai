import type {
  CityModel,
  SimulationFrame,
  ScenarioConfig,
  GeoJSONValidationResponse,
  AIAdvisoryReport,
  BaselineComparison
} from '../types/simulation'

const API_BASE = '/api'

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`)
  if (!res.ok) throw new Error('Backend offline')
  return res.json()
}

export async function fetchCityPresets(): Promise<Array<{ id: string; name: string; description: string; building_count: number; road_count: number; exit_count: number }>> {
  const res = await fetch(`${API_BASE}/cities/presets`)
  if (!res.ok) throw new Error('Failed to fetch presets')
  return res.json()
}

export async function fetchCurrentCity(): Promise<CityModel> {
  const res = await fetch(`${API_BASE}/cities/current`)
  if (!res.ok) throw new Error('Failed to fetch city')
  return res.json()
}

export async function selectCityPreset(cityId: string): Promise<{ success: boolean; city: CityModel }> {
  const res = await fetch(`${API_BASE}/cities/select/${cityId}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to select preset')
  return res.json()
}

export async function uploadGeoJSON(file: File): Promise<GeoJSONValidationResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/geojson/validate-and-load`, {
    method: 'POST',
    body: formData
  })
  return res.json()
}

export async function fetchSimulationFrame(): Promise<SimulationFrame> {
  const res = await fetch(`${API_BASE}/simulation/frame`)
  if (!res.ok) throw new Error('Failed to fetch frame')
  return res.json()
}

export async function updateScenarioConfig(config: ScenarioConfig): Promise<{ success: boolean; frame: SimulationFrame }> {
  const res = await fetch(`${API_BASE}/simulation/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })
  if (!res.ok) throw new Error('Failed to update config')
  return res.json()
}

export async function stepSimulation(): Promise<SimulationFrame> {
  const res = await fetch(`${API_BASE}/simulation/step`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to step simulation')
  return res.json()
}

export async function pauseSimulation(): Promise<SimulationFrame> {
  const res = await fetch(`${API_BASE}/simulation/pause`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to pause')
  return res.json()
}

export async function resumeSimulation(): Promise<SimulationFrame> {
  const res = await fetch(`${API_BASE}/simulation/resume`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to resume')
  return res.json()
}

export async function resetSimulation(): Promise<SimulationFrame> {
  const res = await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to reset')
  return res.json()
}

export async function fetchBaselineComparison(): Promise<BaselineComparison> {
  const res = await fetch(`${API_BASE}/simulation/comparison`)
  if (!res.ok) throw new Error('Failed to fetch baseline comparison')
  return res.json()
}

export async function fetchAIAdvisory(): Promise<AIAdvisoryReport> {
  const res = await fetch(`${API_BASE}/ai/advisory`)
  if (!res.ok) throw new Error('Failed to fetch AI advisory')
  return res.json()
}

export function getExportCSVUrl(): string {
  return `${API_BASE}/simulation/export/csv`
}

export function getExportJSONUrl(): string {
  return `${API_BASE}/simulation/export/json`
}

/**
 * Creates a robust WebSocket connection for live continuous simulation playback.
 */
export function createSimulationSocket(
  onFrame: (frame: SimulationFrame) => void,
  onStatusChange?: (connected: boolean) => void
): { close: () => void } {
  let ws: WebSocket | null = null
  let isClosedManually = false
  let reconnectTimer: any = null

  function connect() {
    if (isClosedManually) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws/simulation`

    try {
      ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        if (onStatusChange) onStatusChange(true)
      }

      ws.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data) as SimulationFrame
          onFrame(frame)
        } catch (e) {
          console.error('Error parsing frame:', e)
        }
      }

      ws.onclose = () => {
        if (onStatusChange) onStatusChange(false)
        if (!isClosedManually) {
          reconnectTimer = setTimeout(connect, 2000)
        }
      }

      ws.onerror = () => {
        if (onStatusChange) onStatusChange(false)
        ws?.close()
      }
    } catch {
      if (onStatusChange) onStatusChange(false)
      reconnectTimer = setTimeout(connect, 3000)
    }
  }

  connect()

  return {
    close: () => {
      isClosedManually = true
      clearTimeout(reconnectTimer)
      if (ws) ws.close()
    }
  }
}
