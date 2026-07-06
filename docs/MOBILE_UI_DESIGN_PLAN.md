# ScenicRoutes Mobile UI Design Plan
## Beautiful, Intuitive, One-Handed Mobile Experience

### Design Principles
1. **Thumb-Friendly Zones**: All primary actions within thumb reach (bottom 1/3 of screen)
2. **Clear Visual Hierarchy**: Important actions are larger, bolder, more prominent
3. **Minimal Cognitive Load**: One primary action per screen
4. **Native Feel**: Follow Material Design 3 guidelines
5. **Consistent Patterns**: Same interactions work the same way everywhere

---

## Screen Layouts

### 1. MAP SCREEN (Home/Default)
**Layout:**
```
┌─────────────────────────────┐
│ [☰] ScenicRoutes    [👤]    │ ← Top Bar (64px, minimal)
├─────────────────────────────┤
│                             │
│                             │
│         FULL SCREEN         │
│            MAP              │
│     (No controls visible)    │
│                             │
│                             │
│                    [➕]     │ ← FAB (bottom-right, 56px)
├─────────────────────────────┤
│ [🗺️] [🔍] [📝] [👤]         │ ← Bottom Nav (80px, always visible)
└─────────────────────────────┘
```

**Features:**
- **Full-screen map** - No UI clutter, just the map
- **Top bar** - Minimal: hamburger menu, app name, profile icon
- **FAB (Floating Action Button)** - Bottom-right, 56px, gradient purple
  - Tap: Opens bottom sheet with actions
- **Bottom Navigation** - 4 tabs, always visible
  - Map (active) | Explore | Trips | Profile
- **No desktop controls** - All filters/search moved to Explore tab

**Interactions:**
- Tap map: Drop marker / Select location
- Long-press map: Quick actions menu
- Swipe up from bottom: Quick access panel
- Tap FAB: Action sheet (Plan Route, Find Roads, etc.)

---

### 2. EXPLORE SCREEN
**Layout:**
```
┌─────────────────────────────┐
│ [☰] Explore                 │ ← Top Bar
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │  🔍  Search roads...    │ │ ← Search Bar (prominent)
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 🛣️  Find Curvy Roads    │ │ ← Large Cards
│ │    Discover scenic routes│ │    (Full width, 80px tall)
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 👥  Community Roads     │ │
│ │    Explore shared routes│ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 📁  Collections         │ │
│ │    Browse curated sets  │ │
│ └─────────────────────────┘ │
│                             │
├─────────────────────────────┤
│ [🗺️] [🔍] [📝] [👤]         │ ← Bottom Nav
└─────────────────────────────┘
```

**Features:**
- **Large search bar** at top (easy to reach)
- **Full-width cards** - Each action is a large, tappable card
- **Clear icons** - Visual identification
- **Thumb-friendly** - All actions in comfortable reach zone

---

### 3. TRIPS SCREEN
**Layout:**
```
┌─────────────────────────────┐
│ [☰] Trips                   │ ← Top Bar
├─────────────────────────────┤
│ [Saved] [Recordings] [Offline]│ ← Tabs (swipeable)
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │ 📍  No saved routes     │ │
│ │                         │ │
│ │    [Plan Your First]    │ │ ← Large CTA button
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ ⏺️  Route Recording     │ │ ← Coming Soon Cards
│ │    Coming Soon          │ │
│ └─────────────────────────┘ │
│                             │
├─────────────────────────────┤
│ [🗺️] [🔍] [📝] [👤]         │ ← Bottom Nav
└─────────────────────────────┘
```

**Features:**
- **Tab navigation** - Swipe between Saved/Recordings/Offline
- **Empty states** - Friendly, helpful messages
- **Coming soon** - Clear placeholders for future features
- **Large buttons** - Easy to tap

---

### 4. PROFILE SCREEN
**Layout:**
```
┌─────────────────────────────┐
│ [☰] Profile                 │ ← Top Bar
├─────────────────────────────┤
│        [👤 Avatar]          │ ← Large avatar (80px)
│        John Doe             │
│     john@example.com       │
│     [Premium Badge]         │
│                             │
│ ┌─────────────────────────┐ │
│ │ [Manage Subscription]    │ │ ← Large button
│ └─────────────────────────┘ │
│                             │
│ Account                     │ ← Section header
│ ┌─────────────────────────┐ │
│ │ 👑 Subscription        →│ │ ← List items
│ │ 📊 Usage Stats         →│ │    (64px tall)
│ │ ⚙️  Settings           →│ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 🚪 Log Out              │ │ ← Destructive action
│ └─────────────────────────┘ │
│                             │
├─────────────────────────────┤
│ [🗺️] [🔍] [📝] [👤]         │ ← Bottom Nav
└─────────────────────────────┘
```

**Features:**
- **Large avatar** - Visual identity
- **Clear sections** - Grouped related actions
- **Large list items** - Easy to tap (64px minimum)
- **Destructive actions** - Clearly separated (red)

