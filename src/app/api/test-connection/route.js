import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test the connection by trying to access common tables
    // Let's try different table names that might exist
    const tablesToTest = ['boards', 'devices', 'rooms', 'sensor_readings', 'command_queue', 'users']
    const results = {}

    for (const tableName of tablesToTest) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        if (error) {
          results[tableName] = { exists: false, error: error.message }
        } else {
          results[tableName] = { exists: true, sampleCount: data?.length || 0 }
        }
      } catch (err) {
        results[tableName] = { exists: false, error: err.message }
      }
    }

    // Check if we found any existing tables
    const existingTables = Object.keys(results).filter(table => results[table].exists)

    if (existingTables.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No accessible tables found',
          details: 'Could not access any of the expected tables. Database might be empty or credentials might be incorrect.',
          tableTests: results
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Supabase database',
      existingTables: existingTables,
      tableDetails: results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Connection test failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: 'Unexpected error during connection test'
      },
      { status: 500 }
    )
  }
}
