# GPX Import/Export Feature Guide

## Overview

The GPX import/export feature allows users to:
- Export routes to GPX format for use in navigation apps (Kurviger, Calimoto, Google Maps, Waze, etc.)
- Import GPX files to create routes
- Export saved roads and collections as GPX files

## Backend Implementation

### Services

**GPXService** (`app/Services/GPXService.php`)
- `generateGPX($route, $name, $description)` - Generate GPX XML from route data
- `generateGPXFromSavedRoad($savedRoad)` - Generate GPX from saved road model
- `generateGPXFromCollection($collection)` - Generate GPX from collection (multiple routes)
- `parseGPX($gpxContent)` - Parse GPX file and extract route data

### Controllers

**RouteExportController** (`app/Http/Controllers/RouteExportController.php`)
- `exportRoute()` - Export route to GPX (POST `/api/routes/export/gpx`)
- `exportSavedRoad($id)` - Export saved road (GET `/api/routes/export/saved-road/{id}`)
- `exportCollection($id)` - Export collection (GET `/api/routes/export/collection/{id}`)
- `importGPX()` - Import GPX from file (POST `/api/routes/import/gpx`)
- `importGPXFromUrl()` - Import GPX from URL (POST `/api/routes/import/gpx-url`)

### API Routes

```php
// Public routes
POST /api/routes/export/gpx - Export route to GPX
POST /api/routes/import/gpx - Import GPX from file
POST /api/routes/import/gpx-url - Import GPX from URL

// Authenticated routes
GET /api/routes/export/saved-road/{id} - Export saved road
GET /api/routes/export/collection/{id} - Export collection
```

## Frontend Implementation

### Components

**RouteExport** (`resources/js/Components/RouteExport.jsx`)
- Simple button component to export current route
- Props:
  - `route` - Route object with coordinates
  - `routeName` - Name for the exported file
  - `routeDescription` - Description
  - `auth` - Auth object with token
  - `onExportComplete` - Callback when export completes

**GPXImport** (`resources/js/Components/GPXImport.jsx`)
- Full import component with file and URL options
- Props:
  - `onImportComplete` - Callback with imported route data
  - `auth` - Auth object with token

### Utility Functions

**gpxUtils.js** (`resources/js/utils/gpxUtils.js`)
- `exportRouteToGPX(route, name, description, authToken)`
- `importGPXFromFile(file, authToken)`
- `importGPXFromURL(url, authToken)`
- `exportSavedRoadToGPX(savedRoadId, authToken)`
- `exportCollectionToGPX(collectionId, authToken)`
- `downloadGPX(gpxContent, filename)`
- `sanitizeFilename(filename)`

## Usage Examples

### Export Route in RoutePlanner

```jsx
import RouteExport from './Components/RouteExport';

// In your RoutePlanner component
<RouteExport
    route={selectedRoute}
    routeName="My Scenic Route"
    routeDescription="A beautiful route through the mountains"
    auth={auth}
    onExportComplete={(format) => {
        console.log(`Route exported as ${format}`);
    }}
/>
```

### Import GPX

```jsx
import GPXImport from './Components/GPXImport';

<GPXImport
    auth={auth}
    onImportComplete={(importedRoute) => {
        // Use imported route data
        console.log('Imported route:', importedRoute);
        // Set route on map, create saved road, etc.
        setRoute(importedRoute);
    }}
/>
```

### Export Saved Road

```jsx
import { exportSavedRoadToGPX, downloadGPX } from './utils/gpxUtils';

const handleExportSavedRoad = async (savedRoadId) => {
    try {
        const gpxBlob = await exportSavedRoadToGPX(savedRoadId, auth.token);
        const gpxContent = await gpxBlob.text();
        downloadGPX(gpxContent, 'my-saved-route');
    } catch (error) {
        console.error('Export failed:', error);
    }
};
```

### Export Collection

```jsx
import { exportCollectionToGPX, downloadGPX } from './utils/gpxUtils';

const handleExportCollection = async (collectionId) => {
    try {
        const gpxBlob = await exportCollectionToGPX(collectionId, auth.token);
        const gpxContent = await gpxBlob.text();
        downloadGPX(gpxContent, 'my-collection');
    } catch (error) {
        console.error('Export failed:', error);
    }
};
```

## GPX Format Support

### Export Features
- ✅ Track points (trkpt) with coordinates
- ✅ Waypoints (wpt) for start/end points
- ✅ Route metadata (name, description, time)
- ✅ Elevation data (if available)
- ✅ Route statistics in extensions (distance, duration, curvature)

### Import Features
- ✅ Track segments (trkseg)
- ✅ Route points (rtept)
- ✅ Waypoints
- ✅ Metadata (name, description)
- ✅ Elevation data
- ✅ Multiple tracks (for collections)

## Integration Points

### Add Export to RoutePlanner

1. Import the component:
```jsx
import RouteExport from './Components/RouteExport';
```

2. Add export button in route results:
```jsx
{selectedRoute && (
    <div className="route-actions">
        <RouteExport
            route={selectedRoute}
            routeName={`Route ${selectedRoute.distance_km}km`}
            auth={auth}
        />
    </div>
)}
```

### Add Export to Saved Roads List

Add export button to each saved road card:
```jsx
<button onClick={() => handleExportSavedRoad(road.id)}>
    <FaDownload /> Export GPX
</button>
```

### Add Import to Map Page

Add import button/modal:
```jsx
<button onClick={() => setShowImport(true)}>
    <FaFileImport /> Import GPX
</button>

{showImport && (
    <Modal onClose={() => setShowImport(false)}>
        <GPXImport
            auth={auth}
            onImportComplete={(route) => {
                // Load route on map
                loadRouteOnMap(route);
                setShowImport(false);
            }}
        />
    </Modal>
)}
```

## Testing

### Test Export
1. Calculate a route
2. Click "Export GPX"
3. Verify file downloads with correct name
4. Open in navigation app (Kurviger, Calimoto, etc.)
5. Verify route displays correctly

### Test Import
1. Get a GPX file from Kurviger/Calimoto
2. Use import component to upload
3. Verify route data is parsed correctly
4. Verify route can be displayed on map

## Error Handling

The components handle common errors:
- Invalid GPX format
- Missing coordinates
- File upload errors
- Network errors
- Authentication errors

All errors are displayed to the user with helpful messages.

## Future Enhancements

- [ ] KML export support
- [ ] Batch export multiple routes
- [ ] GPX validation before import
- [ ] Preview imported route before loading
- [ ] Export route with custom waypoints
- [ ] Import GPX with waypoint support





