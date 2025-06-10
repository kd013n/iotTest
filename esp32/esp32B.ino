#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <Keypad.h>
#include <Wire.h>
#include <hd44780.h>
#include <hd44780ioClass/hd44780_I2Cexp.h>

// === WiFi Configuration ===
const char *ssid = "ZTE_2.4G_J3Snvh";
const char *password = "h5WrbQq7";

// === API Configuration ===
const char *apiBaseUrl = "http://192.168.1.13:3000/api"; // Replace with your computer's IP
const unsigned long apiCheckInterval = 500;              // Check for commands every 500ms
const unsigned long sensorSendInterval = 2000;           // Send sensor data every 2 seconds

// === ESP32-B Device IDs (from Supabase database) ===
// DOOR_ACCESS SYSTEM
const char *maindoorservoDeviceId = "fbaa3508-0f83-4267-a8f3-b070ff9d92d7";
const char *systemlcddisplayDeviceId = "9b1ea9a4-45e2-47b0-81a1-336c1dd85b5b";

// GARAGE_CONTROL SYSTEM
const char *garagedoorservoDeviceId = "65637731-f1f3-4eca-b2d5-f45c6a510d63";
const char *outsideirsensorDeviceId = "3b9c4f6a-e4f0-49b1-9821-259b401ff234";
const char *insideirsensorDeviceId = "fd7797fe-79c3-41ad-b3c7-3ea4a17dfa1d";

// SMOKE_ALARM SYSTEM
const char *mq2gassensorDeviceId = "191d446f-4aad-44ae-8854-68e579296a78";
const char *securitybuzzerDeviceId = "beb3492a-b666-49fb-9efc-333477aa0e38";

// === Timing Variables ===
unsigned long lastApiCheck = 0;
unsigned long lastSensorSend = 0;

// LCD setup
hd44780_I2Cexp lcd; // Auto detects I2C address

// Pin definitions - optimized for ESP32 WROOM-32 30-pin
const int outsideIrSensorPin = 32; // Outside IR sensor (input only pin)
const int insideIrSensorPin = 35;  // Inside IR sensor (input only pin)
const int mainDoorServoPin = 18;   // Main door servo pin (180° servo, PWM capable)
const int garageDoorServoPin = 19; // Garage door servo pin (360° servo, PWM capable)
const int buzzerPin = 5;           // Buzzer pin (output)
const int mq2Pin = 34;             // MQ2 gas sensor (ADC1, input only)

// I2C pins for LCD (default ESP32 pins)
// SDA = GPIO 21, SCL = GPIO 22

// Keypad pins
const byte ROWS = 4;
const byte COLS = 3;
char keys[ROWS][COLS] = {
    {'1', '2', '3'},
    {'4', '5', '6'},
    {'7', '8', '9'},
    {'*', '0', '#'}};
byte rowPins[ROWS] = {13, 12, 14, 27}; // Row pins
byte colPins[COLS] = {26, 25, 33};     // Column pins

Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);
Servo mainDoorServo;   // 180° servo for main door
Servo garageDoorServo; // 360° servo for garage door

// System state variables
bool mainDoorIsOpen = false;
bool garageDoorIsOpen = false;
bool systemLocked = true;
bool smokeAlarmActive = false;
unsigned long lastDisplayUpdate = 0;
unsigned long statusMessageTime = 0;
String statusMessage = "";
bool showingStatus = false;

// Security system variables
const String correctPassword = "2309";
String inputPassword = "";
int attemptCount = 0;
const int maxAttempts = 3;

// IR sensor variables
int outsideSensorValue = 0;
int insideSensorValue = 0;
bool outsideObjectDetected = false;
bool insideObjectDetected = false;

// Smoke sensor variables
const int smokeThreshold = 500;
const int buzzDuration = 10000; // 10 seconds in milliseconds
int mq2Value = 0;
unsigned long buzzerStartTime = 0;
bool buzzerActive = false;

