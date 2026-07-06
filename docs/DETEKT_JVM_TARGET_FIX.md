# Fixing Detekt JVM Target 21 Error

## Problem
Detekt is receiving JVM target 21, but it only supports up to JVM 20. Error:
```
Invalid value (21) passed to --jvm-target, must be one of [1.6, 1.8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
```

## Root Cause
The system Java version or Gradle's Java toolchain is set to Java 21, but Detekt doesn't support it yet.

## Solutions

### Option 1: Use Java 17 for Gradle (Recommended)
Ensure Gradle uses Java 17 instead of Java 21:

1. **Check current Java version:**
   ```bash
   java -version
   ```

2. **Set JAVA_HOME to Java 17:**
   - Download Java 17 if not installed
   - Set `JAVA_HOME` environment variable to Java 17
   - Or set in `gradle.properties`:
     ```
     org.gradle.java.home=C:/path/to/java17
     ```

3. **Verify in Android Studio:**
   - File → Settings → Build, Execution, Deployment → Build Tools → Gradle
   - Set "Gradle JDK" to Java 17

### Option 2: Configure Java Toolchain in build.gradle.kts
Add this to the root `build.gradle.kts`:

```kotlin
java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}
```

### Option 3: Update Detekt (Future)
Wait for Detekt to support JVM 21, or use a newer version if available.

## Current Status
- ✅ ktlint: **PASSING** (all checks pass)
- ❌ detekt: **FAILING** (JVM target 21 issue)
- ❌ SDK License: **NEEDS ACCEPTANCE** (manual step)
- ❌ Compilation: **FAILING** (code issues - separate from automation)

## Quick Test
After fixing, run:
```bash
cd android-native
.\gradlew.bat detekt
```

The JVM target error should be resolved.



















