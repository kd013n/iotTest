import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get all garage control devices and their current state
    const { data: garageDevices, error } = await supabase
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
        ),
        systems (
          id,
          name,
          type
        )
      `)
      .in('type', ['servo_motor', 'ir_sensor'])
      .eq('systems.type', 'garage_control')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching garage control devices:', error)
      return NextResponse.json(
        { 
          error: error.message,
          details: 'Failed to fetch garage control devices from database'
        },
        { status: 500 }
      )
    }

    // Get latest IR sensor readings
    const irSensorIds = garageDevices
      .filter(device => device.type === 'ir_sensor')
      .map(device => device.id)

    let latestMotionReading = null
    if (irSensorIds.length > 0) {
      const { data: motionReadings, error: motionError } = await supabase
        .from('sensor_readings')
        .select('*')
        .in('device_id', irSensorIds)
        .eq('sensor_type', 'motion')
        .order('timestamp', { ascending: false })
        .limit(1)

      if (!motionError && motionReadings.length > 0) {
        latestMotionReading = motionReadings[0]
      }
    }

    // Get garage control system info
    const { data: garageSystem, error: systemError } = await supabase
      .from('systems')
      .select('*')
      .eq('type', 'garage_control')
      .single()

    return NextResponse.json({
      devices: garageDevices || [],
      latestMotionReading: latestMotionReading,
      system: garageSystem,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Garage control API error:', error)
    return NextResponse.json(
      { 
        error: error.message,
        details: 'Unexpected error in garage control API'
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { device_id, action, auto_mode, manual_override } = body

    // Validate required fields
    if (!device_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: device_id, action' },
        { status: 400 }
      )
    }

    // Get the garage door servo device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', device_id)
      .eq('type', 'servo_motor')
      .single()

    if (deviceError || !device) {
      return NextResponse.json(
        { error: 'Garage door servo device not found' },
        { status: 404 }
      )
    }

    // Prepare command data based on action
    let commandData = {
      action: action,
      timestamp: Date.now()
    }

    if (auto_mode !== undefined) {
      commandData.auto_mode = auto_mode
    }
    if (manual_override !== undefined) {
      commandData.manual_override = manual_override
    }

    // Create command in the queue
    const { data: newCommand, error: commandError } = await supabase
      .from('command_queue')
      .insert([{
        device_id,
        command_type: 'garage_control',
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
      console.error('Error creating garage command:', commandError)
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

    const { error: updateError } = await supabase
      .from('devices')
      .update({ 
        current_state: newState,
        last_updated: new Date().toISOString()
      })
      .eq('id', device_id)

    if (updateError) {
      console.error('Error updating device state:', updateError)
    }

    return NextResponse.json(newCommand, { status: 201 })

  } catch (error) {
    console.error('Garage control command creation error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// Update garage control status
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { device_id, door_state, auto_mode, motion_detected, sensor_location } = body

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
      door_state: door_state,
      auto_mode: auto_mode,
      motion_detected: motion_detected,
      sensor_location: sensor_location,
      last_updated: new Date().toISOString()
    }

    const { data: updatedDevice, error: updateError } = await supabase
      .from('devices')
      .update({ 
        current_state: newState,
        last_updated: new Date().toISOString()
      })
      .eq('id', device_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating garage control state:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedDevice)

  } catch (error) {
    console.error('Garage control status update error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
