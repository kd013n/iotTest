#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <ESP32Servo.h>

// === WiFi Configuration ===
const char *ssid = "ZTE_2.4G_J3Snvh";
const char *password = "h5WrbQq7";

// === API Configuration ===
const char *apiBaseUrl = "http://192.168.1.13:3000/api"; // Replace with your computer's IP
const unsigned long apiCheckInterval = 500;              // Check for commands every 500ms
const unsigned long sensorSendInterval = 2000;           // Send sensor data every 2 seconds
const unsigned long batchSensorInterval = 5000;          // Batch multiple sensor readings

// === Device IDs (from your database) ===
const char *rgbLedDeviceId = "af34d4b7-bab2-447d-a6c9-424280446b40";
const char *kitchenLedDeviceId = "35ce79e5-370a-42d2-bef2-8ba5ff621f43";
const char *garageLedDeviceId = "1b2e98cb-27c3-4b40-b4db-f98366cdd857";
const char *sharedLdrDeviceId = "4e3548f3-b877-458c-918b-12ebb223bbaf";
const char *garageLdrDeviceId = "ae5d31cf-088a-408a-9aef-4e1c96313eb9";

// === Fan Control Device IDs (Add your actual IDs from Supabase) ===
const char *temperatureSensorDeviceId = "69ae1a2e-d49f-4b57-b4fc-9674977bcb0c";
const char *fanMotorDeviceId = "006e2dd6-fdb9-420c-81d6-39e896d69bd1";

// === Rain Detection Device IDs (Add your actual IDs from Supabase) ===
const char *rainSensorDeviceId = "ca422f10-fbb6-46e3-a30c-9b25ae10bdbc";
const char *windowServo1DeviceId = "bfdf323f-23e0-4c3a-8696-5e44720cfdc8";
const char *windowServo2DeviceId = "163f8037-ac95-4a7b-9229-3dde8a8b78e5";

// === Timing Variables ===
unsigned long lastApiCheck = 0;
unsigned long lastSensorSend = 0;
unsigned long lastBatchSensor = 0;

// === Sensor Data Batching ===
int lastLdrValue = -1;
int lastGarageLdrValue = -1;
bool sensorDataChanged = false;

// === RGB LED Pins ===
const int redPin = 25;
const int greenPin = 26;
const int bluePin = 27;

// === LDR Setup ===
const int ldrPin = 34; // Shared LDR for Living Room RGB + Kitchen
int ldrThreshold = 2000;
const int garageLdrPin = 35; // Separate LDR for garage
int garageLdrThreshold = 2000;

// === New LEDs & LDRs ===
const int kitchenLedPin = 14; // Kitchen LED (shares LDR)
const int garageLedPin = 12;  // Garage LED (own LDR)

// === Fan Control Hardware ===
#define DHTPIN 15 // DHT11 data pin
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

const int motorPin = 5; // GPIO5 connected to IRLZ44N Gate

// === Rain Detection Hardware ===
const int rainSensorPin = 4;
const int windowServoPin1 = 13;
const int windowServoPin2 = 16; // Changed from 14 to avoid conflict

Servo windowServo1, windowServo2;

// === Manual Control Flags ===
bool kitchenManualOverride = false;
bool kitchenLEDState = false;

bool garageManualOverride = false;
bool garageLEDState = false;

// === Fan Control Variables ===
bool fanAutoControl = true; // Default to automatic mode

// PWM levels for fan speeds
const uint8_t pwmOff = 0;
const uint8_t pwmLow = 150;  // ~33% duty cycle
const uint8_t pwmMed = 210;  // ~66% duty cycle
const uint8_t pwmHigh = 255; // 100%

uint8_t manualPWM = pwmOff; // Current PWM level
float lastTemperature = 0.0;
unsigned long lastTempSend = 0;
const unsigned long tempSendInterval = 5000; // Send temperature every 5 seconds

// === Rain Detection Variables ===
enum RainMode
{
  RAIN_AUTO,
  RAIN_MANUAL
};
enum RainLevel
{
  NO_RAIN,
  LIGHT_RAIN,
  MODERATE_RAIN,
  HEAVY_RAIN
};
enum WindowState
{
  WINDOW_OPEN = 0,
  WINDOW_CLOSED = 165
};

RainMode currentRainMode = RAIN_AUTO;
WindowState currentWindowState = WINDOW_OPEN;
RainLevel currentRainLevel = NO_RAIN;

// Rain detection parameters
const int RAIN_SAMPLES = 10;
const int RAIN_SAMPLE_INTERVAL = 50;
const int NO_RAIN_THRESHOLD = 200;
const int LIGHT_RAIN_THRESHOLD = 400;
const int MODERATE_RAIN_THRESHOLD = 600;
const int DRY_CONFIRMATION_COUNT = 20; // 10 seconds of consistent dry readings

