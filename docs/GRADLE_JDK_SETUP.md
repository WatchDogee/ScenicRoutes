# Gradle JDK Configuration

## Problem
"Invalid Gradle JDK configuration found" error when building the project.

## Solution

### Option 1: Set in Android Studio (Recommended)

1. Open **File** → **Settings** (or **Android Studio** → **Preferences** on Mac)
2. Go to **Build, Execution, Deployment** → **Build Tools** → **Gradle**
3. Under **Gradle JDK**, select:
   - **Embedded JDK** (recommended) - Uses Android Studio's bundled JDK
   - OR **JDK 21** if you have it installed
4. Click **Apply** and **OK**
5. **Sync Project with Gradle Files** (elephant icon)

### Option 2: Use Config File (Already Done)

I've created `gradle/config.properties` with the Embedded JDK path. If the path is incorrect, edit it:

**Windows path format:**
```
org.gradle.java.home=C\:\\Program Files\\Android\\Android Studio\\jbr
```

**To use JDK 21 instead:**
```
org.gradle.java.home=C\:\\Program Files\\Java\\jdk-21
```

### Verify

After setting the JDK:
1. **Sync Project with Gradle Files**
2. Check that the error is gone
3. Try building the project

## Notes

- **Embedded JDK** is usually the safest option (comes with Android Studio)
- **JDK 21** is newer and may have better performance
- The project is configured to use **Java 17** for compilation (in `build.gradle.kts`)
- Gradle can use a different JDK version than the project's compile target


