void setup()
{
    Serial.begin(115200);

    // Initialize pins
    pinMode(outsideIrSensorPin, INPUT);
    pinMode(insideIrSensorPin, INPUT);
    pinMode(buzzerPin, OUTPUT);
    digitalWrite(buzzerPin, LOW);

    // Initialize servos
    mainDoorServo.attach(mainDoorServoPin);
    mainDoorServo.write(0); // Main door closed/locked (180° servo)
    mainDoorIsOpen = false;

    garageDoorServo.attach(garageDoorServoPin);
    garageDoorServo.write(90); // Garage door stopped (360° servo)
    garageDoorIsOpen = false;

    // Initialize LCD
    int status = lcd.begin(16, 2);
    if (status)
    {
        Serial.print("LCD init failed: ");
        Serial.println(status);
    }
    else
    {
        lcd.clear();
        lcd.print("System Starting");
        delay(2000);
        updateDisplay();
    }

    Serial.println("🔐 ESP32-B Security System with API Integration");

    // Connect to WiFi
    connectToWiFi();

    Serial.println("Commands:");
    Serial.println("  mo=main open, mc=main close");
    Serial.println("  go=garage open, gc=garage close");
    Serial.println("  l=lock, u=unlock");
    Serial.println("  API commands will also be processed automatically");
}

void loop()
{
    // Keep WiFi connected
    if (WiFi.status() != WL_CONNECTED)
    {
        connectToWiFi();
    }

    // Check for serial commands
    handleSerialCommands();

    // Handle keypad input
    handleKeypadInput();

    // Monitor gas levels
    checkGasLevels();

    // Handle IR sensors (only if system is unlocked and no smoke alarm)
    if (!systemLocked && !smokeAlarmActive)
    {
        handleIRSensors();
    }

    // === API Communication ===
    unsigned long currentTime = millis();

    // Check for new commands from API
    if (currentTime - lastApiCheck >= apiCheckInterval)
    {
        checkForCommands();
        lastApiCheck = currentTime;
    }

    // Send sensor data
    if (currentTime - lastSensorSend >= sensorSendInterval)
    {
        sendSensorData();
        lastSensorSend = currentTime;
    }

    // Update display every second
    if (currentTime - lastDisplayUpdate > 1000)
    {
        updateDisplay();
        lastDisplayUpdate = currentTime;
    }

    delay(500); // Faster loop for better gas sensor responsiveness
}

void handleSerialCommands()
{
    if (Serial.available() > 0)
    {
        String command = Serial.readString();
        command.trim();

        if (command == "mo")
        {
            if (!mainDoorIsOpen)
            {
                Serial.println("Manual main door open");
                manualOpenMainDoor();
                showStatusMessage("Main Door Open");
            }
        }
        else if (command == "mc")
        {
            if (mainDoorIsOpen)
            {
                Serial.println("Manual main door close");
                closeMainDoor();
                showStatusMessage("Main Door Close");
            }
        }
        else if (command == "go")
        {
            if (!garageDoorIsOpen)
            {
                Serial.println("Manual garage door open");
                manualOpenGarageDoor();
                showStatusMessage("Garage Door Open");
            }
        }
        else if (command == "gc")
        {
            if (garageDoorIsOpen)
            {
                Serial.println("Manual garage door close");
                closeGarageDoor();
                showStatusMessage("Garage Door Close");
            }
        }
        else if (command == "l")
        {
            systemLocked = true;
            Serial.println("System locked");
            showStatusMessage("System Locked");
        }
        else if (command == "u")
        {
            systemLocked = false;
            Serial.println("System unlocked");
            showStatusMessage("System Unlocked");
        }
    }
}

