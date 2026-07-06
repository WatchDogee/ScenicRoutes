# Navigation UI State Implementation

## Overview
Introduced three-state navigation UI system (PREVIEW, ACTIVE, PAUSED) for improved clarity and parity with professional navigation apps (Kurviger, Calimoto).

## Completed Implementation

### 1. Navigation UI State Enum (NavigationService.kt)
**Status:** ✅ COMPLETE

Added `NavigationUIState` enum to model display modes:
```kotlin
enum class NavigationUIState {
    PREVIEW,  // Route selected, ready to start
    ACTIVE,   // Following route actively
    PAUSED    // Temporarily stopped
}
```

**Exposed as StateFlow:**
```kotlin
private val _navigationUIState = MutableStateFlow(NavigationUIState.PREVIEW)
val navigationUIState: StateFlow<NavigationUIState> = _navigationUIState.asStateFlow()
```

### 2. State Transitions

**PREVIEW → ACTIVE transition:** Occurs when navigation starts
```kotlin
// In startTwoPhaseNavigation() and startSimulation()
_navigationUIState.value = NavigationUIState.ACTIVE
```

**ACTIVE → PAUSED transition:** When pause button clicked
```kotlin
// In pauseNavigation()
_navigationUIState.value = NavigationUIState.PAUSED
```

**PAUSED → ACTIVE transition:** When resume button clicked
```kotlin
// In resumeNavigation()
_navigationUIState.value = NavigationUIState.ACTIVE
```

**Any state → PREVIEW transition:** When navigation ends
```kotlin
// In stopNavigation()
_navigationUIState.value = NavigationUIState.PREVIEW
```

### 3. NavigationScreen Integration

**State collection:**
```kotlin
val navigationUIState by navigationService.navigationUIState.collectAsState()
```

## Remaining Work

### Phase 1: UI Refinements (High Priority)

#### 1.1 Hide Speed Indicator in PREVIEW
**Location:** Bottom-right speed display badge
**Approach:**
```kotlin
if (navigationUIState != NavigationUIState.PREVIEW) {
    // Show speed badge (all existing code)
}
```
- Reduces cognitive load during route preview
- User focuses on start decision, not speed

#### 1.2 Simplified PREVIEW Panel
**Design:** Show only essential information
- **Primary CTA:** "Start Navigation" button (green, prominent)
- **First maneuver:** "In 120 m – Turn right"
- **Summary bar:** "63 km · ETA 14:10"
- **Hide:** Pause/resume buttons, detailed instructions, lane guidance

**Implementation approach:**
```kotlin
if (navigationUIState == NavigationUIState.PREVIEW && currentInstructionIndex == 0) {
    // Show simplified card with first instruction
    // Hide secondary controls
} else {
    // Show full turn-by-turn UI
}
```

### Phase 2: Map Improvements (Medium Priority)

#### 2.1 Route Contrast Enhancement
**Goal:** Make route polyline more visible during PREVIEW
- Increase route line width by 1-2dp in PREVIEW mode
- Consider brighter/more saturated color
- **Location:** Where route is drawn on MapView

#### 2.2 Map Desaturation in PREVIEW
**Goal:** Focus attention on route path
- Apply subtle color filter to basemap in PREVIEW mode
- Reduce saturation by ~15-20%
- Restore full saturation when navigation starts

**Technical approach:**
- Use MapView's tint/overlay capabilities
- Or apply composable overlay with opacity

### Phase 3: Smooth Transitions (Nice-to-have)

#### 3.1 Animated Transition PREVIEW → ACTIVE
- Fade out preview panel
- Fade in full navigation UI
- Smooth camera zoom/pan to first instruction
- Duration: 300-500ms

#### 3.2 Visual State Indicators
- Subtle background color change during PAUSED
- Muted colors/opacity to indicate pause state
- Quick re-activation visual feedback

## Implementation Guide for Each Feature

### Speed Indicator Hiding
1. Find speed badge display code (bottom-right corner)
2. Wrap with: `if (navigationUIState != NavigationUIState.PREVIEW) { ... }`
3. Test: Should disappear when in PREVIEW, reappear in ACTIVE

### Simplified PREVIEW Panel
**Complexity:** Medium (requires careful nesting)

1. Keep existing Card structure for main instructions
2. Add inner conditional: `if (navigationUIState == PREVIEW && index == 0)`
3. Show simplified layout with:
   - First instruction only
   - Distance to first turn
   - Total route distance & ETA
   - "Start Navigation" button

**Tips:**
- Use same Card styling for consistency
- Match Kurviger's preview layout for reference
- Test on various screen sizes

### Map Contrast & Desaturation
**Complexity:** Medium (graphics/rendering)

1. **Route contrast:** Increase `strokeWidth` when drawing polyline in PREVIEW
2. **Desaturation:** Layer overlay CompositionLocalProvider or apply color matrix filter
3. Use LaunchedEffect to trigger animations on state change

## Testing Checklist

- [ ] PREVIEW state shows when route selected before navigation starts
- [ ] Speed indicator hidden in PREVIEW mode
- [ ] Speed indicator visible in ACTIVE/PAUSED modes
- [ ] Transition PREVIEW → ACTIVE works smoothly
- [ ] Pause button transitions to PAUSED state correctly
- [ ] Resume button transitions PAUSED → ACTIVE
- [ ] End navigation returns to PREVIEW
- [ ] Route visibility enhanced in PREVIEW mode
- [ ] No compilation errors or runtime crashes
- [ ] UI responsive across phone sizes (small/medium/large)

## Files Modified

- **NavigationService.kt** - Added NavigationUIState enum and state management
- **NavigationScreen.kt** - Integrated navigationUIState collection and conditional rendering

## Build Status

**Current:** ✅ BUILD SUCCESSFUL
- All changes compile cleanly
- No new warnings introduced
- Ready for incremental feature additions

## Next Steps

1. Implement speed indicator hiding (quick win)
2. Add simplified PREVIEW panel UI
3. Enhance map contrast/desaturation
4. Add smooth transition animations
5. Comprehensive testing on emulator/device

## References

- Kurviger preview mode: Focus on route start decision
- Calimoto preview: Simplified distance/ETA display  
- Material Design 3: State transitions and responsive UI
