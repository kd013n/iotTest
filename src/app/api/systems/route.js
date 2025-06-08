import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get all systems with their related data
    const { data: systems, error } = await supabase
      .from('systems')
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
      console.error('Error fetching systems:', error)
      return NextResponse.json(
        { 
          error: error.message,
          details: 'Failed to fetch systems from database'
        },
        { status: 500 }
      )
    }

    return NextResponse.json(systems || [])

  } catch (error) {
    console.error('Systems API error:', error)
    return NextResponse.json(
      { 
        error: error.message,
        details: 'Unexpected error in systems API'
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, type, description, board_id, room_id } = body

    // Validate required fields
    if (!name || !type || !board_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, board_id' },
        { status: 400 }
      )
    }

    // Create new system
    const { data: newSystem, error: insertError } = await supabase
      .from('systems')
      .insert([{
        name,
        type,
        description: description || null,
        board_id,
        room_id: room_id || null,
        is_active: true
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
      console.error('Error creating system:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(newSystem, { status: 201 })

  } catch (error) {
    console.error('System creation error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
