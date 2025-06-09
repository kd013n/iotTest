import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get all fan control devices and their current state
    const { data: fanDevices, error } = await supabase
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
      .in('type', ['fan_motor', 'temperature_sensor'])
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching fan control devices:', error)
      return NextResponse.json(
        { 
          error: error.message,
          details: 'Failed to fetch fan control devices from database'
        },
        { status: 500 }
      )
    }

    // Get latest temperature readings
    const tempSensorIds = fanDevices
      .filter(device => device.type === 'temperature_sensor')
      .map(device => device.id)

    let latestTemperature = null
    if (tempSensorIds.length > 0) {
      const { data: tempReadings, error: tempError } = await supabase
        .from('sensor_readings')
        .select('*')
        .in('device_id', tempSensorIds)
        .eq('sensor_type', 'temperature')
        .order('timestamp', { ascending: false })
        .limit(1)

      if (!tempError && tempReadings.length > 0) {
        latestTemperature = tempReadings[0]
      }
    }

    return NextResponse.json({
      devices: fanDevices || [],
      latestTemperature: latestTemperature,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Fan control API error:', error)
    return NextResponse.json(
      { 
        error: error.message,
        details: 'Unexpected error in fan control API'
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { device_id, action, speed, auto_mode, target_temperature } = body

    // Validate required fields
    if (!device_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: device_id, action' },
        { status: 400 }
      )
    }

    // Get the fan motor device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', device_id)
      .eq('type', 'fan_motor')
      .single()

    if (deviceError || !device) {
      return NextResponse.json(
        { error: 'Fan motor device not found' },
        { status: 404 }
      )
    }

    // Prepare command data based on action
    let commandData = {
      action: action,
      timestamp: Date.now()
    }

    if (action === 'set_speed' && speed !== undefined) {
      // Manual speed control (0-3)
      commandData.speed = parseInt(speed)
      commandData.auto_mode = false
    } else if (action === 'set_auto') {
      // Switch to auto mode
      commandData.auto_mode = true
      if (target_temperature !== undefined) {
        commandData.target_temperature = parseFloat(target_temperature)
      }
    } else if (action === 'set_manual') {
      // Switch to manual mode
      commandData.auto_mode = false
      if (speed !== undefined) {
        commandData.speed = parseInt(speed)
      }
    }

    // Create command in the queue
    const { data: newCommand, error: commandError } = await supabase
      .from('command_queue')
      .insert([{
        device_id,
        command_type: 'fan_control',
        command_data: commandData,
        priority: 1,
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
      console.error('Error creating fan command:', commandError)
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

    if (commandData.auto_mode !== undefined) {
      newState.auto_mode = commandData.auto_mode
    }
    if (commandData.speed !== undefined) {
      newState.manual_speed = commandData.speed
    }
    if (commandData.target_temperature !== undefined) {
      newState.target_temperature = commandData.target_temperature
    }

    await supabase
      .from('devices')
      .update({ current_state: newState })
      .eq('id', device_id)

    return NextResponse.json(newCommand, { status: 201 })

  } catch (error) {
    console.error('Fan control command creation error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// Get fan control status
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { device_id, current_speed, current_temperature, auto_mode } = body

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
      current_speed: current_speed,
      current_temperature: current_temperature,
      auto_mode: auto_mode,
      last_updated: new Date().toISOString()
    }

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
      message: 'Fan status updated',
      current_state: newState
    })

  } catch (error) {
    console.error('Fan status update error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
