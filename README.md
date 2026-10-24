# 🛡️ ResQ AI (EvacuAI v2.0)
### Intelligent 3D Disaster Evacuation & Urban Safety Platform

**ResQ AI** is a real-time, interactive 3D digital-twin evacuation simulator designed for emergency operations planning, crowd safety analysis, and architectural bottleneck evaluation.

---

## 🌟 Key Features

1. **Genuine 3D WebGL Urban Digital Twin**:
   - Built on Three.js: 3D extruded architectural buildings with floor heights and type categorization (commercial, hospital, residential, office).
   - 3D road networks with asphalt surfacing and lane markings.
   - Ground grid, dynamic shadows, ambient skylight, and atmospheric emergency fog.
   - Orbit controls, top-down tactical 2D plan view, isometric view, street-level view, and layer toggles.

2. **Realistic 3D Humanoid Agents**:
   - Low-poly procedural 3D humanoids with walking animation kinematics (oscillating legs and swinging arms synchronized to speed).
   - Dynamic heading orientation aligned with route velocity vector.
   - Status beacon glow rings around feet:
     - 🔵 **Cyan**: Moving along escape trajectory
     - 🟢 **Green**: Safely evacuated through exit
     - 🟡 **Amber**: Queued at doorway / corridor bottleneck
     - 🔴 **Red**: Trapped / cut off by impassable hazards
   - Click-to-inspect drawer: Click any agent in 3D to monitor their target exit, coordinates, distance travelled, and queue wait cycles.

3. **Multi-Agent Spatial Pathfinding & Crowd Arbitration**:
   - Preserves and enhances the core A* pathfinding algorithm with 8-way diagonal movement and corner-cutting barrier checks.
   - Strict physical space occupancy resolution: no two occupants can occupy the same cell.
   - Doorway & corridor bottleneck contention accounting: accumulates wait cycles to surface high-risk crowd crush points.

4. **Dynamic 3D Hazards & Disaster Scenarios**:
   - Configurable disaster threats:
     - 🔥 **Fire & Explosive Combustion**: Animated pulsing flame cylinder with core light source.
     - ☁️ **Toxic Smoke Plume**: Volumetric rotating plume with reduced visibility.
     - 🌊 **Flash Flood**: Shimmering translucent water plane.
     - 🚧 **Structural Roadblock**: Striped barricade obstacle.
   - Hazards actively influence A* pathfinding (dynamic cost penalties and impassable masking).

5. **Real-world GeoJSON Import & Validation**:
   - Upload any `.geojson` or `.json` file via drag-and-drop.
   - Automatic coordinate projection from WGS84 (lat/lon) into metric Cartesian space.
   - Extrudes polygons into 3D buildings, maps LineStrings to walkable road networks, and assigns safety assembly gates.
   - Includes one-click test sample loader: `sample_evacuation_district.geojson`.

6. **Live Analytics & Comparative Reporting**:
   - Evacuation progression curve (evacuated vs. remaining occupants over time).
   - Exit doorway utilization bar chart (identifies overloaded vs underutilized exits).
   - Side-by-side **Baseline vs. Disrupted Scenario** comparison table with delta indicators.
   - One-click **Export to CSV** and **Export to JSON**.

7. **ResQ AI Tactical Safety Advisory**:
   - Evidence-based advisory that analyzes doorway queuing contention and exit load imbalance ratios.
   - Actionable recommendations for directional signage, corridor widening, and hazard bypass staging.

---

## ⚡ Quick Start on Windows

### Option 1: One-Click Launch (Recommended)
Simply double-click:
```bat
run_resq_ai.bat
```
This automatically starts the backend server on `http://localhost:8000` and launches your default web browser displaying the 3D application.

---

### Option 2: Manual Startup

#### 1. Activate Virtual Environment
```powershell
# From the project root
.\.venv\Scripts\Activate.ps1
```

