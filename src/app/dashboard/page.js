'use client';

import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDevices();
    fetchSensors();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices');
      const data = await response.json();
      setDevices(data);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const fetchSensors = async () => {
    try {
      const response = await fetch('/api/sensors/latest');
      const data = await response.json();
      setSensors(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sensors:', error);
      setLoading(false);
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
      }
    } catch (error) {
      console.error('Error sending command:', error);
    }
  };

  const toggleLED = (deviceId) => {
    sendCommand(deviceId, 'led_control', { action: 'toggle', timestamp: Date.now() });
  };

  const setRGBColor = (deviceId, color) => {
    sendCommand(deviceId, 'rgb_control', {
      action: 'set_color',
      color: color,
      enabled: true,
      mode: 'solid',
      timestamp: Date.now(),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 text-white p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">IoT Dashboard</h1>
            <p className="text-gray-300">Real-time ESP32 Device Control</p>
          </div>
          <nav className="flex gap-4">
            <a
              href="/"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              🏠 Home
            </a>
            <a
              href="/lighting"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              🌈 Lighting
            </a>
          </nav>
        </div>
      </header>

      {/* Device Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {devices
          .filter(device => device.type === 'led' || device.type === 'rgb_led')
          .map(device => (
            <div key={device.id} className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="text-xl font-semibold mb-4">{device.name}</h3>
              <p className="text-gray-400 mb-4">Pin: {device.pin_number}</p>
              
              {device.type === 'led' && (
                <button
                  onClick={() => toggleLED(device.id)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
                >
                  Toggle LED
                </button>
              )}

              {device.type === 'rgb_led' && (
                <div className="space-y-2">
                  <button
                    onClick={() => setRGBColor(device.id, { r: 255, g: 0, b: 0 })}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-200"
                  >
                    Red
                  </button>
                  <button
                    onClick={() => setRGBColor(device.id, { r: 0, g: 255, b: 0 })}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-200"
                  >
                    Green
                  </button>
                  <button
                    onClick={() => setRGBColor(device.id, { r: 0, g: 0, b: 255 })}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
                  >
                    Blue
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Sensor Data */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Sensor Readings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sensors.map(sensor => (
            <div key={sensor.id} className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-lg">{sensor.devices?.name || 'Unknown Sensor'}</h4>
              <p className="text-gray-300">Type: {sensor.sensor_type}</p>
              <p className="text-2xl font-bold text-cyan-400">{sensor.value || sensor.reading_value} {sensor.unit}</p>
              <p className="text-sm text-gray-400">
                {new Date(sensor.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
