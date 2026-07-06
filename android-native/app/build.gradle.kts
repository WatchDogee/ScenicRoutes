plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("jacoco") // Test coverage
    id("org.jlleitschuh.gradle.ktlint") version "12.1.0" // Auto-formatting
    id("io.gitlab.arturbosch.detekt") version "1.23.1" // Code quality
}

// Allow overriding API base URL via gradle property or env var
val apiBaseUrl: String =
    (project.findProperty("API_BASE_URL") as String?)
        ?: System.getenv("API_BASE_URL")
        ?: "http://10.0.2.2:8000/api/"

// Allow feature flag for offline maps
val offlineMapsEnabled: String =
    (project.findProperty("OFFLINE_MAPS_ENABLED") as String?)
        ?: System.getenv("OFFLINE_MAPS_ENABLED")
        ?: "true"

android {
    namespace = "com.scenicroutes.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.scenicroutes.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 8
        versionName = "1.7"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        vectorDrawables {
            useSupportLibrary = true
        }

        // Expose API base URL to app code
        buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrl\"")
        buildConfigField("Boolean", "OFFLINE_MAPS_ENABLED", offlineMapsEnabled.lowercase())
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
        debug {
            enableUnitTestCoverage = true
            enableAndroidTestCoverage = true
            applicationIdSuffix = ".debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    lint {
        // Suppress widget RemoteViewLayout warning - widgets have layout limitations
        disable.add("RemoteViewLayout")
        // Allow warnings to not fail build (we have 136 warnings)
        warningsAsErrors = false
        abortOnError = false
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.4"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
            isReturnDefaultValues = true
        }
        animationsDisabled = true
    }

    // Managed devices for automated testing (no manual emulator needed)
    testOptions {
        managedDevices {
            allDevices {
                // Using pixel5api33 only - pixel4api30 requires license acceptance
                // To re-enable pixel4api30, accept licenses via: sdkmanager --licenses
                maybeCreate<com.android.build.api.dsl.ManagedVirtualDevice>("pixel5api33").apply {
                    device = "Pixel 5"
                    apiLevel = 33
                    systemImageSource = "aosp-atd"
                    testedAbi = "x86_64" // Explicitly set to avoid deprecation warning
                }
            }
        }
    }
}

// Configure Java toolchain to ensure JVM 17 is used (required for Detekt)
// This prevents "Invalid value (21) passed to --jvm-target" error
java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

dependencies {
    // Core Android
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.6.2")
    implementation("androidx.activity:activity-compose:1.8.2")

    // Compose
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.navigation:navigation-compose:2.7.6")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.6.2")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.6.2")

    // DataStore
    implementation("androidx.datastore:datastore-preferences:1.0.0")

    // OSMDroid (Maps)
    implementation("org.osmdroid:osmdroid-android:6.1.18")

    // Image Loading (Coil)
    implementation("io.coil-kt:coil-compose:2.5.0")

    // Networking
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("com.google.code.gson:gson:2.10.1")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // Google Play Billing
    implementation("com.android.billingclient:billing-ktx:6.1.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")

    // Google Play Billing Library v6+
    implementation("com.android.billingclient:billing:6.1.0")
    implementation("com.android.billingclient:billing-ktx:6.1.0")

    // QR Code Generation
    implementation("com.google.zxing:core:3.5.2")

    // Testing Dependencies
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.mockito:mockito-core:5.11.0")
    testImplementation("org.mockito.kotlin:mockito-kotlin:5.2.1")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
    testImplementation("androidx.arch.core:core-testing:2.2.0")
    testImplementation("app.cash.turbine:turbine:1.0.0") // Flow testing
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
    testImplementation("io.mockk:mockk:1.13.8") // Alternative mocking
    testImplementation("org.robolectric:robolectric:4.11.1") // Android context for unit tests
    testImplementation("androidx.test:core:1.5.0") // ApplicationProvider for Robolectric tests

    // Android Test
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.02.00"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    androidTestImplementation("androidx.compose.ui:ui-test-manifest")
    androidTestImplementation("androidx.test:runner:1.5.2")
    androidTestImplementation("androidx.test:rules:1.5.0")
    androidTestImplementation("androidx.navigation:navigation-testing:2.7.6")

    // Compose Testing
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}

