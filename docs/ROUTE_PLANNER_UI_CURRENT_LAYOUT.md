# Current Route Planner UI Layout Documentation

## Structure Overview

The Route Planner is rendered as a sidebar panel with the following sections in order:

### 1. Header Section
- Title: "Route Planner" with route icon
- Close button (X) - only shown when not in sidebar mode

### 2. Start Point Section
- Label: "Start Point"
- SearchInput component for location search
- Map click button (green when active)
- Placeholder: "Search or click on map"

### 3. End Point Section (if not round trip)
- Label: "End Point"
- SearchInput component for location search
- Map click button (red when active)
- Placeholder: "Search or click on map"

### 4. Route Curvature Selection
- Label: "Route Curvature"
- Four buttons in vertical stack:
  - 🟦 Straightest Route (blue) - "Fastest and most direct path"
  - 🟩 Balanced Route (green) - "Good balance of speed and curves"
  - 🟨 Curvy Route (yellow) - "More curves and scenic roads"
  - 🟥 Extra Curvy Route (red) - "Maximum curves and twisty roads" (Premium only)
- Each button shows emoji, title, and description

### 5. Calculate Route Button
- Primary action button
- Shows loading state when calculating
- Disabled if start/end points not set

### 6. Waypoints Section
- Label: "Waypoints" with count
- "Add" button to enable map click mode
- List of waypoints with remove buttons
- POI waypoints shown with special styling (green background)

### 7. Section-Specific Curvature (if waypoints exist)
- Premium feature gate
- Label: "Section-Specific Curvature"
- Dropdown for each segment between waypoints
- Calculate button for segment-specific route
- Results display below

### 8. Avoid Roads Section
- Label: "Avoid"
- 2x2 grid of checkboxes:
  - Highways
  - Tolls
  - Ferries
  - Unpaved

### 9. Alternative Routes Toggle
- Checkbox: "Show Alternative Routes"
- Premium feature (disabled for free tier)
- Warning messages when blocked
- Alternative routes display below when enabled

### 10. Saved Roads Section
- Toggle to show/hide saved roads list
- List of saved roads with add/remove buttons
- Selected saved roads shown as chips below

### 11. POI Search Section
- Toggle to show/hide POI search
- POI type selection (Tourism, Fuel, Charging)
- Search location selection (Start, End, Midpoint, Along Route)
- Search radius slider
- Search button
- Results display

### 12. Round Trip Controls (if round trip mode)
- Distance slider (50-2000km)
- Curvature level dropdown
- Calculate button

## Current Issues

1. **Visual Hierarchy**: All sections have equal weight, hard to scan
2. **Information Density**: Too much information visible at once
3. **Primary Action**: Calculate button may be buried
4. **Route Results**: No dedicated results section
5. **Saved Roads**: Hidden behind toggle, not prominent
6. **Alternative Routes**: Status unclear, warnings easy to miss
7. **Mobile**: Not optimized for small screens
8. **Progressive Disclosure**: Advanced features always visible

## Layout Flow

```
Header
├── Start Point
├── End Point
├── Route Curvature (4 buttons)
├── Calculate Button
├── Waypoints
├── Section-Specific Curvature (conditional)
├── Avoid Roads
├── Alternative Routes
├── Saved Roads
├── POI Search
└── Round Trip (conditional)
```

## Styling

- Uses Tailwind CSS classes
- White background with rounded corners
- Shadow for depth
- Border separators between sections
- Color coding: green (start), red (end), blue (straightest), etc.
- Responsive but not mobile-optimized





















