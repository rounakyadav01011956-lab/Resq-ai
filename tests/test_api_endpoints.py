import unittest
from fastapi.testclient import TestClient
from app.main import app

class TestResQAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "ResQ AI Evacuation Engine")

    def test_presets_endpoint(self):
        resp = self.client.get("/api/cities/presets")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(len(data) >= 2)
        preset_ids = [p["id"] for p in data]
        self.assertIn("financial_district", preset_ids)

    def test_current_city_endpoint(self):
        resp = self.client.get("/api/cities/current")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["id"], "financial_district")
        self.assertTrue(len(data["buildings"]) > 0)
        self.assertTrue(len(data["roads"]) > 0)

    def test_simulation_frame_and_step(self):
        # Step forward
        resp = self.client.post("/api/simulation/step")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["step"], 1)
        self.assertEqual(data["metrics"]["current_step"], 1)
        self.assertTrue(len(data["agents"]) > 0)

        # Get current frame
        frame_resp = self.client.get("/api/simulation/frame")
        self.assertEqual(frame_resp.status_code, 200)
        self.assertEqual(frame_resp.json()["step"], 1)

    def test_simulation_reset(self):
        resp = self.client.post("/api/simulation/reset")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["step"], 0)

    def test_ai_advisory(self):
        resp = self.client.get("/api/ai/advisory")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("ResQ AI", data["title"])
        self.assertIsNotNone(data["congestion_assessment"])

    def test_baseline_comparison(self):
        resp = self.client.get("/api/simulation/comparison")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("baseline", data)
        self.assertIn("disrupted", data)
        self.assertIn("deltas", data)

    def test_export_csv_and_json(self):
        csv_resp = self.client.get("/api/simulation/export/csv")
        self.assertEqual(csv_resp.status_code, 200)
        self.assertIn("ResQ AI Evacuation Simulation Summary Report", csv_resp.text)

        json_resp = self.client.get("/api/simulation/export/json")
        self.assertEqual(json_resp.status_code, 200)
        self.assertIn("resq_ai_version", json_resp.text)

    def test_websocket_streaming(self):
        with self.client.websocket_connect("/ws/simulation") as websocket:
            data = websocket.receive_json()
            self.assertIn("step", data)
            self.assertIn("metrics", data)
            self.assertIn("agents", data)

    def test_static_spa_serving(self):
        resp = self.client.get("/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("ResQ AI", resp.text)

if __name__ == "__main__":
    unittest.main()
