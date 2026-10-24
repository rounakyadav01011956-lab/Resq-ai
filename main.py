import json
import asyncio
from typing import Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, PlainTextResponse

from app.models.schemas import (
    ScenarioConfig, SimulationFrame, GeoJSONValidationResponse,
    AIAdvisoryReport, CityModel
)
from app.services.simulation_service import sim_service
from app.services.ai_advisor import AIAdvisorService
from app.geospatial.geojson_parser import parse_and_validate_geojson
from app.geospatial.blueprint_converter import convert_blueprint_image_to_city

app = FastAPI(
    title="ResQ AI Simulation Engine",
    description="Intelligent Disaster Evacuation & Urban Safety Platform API",
    version="2.0.0"
)

# CORS middleware for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ResQ AI Evacuation Engine",
        "active_city": sim_service.current_city.name,
        "active_population": len(sim_service.engine.agents),
        "step": sim_service.engine.current_step
    }


@app.get("/api/cities/presets")
def get_presets():
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "building_count": len(p.buildings),
            "road_count": len(p.roads),
            "exit_count": len(p.exits)
        }
        for p in sim_service.presets.values()
    ]


@app.get("/api/cities/current", response_model=CityModel)
def get_current_city():
    return sim_service.current_city


@app.post("/api/cities/select/{city_id}")
def select_city(city_id: str):
    try:
        city = sim_service.load_preset(city_id)
        return {"success": True, "city": city}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/geojson/validate-and-load", response_model=GeoJSONValidationResponse)
async def upload_geojson(file: UploadFile = File(...)):
    try:
        content = await file.read()
        fname = (file.filename or "uploaded_data").lower()

        # 1. Detect if the uploaded file is an architectural blueprint image (PNG, JPG, JPEG)
        is_image = (
            fname.endswith((".png", ".jpg", ".jpeg", ".bmp", ".webp")) or
            content.startswith(b"\x89PNG") or
            content.startswith(b"\xff\xd8\xff")
        )
        if is_image:
            res = convert_blueprint_image_to_city(content, filename=file.filename or "blueprint.png")
            if res.is_valid and res.city_model:
                sim_service.set_custom_city(res.city_model)
            return res

        # 2. Otherwise process as GeoJSON (UTF-8 encoded JSON text)
        try:
            text_content = content.decode("utf-8")
        except UnicodeDecodeError:
            return GeoJSONValidationResponse(
                is_valid=False,
                filename=file.filename,
                errors=[
                    f"Binary or non-UTF-8 file detected ('{file.filename}').",
                    "If this is an architectural blueprint, please save it as a standard .png, .jpg, or .jpeg image.",
                    "If this is geographic map data, please ensure it is saved as UTF-8 text (.geojson or .json)."
                ]
            )

        data = json.loads(text_content)
        res = parse_and_validate_geojson(data, filename=file.filename or "upload.geojson")
        
        # If valid and has city_model, automatically activate it
        if res.is_valid and res.city_model:
            sim_service.set_custom_city(res.city_model)
            
        return res
    except json.JSONDecodeError as jde:
        return GeoJSONValidationResponse(
            is_valid=False,
            filename=file.filename,
            errors=[f"Invalid JSON syntax: {str(jde)}. Please check file formatting."]
        )
    except Exception as e:
        return GeoJSONValidationResponse(
            is_valid=False,
            filename=file.filename,
            errors=[f"Failed to process spatial data: {str(e)}"]
        )


@app.get("/api/simulation/frame", response_model=SimulationFrame)
def get_frame():
    return sim_service.get_frame()


@app.post("/api/simulation/config")
def update_config(config: ScenarioConfig):
    sim_service.update_config(config)
    return {"success": True, "frame": sim_service.get_frame()}


@app.post("/api/simulation/step", response_model=SimulationFrame)
def simulation_step():
    return sim_service.step()


@app.post("/api/simulation/pause", response_model=SimulationFrame)
def simulation_pause():
    return sim_service.set_pause(True)


@app.post("/api/simulation/resume", response_model=SimulationFrame)
def simulation_resume():
    return sim_service.set_pause(False)


@app.post("/api/simulation/reset", response_model=SimulationFrame)
def simulation_reset():
    sim_service.reset_simulation()
    return sim_service.get_frame()


@app.get("/api/simulation/comparison")
def get_comparison():
    return sim_service.run_baseline_comparison()


@app.get("/api/simulation/export/csv")
def export_csv():
    csv_data = sim_service.export_csv_report()
    return PlainTextResponse(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=resq_ai_simulation_report.csv"}
    )


@app.get("/api/simulation/export/json")
def export_json():
    frame = sim_service.get_frame().model_dump()
    comp = sim_service.run_baseline_comparison()
    report = {
        "resq_ai_version": "2.0.0",
        "scenario": sim_service.current_config.model_dump(),
        "final_frame": frame,
        "baseline_comparison": comp
    }
    return Response(
        content=json.dumps(report, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=resq_ai_simulation_report.json"}
    )


@app.get("/api/ai/advisory", response_model=AIAdvisoryReport)
def get_ai_advisory():
    return AIAdvisorService.generate_advisory(sim_service.engine)


import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

@app.websocket("/ws/simulation")
async def simulation_websocket(websocket: WebSocket):
    """Real-time streaming websocket for live simulation playback."""
    await websocket.accept()
    try:
        while True:
            # If engine is running and not completed/paused, advance a step
            if not sim_service.engine.is_completed and not sim_service.engine.is_paused:
                sim_service.engine.step()
                
            frame = sim_service.get_frame()
            await websocket.send_json(frame.model_dump())
            
            # Dynamic tick rate
            multiplier = max(0.2, min(5.0, sim_service.current_config.speed_multiplier))
            await asyncio.sleep(0.3 / multiplier)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass


# Check if frontend dist exists
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("ws"):
            raise HTTPException(status_code=404)
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))


