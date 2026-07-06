# Current Route Planner Configuration - Backup

## Current Implementation Strategy

### With Overpass API:
- Uses Overpass API to find curved roads (secondary/tertiary/unclassified)
- Queries OpenStreetMap for roads with specific twistiness
- Makes 20-30 Overpass API calls for waypoint routes
- Performance: 50-200 seconds

### Key Methods Using Overpass:
1. `findCurvedRoadsNearPoint()` - Queries Overpass for curved roads
2. `findSecondaryRoadsNearPoint()` - Queries Overpass for secondary roads
3. `findStrategicCurvedWaypoints()` - Uses Overpass to find waypoints along route

### OSRM Strategies Currently Used:
1. `getOSRMAlternatives()` - Gets 3 alternative routes
2. `routeViaWaypoint()` - Routes through single waypoint
3. `generateRoutesWithPerpendicularWaypoints()` - Places waypoints perpendicular to path
4. `generateRoutesViaSecondaryRoads()` - Uses Overpass-found roads as waypoints

## Current Performance:
- Straightest: 0.5-2s (1 OSRM call)
- Mellow (no waypoints): 15-40s (2-4 Overpass + 2-8 OSRM)
- Very Curved (no waypoints): 20-70s (2-4 Overpass + 4-12 OSRM)
- With waypoints: 50-200s (20-30 Overpass + 1-3 OSRM)

## Goal:
Remove Overpass API completely, use only OSRM to achieve:
- Faster response times (target: 5-15 seconds)
- Kurviger-level quality routes
- Better scalability