int dryReadingCounter = 0;
unsigned long lastRainSampleTime = 0;
unsigned long lastRainSend = 0;
const unsigned long rainSendInterval = 3000; // Send rain data every 3 seconds

// === Modes ===
enum Mode
{
  SOLID,
  FADE,
  OFF
};
Mode currentMode = SOLID;

// === User-selected solid color ===
int solidR = 255, solidG = 255, solidB = 255;

// === Fade Palette ===
const int fadeDelay = 20;
int fadeIndex = 0;
unsigned long lastFadeTime = 0;

struct Color
{
  int r, g, b;
};

Color currentFade[3];
int numFadeColors = 3;
Color palettes[3][3] = {
    {{235, 45, 0}, {252, 244, 16}, {252, 109, 16}}, // Sunset
    {{47, 237, 1}, {30, 169, 64}, {0, 235, 102}},   // Forest
    {{16, 143, 252}, {16, 39, 252}, {111, 16, 252}} // Midnight
};

// === Debug Timing ===
unsigned long lastDebugTime = 0;
const unsigned long debugInterval = 5000; // Increased to 5 seconds to reduce spam

void setup()
{
  Serial.begin(115200);

  // RGB LED PWM setup
  ledcAttach(redPin, 5000, 8);
  ledcAttach(greenPin, 5000, 8);
  ledcAttach(bluePin, 5000, 8);

  // Kitchen and Garage LED setup
  pinMode(kitchenLedPin, OUTPUT);
  pinMode(garageLedPin, OUTPUT);

  // Fan control setup
  dht.begin();
  pinMode(motorPin, OUTPUT);

  // Rain detection setup
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);

  windowServo1.setPeriodHertz(50);
  windowServo1.attach(windowServoPin1, 1000, 2000);
  windowServo2.setPeriodHertz(50);
  windowServo2.attach(windowServoPin2, 1000, 2000);

  delay(1000);
  setWindowState(WINDOW_OPEN);

  Serial.println("🌒 ESP32 Smart LED Controller with API Integration");

  // Connect to WiFi
  connectToWiFi();

  Serial.println("Commands:");
  Serial.println("  R,G,B        → solid color");
  Serial.println("  #RRGGBB      → solid color (hex)");
  Serial.println("  sunset       → fade preset");
  Serial.println("  forest       → fade preset");
  Serial.println("  midnight     → fade preset");
  Serial.println("  off          → turn off RGB");
  Serial.println("  kitchen on/off/auto");
  Serial.println("  garage on/off/auto");
  Serial.println("  API commands will also be processed automatically");
}

