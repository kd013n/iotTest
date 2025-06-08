import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get the latest sensor readings for each device
    const { data: sensorReadings, error } = await supabase
      .from('sensor_readings')
      .select(`
        *,
        devices (
          id,
          name,
          type,
          pin_number,
          boards (
            id,
            name,
            board_type
          )
        )
      `)
      .order('timestamp', { ascending: false })

    if (error) {
      console.error('Error fetching sensor readings:', error)
      return NextResponse.json(
        { 
          error: error.message,
          details: 'Failed to fetch sensor readings from database'
        },
        { status: 500 }
      )
    }

    // Group by device_id and get the latest reading for each device
    const latestReadings = {}
    sensorReadings?.forEach(reading => {
      if (!latestReadings[reading.device_id] || 
          new Date(reading.timestamp) > new Date(latestReadings[reading.device_id].timestamp)) {
        latestReadings[reading.device_id] = reading
      }
    })

    return NextResponse.json(Object.values(latestReadings))

  } catch (error) {
    console.error('Sensors API error:', error)
    return NextResponse.json(
      { 
        error: error.message,
        details: 'Unexpected error in sensors API'
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { device_id, sensor_type, reading_value, value, unit } = body

    // Support both reading_value and value for compatibility
    const sensorValue = reading_value !== undefined ? reading_value : value

    // Validate required fields
    if (!device_id || !sensor_type || sensorValue === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: device_id, sensor_type, value (or reading_value)' },
        { status: 400 }
      )
    }

    // Insert new sensor reading
    const { data: newReading, error: insertError } = await supabase
      .from('sensor_readings')
      .insert([{
        device_id,
        sensor_type,
        value: sensorValue,
        unit: unit || null
      }])
      .select(`
        *,
        devices (
          id,
          name,
          type,
          pin_number,
          boards (
            id,
            name,
            board_type
          )
        )
      `)
      .single()

    if (insertError) {
      console.error('Error creating sensor reading:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(newReading, { status: 201 })

  } catch (error) {
    console.error('Sensor reading creation error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
