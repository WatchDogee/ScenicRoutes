# Android APK Build & Google Play Console Testing Guide

## 📋 Overview
This guide walks you through building a signed APK, uploading it to Google Play Console, and testing with sandbox payments before public release.

---

## 🔑 Prerequisites

- Android Studio installed
- Java 17+ JDK
- Signed keystore file (or create one below)
- Google Play Developer Account (~$25 one-time fee)
- Google Play Console access

---

## 🛠️ STEP 1: Create or Prepare Signing Keystore

### Option A: Create New Keystore
```powershell
# In PowerShell (Windows)
cd c:\Users\mairi\OneDrive\Dators\ScenicRoutes\ScenicRoutes_dev\android-native

# Use keytool from JDK
keytool -genkey -v -keystore scenicroutes-release.jks `
  -keyalg RSA -keysize 2048 -validity 10000 `
  -alias scenicroutes `
  -storepass YOUR_STORE_PASSWORD `
  -keypass YOUR_KEY_PASSWORD `
  -dname "CN=ScenicRoutes,O=ScenicRoutes,L=London,ST=London,C=GB"

# Output: scenicroutes-release.jks (keep this file safe!)
```

### Option B: Verify Existing Keystore
```powershell
keytool -list -v -keystore scenicroutes-release.jks `
  -storepass YOUR_STORE_PASSWORD
```

**⚠️ CRITICAL**: Keep the keystore file and passwords secure. You'll need them for every future update.

---

## 📝 STEP 2: Configure Gradle Signing

### Edit `android-native/app/build.gradle.kts` (or `build.gradle`)

Add signing config:
```gradle
android {
    signingConfigs {
        release {
            storeFile = file("../scenicroutes-release.jks")
            storePassword = "YOUR_STORE_PASSWORD"
            keyAlias = "scenicroutes"
            keyPassword = "YOUR_KEY_PASSWORD"
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.release
            minifyEnabled = true
            shrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}
```

---

## 🔨 STEP 3: Build Signed APK

### Option A: Command Line (Recommended)
```powershell
cd c:\Users\mairi\OneDrive\Dators\ScenicRoutes\ScenicRoutes_dev\android-native

# Build release APK
./gradlew assembleRelease

# Output: app/build/outputs/apk/release/app-release.apk
```

### Option B: Android Studio
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Set build variant to **Release**
3. Wait for build to complete
4. Click **Locate** to open folder

### Verify APK Signature
```powershell
# Check if APK is properly signed
jarsigner -verify -verbose -certs app/build/outputs/apk/release/app-release.apk
```

---

## 📊 STEP 4: Set Up Google Play Console

