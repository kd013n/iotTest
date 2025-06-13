'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'

export default function Dashboard() {
  const [activeRoom, setActiveRoom] = useState('Living Room')
  const [devices, setDevices] = useState([])
  const [sensors, setSensors] = useState([])
  const [fanData, setFanData] = useState(null)
  const [doorData, setDoorData] = useState(null)
  const [garageData, setGarageData] = useState(null)
  const [smokeData, setSmokeData] = useState(null)
  const [rainData, setRainData] = useState(null)
  const [loading, setLoading] = useState(true)

  const rooms = ['Living Room', 'Kitchen', 'Garage']

  useEffect(() => {
    fetchAllData()
    const interval = setInterval(fetchAllData, 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      
      const [
        devicesRes, sensorsRes, fanRes, doorRes, 
        garageRes, smokeRes, rainRes
      ] = await Promise.all([
        fetch('/api/devices'),
        fetch('/api/sensors/latest'),
        fetch('/api/fan-control'),
        fetch('/api/door-access'),
        fetch('/api/garage-control'),
        fetch('/api/gas-alarm'),
        fetch('/api/rain-control')
      ])

      if (devicesRes.ok) setDevices(await devicesRes.json())
      if (sensorsRes.ok) setSensors(await sensorsRes.json())
      if (fanRes.ok) setFanData(await fanRes.json())
      if (doorRes.ok) setDoorData(await doorRes.json())
      if (garageRes.ok) setGarageData(await garageRes.json())
      if (smokeRes.ok) setSmokeData(await smokeRes.json())
      if (rainRes.ok) setRainData(await rainRes.json())

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendCommand = async (endpoint, deviceId, commandData) => {
    try {
      const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, ...commandData })
      })
      if (response.ok) {
        setTimeout(fetchAllData, 1000)
      }
    } catch (error) {
      console.error('Error sending command:', error)
    }
  }

  const getTemperature = () => {
    return fanData?.latestTemperature?.value || 32
  }

  const getHumidity = () => {
    return 40 // Mock for now
  }

  const getRainLevel = () => {
    return rainData?.latestRainReading?.value || 0
  }

  const getSmokeLevel = () => {
    return smokeData?.latestSmokeReading?.value || 0
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-xl text-gray-600 dark:text-gray-300">Loading dashboard...</div>
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Home 🏠</h1>
            <p className="text-gray-600 dark:text-gray-400">Welcome back to homnii</p>
          </div>
        </div>

        {/* Room Navigation */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {rooms.map(room => (
            <button
              key={room}
              onClick={() => setActiveRoom(room)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeRoom === room 
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {room}
            </button>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Column - Room Controls */}
          <div className="lg:col-span-3 space-y-6">
            {activeRoom === 'Living Room' && <LivingRoomControls 
              devices={devices} 
              fanData={fanData}
              rainData={rainData}
              sendCommand={sendCommand}
            />}
            {activeRoom === 'Kitchen' && <KitchenControls 
              devices={devices} 
              sendCommand={sendCommand}
            />}
            {activeRoom === 'Garage' && <GarageControls 
              devices={devices} 
              garageData={garageData}
              doorData={doorData}
              smokeData={smokeData}
              sendCommand={sendCommand}
            />}
          </div>

          {/* Right Column - Environmental Data */}
          <div className="space-y-6">
            <EnvironmentalCard 
              temperature={getTemperature()}
              humidity={getHumidity()}
              rainLevel={getRainLevel()}
              smokeLevel={getSmokeLevel()}
            />
            <ActivityCard />
          </div>
        </div>
      </div>
    </Layout>
  )
}

// Living Room Controls Component
function LivingRoomControls({ devices, fanData, rainData, sendCommand }) {
  const rgbDevice = devices.find(d => d.type === 'rgb_led_channel' && d.name.includes('Red'))
  const fanDevice = fanData?.devices?.find(d => d.type === 'fan_motor')
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Ambient Light Control */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">💡 Ambient Light</h3>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-orange-400 rounded-full"></span>
            <span className="text-sm text-gray-600 dark:text-gray-400">On</span>
          </div>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">Natural Device Color</div>
        
        <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => rgbDevice && sendCommand('commands', rgbDevice.id, {
              command_type: 'rgb_control',
              command_data: { mode: 'fade', preset: 'sunset' }
            })}
            className="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
          >
            Sunset
          </button>
          <button 
            onClick={() => rgbDevice && sendCommand('commands', rgbDevice.id, {
              command_type: 'rgb_control', 
              command_data: { mode: 'fade', preset: 'forest' }
            })}
            className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
          >
            Forest
          </button>
          <button 
            onClick={() => rgbDevice && sendCommand('commands', rgbDevice.id, {
              command_type: 'rgb_control',
              command_data: { mode: 'fade', preset: 'midnight' }
            })}
            className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            Midnight
          </button>
        </div>
      </div>

      {/* Fan Control */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">🌀 Ceiling Fan</h3>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
            <span className="text-sm text-gray-600 dark:text-gray-400">Auto</span>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {['Off', 'Low', 'Medium', 'High'].map((speed, index) => (
            <button
              key={speed}
              onClick={() => fanDevice && sendCommand('fan-control', fanDevice.id, {
                action: 'set_speed',
                speed: index === 0 ? 0 : index === 1 ? 150 : index === 2 ? 210 : 255
              })}
              className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-3 py-2 rounded-lg text-sm transition-colors"
            >
              {speed}
            </button>
          ))}
        </div>
      </div>

      {/* Rain Sensor */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">🌧️ Rain Sensor</h3>
          <span className="text-sm bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-2 py-1 rounded">Normal</span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Window Control: Auto</div>
        <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          Level: {rainData?.latestRainReading?.value || 0}
        </div>
      </div>
    </div>
  )
}

// Kitchen Controls Component
function KitchenControls({ devices, sendCommand }) {
  const kitchenLed = devices.find(d => d.type === 'led' && d.name.includes('Kitchen'))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">💡 Kitchen Light</h3>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-green-400 rounded-full"></span>
            <span className="text-sm text-gray-600 dark:text-gray-400">Auto</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => kitchenLed && sendCommand('commands', kitchenLed.id, {
              command_type: 'led_control',
              command_data: { action: 'on', manual_override: true }
            })}
            className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
          >
            On
          </button>
          <button
            onClick={() => kitchenLed && sendCommand('commands', kitchenLed.id, {
              command_type: 'led_control',
              command_data: { action: 'off', manual_override: true }
            })}
            className="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
          >
            Off
          </button>
          <button
            onClick={() => kitchenLed && sendCommand('commands', kitchenLed.id, {
              command_type: 'led_control',
              command_data: { action: 'auto', manual_override: false }
            })}
            className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            Auto
          </button>
        </div>
      </div>
    </div>
  )
}

// Garage Controls Component
function GarageControls({ devices, garageData, doorData, smokeData, sendCommand }) {
  const garageLed = devices.find(d => d.type === 'led' && d.name.includes('Garage'))
  const garageServo = garageData?.devices?.find(d => d.type === 'servo_motor')
  const doorServo = doorData?.devices?.find(d => d.type === 'servo_motor')

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Garage Light */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">💡 Garage Light</h3>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
            <span className="text-sm text-gray-600 dark:text-gray-400">Auto</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => garageLed && sendCommand('commands', garageLed.id, {
              command_type: 'led_control',
              command_data: { action: 'on', manual_override: true }
            })}
            className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
          >
            On
          </button>
          <button
            onClick={() => garageLed && sendCommand('commands', garageLed.id, {
              command_type: 'led_control',
              command_data: { action: 'off', manual_override: true }
            })}
            className="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
          >
            Off
          </button>
          <button
            onClick={() => garageLed && sendCommand('commands', garageLed.id, {
              command_type: 'led_control',
              command_data: { action: 'auto', manual_override: false }
            })}
            className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            Auto
          </button>
        </div>
      </div>

      {/* Main Door Access */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">🔐 Main Door</h3>
          <span className="text-sm bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 px-2 py-1 rounded">Locked</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => doorServo && sendCommand('door-access', doorServo.id, {
              action: 'unlock',
              access_code: '2309'
            })}
            className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
          >
            Unlock
          </button>
          <button
            onClick={() => doorServo && sendCommand('door-access', doorServo.id, {
              action: 'lock'
            })}
            className="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
          >
            Lock
          </button>
        </div>
      </div>

      {/* Garage Door Control */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">🚪 Garage Door</h3>
          <span className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">Closed</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => garageServo && sendCommand('garage-control', garageServo.id, {
              action: 'open'
            })}
            className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            Open
          </button>
          <button
            onClick={() => garageServo && sendCommand('garage-control', garageServo.id, {
              action: 'close'
            })}
            className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Smoke Detector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">🚨 Smoke Detector</h3>
          <span className="text-sm bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-2 py-1 rounded">Normal</span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Level: {smokeData?.latestSmokeReading?.value || 0} ppm
        </div>
      </div>
    </div>
  )
}