void loop()
{
  // Keep WiFi connected
  if (WiFi.status() != WL_CONNECTED)
  {
    connectToWiFi();
  }

  handleSerial();

  // === LDR Readings ===
  int ldrValue = analogRead(ldrPin);             // Living room + Kitchen
  int garageLdrValue = analogRead(garageLdrPin); // Garage

  bool isDark = ldrValue < ldrThreshold;
  bool isGarageDark = garageLdrValue < garageLdrThreshold;

  // === Kitchen LED Control ===
  if (kitchenManualOverride)
  {
    digitalWrite(kitchenLedPin, kitchenLEDState ? HIGH : LOW);
  }
  else
  {
    digitalWrite(kitchenLedPin, isDark ? HIGH : LOW);
  }

  // === Garage LED Control ===
  if (garageManualOverride)
  {
    digitalWrite(garageLedPin, garageLEDState ? HIGH : LOW);
  }
  else
  {
    digitalWrite(garageLedPin, isGarageDark ? HIGH : LOW);
  }

  // === RGB LED Logic (Living Room) ===
  if (!isDark || currentMode == OFF)
  {
    setLED(0, 0, 0);
  }
  else if (currentMode == SOLID)
  {
    setLED(solidR, solidG, solidB);
  }
  else if (currentMode == FADE)
  {
    fadePalette();
  }

  // === Fan Control Logic ===
  float temp = dht.readTemperature();
  if (!isnan(temp))
  {
    lastTemperature = temp;

    // Auto mode control
    if (fanAutoControl)
    {
      if (temp < 30.0)
      {
        manualPWM = pwmOff;
      }
      else if (temp >= 30.0 && temp <= 31.0)
      {
        manualPWM = pwmLow;
      }
      else if (temp > 31.0 && temp <= 32.0)
      {
        manualPWM = pwmMed;
      }
      else if (temp > 32.0)
      {
        manualPWM = pwmHigh;
      }
    }
  }

  // Apply fan speed
  analogWrite(motorPin, manualPWM);

  // === API Communication ===
  unsigned long currentTime = millis();

  // Check for new commands from API
  if (currentTime - lastApiCheck >= apiCheckInterval)
  {
    checkForCommands();
    lastApiCheck = currentTime;
  }

  // Check if sensor data changed significantly (optimization)
  if (abs(ldrValue - lastLdrValue) > 50 || abs(garageLdrValue - lastGarageLdrValue) > 50)
  {
    sensorDataChanged = true;
  }

  // Send sensor data only if changed or on interval
  if (sensorDataChanged && (currentTime - lastSensorSend >= sensorSendInterval))
  {
    sendSensorDataOptimized(ldrValue, garageLdrValue);
    lastLdrValue = ldrValue;
    lastGarageLdrValue = garageLdrValue;
    sensorDataChanged = false;
    lastSensorSend = currentTime;
  }

  // Force send every 5 seconds regardless of changes (heartbeat)
  if (currentTime - lastBatchSensor >= batchSensorInterval)
  {
    if (!sensorDataChanged)
    {
      sendSensorDataOptimized(ldrValue, garageLdrValue);
      lastLdrValue = ldrValue;
      lastGarageLdrValue = garageLdrValue;
    }
    lastBatchSensor = currentTime;
  }

  // Send temperature data
  if (currentTime - lastTempSend >= tempSendInterval && !isnan(lastTemperature))
  {
    sendTemperatureData(lastTemperature);
    lastTempSend = currentTime;
  }

  // === Rain Detection Logic ===
  if (currentRainMode == RAIN_AUTO)
  {
    if (currentTime - lastRainSampleTime >= RAIN_SAMPLE_INTERVAL)
    {
      processRainDetection();
      lastRainSampleTime = currentTime;
    }
  }

  // Send rain data
  if (currentTime - lastRainSend >= rainSendInterval)
  {
    sendRainData();
    lastRainSend = currentTime;
  }

  // === Debug Output Every 5000ms ===
  if (currentTime - lastDebugTime >= debugInterval)
  {
    Serial.printf("LDR: %d | Garage: %d | Temp: %.1f°C | Fan: %d (%s) | Rain: %s | Windows: %s (%s) | WiFi: %s\n",
                  ldrValue, garageLdrValue, lastTemperature, manualPWM,
                  fanAutoControl ? "AUTO" : "MANUAL",
                  getRainLevelString(currentRainLevel),
                  currentWindowState == WINDOW_OPEN ? "OPEN" : "CLOSED",
                  currentRainMode == RAIN_AUTO ? "AUTO" : "MANUAL",
                  WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
    lastDebugTime = currentTime;
  }
}

void connectToWiFi()
{
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20)
  {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  }
  else
  {
    Serial.println();
    Serial.println("WiFi connection failed. Operating in offline mode.");
  }
}

void checkForCommands()
{
  if (WiFi.status() != WL_CONNECTED)
    return;

  HTTPClient http;

  // Get ALL pending commands in one API call (much faster!)
  String url = String(apiBaseUrl) + "/commands?status=pending&limit=10";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(2000); // 2 second timeout for faster response

  int httpResponseCode = http.GET();

  if (httpResponseCode == 200)
  {
    String response = http.getString();

    // Use smaller JSON document for better performance
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, response);

    if (!error)
    {
      // Process each command
      for (JsonObject command : doc.as<JsonArray>())
      {
        String commandId = command["id"];
        String deviceId = command["device_id"];
        String commandType = command["command_type"];
        JsonObject commandData = command["command_data"];

        // Determine device type based on device ID
        const char *deviceType = getDeviceType(deviceId.c_str());
        if (deviceType != nullptr)
        {
          Serial.printf("Processing command: %s for device: %s\n", commandType.c_str(), deviceType);

          // Execute the command based on device type
          bool success = executeCommand(deviceType, commandType, commandData);

          // Update command status (async, don't wait)
          updateCommandStatusAsync(commandId, success ? "executed" : "failed");
        }
      }
    }
  }

  http.end();
}

// Helper function to determine device type from device ID
const char *getDeviceType(const char *deviceId)
{
  if (strcmp(deviceId, rgbLedDeviceId) == 0)
    return "rgb_led";
  if (strcmp(deviceId, kitchenLedDeviceId) == 0)
    return "kitchen_led";
  if (strcmp(deviceId, garageLedDeviceId) == 0)
    return "garage_led";
  if (strcmp(deviceId, fanMotorDeviceId) == 0)
    return "fan_motor";
  if (strcmp(deviceId, temperatureSensorDeviceId) == 0)
    return "temperature_sensor";
  if (strcmp(deviceId, rainSensorDeviceId) == 0)
    return "rain_sensor";
  if (strcmp(deviceId, windowServo1DeviceId) == 0)
    return "window_servo";
  if (strcmp(deviceId, windowServo2DeviceId) == 0)
    return "window_servo";
  return nullptr;
}

