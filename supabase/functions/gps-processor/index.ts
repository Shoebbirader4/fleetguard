/**
 * GPS Processor Edge Function
 * 
 * Processes GPS telemetry webhooks from GPS devices.
 * 
 * Requirements:
 * - 19.1: Integrate with GPS devices to receive real-time location data
 * - 19.3: Update vehicle location within 30 seconds
 * - 19.4: Store GPS location history
 * - 19.6: Calculate distance traveled from GPS telemetry
 * - 4.6: Validate odometer against previous readings
 * 
 * Input (GPS Telemetry):
 * {
 *   device_id: string,
 *   timestamp: string (ISO 8601),
 *   latitude: number,
 *   longitude: number,
 *   speed: number, // km/h
 *   heading: number, // degrees
 *   odometer?: number, // optional - if device provides it
 *   ignition_status?: 'on' | 'off'
 * }
 * 
 * Output:
 * {
 *   success: boolean,
 *   vehicle_id?: string,
 *   location_updated: boolean,
 *   odometer_updated: boolean,
 *   validation_result?: {
 *     valid: boolean,
 *     anomaly_flag: boolean,
 *     reason?: string
 *   }
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  corsPreflightResponse,
  successResponse,
} from '../_shared/auth-middleware.ts';

// ============================================================================
// Types
// ============================================================================

interface GPSTelemetry {
  device_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number; // km/h
  heading: number; // degrees (0-360)
  odometer?: number; // optional - if device provides it
  ignition_status?: 'on' | 'off';
}

interface GPSProcessorResponse {
  success: boolean;
  vehicle_id?: string;
  location_updated: boolean;
  odometer_updated: boolean;
  distance_calculated?: number;
  validation_result?: {
    valid: boolean;
    anomaly_flag: boolean;
    reason?: string;
  };
  error?: string;
}

interface Vehicle {
  id: string;
  tenant_id: string;
  current_odometer: number;
  last_location: string | null; // PostGIS POINT format
  last_gps_update: string | null;
}

// ============================================================================
// Geospatial Functions
// ============================================================================

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * 
 * @param lat1 - Latitude of point 1 (degrees)
 * @param lon1 - Longitude of point 1 (degrees)
 * @param lat2 - Latitude of point 2 (degrees)
 * @param lon2 - Longitude of point 2 (degrees)
 * @returns Distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Parse PostGIS POINT format to lat/lon
 * Format: "POINT(longitude latitude)" or "(longitude,latitude)"
 */
