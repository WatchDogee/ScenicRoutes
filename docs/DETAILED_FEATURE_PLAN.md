# Detailed Feature Implementation Plan
## Based on Obsidian Notes, Kurviger & Calimoto Analysis

---

## 📋 Table of Contents
1. [Current Status & Completed Features](#current-status)
2. [Phase 1: Immediate Features (Weeks 1-4)](#phase-1)
3. [Phase 2: Core Competitive Features (Weeks 5-12)](#phase-2)
4. [Phase 3: Advanced Features (Months 4-6)](#phase-3)
5. [Phase 4: Premium & Differentiation (Months 7-12)](#phase-4)
6. [Technical Specifications](#technical-specs)
7. [Database Schema Changes](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [UI/UX Specifications](#ui-ux-specs)
10. [Testing Requirements](#testing)

---

## 📊 Current Status & Completed Features {#current-status}

### ✅ **Recently Completed**
1. **Avoid Roads Feature** ✅
   - Backend: GraphHopper integration with `avoid_options` parameter
   - Frontend: Checkboxes (highways, unpaved, tolls, ferries)
   - Files: `RoutePlanner.jsx`, `GraphHopperService.php`, `RouteController.php`

2. **POI Integration** ✅
   - Search POIs (Tourism, Fuel, Charging) near start/end/midpoint/along route
   - Add POIs as waypoints with visual distinction
   - POI waypoint deletion
   - Files: `RoutePlanner.jsx`, `PointOfInterestService.php`, `PointOfInterestController.php`

3. **Alternative Routes Backend** ✅
   - Backend supports 2-3 alternative routes
   - GraphHopper `alternative_route.max_paths=3` implemented
   - Files: `GraphHopperService.php`, `RouteController.php`

4. **UI Improvements** ✅
   - Contextual sidebar modes
   - Route planning integrated into sidebar
   - EmptyState component
   - Desktop UI improvements CSS

---

## 🚀 Phase 1: Immediate Features (Weeks 1-4) {#phase-1}

### **Feature 1.1: Alternative Routes Frontend Display**
**Priority:** 🔴 HIGH | **Effort:** 1-2 days | **Revenue Impact:** Medium

#### **Overview**
Display 2-3 alternative routes when user enables "Show Alternative Routes" checkbox. Allow side-by-side comparison and switching between alternatives.

#### **Technical Specifications**

**Frontend Changes:**
```javascript
// resources/js/Components/RoutePlanner.jsx

// New state
const [alternativeRoutes, setAlternativeRoutes] = useState([]);
const [selectedAlternativeIndex, setSelectedAlternativeIndex] = useState(0);

// Update calculateRoutes() to handle array response
if (showAlternativeRoutes && response.data.routes) {
    // Response is array of routes
    setAlternativeRoutes(response.data.routes);
    setSelectedAlternativeIndex(0);
    displayRoute(response.data.routes[0], 'straightest');
} else {
    // Single route response
    displayRoute(response.data, 'straightest');
}
```

**New Component:**
```javascript
// resources/js/Components/AlternativeRouteSelector.jsx
const AlternativeRouteSelector = ({ routes, selectedIndex, onSelect }) => {
    return (
        <div className="alternative-routes-container">
            <h3>Alternative Routes ({routes.length})</h3>
            {routes.map((route, index) => (
                <div 
                    key={index}
                    className={`route-card ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => onSelect(index)}
                >
                    <div className="route-metrics">
                        <span>Distance: {formatDistance(route.distance)}</span>
                        <span>Time: {formatTime(route.time)}</span>
                        <span>Curvature: {calculateCurvatureScore(route)}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};
```

**Map Display:**
- Selected route: Bold, primary color (blue)
- Alternative routes: Lighter, semi-transparent (gray, 50% opacity)
- On click: Switch selected route, update map

**Files to Modify:**
- `resources/js/Components/RoutePlanner.jsx` (add alternative route handling)
- `resources/js/Components/AlternativeRouteSelector.jsx` (new component)
- `resources/css/desktop-ui-improvements.css` (add styles)

**API Response Format:**
```json
{
  "routes": [
    {
      "distance": 220.5,
      "time": 7200,
      "coordinates": [[...]],
      "instructions": [...]
    },
    {
      "distance": 235.2,
      "time": 7800,
      "coordinates": [[...]],
      "instructions": [...]
    }
  ]
}
```

**Success Criteria:**
- ✅ User sees 2-3 alternative routes when checkbox enabled
- ✅ Can switch between alternatives
- ✅ Map updates when alternative selected
- ✅ Comparison metrics displayed (distance, time, curvature)

---

### **Feature 1.2: Complete Offline Maps**
**Priority:** 🔴 HIGH | **Effort:** 2-3 weeks | **Revenue Impact:** High (Premium feature)

#### **Overview**
Complete offline map download functionality with region selection, progress tracking, storage management, and offline route calculation.

#### **Technical Specifications**

**Backend Changes:**
```php
// app/Services/OfflineMapService.php

public function downloadRegion($userId, $regionId, $bounds) {
    // 1. Validate region bounds
    // 2. Calculate tile count
    // 3. Queue tile downloads
    // 4. Store in S3 or local storage
    // 5. Create OfflineMapDownload record
    // 6. Return download job ID
}

public function getDownloadProgress($downloadId) {
    // Return progress percentage
    return [
        'progress' => $tilesDownloaded / $totalTiles * 100,
        'tiles_downloaded' => $tilesDownloaded,
        'total_tiles' => $totalTiles,
        'size_downloaded' => $sizeDownloaded,
        'estimated_size' => $estimatedSize
    ];
}
```

**Frontend Changes:**
```javascript
// resources/js/Components/OfflineMapDownloader.jsx

const OfflineMapDownloader = () => {
    const [regions, setRegions] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [downloadProgress, setDownloadProgress] = useState({});
    
    const startDownload = async (regionId) => {
        const response = await axios.post(`/api/offline-maps/download`, {
            region_id: regionId,
            bounds: selectedRegion.bounds
        });
        
        // Poll for progress
        const interval = setInterval(async () => {
            const progress = await axios.get(`/api/offline-maps/progress/${response.data.job_id}`);
            setDownloadProgress(progress.data);
            if (progress.data.progress === 100) {
                clearInterval(interval);
            }
        }, 1000);
    };
    
    return (
        <div>
            <RegionSelector onSelect={setSelectedRegion} />
            <DownloadProgress progress={downloadProgress} />
            <DownloadedRegionsList regions={regions} onDelete={handleDelete} />
        </div>
    );
};
```

**Database Schema:**
```php
// database/migrations/xxxx_create_offline_map_downloads_table.php

Schema::create('offline_map_downloads', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained();
    $table->foreignId('offline_map_region_id')->constrained();
    $table->string('status'); // pending, downloading, completed, failed
    $table->integer('tiles_total')->default(0);
    $table->integer('tiles_downloaded')->default(0);
    $table->bigInteger('size_bytes')->default(0);
    $table->json('bounds'); // {north, south, east, west}
    $table->timestamp('completed_at')->nullable();
    $table->timestamps();
});
```

**Storage Strategy:**
- **Development:** Local file storage (`storage/app/offline-maps/`)
- **Production:** AWS S3 with CloudFront CDN
- **Tile Format:** Mapbox Vector Tiles (MVT) or raster tiles (PNG)

**Files to Create/Modify:**
- `app/Services/OfflineMapService.php` (enhance existing)
- `app/Http/Controllers/OfflineMapController.php` (enhance existing)
- `resources/js/Components/OfflineMapDownloader.jsx` (enhance existing)
- `resources/js/utils/offlineMapManager.js` (enhance existing)
- `database/migrations/xxxx_create_offline_map_downloads_table.php` (new)

**API Endpoints:**
```
POST   /api/offline-maps/download          - Start download
GET    /api/offline-maps/progress/{id}     - Get download progress
GET    /api/offline-maps/downloads         - List user's downloads
DELETE /api/offline-maps/downloads/{id}    - Delete downloaded region
GET    /api/offline-maps/regions           - List available regions
```

**Success Criteria:**
- ✅ User can select and download map regions
- ✅ Progress is tracked and displayed in real-time
- ✅ Downloaded regions work offline
- ✅ Storage can be managed (view/delete)
- ✅ Storage quota warnings shown

---

### **Feature 1.3: Section-Specific Curvature Control**
**Priority:** 🔴 HIGH | **Effort:** 2-3 weeks | **Revenue Impact:** High (Kurviger Premium feature)

#### **Overview**
Allow users to set different curvature levels for different segments of a route. Visual route editor with segment selection and drag-and-drop waypoint adjustment.

#### **Technical Specifications**

**Backend Changes:**
```php
// app/Services/GraphHopperService.php

public function findCurvedRouteWithSegments($startLat, $startLon, $endLat, $endLon, $segments) {
    // $segments = [
    //     ['waypoint_index' => 0, 'curvature_level' => 'curvy'],
    //     ['waypoint_index' => 2, 'curvature_level' => 'extra_curved']
    // ]
    
    // Split route into segments
    // Calculate each segment with specified curvature
    // Merge segments
    // Return complete route
}
```

**Frontend Changes:**
```javascript
// resources/js/Components/RouteSegmentEditor.jsx

const RouteSegmentEditor = ({ route, onUpdate }) => {
    const [segments, setSegments] = useState([]);
    const [selectedSegment, setSelectedSegment] = useState(null);
    
    // Detect route segments (between waypoints)
    const detectSegments = (route) => {
        // Split route at waypoints
        // Return array of segments with start/end indices
    };
    
    const updateSegmentCurvature = (segmentIndex, curvatureLevel) => {
        // Update segment curvature
        // Recalculate route
        // Update map
    };
    
    return (
        <div className="route-segment-editor">
            <SegmentList segments={segments} onSelect={setSelectedSegment} />
            <CurvatureSelector 
                segment={selectedSegment}
                onChange={updateSegmentCurvature}
            />
            <MapPreview route={route} segments={segments} />
        </div>
    );
};
```

**Database Schema:**
```php
// Add to routes table
Schema::table('routes', function (Blueprint $table) {
    $table->json('segment_curvature')->nullable();
    // Example: [{"segment": 0, "curvature": "curvy"}, {"segment": 1, "curvature": "extra_curved"}]
});
```

**UI/UX Flow:**
1. User calculates route
2. Click "Edit Segments" button
3. Route splits into segments (visualized on map)
4. User selects segment
5. User chooses curvature level for that segment
6. Route recalculates in real-time
7. User can adjust waypoints (drag-and-drop)
8. Save segment preferences

**Files to Create/Modify:**
- `resources/js/Components/RouteSegmentEditor.jsx` (new)
- `resources/js/Components/RoutePlanner.jsx` (add segment editor integration)
- `app/Services/GraphHopperService.php` (add segment-specific routing)
- `app/Http/Controllers/RouteController.php` (add endpoint)
- `database/migrations/xxxx_add_segment_curvature_to_routes.php` (new)

**API Endpoints:**
```
POST /api/routes/calculate-with-segments - Calculate route with segment-specific curvature
PUT  /api/routes/{id}/segments           - Update segment curvature
```

**Success Criteria:**
- ✅ User can select route segments
- ✅ Can set different curvature per segment
- ✅ Waypoints can be adjusted via drag-and-drop
- ✅ Route recalculates in real-time
- ✅ Visual feedback on map (color-coded segments)

---

## 🎯 Phase 2: Core Competitive Features (Weeks 5-12) {#phase-2}

### **Feature 2.1: Turn-by-Turn Navigation**
**Priority:** 🔴 HIGH | **Effort:** 3-4 weeks | **Revenue Impact:** Critical (Mobile requirement)

#### **Overview**
Real-time GPS tracking, turn-by-turn instructions, voice guidance, route recalculation on deviation.

#### **Technical Specifications**

**Backend Changes:**
```php
// app/Services/NavigationService.php

public function getNavigationInstructions($routeId, $currentLat, $currentLon) {
    // Get route coordinates
    // Find current position on route
    // Calculate distance to next turn
    // Return next instruction
    return [
        'instruction' => 'Turn right onto Main Street',
        'distance' => 250, // meters
        'time' => 30, // seconds
        'maneuver' => 'turn-right',
        'next_instruction' => 'Continue straight for 1.2 km'
    ];
}
```

**Frontend Changes:**
```javascript
// resources/js/Components/NavigationView.jsx

const NavigationView = ({ route }) => {
    const [currentPosition, setCurrentPosition] = useState(null);
    const [currentInstruction, setCurrentInstruction] = useState(null);
    const [isNavigating, setIsNavigating] = useState(false);
    
    useEffect(() => {
        if (isNavigating) {
            // Request GPS permission
            navigator.geolocation.watchPosition(
                (position) => {
                    setCurrentPosition({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    // Get next instruction
                    fetchInstruction(position);
                },
                (error) => console.error(error),
                { enableHighAccuracy: true }
            );
        }
    }, [isNavigating]);
    
    const speakInstruction = (instruction) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(instruction);
            window.speechSynthesis.speak(utterance);
        }
    };
    
    return (
        <div className="navigation-view">
            <div className="instruction-card">
                <h2>{currentInstruction?.instruction}</h2>
                <p>{currentInstruction?.distance}m</p>
            </div>
            <MapNavigation 
                route={route}
                currentPosition={currentPosition}
            />
        </div>
    );
};
```

**PWA Service Worker:**
```javascript
// public/sw.js

self.addEventListener('message', (event) => {
    if (event.data.type === 'START_NAVIGATION') {
        // Start background location tracking
        startBackgroundLocation();
    }
});

function startBackgroundLocation() {
    // Use Background Sync API for offline navigation
}
```

**Files to Create/Modify:**
- `resources/js/Components/NavigationView.jsx` (new)
- `app/Services/NavigationService.php` (new)
- `app/Http/Controllers/NavigationController.php` (new)
- `public/sw.js` (enhance service worker)
- `resources/js/utils/navigationService.js` (new)

**API Endpoints:**
```
GET  /api/navigation/instructions/{routeId}     - Get navigation instructions
POST /api/navigation/position                   - Update current position
POST /api/navigation/recalculate                - Recalculate route on deviation
```

**Voice Instructions:**
- Use Web Speech API (`speechSynthesis`)
- Fallback: Text-to-speech service (Google TTS API)
- Language: Support multiple languages

**Success Criteria:**
- ✅ GPS tracking works (requires HTTPS/PWA)
- ✅ Turn-by-turn instructions displayed
- ✅ Voice instructions work
- ✅ Route recalculates on deviation
- ✅ Works offline (cached instructions)

---

### **Feature 2.2: Complete Ride Recording**
**Priority:** 🔴 HIGH | **Effort:** 2-3 weeks | **Revenue Impact:** High (Premium feature)

#### **Overview**
GPS tracking during ride, save ride statistics, display on map, link to route planning.

#### **Technical Specifications**

**Backend Changes:**
```php
// app/Services/RideRecordingService.php

public function startRecording($userId, $routeId = null) {
    $recording = RideRecording::create([
        'user_id' => $userId,
        'route_id' => $routeId,
        'started_at' => now(),
        'status' => 'recording'
    ]);
    
    return $recording;
}

public function savePosition($recordingId, $lat, $lon, $speed, $timestamp) {
    // Store position in database or cache
    // Use Redis for high-frequency writes
    Redis::lpush("ride:{$recordingId}:positions", json_encode([
        'lat' => $lat,
        'lon' => $lon,
        'speed' => $speed,
        'timestamp' => $timestamp
    ]));
}

public function stopRecording($recordingId) {
    $recording = RideRecording::find($recordingId);
    
    // Calculate statistics
    $positions = $this->getPositions($recordingId);
    $stats = $this->calculateStats($positions);
    
    $recording->update([
        'status' => 'completed',
        'ended_at' => now(),
        'distance' => $stats['distance'],
        'duration' => $stats['duration'],
        'avg_speed' => $stats['avg_speed'],
        'max_speed' => $stats['max_speed'],
        'elevation_gain' => $stats['elevation_gain'],
        'coordinates' => $positions
    ]);
    
    return $recording;
}
```

**Frontend Changes:**
```javascript
// resources/js/Components/RideRecorder.jsx

const RideRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingId, setRecordingId] = useState(null);
    const [stats, setStats] = useState({});
    
    const startRecording = async () => {
        const response = await axios.post('/api/ride-recordings/start', {
            route_id: currentRouteId
        });
        setRecordingId(response.data.id);
        setIsRecording(true);
        
        // Start GPS tracking
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                savePosition(position);
            },
            (error) => console.error(error),
            { enableHighAccuracy: true, maximumAge: 1000 }
        );
    };
    
    const savePosition = async (position) => {
        await axios.post(`/api/ride-recordings/${recordingId}/position`, {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            speed: position.coords.speed,
            timestamp: Date.now()
        });
    };
    
    const stopRecording = async () => {
        await axios.post(`/api/ride-recordings/${recordingId}/stop`);
        setIsRecording(false);
    };
    
    return (
        <div className="ride-recorder">
            <button onClick={isRecording ? stopRecording : startRecording}>
                {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            <RideStats stats={stats} />
        </div>
    );
};
```

**Database Schema:**
```php
// database/migrations/xxxx_create_ride_recordings_table.php

Schema::create('ride_recordings', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained();
    $table->foreignId('route_id')->nullable()->constrained();
    $table->string('status'); // recording, completed, paused
    $table->timestamp('started_at');
    $table->timestamp('ended_at')->nullable();
    $table->decimal('distance', 10, 2)->nullable(); // km
    $table->integer('duration')->nullable(); // seconds
    $table->decimal('avg_speed', 5, 2)->nullable(); // km/h
    $table->decimal('max_speed', 5, 2)->nullable(); // km/h
    $table->integer('elevation_gain')->nullable(); // meters
    $table->json('coordinates')->nullable(); // Array of {lat, lon, speed, timestamp}
    $table->timestamps();
});
```

**Files to Create/Modify:**
- `app/Services/RideRecordingService.php` (new)
- `app/Http/Controllers/RideRecordingController.php` (enhance existing)
- `resources/js/Components/RideRecorder.jsx` (new)
- `resources/js/Pages/RideHistory.jsx` (new)
- `database/migrations/xxxx_create_ride_recordings_table.php` (new)

**API Endpoints:**
```
POST   /api/ride-recordings/start                    - Start recording
POST   /api/ride-recordings/{id}/position            - Save position
POST   /api/ride-recordings/{id}/stop                - Stop recording
GET    /api/ride-recordings                          - List user's recordings
GET    /api/ride-recordings/{id}                     - Get recording details
DELETE /api/ride-recordings/{id}                     - Delete recording
```

**Success Criteria:**
- ✅ GPS tracking works during ride
- ✅ Statistics calculated (distance, time, speed, elevation)
- ✅ Ride displayed on map as colored line
- ✅ Can link to route planning
- ✅ Ride history list works

---

### **Feature 2.3: Payment & Subscription System**
**Priority:** 🔴 HIGH | **Effort:** 2-3 weeks | **Revenue Impact:** CRITICAL

#### **Overview**
Stripe/Paddle integration, subscription management, route limit enforcement, feature gating.

#### **Technical Specifications**

**Backend Changes:**
```php
// app/Services/PaymentService.php

use Laravel\Cashier\Cashier;

public function createSubscription($userId, $plan) {
    $user = User::find($userId);
    
    $subscription = $user->newSubscription('default', $plan)
        ->create($paymentMethod);
    
    return $subscription;
}

public function checkRouteLimit($userId) {
    $user = User::find($userId);
    $subscription = $user->subscription('default');
    
    if ($subscription && $subscription->valid()) {
        return true; // Unlimited for paid users
    }
    
    // Free tier: 10 routes per day
    $todayRoutes = RouteUsage::where('user_id', $userId)
        ->whereDate('created_at', today())
        ->count();
    
    return $todayRoutes < 10;
}
```

**Middleware:**
```php
// app/Http/Middleware/CheckRouteLimit.php

public function handle($request, Closure $next) {
    $user = $request->user();
    
    if (!$this->paymentService->checkRouteLimit($user->id)) {
        return response()->json([
            'error' => 'Route limit reached. Upgrade to Premium for unlimited routes.'
        ], 403);
    }
    
    return $next($request);
}
```

**Frontend Changes:**
```javascript
// resources/js/Pages/Subscription.jsx

const Subscription = () => {
    const [plans, setPlans] = useState([]);
    const [currentPlan, setCurrentPlan] = useState(null);
    
    const subscribe = async (planId) => {
        const response = await axios.post('/api/subscriptions/create', {
            plan: planId,
            payment_method: paymentMethodId
        });
        
        // Redirect to Stripe checkout
        window.location.href = response.data.checkout_url;
    };
    
    return (
        <div className="subscription-page">
            <PlanComparison plans={plans} currentPlan={currentPlan} />
            <SubscribeButton onClick={subscribe} />
        </div>
    );
};
```

**Database Schema:**
```php
// Already exists: subscriptions table
// Add route_usage table for tracking

Schema::create('route_usages', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained();
    $table->foreignId('route_id')->nullable()->constrained();
    $table->string('route_type'); // graphhopper, round_trip, etc.
    $table->timestamps();
});
```

**Files to Create/Modify:**
- `app/Services/PaymentService.php` (new)
- `app/Http/Controllers/SubscriptionController.php` (enhance existing)
- `app/Http/Middleware/CheckRouteLimit.php` (new)
- `resources/js/Pages/Subscription.jsx` (new)
- `resources/js/Components/SubscriptionBadge.jsx` (new)
- `database/migrations/xxxx_create_route_usages_table.php` (new)

**Subscription Tiers:**
- **Free:** 10 routes/day, basic features
- **Premium ($9.99/month):** Unlimited routes, all features
- **Pro ($19.99/month):** Everything + API access, priority support

**API Endpoints:**
```
POST   /api/subscriptions/create              - Create subscription
POST   /api/subscriptions/cancel              - Cancel subscription
GET    /api/subscriptions/current              - Get current subscription
POST   /api/subscriptions/upgrade             - Upgrade plan
```

**Success Criteria:**
- ✅ Stripe/Paddle integration works
- ✅ Subscription management (upgrade/downgrade/cancel)
- ✅ Route limits enforced for free tier
- ✅ Feature gating based on subscription
- ✅ Usage tracking works

---

## 🔧 Technical Specifications {#technical-specs}

### **API Response Formats**

**Alternative Routes:**
```json
{
  "routes": [
    {
      "distance": 220.5,
      "time": 7200,
      "coordinates": [[56.9, 24.1], [56.95, 24.15], ...],
      "instructions": [
        {"distance": 100, "instruction": "Turn right", "maneuver": "turn-right"}
      ]
    }
  ]
}
```

**Navigation Instructions:**
```json
{
  "current_instruction": {
    "instruction": "Turn right onto Main Street",
    "distance": 250,
    "time": 30,
    "maneuver": "turn-right"
  },
  "next_instruction": {
    "instruction": "Continue straight",
    "distance": 1200
  }
}
```

### **Database Schema Changes**

See individual feature sections for detailed schemas.

### **Dependencies**

**Backend:**
- Laravel Cashier (Stripe)
- Redis (for ride recording positions)
- AWS S3 (for offline maps)

**Frontend:**
- Web Speech API (voice instructions)
- Geolocation API (GPS tracking)
- Service Worker (PWA, offline support)

---

## 🎨 UI/UX Specifications {#ui-ux-specs}

### **Alternative Routes Display**
- Card-based layout
- Comparison metrics (distance, time, curvature)
- Visual distinction: selected (bold, primary color), alternatives (lighter)
- Click to switch

### **Offline Maps**
- Region selector (map-based or list)
- Progress bar with percentage
- Storage quota indicator
- Download management (view/delete)

### **Section-Specific Curvature**
- Visual route editor
- Segment selection (click on route)
- Curvature selector dropdown
- Real-time preview

### **Navigation View**
- Full-screen mode
- Large instruction text
- Distance to next turn
- Map preview (optional)
- Voice toggle

---

## ✅ Testing Requirements {#testing}

### **Unit Tests**
- Route calculation with alternatives
- Offline map download/delete
- Segment curvature calculation
- Navigation instruction generation
- Ride recording statistics

### **Integration Tests**
- Alternative routes API
- Offline maps API
- Navigation API
- Ride recording API
- Subscription API

### **E2E Tests**
- Complete route planning flow with alternatives
- Offline map download flow
- Navigation flow
- Ride recording flow
- Subscription flow

---

## 📅 Implementation Timeline

### **Weeks 1-2:**
- Alternative Routes Frontend Display
- Start Offline Maps

### **Weeks 3-4:**
- Complete Offline Maps
- Start Section-Specific Curvature

### **Weeks 5-6:**
- Complete Section-Specific Curvature
- Start Turn-by-Turn Navigation

### **Weeks 7-8:**
- Complete Turn-by-Turn Navigation
- Start Ride Recording

### **Weeks 9-10:**
- Complete Ride Recording
- Start Payment System

### **Weeks 11-12:**
- Complete Payment System
- Testing & Polish

---

*This plan is based on analysis of Kurviger, Calimoto, and Obsidian notes. Priorities should be adjusted based on user feedback and business goals.*