---

## Component Specifications

### Bottom Navigation Bar
- **Height**: 80px (includes safe area)
- **Background**: White with subtle shadow
- **Icons**: 24px, Material Design icons
- **Labels**: 12px, medium weight
- **Active state**: Primary color, slightly larger icon
- **Position**: Fixed bottom, always visible

### Floating Action Button (FAB)
- **Size**: 56x56px
- **Position**: Bottom-right, 20px from edges, 100px from bottom nav
- **Color**: Gradient purple (#667eea to #764ba2)
- **Shadow**: Elevated (8px blur, 0.3 opacity)
- **Icon**: Plus (+) when closed, X when expanded

### Action Sheet (Bottom Sheet)
- **Animation**: Slide up from bottom (300ms)
- **Max height**: 80vh
- **Background**: White, rounded top corners (24px)
- **Overlay**: Dark backdrop (40% opacity)
- **Dismiss**: Tap overlay or swipe down

### Cards
- **Height**: 80px minimum
- **Padding**: 16px all sides
- **Border radius**: 16px
- **Shadow**: Subtle elevation
- **Spacing**: 12px between cards

### Buttons
- **Primary**: 52px tall, full width, gradient background
- **Secondary**: 48px tall, outlined style
- **Touch target**: Minimum 44x44px (Apple HIG) / 48x48px (Material)

### Typography
- **Page titles**: 28px, regular weight
- **Section headers**: 14px, uppercase, medium weight
- **Body text**: 16px, regular weight
- **Labels**: 14px, medium weight
- **Captions**: 12px, regular weight

### Colors (Material Design 3)
- **Primary**: #6750A4 (Purple)
- **Primary Container**: #EADDFF (Light purple)
- **Surface**: #FFFBFE (White)
- **Surface Variant**: #E7E0EC (Light gray)
- **On Surface**: #1C1B1F (Dark text)
- **On Surface Variant**: #49454F (Medium text)

### Spacing
- **Screen padding**: 16px
- **Card spacing**: 12px
- **Section spacing**: 24px
- **Element spacing**: 8px / 16px / 24px

---

## User Flows

### Finding Curvy Roads
1. User on Map screen
2. Taps FAB (bottom-right)
3. Action sheet slides up: "Find Curvy Roads" option
4. Taps option
5. Navigates to Explore tab
6. Large "Find Curvy Roads" card visible
7. Taps card
8. Bottom sheet opens with filters (radius, road type, etc.)
9. Adjusts filters with large, thumb-friendly controls
10. Taps "Search"
11. Results appear on map

### Planning a Route
1. User on Map screen
2. Taps FAB
3. Action sheet: "Plan Scenic Route"
4. Taps option
5. Bottom sheet opens with route planner
6. Large input fields for start/end
7. "Add Waypoint" button (large, easy to tap)
8. "Calculate Route" button (prominent, bottom of sheet)
9. Route appears on map

### Viewing Profile
1. User taps Profile tab (bottom nav)
2. Profile screen loads
3. Large avatar and name visible
4. Subscription badge prominent
5. List items are large and easy to tap
6. Tapping "Settings" opens settings sheet

---

## Key Improvements Over Current Design

1. **Removed desktop sidebar** - No more website-like sidebar
2. **Full-screen map** - Clean, uncluttered map view
3. **Bottom navigation** - Always accessible, thumb-friendly
4. **Large touch targets** - Everything is easy to tap
5. **Bottom sheets** - Natural mobile pattern, easy to dismiss
6. **Clear hierarchy** - Important actions are prominent
7. **Consistent patterns** - Same interactions everywhere
8. **One-handed use** - All primary actions in thumb zone

---

## Implementation Priority

### Phase 1: Core Structure (Now)
- [x] Bottom navigation bar
- [x] Top header
- [ ] Full-screen map (remove all desktop controls)
- [ ] FAB positioning and styling

### Phase 2: Map Screen (Next)
- [ ] Remove all desktop controls from map
- [ ] Implement action sheet for FAB
- [ ] Clean map interactions
- [ ] Proper bottom sheet for route planner

### Phase 3: Explore Screen
- [ ] Large search bar
- [ ] Full-width action cards
- [ ] Filter bottom sheet
- [ ] Results display

### Phase 4: Trips & Profile
- [ ] Tab navigation for Trips
- [ ] Empty states
- [ ] Profile layout
- [ ] Settings sheet

### Phase 5: Polish
- [ ] Animations
- [ ] Haptic feedback
- [ ] Loading states
- [ ] Error states

---

## Success Metrics

✅ **One-handed use**: All primary actions reachable with thumb
✅ **Visual clarity**: Clear hierarchy, easy to scan
✅ **Native feel**: Looks and feels like a real Android app
✅ **Intuitive**: Users understand how to use it without instructions
✅ **Beautiful**: Modern, clean, professional design








