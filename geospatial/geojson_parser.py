import json
import uuid
import math
from typing import Dict, Any, List, Tuple, Optional
from collections import Counter
from app.models.schemas import (
    CityModel, BuildingData, RoadSegment, ExitConfig, Vector3,
    GeoJSONValidationResponse, HazardConfig
)
from app.geospatial.projection import wgs84_to_local_meters, compute_centroid_and_scale


def safe_extract_xy(pt: Any) -> Optional[Tuple[float, float]]:
    """Safely extracts (x, y) as floats from any arbitrary point format or nested list."""
    if not isinstance(pt, (list, tuple)):
        return None
    # If pt is [[x, y]] unwrap it
    while len(pt) == 1 and isinstance(pt[0], (list, tuple)):
        pt = pt[0]
    if len(pt) >= 2:
        try:
            x = float(pt[0])
            y = float(pt[1])
            if not (math.isnan(x) or math.isnan(y) or math.isinf(x) or math.isinf(y)):
                return (x, y)
        except (ValueError, TypeError):
            return None
    return None


def extract_all_coordinates(geom: Dict[str, Any], coords_out: List[Tuple[float, float]]):
    """Recursively and defensively extract all (lon, lat) pairs from any GeoJSON geometry."""
    if not geom or not isinstance(geom, dict):
        return
    c = geom.get("coordinates")
    if not c:
        return

    def recurse_coords(obj: Any):
        pt = safe_extract_xy(obj)
        if pt is not None:
            coords_out.append(pt)
            return
        if isinstance(obj, (list, tuple)):
            for item in obj:
                recurse_coords(item)

    if geom.get("type") == "GeometryCollection":
        for child in geom.get("geometries", []):
            extract_all_coordinates(child, coords_out)
    else:
        recurse_coords(c)


