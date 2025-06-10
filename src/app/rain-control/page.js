'use client';

import { useState, useEffect } from 'react';

export default function RainControl() {
  const [rainData, setRainData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentRainLevel, setCurrentRainLevel] = useState('DRY');
  const [currentRainReading, setCurrentRainReading] = useState(0);
  const [windowState, setWindowState] = useState('OPEN');
  const [rainMode, setRainMode] = useState('AUTO');

  useEffect(() => {
    fetchRainData();
    const interval = setInterval(fetchRainData, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchRainData = async () => {
    try {
      const response = await fetch('/api/rain-control');
      const data = await response.json();
      
      if (data.devices) {
        setRainData(data);
        
        // Extract current rain reading
        if (data.latestRainReading) {
          setCurrentRainReading(data.latestRainReading.value);
          setCurrentRainLevel(classifyRainLevel(data.latestRainReading.value));
        }
        
        // Find rain sensor device and get its current state
        const rainSensor = data.devices.find(device => device.type === 'rain_sensor');
        if (rainSensor && rainSensor.current_state) {
          setRainMode(rainSensor.current_state.mode || 'AUTO');
          setWindowState(rainSensor.current_state.window_state || 'OPEN');
          if (rainSensor.current_state.rain_level) {
            setCurrentRainLevel(rainSensor.current_state.rain_level);
          }
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching rain data:', error);
      setLoading(false);
    }
  };

  const sendRainCommand = async (action, mode = null, windowState = null) => {
    try {
      const rainSensor = rainData?.devices?.find(device => device.type === 'rain_sensor');
      if (!rainSensor) {
        console.error('Rain sensor device not found');
        return;
      }

      const commandData = {
        device_id: rainSensor.id,
        action: action
      };

      if (mode !== null) {
        commandData.mode = mode;
      }
      if (windowState !== null) {
        commandData.window_state = windowState;
      }

      const response = await fetch('/api/rain-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commandData),
      });

      if (response.ok) {
        console.log('Rain command sent successfully');
        // Update local state immediately for better UX
        if (action === 'set_mode') {
          setRainMode(mode);
        } else if (action === 'set_window_state') {
          setWindowState(windowState);
          setRainMode('MANUAL');
        }
        
        // Refresh data after a short delay
        setTimeout(fetchRainData, 500);
      }
    } catch (error) {
      console.error('Error sending rain command:', error);
    }
  };

  const classifyRainLevel = (reading) => {
    if (reading < 200) return 'DRY';
    if (reading < 400) return 'LIGHT';
    if (reading < 600) return 'MODERATE';
    return 'HEAVY';
  };

  const getRainLevelColor = (level) => {
    switch (level) {
      case 'DRY': return 'text-green-400';
      case 'LIGHT': return 'text-yellow-400';
      case 'MODERATE': return 'text-orange-400';
      case 'HEAVY': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getRainLevelIcon = (level) => {
    switch (level) {
      case 'DRY': return '☀️';
      case 'LIGHT': return '🌦️';
      case 'MODERATE': return '🌧️';
      case 'HEAVY': return '⛈️';
      default: return '❓';
    }
  };

  const getWindowStateColor = (state) => {
    return state === 'OPEN' ? 'text-green-400' : 'text-blue-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading rain detection system...</div>
      </div>
    );
  }

  const rainSensor = rainData?.devices?.find(device => device.type === 'rain_sensor');
  const windowServos = rainData?.devices?.filter(device => device.type === 'window_servo') || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 text-white p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">🌧️ Smart Rain Detection</h1>
            <p className="text-gray-300">ESP32 Rain Detection & Automatic Window Control System</p>
          </div>
          <nav className="flex gap-4">
            <a
              href="/"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              🏠 Home
            </a>
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
            <a
              href="/fan-control"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              🌀 Fan Control
            </a>
          </nav>
        </div>
      </header>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Rain Detection Display */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">🌧️ Rain Detection</h3>
          <div className="text-center">
            <div className="text-6xl mb-4">
              {getRainLevelIcon(currentRainLevel)}
            </div>
            <div className={`text-3xl font-bold mb-2 ${getRainLevelColor(currentRainLevel)}`}>
              {currentRainLevel} RAIN
            </div>
            <div className="text-lg text-gray-400 mb-2">
              Reading: {currentRainReading}
            </div>
            {rainSensor && (
              <div className="text-sm text-gray-500 mt-2">
                Sensor: {rainSensor.name}
              </div>
            )}
          </div>
        </div>

        {/* Window Status */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">🪟 Window Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Mode:</span>
              <span className={`font-bold px-3 py-1 rounded ${
                rainMode === 'AUTO' ? 'bg-green-600' : 'bg-orange-600'
              }`}>
                {rainMode}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Windows:</span>
              <span className={`font-bold text-2xl ${getWindowStateColor(windowState)}`}>
                {windowState === 'OPEN' ? '🪟 OPEN' : '🔒 CLOSED'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Servos Connected:</span>
              <span className="text-gray-400">{windowServos.length}</span>
            </div>
            {windowServos.length > 0 && (
              <div className="text-sm text-gray-500 mt-2">
                {windowServos.map(servo => servo.name).join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Controls */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h3 className="text-2xl font-semibold mb-6">🎛️ Manual Control</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Mode Control */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Control Mode</h4>
            <div className="flex gap-4">
              <button
                onClick={() => sendRainCommand('set_mode', 'AUTO')}
                className={`py-3 px-6 rounded-lg font-bold transition duration-200 ${
                  rainMode === 'AUTO'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 hover:bg-green-600 text-gray-300 hover:text-white'
                }`}
              >
                🤖 AUTO
              </button>
              <button
                onClick={() => sendRainCommand('set_mode', 'MANUAL')}
                className={`py-3 px-6 rounded-lg font-bold transition duration-200 ${
                  rainMode === 'MANUAL'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-700 hover:bg-orange-600 text-gray-300 hover:text-white'
                }`}
              >
                👤 MANUAL
              </button>
            </div>
          </div>

          {/* Window Control */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Window Control</h4>
            <div className="flex gap-4">
              <button
                onClick={() => sendRainCommand('set_window_state', null, 'OPEN')}
                className={`py-3 px-6 rounded-lg font-bold transition duration-200 ${
                  windowState === 'OPEN'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 hover:bg-green-600 text-gray-300 hover:text-white'
                }`}
              >
                🪟 OPEN
              </button>
              <button
                onClick={() => sendRainCommand('set_window_state', null, 'CLOSED')}
                className={`py-3 px-6 rounded-lg font-bold transition duration-200 ${
                  windowState === 'CLOSED'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-blue-600 text-gray-300 hover:text-white'
                }`}
              >
                🔒 CLOSE
              </button>
            </div>
          </div>
        </div>

        {/* Emergency Controls */}
        <div className="border-t border-gray-700 pt-6">
          <h4 className="text-lg font-semibold mb-4 text-red-400">⚠️ Emergency Controls</h4>
          <div className="flex gap-4">
            <button
              onClick={() => sendRainCommand('emergency_close')}
              className="py-3 px-6 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition duration-200"
            >
              🚨 EMERGENCY CLOSE
            </button>
            <button
              onClick={() => sendRainCommand('emergency_open')}
              className="py-3 px-6 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold transition duration-200"
            >
              🆘 EMERGENCY OPEN
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Emergency controls override all other settings and execute immediately
          </p>
        </div>
      </div>

      {/* Auto Mode Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">⚙️ Auto Mode Thresholds</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-green-400 font-bold">< 200</div>
            <div className="text-sm text-gray-400">No Rain - Windows Open</div>
          </div>
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-yellow-400 font-bold">200-400</div>
            <div className="text-sm text-gray-400">Light Rain - Windows Close</div>
          </div>
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-orange-400 font-bold">400-600</div>
            <div className="text-sm text-gray-400">Moderate Rain - Keep Closed</div>
          </div>
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-red-400 font-bold">> 600</div>
            <div className="text-sm text-gray-400">Heavy Rain - Stay Closed</div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-400">
          <p><strong>AUTO Mode:</strong> Windows automatically close when rain is detected and reopen after 10 seconds of dry conditions</p>
          <p><strong>Manual Mode:</strong> Full manual control over window position regardless of rain detection</p>
        </div>
      </div>
    </div>
  );
}
