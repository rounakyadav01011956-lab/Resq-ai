import math
from typing import Tuple, List, Dict, Any


def wgs84_to_local_meters(lon: float, lat: float, origin_lon: float, origin_lat: float) -> Tuple[float, float]:
    """
    Convert WGS84 Longitude and Latitude to Local Cartesian coordinates (meters).
    Uses Local Equirectangular Projection centered at origin coordinates,
    which provides millimeter precision over metropolitan scales (0-50 km).
    
    Returns (x_meters, z_meters) where:
    +X points East
    +Z points South (standard for 3D graphics camera orientations)
    """
    R = 6378137.0  # Earth's equatorial radius in meters
    rad = math.pi / 180.0
    
    lat_rad = origin_lat * rad
    x = (lon - origin_lon) * rad * R * math.cos(lat_rad)
    # Invert Y to Z so that North is -Z and South is +Z in standard 3D coordinates
    z = -(lat - origin_lat) * rad * R
    return x, z


def compute_centroid_and_scale(coordinates_list: List[Tuple[float, float]]) -> Dict[str, Any]:
    """
    Computes geographic centroid and bounding box from list of (lon, lat) tuples.
    """
    if not coordinates_list:
        return {
            "origin_lon": 0.0,
            "origin_lat": 0.0,
            "min_lon": 0.0,
            "max_lon": 0.0,
            "min_lat": 0.0,
            "max_lat": 0.0,
            "width_m": 100.0,
            "height_m": 100.0
        }
    
    lons = [c[0] for c in coordinates_list if not (math.isnan(c[0]) or math.isinf(c[0]))]
    lats = [c[1] for c in coordinates_list if not (math.isnan(c[1]) or math.isinf(c[1]))]
    
    if not lons or not lats:
        return compute_centroid_and_scale([])
        
    min_lon, max_lon = min(lons), max(lons)
    min_lat, max_lat = min(lats), max(lats)
    
    origin_lon = (min_lon + max_lon) / 2.0
    origin_lat = (min_lat + max_lat) / 2.0
    
    # Calculate span in meters
    dx_m, _ = wgs84_to_local_meters(max_lon, origin_lat, min_lon, origin_lat)
    _, dz_m = wgs84_to_local_meters(origin_lon, max_lat, origin_lon, min_lat)
    
    return {
        "origin_lon": origin_lon,
        "origin_lat": origin_lat,
        "min_lon": min_lon,
        "max_lon": max_lon,
        "min_lat": min_lat,
        "max_lat": max_lat,
        "width_m": abs(dx_m),
        "height_m": abs(dz_m)
    }
