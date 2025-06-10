-- ESP32-B Initialization Script
-- This script initializes a new ESP32 board with door access, garage control, and smoke alarm systems

-- 0. Create missing system tables (following existing structure pattern)

-- Door Access Control Table
CREATE TABLE IF NOT EXISTS door_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    access_code VARCHAR(10) NOT NULL DEFAULT '2309',
    max_attempts INTEGER NOT NULL DEFAULT 3,
    lockout_duration INTEGER NOT NULL DEFAULT 10000, -- milliseconds
    current_attempts INTEGER NOT NULL DEFAULT 0,
    is_locked BOOLEAN NOT NULL DEFAULT true,
    last_access_attempt TIMESTAMP WITH TIME ZONE,
    last_successful_access TIMESTAMP WITH TIME ZONE,
    auto_lock_delay INTEGER NOT NULL DEFAULT 3000, -- milliseconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garage Control Table
CREATE TABLE IF NOT EXISTS garage_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    auto_mode BOOLEAN NOT NULL DEFAULT true,
    door_open_duration INTEGER NOT NULL DEFAULT 5000, -- milliseconds
    motion_sensitivity INTEGER NOT NULL DEFAULT 1,
    is_door_open BOOLEAN NOT NULL DEFAULT false,
    last_motion_detected TIMESTAMP WITH TIME ZONE,
    operation_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Smoke/Gas Alarm Table
CREATE TABLE IF NOT EXISTS smoke_alarm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    gas_threshold INTEGER NOT NULL DEFAULT 500,
    alarm_duration INTEGER NOT NULL DEFAULT 10000, -- milliseconds
    current_gas_level INTEGER NOT NULL DEFAULT 0,
    alarm_active BOOLEAN NOT NULL DEFAULT false,
    last_alarm_triggered TIMESTAMP WITH TIME ZONE,
    alarm_count INTEGER NOT NULL DEFAULT 0,
    calibration_offset INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Create a new room for the security/garage area
INSERT INTO rooms (id, name, description) VALUES 
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Security Area', 'Main entrance and garage area with security systems');

-- 2. Create the new ESP32-B board
INSERT INTO boards (id, name, board_type, status, total_pins, available_pins) VALUES 
('b2c3d4e5-f6g7-8901-bcde-f23456789012', 'ESP32-B', 'ESP32-WROOM-30pin-B', 'offline', 30, 
'[2,4,5,12,13,14,15,16,17,18,19,21,22,23,25,26,27,32,33,34,35]'::jsonb);

