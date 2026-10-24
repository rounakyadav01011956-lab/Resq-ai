import math
import random
from collections import Counter
from typing import List, Dict, Tuple, Set, Optional
from app.models.schemas import (
    CityModel, ScenarioConfig, AgentState, AgentStatus,
    SimulationMetrics, SimulationFrame, ExitConfig, HazardConfig
)
from app.simulation.pathfinding import SpatialAStar


class EvacuationSimulationEngine:
    """
    Production-grade multi-agent evacuation simulation engine.
    Integrates spatial A* pathfinding, crowd collision resolution, doorway queuing,
    dynamic hazard avoidance, and real-time metric tracking.
    """

    def __init__(self, city: CityModel, config: ScenarioConfig):
        self.city = city
        self.config = config
        self.res = city.grid_resolution
        
        # Bounding box coordinates
        self.min_x = city.bounds["min_x"]
        self.max_x = city.bounds["max_x"]
        self.min_z = city.bounds["min_z"]
        self.max_z = city.bounds["max_z"]
        
        self.grid_w = max(10, int(math.ceil((self.max_x - self.min_x) / self.res)))
        self.grid_h = max(10, int(math.ceil((self.max_z - self.min_z) / self.res)))
        
        self.astar = SpatialAStar(allow_diagonal=config.allow_diagonal)
        
        # Grid layers
        self.building_obstacles: Set[Tuple[int, int]] = set()
        self.blocked_road_obstacles: Set[Tuple[int, int]] = set()
        self.walkable_cells: List[Tuple[int, int]] = []
        self.exit_cells: Dict[str, Tuple[int, int]] = {}
        if config.hazards is not None:
            self.active_hazards: List[HazardConfig] = list(config.hazards)
        else:
            self.active_hazards: List[HazardConfig] = list(city.default_hazards)
        
        # Analytics maps
        self.traffic_visits = Counter()
        self.bottleneck_waits = Counter()
        self.exit_utilization = Counter()
        
        # Agent records
        self.agents: Dict[int, AgentState] = {}
        self.evacuated_agent_ids: Set[int] = set()
        self.trapped_agent_ids: Set[int] = set()
        self.evacuation_times: List[float] = []
        
        # State
        self.current_step = 0
        self.elapsed_seconds = 0.0
        self.is_completed = False
        self.is_paused = False
        self.step_dt = 0.5  # seconds modeled per discrete simulation step
        
        # Initialize world grid and agents
        self._rasterize_world()
        self._spawn_agents()

    def _world_to_grid(self, x: float, z: float) -> Tuple[int, int]:
        c = int(math.floor((x - self.min_x) / self.res))
        r = int(math.floor((z - self.min_z) / self.res))
        return max(0, min(self.grid_h - 1, r)), max(0, min(self.grid_w - 1, c))

    def _grid_to_world(self, r: int, c: int) -> Tuple[float, float]:
        x = self.min_x + (c + 0.5) * self.res
        z = self.min_z + (r + 0.5) * self.res
        return round(x, 2), round(z, 2)

    def _rasterize_world(self):
        """Mark buildings as impassable obstacle cells."""
        # 1. Rasterize building footprints
        for bldg in self.city.buildings:
            fp = bldg.footprint
            if not fp:
                continue
            bx_min = min(p.x for p in fp)
            bx_max = max(p.x for p in fp)
            bz_min = min(p.z for p in fp)
            bz_max = max(p.z for p in fp)
            
            r_start, c_start = self._world_to_grid(bx_min, bz_min)
            r_end, c_end = self._world_to_grid(bx_max, bz_max)
            
            for r in range(r_start, r_end + 1):
                for c in range(c_start, c_end + 1):
                    self.building_obstacles.add((r, c))

        # 2. Blocked roads
        blocked_ids = set(self.config.blocked_road_ids)
        for rd in self.city.roads:
            if rd.id in blocked_ids or rd.is_blocked:
                for pt in rd.points:
                    gr, gc = self._world_to_grid(pt.x, pt.z)
                    for dr in range(-1, 2):
                        for dc in range(-1, 2):
                            nr, nc = gr + dr, gc + dc
                            if 0 <= nr < self.grid_h and 0 <= nc < self.grid_w:
                                self.blocked_road_obstacles.add((nr, nc))

        # 3. Exits mapping
        configured_exits = self.config.exits or self.city.exits
        for ex in configured_exits:
            if ex.is_open:
                cell = self._world_to_grid(ex.x, ex.z)
                self.exit_cells[ex.id] = cell
                # Exits are never obstacles
                self.building_obstacles.discard(cell)
                self.blocked_road_obstacles.discard(cell)

        # 4. Gather walkable cells
        all_obstacles = self.building_obstacles.union(self.blocked_road_obstacles)
        for r in range(self.grid_h):
            for c in range(self.grid_w):
                if (r, c) not in all_obstacles:
                    self.walkable_cells.append((r, c))

    def _get_hazard_cost_map(self) -> Dict[Tuple[int, int], float]:
        """Compute grid cells affected by active hazards and assign cost/blocking."""
        hazard_costs: Dict[Tuple[int, int], float] = {}
        for h in self.active_hazards:
            if not h.is_active:
                continue
            hr, hc = self._world_to_grid(h.x, h.z)
            cell_radius = int(math.ceil(h.radius / self.res))
            
            cost = 999.0 if (h.blocks_movement and self.config.avoid_hazards) else (15.0 * h.severity)
            
            for dr in range(-cell_radius, cell_radius + 1):
                for dc in range(-cell_radius, cell_radius + 1):
                    if dr*dr + dc*dc <= cell_radius*cell_radius:
                        nr, nc = hr + dr, hc + dc
                        if 0 <= nr < self.grid_h and 0 <= nc < self.grid_w:
                            hazard_costs[(nr, nc)] = max(hazard_costs.get((nr, nc), 0.0), cost)
        return hazard_costs

    def _spawn_agents(self):
        """Deterministically spawn agents in walkable spaces."""
        rng = random.Random(self.config.random_seed)
        if not self.walkable_cells:
            return
            
        spawn_count = min(self.config.population, len(self.walkable_cells))
        spawn_cells = rng.sample(self.walkable_cells, spawn_count)
        
        exit_list = list(self.exit_cells.values())
        obstacle_set = self.building_obstacles.union(self.blocked_road_obstacles)
        hazard_costs = self._get_hazard_cost_map()

        for idx, (r, c) in enumerate(spawn_cells):
            wx, wz = self._grid_to_world(r, c)
            
            # Initial path finding
            path = self.astar.find_path((r, c), exit_list, self.grid_w, self.grid_h, obstacle_set, hazard_costs)
            world_route = [list(self._grid_to_world(pr, pc)) for pr, pc in path]
            
            initial_status = AgentStatus.MOVING if path else AgentStatus.TRAPPED
            
            # Find closest exit id
            target_id = None
            if path:
                end_cell = path[-1]
                for eid, ecell in self.exit_cells.items():
                    if ecell == end_cell:
                        target_id = eid
                        break
                        
            # Heading towards next point
            heading = 0.0
            if len(world_route) > 1:
                dx = world_route[1][0] - wx
                dz = world_route[1][1] - wz
                heading = math.atan2(dx, dz)

            self.agents[idx] = AgentState(
                id=idx,
                x=wx,
                z=wz,
                y=0.0,
                heading=heading,
                status=initial_status,
                target_exit_id=target_id,
                speed=1.3,
                steps_taken=0,
                distance_travelled=0.0,
                waited_steps=0,
                route=world_route
            )

    def step(self):
        """Execute one simulation tick."""
        if self.is_completed or self.is_paused:
            return

        self.current_step += 1
        self.elapsed_seconds += self.step_dt
        
        exit_coords = set(self.exit_cells.values())
        obstacle_set = self.building_obstacles.union(self.blocked_road_obstacles)
        hazard_costs = self._get_hazard_cost_map()
        
        # 1. Propose movement for each active agent
        proposals: Dict[int, Tuple[int, int]] = {}
        active_agents = {aid: a for aid, a in self.agents.items() if a.status in (AgentStatus.MOVING, AgentStatus.QUEUED)}
        
        if not active_agents:
            self.is_completed = True
            return

        for aid, agent in active_agents.items():
            curr_r, curr_c = self._world_to_grid(agent.x, agent.z)
            self.traffic_visits[(curr_r, curr_c)] += 1
            
            # Check if agent has reached an exit
            if (curr_r, curr_c) in exit_coords:
                agent.status = AgentStatus.SAFE
                self.evacuated_agent_ids.add(aid)
                self.evacuation_times.append(self.elapsed_seconds)
                if agent.target_exit_id:
                    self.exit_utilization[agent.target_exit_id] += 1
                continue

            # Check / recalculate route
            path = self.astar.find_path((curr_r, curr_c), list(exit_coords), self.grid_w, self.grid_h, obstacle_set, hazard_costs)
            
            if not path or len(path) < 2:
                agent.status = AgentStatus.TRAPPED
                self.trapped_agent_ids.add(aid)
                agent.route = []
                continue

            # Update planned route
            agent.route = [list(self._grid_to_world(pr, pc)) for pr, pc in path[:15]]
            target_cell = path[1]
            proposals[aid] = target_cell

        # 2. Collision Resolution & Bottleneck Queuing
        # Group competing agents by target cell
        cell_contenders: Dict[Tuple[int, int], List[int]] = {}
        for aid, t_cell in proposals.items():
            cell_contenders.setdefault(t_cell, []).append(aid)

        current_occupied = {self._world_to_grid(a.x, a.z) for a in active_agents.values() if a.status != AgentStatus.SAFE}
        moved_agents: Set[int] = set()

        for t_cell, contenders in cell_contenders.items():
            # If multiple agents want the same cell -> doorway / corridor bottleneck
            if len(contenders) > 1:
                self.bottleneck_waits[t_cell] += (len(contenders) - 1)
                
            # Pick winner (agent with highest accumulated wait steps or lowest id)
            contenders.sort(key=lambda x: (-self.agents[x].waited_steps, x))
            winner_id = contenders[0]
            winner = self.agents[winner_id]
            curr_pos = self._world_to_grid(winner.x, winner.z)

            # Move winner if target cell is not blocked by another un-moved occupant
            if t_cell not in current_occupied or t_cell == curr_pos or t_cell in exit_coords:
                nx, nz = self._grid_to_world(t_cell[0], t_cell[1])
                dx = nx - winner.x
                dz = nz - winner.z
                dist = math.sqrt(dx*dx + dz*dz)
                
                winner.x = nx
                winner.z = nz
                if dist > 0.01:
                    winner.heading = math.atan2(dx, dz)
                winner.distance_travelled += dist
                winner.steps_taken += 1
                winner.status = AgentStatus.MOVING
                winner.waited_steps = 0
                
                current_occupied.discard(curr_pos)
                current_occupied.add(t_cell)
                moved_agents.add(winner_id)
                
                # Check exit arrival
                if t_cell in exit_coords:
                    winner.status = AgentStatus.SAFE
                    self.evacuated_agent_ids.add(winner_id)
                    self.evacuation_times.append(self.elapsed_seconds)
                    if winner.target_exit_id:
                        self.exit_utilization[winner.target_exit_id] += 1
                    current_occupied.discard(t_cell)

            # Losers must wait in queue
            for loser_id in contenders:
                if loser_id not in moved_agents:
                    loser = self.agents[loser_id]
                    loser.status = AgentStatus.QUEUED
                    loser.waited_steps += 1

        # Check if all agents evacuated or trapped
        remaining_moving = [a for a in self.agents.values() if a.status in (AgentStatus.MOVING, AgentStatus.QUEUED)]
        if not remaining_moving:
            self.is_completed = True

    def get_metrics(self) -> SimulationMetrics:
        total = len(self.agents)
        evacuated = len(self.evacuated_agent_ids)
        trapped = len([a for a in self.agents.values() if a.status == AgentStatus.TRAPPED])
        moving = len([a for a in self.agents.values() if a.status == AgentStatus.MOVING])
        queued = len([a for a in self.agents.values() if a.status == AgentStatus.QUEUED])
        
        completion = round((evacuated / total * 100.0) if total > 0 else 0.0, 1)
        avg_time = round(sum(self.evacuation_times) / len(self.evacuation_times), 1) if self.evacuation_times else 0.0
        
        return SimulationMetrics(
            total_agents=total,
            evacuated=evacuated,
            moving=moving,
            queued=queued,
            trapped=trapped,
            completion_percentage=completion,
            current_step=self.current_step,
            elapsed_seconds=round(self.elapsed_seconds, 1),
            avg_evacuation_time_seconds=avg_time,
            exit_utilization=dict(self.exit_utilization),
            bottleneck_events=sum(self.bottleneck_waits.values())
        )

    def get_current_frame(self) -> SimulationFrame:
        return SimulationFrame(
            step=self.current_step,
            elapsed_seconds=round(self.elapsed_seconds, 1),
            is_completed=self.is_completed,
            is_paused=self.is_paused,
            metrics=self.get_metrics(),
            agents=list(self.agents.values()),
            hazards=self.active_hazards,
            exits=self.config.exits or self.city.exits
        )