// Unified command execution function
bool executeCommand(const char *deviceType, String commandType, JsonObject commandData)
{
  if (strcmp(deviceType, "rgb_led") == 0)
  {
    return executeRGBCommand(commandType, commandData);
  }
  else if (strcmp(deviceType, "kitchen_led") == 0)
  {
    return executeKitchenCommand(commandType, commandData);
  }
  else if (strcmp(deviceType, "garage_led") == 0)
  {
    return executeGarageCommand(commandType, commandData);
  }
  else if (strcmp(deviceType, "fan_motor") == 0)
  {
    return executeFanCommand(commandType, commandData);
  }
  else if (strcmp(deviceType, "rain_sensor") == 0 || strcmp(deviceType, "window_servo") == 0)
  {
    return executeRainCommand(commandType, commandData);
  }
  return false;
}

// Async command status update (fire and forget)
void updateCommandStatusAsync(String commandId, String status)
{
  // Store in a simple queue for later processing
  // For now, just call the regular function but with shorter timeout
  HTTPClient http;
  String url = String(apiBaseUrl) + "/commands";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(1000); // Very short timeout for status updates

  DynamicJsonDocument doc(256); // Smaller document
  doc["id"] = commandId;
  doc["status"] = status;

  String jsonString;
  serializeJson(doc, jsonString);

  http.PATCH(jsonString);
  http.end(); // Don't wait for response
}

void checkDeviceCommands(const char *deviceId, const char *deviceType)
{
  HTTPClient http;
  String url = String(apiBaseUrl) + "/commands?device_id=" + deviceId + "&status=pending";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  int httpResponseCode = http.GET();

  if (httpResponseCode == 200)
  {
    String response = http.getString();

    DynamicJsonDocument doc(2048);
    deserializeJson(doc, response);

    // Process each command
    for (JsonObject command : doc.as<JsonArray>())
    {
      String commandId = command["id"];
      String commandType = command["command_type"];
      JsonObject commandData = command["command_data"];

      Serial.printf("Processing command: %s for device: %s\n", commandType.c_str(), deviceType);

      // Execute the command based on device type
      bool success = false;
      if (strcmp(deviceType, "rgb_led") == 0)
      {
        success = executeRGBCommand(commandType, commandData);
      }
      else if (strcmp(deviceType, "kitchen_led") == 0)
      {
        success = executeKitchenCommand(commandType, commandData);
      }
      else if (strcmp(deviceType, "garage_led") == 0)
      {
        success = executeGarageCommand(commandType, commandData);
      }

      // Update command status
      updateCommandStatus(commandId, success ? "executed" : "failed");
    }
  }

  http.end();
}

bool executeRGBCommand(String commandType, JsonObject commandData)
{
  if (commandType == "rgb_control")
  {
    String mode = commandData["mode"];

    if (mode == "solid")
    {
      JsonObject color = commandData["color"];
      solidR = color["r"];
      solidG = color["g"];
      solidB = color["b"];
      currentMode = SOLID;
      Serial.printf("RGB set to solid color: R%d G%d B%d\n", solidR, solidG, solidB);
      return true;
    }
    else if (mode == "fade")
    {
      String preset = commandData["preset"];
      currentMode = FADE;

      if (preset == "sunset")
      {
        setPalette(palettes[0]);
        Serial.println("RGB set to fade: Sunset");
      }
      else if (preset == "forest")
      {
        setPalette(palettes[1]);
        Serial.println("RGB set to fade: Forest");
      }
      else if (preset == "midnight")
      {
        setPalette(palettes[2]);
        Serial.println("RGB set to fade: Midnight");
      }
      return true;
    }
    else if (mode == "off")
    {
      currentMode = OFF;
      Serial.println("RGB turned OFF");
      return true;
    }
  }
  return false;
}

bool executeKitchenCommand(String commandType, JsonObject commandData)
{
  if (commandType == "led_control")
  {
    String action = commandData["action"];
    bool manualOverride = commandData["manual_override"];

    if (action == "on")
    {
      kitchenManualOverride = true;
      kitchenLEDState = true;
      Serial.println("Kitchen LED manually turned ON via API");
      return true;
    }
    else if (action == "off")
    {
      kitchenManualOverride = true;
      kitchenLEDState = false;
      Serial.println("Kitchen LED manually turned OFF via API");
      return true;
    }
    else if (action == "auto")
    {
      kitchenManualOverride = false;
      Serial.println("Kitchen LED set to auto mode via API");
      return true;
    }
  }
  return false;
}

