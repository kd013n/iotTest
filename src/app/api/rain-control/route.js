import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get all rain detection devices and their current state
    const { data: rainDevices, error } = await supabase
      .from('devices')
      .select(`
        *,
        boards (
          id,
          name,
          board_type,
          status
        ),
        rooms (
          id,
          name,
          description
        )
      `)
      .in('type', ['rain_sensor', 'window_servo'])
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching rain control devices:', error)
      return NextResponse.json(
        { 
          error: error.message,
          details: 'Failed to fetch rain control devices from database'
        },
        { status: 500 }
      )
    }

    // Get latest rain sensor readings
    const rainSensorIds = rainDevices
      .filter(device => device.type === 'rain_sensor')
      .map(device => device.id)

    let latestRainReading = null
    if (rainSensorIds.length > 0) {
      const { data: rainReadings, error: rainError } = await supabase
        .from('sensor_readings')
        .select('*')
        .in('device_id', rainSensorIds)
        .eq('sensor_type', 'rain')
        .order('timestamp', { ascending: false })
        .limit(1)

      if (!rainError && rainReadings.length > 0) {
        latestRainReading = rainReadings[0]
      }
    }

    // Get rain detection system info
    const { data: rainSystem, error: systemError } = await supabase
      .from('systems')
      .select('*')
      .eq('type', 'rain_detection')
      .single()

    return NextResponse.json({
      devices: rainDevices || [],
      latestRainReading: latestRainReading,
      system: rainSystem,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Rain control API error:', error)
    return NextResponse.json(
      { 
        error: error.message,
        details: 'Unexpected error in rain control API'
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { device_id, action, mode, window_state } = body

    // Validate required fields
    if (!device_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: device_id, action' },
        { status: 400 }
      )
    }

    // Get the device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', device_id)
      .in('type', ['rain_sensor', 'window_servo'])
      .single()

    if (deviceError || !device) {
      return NextResponse.json(
        { error: 'Rain detection device not found' },
        { status: 404 }
      )
    }

    // Prepare command data based on action
    let commandData = {
      action: action,
      timestamp: Date.now()
    }

    if (action === 'set_mode') {
      // Switch between AUTO and MANUAL modes
      commandData.mode = mode // 'AUTO' or 'MANUAL'
    } else if (action === 'set_window_state') {
      // Manual window control (only in MANUAL mode)
      commandData.window_state = window_state // 'OPEN' or 'CLOSED'
      commandData.mode = 'MANUAL'
    } else if (action === 'emergency_close') {
      // Emergency close windows
      commandData.window_state = 'CLOSED'
      commandData.emergency = true
    } else if (action === 'emergency_open') {
      // Emergency open windows
      commandData.window_state = 'OPEN'
      commandData.emergency = true
    }

    // Create command in the queue
    const { data: newCommand, error: commandError } = await supabase
      .from('command_queue')
      .insert([{
        device_id,
        command_type: 'rain_control',
        command_data: commandData,
        priority: action.includes('emergency') ? 0 : 1, // Emergency commands have highest priority
        status: 'pending'
      }])
      .select(`
        *,
        devices (
          id,
          name,
          type,
          pin_number
        )
      `)
      .single()

    if (commandError) {
      console.error('Error creating rain command:', commandError)
      return NextResponse.json(
        { error: commandError.message },
        { status: 500 }
      )
    }

    // Update device current state
    const newState = {
      ...device.current_state,
      last_command: action,
      last_updated: new Date().toISOString()
    }

    if (commandData.mode !== undefined) {
      newState.mode = commandData.mode
    }
    if (commandData.window_state !== undefined) {
      newState.window_state = commandData.window_state
    }

    await supabase
      .from('devices')
      .update({ current_state: newState })
      .eq('id', device_id)

    return NextResponse.json(newCommand, { status: 201 })

  } catch (error) {
    console.error('Rain control command creation error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// Update rain sensor status and window positions
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { device_id, rain_level, rain_reading, window_state, mode, dry_count } = body

    if (!device_id) {
      return NextResponse.json(
        { error: 'Missing required field: device_id' },
        { status: 400 }
      )
    }

    // Update device current state
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('current_state')
      .eq('id', device_id)
      .single()

    if (deviceError) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      )
    }

    const newState = {
      ...device.current_state,
      last_updated: new Date().toISOString()
    }

    // Update rain sensor data
    if (rain_level !== undefined) newState.rain_level = rain_level
    if (rain_reading !== undefined) newState.last_reading = rain_reading
    if (window_state !== undefined) newState.window_state = window_state
    if (mode !== undefined) newState.mode = mode
    if (dry_count !== undefined) newState.dry_count = dry_count

    const { error: updateError } = await supabase
      .from('devices')
      .update({ 
        current_state: newState,
        is_online: true
      })
      .eq('id', device_id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Rain detection status updated',
      current_state: newState
    })

  } catch (error) {
    console.error('Rain status update error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
