# GraphHopper API Costs per Route Calculation

## Cost Structure

**All curvature levels cost the same per route calculation: 1 API call**

GraphHopper charges based on API calls, not on route complexity or curvature level. Each route calculation request counts as one API call, regardless of whether you request:
- Straightest route
- Balanced route  
- Curvy route
- Extra Curvy route

## Free Plan Limits

- **500 route calculations per day** (shared across all curvature levels)
- Rate limits: ~10 requests per minute

## How Our Implementation Works

### Straightest Route
- **API Calls**: 1
- Requests alternative routes and selects the straightest one
- Uses basic routing (no custom_model)

### Balanced Route
- **API Calls**: 1
- Requests alternative routes and selects one with moderate curvature
- Uses basic routing (no custom_model)

### Curvy Route
- **API Calls**: 1-2
  - Primary: 1 call (alternative routes)
  - Fallback: +1 call if strategic waypoints are needed (only if alternatives don't match well)
- Uses basic routing with strategic waypoint placement

### Extra Curvy Route
- **API Calls**: 1-2
  - Primary: 1 call (alternative routes)
  - Fallback: +1 call if strategic waypoints are needed (only if alternatives don't match well)
- Uses basic routing with more strategic waypoints

## Cost Optimization

Our implementation is optimized to minimize API calls:
- **Primary strategy**: Request multiple alternative routes in a single API call (max_paths: 5)
- **Fallback strategy**: Only uses additional API calls if the primary strategy doesn't provide a good match
- **Result**: Most routes use only 1 API call, even for curvy routes

## Paid Plans

If you upgrade to a paid GraphHopper plan:
- Higher daily limits (varies by plan)
- Can use custom_model (flexible mode) for more accurate curvature control
- Same cost structure: 1 API call per route calculation regardless of curvature level