void handleKeypadInput()
{
    char key = keypad.getKey();
    if (key)
    {
        Serial.print("Key: ");
        Serial.println(key);

        if (key == '#')
        {
            if (inputPassword == correctPassword)
            {
                showStatusMessage("Access Granted");
                Serial.println("Access granted");
                openMainDoor();
                inputPassword = "";
                attemptCount = 0;
            }
            else
            {
                attemptCount++;
                showStatusMessage("Wrong Password");
                Serial.println("Wrong password");
                inputPassword = "";
                if (attemptCount >= maxAttempts)
                {
                    triggerSecurityAlarm();
                }
            }
        }
        else if (key == '*')
        {
            inputPassword = "";
            showStatusMessage("Password Reset");
            Serial.println("Password cleared");
        }
        else if (inputPassword.length() < 4 && isDigit(key))
        {
            inputPassword += key;
        }
    }
}

void checkGasLevels()
{
    mq2Value = analogRead(mq2Pin);
    Serial.print("MQ2 Value: ");
    Serial.println(mq2Value);

    if (mq2Value > gasThreshold)
    {
        if (!gasAlarmActive)
        {
            gasAlarmActive = true;
            Serial.println("GAS LEAK DETECTED!");
            showStatusMessage("High Gas Level");
        }

        // Start or maintain buzzer
        if (!buzzerActive)
        {
            digitalWrite(buzzerPin, HIGH);
            buzzerStartTime = millis();
            buzzerActive = true;
        }

        // Check if 10 seconds have passed for buzzer auto-stop
        if (buzzerActive && (millis() - buzzerStartTime >= buzzDuration))
        {
            digitalWrite(buzzerPin, LOW);
            buzzerActive = false;
        }
    }
    else
    {
        // Gas levels back to normal
        if (gasAlarmActive)
        {
            gasAlarmActive = false;
            showStatusMessage("Air Status Good");
            Serial.println("Gas levels normal");
        }

        // Reset buzzer if condition goes back to normal
        if (buzzerActive)
        {
            digitalWrite(buzzerPin, LOW);
            buzzerActive = false;
        }
    }
}

void handleIRSensors()
{
    outsideSensorValue = digitalRead(outsideIrSensorPin);
    insideSensorValue = digitalRead(insideIrSensorPin);

    // Handle outside sensor
    if (outsideSensorValue == LOW && !outsideObjectDetected && !garageDoorIsOpen)
    {
        Serial.println("Outside sensor triggered");
        outsideObjectDetected = true;
        showStatusMessage("Garage Door Open");
        autoOpenGarageDoor();
    }

    // Handle inside sensor
    if (insideSensorValue == LOW && !insideObjectDetected && !garageDoorIsOpen)
    {
        Serial.println("Inside sensor triggered");
        insideObjectDetected = true;
        showStatusMessage("Garage Door Open");
        autoOpenGarageDoor();
    }

    // Reset sensor states
    if (outsideSensorValue == HIGH)
    {
        outsideObjectDetected = false;
    }
    if (insideSensorValue == HIGH)
    {
        insideObjectDetected = false;
    }
}

void updateDisplay()
{
    // Check if status message timeout has passed
    if (showingStatus && (millis() - statusMessageTime > 3000))
    {
        showingStatus = false;
    }

    lcd.clear();

    if (gasAlarmActive)
    {
        lcd.print("!!! GAS ALERT !!!");
        lcd.setCursor(0, 1);
        lcd.print("Level: ");
        lcd.print(mq2Value);
        lcd.print("  ");
    }
    else if (showingStatus)
    {
        // Show status message centered on first line
        int padding = (16 - statusMessage.length()) / 2;
        for (int i = 0; i < padding; i++)
            lcd.print(" ");
        lcd.print(statusMessage);
        lcd.setCursor(0, 1);
        if (inputPassword.length() > 0)
        {
            lcd.print("Pass: ");
            for (int i = 0; i < inputPassword.length(); i++)
            {
                lcd.print("*");
            }
        }
        else
        {
            lcd.print("                "); // Clear second line
        }
    }
    else if (inputPassword.length() > 0)
    {
        lcd.print("Enter Password:");
        lcd.setCursor(0, 1);
        for (int i = 0; i < inputPassword.length(); i++)
        {
            lcd.print("*");
        }
    }
    else
    {
        // Normal status display
        lcd.print("M:");
        lcd.print(mainDoorIsOpen ? "O" : "C");
        lcd.print(" G:");
        lcd.print(garageDoorIsOpen ? "O" : "C");
        lcd.print(" ");
        lcd.print(systemLocked ? "L" : "U");
        lcd.setCursor(0, 1);
        lcd.print("Gas: ");
        lcd.print(mq2Value);
        lcd.print(" ");
        if (mq2Value > gasThreshold)
        {
            lcd.print("HIGH");
        }
        else
        {
            lcd.print("OK  ");
        }
    }
}

