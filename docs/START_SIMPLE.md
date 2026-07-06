# GraphHopper - Simple Start Guide

## Method 1: Direct OSM File (Recommended for First Time)

```powershell
cd graphhopper
java -Xmx4g -Xms4g -jar graphhopper-web-8.0.jar server latvia-latest.osm.pbf
```

**What happens:**
- First time: Imports OSM data (10-30 min), creates `graph-cache/` directory
- Subsequent runs: Uses cached graph, starts immediately
- Server runs on `http://localhost:8989`

## Method 2: Using Config File (After Initial Import)

After the first import completes, you can use a config file:

```powershell
cd graphhopper
java -Xmx4g -Xms4g -jar graphhopper-web-8.0.jar server config-working.yml
```

**Note:** Config file requires the graph cache to already exist from Method 1.

## Test the Server

Once running, test with:
```powershell
curl http://localhost:8989/info
```

Or in browser: `http://localhost:8989/info`

## Stop the Server

Press `Ctrl+C` in the PowerShell window, or:
```powershell
Stop-Process -Name java -Force
```











