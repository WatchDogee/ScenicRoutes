# Route Usage Analytics - How It Works

**Date:** $(date)  
**Status:** ✅ Backend Implemented, ⚠️ Frontend UI Missing

---

## 📊 **Overview**

Route usage analytics tracks every route calculation made by users. This data is used for:
- **Usage Statistics** - Show users their route planning activity
- **Subscription Value** - Help users understand their subscription benefits
- **Analytics Dashboard** - Premium feature showing detailed insights
- **Future Features** - Data for ride recording, route recommendations, etc.

---

## 🗄️ **Database Schema**

### **Table: `route_usages`**

```sql
CREATE TABLE route_usages (
    id BIGINT PRIMARY KEY,
    user_id BIGINT (foreign key to users),
    saved_road_id BIGINT (nullable, foreign key to saved_roads),
    route_type VARCHAR, -- 'graphhopper', 'round_trip', 'curved', 'straightest'
    curvature_level VARCHAR (nullable), -- 'straightest', 'curvy', 'extra_curvy'
    waypoints_count INTEGER (default: 2),
    distance_km DECIMAL(10,2) (nullable),
    used_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX (user_id, used_at),
    INDEX (user_id, route_type),
    INDEX (used_at)
);
```

### **Data Stored Per Route Calculation:**

| Field | Description | Example |
|-------|-------------|---------|
| `user_id` | User who calculated the route | `123` |
| `saved_road_id` | If route used saved roads | `456` or `null` |
| `route_type` | Type of route calculation | `'graphhopper'`, `'round_trip'` |
| `curvature_level` | Curvature level used | `'curvy'`, `'extra_curvy'`, `'straightest'` |
| `waypoints_count` | Number of waypoints | `2` (start + end), `5` (with waypoints) |
| `distance_km` | Route distance in kilometers | `125.5` |
| `used_at` | When route was calculated | `2025-01-15 10:30:00` |

---

## 🔄 **How It Works - Flow**

### **1. Route Calculation (Automatic Tracking)**

When a user calculates a route, usage is automatically recorded:

```php
// app/Http/Controllers/RouteController.php

// After successful route calculation:
$user = $request->user();
if ($user) {
    $this->subscriptionService->recordRouteUsage($user, [
        'route_type' => 'graphhopper',
        'curvature_level' => $curvatureLevel, // e.g., 'curvy'
        'waypoints_count' => count($waypoints) + 2, // start + end + waypoints
        'distance_km' => $route['distance'] / 1000, // Convert meters to km
    ]);
}
```

### **2. Recording Usage (SubscriptionService)**

```php
// app/Services/SubscriptionService.php

public function recordRouteUsage(User $user, array $data): RouteUsage
{
    return RouteUsage::create([
        'user_id' => $user->id,
        'saved_road_id' => $data['saved_road_id'] ?? null,
        'route_type' => $data['route_type'] ?? 'graphhopper',
        'curvature_level' => $data['curvature_level'] ?? null,
        'waypoints_count' => $data['waypoints_count'] ?? 2,
        'distance_km' => $data['distance_km'] ?? null,
        'used_at' => now(),
    ]);
}
```

### **3. Retrieving Statistics**

```php
// app/Services/SubscriptionService.php

public function getUsageStats(User $user, string $period = 'month'): array
{
    $startDate = match($period) {
        'day' => now()->startOfDay(),
        'week' => now()->startOfWeek(),
        'month' => now()->startOfMonth(),
        'year' => now()->startOfYear(),
        default => now()->startOfMonth(),
    };
    
    $usages = RouteUsage::where('user_id', $user->id)
        ->where('used_at', '>=', $startDate)
        ->get();
    
    return [
        'total' => $usages->count(),
        'by_type' => $usages->groupBy('route_type')->map->count()->toArray(),
        'by_curvature' => $usages->whereNotNull('curvature_level')
            ->groupBy('curvature_level')
            ->map->count()
            ->toArray(),
        'total_distance_km' => $usages->sum('distance_km') ?? 0,
        'period' => $period,
        'start_date' => $startDate->toIso8601String(),
    ];
}
```

---

## 📈 **What Data Is Tracked**

### **Route Types Tracked:**
1. **`graphhopper`** - Standard route calculation
2. **`round_trip`** - Round trip routes
3. **`curved`** - Curved route calculations
4. **`straightest`** - Straightest route calculations

### **Where Usage Is Recorded:**
- ✅ `RouteController::calculate()` - Standard routes
- ✅ `RouteController::roundTrip()` - Round trip routes
- ✅ `RouteController::graphhopperSegmentCurvature()` - Section-specific curvature

