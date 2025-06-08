import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Try to get the schema by attempting to insert with different field names
    const testDeviceId = "4e3548f3-b877-458c-918b-12ebb223bbaf"
    
    // Try different possible column names
    const possibleSchemas = [
      { device_id: testDeviceId, reading_value: 1000, sensor_type: "light", unit: "lux" },
      { device_id: testDeviceId, value: 1000, sensor_type: "light", unit: "lux" },
      { device_id: testDeviceId, reading: 1000, sensor_type: "light", unit: "lux" },
      { device_id: testDeviceId, sensor_value: 1000, sensor_type: "light", unit: "lux" },
      { device_id: testDeviceId, data: 1000, sensor_type: "light", unit: "lux" }
    ]
    
    const results = []
    
    for (let i = 0; i < possibleSchemas.length; i++) {
      try {
        const { data, error } = await supabase
          .from('sensor_readings')
          .insert([possibleSchemas[i]])
          .select()
          .single()
        
        if (!error) {
          results.push({
            schema: possibleSchemas[i],
            success: true,
            data: data
          })
          
          // Delete the test record
          await supabase
            .from('sensor_readings')
            .delete()
            .eq('id', data.id)
          
          break // Found working schema
        } else {
          results.push({
            schema: possibleSchemas[i],
            success: false,
            error: error.message
          })
        }
      } catch (err) {
        results.push({
          schema: possibleSchemas[i],
          success: false,
          error: err.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sensor schema test complete',
      results: results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Sensor schema test failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: 'Unexpected error during sensor schema test'
      },
      { status: 500 }
    )
  }
}