bool executeGarageCommand(String commandType, JsonObject commandData)
{
  if (commandType == "led_control")
  {
    String action = commandData["action"];
    bool manualOverride = commandData["manual_override"];

    if (action == "on")
    {
      garageManualOverride = true;
      garageLEDState = true;
      Serial.println("Garage LED manually turned ON via API");
      return true;
    }
    else if (action == "off")
    {
      garageManualOverride = true;
      garageLEDState = false;
      Serial.println("Garage LED manually turned OFF via API");
      return true;
    }
    else if (action == "auto")
    {
      garageManualOverride = false;
      Serial.println("Garage LED set to auto mode via API");
      return true;
    }
  }
  return false;
}

void updateCommandStatus(String commandId, String status)
{
  HTTPClient http;
  String url = String(apiBaseUrl) + "/commands";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  DynamicJsonDocument doc(512);
  doc["id"] = commandId;
  doc["status"] = status;
  doc["response_data"]["timestamp"] = millis();

  String jsonString;
  serializeJson(doc, jsonString);

  int httpResponseCode = http.PATCH(jsonString);

  if (httpResponseCode == 200)
  {
    Serial.printf("Command %s marked as %s\n", commandId.c_str(), status.c_str());
  }
  else
  {
    Serial.printf("Failed to update command status: %d\n", httpResponseCode);
  }

  http.end();
}

void sendSensorData(int ldrValue, int garageLdrValue)
{
  if (WiFi.status() != WL_CONNECTED)
    return;

  // Send shared LDR data
  sendSensorReading(sharedLdrDeviceId, "light", ldrValue, "lux");

  // Send garage LDR data
  sendSensorReading(garageLdrDeviceId, "light", garageLdrValue, "lux");
}

// Optimized sensor data sending with batching
void sendSensorDataOptimized(int ldrValue, int garageLdrValue)
{
  if (WiFi.status() != WL_CONNECTED)
    return;

  HTTPClient http;
  String url = String(apiBaseUrl) + "/sensors/batch";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(1500); // Short timeout

  // Send both sensor readings in one API call
  DynamicJsonDocument doc(512);
  JsonArray readings = doc.createNestedArray("readings");

  JsonObject reading1 = readings.createNestedObject();
  reading1["device_id"] = sharedLdrDeviceId;
  reading1["sensor_type"] = "light";
  reading1["value"] = ldrValue;
  reading1["unit"] = "lux";

  JsonObject reading2 = readings.createNestedObject();
  reading2["device_id"] = garageLdrDeviceId;
  reading2["sensor_type"] = "light";
  reading2["value"] = garageLdrValue;
  reading2["unit"] = "lux";

  String jsonString;
  serializeJson(doc, jsonString);

  int httpResponseCode = http.POST(jsonString);

  if (httpResponseCode == 201)
  {
    Serial.printf("Batch sensor data sent: LDR=%d, Garage=%d\n", ldrValue, garageLdrValue);
  }
  else
  {
    // Fallback to individual calls if batch fails
    sendSensorReading(sharedLdrDeviceId, "light", ldrValue, "lux");
    sendSensorReading(garageLdrDeviceId, "light", garageLdrValue, "lux");
  }

  http.end();
}

void sendSensorReading(const char *deviceId, const char *sensorType, int value, const char *unit)
{
  HTTPClient http;
  String url = String(apiBaseUrl) + "/sensors/latest";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  DynamicJsonDocument doc(512);
  doc["device_id"] = deviceId;
  doc["sensor_type"] = sensorType;
  doc["value"] = value;
  doc["unit"] = unit;

  String jsonString;
  serializeJson(doc, jsonString);

  int httpResponseCode = http.POST(jsonString);

  if (httpResponseCode == 201)
  {
    Serial.printf("Sensor data sent for device %s: %d %s\n", deviceId, value, unit);
  }

  http.end();
}

