export type AgentStatus = 'MOVING' | 'SAFE' | 'QUEUED' | 'TRAPPED'

export type HazardCategory = 'fire' | 'smoke' | 'flood' | 'debris' | 'blocked_road' | 'toxic_spill'

export interface Vector3D {
  x: number
  y?: number
  z: number
}

export interface HazardConfig {
  id: string
  name: string
  category: HazardCategory
  x: number
  z: number
  y?: number
  radius: number
  width?: number
  height?: number
  severity: number
  is_active: boolean
  blocks_movement: boolean
}

export interface ExitConfig {
  id: string
  name: string
  x: number
  z: number
  y?: number
  capacity_per_sec?: number
  is_open?: boolean
}

export interface RoadSegment {
  id: string
  name?: string
  points: Vector3D[]
  width: number
  is_blocked?: boolean
  road_type?: string
}

export interface BuildingData {
  id: string
  name?: string
  footprint: Vector3D[]
  height: number
  floors: number
  building_type?: string
}

export interface CityModel {
  id: string
  name: string
  description: string
  bounds: {
    min_x: number
    max_x: number
    min_z: number
    max_z: number
  }
  buildings: BuildingData[]
  roads: RoadSegment[]
  exits: ExitConfig[]
  default_hazards: HazardConfig[]
  grid_resolution: number
}

export interface AgentState {
  id: number
  x: number
  z: number
  y?: number
  heading: number
  status: AgentStatus
  target_exit_id?: string
  speed: number
  steps_taken: number
  distance_travelled: number
  waited_steps: number
  route: number[][] // [[x, z], ...]
}

export interface SimulationMetrics {
  total_agents: number
  evacuated: number
  moving: number
  queued: number
  trapped: number
  completion_percentage: number
  current_step: number
  elapsed_seconds: number
  avg_evacuation_time_seconds: number
  exit_utilization: Record<string, number>
  bottleneck_events: number
}

export interface SimulationFrame {
  step: number
  elapsed_seconds: number
  is_completed: boolean
  is_paused: boolean
  metrics: SimulationMetrics
  agents: AgentState[]
  hazards: HazardConfig[]
  exits: ExitConfig[]
}

export interface ScenarioConfig {
  scenario_id: string
  name: string
  city_id: string
  population: number
  random_seed: number
  speed_multiplier: number
  allow_diagonal: boolean
  avoid_hazards: boolean
  hazards: HazardConfig[]
  exits: ExitConfig[]
  blocked_road_ids: string[]
}

export interface GeoJSONValidationResponse {
  is_valid: boolean
  filename?: string
  feature_count: number
  geometry_distribution: Record<string, number>
  building_count: number
  road_count: number
  detected_bounds?: {
    min_x: number
    max_x: number
    min_z: number
    max_z: number
  }
  errors: string[]
  warnings: string[]
  city_model?: CityModel
}

export interface AIAdvisoryReport {
  title: string
  generated_at: string
  scenario_summary: string
  congestion_assessment: string
  exit_imbalance_ratio: number
  critical_bottlenecks: Array<{
    location: string
    accumulated_wait_cycles: number
    severity: string
    primary_cause: string
  }>
  recommendations: Array<{
    priority: string
    category: string
    finding: string
    action: string
    projected_gain: string
  }>
  projected_time_improvement_pct: number
  limitations_notice: string
}

export interface BaselineComparison {
  baseline: {
    scenario_name: string
    population: number
    evacuated: number
    trapped: number
    success_rate_pct: number
    steps_taken: number
    elapsed_seconds: number
    bottleneck_waits: number
  }
  disrupted: {
    scenario_name: string
    population: number
    evacuated: number
    trapped: number
    success_rate_pct: number
    steps_taken: number
    elapsed_seconds: number
    bottleneck_waits: number
  }
  deltas: {
    evacuated_diff: number
    trapped_diff: number
    time_diff_seconds: number
    bottleneck_delay_diff: number
  }
}
