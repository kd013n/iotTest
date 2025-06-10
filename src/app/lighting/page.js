'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LightingControl() {
  const [devices, setDevices] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);

  // RGB Control State
  const [rgbMode, setRgbMode] = useState('solid');
  const [solidColor, setSolidColor] = useState({ r: 255, g: 255, b: 255 });
  const [fadePreset, setFadePreset] = useState('sunset');

  // Manual Override States
  const [kitchenOverride, setKitchenOverride] = useState(false);
  const [kitchenState, setKitchenState] = useState(false);
  const [garageOverride, setGarageOverride] = useState(false);
  const [garageState, setGarageState] = useState(false);

  // Device IDs (will be populated from API)
  const [deviceIds, setDeviceIds] = useState({
    rgbLed: null,
    kitchenLed: null,
    garageLed: null,
    sharedLdr: null,
    garageLdr: null
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchSensorData, 2000); // Update sensors every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchDevices(),
        fetchSensorData(),
        fetchCommands()
      ]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices');
      const data = await response.json();
      setDevices(data);

      // Map device IDs based on your Arduino setup
      const ids = {};
      data.forEach(device => {
        if (device.type === 'rgb_led' && device.name.includes('Living Room')) {
          ids.rgbLed = device.id;
        } else if (device.type === 'led' && device.name.includes('Kitchen')) {
          ids.kitchenLed = device.id;
        } else if (device.type === 'led' && device.name.includes('Garage')) {
          ids.garageLed = device.id;
        } else if (device.type === 'ldr' && device.name.includes('Living Room + Kitchen')) {
          ids.sharedLdr = device.id;
        } else if (device.type === 'ldr' && device.name.includes('Garage')) {
          ids.garageLdr = device.id;
        }
      });
      setDeviceIds(ids);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const fetchSensorData = async () => {
    try {
      const response = await fetch('/api/sensors/latest');
      const data = await response.json();
      setSensors(data);
    } catch (error) {
      console.error('Error fetching sensors:', error);
    }
  };

  const fetchCommands = async () => {
    try {
      const response = await fetch('/api/commands?status=pending');
      const data = await response.json();
      setCommands(data);
    } catch (error) {
      console.error('Error fetching commands:', error);
    }
  };

  const sendCommand = async (deviceId, commandType, commandData) => {
    try {
      const response = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id: deviceId,
          command_type: commandType,
          command_data: commandData,
          priority: 1,
        }),
      });

      if (response.ok) {
        console.log('Command sent successfully');
        fetchCommands(); // Refresh commands list
      }
    } catch (error) {
      console.error('Error sending command:', error);
    }
  };

  // RGB LED Controls
  const setRGBSolidColor = () => {
    if (!deviceIds.rgbLed) return;
    sendCommand(deviceIds.rgbLed, 'rgb_control', {
      mode: 'solid',
      color: solidColor,
      timestamp: Date.now()
    });
  };

  const setRGBFadePreset = (preset) => {
    if (!deviceIds.rgbLed) return;
    sendCommand(deviceIds.rgbLed, 'rgb_control', {
      mode: 'fade',
      preset: preset,
      timestamp: Date.now()
    });
  };

  const turnOffRGB = () => {
    if (!deviceIds.rgbLed) return;
    sendCommand(deviceIds.rgbLed, 'rgb_control', {
      mode: 'off',
      timestamp: Date.now()
    });
  };

  // Kitchen LED Controls
  const controlKitchen = (action) => {
    if (!deviceIds.kitchenLed) return;
    sendCommand(deviceIds.kitchenLed, 'led_control', {
      action: action, // 'on', 'off', 'auto'
      manual_override: action !== 'auto',
      timestamp: Date.now()
    });
    
    if (action === 'auto') {
      setKitchenOverride(false);
    } else {
      setKitchenOverride(true);
      setKitchenState(action === 'on');
    }
  };

  // Garage LED Controls
  const controlGarage = (action) => {
    if (!deviceIds.garageLed) return;
    sendCommand(deviceIds.garageLed, 'led_control', {
      action: action, // 'on', 'off', 'auto'
      manual_override: action !== 'auto',
      timestamp: Date.now()
    });
    
    if (action === 'auto') {
      setGarageOverride(false);
    } else {
      setGarageOverride(true);
      setGarageState(action === 'on');
    }
  };

  // Get sensor reading for a specific device
  const getSensorReading = (deviceId) => {
    const sensor = sensors.find(s => s.device_id === deviceId);
    return sensor ? (sensor.value || sensor.reading_value) : null;
  };

  const presetColors = {
    sunset: [
      { r: 235, g: 45, b: 0 },
      { r: 252, g: 244, b: 16 },
      { r: 252, g: 109, b: 16 }
    ],
    forest: [
      { r: 47, g: 237, b: 1 },
      { r: 30, g: 169, b: 64 },
      { r: 0, g: 235, b: 102 }
    ],
    midnight: [
      { r: 16, g: 143, b: 252 },
      { r: 16, g: 39, b: 252 },
      { r: 111, g: 16, b: 252 }
    ]
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading lighting system...</div>
      </div>
    );
  }

  const sharedLdrValue = getSensorReading(deviceIds.sharedLdr);
  const garageLdrValue = getSensorReading(deviceIds.garageLdr);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 text-white p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">🌒 Smart Lighting Control</h1>
            <p className="text-gray-300">ESP32 RGB LED & Sensor Management</p>
          </div>
          <nav className="flex gap-4">
            <Link href="/"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              🏠 Home
            </Link>
            <a
              href="/dashboard"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
            >
              📊 Dashboard
            </a>
            <a
              href="/fan-control"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              🌀 Fan Control
            </a>
            <a
              href="/rain-control"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
            >
              🌧️ Rain Control
            </a>
          </nav>
        </div>
      </header>

      {/* Sensor Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">📊 Light Sensors</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Living Room + Kitchen LDR:</span>
              <span className={`font-bold ${sharedLdrValue < 2000 ? 'text-yellow-400' : 'text-blue-400'}`}>
                {sharedLdrValue || 'N/A'} {sharedLdrValue < 2000 ? '(Dark)' : '(Bright)'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Garage LDR:</span>
              <span className={`font-bold ${garageLdrValue < 2000 ? 'text-yellow-400' : 'text-blue-400'}`}>
                {garageLdrValue || 'N/A'} {garageLdrValue < 2000 ? '(Dark)' : '(Bright)'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">⚡ System Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>RGB LED Mode:</span>
              <span className="text-cyan-400">{rgbMode.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>Kitchen Override:</span>
              <span className={kitchenOverride ? 'text-orange-400' : 'text-green-400'}>
                {kitchenOverride ? 'MANUAL' : 'AUTO'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Garage Override:</span>
              <span className={garageOverride ? 'text-orange-400' : 'text-green-400'}>
                {garageOverride ? 'MANUAL' : 'AUTO'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RGB LED Controls */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h3 className="text-2xl font-semibold mb-6">🌈 Living Room RGB LED</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Solid Color Control */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Solid Color</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-2">Red</label>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={solidColor.r}
                  onChange={(e) => setSolidColor({...solidColor, r: parseInt(e.target.value)})}
                  className="w-full"
                />
                <span className="text-sm text-gray-400">{solidColor.r}</span>
              </div>
              <div>
                <label className="block text-sm mb-2">Green</label>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={solidColor.g}
                  onChange={(e) => setSolidColor({...solidColor, g: parseInt(e.target.value)})}
                  className="w-full"
                />
                <span className="text-sm text-gray-400">{solidColor.g}</span>
              </div>
              <div>
                <label className="block text-sm mb-2">Blue</label>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={solidColor.b}
                  onChange={(e) => setSolidColor({...solidColor, b: parseInt(e.target.value)})}
                  className="w-full"
                />
                <span className="text-sm text-gray-400">{solidColor.b}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded border-2 border-gray-600"
                style={{backgroundColor: `rgb(${solidColor.r}, ${solidColor.g}, ${solidColor.b})`}}
              ></div>
              <button
                onClick={setRGBSolidColor}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition duration-200"
              >
                Set Solid Color
              </button>
            </div>
          </div>

          {/* Fade Presets */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Fade Presets</h4>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setRGBFadePreset('sunset')}
                className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded transition duration-200"
              >
                🌅 Sunset
              </button>
              <button
                onClick={() => setRGBFadePreset('forest')}
                className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded transition duration-200"
              >
                🌲 Forest
              </button>
              <button
                onClick={() => setRGBFadePreset('midnight')}
                className="bg-gradient-to-r from-blue-600 to-purple-500 hover:from-blue-700 hover:to-purple-600 text-white font-bold py-3 px-6 rounded transition duration-200"
              >
                🌙 Midnight
              </button>
            </div>
            <button
              onClick={turnOffRGB}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded transition duration-200"
            >
              ❌ Turn Off RGB
            </button>
          </div>
        </div>
      </div>

      {/* Kitchen & Garage Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kitchen LED */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">🍳 Kitchen LED</h3>
          <p className="text-sm text-gray-400 mb-4">Shares LDR with Living Room</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => controlKitchen('on')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              ON
            </button>
            <button
              onClick={() => controlKitchen('off')}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              OFF
            </button>
            <button
              onClick={() => controlKitchen('auto')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              AUTO
            </button>
          </div>
        </div>

        {/* Garage LED */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">🚗 Garage LED</h3>
          <p className="text-sm text-gray-400 mb-4">Has dedicated LDR sensor</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => controlGarage('on')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              ON
            </button>
            <button
              onClick={() => controlGarage('off')}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              OFF
            </button>
            <button
              onClick={() => controlGarage('auto')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              AUTO
            </button>
          </div>
        </div>
      </div>

      {/* Recent Commands */}
      {commands.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 mt-8">
          <h3 className="text-xl font-semibold mb-4">📋 Recent Commands</h3>
          <div className="space-y-2">
            {commands.slice(0, 5).map(command => (
              <div key={command.id} className="flex justify-between items-center text-sm">
                <span>{command.devices?.name || 'Unknown Device'}</span>
                <span className="text-gray-400">{command.command_type}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  command.status === 'pending' ? 'bg-yellow-600' :
                  command.status === 'executed' ? 'bg-green-600' : 'bg-red-600'
                }`}>
                  {command.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