// ktlint configuration (auto-formatting)
ktlint {
    version.set("0.50.0")
    debug.set(true)
    verbose.set(true)
    android.set(true)
    outputToConsole.set(true)
    outputColorName.set("RED")
    ignoreFailures.set(false)
    enableExperimentalRules.set(true)

    filter {
        exclude("**/generated/**")
        exclude("**/build/**")
        exclude("**/.gradle/**")
    }
}

// detekt configuration (code quality)
detekt {
    buildUponDefaultConfig = true
    allRules = false
    config.setFrom("$projectDir/../detekt-config.yml")

    tasks.withType<io.gitlab.arturbosch.detekt.Detekt>().configureEach {
        reports {
            html.required.set(true)
            xml.required.set(true)
            txt.required.set(false)
        }
    }
}

// Test Coverage Configuration
tasks.register<JacocoReport>("jacocoTestReport") {
    dependsOn("testDebugUnitTest", "lintDebug")
    mustRunAfter("testDebugUnitTest")

    reports {
        xml.required = true
        html.required = true
        csv.required = false
    }

    val fileFilter = listOf(
        "**/R.class",
        "**/R$*.class",
        "**/BuildConfig.*",
        "**/Manifest*.*",
        "**/*Test*.*",
        "android/**/*.*",
        "**/ui/theme/**",
        "**/di/**",
    )

    val buildDir = layout.buildDirectory.get().asFile
    val debugTree = fileTree("$buildDir/intermediates/javac/debug") {
        exclude(fileFilter)
    }
    val kotlinDebugTree = fileTree("$buildDir/tmp/kotlin-classes/debug") {
        exclude(fileFilter)
    }
    val mainSrc = "${project.projectDir}/src/main/java"

    sourceDirectories.setFrom(files(mainSrc))
    classDirectories.setFrom(files(debugTree, kotlinDebugTree))
    // Only look for execution data in test-specific directories to avoid conflicts with lint
    executionData.setFrom(
        fileTree("$buildDir/jacoco") {
            include("**/*.exec")
        },
        fileTree("$buildDir/outputs/unit_test_code_coverage") {
            include("**/*.ec")
        },
    )
}

// Comprehensive check task - run everything with one command
tasks.register("checkAll") {
    group = "verification"
    description = "Runs all checks: format, lint, detekt, tests, and coverage"

    dependsOn(
        "ktlintFormat",
        "ktlintCheck",
        "detekt",
        "testDebugUnitTest",
        "lintDebug",
        "jacocoTestReport",
    )

    doLast {
        println("✅ All checks completed!")
        println("📊 Coverage report: app/build/reports/jacoco/jacocoTestReport/html/index.html")
        println("📋 Lint report: app/build/reports/lint-results-debug.html")
        println("🔍 Detekt report: app/build/reports/detekt/detekt.html")
    }
}

// Fast check task - quick validation without coverage
tasks.register("checkFast") {
    group = "verification"
    description = "Quick check: format, lint, and unit tests (no coverage)"

    dependsOn(
        "ktlintFormat",
        "ktlintCheck",
        "testDebugUnitTest",
    )

    doLast {
        println("✅ Fast check completed!")
    }
}

// Auto-format task
tasks.register("format") {
    group = "formatting"
    description = "Auto-formats code using ktlint"

    dependsOn("ktlintFormat")

    doLast {
        println("✅ Code formatted!")
    }
}

// Test with coverage task
tasks.register("testWithCoverage") {
    group = "verification"
    description = "Runs tests and generates coverage report"

    dependsOn("testDebugUnitTest", "jacocoTestReport")

    doLast {
        println("✅ Tests completed with coverage!")
        println("📊 View report: app/build/reports/jacoco/jacocoTestReport/html/index.html")
    }
}

// UI tests on managed device (no manual emulator needed)
tasks.register("uiTest") {
    group = "verification"
    description = "Runs UI tests on managed device (automated, no manual emulator)"

    dependsOn("pixel5api33DebugAndroidTest")

    doLast {
        println("✅ UI tests completed on managed device!")
    }
}

// Make checkAll depend on format
tasks.named("checkAll") {
    mustRunAfter("format")
}
