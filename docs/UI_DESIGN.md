# ScenicRoutes Android UI Design

## Design Philosophy

**Clean, Intuitive, Comfortable** - A modern mobile-first design that prioritizes ease of use and visual comfort.

## Key Design Principles

### 1. **Thumb-Friendly Zones**
- Primary actions in bottom-center (FAB)
- Quick actions in bottom-right
- Search at top-center (easy to reach)
- Bottom navigation for main sections

### 2. **Visual Hierarchy**
- **Top**: Search bar (most important action)
- **Center**: Map (main content)
- **Bottom**: Primary action button + navigation
- **Right**: Secondary quick actions (location, layers)

### 3. **Comfortable Spacing**
- Generous padding (16dp minimum)
- Large touch targets (56dp for FABs, 48dp minimum for buttons)
- Comfortable text sizes (14sp body, 16sp+ for important text)

### 4. **Material Design 3**
- Uses Material 3 components and theming
- Dynamic color support (adapts to system theme)
- Smooth animations and transitions
- Card-based layouts with proper elevation

## UI Components

### Map Screen Layout

```
┌─────────────────────────────────┐
│  [Search Bar]          [Filters]│ ← Top: Easy to reach
├─────────────────────────────────┤
│                                 │
│                                 │
│          [Map View]             │ ← Center: Main content
│                                 │
│                                 │
│                    [Location]   │ ← Right: Quick actions
│                    [Layers]      │
│                                 │
│              [+ FAB]            │ ← Bottom: Primary action
├─────────────────────────────────┤
│ [Map] [Explore] [Saved] [Profile]│ ← Bottom nav
└─────────────────────────────────┘
```

### Color Scheme

- **Primary**: Blue (for actions, selected states)
- **Surface**: White/Light gray (cards, panels)
- **Background**: Light gray (map background)
- **On Surface**: Dark gray/Black (text)
- **Accent**: Orange/Red (important actions, warnings)

### Typography

- **Headings**: Bold, 20sp+
- **Body**: Regular, 14-16sp
- **Labels**: Medium, 12-14sp
- **Buttons**: SemiBold, 14-16sp

## Features

### 1. Top Search Bar
- **Purpose**: Quick access to search roads/locations
- **Design**: Rounded card with shadow, glassmorphism effect
- **Behavior**: Expands to show filters when tapped

### 2. Quick Action Buttons
- **Location**: Centers map on user's location
- **Layers**: Switch map styles (standard, satellite, terrain)
- **Design**: Floating action buttons, white background

### 3. Primary FAB
- **Purpose**: Main action menu (Find Roads, Plan Route, Record Ride)
- **Position**: Bottom-center, above navigation
- **Design**: Primary color, prominent size

### 4. Filters Panel
- **Design**: Bottom sheet that slides up
- **Content**: Road type, curvature, distance filters
- **Behavior**: Dismissible by swiping down or tapping outside

### 5. Bottom Navigation
- **Sections**: Map, Explore, Saved, Profile
- **Design**: Material 3 bottom navigation
- **Behavior**: Shows selected state, smooth transitions

## Differences from Kurviger

✅ **Original design** - Not copying Kurviger's layout  
✅ **Material Design 3** - Modern Android design language  
✅ **Bottom navigation** - Standard Android pattern  
✅ **Floating actions** - Clear, accessible primary actions  
✅ **Card-based** - Clean, organized information hierarchy  
✅ **Comfortable spacing** - Generous padding, easy to tap  

## Accessibility

- **Large touch targets**: Minimum 48dp
- **High contrast**: Text meets WCAG AA standards
- **Clear labels**: All icons have content descriptions
- **Readable text**: Minimum 14sp for body text


































