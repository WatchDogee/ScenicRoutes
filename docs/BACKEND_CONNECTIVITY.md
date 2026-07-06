# Backend Connectivity Issues

## Problem
The Android app is making API calls but they're failing with:
- `java.net.SocketTimeoutException: failed to connect to /10.0.2.2 (port 8000)`
- `java.net.SocketException: Socket closed`
- `java.io.IOException: Canceled`

## Solution

### 1. Ensure Backend Server is Running
Make sure your Laravel backend server is running on your host machine:
```bash
php artisan serve
# or
php artisan serve --host=0.0.0.0 --port=8000
```

### 2. Verify Emulator Network Configuration
The Android emulator uses `10.0.2.2` to access `localhost` on your host machine. This is already configured in:
- `android-native/app/src/main/java/com/scenicroutes/app/data/network/NetworkModule.kt` - BASE_URL is set to `http://10.0.2.2:8000/api/`
- `android-native/app/src/main/res/xml/network_security_config.xml` - Allows cleartext traffic to `10.0.2.2`

### 3. Test Backend Connectivity
From your host machine, verify the backend is accessible:
```bash
curl http://localhost:8000/api/public-collections
```

### 4. Check Firewall
Ensure your firewall isn't blocking port 8000:
- Windows: Check Windows Firewall settings
- Linux/Mac: Check iptables or firewall rules

### 5. Alternative: Use Physical Device
If using a physical device instead of emulator:
1. Find your computer's IP address (e.g., `192.168.1.100`)
2. Update `NetworkModule.kt` BASE_URL to: `http://YOUR_IP:8000/api/`
3. Ensure your phone and computer are on the same network
4. Update `network_security_config.xml` to allow your IP

### 6. Check Backend CORS Settings
Ensure your Laravel backend allows requests from the Android app. Check `config/cors.php`:
```php
'allowed_origins' => ['*'], // or specific origins
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
```

### 7. Verify Network Security Config
The app already has network security config allowing cleartext traffic for development. If you need HTTPS in production, you'll need to:
1. Set up SSL certificate
2. Update BASE_URL to use `https://`
3. Remove cleartext traffic permissions

## Current Status
- ✅ Network security config allows cleartext to `10.0.2.2`
- ✅ BASE_URL is correctly set to `http://10.0.2.2:8000/api/`
- ❌ Backend server not accessible (needs to be running)

## Next Steps
1. Start your backend server: `php artisan serve`
2. Verify it's accessible: `curl http://localhost:8000/api/public-collections`
3. Rebuild and run the Android app
4. Check Logcat for successful API calls

































