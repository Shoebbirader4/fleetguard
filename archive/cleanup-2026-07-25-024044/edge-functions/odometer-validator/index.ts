/**
 * Odometer Validator Edge Function
 * 
 * Validates odometer readings and flags anomalies according to business rules.
 * 
 * Requirements:
 * - 4.2: Validate new reading >= previous reading
 * - 4.3: Flag anomalies if delta > 1000km in 24 hours
 * 
 * Input:
 * {
 *   vehicle_id: UUID,
 *   reading: number,
 *   timestamp?: string (ISO 8601),
 *   source: 'manual' | 'excel' | 'bulk' | 'gps' | 'api'
 * }
 * 
 * Output:
 * {
 *   valid: boolean,
 *   anomaly_flag: boolean,
 *   reason?: string,
 *   odometer_reading_id?: UUID
 * }
 */

import {
  authMiddleware,
  forbiddenResponse,
  successResponse,
  corsPreflightResponse,
} from '../_shared/auth-middleware.ts';
import { authorize } from '../../shared/auth/permissions.ts';

// ============================================================================
// Types
// ============================================================================

interface ValidateOdometerRequest {
  vehicle_id: string;
  reading: number;
  timestamp?: string;
  source: 'manual' | 'excel' | 'bulk' | 'gps' | 'api';
}

interface ValidateOdometerResponse {
  valid: boolean;
  anomaly_flag: boolean;
  reason?: string;
  odometer_reading_id?: string;
}

interface PreviousReading {
  reading: number;
  timestamp: string;
}

// ============================================================================
// Constants
// ============================================================================

const ANOMALY_THRESHOLD_KM = 1000; // km
const ANOMALY_THRESHOLD_HOURS = 24; // hours

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Get the most recent odometer reading for a vehicle
 */