void handleSerial()
{
  if (!Serial.available())
    return;

  String input = Serial.readStringUntil('\n');
  input.trim();

  if (input.equalsIgnoreCase("off"))
  {
    currentMode = OFF;
    Serial.println("RGB LED turned OFF (auto darkness only).");
  }
  else if (input.equalsIgnoreCase("sunset"))
  {
    currentMode = FADE;
    setPalette(palettes[0]);
    Serial.println("Fade mode: Sunset");
  }
  else if (input.equalsIgnoreCase("forest"))
  {
    currentMode = FADE;
    setPalette(palettes[1]);
    Serial.println("Fade mode: Forest");
  }
  else if (input.equalsIgnoreCase("midnight"))
  {
    currentMode = FADE;
    setPalette(palettes[2]);
    Serial.println("Fade mode: Midnight");
  }
  else if (input.startsWith("#") && input.length() == 7)
  {
    solidR = strtol(input.substring(1, 3).c_str(), nullptr, 16);
    solidG = strtol(input.substring(3, 5).c_str(), nullptr, 16);
    solidB = strtol(input.substring(5, 7).c_str(), nullptr, 16);
    currentMode = SOLID;
    Serial.printf("Solid color set to #%02X%02X%02X\n", solidR, solidG, solidB);
  }
  else if (input.equalsIgnoreCase("kitchen on"))
  {
    kitchenManualOverride = true;
    kitchenLEDState = true;
    Serial.println("Kitchen LED manually turned ON.");
  }
  else if (input.equalsIgnoreCase("kitchen off"))
  {
    kitchenManualOverride = true;
    kitchenLEDState = false;
    Serial.println("Kitchen LED manually turned OFF.");
  }
  else if (input.equalsIgnoreCase("kitchen auto"))
  {
    kitchenManualOverride = false;
    Serial.println("Kitchen LED back to auto (LDR).");
  }
  else if (input.equalsIgnoreCase("garage on"))
  {
    garageManualOverride = true;
    garageLEDState = true;
    Serial.println("Garage LED manually turned ON.");
  }
  else if (input.equalsIgnoreCase("garage off"))
  {
    garageManualOverride = true;
    garageLEDState = false;
    Serial.println("Garage LED manually turned OFF.");
  }
  else if (input.equalsIgnoreCase("garage auto"))
  {
    garageManualOverride = false;
    Serial.println("Garage LED back to auto (LDR).");
  }
  else if (input.equalsIgnoreCase("wifi"))
  {
    Serial.printf("WiFi Status: %s\n", WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
    if (WiFi.status() == WL_CONNECTED)
    {
      Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
      Serial.printf("API Base URL: %s\n", apiBaseUrl);
    }
  }
  else if (input.equalsIgnoreCase("reconnect"))
  {
    Serial.println("Reconnecting to WiFi...");
    connectToWiFi();
  }
  else if (input == "0")
  {
    manualPWM = pwmOff;
    fanAutoControl = false;
    Serial.println("Manual mode: Fan OFF");
  }
  else if (input == "1")
  {
    manualPWM = pwmLow;
    fanAutoControl = false;
    Serial.println("Manual mode: Fan LOW");
  }
  else if (input == "2")
  {
    manualPWM = pwmMed;
    fanAutoControl = false;
    Serial.println("Manual mode: Fan MEDIUM");
  }
  else if (input == "3")
  {
    manualPWM = pwmHigh;
    fanAutoControl = false;
    Serial.println("Manual mode: Fan HIGH");
  }
  else if (input.equalsIgnoreCase("A"))
  {
    fanAutoControl = true;
    Serial.println("Switched to AUTO mode");
  }
  else if (input.equalsIgnoreCase("auto"))
  {
    currentRainMode = RAIN_AUTO;
    dryReadingCounter = 0;
    Serial.println("Rain detection: AUTO mode activated");
  }
  else if (input.equalsIgnoreCase("open"))
  {
    currentRainMode = RAIN_MANUAL;
    setWindowState(WINDOW_OPEN);
    Serial.println("Manual: Windows opened");
  }
  else if (input.equalsIgnoreCase("close"))
  {
    currentRainMode = RAIN_MANUAL;
    setWindowState(WINDOW_CLOSED);
    Serial.println("Manual: Windows closed");
  }
  else
  {
    int c1 = input.indexOf(',');
    int c2 = input.indexOf(',', c1 + 1);
    if (c1 > 0 && c2 > c1)
    {
      int r = input.substring(0, c1).toInt();
      int g = input.substring(c1 + 1, c2).toInt();
      int b = input.substring(c2 + 1).toInt();
      if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255)
      {
        solidR = r;
        solidG = g;
        solidB = b;
        currentMode = SOLID;
        Serial.printf("Solid color set to RGB(%d,%d,%d)\n", r, g, b);
      }
      else
      {
        Serial.println("RGB values must be 0–255");
      }
    }
    else
    {
      Serial.println("Invalid input. Try: 255,150,0 or #FF9900 or 'sunset'");
      Serial.println("New commands: 'wifi' (status), 'reconnect' (WiFi)");
      Serial.println("Fan commands: 0-3 (speed), A (auto mode)");
      Serial.println("Rain commands: 'auto', 'open', 'close'");
    }
  }
}

void setLED(int r, int g, int b)
{
  ledcWrite(redPin, r);
  ledcWrite(greenPin, g);
  ledcWrite(bluePin, b);
}

void setPalette(Color p[3])
{
  for (int i = 0; i < 3; i++)
  {
    currentFade[i] = p[i];
  }
  fadeIndex = 0;
}