#### 2. Run Backend Server
```powershell
cd resq-ai\backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Open **http://localhost:8000** in your browser.

#### 3. (Optional) Run Frontend in Hot-Reload Development Mode
```powershell
cd resq-ai\frontend
npm run dev
```
Open **http://localhost:5173** (requests will be automatically proxied to backend on port 8000).

---

## 🧪 Automated Test Suite

Run the full backend and API test suite:

```powershell
cd resq-ai\backend

# 1. Simulation engine & algorithm tests (5 tests)
python -m unittest tests/test_simulation.py

# 2. Complete REST API, WebSocket & SPA delivery tests (10 tests)
python -m unittest tests/test_api_endpoints.py
```

Run frontend TypeScript build check:
```powershell
cd resq-ai\frontend
npm run build
```

---

## 📐 Project Structure

```
resq-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI application, REST endpoints, WebSocket & SPA server
│   │   ├── models/
│   │   │   └── schemas.py             # Pydantic data schemas
│   │   ├── geospatial/
│   │   │   ├── projection.py          # WGS84 to local metric projection
│   │   │   └── geojson_parser.py      # Multi-geometry parser & 3D city converter
│   │   ├── simulation/
│   │   │   ├── pathfinding.py         # 8-way spatial A* algorithm with hazard masking
│   │   │   ├── engine.py              # Discrete agent evacuation & collision engine
│   │   │   └── presets.py             # Demonstration cities (Financial District, Midtown)
│   │   └── services/
│   │       ├── simulation_service.py  # Simulation lifecycle & baseline comparison runner
│   │       └── ai_advisor.py          # Evidence-based tactical safety advisor
│   ├── tests/
│   │   ├── test_simulation.py         # Engine unit tests
│   │   └── test_api_endpoints.py      # REST & WebSocket integration tests
│   └── requirements.txt               # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── scene/
│   │   │   └── City3DViewport.tsx     # Three.js 3D WebGL scene with animated humanoid agents
│   │   ├── components/
│   │   │   ├── Header.tsx             # Brand, city selector, status indicators
│   │   │   ├── MetricsBar.tsx         # 7 live KPI cards + evacuation progress bar
│   │   │   ├── PlaybackControls.tsx   # Play, pause, step, speed slider, seed input
│   │   │   ├── GeoJSONUploadModal.tsx # Drag-and-drop upload & geometry validation
│   │   │   ├── HazardConfigModal.tsx  # Add/edit/remove Fire, Smoke, Flood, Roadblock
│   │   │   ├── AnalyticsModal.tsx     # Charts, progression curve, baseline comparison & export
│   │   │   ├── AIAdvisorModal.tsx     # AI safety assessment & bottleneck diagnostics
│   │   │   ├── AboutModal.tsx         # Scientific methodology & disclaimer
│   │   │   └── ErrorBoundary.tsx      # Blank-screen interception boundary
│   │   ├── services/
│   │   │   └── api.ts                 # REST client & WebSocket streaming connection
│   │   ├── types/
│   │   │   └── simulation.ts          # TypeScript type definitions
│   │   ├── App.tsx                    # Root dashboard application
│   │   └── index.css                  # Tailwind styles & emergency theme
│   ├── package.json
│   └── vite.config.ts
├── data/
│   └── samples/
│       └── sample_evacuation_district.geojson # Sample GeoJSON for testing
├── run_resq_ai.bat                    # One-click Windows launcher
└── README.md
```

---

## 🔬 Scientific Methodology & Disclaimer

- **Movement Speed**: Modeled as approximately 1.3 m/s (~4.7 km/h), standard unimpeded walking speed in urban thoroughfares.
- **Doorway Flow Limit**: Modeled at discrete spatial cell resolution (2.0 meters) where queue wait cycles accumulate when local density exceeds doorway passage rates.
- **Educational / Prototype Status**: ResQ AI is developed for educational exploration, technology demonstration, and scenario risk assessment. It is **not** an officially certified architectural life-safety engineering platform or regulatory emergency guidance system.