### **Data Captured:**
- ✅ Route type (graphhopper, round_trip, etc.)
- ✅ Curvature level (straightest, curvy, extra_curvy)
- ✅ Number of waypoints
- ✅ Route distance (in kilometers)
- ✅ Timestamp of calculation
- ✅ Associated saved road (if used)

---

## 📊 **Statistics Available**

### **Current Statistics (Backend):**

```json
{
  "total": 45,
  "by_type": {
    "graphhopper": 30,
    "round_trip": 15
  },
  "by_curvature": {
    "curvy": 20,
    "extra_curvy": 10,
    "straightest": 15
  },
  "total_distance_km": 1250.5,
  "period": "month",
  "start_date": "2025-01-01T00:00:00Z"
}
```

### **Periods Supported:**
- `day` - Today's usage
- `week` - This week's usage
- `month` - This month's usage (default)
- `year` - This year's usage

---

## 🔌 **API Endpoint**

### **Get Usage Statistics**

**Endpoint:** `GET /api/subscriptions/usage?period=month`

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "total": 45,
  "by_type": {
    "graphhopper": 30,
    "round_trip": 15
  },
  "by_curvature": {
    "curvy": 20,
    "extra_curvy": 10,
    "straightest": 15
  },
  "total_distance_km": 1250.5,
  "period": "month",
  "start_date": "2025-01-01T00:00:00Z"
}
```

**Usage:**
```javascript
// Frontend example
const response = await apiClient.get('/subscriptions/usage?period=month');
const stats = response.data;

console.log(`Total routes: ${stats.total}`);
console.log(`Total distance: ${stats.total_distance_km} km`);
console.log(`By type:`, stats.by_type);
console.log(`By curvature:`, stats.by_curvature);
```

---

## 🎨 **Frontend UI (Missing - Needs Implementation)**

### **What Should Be Built:**

1. **Usage Statistics Page** (`resources/js/Pages/UsageStats.jsx`)
   - Total routes calculated
   - Total distance traveled
   - Routes by type (graph, round trip, etc.)
   - Routes by curvature level
   - Time period selector (day/week/month/year)
   - Charts/graphs for visualization

2. **Usage Charts Component** (`resources/js/Components/UsageCharts.jsx`)
   - Bar chart for routes by type
   - Pie chart for curvature distribution
   - Line chart for usage over time
   - Distance chart

3. **Route History List**
   - List of recent route calculations
   - Filters (by type, curvature, date range)
   - Export to CSV/JSON (premium)

---

## 📝 **Example Usage Statistics UI**

```jsx
// resources/js/Pages/UsageStats.jsx

import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import UsageCharts from '../Components/UsageCharts';

export default function UsageStats({ auth }) {
    const [stats, setStats] = useState(null);
    const [period, setPeriod] = useState('month');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, [period]);

    const loadStats = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/subscriptions/usage?period=${period}`);
            setStats(response.data);
        } catch (error) {
            console.error('Failed to load usage stats', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!stats) return <div>No data available</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Route Usage Statistics</h1>
            
            {/* Period Selector */}
            <div className="mb-4">
                <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                    <option value="day">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded shadow">
                    <h3 className="text-sm text-gray-600">Total Routes</h3>
                    <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="bg-white p-4 rounded shadow">
                    <h3 className="text-sm text-gray-600">Total Distance</h3>
                    <p className="text-2xl font-bold">{stats.total_distance_km.toFixed(1)} km</p>
                </div>
                <div className="bg-white p-4 rounded shadow">
                    <h3 className="text-sm text-gray-600">Avg Distance</h3>
                    <p className="text-2xl font-bold">
                        {stats.total > 0 
                            ? (stats.total_distance_km / stats.total).toFixed(1) 
                            : 0} km
                    </p>
                </div>
            </div>

            {/* Charts */}
            <UsageCharts stats={stats} />
        </div>
    );
}
```

---

## 🔍 **What Can Be Analyzed**

### **Current Capabilities:**
- ✅ Total routes calculated (by period)
- ✅ Routes by type (graphhopper, round_trip, etc.)
- ✅ Routes by curvature level
- ✅ Total distance traveled
- ✅ Average distance per route

### **Future Enhancements (Can Add):**
- ⚠️ Routes by day of week
- ⚠️ Routes by time of day
- ⚠️ Most used saved roads
- ⚠️ Route calculation trends over time
- ⚠️ Geographic distribution (if start/end points stored)
- ⚠️ Route calculation success rate
- ⚠️ Average calculation time
- ⚠️ Most popular curvature levels

