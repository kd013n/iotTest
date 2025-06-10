'use client'

import { useState, useEffect } from 'react'

export default function ESP32BDashboard() {
  const [doorData, setDoorData] = useState(null)
  const [garageData, setGarageData] = useState(null)
  const [gasData, setGasData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch data from APIs
  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [doorResponse, garageResponse, gasResponse] = await Promise.all([
        fetch('/api/door-access'),
        fetch('/api/garage-control'),
        fetch('/api/gas-alarm')
      ])

      if (doorResponse.ok) {
        const doorResult = await doorResponse.json()
        setDoorData(doorResult)
      }

      if (garageResponse.ok) {
        const garageResult = await garageResponse.json()
        setGarageData(garageResult)
      }

      if (gasResponse.ok) {
        const gasResult = await gasResponse.json()
        setGasData(gasResult)
      }

      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Send command to API
  const sendCommand = async (endpoint, deviceId, commandData) => {
    try {
      const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id: deviceId,
          ...commandData
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Command sent:', result)
        // Refresh data after command
        setTimeout(fetchData, 1000)
      } else {
        console.error('Command failed:', response.statusText)
      }
    } catch (err) {
      console.error('Error sending command:', err)
    }
  }

  useEffect(() => {
    fetchData()
    // Refresh data every 5 seconds
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">ESP32-B Security Dashboard</h1>
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">ESP32-B Security Dashboard</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            Error: {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Door Access Control */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              🔐 Door Access Control
            </h2>
            
            {doorData && (
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  System: {doorData.system?.name || 'Unknown'}
                </div>
                
                <div className="space-y-2">
                  {doorData.devices?.filter(d => d.type === 'servo_motor').map(device => (
                    <div key={device.id} className="border rounded p-3">
                      <div className="font-medium">{device.name}</div>
                      <div className="text-sm text-gray-600">Pin: {device.pin_number}</div>
                      <div className="text-sm text-gray-600">
                        State: {device.current_state?.door_state || 'Unknown'}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const doorServo = doorData.devices?.find(d => d.type === 'servo_motor')
                      if (doorServo) {
                        sendCommand('door-access', doorServo.id, {
                          action: 'unlock',
                          access_code: '2309'
                        })
                      }
                    }}
                    className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Unlock Door (2309)
                  </button>
                  
                  <button
                    onClick={() => {
                      const doorServo = doorData.devices?.find(d => d.type === 'servo_motor')
                      if (doorServo) {
                        sendCommand('door-access', doorServo.id, {
                          action: 'lock'
                        })
                      }
                    }}
                    className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Lock System
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Garage Control */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              🚪 Garage Control
            </h2>
            
            {garageData && (
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  System: {garageData.system?.name || 'Unknown'}
                </div>
                
                <div className="space-y-2">
                  {garageData.devices?.filter(d => d.type === 'servo_motor').map(device => (
                    <div key={device.id} className="border rounded p-3">
                      <div className="font-medium">{device.name}</div>
                      <div className="text-sm text-gray-600">Pin: {device.pin_number}</div>
                      <div className="text-sm text-gray-600">
                        State: {device.current_state?.door_state || 'Unknown'}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {garageData.devices?.filter(d => d.type === 'ir_sensor').map(device => (
                    <div key={device.id} className="border rounded p-2">
                      <div className="text-sm font-medium">{device.name}</div>
                      <div className="text-xs text-gray-600">
                        Motion: {device.current_state?.detected ? 'Detected' : 'Clear'}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const garageServo = garageData.devices?.find(d => d.type === 'servo_motor')
                      if (garageServo) {
                        sendCommand('garage-control', garageServo.id, {
                          action: 'open'
                        })
                      }
                    }}
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Open Garage
                  </button>
                  
                  <button
                    onClick={() => {
                      const garageServo = garageData.devices?.find(d => d.type === 'servo_motor')
                      if (garageServo) {
                        sendCommand('garage-control', garageServo.id, {
                          action: 'close'
                        })
                      }
                    }}
                    className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Close Garage
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Gas Alarm System */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              🚨 Gas Detection
            </h2>
            
            {gasData && (
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  System: {gasData.system?.name || 'Unknown'}
                </div>
                
                <div className="space-y-2">
                  {gasData.devices?.filter(d => d.type === 'gas_sensor').map(device => (
                    <div key={device.id} className="border rounded p-3">
                      <div className="font-medium">{device.name}</div>
                      <div className="text-sm text-gray-600">Pin: {device.pin_number}</div>
                      <div className="text-sm text-gray-600">
                        Level: {device.current_state?.gas_level || 0} ppm
                      </div>
                      <div className={`text-sm font-medium ${
                        device.current_state?.alarm_active ? 'text-red-600' : 'text-green-600'
                      }`}>
                        Status: {device.current_state?.alarm_active ? 'ALARM!' : 'Normal'}
                      </div>
                    </div>
                  ))}
                </div>

                {gasData.latestGasReading && (
                  <div className="border rounded p-3 bg-gray-50">
                    <div className="text-sm font-medium">Latest Reading</div>
                    <div className="text-sm text-gray-600">
                      Value: {gasData.latestGasReading.value} {gasData.latestGasReading.unit}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(gasData.latestGasReading.timestamp).toLocaleString()}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const buzzer = gasData.devices?.find(d => d.type === 'buzzer')
                      if (buzzer) {
                        sendCommand('gas-alarm', buzzer.id, {
                          action: 'test_alarm'
                        })
                      }
                    }}
                    className="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                  >
                    Test Alarm
                  </button>
                  
                  <button
                    onClick={() => {
                      const buzzer = gasData.devices?.find(d => d.type === 'buzzer')
                      if (buzzer) {
                        sendCommand('gas-alarm', buzzer.id, {
                          action: 'silence_alarm'
                        })
                      }
                    }}
                    className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Silence Alarm
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={fetchData}
            className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  )
}
