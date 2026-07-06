# Implementation Plan for Missing Features

**Status**: In Progress  
**Ignored Features** (Future): Google Auth, User Mentions, QR Codes, Usage Charts, Usage Statistics Dashboard

---

## ✅ COMPLETED

### 1. Telemetry Service ✅
- Created `TelemetryService.kt`
- Added telemetry endpoint to `ApiClient.kt`
- Ready for integration

### 2. Segment Curvature API ✅
- Added `SegmentCurvatureRequest` data class
- Added `calculateSegmentCurvatureRoute` endpoint to `ApiClient.kt`

---

## 🔄 IN PROGRESS

### 3. Section-Specific Curvature Control
**Files to Modify:**
- `MapViewModel.kt` - Add `calculateSegmentCurvatureRoute()` function
- `RoutePlanningSheet.kt` - Add UI for segment curvature selection
- `RouteRepository.kt` - Add segment curvature calculation

**Implementation Steps:**
1. Add function to MapViewModel to calculate segment curvature route
2. Add UI section in RoutePlanningSheet (only shown when waypoints exist)
3. Add segment curvature levels state management
4. Integrate with API call

### 4. Telemetry Integration
**Files to Modify:**
- `MapViewModel.kt` - Integrate TelemetryService
- `RoutePlanningSheet.kt` - Add telemetry calls
- Other screens as needed

**Implementation Steps:**
1. Initialize TelemetryService in MapViewModel
2. Add telemetry calls for route calculations
3. Add telemetry calls for waypoint additions
4. Add telemetry calls for feature usage

---

## 📋 TODO

### 5. Enhanced POI Along Route
- Enhance POI search along route
- Better filtering and display

### 6. Enhanced Offline Maps Panel
- Improve UI/UX
- Better region management

### 7. User Statistics Display Enhancement
- Enhance profile statistics display
- Better layout and information

### 8. Collection Cover Images
- Add cover image upload UI
- Display cover images in collection cards

### 9. Tag Management UI
- Enhance tag selection UI
- Better tag filtering

---

## 🎯 PRIORITY ORDER

1. ✅ Telemetry Service (DONE)
2. ✅ Segment Curvature API (DONE)
3. 🔄 Section-Specific Curvature Control (IN PROGRESS)
4. 🔄 Telemetry Integration (IN PROGRESS)
5. Enhanced POI Along Route
6. Enhanced Offline Maps Panel
7. User Statistics Display
8. Collection Cover Images
9. Tag Management UI
































