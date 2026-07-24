/**
 * ML Daily Predictions Edge Function (Cron Job)
 * 
 * Calls the ML service to run batch predictions for all tenants.
 * This function acts as a bridge between Supabase and the external ML service.
 * 
 * Requirements:
 * - 12.7: FOR ALL vehicles, THE Predictive_Engine SHALL update predictions daily at 2:00 AM system time
 * 
 * Schedule: Runs daily at 2:00 AM
 * 
 * Output:
 * {
 *   success: boolean,
 *   timestamp: string,
 *   total_tenants: number,
 *   successful: number,
 *   failed: number,
 *   execution_time_seconds: number
 * }
 */

// ============================================================================
// Types
// ============================================================================

interface MLServiceResponse {
  total_tenants: number;
  successful: number;
  failed: number;
  tenant_results: Array<{
    tenant_id: string;
    tenant_name: string;
    status: string;
    predictions_count?: number;
    alerts_generated?: number;
    error?: string;
  }>;
  execution_time_seconds: number;
}

interface DailyPredictionsResult {
  success: boolean;
  timestamp: string;
  total_tenants: number;
  successful: number;
  failed: number;
  execution_time_seconds: number;
  ml_service_url: string;
  details?: MLServiceResponse;
  error?: string;
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  const startTime = Date.now();
  console.log('[ML Daily Predictions] Starting daily prediction batch job');

  const result: DailyPredictionsResult = {
    success: false,
    timestamp: new Date().toISOString(),
    total_tenants: 0,
    successful: 0,
    failed: 0,
    execution_time_seconds: 0,
    ml_service_url: '',
  };

  try {
    // Get ML service URL from environment
    const mlServiceUrl = Deno.env.get('ML_SERVICE_URL');
    
    if (!mlServiceUrl) {
      throw new Error('ML_SERVICE_URL environment variable is not set');
    }

    result.ml_service_url = mlServiceUrl;
    console.log(`[ML Daily Predictions] Using ML service at: ${mlServiceUrl}`);

    // Call ML service /predict-all-tenants endpoint
    const endpoint = `${mlServiceUrl}/predict-all-tenants`;
    console.log(`[ML Daily Predictions] Calling endpoint: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout of 2 hours (predictions for large fleets can take time)
      signal: AbortSignal.timeout(2 * 60 * 60 * 1000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ML service returned status ${response.status}: ${errorText}`);
    }

    const mlResponse: MLServiceResponse = await response.json();
    console.log('[ML Daily Predictions] ML service response:', mlResponse);

    // Update result with ML service data
    result.success = true;
    result.total_tenants = mlResponse.total_tenants;
    result.successful = mlResponse.successful;
    result.failed = mlResponse.failed;
    result.details = mlResponse;

    // Calculate total execution time
    const executionTime = (Date.now() - startTime) / 1000;
    result.execution_time_seconds = executionTime;

    console.log('[ML Daily Predictions] Completed successfully:', {
      total_tenants: result.total_tenants,
      successful: result.successful,
      failed: result.failed,
      execution_time_seconds: executionTime,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const executionTime = (Date.now() - startTime) / 1000;
    result.execution_time_seconds = executionTime;

    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    result.error = errorMessage;
    
    console.error('[ML Daily Predictions] Fatal error:', errorMessage);
    console.error('[ML Daily Predictions] Error details:', err);

    return new Response(
      JSON.stringify(result),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
});
