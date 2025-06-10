'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'

export default function Kitchen() {
  const [devices, setDevices] = useState([])
  const [sensors, setSensors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [devicesRes, sensorsRes] = await Promise.all([
        fetch('/api/devices'),
        fetch('/api/sensors/latest')
      ])

      if (devicesRes.ok) setDevices(await devicesRes.json())
      if (sensorsRes.ok) setSensors(await sensorsRes.json())

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

  // Device IDs
  const kitchenLed = devices.find(d => d.type === 'led' && d.name.includes('Kitchen'))
  const sharedLdr = devices.find(d => d.type === 'ldr' && d.name.includes('Living Room + Kitchen'))

  // Get sensor reading
  const getSensorReading = (deviceId) => {
    const sensor = sensors.find(s => s.device_id === deviceId)
    return sensor ? (sensor.value || sensor.reading_value) : null
  }

  const getLightLevel = () => {
    return getSensorReading(sharedLdr?.id) || 0
  }

  const isLedOn = () => {
    return kitchenLed?.current_state?.is_on || false
  }

  const isAutoMode = () => {
    return !kitchenLed?.current_state?.manual_override || false
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-600 dark:text-gray-300">Loading kitchen...</div>
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🍳 Kitchen</h1>
            <p className="text-gray-600 dark:text-gray-400">Smart lighting with automatic control</p>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">💡 Light Level</h3>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{getLightLevel()}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {getLightLevel() < 2000 ? 'Dark - LED Auto On' : 'Bright - LED Auto Off'}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">🔆 LED Status</h3>
            <div className={`text-3xl font-bold ${isLedOn() ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
              {isLedOn() ? 'ON' : 'OFF'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Mode: {isAutoMode() ? 'Automatic' : 'Manual'}
            </div>
          </div>
        </div>

        {/* Kitchen LED Control */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">💡 Kitchen LED Control</h3>
          
          <div className="space-y-6">
            {/* Manual Controls */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Manual Control</h4>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => kitchenLed && sendCommand(kitchenLed.id, 'led_control', {
                    action: 'on',
                    manual_override: true,
                    timestamp: Date.now()
                  })}
                  className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  🟢 Turn On
                </button>
                <button
                  onClick={() => kitchenLed && sendCommand(kitchenLed.id, 'led_control', {
                    action: 'off',
                    manual_override: true,
                    timestamp: Date.now()
                  })}
                  className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  🔴 Turn Off
                </button>
                <button
                  onClick={() => kitchenLed && sendCommand(kitchenLed.id, 'led_control', {
                    action: 'auto',
                    manual_override: false,
                    timestamp: Date.now()
                  })}
                  className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  🤖 Auto Mode
                </button>
              </div>
            </div>

            {/* Auto Mode Info */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">🤖 Automatic Mode</h5>
              <div className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                <p>• LED turns ON when light level drops below 2000</p>
                <p>• LED turns OFF when light level rises above 2000</p>
                <p>• Shared LDR sensor with Living Room</p>
                <p>• Current threshold: 2000 lux</p>
              </div>
            </div>

            {/* Device Information */}
            {kitchenLed && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">📋 Device Information</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Device Name:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{kitchenLed.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Pin:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{kitchenLed.pin_number}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{kitchenLed.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className={`ml-2 font-medium ${kitchenLed.is_online ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {kitchenLed.is_online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Shared LDR Information */}
            {sharedLdr && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h5 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">🔆 Light Sensor</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-yellow-800 dark:text-yellow-400">Sensor Name:</span>
                    <span className="ml-2 font-medium text-yellow-900 dark:text-yellow-300">{sharedLdr.name}</span>
                  </div>
                  <div>
                    <span className="text-yellow-800 dark:text-yellow-400">Current Reading:</span>
                    <span className="ml-2 font-medium text-yellow-900 dark:text-yellow-300">{getLightLevel()} lux</span>
                  </div>
                  <div>
                    <span className="text-yellow-800 dark:text-yellow-400">Pin:</span>
                    <span className="ml-2 font-medium text-yellow-900 dark:text-yellow-300">{sharedLdr.pin_number}</span>
                  </div>
                  <div>
                    <span className="text-yellow-800 dark:text-yellow-400">Shared with:</span>
                    <span className="ml-2 font-medium text-yellow-900 dark:text-yellow-300">Living Room RGB</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">⚡ Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => {
                // Turn on kitchen LED and set to auto mode
                if (kitchenLed) {
                  sendCommand(kitchenLed.id, 'led_control', {
                    action: 'auto',
                    manual_override: false,
                    timestamp: Date.now()
                  })
                }
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all"
            >
              🏠 Set Smart Mode
            </button>
            <button
              onClick={() => {
                // Force LED on for cooking
                if (kitchenLed) {
                  sendCommand(kitchenLed.id, 'led_control', {
                    action: 'on',
                    manual_override: true,
                    timestamp: Date.now()
                  })
                }
              }}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium py-3 px-6 rounded-lg transition-all"
            >
              👨‍🍳 Cooking Mode
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
