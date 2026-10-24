import heapq
import math
from typing import List, Tuple, Dict, Set, Optional


class SpatialAStar:
    """
    High-performance 2D spatial A* pathfinding engine.
    Supports 4-way and 8-way movement with Octile heuristic and corner-cutting avoidance.
    Integrates dynamic hazard penalties and blocked obstacle masks.
    """
    
    def __init__(self, allow_diagonal: bool = True):
        self.allow_diagonal = allow_diagonal

    def find_path(
        self,
        start_cell: Tuple[int, int],
        goal_cells: List[Tuple[int, int]],
        grid_width: int,
        grid_height: int,
        obstacle_set: Set[Tuple[int, int]],
        hazard_cost_map: Optional[Dict[Tuple[int, int], float]] = None
    ) -> List[Tuple[int, int]]:
        """
        Computes the shortest path from start_cell to nearest goal_cell.
        Returns empty list if no valid path exists (e.g. agent is trapped).
        """
        if not goal_cells:
            return []
            
        goals_set = set(goal_cells)
        if start_cell in goals_set:
            return [start_cell]

        hazard_costs = hazard_cost_map or {}
        
        # Priority Queue: (f_score, counter, current_cell)
        heap = []
        counter = 0
        came_from: Dict[Tuple[int, int], Tuple[int, int]] = {}
        g_score: Dict[Tuple[int, int], float] = {start_cell: 0.0}

        def heuristic(cell: Tuple[int, int]) -> float:
            # Octile or Manhattan distance to closest exit
            r, c = cell
            min_h = float("inf")
            for gr, gc in goal_cells:
                dr = abs(r - gr)
                dc = abs(c - gc)
                if self.allow_diagonal:
                    # Octile distance
                    h = (dr + dc) + (1.41421356 - 2.0) * min(dr, dc)
                else:
                    h = dr + dc
                if h < min_h:
                    min_h = h
            return min_h

        h_start = heuristic(start_cell)
        heapq.heappush(heap, (h_start, counter, start_cell))
        visited: Set[Tuple[int, int]] = set()

        # Movement vectors
        cardinal_dirs = [(-1, 0, 1.0), (1, 0, 1.0), (0, -1, 1.0), (0, 1, 1.0)]
        diagonal_dirs = [(-1, -1, 1.414), (-1, 1, 1.414), (1, -1, 1.414), (1, 1, 1.414)]

        while heap:
            f, _, current = heapq.heappop(heap)
            
            if current in goals_set:
                # Reconstruct path
                path = [current]
                curr = current
                while curr in came_from:
                    curr = came_from[curr]
                    path.append(curr)
                path.reverse()
                return path

            if current in visited:
                continue
            visited.add(current)

            cr, cc = current

            # 1. Cardinal neighbors
            for dr, dc, step_cost in cardinal_dirs:
                nr, nc = cr + dr, cc + dc
                neighbor = (nr, nc)

                if not (0 <= nr < grid_height and 0 <= nc < grid_width):
                    continue
                if neighbor in obstacle_set and neighbor not in goals_set:
                    continue

                add_cost = hazard_costs.get(neighbor, 0.0)
                # If hazard cost is infinite (impassable)
                if add_cost >= 999.0 and neighbor not in goals_set:
                    continue

                tentative_g = g_score[current] + step_cost + add_cost

                if tentative_g < g_score.get(neighbor, float("inf")):
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    counter += 1
                    f_val = tentative_g + heuristic(neighbor)
                    heapq.heappush(heap, (f_val, counter, neighbor))

            # 2. Diagonal neighbors (with corner-cutting prevention)
            if self.allow_diagonal:
                for dr, dc, step_cost in diagonal_dirs:
                    nr, nc = cr + dr, cc + dc
                    neighbor = (nr, nc)

                    if not (0 <= nr < grid_height and 0 <= nc < grid_width):
                        continue
                    if neighbor in obstacle_set and neighbor not in goals_set:
                        continue

                    # Prevent cutting through adjacent orthogonal walls
                    side1 = (cr + dr, cc)
                    side2 = (cr, cc + dc)
                    if side1 in obstacle_set and side2 in obstacle_set:
                        continue

                    add_cost = hazard_costs.get(neighbor, 0.0)
                    if add_cost >= 999.0 and neighbor not in goals_set:
                        continue

                    tentative_g = g_score[current] + step_cost + add_cost

                    if tentative_g < g_score.get(neighbor, float("inf")):
                        came_from[neighbor] = current
                        g_score[neighbor] = tentative_g
                        counter += 1
                        f_val = tentative_g + heuristic(neighbor)
                        heapq.heappush(heap, (f_val, counter, neighbor))

        # No path found (agent is trapped / blocked)
        return []
