import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get all gas alarm devices and their current state
    const { data: gasDevices, error } = await supabase
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
      .in('type', ['gas_sensor', 'buzzer'])
      .eq('systems.type', 'smoke_alarm')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching gas alarm devices:', error)
      return NextResponse.json(
        { 
          error: error.message,
          details: 'Failed to fetch gas alarm devices from database'
        },
        { status: 500 }
      )
    }

    // Get latest gas sensor readings
    const gasSensorIds = gasDevices
      .filter(device => device.type === 'gas_sensor')
      .map(device => device.id)

    let latestGasReading = null
    if (gasSensorIds.length > 0) {
      const { data: gasReadings, error: gasError } = await supabase
        .from('sensor_readings')
        .select('*')
        .in('device_id', gasSensorIds)
        .eq('sensor_type', 'smoke')
        .order('timestamp', { ascending: false })
        .limit(1)

      if (!gasError && gasReadings.length > 0) {
        latestGasReading = gasReadings[0]
      }
    }

    // Get smoke alarm system info
    const { data: smokeSystem, error: systemError } = await supabase
      .from('systems')
      .select('*')
      .eq('type', 'smoke_alarm')
      .single()

    return NextResponse.json({
      devices: gasDevices || [],
      latestSmokeReading: latestGasReading,
      system: smokeSystem,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Gas alarm API error:', error)
    return NextResponse.json(
      { 
        error: error.message,
        details: 'Unexpected error in gas alarm API'
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { device_id, action, gas_threshold, alarm_duration } = body

    // Validate required fields
    if (!device_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: device_id, action' },
        { status: 400 }
      )
    }

    // Get the gas sensor or buzzer device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', device_id)
      .in('type', ['gas_sensor', 'buzzer'])
      .single()

    if (deviceError || !device) {
      return NextResponse.json(
        { error: 'Gas alarm device not found' },
        { status: 404 }
      )
    }

    // Prepare command data based on action
    let commandData = {
      action: action,
      timestamp: Date.now()
    }

    if (gas_threshold !== undefined) {
      commandData.gas_threshold = gas_threshold
    }
    if (alarm_duration !== undefined) {
      commandData.alarm_duration = alarm_duration
    }

    // Create command in the queue
    const { data: newCommand, error: commandError } = await supabase
      .from('command_queue')
      .insert([{
        device_id,
        command_type: 'gas_alarm_control',
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
      console.error('Error creating gas alarm command:', commandError)
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

    if (commandData.gas_threshold !== undefined) {
      newState.gas_threshold = commandData.gas_threshold
    }
    if (commandData.alarm_duration !== undefined) {
      newState.alarm_duration = commandData.alarm_duration
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
    console.error('Gas alarm command creation error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// Update gas alarm status
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { device_id, gas_level, alarm_active, buzzer_active, threshold_exceeded } = body

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
      gas_level: gas_level,
      alarm_active: alarm_active,
      buzzer_active: buzzer_active,
      threshold_exceeded: threshold_exceeded,
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
      console.error('Error updating gas alarm state:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedDevice)

  } catch (error) {
    console.error('Gas alarm status update error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
