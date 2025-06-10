'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'

export default function LivingRoom() {
  const [devices, setDevices] = useState([])
  const [sensors, setSensors] = useState([])
  const [fanData, setFanData] = useState(null)
  const [rainData, setRainData] = useState(null)
  const [loading, setLoading] = useState(true)

  // RGB Control State
  const [rgbMode, setRgbMode] = useState('solid')
  const [solidColor, setSolidColor] = useState({ r: 255, g: 255, b: 255 })

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [devicesRes, sensorsRes, fanRes, rainRes] = await Promise.all([
        fetch('/api/devices'),
        fetch('/api/sensors/latest'),
        fetch('/api/fan-control'),
        fetch('/api/rain-control')
      ])

      if (devicesRes.ok) setDevices(await devicesRes.json())
      if (sensorsRes.ok) setSensors(await sensorsRes.json())
      if (fanRes.ok) setFanData(await fanRes.json())
      if (rainRes.ok) setRainData(await rainRes.json())

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  const sendCommand = async (deviceId, commandType, commandData) => {
    try {
      const response = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          command_type: commandType,
          command_data: commandData,
          priority: 1,
        }),
      })

      if (response.ok) {
        console.log('Command sent successfully')
        setTimeout(fetchData, 1000)
      }
    } catch (error) {
      console.error('Error sending command:', error)
    }
  }

  const sendFanCommand = async (deviceId, commandData) => {
    try {
      const response = await fetch('/api/fan-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, ...commandData })
      })
      if (response.ok) {
        setTimeout(fetchData, 1000)
      }
    } catch (error) {
      console.error('Error sending fan command:', error)
    }
  }

  // Device IDs
  const rgbDevice = devices.find(d => d.type === 'rgb_led_channel' && d.name.includes('Red'))
  const fanDevice = fanData?.devices?.find(d => d.type === 'fan_motor')
  const tempSensor = fanData?.devices?.find(d => d.type === 'temperature_sensor')
  const sharedLdr = devices.find(d => d.type === 'ldr' && d.name.includes('Living Room + Kitchen'))

  // RGB LED Controls
  const setRGBSolidColor = () => {
    if (!rgbDevice) return
    sendCommand(rgbDevice.id, 'rgb_control', {
      mode: 'solid',
      color: solidColor,
      timestamp: Date.now()
    })
  }

  const setRGBFadePreset = (preset) => {
    if (!rgbDevice) return
    sendCommand(rgbDevice.id, 'rgb_control', {
      mode: 'fade',
      preset: preset,
      timestamp: Date.now()
    })
  }

  const turnOffRGB = () => {
    if (!rgbDevice) return
    sendCommand(rgbDevice.id, 'rgb_control', {
      mode: 'off',
      timestamp: Date.now()
    })
  }

  // Get sensor reading
  const getSensorReading = (deviceId) => {
    const sensor = sensors.find(s => s.device_id === deviceId)
    return sensor ? (sensor.value || sensor.reading_value) : null
  }

  const getCurrentTemp = () => {
    return fanData?.latestTemperature?.value || 32
  }

  const getLightLevel = () => {
    return getSensorReading(sharedLdr?.id) || 0
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-600 dark:text-gray-300">Loading living room...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🛋️ Living Room</h1>
            <p className="text-gray-600 dark:text-gray-400">Ambient lighting and climate control</p>
          </div>
        </div>

        {/* Environmental Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">🌡️ Temperature</h3>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{getCurrentTemp()}°C</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Comfortable</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">💡 Light Level</h3>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{getLightLevel()}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {getLightLevel() < 2000 ? 'Dark' : 'Bright'}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">🌧️ Rain Status</h3>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {rainData?.latestRainReading?.value || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Normal</div>
          </div>
        </div>

        {/* RGB LED Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">🌈 RGB Ambient Lighting</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Solid Color Control */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Custom Color</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Red</label>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={solidColor.r}
                    onChange={(e) => setSolidColor({...solidColor, r: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{solidColor.r}</span>
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Green</label>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={solidColor.g}
                    onChange={(e) => setSolidColor({...solidColor, g: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{solidColor.g}</span>
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-700 dark:text-gray-300">Blue</label>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={solidColor.b}
                    onChange={(e) => setSolidColor({...solidColor, b: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{solidColor.b}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-lg border-2 border-gray-300 dark:border-gray-600"
                  style={{backgroundColor: `rgb(${solidColor.r}, ${solidColor.g}, ${solidColor.b})`}}
                ></div>
                <button
                  onClick={setRGBSolidColor}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Apply Color
                </button>
              </div>
            </div>

            {/* Preset Controls */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Mood Presets</h4>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setRGBFadePreset('sunset')}
                  className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-medium py-3 px-6 rounded-lg transition-all"
                >
                  🌅 Sunset
                </button>
                <button
                  onClick={() => setRGBFadePreset('forest')}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium py-3 px-6 rounded-lg transition-all"
                >
                  🌲 Forest
                </button>
                <button
                  onClick={() => setRGBFadePreset('midnight')}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium py-3 px-6 rounded-lg transition-all"
                >
                  🌙 Midnight
                </button>
                <button
                  onClick={turnOffRGB}
                  className="bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  ❌ Turn Off
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Fan Control */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">🌀 Ceiling Fan</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Off', speed: 0, color: 'gray' },
              { label: 'Low', speed: 150, color: 'green' },
              { label: 'Medium', speed: 210, color: 'blue' },
              { label: 'High', speed: 255, color: 'red' }
            ].map((setting) => (
              <button
                key={setting.label}
                onClick={() => fanDevice && sendFanCommand(fanDevice.id, {
                  action: 'set_speed',
                  speed: setting.speed
                })}
                className={`bg-${setting.color}-100 dark:bg-${setting.color}-900 text-${setting.color}-700 dark:text-${setting.color}-300 hover:bg-${setting.color}-200 dark:hover:bg-${setting.color}-800 font-medium py-3 px-4 rounded-lg transition-colors`}
              >
                {setting.label}
              </button>
            ))}
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Auto Mode</span>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Enabled</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Fan speed adjusts automatically based on temperature
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
