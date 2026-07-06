# GraphHopper Setup - Complete Guide

## ✅ Current Status

GraphHopper 8.0 is configured and starting. The server runs in the background in Cursor terminal.

## 📋 What Was Done

1. **Downloaded GraphHopper 8.0 JAR** - `graphhopper-web-8.0.jar`
2. **Downloaded OSM Data** - `latvia-latest.osm.pbf` for Latvia region
3. **Created Configuration** - `config.yml` with proper GraphHopper 8.0 format
4. **Created Custom Model** - `custom_models/car.json` (GraphHopper 8.0 requires custom models)

## 🚀 Starting GraphHopper

### Method 1: Background Job (Current)
```powershell
cd graphhopper
java -Xmx4g -Xms4g -jar graphhopper-web-8.0.jar server config.yml
```

### Method 2: Check Status
```powershell
# Check if server is running
Invoke-RestMethod -Uri http://localhost:8989/info

# Check Java process
Get-Process java
```

## ⚙️ Configuration Files

### `config.yml`
- Uses GraphHopper 8.0 format (flat properties)
- Includes required `import.osm.ignored_highways`
- Car profile with custom model

### `custom_models/car.json`
- Speed limits by road class
- Avoids DESTINATION-only roads

## 📝 Notes

- **First Import**: Takes 10-30 minutes (one-time)
- **Subsequent Starts**: Uses cached graph, starts in seconds
- **Server Port**: `http://localhost:8989`
- **Memory**: Allocated 4GB RAM

## 🔧 Next Steps

1. Wait for first import to complete (check server with `/info` endpoint)
2. Create motorcycle custom model (GraphHopper 8.0 requires custom models for motorcycle)
3. Test routes from Laravel app
4. Compare with Kurviger quality

## 🐛 Troubleshooting

- **Server not responding**: First import still running (10-30 min)
- **Config errors**: Check `config.yml` format matches GraphHopper 8.0 requirements
- **Custom model errors**: Verify JSON syntax in `custom_models/car.json`











