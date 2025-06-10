'use client'

import { useState, useEffect } from 'react'

export default function UnifiedDashboard() {
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

  const getSensorValue = (deviceId, sensorType) => {
    const sensor = sensors.find(s => s.device_id === deviceId && s.sensor_type === sensorType)
    return sensor ? (sensor.value || sensor.reading_value) : null
  }

  const getTemperature = () => {
    return fanData?.latestTemperature?.value || 0
  }

  const getHumidity = () => {
    // Mock humidity for now - you can add actual humidity sensor later
    return 40
  }

  const getRainLevel = () => {
    return rainData?.latestRainReading?.value || 0
  }

  const getGasLevel = () => {
    return smokeData?.latestSmokeReading?.value || 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gray-900 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-xl font-bold">🏠 hommii</div>
          </div>
          <div className="text-sm">0</div>
        </div>
      </header>

      {/* Room Navigation */}
      <div className="bg-white border-b">
        <div className="flex items-center p-4">
          <span className="text-gray-600 mr-4">My Home 🏠</span>
          <div className="flex space-x-6">
            {rooms.map(room => (
              <button
                key={room}
                onClick={() => setActiveRoom(room)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeRoom === room 
                    ? 'bg-blue-100 text-blue-600 font-medium' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {room}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Room Controls */}
          <div className="lg:col-span-2 space-y-6">
            {activeRoom === 'Living Room' && <LivingRoomControls 
              devices={devices} 
              sensors={sensors} 
              fanData={fanData}
              sendCommand={sendCommand}
              getSensorValue={getSensorValue}
            />}
            {activeRoom === 'Kitchen' && <KitchenControls 
              devices={devices} 
              sensors={sensors}
              sendCommand={sendCommand}
              getSensorValue={getSensorValue}
            />}
            {activeRoom === 'Garage' && <GarageControls 
              devices={devices} 
              sensors={sensors}
              garageData={garageData}
              doorData={doorData}
              smokeData={smokeData}
              sendCommand={sendCommand}
              getSensorValue={getSensorValue}
            />}
          </div>

          {/* Right Column - Environmental Data */}
          <div className="space-y-6">
            <EnvironmentalCard 
              temperature={getTemperature()}
              humidity={getHumidity()}
              rainLevel={getRainLevel()}
              gasLevel={getGasLevel()}
            />
            <ActivityCard />
          </div>
        </div>
      </div>
    </div>
  )
}

// Living Room Controls Component
function LivingRoomControls({ devices, sensors, fanData, sendCommand, getSensorValue }) {
  const rgbDevice = devices.find(d => d.type === 'rgb_led_channel' && d.name.includes('Red'))
  const fanDevice = fanData?.devices?.find(d => d.type === 'fan_motor')
  const tempSensor = fanData?.devices?.find(d => d.type === 'temperature_sensor')
  
  return (
    <div className="space-y-6">
      {/* Ambient Light Control */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">💡 Ambient Light</h3>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-orange-400 rounded-full"></span>
            <span className="text-sm text-gray-600">On</span>
          </div>
        </div>
        <div className="text-sm text-gray-500 mb-4">Natural Device Color</div>
        
        <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => rgbDevice && sendCommand('commands', rgbDevice.id, {
              command_type: 'rgb_control',
              command_data: { mode: 'fade', preset: 'sunset' }
            })}
            className="bg-orange-100 text-orange-600 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Sunset
          </button>
          <button 
            onClick={() => rgbDevice && sendCommand('commands', rgbDevice.id, {
              command_type: 'rgb_control', 
              command_data: { mode: 'fade', preset: 'forest' }
            })}
            className="bg-green-100 text-green-600 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Forest
          </button>
          <button 
            onClick={() => rgbDevice && sendCommand('commands', rgbDevice.id, {
              command_type: 'rgb_control',
              command_data: { mode: 'fade', preset: 'midnight' }
            })}
            className="bg-blue-100 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Midnight
          </button>
        </div>
      </div>

      {/* Fan Control */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">🌀 Ceiling Fan</h3>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
            <span className="text-sm text-gray-600">Auto</span>
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
              className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm"
            >
              {speed}
            </button>
          ))}
        </div>
      </div>

      {/* Ground Detector */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">🌧️ Rain Sensor</h3>
          <span className="text-sm bg-green-100 text-green-600 px-2 py-1 rounded">Normal</span>
        </div>
        <div className="text-sm text-gray-500">Window Control: Auto</div>
      </div>
    </div>
  )
}

// Kitchen Controls Component  
function KitchenControls({ devices, sendCommand, getSensorValue }) {
  const kitchenLed = devices.find(d => d.type === 'led' && d.name.includes('Kitchen'))
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">💡 Kitchen Light</h3>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-green-400 rounded-full"></span>
            <span className="text-sm text-gray-600">Auto</span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => kitchenLed && sendCommand('commands', kitchenLed.id, {
              command_type: 'led_control',
              command_data: { action: 'on', manual_override: true }
            })}
            className="bg-green-100 text-green-600 px-4 py-2 rounded-lg text-sm font-medium"
          >
            On
          </button>
          <button 
            onClick={() => kitchenLed && sendCommand('commands', kitchenLed.id, {
              command_type: 'led_control',
              command_data: { action: 'off', manual_override: true }
            })}
            className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Off
          </button>
          <button 
            onClick={() => kitchenLed && sendCommand('commands', kitchenLed.id, {
              command_type: 'led_control',
              command_data: { action: 'auto', manual_override: false }
            })}
            className="bg-blue-100 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium"
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
  const smokeDevice = smokeData?.devices?.find(d => d.type === 'gas_sensor')

  return (
    <div className="space-y-6">
      {/* Garage Light */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">💡 Garage Light</h3>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
            <span className="text-sm text-gray-600">Auto</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => garageLed && sendCommand('commands', garageLed.id, {
              command_type: 'led_control',
              command_data: { action: 'on', manual_override: true }
            })}
            className="bg-green-100 text-green-600 px-4 py-2 rounded-lg text-sm font-medium"
          >
            On
          </button>
          <button
            onClick={() => garageLed && sendCommand('commands', garageLed.id, {
              command_type: 'led_control',
              command_data: { action: 'off', manual_override: true }
            })}
            className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Off
          </button>
          <button
            onClick={() => garageLed && sendCommand('commands', garageLed.id, {
              command_type: 'led_control',
              command_data: { action: 'auto', manual_override: false }
            })}
            className="bg-blue-100 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Auto
          </button>
        </div>
      </div>

      {/* Main Door Access */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">🔐 Main Door</h3>
          <span className="text-sm bg-red-100 text-red-600 px-2 py-1 rounded">Locked</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => doorServo && sendCommand('door-access', doorServo.id, {
              action: 'unlock',
              access_code: '2309'
            })}
            className="bg-green-100 text-green-600 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Unlock
          </button>
          <button
            onClick={() => doorServo && sendCommand('door-access', doorServo.id, {
              action: 'lock'
            })}
            className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Lock
          </button>
        </div>
      </div>

      {/* Garage Door Control */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">🚪 Garage Door</h3>
          <span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded">Closed</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => garageServo && sendCommand('garage-control', garageServo.id, {
              action: 'open'
            })}
            className="bg-blue-100 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Open
          </button>
          <button
            onClick={() => garageServo && sendCommand('garage-control', garageServo.id, {
              action: 'close'
            })}
            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>

      {/* Smoke Detector */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">🚨 Smoke Detector</h3>
          <span className="text-sm bg-green-100 text-green-600 px-2 py-1 rounded">Normal</span>
        </div>
        <div className="text-sm text-gray-500">
          Level: {smokeData?.latestSmokeReading?.value || 0} ppm
        </div>
      </div>
    </div>
  )
}

// Environmental Card Component
function EnvironmentalCard({ temperature, humidity, rainLevel, gasLevel }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-medium mb-4">🌡️ Environment</h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Temperature</span>
          <span className="text-lg font-medium">{temperature}°C</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Humidity</span>
          <span className="text-lg font-medium">{humidity}%</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Rain Level</span>
          <span className="text-lg font-medium">{rainLevel}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Air Quality</span>
          <span className={`text-sm px-2 py-1 rounded ${
            gasLevel < 300 ? 'bg-green-100 text-green-600' :
            gasLevel < 500 ? 'bg-yellow-100 text-yellow-600' :
            'bg-red-100 text-red-600'
          }`}>
            {gasLevel < 300 ? 'Good' : gasLevel < 500 ? 'Fair' : 'Poor'}
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
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-medium mb-4">📋 Activity</h3>

      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
            <div className="flex-1">
              <div className="text-sm font-medium">{activity.action}</div>
              <div className="text-xs text-gray-500">{activity.time}</div>
            </div>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {activity.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
