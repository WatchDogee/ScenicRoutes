# Curvy Routing Experiment

This module implements the hybrid architecture described in the README to recreate Kurviger-like motorcycle routing using GraphHopper as a connector and explicit curviness scoring.

## Structure
- `curviness.py`: Curviness scoring and segment database logic
- `waypoint_selector.py`: Waypoint selection and route construction
- `test_curvy_routing.py`: Test suite for all profiles
- `README.md`: Experiment summary and architecture

## Next Steps
- Implement geometry-based curviness scoring
- Build segment database (can be mocked for initial tests)
- Integrate waypoint selection logic
- Test with GraphHopper API

