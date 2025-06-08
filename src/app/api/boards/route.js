import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get all boards with their devices
    const { data: boards, error } = await supabase
      .from('boards')
      .select(`
        *,
        devices (
          id,
          name,
          type,
          pin_number,
          pin_type,
          properties,
          current_state,
          is_online,
          created_at
        )
      `)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching boards:', error)
      return NextResponse.json(
        { 
          error: error.message,
          details: 'Failed to fetch boards from database'
        },
        { status: 500 }
      )
    }

    return NextResponse.json(boards || [])

  } catch (error) {
    console.error('Boards API error:', error)
    return NextResponse.json(
      { 
        error: error.message,
        details: 'Unexpected error in boards API'
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, board_type, mac_address, ip_address, total_pins, available_pins } = body

    // Validate required fields
    if (!name || !board_type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, board_type' },
        { status: 400 }
      )
    }

    // Check for duplicate MAC address if provided
    if (mac_address) {
      const { data: existingBoard, error: duplicateError } = await supabase
        .from('boards')
        .select('id, name')
        .eq('mac_address', mac_address)
        .single()

      if (duplicateError && duplicateError.code !== 'PGRST116') {
        console.error('Error checking MAC address:', duplicateError)
        return NextResponse.json(
          { error: 'Failed to check MAC address uniqueness' },
          { status: 500 }
        )
      }

      if (existingBoard) {
        return NextResponse.json(
          { error: `MAC address ${mac_address} is already registered to board: ${existingBoard.name}` },
          { status: 409 }
        )
      }
    }

    // Create new board
    const { data: newBoard, error: insertError } = await supabase
      .from('boards')
      .insert([{
        name,
        board_type,
        mac_address: mac_address || null,
        ip_address: ip_address || null,
        status: 'offline',
        total_pins: total_pins || 30,
        available_pins: available_pins || [],
        last_seen: new Date().toISOString()
      }])
      .select(`
        *,
        devices (
          id,
          name,
          type,
          pin_number,
          pin_type,
          properties,
          current_state,
          is_online,
          created_at
        )
      `)
      .single()

    if (insertError) {
      console.error('Error creating board:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(newBoard, { status: 201 })

  } catch (error) {
    console.error('Board creation error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
