# Performance Optimization Guide

**Last Updated:** 2025-01-XX  
**Status:** Optimization Recommendations

---

## 📋 OVERVIEW

This guide provides comprehensive performance optimization recommendations for both the website and Android app, covering database queries, API responses, frontend rendering, and mobile performance.

---

## 🗄️ DATABASE OPTIMIZATION

### **1. Add Database Indexes**

#### **Critical Indexes Needed:**

```php
// Migration: add_performance_indexes.php
Schema::table('saved_roads', function (Blueprint $table) {
    $table->index('user_id');
    $table->index('is_public');
    $table->index(['user_id', 'is_public']);
    $table->index('created_at');
});

Schema::table('collections', function (Blueprint $table) {
    $table->index('user_id');
    $table->index('is_public');
    $table->index(['user_id', 'is_public']);
});

Schema::table('reviews', function (Blueprint $table) {
    $table->index('road_id');
    $table->index('user_id');
    $table->index('created_at');
});

Schema::table('route_usages', function (Blueprint $table) {
    $table->index('user_id');
    $table->index('created_at');
    $table->index(['user_id', 'created_at']);
});

Schema::table('subscriptions', function (Blueprint $table) {
    $table->index('user_id');
    $table->index('status');
    $table->index(['user_id', 'status']);
});
```

**Run Migration:**
```bash
php artisan make:migration add_performance_indexes
# Copy indexes above
php artisan migrate
```

---

### **2. Optimize N+1 Queries**

#### **Problem Areas:**

**Before (N+1 Query):**
```php
$roads = SavedRoad::where('is_public', true)->get();
foreach ($roads as $road) {
    echo $road->user->name; // N+1 query!
}
```

**After (Eager Loading):**
```php
$roads = SavedRoad::with('user')
    ->where('is_public', true)
    ->get();
```

#### **Files to Optimize:**

1. **SavedRoadController.php:**
```php
// Before
$roads = SavedRoad::where('is_public', true)->get();

// After
$roads = SavedRoad::with(['user', 'reviews', 'tags'])
    ->where('is_public', true)
    ->get();
```

2. **CollectionController.php:**
```php
// Before
$collections = Collection::where('is_public', true)->get();

// After
$collections = Collection::with(['user', 'roads.user', 'roads.reviews'])
    ->where('is_public', true)
    ->get();
```

3. **LeaderboardController.php:**
```php
// Before
$roads = SavedRoad::orderBy('rating', 'desc')->get();

// After
$roads = SavedRoad::with('user')
    ->orderBy('rating', 'desc')
    ->limit(50)
    ->get();
```

---

### **3. Use Query Scopes**

#### **File:** `app/Models/SavedRoad.php`

```php
public function scopePublic($query)
{
    return $query->where('is_public', true);
}

public function scopeWithRelations($query)
{
    return $query->with(['user', 'reviews', 'tags']);
}

// Usage
$roads = SavedRoad::public()->withRelations()->get();
```

---

### **4. Cache Frequently Accessed Data**

#### **Cache Subscription Plans:**

```php
// app/Http/Controllers/SubscriptionController.php
public function getPlans(): JsonResponse
{
    $plans = Cache::remember('subscription_plans', 3600, function () {
        return [
            'plans' => [
                'free' => [...],
                'premium' => [...],
                'pro' => [...],
            ],
        ];
    });
    
    return response()->json($plans);
}
```

#### **Cache Leaderboard Data:**

```php
// app/Http/Controllers/LeaderboardController.php
public function topRatedRoads()
{
    return Cache::remember('leaderboard_top_rated', 300, function () {
        return SavedRoad::with('user')
            ->orderBy('rating', 'desc')
            ->limit(50)
            ->get();
    });
}
```

---

## 🚀 API OPTIMIZATION

### **1. Response Pagination**

#### **Implement Pagination:**

```php
// app/Http/Controllers/SavedRoadController.php
public function index(Request $request)
{
    $perPage = $request->input('per_page', 20);
    
    $roads = SavedRoad::with(['user', 'reviews'])
        ->where('user_id', $request->user()->id)
        ->paginate($perPage);
    
    return response()->json($roads);
}
```

#### **Frontend Pagination:**

```javascript
// resources/js/Pages/SavedRoads.jsx
const [page, setPage] = useState(1);
const [roads, setRoads] = useState([]);
const [hasMore, setHasMore] = useState(true);

const loadMore = async () => {
    const response = await apiClient.get(`/api/saved-roads?page=${page + 1}`);
    setRoads([...roads, ...response.data.data]);
    setHasMore(response.data.next_page_url !== null);
    setPage(page + 1);
};
```

---

### **2. Response Compression**

#### **Enable Gzip Compression:**

**File:** `.htaccess` (Apache) or `nginx.conf` (Nginx)

```apache
# Apache
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>
```

```nginx
# Nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

---

### **3. API Response Caching**

#### **Cache API Responses:**

```php
// app/Http/Controllers/RouteController.php
public function graphhopper(Request $request)
{
    $cacheKey = 'route_' . md5(json_encode($request->all()));
    
    return Cache::remember($cacheKey, 3600, function () use ($request) {
        // Route calculation logic
    });
}
```

---

## 🎨 FRONTEND OPTIMIZATION

### **1. Code Splitting**

#### **React Lazy Loading:**

```javascript
// resources/js/app.jsx
import { lazy, Suspense } from 'react';

const Map = lazy(() => import('./Pages/Map'));
const Subscription = lazy(() => import('./Pages/Subscription'));