void fadePalette()
{
  static float r = currentFade[0].r;
  static float g = currentFade[0].g;
  static float b = currentFade[0].b;

  Color start = currentFade[fadeIndex % numFadeColors];
  Color end = currentFade[(fadeIndex + 1) % numFadeColors];

  static int step = 0;
  const int totalSteps = 100;

  if (millis() - lastFadeTime >= fadeDelay)
  {
    r = start.r + (end.r - start.r) * (step / (float)totalSteps);
    g = start.g + (end.g - start.g) * (step / (float)totalSteps);
    b = start.b + (end.b - start.b) * (step / (float)totalSteps);
    setLED(r, g, b);

    step++;
    if (step >= totalSteps)
    {
      step = 0;
      fadeIndex = (fadeIndex + 1) % numFadeColors;
    }
    lastFadeTime = millis();
  }
}

// Fan control command execution
bool executeFanCommand(String commandType, JsonObject commandData)
{
  if (commandType == "fan_control")
  {
    String action = commandData["action"];

    if (action == "set_speed")
    {
      int speed = commandData["speed"];
      fanAutoControl = false;

      switch (speed)
      {
      case 0:
        manualPWM = pwmOff;
        Serial.println("Fan set to OFF via API");
        break;
      case 1:
        manualPWM = pwmLow;
        Serial.println("Fan set to LOW via API");
        break;
      case 2:
        manualPWM = pwmMed;
        Serial.println("Fan set to MEDIUM via API");
        break;
      case 3:
        manualPWM = pwmHigh;
        Serial.println("Fan set to HIGH via API");
        break;
      default:
        return false;
      }
      return true;
    }
    else if (action == "set_auto")
    {
      fanAutoControl = true;
      Serial.println("Fan set to AUTO mode via API");
      return true;
    }
    else if (action == "set_manual")
    {
      fanAutoControl = false;
      int speed = commandData["speed"];
      switch (speed)
      {
      case 0:
        manualPWM = pwmOff;
        break;
      case 1:
        manualPWM = pwmLow;
        break;
      case 2:
        manualPWM = pwmMed;
        break;
      case 3:
        manualPWM = pwmHigh;
        break;
      default:
        return false;
      }
      Serial.printf("Fan set to manual mode, speed %d via API\n", speed);
      return true;
    }
  }
  return false;
}

// Send temperature data to API
void sendTemperatureData(float temperature)
{
  if (WiFi.status() != WL_CONNECTED)
    return;

  sendSensorReading(temperatureSensorDeviceId, "temperature", (int)(temperature * 100), "celsius_x100");

  // Also send fan status
  sendFanStatus();
}

// Send fan status to API
void sendFanStatus()
{
  if (WiFi.status() != WL_CONNECTED)
    return;

  HTTPClient http;
  String url = String(apiBaseUrl) + "/fan-control";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(1000);

  DynamicJsonDocument doc(256);
  doc["device_id"] = fanMotorDeviceId;
  doc["current_speed"] = manualPWM;
  doc["current_temperature"] = lastTemperature;
  doc["auto_mode"] = fanAutoControl;

  String jsonString;
  serializeJson(doc, jsonString);

  int httpResponseCode = http.PATCH(jsonString);

  if (httpResponseCode == 200)
  {
    Serial.printf("Fan status sent: Speed=%d, Temp=%.1f°C, Auto=%s\n",
                  manualPWM, lastTemperature, fanAutoControl ? "true" : "false");
  }

  http.end();
}

// Rain detection command execution
bool executeRainCommand(String commandType, JsonObject commandData)
{
  if (commandType == "rain_control")
  {
    String action = commandData["action"];

    if (action == "set_mode")
    {
      String mode = commandData["mode"];
      if (mode == "AUTO")
      {
        currentRainMode = RAIN_AUTO;
        dryReadingCounter = 0;
        Serial.println("Rain detection set to AUTO mode via API");
      }
      else if (mode == "MANUAL")
      {
        currentRainMode = RAIN_MANUAL;
        Serial.println("Rain detection set to MANUAL mode via API");
      }
      return true;
    }
    else if (action == "set_window_state")
    {
      String windowState = commandData["window_state"];
      currentRainMode = RAIN_MANUAL;
      if (windowState == "OPEN")
      {
        setWindowState(WINDOW_OPEN);
        Serial.println("Windows opened via API");
      }
      else if (windowState == "CLOSED")
      {
        setWindowState(WINDOW_CLOSED);
        Serial.println("Windows closed via API");
      }
      return true;
    }
    else if (action == "emergency_close")
    {
      setWindowState(WINDOW_CLOSED);
      Serial.println("EMERGENCY: Windows closed via API");
      return true;
    }
    else if (action == "emergency_open")
    {
      setWindowState(WINDOW_OPEN);
      Serial.println("EMERGENCY: Windows opened via API");
      return true;
    }
  }
  return false;
}