async function getPreviousReading(
  supabase: any,
  tenantId: string,
  vehicleId: string
): Promise<PreviousReading | null> {
  const { data, error } = await supabase
    .from('odometer_readings')
    .select('reading, timestamp')
    .eq('tenant_id', tenantId)
    .eq('vehicle_id', vehicleId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No previous reading found
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Validate odometer reading against business rules
 */
function validateReading(
  newReading: number,
  newTimestamp: Date,
  previousReading: PreviousReading | null
): { valid: boolean; anomaly_flag: boolean; reason?: string } {
  // If no previous reading, accept the new reading (first reading for vehicle)
  if (!previousReading) {
    return {
      valid: true,
      anomaly_flag: false,
    };
  }

  const prevReading = previousReading.reading;
  const prevTimestamp = new Date(previousReading.timestamp);

  // Rule 1: New reading must be >= previous reading (Requirement 4.2)
  if (newReading < prevReading) {
    return {
      valid: false,
      anomaly_flag: true,
      reason: `New reading (${newReading} km) is less than previous reading (${prevReading} km). Odometer readings cannot decrease.`,
    };
  }

  // Rule 2: Check for anomalous increase (Requirement 4.3)
  const deltaKm = newReading - prevReading;
  const deltaMs = newTimestamp.getTime() - prevTimestamp.getTime();
  const deltaHours = deltaMs / (1000 * 60 * 60);

  if (deltaHours <= ANOMALY_THRESHOLD_HOURS && deltaKm > ANOMALY_THRESHOLD_KM) {
    return {
      valid: true, // Valid but anomalous
      anomaly_flag: true,
      reason: `Odometer increased by ${deltaKm} km in ${deltaHours.toFixed(1)} hours (> ${ANOMALY_THRESHOLD_KM} km in ${ANOMALY_THRESHOLD_HOURS} hours). Please confirm this reading is correct.`,
    };
  }

  // All validations passed
  return {
    valid: true,
    anomaly_flag: false,
  };
}

/**
 * Get current odometer value from vehicles table
 */
async function getCurrentVehicleOdometer(
  supabase: any,
  tenantId: string,
  vehicleId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('current_odometer')
    .eq('tenant_id', tenantId)
    .eq('id', vehicleId)
    .single();

  if (error) {
    throw error;
  }

  return data?.current_odometer || 0;
}

/**
 * Update vehicle's current_odometer on successful validation
 */
async function updateVehicleOdometer(
  supabase: any,
  tenantId: string,
  vehicleId: string,
  newReading: number
): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .update({ 
      current_odometer: newReading,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('id', vehicleId);

  if (error) {
    throw error;
  }
}

/**
 * Insert odometer reading into database
 */
async function insertOdometerReading(
  supabase: any,
  tenantId: string,
  vehicleId: string,
  reading: number,
  timestamp: string,
  source: string,
  userId: string,
  isAnomalous: boolean,
  anomalyReason?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('odometer_readings')
    .insert({
      tenant_id: tenantId,
      vehicle_id: vehicleId,
      reading: reading,
      timestamp: timestamp,
      source: source,
      submitted_by: userId,
      is_anomalous: isAnomalous,
      anomaly_reason: anomalyReason || null,
      confirmed: !isAnomalous, // Anomalous readings require confirmation
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data.id;
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
    // Step 1: Authenticate
    const { authContext, supabase, error: authError } = await authMiddleware(req);

    if (authError) {
      console.error('[Odometer Validator] Auth error:', authError);
      return new Response(JSON.stringify(authError), {
        status: authError.code === 'MISSING_TOKEN' ? 401 : 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Check permission
    // Most roles can submit odometer readings (driver, mechanic, inspector, managers)
    // We check if user can read vehicles as a baseline permission
    const authResult = authorize(authContext!, 'vehicles:read');
    if (!authResult.authorized) {
      console.warn('[Odometer Validator] Authorization failed:', {
        userId: authContext!.userId,
        role: authContext!.role,
        reason: authResult.reason,
      });
      return forbiddenResponse(authResult.reason);
    }

    // Step 3: Parse and validate request body
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: ValidateOdometerRequest = await req.json();

    // Validate required fields
    if (!body.vehicle_id || body.reading === undefined || !body.source) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          details: 'vehicle_id, reading, and source are required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate reading is a positive number
    if (typeof body.reading !== 'number' || body.reading < 0) {
      return new Response(
        JSON.stringify({
          error: 'Invalid reading',
          details: 'Reading must be a non-negative number',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate source
    const validSources = ['manual', 'excel', 'bulk', 'gps', 'api'];
    if (!validSources.includes(body.source)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid source',
          details: `Source must be one of: ${validSources.join(', ')}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse timestamp (default to now if not provided)
    const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();
    if (isNaN(timestamp.getTime())) {
      return new Response(
        JSON.stringify({
          error: 'Invalid timestamp',
          details: 'Timestamp must be a valid ISO 8601 date string',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Get previous reading for validation
    console.log('[Odometer Validator] Fetching previous reading for vehicle:', body.vehicle_id);
    const previousReading = await getPreviousReading(
      supabase,
      authContext!.tenantId,
      body.vehicle_id
    );

    // Step 5: Validate the new reading
    console.log('[Odometer Validator] Validating reading:', {
      newReading: body.reading,
      previousReading: previousReading?.reading,
      timestamp: timestamp.toISOString(),
    });

    const validationResult = validateReading(
      body.reading,
      timestamp,
      previousReading
    );

    console.log('[Odometer Validator] Validation result:', validationResult);

    // Step 6: Insert odometer reading into database
    const odometerReadingId = await insertOdometerReading(
      supabase,
      authContext!.tenantId,
      body.vehicle_id,
      body.reading,
      timestamp.toISOString(),
      body.source,
      authContext!.userId,
      validationResult.anomaly_flag,
      validationResult.reason
    );

    console.log('[Odometer Validator] Odometer reading created:', odometerReadingId);

    // Step 7: Update vehicle's current_odometer if validation passed
    if (validationResult.valid && !validationResult.anomaly_flag) {
      await updateVehicleOdometer(
        supabase,
        authContext!.tenantId,
        body.vehicle_id,
        body.reading
      );
      console.log('[Odometer Validator] Vehicle odometer updated to:', body.reading);
    } else if (validationResult.valid && validationResult.anomaly_flag) {
      console.log('[Odometer Validator] Anomalous reading - vehicle odometer NOT updated (requires confirmation)');
    } else {
      console.log('[Odometer Validator] Invalid reading - vehicle odometer NOT updated');
    }

    // Step 8: Return validation result
    const response: ValidateOdometerResponse = {
      valid: validationResult.valid,
      anomaly_flag: validationResult.anomaly_flag,
      reason: validationResult.reason,
      odometer_reading_id: odometerReadingId,
    };

    return successResponse(response, 201);
  } catch (err) {
    console.error('[Odometer Validator] Unhandled error:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
