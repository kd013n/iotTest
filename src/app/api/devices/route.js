import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get all devices with their board and room information
    const { data: devices, error } = await supabase
      .from('devices')
      .select(`
        *,
        boards (
          id,
          name,
          board_type,
          status,
          available_pins
        ),
        rooms (
          id,
          name,
          description
        )
      `)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching devices:', error)
      return NextResponse.json(
        { 
          error: error.message,
          details: 'Failed to fetch devices from database'
        },
        { status: 500 }
      )
    }

    return NextResponse.json(devices || [])

  } catch (error) {
    console.error('Devices API error:', error)
    return NextResponse.json(
      { 
        error: error.message,
        details: 'Unexpected error in devices API'
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { board_id, room_id, name, type, pin_number, pin_type, properties } = body

    // Validate required fields
    if (!board_id || !name || !type || pin_number === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: board_id, name, type, pin_number' },
        { status: 400 }
      )
    }

    // Check for pin conflicts on the same board
    const { data: existingDevice, error: conflictError } = await supabase
      .from('devices')
      .select('id, name')
      .eq('board_id', board_id)
      .eq('pin_number', pin_number)
      .single()

    if (conflictError && conflictError.code !== 'PGRST116') {
      console.error('Error checking pin conflicts:', conflictError)
      return NextResponse.json(
        { error: 'Failed to check pin conflicts' },
        { status: 500 }
      )
    }

    if (existingDevice) {
      return NextResponse.json(
        { error: `Pin ${pin_number} is already in use by device: ${existingDevice.name}` },
        { status: 409 }
      )
    }

    // Create new device
    const { data: newDevice, error: insertError } = await supabase
      .from('devices')
      .insert([{
        board_id,
        room_id: room_id || null,
        name,
        type,
        pin_number,
        pin_type: pin_type || 'digital',
        properties: properties || {},
        current_state: {},
        is_online: false
      }])
      .select(`
        *,
        boards (
          id,
          name,
          board_type,
          status,
          available_pins
        ),
        rooms (
          id,
          name,
          description
        )
      `)
      .single()

    if (insertError) {
      console.error('Error creating device:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(newDevice, { status: 201 })

  } catch (error) {
    console.error('Device creation error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