void showStatusMessage(String message)
{
    statusMessage = message;
    showingStatus = true;
    statusMessageTime = millis();
}

// Main Door Functions (180° servo)
void autoOpenMainDoor()
{
    mainDoorServo.write(90); // Open main door
    mainDoorIsOpen = true;
    delay(3000); // Keep open for 3 seconds
    showStatusMessage("Main Door Closed");
    closeMainDoor();
}

void manualOpenMainDoor()
{
    mainDoorServo.write(90); // Open main door
    mainDoorIsOpen = true;
}

void openMainDoor()
{
    mainDoorServo.write(90); // Unlock/open main door
    mainDoorIsOpen = true;
    showStatusMessage("Main Door Open");
    delay(3000); // Keep open for 3 seconds
    showStatusMessage("Main Door Closed");
    closeMainDoor();
}

void closeMainDoor()
{
    mainDoorServo.write(0); // Close/lock main door
    mainDoorIsOpen = false;
    delay(1000);
}

// Garage Door Functions (360° servo)
void autoOpenGarageDoor()
{
    // Open garage door (360° servo - forward rotation)
    garageDoorServo.write(180); // Full speed forward
    delay(3000);                // Run for 3 seconds to open
    garageDoorServo.write(90);  // Stop
    garageDoorIsOpen = true;

    delay(5000); // Keep open for 5 seconds

    showStatusMessage("Garage Door Closed");
    closeGarageDoor();
}

void manualOpenGarageDoor()
{
    // Open garage door manually
    garageDoorServo.write(180); // Full speed forward
    delay(3000);                // Run for 3 seconds to open
    garageDoorServo.write(90);  // Stop
    garageDoorIsOpen = true;
}

void closeGarageDoor()
{
    // Close garage door (360° servo - reverse rotation)
    garageDoorServo.write(0);  // Full speed reverse
    delay(3000);               // Run for 3 seconds to close
    garageDoorServo.write(90); // Stop
    garageDoorIsOpen = false;
    delay(1000);
}

void triggerSecurityAlarm()
{
    showStatusMessage("INTRUDER ALERT!");
    Serial.println("INTRUDER ALERT!");

    // Sound security alarm (different pattern from gas alarm)
    for (int i = 0; i < 10; i++)
    {
        digitalWrite(buzzerPin, HIGH);
        delay(300);
        digitalWrite(buzzerPin, LOW);
        delay(300);
    }

    // Lockout period
    showStatusMessage("Locked 10 sec");
    delay(10000);

    // Reset
    inputPassword = "";
    attemptCount = 0;
    showStatusMessage("System Ready");
}

void triggerGasAlarm()
{
    // This function is now handled by checkGasLevels()
    // Keeping for compatibility but functionality moved to checkGasLevels()
}

// === WiFi and API Functions ===

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
        showStatusMessage("WiFi Connected");
    }
    else
    {
        Serial.println();
        Serial.println("WiFi connection failed. Operating in offline mode.");
        showStatusMessage("WiFi Failed");
    }
}

