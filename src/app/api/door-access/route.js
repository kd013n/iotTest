import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get all door access devices and their current state
    const { data: doorDevices, error } = await supabase
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
      .in('type', ['servo_motor', 'keypad_row', 'lcd_display'])
      .eq('systems.type', 'door_access')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching door access devices:', error)
      return NextResponse.json(
        { 
          error: error.message,
          details: 'Failed to fetch door access devices from database'
        },
        { status: 500 }
      )
    }

    // Get door access system info
    const { data: doorSystem, error: systemError } = await supabase
      .from('systems')
      .select('*')
      .eq('type', 'door_access')
      .single()

    return NextResponse.json({
      devices: doorDevices || [],
      system: doorSystem,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Door access API error:', error)
    return NextResponse.json(
      { 
        error: error.message,
        details: 'Unexpected error in door access API'
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { device_id, action, access_code, manual_override } = body

    // Validate required fields
    if (!device_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: device_id, action' },
        { status: 400 }
      )
    }

    // Get the door servo device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', device_id)
      .eq('type', 'servo_motor')
      .single()

    if (deviceError || !device) {
      return NextResponse.json(
        { error: 'Door servo device not found' },
        { status: 404 }
      )
    }

    // Prepare command data based on action
    let commandData = {
      action: action,
      timestamp: Date.now()
    }

    if (action === 'unlock' && access_code) {
      commandData.access_code = access_code
    }
    if (manual_override !== undefined) {
      commandData.manual_override = manual_override
    }

    // Create command in the queue
    const { data: newCommand, error: commandError } = await supabase
      .from('command_queue')
      .insert([{
        device_id,
        command_type: 'door_control',
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
      console.error('Error creating door command:', commandError)
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

    if (action === 'unlock') {
      newState.access_requested = true
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
    console.error('Door access command creation error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// Update door access status
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { device_id, door_state, access_attempts, system_locked } = body

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
      access_attempts: access_attempts,
      system_locked: system_locked,
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
      console.error('Error updating door access state:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedDevice)

  } catch (error) {
    console.error('Door access status update error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
