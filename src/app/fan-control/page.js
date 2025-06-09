'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function FanControl() {
  const [fanData, setFanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTemp, setCurrentTemp] = useState(null);
  const [fanSpeed, setFanSpeed] = useState(0);
  const [autoMode, setAutoMode] = useState(true);

  useEffect(() => {
    fetchFanData();
    const interval = setInterval(fetchFanData, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchFanData = async () => {
    try {
      const response = await fetch('/api/fan-control');
      const data = await response.json();
      
      if (data.devices) {
        setFanData(data);
        
        // Extract current temperature
        if (data.latestTemperature) {
          // Temperature is stored as celsius_x100, so divide by 100
          setCurrentTemp(data.latestTemperature.value / 100);
        }
        
        // Find fan motor device and get its current state
        const fanMotor = data.devices.find(device => device.type === 'fan_motor');
        if (fanMotor && fanMotor.current_state) {
          setAutoMode(fanMotor.current_state.auto_mode !== false);
          setFanSpeed(fanMotor.current_state.current_speed || 0);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching fan data:', error);
      setLoading(false);
    }
  };

  const sendFanCommand = async (action, speed = null) => {
    try {
      const fanMotor = fanData?.devices?.find(device => device.type === 'fan_motor');
      if (!fanMotor) {
        console.error('Fan motor device not found');
        return;
      }

      const commandData = {
        device_id: fanMotor.id,
        action: action
      };

      if (speed !== null) {
        commandData.speed = speed;
      }

      const response = await fetch('/api/fan-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commandData),
      });

      if (response.ok) {
        console.log('Fan command sent successfully');
        // Update local state immediately for better UX
        if (action === 'set_speed') {
          setAutoMode(false);
          setFanSpeed(speed);
        } else if (action === 'set_auto') {
          setAutoMode(true);
        }
        
        // Refresh data after a short delay
        setTimeout(fetchFanData, 500);
      }
    } catch (error) {
      console.error('Error sending fan command:', error);
    }
  };

  const getSpeedLabel = (speed) => {
    switch (speed) {
      case 0: return 'OFF';
      case 150: return 'LOW';
      case 210: return 'MEDIUM';
      case 255: return 'HIGH';
      default: return `PWM ${speed}`;
    }
  };

  const getSpeedFromPWM = (pwm) => {
    if (pwm === 0) return 0;
    if (pwm <= 150) return 1;
    if (pwm <= 210) return 2;
    return 3;
  };

  const getTemperatureColor = (temp) => {
    if (temp < 25) return 'text-blue-400';
    if (temp < 30) return 'text-green-400';
    if (temp < 32) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getTemperatureStatus = (temp) => {
    if (temp < 25) return 'Cool';
    if (temp < 30) return 'Comfortable';
    if (temp < 32) return 'Warm';
    return 'Hot';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading fan control system...</div>
      </div>
    );
  }

  const fanMotor = fanData?.devices?.find(device => device.type === 'fan_motor');
  const tempSensor = fanData?.devices?.find(device => device.type === 'temperature_sensor');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 text-white p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">🌀 Smart Fan Control</h1>
            <p className="text-gray-300">ESP32 Temperature-Controlled Fan System</p>
          </div>
          <nav className="flex gap-4">
            <Link
              href="/"
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
              href="/lighting"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              🌈 Lighting
            </a>
          </nav>
        </div>
      </header>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Temperature Display */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">🌡️ Temperature</h3>
          <div className="text-center">
            <div className={`text-6xl font-bold mb-2 ${getTemperatureColor(currentTemp)}`}>
              {currentTemp ? `${currentTemp.toFixed(1)}°C` : 'N/A'}
            </div>
            <div className="text-lg text-gray-400">
              {currentTemp ? getTemperatureStatus(currentTemp) : 'No reading'}
            </div>
            {tempSensor && (
              <div className="text-sm text-gray-500 mt-2">
                Sensor: {tempSensor.name}
              </div>
            )}
          </div>
        </div>

        {/* Fan Status */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">🌀 Fan Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Mode:</span>
              <span className={`font-bold px-3 py-1 rounded ${
                autoMode ? 'bg-green-600' : 'bg-orange-600'
              }`}>
                {autoMode ? 'AUTO' : 'MANUAL'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Speed:</span>
              <span className="font-bold text-cyan-400">
                {getSpeedLabel(fanSpeed)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>PWM Value:</span>
              <span className="text-gray-400">{fanSpeed}</span>
            </div>
            {fanMotor && (
              <div className="text-sm text-gray-500 mt-2">
                Device: {fanMotor.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Controls */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h3 className="text-2xl font-semibold mb-6">🎛️ Manual Control</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => sendFanCommand('set_speed', 0)}
            className={`py-4 px-6 rounded-lg font-bold transition duration-200 ${
              !autoMode && getSpeedFromPWM(fanSpeed) === 0
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white'
            }`}
          >
            OFF
          </button>
          <button
            onClick={() => sendFanCommand('set_speed', 1)}
            className={`py-4 px-6 rounded-lg font-bold transition duration-200 ${
              !autoMode && getSpeedFromPWM(fanSpeed) === 1
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 hover:bg-green-600 text-gray-300 hover:text-white'
            }`}
          >
            LOW
          </button>
          <button
            onClick={() => sendFanCommand('set_speed', 2)}
            className={`py-4 px-6 rounded-lg font-bold transition duration-200 ${
              !autoMode && getSpeedFromPWM(fanSpeed) === 2
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-700 hover:bg-yellow-600 text-gray-300 hover:text-white'
            }`}
          >
            MEDIUM
          </button>
          <button
            onClick={() => sendFanCommand('set_speed', 3)}
            className={`py-4 px-6 rounded-lg font-bold transition duration-200 ${
              !autoMode && getSpeedFromPWM(fanSpeed) === 3
                ? 'bg-red-500 text-white'
                : 'bg-gray-700 hover:bg-red-500 text-gray-300 hover:text-white'
            }`}
          >
            HIGH
          </button>
          <button
            onClick={() => sendFanCommand('set_auto')}
            className={`py-4 px-6 rounded-lg font-bold transition duration-200 ${
              autoMode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-blue-600 text-gray-300 hover:text-white'
            }`}
          >
            AUTO
          </button>
        </div>

        <div className="text-sm text-gray-400">
          <p><strong>AUTO Mode:</strong> Fan speed automatically adjusts based on temperature</p>
          <p><strong>Manual Mode:</strong> Set specific fan speed regardless of temperature</p>
        </div>
      </div>

      {/* Auto Mode Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">⚙️ Auto Mode Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-blue-400 font-bold"> &gt; 30°C</div>
            <div className="text-sm text-gray-400">Fan OFF</div>
          </div>
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-green-400 font-bold">30-31°C</div>
            <div className="text-sm text-gray-400">Fan LOW</div>
          </div>
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-yellow-400 font-bold">31-32°C</div>
            <div className="text-sm text-gray-400">Fan MEDIUM</div>
          </div>
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-red-400 font-bold">&gt; 32°C</div>
            <div className="text-sm text-gray-400">Fan HIGH</div>
          </div>
        </div>
      </div>
    </div>
  );
}
