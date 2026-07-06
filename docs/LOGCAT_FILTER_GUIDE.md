# Logcat Filter Guide

## Filtering "Image decoding logging dropped!" Warning

The warning `Image decoding logging dropped!` is a system-level message from Android's Hardware UI (HWUI) renderer. It appears when there are many image decoding operations and the system drops some log messages to prevent log spam.

### Option 1: Filter in Android Studio Logcat

1. Open Logcat in Android Studio
2. Click the filter dropdown (usually shows "Show only selected application")
3. Select "Edit Filter Configuration"
4. Create a new filter with:
   - **Name**: Hide HWUI Warnings
   - **Log Tag**: `^(?!.*HWUI).*$` (regex to exclude HWUI)
   - Or use **Log Message**: `^(?!.*Image decoding logging dropped).*$` (regex to exclude that specific message)

### Option 2: Use Logcat Command Line

```bash
# Filter out HWUI warnings
adb logcat | grep -v "HWUI"

# Filter out specific message
adb logcat | grep -v "Image decoding logging dropped"
```

### Option 3: Filter by Log Level

```bash
# Show only Error and above (hides Warning messages)
adb logcat *:E

# Show only your app's logs
adb logcat | grep "com.scenicroutes.app"
```

### Option 4: Android Studio Logcat Regex Filter

In Android Studio Logcat:
1. Click the filter icon
2. Add a regex filter:
   - **Pattern**: `^(?!.*Image decoding logging dropped).*$`
   - This will hide all lines containing that message

### Option 5: Create a Saved Filter

1. In Logcat, click "Edit Filter Configuration"
2. Create a filter:
   - **Name**: "App Logs Only"
   - **Package Name**: `com.scenicroutes.app`
   - **Log Level**: `Verbose` or `Debug`
   - This will show only your app's logs, hiding system warnings

## Note

This warning is harmless and doesn't affect app functionality. It's just the system preventing log spam when many images are being decoded. The images will still load correctly.