def parse_and_validate_geojson(geojson_dict: Dict[str, Any], filename: str = "upload.geojson") -> GeoJSONValidationResponse:
    errors = []
    warnings = []
    
    if not isinstance(geojson_dict, dict):
        return GeoJSONValidationResponse(
            is_valid=False,
            filename=filename,
            errors=["The uploaded file is not a valid JSON object."]
        )
        
    g_type = geojson_dict.get("type")
    features = []
    
    if g_type == "FeatureCollection":
        features = geojson_dict.get("features", [])
    elif g_type == "Feature":
        features = [geojson_dict]
    elif g_type in ("Point", "MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon", "GeometryCollection"):
        features = [{"type": "Feature", "properties": {}, "geometry": geojson_dict}]
    else:
        errors.append(f"Unrecognized GeoJSON root type: '{g_type}'. Expected FeatureCollection, Feature, or standard Geometry.")
        return GeoJSONValidationResponse(is_valid=False, filename=filename, errors=errors)
        
    if not features:
        return GeoJSONValidationResponse(
            is_valid=False,
            filename=filename,
            errors=["GeoJSON contains no features."]
        )
        
    # Gather coordinates to compute reference origin
    all_raw_coords: List[Tuple[float, float]] = []
    geom_types = Counter()
    valid_features = []
    
    for f in features:
        if not isinstance(f, dict):
            continue
        geom = f.get("geometry")
        if not geom or not isinstance(geom, dict):
            continue
        gtype = geom.get("type", "Unknown")
        geom_types[gtype] += 1
        valid_features.append(f)
        extract_all_coordinates(geom, all_raw_coords)
        
    if not valid_features or not all_raw_coords:
        return GeoJSONValidationResponse(
            is_valid=False,
            filename=filename,
            errors=["No valid geometry coordinates found in any feature."]
        )
        
    # Check if coordinates look like Longitude / Latitude (-180..180, -90..90)
    is_wgs84 = all(
        -180.0 <= c[0] <= 180.0 and -90.0 <= c[1] <= 90.0
        for c in all_raw_coords[:500]
    )
    
    geo_meta = compute_centroid_and_scale(all_raw_coords)
    origin_lon = geo_meta["origin_lon"]
    origin_lat = geo_meta["origin_lat"]
    
    if not is_wgs84:
        warnings.append("Coordinates appear to be pre-projected Cartesian meters rather than WGS84 lat/long. Using direct offset mapping.")
        
    buildings: List[BuildingData] = []
    roads: List[RoadSegment] = []
    exits: List[ExitConfig] = []
    
    min_x, max_x = float("inf"), float("-inf")
    min_z, max_z = float("inf"), float("-inf")
    
    def transform_pt(lon: float, lat: float) -> Tuple[float, float]:
        if is_wgs84:
            return wgs84_to_local_meters(lon, lat, origin_lon, origin_lat)
        else:
            return lon - origin_lon, lat - origin_lat

    for i, f in enumerate(valid_features):
        props = f.get("properties") or {}
        geom = f.get("geometry", {})
        gtype = geom.get("type")
        c = geom.get("coordinates")
        fid = str(f.get("id") or props.get("id") or f"feat_{i}")
        name = props.get("name") or props.get("highway") or props.get("building") or f"Object {i+1}"
        
        # 1. POLYGONS -> 3D Extruded Buildings
        if gtype in ("Polygon", "MultiPolygon") and c:
            # Flatten or unnest polygon rings
            poly_list = [c] if gtype == "Polygon" else c
            for poly_idx, poly in enumerate(poly_list):
                if not poly:
                    continue
                # The outer ring is usually poly[0], but if poly is a list of points directly, handle both
                first_elem = poly[0]
                ring = first_elem if (isinstance(first_elem, list) and first_elem and isinstance(first_elem[0], list)) else poly
                
                transformed_pts = []
                for p_raw in ring:
                    pt = safe_extract_xy(p_raw)
                    if pt:
                        x, z = transform_pt(pt[0], pt[1])
                        transformed_pts.append(Vector3(x=round(x, 2), y=0.0, z=round(z, 2)))
                        min_x, max_x = min(min_x, x), max(max_x, x)
                        min_z, max_z = min(min_z, z), max(max_z, z)
                        
                if len(transformed_pts) < 3:
                    continue
                    
                # Height calculation
                raw_h = props.get("height") or props.get("building:levels") or props.get("levels")
                height = 14.0
                if raw_h:
                    try:
                        val = float(str(raw_h).replace("m", "").strip())
                        height = val if val > 10 else val * 3.5
                    except Exception:
                        height = 16.0
                else:
                    height = 12.0 + ((i * 7 + poly_idx * 13) % 24)
                    
                buildings.append(BuildingData(
                    id=f"{fid}_p{poly_idx}",
                    name=str(name),
                    footprint=transformed_pts,
                    height=round(height, 1),
                    floors=max(1, int(height / 3.5)),
                    building_type=str(props.get("building") or "commercial")
                ))

        # 2. LINESTRINGS -> 3D Road Network
        elif gtype in ("LineString", "MultiLineString") and c:
            line_list = [c] if gtype == "LineString" else c
            for line_idx, raw_line in enumerate(line_list):
                if not raw_line:
                    continue
                # If raw_line is nested e.g. [[pt1, pt2]], unwrap it
                line_pts = raw_line
                while len(line_pts) == 1 and isinstance(line_pts[0], list) and len(line_pts[0]) > 0 and isinstance(line_pts[0][0], list):
                    line_pts = line_pts[0]

                pts = []
                for p_raw in line_pts:
                    pt = safe_extract_xy(p_raw)
                    if pt:
                        x, z = transform_pt(pt[0], pt[1])
                        pts.append(Vector3(x=round(x, 2), y=0.0, z=round(z, 2)))
                        min_x, max_x = min(min_x, x), max(max_x, x)
                        min_z, max_z = min(min_z, z), max(max_z, z)
                        
                if len(pts) < 2:
                    continue
                    
                road_type = str(props.get("highway") or "road")
                width = 10.0 if "primary" in road_type or "trunk" in road_type else 6.5
                roads.append(RoadSegment(
                    id=f"{fid}_l{line_idx}",
                    name=str(name),
                    points=pts,
                    width=width,
                    road_type=road_type
                ))

        # 3. POINTS -> Safe Exits / Points of Interest
        elif gtype == "Point" and c:
            pt = safe_extract_xy(c)
            if pt:
                x, z = transform_pt(pt[0], pt[1])
                min_x, max_x = min(min_x, x), max(max_x, x)
                min_z, max_z = min(min_z, z), max(max_z, z)
                if "exit" in name.lower() or "shelter" in name.lower() or "safe" in name.lower() or props.get("emergency"):
                    exits.append(ExitConfig(
                        id=fid,
                        name=str(name),
                        x=round(x, 2),
                        z=round(z, 2),
                        capacity_per_sec=3.0
                    ))

    if math.isinf(min_x) or math.isinf(max_x):
        min_x, max_x = -150.0, 150.0
        min_z, max_z = -150.0, 150.0
        
    # Auto-generate perimeter exits if none were explicitly specified
    if not exits:
        warnings.append("No explicit emergency exit points found in GeoJSON. Placed 4 perimeter safety assembly points automatically.")
        pad_x = (max_x - min_x) * 0.05
        pad_z = (max_z - min_z) * 0.05
        exits = [
            ExitConfig(id="exit_north", name="North Assembly Plaza", x=round((min_x + max_x) / 2, 2), z=round(min_z - pad_x, 2)),
            ExitConfig(id="exit_south", name="South Safety Gate", x=round((min_x + max_x) / 2, 2), z=round(max_z + pad_x, 2)),
            ExitConfig(id="exit_east", name="East Perimeter Exit", x=round(max_x + pad_x, 2), z=round((min_z + max_z) / 2, 2)),
            ExitConfig(id="exit_west", name="West Riverfront Evac Zone", x=round(min_x - pad_x, 2), z=round((min_z + max_z) / 2, 2)),
        ]

    # If no roads were found, provide fallback walkable road network
    if not roads:
        warnings.append("No road lines detected in GeoJSON. Generated an arterial grid road network between buildings.")
        cx = (min_x + max_x) / 2
        cz = (min_z + max_z) / 2
        roads.append(RoadSegment(
            id="road_ns_main",
            name="Main North-South Avenue",
            points=[Vector3(x=cx, z=min_z), Vector3(x=cx, z=max_z)],
            width=8.0
        ))
        roads.append(RoadSegment(
            id="road_ew_main",
            name="Central Boulevard",
            points=[Vector3(x=min_x, z=cz), Vector3(x=max_x, z=cz)],
            width=8.0
        ))

    # Automatic Central Hazard for instant disaster simulation
    cx = round((min_x + max_x) / 2, 2)
    cz = round((min_z + max_z) / 2, 2)
    fire_radius = round(max(20.0, (max_x - min_x) * 0.12), 1)
    default_hazards = [
        HazardConfig(
            id="hazard_geojson_fire_1",
            name="Downtown Emergency Fire Zone",
            category="fire",
            x=cx,
            z=cz,
            radius=fire_radius,
            severity=1.0,
            is_active=True,
            blocks_movement=True
        )
    ]

    city = CityModel(
        id=f"city_{uuid.uuid4().hex[:8]}",
        name=filename.replace(".geojson", "").replace(".json", "").replace("_", " ").title(),
        description=f"Generated from {filename} with {len(buildings)} buildings and {len(roads)} road corridors.",
        bounds={
            "min_x": round(min_x, 2),
            "max_x": round(max_x, 2),
            "min_z": round(min_z, 2),
            "max_z": round(max_z, 2)
        },
        buildings=buildings,
        roads=roads,
        exits=exits,
        default_hazards=default_hazards,
        grid_resolution=2.0
    )

    return GeoJSONValidationResponse(
        is_valid=True,
        filename=filename,
        feature_count=len(valid_features),
        geometry_distribution=dict(geom_types),
        building_count=len(buildings),
        road_count=len(roads),
        detected_bounds=city.bounds,
        errors=errors,
        warnings=warnings,
        city_model=city
    )