// Process rain detection
void processRainDetection()
{
  int totalReading = 0;
  for (int i = 0; i < RAIN_SAMPLES; i++)
  {
    totalReading += analogRead(rainSensorPin);
    delayMicroseconds(100);
  }
  int avgReading = totalReading / RAIN_SAMPLES;

  RainLevel detectedLevel = classifyRainLevel(avgReading);

  if (detectedLevel != currentRainLevel)
  {
    currentRainLevel = detectedLevel;
    displayRainStatus(avgReading);
  }

  // Window control logic
  if (currentRainLevel > NO_RAIN)
  {
    if (currentWindowState == WINDOW_OPEN)
    {
      setWindowState(WINDOW_CLOSED);
      Serial.println("CAUTION: Windows closed due to rain detection");
    }
    dryReadingCounter = 0;
  }
  else
  {
    dryReadingCounter++;
    if (currentWindowState == WINDOW_CLOSED)
    {
      int remainingTime = DRY_CONFIRMATION_COUNT - dryReadingCounter;
      if (remainingTime > 0)
      {
        Serial.print("Dry conditions detected - Opening in ");
        Serial.print(remainingTime * RAIN_SAMPLE_INTERVAL / 1000.0, 1);
        Serial.println("s");
      }
      else
      {
        setWindowState(WINDOW_OPEN);
        Serial.println("Consistent dry conditions confirmed - Windows opened");
        dryReadingCounter = 0;
      }
    }
  }
}

// Classify rain level
RainLevel classifyRainLevel(int reading)
{
  if (reading < NO_RAIN_THRESHOLD)
    return NO_RAIN;
  if (reading < LIGHT_RAIN_THRESHOLD)
    return LIGHT_RAIN;
  if (reading < MODERATE_RAIN_THRESHOLD)
    return MODERATE_RAIN;
  return HEAVY_RAIN;
}

// Display rain status
void displayRainStatus(int reading)
{
  Serial.print("Rain Level: ");
  Serial.print(reading);
  Serial.print(" | ");

  switch (currentRainLevel)
  {
  case NO_RAIN:
    Serial.println("No rain detected");
    break;
  case LIGHT_RAIN:
    Serial.println("Light rain detected - CAUTION advised");
    break;
  case MODERATE_RAIN:
    Serial.println("Moderate rain detected - CAUTION: Secure windows");
    break;
  case HEAVY_RAIN:
    Serial.println("Heavy rain detected - CAUTION: Keep windows sealed");
    break;
  }
}

// Set window state
void setWindowState(WindowState state)
{
  if (state != currentWindowState)
  {
    windowServo1.write(state);
    windowServo2.write(state);
    currentWindowState = state;
    delay(1000);
  }
}

// Get rain level as string
const char *getRainLevelString(RainLevel level)
{
  switch (level)
  {
  case NO_RAIN:
    return "DRY";
  case LIGHT_RAIN:
    return "LIGHT";
  case MODERATE_RAIN:
    return "MODERATE";
  case HEAVY_RAIN:
    return "HEAVY";
  default:
    return "UNKNOWN";
  }
}

// Send rain data to API
void sendRainData()
{
  if (WiFi.status() != WL_CONNECTED)
    return;

  // Read current rain sensor value
  int totalReading = 0;
  for (int i = 0; i < RAIN_SAMPLES; i++)
  {
    totalReading += analogRead(rainSensorPin);
    delayMicroseconds(100);
  }
  int avgReading = totalReading / RAIN_SAMPLES;

  // Send rain sensor reading
  sendSensorReading(rainSensorDeviceId, "rain", avgReading, "analog_value");

  // Send rain status update
  sendRainStatus(avgReading);
}

// Send rain status to API
void sendRainStatus(int rainReading)
{
  if (WiFi.status() != WL_CONNECTED)
    return;

  HTTPClient http;
  String url = String(apiBaseUrl) + "/rain-control";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(1000);

  DynamicJsonDocument doc(256);
  doc["device_id"] = rainSensorDeviceId;
  doc["rain_level"] = getRainLevelString(currentRainLevel);
  doc["rain_reading"] = rainReading;
  doc["window_state"] = currentWindowState == WINDOW_OPEN ? "OPEN" : "CLOSED";
  doc["mode"] = currentRainMode == RAIN_AUTO ? "AUTO" : "MANUAL";
  doc["dry_count"] = dryReadingCounter;

  String jsonString;
  serializeJson(doc, jsonString);

  int httpResponseCode = http.PATCH(jsonString);

  if (httpResponseCode == 200)
  {
    Serial.printf("Rain status sent: %s | Windows: %s | Mode: %s\n",
                  getRainLevelString(currentRainLevel),
                  currentWindowState == WINDOW_OPEN ? "OPEN" : "CLOSED",
                  currentRainMode == RAIN_AUTO ? "AUTO" : "MANUAL");
  }

  http.end();
}