### 4.1 Create Google Play Developer Account
1. Go to [Google Play Console](https://play.google.com/console)
2. Sign in with Google account
3. Accept agreement and pay $25 one-time fee
4. Complete merchant setup and tax forms

### 4.2 Create App in Console
1. Click **Create app**
2. **App name**: "ScenicRoutes"
3. **Default language**: English
4. **App or game**: Select "App"
5. **Category**: "Travel & Local" or "Maps"
6. **Content rating**: Fill out questionnaire
7. Click **Create**

### 4.3 Complete App Details
**Dashboard** → **Setup** → Fill in:
- **App name & description**
- **Screenshots** (minimum 2, max 8)
  - Dimensions: 1080 x 1920 pixels
  - Show key features: map, route planning, navigation
- **Feature graphic**: 1024 x 500 pixels
- **Icon**: 512 x 512 pixels
- **Promotional video** (optional, YouTube link)
- **Accessibility declaration**

---

## 🧪 STEP 5: Set Up Internal Testing Track

### 5.1 Upload APK to Internal Testing
1. **Dashboard** → **Testing** → **Internal testing**
2. Click **Create new release**
3. Click **Upload APK**
4. Select your signed APK: `app-release.apk`
5. Add release notes: "Internal testing - sandbox payments"
6. Click **Save**

### 5.2 Add Internal Testers
1. In **Internal testing** section, scroll to **Testers**
2. Click **Add testers**
3. Enter Google accounts (can be Gmail accounts or workspace)
4. Save

**Share link** with testers:
- Each tester gets a unique link
- Link becomes active once APK is uploaded
- Testers can join the beta program and install app

---

## 💳 STEP 6: Configure Sandbox Testing (Payments)

### 6.1 Set Up Test Accounts in Google Play Console
1. **Dashboard** → **Account settings** (top right)
2. **Licenses and API keys** (left sidebar)
3. Look for **License Testing** section
4. Add test email addresses:
   - Your email (for internal tester)
   - Other tester emails
5. Click **Add test account**

### 6.2 Configure Billing Profile
1. **Dashboard** → **Setup** → **App details**
2. Scroll to **Pricing and distribution**
3. Select **Countries/regions** where app is available
4. Enable **Require billing profile** (for premium features)
5. Save

### 6.3 Create In-App Products
1. **Dashboard** → **Monetization** → **In-app products**
2. **Create product**:
   - **Product ID**: `premium_monthly`
   - **Type**: Subscription
   - **Title**: "Premium (Monthly)"
   - **Description**: "Access premium features"
   - **Pricing**: Set monthly price (e.g., $2.99)
3. Repeat for:
   - `premium_yearly` (e.g., $29.99/year)
   - `pro_monthly` (e.g., $14.99/month)
   - `pro_yearly` (e.g., $149.99/year)

---

## 🧪 STEP 7: Test Sandbox Payments

### 7.1 Sandbox Test Account Setup
Once you've added a test account in Google Play Console:
1. Install the APK on a device/emulator
2. Sign in with **test account email**
3. Open **Settings** → **Subscription**
4. Try to purchase premium tier

### 7.2 Test Transactions
When using a sandbox test account, you can:
- **Simulate successful purchase** (uses fake "Google Play Billing" methods)
- **Try different payment responses** without real charges
- **Verify** subscription status syncs to backend
- **Cancel** subscription and verify cancellation

### 7.3 Expected Behavior
- No real money charged
- Subscription appears in app immediately
- Backend receives `purchase_token` and verifies
- Premium features unlock
- Cancellation works without charges

---

## 🚀 STEP 8: Test Internal Track Before Public Release

### 8.1 Installation
1. Open link sent to tester (or find in Play Store search)
2. Click **Join beta** or **Install**
3. Download and install app
4. Run through user flows

### 8.2 Test Checklist
- [ ] App launches without crashes
- [ ] Login/registration works
- [ ] Map loads and routes calculate
- [ ] Collections and saved roads work
- [ ] Premium features behind paywall
- [ ] Sandbox purchase succeeds
- [ ] Subscription syncs to backend
- [ ] Navigation works (if offline maps enabled)
- [ ] Settings and account deletion work
- [ ] Logout and re-login works

### 8.3 Report Feedback
- Collect tester feedback via email or in-app feedback form
- Fix critical bugs
- Upload new APK to internal track
- Repeat testing

---

## 📤 STEP 9: Move to Closed Beta (Optional)

Once internal testing passes:
1. **Dashboard** → **Testing** → **Closed beta**
2. **Create release** with same APK
3. Add larger tester group (friends, colleagues)
4. Run for 1-2 weeks
5. Collect feedback and fix issues

---

## 🔐 STEP 10: Move to Staged Rollout (Optional Before Public)

### 10.1 Staged Rollout Setup
1. **Dashboard** → **Release** → **Production**
2. **Create release**
3. Upload APK
4. Set **rollout percentage**: Start at 5% or 10%
5. Monitor crash rates and reviews
6. Gradually increase: 25% → 50% → 100%

### 10.2 Rollout Monitoring
- Watch **Play Console Dashboard** for:
  - Crash rates
  - User reviews and ratings
  - Installation stats
  - Uninstall rates

---

## ✅ Final Pre-Release Checklist

- [ ] APK is signed with release keystore
- [ ] Internal testing passed with sandbox payments
- [ ] All critical bugs fixed
- [ ] Content rating completed
- [ ] Screenshots and graphics uploaded
- [ ] Privacy policy linked (in **App details**)
- [ ] Terms of service linked (if applicable)
- [ ] Accessibility declaration submitted
- [ ] Google Play Billing correctly integrated and tested
- [ ] Account deletion working (Google Play requirement)
- [ ] APK version code incremented (must be higher than previous)
- [ ] App package name is correct: `com.scenicroutes.app`

---

## 🚀 Release to Public

Once everything passes:
1. **Dashboard** → **Release** → **Production**
2. **Create new release**
3. Upload APK
4. Add release notes
5. Click **Review** → **Start rollout to Production**
6. Set rollout: Start at 5-10%, monitor, then 100%

---

## 🔧 Troubleshooting

### Google Play Says "Wrong API Level"
If Play Console shows API 34 when you configured API 35:
```gradle
// Fix in android-native/app/build.gradle.kts
android {
    compileSdk = 35  // Must match target API
    defaultConfig {
        targetSdk = 35  // Must be 35 for Android 15
    }
}
```
Then rebuild:
```powershell
./gradlew clean assembleRelease
```

### APK Won't Install
```powershell
# Check APK signature
keytool -verify -verbose -certs app/build/outputs/apk/release/app-release.apk

# Try installing via adb
adb install app/build/outputs/apk/release/app-release.apk
```

### Sandbox Payment Not Working
- Verify test account is added in **Google Play Console** > **Account settings**
- Ensure device/emulator is signed in with test account
- Check backend logs for `google-play/verify` requests
- Verify `GOOGLE_PLAY_BILLING` env variables are set

### App Crashes on Startup
- Check logcat: `adb logcat | grep ScenicRoutes`
- Verify API endpoints are correct
- Check backend health: `curl https://api.scenicroutes.me/health`

### Backend Not Receiving Purchase Token
- Enable logging in `GooglePlayController`
- Verify `google-play/verify` endpoint is reachable
- Check network permissions in `AndroidManifest.xml`

---

## 📞 Support & Resources

- **Google Play Console Help**: https://support.google.com/googleplay/android-developer
- **Android Build Documentation**: https://developer.android.com/studio/build
- **In-App Billing Guide**: https://developer.android.com/google/play/billing
- **Testing**: https://developer.android.com/google/play/billing/test

---

**Last Updated**: January 28, 2026
