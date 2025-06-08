import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('device_id')
    const status = searchParams.get('status') || 'pending'
    const limit = parseInt(searchParams.get('limit')) || 50

    let query = supabase
      .from('command_queue')
      .select(`
        id,
        device_id,
        command_type,
        command_data,
        status,
        priority,
        created_at,
        devices!inner (
          id,
          name,
          type
        )
      `)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit)

    if (deviceId) {
      query = query.eq('device_id', deviceId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: commands, error } = await query

    if (error) {
      console.error('Error fetching commands:', error)
      return NextResponse.json(
        { 
          error: error.message,
          details: 'Failed to fetch commands from database'
        },
        { status: 500 }
      )
    }

    return NextResponse.json(commands || [])

  } catch (error) {
    console.error('Commands GET API error:', error)
    return NextResponse.json(
      { 
        error: error.message,
        details: 'Unexpected error in commands API'
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { device_id, command_type, command_data, priority } = body

    // Validate required fields
    if (!device_id || !command_type || !command_data) {
      return NextResponse.json(
        { error: 'Missing required fields: device_id, command_type, command_data' },
        { status: 400 }
      )
    }

    // Insert new command
    const { data: newCommand, error: insertError } = await supabase
      .from('command_queue')
      .insert([{
        device_id,
        command_type,
        command_data,
        priority: priority || 1,
        status: 'pending',
        created_at: new Date().toISOString()
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
      console.error('Error creating command:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(newCommand, { status: 201 })

  } catch (error) {
    console.error('Command creation error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, status, executed_at, response_data } = body

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: id, status' },
        { status: 400 }
      )
    }

    const updateData = {
      status
    }

    if (executed_at) {
      updateData.executed_at = new Date().toISOString()
    }

    if (response_data) {
      updateData.response_data = response_data
    }

    const { data: updatedCommand, error: updateError } = await supabase
      .from('command_queue')
      .update(updateData)
      .eq('id', id)
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

    if (updateError) {
      console.error('Error updating command:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedCommand)

  } catch (error) {
    console.error('Command update error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
