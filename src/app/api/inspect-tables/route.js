import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const results = {}

    // Get sample data from each existing table
    const tables = ['boards', 'devices', 'rooms', 'sensor_readings', 'command_queue', 'lighting_system', 'systems']
    
    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(3)
        
        if (error) {
          results[tableName] = { error: error.message }
        } else {
          results[tableName] = { 
            count: data?.length || 0,
            sampleData: data || [],
            columns: data && data.length > 0 ? Object.keys(data[0]) : []
          }
        }
      } catch (err) {
        results[tableName] = { error: err.message }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Table inspection complete',
      tables: results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Table inspection failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: 'Unexpected error during table inspection'
      },
      { status: 500 }
    )
  }
}
