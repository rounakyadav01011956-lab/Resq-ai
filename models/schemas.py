from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel, Field
from enum import Enum


class AgentStatus(str, Enum):
    MOVING = "MOVING"
    SAFE = "SAFE"
    QUEUED = "QUEUED"
    TRAPPED = "TRAPPED"


class HazardCategory(str, Enum):
    FIRE = "fire"
    SMOKE = "smoke"
    FLOOD = "flood"
    DEBRIS = "debris"
    BLOCKED_ROAD = "blocked_road"
    TOXIC_SPILL = "toxic_spill"


class Vector3(BaseModel):
    x: float
    y: float = 0.0
    z: float


class HazardConfig(BaseModel):
    id: str
    name: str
    category: HazardCategory = HazardCategory.FIRE
    x: float
    z: float
    y: float = 0.0
    radius: float = 25.0
    width: Optional[float] = None
    height: Optional[float] = None
    severity: float = Field(default=1.0, ge=0.1, le=5.0)
    is_active: bool = True
    blocks_movement: bool = True


class ExitConfig(BaseModel):
    id: str
    name: str
    x: float
    z: float
    y: float = 0.0
    capacity_per_sec: float = 2.0
    is_open: bool = True


class RoadSegment(BaseModel):
    id: str
    name: Optional[str] = "Street"
    points: List[Vector3]
    width: float = 8.0
    is_blocked: bool = False
    road_type: str = "primary"


class BuildingData(BaseModel):
    id: str
    name: Optional[str] = "Building"
    footprint: List[Vector3]  # Closed polygon in X-Z plane
    height: float = 18.0
    floors: int = 4
    building_type: str = "commercial"


class CityModel(BaseModel):
    id: str
    name: str
    description: str
    bounds: Dict[str, float]  # min_x, max_x, min_z, max_z
    buildings: List[BuildingData] = []
    roads: List[RoadSegment] = []
    exits: List[ExitConfig] = []
    default_hazards: List[HazardConfig] = []
    grid_resolution: float = 2.0  # meters per grid cell


class AgentState(BaseModel):
    id: int
    x: float
    z: float
    y: float = 0.0
    heading: float = 0.0  # radians
    status: AgentStatus = AgentStatus.MOVING
    target_exit_id: Optional[str] = None
    speed: float = 1.3  # m/s average walking speed
    steps_taken: int = 0
    distance_travelled: float = 0.0
    waited_steps: int = 0
    route: List[List[float]] = []  # [[x, z], ...]


class SimulationMetrics(BaseModel):
    total_agents: int
    evacuated: int
    moving: int
    queued: int
    trapped: int
    completion_percentage: float
    current_step: int
    elapsed_seconds: float
    avg_evacuation_time_seconds: float
    exit_utilization: Dict[str, int]
    bottleneck_events: int


class SimulationFrame(BaseModel):
    step: int
    elapsed_seconds: float
    is_completed: bool
    is_paused: bool
    metrics: SimulationMetrics
    agents: List[AgentState]
    hazards: List[HazardConfig]
    exits: List[ExitConfig]


class ScenarioConfig(BaseModel):
    scenario_id: str = "default_scenario"
    name: str = "Urban Center Evacuation"
    city_id: str = "financial_district"
    population: int = Field(default=60, ge=5, le=500)
    random_seed: int = 42
    speed_multiplier: float = 1.0
    allow_diagonal: bool = True
    avoid_hazards: bool = True
    hazards: List[HazardConfig] = []
    exits: List[ExitConfig] = []
    blocked_road_ids: List[str] = []


class GeoJSONValidationResponse(BaseModel):
    is_valid: bool
    filename: Optional[str] = None
    feature_count: int = 0
    geometry_distribution: Dict[str, int] = {}
    building_count: int = 0
    road_count: int = 0
    detected_bounds: Optional[Dict[str, float]] = None
    crs: Optional[str] = "WGS84 / EPSG:4326"
    errors: List[str] = []
    warnings: List[str] = []
    city_model: Optional[CityModel] = None


class AIAdvisoryReport(BaseModel):
    title: str = "ResQ AI Evacuation Safety Advisory"
    generated_at: str
    scenario_summary: str
    congestion_assessment: str
    exit_imbalance_ratio: float
    critical_bottlenecks: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    projected_time_improvement_pct: float
    limitations_notice: str