void checkForCommands()
{
    if (WiFi.status() != WL_CONNECTED)
        return;

    HTTPClient http;

    // Get ALL pending commands in one API call
    String url = String(apiBaseUrl) + "/commands?status=pending&limit=10";

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(2000); // 2 second timeout

    int httpResponseCode = http.GET();

    if (httpResponseCode == 200)
    {
        String response = http.getString();

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

                    // Update command status
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
    if (strcmp(deviceId, maindoorservoDeviceId) == 0)
        return "main_door_servo";
    if (strcmp(deviceId, garagedoorservoDeviceId) == 0)
        return "garage_door_servo";
    if (strcmp(deviceId, outsideirsensorDeviceId) == 0)
        return "outside_ir_sensor";
    if (strcmp(deviceId, insideirsensorDeviceId) == 0)
        return "inside_ir_sensor";
    if (strcmp(deviceId, mq2gassensorDeviceId) == 0)
        return "gas_sensor";
    if (strcmp(deviceId, securitybuzzerDeviceId) == 0)
        return "security_buzzer";
    if (strcmp(deviceId, systemlcddisplayDeviceId) == 0)
        return "lcd_display";
    return nullptr;
}

// Unified command execution function
bool executeCommand(const char *deviceType, String commandType, JsonObject commandData)
{
    if (strcmp(deviceType, "main_door_servo") == 0)
    {
        return executeDoorCommand(commandType, commandData);
    }
    else if (strcmp(deviceType, "garage_door_servo") == 0)
    {
        return executeGarageCommand(commandType, commandData);
    }
    else if (strcmp(deviceType, "gas_sensor") == 0 || strcmp(deviceType, "security_buzzer") == 0)
    {
        return executeGasAlarmCommand(commandType, commandData);
    }
    else if (strcmp(deviceType, "lcd_display") == 0)
    {
        return executeLCDCommand(commandType, commandData);
    }
    return false;
}

bool executeDoorCommand(String commandType, JsonObject commandData)
{
    if (commandType == "door_control")
    {
        String action = commandData["action"];
        String accessCode = commandData["access_code"];

        if (action == "unlock")
        {
            if (accessCode == correctPassword)
            {
                Serial.println("API: Access granted - opening main door");
                openMainDoor();
                return true;
            }
            else
            {
                Serial.println("API: Invalid access code");
                return false;
            }
        }
        else if (action == "lock")
        {
            systemLocked = true;
            showStatusMessage("System Locked");
            Serial.println("API: System locked");
            return true;
        }
        else if (action == "manual_open")
        {
            if (!mainDoorIsOpen)
            {
                manualOpenMainDoor();
                showStatusMessage("Door Opened");
                Serial.println("API: Main door manually opened");
                return true;
            }
        }
        else if (action == "manual_close")
        {
            if (mainDoorIsOpen)
            {
                closeMainDoor();
                showStatusMessage("Door Closed");
                Serial.println("API: Main door manually closed");
                return true;
            }
        }
    }
    return false;
}

bool executeGarageCommand(String commandType, JsonObject commandData)
{
    if (commandType == "garage_control")
    {
        String action = commandData["action"];
        bool autoMode = commandData["auto_mode"];

        if (action == "open")
        {
            if (!garageDoorIsOpen)
            {
                manualOpenGarageDoor();
                showStatusMessage("Garage Opened");
                Serial.println("API: Garage door opened");
                return true;
            }
        }
        else if (action == "close")
        {
            if (garageDoorIsOpen)
            {
                closeGarageDoor();
                showStatusMessage("Garage Closed");
                Serial.println("API: Garage door closed");
                return true;
            }
        }
        else if (action == "set_auto_mode")
        {
            // Auto mode is always enabled for IR sensors in this system
            Serial.println("API: Garage auto mode confirmed");
            return true;
        }
    }
    return false;
}

bool executeGasAlarmCommand(String commandType, JsonObject commandData)
{
    if (commandType == "gas_alarm_control")
    {
        String action = commandData["action"];
        int threshold = commandData["gas_threshold"];
        int duration = commandData["alarm_duration"];

        if (action == "set_threshold" && threshold > 0)
        {
            gasThreshold = threshold;
            Serial.printf("API: Gas threshold set to %d\n", threshold);
            showStatusMessage("Threshold Set");
            return true;
        }
        else if (action == "test_alarm")
        {
            // Test the buzzer
            digitalWrite(buzzerPin, HIGH);
            delay(1000);
            digitalWrite(buzzerPin, LOW);
            Serial.println("API: Alarm test completed");
            showStatusMessage("Alarm Tested");
            return true;
        }
        else if (action == "silence_alarm")
        {
            if (buzzerActive)
            {
                digitalWrite(buzzerPin, LOW);
                buzzerActive = false;
                Serial.println("API: Alarm silenced");
                showStatusMessage("Alarm Silenced");
                return true;
            }
        }
    }
    return false;
}

bool executeLCDCommand(String commandType, JsonObject commandData)
{
    if (commandType == "lcd_control")
    {
        String action = commandData["action"];
        String message = commandData["message"];

        if (action == "display_message" && message.length() > 0)
        {
            showStatusMessage(message);
            Serial.printf("API: LCD message set to: %s\n", message.c_str());
            return true;
        }
        else if (action == "clear")
        {
            showingStatus = false;
            updateDisplay();
            Serial.println("API: LCD cleared");
            return true;
        }
    }
    return false;
}

// Async command status update
void updateCommandStatusAsync(String commandId, String status)
{
    HTTPClient http;
    String url = String(apiBaseUrl) + "/commands";

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(1000); // Short timeout for status updates

    DynamicJsonDocument doc(256);
    doc["id"] = commandId;
    doc["status"] = status;
    doc["response_data"]["timestamp"] = millis();

    String jsonString;
    serializeJson(doc, jsonString);

    http.PATCH(jsonString);
    http.end(); // Don't wait for response
}

void sendSensorData()
{
    if (WiFi.status() != WL_CONNECTED)
        return;

    // Send smoke sensor reading
    sendSensorReading(mq2gassensorDeviceId, "smoke", mq2Value, "ppm");

    // Send IR sensor readings
    sendSensorReading(outsideirsensorDeviceId, "motion", outsideSensorValue == LOW ? 1 : 0, "detected");
    sendSensorReading(insideirsensorDeviceId, "motion", insideSensorValue == LOW ? 1 : 0, "detected");
}

void sendSensorReading(const char *deviceId, const char *sensorType, int value, const char *unit)
{
    HTTPClient http;
    String url = String(apiBaseUrl) + "/sensors/latest";

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(1500); // Short timeout

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
        Serial.printf("Sensor data sent for %s: %d %s\n", sensorType, value, unit);
    }

    http.end();
}

