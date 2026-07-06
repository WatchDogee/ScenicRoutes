from typing import List, Dict, Tuple
import random

def select_curvy_waypoints(start: Tuple[float, float], end: Tuple[float, float], segments: List[Dict], level: str) -> List[Tuple[float, float]]:
    # Level thresholds from README
    levels = {
        'fast': {'min_score': 0.2, 'segments': 1, 'max_detour_ratio': 1.1},
        'fast_curvy': {'min_score': 0.45, 'segments': 2, 'max_detour_ratio': 1.3},
        'very_curvy': {'min_score': 0.7, 'segments': 4, 'max_detour_ratio': 1.8},
    }
    params = levels[level]
    # Filter segments by curviness
    candidates = [s for s in segments if s['curviness_score'] >= params['min_score']]
    # Sort by projection along A->B axis (placeholder: random)
    selected = random.sample(candidates, min(params['segments'], len(candidates))) if candidates else []
    waypoints = [start] + [s['center'] for s in selected] + [end]
    return waypoints
