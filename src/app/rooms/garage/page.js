'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'

export default function Garage() {
  const [devices, setDevices] = useState([])
  const [sensors, setSensors] = useState([])
  const [doorData, setDoorData] = useState(null)
  const [garageData, setGarageData] = useState(null)
  const [smokeData, setSmokeData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [devicesRes, sensorsRes, doorRes, garageRes, smokeRes] = await Promise.all([
        fetch('/api/devices'),
        fetch('/api/sensors/latest'),
        fetch('/api/door-access'),
        fetch('/api/garage-control'),
        fetch('/api/gas-alarm')
      ])

      if (devicesRes.ok) setDevices(await devicesRes.json())
      if (sensorsRes.ok) setSensors(await sensorsRes.json())
      if (doorRes.ok) setDoorData(await doorRes.json())
      if (garageRes.ok) setGarageData(await garageRes.json())
      if (smokeRes.ok) setSmokeData(await smokeRes.json())

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

  const sendDoorCommand = async (deviceId, commandData) => {
    try {
      const response = await fetch('/api/door-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, ...commandData })
      })
      if (response.ok) {
        setTimeout(fetchData, 1000)
      }
    } catch (error) {
      console.error('Error sending door command:', error)
    }
  }

  const sendGarageCommand = async (deviceId, commandData) => {
    try {
      const response = await fetch('/api/garage-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, ...commandData })
      })
      if (response.ok) {
        setTimeout(fetchData, 1000)
      }
    } catch (error) {
      console.error('Error sending garage command:', error)
    }
  }

  // Device IDs
  const garageLed = devices.find(d => d.type === 'led' && d.name.includes('Garage'))
  const garageLdr = devices.find(d => d.type === 'ldr' && d.name.includes('Garage'))
  const doorServo = doorData?.devices?.find(d => d.type === 'servo_motor')
  const garageServo = garageData?.devices?.find(d => d.type === 'servo_motor')
  const outsideIR = garageData?.devices?.find(d => d.type === 'ir_sensor' && d.name.includes('Outside'))
  const insideIR = garageData?.devices?.find(d => d.type === 'ir_sensor' && d.name.includes('Inside'))
  const smokeDevice = smokeData?.devices?.find(d => d.type === 'gas_sensor')

  // Get sensor reading
  const getSensorReading = (deviceId) => {
    const sensor = sensors.find(s => s.device_id === deviceId)
    return sensor ? (sensor.value || sensor.reading_value) : null
  }

  const getGarageLightLevel = () => {
    return getSensorReading(garageLdr?.id) || 0
  }

  const getSmokeLevel = () => {
    return smokeData?.latestSmokeReading?.value || 0
  }

  const getMotionStatus = (deviceId) => {
    return getSensorReading(deviceId) === 1
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-600 dark:text-gray-300">Loading garage...</div>
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🚗 Garage</h1>
            <p className="text-gray-600 dark:text-gray-400">Security, lighting, and access control</p>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">💡 Light Level</h3>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{getGarageLightLevel()}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {getGarageLightLevel() < 2000 ? 'Dark' : 'Bright'}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">🚨 Smoke Level</h3>
            <div className={`text-3xl font-bold ${getSmokeLevel() < 300 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {getSmokeLevel()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {getSmokeLevel() < 300 ? 'Normal' : 'Alert'}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">🚪 Main Door</h3>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">LOCKED</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Secure</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">🏠 Garage Door</h3>
            <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">CLOSED</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Secure</div>
          </div>
        </div>

        {/* Garage LED Control */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">💡 Garage LED Control</h3>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => garageLed && sendCommand(garageLed.id, 'led_control', {
                action: 'on',
                manual_override: true,
                timestamp: Date.now()
              })}
              className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 font-medium py-3 px-6 rounded-lg transition-colors"
            >
              🟢 Turn On
            </button>
            <button
              onClick={() => garageLed && sendCommand(garageLed.id, 'led_control', {
                action: 'off',
                manual_override: true,
                timestamp: Date.now()
              })}
              className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 font-medium py-3 px-6 rounded-lg transition-colors"
            >
              🔴 Turn Off
            </button>
            <button
              onClick={() => garageLed && sendCommand(garageLed.id, 'led_control', {
                action: 'auto',
                manual_override: false,
                timestamp: Date.now()
              })}
              className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 font-medium py-3 px-6 rounded-lg transition-colors"
            >
              🤖 Auto Mode
            </button>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-400">
              Garage LED has its own dedicated LDR sensor for independent light control
            </p>
          </div>
        </div>

        {/* Door Access Control */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">🔐 Main Door Access</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Access Control</h4>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => doorServo && sendDoorCommand(doorServo.id, {
                    action: 'unlock',
                    access_code: '2309'
                  })}
                  className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  🔓 Unlock
                </button>
                <button
                  onClick={() => doorServo && sendDoorCommand(doorServo.id, {
                    action: 'lock'
                  })}
                  className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  🔒 Lock
                </button>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h5 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">🔑 Keypad Access</h5>
              <div className="text-sm text-yellow-800 dark:text-yellow-400 space-y-1">
                <p>• Enter code: 2309</p>
                <p>• Press # to confirm</p>
                <p>• Press * to clear</p>
                <p>• 3 failed attempts = lockout</p>
              </div>
            </div>
          </div>
        </div>

        {/* Garage Door Control */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">🏠 Garage Door Control</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Manual Control</h4>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => garageServo && sendGarageCommand(garageServo.id, {
                    action: 'open'
                  })}
                  className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  ⬆️ Open
                </button>
                <button
                  onClick={() => garageServo && sendGarageCommand(garageServo.id, {
                    action: 'close'
                  })}
                  className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  ⬇️ Close
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Motion Sensors</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Outside Sensor</span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    getMotionStatus(outsideIR?.id) ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                  }`}>
                    {getMotionStatus(outsideIR?.id) ? 'Motion' : 'Clear'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Inside Sensor</span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    getMotionStatus(insideIR?.id) ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                  }`}>
                    {getMotionStatus(insideIR?.id) ? 'Motion' : 'Clear'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">🤖 Automatic Operation</h5>
            <div className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <p>• Door opens automatically when motion is detected</p>
              <p>• Door closes automatically after 5 seconds</p>
              <p>• Works only when system is unlocked and no smoke alarm</p>
            </div>
          </div>
        </div>

        {/* Smoke Detection */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">🚨 Smoke Detection System</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Current Status</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Smoke Level:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{getSmokeLevel()} ppm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Threshold:</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">500 ppm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                    <span className={`text-sm font-medium ${getSmokeLevel() < 500 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {getSmokeLevel() < 500 ? 'Normal' : 'ALARM!'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Alarm Control</h4>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    // Test alarm functionality
                    fetch('/api/gas-alarm', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        device_id: smokeDevice?.id,
                        action: 'test_alarm'
                      })
                    })
                  }}
                  className="w-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800 font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  🔔 Test Alarm
                </button>
                <button
                  onClick={() => {
                    // Silence alarm
                    fetch('/api/gas-alarm', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        device_id: smokeDevice?.id,
                        action: 'silence_alarm'
                      })
                    })
                  }}
                  className="w-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  🔇 Silence Alarm
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