// Async command status update
void updateCommandStatusAsync(String commandId, String status)
{
    HTTPClient http;
    String url = String(apiBaseUrl) + "/commands";

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(1000); // Short timeout for status updates

    DynamicJsonDocument doc(256);
    doc["id"] = commandId;
    doc["status"] = status;
    doc["response_data"]["timestamp"] = millis();

    String jsonString;
    serializeJson(doc, jsonString);

    http.PATCH(jsonString);
    http.end(); // Don't wait for response
}

void sendSensorData()
{
    if (WiFi.status() != WL_CONNECTED)
        return;

    // Send gas sensor reading
    sendSensorReading(mq2gassensorDeviceId, "gas", mq2Value, "ppm");

    // Send IR sensor readings
    sendSensorReading(outsideirsensorDeviceId, "motion", outsideSensorValue == LOW ? 1 : 0, "detected");
    sendSensorReading(insideirsensorDeviceId, "motion", insideSensorValue == LOW ? 1 : 0, "detected");
}

void sendSensorReading(const char *deviceId, const char *sensorType, int value, const char *unit)
{
    HTTPClient http;
    String url = String(apiBaseUrl) + "/sensors/latest";

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(1500); // Short timeout

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
        Serial.printf("Sensor data sent for %s: %d %s\n", sensorType, value, unit);
    }

    http.end();
}