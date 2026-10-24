from typing import List, Dict
from app.models.schemas import CityModel, BuildingData, RoadSegment, ExitConfig, HazardConfig, HazardCategory, Vector3


def create_financial_district_preset() -> CityModel:
    """
    3D Financial District: 16 city blocks with avenues, skyscrapers, and 3 emergency assembly exits.
    Span: 300m x 300m (-150 to +150 in X and Z).
    """
    buildings: List[BuildingData] = []
    
    # 4x4 Grid of city blocks
    block_coords = [-105, -35, 35, 105]
    heights_matrix = [
        [35.0, 48.0, 42.0, 30.0],
        [55.0, 68.0, 62.0, 40.0],
        [60.0, 75.0, 58.0, 38.0],
        [32.0, 45.0, 50.0, 28.0]
    ]
    types_matrix = [
        ["commercial", "office", "office", "commercial"],
        ["office", "skyscraper", "skyscraper", "office"],
        ["office", "skyscraper", "office", "residential"],
        ["residential", "commercial", "office", "residential"]
    ]

    for bi, bx in enumerate(block_coords):
        for bj, bz in enumerate(block_coords):
            w = 42.0
            d = 42.0
            h = heights_matrix[bi][bj]
            btype = types_matrix[bi][bj]
            
            footprint = [
                Vector3(x=bx - w/2, z=bz - d/2),
                Vector3(x=bx + w/2, z=bz - d/2),
                Vector3(x=bx + w/2, z=bz + d/2),
                Vector3(x=bx - w/2, z=bz + d/2),
            ]
            buildings.append(BuildingData(
                id=f"bldg_fin_{bi}_{bj}",
                name=f"Tower {chr(65+bi)}{bj+1}",
                footprint=footprint,
                height=h,
                floors=max(2, int(h / 3.5)),
                building_type=btype
            ))

    # Grid roads (5 avenues E-W, 5 streets N-S)
    roads: List[RoadSegment] = []
    grid_lines = [-140, -70, 0, 70, 140]
    
    for idx, z in enumerate(grid_lines):
        roads.append(RoadSegment(
            id=f"road_ew_{idx}",
            name=f"{idx+1}th Avenue",
            points=[Vector3(x=-150, z=z), Vector3(x=150, z=z)],
            width=10.0 if z == 0 else 7.5,
            road_type="primary" if z == 0 else "secondary"
        ))
        
    for idx, x in enumerate(grid_lines):
        roads.append(RoadSegment(
            id=f"road_ns_{idx}",
            name=f"Central Street {chr(65+idx)}",
            points=[Vector3(x=x, z=-150), Vector3(x=x, z=150)],
            width=10.0 if x == 0 else 7.5,
            road_type="primary" if x == 0 else "secondary"
        ))

    # Exits: North, East, South assembly points
    exits = [
        ExitConfig(id="exit_north", name="North Riverfront Plaza", x=0.0, z=-150.0, capacity_per_sec=3.5),
        ExitConfig(id="exit_east", name="East Metro Safe Zone", x=150.0, z=0.0, capacity_per_sec=3.0),
        ExitConfig(id="exit_south", name="South Highway Assembly", x=0.0, z=150.0, capacity_per_sec=3.5),
    ]

    # Default demonstration hazards
    default_hazards = [
        HazardConfig(
            id="haz_fire_center",
            name="Central Boulevard Fire",
            category=HazardCategory.FIRE,
            x=0.0,
            z=0.0,
            radius=24.0,
            severity=1.0,
            is_active=True,
            blocks_movement=True
        ),
        HazardConfig(
            id="haz_smoke_east",
            name="East Avenue Smoke Plume",
            category=HazardCategory.SMOKE,
            x=70.0,
            z=-35.0,
            radius=20.0,
            severity=0.8,
            is_active=True,
            blocks_movement=True
        )
    ]

    return CityModel(
        id="financial_district",
        name="Metropolis Financial District",
        description="High-density urban commercial center with 16 high-rise towers and wide arterial corridors.",
        bounds={"min_x": -150.0, "max_x": 150.0, "min_z": -150.0, "max_z": 150.0},
        buildings=buildings,
        roads=roads,
        exits=exits,
        default_hazards=default_hazards,
        grid_resolution=2.0
    )


