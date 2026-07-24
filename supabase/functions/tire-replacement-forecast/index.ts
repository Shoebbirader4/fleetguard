/**
 * Tire Replacement Forecast Alert Generator
 * 
 * Task: 15.1 Implement tire management workflows
 * Requirements: 6.4, 6.5
 * 
 * This Edge Function generates tire replacement forecast alerts when tire wear rate
 * indicates replacement within 30 days or 5000 km.
 * 
 * Trigger: Cron job (daily) or manual invocation
 * 
 * Logic:
 * 1. Query all active tires across all tenants
 * 2. For each tire, calculate wear rate and replacement forecast
 * 3. If replacement needed within 30 days or 5000 km, generate alert
 * 4. Update tire's current_tread_depth from latest measurement
 * 5. Return summary of alerts generated
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TireForecast {
  tire_id: string;
  current_tread_depth: number;
  minimum_tread_depth: number;
  tread_remaining: number;
  wear_rate_mm_per_km: number;
  estimated_km_remaining: number;
  estimated_days_remaining: number;
  estimated_replacement_date: string;
  needs_replacement_soon: boolean;
  replacement_urgency: string;
}

interface TireInfo {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  position_identifier: string;
  brand: string;
  model: string;
  serial_number: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting tire replacement forecast alert generation...');

    // Get all active tires
    const { data: activeTires, error: tiresError } = await supabase
      .from('tires')
      .select('id, tenant_id, vehicle_id, position_identifier, brand, model, serial_number, current_tread_depth')
      .eq('status', 'active');

    if (tiresError) {
      console.error('Error fetching active tires:', tiresError);
      throw tiresError;
    }

    if (!activeTires || activeTires.length === 0) {
      console.log('No active tires found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active tires to process',
          alerts_created: 0,
          tires_processed: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${activeTires.length} active tires to process`);

    let alertsCreated = 0;
    let tiresProcessed = 0;
    const alertsToCreate: any[] = [];

    // Process each tire
    for (const tire of activeTires) {
      tiresProcessed++;

      try {
        // Update tire's current tread depth from latest measurement
        const { data: latestMeasurement } = await supabase
          .from('tread_depth_measurements')
          .select('tread_depth')
          .eq('tire_id', tire.id)
          .order('measurement_date', { ascending: false })
          .limit(1)
          .single();

        if (latestMeasurement) {
          await supabase
            .from('tires')
            .update({ current_tread_depth: latestMeasurement.tread_depth })
            .eq('id', tire.id);
        }

        // Get vehicle current odometer
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('current_odometer')
          .eq('id', tire.vehicle_id)
          .single();

        if (!vehicle) {
          console.warn(`Vehicle not found for tire ${tire.id}`);
          continue;
        }

        // Call replacement forecast function
        const { data: forecast, error: forecastError } = await supabase
          .rpc('calculate_tire_replacement_forecast', {
            p_tire_id: tire.id,
            p_current_odometer: vehicle.current_odometer,
          });

        if (forecastError) {
          console.error(`Error calculating forecast for tire ${tire.id}:`, forecastError);
          continue;
        }

        if (!forecast || forecast.length === 0) {
          console.log(`No forecast data for tire ${tire.id} (likely insufficient measurements)`);
          continue;
        }

        const tireForecast = forecast[0] as TireForecast;

        // Check if alert needed
        if (tireForecast.needs_replacement_soon) {
          // Check if alert already exists for this tire
          const { data: existingAlert } = await supabase
            .from('alerts')
            .select('id, status')
            .eq('alert_type', 'tire_replacement_forecast')
            .eq('vehicle_id', tire.vehicle_id)
            .eq('status', 'active')
            .contains('description', tire.position_identifier) // Rough check
            .limit(1)
            .single();

          if (existingAlert) {
            console.log(`Alert already exists for tire ${tire.id} at position ${tire.position_identifier}`);
            continue;
          }

          // Prepare alert
          const severity = tireForecast.replacement_urgency === 'critical' ? 'critical' :
                          tireForecast.replacement_urgency === 'high' ? 'high' :
                          tireForecast.replacement_urgency === 'medium' ? 'medium' : 'low';

          const tireDescription = tire.brand && tire.model 
            ? `${tire.brand} ${tire.model} (${tire.serial_number || 'no serial'})`
            : `Tire at ${tire.position_identifier}`;

          let description = `Tire replacement forecast: ${tireDescription} at position ${tire.position_identifier}. `;
          description += `Current tread: ${tireForecast.current_tread_depth}mm, `;
          description += `Minimum legal: ${tireForecast.minimum_tread_depth}mm. `;
          
          if (tireForecast.estimated_km_remaining !== null) {
            description += `Estimated ${tireForecast.estimated_km_remaining} km remaining. `;
          }
          
          if (tireForecast.estimated_days_remaining !== null) {
            description += `Estimated ${tireForecast.estimated_days_remaining} days remaining. `;
          }

          if (tireForecast.wear_rate_mm_per_km !== null) {
            description += `Wear rate: ${Math.abs(tireForecast.wear_rate_mm_per_km).toFixed(4)} mm/km. `;
          }

          if (tireForecast.estimated_replacement_date) {
            description += `Estimated replacement date: ${tireForecast.estimated_replacement_date}.`;
          }

          const alert = {
            tenant_id: tire.tenant_id,
            vehicle_id: tire.vehicle_id,
            alert_type: 'tire_replacement_forecast',
            severity: severity,
            title: `Tire Replacement Forecast - ${tire.position_identifier}`,
            description: description,
            status: 'active',
          };

          alertsToCreate.push(alert);
        }
      } catch (error) {
        console.error(`Error processing tire ${tire.id}:`, error);
        // Continue processing other tires
      }
    }

    // Batch create alerts
    if (alertsToCreate.length > 0) {
      const { data: createdAlerts, error: createError } = await supabase
        .from('alerts')
        .insert(alertsToCreate)
        .select('id');

      if (createError) {
        console.error('Error creating alerts:', createError);
        throw createError;
      }

      alertsCreated = createdAlerts?.length || 0;
      console.log(`Created ${alertsCreated} tire replacement forecast alerts`);
    }

    const result = {
      success: true,
      message: 'Tire replacement forecast alerts generated successfully',
      tires_processed: tiresProcessed,
      alerts_created: alertsCreated,
      timestamp: new Date().toISOString(),
    };

    console.log('Tire replacement forecast generation complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in tire replacement forecast function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
