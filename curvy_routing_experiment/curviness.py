import math
from typing import List, Dict

# Geometry-based curviness scoring for a road segment
# Each segment is a dict with keys: 'geometry' (list of (lat, lon)), 'road_class', 'length', 'elevation', etc.
def compute_curviness(segment: Dict) -> float:
    # Example: curvature_density = sum(abs(delta_bearing)) / length
    coords = segment['geometry']
    if len(coords) < 3 or segment['length'] == 0:
        return 0.0
    bearings = []
    for i in range(1, len(coords)):
        lat1, lon1 = coords[i-1]
        lat2, lon2 = coords[i]
        dLon = math.radians(lon2 - lon1)
        y = math.sin(dLon) * math.cos(math.radians(lat2))
        x = math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) - math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.cos(dLon)
        bearing = math.atan2(y, x)
        bearings.append(bearing)
    delta_bearings = [abs(bearings[i] - bearings[i-1]) for i in range(1, len(bearings))]
    curvature_density = sum(delta_bearings) / segment['length']
    # Placeholder for direction_entropy, elevation_variance, etc.
    # Combine with weights as in README
    w1, w2, w3, w4 = 1.0, 0.0, 0.0, 0.1
    road_class_penalty = 0.2 if segment['road_class'] in ['MOTORWAY', 'TRUNK'] else 0.0
    curviness_score = w1 * curvature_density - w4 * road_class_penalty
    return max(0.0, min(1.0, curviness_score))

# Example: batch scoring
# segments = [{...}, {...}, ...]
def score_segments(segments: List[Dict]) -> List[float]:
    return [compute_curviness(seg) for seg in segments]
