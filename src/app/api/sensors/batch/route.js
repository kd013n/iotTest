import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { readings } = body

    // Validate required fields
    if (!readings || !Array.isArray(readings) || readings.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: readings (array)' },
        { status: 400 }
      )
    }

    // Validate each reading
    const validReadings = []
    for (const reading of readings) {
      const { device_id, sensor_type, value } = reading
      
      if (!device_id || !sensor_type || value === undefined) {
        continue // Skip invalid readings
      }
      
      validReadings.push({
        device_id,
        sensor_type,
        value,
        unit: reading.unit || null
      })
    }

    if (validReadings.length === 0) {
      return NextResponse.json(
        { error: 'No valid readings found' },
        { status: 400 }
      )
    }

    // Insert all readings in one batch operation
    const { data: newReadings, error: insertError } = await supabase
      .from('sensor_readings')
      .insert(validReadings)
      .select(`
        *,
        devices (
          id,
          name,
          type,
          pin_number
        )
      `)

    if (insertError) {
      console.error('Error creating batch sensor readings:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: newReadings.length,
      readings: newReadings
    }, { status: 201 })

  } catch (error) {
    console.error('Batch sensor reading creation error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