function App() {
    return (
        <Suspense fallback={<Loading />}>
            <Routes>
                <Route path="/map" element={<Map />} />
                <Route path="/subscription" element={<Subscription />} />
            </Routes>
        </Suspense>
    );
}
```

---

### **2. Image Optimization**

#### **Lazy Load Images:**

```javascript
// resources/js/Components/RoadCard.jsx
<img 
    src={road.photo_url} 
    loading="lazy"
    alt={road.name}
/>
```

#### **Use WebP Format:**

```javascript
const getImageUrl = (url) => {
    if (url && url.endsWith('.jpg')) {
        return url.replace('.jpg', '.webp');
    }
    return url;
};
```

---

### **3. Debounce Search Inputs**

```javascript
// resources/js/Components/SearchInput.jsx
import { useDebouncedCallback } from 'use-debounce';

function SearchInput({ onSearch }) {
    const debouncedSearch = useDebouncedCallback(
        (value) => onSearch(value),
        300
    );
    
    return (
        <input
            onChange={(e) => debouncedSearch(e.target.value)}
        />
    );
}
```

---

### **4. Virtual Scrolling for Long Lists**

```javascript
// Install: npm install react-window
import { FixedSizeList } from 'react-window';

function RoadList({ roads }) {
    const Row = ({ index, style }) => (
        <div style={style}>
            <RoadCard road={roads[index]} />
        </div>
    );
    
    return (
        <FixedSizeList
            height={600}
            itemCount={roads.length}
            itemSize={100}
        >
            {Row}
        </FixedSizeList>
    );
}
```

---

## 📱 ANDROID OPTIMIZATION

### **1. Image Loading Optimization**

#### **Use Coil with Caching:**

```kotlin
// Already using Coil, but optimize:
AsyncImage(
    model = ImageRequest.Builder(context)
        .data(road.photoUrl)
        .memoryCachePolicy(CachePolicy.ENABLED)
        .diskCachePolicy(CachePolicy.ENABLED)
        .build(),
    contentDescription = null,
    modifier = Modifier.size(100.dp)
)
```

---

### **2. Lazy Column Optimization**

```kotlin
LazyColumn(
    modifier = Modifier.fillMaxSize(),
    // Add these for better performance
    contentPadding = PaddingValues(16.dp),
    verticalArrangement = Arrangement.spacedBy(8.dp)
) {
    items(
        items = roads,
        key = { it.id } // Important for recomposition
    ) { road ->
        RoadCard(road = road)
    }
}
```

---

### **3. ViewModel Optimization**

```kotlin
// Use StateFlow efficiently
class MapViewModel : ViewModel() {
    private val _routes = MutableStateFlow<List<Route>>(emptyList())
    val routes: StateFlow<List<Route>> = _routes.asStateFlow()
    
    // Use flow operators for transformations
    val routeCount = _routes.map { it.size }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = 0
    )
}
```

---

### **4. Network Request Optimization**

```kotlin
// Add request caching
val okHttpClient = OkHttpClient.Builder()
    .cache(Cache(context.cacheDir, 10 * 1024 * 1024)) // 10MB cache
    .addInterceptor(HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BASIC
    })
    .build()
```

---

## 🔍 MONITORING & PROFILING

### **1. Laravel Debugbar (Development)**

```bash
composer require barryvdh/laravel-debugbar --dev
```

**Check:**
- Query count
- Query time
- Memory usage
- Response time

---

### **2. Database Query Logging**

```php
// app/Providers/AppServiceProvider.php
public function boot()
{
    if (config('app.debug')) {
        DB::listen(function ($query) {
            Log::info($query->sql);
            Log::info($query->bindings);
            Log::info($query->time);
        });
    }
}
```

---

### **3. Android Profiling**

**Android Studio Profiler:**
- CPU Profiler
- Memory Profiler
- Network Profiler

**Check:**
- Frame rendering time (should be < 16ms)
- Memory leaks
- Network request timing

---

## 📊 PERFORMANCE METRICS

### **Target Metrics:**

#### **Website:**
- **Page Load Time:** < 2 seconds
- **Time to Interactive:** < 3 seconds
- **API Response Time:** < 500ms
- **Database Query Time:** < 100ms

#### **Android:**
- **App Launch Time:** < 2 seconds
- **Screen Transition:** < 300ms
- **Frame Rate:** 60 FPS
- **Memory Usage:** < 200MB

---

## ✅ OPTIMIZATION CHECKLIST

### **Database:**
- [ ] Add indexes on frequently queried columns
- [ ] Fix N+1 queries with eager loading
- [ ] Use query scopes
- [ ] Cache frequently accessed data
- [ ] Optimize complex queries

### **API:**
- [ ] Implement pagination
- [ ] Enable response compression
- [ ] Cache API responses
- [ ] Optimize response payload size
- [ ] Use HTTP/2

### **Frontend:**
- [ ] Code splitting
- [ ] Lazy load images
- [ ] Debounce search inputs
- [ ] Virtual scrolling for long lists
- [ ] Minimize bundle size

### **Android:**
- [ ] Optimize image loading
- [ ] Use LazyColumn efficiently
- [ ] Cache network requests
- [ ] Profile and fix performance issues
- [ ] Minimize APK size

---

## 🎯 QUICK WINS

1. **Add Database Indexes** (30 minutes, huge impact)
2. **Fix N+1 Queries** (1-2 hours, significant impact)
3. **Enable Gzip Compression** (5 minutes, good impact)
4. **Cache Subscription Plans** (10 minutes, good impact)
5. **Lazy Load Images** (30 minutes, good impact)

---

**Last Updated:** 2025-01-XX  
**Next Review:** After implementing optimizations