---

## 🎯 **Use Cases**

### **1. User Dashboard**
Show users their activity:
- "You've planned 45 routes this month"
- "Total distance: 1,250 km"
- "Most used: Curvy routes (20 routes)"

### **2. Subscription Value**
Help users understand subscription benefits:
- "Premium users average 50 routes/month"
- "You've saved $X by using Premium features"

### **3. Analytics Dashboard (Premium Feature)**
Detailed insights:
- Charts showing usage trends
- Route type preferences
- Distance traveled over time
- Export usage data

### **4. Future Features**
- Route recommendations based on history
- Ride recording integration
- Social features (compare with friends)
- Achievement badges

---

## 🔧 **Technical Details**

### **Performance Considerations:**
- ✅ Indexed on `user_id` and `used_at` for fast queries
- ✅ Indexed on `user_id` and `route_type` for filtering
- ⚠️ Consider archiving old data (> 1 year) for performance
- ⚠️ Consider caching statistics for frequently accessed periods

### **Data Retention:**
- Currently: All data is kept indefinitely
- Recommendation: Archive data older than 2 years
- Consider: Aggregate older data into monthly summaries

### **Privacy:**
- ✅ Only tracks authenticated users
- ✅ Data is user-specific (filtered by user_id)
- ✅ No personal location data stored (only distance)
- ⚠️ Consider: Add option to delete usage history

---

## 📋 **Implementation Status**

### **Backend:** ✅ **100% Complete**
- ✅ Database table created
- ✅ Model exists (`RouteUsage`)
- ✅ Service method (`recordRouteUsage`)
- ✅ Statistics method (`getUsageStats`)
- ✅ API endpoint (`/api/subscriptions/usage`)
- ✅ Automatic tracking in RouteController

### **Frontend:** ❌ **0% Complete**
- ❌ Usage statistics page
- ❌ Usage charts component
- ❌ Route history list
- ❌ Export functionality

---

## 🚀 **Next Steps**

### **To Complete Route Usage Analytics:**

1. **Create Usage Statistics Page** (3-5 days)
   - `resources/js/Pages/UsageStats.jsx`
   - Display summary cards
   - Period selector
   - Route history list

2. **Create Usage Charts Component** (2-3 days)
   - `resources/js/Components/UsageCharts.jsx`
   - Bar charts (routes by type)
   - Pie charts (curvature distribution)
   - Line charts (usage over time)
   - Use Chart.js or Recharts library

3. **Add Navigation Link** (1 day)
   - Add link to usage stats in user menu
   - Add to subscription page

4. **Add Export Feature** (1-2 days)
   - Export to CSV
   - Export to JSON
   - Premium feature

**Total Effort:** 7-11 days

---

## 💡 **Key Points**

1. **Automatic Tracking** - Usage is recorded automatically when routes are calculated
2. **No User Action Required** - Users don't need to do anything
3. **Privacy-Friendly** - Only tracks metadata, not actual route coordinates
4. **Backend Complete** - All tracking and statistics logic is done
5. **Frontend Missing** - Need to build UI to display statistics
6. **Premium Feature** - Can be gated as Premium/Pro feature

---

## 📊 **Example Statistics Output**

```json
{
  "total": 45,
  "by_type": {
    "graphhopper": 30,
    "round_trip": 15
  },
  "by_curvature": {
    "curvy": 20,
    "extra_curvy": 10,
    "straightest": 15
  },
  "total_distance_km": 1250.5,
  "period": "month",
  "start_date": "2025-01-01T00:00:00Z"
}
```

**Interpretation:**
- User calculated 45 routes this month
- 30 were standard routes, 15 were round trips
- 20 used "curvy" level, 10 used "extra_curvy", 15 used "straightest"
- Total distance: 1,250.5 km
- Average distance per route: ~27.8 km

---

## 🎯 **Summary**

**Route Usage Analytics:**
- ✅ **Backend:** Fully implemented and working
- ✅ **Tracking:** Automatic on every route calculation
- ✅ **API:** Endpoint available (`/api/subscriptions/usage`)
- ❌ **Frontend:** UI needs to be built
- ⚠️ **Priority:** HIGH (adds value, not critical for port)

**What's Working:**
- Data is being collected automatically
- Statistics can be retrieved via API
- All route types are tracked

**What's Missing:**
- Frontend UI to display statistics
- Charts/visualizations
- Route history list
- Export functionality




