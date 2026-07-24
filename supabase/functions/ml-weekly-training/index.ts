/**
 * ML Weekly Training Edge Function (Cron Job)
 * 
 * Calls the ML service to retrain models using new failure and maintenance data.
 * This function acts as a bridge between Supabase and the external ML service.
 * 
 * Requirements:
 * - 12.6: THE Predictive_Engine SHALL retrain prediction models weekly using new failure and maintenance data
 * 
 * Schedule: Runs weekly (Sunday at 3:00 AM)
 * 
 * Output:
 * {
 *   success: boolean,
 *   timestamp: string,
 *   total_tenants: number,
 *   successful_trainings: number,
 *   failed_trainings: number,
 *   execution_time_seconds: number
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================================================
// Types
// ============================================================================

interface TrainRequest {
  tenant_id: string;
  component_category?: string;
}

interface TrainResponse {
  success: boolean;
  models_trained: string[];
  execution_time_seconds: number;
  metrics: {
    training_samples: number;
    failure_count: number;
    failure_rate: number;
    categories_trained: number;
    average_accuracy: number;
  };
  message: string;
}

interface TenantTrainingResult {
  tenant_id: string;
  tenant_name: string;
  status: 'success' | 'failed' | 'skipped';
  models_trained?: number;
  training_samples?: number;
  average_accuracy?: number;
  error?: string;
}

interface WeeklyTrainingResult {
  success: boolean;
  timestamp: string;
  total_tenants: number;
  successful_trainings: number;
  failed_trainings: number;
  skipped_trainings: number;
  execution_time_seconds: number;
  ml_service_url: string;
  tenant_results: TenantTrainingResult[];
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all active tenants from database
 */
async function getActiveTenants(supabase: any): Promise<Array<{ id: string; name: string }>> {
  try {
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('subscription_status', 'active')
      .order('created_at');

    if (error) {
      throw error;
    }

    console.log(`[ML Weekly Training] Found ${tenants?.length || 0} active tenants`);
    return tenants || [];
  } catch (err) {
    console.error('[ML Weekly Training] Error fetching tenants:', err);
    throw err;
  }
}

/**
 * Train models for a single tenant
 */
async function trainTenantModels(
  mlServiceUrl: string,
  tenantId: string,
  tenantName: string
): Promise<TenantTrainingResult> {
  const result: TenantTrainingResult = {
    tenant_id: tenantId,
    tenant_name: tenantName,
    status: 'failed',
  };

  try {
    console.log(`[ML Weekly Training] Training models for tenant: ${tenantName} (${tenantId})`);

    const endpoint = `${mlServiceUrl}/train`;
    const requestBody: TrainRequest = {
      tenant_id: tenantId,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      // Timeout of 30 minutes for training
      signal: AbortSignal.timeout(30 * 60 * 1000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ML service returned status ${response.status}: ${errorText}`);
    }

    const trainResponse: TrainResponse = await response.json();

    if (trainResponse.success) {
      result.status = 'success';
      result.models_trained = trainResponse.models_trained.length;
      result.training_samples = trainResponse.metrics.training_samples;
      result.average_accuracy = trainResponse.metrics.average_accuracy;

      console.log(`[ML Weekly Training] Successfully trained ${result.models_trained} models for ${tenantName}`);
      console.log(`[ML Weekly Training] Training samples: ${result.training_samples}, Accuracy: ${result.average_accuracy}`);
    } else {
      // Training returned success: false (likely insufficient data)
      result.status = 'skipped';
      result.error = trainResponse.message;
      console.log(`[ML Weekly Training] Training skipped for ${tenantName}: ${trainResponse.message}`);
    }

    return result;

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    result.error = errorMessage;
    console.error(`[ML Weekly Training] Failed to train models for ${tenantName}:`, errorMessage);
    return result;
  }
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  const startTime = Date.now();
  console.log('[ML Weekly Training] Starting weekly model training batch job');

  const result: WeeklyTrainingResult = {
    success: false,
    timestamp: new Date().toISOString(),
    total_tenants: 0,
    successful_trainings: 0,
    failed_trainings: 0,
    skipped_trainings: 0,
    execution_time_seconds: 0,
    ml_service_url: '',
    tenant_results: [],
  };

  try {
    // Get environment variables
    const mlServiceUrl = Deno.env.get('ML_SERVICE_URL');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!mlServiceUrl) {
      throw new Error('ML_SERVICE_URL environment variable is not set');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    result.ml_service_url = mlServiceUrl;
    console.log(`[ML Weekly Training] Using ML service at: ${mlServiceUrl}`);

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active tenants
    const tenants = await getActiveTenants(supabase);
    result.total_tenants = tenants.length;

    if (tenants.length === 0) {
      console.log('[ML Weekly Training] No active tenants found, exiting');
      result.success = true;
      result.execution_time_seconds = (Date.now() - startTime) / 1000;

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Train models for each tenant
    for (const tenant of tenants) {
      const tenantResult = await trainTenantModels(
        mlServiceUrl,
        tenant.id,
        tenant.name
      );

      result.tenant_results.push(tenantResult);

      if (tenantResult.status === 'success') {
        result.successful_trainings++;
      } else if (tenantResult.status === 'failed') {
        result.failed_trainings++;
      } else if (tenantResult.status === 'skipped') {
        result.skipped_trainings++;
      }
    }

    // Calculate total execution time
    const executionTime = (Date.now() - startTime) / 1000;
    result.execution_time_seconds = executionTime;
    result.success = true;

    console.log('[ML Weekly Training] Completed training batch job:', {
      total_tenants: result.total_tenants,
      successful: result.successful_trainings,
      failed: result.failed_trainings,
      skipped: result.skipped_trainings,
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
    
    console.error('[ML Weekly Training] Fatal error:', errorMessage);
    console.error('[ML Weekly Training] Error details:', err);

    return new Response(
      JSON.stringify(result),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
});
