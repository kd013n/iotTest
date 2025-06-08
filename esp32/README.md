# ESP32 Smart Lighting API Integration

This Arduino code integrates your ESP32 smart lighting system with the Supabase database through REST APIs, enabling bidirectional communication between your hardware and the web interface.

## Features

✅ **WiFi Connectivity**: Connects to your home WiFi network
✅ **API Integration**: Communicates with your Next.js/Supabase backend
✅ **Bidirectional Control**: Receives commands from web interface and sends sensor data
✅ **Real-time Updates**: Checks for new commands every 5 seconds
✅ **Sensor Data**: Sends LDR readings every 10 seconds
✅ **Command Confirmation**: Reports command execution status back to database
✅ **Offline Mode**: Continues working with serial commands if WiFi is down
✅ **All Original Features**: RGB control, fade presets, manual overrides preserved

## Hardware Setup

### Pin Configuration
- **RGB LED**: Pins 25 (Red), 26 (Green), 27 (Blue)
- **Kitchen LED**: Pin 14
- **Garage LED**: Pin 12
- **Shared LDR**: Pin 34 (Living Room + Kitchen)
- **Garage LDR**: Pin 35

### Required Libraries
Install these libraries in Arduino IDE:
```
WiFi (ESP32 built-in)
HTTPClient (ESP32 built-in)
ArduinoJson (by Benoit Blanchon)
```

## Software Setup

### 1. Update WiFi Credentials
Edit these lines in the code:
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### 2. Update API Base URL
Find your computer's IP address and update:
```cpp
const char* apiBaseUrl = "http://192.168.1.3:3000/api";  // Replace with your computer's IP
```

**To find your IP address:**
- Windows: `ipconfig` in Command Prompt
- Mac/Linux: `ifconfig` in Terminal
- Look for your WiFi adapter's IP address

### 3. Device IDs (Already Configured)
The device IDs are already set based on your database:
```cpp
const char* rgbLedDeviceId = "af34d4b7-bab2-447d-a6c9-424280446b40";
const char* kitchenLedDeviceId = "35ce79e5-370a-42d2-bef2-8ba5ff621f43";
const char* garageLedDeviceId = "1b2e98cb-27c3-4b40-b4db-f98366cdd857";
const char* sharedLdrDeviceId = "4e3548f3-b877-458c-918b-12ebb223bbaf";
const char* garageLdrDeviceId = "ae5d31cf-088a-408a-9aef-4e1c96313eb9";
```

## How It Works

### Command Processing
1. ESP32 checks for pending commands every 5 seconds
2. Executes commands (RGB control, LED on/off/auto)
3. Reports execution status back to database
4. Commands are marked as "executed" or "failed"

### Sensor Data
1. Reads LDR values every 10 seconds
2. Sends data to `/api/sensors/latest` endpoint
3. Data appears in real-time on the web interface

### API Endpoints Used
- `GET /api/commands?device_id=<id>&status=pending` - Fetch new commands
- `PATCH /api/commands` - Update command status
- `POST /api/sensors/latest` - Send sensor readings

## Serial Commands (Still Available)

All original serial commands work:
- `255,150,0` - Set RGB color
- `#FF9600` - Set RGB color (hex)
- `sunset` / `forest` / `midnight` - Fade presets
- `off` - Turn off RGB
- `kitchen on/off/auto` - Kitchen LED control
- `garage on/off/auto` - Garage LED control

**New commands:**
- `wifi` - Check WiFi status and IP
- `reconnect` - Reconnect to WiFi

## Troubleshooting

### WiFi Connection Issues
1. Check SSID and password
2. Ensure ESP32 is in range
3. Use `reconnect` command to retry
4. Check serial monitor for connection status

### API Communication Issues
1. Verify your computer's IP address
2. Ensure Next.js server is running (`npm run dev`)
3. Check firewall settings
4. Verify device IDs match your database

### Debug Information
The serial monitor shows:
- WiFi connection status
- API request results
- Command execution logs
- Sensor data transmission
- LDR readings every 5 seconds

## Testing the Integration

1. **Upload the code** to your ESP32
2. **Open Serial Monitor** (115200 baud)
3. **Check WiFi connection** - should show IP address
4. **Open web interface** at `http://localhost:3000/lighting`
5. **Test commands** from web interface
6. **Monitor serial output** for command execution
7. **Check sensor data** updates in web interface

## Expected Serial Output
```
🌒 ESP32 Smart LED Controller with API Integration
Connecting to WiFi...
WiFi connected!
IP address: 192.168.1.100
Commands:
  R,G,B        → solid color
  #RRGGBB      → solid color (hex)
  sunset       → fade preset
  forest       → fade preset
  midnight     → fade preset
  off          → turn off RGB
  kitchen on/off/auto
  garage on/off/auto
  API commands will also be processed automatically

LDR (Living+Kitchen): 1500 | Garage LDR: 1800 | WiFi: Connected
Processing command: rgb_control for device: rgb_led
RGB set to solid color: R255 G0 B0
Command 1b1d4d00-2e19-4e71-aa61-bde34b24bce0 marked as executed
Sensor data sent for device 4e3548f3-b877-458c-918b-12ebb223bbaf: 1500 lux
```

## Integration Benefits

✅ **Remote Control**: Control lights from anywhere on your network
✅ **Real-time Monitoring**: See sensor data live in web interface
✅ **Command History**: Track all commands and their status
✅ **Multiple Interfaces**: Use both web and serial commands
✅ **Automatic Sync**: Changes reflect immediately across all interfaces
✅ **Robust Operation**: Continues working even if WiFi drops temporarily

Your ESP32 is now fully integrated with your smart home dashboard!
