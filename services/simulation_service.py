import io
import csv
import json
import copy
from typing import Dict, Any, Optional, Tuple
from app.models.schemas import (
    CityModel, ScenarioConfig, SimulationFrame, SimulationMetrics
)
from app.simulation.engine import EvacuationSimulationEngine
from app.simulation.presets import get_all_presets


class SimulationService:
    """Singleton service managing the lifecycle of the active simulation."""
    
    def __init__(self):
        self.presets = get_all_presets()
        self.current_city: CityModel = self.presets["financial_district"]
        self.current_config: ScenarioConfig = ScenarioConfig(
            scenario_id="scenario_default",
            name="Metropolis Emergency Evacuation",
            city_id="financial_district",
            population=60,
            random_seed=42,
            hazards=self.current_city.default_hazards,
            exits=self.current_city.exits
        )
        self.engine: EvacuationSimulationEngine = EvacuationSimulationEngine(self.current_city, self.current_config)
        self.run_history: list = []

    def load_preset(self, city_id: str) -> CityModel:
        if city_id in self.presets:
            self.current_city = self.presets[city_id]
            self.current_config.city_id = city_id
            self.current_config.hazards = copy.deepcopy(self.current_city.default_hazards)
            self.current_config.exits = copy.deepcopy(self.current_city.exits)
            self.reset_simulation()
            return self.current_city
        raise ValueError(f"Preset '{city_id}' not found.")

    def set_custom_city(self, city: CityModel):
        self.current_city = city
        self.current_config.city_id = city.id
        self.current_config.hazards = copy.deepcopy(city.default_hazards)
        self.current_config.exits = copy.deepcopy(city.exits)
        self.reset_simulation()

    def update_config(self, new_config: ScenarioConfig):
        self.current_config = new_config
        self.reset_simulation()

    def reset_simulation(self):
        self.engine = EvacuationSimulationEngine(self.current_city, self.current_config)

    def step(self) -> SimulationFrame:
        self.engine.step()
        return self.engine.get_current_frame()

    def set_pause(self, paused: bool) -> SimulationFrame:
        self.engine.is_paused = paused
        return self.engine.get_current_frame()

    def get_frame(self) -> SimulationFrame:
        return self.engine.get_current_frame()

    def run_baseline_comparison(self) -> Dict[str, Any]:
        """Runs baseline (all exits open, 0 hazards) vs current scenario with identical population and seed."""
        # 1. Baseline Run
        baseline_config = copy.deepcopy(self.current_config)
        baseline_config.hazards = []
        baseline_config.blocked_road_ids = []
        for ex in baseline_config.exits:
            ex.is_open = True
            
        base_engine = EvacuationSimulationEngine(self.current_city, baseline_config)
        max_limit = 350
        while not base_engine.is_completed and base_engine.current_step < max_limit:
            base_engine.step()
        base_metrics = base_engine.get_metrics()

        # 2. Current Scenario Run
        curr_engine = EvacuationSimulationEngine(self.current_city, self.current_config)
        while not curr_engine.is_completed and curr_engine.current_step < max_limit:
            curr_engine.step()
        curr_metrics = curr_engine.get_metrics()

        return {
            "baseline": {
                "scenario_name": "Baseline (All Exits Open, No Hazards)",
                "population": base_metrics.total_agents,
                "evacuated": base_metrics.evacuated,
                "trapped": base_metrics.trapped,
                "success_rate_pct": base_metrics.completion_percentage,
                "steps_taken": base_metrics.current_step,
                "elapsed_seconds": base_metrics.elapsed_seconds,
                "bottleneck_waits": base_metrics.bottleneck_events
            },
            "disrupted": {
                "scenario_name": f"Current Scenario ({self.current_config.name})",
                "population": curr_metrics.total_agents,
                "evacuated": curr_metrics.evacuated,
                "trapped": curr_metrics.trapped,
                "success_rate_pct": curr_metrics.completion_percentage,
                "steps_taken": curr_metrics.current_step,
                "elapsed_seconds": curr_metrics.elapsed_seconds,
                "bottleneck_waits": curr_metrics.bottleneck_events
            },
            "deltas": {
                "evacuated_diff": curr_metrics.evacuated - base_metrics.evacuated,
                "trapped_diff": curr_metrics.trapped - base_metrics.trapped,
                "time_diff_seconds": round(curr_metrics.elapsed_seconds - base_metrics.elapsed_seconds, 1),
                "bottleneck_delay_diff": curr_metrics.bottleneck_events - base_metrics.bottleneck_events
            }
        }

    def export_csv_report(self) -> str:
        """Generate comprehensive CSV report of all simulated agents and metrics."""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Summary Header
        metrics = self.engine.get_metrics()
        writer.writerow(["ResQ AI Evacuation Simulation Summary Report"])
        writer.writerow(["City", self.current_city.name])
        writer.writerow(["Scenario", self.current_config.name])
        writer.writerow(["Total Population", metrics.total_agents])
        writer.writerow(["Safely Evacuated", metrics.evacuated])
        writer.writerow(["Trapped / Cut Off", metrics.trapped])
        writer.writerow(["Success Rate", f"{metrics.completion_percentage}%"])
        writer.writerow(["Elapsed Simulation Time (s)", metrics.elapsed_seconds])
        writer.writerow(["Bottleneck Wait Events", metrics.bottleneck_events])
        writer.writerow([])
        
        # Agent Detail Table
        writer.writerow(["Agent ID", "Status", "Target Exit", "Distance Travelled (m)", "Steps", "Wait Cycles in Queue", "Final X (m)", "Final Z (m)"])
        for aid, a in sorted(self.engine.agents.items()):
            writer.writerow([
                a.id,
                a.status.value,
                a.target_exit_id or "None",
                round(a.distance_travelled, 2),
                a.steps_taken,
                a.waited_steps,
                round(a.x, 2),
                round(a.z, 2)
            ])
            
        return output.getvalue()


# Singleton instance
sim_service = SimulationService()
