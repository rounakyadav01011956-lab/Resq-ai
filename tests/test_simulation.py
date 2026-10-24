import unittest
import json
from app.models.schemas import ScenarioConfig, HazardConfig, HazardCategory
from app.simulation.presets import create_financial_district_preset
from app.simulation.engine import EvacuationSimulationEngine
from app.geospatial.geojson_parser import parse_and_validate_geojson
from app.services.ai_advisor import AIAdvisorService


class TestResQEngine(unittest.TestCase):

    def test_city_preset_creation(self):
        city = create_financial_district_preset()
        self.assertEqual(city.id, "financial_district")
        self.assertTrue(len(city.buildings) > 0)
        self.assertTrue(len(city.roads) > 0)
        self.assertTrue(len(city.exits) >= 3)

    def test_simulation_step_and_evacuation(self):
        city = create_financial_district_preset()
        config = ScenarioConfig(
            scenario_id="test_run",
            population=25,
            random_seed=123,
            allow_diagonal=True,
            avoid_hazards=True
        )
        engine = EvacuationSimulationEngine(city, config)
        self.assertEqual(len(engine.agents), 25)
        
        # Step through 20 cycles
        for _ in range(20):
            engine.step()
            
        metrics = engine.get_metrics()
        self.assertEqual(metrics.total_agents, 25)
        self.assertEqual(metrics.current_step, 20)
        self.assertTrue(metrics.evacuated + metrics.moving + metrics.queued + metrics.trapped == 25)

    def test_trapped_scenario_when_exits_blocked(self):
        city = create_financial_district_preset()
        # Massive hazard covering all exits
        massive_hazards = [
            HazardConfig(
                id="blocker",
                name="Impassable Firestorm",
                category=HazardCategory.FIRE,
                x=0.0,
                z=0.0,
                radius=300.0,
                severity=5.0,
                is_active=True,
                blocks_movement=True
            )
        ]
        config = ScenarioConfig(
            scenario_id="trapped_test",
            population=15,
            random_seed=99,
            hazards=massive_hazards
        )
        engine = EvacuationSimulationEngine(city, config)
        engine.step()
        metrics = engine.get_metrics()
        self.assertTrue(metrics.trapped > 0 or metrics.moving == 0)

    def test_geojson_parser_and_validation(self):
        sample_geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"name": "Test Tower", "height": 30.0},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[-74.0, 40.7], [-73.99, 40.7], [-73.99, 40.71], [-74.0, 40.71], [-74.0, 40.7]]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {"name": "Test Exit", "emergency": "exit"},
                    "geometry": {
                        "type": "Point",
                        "coordinates": [-74.0, 40.71]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {"name": "Nested Line", "highway": "primary"},
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[[-74.009, 40.7115], [-74.002, 40.7115]]]
                    }
                }
            ]
        }
        res = parse_and_validate_geojson(sample_geojson, filename="test.geojson")
        self.assertTrue(res.is_valid)
        self.assertEqual(res.building_count, 1)
        self.assertEqual(res.road_count, 1)
        self.assertIsNotNone(res.city_model)

    def test_ai_advisor(self):
        city = create_financial_district_preset()
        config = ScenarioConfig(population=20, random_seed=42)
        engine = EvacuationSimulationEngine(city, config)
        for _ in range(10):
            engine.step()
        advisory = AIAdvisorService.generate_advisory(engine)
        self.assertIn("ResQ AI", advisory.title)
        self.assertIsNotNone(advisory.congestion_assessment)


if __name__ == "__main__":
    unittest.main()