// Environmental Card Component
function EnvironmentalCard({ temperature, humidity, rainLevel, smokeLevel }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">🌡️ Environment</h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Temperature</span>
          <span className="text-lg font-medium text-gray-900 dark:text-white">{temperature}°C</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Humidity</span>
          <span className="text-lg font-medium text-gray-900 dark:text-white">{humidity}%</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Rain Level</span>
          <span className="text-lg font-medium text-gray-900 dark:text-white">{rainLevel}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Air Quality</span>
          <span className={`text-sm px-2 py-1 rounded ${
            smokeLevel < 300 ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' :
            smokeLevel < 500 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400' :
            'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
          }`}>
            {smokeLevel < 300 ? 'Good' : smokeLevel < 500 ? 'Fair' : 'Poor'}
          </span>
        </div>
      </div>
    </div>
  )
}

// Activity Card Component
function ActivityCard() {
  const activities = [
    { time: '6:30 AM', action: 'Living Room Light turned on', status: 'auto' },
    { time: '7:15 AM', action: 'Kitchen Light activated', status: 'motion' },
    { time: '8:00 AM', action: 'Garage Door opened', status: 'manual' },
    { time: '8:30 AM', action: 'Fan speed set to Medium', status: 'temp' },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">📋 Activity</h3>

      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{activity.action}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</div>
            </div>
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
              {activity.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