function parsePoint(point: string | null): { lat: number; lon: number } | null {
  if (!point) return null;

  // Try PostGIS format: POINT(lon lat)
  const postgisMatch = point.match(/POINT\s*\(\s*([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)\s*\)/i);
  if (postgisMatch) {
    return {
      lon: parseFloat(postgisMatch[1]),
      lat: parseFloat(postgisMatch[2]),
    };
  }

  // Try simple format: (lon,lat)
  const simpleMatch = point.match(/\(\s*([+-]?\d+\.?\d*)\s*,\s*([+-]?\d+\.?\d*)\s*\)/);
  if (simpleMatch) {
    return {
      lon: parseFloat(simpleMatch[1]),
      lat: parseFloat(simpleMatch[2]),
    };
  }

  return null;
}

// ============================================================================
// Database Functions
// ============================================================================

/**
 * Find vehicle by GPS device ID
 */
async function findVehicleByDeviceId(
  supabase: any,
  deviceId: string
): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, tenant_id, current_odometer, last_location, last_gps_update')
    .eq('gps_device_id', deviceId)
    .eq('status', 'active')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No vehicle found
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Update vehicle location and GPS metadata
 */
async function updateVehicleLocation(
  supabase: any,
  vehicleId: string,
  tenantId: string,
  latitude: number,
  longitude: number,
  timestamp: string
): Promise<void> {
  // PostGIS POINT format: POINT(longitude latitude)
  const pointWKT = `POINT(${longitude} ${latitude})`;

  const { error } = await supabase
    .from('vehicles')
    .update({
      last_location: pointWKT,
      last_gps_update: timestamp,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vehicleId)
    .eq('tenant_id', tenantId);

  if (error) {
    throw error;
  }
}

/**
 * Insert GPS history record
 */
async function insertGPSHistory(
  supabase: any,
  vehicleId: string,
  tenantId: string,
  telemetry: GPSTelemetry
): Promise<void> {
  const { error } = await supabase
    .from('gps_history')
    .insert({
      tenant_id: tenantId,
      vehicle_id: vehicleId,
      timestamp: telemetry.timestamp,
      latitude: telemetry.latitude,
      longitude: telemetry.longitude,
      speed: telemetry.speed,
      heading: telemetry.heading,
      ignition_status: telemetry.ignition_status || null,
    });

  if (error) {
    throw error;
  }
}

/**
 * Call odometer-validator Edge Function
 */
async function validateOdometer(
  vehicleId: string,
  reading: number,
  timestamp: string,
  token: string
): Promise<any> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const functionUrl = `${supabaseUrl}/functions/v1/odometer-validator`;

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vehicle_id: vehicleId,
      reading: reading,
      timestamp: timestamp,
      source: 'gps',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Odometer validation failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate GPS telemetry data
 */
function validateTelemetry(telemetry: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!telemetry.device_id || typeof telemetry.device_id !== 'string') {
    errors.push('device_id is required and must be a string');
  }

  if (!telemetry.timestamp) {
    errors.push('timestamp is required');
  } else {
    const date = new Date(telemetry.timestamp);
    if (isNaN(date.getTime())) {
      errors.push('timestamp must be a valid ISO 8601 date string');
    }
  }

  if (typeof telemetry.latitude !== 'number' || telemetry.latitude < -90 || telemetry.latitude > 90) {
    errors.push('latitude must be a number between -90 and 90');
  }

  if (typeof telemetry.longitude !== 'number' || telemetry.longitude < -180 || telemetry.longitude > 180) {
    errors.push('longitude must be a number between -180 and 180');
  }

  if (typeof telemetry.speed !== 'number' || telemetry.speed < 0) {
    errors.push('speed must be a non-negative number');
  }

  if (typeof telemetry.heading !== 'number' || telemetry.heading < 0 || telemetry.heading > 360) {
    errors.push('heading must be a number between 0 and 360');
  }

  if (telemetry.odometer !== undefined) {
    if (typeof telemetry.odometer !== 'number' || telemetry.odometer < 0) {
      errors.push('odometer (if provided) must be a non-negative number');
    }
  }

  if (telemetry.ignition_status !== undefined) {
    if (!['on', 'off'].includes(telemetry.ignition_status)) {
      errors.push('ignition_status (if provided) must be "on" or "off"');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    // Step 1: Validate HTTP method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Parse request body
    const telemetry: GPSTelemetry = await req.json();

    console.log('[GPS Processor] Received telemetry:', {
      device_id: telemetry.device_id,
      timestamp: telemetry.timestamp,
      latitude: telemetry.latitude,
      longitude: telemetry.longitude,
    });

    // Step 3: Validate telemetry data
    const validation = validateTelemetry(telemetry);
    if (!validation.valid) {
      console.warn('[GPS Processor] Validation failed:', validation.errors);
      return new Response(
        JSON.stringify({
          error: 'Invalid telemetry data',
          details: validation.errors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Create Supabase client with service role (webhook doesn't have user JWT)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[GPS Processor] Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 5: Find vehicle by GPS device ID (Requirement 19.1)
    console.log('[GPS Processor] Looking up vehicle for device:', telemetry.device_id);
    const vehicle = await findVehicleByDeviceId(supabase, telemetry.device_id);

    if (!vehicle) {
      console.warn('[GPS Processor] No vehicle found for device ID:', telemetry.device_id);
      return new Response(
        JSON.stringify({
          success: false,
          error: `No active vehicle found with GPS device ID: ${telemetry.device_id}`,
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[GPS Processor] Found vehicle:', {
      vehicle_id: vehicle.id,
      tenant_id: vehicle.tenant_id,
      current_odometer: vehicle.current_odometer,
    });

    // Step 6: Update vehicle location (Requirement 19.3)
    await updateVehicleLocation(
      supabase,
      vehicle.id,
      vehicle.tenant_id,
      telemetry.latitude,
      telemetry.longitude,
      telemetry.timestamp
    );
    console.log('[GPS Processor] Vehicle location updated');

    // Step 7: Insert GPS history record (Requirement 19.4)
    await insertGPSHistory(supabase, vehicle.id, vehicle.tenant_id, telemetry);
    console.log('[GPS Processor] GPS history record created');

    // Step 8: Calculate distance and update odometer (Requirement 19.6)
    let distanceCalculated = 0;
    let odometerUpdated = false;
    let validationResult = null;

    // Determine new odometer reading
    let newOdometer = vehicle.current_odometer;

    if (telemetry.odometer !== undefined) {
      // GPS device provided odometer reading - use it directly
      newOdometer = telemetry.odometer;
      console.log('[GPS Processor] Using device-provided odometer:', newOdometer);
    } else if (vehicle.last_location && vehicle.last_gps_update) {
      // Calculate distance from previous location
      const previousLocation = parsePoint(vehicle.last_location);

      if (previousLocation) {
        distanceCalculated = calculateDistance(
          previousLocation.lat,
          previousLocation.lon,
          telemetry.latitude,
          telemetry.longitude
        );

        // Only add distance if movement is reasonable (> 0.01 km = 10 meters)
        if (distanceCalculated > 0.01) {
          newOdometer = vehicle.current_odometer + Math.round(distanceCalculated);
          console.log('[GPS Processor] Calculated distance:', {
            distance_km: distanceCalculated.toFixed(3),
            previous_odometer: vehicle.current_odometer,
            new_odometer: newOdometer,
          });
        } else {
          console.log('[GPS Processor] Distance too small, skipping odometer update');
        }
      }
    }

    // Step 9: Validate and update odometer if changed (Requirement 4.6)
    if (newOdometer !== vehicle.current_odometer) {
      try {
        validationResult = await validateOdometer(
          vehicle.id,
          newOdometer,
          telemetry.timestamp,
          supabaseServiceKey
        );

        odometerUpdated = validationResult.valid && !validationResult.anomaly_flag;
        
        console.log('[GPS Processor] Odometer validation result:', {
          valid: validationResult.valid,
          anomaly_flag: validationResult.anomaly_flag,
          odometer_updated: odometerUpdated,
        });
      } catch (error) {
        console.error('[GPS Processor] Odometer validation error:', error);
        // Continue processing even if validation fails
        validationResult = {
          valid: false,
          anomaly_flag: false,
          reason: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Step 10: Return success response
    const response: GPSProcessorResponse = {
      success: true,
      vehicle_id: vehicle.id,
      location_updated: true,
      odometer_updated: odometerUpdated,
      distance_calculated: distanceCalculated > 0 ? distanceCalculated : undefined,
      validation_result: validationResult || undefined,
    };

    return successResponse(response, 200);
  } catch (err) {
    console.error('[GPS Processor] Unhandled error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