-- 3. Create systems for the three main functionalities
INSERT INTO systems (id, name, type, description, board_id, room_id, is_active) VALUES 
('c3d4e5f6-g7h8-9012-cdef-345678901234', 'Door Access Control', 'door_access', 'Main door access control with keypad authentication', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', true),
('d4e5f6g7-h8i9-0123-defg-456789012345', 'Garage Door Control', 'garage_control', 'Automatic garage door with IR motion sensors', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', true),
('e5f6g7h8-i9j0-1234-efgh-567890123456', 'Gas Detection System', 'smoke_alarm', 'MQ2 gas sensor with buzzer alarm system', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', true);

-- 4. Create devices for Door Access Control System
INSERT INTO devices (id, name, type, system_id, board_id, room_id, pin_number, pin_type, properties, current_state, is_online) VALUES 
-- Main door servo
('f6g7h8i9-j0k1-2345-fghi-678901234567', 'Main Door Servo', 'servo_motor', 'c3d4e5f6-g7h8-9012-cdef-345678901234', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 18, 'pwm', '{"servo_type": "180_degree", "min_angle": 0, "max_angle": 90, "function": "door_lock"}', '{"position": 0, "is_open": false}', false),

-- Keypad (using row pins as primary, column pins in properties)
('g7h8i9j0-k1l2-3456-ghij-789012345678', 'Security Keypad Row 1', 'keypad_row', 'c3d4e5f6-g7h8-9012-cdef-345678901234', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 13, 'digital', '{"row_number": 1, "keys": ["1", "2", "3"], "col_pins": [26, 25, 33]}', '{}', false),
('h8i9j0k1-l2m3-4567-hijk-890123456789', 'Security Keypad Row 2', 'keypad_row', 'c3d4e5f6-g7h8-9012-cdef-345678901234', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 12, 'digital', '{"row_number": 2, "keys": ["4", "5", "6"], "col_pins": [26, 25, 33]}', '{}', false),
('i9j0k1l2-m3n4-5678-ijkl-901234567890', 'Security Keypad Row 3', 'keypad_row', 'c3d4e5f6-g7h8-9012-cdef-345678901234', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 14, 'digital', '{"row_number": 3, "keys": ["7", "8", "9"], "col_pins": [26, 25, 33]}', '{}', false),
('j0k1l2m3-n4o5-6789-jklm-012345678901', 'Security Keypad Row 4', 'keypad_row', 'c3d4e5f6-g7h8-9012-cdef-345678901234', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 27, 'digital', '{"row_number": 4, "keys": ["*", "0", "#"], "col_pins": [26, 25, 33]}', '{}', false);

-- 5. Create devices for Garage Control System
INSERT INTO devices (id, name, type, system_id, board_id, room_id, pin_number, pin_type, properties, current_state, is_online) VALUES 
-- Garage door servo
('k1l2m3n4-o5p6-7890-klmn-123456789012', 'Garage Door Servo', 'servo_motor', 'd4e5f6g7-h8i9-0123-defg-456789012345', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 19, 'pwm', '{"servo_type": "360_degree", "function": "garage_door", "open_speed": 180, "close_speed": 0, "stop_speed": 90}', '{"is_open": false, "current_speed": 90}', false),

-- IR sensors
('l2m3n4o5-p6q7-8901-lmno-234567890123', 'Outside IR Sensor', 'ir_sensor', 'd4e5f6g7-h8i9-0123-defg-456789012345', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 32, 'digital', '{"location": "outside", "trigger_type": "motion_detection", "active_low": true}', '{"detected": false}', false),
('m3n4o5p6-q7r8-9012-mnop-345678901234', 'Inside IR Sensor', 'ir_sensor', 'd4e5f6g7-h8i9-0123-defg-456789012345', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 35, 'digital', '{"location": "inside", "trigger_type": "motion_detection", "active_low": true}', '{"detected": false}', false);

-- 6. Create devices for Gas Detection System
INSERT INTO devices (id, name, type, system_id, board_id, room_id, pin_number, pin_type, properties, current_state, is_online) VALUES 
-- MQ2 gas sensor
('n4o5p6q7-r8s9-0123-nopq-456789012345', 'MQ2 Gas Sensor', 'gas_sensor', 'e5f6g7h8-i9j0-1234-efgh-567890123456', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 34, 'analog', '{"sensor_type": "MQ2", "gas_threshold": 500, "unit": "ppm", "calibration_factor": 1.0}', '{"gas_level": 0, "alarm_active": false}', false),

-- Buzzer
('o5p6q7r8-s9t0-1234-opqr-567890123456', 'Security Buzzer', 'buzzer', 'e5f6g7h8-i9j0-1234-efgh-567890123456', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 5, 'digital', '{"alarm_duration": 10000, "pattern": "continuous", "volume": "high"}', '{"active": false}', false);

-- 7. Create LCD display device (shared across systems)
INSERT INTO devices (id, name, type, system_id, board_id, room_id, pin_number, pin_type, properties, current_state, is_online) VALUES
('p6q7r8s9-t0u1-2345-pqrs-678901234567', 'System LCD Display', 'lcd_display', 'c3d4e5f6-g7h8-9012-cdef-345678901234', 'b2c3d4e5-f6g7-8901-bcde-f23456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 21, 'i2c', '{"display_type": "16x2", "i2c_address": "auto", "sda_pin": 21, "scl_pin": 22}', '{"line1": "", "line2": "", "backlight": true}', false);

-- 8. Create system-specific configuration records

-- Door Access Control configuration
INSERT INTO door_access (id, device_id, access_code, max_attempts, lockout_duration, is_locked) VALUES
('q7r8s9t0-u1v2-3456-qrst-789012345678', 'f6g7h8i9-j0k1-2345-fghi-678901234567', '2309', 3, 10000, true);

-- Garage Control configuration
INSERT INTO garage_control (id, device_id, auto_mode, door_open_duration, motion_sensitivity) VALUES
('r8s9t0u1-v2w3-4567-rstu-890123456789', 'k1l2m3n4-o5p6-7890-klmn-123456789012', true, 5000, 1);

-- Smoke/Gas Alarm configuration
INSERT INTO smoke_alarm (id, device_id, gas_threshold, alarm_duration, calibration_offset) VALUES
('s9t0u1v2-w3x4-5678-stuv-901234567890', 'n4o5p6q7-r8s9-0123-nopq-456789012345', 500, 10000, 0);