def create_midtown_sector_preset() -> CityModel:
    """
    3D Midtown Urban Sector: Mixed residential & civic district with a diagonal central parkway.
    """
    buildings: List[BuildingData] = []
    
    # Residential and retail blocks
    coords = [
        (-100, -80, 50, 35, 22.0, "residential"),
        (-30, -80, 55, 35, 26.0, "commercial"),
        (50, -80, 60, 35, 30.0, "office"),
        (-100, 0, 45, 45, 18.0, "civic"),
        (60, 0, 50, 45, 24.0, "residential"),
        (-100, 80, 55, 35, 20.0, "residential"),
        (-30, 80, 55, 35, 25.0, "commercial"),
        (50, 80, 60, 35, 28.0, "office")
    ]
    
    for idx, (bx, bz, bw, bd, bh, btype) in enumerate(coords):
        buildings.append(BuildingData(
            id=f"bldg_mid_{idx}",
            name=f"Midtown Block {idx+1}",
            footprint=[
                Vector3(x=bx - bw/2, z=bz - bd/2),
                Vector3(x=bx + bw/2, z=bz - bd/2),
                Vector3(x=bx + bw/2, z=bz + bd/2),
                Vector3(x=bx - bw/2, z=bz + bd/2),
            ],
            height=bh,
            floors=max(1, int(bh / 3.5)),
            building_type=btype
        ))

    roads: List[RoadSegment] = [
        RoadSegment(id="mid_road_n", name="North Parkway", points=[Vector3(x=-140, z=-120), Vector3(x=140, z=-120)], width=8.0),
        RoadSegment(id="mid_road_c", name="Midtown Promenade", points=[Vector3(x=-140, z=0), Vector3(x=140, z=0)], width=10.0),
        RoadSegment(id="mid_road_s", name="South Connector", points=[Vector3(x=-140, z=120), Vector3(x=140, z=120)], width=8.0),
        RoadSegment(id="mid_road_w", name="West End Way", points=[Vector3(x=-140, z=-120), Vector3(x=-140, z=120)], width=8.0),
        RoadSegment(id="mid_road_e", name="East Market Blvd", points=[Vector3(x=140, z=-120), Vector3(x=140, z=120)], width=8.0),
    ]

    exits = [
        ExitConfig(id="exit_nw", name="Northwest Park Evac Gate", x=-140.0, z=-120.0),
        ExitConfig(id="exit_ne", name="Northeast Civic Center", x=140.0, z=-120.0),
        ExitConfig(id="exit_se", name="Southeast Transit Hub", x=140.0, z=120.0),
        ExitConfig(id="exit_sw", name="Southwest Assembly Area", x=-140.0, z=120.0),
    ]

    default_hazards = [
        HazardConfig(
            id="haz_flood_mid",
            name="Promenade Flash Flood",
            category=HazardCategory.FLOOD,
            x=0.0,
            z=0.0,
            radius=32.0,
            severity=1.2,
            is_active=True,
            blocks_movement=True
        )
    ]

    return CityModel(
        id="midtown_sector",
        name="Midtown Urban Sector",
        description="Mixed residential and civic district with central promenade and 4 perimeter safety gates.",
        bounds={"min_x": -150.0, "max_x": 150.0, "min_z": -150.0, "max_z": 150.0},
        buildings=buildings,
        roads=roads,
        exits=exits,
        default_hazards=default_hazards,
        grid_resolution=2.0
    )


def get_all_presets() -> Dict[str, CityModel]:
    return {
        "financial_district": create_financial_district_preset(),
        "midtown_sector": create_midtown_sector_preset(),
    }
